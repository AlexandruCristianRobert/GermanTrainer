import { describe, it, expect } from 'vitest'
import { useNounQuiz } from '../../src/composables/useNounQuiz'
import type { Noun } from '../../src/db/types'

const sample: Noun[] = [
  { id: 1, german: 'Tisch', gender: 'der', english: 'table', group: 'Furniture', createdAt: 0 },
  { id: 2, german: 'Frau', gender: 'die', english: 'woman', group: 'Family', createdAt: 0 },
  { id: 3, german: 'Haus', gender: 'das', english: 'house/home', group: 'House', createdAt: 0 }
]

describe('useNounQuiz — gender mode', () => {
  it('starts at index 0 and not finished', () => {
    const q = useNounQuiz(sample, 'gender')
    expect(q.currentIndex.value).toBe(0)
    expect(q.finished.value).toBe(false)
  })

  it('records correct gender answer', () => {
    const q = useNounQuiz(sample, 'gender')
    q.submit('der')
    expect(q.questions.value[0].isCorrect).toBe(true)
    expect(q.questions.value[0].userAnswer).toBe('der')
  })

  it('records incorrect gender answer', () => {
    const q = useNounQuiz(sample, 'gender')
    q.submit('die')
    expect(q.questions.value[0].isCorrect).toBe(false)
  })

  it('advance moves to next question', () => {
    const q = useNounQuiz(sample, 'gender')
    q.submit('der')
    q.advance()
    expect(q.currentIndex.value).toBe(1)
  })

  it('finished becomes true after answering all questions', () => {
    const q = useNounQuiz(sample, 'gender')
    q.submit('der'); q.advance()
    q.submit('die'); q.advance()
    q.submit('das'); q.advance()
    expect(q.finished.value).toBe(true)
  })

  it('score reflects correct answers', () => {
    const q = useNounQuiz(sample, 'gender')
    q.submit('der'); q.advance()
    q.submit('der'); q.advance()
    q.submit('das'); q.advance()
    expect(q.score.value).toBe(2)
    expect(q.total.value).toBe(3)
  })
})

describe('useNounQuiz — translation mode', () => {
  it('matches case-insensitively and trimmed', () => {
    const q = useNounQuiz(sample, 'translation')
    q.submit('  Table  ')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('accepts any segment of slash-separated multi-answer', () => {
    const q2 = useNounQuiz(sample, 'translation')
    q2.submit('table'); q2.advance()
    q2.submit('woman'); q2.advance()
    q2.submit('home'); q2.advance()
    expect(q2.score.value).toBe(3)
  })

  it('rejects an empty answer', () => {
    const q = useNounQuiz(sample, 'translation')
    q.submit('')
    expect(q.questions.value[0].isCorrect).toBe(false)
  })
})
