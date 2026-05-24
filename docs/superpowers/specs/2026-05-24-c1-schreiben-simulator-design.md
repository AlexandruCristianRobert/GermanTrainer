# Sprint 2 — Goethe C1 Schreiben Simulator (Module 1)

**Status:** Spec — pending approval
**Date:** 2026-05-24
**Scope:** One new module — a timed mock-exam shell that runs the Goethe C1 Schreiben productive task (Forumsbeitrag + formelle E-Mail in 75 minutes) and grades both via the existing Module 10 writing-tutor pipeline.
**Out of scope (deferred):** Module 2 (telc Sprachbausteine) and Module 7 (Redewendungen) — separate sprints. The compass plan groups all three under "Sprint 2" but they are architecturally distinct enough to spec separately.

## 1. Purpose

Module 10 (Writing Tutor, Sprint 1B) covers the "always-on" rubric-graded essay surface. What it does NOT cover is the **timed exam shell** — sitting two Schreiben tasks back-to-back under a 75-minute clock with auto-submit at zero, the way the real Goethe-Zertifikat C1 productive module is structured.

This module adds exactly that shell. It is the single highest-leverage addition for exam-bound users — without it, no amount of solo-prompt grading reproduces the time pressure that is the dominant failure mode in the real exam.

The grader, the rubric, the prompt catalogue, the `WritingDraft` table, and the criteria-rendering UI are all reused as-is. The new surface is the **session** (timer + two-task switcher + auto-submit + combined report).

## 2. Context — current repo state

- **Stack:** Vue 3 + TypeScript + Vite + Naive UI + Vue Router + Dexie + `@google/genai` (Gemini, `gemini-2.5-flash`).
- **Module 10 is shipped** at `src/modules/writing/`. It exports `gradeAndPersist`, the `WritingDraft` Dexie table, the `GOETHE_C1` rubric, and the criteria-list rendering markup. All four are reused unchanged.
- **Modules 3 + 4** (Konjunktiv I, Passiv) are also shipped from Sprint 1A. They establish the home-tile-and-route conventions this module follows.
- **Home page** currently has 7 tiles (I–Nouns, II–Adjectives, III–Verbs, IV–Konjunktiv I, V–Passiv, VI–Writing tutor, VII–Settings). The simulator inserts at numeral VII; Settings shifts to VIII; breadcrumb bumps `I/VII` → `I/VIII`.
- **History** uses `QuizHistoryType` discriminated union with module-namespaced meta. Pattern is documented in `src/composables/useQuizHistory.ts` and the cascade files (`quiz-type-labels.ts`, `useQuizStats.ts`, `HistoryPage.vue`).
- **Dexie schema** is at v5 from Sprint 1B (`writingDrafts` added). Module 1 bumps to v6 adding one new table: `simulatorSessions`.

## 3. Architecture

### 3.1 File layout

```
src/
├── modules/
│   └── simulator-c1/
│       ├── SimulatorHome.vue            # entry — start new / resume current / recent history
│       ├── SimulatorRun.vue             # timer + two-task switcher + submit
│       └── SimulatorResult.vue          # combined report + per-task panels
├── composables/
│   └── useSimulatorC1.ts                # createSession, resumeSession, submitAndGrade
└── data/
    └── simulatorC1.ts                   # types + EXAM_DURATION_MS + WEIGHTING constants
```

### 3.2 Files modified (additive only)

- `src/db/index.ts` — add `simulatorSessions` Dexie table; schema version bump to 6.
- `src/router.ts` — 3 new routes (home, run, result).
- `src/composables/useQuizHistory.ts` — extend `QuizHistoryType` with `'simulator-c1'`; extend `QuizHistoryMeta` with `sessionId`, `task1Score`, `task2Score`, `combinedScore`, `passes`, `durationMs`.
- `src/components/charts/quiz-type-labels.ts` — exhaustive `Record<QuizHistoryType, …>` entries.
- `src/composables/useQuizStats.ts` — exhaustive bucket entries.
- `src/modules/history/HistoryPage.vue` — label, ordering, and a writing-grade-style render override that surfaces combined score + band.
- `src/modules/home/Home.vue` — new tile at VII, Settings renumbered to VIII, breadcrumb bumped.

