# German Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal-use Vue 3 SPA for practicing German nouns (gender + translation quizzes) and adjectives (AI-generated fill-in-the-blank sentences).

**Architecture:** Pure browser SPA with Vue 3 + TypeScript. All persistence in IndexedDB (Dexie). Anthropic API called direct from the browser using `dangerouslyAllowBrowser: true`. No backend.

**Tech Stack:** Vue 3, Vite, TypeScript, Naive UI, Vue Router 4, Dexie, VueUse, `@anthropic-ai/sdk`, Vitest, Vue Test Utils, fake-indexeddb, jsdom.

**Reference spec:** `docs/superpowers/specs/2026-05-04-german-trainer-design.md`

**Working directory for all tasks:** `D:\Repos\GermanTrainer`

---

## File Structure

Files created across all tasks (final state):

```
GermanTrainer/
├── .gitignore
├── README.md
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── docs/superpowers/
│   ├── specs/2026-05-04-german-trainer-design.md   (already exists)
│   └── plans/2026-05-04-german-trainer.md          (this file)
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router.ts
│   ├── vite-env.d.ts
│   ├── data/
│   │   ├── nouns.seed.json
│   │   └── adjectives.seed.json
│   ├── db/
│   │   ├── index.ts
│   │   └── types.ts
│   ├── composables/
│   │   ├── useSettings.ts
│   │   ├── useNouns.ts
│   │   ├── useAdjectives.ts
│   │   ├── useClaude.ts
│   │   ├── useNounQuiz.ts
│   │   └── useAdjectiveQuiz.ts
│   ├── components/
│   │   ├── NavShell.vue
│   │   ├── EntryEditor.vue
│   │   ├── EntryList.vue
│   │   └── ApiKeyForm.vue
│   └── modules/
│       ├── home/Home.vue
│       ├── settings/Settings.vue
│       ├── nouns/
│       │   ├── NounsHome.vue
│       │   ├── ManageNouns.vue
│       │   ├── QuizSetup.vue
│       │   ├── GenderQuiz.vue
│       │   ├── TranslationQuiz.vue
│       │   ├── QuizRunner.vue
│       │   └── QuizResult.vue
│       └── adjectives/
│           ├── AdjectivesHome.vue
│           ├── ManageAdjectives.vue
│           ├── QuizSetup.vue
│           ├── SentenceQuiz.vue
│           └── QuizResult.vue
└── tests/
    ├── setup.ts
    ├── db/index.test.ts
    ├── composables/
    │   ├── useSettings.test.ts
    │   ├── useNouns.test.ts
    │   ├── useAdjectives.test.ts
    │   ├── useClaude.test.ts
    │   ├── useNounQuiz.test.ts
    │   └── useAdjectiveQuiz.test.ts
```

---

## Task 1: Initialize git repo and scaffold Vite + Vue 3 + TS project

**Files:**
- Create: `D:\Repos\GermanTrainer\.gitignore`
- Create: `D:\Repos\GermanTrainer\package.json`
- Create: `D:\Repos\GermanTrainer\index.html`
- Create: `D:\Repos\GermanTrainer\tsconfig.json`
- Create: `D:\Repos\GermanTrainer\tsconfig.node.json`
- Create: `D:\Repos\GermanTrainer\vite.config.ts`
- Create: `D:\Repos\GermanTrainer\src\main.ts`
- Create: `D:\Repos\GermanTrainer\src\App.vue`
- Create: `D:\Repos\GermanTrainer\src\vite-env.d.ts`

- [ ] **Step 1: Initialize git repo in the project root**

Run from `D:\Repos\GermanTrainer`:
```
git init
git branch -M main
```

Expected: prints `Initialized empty Git repository in D:/Repos/GermanTrainer/.git/`.

- [ ] **Step 2: Write `.gitignore`**

```
node_modules
dist
dist-ssr
*.local
.vite
coverage
.DS_Store
.idea
.vscode/*
!.vscode/extensions.json
*.log
```

- [ ] **Step 3: Write `package.json`**

```json
{
  "name": "german-trainer",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.1",
    "@vueuse/core": "^11.3.0",
    "dexie": "^4.0.10",
    "naive-ui": "^2.40.1",
    "vue": "^3.5.13",
    "vue-router": "^4.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.1",
    "@vue/test-utils": "^2.4.6",
    "fake-indexeddb": "^6.0.0",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^6.0.3",
    "vitest": "^2.1.8",
    "vue-tsc": "^2.1.10"
  }
}
```

- [ ] **Step 4: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>German Trainer</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue", "tests/**/*.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 6: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 7: Write `vite.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts']
  }
})
```

- [ ] **Step 8: Write `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 9: Write `src/main.ts`**

```ts
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

- [ ] **Step 10: Write `src/App.vue`**

```vue
<script setup lang="ts">
</script>

<template>
  <div>German Trainer scaffold</div>
</template>
```

- [ ] **Step 11: Commit**

Run:
```
git add .gitignore package.json index.html tsconfig.json tsconfig.node.json vite.config.ts src/main.ts src/App.vue src/vite-env.d.ts docs
git commit -m "chore: scaffold Vite + Vue 3 + TS project"
```

---

## Task 2: Install dependencies and verify dev server starts

**Files:** none modified (lockfile will be created).

- [ ] **Step 1: Install dependencies**

Run:
```
npm install
```

Expected: creates `package-lock.json` and `node_modules/`. No errors.

- [ ] **Step 2: Start dev server in background**

Run:
```
npm run dev
```

Expected: prints `Local:   http://localhost:5173/` (or similar). The page should show "German Trainer scaffold".

- [ ] **Step 3: Stop the dev server**

Press Ctrl+C to stop.

- [ ] **Step 4: Run typecheck**

Run:
```
npx vue-tsc -b --noEmit
```

Expected: no output, exit 0.

- [ ] **Step 5: Commit lockfile**

Run:
```
git add package-lock.json
git commit -m "chore: add package-lock.json"
```

---

## Task 3: Configure Vitest with fake-indexeddb

**Files:**
- Create: `D:\Repos\GermanTrainer\tests\setup.ts`
- Create: `D:\Repos\GermanTrainer\tests\smoke.test.ts`

- [ ] **Step 1: Write `tests/setup.ts`**

```ts
import 'fake-indexeddb/auto'
```

This installs an in-memory IndexedDB on `globalThis` for every test file.

- [ ] **Step 2: Write a smoke test at `tests/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2)
  })

  it('has indexedDB available', () => {
    expect(typeof indexedDB).toBe('object')
    expect(indexedDB).not.toBeNull()
  })
})
```

- [ ] **Step 3: Run the test**

Run:
```
npm test
```

Expected: 2 passed.

- [ ] **Step 4: Commit**

Run:
```
git add tests/setup.ts tests/smoke.test.ts
git commit -m "test: configure vitest with fake-indexeddb"
```

---

## Task 4: Define data types

**Files:**
- Create: `D:\Repos\GermanTrainer\src\db\types.ts`

- [ ] **Step 1: Write `src/db/types.ts`**

```ts
export type Gender = 'der' | 'die' | 'das'

export interface Noun {
  id?: number
  german: string
  gender: Gender
  english: string
  createdAt: number
}

export interface Adjective {
  id?: number
  german: string
  english: string
  createdAt: number
}

export interface Settings {
  id: 'singleton'
  anthropicApiKey: string
  model: string
}

export const DEFAULT_MODEL = 'claude-sonnet-4-6'
```

- [ ] **Step 2: Verify it compiles**

Run:
```
npx vue-tsc -b --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

Run:
```
git add src/db/types.ts
git commit -m "feat: define Noun, Adjective, Settings types"
```

---

## Task 5: Implement Dexie database with CRUD tests

**Files:**
- Create: `D:\Repos\GermanTrainer\src\db\index.ts`
- Test: `D:\Repos\GermanTrainer\tests\db\index.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/db/index.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db'

describe('db', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('opens with the expected tables', () => {
    expect(db.tables.map(t => t.name).sort()).toEqual(['adjectives', 'nouns', 'settings'])
  })

  it('inserts and reads a noun', async () => {
    const id = await db.nouns.add({
      german: 'Tisch',
      gender: 'der',
      english: 'table',
      createdAt: Date.now()
    })
    const noun = await db.nouns.get(id)
    expect(noun?.german).toBe('Tisch')
    expect(noun?.gender).toBe('der')
  })

  it('rejects duplicate german words on nouns', async () => {
    await db.nouns.add({ german: 'Tisch', gender: 'der', english: 'table', createdAt: 0 })
    await expect(
      db.nouns.add({ german: 'Tisch', gender: 'das', english: 'desk', createdAt: 0 })
    ).rejects.toThrow()
  })

  it('inserts and reads an adjective', async () => {
    const id = await db.adjectives.add({ german: 'schön', english: 'beautiful', createdAt: 0 })
    const adj = await db.adjectives.get(id)
    expect(adj?.german).toBe('schön')
  })

  it('stores singleton settings row', async () => {
    await db.settings.put({ id: 'singleton', anthropicApiKey: 'sk-ant-test', model: 'claude-sonnet-4-6' })
    const s = await db.settings.get('singleton')
    expect(s?.anthropicApiKey).toBe('sk-ant-test')
  })
})
```

- [ ] **Step 2: Run the test, expect failure**

Run:
```
npm test -- tests/db/index.test.ts
```

Expected: FAIL with `Cannot find module '../../src/db'`.

- [ ] **Step 3: Implement `src/db/index.ts`**

```ts
import Dexie, { type Table } from 'dexie'
import type { Adjective, Noun, Settings } from './types'

export class GermanTrainerDb extends Dexie {
  nouns!: Table<Noun, number>
  adjectives!: Table<Adjective, number>
  settings!: Table<Settings, 'singleton'>

  constructor() {
    super('GermanTrainerDb')
    this.version(1).stores({
      nouns: '++id, &german, gender',
      adjectives: '++id, &german',
      settings: 'id'
    })
  }
}

export const db = new GermanTrainerDb()
```

- [ ] **Step 4: Run the test, expect pass**

Run:
```
npm test -- tests/db/index.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

Run:
```
git add src/db/index.ts tests/db/index.test.ts
git commit -m "feat: add Dexie database with nouns, adjectives, settings tables"
```

---

## Task 6: Create seed JSON files

**Files:**
- Create: `D:\Repos\GermanTrainer\src\data\nouns.seed.json`
- Create: `D:\Repos\GermanTrainer\src\data\adjectives.seed.json`

- [ ] **Step 1: Write `src/data/nouns.seed.json`**

A minimum starter set of 30 common nouns. Each entry has `german`, `gender`, and `english`. The user can grow the list via the Manage screen later.

