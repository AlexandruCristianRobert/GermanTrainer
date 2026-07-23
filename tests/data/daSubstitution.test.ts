import { describe, test, expect } from 'vitest'
import { DA_SUBSTITUTION, NEIGHBOR_PREPS, substitutionAnswer } from '../../src/data/daSubstitution'
import { COLLOCATIONS } from '../../src/data/collocations'
import { daCompound, canFormCompound } from '../../src/data/daCompounds'

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

describe('DA_SUBSTITUTION invariants', () => {
  test('at least 90 items with unique ids and unique collocations', () => {
    expect(DA_SUBSTITUTION.length).toBeGreaterThanOrEqual(90)
    expect(new Set(DA_SUBSTITUTION.map(i => i.id)).size).toBe(DA_SUBSTITUTION.length)
    expect(new Set(DA_SUBSTITUTION.map(i => i.collocationId)).size).toBe(DA_SUBSTITUTION.length)
  })
  test('every item joins a real collocation and matches its level', () => {
    const bad = DA_SUBSTITUTION.filter(i => !byId.has(i.collocationId) || byId.get(i.collocationId)!.level !== i.level)
    expect(bad.map(i => i.id)).toEqual([])
  })
  test('stem has exactly one gap and never contains the answer', () => {
    const bad = DA_SUBSTITUTION.filter(i => {
      const gaps = (i.stem.match(/___/g) ?? []).length
      return gaps !== 1 || i.stem.toLowerCase().includes(substitutionAnswer(i).toLowerCase())
    })
    expect(bad.map(i => i.id)).toEqual([])
  })
  test('context uses the preposition (incl. common contractions)', () => {
    const CONTRACTIONS: Record<string, string[]> = {
      an: ['am', 'ans'], auf: ['aufs'], in: ['im', 'ins'], von: ['vom'],
      zu: ['zum', 'zur'], für: ['fürs'], um: ['ums'], über: ['übers'], vor: ['vorm'],
    }
    const bad = DA_SUBSTITUTION.filter(i => {
      const prep = byId.get(i.collocationId)!.preposition
      const words = i.context.toLowerCase().split(/[^a-zäöüß]+/)
      return !(words.includes(prep) || (CONTRACTIONS[prep] ?? []).some(c => words.includes(c)))
    })
    expect(bad.map(i => i.id)).toEqual([])
  })
  test('level floors: B1>=30, B2>=30, C1>=15', () => {
    const n = (l: string) => DA_SUBSTITUTION.filter(i => i.level === l).length
    expect(n('B1')).toBeGreaterThanOrEqual(30)
    expect(n('B2')).toBeGreaterThanOrEqual(30)
    expect(n('C1')).toBeGreaterThanOrEqual(15)
  })
})

describe('NEIGHBOR_PREPS', () => {
  test('each entry maps to 3 distinct compoundable prepositions, none the key itself', () => {
    for (const [prep, neighbors] of Object.entries(NEIGHBOR_PREPS)) {
      expect(new Set(neighbors).size).toBe(3)
      expect(neighbors).not.toContain(prep)
      for (const n of neighbors) expect(canFormCompound(n)).toBe(true)
    }
  })
  test('covers every primary collocation preposition', () => {
    const primaries = new Set(COLLOCATIONS.map(c => c.preposition))
    for (const p of primaries) expect(NEIGHBOR_PREPS[p]).toBeDefined()
  })
  test('answers derive from the collocation preposition', () => {
    const item = DA_SUBSTITUTION[0]
    expect(substitutionAnswer(item)).toBe(daCompound(byId.get(item.collocationId)!.preposition))
  })
})
