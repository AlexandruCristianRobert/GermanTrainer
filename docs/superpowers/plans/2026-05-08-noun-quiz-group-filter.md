# Quiz Group Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users restrict noun and adjective quizzes to selected groups via checkboxes on the setup screens, with last-selection persistence in `localStorage` and per-group counts.

**Architecture:** Add `sampleByGroups` and `countsByGroup` to `useNouns`/`useAdjectives`. Both `QuizSetup.vue` files render an `NCheckboxGroup` driven by `NOUN_GROUPS`/`ADJECTIVE_GROUPS` with counts shown next to each label, persist the selection in `localStorage`, and pass the chosen groups to the runners via the route query. Both `QuizRunner.vue` files prefer `sampleByGroups` when a `groups` query is present and fall back to `sample` otherwise.

**Tech Stack:** Vue 3, TypeScript, Naive UI (`NCheckboxGroup`, `NCheckbox`, `NButton`), Vue Router 4, Dexie, Vitest, Vue Test Utils, fake-indexeddb.

**Reference spec:** `docs/superpowers/specs/2026-05-08-noun-quiz-group-filter-design.md`

**Working directory for all tasks:** `D:\Repos\GermanTrainer`

---

## File Structure

Files modified by this plan:

```
src/
├── composables/
│   ├── useNouns.ts          (add sampleByGroups, countsByGroup)
│   └── useAdjectives.ts     (add sampleByGroups, countsByGroup)
└── modules/
    ├── nouns/
    │   ├── QuizSetup.vue    (add group checkbox UI + persistence + route query)
    │   └── QuizRunner.vue   (read groups query, prefer sampleByGroups)
    └── adjectives/
        ├── QuizSetup.vue    (same as noun setup)
        └── QuizRunner.vue   (same as noun runner)

tests/
└── composables/
    ├── useNouns.test.ts       (add tests for sampleByGroups, countsByGroup)
    └── useAdjectives.test.ts  (add tests for sampleByGroups, countsByGroup)
```

No new files. No changes to `src/db/types.ts` or the Dexie schema.

---

## Task 1: Add `sampleByGroups` and `countsByGroup` to `useNouns`

**Files:**
- Modify: `src/composables/useNouns.ts`
- Test: `tests/composables/useNouns.test.ts`

- [ ] **Step 1: Write the failing tests**

Append these test cases inside the existing `describe('useNouns', ...)` block in `tests/composables/useNouns.test.ts`, just before the closing `})`:

```typescript
  it('sampleByGroups returns only nouns from the requested groups', async () => {
    await addNoun({ german: 'Tisch', group: 'Furniture' })
    await addNoun({ german: 'Stuhl', group: 'Furniture' })
    await addNoun({ german: 'Apfel', group: 'Food' })
    await addNoun({ german: 'Bank', group: 'Bank & Money' })
    const { sampleByGroups } = useNouns()
    const picked = await sampleByGroups(['Furniture', 'Food'], 10)
    const groups = new Set(picked.map(n => n.group))
    expect(picked.length).toBe(3)
    expect(groups.has('Bank & Money')).toBe(false)
  })

  it('sampleByGroups caps to available count when N exceeds matches', async () => {
    await addNoun({ german: 'Apfel', group: 'Food' })
    await addNoun({ german: 'Brot', group: 'Food' })
    const { sampleByGroups } = useNouns()
    const picked = await sampleByGroups(['Food'], 10)
    expect(picked.length).toBe(2)
  })

  it('sampleByGroups returns empty array when groups is empty', async () => {
    await addNoun({ german: 'Apfel', group: 'Food' })
    const { sampleByGroups } = useNouns()
    const picked = await sampleByGroups([], 5)
    expect(picked).toEqual([])
  })

  it('countsByGroup returns a count for every NOUN_GROUPS entry, zero when none', async () => {
    await addNoun({ german: 'Apfel', group: 'Food' })
    await addNoun({ german: 'Brot', group: 'Food' })
    await addNoun({ german: 'Tisch', group: 'Furniture' })
    const { countsByGroup } = useNouns()
    const counts = await countsByGroup()
    expect(counts['Food']).toBe(2)
    expect(counts['Furniture']).toBe(1)
    expect(counts['Office']).toBe(0)
    expect(counts['Bank & Money']).toBe(0)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/composables/useNouns.test.ts`
