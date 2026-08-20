//
// Nachbessern (CONTEXT.md → "Nachbessern", ADR-0024): the optional guided
// revision pass directly after a Nachricht's grading. The just-graded text
// crosses from the runner to the result page through the module-scoped
// handoff below — deliberately NOT sessionStorage and NOT history.state,
// both of which survive a reload and would breach ADR-0019's boundary. A
// reload loses the offer; that is the boundary working, not a bug.
//
// The handoff has a second consumer under the same boundary: both result
// pages' .txt-Export button (useSchreibenExport.ts). Teil 1 sets the handoff
// for that button alone — a Forumsbeitrag has no Nachbessern pass.
//
// The status check is a string fact, never a judgement: no AI, no red
// state. Case-PRESERVING normalization on purpose — lowercasing would
// blind the check to exactly the register/orthography fixes (sie → Sie).

let pending: string | null = null

export function setNachbessernText(text: string): void {
  pending = text
}

/** Read-then-clear: the offer exists exactly once, in the sitting that earned it. */
export function takeNachbessernText(): string | null {
  const t = pending
  pending = null
  return t
}

/** Punctuation/whitespace normalization that PRESERVES case. */
export function normalizeKeepCase(s: string): string {
  return s.replace(/[.,;:!?…"„“”»«]/g, '').replace(/\s+/g, ' ').trim()
}

export type KorrekturStatus = 'offen' | 'geaendert' | 'behoben'

/**
 * offen    — the quoted wrong wording is still present anywhere.
 * behoben  — quote gone AND the suggested wording present (quote-gone first,
 *            so pasting the suggestion beside the intact error stays offen).
 * geaendert — quote gone, suggestion absent: changed, correctness unknown.
 * Containment is global: span offsets are dead after free editing, and a
 * wrong string that occurs twice should go twice anyway.
 */
export function korrekturStatus(text: string, quote: string, suggested: string): KorrekturStatus {
  const hay = normalizeKeepCase(text)
  const q = normalizeKeepCase(quote)
  const s = normalizeKeepCase(suggested)
  if (q.length > 0 && hay.includes(q)) return 'offen'
  if (s.length === 0 || hay.includes(s)) return 'behoben'
  return 'geaendert'
}
