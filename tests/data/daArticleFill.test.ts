import { describe, test, expect } from 'vitest'
import {
  DA_ARTICLE_FILL,
  DEFINITE,
  INDEFINITE,
  TWO_WAY_PREPS,
  articleFillAnswer,
  type ArticleGender,
} from '../../src/data/daArticleFill'
import { COLLOCATIONS } from '../../src/data/collocations'

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

const GENDERS: ArticleGender[] = ['masculine', 'feminine', 'neuter']

describe('article tables', () => {
  test('DEFINITE and INDEFINITE carry an accusative + dative form for each gender', () => {
    for (const g of GENDERS) {
      expect(typeof DEFINITE[g].accusative).toBe('string')
      expect(typeof DEFINITE[g].dative).toBe('string')
      expect(typeof INDEFINITE[g].accusative).toBe('string')
      expect(typeof INDEFINITE[g].dative).toBe('string')
    }
  })
})

describe('DA_ARTICLE_FILL invariants', () => {
  test('at least 50 items with unique ids and one item per collocation', () => {
    expect(DA_ARTICLE_FILL.length).toBeGreaterThanOrEqual(50)
    expect(new Set(DA_ARTICLE_FILL.map(i => i.id)).size).toBe(DA_ARTICLE_FILL.length)
    expect(new Set(DA_ARTICLE_FILL.map(i => i.collocationId)).size).toBe(DA_ARTICLE_FILL.length)
  })

  test('ids follow the af-<collocationId> convention', () => {
    const bad = DA_ARTICLE_FILL.filter(i => i.id !== `af-${i.collocationId}`)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every item joins a real collocation and matches its level', () => {
    const bad = DA_ARTICLE_FILL.filter(
      i => !byId.has(i.collocationId) || byId.get(i.collocationId)!.level !== i.level,
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every collocation preposition is a two-way preposition', () => {
    const bad = DA_ARTICLE_FILL.filter(
      i => !(TWO_WAY_PREPS as readonly string[]).includes(byId.get(i.collocationId)!.preposition),
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('gender is one of the three grammatical genders', () => {
    const bad = DA_ARTICLE_FILL.filter(i => !GENDERS.includes(i.gender))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('sentence has exactly one article gap whose stem agrees with the article kind', () => {
    const bad = DA_ARTICLE_FILL.filter(i => {
      const gaps = (i.sentence.match(/___/g) ?? []).length
      if (gaps !== 1) return true
      const stem = /\bein___/.test(i.sentence) ? 'ein' : /\bd___/.test(i.sentence) ? 'd' : null
      const expected = i.article === 'indefinite' ? 'ein' : 'd'
      return stem !== expected
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('at least 12 items whose collocation case is dative (the an+Dativ exception etc.)', () => {
    const dative = DA_ARTICLE_FILL.filter(i => byId.get(i.collocationId)!.case === 'dative')
    expect(dative.length).toBeGreaterThanOrEqual(12)
  })
})

describe('articleFillAnswer', () => {
  test('answer = the article for the declared gender in the collocation case', () => {
    for (const item of DA_ARTICLE_FILL) {
      const c = byId.get(item.collocationId)!
      const table = item.article === 'definite' ? DEFINITE : INDEFINITE
      expect(articleFillAnswer(item)).toBe(table[item.gender][c.case])
    }
  })

  test('spot check: arbeiten-an (dative) + indefinite/neuter -> "einem"', () => {
    expect(
      articleFillAnswer({ id: 'x', collocationId: 'arbeiten-an', sentence: 'an ein___', article: 'indefinite', gender: 'neuter', level: 'B2' }),
    ).toBe('einem')
  })

  test('spot check: warten-auf (accusative) + definite/masculine -> "den"', () => {
    expect(
      articleFillAnswer({ id: 'x', collocationId: 'warten-auf', sentence: 'auf d___', article: 'definite', gender: 'masculine', level: 'B1' }),
    ).toBe('den')
  })

  test('spot check: leiden-unter (dative) + definite/feminine -> "der"', () => {
    expect(
      articleFillAnswer({ id: 'x', collocationId: 'leiden-unter', sentence: 'unter d___', article: 'definite', gender: 'feminine', level: 'B2' }),
    ).toBe('der')
  })

  test('throws on an unknown collocationId', () => {
    expect(() =>
      articleFillAnswer({ id: 'x', collocationId: 'does-not-exist', sentence: 'd___', article: 'definite', gender: 'masculine', level: 'B1' }),
    ).toThrow()
  })
})
