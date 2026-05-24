// Passiv transformation drill — data shapes and constants.

export type PassivDifficulty = 'easy' | 'medium' | 'hard'

export const PASSIV_DIFFICULTIES = ['easy', 'medium', 'hard'] as const

export const PASSIV_DIFFICULTY_LABEL: Record<PassivDifficulty, string> = {
  easy:   'Easy · B1',
  medium: 'Medium · B2',
  hard:   'Hard · C1'
}

export const PASSIV_DIFFICULTY_BLURB: Record<PassivDifficulty, string> = {
  easy:   'Simple transitive present-tense sentences with clear actor and object.',
  medium: 'Past tenses, dative-bearing verbs, separable prefixes, mild idiomatic constructions.',
  hard:   'Subordinate clauses, modal verbs, less-frequent verb-noun collocations; preferred targets are sich-lassen and man-Konstruktion.'
}

export type TransformationType =
  | 'vorgangspassiv'
  | 'zustandspassiv'
  | 'sich-lassen'
  | 'sein-zu'
  | 'bar-adjektiv'
  | 'man-konstruktion'

export const TRANSFORMATION_TYPES: TransformationType[] = [
  'vorgangspassiv', 'zustandspassiv', 'sich-lassen',
  'sein-zu', 'bar-adjektiv', 'man-konstruktion'
]

export const TRANSFORMATION_LABELS: Record<TransformationType, string> = {
  'vorgangspassiv':    'Vorgangspassiv (werden + Partizip II)',
  'zustandspassiv':    'Zustandspassiv (sein + Partizip II)',
  'sich-lassen':       'sich lassen + Infinitiv',
  'sein-zu':           'sein + zu + Infinitiv',
  'bar-adjektiv':      '-bar / -lich Adjektiv',
  'man-konstruktion':  'man-Konstruktion (aktiv)'
}

export const TRANSFORMATION_EXAMPLES: Record<TransformationType, string> = {
  'vorgangspassiv':    'Das Haus wird gebaut.',
  'zustandspassiv':    'Das Haus ist gebaut.',
  'sich-lassen':       'Das lässt sich erklären.',
  'sein-zu':           'Das ist zu erklären.',
  'bar-adjektiv':      'Das ist erklärbar.',
  'man-konstruktion':  'Man erklärt das.'
}

/** One generated active-sentence-plus-target question. */
export interface PassivQuestion {
  id: string
  difficulty: PassivDifficulty
  /** Active source sentence — e.g. "Der Techniker repariert das Gerät." */
  active: string
  /** The transformation the user must produce on this question. */
  target: TransformationType
  /** Which transformations are grammatically legal for the source's main verb. */
  legalTypes: TransformationType[]
  /** Canonical answer for the target — used as fallback for grading and display. */
  referenceAnswer: string
  /** English explanation shown after submit. */
  rationale: string
}

/** Output of the LLM judge. */
export interface PassivJudgeResult {
  verdict: 'correct' | 'partially_correct' | 'incorrect'
  expected: string
  acceptedVariants: string[]
  feedback: string
  formCheck: {
    usedType: TransformationType | 'unknown'
    matchesTarget: boolean
  }
}

/** Generator JSON schema. */
export const PASSIV_GENERATOR_SCHEMA = {
  type: 'object',
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          active: { type: 'string' },
          target: { type: 'string', enum: TRANSFORMATION_TYPES },
          legalTypes: { type: 'array', items: { type: 'string', enum: TRANSFORMATION_TYPES } },
          referenceAnswer: { type: 'string' },
          rationale: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] }
        },
        required: ['active', 'target', 'legalTypes', 'referenceAnswer', 'rationale', 'difficulty']
      }
    }
  },
  required: ['entries']
} as const

/** Judge JSON schema. */
export const PASSIV_JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['correct', 'partially_correct', 'incorrect'] },
    expected: { type: 'string' },
    acceptedVariants: { type: 'array', items: { type: 'string' } },
    feedback: { type: 'string' },
    formCheck: {
      type: 'object',
      properties: {
        usedType: { type: 'string', enum: [...TRANSFORMATION_TYPES, 'unknown'] },
        matchesTarget: { type: 'boolean' }
      },
      required: ['usedType', 'matchesTarget']
    }
  },
  required: ['verdict', 'expected', 'acceptedVariants', 'feedback', 'formCheck']
} as const
