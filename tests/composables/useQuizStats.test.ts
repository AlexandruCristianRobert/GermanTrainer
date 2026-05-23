import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest'
import { computeStats } from '../../src/composables/useQuizStats'
import type { QuizHistoryEntry, QuizHistoryType } from '../../src/composables/useQuizHistory'

// ── Helpers ─────────────────────────────────────────────────────────

let nextId = 1000
function entry(over: Partial<QuizHistoryEntry> = {}): QuizHistoryEntry {
  const startedAt = over.startedAt ?? new Date(2026, 4, 20, 10, 0, 0).toISOString()
  const finishedAt = over.finishedAt ?? new Date(Date.parse(startedAt) + 60_000).toISOString()
  return {
    id: over.id ?? nextId++,
    type: (over.type as QuizHistoryType) ?? 'noun-gender',
    startedAt,
    finishedAt,
    durationMs: over.durationMs ?? Date.parse(finishedAt) - Date.parse(startedAt),
    count: over.count ?? 10,
    correct: over.correct ?? 7,
    meta: over.meta ?? {}
  }
}

function iso(y: number, m: number, d: number, hh = 12, mm = 0): string {
  return new Date(y, m - 1, d, hh, mm, 0).toISOString()
}

// Use a fixed "today" for deterministic streak tests.
const FIXED_NOW = new Date(2026, 4, 23, 14, 0, 0).getTime() // 2026-05-23 14:00 local

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)
})

afterAll(() => {
  vi.useRealTimers()
})

// ── Empty input ─────────────────────────────────────────────────────

describe('computeStats — empty input', () => {
  test('returns a zeroed bundle', () => {
    const s = computeStats([])
    expect(s.totalRuns).toBe(0)
    expect(s.totalQuestions).toBe(0)
    expect(s.totalCorrect).toBe(0)
    expect(s.totalDurationMs).toBe(0)
    expect(s.overallAccuracy).toBe(0)
    expect(s.currentStreakDays).toBe(0)
    expect(s.longestStreakDays).toBe(0)
    expect(s.daysActive).toBe(0)
    expect(s.daysSinceLastRun).toBeNull()
    expect(s.bestDayCount).toBe(0)
    expect(s.accuracyOverTime).toEqual([])
    expect(s.speedOverTime).toEqual([])
    expect(s.cumulativeProgress).toEqual([])
    expect(s.calendarHeatmap).toEqual([])
    expect(s.countVsAccuracy).toEqual([])
    expect(s.dayHourMatrix).toHaveLength(7)
    expect(s.dayHourMatrix[0]).toHaveLength(24)
    expect(s.dayHourMatrix[0][0]).toBe(0)
  })
})

// ── Totals ──────────────────────────────────────────────────────────

describe('computeStats — totals', () => {
  test('totalRuns + totalQuestions + totalCorrect + overallAccuracy', () => {
    const s = computeStats([
      entry({ count: 10, correct: 7 }),
      entry({ count: 5, correct: 3 })
    ])
    expect(s.totalRuns).toBe(2)
    expect(s.totalQuestions).toBe(15)
    expect(s.totalCorrect).toBe(10)
    expect(s.overallAccuracy).toBeCloseTo(10 / 15)
  })

  test('totalDurationMs sums durations', () => {
    const s = computeStats([
      entry({ durationMs: 60_000 }),
      entry({ durationMs: 120_000 })
    ])
    expect(s.totalDurationMs).toBe(180_000)
  })
})

// ── runsByType / accuracyByType ─────────────────────────────────────

describe('computeStats — by type', () => {
  test('counts runs and accuracy per quiz type', () => {
    const s = computeStats([
      entry({ type: 'noun-gender', count: 10, correct: 8 }),
      entry({ type: 'noun-gender', count: 10, correct: 6 }),
      entry({ type: 'verb-translation', count: 5, correct: 5 })
    ])
    expect(s.runsByType['noun-gender']).toBe(2)
    expect(s.runsByType['verb-translation']).toBe(1)
    expect(s.runsByType['noun-translation']).toBe(0)
    expect(s.accuracyByType['noun-gender']).toEqual({
      correct: 14,
      total: 20,
      accuracy: 0.7
    })
    expect(s.accuracyByType['verb-translation'].accuracy).toBe(1)
    expect(s.accuracyByType['adjective']).toEqual({ correct: 0, total: 0, accuracy: 0 })
  })
})

// ── Streak ──────────────────────────────────────────────────────────

