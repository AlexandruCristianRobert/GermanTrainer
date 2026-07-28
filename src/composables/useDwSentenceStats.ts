// Pure weak-point scoring for direction-words (hin-/her-) sentence drills
// (no Vue/DOM/storage). Mirrors useDacSentenceStats.computeDacWeakPoints,
// keyed on the adverb-pair element instead of a collocation.

import type { DwErrorTag, DwDrillItem, QuizHistoryEntry, QuizHistoryType } from './useQuizHistory'

export interface WeakPair { pair: string; compoundExamples: string[]; wrong: number; seen: number; score: number }
export interface DwWeakPoints {
  weakPairs: WeakPair[]  // score desc
  tagCounts: Record<DwErrorTag, number>
}

// Both AI drills feed this same weak-point computation: dw-sentence (T6,
// EN→DE) and dw-answer (T7) — each reads its own meta key below.
export const DW_HISTORY_TYPES = new Set<QuizHistoryType>(['dw-sentence', 'dw-answer'])
// A miss blames the pair unless it was purely the noun's fault — same
// precedent as da-compounds: 'noun' never counts against the drilled item.
const DW_FAULT_TAGS: DwErrorTag[] = ['direction', 'conjugation', 'case', 'word-order', 'typo']

/** Error-rate weighted by log of attempts (1-of-1 wrong → 0). */
export function weightedScore(wrong: number, seen: number): number {
  return seen > 0 ? (wrong / seen) * Math.log(seen) : 0
}

function emptyTagCounts(): Record<DwErrorTag, number> {
  return { direction: 0, conjugation: 0, case: 0, 'word-order': 0, noun: 0, typo: 0 }
}

/** The per-item drill array for one history entry, keyed by its own run type. */
function itemsFor(entry: QuizHistoryEntry): DwDrillItem[] {
  if (entry.type === 'dw-answer') return entry.meta.dwAnswerItems ?? []
  return entry.meta.dwSentenceItems ?? []
}

function byScoreDesc(a: { score: number; wrong: number; seen: number }, b: { score: number; wrong: number; seen: number }): number {
  if (b.score !== a.score) return b.score - a.score
  if (b.wrong !== a.wrong) return b.wrong - a.wrong
  return b.seen - a.seen
}

export function computeDwWeakPoints(entries: QuizHistoryEntry[]): DwWeakPoints {
  const pairMap = new Map<string, WeakPair>()
  const tagCounts = emptyTagCounts()

  for (const entry of entries) {
    if (!DW_HISTORY_TYPES.has(entry.type)) continue
    const items = itemsFor(entry)
    for (const item of items) {
      const tags = item.tags
      const hasTags = Array.isArray(tags) && tags.length > 0
      const blamesPair = !item.correct && (hasTags ? tags!.some(t => DW_FAULT_TAGS.includes(t)) : true)

      if (item.pair) {
        let p = pairMap.get(item.pair)
        if (!p) {
          p = { pair: item.pair, compoundExamples: [], wrong: 0, seen: 0, score: 0 }
          pairMap.set(item.pair, p)
        }
        p.seen++
        if (blamesPair) p.wrong++
        if (item.compound && !p.compoundExamples.includes(item.compound)) p.compoundExamples.push(item.compound)
      }

      if (hasTags) for (const t of tags!) tagCounts[t]++
    }
  }

  const weakPairs = [...pairMap.values()]
  for (const p of weakPairs) p.score = weightedScore(p.wrong, p.seen)
  weakPairs.sort(byScoreDesc)

  return { weakPairs, tagCounts }
}
