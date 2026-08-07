//
// Sprechen Teil 1 — the Vortrag row's lifecycle. See CONTEXT.md → "Vortrag".
//
// Ephemeral working state, exactly like a Discussion: it exists so a
// four-minute Rede survives a dead tab and a failed grade stays retryable.
// `in_progress` → `submitted` → the row is DELETED once the Run is recorded.
// There is no `graded` and no `abandoned` status — those rows do not exist.

import { toRaw } from 'vue'
import { db } from '../db'
import type {
  HelpKind, Modality, NachfrageRecord, RedeRecord, SprechenVortrag,
  VortragHelps, VortragPlanEntry, VortragThemaRef
} from '../data/sprechen'

/**
 * Deep-unwrap Vue reactivity before anything crosses into IndexedDB.
 *
 * The runner holds the whole Vortrag in a `ref`, so `v.value.rede` reads back
 * as a reactive PROXY, not the plain object that was assigned to it. IndexedDB
 * stores values with the structured clone algorithm, and that algorithm throws
 * DataCloneError on any object carrying internal slots other than [[Prototype]]
 * / [[Extensible]] — which every Proxy does. So handing `v.value.rede` to
 * Dexie rejects with "#<Object> could not be cloned", and because `commitRede`
 * awaits that write inside `finishRede`, the whole "Vortrag beenden" click
 * died before it could switch phases: the button did nothing, silently.
 *
 * `toRaw` alone is not enough — it is shallow, and the runner builds
 * `rede.spans` by spreading a reactive array (`[...vv.rede.spans, …]`), which
 * yields per-ELEMENT proxies inside an otherwise plain array. Hence the
 * recursion.
 *
 * This lives at the persistence boundary on purpose: every write below is
 * normalised here, so no caller can reintroduce the bug by passing reactive
 * state. Teil 2 never hit this only because `appendTurn` re-reads its row from
 * Dexie before writing it back.
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

export async function createVortrag(
  thema: VortragThemaRef,
  modality: Modality,
  helps: VortragHelps,
  plan: VortragPlanEntry[],
  notes = ''
): Promise<SprechenVortrag> {
  const row: SprechenVortrag = {
    id: crypto.randomUUID(),
    thema: plain(thema),
    modality,
    // A hard limit models an examiner interrupting, which only exists in real
    // time — defence in depth against a stale typed stash carrying it true.
    helps: plain({ ...helps, hardLimit: modality === 'spoken' && helps.hardLimit }),
    plan: plain(plan),
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
  await db.sprechenVortraege.update(id, { rede: plain(rede) })
}

export async function saveNachfrage(id: string, nachfrage: NachfrageRecord): Promise<void> {
  await db.sprechenVortraege.update(id, { nachfrage: plain(nachfrage) })
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

/** F13 — the mic died mid-Rede and the input surface fell back to typing.
 *  Recorded as data so the grader, the result page and the Run all state it.
 *  Non-fatal: a failed write must not interrupt the Rede. */
export async function markDowngraded(id: string, at = Date.now()): Promise<void> {
  try {
    await db.sprechenVortraege.update(id, { downgradedAt: at })
  } catch { /* descriptive only */ }
}

/** Abandon = the learner walked away. The row is deleted, nothing recorded. */
export async function abandonVortrag(id: string): Promise<void> {
  await db.sprechenVortraege.delete(id)
}

/** Post-grading cleanup — called only AFTER saveQuizRun succeeded. */
export async function deleteVortrag(id: string): Promise<void> {
  await db.sprechenVortraege.delete(id)
}
