<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from './ChartCard.vue'
import type { QuizHistoryEntry } from '../../composables/useQuizHistory'

const props = defineProps<{ items: QuizHistoryEntry[] }>()

interface AttemptRow {
  id: number
  finishedAt: string
  dateLabel: string
  task1: number | null
  task2: number | null
  combined: number | null
  passes: boolean
}

const entries = computed(() =>
  props.items
    .filter(it => it.type === 'simulator-c1')
    .slice()
    .sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))
)

const attempts = computed(() => entries.value.length)

const passRate = computed(() => {
  if (entries.value.length === 0) return 0
  const passed = entries.value.filter(it => it.meta.passes === true).length
  return passed / entries.value.length
})

const combinedScores = computed(() =>
  entries.value
    .map(it => it.meta.combinedScore)
    .filter((s): s is number => typeof s === 'number')
)

const task1Scores = computed(() =>
  entries.value
    .map(it => it.meta.task1Score)
    .filter((s): s is number => typeof s === 'number')
)

const task2Scores = computed(() =>
  entries.value
    .map(it => it.meta.task2Score)
    .filter((s): s is number => typeof s === 'number')
)

function avg(list: number[]): number {
  if (list.length === 0) return 0
  return list.reduce((a, b) => a + b, 0) / list.length
}

const avgCombined = computed(() => avg(combinedScores.value))
const bestCombined = computed(() => combinedScores.value.length > 0 ? Math.max(...combinedScores.value) : 0)
const avgTask1 = computed(() => avg(task1Scores.value))
const avgTask2 = computed(() => avg(task2Scores.value))

const taskComparison = computed(() => {
  const t1 = avgTask1.value
  const t2 = avgTask2.value
  if (task1Scores.value.length === 0 || task2Scores.value.length === 0) return 'Need scores on both tasks to compare.'
  const diff = t1 - t2
  if (Math.abs(diff) < 2) return 'Tasks even — your output is balanced.'
  if (diff > 0) return `Task 1 stronger (+${Math.round(diff)} pts on average).`
  return `Task 2 stronger (+${Math.round(-diff)} pts on average).`
})

const lastFive = computed<AttemptRow[]>(() => {
  return entries.value.slice(0, 5).map(it => {
    const dt = new Date(it.finishedAt)
    const dateLabel = isNaN(dt.getTime())
      ? '—'
      : dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return {
      id: it.id,
      finishedAt: it.finishedAt,
      dateLabel,
      task1: typeof it.meta.task1Score === 'number' ? it.meta.task1Score : null,
      task2: typeof it.meta.task2Score === 'number' ? it.meta.task2Score : null,
      combined: typeof it.meta.combinedScore === 'number' ? it.meta.combinedScore : null,
      passes: it.meta.passes === true
    }
  })
})

function scoreColor(score: number): string {
  if (score >= 60) return 'var(--sage)'
  if (score >= 40) return 'var(--ochre)'
  return 'var(--clay)'
}

function fmtNum(value: number, count: number): string {
  if (count === 0) return '—'
  return Math.round(value).toString()
}

function fmtCell(value: number | null): string {
  return value === null ? '—' : Math.round(value).toString()
}
</script>

