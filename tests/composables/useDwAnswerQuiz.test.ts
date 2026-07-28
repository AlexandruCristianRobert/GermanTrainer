import { describe, test, expect } from 'vitest'
import * as sentenceModule from '../../src/composables/useDwSentenceQuiz'
import type { DwSentenceSpec } from '../../src/composables/useDwSentenceQuiz'
import type { NounRef } from '../../src/composables/useSentenceQuiz'
import type { AiClient } from '../../src/composables/useClaude'
import * as answerModule from '../../src/composables/useDwAnswerQuiz'
import {
  DW_ANSWER_ANGLE_POOL,
  DW_ANSWER_GEN_SYSTEM,
  buildDwAnswerGeneratePrompt,
  validateDwQuestion,
  generateDwQuestionBatch,
  buildDwAnswerGradePrompt,
  parseDwAnswerGrade,
  gradeDwReply,
  buildDwAnswerItem,
  type GeneratedDwQuestion
} from '../../src/composables/useDwAnswerQuiz'

const TREPPE: NounRef = { german: 'Treppe', article: 'die', english: 'staircase' }

function fakeClient(responder: (prompt: string) => string): AiClient {
  return { models: { generateContent: async (p) => ({ text: responder(String(p.contents ?? '')) }) } }
}

const SPECS: DwSentenceSpec[] = [
  { index: 0, pair: 'auf', side: 'her', target: 'herauf', nouns: [TREPPE] },
  { index: 1, pair: 'ein', side: 'hin', target: 'hinein', nouns: [] }
]

// ───────────────────────── re-export identity ─────────────────────────

describe('re-exports from useDwSentenceQuiz (Task 1 shared-sampling pattern)', () => {
  test('buildDwSpecs is the same function reference as the sentence module', () => {
    expect(answerModule.buildDwSpecs).toBe(sentenceModule.buildDwSpecs)
  })
  test('dwLevelLabel is the same function reference as the sentence module', () => {
    expect(answerModule.dwLevelLabel).toBe(sentenceModule.dwLevelLabel)
  })
})

// ───────────────────────── generation prompt ──────────────────────────

describe('buildDwAnswerGeneratePrompt', () => {
  const prompt = buildDwAnswerGeneratePrompt(
    SPECS,
    'A2/B1',
    { angles: ['set it on a staircase', 'set it at a doorway'], seed: 'seed42' }
  )

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
    expect(prompt).toContain('seed42')
  })
  test('mentions the no-leak requirement for the question', () => {
    expect(prompt.toLowerCase()).toContain('must not contain')
  })
  test('DW_ANSWER_ANGLE_POOL has enough distinct angles to rotate', () => {
    expect(new Set(DW_ANSWER_ANGLE_POOL).size).toBeGreaterThanOrEqual(12)
  })
})

// ───────────────────── DW_ANSWER_GEN_SYSTEM literal ────────────────────

describe('DW_ANSWER_GEN_SYSTEM prompt-literal regression (verbatim from the task brief)', () => {
  test('states the hin/her rule', () => {
    expect(DW_ANSWER_GEN_SYSTEM).toContain(
      'hin = away from the speaker, her = toward the speaker'
    )
  })
  test('states the no-leak rule for the question, verbatim', () => {
    expect(DW_ANSWER_GEN_SYSTEM).toContain(
      'The question itself must NOT contain the target compound or any hin-/her- compound of the same pair.'
    )
  })
  test('states the exampleAnswer rule, verbatim', () => {
    expect(DW_ANSWER_GEN_SYSTEM).toContain(
      '"exampleAnswer": one natural German answer containing the TARGET compound (or its hinab/hinunter-type synonym).'
    )
  })
  test('contains the literal JSON-shape line verbatim', () => {
    expect(DW_ANSWER_GEN_SYSTEM).toContain(
      'Return ONLY JSON in exactly this shape: {"items":[{"index":<number>,"question":"...","exampleAnswer":"..."}]}'
    )
  })
  test('forbids markdown fences/commentary', () => {
    expect(DW_ANSWER_GEN_SYSTEM).toContain('No markdown fences, no commentary.')
  })
})

// ─────────────────────────── validation ───────────────────────────────

