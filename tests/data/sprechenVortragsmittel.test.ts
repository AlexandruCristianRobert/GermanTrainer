import { describe, it, expect } from 'vitest'
import {
  SPRECHEN_VORTRAGSMITTEL, VORTRAG_MOVES, VORTRAG_MOVE_LABEL, vortragsmittelForMove,
  GLIEDERUNGSPUNKTE, PUNKT_MOVES, VORTRAG_TARGET_WORDS, VORTRAG_MIN_WORDS, VORTRAG_WPM,
  vortragClock, RETTUNGSLEINEN, KONNEKTOREN
} from '../../src/data/sprechenVortragsmittel'
import { redemittelNeedle, phraseNeedle } from '../../src/composables/useRedemittelMatch'

describe('SPRECHEN_VORTRAGSMITTEL', () => {
  it('ships 35 phrases with unique ids', () => {
    expect(SPRECHEN_VORTRAGSMITTEL).toHaveLength(35)
    expect(new Set(SPRECHEN_VORTRAGSMITTEL.map(r => r.id)).size).toBe(35)
  })

  it('covers all seven Moves, five phrases each', () => {
    for (const m of VORTRAG_MOVES) expect(vortragsmittelForMove(m)).toHaveLength(5)
  })

  it('labels every Move in German and English', () => {
    for (const m of VORTRAG_MOVES) {
      expect(VORTRAG_MOVE_LABEL[m].de.length).toBeGreaterThan(3)
      expect(VORTRAG_MOVE_LABEL[m].en.length).toBeGreaterThan(3)
    }
  })

  it('gives every phrase a non-empty English gloss', () => {
    for (const r of SPRECHEN_VORTRAGSMITTEL) expect(r.noteEn.trim().length).toBeGreaterThan(0)
  })

  // The invariant that caught the comma bug in the Teil 2 bank.
  it('produces 35 distinct needles, none a substring of another', () => {
    const needles = SPRECHEN_VORTRAGSMITTEL.map(r => redemittelNeedle(r.phraseDe))
    expect(new Set(needles).size).toBe(35)
    const overlaps: string[] = []
    for (const a of needles) {
      for (const b of needles) if (a !== b && b.includes(a)) overlaps.push(`${a} ⊂ ${b}`)
    }
    expect(overlaps).toEqual([])
  })

  // F5: overrides are hand-verified against natural realizations, so 10 is
  // enough when the string is hand-chosen; a needle DERIVED from phraseDe
  // still has to clear 12 to keep the safety margin the comma bug taught us.
  it('never produces a needle shorter than 12 chars — 10 for a hand-verified override', () => {
    for (const r of SPRECHEN_VORTRAGSMITTEL) {
      const min = r.needle ? 10 : 12
      expect(phraseNeedle(r).length, r.id).toBeGreaterThanOrEqual(min)
    }
  })
})

describe('GLIEDERUNGSPUNKTE', () => {
  it('has five points, numbered 1..5, with unique keys', () => {
    expect(GLIEDERUNGSPUNKTE).toHaveLength(5)
    expect(GLIEDERUNGSPUNKTE.map(p => p.n)).toEqual([1, 2, 3, 4, 5])
    expect(new Set(GLIEDERUNGSPUNKTE.map(p => p.key)).size).toBe(5)
  })

  it('word targets sum to VORTRAG_TARGET_WORDS', () => {
    const sum = GLIEDERUNGSPUNKTE.reduce((n, p) => n + p.words, 0)
    expect(sum).toBe(VORTRAG_TARGET_WORDS)
    expect(VORTRAG_TARGET_WORDS).toBe(360)
    expect(VORTRAG_WPM).toBe(90)
  })

  it('gives every point a hint', () => {
    for (const p of GLIEDERUNGSPUNKTE) expect(p.hintDe.trim().length).toBeGreaterThan(10)
  })

  it('sets the grading floor below the display target — they are different jobs', () => {
    expect(VORTRAG_MIN_WORDS).toBe(200)
    expect(VORTRAG_MIN_WORDS).toBeLessThan(VORTRAG_TARGET_WORDS)
  })
})

describe('PUNKT_MOVES', () => {
  it('maps every Gliederungspunkt to existing Moves', () => {
    for (const p of GLIEDERUNGSPUNKTE) {
      const moves = PUNKT_MOVES[p.key]
      expect(moves.length).toBeGreaterThan(0)
      for (const m of moves) expect(VORTRAG_MOVES).toContain(m)
    }
  })
})

describe('vortragClock', () => {
  it('reads the target as 4:00 at 90 wpm', () => {
    expect(vortragClock(VORTRAG_TARGET_WORDS)).toBe('4:00')
  })

  it('zero-pads the seconds', () => {
    expect(vortragClock(135)).toBe('1:30')
    expect(vortragClock(0)).toBe('0:00')
  })
})

describe('help copy banks', () => {
  it('ships at least three Rettungsleinen, all non-empty', () => {
    expect(RETTUNGSLEINEN.length).toBeGreaterThanOrEqual(3)
    for (const r of RETTUNGSLEINEN) expect(r.trim().length).toBeGreaterThan(10)
  })
})

describe('KONNEKTOREN (F10)', () => {
  it('groups by the Stellung each word forces, with a frame per word', () => {
    expect(KONNEKTOREN.length).toBeGreaterThanOrEqual(4)
    for (const g of KONNEKTOREN) {
      expect(g.stellungDe.trim().length).toBeGreaterThan(5)
      expect(g.konnektoren.length).toBeGreaterThanOrEqual(3)
      for (const k of g.konnektoren) {
        expect(k.frameDe).toContain(k.wort.split(' ')[0])
        expect(k.frameDe).toContain('…')
      }
    }
  })

  it('never offers nämlich as a sentence opener', () => {
    const all = KONNEKTOREN.flatMap(g => g.konnektoren)
    const naemlich = all.find(k => k.wort === 'nämlich')
    expect(naemlich).toBeTruthy()
    expect(naemlich!.frameDe.startsWith('Nämlich')).toBe(false)
  })
})
