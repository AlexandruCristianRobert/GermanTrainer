import {
  PREPOSITIONS,
  type Preposition,
  type PrepCase,
  type PrepLevel,
  type PrepositionExample,
  TWO_WAY_PREPS
} from '../data/prepositions'

export interface PrepFilter {
  levels?: PrepLevel[]
  cases?: PrepCase[]
}

export function filterPrepositions(f: PrepFilter = {}): Preposition[] {
  const levels = f.levels && f.levels.length > 0 ? new Set(f.levels) : null
  const cases = f.cases && f.cases.length > 0 ? new Set(f.cases) : null
  return PREPOSITIONS.filter(p => {
    if (levels && !levels.has(p.level)) return false
    if (cases && !cases.has(p.case)) return false
    return true
  })
}

/** Sample N prepositions matching a filter, without replacement, fresh shuffle each call. */
export function samplePrepositions(count: number, f: PrepFilter = {}): Preposition[] {
  const pool = filterPrepositions(f)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/** Flatten all examples whose parent preposition matches the filter. */
export function filterExamples(f: PrepFilter = {}): Array<{
  prep: Preposition
  example: PrepositionExample
}> {
  return filterPrepositions(f).flatMap(prep =>
    prep.examples.map(example => ({ prep, example }))
  )
}

/** Sample N examples for the article-fill drill. */
export function sampleExamples(
  count: number,
  f: PrepFilter = {}
): Array<{ prep: Preposition; example: PrepositionExample }> {
  const pool = filterExamples(f)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/** Sample N examples that use a two-way preposition, for the two-way decision drill. */
export function sampleTwoWayExamples(
  count: number
): Array<{ prep: Preposition; example: PrepositionExample }> {
  const pool = PREPOSITIONS
    .filter(p => p.case === 'two-way')
    .flatMap(prep => prep.examples.map(example => ({ prep, example })))
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function usePrepositions() {
  return {
    all: PREPOSITIONS,
    filter: filterPrepositions,
    sample: samplePrepositions,
    sampleExamples,
    sampleTwoWayExamples,
    TWO_WAY_PREPS
  }
}
