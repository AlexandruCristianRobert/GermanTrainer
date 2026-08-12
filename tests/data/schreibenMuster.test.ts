import { describe, test, expect } from 'vitest'
import { SCHREIBEN_MUSTER, SCHREIBTHEMA_MUSTER, MUSTER_LAYER_LABEL, MUSTER_TITLE } from '../../src/data/schreibenMuster'
import { SCHREIBEN_THEMEN } from '../../src/data/schreibenThemen'

const MUSTER_IDS = ['abwaegen', 'alternative', 'erfahrung', 'gegenmeinung', 'vorschlag'] as const
const words = (m: (typeof SCHREIBEN_MUSTER)[number]) =>
  m.segments.map(s => s.t).join('').trim().split(/\s+/).length

describe('schreibenMuster', () => {
  test('exactly five models, one per pattern id', () => {
    expect(SCHREIBEN_MUSTER.map(m => m.id).sort()).toEqual([...MUSTER_IDS].sort())
  })
  test('MUSTER_TITLE mirrors every model title (badge lookup can never drift)', () => {
    expect(Object.keys(MUSTER_TITLE).sort()).toEqual([...MUSTER_IDS].sort())
    for (const m of SCHREIBEN_MUSTER) expect(MUSTER_TITLE[m.id]).toBe(m.titleDe)
  })
  test('map covers exactly the 24 seeded themes, each pattern used at least twice', () => {
    const seeded = SCHREIBEN_THEMEN.map(t => t.id).sort()
    expect(Object.keys(SCHREIBTHEMA_MUSTER).sort()).toEqual(seeded)
    for (const id of MUSTER_IDS) {
      expect(Object.values(SCHREIBTHEMA_MUSTER).filter(v => v === id).length,
        `pattern ${id} under-used`).toBeGreaterThanOrEqual(2)
    }
  })
  test('each model answers a real seeded thema mapped to its own pattern', () => {
    for (const m of SCHREIBEN_MUSTER) {
      expect(SCHREIBEN_THEMEN.some(t => t.id === m.themaId), m.id).toBe(true)
      expect(SCHREIBTHEMA_MUSTER[m.themaId], m.id).toBe(m.id)
    }
  })
  test('exam length: 150-200 words; five skeleton lines', () => {
    for (const m of SCHREIBEN_MUSTER) {
      expect(words(m), m.id).toBeGreaterThanOrEqual(150)
      expect(words(m), m.id).toBeLessThanOrEqual(200)
      expect(m.skeleton.length, m.id).toBe(5)
    }
  })
  test('layer coverage: ≥4 konnektor, ≥4 mittel, ≥3 struktur spans per model', () => {
    for (const m of SCHREIBEN_MUSTER) {
      const n = (l: string) => m.segments.filter(s => s.layer === l).length
      expect(n('konnektor'), m.id).toBeGreaterThanOrEqual(4)
      expect(n('mittel'), m.id).toBeGreaterThanOrEqual(4)
      expect(n('struktur'), m.id).toBeGreaterThanOrEqual(3)
    }
  })
  test('every annotated span explains itself (noteDe ≤ 180 chars); plain spans carry no note', () => {
    for (const m of SCHREIBEN_MUSTER) for (const s of m.segments) {
      if (s.layer) {
        expect(s.noteDe?.trim().length ?? 0, `${m.id}: "${s.t}"`).toBeGreaterThan(15)
        expect(s.noteDe!.length, m.id).toBeLessThanOrEqual(180)
      } else {
        expect(s.noteDe, m.id).toBeUndefined()
      }
    }
  })
  test('labels exist for all three layers', () => {
    for (const l of ['konnektor', 'mittel', 'struktur'] as const) {
      expect(MUSTER_LAYER_LABEL[l].de.length).toBeGreaterThan(3)
      expect(MUSTER_LAYER_LABEL[l].en.length).toBeGreaterThan(3)
    }
  })
})
