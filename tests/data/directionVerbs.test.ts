import { describe, test, expect } from 'vitest'
import {
  DW_VERB_ENTRIES, DIRECTION_VERBS, verbEntryFor,
} from '../../src/data/directionVerbs'
import { DIRECTION_LEVELS, LEXICALIZED_VERBS } from '../../src/data/directionWords'

const entryByVerb = new Map(DW_VERB_ENTRIES.map(e => [e.verb, e]))

describe('DW_VERB_ENTRIES', () => {
  test('unique verbs, all hin-/her- prefixed, both labels non-empty', () => {
    const verbs = DW_VERB_ENTRIES.map(e => e.verb)
    expect(new Set(verbs).size).toBe(verbs.length)
    const bad = DW_VERB_ENTRIES.filter(e =>
      !/^(hin|her)/.test(e.verb)
      || e.directionalLabel.trim().length === 0
      || e.lexicalizedLabel.trim().length === 0
      || e.directionalLabel === e.lexicalizedLabel)
    expect(bad.map(e => e.verb)).toEqual([])
  })

  test('floors: ≥12 verbs, ≥5 flagged bothReadings', () => {
    expect(DW_VERB_ENTRIES.length).toBeGreaterThanOrEqual(12)
    expect(DW_VERB_ENTRIES.filter(e => e.bothReadings).length).toBeGreaterThanOrEqual(5)
  })
})

describe('DIRECTION_VERBS', () => {
  test('unique ids, valid levels, non-empty explanation with both halves', () => {
    expect(new Set(DIRECTION_VERBS.map(i => i.id)).size).toBe(DIRECTION_VERBS.length)
    const bad = DIRECTION_VERBS.filter(i =>
      !(DIRECTION_LEVELS as readonly string[]).includes(i.level)
      || !i.explanation.includes(' / ')
      || i.sentence.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every item joins a known verb entry', () => {
    const bad = DIRECTION_VERBS.filter(i => !entryByVerb.has(i.verb))
    expect(bad.map(i => i.id)).toEqual([])
    for (const i of DIRECTION_VERBS) expect(verbEntryFor(i).verb).toBe(i.verb)
  })

  test('SURFACE GATE: 1-2 surfaces, each appearing verbatim in the sentence', () => {
    const bad = DIRECTION_VERBS.filter(i =>
      i.surfaces.length < 1 || i.surfaces.length > 2
      || i.surfaces.some(s => s.trim().length === 0 || !i.sentence.includes(s)))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('SURFACE GATE: the surfaces carry the verb prefix', () => {
    // The prefix is the leading hin/her(+element) of the entry's infinitive; some
    // surface must begin with it (split: 'her'; fused: 'herausgefunden').
    const bad = DIRECTION_VERBS.filter(i => {
      const prefix = /^((?:hin|her)(?:ein|aus|auf|unter|über|ab|um|vor|durch|zu)?)/.exec(i.verb)![1]
      return !i.surfaces.some(s => s.toLowerCase().startsWith(prefix.toLowerCase())
        || prefix.toLowerCase().startsWith(s.toLowerCase()))
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('a verb NOT flagged bothReadings contributes only its one reading', () => {
    const offenders: string[] = []
    for (const e of DW_VERB_ENTRIES.filter(e => !e.bothReadings)) {
      const readings = new Set(DIRECTION_VERBS.filter(i => i.verb === e.verb).map(i => i.reading))
      if (readings.size > 1) offenders.push(e.verb)
    }
    expect(offenders).toEqual([])
  })

  test('every bothReadings verb actually contributes BOTH readings', () => {
    const offenders: string[] = []
    for (const e of DW_VERB_ENTRIES.filter(e => e.bothReadings)) {
      const readings = new Set(DIRECTION_VERBS.filter(i => i.verb === e.verb).map(i => i.reading))
      if (readings.size !== 2) offenders.push(e.verb)
    }
    expect(offenders).toEqual([])
  })

  test('floors: ≥32 items, ≥12 per reading; levels B1≥8, B2≥12, C1≥6', () => {
    expect(DIRECTION_VERBS.length).toBeGreaterThanOrEqual(32)
    for (const r of ['directional', 'lexicalized'] as const)
      expect(DIRECTION_VERBS.filter(i => i.reading === r).length, r).toBeGreaterThanOrEqual(12)
    const n = (l: string) => DIRECTION_VERBS.filter(i => i.level === l).length
    expect(n('B1')).toBeGreaterThanOrEqual(8)
    expect(n('B2')).toBeGreaterThanOrEqual(12)
    expect(n('C1')).toBeGreaterThanOrEqual(6)
  })

  test('cheatsheet coverage: every Phase-1 LEXICALIZED_VERBS entry is drilled', () => {
    // The cheatsheet teaches these; the drill must test them (bare infinitive,
    // reflexive/preposition tails stripped, e.g. 'sich herausstellen' -> 'herausstellen').
    const drilled = new Set(DW_VERB_ENTRIES.map(e => e.verb))
    const missing = LEXICALIZED_VERBS
      .map(v => v.verb.replace(/^sich /, '').replace(/ .*$/, ''))
      .filter(v => !drilled.has(v))
    expect(missing).toEqual([])
  })
})
