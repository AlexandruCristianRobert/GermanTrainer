import { describe, test, expect } from 'vitest'
import { checkArticle } from '../../src/composables/usePrepositionQuiz'

describe('checkArticle', () => {
  test('exact match accepts', () => {
    expect(checkArticle('dem', 'dem', [])).toBe(true)
  })

  test('case-insensitive', () => {
    expect(checkArticle('DEM', 'dem', [])).toBe(true)
    expect(checkArticle('Dem', 'dem', [])).toBe(true)
  })

  test('trims and collapses inner whitespace', () => {
    expect(checkArticle('  dem  ', 'dem', [])).toBe(true)
    expect(checkArticle('meines   Vaters', 'meines Vaters', [])).toBe(true)
  })

  test('rejects empty input', () => {
    expect(checkArticle('', 'dem', [])).toBe(false)
    expect(checkArticle('   ', 'dem', [])).toBe(false)
  })

  test('rejects wrong article', () => {
    expect(checkArticle('den', 'dem', [])).toBe(false)
  })

  test('accepts a listed alternative', () => {
    expect(checkArticle('einer', 'der', ['einer'])).toBe(true)
  })

  test('alternatives are also case + whitespace tolerant', () => {
    expect(checkArticle(' EINER ', 'der', ['einer'])).toBe(true)
  })
})