describe('validateDwQuestion', () => {
  const spec: DwSentenceSpec = { index: 0, pair: 'auf', side: 'her', target: 'herauf', nouns: [TREPPE] }

  test('accepts a well-formed question + answer, carries the spec through', () => {
    const out = validateDwQuestion(
      {
        index: 0,
        question: 'Du stehst unten an der Treppe, deine Oma ist oben. Was rufst du ihr zu?',
        exampleAnswer: 'Komm die Treppe herauf!'
      },
      spec
    )
    expect(out).not.toBeNull()
    expect(out!.question).toContain('Was rufst du ihr zu?')
    expect(out!.exampleAnswer).toBe('Komm die Treppe herauf!')
    expect(out!.pair).toBe('auf')
    expect(out!.target).toBe('herauf')
    expect(out!.nouns).toEqual(spec.nouns)
  })
  test('trims whitespace on both strings', () => {
    const out = validateDwQuestion(
      { index: 0, question: '  Wo bist du gerade?  ', exampleAnswer: '  Komm herauf!  ' },
      spec
    )
    expect(out!.question).toBe('Wo bist du gerade?')
    expect(out!.exampleAnswer).toBe('Komm herauf!')
  })
  test('rejects a question containing the TARGET compound itself (would give the answer away)', () => {
    const out = validateDwQuestion(
      { index: 0, question: 'Ist "herauf" das richtige Wort fuer deine Oma?', exampleAnswer: 'Komm herauf!' },
      spec
    )
    expect(out).toBeNull()
  })
  test('rejects a question containing the pair-sibling compound (the other side of the same pair)', () => {
    const out = validateDwQuestion(
      { index: 0, question: 'Ist "hinauf" hier das richtige Wort?', exampleAnswer: 'Komm herauf!' },
      spec
    )
    expect(out).toBeNull()
  })
  test('the leak check is case-insensitive', () => {
    const out = validateDwQuestion(
      { index: 0, question: 'Was bedeutet HERAUF in diesem Satz?', exampleAnswer: 'Komm herauf!' },
      spec
    )
    expect(out).toBeNull()
  })
  test('accepts the vertical twin in exampleAnswer instead of the exact target', () => {
    const unterSpec: DwSentenceSpec = { index: 0, pair: 'unter', side: 'hin', target: 'hinunter', nouns: [] }
    const out = validateDwQuestion(
      {
        index: 0,
        question: 'Du stehst oben am Berg, dein Freund ist unten im Tal. Was rufst du ihm zu?',
        exampleAnswer: 'Ich komme gleich hinab!'
      },
      unterSpec
    )
    expect(out).not.toBeNull()
    expect(out!.exampleAnswer).toContain('hinab')
  })
  test('rejects when exampleAnswer is missing both the target and its vertical twin', () => {
    const out = validateDwQuestion(
      { index: 0, question: 'Du stehst unten, deine Oma ist oben. Was rufst du ihr zu?', exampleAnswer: 'Ich komme gleich!' },
      spec
    )
    expect(out).toBeNull()
  })
  test('a pair with no vertical twin (auf) rejects an exampleAnswer missing the exact target', () => {
    const out = validateDwQuestion(
      { index: 0, question: 'Du stehst unten, deine Oma ist oben. Was rufst du ihr zu?', exampleAnswer: 'Ich komme sofort!' },
      spec
    )
    expect(out).toBeNull()
  })
  test('rejects non-objects and too-short fields', () => {
    expect(validateDwQuestion(null, spec)).toBeNull()
    expect(validateDwQuestion({ question: 'Hi', exampleAnswer: 'Ja.' }, spec)).toBeNull()
    expect(validateDwQuestion({ index: 0, question: '', exampleAnswer: 'Komm herauf!' }, spec)).toBeNull()
  })
  test('rejects on index mismatch', () => {
    expect(
      validateDwQuestion(
        { index: 5, question: 'Was rufst du deiner Oma zu?', exampleAnswer: 'Komm herauf!' },
        spec
      )
    ).toBeNull()
  })
})

// ──────────────────────────── batch loop ──────────────────────────────

