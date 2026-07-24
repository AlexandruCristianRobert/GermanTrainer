import { describe, test, expect } from 'vitest'
import { DA_REGISTER, type RegisterItem } from '../../src/data/daRegister'

const LEVELS = new Set(['B1', 'B2', 'C1'])
const VERDICTS: RegisterItem['verdict'][] = ['standard', 'spoken', 'wrong']

describe('DA_REGISTER invariants', () => {
  test('at least 36 items with unique ids', () => {
    expect(DA_REGISTER.length).toBeGreaterThanOrEqual(36)
    expect(new Set(DA_REGISTER.map(i => i.id)).size).toBe(DA_REGISTER.length)
  })

  test('ids follow the rg-<n> convention', () => {
    const bad = DA_REGISTER.filter(i => !/^rg-\d+$/.test(i.id))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('verdict floors: >=10 of each of standard | spoken | wrong', () => {
    for (const v of VERDICTS) {
      const n = DA_REGISTER.filter(i => i.verdict === v).length
      expect(n, `verdict ${v}`).toBeGreaterThanOrEqual(10)
    }
  })

  test('verdict is one of the three known values', () => {
    const bad = DA_REGISTER.filter(i => !VERDICTS.includes(i.verdict))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('phrases are unique', () => {
    const phrases = DA_REGISTER.map(i => i.phrase)
    expect(new Set(phrases).size).toBe(phrases.length)
  })

  test('no phrase carries an asterisk — the error is shown raw', () => {
    const bad = DA_REGISTER.filter(i => i.phrase.includes('*'))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every explanation is a non-empty teaching line', () => {
    const bad = DA_REGISTER.filter(i => !i.explanation || i.explanation.trim().length < 12)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('level is a valid CollocationLevel', () => {
    const bad = DA_REGISTER.filter(i => !LEVELS.has(i.level))
    expect(bad.map(i => i.id)).toEqual([])
  })
})
