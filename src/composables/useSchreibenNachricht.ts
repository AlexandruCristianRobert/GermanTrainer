//
// Schreiben Teil 2 — the Nachricht row's repository. See CONTEXT.md →
// "Nachricht". Mirrors useSchreibenBeitrag.ts's discipline: this module is
// the only place that touches `db.schreibenNachrichten` — every Dexie
// access for the table goes through here.
//

import { toRaw } from 'vue'
import { db } from '../db'
import type { HelpKind } from '../data/sprechen'
import type { NachrichtHelps, NachrichtSlots, SchreibauftragRef, SchreibenNachricht } from '../data/schreibenNachricht'
import type { SchreibPlanEntry } from '../data/schreiben'

/**
 * Deep-unwrap Vue reactivity before anything crosses into IndexedDB.
 * See useVortrag.ts's `plain` for the full rationale — the runner holds the
 * whole Nachricht in a `ref`, so handing a reactive proxy to Dexie's
 * structured clone throws DataCloneError. Recursive because a plain array
 * can still hold per-element proxies (e.g. a `plan` built by spreading a
 * reactive array).
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

export async function createNachricht(init: {
  auftrag: SchreibauftragRef
  helps: NachrichtHelps
  plan: SchreibPlanEntry[]
}): Promise<SchreibenNachricht> {
  const row: SchreibenNachricht = {
    id: crypto.randomUUID(),
    auftrag: plain(init.auftrag),
    helps: plain(init.helps),
    plan: plain(init.plan),
    textDe: '',
    status: 'in_progress',
    startedAt: Date.now(),
    updatedAt: Date.now(),
    kiTippCount: 0,
    helpLog: []
  }
  await db.schreibenNachrichten.put(row)
  return row
}

/** Active = in_progress OR submitted-but-not-graded. Most recent wins. */
export async function findActiveNachricht(): Promise<SchreibenNachricht | undefined> {
  const all = await db.schreibenNachrichten.toArray()
  return all.sort((a, b) => b.startedAt - a.startedAt)[0]
}

export async function saveNachrichtText(id: string, textDe: string, slots?: NachrichtSlots): Promise<void> {
  await db.schreibenNachrichten.update(id, { textDe, slots: slots ? plain(slots) : undefined, updatedAt: Date.now() })
}

export async function saveNachrichtPlan(id: string, plan: SchreibPlanEntry[]): Promise<void> {
  await db.schreibenNachrichten.update(id, { plan: plain(plan) })
}

/**
 * Append one Hilfe-Protokoll entry. Deliberately non-fatal: the protocol is
 * descriptive, and a failed write must never interrupt a Nachricht in progress.
 */
export async function logNachrichtHelp(id: string, kind: HelpKind, at = Date.now()): Promise<void> {
  try {
    await db.transaction('rw', db.schreibenNachrichten, async () => {
      const row = await db.schreibenNachrichten.get(id)
      if (!row) return
      await db.schreibenNachrichten.update(id, { helpLog: [...row.helpLog, { at, kind }] })
    })
  } catch {
    // Descriptive telemetry only — swallowed on purpose.
  }
}

export async function incrementNachrichtKiTipp(id: string, tipText: string): Promise<void> {
  await db.transaction('rw', db.schreibenNachrichten, async () => {
    const row = await db.schreibenNachrichten.get(id)
    if (!row) throw new Error(`Nachricht ${id} not found`)
    await db.schreibenNachrichten.update(id, { kiTippCount: row.kiTippCount + 1, kiTippText: tipText })
  })
}

export async function markNachrichtSubmitted(id: string): Promise<void> {
  await db.schreibenNachrichten.update(id, { status: 'submitted' as const, updatedAt: Date.now() })
}

/** Abandon = the learner walked away. The row is deleted, nothing recorded. */
export async function abandonNachricht(id: string): Promise<void> {
  await db.schreibenNachrichten.delete(id)
}

/** Post-grading cleanup — called only AFTER saveQuizRun succeeded. */
export async function deleteNachricht(id: string): Promise<void> {
  await db.schreibenNachrichten.delete(id)
}
