import { describe, test, expect } from 'vitest'
import { validateGradeResult } from '../../src/composables/useWritingGrader'
import { GOETHE_C1, type WritingGradeResult } from '../../src/data/rubrics'

const DRAFT_TEXT =
  'Wohnen in der Stadt hat klare Vorteile. Man hat kurze Wege zur Arbeit ' +
  'und ein vielfältiges Kulturangebot. Auf dem Land hingegen genießt man ' +
  'Ruhe und mehr Wohnfläche zum gleichen Preis. Beide Lebensformen haben ihre Berechtigung.'

function makeValidResult(): WritingGradeResult {
  return {
    rubric: 'goethe-c1',
    totalScore: 60,
    bandEstimate: 'C1-',
    passes: true,
    criteria: [
      { key: 'erfuellung',  labelDe: 'Erfüllung',  maxPoints: 20, score: 12, strengthsDe: 'Aufgabenpunkte abgedeckt.', weaknessesDe: 'Schluss fehlt.', evidence: [{ quote: 'Wohnen in der Stadt hat klare Vorteile.', spanStart: 0, spanEnd: 39, commentDe: 'klare Eingangsthese' }] },
      { key: 'kohaerenz',   labelDe: 'Kohärenz',   maxPoints: 20, score: 12, strengthsDe: 'Konnektor "hingegen" gut.', weaknessesDe: 'Übergang abrupt.', evidence: [] },
      { key: 'wortschatz',  labelDe: 'Wortschatz', maxPoints: 20, score: 12, strengthsDe: 'Lexik passend.',          weaknessesDe: 'Wiederholungen.', evidence: [] },
      { key: 'strukturen',  labelDe: 'Strukturen', maxPoints: 20, score: 12, strengthsDe: 'Satzbau abwechslungsreich.', weaknessesDe: '—', evidence: [] },
      { key: 'korrektheit', labelDe: 'Korrektheit',maxPoints: 20, score: 12, strengthsDe: 'Wenige Fehler.',           weaknessesDe: '—', evidence: [] }
    ],
    inlineNotes: [],
    paragraphFeedback: [{ paragraphIndex: 0, summaryDe: 'Solider Auftakt.' }],
    overallDe: 'Erkennbarer C1-Aufbau, ausbaufähig in Wortschatz und Korrektheit.',
    overallEn: 'Identifiably C1, room to grow in vocabulary and accuracy.',
    generatedAt: 1716552000000,
    modelUsed: 'gemini-2.5-flash'
  }
}

describe('validateGradeResult — happy path', () => {
  test('a valid result passes through unchanged', () => {
    const r = validateGradeResult(makeValidResult(), GOETHE_C1, DRAFT_TEXT)
    expect(r).not.toBeNull()
    expect(r?.totalScore).toBe(60)
  })
})

