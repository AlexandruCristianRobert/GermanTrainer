import { describe, test, expect } from 'vitest'
import type { CollocRef } from '../../src/composables/useDaSentenceQuiz'
import type { NounRef } from '../../src/composables/useSentenceQuiz'
import type { AiClient } from '../../src/composables/useClaude'
import {
  DAC_ANSWER_ANGLE_POOL,
  buildAnswerGeneratePrompt,
  validateDacQuestion,
  generateDacQuestionBatch,
  buildAnswerGradePrompt,
  parseAnswerGrade,
  gradeDacAnswerReply,
  buildDacAnswerItem,
  type GeneratedDacQuestion
} from '../../src/composables/useDaAnswerQuiz'

const COLLOCS_FIX: CollocRef[] = [
  { id: 'warten-auf', word: 'warten', english: 'to wait for', preposition: 'auf', case: 'accusative', level: 'B1' },
  { id: 'denken-an', word: 'denken', english: 'to think of/about', preposition: 'an', case: 'accusative', level: 'B1' },
  { id: 'teilnehmen-an', word: 'teilnehmen', english: 'to take part in', preposition: 'an', case: 'dative', level: 'B2' }
]
const CONCERT: NounRef = { german: 'Konzert', article: 'das', english: 'concert' }

function fakeClient(responder: (prompt: string) => string): AiClient {
  return { models: { generateContent: async (p) => ({ text: responder(String(p.contents ?? '')) }) } }
}

const SPECS = [
  { index: 0, colloc: COLLOCS_FIX[0], nouns: [CONCERT] },
  { index: 1, colloc: COLLOCS_FIX[2], nouns: [] }
]

// ───────────────────────── generation prompt ──────────────────────────

describe('buildAnswerGeneratePrompt', () => {
  const prompt = buildAnswerGeneratePrompt(
    SPECS,
    'B1/B2',
    { angles: ['ask a yes/no question', 'ask about the weekend'], seed: 'seed42' }
  )

  test('lists every spec index with its collocation word + preposition + case cue + nouns', () => {
    expect(prompt).toContain('#0')
    expect(prompt).toContain('warten')
    expect(prompt).toContain('auf')
    expect(prompt).toContain('das Konzert (concert)')
    expect(prompt).toContain('#1')
    expect(prompt).toContain('teilnehmen')
    expect(prompt).toMatch(/[Aa]kkusativ|accusative/)
    expect(prompt).toMatch(/[Dd]ativ|dative/)
  })
  test('requires a QUESTION addressed to the learner (du / ihr / Sie)', () => {
    expect(prompt.toLowerCase()).toContain('question')
    expect(prompt).toContain('du')
  })
  test('states the exampleAnswer da-compound rule (thing/clause, never a person)', () => {
    const low = prompt.toLowerCase()
    expect(low).toContain('exampleanswer')
    expect(low).toContain('da-compound')
    expect(low).toContain('person')
    expect(prompt).toMatch(/darauf|damit|daran/)
  })
  test('injects the variety angles, seed, and target level', () => {
    expect(prompt).toContain('ask a yes/no question')
    expect(prompt).toContain('seed42')
    expect(prompt).toContain('B1/B2')
  })
  test('DAC_ANSWER_ANGLE_POOL has enough distinct angles to rotate', () => {
    expect(new Set(DAC_ANSWER_ANGLE_POOL).size).toBeGreaterThanOrEqual(12)
  })
})

// ─────────────────────────── validation ───────────────────────────────

