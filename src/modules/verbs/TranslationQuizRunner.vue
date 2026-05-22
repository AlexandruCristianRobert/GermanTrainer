<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin, NAlert, NCard, NSpace, NText, NInput, NButton, NTag } from 'naive-ui'
import { useVerbs } from '../../composables/useVerbs'
import { useTranslationQuiz } from '../../composables/useVerbQuiz'
import { VERB_LEVELS, VERB_TYPES, VERB_CASES, type Verb, type VerbLevel, type VerbType, type VerbCase } from '../../data/verbs'
import QuizResult from './QuizResult.vue'

const route = useRoute()
const router = useRouter()
const { sample } = useVerbs()

const loading = ref(true)
const error = ref<string | null>(null)
let quiz: ReturnType<typeof useTranslationQuiz> | null = null
const ready = ref(false)
const input = ref('')
const submitted = ref(false)
const inputRef = ref<InstanceType<typeof NInput> | null>(null)
const nextBtnRef = ref<{ $el: HTMLElement } | null>(null)

function csvFilter<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (typeof raw !== 'string' || raw.length === 0) return [...allowed]
  const set = new Set<string>(allowed)
  return raw.split(',').map(s => s.trim()).filter((x): x is T => set.has(x))
}

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const f = {
    levels: csvFilter<VerbLevel>(route.query.levels, VERB_LEVELS),
    types: csvFilter<VerbType>(route.query.types, VERB_TYPES),
    cases: csvFilter<VerbCase>(route.query.cases, VERB_CASES)
  }
  try {
    const verbs: Verb[] = sample(count, f)
    if (verbs.length === 0) {
      error.value = 'No verbs available.'
    } else {
      quiz = useTranslationQuiz(verbs)
      ready.value = true
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
    nextTick(() => inputRef.value?.focus())
  }
})

// Touching `ready` makes the computeds re-evaluate when the quiz is constructed.
const current = computed(() => (ready.value, quiz?.current.value ?? null))
const finished = computed(() => (ready.value, quiz?.finished.value ?? false))
const score = computed(() => (ready.value, quiz?.score.value ?? 0))
const total = computed(() => (ready.value, quiz?.total.value ?? 0))
const questionIndex = computed(() => (ready.value, quiz?.currentIndex.value ?? 0))

const recap = computed(() => {
  if (!ready.value || !quiz) return []
  return quiz.questions.value.map(q => ({
    german: q.verb.german,
    expected: q.verb.english,
    userAnswer: q.userAnswer ?? '',
    isCorrect: q.isCorrect === true
  }))
})

const isCorrect = computed(() =>
  current.value ? current.value.isCorrect : null
)

function submit() {
  if (!quiz || submitted.value || !input.value.trim()) return
  quiz.submit(input.value)
  submitted.value = true
  nextTick(() => nextBtnRef.value?.$el?.focus?.())
}

function next() {
  if (!quiz) return
  quiz.advance()
  submitted.value = false
  input.value = ''
  nextTick(() => inputRef.value?.focus())
}

function restart() { router.push('/verbs/translation') }
</script>

<template>
  <div>
    <n-spin v-if="loading" />
    <n-alert v-else-if="error" type="error">{{ error }}</n-alert>
    <QuizResult
      v-else-if="finished && ready"
      :score="score"
      :total="total"
      :recap="recap"
      @restart="restart"
    />
    <template v-else-if="current">
      <div class="shell">
        <n-card>
          <n-space vertical size="large" align="center">
            <n-text depth="3">Question {{ questionIndex + 1 }} of {{ total }}</n-text>
            <n-text style="font-size: 32px">{{ current.verb.german }}</n-text>
            <n-space>
              <n-tag size="small">{{ current.verb.level }}</n-tag>
              <n-tag size="small" type="info">{{ current.verb.type }}</n-tag>
              <n-tag size="small" type="warning">{{ current.verb.case }}</n-tag>
            </n-space>
            <n-input
              ref="inputRef" v-model:value="input"
              :disabled="submitted"
              placeholder="English (to is optional)"
              style="width: 100%; max-width: 320px"
              @keyup.enter="submit"
            />
            <n-button v-if="!submitted" type="primary" :disabled="!input.trim()" @click="submit">Submit</n-button>
            <n-text v-if="submitted" :style="{ color: isCorrect ? '#18a058' : '#d03050' }">
              {{ isCorrect ? '✅ Correct' : `❌ Correct: ${current.verb.english}` }}
            </n-text>
            <n-button v-if="submitted" ref="nextBtnRef" type="primary" @click="next">Next</n-button>
          </n-space>
        </n-card>
      </div>
    </template>
  </div>
</template>

<style scoped>
.shell { max-width: 480px; margin: 0 auto; }
</style>
