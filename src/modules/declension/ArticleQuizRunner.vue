<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sampleArticleFill } from '../../composables/useDeclension'
import { useArticleQuiz } from '../../composables/useDeclensionQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import {
  DECL_LEVELS, DECL_CASES, DECL_DETERMINERS, DECL_GENDERS,
  CASE_LABEL_DE,
  type ArticleFillEntry,
  type DeclLevel, type DeclCase, type Determiner, type DeclGender
} from '../../data/declension'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
let quiz: ReturnType<typeof useArticleQuiz> | null = null
const ready = ref(false)
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
  const levels = csvFilter<DeclLevel>(route.query.levels, DECL_LEVELS)
  const cases = csvFilter<DeclCase>(route.query.cases, DECL_CASES)
  const determiners = csvFilter<Determiner>(route.query.determiners, DECL_DETERMINERS)
  const genders = csvFilter<DeclGender>(route.query.genders, DECL_GENDERS)
  try {
    const entries = sampleArticleFill(count, { levels, cases, determiners, genders })
    if (entries.length === 0) {
      error.value = 'No sentences match the selected filters.'
    } else {
      quiz = useArticleQuiz(entries)
      ready.value = true
      startedAt.value = Date.now()
      nextTick(() => inputRef.value?.focus())
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

const current = computed<ArticleFillEntry | null>(() => {
  if (!ready.value || !quiz) return null
  const q = quiz.current.value
  return q ? q.entry : null
})

const finished = computed(() => ready.value && quiz?.finished.value === true)

function determinerLabel(entry: ArticleFillEntry): string {
  return `${entry.determiner} · ${entry.gender}`
}

function submit() {
  if (!quiz || submitted.value) return
  quiz.submit(userInput.value)
  const cur = quiz.questions.value[quiz.currentIndex.value]
  isCorrectFeedback.value = cur?.isCorrect === true
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz) return
  quiz.advance()
  userInput.value = ''
  submitted.value = false
  isCorrectFeedback.value = false
  if (!quiz.finished.value) {
    nextTick(() => inputRef.value?.focus())
  }
}

function onEnter(e: KeyboardEvent) {
  e.preventDefault()
  if (!submitted.value) submit()
  else next()
}

// Save history once when finished.
watch(finished, (now) => {
  if (!now || !quiz || historySaved.value) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'decl-article',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: quiz.total.value,
    correct: quiz.score.value,
    meta: {
      declLevels: csvFilter<DeclLevel>(route.query.levels, DECL_LEVELS),
      declCases: csvFilter<DeclCase>(route.query.cases, DECL_CASES),
      declDeterminers: csvFilter<Determiner>(route.query.determiners, DECL_DETERMINERS)
    }
  })
})

