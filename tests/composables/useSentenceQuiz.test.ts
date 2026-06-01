import { describe, test, expect } from 'vitest'
import type { Preposition } from '../../src/data/prepositions'
import type { AiClient } from '../../src/composables/useClaude'
import {
  normalizeGerman,
  prepUsed,
  pickPrepositions,
  buildSpecs,
  validateSentencePair,
  buildGeneratePrompt,
  buildGradePrompt,
  generateSentences,
  gradeSentences,
  type NounRef,
  type SentenceSpec,
  type GradeInput
} from '../../src/composables/useSentenceQuiz'

// ── A small deterministic RNG so shuffle-based fns are testable ──
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function prep(id: string, german: string, c: Preposition['case'] = 'dative'): Preposition {
  return { id, german, english: id, case: c, level: 'A1', examples: [] }
}

const NOUNS: NounRef[] = [
  { german: 'Tisch', article: 'der', english: 'table' },
  { german: 'Lampe', article: 'die', english: 'lamp' },
  { german: 'Haus', article: 'das', english: 'house' },
  { german: 'Stuhl', article: 'der', english: 'chair' }
]

// ─────────────────────────── normalizeGerman ──────────────────────────
describe('normalizeGerman', () => {
  test('lowercases, strips punctuation, collapses whitespace', () => {
    expect(normalizeGerman('  Ich  gehe, nach   Hause! ')).toBe('ich gehe nach hause')
  })
  test('handles German quote marks', () => {
    expect(normalizeGerman('„Hallo“')).toBe('hallo')
  })
})

// ───────────────────────────── prepUsed ───────────────────────────────
describe('prepUsed', () => {
  test('detects a plain preposition as a whole word', () => {
    expect(prepUsed('Wir gehen durch den Park.', 'durch')).toBe(true)
  })
  test('does not match a preposition embedded in another word', () => {
    expect(prepUsed('Sie umarmt das Kind.', 'um')).toBe(false)
  })
  test('detects contracted forms (in -> im)', () => {
    expect(prepUsed('Das Buch liegt im Regal.', 'in')).toBe(true)
  })
  test('detects contracted forms (an -> am)', () => {
    expect(prepUsed('Wir sitzen am Tisch.', 'an')).toBe(true)
  })
  test('returns false when the preposition is absent', () => {
    expect(prepUsed('Der Tisch ist groß.', 'mit')).toBe(false)
  })
})

// ─────────────────────────── pickPrepositions ─────────────────────────
describe('pickPrepositions', () => {
  const pool = [prep('a', 'an'), prep('b', 'bei'), prep('c', 'mit')]
  test('returns exactly count when count <= pool size, all distinct', () => {
    const got = pickPrepositions(pool, 2, seeded(1))
    expect(got).toHaveLength(2)
    expect(new Set(got.map(p => p.id)).size).toBe(2)
  })
  test('returns exactly count with repeats when count > pool size', () => {
    const got = pickPrepositions(pool, 7, seeded(1))
    expect(got).toHaveLength(7)
  })
  test('empty pool yields empty', () => {
    expect(pickPrepositions([], 5)).toEqual([])
  })
  test('uses the rng (deterministic with a seed)', () => {
    expect(pickPrepositions(pool, 3, seeded(42)).map(p => p.id))
      .toEqual(pickPrepositions(pool, 3, seeded(42)).map(p => p.id))
  })
})

// ───────────────────────────── buildSpecs ─────────────────────────────
describe('buildSpecs', () => {
  const preps = [prep('a', 'an'), prep('b', 'bei')]
  test('assigns exactly 1 noun per sentence when nounsPerSentence=1', () => {
    const specs = buildSpecs(preps, NOUNS, 1, seeded(3))
    expect(specs).toHaveLength(2)
    expect(specs.every(s => s.nouns.length === 1)).toBe(true)
  })
  test('assigns 2 distinct nouns per sentence when nounsPerSentence=2', () => {
    const specs = buildSpecs(preps, NOUNS, 2, seeded(3))
    expect(specs.every(s => s.nouns.length === 2)).toBe(true)
    expect(specs.every(s => s.nouns[0].german !== s.nouns[1].german)).toBe(true)
  })
  test('carries preposition metadata and sequential index', () => {
    const specs = buildSpecs(preps, NOUNS, 1, seeded(3))
    expect(specs[0].index).toBe(0)
    expect(specs[1].index).toBe(1)
    expect(specs[0].prepGerman).toBe('an')
  })
  test('empty noun pool yields specs with no nouns', () => {
    const specs = buildSpecs(preps, [], 2, seeded(3))
    expect(specs.every(s => s.nouns.length === 0)).toBe(true)
  })
})