describe('validateGradeResult — structural rejection', () => {
  test('non-object rejected', () => {
    expect(validateGradeResult(null, GOETHE_C1, DRAFT_TEXT)).toBeNull()
    expect(validateGradeResult('nope', GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
  test('mismatched rubric system rejected', () => {
    const bad = { ...makeValidResult(), rubric: 'telc-c1' as const }
    expect(validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
  test('bandEstimate not in enum rejected', () => {
    const bad = { ...makeValidResult(), bandEstimate: 'A2' as unknown as 'C1' }
    expect(validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
})

describe('validateGradeResult — criteria checks', () => {
  test('wrong criterion order rejected', () => {
    const bad = makeValidResult()
    bad.criteria = [bad.criteria[1], bad.criteria[0], ...bad.criteria.slice(2)]
    expect(validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
  test('score out of range rejected', () => {
    const bad = makeValidResult()
    bad.criteria[0].score = 99
    expect(validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
  test('negative score rejected', () => {
    const bad = makeValidResult()
    bad.criteria[0].score = -1
    expect(validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
})

describe('validateGradeResult — total + passes consistency', () => {
  test('totalScore mismatch rejected', () => {
    const bad = makeValidResult()
    bad.totalScore = 80   // criteria still sum to 60
    expect(validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
  test('passes flag inconsistent with totalScore rejected', () => {
    const bad = makeValidResult()
    bad.passes = false    // totalScore is 60, passing
    expect(validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
})

describe('validateGradeResult — evidence re-anchoring', () => {
  test('evidence quote found in draft keeps its indices', () => {
    const r = validateGradeResult(makeValidResult(), GOETHE_C1, DRAFT_TEXT)
    expect(r?.criteria[0].evidence[0].spanStart).toBe(0)
    expect(r?.criteria[0].evidence[0].spanEnd).toBe(39)
  })
  test('evidence quote not in draft gets indices -1, item retained', () => {
    const bad = makeValidResult()
    bad.criteria[0].evidence = [
      { quote: 'never appears in draft', spanStart: 50, spanEnd: 70, commentDe: 'won\'t anchor' }
    ]
    const r = validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)
    expect(r).not.toBeNull()
    expect(r?.criteria[0].evidence[0].spanStart).toBe(-1)
    expect(r?.criteria[0].evidence[0].spanEnd).toBe(-1)
  })
  test('evidence with wrong indices but quote-in-draft is re-anchored', () => {
    const bad = makeValidResult()
    bad.criteria[0].evidence = [
      { quote: 'Wohnen in der Stadt', spanStart: 99, spanEnd: 999, commentDe: 'will re-anchor' }
    ]
    const r = validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)
    expect(r?.criteria[0].evidence[0].spanStart).toBe(0)
    expect(r?.criteria[0].evidence[0].spanEnd).toBe(19)
  })
})

describe('validateGradeResult — inline notes', () => {
  test('inline note whose `before` matches the span is retained', () => {
    const bad = makeValidResult()
    bad.inlineNotes = [
      { spanStart: 0, spanEnd: 6, kind: 'comment', before: 'Wohnen', reasonDe: 'klarer Eröffner' }
    ]
    const r = validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)
    expect(r?.inlineNotes).toHaveLength(1)
  })
  test('inline note whose `before` does NOT match span is dropped', () => {
    const bad = makeValidResult()
    bad.inlineNotes = [
      { spanStart: 0, spanEnd: 6, kind: 'comment', before: 'Etwas anderes', reasonDe: '—' }
    ]
    const r = validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)
    expect(r?.inlineNotes).toHaveLength(0)
  })
})

describe('validateGradeResult — paragraphFeedback', () => {
  test('rejects paragraphFeedback length greater than paragraphs in draft', () => {
    const bad = makeValidResult()
    bad.paragraphFeedback = [
      { paragraphIndex: 0, summaryDe: 'a' },
      { paragraphIndex: 1, summaryDe: 'b' }   // draft has only one paragraph
    ]
    expect(validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
})

import {
  gradeDraft,
  GraderError,
  type GeminiClient
} from '../../src/composables/useWritingGrader'
import type { WritingPrompt, WritingDraft } from '../../src/data/writingPrompts'

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

const SAMPLE_PROMPT: WritingPrompt = {
  id: 'wp-test',
  type: 'forumsbeitrag',
  defaultRubric: 'goethe-c1',
  level: 'C1',
  titleDe: 'Test',
  promptText: 'Schreiben Sie einen Beitrag.',
  targetWords: { min: 195, target: 230, max: 265 },
  suggestedMinutes: 30,
  source: 'seed'
}

const SAMPLE_DRAFT: WritingDraft = {
  id: 'd1',
  promptId: 'wp-test',
  rubric: 'goethe-c1',
  text:
    'Wohnen in der Stadt hat klare Vorteile. Man hat kurze Wege zur Arbeit ' +
    'und ein vielfältiges Kulturangebot. Auf dem Land hingegen genießt man ' +
    'Ruhe und mehr Wohnfläche zum gleichen Preis. Beide Lebensformen haben ihre Berechtigung.',
  wordCount: 39,
  createdAt: 1716552000000,
  updatedAt: 1716552000000
}

function makeValidGradePayload() {
  return {
    rubric: 'goethe-c1',
    totalScore: 60,
    bandEstimate: 'C1-',
    passes: true,
    criteria: [
      { key: 'erfuellung',  labelDe: 'Erfüllung',  maxPoints: 20, score: 12, strengthsDe: 'a', weaknessesDe: 'b', evidence: [] },
      { key: 'kohaerenz',   labelDe: 'Kohärenz',   maxPoints: 20, score: 12, strengthsDe: 'a', weaknessesDe: 'b', evidence: [] },
      { key: 'wortschatz',  labelDe: 'Wortschatz', maxPoints: 20, score: 12, strengthsDe: 'a', weaknessesDe: 'b', evidence: [] },
      { key: 'strukturen',  labelDe: 'Strukturen', maxPoints: 20, score: 12, strengthsDe: 'a', weaknessesDe: 'b', evidence: [] },
      { key: 'korrektheit', labelDe: 'Korrektheit',maxPoints: 20, score: 12, strengthsDe: 'a', weaknessesDe: 'b', evidence: [] }
    ],
    inlineNotes: [],
    paragraphFeedback: [{ paragraphIndex: 0, summaryDe: 'ok' }],
    overallDe: 'ok',
    overallEn: 'ok'
  }
}

describe('gradeDraft — happy path', () => {
  test('returns a validated result on a clean response', async () => {
    const client = makeMockClient([
      { text: JSON.stringify(makeValidGradePayload()) }
    ])
    const r = await gradeDraft(client, 'gemini-2.5-flash', SAMPLE_PROMPT, SAMPLE_DRAFT, GOETHE_C1)
    expect(r.totalScore).toBe(60)
    expect(r.modelUsed).toBe('gemini-2.5-flash')
  })
})

describe('gradeDraft — retry once on validation failure', () => {
  test('retries when first response is malformed JSON, succeeds on second', async () => {
    const client = makeMockClient([
      { text: 'not-json {{{' },
      { text: JSON.stringify(makeValidGradePayload()) }
    ])
    const r = await gradeDraft(client, 'gemini-2.5-flash', SAMPLE_PROMPT, SAMPLE_DRAFT, GOETHE_C1)
    expect(r.totalScore).toBe(60)
  })

  test('retries when first response fails validation, succeeds on second', async () => {
    const bad = { ...makeValidGradePayload(), totalScore: 999 }
    const client = makeMockClient([
      { text: JSON.stringify(bad) },
      { text: JSON.stringify(makeValidGradePayload()) }
    ])
    const r = await gradeDraft(client, 'gemini-2.5-flash', SAMPLE_PROMPT, SAMPLE_DRAFT, GOETHE_C1)
    expect(r.totalScore).toBe(60)
  })

  test('throws GraderError when both attempts fail validation', async () => {
    const client = makeMockClient([
      { text: 'invalid' },
      { text: '{"verdict":"???"}' }
    ])
    await expect(
      gradeDraft(client, 'gemini-2.5-flash', SAMPLE_PROMPT, SAMPLE_DRAFT, GOETHE_C1)
    ).rejects.toBeInstanceOf(GraderError)
  })

  test('throws GraderError when network throws on both attempts', async () => {
    const failing: GeminiClient = {
      models: {
        generateContent: async () => { throw new Error('offline') }
      }
    }
    await expect(
      gradeDraft(failing, 'gemini-2.5-flash', SAMPLE_PROMPT, SAMPLE_DRAFT, GOETHE_C1)
    ).rejects.toBeInstanceOf(GraderError)
  })
})
