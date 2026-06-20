import { describe, test, expect } from 'vitest'
import {
  COLLOCATIONS,
  COLLOCATION_ROLES,
  COLLOCATION_CASES,
  COLLOCATION_LEVELS
} from '../../src/data/collocations'

/** Escape a string for safe use inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

describe('collocations dataset', () => {
  test('no duplicate ids', () => {
    const ids = COLLOCATIONS.map(c => c.id)
    const seen = new Map<string, number>()
    for (const id of ids) seen.set(id, (seen.get(id) ?? 0) + 1)
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id)
    expect(dupes).toEqual([])
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('no duplicate example sentences across the whole dataset', () => {
    const counts = new Map<string, number>()
    for (const c of COLLOCATIONS) {
      const key = c.example.trim()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const dupes = [...counts.entries()].filter(([, n]) => n > 1).map(([s]) => s)
    expect(dupes).toEqual([])
  })

  test('every entry has a valid role, case and level', () => {
    const validRoles = new Set<string>(COLLOCATION_ROLES)
    const validCases = new Set<string>(COLLOCATION_CASES)
    const validLevels = new Set<string>(COLLOCATION_LEVELS)
    for (const c of COLLOCATIONS) {
      expect(validRoles.has(c.role), `${c.id}: bad role ${c.role}`).toBe(true)
      expect(validCases.has(c.case), `${c.id}: bad case ${c.case}`).toBe(true)
      expect(validLevels.has(c.level), `${c.id}: bad level ${c.level}`).toBe(true)
    }
  })

  test('case is restricted to accusative/dative (no genitive)', () => {
    const offenders = COLLOCATIONS
      .filter(c => c.case !== 'accusative' && c.case !== 'dative')
      .map(c => `${c.id}: ${c.case}`)
    expect(offenders).toEqual([])
  })

  test('preposition is non-empty and lowercase', () => {
    const offenders: string[] = []
    for (const c of COLLOCATIONS) {
      if (c.preposition.trim().length === 0) offenders.push(`${c.id}: empty preposition`)
      else if (c.preposition !== c.preposition.toLowerCase()) {
        offenders.push(`${c.id}: preposition not lowercase "${c.preposition}"`)
      }
    }
    expect(offenders).toEqual([])
  })

  test('word, english and example are non-empty', () => {
    const offenders: string[] = []
    for (const c of COLLOCATIONS) {
      if (c.word.trim().length === 0) offenders.push(`${c.id}: empty word`)
      if (c.english.trim().length === 0) offenders.push(`${c.id}: empty english`)
      if (c.example.trim().length === 0) offenders.push(`${c.id}: empty example`)
    }
    expect(offenders).toEqual([])
  })

  test('example contains the preposition (case-insensitive, word boundary)', () => {
    const offenders: string[] = []
    for (const c of COLLOCATIONS) {
      const re = new RegExp(`(^|[^\\p{L}])${escapeRegExp(c.preposition)}([^\\p{L}]|$)`, 'iu')
      if (!re.test(c.example)) {
        offenders.push(`${c.id}: "${c.preposition}" not found in "${c.example}"`)
      }
    }
    expect(offenders).toEqual([])
  })

  test('reflexive-looking verbs (word starts with "sich ") have role verb', () => {
    const offenders = COLLOCATIONS
      .filter(c => c.word.startsWith('sich ') && c.role !== 'verb')
      .map(c => `${c.id}: role ${c.role}`)
    expect(offenders).toEqual([])
  })

  test('noun entries start with der/die/das', () => {
    const offenders: string[] = []
    for (const c of COLLOCATIONS) {
      if (c.role !== 'noun') continue
      if (!/^(der |die |das )/.test(c.word)) {
        offenders.push(`${c.id}: noun word does not start with article "${c.word}"`)
      }
    }
    expect(offenders).toEqual([])
  })

  test('alternatives, when present, are lowercase non-empty strings', () => {
    const offenders: string[] = []
    for (const c of COLLOCATIONS) {
      if (!c.alternatives) continue
      for (const alt of c.alternatives) {
        if (alt.trim().length === 0) offenders.push(`${c.id}: empty alternative`)
        else if (alt !== alt.toLowerCase()) offenders.push(`${c.id}: alt not lowercase "${alt}"`)
      }
    }
    expect(offenders).toEqual([])
  })

  test('total count is at least 500', () => {
    expect(COLLOCATIONS.length).toBeGreaterThanOrEqual(500)
  })

  test('each role meets a sane minimum', () => {
    const byRole = (role: string) => COLLOCATIONS.filter(c => c.role === role).length
    expect(byRole('verb')).toBeGreaterThanOrEqual(250)
    expect(byRole('adjective')).toBeGreaterThanOrEqual(60)
    expect(byRole('noun')).toBeGreaterThanOrEqual(80)
  })
})
