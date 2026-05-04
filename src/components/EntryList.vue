<script setup lang="ts">
import { NDataTable, NButton, NSpace, NPopconfirm, NInput } from 'naive-ui'
import { computed, h, ref } from 'vue'
import type { DataTableColumns } from 'naive-ui'

interface Column { key: string; title: string }

const props = defineProps<{
  columns: Column[]
  rows: Array<Record<string, unknown> & { id?: number }>
}>()

const emit = defineEmits<{
  (e: 'edit', row: Record<string, unknown> & { id: number }): void
  (e: 'delete', row: Record<string, unknown> & { id: number }): void
}>()

const search = ref('')

const filtered = computed(() => {
  const s = search.value.trim().toLowerCase()
  if (!s) return props.rows
  return props.rows.filter(r =>
    props.columns.some(c => String(r[c.key] ?? '').toLowerCase().includes(s))
  )
})

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
</script>

<template>
  <div>
    <n-input v-model:value="search" placeholder="Search..." clearable style="margin-bottom: 12px" />
    <n-data-table :columns="tableColumns" :data="filtered" :pagination="{ pageSize: 25 }" :bordered="false" />
  </div>
</template>
