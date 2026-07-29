import { describe, test, expect, vi, afterEach } from 'vitest'
import { toRaw } from 'vue'
import {
  useDwIdiomQuiz, filterIdiomItems, sampleIdiomItems,
} from '../../src/composables/useDwIdiomQuiz'
import { DIRECTION_IDIOMS, DW_IDIOM_SURFACES, type DwIdiomItem } from '../../src/data/directionIdioms'
import { shuffle } from '../../src/data/pool'

const threeOptionItem = DIRECTION_IDIOMS.find(i => i.options.length === 3)!
const fourOptionItem = DIRECTION_IDIOMS.find(i => i.options.length === 4)!

function firstWrongOption(item: DwIdiomItem): string {
  return item.options.find(o => o !== item.answer)!
}

afterEach(() => { vi.restoreAllMocks() })

describe('filterIdiomItems / sampleIdiomItems', () => {
  test('filters by level', () => {
    const b2 = filterIdiomItems({ levels: ['B2'] })
    expect(b2.length).toBeGreaterThan(0)
    expect(b2.every(i => i.level === 'B2')).toBe(true)
  })

  test('an empty/omitted filter matches every item', () => {
    expect(filterIdiomItems({}).length).toBe(DIRECTION_IDIOMS.length)
    expect(filterIdiomItems().length).toBe(DIRECTION_IDIOMS.length)
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = sampleIdiomItems(5, { levels: ['B2'] })
    expect(sample.length).toBe(5)
    expect(sample.every(i => i.level === 'B2')).toBe(true)
  })

  test('sampling never exceeds the pool size', () => {
    const c1 = filterIdiomItems({ levels: ['C1'] })
    expect(sampleIdiomItems(999, { levels: ['C1'] }).length).toBe(c1.length)
  })
})

describe('useDwIdiomQuiz — options are the item\'s options, SHUFFLED', () => {
  test('same multiset as the item\'s options, every option a real inventory surface', () => {
    for (const item of DIRECTION_IDIOMS) {
      const q = useDwIdiomQuiz([item]).current.value!
      expect([...q.options].sort(), item.id).toEqual([...item.options].sort())
      expect(q.options.filter(o => o === item.answer), item.id).toHaveLength(1)
      for (const o of q.options) expect(DW_IDIOM_SURFACES, `${item.id}: ${o}`).toContain(o)
    }
  })

  test('CONTROL: rng () => 0 is the IDENTITY permutation — a test pinned at 0 could not detect a missing shuffle', () => {
    expect(shuffle(threeOptionItem.options, threeOptionItem.options.length, () => 0))
      .toEqual(threeOptionItem.options)
    expect(shuffle(fourOptionItem.options, fourOptionItem.options.length, () => 0))
      .toEqual(fourOptionItem.options)
  })

  test('with a NON-identity rng (0.99) a 3-option question is reordered: [o2, o0, o1]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const [o0, o1, o2] = threeOptionItem.options
    const q = useDwIdiomQuiz([threeOptionItem]).current.value!
    expect(q.options).toEqual([o2, o0, o1])
    expect(q.options).not.toEqual(threeOptionItem.options)   // the shuffle really ran
    expect([...q.options].sort()).toEqual([...threeOptionItem.options].sort()) // multiset preserved
  })

  test('with a NON-identity rng (0.99) a 4-option question is reordered: [o3, o0, o1, o2]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const [o0, o1, o2, o3] = fourOptionItem.options
    const q = useDwIdiomQuiz([fourOptionItem]).current.value!
    expect(q.options).toEqual([o3, o0, o1, o2])
    expect(q.options).not.toEqual(fourOptionItem.options)
    expect([...q.options].sort()).toEqual([...fourOptionItem.options].sort())
  })

  test('the authored answer-first order does not survive: under 0.99 no question shows the answer first', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    // Every DIRECTION_IDIOMS item authors the answer as options[0]; an engine that
    // forgot to shuffle would leave index 0 correct on all 28 items.
    const quiz = useDwIdiomQuiz(DIRECTION_IDIOMS)
    for (const q of quiz.questions.value) {
      // Precondition on the DATA: if an item ever stops authoring the answer
      // first, this test stops proving anything about the shuffle — so fail here,
      // accusing directionIdioms.ts, rather than below, accusing the engine.
      expect(q.item.options[0], `${q.item.id} must author the answer first`).toBe(q.item.answer)
      expect(q.options[0], q.item.id).not.toBe(q.item.answer)
      expect(q.options.indexOf(q.item.answer), q.item.id).toBeGreaterThan(0)
    }
  })

  test('options are built ONCE — repeated reads of `current` return the identical array, same order', () => {
    const quiz = useDwIdiomQuiz(DIRECTION_IDIOMS.slice(0, 3))
    const first = quiz.current.value!.options
    const order = [...first]
    for (let n = 0; n < 5; n++) {
      expect(quiz.current.value!.options).toBe(first)
      expect(quiz.current.value!.options).toEqual(order)
    }
    quiz.pick(order[0]) // answering must not re-roll them either
    expect(quiz.current.value!.options).toBe(first)
    expect(quiz.current.value!.options).toEqual(order)
  })
})

