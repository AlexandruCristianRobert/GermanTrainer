import {
  PREPOSITIONS,
  type Preposition,
  type PrepCase,
  type PrepLevel,
  type PrepositionExample,
  TWO_WAY_PREPS
} from '../data/prepositions'
import { createPool, type FieldMatchers } from '../data/pool'

export type PrepFilter = {
  levels?: PrepLevel[]
  cases?: PrepCase[]
}

// Flat pool of prepositions, filterable by level and case.
const prepPool = createPool<Preposition, PrepFilter>(PREPOSITIONS, {
  levels: p => p.level,
  cases: p => p.case,
} satisfies FieldMatchers<Preposition, PrepFilter>)

/** A preposition paired with one of its example sentences. */
export type PrepExamplePair = { prep: Preposition; example: PrepositionExample }

// Flat list of every (prep, example) pair in PREPOSITIONS source order.
const PREP_PAIRS: PrepExamplePair[] = PREPOSITIONS.flatMap(prep =>
  prep.examples.map(example => ({ prep, example }))
)

// Derived pool that filters pairs by their parent preposition's level/case.
const examplePool = createPool<PrepExamplePair, PrepFilter>(PREP_PAIRS, {
  levels: pe => pe.prep.level,
  cases: pe => pe.prep.case,
} satisfies FieldMatchers<PrepExamplePair, PrepFilter>)

export function filterPrepositions(f: PrepFilter = {}): Preposition[] {
  return prepPool.filter(f)
}

/** Sample N prepositions matching a filter, without replacement, fresh shuffle each call. */
export function samplePrepositions(count: number, f: PrepFilter = {}): Preposition[] {
  return prepPool.sample(count, f)
}

/** Flatten all examples whose parent preposition matches the filter. */
export function filterExamples(f: PrepFilter = {}): PrepExamplePair[] {
  return examplePool.filter(f)
}

/** Sample N examples for the article-fill drill. */
export function sampleExamples(count: number, f: PrepFilter = {}): PrepExamplePair[] {
  return examplePool.sample(count, f)
}

/** Sample N examples that use a two-way preposition, for the two-way decision drill.
 *  No level filter: the two-way drill always draws from the full two-way pool regardless
 *  of any level setting (matches the original behaviour — this mode has no level picker).
 *  Keyed off the parent preposition's declared case via examplePool's matcher. */
export function sampleTwoWayExamples(count: number): PrepExamplePair[] {
  return examplePool.sample(count, { cases: ['two-way'] })
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
