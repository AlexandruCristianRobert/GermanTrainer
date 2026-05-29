<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sampleExamples } from '../../composables/usePrepositions'
import { useArticleQuiz, wrongArticlePairs } from '../../composables/usePrepositionQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { shuffle } from '../../data/pool'
import RetryModal from '../../components/RetryModal.vue'
import {
  PREPOSITION_LEVELS, PREPOSITION_CASES,
  type Preposition, type PrepositionExample,
  type PrepLevel, type PrepCase
} from '../../data/prepositions'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
const quiz = shallowRef<ReturnType<typeof useArticleQuiz> | null>(null)
const startedAt = ref<number>(0)
const historySaved = ref(false)

const userInput = ref('')
const submitted = ref(false)
const isCorrectFeedback = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
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
    const pairs = sampleExamples(count, { levels, cases })
    if (pairs.length === 0) {
      error.value = 'No sentences match the selected filters.'
    } else {
      quiz.value = useArticleQuiz(pairs)
      startedAt.value = Date.now()
      nextTick(() => inputRef.value?.focus())
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

const current = computed<{ prep: Preposition; example: PrepositionExample } | null>(() => {
  const q = quiz.value?.current.value
  return q ? { prep: q.prep, example: q.example } : null
})

const finished = computed(() => quiz.value?.finished.value === true)
const wrongCount = computed(() => quiz.value ? wrongArticlePairs(quiz.value.questions.value).length : 0)

function caseHintLabel(prep: Preposition): string {
  if (prep.case === 'two-way') return 'two-way · acc. (motion) or dat. (location)'
  return prep.case
}

function submit() {
  if (!quiz.value || submitted.value) return
  quiz.value.submit(userInput.value)
  const cur = quiz.value.questions.value[quiz.value.currentIndex.value]
  isCorrectFeedback.value = cur?.isCorrect === true
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  userInput.value = ''
  submitted.value = false
  isCorrectFeedback.value = false
  if (!quiz.value.finished.value) {
    nextTick(() => inputRef.value?.focus())
  }
}

// Rebuild in place with only the missed sentences (reshuffled); history not re-saved.
function retryWrong() {
  if (!quiz.value) return
  const wrong = wrongArticlePairs(quiz.value.questions.value)
  if (wrong.length === 0) return
  quiz.value = useArticleQuiz(shuffle(wrong))
  userInput.value = ''
  submitted.value = false
  isCorrectFeedback.value = false
  nextTick(() => inputRef.value?.focus())
}

function onEnter(e: KeyboardEvent) {
  e.preventDefault()
  if (!submitted.value) submit()
  else next()
}

// Save history once when finished.
watch(finished, (now) => {
  if (!now || !quiz.value || historySaved.value) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'prep-article',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: {
      prepLevels: csvFilter<PrepLevel>(route.query.levels, PREPOSITION_LEVELS),
      prepCases: csvFilter<PrepCase>(route.query.cases, PREPOSITION_CASES)
    }
  })
})

