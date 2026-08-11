import { describe, test, expect } from 'vitest'
import { computeDativeWeakPoints, weakestDativeVerbs, weightedScore } from '../../src/composables/useDativeStats'
import type { DatDrillItem, QuizHistoryEntry } from '../../src/composables/useQuizHistory'

function entry(type: string, items: DatDrillItem[]): QuizHistoryEntry {
  return { type, meta: { datSentenceItems: items } } as unknown as QuizHistoryEntry
}
const miss = (verb: string, tags?: DatDrillItem['tags']): DatDrillItem =>
  ({ verb, family: 'co-agent', correct: false, ...(tags ? { tags } : {}) })
const hit = (verb: string): DatDrillItem => ({ verb, family: 'co-agent', correct: true })

describe('computeDativeWeakPoints', () => {
  test('aggregates per verb across runs; only dat-sentence entries count', () => {
    const wp = computeDativeWeakPoints([
      entry('dat-sentence', [miss('helfen', ['case']), hit('danken')]),
      entry('dat-sentence', [miss('helfen', ['case', 'typo'])]),
      entry('dw-sentence', [miss('helfen', ['case'])]),
    ])
    const h = wp.weakVerbs.find(v => v.verb === 'helfen')!
    expect(h.wrong).toBe(2)
    expect(h.seen).toBe(2)
    expect(wp.tagCounts.case).toBe(2)   // the dw-sentence entry is invisible here
    expect(wp.tagCounts.typo).toBe(1)
    const d = wp.weakVerbs.find(v => v.verb === 'danken')!
    expect(d.wrong).toBe(0)
    expect(d.seen).toBe(1)
  })

  test('a noun-only miss never blames the verb (the DW precedent)', () => {
    const wp = computeDativeWeakPoints([entry('dat-sentence', [miss('gefallen', ['noun'])])])
    const g = wp.weakVerbs.find(v => v.verb === 'gefallen')!
    expect(g.wrong).toBe(0)
    expect(g.seen).toBe(1)
    expect(wp.tagCounts.noun).toBe(1)
  })

  test('an untagged miss blames the verb', () => {
    const wp = computeDativeWeakPoints([entry('dat-sentence', [miss('folgen')])])
    expect(wp.weakVerbs.find(v => v.verb === 'folgen')!.wrong).toBe(1)
  })

  test('weightedScore: 1-of-1 wrong scores 0; repeated evidence outranks it', () => {
    expect(weightedScore(1, 1)).toBe(0)
    expect(weightedScore(2, 2)).toBeGreaterThan(0)
  })
})

describe('weakestDativeVerbs', () => {
  const entries = [entry('dat-sentence', [
    miss('helfen', ['case']), miss('helfen', ['case']), hit('helfen'),
    miss('danken', ['case']),
    hit('gefallen'),
  ])]

  test('returns only verbs with misses, worst first', () => {
    const out = weakestDativeVerbs(entries, 8)
    expect(out[0]).toBe('helfen')
    expect(out).toContain('danken')
    expect(out).not.toContain('gefallen')
  })

  test('respects the limit', () => {
    expect(weakestDativeVerbs(entries, 1)).toEqual(['helfen'])
  })
})
