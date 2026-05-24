import {
  PASSING_SCORE,
  TASK1_WEIGHT,
  TASK2_WEIGHT,
  type SimulatorReport,
  type SimulatorSession
} from '../data/simulatorC1'
import type { WritingDraft } from '../data/writingPrompts'

// ── Pure helpers (Task 4) ─────────────────────────────────────────

export function computeRemaining(session: SimulatorSession, now: number): number {
  return Math.max(0, session.endsAt - now)
}

export function computeReport(
  _session: SimulatorSession,
  draft1: WritingDraft,
  draft2: WritingDraft
): SimulatorReport {
  const r1 = draft1.result
  const r2 = draft2.result
  const task1Score = r1 ? r1.totalScore : null
  const task2Score = r2 ? r2.totalScore : null
  const task1Band = r1 ? r1.bandEstimate : null
  const task2Band = r2 ? r2.bandEstimate : null

  let combinedScore: number | null = null
  if (task1Score !== null && task2Score !== null) {
    combinedScore = Math.round(task1Score * TASK1_WEIGHT + task2Score * TASK2_WEIGHT)
  }
  const passes = combinedScore !== null && combinedScore >= PASSING_SCORE

  return {
    task1Score,
    task2Score,
    task1Band,
    task2Band,
    combinedScore,
    passes
  }
}
