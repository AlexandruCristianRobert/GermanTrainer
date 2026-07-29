import { describe, test, expect, vi } from 'vitest'
import {
  useDwLexicalQuiz, filterLexicalItems, sampleLexicalItems, splitVerbSentence,
} from '../../src/composables/useDwLexicalQuiz'
import {
  DIRECTION_VERBS, DW_VERB_ENTRIES, verbEntryFor, type DwVerbItem,
} from '../../src/data/directionVerbs'
import { DIRECTION_LEVELS } from '../../src/data/directionWords'

const entryByVerb = new Map(DW_VERB_ENTRIES.map(e => [e.verb, e]))

/** Non-overlapping occurrences of `needle` in `hay`. */
function countOccurrences(hay: string, needle: string): number {
  let n = 0
  let i = hay.indexOf(needle)
  while (i !== -1) { n++; i = hay.indexOf(needle, i + needle.length) }
  return n
}

const twoSurfaceItem = DIRECTION_VERBS.find(i => i.surfaces.length === 2)!
const oneSurfaceItem = DIRECTION_VERBS.find(i => i.surfaces.length === 1)!

describe('filterLexicalItems / sampleLexicalItems', () => {
  test('filters by level', () => {
    const b2 = filterLexicalItems({ levels: ['B2'] })
    expect(b2.length).toBeGreaterThan(0)
    expect(b2.every(i => i.level === 'B2')).toBe(true)
  })

  test('an empty/omitted filter matches every item', () => {
    expect(filterLexicalItems({}).length).toBe(DIRECTION_VERBS.length)
    expect(filterLexicalItems().length).toBe(DIRECTION_VERBS.length)
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = sampleLexicalItems(5, { levels: ['B2'] })
    expect(sample.length).toBe(5)
    expect(sample.every(i => i.level === 'B2')).toBe(true)
  })

  test('sampling never exceeds the pool size', () => {
    const b1 = filterLexicalItems({ levels: ['B1'] })
    expect(sampleLexicalItems(999, { levels: ['B1'] }).length).toBe(b1.length)
  })
})

describe('useDwLexicalQuiz — option composition', () => {
  test('every question exposes exactly two options: the verb entry\'s directional + lexicalized labels', () => {
    for (const item of DIRECTION_VERBS) {
      const quiz = useDwLexicalQuiz([item])
      const q = quiz.current.value!
      const entry = entryByVerb.get(item.verb)!
      expect(q.options, item.id).toHaveLength(2)
      const byReading = new Map(q.options.map(o => [o.reading, o.label]))
      expect(byReading.get('directional'), item.id).toBe(entry.directionalLabel)
      expect(byReading.get('lexicalized'), item.id).toBe(entry.lexicalizedLabel)
    }
  })

  test('both readings are present as a set, regardless of order', () => {
    const quiz = useDwLexicalQuiz([DIRECTION_VERBS[0]])
    const readings = quiz.current.value!.options.map(o => o.reading).sort()
    expect(readings).toEqual(['directional', 'lexicalized'])
  })

  // Every other option test here is order-agnostic, so deleting shuffle() from
  // buildOptions would keep the whole suite green — and with the bank at 26
  // lexicalized vs. 14 directional items, a fixed button order would let a
  // learner press one slot for ~65% without reading any German. buildOptions
  // authors the pair as [directional, lexicalized] and shuffles it; shuffle()
  // (src/data/pool.ts) resolves its `rng` default per call, so pinning
  // Math.random to 0.99 makes the single Fisher-Yates step over n = 2 swap the
  // pair — an order that is unreachable if the shuffle goes away.
  test('the two options are SHUFFLED, not left in authoring order (pinned rng)', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99)
    try {
      // A DIRECTIONAL item, deliberately: the swapped order is then
      // [distractor, correct], so this passes only for the authored order having
      // been swapped — it cannot be satisfied by an engine that (say) sorted the
      // correct reading into the first slot.
      const directionalItem = DIRECTION_VERBS.find(i => i.reading === 'directional')!
      const quiz = useDwLexicalQuiz([directionalItem])
      expect(quiz.current.value!.options.map(o => o.reading)).toEqual(['lexicalized', 'directional'])
    } finally {
      randomSpy.mockRestore()
    }
  })

  test('options are built ONCE — repeated reads of `current` return the identical array, same order', () => {
    const quiz = useDwLexicalQuiz(DIRECTION_VERBS.slice(0, 3))
    const first = quiz.current.value!.options
    const readings = first.map(o => o.reading)
    for (let n = 0; n < 5; n++) {
      expect(quiz.current.value!.options).toBe(first)
      expect(quiz.current.value!.options.map(o => o.reading)).toEqual(readings)
    }
    // …and answering does not re-roll them either
    quiz.pick('directional')
    expect(quiz.current.value!.options).toBe(first)
    expect(quiz.current.value!.options.map(o => o.reading)).toEqual(readings)
  })

  test('an item naming an unknown verb throws via verbEntryFor', () => {
    const bogus: DwVerbItem = {
      id: 'lx-bogus', verb: 'nichtvorhandenverb', reading: 'directional', level: 'B1',
      sentence: 'Er ging hinaus.', surfaces: ['ging', 'hinaus'], explanation: '—',
    }
    expect(() => useDwLexicalQuiz([bogus])).toThrow(/Unknown direction verb/)
    expect(() => verbEntryFor(bogus)).toThrow(/Unknown direction verb/)
  })
})

