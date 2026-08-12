//
// Schreiben Teil 1 — the Forumsbeitrag row's repository. See CONTEXT.md →
// "Forumsbeitrag". Mirrors useVortrag.ts's discipline: this module is the
// only place that touches `db.schreibenBeitraege` — every Dexie access for
// the table goes through here.
//

import { toRaw } from 'vue'
import { db } from '../db'
import type { HelpKind } from '../data/sprechen'
import type { SchreibenBeitrag, SchreibHelps, SchreibPlanEntry, SchreibThemaRef } from '../data/schreiben'

/**
 * Deep-unwrap Vue reactivity before anything crosses into IndexedDB.
 * See useVortrag.ts's `plain` for the full rationale — the runner holds the
 * whole Beitrag in a `ref`, so handing a reactive proxy to Dexie's structured
 * clone throws DataCloneError. Recursive because a plain array can still hold
 * per-element proxies (e.g. a `plan` built by spreading a reactive array).
 */
function plain<T>(value: T): T {
  const raw = toRaw(value)
  if (Array.isArray(raw)) return raw.map(plain) as unknown as T
  if (raw !== null && typeof raw === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(raw as Record<string, unknown>)) out[k] = plain(val)
    return out as T
  }
  return raw
}

export async function createBeitrag(init: {
  thema: SchreibThemaRef
  helps: SchreibHelps
  plan: SchreibPlanEntry[]
}): Promise<SchreibenBeitrag> {
  const row: SchreibenBeitrag = {
    id: crypto.randomUUID(),
    thema: plain(init.thema),
    helps: plain(init.helps),
    plan: plain(init.plan),
    textDe: '',
    status: 'in_progress',
    startedAt: Date.now(),
    updatedAt: Date.now(),
    kiTippCount: 0,
    helpLog: []
  }
  await db.schreibenBeitraege.put(row)
  return row
}

/** Active = in_progress OR submitted-but-not-graded. Most recent wins. */
export async function findActiveBeitrag(): Promise<SchreibenBeitrag | undefined> {
  const all = await db.schreibenBeitraege.toArray()
  return all.sort((a, b) => b.startedAt - a.startedAt)[0]
}

export async function saveText(id: string, textDe: string): Promise<void> {
  await db.schreibenBeitraege.update(id, { textDe, updatedAt: Date.now() })
}

export async function savePlan(id: string, plan: SchreibPlanEntry[]): Promise<void> {
  await db.schreibenBeitraege.update(id, { plan: plain(plan) })
}

/**
 * Append one Hilfe-Protokoll entry. Deliberately non-fatal: the protocol is
 * descriptive, and a failed write must never interrupt a Beitrag in progress.
 */
export async function logHelp(id: string, kind: HelpKind, at = Date.now()): Promise<void> {
  try {
    await db.transaction('rw', db.schreibenBeitraege, async () => {
      const row = await db.schreibenBeitraege.get(id)
      if (!row) return
      await db.schreibenBeitraege.update(id, { helpLog: [...row.helpLog, { at, kind }] })
    })
  } catch {
    // Descriptive telemetry only — swallowed on purpose.
  }
}

export async function incrementKiTipp(id: string): Promise<void> {
  await db.transaction('rw', db.schreibenBeitraege, async () => {
    const row = await db.schreibenBeitraege.get(id)
    if (!row) throw new Error(`Beitrag ${id} not found`)
    await db.schreibenBeitraege.update(id, { kiTippCount: row.kiTippCount + 1 })
  })
}

export async function markSubmitted(id: string): Promise<void> {
  await db.schreibenBeitraege.update(id, { status: 'submitted' as const, updatedAt: Date.now() })
}

/** Abandon = the learner walked away. The row is deleted, nothing recorded. */
export async function abandonBeitrag(id: string): Promise<void> {
  await db.schreibenBeitraege.delete(id)
}

/** Post-grading cleanup — called only AFTER saveQuizRun succeeded. */
export async function deleteBeitrag(id: string): Promise<void> {
  await db.schreibenBeitraege.delete(id)
}