```json
[
  { "german": "Tisch", "gender": "der", "english": "table" },
  { "german": "Stuhl", "gender": "der", "english": "chair" },
  { "german": "Mann", "gender": "der", "english": "man" },
  { "german": "Hund", "gender": "der", "english": "dog" },
  { "german": "Apfel", "gender": "der", "english": "apple" },
  { "german": "Wagen", "gender": "der", "english": "car" },
  { "german": "Schlüssel", "gender": "der", "english": "key" },
  { "german": "Garten", "gender": "der", "english": "garden" },
  { "german": "Computer", "gender": "der", "english": "computer" },
  { "german": "Tag", "gender": "der", "english": "day" },
  { "german": "Frau", "gender": "die", "english": "woman" },
  { "german": "Katze", "gender": "die", "english": "cat" },
  { "german": "Tür", "gender": "die", "english": "door" },
  { "german": "Lampe", "gender": "die", "english": "lamp" },
  { "german": "Nacht", "gender": "die", "english": "night" },
  { "german": "Stadt", "gender": "die", "english": "city" },
  { "german": "Schule", "gender": "die", "english": "school" },
  { "german": "Straße", "gender": "die", "english": "street" },
  { "german": "Blume", "gender": "die", "english": "flower" },
  { "german": "Zeit", "gender": "die", "english": "time" },
  { "german": "Haus", "gender": "das", "english": "house" },
  { "german": "Kind", "gender": "das", "english": "child" },
  { "german": "Buch", "gender": "das", "english": "book" },
  { "german": "Auto", "gender": "das", "english": "car" },
  { "german": "Wasser", "gender": "das", "english": "water" },
  { "german": "Brot", "gender": "das", "english": "bread" },
  { "german": "Mädchen", "gender": "das", "english": "girl" },
  { "german": "Fenster", "gender": "das", "english": "window" },
  { "german": "Bett", "gender": "das", "english": "bed" },
  { "german": "Jahr", "gender": "das", "english": "year" }
]
```

- [ ] **Step 2: Write `src/data/adjectives.seed.json`**

```json
[
  { "german": "groß", "english": "big" },
  { "german": "klein", "english": "small" },
  { "german": "alt", "english": "old" },
  { "german": "neu", "english": "new" },
  { "german": "jung", "english": "young" },
  { "german": "schön", "english": "beautiful" },
  { "german": "hässlich", "english": "ugly" },
  { "german": "schnell", "english": "fast" },
  { "german": "langsam", "english": "slow" },
  { "german": "gut", "english": "good" },
  { "german": "schlecht", "english": "bad" },
  { "german": "warm", "english": "warm" },
  { "german": "kalt", "english": "cold" },
  { "german": "heiß", "english": "hot" },
  { "german": "billig", "english": "cheap" },
  { "german": "teuer", "english": "expensive" },
  { "german": "leicht", "english": "easy/light" },
  { "german": "schwer", "english": "difficult/heavy" },
  { "german": "stark", "english": "strong" },
  { "german": "schwach", "english": "weak" },
  { "german": "hell", "english": "bright" },
  { "german": "dunkel", "english": "dark" },
  { "german": "laut", "english": "loud" },
  { "german": "leise", "english": "quiet" },
  { "german": "interessant", "english": "interesting" },
  { "german": "langweilig", "english": "boring" },
  { "german": "wichtig", "english": "important" },
  { "german": "müde", "english": "tired" },
  { "german": "froh", "english": "happy" },
  { "german": "traurig", "english": "sad" }
]
```

- [ ] **Step 3: Verify TypeScript can import them**

The `resolveJsonModule: true` in tsconfig allows JSON imports. Quick check — run:
```
npx vue-tsc -b --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Commit**

Run:
```
git add src/data/nouns.seed.json src/data/adjectives.seed.json
git commit -m "feat: add seed nouns and adjectives JSON"
```

---

## Task 7: Implement seeding logic with idempotency tests

**Files:**
- Modify: `D:\Repos\GermanTrainer\src\db\index.ts`
- Modify: `D:\Repos\GermanTrainer\tests\db\index.test.ts`

- [ ] **Step 1: Write the failing test (append to existing test file)**

Add to `tests/db/index.test.ts`:
```ts
import { seedIfEmpty } from '../../src/db'

describe('seedIfEmpty', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('seeds nouns and adjectives when tables are empty', async () => {
    await seedIfEmpty()
    const nounCount = await db.nouns.count()
    const adjCount = await db.adjectives.count()
    expect(nounCount).toBeGreaterThan(0)
    expect(adjCount).toBeGreaterThan(0)
  })

  it('is idempotent — second call does not duplicate', async () => {
    await seedIfEmpty()
    const firstCount = await db.nouns.count()
    await seedIfEmpty()
    const secondCount = await db.nouns.count()
    expect(secondCount).toBe(firstCount)
  })

  it('does not seed if user has any entry already', async () => {
    await db.nouns.add({ german: 'CustomNoun', gender: 'der', english: 'custom', createdAt: 0 })
    await seedIfEmpty()
    expect(await db.nouns.count()).toBe(1)
  })
})
```

- [ ] **Step 2: Run the test, expect failure**

Run:
```
npm test -- tests/db/index.test.ts
```

Expected: FAIL with `seedIfEmpty is not exported`.

- [ ] **Step 3: Implement `seedIfEmpty` in `src/db/index.ts`**

Replace the file contents with:

```ts
import Dexie, { type Table } from 'dexie'
import type { Adjective, Noun, Settings } from './types'
import nounsSeed from '../data/nouns.seed.json'
import adjectivesSeed from '../data/adjectives.seed.json'

export class GermanTrainerDb extends Dexie {
  nouns!: Table<Noun, number>
  adjectives!: Table<Adjective, number>
  settings!: Table<Settings, 'singleton'>

  constructor() {
    super('GermanTrainerDb')
    this.version(1).stores({
      nouns: '++id, &german, gender',
      adjectives: '++id, &german',
      settings: 'id'
    })
  }
}

export const db = new GermanTrainerDb()

export async function seedIfEmpty(): Promise<void> {
  const now = Date.now()
  if ((await db.nouns.count()) === 0) {
    await db.nouns.bulkAdd(
      (nounsSeed as Array<Omit<Noun, 'id' | 'createdAt'>>).map(n => ({ ...n, createdAt: now }))
    )
  }
  if ((await db.adjectives.count()) === 0) {
    await db.adjectives.bulkAdd(
      (adjectivesSeed as Array<Omit<Adjective, 'id' | 'createdAt'>>).map(a => ({
        ...a,
        createdAt: now
      }))
    )
  }
}

export async function resetTableToSeed(table: 'nouns' | 'adjectives'): Promise<void> {
  const now = Date.now()
  if (table === 'nouns') {
    await db.nouns.clear()
    await db.nouns.bulkAdd(
      (nounsSeed as Array<Omit<Noun, 'id' | 'createdAt'>>).map(n => ({ ...n, createdAt: now }))
    )
  } else {
    await db.adjectives.clear()
    await db.adjectives.bulkAdd(
      (adjectivesSeed as Array<Omit<Adjective, 'id' | 'createdAt'>>).map(a => ({
        ...a,
        createdAt: now
      }))
    )
  }
}
```

- [ ] **Step 4: Add a test for `resetTableToSeed`**

Append to `tests/db/index.test.ts`:
```ts
describe('resetTableToSeed', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('wipes user data and re-seeds nouns', async () => {
    await db.nouns.add({ german: 'CustomNoun', gender: 'der', english: 'custom', createdAt: 0 })
    expect(await db.nouns.count()).toBe(1)
    await resetTableToSeed('nouns')
    const count = await db.nouns.count()
    expect(count).toBeGreaterThan(1)
    const custom = await db.nouns.where('german').equals('CustomNoun').first()
    expect(custom).toBeUndefined()
  })
})
```

Update the import line at the top:
```ts
import { db, seedIfEmpty, resetTableToSeed } from '../../src/db'
```

- [ ] **Step 5: Run the tests, expect pass**

Run:
```
npm test -- tests/db/index.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

Run:
```
git add src/db/index.ts tests/db/index.test.ts
git commit -m "feat: add idempotent seeding and reset for nouns/adjectives"
```

---

## Task 8: useSettings composable

**Files:**
- Create: `D:\Repos\GermanTrainer\src\composables\useSettings.ts`
- Test: `D:\Repos\GermanTrainer\tests\composables\useSettings.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/composables/useSettings.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db'
import { useSettings } from '../../src/composables/useSettings'

describe('useSettings', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('returns defaults when no settings row exists', async () => {
    const { load, settings } = useSettings()
    await load()
    expect(settings.value.anthropicApiKey).toBe('')
    expect(settings.value.model).toBe('claude-sonnet-4-6')
  })

  it('persists and reloads settings', async () => {
    const a = useSettings()
    await a.load()
    a.settings.value.anthropicApiKey = 'sk-ant-xxx'
    a.settings.value.model = 'claude-haiku-4-5-20251001'
    await a.save()

    const b = useSettings()
    await b.load()
    expect(b.settings.value.anthropicApiKey).toBe('sk-ant-xxx')
    expect(b.settings.value.model).toBe('claude-haiku-4-5-20251001')
  })

  it('hasApiKey is false when key is empty, true when set', async () => {
    const { load, save, settings, hasApiKey } = useSettings()
    await load()
    expect(hasApiKey.value).toBe(false)
    settings.value.anthropicApiKey = 'sk-ant-xxx'
    await save()
    expect(hasApiKey.value).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test, expect failure**

Run:
```
npm test -- tests/composables/useSettings.test.ts
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Implement `src/composables/useSettings.ts`**

```ts
import { computed, ref } from 'vue'
import { db } from '../db'
import { DEFAULT_MODEL, type Settings } from '../db/types'

export function useSettings() {
  const settings = ref<Settings>({
    id: 'singleton',
    anthropicApiKey: '',
    model: DEFAULT_MODEL
  })

  async function load(): Promise<void> {
    const stored = await db.settings.get('singleton')
    if (stored) {
      settings.value = stored
    }
  }

  async function save(): Promise<void> {
    await db.settings.put({ ...settings.value, id: 'singleton' })
  }

  const hasApiKey = computed(() => settings.value.anthropicApiKey.trim().length > 0)

  return { settings, hasApiKey, load, save }
}
```

- [ ] **Step 4: Run the test, expect pass**

Run:
```
npm test -- tests/composables/useSettings.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

Run:
```
git add src/composables/useSettings.ts tests/composables/useSettings.test.ts
git commit -m "feat: add useSettings composable"
```

---

## Task 9: useNouns composable (CRUD + sampling)

**Files:**
- Create: `D:\Repos\GermanTrainer\src\composables\useNouns.ts`
- Test: `D:\Repos\GermanTrainer\tests\composables\useNouns.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/composables/useNouns.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db'
import { useNouns } from '../../src/composables/useNouns'
import type { Noun } from '../../src/db/types'

async function addNoun(partial: Partial<Noun>) {
  return db.nouns.add({
    german: 'X',
    gender: 'der',
    english: 'x',
    createdAt: 0,
    ...partial
  } as Noun)
}

describe('useNouns', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('refresh loads all nouns into items, sorted by german', async () => {
    await addNoun({ german: 'Zebra', gender: 'das' })
    await addNoun({ german: 'Apfel', gender: 'der' })
    const { items, refresh } = useNouns()
    await refresh()
    expect(items.value.map(n => n.german)).toEqual(['Apfel', 'Zebra'])
  })

  it('create inserts a new noun and refreshes', async () => {
    const { items, create } = useNouns()
    await create({ german: 'Tisch', gender: 'der', english: 'table' })
    expect(items.value.length).toBe(1)
    expect(items.value[0].german).toBe('Tisch')
  })

  it('update modifies an existing noun', async () => {
    const id = await addNoun({ german: 'Tisch', gender: 'der', english: 'table' })
    const { items, refresh, update } = useNouns()
    await refresh()
    await update(id as number, { english: 'desk' })
    expect(items.value[0].english).toBe('desk')
  })

  it('remove deletes a noun', async () => {
    const id = await addNoun({ german: 'Tisch' })
    const { items, refresh, remove } = useNouns()
    await refresh()
    expect(items.value.length).toBe(1)
    await remove(id as number)
    expect(items.value.length).toBe(0)
  })

  it('sample returns N unique random nouns', async () => {
    for (let i = 0; i < 20; i++) {
      await addNoun({ german: `Word${i}` })
    }
    const { sample } = useNouns()
    const picked = await sample(5)
    expect(picked.length).toBe(5)
    const ids = new Set(picked.map(n => n.id))
    expect(ids.size).toBe(5)
  })

  it('sample caps to available count when N exceeds total', async () => {
    for (let i = 0; i < 3; i++) {
      await addNoun({ german: `Word${i}` })
    }
    const { sample } = useNouns()
    const picked = await sample(10)
    expect(picked.length).toBe(3)
  })

  it('count returns the total number of nouns', async () => {
    for (let i = 0; i < 7; i++) {
      await addNoun({ german: `Word${i}` })
    }
    const { count } = useNouns()
    expect(await count()).toBe(7)
  })
})
```

- [ ] **Step 2: Run the test, expect failure**

Run:
```
npm test -- tests/composables/useNouns.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement `src/composables/useNouns.ts`**

