<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { KiDifficulty, KiJudgeResult, KiQuestion, KiTopic } from '../../data/konjunktiv'
import { generateKiQuestions, judgeKi } from '../../composables/useKonjunktivQuiz'
import { planRampBatches, generateProgressively } from '../../composables/useProgressiveGenerator'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'
import { useSound } from '../../composables/useSound'

interface Stash {
  count: number
  difficulty: KiDifficulty
  topics: KiTopic[]
  model: string
}

interface QuestionState {
  entry: KiQuestion
  userInput: string
  submitted: boolean
  judging: boolean
  judgement: KiJudgeResult | null
}

const router = useRouter()
const toast = useToast()
const sound = useSound()
const { settings, load: loadSettings } = useSettings()
let chimed = false

const error = ref<string | null>(null)
const stash = ref<Stash | null>(null)
const expected = ref(0)                         // requested N
const questions = ref<QuestionState[]>([])      // arrival order (the streamed deck)
const generationDone = ref(false)
const currentIndex = ref(0)
const startedAt = ref(0)
const awaitingNext = ref(false)                 // outran generation

const ready = computed(() => questions.value.length > 0 || generationDone.value || error.value !== null)
const current = computed(() => questions.value[currentIndex.value] ?? null)
// The counter denominator: show the requested N while streaming, but never
// less than what's already in the deck.
const total = computed(() => Math.max(expected.value, questions.value.length))
const finished = ref(false)

onMounted(async () => {
  await loadSettings()
  let s: Stash
  try {
    const raw = sessionStorage.getItem('gt:lastKonjunktiv')
    if (!raw) {
      error.value = 'No session data found. Go back to Setup and run Generate.'
      return
    }
    s = JSON.parse(raw) as Stash
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
    return
  }
  if (typeof s.count !== 'number' || s.count <= 0) {
    error.value = 'Session contained no valid quote count.'
    return
  }
  stash.value = s
  expected.value = s.count
  startedAt.value = Date.now()

  const client = resolveAiClient(settings.value)
  const model = s.model || settings.value.model
  // One placeholder unit per target item; ramp 5, then batches of 10 (ADR-0008).
  const units = Array.from({ length: s.count }, (_, i) => i)
  const batches = planRampBatches(units, [5], 10)
  // Cross-batch dedup on the canonical rewrite (source + reporting clause +
  // indirect-speech answer) — the field that uniquely identifies a quote pair.
  const seen = new Set<string>()

  generateProgressively<number, KiQuestion>({
    batches,
    runBatch: async (chunk) => {
      const r = await generateKiQuestions(client, {
        model,
        count: chunk.length,
        difficulty: s.difficulty,
        topics: s.topics.length > 0 ? s.topics : undefined
      })
      return r.entries
    },
    onResults: (entries) => {
      for (const e of entries) {
        const key = e.referenceAnswer.trim()
        if (seen.has(key)) continue
        seen.add(key)
        questions.value.push({ entry: e, userInput: '', submitted: false, judging: false, judgement: null })
      }
      if (!chimed && questions.value.length > 0) { chimed = true; sound.playReady() }
      if (awaitingNext.value) tryAdvance()
      nextTick(() => { if (questions.value.length === entries.length) focusInput() })
    },
    concurrency: 1 // SEQUENTIAL — a count-based generator would otherwise duplicate across parallel calls
  }).finally(() => {
    generationDone.value = true
    if (questions.value.length === 0) error.value = 'The model returned no usable quotes. Go back and try again.'
    if (awaitingNext.value) tryAdvance()
  })
})

function focusInput() {
  const el = document.querySelector('.ki-input') as HTMLInputElement | null
  el?.focus()
}

