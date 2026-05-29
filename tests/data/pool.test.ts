import { describe, it, expect } from 'vitest'
import { shuffle, createPool, type Rng } from '../../src/data/pool'

// Small seeded PRNG — deterministic, no Math.random patching, no vi.mock.
function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('shuffle', () => {
  it('is a permutation and does not mutate the source (k = full length)', () => {
    const src = [10, 20, 30, 40, 50]
    const before = [...src]
    const out = shuffle(src, src.length, mulberry32(123))
    // permutation: same multiset
    expect([...out].sort((a, b) => a - b)).toEqual([...src].sort((a, b) => a - b))
    expect(out.length).toBe(src.length)
    // source untouched
    expect(src).toEqual(before)
    // returns a fresh array, not the source reference
    expect(out).not.toBe(src)
  })

  it('is deterministic — same seed yields identical output', () => {
    const src = [0, 1, 2, 3, 4]
    const a = shuffle(src, src.length, mulberry32(42))
    const b = shuffle(src, src.length, mulberry32(42))
    expect(a).toEqual(b)
  })

  it('pins the exact permutation of [0,1,2,3,4] for seed 42', () => {
    const out = shuffle([0, 1, 2, 3, 4], 5, mulberry32(42))
    // Observed output for mulberry32(42); hard-coded to pin behaviour.
    expect(out).toEqual([3, 2, 4, 1, 0])
  })

  it('is fair — uniform position frequencies over many runs (regression guard vs sort-bias)', () => {
    const N = 10000
    const elems = [0, 1, 2, 3]
    // counts[element][position]
    const counts = elems.map(() => [0, 0, 0, 0])
    const rng = mulberry32(987654321)
    for (let run = 0; run < N; run++) {
      const out = shuffle(elems, elems.length, rng)
      out.forEach((el, pos) => {
        counts[el][pos]++
      })
    }
    const expected = N / elems.length // 2500
    const tolerance = 300 // generous band to avoid flakiness
    for (const el of elems) {
      for (let pos = 0; pos < elems.length; pos++) {
        expect(Math.abs(counts[el][pos] - expected)).toBeLessThan(tolerance)
      }
    }
  })

  it('clamps k: k > n returns full length', () => {
    const pool = [1, 2, 3]
    expect(shuffle(pool, 9999).length).toBe(pool.length)
  })

  it('clamps k: k <= 0 returns []', () => {
    const pool = [1, 2, 3]
    expect(shuffle(pool, 0)).toEqual([])
    expect(shuffle(pool, -5)).toEqual([])
  })

  it('empty source returns [] regardless of k', () => {
    expect(shuffle<number>([], 5)).toEqual([])
  })

  it('partial shuffle returns a fresh array of length min(k, n) drawn from the source', () => {
    const src = [1, 2, 3, 4, 5, 6]
    const out = shuffle(src, 3, mulberry32(7))
    expect(out.length).toBe(3)
    // every taken element comes from the source
    expect(out.every(x => src.includes(x))).toBe(true)
    // unique
    expect(new Set(out).size).toBe(out.length)
  })
})

// --- Pool fixture (self-contained; no real-dataset imports) ---
interface Item {
  id: string
  level: string
  kind: string
}

const ITEMS: readonly Item[] = [
  { id: 'a', level: 'A1', kind: 'noun' },
  { id: 'b', level: 'A1', kind: 'verb' },
  { id: 'c', level: 'A2', kind: 'noun' },
  { id: 'd', level: 'A2', kind: 'verb' },
  { id: 'e', level: 'B1', kind: 'noun' },
  { id: 'f', level: 'B1', kind: 'verb' },
  { id: 'g', level: 'A1', kind: 'noun' },
]

// A `type` alias (not an `interface`) so it carries an implicit index signature
// and satisfies createPool's `Record<string, readonly string[] | undefined>` bound.
type ItemFilter = {
  level?: readonly string[]
  kind?: readonly string[]
}

const matchers = {
  level: (i: Item) => i.level,
  kind: (i: Item) => i.kind,
}

function makePool(rng: Rng = Math.random) {
  return createPool<Item, ItemFilter>(ITEMS, matchers, rng)
}

describe('createPool.all', () => {
  it('returns all items as a copy (not the source reference)', () => {
    const pool = makePool()
    const a = pool.all()
    expect(a.map(i => i.id)).toEqual(ITEMS.map(i => i.id))
    expect(a).not.toBe(ITEMS)
  })
})

describe('createPool.filter', () => {
  it('single field filters to matching items', () => {
    const pool = makePool()
    const a1 = pool.filter({ level: ['A1'] })
    expect(a1.map(i => i.id).sort()).toEqual(['a', 'b', 'g'])
    expect(a1.every(i => i.level === 'A1')).toBe(true)
  })

  it('multi-field filter is AND across set fields', () => {
    const pool = makePool()
    const a1nouns = pool.filter({ level: ['A1'], kind: ['noun'] })
    expect(a1nouns.map(i => i.id).sort()).toEqual(['a', 'g'])
    expect(a1nouns.every(i => i.level === 'A1' && i.kind === 'noun')).toBe(true)
  })

  it('a field set to multiple values is OR within that field', () => {
    const pool = makePool()
    const a1a2 = pool.filter({ level: ['A1', 'A2'] })
    expect(a1a2.map(i => i.id).sort()).toEqual(['a', 'b', 'c', 'd', 'g'])
  })

  it('an empty-array field is a no-op', () => {
    const pool = makePool()
    const out = pool.filter({ level: [], kind: ['verb'] })
    expect(out.map(i => i.id).sort()).toEqual(['b', 'd', 'f'])
  })

  it('filter({}) membership equals all()', () => {
    const pool = makePool()
    expect(pool.filter({}).map(i => i.id)).toEqual(pool.all().map(i => i.id))
  })

  it('filter() with no argument equals all()', () => {
    const pool = makePool()
    expect(pool.filter().map(i => i.id)).toEqual(pool.all().map(i => i.id))
  })
})

describe('createPool.sample', () => {
  it('clamps count to the filtered size', () => {
    const pool = makePool(mulberry32(1))
    const verbs = pool.filter({ kind: ['verb'] })
    const s = pool.sample(9999, { kind: ['verb'] })
    expect(s.length).toBe(verbs.length)
  })

  it('is deterministic with a seeded rng', () => {
    const a = makePool(mulberry32(2024)).sample(4)
    const b = makePool(mulberry32(2024)).sample(4)
    expect(a.map(i => i.id)).toEqual(b.map(i => i.id))
  })

  it('every returned item is in filter(f)', () => {
    const pool = makePool(mulberry32(55))
    const f = { kind: ['noun'] }
    const allowed = new Set(pool.filter(f).map(i => i.id))
    const s = pool.sample(2, f)
    expect(s.length).toBe(2)
    expect(s.every(i => allowed.has(i.id))).toBe(true)
  })

  it('returns unique items (no dupes)', () => {
    const pool = makePool(mulberry32(99))
    const s = pool.sample(ITEMS.length)
    expect(new Set(s.map(i => i.id)).size).toBe(s.length)
    expect(s.length).toBe(ITEMS.length)
  })
})
