// Wortschatz module — FSRS scheduler wrapper + Vokabelstufe stage machine
// (see ADR-0027: stored FSRS state, derived ratings, gate-based Stufe promotion).
// FSRS drives *when* a Vokabel comes back; the Stufe ladder (STUFEN) drives
// *which format* it is asked in. The two axes are independent: a miss always
// demotes the Stufe and reschedules via Again, even when the item was served
// below its stored Stufe (offline Anwendung fallback, ADR-0027). No Vue/DOM.

import { fsrs, generatorParameters, createEmptyCard, Rating, type Card } from 'ts-fsrs'
import { STUFEN, type Stufe } from '../data/wortschatz'

export interface StoredFsrsCard {          // plain JSON — epochs, never Date
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review?: number
}

export interface VokabelProgress {
  vokabelId: string
  stufe: Stufe
  gatePasses: number
  gefestigt: boolean
  learnedVariants: string[]     // AI-rescued answers, accepted locally from then on
  fsrs: StoredFsrsCard
  introducedAt: number
  updatedAt: number
}

export type AnswerOutcome = 'wrong' | 'hint' | 'correct'

export const DESIRED_RETENTION = 0.9
export const GEFESTIGT_MIN_ELAPSED_DAYS = 21
export const GATE: Record<Stufe, number> = { erkennen: 2, luecke: 3, abruf: 3, anwendung: 1 }

const scheduler = fsrs(generatorParameters({ request_retention: DESIRED_RETENTION }))

function toCard(s: StoredFsrsCard): Card {
  return {
    due: new Date(s.due), stability: s.stability, difficulty: s.difficulty,
    elapsed_days: s.elapsed_days, scheduled_days: s.scheduled_days,
    learning_steps: s.learning_steps, reps: s.reps, lapses: s.lapses,
    state: s.state as Card['state'],
    ...(s.last_review != null ? { last_review: new Date(s.last_review) } : {})
  } as Card
}

function fromCard(c: Card): StoredFsrsCard {
  return {
    due: c.due.getTime(), stability: c.stability, difficulty: c.difficulty,
    elapsed_days: c.elapsed_days, scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps, reps: c.reps, lapses: c.lapses,
    state: c.state, ...(c.last_review ? { last_review: c.last_review.getTime() } : {})
  }
}

const RATING = { wrong: Rating.Again, hint: Rating.Hard, correct: Rating.Good } as const

export function newProgress(vokabelId: string, now: number): VokabelProgress {
  return {
    vokabelId, stufe: 'erkennen', gatePasses: 0, gefestigt: false,
    learnedVariants: [], fsrs: fromCard(createEmptyCard(new Date(now))),
    introducedAt: now, updatedAt: now
  }
}

export function applyOutcome(
  p: VokabelProgress, outcome: AnswerOutcome, now: number, servedStufe: Stufe
): VokabelProgress {
  const elapsedDays = p.fsrs.last_review != null
    ? (now - p.fsrs.last_review) / 86_400_000 : 0
  const next = fromCard(scheduler.next(toCard(p.fsrs), new Date(now), RATING[outcome]).card)

  let stufe = p.stufe
  let gatePasses = p.gatePasses
  let gefestigt = p.gefestigt
  const idx = STUFEN.indexOf(p.stufe)
  if (outcome === 'wrong') {
    stufe = STUFEN[Math.max(0, idx - 1)]
    gatePasses = 0
  } else if (outcome === 'correct' && servedStufe === p.stufe) {
    if (p.stufe === 'anwendung' && elapsedDays >= GEFESTIGT_MIN_ELAPSED_DAYS) {
      gefestigt = true
    } else if (gatePasses + 1 >= GATE[p.stufe] && idx < STUFEN.length - 1) {
      stufe = STUFEN[idx + 1]
      gatePasses = 0
    } else {
      gatePasses = gatePasses + 1
    }
  }
  // 'hint' and served-below-stage 'correct': schedule moves, gate does not.
  return { ...p, stufe, gatePasses, gefestigt, fsrs: next, updatedAt: now }
}

export function isDue(p: VokabelProgress, now: number): boolean {
  return !p.gefestigt && p.fsrs.due <= now
}