### 3.3 What does NOT change

- `useWritingGrader.ts` — reused as is. Both task grades go through `gradeAndPersist`.
- `writingPrompts.ts` / `rubrics.ts` — reused. Random prompt pair is drawn from the existing catalogue.
- `writingDrafts` Dexie table — reused. Each task creates one `WritingDraft` row, exactly the same shape Module 10 produces.
- Module 10's UI — unchanged. The simulator does NOT route through `EditorSurface.vue`; it owns its own runner.

## 4. Module 1 — detail

### 4.1 Types (`src/data/simulatorC1.ts`)

```ts
// Goethe C1 Schreiben Simulator — types and constants.

export const EXAM_DURATION_MS = 75 * 60 * 1000      // 75 minutes
export const TASK1_WEIGHT = 0.6                      // Forumsbeitrag (heavier)
export const TASK2_WEIGHT = 0.4                      // formelle E-Mail (lighter)
export const PASSING_SCORE = 60                      // out of 100

export type SimulatorStatus =
  | 'in_progress'   // timer running; user can switch tasks and edit
  | 'submitted'     // user clicked Submit, grading in flight or queued
  | 'graded'        // both tasks graded; result page reachable
  | 'abandoned'     // user clicked Abandon; row preserved but locked

export interface SimulatorSession {
  id: string                       // crypto.randomUUID()
  startedAt: number                // ms epoch
  endsAt: number                   // startedAt + EXAM_DURATION_MS
  status: SimulatorStatus
  task1PromptId: string            // resolves via getPromptById to a Forumsbeitrag (Goethe C1)
  task1DraftId: string             // WritingDraft.id created at session-creation time
  task2PromptId: string            // resolves to a formelle E-Mail (Goethe C1)
  task2DraftId: string
  submittedAt?: number             // when user clicked Submit (or timer ran out)
  gradedAt?: number                // when the second grade completed
  abandonedAt?: number
}

/** Computed per-session, not persisted as a separate row. */
export interface SimulatorReport {
  task1Score: number | null        // null if grading failed
  task2Score: number | null
  combinedScore: number | null     // task1*0.6 + task2*0.4, rounded to int
  passes: boolean                  // combinedScore >= PASSING_SCORE
  task1Band: string | null
  task2Band: string | null
}
```

### 4.2 Session lifecycle

**Creation (`createSession`):**

1. Filter the writing-prompts catalogue for Goethe-C1 prompts of each task type:
   - `forumsbeitrag` prompts where `defaultRubric === 'goethe-c1'`.
   - `formelle-email` prompts where `defaultRubric === 'goethe-c1'`.
2. Pick one of each at random.
3. Create two `WritingDraft` rows (`crypto.randomUUID()` ids), both with `text: ''`, `wordCount: 0`, `rubric: 'goethe-c1'`, and the new field `simulatorSessionId` set to the new session id. (See §4.3 — `WritingDraft` already supports an unknown-keys spread because the table is `'&id, promptId, gradedAt, createdAt'` and Dexie ignores unindexed extras.)
4. Create the `SimulatorSession` row with `status: 'in_progress'`, `startedAt: now`, `endsAt: now + EXAM_DURATION_MS`, the four ids resolved.
5. Return the session.

**Resume on reload (`resumeSession(id)`):**

1. Load the session by id.
2. Compute `remaining = max(0, endsAt - Date.now())`.
3. If session is `in_progress` and `remaining === 0`, transition to `submitted` (auto-submit on next mount). Persist.
4. Load both `WritingDraft` rows for live word-count display.

**Submit (`submitAndGrade`):**

