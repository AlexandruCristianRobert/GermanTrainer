<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCaseRecognitionQuiz } from '../../composables/useDeclensionQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { CASE_RECOGNITION_ENTRIES, type CaseRecognitionEntry } from '../../data/case-recognition'
import {
  DECL_LEVELS, DECL_CASES,
  type DeclLevel, type DeclCase
} from '../../data/declension'
import { usePagination } from '../../composables/usePagination'
import Pagination from '../../components/Pagination.vue'
import { createPool, type FieldMatchers } from '../../data/pool'

const CASE_SHORT: Record<DeclCase, string> = {
  nominative: 'NOM',
  accusative: 'AKK',
  dative: 'DAT',
  genitive: 'GEN'
}
const CASE_DE: Record<DeclCase, string> = {
  nominative: 'Nominativ',
  accusative: 'Akkusativ',
  dative: 'Dativ',
  genitive: 'Genitiv'
}

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
let quiz: ReturnType<typeof useCaseRecognitionQuiz> | null = null
const ready = ref(false)
const startedAtMs = ref<number>(0)
const historySaved = ref(false)

const cardRef = ref<HTMLElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

function csv<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (typeof raw !== 'string' || raw.length === 0) return [...allowed]
  const set = new Set<string>(allowed)
  return raw.split(',').map(s => s.trim()).filter((x): x is T => set.has(x))
}

type CaseRecognitionFilter = { levels?: DeclLevel[]; cases?: DeclCase[] }
const caseRecognitionPool = createPool<CaseRecognitionEntry, CaseRecognitionFilter>(CASE_RECOGNITION_ENTRIES, {
  levels: e => e.level,
  cases: e => e.case,
} satisfies FieldMatchers<CaseRecognitionEntry, CaseRecognitionFilter>)

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const levels = csv<DeclLevel>(route.query.levels, DECL_LEVELS)
  const cases = csv<DeclCase>(route.query.cases, DECL_CASES)
  try {
    const deck = caseRecognitionPool.sample(count, { levels, cases })
    if (deck.length === 0) {
      error.value = 'No sentences match the selected filters.'
    } else {
      quiz = useCaseRecognitionQuiz(deck)
      ready.value = true
      startedAtMs.value = Date.now()
      nextTick(() => cardRef.value?.focus())
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
})

const current = computed(() => (ready.value, quiz?.current.value ?? null))
const finished = computed(() => (ready.value, quiz?.finished.value ?? false))
const questionIndex = computed(() => (ready.value, quiz?.currentIndex.value ?? 0))
const total = computed(() => (ready.value, quiz?.total.value ?? 0))
const questions = computed(() => (ready.value, quiz?.questions.value ?? []))

const submitted = computed(() => current.value?.picked !== null && current.value?.picked !== undefined)

function splitSentence(entry: CaseRecognitionEntry): { before: string; phrase: string; after: string } {
  const idx = entry.sentence.indexOf(entry.phrase)
  if (idx < 0) return { before: entry.sentence, phrase: '', after: '' }
  return {
    before: entry.sentence.slice(0, idx),
    phrase: entry.phrase,
    after: entry.sentence.slice(idx + entry.phrase.length)
  }
}

const parts = computed(() => {
  const q = current.value
  return q ? splitSentence(q.entry) : null
})

function pick(c: DeclCase) {
  if (!quiz || submitted.value) return
  quiz.pick(c)
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz) return
  quiz.advance()
  if (!quiz.finished.value) {
    nextTick(() => cardRef.value?.focus())
  }
}

function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  if (finished.value || !current.value) return
  // Enter advances after submit.
  if (e.key === 'Enter') {
    if (submitted.value) {
      e.preventDefault()
      next()
    }
    return
  }
  if (submitted.value) return
  const idx = e.key.charCodeAt(0) - '1'.charCodeAt(0)
  if (idx < 0 || idx >= DECL_CASES.length) return
  e.preventDefault()
  pick(DECL_CASES[idx])
}

function restart() { router.push({ name: 'declension-cr' }) }
function home() { router.push({ name: 'declension' }) }

// Save history once when finished.
watch(finished, (now) => {
  if (!now || historySaved.value || !quiz) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'decl-case-recognition',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.total.value,
    correct: quiz.score.value,
    meta: {
      declCRLevels: csv<DeclLevel>(route.query.levels, DECL_LEVELS),
      declCRCases: csv<DeclCase>(route.query.cases, DECL_CASES)
    }
  })
})

