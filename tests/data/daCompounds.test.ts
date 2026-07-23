import { describe, test, expect } from 'vitest'
import {
  daCompound, woCompound, isVowelInitial, canFormCompound,
  DA_COMPOUND_PREPOSITIONS, NO_COMPOUND_PREPOSITIONS,
  THING_VS_PERSON, KORRELAT,
} from '../../src/data/daCompounds'
import { COLLOCATIONS } from '../../src/data/collocations'

describe('formation transform', () => {
  test('da- before consonant-initial prepositions', () => {
    expect(daCompound('für')).toBe('dafür')
    expect(daCompound('mit')).toBe('damit')
    expect(daCompound('von')).toBe('davon')
    expect(daCompound('zu')).toBe('dazu')
  })

  test('dar- before vowel-initial prepositions (incl. umlauts)', () => {
    expect(daCompound('an')).toBe('daran')
    expect(daCompound('auf')).toBe('darauf')
    expect(daCompound('über')).toBe('darüber')
    expect(daCompound('in')).toBe('darin')
    expect(daCompound('um')).toBe('darum')
    expect(daCompound('aus')).toBe('daraus')
    expect(daCompound('unter')).toBe('darunter')
  })

  test('wo-/wor- mirrors the same rule', () => {
    expect(woCompound('für')).toBe('wofür')
    expect(woCompound('nach')).toBe('wonach')
    expect(woCompound('an')).toBe('woran')
    expect(woCompound('auf')).toBe('worauf')
    expect(woCompound('über')).toBe('worüber')
  })

  test('isVowelInitial counts umlauts as vowels', () => {
    expect(isVowelInitial('über')).toBe(true)
    expect(isVowelInitial('an')).toBe(true)
    expect(isVowelInitial('für')).toBe(false)
  })
})

describe('compound table', () => {
  test('no duplicate prepositions', () => {
    const preps = DA_COMPOUND_PREPOSITIONS.map(e => e.preposition)
    expect(new Set(preps).size).toBe(preps.length)
  })

  test('every entry can form a compound and has a gloss', () => {
    const offenders = DA_COMPOUND_PREPOSITIONS.filter(
      e => !canFormCompound(e.preposition) || e.gloss.trim().length === 0
    )
    expect(offenders).toEqual([])
  })

  test('table and trap list are disjoint', () => {
    const table = new Set(DA_COMPOUND_PREPOSITIONS.map(e => e.preposition))
    expect(NO_COMPOUND_PREPOSITIONS.filter(p => table.has(p))).toEqual([])
  })

  test('no-compound prepositions refuse the transform', () => {
    for (const p of NO_COMPOUND_PREPOSITIONS) expect(canFormCompound(p)).toBe(false)
  })

  test('every primary collocation preposition is compoundable (data-drift guard)', () => {
    const primaries = Array.from(new Set(COLLOCATIONS.map(c => c.preposition)))
    const table = new Set(DA_COMPOUND_PREPOSITIONS.map(e => e.preposition))
    expect(primaries.filter(p => !table.has(p))).toEqual([])
  })
})

describe('cheatsheet content', () => {
  test('things-vs-people pairs: thing answer uses a da-compound, person answer does not', () => {
    expect(THING_VS_PERSON.length).toBeGreaterThanOrEqual(3)
    for (const pair of THING_VS_PERSON) {
      expect(pair.thingA).toMatch(/\bda(r)?(an|auf|aus|bei|durch|für|gegen|hinter|in|mit|nach|neben|über|um|unter|von|vor|zu|zwischen)\b/i)
      expect(pair.personA).not.toMatch(/\bda(r)?(an|auf|über|von|mit|für|um|nach|zu)\w*\b/i)
    }
  })

  test('Korrelat lists are populated and examples are non-empty', () => {
    expect(KORRELAT.obligatory.length).toBeGreaterThanOrEqual(4)
    expect(KORRELAT.optional.length).toBeGreaterThanOrEqual(4)
    expect(KORRELAT.excluded.length).toBeGreaterThanOrEqual(3)
    for (const list of [KORRELAT.obligatory, KORRELAT.optional, KORRELAT.excluded])
      for (const e of list) {
        expect(e.expression.trim().length).toBeGreaterThan(0)
        expect(e.example.trim().length).toBeGreaterThan(0)
      }
  })

  test('every obligatory Korrelat example actually contains a da-compound', () => {
    for (const e of KORRELAT.obligatory) expect(e.example).toMatch(/\bda(r)?\w+/)
  })
})
