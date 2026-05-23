# v2 Redesign — Dark Mode + Cheatsheet Polish + Router Fix

**Date:** 2026-05-23
**Status:** Approved (sections A–F confirmed in brainstorm)
**Scope:** App-wide dark mode, cheatsheet layout + styling polish, vue-router base-URL fix, then deploy.

## Goal

Five threads of work to ship in one coordinated change:

1. **Router base-URL bug** — all production links currently miss the `/GermanTrainer/` prefix because `vue-router` doesn't know about Vite's `base` config. One-line fix.
2. **Cheatsheet layout bugs** — sticky chapter rail doesn't actually stick; drop cap collides with following content; tablet range (640–1023px) is essentially unhandled.
3. **Cheatsheet styling polish** — refined palette, vowel-change highlight box (verbformen-style), stem/ending visual contrast, tighter density, multi-column conjugation tables that fill available width.
4. **App-wide dark mode** — toggle in NavShell header, naive-ui's `darkTheme` + cheatsheet CSS variables driven by a single `<html data-theme="…">` source of truth.
5. **Build + deploy to gh-pages.**

## Non-goals

- No new content; chapter prose stays as-is.
- No "system / light / dark" tri-state UI in this iteration (the underlying state model supports it; only the toggle button ships).
- No theme-switching of any third-party non-naive-ui component (there are none).
- No CSS-in-JS or theme runtime injection beyond what naive-ui's `NConfigProvider` already does.

## Theming architecture

Single source of truth: `<html data-theme="light">` or `<html data-theme="dark">`. The `data-theme` attribute on `<html>` is set synchronously in `main.ts` BEFORE the Vue app mounts, eliminating FOUC.

### `src/composables/useTheme.ts` (new)

```ts
type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeApi {
  mode: Ref<ThemeMode>          // user's preference, persisted to localStorage
  resolved: ComputedRef<ResolvedTheme>
  toggle(): void                // light <-> dark, leaves system mode
  setMode(m: ThemeMode): void
}

export function useTheme(): ThemeApi
```

Behavior:
- localStorage key: `theme`. Values: `'light'`, `'dark'`, `'system'`. Missing = `'system'`.
- When `mode === 'system'`, `resolved` follows `matchMedia('(prefers-color-scheme: dark)').matches`.
- When `mode === 'light'|'dark'`, `resolved` returns that value directly.
- Changing `mode` updates `<html data-theme="…">` as a side effect.
- A media-query listener updates `resolved` reactively when in system mode.
- `toggle()` always sets an explicit mode (`light` or `dark`), never returns to `'system'`. Explicit user choice wins.
- Singleton state: the composable returns the same shared refs every time it's called.

### `src/main.ts` (modified)

At the very top, BEFORE `import { createApp }`:

```ts
// Apply theme synchronously so there's no flash of incorrect mode
(function applyInitialTheme() {
  const stored = localStorage.getItem('theme')
  const isDark = stored === 'dark' ||
    (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
})()
```

### `src/App.vue` (modified)

```vue
<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, darkTheme } from 'naive-ui'
import { computed } from 'vue'
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

### `src/components/ThemeToggle.vue` (new)

Single icon button. ☀ when `resolved === 'light'`, ☾ when `dark`. 36px square ghost button. 270deg rotation + crossfade on toggle, 300ms ease-out. Aria-label updates dynamically.

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'
import { useTheme } from '../composables/useTheme'

const { resolved, toggle } = useTheme()
const isDark = computed(() => resolved.value === 'dark')
const label = computed(() => isDark.value ? 'Switch to light theme' : 'Switch to dark theme')
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

### `src/components/NavShell.vue` (modified)

Insert `<ThemeToggle />` in the header on the right side, before the `n-menu` (desktop) and before nothing (mobile — it should be rightmost in the title row, before the drawer-trigger area).

### Dark variables in `cheatsheet.css`

Append to the existing file:

```css
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
  filter: invert(1);  /* the noise looks better light-on-dark */
}
```

Also update the light-mode `--paper` / `--ink` etc. in `.grammatik` to the refined palette (see Cheatsheet styling below).

## Router fix

`src/router.ts`:
```diff
 export const router = createRouter({
-  history: createWebHistory(),
+  history: createWebHistory(import.meta.env.BASE_URL),
   routes
 })
```

`import.meta.env.BASE_URL` resolves to `'/'` in dev and `'/GermanTrainer/'` in production builds (matching `vite.config.ts`'s `base`). All `<router-link>` and `router.push()` calls automatically get the prefix.

## Cheatsheet layout fixes

### Sticky chapter rail (fix)

`CheatSheet.vue`:
```diff
 .grammatik-layout {
   display: grid;
   grid-template-columns: 240px 1fr;
   gap: 48px;
+  align-items: start;
 }
