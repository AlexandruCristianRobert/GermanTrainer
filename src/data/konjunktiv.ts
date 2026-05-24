// Konjunktiv I "Indirekte Rede" rewriter — data shapes and constants.
//
// Generation + grading are both on-demand (no Dexie table); this file holds
// the static type/enum scaffolding the composable and Vue pages import.

export type KiDifficulty = 'easy' | 'medium' | 'hard'

export const KI_DIFFICULTIES = ['easy', 'medium', 'hard'] as const

export const KI_DIFFICULTY_LABEL: Record<KiDifficulty, string> = {
  easy:   'Easy · B1',
  medium: 'Medium · B2',
  hard:   'Hard · C1'
}

export const KI_DIFFICULTY_BLURB: Record<KiDifficulty, string> = {
  easy:   'Simple SVO quotes with er/sie/es subjects so Konjunktiv I works cleanly. Reporting verbs: sagte, meinte.',
  medium: 'Mixed subjects including plural and 1st person, which forces Konjunktiv II as a fallback in some cases. Reporting verbs: erklärte, behauptete, betonte.',
  hard:   'News-register: subordinate clauses, modal verbs, time-of-utterance shifts. Reporting verbs: konstatierte, dementierte, wies darauf hin.'
}

export const KI_TOPICS = ['Politik', 'Wirtschaft', 'Wissenschaft', 'Sport', 'Kultur'] as const
export type KiTopic = (typeof KI_TOPICS)[number]

/** One generated quote-rewrite question. */
export interface KiQuestion {
  /** Stable id assigned client-side (e.g. "ki-<timestamp>-<n>"). */
  id: string
  difficulty: KiDifficulty
  /** Direct-speech sentence including the speaker, colon, and German quote marks. */
  source: string
  /** Reporting clause shown as a stem before the user input. Ends with ", ". */
  reportingClause: string
  /** Canonical rewrite — used as fallback for grading and as the displayed answer. */
  referenceAnswer: string
  /** Whether the canonical answer uses K-I directly or has to fall back to K-II. */
  expectedMood: 'K1' | 'K2-fallback'
  /** Short English rationale shown after submit. */
  rationale: string
}

/** Output of the LLM judge for a single user submission. */
export interface KiJudgeResult {
  verdict: 'correct' | 'partially_correct' | 'incorrect'
  /** Canonical reference echoed back (always equals KiQuestion.referenceAnswer). */
  expected: string
  /** Other forms the judge will accept as correct. */
  acceptedVariants: string[]
  /** 1–3 sentence English explanation. */
  feedback: string
  /** Which mood the judge detected in the user's answer. */
  moodCheck: {
    used: 'K1' | 'K2' | 'indicative' | 'other'
    ok: boolean
  }
}

/** JSON schema for the generator response. Used by Gemini's responseSchema. */
export const KI_GENERATOR_SCHEMA = {
  type: 'object',
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          reportingClause: { type: 'string' },
          referenceAnswer: { type: 'string' },
          expectedMood: { type: 'string', enum: ['K1', 'K2-fallback'] },
          rationale: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] }
        },
        required: ['source', 'reportingClause', 'referenceAnswer', 'expectedMood', 'rationale', 'difficulty']
      }
    }
  },
  required: ['entries']
} as const

/** JSON schema for the judge response. */
export const KI_JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['correct', 'partially_correct', 'incorrect'] },
    expected: { type: 'string' },
    acceptedVariants: { type: 'array', items: { type: 'string' } },
    feedback: { type: 'string' },
    moodCheck: {
      type: 'object',
      properties: {
        used: { type: 'string', enum: ['K1', 'K2', 'indicative', 'other'] },
        ok: { type: 'boolean' }
      },
      required: ['used', 'ok']
    }
  },
  required: ['verdict', 'expected', 'acceptedVariants', 'feedback', 'moodCheck']
} as const