describe('generateDwQuestionBatch', () => {
  test('returns one validated question per spec', async () => {
    const client = fakeClient(() => JSON.stringify({
      items: [
        { index: 0, question: 'Du stehst unten, deine Oma ist oben. Was rufst du ihr zu?', exampleAnswer: 'Komm herauf!' },
        { index: 1, question: 'Du stehst draussen vor der Tuer. Was sagst du zu deinem Freund drinnen?', exampleAnswer: 'Ich komme gleich hinein.' }
      ]
    }))
    const res = await generateDwQuestionBatch(client, { model: 'm', specs: SPECS, maxRetries: 0 })
    expect(res.questions).toHaveLength(2)
    expect(res.questions.map(q => q.index).sort()).toEqual([0, 1])
    expect(res.failedIndices).toEqual([])
  })
  test('retries only the missing specs', async () => {
    let call = 0
    const client = fakeClient(() => {
      call++
      return call === 1
        ? JSON.stringify({ items: [{ index: 0, question: 'Du stehst unten, deine Oma ist oben. Was rufst du ihr zu?', exampleAnswer: 'Komm herauf!' }] })
        : JSON.stringify({ items: [{ index: 1, question: 'Du stehst draussen. Was sagst du?', exampleAnswer: 'Ich komme gleich hinein.' }] })
    })
    const res = await generateDwQuestionBatch(client, { model: 'm', specs: SPECS, maxRetries: 2 })
    expect(res.questions).toHaveLength(2)
    expect(res.failedIndices).toEqual([])
  })
  test('never throws on malformed JSON — lists unfilled specs as failedIndices', async () => {
    const client = fakeClient(() => 'not json at all')
    const res = await generateDwQuestionBatch(client, { model: 'm', specs: SPECS, maxRetries: 1 })
    expect(res.questions).toHaveLength(0)
    expect(res.failedIndices.sort()).toEqual([0, 1])
  })
  test('never throws when the client rejects', async () => {
    const client: AiClient = { models: { generateContent: async () => { throw new Error('network down') } } }
    const res = await generateDwQuestionBatch(client, { model: 'm', specs: SPECS, maxRetries: 1 })
    expect(res.questions).toHaveLength(0)
    expect(res.failedIndices.sort()).toEqual([0, 1])
  })
  test('drops a leaking question but keeps the batch retrying until it gets a safe one', async () => {
    let call = 0
    const client = fakeClient(() => {
      call++
      return call === 1
        ? JSON.stringify({
            items: [
              { index: 0, question: 'Sagst du "herauf" zu deiner Oma?', exampleAnswer: 'Komm herauf!' },
              { index: 1, question: 'Du stehst draussen. Was sagst du?', exampleAnswer: 'Ich komme gleich hinein.' }
            ]
          })
        : JSON.stringify({ items: [{ index: 0, question: 'Du stehst unten, deine Oma ist oben. Was rufst du ihr zu?', exampleAnswer: 'Komm herauf!' }] })
    })
    const res = await generateDwQuestionBatch(client, { model: 'm', specs: SPECS, maxRetries: 1 })
    expect(res.questions).toHaveLength(2)
    expect(res.questions.find(q => q.index === 0)!.question).not.toContain('herauf')
  })
})

// ─────────────────────────── grading prompt ───────────────────────────

describe('buildDwAnswerGradePrompt', () => {
  const q: GeneratedDwQuestion = {
    index: 0, pair: 'auf', side: 'her', target: 'herauf', nouns: [],
    question: 'Du stehst unten, deine Oma ist oben. Was rufst du ihr zu?',
    exampleAnswer: 'Komm herauf!'
  }

  test('user block carries the question, example answer, target compound, and learner answer', () => {
    const p = buildDwAnswerGradePrompt({ q, answer: 'Komm hinauf!' })
    expect(p.user).toContain('Du stehst unten, deine Oma ist oben. Was rufst du ihr zu?')
    expect(p.user).toContain('Komm herauf!')
    expect(p.user).toContain('herauf')
    expect(p.user).toContain('Komm hinauf!')
  })
  test('includes the vertical twin when one exists', () => {
    const unterQ: GeneratedDwQuestion = {
      index: 0, pair: 'unter', side: 'hin', target: 'hinunter', nouns: [],
      question: 'Du stehst oben, dein Freund ist unten. Was rufst du ihm zu?',
      exampleAnswer: 'Ich komme gleich hinunter!'
    }
    const p = buildDwAnswerGradePrompt({ q: unterQ, answer: 'Ich komme gleich hinab!' })
    expect(p.user).toContain('hinab')
  })
  test('system states the hin/her rule and lists all 6 tags incl. direction', () => {
    const p = buildDwAnswerGradePrompt({ q, answer: 'x' })
    expect(p.system).toContain('hin = away from the speaker, her = toward the speaker')
    expect(p.system).toContain('"direction"')
    expect(p.system).toContain('"conjugation"')
    expect(p.system).toContain('"case"')
    expect(p.system).toContain('"word-order"')
    expect(p.system).toContain('"noun"')
    expect(p.system).toContain('"typo"')
  })
  test('states the same drill rubric as T6: twins, r-forms (written-form tip), kommen-toward-addressee, wrong side', () => {
    const p = buildDwAnswerGradePrompt({ q, answer: 'x' })
    const low = p.system.toLowerCase()
    expect(low).toContain('hinab=hinunter')
    expect(low).toContain('rauf, runter, rein, raus, rüber')
    expect(low).toContain('written')
    expect(low).toContain('kommen')
    expect(low).toContain('wrong side')
    expect(low).toContain('tag "direction"')
  })
  test('judges whether the answer actually answers the question (Q&A framing)', () => {
    const p = buildDwAnswerGradePrompt({ q, answer: 'x' })
    expect(p.system.toLowerCase()).toContain('answer the question')
  })
  test('system contains the literal JSON-shape line verbatim (local-claude convention)', () => {
    const p = buildDwAnswerGradePrompt({ q, answer: 'x' })
    expect(p.system).toContain(
      'Return ONLY JSON in exactly this shape: {"correct": true|false, "tip": "...", "errorTags": ["..."]}'
    )
  })
})

