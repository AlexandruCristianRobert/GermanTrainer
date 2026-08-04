import { describe, it, expect } from 'vitest'
import { SPRECHEN_B2_TEIL1, SPRECHEN_B2_TEIL2, sprechenDescriptor, sprechenNotes, praedikat } from '../../src/data/rubrics'

describe('SPRECHEN_B2_TEIL1', () => {
  it('mirrors Teil 2 structurally so the two scores stay comparable', () => {
    expect(SPRECHEN_B2_TEIL1.totalMax).toBe(SPRECHEN_B2_TEIL2.totalMax)
    expect(SPRECHEN_B2_TEIL1.passingScore).toBe(SPRECHEN_B2_TEIL2.passingScore)
    expect(SPRECHEN_B2_TEIL1.criteria.map(c => c.key)).toEqual(SPRECHEN_B2_TEIL2.criteria.map(c => c.key))
    expect(SPRECHEN_B2_TEIL1.criteria.map(c => c.maxPoints)).toEqual([25, 25, 25, 25])
  })

  it('sums to its own totalMax', () => {
    const sum = SPRECHEN_B2_TEIL1.criteria.reduce((n, c) => n + c.maxPoints, 0)
    expect(sum).toBe(SPRECHEN_B2_TEIL1.totalMax)
  })

  it('renames the first criterion to Gliederung and asks about coverage and the Nachfrage', () => {
    const c = SPRECHEN_B2_TEIL1.criteria[0]
    expect(c.key).toBe('erfuellung')
    expect(c.labelDe).toContain('Gliederung')
    expect(c.descriptorDe).toContain('Gliederungspunkt')
    expect(c.descriptorDe).toContain('Nachfrage')
  })

  it('carries a spoken variant on kohaerenz and on no other criterion', () => {
    const withSpoken = SPRECHEN_B2_TEIL1.criteria.filter(c => c.descriptorSpokenDe !== undefined)
    expect(withSpoken.map(c => c.key)).toEqual(['kohaerenz'])
  })

  it('hedges fluency when typed and drops the hedge when spoken', () => {
    const koh = SPRECHEN_B2_TEIL1.criteria.find(c => c.key === 'kohaerenz')!
    expect(sprechenDescriptor(koh, 'typed')).toContain('schriftliche Form')
    expect(sprechenDescriptor(koh, 'spoken')).not.toContain('schriftliche Form')
    expect(sprechenDescriptor(koh, 'spoken')).toContain('Sprechtempo')
  })

  it('mentions that Aussprache stays excluded, in both modalities', () => {
    expect(sprechenNotes(SPRECHEN_B2_TEIL1, 'typed')).toContain('Aussprache')
    expect(sprechenNotes(SPRECHEN_B2_TEIL1, 'spoken')).toContain('Aussprache')
  })

  it('shares the Prädikat bands with Teil 2', () => {
    expect(praedikat(SPRECHEN_B2_TEIL1.passingScore)).toBe('ausreichend')
    expect(praedikat(SPRECHEN_B2_TEIL1.passingScore - 1)).toBe('nicht bestanden')
  })
})
