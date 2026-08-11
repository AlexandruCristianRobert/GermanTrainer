import { describe, test, expect } from 'vitest'
import { useDativeQuiz, type DativeQuizCard } from '../../src/composables/useDativeDrill'

function card(over: Partial<DativeQuizCard> = {}): DativeQuizCard {
  return {
    key: 'k1', prompt: 'Die Schuhe ___ mir.', answers: ['gefallen'],
    options: ['gefällt', 'gefallen'], translation: 'I like the shoes.',
    note: null, ledgerKey: 'gefallen', sourceIndex: 0,
    picked: null, typed: null, isCorrect: null, ...over,
  }
}

describe('useDativeQuiz', () => {
  test('pick grading, score, finish, wrongIndexes', () => {
    const quiz = useDativeQuiz([card(), card({ key: 'k2', sourceIndex: 1 })])
    quiz.pickOption('gefallen')
    expect(quiz.current.value!.isCorrect).toBe(true)
    quiz.advance()
    quiz.pickOption('gefällt')
    expect(quiz.current.value!.isCorrect).toBe(false)
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(1)
    expect(quiz.wrongIndexes.value).toEqual([1])
  })

  test('typed grading folds umlauts, accepts alternatives, strips trailing punctuation', () => {
    const quiz = useDativeQuiz([card({
      prompt: 'I like the shoes.',
      answers: ['Die Schuhe gefallen mir', 'Mir gefallen die Schuhe'],
      options: [],
    })])
    quiz.submitText('mir gefallen die schuhe.')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('double answer ignored; empty typed input is wrong', () => {
    const quiz = useDativeQuiz([card()])
    quiz.pickOption('gefallen')
    quiz.pickOption('gefällt')
    expect(quiz.current.value!.isCorrect).toBe(true)
    const quiz2 = useDativeQuiz([card({ options: [] })])
    quiz2.submitText('   ')
    expect(quiz2.current.value!.isCorrect).toBe(false)
  })
})
