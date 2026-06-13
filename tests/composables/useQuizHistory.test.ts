import { describe, it, test, expect, beforeEach } from 'vitest'
import {
  loadHistory,
  saveQuizRun,
  clearHistory,
  type QuizHistoryEntry,
  type VerbDrillItem
} from '../../src/composables/useQuizHistory'

const STORAGE_KEY = 'gt:quizHistory'

function makeEntry(overrides: Partial<Omit<QuizHistoryEntry, 'id'>> = {}): Omit<QuizHistoryEntry, 'id'> {
  return {
    type: 'noun-gender',
    startedAt: new Date('2026-05-23T10:00:00Z').toISOString(),
    finishedAt: new Date('2026-05-23T10:02:00Z').toISOString(),
    durationMs: 120000,
    count: 10,
    correct: 7,
    meta: { mode: 'gender', groups: ['Food', 'Family'] },
    ...overrides
  }
}

describe('useQuizHistory', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear()
  })

  it('loadHistory returns [] when storage is empty', () => {
    expect(loadHistory()).toEqual([])
  })

  it('saveQuizRun persists an entry that loadHistory returns', () => {
    saveQuizRun(makeEntry())
    const all = loadHistory()
    expect(all).toHaveLength(1)
    expect(all[0].type).toBe('noun-gender')
    expect(all[0].correct).toBe(7)
  })

  it('saveQuizRun puts newest entry first', () => {
    saveQuizRun(makeEntry({ correct: 1, startedAt: new Date('2026-05-23T08:00:00Z').toISOString() }))
    saveQuizRun(makeEntry({ correct: 2, startedAt: new Date('2026-05-23T09:00:00Z').toISOString() }))
    saveQuizRun(makeEntry({ correct: 3, startedAt: new Date('2026-05-23T10:00:00Z').toISOString() }))
    const all = loadHistory()
    expect(all.map(e => e.correct)).toEqual([3, 2, 1])
  })

  it('saveQuizRun derives id from startedAt (parsed as ms)', () => {
    const startedAt = '2026-05-23T10:00:00.000Z'
    saveQuizRun(makeEntry({ startedAt }))
    expect(loadHistory()[0].id).toBe(Date.parse(startedAt))
  })

  it('clearHistory empties the store', () => {
    saveQuizRun(makeEntry())
    expect(loadHistory()).toHaveLength(1)
    clearHistory()
    expect(loadHistory()).toEqual([])
  })

  it('caps the history at 100 entries (FIFO trim from oldest)', () => {
    for (let i = 0; i < 110; i++) {
      saveQuizRun(makeEntry({
        correct: i,
        startedAt: new Date(2026, 4, 23, 0, 0, i).toISOString()
      }))
    }
    const all = loadHistory()
    expect(all).toHaveLength(100)
    // newest first, so [0].correct should be 109
    expect(all[0].correct).toBe(109)
    // oldest survivor should be correct=10 (0..9 trimmed)
    expect(all[99].correct).toBe(10)
  })

  it('survives malformed localStorage values', () => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, 'not-json-{{{')
    expect(loadHistory()).toEqual([])
  })

  it('keeps full entry shape including meta', () => {
    const meta = { levels: ['A1', 'A2'], types: ['regular'], cases: ['accusative'] }
    saveQuizRun(makeEntry({ type: 'verb-translation', meta }))
    const e = loadHistory()[0]
    expect(e.meta).toEqual(meta)
    expect(e.durationMs).toBe(120000)
    expect(e.count).toBe(10)
  })

  it('persists a konjunktiv-rewrite entry with K-I meta', () => {
    saveQuizRun({
      type: 'konjunktiv-rewrite',
      startedAt: new Date('2026-05-24T10:00:00Z').toISOString(),
      finishedAt: new Date('2026-05-24T10:05:00Z').toISOString(),
      durationMs: 300000,
      count: 10,
      correct: 7,
      meta: { kiDifficulty: 'medium', kiTopics: ['Politik', 'Wirtschaft'] }
    })
    const [entry] = loadHistory()
    expect(entry.type).toBe('konjunktiv-rewrite')
    expect(entry.meta.kiDifficulty).toBe('medium')
    expect(entry.meta.kiTopics).toEqual(['Politik', 'Wirtschaft'])
  })

  it('persists a passiv-transform entry with per-type breakdown', () => {
    saveQuizRun({
      type: 'passiv-transform',
      startedAt: new Date('2026-05-24T11:00:00Z').toISOString(),
      finishedAt: new Date('2026-05-24T11:06:00Z').toISOString(),
      durationMs: 360000,
      count: 8,
      correct: 6,
      meta: {
        passivDifficulty: 'hard',
        passivFocusedTypes: ['vorgangspassiv', 'sich-lassen'],
        passivPerTypeCorrect: {
          'vorgangspassiv': { correct: 3, total: 4 },
          'sich-lassen': { correct: 3, total: 4 }
        }
      }
    })
    const [entry] = loadHistory()
    expect(entry.type).toBe('passiv-transform')
    expect(entry.meta.passivDifficulty).toBe('hard')
    expect(entry.meta.passivPerTypeCorrect?.['vorgangspassiv']).toEqual({ correct: 3, total: 4 })
  })

  it('persists a writing-grade entry with full meta', () => {
    saveQuizRun({
      type: 'writing-grade',
      startedAt: new Date('2026-05-24T13:00:00Z').toISOString(),
      finishedAt: new Date('2026-05-24T13:25:00Z').toISOString(),
      durationMs: 1_500_000,
      count: 1,
      correct: 1,
      meta: {
        promptId: 'wp-forum-wohnen-stadt-land',
        taskType: 'forumsbeitrag',
        rubric: 'goethe-c1',
        bandEstimate: 'C1',
        totalScore: 78,
        wordCount: 232
      }
    })
    const [entry] = loadHistory()
    expect(entry.type).toBe('writing-grade')
    expect(entry.meta.promptId).toBe('wp-forum-wohnen-stadt-land')
    expect(entry.meta.taskType).toBe('forumsbeitrag')
    expect(entry.meta.rubric).toBe('goethe-c1')
    expect(entry.meta.bandEstimate).toBe('C1')
    expect(entry.meta.totalScore).toBe(78)
    expect(entry.meta.wordCount).toBe(232)
  })

  it('persists a simulator-c1 entry with combined-score meta', () => {
    saveQuizRun({
      type: 'simulator-c1',
      startedAt: new Date('2026-05-24T09:00:00Z').toISOString(),
      finishedAt: new Date('2026-05-24T10:08:00Z').toISOString(),
      durationMs: 4_080_000,            // 68 minutes
      count: 1,
      correct: 1,
      meta: {
        sessionId: 'sim-abc-123',
        task1Score: 78,
        task2Score: 65,
        combinedScore: 73,              // 78*0.6 + 65*0.4 = 72.8 → 73
        passes: true
      }
    })
    const [entry] = loadHistory()
    expect(entry.type).toBe('simulator-c1')
    expect(entry.meta.sessionId).toBe('sim-abc-123')
    expect(entry.meta.task1Score).toBe(78)
    expect(entry.meta.task2Score).toBe(65)
    expect(entry.meta.combinedScore).toBe(73)
    expect(entry.meta.passes).toBe(true)
  })
})

describe('verb-sentence history', () => {
  test('round-trips a verb-sentence run with per-item data', () => {
    clearHistory()
    const items: VerbDrillItem[] = [{ verbKeys: ['gehen'], nounKeys: ['Schule'], correct: false, tags: ['conjugation'] }]
    saveQuizRun({
      type: 'verb-sentence', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
      durationMs: 1000, count: 1, correct: 0,
      meta: { verbSentenceLevels: ['A1'], verbsPerSentence: 'mix', verbSentenceNounsPer: 1, verbSentenceHints: true, verbSentenceItems: items }
    })
    const all = loadHistory()
    expect(all[0].type).toBe('verb-sentence')
    expect(all[0].meta.verbSentenceItems?.[0].verbKeys).toEqual(['gehen'])
    clearHistory()
  })
})
