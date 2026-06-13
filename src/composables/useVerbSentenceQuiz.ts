// AI-generated verb sentence-translation quiz (EN→DE, AI-graded).
//
// The learner picks a verb pool (level/type/case) and a noun theme. We sample
// per-sentence "specs" (1–2 drilled verbs + 1–2 theme nouns) up front — so all
// randomization is decided before any AI call (ADR-0004) — then generate the
// English+German sentence pairs progressively. The AI also returns the German
// dictionary form for every highlighted word so incidental nouns can be hinted
// (ADR-0003). The learner reads the English and types the German.

import { shuffle } from '../data/pool'
import type { Verb, VerbLevel } from '../data/verbs'
import type { NounRef } from './useSentenceQuiz'

// ─────────────────────────────── Types ────────────────────────────────

/** A drilled verb handed to the AI to build a sentence around. */
export interface VerbRef {
  german: string   // infinitive / dictionary form
  english: string  // gloss, e.g. "go" or "make / do"
  level: VerbLevel
}

export type WordsPer = 1 | 2 | 'mix'

/** A verb error category the AI grader may assign (re-exported from history). */
export type { VerbErrorTag } from './useQuizHistory'

/** Drilled verbs + theme nouns for one sentence, before the AI writes it. */
export interface VerbSentenceSpec {
  index: number
  verbs: VerbRef[]
  nouns: NounRef[]
}

/** A noun/verb the AI introduced for naturalness, with its German to reveal. */
export interface ExtraWord {
  en: string   // exact English surface in the sentence
  de: string   // German dictionary form (infinitive / article + noun)
  kind: 'verb' | 'noun'
}

/** A spec once the AI has produced the sentence pair + highlight surfaces. */
export interface GeneratedVerbSentence extends VerbSentenceSpec {
  english: string
  german: string
  /** Exact English surface for each drilled verb, in order. */
  verbSpansEn?: string[]
  /** Exact English surface for each theme noun, in order. */
  nounSpansEn?: string[]
  /** Other highlighted nouns/verbs with AI-supplied German. */
  extraWords?: ExtraWord[]
}

export interface VerbSentenceVerdict {
  index: number
  correct: boolean
  correction: string   // the reference German, shown when wrong
  tip?: string
  tags?: import('./useQuizHistory').VerbErrorTag[]
}

// ───────────────────────────── Pure helpers ───────────────────────────

/** Project a stored Verb to the lean ref the prompt needs. */
export function verbToRef(v: Verb): VerbRef {
  return { german: v.german, english: v.english, level: v.level }
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
 * Build `count` specs, each with `verbsPer` distinct drilled verbs and
 * `nounsPer` distinct theme nouns drawn from refilling bags (good spread).
 */
export function buildVerbSpecs(
  verbPool: readonly VerbRef[],
  nounPool: readonly NounRef[],
  count: number,
  verbsPer: WordsPer,
  nounsPer: WordsPer,
  rng: () => number = Math.random
): VerbSentenceSpec[] {
  const nextVerb = makeBag(verbPool, rng)
  const nextNoun = makeBag(nounPool, rng)
  const specs: VerbSentenceSpec[] = []
  for (let index = 0; index < count; index++) {
    const kv = verbsPer === 'mix' ? (rng() < 0.5 ? 1 : 2) : verbsPer
    const kn = nounsPer === 'mix' ? (rng() < 0.5 ? 1 : 2) : nounsPer
    specs.push({
      index,
      verbs: drawUnique(nextVerb, kv, v => v.german),
      nouns: drawUnique(nextNoun, kn, n => n.german)
    })
  }
  return specs
}