```ts
import { ref } from 'vue'
import { db } from '../db'
import type { Noun } from '../db/types'

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
    // Fisher-Yates partial shuffle
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(Math.random() * (all.length - i))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    return all.slice(0, k)
  }

  return { items, refresh, create, update, remove, count, sample }
}
```

- [ ] **Step 4: Run the test, expect pass**

Run:
```
npm test -- tests/composables/useNouns.test.ts
```

Expected: 7 passed.

- [ ] **Step 5: Commit**

Run:
```
git add src/composables/useNouns.ts tests/composables/useNouns.test.ts
git commit -m "feat: add useNouns composable with CRUD and sampling"
```

---

## Task 10: useAdjectives composable (CRUD + sampling)

**Files:**
- Create: `D:\Repos\GermanTrainer\src\composables\useAdjectives.ts`
- Test: `D:\Repos\GermanTrainer\tests\composables\useAdjectives.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/composables/useAdjectives.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db'
import { useAdjectives } from '../../src/composables/useAdjectives'
import type { Adjective } from '../../src/db/types'

async function addAdj(partial: Partial<Adjective>) {
  return db.adjectives.add({
    german: 'x',
    english: 'x',
    createdAt: 0,
    ...partial
  } as Adjective)
}

describe('useAdjectives', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('refresh loads all adjectives sorted by german', async () => {
    await addAdj({ german: 'zwei' })
    await addAdj({ german: 'alt' })
    const { items, refresh } = useAdjectives()
    await refresh()
    expect(items.value.map(a => a.german)).toEqual(['alt', 'zwei'])
  })

  it('create / update / remove round-trip', async () => {
    const { items, create, update, remove } = useAdjectives()
    const id = await create({ german: 'schön', english: 'beautiful' })
    expect(items.value.length).toBe(1)
    await update(id, { english: 'pretty' })
    expect(items.value[0].english).toBe('pretty')
    await remove(id)
    expect(items.value.length).toBe(0)
  })

  it('sample returns N unique adjectives, capped to available', async () => {
    for (let i = 0; i < 5; i++) await addAdj({ german: `adj${i}` })
    const { sample } = useAdjectives()
    expect((await sample(3)).length).toBe(3)
    expect((await sample(10)).length).toBe(5)
  })

  it('count returns total', async () => {
    for (let i = 0; i < 4; i++) await addAdj({ german: `adj${i}` })
    const { count } = useAdjectives()
    expect(await count()).toBe(4)
  })
})
```

- [ ] **Step 2: Run the test, expect failure**

Run:
```
npm test -- tests/composables/useAdjectives.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement `src/composables/useAdjectives.ts`**

```ts
import { ref } from 'vue'
import { db } from '../db'
import type { Adjective } from '../db/types'

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

  return { items, refresh, create, update, remove, count, sample }
}
```

- [ ] **Step 4: Run the test, expect pass**

Run:
```
npm test -- tests/composables/useAdjectives.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

Run:
```
git add src/composables/useAdjectives.ts tests/composables/useAdjectives.test.ts
git commit -m "feat: add useAdjectives composable"
```

---

## Task 11: useClaude composable (Anthropic SDK wrapper)

**Files:**
- Create: `D:\Repos\GermanTrainer\src\composables\useClaude.ts`
- Test: `D:\Repos\GermanTrainer\tests\composables\useClaude.test.ts`

This composable owns the request shape and response parsing for the adjective sentence generator. It accepts an `AnthropicLike` interface (matching the SDK's `messages.create`) so we can inject a fake in tests.

- [ ] **Step 1: Write the failing test**

`tests/composables/useClaude.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { generateAdjectiveSentences, type AnthropicLike } from '../../src/composables/useClaude'

function makeFakeClient(response: unknown): AnthropicLike {
  return {
    messages: {
      create: vi.fn().mockResolvedValue(response)
    }
  }
}

describe('generateAdjectiveSentences', () => {
  it('builds the request with model, system prompt, tool, and tool_choice', async () => {
    const create = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          name: 'submit_sentences',
          input: {
            sentences: [
              { adjective_base: 'schön', adjective_inflected: 'schöne', sentence: 'Das ist eine schöne Blume.' }
            ]
          }
        }
      ]
    })
    const fake: AnthropicLike = { messages: { create } }
    await generateAdjectiveSentences(fake, {
      model: 'claude-sonnet-4-6',
      adjectives: [{ german: 'schön', english: 'beautiful' }]
    })
    const call = create.mock.calls[0][0]
    expect(call.model).toBe('claude-sonnet-4-6')
    expect(call.system).toBeDefined()
    expect(Array.isArray(call.tools)).toBe(true)
    expect(call.tools[0].name).toBe('submit_sentences')
    expect(call.tool_choice).toEqual({ type: 'tool', name: 'submit_sentences' })
  })

  it('returns valid sentences (sentence contains inflected form)', async () => {
    const fake = makeFakeClient({
      content: [
        {
          type: 'tool_use',
          name: 'submit_sentences',
          input: {
            sentences: [
              { adjective_base: 'schön', adjective_inflected: 'schöne', sentence: 'Eine schöne Blume.' },
              { adjective_base: 'alt', adjective_inflected: 'alten', sentence: 'Der alten Mann.' }
            ]
          }
        }
      ]
    })
    const result = await generateAdjectiveSentences(fake, {
      model: 'claude-sonnet-4-6',
      adjectives: [
        { german: 'schön', english: 'beautiful' },
        { german: 'alt', english: 'old' }
      ]
    })
    expect(result.valid.length).toBe(2)
    expect(result.invalid.length).toBe(0)
  })

  it('rejects entries whose sentence does not contain the inflected form', async () => {
    const fake = makeFakeClient({
      content: [
        {
          type: 'tool_use',
          name: 'submit_sentences',
          input: {
            sentences: [
              { adjective_base: 'schön', adjective_inflected: 'schöne', sentence: 'Das ist gut.' }
            ]
          }
        }
      ]
    })
    const result = await generateAdjectiveSentences(fake, {
      model: 'claude-sonnet-4-6',
      adjectives: [{ german: 'schön', english: 'beautiful' }]
    })
    expect(result.valid.length).toBe(0)
    expect(result.invalid.length).toBe(1)
  })

  it('throws when no tool_use block is present', async () => {
    const fake = makeFakeClient({
      content: [{ type: 'text', text: 'Sorry, I cannot.' }]
    })
    await expect(
      generateAdjectiveSentences(fake, {
        model: 'claude-sonnet-4-6',
        adjectives: [{ german: 'schön', english: 'beautiful' }]
      })
    ).rejects.toThrow(/tool_use/)
  })

  it('matching is case-insensitive', async () => {
    const fake = makeFakeClient({
      content: [
        {
          type: 'tool_use',
          name: 'submit_sentences',
          input: {
            sentences: [
              { adjective_base: 'schön', adjective_inflected: 'Schöne', sentence: 'Eine schöne Blume.' }
            ]
          }
        }
      ]
    })
    const result = await generateAdjectiveSentences(fake, {
      model: 'claude-sonnet-4-6',
      adjectives: [{ german: 'schön', english: 'beautiful' }]
    })
    expect(result.valid.length).toBe(1)
  })
})
```

- [ ] **Step 2: Run the test, expect failure**

Run:
```
npm test -- tests/composables/useClaude.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement `src/composables/useClaude.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk'

export interface AnthropicLike {
  messages: {
    create: (params: Record<string, unknown>) => Promise<unknown>
  }
}

export interface SentenceItem {
  adjective_base: string
  adjective_inflected: string
  sentence: string
}

export interface GenerateOptions {
  model: string
  adjectives: Array<{ german: string; english: string }>
}

export interface GenerateResult {
  valid: SentenceItem[]
  invalid: SentenceItem[]
}

const SYSTEM_PROMPT =
  'You generate short, natural German sentences for adjective practice. ' +
  'For each adjective the user provides, return one grammatically correct German sentence ' +
  'that uses that adjective in an inflected form. Keep sentences under 12 words. ' +
  'Use everyday vocabulary appropriate for an A2-B1 learner.'

const TOOL = {
  name: 'submit_sentences',
  description: 'Submit the generated German sentences for adjective practice.',
  input_schema: {
    type: 'object',
    properties: {
      sentences: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            adjective_base: { type: 'string' },
            adjective_inflected: { type: 'string' },
            sentence: { type: 'string' }
          },
          required: ['adjective_base', 'adjective_inflected', 'sentence']
        }
      }
    },
    required: ['sentences']
  }
}

export async function generateAdjectiveSentences(
  client: AnthropicLike,
  opts: GenerateOptions
): Promise<GenerateResult> {
  const userMsg =
    'Generate one German sentence for each of these adjectives. Use the adjective in an ' +
    'inflected form appropriate to the sentence:\n' +
    opts.adjectives.map(a => `- ${a.german} (${a.english})`).join('\n')

  const response = (await client.messages.create({
    model: opts.model,
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' }
      }
    ],
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'submit_sentences' },
    messages: [{ role: 'user', content: userMsg }]
  })) as { content: Array<{ type: string; name?: string; input?: { sentences?: SentenceItem[] } }> }

  const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === 'submit_sentences')
  if (!toolUse || !toolUse.input || !Array.isArray(toolUse.input.sentences)) {
    throw new Error('Anthropic response missing tool_use block for submit_sentences')
  }

  const valid: SentenceItem[] = []
  const invalid: SentenceItem[] = []
  for (const entry of toolUse.input.sentences) {
    const ok =
      typeof entry.adjective_base === 'string' &&
      typeof entry.adjective_inflected === 'string' &&
      typeof entry.sentence === 'string' &&
      entry.adjective_base.length > 0 &&
      entry.adjective_inflected.length > 0 &&
      entry.sentence.toLowerCase().includes(entry.adjective_inflected.toLowerCase())
    if (ok) valid.push(entry)
    else invalid.push(entry)
  }
  return { valid, invalid }
}

export function makeAnthropicClient(apiKey: string): AnthropicLike {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) as unknown as AnthropicLike
}
```

The unit tests do not call `makeAnthropicClient` — they inject a fake `AnthropicLike` directly — so the SDK import is exercised only in the browser bundle, not in Vitest.

- [ ] **Step 4: Run the test, expect pass**

Run:
```
npm test -- tests/composables/useClaude.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

Run:
```
git add src/composables/useClaude.ts tests/composables/useClaude.test.ts
git commit -m "feat: add useClaude wrapper for adjective sentence generation"
```