```

`ChapterNav.vue`:
```diff
 .chapter-nav {
   position: sticky;
-  top: 96px;
+  top: 24px;
   width: 240px;
+  max-height: calc(100vh - 48px);
+  overflow-y: auto;
   font-size: 14px;
 }
+
+.chapter-nav::-webkit-scrollbar { width: 6px; }
+.chapter-nav::-webkit-scrollbar-track { background: transparent; }
+.chapter-nav::-webkit-scrollbar-thumb {
+  background: color-mix(in srgb, var(--mute) 50%, transparent);
+  border-radius: 3px;
+}
```

### Drop cap rebalance

`cheatsheet.css`:
```diff
 .grammatik .dropcap-p::first-letter {
   font-family: var(--font-display);
   font-weight: 300;
   font-style: italic;
-  font-size: 4.5em;
-  line-height: 0.85;
+  font-size: 3em;
+  line-height: 0.9;
   float: left;
-  margin: 6px 8px 0 0;
+  margin: 4px 10px -2px 0;
+  padding-top: 2px;
+  shape-outside: margin-box;
   color: var(--sage);
 }
+
+@media (max-width: 480px) {
+  .grammatik .dropcap-p::first-letter {
+    float: none;
+    font-size: 1.4em;
+    margin: 0;
+    padding: 0;
+  }
+}
```

### Three-tier responsive breakpoints

`CheatSheet.vue` scoped styles — replace the single `@media (max-width: 959px)` block with two:

```css
/* Tablet — 640–1023px */
@media (max-width: 1023px) {
  .grammatik-layout { grid-template-columns: 1fr; gap: 24px; }
  .chapter-numeral { position: static; margin-bottom: 12px; font-size: 72px; }
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

`ChapterNav.vue` — disclosure mode for tablet (640–1023px):

```css
/* Tablet: compact disclosure */
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
    border: 1px solid var(--rule);
    border-radius: 999px;
    padding: 6px 12px;
    min-height: 36px;
  }
  .chapter-nav-item.active {
    background: var(--sage-tint);
    border-color: var(--sage);
  }
}
```

The existing mobile (< 768px) media query in `ChapterNav.vue` should be adjusted to `(max-width: 639px)` to match.

## Cheatsheet styling polish

### Refined light-mode palette in `.grammatik`

```diff
 .grammatik {
-  --paper: #F7F2E8;
-  --paper-deep: #EFE8D8;
-  --ink: #1A1814;
-  --ink-soft: #3D3A33;
-  --mute: #8C8576;
-  --rule: #2A2620;
+  --paper: #FAF7F0;
+  --paper-deep: #F1ECDE;
+  --ink: #15130E;
+  --ink-soft: #3A372F;
+  --mute: #948C7C;
+  --rule: #1E1B14;
   --sage: #5C7A52;
+  --sage-tint: rgba(92, 122, 82, 0.18);
   --clay: #A03B2B;
-  --ochre: #C29242;
+  --ochre: #B8852F;
   --cobalt: #2C5282;
   ...
-  line-height: 1.72;
+  line-height: 1.6;
 }
```

(`--sage-tint` is new and used by VowelShift and the `.vh` stem-change shorthand.)

### VowelShift upgrade

`VowelShift.vue`:
```css
.vowel-shift {
  color: var(--sage);
  font-weight: 600;
  background: var(--sage-tint);
  padding: 0 3px;
  border-radius: 2px;
  margin: 0 1px;
  /* remove the old border-bottom dotted line */
  cursor: help;
  animation: pulse 0.5s ease-out 0.4s 1 both;
  display: inline-block;
}
```

(The `@keyframes pulse` and reduced-motion guard stay as they are.)

### Stem/ending contrast in CheatSheet's :deep selectors

```diff
 :deep(.conj-form .ending) {
-  color: var(--sage);
-  font-weight: 600;
+  color: var(--mute);
+  font-weight: 500;
 }
 :deep(.conj-form .vh) {
   color: var(--sage);
-  font-weight: 600;
+  font-weight: 600;
+  background: var(--sage-tint);
+  padding: 0 2px;
+  border-radius: 2px;
 }
```

### Pattern-heading numeration

In `CheatSheet.vue` scoped styles, add the counter rules:

```css
.chapter { counter-reset: pattern; }
.pattern-heading { counter-increment: pattern; }
.pattern-heading::before {
  content: counter(pattern, lower-alpha) ".";
  margin-right: 10px;
  color: var(--mute);
  font-feature-settings: "tnum";
}
```

This gives Chapter II's four sub-patterns "a. a → ä", "b. au → äu", etc. without changing the markup. Other chapters with `.pattern-heading` (VI, VII, IX, XII) get the same treatment — visually they all become structured.

### Auto-fitting conjugation rows (full-width)

`ConjugationTable.vue` scoped styles:
```diff
-.conj-rows { padding: 10px 16px 14px; }
+.conj-rows {
+  display: grid;
+  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
+  column-gap: 32px;
+  row-gap: 2px;
+  padding: 10px 18px 14px;
+}

 .conj-row {
   display: grid;
-  grid-template-columns: 60px 1fr;
+  grid-template-columns: 72px 1fr;
   align-items: baseline;
-  padding: 4px 0;
+  padding: 5px 4px;
+  border-bottom: 1px dotted color-mix(in srgb, var(--mute) 25%, transparent);
   transition: background-color 150ms ease;
-  border-radius: 1px;
 }

 .conj-row:hover { background: var(--paper-deep); }

+/* Drop the trailing border on the visually-last row of each column */
+.conj-row:last-child { border-bottom: 0; }

 .conj-person {
   font-family: var(--font-body);
   font-style: italic;
   color: var(--ink-soft);
-  font-size: 14px;
+  font-size: 14.5px;
 }

 .conj-form {
   font-family: var(--font-mono);
-  font-size: 14.5px;
+  font-size: 16px;
   color: var(--ink);
   line-height: 1.55;
 }
```

This grid auto-fits: 1 column when < 540px, 2 columns when 540–820px, 3 columns when ≥ 820px. Inside `.two-col` (where the cell is < 260px), it stays single-column.

### Tighter chapter spacing

`CheatSheet.vue` scoped styles:
```diff
 .chapter {
   position: relative;
-  margin: 96px 0;
+  margin: 80px 0;
   scroll-margin-top: 96px;
   animation: chapter-in 400ms ease-out both;
 }
```

## Testing

Vitest, focused on the new theme logic:

- **`tests/composables/useTheme.test.ts`** (new):
  - `resolved` is `'dark'` when localStorage = `'dark'`
  - `resolved` is `'light'` when localStorage = `'light'`
  - `resolved` follows `prefers-color-scheme` when localStorage is missing
  - `toggle()` flips light ↔ dark
  - `toggle()` from `'system'` sets an explicit mode (not back to system)
  - `setMode('system')` re-reads system preference
  - Multiple `useTheme()` calls share state (singleton check)
  - `<html data-theme="…">` updates after `setMode()`
  - Use `vi.stubGlobal` for `matchMedia` + localStorage mocks

- **`tests/components/ThemeToggle.test.ts`** (new):
  - Renders sun icon when `resolved = 'light'`
  - Renders moon icon when `resolved = 'dark'`
  - aria-label reflects current state
  - Click triggers `toggle()` (mock the composable)

No tests for the router fix, layout/CSS changes (manual visual QA covers).

## Manual QA checklist (post-deploy)

After `npm run deploy`:
- Visit `https://<user>.github.io/GermanTrainer/` — page loads, no console errors
- All nav links work (no `/` paths missing the prefix)
- Toggle dark mode — naive-ui components flip; cheatsheet flips; persists on reload
- Open `/GermanTrainer/verbs/cheatsheet` — sticky nav follows on scroll; vowel highlights have sage background boxes; tables fill width with multi-column rows on desktop
- Resize to ≤ 1023px — tablet pill-bar nav appears; drop caps render correctly
- Resize to < 640px — mobile layout; drop cap goes inline (1.4em); no horizontal overflow
- Switch system theme — app follows when in `'system'` mode; ignores when explicit pref set

## Open implementation notes

- `useTheme.ts` should be a **singleton composable** — define module-level `ref`s outside the `useTheme()` function so every caller gets the same state. Pattern: lazy init via top-of-module IIFE that reads localStorage once.
- The `NConfigProvider` swap is reactive, so naive-ui components instantly re-theme without remount.
- The `.theme-toggle` rotation animation uses `transform`, which doesn't trigger layout — safe for 60fps.
- The router base-URL change has zero runtime cost; it's a constructor argument.
- The conjugation-row CSS grid using `repeat(auto-fit, minmax(260px, 1fr))` falls back gracefully on browsers without `minmax` support (which is none in 2026 — universally supported).
