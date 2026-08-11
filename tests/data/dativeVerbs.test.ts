import { describe, test, expect } from 'vitest'
import { VERBS } from '../../src/data/verbs'
import { DATIVE_VERBS, DATIVE_VERB_KEYS, dativeVerbsBy } from '../../src/data/dativeVerbs'

const byGerman = new Map(VERBS.map(v => [v.german, v]))
const entries = Object.entries(DATIVE_VERBS)

describe('DATIVE_VERBS invariants', () => {
  test('CROSS-REF GATE: every key exists in VERBS.german and carries case "dative" there', () => {
    const bad = DATIVE_VERB_KEYS.filter(k => byGerman.get(k)?.case !== 'dative')
    expect(bad).toEqual([])
  })

  test('TWIN GATE: every twin exists in VERBS.german and its case is NOT dative', () => {
    const bad = entries
      .filter(([, e]) => e.twin !== undefined)
      .filter(([, e]) => {
        const t = byGerman.get(e.twin!)
        return !t || t.case === 'dative'
      })
      .map(([k]) => k)
    expect(bad).toEqual([])
  })

  test('SWALLOWED GATE: swallowed is never set on an entry with experiencer: true', () => {
    const bad = entries
      .filter(([, e]) => e.experiencer === true && e.swallowed !== undefined)
      .map(([k]) => k)
    expect(bad).toEqual([])
  })

  test('HINT CONTRACT: ≤90 chars, ≤14 words, unique, never "Dativ" or a dative form', () => {
    const seen = new Set<string>()
    const forbidden = /\b(dativ|dative|dem|den|ihm|ihnen|mir|dir|euch|uns)\b/i
    const bad = entries.filter(([, e]) => {
      const h = e.coreIdeaHint
      const dupe = seen.has(h)
      seen.add(h)
      return dupe
        || h.length > 90
        || h.trim().split(/\s+/).length > 14
        || forbidden.test(h)
    }).map(([k]) => k)
    expect(bad).toEqual([])
  })

  test('explanations name the verb and the case', () => {
    const bad = entries.filter(([k, e]) =>
      !e.coreIdeaExplanation.includes('Dativ')
      || !e.coreIdeaExplanation.toLowerCase().includes(k.toLowerCase())
    ).map(([k]) => k)
    expect(bad).toEqual([])
  })

  test('experiencer family and experiencer flag agree', () => {
    const bad = entries.filter(([, e]) =>
      (e.family === 'experiencer') !== (e.experiencer === true)
    ).map(([k]) => k)
    expect(bad).toEqual([])
  })

  test('the nine spec trap verbs carry englishPull', () => {
    const traps = ['helfen', 'danken', 'folgen', 'antworten', 'vertrauen',
      'gratulieren', 'zuhören', 'widersprechen', 'ähneln']
    const bad = traps.filter(k => DATIVE_VERBS[k]?.englishPull !== true)
    expect(bad).toEqual([])
  })

  test('keys are frozen, derived, and the bank covers the pool: ≥44 entries, every family populated', () => {
    expect(Object.isFrozen(DATIVE_VERB_KEYS)).toBe(true)
    expect([...DATIVE_VERB_KEYS]).toEqual(Object.keys(DATIVE_VERBS))
    expect(DATIVE_VERB_KEYS.length).toBeGreaterThanOrEqual(44)
    for (const fam of ['recipient', 'experiencer', 'co-agent'] as const) {
      expect(dativeVerbsBy(fam).length, fam).toBeGreaterThan(0)
    }
    const sum = dativeVerbsBy('recipient').length + dativeVerbsBy('experiencer').length + dativeVerbsBy('co-agent').length
    expect(sum).toBe(DATIVE_VERB_KEYS.length)
  })

  test('every pool verb with case dative has a side-table entry', () => {
    const missing = VERBS.filter(v => v.case === 'dative' && !DATIVE_VERBS[v.german]).map(v => v.german)
    expect(missing).toEqual([])
  })
})
