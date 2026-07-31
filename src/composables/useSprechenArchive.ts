//
// Repository module for the Error archive (CONTEXT.md → "Error archive",
// "Archived correction", "Correction drill"; see docs/adr/0012 for the
// binding decision). Every read and write for the archive goes through this
// module — no component or composable may reach for db.sprechenCorrections /
// db.sprechenCorrectionEvents directly, or the eventual Supabase swap stops
// being a one-file change.
//
// APPEND-ONLY (ADR-0012): an ArchivedCorrection row is never mutated after
// insert, mirroring the read-all + insert-only RLS posture the Supabase
// table will have. "The learner has re-practised this correction" is
// therefore NOT a boolean on the row — it is a second append-only table of
// CorrectionEvents, and drilled-ness is DERIVED by joining the two. Dexie
// would happily let us flip a boolean; we deliberately never call
// .update()/.modify() on a correction here.

import { db } from '../db'
import type { Modality } from '../data/sprechen'
import type { SprechenErrorTag } from './useQuizHistory'

/**
 * One marked mistake from a graded Discussion, kept forever after the
 * Discussion itself is deleted (CONTEXT.md → "Archived correction").
 */
export interface ArchivedCorrection {
  id: string
  discussionId: string
  topicTitle: string
  modality: Modality
  kind: SprechenErrorTag
  quote: string        // the marked span, as the learner wrote/said it
  suggested: string     // the corrected wording
  reasonDe: string
  reasonEn: string
  context: string        // the learner's FULL sentence containing the mistake
  createdAt: number
}

/**
 * An append-only record of one Correction drill attempt against a single
 * ArchivedCorrection. Never a mutation of the correction — see file header.
 */
export interface CorrectionEvent {
  id: string
  correctionId: string
  correct: boolean
  at: number
}

/** Bulk insert. Generates ids + createdAt; callers never choose either. */
export async function appendCorrections(
  entries: Array<Omit<ArchivedCorrection, 'id' | 'createdAt'>>
): Promise<ArchivedCorrection[]> {
  if (entries.length === 0) return []
  const now = Date.now()
  const rows: ArchivedCorrection[] = entries.map(entry => ({
    ...entry,
    id: crypto.randomUUID(),
    createdAt: now
  }))
  await db.sprechenCorrections.bulkAdd(rows)
  return rows
}

/** Newest first, with optional kind filter and result cap. */
export async function listCorrections(
  filter: { kind?: SprechenErrorTag; limit?: number } = {}
): Promise<ArchivedCorrection[]> {
  let all = await db.sprechenCorrections.toArray()
  if (filter.kind) all = all.filter(c => c.kind === filter.kind)
  all.sort((a, b) => b.createdAt - a.createdAt)
  return filter.limit != null ? all.slice(0, filter.limit) : all
}

/**
 * Records one Correction drill attempt as a new event. Deliberately does
 * NOT touch db.sprechenCorrections — see file header. "Drilled" comes from
 * drilledIds()/openCorrections() joining against this table, not from a
 * flag on the correction row.
 */
export async function recordDrillResult(correctionId: string, correct: boolean): Promise<void> {
  const event: CorrectionEvent = {
    id: crypto.randomUUID(),
    correctionId,
    correct,
    at: Date.now()
  }
  await db.sprechenCorrectionEvents.add(event)
}

/**
 * Ids of corrections with at least one event where correct === true.
 * A correction that was gotten wrong once and right later still counts as
 * drilled — order of attempts doesn't matter, only whether a success ever
 * happened. `correct` isn't an indexed field (booleans aren't valid
 * IndexedDB index keys), so this scans the (small, cold-storage) events
 * table rather than querying by it.
 */
export async function drilledIds(): Promise<Set<string>> {
  const events = await db.sprechenCorrectionEvents.toArray()
  const ids = new Set<string>()
  for (const event of events) {
    if (event.correct) ids.add(event.correctionId)
  }
  return ids
}

/** Corrections with no successful drill event yet, newest first. */
export async function openCorrections(limit?: number): Promise<ArchivedCorrection[]> {
  const drilled = await drilledIds()
  const all = await listCorrections()
  const open = all.filter(c => !drilled.has(c.id))
  return limit != null ? open.slice(0, limit) : open
}

/** Standing counts per Sprechen error tag, for the archive's grouped view. */
export async function countsByKind(): Promise<Record<SprechenErrorTag, number>> {
  const counts: Record<SprechenErrorTag, number> = {
    grammar: 0,
    'word-order': 0,
    vocabulary: 0,
    spelling: 0,
    register: 0
  }
  const all = await db.sprechenCorrections.toArray()
  for (const c of all) counts[c.kind] += 1
  return counts
}

/** Test/reset support only — wipes both archive tables. */
export async function clearArchive(): Promise<void> {
  await db.sprechenCorrections.clear()
  await db.sprechenCorrectionEvents.clear()
}
