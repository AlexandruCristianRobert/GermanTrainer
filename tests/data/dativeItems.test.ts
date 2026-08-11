import { describe, test, expect } from 'vitest'
import { VERBS } from '../../src/data/verbs'
import { DATIVE_VERBS, DATIVE_VERB_KEYS, dativeVerbsBy } from '../../src/data/dativeVerbs'
import {
  DATIVE_ITEM_LEVELS, T1_CASE_ITEMS, T2_FORM_ITEMS, T3_TRAP_ITEMS,
} from '../../src/data/dativeItems'

const byGerman = new Map(VERBS.map(v => [v.german, v]))
const FAMILIES = ['recipient', 'experiencer', 'co-agent'] as const

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Answer-leak gate: the sentence never contains the expected form as a standalone run. */
function leaks(sentence: string, answer: string): boolean {
  return new RegExp(`(^|[^a-zäöüß])${escapeRe(answer)}($|[^a-zäöüß])`, 'i').test(sentence)
}

function baseChecks(items: readonly { id: string; level: string }[]) {
  expect(new Set(items.map(i => i.id)).size).toBe(items.length)
  const bad = items.filter(i => !(DATIVE_ITEM_LEVELS as readonly string[]).includes(i.level))
  expect(bad.map(i => i.id)).toEqual([])
}

describe('T1_CASE_ITEMS (Dativ oder Akkusativ?)', () => {
  test('base invariants', () => baseChecks(T1_CASE_ITEMS))

  test('CORRECTNESS GATE: dative items are DATIVE_VERBS keys; accusative items carry case "accusative" in VERBS', () => {
    const bad = T1_CASE_ITEMS.filter(i => i.answer === 'dative'
      ? !(i.verb in DATIVE_VERBS)
      : byGerman.get(i.verb)?.case !== 'accusative')
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥30 total, ≥10 accusative distractors, ≥1 per semantic family', () => {
    expect(T1_CASE_ITEMS.length).toBeGreaterThanOrEqual(30)
    expect(T1_CASE_ITEMS.filter(i => i.answer === 'accusative').length).toBeGreaterThanOrEqual(10)
    for (const fam of FAMILIES) {
      const n = T1_CASE_ITEMS.filter(i => i.answer === 'dative' && DATIVE_VERBS[i.verb].family === fam).length
      expect(n, fam).toBeGreaterThanOrEqual(1)
    }
  })

  test('T1 covers every DATIVE_VERBS key (membership drill = the whole bank)', () => {
    const covered = new Set(T1_CASE_ITEMS.filter(i => i.answer === 'dative').map(i => i.verb))
    const missing = DATIVE_VERB_KEYS.filter(k => !covered.has(k))
    expect(missing).toEqual([])
  })
})

describe('T2_FORM_ITEMS (Verb → Dativobjekt)', () => {
  test('base invariants', () => baseChecks(T2_FORM_ITEMS))

  test('cross-refs and shape: verb is a DATIVE_VERBS key, exactly one gap, cue + translation + answers present', () => {
    const bad = T2_FORM_ITEMS.filter(i =>
      !(i.verb in DATIVE_VERBS)
      || (i.sentence.match(/___/g) ?? []).length !== 1
      || i.cue.trim().length === 0
      || i.translation.trim().length === 0
      || i.answers.length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('NO ANSWER LEAK: the sentence never contains an expected form', () => {
    const bad = T2_FORM_ITEMS.filter(i => i.answers.some(a => leaks(i.sentence, a)))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥30 total, ≥1 per semantic family', () => {
    expect(T2_FORM_ITEMS.length).toBeGreaterThanOrEqual(30)
    for (const fam of FAMILIES) {
      expect(T2_FORM_ITEMS.filter(i => DATIVE_VERBS[i.verb].family === fam).length, fam).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('T3_TRAP_ITEMS (Fallen-Karten)', () => {
  test('base invariants', () => baseChecks(T3_TRAP_ITEMS))

  test('cross-refs: verb is a DATIVE_VERBS key flagged englishPull, exactly one gap, english present', () => {
    const bad = T3_TRAP_ITEMS.filter(i =>
      DATIVE_VERBS[i.verb]?.englishPull !== true
      || (i.sentence.match(/___/g) ?? []).length !== 1
      || i.english.trim().length === 0
      || i.answers.length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('NO ANSWER LEAK: the sentence never contains an expected form', () => {
    const bad = T3_TRAP_ITEMS.filter(i => i.answers.some(a => leaks(i.sentence, a)))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥20 total, ≥1 per semantic family', () => {
    expect(T3_TRAP_ITEMS.length).toBeGreaterThanOrEqual(20)
    for (const fam of FAMILIES) {
      expect(T3_TRAP_ITEMS.filter(i => DATIVE_VERBS[i.verb].family === fam).length, fam).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('reachability (spec gate 8, verb half)', () => {
  // Adjective items join the union in phase 3 (T9's bank); the verb half of
  // the ~60-item ledger must already be fully reachable through T1–T3.
  test('every DATIVE_VERBS key appears in at least one drill bank', () => {
    const covered = new Set([
      ...T1_CASE_ITEMS.filter(i => i.answer === 'dative').map(i => i.verb),
      ...T2_FORM_ITEMS.map(i => i.verb),
      ...T3_TRAP_ITEMS.map(i => i.verb),
    ])
    const missing = DATIVE_VERB_KEYS.filter(k => !covered.has(k))
    expect(missing).toEqual([])
  })

  test('family helper sanity: the three families partition the keys', () => {
    const sum = FAMILIES.reduce((s, f) => s + dativeVerbsBy(f).length, 0)
    expect(sum).toBe(DATIVE_VERB_KEYS.length)
  })
})
