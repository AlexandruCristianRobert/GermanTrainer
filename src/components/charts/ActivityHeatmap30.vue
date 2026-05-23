<script setup lang="ts">
import { computed } from 'vue'
import type { QuizHistoryEntry } from '../../composables/useQuizHistory'

const props = defineProps<{ items: QuizHistoryEntry[] }>()

interface DayCell {
  key: string
  date: Date
  count: number
  intensity: number
  label: string
}

function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const days = computed<DayCell[]>(() => {
  // group counts by local date
  const byDay = new Map<string, number>()
  for (const it of props.items) {
    const d = new Date(it.startedAt)
    const k = dateKey(d)
    byDay.set(k, (byDay.get(k) ?? 0) + 1)
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const out: DayCell[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const k = dateKey(d)
    const count = byDay.get(k) ?? 0
    out.push({ key: k, date: d, count, intensity: 0, label: '' })
  }
  const maxCount = Math.max(1, ...out.map(d => d.count))
  for (const day of out) {
    day.intensity = day.count === 0 ? 0 : Math.max(0.18, day.count / maxCount)
    const word = day.count === 1 ? 'quiz' : 'quizzes'
    const dateStr = day.date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
    day.label = `${dateStr} · ${day.count} ${word}`
  }
  return out
})

function bg(intensity: number): string {
  if (intensity <= 0) return 'var(--hairline)'
  const pct = Math.round(intensity * 100)
  return `color-mix(in oklab, var(--accent) ${pct}%, transparent)`
}

const firstLabel = computed(() =>
  days.value[0]?.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) ?? ''
)
</script>

<template>
  <div v-if="items.length === 0" class="chart-empty">
    <p>No activity in the last 30 days.</p>
  </div>
  <div v-else class="heatmap">
    <div class="heatmap-grid">
      <div
        v-for="d in days"
        :key="d.key"
        class="heatmap-cell"
        :title="d.label"
        :style="{ background: bg(d.intensity) }"
      />
    </div>
    <div class="heatmap-scale">
      <span class="micro-mark">{{ firstLabel }}</span>
      <div class="heatmap-legend">
        <span class="micro-mark">less</span>
        <div
          v-for="v in [0, 0.25, 0.5, 0.75, 1]"
          :key="v"
          class="heatmap-cell"
          :style="{ background: bg(v) }"
        />
        <span class="micro-mark">more</span>
      </div>
      <span class="micro-mark">today</span>
    </div>
  </div>
</template>