// ──────────────────────── validateSentencePair ────────────────────────
describe('validateSentencePair', () => {
  const spec: SentenceSpec = {
    index: 0, prepId: 'mit', prepGerman: 'mit', prepEnglish: 'with',
    case: 'dative', nouns: [{ german: 'Tisch', article: 'der', english: 'table' }]
  }
  test('accepts a well-formed pair that uses the preposition', () => {
    const got = validateSentencePair(
      { index: 0, english: 'I work with the table.', german: 'Ich arbeite mit dem Tisch.' },
      spec
    )
    expect(got).not.toBeNull()
    expect(got?.english).toBe('I work with the table.')
  })
  test('rejects when the preposition is missing from the German', () => {
    expect(validateSentencePair(
      { index: 0, english: 'The table is big.', german: 'Der Tisch ist groß.' },
      spec
    )).toBeNull()
  })
  test('rejects empty / too-short fields', () => {
    expect(validateSentencePair({ index: 0, english: '', german: 'Ich mit.' }, spec)).toBeNull()
  })
  test('rejects non-objects', () => {
    expect(validateSentencePair(null, spec)).toBeNull()
    expect(validateSentencePair('nope', spec)).toBeNull()
  })
})

// ───────────────────────── prompt builders ────────────────────────────
describe('prompt builders', () => {
  test('buildGeneratePrompt lists each spec with prep + nouns', () => {
    const specs: SentenceSpec[] = [{
      index: 0, prepId: 'mit', prepGerman: 'mit', prepEnglish: 'with',
      case: 'dative', nouns: [{ german: 'Tisch', article: 'der', english: 'table' }]
    }]
    const p = buildGeneratePrompt(specs, 'A2–B1')
    expect(p).toContain('#0')
    expect(p).toContain('"mit"')
    expect(p).toContain('der Tisch')
    expect(p).toContain('A2–B1')
  })
  test('buildGradePrompt includes the learner answer and reference', () => {
    const inputs: GradeInput[] = [{
      index: 0, english: 'I work with the table.', german: 'Ich arbeite mit dem Tisch.',
      prepGerman: 'mit', case: 'dative', answer: 'Ich arbeite mit dem Tisch.'
    }]
    const p = buildGradePrompt(inputs)
    expect(p).toContain('Reference German: Ich arbeite mit dem Tisch.')
    expect(p).toContain('Learner answer: Ich arbeite mit dem Tisch.')
  })
})

// ── Fake AI client helpers ──
function fakeClient(textFor: (prompt: string, call: number) => string): AiClient {
  let call = 0
  return {
    models: {
      async generateContent(params: Record<string, unknown>) {
        call++
        return { text: textFor(String(params.contents ?? ''), call) }
      }
    }
  }
}

const SPECS: SentenceSpec[] = [
  { index: 0, prepId: 'mit', prepGerman: 'mit', prepEnglish: 'with', case: 'dative', nouns: [] },
  { index: 1, prepId: 'durch', prepGerman: 'durch', prepEnglish: 'through', case: 'accusative', nouns: [] }
]

