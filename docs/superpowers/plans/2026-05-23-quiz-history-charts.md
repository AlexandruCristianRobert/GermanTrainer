# Quiz History — Charts & Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/history` into a rich stats dashboard with ~16 charts derived from the existing `gt:quizHistory` localStorage data, themed to match the paper/ink editorial aesthetic.

**Architecture:** A `useQuizStats` composable computes all chart-ready aggregations from `loadHistory()`. A thin `EChart.vue` wrapper handles vue-echarts setup + theme registration tied to the existing `--paper / --ink / --accent / --hairline` CSS variables. One Vue component per chart (or a parameterised template where several charts are bar-of-X-vs-Y variations). `HistoryPage.vue` composes them into a stacked-section layout above the existing filter + table.

**Tech Stack:** Vue 3 + TypeScript, `echarts` 5.x (SVG renderer for crisp editorial look), `vue-echarts` 7.x (Vue 3 wrapper), `vue3-calendar-heatmap` for the GitHub-style daily activity grid. No new test infrastructure — extends the existing vitest setup.

---

## File Structure

```
src/
├── composables/
│   ├── useQuizStats.ts          (new — derives every chart input)
│   └── useEchartsTheme.ts       (new — builds a theme from current CSS vars)
├── components/
│   ├── EChart.vue               (new — vue-echarts wrapper, lazy-registers types)
│   └── charts/
│       ├── MotivationStrip.vue       (streak, longest streak, time, days active, best day)
│       ├── ActivityCalendar.vue      (vue3-calendar-heatmap)
│       ├── AccuracyTrend.vue         (line + rolling avg)
│       ├── CumulativeProgress.vue    (area)
│       ├── SpeedTrend.vue            (line — ms/question over time)
│       ├── TypeDistribution.vue      (donut — runs per quiz type)
│       ├── TypeAccuracyRadar.vue     (radar across the 5 quiz types)
│       ├── TypeBreakdown.vue         (stacked horizontal bar — correct vs missed)
│       ├── MetaAccuracyBar.vue       (parameterised — bar of {filter} → accuracy)
│       ├── StudyHeatmap.vue          (7×24 day-of-week × hour matrix)
│       ├── DurationHistogram.vue     (run duration distribution)
│       ├── CountVsAccuracyScatter.vue (count vs accuracy)
│       └── ChartCard.vue             (shared frame — title + subtitle + slot)
├── modules/history/
│   └── HistoryPage.vue          (rewired — adds the new sections above filter+table)
└── styles/tokens.css            (adds .chart-card / .chart-grid-2 / .stat-card-row classes)

tests/composables/
└── useQuizStats.test.ts         (new)
```

Each chart component is < 120 lines: a `defineProps<{ entries: QuizHistoryEntry[] }>` + a computed `option` object passed to `<EChart>`. The shared `EChart.vue` registers only the chart types we use so the bundle stays trim.

---

## Tasks

