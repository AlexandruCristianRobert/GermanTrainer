# v2 Redesign + Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the v2 redesign — app-wide dark mode (toggle in NavShell, persisted, follows system on first visit), cheatsheet layout fixes (sticky rail, drop cap, three-tier responsive), refined cheatsheet styling (palette tweaks, sage-tint vowel highlights, stem/ending contrast, auto-fitting multi-column conjugation rows), router base-URL fix, then build + deploy to gh-pages.

**Architecture:** Single source of truth for theme = `<html data-theme="light|dark">`, set synchronously in `main.ts` to prevent FOUC. `useTheme` composable owns reactive state (light/dark/system); `App.vue` swaps naive-ui's `darkTheme` into `NConfigProvider`; `cheatsheet.css` adds `[data-theme="dark"] .grammatik { ... }` token overrides. Layout fixes are scoped CSS-only changes. Router fix is one line. Conjugation tables become `grid auto-fit minmax(260px, 1fr)` for full-width responsive layout.

**Tech Stack:** Vue 3 (script setup), TypeScript strict, Vite, naive-ui, vue-router, vitest, gh-pages.

**Spec:** `docs/superpowers/specs/2026-05-23-v2-redesign-darkmode-design.md`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/router.ts` | (modify) pass `import.meta.env.BASE_URL` to `createWebHistory()` |
| `src/composables/useTheme.ts` | (create) singleton theme state + localStorage + matchMedia |
| `src/main.ts` | (modify) synchronous `data-theme` attribute setter before app mount |
| `src/App.vue` | (modify) `NConfigProvider :theme` driven by `useTheme().resolved` |
| `src/components/ThemeToggle.vue` | (create) sun/moon icon button |
| `src/components/NavShell.vue` | (modify) embed `<ThemeToggle />` in header right |
| `src/modules/verbs/cheatsheet/cheatsheet.css` | (modify) refined light palette + dark-theme overrides + drop-cap rebalance |
| `src/modules/verbs/cheatsheet/ChapterNav.vue` | (modify) sticky-fix CSS + tablet pill-bar breakpoint |
| `src/modules/verbs/cheatsheet/ConjugationTable.vue` | (modify) auto-fit multi-column rows |
| `src/modules/verbs/cheatsheet/VowelShift.vue` | (modify) sage-tint background, drop border-bottom |
| `src/modules/verbs/CheatSheet.vue` | (modify) `align-items: start` grid fix, three-tier breakpoints, pattern-heading counter, tightened spacing |
| `tests/composables/useTheme.test.ts` | (create) theme state + localStorage + matchMedia tests |
| `tests/components/ThemeToggle.test.ts` | (create) icon swap + click toggles theme |

---

### Task 1: Router base-URL fix

**Files:**
- Modify: `src/router.ts`

- [ ] **Step 1: Update the history factory to pass the Vite base URL**

Open `src/router.ts`. Replace the existing `export const router = createRouter({ ... })` block with:

```ts
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})
```

Only that one argument changes. The rest of the file stays as-is.

- [ ] **Step 2: Verify typecheck and tests**

Run: `cd "E:/Projects/German" && npm run typecheck && npm test`
Expected: PASS — all 152 tests still green; no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/router.ts
git commit -m "$(cat <<'EOF'
fix(router): use Vite BASE_URL so links work under /GermanTrainer/

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `useTheme` composable (TDD)

**Files:**
- Create: `src/composables/useTheme.ts`
- Create: `tests/composables/useTheme.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/composables/useTheme.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Reset the module + DOM + localStorage before each test
beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

afterEach(() => {
  vi.restoreAllMocks()
})

function stubMatchMedia(prefersDark: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: prefersDark,
    media: q,
    addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.push(fn),
    removeEventListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
    addListener: () => {},
    removeListener: () => {}
  }))
  return {
    fireChange(matches: boolean) {
      for (const fn of listeners) fn({ matches })
    }
  }
}

