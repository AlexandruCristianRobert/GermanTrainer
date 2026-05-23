<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from './ChartCard.vue'
import EChart from '../EChart.vue'
import type { StatsBundle } from '../../composables/useQuizStats'

const props = defineProps<{ stats: StatsBundle }>()

const option = computed(() => {
  const pts = props.stats.cumulativeProgress
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ axisValueLabel: string; seriesName: string; value: [string, number] }>) => {
        const lines = params.map(p => `<span style="color: var(--ink-soft); font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase;">${p.seriesName}</span><br><strong>${p.value[1]}</strong>`)
        return `<div style="font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); margin-bottom: 4px;">${params[0].axisValueLabel}</div>${lines.join('<br>')}`
      }
    },
    legend: { data: ['Correct', 'Total'], bottom: 0 },
    grid: { left: 40, right: 16, top: 16, bottom: 48, containLabel: true },
    xAxis: { type: 'time', boundaryGap: false },
    yAxis: { type: 'value', min: 0 },
    series: [
      {
        name: 'Correct',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: pts.map(p => [p.finishedAt, p.cumCorrect]),
        areaStyle: { opacity: 0.22 },
        lineStyle: { width: 2 }
      },
      {
        name: 'Total',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: pts.map(p => [p.finishedAt, p.cumTotal]),
        lineStyle: { width: 1, type: 'dotted' }
      }
    ]
  }
})

const tooSparse = computed(() => props.stats.cumulativeProgress.length < 2)
</script>

<template>
  <ChartCard
    mark="Kumulativ"
    title="Cumulative progress"
    subtitle="Correct answers and questions answered across your entire history."
  >
    <div v-if="tooSparse" class="chart-empty">
      Need at least two runs to draw a trend.
    </div>
    <EChart v-else :option="option" height="260px" aria-label="Cumulative progress" />
  </ChartCard>
</template>
