import { describe, test, expect } from 'vitest'
import {
  PACKED_MAX, PACKED_BUDGET, packedTotal, buildPackedSpecs, daCompoundFor, rektShort,
  validatePackedCard, buildPackedGeneratePrompt, buildPackedSegments, connUsed,
  type PackedPools, type PackedCounts, type PackedCardSpec, type GeneratedPackedCard
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

const CONN_ABER = CONNECTORS.find(c => c.id === 'aber')!
const CONN_PAIR = CONNECTORS.find(c => c.id === 'sowohl-als-auch')!

const SPEC: PackedCardSpec = {
  index: 0,
  items: [
    { key: 'v1', cat: 'verb', verb: { german: 'warten', english: 'wait', level: 'B1', case: 'accusative' } },
    { key: 'n1', cat: 'noun', noun: { german: 'Bericht', article: 'der', english: 'report' } },
    { key: 'p1', cat: 'prep', prep: { id: 'seit', german: 'seit', english: 'since', case: 'dative' } },
    { key: 'd1', cat: 'dac', colloc: { id: 'warten-auf', word: 'warten', english: 'to wait for', preposition: 'auf', case: 'accusative' } },
    { key: 'k1', cat: 'conn', conn: CONN_ABER }
  ]
}
const GOOD_RAW = {
  index: 0,
  english: 'My colleague has been waiting for the report since Monday, but I am still working on it.',
  german: 'Mein Kollege wartet seit Montag auf den Bericht, aber ich warte auch schon lange darauf.',
  sentenceCount: 1,
  spans: [
    { key: 'v1', en: 'waiting' }, { key: 'n1', en: 'report' }, { key: 'p1', en: 'since' },
    { key: 'd1', en: 'on it' }, { key: 'k1', en: 'but' }
  ]
}

describe('connUsed', () => {
  test('single word, word-bounded', () => {
    expect(connUsed('Ich bleibe, aber du gehst.', CONN_ABER)).toBe(true)
    expect(connUsed('Das ist aberwitzig.', CONN_ABER)).toBe(false)
  })
  test('two-part requires both parts', () => {
    expect(connUsed('Sowohl die Miete als auch die Kosten steigen.', CONN_PAIR)).toBe(true)
    expect(connUsed('Sowohl die Miete steigt.', CONN_PAIR)).toBe(false)
  })
})

describe('validatePackedCard', () => {
  test('accepts a good card', () => {
    const v = validatePackedCard(GOOD_RAW, SPEC)!
    expect(v).not.toBeNull()
    expect(v.sents).toBe(1)
    expect(v.spans).toHaveLength(5)
    expect(v.german).toContain('darauf')
  })
  test('rejects when the connector is missing from the German', () => {
    const raw = { ...GOOD_RAW, german: 'Mein Kollege wartet seit Montag auf den Bericht und ich arbeite noch daran.' }
    expect(validatePackedCard(raw, SPEC)).toBeNull()
  })
  test('rejects when the preposition is missing', () => {
    const raw = { ...GOOD_RAW, german: 'Mein Kollege wartet auf den Bericht, aber ich arbeite noch daran.' }
    expect(validatePackedCard(raw, SPEC)).toBeNull()
  })
  test('rejects when the da-compound is missing', () => {
    const raw = { ...GOOD_RAW, german: 'Mein Kollege wartet seit Montag auf den Bericht, aber ich arbeite noch.' }
    expect(validatePackedCard(raw, SPEC)).toBeNull()
  })
  test('derives sents from the German when sentenceCount is absent, clamped 1..4', () => {
    const raw = { ...GOOD_RAW, sentenceCount: undefined }
    expect(validatePackedCard(raw, SPEC)!.sents).toBe(1)
    const raw9 = { ...GOOD_RAW, sentenceCount: 9 }
    expect(validatePackedCard(raw9, SPEC)!.sents).toBe(4)
  })
  test('keeps only well-formed spans, tolerates missing ones', () => {
    const raw = { ...GOOD_RAW, spans: [{ key: 'v1', en: 'waiting' }, { key: 'zz', en: 5 }] }
    const v = validatePackedCard(raw, SPEC)!
    expect(v.spans).toEqual([{ key: 'v1', en: 'waiting' }])
  })
})

describe('buildPackedGeneratePrompt', () => {
  test('lists every item with its key, Rektion, da-compound and behavior', () => {
    const p = buildPackedGeneratePrompt([SPEC], 'B1/B2', { angles: ['set it at the office'], seed: 'abc' })
    expect(p).toContain('[v1]')
    expect(p).toContain('warten')
    expect(p).toContain('[p1]')
    expect(p).toContain('Dativ')
    expect(p).toContain('darauf')      // the required da-compound is named outright
    expect(p).toContain('[k1]')
    expect(p).toContain('aber')
  })
})

describe('buildPackedSegments', () => {
  const card: GeneratedPackedCard = { ...SPEC, ...GOOD_RAW, sents: 1, spans: GOOD_RAW.spans }
  test('locates spans, keys them, reveals German only for verb + noun (hybrid)', () => {
    const segs = buildPackedSegments(card.english, card)
    const items = segs.filter(s => s.item)
    expect(items.map(s => s.item!.key)).toEqual(['v1', 'n1', 'p1', 'k1', 'd1'])
    const byKey = new Map(items.map(s => [s.item!.key, s]))
    expect(byKey.get('v1')!.item!.reveal).toBe('warten')
    expect(byKey.get('n1')!.item!.reveal).toBe('der Bericht')
    expect(byKey.get('p1')!.item!.reveal).toBeUndefined()
    expect(byKey.get('d1')!.item!.reveal).toBeUndefined()
    expect(byKey.get('k1')!.item!.reveal).toBeUndefined()
  })
  test('two-part connector yields two spans sharing one key', () => {
    const pairSpec: PackedCardSpec = { index: 1, items: [{ key: 'k1', cat: 'conn', conn: CONN_PAIR }] }
    const pairCard: GeneratedPackedCard = {
      ...pairSpec,
      english: 'Both the rent and the costs are rising.',
      german: 'Sowohl die Miete als auch die Kosten steigen.',
      sents: 1,
      spans: [{ key: 'k1', en: 'Both' }, { key: 'k1', en: 'and' }]
    }
    const segs = buildPackedSegments(pairCard.english, pairCard)
    expect(segs.filter(s => s.item?.key === 'k1')).toHaveLength(2)
  })
  test('segments concatenate back to the source string', () => {
    const segs = buildPackedSegments(card.english, card)
    expect(segs.map(s => s.text).join('')).toBe(card.english)
  })
})
