//
// Sprechen Teil 2 — Discussion domain types (see CONTEXT.md → "Discussion").
// A Discussion row is EPHEMERAL working state: it exists so an in-progress
// conversation survives reloads and a failed analysis stays retryable.
// It is DELETED once the summary Run is recorded (or on abandon) — the
// conversation is never kept (user decision in the spec).

export type DiscussionStatus = 'in_progress' | 'submitted'

export type PartnerStance = 'pro' | 'contra'

/** See CONTEXT.md → "Modality". Fixed when the Discussion starts. */
export type Modality = 'typed' | 'spoken'

export const TURN_TARGETS = [6, 8, 10] as const
export type TurnTarget = (typeof TURN_TARGETS)[number]

/**
 * Timing captured for a SPOKEN learner turn. All of it is free — clock
 * arithmetic plus the recognizer's own restart count. No audio is kept.
 */
export interface TurnSpeech {
  spokenMs: number                 // mic open → turn ended
  reactionMs: number               // partner stopped speaking → mic opened
  restarts: number                 // endpointer gave up mid-turn ≈ long pause
  words: number
}

/** Per-final recognizer confidence, retained so the result page can flag shaky spans. */
export interface SpeechSpan {
  text: string
  confidence: number
}

export interface DiscussionTurn {
  role: 'learner' | 'partner'
  textDe: string
  at: number                       // ms epoch
  speech?: TurnSpeech              // learner turns in a spoken Discussion only
  spans?: SpeechSpan[]             // ditto
}

export interface DiscussionTopicRef {
  id: string
  titleDe: string
  statementDe: string
  source: 'seed' | 'custom'
}

export interface SprechenDiscussion {
  id: string                       // crypto.randomUUID()
  topic: DiscussionTopicRef
  turnTarget: TurnTarget
  stance: PartnerStance            // the PARTNER's stance, resolved at start
  modality: Modality               // typed or spoken — fixed at creation
  status: DiscussionStatus         // no graded/abandoned states — those rows are deleted
  turns: DiscussionTurn[]
  kiTippCount: number
  notes?: string                   // from the prep screen; stays visible during the run
  startedAt: number
  endedAt?: number                 // set when submitted
}

export function learnerTurnCount(d: Pick<SprechenDiscussion, 'turns'>): number {
  return d.turns.filter(t => t.role === 'learner').length
}

/** Aggregate fluency across a spoken Discussion. Returns null when nothing was spoken. */
export interface FluencySummary {
  wordsPerMinute: number
  avgReactionMs: number
  totalSpokenMs: number
  pauses: number
  turns: number
}

export function summarizeFluency(
  turns: readonly DiscussionTurn[]
): FluencySummary | null {
  const spoken = turns.filter(t => t.role === 'learner' && t.speech)
  if (spoken.length === 0) return null

  let words = 0
  let spokenMs = 0
  let reactionMs = 0
  let pauses = 0
  for (const t of spoken) {
    const s = t.speech!
    words += s.words
    spokenMs += s.spokenMs
    reactionMs += s.reactionMs
    pauses += s.restarts
  }

  // Guard the degenerate case: a turn can end in the same millisecond it began
  // if the learner taps Space twice, and dividing by zero minutes yields Infinity.
  const minutes = spokenMs / 60_000
  return {
    wordsPerMinute: minutes > 0 ? Math.round(words / minutes) : 0,
    avgReactionMs: Math.round(reactionMs / spoken.length),
    totalSpokenMs: spokenMs,
    pauses,
    turns: spoken.length
  }
}