1. Set `status: 'submitted'`, `submittedAt: now`. Persist.
2. Pin each task's draft text (autosave debounce → flush) into the corresponding `WritingDraft` row.
3. Call `gradeAndPersist` sequentially for each task. Each call returns an updated `WritingDraft` with `.result` set. (Sequential, not parallel — keeps grader request count predictable and reuses the existing one-retry logic per call.)
4. On both grades complete, set `status: 'graded'`, `gradedAt: now`. Persist.
5. Write one history entry: `{ type: 'simulator-c1', meta: { sessionId, task1Score, task2Score, combinedScore, passes, durationMs } }`. `count: 1, correct: passes ? 1 : 0`.
6. Return the session + the two updated drafts.

**Abandon:**

1. Set `status: 'abandoned'`, `abandonedAt: now`. Persist.
2. No history entry — abandoned exams don't count.

### 4.3 `WritingDraft` reuse

The simulator does NOT add a typed field for `simulatorSessionId` to the existing `WritingDraft` interface (that would force a typecheck cascade across all writing-module code). Instead the field is added at runtime to the row written, and the simulator looks it up via a query rather than narrowing on the type:

```ts
// In useSimulatorC1.ts — when finding "the simulator drafts for session X":
const drafts = await db.writingDrafts
  .filter(d => (d as unknown as { simulatorSessionId?: string }).simulatorSessionId === sessionId)
  .toArray()
```

The Dexie `&id, promptId, gradedAt, createdAt` index doesn't include `simulatorSessionId`, so this is a full-table filter — acceptable because the table is small (drafts are per-user, capped by real-world authoring rate) and only used at session resume / result-page load.

### 4.4 UX flow

#### `SimulatorHome.vue`

- Section header with disclaimer ribbon (same copy as Module 10).
- A primary CTA box:
  - If an `in_progress` session exists: "Resume current exam" + time-remaining display + "Abandon" secondary button (with `confirm()`).
  - If no active session: "Start new exam" button.
- A recent-runs list below: last 5 `'simulator-c1'` history entries, each row showing date, combined score, band-ish chip (P/F), duration actually taken.

#### `SimulatorRun.vue`

Single page; three vertical zones:

