import { describe, test, expect } from 'vitest'
import { usePagination, buildPageList } from '../../src/composables/usePagination'

describe('buildPageList — compact page numbers with ellipses', () => {
  test('7 or fewer pages: full list', () => {
    expect(buildPageList(1, 1)).toEqual([1])
    expect(buildPageList(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(buildPageList(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
  test('many pages, current near start: 1, 2, 3, ..., last', () => {
    expect(buildPageList(1, 20)).toEqual([1, 2, '…', 20])
    expect(buildPageList(2, 20)).toEqual([1, 2, 3, '…', 20])
    expect(buildPageList(3, 20)).toEqual([1, 2, 3, 4, '…', 20])
  })
  test('many pages, current in middle: 1, ..., n-1, n, n+1, ..., last', () => {
    expect(buildPageList(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20])
  })
  test('many pages, current near end: 1, ..., n-2, n-1, n', () => {
    expect(buildPageList(20, 20)).toEqual([1, '…', 19, 20])
    expect(buildPageList(19, 20)).toEqual([1, '…', 18, 19, 20])
  })
})

describe('usePagination — reactive slice + paging', () => {
  test('empty array', () => {
    const p = usePagination(() => [], 10)
    expect(p.total.value).toBe(0)
    expect(p.totalPages.value).toBe(1)
    expect(p.slice.value).toEqual([])
  })
  test('single page', () => {
    const p = usePagination(() => [1, 2, 3], 10)
    expect(p.total.value).toBe(3)
    expect(p.totalPages.value).toBe(1)
    expect(p.slice.value).toEqual([1, 2, 3])
    expect(p.start.value).toBe(0)
    expect(p.end.value).toBe(3)
  })
  test('exact multiple', () => {
    const items = Array.from({ length: 20 }, (_, i) => i)
    const p = usePagination(() => items, 10)
    expect(p.totalPages.value).toBe(2)
    expect(p.slice.value).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    p.setPage(2)
    expect(p.slice.value).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
  })
  test('partial last page', () => {
    const items = Array.from({ length: 23 }, (_, i) => i)
    const p = usePagination(() => items, 10)
    expect(p.totalPages.value).toBe(3)
    p.setPage(3)
    expect(p.slice.value).toEqual([20, 21, 22])
    expect(p.start.value).toBe(20)
    expect(p.end.value).toBe(23)
  })
  test('changing pageSize resets to page 1', () => {
    const items = Array.from({ length: 50 }, (_, i) => i)
    const p = usePagination(() => items, 10)
    p.setPage(4)
    expect(p.page.value).toBe(4)
    p.setPageSize(25)
    expect(p.page.value).toBe(1)
    expect(p.pageSize.value).toBe(25)
    expect(p.slice.value.length).toBe(25)
  })
  test('clamps page if items shrink', () => {
    let n = 50
    const p = usePagination(() => Array.from({ length: n }, (_, i) => i), 10)
    p.setPage(5)
    expect(p.page.value).toBe(5)
    n = 12 // shrink — only 2 pages left
    expect(p.slice.value.length).toBeLessThanOrEqual(10)
  })
})
