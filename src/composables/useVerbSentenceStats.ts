// Pure weak-point scoring for verb-sentence drills (no Vue/DOM/storage).
// Mirrors usePrepRemedial.computeWeakPoints, slimmed for verbs.

import type { VerbErrorTag, VerbDrillItem, QuizHistoryEntry } from './useQuizHistory'

export interface WeakVerb { verbKey: string; seen: number; wrong: number; score: number }
export interface WeakVerbNoun { nounKey: string; seen: number; wrong: number; score: number }
export interface VerbWeakPoints {
  weakVerbs: WeakVerb[]   // score desc
  weakNouns: WeakVerbNoun[] // score desc
  tagCounts: Record<VerbErrorTag, number>
}

const VERB_REMEDIAL_TYPES = new Set(['verb-sentence', 'verb-remedial'])
// A miss blames the verb unless it was purely a noun's fault.
const VERB_FAULT_TAGS: VerbErrorTag[] = ['conjugation', 'case', 'word-order', 'typo']

/** Error-rate weighted by log of attempts (1-of-1 wrong → 0). */
export function weightedScore(wrong: number, seen: number): number {
  return seen > 0 ? (wrong / seen) * Math.log(seen) : 0
}

function emptyTagCounts(): Record<VerbErrorTag, number> {
  return { conjugation: 0, case: 0, 'word-order': 0, noun: 0, typo: 0 }
}

function byScoreDesc(a: { score: number; wrong: number; seen: number }, b: { score: number; wrong: number; seen: number }): number {
  if (b.score !== a.score) return b.score - a.score
  if (b.wrong !== a.wrong) return b.wrong - a.wrong
  return b.seen - a.seen
}

export function computeVerbWeakPoints(entries: QuizHistoryEntry[]): VerbWeakPoints {
  const verbMap = new Map<string, WeakVerb>()
  const nounMap = new Map<string, WeakVerbNoun>()
  const tagCounts = emptyTagCounts()

  for (const entry of entries) {
    if (!VERB_REMEDIAL_TYPES.has(entry.type)) continue
    const items: VerbDrillItem[] = entry.meta.verbSentenceItems ?? []
    for (const item of items) {
      const tags = item.tags
      const hasTags = Array.isArray(tags) && tags.length > 0

      for (const key of item.verbKeys ?? []) {
        let v = verbMap.get(key)
        if (!v) { v = { verbKey: key, seen: 0, wrong: 0, score: 0 }; verbMap.set(key, v) }
        v.seen++
        if (!item.correct) {
          const verbWrong = hasTags ? tags!.some(t => VERB_FAULT_TAGS.includes(t)) : true
          if (verbWrong) v.wrong++
        }
      }
      for (const key of item.nounKeys ?? []) {
        let n = nounMap.get(key)
        if (!n) { n = { nounKey: key, seen: 0, wrong: 0, score: 0 }; nounMap.set(key, n) }
        n.seen++
        if (!item.correct) {
          const nounWrong = hasTags ? tags!.includes('noun') : true
          if (nounWrong) n.wrong++
        }
      }
      if (hasTags) for (const t of tags!) tagCounts[t]++
    }
  }

  const weakVerbs = [...verbMap.values()]
  for (const v of weakVerbs) v.score = weightedScore(v.wrong, v.seen)
  weakVerbs.sort(byScoreDesc)

  const weakNouns = [...nounMap.values()]
  for (const n of weakNouns) n.score = weightedScore(n.wrong, n.seen)
  weakNouns.sort(byScoreDesc)

  return { weakVerbs, weakNouns, tagCounts }
}

/** Weakest verb + noun keys (those actually missed), capped at `limit` each. */
export function weakKeysForRemedial(wp: VerbWeakPoints, limit: number): { verbKeys: string[]; nounKeys: string[] } {
  return {
    verbKeys: wp.weakVerbs.filter(v => v.wrong > 0).slice(0, limit).map(v => v.verbKey),
    nounKeys: wp.weakNouns.filter(n => n.wrong > 0).slice(0, limit).map(n => n.nounKey)
  }
}

/** Prefer the weak items; if there are none, drill the whole pool. */
export function selectRemedialPool<T>(weak: readonly T[], fallback: readonly T[]): T[] {
  return weak.length > 0 ? [...weak] : [...fallback]
}
