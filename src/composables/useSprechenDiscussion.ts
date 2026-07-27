//
// Dexie CRUD for the ephemeral Discussion row (simulator-session pattern,
// but rows are DELETED on abandon and after the Run is recorded — there are
// no graded/abandoned states to keep).

import { db } from '../db'
import type {
  DiscussionTopicRef, DiscussionTurn, PartnerStance, SprechenDiscussion, TurnTarget
} from '../data/sprechen'

export async function createDiscussion(
  topic: DiscussionTopicRef,
  turnTarget: TurnTarget,
  stance: PartnerStance
): Promise<SprechenDiscussion> {
  const row: SprechenDiscussion = {
    id: crypto.randomUUID(),
    topic,
    turnTarget,
    stance,
    status: 'in_progress',
    turns: [],
    kiTippCount: 0,
    startedAt: Date.now()
  }
  await db.sprechenDiscussions.put(row)
  return row
}

/** Active = in_progress OR submitted-but-not-graded. Most recent wins. */
export async function findActiveDiscussion(): Promise<SprechenDiscussion | null> {
  const all = await db.sprechenDiscussions.toArray()
  const active = all.sort((a, b) => b.startedAt - a.startedAt)
  return active[0] ?? null
}

export async function appendTurn(id: string, turn: DiscussionTurn): Promise<void> {
  const row = await db.sprechenDiscussions.get(id)
  if (!row) throw new Error(`Discussion ${id} not found`)
  row.turns = [...row.turns, turn]
  await db.sprechenDiscussions.put(row)
}

export async function markSubmitted(id: string): Promise<void> {
  await db.sprechenDiscussions.update(id, { status: 'submitted' as const, endedAt: Date.now() })
}

export async function incrementKiTipp(id: string): Promise<void> {
  const row = await db.sprechenDiscussions.get(id)
  if (!row) throw new Error(`Discussion ${id} not found`)
  await db.sprechenDiscussions.update(id, { kiTippCount: row.kiTippCount + 1 })
}

/** Abandon = the learner walked away. The row is deleted, nothing recorded. */
export async function abandonDiscussion(id: string): Promise<void> {
  await db.sprechenDiscussions.delete(id)
}

/** Post-grading cleanup — called only AFTER saveQuizRun succeeded. */
export async function deleteDiscussion(id: string): Promise<void> {
  await db.sprechenDiscussions.delete(id)
}
