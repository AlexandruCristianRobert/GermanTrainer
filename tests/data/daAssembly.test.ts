import { describe, test, expect } from 'vitest'
import {
  DA_ASSEMBLY,
  assemblySentence,
  acceptedOrders,
  type AssemblyItem,
} from '../../src/data/daAssembly'
import { COLLOCATIONS } from '../../src/data/collocations'

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

const canonicalOrder = (n: number): number[] => Array.from({ length: n }, (_, i) => i)

const isPermutationOf = (order: number[], n: number): boolean => {
  if (order.length !== n) return false
  const seen = new Set(order)
  if (seen.size !== n) return false
  for (let i = 0; i < n; i++) if (!seen.has(i)) return false
  return true
}

describe('DA_ASSEMBLY invariants', () => {
  test('at least 40 items with unique ids and one item per collocation', () => {
    expect(DA_ASSEMBLY.length).toBeGreaterThanOrEqual(40)
    expect(new Set(DA_ASSEMBLY.map(i => i.id)).size).toBe(DA_ASSEMBLY.length)
    expect(new Set(DA_ASSEMBLY.map(i => i.collocationId)).size).toBe(DA_ASSEMBLY.length)
  })

  test('ids follow the as-<collocationId> convention', () => {
    const bad = DA_ASSEMBLY.filter(i => i.id !== `as-${i.collocationId}`)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every item joins a real collocation and matches its level', () => {
    const bad = DA_ASSEMBLY.filter(
      i => !byId.has(i.collocationId) || byId.get(i.collocationId)!.level !== i.level,
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('each item has 4–7 tiles', () => {
    const bad = DA_ASSEMBLY.filter(i => i.tiles.length < 4 || i.tiles.length > 7)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('no two identical tile strings within an item', () => {
    const bad = DA_ASSEMBLY.filter(i => new Set(i.tiles).size !== i.tiles.length)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every variant is a true permutation of 0..n-1 and differs from canonical', () => {
    const bad = DA_ASSEMBLY.filter(i =>
      (i.variants ?? []).some(
        v =>
          !isPermutationOf(v, i.tiles.length) ||
          v.join(',') === canonicalOrder(i.tiles.length).join(','),
      ),
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('no two accepted orders within an item are identical', () => {
    const bad = DA_ASSEMBLY.filter(i => {
      const orders = acceptedOrders(i).map(o => o.join(','))
      return new Set(orders).size !== orders.length
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('punctuation is one of . ! ?', () => {
    const bad = DA_ASSEMBLY.filter(i => !['.', '!', '?'].includes(i.punctuation))
    expect(bad.map(i => i.id)).toEqual([])
  })

  // Soft audit: the canonical opening tile is lowercase-initial. Subject noun
  // phrases open with a lowercase article/possessive ('mein Vater', 'die Eltern');
  // the noun itself is capitalised INSIDE the tile, never at its start. A
  // capitalised opener would be a bug (e.g. a stray capitalised pronoun).
  test('canonical tile[0] is lowercase-initial', () => {
    const bad = DA_ASSEMBLY.filter(i => !/^[a-zäöüß]/.test(i.tiles[0]))
    expect(bad.map(i => i.id)).toEqual([])
  })

  // Korrelat tiles keep the comma glued to the da-compound chunk, so a
  // comma-bearing tile must be followed by its clause — never the last tile.
  test('no item ends on a dangling comma tile', () => {
    const bad = DA_ASSEMBLY.filter(i => i.tiles[i.tiles.length - 1].endsWith(','))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('a good share of items carry an idiomatic fronting variant', () => {
    const withVariant = DA_ASSEMBLY.filter(i => (i.variants?.length ?? 0) > 0)
    expect(withVariant.length).toBeGreaterThanOrEqual(10)
  })

  test('the dataset mixes plain and da-compound/Korrelat sentences', () => {
    // Korrelat items carry a da-compound tile ending in a comma.
    const korrelat = DA_ASSEMBLY.filter(i => i.tiles.some(t => /^d(a|ar)\p{L}*.*,$/u.test(t)))
    expect(korrelat.length).toBeGreaterThanOrEqual(8)
    expect(DA_ASSEMBLY.length - korrelat.length).toBeGreaterThanOrEqual(8)
  })

  test('every level is represented', () => {
    const levels = new Set(DA_ASSEMBLY.map(i => i.level))
    expect(levels.has('B1')).toBe(true)
    expect(levels.has('B2')).toBe(true)
    expect(levels.has('C1')).toBe(true)
  })
})

describe('assemblySentence', () => {
  test('every canonical render is capitalised, punctuated, and single-spaced', () => {
    for (const item of DA_ASSEMBLY) {
      const s = assemblySentence(item)
      expect(s[0]).toBe(s[0].toUpperCase())
      expect(s.endsWith(item.punctuation)).toBe(true)
      expect(s).not.toMatch(/\s{2,}/)
    }
  })

  test('spot check: canonical join with capital + period', () => {
    const item: AssemblyItem = {
      id: 'as-x',
      collocationId: 'warten-auf',
      level: 'B1',
      tiles: ['ich', 'warte', 'auf den Bus'],
      punctuation: '.',
    }
    expect(assemblySentence(item)).toBe('Ich warte auf den Bus.')
  })

  test('spot check: renders a supplied variant order (fronted object)', () => {
    const item: AssemblyItem = {
      id: 'as-x',
      collocationId: 'warten-auf',
      level: 'B1',
      tiles: ['ich', 'warte', 'auf den Bus'],
      punctuation: '.',
      variants: [[2, 1, 0]],
    }
    expect(assemblySentence(item, [2, 1, 0])).toBe('Auf den Bus warte ich.')
  })

  test('spot check: Korrelat sentence keeps the comma attached to the da-compound', () => {
    const item: AssemblyItem = {
      id: 'as-x',
      collocationId: 'sich-freuen-auf',
      level: 'B1',
      tiles: ['ich', 'freue mich', 'darauf,', 'dass du kommst'],
      punctuation: '.',
    }
    expect(assemblySentence(item)).toBe('Ich freue mich darauf, dass du kommst.')
  })

  test('spot check: question punctuation', () => {
    const item: AssemblyItem = {
      id: 'as-x',
      collocationId: 'suchen-nach',
      level: 'B1',
      tiles: ['suchst', 'du', 'nach dem Weg'],
      punctuation: '?',
    }
    expect(assemblySentence(item)).toBe('Suchst du nach dem Weg?')
  })

  test('spot check: exclamation punctuation', () => {
    const item: AssemblyItem = {
      id: 'as-x',
      collocationId: 'sich-freuen-auf',
      level: 'B1',
      tiles: ['ich', 'freue mich', 'darauf,', 'dass du kommst'],
      punctuation: '!',
    }
    expect(assemblySentence(item)).toBe('Ich freue mich darauf, dass du kommst!')
  })
})

describe('acceptedOrders', () => {
  test('starts with the canonical 0..n-1 order, then each variant', () => {
    for (const item of DA_ASSEMBLY) {
      const orders = acceptedOrders(item)
      expect(orders[0]).toEqual(canonicalOrder(item.tiles.length))
      expect(orders.length).toBe(1 + (item.variants?.length ?? 0))
    }
  })

  test('every accepted order renders a non-empty, capitalised, punctuated sentence', () => {
    for (const item of DA_ASSEMBLY) {
      for (const order of acceptedOrders(item)) {
        const s = assemblySentence(item, order)
        expect(s.length).toBeGreaterThan(0)
        expect(s[0]).toBe(s[0].toUpperCase())
        expect(s.endsWith(item.punctuation)).toBe(true)
      }
    }
  })
})
