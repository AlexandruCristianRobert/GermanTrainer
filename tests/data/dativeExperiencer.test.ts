import { describe, test, expect } from 'vitest'
import {
  DATIVE_DRILL_LEVELS, EXPERIENCER_VERBS,
  EXPERIENCER_SUBJECT_ITEMS, EXPERIENCER_PRODUCTION_ITEMS,
} from '../../src/data/dativeExperiencer'
import { VERBS } from '../../src/data/verbs'

const byGerman = new Map(VERBS.map(v => [v.german, v]))

/** Two-sided word-boundary containment that respects umlauts (JS \b is ASCII-only). */
function containsWord(text: string, word: string): boolean {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-zäöüß])${esc}($|[^a-zäöüß])`, 'i').test(text)
}

function expectedFinite(verb: string, num: 'sg' | 'pl'): string | undefined {
  const v = byGerman.get(verb)
  return num === 'pl' ? v?.praesens[5] : v?.praesens[2]
}

/** Verbs tagged `varies` in verbs.ts whose *dative* sense this bank drills.
 *  `stehen` is the pool's posture verb ("Upright and still.") and governs no
 *  object in that reading, so phase 1 tagged it `varies` rather than `dative` —
 *  a flat dative tag would make the Rektion drill mark "Kein Objekt" wrong for
 *  the sense learners meet first (`glauben` is the same case). Its *suit*
 *  reading — "Das Kleid steht dir" — is a genuine inverted experiencer and
 *  belongs here. Allowlisted by name, never a blanket `varies` pass, so a
 *  mis-tagged accusative verb still fails this gate. `stehen` is deliberately
 *  not a DATIVE_VERBS key, so it is not a ledger item and bumping it no-ops. */
const VARIES_WITH_DATIVE_SENSE: readonly string[] = ['stehen']

function governsDative(verb: string): boolean {
  const c = byGerman.get(verb)?.case
  if (c === 'dative') return true
  return c === 'varies' && VARIES_WITH_DATIVE_SENSE.includes(verb)
}

function baseChecks(items: { id: string; level: string }[]) {
  expect(new Set(items.map(i => i.id)).size).toBe(items.length)
  const bad = items.filter(i => !(DATIVE_DRILL_LEVELS as readonly string[]).includes(i.level))
  expect(bad.map(i => i.id)).toEqual([])
}

describe('EXPERIENCER_SUBJECT_ITEMS (T4)', () => {
  test('base invariants', () => baseChecks(EXPERIENCER_SUBJECT_ITEMS))

  test('cross-ref: every verb governs dative (allowlisting the varies tag on stehen)', () => {
    const bad = EXPERIENCER_SUBJECT_ITEMS.filter(i => !governsDative(i.verb))
    expect(bad.map(i => `${i.id}:${i.verb}`)).toEqual([])
  })

  test('EXPERIENCER GATE: finiteVerb IS the praesens form agreeing with the thing-subject', () => {
    const bad = EXPERIENCER_SUBJECT_ITEMS.filter(i => i.finiteVerb !== expectedFinite(i.verb, i.subjectNumber))
    expect(bad.map(i => `${i.id}: ${i.finiteVerb} ≠ ${expectedFinite(i.verb, i.subjectNumber)}`)).toEqual([])
  })

  test('subject kind: answer IS the subject NP; the sentence carries the agreeing finite verb', () => {
    const bad = EXPERIENCER_SUBJECT_ITEMS.filter(i => i.kind === 'subject' && (
      i.answers.length !== 1
      || i.answers[0] !== i.subject
      || !i.options.includes(i.subject)
      || i.options.length < 2
      || new Set(i.options).size !== i.options.length
      || !i.finiteVerb.split(' ').every(tok => containsWord(i.sentence, tok))
    ))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('agreement kind: options are exactly the sg/pl finite tokens; answer matches the number; no leak', () => {
    const bad = EXPERIENCER_SUBJECT_ITEMS.filter(i => {
      if (i.kind !== 'agreement') return false
      const sg = expectedFinite(i.verb, 'sg')?.split(' ')[0]
      const pl = expectedFinite(i.verb, 'pl')?.split(' ')[0]
      if (!sg || !pl) return true
      const optSet = new Set(i.options)
      return !((i.sentence.match(/___/g) ?? []).length === 1
        && optSet.size === 2 && optSet.has(sg) && optSet.has(pl)
        && i.answers.length === 1
        && i.answers[0] === i.finiteVerb.split(' ')[0]
        && !containsWord(i.sentence, i.answers[0]))
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥20 total, ≥10 subject kind, ≥8 agreement kind, ≥10 per subject number', () => {
    expect(EXPERIENCER_SUBJECT_ITEMS.length).toBeGreaterThanOrEqual(20)
    expect(EXPERIENCER_SUBJECT_ITEMS.filter(i => i.kind === 'subject').length).toBeGreaterThanOrEqual(10)
    expect(EXPERIENCER_SUBJECT_ITEMS.filter(i => i.kind === 'agreement').length).toBeGreaterThanOrEqual(8)
    expect(EXPERIENCER_SUBJECT_ITEMS.filter(i => i.subjectNumber === 'pl').length).toBeGreaterThanOrEqual(10)
    expect(EXPERIENCER_SUBJECT_ITEMS.filter(i => i.subjectNumber === 'sg').length).toBeGreaterThanOrEqual(10)
  })
})

describe('EXPERIENCER_PRODUCTION_ITEMS (T5)', () => {
  test('base invariants', () => baseChecks(EXPERIENCER_PRODUCTION_ITEMS))

  test('cross-ref: every verb governs dative', () => {
    const bad = EXPERIENCER_PRODUCTION_ITEMS.filter(i => !governsDative(i.verb))
    expect(bad.map(i => `${i.id}:${i.verb}`)).toEqual([])
  })

  test('EXPERIENCER GATE: finiteVerb agrees with the thing-subject in number', () => {
    const bad = EXPERIENCER_PRODUCTION_ITEMS.filter(i => i.finiteVerb !== expectedFinite(i.verb, i.subjectNumber))
    expect(bad.map(i => `${i.id}: ${i.finiteVerb} ≠ ${expectedFinite(i.verb, i.subjectNumber)}`)).toEqual([])
  })

  test('every accepted answer contains the agreeing finite tokens AND the subject NP', () => {
    const bad = EXPERIENCER_PRODUCTION_ITEMS.filter(i =>
      i.answers.length < 1
      || !i.answers.every(a =>
        i.finiteVerb.split(' ').every(tok => containsWord(a, tok)) && containsWord(a, i.subject)))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥20 total, ≥8 plural subjects, each of the nine verbs ≥2 items', () => {
    expect(EXPERIENCER_PRODUCTION_ITEMS.length).toBeGreaterThanOrEqual(20)
    expect(EXPERIENCER_PRODUCTION_ITEMS.filter(i => i.subjectNumber === 'pl').length).toBeGreaterThanOrEqual(8)
    for (const v of EXPERIENCER_VERBS) {
      const n = EXPERIENCER_PRODUCTION_ITEMS.filter(i => i.verb === v).length
      expect(n, `verb ${v}`).toBeGreaterThanOrEqual(2)
    }
  })
})