describe('useDwIdiomQuiz — pick bookkeeping', () => {
  test('picking the answer grades true and locks the question', () => {
    const item = DIRECTION_IDIOMS[0]
    const quiz = useDwIdiomQuiz([item])
    quiz.pick(item.answer)
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe(item.answer)
    quiz.pick(firstWrongOption(item)) // second pick is a no-op
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe(item.answer)
  })

  test('picking a distractor grades false', () => {
    const item = DIRECTION_IDIOMS[0]
    const wrong = firstWrongOption(item)
    const quiz = useDwIdiomQuiz([item])
    quiz.pick(wrong)
    expect(quiz.current.value!.isCorrect).toBe(false)
    expect(quiz.current.value!.picked).toBe(wrong)
  })

  test('grading follows each item\'s own answer across the whole bank', () => {
    const quiz = useDwIdiomQuiz(DIRECTION_IDIOMS)
    for (const item of DIRECTION_IDIOMS) {
      quiz.pick(item.answer)
      expect(quiz.current.value!.isCorrect, item.id).toBe(true)
      quiz.advance()
    }
    expect(quiz.score.value).toBe(DIRECTION_IDIOMS.length)
    expect(quiz.wrongItems.value).toEqual([])
  })

  test('a wrong pick lands the item in wrongItems (the retry pool)', () => {
    const items = DIRECTION_IDIOMS.slice(0, 2)
    const quiz = useDwIdiomQuiz(items)
    quiz.pick(items[0].answer) // correct
    quiz.advance()
    quiz.pick(firstWrongOption(items[1])) // wrong
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(1)
    expect(quiz.wrongItems.value).toEqual([items[1]])
    expect(quiz.current.value).toBe(null)
  })

  test('total reflects the number of items; advance stops at the end', () => {
    const quiz = useDwIdiomQuiz(DIRECTION_IDIOMS.slice(0, 3))
    expect(quiz.total.value).toBe(3)
    for (let n = 0; n < 10; n++) quiz.advance()
    expect(quiz.currentIndex.value).toBe(3)
    expect(quiz.finished.value).toBe(true)
  })

  test('pick on a finished quiz is a no-op (no throw)', () => {
    const quiz = useDwIdiomQuiz([DIRECTION_IDIOMS[0]])
    quiz.advance()
    expect(() => quiz.pick('hin und her')).not.toThrow()
    expect(quiz.score.value).toBe(0)
  })
})

describe('DIRECTION_IDIOMS is never mutated in place', () => {
  test('a full run leaves the module-level bank byte-identical (same option arrays, same order)', () => {
    const before = DIRECTION_IDIOMS.map(i => ({ id: i.id, answer: i.answer, options: [...i.options] }))
    const optionArrayRefs = DIRECTION_IDIOMS.map(i => i.options)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const quiz = useDwIdiomQuiz(DIRECTION_IDIOMS)
    for (const item of DIRECTION_IDIOMS) { quiz.pick(item.answer); quiz.advance() }
    expect(DIRECTION_IDIOMS.map(i => ({ id: i.id, answer: i.answer, options: [...i.options] }))).toEqual(before)
    DIRECTION_IDIOMS.forEach((i, n) => expect(i.options).toBe(optionArrayRefs[n]))
  })

  test('a question\'s options array is a COPY, not the item\'s own array', () => {
    const q = useDwIdiomQuiz([threeOptionItem]).current.value!
    // toRaw() first: the questions ref hands out a reactive PROXY, which is never
    // === the raw array, so the bare identity check would pass even if the engine
    // handed out the item's own array.
    expect(toRaw(q.options)).not.toBe(threeOptionItem.options)
  })
})
