import { describe, test, expect } from 'vitest'
import { validatePassivEntry, generatePassivQuestions, judgePassiv, type GeminiClient, type PassivQuestion } from '../../src/composables/usePassivQuiz'

const sampleValid = {
  active: 'Der Techniker repariert das Gerät.',
  target: 'sich-lassen' as const,
  legalTypes: ['vorgangspassiv', 'zustandspassiv', 'sich-lassen', 'sein-zu', 'man-konstruktion'],
  referenceAnswer: 'Das Gerät lässt sich reparieren.',
  rationale: 'Transitive verb with no resultant-state adjective form; sich-lassen is idiomatic.',
  difficulty: 'medium' as const
}

describe('validatePassivEntry — structural sanity', () => {
  test('valid entry passes', () => {
    expect(validatePassivEntry({ ...sampleValid })).not.toBeNull()
  })
  test('missing active rejected', () => {
    expect(validatePassivEntry({ ...sampleValid, active: '' })).toBeNull()
  })
  test('missing referenceAnswer rejected', () => {
    expect(validatePassivEntry({ ...sampleValid, referenceAnswer: '' })).toBeNull()
  })
  test('non-object rejected', () => {
    expect(validatePassivEntry(null)).toBeNull()
    expect(validatePassivEntry(42)).toBeNull()
  })
})

describe('validatePassivEntry — enum validity', () => {
  test('rejects unknown target', () => {
    expect(validatePassivEntry({ ...sampleValid, target: 'es-werden-passiv' })).toBeNull()
  })
  test('rejects unknown legalTypes entry', () => {
    expect(validatePassivEntry({
      ...sampleValid,
      legalTypes: ['vorgangspassiv', 'something-else']
    })).toBeNull()
  })
  test('rejects empty legalTypes', () => {
    expect(validatePassivEntry({ ...sampleValid, legalTypes: [] })).toBeNull()
  })
  test('rejects unknown difficulty', () => {
    expect(validatePassivEntry({ ...sampleValid, difficulty: 'expert' })).toBeNull()
  })
})

describe('validatePassivEntry — target/legalTypes consistency', () => {
  test('rejects when target is not in legalTypes', () => {
    expect(validatePassivEntry({
      ...sampleValid,
      target: 'bar-adjektiv',
      legalTypes: ['vorgangspassiv', 'sich-lassen']
    })).toBeNull()
  })
})

describe('validatePassivEntry — heuristic referenceAnswer check', () => {
  test('rejects vorgangspassiv reference without "werden"', () => {
    expect(validatePassivEntry({
      ...sampleValid,
      target: 'vorgangspassiv',
      legalTypes: ['vorgangspassiv'],
      referenceAnswer: 'Das Gerät ist repariert.'
    })).toBeNull()
  })
  test('rejects sich-lassen reference without "lass"', () => {
    expect(validatePassivEntry({
      ...sampleValid,
      target: 'sich-lassen',
      legalTypes: ['sich-lassen'],
      referenceAnswer: 'Das Gerät wird repariert.'
    })).toBeNull()
  })
  test('rejects man-konstruktion reference without "man"', () => {
    expect(validatePassivEntry({
      ...sampleValid,
      target: 'man-konstruktion',
      legalTypes: ['man-konstruktion'],
      referenceAnswer: 'Das Gerät wird repariert.'
    })).toBeNull()
  })
  test('rejects blank rationale', () => {
    expect(validatePassivEntry({ ...sampleValid, rationale: '   ' })).toBeNull()
  })
})

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

const ENTRY_OK = {
  active: 'Der Techniker repariert das Gerät.',
  target: 'sich-lassen',
  legalTypes: ['vorgangspassiv', 'sich-lassen', 'man-konstruktion'],
  referenceAnswer: 'Das Gerät lässt sich reparieren.',
  rationale: 'Transitive verb, no resultant state — sich-lassen is idiomatic.',
  difficulty: 'medium'
}