### Task 1: Install dependencies and verify build

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
npm install echarts@^5 vue-echarts@^7 vue3-calendar-heatmap@^2
```

- [ ] **Step 2: Verify resolution**

Run: `npm run typecheck`
Expected: PASS (no type errors from the new packages — they ship their own types).

- [ ] **Step 3: Commit deps**

```bash
git add package.json package-lock.json
git commit -m "chore: add echarts, vue-echarts, vue3-calendar-heatmap for stats dashboard"
```

---

### Task 2: useQuizStats composable + tests

**Files:**
- Create: `src/composables/useQuizStats.ts`
- Test:   `tests/composables/useQuizStats.test.ts`

**Why TDD here:** the aggregations (streak, rolling avg, day×hour matrix, meta-aware accuracy) are pure functions with edge cases (empty array, single entry, runs straddling midnight, weighted meta accuracy). Get them right with tests, then never look back.

#### Public API

```ts
export interface BucketStat { correct: number; total: number; accuracy: number }
export interface StatsBundle {
  totalRuns: number
  totalQuestions: number
  totalCorrect: number
  totalDurationMs: number
  overallAccuracy: number
  currentStreakDays: number
  longestStreakDays: number
  daysActive: number
  daysSinceLastRun: number | null
  bestDayCount: number
  runsByType: Record<QuizHistoryType, number>
  accuracyByType: Record<QuizHistoryType, BucketStat>
  accuracyByLevel: Record<string, BucketStat>
  accuracyByGroup: Record<string, BucketStat>
  accuracyByVerbType: Record<string, BucketStat>
  accuracyByCase: Record<string, BucketStat>
  accuracyByTense: Record<string, BucketStat>
  accuracyByMode: Record<string, BucketStat>
  /** newest-last for charting */
  accuracyOverTime: Array<{ id: number; finishedAt: string; accuracy: number; rollingAvg: number }>
  speedOverTime: Array<{ id: number; finishedAt: string; msPerQuestion: number }>
  cumulativeProgress: Array<{ finishedAt: string; cumCorrect: number; cumTotal: number }>
  /** [dayOfWeek (0=Mon..6=Sun)][hour (0..23)] = run count */
  dayHourMatrix: number[][]
  /** for vue3-calendar-heatmap — one entry per active day */
  calendarHeatmap: Array<{ date: string; count: number }>
  durationBuckets: Array<{ label: string; count: number }>
  countVsAccuracy: Array<{ count: number; accuracy: number; id: number }>
  bestRunByType: Partial<Record<QuizHistoryType, QuizHistoryEntry>>
}