describe('validateDacQuestion', () => {
  const spec = { index: 0, colloc: COLLOCS_FIX[0], nouns: [CONCERT] }

  test('accepts a well-formed question + answer, carries the spec through', () => {
    const out = validateDacQuestion(
      { index: 0, question: 'Freust du dich auf das Konzert?', exampleAnswer: 'Ja, ich freue mich sehr darauf.' },
      spec
    )
    expect(out).not.toBeNull()
    expect(out!.question).toBe('Freust du dich auf das Konzert?')
    expect(out!.exampleAnswer).toBe('Ja, ich freue mich sehr darauf.')
    expect(out!.colloc).toEqual(spec.colloc)
    expect(out!.nouns).toEqual(spec.nouns)
  })
  test('trims whitespace on both strings', () => {
    const out = validateDacQuestion(
      { index: 0, question: '  Worauf wartest du?  ', exampleAnswer: '  Ich warte darauf, dass der Bus kommt.  ' },
      spec
    )
    expect(out!.question).toBe('Worauf wartest du?')
    expect(out!.exampleAnswer).toBe('Ich warte darauf, dass der Bus kommt.')
  })
  test('rejects non-objects and too-short strings', () => {
    expect(validateDacQuestion(null, spec)).toBeNull()
    expect(validateDacQuestion({ question: 'Hi', exampleAnswer: 'Ja.' }, spec)).toBeNull()
    expect(validateDacQuestion({ question: 'Worauf wartest du?', exampleAnswer: '' }, spec)).toBeNull()
  })
})

// ──────────────────────────── batch loop ──────────────────────────────

describe('generateDacQuestionBatch', () => {
  test('returns one validated question per spec', async () => {
    const client = fakeClient(() => JSON.stringify({ items: [
      { index: 0, question: 'Freust du dich auf das Konzert?', exampleAnswer: 'Ja, ich freue mich sehr darauf.' },
      { index: 1, question: 'Nimmst du an dem Kurs teil?', exampleAnswer: 'Ja, ich nehme gern daran teil.' }
    ] }))
    const res = await generateDacQuestionBatch(client, { model: 'm', specs: SPECS, maxRetries: 0 })
    expect(res.questions).toHaveLength(2)
    expect(res.questions.map(q => q.index).sort()).toEqual([0, 1])
  })
  test('retries only the missing specs', async () => {
    let call = 0
    const client = fakeClient(() => {
      call++
      return call === 1
        ? JSON.stringify({ items: [{ index: 0, question: 'Freust du dich auf das Konzert?', exampleAnswer: 'Ja, ich freue mich sehr darauf.' }] })
        : JSON.stringify({ items: [{ index: 1, question: 'Nimmst du an dem Kurs teil?', exampleAnswer: 'Ja, ich nehme gern daran teil.' }] })
    })
    const res = await generateDacQuestionBatch(client, { model: 'm', specs: SPECS, maxRetries: 2 })
    expect(res.questions).toHaveLength(2)
    expect(res.attempts).toBe(2)
  })
  test('survives malformed JSON without throwing', async () => {
    const client = fakeClient(() => 'not json at all')
    const res = await generateDacQuestionBatch(client, { model: 'm', specs: SPECS, maxRetries: 1 })
    expect(res.questions).toHaveLength(0)
  })
})

// ─────────────────────────── grading prompt ───────────────────────────

describe('buildAnswerGradePrompt', () => {
  const base = {
    question: 'Freust du dich auf das Wochenende?',
    exampleAnswer: 'Ja, ich freue mich sehr darauf.',
    collocWord: 'sich freuen',
    preposition: 'auf',
    case: 'accusative' as const,
    userAnswer: 'Darauf freue ich mich schon lange.'
  }
  const p = buildAnswerGradePrompt(base)

  test('defines all SIX error tags', () => {
    expect(p.system).toContain('"preposition"')
    expect(p.system).toContain('"compound"')
    expect(p.system).toContain('"case"')
    expect(p.system).toContain('"noun"')
    expect(p.system).toContain('"word-order"')
    expect(p.system).toContain('"typo"')
  })
  test('accept-list covers Mittelfeld, fronted compound, full noun phrase, ja/nein/doch', () => {
    const low = p.system.toLowerCase()
    expect(low).toContain('mittelfeld')
    expect(low).toContain('fronted')
    expect(low).toContain('noun phrase')
    expect(low).toContain('doch')
    // an actual fronted-compound example and a Mittelfeld example
    expect(p.system).toContain('Darauf freue ich mich')
    expect(p.system).toContain('darauf')
  })
  test('separates compound (form/choice) from word-order (position)', () => {
    const low = p.system.toLowerCase()
    expect(low).toContain('position')
    expect(low).toContain('verb-second')
    // compound tag talks about person/thing swap
    expect(low).toContain('person')
  })
  test('user block carries the question, example answer, collocation, and learner answer', () => {
    expect(p.user).toContain('Freust du dich auf das Wochenende?')
    expect(p.user).toContain('Ja, ich freue mich sehr darauf.')
    expect(p.user).toContain('sich freuen')
    expect(p.user).toContain('Darauf freue ich mich schon lange.')
  })
})