// ─────────────────────────── generateSentences ────────────────────────
describe('generateSentences', () => {
  test('returns one validated sentence per spec on a clean response', async () => {
    const client = fakeClient(() => JSON.stringify({
      items: [
        { index: 0, english: 'I go with him.', german: 'Ich gehe mit ihm.' },
        { index: 1, english: 'We walk through the park.', german: 'Wir gehen durch den Park.' }
      ]
    }))
    const res = await generateSentences(client, { model: 'm', specs: SPECS, maxRetries: 2 })
    expect(res.sentences).toHaveLength(2)
    expect(res.sentences.map(s => s.index)).toEqual([0, 1])
    expect(res.attempts).toBe(1)
  })

  test('retries only the missing/invalid specs', async () => {
    const client = fakeClient((_p, call) => {
      if (call === 1) {
        // First call: index 0 valid, index 1 invalid (no preposition).
        return JSON.stringify({ items: [
          { index: 0, english: 'I go with him.', german: 'Ich gehe mit ihm.' },
          { index: 1, english: 'We walk.', german: 'Wir gehen.' }
        ] })
      }
      // Second call: now index 1 is valid.
      return JSON.stringify({ items: [
        { index: 1, english: 'We walk through the park.', german: 'Wir gehen durch den Park.' }
      ] })
    })
    const res = await generateSentences(client, { model: 'm', specs: SPECS, maxRetries: 2 })
    expect(res.sentences).toHaveLength(2)
    expect(res.attempts).toBe(2)
    expect(res.rejected).toBe(1)
  })

  test('survives malformed JSON and stops after maxRetries', async () => {
    const client = fakeClient(() => 'not json')
    const res = await generateSentences(client, { model: 'm', specs: SPECS, maxRetries: 1 })
    expect(res.sentences).toHaveLength(0)
    expect(res.attempts).toBe(2) // initial + 1 retry
  })
})

// ──────────────────────────── gradeSentences ──────────────────────────
const GRADE_INPUTS: GradeInput[] = [
  { index: 0, english: 'I go with him.', german: 'Ich gehe mit ihm.', prepGerman: 'mit', case: 'dative', answer: 'Ich gehe mit ihm.' },
  { index: 1, english: 'We walk through the park.', german: 'Wir gehen durch den Park.', prepGerman: 'durch', case: 'accusative', answer: 'falsch' }
]

describe('gradeSentences', () => {
  test('maps AI verdicts back by index', async () => {
    const client = fakeClient(() => JSON.stringify({
      items: [
        { index: 0, correct: true, feedback: 'Richtig.', correction: 'Ich gehe mit ihm.' },
        { index: 1, correct: false, feedback: 'Falscher Satz.', correction: 'Wir gehen durch den Park.' }
      ]
    }))
    const verdicts = await gradeSentences(client, 'm', GRADE_INPUTS)
    expect(verdicts.get(0)?.correct).toBe(true)
    expect(verdicts.get(1)?.correct).toBe(false)
    expect(verdicts.get(1)?.correction).toBe('Wir gehen durch den Park.')
  })

  test('falls back to exact-match when AI returns malformed JSON', async () => {
    const client = fakeClient(() => 'broken')
    const verdicts = await gradeSentences(client, 'm', GRADE_INPUTS)
    // index 0 answer equals reference (exact) -> correct; index 1 differs -> wrong
    expect(verdicts.get(0)?.correct).toBe(true)
    expect(verdicts.get(1)?.correct).toBe(false)
  })

  test('falls back when the AI call throws', async () => {
    const client: AiClient = {
      models: { async generateContent() { throw new Error('network') } }
    }
    const verdicts = await gradeSentences(client, 'm', GRADE_INPUTS)
    expect(verdicts.size).toBe(2)
    expect(verdicts.get(0)?.correct).toBe(true)
  })

  test('backfills items the AI skipped', async () => {
    const client = fakeClient(() => JSON.stringify({
      items: [{ index: 0, correct: true, feedback: 'ok', correction: 'Ich gehe mit ihm.' }]
    }))
    const verdicts = await gradeSentences(client, 'm', GRADE_INPUTS)
    expect(verdicts.size).toBe(2)
    expect(verdicts.has(1)).toBe(true)
  })

  test('empty input yields empty map', async () => {
    const client = fakeClient(() => '{}')
    expect((await gradeSentences(client, 'm', [])).size).toBe(0)
  })
})
