import { describe, expect, it } from 'vitest'
import { SPRECHEN_B2_TEIL2, praedikat, sprechenDescriptor } from '../../src/data/rubrics'

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

describe('SPRECHEN_B2_TEIL2 rubric — modality-aware descriptor (spoken fluency evidence)', () => {
  it('keeps exactly 4 criteria, keys, order and points (sum 100) unchanged for both typed and spoken modalities', () => {
    for (const modality of ['typed', 'spoken'] as const) {
      expect(SPRECHEN_B2_TEIL2.criteria.map(c => c.key)).toEqual([
        'erfuellung', 'kohaerenz', 'wortschatz', 'strukturen'
      ])
      const total = SPRECHEN_B2_TEIL2.criteria.reduce((sum, c) => sum + c.maxPoints, 0)
      expect(total).toBe(100)
      // Resolving a descriptor never changes the criterion's key or points —
      // only its wording — so typed and spoken scores stay on one scale.
      for (const c of SPRECHEN_B2_TEIL2.criteria) {
        expect(sprechenDescriptor(c, modality).length).toBeGreaterThan(0)
      }
      expect(SPRECHEN_B2_TEIL2.totalMax).toBe(100)
      expect(SPRECHEN_B2_TEIL2.passingScore).toBe(60)
    }
  })

  it('typed kohaerenz descriptor is unchanged: keeps the "nicht Sprechtempo" hedge', () => {
    const kohaerenz = SPRECHEN_B2_TEIL2.criteria.find(c => c.key === 'kohaerenz')!
    expect(sprechenDescriptor(kohaerenz, 'typed')).toBe(kohaerenz.descriptorDe)
    expect(sprechenDescriptor(kohaerenz, 'typed')).toContain('nicht Sprechtempo')
  })

  it('spoken kohaerenz descriptor drops the hedge and names tempo, hesitation and pausing as in scope', () => {
    const kohaerenz = SPRECHEN_B2_TEIL2.criteria.find(c => c.key === 'kohaerenz')!
    const spokenText = sprechenDescriptor(kohaerenz, 'spoken')
    expect(spokenText).not.toBe(kohaerenz.descriptorDe)
    expect(spokenText).not.toContain('nicht Sprechtempo')
    expect(spokenText).toContain('Sprechtempo')
    expect(spokenText).toContain('Zögern')
    expect(spokenText).toContain('Pausen')
    expect(spokenText.length).toBeGreaterThan(40)
  })

  it('the other three criteria have no spoken variant and fall back to descriptorDe unchanged', () => {
    for (const c of SPRECHEN_B2_TEIL2.criteria.filter(c => c.key !== 'kohaerenz')) {
      expect(c.descriptorSpokenDe).toBeUndefined()
      expect(sprechenDescriptor(c, 'spoken')).toBe(c.descriptorDe)
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
