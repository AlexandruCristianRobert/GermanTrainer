<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from './ChartCard.vue'
import EChart from '../EChart.vue'
import type { StatsBundle } from '../../composables/useQuizStats'
import { QUIZ_TYPES_ORDER, QUIZ_TYPE_LABEL } from './quiz-type-labels'
import type { QuizHistoryType } from '../../composables/useQuizHistory'

const props = defineProps<{ stats: StatsBundle }>()

const hasData = computed(() => props.stats.countVsAccuracy.length > 0)

const series = computed(() =>
  QUIZ_TYPES_ORDER.map((t: QuizHistoryType) => ({
    name: QUIZ_TYPE_LABEL[t],
    type: 'scatter',
    symbolSize: 11,
    data: props.stats.countVsAccuracy
      .filter(p => p.type === t)
      .map(p => [p.count, +(p.accuracy * 100).toFixed(1), p.finishedAt])
  })).filter(s => s.data.length > 0)
)

const option = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: (p: { seriesName: string; value: [number, number, string] }) => {
      const [count, acc, when] = p.value
      const d = new Date(when)
      return `<div style="font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); margin-bottom: 4px;">${p.seriesName}</div><strong>${count}</strong> questions · <strong>${acc}%</strong><br><span style="color: var(--mute); font-family: var(--font-mono); font-size: 11px;">${d.toLocaleDateString()}</span>`
    }
  },
  legend: { bottom: 0, type: 'scroll' },
  grid: { left: 36, right: 16, top: 16, bottom: 56, containLabel: true },
  xAxis: {
    type: 'value',
    name: 'Questions',
    nameLocation: 'middle',
    nameGap: 28,
    minInterval: 1
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 100,
    axisLabel: { formatter: '{value}%' },
    name: 'Accuracy',
    nameLocation: 'middle',
    nameGap: 40
  },
  series: series.value
}))
</script>

<template>
  <ChartCard
    mark="Längen"
    title="Quiz size vs accuracy"
    subtitle="Do shorter sets score higher? Each point is one run."
  >
    <div v-if="!hasData" class="chart-empty">No runs yet.</div>
    <EChart v-else :option="option" height="300px" aria-label="Quiz size vs accuracy" />
  </ChartCard>
</template>
