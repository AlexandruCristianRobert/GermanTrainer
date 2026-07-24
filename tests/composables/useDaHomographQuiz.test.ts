import { describe, test, expect } from 'vitest'
import {
  useDaHomographQuiz, filterHomographItems, sampleHomographItems, splitHomographSentence,
} from '../../src/composables/useDaHomographQuiz'
import { DA_HOMOGRAPH, HOMOGRAPH_WORDS, type HomographItem } from '../../src/data/daHomograph'

const wordByKey = new Map(HOMOGRAPH_WORDS.map(w => [w.word, w]))

describe('filterHomographItems / sampleHomographItems', () => {
  test('filters by level', () => {
    const b2 = filterHomographItems({ levels: ['B2'] })
    expect(b2.length).toBeGreaterThan(0)
    expect(b2.every(i => i.level === 'B2')).toBe(true)
  })

  test('an empty/omitted filter matches every item', () => {
    expect(filterHomographItems({}).length).toBe(DA_HOMOGRAPH.length)
    expect(filterHomographItems().length).toBe(DA_HOMOGRAPH.length)
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = sampleHomographItems(5, { levels: ['B2'] })
    expect(sample.length).toBe(5)
    expect(sample.every(i => i.level === 'B2')).toBe(true)
  })
})

describe('useDaHomographQuiz — option composition', () => {
  test('every question exposes exactly two options: the word\'s compound + connector labels', () => {
    for (const item of DA_HOMOGRAPH) {
      const quiz = useDaHomographQuiz([item])
      const q = quiz.current.value!
      const w = wordByKey.get(item.word)!
      expect(q.options).toHaveLength(2)
      const byReading = new Map(q.options.map(o => [o.reading, o.label]))
      expect(byReading.get('compound')).toBe(w.compoundLabel)
      expect(byReading.get('connector')).toBe(w.connectorLabel)
    }
  })

  test('options are built regardless of order (both readings present as a set)', () => {
    const item = DA_HOMOGRAPH[0]
    const quiz = useDaHomographQuiz([item])
    const readings = quiz.current.value!.options.map(o => o.reading).sort()
    expect(readings).toEqual(['compound', 'connector'])
  })
})

describe('useDaHomographQuiz — pick bookkeeping', () => {
  test('picking the correct reading grades true and locks the question', () => {
    const item = DA_HOMOGRAPH[0]
    const quiz = useDaHomographQuiz([item])
    quiz.pick(item.reading)
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe(item.reading)
    // second pick on an already-answered question is a no-op
    const otherReading = item.reading === 'compound' ? 'connector' : 'compound'
    quiz.pick(otherReading)
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe(item.reading)
  })

  test('picking the wrong reading grades false', () => {
    const item = DA_HOMOGRAPH[0]
    const wrongReading = item.reading === 'compound' ? 'connector' : 'compound'
    const quiz = useDaHomographQuiz([item])
    quiz.pick(wrongReading)
    expect(quiz.current.value!.isCorrect).toBe(false)
    expect(quiz.current.value!.picked).toBe(wrongReading)
  })

  test('score/wrongItems/finished bookkeeping over a small mixed run', () => {
    const items: HomographItem[] = [DA_HOMOGRAPH[0], DA_HOMOGRAPH[1]]
    const quiz = useDaHomographQuiz(items)
    quiz.pick(items[0].reading) // correct
    quiz.advance()
    const wrongReading = items[1].reading === 'compound' ? 'connector' : 'compound'
    quiz.pick(wrongReading) // wrong
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(1)
    expect(quiz.wrongItems.value).toEqual([items[1]])
  })

  test('total reflects the number of items', () => {
    const items = DA_HOMOGRAPH.slice(0, 3)
    const quiz = useDaHomographQuiz(items)
    expect(quiz.total.value).toBe(3)
  })
})

describe('splitHomographSentence', () => {
  test('splits around the word, case-insensitive, preserving the sentence\'s own casing', () => {
    expect(splitHomographSentence('Ich schreibe dir, damit du Bescheid weißt.', 'damit')).toEqual({
      pre: 'Ich schreibe dir, ', match: 'damit', post: ' du Bescheid weißt.',
    })
  })

  test('matches a capitalized sentence-initial occurrence', () => {
    expect(splitHomographSentence('Damit ist alles klar.', 'damit')).toEqual({
      pre: '', match: 'Damit', post: ' ist alles klar.',
    })
  })

  test('does not match a word that is merely a substring of a longer word', () => {
    // 'darum' must not match inside e.g. a hypothetical 'Darumherum' — word-boundary check
    expect(splitHomographSentence('Herumgehen ist nicht darum.', 'darum')).toEqual({
      pre: 'Herumgehen ist nicht ', match: 'darum', post: '.',
    })
  })

  test('every DA_HOMOGRAPH item\'s sentence actually splits on its own word', () => {
    for (const item of DA_HOMOGRAPH) {
      const { match } = splitHomographSentence(item.sentence, item.word)
      expect(match.toLowerCase(), item.id).toBe(item.word)
    }
  })

  test('falls back to the whole sentence (empty match/post) when the word is absent', () => {
    expect(splitHomographSentence('No gap here.', 'damit')).toEqual({
      pre: 'No gap here.', match: '', post: '',
    })
  })
})
