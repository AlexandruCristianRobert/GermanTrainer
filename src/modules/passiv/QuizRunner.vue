<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  TRANSFORMATION_EXAMPLES,
  TRANSFORMATION_LABELS,
  type PassivDifficulty,
  type PassivJudgeResult,
  type PassivQuestion,
  type TransformationType
} from '../../data/passiv'
import { generatePassivQuestions, judgePassiv } from '../../composables/usePassivQuiz'
import { planRampBatches, generateProgressively } from '../../composables/useProgressiveGenerator'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'
import { useSound } from '../../composables/useSound'

interface Stash {
  count: number
  difficulty: PassivDifficulty
  focusedTypes?: TransformationType[]
  focusTypes: TransformationType[]
  model?: string
}

interface QuestionState {
  entry: PassivQuestion
  userInput: string
  submitted: boolean
  judging: boolean
  judgement: PassivJudgeResult | null
  exampleOpen: boolean
}

const router = useRouter()
const toast = useToast()
const sound = useSound()
const { settings, load: loadSettings } = useSettings()
let chimed = false

const error = ref<string | null>(null)
const stash = ref<Stash | null>(null)
const questions = ref<QuestionState[]>([])
const currentIndex = ref(0)
const startedAt = ref(0)

const expected = ref(0)            // requested N
const generationDone = ref(false)
const awaitingNext = ref(false)    // outran generation
const finished = ref(false)

// Open the moment the first sentence lands, generation ends, or an error surfaces.
const ready = computed(() => questions.value.length > 0 || generationDone.value || error.value !== null)

onMounted(async () => {
  await loadSettings()
  let s: Stash | null = null
  try {
    const raw = sessionStorage.getItem('gt:lastPassiv')
    if (!raw) {
      error.value = 'No session data found. Go back to Setup and run Generate.'
      return
    }
    s = JSON.parse(raw) as Stash
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
    return
  }
  if (!s || typeof s.count !== 'number' || s.count <= 0) {
    error.value = 'Session contained no generation parameters.'
    return
  }

  stash.value = s
  expected.value = s.count
  startedAt.value = Date.now()

  const client = resolveAiClient(settings.value)
  const model = s.model ?? settings.value.model
  const difficulty = s.difficulty
  const focusedTypes = s.focusedTypes

  // Cross-batch dedup: the active sentence identifies the item. The count-based
  // generator dedups within a call but not across sequential batches.
  const seen = new Set<string>()
  const contentKey = (q: PassivQuestion) => q.active.trim().toLowerCase()

  // Ramp 5, then batches of 10 (ADR-0008): a fast first paint, then an efficient tail.
  const units = Array.from({ length: s.count }, (_, i) => i)
  const batches = planRampBatches(units, [5], 10)

  generateProgressively<number, PassivQuestion>({
    batches,
    runBatch: async (chunk) => {
      const res = await generatePassivQuestions(client, {
        model,
        count: chunk.length,
        difficulty,
        focusedTypes,
        maxRetries: 2
      })
      return res.entries
    },
    onResults: (entries) => {
      for (const e of entries) {
        const key = contentKey(e)
        if (seen.has(key)) continue
        seen.add(key)
        questions.value.push({
          entry: e,
          userInput: '',
          submitted: false,
          judging: false,
          judgement: null,
          exampleOpen: false
        })
      }
      if (!chimed && questions.value.length > 0) { chimed = true; sound.playReady() }
      if (awaitingNext.value) advance()
      nextTick(focusInput)
    },
    concurrency: 1 // SEQUENTIAL — needed for cross-batch dedup to be meaningful.
  }).finally(() => {
    generationDone.value = true
    if (questions.value.length === 0) {
      error.value = 'The model returned no usable sentences. Go back and try again.'
    }
    if (awaitingNext.value) advance()
  })
})

function focusInput() {
  const el = document.querySelector('.passiv-input') as HTMLInputElement | null
  el?.focus()
}

const current = computed(() => questions.value[currentIndex.value] ?? null)
const total = computed(() => expected.value)
const generatedTotal = computed(() => questions.value.length)
const isLastGenerated = computed(() => currentIndex.value + 1 >= questions.value.length)

