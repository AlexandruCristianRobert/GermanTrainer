// Schreibplan keyword matching for BOTH Schreiben runners (CONTEXT.md →
// "Schreibplan"). One shared definition of "written", so Teil 1 and Teil 2
// can never drift apart. Pure module — no Vue, no Dexie, no AI.
//
// A keyword is written when EVERY of its tokens appears in the normalized
// text — a strict superset of the old whole-string `includes`: single-word
// keywords behave byte-identically, multi-word keywords ("Heizung Beamer
// Stühle") now light once all their words are down, in any order and with
// any words between them. Plan dots are transient run UI; nothing here is
// banked, so loosening changes no historical metric.

/** Same normalisation as the Redemittel matcher, so every matcher in the
 *  app agrees on what a token is. */
export function normalizeForMatch(s: string): string {
  return s.replace(/[.,;:!?…]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

/** True when every token of `keyword` occurs in `normalizedHay`
 *  (which callers produce once per text via normalizeForMatch). */
export function keywordWritten(keyword: string, normalizedHay: string): boolean {
  const tokens = normalizeForMatch(keyword).split(' ').filter(t => t.length > 0)
  if (tokens.length === 0 || normalizedHay.length === 0) return false
  return tokens.every(t => normalizedHay.includes(t))
}