<template>
  <ChartCard
    mark="Goethe C1"
    title="Mock exam results"
    subtitle="75-min Schreiben simulator"
  >
    <div v-if="entries.length === 0" class="chart-empty">
      Finish a simulator session to see your mock exam stats.
    </div>
    <template v-else>
      <div class="sim-tiles">
        <div class="sim-tile">
          <div class="sim-tile-label">Attempts</div>
          <div class="sim-tile-num">{{ attempts }}</div>
        </div>
        <div class="sim-tile">
          <div class="sim-tile-label">Pass rate</div>
          <div
            class="sim-tile-num"
            :style="{ color: scoreColor(passRate * 100) }"
          >{{ Math.round(passRate * 100) }}%</div>
        </div>
        <div class="sim-tile">
          <div class="sim-tile-label">Avg combined</div>
          <div
            class="sim-tile-num"
            :style="{ color: combinedScores.length > 0 ? scoreColor(avgCombined) : 'var(--mute)' }"
          >{{ fmtNum(avgCombined, combinedScores.length) }}</div>
        </div>
        <div class="sim-tile">
          <div class="sim-tile-label">Best combined</div>
          <div
            class="sim-tile-num"
            :style="{ color: combinedScores.length > 0 ? scoreColor(bestCombined) : 'var(--mute)' }"
          >{{ fmtNum(bestCombined, combinedScores.length) }}</div>
        </div>
      </div>

      <div class="sim-section">
        <div class="sim-section-head">Task averages</div>
        <div class="sim-task-pair">
          <div class="sim-task-block">
            <div class="sim-task-label">Task 1 avg</div>
            <div
              class="sim-task-num"
              :style="{ color: task1Scores.length > 0 ? scoreColor(avgTask1) : 'var(--mute)' }"
            >{{ fmtNum(avgTask1, task1Scores.length) }}</div>
            <div class="sim-task-foot">
              {{ task1Scores.length }} {{ task1Scores.length === 1 ? 'attempt' : 'attempts' }}
            </div>
          </div>
          <div class="sim-task-divider" aria-hidden="true" />
          <div class="sim-task-block">
            <div class="sim-task-label">Task 2 avg</div>
            <div
              class="sim-task-num"
              :style="{ color: task2Scores.length > 0 ? scoreColor(avgTask2) : 'var(--mute)' }"
            >{{ fmtNum(avgTask2, task2Scores.length) }}</div>
            <div class="sim-task-foot">
              {{ task2Scores.length }} {{ task2Scores.length === 1 ? 'attempt' : 'attempts' }}
            </div>
          </div>
        </div>
        <p class="sim-caption">{{ taskComparison }}</p>
      </div>

      <div class="sim-section">
        <div class="sim-section-head">Last {{ lastFive.length }} attempts</div>
        <div class="sim-table" role="table">
          <div class="sim-row sim-row-head" role="row">
            <div class="sim-cell sim-cell-date" role="columnheader">Date</div>
            <div class="sim-cell sim-cell-num" role="columnheader">T1</div>
            <div class="sim-cell sim-cell-num" role="columnheader">T2</div>
            <div class="sim-cell sim-cell-num" role="columnheader">Combined</div>
            <div class="sim-cell sim-cell-status" role="columnheader">Result</div>
          </div>
          <div
            v-for="row in lastFive"
            :key="row.id"
            class="sim-row"
            role="row"
          >
            <div class="sim-cell sim-cell-date" role="cell">{{ row.dateLabel }}</div>
            <div class="sim-cell sim-cell-num" role="cell">{{ fmtCell(row.task1) }}</div>
            <div class="sim-cell sim-cell-num" role="cell">{{ fmtCell(row.task2) }}</div>
            <div class="sim-cell sim-cell-num" role="cell">
              <strong
                :style="{ color: row.combined !== null ? scoreColor(row.combined) : 'var(--mute)' }"
              >{{ fmtCell(row.combined) }}</strong>
            </div>
            <div class="sim-cell sim-cell-status" role="cell">
              <span
                class="sim-pill"
                :class="row.passes ? 'sim-pill-pass' : 'sim-pill-fail'"
              >{{ row.passes ? 'PASS' : 'FAIL' }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </ChartCard>
</template>

<style scoped>
.sim-tiles {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 22px;
}
.sim-tile {
  background: var(--paper);
  border: 1px solid var(--hairline);
  border-radius: 3px;
  padding: 12px 14px;
}
.sim-tile-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 6px;
}
.sim-tile-num {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 500;
  line-height: 1;
  color: var(--ink);
}

.sim-section {
  border-top: 1px solid var(--hairline);
  padding-top: 16px;
  margin-top: 16px;
}
.sim-section-head {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 14px;
}

.sim-task-pair {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: stretch;
  gap: 0;
  padding: 8px 0 4px;
}
.sim-task-block {
  text-align: center;
  padding: 8px 12px;
}
.sim-task-divider {
  width: 1px;
  background: var(--hairline);
  margin: 8px 0;
}
.sim-task-label {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 8px;
}
.sim-task-num {
  font-family: var(--font-display);
  font-size: 48px;
  font-weight: 500;
  line-height: 1;
  margin-bottom: 6px;
}
.sim-task-foot {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-soft);
}
.sim-caption {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--ink-soft);
  text-align: center;
  margin: 10px 0 0;
}

.sim-table {
  display: flex;
  flex-direction: column;
}
.sim-row {
  display: grid;
  grid-template-columns: 1fr 56px 56px 100px 80px;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px dotted var(--hairline);
}
.sim-row:last-child {
  border-bottom: none;
}
.sim-row-head {
  border-bottom: 1px solid var(--hairline);
  padding-bottom: 8px;
}
.sim-row-head .sim-cell {
  color: var(--mute);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
.sim-cell {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink);
}
.sim-cell-num {
  text-align: right;
}
.sim-cell-status {
  text-align: right;
}
.sim-pill {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  padding: 3px 8px;
  border-radius: 2px;
  border: 1px solid var(--hairline);
}
.sim-pill-pass {
  color: var(--sage);
  border-color: var(--sage);
  background: var(--sage-tint);
}
.sim-pill-fail {
  color: var(--clay);
  border-color: var(--clay);
  background: var(--clay-tint);
}

@media (max-width: 720px) {
  .sim-tiles {
    grid-template-columns: repeat(2, 1fr);
  }
  .sim-task-num {
    font-size: 38px;
  }
  .sim-row {
    grid-template-columns: 1fr 44px 44px 64px 64px;
    gap: 8px;
  }
}
</style>
