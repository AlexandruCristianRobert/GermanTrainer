import { describe, test, expect } from 'vitest'
import {
  PACKED_MAX, PACKED_BUDGET, packedTotal, buildPackedSpecs, daCompoundFor, rektShort,
  validatePackedCard, buildPackedGeneratePrompt, buildPackedSegments, connUsed, nounHintText,
  verdictOf, parsePackedGrade, localCheckPackedCard, buildPackedMetaItems, buildPackedGradePrompt,
  pendingPluralWrites, verbUsedInGerman, packedHint,
  type PackedPools, type PackedCounts, type PackedCardSpec, type PackedItemSpec, type PackedSpan,
  type GeneratedPackedCard, type PackedItemResult
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

describe('nounHintText', () => {
  test('singular + plural: nominative plural and derived genitive plural, en-dash separated', () => {
    expect(nounHintText('der Tisch', 'Tische')).toBe('der Tisch – die Tische (der Tische)')
  })
  test('empty plural ("no plural" signal) shows the singular alone', () => {
    expect(nounHintText('die Milch', '')).toBe('die Milch')
  })
  test('undefined plural (not yet known) shows the singular alone', () => {
    expect(nounHintText('der Bericht', undefined)).toBe('der Bericht')
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
  test('carries span.pl through, INCLUDING the empty string "no plural" signal', () => {
    const rawWithPlural = {
      ...GOOD_RAW,
      spans: [
        { key: 'v1', en: 'waiting' }, { key: 'n1', en: 'report', pl: 'Berichte' },
        { key: 'p1', en: 'since' }, { key: 'd1', en: 'on it' }, { key: 'k1', en: 'but' }
      ]
    }
    expect(validatePackedCard(rawWithPlural, SPEC)!.spans.find(s => s.key === 'n1'))
      .toEqual({ key: 'n1', en: 'report', pl: 'Berichte' })

    // '' is not "absent" — it is the meaningful "this noun has no plural" signal
    // and must survive the pass-through exactly like a real plural would.
    const rawNoPlural = {
      ...GOOD_RAW,
      spans: [
        { key: 'v1', en: 'waiting' }, { key: 'n1', en: 'report', pl: '' },
        { key: 'p1', en: 'since' }, { key: 'd1', en: 'on it' }, { key: 'k1', en: 'but' }
      ]
    }
    expect(validatePackedCard(rawNoPlural, SPEC)!.spans.find(s => s.key === 'n1'))
      .toEqual({ key: 'n1', en: 'report', pl: '' })

    // a span with no "pl" field at all (verb/prep/dac/conn keys) stays unset,
    // never coerced to ''.
    const v1Span = validatePackedCard(GOOD_RAW, SPEC)!.spans.find(s => s.key === 'v1')!
    expect('pl' in v1Span).toBe(false)
  })
  test('defaults extras to [] when absent', () => {
    expect(validatePackedCard(GOOD_RAW, SPEC)!.extras).toEqual([])
  })
  test('accepts extras of both kinds, dropping entries with empty en/de or an invalid kind', () => {
    const raw = {
      ...GOOD_RAW,
      extras: [
        { en: 'colleague', de: 'der Kollege', kind: 'noun', pl: 'Kollegen' },
        { en: 'must', de: 'müssen', kind: 'verb' },
        { en: '', de: 'die Wohnung', kind: 'noun' },        // empty en
        { en: 'thing', de: '', kind: 'noun' },              // empty de
        { en: 'ghost', de: 'der Geist', kind: 'adjective' }, // invalid kind
        { en: 'nothing', de: 'nichts' },                    // missing kind entirely
        'junk'
      ]
    }
    expect(validatePackedCard(raw, SPEC)!.extras).toEqual([
      { en: 'colleague', de: 'der Kollege', kind: 'noun', pl: 'Kollegen' },
      { en: 'must', de: 'müssen', kind: 'verb' }
    ])
  })
  test("drops a noun extra duplicating a drilled noun, and a verb extra whose de duplicates a drilled verb's infinitive", () => {
    const raw = {
      ...GOOD_RAW,
      extras: [
        { en: 'report', de: 'der Bericht', kind: 'noun' },   // duplicates drilled noun n1 (Bericht)
        { en: 'colleague', de: 'der Kollege', kind: 'noun' },
        { en: 'waited', de: 'warten', kind: 'verb' },        // duplicates drilled verb v1 (warten)
        { en: 'must', de: 'müssen', kind: 'verb' }
      ]
    }
    expect(validatePackedCard(raw, SPEC)!.extras).toEqual([
      { en: 'colleague', de: 'der Kollege', kind: 'noun' },
      { en: 'must', de: 'müssen', kind: 'verb' }
    ])
  })
  test('NEVER rejects a card over bad hint data — entirely malformed extras still validate, rest of the card intact', () => {
    const rawNotArray = { ...GOOD_RAW, extras: 'not-an-array' }
    const v = validatePackedCard(rawNotArray, SPEC)
    expect(v).not.toBeNull()
    expect(v!.extras).toEqual([])
    expect(v!.english).toBe(GOOD_RAW.english)
    expect(v!.german).toBe(GOOD_RAW.german)
    expect(v!.spans).toHaveLength(5)

    const rawGarbageEntries = {
      ...GOOD_RAW,
      extras: [{ en: 123, de: {}, kind: 'bogus' }, null, 42, { kind: 'verb' }]
    }
    const v2 = validatePackedCard(rawGarbageEntries, SPEC)
    expect(v2).not.toBeNull()
    expect(v2!.extras).toEqual([])
    expect(v2!.spans).toHaveLength(5)
  })
})

describe('verbUsedInGerman', () => {
  test('Präteritum-stem inflections match when no full table exists (weak plural via bare -n)', () => {
    expect(verbUsedInGerman('warten', 'Wir warteten gestern lange auf den Bus.')).toBe(true)
  })
  test('separable zu-infinitive and joined Präteritum forms match', () => {
    expect(verbUsedInGerman('aufstehen', 'Ich versuche, jeden Tag früh aufzustehen.')).toBe(true)
    expect(verbUsedInGerman('aufstehen', 'Als ich aufstand, war es noch dunkel.')).toBe(true)
  })
  test('a synonym is not the verb', () => {
    expect(verbUsedInGerman('helfen', 'Ich unterstütze dich bei dem Projekt.')).toBe(false)
  })
  test('an unknown verb always passes — never reject on missing data', () => {
    expect(verbUsedInGerman('flambieren', 'Hier steht gar nichts Passendes.')).toBe(true)
  })
})

describe('validatePackedCard — verb-presence gate', () => {
  function verbSpec(german: string): PackedCardSpec {
    return { index: 0, items: [{ key: 'v1', cat: 'verb', verb: { german, english: 'x', level: 'A1', case: 'none' } }] }
  }
  function raw(german: string) {
    return { index: 0, english: 'An English sentence long enough.', german, sentenceCount: 1, spans: [{ key: 'v1', en: 'English' }] }
  }

  test('rejects a card whose German uses a synonym instead of the drilled verb', () => {
    expect(validatePackedCard(raw('Ich unterstütze dich morgen bei dem Umzug.'), verbSpec('helfen'))).toBeNull()
  })
  test('accepts a plain conjugated form', () => {
    expect(validatePackedCard(raw('Er hilft mir jeden Tag im Büro.'), verbSpec('helfen'))).not.toBeNull()
  })
  test('accepts the Perfekt (aux + Partizip II)', () => {
    expect(validatePackedCard(raw('Er hat mir gestern bei dem Umzug geholfen.'), verbSpec('helfen'))).not.toBeNull()
  })
  test('accepts a separable verb split across the clause ("hört … zu")', () => {
    expect(validatePackedCard(raw('Er hört mir bei dem Vortrag genau zu.'), verbSpec('zuhören'))).not.toBeNull()
  })
  test('accepts a separable verb joined in a subordinate clause ("zuhört")', () => {
    expect(validatePackedCard(raw('Ich weiß, dass er mir immer zuhört.'), verbSpec('zuhören'))).not.toBeNull()
  })
  test('accepts würde + infinitive', () => {
    expect(validatePackedCard(raw('Er würde mir helfen, wenn er Zeit hätte.'), verbSpec('helfen'))).not.toBeNull()
  })
})

describe('validatePackedCard — deUsed pass-through', () => {
  function withDeUsed(deUsed: string) {
    return { ...GOOD_RAW, spans: GOOD_RAW.spans.map(s => (s.key === 'v1' ? { ...s, deUsed } : s)) }
  }

  test('keeps deUsed when its token appears as a whole word in the German', () => {
    const v = validatePackedCard(withDeUsed('wartet'), SPEC)!
    expect(v.spans.find(s => s.key === 'v1')!.deUsed).toBe('wartet')
  })
  test('keeps a multi-token deUsed when every token appears', () => {
    const v = validatePackedCard(withDeUsed('warte auch'), SPEC)!
    expect(v.spans.find(s => s.key === 'v1')!.deUsed).toBe('warte auch')
  })
  test('strips deUsed whose token is missing from the German — card itself survives', () => {
    const v = validatePackedCard(withDeUsed('hilft'), SPEC)
    expect(v).not.toBeNull()
    expect('deUsed' in v!.spans.find(s => s.key === 'v1')!).toBe(false)
  })
  test('strips deUsed matching only a substring, not a whole word ("wart" vs "wartet")', () => {
    const v = validatePackedCard(withDeUsed('wart'), SPEC)!
    expect('deUsed' in v.spans.find(s => s.key === 'v1')!).toBe(false)
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
  test('asks for extras (incidental nouns and verbs) alongside the spans', () => {
    const p = buildPackedGeneratePrompt([SPEC], 'B1/B2', { angles: ['set it at the office'], seed: 'abc' })
    expect(p).toContain('extras')
  })
})

describe('buildPackedSegments', () => {
  const card: GeneratedPackedCard = { ...SPEC, ...GOOD_RAW, sents: 1, spans: GOOD_RAW.spans }
  test('locates spans, keys them, and reveals German for every category', () => {
    const segs = buildPackedSegments(card.english, card)
    const items = segs.filter(s => s.item)
    expect(items.map(s => s.item!.key)).toEqual(['v1', 'n1', 'p1', 'k1', 'd1'])
    const byKey = new Map(items.map(s => [s.item!.key, s]))
    expect(byKey.get('v1')!.item!.hint).toEqual([{ text: 'warten + Akk' }])
    expect(byKey.get('n1')!.item!.hint).toEqual([{ text: 'der Bericht' }])
    expect(byKey.get('p1')!.item!.hint).toEqual([{ text: 'seit + Dat' }])
  })
  test("a drilled noun's hint shows the plural when the card's span carries one", () => {
    const withPlural: GeneratedPackedCard = {
      ...card,
      spans: card.spans.map(s => (s.key === 'n1' ? { ...s, pl: 'Berichte' } : s))
    }
    const segs = buildPackedSegments(withPlural.english, withPlural)
    const hint = segs.find(s => s.item?.key === 'n1')!.item!.hint!
    expect(hint).toEqual([{ text: 'der Bericht – die Berichte (der Berichte)' }])
  })
  test('a da-compound reveals the collocation it stands for, not just the compound', () => {
    const segs = buildPackedSegments(card.english, card)
    const hint = segs.find(s => s.item?.key === 'd1')!.item!.hint!
    expect(hint).toEqual([{ text: 'darauf', note: 'warten auf + Akk' }])
  })
  test('a connector reveals its clause and position as badges', () => {
    const segs = buildPackedSegments(card.english, card)
    const hint = segs.find(s => s.item?.key === 'k1')!.item!.hint!
    expect(hint).toEqual([{
      text: 'aber',
      badges: [{ text: 'HZ', tone: 'hz' }, { text: 'Pos. 0', tone: 'pos' }],
      note: 'Wortstellung bleibt'
    }])
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
    expect(segs.find(s => s.item?.key === 'v1')!.item!.hint).toEqual([{ text: 'gehen' }])
  })
  test('two-part connector yields two spans sharing one key, both revealing every part', () => {
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
    // Both spans carry one line per part, so the learner sees what the other
    // half of the pair does while standing on either one.
    for (const p of parts) {
      expect(p.item!.hint!.map(l => l.text)).toEqual(CONN_PAIR.parts.map(x => x.text))
      expect(p.item!.hint!.every(l => l.badges?.length === 2)).toBe(true)
    }
  })
  test('a noun extra becomes a subtle noun span revealing article + noun', () => {
    const withExtras: GeneratedPackedCard = {
      ...card,
      extras: [
        { en: 'colleague', de: 'der Kollege', kind: 'noun' },
        { en: 'Monday', de: 'der Montag', kind: 'noun' }
      ]
    }
    const segs = buildPackedSegments(withExtras.english, withExtras)
    const extras = segs.filter(s => s.item?.extra)
    expect(extras.map(s => [s.item!.key, s.text, s.item!.hint])).toEqual([
      ['x1', 'colleague', [{ text: 'der Kollege' }]],
      ['x2', 'Monday', [{ text: 'der Montag' }]]
    ])
    expect(extras.every(s => s.item!.cat === 'noun')).toBe(true)
  })
  test("a verb extra emits a segment with cat: 'verb' and extra: true, hinting its infinitive", () => {
    // card.english: '...but I am still working on it.' — "am" is a whole word,
    // unclaimed by any drilled span.
    const withVerbExtra: GeneratedPackedCard = {
      ...card,
      extras: [{ en: 'am', de: 'sein', kind: 'verb' }]
    }
    const segs = buildPackedSegments(withVerbExtra.english, withVerbExtra)
    const extra = segs.find(s => s.item?.extra)!
    expect(extra.item!.cat).toBe('verb')
    expect(extra.item!.extra).toBe(true)
    expect(extra.item!.hint).toEqual([{ text: 'sein' }])
  })
  test('extras never steal a range a drilled span already claimed', () => {
    // "report" is n1's own span surface (the only occurrence in card.english);
    // an extra claiming the identical surface must find it already used.
    const withClash: GeneratedPackedCard = { ...card, extras: [{ en: 'report', de: 'der Bericht', kind: 'noun' }] }
    const segs = buildPackedSegments(withClash.english, withClash)
    expect(segs.filter(s => s.item?.extra)).toHaveLength(0)
    expect(segs.filter(s => s.item?.key === 'n1')).toHaveLength(1)
  })
  test('segments concatenate back to the source string, extras included', () => {
    const withExtras: GeneratedPackedCard = { ...card, extras: [{ en: 'colleague', de: 'der Kollege', kind: 'noun' }] }
    const segs = buildPackedSegments(withExtras.english, withExtras)
    expect(segs.map(s => s.text).join('')).toBe(card.english)
  })
})

describe('verb hover hint — exact surface form (deUsed)', () => {
  const base: GeneratedPackedCard = { ...SPEC, ...GOOD_RAW, sents: 1, spans: GOOD_RAW.spans }

  test('a verb span with deUsed carries the muted "im Text:" note', () => {
    const card: GeneratedPackedCard = {
      ...base,
      spans: base.spans.map(s => (s.key === 'v1' ? { ...s, deUsed: 'wartet' } : s))
    }
    const segs = buildPackedSegments(card.english, card)
    expect(segs.find(s => s.item?.key === 'v1')!.item!.hint)
      .toEqual([{ text: 'warten + Akk', note: 'im Text: wartet' }])
  })
  test('without deUsed the hint keeps its current shape — no note', () => {
    const segs = buildPackedSegments(base.english, base)
    expect(segs.find(s => s.item?.key === 'v1')!.item!.hint).toEqual([{ text: 'warten + Akk' }])
  })
  test('no note when deUsed equals the dictionary form shown', () => {
    expect(packedHint(SPEC.items[0], undefined, 'warten')).toEqual([{ text: 'warten + Akk' }])
    // Case-insensitive: capitalization alone is not a different form.
    expect(packedHint(SPEC.items[0], undefined, 'Warten')).toEqual([{ text: 'warten + Akk' }])
  })
  test('deUsed never leaks onto non-verb hints', () => {
    expect(packedHint(SPEC.items[1], 'Berichte', 'wartet'))
      .toEqual([{ text: 'der Bericht – die Berichte (der Berichte)' }])
  })
})

describe("plural precedence (stored beats the card's AI guess — ADR-0003)", () => {
  function nounSpec(plural?: string): PackedCardSpec {
    const noun: NounRef = { german: 'Bericht', article: 'der', english: 'report' }
    if (plural !== undefined) noun.plural = plural
    return { index: 0, items: [{ key: 'n1', cat: 'noun', noun }] }
  }
  function nounCard(spec: PackedCardSpec, spanPl?: string): GeneratedPackedCard {
    const span: PackedSpan = { key: 'n1', en: 'report' }
    if (spanPl !== undefined) span.pl = spanPl
    return { ...spec, english: 'I read the report.', german: 'Ich lese den Bericht.', sents: 1, spans: [span] }
  }
  test("a stored plural wins over the card's conflicting AI guess", () => {
    const card = nounCard(nounSpec('Berichte'), 'Berichten') // AI guessed a different (wrong) plural
    const segs = buildPackedSegments(card.english, card)
    const hint = segs.find(s => s.item?.key === 'n1')!.item!.hint!
    expect(hint).toEqual([{ text: 'der Bericht – die Berichte (der Berichte)' }]) // the STORED plural, not "Berichten"
  })
  test("with no stored plural, this card's AI guess is used", () => {
    const card = nounCard(nounSpec(undefined), 'Berichte')
    const segs = buildPackedSegments(card.english, card)
    const hint = segs.find(s => s.item?.key === 'n1')!.item!.hint!
    expect(hint).toEqual([{ text: 'der Bericht – die Berichte (der Berichte)' }])
  })
})

describe('pendingPluralWrites', () => {
  function nounItem(key: string, german: string, plural?: string): PackedItemSpec {
    const noun: NounRef = { german, article: 'der', english: german.toLowerCase() }
    if (plural !== undefined) noun.plural = plural
    return { key, cat: 'noun', noun }
  }
  test("writes back only for drilled nouns lacking a stored plural, keyed on the card's AI span pl", () => {
    const spec: PackedCardSpec = {
      index: 0,
      items: [
        nounItem('n1', 'Bericht'),              // no stored plural -> eligible
        nounItem('n2', 'Wohnung', 'Wohnungen')   // already stored -> not eligible
      ]
    }
    const card: GeneratedPackedCard = {
      ...spec, english: 'x', german: 'y', sents: 1,
      spans: [{ key: 'n1', en: 'report', pl: 'Berichte' }, { key: 'n2', en: 'apartment', pl: 'ignored' }]
    }
    expect(pendingPluralWrites(card)).toEqual([{ german: 'Bericht', plural: 'Berichte' }])
  })
  test('includes an empty-string plural — "no plural" is still worth caching', () => {
    const spec: PackedCardSpec = { index: 0, items: [nounItem('n1', 'Milch')] }
    const card: GeneratedPackedCard = {
      ...spec, english: 'x', german: 'y', sents: 1, spans: [{ key: 'n1', en: 'milk', pl: '' }]
    }
    expect(pendingPluralWrites(card)).toEqual([{ german: 'Milch', plural: '' }])
  })
  test('deduplicates by german', () => {
    const spec: PackedCardSpec = {
      index: 0,
      items: [nounItem('n1', 'Bericht'), nounItem('n2', 'Bericht')]
    }
    const card: GeneratedPackedCard = {
      ...spec, english: 'x', german: 'y', sents: 1,
      spans: [{ key: 'n1', en: 'report', pl: 'Berichte' }, { key: 'n2', en: 'report', pl: 'Berichte' }]
    }
    expect(pendingPluralWrites(card)).toEqual([{ german: 'Bericht', plural: 'Berichte' }])
  })
  test('returns [] when there is nothing to write', () => {
    // no noun items at all
    expect(pendingPluralWrites({ index: 0, items: [], english: 'x', german: 'y', sents: 1, spans: [] })).toEqual([])
    // noun already has a stored plural
    const specStored: PackedCardSpec = { index: 0, items: [nounItem('n1', 'Bericht', 'Berichte')] }
    const cardStored: GeneratedPackedCard = {
      ...specStored, english: 'x', german: 'y', sents: 1, spans: [{ key: 'n1', en: 'report', pl: 'Berichten' }]
    }
    expect(pendingPluralWrites(cardStored)).toEqual([])
    // no stored plural, but the span carries no pl at all
    const specNoSpanPl: PackedCardSpec = { index: 0, items: [nounItem('n1', 'Bericht')] }
    const cardNoSpanPl: GeneratedPackedCard = {
      ...specNoSpanPl, english: 'x', german: 'y', sents: 1, spans: [{ key: 'n1', en: 'report' }]
    }
    expect(pendingPluralWrites(cardNoSpanPl)).toEqual([])
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
