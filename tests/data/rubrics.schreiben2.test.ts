import { describe, test, expect } from 'vitest'
import { SCHREIBEN_B2_TEIL2, praedikat } from '../../src/data/rubrics'

describe('SCHREIBEN_B2_TEIL2 rubric', () => {
  test('four criteria à 25, total 100, pass 60 — same scale as Teil 1', () => {
    expect(SCHREIBEN_B2_TEIL2.totalMax).toBe(100)
    expect(SCHREIBEN_B2_TEIL2.passingScore).toBe(60)
    expect(SCHREIBEN_B2_TEIL2.criteria.map(c => c.key))
      .toEqual(['erfuellung', 'kohaerenz', 'wortschatz', 'strukturen'])
    for (const c of SCHREIBEN_B2_TEIL2.criteria) expect(c.maxPoints).toBe(25)
  })
  test('typed-only: no spoken descriptor variants', () => {
    for (const c of SCHREIBEN_B2_TEIL2.criteria) expect(c.descriptorSpokenDe).toBeUndefined()
    expect(SCHREIBEN_B2_TEIL2.notesSpokenDe).toBeUndefined()
  })
  test('erfuellung judges the frame and the word floor; strukturen names Konjunktiv II', () => {
    expect(SCHREIBEN_B2_TEIL2.criteria[0].descriptorDe).toMatch(/Anrede/)
    expect(SCHREIBEN_B2_TEIL2.criteria[0].descriptorDe).toMatch(/Inhaltspunkte/)
    expect(SCHREIBEN_B2_TEIL2.criteria[3].descriptorDe).toMatch(/Konjunktiv II/)
    expect(SCHREIBEN_B2_TEIL2.notes).toMatch(/100/)
  })
  test('praedikat mapping unchanged', () => {
    expect(praedikat(90)).toBe('sehr gut')
    expect(praedikat(59)).toBe('nicht bestanden')
  })
})
