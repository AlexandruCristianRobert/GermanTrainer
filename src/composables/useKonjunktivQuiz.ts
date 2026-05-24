import {
  KI_DIFFICULTIES,
  type KiDifficulty,
  type KiQuestion
} from '../data/konjunktiv'

const KI_MOODS = ['K1', 'K2-fallback'] as const

const GERMAN_QUOTE_PAIRS: Array<[string, string]> = [
  ['„', '"'],
  ['«', '»']
]

/**
 * Validate one raw generator entry. Returns the entry shape (without id)
 * if valid, null otherwise.
 *
 * Checks: structural sanity → quote formatting → reporting clause shape
 * → reference-answer consistency → enum validity.
 */
export function validateKiEntry(raw: unknown): Omit<KiQuestion, 'id'> | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>

  // 1. Structural sanity
  if (typeof e.source !== 'string' || e.source.length === 0) return null
  if (typeof e.reportingClause !== 'string' || e.reportingClause.length === 0) return null
  if (typeof e.referenceAnswer !== 'string' || e.referenceAnswer.length === 0) return null
  if (typeof e.expectedMood !== 'string') return null
  if (typeof e.rationale !== 'string' || e.rationale.trim().length === 0) return null
  if (typeof e.difficulty !== 'string') return null

  // 2. Quote formatting — must contain a colon AND a matched German quote pair.
  if (!e.source.includes(':')) return null
  const hasGermanQuotes = GERMAN_QUOTE_PAIRS.some(
    ([open, close]) => (e.source as string).includes(open) && (e.source as string).includes(close)
  )
  if (!hasGermanQuotes) return null

  // 3. Reporting clause shape — ends with ", " so the user's typed continuation
  //    concatenates cleanly into a full sentence.
  if (!(e.reportingClause as string).endsWith(', ')) return null

  // 4. Reference consistency — referenceAnswer must start with the reporting clause.
  if (!(e.referenceAnswer as string).startsWith(e.reportingClause as string)) return null

  // 5. Enum validity
  if (!(KI_MOODS as readonly string[]).includes(e.expectedMood)) return null
  if (!(KI_DIFFICULTIES as readonly string[]).includes(e.difficulty)) return null

  return {
    source: e.source as string,
    reportingClause: e.reportingClause as string,
    referenceAnswer: e.referenceAnswer as string,
    expectedMood: e.expectedMood as 'K1' | 'K2-fallback',
    rationale: e.rationale as string,
    difficulty: e.difficulty as KiDifficulty
  }
}