async function submit() {
  const q = current.value
  if (!q || q.submitted || q.judging) return
  q.judging = true
  try {
    const client = resolveAiClient(settings.value)
    q.judgement = await judgeKi(client, settings.value.model, q.entry, q.userInput)
    q.submitted = true
  } catch (err) {
    toast.error('Grading failed', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    q.judging = false
  }
}

/** Move to the next card, or wait for generation, or finish. */
function tryAdvance() {
  if (currentIndex.value + 1 < questions.value.length) {
    currentIndex.value += 1
    awaitingNext.value = false
    nextTick(focusInput)
  } else if (generationDone.value) {
    finalize()
  } else {
    awaitingNext.value = true // wait; onResults/finally will re-call tryAdvance
  }
}

function next() {
  const q = current.value
  if (!q || !q.submitted) return
  tryAdvance()
}

function finalize() {
  if (finished.value) return
  finished.value = true
  awaitingNext.value = false
  if (!stash.value) return
  const correct = questions.value.filter(q => q.judgement?.verdict === 'correct').length
  const finishedAt = Date.now()
  sessionStorage.setItem('gt:lastKonjunktivResult', JSON.stringify({
    questions: questions.value.map(q => ({
      entry: q.entry,
      userInput: q.userInput,
      judgement: q.judgement
    })),
    correct,
    total: questions.value.length,   // save the real generated count
    expected: expected.value,        // requested N (may exceed total after dedup/shortfall)
    difficulty: stash.value.difficulty,
    topics: stash.value.topics,
    startedAt: startedAt.value,
    finishedAt
  }))
  router.push({ name: 'konjunktiv-quiz-result' })
}

function onEnter(e: KeyboardEvent) {
  e.preventDefault()
  const q = current.value
  if (!q) return
  if (!q.submitted) {
    if (q.userInput.trim().length > 0 && !q.judging) submit()
  } else {
    next()
  }
}

function endQuiz() { router.push({ name: 'konjunktiv' }) }

// The current card is the last generated one AND generation has finished.
const isLastGenerated = computed(() => currentIndex.value + 1 >= questions.value.length)

// If we were waiting and generation produced more (or finished), advance.
watch([questions, generationDone], () => { if (awaitingNext.value) tryAdvance() }, { deep: true })

const verdictLabel: Record<KiJudgeResult['verdict'], string> = {
  correct: 'Richtig',
  partially_correct: 'Teilweise',
  incorrect: 'Falsch'
}
</script>

<template>
  <div v-if="!ready" class="page loading-state"><div class="micro-mark">Generating the first quote…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="endQuiz">← Back to setup</button>
  </div>

  <div v-else-if="current" class="page">
    <div class="quiz-card ki-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Zitat {{ currentIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <div v-if="awaitingNext" class="prompt-card"><div class="micro-mark">Preparing next quote…</div></div>

      <template v-else>
      <div class="ki-prompt-meta">
        <span class="ki-prompt-difficulty">{{ stash?.difficulty }}</span>
        <span class="ki-prompt-mood">Erwartet: {{ current.entry.expectedMood }}</span>
      </div>

      <div class="prompt-card">
        <div class="ki-source">{{ current.entry.source }}</div>
        <div class="ki-rewrite" @keydown.enter="onEnter">
          <span class="ki-stem">{{ current.entry.reportingClause }}</span>
          <input
            class="ki-input"
            :class="current.submitted && current.judgement ? (current.judgement.verdict === 'correct' ? 'ki-input-right' : current.judgement.verdict === 'partially_correct' ? 'ki-input-partial' : 'ki-input-wrong') : ''"
            type="text"
            v-model="current.userInput"
            :readonly="current.submitted"
            autocomplete="off"
            spellcheck="false"
            placeholder="…sie + Konjunktiv I/II"
          />
        </div>
      </div>

      <div v-if="current.submitted && current.judgement" class="ki-feedback">
        <div class="ki-feedback-row">
          <span class="ki-verdict" :class="`ki-verdict-${current.judgement.verdict}`">
            {{ verdictLabel[current.judgement.verdict] }}
          </span>
          <span class="ki-mood-chip" :class="current.judgement.moodCheck.ok ? 'ki-mood-ok' : 'ki-mood-bad'">
            mood: {{ current.judgement.moodCheck.used }} {{ current.judgement.moodCheck.ok ? '✓' : '✗' }}
          </span>
        </div>
        <div class="ki-expected">
          <span class="ki-expected-label">Erwartet</span>
          <span class="ki-expected-text">{{ current.judgement.expected }}</span>
        </div>
        <div v-if="current.judgement.acceptedVariants.length > 0" class="ki-variants">
          <span class="ki-variants-label">Auch akzeptiert</span>
          <ul>
            <li v-for="v in current.judgement.acceptedVariants" :key="v">{{ v }}</li>
          </ul>
        </div>
        <div class="ki-rationale">{{ current.judgement.feedback }}</div>
        <div class="ki-rationale-author">Source rationale: {{ current.entry.rationale }}</div>
      </div>

      <div class="ai-actions">
        <button
          v-if="!current.submitted"
          type="button"
          class="btn btn-accent"
          @click="submit"
          :disabled="current.userInput.trim().length === 0 || current.judging"
        >{{ current.judging ? 'Grading…' : 'Grade' }}</button>
        <button
          v-else
          type="button"
          class="btn btn-accent"
          @click="next"
        >{{ (isLastGenerated && generationDone) ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
      </div>
      </template>
    </div>
  </div>

  <div v-else-if="finished" class="page loading-state"><div class="micro-mark">Wrapping up…</div></div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.ki-card { max-width: 760px; margin: 0 auto; }
.ki-prompt-meta {
  display: flex;
  gap: 18px;
  justify-content: center;
  margin: 8px 0 16px;
}
.ki-prompt-difficulty, .ki-prompt-mood {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
}
.ki-prompt-difficulty { color: var(--accent); }
.ki-source {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 22px;
  line-height: 1.5;
  color: var(--ink);
  margin-bottom: 24px;
}
.ki-rewrite {
  font-family: var(--font-display);
  font-size: 22px;
  line-height: 1.6;
  color: var(--ink);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
}
.ki-stem { white-space: pre; }
.ki-input {
  flex: 1 1 240px;
  min-width: 200px;
  border: 0;
  border-bottom: 2px solid var(--rule);
  font-family: var(--font-display);
  font-size: inherit;
  color: var(--accent);
  padding: 2px 6px;
  background: transparent;
  outline: none;
  transition: border-color .15s, color .15s;
}
.ki-input:focus { border-bottom-color: var(--accent); }
.ki-input.ki-input-right { color: var(--success); border-bottom-color: var(--success); }
.ki-input.ki-input-partial { color: var(--warn, #b58800); border-bottom-color: var(--warn, #b58800); }
.ki-input.ki-input-wrong { color: var(--danger); border-bottom-color: var(--danger); }
.ki-feedback {
  margin: 20px 0;
  padding: 14px 18px;
  background: var(--paper-deep);
  border-radius: 4px;
  border-left: 3px solid var(--accent);
  display: flex; flex-direction: column; gap: 10px;
}
.ki-feedback-row { display: flex; gap: 12px; align-items: center; }
.ki-verdict {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em;
  text-transform: uppercase; padding: 4px 8px; border-radius: 3px;
}
.ki-verdict-correct { background: color-mix(in srgb, var(--success) 18%, transparent); color: var(--success); }
.ki-verdict-partially_correct { background: color-mix(in srgb, var(--warn, #b58800) 18%, transparent); color: var(--warn, #b58800); }
.ki-verdict-incorrect { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
.ki-mood-chip { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--mute); }
.ki-mood-ok { color: var(--success); }
.ki-mood-bad { color: var(--danger); }
.ki-expected, .ki-variants { font-size: 14px; }
.ki-expected-label, .ki-variants-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--mute); display: block;
}
.ki-expected-text { font-family: var(--font-display); }
.ki-variants ul { margin: 4px 0 0 16px; padding: 0; }
.ki-rationale { font-size: 14px; line-height: 1.5; }
.ki-rationale-author {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
}
.ai-actions { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
