import { describe, test, expect } from 'vitest'
import { DIRECTION_REGISTER } from '../../src/data/directionRegister'
import { DIRECTION_LEVELS } from '../../src/data/directionWords'

const R_FORM = /\b(rein|raus|rauf|runter|rüber)\b/i

describe('DIRECTION_REGISTER invariants', () => {
  test('unique ids, valid levels, non-empty fields', () => {
    expect(new Set(DIRECTION_REGISTER.map(i => i.id)).size).toBe(DIRECTION_REGISTER.length)
    const bad = DIRECTION_REGISTER.filter(i =>
      !(DIRECTION_LEVELS as readonly string[]).includes(i.level)
      || i.phrase.trim().length === 0 || i.explanation.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('explanations carry German / English halves', () => {
    const bad = DIRECTION_REGISTER.filter(i => !i.explanation.includes(' / '))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('standard phrases contain no r-forms', () => {
    const bad = DIRECTION_REGISTER.filter(i => i.verdict === 'standard' && R_FORM.test(i.phrase))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('spoken phrases contain an r-form or a wo…hin/her split', () => {
    const bad = DIRECTION_REGISTER.filter(i =>
      i.verdict === 'spoken'
      && !R_FORM.test(i.phrase)
      && !/\bwo\b.*\b(hin|her|lang|durch)\b/i.test(i.phrase))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every wrong item names a corrected form in double quotes (English half)', () => {
    const bad = DIRECTION_REGISTER.filter(i => {
      if (i.verdict !== 'wrong') return false
      const en = i.explanation.split(' / ')[1] ?? ''
      return ![...en.matchAll(/"([^"]+)"/g)].length
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('pair is a real element or null; spoken r-form items always carry a pair; each r-form pair ≥3 items', () => {
    const ELEMENTS = ['ein', 'aus', 'auf', 'unter', 'über', 'ab']
    const bad = DIRECTION_REGISTER.filter(i =>
      (i.pair !== null && !ELEMENTS.includes(i.pair))
      || (i.verdict === 'spoken' && R_FORM.test(i.phrase) && i.pair === null))
    expect(bad.map(i => i.id)).toEqual([])
    for (const el of ['ein', 'aus', 'auf', 'unter', 'über'])
      expect(DIRECTION_REGISTER.filter(i => i.pair === el).length, el).toBeGreaterThanOrEqual(3)
  })

  test('floors: ≥36 total; ≥12 per verdict; levels A2≥6, B1≥10, B2≥8, C1≥4', () => {
    expect(DIRECTION_REGISTER.length).toBeGreaterThanOrEqual(36)
    for (const v of ['standard', 'spoken', 'wrong'] as const)
      expect(DIRECTION_REGISTER.filter(i => i.verdict === v).length, v).toBeGreaterThanOrEqual(12)
    const n = (l: string) => DIRECTION_REGISTER.filter(i => i.level === l).length
    expect(n('A2')).toBeGreaterThanOrEqual(6)
    expect(n('B1')).toBeGreaterThanOrEqual(10)
    expect(n('B2')).toBeGreaterThanOrEqual(8)
    expect(n('C1')).toBeGreaterThanOrEqual(4)
  })
})
