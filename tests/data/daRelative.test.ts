import { describe, test, expect } from 'vitest'
import {
  DA_RELATIVE,
  relativeAccepted,
  type RelativeItem,
} from '../../src/data/daRelative'

const LEVELS = new Set(['B1', 'B2', 'C1'])
const KINDS: RelativeItem['antecedentKind'][] = ['indefinite', 'thing', 'person']

describe('DA_RELATIVE invariants', () => {
  test('at least 36 items with unique ids', () => {
    expect(DA_RELATIVE.length).toBeGreaterThanOrEqual(36)
    expect(new Set(DA_RELATIVE.map(i => i.id)).size).toBe(DA_RELATIVE.length)
  })

  test('ids follow the rl-<n> convention', () => {
    const bad = DA_RELATIVE.filter(i => !/^rl-\d+$/.test(i.id))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('kind floors: >=10 of each of indefinite | thing | person', () => {
    for (const k of KINDS) {
      const n = DA_RELATIVE.filter(i => i.antecedentKind === k).length
      expect(n, `kind ${k}`).toBeGreaterThanOrEqual(10)
    }
  })

  test('antecedentKind is one of the three known values', () => {
    const bad = DA_RELATIVE.filter(i => !KINDS.includes(i.antecedentKind))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every sentence has exactly one gap, right after a comma', () => {
    const bad = DA_RELATIVE.filter(
      i => (i.sentence.match(/___/g) ?? []).length !== 1 || !/,\s*___/.test(i.sentence),
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('woForm starts with "wo"; prepForm contains a space (prep + pronoun)', () => {
    const bad = DA_RELATIVE.filter(
      i => !/^wo/.test(i.woForm) || !/\s/.test(i.prepForm.trim()),
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every explanation is a non-empty teaching line', () => {
    const bad = DA_RELATIVE.filter(i => !i.explanation || i.explanation.trim().length < 12)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('level is a valid CollocationLevel', () => {
    const bad = DA_RELATIVE.filter(i => !LEVELS.has(i.level))
    expect(bad.map(i => i.id)).toEqual([])
  })
})

describe('relativeAccepted — the Duden three-way rule', () => {
  test('indefinite antecedents accept ONLY the wo-form', () => {
    for (const i of DA_RELATIVE.filter(i => i.antecedentKind === 'indefinite')) {
      expect(relativeAccepted(i)).toEqual([i.woForm])
    }
  })

  test('person antecedents accept ONLY prep + relative pronoun (wo-form forbidden)', () => {
    for (const i of DA_RELATIVE.filter(i => i.antecedentKind === 'person')) {
      expect(relativeAccepted(i)).toEqual([i.prepForm])
    }
  })

  test('thing antecedents accept BOTH, prep-form preferred (listed first)', () => {
    for (const i of DA_RELATIVE.filter(i => i.antecedentKind === 'thing')) {
      expect(relativeAccepted(i)).toEqual([i.prepForm, i.woForm])
    }
  })

  test('spot check: alles -> woran only', () => {
    const item = DA_RELATIVE.find(i => i.antecedentKind === 'indefinite' && i.woForm === 'woran')
    expect(item).toBeDefined()
    expect(relativeAccepted(item!)).toEqual(['woran'])
  })

  test('spot check: a person item never returns a wo-form', () => {
    for (const i of DA_RELATIVE.filter(i => i.antecedentKind === 'person')) {
      expect(relativeAccepted(i).some(a => a.startsWith('wo'))).toBe(false)
    }
  })
})
