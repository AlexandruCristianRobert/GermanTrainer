# Version Page · Pagination · Declension v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three coupled pieces of work — (1) a version page + changelog system using a `x.yy.zz` convention, (2) a reusable Pagination component applied to every long table/list in the app (manage tables, history, result lists; **NOT** quiz runners), and (3) the second batch of declension drills (Pronoun forms + Case recognition).

**Architecture:** A new `src/data/changelog.ts` is the source of truth for `APP_VERSION` + the changelog array. A new `usePagination` composable + `Pagination.vue` component is dropped into every long list. The declension module gains two new drill types — pronoun forms (a 4-row case-table runner per pronoun, parallel to the existing decline-the-phrase drill) and case recognition (single-card multiple choice with a highlighted noun phrase). The landing grows from 4 to 6 cards. All new history types auto-flow through the existing stats dashboards via the labels file.

**Tech Stack:** Vue 3 + TS + vitest. No new dependencies.

---

## Versioning convention

`X.YY.ZZ`:
- **X** — major redesign (paper/ink-style rebrand; rare)
- **YY** — new module added (Nouns, Verbs, Adjectives, Prepositions, Declension)
- **ZZ** — patch (polish, fixes, sub-module additions like Declension v2 pronoun drill)

**Workflow rule going forward**: every commit gets a one-line summary in the changelog. Patches bump ZZ; new modules bump YY (reset ZZ); major redesigns bump X (reset YY+ZZ). The commit message body must mention the version bump (e.g. "1.07.00 — Declension v2 · pronoun drill"). This plan opens with **APP_VERSION = 1.07.00** for the declension v2 ship.

---

## File structure

**Created:**
- `src/data/changelog.ts` — `APP_VERSION` constant + `CHANGELOG` array
- `src/composables/usePagination.ts` — pagination logic (state + slice + page numbers)
- `src/components/Pagination.vue` — the reusable UI component
- `src/modules/version/VersionPage.vue` — the new About · Version page
- `src/components/VersionBadge.vue` — small pill button for the header + drawer
- `src/data/pronouns.ts` — pronoun dataset (personal + possessive + reflexive)
- `src/data/case-recognition.ts` — case-recognition sentence dataset
- `src/modules/declension/PronounQuizSetup.vue`
- `src/modules/declension/PronounQuizRunner.vue`
- `src/modules/declension/PronounQuizResult.vue`
- `src/modules/declension/CaseRecognitionSetup.vue`
- `src/modules/declension/CaseRecognitionRunner.vue`
- `tests/composables/usePagination.test.ts`
- `tests/data/pronouns.test.ts`
- `tests/data/case-recognition.test.ts`

**Modified:**
- `src/router.ts` — add `/version` route + 5 declension v2 routes
- `src/components/NavShell.vue` — version badge inline (desktop) and in drawer footer (mobile)
- `src/composables/useQuizHistory.ts` — extend `QuizHistoryType` with 2 new values
- `src/components/charts/quiz-type-labels.ts` — add labels for the new types
- `src/modules/history/HistoryPage.vue` — `QUIZ_TYPES` map + `typeOrder` extension + pagination on the table
- `src/composables/useUserData.ts` — 2 new setup keys
- `src/composables/useQuizStats.ts` — extend zero record factories
- `src/composables/useDeclensionQuiz.ts` — add `usePronounQuiz` + `useCaseRecognitionQuiz` + `checkPronoun` + `checkCasePick`
- `src/modules/declension/DeclensionHome.vue` — grow from 4 cards to 6
- `src/modules/nouns/ManageNouns.vue` — pagination on the table
- `src/modules/nouns/QuizResult.vue` — pagination on the result rows
- `src/modules/verbs/TranslationQuizResult.vue` — pagination on the result rows
- `src/modules/declension/TableQuizResult.vue` — pagination on the result rows
- `src/modules/declension/PronounQuizResult.vue` — pagination on the result rows
- `tests/composables/useUserData.test.ts` — assert new keys appear

**NOT touched:**
- `TranslationQuizRunner.vue` (verb worksheet) — single-view by design, no pagination
- All other quiz runner files — never paginated

---

## Tasks

### Task 1: Changelog + version constants

**Files:**
- Create: `src/data/changelog.ts`

- [ ] **Step 1: Implement**

