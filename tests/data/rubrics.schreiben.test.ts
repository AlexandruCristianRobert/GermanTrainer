import { describe, test, expect } from 'vitest'
import { SCHREIBEN_B2_TEIL1, praedikat } from '../../src/data/rubrics'

describe('SCHREIBEN_B2_TEIL1 rubric', () => {
  test('four criteria à 25, total 100, pass 60 — same scale as Sprechen', () => {
    expect(SCHREIBEN_B2_TEIL1.totalMax).toBe(100)
    expect(SCHREIBEN_B2_TEIL1.passingScore).toBe(60)
    expect(SCHREIBEN_B2_TEIL1.criteria.map(c => c.key))
      .toEqual(['erfuellung', 'kohaerenz', 'wortschatz', 'strukturen'])
    for (const c of SCHREIBEN_B2_TEIL1.criteria) expect(c.maxPoints).toBe(25)
  })
  test('typed-only: no spoken descriptor variants', () => {
    for (const c of SCHREIBEN_B2_TEIL1.criteria) expect(c.descriptorSpokenDe).toBeUndefined()
    expect(SCHREIBEN_B2_TEIL1.notesSpokenDe).toBeUndefined()
  })
  test('erfuellung descriptor names the four Inhaltspunkte and the word floor', () => {
    const erf = SCHREIBEN_B2_TEIL1.criteria[0]
    expect(erf.descriptorDe).toMatch(/Inhaltspunkte/)
    expect(SCHREIBEN_B2_TEIL1.notes).toMatch(/150/)
  })
  test('praedikat mapping unchanged', () => {
    expect(praedikat(90)).toBe('sehr gut')
    expect(praedikat(59)).toBe('nicht bestanden')
  })
})
