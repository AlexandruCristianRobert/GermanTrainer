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
