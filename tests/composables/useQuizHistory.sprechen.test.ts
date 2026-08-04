import { beforeEach, describe, expect, it } from 'vitest'
import { loadHistory, saveQuizRun, type SprechenErrorTag } from '../../src/composables/useQuizHistory'
import { QUIZ_TYPE_LABEL, QUIZ_TYPE_DE, QUIZ_TYPES_ORDER } from '../../src/components/charts/quiz-type-labels'
import { USER_DATA_KEYS } from '../../src/composables/useUserData'

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

describe('sprechen-drill history type', () => {
  it('has an English and a German label', () => {
    expect(QUIZ_TYPE_LABEL['sprechen-drill']).toBeTruthy()
    expect(QUIZ_TYPE_DE['sprechen-drill']).toBeTruthy()
  })

  it('appears in the display order next to the Teil 2 entry', () => {
    const i2 = QUIZ_TYPES_ORDER.indexOf('sprechen-teil2')
    const id = QUIZ_TYPES_ORDER.indexOf('sprechen-drill')
    expect(id).toBeGreaterThan(-1)
    expect(id).toBe(i2 + 1)
  })

  it('records and reads back a drill Run', () => {
    saveQuizRun({
      type: 'sprechen-drill',
      startedAt: new Date(1000).toISOString(),
      finishedAt: new Date(2000).toISOString(),
      durationMs: 1000, count: 5, correct: 3,
      meta: { sprechenDrilledKinds: { grammar: 3, register: 2 } }
    })
    const row = loadHistory().find(h => h.type === 'sprechen-drill')
    expect(row?.correct).toBe(3)
    expect(row?.count).toBe(5)
  })
})

describe('sprechen-teil1 history type', () => {
  it('round-trips a Teil 1 Run with its full meta', () => {
    localStorage.removeItem('gt:quizHistory')
    saveQuizRun({
      type: 'sprechen-teil1',
      startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
      durationMs: 1000, count: 1, correct: 1,
      meta: {
        topicTitle: 'Ehrenamtliches Engagement',
        sprechenScore: 74, maxScore: 100, passes: true, sprechenPraedikat: 'befriedigend',
        sprechenCriteria: [{ key: 'erfuellung', score: 21, maxPoints: 25 }],
        sprechenModality: 'spoken',
        sectionsCovered: 5,
        spokenSeconds: 231,
        wordCount: 352,
        sprechenVortragsmittel: ['vm-einstieg-1'],
        kiTippCount: 1,
        sprechenHelps: { hints: true, checklist: true, kiTipp: true, hardLimit: false },
        sprechenAufwertungen: [{ quote: 'a', better: 'b', whyDe: 'c', whyEn: 'd' }],
        sprechenMistakeCounts: { grammar: 2 }
      }
    })
    const [run] = loadHistory()
    expect(run.type).toBe('sprechen-teil1')
    expect(run.meta.sectionsCovered).toBe(5)
    expect(run.meta.sprechenAufwertungen).toHaveLength(1)
    expect(run.meta.sprechenHelps?.hardLimit).toBe(false)
  })

  it('is labelled everywhere a chart or a page enumerates types', () => {
    expect(QUIZ_TYPE_LABEL['sprechen-teil1']).toBeTruthy()
    expect(QUIZ_TYPE_DE['sprechen-teil1']).toContain('Vortrag')
    expect(QUIZ_TYPES_ORDER).toContain('sprechen-teil1')
  })

  it('registers the Teil 1 user-data keys for export and import', () => {
    expect(USER_DATA_KEYS).toContain('sprechenTeil1Setup')
    expect(USER_DATA_KEYS).toContain('gt:sprechenCustomVortragsthemen')
  })
})
