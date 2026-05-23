<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NModal, NForm, NFormItem, useMessage } from 'naive-ui'
import { useAdjectives } from '../../composables/useAdjectives'
import { resetTableToSeed } from '../../db'
import { ADJECTIVE_GROUPS, type Adjective, type AdjectiveGroup } from '../../db/types'

const { items, refresh, create, update, remove } = useAdjectives()
const message = useMessage()

const search = ref('')

const editorOpen = ref(false)
const editorTitle = ref('Add adjective')
const editing = ref<Adjective | null>(null)
const form = ref({ german: '', english: '', group: 'Other' as AdjectiveGroup })

const resetConfirmOpen = ref(false)

onMounted(refresh)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(a =>
    a.german.toLowerCase().includes(q) ||
    a.english.toLowerCase().includes(q) ||
    a.group.toLowerCase().includes(q)
  )
})

function openAdd() {
  editing.value = null
  editorTitle.value = 'Add adjective'
  form.value = { german: '', english: '', group: 'Other' }
  editorOpen.value = true
}

function openEdit(a: Adjective) {
  editing.value = a
  editorTitle.value = 'Edit adjective'
  form.value = {
    german: a.german,
    english: a.english,
    group: (a.group ?? 'Other') as AdjectiveGroup
  }
  editorOpen.value = true
}

const canSubmit = computed(() =>
  form.value.german.trim().length > 0 &&
  form.value.english.trim().length > 0
)

async function onSubmit() {
  if (!canSubmit.value) return
  const data = {
    german: form.value.german.trim(),
    english: form.value.english.trim(),
    group: form.value.group
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

async function onDelete(a: Adjective) {
  if (a.id == null) return
  if (!window.confirm(`Delete "${a.german}"?`)) return
  await remove(a.id)
  message.success('Deleted.')
}

async function onReset() {
  resetConfirmOpen.value = false
  await resetTableToSeed('adjectives')
  await refresh()
  message.success('Reset to defaults.')
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel II · Verwaltung</div>
        <h1 class="section-title">Manage<em>.</em></h1>
        <p class="section-subtitle">
          Add custom adjectives to your deck. Search across German, English, and group.
        </p>
      </div>
      <div class="manage-actions">
        <button type="button" class="btn btn-ghost btn-danger" @click="resetConfirmOpen = true">Reset to seed</button>
        <button type="button" class="btn btn-accent" @click="openAdd">＋ Add adjective</button>
      </div>
    </header>

    <div class="toolbar">
      <input
        class="input search-input"
        type="search"
        placeholder="Search the deck…"
        v-model="search"
      />
      <span class="micro-mark">{{ filtered.length }} of {{ items.length }} entries</span>
    </div>

    <table class="data-table desktop-only">
      <thead>
        <tr>
          <th style="width: 30%">German</th>
          <th style="width: 40%">English</th>
          <th style="width: 18%">Group</th>
          <th style="width: 12%; text-align: right;">·</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in filtered" :key="a.id">
          <td class="german-cell">{{ a.german }}</td>
          <td class="english-cell">{{ a.english }}</td>
          <td><span class="tag">{{ a.group }}</span></td>
          <td class="actions-cell">
            <button class="btn btn-quiet small" type="button" @click="openEdit(a)">Edit</button>
            <button class="btn btn-quiet small danger-text" type="button" @click="onDelete(a)">Delete</button>
          </td>
        </tr>
        <tr v-if="filtered.length === 0">
          <td colspan="4" class="empty-row">No entries.</td>
        </tr>
      </tbody>
    </table>

    <div class="mobile-list mobile-only">
      <div v-for="a in filtered" :key="a.id" class="manage-card">
        <div class="manage-card-main">
          <div class="german-cell">{{ a.german }}</div>
          <div class="english-cell">{{ a.english }}</div>
          <div class="manage-card-tags">
            <span class="tag">{{ a.group }}</span>
          </div>
        </div>
        <div class="manage-card-actions">
          <button class="btn btn-quiet small" type="button" @click="openEdit(a)">Edit</button>
          <button class="btn btn-quiet small danger-text" type="button" @click="onDelete(a)">Delete</button>
        </div>
      </div>
      <div v-if="filtered.length === 0" class="empty-row">No entries.</div>
    </div>

    <n-modal v-model:show="editorOpen" preset="card" :title="editorTitle" style="max-width: 520px">
      <n-form label-placement="top">
        <n-form-item label="German (base form)">
          <input class="input" type="text" v-model="form.german" />
        </n-form-item>
        <n-form-item label="English (use / for alternatives)">
          <input class="input" type="text" v-model="form.english" />
        </n-form-item>
        <n-form-item label="Group">
          <select class="select" v-model="form.group">
            <option v-for="g in ADJECTIVE_GROUPS" :key="g" :value="g">{{ g }}</option>
          </select>
        </n-form-item>
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" @click="editorOpen = false">Cancel</button>
          <button class="btn btn-accent" type="button" :disabled="!canSubmit" @click="onSubmit">Save</button>
        </div>
      </n-form>
    </n-modal>

    <n-modal v-model:show="resetConfirmOpen" preset="card" title="Reset to defaults?" style="max-width: 480px">
      <div class="alert alert-danger">
        <span class="alert-label">Warning</span>
        This will delete all your custom entries and restore the seed list.
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" @click="resetConfirmOpen = false">Cancel</button>
        <button class="btn btn-danger" type="button" @click="onReset">Reset</button>
      </div>
    </n-modal>
  </div>
</template>

<style scoped>
.manage-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.german-cell {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 19px;
  color: var(--ink);
}
.english-cell { color: var(--ink-soft); }
.actions-cell { text-align: right; white-space: nowrap; }
.btn.small { font-size: 13px; padding: 6px 10px; }
.danger-text { color: var(--danger); }
.danger-text:hover { color: var(--danger); background: var(--danger-tint); }

.empty-row {
  text-align: center;
  padding: 40px;
  color: var(--mute);
  font-style: italic;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.mobile-only { display: none; }
.desktop-only { display: table; width: 100%; }

@media (max-width: 720px) {
  .mobile-only { display: block; }
  .desktop-only { display: none; }
  .manage-actions { width: 100%; }
  .manage-actions .btn { flex: 1; justify-content: center; }
}

.mobile-list { display: flex; flex-direction: column; gap: 0; }
.manage-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px dotted var(--hairline);
  align-items: flex-start;
}
.manage-card-main { flex: 1; min-width: 0; }
.manage-card-tags { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.manage-card-actions { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
</style>
