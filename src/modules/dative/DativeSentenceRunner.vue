<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { shuffle } from '../../data/pool'
import { checkSentence } from '../../composables/useSentenceQuiz'
import {
  generateDatSentenceBatch, gradeDativeSentence, buildDatDrillItem,
  type GeneratedDatSentence, type DativeSentenceSpec, type DatErrorTag
} from '../../composables/useDativeSentenceQuiz'
import type { DativeFamily } from '../../composables/useDativeDrill'
import { planRampBatches, generateProgressively } from '../../composables/useProgressiveGenerator'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { bumpDativeLedger } from '../../composables/useDativeLedger'
import { useSettings } from '../../composables/useSettings'
import { resolveAiClient } from '../../composables/localClaude'
import { useToast } from '../../composables/useToast'
import { useSound } from '../../composables/useSound'
import RetryModal from '../../components/RetryModal.vue'
import QuizProgress from '../../components/QuizProgress.vue'

const STASH_KEY = 'datSentenceStash'
const router = useRouter()
const { settings, load: loadSettings } = useSettings()
const toast = useToast()
const sound = useSound()
let chimed = false

interface Stash {
  specs: DativeSentenceSpec[]
  families?: DativeFamily[]
  focus?: 'all' | 'weak'
}

/** Per-card grade, kept local (mirrors DwSentenceVerdict in the DW runner). */
interface DatSentenceVerdict {
  index: number
  correct: boolean
  correction: string   // the reference German translation, shown when wrong
  tip?: string
  tags?: DatErrorTag[]
}

const error = ref<string | null>(null)
const expected = ref(0)                                  // requested N
const deck = ref<GeneratedDatSentence[]>([])             // arrival order
const generationDone = ref(false)
const metaInfo = ref<Stash>({ specs: [] })

const answers = ref<string[]>([])
const verdicts = ref<Map<number, DatSentenceVerdict>>(new Map())
const startedAt = ref(0)
const historySaved = ref(false)
// The ledger bumps on the FIRST finish only. The AI family re-records retry
// passes (historySaved resets in retryWrong) but a retry is still practice
// for the ledger — this flag never resets.
const ledgerBumped = ref(false)

const index = ref(0)
const userInput = ref('')
const phase = ref<'input' | 'checking' | 'graded'>('input')
const finished = ref(false)
const awaitingNext = ref(false)                          // outran generation
const inputRef = ref<HTMLTextAreaElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

