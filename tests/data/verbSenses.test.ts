import { describe, test, expect } from 'vitest'
import { VERBS } from '../../src/data/verbs'
import {
  VERB_SENSES,
  normalizeMeaning,
  englishAlternativesOf,
  buildMeaningMembers,
  senseLookup
} from '../../src/data/verb-senses'

const members = buildMeaningMembers(VERBS)
const ambiguous = [...members.entries()].filter(([, list]) => list.length > 1)
const lookup = senseLookup(VERB_SENSES)

describe('verb senses dataset', () => {
  test('meaning keys are normalized and unique', () => {
    const seen = new Set<string>()
    for (const m of VERB_SENSES) {
      expect(m.meaning, `not normalized: "${m.meaning}"`).toBe(normalizeMeaning(m.meaning))
      expect(seen.has(m.meaning), `duplicate meaning: ${m.meaning}`).toBe(false)
      seen.add(m.meaning)
    }
  })

  test('every entry belongs to a genuinely ambiguous meaning', () => {
    const offenders = VERB_SENSES
      .filter(m => (members.get(m.meaning) ?? []).length < 2)
      .map(m => m.meaning)
    expect(offenders).toEqual([])
  })

  test('cues are English-shaped: non-empty, no parens, no slashes, ≤80 chars, unique per meaning', () => {
    for (const m of VERB_SENSES) {
      const seen = new Set<string>()
      for (const s of m.senses) {
        expect(s.cue.trim().length, `${m.meaning}: empty cue`).toBeGreaterThan(0)
        expect(s.cue, `${m.meaning}: cue has parens`).not.toMatch(/[()]/)
        expect(s.cue, `${m.meaning}: cue has slash`).not.toMatch(/\//)
        expect(s.cue.length, `${m.meaning}: cue too long: ${s.cue}`).toBeLessThanOrEqual(80)
        expect(seen.has(s.cue), `${m.meaning}: duplicate cue "${s.cue}"`).toBe(false)
        seen.add(s.cue)
      }
    }
  })

  test('every sense verb exists and carries the meaning', () => {
    const byGerman = new Map(VERBS.map(v => [v.german, v]))
    for (const m of VERB_SENSES) {
      for (const s of m.senses) {
        expect(s.verbs.length, `${m.meaning}: empty sense`).toBeGreaterThan(0)
        for (const g of s.verbs) {
          const v = byGerman.get(g)
          expect(v, `${m.meaning}: unknown verb ${g}`).toBeTruthy()
          expect(
            englishAlternativesOf(v!.english).includes(m.meaning),
            `${m.meaning}: ${g} does not carry this meaning`
          ).toBe(true)
        }
      }
    }
  })

  test('COVERAGE: every ambiguous meaning has an entry whose senses cover every member', () => {
    const gaps: string[] = []
    for (const [meaning, germanList] of ambiguous) {
      const entry = lookup.get(meaning)
      if (!entry) { gaps.push(`${meaning} (no entry; members: ${germanList.join(', ')})`); continue }
      const covered = new Set(entry.senses.flatMap(s => [...s.verbs]))
      const missing = germanList.filter(g => !covered.has(g))
      if (missing.length > 0) gaps.push(`${meaning}: uncovered ${missing.join(', ')}`)
    }
    expect(gaps).toEqual([])
  })
})
