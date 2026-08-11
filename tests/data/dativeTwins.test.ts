import { describe, test, expect } from 'vitest'
import { TWIN_PAIRS, TWIN_ITEMS } from '../../src/data/dativeTwins'
import { DATIVE_DRILL_LEVELS } from '../../src/data/dativeExperiencer'
import { VERBS } from '../../src/data/verbs'

const byGerman = new Map(VERBS.map(v => [v.german, v]))

function containsWord(text: string, word: string): boolean {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-zäöüß])${esc}($|[^a-zäöüß])`, 'i').test(text)
}

describe('TWIN_PAIRS', () => {
  test('TWIN GATE: dative member is dative (or varies for glauben); twin exists and is NOT dative', () => {
    const bad = TWIN_PAIRS.filter(p => {
      const d = byGerman.get(p.dativeVerb)
      const t = byGerman.get(p.twin)
      if (!d || !t) return true
      if (!['dative', 'varies'].includes(d.case)) return true
      // same-verb case splits (glauben Dat/Akk) and particle twins (gehören zu)
      // are exempt from the not-dative check — the contrast is real either way.
      if (p.twin === p.dativeVerb || p.twinParticle) return false
      return t.case === 'dative'
    })
    expect(bad.map(p => p.pairId)).toEqual([])
  })

  test('pairIds unique; contrast lines non-empty', () => {
    expect(new Set(TWIN_PAIRS.map(p => p.pairId)).size).toBe(TWIN_PAIRS.length)
    expect(TWIN_PAIRS.filter(p => p.contrast.trim().length === 0)).toEqual([])
  })
})

describe('TWIN_ITEMS (T6)', () => {
  test('base invariants: unique ids, known level, exactly one gap, pairId known', () => {
    expect(new Set(TWIN_ITEMS.map(i => i.id)).size).toBe(TWIN_ITEMS.length)
    const pairIds = new Set(TWIN_PAIRS.map(p => p.pairId))
    const bad = TWIN_ITEMS.filter(i =>
      !(DATIVE_DRILL_LEVELS as readonly string[]).includes(i.level)
      || (i.prompt.match(/___/g) ?? []).length !== 1
      || !pairIds.has(i.pairId)
      || i.translation.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('options: exactly 2, unique, exactly one is the answer', () => {
    const bad = TWIN_ITEMS.filter(i =>
      i.options.length !== 2
      || new Set(i.options).size !== 2
      || i.answers.length !== 1
      || i.options.filter(o => i.answers.includes(o)).length !== 1)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('no answer leak: the prompt never contains the answer as a standalone word', () => {
    const bad = TWIN_ITEMS.filter(i => containsWord(i.prompt, i.answers[0]))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥20 total; every pair ≥2 items; both kinds present', () => {
    expect(TWIN_ITEMS.length).toBeGreaterThanOrEqual(20)
    for (const p of TWIN_PAIRS) {
      expect(TWIN_ITEMS.filter(i => i.pairId === p.pairId).length, `pair ${p.pairId}`).toBeGreaterThanOrEqual(2)
    }
    expect(TWIN_ITEMS.some(i => i.kind === 'verb-choice')).toBe(true)
    expect(TWIN_ITEMS.some(i => i.kind === 'object-choice')).toBe(true)
  })
})
