import { describe, test, expect } from 'vitest'
import {
  weightedScore,
  computeWeakPoints,
  buildRemedialPlan,
  type WeakPoints
} from '../../src/composables/usePrepRemedial'
import type {
  QuizHistoryEntry,
  QuizHistoryType,
  PrepDrillItem
} from '../../src/composables/useQuizHistory'

// ── Helpers ─────────────────────────────────────────────────────────

let nextId = 5000
function entry(
  type: QuizHistoryType,
  sentenceItems: PrepDrillItem[]
): QuizHistoryEntry {
  const startedAt = new Date(2026, 4, 20, 10, 0, 0).toISOString()
  const finishedAt = new Date(Date.parse(startedAt) + 60_000).toISOString()
  const count = sentenceItems.length
  const correct = sentenceItems.filter(i => i.correct).length
  return {
    id: nextId++,
    type,
    startedAt,
    finishedAt,
    durationMs: 60_000,
    count,
    correct,
    meta: { sentenceItems }
  }
}

// ── weightedScore ───────────────────────────────────────────────────

describe('weightedScore', () => {
  test('1-of-1 is 0 (ln(1)=0)', () => {
    expect(weightedScore(1, 1)).toBe(0)
  })

  test('2-of-2 is ln(2)', () => {
    expect(weightedScore(2, 2)).toBe(Math.log(2))
  })

  test('seen=0 is 0', () => {
    expect(weightedScore(0, 0)).toBe(0)
  })

  test('monotonic with attempts at fixed error rate', () => {
    // 100% wrong: more attempts → higher score.
    const a = weightedScore(2, 2)
    const b = weightedScore(5, 5)
    const c = weightedScore(10, 10)
    expect(b).toBeGreaterThan(a)
    expect(c).toBeGreaterThan(b)
  })
})

// ── computeWeakPoints ───────────────────────────────────────────────

