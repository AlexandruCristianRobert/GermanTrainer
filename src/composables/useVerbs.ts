import type { Verb, VerbLevel, VerbType, VerbCase } from '../data/verbs'
import { VERBS } from '../data/verbs'
import { createPool, type FieldMatchers } from '../data/pool'

export type VerbFilter = {
  levels?: VerbLevel[]
  types?: VerbType[]
  cases?: VerbCase[]
}

const matchers: FieldMatchers<Verb, VerbFilter> = {
  levels: v => v.level,
  types: v => v.type,
  cases: v => v.case,
}

const verbPool = createPool<Verb, VerbFilter>(VERBS, matchers)

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
