import { describe, test, expect } from 'vitest'
import {
  useDaRelativeQuiz, filterRelativeItems, sampleRelativeItems, splitRelativeSentence,
} from '../../src/composables/useDaRelativeQuiz'
import { DA_RELATIVE, type RelativeItem } from '../../src/data/daRelative'

describe('filterRelativeItems / sampleRelativeItems', () => {
  test('filters by level', () => {
    const b2 = filterRelativeItems({ levels: ['B2'] })
    expect(b2.length).toBeGreaterThan(0)
    expect(b2.every(i => i.level === 'B2')).toBe(true)
  })

  test('an empty/omitted filter matches every item', () => {
    expect(filterRelativeItems({}).length).toBe(DA_RELATIVE.length)
    expect(filterRelativeItems().length).toBe(DA_RELATIVE.length)
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = sampleRelativeItems(5, { levels: ['B2'] })
    expect(sample.length).toBe(5)
    expect(sample.every(i => i.level === 'B2')).toBe(true)
  })
})

describe('useDaRelativeQuiz — option composition', () => {
  test('every question exposes exactly two options: prepForm + woForm (order may be shuffled)', () => {
    for (const item of DA_RELATIVE) {
      const quiz = useDaRelativeQuiz([item])
      const q = quiz.current.value!
      expect(q.options).toHaveLength(2)
      expect([...q.options].sort()).toEqual([item.prepForm, item.woForm].sort())
    }
  })

  test('accepted mirrors relativeAccepted(item) — preferred prepForm first for thing items', () => {
    for (const item of DA_RELATIVE.filter(i => i.antecedentKind === 'thing')) {
      const quiz = useDaRelativeQuiz([item])
      expect(quiz.current.value!.accepted).toEqual([item.prepForm, item.woForm])
    }
  })

  test('accepted is the single wo-form for indefinite items', () => {
    for (const item of DA_RELATIVE.filter(i => i.antecedentKind === 'indefinite')) {
      const quiz = useDaRelativeQuiz([item])
      expect(quiz.current.value!.accepted).toEqual([item.woForm])
    }
  })

  test('accepted is the single prep-form for person items', () => {
    for (const item of DA_RELATIVE.filter(i => i.antecedentKind === 'person')) {
      const quiz = useDaRelativeQuiz([item])
      expect(quiz.current.value!.accepted).toEqual([item.prepForm])
    }
  })
})

describe('useDaRelativeQuiz — grading', () => {
  test('thing items accept BOTH prepForm and woForm as correct', () => {
    for (const item of DA_RELATIVE.filter(i => i.antecedentKind === 'thing')) {
      const q1 = useDaRelativeQuiz([item])
      q1.pick(item.prepForm)
      expect(q1.current.value!.isCorrect, `${item.id} prepForm`).toBe(true)

      const q2 = useDaRelativeQuiz([item])
      q2.pick(item.woForm)
      expect(q2.current.value!.isCorrect, `${item.id} woForm`).toBe(true)
    }
  })

  test('indefinite items accept ONLY the wo-form — prepForm grades false', () => {
    for (const item of DA_RELATIVE.filter(i => i.antecedentKind === 'indefinite')) {
      const qWo = useDaRelativeQuiz([item])
      qWo.pick(item.woForm)
      expect(qWo.current.value!.isCorrect, `${item.id} woForm`).toBe(true)

      const qPrep = useDaRelativeQuiz([item])
      qPrep.pick(item.prepForm)
      expect(qPrep.current.value!.isCorrect, `${item.id} prepForm`).toBe(false)
    }
  })

  test('person items accept ONLY prep + pronoun — woForm grades false', () => {
    for (const item of DA_RELATIVE.filter(i => i.antecedentKind === 'person')) {
      const qPrep = useDaRelativeQuiz([item])
      qPrep.pick(item.prepForm)
      expect(qPrep.current.value!.isCorrect, `${item.id} prepForm`).toBe(true)

      const qWo = useDaRelativeQuiz([item])
      qWo.pick(item.woForm)
      expect(qWo.current.value!.isCorrect, `${item.id} woForm`).toBe(false)
    }
  })

  test('second pick on an already-answered question is a no-op', () => {
    const item = DA_RELATIVE.find(i => i.antecedentKind === 'person')!
    const quiz = useDaRelativeQuiz([item])
    quiz.pick(item.prepForm)
    quiz.pick(item.woForm)
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe(item.prepForm)
  })

  test('score/wrongItems/finished bookkeeping over a small mixed run', () => {
    const person = DA_RELATIVE.find(i => i.antecedentKind === 'person')!
    const indefinite = DA_RELATIVE.find(i => i.antecedentKind === 'indefinite')!
    const items: RelativeItem[] = [person, indefinite]
    const quiz = useDaRelativeQuiz(items)
    quiz.pick(person.prepForm) // correct
    quiz.advance()
    quiz.pick(indefinite.prepForm) // wrong — needs the wo-form
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(1)
    expect(quiz.wrongItems.value).toEqual([items[1]])
  })

  test('total reflects the number of items', () => {
    const items = DA_RELATIVE.slice(0, 3)
    const quiz = useDaRelativeQuiz(items)
    expect(quiz.total.value).toBe(3)
  })
})

describe('splitRelativeSentence', () => {
  test('splits around the single gap', () => {
    expect(splitRelativeSentence('Das ist alles, ___ ich mich erinnere.')).toEqual({
      pre: 'Das ist alles, ', post: ' ich mich erinnere.',
    })
  })

  test('every DA_RELATIVE sentence round-trips through pre + "___" + post', () => {
    for (const item of DA_RELATIVE) {
      const { pre, post } = splitRelativeSentence(item.sentence)
      expect(pre + '___' + post, item.id).toBe(item.sentence)
    }
  })

  test('falls back to the whole sentence (empty post) when no gap is present', () => {
    expect(splitRelativeSentence('No gap here.')).toEqual({ pre: 'No gap here.', post: '' })
  })
})
