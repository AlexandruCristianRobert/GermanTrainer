<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin, NAlert, NCard, NSpace, NText, NInput, NButton, NTag, NList, NListItem } from 'naive-ui'
import { useVerbs } from '../../composables/useVerbs'
import { useConjugationQuiz } from '../../composables/useVerbQuiz'
import {
  VERB_LEVELS, VERB_TYPES, VERB_CASES, VERB_TENSES,
  TENSE_LABELS, TENSE_LEVEL,
  type Verb, type VerbLevel, type VerbType, type VerbCase, type VerbTense
} from '../../data/verbs'

const route = useRoute()
const router = useRouter()
const { sample } = useVerbs()

const loading = ref(true)
const error = ref<string | null>(null)
let quiz: ReturnType<typeof useConjugationQuiz> | null = null
const ready = ref(false)
const inputs = ref<string[]>([])
const submitted = ref(false)

function csv<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (typeof raw !== 'string' || raw.length === 0) return [...allowed]
  const set = new Set<string>(allowed)
  return raw.split(',').map(s => s.trim()).filter((x): x is T => set.has(x))
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = 0; i < a.length; i++) {
    const j = i + Math.floor(Math.random() * (a.length - i))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const f = {
    levels: csv<VerbLevel>(route.query.levels, VERB_LEVELS),
    types: csv<VerbType>(route.query.types, VERB_TYPES),
    cases: csv<VerbCase>(route.query.cases, VERB_CASES)
  }
  const tenses = csv<VerbTense>(route.query.tenses, VERB_TENSES)
  try {
    let verbs: Verb[] = sample(count, f)
    if (verbs.length === 0 || tenses.length === 0) {
      error.value = 'Nothing to quiz on.'
    } else {
      verbs = shuffle(verbs)
      quiz = useConjugationQuiz(verbs, shuffle(tenses))
      ready.value = true
      resetInputs()
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

function resetInputs() {
  const q = quiz?.current.value
  inputs.value = q ? q.rows.map(() => '') : []
  submitted.value = false
}

// Touching `ready` makes these re-evaluate when the quiz is constructed.
const current = computed(() => (ready.value, quiz?.current.value ?? null))
const finished = computed(() => (ready.value, quiz?.finished.value ?? false))
const total = computed(() => (ready.value, quiz?.total.value ?? 0))
const questionIndex = computed(() => (ready.value, quiz?.currentIndex.value ?? 0))

function submit() {
  if (!quiz || submitted.value) return
  quiz.submit(inputs.value)
  submitted.value = true
}

function next() {
  if (!quiz) return
  quiz.advance()
  resetInputs()
  nextTick(() => {
    const first = document.querySelector<HTMLInputElement>('.conj-input input')
    first?.focus()
  })
}

function skip() {
  if (!quiz || submitted.value) return
  quiz.skip()
  resetInputs()
}

function restart() { router.push('/verbs/conjugation') }

const recap = computed(() => {
  if (!ready.value || !quiz) return []
  return quiz.questions.value.map(q => ({
    german: `${q.verb.german} — ${TENSE_LABELS[q.tense]}`,
    expected: q.rows.map(r => `${r.person}: ${r.expected}`).join(' • '),
    userAnswer: q.rows.map(r => r.userAnswer || '–').join(' • '),
    isCorrect: q.correctCount === q.totalCount
  }))
})

const aggregateLabel = computed(() => {
  if (!ready.value || !quiz) return ''
  const fullyCorrect = quiz.questions.value.filter(q => q.correctCount === q.totalCount).length
  return `Score: ${quiz.correctRows.value} / ${quiz.totalRows.value} forms (${fullyCorrect}/${quiz.total.value} fully correct)`
})
</script>

<template>
  <div>
    <n-spin v-if="loading" />
    <n-alert v-else-if="error" type="error">{{ error }}</n-alert>

    <template v-else-if="finished && ready">
      <n-card>
        <n-space vertical size="large">
          <n-text style="font-size: 22px">{{ aggregateLabel }}</n-text>
          <n-list bordered>
            <n-list-item v-for="(r, i) in recap" :key="i">
              <n-space justify="space-between" align="center" style="width: 100%">
                <span><strong>{{ r.german }}</strong> — {{ r.expected }} — your: {{ r.userAnswer }}</span>
                <n-tag :type="r.isCorrect ? 'success' : 'error'">{{ r.isCorrect ? '✓' : '×' }}</n-tag>
              </n-space>
            </n-list-item>
          </n-list>
          <n-button type="primary" @click="restart">Start another quiz</n-button>
        </n-space>
      </n-card>
    </template>

    <template v-else-if="current">
      <div class="shell">
        <n-card>
          <n-space vertical size="large">
            <n-space justify="space-between" align="center">
              <n-text depth="3">Question {{ questionIndex + 1 }} of {{ total }}</n-text>
              <n-button size="small" quaternary @click="router.push('/verbs/cheatsheet')">Cheatsheet</n-button>
            </n-space>
            <n-text style="font-size: 28px">{{ current.verb.german }}</n-text>
            <n-space>
              <n-tag size="small">{{ TENSE_LABELS[current.tense] }} <span style="opacity:.6">({{ TENSE_LEVEL[current.tense] }})</span></n-tag>
              <n-tag size="small" type="info">{{ current.verb.type }}</n-tag>
              <n-tag size="small" type="warning">{{ current.verb.case }}</n-tag>
              <n-tag size="small">aux: {{ current.verb.auxiliary }}</n-tag>
            </n-space>

            <div v-for="(row, i) in current.rows" :key="i" class="conj-row">
              <div class="pronoun">{{ row.person }}</div>
              <n-input
                v-model:value="inputs[i]"
                :disabled="submitted"
                class="conj-input"
                @keyup.enter="submit"
              />
              <div v-if="submitted" class="feedback">
                <span v-if="row.isCorrect" style="color: #18a058">✅</span>
                <span v-else style="color: #d03050">❌ {{ row.expected }}</span>
              </div>
            </div>

            <n-space>
              <n-button v-if="!submitted" type="primary" @click="submit">Submit</n-button>
              <n-button v-if="!submitted" @click="skip">Skip</n-button>
              <n-button v-if="submitted" type="primary" @click="next">Next</n-button>
            </n-space>
          </n-space>
        </n-card>
      </div>
    </template>
  </div>
</template>

<style scoped>
.shell { max-width: 560px; margin: 0 auto; }
.conj-row { display: grid; grid-template-columns: 80px 1fr auto; gap: 8px; align-items: center; }
.pronoun { font-weight: 600; opacity: 0.8; }
.feedback { font-size: 13px; }
@media (max-width: 480px) {
  .conj-row { grid-template-columns: 64px 1fr; }
  .feedback { grid-column: 1 / -1; padding-left: 64px; }
}
</style>
