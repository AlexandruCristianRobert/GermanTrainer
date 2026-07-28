import { describe, test, expect } from 'vitest'
import { computeDwWeakPoints } from '../../src/composables/useDwSentenceStats'
import type { QuizHistoryEntry } from '../../src/composables/useQuizHistory'

function run(items: any[]): QuizHistoryEntry {
  return {
    id: 1, type: 'dw-sentence', startedAt: '', finishedAt: '', durationMs: 0,
    count: items.length, correct: items.filter(i => i.correct).length,
    meta: { dwSentenceItems: items }
  } as QuizHistoryEntry
}

function runAnswer(items: any[]): QuizHistoryEntry {
  return {
    id: 2, type: 'dw-answer', startedAt: '', finishedAt: '', durationMs: 0,
    count: items.length, correct: items.filter(i => i.correct).length,
    meta: { dwAnswerItems: items }
  } as QuizHistoryEntry
}

describe('computeDwWeakPoints', () => {
  test('ranks pairs by error rate weighted by log(seen)', () => {
    const entries = [run([
      { pair: 'auf', compound: 'herauf', correct: false, tags: ['direction'] },
      { pair: 'auf', compound: 'herauf', correct: false, tags: ['case'] },
      { pair: 'auf', compound: 'herauf', correct: true },
      { pair: 'ein', compound: 'hinein', correct: true }
    ])]
    const wp = computeDwWeakPoints(entries)
    expect(wp.weakPairs[0].pair).toBe('auf')
    expect(wp.weakPairs[0].seen).toBe(3)
    expect(wp.weakPairs[0].wrong).toBe(2)
    expect(wp.tagCounts.direction).toBe(1)
    expect(wp.tagCounts.case).toBe(1)
  })

  test('compoundExamples collects distinct compounds seen for the pair', () => {
    const wp = computeDwWeakPoints([run([
      { pair: 'auf', compound: 'herauf', correct: false, tags: ['direction'] },
      { pair: 'auf', compound: 'hinauf', correct: false, tags: ['direction'] },
      { pair: 'auf', compound: 'herauf', correct: true }
    ])])
    expect(wp.weakPairs[0].compoundExamples).toEqual(['herauf', 'hinauf'])
  })

  test('a noun-tagged miss does not count against the pair', () => {
    const wp = computeDwWeakPoints([run([
      { pair: 'auf', compound: 'herauf', nounKeys: ['Katze'], correct: false, tags: ['noun'] }
    ])])
    const pair = wp.weakPairs.find(p => p.pair === 'auf')!
    expect(pair.wrong).toBe(0)
    expect(pair.seen).toBe(1)
    expect(wp.tagCounts.noun).toBe(1)
  })

  test('a tagless miss blames the pair', () => {
    const wp = computeDwWeakPoints([run([
      { pair: 'auf', compound: 'herauf', correct: false }
    ])])
    expect(wp.weakPairs.find(p => p.pair === 'auf')!.wrong).toBe(1)
  })

  test.each(['direction', 'conjugation', 'case', 'word-order', 'typo'] as const)(
    'a "%s"-tagged miss blames the pair',
    (tag) => {
      const wp = computeDwWeakPoints([run([
        { pair: 'x', compound: 'herx', correct: false, tags: [tag] }
      ])])
      expect(wp.weakPairs[0].wrong).toBe(1)
    }
  )

  test('ignores non-dw run types', () => {
    const e = run([{ pair: 'auf', compound: 'herauf', correct: false }])
    e.type = 'dac-formation' as any
    const wp = computeDwWeakPoints([e])
    expect(wp.weakPairs).toHaveLength(0)
  })

  test('reads dw-answer entries from meta.dwAnswerItems (T7)', () => {
    const wp = computeDwWeakPoints([runAnswer([
      { pair: 'auf', compound: 'herauf', correct: false, tags: ['word-order'] },
      { pair: 'auf', compound: 'herauf', correct: true }
    ])])
    expect(wp.weakPairs[0].pair).toBe('auf')
    expect(wp.weakPairs[0].seen).toBe(2)
    expect(wp.weakPairs[0].wrong).toBe(1)
    expect(wp.tagCounts['word-order']).toBe(1)
  })

  test('dw-sentence and dw-answer runs aggregate onto the same pair', () => {
    const wp = computeDwWeakPoints([
      run([{ pair: 'auf', compound: 'herauf', correct: false, tags: ['direction'] }]),
      runAnswer([{ pair: 'auf', compound: 'herauf', correct: false, tags: ['word-order'] }])
    ])
    const pair = wp.weakPairs.find(p => p.pair === 'auf')!
    expect(pair.seen).toBe(2)
    expect(pair.wrong).toBe(2)
  })

  test('a "word-order"-tagged miss alongside "noun" still blames the pair, and both tags are counted', () => {
    const wp = computeDwWeakPoints([runAnswer([
      { pair: 'auf', compound: 'herauf', nounKeys: ['Katze'], correct: false, tags: ['word-order', 'noun'] }
    ])])
    const pair = wp.weakPairs.find(p => p.pair === 'auf')!
    expect(pair.wrong).toBe(1)
    expect(wp.tagCounts.noun).toBe(1)
    expect(wp.tagCounts['word-order']).toBe(1)
  })

  test('a correct answer never counts as wrong even without tags', () => {
    const wp = computeDwWeakPoints([run([
      { pair: 'auf', compound: 'herauf', correct: true }
    ])])
    expect(wp.weakPairs[0].wrong).toBe(0)
  })

  test('orders pairs by weighted score, worse pair first', () => {
    const wp = computeDwWeakPoints([run([
      // 'auf': 1 wrong / 2 seen — high error rate, low volume
      { pair: 'auf', compound: 'herauf', correct: false, tags: ['direction'] },
      { pair: 'auf', compound: 'herauf', correct: true },
      // 'ein': 3 wrong / 10 seen — lower error rate but more attempts; log(seen) weighting
      { pair: 'ein', compound: 'hinein', correct: false, tags: ['direction'] },
      { pair: 'ein', compound: 'hinein', correct: false, tags: ['direction'] },
      { pair: 'ein', compound: 'hinein', correct: false, tags: ['direction'] },
      { pair: 'ein', compound: 'hinein', correct: true },
      { pair: 'ein', compound: 'hinein', correct: true },
      { pair: 'ein', compound: 'hinein', correct: true },
      { pair: 'ein', compound: 'hinein', correct: true },
      { pair: 'ein', compound: 'hinein', correct: true },
      { pair: 'ein', compound: 'hinein', correct: true },
      { pair: 'ein', compound: 'hinein', correct: true }
    ])])
    expect(wp.weakPairs.map(p => p.pair)).toEqual(['ein', 'auf'])
    expect(wp.weakPairs[0].score).toBeGreaterThan(wp.weakPairs[1].score)
  })

  test('empty history returns empty arrays and zeroed tag counts', () => {
    const wp = computeDwWeakPoints([])
    expect(wp.weakPairs).toEqual([])
    expect(wp.tagCounts).toEqual({
      direction: 0, conjugation: 0, case: 0, 'word-order': 0, noun: 0, typo: 0
    })
  })
})
