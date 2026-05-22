import { describe, it, expect } from 'vitest'
import { conjugate } from '../../src/composables/conjugate'
import { VERBS } from '../../src/data/verbs'
import type { Verb } from '../../src/data/verbs'

function find(german: string): Verb {
  const v = VERBS.find(v => v.german === german)
  if (!v) throw new Error(`fixture verb "${german}" missing`)
  return v
}

describe('conjugate — Präsens', () => {
  it('returns 6 rows in pronoun order', () => {
    const rows = conjugate(find('spielen'), 'praesens')
    expect(rows.map(r => r.person)).toEqual(['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'])
    expect(rows.map(r => r.expected)).toEqual(['spiele', 'spielst', 'spielt', 'spielen', 'spielt', 'spielen'])
  })

  it('separable verb is split (stehe auf)', () => {
    const rows = conjugate(find('aufstehen'), 'praesens')
    expect(rows[0].expected).toBe('stehe auf')
    expect(rows[2].expected).toBe('steht auf')
  })
})

describe('conjugate — Imperativ', () => {
  it('returns 3 rows: du, ihr, Sie', () => {
    const rows = conjugate(find('spielen'), 'imperativ')
    expect(rows.map(r => r.person)).toEqual(['du', 'ihr', 'Sie'])
    expect(rows[0].expected).toBe('spiel')
    expect(rows[1].expected).toBe('spielt')
    expect(rows[2].expected).toBe('spielen Sie')
  })

  it('separable du imperativ moves prefix to end', () => {
    const rows = conjugate(find('aufstehen'), 'imperativ')
    expect(rows[0].expected).toBe('steh auf')
    expect(rows[2].expected).toBe('stehen Sie auf')
  })
})

describe('conjugate — Perfekt', () => {
  it('uses haben + Partizip II', () => {
    const rows = conjugate(find('spielen'), 'perfekt')
    expect(rows[0].expected).toBe('habe gespielt')
    expect(rows[2].expected).toBe('hat gespielt')
    expect(rows[3].expected).toBe('haben gespielt')
  })

  it('uses sein for verbs with auxiliary sein', () => {
    const rows = conjugate(find('gehen'), 'perfekt')
    expect(rows[0].expected).toBe('bin gegangen')
    expect(rows[2].expected).toBe('ist gegangen')
  })

  it('separable Perfekt uses joined Partizip II', () => {
    const rows = conjugate(find('aufstehen'), 'perfekt')
    expect(rows[0].expected).toBe('bin aufgestanden')
  })
})
