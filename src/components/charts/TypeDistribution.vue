<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from './ChartCard.vue'
import EChart from '../EChart.vue'
import type { StatsBundle } from '../../composables/useQuizStats'
import { QUIZ_TYPES_ORDER, QUIZ_TYPE_LABEL } from './quiz-type-labels'

const props = defineProps<{ stats: StatsBundle }>()

const data = computed(() =>
  QUIZ_TYPES_ORDER
    .filter(t => props.stats.runsByType[t] > 0)
    .map(t => ({ name: QUIZ_TYPE_LABEL[t], value: props.stats.runsByType[t] }))
)

const option = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}<br><strong>{c}</strong> runs ({d}%)' },
  legend: { bottom: 0, type: 'scroll' },
  series: [
    {
      name: 'Runs by type',
      type: 'pie',
      radius: ['55%', '80%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: 'transparent', borderWidth: 1 },
      label: { show: false },
      labelLine: { show: false },
      data: data.value
    }
  ]
}))
</script>

<template>
  <ChartCard
    mark="Verteilung"
    title="Runs by type"
    subtitle="How your time is split across the five quiz modes."
  >
    <div v-if="data.length === 0" class="chart-empty">No runs yet.</div>
    <EChart v-else :option="option" height="280px" aria-label="Runs by type" />
  </ChartCard>
</template>
