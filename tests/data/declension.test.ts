import { describe, test, expect } from 'vitest'
import {
  DECLENSION_TABLES,
  ARTICLE_FILL_ENTRIES,
  ADJECTIVE_ENDING_ENTRIES,
  DECL_CASES, DECL_GENDERS, DECL_DETERMINERS, DECL_INFLECTIONS, DECL_LEVELS
} from '../../src/data/declension'

describe('declension tables', () => {
  test('all ids unique', () => {
    const ids = DECLENSION_TABLES.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every entry has all 4 case forms', () => {
    for (const e of DECLENSION_TABLES) {
      for (const c of DECL_CASES) {
        expect(e.forms[c], `${e.id} missing ${c}`).toBeTruthy()
      }
    }
  })

  test('possessive entries declare a possessiveLemma', () => {
    for (const e of DECLENSION_TABLES) {
      if (e.determiner === 'possessive') {
        expect(e.possessiveLemma, `${e.id}: possessive missing lemma`).toBeTruthy()
      }
    }
  })

  test('every form mentions the noun (case shift on the noun is allowed)', () => {
    for (const e of DECLENSION_TABLES) {
      const stem = e.noun.slice(0, Math.max(3, e.noun.length - 2))
      for (const c of DECL_CASES) {
        expect(e.forms[c].toLowerCase()).toContain(stem.toLowerCase())
      }
    }
  })

  test('valid enum values', () => {
    const cases = new Set<string>(DECL_CASES)
    const genders = new Set<string>(DECL_GENDERS)
    const determiners = new Set<string>(DECL_DETERMINERS)
    const levels = new Set<string>(DECL_LEVELS)
    for (const e of DECLENSION_TABLES) {
      expect(determiners.has(e.determiner)).toBe(true)
      expect(genders.has(e.gender)).toBe(true)
      expect(levels.has(e.level)).toBe(true)
      for (const c of Object.keys(e.forms)) expect(cases.has(c)).toBe(true)
    }
  })
})

describe('article-fill entries', () => {
  test('all ids unique', () => {
    const ids = ARTICLE_FILL_ENTRIES.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every blanked contains exactly one "___"', () => {
    for (const e of ARTICLE_FILL_ENTRIES) {
      const count = e.blanked.split('___').length - 1
      expect(count, `${e.id}: ${count} blanks in "${e.blanked}"`).toBe(1)
    }
  })

  test('sentence = blanked with ___ replaced by expectedAnswer', () => {
    for (const e of ARTICLE_FILL_ENTRIES) {
      const reconstructed = e.blanked.replace('___', e.expectedAnswer)
      expect(reconstructed, `${e.id}: reconstruction mismatch`).toBe(e.sentence)
    }
  })

  test('expectedAnswer is unique within the sentence', () => {
    for (const e of ARTICLE_FILL_ENTRIES) {
      const count = e.sentence.split(e.expectedAnswer).length - 1
      expect(count, `${e.id}: "${e.expectedAnswer}" appears ${count}x in "${e.sentence}"`).toBe(1)
    }
  })

  test('caseRationale is non-empty', () => {
    for (const e of ARTICLE_FILL_ENTRIES) {
      expect(e.caseRationale.trim().length, `${e.id}: empty caseRationale`).toBeGreaterThan(0)
    }
  })

  test('valid enum values', () => {
    const cases = new Set<string>(DECL_CASES)
    const genders = new Set<string>(DECL_GENDERS)
    const determiners = new Set<string>(DECL_DETERMINERS)
    for (const e of ARTICLE_FILL_ENTRIES) {
      expect(cases.has(e.case)).toBe(true)
      expect(genders.has(e.gender)).toBe(true)
      expect(determiners.has(e.determiner)).toBe(true)
    }
  })
})

describe('adjective-ending entries', () => {
  test('all ids unique', () => {
    const ids = ADJECTIVE_ENDING_ENTRIES.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every blanked contains exactly one "___"', () => {
    for (const e of ADJECTIVE_ENDING_ENTRIES) {
      const count = e.blanked.split('___').length - 1
      expect(count).toBe(1)
    }
  })

  test('sentence = blanked with ___ replaced by expectedAnswer', () => {
    for (const e of ADJECTIVE_ENDING_ENTRIES) {
      const reconstructed = e.blanked.replace('___', e.expectedAnswer)
      expect(reconstructed, `${e.id}: reconstruction mismatch`).toBe(e.sentence)
    }
  })

  test('expectedAnswer starts with baseAdjective stem', () => {
    for (const e of ADJECTIVE_ENDING_ENTRIES) {
      const stem = e.baseAdjective.toLowerCase()
      expect(e.expectedAnswer.toLowerCase().startsWith(stem),
        `${e.id}: "${e.expectedAnswer}" doesn't start with stem "${stem}"`).toBe(true)
    }
  })

  test("inflection matches preceding determiner", () => {
    for (const e of ADJECTIVE_ENDING_ENTRIES) {
      if (e.preceding === 'definite' && e.inflection !== 'weak')
        throw new Error(`${e.id}: definite preceding should be weak, got ${e.inflection}`)
      if ((e.preceding === 'indefinite' || e.preceding === 'possessive') &&
          e.inflection !== 'mixed' && !(e.gender === 'plural' && e.inflection === 'strong'))
        throw new Error(`${e.id}: indef/poss preceding should be mixed (or strong if plural), got ${e.inflection}`)
      if (e.preceding === 'none' && e.inflection !== 'strong')
        throw new Error(`${e.id}: no preceding should be strong, got ${e.inflection}`)
    }
  })

  test('valid enum values', () => {
    const cases = new Set<string>(DECL_CASES)
    const genders = new Set<string>(DECL_GENDERS)
    const inflections = new Set<string>(DECL_INFLECTIONS)
    for (const e of ADJECTIVE_ENDING_ENTRIES) {
      expect(cases.has(e.case)).toBe(true)
      expect(genders.has(e.gender)).toBe(true)
      expect(inflections.has(e.inflection)).toBe(true)
    }
  })
})
