<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from './ChartCard.vue'
import EChart from '../EChart.vue'
import type { StatsBundle } from '../../composables/useQuizStats'

const props = defineProps<{ stats: StatsBundle }>()

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))

interface Cell { value: [number, number, number] }

const points = computed<Cell[]>(() => {
  const out: Cell[] = []
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      out.push({ value: [h, d, props.stats.dayHourMatrix[d][h]] })
    }
  }
  return out
})

const maxValue = computed(() => {
  let m = 0
  for (const row of props.stats.dayHourMatrix) {
    for (const v of row) if (v > m) m = v
  }
  return Math.max(1, m)
})

const hasData = computed(() => maxValue.value > 0)

const option = computed(() => ({
  tooltip: {
    position: 'top',
    formatter: (p: { value: [number, number, number] }) => {
      const [h, d, v] = p.value
      return `<div style="font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); margin-bottom: 4px;">${DAYS[d]} · ${String(h).padStart(2, '0')}:00</div><strong>${v}</strong> ${v === 1 ? 'run' : 'runs'}`
    }
  },
  grid: { left: 36, right: 16, top: 12, bottom: 32, containLabel: true },
  xAxis: {
    type: 'category',
    data: HOURS,
    splitArea: { show: true },
    axisTick: { show: false },
    axisLabel: { interval: 2, fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }
  },
  yAxis: {
    type: 'category',
    data: DAYS,
    splitArea: { show: true },
    axisTick: { show: false },
    axisLabel: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5 }
  },
  visualMap: {
    min: 0,
    max: maxValue.value,
    calculable: false,
    orient: 'horizontal',
    left: 'center',
    bottom: 0,
    inRange: {
      color: ['var(--paper-deep)', 'var(--accent-wash)', 'var(--accent-tint)', 'var(--accent)']
    },
    textStyle: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 10.5,
      color: 'var(--mute)'
    }
  },
  series: [
    {
      name: 'Runs',
      type: 'heatmap',
      data: points.value.map(p => p.value),
      label: { show: false },
      itemStyle: { borderColor: 'var(--paper)', borderWidth: 2 }
    }
  ]
}))
</script>

<template>
  <ChartCard
    mark="Rhythmus"
    title="When you study"
    subtitle="Day of the week × hour of the day — every quiz counted once."
  >
    <div v-if="!hasData" class="chart-empty">No runs yet.</div>
    <EChart v-else :option="option" height="280px" aria-label="Day and hour heatmap" />
  </ChartCard>
</template>
