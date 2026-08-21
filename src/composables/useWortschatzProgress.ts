// Wortschatz module — Dexie-backed store for per-Vokabel progress, the
// learner's own AI-generated Vokabeln, and cached extra context sentences
// (ADR-0027). This file is the *only* reader/writer of db.wortschatzProgress,
// db.wortschatzCustom and db.wortschatzSaetze — every other module reaches
// these three tables through the functions below, never through `db`
// directly.
//
// Read-side guard (mirrors useDativeLedger.ts): a progress row whose
// vokabelId matches no seed/custom item (e.g. a deleted custom Vokabel) is
// excluded from every read here, so a dangling row can never inflate a count
// or surface in a queue.
//
// Write-side care: saveProgress/saveExtraSaetze always `put()` a freshly
// built plain literal, never a Vue ref/reactive proxy handed in by a caller —
// Dexie's structured clone rejects proxies silently (project rule).

import { db } from '../db'
import type { VokabelProgress } from './wortschatzScheduler'
import { isDue } from './wortschatzScheduler'
import { WORTSCHATZ_VOKABELN, THEMENFELDER, type Vokabel, type KontextSatz, type Themenfeld } from '../data/wortschatz'

export interface CachedExtraSaetze {
  vokabelId: string
  saetze: KontextSatz[]
  generatedAt: number
}

// ── Vokabeln: seeds + learner-owned custom items ────────────────────

/** All Vokabeln — the fixed seed bank plus whatever the learner has added. */
export async function allVokabeln(): Promise<Vokabel[]> {
  const custom = await db.wortschatzCustom.toArray()
  return [...WORTSCHATZ_VOKABELN, ...custom]
}

export async function vokabelnByFeld(feld: Themenfeld): Promise<Vokabel[]> {
  return (await allVokabeln()).filter(v => v.feld === feld)
}

export async function addCustomVokabeln(items: Vokabel[]): Promise<void> {
  const rows: Vokabel[] = items.map(v => ({
    ...v,
    variants: [...v.variants],
    saetze: v.saetze.map(s => ({ ...s }))
  }))
  await db.wortschatzCustom.bulkPut(rows)
}

// ── Progress (FSRS + Stufe state) ───────────────────────────────────

/** All progress rows, keyed by vokabelId, with dangling rows excluded (read-side guard). */
export async function readAllProgress(): Promise<Map<string, VokabelProgress>> {
  const known = new Set((await allVokabeln()).map(v => v.id))
  const rows = await db.wortschatzProgress.toArray()
  const out = new Map<string, VokabelProgress>()
  for (const p of rows) {
    if (known.has(p.vokabelId)) out.set(p.vokabelId, p)
  }
  return out
}

export async function saveProgress(p: VokabelProgress): Promise<void> {
  await db.wortschatzProgress.put({
    ...p,
    fsrs: { ...p.fsrs },
    learnedVariants: [...p.learnedVariants]
  })
}

// ── Extra sentences (AI-generated, cached per Vokabel) ──────────────

export async function loadExtraSaetze(vokabelId: string): Promise<KontextSatz[]> {
  const row = await db.wortschatzSaetze.get(vokabelId)
  return row?.saetze ?? []
}

export async function saveExtraSaetze(vokabelId: string, saetze: KontextSatz[]): Promise<void> {
  const row: CachedExtraSaetze = {
    vokabelId,
    saetze: saetze.map(s => ({ ...s })),
    generatedAt: Date.now()
  }
  await db.wortschatzSaetze.put(row)
}

// ── Derived views (join item + progress in memory) ──────────────────

export interface FeldSummary {
  feld: Themenfeld
  total: number
  neu: number
  inArbeit: number
  gefestigt: number
  faellig: number
}

/** One summary per THEMENFELDER, in THEMENFELDER order. */
export async function feldSummaries(now: number): Promise<FeldSummary[]> {
  const [items, progress] = await Promise.all([allVokabeln(), readAllProgress()])
  return THEMENFELDER.map(feld => {
    const feldItems = items.filter(v => v.feld === feld)
    let neu = 0
    let inArbeit = 0
    let gefestigt = 0
    let faellig = 0
    for (const v of feldItems) {
      const p = progress.get(v.id)
      if (!p) {
        neu++
        continue
      }
      if (p.gefestigt) {
        gefestigt++
      } else {
        inArbeit++
        if (isDue(p, now)) faellig++
      }
    }
    return { feld, total: feldItems.length, neu, inArbeit, gefestigt, faellig }
  })
}

/** Due Vokabeln, most-overdue first. gefestigt items are never due. */
export async function dueVokabeln(now: number): Promise<Array<{ v: Vokabel; p: VokabelProgress }>> {
  const [items, progress] = await Promise.all([allVokabeln(), readAllProgress()])
  const byId = new Map(items.map(v => [v.id, v]))
  const due: Array<{ v: Vokabel; p: VokabelProgress }> = []
  for (const p of progress.values()) {
    if (!isDue(p, now)) continue
    const v = byId.get(p.vokabelId)
    if (v) due.push({ v, p })
  }
  due.sort((a, b) => a.p.fsrs.due - b.p.fsrs.due)
  return due
}

/** Tagesplan reader — same join as dueVokabeln, count only. */
export async function dueVokabelCount(now: number): Promise<number> {
  return (await dueVokabeln(now)).length
}