describe('computeWeakPoints — attribution', () => {
  test("tagged ['case'] → prep.wrong=1 & byTag.case=1, noun untouched", () => {
    const wp = computeWeakPoints([
      entry('prep-sentence', [
        {
          prepId: 'mit',
          prepGerman: 'mit',
          nounKeys: ['der Hund'],
          correct: false,
          tags: ['case']
        }
      ])
    ])
    const prep = wp.weakPreps.find(p => p.prepId === 'mit')!
    expect(prep.seen).toBe(1)
    expect(prep.wrong).toBe(1)
    expect(prep.byTag.case).toBe(1)
    expect(prep.byTag.preposition).toBe(0)
    const noun = wp.weakNouns.find(n => n.nounKey === 'der Hund')!
    expect(noun.seen).toBe(1)
    expect(noun.wrong).toBe(0)
    expect(wp.tagCounts.case).toBe(1)
  })

  test("tagged ['noun'] → noun.wrong=1, prep.wrong=0", () => {
    const wp = computeWeakPoints([
      entry('prep-sentence', [
        {
          prepId: 'mit',
          nounKeys: ['der Hund'],
          correct: false,
          tags: ['noun']
        }
      ])
    ])
    const prep = wp.weakPreps.find(p => p.prepId === 'mit')!
    expect(prep.wrong).toBe(0)
    expect(prep.seen).toBe(1)
    const noun = wp.weakNouns.find(n => n.nounKey === 'der Hund')!
    expect(noun.wrong).toBe(1)
    expect(wp.tagCounts.noun).toBe(1)
  })

  test("tagged ['typo'] → neither prep/noun wrong, tagCounts.typo=1", () => {
    const wp = computeWeakPoints([
      entry('prep-sentence', [
        {
          prepId: 'mit',
          nounKeys: ['der Hund'],
          correct: false,
          tags: ['typo']
        }
      ])
    ])
    const prep = wp.weakPreps.find(p => p.prepId === 'mit')!
    const noun = wp.weakNouns.find(n => n.nounKey === 'der Hund')!
    expect(prep.wrong).toBe(0)
    expect(noun.wrong).toBe(0)
    expect(wp.tagCounts.typo).toBe(1)
  })

  test('untagged wrong → both prep.wrong & noun.wrong increment, tagCounts unchanged', () => {
    const wp = computeWeakPoints([
      entry('prep-sentence', [
        {
          prepId: 'mit',
          nounKeys: ['der Hund'],
          correct: false
        }
      ])
    ])
    const prep = wp.weakPreps.find(p => p.prepId === 'mit')!
    const noun = wp.weakNouns.find(n => n.nounKey === 'der Hund')!
    expect(prep.wrong).toBe(1)
    expect(noun.wrong).toBe(1)
    expect(wp.tagCounts).toEqual({ preposition: 0, case: 0, noun: 0, typo: 0 })
  })

  test('correct item → only seen++ (no wrong, no tagCounts)', () => {
    const wp = computeWeakPoints([
      entry('prep-sentence', [
        { prepId: 'mit', nounKeys: ['der Hund'], correct: true }
      ])
    ])
    const prep = wp.weakPreps.find(p => p.prepId === 'mit')!
    const noun = wp.weakNouns.find(n => n.nounKey === 'der Hund')!
    expect(prep.seen).toBe(1)
    expect(prep.wrong).toBe(0)
    expect(prep.score).toBe(0)
    expect(noun.seen).toBe(1)
    expect(noun.wrong).toBe(0)
    expect(wp.tagCounts).toEqual({ preposition: 0, case: 0, noun: 0, typo: 0 })
  })

  test("tagged ['preposition'] increments byTag.preposition and prep.wrong", () => {
    const wp = computeWeakPoints([
      entry('prep-sentence', [
        { prepId: 'mit', correct: false, tags: ['preposition'] }
      ])
    ])
    const prep = wp.weakPreps.find(p => p.prepId === 'mit')!
    expect(prep.wrong).toBe(1)
    expect(prep.byTag.preposition).toBe(1)
    expect(wp.tagCounts.preposition).toBe(1)
  })

  test('prepGerman falls back to prepId when absent', () => {
    const wp = computeWeakPoints([
      entry('prep-sentence', [{ prepId: 'mit', correct: true }])
    ])
    expect(wp.weakPreps[0].german).toBe('mit')
  })

  test('entries of other type are ignored', () => {
    const wp = computeWeakPoints([
      entry('noun-gender', [
        { prepId: 'mit', nounKeys: ['der Hund'], correct: false, tags: ['case'] }
      ])
    ])
    expect(wp.weakPreps).toHaveLength(0)
    expect(wp.weakNouns).toHaveLength(0)
    expect(wp.tagCounts).toEqual({ preposition: 0, case: 0, noun: 0, typo: 0 })
  })

  test('prep-remedial entries are included', () => {
    const wp = computeWeakPoints([
      entry('prep-remedial', [
        { prepId: 'mit', correct: false, tags: ['case'] }
      ])
    ])
    expect(wp.weakPreps).toHaveLength(1)
    expect(wp.weakPreps[0].wrong).toBe(1)
  })

  test('accumulates across items and entries', () => {
    const wp = computeWeakPoints([
      entry('prep-sentence', [
        { prepId: 'mit', correct: false, tags: ['case'] },
        { prepId: 'mit', correct: true }
      ]),
      entry('prep-remedial', [
        { prepId: 'mit', correct: false, tags: ['preposition'] }
      ])
    ])
    const prep = wp.weakPreps.find(p => p.prepId === 'mit')!
    expect(prep.seen).toBe(3)
    expect(prep.wrong).toBe(2)
    expect(prep.byTag.case).toBe(1)
    expect(prep.byTag.preposition).toBe(1)
  })

  test('sorts weak lists by score descending', () => {
    // "stark": 4 wrong of 4 → high score. "weak": 1 wrong of 4 → lower score.
    const stark: PrepDrillItem[] = Array.from({ length: 4 }, () => ({
      prepId: 'stark',
      correct: false,
      tags: ['case'] as const
    }))
    const schwachItems: PrepDrillItem[] = [
      { prepId: 'schwach', correct: false, tags: ['case'] },
      { prepId: 'schwach', correct: true },
      { prepId: 'schwach', correct: true },
      { prepId: 'schwach', correct: true }
    ]
    const wp = computeWeakPoints([
      entry('prep-sentence', [...schwachItems, ...stark])
    ])
    expect(wp.weakPreps[0].prepId).toBe('stark')
    expect(wp.weakPreps[1].prepId).toBe('schwach')
    expect(wp.weakPreps[0].score).toBeGreaterThan(wp.weakPreps[1].score)
  })
})

