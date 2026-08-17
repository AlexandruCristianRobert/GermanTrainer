import { describe, test, expect } from 'vitest'
import { ANLASS_BAUKAESTEN, AUFTRAG_BAUKAESTEN, resolveBaukasten } from '../../src/data/schreibenBaukasten'
import { SCHREIB_ANLAESSE, SCHREIBEN_AUFTRAEGE } from '../../src/data/schreibenAuftraege'

const FLAGSHIPS = ['wa-besprechung-absagen', 'wa-homeoffice-antrag', 'wa-kantine-qualitaet', 'wa-teamausflug', 'wa-dank-fortbildung']

describe('Baukasten banks', () => {
  test('a fallback bank for every Anlass, no extra keys, 3/3/6 each', () => {
    expect(Object.keys(ANLASS_BAUKAESTEN).sort()).toEqual([...SCHREIB_ANLAESSE].sort())
    for (const bank of Object.values(ANLASS_BAUKAESTEN)) {
      expect(bank.gruende.length).toBe(3)
      expect(bank.loesungen.length).toBe(3)
      expect(bank.words.length).toBe(6)
    }
  })
  test('flagship keys exactly the five, each a real seeded Auftrag, 4/4/6', () => {
    expect(Object.keys(AUFTRAG_BAUKAESTEN).sort()).toEqual([...FLAGSHIPS].sort())
    const ids = new Set(SCHREIBEN_AUFTRAEGE.map(a => a.id))
    for (const id of FLAGSHIPS) expect(ids.has(id), id).toBe(true)
    for (const bank of Object.values(AUFTRAG_BAUKAESTEN)) {
      expect(bank.gruende.length).toBe(4)
      expect(bank.loesungen.length).toBe(4)
      expect(bank.words.length).toBe(6)
    }
  })
  test('content hygiene: no idea over 120 chars, nothing empty, words carry articles', () => {
    for (const bank of [...Object.values(ANLASS_BAUKAESTEN), ...Object.values(AUFTRAG_BAUKAESTEN)]) {
      for (const i of [...bank.gruende, ...bank.loesungen]) {
        expect(i.ideaDe.trim().length).toBeGreaterThan(0)
        expect(i.ideaDe.length).toBeLessThanOrEqual(120)
        expect(i.noteEn.trim().length).toBeGreaterThan(0)
      }
      for (const w of bank.words) expect(w.de).toMatch(/^(der|die|das)\s/)
    }
  })
  test('resolution: cached > flagship > Anlass fallback', () => {
    const flag = { id: 'wa-homeoffice-antrag', anlass: 'bitte' as const }
    const plain = { id: 'wa-urlaub-verschieben', anlass: 'bitte' as const }
    const cached = ANLASS_BAUKAESTEN.dank
    expect(resolveBaukasten(flag, cached)).toEqual({ bank: cached, scope: 'cached' })
    expect(resolveBaukasten(flag).scope).toBe('auftrag')
    expect(resolveBaukasten(plain).scope).toBe('bitte')
    expect(resolveBaukasten({ id: 'wa-custom-123-0', anlass: 'beschwerde' }).scope).toBe('beschwerde')
  })
})
