# App Loading Mask + Quiz-Ready Chime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a slim top progress bar during lazy route loads, and a short synthesized "ready" chime (with a Settings mute toggle) when an AI-generated quiz finishes loading.

**Architecture:** Two independent, framework-light module-singleton composables — `useRouteProgress` (wired to router guards in `main.ts`, rendered by `RouteProgress.vue`) and `useSound` (Web Audio chime + localStorage-persisted `enabled`). The chime fires from an opt-in `{ chime: true }` option on `loading.wrap` for generate-up-front AI quizzes, and from a one-shot call in the progressive `VerbSentenceRunner`. A Settings → Display toggle controls `enabled`.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vue Router, Web Audio API, Vitest + @vue/test-utils. Commands: `npm test`, `npx vitest run <file>`, `npm run typecheck`, `npm run build`, `npm run dev`.

Spec: `docs/superpowers/specs/2026-06-13-loading-mask-and-chime-design.md`.

---

## File Structure

- **New:** `src/composables/useSound.ts`, `src/composables/useRouteProgress.ts`, `src/components/RouteProgress.vue`.
- **Modified:** `src/main.ts` (install route progress), `src/App.vue` (mount bar), `src/composables/useLoading.ts` (chime option), `src/modules/settings/SettingsDisplay.vue` (toggle), 6 quiz-generation `loading.wrap` sites, `src/modules/verbs/VerbSentenceRunner.vue` (first-sentence chime).
- **Tests:** `tests/composables/useSound.test.ts`, `tests/composables/useRouteProgress.test.ts`, `tests/components/RouteProgress.test.ts`.

---

### Task 1: `useSound` — chime + persisted enable flag

**Files:**
- Create: `src/composables/useSound.ts`
- Test: `tests/composables/useSound.test.ts`

- [ ] **Step 1: Write the failing tests** — `tests/composables/useSound.test.ts`:

```ts
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { useSound } from '../../src/composables/useSound'

describe('useSound', () => {
  beforeEach(() => {
    localStorage.clear()
    useSound().setEnabled(true) // normalize the module singleton
  })

  test('setEnabled persists and reflects in enabled', () => {
    const s = useSound()
    s.setEnabled(false)
    expect(s.enabled.value).toBe(false)
    expect(localStorage.getItem('gt:soundEnabled')).toBe('false')
    s.setEnabled(true)
    expect(s.enabled.value).toBe(true)
    expect(localStorage.getItem('gt:soundEnabled')).toBe('true')
  })

  test('defaults to enabled when nothing is stored (fresh module load)', async () => {
    localStorage.clear()
    vi.resetModules()
    const { useSound: fresh } = await import('../../src/composables/useSound')
    expect(fresh().enabled.value).toBe(true)
  })

  test('treats a stored "false" as disabled on fresh load', async () => {
    localStorage.setItem('gt:soundEnabled', 'false')
    vi.resetModules()
    const { useSound: fresh } = await import('../../src/composables/useSound')
    expect(fresh().enabled.value).toBe(false)
  })

  test('playReady is a no-op (no throw) when disabled', () => {
    const s = useSound()
    s.setEnabled(false)
    expect(() => s.playReady()).not.toThrow()
  })

  test('playReady never throws when AudioContext is unavailable', () => {
    const s = useSound()
    s.setEnabled(true)
    // jsdom has no Web Audio: window.AudioContext is undefined here.
    expect(() => s.playReady()).not.toThrow()
  })

  test('playReady swallows a throwing AudioContext constructor', () => {
    const s = useSound()
    s.setEnabled(true)
    const Throwing = class { constructor() { throw new Error('blocked') } }
    ;(window as unknown as { AudioContext: unknown }).AudioContext = Throwing
    expect(() => s.playReady()).not.toThrow()
    delete (window as unknown as { AudioContext?: unknown }).AudioContext
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/composables/useSound.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/composables/useSound.ts`:

