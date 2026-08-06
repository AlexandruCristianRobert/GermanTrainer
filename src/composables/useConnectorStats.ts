// Pure weak-point scoring for connectors in sentence-packed runs
// (no Vue/DOM/storage). Mirrors useVerbSentenceStats, slimmed to one axis.

import type { ConnErrorTag, ConnectorDrillItem, QuizHistoryEntry } from './useQuizHistory'

export interface WeakConnector { connId: string; word: string; seen: number; wrong: number; score: number }
export interface ConnectorWeakPoints {
  weakConnectors: WeakConnector[]   // score desc
  tagCounts: Record<ConnErrorTag, number>
}

const PACKED_TYPES = new Set(['sentence-packed'])

/** Error-rate weighted by log of attempts (1-of-1 wrong → 0). */
export function weightedScore(wrong: number, seen: number): number {
  return seen > 0 ? (wrong / seen) * Math.log(seen) : 0
}

export function computeConnectorWeakPoints(entries: QuizHistoryEntry[]): ConnectorWeakPoints {
  const map = new Map<string, WeakConnector>()
  const tagCounts: Record<ConnErrorTag, number> = { connector: 0, 'word-order': 0, typo: 0 }
  for (const entry of entries) {
    if (!PACKED_TYPES.has(entry.type)) continue
    const items: ConnectorDrillItem[] = entry.meta.packedConnItems ?? []
    for (const item of items) {
      const key = item.connId ?? item.connWord ?? ''
      if (!key) continue
      let w = map.get(key)
      if (!w) { w = { connId: key, word: item.connWord ?? key, seen: 0, wrong: 0, score: 0 }; map.set(key, w) }
      w.seen++
      if (!item.correct) w.wrong++
      if (Array.isArray(item.tags)) for (const t of item.tags) tagCounts[t]++
    }
  }
  const weakConnectors = [...map.values()]
  for (const w of weakConnectors) w.score = weightedScore(w.wrong, w.seen)
  weakConnectors.sort((a, b) => b.score - a.score || b.wrong - a.wrong || b.seen - a.seen)
  return { weakConnectors, tagCounts }
}