describe('computeStats — streak', () => {
  test('only today — streak is 1', () => {
    const s = computeStats([entry({ finishedAt: iso(2026, 5, 23) })])
    expect(s.currentStreakDays).toBe(1)
    expect(s.longestStreakDays).toBe(1)
    expect(s.daysSinceLastRun).toBe(0)
  })

  test('today + yesterday + day-before — streak is 3', () => {
    const s = computeStats([
      entry({ finishedAt: iso(2026, 5, 23) }),
      entry({ finishedAt: iso(2026, 5, 22) }),
      entry({ finishedAt: iso(2026, 5, 21) })
    ])
    expect(s.currentStreakDays).toBe(3)
    expect(s.longestStreakDays).toBe(3)
  })

  test('gap in the middle — current streak only counts trailing block', () => {
    const s = computeStats([
      entry({ finishedAt: iso(2026, 5, 23) }),
      entry({ finishedAt: iso(2026, 5, 22) }),
      entry({ finishedAt: iso(2026, 5, 19) }),
      entry({ finishedAt: iso(2026, 5, 18) }),
      entry({ finishedAt: iso(2026, 5, 17) })
    ])
    expect(s.currentStreakDays).toBe(2) // 23 + 22
    expect(s.longestStreakDays).toBe(3) // 17–19
  })

  test('no run today but yesterday active — streak counts from yesterday', () => {
    const s = computeStats([
      entry({ finishedAt: iso(2026, 5, 22) }),
      entry({ finishedAt: iso(2026, 5, 21) })
    ])
    expect(s.currentStreakDays).toBe(2)
    expect(s.daysSinceLastRun).toBe(1)
  })

  test('older than yesterday — current streak is 0', () => {
    const s = computeStats([entry({ finishedAt: iso(2026, 5, 20) })])
    expect(s.currentStreakDays).toBe(0)
    expect(s.longestStreakDays).toBe(1)
    expect(s.daysSinceLastRun).toBe(3)
  })
})

// ── Rolling average ─────────────────────────────────────────────────

describe('computeStats — rolling 5-run avg', () => {
  test('the 5th point averages the first 5 accuracies', () => {
    // accuracies 0.4, 0.5, 0.6, 0.7, 0.8, 0.9 — newest last
    const arr = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((a, i) =>
      entry({
        count: 10,
        correct: a * 10,
        finishedAt: iso(2026, 5, 17 + i) // 6 consecutive days
      })
    )
    const s = computeStats(arr)
    expect(s.accuracyOverTime).toHaveLength(6)
    expect(s.accuracyOverTime[0].accuracy).toBeCloseTo(0.4)
    expect(s.accuracyOverTime[4].rollingAvg).toBeCloseTo(0.6) // mean of 0.4-0.8
    expect(s.accuracyOverTime[5].rollingAvg).toBeCloseTo(0.7) // mean of 0.5-0.9
  })

  test('newest-last ordering', () => {
    const arr = [
      entry({ finishedAt: iso(2026, 5, 21), correct: 1, count: 10 }),
      entry({ finishedAt: iso(2026, 5, 23), correct: 9, count: 10 }),
      entry({ finishedAt: iso(2026, 5, 22), correct: 5, count: 10 })
    ]
    const s = computeStats(arr)
    expect(s.accuracyOverTime.map(p => p.accuracy)).toEqual([0.1, 0.5, 0.9])
  })
})

// ── Meta-aware accuracy ─────────────────────────────────────────────

describe('computeStats — meta-aware accuracy', () => {
  test('accuracyByGroup attributes the whole run to each listed group', () => {
    const s = computeStats([
      entry({ count: 10, correct: 8, meta: { groups: ['Food', 'Family'] } }),
      entry({ count: 4, correct: 2, meta: { groups: ['Food'] } })
    ])
    expect(s.accuracyByGroup['Food']).toEqual({
      correct: 10,
      total: 14,
      accuracy: 10 / 14
    })
    expect(s.accuracyByGroup['Family']).toEqual({
      correct: 8,
      total: 10,
      accuracy: 0.8
    })
  })

  test('accuracyByLevel, accuracyByVerbType, accuracyByCase, accuracyByTense', () => {
    const s = computeStats([
      entry({
        count: 10,
        correct: 7,
        meta: { levels: ['A1'], types: ['regular'], cases: ['accusative'], tenses: ['Präsens'] }
      })
    ])
    expect(s.accuracyByLevel['A1'].accuracy).toBeCloseTo(0.7)
    expect(s.accuracyByVerbType['regular'].accuracy).toBeCloseTo(0.7)
    expect(s.accuracyByCase['accusative'].accuracy).toBeCloseTo(0.7)
    expect(s.accuracyByTense['Präsens'].accuracy).toBeCloseTo(0.7)
  })

  test('accuracyByMode keyed by gender/translation', () => {
    const s = computeStats([
      entry({ type: 'noun-gender', count: 10, correct: 7, meta: { mode: 'gender' } }),
      entry({ type: 'noun-translation', count: 10, correct: 4, meta: { mode: 'translation' } })
    ])
    expect(s.accuracyByMode['gender'].accuracy).toBeCloseTo(0.7)
    expect(s.accuracyByMode['translation'].accuracy).toBeCloseTo(0.4)
  })

  test('runs with no meta for a field are excluded from that breakdown', () => {
    const s = computeStats([
      entry({ count: 10, correct: 5, meta: {} }),
      entry({ count: 10, correct: 8, meta: { groups: ['Food'] } })
    ])
    expect(s.accuracyByGroup['Food'].correct).toBe(8)
    expect(s.accuracyByGroup['Food'].total).toBe(10)
  })
})

// ── dayHourMatrix ───────────────────────────────────────────────────