function restart() { router.push({ name: 'declension-article' }) }
function endQuiz() { router.push({ name: 'declension-article' }) }
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
          The case rule is named above each row — review the misses below.
        </p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="restart">Setup another</button>
        <button class="btn btn-accent" type="button" @click="restart">Start another quiz <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="decl-result-list">
      <div
        v-for="(q, i) in quiz.questions.value"
        :key="i"
        class="decl-result-card"
        :class="q.isCorrect ? 'is-correct' : 'is-wrong'"
      >
        <div class="decl-result-num"># {{ String(i + 1).padStart(2, '0') }}</div>
        <div class="decl-result-prompt">
          <div class="dap-case">{{ CASE_LABEL_DE[q.entry.case] }}</div>
          <div class="dap-meta">{{ determinerLabel(q.entry) }}</div>
          <div class="dap-sentence">{{ q.entry.sentence }}</div>
          <div class="dap-gloss">{{ q.entry.gloss }}</div>
        </div>

        <div class="decl-result-answers">
          <div class="dra-line">
            <span class="dra-label">your answer</span>
            <span
              v-if="q.userAnswer"
              class="vr-stamp"
              :class="q.isCorrect ? 'vr-stamp-right' : 'vr-stamp-wrong'"
            >{{ q.userAnswer }}</span>
            <span v-else class="vr-stamp vr-stamp-empty">—</span>
          </div>
          <div v-if="!q.isCorrect" class="dra-line">
            <span class="dra-label">expected</span>
            <span class="vr-stamp vr-stamp-right">{{ q.entry.expectedAnswer }}</span>
          </div>
          <div class="dra-rationale">{{ q.entry.caseRationale }}</div>
        </div>

        <div class="decl-result-score">
          <span class="tag" :class="q.isCorrect ? 'tag-success' : 'tag-danger'">
            {{ q.isCorrect ? '✓' : '✗' }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="current && quiz" class="page">
    <div class="quiz-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ quiz.currentIndex.value + 1 }} · von {{ quiz.total.value }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <div class="decl-prompt">
        <div class="decl-prompt-case">{{ CASE_LABEL_DE[current.case] }}</div>
        <div class="decl-prompt-meta">{{ determinerLabel(current) }}</div>
      </div>

      <div class="prompt-card">
        <div class="decl-sentence" :style="{ fontSize: 'var(--noun-prompt-size, 56px)' }">
          {{ current.blanked }}
        </div>
        <div class="decl-gloss">{{ current.gloss }}</div>
      </div>

      <form class="decl-input-wrap" @submit.prevent="submit">
        <input
          ref="inputRef"
          class="input decl-input"
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

      <div v-if="submitted" class="decl-feedback">
        <template v-if="isCorrectFeedback">
          <span class="decl-feedback-mark decl-feedback-ok">✓ Richtig.</span>
          <span class="decl-feedback-full">{{ current.sentence }}</span>
        </template>
        <template v-else>
          <span class="decl-feedback-mark decl-feedback-bad">✗ Korrekt: <strong>{{ current.expectedAnswer }}</strong></span>
          <span class="decl-feedback-full">{{ current.sentence }}</span>
        </template>
        <span class="decl-feedback-rationale">{{ current.caseRationale }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

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

.decl-prompt { text-align: center; margin-bottom: 12px; }
.decl-prompt-case {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 500;
}
.decl-prompt-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
  margin-top: 4px;
}

.decl-sentence {
  font-family: var(--font-display);
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: -0.005em;
  color: var(--ink);
  text-align: center;
}
.decl-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 18px;
  color: var(--ink-soft);
  margin-top: 14px;
  text-align: center;
}

.decl-input-wrap {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  margin-top: 36px;
}
.decl-input {
  flex: 1;
  text-align: center;
  font-size: 22px;
  border: 0;
  border-bottom: 2px solid var(--rule);
  padding: 8px 0;
}
.decl-input:focus { border-bottom-color: var(--accent); outline: none; }

.decl-feedback {
  margin-top: 18px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.decl-feedback-mark { font-family: var(--font-display); font-style: italic; font-size: 17px; }
.decl-feedback-ok { color: var(--success); }
.decl-feedback-bad { color: var(--danger); }
.decl-feedback-full {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--ink-soft);
}
.decl-feedback-rationale {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--mute);
  margin-top: 4px;
}

.decl-result-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
}
.decl-result-card {
  display: grid;
  grid-template-columns: 60px 1fr 1fr auto;
  gap: 18px;
  align-items: start;
  padding: 18px 20px;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-card);
}
.decl-result-card.is-wrong { border-left: 3px solid var(--danger); }
.decl-result-card.is-correct { border-left: 3px solid var(--success); }

.decl-result-num {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--mute);
  padding-top: 4px;
}

.dap-case {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
}
.dap-meta {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
  margin-top: 3px;
}
.dap-sentence {
  font-family: var(--font-display);
  font-size: 17px;
  margin-top: 8px;
  line-height: 1.3;
}
.dap-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--ink-soft);
  margin-top: 4px;
}

.decl-result-answers {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dra-line {
  display: flex;
  gap: 10px;
  align-items: baseline;
  flex-wrap: wrap;
}
.dra-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mute);
  min-width: 80px;
}
.dra-rationale {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed var(--rule);
}

.decl-result-score { padding-top: 4px; }
.tag-success { background: var(--success-tint); color: var(--success); }
.tag-danger { background: var(--danger-tint); color: var(--danger); }

@media (max-width: 720px) {
  .decl-result-card {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .decl-result-num { padding-top: 0; }
  .decl-result-score { justify-self: start; }
}
</style>
