// Drill mastery — pure derivation from quiz history, plus a lifetime rollup
// that survives `gt:quizHistory`'s HISTORY_LIMIT (100-run FIFO trim). No
// Vue/DOM. Mirrors the useDwSentenceStats.ts convention: module-level key
// maps, Map/object accumulation, pure scoring functions, deterministic
// tie-break — except this module also owns one piece of localStorage state
// (`gt:drillTotals`), the same way useQuizHistory.ts owns `gt:quizHistory`.
//
// Import direction: `useQuizHistory.ts`'s `saveQuizRun` calls `bumpDrillTotals`
// from this file on every save. This file only imports `QuizHistoryEntry` /
// `QuizHistoryType` as *types* (`import type`, erased at build time) — never
// a value — so the dependency graph stays one-directional and there is no
// runtime import cycle between the two composables.

import type { QuizHistoryEntry, QuizHistoryType } from './useQuizHistory'

export interface DrillMastery {
  key: string
  runs: number
  total: number
  correct: number
  accuracy: number
  band: 0 | 1 | 2 | 3 | 4 | 5
  lastAt: number | null
}

interface DrillTotalsEntry {
  runs: number
  total: number
  correct: number
  lastAt: number | null
}

type DrillTotalsMap = Record<string, DrillTotalsEntry>

const ROLLUP_KEY = 'gt:drillTotals'
// Internal bookkeeping only (not a user-data key) — guards the one-time seed
// so an empty `{}` rollup (zero history) isn't reseeded on every read.
const SEEDED_MARKER_KEY = 'gt:drillTotalsSeeded'

// Direction Words: nine distinct run types, one card each (T1–T9).
const DW_TYPE_TO_CODE: Partial<Record<QuizHistoryType, string>> = {
  'dw-hinher': 'T1',
  'dw-compound': 'T2',
  'dw-question': 'T3',
  'dw-register': 'T4',
  'dw-assembly': 'T5',
  'dw-sentence': 'T6',
  'dw-answer': 'T7',
  'dw-lexical': 'T8',
  'dw-idiom': 'T9',
}

// Da-Compounds: nineteen distinct run types map to T1–T13 and T16–T20;
// 'dac-sentence' alone serves two cards (T14/T15) and is disambiguated in
// drillKey() below rather than through this table.
const DAC_TYPE_TO_CODE: Partial<Record<QuizHistoryType, string>> = {
  'dac-formation': 'T1',
  'dac-match': 'T2',
  'dac-substitution': 'T3',
  'dac-neighbors': 'T4',
  'dac-case': 'T5',
  'dac-pronoun-case': 'T6',
  'dac-article': 'T7',
  'dac-transform': 'T8',
  'dac-wo-question': 'T9',
  'dac-dialogue': 'T10',
  'dac-korrelat': 'T11',
  'dac-paraphrase': 'T12',
  'dac-contrast': 'T13',
  'dac-assembly': 'T16',
  'dac-answer': 'T17',
  'dac-homograph': 'T18',
  'dac-register': 'T19',
  'dac-relative': 'T20',
}

/**
 * Maps one history run to its catalogue card key ('dw-T6', 'dac-T14', …), or
 * `null` if the run belongs to neither module. `dac-sentence` is the one type
 * shared by two cards: T14 (EN→DE) or T15 (DE→EN), told apart by
 * `meta.dacSentenceDirection`. Legacy entries recorded before the direction
 * split existed have that field `undefined` and attribute to T14 — the
 * module's original (and at the time, only) direction.
 */
export function drillKey(entry: QuizHistoryEntry): string | null {
  if (entry.type === 'dac-sentence') {
    return entry.meta.dacSentenceDirection === 'de-en' ? 'dac-T15' : 'dac-T14'
  }
  const dw = DW_TYPE_TO_CODE[entry.type]
  if (dw) return `dw-${dw}`
  const dac = DAC_TYPE_TO_CODE[entry.type]
  if (dac) return `dac-${dac}`
  return null
}

/**
 * 0–5 mastery band gated on `total` (questions answered), not `runs` — count
 * is user-chosen per run, and AI runs can fall short of the requested count.
 * Checked from the top down; the highest satisfied band wins.
 */
