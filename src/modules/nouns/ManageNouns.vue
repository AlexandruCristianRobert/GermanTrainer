<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NModal, NForm, NFormItem, useMessage } from 'naive-ui'
import { useNouns } from '../../composables/useNouns'
import { usePagination } from '../../composables/usePagination'
import Pagination from '../../components/Pagination.vue'
import { resetTableToSeed } from '../../db'
import { NOUN_GROUPS, type Gender, type Noun, type NounGroup } from '../../db/types'

const { items, refresh, create, update, remove } = useNouns()
const message = useMessage()

const search = ref('')

const editorOpen = ref(false)
const editorTitle = ref('Add noun')
const editing = ref<Noun | null>(null)
const form = ref({ german: '', gender: 'der' as Gender, english: '', group: 'Other' as NounGroup })

const resetConfirmOpen = ref(false)

onMounted(refresh)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(n =>
    n.german.toLowerCase().includes(q) ||
    n.english.toLowerCase().includes(q) ||
    n.group.toLowerCase().includes(q) ||
    n.gender.toLowerCase().includes(q)
  )
})

const pagination = usePagination(() => filtered.value, 25)

function genderTagClass(g: Gender): string {
  if (g === 'der') return 'tag-cobalt'
  if (g === 'die') return 'tag-clay'
  return 'tag-ochre'
}

function openAdd() {
  editing.value = null
  editorTitle.value = 'Add noun'
  form.value = { german: '', gender: 'der', english: '', group: 'Other' }
  editorOpen.value = true
}

function openEdit(n: Noun) {
  editing.value = n
  editorTitle.value = 'Edit noun'
  form.value = {
    german: n.german,
    gender: n.gender,
    english: n.english,
    group: (n.group ?? 'Other') as NounGroup
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
    gender: form.value.gender,
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

async function onDelete(n: Noun) {
  if (n.id == null) return
  if (!window.confirm(`Delete "${n.gender} ${n.german}"?`)) return
  await remove(n.id)
  message.success('Deleted.')
}

async function onReset() {
  resetConfirmOpen.value = false
  await resetTableToSeed('nouns')
  await refresh()
  message.success('Reset to defaults.')
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel I · Verwaltung</div>
        <h1 class="section-title">Manage<em>.</em></h1>
        <p class="section-subtitle">
          Add custom entries to your deck. Search across German, English, and group.
          Your changes live in your browser only.
        </p>
      </div>
      <div class="manage-actions">
        <button type="button" class="btn btn-ghost btn-danger" @click="resetConfirmOpen = true">Reset to seed</button>
        <button type="button" class="btn btn-accent" @click="openAdd">＋ Add noun</button>
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

    <Pagination :pagination="pagination" label="nouns" />

    <table class="data-table desktop-only">
      <thead>
        <tr>
          <th style="width: 36%">German</th>
          <th style="width: 12%">Gender</th>
          <th style="width: 30%">English</th>
          <th style="width: 14%">Group</th>
          <th style="width: 8%; text-align: right;">·</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="n in pagination.slice.value" :key="n.id">
          <td>
            <span class="german-cell">
              <span class="german-gender">{{ n.gender }}</span> {{ n.german }}
            </span>
          </td>
          <td><span class="tag" :class="genderTagClass(n.gender)">{{ n.gender }}</span></td>
          <td class="english-cell">{{ n.english }}</td>
          <td><span class="tag">{{ n.group }}</span></td>
          <td class="actions-cell">
            <button class="btn btn-quiet small" type="button" @click="openEdit(n)">Edit</button>
            <button class="btn btn-quiet small danger-text" type="button" @click="onDelete(n)">Delete</button>
          </td>
        </tr>
        <tr v-if="filtered.length === 0">
          <td colspan="5" class="empty-row">No entries.</td>
        </tr>
      </tbody>
    </table>

    <!-- Mobile card list -->
    <div class="mobile-list mobile-only">
      <div v-for="n in pagination.slice.value" :key="n.id" class="manage-card">
        <div class="manage-card-main">
          <div class="german-cell">
            <span class="german-gender">{{ n.gender }}</span> {{ n.german }}
          </div>
          <div class="english-cell">{{ n.english }}</div>
          <div class="manage-card-tags">
            <span class="tag" :class="genderTagClass(n.gender)">{{ n.gender }}</span>
            <span class="tag">{{ n.group }}</span>
          </div>
        </div>
        <div class="manage-card-actions">
          <button class="btn btn-quiet small" type="button" @click="openEdit(n)">Edit</button>
          <button class="btn btn-quiet small danger-text" type="button" @click="onDelete(n)">Delete</button>
        </div>
      </div>
      <div v-if="filtered.length === 0" class="empty-row">No entries.</div>
    </div>

    <Pagination :pagination="pagination" label="nouns" />

    <!-- Edit/Add modal -->
    <n-modal v-model:show="editorOpen" preset="card" :title="editorTitle" style="max-width: 520px">
      <n-form label-placement="top">
        <n-form-item label="German">
          <input class="input" type="text" v-model="form.german" />
        </n-form-item>
        <n-form-item label="Gender">
          <div class="segmented">
            <button :class="{ active: form.gender === 'der' }" @click="form.gender = 'der'">der</button>
            <button :class="{ active: form.gender === 'die' }" @click="form.gender = 'die'">die</button>
            <button :class="{ active: form.gender === 'das' }" @click="form.gender = 'das'">das</button>
          </div>
        </n-form-item>
        <n-form-item label="English (use / for alternatives)">
          <input class="input" type="text" v-model="form.english" />
        </n-form-item>
        <n-form-item label="Group">
          <select class="select" v-model="form.group">
            <option v-for="g in NOUN_GROUPS" :key="g" :value="g">{{ g }}</option>
          </select>
        </n-form-item>
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" @click="editorOpen = false">Cancel</button>
          <button class="btn btn-accent" type="button" :disabled="!canSubmit" @click="onSubmit">Save</button>
        </div>
      </n-form>
    </n-modal>

    <!-- Reset confirm modal -->
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
.manage-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.german-cell {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 19px;
  color: var(--ink);
}
.german-gender {
  color: var(--mute);
  font-style: italic;
  font-weight: 400;
}
.english-cell { color: var(--ink-soft); }

.actions-cell {
  text-align: right;
  white-space: nowrap;
}
.btn.small {
  font-size: 13px;
  padding: 6px 10px;
}
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

/* Mobile card list */
.mobile-only { display: none; }
.desktop-only { display: table; width: 100%; }

@media (max-width: 720px) {
  .mobile-only { display: block; }
  .desktop-only { display: none; }
  .manage-actions { width: 100%; }
  .manage-actions .btn { flex: 1; justify-content: center; }
}

.mobile-list { display: flex; flex-direction: column; gap: 8px; }
.manage-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px dotted var(--hairline);
  align-items: flex-start;
}
.manage-card-main { flex: 1; min-width: 0; }
.manage-card-tags {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.manage-card-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}
</style>
