// Pure weak-point scoring for da-compound sentence drills (no Vue/DOM/storage).
// Mirrors useVerbSentenceStats.computeVerbWeakPoints, slimmed for da-compounds.

import type { DacErrorTag, DacDrillItem, QuizHistoryEntry } from './useQuizHistory'

export interface WeakColloc { collocId: string; label: string; seen: number; wrong: number; score: number }
export interface WeakDacPrep { prepGerman: string; seen: number; wrong: number; score: number }
export interface DacWeakPoints {
  weakCollocs: WeakColloc[]  // score desc
  weakPreps: WeakDacPrep[]   // score desc
  tagCounts: Record<DacErrorTag, number>
}

const DAC_SENTENCE_TYPES = new Set(['dac-sentence'])
// A miss blames the collocation/preposition unless it was purely the noun's fault.
const DAC_FAULT_TAGS: DacErrorTag[] = ['preposition', 'compound', 'case', 'typo']

/** Error-rate weighted by log of attempts (1-of-1 wrong → 0). */
export function weightedScore(wrong: number, seen: number): number {
  return seen > 0 ? (wrong / seen) * Math.log(seen) : 0
}

function emptyTagCounts(): Record<DacErrorTag, number> {
  return { preposition: 0, compound: 0, case: 0, noun: 0, typo: 0 }
}

function byScoreDesc(a: { score: number; wrong: number; seen: number }, b: { score: number; wrong: number; seen: number }): number {
  if (b.score !== a.score) return b.score - a.score
  if (b.wrong !== a.wrong) return b.wrong - a.wrong
  return b.seen - a.seen
}

export function computeDacWeakPoints(entries: QuizHistoryEntry[]): DacWeakPoints {
  const collocMap = new Map<string, WeakColloc>()
  const prepMap = new Map<string, WeakDacPrep>()
  const tagCounts = emptyTagCounts()

  for (const entry of entries) {
    if (!DAC_SENTENCE_TYPES.has(entry.type)) continue
    const items: DacDrillItem[] = entry.meta.dacSentenceItems ?? []
    for (const item of items) {
      const tags = item.tags
      const hasTags = Array.isArray(tags) && tags.length > 0
      const blamesColloc = !item.correct && (hasTags ? tags!.some(t => DAC_FAULT_TAGS.includes(t)) : true)

      if (item.collocId) {
        let c = collocMap.get(item.collocId)
        if (!c) {
          const label = item.collocWord && item.prepGerman
            ? `${item.collocWord} · ${item.prepGerman}`
            : (item.collocWord ?? item.collocId)
          c = { collocId: item.collocId, label, seen: 0, wrong: 0, score: 0 }
          collocMap.set(item.collocId, c)
        }
        c.seen++
        if (blamesColloc) c.wrong++
      }

      if (item.prepGerman) {
        let p = prepMap.get(item.prepGerman)
        if (!p) { p = { prepGerman: item.prepGerman, seen: 0, wrong: 0, score: 0 }; prepMap.set(item.prepGerman, p) }
        p.seen++
        if (blamesColloc) p.wrong++
      }

      if (hasTags) for (const t of tags!) tagCounts[t]++
    }
  }

  const weakCollocs = [...collocMap.values()]
  for (const c of weakCollocs) c.score = weightedScore(c.wrong, c.seen)
  weakCollocs.sort(byScoreDesc)

  const weakPreps = [...prepMap.values()]
  for (const p of weakPreps) p.score = weightedScore(p.wrong, p.seen)
  weakPreps.sort(byScoreDesc)

  return { weakCollocs, weakPreps, tagCounts }
}
