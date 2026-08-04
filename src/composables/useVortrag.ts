//
// Sprechen Teil 1 — the Vortrag row's lifecycle. See CONTEXT.md → "Vortrag".
//
// Ephemeral working state, exactly like a Discussion: it exists so a
// four-minute Rede survives a dead tab and a failed grade stays retryable.
// `in_progress` → `submitted` → the row is DELETED once the Run is recorded.
// There is no `graded` and no `abandoned` status — those rows do not exist.

import { db } from '../db'
import type {
  HelpKind, Modality, NachfrageRecord, RedeRecord, SprechenVortrag,
  VortragHelps, VortragPlanEntry, VortragThemaRef
} from '../data/sprechen'

export async function createVortrag(
  thema: VortragThemaRef,
  modality: Modality,
  helps: VortragHelps,
  plan: VortragPlanEntry[],
  notes = ''
): Promise<SprechenVortrag> {
  const row: SprechenVortrag = {
    id: crypto.randomUUID(),
    thema,
    modality,
    // A hard limit models an examiner interrupting, which only exists in real
    // time — defence in depth against a stale typed stash carrying it true.
    helps: { ...helps, hardLimit: modality === 'spoken' && helps.hardLimit },
    plan,
    notes,
    rede: { textDe: '' },
    kiTippCount: 0,
    helpLog: [],
    status: 'in_progress',
    startedAt: Date.now()
  }
  await db.sprechenVortraege.put(row)
  return row
}

/**
 * Active = in_progress OR submitted-but-not-graded. Most recent wins.
 * `modality`, when given, restricts the search: a spoken Rede must never be
 * offered as a resumable typed one — the input surfaces are not interchangeable
 * mid-run.
 */
export async function findActiveVortrag(modality?: Modality): Promise<SprechenVortrag | null> {
  const all = await db.sprechenVortraege.toArray()
  const candidates = modality ? all.filter(v => v.modality === modality) : all
  return candidates.sort((a, b) => b.startedAt - a.startedAt)[0] ?? null
}

export async function saveRede(id: string, rede: RedeRecord): Promise<void> {
  await db.sprechenVortraege.update(id, { rede })
}

export async function saveNachfrage(id: string, nachfrage: NachfrageRecord): Promise<void> {
  await db.sprechenVortraege.update(id, { nachfrage })
}

export async function markVortragSubmitted(id: string): Promise<void> {
  await db.sprechenVortraege.update(id, { status: 'submitted' as const, endedAt: Date.now() })
}

export async function incrementVortragKiTipp(id: string): Promise<void> {
  await db.transaction('rw', db.sprechenVortraege, async () => {
    const row = await db.sprechenVortraege.get(id)
    if (!row) throw new Error(`Vortrag ${id} not found`)
    await db.sprechenVortraege.update(id, { kiTippCount: row.kiTippCount + 1 })
  })
}

/**
 * Append one Hilfe-Protokoll entry. Deliberately non-fatal: the protocol is
 * descriptive, and a failed write must never interrupt a Rede in progress.
 */
export async function logHelp(id: string, kind: HelpKind, at = Date.now()): Promise<void> {
  try {
    await db.transaction('rw', db.sprechenVortraege, async () => {
      const row = await db.sprechenVortraege.get(id)
      if (!row) return
      await db.sprechenVortraege.update(id, { helpLog: [...row.helpLog, { at, kind }] })
    })
  } catch {
    // Descriptive telemetry only — swallowed on purpose.
  }
}

/** Abandon = the learner walked away. The row is deleted, nothing recorded. */
export async function abandonVortrag(id: string): Promise<void> {
  await db.sprechenVortraege.delete(id)
}

/** Post-grading cleanup — called only AFTER saveQuizRun succeeded. */
export async function deleteVortrag(id: string): Promise<void> {
  await db.sprechenVortraege.delete(id)
}