// Result-page pagination over the recap list.
const pagination = usePagination(() => questions.value, 10, 'decl-cr-result')
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger">
      <span class="alert-label">Error</span>{{ error }}
    </div>
    <button class="btn btn-ghost" @click="restart">← Back to setup</button>
  </div>

  <div v-else-if="finished && quiz" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Kasus erkennen</div>
        <div class="result-score">
          {{ quiz.score.value }}<span class="denom"> / {{ quiz.total.value }}</span>
        </div>
        <p class="section-subtitle">
          Review every sentence and its case below — the rationale is the footnote on each row.
        </p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="home">← Declension</button>
        <button class="btn btn-accent" type="button" @click="restart">
          Start another <span aria-hidden="true">→</span>
        </button>
      </div>
    </header>

    <Pagination :pagination="pagination" label="questions" :hide-page-size-below="25" />

    <div class="cr-result-list">
      <div
        v-for="(q, i) in pagination.slice.value"
        :key="i"
        class="cr-result-card"
        :class="q.isCorrect ? 'is-correct' : 'is-wrong'"
      >
        <div class="cr-result-num"># {{ String(pagination.start.value + i + 1).padStart(2, '0') }}</div>
        <div class="cr-result-body">
          <div class="cr-result-sentence">
            <template v-if="splitSentence(q.entry).phrase">
              {{ splitSentence(q.entry).before }}<mark class="cr-phrase">{{ splitSentence(q.entry).phrase }}</mark>{{ splitSentence(q.entry).after }}
            </template>
            <template v-else>
              {{ q.entry.sentence }}
            </template>
          </div>
          <div class="cr-result-gloss">{{ q.entry.gloss }}</div>
          <div class="cr-result-answers">
            <span class="cr-answer-label">your pick</span>
            <span
              v-if="q.picked"
              class="vr-stamp"
              :class="q.isCorrect ? 'vr-stamp-right' : 'vr-stamp-wrong'"
            >{{ CASE_DE[q.picked] }}</span>
            <span v-else class="vr-stamp vr-stamp-empty">—</span>
            <template v-if="!q.isCorrect">
              <span class="cr-answer-sep">·</span>
              <span class="cr-answer-label">expected</span>
              <span class="vr-stamp vr-stamp-right">{{ CASE_DE[q.entry.case] }}</span>
            </template>
          </div>
          <div class="cr-result-rationale">{{ q.entry.rationale }}</div>
        </div>
        <div class="cr-result-medallion">
          <span v-if="q.isCorrect" class="cr-medal cr-medal-ok">✓</span>
          <span v-else class="cr-medal cr-medal-bad">✗</span>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="current && parts && quiz" class="page">
    <div class="cr-card" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Kapitel V · Kasus erkennen · Frage {{ questionIndex + 1 }} / {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="home">End</button>
      </div>

      <div class="cr-prompt">
        <span class="cr-sentence">{{ parts.before }}<mark class="cr-phrase">{{ parts.phrase }}</mark>{{ parts.after }}</span>
        <div class="cr-gloss">&rarr; &ldquo;{{ current.entry.gloss }}&rdquo;</div>
      </div>

      <div class="cr-picker">
        <button
          v-for="(c, ci) in DECL_CASES"
          :key="c"
          type="button"
          class="cr-btn"
          :class="{
            selected: current.picked === c,
            correct: submitted && current.entry.case === c,
            wrong: submitted && current.picked === c && current.entry.case !== c,
            disabled: submitted
          }"
          :disabled="submitted"
          @click="pick(c)"
        >
          <span class="cr-btn-key">{{ ci + 1 }}</span>
          <span class="cr-btn-label">{{ CASE_SHORT[c] }}</span>
        </button>
      </div>

      <div v-if="submitted" class="cr-feedback">
        <div class="cr-feedback-mark" :class="current.isCorrect ? 'cr-ok' : 'cr-bad'">
          <template v-if="current.isCorrect">
            ✓ Richtig — {{ CASE_DE[current.entry.case] }}.
          </template>
          <template v-else>
            ✗ Falsch — die richtige Antwort ist {{ CASE_DE[current.entry.case] }}.
          </template>
        </div>
        <div class="cr-feedback-rationale">{{ current.entry.rationale }}</div>
      </div>

      <div class="cr-actions">
        <span class="micro-mark cr-hint">
          <template v-if="!submitted">Press <span class="kbd">1</span>–<span class="kbd">4</span> to pick</template>
          <template v-else>Press <span class="kbd">Enter</span> to {{ questionIndex + 1 === total ? 'finish' : 'continue' }}</template>
        </span>
        <button
          v-if="submitted"
          ref="nextBtnRef"
          type="button"
          class="btn btn-accent"
          @click="next"
        >{{ questionIndex + 1 === total ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

/* ── Question card ─────────────────────────────────────── */
.cr-card {
  max-width: 720px;
  margin: 0 auto;
  outline: none;
}
.cr-card:focus-visible { outline: 1px dotted var(--rule); outline-offset: 8px; }

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

.cr-prompt {
  text-align: center;
  padding: 24px 0 16px;
}
.cr-sentence {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 36px;
  line-height: 1.3;
  color: var(--ink);
  letter-spacing: -0.005em;
}
.cr-phrase {
  background: var(--accent-wash);
  color: var(--accent);
  padding: 2px 8px;
  border-radius: 2px;
  font-weight: 600;
}
.cr-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 17px;
  color: var(--ink-soft);
  margin-top: 16px;
}

@media (max-width: 720px) {
  .cr-sentence { font-size: 24px; }
  .cr-gloss { font-size: 15px; }
}

/* ── Case picker ───────────────────────────────────────── */
.cr-picker {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin: 36px 0 8px;
}
.cr-btn {
  background: transparent;
  border: 1px solid var(--hairline);
  border-radius: 2px;
  padding: 12px 22px 12px 14px;
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-soft);
  cursor: pointer;
  transition: all .15s;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 96px;
  justify-content: center;
}
.cr-btn:hover:not(:disabled) {
  border-color: var(--ink-soft);
  color: var(--ink);
}
.cr-btn.selected {
  background: var(--accent-tint);
  border-color: var(--accent);
  color: var(--accent);
}
.cr-btn.correct {
  background: var(--sage-tint);
  border-color: var(--sage);
  color: var(--sage);
}
.cr-btn.wrong {
  background: var(--clay-tint);
  border-color: var(--clay);
  color: var(--clay);
}
.cr-btn.disabled { cursor: default; }

