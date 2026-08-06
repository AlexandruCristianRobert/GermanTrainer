// src/composables/usePackedSentenceQuiz.ts
//
// Packed-sentence quiz core (CONTEXT.md → "Sentence module", ADR-0015):
// per-card category counts, fresh sampling per card (ADR-0004), all
// randomness up front.

import { shuffle } from '../data/pool'
import type { Verb, VerbLevel, VerbCase } from '../data/verbs'
import type { PrepCase } from '../data/prepositions'
import type { NounRef } from './useSentenceQuiz'
import type { Connector } from '../data/connectors'

export type PackedCategory = 'verb' | 'noun' | 'prep' | 'dac' | 'conn'
export const PACKED_CATS: readonly PackedCategory[] = ['verb', 'noun', 'prep', 'dac', 'conn']
export interface PackedCounts { verb: number; noun: number; prep: number; dac: number; conn: number }
export const PACKED_MAX: PackedCounts = { verb: 3, noun: 3, prep: 3, dac: 3, conn: 2 }
export const PACKED_BUDGET = 8
export const PACKED_WARN_AT = 7

export function packedTotal(c: PackedCounts): number {
  return PACKED_CATS.reduce((s, cat) => s + c[cat], 0)
}

export interface PackedVerbRef { german: string; english: string; level: VerbLevel; case: VerbCase }
export function packedVerbToRef(v: Verb): PackedVerbRef {
  return { german: v.german, english: v.english, level: v.level, case: v.case }
}
export interface PackedPrepRef { id: string; german: string; english: string; case: PrepCase }
export interface PackedCollocRef { id: string; word: string; english: string; preposition: string; case: 'accusative' | 'dative' }

export interface PackedItemSpec {
  key: string
  cat: PackedCategory
  verb?: PackedVerbRef
  noun?: NounRef
  prep?: PackedPrepRef
  colloc?: PackedCollocRef
  conn?: Connector
}
export interface PackedCardSpec { index: number; items: PackedItemSpec[] }
export interface PackedPools {
  verbs: readonly PackedVerbRef[]
  nouns: readonly NounRef[]
  preps: readonly PackedPrepRef[]
  collocs: readonly PackedCollocRef[]
  conns: readonly Connector[]
}

/** A refilling shuffled bag: draws spread the pool before any repeat. */
function makeBag<T>(pool: readonly T[], rng: () => number) {
  let bag: T[] = []
  let i = 0
  return function next(): T | null {
    if (pool.length === 0) return null
    if (i >= bag.length) { bag = shuffle(pool, pool.length, rng); i = 0 }
    return bag[i++] ?? null
  }
}

/** Draw up to `k` distinct items (by `key`) from a bag. */
function drawUnique<T>(next: () => T | null, k: number, key: (t: T) => string): T[] {
  const out: T[] = []
  let guard = 0
  while (out.length < k && guard < k * 4) {
    guard++
    const t = next()
    if (t === null) break
    if (!out.some(x => key(x) === key(t))) out.push(t)
  }
  return out
}

/**
 * Build `cards` packed specs. Counts are PER CARD; every card samples fresh
 * words from refilling bags, so a run spreads each pool before repeating.
 */
export function buildPackedSpecs(
  pools: PackedPools, counts: PackedCounts, cards: number, rng: () => number = Math.random
): PackedCardSpec[] {
  const nextVerb = makeBag(pools.verbs, rng)
  const nextNoun = makeBag(pools.nouns, rng)
  const nextPrep = makeBag(pools.preps, rng)
  const nextColloc = makeBag(pools.collocs, rng)
  const nextConn = makeBag(pools.conns, rng)
  const specs: PackedCardSpec[] = []
  for (let index = 0; index < cards; index++) {
    const items: PackedItemSpec[] = []
    drawUnique(nextVerb, counts.verb, v => v.german)
      .forEach((verb, i) => items.push({ key: `v${i + 1}`, cat: 'verb', verb }))
    drawUnique(nextNoun, counts.noun, n => n.german)
      .forEach((noun, i) => items.push({ key: `n${i + 1}`, cat: 'noun', noun }))
    drawUnique(nextPrep, counts.prep, p => p.id)
      .forEach((prep, i) => items.push({ key: `p${i + 1}`, cat: 'prep', prep }))
    drawUnique(nextColloc, counts.dac, c => c.id)
      .forEach((colloc, i) => items.push({ key: `d${i + 1}`, cat: 'dac', colloc }))
    drawUnique(nextConn, counts.conn, c => c.id)
      .forEach((conn, i) => items.push({ key: `k${i + 1}`, cat: 'conn', conn }))
    specs.push({ index, items })
  }
  return specs
}

/** da(r) + preposition — 'dar-' before a vowel-initial preposition. */
export function daCompoundFor(preposition: string): string {
  const p = preposition.toLowerCase()
  return /^[aeiouäöü]/.test(p) ? `dar${p}` : `da${p}`
}

/** Short Rektion badge label for a verb ('warten + Akk'); null when there is
 *  no meaningful governed case to show. */
export function rektShort(c: VerbCase): string | null {
  switch (c) {
    case 'accusative': return 'Akk'
    case 'dative': return 'Dat'
    case 'dative+accusative': return 'Dat + Akk'
    case 'genitive': return 'Gen'
    case 'reflexive': return 'refl'
    default: return null
  }
}
