/**
 * Shared grading helpers for offline, locally-graded grammar drills.
 */

/**
 * Normalize a German string for comparison:
 * - trim
 * - lowercase
 * - collapse internal whitespace runs to single spaces
 * - fold umlauts and ß (after lowercasing): ä→ae, ö→oe, ü→ue, ß→ss
 */
export function foldGerman(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

/**
 * Returns true if the folded input equals the folded expected or any folded alternative.
 *
 * If `expected` contains `/`, each `/`-separated segment is treated as an acceptable answer.
 * Empty/whitespace-only input always returns false.
 */
export function checkText(
  input: string,
  expected: string,
  alternatives?: string[]
): boolean {
  const folded = foldGerman(input)
  if (folded.length === 0) return false

  const segments = expected.split('/').map(seg => foldGerman(seg))
  if (segments.some(seg => seg === folded)) return true

  if (alternatives && alternatives.some(alt => foldGerman(alt) === folded)) return true

  return false
}
