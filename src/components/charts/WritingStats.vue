<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from './ChartCard.vue'
import EChart from '../EChart.vue'
import type { QuizHistoryEntry } from '../../composables/useQuizHistory'
import { WRITING_TASK_LABEL, WRITING_TASK_TYPES, type WritingTaskType } from '../../data/writingPrompts'

const props = defineProps<{ items: QuizHistoryEntry[] }>()

const BANDS = ['A2', 'B1', 'B2', 'C1', 'C2'] as const
type Band = typeof BANDS[number]

interface TaskRow {
  key: WritingTaskType
  label: string
  total: number
  count: number
  avg: number
}

interface TrendPoint {
  finishedAt: string
  score: number
  task: string
}

const entries = computed(() => props.items.filter(it => it.type === 'writing-grade'))

const scores = computed(() =>
  entries.value
    .map(it => it.meta.totalScore)
    .filter((s): s is number => typeof s === 'number')
)

const wordCounts = computed(() =>
  entries.value
    .map(it => it.meta.wordCount)
    .filter((w): w is number => typeof w === 'number')
)

const avgScore = computed(() => {
  const s = scores.value
  if (s.length === 0) return 0
  return s.reduce((a, b) => a + b, 0) / s.length
})

const bestScore = computed(() => {
  const s = scores.value
  if (s.length === 0) return 0
  return Math.max(...s)
})

const avgWordCount = computed(() => {
  const w = wordCounts.value
  if (w.length === 0) return 0
  return w.reduce((a, b) => a + b, 0) / w.length
})

const bandCounts = computed(() => {
  const m = new Map<Band, number>()
  for (const b of BANDS) m.set(b, 0)
  for (const it of entries.value) {
    const b = it.meta.bandEstimate as Band | undefined
    if (b && m.has(b)) m.set(b, (m.get(b) ?? 0) + 1)
  }
  return BANDS.map(b => ({ band: b, count: m.get(b) ?? 0 }))
})

const taskRows = computed<TaskRow[]>(() => {
  const acc = new Map<WritingTaskType, { total: number; count: number }>()
  for (const t of WRITING_TASK_TYPES) acc.set(t, { total: 0, count: 0 })
  for (const it of entries.value) {
    const t = it.meta.taskType as WritingTaskType | undefined
    const s = it.meta.totalScore
    if (!t || typeof s !== 'number') continue
    const cur = acc.get(t)
    if (!cur) continue
    cur.total += s
    cur.count += 1
  }
  return WRITING_TASK_TYPES.map(t => {
    const c = acc.get(t)!
    return {
      key: t,
      label: WRITING_TASK_LABEL[t],
      total: c.total,
      count: c.count,
      avg: c.count > 0 ? c.total / c.count : 0
    }
  })
})

const trendPoints = computed<TrendPoint[]>(() => {
  return entries.value
    .filter(it => typeof it.meta.totalScore === 'number')
    .map(it => ({
      finishedAt: it.finishedAt,
      score: it.meta.totalScore as number,
      task: (it.meta.taskType as string) ?? 'unknown'
    }))
    .sort((a, b) => Date.parse(a.finishedAt) - Date.parse(b.finishedAt))
})

function scoreColor(score: number): string {
  if (score >= 60) return 'var(--sage)'
  if (score >= 40) return 'var(--ochre)'
  return 'var(--clay)'
}

const trendOption = computed(() => {
  const pts = trendPoints.value
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ axisValueLabel: string; value: [string, number]; dataIndex: number }>) => {
        const p = params[0]
        const v = typeof p.value[1] === 'number' ? Math.round(p.value[1]) : p.value[1]
        const tp = pts[p.dataIndex]
        const taskLabel = WRITING_TASK_LABEL[(tp?.task ?? '') as WritingTaskType] ?? tp?.task ?? ''
        const d = new Date(p.value[0]).toLocaleDateString()
        return `<div style="font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); margin-bottom: 4px;">${d}</div><strong>${v}</strong> / 100<br><span style="color: var(--mute); font-family: var(--font-mono); font-size: 11px;">${taskLabel}</span>`
      }
    },
    grid: { left: 36, right: 16, top: 12, bottom: 28, containLabel: true },
    xAxis: { type: 'time', boundaryGap: false },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { formatter: '{value}' }
    },
    series: [
      {
        name: 'Total score',
        type: 'line',
        symbol: 'circle',
        symbolSize: 8,
        smooth: false,
        showSymbol: true,
        data: pts.map(p => [p.finishedAt, p.score]),
        lineStyle: { width: 1.4 },
        itemStyle: {
          color: (param: { value: [string, number] }) => scoreColor(param.value[1])
        }
      }
    ]
  }
})