const ENTRY_BAD = {
  active: '',
  target: 'sich-lassen',
  legalTypes: ['sich-lassen'],
  referenceAnswer: 'Das Gerät lässt sich reparieren.',
  rationale: 'r',
  difficulty: 'medium'
}

describe('generatePassivQuestions — retry loop', () => {
  test('returns N valid entries from a single clean batch', async () => {
    const client = makeMockClient([
      { text: JSON.stringify({ entries: [ENTRY_OK, { ...ENTRY_OK, active: 'Der Mechaniker prüft den Wagen.' }] }) }
    ])
    const result = await generatePassivQuestions(client, {
      model: 'gemini-2.5-flash',
      count: 2,
      difficulty: 'medium'
    })
    expect(result.entries).toHaveLength(2)
    expect(result.rejected).toBe(0)
    expect(result.attempts).toBe(1)
  })

  test('retries when validation rejects all entries', async () => {
    const client = makeMockClient([
      { text: JSON.stringify({ entries: [ENTRY_BAD] }) },
      { text: JSON.stringify({ entries: [ENTRY_OK] }) }
    ])
    const result = await generatePassivQuestions(client, {
      model: 'gemini-2.5-flash',
      count: 1,
      difficulty: 'medium',
      maxRetries: 2
    })
    expect(result.entries).toHaveLength(1)
    expect(result.rejected).toBe(1)
    expect(result.attempts).toBe(2)
  })

  test('survives malformed JSON', async () => {
    const client = makeMockClient([
      { text: 'not-json' },
      { text: JSON.stringify({ entries: [ENTRY_OK] }) }
    ])
    const result = await generatePassivQuestions(client, {
      model: 'gemini-2.5-flash',
      count: 1,
      difficulty: 'medium'
    })
    expect(result.entries).toHaveLength(1)
    expect(result.attempts).toBe(2)
  })
})

const SAMPLE_QUESTION: PassivQuestion = {
  id: 'passiv-test-1',
  active: 'Der Techniker repariert das Gerät.',
  target: 'sich-lassen',
  legalTypes: ['vorgangspassiv', 'sich-lassen', 'man-konstruktion'],
  referenceAnswer: 'Das Gerät lässt sich reparieren.',
  rationale: 'Transitive verb, no resultant state — sich-lassen is idiomatic.',
  difficulty: 'medium'
}

const JUDGE_RESPONSE_OK = JSON.stringify({
  verdict: 'correct',
  expected: SAMPLE_QUESTION.referenceAnswer,
  acceptedVariants: [],
  feedback: 'Correct sich-lassen form.',
  formCheck: { usedType: 'sich-lassen', matchesTarget: true }
})

describe('judgePassiv — happy path', () => {
  test('parses a well-formed response', async () => {
    const client = makeMockClient([{ text: JUDGE_RESPONSE_OK }])
    const result = await judgePassiv(client, 'gemini-2.5-flash', SAMPLE_QUESTION, SAMPLE_QUESTION.referenceAnswer)
    expect(result.verdict).toBe('correct')
    expect(result.formCheck.usedType).toBe('sich-lassen')
    expect(result.formCheck.matchesTarget).toBe(true)
  })
})

describe('judgePassiv — fallback', () => {
  test('falls back to local match on thrown error', async () => {
    const client: GeminiClient = {
      models: {
        generateContent: async () => {
          throw new Error('offline')
        }
      }
    }
    const result = await judgePassiv(client, 'gemini-2.5-flash', SAMPLE_QUESTION, SAMPLE_QUESTION.referenceAnswer)
    expect(result.verdict).toBe('correct')
    expect(result.feedback).toMatch(/fallback/i)
    expect(result.formCheck.usedType).toBe('unknown')
  })

  test('fallback marks divergent answer incorrect', async () => {
    const client = makeMockClient([{ text: 'garbage' }])
    const result = await judgePassiv(client, 'gemini-2.5-flash', SAMPLE_QUESTION, 'Das Gerät wird repariert.')
    expect(result.verdict).toBe('incorrect')
  })
})
