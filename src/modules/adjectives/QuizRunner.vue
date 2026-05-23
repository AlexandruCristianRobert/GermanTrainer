<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdjectives } from '../../composables/useAdjectives'
import { useSettings } from '../../composables/useSettings'
import {
  generateAdjectiveSentences,
  makeGeminiClient,
  type SentenceItem
} from '../../composables/useClaude'
import { useAdjectiveQuiz } from '../../composables/useAdjectiveQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import SentenceQuiz from './SentenceQuiz.vue'
import QuizResult from './QuizResult.vue'
import { ADJECTIVE_GROUPS, type AdjectiveGroup } from '../../db/types'

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

function parseGroupsQuery(raw: unknown): AdjectiveGroup[] {
  if (typeof raw !== 'string' || raw.length === 0) return []
  const known = new Set<string>(ADJECTIVE_GROUPS)
  return raw
    .split(',')
    .map(s => decodeURIComponent(s.trim()))
    .filter((g): g is AdjectiveGroup => known.has(g))
}

async function generate(): Promise<SentenceItem[]> {
  const c = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const groups = parseGroupsQuery(route.query.groups)
  const adjectives = groups.length > 0
    ? await sampleByGroups(groups, c)
    : await sample(c)
  if (adjectives.length === 0) throw new Error('No adjectives available.')
  const client = makeGeminiClient(settings.value.geminiApiKey)
  let res = await generateAdjectiveSentences(client, {
    model: settings.value.model,
    adjectives: adjectives.map(a => ({ german: a.german, english: a.english, group: a.group }))
  })
  if (res.valid.length < adjectives.length) {
    const missing = adjectives.slice(res.valid.length)
    if (missing.length > 0) {
      const topUp = await generateAdjectiveSentences(client, {
        model: settings.value.model,
        adjectives: missing.map(a => ({ german: a.german, english: a.english, group: a.group }))
      })
      res = { valid: [...res.valid, ...topUp.valid], invalid: [...res.invalid, ...topUp.invalid] }
    }
  }
  if (res.valid.length === 0) throw new Error('No usable sentences from Gemini. Try again.')
  return res.valid
}

async function startQuiz() {
  phase.value = 'loading'
  errorMsg.value = ''
  historySaved.value = false
  selectedGroups.value = parseGroupsQuery(route.query.groups)
  try {
    await loadSettings()
    const sentences = await generate()
    quiz = useAdjectiveQuiz(sentences)
    ready.value = true
    phase.value = 'quiz'
    startedAtMs.value = Date.now()
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Failed to generate sentences.'
    phase.value = 'error'
  }
}

onMounted(startQuiz)

const current = computed(() => (ready.value, quiz?.current.value ?? null))
const finished = computed(() => (ready.value, quiz?.finished.value ?? false))

function onAnswered(answer: string) { quiz?.submit(answer) }
function onNext() { quiz?.advance() }
function restart() { router.push({ name: 'adjectives-quiz' }) }

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
  <div v-if="phase === 'loading'" class="page loading-state">
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
      :score="quiz.score.value"
      :total="quiz.total.value"
      @restart="restart"
    />
    <div v-else-if="current" class="page">
      <SentenceQuiz
        :question="current"
        :question-number="quiz.currentIndex.value + 1"
        :total-questions="quiz.total.value"
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
