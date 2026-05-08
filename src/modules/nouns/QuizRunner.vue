<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin, NAlert } from 'naive-ui'
import { useNouns } from '../../composables/useNouns'
import { useNounQuiz, type NounQuizMode } from '../../composables/useNounQuiz'
import GenderQuiz from './GenderQuiz.vue'
import TranslationQuiz from './TranslationQuiz.vue'
import QuizResult from './QuizResult.vue'
import type { Noun, NounGroup } from '../../db/types'
import { NOUN_GROUPS } from '../../db/types'

const route = useRoute()
const router = useRouter()
const { sample, sampleByGroups } = useNouns()

const loading = ref(true)
const error = ref<string | null>(null)
const nouns = ref<Noun[]>([])
const mode = ref<NounQuizMode>('gender')

let quiz: ReturnType<typeof useNounQuiz> | null = null
const ready = ref(false)

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
  try {
    nouns.value = groups.length > 0
      ? await sampleByGroups(groups, c)
      : await sample(c)
    if (nouns.value.length === 0) {
      error.value = 'No nouns available.'
    } else {
      quiz = useNounQuiz(nouns.value, m)
      ready.value = true
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

const current = computed(() => quiz?.current.value ?? null)
const finished = computed(() => quiz?.finished.value ?? false)

function onAnswered(_correct: boolean, answer: string) {
  if (!quiz) return
  quiz.submit(answer)
}

function onNext() {
  quiz?.advance()
}

function restart() {
  router.push('/nouns/quiz')
}
</script>

<template>
  <div>
    <n-spin v-if="loading" />
    <n-alert v-else-if="error" type="error">{{ error }}</n-alert>
    <template v-else-if="ready && quiz">
      <QuizResult
        v-if="finished"
        :questions="quiz.questions.value"
        :score="quiz.score.value"
        :total="quiz.total.value"
        :mode="mode"
        @restart="restart"
      />
      <template v-else-if="current">
        <GenderQuiz
          v-if="mode === 'gender'"
          :noun="current.noun"
          :question-number="quiz.currentIndex.value + 1"
          :total-questions="quiz.total.value"
          @answered="onAnswered"
          @next="onNext"
        />
        <TranslationQuiz
          v-else
          :noun="current.noun"
          :question-number="quiz.currentIndex.value + 1"
          :total-questions="quiz.total.value"
          @answered="onAnswered"
          @next="onNext"
        />
      </template>
    </template>
  </div>
</template>
