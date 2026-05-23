<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { samplePrepositions } from '../../composables/usePrepositions'
import { useCaseQuiz } from '../../composables/usePrepositionQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import {
  PREPOSITION_LEVELS, PREPOSITION_CASES,
  type Preposition, type PrepLevel, type PrepCase
} from '../../data/prepositions'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
const deck = ref<Preposition[]>([])
const startedAt = ref<number>(0)
let quiz: ReturnType<typeof useCaseQuiz> | null = null

function csvFilter<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (typeof raw !== 'string' || raw.length === 0) return [...allowed]
  const set = new Set<string>(allowed)
  return raw.split(',').map(s => s.trim()).filter((x): x is T => set.has(x))
}

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const levels = csvFilter<PrepLevel>(route.query.levels, PREPOSITION_LEVELS)
  const cases  = csvFilter<PrepCase>(route.query.cases, PREPOSITION_CASES)
  try {
    const preps = samplePrepositions(count, { levels, cases })
    if (preps.length === 0) {
      error.value = 'No prepositions match the selected filters.'
    } else {
      deck.value = preps
      quiz = useCaseQuiz(preps)
      startedAt.value = Date.now()
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

const filledCount = computed(() => quiz?.questions.value.filter(q => q.picked !== null).length ?? 0)
const total = computed(() => deck.value.length)

function pick(i: number, c: PrepCase) {
  quiz?.pick(i, c)
}

function submitAll() {
  if (!quiz || filledCount.value === 0) return
  quiz.grade()
  const finishedAt = Date.now()
  const prepLevels = Array.from(new Set(deck.value.map(p => p.level))).sort()
  const prepCases = Array.from(new Set(deck.value.map(p => p.case))).sort()
  saveQuizRun({
    type: 'prep-case',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: total.value,
    correct: quiz.score.value,
    meta: { prepLevels, prepCases }
  })
  try {
    sessionStorage.setItem('gt:lastPrepCase', JSON.stringify({
      questions: quiz.questions.value,
      score: quiz.score.value,
      total: total.value
    }))
  } catch { /* ignore */ }
  router.push({ name: 'prepositions-case-result' })
}

function endQuiz() { router.push({ name: 'prepositions-case' }) }
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger">
      <span class="alert-label">Error</span>{{ error }}
    </div>
    <button class="btn btn-ghost" @click="endQuiz">← Back to setup</button>
  </div>

  <div v-else class="page">
    <div class="test-sheet">
      <header class="section-header" style="margin-bottom: 0">
        <div>
          <div class="breadcrumb">Kapitel IV · Kasus · {{ total }} Präpositionen</div>
          <h1 class="section-title">Welcher Kasus<em>?</em></h1>
          <p class="section-subtitle">
            For each preposition, pick the case it governs. Submit-all reveals your score on the next screen.
          </p>
        </div>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </header>

      <div class="test-sheet-header">
        <span class="filled-count">
          <strong>{{ filledCount }}</strong> · von {{ total }} beantwortet
        </span>
        <div class="quiz-progress-bar test-progress">
          <div v-for="(q, i) in quiz?.questions.value" :key="i"
               class="pip" :class="{ current: q.picked !== null }" />
        </div>
      </div>

      <div class="test-rows">
        <div
          v-for="(q, i) in quiz?.questions.value"
          :key="i"
          class="test-row"
        >
          <div class="test-num">
            <strong>{{ String(i + 1).padStart(2, '0') }}.</strong>
          </div>
          <div class="test-content">
            <div class="test-prompt-row">
              <span class="test-verb">{{ q.prep.german }}</span>
              <span class="test-chips">
                <span class="tag">{{ q.prep.level }}</span>
                <span class="prep-english-hint">{{ q.prep.english }}</span>
              </span>
            </div>
            <div class="case-picker">
              <button
                v-for="c in PREPOSITION_CASES"
                :key="c"
                type="button"
                class="case-btn"
                :class="{ selected: q.picked === c }"
                @click="pick(i, c)"
              >{{ c }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="test-sheet-footer">
        <span class="filled-count">
          <strong>{{ filledCount }}</strong> answered · {{ total - filledCount }} remaining
        </span>
        <button
          id="submit-all-case-btn"
          class="btn btn-accent"
          type="button"
          :disabled="filledCount === 0"
          @click="submitAll"
        >Submit all · {{ total }} prepositions <span aria-hidden="true">→</span></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.test-progress { flex: 1; max-width: 280px; margin: 0 0 0 24px; }

.prep-english-hint {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 14px;
  color: var(--mute);
  margin-right: 6px;
}

.case-picker {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.case-btn {
  background: transparent;
  border: 1px solid var(--hairline);
  border-radius: 2px;
  padding: 6px 14px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
  cursor: pointer;
  transition: all .15s;
}
.case-btn:hover { border-color: var(--ink-soft); color: var(--ink); }
.case-btn.selected {
  background: var(--accent-tint);
  border-color: var(--accent);
  color: var(--accent);
}
</style>
