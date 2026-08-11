import { describe, test, expect } from 'vitest'
import { DATIVE_ADJECTIVES, DATIVE_ADJECTIVE_ITEMS } from '../../src/data/dativeAdjectives'
import { DATIVE_DRILL_LEVELS } from '../../src/data/dativeExperiencer'

describe('DATIVE_ADJECTIVE_ITEMS (T9)', () => {
  test('base: unique ids, known level, one gap, cue shown in prompt', () => {
    expect(new Set(DATIVE_ADJECTIVE_ITEMS.map(i => i.id)).size).toBe(DATIVE_ADJECTIVE_ITEMS.length)
    const bad = DATIVE_ADJECTIVE_ITEMS.filter(i =>
      !(DATIVE_DRILL_LEVELS as readonly string[]).includes(i.level)
      || (i.prompt.match(/___/g) ?? []).length !== 1
      || !i.prompt.includes(`(${i.cue})`)
      || i.translation.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('cross-ref: every item adjective is a DATIVE_ADJECTIVES key', () => {
    const keys = new Set(Object.keys(DATIVE_ADJECTIVES))
    const bad = DATIVE_ADJECTIVE_ITEMS.filter(i => !keys.has(i.adjective))
    expect(bad.map(i => `${i.id}:${i.adjective}`)).toEqual([])
  })

  test('REACHABILITY: every DATIVE_ADJECTIVES key appears in ≥1 item (ledger denominator)', () => {
    const covered = new Set(DATIVE_ADJECTIVE_ITEMS.map(i => i.adjective))
    const missing = Object.keys(DATIVE_ADJECTIVES).filter(k => !covered.has(k))
    expect(missing).toEqual([])
  })

  test('options: 2 unique, exactly one answer; the prompt never contains the answer', () => {
    const bad = DATIVE_ADJECTIVE_ITEMS.filter(i => {
      const esc = i.answers[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const leak = new RegExp(`(^|[^a-zäöüß])${esc}($|[^a-zäöüß])`, 'i').test(i.prompt)
      return i.options.length !== 2 || new Set(i.options).size !== 2
        || i.answers.length !== 1 || i.options.filter(o => i.answers.includes(o)).length !== 1 || leak
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floor: ≥20 items', () => {
    expect(DATIVE_ADJECTIVE_ITEMS.length).toBeGreaterThanOrEqual(20)
  })
})