describe('computeStats — day × hour matrix', () => {
  test('places runs in the right cell using local time', () => {
    // 2026-05-18 is a Monday; 2026-05-19 is a Tuesday
    const s = computeStats([
      entry({ finishedAt: iso(2026, 5, 18, 9, 0) }),
      entry({ finishedAt: iso(2026, 5, 19, 14, 0) }),
      entry({ finishedAt: iso(2026, 5, 19, 14, 30) })
    ])
    // dayHourMatrix[dayOfWeek 0=Mon..6=Sun][hour 0..23]
    expect(s.dayHourMatrix[0][9]).toBe(1) // Mon 9am
    expect(s.dayHourMatrix[1][14]).toBe(2) // Tue 2pm (two runs)
    expect(s.dayHourMatrix[0][10]).toBe(0)
  })
})

// ── Calendar heatmap ────────────────────────────────────────────────

describe('computeStats — calendar heatmap', () => {
  test('groups runs by local date', () => {
    const s = computeStats([
      entry({ finishedAt: iso(2026, 5, 20, 10) }),
      entry({ finishedAt: iso(2026, 5, 20, 18) }),
      entry({ finishedAt: iso(2026, 5, 21, 8) })
    ])
    const day20 = s.calendarHeatmap.find(d => d.date === '2026-05-20')
    const day21 = s.calendarHeatmap.find(d => d.date === '2026-05-21')
    expect(day20?.count).toBe(2)
    expect(day21?.count).toBe(1)
  })
})

// ── Cumulative + duration buckets + scatter ─────────────────────────

describe('computeStats — cumulative progress', () => {
  test('cumCorrect + cumTotal accumulate in chronological order', () => {
    const s = computeStats([
      entry({ finishedAt: iso(2026, 5, 21), correct: 5, count: 10 }),
      entry({ finishedAt: iso(2026, 5, 22), correct: 7, count: 10 }),
      entry({ finishedAt: iso(2026, 5, 23), correct: 9, count: 10 })
    ])
    expect(s.cumulativeProgress).toHaveLength(3)
    expect(s.cumulativeProgress[0].cumCorrect).toBe(5)
    expect(s.cumulativeProgress[1].cumCorrect).toBe(12)
    expect(s.cumulativeProgress[2].cumCorrect).toBe(21)
    expect(s.cumulativeProgress[2].cumTotal).toBe(30)
  })
})

describe('computeStats — duration buckets', () => {
  test('places each run into the right bucket', () => {
    const s = computeStats([
      entry({ durationMs: 30_000 }),     // < 1m
      entry({ durationMs: 90_000 }),     // 1–2m
      entry({ durationMs: 200_000 }),    // 2–5m
      entry({ durationMs: 400_000 }),    // 5–10m
      entry({ durationMs: 1_000_000 })   // 10m+
    ])
    const labels = s.durationBuckets.map(b => b.label)
    expect(labels).toEqual(['< 1m', '1–2m', '2–5m', '5–10m', '10m+'])
    expect(s.durationBuckets.every(b => b.count === 1)).toBe(true)
  })
})

describe('computeStats — count vs accuracy scatter', () => {
  test('one point per run', () => {
    const s = computeStats([
      entry({ count: 10, correct: 8 }),
      entry({ count: 20, correct: 14 })
    ])
    expect(s.countVsAccuracy).toHaveLength(2)
    expect(s.countVsAccuracy[0]).toMatchObject({ count: 10, accuracy: 0.8 })
    expect(s.countVsAccuracy[1]).toMatchObject({ count: 20, accuracy: 0.7 })
  })
})

// ── daysActive / bestDayCount / bestRunByType ───────────────────────

describe('computeStats — derived stats', () => {
  test('daysActive counts unique local dates', () => {
    const s = computeStats([
      entry({ finishedAt: iso(2026, 5, 20, 10) }),
      entry({ finishedAt: iso(2026, 5, 20, 18) }),
      entry({ finishedAt: iso(2026, 5, 21) }),
      entry({ finishedAt: iso(2026, 5, 22) })
    ])
    expect(s.daysActive).toBe(3)
  })

  test('bestDayCount is the max runs on any single day', () => {
    const s = computeStats([
      entry({ finishedAt: iso(2026, 5, 20, 10) }),
      entry({ finishedAt: iso(2026, 5, 20, 14) }),
      entry({ finishedAt: iso(2026, 5, 20, 18) }),
      entry({ finishedAt: iso(2026, 5, 21) })
    ])
    expect(s.bestDayCount).toBe(3)
  })

  test('bestRunByType picks the highest-accuracy run per type', () => {
    const a = entry({ type: 'noun-gender', count: 10, correct: 6, finishedAt: iso(2026, 5, 20) })
    const b = entry({ type: 'noun-gender', count: 10, correct: 9, finishedAt: iso(2026, 5, 21) })
    const c = entry({ type: 'noun-gender', count: 10, correct: 8, finishedAt: iso(2026, 5, 22) })
    const s = computeStats([a, b, c])
    expect(s.bestRunByType['noun-gender']?.id).toBe(b.id)
    expect(s.bestRunByType['verb-translation']).toBeUndefined()
  })
})