---

## Task 12: useNounQuiz composable (session state + answer checking)

**Files:**
- Create: `D:\Repos\GermanTrainer\src\composables\useNounQuiz.ts`
- Test: `D:\Repos\GermanTrainer\tests\composables\useNounQuiz.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/composables/useNounQuiz.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { useNounQuiz } from '../../src/composables/useNounQuiz'
import type { Noun } from '../../src/db/types'

const sample: Noun[] = [
  { id: 1, german: 'Tisch', gender: 'der', english: 'table', createdAt: 0 },
  { id: 2, german: 'Frau', gender: 'die', english: 'woman', createdAt: 0 },
  { id: 3, german: 'Haus', gender: 'das', english: 'house/home', createdAt: 0 }
]

describe('useNounQuiz — gender mode', () => {
  it('starts at index 0 and not finished', () => {
    const q = useNounQuiz(sample, 'gender')
    expect(q.currentIndex.value).toBe(0)
    expect(q.finished.value).toBe(false)
  })

  it('records correct gender answer', () => {
    const q = useNounQuiz(sample, 'gender')
    q.submit('der')
    expect(q.questions.value[0].isCorrect).toBe(true)
    expect(q.questions.value[0].userAnswer).toBe('der')
  })

  it('records incorrect gender answer', () => {
    const q = useNounQuiz(sample, 'gender')
    q.submit('die')
    expect(q.questions.value[0].isCorrect).toBe(false)
  })

  it('advance moves to next question', () => {
    const q = useNounQuiz(sample, 'gender')
    q.submit('der')
    q.advance()
    expect(q.currentIndex.value).toBe(1)
  })

  it('finished becomes true after answering all questions', () => {
    const q = useNounQuiz(sample, 'gender')
    q.submit('der'); q.advance()
    q.submit('die'); q.advance()
    q.submit('das'); q.advance()
    expect(q.finished.value).toBe(true)
  })

  it('score reflects correct answers', () => {
    const q = useNounQuiz(sample, 'gender')
    q.submit('der'); q.advance()
    q.submit('der'); q.advance()  // wrong (Frau is die)
    q.submit('das'); q.advance()
    expect(q.score.value).toBe(2)
    expect(q.total.value).toBe(3)
  })
})

describe('useNounQuiz — translation mode', () => {
  it('matches case-insensitively and trimmed', () => {
    const q = useNounQuiz(sample, 'translation')
    q.submit('  Table  ')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('accepts any segment of slash-separated multi-answer', () => {
    const q = useNounQuiz(sample, 'translation')
    q.submit('woman'); q.advance()  // Tisch -> table - WRONG. Wait, currentIndex is 0 now.
    // Restart for clarity: indices follow sample order
    const q2 = useNounQuiz(sample, 'translation')
    q2.submit('table'); q2.advance()        // Tisch ✓
    q2.submit('woman'); q2.advance()        // Frau ✓
    q2.submit('home'); q2.advance()         // Haus ✓ (matches "house/home")
    expect(q2.score.value).toBe(3)
  })

  it('rejects an empty answer', () => {
    const q = useNounQuiz(sample, 'translation')
    q.submit('')
    expect(q.questions.value[0].isCorrect).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test, expect failure**

Run:
```
npm test -- tests/composables/useNounQuiz.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement `src/composables/useNounQuiz.ts`**

```ts
import { computed, ref } from 'vue'
import type { Noun } from '../db/types'

export type NounQuizMode = 'gender' | 'translation'

export interface NounQuestion {
  noun: Noun
  userAnswer: string | null
  isCorrect: boolean | null
}

function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase()
}

function checkTranslation(input: string, expected: string): boolean {
  const i = normalizeAnswer(input)
  if (i.length === 0) return false
  return expected.split('/').some(seg => normalizeAnswer(seg) === i)
}

export function useNounQuiz(nouns: Noun[], mode: NounQuizMode) {
  const questions = ref<NounQuestion[]>(nouns.map(n => ({ noun: n, userAnswer: null, isCorrect: null })))
  const currentIndex = ref(0)

  function submit(answer: string): void {
    const q = questions.value[currentIndex.value]
    if (!q) return
    q.userAnswer = answer
    if (mode === 'gender') {
      q.isCorrect = answer === q.noun.gender
    } else {
      q.isCorrect = checkTranslation(answer, q.noun.english)
    }
  }

  function advance(): void {
    currentIndex.value += 1
  }

  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  const current = computed(() => questions.value[currentIndex.value] ?? null)

  return { questions, currentIndex, current, finished, score, total, submit, advance }
}
```

- [ ] **Step 4: Run the test, expect pass**

Run:
```
npm test -- tests/composables/useNounQuiz.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

Run:
```
git add src/composables/useNounQuiz.ts tests/composables/useNounQuiz.test.ts
git commit -m "feat: add useNounQuiz composable"
```

---

## Task 13: useAdjectiveQuiz composable

**Files:**
- Create: `D:\Repos\GermanTrainer\src\composables\useAdjectiveQuiz.ts`
- Test: `D:\Repos\GermanTrainer\tests\composables\useAdjectiveQuiz.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/composables/useAdjectiveQuiz.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { useAdjectiveQuiz, blankSentence } from '../../src/composables/useAdjectiveQuiz'
import type { SentenceItem } from '../../src/composables/useClaude'

const sample: SentenceItem[] = [
  { adjective_base: 'schön', adjective_inflected: 'schöne', sentence: 'Das ist eine schöne Blume.' },
  { adjective_base: 'alt', adjective_inflected: 'alten', sentence: 'Der alten Mann sitzt.' }
]

describe('blankSentence', () => {
  it('replaces the inflected form with underscores, preserving length', () => {
    const out = blankSentence('Das ist eine schöne Blume.', 'schöne')
    expect(out).toContain('______')
    expect(out).not.toContain('schöne')
  })

  it('matches case-insensitively', () => {
    const out = blankSentence('Eine Schöne Blume.', 'schöne')
    expect(out).not.toMatch(/schöne/i)
  })
})

