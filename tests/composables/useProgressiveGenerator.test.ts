import { describe, test, expect } from 'vitest'
import { planBatches, planRampBatches, generateProgressively } from '../../src/composables/useProgressiveGenerator'

describe('planRampBatches', () => {
  test('empty input → no batches', () => {
    expect(planRampBatches([], [1, 2, 5], 10)).toEqual([])
  })
  test('ramp 1,2,5 exactly consumes 8 items', () => {
    expect(planRampBatches([1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 5], 10))
      .toEqual([[1], [2, 3], [4, 5, 6, 7, 8]])
  })
  test('ramp 1,2,5 then chunks of 10, with a small remainder', () => {
    const items = Array.from({ length: 20 }, (_, i) => i + 1)
    expect(planRampBatches(items, [1, 2, 5], 10)).toEqual([
      [1], [2, 3], [4, 5, 6, 7, 8],
      [9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      [19, 20],
    ])
  })
  test('ramp 5 then chunks of 10 (5,10,10 for 25)', () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1)
    expect(planRampBatches(items, [5], 10).map(b => b.length)).toEqual([5, 10, 10])
  })
  test('custom 100 with ramp 5 → 5,10×9,5', () => {
    const items = Array.from({ length: 100 }, (_, i) => i)
    expect(planRampBatches(items, [5], 10).map(b => b.length)).toEqual([5, 10, 10, 10, 10, 10, 10, 10, 10, 10, 5])
  })
  test('fewer items than the ramp → partial ramp only', () => {
    expect(planRampBatches([1, 2, 3], [1, 2, 5], 10)).toEqual([[1], [2, 3]])
  })
  test('no first sizes → pure chunks of batchSize', () => {
    expect(planRampBatches([1, 2, 3, 4, 5], [], 2)).toEqual([[1, 2], [3, 4], [5]])
  })
})

describe('planBatches', () => {
  test('empty input → no batches', () => {
    expect(planBatches([], 1, 5)).toEqual([])
  })
  test('single item → one batch', () => {
    expect(planBatches([1], 1, 5)).toEqual([[1]])
  })
  test('first batch of 1, then chunks of 5', () => {
    expect(planBatches([1, 2, 3, 4, 5, 6, 7], 1, 5)).toEqual([[1], [2, 3, 4, 5, 6], [7]])
  })
  test('first batch of 1, remainder smaller than chunk', () => {
    expect(planBatches([1, 2, 3], 1, 5)).toEqual([[1], [2, 3]])
  })
  test('firstBatchSize larger than input → single batch', () => {
    expect(planBatches([1, 2], 5, 5)).toEqual([[1, 2]])
  })
  test('exact chunk multiples after the first', () => {
    expect(planBatches([0, 1, 2, 3, 4, 5], 1, 5)).toEqual([[0], [1, 2, 3, 4, 5]])
  })
})

describe('generateProgressively', () => {
  test('delivers the first batch before any later batch, and all results', async () => {
    const batches = [[1], [2, 3], [4, 5]]
    const order: number[][] = []
    await generateProgressively<number, number>({
      batches,
      runBatch: async (b) => b.map(n => n * 10),
      onResults: (r) => { order.push(r) },
      concurrency: 2
    })
    expect(order[0]).toEqual([10]) // first batch surfaced first
    const all = order.flat().sort((a, b) => a - b)
    expect(all).toEqual([10, 20, 30, 40, 50])
  })

  test('a throwing batch routes to onBatchError and never rejects', async () => {
    const seen: number[] = []
    const errors: unknown[] = []
    await expect(generateProgressively<number, number>({
      batches: [[1], [2], [3]],
      runBatch: async (b) => { if (b[0] === 2) throw new Error('boom'); return b },
      onResults: (r) => seen.push(...r),
      onBatchError: (_b, e) => errors.push(e),
      concurrency: 2
    })).resolves.toBeUndefined()
    expect(seen.sort()).toEqual([1, 3])
    expect(errors).toHaveLength(1)
  })

  test('empty batches → resolves immediately, no callbacks', async () => {
    let called = false
    await generateProgressively<number, number>({
      batches: [], runBatch: async (b) => b, onResults: () => { called = true }
    })
    expect(called).toBe(false)
  })

  test('if the first batch throws, later batches still run', async () => {
    const seen: number[] = []
    await generateProgressively<number, number>({
      batches: [[1], [2], [3]],
      runBatch: async (b) => { if (b[0] === 1) throw new Error('first failed'); return b },
      onResults: (r) => seen.push(...r),
      onBatchError: () => {}
    })
    expect(seen.sort()).toEqual([2, 3])
  })
})
