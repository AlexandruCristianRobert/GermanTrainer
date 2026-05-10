# Mobile UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the German Trainer SPA usable on phones via one shared `useBreakpoint` composable, a hamburger drawer on mobile (horizontal menu on desktop), a compact list view of the Manage tables on mobile, responsive grid columns, and width fixes on the quiz and setup screens.

**Architecture:** A `useBreakpoint` composable backed by `window.matchMedia` exposes a reactive `isMobile` ref. `NavShell.vue` and `EntryList.vue` swap layouts based on `isMobile`. `Home.vue` and `NounsHome.vue` use Naive UI's responsive `cols` shorthand. Quiz, setup, and form components get small CSS / wrap fixes.

**Tech Stack:** Vue 3, TypeScript, Naive UI (`NDrawer`, `NMenu`, `NDropdown`, `NDialogProvider`/`useDialog`, responsive `NGrid`), Vitest, Vue Test Utils, jsdom. No new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-05-10-mobile-ui-overhaul-design.md`

**Working directory for all tasks:** `D:\Repos\GermanTrainer`

---

## File Structure

Files created or modified by this plan:

```
src/
├── composables/
│   └── useBreakpoint.ts                 (NEW)
├── components/
│   ├── NavShell.vue                     (modify — responsive nav)
│   ├── EntryList.vue                    (modify — mobile compact list)
│   └── ApiKeyForm.vue                   (modify — wrap on button row)
└── modules/
    ├── home/Home.vue                    (modify — responsive grid)
    ├── nouns/
    │   ├── NounsHome.vue                (modify — responsive grid)
    │   ├── ManageNouns.vue              (modify — pass primary/secondary keys + displayRows)
    │   ├── GenderQuiz.vue               (modify — quiz-shell wrap, font media query)
    │   ├── TranslationQuiz.vue          (modify — quiz-shell wrap, input class)
    │   └── QuizSetup.vue                (modify — wrap + width tweaks)
    └── adjectives/
        ├── ManageAdjectives.vue         (modify — pass primary/secondary keys)
        ├── SentenceQuiz.vue             (modify — quiz-shell wrap, input class)
        └── QuizSetup.vue                (modify — wrap + width tweaks)

tests/
└── composables/
    └── useBreakpoint.test.ts            (NEW)
```

No DB, types, or routing changes.

---

## Task 1: `useBreakpoint` composable

**Files:**
- Create: `src/composables/useBreakpoint.ts`
- Test: `tests/composables/useBreakpoint.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/composables/useBreakpoint.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useBreakpoint } from '../../src/composables/useBreakpoint'

interface FakeMediaQueryList {
  matches: boolean
  media: string
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  _trigger: (matches: boolean) => void
}

function makeFakeMatchMedia(initialMatches: boolean): FakeMediaQueryList {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  return {
    matches: initialMatches,
    media: '',
    addEventListener: vi.fn((_event: string, cb: (e: { matches: boolean }) => void) => {
      listeners.push(cb)
    }),
    removeEventListener: vi.fn(),
    _trigger(matches: boolean) {
      this.matches = matches
      for (const l of listeners) l({ matches })
    }
  }
}

