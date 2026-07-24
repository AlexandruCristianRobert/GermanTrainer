<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { shuffle } from '../../data/pool'
import { buildHintSegments, checkSentence, type HintSegment, type Direction } from '../../composables/useSentenceQuiz'
import {
  buildDacHintInputs, gradeDacAnswer, buildDacDrillItem, generateDacSentenceBatch,
  type GeneratedDacSentence, type DacSentenceSpec
} from '../../composables/useDaSentenceQuiz'
import { planRampBatches, generateProgressively } from '../../composables/useProgressiveGenerator'
import { saveQuizRun, type DacErrorTag } from '../../composables/useQuizHistory'
import { useSettings } from '../../composables/useSettings'
import { resolveAiClient } from '../../composables/localClaude'
import { useToast } from '../../composables/useToast'
import { useSound } from '../../composables/useSound'
import RetryModal from '../../components/RetryModal.vue'
import QuizProgress from '../../components/QuizProgress.vue'

const STASH_KEY = 'gt:lastDacSentenceQuiz'
const router = useRouter()
const { settings, load: loadSettings } = useSettings()
const toast = useToast()
const sound = useSound()
let chimed = false

interface Stash {
  specs: DacSentenceSpec[]
  direction?: Direction
  level?: string
  wordHints?: boolean
  meta?: { levels: string[]; roles: string[]; preps: string[]; groups: string[]; nounsPer: 1 | 2 | 'mix' }
}

/** Per-card grade, kept local — useDaSentenceQuiz has no exported Verdict shape
 *  (unlike useVerbSentenceQuiz/useSentenceQuiz), so this mirrors those inline. */
interface DacSentenceVerdict {
  index: number
  correct: boolean
  correction: string   // the reference translation, shown when wrong
  tip?: string
  tags?: DacErrorTag[]
}

const error = ref<string | null>(null)
const expected = ref(0)                                // requested N
const deck = ref<GeneratedDacSentence[]>([])            // arrival order
const generationDone = ref(false)
const level = ref('B1–C1')
const direction = ref<Direction>('en-de')
const wordHints = ref(true)
const metaInfo = ref<Stash['meta']>(undefined)
const hintsActive = computed(() => direction.value === 'en-de' && wordHints.value)

const answers = ref<string[]>([])
const verdicts = ref<Map<number, DacSentenceVerdict>>(new Map())
const startedAt = ref(0)
const historySaved = ref(false)

const index = ref(0)
const userInput = ref('')
const phase = ref<'input' | 'checking' | 'graded'>('input')
const finished = ref(false)
const awaitingNext = ref(false)                         // outran generation
const inputRef = ref<HTMLTextAreaElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

const ready = computed(() => deck.value.length > 0 || generationDone.value || error.value !== null)
const total = computed(() => expected.value)
const current = computed<GeneratedDacSentence | null>(() => deck.value[index.value] ?? null)
const currentVerdict = computed(() => verdicts.value.get(index.value) ?? null)
const correctCount = computed(() => { let n = 0; for (const v of verdicts.value.values()) if (v.correct) n++; return n })
const wrongAnswered = computed(() => { let n = 0; for (const v of verdicts.value.values()) if (!v.correct) n++; return n })
const generatedTotal = computed(() => deck.value.length)
const wrongCount = computed(() => generatedTotal.value - correctCount.value)
const allCorrect = computed(() => finished.value && wrongCount.value === 0)
const isLastGenerated = computed(() => index.value + 1 >= deck.value.length)

// What is SHOWN (source) and what the learner must PRODUCE / the reference (target).
function sourceText(s: GeneratedDacSentence): string { return direction.value === 'en-de' ? s.english : s.german }
function targetText(s: GeneratedDacSentence): string { return direction.value === 'en-de' ? s.german : s.english }

// Tap-to-toggle reveal, keyed by segment index.
const revealed = ref<Set<number>>(new Set())
function toggleReveal(i: number) {
  const next = new Set(revealed.value); next.has(i) ? next.delete(i) : next.add(i); revealed.value = next
}

