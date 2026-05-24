import { describe, test, expect } from 'vitest'
import {
  computeRemaining,
  computeReport
} from '../../src/composables/useSimulatorC1'
import {
  EXAM_DURATION_MS,
  PASSING_SCORE,
  type SimulatorSession
} from '../../src/data/simulatorC1'
import type { WritingDraft } from '../../src/data/writingPrompts'
import type { WritingGradeResult } from '../../src/data/rubrics'

function makeSession(overrides: Partial<SimulatorSession> = {}): SimulatorSession {
  const startedAt = 1_700_000_000_000
  return {
    id: 'sim-1',
    startedAt,
    endsAt: startedAt + EXAM_DURATION_MS,
    status: 'in_progress',
    task1PromptId: 'wp-forum-wohnen-stadt-land',
    task1DraftId: 'd-1',
    task2PromptId: 'wp-email-beschwerde-kurs',
    task2DraftId: 'd-2',
    ...overrides
  }
}

function makeGradeResult(score: number, band: 'B2' | 'C1-' | 'C1' | 'C1+'): WritingGradeResult {
  return {
    rubric: 'goethe-c1',
    totalScore: score,
    bandEstimate: band,
    passes: score >= PASSING_SCORE,
    criteria: [],
    inlineNotes: [],
    paragraphFeedback: [],
    overallDe: '',
    overallEn: '',
    generatedAt: 0,
    modelUsed: 'gemini-2.5-flash'
  }
}

function makeDraft(id: string, result: WritingGradeResult | undefined): WritingDraft {
  return {
    id,
    promptId: 'wp-x',
    rubric: 'goethe-c1',
    text: 'some text',
    wordCount: 200,
    createdAt: 0,
    updatedAt: 0,
    result
  }
}

describe('computeRemaining', () => {
  test('positive when current time is before endsAt', () => {
    const session = makeSession()
    const now = session.startedAt + 30 * 60 * 1000   // 30 min in
    expect(computeRemaining(session, now)).toBe(45 * 60 * 1000)
  })
  test('zero when current time equals endsAt', () => {
    const session = makeSession()
    expect(computeRemaining(session, session.endsAt)).toBe(0)
  })
  test('clamps at zero when current time is past endsAt', () => {
    const session = makeSession()
    expect(computeRemaining(session, session.endsAt + 60_000)).toBe(0)
  })
  test('full duration at session start', () => {
    const session = makeSession()
    expect(computeRemaining(session, session.startedAt)).toBe(EXAM_DURATION_MS)
  })
})

describe('computeReport', () => {
  test('both tasks graded — applies 60/40 weighting and rounds to int', () => {
    const session = makeSession()
    const t1 = makeDraft('d-1', makeGradeResult(78, 'C1'))
    const t2 = makeDraft('d-2', makeGradeResult(65, 'C1-'))
    const r = computeReport(session, t1, t2)
    expect(r.task1Score).toBe(78)
    expect(r.task2Score).toBe(65)
    expect(r.combinedScore).toBe(73)   // 78*0.6 + 65*0.4 = 72.8 → 73
    expect(r.passes).toBe(true)
    expect(r.task1Band).toBe('C1')
    expect(r.task2Band).toBe('C1-')
  })

  test('passes false when combined < 60', () => {
    const session = makeSession()
    const t1 = makeDraft('d-1', makeGradeResult(55, 'C1-'))
    const t2 = makeDraft('d-2', makeGradeResult(55, 'C1-'))
    const r = computeReport(session, t1, t2)
    expect(r.combinedScore).toBe(55)
    expect(r.passes).toBe(false)
  })

  test('passes exactly at 60 threshold', () => {
    const session = makeSession()
    const t1 = makeDraft('d-1', makeGradeResult(60, 'C1-'))
    const t2 = makeDraft('d-2', makeGradeResult(60, 'C1-'))
    const r = computeReport(session, t1, t2)
    expect(r.combinedScore).toBe(60)
    expect(r.passes).toBe(true)
  })

  test('task1 graded, task2 not graded — combined is null, passes false', () => {
    const session = makeSession()
    const t1 = makeDraft('d-1', makeGradeResult(78, 'C1'))
    const t2 = makeDraft('d-2', undefined)
    const r = computeReport(session, t1, t2)
    expect(r.task1Score).toBe(78)
    expect(r.task2Score).toBeNull()
    expect(r.combinedScore).toBeNull()
    expect(r.passes).toBe(false)
  })

  test('neither task graded — all nulls, passes false', () => {
    const session = makeSession()
    const t1 = makeDraft('d-1', undefined)
    const t2 = makeDraft('d-2', undefined)
    const r = computeReport(session, t1, t2)
    expect(r.task1Score).toBeNull()
    expect(r.task2Score).toBeNull()
    expect(r.combinedScore).toBeNull()
    expect(r.passes).toBe(false)
  })

  test('rounds combined score correctly at .5 boundary', () => {
    const session = makeSession()
    const t1 = makeDraft('d-1', makeGradeResult(75, 'C1'))   // 75*0.6 = 45
    const t2 = makeDraft('d-2', makeGradeResult(50, 'C1-'))  // 50*0.4 = 20 → combined 65 exactly
    const r = computeReport(session, t1, t2)
    expect(r.combinedScore).toBe(65)
  })
})
