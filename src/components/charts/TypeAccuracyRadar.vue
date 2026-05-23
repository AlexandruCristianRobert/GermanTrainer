<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from './ChartCard.vue'
import EChart from '../EChart.vue'
import type { StatsBundle } from '../../composables/useQuizStats'
import { QUIZ_TYPES_ORDER, QUIZ_TYPE_LABEL } from './quiz-type-labels'

const props = defineProps<{ stats: StatsBundle }>()

const indicator = computed(() =>
  QUIZ_TYPES_ORDER.map(t => ({ name: QUIZ_TYPE_LABEL[t], max: 100 }))
)

const values = computed(() =>
  QUIZ_TYPES_ORDER.map(t => {
    const b = props.stats.accuracyByType[t]
    return b.total > 0 ? +(b.accuracy * 100).toFixed(1) : 0
  })
)

const hasData = computed(() =>
  QUIZ_TYPES_ORDER.some(t => props.stats.accuracyByType[t].total > 0)
)

const option = computed(() => ({
  tooltip: { trigger: 'item' },
  radar: {
    indicator: indicator.value,
    radius: '64%',
    splitNumber: 4,
    axisName: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 10.5,
      color: 'var(--ink-soft)'
    },
    splitArea: { areaStyle: { color: ['transparent', 'transparent'] } }
  },
  series: [
    {
      type: 'radar',
      data: [
        {
          value: values.value,
          name: 'Accuracy %',
          areaStyle: { opacity: 0.2 },
          lineStyle: { width: 1.8 },
          symbol: 'circle',
          symbolSize: 5
        }
      ]
    }
  ]
}))
</script>

<template>
  <ChartCard
    mark="Stärken"
    title="Accuracy by quiz type"
    subtitle="One spoke per mode — bigger area means stronger overall performance."
  >
    <div v-if="!hasData" class="chart-empty">No graded runs yet.</div>
    <EChart v-else :option="option" height="280px" aria-label="Accuracy by quiz type" />
  </ChartCard>
</template>
