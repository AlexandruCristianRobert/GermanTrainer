import { describe, test, expect } from 'vitest'
import {
  WEAK_NOUNS, NDEKL_ITEMS, NDEKL_LEVELS, NDEKL_KINDS, NDEKL_CLASSIFY_OPTIONS,
  weakNounForm, filterNDeklItems
} from '../../src/data/nDeklination'

describe('WEAK_NOUNS', () => {
  test('exactly 40, unique lemmas, forms present, only Herz is das', () => {
    expect(WEAK_NOUNS.length).toBe(40)
    expect(new Set(WEAK_NOUNS.map(n => n.lemma)).size).toBe(40)
    const bad = WEAK_NOUNS.filter(n =>
      n.weakForm.trim().length === 0 || n.english.trim().length === 0
      || (n.article === 'das' && n.lemma !== 'Herz'))
    expect(bad.map(n => n.lemma)).toEqual([])
  })
  test('weakNounForm: Nominativ = lemma, Genitiv honors -ns irregulars', () => {
    const name = WEAK_NOUNS.find(n => n.lemma === 'Name')!
    expect(weakNounForm(name, 'Nominativ')).toBe('Name')
    expect(weakNounForm(name, 'Dativ')).toBe('Namen')
    expect(weakNounForm(name, 'Genitiv')).toBe('Namens')
  })
})

describe('NDEKL_ITEMS', () => {
  const byLemma = new Map(WEAK_NOUNS.map(n => [n.lemma, n]))

  test('base invariants: unique ids, known level/kind, texts present', () => {
    expect(new Set(NDEKL_ITEMS.map(i => i.id)).size).toBe(NDEKL_ITEMS.length)
    const bad = NDEKL_ITEMS.filter(i =>
      !NDEKL_LEVELS.includes(i.level)
      || !NDEKL_KINDS.includes(i.kind)
      || i.translation.trim().length === 0
      || i.explanation.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('FORM GATE: gap present, noun is weak, answer IS the declined form, never Nominativ, no Herz-Akkusativ', () => {
    const forms = NDEKL_ITEMS.filter(i => i.kind === 'form')
    const bad = forms.filter(i => {
      const n = byLemma.get(i.noun)
      return !n
        || (i.prompt.match(/___/g) ?? []).length !== 1
        || i.caseUsed === 'Nominativ'
        || (i.noun === 'Herz' && i.caseUsed === 'Akkusativ')
        || i.options.length !== 0
        || i.answers.length !== 1
        || i.answers[0] !== weakNounForm(n, i.caseUsed)
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('CLASSIFY GATE: options fixed, weak ⇔ schwach answer, prompt has no gap and contains the noun form or lemma', () => {
    const cls = NDEKL_ITEMS.filter(i => i.kind === 'classify')
    const bad = cls.filter(i => {
      const isWeak = byLemma.has(i.noun)
      return JSON.stringify(i.options) !== JSON.stringify([...NDEKL_CLASSIFY_OPTIONS])
        || i.answers.length !== 1
        || i.prompt.includes('___')
        || !i.prompt.includes(i.noun)
        || (i.answers[0] === 'schwach (-n)') !== isWeak
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: 100 total, 60 form / 40 classify, classify balanced 20/20', () => {
    expect(NDEKL_ITEMS.length).toBe(100)
    expect(NDEKL_ITEMS.filter(i => i.kind === 'form').length).toBe(60)
    const cls = NDEKL_ITEMS.filter(i => i.kind === 'classify')
    expect(cls.length).toBe(40)
    expect(cls.filter(i => i.answers[0] === 'schwach (-n)').length).toBe(20)
    expect(cls.filter(i => i.answers[0] === 'stark (endungslos)').length).toBe(20)
  })

  test('filter helper filters by level and kind', () => {
    const some = filterNDeklItems({ levels: ['B2'], kinds: ['form'] })
    expect(some.length).toBeGreaterThan(0)
    expect(some.every(i => i.level === 'B2' && i.kind === 'form')).toBe(true)
  })

  test('no duplicate prompts', () => {
    expect(new Set(NDEKL_ITEMS.map(i => i.prompt)).size).toBe(NDEKL_ITEMS.length)
  })
})
