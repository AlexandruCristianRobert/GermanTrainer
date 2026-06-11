// Derives every chart-ready statistic from the quiz history store.
//
// Notes on meta-aware accuracy:
//   Each history entry stores totals (correct/count) and which filters were
//   used (groups, levels, types, cases, tenses). We don't store per-question
//   data, so per-filter accuracy is approximated by attributing the whole
//   run to each listed value with weight = run.count. e.g. a run with
//   { groups: ['Food', 'Family'], correct: 8, count: 10 } contributes 8/10
//   to both Food and Family. Across multiple runs the weighted average is
//   sum(correct)/sum(total) per key.

import { computed, ref, type ComputedRef } from 'vue'
import {
  loadHistory,
  type QuizHistoryEntry,
  type QuizHistoryType
} from './useQuizHistory'

export interface BucketStat {
  correct: number
  total: number
  accuracy: number
}

const DURATION_BUCKETS = [
  { label: '< 1m', max: 60_000 },
  { label: '1–2m', max: 120_000 },
  { label: '2–5m', max: 300_000 },
  { label: '5–10m', max: 600_000 },
  { label: '10m+', max: Infinity }
] as const

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
  accuracyOverTime: Array<{
    id: number
    finishedAt: string
    accuracy: number
    rollingAvg: number
  }>
  speedOverTime: Array<{ id: number; finishedAt: string; msPerQuestion: number }>
  cumulativeProgress: Array<{
    finishedAt: string
    cumCorrect: number
    cumTotal: number
  }>
  /** [dayOfWeek (0=Mon..6=Sun)][hour (0..23)] = run count */
  dayHourMatrix: number[][]
  /** one entry per active day, for vue3-calendar-heatmap */
  calendarHeatmap: Array<{ date: string; count: number }>
  durationBuckets: Array<{ label: string; count: number }>
  countVsAccuracy: Array<{
    count: number
    accuracy: number
    id: number
    type: QuizHistoryType
    finishedAt: string
  }>
  bestRunByType: Partial<Record<QuizHistoryType, QuizHistoryEntry>>
}

// ── helpers ─────────────────────────────────────────────────────────

function emptyBucket(): BucketStat {
  return { correct: 0, total: 0, accuracy: 0 }
}

function zeroRunsByType(): Record<QuizHistoryType, number> {
  return {
    'noun-gender': 0,
    'noun-translation': 0,
    adjective: 0,
    'verb-translation': 0,
    'verb-conjugation': 0,
    'prep-case': 0,
    'prep-article': 0,
    'prep-two-way': 0,
    'prep-sentence': 0,
    'prep-remedial': 0,
    'decl-table': 0,
    'decl-article': 0,
    'decl-adjective': 0,
    'decl-pronoun': 0,
    'decl-case-recognition': 0,
    'decl-article-ai': 0,
    'konjunktiv-rewrite': 0,
    'passiv-transform': 0,
    'writing-grade': 0,
    'simulator-c1': 0
  }
}

function zeroAccuracyByType(): Record<QuizHistoryType, BucketStat> {
  return {
    'noun-gender': emptyBucket(),
    'noun-translation': emptyBucket(),
    adjective: emptyBucket(),
    'verb-translation': emptyBucket(),
    'verb-conjugation': emptyBucket(),
    'prep-case': emptyBucket(),
    'prep-article': emptyBucket(),
    'prep-two-way': emptyBucket(),
    'prep-sentence': emptyBucket(),
    'prep-remedial': emptyBucket(),
    'decl-table': emptyBucket(),
    'decl-article': emptyBucket(),
    'decl-adjective': emptyBucket(),
    'decl-pronoun': emptyBucket(),
    'decl-case-recognition': emptyBucket(),
    'decl-article-ai': emptyBucket(),
    'konjunktiv-rewrite': emptyBucket(),
    'passiv-transform': emptyBucket(),
    'writing-grade': emptyBucket(),
    'simulator-c1': emptyBucket()
  }
}

