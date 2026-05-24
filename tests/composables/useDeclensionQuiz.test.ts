import { describe, test, expect } from 'vitest'
import { checkForm, checkArticle, checkAdjective } from '../../src/composables/useDeclensionQuiz'

describe('checkForm — multi-word noun phrase acceptance', () => {
  test('exact match accepts', () => {
    expect(checkForm('des Mannes', 'des Mannes', [])).toBe(true)
  })
  test('case-insensitive', () => {
    expect(checkForm('DES MANNES', 'des Mannes', [])).toBe(true)
  })
  test('trims and collapses inner whitespace', () => {
    expect(checkForm('  des   Mannes  ', 'des Mannes', [])).toBe(true)
  })
  test('rejects wrong article', () => {
    expect(checkForm('den Mannes', 'des Mannes', [])).toBe(false)
  })
  test('rejects missing genitive -s', () => {
    expect(checkForm('des Mann', 'des Mannes', [])).toBe(false)
  })
  test('accepts a listed alternative', () => {
    expect(checkForm('des Manns', 'des Mannes', ['des Manns'])).toBe(true)
  })
  test('rejects empty input', () => {
    expect(checkForm('', 'des Mannes', [])).toBe(false)
    expect(checkForm('   ', 'des Mannes', [])).toBe(false)
  })
})

describe('checkArticle — single-word article acceptance', () => {
  test('exact match accepts', () => {
    expect(checkArticle('dem', 'dem', [])).toBe(true)
  })
  test('case-insensitive', () => {
    expect(checkArticle('Dem', 'dem', [])).toBe(true)
  })
  test('rejects empty + wrong', () => {
    expect(checkArticle('', 'dem', [])).toBe(false)
    expect(checkArticle('den', 'dem', [])).toBe(false)
  })
  test('accepts capitalized variant (sentence-initial)', () => {
    expect(checkArticle('der', 'Der', [])).toBe(true)
  })
})

describe('checkAdjective — adjective ending acceptance', () => {
  test('full inflected form accepts', () => {
    expect(checkAdjective('schöne', 'schöne', [])).toBe(true)
  })
  test('case-insensitive', () => {
    expect(checkAdjective('SCHÖNE', 'schöne', [])).toBe(true)
  })
  test('trims whitespace', () => {
    expect(checkAdjective('  schöne  ', 'schöne', [])).toBe(true)
  })
  test('rejects empty + wrong ending', () => {
    expect(checkAdjective('', 'schöne', [])).toBe(false)
    expect(checkAdjective('schönen', 'schöne', [])).toBe(false)
  })
  test('does NOT accept the bare stem (the whole point of the drill)', () => {
    expect(checkAdjective('schön', 'schöne', [])).toBe(false)
  })
})
