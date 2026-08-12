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
  /**
   * Which exam part the correction came from. OPTIONAL and written on new rows
   * only: ADR-0012 forbids mutating an Archived correction row, so there is no
   * backfill migration. `undefined` reads as 2 — the only part that existed —
   * and the defaulting lives here in the repository, never in the schema.
   */
  part?: 1 | 2
  /**
   * Which exam skill produced this correction. OPTIONAL and written on new
   * rows only (ADR-0020): Schreiben corrections join these same append-only
   * tables rather than getting a parallel archive, and ADR-0012 forbids
   * mutating an existing row, so there is no backfill migration. `undefined`
   * reads as 'sprechen' — the only module that existed before Schreiben
   * joined — and the defaulting lives here in the repository, never in the
   * schema. Exactly the same pattern as `part` above.
   */
  module?: 'sprechen' | 'schreiben'
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

/**
 * Read-side normalisation, shared by every read path in this module.
 * `part ?? 2` and `module ?? 'sprechen'` are both ADR-0012 defaults: neither
 * field is ever backfilled onto an existing row, so a row written before
 * that field existed simply lacks it, and this function is where the two
 * historical defaults ("Teil 2" / "Sprechen") get applied on the way out.
 */
export function normalizeCorrection(
  row: ArchivedCorrection
): ArchivedCorrection & { part: 1 | 2; module: 'sprechen' | 'schreiben' } {
  return { ...row, part: row.part ?? 2, module: row.module ?? 'sprechen' }
}

/**
 * Newest first, with optional kind/part/module filter and result cap.
 *
 * Every row is normalised on read via `normalizeCorrection` so no consumer
 * ever sees `undefined` for `part` or `module`. This is a full-table scan,
 * same as every other read in this module; neither field gets a Dexie index
 * (that needs a version bump this task does not own).
 */
export async function listCorrections(
  filter: { kind?: SprechenErrorTag; part?: 1 | 2; module?: 'sprechen' | 'schreiben'; limit?: number } = {}
): Promise<ArchivedCorrection[]> {
  let all = (await db.sprechenCorrections.toArray()).map(normalizeCorrection)
  if (filter.kind) all = all.filter(c => c.kind === filter.kind)
  if (filter.part != null) all = all.filter(c => c.part === filter.part)
  if (filter.module != null) all = all.filter(c => c.module === filter.module)
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
export async function openCorrections(
  limit?: number, part?: 1 | 2, module?: 'sprechen' | 'schreiben'
): Promise<ArchivedCorrection[]> {
  const drilled = await drilledIds()
  const filter: { part?: 1 | 2; module?: 'sprechen' | 'schreiben' } = {}
  if (part != null) filter.part = part
  if (module != null) filter.module = module
  const all = await listCorrections(filter)
  const open = all.filter(c => !drilled.has(c.id))
  return limit != null ? open.slice(0, limit) : open
}

/**
 * Standing counts per Sprechen error tag, for the archive's grouped view.
 * Optionally scoped to one exam part and/or one module.
 */
export async function countsByKind(
  part?: 1 | 2, module?: 'sprechen' | 'schreiben'
): Promise<Record<SprechenErrorTag, number>> {
  const counts: Record<SprechenErrorTag, number> = {
    grammar: 0,
    'word-order': 0,
    vocabulary: 0,
    spelling: 0,
    register: 0
  }
  const filter: { part?: 1 | 2; module?: 'sprechen' | 'schreiben' } = {}
  if (part != null) filter.part = part
  if (module != null) filter.module = module
  const all = await listCorrections(filter)
  for (const c of all) counts[c.kind] += 1
  return counts
}

/** Test/reset support only — wipes both archive tables. */
export async function clearArchive(): Promise<void> {
  await db.sprechenCorrections.clear()
  await db.sprechenCorrectionEvents.clear()
}