export function computeStats(entries: QuizHistoryEntry[]): StatsBundle
export function useQuizStats(): { stats: ComputedRef<StatsBundle>; refresh: () => void }
```

The composable wraps `computeStats(loadHistory())` in a reactive ref + a `refresh()` for after a Clear action.

#### Meta-aware accuracy (the tricky part)

For runs where `meta.groups = ['Food', 'Family']` and score = 8/10, attribute 8 correct and 10 total to *each* of the two groups (uniform-assumption fallback — we don't store per-question data). Then accuracy per group = sum(correct) / sum(total) across all runs touching that group. Apply the same logic to levels/types/cases/tenses.

If `meta[field]` is absent or empty, skip that run for that breakdown. If `meta.mode` is set ('gender' | 'translation') only for noun-X types, attribute the whole run to that mode bucket.

#### Streak rule

`currentStreakDays`: count consecutive days ending at "today" (local date, derived from `finishedAt`) that have at least one entry. If today has no entry, streak counts back from the most recent active day if it equals "today" or "yesterday" (grace day). `longestStreakDays`: same rule applied historically, return max.

#### Rolling avg

`rollingAvg`: trailing 5-run mean of `accuracy = correct/count` per type-agnostic timeline (newest-last). For entry i, `rolling = mean(entries[max(0,i-4)..i].accuracy)`. Plotted alongside the raw points.

#### Tests to write (one `describe` per concern)

- [ ] **Step 1: Write failing test — empty input**

```ts
test('computeStats: empty array returns zeroed bundle', () => {
  const s = computeStats([])
  expect(s.totalRuns).toBe(0)
  expect(s.overallAccuracy).toBe(0)
  expect(s.currentStreakDays).toBe(0)
  expect(s.daysSinceLastRun).toBeNull()
  expect(s.accuracyOverTime).toEqual([])
  expect(s.calendarHeatmap).toEqual([])
})
```

- [ ] **Step 2: Totals + overall accuracy**

```ts
test('totals + overall accuracy', () => {
  const s = computeStats([entry({ count: 10, correct: 7 }), entry({ count: 5, correct: 3 })])
  expect(s.totalRuns).toBe(2)
  expect(s.totalQuestions).toBe(15)
  expect(s.totalCorrect).toBe(10)
  expect(s.overallAccuracy).toBeCloseTo(10 / 15)
})
```

- [ ] **Step 3: runsByType + accuracyByType**

```ts
test('runsByType counts and accuracy buckets by quiz type', () => {
  const s = computeStats([
    entry({ type: 'noun-gender', count: 10, correct: 8 }),
    entry({ type: 'noun-gender', count: 10, correct: 6 }),
    entry({ type: 'verb-translation', count: 5, correct: 5 }),
  ])
  expect(s.runsByType['noun-gender']).toBe(2)
  expect(s.runsByType['verb-translation']).toBe(1)
  expect(s.accuracyByType['noun-gender']).toEqual({ correct: 14, total: 20, accuracy: 0.7 })
  expect(s.accuracyByType['verb-translation'].accuracy).toBe(1)
})
```

- [ ] **Step 4: streak — basic, grace day, broken**

Three sub-tests: today only; today + yesterday + day-before-yesterday (streak 3); gap (streak 1); no-run-today but yesterday active (streak from yesterday).

- [ ] **Step 5: rolling average**

```ts
test('rolling 5-run average', () => {
  const arr = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((a, i) =>
    entry({ count: 10, correct: a * 10, finishedAt: isoDaysAgo(6 - i) })
  )
  const s = computeStats(arr)
  // newest-last: at index 4 (5th point) rolling = mean of first 5 = 0.6
  expect(s.accuracyOverTime[4].rollingAvg).toBeCloseTo(0.6)
  // at index 5 (6th point) rolling = mean of last 5 = 0.7
  expect(s.accuracyOverTime[5].rollingAvg).toBeCloseTo(0.7)
})
```

- [ ] **Step 6: meta-aware accuracy by group**

```ts
test('accuracyByGroup weights each run uniformly across its groups', () => {
  const s = computeStats([
    entry({ count: 10, correct: 8, meta: { groups: ['Food', 'Family'] } }),
    entry({ count: 4, correct: 2, meta: { groups: ['Food'] } }),
  ])
  expect(s.accuracyByGroup['Food']).toEqual({ correct: 10, total: 14, accuracy: 10 / 14 })
  expect(s.accuracyByGroup['Family']).toEqual({ correct: 8, total: 10, accuracy: 0.8 })
})
```

- [ ] **Step 7: dayHourMatrix**

Construct entries on Monday 09:00 and Tuesday 14:00 (UTC-stable test helper); expect matrix[0][9] === 1 and matrix[1][14] === 1; all other cells 0.

- [ ] **Step 8: calendarHeatmap**

```ts
test('calendarHeatmap groups runs by local date', () => {
  const s = computeStats([
    entry({ finishedAt: '2026-05-20T10:00:00.000Z' }),
    entry({ finishedAt: '2026-05-20T18:00:00.000Z' }),
    entry({ finishedAt: '2026-05-21T08:00:00.000Z' }),
  ])
  const day20 = s.calendarHeatmap.find(d => d.date === '2026-05-20')
  expect(day20?.count).toBe(2)
  expect(s.calendarHeatmap.find(d => d.date === '2026-05-21')?.count).toBe(1)
})
```

- [ ] **Step 9: durationBuckets, countVsAccuracy, bestRunByType, daysSinceLastRun, daysActive, bestDayCount**

Smaller unit tests for each — one assertion each is enough.

- [ ] **Step 10: Implement `computeStats` to pass all tests**

Pure function in `src/composables/useQuizStats.ts`. Then add the thin reactive wrapper:

```ts
import { computed, ref } from 'vue'
import { loadHistory } from './useQuizHistory'
export function useQuizStats() {
  const tick = ref(0)
  const stats = computed(() => { tick.value; return computeStats(loadHistory()) })
  return { stats, refresh: () => { tick.value++ } }
}
```

- [ ] **Step 11: Commit**

```bash
git add src/composables/useQuizStats.ts tests/composables/useQuizStats.test.ts
git commit -m "feat(stats): useQuizStats composable + tests for chart aggregations"
```

---

### Task 3: ECharts theme + EChart wrapper

**Files:**
- Create: `src/composables/useEchartsTheme.ts`
- Create: `src/components/EChart.vue`

#### `useEchartsTheme.ts`

A pure helper `buildEchartsTheme(): EChartsTheme` that reads computed style of `:root` and returns a theme dict. Watches `data-theme` + `--accent` changes and re-emits.

```ts
function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function buildEchartsTheme() {
  const ink = readVar('--ink')
  const inkSoft = readVar('--ink-soft')
  const paper = readVar('--paper')
  const paperCard = readVar('--paper-card')
  const mute = readVar('--mute')
  const accent = readVar('--accent')
  const success = readVar('--success')
  const danger = readVar('--danger')
  return {
    color: [accent, readVar('--cobalt'), readVar('--clay'), readVar('--ochre'), readVar('--sage'), inkSoft],
    backgroundColor: 'transparent',
    textStyle: { fontFamily: '"Source Serif 4", serif', color: ink, fontSize: 13 },
    title: { textStyle: { fontFamily: '"Fraunces", serif', fontWeight: 500, color: ink, fontSize: 18 } },
    legend: { textStyle: { color: inkSoft, fontFamily: '"JetBrains Mono", monospace', fontSize: 11 } },
    grid: { left: 40, right: 16, top: 24, bottom: 32, containLabel: true },
    axisPointer: { lineStyle: { color: mute, type: 'dotted' } },
    xAxis: {
      axisLine: { lineStyle: { color: mute } },
      splitLine: { lineStyle: { color: readVar('--hairline'), type: 'dashed' } },
      axisLabel: { color: inkSoft, fontFamily: '"JetBrains Mono", monospace', fontSize: 11 }
    },
    yAxis: {
      axisLine: { lineStyle: { color: mute } },
      splitLine: { lineStyle: { color: readVar('--hairline'), type: 'dashed' } },
      axisLabel: { color: inkSoft, fontFamily: '"JetBrains Mono", monospace', fontSize: 11 }
    },
    valueAxis: { /* same as yAxis */ },
    tooltip: {
      backgroundColor: paperCard,
      borderColor: readVar('--rule'),
      borderWidth: 1,
      textStyle: { color: ink, fontFamily: '"Source Serif 4", serif' },
      extraCssText: 'box-shadow: 0 8px 24px -16px rgba(0,0,0,0.2); border-radius: 2px;'
    }
  }
}
```

#### `EChart.vue`

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import {
  LineChart, BarChart, PieChart, RadarChart, ScatterChart, HeatmapChart
} from 'echarts/charts'
import {
  TitleComponent, TooltipComponent, GridComponent, LegendComponent,
  DatasetComponent, VisualMapComponent, MarkLineComponent, MarkAreaComponent
} from 'echarts/components'
import VChart, { THEME_KEY } from 'vue-echarts'
import { buildEchartsTheme } from '../composables/useEchartsTheme'
import { useTheme } from '../composables/useTheme'

use([
  SVGRenderer, LineChart, BarChart, PieChart, RadarChart, ScatterChart, HeatmapChart,
  TitleComponent, TooltipComponent, GridComponent, LegendComponent,
  DatasetComponent, VisualMapComponent, MarkLineComponent, MarkAreaComponent
])

const props = defineProps<{ option: any; height?: string; ariaLabel?: string }>()
const { resolved } = useTheme()
const themeKey = ref(0)
watch(resolved, () => { themeKey.value++ })

const theme = computed(() => { themeKey.value; return buildEchartsTheme() })
</script>

<template>
  <div class="chart-wrap" :style="{ height: height || '280px' }" :aria-label="ariaLabel" role="img">
    <VChart :key="themeKey" :option="option" :theme="theme" autoresize />
  </div>
</template>
```

