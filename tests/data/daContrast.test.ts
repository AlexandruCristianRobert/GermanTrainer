import { describe, test, expect } from 'vitest'
import { CONTRAST_SETS, DA_CONTRAST } from '../../src/data/daContrast'

const setByKey = new Map(CONTRAST_SETS.map(s => [s.key, s]))

describe('CONTRAST_SETS invariants', () => {
  test('at least 6 sets with unique keys', () => {
    expect(CONTRAST_SETS.length).toBeGreaterThanOrEqual(6)
    expect(new Set(CONTRAST_SETS.map(s => s.key)).size).toBe(CONTRAST_SETS.length)
  })

  test('every set has a word and 2-3 options with distinct preps and non-empty senses', () => {
    const bad = CONTRAST_SETS.filter(s => {
      if (!s.word || s.word.trim().length === 0) return true
      if (s.options.length < 2 || s.options.length > 3) return true
      if (new Set(s.options.map(o => o.preposition)).size !== s.options.length) return true
      return s.options.some(o => !o.preposition || !o.sense || o.sense.trim().length < 4)
    })
    expect(bad.map(s => s.key)).toEqual([])
  })
})

describe('DA_CONTRAST invariants', () => {
  test('at least 36 items with unique ids', () => {
    expect(DA_CONTRAST.length).toBeGreaterThanOrEqual(36)
    expect(new Set(DA_CONTRAST.map(i => i.id)).size).toBe(DA_CONTRAST.length)
  })

  test('ids follow the ct-<key>-<n> convention and reference a real set', () => {
    const bad = DA_CONTRAST.filter(i => {
      if (!setByKey.has(i.contrastKey)) return true
      return !new RegExp(`^ct-${i.contrastKey}-\\d+$`).test(i.id)
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every correct answer is one of its set options', () => {
    const bad = DA_CONTRAST.filter(i => {
      const set = setByKey.get(i.contrastKey)
      return !set || !set.options.some(o => o.preposition === i.correct)
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every sentence has exactly one gap', () => {
    const bad = DA_CONTRAST.filter(i => (i.sentence.match(/___/g) ?? []).length !== 1)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('no sentence leaks its correct preposition as a standalone word', () => {
    const bad = DA_CONTRAST.filter(i => new RegExp(`\\b${i.correct}\\b`, 'i').test(i.sentence))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('at least 4 items per set', () => {
    const bad = CONTRAST_SETS.filter(
      s => DA_CONTRAST.filter(i => i.contrastKey === s.key).length < 4,
    )
    expect(bad.map(s => s.key)).toEqual([])
  })
})