// ── buildRemedialPlan ───────────────────────────────────────────────

function wpWith(
  tagCounts: WeakPoints['tagCounts'],
  prepIds: string[],
  nounKeys: string[]
): WeakPoints {
  return {
    weakPreps: prepIds.map(prepId => ({
      prepId,
      german: prepId,
      seen: 1,
      wrong: 1,
      byTag: { preposition: 0, case: 0 },
      score: 1
    })),
    weakNouns: nounKeys.map(nounKey => ({
      nounKey,
      seen: 1,
      wrong: 1,
      score: 1
    })),
    tagCounts
  }
}

describe('buildRemedialPlan', () => {
  test('proportional counts sum to length', () => {
    const wp = wpWith(
      { preposition: 3, case: 5, noun: 2, typo: 0 },
      ['a', 'b', 'c'],
      ['n1', 'n2']
    )
    const plan = buildRemedialPlan(wp, 10)
    const sum = plan.counts.caseFill + plan.counts.nounCard + plan.counts.sentence
    expect(sum).toBe(10)
  })

  test('case-heavy tagCounts → mostly caseFill', () => {
    const wp = wpWith(
      { preposition: 0, case: 10, noun: 0, typo: 0 },
      ['a', 'b'],
      ['n1']
    )
    const plan = buildRemedialPlan(wp, 10)
    expect(plan.counts.caseFill).toBe(10)
    expect(plan.counts.nounCard).toBe(0)
    expect(plan.counts.sentence).toBe(0)
  })

  test('fallback (all tagCounts 0, weak lists non-empty) → even split', () => {
    const wp = wpWith(
      { preposition: 0, case: 0, noun: 0, typo: 0 },
      ['a'],
      ['n1']
    )
    // Available groups: caseFill (preps), nounCard (nouns), sentence (preps) → 3 groups.
    const plan = buildRemedialPlan(wp, 9)
    expect(plan.counts.caseFill).toBe(3)
    expect(plan.counts.nounCard).toBe(3)
    expect(plan.counts.sentence).toBe(3)
  })

  test('group with no source items gets 0 and its share redistributes', () => {
    // noun weight present but NO weak nouns → nounCard must be 0.
    const wp = wpWith(
      { preposition: 0, case: 5, noun: 5, typo: 0 },
      ['a', 'b'],
      [] // no weak nouns
    )
    const plan = buildRemedialPlan(wp, 10)
    expect(plan.counts.nounCard).toBe(0)
    // The noun weight redistributes; only caseFill is weighted (case=5,
    // sentence weight = preposition+typo = 0) so all 10 go to caseFill.
    expect(plan.counts.caseFill).toBe(10)
    expect(plan.counts.sentence).toBe(0)
    expect(
      plan.counts.caseFill + plan.counts.nounCard + plan.counts.sentence
    ).toBe(10)
  })

  test('id/key arrays are populated top-weak first, capped to counts', () => {
    const wp = wpWith(
      { preposition: 0, case: 10, noun: 0, typo: 0 },
      ['a', 'b', 'c'],
      ['n1']
    )
    const plan = buildRemedialPlan(wp, 2)
    expect(plan.counts.caseFill).toBe(2)
    expect(plan.prepIdsForCase).toEqual(['a', 'b'])
  })

  test('no weak data at all → all-zero counts', () => {
    const wp = wpWith(
      { preposition: 0, case: 0, noun: 0, typo: 0 },
      [],
      []
    )
    const plan = buildRemedialPlan(wp, 10)
    expect(plan.counts).toEqual({ caseFill: 0, nounCard: 0, sentence: 0 })
  })

  test('typo weight feeds sentences when preps available', () => {
    const wp = wpWith(
      { preposition: 0, case: 0, noun: 0, typo: 8 },
      ['a'],
      []
    )
    const plan = buildRemedialPlan(wp, 8)
    expect(plan.counts.sentence).toBe(8)
    expect(plan.counts.caseFill).toBe(0)
    expect(plan.counts.nounCard).toBe(0)
  })
})
