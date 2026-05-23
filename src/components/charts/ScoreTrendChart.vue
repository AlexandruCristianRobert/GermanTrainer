<script setup lang="ts">
import { computed } from 'vue'
import type { QuizHistoryEntry } from '../../composables/useQuizHistory'

const props = defineProps<{ items: QuizHistoryEntry[] }>()

interface Layout {
  W: number
  H: number
  padL: number
  padR: number
  padT: number
  padB: number
  innerW: number
  innerH: number
  xs: number[]
  ys: number[]
  scores: number[]
  path: string
  areaPath: string
  avg: number
  avgY: number
  yTicks: number[]
  firstLabel: string
  lastLabel: string
  n: number
}

function fmtRelTime(ts: string): string {
  const d = new Date(ts)
  const diffMs = Date.now() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const layout = computed<Layout | null>(() => {
  const items = props.items
  if (items.length < 2) return null
  // items are stored newest-first; chart goes oldest → newest
  const sorted = [...items].reverse()
  const W = 560
  const H = 140
  const padL = 32
  const padR = 12
  const padT = 12
  const padB = 24
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const n = sorted.length
  const xs = sorted.map((_, i) =>
    n === 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW
  )
  const scores = sorted.map(it => (it.count > 0 ? (100 * it.correct) / it.count : 0))
  const ys = scores.map(s => padT + (1 - s / 100) * innerH)
  const path = xs
    .map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(' ')
  const areaPath = `${path} L ${xs[n - 1].toFixed(1)} ${padT + innerH} L ${xs[0].toFixed(1)} ${padT + innerH} Z`
  const avg = scores.reduce((a, b) => a + b, 0) / n
  const avgY = padT + (1 - avg / 100) * innerH
  return {
    W,
    H,
    padL,
    padR,
    padT,
    padB,
    innerW,
    innerH,
    xs,
    ys,
    scores,
    path,
    areaPath,
    avg,
    avgY,
    yTicks: [0, 50, 100],
    firstLabel: fmtRelTime(sorted[0].startedAt),
    lastLabel: 'latest',
    n
  }
})
</script>

<template>
  <div v-if="!layout" class="chart-empty">
    <p>Finish 2+ quizzes to see a trend.</p>
  </div>
  <svg
    v-else
    class="chart-svg"
    :viewBox="`0 0 ${layout.W} ${layout.H}`"
    preserveAspectRatio="none"
  >
    <!-- y-axis grid lines -->
    <g v-for="t in layout.yTicks" :key="t">
      <line
        :x1="layout.padL"
        :y1="layout.padT + (1 - t / 100) * layout.innerH"
        :x2="layout.W - layout.padR"
        :y2="layout.padT + (1 - t / 100) * layout.innerH"
        stroke="var(--hairline)"
        :stroke-dasharray="t === 50 ? '0' : '2 4'"
      />
      <text
        :x="layout.padL - 6"
        :y="layout.padT + (1 - t / 100) * layout.innerH + 4"
        text-anchor="end"
        class="chart-axis-label"
      >{{ t }}%</text>
    </g>

    <!-- average dashed line -->
    <line
      :x1="layout.padL"
      :y1="layout.avgY"
      :x2="layout.W - layout.padR"
      :y2="layout.avgY"
      stroke="var(--accent)"
      stroke-dasharray="4 4"
      opacity="0.5"
    />
    <text
      :x="layout.W - layout.padR - 4"
      :y="layout.avgY - 6"
      text-anchor="end"
      class="chart-callout"
    >avg {{ Math.round(layout.avg) }}%</text>

    <!-- area fill -->
    <path :d="layout.areaPath" fill="var(--accent-tint)" />

    <!-- main line -->
    <path
      :d="layout.path"
      fill="none"
      stroke="var(--accent)"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- dots — highlight the most recent -->
    <circle
      v-for="(x, i) in layout.xs"
      :key="i"
      :cx="x"
      :cy="layout.ys[i]"
      :r="i === layout.n - 1 ? 4 : i >= layout.n - 3 ? 2.5 : 1.6"
      :fill="i === layout.n - 1 ? 'var(--accent)' : 'var(--paper)'"
      stroke="var(--accent)"
      :stroke-width="i === layout.n - 1 ? 0 : 1.4"
    />

    <!-- x-axis bookend labels -->
    <text :x="layout.xs[0]" :y="layout.H - 6" text-anchor="start" class="chart-axis-label">
      {{ layout.firstLabel }}
    </text>
    <text
      :x="layout.xs[layout.n - 1]"
      :y="layout.H - 6"
      text-anchor="end"
      class="chart-axis-label"
    >{{ layout.lastLabel }}</text>
  </svg>
</template>
