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

describe('conjugate — Präteritum', () => {
  it('regular verb: stem already includes -te ending', () => {
    const rows = conjugate(find('spielen'), 'praeteritum')
    expect(rows.map(r => r.expected)).toEqual([
      'spielte', 'spieltest', 'spielte', 'spielten', 'spieltet', 'spielten'
    ])
  })

  it('strong verb: ich/er have no ending', () => {
    const rows = conjugate(find('gehen'), 'praeteritum')
    expect(rows[0].expected).toBe('ging')
    expect(rows[1].expected).toBe('gingst')
    expect(rows[2].expected).toBe('ging')
    expect(rows[3].expected).toBe('gingen')
    expect(rows[4].expected).toBe('gingt')
    expect(rows[5].expected).toBe('gingen')
  })

  it('separable Präteritum splits prefix to end', () => {
    const rows = conjugate(find('aufstehen'), 'praeteritum')
    expect(rows[0].expected).toBe('stand auf')
    expect(rows[2].expected).toBe('stand auf')
    expect(rows[3].expected).toBe('standen auf')
  })
})

describe('conjugate — Plusquamperfekt', () => {
  it('uses aux Präteritum + Partizip II', () => {
    expect(conjugate(find('spielen'), 'plusquamperfekt')[0].expected).toBe('hatte gespielt')
    expect(conjugate(find('gehen'), 'plusquamperfekt')[0].expected).toBe('war gegangen')
  })
})

describe('conjugate — Futur I', () => {
  it('uses werden + Infinitiv', () => {
    expect(conjugate(find('spielen'), 'futur1')[0].expected).toBe('werde spielen')
    expect(conjugate(find('aufstehen'), 'futur1')[0].expected).toBe('werde aufstehen')
  })
})

describe('conjugate — Futur II', () => {
  it('uses werden + Partizip II + Auxiliary infinitive', () => {
    expect(conjugate(find('spielen'), 'futur2')[0].expected).toBe('werde gespielt haben')
    expect(conjugate(find('gehen'), 'futur2')[0].expected).toBe('werde gegangen sein')
  })
})

describe('conjugate — Konjunktiv II', () => {
  it('falls back to würde + Infinitiv when no explicit forms', () => {
    expect(conjugate(find('spielen'), 'konjunktiv2')[0].expected).toBe('würde spielen')
  })

  it('uses explicit forms when present (gehen → ginge)', () => {
    expect(conjugate(find('gehen'), 'konjunktiv2')[0].expected).toBe('ginge')
    expect(conjugate(find('gehen'), 'konjunktiv2')[2].expected).toBe('ginge')
  })

  it('modal uses explicit könnte forms', () => {
    expect(conjugate(find('können'), 'konjunktiv2')[0].expected).toBe('könnte')
  })
})

describe('conjugate — Konjunktiv I', () => {
  it('regular: infinitive stem + K1 endings', () => {
    expect(conjugate(find('spielen'), 'konjunktiv1').map(r => r.expected)).toEqual([
      'spiele', 'spielest', 'spiele', 'spielen', 'spielet', 'spielen'
    ])
  })
})