- [ ] **Step 1: Implement both files**

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useEchartsTheme.ts src/components/EChart.vue
git commit -m "feat(charts): EChart wrapper + editorial theme tied to CSS variables"
```

---

### Task 4: ChartCard + chart card CSS

**Files:**
- Create: `src/components/charts/ChartCard.vue`
- Modify: `src/styles/tokens.css`

`ChartCard.vue` — a small frame for every chart: paper-card bg, 1px hairline, 4px radius, 24×28 padding, a mono breadcrumb label at top + Fraunces 22px title + italic 14px subtitle + body slot. Matches the section header pattern visually but at card scale.

CSS appends:

```css
.chart-card {
  background: var(--paper-card);
  border: 1px solid var(--hairline);
  border-radius: 4px;
  padding: 24px 28px;
  margin-bottom: 24px;
}
.chart-card-head { margin-bottom: 18px; }
.chart-card-mark { /* mono micro-mark */ }
.chart-card-title { font-family: var(--font-display); font-weight: 500; font-size: 22px; }
.chart-card-sub { font-family: var(--font-body); font-style: italic; font-size: 14px; color: var(--ink-soft); }

.chart-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 900px) { .chart-grid-2 { grid-template-columns: 1fr; } }

.chart-wrap { width: 100%; }
.chart-empty {
  font-family: var(--font-display); font-style: italic; font-size: 18px;
  color: var(--mute); text-align: center; padding: 40px 16px;
}

