import { describe, test, expect } from 'vitest'
import { computeDacWeakPoints } from '../../src/composables/useDacSentenceStats'
import type { QuizHistoryEntry } from '../../src/composables/useQuizHistory'

function run(items: any[]): QuizHistoryEntry {
  return {
    id: 1, type: 'dac-sentence', startedAt: '', finishedAt: '', durationMs: 0,
    count: items.length, correct: items.filter(i => i.correct).length,
    meta: { dacSentenceItems: items }
  }
}

function runAnswer(items: any[]): QuizHistoryEntry {
  return {
    id: 2, type: 'dac-answer', startedAt: '', finishedAt: '', durationMs: 0,
    count: items.length, correct: items.filter(i => i.correct).length,
    meta: { dacAnswerItems: items }
  }
}

describe('computeDacWeakPoints', () => {
  test('ranks collocations by error rate weighted by log(seen)', () => {
    const entries = [run([
      { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', correct: false, tags: ['preposition'] },
      { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', correct: false, tags: ['compound'] },
      { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', correct: true },
      { collocId: 'denken-an', collocWord: 'denken', prepGerman: 'an', correct: true }
    ])]
    const wp = computeDacWeakPoints(entries)
    expect(wp.weakCollocs[0].collocId).toBe('warten-auf')
    expect(wp.weakCollocs[0].seen).toBe(3)
    expect(wp.weakCollocs[0].wrong).toBe(2)
    expect(wp.tagCounts.preposition).toBe(1)
    expect(wp.tagCounts.compound).toBe(1)
  })

  test('label combines collocWord and prepGerman', () => {
    const wp = computeDacWeakPoints([run([
      { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', correct: false }
    ])])
    expect(wp.weakCollocs[0].label).toBe('warten · auf')
  })

  test('a noun-tagged miss does not count against the colloc or the preposition', () => {
    const wp = computeDacWeakPoints([run([
      { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', nounKeys: ['Katze'], correct: false, tags: ['noun'] }
    ])])
    const colloc = wp.weakCollocs.find(c => c.collocId === 'warten-auf')!
    const prep = wp.weakPreps.find(p => p.prepGerman === 'auf')!
    expect(colloc.wrong).toBe(0)
    expect(prep.wrong).toBe(0)
    expect(wp.tagCounts.noun).toBe(1)
  })

  test('a tagless miss blames both the collocation and the preposition', () => {
    const wp = computeDacWeakPoints([run([
      { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', correct: false }
    ])])
    expect(wp.weakCollocs.find(c => c.collocId === 'warten-auf')!.wrong).toBe(1)
    expect(wp.weakPreps.find(p => p.prepGerman === 'auf')!.wrong).toBe(1)
  })

  test.each(['preposition', 'compound', 'case', 'typo', 'word-order'] as const)(
    'a "%s"-tagged miss blames the collocation',
    (tag) => {
      const wp = computeDacWeakPoints([run([
        { collocId: 'x', collocWord: 'x', prepGerman: 'y', correct: false, tags: [tag] }
      ])])
      expect(wp.weakCollocs[0].wrong).toBe(1)
    }
  )

  test('ignores non-dac run types', () => {
    const e = run([{ collocId: 'x', collocWord: 'x', prepGerman: 'y', correct: false }])
    e.type = 'dac-formation'
    const wp = computeDacWeakPoints([e])
    expect(wp.weakCollocs).toHaveLength(0)
    expect(wp.weakPreps).toHaveLength(0)
  })

  test('reads dac-answer entries from meta.dacAnswerItems (T17)', () => {
    const wp = computeDacWeakPoints([runAnswer([
      { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', correct: false, tags: ['word-order'] },
      { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', correct: true }
    ])])
    expect(wp.weakCollocs[0].collocId).toBe('warten-auf')
    expect(wp.weakCollocs[0].seen).toBe(2)
    expect(wp.weakCollocs[0].wrong).toBe(1)
    expect(wp.tagCounts['word-order']).toBe(1)
  })

  test('dac-sentence and dac-answer runs aggregate onto the same collocation and preposition', () => {
    const wp = computeDacWeakPoints([
      run([{ collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', correct: false, tags: ['preposition'] }]),
      runAnswer([{ collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', correct: false, tags: ['word-order'] }])
    ])
    const colloc = wp.weakCollocs.find(c => c.collocId === 'warten-auf')!
    const prep = wp.weakPreps.find(p => p.prepGerman === 'auf')!
    expect(colloc.seen).toBe(2)
    expect(colloc.wrong).toBe(2)
    expect(prep.seen).toBe(2)
    expect(prep.wrong).toBe(2)
  })

  test('a "word-order"-tagged miss in a dac-answer entry does not blame the noun', () => {
    const wp = computeDacWeakPoints([runAnswer([
      { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', nounKeys: ['Katze'], correct: false, tags: ['word-order', 'noun'] }
    ])])
    const colloc = wp.weakCollocs.find(c => c.collocId === 'warten-auf')!
    expect(colloc.wrong).toBe(1)
    expect(wp.tagCounts.noun).toBe(1)
    expect(wp.tagCounts['word-order']).toBe(1)
  })

  test('preps keyed by prepGerman aggregate across collocations', () => {
    const wp = computeDacWeakPoints([run([
      { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', correct: false, tags: ['preposition'] },
      { collocId: 'sich-freuen-auf', collocWord: 'sich freuen', prepGerman: 'auf', correct: false, tags: ['preposition'] }
    ])])
    const prep = wp.weakPreps.find(p => p.prepGerman === 'auf')!
    expect(prep.seen).toBe(2)
    expect(prep.wrong).toBe(2)
  })

  test('a correct answer never counts as wrong even without tags', () => {
    const wp = computeDacWeakPoints([run([
      { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', correct: true }
    ])])
    expect(wp.weakCollocs[0].wrong).toBe(0)
    expect(wp.weakPreps[0].wrong).toBe(0)
  })
})