export function masteryBand(total: number, accuracy: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (total >= 60 && accuracy >= 0.90) return 5
  if (total >= 40 && accuracy >= 0.80) return 4
  if (total >= 20 && accuracy >= 0.65) return 3
  if (total >= 10 && accuracy >= 0.50) return 2
  if (total > 0) return 1
  return 0
}

function safeGet(key: string): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore quota / disabled */
  }
}

function readRollup(): DrillTotalsMap {
  const raw = safeGet(ROLLUP_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeRollup(map: DrillTotalsMap): void {
  safeSet(ROLLUP_KEY, JSON.stringify(map))
}

function addEntry(map: DrillTotalsMap, key: string, entry: QuizHistoryEntry): void {
  const existing = map[key] ?? { runs: 0, total: 0, correct: 0, lastAt: null }
  existing.runs += 1
  existing.total += entry.count
  existing.correct += entry.correct
  const at = Date.parse(entry.finishedAt)
  if (Number.isFinite(at) && (existing.lastAt === null || at > existing.lastAt)) {
    existing.lastAt = at
  }
  map[key] = existing
}

/** Folds a history window into a fresh rollup map (used only for seeding). */
function foldHistory(entries: QuizHistoryEntry[]): DrillTotalsMap {
  const map: DrillTotalsMap = {}
  for (const entry of entries) {
    const key = drillKey(entry)
    if (key) addEntry(map, key, entry)
  }
  return map
}

/**
 * Ensures the rollup has been seeded from `history` exactly once (guarded by
 * a marker key, since an empty `{}` rollup is otherwise indistinguishable
 * from "never seeded"). Returns the current rollup either way. Called from
 * both `bumpDrillTotals` (with the pre-save history, on every run) and
 * `computeDrillMastery` (with whatever window the caller already has, e.g.
 * on first opening a hub) — whichever happens first performs the one-time
 * seed, so current users don't start at zero.
 */
function ensureSeeded(history: QuizHistoryEntry[]): DrillTotalsMap {
  if (safeGet(SEEDED_MARKER_KEY)) return readRollup()
  const seeded = foldHistory(history)
  writeRollup(seeded)
  safeSet(SEEDED_MARKER_KEY, '1')
  return seeded
}

/**
 * Bumps the lifetime rollup for one freshly-saved run. Called from
 * `useQuizHistory.ts`'s `saveQuizRun` with the history array as it stood
 * *before* this run was unshifted onto it, so the one-time seed (if this is
 * the first bump ever) folds exactly the prior runs, and this call then adds
 * the new run on top — never both via the same entry.
 */
export function bumpDrillTotals(entry: QuizHistoryEntry, priorHistory: QuizHistoryEntry[]): void {
  const totals = ensureSeeded(priorHistory)
  const key = drillKey(entry)
  if (key) addEntry(totals, key, entry)
  writeRollup(totals)
}

/**
 * Computes 0–5 mastery per drill. The lifetime rollup (seeded from `entries`
 * on first call, then kept current by `bumpDrillTotals` on every save, so it
 * outlives `gt:quizHistory`'s 100-run FIFO cap) is the primary source;
 * any key the rollup doesn't have falls back to deriving straight from
 * `entries` (e.g. a rollup that hasn't seen a bump yet in a test).
 */
export function computeDrillMastery(entries: QuizHistoryEntry[]): Record<string, DrillMastery> {
  const rollup = ensureSeeded(entries)
  const windowFold = foldHistory(entries)

  const keys = new Set([...Object.keys(rollup), ...Object.keys(windowFold)])
  const out: Record<string, DrillMastery> = {}
  for (const key of keys) {
    const source = rollup[key] ?? windowFold[key]
    if (!source) continue
    const accuracy = source.total > 0 ? source.correct / source.total : 0
    out[key] = {
      key,
      runs: source.runs,
      total: source.total,
      correct: source.correct,
      accuracy,
      band: masteryBand(source.total, accuracy),
      lastAt: source.lastAt,
    }
  }
  return out
}
