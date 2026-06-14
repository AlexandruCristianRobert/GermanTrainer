<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import { useConjugationQuiz } from '../../composables/useVerbQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import {
  VERB_LEVELS, VERB_TYPES, VERB_CASES, VERB_TENSES,
  TENSE_LABELS, TENSE_LEVEL,
  type Verb, type VerbLevel, type VerbType, type VerbCase, type VerbTense
} from '../../data/verbs'
import { shuffle } from '../../data/pool'

function typeTagClass(t: string): string {
  if (t === 'irregular') return 'tag-clay'
  if (t === 'separable') return 'tag-cobalt'
  if (t === 'modal') return 'tag-ochre'
  if (t === 'mixed') return 'tag-accent'
  return ''
}
function caseTagClass(c: string): string {
  if (c === 'dative' || c === 'dative+accusative') return 'tag-clay'
  if (c === 'accusative') return 'tag-cobalt'
  if (c === 'reflexive') return 'tag-accent'
  if (c === 'genitive') return 'tag-ochre'
  return ''
}

const route = useRoute()
const router = useRouter()
const { sample } = useVerbs()

const loading = ref(true)
const error = ref<string | null>(null)
let quiz: ReturnType<typeof useConjugationQuiz> | null = null
const ready = ref(false)
const inputs = ref<string[]>([])
const submitted = ref(false)
const startedAtMs = ref<number>(0)
const selectedLevels = ref<VerbLevel[]>([])
const selectedTypes = ref<VerbType[]>([])
const selectedCases = ref<VerbCase[]>([])
const selectedTenses = ref<VerbTense[]>([])
const historySaved = ref(false)

function csv<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (typeof raw !== 'string' || raw.length === 0) return [...allowed]
  const set = new Set<string>(allowed)
  return raw.split(',').map(s => s.trim()).filter((x): x is T => set.has(x))
}

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const f = {
    levels: csv<VerbLevel>(route.query.levels, VERB_LEVELS),
    types: csv<VerbType>(route.query.types, VERB_TYPES),
    cases: csv<VerbCase>(route.query.cases, VERB_CASES)
  }
  const tenses = csv<VerbTense>(route.query.tenses, VERB_TENSES)
  selectedLevels.value = f.levels
  selectedTypes.value = f.types
  selectedCases.value = f.cases
  selectedTenses.value = tenses
  try {
    const verbs: Verb[] = sample(count, f)
    if (verbs.length === 0 || tenses.length === 0) {
      error.value = 'Nothing to quiz on.'
    } else {
      quiz = useConjugationQuiz(verbs, shuffle(tenses))
      ready.value = true
      resetInputs()
      startedAtMs.value = Date.now()
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

const current = computed(() => (ready.value, quiz?.current.value ?? null))
const finished = computed(() => (ready.value, quiz?.finished.value ?? false))
const total = computed(() => (ready.value, quiz?.total.value ?? 0))
const questionIndex = computed(() => (ready.value, quiz?.currentIndex.value ?? 0))
const questions = computed(() => (ready.value, quiz?.questions.value ?? []))

const pips = computed(() => {
  const out: string[] = []
  for (let n = 0; n < total.value; n++) {
    if (n < questionIndex.value) {
      const q = questions.value[n]
      out.push(q && q.correctCount === q.totalCount ? 'done' : 'wrong')
    } else if (n === questionIndex.value && submitted.value) {
      const q = questions.value[n]
      out.push(q && q.correctCount === q.totalCount ? 'done' : 'wrong')
    } else if (n === questionIndex.value) {
      out.push('current')
    } else {
      out.push('')
    }
  }
  return out
})

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
    const first = document.querySelector<HTMLInputElement>('.conj-input')
    first?.focus()
  })
}

function skip() {
  if (!quiz || submitted.value) return
  quiz.skip()
  resetInputs()
}

function restart() { router.push({ name: 'verbs-conjugation' }) }

// Save history once when the quiz transitions to finished.
watch(finished, (now) => {
  if (!now || historySaved.value || !quiz) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'verb-conjugation',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.totalRows.value,
    correct: quiz.correctRows.value,
    meta: {
      levels: selectedLevels.value,
      types: selectedTypes.value,
      cases: selectedCases.value,
      tenses: selectedTenses.value
    }
  })
})

