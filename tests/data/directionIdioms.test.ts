import { describe, test, expect } from 'vitest'
import { DIRECTION_IDIOMS, DW_IDIOM_SURFACES } from '../../src/data/directionIdioms'
import { DIRECTION_LEVELS, IDIOMS } from '../../src/data/directionWords'
import { fillIdiomGap } from '../../src/composables/useDwIdiomQuiz'

const KEYS = new Set(IDIOMS.map(i => i.idiom))

describe('DIRECTION_IDIOMS invariants', () => {
  test('unique ids, valid levels, explanation halves, exactly one gap', () => {
    expect(new Set(DIRECTION_IDIOMS.map(i => i.id)).size).toBe(DIRECTION_IDIOMS.length)
    const bad = DIRECTION_IDIOMS.filter(i =>
      !(DIRECTION_LEVELS as readonly string[]).includes(i.level)
      || !i.explanation.includes(' / ')
      || (i.sentence.match(/___/g) ?? []).length !== 1)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('options: 3-4 unique, exactly one is the answer, ALL from the closed inventory', () => {
    const bad = DIRECTION_IDIOMS.filter(i =>
      i.options.length < 3 || i.options.length > 4
      || new Set(i.options).size !== i.options.length
      || i.options.filter(o => o === i.answer).length !== 1
      || i.options.some(o => !DW_IDIOM_SURFACES.includes(o)))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('the answer is itself an inventory surface and never leaks into the sentence', () => {
    const bad = DIRECTION_IDIOMS.filter(i => {
      if (!DW_IDIOM_SURFACES.includes(i.answer)) return true
      const escaped = i.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`\\b${escaped}\\b`, 'i').test(i.sentence)
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every item cross-links a real cheatsheet idiom', () => {
    const bad = DIRECTION_IDIOMS.filter(i => !KEYS.has(i.idiomKey))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('cheatsheet coverage: every IDIOMS entry is drilled at least once', () => {
    const drilled = new Set(DIRECTION_IDIOMS.map(i => i.idiomKey))
    expect(IDIOMS.map(i => i.idiom).filter(k => !drilled.has(k))).toEqual([])
  })

  test('NEAR-MISS GATE: hin und her / hin und wieder always distract each other', () => {
    const TWINS: Record<string, string> = {
      'hin und her': 'hin und wieder',
      'hin und wieder': 'hin und her',
    }
    const bad = DIRECTION_IDIOMS.filter(i =>
      TWINS[i.answer] !== undefined && !i.options.includes(TWINS[i.answer]))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥24 items; ≥2 per cheatsheet idiom for the two C1 twins; levels B1≥8, B2≥8, C1≥4', () => {
    expect(DIRECTION_IDIOMS.length).toBeGreaterThanOrEqual(24)
    for (const key of ['hin und her', 'hin und wieder'])
      expect(DIRECTION_IDIOMS.filter(i => i.idiomKey === key).length, key).toBeGreaterThanOrEqual(2)
    const n = (l: string) => DIRECTION_IDIOMS.filter(i => i.level === l).length
    expect(n('B1')).toBeGreaterThanOrEqual(8)
    expect(n('B2')).toBeGreaterThanOrEqual(8)
    expect(n('C1')).toBeGreaterThanOrEqual(4)
  })
})

// ── The reveal's orthography, swept over the whole bank ──────────────────────
// The T9 reveal drops the answer into the gap, and where the gap sits decides
// whether German capitalises it (id-5 in the Vorfeld, id-26 after a colon). The
// runner tests pin four concrete sentences; this sweep is what covers item 29.
//
// The expectation below is re-derived from the SENTENCE, independently of
// fillIdiomGap's own trigger set, and it is deliberately quote-aware: a gap
// behind an opening „ still opens a sentence. So an added item in a position the
// helper does not handle fails HERE, naming the item, rather than shipping wrong
// German in the reveal. Two positions this catches today:
//   'Sie schrie ihn an: „___ dem Geld!"'  → must capitalise; the helper would not
//   'Seit dem 1. ___ war alles anders.'   → must NOT capitalise; the helper would
// Either failure is fixed by teaching fillIdiomGap the position (and only then),
// never by loosening this test.
describe('DIRECTION_IDIOMS · the filled reveal capitalises iff the gap opens a sentence', () => {
  /** Opening quotes/brackets do not end a sentence — they sit inside the new one. */
  const OPENERS = /[„“"«‚‘'([]+$/

  function gapOpensSentence(sentence: string): boolean {
    const before = sentence.slice(0, sentence.indexOf('___')).trimEnd().replace(OPENERS, '').trimEnd()
    return before === '' || before.endsWith(':')
  }

  test('every item: the inserted surface is capitalised exactly when the gap is sentence-initial or post-colon', () => {
    const bad: string[] = []
    for (const item of DIRECTION_IDIOMS) {
      const shouldCapitalise = gapOpensSentence(item.sentence)
      const surface = shouldCapitalise
        ? item.answer.charAt(0).toUpperCase() + item.answer.slice(1)
        : item.answer
      const expected = item.sentence.replace('___', surface)
      if (fillIdiomGap(item.sentence, item.answer) !== expected) {
        bad.push(`${item.id}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(fillIdiomGap(item.sentence, item.answer))}`)
      }
    }
    expect(bad).toEqual([])
  })

  test('the sweep is not vacuous: the bank exercises BOTH branches', () => {
    const capitalising = DIRECTION_IDIOMS.filter(i => gapOpensSentence(i.sentence))
    expect(capitalising.map(i => i.id)).toEqual(['id-5', 'id-26'])
    expect(DIRECTION_IDIOMS.length - capitalising.length).toBeGreaterThan(0)
    // …and the two are the two positions, not two of the same
    expect(DIRECTION_IDIOMS.find(i => i.id === 'id-5')!.sentence.startsWith('___')).toBe(true)
    expect(DIRECTION_IDIOMS.find(i => i.id === 'id-26')!.sentence).toContain(': ___')
  })

  test('the filled sentence never leaves the gap marker behind', () => {
    const bad = DIRECTION_IDIOMS.filter(i => fillIdiomGap(i.sentence, i.answer).includes('___'))
    expect(bad.map(i => i.id)).toEqual([])
  })
})
