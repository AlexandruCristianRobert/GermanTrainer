import type { Verb, VerbLevel, VerbType, VerbCase } from '../data/verbs'
import { VERBS } from '../data/verbs'

export interface VerbFilter {
  levels?: VerbLevel[]
  types?: VerbType[]
  cases?: VerbCase[]
}

function matches(verb: Verb, f: VerbFilter): boolean {
  if (f.levels && f.levels.length && !f.levels.includes(verb.level)) return false
  if (f.types && f.types.length && !f.types.includes(verb.type)) return false
  if (f.cases && f.cases.length && !f.cases.includes(verb.case)) return false
  return true
}

export function useVerbs() {
  function all(): Verb[] {
    return [...VERBS]
  }

  function filter(f: VerbFilter): Verb[] {
    return VERBS.filter(v => matches(v, f))
  }

  function sample(n: number, f: VerbFilter = {}): Verb[] {
    const pool = filter(f)
    const k = Math.min(n, pool.length)
    const copy = [...pool]
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(Math.random() * (copy.length - i))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy.slice(0, k)
  }

  return { all, filter, sample }
}
