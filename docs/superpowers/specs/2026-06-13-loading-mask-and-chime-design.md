# App Loading Mask + Quiz-Ready Chime — Design

**Status:** approved (2026-06-13)

## Goal

Two related UX additions to the German Trainer app:

1. **Page-load mask** — a slim top progress bar shown while a lazily-loaded route's
   code chunk is fetched, so navigation never looks frozen.
2. **Quiz-ready chime** — a short, soft sound played the moment an AI-generated quiz
   ("test") finishes loading and is ready to start, with a Settings toggle to mute it.

These are independent of each other and ship together.

## Non-goals (YAGNI)

- No sound on instant (non-AI) quizzes — they have nothing to wait for.
- No sound on grading/assessment loads (writing grade, C1 simulator result/grade, level
  assessment) — those aren't "a test loading."
- No change to the existing heavy blur `LoadingOverlay` (it stays exclusively for AI
  generation waits). No new audio asset files (the chime is synthesized).
- No global sound framework — one `playReady()` is all that's needed.

## Existing context

- `useLoading` is a module-singleton overlay (`show`/`hide`/`wrap`) rendered by
  `LoadingOverlay.vue` (teleported, animated dots) in `App.vue`. AI generation already
  uses `loading.wrap(fn, msg)`.
- Routes are lazy: `() => import(...)` in `src/router.ts`. No indicator during chunk fetch.
- Display preferences use a localStorage-backed pattern (`usePromptSizes`, surfaced in
  `SettingsDisplay.vue`). There is **no audio** anywhere in the codebase yet.
- `useSettings` (Dexie) is for AI config and is **not** a global reactive singleton, so the
  sound pref will use the synchronous localStorage pattern instead.

## Component 1 — Route progress bar

**`src/composables/useRouteProgress.ts`** — framework-light module singleton.
- State: `visible: Ref<boolean>` (exposed read-only).
- `start()` — arms a timer; only sets `visible = true` after `SHOW_DELAY_MS` (120ms), so
  fast/cached navigations never flash the bar.
- `done()` — clears the arming timer and sets `visible = false`. If the navigation
  finished within the 120ms delay, the bar was never shown, so this is a no-op visually.
  When it was shown, the component's CSS exit transition (fill-to-100% + fade) smooths the
  hide — no extra timing logic is needed in the composable.
- `installRouteProgress(router)` — wires `router.beforeEach(() => { start(); return true })`,
  `router.afterEach(() => done())`, and `router.onError(() => done())`. Called once in
  `main.ts` after the router is created and before `app.mount`.
- Pure timer logic is testable with fake timers; no DOM access in the composable.

**`src/components/RouteProgress.vue`** — presentational.
- Teleported to `<body>`; fixed top, full width, ~3px tall, accent-coloured.
- While `visible`: an indeterminate "trickle" animation (CSS). On hide: fill to 100% then
  fade (CSS transition). `z-index` above page content but below the AI overlay (which is
  1000) — use ~900.
- `@media (prefers-reduced-motion: reduce)`: no trickle animation; a static bar that simply
  shows/hides.
- Mounted once in `App.vue` alongside `LoadingOverlay`.

## Component 2 — Quiz-ready chime

**`src/composables/useSound.ts`** — module singleton.
- `enabled: Ref<boolean>` hydrated from `localStorage['gt:soundEnabled']` (default **true**;
  any value other than the string `'false'` is treated as enabled).
- `setEnabled(on: boolean)` — updates the ref and writes localStorage.
- `playReady()` —
  - returns immediately if `!enabled.value`;
  - lazily creates one shared `AudioContext` (`new (window.AudioContext || webkitAudioContext)()`)
    on first use; if `audioCtx.state === 'suspended'`, calls `resume()`;
  - synthesizes a short two-note chime: an `OscillatorNode` (sine) through a `GainNode`,
    scheduling note 1 (~880Hz, A5) then note 2 (~1318.5Hz, E6), each ~110ms, with a gain
    envelope ramping 0 → 0.12 → 0 (attack/decay) so there is no click; total ≈ 200–230ms;
  - the entire body is wrapped in `try/catch` — a missing/blocked/throwing AudioContext is
    swallowed (sound is best-effort and must never disrupt a quiz).
- Exposes `{ enabled, setEnabled, playReady }`.

## Component 3 — Chime trigger wiring