describe('useBreakpoint', () => {
  let fake: FakeMediaQueryList

  beforeEach(() => {
    fake = makeFakeMatchMedia(false)
    vi.stubGlobal('matchMedia', vi.fn(() => fake))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('isMobile is false when the media query does not match', () => {
    const { isMobile } = useBreakpoint()
    expect(isMobile.value).toBe(false)
  })

  it('isMobile is true when the media query matches at startup', () => {
    fake = makeFakeMatchMedia(true)
    vi.stubGlobal('matchMedia', vi.fn(() => fake))
    const { isMobile } = useBreakpoint()
    expect(isMobile.value).toBe(true)
  })

  it('isMobile updates when the media query change event fires', () => {
    const { isMobile } = useBreakpoint()
    expect(isMobile.value).toBe(false)
    fake._trigger(true)
    expect(isMobile.value).toBe(true)
    fake._trigger(false)
    expect(isMobile.value).toBe(false)
  })

  it('uses the (max-width: 767.99px) query', () => {
    const matchMedia = window.matchMedia as unknown as ReturnType<typeof vi.fn>
    useBreakpoint()
    expect(matchMedia).toHaveBeenCalledWith('(max-width: 767.99px)')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/composables/useBreakpoint.test.ts`
Expected: FAIL — module `../../src/composables/useBreakpoint` cannot be found.

- [ ] **Step 3: Implement `useBreakpoint`**

Create `src/composables/useBreakpoint.ts`:

```typescript
import { onBeforeUnmount, ref, type Ref } from 'vue'

const MOBILE_QUERY = '(max-width: 767.99px)'

export function useBreakpoint(): { isMobile: Ref<boolean> } {
  const mql = window.matchMedia(MOBILE_QUERY)
  const isMobile = ref(mql.matches)

  function onChange(e: { matches: boolean }) {
    isMobile.value = e.matches
  }

  mql.addEventListener('change', onChange)
  onBeforeUnmount(() => {
    mql.removeEventListener('change', onChange)
  })

  return { isMobile }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/composables/useBreakpoint.test.ts`
Expected: 4 tests PASS.

Note: the `onBeforeUnmount` call only runs inside a component setup context. Outside one (as in these tests), Vue logs a warning but does not throw — the tests still pass. The cleanup is verified manually in Task 7.

- [ ] **Step 5: Run typecheck and the full suite**

Run: `npm run typecheck && npm test`
Expected: typecheck clean, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useBreakpoint.ts tests/composables/useBreakpoint.test.ts
git commit -m "feat: add useBreakpoint composable for responsive UI"
```

---

## Task 2: Responsive `NavShell.vue`

**Files:**
- Modify: `src/components/NavShell.vue`

No automated test (Vue + Naive UI component). Manual verification in Task 7.

- [ ] **Step 1: Replace the contents of `src/components/NavShell.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { NLayout, NLayoutHeader, NLayoutContent, NMenu, NSpace, NText, NButton, NDrawer } from 'naive-ui'
import { useRouter, useRoute } from 'vue-router'
import { useBreakpoint } from '../composables/useBreakpoint'

const router = useRouter()
const route = useRoute()
const { isMobile } = useBreakpoint()

const drawerOpen = ref(false)

const items = [
  { label: 'Home', key: 'home' },
  { label: 'Nouns', key: 'nouns' },
  { label: 'Adjectives', key: 'adjectives' },
  { label: 'Settings', key: 'settings' }
]

const activeKey = computed(() => (route.name as string) ?? 'home')

function onSelect(key: string) {
  router.push({ name: key })
  drawerOpen.value = false
}

const headerStyle = computed(() =>
  isMobile.value ? 'padding: 12px 16px' : 'padding: 12px 24px'
)
const titleStyle = computed(() =>
  isMobile.value ? 'font-size: 16px' : 'font-size: 18px'
)
const contentStyle = computed(() =>
  isMobile.value ? 'padding: 12px' : 'padding: 24px'
)
</script>

<template>
  <n-layout style="height: 100vh">
    <n-layout-header bordered :style="headerStyle">
      <n-space justify="space-between" align="center" :wrap="false">
        <n-space align="center" :size="8" :wrap="false">
          <n-button
            v-if="isMobile"
            quaternary
            size="small"
            aria-label="Open menu"
            @click="drawerOpen = true"
          >
            ☰
          </n-button>
          <n-text strong :style="titleStyle">German Trainer</n-text>
        </n-space>
        <n-menu
          v-if="!isMobile"
          mode="horizontal"
          :options="items"
          :value="activeKey"
          @update:value="onSelect"
        />
      </n-space>
    </n-layout-header>
    <n-layout-content :content-style="contentStyle">
      <router-view />
    </n-layout-content>
    <n-drawer v-model:show="drawerOpen" :width="260" placement="left">
      <n-menu
        mode="vertical"
        :options="items"
        :value="activeKey"
        @update:value="onSelect"
      />
    </n-drawer>
  </n-layout>
</template>
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: All tests pass (no test changes here, just confirming no regression).

- [ ] **Step 4: Commit**

```bash
git add src/components/NavShell.vue
git commit -m "feat(nav): hamburger drawer on mobile, horizontal menu on desktop"
```

---

## Task 3: Responsive home grids

**Files:**
- Modify: `src/modules/home/Home.vue`
- Modify: `src/modules/nouns/NounsHome.vue`

- [ ] **Step 1: Replace `src/modules/home/Home.vue`**

```vue
<script setup lang="ts">
import { NCard, NGrid, NGridItem, NButton, NSpace, NText } from 'naive-ui'
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <n-space vertical size="large">
    <n-text style="font-size: 22px">Practice German vocabulary</n-text>
    <n-grid cols="1 768:2 1024:3" :x-gap="16" :y-gap="16">
      <n-grid-item>
        <n-card title="Nouns" hoverable>
          <p>Quiz the gender (der/die/das) or English translation of German nouns.</p>
          <n-button type="primary" @click="router.push('/nouns')">Open</n-button>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="Adjectives" hoverable>
          <p>Fill-in-the-blank quiz with AI-generated German sentences.</p>
          <n-button type="primary" @click="router.push('/adjectives')">Open</n-button>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="Settings" hoverable>
          <p>Set your Gemini API key and pick a model.</p>
          <n-button @click="router.push('/settings')">Open</n-button>
        </n-card>
      </n-grid-item>
    </n-grid>
  </n-space>
</template>
```

- [ ] **Step 2: Replace `src/modules/nouns/NounsHome.vue`**

```vue
<script setup lang="ts">
import { NSpace, NCard, NGrid, NGridItem, NButton } from 'naive-ui'
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <n-space vertical size="large">
    <h2>Nouns</h2>
    <n-grid cols="1 768:2" :x-gap="16" :y-gap="16">
      <n-grid-item>
        <n-card title="Manage nouns" hoverable>
          <p>Add, edit, or delete nouns. Reset to defaults from the seed list.</p>
          <n-button @click="router.push('/nouns/manage')">Open</n-button>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="Quiz" hoverable>
          <p>Pick gender or translation mode and quiz yourself on N random nouns.</p>
          <n-button type="primary" @click="router.push('/nouns/quiz')">Start quiz</n-button>
        </n-card>
      </n-grid-item>
    </n-grid>
  </n-space>
</template>
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/modules/home/Home.vue src/modules/nouns/NounsHome.vue
git commit -m "feat(home): responsive grid columns"
```

---

## Task 4: Mobile compact list in `EntryList.vue`

**Files:**
- Modify: `src/components/EntryList.vue`
- Modify: `src/modules/nouns/ManageNouns.vue`
- Modify: `src/modules/adjectives/ManageAdjectives.vue`

This task changes `EntryList`'s API surface and updates both consumers in the same commit so the API is never broken in isolation.

- [ ] **Step 1: Replace `src/components/EntryList.vue`**

```vue
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
          :options="rowActions(row as Record<string, unknown> & { id: number })"
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
```

- [ ] **Step 2: Replace `src/modules/nouns/ManageNouns.vue`**

The change is: add a `displayRows` computed that prefixes the German word with its gender so the mobile primary line reads `"der Tisch"`. Pass `primary-key="gendered"` and `secondary-key="english"` to `EntryList`.

```vue
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
```

- [ ] **Step 3: Replace `src/modules/adjectives/ManageAdjectives.vue`**

```vue
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
    <n-space :wrap="true">
      <n-button type="primary" @click="onAdd">Add adjective</n-button>
      <n-popconfirm @positive-click="onReset">
        <template #trigger>
          <n-button type="warning">Reset to defaults</n-button>
        </template>
        This will delete all your custom entries and restore the seed list. Continue?
      </n-popconfirm>
    </n-space>
    <EntryList
      :columns="columns"
      :rows="items"
      primary-key="german"
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
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/EntryList.vue src/modules/nouns/ManageNouns.vue src/modules/adjectives/ManageAdjectives.vue
git commit -m "feat(manage): mobile compact list view"
```

---

## Task 5: Quiz screen width fixes

**Files:**
- Modify: `src/modules/nouns/GenderQuiz.vue`
- Modify: `src/modules/nouns/TranslationQuiz.vue`
- Modify: `src/modules/adjectives/SentenceQuiz.vue`

- [ ] **Step 1: Replace `src/modules/nouns/GenderQuiz.vue`**

```vue
<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { NSpace, NButton, NText, NCard, NTag } from 'naive-ui'
import type { Noun } from '../../db/types'

const props = defineProps<{
  noun: Noun
  questionNumber: number
  totalQuestions: number
}>()

const emit = defineEmits<{
  (e: 'answered', correct: boolean, userAnswer: string): void
  (e: 'next'): void
}>()

const submitted = ref(false)
const userAnswer = ref<string | null>(null)
const isCorrect = ref<boolean | null>(null)
const nextButtonRef = ref<{ $el: HTMLElement } | null>(null)

const buttons: Array<'der' | 'die' | 'das'> = ['der', 'die', 'das']

function pick(g: 'der' | 'die' | 'das') {
  if (submitted.value) return
  userAnswer.value = g
  isCorrect.value = g === props.noun.gender
  submitted.value = true
  emit('answered', isCorrect.value, g)
  nextTick(() => nextButtonRef.value?.$el?.focus?.())
}

function next() {
  submitted.value = false
  userAnswer.value = null
  isCorrect.value = null
  emit('next')
}

const feedbackColor = computed(() =>
  isCorrect.value === null ? '' : isCorrect.value ? '#18a058' : '#d03050'
)
</script>

<template>
  <div class="quiz-shell">
    <n-card>
      <n-space vertical size="large" align="center">
        <n-text depth="3">Question {{ questionNumber }} of {{ totalQuestions }}</n-text>
        <div class="word-display">
          <div class="german-word">{{ noun.german }}</div>
          <div class="english-translation">{{ noun.english }}</div>
          <n-tag v-if="noun.group" size="small" :bordered="false" type="info" class="group-tag">
            {{ noun.group }}
          </n-tag>
        </div>
        <n-space size="medium" :wrap="true" justify="center">
          <n-button
            v-for="g in buttons"
            :key="g"
            size="large"
            :disabled="submitted"
            :type="submitted && g === noun.gender ? 'success' : (submitted && g === userAnswer && !isCorrect ? 'error' : 'default')"
            @click="pick(g)"
          >
            {{ g }}
          </n-button>
        </n-space>
        <n-text v-if="submitted" :style="{ color: feedbackColor }">
          {{ isCorrect ? '✅ Correct' : `❌ Correct: ${noun.gender}` }}
        </n-text>
        <n-button v-if="submitted" ref="nextButtonRef" type="primary" @click="next">Next</n-button>
      </n-space>
    </n-card>
  </div>
</template>

<style scoped>
.quiz-shell {
  max-width: 480px;
  margin: 0 auto;
}
.word-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 24px;
}
.german-word {
  font-size: 40px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.5px;
}
.english-translation {
  font-size: 16px;
  font-style: italic;
  opacity: 0.65;
}
.group-tag {
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 11px;
}
@media (max-width: 480px) {
  .german-word {
    font-size: 32px;
  }
  .word-display {
    padding: 12px 8px;
  }
}
</style>
```

- [ ] **Step 2: Replace `src/modules/nouns/TranslationQuiz.vue`**

```vue
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { NSpace, NButton, NText, NCard, NInput } from 'naive-ui'
import type { Noun } from '../../db/types'

const props = defineProps<{
  noun: Noun
  questionNumber: number
  totalQuestions: number
}>()

const emit = defineEmits<{
  (e: 'answered', correct: boolean, userAnswer: string): void
  (e: 'next'): void
}>()

const submitted = ref(false)
const input = ref('')
const isCorrect = ref<boolean | null>(null)
const inputRef = ref<InstanceType<typeof NInput> | null>(null)
const nextButtonRef = ref<{ $el: HTMLElement } | null>(null)

function check(answer: string, expected: string): boolean {
  const a = answer.trim().toLowerCase()
  if (a.length === 0) return false
  return expected.split('/').some(seg => seg.trim().toLowerCase() === a)
}

function submit() {
  if (submitted.value) return
  if (!input.value.trim()) return
  isCorrect.value = check(input.value, props.noun.english)
  submitted.value = true
  emit('answered', isCorrect.value, input.value)
  nextTick(() => nextButtonRef.value?.$el?.focus?.())
}

function next() {
  submitted.value = false
  input.value = ''
  isCorrect.value = null
  emit('next')
  nextTick(() => inputRef.value?.focus())
}

onMounted(() => {
  nextTick(() => inputRef.value?.focus())
})

watch(() => props.questionNumber, () => {
  nextTick(() => inputRef.value?.focus())
})

const feedbackColor = computed(() =>
  isCorrect.value === null ? '' : isCorrect.value ? '#18a058' : '#d03050'
)
</script>

<template>
  <div class="quiz-shell">
    <n-card>
      <n-space vertical size="large" align="center">
        <n-text>Question {{ questionNumber }} of {{ totalQuestions }}</n-text>
        <n-text style="font-size: 32px">{{ noun.gender }} {{ noun.german }}</n-text>
        <n-input
          ref="inputRef"
          v-model:value="input"
          :disabled="submitted"
          placeholder="English meaning"
          class="quiz-input"
          @keyup.enter="submit"
        />
        <n-button v-if="!submitted" type="primary" :disabled="!input.trim()" @click="submit">Submit</n-button>
        <n-text v-if="submitted" :style="{ color: feedbackColor }">
          {{ isCorrect ? '✅ Correct' : `❌ Correct: ${noun.english}` }}
        </n-text>
        <n-button v-if="submitted" ref="nextButtonRef" type="primary" @click="next">Next</n-button>
      </n-space>
    </n-card>
  </div>
</template>

<style scoped>
.quiz-shell {
  max-width: 480px;
  margin: 0 auto;
}
.quiz-input {
  width: 100%;
  max-width: 320px;
}
</style>
```

- [ ] **Step 3: Replace `src/modules/adjectives/SentenceQuiz.vue`**

```vue
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { NCard, NSpace, NText, NInput, NButton } from 'naive-ui'
import type { AdjectiveQuestion } from '../../composables/useAdjectiveQuiz'

const props = defineProps<{
  question: AdjectiveQuestion
  questionNumber: number
  totalQuestions: number
}>()

const emit = defineEmits<{
  (e: 'answered', answer: string): void
  (e: 'next'): void
}>()

const submitted = ref(false)
const input = ref('')
const inputRef = ref<InstanceType<typeof NInput> | null>(null)
const nextButtonRef = ref<{ $el: HTMLElement } | null>(null)

function submit() {
  if (submitted.value) return
  if (!input.value.trim()) return
  submitted.value = true
  emit('answered', input.value)
  nextTick(() => nextButtonRef.value?.$el?.focus?.())
}

function next() {
  submitted.value = false
  input.value = ''
  emit('next')
  nextTick(() => inputRef.value?.focus())
}

onMounted(() => {
  nextTick(() => inputRef.value?.focus())
})

watch(() => props.questionNumber, () => {
  nextTick(() => inputRef.value?.focus())
})

const feedbackColor = computed(() =>
  !submitted.value ? '' : props.question.isCorrect ? '#18a058' : '#d03050'
)
</script>

<template>
  <div class="quiz-shell">
    <n-card>
      <n-space vertical size="large">
        <n-text>Question {{ questionNumber }} of {{ totalQuestions }}</n-text>
        <n-text style="font-size: 22px">{{ question.blanked }}</n-text>
        <n-text depth="3" italic>({{ question.item.hint }})</n-text>
        <n-input
          ref="inputRef"
          v-model:value="input"
          :disabled="submitted"
          placeholder="adjective"
          class="quiz-input"
          @keyup.enter="submit"
        />
        <n-button v-if="!submitted" type="primary" :disabled="!input.trim()" @click="submit">Submit</n-button>
        <n-text v-if="submitted" :style="{ color: feedbackColor }">
          {{ question.isCorrect
            ? '✅ Correct'
            : `❌ Correct: ${question.item.adjective_inflected} (base: ${question.item.adjective_base})` }}
        </n-text>
        <n-text v-if="submitted" depth="3">Full sentence: {{ question.item.sentence }}</n-text>
        <n-button v-if="submitted" ref="nextButtonRef" type="primary" @click="next">Next</n-button>
      </n-space>
    </n-card>
  </div>
</template>

<style scoped>
.quiz-shell {
  max-width: 480px;
  margin: 0 auto;
}
.quiz-input {
  width: 100%;
  max-width: 320px;
}
</style>
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/modules/nouns/GenderQuiz.vue src/modules/nouns/TranslationQuiz.vue src/modules/adjectives/SentenceQuiz.vue
git commit -m "feat(quiz): mobile-friendly card width and input sizing"
```

---

## Task 6: Setup screens and ApiKeyForm wrap fixes

**Files:**
- Modify: `src/modules/nouns/QuizSetup.vue`
- Modify: `src/modules/adjectives/QuizSetup.vue`
- Modify: `src/components/ApiKeyForm.vue`

These are surgical edits — only the noted lines change. The rest of each file is untouched.

- [ ] **Step 1: Edit `src/modules/nouns/QuizSetup.vue`**

Find the `<n-space style="margin-top: 8px">` block that contains the All / None buttons, and change it to add `:wrap="true"`. Find the `<n-input-number>` for `customCount` and add `style="width: 100%"`.

Before (current):

```vue
      <n-space style="margin-top: 8px">
        <n-button size="small" @click="selectAll">All</n-button>
        <n-button size="small" @click="selectNone">None</n-button>
      </n-space>
```

After:

```vue
      <n-space :wrap="true" style="margin-top: 8px">
        <n-button size="small" @click="selectAll">All</n-button>
        <n-button size="small" @click="selectNone">None</n-button>
      </n-space>
```

Before:

```vue
      <n-input-number
        v-if="preset === 'custom'"
        v-model:value="customCount"
        :min="1"
        :max="totalAvailable || 1"
        style="margin-top: 8px"
      />
```

After:

```vue
      <n-input-number
        v-if="preset === 'custom'"
        v-model:value="customCount"
        :min="1"
        :max="totalAvailable || 1"
        style="margin-top: 8px; width: 100%"
      />
```

- [ ] **Step 2: Edit `src/modules/adjectives/QuizSetup.vue`**

Apply the same two changes (the All/None `n-space` and the `n-input-number` for `customCount`). The before/after blocks are textually identical to the noun setup snippets above.

- [ ] **Step 3: Edit `src/components/ApiKeyForm.vue`**

Find the `<n-space>` containing the Save and Test connection buttons, and add `:wrap="true"`.

Before:

```vue
      <n-space>
        <n-button type="primary" @click="onSave">Save</n-button>
        <n-button :loading="testing" @click="onTest" :disabled="!settings.geminiApiKey">
          Test connection
        </n-button>
      </n-space>
```

After:

```vue
      <n-space :wrap="true">
        <n-button type="primary" @click="onSave">Save</n-button>
        <n-button :loading="testing" @click="onTest" :disabled="!settings.geminiApiKey">
          Test connection
        </n-button>
      </n-space>
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/modules/nouns/QuizSetup.vue src/modules/adjectives/QuizSetup.vue src/components/ApiKeyForm.vue
git commit -m "feat(forms): wrap buttons and full-width inputs on mobile"
```

---

## Task 7: Manual verification

No commit. Checklist to confirm the overhaul works end-to-end.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Vite reports a local URL (e.g. `http://localhost:5173`).

- [ ] **Step 2: Verify nav at three breakpoints**

Open the app, then in DevTools open the device emulator. Check three sizes:

- 360px (phone): hamburger ☰ visible in header, no horizontal menu. Tap ☰ → drawer slides in from the left, shows all four items vertically. Tap any item → routes correctly and drawer closes.
- 768px (tablet): horizontal menu visible, no hamburger.
- 1280px (desktop): horizontal menu visible, content padding is 24px.

- [ ] **Step 3: Verify home grids**

At 360px: `Home` shows three cards in a single column. `NounsHome` shows two cards in a single column.
At 800px: `Home` shows two columns. `NounsHome` shows two columns.
At 1280px: `Home` shows three columns. `NounsHome` still shows two.

- [ ] **Step 4: Verify Manage Nouns mobile list**

At 360px on `/nouns/manage`: data table is replaced by a stacked list. Each row reads e.g. `der Tisch` (bold) on the first line, `table` (muted) on the second, with the group chip (e.g. `FURNITURE`) below. A `⋮` button on the right opens a dropdown with Edit and Delete. Tapping Edit opens the editor. Tapping Delete shows a confirmation dialog with Delete / Cancel buttons; confirming removes the row.

At 1280px: full data table, same as before.

- [ ] **Step 5: Verify Manage Adjectives mobile list**

Same checks at 360px and 1280px on `/adjectives/manage`. Primary line is the German adjective, secondary is the English translation.

- [ ] **Step 6: Verify quiz screens**

At 360px:

- Start a noun quiz in gender mode. Card is centered, the German word is ~32px (smaller than the desktop 40px), der/die/das buttons fit on a single row or wrap cleanly. Submit and Next buttons are reachable.
- Switch to translation mode. Input fills the available width, capped before getting too wide.
- Start an adjective quiz (requires a Gemini key). The sentence and input are readable; input fills the width.

At 1280px:

- All three quiz screens look identical to before this change (centered card, max-width 480px, input capped at 320px, German word at 40px in gender quiz).

- [ ] **Step 7: Verify setup screens and settings**

At 360px on `/nouns/quiz`: the group checkboxes stack vertically (already did), All/None buttons wrap if needed, custom count input fills the column when the Custom radio is selected. Same for `/adjectives/quiz`.

On `/settings`: the form fits, Save and Test buttons wrap on the narrowest viewport.

- [ ] **Step 8: Stop the dev server**

`Ctrl+C` in the terminal running `npm run dev`.

---

## Self-Review

**Spec coverage:**

- "useBreakpoint composable with reactive isMobile" → Task 1.
- "Responsive nav: drawer on mobile, horizontal menu on desktop, header padding/title size shrink" → Task 2.
- "Layout content padding 12px / 24px" → Task 2.
- "Home/NounsHome responsive grids (1/2/3 cols)" → Task 3.
- "EntryList compact list on mobile with primary/secondary keys, kebab dropdown, useDialog confirm" → Task 4.
- "ManageNouns displayRows with gendered field, ManageAdjectives primary/secondary props" → Task 4.
- "Quiz-shell wrap, font media query for GenderQuiz, .quiz-input class for the two text quizzes" → Task 5.
- "Setup wrap on All/None and full-width custom count input" → Task 6.
- "ApiKeyForm wrap on button row" → Task 6.
- "Manual verification" → Task 7.
- "No automated component tests, no DB/types/routing changes" → respected (only useBreakpoint has a test).

**Placeholder scan:** No TBDs, every step has either complete code or a precise before/after diff. Comments inside `try/catch` for localStorage failures are intentional behavior, carried over from existing code.

**Type consistency:** `primaryKey?` / `secondaryKey?` props on `EntryList` are referenced consistently in Task 4 (definition, ManageNouns call site, ManageAdjectives call site). The `displayRows` shape `Noun & { gendered: string }` in `ManageNouns` matches what `EntryList` reads via `row[primary]`. `useBreakpoint` returns `{ isMobile: Ref<boolean> }` and is destructured the same way in `NavShell` and `EntryList`.
