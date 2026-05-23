<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from './ChartCard.vue'
import EChart from '../EChart.vue'
import type { BucketStat } from '../../composables/useQuizStats'

const props = defineProps<{
  title: string
  mark: string
  subtitle?: string
  data: Record<string, BucketStat>
  emptyMessage?: string
  /** When set, show the top N best + bottom N worst (skip duplicates). */
  topN?: number
}>()

interface Row {
  key: string
  accuracy: number
  total: number
  correct: number
}

const rows = computed<Row[]>(() => {
  const all: Row[] = Object.entries(props.data)
    .map(([key, b]) => ({ key, accuracy: b.accuracy, total: b.total, correct: b.correct }))
    .filter(r => r.total > 0)
    .sort((a, b) => b.accuracy - a.accuracy)
  if (props.topN && all.length > props.topN * 2) {
    const head = all.slice(0, props.topN)
    const tail = all.slice(-props.topN)
    return [...head, ...tail]
  }
  return all
})

function colorFor(accuracy: number): string {
  if (accuracy >= 0.8) return 'var(--success)'
  if (accuracy >= 0.5) return 'var(--ochre)'
  return 'var(--danger)'
}

const option = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params: Array<{ dataIndex: number; value: number; name: string }>) => {
      const p = params[0]
      const r = rows.value[p.dataIndex]
      return `<div style="font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); margin-bottom: 4px;">${r.key}</div><strong>${Math.round(p.value)}%</strong> · ${r.correct}/${r.total}`
    }
  },
  grid: { left: 24, right: 40, top: 16, bottom: 16, containLabel: true },
  xAxis: {
    type: 'value',
    min: 0,
    max: 100,
    axisLabel: { formatter: '{value}%' }
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: rows.value.map(r => r.key),
    axisTick: { show: false },
    axisLabel: { fontFamily: '"Source Serif 4", serif', fontSize: 13 }
  },
  series: [
    {
      type: 'bar',
      data: rows.value.map(r => ({
        value: +(r.accuracy * 100).toFixed(1),
        itemStyle: { color: colorFor(r.accuracy) }
      })),
      barWidth: '64%',
      label: {
        show: true,
        position: 'right',
        formatter: (p: { dataIndex: number }) => {
          const r = rows.value[p.dataIndex]
          return `${r.correct}/${r.total}`
        },
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 10.5,
        color: 'var(--mute)'
      }
    }
  ]
}))
</script>

<template>
  <ChartCard :mark="mark" :title="title" :subtitle="subtitle">
    <div v-if="rows.length === 0" class="chart-empty">
      {{ emptyMessage ?? 'No data yet for this breakdown.' }}
    </div>
    <EChart
      v-else
      :option="option"
      :height="`${Math.max(200, rows.length * 36 + 40)}px`"
      :aria-label="title"
    />
  </ChartCard>
</template>
