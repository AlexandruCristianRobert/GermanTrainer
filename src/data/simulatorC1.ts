// Goethe C1 Schreiben Simulator — types and constants.
//
// The simulator wraps two Module-10 WritingDraft rows under a single
// 75-minute countdown. Drafts are stored in the existing writingDrafts
// table; sessions get their own table (writingSession-like).

export const EXAM_DURATION_MS = 75 * 60 * 1000      // 75 minutes
export const TASK1_WEIGHT = 0.6                      // Forumsbeitrag (heavier per Goethe spec)
export const TASK2_WEIGHT = 0.4                      // formelle E-Mail (lighter)
export const PASSING_SCORE = 60                      // module pass mark out of 100

export type SimulatorStatus =
  | 'in_progress'   // timer running; user can switch tasks and edit
  | 'submitted'     // user clicked Submit (or timer expired); grading in flight
  | 'graded'        // both tasks graded; result page reachable
  | 'abandoned'     // user explicitly abandoned; row preserved but locked

export const SIMULATOR_STATUSES: SimulatorStatus[] = [
  'in_progress', 'submitted', 'graded', 'abandoned'
]

/** One mock-exam session. */
export interface SimulatorSession {
  id: string                       // crypto.randomUUID()
  startedAt: number                // ms epoch when "Start new exam" was clicked
  endsAt: number                   // startedAt + EXAM_DURATION_MS
  status: SimulatorStatus
  task1PromptId: string            // resolves via getPromptById to a Forumsbeitrag (Goethe C1)
  task1DraftId: string             // existing writingDrafts row, created at session-creation time
  task2PromptId: string            // resolves to a formelle E-Mail (Goethe C1)
  task2DraftId: string             // existing writingDrafts row
  submittedAt?: number             // ms epoch when user clicked Submit (or timer ran out)
  gradedAt?: number                // ms epoch when the second grade completed
  abandonedAt?: number             // ms epoch when user abandoned
  historySavedAt?: number          // ms epoch when saveQuizRun was last called for this session
}

/** Computed per-session from the drafts' .result fields. Not persisted standalone. */
export interface SimulatorReport {
  task1Score: number | null        // null if grading failed or not done
  task2Score: number | null
  task1Band: string | null
  task2Band: string | null
  combinedScore: number | null     // task1*0.6 + task2*0.4, rounded to int; null if either is null
  passes: boolean                  // combinedScore !== null && combinedScore >= PASSING_SCORE
}