.cr-btn-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0;
  color: var(--mute);
  border: 1px solid var(--hairline);
  border-radius: 2px;
  background: var(--paper);
}
.cr-btn.selected .cr-btn-key { border-color: var(--accent); color: var(--accent); }
.cr-btn.correct .cr-btn-key { border-color: var(--sage); color: var(--sage); }
.cr-btn.wrong .cr-btn-key { border-color: var(--clay); color: var(--clay); }

/* ── Feedback line ─────────────────────────────────────── */
.cr-feedback {
  margin-top: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cr-feedback-mark {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
}
.cr-ok { color: var(--success); }
.cr-bad { color: var(--danger); }
.cr-feedback-rationale {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 14px;
  color: var(--mute);
}

.cr-actions {
  margin-top: 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.cr-hint { color: var(--mute); }

/* ── Result list ───────────────────────────────────────── */
.cr-result-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
}
.cr-result-card {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  gap: 18px;
  align-items: start;
  padding: 18px 20px;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-card);
}
.cr-result-card.is-correct { border-left: 3px solid var(--success); }
.cr-result-card.is-wrong   { border-left: 3px solid var(--danger); }

.cr-result-num {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--mute);
  padding-top: 4px;
}
.cr-result-body { display: flex; flex-direction: column; gap: 8px; }
.cr-result-sentence {
  font-family: var(--font-display);
  font-size: 18px;
  line-height: 1.3;
}
.cr-result-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--ink-soft);
}
.cr-result-answers {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.cr-answer-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mute);
}
.cr-answer-sep { color: var(--mute); }
.cr-result-rationale {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--mute);
  margin-top: 4px;
}
.cr-result-medallion { padding-top: 4px; }
.cr-medal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
}
.cr-medal-ok { background: var(--success-tint); color: var(--success); }
.cr-medal-bad { background: var(--danger-tint); color: var(--danger); }

@media (max-width: 720px) {
  .cr-result-card { grid-template-columns: 1fr; gap: 10px; }
  .cr-result-num { padding-top: 0; }
  .cr-result-medallion { justify-self: start; }
  .cr-picker { gap: 6px; }
  .cr-btn { min-width: 72px; padding: 10px 14px 10px 10px; }
}
</style>
