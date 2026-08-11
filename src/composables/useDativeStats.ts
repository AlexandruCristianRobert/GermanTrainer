// Pure weak-point scoring for the Dativ sentence drill (no Vue/DOM/storage).
// Mirrors useDwSentenceStats.computeDwWeakPoints, keyed on the dative VERB.
// Reads the 100-run history window (ADR-0002) — weak points SHOULD decay;
// the lifetime store for "which words do I own" is gt:dativeLedger (ADR-0017),
// not this.

import type { DatErrorTag, DatDrillItem, QuizHistoryEntry, QuizHistoryType } from './useQuizHistory'

export interface WeakDativeVerb { verb: string; family: string | null; wrong: number; seen: number; score: number }
export interface DativeWeakPoints {
  weakVerbs: WeakDativeVerb[]  // score desc
  tagCounts: Record<DatErrorTag, number>
}

export const DAT_SENTENCE_TYPES = new Set<QuizHistoryType>(['dat-sentence'])
// A miss blames the verb unless it was purely the noun's fault — the same
// precedent as da-compounds and direction-words: 'noun' never counts against
// the drilled item.
const DAT_FAULT_TAGS: DatErrorTag[] = ['case', 'subject', 'twin', 'object-order', 'conjugation', 'word-order', 'typo']

/** Error-rate weighted by log of attempts (1-of-1 wrong → 0). */
export function weightedScore(wrong: number, seen: number): number {
  return seen > 0 ? (wrong / seen) * Math.log(seen) : 0
}

function emptyTagCounts(): Record<DatErrorTag, number> {
  return { 'case': 0, 'subject': 0, 'twin': 0, 'object-order': 0, 'conjugation': 0, 'word-order': 0, 'noun': 0, 'typo': 0 }
}

function byScoreDesc(a: WeakDativeVerb, b: WeakDativeVerb): number {
  if (b.score !== a.score) return b.score - a.score
  if (b.wrong !== a.wrong) return b.wrong - a.wrong
  return b.seen - a.seen
}

export function computeDativeWeakPoints(entries: QuizHistoryEntry[]): DativeWeakPoints {
  const verbMap = new Map<string, WeakDativeVerb>()
  const tagCounts = emptyTagCounts()

  for (const entry of entries) {
    if (!DAT_SENTENCE_TYPES.has(entry.type)) continue
    const items: DatDrillItem[] = entry.meta.datSentenceItems ?? []
    for (const item of items) {
      const tags = item.tags
      const hasTags = Array.isArray(tags) && tags.length > 0
      const blamesVerb = !item.correct && (hasTags ? tags!.some(t => DAT_FAULT_TAGS.includes(t)) : true)

      if (item.verb) {
        let v = verbMap.get(item.verb)
        if (!v) {
          v = { verb: item.verb, family: item.family ?? null, wrong: 0, seen: 0, score: 0 }
          verbMap.set(item.verb, v)
        }
        v.seen++
        if (blamesVerb) v.wrong++
      }

      if (hasTags) for (const t of tags!) tagCounts[t]++
    }
  }

  const weakVerbs = [...verbMap.values()]
  for (const v of weakVerbs) v.score = weightedScore(v.wrong, v.seen)
  weakVerbs.sort(byScoreDesc)

  return { weakVerbs, tagCounts }
}

/** The remedial pool: verbs with at least one blamed miss, worst first. */
export function weakestDativeVerbs(entries: QuizHistoryEntry[], limit = 8): string[] {
  return computeDativeWeakPoints(entries).weakVerbs
    .filter(v => v.wrong > 0)
    .slice(0, limit)
    .map(v => v.verb)
}
