<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NButton, NSpace, NPopconfirm, useMessage } from 'naive-ui'
import EntryList from '../../components/EntryList.vue'
import EntryEditor from '../../components/EntryEditor.vue'
import { useAdjectives } from '../../composables/useAdjectives'
import { resetTableToSeed } from '../../db'
import { ADJECTIVE_GROUPS, type Adjective, type AdjectiveGroup } from '../../db/types'

const { items, refresh, create, update, remove } = useAdjectives()
const message = useMessage()

const editorOpen = ref(false)
const editorTitle = ref('Add adjective')
const editing = ref<Adjective | null>(null)
const editorInitial = ref<Record<string, string>>({ german: '', english: '', group: 'Other' })

const groupOptions = ADJECTIVE_GROUPS.map(g => ({ label: g, value: g }))

const fields = [
  { key: 'german', label: 'German (base form)', type: 'text' as const },
  { key: 'english', label: 'English', type: 'text' as const },
  { key: 'group', label: 'Group', type: 'select' as const, options: groupOptions }
]

const columns = [
  { key: 'german', title: 'German' },
  { key: 'english', title: 'English' },
  { key: 'group', title: 'Group' }
]

onMounted(refresh)

function onAdd() {
  editing.value = null
  editorTitle.value = 'Add adjective'
  editorInitial.value = { german: '', english: '', group: 'Other' }
  editorOpen.value = true
}

function onEdit(row: Record<string, unknown> & { id: number }) {
  const found = items.value.find(n => n.id === row.id) ?? null
  editing.value = found
  if (found) {
    editorTitle.value = 'Edit adjective'
    editorInitial.value = {
      german: found.german,
      english: found.english,
      group: found.group ?? 'Other'
    }
    editorOpen.value = true
  }
}

async function onSubmit(values: Record<string, string>) {
  const data = {
    german: values.german.trim(),
    english: values.english.trim(),
    group: values.group as AdjectiveGroup
  }
  try {
    if (editing.value && editing.value.id != null) {
      await update(editing.value.id, data)
      message.success('Updated.')
    } else {
      await create(data)
      message.success('Added.')
    }
    editorOpen.value = false
  } catch (err) {
    message.error(err instanceof Error ? err.message : 'Save failed')
  }
}

async function onDelete(row: Record<string, unknown> & { id: number }) {
  await remove(row.id)
  message.success('Deleted.')
}

async function onReset() {
  await resetTableToSeed('adjectives')
  await refresh()
  message.success('Reset to defaults.')
}
</script>

<template>
  <n-space vertical size="large">
    <h2>Manage adjectives</h2>
    <n-space>
      <n-button type="primary" @click="onAdd">Add adjective</n-button>
      <n-popconfirm @positive-click="onReset">
        <template #trigger>
          <n-button type="warning">Reset to defaults</n-button>
        </template>
        This will delete all your custom entries and restore the seed list. Continue?
      </n-popconfirm>
    </n-space>
    <EntryList :columns="columns" :rows="items" @edit="onEdit" @delete="onDelete" />
    <EntryEditor
      v-model:show="editorOpen"
      :title="editorTitle"
      :fields="fields"
      :initial="editorInitial"
      @submit="onSubmit"
    />
  </n-space>
</template>