describe('useDwLexicalQuiz — pick bookkeeping', () => {
  test('picking the item\'s reading grades true and locks the question', () => {
    const item = DIRECTION_VERBS[0]
    const quiz = useDwLexicalQuiz([item])
    quiz.pick(item.reading)
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe(item.reading)
    const other = item.reading === 'directional' ? 'lexicalized' : 'directional'
    quiz.pick(other) // second pick on an answered question is a no-op
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe(item.reading)
  })

  test('picking the other reading grades false', () => {
    const item = DIRECTION_VERBS[0]
    const wrong = item.reading === 'directional' ? 'lexicalized' : 'directional'
    const quiz = useDwLexicalQuiz([item])
    quiz.pick(wrong)
    expect(quiz.current.value!.isCorrect).toBe(false)
    expect(quiz.current.value!.picked).toBe(wrong)
  })

  test('grading follows each item\'s own reading across the whole bank', () => {
    const quiz = useDwLexicalQuiz(DIRECTION_VERBS)
    for (const item of DIRECTION_VERBS) {
      quiz.pick(item.reading)
      expect(quiz.current.value!.isCorrect, item.id).toBe(true)
      quiz.advance()
    }
    expect(quiz.score.value).toBe(DIRECTION_VERBS.length)
    expect(quiz.wrongItems.value).toEqual([])
  })

  test('a wrong pick lands the item in wrongItems (the retry pool)', () => {
    const items = DIRECTION_VERBS.slice(0, 2)
    const quiz = useDwLexicalQuiz(items)
    quiz.pick(items[0].reading) // correct
    quiz.advance()
    const wrong = items[1].reading === 'directional' ? 'lexicalized' : 'directional'
    quiz.pick(wrong)
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(1)
    expect(quiz.wrongItems.value).toEqual([items[1]])
    expect(quiz.current.value).toBe(null)
  })

  test('total reflects the number of items; advance stops at the end', () => {
    const quiz = useDwLexicalQuiz(DIRECTION_VERBS.slice(0, 3))
    expect(quiz.total.value).toBe(3)
    for (let n = 0; n < 10; n++) quiz.advance()
    expect(quiz.currentIndex.value).toBe(3)
    expect(quiz.finished.value).toBe(true)
  })

  test('pick on a finished quiz is a no-op (no throw)', () => {
    const quiz = useDwLexicalQuiz([DIRECTION_VERBS[0]])
    quiz.advance()
    expect(() => quiz.pick('directional')).not.toThrow()
    expect(quiz.score.value).toBe(0)
  })
})