.stat-card-row {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 18px;
  margin-bottom: 28px;
}
.stat-card-row .stat-card {
  border: 1px solid var(--hairline); border-radius: 4px; padding: 18px 20px;
}
.stat-card .stat-card-num { font-family: var(--font-display); font-weight: 500; font-size: 32px; letter-spacing: -0.01em; line-height: 1; }
.stat-card .stat-card-suffix { font-size: 18px; color: var(--mute); margin-left: 4px; }
.stat-card .stat-card-label { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mute); margin-top: 8px; }
.stat-card .stat-card-foot { font-family: var(--font-body); font-style: italic; font-size: 13px; color: var(--ink-soft); margin-top: 4px; }
@media (max-width: 900px) { .stat-card-row { grid-template-columns: repeat(2, 1fr); } }
```

- [ ] **Step 1: Write ChartCard.vue**

- [ ] **Step 2: Append CSS to tokens.css**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(charts): ChartCard frame + chart-grid + stat-card CSS"
```

---

### Task 5: MotivationStrip — five stat cards

**Files:**
- Create: `src/components/charts/MotivationStrip.vue`

Five `.stat-card`s: Current streak (with foot label "consecutive days" or "since yesterday"), Longest streak ("best run"), Days active ("of N total"), Total time ("studied"), Best day ("most runs in a day"). Each prop-driven by stats bundle. Shows the page above the existing 4-card `.stat-strip` (which keeps Total runs / Questions answered / Correct / Overall %).

```vue
<script setup lang="ts">
import type { StatsBundle } from '../../composables/useQuizStats'
const props = defineProps<{ stats: StatsBundle }>()
function fmtDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
</script>
```

- [ ] **Step 1: Write component**
- [ ] **Step 2: Visual check via dev server** (run `npm run dev`, navigate to /history, observe layout)
- [ ] **Step 3: Commit**

---

### Task 6: ActivityCalendar — GitHub-style heatmap

**Files:**
- Create: `src/components/charts/ActivityCalendar.vue`

Wraps `vue3-calendar-heatmap`. Passes `stats.calendarHeatmap` as `values`. End date = today. Range = 365 days. Color scale: `--accent` family — 5 stops from `--paper-deep` to `--accent`. Tooltip text uses Fraunces. Empty-state if no entries.

```vue
<script setup lang="ts">
import { CalendarHeatmap } from 'vue3-calendar-heatmap'
import 'vue3-calendar-heatmap/dist/style.css'
import type { StatsBundle } from '../../composables/useQuizStats'
const props = defineProps<{ stats: StatsBundle }>()
const today = new Date().toISOString().slice(0, 10)
</script>
<template>
  <ChartCard mark="Aktivität" title="Activity" subtitle="Daily quiz runs over the last year.">
    <CalendarHeatmap
      v-if="stats.calendarHeatmap.length"
      :values="stats.calendarHeatmap"
      :end-date="today"
      :tooltip="true"
      :round="1"
      :max="5"
    />
    <div v-else class="chart-empty">No activity yet.</div>
  </ChartCard>
</template>
<style scoped>
:deep(.vch__container) { --vch-color-empty: var(--paper-deep); }
/* Stops from sage-tinted to accent — restated below */
</style>
```

