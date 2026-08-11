// The Dativ module's item ledger — lifetime, per-ITEM progress (ADR-0017),
// where gt:drillTotals (ADR-0011) is lifetime per-DRILL. One entry per
// memorization item: the DATIVE_VERBS keys plus the DATIVE_ADJECTIVES keys.
// Storing only the last three booleans keeps the entry small and makes the
// gesichert rule auditable; a missing key reads as 'new', so an absent store
// is a valid empty state with no migration. No Vue/DOM.
//
// Write-side guard AND read-side exclusion: a key with no matching item (a
// verb later renamed in verbs.ts) is never written, ignored on read, and
// excluded from the denominator — the meter cannot exceed 100%.

import { DATIVE_VERBS } from '../data/dativeVerbs'
import { DATIVE_ADJECTIVES } from '../data/dativeAdjectives'

export const LEDGER_KEY = 'gt:dativeLedger'

export type LedgerState = 'new' | 'wackelig' | 'gesichert'

export interface LedgerEntry {
  /** Most recent first, capped at 3 — all the streak rule needs. */
  recent: boolean[]
  encounters: number
  lastAt: number
}

export type DativeLedger = Record<string, LedgerEntry>   // key: VERBS.german | adjective lemma

function isKnownItem(key: string): boolean {
  return key in DATIVE_VERBS || key in DATIVE_ADJECTIVES
}

export function ledgerState(entry: LedgerEntry | undefined): LedgerState {
  if (!entry || entry.encounters === 0) return 'new'
  if (entry.recent.length === 3 && entry.recent.every(Boolean)) return 'gesichert'
  return 'wackelig'
}

function safeGet(key: string): string | null {
  if (typeof localStorage === 'undefined') return null
  try { return localStorage.getItem(key) } catch { return null }
}

function safeSet(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(key, value) } catch { /* ignore quota / disabled */ }
}

function rawRead(): DativeLedger {
  const raw = safeGet(LEDGER_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function validEntry(e: unknown): e is LedgerEntry {
  if (!e || typeof e !== 'object') return false
  const c = e as LedgerEntry
  return Array.isArray(c.recent) && c.recent.every(b => typeof b === 'boolean')
    && typeof c.encounters === 'number' && typeof c.lastAt === 'number'
}

/** The ledger with unknown/malformed keys excluded (read-side guard). */
export function readDativeLedger(): DativeLedger {
  const out: DativeLedger = {}
  for (const [key, entry] of Object.entries(rawRead())) {
    if (isKnownItem(key) && validEntry(entry)) out[key] = entry
  }
  return out
}

/** Records one encounter. Unknown item keys are silently ignored. */
export function bumpDativeLedger(item: string, correct: boolean, at: number): void {
  if (!isKnownItem(item)) return
  const all = rawRead()
  const prev = validEntry(all[item]) ? all[item] : { recent: [], encounters: 0, lastAt: 0 }
  all[item] = {
    recent: [correct, ...prev.recent].slice(0, 3),
    encounters: prev.encounters + 1,
    lastAt: at,
  }
  safeSet(LEDGER_KEY, JSON.stringify(all))
}

/** Hub meter numbers. total is DERIVED — never hard-code the item count. */
export function ledgerSummary(): { secured: number; shaky: number; fresh: number; total: number } {
  const ledger = readDativeLedger()
  const total = Object.keys(DATIVE_VERBS).length + Object.keys(DATIVE_ADJECTIVES).length
  let secured = 0
  let shaky = 0
  for (const entry of Object.values(ledger)) {
    const s = ledgerState(entry)
    if (s === 'gesichert') secured++
    else if (s === 'wackelig') shaky++
  }
  return { secured, shaky, fresh: total - secured - shaky, total }
}
