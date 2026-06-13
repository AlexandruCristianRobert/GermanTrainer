import { describe, test, expect } from 'vitest'
import { planBatches } from '../../src/composables/useProgressiveGenerator'

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
