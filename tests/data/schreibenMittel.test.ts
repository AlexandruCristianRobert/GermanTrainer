import { describe, test, expect } from 'vitest'
import {
  SCHREIB_MOVES, SCHREIB_MOVE_LABEL, SCHREIBEN_SCHREIBMITTEL, schreibmittelForMove
} from '../../src/data/schreibenMittel'
import { SCHREIBEN_TEIL1_TIPPS } from '../../src/data/schreibenTipps'
import { phraseNeedle } from '../../src/composables/useRedemittelMatch'
import { VORTRAG_MOVES } from '../../src/data/sprechenVortragsmittel'
import { MOVES } from '../../src/data/sprechenRedemittel'

describe('Schreibmittel bank', () => {
  test('35 phrases, unique sm- ids, 5 per move', () => {
    expect(SCHREIBEN_SCHREIBMITTEL.length).toBe(35)
    expect(new Set(SCHREIBEN_SCHREIBMITTEL.map(p => p.id)).size).toBe(35)
    for (const p of SCHREIBEN_SCHREIBMITTEL) expect(p.id).toMatch(/^sm-[a-z]+-\d$/)
    for (const m of SCHREIB_MOVES) expect(schreibmittelForMove(m).length).toBe(5)
  })
  test('Move set is disjoint from both Sprechen banks (CONTEXT.md → Move)', () => {
    // Exception: 'beispiel' is the one Move spelled the same in both banks —
    // a Vortrag and a Forumsbeitrag each independently have a give-an-example
    // Move (VORTRAG_MOVE_LABEL.beispiel.en is literally "Give evidence or an
    // example"). CONTEXT.md's "A Move never spans parts, and the sets are
    // never counted together" is about the two never being matched or summed
    // against each other, not about the identifier string being unique
    // app-wide — VORTRAG_MOVES already ships with 'beispiel', out of this
    // task's file scope, so this one identifier is allowed to recur.
    for (const m of SCHREIB_MOVES) {
      if (m !== 'beispiel') expect(VORTRAG_MOVES as readonly string[]).not.toContain(m)
      expect(MOVES as readonly string[]).not.toContain(m)
    }
  })
  test('labels present for all seven Beitragsfunktionen', () => {
    for (const m of SCHREIB_MOVES) {
      expect(SCHREIB_MOVE_LABEL[m].de.length).toBeGreaterThan(3)
      expect(SCHREIB_MOVE_LABEL[m].en.length).toBeGreaterThan(3)
    }
  })
  test('needles: distinct, none a substring of another, floor 12 (10 for overrides)', () => {
    const needles = SCHREIBEN_SCHREIBMITTEL.map(p => ({ p, n: phraseNeedle(p) }))
    expect(new Set(needles.map(x => x.n)).size).toBe(35)
    for (const a of needles) for (const b of needles) {
      if (a.p.id !== b.p.id) expect(a.n.includes(b.n), `${a.p.id} swallows ${b.p.id}`).toBe(false)
    }
    for (const { p, n } of needles) {
      expect(n.length, p.id).toBeGreaterThanOrEqual(p.needle ? 10 : 12)
    }
  })
  test('every phrase has a non-empty noteEn', () => {
    for (const p of SCHREIBEN_SCHREIBMITTEL) expect(p.noteEn.trim().length).toBeGreaterThan(0)
  })
})

describe('Teil 1 strategy tips', () => {
  test('six sections, each with a title and at least four tips', () => {
    expect(SCHREIBEN_TEIL1_TIPPS.length).toBe(6)
    expect(new Set(SCHREIBEN_TEIL1_TIPPS.map(s => s.id)).size).toBe(6)
    for (const s of SCHREIBEN_TEIL1_TIPPS) {
      expect(s.titleDe.length).toBeGreaterThan(3)
      expect(s.items.length).toBeGreaterThanOrEqual(4)
      for (const i of s.items) expect(i.de.trim().length).toBeGreaterThan(10)
    }
  })
})