```ts
// A tiny, best-effort "quiz is ready" chime, synthesized with the Web Audio API
// (no audio asset). Module-singleton `enabled` flag persisted to localStorage so
// the Settings toggle and every play site share one source of truth. playReady()
// is fully guarded — a missing or blocked AudioContext must never disrupt a quiz.

import { ref, computed, type ComputedRef, type Ref } from 'vue'

const STORAGE_KEY = 'gt:soundEnabled'

function readEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

// Module singletons — every consumer shares them.
const enabled = ref(readEnabled())
let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (audioCtx) return audioCtx
  const Ctor = (window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as
    | typeof AudioContext
    | undefined
  if (!Ctor) return null
  audioCtx = new Ctor()
  return audioCtx
}

/** One sine note with a click-free attack/decay envelope. */
function playNote(ctx: AudioContext, freq: number, start: number, dur: number, peak: number): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + 0.02)
  gain.gain.linearRampToValueAtTime(0, start + dur)
  osc.connect(gain).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + dur + 0.03)
}

export interface SoundApi {
  enabled: ComputedRef<boolean>
  setEnabled: (on: boolean) => void
  playReady: () => void
}

export function useSound(): SoundApi {
  return {
    enabled: computed(() => enabled.value),
    setEnabled(on: boolean) {
      enabled.value = on
      if (typeof localStorage === 'undefined') return
      try {
        localStorage.setItem(STORAGE_KEY, on ? 'true' : 'false')
      } catch {
        /* ignore quota / disabled */
      }
    },
    playReady() {
      if (!enabled.value) return
      try {
        const ctx = getCtx()
        if (!ctx) return
        if (ctx.state === 'suspended') void ctx.resume()
        const t = ctx.currentTime
        playNote(ctx, 880, t, 0.11, 0.12)            // A5
        playNote(ctx, 1318.51, t + 0.11, 0.12, 0.12) // E6
      } catch {
        /* best-effort: never disrupt the quiz */
      }
    }
  }
}

// Exposed for tests that assert the raw ref identity if needed.
export const _enabledRef: Ref<boolean> = enabled
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/composables/useSound.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useSound.ts tests/composables/useSound.test.ts
git commit -m "feat(sound): synthesized quiz-ready chime + persisted enable flag

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `useRouteProgress` — delayed show/hide state

**Files:**
- Create: `src/composables/useRouteProgress.ts`
- Test: `tests/composables/useRouteProgress.test.ts`

- [ ] **Step 1: Write the failing tests** — `tests/composables/useRouteProgress.test.ts`:

```ts
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { useRouteProgress } from '../../src/composables/useRouteProgress'

