import { describe, test, expect, beforeEach } from 'vitest'
import { drillKey, masteryBand, computeDrillMastery, bumpDrillTotals } from '../../src/composables/useDrillMastery'
import { saveQuizRun, loadHistory, clearHistory } from '../../src/composables/useQuizHistory'
import type { QuizHistoryEntry, QuizHistoryType, QuizHistoryMeta } from '../../src/composables/useQuizHistory'

function run(type: QuizHistoryType, count: number, correct: number, meta: QuizHistoryMeta = {}, finishedAt = '2026-01-01T00:00:00.000Z'): QuizHistoryEntry {
  return {
    id: Math.random(), type, startedAt: '', finishedAt, durationMs: 0,
    count, correct, meta,
  } as QuizHistoryEntry
}

beforeEach(() => {
  localStorage.clear()
})

describe('masteryBand', () => {
  test('total 0 is band 0 regardless of accuracy', () => {
    expect(masteryBand(0, 1)).toBe(0)
    expect(masteryBand(0, 0)).toBe(0)
  })

  test('band 1 boundary: any total > 0 with no other threshold met', () => {
    expect(masteryBand(1, 0)).toBe(1)
    expect(masteryBand(9, 1)).toBe(1)
  })

  test('band 2 boundary: total >= 10 and accuracy >= 0.50', () => {
    expect(masteryBand(9, 1)).toBe(1)
    expect(masteryBand(10, 0.49)).toBe(1)
    expect(masteryBand(10, 0.50)).toBe(2)
  })

  test('band 3 boundary: total >= 20 and accuracy >= 0.65', () => {
    expect(masteryBand(19, 1)).toBe(2)
    expect(masteryBand(20, 0.64)).toBe(2)
    expect(masteryBand(20, 0.65)).toBe(3)
  })

  test('band 4 boundary: total >= 40 and accuracy >= 0.80', () => {
    expect(masteryBand(39, 1)).toBe(3)
    expect(masteryBand(40, 0.79)).toBe(3)
    expect(masteryBand(40, 0.80)).toBe(4)
  })

  test('band 5 boundary: total >= 60 and accuracy >= 0.90', () => {
    expect(masteryBand(59, 1)).toBe(4)
    expect(masteryBand(60, 0.89)).toBe(4)
    expect(masteryBand(60, 0.90)).toBe(5)
  })

  test('a high accuracy with a low total cannot reach a high band', () => {
    expect(masteryBand(5, 1)).toBe(1)
    expect(masteryBand(15, 1)).toBe(2)
    expect(masteryBand(25, 1)).toBe(3)
    expect(masteryBand(45, 1)).toBe(4)
  })
})

describe('drillKey', () => {
  test('a representative Direction Words type maps to its dw- code', () => {
    expect(drillKey(run('dw-hinher', 10, 5))).toBe('dw-T1')
  })

  test('a representative Da-Compounds type maps to its dac- code', () => {
    expect(drillKey(run('dac-korrelat', 10, 5))).toBe('dac-T11')
  })

  test('dac-sentence with direction en-de maps to T14', () => {
    expect(drillKey(run('dac-sentence', 10, 5, { dacSentenceDirection: 'en-de' }))).toBe('dac-T14')
  })

  test('dac-sentence with direction de-en maps to T15', () => {
    expect(drillKey(run('dac-sentence', 10, 5, { dacSentenceDirection: 'de-en' }))).toBe('dac-T15')
  })

  test('dac-sentence with an undefined direction (legacy entries) attributes to T14', () => {
    expect(drillKey(run('dac-sentence', 10, 5, {}))).toBe('dac-T14')
  })

  test('a run type outside both modules returns null', () => {
    expect(drillKey(run('noun-gender', 10, 5))).toBeNull()
  })
})

