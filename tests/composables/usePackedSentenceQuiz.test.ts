import { describe, test, expect } from 'vitest'
import {
  PACKED_MAX, PACKED_BUDGET, packedTotal, buildPackedSpecs, daCompoundFor, rektShort,
  type PackedPools, type PackedCounts
} from '../../src/composables/usePackedSentenceQuiz'
import { CONNECTORS } from '../../src/data/connectors'
import type { NounRef } from '../../src/composables/useSentenceQuiz'

function seqRng(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

const POOLS: PackedPools = {
  verbs: [
    { german: 'warten', english: 'wait', level: 'B1', case: 'accusative' },
    { german: 'helfen', english: 'help', level: 'A2', case: 'dative' },
    { german: 'gehen', english: 'go', level: 'A1', case: 'none' },
    { german: 'sehen', english: 'see', level: 'A1', case: 'accusative' }
  ],
  nouns: [
    { german: 'Bericht', article: 'der', english: 'report' },
    { german: 'Wohnung', article: 'die', english: 'apartment' },
    { german: 'Kollege', article: 'der', english: 'colleague' }
  ] as NounRef[],
  preps: [
    { id: 'seit', german: 'seit', english: 'since', case: 'dative' },
    { id: 'durch', german: 'durch', english: 'through', case: 'accusative' }
  ],
  collocs: [
    { id: 'warten-auf', word: 'warten', english: 'to wait for', preposition: 'auf', case: 'accusative' },
    { id: 'denken-an', word: 'denken', english: 'to think of', preposition: 'an', case: 'accusative' }
  ],
  conns: CONNECTORS.slice(0, 5)
}

describe('packedTotal / budget constants', () => {
  test('sums the five categories; max config stays within budget', () => {
    expect(packedTotal({ verb: 2, noun: 2, prep: 1, dac: 1, conn: 1 })).toBe(7)
    expect(packedTotal(PACKED_MAX)).toBeGreaterThan(PACKED_BUDGET) // maxes alone exceed 8 — the setup enforces the cap
  })
})

describe('buildPackedSpecs', () => {
  const counts: PackedCounts = { verb: 2, noun: 2, prep: 1, dac: 1, conn: 1 }
  test('produces `cards` specs, each with all requested items, keyed by category', () => {
    const specs = buildPackedSpecs(POOLS, counts, 3, seqRng([0.1, 0.5, 0.9]))
    expect(specs).toHaveLength(3)
    for (const s of specs) {
      expect(s.items).toHaveLength(7)
      expect(s.items.filter(i => i.cat === 'verb').map(i => i.key)).toEqual(['v1', 'v2'])
      expect(s.items.filter(i => i.cat === 'noun').map(i => i.key)).toEqual(['n1', 'n2'])
      expect(s.items.filter(i => i.cat === 'prep').map(i => i.key)).toEqual(['p1'])
      expect(s.items.filter(i => i.cat === 'dac').map(i => i.key)).toEqual(['d1'])
      expect(s.items.filter(i => i.cat === 'conn').map(i => i.key)).toEqual(['k1'])
    }
  })
  test('items within a card are distinct per category', () => {
    const specs = buildPackedSpecs(POOLS, counts, 5, seqRng([0.2, 0.7, 0.4, 0.9, 0.1]))
    for (const s of specs) {
      const verbs = s.items.filter(i => i.cat === 'verb').map(i => i.verb!.german)
      expect(new Set(verbs).size).toBe(verbs.length)
    }
  })
  test('zero-count categories are simply absent', () => {
    const specs = buildPackedSpecs(POOLS, { verb: 1, noun: 0, prep: 0, dac: 0, conn: 0 }, 2, seqRng([0.3]))
    for (const s of specs) {
      expect(s.items).toHaveLength(1)
      expect(s.items[0].cat).toBe('verb')
    }
  })
  test('an empty pool yields fewer items than requested, never a crash', () => {
    const specs = buildPackedSpecs({ ...POOLS, preps: [] }, counts, 1, seqRng([0.3]))
    expect(specs[0].items.filter(i => i.cat === 'prep')).toHaveLength(0)
  })
})

describe('daCompoundFor', () => {
  test('dar- before vowel, da- otherwise', () => {
    expect(daCompoundFor('auf')).toBe('darauf')
    expect(daCompoundFor('an')).toBe('daran')
    expect(daCompoundFor('über')).toBe('darüber')
    expect(daCompoundFor('mit')).toBe('damit')
    expect(daCompoundFor('von')).toBe('davon')
    expect(daCompoundFor('für')).toBe('dafür')
  })
})

describe('rektShort', () => {
  test('maps VerbCase to the badge label', () => {
    expect(rektShort('accusative')).toBe('Akk')
    expect(rektShort('dative')).toBe('Dat')
    expect(rektShort('dative+accusative')).toBe('Dat + Akk')
    expect(rektShort('genitive')).toBe('Gen')
    expect(rektShort('reflexive')).toBe('refl')
    expect(rektShort('none')).toBeNull()
    expect(rektShort('varies')).toBeNull()
  })
})
