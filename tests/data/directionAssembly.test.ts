import { describe, test, expect } from 'vitest'
import { DIRECTION_ASSEMBLY, dwAssemblySentence, dwAcceptedOrders } from '../../src/data/directionAssembly'
import { DIRECTION_LEVELS } from '../../src/data/directionWords'

describe('DIRECTION_ASSEMBLY invariants', () => {
  test('unique ids, valid levels, 4-7 tiles, unique tile strings, non-empty translation', () => {
    expect(new Set(DIRECTION_ASSEMBLY.map(i => i.id)).size).toBe(DIRECTION_ASSEMBLY.length)
    const bad = DIRECTION_ASSEMBLY.filter(i =>
      !(DIRECTION_LEVELS as readonly string[]).includes(i.level)
      || i.tiles.length < 4 || i.tiles.length > 7
      || new Set(i.tiles).size !== i.tiles.length
      || i.translation.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every item carries a direction word in some tile', () => {
    const bad = DIRECTION_ASSEMBLY.filter(i => !i.tiles.some(t => /hin|her|wohin|woher/i.test(t)))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('variants are true permutations differing from canonical', () => {
    const bad = DIRECTION_ASSEMBLY.filter(i => (i.variants ?? []).some(v => {
      const canonical = i.tiles.map((_, k) => k)
      return v.length !== i.tiles.length
        || [...v].sort((a, b) => a - b).join(',') !== canonical.join(',')
        || v.join(',') === canonical.join(',')
    }))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('FUSION GATE: no accepted order places a bare adverb tile directly before a verb-form tile', () => {
    const BARE = /^(hin|her|hinein|herein|hinaus|heraus|hinauf|herauf|hinunter|herunter|hinüber|herüber|hinab|herab)$/i
    const VERBISH = /^(zu )?(ge)?\p{L}+(en|t)$/u   // crude infinitive/participle shape, single word
    const bad = DIRECTION_ASSEMBLY.filter(i => dwAcceptedOrders(i).some(order =>
      order.some((tileIdx, pos) => {
        const next = order[pos + 1]
        return next !== undefined
          && BARE.test(i.tiles[tileIdx].trim())
          && !i.tiles[next].includes(' ')
          && VERBISH.test(i.tiles[next].trim())
      })))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('helpers: sentence renders capitalized with punctuation; canonical is first accepted order', () => {
    const i = DIRECTION_ASSEMBLY[0]
    const s = dwAssemblySentence(i)
    expect(s.charAt(0)).toBe(s.charAt(0).toUpperCase())
    expect(s.endsWith(i.punctuation)).toBe(true)
    expect(dwAcceptedOrders(i)[0]).toEqual(i.tiles.map((_, k) => k))
  })

  test('floors: ≥24 total; A2≥6, B1≥8, B2≥6; ≥6 items with variants; ≥3 questions', () => {
    expect(DIRECTION_ASSEMBLY.length).toBeGreaterThanOrEqual(24)
    const n = (l: string) => DIRECTION_ASSEMBLY.filter(i => i.level === l).length
    expect(n('A2')).toBeGreaterThanOrEqual(6)
    expect(n('B1')).toBeGreaterThanOrEqual(8)
    expect(n('B2')).toBeGreaterThanOrEqual(6)
    expect(DIRECTION_ASSEMBLY.filter(i => (i.variants ?? []).length > 0).length).toBeGreaterThanOrEqual(6)
    expect(DIRECTION_ASSEMBLY.filter(i => i.punctuation === '?').length).toBeGreaterThanOrEqual(3)
  })
})