// ──────────────────────────── parse grade ─────────────────────────────

describe('parseAnswerGrade', () => {
  test('valid correct grade', () => {
    expect(parseAnswerGrade({ correct: true })).toEqual({ correct: true })
  })
  test('keeps tip + filters tags to the 6-tag set (word-order valid, junk dropped)', () => {
    expect(parseAnswerGrade({ correct: false, tip: 'V2 broken.', errorTags: ['word-order', 'banana', 'compound'] }))
      .toEqual({ correct: false, tip: 'V2 broken.', tags: ['word-order', 'compound'] })
  })
  test('rejects non-objects and missing boolean', () => {
    expect(parseAnswerGrade(null)).toBeNull()
    expect(parseAnswerGrade({ tip: 'x' })).toBeNull()
  })
})

// ──────────────────────────── grade reply ─────────────────────────────

describe('gradeDacAnswerReply', () => {
  const opts = {
    model: 'm',
    question: 'Freust du dich auf das Wochenende?',
    exampleAnswer: 'Ja, ich freue mich sehr darauf.',
    collocWord: 'sich freuen', preposition: 'auf', case: 'accusative' as const,
    userAnswer: 'Darauf ich freue mich.'
  }
  test('returns the parsed grade with tags', async () => {
    const client: AiClient = { models: { generateContent: async () => ({ text: JSON.stringify({ correct: false, tip: 'Verb must be second.', errorTags: ['word-order'] }) }) } }
    const g = await gradeDacAnswerReply(client, opts)
    expect(g.correct).toBe(false)
    expect(g.tags).toEqual(['word-order'])
  })
  test('retries once on bad JSON then succeeds', async () => {
    let call = 0
    const client: AiClient = { models: { generateContent: async () => ({ text: (++call === 1 ? 'nope' : JSON.stringify({ correct: true })) }) } }
    const g = await gradeDacAnswerReply(client, opts)
    expect(g.correct).toBe(true)
    expect(call).toBe(2)
  })
  test('throws after exhausting retries on bad JSON', async () => {
    const client: AiClient = { models: { generateContent: async () => ({ text: 'nope' }) } }
    await expect(gradeDacAnswerReply(client, opts)).rejects.toThrow()
  })
})

// ──────────────────────────── drill item ──────────────────────────────

describe('buildDacAnswerItem', () => {
  const q: GeneratedDacQuestion = {
    index: 0, colloc: COLLOCS_FIX[0], nouns: [CONCERT],
    question: 'Freust du dich auf das Konzert?', exampleAnswer: 'Ja, ich freue mich sehr darauf.'
  }
  test('records collocation id/word/preposition + noun keys and correctness', () => {
    expect(buildDacAnswerItem(q, true)).toEqual({
      collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', nounKeys: ['Konzert'], correct: true
    })
  })
  test('attaches tags when present', () => {
    expect(buildDacAnswerItem(q, false, ['word-order', 'compound']).tags).toEqual(['word-order', 'compound'])
  })
})