describe('computeDrillMastery', () => {
  test('empty history returns an empty map', () => {
    expect(computeDrillMastery([])).toEqual({})
  })

  test('a single run produces one entry with the expected stats', () => {
    const m = computeDrillMastery([run('dw-hinher', 10, 7)])
    expect(Object.keys(m)).toEqual(['dw-T1'])
    expect(m['dw-T1']).toMatchObject({ key: 'dw-T1', runs: 1, total: 10, correct: 7 })
    expect(m['dw-T1'].accuracy).toBeCloseTo(0.7)
    expect(m['dw-T1'].band).toBe(masteryBand(10, 0.7))
  })

  test('multiple runs on one drill aggregate runs/total/correct', () => {
    const entries = [
      run('dac-korrelat', 10, 5, {}, '2026-01-01T00:00:00.000Z'),
      run('dac-korrelat', 10, 9, {}, '2026-01-02T00:00:00.000Z'),
    ]
    const m = computeDrillMastery(entries)
    expect(m['dac-T11'].runs).toBe(2)
    expect(m['dac-T11'].total).toBe(20)
    expect(m['dac-T11'].correct).toBe(14)
    expect(m['dac-T11'].band).toBe(masteryBand(20, 14 / 20))
  })

  test('runs of two different drills stay in separate keys', () => {
    const m = computeDrillMastery([run('dw-hinher', 5, 5), run('dac-formation', 5, 1)])
    expect(Object.keys(m).sort()).toEqual(['dac-T1', 'dw-T1'])
  })
})

describe('the lifetime rollup (gt:drillTotals)', () => {
  test('bumpDrillTotals accumulates across multiple saves', () => {
    const e1 = run('dw-idiom', 10, 5, {}, '2026-01-01T00:00:00.000Z')
    bumpDrillTotals(e1, [])
    const e2 = run('dw-idiom', 10, 8, {}, '2026-01-02T00:00:00.000Z')
    bumpDrillTotals(e2, [e1])

    const m = computeDrillMastery([e2, e1])
    expect(m['dw-T9'].runs).toBe(2)
    expect(m['dw-T9'].total).toBe(20)
    expect(m['dw-T9'].correct).toBe(13)
  })

  test('seeds from existing history exactly once', () => {
    const history = [run('dac-register', 10, 10, {}, '2026-01-01T00:00:00.000Z')]
    const first = computeDrillMastery(history)
    expect(first['dac-T19'].total).toBe(10)

    // Corrupt the rollup directly. If a second call re-seeded from `history`
    // it would overwrite this back to 10 — asserting it stays at 999 proves
    // the marker guarded the seed to exactly one fold.
    const raw = JSON.parse(localStorage.getItem('gt:drillTotals')!)
    raw['dac-T19'].total = 999
    localStorage.setItem('gt:drillTotals', JSON.stringify(raw))

    const second = computeDrillMastery(history)
    expect(second['dac-T19'].total).toBe(999)
  })

  test('mastery survives beyond gt:quizHistory\'s 100-run cap', () => {
    clearHistory()
    // One high-volume, high-accuracy da-compounds run — band 5 on its own.
    saveQuizRun({
      type: 'dac-register',
      startedAt: '2020-01-01T00:00:00.000Z',
      finishedAt: '2020-01-01T00:01:00.000Z',
      durationMs: 60000, count: 60, correct: 58, meta: {},
    })
    // Fill gt:quizHistory's 100-run FIFO window with unrelated runs so the
    // dac-register run above is trimmed out of it entirely.
    for (let i = 0; i < 105; i++) {
      saveQuizRun({
        type: 'noun-gender',
        startedAt: '2021-01-01T00:00:00.000Z',
        finishedAt: '2021-01-01T00:01:00.000Z',
        durationMs: 60000, count: 5, correct: 5, meta: {},
      })
    }

    const window = loadHistory()
    expect(window).toHaveLength(100)
    expect(window.some(e => e.type === 'dac-register')).toBe(false)

    const mastery = computeDrillMastery(window)
    expect(mastery['dac-T19'].total).toBe(60)
    expect(mastery['dac-T19'].correct).toBe(58)
    expect(mastery['dac-T19'].band).toBe(5)
  })
})
