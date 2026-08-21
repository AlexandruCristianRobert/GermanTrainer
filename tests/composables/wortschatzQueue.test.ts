import { describe, it, expect } from 'vitest'
import { buildLernAuswahl, buildWiederholQueue, pickErkennenOptions } from '../../src/composables/wortschatzQueue'
import type { Vokabel } from '../../src/data/wortschatz'

function mk(id: string, feld: string, kind: 'einzelwort' | 'wortverbindung', en = id): Vokabel {
  return { id, feld: feld as Vokabel['feld'], kind, de: id, en, variants: [], saetze: [
    { de: `Ein {{${id}}} hier.`, en: 'x' }, { de: `Noch ein {{${id}}}.`, en: 'y' }
  ], source: 'seed' }
}
const seq = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length] }

describe('wortschatzQueue', () => {
  it('buildLernAuswahl mixes kinds and respects count', () => {
    const pool = [
      ...Array.from({ length: 10 }, (_, i) => mk(`ew${i}`, 'Umwelt', 'einzelwort')),
      ...Array.from({ length: 10 }, (_, i) => mk(`wv${i}`, 'Umwelt', 'wortverbindung'))
    ]
    const picked = buildLernAuswahl(pool, 7, seq([0.5]))
    expect(picked).toHaveLength(7)
    expect(picked.filter(v => v.kind === 'wortverbindung').length).toBeGreaterThanOrEqual(3)
    expect(picked.filter(v => v.kind === 'einzelwort').length).toBeGreaterThanOrEqual(3)
    expect(new Set(picked.map(v => v.id)).size).toBe(7)
  })

  it('buildLernAuswahl with a small pool returns the whole pool', () => {
    const pool = [mk('a', 'Umwelt', 'einzelwort'), mk('b', 'Umwelt', 'wortverbindung')]
    expect(buildLernAuswahl(pool, 7, seq([0.1]))).toHaveLength(2)
  })

  it('buildWiederholQueue breaks same-feld adjacency when possible', () => {
    const due = [
      { v: mk('u1', 'Umwelt', 'einzelwort') }, { v: mk('u2', 'Umwelt', 'einzelwort') },
      { v: mk('u3', 'Umwelt', 'einzelwort') }, { v: mk('a1', 'Arbeit', 'einzelwort') },
      { v: mk('a2', 'Arbeit', 'einzelwort') }, { v: mk('k1', 'Konsum', 'einzelwort') }
    ]
    const q = buildWiederholQueue(due, seq([0.3]))
    expect(q).toHaveLength(6)
    let adjacent = 0
    for (let i = 1; i < q.length; i++) if (q[i].v.feld === q[i - 1].v.feld) adjacent++
    expect(adjacent).toBe(0)   // 3+2+1 across three fields is fully interleavable
  })

  it('single-feld queue survives (adjacency unavoidable)', () => {
    const due = [{ v: mk('u1', 'Umwelt', 'einzelwort') }, { v: mk('u2', 'Umwelt', 'einzelwort') }]
    expect(buildWiederholQueue(due, seq([0.5]))).toHaveLength(2)
  })

  it('pickErkennenOptions returns 4 unique glosses including the right one', () => {
    const target = mk('t', 'Umwelt', 'einzelwort', 'target gloss')
    const pool = [target,
      mk('d1', 'Umwelt', 'einzelwort', 'g1'), mk('d2', 'Umwelt', 'einzelwort', 'g2'),
      mk('d3', 'Arbeit', 'einzelwort', 'g3'), mk('d4', 'Umwelt', 'wortverbindung', 'g4')
    ]
    const opts = pickErkennenOptions(target, pool, seq([0.2]))
    expect(opts).toHaveLength(4)
    expect(opts).toContain('target gloss')
    expect(new Set(opts).size).toBe(4)
  })
})
