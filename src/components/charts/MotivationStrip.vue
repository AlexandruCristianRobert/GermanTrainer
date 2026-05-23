<script setup lang="ts">
import { computed } from 'vue'
import type { StatsBundle } from '../../composables/useQuizStats'

const props = defineProps<{ stats: StatsBundle }>()

function fmtDuration(ms: number): { num: string; unit: string } {
  if (ms <= 0) return { num: '0', unit: 'min' }
  const totalMin = Math.round(ms / 60_000)
  if (totalMin < 60) return { num: String(totalMin), unit: 'min' }
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (m === 0) return { num: String(h), unit: 'h' }
  return { num: `${h}h ${m}`, unit: 'min' }
}

const totalTime = computed(() => fmtDuration(props.stats.totalDurationMs))

const streakFoot = computed(() => {
  const since = props.stats.daysSinceLastRun
  if (props.stats.currentStreakDays === 0) {
    if (since === null) return 'no quizzes yet'
    if (since === 1) return 'broke yesterday'
    return `${since} days ago`
  }
  if (props.stats.currentStreakDays === 1) return 'starting today'
  return 'consecutive days'
})

const longestFoot = computed(() => {
  if (props.stats.longestStreakDays === 0) return '—'
  if (props.stats.longestStreakDays === props.stats.currentStreakDays) {
    return 'and counting'
  }
  return 'personal best'
})

const daysActiveFoot = computed(() => {
  const a = props.stats.daysActive
  if (a === 0) return '—'
  if (a === 1) return 'one day in the books'
  return `over ${a} unique days`
})

const bestDayFoot = computed(() => {
  if (props.stats.bestDayCount === 0) return '—'
  if (props.stats.bestDayCount === 1) return 'one a day, steady'
  return 'quizzes in a single day'
})
</script>

<template>
  <div class="stat-card-row motivation-strip">
    <div class="stat-card">
      <div>
        <span class="stat-card-num">{{ stats.currentStreakDays }}</span>
        <span class="stat-card-suffix">d</span>
      </div>
      <div class="stat-card-label">Current streak</div>
      <div class="stat-card-foot">{{ streakFoot }}</div>
    </div>

    <div class="stat-card">
      <div>
        <span class="stat-card-num">{{ stats.longestStreakDays }}</span>
        <span class="stat-card-suffix">d</span>
      </div>
      <div class="stat-card-label">Longest streak</div>
      <div class="stat-card-foot">{{ longestFoot }}</div>
    </div>

    <div class="stat-card">
      <div>
        <span class="stat-card-num">{{ stats.daysActive }}</span>
      </div>
      <div class="stat-card-label">Days active</div>
      <div class="stat-card-foot">{{ daysActiveFoot }}</div>
    </div>

    <div class="stat-card">
      <div>
        <span class="stat-card-num">{{ totalTime.num }}</span>
        <span class="stat-card-suffix">{{ totalTime.unit }}</span>
      </div>
      <div class="stat-card-label">Time studied</div>
      <div class="stat-card-foot">across all sessions</div>
    </div>

    <div class="stat-card">
      <div>
        <span class="stat-card-num">{{ stats.bestDayCount }}</span>
      </div>
      <div class="stat-card-label">Best day</div>
      <div class="stat-card-foot">{{ bestDayFoot }}</div>
    </div>
  </div>
</template>