function fmtAvg(value: number): string {
  return value > 0 ? Math.round(value).toString() : '—'
}
</script>

<template>
  <ChartCard
    mark="Schreiben"
    title="Writing drafts graded"
    subtitle="Goethe + telc rubrics combined"
  >
    <div v-if="entries.length === 0" class="chart-empty">
      Submit a writing draft to see grading trends here.
    </div>
    <template v-else>
      <div class="ws-tiles">
        <div class="ws-tile">
          <div class="ws-tile-label">Drafts graded</div>
          <div class="ws-tile-num">{{ entries.length }}</div>
        </div>
        <div class="ws-tile">
          <div class="ws-tile-label">Avg total score</div>
          <div
            class="ws-tile-num"
            :style="{ color: scores.length > 0 ? scoreColor(avgScore) : 'var(--mute)' }"
          >{{ fmtAvg(avgScore) }}</div>
        </div>
        <div class="ws-tile">
          <div class="ws-tile-label">Best score</div>
          <div
            class="ws-tile-num"
            :style="{ color: scores.length > 0 ? scoreColor(bestScore) : 'var(--mute)' }"
          >{{ fmtAvg(bestScore) }}</div>
        </div>
        <div class="ws-tile">
          <div class="ws-tile-label">Avg word count</div>
          <div class="ws-tile-num">{{ fmtAvg(avgWordCount) }}</div>
        </div>
      </div>

      <div v-if="trendPoints.length >= 2" class="ws-section">
        <div class="ws-section-head">Score over time</div>
        <EChart :option="trendOption" height="180px" aria-label="Writing score trend" />
      </div>

      <div class="ws-section">
        <div class="ws-section-head">Band distribution</div>
        <div class="ws-bands">
          <span
            v-for="b in bandCounts"
            :key="b.band"
            class="ws-band-chip"
            :class="{ 'ws-band-chip-empty': b.count === 0 }"
          >
            <span class="ws-band-chip-name">{{ b.band }}</span>
            <span class="ws-band-chip-count">{{ b.count }}</span>
          </span>
        </div>
      </div>

      <div class="ws-section">
        <div class="ws-section-head">By task type</div>
        <div class="ws-bars">
          <div
            v-for="r in taskRows"
            :key="r.key"
            class="ws-bar-row"
          >
            <div class="ws-bar-label">{{ r.label }}</div>
            <div class="ws-bar-track">
              <div
                v-if="r.count > 0"
                class="ws-bar-fill"
                :style="{
                  width: Math.min(100, Math.round(r.avg)) + '%',
                  background: scoreColor(r.avg)
                }"
              />
            </div>
            <div class="ws-bar-num">
              <strong v-if="r.count > 0">{{ Math.round(r.avg) }}</strong>
              <span v-else class="ws-bar-dash">—</span>
              <span class="ws-bar-tail">
                {{ r.count }} {{ r.count === 1 ? 'draft' : 'drafts' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </ChartCard>
</template>

<style scoped>
.ws-tiles {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 22px;
}
.ws-tile {
  background: var(--paper);
  border: 1px solid var(--hairline);
  border-radius: 3px;
  padding: 12px 14px;
}
.ws-tile-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 6px;
}
.ws-tile-num {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 500;
  line-height: 1;
  color: var(--ink);
}

.ws-section {
  border-top: 1px solid var(--hairline);
  padding-top: 16px;
  margin-top: 16px;
}
.ws-section-head {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 12px;
}

.ws-bands {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.ws-band-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 12px;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  background: var(--paper);
}
.ws-band-chip-name {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--ink);
}
.ws-band-chip-count {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 500;
  color: var(--accent);
}
.ws-band-chip-empty .ws-band-chip-count {
  color: var(--mute);
}
.ws-band-chip-empty {
  opacity: 0.6;
}

.ws-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ws-bar-row {
  display: grid;
  grid-template-columns: minmax(160px, 220px) 1fr 120px;
  align-items: center;
  gap: 14px;
}
.ws-bar-label {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--ink);
}
.ws-bar-track {
  position: relative;
  height: 8px;
  background: var(--hairline);
  border-radius: 2px;
  overflow: hidden;
}
.ws-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 2px;
  transition: width 240ms ease-out;
}
.ws-bar-num {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-soft);
  text-align: right;
}
.ws-bar-num strong {
  color: var(--ink);
  margin-right: 6px;
  font-size: 13px;
}
.ws-bar-tail {
  color: var(--mute);
}
.ws-bar-dash {
  color: var(--mute);
  margin-right: 6px;
}

@media (max-width: 720px) {
  .ws-tiles {
    grid-template-columns: repeat(2, 1fr);
  }
  .ws-bar-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .ws-bar-num {
    text-align: left;
  }
}
</style>
