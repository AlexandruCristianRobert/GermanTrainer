import type { QuizHistoryType } from '../../composables/useQuizHistory'

export const QUIZ_TYPE_LABEL: Record<QuizHistoryType, string> = {
  'noun-gender': 'Noun gender',
  'noun-translation': 'Noun translation',
  adjective: 'Adjective',
  'verb-translation': 'Verb translation',
  'verb-conjugation': 'Verb conjugation'
}

export const QUIZ_TYPE_DE: Record<QuizHistoryType, string> = {
  'noun-gender': 'Genus',
  'noun-translation': 'Substantive',
  adjective: 'Adjektive',
  'verb-translation': 'Übersetzen',
  'verb-conjugation': 'Konjugation'
}

export const QUIZ_TYPES_ORDER: QuizHistoryType[] = [
  'noun-gender',
  'noun-translation',
  'adjective',
  'verb-translation',
  'verb-conjugation'
]
