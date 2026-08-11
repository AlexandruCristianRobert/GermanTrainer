import { describe, test, expect } from 'vitest'
import {
  DITRANSITIVE_ITEMS, OBJECT_ORDER_ITEMS, OBJECT_PRONOUNS, objectOrderAnswer,
} from '../../src/data/dativeDitransitive'
import { DATIVE_DRILL_LEVELS } from '../../src/data/dativeExperiencer'
import { VERBS } from '../../src/data/verbs'

const byGerman = new Map(VERBS.map(v => [v.german, v]))
const isPronoun = (phrase: string) => (OBJECT_PRONOUNS as readonly string[]).includes(phrase)

describe('DITRANSITIVE_ITEMS (T7)', () => {
  test('base: unique ids, known level, one gap, translation present', () => {
    expect(new Set(DITRANSITIVE_ITEMS.map(i => i.id)).size).toBe(DITRANSITIVE_ITEMS.length)
    const bad = DITRANSITIVE_ITEMS.filter(i =>
      !(DATIVE_DRILL_LEVELS as readonly string[]).includes(i.level)
      || (i.prompt.match(/___/g) ?? []).length !== 1
      || i.translation.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('cross-ref: every verb carries case dative+accusative in VERBS', () => {
    const bad = DITRANSITIVE_ITEMS.filter(i => byGerman.get(i.verb)?.case !== 'dative+accusative')
    expect(bad.map(i => `${i.id}:${i.verb}`)).toEqual([])
  })

  test('options: 2 unique, exactly one answer', () => {
    const bad = DITRANSITIVE_ITEMS.filter(i =>
      i.options.length !== 2 || new Set(i.options).size !== 2
      || i.answers.length !== 1 || i.options.filter(o => i.answers.includes(o)).length !== 1)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥24 total, ≥12 dative gaps, ≥8 accusative gaps, ≥15 distinct verbs', () => {
    expect(DITRANSITIVE_ITEMS.length).toBeGreaterThanOrEqual(24)
    expect(DITRANSITIVE_ITEMS.filter(i => i.gapRole === 'dative').length).toBeGreaterThanOrEqual(12)
    expect(DITRANSITIVE_ITEMS.filter(i => i.gapRole === 'accusative').length).toBeGreaterThanOrEqual(8)
    expect(new Set(DITRANSITIVE_ITEMS.map(i => i.verb)).size).toBeGreaterThanOrEqual(15)
  })
})

describe('OBJECT_ORDER_ITEMS (T8)', () => {
  test('base: unique ids, known level, verb is dative+accusative', () => {
    expect(new Set(OBJECT_ORDER_ITEMS.map(i => i.id)).size).toBe(OBJECT_ORDER_ITEMS.length)
    const bad = OBJECT_ORDER_ITEMS.filter(i =>
      !(DATIVE_DRILL_LEVELS as readonly string[]).includes(i.level)
      || byGerman.get(i.verb)?.case !== 'dative+accusative')
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('OBJECT-ORDER GATE: kind matches the phrases, and the derived answer obeys the rule', () => {
    const bad = OBJECT_ORDER_ITEMS.filter(i => {
      const datPro = isPronoun(i.datPhrase)
      const akkPro = isPronoun(i.akkPhrase)
      if (i.kind === 'pp' && !(datPro && akkPro)) return true
      if (i.kind === 'nn' && (datPro || akkPro)) return true
      if (i.kind === 'mixed') {
        if (datPro === akkPro) return true
        const pronounIs = datPro ? 'dative' : 'accusative'
        if (i.pronounRole !== pronounIs) return true
      }
      // Rule: AKK first iff both pronouns, or the single pronoun is accusative.
      const akkFirst = i.kind === 'pp' || (i.kind === 'mixed' && i.pronounRole === 'accusative')
      const expected = akkFirst ? `${i.akkPhrase} ${i.datPhrase}` : `${i.datPhrase} ${i.akkPhrase}`
      return objectOrderAnswer(i) !== expected
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥20 total, ≥6 per kind', () => {
    expect(OBJECT_ORDER_ITEMS.length).toBeGreaterThanOrEqual(20)
    for (const k of ['nn', 'pp', 'mixed'] as const) {
      expect(OBJECT_ORDER_ITEMS.filter(i => i.kind === k).length, `kind ${k}`).toBeGreaterThanOrEqual(6)
    }
  })
})
