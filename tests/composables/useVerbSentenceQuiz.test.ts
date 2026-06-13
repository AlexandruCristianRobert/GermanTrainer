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

import {
  VERB_ANGLE_POOL, levelLabel, buildVerbGeneratePrompt
} from '../../src/composables/useVerbSentenceQuiz'

describe('levelLabel', () => {
  test('all four levels → A1–B2 range', () => {
    expect(levelLabel(['A1', 'A2', 'B1', 'B2'])).toBe('A1–B2')
  })
  test('subset → slash-joined', () => {
    expect(levelLabel(['A2', 'B1'])).toBe('A2/B1')
  })
  test('empty → a sane default', () => {
    expect(levelLabel([])).toBe('A2–B1')
  })
})

describe('buildVerbGeneratePrompt', () => {
  const specs = [
    { index: 0, verbs: [{ german: 'gehen', english: 'go', level: 'A1' as const }], nouns: [{ german: 'Schule', article: 'die' as const, english: 'school' }] },
    { index: 1, verbs: [{ german: 'kaufen', english: 'buy', level: 'A1' as const }, { german: 'wollen', english: 'want', level: 'A1' as const }], nouns: [] }
  ]
  const prompt = buildVerbGeneratePrompt(specs, 'A1–A2', { angles: ['set it at breakfast', 'use a question'], seed: 'abc123' })

  test('lists every spec index with its verbs and nouns', () => {
    expect(prompt).toContain('#0')
    expect(prompt).toContain('gehen')
    expect(prompt).toContain('die Schule (school)')
    expect(prompt).toContain('#1')
    expect(prompt).toContain('kaufen')
    expect(prompt).toContain('wollen')
  })
  test('injects the variety angles and seed', () => {
    expect(prompt).toContain('set it at breakfast')
    expect(prompt).toContain('abc123')
  })
  test('states the target level', () => {
    expect(prompt).toContain('A1–A2')
  })
  test('VERB_ANGLE_POOL has enough distinct angles to rotate', () => {
    expect(new Set(VERB_ANGLE_POOL).size).toBeGreaterThanOrEqual(12)
  })
})

import { validateVerbSentencePair } from '../../src/composables/useVerbSentenceQuiz'

describe('validateVerbSentencePair', () => {
  const spec = { index: 0, verbs: [{ german: 'gehen', english: 'go', level: 'A1' as const }], nouns: [{ german: 'Schule', article: 'die' as const, english: 'school' }] }

  test('accepts a well-formed pair and keeps spans + extras', () => {
    const out = validateVerbSentencePair({
      index: 0, english: 'The children go to school in the morning.', german: 'Die Kinder gehen morgens zur Schule.',
      verbSpansEn: ['go'], nounSpansEn: ['school'],
      extraWords: [{ en: 'children', de: 'das Kind', kind: 'noun' }, { en: 'morning', de: 'der Morgen', kind: 'noun' }]
    }, spec)
    expect(out).not.toBeNull()
    expect(out!.verbSpansEn).toEqual(['go'])
    expect(out!.nounSpansEn).toEqual(['school'])
    expect(out!.extraWords).toHaveLength(2)
    expect(out!.verbs).toEqual(spec.verbs) // spec carried through
  })
  test('rejects non-objects and too-short sentences', () => {
    expect(validateVerbSentencePair(null, spec)).toBeNull()
    expect(validateVerbSentencePair({ english: 'Hi', german: 'Ja' }, spec)).toBeNull()
  })
  test('tolerates missing/garbage span fields (best-effort, never rejects on them)', () => {
    const out = validateVerbSentencePair({ index: 0, english: 'We bought a cake.', german: 'Wir haben einen Kuchen gekauft.' }, spec)
    expect(out).not.toBeNull()
    expect(out!.verbSpansEn).toBeUndefined()
    expect(out!.extraWords).toBeUndefined()
  })
  test('drops malformed extraWords entries, keeps valid ones', () => {
    const out = validateVerbSentencePair({
      index: 0, english: 'The cat sleeps on the table.', german: 'Die Katze schläft auf dem Tisch.',
      extraWords: [{ en: 'cat', de: 'die Katze', kind: 'noun' }, { en: '', de: 'x', kind: 'noun' }, { en: 'sleeps', de: '', kind: 'verb' }, 'junk']
    }, spec)
    expect(out!.extraWords).toEqual([{ en: 'cat', de: 'die Katze', kind: 'noun' }])
  })
  test('coerces an unknown extraWords kind to "noun"', () => {
    const out = validateVerbSentencePair({
      index: 0, english: 'He runs fast.', german: 'Er läuft schnell.',
      extraWords: [{ en: 'runs', de: 'laufen', kind: 'banana' }]
    }, spec)
    expect(out!.extraWords).toEqual([{ en: 'runs', de: 'laufen', kind: 'noun' }])
  })
})
