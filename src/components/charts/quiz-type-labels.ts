import type { QuizHistoryType } from '../../composables/useQuizHistory'

export const QUIZ_TYPE_LABEL: Record<QuizHistoryType, string> = {
  'noun-gender': 'Noun gender',
  'noun-translation': 'Noun translation',
  adjective: 'Adjective',
  'verb-translation': 'Verb translation',
  'verb-conjugation': 'Verb conjugation',
  'prep-case': 'Preposition · case',
  'prep-article': 'Preposition · article',
  'prep-two-way': 'Preposition · two-way',
  'decl-table': 'Declension · table',
  'decl-article': 'Declension · article',
  'decl-adjective': 'Declension · adj. ending',
  'decl-pronoun': 'Declension · pronouns',
  'decl-case-recognition': 'Declension · case ID',
  'decl-article-ai': 'Declension · article (AI)'
}

export const QUIZ_TYPE_DE: Record<QuizHistoryType, string> = {
  'noun-gender': 'Genus',
  'noun-translation': 'Substantive',
  adjective: 'Adjektive',
  'verb-translation': 'Übersetzen',
  'verb-conjugation': 'Konjugation',
  'prep-case': 'Präposition · Kasus',
  'prep-article': 'Präposition · Artikel',
  'prep-two-way': 'Präposition · Wechsel',
  'decl-table': 'Deklination · Tabelle',
  'decl-article': 'Deklination · Artikel',
  'decl-adjective': 'Deklination · Endung',
  'decl-pronoun': 'Deklination · Pronomen',
  'decl-case-recognition': 'Deklination · Kasus erkennen',
  'decl-article-ai': 'Deklination · Artikel (KI)'
}

export const QUIZ_TYPES_ORDER: QuizHistoryType[] = [
  'noun-gender',
  'noun-translation',
  'adjective',
  'verb-translation',
  'verb-conjugation',
  'prep-case',
  'prep-article',
  'prep-two-way',
  'decl-table',
  'decl-article',
  'decl-adjective',
  'decl-pronoun',
  'decl-case-recognition',
  'decl-article-ai'
]
