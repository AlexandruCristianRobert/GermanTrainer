import type { Verb, VerbLevel, VerbType, VerbCase } from '../data/verbs'
import { VERBS } from '../data/verbs'
import { createPool, type FieldMatchers } from '../data/pool'

export type VerbFilter = {
  levels?: VerbLevel[]
  types?: VerbType[]
  cases?: VerbCase[]
}

const verbPool = createPool<Verb, VerbFilter>(
  VERBS,
  {
    levels: v => v.level,
    types: v => v.type,
    cases: v => v.case,
  } satisfies FieldMatchers<Verb, VerbFilter>
)

export function useVerbs() {
  function all(): Verb[] {
    return verbPool.all()
  }

  function filter(f: VerbFilter): Verb[] {
    return verbPool.filter(f)
  }

  function sample(n: number, f: VerbFilter = {}): Verb[] {
    return verbPool.sample(n, f)
  }

  return { all, filter, sample }
}
