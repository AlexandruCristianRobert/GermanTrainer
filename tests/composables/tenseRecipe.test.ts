import { describe, it, expect } from 'vitest'
import { TENSE_RECIPE, buildTenseRecipe } from '../../src/composables/tenseRecipe'
import { VERB_TENSES } from '../../src/data/verbs'

describe('TENSE_RECIPE', () => {
  it('has a non-empty formula for every tense', () => {
    for (const t of VERB_TENSES) {
      expect(TENSE_RECIPE[t], t).toBeTruthy()
    }
  })

  it('spells the Passiv Präsens formula as wird + Partizip II', () => {
    expect(TENSE_RECIPE.passivPraesens).toBe('wird + Partizip II')
  })

  it('spells the Passiv Perfekt formula with the worden tail', () => {
    expect(TENSE_RECIPE.passivPerfekt).toBe('ist + Partizip II + worden')
  })
})

describe('buildTenseRecipe', () => {
  it('returns the formula for the tense', () => {
    expect(buildTenseRecipe('passivPraesens', ['kaufen']).formula).toBe('wird + Partizip II')
  })

  it('builds the er/sie/es example for a passive tense', () => {
    expect(buildTenseRecipe('passivPraesens', ['kaufen']).example).toBe('wird gekauft')
  })

  it('keeps the worden tail in the Passiv Perfekt example', () => {
    expect(buildTenseRecipe('passivPerfekt', ['kaufen']).example).toBe('ist gekauft worden')
  })

  it('uses the verb’s own auxiliary in the Perfekt example', () => {
    expect(buildTenseRecipe('perfekt', ['gehen']).example).toBe('ist gegangen')
    expect(buildTenseRecipe('perfekt', ['kaufen']).example).toBe('hat gekauft')
  })

  it('keeps the separable prefix attached in the example', () => {
    expect(buildTenseRecipe('praesens', ['aufstehen']).example).toBe('steht auf')
    expect(buildTenseRecipe('perfekt', ['aufstehen']).example).toBe('ist aufgestanden')
  })

  it('uses the du form for the Imperativ, which has no er/sie/es row', () => {
    expect(buildTenseRecipe('imperativ', ['kaufen']).example).toBe('kauf')
  })

  it('joins two verbs with a separator', () => {
    expect(buildTenseRecipe('passivPraesens', ['kaufen', 'machen']).example)
      .toBe('wird gekauft · wird gemacht')
  })

  it('shows one example when the same verb appears twice', () => {
    expect(buildTenseRecipe('passivPraesens', ['kaufen', 'kaufen']).example).toBe('wird gekauft')
  })

  it('has no example when the infinitive is not in the verb pool', () => {
    const r = buildTenseRecipe('passivPraesens', ['xyzzyen'])
    expect(r.example).toBeNull()
    expect(r.formula).toBe('wird + Partizip II')
  })

  it('skips unknown verbs but keeps the ones it knows', () => {
    expect(buildTenseRecipe('passivPraesens', ['xyzzyen', 'kaufen']).example).toBe('wird gekauft')
  })

  it('has no example when no verbs are given', () => {
    expect(buildTenseRecipe('praesens', []).example).toBeNull()
  })
})
