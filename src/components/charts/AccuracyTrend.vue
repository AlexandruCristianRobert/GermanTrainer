<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from './ChartCard.vue'
import EChart from '../EChart.vue'
import type { StatsBundle } from '../../composables/useQuizStats'

const props = defineProps<{ stats: StatsBundle }>()

const option = computed(() => {
  const points = props.stats.accuracyOverTime
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ axisValueLabel: string; seriesName: string; value: [string, number] }>) => {
        const lines = params.map(p => {
          const v = typeof p.value[1] === 'number' ? Math.round(p.value[1]) : p.value[1]
          return `<span style="color: var(--ink-soft); font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase;">${p.seriesName}</span><br><strong>${v}%</strong>`
        })
        return `<div style="font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); margin-bottom: 4px;">${params[0].axisValueLabel}</div>${lines.join('<br>')}`
      }
    },
    legend: {
      data: ['Per run', '5-run rolling'],
      bottom: 0
    },
    grid: { left: 36, right: 16, top: 16, bottom: 48, containLabel: true },
    xAxis: {
      type: 'time',
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { formatter: '{value}%' }
    },
    series: [
      {
        name: 'Per run',
        type: 'line',
        symbol: 'circle',
        symbolSize: 6,
        smooth: false,
        showSymbol: true,
        data: points.map(p => [p.finishedAt, +(p.accuracy * 100).toFixed(1)]),
        lineStyle: { width: 1.2 },
        itemStyle: { opacity: 0.85 }
      },
      {
        name: '5-run rolling',
        type: 'line',
        symbol: 'none',
        smooth: true,
        lineStyle: { width: 2.4, type: 'dashed' },
        data: points.map(p => [p.finishedAt, +(p.rollingAvg * 100).toFixed(1)])
      }
    ]
  }
})

const tooSparse = computed(() => props.stats.accuracyOverTime.length < 2)
</script>

<template>
  <ChartCard
    mark="Genauigkeit"
    title="Accuracy over time"
    subtitle="Each point is one quiz; the dashed line is a 5-run rolling average."
  >
    <div v-if="tooSparse" class="chart-empty">
      Need at least two runs to draw a trend.
    </div>
    <EChart v-else :option="option" height="260px" aria-label="Accuracy over time" />
  </ChartCard>
</template>
