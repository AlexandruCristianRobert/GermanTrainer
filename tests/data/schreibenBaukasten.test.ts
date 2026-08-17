import { describe, test, expect } from 'vitest'
import { ANLASS_BAUKAESTEN, AUFTRAG_BAUKAESTEN, resolveBaukasten } from '../../src/data/schreibenBaukasten'
import { SCHREIB_ANLAESSE, SCHREIBEN_AUFTRAEGE } from '../../src/data/schreibenAuftraege'

const SEEDED_IDS = SCHREIBEN_AUFTRAEGE.map(a => a.id)

describe('Baukasten banks', () => {
  test('a fallback bank for every Anlass, no extra keys, 3/3/6 each', () => {
    expect(Object.keys(ANLASS_BAUKAESTEN).sort()).toEqual([...SCHREIB_ANLAESSE].sort())
    for (const bank of Object.values(ANLASS_BAUKAESTEN)) {
      expect(bank.gruende.length).toBe(3)
      expect(bank.loesungen.length).toBe(3)
      expect(bank.words.length).toBe(6)
    }
  })
  test('every seeded Auftrag has a hand-authored flagship Baukasten of 4/4/6', () => {
    for (const a of SCHREIBEN_AUFTRAEGE) {
      const bank = AUFTRAG_BAUKAESTEN[a.id]
      expect(bank, `missing flagship bank for ${a.id}`).toBeDefined()
      expect(bank.gruende).toHaveLength(4)
      expect(bank.loesungen).toHaveLength(4)
      expect(bank.words).toHaveLength(6)
    }
  })
  test('flagship keys are exactly the seeded Auftrag ids — no bank without an Auftrag', () => {
    expect(Object.keys(AUFTRAG_BAUKAESTEN).sort()).toEqual([...SEEDED_IDS].sort())
  })
  test('flagship words carry articles', () => {
    for (const bank of Object.values(AUFTRAG_BAUKAESTEN)) {
      for (const w of bank.words) expect(w.de).toMatch(/^(der|die|das) /)
    }
  })
  test('no idea or word repeats inside one bank', () => {
    for (const [id, bank] of Object.entries(AUFTRAG_BAUKAESTEN)) {
      const ideas = [...bank.gruende, ...bank.loesungen].map(i => i.ideaDe)
      expect(new Set(ideas).size, id).toBe(ideas.length)
      const words = bank.words.map(w => w.de)
      expect(new Set(words).size, id).toBe(words.length)
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
    // Every *seeded* Auftrag now has a flagship bank, so the per-Anlass layer is
    // reachable only through a custom (AI-generated) Auftrag.
    const plain = { id: 'wa-custom-1700000000000-0', anlass: 'bitte' as const }
    const cached = ANLASS_BAUKAESTEN.dank
    expect(resolveBaukasten(flag, cached)).toEqual({ bank: cached, scope: 'cached' })
    expect(resolveBaukasten(flag).scope).toBe('auftrag')
    expect(resolveBaukasten(plain).scope).toBe('bitte')
    expect(resolveBaukasten({ id: 'wa-custom-123-0', anlass: 'beschwerde' }).scope).toBe('beschwerde')
  })
})
