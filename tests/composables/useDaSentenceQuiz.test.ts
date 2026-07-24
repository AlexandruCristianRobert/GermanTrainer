import { describe, test, expect } from 'vitest'
import {
  collocToRef, buildDacSpecs, dacLevelLabel, type CollocRef
} from '../../src/composables/useDaSentenceQuiz'
import type { NounRef } from '../../src/composables/useSentenceQuiz'
import type { Collocation } from '../../src/data/collocations'

const COLLOCS_FIX: CollocRef[] = [
  { id: 'warten-auf', word: 'warten', english: 'to wait for', preposition: 'auf', case: 'accusative', level: 'B1' },
  { id: 'denken-an', word: 'denken', english: 'to think of/about', preposition: 'an', case: 'accusative', level: 'B1' },
  { id: 'teilnehmen-an', word: 'teilnehmen', english: 'to take part in', preposition: 'an', case: 'dative', level: 'B2' }
]
const NOUNS_FIX: NounRef[] = [
  { german: 'Konzert', article: 'das', english: 'concert' },
  { german: 'Prüfung', article: 'die', english: 'exam' }
]
// Deterministic RNG: cycles through the given values.
function seqRng(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

describe('collocToRef', () => {
  test('projects a Collocation to the lean ref (only the 6 prompt fields)', () => {
    const c = {
      id: 'warten-auf', word: 'warten', english: 'to wait for', role: 'verb',
      preposition: 'auf', case: 'accusative', level: 'B1',
      example: 'Ich warte auf den Bus.', coreIdeaHint: 'x', coreIdeaExplanation: 'y'
    } as Collocation
    expect(collocToRef(c)).toEqual({
      id: 'warten-auf', word: 'warten', english: 'to wait for',
      preposition: 'auf', case: 'accusative', level: 'B1'
    })
  })
})

describe('buildDacSpecs', () => {
  test('produces exactly `count` specs, indexed 0..count-1, one collocation each', () => {
    const specs = buildDacSpecs(COLLOCS_FIX, NOUNS_FIX, 4, 1, seqRng([0]))
    expect(specs).toHaveLength(4)
    expect(specs.map(s => s.index)).toEqual([0, 1, 2, 3])
    for (const s of specs) expect(s.colloc).toBeTruthy()
  })
  test('fixed nounsPer honoured', () => {
    const specs = buildDacSpecs(COLLOCS_FIX, NOUNS_FIX, 3, 2, seqRng([0]))
    for (const s of specs) expect(s.nouns.length).toBe(2)
  })
  test('nouns within a sentence are distinct', () => {
    const specs = buildDacSpecs(COLLOCS_FIX, NOUNS_FIX, 5, 2, seqRng([0, 0.5, 0.9, 0.1]))
    for (const s of specs) {
      const keys = s.nouns.map(n => n.german)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })
  test('bag exhaustion: drawing pool-sized count spreads across all collocations', () => {
    const specs = buildDacSpecs(COLLOCS_FIX, [], 3, 1, seqRng([0]))
    expect(new Set(specs.map(s => s.colloc.id)).size).toBe(3)
  })
  test("'mix' yields 1 or 2 nouns depending on rng", () => {
    const one = buildDacSpecs(COLLOCS_FIX, NOUNS_FIX, 1, 'mix', seqRng([0.2]))[0]
    expect(one.nouns.length).toBe(1)
    const two = buildDacSpecs(COLLOCS_FIX, NOUNS_FIX, 1, 'mix', seqRng([0.8]))[0]
    expect(two.nouns.length).toBe(2)
  })
  test('empty collocation pool → no specs (no crash)', () => {
    expect(buildDacSpecs([], NOUNS_FIX, 3, 1, seqRng([0]))).toEqual([])
  })
  test('empty noun pool → specs with empty noun arrays', () => {
    const specs = buildDacSpecs(COLLOCS_FIX, [], 2, 1, seqRng([0]))
    expect(specs).toHaveLength(2)
    expect(specs[0].nouns).toEqual([])
  })
})

describe('dacLevelLabel', () => {
  test('subset → slash-joined in canonical order', () => {
    expect(dacLevelLabel(['B2', 'B1'])).toBe('B1/B2')
  })
  test('all three real CEFR levels join (no range collapse)', () => {
    expect(dacLevelLabel(['B1', 'B2', 'C1'])).toBe('B1/B2/C1')
  })
  test('single level', () => {
    expect(dacLevelLabel(['C1'])).toBe('C1')
  })
  test('empty → a sane default range', () => {
    expect(dacLevelLabel([])).toBe('B1–C1')
  })
})

import {
  DAC_ANGLE_POOL, buildDacGeneratePrompt
} from '../../src/composables/useDaSentenceQuiz'

describe('buildDacGeneratePrompt', () => {
  const specs = [
    { index: 0, colloc: COLLOCS_FIX[0], nouns: [{ german: 'Konzert', article: 'das' as const, english: 'concert' }] },
    { index: 1, colloc: COLLOCS_FIX[2], nouns: [] }
  ]
  const prompt = buildDacGeneratePrompt(specs, 'B1/B2', { angles: ['set it at breakfast', 'point at a dass-clause'], seed: 'abc123' })

  test('lists every spec index with its collocation word + preposition + case cue + nouns', () => {
    expect(prompt).toContain('#0')
    expect(prompt).toContain('warten')
    expect(prompt).toContain('auf')
    expect(prompt).toContain('das Konzert (concert)')
    expect(prompt).toContain('#1')
    expect(prompt).toContain('teilnehmen')
    // case cue present for each item
    expect(prompt).toMatch(/[Aa]kkusativ|accusative/)
    expect(prompt).toMatch(/[Dd]ativ|dative/)
  })
  test('includes the half-and-half construction instruction (noun phrase vs da-compound)', () => {
    expect(prompt.toLowerCase()).toContain('half')
    expect(prompt.toLowerCase()).toContain('da-compound')
    // both a plain prepositional object and a compound-at-a-clause example
    expect(prompt).toMatch(/darauf|damit|darüber/)
  })
  test('states the span rules (collocSpanEn as an exact substring)', () => {
    expect(prompt).toContain('collocSpanEn')
    expect(prompt.toLowerCase()).toContain('substring')
  })
  test('injects the variety angles and seed', () => {
    expect(prompt).toContain('set it at breakfast')
    expect(prompt).toContain('abc123')
  })
  test('states the target level', () => {
    expect(prompt).toContain('B1/B2')
  })
  test('DAC_ANGLE_POOL has enough distinct angles to rotate', () => {
    expect(new Set(DAC_ANGLE_POOL).size).toBeGreaterThanOrEqual(12)
  })
})

import { validateDacSentencePair } from '../../src/composables/useDaSentenceQuiz'

describe('validateDacSentencePair', () => {
  const spec = { index: 0, colloc: COLLOCS_FIX[0], nouns: [{ german: 'Konzert', article: 'das' as const, english: 'concert' }] }

  test('accepts a well-formed pair and keeps span + extras, carries spec through', () => {
    const out = validateDacSentencePair({
      index: 0, english: 'We are waiting for the concert to start.', german: 'Wir warten darauf, dass das Konzert beginnt.',
      collocSpanEn: 'waiting for', nounSpansEn: ['concert'],
      extraWords: [{ en: 'start', de: 'beginnen', kind: 'verb' }]
    }, spec)
    expect(out).not.toBeNull()
    expect(out!.collocSpanEn).toBe('waiting for')
    expect(out!.nounSpansEn).toEqual(['concert'])
    expect(out!.extraWords).toHaveLength(1)
    expect(out!.colloc).toEqual(spec.colloc) // spec carried through
  })
  test('rejects non-objects and too-short sentences', () => {
    expect(validateDacSentencePair(null, spec)).toBeNull()
    expect(validateDacSentencePair({ english: 'Hi', german: 'Ja' }, spec)).toBeNull()
  })
  test('tolerates missing/garbage span fields (best-effort, never rejects on them)', () => {
    const out = validateDacSentencePair({ index: 0, english: 'I am waiting for it.', german: 'Ich warte darauf.' }, spec)
    expect(out).not.toBeNull()
    expect(out!.collocSpanEn).toBeUndefined()
    expect(out!.nounSpansEn).toBeUndefined()
    expect(out!.extraWords).toBeUndefined()
  })
  test('drops malformed extraWords entries, keeps valid ones', () => {
    const out = validateDacSentencePair({
      index: 0, english: 'The cat waits for food on the table.', german: 'Die Katze wartet auf das Futter.',
      extraWords: [{ en: 'cat', de: 'die Katze', kind: 'noun' }, { en: '', de: 'x', kind: 'noun' }, 'junk']
    }, spec)
    expect(out!.extraWords).toEqual([{ en: 'cat', de: 'die Katze', kind: 'noun' }])
  })
})

import { generateDacSentenceBatch } from '../../src/composables/useDaSentenceQuiz'
import type { AiClient } from '../../src/composables/useClaude'

function fakeClient(responder: (prompt: string) => string): AiClient {
  return { models: { generateContent: async (p) => ({ text: responder(String(p.contents ?? '')) }) } }
}
const SPECS = [
  { index: 0, colloc: COLLOCS_FIX[0], nouns: [] },
  { index: 1, colloc: COLLOCS_FIX[1], nouns: [] }
]

describe('generateDacSentenceBatch', () => {
  test('returns one validated sentence per spec', async () => {
    const client = fakeClient(() => JSON.stringify({ items: [
      { index: 0, english: 'I wait for the bus.', german: 'Ich warte auf den Bus.', collocSpanEn: 'wait for', nounSpansEn: [], extraWords: [] },
      { index: 1, english: 'I think about it.', german: 'Ich denke daran.', collocSpanEn: 'think about', nounSpansEn: [], extraWords: [] }
    ] }))
    const res = await generateDacSentenceBatch(client, { model: 'm', specs: SPECS, maxRetries: 0 })
    expect(res.sentences).toHaveLength(2)
    expect(res.sentences.map(s => s.index).sort()).toEqual([0, 1])
  })
  test('retries only the missing specs', async () => {
    let call = 0
    const client = fakeClient(() => {
      call++
      return call === 1
        ? JSON.stringify({ items: [{ index: 0, english: 'I wait for the bus.', german: 'Ich warte auf den Bus.', collocSpanEn: 'wait for', nounSpansEn: [], extraWords: [] }] })
        : JSON.stringify({ items: [{ index: 1, english: 'I think about it.', german: 'Ich denke daran.', collocSpanEn: 'think about', nounSpansEn: [], extraWords: [] }] })
    })
    const res = await generateDacSentenceBatch(client, { model: 'm', specs: SPECS, maxRetries: 2 })
    expect(res.sentences).toHaveLength(2)
    expect(res.attempts).toBe(2)
  })
  test('survives malformed JSON without throwing', async () => {
    const client = fakeClient(() => 'not json at all')
    const res = await generateDacSentenceBatch(client, { model: 'm', specs: SPECS, maxRetries: 1 })
    expect(res.sentences).toHaveLength(0)
  })
})

import { buildDacHintInputs } from '../../src/composables/useDaSentenceQuiz'
import { buildHintSegments } from '../../src/composables/useSentenceQuiz'

describe('buildDacHintInputs', () => {
  const sentence = {
    index: 0,
    colloc: COLLOCS_FIX[0], // warten auf
    nouns: [{ german: 'Konzert', article: 'das' as const, english: 'concert' }],
    english: 'We are looking forward to the concert next week.',
    german: 'Wir freuen uns auf das Konzert nächste Woche.',
    collocSpanEn: 'looking forward to',
    nounSpansEn: ['concert'],
    extraWords: [{ en: 'week', de: 'die Woche', kind: 'noun' as const }]
  }

  test('builds hints for the collocation (OUR word+preposition), theme noun (OUR German), extras (AI German)', () => {
    const hints = buildDacHintInputs(sentence)
    expect(hints).toContainEqual({ surface: 'looking forward to', kind: 'verb', reveal: 'warten auf' })
    expect(hints).toContainEqual({ surface: 'concert', kind: 'noun', reveal: 'das Konzert' })
    expect(hints).toContainEqual({ surface: 'week', kind: 'noun', reveal: 'die Woche' })
  })
  test('the hints anchor into the sentence via buildHintSegments (lossless)', () => {
    const segs = buildHintSegments(sentence.english, buildDacHintInputs(sentence))
    expect(segs.map(s => s.text).join('')).toBe(sentence.english)
    expect(segs.some(s => s.hint?.reveal === 'warten auf')).toBe(true)
  })
  test('skips empty surfaces and missing arrays', () => {
    const hints = buildDacHintInputs({ ...sentence, collocSpanEn: undefined, nounSpansEn: undefined, extraWords: undefined })
    expect(hints).toEqual([])
  })
})

import {
  buildDacGradePrompt, parseDacGrade, gradeDacAnswer, buildDacDrillItem
} from '../../src/composables/useDaSentenceQuiz'

describe('buildDacGradePrompt', () => {
  const base = {
    english: 'I am looking forward to the trip.', german: 'Ich freue mich auf die Reise.',
    collocWord: 'sich freuen', preposition: 'auf', case: 'accusative' as const,
    userAnswer: 'Ich freue mich auf die Reise.'
  }
  test('EN→DE mentions the collocation + learner answer and lists all 5 tags incl. compound', () => {
    const p = buildDacGradePrompt({ ...base, direction: 'en-de' })
    expect(p.system).toContain('"preposition"')
    expect(p.system).toContain('"compound"')
    expect(p.system).toContain('"case"')
    expect(p.system).toContain('"noun"')
    expect(p.system).toContain('"typo"')
    expect(p.user).toContain('sich freuen')
    expect(p.user).toContain('Ich freue mich auf die Reise.')
  })
  test('DE→EN judges meaning only and requests NO error tags', () => {
    const p = buildDacGradePrompt({ ...base, direction: 'de-en' })
    expect(p.system).not.toContain('"compound"')
    expect(p.system).not.toContain('"preposition"')
    expect(p.system.toLowerCase()).toContain('meaning')
  })
})

describe('parseDacGrade', () => {
  test('valid correct grade', () => {
    expect(parseDacGrade({ correct: true })).toEqual({ correct: true })
  })
  test('keeps tip + filters tags to the 5-tag set (compound is valid)', () => {
    expect(parseDacGrade({ correct: false, tip: 'Wrong compound.', errorTags: ['compound', 'banana', 'preposition'] }))
      .toEqual({ correct: false, tip: 'Wrong compound.', tags: ['compound', 'preposition'] })
  })
  test('rejects non-objects and missing boolean', () => {
    expect(parseDacGrade(null)).toBeNull()
    expect(parseDacGrade({ tip: 'x' })).toBeNull()
  })
})

describe('gradeDacAnswer', () => {
  test('EN→DE returns the parsed grade with tags', async () => {
    const client: AiClient = { models: { generateContent: async () => ({ text: JSON.stringify({ correct: false, tip: 'Malformed da-compound.', errorTags: ['compound'] }) }) } }
    const g = await gradeDacAnswer(client, { model: 'm', direction: 'en-de', english: 'x', german: 'y', collocWord: 'warten', preposition: 'auf', case: 'accusative', userAnswer: 'z' })
    expect(g.correct).toBe(false)
    expect(g.tags).toEqual(['compound'])
  })
  test('DE→EN drops any tags (meaning-only)', async () => {
    const client: AiClient = { models: { generateContent: async () => ({ text: JSON.stringify({ correct: false, tip: 'Meaning off.', errorTags: ['compound'] }) }) } }
    const g = await gradeDacAnswer(client, { model: 'm', direction: 'de-en', english: 'x', german: 'y', collocWord: 'warten', preposition: 'auf', case: 'accusative', userAnswer: 'z' })
    expect(g.correct).toBe(false)
    expect(g.tags).toBeUndefined()
  })
  test('throws after exhausting retries on bad JSON', async () => {
    const client: AiClient = { models: { generateContent: async () => ({ text: 'nope' }) } }
    await expect(gradeDacAnswer(client, { model: 'm', direction: 'en-de', english: 'x', german: 'y', collocWord: 'w', preposition: 'auf', case: 'accusative', userAnswer: 'z' })).rejects.toThrow()
  })
})

describe('buildDacDrillItem', () => {
  const s = {
    index: 0, colloc: COLLOCS_FIX[0],
    nouns: [{ german: 'Konzert', article: 'das' as const, english: 'concert' }],
    english: 'x', german: 'y'
  }
  test('records collocation id/word/preposition + noun keys and correctness', () => {
    expect(buildDacDrillItem(s, true)).toEqual({
      collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', nounKeys: ['Konzert'], correct: true
    })
  })
  test('attaches tags when present', () => {
    expect(buildDacDrillItem(s, false, ['compound']).tags).toEqual(['compound'])
  })
})