async function submit() {
  const q = current.value
  if (!q || q.submitted || q.judging) return
  q.judging = true
  try {
    const client = resolveAiClient(settings.value)
    q.judgement = await judgePassiv(client, settings.value.model, q.entry, q.userInput)
    q.submitted = true
  } catch (err) {
    toast.error('Grading failed', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    q.judging = false
  }
}

/** Advance to the next card, or wait for generation, or finish. */
function advance() {
  if (currentIndex.value + 1 < questions.value.length) {
    currentIndex.value += 1
    awaitingNext.value = false
    nextTick(focusInput)
  } else if (generationDone.value) {
    finalize()
  } else {
    awaitingNext.value = true // wait; onResults/finally will re-call advance
  }
}

function next() {
  advance()
}

function finalize() {
  if (!stash.value || finished.value) return
  finished.value = true
  awaitingNext.value = false
  const correct = questions.value.filter(q => q.judgement?.verdict === 'correct').length
  const finishedAt = Date.now()

  const perType: Record<string, { correct: number; total: number }> = {}
  for (const q of questions.value) {
    const t = q.entry.target as string
    perType[t] = perType[t] ?? { correct: 0, total: 0 }
    perType[t].total += 1
    if (q.judgement?.verdict === 'correct') perType[t].correct += 1
  }

  sessionStorage.setItem('gt:lastPassivResult', JSON.stringify({
    questions: questions.value.map(q => ({
      entry: q.entry,
      userInput: q.userInput,
      judgement: q.judgement
    })),
    correct,
    total: generatedTotal.value,
    requested: expected.value,
    difficulty: stash.value.difficulty,
    focusTypes: stash.value.focusTypes,
    perType,
    startedAt: startedAt.value,
    finishedAt
  }))
  router.push({ name: 'passiv-quiz-result' })
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

function endQuiz() { router.push({ name: 'passiv' }) }

const verdictLabel: Record<PassivJudgeResult['verdict'], string> = {
  correct: 'Richtig',
  partially_correct: 'Teilweise',
  incorrect: 'Falsch'
}

// If we were waiting on generation and more sentences arrived (or it finished
// empty), resume.
watch([questions, generationDone], () => { if (awaitingNext.value) advance() }, { deep: true })
</script>

<template>
  <div v-if="!ready" class="page loading-state"><div class="micro-mark">Generating the first sentence…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="endQuiz">← Back to setup</button>
  </div>

  <div v-else-if="current" class="page">
    <div class="quiz-card passiv-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ currentIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <div v-if="awaitingNext" class="prompt-card"><div class="micro-mark">Preparing next sentence…</div></div>

      <template v-else>
      <div class="passiv-target-row">
        <span class="passiv-target-label">Form</span>
        <span class="passiv-target-tag">{{ TRANSFORMATION_LABELS[current.entry.target] }}</span>
        <button
          type="button"
          class="passiv-example-toggle"
          :aria-expanded="current.exampleOpen"
          @click="current.exampleOpen = !current.exampleOpen"
        >?</button>
      </div>
      <div v-if="current.exampleOpen" class="passiv-example">
        e.g. <span class="passiv-example-text">{{ TRANSFORMATION_EXAMPLES[current.entry.target] }}</span>
      </div>

      <div class="prompt-card">
        <div class="passiv-active">{{ current.entry.active }}</div>
        <div class="passiv-input-row" @keydown.enter="onEnter">
          <input
            class="passiv-input"
            :class="current.submitted && current.judgement ? (current.judgement.verdict === 'correct' ? 'passiv-input-right' : current.judgement.verdict === 'partially_correct' ? 'passiv-input-partial' : 'passiv-input-wrong') : ''"
            type="text"
            v-model="current.userInput"
            :readonly="current.submitted"
            autocomplete="off"
            spellcheck="false"
            placeholder="Type the rewrite…"
          />
        </div>
      </div>

      <div v-if="current.submitted && current.judgement" class="passiv-feedback">
        <div class="passiv-feedback-row">
          <span class="passiv-verdict" :class="`passiv-verdict-${current.judgement.verdict}`">
            {{ verdictLabel[current.judgement.verdict] }}
          </span>
          <span class="passiv-form-chip" :class="current.judgement.formCheck.matchesTarget ? 'passiv-form-ok' : 'passiv-form-bad'">
            used: {{ current.judgement.formCheck.usedType }} {{ current.judgement.formCheck.matchesTarget ? '✓' : '✗' }}
          </span>
        </div>
        <div class="passiv-expected">
          <span class="passiv-expected-label">Erwartet</span>
          <span class="passiv-expected-text">{{ current.judgement.expected }}</span>
        </div>
        <div v-if="current.judgement.acceptedVariants.length > 0" class="passiv-variants">
          <span class="passiv-variants-label">Auch akzeptiert</span>
          <ul>
            <li v-for="v in current.judgement.acceptedVariants" :key="v">{{ v }}</li>
          </ul>
        </div>
        <div class="passiv-rationale">{{ current.judgement.feedback }}</div>
        <div class="passiv-rationale-author">Source rationale: {{ current.entry.rationale }}</div>
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
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.passiv-card { max-width: 760px; margin: 0 auto; }
.passiv-target-row { display: flex; gap: 12px; align-items: center; margin: 8px 0 4px; }
.passiv-target-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute);
}
.passiv-target-tag {
  font-family: var(--font-display); font-size: 16px; color: var(--accent);
  padding: 4px 10px; border: 1px solid var(--accent); border-radius: 3px;
}
.passiv-example-toggle {
  background: transparent; border: 1px solid var(--rule);
  width: 22px; height: 22px; border-radius: 50%;
  color: var(--mute); cursor: pointer; line-height: 1;
}
.passiv-example {
  margin: 4px 0 12px; font-size: 13px; color: var(--mute);
  font-family: var(--font-body); font-style: italic;
}
.passiv-example-text { color: var(--ink-soft); }
.passiv-active {
  font-family: var(--font-display); font-style: italic;
  font-size: 22px; line-height: 1.5; color: var(--ink); margin-bottom: 18px;
}
.passiv-input-row { display: flex; }
.passiv-input {
  flex: 1; border: 0; border-bottom: 2px solid var(--rule);
  font-family: var(--font-display); font-size: 22px;
  color: var(--accent); padding: 6px 6px;
  background: transparent; outline: none;
  transition: border-color .15s, color .15s;
}
.passiv-input:focus { border-bottom-color: var(--accent); }
.passiv-input.passiv-input-right { color: var(--success); border-bottom-color: var(--success); }
.passiv-input.passiv-input-partial { color: var(--warn, #b58800); border-bottom-color: var(--warn, #b58800); }
.passiv-input.passiv-input-wrong { color: var(--danger); border-bottom-color: var(--danger); }
.passiv-feedback {
  margin: 20px 0; padding: 14px 18px;
  background: var(--paper-deep); border-radius: 4px;
  border-left: 3px solid var(--accent);
  display: flex; flex-direction: column; gap: 10px;
}
.passiv-feedback-row { display: flex; gap: 12px; align-items: center; }
.passiv-verdict {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em;
  text-transform: uppercase; padding: 4px 8px; border-radius: 3px;
}
.passiv-verdict-correct { background: color-mix(in srgb, var(--success) 18%, transparent); color: var(--success); }
.passiv-verdict-partially_correct { background: color-mix(in srgb, var(--warn, #b58800) 18%, transparent); color: var(--warn, #b58800); }
.passiv-verdict-incorrect { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
.passiv-form-chip { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--mute); }
.passiv-form-ok { color: var(--success); }
.passiv-form-bad { color: var(--danger); }
.passiv-expected, .passiv-variants { font-size: 14px; }
.passiv-expected-label, .passiv-variants-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--mute); display: block;
}
.passiv-expected-text { font-family: var(--font-display); }
.passiv-variants ul { margin: 4px 0 0 16px; padding: 0; }
.passiv-rationale { font-size: 14px; line-height: 1.5; }
.passiv-rationale-author {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
}
.ai-actions { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