Expected: FAIL — `sampleByGroups`/`countsByGroup` is not a function (or undefined).

- [ ] **Step 3: Implement `sampleByGroups` and `countsByGroup`**

Replace the contents of `src/composables/useNouns.ts` with:

```typescript
import { ref } from 'vue'
import { db } from '../db'
import type { Noun, NounGroup } from '../db/types'
import { NOUN_GROUPS } from '../db/types'

export function useNouns() {
  const items = ref<Noun[]>([])

  async function refresh(): Promise<void> {
    items.value = await db.nouns.orderBy('german').toArray()
  }

  async function create(input: Omit<Noun, 'id' | 'createdAt'>): Promise<number> {
    const id = await db.nouns.add({ ...input, createdAt: Date.now() })
    await refresh()
    return id as number
  }

  async function update(id: number, patch: Partial<Omit<Noun, 'id'>>): Promise<void> {
    await db.nouns.update(id, patch)
    await refresh()
  }

  async function remove(id: number): Promise<void> {
    await db.nouns.delete(id)
    await refresh()
  }

  async function count(): Promise<number> {
    return db.nouns.count()
  }

  async function sample(n: number): Promise<Noun[]> {
    const all = await db.nouns.toArray()
    const k = Math.min(n, all.length)
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(Math.random() * (all.length - i))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    return all.slice(0, k)
  }

  async function sampleByGroups(groups: NounGroup[], n: number): Promise<Noun[]> {
    if (groups.length === 0) return []
    const set = new Set(groups)
    const all = (await db.nouns.toArray()).filter(noun => set.has(noun.group))
    const k = Math.min(n, all.length)
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(Math.random() * (all.length - i))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    return all.slice(0, k)
  }

  async function countsByGroup(): Promise<Record<NounGroup, number>> {
    const counts = Object.fromEntries(NOUN_GROUPS.map(g => [g, 0])) as Record<NounGroup, number>
    const all = await db.nouns.toArray()
    for (const noun of all) {
      counts[noun.group] = (counts[noun.group] ?? 0) + 1
    }
    return counts
  }

  return { items, refresh, create, update, remove, count, sample, sampleByGroups, countsByGroup }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/composables/useNouns.test.ts`
