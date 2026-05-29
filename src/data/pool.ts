// src/data/pool.ts — strict-clean; one contained `as string`.

/** Injectable randomness — the ONLY non-determinism. Float in [0,1) like Math.random. */
export type Rng = () => number

/** The one fair shuffle for the sync const layer. Partial Fisher-Yates on a COPY:
 *  shuffles the first k slots, returns a fresh k-length array. Matches the partial form
 *  already in useVerbs.sample (uniform over first k, O(k)). Source never mutated. */
export function shuffle<T>(src: readonly T[], k: number = src.length, rng: Rng = Math.random): T[] {
  const a = [...src]
  const n = a.length
  const take = Math.max(0, Math.min(k, n))
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(rng() * (n - i))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, take)
}

/** Per-field selector: for each optional filter key, return the item's value for that field.
 *  The mapped type forces an exhaustive matcher map and ties each return to the field's
 *  element type — no `any`, wrong return fails vue-tsc. */
export type FieldMatchers<T, F> = {
  [K in keyof Required<F>]: (item: T) => Required<F>[K] extends ReadonlyArray<infer V> ? V : never
}

export interface Pool<T, F> {
  all(): T[]
  filter(f?: F): T[]
  sample(count: number, f?: F): T[]
}

export function createPool<T, F extends Record<string, readonly string[] | undefined>>(
  items: readonly T[],
  matchers: FieldMatchers<T, F>,
  rng: Rng = Math.random
): Pool<T, F> {
  const keys = Object.keys(matchers) as (keyof F & string)[]
  function matches(item: T, f: F): boolean {
    for (const key of keys) {
      const selected = f[key]
      if (selected && selected.length > 0) {
        const value = matchers[key](item) as string // single contained cast (value is a string union)
        if (!selected.includes(value)) return false
      }
    }
    return true
  }
  function filter(f: F = {} as F): T[] { return items.filter(i => matches(i, f)) }
  return {
    all: () => [...items],
    filter,
    sample(count, f = {} as F) { const p = filter(f); return shuffle(p, Math.min(count, p.length), rng) },
  }
}
