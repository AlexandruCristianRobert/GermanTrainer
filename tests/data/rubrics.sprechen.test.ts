import { describe, expect, it } from 'vitest'
import { SPRECHEN_B2_TEIL2, praedikat } from '../../src/data/rubrics'

describe('SPRECHEN_B2_TEIL2 rubric', () => {
  it('has four criteria of 25 points each, total 100, pass at 60', () => {
    expect(SPRECHEN_B2_TEIL2.criteria.map(c => c.key)).toEqual([
      'erfuellung', 'kohaerenz', 'wortschatz', 'strukturen'
    ])
    for (const c of SPRECHEN_B2_TEIL2.criteria) expect(c.maxPoints).toBe(25)
    expect(SPRECHEN_B2_TEIL2.totalMax).toBe(100)
    expect(SPRECHEN_B2_TEIL2.passingScore).toBe(60)
  })

  it('every criterion carries a German descriptor', () => {
    for (const c of SPRECHEN_B2_TEIL2.criteria) {
      expect(c.descriptorDe.length).toBeGreaterThan(40)
    }
  })
})

describe('praedikat bands', () => {
  it('maps scores to the official Goethe bands', () => {
    expect(praedikat(100)).toBe('sehr gut')
    expect(praedikat(90)).toBe('sehr gut')
    expect(praedikat(89)).toBe('gut')
    expect(praedikat(80)).toBe('gut')
    expect(praedikat(79)).toBe('befriedigend')
    expect(praedikat(70)).toBe('befriedigend')
    expect(praedikat(69)).toBe('ausreichend')
    expect(praedikat(60)).toBe('ausreichend')
    expect(praedikat(59)).toBe('nicht bestanden')
    expect(praedikat(0)).toBe('nicht bestanden')
  })
})
