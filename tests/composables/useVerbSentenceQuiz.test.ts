import { describe, test, expect } from 'vitest'
import {
  verbToRef, buildVerbSpecs, type VerbRef
} from '../../src/composables/useVerbSentenceQuiz'
import type { NounRef } from '../../src/composables/useSentenceQuiz'
import type { Verb } from '../../src/data/verbs'

const VERBS_FIX: VerbRef[] = [
  { german: 'gehen', english: 'go', level: 'A1' },
  { german: 'machen', english: 'make / do', level: 'A1' },
  { german: 'verstehen', english: 'understand', level: 'A2' }
]
const NOUNS_FIX: NounRef[] = [
  { german: 'Tisch', article: 'der', english: 'table' },
  { german: 'Katze', article: 'die', english: 'cat' }
]
// Deterministic RNG: cycles through the given values.
function seqRng(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

describe('verbToRef', () => {
  test('projects a Verb to the lean ref', () => {
    const v = { german: 'gehen', english: 'go', level: 'A1' } as Verb
    expect(verbToRef(v)).toEqual({ german: 'gehen', english: 'go', level: 'A1' })
  })
})

describe('buildVerbSpecs', () => {
  test('produces exactly `count` specs, indexed 0..count-1', () => {
    const specs = buildVerbSpecs(VERBS_FIX, NOUNS_FIX, 4, 1, 1, seqRng([0]))
    expect(specs).toHaveLength(4)
    expect(specs.map(s => s.index)).toEqual([0, 1, 2, 3])
  })
  test('fixed verbsPer / nounsPer honoured', () => {
    const specs = buildVerbSpecs(VERBS_FIX, NOUNS_FIX, 3, 2, 1, seqRng([0]))
    for (const s of specs) {
      expect(s.verbs.length).toBe(2)
      expect(s.nouns.length).toBe(1)
    }
  })
  test('verbs within a sentence are distinct', () => {
    const specs = buildVerbSpecs(VERBS_FIX, NOUNS_FIX, 5, 2, 2, seqRng([0, 0.5, 0.9, 0.1]))
    for (const s of specs) {
      const keys = s.verbs.map(v => v.german)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })
  test("'mix' yields 1 or 2 depending on rng", () => {
    const one = buildVerbSpecs(VERBS_FIX, NOUNS_FIX, 1, 'mix', 'mix', seqRng([0.2]))[0]
    expect(one.verbs.length).toBe(1)
    const two = buildVerbSpecs(VERBS_FIX, NOUNS_FIX, 1, 'mix', 'mix', seqRng([0.8]))[0]
    expect(two.verbs.length).toBe(2)
  })
  test('empty verb pool → specs with empty verb arrays (no crash)', () => {
    const specs = buildVerbSpecs([], NOUNS_FIX, 2, 1, 1, seqRng([0]))
    expect(specs).toHaveLength(2)
    expect(specs[0].verbs).toEqual([])
  })
})
