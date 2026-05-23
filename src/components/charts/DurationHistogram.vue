<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from './ChartCard.vue'
import EChart from '../EChart.vue'
import type { StatsBundle } from '../../composables/useQuizStats'

const props = defineProps<{ stats: StatsBundle }>()

const hasData = computed(() => props.stats.durationBuckets.some(b => b.count > 0))

const option = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    valueFormatter: (v: number) => `${v} ${v === 1 ? 'run' : 'runs'}`
  },
  grid: { left: 36, right: 16, top: 16, bottom: 28, containLabel: true },
  xAxis: {
    type: 'category',
    data: props.stats.durationBuckets.map(b => b.label),
    axisTick: { show: false },
    axisLabel: { fontFamily: '"JetBrains Mono", monospace', fontSize: 11 }
  },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    {
      type: 'bar',
      data: props.stats.durationBuckets.map(b => b.count),
      barWidth: '54%',
      itemStyle: { color: 'var(--accent)', opacity: 0.85 }
    }
  ]
}))
</script>

<template>
  <ChartCard
    mark="Dauer"
    title="Session length distribution"
    subtitle="How long your typical quiz session lasts."
  >
    <div v-if="!hasData" class="chart-empty">No runs yet.</div>
    <EChart v-else :option="option" height="240px" aria-label="Session length distribution" />
  </ChartCard>
</template>
