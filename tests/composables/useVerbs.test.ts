import { describe, it, expect } from 'vitest'
import { useVerbs } from '../../src/composables/useVerbs'

describe('useVerbs', () => {
  const { all, filter, sample } = useVerbs()

  it('all() returns the dataset', () => {
    expect(all().length).toBeGreaterThan(100)
  })

  it('filter by level', () => {
    const a1 = filter({ levels: ['A1'] })
    expect(a1.every(v => v.level === 'A1')).toBe(true)
  })

  it('filter by type', () => {
    const modals = filter({ types: ['modal'] })
    expect(modals.every(v => v.type === 'modal')).toBe(true)
    expect(modals.length).toBeGreaterThanOrEqual(6)
  })

  it('filter by case', () => {
    const datives = filter({ cases: ['dative'] })
    expect(datives.every(v => v.case === 'dative')).toBe(true)
  })

  it('sample returns up to n unique entries', () => {
    const s = sample(5, { levels: ['A1'] })
    expect(s.length).toBe(5)
    const uniq = new Set(s.map(v => v.german))
    expect(uniq.size).toBe(5)
  })

  it('sample clamps to available size', () => {
    const s = sample(9999, { types: ['modal'] })
    expect(s.length).toBe(filter({ types: ['modal'] }).length)
  })
})
