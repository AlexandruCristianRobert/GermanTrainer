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
 * NOT touch db.sprechenCorrections — see file header. A correction's state
 * (offen / fällig / nachgeübt) comes from computeSchedule() replaying this
 * table, not from a flag on the correction row.
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

// ─── Wiedervorlage (ADR-0025) ────────────────────────────────────────────
// Everything below is DERIVED at read time from sprechenCorrectionEvents.
// The only state is the trailing correct streak; a wrong event resets it and
// the correction is offen again (the wackelig demotion honesty, ADR-0017).

export const WIEDERVORLAGE_INTERVALS_DAYS = [3, 10, 30] as const
// Derived, not written as 4: the two constants are coupled — a streak below
// the retire threshold indexes the ladder, so retire > intervals + 1 would
// read past its end and produce a NaN dueAt. Deriving it makes that
// impossible to get wrong when the pedagogy (the ladder) changes.
export const WIEDERVORLAGE_RETIRE_STREAK = WIEDERVORLAGE_INTERVALS_DAYS.length + 1
const DAY_MS = 86_400_000

export type CorrectionStatus = 'offen' | 'faellig' | 'nachgeuebt'

export interface CorrectionSchedule {
  status: CorrectionStatus
  streak: number
  lastCorrectAt: number | null
  dueAt: number | null
}

export interface QueuedCorrection extends ArchivedCorrection {
  schedule: CorrectionSchedule
}

const OFFEN: CorrectionSchedule = Object.freeze(
  { status: 'offen', streak: 0, lastCorrectAt: null, dueAt: null })

/**
 * Pure ADR-0025 rule for ONE correction's events. `now` is a parameter so
 * tests hit exact interval boundaries without mocking the clock. Events may
 * arrive unsorted (Dexie returns primary-key order, and the keys are random
 * UUIDs). The sort is stable, so two events sharing the same `at` keep that
 * arbitrary primary-key order — insertion order is NOT recoverable. A learner
 * cannot answer one correction twice inside a millisecond, so this only bites
 * tests that append events back-to-back: those pin `Date.now` to give each
 * event a distinct `at`.
 */
export function computeSchedule(events: CorrectionEvent[], now: number = Date.now()): CorrectionSchedule {
  const sorted = [...events].sort((a, b) => a.at - b.at)
  let streak = 0
  let lastCorrectAt: number | null = null
  for (const e of sorted) {
    if (e.correct) { streak += 1; lastCorrectAt = e.at }
    else { streak = 0; lastCorrectAt = null }
  }
  if (streak === 0) return OFFEN
  if (streak >= WIEDERVORLAGE_RETIRE_STREAK) {
    return { status: 'nachgeuebt', streak, lastCorrectAt, dueAt: null }
  }
  const dueAt = (lastCorrectAt as number) + WIEDERVORLAGE_INTERVALS_DAYS[streak - 1] * DAY_MS
  return { status: now >= dueAt ? 'faellig' : 'nachgeuebt', streak, lastCorrectAt, dueAt }
}

/**
 * One events-table scan → per-correction schedule. Corrections with no
 * events are absent from the map; readers treat a missing id as offen.
 * Same full-table-scan posture drilledIds() had (small, cold-storage table).
 */
export async function scheduleByCorrection(now: number = Date.now()): Promise<Map<string, CorrectionSchedule>> {
  const events = await db.sprechenCorrectionEvents.toArray()
  const byCorrection = new Map<string, CorrectionEvent[]>()
  for (const e of events) {
    const list = byCorrection.get(e.correctionId)
    if (list) list.push(e)
    else byCorrection.set(e.correctionId, [e])
  }
  const out = new Map<string, CorrectionSchedule>()
  for (const [id, list] of byCorrection) out.set(id, computeSchedule(list, now))
  return out
}

/** Offene corrections (trailing streak 0 — ADR-0025's redefinition), newest first. */
export async function openCorrections(
  limit?: number, part?: 1 | 2, module?: 'sprechen' | 'schreiben'
): Promise<ArchivedCorrection[]> {
  const schedules = await scheduleByCorrection()
  const filter: { part?: 1 | 2; module?: 'sprechen' | 'schreiben' } = {}
  if (part != null) filter.part = part
  if (module != null) filter.module = module
  const all = await listCorrections(filter)
  const open = all.filter(c => (schedules.get(c.id) ?? OFFEN).status === 'offen')
  return limit != null ? open.slice(0, limit) : open
}

/** Fällige corrections, most overdue first (dueAt ascending). */
export async function dueCorrections(
  part?: 1 | 2, module?: 'sprechen' | 'schreiben', now: number = Date.now()
): Promise<QueuedCorrection[]> {
  const schedules = await scheduleByCorrection(now)
  const filter: { part?: 1 | 2; module?: 'sprechen' | 'schreiben' } = {}
  if (part != null) filter.part = part
  if (module != null) filter.module = module
  const all = await listCorrections(filter)
  return all
    .map(c => ({ ...c, schedule: schedules.get(c.id) ?? OFFEN }))
    .filter(q => q.schedule.status === 'faellig')
    .sort((a, b) => (a.schedule.dueAt ?? 0) - (b.schedule.dueAt ?? 0))
}

/**
 * The Korrekturdrill's queue (ADR-0025): offene first — newest first, the
 * pre-Wiedervorlage order, so new mistakes are never crowded out — then
 * fällige, most overdue first. `limit` caps the combined list, and when both
 * kinds compete for that cap up to a QUARTER of it is reserved for fällige,
 * so review still progresses behind a large offen backlog (without the
 * reservation, more offene than the cap would starve Wiedervorlage entirely
 * while every surface kept advertising the fällig count).
 */
export async function drillQueue(
  limit?: number, part?: 1 | 2, module?: 'sprechen' | 'schreiben', now: number = Date.now()
): Promise<QueuedCorrection[]> {
  // openCorrections needs no `now`: offen (streak 0) is time-independent, so
  // the two snapshots cannot disagree about openness.
  const open = await openCorrections(undefined, part, module)
  const due = await dueCorrections(part, module, now)
  // offen stays first and dominant (ADR-0025: new mistakes are never crowded
  // out) — but review must still progress, so when a cap is given, up to a
  // quarter of it is reserved for fällige items.
  if (limit == null) return [...open.map(c => ({ ...c, schedule: OFFEN })), ...due]
  const reserved = Math.min(due.length, Math.floor(limit / 4))
  const queue: QueuedCorrection[] = [
    ...open.slice(0, limit - reserved).map(c => ({ ...c, schedule: OFFEN })),
    ...due
  ]
  return queue.slice(0, limit)
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
