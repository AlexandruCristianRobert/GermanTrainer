import { describe, test, expect } from 'vitest'
import type { Preposition } from '../../src/data/prepositions'
import type { AiClient } from '../../src/composables/useClaude'
import {
  normalizeGerman,
  checkSentence,
  prepUsed,
  pickPrepositions,
  buildSpecs,
  validateSentencePair,
  buildGeneratePrompt,
  generateSentences,
  buildGradePrompt,
  parseGrade,
  gradeAnswer,
  buildHintSegments,
  type NounRef,
  type SentenceSpec,
  type GradeAnswerOptions,
  type HintInput
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

// ───────────────────────────── checkSentence ──────────────────────────
describe('checkSentence', () => {
  const ref = 'Ich arbeite mit dem Tisch.'
  test('accepts an exact match', () => {
    expect(checkSentence('Ich arbeite mit dem Tisch.', ref)).toBe(true)
  })
  test('ignores trailing or missing punctuation (.?!)', () => {
    expect(checkSentence('Ich arbeite mit dem Tisch', ref)).toBe(true)
    expect(checkSentence('Ich arbeite mit dem Tisch?', ref)).toBe(true)
  })
  test('collapses accidental double spaces', () => {
    expect(checkSentence('Ich  arbeite   mit dem Tisch', ref)).toBe(true)
  })
  test('ignores case', () => {
    expect(checkSentence('ich arbeite mit dem tisch', ref)).toBe(true)
  })
  test('rejects a different sentence', () => {
    expect(checkSentence('Ich arbeite mit dem Stuhl.', ref)).toBe(false)
  })
  test('rejects wrong word order (exact match only)', () => {
    expect(checkSentence('Mit dem Tisch arbeite ich.', ref)).toBe(false)
  })
  test('rejects a blank answer', () => {
    expect(checkSentence('', ref)).toBe(false)
    expect(checkSentence('   ', ref)).toBe(false)
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
  test('accepts and stores valid prepSpanEn + nounSpansEn', () => {
    const got = validateSentencePair(
      {
        index: 0,
        english: 'I work with the table.',
        german: 'Ich arbeite mit dem Tisch.',
        prepSpanEn: 'with',
        nounSpansEn: ['table']
      },
      spec
    )
    expect(got).not.toBeNull()
    expect(got?.prepSpanEn).toBe('with')
    expect(got?.nounSpansEn).toEqual(['table'])
  })
  test('accepts a pair with NO span fields (fields undefined)', () => {
    const got = validateSentencePair(
      { index: 0, english: 'I work with the table.', german: 'Ich arbeite mit dem Tisch.' },
      spec
    )
    expect(got).not.toBeNull()
    expect(got?.prepSpanEn).toBeUndefined()
    expect(got?.nounSpansEn).toBeUndefined()
  })
  test('ignores malformed span fields (prepSpanEn: number, nounSpansEn: string)', () => {
    const got = validateSentencePair(
      {
        index: 0,
        english: 'I work with the table.',
        german: 'Ich arbeite mit dem Tisch.',
        prepSpanEn: 123,
        nounSpansEn: 'x'
      },
      spec
    )
    expect(got).not.toBeNull()
    expect(got?.prepSpanEn).toBeUndefined()
    expect(got?.nounSpansEn).toBeUndefined()
  })
  test('drops non-string entries inside nounSpansEn and trims kept ones', () => {
    const got = validateSentencePair(
      {
        index: 0,
        english: 'I work with the table.',
        german: 'Ich arbeite mit dem Tisch.',
        prepSpanEn: '  with  ',
        nounSpansEn: ['  table  ', 5, null, 'chair']
      },
      spec
    )
    expect(got).not.toBeNull()
    expect(got?.prepSpanEn).toBe('with')
    expect(got?.nounSpansEn).toEqual(['table', 'chair'])
  })
  test('omits an empty/whitespace-only prepSpanEn', () => {
    const got = validateSentencePair(
      {
        index: 0,
        english: 'I work with the table.',
        german: 'Ich arbeite mit dem Tisch.',
        prepSpanEn: '   '
      },
      spec
    )
    expect(got).not.toBeNull()
    expect(got?.prepSpanEn).toBeUndefined()
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
  test('buildGeneratePrompt mentions prepSpanEn and nounSpansEn', () => {
    const specs: SentenceSpec[] = [{
      index: 0, prepId: 'mit', prepGerman: 'mit', prepEnglish: 'with',
      case: 'dative', nouns: [{ german: 'Tisch', article: 'der', english: 'table' }]
    }]
    const p = buildGeneratePrompt(specs, 'A2–B1')
    expect(p).toContain('prepSpanEn')
    expect(p).toContain('nounSpansEn')
  })
})

// ─────────────────────────── buildHintSegments ────────────────────────
describe('buildHintSegments', () => {
  test('locates a prep and a noun, segments in sentence order with kind + reveal', () => {
    const english = 'I work with the table.'
    const hints: HintInput[] = [
      { surface: 'with', kind: 'prep', reveal: 'mit' },
      { surface: 'table', kind: 'noun', reveal: 'der Tisch' }
    ]
    const segs = buildHintSegments(english, hints)
    // joined text round-trips exactly
    expect(segs.map(s => s.text).join('')).toBe(english)
    const hinted = segs.filter(s => s.hint)
    expect(hinted).toHaveLength(2)
    // sentence order: prep ("with") before noun ("table")
    expect(hinted[0].text).toBe('with')
    expect(hinted[0].hint).toEqual({ kind: 'prep', reveal: 'mit' })
    expect(hinted[1].text).toBe('table')
    expect(hinted[1].hint).toEqual({ kind: 'noun', reveal: 'der Tisch' })
  })

  test('is case-insensitive and preserves original casing in the segment text', () => {
    const english = 'Onto the table the cat jumps.'
    const segs = buildHintSegments(english, [
      { surface: 'onto', kind: 'prep', reveal: 'auf' }
    ])
    expect(segs.map(s => s.text).join('')).toBe(english)
    const hinted = segs.filter(s => s.hint)
    expect(hinted).toHaveLength(1)
    expect(hinted[0].text).toBe('Onto') // original casing preserved
    expect(hinted[0].hint).toEqual({ kind: 'prep', reveal: 'auf' })
  })

  test('respects word boundaries: "on" does not highlight inside "onto"', () => {
    const english = 'The cat jumps onto the table.'
    const segs = buildHintSegments(english, [
      { surface: 'on', kind: 'prep', reveal: 'auf' }
    ])
    // No range anchors -> single plain segment.
    expect(segs).toEqual([{ text: english }])
  })

  test('orders by position even when the prep appears AFTER the noun', () => {
    const english = 'The table is covered with a cloth.'
    const hints: HintInput[] = [
      { surface: 'with', kind: 'prep', reveal: 'mit' },
      { surface: 'table', kind: 'noun', reveal: 'der Tisch' }
    ]
    const segs = buildHintSegments(english, hints)
    expect(segs.map(s => s.text).join('')).toBe(english)
    const hinted = segs.filter(s => s.hint)
    expect(hinted.map(s => s.text)).toEqual(['table', 'with']) // noun first by position
    expect(hinted[0].hint).toEqual({ kind: 'noun', reveal: 'der Tisch' })
    expect(hinted[1].hint).toEqual({ kind: 'prep', reveal: 'mit' })
  })

  test('skips a surface that is not present (quiz-safe), keeps the rest', () => {
    const english = 'I work with the table.'
    const hints: HintInput[] = [
      { surface: 'with', kind: 'prep', reveal: 'mit' },
      { surface: 'chair', kind: 'noun', reveal: 'der Stuhl' } // absent
    ]
    const segs = buildHintSegments(english, hints)
    expect(segs.map(s => s.text).join('')).toBe(english)
    const hinted = segs.filter(s => s.hint)
    expect(hinted).toHaveLength(1)
    expect(hinted[0].text).toBe('with')
  })

  test('returns a single plain segment for empty hints', () => {
    const english = 'I work with the table.'
    expect(buildHintSegments(english, [])).toEqual([{ text: english }])
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

// ─────────────────────────── buildGradePrompt ─────────────────────────
const EN_DE_OPTS: GradeAnswerOptions = {
  model: 'm',
  direction: 'en-de',
  english: 'I work with the table.',
  german: 'Ich arbeite mit dem Tisch.',
  prepGerman: 'mit',
  prepEnglish: 'with',
  case: 'dative',
  userAnswer: 'Ich arbeite mit dem Tisch.'
}

const DE_EN_OPTS: GradeAnswerOptions = {
  ...EN_DE_OPTS,
  direction: 'de-en',
  userAnswer: 'I work with the table.'
}

describe('buildGradePrompt', () => {
  test('en-de: user mentions English source, German reference, prep and answer', () => {
    const { user, system } = buildGradePrompt(EN_DE_OPTS)
    expect(user).toContain('I work with the table.') // English source / reference
    expect(user).toContain('Ich arbeite mit dem Tisch.') // German reference / answer
    expect(user).toContain('mit') // target preposition
    expect(user).toContain('dative') // case (via caseLabel)
    expect(system).toContain('tip') // instructs returning a tip on a wrong answer
  })

  test('en-de: system instructs JSON-only and tip-on-miss; case is mentioned', () => {
    const { system } = buildGradePrompt(EN_DE_OPTS)
    expect(system.toLowerCase()).toContain('json')
    expect(system).toContain('tip')
  })

  test('de-en: prompt makes clear the learner typed English / must convey the German', () => {
    const { user, system } = buildGradePrompt(DE_EN_OPTS)
    // The German is the source the learner had to convey.
    expect(user).toContain('Ich arbeite mit dem Tisch.')
    // The learner's English answer is present.
    expect(user).toContain('I work with the table.')
    // System should communicate that English conveys the German meaning.
    expect(system.toLowerCase()).toContain('english')
    expect(system.toLowerCase()).toContain('mean')
  })

  test('en-de: system requests errorTags and names the categories', () => {
    const { system } = buildGradePrompt(EN_DE_OPTS)
    expect(system).toContain('errorTags')
    expect(system).toContain('preposition')
    expect(system).toContain('case')
    expect(system).toContain('noun')
    expect(system).toContain('typo')
  })

  test('de-en: does NOT request errorTags', () => {
    const { system, user } = buildGradePrompt(DE_EN_OPTS)
    expect(system).not.toContain('errorTags')
    expect(user).not.toContain('errorTags')
  })
})

// ───────────────────────────── parseGrade ─────────────────────────────
describe('parseGrade', () => {
  test('accepts {correct:true} with no tip', () => {
    expect(parseGrade({ correct: true })).toEqual({ correct: true })
  })
  test('accepts {correct:false, tip} and includes the tip', () => {
    expect(parseGrade({ correct: false, tip: 'Use dative here.' }))
      .toEqual({ correct: false, tip: 'Use dative here.' })
  })
  test('trims a tip', () => {
    expect(parseGrade({ correct: false, tip: '  Use dative here.  ' }))
      .toEqual({ correct: false, tip: 'Use dative here.' })
  })
  test('drops an empty / whitespace-only tip', () => {
    expect(parseGrade({ correct: true, tip: '   ' })).toEqual({ correct: true })
    expect(parseGrade({ correct: false, tip: '' })).toEqual({ correct: false })
  })
  test('returns null for null', () => {
    expect(parseGrade(null)).toBeNull()
  })
  test('returns null for a string', () => {
    expect(parseGrade('nope')).toBeNull()
  })
  test('returns null when correct is missing or non-boolean', () => {
    expect(parseGrade({})).toBeNull()
    expect(parseGrade({ correct: 'yes' })).toBeNull()
    expect(parseGrade({ correct: 1 })).toBeNull()
  })
  test('maps valid errorTags onto tags', () => {
    expect(parseGrade({ correct: false, tip: 'x', errorTags: ['case', 'noun'] }))
      .toEqual({ correct: false, tip: 'x', tags: ['case', 'noun'] })
  })
  test('filters out invalid errorTags values', () => {
    expect(parseGrade({ correct: false, tip: 'x', errorTags: ['case', 'bogus'] }))
      .toEqual({ correct: false, tip: 'x', tags: ['case'] })
  })
  test('leaves tags undefined for empty / absent / all-invalid errorTags', () => {
    expect(parseGrade({ correct: false, tip: 'x' })?.tags).toBeUndefined()
    expect(parseGrade({ correct: false, tip: 'x', errorTags: [] })?.tags).toBeUndefined()
    expect(parseGrade({ correct: false, tip: 'x', errorTags: ['bogus'] })?.tags).toBeUndefined()
    expect(parseGrade({ correct: false, tip: 'x', errorTags: 'case' })?.tags).toBeUndefined()
  })
  test('correct:true still parses with no tags', () => {
    expect(parseGrade({ correct: true })).toEqual({ correct: true })
  })
})

// ───────────────────────────── gradeAnswer ────────────────────────────
describe('gradeAnswer', () => {
  test('happy path returns the parsed grade', async () => {
    const client = fakeClient(() => JSON.stringify({ correct: true, tip: '' }))
    const grade = await gradeAnswer(client, EN_DE_OPTS)
    expect(grade).toEqual({ correct: true })
  })

  test('returns the tip on a wrong answer', async () => {
    const client = fakeClient(() =>
      JSON.stringify({ correct: false, tip: 'Wrong case: use dative.' }))
    const grade = await gradeAnswer(client, EN_DE_OPTS)
    expect(grade).toEqual({ correct: false, tip: 'Wrong case: use dative.' })
  })

  test('throws after retrying when the client always returns non-JSON', async () => {
    const client = fakeClient(() => 'not json')
    await expect(gradeAnswer(client, EN_DE_OPTS)).rejects.toThrow()
  })
})
