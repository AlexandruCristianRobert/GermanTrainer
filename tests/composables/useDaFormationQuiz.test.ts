import { describe, test, expect } from 'vitest'
import { useDaFormationQuiz, buildFormationItems, type FormationChoice } from '../../src/composables/useDaFormationQuiz'

describe('buildFormationItems', () => {
  test('includes traps when asked, only compoundable otherwise', () => {
    expect(buildFormationItems(true).length).toBe(27)
    expect(buildFormationItems(false).length).toBe(19)
  })
})

describe('useDaFormationQuiz', () => {
  test('grades da/dar/none picks and finishes', () => {
    const items = buildFormationItems(true).filter(i => ['für', 'auf', 'ohne'].includes(i.preposition))
    const quiz = useDaFormationQuiz(items)
    const answers: Record<string, FormationChoice> = { 'für': 'da', 'auf': 'dar', 'ohne': 'none' }
    for (let i = 0; i < 3; i++) {
      quiz.pick(answers[quiz.current.value!.preposition])
      expect(quiz.current.value!.isCorrect).toBe(true)
      quiz.advance()
    }
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(3)
  })

  test('wrong pick lands in wrongItems', () => {
    const items = buildFormationItems(false).filter(i => i.preposition === 'auf')
    const quiz = useDaFormationQuiz(items)
    quiz.pick('da') // wrong: darauf
    quiz.advance()
    expect(quiz.score.value).toBe(0)
    expect(quiz.wrongItems.value.length).toBe(1)
  })
})
