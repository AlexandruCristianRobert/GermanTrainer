// Generic, framework-free progressive batch generation (ADR-0004).
// `planBatches` slices a work-list so the first batch is tiny (fastest first
// paint) and the rest are even chunks. `generateProgressively` runs the first
// batch alone, surfaces it, then runs the remaining batches concurrently,
// delivering each batch's results via a callback as they resolve.

/** First chunk of `firstBatchSize`, then chunks of `batchSize`. */
export function planBatches<T>(items: readonly T[], firstBatchSize: number, batchSize: number): T[][] {
  const out: T[][] = []
  const first = Math.max(1, firstBatchSize)
  const rest = Math.max(1, batchSize)
  if (items.length === 0) return out
  out.push(items.slice(0, first))
  for (let i = first; i < items.length; i += rest) {
    out.push(items.slice(i, i + rest))
  }
  return out
}