// Word hints only ever apply to the EN→DE English prompt (DE→EN shows the
// German prompt unaided per direction — hints are off, not just hidden).
const currentSegments = computed<HintSegment[]>(() => {
  const s = current.value
  if (!s) return []
  if (!hintsActive.value) return [{ text: sourceText(s) }]
  return buildHintSegments(s.english, buildDacHintInputs(s))
})

function hintClass(kind: string): string { return 'hint-' + kind }

onMounted(async () => {
  await loadSettings()
  let stash: Stash | null = null
  try {
    const raw = sessionStorage.getItem(STASH_KEY)
    if (!raw) { error.value = 'No quiz in this session. Go back to setup.'; return }
    stash = JSON.parse(raw) as Stash
  } catch (e) { error.value = e instanceof Error ? e.message : 'Failed to load.'; return }
  if (!stash || !Array.isArray(stash.specs) || stash.specs.length === 0) { error.value = 'No sentence specs in this session.'; return }

  expected.value = stash.specs.length
  direction.value = stash.direction === 'de-en' ? 'de-en' : 'en-de'
  level.value = stash.level ?? 'B1–C1'
  wordHints.value = stash.wordHints !== false
  metaInfo.value = stash.meta
  startedAt.value = Date.now()
  answers.value = []

  const client = resolveAiClient(settings.value)
  // Ramp 1 → 2 → 5, then batches of 10 (ADR-0008): fast first paints, efficient tail.
  const batches = planRampBatches(stash.specs, [1, 2, 5], 10)
  generateProgressively<DacSentenceSpec, GeneratedDacSentence>({
    batches,
    runBatch: async (batch) => {
      const res = await generateDacSentenceBatch(client, { model: settings.value.model, specs: batch, level: level.value, maxRetries: 1 })
      return res.sentences
    },
    onResults: (sentences) => {
      for (const s of sentences) { deck.value.push(s); answers.value.push('') }
      if (!chimed && deck.value.length > 0) { chimed = true; sound.playReady() }
      if (awaitingNext.value) tryAdvance()
      nextTick(() => { if (deck.value.length === sentences.length) inputRef.value?.focus() })
    },
    concurrency: 4
  }).finally(() => {
    generationDone.value = true
    if (deck.value.length === 0) error.value = 'The model returned no usable sentences. Go back and try again.'
    if (awaitingNext.value) tryAdvance()
  })
})

async function submit() {
  if (!current.value || phase.value !== 'input') return
  if (userInput.value.trim().length === 0) return
  const i = index.value
  const s = current.value
  const target = targetText(s)
  phase.value = 'checking'
  let verdict: DacSentenceVerdict
  try {
    const grade = await gradeDacAnswer(resolveAiClient(settings.value), {
      model: settings.value.model,
      direction: direction.value,
      english: s.english,
      german: s.german,
      collocWord: s.colloc.word,
      preposition: s.colloc.preposition,
      case: s.colloc.case,
      userAnswer: userInput.value
    })
    verdict = { index: i, correct: grade.correct, correction: target, tip: grade.tip, tags: grade.tags }
  } catch {
    verdict = { index: i, correct: checkSentence(userInput.value, target), correction: target }
    toast.info('Graded offline', { description: 'The AI grader was unreachable, so this answer was checked by exact match.' })
  }
  answers.value[i] = userInput.value
  verdicts.value.set(i, verdict)
  verdicts.value = new Map(verdicts.value) // trigger reactivity
  phase.value = 'graded'
  nextTick(() => nextBtnRef.value?.focus())
}

