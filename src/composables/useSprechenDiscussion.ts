//
// Dexie CRUD for the ephemeral Discussion row (simulator-session pattern,
// but rows are DELETED on abandon and after the Run is recorded — there are
// no graded/abandoned states to keep).

import { db } from '../db'
import type {
  DiscussionTopicRef, DiscussionTurn, Modality, PartnerStance, SprechenDiscussion, TurnTarget
} from '../data/sprechen'

export async function createDiscussion(
  topic: DiscussionTopicRef,
  turnTarget: TurnTarget,
  stance: PartnerStance,
  modality: Modality = 'typed',
  notes = ''
): Promise<SprechenDiscussion> {
  const row: SprechenDiscussion = {
    id: crypto.randomUUID(),
    topic,
    turnTarget,
    stance,
    modality,
    status: 'in_progress',
    turns: [],
    kiTippCount: 0,
    notes,
    startedAt: Date.now()
  }
  await db.sprechenDiscussions.put(row)
  return row
}

/**
 * Active = in_progress OR submitted-but-not-graded. Most recent wins.
 * `modality`, when given, restricts the search to that modality — an
 * abandoned spoken row must never be offered as a resumable typed one (or
 * vice versa): the runners are not interchangeable mid-discussion.
 */
export async function findActiveDiscussion(modality?: Modality): Promise<SprechenDiscussion | null> {
  const all = await db.sprechenDiscussions.toArray()
  const candidates = modality ? all.filter(d => d.modality === modality) : all
  const active = candidates.sort((a, b) => b.startedAt - a.startedAt)
  return active[0] ?? null
}

export async function appendTurn(id: string, turn: DiscussionTurn): Promise<void> {
  await db.transaction('rw', db.sprechenDiscussions, async () => {
    const row = await db.sprechenDiscussions.get(id)
    if (!row) throw new Error(`Discussion ${id} not found`)
    row.turns = [...row.turns, turn]
    await db.sprechenDiscussions.put(row)
  })
}

export async function markSubmitted(id: string): Promise<void> {
  await db.sprechenDiscussions.update(id, { status: 'submitted' as const, endedAt: Date.now() })
}

export async function incrementKiTipp(id: string): Promise<void> {
  await db.transaction('rw', db.sprechenDiscussions, async () => {
    const row = await db.sprechenDiscussions.get(id)
    if (!row) throw new Error(`Discussion ${id} not found`)
    await db.sprechenDiscussions.update(id, { kiTippCount: row.kiTippCount + 1 })
  })
}

/** Abandon = the learner walked away. The row is deleted, nothing recorded. */
export async function abandonDiscussion(id: string): Promise<void> {
  await db.sprechenDiscussions.delete(id)
}

/** Post-grading cleanup — called only AFTER saveQuizRun succeeded. */
export async function deleteDiscussion(id: string): Promise<void> {
  await db.sprechenDiscussions.delete(id)
}
