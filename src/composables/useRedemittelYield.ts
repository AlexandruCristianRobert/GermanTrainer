//
// Lifetime Redemittel yield — see CONTEXT.md → "Redemittel yield".
//
// WHY A SEPARATE STORE AND NOT A HISTORY DERIVATION: a graded Discussion is
// deleted once its Run is recorded (CONTEXT.md → "Discussion"), so the text the
// yield was counted from no longer exists and can never be re-counted. And
// HISTORY_LIMIT caps gt:quizHistory at 100 runs APP-WIDE across every quiz
// type, so a "have I ever used this phrase" figure derived from that window
// un-fills itself when the learner drills nouns for a week.
//
// Same shape and same reasoning as gt:drillTotals — see ADR-0011.

export const REDEMITTEL_YIELD_KEY = 'gt:sprechenRedemittel'

export interface RedemittelUse {
  count: number
  lastAt: number
}

function isUse(v: unknown): v is RedemittelUse {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  return typeof r.count === 'number' && typeof r.lastAt === 'number'
}

export function loadRedemittelYield(): Record<string, RedemittelUse> {
  const raw = localStorage.getItem(REDEMITTEL_YIELD_KEY)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Record<string, RedemittelUse> = {}
    for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (isUse(v)) out[id] = { count: v.count, lastAt: v.lastAt }
    }
    return out
  } catch {
    return {}
  }
}

/**
 * Bank one Discussion's matched Redemittel. Called from the grade pipeline,
 * NOT from the runner — a phrase used in an abandoned Discussion never counted.
 * Deliberately non-fatal: a failed write costs a tick on a meter, and must
 * never break grading.
 */
export function bumpRedemittelYield(ids: readonly string[], at: number): void {
  const unique = Array.from(new Set(ids))
  if (unique.length === 0) return
  try {
    const store = loadRedemittelYield()
    for (const id of unique) {
      const prev = store[id]
      store[id] = {
        count: (prev?.count ?? 0) + 1,
        lastAt: Math.max(prev?.lastAt ?? 0, at)
      }
    }
    localStorage.setItem(REDEMITTEL_YIELD_KEY, JSON.stringify(store))
  } catch {
    // Quota or private-mode failure — silently skipped.
  }
}

/**
 * Lifetime counts, optionally narrowed to one phrase bank.
 *
 * The store is shared because phrase ids are globally unique (`rm-*` vs
 * `vm-*`), but the two banks' Move sets are disjoint, so any figure the learner
 * SEES must be per bank (CONTEXT.md → "Redemittel yield"). Omitting `bank`
 * returns everything, which is what every pre-Teil-1 caller wants.
 */
export function lifetimeCounts(
  bank?: readonly { id: string }[]
): Record<string, number> {
  const store = loadRedemittelYield()
  const allow = bank ? new Set(bank.map(r => r.id)) : null
  const out: Record<string, number> = {}
  for (const [id, use] of Object.entries(store)) {
    if (allow && !allow.has(id)) continue
    out[id] = use.count
  }
  return out
}
