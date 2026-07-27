import { describe, expect, it } from 'vitest'
import {
  HINT_MOVES, MOVES, MOVE_LABEL, SPRECHEN_REDEMITTEL, phrasesForMove
} from '../../src/data/sprechenRedemittel'

describe('sprechenRedemittel', () => {
  it('has unique ids', () => {
    const ids = new Set(SPRECHEN_REDEMITTEL.map(r => r.id))
    expect(ids.size).toBe(SPRECHEN_REDEMITTEL.length)
  })

  it('every phrase belongs to a known Move and is non-empty', () => {
    for (const r of SPRECHEN_REDEMITTEL) {
      expect(MOVES).toContain(r.move)
      expect(r.phraseDe.trim().length).toBeGreaterThan(3)
    }
  })

  it('every Move has at least 4 phrases (hint panel shows up to 3)', () => {
    for (const m of MOVES) {
      expect(phrasesForMove(m).length).toBeGreaterThanOrEqual(4)
    }
  })

  it('HINT_MOVES is the six in-Discussion moves — opinion is cheatsheet-only', () => {
    expect(HINT_MOVES).toEqual(['agree', 'disagree', 'partial', 'ask', 'example', 'summarize'])
    expect(HINT_MOVES).not.toContain('opinion')
  })

  it('every Move has DE and EN labels', () => {
    for (const m of MOVES) {
      expect(MOVE_LABEL[m].de.length).toBeGreaterThan(0)
      expect(MOVE_LABEL[m].en.length).toBeGreaterThan(0)
    }
  })
})
