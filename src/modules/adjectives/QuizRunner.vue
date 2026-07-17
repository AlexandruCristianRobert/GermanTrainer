<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdjectives } from '../../composables/useAdjectives'
import { useSettings } from '../../composables/useSettings'
import { resolveAiClient } from '../../composables/localClaude'
import {
  generateAdjectiveSentences,
  type SentenceItem
} from '../../composables/useClaude'
import { useAdjectiveQuiz } from '../../composables/useAdjectiveQuiz'
import { planRampBatches, generateProgressively } from '../../composables/useProgressiveGenerator'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { useSound } from '../../composables/useSound'
import SentenceQuiz from './SentenceQuiz.vue'
import QuizResult from './QuizResult.vue'
import { ADJECTIVE_GROUPS, type AdjectiveGroup } from '../../db/types'
import { useToast } from '../../composables/useToast'

const toast = useToast()
const sound = useSound()
let chimed = false

const route = useRoute()
const router = useRouter()
const { sample, sampleByGroups } = useAdjectives()
const { settings, load: loadSettings } = useSettings()

const phase = ref<'loading' | 'error' | 'quiz'>('loading')
const errorMsg = ref('')
let quiz: ReturnType<typeof useAdjectiveQuiz> | null = null
const ready = ref(false)
const startedAtMs = ref<number>(0)
const selectedGroups = ref<AdjectiveGroup[]>([])
const historySaved = ref(false)

// Progressive-generation state (mirrors VerbSentenceRunner).
const expected = ref(0)            // requested N
const generationDone = ref(false)
const awaitingNext = ref(false)    // learner outran generation
const questionsLen = ref(0)        // reactive mirror of quiz.questions.length

function parseGroupsQuery(raw: unknown): AdjectiveGroup[] {
  if (typeof raw !== 'string' || raw.length === 0) return []
  const known = new Set<string>(ADJECTIVE_GROUPS)
  return raw
    .split(',')
    .map(s => decodeURIComponent(s.trim()))
    .filter((g): g is AdjectiveGroup => known.has(g))
}

