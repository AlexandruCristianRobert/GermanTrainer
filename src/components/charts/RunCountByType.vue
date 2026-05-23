<script setup lang="ts">
import { computed } from 'vue'
import type { QuizHistoryEntry, QuizHistoryType } from '../../composables/useQuizHistory'
import { QUIZ_TYPE_LABEL, QUIZ_TYPE_DE } from './quiz-type-labels'

const props = defineProps<{ items: QuizHistoryEntry[] }>()

interface Row {
  type: QuizHistoryType
  runs: number
  correct: number
  total: number
  pct: number
  widthPct: number
}

const rows = computed<Row[]>(() => {
  const byType = new Map<QuizHistoryType, { runs: number; correct: number; total: number }>()
  for (const it of props.items) {
    const cur = byType.get(it.type) ?? { runs: 0, correct: 0, total: 0 }
    cur.runs += 1
    cur.correct += it.correct ?? 0
    cur.total += it.count ?? 0
    byType.set(it.type, cur)
  }
  const arr: Row[] = []
  for (const [type, stats] of byType.entries()) {
    arr.push({
      type,
      runs: stats.runs,
      correct: stats.correct,
      total: stats.total,
      pct: stats.total > 0 ? Math.round((100 * stats.correct) / stats.total) : 0,
      widthPct: 0
    })
  }
  arr.sort((a, b) => b.runs - a.runs)
  const maxRuns = Math.max(1, ...arr.map(r => r.runs))
  for (const r of arr) r.widthPct = (r.runs / maxRuns) * 100
  return arr
})
</script>

<template>
  <div v-if="rows.length === 0" class="chart-empty">
    <p>No quizzes yet.</p>
  </div>
  <div v-else class="type-breakdown">
    <div v-for="r in rows" :key="r.type" class="type-breakdown-row">
      <div>
        <div class="type-breakdown-label">{{ QUIZ_TYPE_LABEL[r.type] }}</div>
        <div class="type-breakdown-label-de">{{ QUIZ_TYPE_DE[r.type] }}</div>
      </div>
      <div class="type-breakdown-bar-wrap">
        <div class="type-breakdown-bar" :style="{ width: r.widthPct + '%' }" />
        <span class="type-breakdown-num">
          <strong>{{ r.runs }}</strong>
          <span class="type-breakdown-tail">
            {{ r.runs === 1 ? 'run' : 'runs' }} · {{ r.pct }}%
          </span>
        </span>
      </div>
    </div>
  </div>
</template>