const aggregateLabel = computed(() => {
  if (!ready.value || !quiz) return ''
  const fullyCorrect = quiz.questions.value.filter(q => q.correctCount === q.totalCount).length
  return `${quiz.correctRows.value} / ${quiz.totalRows.value} forms · ${fullyCorrect}/${quiz.total.value} fully correct`
})
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>
  <div v-else-if="error" class="page">
    <div class="alert alert-danger">
      <span class="alert-label">Error</span>{{ error }}
    </div>
    <button class="btn btn-ghost" @click="restart">← Back to setup</button>
  </div>

  <div v-else-if="finished && ready" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Konjugation</div>
        <div class="result-score">{{ aggregateLabel }}</div>
        <p class="section-subtitle">
          Per-row scoring across {{ total }} verb–tense pairs.
        </p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'verbs' })">← Verben</button>
        <button class="btn btn-accent" @click="restart">Start another quiz <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="(q, i) in questions" :key="i" class="result-row conj-result-row">
        <div class="german">
          {{ q.verb.german }}
          <div class="german-meta">{{ TENSE_LABELS[q.tense] }} · {{ TENSE_LEVEL[q.tense] }}</div>
        </div>
        <div class="answers">
          <span v-for="(r, ri) in q.rows" :key="ri" class="row-mini">
            <span class="row-person">{{ r.person }}</span>
            <strong :style="r.isCorrect ? 'color: var(--success)' : 'color: var(--danger)'">{{ r.userAnswer || '—' }}</strong>
            <span v-if="!r.isCorrect" class="row-expected">→ {{ r.expected }}</span>
          </span>
        </div>
        <div>
          <span class="tag" :class="q.correctCount === q.totalCount ? 'tag-success' : 'tag-danger'">
            {{ q.correctCount }} / {{ q.totalCount }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="current" class="page">
    <div class="conj-quiz-stage">
      <div class="quiz-meta">
        <span class="quiz-counter">Frage {{ questionIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'verbs-cheatsheet' })">Cheatsheet</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, i) in pips" :key="i" class="pip" :class="cls" />
      </div>

      <div class="prompt-card conj-prompt">
        <div class="prompt-chips">
          <span class="tag">{{ TENSE_LABELS[current.tense] }} · {{ TENSE_LEVEL[current.tense] }}</span>
          <span class="tag" :class="typeTagClass(current.verb.type)">{{ current.verb.type }}</span>
          <span class="tag" :class="caseTagClass(current.verb.case)">{{ current.verb.case }}</span>
          <span class="tag">aux {{ current.verb.auxiliary }}</span>
        </div>
        <div class="prompt-german conj-prompt-german">{{ current.verb.german }}</div>
      </div>

      <div class="conj-table" :class="{ submitted }">
        <div class="conj-rows-grid">
          <div v-for="(row, i) in current.rows" :key="i" class="conj-row-input">
            <span class="conj-person">{{ row.person }}</span>
            <input
              v-model="inputs[i]"
              class="input conj-input"
              type="text"
              :readonly="submitted"
              autocomplete="off"
              spellcheck="false"
              :style="submitted ? {
                color: row.isCorrect ? 'var(--success)' : 'var(--danger)',
                borderBottomColor: row.isCorrect ? 'var(--success)' : 'var(--danger)'
              } : undefined"
              @keyup.enter="submitted ? next() : submit()"
            />
            <div v-if="submitted" class="conj-feedback">
              <span v-if="row.isCorrect" class="ok-mark">✓</span>
              <span v-else class="row-expected">→ <strong>{{ row.expected }}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div class="quiz-actions conj-actions">
        <span class="micro-mark">Press <span class="kbd">Enter</span> in any field to {{ submitted ? 'advance' : 'submit' }}</span>
        <div class="action-buttons">
          <button v-if="!submitted" class="btn btn-ghost" type="button" @click="skip">Skip</button>
          <button v-if="!submitted" class="btn btn-accent" type="button" @click="submit">
            Submit <span aria-hidden="true">→</span>
          </button>
          <button v-else class="btn btn-accent" type="button" @click="next">
            {{ questionIndex + 1 === total ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.conj-quiz-stage {
  max-width: 760px;
  margin: 0 auto;
}

.prompt-chips {
  position: absolute;
  top: 16px;
  left: 0;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.conj-prompt {
  padding: 56px 0 36px;
}
.conj-prompt-german {
  font-size: 72px;
  font-style: italic;
}
@media (max-width: 720px) {
  .conj-prompt-german { font-size: 44px; }
}
@media (max-width: 600px) {
  .conj-table { padding: 16px 14px; }
  .conj-rows-grid { grid-template-columns: 1fr; gap: 2px; }
  .conj-row-input { grid-template-columns: 64px 1fr; column-gap: 10px; }
  .conj-feedback { grid-column: 1 / -1; padding-left: 74px; margin-top: -2px; }
}

.conj-table {
  border: 1px solid var(--rule);
  border-radius: 2px;
  margin: 28px 0 16px;
  padding: 18px 22px;
  background: var(--paper-card);
}

.conj-rows-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 6px 36px;
}

.conj-row-input {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  align-items: baseline;
  gap: 10px;
  padding: 5px 0;
  border-bottom: 1px dotted var(--hairline);
}

.conj-person {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--ink-soft);
  font-size: 15px;
}

.conj-input {
  font-family: var(--font-mono);
  font-size: 15px;
  padding: 4px 0;
  border-bottom-width: 1px;
}

.conj-feedback {
  font-family: var(--font-mono);
  font-size: 12px;
}
.ok-mark { color: var(--success); font-weight: 600; }
.row-expected { color: var(--danger); }

.conj-actions {
  margin-top: 24px;
}
.action-buttons {
  display: flex;
  gap: 12px;
}

.conj-result-row {
  grid-template-columns: 180px 1fr auto;
}
.german-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--mute);
  margin-top: 2px;
  font-weight: 400;
}
.row-mini {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  margin-right: 12px;
  font-family: var(--font-mono);
  font-size: 13px;
}
.row-person {
  color: var(--ink-soft);
  font-style: italic;
  font-family: var(--font-body);
}
.tag-success { background: var(--success-tint); color: var(--success); }
.tag-danger { background: var(--danger-tint); color: var(--danger); }

@media (max-width: 720px) {
  .conj-result-row { grid-template-columns: 1fr; gap: 4px; }
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
}
</style>