```ts
// src/data/changelog.ts
// Version format: X.YY.ZZ
//   X  — major redesign (rarely changes)
//   YY — a new module added
//   ZZ — regular improvements / fixes
//
// Bump rule: prepend the new entry to CHANGELOG, set APP_VERSION to its version.

export const APP_VERSION = '1.07.00'

export type ChangelogKind = 'major' | 'module' | 'polish' | 'fix'

export interface ChangelogEntry {
  version: string
  date: string         // YYYY-MM-DD
  kind: ChangelogKind
  title: string
  notes: string[]      // each item is one bullet; supports inline HTML like <code> + <em>
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.07.00', date: '2026-05-24', kind: 'module',
    title: 'Declension v2 · Pronouns & Case recognition',
    notes: [
      'New pronoun-forms drill — produce all four case forms for personal, possessive, and reflexive pronouns (the same 4-row table layout as the decline-the-phrase quiz).',
      'New case-recognition drill — read a sentence with a highlighted noun phrase, pick the case it is in (single-card multiple choice).',
      'Declension landing now has 6 cards (was 4).'
    ]
  },
  {
    version: '1.06.04', date: '2026-05-24', kind: 'polish',
    title: 'Pagination across long lists',
    notes: [
      'Reusable <code>Pagination</code> component with page-size selector (10 / 25 / 50 / 100).',
      'Applied to: version changelog, Manage Nouns, History table, all result lists.',
      'The verb translation worksheet keeps the single-view layout — by design.'
    ]
  },
  {
    version: '1.06.03', date: '2026-05-24', kind: 'polish',
    title: 'Version page · changelog',
    notes: [
      'New About · Version page accessible from the nav header (badge) and the mobile drawer.',
      'Changelog seeded with the full design history.',
      'Each commit going forward bumps the patch (or higher) and lands here.'
    ]
  },
  {
    version: '1.06.02', date: '2026-05-24', kind: 'polish',
    title: 'Declension prompt-size slider',
    notes: [
      'Fourth slider in Settings · Display · Sizes for the declension drills.',
      'New <code>--decl-prompt-size</code> CSS variable wired into all three declension runners.'
    ]
  },
  {
    version: '1.06.01', date: '2026-05-24', kind: 'fix',
    title: 'Mobile UI overhaul',
    notes: [
      'No more horizontal scroll on any route — page max-width 100% with min-width: 0 cascade.',
      'Settings rail is a 2×2 card grid on mobile (was a horizontal-scrolling pill strip).',
      'Two-line CTA buttons on long action labels.',
      'Continuous quiz-meter for runs with more than 25 questions.',
      'Noun + verb result pages redesigned with red/green row stamps.'
    ]
  },
  {
    version: '1.06.00', date: '2026-05-24', kind: 'module',
    title: 'Declension module',
    notes: [
      'Three drills: decline-the-phrase (4-row case table), article-in-context, adjective endings.',
      '190 curated examples across A1–B2 (30 tables + 80 article-fill + 80 adjective endings).',
      'Tables-reference page with the six canonical declension tables.'
    ]
  },
  {
    version: '1.05.01', date: '2026-05-24', kind: 'polish',
    title: 'Keyboard shortcuts in Prepositions · which-case',
    notes: [
      'Press <code>1</code>–<code>4</code> to pick the case for the focused row.',
      'Tab / Shift-Tab navigate between rows; case buttons are no longer in the tab order.'
    ]
  },
  {
    version: '1.05.00', date: '2026-05-24', kind: 'module',
    title: 'Prepositions module',
    notes: [
      '37 curated prepositions across A1–B2 with ~90 example sentences.',
      'Three drills: which-case (test-sheet), article-fill, two-way decision (acc vs dat).',
      'Browse table with case-colored tags.'
    ]
  },
  {
    version: '1.04.03', date: '2026-05-23', kind: 'polish',
    title: 'Quiz history · stats dashboard',
    notes: [
      '14 charts powered by ECharts: activity calendar, accuracy trend, cumulative progress, type distribution radar, etc.',
      'Editorial 3-panel summary row at the top of <code>/history</code>.',
      'Secondary stat strip with streak, best run, days active, avg duration, most-practiced type.'
    ]
  },
  {
    version: '1.04.02', date: '2026-05-23', kind: 'polish',
    title: 'Settings · Daten tab + tabbed layout',
    notes: [
      'Settings becomes a four-tab layout — API · Display · Palette · Data.',
      'JSON export/import for every preference, palette, and the full quiz history.'
    ]
  },
  {
    version: '1.04.01', date: '2026-05-22', kind: 'polish',
    title: 'Palette overrides per theme',
    notes: [
      'Settings · Farben lets you override each of the 12 design tokens, per-theme.',
      'JSON import &amp; export.'
    ]
  },
  {
    version: '1.04.00', date: '2026-05-22', kind: 'module',
    title: 'History module',
    notes: [
      'Quiz history records every completed run with score, duration, and per-question breakdown.',
      'Per-quiz-type filter; live-saved to localStorage capped at 100 entries.'
    ]
  },
  {
    version: '1.03.01', date: '2026-05-22', kind: 'polish',
    title: 'Verb-tip double-click + parenthetical acceptance',
    notes: [
      'Double-click any verb in the translation worksheet to swap it with a German tip.',
      'Acceptance strips <code>(…)</code> parentheticals so typing one word matches multi-meaning verbs.'
    ]
  },
  {
    version: '1.03.00', date: '2026-05-22', kind: 'module',
    title: 'Adjectives module',
    notes: [
      'Third vocabulary module — Gemini-generated sentence fill with the inflected adjective blanked.',
      'Group filters + case-aware acceptance.'
    ]
  },
  {
    version: '1.02.01', date: '2026-05-21', kind: 'polish',
    title: 'Conjugation cheatsheet + verb runner test-sheet',
    notes: [
      'Long-form verb cheatsheet — twelve chapters of conjugation tables, drop-caps, exception callouts.',
      'Verb translation moved to a worksheet layout (all-at-once submit).'
    ]
  },
  {
    version: '1.02.00', date: '2026-05-21', kind: 'module',
    title: 'Verbs module',
    notes: [
      '378 verbs across A1–B2 with full conjugations in 15 tenses.',
      'Translation drill + conjugation drill + browse table + cheatsheet.'
    ]
  },
  {
    version: '1.01.00', date: '2026-05-18', kind: 'module',
    title: 'Nouns module',
    notes: [
      'First vocabulary module — der/die/das gender drill + English translation drill.',
      '1407 curated nouns across 20 groups.'
    ]
  },
  {
    version: '1.00.00', date: '2026-05-17', kind: 'major',
    title: 'Grammatik-Atelier · initial release',
    notes: [
      'Editorial design system — Fraunces display, Source Serif 4 body, JetBrains Mono accents.',
      'Light + dark themes; sage/clay/ochre/cobalt accent palette.',
      'Vue 3 + TS + Vite scaffolding with IndexedDB-backed nouns/adjectives.'
    ]
  }
]
```

- [ ] **Step 2: Commit**

```bash
git add src/data/changelog.ts
git commit -m "feat(changelog): seed v1.00–v1.07 history + APP_VERSION constant

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: usePagination composable + tests

**Files:**
- Create: `src/composables/usePagination.ts`
- Create: `tests/composables/usePagination.test.ts`

TDD. The slice arithmetic + page-number generation have edge cases worth pinning down.

- [ ] **Step 1: Write failing tests**

```ts
// tests/composables/usePagination.test.ts
import { describe, test, expect } from 'vitest'
import { usePagination, buildPageList } from '../../src/composables/usePagination'

