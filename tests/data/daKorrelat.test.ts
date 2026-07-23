import { describe, test, expect } from 'vitest'
import {
  DA_KORRELAT,
  korrelatAnswer,
  type KorrelatItem,
} from '../../src/data/daKorrelat'
import { COLLOCATIONS } from '../../src/data/collocations'
import { daCompound } from '../../src/data/daCompounds'

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

// A clause the Korrelat points forward to: comma + dass/ob/w-word, or a zu-infinitive.
const hasClauseMarker = (s: string) =>
  /,\s*(dass|ob|wie|warum|wann|was|wer|wo|welch)/.test(s) || /,[^,]*\bzu\b\s/.test(s)

describe('DA_KORRELAT invariants', () => {
  test('at least 45 items with unique ids', () => {
    expect(DA_KORRELAT.length).toBeGreaterThanOrEqual(45)
    expect(new Set(DA_KORRELAT.map(i => i.id)).size).toBe(DA_KORRELAT.length)
  })

  test('status floors: >=15 obligatory, >=15 optional, >=12 excluded', () => {
    const count = (s: KorrelatItem['korrelat']) =>
      DA_KORRELAT.filter(i => i.korrelat === s).length
    expect(count('obligatory')).toBeGreaterThanOrEqual(15)
    expect(count('optional')).toBeGreaterThanOrEqual(15)
    expect(count('excluded')).toBeGreaterThanOrEqual(12)
  })

  test('ids follow the ko-<slug> convention', () => {
    const bad = DA_KORRELAT.filter(i => !/^ko-[a-z0-9-]+$/.test(i.id))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('non-excluded carry exactly one of collocationId|preposition; excluded carry neither', () => {
    const bad = DA_KORRELAT.filter(i => {
      const hasColl = i.collocationId != null
      const hasPrep = i.preposition != null
      if (i.korrelat === 'excluded') return hasColl || hasPrep
      return hasColl === hasPrep // must differ: exactly one
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every collocationId joins a real collocation and matches its level', () => {
    const bad = DA_KORRELAT.filter(
      i =>
        i.collocationId != null &&
        (!byId.has(i.collocationId) || byId.get(i.collocationId)!.level !== i.level),
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every sentence has exactly one gap and a following clause marker', () => {
    const bad = DA_KORRELAT.filter(
      i => (i.sentence.match(/___/g) ?? []).length !== 1 || !hasClauseMarker(i.sentence),
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('no sentence leaks its own derived compound', () => {
    const bad = DA_KORRELAT.filter(i => {
      const a = korrelatAnswer(i)
      return a != null && i.sentence.toLowerCase().includes(a.toLowerCase())
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every explanation is a non-empty teaching line', () => {
    const bad = DA_KORRELAT.filter(i => !i.explanation || i.explanation.trim().length < 10)
    expect(bad.map(i => i.id)).toEqual([])
  })
})

describe('korrelatAnswer', () => {
  test('excluded items answer null; obligatory/optional answer the da-compound', () => {
    for (const item of DA_KORRELAT) {
      if (item.korrelat === 'excluded') {
        expect(korrelatAnswer(item)).toBeNull()
      } else {
        const prep = item.preposition ?? byId.get(item.collocationId!)!.preposition
        expect(korrelatAnswer(item)).toBe(daCompound(prep))
      }
    }
  })

  test('spot check: bestehen (auf) -> darauf', () => {
    const item = DA_KORRELAT.find(i => i.collocationId === 'bestehen-auf')!
    expect(korrelatAnswer(item)).toBe('darauf')
  })

  test('spot check: an excluded item (wissen) -> null', () => {
    const item = DA_KORRELAT.find(i => i.id === 'ko-wissen')!
    expect(korrelatAnswer(item)).toBeNull()
  })

  test('spot check: an explicit-preposition item derives from its own prep', () => {
    const item = DA_KORRELAT.find(i => i.preposition != null)!
    expect(korrelatAnswer(item)).toBe(daCompound(item.preposition!))
  })

  test('throws on a non-excluded item with an unknown collocationId', () => {
    expect(() =>
      korrelatAnswer({
        id: 'ko-x', korrelat: 'obligatory', collocationId: 'does-not-exist',
        sentence: 'Er ___, dass', explanation: 'x', level: 'B1',
      } as KorrelatItem),
    ).toThrow()
  })
})
