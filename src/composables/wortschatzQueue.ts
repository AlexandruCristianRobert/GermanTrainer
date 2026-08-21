// Wortschatz module — pure queue-building: Lern-Auswahl sampling (new items,
// kind-mixed), interleaved Wiederholen queue (due items, same-feld runs broken
// up), and Erkennen distractor options. Every function is a pure transform of
// its inputs — no state, no I/O, deterministic given the injected rng (never
// call Math.random directly except as the default parameter value). No Vue/DOM.

import type { Vokabel } from '../data/wortschatz'

export type Rng = () => number

/** Full Fisher-Yates shuffle of a copy; source is never mutated. */
function shuffle<T>(src: readonly T[], rng: Rng): T[] {
  const a = [...src]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** New-item pick for a Lern session: `count` unseen Vokabeln, mixing kinds so
 *  neither einzelwort nor wortverbindung dominates. When the pool is at most
 *  `count` items, the whole pool is returned (nothing left to sample). */
export function buildLernAuswahl(unseen: Vokabel[], count: number = 7, rng: Rng = Math.random): Vokabel[] {
  if (unseen.length <= count) return shuffle(unseen, rng)

  const minPerKind = Math.ceil(count / 3)
  const einzelwoerter = shuffle(unseen.filter(v => v.kind === 'einzelwort'), rng)
  const wortverbindungen = shuffle(unseen.filter(v => v.kind === 'wortverbindung'), rng)

  const takeEinzel = Math.min(minPerKind, einzelwoerter.length)
  const takeWortverb = Math.min(minPerKind, wortverbindungen.length)
  const guaranteed = [...einzelwoerter.slice(0, takeEinzel), ...wortverbindungen.slice(0, takeWortverb)]

  const remainder = shuffle(
    [...einzelwoerter.slice(takeEinzel), ...wortverbindungen.slice(takeWortverb)], rng
  )
  const fill = remainder.slice(0, Math.max(0, count - guaranteed.length))

  return shuffle([...guaranteed, ...fill], rng).slice(0, count)
}

/** Reorders an overdue-ordered (most-overdue-first) due list so same-feld
 *  entries are no longer adjacent whenever another feld is still available.
 *  Greedy walk: repeatedly emit the earliest remaining entry whose feld
 *  differs from the last one emitted; when every remaining entry shares the
 *  last feld (single-feld tail), emit the earliest remaining entry instead.
 *  The result is already fully determined by the input order, so rng is
 *  accepted only for signature parity with the other two builders here. */
export function buildWiederholQueue<T extends { v: Vokabel }>(due: T[], rng: Rng = Math.random): T[] {
  void rng
  const remaining = [...due]
  const out: T[] = []
  let lastFeld: string | null = null
  while (remaining.length > 0) {
    let idx: number = lastFeld === null ? -1 : remaining.findIndex(entry => entry.v.feld !== lastFeld)
    if (idx === -1) idx = 0
    const [next]: T[] = remaining.splice(idx, 1)
    out.push(next)
    lastFeld = next.v.feld
  }
  return out
}

/** 4 unique English glosses for an Erkennen prompt: `v.en` plus 3 distractors
 *  drawn from `pool`, preferring same-feld same-kind items, topped up with
 *  cross-feld same-kind items, then any remaining item; deduped by gloss text
 *  and shuffled so the correct answer's position is not predictable. */
export function pickErkennenOptions(v: Vokabel, pool: Vokabel[], rng: Rng = Math.random): string[] {
  const others = pool.filter(p => p.id !== v.id)
  const sameFeldSameKind = shuffle(others.filter(p => p.feld === v.feld && p.kind === v.kind), rng)
  const crossFeldSameKind = shuffle(others.filter(p => p.feld !== v.feld && p.kind === v.kind), rng)
  const rest = shuffle(others, rng)

  const used = new Set<string>([v.en])
  const distractors: string[] = []
  for (const tier of [sameFeldSameKind, crossFeldSameKind, rest]) {
    for (const candidate of tier) {
      if (distractors.length >= 3) break
      if (used.has(candidate.en)) continue
      used.add(candidate.en)
      distractors.push(candidate.en)
    }
    if (distractors.length >= 3) break
  }

  return shuffle([v.en, ...distractors], rng)
}
