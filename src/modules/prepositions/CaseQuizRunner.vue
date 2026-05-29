<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, shallowRef, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { samplePrepositions } from '../../composables/usePrepositions'
import { useCaseQuiz, wrongCasePreps } from '../../composables/usePrepositionQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { shuffle } from '../../data/pool'
import CaseQuizResult from './CaseQuizResult.vue'
import {
  PREPOSITION_LEVELS, PREPOSITION_CASES,
  type PrepLevel, type PrepCase
} from '../../data/prepositions'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
const quiz = shallowRef<ReturnType<typeof useCaseQuiz> | null>(null)
const startedAt = ref<number>(0)
const historySaved = ref(false)
const submitted = ref(false)
const cardRef = ref<HTMLElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

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
      quiz.value = useCaseQuiz(preps)
      startedAt.value = Date.now()
      nextTick(() => cardRef.value?.focus())
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const current = computed(() => quiz.value?.current.value ?? null)
const finished = computed(() => quiz.value?.finished.value === true)
const currentIsCorrect = computed(() => quiz.value?.current.value?.isCorrect ?? null)

function pick(c: PrepCase) {
  if (!quiz.value || submitted.value) return
  quiz.value.pick(c)
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  submitted.value = false
  if (!quiz.value.finished.value) nextTick(() => cardRef.value?.focus())
}

// Rebuild in place with only the missed prepositions (reshuffled); history not re-saved.
function retryWrong() {
  if (!quiz.value) return
  const wrong = wrongCasePreps(quiz.value.questions.value)
  if (wrong.length === 0) return
  quiz.value = useCaseQuiz(shuffle(wrong))
  submitted.value = false
  nextTick(() => cardRef.value?.focus())
}

// 1=accusative · 2=dative · 3=genitive · 4=two-way; Enter advances after a pick.
function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  if (!current.value) return
  if (e.key === 'Enter') {
    if (submitted.value) { e.preventDefault(); next() }
    return
  }
  if (submitted.value) return
  const idx = e.key.charCodeAt(0) - '1'.charCodeAt(0)
  if (idx < 0 || idx >= PREPOSITION_CASES.length) return
  e.preventDefault()
  pick(PREPOSITION_CASES[idx])
}

// Save history once when the FIRST round finishes; retry rounds are not saved.
watch(finished, (now) => {
  if (!now || !quiz.value || historySaved.value) return
  historySaved.value = true
  const finishedAt = Date.now()
  const qs = quiz.value.questions.value
  const prepLevels = Array.from(new Set(qs.map(q => q.prep.level))).sort()
  const prepCases = Array.from(new Set(qs.map(q => q.prep.case))).sort()
  saveQuizRun({
    type: 'prep-case',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: { prepLevels, prepCases }
  })
})

function restart() { router.push({ name: 'prepositions-case' }) }
function endQuiz() { router.push({ name: 'prepositions-case' }) }
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" @click="endQuiz">← Back to setup</button>
  </div>

  <CaseQuizResult
    v-else-if="finished && quiz"
    :questions="quiz.questions.value"
    :score="quiz.score.value"
    :total="quiz.total.value"
    @restart="restart"
    @retry-wrong="retryWrong"
  />

  <div v-else-if="current && quiz" class="page">
    <div class="quiz-card" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Präposition {{ quiz.currentIndex.value + 1 }} · von {{ quiz.total.value }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <div class="prep-prompt">
        <span class="prep-prompt-word">{{ current.prep.german }}</span>
        <span class="prep-prompt-hint">{{ current.prep.english }}</span>
      </div>
      <div class="prep-ask">
        <span class="tag">{{ current.prep.level }}</span>
        Welcher Kasus<em>?</em>
      </div>

      <div class="case-picker-grid">
        <button
          v-for="(c, ci) in PREPOSITION_CASES"
          :key="c"
          type="button"
          class="case-choice"
          :class="{
            selected: current.picked === c,
            correct: submitted && current.prep.case === c,
            wrong: submitted && current.picked === c && current.prep.case !== c,
            disabled: submitted
          }"
          :disabled="submitted"
          @click="pick(c)"
        >
          <span class="case-choice-key">{{ ci + 1 }}</span>
          <span class="case-choice-label">{{ c }}</span>
        </button>
      </div>

      <div v-if="submitted" class="prep-feedback">
        <span v-if="currentIsCorrect" class="prep-feedback-mark prep-feedback-ok">
          ✓ Richtig — {{ current.prep.case }}.
        </span>
        <span v-else class="prep-feedback-mark prep-feedback-bad">
          ✗ Korrekt: <strong>{{ current.prep.case }}</strong>.
        </span>
        <button ref="nextBtnRef" type="button" class="btn btn-accent" style="margin-top: 16px;" @click="next">
          {{ quiz.currentIndex.value + 1 >= quiz.total.value ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span>
        </button>
      </div>

      <div class="prep-hint micro-mark">
        <template v-if="!submitted">Press <span class="kbd">1</span>–<span class="kbd">4</span> to choose</template>
        <template v-else>Press <span class="kbd">Enter</span> to {{ quiz.currentIndex.value + 1 >= quiz.total.value ? 'finish' : 'continue' }}</template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }

.quiz-card { max-width: 640px; margin: 0 auto; outline: none; }
.quiz-card:focus-visible { outline: 1px dotted var(--rule); outline-offset: 8px; }
.quiz-meta {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 32px;
}
.quiz-counter {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
}

.prep-prompt { text-align: center; padding: 16px 0 4px; }
.prep-prompt-word {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 44px;
  color: var(--accent);
  margin-right: 14px;
}
.prep-prompt-hint {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 18px;
  color: var(--ink-soft);
}
.prep-ask {
  text-align: center;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 28px;
}
.prep-ask em { font-style: normal; color: var(--accent); }

.case-picker-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.case-choice {
  background: var(--paper-card);
  border: 1px solid var(--rule);
  border-radius: 4px;
  padding: 20px 18px;
  cursor: pointer;
  transition: all .15s;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.case-choice:not(:disabled):hover { border-color: var(--accent); color: var(--ink); background: var(--accent-wash); }
.case-choice.selected { border-color: var(--accent); color: var(--accent); }
.case-choice.correct { border-color: var(--success); color: var(--success); background: var(--success-tint); }
.case-choice.wrong { border-color: var(--danger); color: var(--danger); background: var(--danger-tint); }
.case-choice.disabled { cursor: default; }
.case-choice-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  font-size: 11px;
  letter-spacing: 0;
  color: var(--mute);
  border: 1px solid var(--hairline);
  border-radius: 2px;
  background: var(--paper);
}
.case-choice.correct .case-choice-key { border-color: var(--success); color: var(--success); }
.case-choice.wrong .case-choice-key { border-color: var(--danger); color: var(--danger); }

.prep-feedback {
  margin-top: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.prep-feedback-mark { font-family: var(--font-display); font-style: italic; font-size: 18px; }
.prep-feedback-ok { color: var(--success); }
.prep-feedback-bad { color: var(--danger); }

.prep-hint { margin-top: 24px; text-align: center; color: var(--mute); }

@media (max-width: 720px) {
  .prep-prompt-word { font-size: 32px; }
  .case-picker-grid { grid-template-columns: 1fr; }
}
</style>
