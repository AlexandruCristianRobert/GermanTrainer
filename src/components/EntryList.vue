<script setup lang="ts">
import {
  NDataTable, NButton, NSpace, NPopconfirm, NInput, NDropdown, NTag, useDialog
} from 'naive-ui'
import { computed, h, ref } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import { useBreakpoint } from '../composables/useBreakpoint'

interface Column { key: string; title: string }

const props = defineProps<{
  columns: Column[]
  rows: Array<Record<string, unknown> & { id?: number }>
  primaryKey?: string
  secondaryKey?: string
}>()

const emit = defineEmits<{
  (e: 'edit', row: Record<string, unknown> & { id: number }): void
  (e: 'delete', row: Record<string, unknown> & { id: number }): void
}>()

const { isMobile } = useBreakpoint()
const dialog = useDialog()

const search = ref('')

const filtered = computed(() => {
  const s = search.value.trim().toLowerCase()
  if (!s) return props.rows
  return props.rows.filter(r =>
    props.columns.some(c => String(r[c.key] ?? '').toLowerCase().includes(s))
  )
})

const primary = computed(() => props.primaryKey ?? props.columns[0]?.key ?? '')
const secondary = computed(() => props.secondaryKey ?? props.columns[1]?.key ?? '')

const tableColumns = computed<DataTableColumns<Record<string, unknown> & { id: number }>>(() => [
  ...props.columns.map(c => ({ key: c.key, title: c.title })),
  {
    title: 'Actions',
    key: '__actions',
    width: 180,
    render(row) {
      return h(NSpace, null, {
        default: () => [
          h(NButton, { size: 'small', onClick: () => emit('edit', row) }, { default: () => 'Edit' }),
          h(
            NPopconfirm,
            {
              onPositiveClick: () => emit('delete', row)
            },
            {
              default: () => 'Delete this entry?',
              trigger: () => h(NButton, { size: 'small', type: 'error' }, { default: () => 'Delete' })
            }
          )
        ]
      })
    }
  }
])

type RowWithId = Record<string, unknown> & { id: number }

function asRowWithId(row: unknown): RowWithId {
  return row as RowWithId
}

function rowActions(row: Record<string, unknown> & { id: number }) {
  return [
    { key: 'edit', label: 'Edit' },
    { key: 'delete', label: 'Delete' }
  ].map(opt => ({
    ...opt,
    props: {
      onClick: () => {
        if (opt.key === 'edit') {
          emit('edit', row)
        } else {
          dialog.warning({
            title: 'Delete entry?',
            content: 'This will permanently remove the entry.',
            positiveText: 'Delete',
            negativeText: 'Cancel',
            onPositiveClick: () => emit('delete', row)
          })
        }
      }
    }
  }))
}
</script>

<template>
  <div>
    <n-input v-model:value="search" placeholder="Search..." clearable style="margin-bottom: 12px" />
    <n-data-table
      v-if="!isMobile"
      :columns="tableColumns"
      :data="filtered"
      :pagination="{ pageSize: 25 }"
      :bordered="false"
    />
    <div v-else class="mobile-list">
      <div
        v-for="row in filtered"
        :key="row.id"
        class="entry-row"
      >
        <div class="entry-text">
          <div class="entry-primary">{{ row[primary] }}</div>
          <div v-if="secondary" class="entry-secondary">{{ row[secondary] }}</div>
          <n-tag
            v-if="row.group"
            size="small"
            :bordered="false"
            type="info"
            class="entry-group"
          >
            {{ row.group }}
          </n-tag>
        </div>
        <n-dropdown
          trigger="click"
          :options="rowActions(asRowWithId(row))"
        >
          <n-button quaternary size="small" aria-label="Row actions">⋮</n-button>
        </n-dropdown>
      </div>
      <div v-if="filtered.length === 0" class="entry-empty">
        No entries.
      </div>
    </div>
  </div>
</template>

<style scoped>
.mobile-list {
  display: flex;
  flex-direction: column;
}
.entry-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--n-divider-color, #efeff5);
}
.entry-text {
  flex: 1;
  min-width: 0;
}
.entry-primary {
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.entry-secondary {
  font-size: 13px;
  opacity: 0.7;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.entry-group {
  margin-top: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 10px;
}
.entry-empty {
  text-align: center;
  padding: 24px;
  opacity: 0.6;
}
</style>