describe('splitVerbSentence', () => {
  test('a two-surface item yields bold parts exactly equal to its surfaces, in order', () => {
    const parts = splitVerbSentence(twoSurfaceItem)
    expect(parts.filter(p => p.bold).map(p => p.text)).toEqual(twoSurfaceItem.surfaces)
  })

  test('a one-surface item yields exactly one bold part', () => {
    const parts = splitVerbSentence(oneSurfaceItem)
    const bold = parts.filter(p => p.bold)
    expect(bold).toHaveLength(1)
    expect(bold[0].text).toBe(oneSurfaceItem.surfaces[0])
  })

  test('PROPERTY: for every item, concatenating all part texts reproduces the sentence and the bold parts are the surfaces', () => {
    for (const item of DIRECTION_VERBS) {
      const parts = splitVerbSentence(item)
      expect(parts.map(p => p.text).join(''), item.id).toBe(item.sentence)
      expect(parts.filter(p => p.bold).map(p => p.text), item.id).toEqual(item.surfaces)
      expect(parts.some(p => p.text === ''), item.id).toBe(false)
    }
  })

  test('a sentence that STARTS with its surface emits no leading empty part', () => {
    const item = DIRECTION_VERBS.find(i => i.sentence.startsWith(i.surfaces[0]))
    expect(item, 'expected at least one sentence-initial surface in the bank').toBeTruthy()
    const parts = splitVerbSentence(item!)
    expect(parts[0].bold).toBe(true)
    expect(parts.map(p => p.text).join('')).toBe(item!.sentence)
  })

  test('a surface that is absent never throws: the remainder is emitted as plain text', () => {
    const item: DwVerbItem = { ...twoSurfaceItem, surfaces: ['gibtesnicht'] }
    let parts: ReturnType<typeof splitVerbSentence> = []
    expect(() => { parts = splitVerbSentence(item) }).not.toThrow()
    expect(parts).toEqual([{ text: twoSurfaceItem.sentence, bold: false }])
  })

  test('a partially locatable surface list bolds what it finds and emits the rest as plain', () => {
    const item: DwVerbItem = { ...twoSurfaceItem, surfaces: [twoSurfaceItem.surfaces[0], 'gibtesnicht'] }
    const parts = splitVerbSentence(item)
    expect(parts.filter(p => p.bold).map(p => p.text)).toEqual([twoSurfaceItem.surfaces[0]])
    expect(parts.map(p => p.text).join('')).toBe(twoSurfaceItem.sentence)
  })

  test('an empty surface list leaves the whole sentence plain', () => {
    const parts = splitVerbSentence({ ...twoSurfaceItem, surfaces: [] })
    expect(parts).toEqual([{ text: twoSurfaceItem.sentence, bold: false }])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Bank invariants that the engine DEPENDS on. tests/data/directionVerbs.test.ts
// is frozen, so these two live here, next to the code they protect.
// ─────────────────────────────────────────────────────────────────────────────
describe('DIRECTION_VERBS invariants the lexical engine depends on', () => {
  test('every surface occurs EXACTLY ONCE in its own sentence (bold-span correctness)', () => {
    const offenders: string[] = []
    for (const item of DIRECTION_VERBS) {
      for (const surface of item.surfaces) {
        const n = countOccurrences(item.sentence, surface)
        if (n !== 1) offenders.push(`${item.id}: "${surface}" occurs ${n}×`)
      }
    }
    // A duplicated surface would let splitVerbSentence bold the wrong span.
    expect(offenders).toEqual([])
  })

  test('every level that HAS items carries at least one item of EACH reading', () => {
    const levelsWithItems = DIRECTION_LEVELS.filter(l => DIRECTION_VERBS.some(i => i.level === l))
    expect(levelsWithItems.length).toBeGreaterThan(0)
    for (const level of levelsWithItems) {
      const atLevel = DIRECTION_VERBS.filter(i => i.level === level)
      // Otherwise a level-filtered session is winnable by pressing one button.
      expect(atLevel.some(i => i.reading === 'directional'), `${level} directional`).toBe(true)
      expect(atLevel.some(i => i.reading === 'lexicalized'), `${level} lexicalized`).toBe(true)
    }
  })
})
