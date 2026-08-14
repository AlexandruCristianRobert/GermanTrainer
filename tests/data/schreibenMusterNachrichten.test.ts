import { describe, test, expect } from 'vitest'
import {
  SCHREIBEN_MUSTER_NACHRICHTEN, NACHRICHT_MUSTER_LAYER_LABEL
} from '../../src/data/schreibenMusterNachrichten'
import { SCHREIB_ANLAESSE, SCHREIBEN_AUFTRAEGE } from '../../src/data/schreibenAuftraege'

const FLAGSHIPS: Record<string, string> = {
  entschuldigung: 'wa-besprechung-absagen', bitte: 'wa-homeoffice-antrag',
  beschwerde: 'wa-kantine-qualitaet', vorschlag: 'wa-teamausflug', dank: 'wa-dank-fortbildung'
}

describe('Musternachrichten', () => {
  test('exactly five, one per Anlass, each answering its flagship Auftrag', () => {
    expect(SCHREIBEN_MUSTER_NACHRICHTEN.map(m => m.id).sort()).toEqual([...SCHREIB_ANLAESSE].sort())
    const ids = new Set(SCHREIBEN_AUFTRAEGE.map(a => a.id))
    for (const m of SCHREIBEN_MUSTER_NACHRICHTEN) {
      expect(m.auftragId, m.id).toBe(FLAGSHIPS[m.id])
      expect(ids.has(m.auftragId), m.id).toBe(true)
    }
  })
  test('exam length: 95-150 words of running text', () => {
    for (const m of SCHREIBEN_MUSTER_NACHRICHTEN) {
      const words = m.segments.map(s => s.t).join('').trim().split(/\s+/).length
      expect(words, m.id).toBeGreaterThanOrEqual(95)
      expect(words, m.id).toBeLessThanOrEqual(150)
    }
  })
  test('every text carries the frame and all four layers, incl. ≥2 hoeflichkeit spans', () => {
    for (const m of SCHREIBEN_MUSTER_NACHRICHTEN) {
      const full = m.segments.map(s => s.t).join('')
      expect(full, m.id).toMatch(/^Betreff:/)
      expect(full, m.id).toMatch(/Grüßen|Grüße/)
      const layers = m.segments.filter(s => s.layer).map(s => s.layer)
      for (const l of ['konnektor', 'mittel', 'struktur'] as const) expect(layers, `${m.id}:${l}`).toContain(l)
      expect(layers.filter(l => l === 'hoeflichkeit').length, m.id).toBeGreaterThanOrEqual(2)
    }
  })
  test('every annotated span explains itself; skeleton spans Betreff to Gruß', () => {
    for (const m of SCHREIBEN_MUSTER_NACHRICHTEN) {
      for (const s of m.segments) {
        if (s.layer) expect(s.noteDe?.trim().length ?? 0, `${m.id}: "${s.t}"`).toBeGreaterThan(20)
      }
      expect(m.skeleton.length, m.id).toBeGreaterThanOrEqual(5)
      expect(m.skeleton[0].toLowerCase(), m.id).toContain('betreff')
      expect(m.titleDe.length).toBeGreaterThan(3)
      expect(m.signalDe.length).toBeGreaterThan(10)
    }
  })
  test('layer labels for all four layers', () => {
    for (const l of ['konnektor', 'mittel', 'struktur', 'hoeflichkeit'] as const) {
      expect(NACHRICHT_MUSTER_LAYER_LABEL[l].de.length).toBeGreaterThan(3)
    }
  })
})
