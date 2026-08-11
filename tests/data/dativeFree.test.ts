import { describe, test, expect } from 'vitest'
import { FREE_TYPES, FREE_TYPE_LABEL, FREE_DATIVE_ITEMS } from '../../src/data/dativeFree'
import { DATIVE_DRILL_LEVELS } from '../../src/data/dativeExperiencer'
import { DATIVE_VERBS } from '../../src/data/dativeVerbs'

/** Two-sided word-boundary containment that respects umlauts (JS \b is ASCII-only). */
function containsWord(text: string, word: string): boolean {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-zäöüß])${esc}($|[^a-zäöüß])`, 'i').test(text)
}

describe('FREE_DATIVE_ITEMS (T10)', () => {
  test('base invariants: unique ids, known level, known kind, texts present', () => {
    expect(new Set(FREE_DATIVE_ITEMS.map(i => i.id)).size).toBe(FREE_DATIVE_ITEMS.length)
    const bad = FREE_DATIVE_ITEMS.filter(i =>
      !(DATIVE_DRILL_LEVELS as readonly string[]).includes(i.level)
      || !['drop', 'classify'].includes(i.kind)
      || i.translation.trim().length === 0
      || i.explanation.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('FREE-DATIVE GATE, half 1 (spec gate 6): every item is exactly one of the three readings', () => {
    const bad = FREE_DATIVE_ITEMS.filter(i => !FREE_TYPES.includes(i.type))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('FREE-DATIVE GATE, half 2 (spec gate 6): every item carries a real dative-verb-object counterexample', () => {
    const bad = FREE_DATIVE_ITEMS.filter(i =>
      !(i.counterVerb in DATIVE_VERBS)
      || !containsWord(i.counterSentence, i.counterDativePhrase)
      || i.counterSentence === i.freeSentence)
    expect(bad.map(i => `${i.id}:${i.counterVerb}`)).toEqual([])
  })

  test('DROP TEST: freeSentence carries the free dative; withoutDative genuinely drops it', () => {
    const bad = FREE_DATIVE_ITEMS.filter(i =>
      !containsWord(i.freeSentence, i.dativePhrase)
      || containsWord(i.withoutDative, i.dativePhrase)
      || i.withoutDative.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('prompt wiring: classify asks about the free sentence; drop cards point at the probed dative', () => {
    const bad = FREE_DATIVE_ITEMS.filter(i => {
      if (!containsWord(i.prompt, i.probePhrase)) return true
      if (i.kind === 'classify') {
        return i.prompt !== i.freeSentence
          || i.probePhrase !== i.dativePhrase
          || i.answers.length !== 1
          || i.answers[0] !== FREE_TYPE_LABEL[i.type]
          || new Set(i.options).size !== 3
          || !FREE_TYPES.every(t => i.options.includes(FREE_TYPE_LABEL[t]))
      }
      // kind 'drop'
      if (new Set(i.options).size !== 2
        || !i.options.includes('weglassbar') || !i.options.includes('obligatorisch')
        || i.answers.length !== 1) return true
      if (i.answers[0] === 'weglassbar') return i.prompt !== i.freeSentence || i.probePhrase !== i.dativePhrase
      if (i.answers[0] === 'obligatorisch') return i.prompt !== i.counterSentence || i.probePhrase !== i.counterDativePhrase
      return true
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('ethicus stays near-particle: its free dative is mir or dir', () => {
    const bad = FREE_DATIVE_ITEMS.filter(i =>
      i.type === 'ethicus' && !['mir', 'dir'].includes(i.dativePhrase.toLowerCase()))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥24 total, ≥6 per reading, ≥10 classify, ≥10 drop with ≥5 per drop answer', () => {
    expect(FREE_DATIVE_ITEMS.length).toBeGreaterThanOrEqual(24)
    for (const t of FREE_TYPES) {
      expect(FREE_DATIVE_ITEMS.filter(i => i.type === t).length, t).toBeGreaterThanOrEqual(6)
    }
    const drop = FREE_DATIVE_ITEMS.filter(i => i.kind === 'drop')
    expect(FREE_DATIVE_ITEMS.filter(i => i.kind === 'classify').length).toBeGreaterThanOrEqual(10)
    expect(drop.length).toBeGreaterThanOrEqual(10)
    // The DW T8 lesson: never one-button-winnable — both drop answers well represented.
    expect(drop.filter(i => i.answers[0] === 'weglassbar').length).toBeGreaterThanOrEqual(5)
    expect(drop.filter(i => i.answers[0] === 'obligatorisch').length).toBeGreaterThanOrEqual(5)
  })
})
