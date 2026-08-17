import { describe, expect, it } from 'vitest'
import { NACHRICHT_AUFBAU } from '../../src/data/schreibenAufbau'
import { SCHREIB_ANLAESSE } from '../../src/data/schreibenAuftraege'

describe('NACHRICHT_AUFBAU', () => {
  it('covers every Schreibanlass with 6–8 steps', () => {
    for (const anlass of SCHREIB_ANLAESSE) {
      const steps = NACHRICHT_AUFBAU[anlass]
      expect(steps.length).toBeGreaterThanOrEqual(6)
      expect(steps.length).toBeLessThanOrEqual(8)
      for (const s of steps) expect(s.length).toBeGreaterThan(10)
    }
  })
  it('is generalized — no Muster-specific scenario nouns leak through', () => {
    const all = Object.values(NACHRICHT_AUFBAU).flat().join(' ')
    for (const leak of ['Arzttermin', 'Protokoll', 'Kantine', 'Homeoffice', 'Teamausflug', 'Fortbildung']) {
      expect(all).not.toContain(leak)
    }
  })
})
