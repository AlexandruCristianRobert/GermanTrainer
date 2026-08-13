import { describe, test, expect } from 'vitest'
import {
  sampleDativeCards, gradeDativeAnswer, filterCaseItems, filterFormItems,
  buildCaseCards, buildFormCards, DATIVE_FAMILIES,
} from '../../src/composables/useDativeDrill'
import { T1_CASE_ITEMS, T2_FORM_ITEMS, DATIVE_ITEM_LEVELS } from '../../src/data/dativeItems'
import { DATIVE_VERBS } from '../../src/data/dativeVerbs'

describe('sampleDativeCards', () => {
  test('returns count items from the pool, no duplicates', () => {
    const out = sampleDativeCards(T1_CASE_ITEMS, 10)
    expect(out).toHaveLength(10)
    expect(new Set(out.map(i => i.id)).size).toBe(10)
    const ids = new Set(T1_CASE_ITEMS.map(i => i.id))
    expect(out.every(i => ids.has(i.id))).toBe(true)
  })

  test('a count above the pool size returns the whole pool', () => {
    expect(sampleDativeCards(T2_FORM_ITEMS, 10_000)).toHaveLength(T2_FORM_ITEMS.length)
  })
})

describe('gradeDativeAnswer', () => {
  test('forgiving exact match: case, whitespace, folded umlauts', () => {
    expect(gradeDativeAnswer('meinem Bruder', ['meinem Bruder'])).toBe(true)
    expect(gradeDativeAnswer('  MEINEM   bruder ', ['meinem Bruder'])).toBe(true)
    expect(gradeDativeAnswer('der Baeckerin', ['der Bäckerin'])).toBe(true)
    expect(gradeDativeAnswer('meinen Bruder', ['meinem Bruder'])).toBe(false)
    expect(gradeDativeAnswer('', ['mir'])).toBe(false)
  })

  test('any listed alternative is accepted', () => {
    expect(gradeDativeAnswer('ihm', ['dem Mann', 'ihm'])).toBe(true)
  })
})

describe('filters', () => {
  test('accusative distractors survive the family filter (T1 must stay two-sided)', () => {
    const out = filterCaseItems({ levels: [...DATIVE_ITEM_LEVELS], families: ['recipient'] })
    expect(out.some(i => i.answer === 'accusative')).toBe(true)
    const badDative = out.filter(i => i.answer === 'dative' && DATIVE_VERBS[i.verb].family !== 'recipient')
    expect(badDative.map(i => i.id)).toEqual([])
  })

  test('form items filter by level and family', () => {
    for (const fam of DATIVE_FAMILIES) {
      const out = filterFormItems({ levels: [...DATIVE_ITEM_LEVELS], families: [fam] })
      expect(out.every(i => DATIVE_VERBS[i.verb].family === fam)).toBe(true)
    }
    expect(filterFormItems({ levels: [], families: [...DATIVE_FAMILIES] })).toHaveLength(0)
  })
})

describe('card builders', () => {
  test('case cards: prompt is the verb, dative cards carry the core-idea explanation', () => {
    const cards = buildCaseCards(T1_CASE_ITEMS.slice(0, 50))
    for (const c of cards) {
      expect(c.prompt).toBe(c.verb)
      expect(['dative', 'accusative']).toContain(c.answers[0])
      expect((c.explanation ?? '').length).toBeGreaterThan(0)
    }
  })

  test('form cards keep sentence, answers, and explanation wiring', () => {
    const cards = buildFormCards(T2_FORM_ITEMS)
    expect(cards[0].prompt).toBe(T2_FORM_ITEMS[0].sentence)
    expect(cards[0].answers).toEqual(T2_FORM_ITEMS[0].answers)
    expect(cards[0].explanation).toBe(DATIVE_VERBS[T2_FORM_ITEMS[0].verb].coreIdeaExplanation)
  })
})

// ─── Pick-mode options must be shuffled at card-build time ───
//
// The authored banks list the correct answer first in `options` (answers[0]
// is canonical and the options were written to match), so a builder that
// passes options through verbatim renders the answer as button 1 on nearly
// every card — the bug this block pins down. buildObjectOrderCards set the
// pattern: shuffle at build time with an injectable Rng, so authoring order
// stays irrelevant by design.

import {
  buildSubjectCards, buildTwinCards, buildDitransitiveCards, buildAdjectiveCards,
  buildFreeCards, buildPassiveCards, buildReflexiveCards, type DativeQuizCard,
} from '../../src/composables/useDativeDrill'
import { EXPERIENCER_SUBJECT_ITEMS } from '../../src/data/dativeExperiencer'
import { TWIN_ITEMS } from '../../src/data/dativeTwins'
import { DITRANSITIVE_ITEMS } from '../../src/data/dativeDitransitive'
import { DATIVE_ADJECTIVE_ITEMS } from '../../src/data/dativeAdjectives'
import { FREE_DATIVE_ITEMS } from '../../src/data/dativeFree'
import { PASSIVE_ITEMS, REFLEXIVE_ITEMS } from '../../src/data/dativeConsequences'

describe('pick-mode builders shuffle their options', () => {
  // With rng ≈ 1, the partial Fisher–Yates in data/pool.ts moves the first
  // element on every card whose options differ — deterministic, no flake.
  const reversing = () => 0.999999

  const CASES: Array<{
    name: string
    build: (items: any[], rng?: () => number) => DativeQuizCard[]
    bank: readonly { id: string; options: string[] }[]
  }> = [
    { name: 'T4 subject', build: buildSubjectCards, bank: EXPERIENCER_SUBJECT_ITEMS },
    { name: 'T6 twins', build: buildTwinCards, bank: TWIN_ITEMS },
    { name: 'T7 ditransitive', build: buildDitransitiveCards, bank: DITRANSITIVE_ITEMS },
    { name: 'T9 adjectives', build: buildAdjectiveCards, bank: DATIVE_ADJECTIVE_ITEMS },
    { name: 'T10 free', build: buildFreeCards, bank: FREE_DATIVE_ITEMS },
    { name: 'T12 passive', build: buildPassiveCards, bank: PASSIVE_ITEMS },
    { name: 'T13 reflexive', build: buildReflexiveCards, bank: REFLEXIVE_ITEMS },
  ]

  for (const { name, build, bank } of CASES) {
    test(`${name}: options are a permutation of the authored set, not its order`, () => {
      const authoredById = new Map(bank.map(i => [i.id, i.options]))
      const cards = build([...bank] as any[], reversing)
      let moved = 0
      for (const card of cards) {
        const authored = authoredById.get(card.key)!
        // Never lose or invent an option — a shuffle, not a rewrite.
        expect([...card.options].sort(), card.key).toEqual([...authored].sort())
        // Every graded answer that was offered must still be offered.
        if (card.options.join('¦') !== authored.join('¦')) moved++
      }
      // The reversing rng reorders every multi-option card; if nothing moved,
      // the builder is passing authored order straight through — the bug.
      expect(moved, `${name}: no card's options moved`).toBeGreaterThan(0)
    })
  }
})
