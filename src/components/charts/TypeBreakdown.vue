<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from './ChartCard.vue'
import EChart from '../EChart.vue'
import type { StatsBundle } from '../../composables/useQuizStats'
import { QUIZ_TYPES_ORDER, QUIZ_TYPE_LABEL } from './quiz-type-labels'

const props = defineProps<{ stats: StatsBundle }>()

const visibleTypes = computed(() =>
  QUIZ_TYPES_ORDER.filter(t => props.stats.accuracyByType[t].total > 0)
)

const correctData = computed(() => visibleTypes.value.map(t => props.stats.accuracyByType[t].correct))
const missedData = computed(() => visibleTypes.value.map(t => props.stats.accuracyByType[t].total - props.stats.accuracyByType[t].correct))
const labels = computed(() => visibleTypes.value.map(t => QUIZ_TYPE_LABEL[t]))

const sageish = 'var(--success)'
const clayish = 'var(--danger)'

const option = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' }
  },
  legend: { bottom: 0, data: ['Correct', 'Missed'] },
  grid: { left: 24, right: 24, top: 16, bottom: 44, containLabel: true },
  xAxis: { type: 'value' },
  yAxis: {
    type: 'category',
    data: labels.value,
    inverse: true,
    axisTick: { show: false },
    axisLabel: {
      fontFamily: '"Source Serif 4", serif',
      fontSize: 13
    }
  },
  series: [
    {
      name: 'Correct',
      type: 'bar',
      stack: 'total',
      data: correctData.value,
      itemStyle: { color: sageish },
      barWidth: '60%'
    },
    {
      name: 'Missed',
      type: 'bar',
      stack: 'total',
      data: missedData.value,
      itemStyle: { color: clayish, opacity: 0.6 },
      barWidth: '60%'
    }
  ]
}))
</script>

<template>
  <ChartCard
    mark="Bilanz"
    title="Correct vs missed"
    subtitle="Total correct and missed questions across every run per quiz type."
  >
    <div v-if="visibleTypes.length === 0" class="chart-empty">No graded runs yet.</div>
    <EChart
      v-else
      :option="option"
      :height="`${Math.max(180, visibleTypes.length * 56)}px`"
      aria-label="Correct vs missed by type"
    />
  </ChartCard>
</template>