function finishQuiz() {
  finished.value = true
  awaitingNext.value = false
  if (historySaved.value) return
  historySaved.value = true
  const finishedAt = Date.now()
  // Only EN→DE runs record per-item drill data for weak-point tracking
  // (useDaSentenceQuiz.buildDacDrillItem / DacDrillItem is EN→DE only —
  // DE→EN is meaning-only grading with no error-tag taxonomy to key on).
  const items = direction.value === 'en-de'
    ? deck.value.map((s, i) => buildDacDrillItem(s, verdicts.value.get(i)?.correct ?? false, verdicts.value.get(i)?.tags))
    : undefined
  saveQuizRun({
    type: 'dac-sentence',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: generatedTotal.value,
    correct: correctCount.value,
    meta: {
      dacSentenceLevels: metaInfo.value?.levels,
      dacSentenceRoles: metaInfo.value?.roles,
      dacSentencePreps: metaInfo.value?.preps,
      dacSentenceGroups: metaInfo.value?.groups,
      dacSentenceNounsPer: metaInfo.value?.nounsPer,
      dacSentenceDirection: direction.value,
      dacSentenceHints: hintsActive.value,
      ...(items ? { dacSentenceItems: items } : {})
    }
  })
}

/** Move to the next card, or wait for generation, or finish. */
function tryAdvance() {
  if (index.value + 1 < deck.value.length) {
    index.value++
    userInput.value = ''
    phase.value = 'input'
    awaitingNext.value = false
    revealed.value = new Set()
    nextTick(() => inputRef.value?.focus())
  } else if (generationDone.value) {
    finishQuiz()
  } else {
    awaitingNext.value = true // wait; onResults/finally will re-call tryAdvance
  }
}

function next() {
  if (phase.value !== 'graded') return
  tryAdvance()
}

function onEnter(e: KeyboardEvent) {
  if (e.shiftKey) return // allow a literal newline in the textarea
  e.preventDefault()
  if (phase.value === 'input') submit()
  else if (phase.value === 'graded') next()
}

// AI-family precedent (VerbSentenceRunner/SentenceQuizRunner): retrying the
// wrong items resets historySaved so finishQuiz() records a SECOND 'dac-sentence'
// history entry for this retry pass — deliberately different from the plain
// da-compound drills (T1-T13), which don't re-record retries. This keeps
// weak-point tracking able to see whether the retry itself was answered right.
function retryWrong() {
  const wrong = deck.value.filter((_, i) => !verdicts.value.get(i)?.correct)
  if (wrong.length === 0) return
  deck.value = shuffle(wrong)
  answers.value = deck.value.map(() => '')
  verdicts.value = new Map()
  expected.value = deck.value.length
  generationDone.value = true
  index.value = 0; userInput.value = ''; phase.value = 'input'; finished.value = false
  revealed.value = new Set()
  startedAt.value = Date.now(); historySaved.value = false
  nextTick(() => inputRef.value?.focus())
}

function newQuiz() { router.push({ name: 'dacompounds-sentence', query: { direction: direction.value } }) }
function endQuiz() { router.push({ name: 'dacompounds' }) }

// If we were waiting and generation delivered more (or finished), advance.
watch([deck, generationDone], () => { if (awaitingNext.value) tryAdvance() }, { deep: true })
</script>