describe('buildPageList — compact page numbers with ellipses', () => {
  test('7 or fewer pages: full list', () => {
    expect(buildPageList(1, 1)).toEqual([1])
    expect(buildPageList(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(buildPageList(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
  test('many pages, current near start: 1, 2, 3, ..., last', () => {
    expect(buildPageList(1, 20)).toEqual([1, 2, '…', 20])
    expect(buildPageList(2, 20)).toEqual([1, 2, 3, '…', 20])
    expect(buildPageList(3, 20)).toEqual([1, 2, 3, 4, '…', 20])
  })
  test('many pages, current in middle: 1, ..., n-1, n, n+1, ..., last', () => {
    expect(buildPageList(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20])
  })
  test('many pages, current near end: 1, ..., n-2, n-1, n', () => {
    expect(buildPageList(20, 20)).toEqual([1, '…', 19, 20])
    expect(buildPageList(19, 20)).toEqual([1, '…', 18, 19, 20])
  })
})

describe('usePagination — reactive slice + paging', () => {
  test('empty array', () => {
    const p = usePagination(() => [], 10)
    expect(p.total.value).toBe(0)
    expect(p.totalPages.value).toBe(1)   // always at least 1
    expect(p.slice.value).toEqual([])
  })
  test('single page', () => {
    const p = usePagination(() => [1, 2, 3], 10)
    expect(p.total.value).toBe(3)
    expect(p.totalPages.value).toBe(1)
    expect(p.slice.value).toEqual([1, 2, 3])
    expect(p.start.value).toBe(0)
    expect(p.end.value).toBe(3)
  })
  test('exact multiple', () => {
    const items = Array.from({ length: 20 }, (_, i) => i)
    const p = usePagination(() => items, 10)
    expect(p.totalPages.value).toBe(2)
    expect(p.slice.value).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    p.setPage(2)
    expect(p.slice.value).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
  })
  test('partial last page', () => {
    const items = Array.from({ length: 23 }, (_, i) => i)
    const p = usePagination(() => items, 10)
    expect(p.totalPages.value).toBe(3)
    p.setPage(3)
    expect(p.slice.value).toEqual([20, 21, 22])
    expect(p.start.value).toBe(20)
    expect(p.end.value).toBe(23)
  })
  test('changing pageSize resets to page 1', () => {
    const items = Array.from({ length: 50 }, (_, i) => i)
    const p = usePagination(() => items, 10)
    p.setPage(4)
    expect(p.page.value).toBe(4)
    p.setPageSize(25)
    expect(p.page.value).toBe(1)
    expect(p.pageSize.value).toBe(25)
    expect(p.slice.value.length).toBe(25)
  })
  test('clamps page if items shrink', () => {
    let n = 50
    const p = usePagination(() => Array.from({ length: n }, (_, i) => i), 10)
    p.setPage(5)
    expect(p.page.value).toBe(5)
    n = 12 // shrink — only 2 pages left
    // The composable should return the effective page (clamped) via .page
    // Note: callers re-read p.slice.value after the source changes
    expect(p.slice.value.length).toBeLessThanOrEqual(10)
  })
})
```

- [ ] **Step 2: Run to verify failure**

`npx vitest run tests/composables/usePagination.test.ts` → module not found.

- [ ] **Step 3: Implement**

```ts
// src/composables/usePagination.ts
import { computed, ref, type ComputedRef, type Ref } from 'vue'

export type PageItem = number | '…'

/**
 * Compact page-number list with ellipses. Always includes first + last + (current ± 1).
 * If total ≤ 7, returns every page.
 */
export function buildPageList(current: number, total: number): PageItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const out: PageItem[] = [1]
  if (current > 3) out.push('…')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) out.push(i)
  if (current < total - 2) out.push('…')
  out.push(total)
  return out
}

export interface PaginationApi<T> {
  page: Ref<number>
  pageSize: Ref<number>
  setPage: (n: number) => void
  setPageSize: (n: number) => void
  total: ComputedRef<number>
  totalPages: ComputedRef<number>
  start: ComputedRef<number>
  end: ComputedRef<number>
  slice: ComputedRef<T[]>
  pageList: ComputedRef<PageItem[]>
}

export function usePagination<T>(
  source: () => readonly T[] | T[],
  defaultPageSize = 10
): PaginationApi<T> {
  const page = ref(1)
  const pageSize = ref(defaultPageSize)

  const items = computed(() => source())
  const total = computed(() => items.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  // Effective (clamped) page — the source might shrink between renders.
  const safePage = computed(() => Math.min(Math.max(1, page.value), totalPages.value))
  const start = computed(() => (safePage.value - 1) * pageSize.value)
  const end = computed(() => Math.min(start.value + pageSize.value, total.value))
  const slice = computed(() => items.value.slice(start.value, end.value))
  const pageList = computed(() => buildPageList(safePage.value, totalPages.value))

  function setPage(n: number) {
    page.value = Math.min(Math.max(1, n), totalPages.value)
  }
  function setPageSize(n: number) {
    pageSize.value = Math.max(1, n)
    page.value = 1
  }

  // Expose the safePage as `page` to callers (it auto-clamps).
  return {
    page: computed(() => safePage.value) as unknown as Ref<number>,
    pageSize,
    setPage,
    setPageSize,
    total,
    totalPages,
    start,
    end,
    slice,
    pageList
  }
}
```

- [ ] **Step 4: Run + commit**

```bash
npx vitest run tests/composables/usePagination.test.ts
# expect: all green
npm run typecheck
git add src/composables/usePagination.ts tests/composables/usePagination.test.ts
git commit -m "feat(pagination): usePagination composable + tests (1.06.04)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Pagination.vue component

**Files:**
- Create: `src/components/Pagination.vue`

- [ ] **Step 1: Implement**

```vue
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
</script>

<template>
  <nav v-if="pagination.total.value > 0"
       class="pagination"
       :aria-label="`Pagination · ${label}`">
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
      <button class="pg-arrow"
              :disabled="pagination.page.value === 1"
              aria-label="Previous page"
              @click="pagination.setPage(pagination.page.value - 1)">
        ‹ Prev
      </button>

      <template v-for="(p, i) in pagination.pageList.value" :key="typeof p === 'number' ? p : `el-${i}`">
        <span v-if="p === '…'" class="pg-ellipsis" aria-hidden="true">…</span>
        <button
          v-else
          class="pg-num"
          :class="{ active: p === pagination.page.value }"
          :aria-current="p === pagination.page.value ? 'page' : undefined"
          :aria-label="`Page ${p}`"
          @click="pagination.setPage(p as number)"
        >{{ p }}</button>
      </template>

      <button class="pg-arrow"
              :disabled="pagination.page.value === pagination.totalPages.value"
              aria-label="Next page"
              @click="pagination.setPage(pagination.page.value + 1)">
        Next ›
      </button>
    </div>

    <div v-if="pagination.total.value > hidePageSizeBelow" class="pg-size">
      <label class="pg-size-label" for="pg-size-select">Per page</label>
      <select id="pg-size-select"
              class="pg-size-select"
              :value="pagination.pageSize.value"
              @change="pagination.setPageSize(parseInt(($event.target as HTMLSelectElement).value, 10))">
        <option v-for="o in pageSizeOptions" :key="o" :value="o">{{ o }}</option>
      </select>
    </div>
  </nav>
</template>
```

- [ ] **Step 2: Append the pagination CSS to `src/styles/tokens.css`**

Copy the `.pagination` block (and its 720px media query) from the design's `docs/design_handoff_german_trainer/styles.css` (lines 2375–2553) verbatim to the end of `src/styles/tokens.css`.

- [ ] **Step 3: Commit**

```bash
git add src/components/Pagination.vue src/styles/tokens.css
git commit -m "feat(pagination): Pagination.vue component + CSS (1.06.04)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: VersionPage + VersionBadge + nav wiring

**Files:**
- Create: `src/modules/version/VersionPage.vue`
- Create: `src/components/VersionBadge.vue`
- Modify: `src/router.ts`
- Modify: `src/components/NavShell.vue`
- Append: `src/styles/tokens.css` (version-* + version-badge styles)

- [ ] **Step 1: VersionBadge.vue**

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { APP_VERSION } from '../data/changelog'

defineProps<{ variant?: 'header' | 'drawer' }>()

const router = useRouter()
function open() { router.push({ name: 'version' }) }
</script>

<template>
  <button
    v-if="variant === 'drawer'"
    class="version-badge version-badge-drawer"
    :aria-label="`Version ${APP_VERSION} — view changelog`"
    @click="open"
  >
    <span class="vb-prefix">v</span>
    <span class="vb-num">{{ APP_VERSION }}</span>
    <span class="vb-arrow" aria-hidden="true">→</span>
  </button>
  <button
    v-else
    class="version-badge"
    :aria-label="`Version ${APP_VERSION} — view changelog`"
    :title="`Version ${APP_VERSION} — view changelog`"
    @click="open"
  >
    <span class="vb-prefix">v</span>
    <span class="vb-num">{{ APP_VERSION }}</span>
  </button>
</template>
```

- [ ] **Step 2: VersionPage.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { APP_VERSION, CHANGELOG } from '../../data/changelog'
import { usePagination } from '../../composables/usePagination'
import Pagination from '../../components/Pagination.vue'

const router = useRouter()
const [major, minor, patch] = APP_VERSION.split('.').map(s => parseInt(s, 10))

const pagination = usePagination(() => CHANGELOG, 10)
</script>

<template>
  <div class="page version-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Über · About</div>
        <h1 class="section-title">Versionen<em>.</em></h1>
        <p class="section-subtitle">
          A running ledger of changes — modules added, polish, the occasional course-correction.
        </p>
      </div>
      <button class="btn btn-ghost" type="button" @click="router.push({ name: 'home' })">← Home</button>
    </header>

    <article class="version-masthead">
      <div class="vm-label">Currently running</div>
      <div class="vm-num">
        <span class="vm-part vm-major">{{ major }}</span>
        <span class="vm-dot">.</span>
        <span class="vm-part vm-minor">{{ String(minor).padStart(2, '0') }}</span>
        <span class="vm-dot">.</span>
        <span class="vm-part vm-patch">{{ String(patch).padStart(2, '0') }}</span>
      </div>
    </article>

    <Pagination :pagination="pagination" label="releases" />

    <ol class="version-list">
      <li v-for="entry in pagination.slice.value" :key="entry.version"
          class="version-entry"
          :class="[`kind-${entry.kind}`, { 'is-current': entry.version === APP_VERSION }]">
        <div class="ve-meta">
          <div class="ve-version">
            <span class="ve-v">v</span>
            <span class="ve-num">
              <template v-for="(part, i) in entry.version.split('.')" :key="i">
                <span v-if="i > 0" class="ve-dot">.</span>
                <span :class="i === 0 ? 've-major' : i === 1 ? 've-minor' : 've-patch'">{{ part }}</span>
              </template>
            </span>
          </div>
          <div class="ve-date">{{ entry.date }}</div>
          <div class="ve-kind">{{ entry.kind }}</div>
          <div v-if="entry.version === APP_VERSION" class="ve-current-mark">● now</div>
        </div>
        <div class="ve-body">
          <h3 class="ve-title">{{ entry.title }}</h3>
          <ul class="ve-notes">
            <li v-for="(n, j) in entry.notes" :key="j" v-html="n" />
          </ul>
        </div>
      </li>
    </ol>

    <Pagination v-if="pagination.totalPages.value > 1" :pagination="pagination" label="releases" />

    <div class="version-footer">
      <p>
        Each commit bumps the version: <code>X</code> for a major redesign,
        <code>YY</code> for a new module, <code>ZZ</code> for everything else.
        The summary lands here on the next deploy.
      </p>
    </div>
  </div>
</template>

<style scoped>
.version-page { max-width: 880px; }
</style>
```

- [ ] **Step 3: Add the route**

In `src/router.ts`, insert before the existing settings route:

```ts
{ path: '/version', name: 'version', component: () => import('./modules/version/VersionPage.vue') },
```

- [ ] **Step 4: Wire VersionBadge into NavShell**

In `src/components/NavShell.vue`:
- Add `import VersionBadge from './VersionBadge.vue'` at the top.
- In the desktop nav actions (next to the theme toggle and burger), add `<VersionBadge variant="header" />` before the theme toggle.
- In the mobile drawer (after the last nav-link, before the closing tag), add `<VersionBadge variant="drawer" />`.

- [ ] **Step 5: Append version-* CSS to tokens.css**

Copy lines 2555–2913 from `docs/design_handoff_german_trainer/styles.css` (the entire "Version badge + Version page" block plus the responsive 720px overrides) verbatim into `src/styles/tokens.css`.

- [ ] **Step 6: Commit**

```bash
npm run typecheck
# expect: clean
git add src/modules/version/VersionPage.vue src/components/VersionBadge.vue src/router.ts src/components/NavShell.vue src/styles/tokens.css
git commit -m "feat(version): About · Version page + nav badge (1.06.03)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Apply pagination to Manage Nouns

**Files:**
- Modify: `src/modules/nouns/ManageNouns.vue`

- [ ] **Step 1: Import + wrap the filtered nouns in usePagination**

```ts
import { usePagination } from '../../composables/usePagination'
import Pagination from '../../components/Pagination.vue'

// ... existing code ...

const pagination = usePagination(() => filteredNouns.value, 25)
```

- [ ] **Step 2: Update the template**

Render `<Pagination :pagination="pagination" label="nouns" />` above AND below the table. Replace the table's `v-for` source from `filteredNouns` to `pagination.slice.value`.

- [ ] **Step 3: Commit**

```bash
npm run typecheck
git add src/modules/nouns/ManageNouns.vue
git commit -m "feat(nouns): pagination on Manage table (1.06.04 part 1)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Apply pagination to HistoryPage

**Files:**
- Modify: `src/modules/history/HistoryPage.vue`

- [ ] **Step 1: Import + wrap filtered history**

```ts
import { usePagination } from '../../composables/usePagination'
import Pagination from '../../components/Pagination.vue'

const pagination = usePagination(() => filtered.value, 25)
```

- [ ] **Step 2: Update the template**

Render `<Pagination :pagination="pagination" label="runs" />` above the table (after the filter chips). Replace the table body's `v-for="it in filtered"` with `v-for="it in pagination.slice.value"`. Mirror in the mobile card list.

- [ ] **Step 3: Commit**

```bash
git add src/modules/history/HistoryPage.vue
git commit -m "feat(history): pagination on quiz history table (1.06.04 part 2)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Apply pagination to result lists

**Files:**
- Modify: `src/modules/nouns/QuizResult.vue`
- Modify: `src/modules/verbs/TranslationQuizResult.vue`
- Modify: `src/modules/declension/TableQuizResult.vue`

- [ ] **Step 1: For each file, wrap the questions/graded array in usePagination and render the Pagination component above the result list**

Pattern (NounQuizResult example):
```ts
const pagination = usePagination(() => props.questions, 25)
```

Template change:
```html
<Pagination :pagination="pagination" label="rows" :hide-page-size-below="25" />
<div class="verb-result-list">
  <div v-for="(q, i) in pagination.slice.value" :key="i" ...>
```

When using `start` to label row numbers (`# 01.`, `# 02.`, etc.), update to `String(pagination.start.value + i + 1).padStart(2, '0')` so numbering survives page changes.

Apply the same shape to `TranslationQuizResult.vue` (`data.graded`) and `TableQuizResult.vue` (`data.questions`).

- [ ] **Step 2: Commit each in turn (or all at once)**

```bash
git add src/modules/nouns/QuizResult.vue src/modules/verbs/TranslationQuizResult.vue src/modules/declension/TableQuizResult.vue
git commit -m "feat(results): pagination on result-row lists (1.06.04 part 3)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Pronoun dataset

**Files:**
- Create: `src/data/pronouns.ts`
- Create: `tests/data/pronouns.test.ts`

Three pronoun categories: personal, possessive, reflexive. Each entry is one "lemma" (e.g. `ich`, `mein`, `sich`) plus its full case table.

- [ ] **Step 1: Schema + dataset**

```ts
// src/data/pronouns.ts
import type { DeclCase } from './declension'

export type PronounCategory = 'personal' | 'possessive' | 'reflexive'

export interface PronounEntry {
  id: string
  category: PronounCategory
  /** Nominative dictionary form, also the prompt headline. */
  nominative: string
  /** Optional English gloss for the result page. */
  english?: string
  /** Optional German person/number label, shown as meta on the prompt card. */
  meta?: string
  /** Reflexives have no nominative or genitive; absent forms are stored as empty strings. */
  forms: Record<DeclCase, string>
}

export const PRONOUN_CATEGORIES = ['personal', 'possessive', 'reflexive'] as const

export const PRONOUNS: PronounEntry[] = [
  // ── Personal pronouns (9) ──────────────────────────────────
  { id: 'pers-ich', category: 'personal', nominative: 'ich', english: 'I', meta: '1st person singular',
    forms: { nominative: 'ich', accusative: 'mich', dative: 'mir', genitive: 'meiner' } },
  { id: 'pers-du', category: 'personal', nominative: 'du', english: 'you (sg, informal)', meta: '2nd person singular',
    forms: { nominative: 'du', accusative: 'dich', dative: 'dir', genitive: 'deiner' } },
  { id: 'pers-er', category: 'personal', nominative: 'er', english: 'he', meta: '3rd person singular masculine',
    forms: { nominative: 'er', accusative: 'ihn', dative: 'ihm', genitive: 'seiner' } },
  { id: 'pers-sie-s', category: 'personal', nominative: 'sie', english: 'she', meta: '3rd person singular feminine',
    forms: { nominative: 'sie', accusative: 'sie', dative: 'ihr', genitive: 'ihrer' } },
  { id: 'pers-es', category: 'personal', nominative: 'es', english: 'it', meta: '3rd person singular neuter',
    forms: { nominative: 'es', accusative: 'es', dative: 'ihm', genitive: 'seiner' } },
  { id: 'pers-wir', category: 'personal', nominative: 'wir', english: 'we', meta: '1st person plural',
    forms: { nominative: 'wir', accusative: 'uns', dative: 'uns', genitive: 'unser' } },
  { id: 'pers-ihr', category: 'personal', nominative: 'ihr', english: 'you (pl, informal)', meta: '2nd person plural',
    forms: { nominative: 'ihr', accusative: 'euch', dative: 'euch', genitive: 'euer' } },
  { id: 'pers-sie-pl', category: 'personal', nominative: 'sie', english: 'they', meta: '3rd person plural',
    forms: { nominative: 'sie', accusative: 'sie', dative: 'ihnen', genitive: 'ihrer' } },
  { id: 'pers-Sie', category: 'personal', nominative: 'Sie', english: 'you (formal)', meta: 'formal address',
    forms: { nominative: 'Sie', accusative: 'Sie', dative: 'Ihnen', genitive: 'Ihrer' } },

  // ── Reflexive pronouns (2) ─────────────────────────────────
  // Two genuine reflexive variants — 1st/2nd person share with the personal pronouns'
  // accusative/dative forms, but 3rd person (singular AND plural) uses 'sich'.
  { id: 'refl-sich', category: 'reflexive', nominative: 'sich', english: 'himself/herself/itself/themselves',
    meta: '3rd person reflexive',
    // Reflexives have no nominative or genitive — display dashes
    forms: { nominative: '—', accusative: 'sich', dative: 'sich', genitive: '—' } },
  { id: 'refl-uns', category: 'reflexive', nominative: 'uns', english: 'ourselves',
    meta: '1st person plural reflexive',
    forms: { nominative: '—', accusative: 'uns', dative: 'uns', genitive: '—' } },

  // ── Possessive pronouns (6) ────────────────────────────────
  // Standalone possessive forms — masculine nominative as the lemma.
  // (Other genders shown separately; we drill these as standalone — different from the
  // determiner-style possessives in the existing decline-the-phrase quiz.)
  { id: 'poss-meiner', category: 'possessive', nominative: 'meiner', english: 'mine (m. nom.)',
    meta: 'standalone possessive · masculine',
    forms: { nominative: 'meiner', accusative: 'meinen', dative: 'meinem', genitive: 'meines' } },
  { id: 'poss-deiner', category: 'possessive', nominative: 'deiner', english: 'yours (m. nom.)',
    meta: 'standalone possessive · masculine',
    forms: { nominative: 'deiner', accusative: 'deinen', dative: 'deinem', genitive: 'deines' } },
  { id: 'poss-seiner', category: 'possessive', nominative: 'seiner', english: 'his / its (m. nom.)',
    meta: 'standalone possessive · masculine',
    forms: { nominative: 'seiner', accusative: 'seinen', dative: 'seinem', genitive: 'seines' } },
  { id: 'poss-ihrer', category: 'possessive', nominative: 'ihrer', english: 'hers / theirs (m. nom.)',
    meta: 'standalone possessive · masculine',
    forms: { nominative: 'ihrer', accusative: 'ihren', dative: 'ihrem', genitive: 'ihres' } },
  { id: 'poss-unserer', category: 'possessive', nominative: 'unserer', english: 'ours (m. nom.)',
    meta: 'standalone possessive · masculine',
    forms: { nominative: 'unserer', accusative: 'unseren', dative: 'unserem', genitive: 'unseres' } },
  { id: 'poss-eurer', category: 'possessive', nominative: 'eurer', english: 'yours (pl, m. nom.)',
    meta: 'standalone possessive · masculine',
    forms: { nominative: 'eurer', accusative: 'euren', dative: 'eurem', genitive: 'eures' } }
]
```

Total: **17 pronoun entries**. Small but covers the high-value forms.

- [ ] **Step 2: Data integrity tests**

```ts
// tests/data/pronouns.test.ts
import { describe, test, expect } from 'vitest'
import { PRONOUNS, PRONOUN_CATEGORIES } from '../../src/data/pronouns'
import { DECL_CASES } from '../../src/data/declension'

describe('pronouns dataset', () => {
  test('unique ids', () => {
    const ids = PRONOUNS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  test('every entry has all 4 case forms (including reflexive dashes)', () => {
    for (const p of PRONOUNS) {
      for (const c of DECL_CASES) {
        expect(p.forms[c], `${p.id} missing ${c}`).toBeTruthy()
      }
    }
  })
  test('reflexive entries have — in nominative and genitive', () => {
    for (const p of PRONOUNS) {
      if (p.category === 'reflexive') {
        expect(p.forms.nominative).toBe('—')
        expect(p.forms.genitive).toBe('—')
      }
    }
  })
  test('every category value is valid', () => {
    const valid = new Set<string>(PRONOUN_CATEGORIES)
    for (const p of PRONOUNS) expect(valid.has(p.category)).toBe(true)
  })
})
```

- [ ] **Step 3: Run + commit**

```bash
npx vitest run tests/data/pronouns.test.ts
# expect: all green
git add src/data/pronouns.ts tests/data/pronouns.test.ts
git commit -m "feat(pronouns): dataset + integrity tests (17 entries) — 1.07.00 prep

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Case-recognition dataset

**Files:**
- Create: `src/data/case-recognition.ts`
- Create: `tests/data/case-recognition.test.ts`

Each entry is one sentence with a noun-phrase span highlighted; the user picks which case that phrase is in.

- [ ] **Step 1: Schema + ~40 entries**

```ts
// src/data/case-recognition.ts
import type { DeclCase, DeclLevel } from './declension'

export interface CaseRecognitionEntry {
  id: string
  level: DeclLevel
  /** Full sentence. */
  sentence: string
  /** The noun-phrase span the user must classify — appears verbatim in `sentence`. */
  phrase: string
  /** The correct case. */
  case: DeclCase
  /** English gloss for the result page. */
  gloss: string
  /** Brief rule explanation shown in feedback. */
  rationale: string
}

export const CASE_RECOGNITION_ENTRIES: CaseRecognitionEntry[] = [
  { id: 'cr-nom-001', level: 'A1', sentence: 'Der Hund schläft.', phrase: 'Der Hund', case: 'nominative',
    gloss: 'The dog is sleeping.', rationale: 'Nominativ — subject of schlafen.' },
  { id: 'cr-acc-001', level: 'A1', sentence: 'Ich sehe den Hund.', phrase: 'den Hund', case: 'accusative',
    gloss: 'I see the dog.', rationale: 'Akkusativ — direct object of sehen.' },
  { id: 'cr-dat-001', level: 'A1', sentence: 'Ich gebe dem Mann das Buch.', phrase: 'dem Mann', case: 'dative',
    gloss: 'I give the book to the man.', rationale: 'Dativ — indirect object of geben.' },
  { id: 'cr-gen-001', level: 'B1', sentence: 'Das Auto des Vaters ist neu.', phrase: 'des Vaters', case: 'genitive',
    gloss: "The father's car is new.", rationale: 'Genitiv — possession.' }
  // …populate ~36 more across cases × levels…
]
```

**Distribution target:** ~10 nominative · ~10 accusative · ~12 dative · ~8 genitive. Mix of A1–B2.

**Constraints (asserted by tests):**
- `phrase` appears VERBATIM in `sentence` (case-sensitive substring match)
- `phrase` appears EXACTLY ONCE in `sentence` (so the highlight renderer can replace it unambiguously)
- `rationale` non-empty

- [ ] **Step 2: Data integrity tests**

```ts
// tests/data/case-recognition.test.ts
import { describe, test, expect } from 'vitest'
import { CASE_RECOGNITION_ENTRIES } from '../../src/data/case-recognition'
import { DECL_CASES, DECL_LEVELS } from '../../src/data/declension'

describe('case-recognition entries', () => {
  test('unique ids', () => {
    const ids = CASE_RECOGNITION_ENTRIES.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  test('phrase appears verbatim in sentence', () => {
    for (const e of CASE_RECOGNITION_ENTRIES) {
      expect(e.sentence.includes(e.phrase), `${e.id}: "${e.phrase}" not in "${e.sentence}"`).toBe(true)
    }
  })
  test('phrase appears exactly once', () => {
    for (const e of CASE_RECOGNITION_ENTRIES) {
      const count = e.sentence.split(e.phrase).length - 1
      expect(count, `${e.id}: "${e.phrase}" appears ${count}x`).toBe(1)
    }
  })
  test('rationale is non-empty', () => {
    for (const e of CASE_RECOGNITION_ENTRIES) {
      expect(e.rationale.trim().length, `${e.id}: empty rationale`).toBeGreaterThan(0)
    }
  })
  test('valid enum values', () => {
    const cases = new Set<string>(DECL_CASES)
    const levels = new Set<string>(DECL_LEVELS)
    for (const e of CASE_RECOGNITION_ENTRIES) {
      expect(cases.has(e.case)).toBe(true)
      expect(levels.has(e.level)).toBe(true)
    }
  })
})
```

- [ ] **Step 3: Run + commit**

```bash
npx vitest run tests/data/case-recognition.test.ts
git add src/data/case-recognition.ts tests/data/case-recognition.test.ts
git commit -m "feat(case-recognition): dataset + integrity tests (40 entries) — 1.07.00 prep

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Composables — pronoun + case recognition + history wiring

**Files:**
- Modify: `src/composables/useDeclensionQuiz.ts`
- Modify: `src/composables/useQuizHistory.ts`
- Modify: `src/components/charts/quiz-type-labels.ts`
- Modify: `src/modules/history/HistoryPage.vue`
- Modify: `src/composables/useUserData.ts`
- Modify: `src/composables/useQuizStats.ts`
- Modify: `tests/composables/useUserData.test.ts`

- [ ] **Step 1: Add composables to `useDeclensionQuiz.ts`**

```ts
// (append to src/composables/useDeclensionQuiz.ts)
import type { PronounEntry } from '../data/pronouns'
import type { CaseRecognitionEntry } from '../data/case-recognition'

// Reuse normalize() + checkForm() already in the file.

export function checkPronoun(input: string, expected: string): boolean {
  // Reflexive dashes are not graded — caller skips those rows.
  if (expected === '—') return false
  return checkForm(input, expected, [])
}

export function checkCasePick(picked: DeclCase | null, expected: DeclCase): boolean {
  return picked === expected
}

export interface PronounRowResult {
  case: DeclCase
  expected: string
  userAnswer: string
  isCorrect: boolean
  /** Reflexive nom/gen cells are not graded — UI shows the dash + no input. */
  skipped: boolean
}

export interface PronounQuestion {
  entry: PronounEntry
  rows: PronounRowResult[]
  correctCount: number
  totalCount: number    // counts only non-skipped rows
  submitted: boolean
}

export function usePronounQuiz(entries: PronounEntry[]) {
  const questions = ref<PronounQuestion[]>(
    entries.map(e => {
      const rows: PronounRowResult[] = DECL_CASES.map(c => {
        const expected = e.forms[c]
        const skipped = expected === '—'
        return { case: c, expected, userAnswer: '', isCorrect: false, skipped }
      })
      return {
        entry: e,
        rows,
        correctCount: 0,
        totalCount: rows.filter(r => !r.skipped).length,
        submitted: false
      }
    })
  )
  const currentIndex = ref(0)

  function submit(answers: string[]) {
    const q = questions.value[currentIndex.value]
    if (!q) return
    let correct = 0
    q.rows.forEach((row, i) => {
      if (row.skipped) return
      const userAnswer = answers[i] ?? ''
      const ok = checkPronoun(userAnswer, row.expected)
      row.userAnswer = userAnswer
      row.isCorrect = ok
      if (ok) correct++
    })
    q.correctCount = correct
    q.submitted = true
  }
  function advance() { currentIndex.value += 1 }
  function skip() {
    submit(new Array(DECL_CASES.length).fill(''))
    advance()
  }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const totalRows = computed(() => questions.value.reduce((s, q) => s + q.totalCount, 0))
  const correctRows = computed(() => questions.value.reduce((s, q) => s + q.correctCount, 0))

  return { questions, currentIndex, current, finished, total, totalRows, correctRows, submit, advance, skip }
}

export interface CaseRecognitionQuestion {
  entry: CaseRecognitionEntry
  picked: DeclCase | null
  isCorrect: boolean | null
}

export function useCaseRecognitionQuiz(entries: CaseRecognitionEntry[]) {
  const questions = ref<CaseRecognitionQuestion[]>(
    entries.map(e => ({ entry: e, picked: null, isCorrect: null }))
  )
  const currentIndex = ref(0)

  function pick(value: DeclCase) {
    const q = questions.value[currentIndex.value]
    if (!q || q.picked !== null) return    // one-shot per question
    q.picked = value
    q.isCorrect = checkCasePick(value, q.entry.case)
  }
  function advance() { currentIndex.value += 1 }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  return { questions, currentIndex, current, finished, pick, advance, score, total }
}
```

- [ ] **Step 2: Extend QuizHistoryType + Meta**

In `src/composables/useQuizHistory.ts`:

```ts
export type QuizHistoryType =
  | 'noun-gender' | 'noun-translation' | 'adjective'
  | 'verb-translation' | 'verb-conjugation'
  | 'prep-case' | 'prep-article' | 'prep-two-way'
  | 'decl-table' | 'decl-article' | 'decl-adjective'
  | 'decl-pronoun'           // NEW
  | 'decl-case-recognition'  // NEW
```

Extend `QuizHistoryMeta`:

```ts
declPronounCategories?: string[]
declCRLevels?: string[]
declCRCases?: string[]
```

- [ ] **Step 3: Extend labels**

Add to `QUIZ_TYPE_LABEL`, `QUIZ_TYPE_DE`, and `QUIZ_TYPES_ORDER` in `quiz-type-labels.ts`:

```ts
'decl-pronoun': 'Declension · pronouns'
'decl-case-recognition': 'Declension · case ID'

// DE
'decl-pronoun': 'Deklination · Pronomen'
'decl-case-recognition': 'Deklination · Kasus erkennen'

// Order — append both
```

- [ ] **Step 4: Extend HistoryPage QUIZ_TYPES + typeOrder + zeroRunsByType + zeroAccuracyByType + USER_DATA_KEYS**

Mirror the prep/decl pattern from previous tasks. Add:
- 2 entries to `QUIZ_TYPES` map
- 2 to `typeOrder`
- 2 to both zero record factories
- 2 to `USER_DATA_KEYS` (`declPronounSetup`, `declCRSetup`)
- 2 to `KEY_LABELS`
- 1 to the userdata test asserting the keys round-trip

- [ ] **Step 5: Commit**

```bash
npm run typecheck
# expect 4 TS2307 errors (the 4 .vue files for the new quizzes — built in tasks 12-14)
git add -A
git commit -m "feat(declension): pronoun + case-recognition quiz composables + wiring (1.07.00 prep)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Add 5 routes + grow DeclensionHome to 6 cards

**Files:**
- Modify: `src/router.ts`
- Modify: `src/modules/declension/DeclensionHome.vue`

- [ ] **Step 1: Add 5 routes**

After the existing declension routes in `src/router.ts`, insert:

```ts
{ path: '/declension/pronoun-quiz', name: 'declension-pronoun',
  component: () => import('./modules/declension/PronounQuizSetup.vue') },
{ path: '/declension/pronoun-quiz/run', name: 'declension-pronoun-run',
  component: () => import('./modules/declension/PronounQuizRunner.vue') },
{ path: '/declension/pronoun-quiz/result', name: 'declension-pronoun-result',
  component: () => import('./modules/declension/PronounQuizResult.vue') },
{ path: '/declension/case-recognition', name: 'declension-cr',
  component: () => import('./modules/declension/CaseRecognitionSetup.vue') },
{ path: '/declension/case-recognition/run', name: 'declension-cr-run',
  component: () => import('./modules/declension/CaseRecognitionRunner.vue') },
```

- [ ] **Step 2: Update DeclensionHome.vue**

Grow the `cards` array from 4 to 6 entries:

```ts
const cards: Card[] = [
  { numeral: 'A', route: 'declension-tables', /* … (unchanged) */ },
  { numeral: 'B', route: 'declension-table', /* … (unchanged) */ },
  { numeral: 'C', route: 'declension-article', /* … (unchanged) */ },
  { numeral: 'D', route: 'declension-adj', /* … (unchanged) */ },
  { numeral: 'E', route: 'declension-pronoun',
    title: 'Pronoun forms', de: 'Pronomen',
    desc: 'Produce all four case forms for personal, possessive, and reflexive pronouns.',
    cta: 'Start' },
  { numeral: 'F', route: 'declension-cr',
    title: 'Recognize the case', de: 'Kasus erkennen',
    desc: 'Read a sentence with a highlighted noun phrase, pick the case it is in.',
    cta: 'Start' }
]
```

- [ ] **Step 3: Commit**

```bash
git add src/router.ts src/modules/declension/DeclensionHome.vue
git commit -m "feat(declension): 5 routes + grow landing to 6 cards (1.07.00 prep)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Pronoun quiz (setup + runner + result)

**Files:**
- Create: `src/modules/declension/PronounQuizSetup.vue`
- Create: `src/modules/declension/PronounQuizRunner.vue`
- Create: `src/modules/declension/PronounQuizResult.vue`

Setup spec — chip filters for `category` (personal / possessive / reflexive), count picker (10/15/20/all/custom). Setup memory under `declPronounSetup`. Use `PRONOUNS.filter(p => categories.includes(p.category))` for the pool.

Runner spec — clone `TableQuizRunner.vue` (the decline-the-phrase runner) almost verbatim. Swap:
- `useTableQuiz` → `usePronounQuiz`
- Dataset filtering: by `category` instead of `determiner + gender`
- Prompt headline: `entry.nominative` + `entry.meta` line
- Per-row rendering: when `row.skipped === true`, render `—` instead of an input (reflexive nom/gen)
- History type: `'decl-pronoun'`, meta: `declPronounCategories`

Result spec — clone `TableQuizResult.vue`. Apply pagination via Task 7's pattern. Show skipped rows as `—` with no stamp.

- [ ] **Step 1–3: build the three files, mirroring the table-quiz pattern**

- [ ] **Step 4: Smoke test + commit**

```bash
npm run typecheck
# expect 2 TS2307 errors (case-recognition pair)
git add src/modules/declension/PronounQuiz*.vue
git commit -m "feat(declension): pronoun forms quiz (1.07.00 part 1)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Case-recognition quiz (setup + runner)

**Files:**
- Create: `src/modules/declension/CaseRecognitionSetup.vue`
- Create: `src/modules/declension/CaseRecognitionRunner.vue`

Setup spec — chip filters for `level` + `case` (allows the user to drill specific cases). Count picker. Setup memory under `declCRSetup`.

Runner spec — single-card per sentence with INLINE result (no separate result page; reuse the pattern from preposition/case quiz). Card layout:

```
┌──────────────────────────────────────────┐
│  KAPITEL V · KASUS ERKENNEN              │   Frage 3 / 10   [End]
│                                          │
│  Ich gebe [dem Mann] das Buch.           │   ← phrase highlighted in accent
│  → "I give the book to the man."         │
│                                          │
│  [ NOM ] [ AKK ] [ DAT ] [ GEN ]         │   ← 4-button picker; 1/2/3/4 hotkeys
│                                          │
│  ✓ Richtig — Dativ.                      │
│  Dativ — indirect object of geben.       │   ← rationale shown after pick
│                                          │
│                          [ Next →  ]     │
└──────────────────────────────────────────┘
```

Key behaviors:
- Pick by click OR by pressing `1`–`4`
- After pick: button stays selected; correct button gets sage tint; if user picked wrong, BOTH the picked button (red) and the correct button (green) are styled
- Tab moves to Next (not between buttons)
- Auto-focus the card on mount so keyboard nav works immediately
- On finish, save history (type `'decl-case-recognition'`, meta with `declCRLevels` + `declCRCases`) and render inline result list

Use `useCaseRecognitionQuiz` from `useDeclensionQuiz`.

- [ ] **Step 1: Setup**

Standard chip-filter pattern.

- [ ] **Step 2: Runner**

Build the card layout. For the highlighted phrase, render:

```html
<span class="cr-sentence">{{ before }}<mark class="cr-phrase">{{ phrase }}</mark>{{ after }}</span>
```

where `before` and `after` are computed from `sentence.split(phrase)`.

Hotkey listener — attach on `document` while runner is mounted, detach on unmount; pressing `1`/`2`/`3`/`4` picks the corresponding case (in order: nom, acc, dat, gen).

- [ ] **Step 3: Smoke test + commit**

```bash
npm run typecheck
# expect 0 errors
git add src/modules/declension/CaseRecognition*.vue
git commit -m "feat(declension): case-recognition quiz with keyboard shortcuts (1.07.00 part 2)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Verify + deploy

- [ ] **Step 1: Typecheck** — `npm run typecheck` → clean
- [ ] **Step 2: Tests** — `npm test` → expect ~290 (267 + 18 pagination + 4 pronoun + 5 case-recognition + 1 userdata)
- [ ] **Step 3: Build** — `npm run build` → succeeds
- [ ] **Step 4: Deploy** — `npm run deploy` + `git checkout -- dist/`
- [ ] **Step 5: Final smoke test on the deployed site**
  - Open `/version` — see the v1.07.00 entry pinned at top, masthead, pagination controls
  - Open `/nouns/manage` — pagination above and below, page-size selector works, search updates the count
  - Open `/history` — pagination on the table; old runs paginated correctly
  - Run a quiz, finish it, see the new pagination on the result rows
  - Open `/declension` — 6 cards
  - Run a pronoun quiz with 5 entries — verify reflexive rows show `—` instead of input
  - Run a case-recognition quiz — verify `1`/`2`/`3`/`4` shortcuts, highlighted phrase, rationale after pick, history saves as "Declension · case ID"

---

## Self-Review

**1. Spec coverage:** every requirement (version page, pagination on 6 surfaces, pronoun drill, case-recognition drill, changelog with x.yy.zz convention) has a task.

**2. Placeholder scan:** Tasks 8/9 say "populate ~36/~40 more" — unavoidable for curated content; the integrity tests catch shape errors. Task 11 says "(unchanged)" for the first 4 declension cards — accurate since they were defined in the v1 plan.

**3. Type consistency:** `PronounEntry`, `CaseRecognitionEntry`, `PronounCategory`, and `DeclCase`/`DeclLevel` are used consistently across data, composables, setup pages, runner pages. History types (`'decl-pronoun'`, `'decl-case-recognition'`) and setup keys (`declPronounSetup`, `declCRSetup`) used consistently across all touch-points.

---

## Risks

- **Curation grammar errors** in the pronoun and case-recognition datasets. The shape tests catch structural issues but not grammar; a German-fluent review pass is recommended before the 1.07.00 ship.
- **Pagination state in result pages** — if a user re-runs a quiz, the result page mounts fresh and pagination state resets to page 1. That's the desired behaviour.
- **Hotkey conflicts in case-recognition runner** — `1`/`2`/`3`/`4` shouldn't clash with anything else on the page since there are no other input fields focused by default. Add a focused-input guard if it becomes a problem.

---

## Effort estimate

| Phase | Tasks | Days |
|---|---|---|
| Changelog + version page | 1, 4 | 0.5 |
| Pagination infrastructure | 2, 3 | 0.5 |
| Apply pagination | 5, 6, 7 | 0.5 |
| Pronoun dataset + composable | 8, 10 | 0.75 |
| Case-recognition dataset | 9 | 0.5 |
| Routes + landing growth | 11 | 0.25 |
| Pronoun quiz UI | 12 | 0.75 |
| Case-recognition UI | 13 | 0.75 |
| Verify + deploy | 14 | 0.25 |
| **Total** | | **~4.75 days** |
