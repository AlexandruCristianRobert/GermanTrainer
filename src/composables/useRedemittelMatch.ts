//
// Local Redemittel matcher — see CONTEXT.md → "Redemittel yield".
// Pure module, no Vue import, NEVER a network call: the yield is counted
// locally by text matching and must never cost an AI call.
//
// Divergence from the design prototype's `sprNeedle`, deliberate: it stripped
// only `… ? ! .` and kept commas, so 10 of the 42 needles carried a comma
// inside their first 24 characters ("ich bin der ansicht, das"). Chrome's
// speech recognizer emits no commas, which made 24% of the Redemittel
// unmatchable in a spoken Discussion. We strip ALL punctuation. Verified safe:
// the 42 needles stay distinct and none is a substring of another
// (locked by tests/composables/useRedemittelMatch.test.ts).

import {
  SPRECHEN_REDEMITTEL, HINT_MOVES, type Move, type Redemittel
} from '../data/sprechenRedemittel'

const NEEDLE_MAX = 24

/** A separator that cannot occur inside one turn, so needles never span turns. */
const TURN_SEP = ' ¶ '

function normalize(s: string): string {
  return s
    .replace(/[.,;:!?…]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function redemittelNeedle(phraseDe: string): string {
  return normalize(phraseDe).slice(0, NEEDLE_MAX)
}

/** The minimum a phrase bank must provide to be matchable. */
export interface PhraseLike {
  id: string
  move: string
  phraseDe: string
  // F5: literal override for phrases whose derived needle would span a
  // placeholder gap (see phraseNeedle). Absent for every Teil 2 Redemittel.
  needle?: string
}

/**
 * The needle actually used to match `p`: its explicit override when the
 * phrase has one, else the derived `redemittelNeedle`. `redemittelNeedle`
 * itself never changes — every Teil 2 Redemittel needle stays byte-identical.
 */
export function phraseNeedle(p: PhraseLike): string {
  return p.needle ?? redemittelNeedle(p.phraseDe)
}

/**
 * Which phrases of `bank` the learner's own words actually contained.
 * Generic over the bank so the Vortragsmittel bank works without widening
 * Teil 2's return type: with the default, `T` infers as `Redemittel`.
 */
export function matchRedemittel<T extends PhraseLike = Redemittel>(
  learnerTexts: readonly string[],
  bank: readonly T[] = SPRECHEN_REDEMITTEL as unknown as readonly T[]
): T[] {
  const hay = learnerTexts.map(normalize).join(TURN_SEP)
  if (hay.length === 0) return []
  return bank.filter(r => hay.includes(phraseNeedle(r)))
}

export function movesUsed<M extends string>(
  used: readonly { move: M }[]
): Partial<Record<M, number>> {
  const counts: Partial<Record<M, number>> = {}
  for (const r of used) counts[r.move] = (counts[r.move] ?? 0) + 1
  return counts
}

/**
 * The Move each learner turn reached for, for the runner rail's L1–Ln stepper.
 * Most hits wins; ties resolve by HINT_MOVES order (the panel's display order),
 * NOT by the order phrases happen to sit in the data. A turn that matched
 * nothing is null — the rail renders an em dash for it, never a blank.
 */
export function movePerTurn(learnerTexts: readonly string[]): (Move | null)[] {
  return learnerTexts.map(text => {
    const counts = movesUsed(matchRedemittel([text]))
    let best: Move | null = null
    let bestN = 0
    for (const m of HINT_MOVES) {
      const n = counts[m] ?? 0
      if (n > bestN) { best = m; bestN = n }
    }
    // A turn may use only the cheatsheet-only 'opinion' Move, which HINT_MOVES
    // excludes; fall back to it rather than reporting nothing.
    if (best === null && (counts.opinion ?? 0) > 0) return 'opinion'
    return best
  })
}

/**
 * The Move nudge (CONTEXT.md → "Move nudge"): a Move not used in THIS run,
 * preferring the one the learner's LIFETIME yield shows they reach for least.
 * Generic over the Move type, so Teil 2 callers keep `Move | null` and Teil 1
 * gets `VortragMove | null`.
 */
export function pickMoveNudge<M extends string = Move>(
  learnerTexts: readonly string[],
  lifetime: Readonly<Record<string, number>>,
  bank: readonly (PhraseLike & { move: M })[] =
    SPRECHEN_REDEMITTEL as unknown as readonly (PhraseLike & { move: M })[],
  moves: readonly M[] = HINT_MOVES as unknown as readonly M[]
): M | null {
  const usedThisRun = movesUsed(matchRedemittel(learnerTexts, bank))
  const candidates = moves.filter(m => (usedThisRun[m] ?? 0) === 0)
  if (candidates.length === 0) return null

  const lifetimeFor = (m: M): number =>
    bank.filter(r => r.move === m).reduce((sum, r) => sum + (lifetime[r.id] ?? 0), 0)

  // `moves` order is the tie-break, so a strict `<` keeps the first-listed
  // candidate when totals are equal.
  let best = candidates[0]
  let bestN = lifetimeFor(best)
  for (const m of candidates.slice(1)) {
    const n = lifetimeFor(m)
    if (n < bestN) { best = m; bestN = n }
  }
  return best
}