CSS for the 5 stops uses `--accent-wash` / `--accent-tint` / `--accent` to match the editorial palette.

- [ ] **Step 1: Implement**
- [ ] **Step 2: Visual check**
- [ ] **Step 3: Commit**

---

### Task 7: Trend charts (AccuracyTrend, CumulativeProgress, SpeedTrend)

**Files:**
- Create:
  - `src/components/charts/AccuracyTrend.vue`
  - `src/components/charts/CumulativeProgress.vue`
  - `src/components/charts/SpeedTrend.vue`

Each ~100 lines: derive ECharts `option` from props, render `<EChart>` inside `<ChartCard>`.

**AccuracyTrend**: line series of raw accuracy% (smooth: false, symbol: 'circle', accent color) + dashed line of `rollingAvg` × 100. X-axis = finishedAt (time axis). Y-axis = 0–100.

**CumulativeProgress**: area chart of `cumCorrect` over time. Title "Cumulative correct answers".

**SpeedTrend**: line of `msPerQuestion` over time, accent color, area-filled with low opacity. Y-axis formatter "Xs" (seconds).

Each has an empty state ("Not enough runs yet — quiz a few times to see the trend.") shown when entries.length < 2.

- [ ] **Step 1: AccuracyTrend**
- [ ] **Step 2: CumulativeProgress**
- [ ] **Step 3: SpeedTrend**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(charts): trend charts — accuracy, cumulative, speed"
```

---

### Task 8: Distribution charts (TypeDistribution, TypeAccuracyRadar, TypeBreakdown)

**Files:**
- Create:
  - `src/components/charts/TypeDistribution.vue`
  - `src/components/charts/TypeAccuracyRadar.vue`
  - `src/components/charts/TypeBreakdown.vue`

**TypeDistribution**: ECharts pie type with `radius: ['55%', '80%']` (donut). One slice per QuizHistoryType that has > 0 runs. Center label = total runs.

**TypeAccuracyRadar**: ECharts radar — one indicator per quiz type, max 100. Plots accuracy% per type. Single accent-colored area, low opacity fill.

**TypeBreakdown**: ECharts horizontal bar with two series: correct (sage), missed (clay). One row per quiz type with > 0 runs. Stacked.

- [ ] **Step 1–3: Implement each**
- [ ] **Step 4: Commit**

---

### Task 9: MetaAccuracyBar — parameterised + 5 instances

**Files:**
- Create: `src/components/charts/MetaAccuracyBar.vue`

Generic horizontal bar of `{label, accuracy, total}[]` sorted by accuracy desc. Bars colored by threshold (≥80% sage, 50–79% ochre, <50% clay) matching the existing history `.history-pct` logic. Item label on left, count badge on right of the bar.

Props:
```ts
defineProps<{
  title: string
  mark: string
  subtitle?: string
  data: Record<string, BucketStat>
  emptyMessage?: string
  topN?: number   // optional — show only top + bottom N
}>()
```

Used five times in HistoryPage with different `data` sources:
- accuracyByLevel    (mark "Niveau", title "By CEFR level")
- accuracyByVerbType (mark "Verbtyp", title "By verb type")
- accuracyByCase     (mark "Kasus",  title "By case")
- accuracyByTense    (mark "Tempus", title "By tense")
- accuracyByGroup    (mark "Gruppe", title "By group", topN=8)

- [ ] **Step 1: Implement parameterised component**
- [ ] **Step 2: Commit**

---

### Task 10: StudyHeatmap — day × hour

**Files:**
- Create: `src/components/charts/StudyHeatmap.vue`

ECharts heatmap. X-axis = hours 00–23, Y-axis = Mon–Sun. Data = `dayHourMatrix` flattened to `[x, y, value]`. `visualMap` continuous from `--paper-deep` to `--accent`. Cell size auto-fitting.

- [ ] **Step 1: Implement**
- [ ] **Step 2: Commit**

---

### Task 11: Performance charts (DurationHistogram, CountVsAccuracyScatter)

**Files:**
- Create:
  - `src/components/charts/DurationHistogram.vue`
  - `src/components/charts/CountVsAccuracyScatter.vue`

**DurationHistogram**: bar chart of `stats.durationBuckets`. X = bucket labels ("< 1m", "1–2m", "2–5m", "5–10m", "10m+"). Y = count of runs.

**CountVsAccuracyScatter**: scatter where each point = one run (x = count, y = accuracy%). Coloured by quiz type for visual segmentation; tooltip shows the run's date.

- [ ] **Step 1–2: Implement each**
- [ ] **Step 3: Commit**

---

### Task 12: HistoryPage integration

**Files:**
- Modify: `src/modules/history/HistoryPage.vue`

Replace the body between the existing section-header and the existing filter+table with a `<Stats v-if="entries.length > 0">` block composing all the new components. Layout order:

1. **Existing stat-strip** (Total runs / Questions / Correct / Overall %) — keep as-is, it's the headline.
2. **MotivationStrip** — current streak, longest streak, days active, total time, best day.
3. **ActivityCalendar** — full-width.
4. Two-up grid (`chart-grid-2`): `AccuracyTrend` + `CumulativeProgress`.
5. Two-up grid: `TypeDistribution` + `TypeAccuracyRadar`.
6. **TypeBreakdown** — full-width.
7. **MetaAccuracyBar** ×5 — visible only when their backing record is non-empty. Render in a `chart-grid-2` so they pair up naturally.
8. **StudyHeatmap** — full-width.
9. Two-up grid: `DurationHistogram` + `SpeedTrend` + `CountVsAccuracyScatter`. (CSS grid auto-flow handles the third.)
10. **Existing filter segmented + history table** — keep.

Inject `useQuizStats` once at the top of `<script setup>`. Pass `stats.value` to each chart component. Make Clear-history call `stats.refresh()` (or just `loadHistory()` since the existing Clear path already mutates storage and the page reactively re-renders).

Add a "Charts" anchor link in the section header or a small mono-marked sub-header between the stat-strip and the new charts: e.g. `<div class="micro-mark">Statistiken · Charts</div>`.

- [ ] **Step 1: Refactor HistoryPage**
- [ ] **Step 2: Visual smoke test in browser**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat(history): integrate stats dashboard into /history"
```