describe('useAdjectiveQuiz', () => {
  it('accepts the inflected form as correct', () => {
    const q = useAdjectiveQuiz(sample)
    q.submit('schöne')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('accepts the base form as correct', () => {
    const q = useAdjectiveQuiz(sample)
    q.submit('schön')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('matches case-insensitively and trimmed', () => {
    const q = useAdjectiveQuiz(sample)
    q.submit('  Schöne  ')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('rejects unrelated answer', () => {
    const q = useAdjectiveQuiz(sample)
    q.submit('alt')
    expect(q.questions.value[0].isCorrect).toBe(false)
  })

  it('finished after advancing past last question', () => {
    const q = useAdjectiveQuiz(sample)
    q.submit('schöne'); q.advance()
    q.submit('alten'); q.advance()
    expect(q.finished.value).toBe(true)
    expect(q.score.value).toBe(2)
  })
})
```

- [ ] **Step 2: Run the test, expect failure**

Run:
```
npm test -- tests/composables/useAdjectiveQuiz.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement `src/composables/useAdjectiveQuiz.ts`**

```ts
import { computed, ref } from 'vue'
import type { SentenceItem } from './useClaude'

export interface AdjectiveQuestion {
  item: SentenceItem
  blanked: string
  userAnswer: string | null
  isCorrect: boolean | null
}

export function blankSentence(sentence: string, inflected: string): string {
  const placeholder = '_'.repeat(Math.max(inflected.length, 4))
  // Replace first case-insensitive occurrence
  const idx = sentence.toLowerCase().indexOf(inflected.toLowerCase())
  if (idx < 0) return sentence
  return sentence.slice(0, idx) + placeholder + sentence.slice(idx + inflected.length)
}

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

export function useAdjectiveQuiz(items: SentenceItem[]) {
  const questions = ref<AdjectiveQuestion[]>(
    items.map(i => ({
      item: i,
      blanked: blankSentence(i.sentence, i.adjective_inflected),
      userAnswer: null,
      isCorrect: null
    }))
  )
  const currentIndex = ref(0)

  function submit(answer: string): void {
    const q = questions.value[currentIndex.value]
    if (!q) return
    q.userAnswer = answer
    const a = normalize(answer)
    if (a.length === 0) {
      q.isCorrect = false
      return
    }
    q.isCorrect =
      a === normalize(q.item.adjective_inflected) || a === normalize(q.item.adjective_base)
  }

  function advance(): void {
    currentIndex.value += 1
  }

  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  const current = computed(() => questions.value[currentIndex.value] ?? null)

  return { questions, currentIndex, current, finished, score, total, submit, advance }
}
```

- [ ] **Step 4: Run the test, expect pass**

Run:
```
npm test -- tests/composables/useAdjectiveQuiz.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

Run:
```
git add src/composables/useAdjectiveQuiz.ts tests/composables/useAdjectiveQuiz.test.ts
git commit -m "feat: add useAdjectiveQuiz composable with blanking and answer match"
```

---

## Task 14: Vue Router, App shell, NavShell, Home page

**Files:**
- Create: `D:\Repos\GermanTrainer\src\router.ts`
- Create: `D:\Repos\GermanTrainer\src\components\NavShell.vue`
- Create: `D:\Repos\GermanTrainer\src\modules\home\Home.vue`
- Create: `D:\Repos\GermanTrainer\src\modules\nouns\NounsHome.vue` (placeholder)
- Create: `D:\Repos\GermanTrainer\src\modules\adjectives\AdjectivesHome.vue` (placeholder)
- Create: `D:\Repos\GermanTrainer\src\modules\settings\Settings.vue` (placeholder)
- Modify: `D:\Repos\GermanTrainer\src\main.ts`
- Modify: `D:\Repos\GermanTrainer\src\App.vue`

- [ ] **Step 1: Write `src/router.ts`**

```ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('./modules/home/Home.vue') },
  { path: '/settings', name: 'settings', component: () => import('./modules/settings/Settings.vue') },
  { path: '/nouns', name: 'nouns', component: () => import('./modules/nouns/NounsHome.vue') },
  { path: '/adjectives', name: 'adjectives', component: () => import('./modules/adjectives/AdjectivesHome.vue') }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
```

- [ ] **Step 2: Write `src/components/NavShell.vue`**

```vue
<script setup lang="ts">
import { NLayout, NLayoutHeader, NLayoutContent, NMenu, NSpace, NText } from 'naive-ui'
import { useRouter, useRoute } from 'vue-router'
import { computed, h } from 'vue'

const router = useRouter()
const route = useRoute()

const items = [
  { label: 'Home', key: 'home' },
  { label: 'Nouns', key: 'nouns' },
  { label: 'Adjectives', key: 'adjectives' },
  { label: 'Settings', key: 'settings' }
]

const activeKey = computed(() => (route.name as string) ?? 'home')

function onSelect(key: string) {
  router.push({ name: key })
}
</script>

<template>
  <n-layout style="height: 100vh">
    <n-layout-header bordered style="padding: 12px 24px">
      <n-space justify="space-between" align="center">
        <n-text strong style="font-size: 18px">German Trainer</n-text>
        <n-menu
          mode="horizontal"
          :options="items"
          :value="activeKey"
          @update:value="onSelect"
        />
      </n-space>
    </n-layout-header>
    <n-layout-content content-style="padding: 24px">
      <router-view />
    </n-layout-content>
  </n-layout>
</template>
```

- [ ] **Step 3: Write `src/modules/home/Home.vue`**

```vue
<script setup lang="ts">
import { NCard, NGrid, NGridItem, NButton, NSpace, NText } from 'naive-ui'
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <n-space vertical size="large">
    <n-text style="font-size: 22px">Practice German vocabulary</n-text>
    <n-grid :cols="3" :x-gap="16">
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
          <p>Set your Anthropic API key and pick a model.</p>
          <n-button @click="router.push('/settings')">Open</n-button>
        </n-card>
      </n-grid-item>
    </n-grid>
  </n-space>
</template>
```

- [ ] **Step 4: Write three placeholder pages**

`src/modules/nouns/NounsHome.vue`:
```vue
<template>
  <div>Nouns module — coming in Task 19.</div>
</template>
```

`src/modules/adjectives/AdjectivesHome.vue`:
```vue
<template>
  <div>Adjectives module — coming in Task 22.</div>
</template>
```

`src/modules/settings/Settings.vue`:
```vue
<template>
  <div>Settings — coming in Task 15.</div>
</template>
```

- [ ] **Step 5: Update `src/main.ts`**

```ts
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { db, seedIfEmpty } from './db'

async function bootstrap() {
  await db.open()
  await seedIfEmpty()
  const app = createApp(App)
  app.use(router)
  app.mount('#app')
}

bootstrap()
```

Naive UI components are imported per-file in each `.vue` component, so no global plugin registration is needed. The `<NConfigProvider>` / `<NMessageProvider>` / `<NDialogProvider>` wrappers in `App.vue` provide the runtime context used by `useMessage()` etc.

- [ ] **Step 6: Update `src/App.vue`**

```vue
<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider } from 'naive-ui'
import NavShell from './components/NavShell.vue'
</script>

<template>
  <n-config-provider>
    <n-message-provider>
      <n-dialog-provider>
        <NavShell />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
```

- [ ] **Step 7: Verify dev server works**

Run:
```
npm run dev
```

Open `http://localhost:5173/`. Confirm:
- Home page shows three cards.
- Top nav routes to `/nouns`, `/adjectives`, `/settings`.
- No console errors.

Stop with Ctrl+C.

- [ ] **Step 8: Run typecheck and tests**

Run:
```
npx vue-tsc -b --noEmit
npm test
```

Expected: clean.

- [ ] **Step 9: Commit**

Run:
```
git add src/router.ts src/components/NavShell.vue src/modules/home/Home.vue src/modules/nouns/NounsHome.vue src/modules/adjectives/AdjectivesHome.vue src/modules/settings/Settings.vue src/main.ts src/App.vue
git commit -m "feat: add router, app shell, navigation, and home page"
```

---

## Task 15: Settings page (ApiKeyForm + Settings.vue)

**Files:**
- Create: `D:\Repos\GermanTrainer\src\components\ApiKeyForm.vue`
- Modify: `D:\Repos\GermanTrainer\src\modules\settings\Settings.vue`

- [ ] **Step 1: Write `src/components/ApiKeyForm.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  NForm, NFormItem, NInput, NButton, NSelect, NSpace, NAlert, useMessage
} from 'naive-ui'
import { useSettings } from '../composables/useSettings'
import { makeAnthropicClient, generateAdjectiveSentences } from '../composables/useClaude'

const { settings, load, save } = useSettings()
const message = useMessage()
const testing = ref(false)
const testResult = ref<'ok' | 'error' | null>(null)
const testError = ref('')

const modelOptions = [
  { label: 'claude-sonnet-4-6 (default)', value: 'claude-sonnet-4-6' },
  { label: 'claude-haiku-4-5-20251001 (cheaper, faster)', value: 'claude-haiku-4-5-20251001' }
]

onMounted(load)

async function onSave() {
  await save()
  message.success('Settings saved.')
}

async function onTest() {
  testing.value = true
  testResult.value = null
  testError.value = ''
  try {
    const client = makeAnthropicClient(settings.value.anthropicApiKey)
    await generateAdjectiveSentences(client, {
      model: settings.value.model,
      adjectives: [{ german: 'schön', english: 'beautiful' }]
    })
    testResult.value = 'ok'
  } catch (err) {
    testResult.value = 'error'
    testError.value = err instanceof Error ? err.message : String(err)
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <n-space vertical size="large" style="max-width: 640px">
    <n-form label-placement="top">
      <n-form-item label="Anthropic API key">
        <n-input
          v-model:value="settings.anthropicApiKey"
          type="password"
          show-password-on="click"
          placeholder="sk-ant-..."
        />
      </n-form-item>
      <n-form-item label="Model">
        <n-select v-model:value="settings.model" :options="modelOptions" />
      </n-form-item>
      <n-space>
        <n-button type="primary" @click="onSave">Save</n-button>
        <n-button :loading="testing" @click="onTest" :disabled="!settings.anthropicApiKey">
          Test connection
        </n-button>
      </n-space>
    </n-form>
    <n-alert v-if="testResult === 'ok'" type="success">Connection works.</n-alert>
    <n-alert v-if="testResult === 'error'" type="error" :title="'Test failed'">
      {{ testError }}
    </n-alert>
    <n-alert type="warning" title="Security note">
      Your API key is stored locally in this browser and sent directly to Anthropic.
      Anyone with access to this browser profile can read it. Use only on personal devices.
    </n-alert>
  </n-space>
</template>
```

- [ ] **Step 2: Replace `src/modules/settings/Settings.vue`**

```vue
<script setup lang="ts">
import ApiKeyForm from '../../components/ApiKeyForm.vue'
</script>

<template>
  <div>
    <h2>Settings</h2>
    <ApiKeyForm />
  </div>
</template>
```

- [ ] **Step 3: Verify in dev server**

Run:
```
npm run dev
```

Open `/settings`. Confirm:
- API key input is masked, can be revealed.
- Model dropdown has both options.
- Save button persists (refresh page, key still there).

Stop with Ctrl+C.

- [ ] **Step 4: Typecheck**

Run:
```
npx vue-tsc -b --noEmit
```

Expected: exit 0.

- [ ] **Step 5: Commit**

Run:
```
git add src/components/ApiKeyForm.vue src/modules/settings/Settings.vue
git commit -m "feat: add settings page with API key, model, and connection test"
```

---

## Task 16: Shared EntryEditor and EntryList components

These two are used by both ManageNouns and ManageAdjectives in the next two tasks. They take props/emits to remain generic.

**Files:**
- Create: `D:\Repos\GermanTrainer\src\components\EntryEditor.vue`
- Create: `D:\Repos\GermanTrainer\src\components\EntryList.vue`

- [ ] **Step 1: Write `src/components/EntryEditor.vue`**

A single modal for both create and edit. Accepts a list of field configs so the same component handles nouns (3 fields: german, gender, english) and adjectives (2 fields: german, english).

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NModal, NCard, NForm, NFormItem, NInput, NSelect, NButton, NSpace } from 'naive-ui'

type FieldType = 'text' | 'gender'
interface FieldDef { key: string; label: string; type: FieldType }

const props = defineProps<{
  show: boolean
  title: string
  fields: FieldDef[]
  initial: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'submit', value: Record<string, string>): void
}>()

const form = ref<Record<string, string>>({ ...props.initial })

watch(() => props.show, (v) => { if (v) form.value = { ...props.initial } })

const genderOptions = [
  { label: 'der', value: 'der' },
  { label: 'die', value: 'die' },
  { label: 'das', value: 'das' }
]

const canSubmit = computed(() =>
  props.fields.every(f => (form.value[f.key] ?? '').trim().length > 0)
)

function close() { emit('update:show', false) }
function submit() { if (canSubmit.value) emit('submit', { ...form.value }) }
</script>

<template>
  <n-modal :show="show" @update:show="emit('update:show', $event)" preset="card" :title="title" style="max-width: 480px">
    <n-form label-placement="top">
      <n-form-item v-for="f in fields" :key="f.key" :label="f.label">
        <n-select
          v-if="f.type === 'gender'"
          v-model:value="form[f.key]"
          :options="genderOptions"
        />
        <n-input v-else v-model:value="form[f.key]" />
      </n-form-item>
      <n-space>
        <n-button @click="close">Cancel</n-button>
        <n-button type="primary" :disabled="!canSubmit" @click="submit">Save</n-button>
      </n-space>
    </n-form>
  </n-modal>
</template>
```

- [ ] **Step 2: Write `src/components/EntryList.vue`**

```vue
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
```

- [ ] **Step 3: Typecheck**

Run:
```
npx vue-tsc -b --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Commit**

Run:
```
git add src/components/EntryEditor.vue src/components/EntryList.vue
git commit -m "feat: add shared EntryEditor and EntryList components"
```

---

## Task 17: ManageNouns page

**Files:**
- Create: `D:\Repos\GermanTrainer\src\modules\nouns\ManageNouns.vue`
- Modify: `D:\Repos\GermanTrainer\src\router.ts`

- [ ] **Step 1: Write `src/modules/nouns/ManageNouns.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NButton, NSpace, NPopconfirm, useMessage } from 'naive-ui'
import EntryList from '../../components/EntryList.vue'
import EntryEditor from '../../components/EntryEditor.vue'
import { useNouns } from '../../composables/useNouns'
import { resetTableToSeed } from '../../db'
import type { Gender, Noun } from '../../db/types'

const { items, refresh, create, update, remove } = useNouns()
const message = useMessage()

const editorOpen = ref(false)
const editorTitle = ref('Add noun')
const editing = ref<Noun | null>(null)
const editorInitial = ref<Record<string, string>>({ german: '', gender: 'der', english: '' })

const fields = [
  { key: 'german', label: 'German', type: 'text' as const },
  { key: 'gender', label: 'Gender', type: 'gender' as const },
  { key: 'english', label: 'English (use / for multiple acceptable answers)', type: 'text' as const }
]

const columns = [
  { key: 'german', title: 'German' },
  { key: 'gender', title: 'Gender' },
  { key: 'english', title: 'English' }
]

onMounted(refresh)

function onAdd() {
  editing.value = null
  editorTitle.value = 'Add noun'
  editorInitial.value = { german: '', gender: 'der', english: '' }
  editorOpen.value = true
}

function onEdit(row: Record<string, unknown> & { id: number }) {
  const found = items.value.find(n => n.id === row.id) ?? null
  editing.value = found
  if (found) {
    editorTitle.value = 'Edit noun'
    editorInitial.value = { german: found.german, gender: found.gender, english: found.english }
    editorOpen.value = true
  }
}

async function onSubmit(values: Record<string, string>) {
  const data = {
    german: values.german.trim(),
    gender: values.gender as Gender,
    english: values.english.trim()
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
    <n-space>
      <n-button type="primary" @click="onAdd">Add noun</n-button>
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
```

- [ ] **Step 2: Add the route**

Edit `src/router.ts`. Replace its contents with:

```ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('./modules/home/Home.vue') },
  { path: '/settings', name: 'settings', component: () => import('./modules/settings/Settings.vue') },
  { path: '/nouns', name: 'nouns', component: () => import('./modules/nouns/NounsHome.vue') },
  { path: '/nouns/manage', name: 'nouns-manage', component: () => import('./modules/nouns/ManageNouns.vue') },
  { path: '/adjectives', name: 'adjectives', component: () => import('./modules/adjectives/AdjectivesHome.vue') }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
```

- [ ] **Step 3: Update NounsHome to link Manage**

Replace `src/modules/nouns/NounsHome.vue` with:

```vue
<script setup lang="ts">
import { NSpace, NCard, NGrid, NGridItem, NButton } from 'naive-ui'
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <n-space vertical size="large">
    <h2>Nouns</h2>
    <n-grid :cols="2" :x-gap="16">
      <n-grid-item>
        <n-card title="Manage nouns" hoverable>
          <p>Add, edit, or delete nouns. Reset to defaults from the seed list.</p>
          <n-button @click="router.push('/nouns/manage')">Open</n-button>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="Quiz" hoverable>
          <p>Pick gender or translation mode and quiz yourself on N random nouns.</p>
          <n-button type="primary" disabled>Coming in Task 19</n-button>
        </n-card>
      </n-grid-item>
    </n-grid>
  </n-space>
</template>
```

- [ ] **Step 4: Verify in dev server**

Run:
```
npm run dev
```

Open `/nouns/manage`. Confirm:
- Seed nouns are listed.
- Add a noun → appears in list.
- Edit a noun → updates.
- Delete a noun → confirmation, then removed.
- Search filters across columns.
- Reset to defaults restores seed list.

Stop with Ctrl+C.

- [ ] **Step 5: Typecheck and tests**

Run:
```
npx vue-tsc -b --noEmit
npm test
```

Expected: clean.

- [ ] **Step 6: Commit**

Run:
```
git add src/modules/nouns/ManageNouns.vue src/modules/nouns/NounsHome.vue src/router.ts
git commit -m "feat: add ManageNouns CRUD page"
```

---

## Task 18: ManageAdjectives page

**Files:**
- Create: `D:\Repos\GermanTrainer\src\modules\adjectives\ManageAdjectives.vue`
- Modify: `D:\Repos\GermanTrainer\src\router.ts`
- Modify: `D:\Repos\GermanTrainer\src\modules\adjectives\AdjectivesHome.vue`

- [ ] **Step 1: Write `src/modules/adjectives/ManageAdjectives.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NButton, NSpace, NPopconfirm, useMessage } from 'naive-ui'
import EntryList from '../../components/EntryList.vue'
import EntryEditor from '../../components/EntryEditor.vue'
import { useAdjectives } from '../../composables/useAdjectives'
import { resetTableToSeed } from '../../db'
import type { Adjective } from '../../db/types'

const { items, refresh, create, update, remove } = useAdjectives()
const message = useMessage()

const editorOpen = ref(false)
const editorTitle = ref('Add adjective')
const editing = ref<Adjective | null>(null)
const editorInitial = ref<Record<string, string>>({ german: '', english: '' })

const fields = [
  { key: 'german', label: 'German (base form)', type: 'text' as const },
  { key: 'english', label: 'English', type: 'text' as const }
]

const columns = [
  { key: 'german', title: 'German' },
  { key: 'english', title: 'English' }
]

onMounted(refresh)

function onAdd() {
  editing.value = null
  editorTitle.value = 'Add adjective'
  editorInitial.value = { german: '', english: '' }
  editorOpen.value = true
}

function onEdit(row: Record<string, unknown> & { id: number }) {
  const found = items.value.find(n => n.id === row.id) ?? null
  editing.value = found
  if (found) {
    editorTitle.value = 'Edit adjective'
    editorInitial.value = { german: found.german, english: found.english }
    editorOpen.value = true
  }
}

async function onSubmit(values: Record<string, string>) {
  const data = { german: values.german.trim(), english: values.english.trim() }
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
```

- [ ] **Step 2: Add the route**

Edit `src/router.ts`. Replace its contents with:

```ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('./modules/home/Home.vue') },
  { path: '/settings', name: 'settings', component: () => import('./modules/settings/Settings.vue') },
  { path: '/nouns', name: 'nouns', component: () => import('./modules/nouns/NounsHome.vue') },
  { path: '/nouns/manage', name: 'nouns-manage', component: () => import('./modules/nouns/ManageNouns.vue') },
  { path: '/adjectives', name: 'adjectives', component: () => import('./modules/adjectives/AdjectivesHome.vue') },
  { path: '/adjectives/manage', name: 'adjectives-manage', component: () => import('./modules/adjectives/ManageAdjectives.vue') }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
```

- [ ] **Step 3: Replace `src/modules/adjectives/AdjectivesHome.vue`**

```vue
<script setup lang="ts">
import { NSpace, NCard, NGrid, NGridItem, NButton } from 'naive-ui'
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <n-space vertical size="large">
    <h2>Adjectives</h2>
    <n-grid :cols="2" :x-gap="16">
      <n-grid-item>
        <n-card title="Manage adjectives" hoverable>
          <p>Add, edit, or delete adjectives.</p>
          <n-button @click="router.push('/adjectives/manage')">Open</n-button>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="Quiz" hoverable>
          <p>AI-generated sentences with the adjective blanked out.</p>
          <n-button type="primary" disabled>Coming in Task 22</n-button>
        </n-card>
      </n-grid-item>
    </n-grid>
  </n-space>
</template>
```

- [ ] **Step 4: Verify in dev server**

Run:
```
npm run dev
```

Open `/adjectives/manage`. Confirm CRUD works as in Task 17.

Stop with Ctrl+C.

- [ ] **Step 5: Typecheck and tests**

Run:
```
npx vue-tsc -b --noEmit
npm test
```

Expected: clean.

- [ ] **Step 6: Commit**

Run:
```
git add src/modules/adjectives/ManageAdjectives.vue src/modules/adjectives/AdjectivesHome.vue src/router.ts
git commit -m "feat: add ManageAdjectives CRUD page"
```

---

## Task 19: Noun QuizSetup + NounsHome wiring

**Files:**
- Create: `D:\Repos\GermanTrainer\src\modules\nouns\QuizSetup.vue`
- Modify: `D:\Repos\GermanTrainer\src\modules\nouns\NounsHome.vue`
- Modify: `D:\Repos\GermanTrainer\src\router.ts`

- [ ] **Step 1: Write `src/modules/nouns/QuizSetup.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NRadioGroup, NRadio, NSpace, NButton, NInputNumber, NAlert, useMessage
} from 'naive-ui'
import { useRouter } from 'vue-router'
import { useNouns } from '../../composables/useNouns'

const { count } = useNouns()
const router = useRouter()
const message = useMessage()

const totalAvailable = ref(0)
const mode = ref<'gender' | 'translation'>('gender')
const preset = ref<10 | 15 | 20 | 'custom'>(10)
const customCount = ref(10)

onMounted(async () => {
  totalAvailable.value = await count()
})

const requested = computed(() => (preset.value === 'custom' ? customCount.value : preset.value))
const effective = computed(() => Math.min(requested.value, totalAvailable.value))

function start() {
  if (totalAvailable.value === 0) {
    message.error('Add some nouns first.')
    return
  }
  router.push({
    name: 'nouns-quiz-run',
    query: { mode: mode.value, count: String(effective.value) }
  })
}
</script>

<template>
  <n-space vertical size="large" style="max-width: 480px">
    <h2>Noun quiz setup</h2>
    <n-alert v-if="totalAvailable === 0" type="warning">
      No nouns available. Add some first in Manage nouns.
    </n-alert>
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
        :max="totalAvailable"
        style="margin-top: 8px"
      />
    </div>
    <n-alert v-if="requested > totalAvailable" type="info">
      Only {{ totalAvailable }} nouns available — quizzing all of them.
    </n-alert>
    <n-button type="primary" :disabled="totalAvailable === 0" @click="start">Start quiz</n-button>
  </n-space>
</template>
```

- [ ] **Step 2: Update `src/modules/nouns/NounsHome.vue` to enable the Quiz button**

```vue
<script setup lang="ts">
import { NSpace, NCard, NGrid, NGridItem, NButton } from 'naive-ui'
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <n-space vertical size="large">
    <h2>Nouns</h2>
    <n-grid :cols="2" :x-gap="16">
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

- [ ] **Step 3: Add the quiz routes**

Replace `src/router.ts`:

```ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('./modules/home/Home.vue') },
  { path: '/settings', name: 'settings', component: () => import('./modules/settings/Settings.vue') },
  { path: '/nouns', name: 'nouns', component: () => import('./modules/nouns/NounsHome.vue') },
  { path: '/nouns/manage', name: 'nouns-manage', component: () => import('./modules/nouns/ManageNouns.vue') },
  { path: '/nouns/quiz', name: 'nouns-quiz', component: () => import('./modules/nouns/QuizSetup.vue') },
  { path: '/nouns/quiz/run', name: 'nouns-quiz-run', component: () => import('./modules/nouns/QuizRunner.vue') },
  { path: '/adjectives', name: 'adjectives', component: () => import('./modules/adjectives/AdjectivesHome.vue') },
  { path: '/adjectives/manage', name: 'adjectives-manage', component: () => import('./modules/adjectives/ManageAdjectives.vue') }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
```

`QuizRunner.vue` is created in Task 21. The route will 404 until then — that's expected.

- [ ] **Step 4: Verify the setup screen renders**

Run:
```
npm run dev
```

Open `/nouns/quiz`. Confirm:
- Mode radio buttons work.
- Count radios work, custom input appears when "Custom" is picked.
- Cap notice appears when requested > available.
- "Start quiz" navigates to `/nouns/quiz/run` (will 404 until Task 21).

Stop with Ctrl+C.

- [ ] **Step 5: Commit**

Run:
```
git add src/modules/nouns/QuizSetup.vue src/modules/nouns/NounsHome.vue src/router.ts
git commit -m "feat: add noun quiz setup screen"
```

---

## Task 20: GenderQuiz and TranslationQuiz components

**Files:**
- Create: `D:\Repos\GermanTrainer\src\modules\nouns\GenderQuiz.vue`
- Create: `D:\Repos\GermanTrainer\src\modules\nouns\TranslationQuiz.vue`

These are presentational components that take a `useNounQuiz` instance via prop. They render the current question and call `submit`/`advance`.

- [ ] **Step 1: Write `src/modules/nouns/GenderQuiz.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { NSpace, NButton, NText, NCard } from 'naive-ui'
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

const buttons: Array<'der' | 'die' | 'das'> = ['der', 'die', 'das']

function pick(g: 'der' | 'die' | 'das') {
  if (submitted.value) return
  userAnswer.value = g
  isCorrect.value = g === props.noun.gender
  submitted.value = true
  emit('answered', isCorrect.value, g)
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
  <n-card>
    <n-space vertical size="large" align="center">
      <n-text>Question {{ questionNumber }} of {{ totalQuestions }}</n-text>
      <n-text style="font-size: 32px">{{ noun.german }}</n-text>
      <n-space>
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
      <n-button v-if="submitted" type="primary" @click="next">Next</n-button>
    </n-space>
  </n-card>
</template>
```

- [ ] **Step 2: Write `src/modules/nouns/TranslationQuiz.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
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

function check(answer: string, expected: string): boolean {
  const a = answer.trim().toLowerCase()
  if (a.length === 0) return false
  return expected.split('/').some(seg => seg.trim().toLowerCase() === a)
}

function submit() {
  if (submitted.value) return
  isCorrect.value = check(input.value, props.noun.english)
  submitted.value = true
  emit('answered', isCorrect.value, input.value)
}

function next() {
  submitted.value = false
  input.value = ''
  isCorrect.value = null
  emit('next')
}

const feedbackColor = computed(() =>
  isCorrect.value === null ? '' : isCorrect.value ? '#18a058' : '#d03050'
)
</script>

<template>
  <n-card>
    <n-space vertical size="large" align="center">
      <n-text>Question {{ questionNumber }} of {{ totalQuestions }}</n-text>
      <n-text style="font-size: 32px">{{ noun.gender }} {{ noun.german }}</n-text>
      <n-input
        v-model:value="input"
        :disabled="submitted"
        placeholder="English meaning"
        style="width: 280px"
        @keyup.enter="submit"
      />
      <n-button v-if="!submitted" type="primary" :disabled="!input.trim()" @click="submit">Submit</n-button>
      <n-text v-if="submitted" :style="{ color: feedbackColor }">
        {{ isCorrect ? '✅ Correct' : `❌ Correct: ${noun.english}` }}
      </n-text>
      <n-button v-if="submitted" type="primary" @click="next">Next</n-button>
    </n-space>
  </n-card>
</template>
```

- [ ] **Step 3: Typecheck**

Run:
```
npx vue-tsc -b --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Commit**

Run:
```
git add src/modules/nouns/GenderQuiz.vue src/modules/nouns/TranslationQuiz.vue
git commit -m "feat: add GenderQuiz and TranslationQuiz components"
```

---

## Task 21: Noun QuizRunner + QuizResult

**Files:**
- Create: `D:\Repos\GermanTrainer\src\modules\nouns\QuizRunner.vue`
- Create: `D:\Repos\GermanTrainer\src\modules\nouns\QuizResult.vue`

`QuizRunner` orchestrates the quiz: loads N random nouns, runs the chosen quiz component, shows the result page when done. It uses `useNounQuiz` for session state.

- [ ] **Step 1: Write `src/modules/nouns/QuizRunner.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin, NSpace, NAlert, NButton } from 'naive-ui'
import { useNouns } from '../../composables/useNouns'
import { useNounQuiz, type NounQuizMode } from '../../composables/useNounQuiz'
import GenderQuiz from './GenderQuiz.vue'
import TranslationQuiz from './TranslationQuiz.vue'
import QuizResult from './QuizResult.vue'
import type { Noun } from '../../db/types'

const route = useRoute()
const router = useRouter()
const { sample } = useNouns()

const loading = ref(true)
const error = ref<string | null>(null)
const nouns = ref<Noun[]>([])
const mode = ref<NounQuizMode>('gender')

let quiz: ReturnType<typeof useNounQuiz> | null = null
const ready = ref(false)

onMounted(async () => {
  const m = (route.query.mode as string) === 'translation' ? 'translation' : 'gender'
  const c = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  mode.value = m
  try {
    nouns.value = await sample(c)
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

function onAnswered(correct: boolean, answer: string) {
  if (!quiz) return
  quiz.submit(answer)
  void correct
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

Note: the inner `GenderQuiz` / `TranslationQuiz` components compute correctness locally for the immediate visual feedback they show. The runner re-records the same answer in the quiz session by calling `quiz.submit(answer)` — `useNounQuiz.submit` runs the same matching logic, so the inline UI and the session state stay in sync.

- [ ] **Step 2: Write `src/modules/nouns/QuizResult.vue`**

```vue
<script setup lang="ts">
import { NCard, NSpace, NText, NButton, NList, NListItem, NTag } from 'naive-ui'
import type { NounQuestion, NounQuizMode } from '../../composables/useNounQuiz'

defineProps<{
  questions: NounQuestion[]
  score: number
  total: number
  mode: NounQuizMode
}>()

defineEmits<{ (e: 'restart'): void }>()
</script>

<template>
  <n-card>
    <n-space vertical size="large">
      <n-text style="font-size: 24px">Score: {{ score }} / {{ total }}</n-text>
      <n-list bordered>
        <n-list-item v-for="(q, i) in questions" :key="i">
          <n-space justify="space-between" align="center" style="width: 100%">
            <span>
              <strong>{{ q.noun.german }}</strong>
              — {{ mode === 'gender' ? `correct: ${q.noun.gender}` : `correct: ${q.noun.english}` }}
              — your answer: {{ q.userAnswer ?? '(none)' }}
            </span>
            <n-tag :type="q.isCorrect ? 'success' : 'error'">
              {{ q.isCorrect ? 'Correct' : 'Wrong' }}
            </n-tag>
          </n-space>
        </n-list-item>
      </n-list>
      <n-button type="primary" @click="$emit('restart')">Start another quiz</n-button>
    </n-space>
  </n-card>
</template>
```

- [ ] **Step 3: Verify in dev server**

Run:
```
npm run dev
```

Open `/nouns`. Click "Start quiz". Pick 10 questions, gender mode. Confirm:
- 10 questions appear one at a time.
- Per-question feedback works (green/red, correct answer revealed).
- After last question, result page lists all questions with score.
- "Start another quiz" goes back to setup.
- Repeat with translation mode — same flow.

Stop with Ctrl+C.

- [ ] **Step 4: Typecheck and tests**

Run:
```
npx vue-tsc -b --noEmit
npm test
```

Expected: clean.

- [ ] **Step 5: Commit**

Run:
```
git add src/modules/nouns/QuizRunner.vue src/modules/nouns/QuizResult.vue
git commit -m "feat: add noun quiz runner and result page"
```

---

## Task 22: Adjective QuizSetup + AdjectivesHome wiring

**Files:**
- Create: `D:\Repos\GermanTrainer\src\modules\adjectives\QuizSetup.vue`
- Modify: `D:\Repos\GermanTrainer\src\modules\adjectives\AdjectivesHome.vue`
- Modify: `D:\Repos\GermanTrainer\src\router.ts`

- [ ] **Step 1: Write `src/modules/adjectives/QuizSetup.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NRadioGroup, NRadio, NSpace, NButton, NInputNumber, NAlert } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useAdjectives } from '../../composables/useAdjectives'
import { useSettings } from '../../composables/useSettings'