**`useLoading.wrap` gains a third optional arg:** `wrap<T>(fn, msg, opts?: { chime?: boolean })`.
- Behaviour unchanged except: when `opts?.chime` is true **and** `fn` resolves without
  throwing, call `useSound().playReady()` after hiding the overlay (in the success path,
  never in the `finally`/error path). Import is local to avoid a cycle at module load.

**Opt-in call sites (quiz-generation only):** add `{ chime: true }` to the `loading.wrap`
call in:
- `src/modules/prepositions/SentenceQuizSetup.vue`
- `src/modules/prepositions/RemedialSetup.vue`
- `src/modules/declension/ArticleQuizSetup.vue`
- `src/modules/adjectives/QuizRunner.vue`
- `src/modules/konjunktiv/QuizSetup.vue`
- `src/modules/passiv/QuizSetup.vue`

**Progressive runner (no `wrap`):** in `src/modules/verbs/VerbSentenceRunner.vue`, call
`useSound().playReady()` exactly once, when the **first** sentence arrives in `onResults`
(the moment the quiz opens). Guard with a `chimed` flag so later batches don't re-chime.

**Explicitly NOT wired:** `writing/EditorSurface.vue` (draft grading),
`simulator-c1/SimulatorRun.vue` + `SimulatorResult.vue` (generation/grading of the exam —
left out for v1; the C1 mock isn't a quick "test loaded" moment), and
`charts/LevelAssessmentPanel.vue` (assessment). These can be added later if wanted.

## Component 4 — Settings toggle

In `src/modules/settings/SettingsDisplay.vue`, add a small row (above or below the type-size
fields) — **"Quiz-ready sound"** with an On/Off control bound to `useSound().enabled` /
`setEnabled`. Use the app's existing `.segmented` On/Off button style (as the verb/prep
setups use for their toggles) for visual consistency. A one-line blurb: "A soft chime when
an AI quiz finishes loading."

## Data flow

- **Navigation:** user clicks a link → `beforeEach` → `start()` (timer) → (if >120ms) bar
  shows → chunk loads, component resolves → `afterEach` → `done()` → bar fills + fades.
- **Quiz load (overlay path):** Setup calls `loading.wrap(generate, msg, { chime: true })`
  → overlay shows → generation resolves → overlay hides → `playReady()` (if enabled) →
  navigate to runner.
- **Quiz load (progressive path):** VerbSentenceRunner mounts → streams batches →
  first sentence arrives → `playReady()` once.
- **Mute:** SettingsDisplay toggles `enabled` → localStorage write → subsequent
  `playReady()` calls are no-ops.

## Error handling / edge cases

- **Autoplay policy:** `playReady()` only fires after the user has clicked Start/Generate
  (a gesture), so the AudioContext is permitted; `resume()` covers a suspended context.
- **No AudioContext / exception:** swallowed by try/catch; quiz unaffected.
- **Fast navigation:** 120ms show-delay prevents bar flicker; `done()` cancels the pending
  show if the route resolved in time.
- **Reduced motion:** bar animation disabled via media query; the chime is unaffected
  (sound ≠ motion) but remains user-mutable via the toggle.
- **Generation failure:** `wrap` rejects → no chime (success-only). Verb runner only chimes
  on a real first sentence, not on the all-failed error path.

## Testing

- `tests/composables/useRouteProgress.test.ts` — fake timers: `start()` does not show before
  120ms; shows after; `done()` before 120ms cancels (never visible); `done()` after shown
  hides. No router needed (call `start`/`done` directly).
- `tests/composables/useSound.test.ts` — `enabled` defaults true with empty localStorage;
  `setEnabled(false)` persists `'false'` and makes `playReady()` a no-op; `playReady()` does
  not throw when `AudioContext` is undefined (delete from global) or throws (mock that
  throws); enabled round-trips from a stored value.
- `tests/components/RouteProgress.test.ts` — mounts hidden by default; renders the bar
  element when the composable is `visible`.
- Existing full suite must stay green; `npm run build` clean.

## File structure summary

- New: `src/composables/useRouteProgress.ts`, `src/components/RouteProgress.vue`,
  `src/composables/useSound.ts`.
- Modified: `src/main.ts` (install route progress), `src/App.vue` (mount RouteProgress),
  `src/composables/useLoading.ts` (chime option), `src/modules/settings/SettingsDisplay.vue`
  (toggle), and the 6 quiz-generation `loading.wrap` sites + `VerbSentenceRunner.vue`.
- Tests: 3 new test files.
