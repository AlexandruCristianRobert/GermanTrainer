// Tagesplan (ADR-0026) — the read-only "what should I practise today" aggregation.
// Reads each tracking store through its public reader and returns display rows;
// it never samples, weights, or writes state of its own. Every reader is
// fail-soft: a throwing source drops its row(s) instead of breaking Home.
// No Vue/DOM.
//
// One caveat on "never writes": computeDrillMastery performs its own documented
// one-time lazy seed of `gt:drillTotals` (useDrillMastery's ensureSeeded), so
// calling Tagesplan can trigger that seed the same way opening a hub does. That
// is the mastery module's business, idempotent, and not Tagesplan state.

import { openCorrections, dueCorrections } from './useSprechenArchive'
import { shakyItems } from './useDativeLedger'
import { dueVokabelCount } from './useWortschatzProgress'
import { computeWeakPoints } from './usePrepRemedial'
import { computeVerbWeakPoints } from './useVerbSentenceStats'
import { computeDrillMastery } from './useDrillMastery'
import { DW_FAMILIES, DAC_PHASES, DAT_FAMILIES, type DrillCard } from '../data/drillCatalogue'
import type { QuizHistoryEntry } from './useQuizHistory'

export interface TagesplanRow {
  id: string
  title: string
  detail: string
  route: string
  count: number
  /** Route query the destination needs to disambiguate a shared route
   *  (dac-T14/T15 both live on `dacompounds-sentence`, split by direction). */
  query?: Record<string, string>
}

const MODULE_LABEL: Record<string, string> = {
  dw: 'hin & her',
  dac: 'Pronominaladverbien',
  dat: 'Dativ',
}

/** 'dw-T1' → its catalogue card, or null when no card carries that code. */
function cardFor(masteryKey: string): { card: DrillCard; module: string } | null {
  const [module, code] = masteryKey.split('-', 2)
  const families = module === 'dw' ? DW_FAMILIES : module === 'dac' ? DAC_PHASES : module === 'dat' ? DAT_FAMILIES : null
  if (!families || !code) return null
  for (const family of families) {
    const card = family.cards.find(c => c.code === code)
    if (card) return { card, module }
  }
  return null
}

function joinNames(names: string[], max: number): string {
  const shown = names.slice(0, max)
  const rest = names.length - shown.length
  return rest > 0 ? `${shown.join(' · ')} · +${rest}` : shown.join(' · ')
}

export async function buildTagesplan(
  entries: QuizHistoryEntry[], now: number = Date.now()
): Promise<TagesplanRow[]> {
  const rows: TagesplanRow[] = []

  // 1 — Korrekturdrill: offen + fällig (ADR-0025 states, shown side by side, never summed)
  try {
    const [open, due] = await Promise.all([openCorrections(), dueCorrections(undefined, undefined, now)])
    if (open.length + due.length > 0) {
      rows.push({
        id: 'korrekturen',
        title: 'Korrekturdrill',
        detail: `${open.length} offen · ${due.length} fällig`,
        route: 'sprechen-drill',
        count: open.length + due.length,
      })
    }
  } catch { /* fail-soft: row omitted */ }

  // 2 — Wortschatz: fällige Vokabeln (ADR-0027 schedule, read through the
  // module's own reader; the row deep-links to the hub, never samples).
  try {
    const due = await dueVokabelCount(now)
    if (due > 0) {
      rows.push({
        id: 'wortschatz-faellig',
        title: 'Wortschatz · Fällige Vokabeln',
        detail: `${due} fällig`,
        route: 'wortschatz',
        count: due,
      })
    }
  } catch { /* fail-soft */ }

  // 3 — Dativ ledger: wackelige items, longest-unseen first. The order and the
  // filter live in useDativeLedger (shakyItems) so the hub's chip row and this
  // row can never disagree about which names are "the wackelige ones".
  try {
    const shaky = shakyItems()
    if (shaky.length > 0) {
      rows.push({
        id: 'dativ-wackelig',
        title: 'Dativ · Wackelige Wörter',
        detail: joinNames(shaky, 3),
        route: 'dative',
        count: shaky.length,
      })
    }
  } catch { /* fail-soft */ }

  // 4 + 5 — weak points (prep, verb): evidence-scored from the history window
  try {
    const weak = computeWeakPoints(entries).weakPreps.filter(p => p.score > 0)
    if (weak.length > 0) {
      rows.push({
        id: 'schwache-praepositionen',
        title: 'Präpositionen · Schwache Stellen',
        detail: joinNames(weak.map(p => p.german), 3),
        route: 'prepositions-remedial',
        count: weak.length,
      })
    }
  } catch { /* fail-soft */ }
  try {
    const weak = computeVerbWeakPoints(entries).weakVerbs.filter(v => v.score > 0)
    if (weak.length > 0) {
      rows.push({
        id: 'schwache-verben',
        title: 'Verben · Schwache Stellen',
        detail: joinNames(weak.map(v => v.verbKey), 3),
        route: 'verbs-remedial',
        count: weak.length,
      })
    }
  } catch { /* fail-soft */ }

  // 6 — lowest mastery bands (1–2): the drills that most need work, capped at 3
  try {
    const mastery = Object.values(computeDrillMastery(entries))
      .filter(m => m.band >= 1 && m.band <= 2)
      .sort((a, b) => (a.band - b.band) || (a.accuracy - b.accuracy) || (b.total - a.total))
    let added = 0
    for (const m of mastery) {
      if (added >= 3) break
      const hit = cardFor(m.key)
      if (!hit) continue
      rows.push({
        id: `band-${m.key}`,
        title: `${MODULE_LABEL[hit.module]} · ${hit.card.de}`,
        detail: `Band ${m.band} · ${Math.round(m.accuracy * 100)} % · ${m.total} Fragen`,
        route: hit.card.route,
        count: 1,
        ...(hit.card.query ? { query: hit.card.query } : {}),
      })
      added += 1
    }
  } catch { /* fail-soft */ }

  return rows
}