function restart() { router.push({ name: 'prepositions-article' }) }
function endQuiz() { router.push({ name: 'prepositions-article' }) }
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" @click="restart">← Back to setup</button>
  </div>

  <div v-else-if="finished && quiz" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Artikel einsetzen</div>
        <div class="result-score">
          {{ quiz.score.value }}<span class="denom"> / {{ quiz.total.value }}</span>
        </div>
        <p class="section-subtitle">
          The case rule for each preposition is shown above its row — review the misses below.
        </p>
      </div>
      <div class="result-actions">
        <button v-if="wrongCount > 0" class="btn btn-accent" type="button" @click="retryWrong">
          Retry {{ wrongCount }} wrong <span aria-hidden="true">→</span>
        </button>
        <span v-else class="all-correct-banner">Alles richtig! 🎉</span>
        <button class="btn btn-ghost" type="button" @click="restart">Setup another</button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="(q, i) in quiz.questions.value" :key="i" class="result-row">
        <div class="german">
          <span class="prep-result-prep">{{ q.prep.german }}</span>
          <span class="prep-result-case">{{ caseHintLabel(q.prep) }}</span>
          <div class="prep-result-sentence">{{ q.example.sentence }}</div>
          <div class="prep-result-gloss">{{ q.example.gloss }}</div>
        </div>
        <div class="answers">
          your answer:
          <strong :style="q.isCorrect ? 'color: var(--success)' : 'color: var(--danger)'">
            {{ q.userAnswer || '—' }}
          </strong>
          <span v-if="!q.isCorrect"> · expected: <strong>{{ q.example.expectedAnswer }}</strong></span>
        </div>
        <div>
          <span v-if="q.isCorrect" class="tag" style="background: var(--success-tint); color: var(--success)">✓</span>
          <span v-else class="tag" style="background: var(--danger-tint); color: var(--danger)">✗</span>
        </div>
      </div>
    </div>

    <RetryModal :wrong-count="wrongCount" item-label="sentences" @retry="retryWrong" />
  </div>

  <div v-else-if="current && quiz" class="page">
    <div class="quiz-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ quiz.currentIndex.value + 1 }} · von {{ quiz.total.value }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <div class="prep-prompt">
        <span class="prep-prompt-word">{{ current.prep.german }}</span>
        <span class="prep-prompt-case">{{ caseHintLabel(current.prep) }}</span>
      </div>

      <div class="prompt-card">
        <div class="prep-sentence" :style="{ fontSize: 'var(--noun-prompt-size, 56px)' }">
          {{ current.example.blanked }}
        </div>
        <div class="prep-gloss">{{ current.example.gloss }}</div>
      </div>

      <form class="prep-input-wrap" @submit.prevent="submit">
        <input
          ref="inputRef"
          class="input prep-input"
          type="text"
          placeholder="Article (e.g. dem, den, die, meinen…)"
          v-model="userInput"
          :readonly="submitted"
          autocomplete="off"
          spellcheck="false"
          @keydown.enter="onEnter"
          :style="submitted ? {
            color: isCorrectFeedback ? 'var(--success)' : 'var(--danger)',
            borderBottomColor: isCorrectFeedback ? 'var(--success)' : 'var(--danger)'
          } : undefined"
        />
        <button
          v-if="!submitted"
          type="submit"
          class="btn btn-accent"
          :disabled="userInput.trim().length === 0"
        >Submit</button>
        <button
          v-else
          ref="nextBtnRef"
          type="button"
          class="btn btn-accent"
          @click="next"
        >{{ quiz.currentIndex.value + 1 >= quiz.total.value ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
      </form>

      <div v-if="submitted" class="prep-feedback">
        <template v-if="isCorrectFeedback">
          <span class="prep-feedback-mark prep-feedback-ok">✓ Richtig.</span>
          <span class="prep-feedback-full">{{ current.example.sentence }}</span>
        </template>
        <template v-else>
          <span class="prep-feedback-mark prep-feedback-bad">✗ Korrekt: <strong>{{ current.example.expectedAnswer }}</strong></span>
          <span class="prep-feedback-full">{{ current.example.sentence }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.all-correct-banner {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
  color: var(--success);
}

.quiz-card { max-width: 720px; margin: 0 auto; }
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

.prep-prompt { text-align: center; margin-bottom: 8px; }
.prep-prompt-word {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 28px;
  color: var(--accent);
  margin-right: 12px;
}
.prep-prompt-case {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
}

.prep-sentence {
  font-family: var(--font-display);
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: -0.005em;
  color: var(--ink);
  text-align: center;
}
.prep-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 18px;
  color: var(--ink-soft);
  margin-top: 14px;
  text-align: center;
}

.prep-input-wrap {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  margin-top: 36px;
}
.prep-input {
  flex: 1;
  text-align: center;
  font-size: 22px;
  border: 0;
  border-bottom: 2px solid var(--rule);
  padding: 8px 0;
}
.prep-input:focus { border-bottom-color: var(--accent); outline: none; }

.prep-feedback {
  margin-top: 18px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.prep-feedback-mark { font-family: var(--font-display); font-style: italic; font-size: 17px; }
.prep-feedback-ok { color: var(--success); }
.prep-feedback-bad { color: var(--danger); }
.prep-feedback-full {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--ink-soft);
}

.prep-result-prep {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 18px;
  color: var(--accent);
  margin-right: 10px;
}
.prep-result-case {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
}
.prep-result-sentence {
  font-family: var(--font-display);
  font-size: 16px;
  margin-top: 6px;
}
.prep-result-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--ink-soft);
  margin-top: 2px;
}
</style>