<template>
  <div v-if="!ready" class="page loading-state"><div class="micro-mark">Generating the first sentence…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="endQuiz">← Back</button>
  </div>

  <!-- Result -->
  <div v-else-if="finished" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Modul · Pronominaladverbien · Satzübersetzung · Auswertung</div>
        <h1 class="section-title">{{ correctCount }} / {{ generatedTotal }}<em>.</em></h1>
        <p v-if="allCorrect" class="section-subtitle">Alles richtig! 🎉</p>
        <p v-else class="section-subtitle">{{ wrongCount }} to fix. Reference translations and notes below.</p>
        <p v-if="generatedTotal < expected" class="section-subtitle">Generated {{ generatedTotal }} of {{ expected }} — some sentences failed to generate.</p>
      </div>
    </header>

    <div class="result-rows">
      <div v-for="(s, i) in deck" :key="i" class="result-row" :class="{ good: verdicts.get(i)?.correct, bad: !verdicts.get(i)?.correct }">
        <div class="rr-head">
          <span class="rr-mark">{{ verdicts.get(i)?.correct ? '✓' : '✗' }}</span>
          <span class="rr-en">{{ sourceText(s) }}</span>
          <span class="rr-tags">
            <span v-for="t in verdicts.get(i)?.tags" :key="t" class="tag tag-error">{{ t }}</span>
          </span>
        </div>
        <div class="rr-you" :class="{ 'rr-you-empty': !answers[i]?.trim() }"><span class="rr-label">You</span> {{ answers[i]?.trim() || '— (blank)' }}</div>
        <div v-if="!verdicts.get(i)?.correct" class="rr-ref"><span class="rr-label">Answer</span> {{ verdicts.get(i)?.correction || targetText(s) }}</div>
        <div v-if="!verdicts.get(i)?.correct && verdicts.get(i)?.tip" class="rr-tip"><span class="rr-label">Tip</span> {{ verdicts.get(i)?.tip }}</div>
      </div>
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="endQuiz">← Da-Compounds</button>
      <div class="result-cta">
        <button v-if="wrongCount > 0" class="btn btn-quiet" type="button" @click="retryWrong">Retry {{ wrongCount }} wrong</button>
        <button class="btn btn-accent" type="button" @click="newQuiz">New quiz <span aria-hidden="true">→</span></button>
      </div>
    </div>
    <RetryModal :wrong-count="wrongCount" item-label="sentences" @retry="retryWrong" />
  </div>

  <!-- One sentence per step -->
  <div v-else class="page">
    <div class="quiz-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ index + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <QuizProgress class="sentence-progress" :correct="correctCount" :wrong="wrongAnswered" :total="total" :current-index="index" />

      <div v-if="awaitingNext" class="prompt-card"><div class="micro-mark">Preparing next sentence…</div></div>

      <template v-else-if="current">
        <div class="prompt-card">
          <div v-if="!hintsActive" class="en-sentence">{{ sourceText(current) }}</div>
          <div v-else class="en-sentence">
            <template v-for="(seg, i) in currentSegments" :key="i"><span
              v-if="seg.hint"
              class="hint"
              :class="[hintClass(seg.hint.kind), { revealed: revealed.has(i) }]"
              tabindex="0" role="button"
              :aria-label="seg.hint.kind + ' hint: ' + seg.hint.reveal"
              @click="toggleReveal(i)"
              @keydown.enter.prevent="toggleReveal(i)"
              @keydown.space.prevent="toggleReveal(i)"
            >{{ seg.text }}<span class="hint-pop">{{ seg.hint.reveal }}</span></span><template v-else>{{ seg.text }}</template></template>
          </div>
          <div class="en-hint">{{ direction === 'en-de' ? 'Translate into German.' : 'Translate into English.' }}</div>
        </div>

        <form class="prep-input-wrap" @submit.prevent="submit">
          <textarea ref="inputRef" class="input prep-input" rows="2" :placeholder="direction === 'en-de' ? 'Deutsch…' : 'English…'" v-model="userInput"
            :readonly="phase !== 'input'" autocomplete="off" spellcheck="false" @keydown.enter="onEnter"
            :style="phase === 'graded' ? { color: currentVerdict?.correct ? 'var(--success)' : 'var(--danger)', borderBottomColor: currentVerdict?.correct ? 'var(--success)' : 'var(--danger)' } : undefined"></textarea>
          <button v-if="phase === 'input'" type="submit" class="btn btn-accent" :disabled="userInput.trim().length === 0">Submit</button>
          <button v-else-if="phase === 'checking'" type="button" class="btn btn-accent" disabled>Checking…</button>
          <button v-else ref="nextBtnRef" type="button" class="btn btn-accent" @click="next">{{ (isLastGenerated && generationDone) ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
        </form>

        <div v-if="phase === 'graded' && currentVerdict" class="prep-feedback">
          <span class="prep-feedback-mark" :class="currentVerdict.correct ? 'prep-feedback-ok' : 'prep-feedback-bad'">{{ currentVerdict.correct ? '✓ Richtig.' : '✗ Nicht ganz.' }}</span>
          <span class="prep-feedback-full">{{ currentVerdict.correction || targetText(current) }}</span>
          <span v-if="currentVerdict.tip" class="prep-feedback-tip">💡 {{ currentVerdict.tip }}</span>
          <span v-if="currentVerdict.tags?.length" class="prep-feedback-tags">
            <span v-for="t in currentVerdict.tags" :key="t" class="tag tag-error">{{ t }}</span>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.quiz-card { max-width: 720px; margin: 0 auto; }
.quiz-meta { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
.quiz-counter { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mute); }
.sentence-progress { margin-bottom: 36px; }
.prompt-card { text-align: center; }
.en-sentence { font-family: var(--font-display); font-weight: 500; font-size: 30px; line-height: 1.3; letter-spacing: -0.005em; color: var(--ink); }
.en-hint { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); margin-top: 14px; }
.hint { position: relative; cursor: help; text-decoration: underline dotted; text-underline-offset: 4px; border-radius: 2px; padding: 0 1px; transition: background-color 120ms ease; outline: none; }
.hint-verb { text-decoration-color: var(--accent); }
.hint-verb:hover, .hint-verb:focus-visible, .hint-verb.revealed { background-color: var(--accent-tint); }
.hint-noun { text-decoration-color: var(--cobalt); }
.hint-noun:hover, .hint-noun:focus-visible, .hint-noun.revealed { background-color: var(--cobalt-tint); }
.hint-pop { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(-6px); max-width: min(80vw, 260px); white-space: normal; text-align: center; font-family: var(--font-mono); font-size: 13px; line-height: 1.2; padding: 4px 8px; border-radius: 4px; background: var(--paper-card, #fff); color: var(--ink); border: 1px solid var(--rule); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18); pointer-events: none; opacity: 0; visibility: hidden; transition: opacity 120ms ease; z-index: 2; }
.hint:hover .hint-pop, .hint:focus-visible .hint-pop, .hint.revealed .hint-pop { opacity: 1; visibility: visible; }
.prep-input-wrap { display: flex; gap: 12px; align-items: flex-end; margin-top: 36px; }
.prep-input { flex: 1; text-align: left; font-size: 19px; font-family: inherit; resize: vertical; border: 0; border-bottom: 2px solid var(--rule); padding: 8px 0; background: transparent; }
.prep-input:focus { border-bottom-color: var(--accent); outline: none; }
.prep-feedback { margin-top: 18px; text-align: center; display: flex; flex-direction: column; gap: 8px; }
.prep-feedback-mark { font-family: var(--font-display); font-style: italic; font-size: 17px; }
.prep-feedback-ok { color: var(--success); }
.prep-feedback-bad { color: var(--danger); }
.prep-feedback-full { font-family: var(--font-display); font-size: 18px; color: var(--ink); }
.prep-feedback-tip { font-size: 14px; color: var(--ink-soft); }
.prep-feedback-tags { margin-top: 4px; display: inline-flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.tag.tag-error { background: var(--danger-tint); color: var(--danger); }
.result-page { max-width: 880px; }
.result-rows { display: flex; flex-direction: column; gap: 12px; margin: 24px 0; }
.result-row { border: 1px solid var(--rule); border-left: 3px solid var(--rule); border-radius: 3px; padding: 14px 16px; }
.result-row.good { border-left-color: var(--sage, #6b8e6b); }
.result-row.bad { border-left-color: var(--clay, #b5654a); }
.rr-head { display: flex; align-items: baseline; gap: 10px; }
.rr-mark { font-family: var(--font-mono); font-weight: 600; }
.result-row.good .rr-mark { color: var(--sage, #6b8e6b); }
.result-row.bad .rr-mark { color: var(--clay, #b5654a); }
.rr-en { flex: 1; font-family: var(--font-body); color: var(--ink); }
.rr-tags { margin-left: auto; display: inline-flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.rr-you, .rr-ref, .rr-tip { font-family: var(--font-mono); font-size: 14px; margin-top: 6px; color: var(--ink-soft); }
.rr-you-empty { opacity: 0.6; }
.rr-ref { color: var(--ink); }
.rr-label { display: inline-block; min-width: 56px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mute); }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; gap: 16px; }
.result-cta { display: flex; gap: 12px; }
@media (max-width: 720px) { .en-sentence { font-size: clamp(20px, 6vw, 26px); } .setup-actions { flex-direction: column-reverse; align-items: stretch; } .result-cta { flex-direction: column; } .setup-actions .btn { justify-content: center; } }
</style>
