import { beforeEach, describe, expect, it } from 'vitest'
import { loadHistory, saveQuizRun, type SprechenErrorTag } from '../../src/composables/useQuizHistory'

beforeEach(() => { localStorage.removeItem('gt:quizHistory') })

describe('sprechen-teil2 history entries', () => {
  it('round-trips a summary-only Run with sprechen meta', () => {
    const counts: Partial<Record<SprechenErrorTag, number>> = { grammar: 3, vocabulary: 1 }
    saveQuizRun({
      type: 'sprechen-teil2',
      startedAt: new Date(1700000000000).toISOString(),
      finishedAt: new Date(1700000600000).toISOString(),
      durationMs: 600000,
      count: 100,
      correct: 74,
      meta: {
        topicTitle: 'Tempolimit',
        turnTarget: 6,
        learnerTurns: 6,
        sprechenScore: 74,
        sprechenPraedikat: 'befriedigend',
        sprechenCriteria: [
          { key: 'erfuellung', score: 20, maxPoints: 25 },
          { key: 'kohaerenz', score: 18, maxPoints: 25 },
          { key: 'wortschatz', score: 19, maxPoints: 25 },
          { key: 'strukturen', score: 17, maxPoints: 25 }
        ],
        sprechenMistakeCounts: counts,
        kiTippCount: 2,
        sprechenStrengths: [{ de: 'Gute Argumente', en: 'Good arguments' }],
        sprechenWeaknesses: [{ de: 'Kasusfehler', en: 'Case errors' }],
        sprechenOverallDe: 'Solide B2-Leistung.',
        sprechenOverallEn: 'Solid B2 performance.',
        passes: true
      }
    })
    const [entry] = loadHistory()
    expect(entry.type).toBe('sprechen-teil2')
    expect(entry.correct).toBe(74)
    expect(entry.meta.topicTitle).toBe('Tempolimit')
    expect(entry.meta.sprechenMistakeCounts?.grammar).toBe(3)
    expect(entry.meta.sprechenCriteria?.length).toBe(4)
  })
})