describe('useRouteProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useRouteProgress().done() // reset module singleton (clears timer, hides)
  })
  afterEach(() => { vi.useRealTimers() })

  test('does not show before the 120ms delay', () => {
    const p = useRouteProgress()
    p.start()
    expect(p.visible.value).toBe(false)
    vi.advanceTimersByTime(119)
    expect(p.visible.value).toBe(false)
  })

  test('shows after the delay elapses', () => {
    const p = useRouteProgress()
    p.start()
    vi.advanceTimersByTime(120)
    expect(p.visible.value).toBe(true)
  })

  test('done() before the delay cancels the show entirely', () => {
    const p = useRouteProgress()
    p.start()
    vi.advanceTimersByTime(50)
    p.done()
    vi.advanceTimersByTime(200)
    expect(p.visible.value).toBe(false)
  })

  test('done() after shown hides the bar', () => {
    const p = useRouteProgress()
    p.start()
    vi.advanceTimersByTime(120)
    expect(p.visible.value).toBe(true)
    p.done()
    expect(p.visible.value).toBe(false)
  })

  test('start() while already visible does not re-arm', () => {
    const p = useRouteProgress()
    p.start()
    vi.advanceTimersByTime(120)
    p.start() // no-op
    p.done()
    expect(p.visible.value).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/composables/useRouteProgress.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/composables/useRouteProgress.ts`:

```ts
// A slim top progress bar for lazy route loads. Module singleton so the router
// guards and the component share one state. The bar only appears if navigation
// takes longer than SHOW_DELAY_MS, so fast/cached navigations never flash it.

import { ref, computed, type ComputedRef } from 'vue'
import type { Router } from 'vue-router'

const SHOW_DELAY_MS = 120

const _visible = ref(false)
let armTimer: ReturnType<typeof setTimeout> | null = null

function start(): void {
  if (armTimer !== null || _visible.value) return
  armTimer = setTimeout(() => {
    _visible.value = true
    armTimer = null
  }, SHOW_DELAY_MS)
}

function done(): void {
  if (armTimer !== null) {
    clearTimeout(armTimer)
    armTimer = null
  }
  _visible.value = false
}

export interface RouteProgressApi {
  visible: ComputedRef<boolean>
  start: () => void
  done: () => void
}

export function useRouteProgress(): RouteProgressApi {
  return { visible: computed(() => _visible.value), start, done }
}

/** Wire the bar to a router's navigation lifecycle. Call once at bootstrap. */
export function installRouteProgress(router: Router): void {
  router.beforeEach(() => { start() })
  router.afterEach(() => { done() })
  router.onError(() => { done() })
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/composables/useRouteProgress.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useRouteProgress.ts tests/composables/useRouteProgress.test.ts
git commit -m "feat(nav): route-progress state with flicker-avoiding show delay

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `RouteProgress.vue` + mount in `App.vue`

**Files:**
- Create: `src/components/RouteProgress.vue`
- Modify: `src/App.vue`
- Test: `tests/components/RouteProgress.test.ts`

- [ ] **Step 1: Write the failing test** — `tests/components/RouteProgress.test.ts`:

```ts
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import RouteProgress from '../../src/components/RouteProgress.vue'
import { useRouteProgress } from '../../src/composables/useRouteProgress'

describe('RouteProgress.vue', () => {
  beforeEach(() => { vi.useFakeTimers(); useRouteProgress().done() })
  afterEach(() => { vi.useRealTimers() })

  test('renders nothing when not loading', () => {
    const wrapper = mount(RouteProgress, { global: { stubs: { Teleport: true } } })
    expect(wrapper.find('.route-progress').exists()).toBe(false)
  })

  test('renders the bar once progress is visible', async () => {
    const wrapper = mount(RouteProgress, { global: { stubs: { Teleport: true } } })
    useRouteProgress().start()
    vi.advanceTimersByTime(120)
    await nextTick()
    expect(wrapper.find('.route-progress').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/RouteProgress.test.ts`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement** — `src/components/RouteProgress.vue`:

```vue
<script setup lang="ts">
import { useRouteProgress } from '../composables/useRouteProgress'
const progress = useRouteProgress()
</script>

<template>
  <Teleport to="body">
    <Transition name="rp-fade">
      <div v-if="progress.visible.value" class="route-progress" role="status" aria-hidden="true">
        <div class="route-progress-bar" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.route-progress {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 3px;
  z-index: 900;
  overflow: hidden;
  background: transparent;
}
.route-progress-bar {
  height: 100%;
  width: 40%;
  background: var(--accent);
  border-radius: 0 2px 2px 0;
  animation: rp-trickle 1.1s ease-in-out infinite;
}
@keyframes rp-trickle {
  0%   { margin-left: -45%; width: 45%; }
  50%  { width: 60%; }
  100% { margin-left: 100%; width: 45%; }
}
.rp-fade-leave-active { transition: opacity 0.25s ease; }
.rp-fade-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .route-progress-bar { animation: none; width: 100%; opacity: 0.6; }
}
</style>
```

- [ ] **Step 4: Mount in `App.vue`** — add the import and render it next to `LoadingOverlay`:

In `<script setup>` imports add:
```ts
import RouteProgress from './components/RouteProgress.vue'
```
In the template, immediately before `<LoadingOverlay />`, add:
```vue
  <RouteProgress />
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run tests/components/RouteProgress.test.ts && npm run typecheck`
Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/RouteProgress.vue src/App.vue tests/components/RouteProgress.test.ts
git commit -m "feat(nav): top route-progress bar component

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Wire route progress into `main.ts`

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Add the import** near the other composable imports (after `import { router } from './router'`):

```ts
import { installRouteProgress } from './composables/useRouteProgress'
```

- [ ] **Step 2: Install after `app.use(router)`** — in `bootstrap()`, change:

```ts
  const app = createApp(App)
  app.use(router)
  app.mount('#app')
```
to:
```ts
  const app = createApp(App)
  app.use(router)
  installRouteProgress(router)
  app.mount('#app')
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat(nav): install route-progress guards at bootstrap

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `loading.wrap` chime option

**Files:**
- Modify: `src/composables/useLoading.ts`

- [ ] **Step 1: Add the import** at the top of `src/composables/useLoading.ts` (after the vue import):

```ts
import { useSound } from './useSound'
```

- [ ] **Step 2: Widen the `wrap` type** in the `LoadingApi` interface — change:

```ts
  wrap: <T>(fn: () => Promise<T>, msg: LoadingState) => Promise<T>
```
to:
```ts
  wrap: <T>(fn: () => Promise<T>, msg: LoadingState, opts?: { chime?: boolean }) => Promise<T>
```

- [ ] **Step 3: Update the implementation** — replace the existing `async wrap<T>(fn, msg) {...}` with:

```ts
    async wrap<T>(fn: () => Promise<T>, msg: LoadingState, opts?: { chime?: boolean }): Promise<T> {
      state.value = { ...msg }
      let result: T
      try {
        result = await fn()
      } finally {
        state.value = null
      }
      // Success path only — a thrown fn never reaches here. Chime after the
      // overlay has hidden, so the sound marks "ready", not "still loading".
      if (opts?.chime) useSound().playReady()
      return result
    }
```

- [ ] **Step 4: Typecheck + existing tests**

Run: `npm run typecheck && npx vitest run tests/composables/useSound.test.ts`
Expected: PASS (no `useLoading` unit test exists; the chime path is a one-line success-only call covered by `useSound`'s tests and exercised end-to-end at the call sites + manual verification).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useLoading.ts
git commit -m "feat(loading): optional success chime on wrap()

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Settings → Display sound toggle

**Files:**
- Modify: `src/modules/settings/SettingsDisplay.vue`

- [ ] **Step 1: Add the composable** — in `<script setup>` of `SettingsDisplay.vue`, after the existing imports add:

```ts
import { useSound } from '../../composables/useSound'
```
and after the `usePromptSize(...)` lines add:
```ts
const sound = useSound()
```

- [ ] **Step 2: Add the toggle row** — at the very top of the `<section>` template (immediately after `<section>`), insert:

```vue
    <!-- ── Quiz-ready sound ─────────────────────────────────────── -->
    <div class="sound-row">
      <div class="sound-copy">
        <div class="field-label">Quiz-ready sound</div>
        <p class="sound-blurb">A soft chime when an AI quiz finishes loading.</p>
      </div>
      <div class="segmented sound-toggle">
        <button :class="{ active: sound.enabled.value }" @click="sound.setEnabled(true)">On</button>
        <button :class="{ active: !sound.enabled.value }" @click="sound.setEnabled(false)">Off</button>
      </div>
    </div>

    <hr class="settings-divider" />
```

- [ ] **Step 3: Add scoped styles** — inside the `<style scoped>` block, append:

```css
.sound-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.sound-copy { min-width: 0; }
.sound-blurb {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13.5px;
  color: var(--ink-soft);
  margin: 4px 0 0;
}
.sound-toggle { flex: none; }
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/settings/SettingsDisplay.vue
git commit -m "feat(settings): quiz-ready sound on/off toggle

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Fire the chime at quiz-load points

**Files (modify):**
- `src/modules/prepositions/SentenceQuizSetup.vue`
- `src/modules/prepositions/RemedialSetup.vue`
- `src/modules/declension/ArticleQuizSetup.vue`
- `src/modules/adjectives/QuizRunner.vue`
- `src/modules/konjunktiv/QuizSetup.vue`
- `src/modules/passiv/QuizSetup.vue`
- `src/modules/verbs/VerbSentenceRunner.vue`

- [ ] **Step 1: Opt the six `loading.wrap` sites into the chime.** In each of the first six files, find the `loading.wrap(` call. It has the form:

```ts
await loading.wrap(
  async () => { /* …generation… */ },
  { title: '…', subtitle: '…' }
)
```
Append a third argument `{ chime: true }` to that call — i.e. after the message-options object:
```ts
await loading.wrap(
  async () => { /* …generation… */ },
  { title: '…', subtitle: '…' },
  { chime: true }
)
```
Change nothing else in these files. (The exact `title`/`subtitle` differ per file — leave them as they are.)

- [ ] **Step 2: Chime the progressive verb runner on first sentence.** In `src/modules/verbs/VerbSentenceRunner.vue`:

(a) Add to the imports (alongside the other composable imports):
```ts
import { useSound } from '../../composables/useSound'
```
(b) In `<script setup>`, near the other top-level state declarations (e.g. just after `const toast = useToast()`), add:
```ts
const sound = useSound()
let chimed = false
```
(c) In the `generateProgressively({ ... })` call, update the `onResults` callback to chime once when the first sentence(s) arrive. Change:
```ts
    onResults: (sentences) => {
      for (const s of sentences) { deck.value.push(s); answers.value.push('') }
      if (awaitingNext.value) tryAdvance()
      nextTick(() => { if (deck.value.length === sentences.length) inputRef.value?.focus() })
    },
```
to:
```ts
    onResults: (sentences) => {
      for (const s of sentences) { deck.value.push(s); answers.value.push('') }
      if (!chimed && deck.value.length > 0) { chimed = true; sound.playReady() }
      if (awaitingNext.value) tryAdvance()
      nextTick(() => { if (deck.value.length === sentences.length) inputRef.value?.focus() })
    },
```

- [ ] **Step 3: Typecheck + full suite**

Run: `npm run typecheck && npm test`
Expected: PASS (the pre-existing `tests/components/ThemeToggle.test.ts` 5s-timeout flake under parallel load is the only acceptable miss; it passes in isolation).

- [ ] **Step 4: Commit**

```bash
git add src/modules/prepositions/SentenceQuizSetup.vue src/modules/prepositions/RemedialSetup.vue src/modules/declension/ArticleQuizSetup.vue src/modules/adjectives/QuizRunner.vue src/modules/konjunktiv/QuizSetup.vue src/modules/passiv/QuizSetup.vue src/modules/verbs/VerbSentenceRunner.vue
git commit -m "feat(sound): chime when AI quizzes finish loading

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Full verification

- [ ] **Step 1: Full suite** — `npm test` (623+ tests green; ThemeToggle flake tolerated, confirm with `npx vitest run tests/components/ThemeToggle.test.ts` if it trips).
- [ ] **Step 2: Build** — `npm run build` (vue-tsc clean + vite build succeeds).
- [ ] **Step 3: Manual smoke** (`npm run dev`): navigate between pages and confirm the top bar appears only on slower loads (not a flash on instant ones); start an AI quiz (e.g. Verbs → Sentence quiz) and confirm a chime plays when it's ready; toggle Settings → Display → Quiz-ready sound Off and confirm silence; reload and confirm the toggle persists.

---

## Self-Review

**Spec coverage:** Page progress bar → Tasks 2,3,4. Chime synth + pref → Task 1. Chime triggers (6 wrap sites + verb runner) → Tasks 5,7. Settings toggle → Task 6. Reduced-motion + flicker delay + autoplay/try-catch safety → Tasks 1,2,3 (implemented in the code). Testing → Tasks 1,2,3 + Task 8. All spec sections covered.

**Placeholder scan:** No TBD/TODO; every code step has complete code. Task 7's six-site edit describes the exact transform (append `{ chime: true }`) rather than pasting six near-identical blocks, because each file's `title`/`subtitle` differ — the transform is unambiguous.

**Type consistency:** `useSound()` → `{ enabled: ComputedRef<boolean>, setEnabled(on), playReady() }` used identically in Tasks 1, 5, 6, 7. `useRouteProgress()` → `{ visible, start, done }` + `installRouteProgress(router)` used in Tasks 2, 3, 4. `loading.wrap(fn, msg, opts?)` defined in Task 5 and called with `{ chime: true }` in Task 7. Names consistent throughout.
