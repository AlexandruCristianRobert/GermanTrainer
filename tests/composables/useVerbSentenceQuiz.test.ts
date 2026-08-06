import { describe, test, expect } from 'vitest'
import {
  verbToRef, buildVerbSpecs, type VerbRef
} from '../../src/composables/useVerbSentenceQuiz'
import type { NounRef } from '../../src/composables/useSentenceQuiz'
import type { Verb } from '../../src/data/verbs'

const VERBS_FIX: VerbRef[] = [
  { german: 'gehen', english: 'go', level: 'A1', case: 'none' },
  { german: 'machen', english: 'make / do', level: 'A1', case: 'accusative' },
  { german: 'verstehen', english: 'understand', level: 'A2', case: 'accusative' }
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
  test('projects a Verb to the lean ref, including its case', () => {
    const v = { german: 'gehen', english: 'go', level: 'A1', case: 'none' } as Verb
    expect(verbToRef(v)).toEqual({ german: 'gehen', english: 'go', level: 'A1', case: 'none' })
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
  test('no tenses param → specs carry no tense field (today’s behaviour)', () => {
    const specs = buildVerbSpecs(VERBS_FIX, NOUNS_FIX, 3, 1, 1, seqRng([0]))
    for (const s of specs) expect(s.tense).toBeUndefined()
  })
  test('tenses cycle evenly: 4 specs × 2 tenses → each tense exactly twice', () => {
    const specs = buildVerbSpecs(VERBS_FIX, NOUNS_FIX, 4, 1, 1, seqRng([0]), ['praesens', 'perfekt'])
    const counts = new Map<string, number>()
    for (const s of specs) {
      expect(['praesens', 'perfekt']).toContain(s.tense)
      counts.set(s.tense!, (counts.get(s.tense!) ?? 0) + 1)
    }
    expect(counts.get('praesens')).toBe(2)
    expect(counts.get('perfekt')).toBe(2)
  })
  test('passive tense specs draw only accusative-capable verbs', () => {
    const specs = buildVerbSpecs(VERBS_FIX, NOUNS_FIX, 6, 1, 1, seqRng([0, 0.3, 0.7]), ['passivPraesens'])
    for (const s of specs) {
      expect(s.tense).toBe('passivPraesens')
      for (const v of s.verbs) {
        expect(v.case === 'accusative' || v.case === 'dative+accusative').toBe(true)
      }
    }
  })
  test('passive tenses are dropped when the pool has no accusative verbs', () => {
    const noAcc: VerbRef[] = [{ german: 'gehen', english: 'go', level: 'A1', case: 'none' }]
    const specs = buildVerbSpecs(noAcc, NOUNS_FIX, 3, 1, 1, seqRng([0]), ['praesens', 'passivPraesens'])
    for (const s of specs) expect(s.tense).toBe('praesens')
  })
  test('only passive selected + no accusative verbs → specs carry no tense (natural fallback)', () => {
    const noAcc: VerbRef[] = [{ german: 'gehen', english: 'go', level: 'A1', case: 'none' }]
    const specs = buildVerbSpecs(noAcc, NOUNS_FIX, 2, 1, 1, seqRng([0]), ['passivPraesens'])
    for (const s of specs) expect(s.tense).toBeUndefined()
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
  test('typed prompt is unchanged: says the learner typed, and lists "typo"', () => {
    expect(p.system).toContain('typed a GERMAN translation')
    expect(p.system).toContain('typo')
    expect(p.user).toContain("LEARNER'S GERMAN ANSWER:")
  })

  const sp = buildVerbGradePrompt({
    model: 'm', english: 'I go to school.', german: 'Ich gehe zur Schule.',
    verbsGerman: ['gehen'], nounsGerman: ['Schule'], userAnswer: 'ich gehe zur schule',
    spoken: true
  })
  test('spoken prompt mentions the transcript/recognizer', () => {
    expect(sp.system).toContain('SPOKE a GERMAN translation')
    expect(sp.system).toContain('speech recognizer')
    expect(sp.system).toContain('transcribed')
  })
  test('spoken prompt tells the grader to ignore capitalisation and punctuation', () => {
    expect(sp.system).toContain('ignore capitalisation and punctuation')
  })
  test('spoken prompt forbids the "typo" tag', () => {
    expect(sp.system).toContain('NEVER return "typo"')
  })
  test('spoken prompt still keeps the other tag definitions verbatim', () => {
    expect(sp.system).toContain('"conjugation" (right verb, wrong form — tense, ' +
      'person, auxiliary, or Partizip)')
    expect(sp.system).toContain('"case" (wrong case for an object the verb governs)')
    expect(sp.system).toContain('(verb-second, verb-final, or split separable-prefix placement wrong)')
    expect(sp.system).toContain('"noun" (a wrong theme noun — word, gender, or form)')
  })
  test('spoken prompt uses the transcript label for the answer line', () => {
    expect(sp.user).toContain("LEARNER'S SPOKEN GERMAN ANSWER (transcript): ich gehe zur schule")
    expect(sp.user).not.toContain("LEARNER'S GERMAN ANSWER:")
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
  test('without spoken, keeps a "typo" tag returned by the model', async () => {
    const client: AiClient = { models: { generateContent: async () => ({ text: JSON.stringify({ correct: false, tip: 'Slip.', errorTags: ['typo', 'case'] }) }) } }
    const g = await gradeVerbAnswer(client, { model: 'm', english: 'x', german: 'y', verbsGerman: [], nounsGerman: [], userAnswer: 'z' })
    expect(g.tags).toEqual(['typo', 'case'])
  })
  test('spoken: strips a "typo" tag from the model while keeping other tags', async () => {
    const client: AiClient = { models: { generateContent: async () => ({ text: JSON.stringify({ correct: false, tip: 'Wrong case.', errorTags: ['typo', 'case'] }) }) } }
    const g = await gradeVerbAnswer(client, { model: 'm', english: 'x', german: 'y', verbsGerman: [], nounsGerman: [], userAnswer: 'z', spoken: true })
    expect(g.tags).toEqual(['case'])
  })
  test('spoken: when "typo" was the only tag, "tags" is absent afterwards', async () => {
    const client: AiClient = { models: { generateContent: async () => ({ text: JSON.stringify({ correct: false, tip: 'Slip.', errorTags: ['typo'] }) }) } }
    const g = await gradeVerbAnswer(client, { model: 'm', english: 'x', german: 'y', verbsGerman: [], nounsGerman: [], userAnswer: 'z', spoken: true })
    expect(g.tags).toBeUndefined()
    expect('tags' in g).toBe(false)
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
