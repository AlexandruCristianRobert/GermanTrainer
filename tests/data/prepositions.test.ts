import { describe, test, expect } from 'vitest'
import {
  PREPOSITIONS,
  PREPOSITION_CASES,
  PREPOSITION_LEVELS,
  TWO_WAY_PREPS
} from '../../src/data/prepositions'

describe('prepositions dataset', () => {
  test('no duplicate ids', () => {
    const ids = PREPOSITIONS.map(p => p.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  test('every preposition has ≥1 example', () => {
    const empty = PREPOSITIONS.filter(p => p.examples.length === 0)
    expect(empty).toEqual([])
  })

  test('every example has a "___" placeholder', () => {
    const offenders: string[] = []
    for (const p of PREPOSITIONS) {
      for (const e of p.examples) {
        if (!e.blanked.includes('___')) offenders.push(`${p.id}: ${e.blanked}`)
      }
    }
    expect(offenders).toEqual([])
  })

  test('every example.expectedAnswer appears verbatim in example.sentence', () => {
    const offenders: string[] = []
    for (const p of PREPOSITIONS) {
      for (const e of p.examples) {
        if (!e.sentence.includes(e.expectedAnswer)) {
          offenders.push(`${p.id}: "${e.expectedAnswer}" not in "${e.sentence}"`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  test('every example.usedCase is one of acc/dat/gen', () => {
    const offenders: string[] = []
    for (const p of PREPOSITIONS) {
      for (const e of p.examples) {
        if (!['accusative', 'dative', 'genitive'].includes(e.usedCase)) {
          offenders.push(`${p.id}: usedCase = ${e.usedCase}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  test('non-two-way prepositions only use their declared case', () => {
    const offenders: string[] = []
    for (const p of PREPOSITIONS) {
      if (p.case === 'two-way') continue
      for (const e of p.examples) {
        if (e.usedCase !== p.case) {
          offenders.push(`${p.id} (${p.case}): example uses ${e.usedCase}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  test('two-way prepositions show ≥1 accusative and ≥1 dative example', () => {
    const offenders: string[] = []
    for (const p of PREPOSITIONS) {
      if (p.case !== 'two-way') continue
      const hasAcc = p.examples.some(e => e.usedCase === 'accusative')
      const hasDat = p.examples.some(e => e.usedCase === 'dative')
      if (!hasAcc) offenders.push(`${p.id}: no accusative example`)
      if (!hasDat) offenders.push(`${p.id}: no dative example`)
    }
    expect(offenders).toEqual([])
  })

  // TWO_WAY_PREPS holds surface German forms (with umlauts) for fast lookup, so we compare against p.german (not p.id, which is ASCII-folded).
  test('TWO_WAY_PREPS set matches the dataset', () => {
    const datasetTwoWay = new Set(PREPOSITIONS.filter(p => p.case === 'two-way').map(p => p.german))
    expect(datasetTwoWay).toEqual(TWO_WAY_PREPS)
  })

  test('every preposition has a valid case + level', () => {
    const validCases = new Set<string>(PREPOSITION_CASES)
    const validLevels = new Set<string>(PREPOSITION_LEVELS)
    for (const p of PREPOSITIONS) {
      expect(validCases.has(p.case), `${p.id}: bad case ${p.case}`).toBe(true)
      expect(validLevels.has(p.level), `${p.id}: bad level ${p.level}`).toBe(true)
    }
  })

  test('no duplicate example sentences across the whole dataset', () => {
    const counts = new Map<string, number>()
    for (const p of PREPOSITIONS) {
      for (const e of p.examples) {
        const key = e.sentence.trim()
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }
    const dupes = [...counts.entries()].filter(([, n]) => n > 1).map(([s]) => s)
    expect(dupes).toEqual([])
  })

  test('the two-way decision drill has at least 400 examples', () => {
    const twoWay = PREPOSITIONS
      .filter(p => p.case === 'two-way')
      .reduce((n, p) => n + p.examples.length, 0)
    expect(twoWay).toBeGreaterThanOrEqual(400)
  })
})
