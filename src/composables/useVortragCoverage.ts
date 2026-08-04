//
// Sprechen Teil 1 — the live Gliederung checklist. See ADR-0014.
//
// ONE dot per Gliederungspunkt, lit by the learner's OWN Vortragsplan keyword.
// That signal is unambiguous by construction: the learner assigned each keyword
// to exactly one point.
//
// PUNKT_MOVES deliberately does NOT drive this. `situation` and `erfahrung` map
// to the identical Move pair, `aspekt` serves three points and `kontrast` two,
// so a phrase match can only identify points 1 and 5 — and attributing the rest
// sequentially would invent precision we do not have. PUNKT_MOVES' only job is
// `outlinedMoves` below.

import {
  GLIEDERUNGSPUNKTE, PUNKT_MOVES, type GliederungKey, type VortragMove
} from '../data/sprechenVortragsmittel'
import type { VortragPlanEntry } from '../data/sprechen'

export interface PunktSignal {
  key: GliederungKey
  labelDe: string
  n: number
  keyword: string
  said: boolean
}

/** Same normalisation as the Redemittel matcher, so both agree on what "said" is. */
function normalize(s: string): string {
  return s.replace(/[.,;:!?…]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

export function emptyPlan(): VortragPlanEntry[] {
  return GLIEDERUNGSPUNKTE.map(p => ({ key: p.key, keyword: '' }))
}

/**
 * One signal per Gliederungspunkt, in plan order, whatever the plan contains.
 * A missing or empty keyword yields `said: false` and an empty `keyword` — the
 * rail renders a dash for it and never a false dot.
 *
 * Matching is a normalised substring test, so a planned "Freistellung" also
 * matches "Freistellungen". A keyword the speech recognizer splits
 * ("Schwimm Verein") will not match; that is the documented, accepted cost,
 * on the same terms as mishearings in the archive (ADR-0012).
 */
export function planSignals(plan: readonly VortragPlanEntry[], redeText: string): PunktSignal[] {
  const hay = normalize(redeText)
  const byKey = new Map(plan.map(p => [p.key, p.keyword ?? '']))
  return GLIEDERUNGSPUNKTE.map(p => {
    const keyword = (byKey.get(p.key) ?? '').trim()
    const needle = normalize(keyword)
    return {
      key: p.key,
      labelDe: p.labelDe,
      n: p.n,
      keyword,
      said: needle.length > 0 && hay.length > 0 && hay.includes(needle)
    }
  })
}

/** The last plan-ordered point whose own keyword has been said. */
export function furthestReachedPunkt(signals: readonly PunktSignal[]): GliederungKey | null {
  let out: GliederungKey | null = null
  for (const s of signals) if (s.said) out = s.key
  return out
}

/** Which drawer Move groups to outline — the furthest reached point's, or point 1's. */
export function outlinedMoves(furthest: GliederungKey | null): VortragMove[] {
  return PUNKT_MOVES[furthest ?? GLIEDERUNGSPUNKTE[0].key]
}
