import { describe, test, expect } from 'vitest'
import {
  useDaContrastQuiz, filterContrastItems, sampleContrastItems, splitContrastSentence,
} from '../../src/composables/useDaContrastQuiz'
import { CONTRAST_SETS, DA_CONTRAST, type ContrastItem } from '../../src/data/daContrast'

const setByKey = new Map(CONTRAST_SETS.map(s => [s.key, s]))

describe('filterContrastItems / sampleContrastItems', () => {
  test('filters by level', () => {
    const b2 = filterContrastItems({ levels: ['B2'] })
    expect(b2.length).toBeGreaterThan(0)
    expect(b2.every(i => i.level === 'B2')).toBe(true)
  })

  test('an empty/omitted filter matches every item', () => {
    expect(filterContrastItems({}).length).toBe(DA_CONTRAST.length)
    expect(filterContrastItems().length).toBe(DA_CONTRAST.length)
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = sampleContrastItems(5, { levels: ['B2'] })
    expect(sample.length).toBe(5)
    expect(sample.every(i => i.level === 'B2')).toBe(true)
  })
})

describe('useDaContrastQuiz — option composition', () => {
  test('every question exposes the FULL set of options (2-3), each carrying its sense', () => {
    for (const item of DA_CONTRAST) {
      const quiz = useDaContrastQuiz([item])
      const q = quiz.current.value!
      const set = setByKey.get(item.contrastKey)!
      expect(q.options).toEqual(set.options)
      expect(q.options.length).toBeGreaterThanOrEqual(2)
      expect(q.options.length).toBeLessThanOrEqual(3)
      for (const o of q.options) {
        expect(o.sense.length).toBeGreaterThan(0)
      }
    }
  })

  test('word matches the item\'s set headword', () => {
    for (const item of DA_CONTRAST) {
      const quiz = useDaContrastQuiz([item])
      const q = quiz.current.value!
      expect(q.word).toBe(setByKey.get(item.contrastKey)!.word)
    }
  })

  test('exactly one option preposition matches item.correct', () => {
    for (const item of DA_CONTRAST) {
      const quiz = useDaContrastQuiz([item])
      const q = quiz.current.value!
      expect(q.options.filter(o => o.preposition === item.correct)).toHaveLength(1)
    }
  })
})

describe('useDaContrastQuiz — pickOption bookkeeping', () => {
  test('picking the correct preposition grades true and locks the question', () => {
    const item = DA_CONTRAST[0]
    const quiz = useDaContrastQuiz([item])
    quiz.pickOption(item.correct)
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe(item.correct)
    // second pick on an already-answered question is a no-op
    const wrongOpt = setByKey.get(item.contrastKey)!.options.find(o => o.preposition !== item.correct)!.preposition
    quiz.pickOption(wrongOpt)
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe(item.correct)
  })

  test('picking a wrong preposition grades false', () => {
    const item = DA_CONTRAST.find(i => setByKey.get(i.contrastKey)!.options.length >= 2)!
    const wrongOpt = setByKey.get(item.contrastKey)!.options.find(o => o.preposition !== item.correct)!.preposition
    const quiz = useDaContrastQuiz([item])
    quiz.pickOption(wrongOpt)
    expect(quiz.current.value!.isCorrect).toBe(false)
    expect(quiz.current.value!.picked).toBe(wrongOpt)
  })

  test('score/wrongItems/finished bookkeeping over a small mixed run', () => {
    const items: ContrastItem[] = [DA_CONTRAST[0], DA_CONTRAST[1]]
    const quiz = useDaContrastQuiz(items)
    quiz.pickOption(items[0].correct) // correct
    quiz.advance()
    const wrongOpt = setByKey.get(items[1].contrastKey)!.options.find(o => o.preposition !== items[1].correct)!.preposition
    quiz.pickOption(wrongOpt) // wrong
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(1)
    expect(quiz.wrongItems.value).toEqual([items[1]])
  })

  test('total reflects the number of items', () => {
    const items = DA_CONTRAST.slice(0, 3)
    const quiz = useDaContrastQuiz(items)
    expect(quiz.total.value).toBe(3)
  })
})

describe('splitContrastSentence', () => {
  test('splits around the single gap', () => {
    expect(splitContrastSentence('Ich freue mich ___ den Urlaub.')).toEqual({
      pre: 'Ich freue mich ', post: ' den Urlaub.',
    })
  })

  test('falls back to the whole sentence (empty post) when there is no gap', () => {
    expect(splitContrastSentence('No gap here.')).toEqual({ pre: 'No gap here.', post: '' })
  })
})