const { count } = useAdjectives()
const { hasApiKey, load: loadSettings } = useSettings()
const router = useRouter()

const totalAvailable = ref(0)
const preset = ref<10 | 15 | 20 | 'custom'>(10)
const customCount = ref(10)

onMounted(async () => {
  totalAvailable.value = await count()
  await loadSettings()
})

const requested = computed(() => (preset.value === 'custom' ? customCount.value : preset.value))
const effective = computed(() => Math.min(requested.value, totalAvailable.value))

function start() {
  router.push({ name: 'adjectives-quiz-run', query: { count: String(effective.value) } })
}
</script>

<template>
  <n-space vertical size="large" style="max-width: 480px">
    <h2>Adjective quiz setup</h2>
    <n-alert v-if="totalAvailable === 0" type="warning">
      No adjectives available. Add some first in Manage adjectives.
    </n-alert>
    <n-alert v-if="!hasApiKey" type="warning">
      Set your Anthropic API key in <router-link to="/settings">Settings</router-link> first.
    </n-alert>
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
        :max="totalAvailable"
        style="margin-top: 8px"
      />
    </div>
    <n-alert v-if="requested > totalAvailable" type="info">
      Only {{ totalAvailable }} adjectives available — quizzing all of them.
    </n-alert>
    <n-button
      type="primary"
      :disabled="totalAvailable === 0 || !hasApiKey"
      @click="start"
    >
      Generate sentences and start
    </n-button>
  </n-space>
