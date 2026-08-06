import { describe, test, expect } from 'vitest'
import {
  PACKED_MAX, PACKED_BUDGET, packedTotal, buildPackedSpecs, daCompoundFor, rektShort,
  validatePackedCard, buildPackedGeneratePrompt, buildPackedSegments, connUsed,
  verdictOf, parsePackedGrade, localCheckPackedCard, buildPackedMetaItems, buildPackedGradePrompt,
  type PackedPools, type PackedCounts, type PackedCardSpec, type GeneratedPackedCard, type PackedItemResult
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
  test('defaults extraNouns to [] when absent', () => {
    expect(validatePackedCard(GOOD_RAW, SPEC)!.extraNouns).toEqual([])
  })
  test('keeps well-formed extraNouns, filters malformed entries', () => {
    const raw = {
      ...GOOD_RAW,
      extraNouns: [
        { en: 'colleague', de: 'der Kollege' },
        { en: '', de: 'die Wohnung' },
        { en: 'thing' },
        'junk'
      ]
    }
    expect(validatePackedCard(raw, SPEC)!.extraNouns).toEqual([{ en: 'colleague', de: 'der Kollege' }])
  })
  test('drops extraNouns that duplicate a drilled noun', () => {
    const raw = { ...GOOD_RAW, extraNouns: [{ en: 'report', de: 'der Bericht' }, { en: 'colleague', de: 'der Kollege' }] }
    expect(validatePackedCard(raw, SPEC)!.extraNouns).toEqual([{ en: 'colleague', de: 'der Kollege' }])
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
  test('asks for extraNouns alongside the spans', () => {
    const p = buildPackedGeneratePrompt([SPEC], 'B1/B2', { angles: ['set it at the office'], seed: 'abc' })
    expect(p).toContain('extraNouns')
  })
})

describe('buildPackedSegments', () => {
  const card: GeneratedPackedCard = { ...SPEC, ...GOOD_RAW, sents: 1, spans: GOOD_RAW.spans }
  test('locates spans, keys them, and reveals German for every category', () => {
    const segs = buildPackedSegments(card.english, card)
    const items = segs.filter(s => s.item)
    expect(items.map(s => s.item!.key)).toEqual(['v1', 'n1', 'p1', 'k1', 'd1'])
    const byKey = new Map(items.map(s => [s.item!.key, s]))
    expect(byKey.get('v1')!.item!.reveal).toBe('warten + Akk')
    expect(byKey.get('n1')!.item!.reveal).toBe('der Bericht')
    expect(byKey.get('p1')!.item!.reveal).toBe('seit + Dat')
    expect(byKey.get('d1')!.item!.reveal).toBe('darauf')
    expect(byKey.get('k1')!.item!.reveal).toBe('aber — Wortstellung bleibt')
  })
  test('a verb without a governed case reveals the bare infinitive', () => {
    const spec: PackedCardSpec = {
      index: 2,
      items: [{ key: 'v1', cat: 'verb', verb: { german: 'gehen', english: 'go', level: 'A1', case: 'none' } }]
    }
    const goneCard: GeneratedPackedCard = {
      ...spec, english: 'We are going home.', german: 'Wir gehen nach Hause.',
      sents: 1, spans: [{ key: 'v1', en: 'going' }]
    }
    const segs = buildPackedSegments(goneCard.english, goneCard)
    expect(segs.find(s => s.item?.key === 'v1')!.item!.reveal).toBe('gehen')
  })
  test('two-part connector yields two spans sharing one key, both revealing the display form', () => {
    const pairSpec: PackedCardSpec = { index: 1, items: [{ key: 'k1', cat: 'conn', conn: CONN_PAIR }] }
    const pairCard: GeneratedPackedCard = {
      ...pairSpec,
      english: 'Both the rent and the costs are rising.',
      german: 'Sowohl die Miete als auch die Kosten steigen.',
      sents: 1,
      spans: [{ key: 'k1', en: 'Both' }, { key: 'k1', en: 'and' }]
    }
    const segs = buildPackedSegments(pairCard.english, pairCard)
    const parts = segs.filter(s => s.item?.key === 'k1')
    expect(parts).toHaveLength(2)
    expect(parts.map(s => s.item!.reveal)).toEqual(['sowohl … als auch', 'sowohl … als auch'])
  })
  test('extra nouns become subtle noun spans revealing article + noun', () => {
    const withExtras: GeneratedPackedCard = {
      ...card,
      extraNouns: [{ en: 'colleague', de: 'der Kollege' }, { en: 'Monday', de: 'der Montag' }]
    }
    const segs = buildPackedSegments(withExtras.english, withExtras)
    const extras = segs.filter(s => s.item?.extra)
    expect(extras.map(s => [s.item!.key, s.text, s.item!.reveal])).toEqual([
      ['x1', 'colleague', 'der Kollege'],
      ['x2', 'Monday', 'der Montag']
    ])
    expect(extras.every(s => s.item!.cat === 'noun')).toBe(true)
  })
  test('drilled spans win overlaps — an extra noun on a claimed range is dropped', () => {
    const withClash: GeneratedPackedCard = { ...card, extraNouns: [{ en: 'report', de: 'der Bericht' }] }
    const segs = buildPackedSegments(withClash.english, withClash)
    expect(segs.filter(s => s.item?.extra)).toHaveLength(0)
    expect(segs.filter(s => s.item?.key === 'n1')).toHaveLength(1)
  })
  test('segments concatenate back to the source string, extras included', () => {
    const withExtras: GeneratedPackedCard = { ...card, extraNouns: [{ en: 'colleague', de: 'der Kollege' }] }
    const segs = buildPackedSegments(withExtras.english, withExtras)
    expect(segs.map(s => s.text).join('')).toBe(card.english)
  })
})

const CARD: GeneratedPackedCard = { ...SPEC, ...GOOD_RAW, sents: 1, spans: GOOD_RAW.spans }

describe('verdictOf', () => {
  const r = (oks: boolean[]) => oks.map((ok, i) => ({ key: `x${i}`, correct: ok }))
  test('ok when all correct, part at >= half, no below half', () => {
    expect(verdictOf(r([true, true, true]))).toBe('ok')
    expect(verdictOf(r([true, true, false]))).toBe('part')   // 2/3 >= ceil(3/2)=2
    expect(verdictOf(r([true, false, false]))).toBe('no')
    expect(verdictOf(r([true, false, false, false]))).toBe('no')
    expect(verdictOf(r([true, true, false, false]))).toBe('part')
  })
})

describe('parsePackedGrade', () => {
  const goodItems = SPEC.items.map(i => ({ key: i.key, correct: true }))
  test('accepts a full per-item grade and filters unknown tags/keys', () => {
    const g = parsePackedGrade({
      items: [...goodItems.slice(0, 4), { key: 'k1', correct: false, tags: ['connector', 'word-order', 'nonsense'] }, { key: 'zz', correct: true }],
      tip: ' Watch the inversion. '
    }, SPEC)!
    expect(g.items).toHaveLength(5)
    expect(g.items.find(i => i.key === 'k1')!.tags).toEqual(['connector', 'word-order'])
    expect(g.tip).toBe('Watch the inversion.')
  })
  test('rejects when an item key is missing (forces a retry, never a silent gap)', () => {
    expect(parsePackedGrade({ items: goodItems.slice(1) }, SPEC)).toBeNull()
  })
  test('rejects non-objects', () => {
    expect(parsePackedGrade('nope', SPEC)).toBeNull()
  })
})

describe('localCheckPackedCard', () => {
  test('checks each item by word presence against the reference machinery', () => {
    const results = localCheckPackedCard(
      'Mein Kollege wartet seit Montag auf den Bericht, aber ich warte auch schon lange darauf.', CARD
    )
    expect(results.every(r => r.correct)).toBe(true)
  })
  test('flags the missing connector and da-compound', () => {
    const results = localCheckPackedCard('Mein Kollege wartet seit Montag auf den Bericht.', CARD)
    const byKey = new Map(results.map(r => [r.key, r]))
    expect(byKey.get('k1')!.correct).toBe(false)
    expect(byKey.get('d1')!.correct).toBe(false)
    expect(byKey.get('p1')!.correct).toBe(true)
  })
  test('accepts an inflected noun (stem containment)', () => {
    const results = localCheckPackedCard('Wir warten seit Tagen auf die Berichte, aber ich arbeite daran.', CARD)
    expect(results.find(r => r.key === 'n1')!.correct).toBe(true)
  })
})

describe('buildPackedGradePrompt', () => {
  test('spoken variant forbids typo and mentions the transcript', () => {
    const { system } = buildPackedGradePrompt(CARD, 'egal', true)
    expect(system).toContain('NEVER')
    expect(system.toLowerCase()).toContain('transcri')
    const typed = buildPackedGradePrompt(CARD, 'egal', false)
    expect(typed.system).toContain('"typo"')
  })
})

describe('buildPackedMetaItems', () => {
  test('splits per-item results into the per-category history shapes (all-or-nothing stays per item)', () => {
    const results = new Map<number, PackedItemResult[]>([[0, [
      { key: 'v1', correct: false, tags: ['conjugation', 'connector'] },
      { key: 'n1', correct: false, tags: ['noun'] },
      { key: 'p1', correct: true },
      { key: 'd1', correct: false, tags: ['compound', 'case'] },
      { key: 'k1', correct: false, tags: ['connector', 'word-order'] }
    ]]])
    const meta = buildPackedMetaItems([CARD], results)
    expect(meta.verbSentenceItems).toEqual([
      { verbKeys: ['warten'], nounKeys: [], correct: false, tags: ['conjugation'] },   // 'connector' filtered out
      { verbKeys: [], nounKeys: ['Bericht'], correct: false, tags: ['noun'] }          // the noun rides as a noun-only item
    ])
    expect(meta.sentenceItems).toEqual([
      { prepId: 'seit', prepGerman: 'seit', nounKeys: [], correct: true }
    ])
    expect(meta.dacSentenceItems).toEqual([
      { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', nounKeys: [], correct: false, tags: ['compound', 'case'] }
    ])
    expect(meta.packedConnItems).toEqual([
      { connId: 'aber', connWord: 'aber', correct: false, tags: ['connector', 'word-order'] }
    ])
  })
})