1. **Timer bar** (sticky at top): countdown `mm:ss`, red below 5 minutes. Computed each second from `endsAt - Date.now()`. When it hits 0, the page transitions to `submitted` and routes to `SimulatorResult.vue`.
2. **Task switcher** (`n-tabs` or custom segmented control): "Aufgabe 1 · Forumsbeitrag" / "Aufgabe 2 · E-Mail". Each tab badges with current word count vs. target.
3. **Active task panel** (per selected tab):
   - Prompt card (collapsible, defaults open) — title, prompt text, target words, suggested minutes.
   - Plain textarea (same shape as Module 10's draft mode). Word counter at bottom-right, target-band colouring.
   - Autosave debounce 1s into the corresponding `WritingDraft` row.

Bottom of page:
- "Submit & grade" button — disabled until BOTH tasks have ≥ 60% of their min target words. Confirmation prompt: "Submit both tasks? You can't keep editing afterwards."
- "Abandon exam" secondary button (red text, confirms).

Mid-exam reload: timer reads from `endsAt`, no progress lost.

#### `SimulatorResult.vue`

- Section header with combined score block:
  - Combined score (big number) `/ 100`.
  - Pass / fail badge.
  - Per-task chips: `Aufgabe 1: 78 / 100 · C1` / `Aufgabe 2: 65 / 100 · C1-`.
  - Time taken: `mm:ss`.
- Disclaimer line about Goethe weighting being applied and grader limits.
- Two per-task expandable panels, each rendering the same criteria/inline-notes/paragraph-feedback UI as `EditorSurface.vue` review mode. (For Sprint 2 we duplicate the rendering markup into a local block; a shared component extraction is deferred until a third place needs it.)
- "Start another exam" CTA + "Back to home" secondary.

### 4.5 Routes

```
/simulator                        → SimulatorHome.vue
/simulator/run/:sessionId         → SimulatorRun.vue
/simulator/result/:sessionId      → SimulatorResult.vue
```

### 4.6 Auto-submit behaviour (timer reaches zero)

- When `remaining` hits 0 in the run page:
  - The textareas freeze (`readonly`).
  - A modal: "Time's up. Grading both tasks now…"
  - `submitAndGrade` runs (no extra user click — auto-submit).
  - On completion, route to result.

- If the user has the tab closed when the timer expires and reopens later:
  - On `SimulatorHome.vue` mount, if an `in_progress` session has `endsAt < now`, mark it `submitted` and offer "Grade now" / "Abandon". (We don't auto-grade in the background because that costs API calls without user intent. The submission state is reached; grading is the user's call.)

### 4.7 History extension

```ts
export type QuizHistoryType =
  | …existing…
  | 'simulator-c1'

export interface QuizHistoryMeta {
  …existing…
  sessionId?: string
  task1Score?: number
  task2Score?: number
  combinedScore?: number
  passes?: boolean
  // durationMs already exists as a top-level QuizHistoryEntry field
}
```

`HistoryPage.vue` — additive only:
- Label `'simulator-c1' → "Goethe C1 · Mock exam"`.
- A render override (mirroring writing-grade) showing `combinedScore/100 · pass/fail` and a chip row for task1/task2 scores.

### 4.8 Edge cases

- **No API key on Submit:** banner + toast (same as Module 10). Drafting continues to work; "Submit & grade" disabled.
- **One grade succeeds, the other fails:** the session status stays `submitted` (not `graded`). Result page shows the successful task's full panel and a "Grade failed for task N — retry" button for the other.
- **User refreshes during grading:** `submitAndGrade` is idempotent — if a draft already has `.result`, it isn't re-graded. If only one has `.result`, only the missing one is re-graded.
- **Empty draft on Submit:** the disabled button gate (60% floor on BOTH tasks) prevents this. If the user wants to submit early after only one task, they have to manually type 60% of the minimum on the other — intentional, mirrors real-exam consequence.
- **Multiple `in_progress` sessions:** a user could theoretically open the home page in two tabs and click Start twice. We accept this and treat each session as independent. The home page picks "the most recent in_progress session" for the Resume CTA.
- **`writingDrafts` table missing the row referenced by `task1DraftId`:** treat as data corruption — `SimulatorRun` shows an error banner, `SimulatorHome` lets the user abandon the session.

### 4.9 Disclaimer copy

On every screen of the simulator, render the same disclaimer Module 10 uses, with one addition:

> *Bewertungen sind indikativ und ersetzen keinen offiziellen Prüfer. Die hier verwendete 60/40-Gewichtung folgt der dokumentierten Goethe-Schreiben-Bewertung; die offiziellen Modellsätze sind die maßgebliche Vorbereitungsquelle.*

## 5. Cross-cutting plumbing

### 5.1 Dexie schema v6

`src/db/index.ts`: add `simulatorSessions` table.

```ts
// New table
simulatorSessions: '&id, status, startedAt'
```

Primary key on `id`. Indexed on `status` (cheap "find the active session" lookup) and `startedAt` (date sort). The full session shape is stored on each row. Migration: additive only, no upgrade callback.

### 5.2 History entry shape

`useQuizHistory.saveQuizRun({ type: 'simulator-c1', startedAt, finishedAt, durationMs, count: 1, correct: passes ? 1 : 0, meta: { sessionId, task1Score, task2Score, combinedScore, passes } })`.

`durationMs` here is the actual time the user took (`submittedAt - startedAt`), NOT the 75-minute allotted window. Two different exams completed in 50 min and 75 min are usefully distinct.

### 5.3 Home page tile

```ts
{
  numeral: 'VII',
  route: 'simulator-c1',
  de: 'Goethe C1 · Schreiben',
  title: 'Mock exam',
  desc: 'Sit a timed Goethe C1 Schreiben mock — Forumsbeitrag und formelle E-Mail in 75 Minuten, beide automatisch nach der offiziellen Rubrik bewertet.',
  meta: '75 min · 2 Aufgaben · AI-graded'
}
```

Settings tile renumbered from VII → VIII. Breadcrumb bumped `Frontispiece · I/VII` → `Frontispiece · I/VIII`.

### 5.4 Settings

No changes. Reads `geminiApiKey` and `model` from the existing singleton.

### 5.5 Error handling

Four failure modes:

1. **No API key on Submit:** banner + toast, button disabled. Drafting still works.
2. **One grade fails, one succeeds:** result page shows the success panel and a "Retry grading task N" button next to the failure.
3. **Both grades fail:** session stays `submitted`; result page shows a "Both grades failed — try again" banner with retry.
4. **Network error during autosave:** silent retry on next debounce tick (Dexie writes are local; this only fires on extreme browser-storage failure).

### 5.6 Cost & rate-limit posture

A graded session costs:
- 2 grader calls (one per task) — each is a "large grade" call as defined in Module 10 (≈ 1.7 k tokens in, 1.5–2.5 k tokens out).
- Optional paragraph-upgrade calls — same as Module 10.

Total per session ≈ 3–5 k input tokens + 3–5 k output tokens. At `gemini-2.5-flash` pricing, low single-digit cents per mock exam. Setup screen surfaces the hint *"≈ 2 große Bewertungsaufrufe pro Prüfung"* next to the Start button.

### 5.7 Testing

```
tests/composables/
└── useSimulatorC1.spec.ts
```

Composable tests cover:
- `createSession` returns a row with both tasks pointing to Goethe-C1 prompts of the right types.
- `createSession` fails cleanly when the catalogue has zero matching prompts of either type.
- `resumeSession` recomputes `remaining` from wall-clock time.
- `resumeSession` auto-transitions to `submitted` when `endsAt < now` and status was `in_progress`.
- `computeReport(session, draftA, draftB)` applies the 60/40 weighting and rounds to integer.
- `computeReport` flags `passes` iff combined ≥ 60.
- `computeReport` returns nulls when one draft has no result.

No Vue component tests (matches Sprint 1A/1B parity — manual smoke at DoD).

## 6. Out of scope

- **Module 2 — telc Sprachbausteine** — separate sprint.
- **Module 7 — Redewendungen** — separate sprint.
- **Real-time Reading / Listening modules** — out of scope for the writing-focused simulator.
- **Multi-session parallel exams** — one user, one machine; if they really want two, two tabs work.
- **Server-side time enforcement** — personal-use posture; clock is local browser time. A user can game it by changing their system clock. Not a meaningful threat for a personal trainer.
- **Custom prompt selection** — random catalogue draw only. Choosing your own prompts defeats the simulator's value.

## 7. Caveats

- **Personal-use posture preserved.** No backend proxy. API key in IndexedDB. The simulator never leaves the user's machine.
- **60/40 weighting.** This matches the documented Goethe Schreiben-module weighting (Diskussionsbeitrag heavier than the Mitteilung). The implementer should verify against the current Modellsatz when writing the rubric integration; if the weighting differs in a future revision, change the two `TASK*_WEIGHT` constants.
- **`gemini-2.5-flash` is the grader.** The disclaimer ribbon must be visible on home / run / result — three surfaces.
- **The catalogue currently has 2 forum prompts and 2 email prompts** (Goethe C1). Re-rolls within a session are not supported — once a session is created, the pair is locked. A user wanting more variety adds more prompts to `writingPrompts.ts`.

## 8. Definition of done

- `/simulator` is reachable from the home page; tile lands cleanly.
- "Start new exam" creates a session, randomly pairs prompts, and lands in `/simulator/run/:sessionId` with timer counting down.
- Tab switcher swaps between Aufgabe 1 and Aufgabe 2; word counters update live; autosave persists text to `writingDrafts`.
- "Submit & grade" disabled until both tasks ≥ 60% of min word target; on click, runs both grades sequentially and lands on `/simulator/result/:sessionId`.
- Result page shows weighted combined score, P/F badge, per-task chips, time taken, and two expandable per-task panels with full criteria/inline-notes/paragraph-feedback UI.
- Timer reaches 0 → auto-submit kicks in; if the tab is closed at the time, the next visit to `/simulator` shows "Time's up — grade now or abandon."
- A `'simulator-c1'` history entry appears in `/history` with combined score, band-style chip, and per-task scores.
- Composable tests pass (`npm test`); typecheck clean (`npm run typecheck`).
- Disclaimer ribbon visible on all three simulator screens.
