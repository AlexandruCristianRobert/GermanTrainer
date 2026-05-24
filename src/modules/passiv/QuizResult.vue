<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { saveQuizRun } from '../../composables/useQuizHistory'
import {
  TRANSFORMATION_LABELS,
  type PassivDifficulty,
  type PassivJudgeResult,
  type PassivQuestion,
  type TransformationType
} from '../../data/passiv'

interface ResultEntry {
  entry: PassivQuestion
  userInput: string
  judgement: PassivJudgeResult | null
}

interface StashedResult {
  questions: ResultEntry[]
  correct: number
  total: number
  difficulty: PassivDifficulty
  focusTypes: TransformationType[]
  perType: Record<string, { correct: number; total: number }>
  startedAt: number
  finishedAt: number
}

const router = useRouter()
const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<StashedResult | null>(null)
const historySaved = ref(false)

onMounted(() => {
  try {
    const raw = sessionStorage.getItem('gt:lastPassivResult')
    if (!raw) {
      error.value = 'No result data — start a session from setup.'
      return
    }
    data.value = JSON.parse(raw) as StashedResult
    if (!historySaved.value && data.value) {
      historySaved.value = true
      saveQuizRun({
        type: 'passiv-transform',
        startedAt: new Date(data.value.startedAt).toISOString(),
        finishedAt: new Date(data.value.finishedAt).toISOString(),
        durationMs: data.value.finishedAt - data.value.startedAt,
        count: data.value.total,
        correct: data.value.correct,
        meta: {
          passivDifficulty: data.value.difficulty,
          passivFocusedTypes: data.value.focusTypes,
          passivPerTypeCorrect: data.value.perType
        }
      })
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load result.'
  } finally {
    loading.value = false
  }
})

const partial = computed(() =>
  data.value?.questions.filter(q => q.judgement?.verdict === 'partially_correct').length ?? 0
)
const incorrect = computed(() =>
  data.value?.questions.filter(q => q.judgement?.verdict === 'incorrect').length ?? 0
)
const pct = computed(() => {
  if (!data.value || data.value.total === 0) return 0
  return Math.round((data.value.correct / data.value.total) * 100)
})

const perTypeRows = computed(() => {
  if (!data.value) return []
  return Object.entries(data.value.perType).map(([type, c]) => ({
    type: type as TransformationType,
    label: TRANSFORMATION_LABELS[type as TransformationType] ?? type,
    correct: c.correct,
    total: c.total
  }))
})

function backHome() { router.push({ name: 'passiv' }) }
function newRun() { router.push({ name: 'passiv-quiz' }) }
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>
  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="backHome">← Back</button>
  </div>
  <div v-else-if="data" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Passiv</div>
        <div class="result-score">{{ data.correct }}<span class="denom"> / {{ data.total }}</span></div>
        <p class="section-subtitle">
          {{ data.total }} active-to-passive transformations · difficulty {{ data.difficulty }}.
        </p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="backHome">Home</button>
        <button class="btn btn-accent" type="button" @click="newRun">Start another session <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="verb-result-summary">
      <div class="vrs-cell is-correct">
        <div class="vrs-num">{{ data.correct }}</div>
        <div class="vrs-label">Richtig · correct</div>
      </div>
      <div class="vrs-cell is-partial">
        <div class="vrs-num">{{ partial }}</div>
        <div class="vrs-label">Teilweise · partial</div>
      </div>
      <div class="vrs-cell is-wrong">
        <div class="vrs-num">{{ incorrect }}</div>
        <div class="vrs-label">Falsch · missed</div>
      </div>
      <div class="vrs-cell">
        <div class="vrs-num">{{ pct }}<span class="vrs-pct-suffix">%</span></div>
        <div class="vrs-label">Quote · score</div>
      </div>
    </div>

    <section class="per-type-section">
      <h3 class="per-type-title">Per transformation type</h3>
      <ul class="per-type-list">
        <li v-for="row in perTypeRows" :key="row.type">
          <span class="ptl-label">{{ row.label }}</span>
          <span class="ptl-count">{{ row.correct }} / {{ row.total }}</span>
        </li>
      </ul>
    </section>

    <div class="verb-result-list">
      <div v-for="(q, i) in data.questions" :key="i"
        class="verb-result-card"
        :class="q.judgement?.verdict === 'correct' ? 'is-correct' : q.judgement?.verdict === 'partially_correct' ? 'is-partial' : 'is-wrong'">
        <div class="verb-result-num"># {{ String(i + 1).padStart(2, '0') }}</div>
        <div class="verb-result-prompt">
          <div class="vrp-german">{{ q.entry.active }}</div>
          <div class="passiv-result-target">Target: {{ TRANSFORMATION_LABELS[q.entry.target] }}</div>
          <div class="passiv-result-ref">{{ q.entry.referenceAnswer }}</div>
        </div>
        <div class="verb-result-answers">
          <div class="verb-result-line">
            <span class="vrl-label">Du</span>
            <span class="vrl-value">
              <span class="vr-stamp" :class="q.judgement?.verdict === 'correct' ? 'vr-stamp-right' : 'vr-stamp-wrong'">{{ q.userInput || '—' }}</span>
            </span>
          </div>
          <div v-if="q.judgement" class="passiv-result-feedback">{{ q.judgement.feedback }}</div>
        </div>
        <div class="verb-result-mark">{{ q.judgement?.verdict === 'correct' ? '✓' : q.judgement?.verdict === 'partially_correct' ? '~' : '✗' }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.vrs-pct-suffix { font-size: 18px; color: var(--mute); margin-left: 2px; }
.vrs-cell.is-partial .vrs-num { color: var(--warn, #b58800); }
.per-type-section { margin: 24px 0; }
.per-type-title { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mute); margin-bottom: 12px; }
.per-type-list { list-style: none; padding: 0; margin: 0; }
.per-type-list li { display: flex; align-items: baseline; gap: 16px; padding: 6px 0; border-bottom: 1px solid var(--hairline); font-size: 14px; }
.ptl-label { font-family: var(--font-display); }
.ptl-count { margin-left: auto; font-family: var(--font-mono); font-size: 12px; color: var(--mute); font-variant-numeric: tabular-nums; }
.passiv-result-target { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); margin-top: 4px; }
.passiv-result-ref { font-family: var(--font-display); font-style: italic; font-size: 14px; color: var(--ink-soft); margin-top: 4px; }
.passiv-result-feedback { margin-top: 6px; font-size: 13px; line-height: 1.5; color: var(--ink-soft); }
</style>
