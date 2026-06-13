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

export interface ProgressiveOptions<S, R> {
  /** Pre-planned batches (see planBatches). batches[0] runs alone, first. */
  batches: S[][]
  /** Generate one batch's results. May reject; rejection routes to onBatchError. */
  runBatch: (batch: S[]) => Promise<R[]>
  /** Called with each batch's results as it resolves (arrival order). */
  onResults: (results: R[]) => void
  /** Called when a batch rejects after runBatch's own retries. */
  onBatchError?: (batch: S[], err: unknown) => void
  /** Max concurrent batches for the remainder (after the first). Default 4. */
  concurrency?: number
}

/**
 * Run the first batch alone (so the caller can open the UI the moment it
 * resolves via onResults), then run the remaining batches with bounded
 * concurrency. Resolves when every batch has settled. Never rejects — batch
 * failures go to onBatchError.
 */
export async function generateProgressively<S, R>(opts: ProgressiveOptions<S, R>): Promise<void> {
  const { batches, runBatch, onResults, onBatchError } = opts
  const concurrency = Math.max(1, opts.concurrency ?? 4)
  if (batches.length === 0) return

  async function runOne(batch: S[]): Promise<void> {
    try {
      const results = await runBatch(batch)
      onResults(results)
    } catch (err) {
      onBatchError?.(batch, err)
    }
  }

  await runOne(batches[0])

  const rest = batches.slice(1)
  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < rest.length) {
      const batch = rest[cursor++]
      await runOne(batch)
    }
  }
  const workerCount = Math.min(concurrency, rest.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
}
