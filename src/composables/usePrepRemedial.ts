// Pure weak-point scoring + remedial-plan derivation for prep-sentence drills.
// No Vue, no DOM, no storage — only reads QuizHistoryEntry[] passed in.
//
// "Weak points" answer: which prepositions / nouns does the learner fail, and
// how badly (weighted by how often they've been seen). The remedial plan then
// proportions a mixed practice session (case fill-ins, noun cards, sentences)
// according to the learner's error profile (tagCounts).

import type {
  PrepErrorTag,
  PrepDrillItem,
  QuizHistoryEntry
} from './useQuizHistory'
import type { PrepCase, PrepositionExample } from '../data/prepositions'
import type { Noun } from '../db/types'
import type { GeneratedSentence } from './useSentenceQuiz'

// ── Remedial question (one card in a mixed drill deck) ───────────────
// A serializable union stashed to sessionStorage between setup and runner.

export type RemedialQuestion =
  | { format: 'case-fill'; prepId: string; prepGerman: string; prepEnglish: string; case: PrepCase; example: PrepositionExample }
  | { format: 'noun-gender'; noun: Noun }
  | { format: 'noun-translation'; noun: Noun }
  | { format: 'sentence'; sentence: GeneratedSentence }

// ── Weak points ─────────────────────────────────────────────────────

export interface WeakPrep {
  prepId: string
  german: string
  seen: number
  wrong: number
  byTag: { preposition: number; case: number }
  score: number
}

export interface WeakNoun {
  nounKey: string
  seen: number
  wrong: number
  score: number
}

export interface WeakPoints {
  weakPreps: WeakPrep[] // score desc
  weakNouns: WeakNoun[] // score desc
  tagCounts: Record<PrepErrorTag, number>
}

/** Error-rate weighted by log of attempts. 1-of-1 wrong → 0 (ln(1)=0), so a
 *  single miss on a barely-seen item doesn't dominate well-sampled weak spots. */
export function weightedScore(wrong: number, seen: number): number {
  return seen > 0 ? (wrong / seen) * Math.log(seen) : 0
}

const REMEDIAL_TYPES = new Set(['prep-sentence', 'prep-remedial'])

function emptyTagCounts(): Record<PrepErrorTag, number> {
  return { preposition: 0, case: 0, noun: 0, typo: 0 }
}

/** Tie-break: higher score, then more wrong, then more seen. */
function byScoreDesc(
  a: { score: number; wrong: number; seen: number },
  b: { score: number; wrong: number; seen: number }
): number {
  if (b.score !== a.score) return b.score - a.score
  if (b.wrong !== a.wrong) return b.wrong - a.wrong
  return b.seen - a.seen
}

export function computeWeakPoints(entries: QuizHistoryEntry[]): WeakPoints {
  const prepMap = new Map<string, WeakPrep>()
  const nounMap = new Map<string, WeakNoun>()
  const tagCounts = emptyTagCounts()

  for (const entry of entries) {
    if (!REMEDIAL_TYPES.has(entry.type)) continue
    const items: PrepDrillItem[] = entry.meta.sentenceItems ?? []

    for (const item of items) {
      const tags = item.tags
      const hasTags = Array.isArray(tags) && tags.length > 0

      // Prep attribution
      if (item.prepId) {
        let prep = prepMap.get(item.prepId)
        if (!prep) {
          prep = {
            prepId: item.prepId,
            german: item.prepGerman ?? item.prepId,
            seen: 0,
            wrong: 0,
            byTag: { preposition: 0, case: 0 },
            score: 0
          }
          prepMap.set(item.prepId, prep)
        }
        prep.seen++
        if (!item.correct) {
          const prepWrong = hasTags
            ? tags!.includes('preposition') || tags!.includes('case')
            : true
          if (prepWrong) prep.wrong++
        }
        if (hasTags) {
          if (tags!.includes('preposition')) prep.byTag.preposition++
          if (tags!.includes('case')) prep.byTag.case++
        }
      }

      // Noun attribution
      for (const key of item.nounKeys ?? []) {
        let noun = nounMap.get(key)
        if (!noun) {
          noun = { nounKey: key, seen: 0, wrong: 0, score: 0 }
          nounMap.set(key, noun)
        }
        noun.seen++
        if (!item.correct) {
          const nounWrong = hasTags ? tags!.includes('noun') : true
          if (nounWrong) noun.wrong++
        }
      }

      // Tag tally (typo contributes only here)
      if (hasTags) {
        for (const tag of tags!) tagCounts[tag]++
      }
    }
  }

  const weakPreps = [...prepMap.values()]
  for (const p of weakPreps) p.score = weightedScore(p.wrong, p.seen)
  weakPreps.sort(byScoreDesc)

  const weakNouns = [...nounMap.values()]
  for (const n of weakNouns) n.score = weightedScore(n.wrong, n.seen)
  weakNouns.sort(byScoreDesc)

  return { weakPreps, weakNouns, tagCounts }
}

