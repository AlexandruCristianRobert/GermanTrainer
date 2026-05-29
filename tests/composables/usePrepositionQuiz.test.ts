import { describe, test, expect } from 'vitest'
import {
  checkArticle,
  wrongCasePreps,
  wrongArticlePairs,
  wrongTwoWayPairs,
  type CaseQuestion,
  type ArticleQuestion,
  type TwoWayQuestion
} from '../../src/composables/usePrepositionQuiz'
import type { Preposition, PrepositionExample } from '../../src/data/prepositions'

function prep(id: string): Preposition {
  return { id, german: id, english: id, case: 'dative', level: 'A1', examples: [] }
}
function ex(sentence: string): PrepositionExample {
  return { sentence, blanked: sentence, expectedAnswer: 'dem', usedCase: 'dative', gloss: sentence }
}

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

describe('retry-wrong extractors', () => {
  test('wrongCasePreps returns only the incorrectly-answered prepositions', () => {
    const qs: CaseQuestion[] = [
      { prep: prep('mit'), picked: 'dative', isCorrect: true },
      { prep: prep('fuer'), picked: 'dative', isCorrect: false },
      { prep: prep('ohne'), picked: null, isCorrect: null }
    ]
    expect(wrongCasePreps(qs).map(p => p.id)).toEqual(['fuer'])
  })

  test('wrongArticlePairs returns prep+example for wrong answers only', () => {
    const qs: ArticleQuestion[] = [
      { prep: prep('in'), example: ex('A'), userAnswer: 'dem', isCorrect: true },
      { prep: prep('an'), example: ex('B'), userAnswer: 'das', isCorrect: false }
    ]
    const w = wrongArticlePairs(qs)
    expect(w.map(p => p.example.sentence)).toEqual(['B'])
  })

  test('wrongTwoWayPairs returns prep+example for wrong answers only', () => {
    const qs: TwoWayQuestion[] = [
      { prep: prep('auf'), example: ex('X'), picked: 'dative', isCorrect: true },
      { prep: prep('ueber'), example: ex('Y'), picked: 'accusative', isCorrect: false }
    ]
    expect(wrongTwoWayPairs(qs).map(p => p.example.sentence)).toEqual(['Y'])
  })

  test('an all-correct round yields no wrong items (loop terminates)', () => {
    const qs: CaseQuestion[] = [{ prep: prep('mit'), picked: 'dative', isCorrect: true }]
    expect(wrongCasePreps(qs)).toEqual([])
  })
})
