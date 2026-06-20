import {
  COLLOCATIONS,
  type Collocation,
  type CollocationLevel,
  type CollocationRole
} from '../data/collocations'
import { createPool, type FieldMatchers } from '../data/pool'

export type CollocationFilter = {
  levels?: CollocationLevel[]
  roles?: CollocationRole[]
}

// Flat pool of collocations, filterable by level and role.
const collocationPool = createPool<Collocation, CollocationFilter>(COLLOCATIONS, {
  levels: c => c.level,
  roles: c => c.role,
} satisfies FieldMatchers<Collocation, CollocationFilter>)

export function filterCollocations(f: CollocationFilter = {}): Collocation[] {
  return collocationPool.filter(f)
}

/** Sample N collocations matching a filter, without replacement, fresh shuffle each call. */
export function sampleCollocations(count: number, f: CollocationFilter = {}): Collocation[] {
  return collocationPool.sample(count, f)
}

export function useCollocations() {
  return {
    all: COLLOCATIONS,
    filter: filterCollocations,
    sample: sampleCollocations,
  }
}
