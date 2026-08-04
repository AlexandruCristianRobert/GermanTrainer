import { describe, it, expect } from 'vitest'
import {
  planSignals, furthestReachedPunkt, outlinedMoves, emptyPlan
} from '../../src/composables/useVortragCoverage'
import { GLIEDERUNGSPUNKTE } from '../../src/data/sprechenVortragsmittel'
import type { VortragPlanEntry } from '../../src/data/sprechen'

const plan: VortragPlanEntry[] = [
  { key: 'einstieg', keyword: 'Sportvereine' },
  { key: 'situation', keyword: 'ein Drittel' },
  { key: 'aspekte', keyword: 'Freistellung' },
  { key: 'erfahrung', keyword: '' },
  { key: 'fazit', keyword: 'Unterstützung' }
]

describe('emptyPlan', () => {
  it('is one blank entry per Gliederungspunkt, in order', () => {
    expect(emptyPlan().map(p => p.key)).toEqual(GLIEDERUNGSPUNKTE.map(p => p.key))
    expect(emptyPlan().every(p => p.keyword === '')).toBe(true)
  })
})

describe('planSignals', () => {
  it('lights exactly the points whose own keyword was said', () => {
    const rede = 'In meiner Stadt tragen Sportvereine alles. Später kam die Freistellung dazu.'
    const said = planSignals(plan, rede).filter(s => s.said).map(s => s.key)
    expect(said).toEqual(['einstieg', 'aspekte'])
  })

  it('matches an inflected form of the planned keyword', () => {
    const said = planSignals(plan, 'Über Freistellungen wird viel geredet.').filter(s => s.said)
    expect(said.map(s => s.key)).toEqual(['aspekte'])
  })

  it('is case- and punctuation-insensitive', () => {
    const said = planSignals(plan, 'FREISTELLUNG, ja!').filter(s => s.said)
    expect(said.map(s => s.key)).toEqual(['aspekte'])
  })

  it('never lights a point whose keyword is empty', () => {
    const signals = planSignals(plan, 'Alles und jedes Wort der Welt.')
    expect(signals.find(s => s.key === 'erfahrung')!.said).toBe(false)
    expect(signals.find(s => s.key === 'erfahrung')!.keyword).toBe('')
  })

  it('returns one signal per Gliederungspunkt even for a short plan', () => {
    const signals = planSignals([{ key: 'fazit', keyword: 'Ende' }], 'Ende.')
    expect(signals).toHaveLength(GLIEDERUNGSPUNKTE.length)
    expect(signals.find(s => s.key === 'fazit')!.said).toBe(true)
  })

  it('does not light anything for an empty Rede', () => {
    expect(planSignals(plan, '').every(s => !s.said)).toBe(true)
  })
})

describe('furthestReachedPunkt', () => {
  it('is the last plan-ordered point whose keyword was said', () => {
    const signals = planSignals(plan, 'Sportvereine … Freistellung …')
    expect(furthestReachedPunkt(signals)).toBe('aspekte')
  })

  it('is null when nothing has been said', () => {
    expect(furthestReachedPunkt(planSignals(plan, ''))).toBeNull()
  })

  it('ignores order of appearance and follows the plan order', () => {
    const signals = planSignals(plan, 'Unterstützung zuerst, dann Sportvereine.')
    expect(furthestReachedPunkt(signals)).toBe('fazit')
  })
})

describe('outlinedMoves', () => {
  it('outlines the first point’s Moves before anything is said', () => {
    expect(outlinedMoves(null)).toEqual(['einstieg', 'gliederung'])
  })

  it('outlines the furthest reached point’s Moves', () => {
    expect(outlinedMoves('aspekte')).toEqual(['kontrast', 'aspekt'])
  })
})
