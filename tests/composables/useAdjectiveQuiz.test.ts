import { describe, it, expect } from 'vitest'
import { useAdjectiveQuiz, blankSentence } from '../../src/composables/useAdjectiveQuiz'
import type { SentenceItem } from '../../src/composables/useClaude'

const sample: SentenceItem[] = [
  { adjective_base: 'schön', adjective_inflected: 'schöne', sentence: 'Das ist eine schöne Blume.', hint: 'lovely to look at' },
  { adjective_base: 'alt', adjective_inflected: 'alten', sentence: 'Der alten Mann sitzt.', hint: 'not young' }
]

describe('blankSentence', () => {
  it('replaces the inflected form with underscores, preserving length', () => {
    const out = blankSentence('Das ist eine schöne Blume.', 'schöne')
    expect(out).toContain('______')
    expect(out).not.toContain('schöne')
  })

  it('matches case-insensitively', () => {
    const out = blankSentence('Eine Schöne Blume.', 'schöne')
    expect(out).not.toMatch(/schöne/i)
  })
})

describe('useAdjectiveQuiz', () => {
  it('accepts the inflected form as correct', () => {
    const q = useAdjectiveQuiz(sample)
    q.submit('schöne')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('accepts the base form as correct', () => {
    const q = useAdjectiveQuiz(sample)
    q.submit('schön')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('matches case-insensitively and trimmed', () => {
    const q = useAdjectiveQuiz(sample)
    q.submit('  Schöne  ')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('rejects unrelated answer', () => {
    const q = useAdjectiveQuiz(sample)
    q.submit('alt')
    expect(q.questions.value[0].isCorrect).toBe(false)
  })

  it('finished after advancing past last question', () => {
    const q = useAdjectiveQuiz(sample)
    q.submit('schöne'); q.advance()
    q.submit('alten'); q.advance()
    expect(q.finished.value).toBe(true)
    expect(q.score.value).toBe(2)
  })
})
