import {
  EXAM_DURATION_MS,
  PASSING_SCORE,
  TASK1_WEIGHT,
  TASK2_WEIGHT,
  type SimulatorReport,
  type SimulatorSession,
  type SimulatorStatus
} from '../data/simulatorC1'
import { WRITING_PROMPTS, type WritingDraft } from '../data/writingPrompts'
import { db } from '../db'

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

// ── Session CRUD (Task 5) ─────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error('No items to pick from')
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function createSession(): Promise<SimulatorSession> {
  const goetheC1 = WRITING_PROMPTS.filter(p => p.defaultRubric === 'goethe-c1')
  const forumPrompts = goetheC1.filter(p => p.type === 'forumsbeitrag')
  const emailPrompts = goetheC1.filter(p => p.type === 'formelle-email')

  if (forumPrompts.length === 0) {
    throw new Error('No Goethe C1 Forumsbeitrag prompts available in the catalogue.')
  }
  if (emailPrompts.length === 0) {
    throw new Error('No Goethe C1 formelle-email prompts available in the catalogue.')
  }

  const now = Date.now()
  const task1Prompt = pickRandom(forumPrompts)
  const task2Prompt = pickRandom(emailPrompts)

  const task1Draft: WritingDraft = {
    id: crypto.randomUUID(),
    promptId: task1Prompt.id,
    rubric: 'goethe-c1',
    text: '',
    wordCount: 0,
    createdAt: now,
    updatedAt: now
  }
  const task2Draft: WritingDraft = {
    id: crypto.randomUUID(),
    promptId: task2Prompt.id,
    rubric: 'goethe-c1',
    text: '',
    wordCount: 0,
    createdAt: now,
    updatedAt: now
  }

  await db.writingDrafts.put(task1Draft)
  await db.writingDrafts.put(task2Draft)

  const session: SimulatorSession = {
    id: crypto.randomUUID(),
    startedAt: now,
    endsAt: now + EXAM_DURATION_MS,
    status: 'in_progress',
    task1PromptId: task1Prompt.id,
    task1DraftId: task1Draft.id,
    task2PromptId: task2Prompt.id,
    task2DraftId: task2Draft.id
  }
  await db.simulatorSessions.put(session)
  return session
}

export async function resumeSession(id: string): Promise<SimulatorSession | null> {
  const session = await db.simulatorSessions.get(id)
  if (!session) return null
  // Auto-transition: in_progress + endsAt passed → submitted.
  if (session.status === 'in_progress' && session.endsAt <= Date.now()) {
    const updated: SimulatorSession = {
      ...session,
      status: 'submitted',
      submittedAt: Date.now()
    }
    await db.simulatorSessions.put(updated)
    return updated
  }
  return session
}

export async function abandonSession(id: string): Promise<void> {
  const now = Date.now()
  await db.simulatorSessions.update(id, {
    status: 'abandoned' as SimulatorStatus,
    abandonedAt: now
  })
}

export async function findActiveSession(): Promise<SimulatorSession | null> {
  // "Active" = in_progress OR submitted-but-not-graded. There can be more than
  // one in pathological tab-races; we return the most recent.
  const all = await db.simulatorSessions.toArray()
  const active = all
    .filter(s => s.status === 'in_progress' || s.status === 'submitted')
    .sort((a, b) => b.startedAt - a.startedAt)
  return active[0] ?? null
}

// ── Submit + grade (Task 5) ───────────────────────────────────────

export type GradeFn = (draft: WritingDraft) => Promise<WritingDraft>

export async function submitAndGrade(
  sessionId: string,
  gradeFn: GradeFn
): Promise<{ session: SimulatorSession; draft1: WritingDraft; draft2: WritingDraft }> {
  const session = await db.simulatorSessions.get(sessionId)
  if (!session) throw new Error(`Simulator session ${sessionId} not found`)

  let draft1 = await db.writingDrafts.get(session.task1DraftId)
  let draft2 = await db.writingDrafts.get(session.task2DraftId)
  if (!draft1 || !draft2) {
    throw new Error('Simulator drafts missing from writingDrafts table')
  }

  // Mark submitted if not already.
  let updatedSession: SimulatorSession = session.status === 'in_progress'
    ? { ...session, status: 'submitted', submittedAt: Date.now() }
    : session
  if (updatedSession !== session) {
    await db.simulatorSessions.put(updatedSession)
  }

  // Grade each task if not already graded. Idempotent.
  if (!draft1.result) draft1 = await gradeFn(draft1)
  if (!draft2.result) draft2 = await gradeFn(draft2)

  // Finalize.
  if (draft1.result && draft2.result) {
    updatedSession = { ...updatedSession, status: 'graded', gradedAt: Date.now() }
    await db.simulatorSessions.put(updatedSession)
  }

  return { session: updatedSession, draft1, draft2 }
}
