import { describe, test, expect } from 'vitest'
import {
  NACHRICHT_MOVES, NACHRICHT_MOVE_LABEL, NACHRICHT_MOVE_ANLAESSE, movesForAnlass,
  SCHREIBEN_NACHRICHTENMITTEL, nachrichtenmittelForMove, RAHMEN_PAARE, resolveRahmenPaar
} from '../../src/data/schreibenNachrichtenMittel'
import { SCHREIB_ANLAESSE } from '../../src/data/schreibenAuftraege'
import { SCHREIBEN_TEIL2_TIPPS } from '../../src/data/schreibenTipps'
import { phraseNeedle } from '../../src/composables/useRedemittelMatch'
import { SCHREIB_MOVES } from '../../src/data/schreibenMittel'
import { VORTRAG_MOVES } from '../../src/data/sprechenVortragsmittel'
import { MOVES } from '../../src/data/sprechenRedemittel'

describe('Nachrichtenmittel bank', () => {
  test('40 phrases, unique nm- ids, 5 per move', () => {
    expect(SCHREIBEN_NACHRICHTENMITTEL.length).toBe(40)
    expect(new Set(SCHREIBEN_NACHRICHTENMITTEL.map(p => p.id)).size).toBe(40)
    for (const p of SCHREIBEN_NACHRICHTENMITTEL) expect(p.id).toMatch(/^nm-[a-z]+-\d$/)
    for (const m of NACHRICHT_MOVES) expect(nachrichtenmittelForMove(m).length).toBe(5)
  })
  test('Move slugs disjoint from all three existing banks (CONTEXT.md → Move)', () => {
    for (const m of NACHRICHT_MOVES) {
      expect(SCHREIB_MOVES as readonly string[], m).not.toContain(m)
      expect(VORTRAG_MOVES as readonly string[], m).not.toContain(m)
      expect(MOVES as readonly string[], m).not.toContain(m)
    }
  })
  test('aptness: universal moves + occasion-cores; every Anlass gets its core', () => {
    expect(NACHRICHT_MOVE_ANLAESSE.bezug).toBe('alle')
    expect(NACHRICHT_MOVE_ANLAESSE.situation).toBe('alle')
    expect(NACHRICHT_MOVE_ANLAESSE.ausblick).toBe('alle')
    for (const anlass of SCHREIB_ANLAESSE) {
      const apt = movesForAnlass(anlass)
      expect(apt, anlass).toContain('bezug')
      expect(apt, anlass).toContain('ausblick')
      expect(apt, anlass).toContain(anlass)      // core move slug === anlass slug
      expect(apt.length, anlass).toBeLessThan(NACHRICHT_MOVES.length) // never all 8
    }
    expect(movesForAnlass('dank')).not.toContain('entschuldigung')
    expect(movesForAnlass('dank')).not.toContain('beschwerde')
  })
  test('needles: distinct, none a substring of another, floor 12 (10 for overrides)', () => {
    const needles = SCHREIBEN_NACHRICHTENMITTEL.map(p => ({ p, n: phraseNeedle(p) }))
    expect(new Set(needles.map(x => x.n)).size).toBe(40)
    for (const a of needles) for (const b of needles) {
      if (a.p.id !== b.p.id) expect(a.n.includes(b.n), `${a.p.id} swallows ${b.p.id}`).toBe(false)
    }
    for (const { p, n } of needles) expect(n.length, p.id).toBeGreaterThanOrEqual(p.needle ? 10 : 12)
  })
  test('every phrase has a non-empty noteEn; labels for all eight moves', () => {
    for (const p of SCHREIBEN_NACHRICHTENMITTEL) expect(p.noteEn.trim().length).toBeGreaterThan(0)
    for (const m of NACHRICHT_MOVES) {
      expect(NACHRICHT_MOVE_LABEL[m].de.length).toBeGreaterThan(3)
      expect(NACHRICHT_MOVE_LABEL[m].en.length).toBeGreaterThan(3)
    }
  })
  test('4 Rahmen-Paare: Anrede ends with comma, Gruß has no trailing punctuation', () => {
    expect(RAHMEN_PAARE.length).toBe(4)
    for (const rp of RAHMEN_PAARE) {
      expect(rp.anredeDe.trim().endsWith(',')).toBe(true)
      expect(rp.grussDe.trim()).toMatch(/[a-zä]$/i)
      expect(rp.noteEn.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('resolveRahmenPaar', () => {
  const rp1 = RAHMEN_PAARE.find(p => p.id === 'rp-1')!
  const rp3 = RAHMEN_PAARE.find(p => p.id === 'rp-3')!
  const rp4 = RAHMEN_PAARE.find(p => p.id === 'rp-4')!
  it('resolves the template to the actual Empfänger, title-aware', () => {
    expect(resolveRahmenPaar(rp1, 'Frau Hoffmann').anredeDe).toBe('Sehr geehrte Frau Hoffmann,')
    expect(resolveRahmenPaar(rp1, 'Herr Semder').anredeDe).toBe('Sehr geehrter Herr Semder,')
    expect(resolveRahmenPaar(rp3, 'Herr Roth').anredeDe).toBe('Guten Tag, Herr Roth,')
  })
  it('leaves the Damen-und-Herren pair untouched', () => {
    expect(resolveRahmenPaar(rp4, 'Frau Kling').anredeDe).toBe('Sehr geehrte Damen und Herren,')
  })
  it('never changes the Grußformel', () => {
    expect(resolveRahmenPaar(rp1, 'Frau Kling').grussDe).toBe(rp1.grussDe)
  })
})

describe('Teil 2 strategy tips', () => {
  test('six sections, each with a title and at least four tips', () => {
    expect(SCHREIBEN_TEIL2_TIPPS.length).toBe(6)
    expect(new Set(SCHREIBEN_TEIL2_TIPPS.map(s => s.id)).size).toBe(6)
    for (const s of SCHREIBEN_TEIL2_TIPPS) {
      expect(s.titleDe.length).toBeGreaterThan(3)
      expect(s.items.length).toBeGreaterThanOrEqual(4)
      for (const i of s.items) expect(i.de.trim().length).toBeGreaterThan(10)
    }
  })
})
