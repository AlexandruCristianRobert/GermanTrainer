/**
 * CSV query-param parser, lifted from the inline helper in
 * src/modules/verbs/ConjugationQuizRunner.vue.
 *
 * If `raw` is not a non-empty string, returns all allowed values.
 * Otherwise splits on `,`, trims each segment, and keeps only values
 * present in `allowed`.
 */
export function csv<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (typeof raw !== 'string' || raw.length === 0) return [...allowed]
  const set = new Set<string>(allowed)
  return raw.split(',').map(s => s.trim()).filter((x): x is T => set.has(x))
}
