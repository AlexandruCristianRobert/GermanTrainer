//
// Sprechen Teil 2 — Discussion domain types (see CONTEXT.md → "Discussion").
// A Discussion row is EPHEMERAL working state: it exists so an in-progress
// conversation survives reloads and a failed analysis stays retryable.
// It is DELETED once the summary Run is recorded (or on abandon) — the
// conversation is never kept (user decision in the spec).

export type DiscussionStatus = 'in_progress' | 'submitted'

export type PartnerStance = 'pro' | 'contra'

export const TURN_TARGETS = [6, 8, 10] as const
export type TurnTarget = (typeof TURN_TARGETS)[number]

export interface DiscussionTurn {
  role: 'learner' | 'partner'
  textDe: string
  at: number                       // ms epoch
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
  status: DiscussionStatus         // no graded/abandoned states — those rows are deleted
  turns: DiscussionTurn[]
  kiTippCount: number
  startedAt: number
  endedAt?: number                 // set when submitted
}

export function learnerTurnCount(d: Pick<SprechenDiscussion, 'turns'>): number {
  return d.turns.filter(t => t.role === 'learner').length
}