---

### Task 13: Build, test, deploy

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 2: Test**

Run: `npm test`
Expected: all green (existing 174 + new useQuizStats tests).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS. The new vendor chunk (echarts + vue-echarts) will be the biggest — that's expected. If it blows past 700KB chunk-warning threshold, accept it for now (charts are render-heavy; could split later via dynamic import on the History route, but the route is already lazy so vendor will be hot-loaded together with the page on first visit only).

- [ ] **Step 4: Deploy**

```bash
npm run deploy
git checkout -- dist/
```

- [ ] **Step 5: Commit deploy artifacts** — none expected; dist/ is gitignored.

---

## Self-Review

- ✅ All chart types from the conversation menu are covered (16+).
- ✅ Pure aggregation logic (computeStats) is TDD'd; chart components are config-only.
- ✅ No placeholder steps — every chart has its ECharts series shape called out.
- ✅ Theme tied to CSS variables means dark mode and accent picker work without per-chart hacks.
- ✅ Empty states defined on every chart that needs > 1 data point.
- ✅ Existing schema unchanged — no migration. Backwards-compatible with the historical data the user already has.
- ✅ Meta-aware accuracy approximation explicitly documented (uniform-weight by run); no false precision claimed.

## Risks

- **Bundle size**: echarts + vue-echarts adds ~200KB gzipped. History route is already lazy-loaded so first paint isn't affected; the cost lands when the user visits `/history`. Acceptable.
- **Sparse data UX**: With only a handful of runs, most charts will look empty. Every chart has an empty-state branch that explains what's needed.
- **SSR**: This is a SPA with `createWebHistory`, no SSR. `getComputedStyle` calls in the theme helper are safe.
