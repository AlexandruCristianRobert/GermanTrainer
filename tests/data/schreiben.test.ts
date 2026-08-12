import { describe, test, expect } from 'vitest'
import {
  SCHREIBEN_MIN_WORDS, SCHREIBEN_TARGET_WORDS, SCHREIBEN_COMFORT_MAX_WORDS,
  SCHREIBEN_TIME_BUDGET_SECONDS, schreibenWordBand, schreibenClock, emptySchreibPlan
} from '../../src/data/schreiben'

describe('schreiben core constants', () => {
  test('exam constants', () => {
    expect(SCHREIBEN_MIN_WORDS).toBe(150)
    expect(SCHREIBEN_TARGET_WORDS).toBe(180)
    expect(SCHREIBEN_COMFORT_MAX_WORDS).toBe(240)
    expect(SCHREIBEN_TIME_BUDGET_SECONDS).toBe(3000)
  })
  test('word band: floor at 150, comfort ceiling at 240', () => {
    expect(schreibenWordBand(0)).toBe('under')
    expect(schreibenWordBand(149)).toBe('under')
    expect(schreibenWordBand(150)).toBe('ok')
    expect(schreibenWordBand(240)).toBe('ok')
    expect(schreibenWordBand(241)).toBe('over')
  })
  test('clock formats past the hour and zero-pads', () => {
    expect(schreibenClock(0)).toBe('0:00')
    expect(schreibenClock(65)).toBe('1:05')
    expect(schreibenClock(3000)).toBe('50:00')
    expect(schreibenClock(3720)).toBe('62:00')
  })
  test('empty plan: four entries, indices 0..3, empty keywords', () => {
    const plan = emptySchreibPlan()
    expect(plan.map(p => p.index)).toEqual([0, 1, 2, 3])
    for (const p of plan) expect(p.keyword).toBe('')
  })
})