function ymdLocal(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function ymdLocalToday(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function daysBetween(a: string, b: string): number {
  // Both YYYY-MM-DD strings — interpret as local midnight.
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const da = new Date(ay, am - 1, ad).getTime()
  const db = new Date(by, bm - 1, bd).getTime()
  return Math.round((db - da) / 86_400_000)
}

function bumpBucket(
  rec: Record<string, BucketStat>,
  key: string,
  correct: number,
  count: number
): void {
  if (!key) return
  const cur = rec[key] ?? emptyBucket()
  cur.correct += correct
  cur.total += count
  cur.accuracy = cur.total > 0 ? cur.correct / cur.total : 0
  rec[key] = cur
}

function dayOfWeekMonFirst(d: Date): number {
  // JS getDay: Sun=0..Sat=6. We want Mon=0..Sun=6.
  const js = d.getDay()
  return (js + 6) % 7
}

// ── main ────────────────────────────────────────────────────────────

export function computeStats(entries: QuizHistoryEntry[]): StatsBundle {
  if (entries.length === 0) {
    return {
      totalRuns: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      totalDurationMs: 0,
      overallAccuracy: 0,
      currentStreakDays: 0,
      longestStreakDays: 0,
      daysActive: 0,
      daysSinceLastRun: null,
      bestDayCount: 0,
      runsByType: zeroRunsByType(),
      accuracyByType: zeroAccuracyByType(),
      accuracyByLevel: {},
      accuracyByGroup: {},
      accuracyByVerbType: {},
      accuracyByCase: {},
      accuracyByTense: {},
      accuracyByMode: {},
      accuracyOverTime: [],
      speedOverTime: [],
      cumulativeProgress: [],
      dayHourMatrix: Array.from({ length: 7 }, () => Array(24).fill(0)),
      calendarHeatmap: [],
      durationBuckets: DURATION_BUCKETS.map(b => ({ label: b.label, count: 0 })),
      countVsAccuracy: [],
      bestRunByType: {}
    }
  }

  // Sort oldest-first for time-series + cumulative.
  const sorted = [...entries].sort(
    (a, b) => Date.parse(a.finishedAt) - Date.parse(b.finishedAt)
  )

  let totalQuestions = 0
  let totalCorrect = 0
  let totalDurationMs = 0
  const runsByType = zeroRunsByType()
  const accuracyByType = zeroAccuracyByType()
  const accuracyByLevel: Record<string, BucketStat> = {}
  const accuracyByGroup: Record<string, BucketStat> = {}
  const accuracyByVerbType: Record<string, BucketStat> = {}
  const accuracyByCase: Record<string, BucketStat> = {}
  const accuracyByTense: Record<string, BucketStat> = {}
  const accuracyByMode: Record<string, BucketStat> = {}
  const dayHourMatrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  const dateCounts = new Map<string, number>()
  const durationBucketCounts = new Array(DURATION_BUCKETS.length).fill(0) as number[]
  const countVsAccuracy: StatsBundle['countVsAccuracy'] = []
  const bestRunByType: Partial<Record<QuizHistoryType, QuizHistoryEntry>> = {}

  // Time-series accumulators.
  const accuracyOverTime: StatsBundle['accuracyOverTime'] = []
  const speedOverTime: StatsBundle['speedOverTime'] = []
  const cumulativeProgress: StatsBundle['cumulativeProgress'] = []
  let cumCorrect = 0
  let cumTotal = 0

  for (const e of sorted) {
    totalQuestions += e.count
    totalCorrect += e.correct
    totalDurationMs += e.durationMs
    runsByType[e.type] = (runsByType[e.type] ?? 0) + 1

    bumpBucket(accuracyByType as Record<string, BucketStat>, e.type, e.correct, e.count)

    // Meta-aware accuracy. Each listed value in groups/levels/types/cases/tenses
    // gets the whole run (uniform-assumption fallback — see header comment).
    const meta = e.meta ?? {}
    for (const lv of meta.levels ?? []) bumpBucket(accuracyByLevel, lv, e.correct, e.count)
    for (const g of meta.groups ?? []) bumpBucket(accuracyByGroup, g, e.correct, e.count)
    for (const t of meta.types ?? []) bumpBucket(accuracyByVerbType, t, e.correct, e.count)
    for (const c of meta.cases ?? []) bumpBucket(accuracyByCase, c, e.correct, e.count)
    for (const t of meta.tenses ?? []) bumpBucket(accuracyByTense, t, e.correct, e.count)
    if (meta.mode) bumpBucket(accuracyByMode, meta.mode, e.correct, e.count)

    // Time-of-day matrix uses local time of finishedAt.
    const finished = new Date(e.finishedAt)
    dayHourMatrix[dayOfWeekMonFirst(finished)][finished.getHours()] += 1

    // Calendar (date → count).
    const localDate = ymdLocal(e.finishedAt)
    dateCounts.set(localDate, (dateCounts.get(localDate) ?? 0) + 1)

    // Duration histogram.
    for (let i = 0; i < DURATION_BUCKETS.length; i++) {
      if (e.durationMs < DURATION_BUCKETS[i].max) {
        durationBucketCounts[i] += 1
        break
      }
    }

    // Time series.
    const accuracy = e.count > 0 ? e.correct / e.count : 0
    cumCorrect += e.correct
    cumTotal += e.count
    cumulativeProgress.push({ finishedAt: e.finishedAt, cumCorrect, cumTotal })

    const speed = e.count > 0 ? e.durationMs / e.count : 0
    speedOverTime.push({ id: e.id, finishedAt: e.finishedAt, msPerQuestion: speed })

    countVsAccuracy.push({
      count: e.count,
      accuracy,
      id: e.id,
      type: e.type,
      finishedAt: e.finishedAt
    })

    // Best run per type (highest accuracy; tie-break: more recent).
    const current = bestRunByType[e.type]
    const currentAcc = current ? current.correct / Math.max(1, current.count) : -1
    if (accuracy > currentAcc) bestRunByType[e.type] = e

    accuracyOverTime.push({
      id: e.id,
      finishedAt: e.finishedAt,
      accuracy,
      rollingAvg: 0 // filled in second pass
    })
  }

  // Rolling 5-run accuracy average (trailing window, newest-last order).
  const ROLL = 5
  for (let i = 0; i < accuracyOverTime.length; i++) {
    const start = Math.max(0, i - (ROLL - 1))
    let sum = 0
    let n = 0
    for (let j = start; j <= i; j++) {
      sum += accuracyOverTime[j].accuracy
      n++
    }
    accuracyOverTime[i].rollingAvg = n > 0 ? sum / n : 0
  }

  // Calendar heatmap from dateCounts.
  const calendarHeatmap = Array.from(dateCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  // Streak — current + longest from the unique active-date set.
  const activeDates = Array.from(dateCounts.keys()).sort()
  const today = ymdLocalToday()
  const last = activeDates[activeDates.length - 1]
  const daysSinceLastRun = activeDates.length > 0 ? daysBetween(last, today) : null

  // Current streak: count contiguous active days backwards from today (or
  // from yesterday if today is empty — the grace day).
  let currentStreakDays = 0
  let anchor: string | null = null
  if (dateCounts.has(today)) {
    anchor = today
  } else if (daysSinceLastRun === 1) {
    anchor = last
  }
  if (anchor) {
    const set = dateCounts
    let cursor = anchor
    while (set.has(cursor)) {
      currentStreakDays++
      // step back one day
      const [yy, mm, dd] = cursor.split('-').map(Number)
      const prev = new Date(yy, mm - 1, dd - 1)
      const py = prev.getFullYear()
      const pm = String(prev.getMonth() + 1).padStart(2, '0')
      const pd = String(prev.getDate()).padStart(2, '0')
      cursor = `${py}-${pm}-${pd}`
    }
  }

  // Longest streak: walk the sorted active-date list.
  let longestStreakDays = 0
  let run = 0
  let prev: string | null = null
  for (const date of activeDates) {
    if (prev === null) {
      run = 1
    } else {
      run = daysBetween(prev, date) === 1 ? run + 1 : 1
    }
    if (run > longestStreakDays) longestStreakDays = run
    prev = date
  }

  const overallAccuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0
  const bestDayCount = activeDates.reduce((max, d) => Math.max(max, dateCounts.get(d) ?? 0), 0)

  return {
    totalRuns: entries.length,
    totalQuestions,
    totalCorrect,
    totalDurationMs,
    overallAccuracy,
    currentStreakDays,
    longestStreakDays,
    daysActive: activeDates.length,
    daysSinceLastRun,
    bestDayCount,
    runsByType,
    accuracyByType,
    accuracyByLevel,
    accuracyByGroup,
    accuracyByVerbType,
    accuracyByCase,
    accuracyByTense,
    accuracyByMode,
    accuracyOverTime,
    speedOverTime,
    cumulativeProgress,
    dayHourMatrix,
    calendarHeatmap,
    durationBuckets: DURATION_BUCKETS.map((b, i) => ({
      label: b.label,
      count: durationBucketCounts[i]
    })),
    countVsAccuracy,
    bestRunByType
  }
}

/**
 * Reactive wrapper. The `refresh()` call re-reads from localStorage —
 * use it after Clear-history.
 */
export function useQuizStats(): {
  stats: ComputedRef<StatsBundle>
  refresh: () => void
} {
  const tick = ref(0)
  const stats = computed(() => {
    // touch tick for reactivity
    void tick.value
    return computeStats(loadHistory())
  })
  return {
    stats,
    refresh() {
      tick.value++
    }
  }
}
