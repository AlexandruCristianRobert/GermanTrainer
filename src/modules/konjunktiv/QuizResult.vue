<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { saveQuizRun } from '../../composables/useQuizHistory'
import type { KiDifficulty, KiJudgeResult, KiQuestion, KiTopic } from '../../data/konjunktiv'

interface ResultEntry {
  entry: KiQuestion
  userInput: string
  judgement: KiJudgeResult | null
}

interface StashedResult {
  questions: ResultEntry[]
  correct: number
  total: number
  difficulty: KiDifficulty
  topics: KiTopic[]
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
    const raw = sessionStorage.getItem('gt:lastKonjunktivResult')
    if (!raw) {
      error.value = 'No result data — start a session from setup.'
      return
    }
    data.value = JSON.parse(raw) as StashedResult
    if (!historySaved.value && data.value) {
      historySaved.value = true
      saveQuizRun({
        type: 'konjunktiv-rewrite',
        startedAt: new Date(data.value.startedAt).toISOString(),
        finishedAt: new Date(data.value.finishedAt).toISOString(),
        durationMs: data.value.finishedAt - data.value.startedAt,
        count: data.value.total,
        correct: data.value.correct,
        meta: {
          kiDifficulty: data.value.difficulty,
          kiTopics: data.value.topics
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

function backHome() { router.push({ name: 'konjunktiv' }) }
function newRun() { router.push({ name: 'konjunktiv-quiz' }) }
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
        <div class="breadcrumb">Auswertung · Konjunktiv I</div>
        <div class="result-score">{{ data.correct }}<span class="denom"> / {{ data.total }}</span></div>
        <p class="section-subtitle">
          {{ data.total }} quote rewrites · difficulty {{ data.difficulty }}.
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

    <div class="verb-result-list">
      <div v-for="(q, i) in data.questions" :key="i"
        class="verb-result-card"
        :class="q.judgement?.verdict === 'correct' ? 'is-correct' : q.judgement?.verdict === 'partially_correct' ? 'is-partial' : 'is-wrong'">
        <div class="verb-result-num"># {{ String(i + 1).padStart(2, '0') }}</div>
        <div class="verb-result-prompt">
          <div class="vrp-german">{{ q.entry.source }}</div>
          <div class="ki-result-rewrite">{{ q.entry.referenceAnswer }}</div>
        </div>
        <div class="verb-result-answers">
          <div class="verb-result-line">
            <span class="vrl-label">Du</span>
            <span class="vrl-value">
              <span class="vr-stamp" :class="q.judgement?.verdict === 'correct' ? 'vr-stamp-right' : 'vr-stamp-wrong'">{{ q.userInput || '—' }}</span>
            </span>
          </div>
          <div v-if="q.judgement" class="ki-result-feedback">{{ q.judgement.feedback }}</div>
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
.ki-result-rewrite { font-family: var(--font-display); font-style: italic; font-size: 14px; color: var(--ink-soft); margin-top: 4px; }
.ki-result-feedback { margin-top: 6px; font-size: 13px; line-height: 1.5; color: var(--ink-soft); }
</style>
