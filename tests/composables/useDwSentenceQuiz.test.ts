import { describe, test, expect } from 'vitest'
import {
  VERTICAL_TWIN, twinCompound, buildDwSpecs, dwLevelLabel,
  type DwSentenceSpec
} from '../../src/composables/useDwSentenceQuiz'
import type { NounRef } from '../../src/composables/useSentenceQuiz'

const NOUNS_FIX: NounRef[] = [
  { german: 'Treppe', article: 'die', english: 'staircase' },
  { german: 'Zimmer', article: 'das', english: 'room' }
]
const PAIRS_FIX = ['ein', 'aus', 'auf', 'unter', 'über', 'ab']

// Deterministic RNG: cycles through the given values.
function seqRng(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

function makeSpec(overrides: Partial<DwSentenceSpec> = {}): DwSentenceSpec {
  return { index: 0, pair: 'unter', side: 'hin', target: 'hinunter', nouns: [], ...overrides }
}

describe('twinCompound', () => {
  test('hin+unter twins to hinab (via the ab vertical synonym)', () => {
    expect(twinCompound(makeSpec({ pair: 'unter', side: 'hin', target: 'hinunter' }))).toBe('hinab')
  })
  test('her+unter twins to herab', () => {
    expect(twinCompound(makeSpec({ pair: 'unter', side: 'her', target: 'herunter' }))).toBe('herab')
  })
  test('hin+ab twins to hinunter', () => {
    expect(twinCompound(makeSpec({ pair: 'ab', side: 'hin', target: 'hinab' }))).toBe('hinunter')
  })
  test('her+ab twins to herunter', () => {
    expect(twinCompound(makeSpec({ pair: 'ab', side: 'her', target: 'herab' }))).toBe('herunter')
  })
  test('a pair with no vertical twin (auf) returns null', () => {
    expect(twinCompound(makeSpec({ pair: 'auf', side: 'hin', target: 'hinauf' }))).toBeNull()
  })
  test('VERTICAL_TWIN is exactly the unter/ab pair, both directions', () => {
    expect(VERTICAL_TWIN).toEqual({ unter: 'ab', ab: 'unter' })
  })
})

describe('buildDwSpecs', () => {
  test('produces exactly `count` specs, indexed 0..count-1', () => {
    const specs = buildDwSpecs(PAIRS_FIX, NOUNS_FIX, 4, 1, seqRng([0]))
    expect(specs).toHaveLength(4)
    expect(specs.map(s => s.index)).toEqual([0, 1, 2, 3])
  })
  test('target derives correctly from side + pair', () => {
    const specs = buildDwSpecs(['auf'], [], 5, 1, seqRng([0.1, 0.6, 0.2, 0.9, 0.3]))
    for (const s of specs) {
      expect(s.pair).toBe('auf')
      expect(s.target).toBe(s.side === 'hin' ? 'hinauf' : 'herauf')
    }
    // both sides actually occur across the batch (not a degenerate always-same-side rng)
    expect(new Set(specs.map(s => s.side)).size).toBe(2)
  })
  test('sides vary under a supplied rng (not all the same)', () => {
    const specs = buildDwSpecs(['auf', 'ein', 'aus'], [], 6, 1, seqRng([0.1, 0.9, 0.2, 0.8, 0.3, 0.7]))
    const sides = new Set(specs.map(s => s.side))
    expect(sides.size).toBe(2)
  })
  test('fixed nounsPer honoured', () => {
    const specs = buildDwSpecs(PAIRS_FIX, NOUNS_FIX, 3, 2, seqRng([0]))
    for (const s of specs) expect(s.nouns.length).toBe(2)
  })
  test('nouns within a sentence are distinct', () => {
    const specs = buildDwSpecs(PAIRS_FIX, NOUNS_FIX, 5, 2, seqRng([0, 0.5, 0.9, 0.1]))
    for (const s of specs) {
      const keys = s.nouns.map(n => n.german)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })
  test('bag exhaustion: drawing pool-sized count spreads across all pairs before repeat', () => {
    const specs = buildDwSpecs(PAIRS_FIX, [], PAIRS_FIX.length, 1, seqRng([0]))
    expect(new Set(specs.map(s => s.pair)).size).toBe(PAIRS_FIX.length)
  })
  test("'mix' yields 1 or 2 nouns depending on rng", () => {
    const one = buildDwSpecs(PAIRS_FIX, NOUNS_FIX, 1, 'mix', seqRng([0.2]))[0]
    expect(one.nouns.length).toBe(1)
    const two = buildDwSpecs(PAIRS_FIX, NOUNS_FIX, 1, 'mix', seqRng([0.8]))[0]
    expect(two.nouns.length).toBe(2)
  })
  test('empty pair pool → no specs (no crash)', () => {
    expect(buildDwSpecs([], NOUNS_FIX, 3, 1, seqRng([0]))).toEqual([])
  })
  test('empty noun pool → specs with empty noun arrays', () => {
    const specs = buildDwSpecs(PAIRS_FIX, [], 2, 1, seqRng([0]))
    expect(specs).toHaveLength(2)
    expect(specs[0].nouns).toEqual([])
  })
})

describe('dwLevelLabel', () => {
  test('subset → slash-joined in canonical order', () => {
    expect(dwLevelLabel(['B2', 'A2'])).toBe('A2/B2')
  })
  test('all four levels join', () => {
    expect(dwLevelLabel(['A2', 'B1', 'B2', 'C1'])).toBe('A2/B1/B2/C1')
  })
  test('single level', () => {
    expect(dwLevelLabel(['C1'])).toBe('C1')
  })
  test('empty → a sane default range', () => {
    expect(dwLevelLabel([])).toBe('A2–C1')
  })
})

import { DW_ANGLE_POOL, DW_GEN_SYSTEM, buildDwGeneratePrompt } from '../../src/composables/useDwSentenceQuiz'

describe('buildDwGeneratePrompt', () => {
  const specs: DwSentenceSpec[] = [
    { index: 0, pair: 'auf', side: 'her', target: 'herauf', nouns: [{ german: 'Treppe', article: 'die', english: 'staircase' }] },
    { index: 1, pair: 'ein', side: 'hin', target: 'hinein', nouns: [] }
  ]
  const prompt = buildDwGeneratePrompt(specs, 'A2/B1', { angles: ['set it on a staircase', 'set it at a doorway'], seed: 'abc123' })

  test('lists every spec index with its TARGET compound + side + nouns', () => {
    expect(prompt).toContain('#0')
    expect(prompt).toContain('herauf')
    expect(prompt).toContain('die Treppe (staircase)')
    expect(prompt).toContain('#1')
    expect(prompt).toContain('hinein')
  })
  test('states the target level', () => {
    expect(prompt).toContain('A2/B1')
  })
  test('injects the variety angles and seed', () => {
    expect(prompt).toContain('set it on a staircase')
    expect(prompt).toContain('abc123')
  })
  test('mentions the unambiguous-perspective requirement and the return fields', () => {
    expect(prompt.toLowerCase()).toContain('unambiguously')
    expect(prompt).toContain('nounSpansEn')
    expect(prompt).toContain('extraWords')
  })
  test('DW_ANGLE_POOL has enough distinct angles to rotate', () => {
    expect(new Set(DW_ANGLE_POOL).size).toBeGreaterThanOrEqual(12)
  })
})

describe('DW_GEN_SYSTEM prompt-literal regression (local-claude convention)', () => {
  test('states the hin/her rule', () => {
    expect(DW_GEN_SYSTEM).toContain('hin = motion away from the speaker, her = motion toward the speaker')
  })
  test('contains the literal JSON-shape line verbatim', () => {
    expect(DW_GEN_SYSTEM).toContain(
      'Return ONLY JSON in exactly this shape: {"items":[{"index":<number>,"english":"...","german":"...","nounSpansEn":["..."],"extraWords":[{"en":"...","de":"...","kind":"verb|noun"}]}]}'
    )
  })
  test('forbids markdown fences/commentary', () => {
    expect(DW_GEN_SYSTEM).toContain('No markdown fences, no commentary.')
  })
})

import { validateDwSentencePair } from '../../src/composables/useDwSentenceQuiz'

describe('validateDwSentencePair', () => {
  const spec: DwSentenceSpec = { index: 0, pair: 'auf', side: 'her', target: 'herauf', nouns: [{ german: 'Treppe', article: 'die', english: 'staircase' }] }

  test('accepts german containing the exact target compound', () => {
    const out = validateDwSentencePair({
      index: 0, english: 'Grandma calls from the top of the stairs: come up to me!',
      german: 'Oma ruft von oben: Komm die Treppe herauf!',
      nounSpansEn: ['stairs'], extraWords: [{ en: 'calls', de: 'rufen', kind: 'verb' }]
    }, spec)
    expect(out).not.toBeNull()
    expect(out!.german).toContain('herauf')
    expect(out!.nounSpansEn).toEqual(['stairs'])
    expect(out!.extraWords).toHaveLength(1)
    expect(out!.pair).toBe('auf') // spec carried through
  })
  test('accepts german containing the vertical twin instead of the exact target', () => {
    const unterSpec: DwSentenceSpec = { index: 0, pair: 'unter', side: 'hin', target: 'hinunter', nouns: [] }
    const out = validateDwSentencePair({
      index: 0, english: 'Go down to the cellar.', german: 'Geh hinab in den Keller.'
    }, unterSpec)
    expect(out).not.toBeNull()
    expect(out!.german).toContain('hinab')
  })
  test('accepts the target compound case-insensitively', () => {
    const out = validateDwSentencePair({
      index: 0, english: 'Come up!', german: 'HERAUF komm doch!'
    }, spec)
    expect(out).not.toBeNull()
  })
  test('rejects when the German is missing the target compound and its twin', () => {
    const out = validateDwSentencePair({
      index: 0, english: 'Come up!', german: 'Komm doch schnell.'
    }, spec)
    expect(out).toBeNull()
  })
  test('rejects non-objects and too-short fields', () => {
    expect(validateDwSentencePair(null, spec)).toBeNull()
    expect(validateDwSentencePair({ english: 'Hi', german: 'Ja' }, spec)).toBeNull()
    expect(validateDwSentencePair({ index: 0, english: '', german: 'Komm herauf!' }, spec)).toBeNull()
  })
  test('rejects on index mismatch', () => {
    expect(validateDwSentencePair({
      index: 5, english: 'Come up the stairs!', german: 'Komm die Treppe herauf!'
    }, spec)).toBeNull()
  })
  test('tolerates missing/garbage span fields (best-effort, never rejects on them)', () => {
    const out = validateDwSentencePair({ index: 0, english: 'Come up here!', german: 'Komm herauf!' }, spec)
    expect(out).not.toBeNull()
    expect(out!.nounSpansEn).toBeUndefined()
    expect(out!.extraWords).toBeUndefined()
  })
  test('drops malformed extraWords entries, keeps valid ones', () => {
    const out = validateDwSentencePair({
      index: 0, english: 'Come up here now!', german: 'Komm jetzt herauf!',
      extraWords: [{ en: 'now', de: 'jetzt', kind: 'noun' }, { en: '', de: 'x', kind: 'noun' }, 'junk']
    }, spec)
    expect(out!.extraWords).toEqual([{ en: 'now', de: 'jetzt', kind: 'noun' }])
  })
})

import { generateDwSentenceBatch } from '../../src/composables/useDwSentenceQuiz'
import type { AiClient } from '../../src/composables/useClaude'

function fakeClient(responder: (prompt: string) => string): AiClient {
  return { models: { generateContent: async (p) => ({ text: responder(String(p.contents ?? '')) }) } }
}
const SPECS: DwSentenceSpec[] = [
  { index: 0, pair: 'auf', side: 'her', target: 'herauf', nouns: [] },
  { index: 1, pair: 'ein', side: 'hin', target: 'hinein', nouns: [] }
]

describe('generateDwSentenceBatch', () => {
  test('returns one validated sentence per spec', async () => {
    const client = fakeClient(() => JSON.stringify({ items: [
      { index: 0, english: 'Come up here!', german: 'Komm herauf!', nounSpansEn: [], extraWords: [] },
      { index: 1, english: 'Go inside.', german: 'Geh hinein.', nounSpansEn: [], extraWords: [] }
    ] }))
    const res = await generateDwSentenceBatch(client, { model: 'm', specs: SPECS, maxRetries: 0 })
    expect(res.sentences).toHaveLength(2)
    expect(res.sentences.map(s => s.index).sort()).toEqual([0, 1])
    expect(res.failedIndices).toEqual([])
  })
  test('retries only the missing specs', async () => {
    let call = 0
    const client = fakeClient(() => {
      call++
      return call === 1
        ? JSON.stringify({ items: [{ index: 0, english: 'Come up here!', german: 'Komm herauf!', nounSpansEn: [], extraWords: [] }] })
        : JSON.stringify({ items: [{ index: 1, english: 'Go inside.', german: 'Geh hinein.', nounSpansEn: [], extraWords: [] }] })
    })
    const res = await generateDwSentenceBatch(client, { model: 'm', specs: SPECS, maxRetries: 2 })
    expect(res.sentences).toHaveLength(2)
    expect(res.failedIndices).toEqual([])
  })
  test('never throws on malformed JSON — lists unfilled specs as failedIndices', async () => {
    const client = fakeClient(() => 'not json at all')
    const res = await generateDwSentenceBatch(client, { model: 'm', specs: SPECS, maxRetries: 1 })
    expect(res.sentences).toHaveLength(0)
    expect(res.failedIndices.sort()).toEqual([0, 1])
  })
  test('never throws when the client rejects', async () => {
    const client: AiClient = { models: { generateContent: async () => { throw new Error('network down') } } }
    const res = await generateDwSentenceBatch(client, { model: 'm', specs: SPECS, maxRetries: 1 })
    expect(res.sentences).toHaveLength(0)
    expect(res.failedIndices.sort()).toEqual([0, 1])
  })
})

import { buildDwHintInputs, forbiddenDirectionWords, type GeneratedDwSentence } from '../../src/composables/useDwSentenceQuiz'
import { buildHintSegments } from '../../src/composables/useSentenceQuiz'

describe('forbiddenDirectionWords', () => {
  test('pair with an r-form and no vertical twin (auf): both sides + r-form only', () => {
    expect(forbiddenDirectionWords('auf')).toEqual(['hinauf', 'herauf', 'rauf'])
  })
  test('unter (has its own r-form; twin ab has none): both sides + own r-form + twin sides, no twin r-form', () => {
    expect(forbiddenDirectionWords('unter')).toEqual(['hinunter', 'herunter', 'runter', 'hinab', 'herab'])
  })
  test('ab (no r-form of its own; twin unter has runter): both sides + twin sides + twin r-form', () => {
    expect(forbiddenDirectionWords('ab')).toEqual(['hinab', 'herab', 'hinunter', 'herunter', 'runter'])
  })
  test('ein (has an r-form, no twin): both sides + r-form', () => {
    expect(forbiddenDirectionWords('ein')).toEqual(['hinein', 'herein', 'rein'])
  })
})

describe('buildDwHintInputs', () => {
  const sentence: GeneratedDwSentence = {
    index: 0, pair: 'auf', side: 'her', target: 'herauf',
    nouns: [{ german: 'Treppe', article: 'die', english: 'staircase' }],
    english: 'Grandma calls up the staircase for you to visit soon.',
    german: 'Oma ruft die Treppe herauf, du sollst bald besuchen.',
    nounSpansEn: ['staircase'],
    extraWords: [{ en: 'visit', de: 'besuchen', kind: 'verb' }, { en: 'soon', de: 'bald', kind: 'noun' }]
  }

  test('builds hints for the theme noun (OUR German) and extras (AI German), never the direction word', () => {
    const hints = buildDwHintInputs(sentence)
    expect(hints).toContainEqual({ surface: 'staircase', kind: 'noun', reveal: 'die Treppe' })
    expect(hints).toContainEqual({ surface: 'visit', kind: 'verb', reveal: 'besuchen' })
    expect(hints).toContainEqual({ surface: 'soon', kind: 'noun', reveal: 'bald' })
  })
  test('the hints anchor into the sentence via buildHintSegments (lossless)', () => {
    const segs = buildHintSegments(sentence.english, buildDwHintInputs(sentence))
    expect(segs.map(s => s.text).join('')).toBe(sentence.english)
  })
  test('skips empty surfaces and missing arrays', () => {
    const hints = buildDwHintInputs({ ...sentence, nounSpansEn: undefined, extraWords: undefined })
    expect(hints).toEqual([])
  })

  // Property test: NEVER emit a hint whose surface or reveal contains any
  // forbidden direction word for the pair — both sides of the pair, its
  // r-form, or the vertical twin's forms — even when a crafted fixture tries
  // to smuggle one in via an "extra word" or a noun span.
  const FIXTURES: GeneratedDwSentence[] = [
    {
      ...sentence,
      extraWords: [{ en: 'herauf', de: 'herauf', kind: 'verb' }]
    },
    {
      ...sentence,
      extraWords: [{ en: 'come', de: 'komm herauf', kind: 'verb' }]
    },
    {
      ...sentence,
      nounSpansEn: ['herauf'] // surface leaks the compound
    },
    {
      index: 0, pair: 'unter', side: 'hin', target: 'hinunter',
      nouns: [{ german: 'Keller', article: 'der', english: 'cellar' }],
      english: 'Go down to the cellar quickly.',
      german: 'Geh schnell hinab in den Keller.', // twin form present
      nounSpansEn: ['cellar'],
      extraWords: [{ en: 'quickly', de: 'hinab', kind: 'noun' }] // leaks the TWIN
    },
    {
      ...sentence,
      extraWords: [{ en: 'up', de: 'hinauf', kind: 'noun' }] // leaks the pair's OTHER side
    },
    {
      ...sentence,
      extraWords: [{ en: 'quick', de: 'rauf', kind: 'noun' }] // leaks the r-form
    }
  ]
  test.each(FIXTURES.map((fx, i) => [i, fx] as const))(
    'fixture %i: no hint surface or reveal contains any forbidden direction word for the pair',
    (_i, fx) => {
      const hints = buildDwHintInputs(fx)
      const forbidden = forbiddenDirectionWords(fx.pair)
      for (const h of hints) {
        for (const f of forbidden) {
          expect(h.surface.toLowerCase()).not.toContain(f.toLowerCase())
          expect(h.reveal.toLowerCase()).not.toContain(f.toLowerCase())
        }
      }
    }
  )

  test('fixtures planting the other side or the r-form actually get dropped (not just coincidentally clean)', () => {
    const otherSideFixture = FIXTURES[4]
    const rFormFixture = FIXTURES[5]
    expect(buildDwHintInputs(otherSideFixture).some(h => h.surface === 'up')).toBe(false)
    expect(buildDwHintInputs(rFormFixture).some(h => h.surface === 'quick')).toBe(false)
  })

  test('word-boundary-aware: a reveal like "der Verein" (pair ein) is NOT filtered merely for containing "rein" as a substring', () => {
    const einSentence: GeneratedDwSentence = {
      index: 0, pair: 'ein', side: 'hin', target: 'hinein',
      nouns: [{ german: 'Verein', article: 'der', english: 'club' }],
      english: 'We are going into the club soon.',
      german: 'Wir gehen bald in den Verein hinein.',
      nounSpansEn: ['club'],
      extraWords: []
    }
    const hints = buildDwHintInputs(einSentence)
    expect(hints).toContainEqual({ surface: 'club', kind: 'noun', reveal: 'der Verein' })
  })
})

import {
  buildDwGradePrompt, parseDwGrade, gradeDwAnswer, buildDwDrillItem, DW_GRADE_RULES
} from '../../src/composables/useDwSentenceQuiz'

describe('buildDwGradePrompt', () => {
  const spec: GeneratedDwSentence = {
    index: 0, pair: 'auf', side: 'her', target: 'herauf', nouns: [],
    english: 'Come up here!', german: 'Komm herauf!'
  }

  test('mentions the target compound, its side, and the learner answer', () => {
    const p = buildDwGradePrompt({ spec, answer: 'Komm hinauf!' })
    expect(p.user).toContain('herauf')
    expect(p.user).toContain('Komm hinauf!')
    expect(p.user).toContain('Komm herauf!')
  })
  test('includes the vertical twin when one exists', () => {
    const unterSpec: GeneratedDwSentence = {
      index: 0, pair: 'unter', side: 'hin', target: 'hinunter', nouns: [],
      english: 'Go down.', german: 'Geh hinunter.'
    }
    const p = buildDwGradePrompt({ spec: unterSpec, answer: 'Geh hinab.' })
    expect(p.user).toContain('hinab')
  })
  test('system states the hin/her rule and lists all 6 tags incl. direction', () => {
    const p = buildDwGradePrompt({ spec, answer: 'x' })
    expect(p.system).toContain('hin = away from the speaker, her = toward the speaker')
    expect(p.system).toContain('"direction"')
    expect(p.system).toContain('"conjugation"')
    expect(p.system).toContain('"case"')
    expect(p.system).toContain('"word-order"')
    expect(p.system).toContain('"noun"')
    expect(p.system).toContain('"typo"')
  })
  test('system contains the literal JSON-shape line verbatim (local-claude convention)', () => {
    const p = buildDwGradePrompt({ spec, answer: 'x' })
    expect(p.system).toContain(
      'Return ONLY JSON in exactly this shape: {"correct": true|false, "tip": "...", "errorTags": ["..."]}'
    )
  })
  // DW_GRADE_RULES is exported specifically so T7 (useDwAnswerQuiz) can import
  // the rubric verbatim instead of keeping a second hand-copied paraphrase
  // that could drift out of sync. This locks the single-sourcing in place.
  test('DW_GRADE_SYSTEM (via buildDwGradePrompt) contains DW_GRADE_RULES verbatim — single-sourced, no drift', () => {
    const p = buildDwGradePrompt({ spec, answer: 'x' })
    expect(p.system).toContain(DW_GRADE_RULES)
  })
})

describe('parseDwGrade', () => {
  test('valid correct grade defaults tip to "" and tags to []', () => {
    expect(parseDwGrade({ correct: true })).toEqual({ correct: true, tip: '', tags: [] })
  })
  test('keeps tip + filters tags to the 6-tag set', () => {
    expect(parseDwGrade({ correct: false, tip: 'Wrong side.', errorTags: ['direction', 'banana', 'case'] }))
      .toEqual({ correct: false, tip: 'Wrong side.', tags: ['direction', 'case'] })
  })
  test('rejects non-objects and missing boolean', () => {
    expect(parseDwGrade(null)).toBeNull()
    expect(parseDwGrade({ tip: 'x' })).toBeNull()
  })
})

describe('gradeDwAnswer', () => {
  const spec: GeneratedDwSentence = {
    index: 0, pair: 'auf', side: 'her', target: 'herauf', nouns: [],
    english: 'Come up here!', german: 'Komm herauf!'
  }
  test('returns the parsed grade with tags', async () => {
    const client: AiClient = { models: { generateContent: async () => ({ text: JSON.stringify({ correct: false, tip: 'Wrong side.', errorTags: ['direction'] }) }) } }
    const g = await gradeDwAnswer(client, { model: 'm', spec, answer: 'Komm hinauf!' })
    expect(g.correct).toBe(false)
    expect(g.tags).toEqual(['direction'])
  })
  test('throws after exhausting retries on bad JSON', async () => {
    const client: AiClient = { models: { generateContent: async () => ({ text: 'nope' }) } }
    await expect(gradeDwAnswer(client, { model: 'm', spec, answer: 'x' })).rejects.toThrow()
  })
  test('throws after exhausting retries when the client rejects', async () => {
    const client: AiClient = { models: { generateContent: async () => { throw new Error('down') } } }
    await expect(gradeDwAnswer(client, { model: 'm', spec, answer: 'x' })).rejects.toThrow()
  })
})

describe('buildDwDrillItem', () => {
  const s: GeneratedDwSentence = {
    index: 0, pair: 'auf', side: 'her', target: 'herauf',
    nouns: [{ german: 'Treppe', article: 'die', english: 'staircase' }],
    english: 'x', german: 'y'
  }
  test('records pair/compound + noun keys and correctness', () => {
    expect(buildDwDrillItem(s, true)).toEqual({
      pair: 'auf', compound: 'herauf', nounKeys: ['Treppe'], correct: true
    })
  })
  test('attaches tags when present', () => {
    expect(buildDwDrillItem(s, false, ['direction']).tags).toEqual(['direction'])
  })
  test('omits tags when absent or empty', () => {
    expect(buildDwDrillItem(s, false, []).tags).toBeUndefined()
    expect(buildDwDrillItem(s, true).tags).toBeUndefined()
  })
})
