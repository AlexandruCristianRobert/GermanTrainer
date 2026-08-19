import { describe, test, expect } from 'vitest'
import {
  RELATIV_ITEMS, RELATIV_PRONOUNS, RELATIV_LEVELS, RELATIV_KINDS, filterRelativItems
} from '../../src/data/relativItems'

describe('RELATIV_ITEMS', () => {
  test('base invariants: unique ids, known level/kind, one gap, texts present', () => {
    expect(new Set(RELATIV_ITEMS.map(i => i.id)).size).toBe(RELATIV_ITEMS.length)
    const bad = RELATIV_ITEMS.filter(i =>
      !RELATIV_LEVELS.includes(i.level)
      || !RELATIV_KINDS.includes(i.kind)
      || (i.prompt.match(/___/g) ?? []).length !== 1
      || i.translation.trim().length === 0
      || i.explanation.trim().length === 0
      || !i.prompt.includes(i.antecedent))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('options: exactly 4 unique pronouns from the paradigm, containing the single answer', () => {
    const bad = RELATIV_ITEMS.filter(i =>
      i.options.length !== 4
      || new Set(i.options).size !== 4
      || !i.options.every(o => (RELATIV_PRONOUNS as readonly string[]).includes(o))
      || i.answers.length !== 1
      || !i.options.includes(i.answers[0]))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('genitiv kind ⇔ dessen/deren answers', () => {
    const bad = RELATIV_ITEMS.filter(i =>
      (i.kind === 'genitiv') !== ['dessen', 'deren'].includes(i.answers[0]))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: 120 total; 60/30/30 by kind; every pronoun ≥8 answers, none >30', () => {
    expect(RELATIV_ITEMS.length).toBe(120)
    expect(RELATIV_ITEMS.filter(i => i.kind === 'standard').length).toBe(60)
    expect(RELATIV_ITEMS.filter(i => i.kind === 'genitiv').length).toBe(30)
    expect(RELATIV_ITEMS.filter(i => i.kind === 'praeposition').length).toBe(30)
    for (const p of RELATIV_PRONOUNS) {
      const n = RELATIV_ITEMS.filter(i => i.answers[0] === p).length
      expect(n, p).toBeGreaterThanOrEqual(8)
      expect(n, p).toBeLessThanOrEqual(30)
    }
  })

  test('filter helper filters by level and kind', () => {
    const some = filterRelativItems({ levels: ['B1'], kinds: ['standard'] })
    expect(some.length).toBeGreaterThan(0)
    expect(some.every(i => i.level === 'B1' && i.kind === 'standard')).toBe(true)
  })

  test('no duplicate prompts', () => {
    expect(new Set(RELATIV_ITEMS.map(i => i.prompt)).size).toBe(RELATIV_ITEMS.length)
  })

  test('answer position is spread across options: each index 0..3 gets 20-40 items', () => {
    for (let k = 0; k < 4; k++) {
      const n = RELATIV_ITEMS.filter(i => i.options.indexOf(i.answers[0]) === k).length
      expect(n, `index ${k}`).toBeGreaterThanOrEqual(20)
      expect(n, `index ${k}`).toBeLessThanOrEqual(40)
    }
  })

  test('genitiv items never leak the answer\'s gender: options include both dessen and deren', () => {
    const bad = RELATIV_ITEMS.filter(i =>
      i.kind === 'genitiv' && (!i.options.includes('dessen') || !i.options.includes('deren')))
    expect(bad.map(i => i.id)).toEqual([])
  })
})