async function startQuiz() {
  phase.value = 'loading'
  errorMsg.value = ''
  historySaved.value = false
  ready.value = false
  generationDone.value = false
  awaitingNext.value = false
  chimed = false
  questionsLen.value = 0
  selectedGroups.value = parseGroupsQuery(route.query.groups)

  try {
    await loadSettings()
    const c = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
    const groups = selectedGroups.value
    const adjectives = groups.length > 0
      ? await sampleByGroups(groups, c)
      : await sample(c)
    if (adjectives.length === 0) throw new Error('No adjectives available.')

    const specs = adjectives.map(a => ({ german: a.german, english: a.english, group: a.group }))
    expected.value = specs.length

    quiz = useAdjectiveQuiz([])
    startedAtMs.value = Date.now()
    phase.value = 'quiz'

    const client = resolveAiClient(settings.value)
    // Ramp 5, then batches of 10 (ADR-0008): fast first paint, efficient tail.
    const batches = planRampBatches(specs, [5], 10)
    generateProgressively<{ german: string; english: string; group?: string }, SentenceItem>({
      batches,
      runBatch: async (batch) => {
        let res = await generateAdjectiveSentences(client, { model: settings.value.model, adjectives: batch })
        // Re-run the shortfall once (mirrors the old top-up behaviour), then accept.
        if (res.valid.length < batch.length) {
          const missing = batch.slice(res.valid.length)
          if (missing.length > 0) {
            try {
              const topUp = await generateAdjectiveSentences(client, { model: settings.value.model, adjectives: missing })
              res = { valid: [...res.valid, ...topUp.valid], invalid: [...res.invalid, ...topUp.invalid] }
            } catch { /* accept the shortfall */ }
          }
        }
        return res.valid
      },
      onResults: (items) => {
        if (!quiz || items.length === 0) return
        quiz.append(items)
        questionsLen.value = quiz.questions.value.length
        if (!ready.value) { ready.value = true }
        if (!chimed) { chimed = true; sound.playReady() }
        if (awaitingNext.value) resumeAdvance()
      },
      concurrency: 4
    }).finally(() => {
      generationDone.value = true
      if (quiz && quiz.questions.value.length === 0) {
        errorMsg.value = 'No usable sentences from Gemini. Try again.'
        phase.value = 'error'
        toast.error('Adjective generation failed', { description: errorMsg.value })
      }
      if (awaitingNext.value) resumeAdvance()
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate sentences.'
    errorMsg.value = msg
    phase.value = 'error'
    generationDone.value = true
    toast.error('Adjective generation failed', { description: msg })
  }
}

onMounted(startQuiz)

const current = computed(() => (questionsLen.value, quiz?.current.value ?? null))
const score = computed(() => (questionsLen.value, quiz?.score.value ?? 0))
// Runner-controlled finish: only truly finished once generation is done and the
// learner has advanced past the last generated question.
const finished = computed(() =>
  generationDone.value && quiz !== null && quiz.currentIndex.value >= quiz.questions.value.length
)
// Counter denominator: expected count while streaming, real count once done.
const totalDisplay = computed(() => generationDone.value ? questionsLen.value : expected.value)
const currentNumber = computed(() => (quiz?.currentIndex.value ?? 0) + 1)

function onAnswered(answer: string) { quiz?.submit(answer) }

/** Advance to the next generated question, wait for generation, or finish. */
function resumeAdvance() {
  if (!quiz) return
  if (quiz.currentIndex.value + 1 < quiz.questions.value.length) {
    quiz.advance()
    awaitingNext.value = false
  } else if (generationDone.value) {
    quiz.advance() // pushes currentIndex past the end -> finished computed flips
    awaitingNext.value = false
  } else {
    awaitingNext.value = true // wait; onResults/finally will re-call resumeAdvance
  }
}

function onNext() { resumeAdvance() }
function restart() { router.push({ name: 'adjectives-quiz' }) }

// If we were waiting and generation caught up (or finished), advance.
watch([questionsLen, generationDone], () => { if (awaitingNext.value) resumeAdvance() })

// Save history once when finished.
watch(finished, (now) => {
  if (!now || historySaved.value || !quiz) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'adjective',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.total.value,
    correct: quiz.score.value,
    meta: { groups: selectedGroups.value }
  })
})
</script>

<template>
  <div v-if="phase === 'loading' || (phase === 'quiz' && !ready)" class="page loading-state">
    <div class="loading-mark">
      <div class="micro-mark">Generating sentences via Gemini…</div>
      <div class="loading-spinner" aria-hidden="true" />
    </div>
  </div>

  <div v-else-if="phase === 'error'" class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Fehler</div>
        <h1 class="section-title">Failed<em>.</em></h1>
      </div>
    </header>
    <div class="alert alert-danger">
      <span class="alert-label">Generation failed</span>
      {{ errorMsg }}
    </div>
    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="restart">← Back to setup</button>
      <button class="btn btn-accent" type="button" @click="startQuiz">Retry <span aria-hidden="true">→</span></button>
    </div>
  </div>

  <template v-else-if="phase === 'quiz' && ready && quiz">
    <QuizResult
      v-if="finished"
      :questions="quiz.questions.value"
      :score="score"
      :total="quiz.total.value"
      @restart="restart"
    />
    <div v-else-if="awaitingNext" class="page loading-state">
      <div class="loading-mark">
        <div class="micro-mark">Preparing next sentence…</div>
        <div class="loading-spinner" aria-hidden="true" />
      </div>
    </div>
    <div v-else-if="current" class="page">
      <SentenceQuiz
        :question="current"
        :question-number="currentNumber"
        :total-questions="totalDisplay"
        @answered="onAnswered"
        @next="onNext"
        @end-quiz="restart"
      />
    </div>
  </template>
</template>

<style scoped>
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
.loading-mark {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}
.loading-spinner {
  width: 32px;
  height: 32px;
  border: 2px solid var(--hairline);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.setup-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 40px;
  gap: 16px;
}
</style>
