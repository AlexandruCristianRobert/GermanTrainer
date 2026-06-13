import { describe, test, expect } from 'vitest'
import { computeVerbWeakPoints, weakKeysForRemedial, selectRemedialPool } from '../../src/composables/useVerbSentenceStats'
import type { QuizHistoryEntry } from '../../src/composables/useQuizHistory'

function run(items: any[]): QuizHistoryEntry {
  return {
    id: 1, type: 'verb-sentence', startedAt: '', finishedAt: '', durationMs: 0,
    count: items.length, correct: items.filter(i => i.correct).length,
    meta: { verbSentenceItems: items }
  }
}

describe('computeVerbWeakPoints', () => {
  test('ranks verbs by error rate weighted by log(seen)', () => {
    const entries = [run([
      { verbKeys: ['gehen'], nounKeys: ['Schule'], correct: false, tags: ['conjugation'] },
      { verbKeys: ['gehen'], nounKeys: [], correct: false, tags: ['conjugation'] },
      { verbKeys: ['gehen'], nounKeys: [], correct: true },
      { verbKeys: ['sehen'], nounKeys: [], correct: true }
    ])]
    const wp = computeVerbWeakPoints(entries)
    expect(wp.weakVerbs[0].verbKey).toBe('gehen')
    expect(wp.weakVerbs[0].seen).toBe(3)
    expect(wp.weakVerbs[0].wrong).toBe(2)
    expect(wp.tagCounts.conjugation).toBe(2)
  })
  test('a noun-tagged miss counts against the noun, not the verb', () => {
    const wp = computeVerbWeakPoints([run([
      { verbKeys: ['machen'], nounKeys: ['Katze'], correct: false, tags: ['noun'] }
    ])])
    const verb = wp.weakVerbs.find(v => v.verbKey === 'machen')!
    const noun = wp.weakNouns.find(n => n.nounKey === 'Katze')!
    expect(verb.wrong).toBe(0)  // miss was the noun's fault
    expect(noun.wrong).toBe(1)
  })
  test('a tagless miss blames every item it touched', () => {
    const wp = computeVerbWeakPoints([run([
      { verbKeys: ['fahren'], nounKeys: ['Bus'], correct: false }
    ])])
    expect(wp.weakVerbs.find(v => v.verbKey === 'fahren')!.wrong).toBe(1)
    expect(wp.weakNouns.find(n => n.nounKey === 'Bus')!.wrong).toBe(1)
  })
  test('ignores non-verb-sentence run types', () => {
    const e = run([{ verbKeys: ['x'], correct: false }]); e.type = 'noun-gender'
    const wp = computeVerbWeakPoints([e])
    expect(wp.weakVerbs).toHaveLength(0)
  })
  test('also reads verb-remedial runs', () => {
    const e = run([{ verbKeys: ['lesen'], correct: false, tags: ['conjugation'] }]); e.type = 'verb-remedial'
    const wp = computeVerbWeakPoints([e])
    expect(wp.weakVerbs[0].verbKey).toBe('lesen')
  })
})

describe('weakKeysForRemedial', () => {
  test('returns weakest verb + noun keys, capped', () => {
    const wp = computeVerbWeakPoints([run([
      { verbKeys: ['a'], correct: false, tags: ['conjugation'] },
      { verbKeys: ['b'], correct: false, tags: ['conjugation'] },
      { verbKeys: ['c'], correct: true },
      { verbKeys: ['d'], nounKeys: ['N1'], correct: false, tags: ['noun'] }
    ])])
    const keys = weakKeysForRemedial(wp, 2)
    expect(keys.verbKeys.length).toBeLessThanOrEqual(2)
    expect(keys.verbKeys).toContain('a')
    expect(keys.nounKeys).toContain('N1')
  })
  test('excludes items that were never wrong', () => {
    const wp = computeVerbWeakPoints([run([{ verbKeys: ['perfect'], correct: true }])])
    expect(weakKeysForRemedial(wp, 10).verbKeys).not.toContain('perfect')
  })
})

describe('selectRemedialPool', () => {
  test('uses weak refs when present', () => {
    const weak = [{ german: 'a', english: 'a', level: 'A1' as const }]
    const fallback = [{ german: 'x', english: 'x', level: 'A1' as const }]
    expect(selectRemedialPool(weak, fallback)).toEqual(weak)
  })
  test('falls back to the full pool when there are no weak refs', () => {
    const fallback = [{ german: 'x', english: 'x', level: 'A1' as const }]
    expect(selectRemedialPool([], fallback)).toEqual(fallback)
  })
})
