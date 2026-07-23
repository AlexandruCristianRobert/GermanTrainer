import { describe, it, expect } from 'vitest'
import { QUIZ_TYPE_LABEL, QUIZ_TYPE_DE, QUIZ_TYPES_ORDER } from '../../src/components/charts/quiz-type-labels'

describe('quiz-type-labels', () => {
  it('QUIZ_TYPES_ORDER lists every labelled type exactly once', () => {
    expect([...QUIZ_TYPES_ORDER].sort()).toEqual(Object.keys(QUIZ_TYPE_LABEL).sort())
    expect(new Set(QUIZ_TYPES_ORDER).size).toBe(QUIZ_TYPES_ORDER.length)
  })

  it('every type has a German label', () => {
    expect(Object.keys(QUIZ_TYPE_DE).sort()).toEqual(Object.keys(QUIZ_TYPE_LABEL).sort())
  })

  it('includes the deterministic drills (ADR-0010)', () => {
    expect(QUIZ_TYPES_ORDER).toContain('prep-collocations')
    expect(QUIZ_TYPES_ORDER).toContain('verb-stammformen')
    expect(QUIZ_TYPES_ORDER).toContain('verb-case-government')
  })
})
