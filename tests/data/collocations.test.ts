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

/**
 * Standard German preposition+article contractions. An example "contains" its
 * preposition if the bare preposition appears OR any of these contracted forms
 * does, so idiomatic German (am Montag, ins Kino, zum Geburtstag, beim Arzt …)
 * counts the same as the de-contracted form.
 */
const PREP_CONTRACTIONS: Record<string, string[]> = {
  an: ['am', 'ans'],
  in: ['im', 'ins'],
  bei: ['beim'],
  von: ['vom'],
  zu: ['zum', 'zur'],
  auf: ['aufs'],
  für: ['fürs'],
  um: ['ums'],
  über: ['übers'],
  durch: ['durchs'],
  vor: ['vorm', 'vors'],
  hinter: ['hinterm', 'hinters'],
  unter: ['unterm', 'unters']
}

/** Forms (bare preposition + its contractions) that satisfy the example check. */
function prepositionForms(preposition: string): string[] {
  return [preposition, ...(PREP_CONTRACTIONS[preposition] ?? [])]
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

  test('example contains the preposition or a standard contraction (case-insensitive, word boundary)', () => {
    const offenders: string[] = []
    for (const c of COLLOCATIONS) {
      const forms = prepositionForms(c.preposition)
      const found = forms.some(form => {
        const re = new RegExp(`(^|[^\\p{L}])${escapeRegExp(form)}([^\\p{L}]|$)`, 'iu')
        return re.test(c.example)
      })
      if (!found) {
        offenders.push(`${c.id}: "${c.preposition}" (or a contraction) not found in "${c.example}"`)
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

  test('alsoAccept entries are lowercase preps with a valid case, distinct from the primary', () => {
    const validCases = new Set<string>(COLLOCATION_CASES)
    const offenders: string[] = []
    for (const c of COLLOCATIONS) {
      if (!c.alsoAccept) continue
      for (const a of c.alsoAccept) {
        if (a.preposition.trim().length === 0) offenders.push(`${c.id}: empty alsoAccept preposition`)
        else if (a.preposition !== a.preposition.toLowerCase()) offenders.push(`${c.id}: alsoAccept prep not lowercase "${a.preposition}"`)
        if (!validCases.has(a.case)) offenders.push(`${c.id}: alsoAccept bad case ${a.case}`)
        if (a.preposition === c.preposition && a.case === c.case) offenders.push(`${c.id}: alsoAccept duplicates the primary answer`)
      }
    }
    expect(offenders).toEqual([])
  })

  // Deliberately merged 5 interchangeable same-meaning pairs into single cards (v1.11.29),
  // so the count dropped from 504 to 499. Still ~500 curated entries.
  test('total count is at least 495', () => {
    expect(COLLOCATIONS.length).toBeGreaterThanOrEqual(495)
  })

  test('each role meets a sane minimum', () => {
    const byRole = (role: string) => COLLOCATIONS.filter(c => c.role === role).length
    expect(byRole('verb')).toBeGreaterThanOrEqual(250)
    expect(byRole('adjective')).toBeGreaterThanOrEqual(60)
    expect(byRole('noun')).toBeGreaterThanOrEqual(80)
  })

  test('every entry has a non-empty coreIdeaHint', () => {
    const offenders = COLLOCATIONS
      .filter(c => typeof c.coreIdeaHint !== 'string' || c.coreIdeaHint.trim().length === 0)
      .map(c => c.id)
    expect(offenders).toEqual([])
  })

  test('coreIdeaHint is at most 90 characters and 14 words', () => {
    const offenders: string[] = []
    for (const c of COLLOCATIONS) {
      const hint = c.coreIdeaHint ?? ''
      if (hint.length > 90) offenders.push(`${c.id}: ${hint.length} chars > 90`)
      const words = hint.trim().split(/\s+/).filter(Boolean)
      if (words.length > 14) offenders.push(`${c.id}: ${words.length} words > 14`)
    }
    expect(offenders).toEqual([])
  })

  test('coreIdeaHint never names a preposition or case (forbidden tokens, word boundary)', () => {
    // German prepositions + case names must not surface in the English hint (it would
    // give the answer away). Word-boundary, case-insensitive, \p{L}-based.
    // "an" and "in" are deliberately absent: they are ordinary English words.
    const FORBIDDEN = [
      'auf', 'über', 'ueber', 'für', 'fuer', 'gegen', 'nach', 'von', 'mit', 'zu',
      'vor', 'aus', 'bei', 'um', 'unter',
      'akkusativ', 'dativ', 'accusative', 'dative'
    ]
    const offenders: string[] = []
    for (const c of COLLOCATIONS) {
      const hint = c.coreIdeaHint ?? ''
      for (const token of FORBIDDEN) {
        const re = new RegExp(`(^|[^\\p{L}])${escapeRegExp(token)}([^\\p{L}]|$)`, 'iu')
        if (re.test(hint)) offenders.push(`${c.id}: contains "${token}" in "${hint}"`)
      }
    }
    expect(offenders).toEqual([])
  })

  test('no duplicate coreIdeaHint values across the whole dataset', () => {
    const counts = new Map<string, number>()
    for (const c of COLLOCATIONS) {
      const key = (c.coreIdeaHint ?? '').trim()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const dupes = [...counts.entries()].filter(([, n]) => n > 1).map(([s]) => s)
    expect(dupes).toEqual([])
  })

  // ── coreIdeaExplanation — shown AFTER a wrong answer, so it MUST name the answer ──

  test('every entry has a non-empty coreIdeaExplanation', () => {
    const offenders = COLLOCATIONS
      .filter(c => typeof c.coreIdeaExplanation !== 'string' || c.coreIdeaExplanation.trim().length === 0)
      .map(c => c.id)
    expect(offenders).toEqual([])
  })

  test('coreIdeaExplanation is at most 360 characters and 65 words', () => {
    const offenders: string[] = []
    for (const c of COLLOCATIONS) {
      const ex = c.coreIdeaExplanation ?? ''
      if (ex.length > 360) offenders.push(`${c.id}: ${ex.length} chars > 360`)
      const words = ex.trim().split(/\s+/).filter(Boolean)
      if (words.length > 65) offenders.push(`${c.id}: ${words.length} words > 65`)
    }
    expect(offenders).toEqual([])
  })

  test('coreIdeaExplanation names its own preposition (word boundary)', () => {
    const offenders: string[] = []
    for (const c of COLLOCATIONS) {
      const re = new RegExp(`(^|[^\\p{L}])${escapeRegExp(c.preposition)}([^\\p{L}]|$)`, 'iu')
      if (!re.test(c.coreIdeaExplanation ?? '')) {
        offenders.push(`${c.id}: "${c.preposition}" not named in explanation`)
      }
    }
    expect(offenders).toEqual([])
  })

  test('coreIdeaExplanation names the primary case, and only cases that are acceptable', () => {
    const CASE_DE: Record<string, string> = { accusative: 'Akkusativ', dative: 'Dativ' }
    const offenders: string[] = []
    for (const c of COLLOCATIONS) {
      const ex = c.coreIdeaExplanation ?? ''
      // an interchangeable card legitimately names each acceptable answer's case
      const acceptable = new Set<string>([c.case, ...(c.alsoAccept?.map(a => a.case) ?? [])])
      if (!ex.includes(CASE_DE[c.case])) offenders.push(`${c.id}: missing primary ${CASE_DE[c.case]}`)
      for (const k of ['accusative', 'dative']) {
        if (!acceptable.has(k) && ex.includes(CASE_DE[k])) {
          offenders.push(`${c.id}: names non-acceptable case ${CASE_DE[k]}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  test('no duplicate coreIdeaExplanation values across the whole dataset', () => {
    const counts = new Map<string, number>()
    for (const c of COLLOCATIONS) {
      const key = (c.coreIdeaExplanation ?? '').trim()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const dupes = [...counts.entries()].filter(([, n]) => n > 1).map(([s]) => s)
    expect(dupes).toEqual([])
  })
})
