import { computed, ref, type ComputedRef, type Ref } from 'vue'

export type PageItem = number | '…'

/**
 * Compact page-number list with ellipses. Always includes first + last + (current ± 1).
 * If total ≤ 7, returns every page.
 */
export function buildPageList(current: number, total: number): PageItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const out: PageItem[] = [1]
  if (current > 3) out.push('…')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) out.push(i)
  if (current < total - 2) out.push('…')
  out.push(total)
  return out
}

export interface PaginationApi<T> {
  page: Ref<number>
  pageSize: Ref<number>
  setPage: (n: number) => void
  setPageSize: (n: number) => void
  total: ComputedRef<number>
  totalPages: ComputedRef<number>
  start: ComputedRef<number>
  end: ComputedRef<number>
  slice: ComputedRef<T[]>
  pageList: ComputedRef<PageItem[]>
}

export function usePagination<T>(
  source: () => readonly T[] | T[],
  defaultPageSize = 10
): PaginationApi<T> {
  const page = ref(1)
  const pageSize = ref(defaultPageSize)

  const items = computed(() => source())
  const total = computed(() => items.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  // Effective (clamped) page — the source might shrink between renders.
  const safePage = computed(() => Math.min(Math.max(1, page.value), totalPages.value))
  const start = computed(() => (safePage.value - 1) * pageSize.value)
  const end = computed(() => Math.min(start.value + pageSize.value, total.value))
  const slice = computed(() => items.value.slice(start.value, end.value))
  const pageList = computed(() => buildPageList(safePage.value, totalPages.value))

  function setPage(n: number) {
    page.value = Math.min(Math.max(1, n), totalPages.value)
  }
  function setPageSize(n: number) {
    pageSize.value = Math.max(1, n)
    page.value = 1
  }

  // Expose safePage as `page` so callers always see the clamped value.
  return {
    page: computed(() => safePage.value) as unknown as Ref<number>,
    pageSize,
    setPage,
    setPageSize,
    total,
    totalPages,
    start,
    end,
    slice,
    pageList
  }
}
