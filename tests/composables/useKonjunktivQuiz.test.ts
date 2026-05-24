import { describe, test, expect } from 'vitest'
import { validateKiEntry } from '../../src/composables/useKonjunktivQuiz'

const sampleValid = {
  source: 'Der Minister sagte: „Wir senken die Steuern."',
  reportingClause: 'Der Minister sagte, ',
  referenceAnswer: 'Der Minister sagte, sie senkten die Steuern.',
  expectedMood: 'K2-fallback' as const,
  rationale: 'Plural "sie senken" matches the indicative, so K-II "senkten" is required.',
  difficulty: 'medium' as const
}

describe('validateKiEntry — structural sanity', () => {
  test('valid entry passes', () => {
    expect(validateKiEntry({ ...sampleValid })).not.toBeNull()
  })
  test('missing source rejected', () => {
    expect(validateKiEntry({ ...sampleValid, source: undefined as unknown as string })).toBeNull()
  })
  test('empty reportingClause rejected', () => {
    expect(validateKiEntry({ ...sampleValid, reportingClause: '' })).toBeNull()
  })
  test('empty referenceAnswer rejected', () => {
    expect(validateKiEntry({ ...sampleValid, referenceAnswer: '' })).toBeNull()
  })
  test('non-object rejected', () => {
    expect(validateKiEntry(null)).toBeNull()
    expect(validateKiEntry('not an object')).toBeNull()
  })
})

describe('validateKiEntry — quote formatting', () => {
  test('source without colon rejected', () => {
    expect(validateKiEntry({ ...sampleValid, source: 'Der Minister sagte „Wir senken die Steuern."' })).toBeNull()
  })
  test('source without German quote marks rejected', () => {
    expect(validateKiEntry({ ...sampleValid, source: 'Der Minister sagte: Wir senken die Steuern.' })).toBeNull()
  })
  test('accepts both „…" and «…» style', () => {
    expect(validateKiEntry({
      ...sampleValid,
      source: 'Der Minister sagte: «Wir senken die Steuern.»'
    })).not.toBeNull()
  })
})

describe('validateKiEntry — reportingClause/reference consistency', () => {
  test('reportingClause must end with ", "', () => {
    expect(validateKiEntry({ ...sampleValid, reportingClause: 'Der Minister sagte,' })).toBeNull()
    expect(validateKiEntry({ ...sampleValid, reportingClause: 'Der Minister sagte ' })).toBeNull()
  })
  test('referenceAnswer must start with reportingClause', () => {
    expect(validateKiEntry({
      ...sampleValid,
      referenceAnswer: 'Sie senkten die Steuern.'
    })).toBeNull()
  })
})

describe('validateKiEntry — enum validity', () => {
  test('rejects unknown expectedMood', () => {
    expect(validateKiEntry({ ...sampleValid, expectedMood: 'subjunctive' as unknown as 'K1' })).toBeNull()
  })
  test('rejects unknown difficulty', () => {
    expect(validateKiEntry({ ...sampleValid, difficulty: 'expert' as unknown as 'easy' })).toBeNull()
  })
  test('rejects blank rationale', () => {
    expect(validateKiEntry({ ...sampleValid, rationale: '   ' })).toBeNull()
  })
})

import { generateKiQuestions, judgeKi, type GeminiClient, type KiQuestion } from '../../src/composables/useKonjunktivQuiz'

interface MockResponse { text: string }

function makeMockClient(responses: MockResponse[]): GeminiClient {
  let i = 0
  return {
    models: {
      generateContent: async () => {
        const r = responses[i] ?? { text: '' }
        i += 1
        return r
      }
    }
  }
}

const ENTRY_OK_1 = {
  source: 'Der Minister sagte: „Wir senken die Steuern."',
  reportingClause: 'Der Minister sagte, ',
  referenceAnswer: 'Der Minister sagte, sie senkten die Steuern.',
  expectedMood: 'K2-fallback',
  rationale: 'Plural matches indicative, K-II required.',
  difficulty: 'medium'
}

const ENTRY_OK_2 = {
  source: 'Sie meinte: „Er kommt morgen."',
  reportingClause: 'Sie meinte, ',
  referenceAnswer: 'Sie meinte, er komme morgen.',
  expectedMood: 'K1',
  rationale: '3rd person singular K-I is clean.',
  difficulty: 'easy'
}

const ENTRY_BAD = {
  source: 'No colon and no German quotes here.',
  reportingClause: 'Sie meinte, ',
  referenceAnswer: 'Sie meinte, etwas.',
  expectedMood: 'K1',
  rationale: 'r',
  difficulty: 'easy'
}