// ── Remedial plan ───────────────────────────────────────────────────

export interface RemedialPlan {
  counts: { caseFill: number; nounCard: number; sentence: number }
  prepIdsForCase: string[]
  nounKeysForCards: string[]
  prepIdsForSentence: string[]
  nounKeysForSentence: string[]
}

type Group = 'caseFill' | 'nounCard' | 'sentence'

/** Largest-remainder apportionment of `total` across groups by weight.
 *  Groups with weight 0 get 0. Sum of result === total (when total >= 0). */
function apportion(
  weights: Record<Group, number>,
  total: number
): Record<Group, number> {
  const groups: Group[] = ['caseFill', 'nounCard', 'sentence']
  const sumW = groups.reduce((s, g) => s + weights[g], 0)
  const out: Record<Group, number> = { caseFill: 0, nounCard: 0, sentence: 0 }
  if (total <= 0 || sumW <= 0) return out

  const raw = groups.map(g => ({ g, exact: (weights[g] / sumW) * total }))
  let assigned = 0
  for (const r of raw) {
    out[r.g] = Math.floor(r.exact)
    assigned += out[r.g]
  }
  // Distribute the remainder to the largest fractional parts (then larger weight).
  let remainder = total - assigned
  const byFrac = [...raw].sort((a, b) => {
    const fa = a.exact - Math.floor(a.exact)
    const fb = b.exact - Math.floor(b.exact)
    if (fb !== fa) return fb - fa
    return weights[b.g] - weights[a.g]
  })
  let i = 0
  while (remainder > 0 && byFrac.length > 0) {
    const r = byFrac[i % byFrac.length]
    if (weights[r.g] > 0) {
      out[r.g]++
      remainder--
    } else {
      // no weighted group left to receive; stop to avoid infinite loop
      break
    }
    i++
  }
  return out
}

/** Build a deterministic (no-RNG) mixed-practice plan from a weak-point profile.
 *  Group weights come from tagCounts; unavailable groups (no source weak items)
 *  are zeroed and their share redistributes. With no tag data at all, falls back
 *  to an even split across whatever groups have source items. */
export function buildRemedialPlan(wp: WeakPoints, length: number): RemedialPlan {
  const hasPreps = wp.weakPreps.length > 0
  const hasNouns = wp.weakNouns.length > 0

  // Availability: case fill & sentences need preps; noun cards need nouns.
  // Sentences can run on preps alone.
  const available: Record<Group, boolean> = {
    caseFill: hasPreps,
    nounCard: hasNouns,
    sentence: hasPreps
  }

  let weights: Record<Group, number> = {
    caseFill: wp.tagCounts.case,
    nounCard: wp.tagCounts.noun,
    sentence: wp.tagCounts.preposition + wp.tagCounts.typo
  }
  // Zero out unavailable groups.
  for (const g of ['caseFill', 'nounCard', 'sentence'] as Group[]) {
    if (!available[g]) weights[g] = 0
  }

  const totalW = weights.caseFill + weights.nounCard + weights.sentence
  if (totalW <= 0) {
    // Fallback: even split across available groups.
    weights = {
      caseFill: available.caseFill ? 1 : 0,
      nounCard: available.nounCard ? 1 : 0,
      sentence: available.sentence ? 1 : 0
    }
  }

  const counts = apportion(weights, Math.max(0, length))

  const prepIds = wp.weakPreps.map(p => p.prepId)
  const nounKeys = wp.weakNouns.map(n => n.nounKey)

  return {
    counts,
    prepIdsForCase: prepIds.slice(0, counts.caseFill),
    nounKeysForCards: nounKeys.slice(0, counts.nounCard),
    prepIdsForSentence: prepIds.slice(0, counts.sentence),
    nounKeysForSentence: nounKeys.slice(0, counts.sentence)
  }
}
