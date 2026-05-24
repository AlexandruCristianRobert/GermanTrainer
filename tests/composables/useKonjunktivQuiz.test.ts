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
