import { describe, test, expect } from 'vitest'
import { DIRECTION_IDIOMS, DW_IDIOM_SURFACES } from '../../src/data/directionIdioms'
import { DIRECTION_LEVELS, IDIOMS } from '../../src/data/directionWords'

const KEYS = new Set(IDIOMS.map(i => i.idiom))

describe('DIRECTION_IDIOMS invariants', () => {
  test('unique ids, valid levels, explanation halves, exactly one gap', () => {
    expect(new Set(DIRECTION_IDIOMS.map(i => i.id)).size).toBe(DIRECTION_IDIOMS.length)
    const bad = DIRECTION_IDIOMS.filter(i =>
      !(DIRECTION_LEVELS as readonly string[]).includes(i.level)
      || !i.explanation.includes(' / ')
      || (i.sentence.match(/___/g) ?? []).length !== 1)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('options: 3-4 unique, exactly one is the answer, ALL from the closed inventory', () => {
    const bad = DIRECTION_IDIOMS.filter(i =>
      i.options.length < 3 || i.options.length > 4
      || new Set(i.options).size !== i.options.length
      || i.options.filter(o => o === i.answer).length !== 1
      || i.options.some(o => !DW_IDIOM_SURFACES.includes(o)))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('the answer is itself an inventory surface and never leaks into the sentence', () => {
    const bad = DIRECTION_IDIOMS.filter(i => {
      if (!DW_IDIOM_SURFACES.includes(i.answer)) return true
      const escaped = i.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`\\b${escaped}\\b`, 'i').test(i.sentence)
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every item cross-links a real cheatsheet idiom', () => {
    const bad = DIRECTION_IDIOMS.filter(i => !KEYS.has(i.idiomKey))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('cheatsheet coverage: every IDIOMS entry is drilled at least once', () => {
    const drilled = new Set(DIRECTION_IDIOMS.map(i => i.idiomKey))
    expect(IDIOMS.map(i => i.idiom).filter(k => !drilled.has(k))).toEqual([])
  })

  test('NEAR-MISS GATE: hin und her / hin und wieder always distract each other', () => {
    const TWINS: Record<string, string> = {
      'hin und her': 'hin und wieder',
      'hin und wieder': 'hin und her',
    }
    const bad = DIRECTION_IDIOMS.filter(i =>
      TWINS[i.answer] !== undefined && !i.options.includes(TWINS[i.answer]))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥24 items; ≥2 per cheatsheet idiom for the two C1 twins; levels B1≥8, B2≥8, C1≥4', () => {
    expect(DIRECTION_IDIOMS.length).toBeGreaterThanOrEqual(24)
    for (const key of ['hin und her', 'hin und wieder'])
      expect(DIRECTION_IDIOMS.filter(i => i.idiomKey === key).length, key).toBeGreaterThanOrEqual(2)
    const n = (l: string) => DIRECTION_IDIOMS.filter(i => i.level === l).length
    expect(n('B1')).toBeGreaterThanOrEqual(8)
    expect(n('B2')).toBeGreaterThanOrEqual(8)
    expect(n('C1')).toBeGreaterThanOrEqual(4)
  })
})