</template>
```

- [ ] **Step 2: Update `src/modules/adjectives/AdjectivesHome.vue`**

```vue
<script setup lang="ts">
import { NSpace, NCard, NGrid, NGridItem, NButton } from 'naive-ui'
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <n-space vertical size="large">
    <h2>Adjectives</h2>
    <n-grid :cols="2" :x-gap="16">
      <n-grid-item>
        <n-card title="Manage adjectives" hoverable>
          <p>Add, edit, or delete adjectives.</p>
          <n-button @click="router.push('/adjectives/manage')">Open</n-button>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="Quiz" hoverable>
          <p>AI-generated sentences with the adjective blanked out.</p>
          <n-button type="primary" @click="router.push('/adjectives/quiz')">Start quiz</n-button>
        </n-card>
      </n-grid-item>
    </n-grid>
  </n-space>
</template>
```

- [ ] **Step 3: Add quiz routes**

Replace `src/router.ts` entirely:

```ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('./modules/home/Home.vue') },
  { path: '/settings', name: 'settings', component: () => import('./modules/settings/Settings.vue') },
  { path: '/nouns', name: 'nouns', component: () => import('./modules/nouns/NounsHome.vue') },
  { path: '/nouns/manage', name: 'nouns-manage', component: () => import('./modules/nouns/ManageNouns.vue') },
  { path: '/nouns/quiz', name: 'nouns-quiz', component: () => import('./modules/nouns/QuizSetup.vue') },
  { path: '/nouns/quiz/run', name: 'nouns-quiz-run', component: () => import('./modules/nouns/QuizRunner.vue') },
  { path: '/adjectives', name: 'adjectives', component: () => import('./modules/adjectives/AdjectivesHome.vue') },
  { path: '/adjectives/manage', name: 'adjectives-manage', component: () => import('./modules/adjectives/ManageAdjectives.vue') },
  { path: '/adjectives/quiz', name: 'adjectives-quiz', component: () => import('./modules/adjectives/QuizSetup.vue') },
  { path: '/adjectives/quiz/run', name: 'adjectives-quiz-run', component: () => import('./modules/adjectives/QuizRunner.vue') }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
```

`adjectives/QuizRunner.vue` is created in Task 23.

- [ ] **Step 4: Verify the setup screen**

Run:
```
npm run dev
```

Open `/adjectives/quiz`. Confirm:
- "Set your Anthropic API key" warning shows when no key.
- After saving a key in Settings, returning here re-checks (refresh the page if not auto).
- Count radios + custom input work.

Stop with Ctrl+C.

- [ ] **Step 5: Commit**

Run:
```
git add src/modules/adjectives/QuizSetup.vue src/modules/adjectives/AdjectivesHome.vue src/router.ts
git commit -m "feat: add adjective quiz setup screen"
```

---

## Task 23: Adjective SentenceQuiz, QuizRunner, QuizResult

**Files:**
- Create: `D:\Repos\GermanTrainer\src\modules\adjectives\SentenceQuiz.vue`
- Create: `D:\Repos\GermanTrainer\src\modules\adjectives\QuizRunner.vue`
- Create: `D:\Repos\GermanTrainer\src\modules\adjectives\QuizResult.vue`

- [ ] **Step 1: Write `src/modules/adjectives/SentenceQuiz.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
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

function submit() {
  if (submitted.value) return
  submitted.value = true
  emit('answered', input.value)
}

function next() {
  submitted.value = false
  input.value = ''
  emit('next')
}

const feedbackColor = computed(() =>
  !submitted.value ? '' : props.question.isCorrect ? '#18a058' : '#d03050'
)
</script>

<template>
  <n-card>
    <n-space vertical size="large">
      <n-text>Question {{ questionNumber }} of {{ totalQuestions }}</n-text>
      <n-text style="font-size: 22px">{{ question.blanked }}</n-text>
      <n-input
        v-model:value="input"
        :disabled="submitted"
        placeholder="adjective"
        style="width: 280px"
        @keyup.enter="submit"
      />
      <n-button v-if="!submitted" type="primary" :disabled="!input.trim()" @click="submit">Submit</n-button>
      <n-text v-if="submitted" :style="{ color: feedbackColor }">
        {{ question.isCorrect
          ? '✅ Correct'
          : `❌ Correct: ${question.item.adjective_inflected} (base: ${question.item.adjective_base})` }}
      </n-text>
      <n-text v-if="submitted" depth="3">Full sentence: {{ question.item.sentence }}</n-text>
      <n-button v-if="submitted" type="primary" @click="next">Next</n-button>
    </n-space>
  </n-card>
