import { describe, test, expect } from 'vitest'
import {
  DA_HOMOGRAPH,
  HOMOGRAPH_WORDS,
  type HomographItem,
} from '../../src/data/daHomograph'

const CORE_WORDS = ['damit', 'darum', 'dabei', 'dagegen']
const WORD_SET = new Set(HOMOGRAPH_WORDS.map(w => w.word))
const LEVELS = new Set(['B1', 'B2', 'C1'])

// The word appears in the sentence as a standalone, case-insensitive token.
const containsWord = (sentence: string, word: string) =>
  new RegExp(`\\b${word}\\b`, 'i').test(sentence)

describe('HOMOGRAPH_WORDS table', () => {
  test('at least 4 words, unique, with the four core words present', () => {
    expect(HOMOGRAPH_WORDS.length).toBeGreaterThanOrEqual(4)
    expect(WORD_SET.size).toBe(HOMOGRAPH_WORDS.length)
    for (const w of CORE_WORDS) expect(WORD_SET.has(w)).toBe(true)
  })

  test('every word carries a non-empty compound + connector label', () => {
    const bad = HOMOGRAPH_WORDS.filter(
      w => !w.compoundLabel?.trim() || !w.connectorLabel?.trim(),
    )
    expect(bad.map(w => w.word)).toEqual([])
  })
})

describe('DA_HOMOGRAPH invariants', () => {
  test('at least 36 items with unique ids', () => {
    expect(DA_HOMOGRAPH.length).toBeGreaterThanOrEqual(36)
    expect(new Set(DA_HOMOGRAPH.map(i => i.id)).size).toBe(DA_HOMOGRAPH.length)
  })

  test('ids follow the hg-<word>-<n> convention and match the item word', () => {
    const bad = DA_HOMOGRAPH.filter(i => i.id !== `hg-${i.word}-${i.id.split('-').pop()}`
      || !/^hg-[a-zäöü]+-\d+$/.test(i.id))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every item word is registered in HOMOGRAPH_WORDS', () => {
    const bad = DA_HOMOGRAPH.filter(i => !WORD_SET.has(i.word))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every sentence contains its word verbatim as a token', () => {
    const bad = DA_HOMOGRAPH.filter(i => !containsWord(i.sentence, i.word))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('reading is compound | connector', () => {
    const bad = DA_HOMOGRAPH.filter(
      i => i.reading !== 'compound' && i.reading !== 'connector',
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('level is a valid CollocationLevel', () => {
    const bad = DA_HOMOGRAPH.filter(i => !LEVELS.has(i.level))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every explanation is a non-empty teaching line', () => {
    const bad = DA_HOMOGRAPH.filter(i => !i.explanation || i.explanation.trim().length < 12)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('per-word floors: >=8 items per core word', () => {
    for (const w of CORE_WORDS) {
      const n = DA_HOMOGRAPH.filter(i => i.word === w).length
      expect(n, `word ${w}`).toBeGreaterThanOrEqual(8)
    }
  })

  test('every word carries >=3 items of BOTH readings', () => {
    const count = (w: string, r: HomographItem['reading']) =>
      DA_HOMOGRAPH.filter(i => i.word === w && i.reading === r).length
    for (const w of WORD_SET) {
      expect(count(w, 'compound'), `${w} compound`).toBeGreaterThanOrEqual(3)
      expect(count(w, 'connector'), `${w} connector`).toBeGreaterThanOrEqual(3)
    }
  })
})
