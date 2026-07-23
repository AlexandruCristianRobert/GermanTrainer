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
  test('all five levels → A1–B2 range', () => {
    expect(levelLabel(['A1', 'A2', 'B1', 'B2.1', 'B2.2'])).toBe('A1–B2')
  })
  test('subset → slash-joined', () => {
    expect(levelLabel(['A2', 'B1'])).toBe('A2/B1')
  })
  test('batch labels normalize to CEFR and dedupe', () => {
    expect(levelLabel(['B2.1', 'B2.2'])).toBe('B2')
    expect(levelLabel(['B1', 'B2.1'])).toBe('B1/B2')
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

import { generateVerbSentenceBatch } from '../../src/composables/useVerbSentenceQuiz'
import type { AiClient } from '../../src/composables/useClaude'

function fakeClient(responder: (prompt: string) => string): AiClient {
  return { models: { generateContent: async (p) => ({ text: responder(String(p.contents ?? '')) }) } }
}
const SPECS = [
  { index: 0, verbs: [{ german: 'gehen', english: 'go', level: 'A1' as const }], nouns: [] },
  { index: 1, verbs: [{ german: 'sehen', english: 'see', level: 'A1' as const }], nouns: [] }
]

describe('generateVerbSentenceBatch', () => {
  test('returns one validated sentence per spec', async () => {
    const client = fakeClient(() => JSON.stringify({ items: [
      { index: 0, english: 'I go home.', german: 'Ich gehe nach Hause.', verbSpansEn: ['go'], nounSpansEn: [], extraWords: [] },
      { index: 1, english: 'I see the dog.', german: 'Ich sehe den Hund.', verbSpansEn: ['see'], nounSpansEn: [], extraWords: [{ en: 'dog', de: 'der Hund', kind: 'noun' }] }
    ] }))
    const res = await generateVerbSentenceBatch(client, { model: 'm', specs: SPECS, maxRetries: 0 })
    expect(res.sentences).toHaveLength(2)
    expect(res.sentences.map(s => s.index).sort()).toEqual([0, 1])
  })
  test('retries only the missing specs', async () => {
    let call = 0
    const client = fakeClient(() => {
      call++
      return call === 1
        ? JSON.stringify({ items: [{ index: 0, english: 'I go home.', german: 'Ich gehe heim.', verbSpansEn: ['go'], nounSpansEn: [], extraWords: [] }] })
        : JSON.stringify({ items: [{ index: 1, english: 'I see it.', german: 'Ich sehe es.', verbSpansEn: ['see'], nounSpansEn: [], extraWords: [] }] })
    })
    const res = await generateVerbSentenceBatch(client, { model: 'm', specs: SPECS, maxRetries: 2 })
    expect(res.sentences).toHaveLength(2)
    expect(res.attempts).toBe(2)
  })
  test('survives malformed JSON without throwing', async () => {
    const client = fakeClient(() => 'not json at all')
    const res = await generateVerbSentenceBatch(client, { model: 'm', specs: SPECS, maxRetries: 1 })
    expect(res.sentences).toHaveLength(0)
  })
})

import { buildVerbHintInputs } from '../../src/composables/useVerbSentenceQuiz'
import { buildHintSegments } from '../../src/composables/useSentenceQuiz'

describe('buildVerbHintInputs', () => {
  const sentence = {
    index: 0,
    verbs: [{ german: 'gehen', english: 'go', level: 'A1' as const }],
    nouns: [{ german: 'Schule', article: 'die' as const, english: 'school' }],
    english: 'The children go to school in the morning.',
    german: 'Die Kinder gehen morgens zur Schule.',
    verbSpansEn: ['go'],
    nounSpansEn: ['school'],
    extraWords: [{ en: 'children', de: 'das Kind', kind: 'noun' as const }]
  }

  test('builds hints for drilled verb (our German), theme noun (our German), and extras (AI German)', () => {
    const hints = buildVerbHintInputs(sentence)
    expect(hints).toContainEqual({ surface: 'go', kind: 'verb', reveal: 'gehen' })
    expect(hints).toContainEqual({ surface: 'school', kind: 'noun', reveal: 'die Schule' })
    expect(hints).toContainEqual({ surface: 'children', kind: 'noun', reveal: 'das Kind' })
  })
  test('the hints anchor into the sentence via buildHintSegments', () => {
    const segs = buildHintSegments(sentence.english, buildVerbHintInputs(sentence))
    expect(segs.map(s => s.text).join('')).toBe(sentence.english) // lossless
    expect(segs.some(s => s.hint?.kind === 'verb' && s.hint.reveal === 'gehen')).toBe(true)
  })
  test('skips empty surfaces and missing arrays', () => {
    const hints = buildVerbHintInputs({ ...sentence, verbSpansEn: [''], nounSpansEn: undefined, extraWords: undefined })
    expect(hints.every(h => h.surface.length > 0)).toBe(true)
  })
})

import {
  buildVerbGradePrompt, parseVerbGrade, gradeVerbAnswer, buildVerbDrillItem
} from '../../src/composables/useVerbSentenceQuiz'

describe('buildVerbGradePrompt', () => {
  const p = buildVerbGradePrompt({
    model: 'm', english: 'I go to school.', german: 'Ich gehe zur Schule.',
    verbsGerman: ['gehen'], nounsGerman: ['Schule'], userAnswer: 'Ich gehe zur Schule.'
  })
  test('mentions the target verbs and the learner answer, and lists the 5 tags', () => {
    expect(p.system).toContain('conjugation')
    expect(p.system).toContain('word-order')
    expect(p.user).toContain('gehen')
    expect(p.user).toContain('Ich gehe zur Schule.')
  })
})

describe('parseVerbGrade', () => {
  test('valid correct grade', () => {
    expect(parseVerbGrade({ correct: true })).toEqual({ correct: true })
  })
  test('keeps tip + filters tags to the known set', () => {
    expect(parseVerbGrade({ correct: false, tip: 'Wrong tense.', errorTags: ['conjugation', 'banana', 'case'] }))
      .toEqual({ correct: false, tip: 'Wrong tense.', tags: ['conjugation', 'case'] })
  })
  test('rejects non-objects and missing boolean', () => {
    expect(parseVerbGrade(null)).toBeNull()
    expect(parseVerbGrade({ tip: 'x' })).toBeNull()
  })
})

describe('gradeVerbAnswer', () => {
  test('returns the parsed grade', async () => {
    const client: AiClient = { models: { generateContent: async () => ({ text: JSON.stringify({ correct: false, tip: 'Verb at the end.', errorTags: ['word-order'] }) }) } }
    const g = await gradeVerbAnswer(client, { model: 'm', english: 'x', german: 'y', verbsGerman: ['gehen'], nounsGerman: [], userAnswer: 'z' })
    expect(g.correct).toBe(false)
    expect(g.tags).toEqual(['word-order'])
  })
  test('throws after exhausting retries on bad JSON', async () => {
    const client: AiClient = { models: { generateContent: async () => ({ text: 'nope' }) } }
    await expect(gradeVerbAnswer(client, { model: 'm', english: 'x', german: 'y', verbsGerman: [], nounsGerman: [], userAnswer: 'z' })).rejects.toThrow()
  })
})

describe('buildVerbDrillItem', () => {
  const s = { index: 0, verbs: [{ german: 'gehen', english: 'go', level: 'A1' as const }, { german: 'sehen', english: 'see', level: 'A1' as const }], nouns: [{ german: 'Schule', article: 'die' as const, english: 'school' }], english: 'x', german: 'y' }
  test('records verb + noun keys and correctness', () => {
    expect(buildVerbDrillItem(s, true)).toEqual({ verbKeys: ['gehen', 'sehen'], nounKeys: ['Schule'], correct: true })
  })
  test('attaches tags when present', () => {
    expect(buildVerbDrillItem(s, false, ['conjugation']).tags).toEqual(['conjugation'])
  })
})
