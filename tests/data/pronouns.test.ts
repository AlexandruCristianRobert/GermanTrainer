import { describe, test, expect } from 'vitest'
import { PRONOUNS, PRONOUN_CATEGORIES } from '../../src/data/pronouns'
import { DECL_CASES } from '../../src/data/declension'

describe('pronouns dataset', () => {
  test('unique ids', () => {
    const ids = PRONOUNS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every entry has all 4 case forms (including reflexive dashes)', () => {
    for (const p of PRONOUNS) {
      for (const c of DECL_CASES) {
        expect(p.forms[c], `${p.id} missing ${c}`).toBeTruthy()
      }
    }
  })

  test('reflexive entries have — in nominative and genitive', () => {
    for (const p of PRONOUNS) {
      if (p.category === 'reflexive') {
        expect(p.forms.nominative, `${p.id}: nominative not dashed`).toBe('—')
        expect(p.forms.genitive, `${p.id}: genitive not dashed`).toBe('—')
      }
    }
  })

  test('every category value is valid', () => {
    const valid = new Set<string>(PRONOUN_CATEGORIES)
    for (const p of PRONOUNS) {
      expect(valid.has(p.category), `${p.id}: bad category ${p.category}`).toBe(true)
    }
  })

  test('expected dataset size', () => {
    expect(PRONOUNS.length).toBe(17)
  })
})
