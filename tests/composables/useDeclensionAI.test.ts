import { describe, test, expect } from 'vitest'
import { validateEntry } from '../../src/composables/useDeclensionAI'

const sampleValid = {
  template: 'Ich gebe ___ Mann ___ Buch.',
  sentence: 'Ich gebe dem Mann das Buch.',
  gloss: 'I give the book to the man.',
  blanks: [
    { answer: 'dem', case: 'dative', gender: 'masculine', determiner: 'definite', rationale: 'Dativ: indirect object of geben' },
    { answer: 'das', case: 'accusative', gender: 'neuter', determiner: 'definite', rationale: 'Akkusativ: direct object of geben' }
  ]
}

describe('validateEntry — structural sanity', () => {
  test('valid entry passes', () => {
    expect(validateEntry({ ...sampleValid })).not.toBeNull()
  })
  test('missing template rejected', () => {
    expect(validateEntry({ ...sampleValid, template: undefined as unknown as string })).toBeNull()
  })
  test('missing sentence rejected', () => {
    expect(validateEntry({ ...sampleValid, sentence: '' })).toBeNull()
  })
  test('empty blanks rejected', () => {
    expect(validateEntry({ ...sampleValid, blanks: [] })).toBeNull()
  })
})

describe('validateEntry — blanks-count match', () => {
  test('rejects when template has fewer blanks than the array', () => {
    expect(validateEntry({
      ...sampleValid,
      template: 'Ich gebe ___ Mann das Buch.'
    })).toBeNull()
  })
  test('rejects when template has more blanks than the array', () => {
    expect(validateEntry({
      ...sampleValid,
      template: 'Ich gebe ___ ___ ___ Mann ___ Buch.'
    })).toBeNull()
  })
})

describe('validateEntry — reconstruction', () => {
  test('rejects when answer substitution does not reproduce sentence', () => {
    expect(validateEntry({
      ...sampleValid,
      sentence: 'Ich gebe der Mann das Buch.'
    })).toBeNull()
  })
})

describe('validateEntry — enum validity', () => {
  test('rejects unknown case', () => {
    expect(validateEntry({
      ...sampleValid,
      blanks: [
        { ...sampleValid.blanks[0], case: 'vocative' },
        sampleValid.blanks[1]
      ]
    })).toBeNull()
  })
  test('rejects unknown gender', () => {
    expect(validateEntry({
      ...sampleValid,
      blanks: [
        { ...sampleValid.blanks[0], gender: 'neutral' },
        sampleValid.blanks[1]
      ]
    })).toBeNull()
  })
  test('rejects empty rationale', () => {
    expect(validateEntry({
      ...sampleValid,
      blanks: [
        { ...sampleValid.blanks[0], rationale: '' },
        sampleValid.blanks[1]
      ]
    })).toBeNull()
  })
})

describe('validateEntry — strict article-form check', () => {
  test('rejects when definite + dative + masculine has answer "die" (should be "dem")', () => {
    expect(validateEntry({
      template: 'Ich gebe ___ Mann das Buch.',
      sentence: 'Ich gebe die Mann das Buch.',
      gloss: 'gloss',
      blanks: [
        { answer: 'die', case: 'dative', gender: 'masculine', determiner: 'definite', rationale: 'r' }
      ]
    })).toBeNull()
  })
  test('rejects when indefinite + nominative + feminine has answer "ein" (should be "eine")', () => {
    expect(validateEntry({
      template: '___ Frau lacht.',
      sentence: 'ein Frau lacht.',
      gloss: 'gloss',
      blanks: [
        { answer: 'ein', case: 'nominative', gender: 'feminine', determiner: 'indefinite', rationale: 'r' }
      ]
    })).toBeNull()
  })
  test('possessive determiners SKIP the strict form check', () => {
    expect(validateEntry({
      template: 'Ich gebe ___ Bruder das Buch.',
      sentence: 'Ich gebe meinem Bruder das Buch.',
      gloss: 'I give the book to my brother.',
      blanks: [
        { answer: 'meinem', case: 'dative', gender: 'masculine', determiner: 'possessive', rationale: 'Dativ' }
      ]
    })).not.toBeNull()
  })
  test('accepts correct definite + dative + masculine = "dem"', () => {
    expect(validateEntry({
      template: 'Ich gebe ___ Mann das Buch.',
      sentence: 'Ich gebe dem Mann das Buch.',
      gloss: 'I give the book to the man.',
      blanks: [
        { answer: 'dem', case: 'dative', gender: 'masculine', determiner: 'definite', rationale: 'Dativ' }
      ]
    })).not.toBeNull()
  })
  test('case-insensitive answer matches the lookup', () => {
    expect(validateEntry({
      template: '___ Hund schläft.',
      sentence: 'Der Hund schläft.',
      gloss: 'The dog sleeps.',
      blanks: [
        { answer: 'Der', case: 'nominative', gender: 'masculine', determiner: 'definite', rationale: 'Nom' }
      ]
    })).not.toBeNull()
  })
})
