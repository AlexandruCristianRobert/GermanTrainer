<script setup lang="ts">
import { computed, onMounted, shallowRef, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNouns } from '../../composables/useNouns'
import { useNounQuiz, wrongNouns, type NounQuizMode } from '../../composables/useNounQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import GenderQuiz from './GenderQuiz.vue'
import TranslationQuiz from './TranslationQuiz.vue'
import QuizResult from './QuizResult.vue'
import { NOUN_GROUPS, type Noun, type NounGroup } from '../../db/types'
import { shuffle } from '../../data/pool'

const route = useRoute()
const router = useRouter()
const { sample, sampleByGroups } = useNouns()

const loading = ref(true)
const error = ref<string | null>(null)
const nouns = ref<Noun[]>([])
const mode = ref<NounQuizMode>('gender')
const startedAtMs = ref<number>(0)
const selectedGroups = ref<NounGroup[]>([])
const historySaved = ref(false)

const quiz = shallowRef<ReturnType<typeof useNounQuiz> | null>(null)

function parseGroupsQuery(raw: unknown): NounGroup[] {
  if (typeof raw !== 'string' || raw.length === 0) return []
  const known = new Set<string>(NOUN_GROUPS)
  return raw
    .split(',')
    .map(s => decodeURIComponent(s.trim()))
    .filter((g): g is NounGroup => known.has(g))
}

onMounted(async () => {
  const m = (route.query.mode as string) === 'translation' ? 'translation' : 'gender'
  const c = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const groups = parseGroupsQuery(route.query.groups)
  mode.value = m
  selectedGroups.value = groups
  try {
    nouns.value = groups.length > 0
      ? await sampleByGroups(groups, c)
      : await sample(c)
    if (nouns.value.length === 0) {
      error.value = 'No nouns available.'
    } else {
      quiz.value = useNounQuiz(nouns.value, m)
      startedAtMs.value = Date.now()
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

const current = computed(() => quiz.value?.current.value ?? null)
const finished = computed(() => quiz.value?.finished.value ?? false)
const questions = computed(() => quiz.value?.questions.value ?? [])
const score = computed(() => quiz.value?.score.value ?? 0)
const total = computed(() => quiz.value?.total.value ?? 0)
const currentIndex = computed(() => quiz.value?.currentIndex.value ?? 0)

function onAnswered(_correct: boolean, answer: string) {
  if (!quiz.value) return
  quiz.value.submit(answer)
}

function onNext() { quiz.value?.advance() }

function retryWrong() {
  if (!quiz.value) return
  const wrong = wrongNouns(quiz.value.questions.value)
  if (wrong.length === 0) return
  quiz.value = useNounQuiz(shuffle(wrong), mode.value)
}

function restart() { router.push({ name: 'nouns-quiz' }) }

// Save to history once when the quiz transitions to finished.
watch(finished, (now) => {
  if (!now || historySaved.value) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: mode.value === 'gender' ? 'noun-gender' : 'noun-translation',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: total.value,
    correct: score.value,
    meta: {
      mode: mode.value,
      groups: selectedGroups.value
    }
  })
})
</script>

<template>
  <div v-if="loading" class="page loading-state">
    <div class="micro-mark">Loading…</div>
  </div>
  <div v-else-if="error" class="page">
    <div class="alert alert-danger">
      <span class="alert-label">Error</span>
      {{ error }}
    </div>
    <button class="btn btn-ghost" @click="restart">← Back to setup</button>
  </div>
  <QuizResult
    v-else-if="finished && quiz"
    :questions="questions"
    :score="score"
    :total="total"
    :mode="mode"
    @restart="restart"
    @retry-wrong="retryWrong"
  />
  <template v-else-if="current">
    <div class="page">
      <GenderQuiz
        v-if="mode === 'gender'"
        :noun="current.noun"
        :question-number="currentIndex + 1"
        :total-questions="total"
        :history="questions.slice(0, currentIndex)"
        @answered="onAnswered"
        @next="onNext"
        @end-quiz="restart"
      />
      <TranslationQuiz
        v-else
        :noun="current.noun"
        :question-number="currentIndex + 1"
        :total-questions="total"
        :history="questions.slice(0, currentIndex)"
        @answered="onAnswered"
        @next="onNext"
        @end-quiz="restart"
      />
    </div>
  </template>
</template>

<style scoped>
.loading-state {
  text-align: center;
  padding-top: 120px;
}
</style>
