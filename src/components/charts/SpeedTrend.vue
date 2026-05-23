<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from './ChartCard.vue'
import EChart from '../EChart.vue'
import type { StatsBundle } from '../../composables/useQuizStats'

const props = defineProps<{ stats: StatsBundle }>()

const option = computed(() => {
  const pts = props.stats.speedOverTime
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v: number) => `${(v / 1000).toFixed(1)}s / question`
    },
    grid: { left: 40, right: 16, top: 16, bottom: 28, containLabel: true },
    xAxis: { type: 'time', boundaryGap: false },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: {
        formatter: (v: number) => `${(v / 1000).toFixed(0)}s`
      }
    },
    series: [
      {
        name: 'Speed',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        data: pts.map(p => [p.finishedAt, p.msPerQuestion]),
        areaStyle: { opacity: 0.18 },
        lineStyle: { width: 1.6 }
      }
    ]
  }
})

const tooSparse = computed(() => props.stats.speedOverTime.length < 2)
</script>

<template>
  <ChartCard
    mark="Tempo"
    title="Speed over time"
    subtitle="Average milliseconds per question across runs."
  >
    <div v-if="tooSparse" class="chart-empty">
      Need at least two runs to draw a trend.
    </div>
    <EChart v-else :option="option" height="240px" aria-label="Speed over time" />
  </ChartCard>
</template>