const ready = computed(() => deck.value.length > 0 || generationDone.value || error.value !== null)
const total = computed(() => expected.value)
const current = computed<GeneratedDatSentence | null>(() => deck.value[index.value] ?? null)
const currentVerdict = computed(() => verdicts.value.get(index.value) ?? null)
const correctCount = computed(() => { let n = 0; for (const v of verdicts.value.values()) if (v.correct) n++; return n })
const wrongAnswered = computed(() => { let n = 0; for (const v of verdicts.value.values()) if (!v.correct) n++; return n })
const generatedTotal = computed(() => deck.value.length)
const wrongCount = computed(() => generatedTotal.value - correctCount.value)
const allCorrect = computed(() => finished.value && wrongCount.value === 0)
const isLastGenerated = computed(() => index.value + 1 >= deck.value.length)

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
  metaInfo.value = stash
  startedAt.value = Date.now()
  answers.value = []

  const client = resolveAiClient(settings.value)
  // Ramp 1 → 2 → 5, then batches of 10 (ADR-0008): fast first paint, efficient tail.
  const batches = planRampBatches(stash.specs, [1, 2, 5], 10)
  generateProgressively<DativeSentenceSpec, GeneratedDatSentence>({
    batches,
    runBatch: async (batch) => {
      const res = await generateDatSentenceBatch(client, { model: settings.value.model, specs: batch, maxRetries: 1 })
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
  phase.value = 'checking'
  let verdict: DatSentenceVerdict
  try {
    const grade = await gradeDativeSentence(resolveAiClient(settings.value), {
      model: settings.value.model,
      spec: s,
      answer: userInput.value
    })
    verdict = { index: i, correct: grade.correct, correction: s.german, tip: grade.tip, tags: grade.tags }
  } catch {
    verdict = { index: i, correct: checkSentence(userInput.value, s.german), correction: s.german }
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
  // Item ledger (ADR-0017): T11's drilled unit IS a ledger item — one
  // encounter per generated card, keyed by the dative verb. First pass only;
  // retry passes record Runs but never re-bump.
  if (!ledgerBumped.value) {
    ledgerBumped.value = true
    for (let i = 0; i < deck.value.length; i++) {
      bumpDativeLedger(deck.value[i].verb, verdicts.value.get(i)?.correct ?? false, finishedAt)
    }
  }
  const items = deck.value.map((s, i) => buildDatDrillItem(s, verdicts.value.get(i)?.correct ?? false, verdicts.value.get(i)?.tags))
  saveQuizRun({
    type: 'dat-sentence',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: generatedTotal.value,
    correct: correctCount.value,
    meta: {
      datSentenceFamilies: metaInfo.value.families,
      datSentenceFocus: metaInfo.value.focus,
      datSentenceItems: items
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

// AI-family precedent (dw/dac/verb sentence runners): retrying the wrong items
// resets historySaved so finishQuiz() records a SECOND 'dat-sentence' Run for
// the retry pass — deliberately different from the deterministic Dativ drills
// (T1–T10, T12, T13), which never re-record. ledgerBumped stays true: the
// ledger counts first encounters only.
function retryWrong() {
  const wrong = deck.value.filter((_, i) => !verdicts.value.get(i)?.correct)
  if (wrong.length === 0) return
  deck.value = shuffle(wrong)
  answers.value = deck.value.map(() => '')
  verdicts.value = new Map()
  expected.value = deck.value.length
  generationDone.value = true
  index.value = 0; userInput.value = ''; phase.value = 'input'; finished.value = false
  startedAt.value = Date.now(); historySaved.value = false
  nextTick(() => inputRef.value?.focus())
}

function newQuiz() { router.push({ name: 'dative-sentence' }) }
function endQuiz() { router.push({ name: 'dative' }) }

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
        <div class="breadcrumb">Kapitel XIII · Dativ · Satzübersetzung · Auswertung</div>
        <h1 class="section-title">{{ correctCount }} / {{ generatedTotal }}<em>.</em></h1>
        <p v-if="allCorrect" class="section-subtitle">Alles richtig!</p>
        <p v-else class="section-subtitle">{{ wrongCount }} to fix. Reference translations and notes below.</p>
        <p v-if="generatedTotal < expected" class="section-subtitle">Generated {{ generatedTotal }} of {{ expected }} — some sentences failed to generate.</p>
      </div>
    </header>

    <div class="result-rows">
      <div v-for="(s, i) in deck" :key="i" class="ai-result-row" :class="{ good: verdicts.get(i)?.correct, bad: !verdicts.get(i)?.correct }">
        <div class="rr-head">
          <span class="rr-mark">{{ verdicts.get(i)?.correct ? '✓' : '✗' }}</span>
          <span class="rr-en">{{ s.english }}</span>
          <span class="rr-tags">
            <span v-for="t in verdicts.get(i)?.tags" :key="t" class="tag tag-error">{{ t }}</span>
          </span>
        </div>
        <div class="rr-you" :class="{ 'rr-you-empty': !answers[i]?.trim() }"><span class="rr-label">You</span> {{ answers[i]?.trim() || '— (blank)' }}</div>
        <div v-if="!verdicts.get(i)?.correct" class="rr-ref"><span class="rr-label">Answer</span> {{ verdicts.get(i)?.correction || s.german }}</div>
        <div v-if="!verdicts.get(i)?.correct && verdicts.get(i)?.tip" class="rr-tip"><span class="rr-label">Tip</span> {{ verdicts.get(i)?.tip }}</div>
      </div>
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="endQuiz">← Dativ</button>
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
          <div class="en-sentence">{{ current.english }}</div>
          <div class="en-hint">Translate into German — the right dative verb is part of the answer.</div>
        </div>

        <form class="prep-input-wrap" @submit.prevent="submit">
          <textarea ref="inputRef" class="input prep-input" rows="2" placeholder="Deutsch…" v-model="userInput"
            :readonly="phase !== 'input'" autocomplete="off" spellcheck="false" @keydown.enter="onEnter"
            :class="{ ok: phase === 'graded' && currentVerdict?.correct, err: phase === 'graded' && currentVerdict && !currentVerdict.correct }"></textarea>
          <button v-if="phase === 'input'" type="submit" class="btn btn-accent" :disabled="userInput.trim().length === 0">Submit</button>
          <button v-else-if="phase === 'checking'" type="button" class="btn btn-accent" disabled>Checking…</button>
          <button v-else ref="nextBtnRef" type="button" class="btn btn-accent" @click="next">{{ (isLastGenerated && generationDone) ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
        </form>

        <div v-if="phase === 'graded' && currentVerdict" class="prep-feedback">
          <span class="prep-feedback-mark" :class="currentVerdict.correct ? 'prep-feedback-ok' : 'prep-feedback-bad'">{{ currentVerdict.correct ? '✓ Richtig.' : '✗ Nicht ganz.' }}</span>
          <span class="prep-feedback-full">{{ currentVerdict.correction || current.german }}</span>
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
.quiz-meta { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
.quiz-counter { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mute); }
.prompt-card { text-align: center; }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; gap: 16px; }
@media (max-width: 720px) { .setup-actions { flex-direction: column-reverse; align-items: stretch; } .setup-actions .btn { justify-content: center; } }
</style>
