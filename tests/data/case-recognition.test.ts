import { describe, test, expect } from 'vitest'
import { CASE_RECOGNITION_ENTRIES } from '../../src/data/case-recognition'
import { DECL_CASES, DECL_LEVELS } from '../../src/data/declension'

describe('case-recognition entries', () => {
  test('unique ids', () => {
    const ids = CASE_RECOGNITION_ENTRIES.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('phrase appears verbatim in sentence', () => {
    for (const e of CASE_RECOGNITION_ENTRIES) {
      expect(e.sentence.includes(e.phrase),
        `${e.id}: "${e.phrase}" not in "${e.sentence}"`).toBe(true)
    }
  })

  test('phrase appears exactly once in sentence', () => {
    for (const e of CASE_RECOGNITION_ENTRIES) {
      const count = e.sentence.split(e.phrase).length - 1
      expect(count, `${e.id}: "${e.phrase}" appears ${count}x in "${e.sentence}"`).toBe(1)
    }
  })

  test('rationale is non-empty', () => {
    for (const e of CASE_RECOGNITION_ENTRIES) {
      expect(e.rationale.trim().length,
        `${e.id}: empty rationale`).toBeGreaterThan(0)
    }
  })

  test('valid enum values', () => {
    const cases = new Set<string>(DECL_CASES)
    const levels = new Set<string>(DECL_LEVELS)
    for (const e of CASE_RECOGNITION_ENTRIES) {
      expect(cases.has(e.case), `${e.id}: bad case ${e.case}`).toBe(true)
      expect(levels.has(e.level), `${e.id}: bad level ${e.level}`).toBe(true)
    }
  })

  test('expected dataset size', () => {
    expect(CASE_RECOGNITION_ENTRIES.length).toBe(40)
  })
})