</template>
```

- [ ] **Step 2: Write `src/modules/adjectives/QuizRunner.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin, NAlert, NButton, NSpace, NText } from 'naive-ui'
import { useAdjectives } from '../../composables/useAdjectives'
import { useSettings } from '../../composables/useSettings'
import {
  generateAdjectiveSentences,
  makeAnthropicClient,
  type SentenceItem
} from '../../composables/useClaude'
import { useAdjectiveQuiz } from '../../composables/useAdjectiveQuiz'
import SentenceQuiz from './SentenceQuiz.vue'
import QuizResult from './QuizResult.vue'

const route = useRoute()
const router = useRouter()
const { sample } = useAdjectives()
const { settings, load: loadSettings } = useSettings()

const phase = ref<'loading' | 'error' | 'quiz'>('loading')
const errorMsg = ref('')
let quiz: ReturnType<typeof useAdjectiveQuiz> | null = null
const ready = ref(false)

async function generate(): Promise<SentenceItem[]> {
  const c = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const adjectives = await sample(c)
  if (adjectives.length === 0) {
    throw new Error('No adjectives available.')
  }
  const client = makeAnthropicClient(settings.value.anthropicApiKey)
  let res = await generateAdjectiveSentences(client, {
    model: settings.value.model,
    adjectives: adjectives.map(a => ({ german: a.german, english: a.english }))
  })
  if (res.valid.length < adjectives.length) {
    const missing = adjectives.slice(res.valid.length)
    if (missing.length > 0) {
      const topUp = await generateAdjectiveSentences(client, {
        model: settings.value.model,
        adjectives: missing.map(a => ({ german: a.german, english: a.english }))
      })
      res = { valid: [...res.valid, ...topUp.valid], invalid: [...res.invalid, ...topUp.invalid] }
    }
  }
  if (res.valid.length === 0) {
    throw new Error('No usable sentences from Anthropic. Try again.')
  }
  return res.valid
}

async function startQuiz() {
  phase.value = 'loading'
  errorMsg.value = ''
  try {
    await loadSettings()
    const sentences = await generate()
    quiz = useAdjectiveQuiz(sentences)
    ready.value = true
    phase.value = 'quiz'
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Failed to generate sentences.'
    phase.value = 'error'
  }
}

onMounted(startQuiz)

const current = computed(() => quiz?.current.value ?? null)
const finished = computed(() => quiz?.finished.value ?? false)

function onAnswered(answer: string) {
  quiz?.submit(answer)
}
function onNext() { quiz?.advance() }
function restart() { router.push('/adjectives/quiz') }
</script>

<template>
  <div>
    <template v-if="phase === 'loading'">
      <n-space vertical align="center">
        <n-spin />
        <n-text>Generating sentences...</n-text>
      </n-space>
    </template>
    <template v-else-if="phase === 'error'">
      <n-space vertical>
        <n-alert type="error" :title="'Generation failed'">{{ errorMsg }}</n-alert>
        <n-space>
          <n-button @click="startQuiz">Retry</n-button>
          <n-button @click="restart">Back to setup</n-button>
        </n-space>
      </n-space>
    </template>
    <template v-else-if="phase === 'quiz' && ready && quiz">
      <QuizResult
        v-if="finished"
        :questions="quiz.questions.value"
        :score="quiz.score.value"
        :total="quiz.total.value"
        @restart="restart"
      />
      <SentenceQuiz
        v-else-if="current"
        :question="current"
        :question-number="quiz.currentIndex.value + 1"
        :total-questions="quiz.total.value"
        @answered="onAnswered"
        @next="onNext"
      />
    </template>
  </div>
</template>
```

- [ ] **Step 3: Write `src/modules/adjectives/QuizResult.vue`**

```vue
<script setup lang="ts">
import { NCard, NSpace, NText, NButton, NList, NListItem, NTag } from 'naive-ui'
import type { AdjectiveQuestion } from '../../composables/useAdjectiveQuiz'

defineProps<{
  questions: AdjectiveQuestion[]
  score: number
  total: number
}>()

defineEmits<{ (e: 'restart'): void }>()
</script>

<template>
  <n-card>
    <n-space vertical size="large">
      <n-text style="font-size: 24px">Score: {{ score }} / {{ total }}</n-text>
      <n-list bordered>
        <n-list-item v-for="(q, i) in questions" :key="i">
          <n-space vertical style="width: 100%">
            <n-space justify="space-between">
              <strong>{{ q.item.sentence }}</strong>
              <n-tag :type="q.isCorrect ? 'success' : 'error'">
                {{ q.isCorrect ? 'Correct' : 'Wrong' }}
              </n-tag>
            </n-space>
            <n-text depth="3">
              Your answer: {{ q.userAnswer ?? '(none)' }} —
              correct: <strong>{{ q.item.adjective_inflected }}</strong> (base: {{ q.item.adjective_base }})
            </n-text>
          </n-space>
        </n-list-item>
      </n-list>
      <n-button type="primary" @click="$emit('restart')">Start another quiz</n-button>
    </n-space>
  </n-card>
</template>
```

- [ ] **Step 4: Manual smoke test (real Anthropic API call)**

Run:
```
npm run dev
```

1. Open `/settings`. Paste a real Anthropic API key. Save.
2. Click "Test connection". Confirm green success.
3. Open `/adjectives/quiz`. Pick count = 5, click "Generate sentences and start".
4. Confirm:
   - Loading spinner appears, then 5 sentences load.
   - Each sentence has a blanked adjective.
   - Submitting either the inflected form (as it appeared) or the base form is accepted as correct.
   - Wrong answers show both correct forms + the full sentence.
   - End-of-quiz summary lists all 5 with correct/wrong tags and score.

Stop with Ctrl+C.

- [ ] **Step 5: Typecheck and tests**

Run:
```
npx vue-tsc -b --noEmit
npm test
```

Expected: clean.

- [ ] **Step 6: Commit**

Run:
```
git add src/modules/adjectives/SentenceQuiz.vue src/modules/adjectives/QuizRunner.vue src/modules/adjectives/QuizResult.vue
git commit -m "feat: add adjective sentence quiz with AI generation"
```

---

## Task 24: Edge cases — IndexedDB unavailable, fatal-state UI

**Files:**
- Modify: `D:\Repos\GermanTrainer\src\main.ts`

If `db.open()` throws (e.g. Firefox private mode), we should render a static fatal screen instead of a blank page.

- [ ] **Step 1: Update `src/main.ts`**

```ts
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { db, seedIfEmpty } from './db'

async function bootstrap() {
  try {
    await db.open()
    await seedIfEmpty()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    document.getElementById('app')!.innerHTML = `
      <div style="padding: 24px; font-family: sans-serif">
        <h1>Storage unavailable</h1>
        <p>This app needs IndexedDB. Your browser blocked it (private/incognito mode?).</p>
        <p>Open a normal window and try again.</p>
        <pre style="color:#999">${msg}</pre>
      </div>
    `
    return
  }
  const app = createApp(App)
  app.use(router)
  app.mount('#app')
}

bootstrap()
```

- [ ] **Step 2: Manual smoke**

Run:
```
npm run dev
```

The app should still work normally. (Can't easily simulate IDB failure here; the path is exercised in production-like browser modes.)

Stop with Ctrl+C.

- [ ] **Step 3: Commit**

Run:
```
git add src/main.ts
git commit -m "feat: graceful fatal-state when IndexedDB is unavailable"
```

---

## Task 25: README and final polish

**Files:**
- Create: `D:\Repos\GermanTrainer\README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# German Trainer

A personal-use Vue 3 SPA for practicing German vocabulary. Two modules:

- **Nouns** — quiz the gender (`der`/`die`/`das`) or English translation of German nouns.
- **Adjectives** — fill-in-the-blank quiz with sentences generated on demand by the Anthropic API.

## Stack

Vue 3, Vite, TypeScript, Naive UI, Vue Router, Dexie (IndexedDB), `@anthropic-ai/sdk`. All persistence is local. The Anthropic API is called direct from the browser.

## Setup

```
npm install
npm run dev
```

Open the app, go to **Settings**, paste your Anthropic API key, and click **Test connection**. The default model is `claude-sonnet-4-6`; `claude-haiku-4-5-20251001` is cheaper and faster.

## Security

This app is for personal use on personal machines only. The API key sits in IndexedDB and is sent direct to `api.anthropic.com`. Anyone with access to your browser profile can read it. **Do not deploy this as a public site** — there is no backend proxy.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server. |
| `npm run build` | Type-check and produce a production build in `dist/`. |
| `npm run preview` | Serve the production build. |
| `npm test` | Run Vitest unit tests. |
| `npm run test:watch` | Vitest in watch mode. |

## Adding entries

The seed lists in `src/data/*.seed.json` are loaded on first run. After that, manage entries via the **Manage nouns** / **Manage adjectives** screens. Use **Reset to defaults** to wipe and re-seed (with confirmation).

## Spec / plan

See `docs/superpowers/specs/2026-05-04-german-trainer-design.md` and `docs/superpowers/plans/2026-05-04-german-trainer.md`.
```

- [ ] **Step 2: Run all tests one more time**

Run:
```
npm test
npx vue-tsc -b --noEmit
npm run build
```

Expected: tests pass, typecheck clean, production build succeeds and outputs `dist/`.

- [ ] **Step 3: Final manual smoke run**

Run:
```
npm run preview
```

Walk through the full app once: home → settings (paste key, test) → manage nouns (add+edit+delete) → noun quiz (gender, then translation) → manage adjectives → adjective quiz (5 questions, real API call). Confirm everything works.

Stop with Ctrl+C.

- [ ] **Step 4: Commit**

Run:
```
git add README.md
git commit -m "docs: add README"
```

- [ ] **Step 5: Tag the v0.1 milestone**

Run:
```
git tag v0.1.0
```

---

## Self-review notes (read before starting)

- **Spec coverage check:**
  - §3 stack — Tasks 1-3.
  - §4 layout — Tasks 1, 4-23 follow the layout exactly.
  - §5.1 schema — Task 5.
  - §5.2 seeding — Tasks 6-7.
  - §5.3 in-memory quiz session — Tasks 12, 13.
  - §6.1 routes — Tasks 14, 17-23 (router edits in 17, 18, 19, 22).
  - §6.2 noun quiz — Tasks 19-21.
  - §6.3 adjective quiz — Tasks 22-23.
  - §6.4 manage screens — Tasks 16-18.
  - §6.5 settings — Task 15.
  - §7 Anthropic integration — Task 11.
  - §8 error handling — distributed (no key gating in 22, malformed/empty in 23, rate limit + 401 surface as a generic toast in 23, IDB unavailable in 24).
  - §10 testing — Tasks 5, 7-13 carry test coverage; component tests are not duplicated in favor of composable-level coverage (logic lives there).
- **Type consistency:** `useNounQuiz`, `useAdjectiveQuiz` shapes used in QuizRunner/QuizResult match what their tests assert. `SentenceItem` is exported from `useClaude.ts` and consumed in `useAdjectiveQuiz.ts` and the runner.
- **Note on rate-limit / 401 retry:** the spec calls for an automatic retry on 429. The plan currently surfaces all errors via the same `retry/back to setup` UI. This is a deliberate simplification — a dedicated retry-after handler is a small follow-up if rate limits become a real problem. The error message will surface the rate-limit detail from the SDK for the user to act on.
