<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin, NAlert, NButton, NSpace, NText } from 'naive-ui'
import { useAdjectives } from '../../composables/useAdjectives'
import { useSettings } from '../../composables/useSettings'
import {
  generateAdjectiveSentences,
  makeGeminiClient,
  type SentenceItem
} from '../../composables/useClaude'
import { useAdjectiveQuiz } from '../../composables/useAdjectiveQuiz'
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
  if (adjectives.length === 0) {
    throw new Error('No adjectives available.')
  }
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
  if (res.valid.length === 0) {
    throw new Error('No usable sentences from Gemini. Try again.')
  }
  return res.valid
}

async function startQuiz() {
  phase.value = 'loading'
  errorMsg.value = ''
  try {
    await loadSettings()
    const sentences = await generate()
    quiz = useAdjectiveQuiz(sentences)
    ready.value = true
    phase.value = 'quiz'
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Failed to generate sentences.'
    phase.value = 'error'
  }
}

onMounted(startQuiz)

const current = computed(() => quiz?.current.value ?? null)
const finished = computed(() => quiz?.finished.value ?? false)

function onAnswered(answer: string) {
  quiz?.submit(answer)
}
function onNext() { quiz?.advance() }
function restart() { router.push('/adjectives/quiz') }
</script>

<template>
  <div>
    <template v-if="phase === 'loading'">
      <n-space vertical align="center">
        <n-spin />
        <n-text>Generating sentences...</n-text>
      </n-space>
    </template>
    <template v-else-if="phase === 'error'">
      <n-space vertical>
        <n-alert type="error" :title="'Generation failed'">{{ errorMsg }}</n-alert>
        <n-space>
          <n-button @click="startQuiz">Retry</n-button>
          <n-button @click="restart">Back to setup</n-button>
        </n-space>
      </n-space>
    </template>
    <template v-else-if="phase === 'quiz' && ready && quiz">
      <QuizResult
        v-if="finished"
        :questions="quiz.questions.value"
        :score="quiz.score.value"
        :total="quiz.total.value"
        @restart="restart"
      />
      <SentenceQuiz
        v-else-if="current"
        :question="current"
        :question-number="quiz.currentIndex.value + 1"
        :total-questions="quiz.total.value"
        @answered="onAnswered"
        @next="onNext"
      />
    </template>
  </div>
</template>