describe('useTheme', () => {
  it('defaults to light when localStorage is empty and prefers-color-scheme is light', async () => {
    stubMatchMedia(false)
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    expect(t.mode.value).toBe('system')
    expect(t.resolved.value).toBe('light')
  })

  it('defaults to dark when localStorage is empty and prefers-color-scheme is dark', async () => {
    stubMatchMedia(true)
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    expect(t.mode.value).toBe('system')
    expect(t.resolved.value).toBe('dark')
  })

  it('reads mode=light from localStorage', async () => {
    localStorage.setItem('theme', 'light')
    stubMatchMedia(true)
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    expect(t.mode.value).toBe('light')
    expect(t.resolved.value).toBe('light')
  })

  it('reads mode=dark from localStorage', async () => {
    localStorage.setItem('theme', 'dark')
    stubMatchMedia(false)
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    expect(t.mode.value).toBe('dark')
    expect(t.resolved.value).toBe('dark')
  })

  it('toggle flips light to dark and persists', async () => {
    localStorage.setItem('theme', 'light')
    stubMatchMedia(false)
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    t.toggle()
    expect(t.mode.value).toBe('dark')
    expect(t.resolved.value).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('toggle from system mode sets explicit opposite of current resolved', async () => {
    stubMatchMedia(true) // system says dark, resolved = dark
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    expect(t.mode.value).toBe('system')
    expect(t.resolved.value).toBe('dark')
    t.toggle()
    expect(t.mode.value).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('setMode("system") clears localStorage and re-reads system preference', async () => {
    localStorage.setItem('theme', 'dark')
    stubMatchMedia(false)
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    expect(t.resolved.value).toBe('dark')
    t.setMode('system')
    expect(t.mode.value).toBe('system')
    expect(t.resolved.value).toBe('light')
    expect(localStorage.getItem('theme')).toBeNull()
  })

  it('updates <html data-theme> when mode changes', async () => {
    stubMatchMedia(false)
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    t.setMode('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('returns the same shared state from multiple calls (singleton)', async () => {
    stubMatchMedia(false)
    const { useTheme } = await import('../../src/composables/useTheme')
    const a = useTheme()
    const b = useTheme()
    expect(a.mode).toBe(b.mode)
    a.setMode('dark')
    expect(b.mode.value).toBe('dark')
  })

  it('follows system change when mode=system', async () => {
    const mql = stubMatchMedia(false)
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    expect(t.resolved.value).toBe('light')
    mql.fireChange(true)
    expect(t.resolved.value).toBe('dark')
  })
})
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `cd "E:/Projects/German" && npx vitest run tests/composables/useTheme.test.ts`
Expected: FAIL — `Cannot find module '../../src/composables/useTheme'`.

- [ ] **Step 3: Implement the composable**

Create `src/composables/useTheme.ts`:

```ts
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeApi {
  mode: Ref<ThemeMode>
  resolved: ComputedRef<ResolvedTheme>
  toggle(): void
  setMode(m: ThemeMode): void
}

const STORAGE_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

// Module-level singletons — every useTheme() call shares this state.
const mode = ref<ThemeMode>(readStoredMode())
const systemPrefersDark = ref<boolean>(readSystemDark())

const resolved = computed<ResolvedTheme>(() => {
  if (mode.value === 'system') return systemPrefersDark.value ? 'dark' : 'light'
  return mode.value
})

function readStoredMode(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'system'
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'light' || v === 'dark') return v
  return 'system'
}

function readSystemDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(DARK_QUERY).matches
}

function applyToDom(value: ResolvedTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', value)
}

// Set initial DOM attribute (in case main.ts didn't, e.g. in tests).
applyToDom(resolved.value)

// Keep DOM in sync.
watch(resolved, applyToDom)

// Listen for system theme changes — affects resolved only when mode === 'system'.
if (typeof window !== 'undefined' && window.matchMedia) {
  const mql = window.matchMedia(DARK_QUERY)
  mql.addEventListener('change', e => {
    systemPrefersDark.value = e.matches
  })
}

function persist(m: ThemeMode) {
  if (typeof localStorage === 'undefined') return
  if (m === 'system') localStorage.removeItem(STORAGE_KEY)
  else localStorage.setItem(STORAGE_KEY, m)
}

function setMode(m: ThemeMode): void {
  mode.value = m
  if (m === 'system') systemPrefersDark.value = readSystemDark()
  persist(m)
}

function toggle(): void {
  // Always set an explicit mode opposite of current resolved.
  setMode(resolved.value === 'dark' ? 'light' : 'dark')
}

export function useTheme(): ThemeApi {
  return { mode, resolved, toggle, setMode }
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `cd "E:/Projects/German" && npx vitest run tests/composables/useTheme.test.ts`
Expected: PASS — 10/10 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useTheme.ts tests/composables/useTheme.test.ts
git commit -m "$(cat <<'EOF'
feat(theme): useTheme composable with localStorage + system preference

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Synchronous theme initialization in `main.ts`

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Add the FOUC-prevention block at the top of `main.ts`**

Open `src/main.ts`. Insert this IIFE BEFORE the existing `import { createApp }` line — but AFTER the @fontsource imports (the font imports must remain at the top of the file).

Actually, font imports go first (so fonts can preload), then the FOUC blocker, then the Vue imports. The block:

```ts
// Apply theme synchronously to avoid a flash of incorrect mode (FOUC).
// Reads the same storage key as src/composables/useTheme.ts.
;(function applyInitialTheme() {
  try {
    const stored = localStorage.getItem('theme')
    const isDark = stored === 'dark' ||
      (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  } catch {
    /* localStorage / matchMedia unavailable — keep default light */
    document.documentElement.setAttribute('data-theme', 'light')
  }
})()
```

The final `src/main.ts` should look like:

```ts
import '@fontsource/fraunces/300.css'
import '@fontsource/fraunces/400.css'
import '@fontsource/fraunces/600.css'
import '@fontsource/fraunces/400-italic.css'
import '@fontsource/source-serif-4/400.css'
import '@fontsource/source-serif-4/600.css'
import '@fontsource/source-serif-4/400-italic.css'
import '@fontsource/jetbrains-mono/400.css'

// Apply theme synchronously to avoid a flash of incorrect mode (FOUC).
// Reads the same storage key as src/composables/useTheme.ts.
;(function applyInitialTheme() {
  try {
    const stored = localStorage.getItem('theme')
    const isDark = stored === 'dark' ||
      (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  } catch {
    document.documentElement.setAttribute('data-theme', 'light')
  }
})()

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

- [ ] **Step 2: Verify typecheck and tests**

Run: `cd "E:/Projects/German" && npm run typecheck && npm test`
Expected: PASS — typecheck clean; all tests green.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "$(cat <<'EOF'
feat(theme): apply data-theme synchronously in main.ts to prevent FOUC

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `ThemeToggle` component (TDD)

**Files:**
- Create: `src/components/ThemeToggle.vue`
- Create: `tests/components/ThemeToggle.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/components/ThemeToggle.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    media: '',
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
    addListener: () => {},
    removeListener: () => {}
  }))
})

describe('ThemeToggle', () => {
  it('renders a button with aria-label "Switch to dark theme" in light mode', async () => {
    const ThemeToggle = (await import('../../src/components/ThemeToggle.vue')).default
    const wrapper = mount(ThemeToggle)
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('aria-label')).toBe('Switch to dark theme')
  })

  it('renders with aria-label "Switch to light theme" in dark mode', async () => {
    localStorage.setItem('theme', 'dark')
    const ThemeToggle = (await import('../../src/components/ThemeToggle.vue')).default
    const wrapper = mount(ThemeToggle)
    expect(wrapper.find('button').attributes('aria-label')).toBe('Switch to light theme')
  })

  it('applies the is-dark class when in dark mode', async () => {
    localStorage.setItem('theme', 'dark')
    const ThemeToggle = (await import('../../src/components/ThemeToggle.vue')).default
    const wrapper = mount(ThemeToggle)
    expect(wrapper.find('.theme-toggle-icon').classes()).toContain('is-dark')
  })

  it('clicking the button toggles the theme', async () => {
    const ThemeToggle = (await import('../../src/components/ThemeToggle.vue')).default
    const { useTheme } = await import('../../src/composables/useTheme')
    const wrapper = mount(ThemeToggle)
    expect(useTheme().resolved.value).toBe('light')
    await wrapper.find('button').trigger('click')
    expect(useTheme().resolved.value).toBe('dark')
  })
})
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `cd "E:/Projects/German" && npx vitest run tests/components/ThemeToggle.test.ts`
Expected: FAIL — component file not found.

- [ ] **Step 3: Implement the component**

Create `src/components/ThemeToggle.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'
import { useTheme } from '../composables/useTheme'

const { resolved, toggle } = useTheme()
const isDark = computed(() => resolved.value === 'dark')
const label = computed(() =>
  isDark.value ? 'Switch to light theme' : 'Switch to dark theme'
)
</script>

<template>
  <n-button
    quaternary
    circle
    :aria-label="label"
    class="theme-toggle"
    @click="toggle"
  >
    <span class="theme-toggle-icon" :class="{ 'is-dark': isDark }">
      <span class="icon-sun" aria-hidden="true">☀</span>
      <span class="icon-moon" aria-hidden="true">☾</span>
    </span>
  </n-button>
</template>

<style scoped>
.theme-toggle-icon {
  position: relative;
  display: inline-block;
  width: 18px;
  height: 18px;
  font-size: 16px;
  line-height: 1;
  transition: transform 300ms ease-out;
}
.theme-toggle-icon.is-dark { transform: rotate(270deg); }

.icon-sun, .icon-moon {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  transition: opacity 200ms ease;
}
.icon-sun  { opacity: 1; }
.icon-moon { opacity: 0; transform: rotate(-270deg); }
.theme-toggle-icon.is-dark .icon-sun  { opacity: 0; }
.theme-toggle-icon.is-dark .icon-moon { opacity: 1; }

@media (prefers-reduced-motion: reduce) {
  .theme-toggle-icon { transition: none; }
  .icon-sun, .icon-moon { transition: none; }
}
</style>
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `cd "E:/Projects/German" && npx vitest run tests/components/ThemeToggle.test.ts`
Expected: PASS — 4/4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/ThemeToggle.vue tests/components/ThemeToggle.test.ts
git commit -m "$(cat <<'EOF'
feat(theme): ThemeToggle sun/moon button with rotation crossfade

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Wire NConfigProvider + ThemeToggle into App

**Files:**
- Modify: `src/App.vue`
- Modify: `src/components/NavShell.vue`

- [ ] **Step 1: Update `App.vue` to drive `NConfigProvider :theme` from `useTheme`**

Replace the contents of `src/App.vue` with:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { NConfigProvider, NMessageProvider, NDialogProvider, darkTheme } from 'naive-ui'
import NavShell from './components/NavShell.vue'
import { useTheme } from './composables/useTheme'

const { resolved } = useTheme()
const theme = computed(() => resolved.value === 'dark' ? darkTheme : null)
</script>

<template>
  <n-config-provider :theme="theme">
    <n-message-provider>
      <n-dialog-provider>
        <NavShell />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
```

- [ ] **Step 2: Add `<ThemeToggle />` to NavShell header**

In `src/components/NavShell.vue`:

a) Add the import in the `<script setup>` block (after the existing `NavShell` imports):

```ts
import ThemeToggle from './ThemeToggle.vue'
```

b) In the template, find the `<n-space justify="space-between" align="center" :wrap="false">` block inside the `<n-layout-header>`. The current structure is:

```vue
<n-space justify="space-between" align="center" :wrap="false">
  <n-space align="center" :size="8" :wrap="false">
    <n-button v-if="isMobile" ...> ☰ </n-button>
    <n-text strong :style="titleStyle">German Trainer</n-text>
  </n-space>
  <n-menu v-if="!isMobile" ... />
</n-space>
```

Change it to add the ThemeToggle as a sibling on the right side — desktop has it between title-block and menu, mobile has it as the rightmost element:

```vue
<n-space justify="space-between" align="center" :wrap="false">
  <n-space align="center" :size="8" :wrap="false">
    <n-button v-if="isMobile" quaternary size="small" aria-label="Open menu" @click="drawerOpen = true">
      ☰
    </n-button>
    <n-text strong :style="titleStyle">German Trainer</n-text>
  </n-space>
  <n-space align="center" :size="8" :wrap="false">
    <n-menu
      v-if="!isMobile"
      mode="horizontal"
      :options="items"
      :value="activeKey"
      @update:value="onSelect"
    />
    <ThemeToggle />
  </n-space>
</n-space>
```

(ThemeToggle ends up rightmost in both layouts: on desktop after the menu, on mobile after the title — because the menu is hidden on mobile.)

- [ ] **Step 3: Verify typecheck and tests**

Run: `cd "E:/Projects/German" && npm run typecheck && npm test`
Expected: PASS — typecheck clean; all tests green.

- [ ] **Step 4: Commit**

```bash
git add src/App.vue src/components/NavShell.vue
git commit -m "$(cat <<'EOF'
feat(theme): wire dark mode into App + NavShell header

NConfigProvider :theme follows useTheme().resolved.
ThemeToggle button sits to the right of the menu on desktop,
and to the right of the title on mobile.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Refined light palette + dark-theme overrides in `cheatsheet.css`

**Files:**
- Modify: `src/modules/verbs/cheatsheet/cheatsheet.css`

- [ ] **Step 1: Update the light-mode variables inside `.grammatik { ... }`**

Find the `.grammatik { ... }` rule at the top of the file. Replace the CSS-variable block (everything from `--font-display` through `--cobalt`) with this refined palette and bump the line-height:

```css
.grammatik {
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Source Serif 4', 'Source Serif Pro', Georgia, serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;

  --paper: #FAF7F0;
  --paper-deep: #F1ECDE;
  --ink: #15130E;
  --ink-soft: #3A372F;
  --mute: #948C7C;
  --rule: #1E1B14;

  --sage: #5C7A52;
  --sage-tint: rgba(92, 122, 82, 0.18);
  --clay: #A03B2B;
  --ochre: #B8852F;
  --cobalt: #2C5282;

  position: relative;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 17px;
  line-height: 1.6;
  min-height: 100vh;
  padding: 32px;
}
```

(`--sage-tint` is new; the colour and line-height values changed; everything else stays.)

- [ ] **Step 2: Append the dark-theme overrides at the end of the file**

Append these blocks AFTER the existing `@media print` block:

```css
/* ─── Dark mode overrides ─── */
[data-theme="dark"] .grammatik {
  --paper:        #15130E;
  --paper-deep:   #1E1B14;
  --ink:          #EDE7D6;
  --ink-soft:     #B8B0A0;
  --mute:         #6A6557;
  --rule:         #3A372F;
  --sage:         #8FAE82;
  --sage-tint:    rgba(143, 174, 130, 0.22);
  --clay:         #D4604E;
  --ochre:        #E2B158;
  --cobalt:       #6090C2;
}

[data-theme="dark"] .grammatik::before {
  opacity: 0.05;
  filter: invert(1);
}
```

- [ ] **Step 3: Rebalance the drop cap**

Find the `.grammatik .dropcap-p::first-letter` rule and replace it with:

```css
.grammatik .dropcap-p::first-letter {
  font-family: var(--font-display);
  font-weight: 300;
  font-style: italic;
  font-size: 3em;
  line-height: 0.9;
  float: left;
  margin: 4px 10px -2px 0;
  padding-top: 2px;
  shape-outside: margin-box;
  color: var(--sage);
}

@media (max-width: 480px) {
  .grammatik .dropcap-p::first-letter {
    float: none;
    font-size: 1.4em;
    margin: 0;
    padding: 0;
  }
}
```

- [ ] **Step 4: Verify typecheck and tests**

Run: `cd "E:/Projects/German" && npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/verbs/cheatsheet/cheatsheet.css
git commit -m "$(cat <<'EOF'
feat(cheatsheet): refined palette, dark-theme tokens, drop-cap rebalance

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: VowelShift visual upgrade

**Files:**
- Modify: `src/modules/verbs/cheatsheet/VowelShift.vue`

- [ ] **Step 1: Update the `.vowel-shift` rule**

Replace the existing `<style scoped>` content with:

```css
.vowel-shift {
  color: var(--sage);
  font-weight: 600;
  background: var(--sage-tint);
  padding: 0 3px;
  border-radius: 2px;
  margin: 0 1px;
  cursor: help;
  animation: pulse 0.5s ease-out 0.4s 1 both;
  display: inline-block;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .vowel-shift { animation: none; }
}
```

(Removed `border-bottom: 1px dotted var(--sage)` since the sage-tint background now provides the visual emphasis.)

- [ ] **Step 2: Verify VowelShift tests still pass**

Run: `cd "E:/Projects/German" && npx vitest run tests/modules/verbs/cheatsheet/VowelShift.test.ts`
Expected: PASS — 3/3 tests still green (they check structure + `from` prop, not CSS).

- [ ] **Step 3: Commit**

```bash
git add src/modules/verbs/cheatsheet/VowelShift.vue
git commit -m "$(cat <<'EOF'
feat(cheatsheet): VowelShift uses sage-tint highlight box instead of underline

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: ConjugationTable auto-fit multi-column layout

**Files:**
- Modify: `src/modules/verbs/cheatsheet/ConjugationTable.vue`

- [ ] **Step 1: Update the scoped styles**

In the `<style scoped>` block, replace the `.conj-rows`, `.conj-row`, `.conj-person`, `.conj-form` rules with these versions:

```css
.conj-rows {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  column-gap: 32px;
  row-gap: 2px;
  padding: 10px 18px 14px;
}

.conj-row {
  display: grid;
  grid-template-columns: 72px 1fr;
  align-items: baseline;
  padding: 5px 4px;
  border-bottom: 1px dotted color-mix(in srgb, var(--mute) 25%, transparent);
  transition: background-color 150ms ease;
}

.conj-row:hover { background: var(--paper-deep); }

.conj-row:last-child { border-bottom: 0; }

.conj-person {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--ink-soft);
  font-size: 14.5px;
}

.conj-form {
  font-family: var(--font-mono);
  font-size: 16px;
  color: var(--ink);
  line-height: 1.55;
}
```

The other rules (`.conj-table`, `.conj-caption`, `.conj-caption-label`, `.conj-caption-verb`) stay unchanged.

- [ ] **Step 2: Verify ConjugationTable tests still pass**

Run: `cd "E:/Projects/German" && npx vitest run tests/modules/verbs/cheatsheet/ConjugationTable.test.ts`
Expected: PASS — 5/5 tests still green (they assert structure, not layout).

- [ ] **Step 3: Commit**

```bash
git add src/modules/verbs/cheatsheet/ConjugationTable.vue
git commit -m "$(cat <<'EOF'
feat(cheatsheet): auto-fit multi-column conjugation rows

grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))
spreads persons across the available width — 1 col when narrow,
2 cols at 540px+, 3 cols at 820px+. Bumps form font to 16px.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: ChapterNav sticky fix + tablet pill bar

**Files:**
- Modify: `src/modules/verbs/cheatsheet/ChapterNav.vue`

- [ ] **Step 1: Update the desktop `.chapter-nav` rule to scroll within viewport**

In the scoped styles, find the existing `.chapter-nav { ... }` rule and replace it with:

```css
.chapter-nav {
  position: sticky;
  top: 24px;
  width: 240px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  font-size: 14px;
}

.chapter-nav::-webkit-scrollbar { width: 6px; }
.chapter-nav::-webkit-scrollbar-track { background: transparent; }
.chapter-nav::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--mute) 50%, transparent);
  border-radius: 3px;
}
```

- [ ] **Step 2: Replace the mobile media query with two breakpoints**

Find the existing `@media (max-width: 767px) { ... }` block. Replace it entirely with these two blocks:

```css
/* Tablet — compact pill bar (640–1023px) */
@media (min-width: 640px) and (max-width: 1023px) {
  .chapter-nav {
    position: sticky;
    top: 0;
    width: 100%;
    background: var(--paper);
    border-bottom: 1px solid var(--rule);
    padding: 12px 16px;
    z-index: 10;
    max-height: none;
    overflow: visible;
  }
  .chapter-nav-head { display: none; }
  .chapter-nav-search { margin-bottom: 12px; }
  .chapter-nav-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chapter-nav-item {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    border: 1px solid var(--rule);
    border-radius: 999px;
    padding: 6px 12px;
    min-height: 36px;
    border-left: 1px solid var(--rule);
  }
  .chapter-nav-item.active {
    background: var(--sage-tint);
    border-color: var(--sage);
    border-left-color: var(--sage);
  }
}

/* Mobile — horizontal pill scroll (< 640px) */
@media (max-width: 639px) {
  .chapter-nav {
    position: sticky;
    top: 0;
    width: 100%;
    background: var(--paper);
    border-bottom: 1px solid var(--rule);
    padding: 8px 0;
    z-index: 10;
    max-height: none;
    overflow: visible;
  }
  .chapter-nav-head { display: none; }
  .chapter-nav-search { margin-bottom: 8px; }
  .chapter-nav-list {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .chapter-nav-list::-webkit-scrollbar { display: none; }
  .chapter-nav-item {
    display: inline-flex;
    gap: 6px;
    flex-shrink: 0;
    padding: 8px 14px;
    border: 1px solid var(--rule);
    border-left: 1px solid var(--rule);
    border-radius: 999px;
    background: var(--paper);
    white-space: nowrap;
    min-height: 44px;
  }
  .chapter-nav-item.active {
    border-left-color: var(--rule);
    border-color: var(--sage);
    background: color-mix(in srgb, var(--sage) 10%, var(--paper));
  }
}
```

- [ ] **Step 3: Verify ChapterNav tests still pass**

Run: `cd "E:/Projects/German" && npx vitest run tests/modules/verbs/cheatsheet/ChapterNav.test.ts`
Expected: PASS — 7/7 tests still green.

- [ ] **Step 4: Commit**

```bash
git add src/modules/verbs/cheatsheet/ChapterNav.vue
git commit -m "$(cat <<'EOF'
fix(cheatsheet): sticky rail + tablet pill-bar + mobile breakpoint at 639px

Adds max-height/overflow so the rail scrolls inside the viewport.
Splits the mobile media query into tablet (640–1023px, wrap-pill)
and mobile (<640px, scroll-pill) tiers.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: CheatSheet.vue layout + styling polish

**Files:**
- Modify: `src/modules/verbs/CheatSheet.vue`

- [ ] **Step 1: Add `align-items: start` to the grid layout**

In the scoped styles, find `.grammatik-layout { ... }` and add the alignment property:

```css
.grammatik-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 48px;
  max-width: 1160px;
  margin: 0 auto;
  align-items: start;
}
```

(This is the sticky-fix counterpart — the chapter-nav cell needs to NOT stretch full grid height for `position: sticky` to behave.)

- [ ] **Step 2: Tighten chapter spacing + add pattern-heading counter**

Find the `.chapter { ... }` rule and update the margin:

```css
.chapter {
  position: relative;
  margin: 80px 0;
  scroll-margin-top: 96px;
  animation: chapter-in 400ms ease-out both;
  counter-reset: pattern;
}

.chapter:first-of-type { margin-top: 16px; }
```

(Added `counter-reset: pattern;` — was previously absent.)

Find the `.pattern-heading { ... }` rule and add the counter increment + numeration:

```css
.pattern-heading {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  margin: 22px 0 10px 0;
  color: var(--sage);
  counter-increment: pattern;
}

.pattern-heading::before {
  content: counter(pattern, lower-alpha) ".";
  margin-right: 10px;
  color: var(--mute);
  font-feature-settings: "tnum";
}
```

- [ ] **Step 3: Update stem/ending contrast in the `:deep` selectors**

Find the two `:deep(.conj-form .ending)` and `:deep(.conj-form .vh)` rules. Replace them with:

```css
:deep(.conj-form .ending) {
  color: var(--mute);
  font-weight: 500;
}

:deep(.conj-form .vh) {
  color: var(--sage);
  font-weight: 600;
  background: var(--sage-tint);
  padding: 0 2px;
  border-radius: 2px;
}
```

- [ ] **Step 4: Replace the single 959px media query with three tiers**

Find the existing `@media (max-width: 959px) { ... }` block (which contains the layout + numeral + title + two-col + prefix-split rules). REPLACE it entirely with these two blocks:

```css
/* Tablet — 640–1023px */
@media (max-width: 1023px) {
  .grammatik-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .chapter-numeral {
    position: static;
    margin-bottom: 12px;
    font-size: 72px;
  }
  .chapter-title { font-size: 36px; }
  .two-col { grid-template-columns: 1fr; }
  .prefix-split { grid-template-columns: 1fr; }
}

/* Mobile — < 640px */
@media (max-width: 639px) {
  .grammatik { padding: 16px; }
  .chapter { margin: 56px 0; }
  .chapter-numeral { font-size: 56px; }
  .chapter-title { font-size: 28px; }
  .chapter-subtitle { font-size: 16px; }
  .modal-table { font-size: 13px; }
}
```

- [ ] **Step 5: Verify CheatSheet tests still pass**

Run: `cd "E:/Projects/German" && npx vitest run tests/modules/verbs/CheatSheet.test.ts`
Expected: PASS — 3/3 tests still green.

- [ ] **Step 6: Run the full test suite**

Run: `cd "E:/Projects/German" && npm test`
Expected: PASS — 166+ tests across 21 files (10 new useTheme + 4 new ThemeToggle on top of the previous 152).

- [ ] **Step 7: Commit**

```bash
git add src/modules/verbs/CheatSheet.vue
git commit -m "$(cat <<'EOF'
feat(cheatsheet): align-items start, pattern counter, three-tier responsive

* align-items: start on the layout grid so the chapter nav can
  actually stick (its grid cell no longer stretches full height).
* Tighter chapter margins (80px from 96px).
* pattern-heading counter ("a." "b." "c." "d.") on strong-verb
  subsections via CSS counters — no markup change.
* Updated :deep(.conj-form .ending) to mute + weight 500 and
  :deep(.conj-form .vh) to sage + sage-tint background.
* Replaced single 959px breakpoint with tablet (1023px) + mobile
  (639px) tiers.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Build + deploy

**Files:** none modified.

- [ ] **Step 1: Final verification**

Run:
```bash
cd "E:/Projects/German"
npm run typecheck
npm test
npm run build
```

Expected: typecheck PASS, tests PASS, build PASS.

If `dist/` shows modifications afterward, clean them: `git -C "E:/Projects/German" checkout -- dist/`.

- [ ] **Step 2: Deploy to GitHub Pages**

Run:
```bash
cd "E:/Projects/German" && npm run deploy
```

`npm run deploy` runs `predeploy` (which runs `npm run build && node -e "require('fs').writeFileSync('dist/.nojekyll', '')"`) and then `gh-pages -d dist --dotfiles`.

Expected: deploy completes with a "Published" message from gh-pages.

- [ ] **Step 3: Final report**

Report:
- All test counts (should be 166+ passing across 21+ files)
- Build success
- Deploy success + the URL where it landed
- Any post-deploy QA items to flag to the user

No commit needed for this task — `gh-pages` pushes to the `gh-pages` branch, not `main`.

---

## Self-Review Notes

### Spec coverage map

- **Theming architecture** (Section A of spec) → Tasks 2 + 3 + 5
- **NavShell toggle UI** (Section B) → Tasks 4 + 5
- **Sticky chapter rail fix** (Section C) → Tasks 9 + 10
- **Drop cap rebalance** (Section C) → Task 6
- **Three-tier responsive** (Section C) → Tasks 9 + 10
- **Refined palette + sage-tint** (Section D) → Task 6
- **VowelShift sage-tint background** (Section D) → Task 7
- **Stem/ending contrast** (Section D) → Task 10
- **Pattern-heading numeration** (Section D) → Task 10
- **Conjugation rows auto-fit** (Section D) → Task 8
- **Tighter density** (Section D) → Tasks 6 + 10
- **Router base URL** (Section E) → Task 1
- **Build + deploy** (Section E) → Task 11
- **useTheme tests + ThemeToggle tests** (Section F) → Tasks 2 + 4

All spec sections covered.

### Placeholder scan

No "TBD" / "TODO" / "fill in later" / "similar to Task N" patterns. Every code step has the literal code to paste. Every command step has the exact command and expected outcome.

### Type / name consistency

- `ThemeMode = 'light' | 'dark' | 'system'` — defined Task 2, used consistently in Tasks 4 + 5 + tests.
- `ResolvedTheme = 'light' | 'dark'` — defined Task 2, used in App.vue (Task 5).
- `useTheme()` returns `{ mode, resolved, toggle, setMode }` — interface in Task 2 matches usage in Tasks 4 + 5.
- localStorage key is `'theme'` everywhere (Tasks 2 + 3).
- `--sage-tint` CSS variable defined in Task 6 (both light + dark scopes), referenced in Tasks 7, 8, 9, 10 — all match.
- `data-theme` attribute on `<html>` — set synchronously in Task 3, kept in sync reactively in Task 2 (`useTheme`), targeted by Task 6 selectors. Same attribute, no drift.