describe('generateKiQuestions — retry loop', () => {
  test('returns N valid entries from a single clean batch', async () => {
    const client = makeMockClient([
      { text: JSON.stringify({ entries: [ENTRY_OK_1, ENTRY_OK_2] }) }
    ])
    const result = await generateKiQuestions(client, {
      model: 'gemini-2.5-flash',
      count: 2,
      difficulty: 'medium'
    })
    expect(result.entries).toHaveLength(2)
    expect(result.rejected).toBe(0)
    expect(result.attempts).toBe(1)
  })

  test('retries when the first batch fails validation', async () => {
    const client = makeMockClient([
      { text: JSON.stringify({ entries: [ENTRY_BAD] }) },
      { text: JSON.stringify({ entries: [ENTRY_OK_1, ENTRY_OK_2] }) }
    ])
    const result = await generateKiQuestions(client, {
      model: 'gemini-2.5-flash',
      count: 2,
      difficulty: 'medium',
      maxRetries: 2
    })
    expect(result.entries).toHaveLength(2)
    expect(result.rejected).toBe(1)
    expect(result.attempts).toBe(2)
  })

  test('returns partial batch when retries exhaust', async () => {
    const client = makeMockClient([
      { text: JSON.stringify({ entries: [ENTRY_OK_1] }) },
      { text: JSON.stringify({ entries: [ENTRY_BAD] }) },
      { text: JSON.stringify({ entries: [ENTRY_BAD] }) }
    ])
    const result = await generateKiQuestions(client, {
      model: 'gemini-2.5-flash',
      count: 2,
      difficulty: 'medium',
      maxRetries: 2
    })
    expect(result.entries).toHaveLength(1)
    expect(result.rejected).toBe(2)
    expect(result.attempts).toBe(3)
  })

  test('survives malformed JSON in a response', async () => {
    const client = makeMockClient([
      { text: 'not-json {{{' },
      { text: JSON.stringify({ entries: [ENTRY_OK_1, ENTRY_OK_2] }) }
    ])
    const result = await generateKiQuestions(client, {
      model: 'gemini-2.5-flash',
      count: 2,
      difficulty: 'medium'
    })
    expect(result.entries).toHaveLength(2)
    expect(result.attempts).toBe(2)
  })
})

const SAMPLE_QUESTION: KiQuestion = {
  id: 'ki-test-1',
  source: 'Der Minister sagte: „Wir senken die Steuern."',
  reportingClause: 'Der Minister sagte, ',
  referenceAnswer: 'Der Minister sagte, sie senkten die Steuern.',
  expectedMood: 'K2-fallback',
  rationale: 'Plural matches indicative, K-II required.',
  difficulty: 'medium'
}

const JUDGE_RESPONSE_CORRECT = JSON.stringify({
  verdict: 'correct',
  expected: SAMPLE_QUESTION.referenceAnswer,
  acceptedVariants: [],
  feedback: 'Correct Konjunktiv II — the K-I form would have collided with the indicative.',
  moodCheck: { used: 'K2', ok: true }
})

describe('judgeKi — happy path', () => {
  test('parses a well-formed judge response', async () => {
    const client = makeMockClient([{ text: JUDGE_RESPONSE_CORRECT }])
    const result = await judgeKi(client, 'gemini-2.5-flash', SAMPLE_QUESTION, SAMPLE_QUESTION.referenceAnswer)
    expect(result.verdict).toBe('correct')
    expect(result.moodCheck.used).toBe('K2')
    expect(result.moodCheck.ok).toBe(true)
  })
})

describe('judgeKi — degraded fallback', () => {
  test('falls back to local string match when the call throws', async () => {
    const client: GeminiClient = {
      models: {
        generateContent: async () => {
          throw new Error('network down')
        }
      }
    }
    const result = await judgeKi(client, 'gemini-2.5-flash', SAMPLE_QUESTION, SAMPLE_QUESTION.referenceAnswer)
    expect(result.verdict).toBe('correct')
    expect(result.feedback).toMatch(/fallback/i)
    expect(result.moodCheck.used).toBe('other')
  })

  test('falls back to local string match when JSON is malformed', async () => {
    const client = makeMockClient([{ text: 'not-json' }])
    const result = await judgeKi(client, 'gemini-2.5-flash', SAMPLE_QUESTION, '  ' + SAMPLE_QUESTION.referenceAnswer.toUpperCase() + '  ')
    expect(result.verdict).toBe('correct')
    expect(result.feedback).toMatch(/fallback/i)
  })

  test('fallback marks divergent answers incorrect', async () => {
    const client = makeMockClient([{ text: '{ invalid' }])
    const result = await judgeKi(client, 'gemini-2.5-flash', SAMPLE_QUESTION, 'Etwas ganz anderes.')
    expect(result.verdict).toBe('incorrect')
  })
})
