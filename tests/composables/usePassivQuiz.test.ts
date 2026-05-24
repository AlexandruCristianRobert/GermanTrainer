import { describe, test, expect } from 'vitest'
import { validatePassivEntry } from '../../src/composables/usePassivQuiz'

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