// ──────────────────────────── parse grade ─────────────────────────────

describe('parseDwAnswerGrade', () => {
  test('valid correct grade defaults tip to "" and tags to []', () => {
    expect(parseDwAnswerGrade({ correct: true })).toEqual({ correct: true, tip: '', tags: [] })
  })
  test('keeps tip + filters tags to the 6-tag set', () => {
    expect(parseDwAnswerGrade({ correct: false, tip: 'Wrong side.', errorTags: ['direction', 'banana', 'case'] }))
      .toEqual({ correct: false, tip: 'Wrong side.', tags: ['direction', 'case'] })
  })
  test('rejects non-objects and missing boolean', () => {
    expect(parseDwAnswerGrade(null)).toBeNull()
    expect(parseDwAnswerGrade({ tip: 'x' })).toBeNull()
  })
})

// ──────────────────────────── grade reply ─────────────────────────────

describe('gradeDwReply', () => {
  const q: GeneratedDwQuestion = {
    index: 0, pair: 'auf', side: 'her', target: 'herauf', nouns: [],
    question: 'Du stehst unten, deine Oma ist oben. Was rufst du ihr zu?',
    exampleAnswer: 'Komm herauf!'
  }
  test('returns the parsed grade with tags', async () => {
    const client: AiClient = { models: { generateContent: async () => ({ text: JSON.stringify({ correct: false, tip: 'Wrong side.', errorTags: ['direction'] }) }) } }
    const g = await gradeDwReply(client, { model: 'm', q, answer: 'Komm hinauf!' })
    expect(g.correct).toBe(false)
    expect(g.tags).toEqual(['direction'])
  })
  test('retries once on bad JSON then succeeds', async () => {
    let call = 0
    const client: AiClient = { models: { generateContent: async () => ({ text: (++call === 1 ? 'nope' : JSON.stringify({ correct: true })) }) } }
    const g = await gradeDwReply(client, { model: 'm', q, answer: 'Komm herauf!' })
    expect(g.correct).toBe(true)
    expect(call).toBe(2)
  })
  test('throws after exhausting retries on bad JSON', async () => {
    const client: AiClient = { models: { generateContent: async () => ({ text: 'nope' }) } }
    await expect(gradeDwReply(client, { model: 'm', q, answer: 'x' })).rejects.toThrow()
  })
  test('throws after exhausting retries when the client rejects', async () => {
    const client: AiClient = { models: { generateContent: async () => { throw new Error('down') } } }
    await expect(gradeDwReply(client, { model: 'm', q, answer: 'x' })).rejects.toThrow()
  })
})

// ──────────────────────────── drill item ──────────────────────────────

describe('buildDwAnswerItem', () => {
  const q: GeneratedDwQuestion = {
    index: 0, pair: 'auf', side: 'her', target: 'herauf',
    nouns: [TREPPE],
    question: 'Du stehst unten, deine Oma ist oben. Was rufst du ihr zu?',
    exampleAnswer: 'Komm herauf!'
  }
  test('records pair/compound + noun keys and correctness', () => {
    expect(buildDwAnswerItem(q, true)).toEqual({
      pair: 'auf', compound: 'herauf', nounKeys: ['Treppe'], correct: true
    })
  })
  test('attaches tags when present', () => {
    expect(buildDwAnswerItem(q, false, ['direction']).tags).toEqual(['direction'])
  })
  test('omits tags when absent or empty', () => {
    expect(buildDwAnswerItem(q, false, []).tags).toBeUndefined()
    expect(buildDwAnswerItem(q, true).tags).toBeUndefined()
  })
})
