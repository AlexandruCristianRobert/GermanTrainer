// Wortschatz module — local answer grading: strict where the exam grades
// (articles, prepositions, verb/noun endings), tolerant elsewhere (a single
// mid-word typo in a long token). Deliberately does NOT reuse foldGerman
// from drillGrading.ts — that helper folds umlauts (ä→ae) which would let
// a genuine spelling error through; this module's normalizeAnswer keeps
// umlauts and only folds ß→ss, per the writing-exam register this module
// grades. No Vue/DOM.

import type { Vokabel } from '../data/wortschatz'

export type WrongReason = 'article' | 'preposition' | 'ending' | 'word' | 'empty'

export interface GradeResult {
  correct: boolean
  reason?: WrongReason
}

const ARTICLES = ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines']

const PREPOSITIONS = [
  'an', 'auf', 'aus', 'bei', 'für', 'gegen', 'hinter', 'in', 'mit', 'nach', 'neben', 'ohne',
  'seit', 'über', 'um', 'unter', 'von', 'vor', 'zu', 'zwischen', 'durch', 'trotz', 'während', 'wegen'
]

/** Classic Levenshtein DP. Inputs are single German tokens; capped at 40 chars. */
function levenshtein(a: string, b: string): number {
  const s = a.length > 40 ? a.slice(0, 40) : a
  const t = b.length > 40 ? b.slice(0, 40) : b
  const rows = s.length + 1
  const cols = t.length + 1
  const d: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0))
  for (let i = 0; i < rows; i++) d[i][0] = i
  for (let j = 0; j < cols; j++) d[0][j] = j
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // deletion
        d[i][j - 1] + 1,      // insertion
        d[i - 1][j - 1] + cost // substitution
      )
    }
  }
  return d[rows - 1][cols - 1]
}

/**
 * Normalize a German string for comparison: trim, collapse internal
 * whitespace runs to single spaces, lowercase, then fold ß→ss.
 * Umlauts (ä/ö/ü) are deliberately left untouched — see file header.
 */
export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/ß/g, 'ss')
}

function lastTwoMatch(expected: string, given: string): boolean {
  return expected.length >= 2 && given.length >= 2 && expected.slice(-2) === given.slice(-2)
}

/**
 * Grades `given` against a single expected phrase, token by token.
 * - Different token counts (or empty input) fail fast with 'word'/'empty'.
 * - A mismatch where the expected token is a closed-class article or
 *   preposition is always wrong ('article'/'preposition') — no typo tolerance.
 * - Open-class tokens tolerate a Levenshtein-1 typo only when the expected
 *   token is long (≥6 chars) and the two tokens share their last two
 *   characters; a near-miss that changes the ending is 'ending', anything
 *   further off is 'word'.
 * The first failing token determines the reason.
 */
export function gradeAgainst(expected: string, given: string): GradeResult {
  const normExpected = normalizeAnswer(expected)
  const normGiven = normalizeAnswer(given)

  if (normGiven === '') return { correct: false, reason: 'empty' }

  const expectedTokens = normExpected.split(' ')
  const givenTokens = normGiven.split(' ')

  if (expectedTokens.length !== givenTokens.length) return { correct: false, reason: 'word' }

  for (let i = 0; i < expectedTokens.length; i++) {
    const e = expectedTokens[i]
    const g = givenTokens[i]
    if (e === g) continue

    if (ARTICLES.includes(e)) return { correct: false, reason: 'article' }
    if (PREPOSITIONS.includes(e)) return { correct: false, reason: 'preposition' }

    const dist = levenshtein(e, g)
    const sameEnding = lastTwoMatch(e, g)

    if (dist === 1 && e.length >= 6 && sameEnding) continue // forgiven mid-word typo

    if (e.length >= 3 && g.length >= 3 && dist <= 2 && !sameEnding) {
      return { correct: false, reason: 'ending' }
    }

    return { correct: false, reason: 'word' }
  }

  return { correct: true }
}

/**
 * Grades a drill answer against `expectedText` (a cloze blank or the
 * canonical `v.de`). Only when `expectedText === v.de` are `v.variants`
 * and `learnedVariants` (AI-rescued past answers) also tried — the first
 * correct match wins; otherwise the result against `expectedText` stands.
 */
export function gradeVokabelAnswer(
  v: Pick<Vokabel, 'de' | 'variants'>,
  expectedText: string,
  given: string,
  learnedVariants?: string[]
): GradeResult {
  const primary = gradeAgainst(expectedText, given)
  if (primary.correct) return primary

  if (expectedText === v.de) {
    const extras = [...v.variants, ...(learnedVariants ?? [])]
    for (const alt of extras) {
      const result = gradeAgainst(alt, given)
      if (result.correct) return result
    }
  }

  return primary
}
