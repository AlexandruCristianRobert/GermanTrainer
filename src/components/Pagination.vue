<script setup lang="ts">
import type { PaginationApi } from '../composables/usePagination'

const props = withDefaults(
  defineProps<{
    pagination: PaginationApi<unknown>
    label?: string
    pageSizeOptions?: number[]
    hidePageSizeBelow?: number
  }>(),
  {
    label: 'items',
    pageSizeOptions: () => [10, 25, 50, 100],
    hidePageSizeBelow: 0
  }
)

function setPage(n: number) { props.pagination.setPage(n) }
function setSize(e: Event) {
  const v = parseInt((e.target as HTMLSelectElement).value, 10)
  props.pagination.setPageSize(v)
}
</script>

<template>
  <nav
    v-if="pagination.total.value > 0"
    class="pagination"
    :aria-label="`Pagination · ${label}`"
  >
    <div class="pg-meta">
      <span class="pg-range">
        <strong>{{ pagination.start.value + 1 }}</strong>
        <span class="pg-dash">–</span>
        <strong>{{ pagination.end.value }}</strong>
        <span class="pg-of"> of </span>
        <strong>{{ pagination.total.value }}</strong>
        <span class="pg-label"> {{ label }}</span>
      </span>
    </div>

    <div class="pg-pages" role="group" aria-label="Page selector">
      <button
        type="button"
        class="pg-arrow"
        :disabled="pagination.page.value === 1"
        aria-label="Previous page"
        @click="setPage(pagination.page.value - 1)"
      >‹ Prev</button>

      <template v-for="(p, i) in pagination.pageList.value" :key="typeof p === 'number' ? p : `el-${i}`">
        <span v-if="p === '…'" class="pg-ellipsis" aria-hidden="true">…</span>
        <button
          v-else
          type="button"
          class="pg-num"
          :class="{ active: p === pagination.page.value }"
          :aria-current="p === pagination.page.value ? 'page' : undefined"
          :aria-label="`Page ${p}`"
          @click="setPage(p as number)"
        >{{ p }}</button>
      </template>

      <button
        type="button"
        class="pg-arrow"
        :disabled="pagination.page.value === pagination.totalPages.value"
        aria-label="Next page"
        @click="setPage(pagination.page.value + 1)"
      >Next ›</button>
    </div>

    <div v-if="pagination.total.value > hidePageSizeBelow" class="pg-size">
      <label class="pg-size-label" for="pg-size-select">Per page</label>
      <select
        id="pg-size-select"
        class="pg-size-select"
        :value="pagination.pageSize.value"
        @change="setSize"
      >
        <option v-for="o in pageSizeOptions" :key="o" :value="o">{{ o }}</option>
      </select>
    </div>
  </nav>
</template>
