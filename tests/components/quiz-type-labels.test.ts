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

  it('includes the four Da-Compounds drill types', () => {
    expect(QUIZ_TYPES_ORDER).toContain('dac-formation')
    expect(QUIZ_TYPES_ORDER).toContain('dac-match')
    expect(QUIZ_TYPES_ORDER).toContain('dac-substitution')
    expect(QUIZ_TYPES_ORDER).toContain('dac-neighbors')
  })

  it('includes the three case-family Da-Compounds drill types with EN/DE labels', () => {
    expect(QUIZ_TYPES_ORDER).toContain('dac-case')
    expect(QUIZ_TYPES_ORDER).toContain('dac-pronoun-case')
    expect(QUIZ_TYPES_ORDER).toContain('dac-article')
    expect(QUIZ_TYPE_LABEL['dac-case']).toBe('Da-compounds · case')
    expect(QUIZ_TYPE_DE['dac-case']).toBe('Da-Compounds · Kasus')
    expect(QUIZ_TYPE_LABEL['dac-pronoun-case']).toBe('Da-compounds · pronoun case')
    expect(QUIZ_TYPE_DE['dac-pronoun-case']).toBe('Da-Compounds · Pronomen-Kasus')
    expect(QUIZ_TYPE_LABEL['dac-article']).toBe('Da-compounds · article fill')
    expect(QUIZ_TYPE_DE['dac-article']).toBe('Da-Compounds · Artikel')
  })
})
