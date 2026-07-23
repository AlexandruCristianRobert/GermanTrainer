import { describe, test, expect } from 'vitest'
import { buildCaseQuestion, useDaCaseQuiz } from '../../src/composables/useDaCaseQuiz'
import {
  joinSubstitutionItems, splitGap, substitutionAnswer, type JoinedItem,
} from '../../src/composables/useDaSubstitutionQuiz'

const ALL = joinSubstitutionItems()

function fixtureWithAlsoAccept(base: JoinedItem, alsoCase: 'accusative' | 'dative'): JoinedItem {
  const primary = alsoCase === 'accusative' ? 'dative' : 'accusative'
  return {
    item: base.item,
    colloc: {
      ...base.colloc,
      preposition: 'an',
      case: primary,
      alsoAccept: [{ preposition: 'an', case: alsoCase }],
    },
  }
}

describe('buildCaseQuestion', () => {
  test('sentence assembly: pre + compound + post reconstructs the filled stem', () => {
    for (const ji of ALL.slice(0, 15)) {
      const q = buildCaseQuestion(ji)
      const { pre, post } = splitGap(ji.item.stem)
      expect(q.sentence.pre).toBe(pre)
      expect(q.sentence.post).toBe(post)
      expect(q.sentence.compound).toBe(substitutionAnswer(ji.item))
    }
  })

  test('acceptedCases is just the collocation\'s own case when there is no same-preposition alsoAccept', () => {
    const ji = ALL.find(j => !(j.colloc.alsoAccept ?? []).some(a => a.preposition === j.colloc.preposition))!
    expect(ji).toBeTruthy()
    const q = buildCaseQuestion(ji)
    expect(q.acceptedCases).toEqual([ji.colloc.case])
  })

  test('a same-preposition alsoAccept case is folded into acceptedCases', () => {
    const fixture = fixtureWithAlsoAccept(ALL[0], 'dative')
    const q = buildCaseQuestion(fixture)
    expect(q.acceptedCases.sort()).toEqual(['accusative', 'dative'])
  })

  test('a different-preposition alsoAccept case is NOT folded in (real dataset shape)', () => {
    // Cross-check against the real dataset: every alsoAccept entry there differs in
    // preposition from its own collocation, so acceptedCases stays a single case.
    const ji = ALL.find(j => (j.colloc.alsoAccept ?? []).length > 0)!
    expect(ji).toBeTruthy()
    const q = buildCaseQuestion(ji)
    expect(q.acceptedCases).toEqual([ji.colloc.case])
  })
})

describe('useDaCaseQuiz', () => {
  test('pick grades a correct accusative pick', () => {
    const ji = ALL.find(j => j.colloc.case === 'accusative')!
    const quiz = useDaCaseQuiz([ji])
    quiz.pick('accusative')
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe('accusative')
  })

  test('pick grades a correct dative pick', () => {
    const ji = ALL.find(j => j.colloc.case === 'dative')!
    const quiz = useDaCaseQuiz([ji])
    quiz.pick('dative')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('pick grades a wrong case and locks the question (second pick is a no-op)', () => {
    const ji = ALL.find(j => j.colloc.case === 'accusative')!
    const quiz = useDaCaseQuiz([ji])
    quiz.pick('dative')
    expect(quiz.current.value!.isCorrect).toBe(false)
    quiz.pick('accusative')
    expect(quiz.current.value!.isCorrect).toBe(false)
    expect(quiz.current.value!.picked).toBe('dative')
  })

  test('a same-prep alsoAccept case counts correct', () => {
    const fixture = fixtureWithAlsoAccept(ALL[0], 'dative')
    const quiz = useDaCaseQuiz([fixture])
    quiz.pick('dative')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('wrongItems / finished / score across a short run', () => {
    const items = ALL.slice(0, 2)
    const quiz = useDaCaseQuiz(items)
    const wrongCase = items[0].colloc.case === 'accusative' ? 'dative' : 'accusative'
    quiz.pick(wrongCase)
    quiz.advance()
    quiz.pick(items[1].colloc.case)
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.total.value).toBe(2)
    expect(quiz.score.value).toBe(1)
    expect(quiz.wrongItems.value.length).toBe(1)
    expect(quiz.wrongItems.value[0].item.id).toBe(items[0].item.id)
  })
})
