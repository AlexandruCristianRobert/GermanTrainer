<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NButton, NSpace, NPopconfirm, useMessage } from 'naive-ui'
import EntryList from '../../components/EntryList.vue'
import EntryEditor from '../../components/EntryEditor.vue'
import { useNouns } from '../../composables/useNouns'
import { resetTableToSeed } from '../../db'
import { NOUN_GROUPS, type Gender, type Noun, type NounGroup } from '../../db/types'

const { items, refresh, create, update, remove } = useNouns()
const message = useMessage()

const editorOpen = ref(false)
const editorTitle = ref('Add noun')
const editing = ref<Noun | null>(null)
const editorInitial = ref<Record<string, string>>({ german: '', gender: 'der', english: '', group: 'Other' })

const groupOptions = NOUN_GROUPS.map(g => ({ label: g, value: g }))

const fields = [
  { key: 'german', label: 'German', type: 'text' as const },
  { key: 'gender', label: 'Gender', type: 'gender' as const },
  { key: 'english', label: 'English (use / for multiple acceptable answers)', type: 'text' as const },
  { key: 'group', label: 'Group', type: 'select' as const, options: groupOptions }
]

const columns = [
  { key: 'german', title: 'German' },
  { key: 'gender', title: 'Gender' },
  { key: 'english', title: 'English' },
  { key: 'group', title: 'Group' }
]

const displayRows = computed(() =>
  items.value.map(n => ({ ...n, gendered: `${n.gender} ${n.german}` }))
)

onMounted(refresh)

function onAdd() {
  editing.value = null
  editorTitle.value = 'Add noun'
  editorInitial.value = { german: '', gender: 'der', english: '', group: 'Other' }
  editorOpen.value = true
}

function onEdit(row: Record<string, unknown> & { id: number }) {
  const found = items.value.find(n => n.id === row.id) ?? null
  editing.value = found
  if (found) {
    editorTitle.value = 'Edit noun'
    editorInitial.value = {
      german: found.german,
      gender: found.gender,
      english: found.english,
      group: found.group ?? 'Other'
    }
    editorOpen.value = true
  }
}

async function onSubmit(values: Record<string, string>) {
  const data = {
    german: values.german.trim(),
    gender: values.gender as Gender,
    english: values.english.trim(),
    group: values.group as NounGroup
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
  await resetTableToSeed('nouns')
  await refresh()
  message.success('Reset to defaults.')
}
</script>

<template>
  <n-space vertical size="large">
    <h2>Manage nouns</h2>
    <n-space :wrap="true">
      <n-button type="primary" @click="onAdd">Add noun</n-button>
      <n-popconfirm @positive-click="onReset">
        <template #trigger>
          <n-button type="warning">Reset to defaults</n-button>
        </template>
        This will delete all your custom entries and restore the seed list. Continue?
      </n-popconfirm>
    </n-space>
    <EntryList
      :columns="columns"
      :rows="displayRows"
      primary-key="gendered"
      secondary-key="english"
      @edit="onEdit"
      @delete="onDelete"
    />
    <EntryEditor
      v-model:show="editorOpen"
      :title="editorTitle"
      :fields="fields"
      :initial="editorInitial"
      @submit="onSubmit"
    />
  </n-space>
</template>