Expected: PASS for all tests, including the four new ones.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useNouns.ts tests/composables/useNouns.test.ts
git commit -m "feat(nouns): add sampleByGroups and countsByGroup"
```

---

## Task 2: Add `sampleByGroups` and `countsByGroup` to `useAdjectives`

**Files:**
- Modify: `src/composables/useAdjectives.ts`
- Test: `tests/composables/useAdjectives.test.ts`

- [ ] **Step 1: Write the failing tests**

Append these test cases inside the existing `describe('useAdjectives', ...)` block in `tests/composables/useAdjectives.test.ts`, just before the closing `})`:

```typescript
  it('sampleByGroups returns only adjectives from the requested groups', async () => {
    await addAdj({ german: 'schön', group: 'Quality & Condition' })
    await addAdj({ german: 'groß', group: 'Size & Quantity' })
    await addAdj({ german: 'klein', group: 'Size & Quantity' })
    await addAdj({ german: 'glücklich', group: 'Feelings & Emotions' })
    const { sampleByGroups } = useAdjectives()
    const picked = await sampleByGroups(['Size & Quantity', 'Feelings & Emotions'], 10)
    const groups = new Set(picked.map(a => a.group))
    expect(picked.length).toBe(3)
    expect(groups.has('Quality & Condition')).toBe(false)
  })

  it('sampleByGroups caps to available count when N exceeds matches', async () => {
    await addAdj({ german: 'schön', group: 'Quality & Condition' })
    await addAdj({ german: 'gut', group: 'Quality & Condition' })
    const { sampleByGroups } = useAdjectives()
    const picked = await sampleByGroups(['Quality & Condition'], 10)
    expect(picked.length).toBe(2)
  })

  it('sampleByGroups returns empty array when groups is empty', async () => {
    await addAdj({ german: 'schön', group: 'Quality & Condition' })
    const { sampleByGroups } = useAdjectives()
    const picked = await sampleByGroups([], 5)
    expect(picked).toEqual([])
  })

  it('countsByGroup returns a count for every ADJECTIVE_GROUPS entry, zero when none', async () => {
    await addAdj({ german: 'schön', group: 'Quality & Condition' })
    await addAdj({ german: 'gut', group: 'Quality & Condition' })
    await addAdj({ german: 'glücklich', group: 'Feelings & Emotions' })
    const { countsByGroup } = useAdjectives()
    const counts = await countsByGroup()
    expect(counts['Quality & Condition']).toBe(2)
    expect(counts['Feelings & Emotions']).toBe(1)
    expect(counts['Time & Sequence']).toBe(0)
    expect(counts['Other']).toBe(0)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/composables/useAdjectives.test.ts`
Expected: FAIL — `sampleByGroups`/`countsByGroup` is not a function.

- [ ] **Step 3: Implement `sampleByGroups` and `countsByGroup`**

Replace the contents of `src/composables/useAdjectives.ts` with:

```typescript
import { ref } from 'vue'
import { db } from '../db'
import type { Adjective, AdjectiveGroup } from '../db/types'
import { ADJECTIVE_GROUPS } from '../db/types'

export function useAdjectives() {
  const items = ref<Adjective[]>([])

  async function refresh(): Promise<void> {
    items.value = await db.adjectives.orderBy('german').toArray()
  }

  async function create(input: Omit<Adjective, 'id' | 'createdAt'>): Promise<number> {
    const id = await db.adjectives.add({ ...input, createdAt: Date.now() })
    await refresh()
    return id as number
  }

  async function update(id: number, patch: Partial<Omit<Adjective, 'id'>>): Promise<void> {
    await db.adjectives.update(id, patch)
    await refresh()
  }

  async function remove(id: number): Promise<void> {
    await db.adjectives.delete(id)
    await refresh()
  }

  async function count(): Promise<number> {
    return db.adjectives.count()
  }

  async function sample(n: number): Promise<Adjective[]> {
    const all = await db.adjectives.toArray()
    const k = Math.min(n, all.length)
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(Math.random() * (all.length - i))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    return all.slice(0, k)
  }

  async function sampleByGroups(groups: AdjectiveGroup[], n: number): Promise<Adjective[]> {
    if (groups.length === 0) return []
    const set = new Set(groups)
    const all = (await db.adjectives.toArray()).filter(a => set.has(a.group))
    const k = Math.min(n, all.length)
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(Math.random() * (all.length - i))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    return all.slice(0, k)
  }

  async function countsByGroup(): Promise<Record<AdjectiveGroup, number>> {
    const counts = Object.fromEntries(ADJECTIVE_GROUPS.map(g => [g, 0])) as Record<AdjectiveGroup, number>
    const all = await db.adjectives.toArray()
    for (const adj of all) {
      counts[adj.group] = (counts[adj.group] ?? 0) + 1
    }
    return counts
  }

  return { items, refresh, create, update, remove, count, sample, sampleByGroups, countsByGroup }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/composables/useAdjectives.test.ts`
Expected: PASS for all tests, including the four new ones.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useAdjectives.ts tests/composables/useAdjectives.test.ts
git commit -m "feat(adjectives): add sampleByGroups and countsByGroup"
```

---

## Task 3: Add group checkbox UI + persistence to noun `QuizSetup.vue`

**Files:**
- Modify: `src/modules/nouns/QuizSetup.vue`

This task has no automated test (Vue component with Naive UI is exercised manually). Manual verification is in Task 7.

- [ ] **Step 1: Replace the contents of `src/modules/nouns/QuizSetup.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  NRadioGroup, NRadio, NSpace, NButton, NInputNumber, NAlert, NCheckboxGroup, NCheckbox,
  useMessage
} from 'naive-ui'
import { useRouter } from 'vue-router'
import { useNouns } from '../../composables/useNouns'
import { NOUN_GROUPS, type NounGroup } from '../../db/types'

const STORAGE_KEY = 'nounQuizGroups'

const { countsByGroup } = useNouns()
const router = useRouter()
const message = useMessage()

const counts = ref<Record<NounGroup, number>>(
  Object.fromEntries(NOUN_GROUPS.map(g => [g, 0])) as Record<NounGroup, number>
)
const selectedGroups = ref<NounGroup[]>([])
const mode = ref<'gender' | 'translation'>('gender')
const preset = ref<10 | 15 | 20 | 'custom'>(10)
const customCount = ref(10)

function loadSelectedGroups(): NounGroup[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const known = new Set<string>(NOUN_GROUPS)
    return parsed.filter((g): g is NounGroup => typeof g === 'string' && known.has(g))
  } catch {
    return null
  }
}

function saveSelectedGroups(groups: NounGroup[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
  } catch {
    // ignore quota / disabled storage
  }
}

onMounted(async () => {
  counts.value = await countsByGroup()
  const stored = loadSelectedGroups()
  if (stored && stored.length > 0) {
    selectedGroups.value = stored
  } else {
    selectedGroups.value = NOUN_GROUPS.filter(g => counts.value[g] > 0)
  }
})

watch(selectedGroups, value => {
  saveSelectedGroups([...value])
}, { deep: true })

const totalAvailable = computed(() =>
  selectedGroups.value.reduce((sum, g) => sum + (counts.value[g] ?? 0), 0)
)
const requested = computed(() => (preset.value === 'custom' ? customCount.value : preset.value))
const effective = computed(() => Math.min(requested.value, totalAvailable.value))

function selectAll() {
  selectedGroups.value = NOUN_GROUPS.filter(g => counts.value[g] > 0)
}

function selectNone() {
  selectedGroups.value = []
}

function start() {
  if (selectedGroups.value.length === 0) {
    message.error('Select at least one group.')
    return
  }
  if (totalAvailable.value === 0) {
    message.error('No nouns in the selected groups.')
    return
  }
  router.push({
    name: 'nouns-quiz-run',
    query: {
      mode: mode.value,
      count: String(effective.value),
      groups: selectedGroups.value.join(',')
    }
  })
}
</script>

<template>
  <n-space vertical size="large" style="max-width: 480px">
    <h2>Noun quiz setup</h2>
    <n-alert v-if="totalAvailable === 0 && selectedGroups.length > 0" type="warning">
      No nouns in the selected groups. Pick a different group or add nouns in Manage nouns.
    </n-alert>
    <div>
      <p>Groups</p>
      <n-checkbox-group v-model:value="selectedGroups">
        <n-space vertical size="small">
          <n-checkbox
            v-for="g in NOUN_GROUPS"
            :key="g"
            :value="g"
            :label="`${g} (${counts[g] ?? 0})`"
            :disabled="(counts[g] ?? 0) === 0"
          />
        </n-space>
      </n-checkbox-group>
      <n-space style="margin-top: 8px">
        <n-button size="small" @click="selectAll">All</n-button>
        <n-button size="small" @click="selectNone">None</n-button>
      </n-space>
      <n-alert
        v-if="selectedGroups.length === 0"
        type="warning"
        style="margin-top: 8px"
      >
        Select at least one group.
      </n-alert>
    </div>
    <div>
      <p>Mode</p>
      <n-radio-group v-model:value="mode">
        <n-radio value="gender">Gender (der/die/das)</n-radio>
        <n-radio value="translation">English translation</n-radio>
      </n-radio-group>
    </div>
    <div>
      <p>Number of questions</p>
      <n-radio-group v-model:value="preset">
        <n-radio :value="10">10</n-radio>
        <n-radio :value="15">15</n-radio>
        <n-radio :value="20">20</n-radio>
        <n-radio value="custom">Custom</n-radio>
      </n-radio-group>
      <n-input-number
        v-if="preset === 'custom'"
        v-model:value="customCount"
        :min="1"
        :max="totalAvailable || 1"
        style="margin-top: 8px"
      />
    </div>
    <n-alert v-if="requested > totalAvailable && totalAvailable > 0" type="info">
      Only {{ totalAvailable }} nouns available in selected groups — quizzing all of them.
    </n-alert>
    <n-button
      type="primary"
      :disabled="selectedGroups.length === 0 || totalAvailable === 0"
      @click="start"
    >
      Start quiz
    </n-button>
  </n-space>
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
git add src/modules/nouns/QuizSetup.vue
git commit -m "feat(nouns): add group filter checkboxes to quiz setup"
```

---

## Task 4: Wire `groups` query into noun `QuizRunner.vue`

**Files:**
- Modify: `src/modules/nouns/QuizRunner.vue`

- [ ] **Step 1: Replace the contents of `src/modules/nouns/QuizRunner.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin, NAlert } from 'naive-ui'
import { useNouns } from '../../composables/useNouns'
import { useNounQuiz, type NounQuizMode } from '../../composables/useNounQuiz'
import GenderQuiz from './GenderQuiz.vue'
import TranslationQuiz from './TranslationQuiz.vue'
import QuizResult from './QuizResult.vue'
import type { Noun, NounGroup } from '../../db/types'
import { NOUN_GROUPS } from '../../db/types'

const route = useRoute()
const router = useRouter()
const { sample, sampleByGroups } = useNouns()

const loading = ref(true)
const error = ref<string | null>(null)
const nouns = ref<Noun[]>([])
const mode = ref<NounQuizMode>('gender')

let quiz: ReturnType<typeof useNounQuiz> | null = null
const ready = ref(false)

function parseGroupsQuery(raw: unknown): NounGroup[] {
  if (typeof raw !== 'string' || raw.length === 0) return []
  const known = new Set<string>(NOUN_GROUPS)
  return raw
    .split(',')
    .map(s => decodeURIComponent(s.trim()))
    .filter((g): g is NounGroup => known.has(g))
}

onMounted(async () => {
  const m = (route.query.mode as string) === 'translation' ? 'translation' : 'gender'
  const c = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const groups = parseGroupsQuery(route.query.groups)
  mode.value = m
  try {
    nouns.value = groups.length > 0
      ? await sampleByGroups(groups, c)
      : await sample(c)
    if (nouns.value.length === 0) {
      error.value = 'No nouns available.'
    } else {
      quiz = useNounQuiz(nouns.value, m)
      ready.value = true
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

const current = computed(() => quiz?.current.value ?? null)
const finished = computed(() => quiz?.finished.value ?? false)

function onAnswered(_correct: boolean, answer: string) {
  if (!quiz) return
  quiz.submit(answer)
}

function onNext() {
  quiz?.advance()
}

function restart() {
  router.push('/nouns/quiz')
}
</script>

<template>
  <div>
    <n-spin v-if="loading" />
    <n-alert v-else-if="error" type="error">{{ error }}</n-alert>
    <template v-else-if="ready && quiz">
      <QuizResult
        v-if="finished"
        :questions="quiz.questions.value"
        :score="quiz.score.value"
        :total="quiz.total.value"
        :mode="mode"
        @restart="restart"
      />
      <template v-else-if="current">
        <GenderQuiz
          v-if="mode === 'gender'"
          :noun="current.noun"
          :question-number="quiz.currentIndex.value + 1"
          :total-questions="quiz.total.value"
          @answered="onAnswered"
          @next="onNext"
        />
        <TranslationQuiz
          v-else
          :noun="current.noun"
          :question-number="quiz.currentIndex.value + 1"
          :total-questions="quiz.total.value"
          @answered="onAnswered"
          @next="onNext"
        />
      </template>
    </template>
  </div>
</template>
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/modules/nouns/QuizRunner.vue
git commit -m "feat(nouns): respect groups query in quiz runner"
```

---

## Task 5: Add group checkbox UI + persistence to adjective `QuizSetup.vue`

**Files:**
- Modify: `src/modules/adjectives/QuizSetup.vue`

- [ ] **Step 1: Replace the contents of `src/modules/adjectives/QuizSetup.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  NRadioGroup, NRadio, NSpace, NButton, NInputNumber, NAlert, NCheckboxGroup, NCheckbox
} from 'naive-ui'
import { useRouter } from 'vue-router'
import { useAdjectives } from '../../composables/useAdjectives'
import { useSettings } from '../../composables/useSettings'
import { ADJECTIVE_GROUPS, type AdjectiveGroup } from '../../db/types'

const STORAGE_KEY = 'adjectiveQuizGroups'

const { countsByGroup } = useAdjectives()
const { hasApiKey, load: loadSettings } = useSettings()
const router = useRouter()

const counts = ref<Record<AdjectiveGroup, number>>(
  Object.fromEntries(ADJECTIVE_GROUPS.map(g => [g, 0])) as Record<AdjectiveGroup, number>
)
const selectedGroups = ref<AdjectiveGroup[]>([])
const preset = ref<10 | 15 | 20 | 'custom'>(10)
const customCount = ref(10)

function loadSelectedGroups(): AdjectiveGroup[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const known = new Set<string>(ADJECTIVE_GROUPS)
    return parsed.filter((g): g is AdjectiveGroup => typeof g === 'string' && known.has(g))
  } catch {
    return null
  }
}

function saveSelectedGroups(groups: AdjectiveGroup[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
  } catch {
    // ignore
  }
}

onMounted(async () => {
  counts.value = await countsByGroup()
  await loadSettings()
  const stored = loadSelectedGroups()
  if (stored && stored.length > 0) {
    selectedGroups.value = stored
  } else {
    selectedGroups.value = ADJECTIVE_GROUPS.filter(g => counts.value[g] > 0)
  }
})

watch(selectedGroups, value => {
  saveSelectedGroups([...value])
}, { deep: true })

const totalAvailable = computed(() =>
  selectedGroups.value.reduce((sum, g) => sum + (counts.value[g] ?? 0), 0)
)
const requested = computed(() => (preset.value === 'custom' ? customCount.value : preset.value))
const effective = computed(() => Math.min(requested.value, totalAvailable.value))

function selectAll() {
  selectedGroups.value = ADJECTIVE_GROUPS.filter(g => counts.value[g] > 0)
}

function selectNone() {
  selectedGroups.value = []
}

function start() {
  router.push({
    name: 'adjectives-quiz-run',
    query: {
      count: String(effective.value),
      groups: selectedGroups.value.join(',')
    }
  })
}
</script>

<template>
  <n-space vertical size="large" style="max-width: 480px">
    <h2>Adjective quiz setup</h2>
    <n-alert v-if="totalAvailable === 0 && selectedGroups.length > 0" type="warning">
      No adjectives in the selected groups. Pick a different group or add adjectives in Manage adjectives.
    </n-alert>
    <n-alert v-if="!hasApiKey" type="warning">
      Set your Anthropic API key in <router-link to="/settings">Settings</router-link> first.
    </n-alert>
    <div>
      <p>Groups</p>
      <n-checkbox-group v-model:value="selectedGroups">
        <n-space vertical size="small">
          <n-checkbox
            v-for="g in ADJECTIVE_GROUPS"
            :key="g"
            :value="g"
            :label="`${g} (${counts[g] ?? 0})`"
            :disabled="(counts[g] ?? 0) === 0"
          />
        </n-space>
      </n-checkbox-group>
      <n-space style="margin-top: 8px">
        <n-button size="small" @click="selectAll">All</n-button>
        <n-button size="small" @click="selectNone">None</n-button>
      </n-space>
      <n-alert
        v-if="selectedGroups.length === 0"
        type="warning"
        style="margin-top: 8px"
      >
        Select at least one group.
      </n-alert>
    </div>
    <div>
      <p>Number of sentences</p>
      <n-radio-group v-model:value="preset">
        <n-radio :value="10">10</n-radio>
        <n-radio :value="15">15</n-radio>
        <n-radio :value="20">20</n-radio>
        <n-radio value="custom">Custom</n-radio>
      </n-radio-group>
      <n-input-number
        v-if="preset === 'custom'"
        v-model:value="customCount"
        :min="1"
        :max="totalAvailable || 1"
        style="margin-top: 8px"
      />
    </div>
    <n-alert v-if="requested > totalAvailable && totalAvailable > 0" type="info">
      Only {{ totalAvailable }} adjectives available in selected groups — quizzing all of them.
    </n-alert>
    <n-button
      type="primary"
      :disabled="selectedGroups.length === 0 || totalAvailable === 0 || !hasApiKey"
      @click="start"
    >
      Generate sentences and start
    </n-button>
  </n-space>
</template>
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/modules/adjectives/QuizSetup.vue
git commit -m "feat(adjectives): add group filter checkboxes to quiz setup"
```

---

## Task 6: Wire `groups` query into adjective `QuizRunner.vue`

**Files:**
- Modify: `src/modules/adjectives/QuizRunner.vue`

Only the `generate()` function and imports need changing. The rest of the file is left intact.

- [ ] **Step 1: Update imports and `generate()` in `src/modules/adjectives/QuizRunner.vue`**

Change the imports block (lines 1-13) to:

```typescript
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin, NAlert, NButton, NSpace, NText } from 'naive-ui'
import { useAdjectives } from '../../composables/useAdjectives'
import { useSettings } from '../../composables/useSettings'
import {
  generateAdjectiveSentences,
  makeGeminiClient,
  type SentenceItem
} from '../../composables/useClaude'
import { useAdjectiveQuiz } from '../../composables/useAdjectiveQuiz'
import SentenceQuiz from './SentenceQuiz.vue'
import QuizResult from './QuizResult.vue'
import { ADJECTIVE_GROUPS, type AdjectiveGroup } from '../../db/types'
```

Change the destructure on line 18 from:

```typescript
const { sample } = useAdjectives()
```

To:

```typescript
const { sample, sampleByGroups } = useAdjectives()
```

Replace the `generate()` function (originally lines 26-51) with:

```typescript
function parseGroupsQuery(raw: unknown): AdjectiveGroup[] {
  if (typeof raw !== 'string' || raw.length === 0) return []
  const known = new Set<string>(ADJECTIVE_GROUPS)
  return raw
    .split(',')
    .map(s => decodeURIComponent(s.trim()))
    .filter((g): g is AdjectiveGroup => known.has(g))
}

async function generate(): Promise<SentenceItem[]> {
  const c = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const groups = parseGroupsQuery(route.query.groups)
  const adjectives = groups.length > 0
    ? await sampleByGroups(groups, c)
    : await sample(c)
  if (adjectives.length === 0) {
    throw new Error('No adjectives available.')
  }
  const client = makeGeminiClient(settings.value.geminiApiKey)
  let res = await generateAdjectiveSentences(client, {
    model: settings.value.model,
    adjectives: adjectives.map(a => ({ german: a.german, english: a.english, group: a.group }))
  })
  if (res.valid.length < adjectives.length) {
    const missing = adjectives.slice(res.valid.length)
    if (missing.length > 0) {
      const topUp = await generateAdjectiveSentences(client, {
        model: settings.value.model,
        adjectives: missing.map(a => ({ german: a.german, english: a.english, group: a.group }))
      })
      res = { valid: [...res.valid, ...topUp.valid], invalid: [...res.invalid, ...topUp.invalid] }
    }
  }
  if (res.valid.length === 0) {
    throw new Error('No usable sentences from Gemini. Try again.')
  }
  return res.valid
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/modules/adjectives/QuizRunner.vue
git commit -m "feat(adjectives): respect groups query in quiz runner"
```

---

## Task 7: Manual verification

This task has no commit. It's a checklist to confirm the feature works end-to-end. If any step fails, return to the relevant task and fix.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Vite reports a local URL (e.g. `http://localhost:5173`).

- [ ] **Step 2: Verify noun quiz fresh-storage default**

In a private/incognito browser window, open the app and navigate to the noun quiz setup. Open DevTools → Application → Local Storage and confirm there's no `nounQuizGroups` key yet.

Expected: Every group whose count is `> 0` is checked. Empty groups are visible but disabled with `(0)` next to the label.

- [ ] **Step 3: Verify single-group filter and persistence**

Click **None**, then check only the **Food** group (assuming you have food nouns). Click **Start quiz** with a 10-question count.

Expected: Every question shown is a Food noun. After finishing or returning to setup, refresh the page.

Then revisit the setup screen.

Expected: Only **Food** is still checked. `localStorage.nounQuizGroups` is `["Food"]`.

- [ ] **Step 4: Verify "fewer than requested" alert**

Pick a group that has fewer items than the requested count (e.g. select only a group with 3 items, request 10).

Expected: The "Only N nouns available in selected groups — quizzing all of them" alert is visible. Quiz contains exactly those N items.

- [ ] **Step 5: Verify Start gating**

Click **None** so no groups are selected.

Expected: Start button is disabled. The "Select at least one group." warning shows.

- [ ] **Step 6: Verify legacy URL still works**

Manually navigate to `/nouns/quiz/run?mode=gender&count=5` (no `groups` query).

Expected: Quiz runs as before, sampling from all nouns.

- [ ] **Step 7: Repeat the relevant checks for the adjective quiz**

Setup → checkbox UI works, persistence under `localStorage.adjectiveQuizGroups`, `groups` query is forwarded to the runner, missing-query fallback works.

Note: the adjective quiz hits the Gemini API, so this needs a valid API key in Settings.

- [ ] **Step 8: Stop the dev server**

`Ctrl+C` in the terminal running `npm run dev`.

---

## Self-review

- **Spec coverage:**
  - "Add `sampleByGroups` and `countsByGroup` to `useNouns`" → Task 1.
  - "Add `sampleByGroups` and `countsByGroup` to `useAdjectives`" → Task 2.
  - "Group filter UI on the noun quiz setup page" → Task 3.
  - "Group filter UI on the adjective quiz setup page" → Task 5.
  - "Persistence of the last-used selection in localStorage, separately per quiz" → Tasks 3 & 5.
  - "Effective-count display rework + Start gating" → Tasks 3 & 5.
  - "Routing handoff via `?groups=`" → Tasks 3, 4, 5, 6.
  - "Backwards-compatible runner fallback" → Tasks 4 & 6.
  - "Out of scope: schema changes, settings UI, per-group stats" → No tasks added (correct).

- **Placeholder scan:** No TBDs, no "similar to Task N" references — full code in every step. The only `// ignore` comments are inside `try/catch` blocks for `localStorage` failures, which is the deliberate behavior described in the spec.

- **Type consistency:** `sampleByGroups(groups, n)` and `countsByGroup()` have identical signatures across both composables (modulo the group type). Storage keys (`nounQuizGroups`, `adjectiveQuizGroups`) match the spec. The route query name `groups` is identical in both setups and both runners. `selectedGroups` ref is consistent across all setup files.
