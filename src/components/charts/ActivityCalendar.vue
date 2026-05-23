<script setup lang="ts">
import { computed } from 'vue'
import { CalendarHeatmap } from 'vue3-calendar-heatmap'
import 'vue3-calendar-heatmap/dist/style.css'
import ChartCard from './ChartCard.vue'
import type { StatsBundle } from '../../composables/useQuizStats'
import { useTheme } from '../../composables/useTheme'

const props = defineProps<{ stats: StatsBundle }>()

const { resolved } = useTheme()
const isDark = computed(() => resolved.value === 'dark')

const endDate = computed(() => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
})

// 5-stop scale from a soft paper hue up to the live accent.
// We don't read from CSS variables here because the calendar component
// expects hex strings — instead the wrapping component handles dark-mode
// via its darkMode prop and the rangeColor stops are picked to look right
// in both modes.
const rangeColor = computed<string[]>(() => {
  if (isDark.value) {
    return ['#1E1B14', '#2A3829', '#3F5538', '#5C7A52', '#8FAE82']
  }
  return ['#F1ECDE', '#D8DFCC', '#A8BD9C', '#7A9869', '#5C7A52']
})

const max = computed(() => {
  const m = props.stats.calendarHeatmap.reduce((acc, d) => Math.max(acc, d.count), 0)
  return Math.max(4, m) // ensure a sensible scale even with sparse data
})
</script>

<template>
  <ChartCard
    mark="Aktivität"
    title="Activity"
    subtitle="Daily quiz runs over the last year — one square per day."
  >
    <div v-if="stats.calendarHeatmap.length === 0" class="chart-empty">
      No activity yet. Run a quiz to start filling the calendar.
    </div>
    <div v-else class="activity-calendar">
      <CalendarHeatmap
        :values="stats.calendarHeatmap"
        :end-date="endDate"
        :max="max"
        :range-color="rangeColor"
        :round="1.5"
        :tooltip="true"
        tooltip-unit="runs"
        :dark-mode="isDark"
      />
    </div>
  </ChartCard>
</template>
