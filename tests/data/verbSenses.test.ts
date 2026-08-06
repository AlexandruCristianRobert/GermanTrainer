import { describe, test, expect } from 'vitest'
import { VERBS } from '../../src/data/verbs'
import {
  VERB_SENSES,
  normalizeMeaning,
  englishAlternativesOf,
  buildMeaningMembers,
  senseLookup
} from '../../src/data/verb-senses'
import { normalizeTranslation } from '../../src/composables/useVerbQuiz'

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

  // checkGermanTranslation's sich-rule accepts a bare verb "X" wherever the
  // headword being graded is "sich X" — that acceptance is IMPLICIT, driven
  // by the grader, not by what's authored in a sense's verbs array. If "X"
  // sits alone in one sense (no "sich X" alongside it) while "sich X" sits
  // alone in a DIFFERENT sense of the same meaning, that other sense's card
  // silently accepts "X" too, even though "X" is authored only for the first
  // sense — an unauthored cross-sense acceptance the dataset must not ship.
  // The fix is always to author the bare verb into the sense that carries its
  // "sich " twin, so the acceptance is explicit there (they need not — and
  // for genuinely different situations, should not — appear in every sense).
  test('SICH-SPLIT: a bare verb and its "sich " twin never sit unaccompanied in two different senses', () => {
    const violations: string[] = []
    for (const m of VERB_SENSES) {
      // For each bare verb X, the senses where X appears WITHOUT "sich X".
      const bareOnly = new Map<string, number[]>()
      // For each bare verb X, the senses where "sich X" appears WITHOUT X.
      const sichOnly = new Map<string, number[]>()
      m.senses.forEach((s, i) => {
        const set = new Set(s.verbs)
        for (const v of s.verbs) {
          if (v.startsWith('sich ')) {
            const bare = v.slice(5)
            if (!set.has(bare)) {
              const arr = sichOnly.get(bare) ?? []
              arr.push(i)
              sichOnly.set(bare, arr)
            }
          } else {
            if (!set.has(`sich ${v}`)) {
              const arr = bareOnly.get(v) ?? []
              arr.push(i)
              bareOnly.set(v, arr)
            }
          }
        }
      })
      for (const [verb, bareIdxs] of bareOnly) {
        const sichIdxs = sichOnly.get(verb)
        if (sichIdxs && sichIdxs.length > 0) {
          violations.push(
            `${m.meaning}: "${verb}" sits alone (no "sich ${verb}") in sense(s) ${bareIdxs.join(',')} `
            + `while "sich ${verb}" sits alone (no bare "${verb}") in sense(s) ${sichIdxs.join(',')} — `
            + `the sich-rule would silently accept "${verb}" for the other sense too`
          )
        }
      }
    }
    expect(violations).toEqual([])
  })

  // Präzise groups meanings via normalizeMeaning; Bedeutungsfeld groups the
  // same English alternatives via the private normalizeTranslation in
  // useVerbQuiz.ts. The two must never drift apart, or a verb could land in
  // different meaning groups depending on which variant is grouping it.
  test('SEAM: normalizeMeaning agrees with useVerbQuiz.normalizeTranslation on every verb alternative', () => {
    for (const v of VERBS) {
      for (const alt of v.english.split('/')) {
        expect(normalizeMeaning(alt), `${v.german}: "${alt}"`).toBe(normalizeTranslation(alt))
      }
    }
  })
})
