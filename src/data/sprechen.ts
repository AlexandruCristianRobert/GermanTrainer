//
// Sprechen Teil 2 — Discussion domain types (see CONTEXT.md → "Discussion").
// A Discussion row is EPHEMERAL working state: it exists so an in-progress
// conversation survives reloads and a failed analysis stays retryable.
// It is DELETED once the summary Run is recorded (or on abandon) — the
// conversation is discarded (user decision in the spec) — what outlives it is
// the Run summary plus one Archived correction per marked mistake.

import type { GliederungKey } from './sprechenVortragsmittel'

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

/**
 * Setup → prep → runner handoff. One stash for both Modalities: the flow is
 * identical and only the input surface differs, so `modality` rides along and
 * the runner picks its surface from it. sessionStorage — it must survive a
 * route change but not a new tab.
 */
export const TEIL2_STASH_KEY = 'gt:lastSprechenTeil2'

export interface Teil2RunStash {
  topic: DiscussionTopicRef
  modality: Modality
  turnTarget: TurnTarget
  stance: PartnerStance
  prepSeconds: number
  hintsOn: boolean
  notes: string
  model: string
}

/**
 * The learner's own sentence containing a marked mistake — the context an
 * [Archived correction] keeps so the Korrekturdrill can replay their wording
 * rather than an invented one. Falls back to the whole turn when there is no
 * sentence boundary to cut on.
 */
export function sentenceAround(text: string, at: number): string {
  if (text.length === 0) return ''
  // Clamp to the LAST CHARACTER, not to text.length: an offset past the end
  // would sit beyond the final terminator, making the "sentence" start and end
  // at the same point and collapsing to the whole turn.
  const idx = Math.min(Math.max(0, at), text.length - 1)
  const before = text.slice(0, idx)
  // Start just past the nearest preceding terminator, whichever it was.
  const start = Math.max(
    before.lastIndexOf('.') + 1,
    before.lastIndexOf('?') + 1,
    before.lastIndexOf('!') + 1
  )
  const endRel = text.slice(idx).search(/[.?!]/)
  const end = endRel < 0 ? text.length : idx + endRel + 1
  return text.slice(start, end).trim() || text.trim()
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

/* ────────────────────────────────────────────────────────────────────────────
   Sprechen Teil 1 — Vortrag. See CONTEXT.md → "Vortrag", "Rede", "Nachfrage".

   A Vortrag is the whole practice unit: one Vortragsthema, one Rede, one
   Nachfrage, one grade, one Run. The Rede is the monologue inside it and is
   composed in ONE take — never point by point (ADR-0014).
   ──────────────────────────────────────────────────────────────────────────── */

export type VortragStatus = 'in_progress' | 'submitted'

export interface VortragThemaRef {
  id: string
  titleDe: string
  taskDe: string
  source: 'seed' | 'custom'
}

/** The four help switches, frozen when the Vortrag starts. */
export interface VortragHelps {
  hints: boolean       // drawer, Move nudge, Rettungsleine, stuck detection
  checklist: boolean   // live Gliederung checklist + Redezeit bar
  kiTipp: boolean      // the one paid live help
  hardLimit: boolean   // spoken only — always false when typed
}

/** What the Hilfe-Protokoll counts. Descriptive only, never scored. */
export type HelpKind = 'drawer' | 'phrase' | 'rettungsleine' | 'nudge' | 'kitipp' | 'vorsprechen' | 'stuck'

export interface HelpLogEntry {
  at: number           // ms epoch
  kind: HelpKind
}

/** One line of the Vortragsplan: a keyword against a Gliederungspunkt. */
export interface VortragPlanEntry {
  key: GliederungKey
  keyword: string
}

export interface RedeRecord {
  textDe: string
  seconds?: number        // spoken only — real elapsed
  restarts?: number       // spoken only — long-pause proxy
  spans?: SpeechSpan[]    // spoken only
  firstSpokenAt?: number  // ms epoch of the first mic open (F2)
  wallSeconds?: number    // wall time since firstSpokenAt while the runner was open (F2) — closed-tab time excluded
}

export interface NachfrageRecord {
  questionDe: string
  answerDe: string
}

export interface SprechenVortrag {
  id: string                     // crypto.randomUUID()
  thema: VortragThemaRef
  modality: Modality             // fixed at creation
  helps: VortragHelps            // frozen at creation
  plan: VortragPlanEntry[]       // the Vortragsplan — five entries, keywords may be ''
  notes: string
  rede: RedeRecord
  nachfrage?: NachfrageRecord
  kiTippCount: number
  helpLog: HelpLogEntry[]
  status: VortragStatus          // no graded/abandoned states — those rows are deleted
  startedAt: number
  endedAt?: number                // set when submitted
  downgradedAt?: number           // F13 — mic denied mid-Rede; modality deliberately stays 'spoken'
}

export const TEIL1_STASH_KEY = 'gt:lastSprechenTeil1'

/** Setup → prep → runner handoff, sessionStorage. */
export interface Teil1RunStash {
  thema: VortragThemaRef
  modality: Modality
  helps: VortragHelps
  prepSeconds: number
  plan: VortragPlanEntry[]
  notes: string
  model: string
}

export const PREP_SECONDS = [0, 180, 900] as const
