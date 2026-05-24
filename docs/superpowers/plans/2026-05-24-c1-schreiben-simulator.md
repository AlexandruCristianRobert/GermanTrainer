# Sprint 2 — Goethe C1 Schreiben Simulator · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a 75-minute timed Goethe C1 Schreiben mock-exam shell that wraps the existing Module 10 grader. Two tasks (Forumsbeitrag + formelle E-Mail) back-to-back under a single countdown, weighted 60/40 for a combined score.

**Architecture:** One new module folder, one new composable, one new data file, one new Dexie table (`simulatorSessions`). Drafts reuse the existing `writingDrafts` table from Sprint 1B. Grading reuses `gradeAndPersist` unchanged. The new surface is the session (timer + two-task switcher + auto-submit + combined report).

**Tech Stack:** Vue 3 (`<script setup lang="ts">`), TypeScript, Vue Router, Dexie (one new table), Vitest. The grader and rubric pipeline (`useWritingGrader`, `GOETHE_C1`, etc.) come from Module 10 and aren't touched.

**Spec:** `docs/superpowers/specs/2026-05-24-c1-schreiben-simulator-design.md` (commit `d357547`).

**Predecessors:** Sprint 1A (Modules 3 + 4) and Sprint 1B (Module 10) are shipped on `main`. Every infrastructure piece — Gemini client, history union, cascade files, home-tile pattern, Vue page conventions — is established. Mirror them.

---

## File map

**Files created**

| Path | Responsibility |
|---|---|
| `src/data/simulatorC1.ts` | Constants (`EXAM_DURATION_MS`, `TASK1_WEIGHT`, `TASK2_WEIGHT`, `PASSING_SCORE`) + types (`SimulatorStatus`, `SimulatorSession`, `SimulatorReport`). |
| `src/composables/useSimulatorC1.ts` | `computeRemaining`, `computeReport`, `createSession`, `resumeSession`, `abandonSession`, `submitAndGrade`. |
| `src/modules/simulator-c1/SimulatorHome.vue` | Entry — Start new / Resume current / recent history. |
| `src/modules/simulator-c1/SimulatorRun.vue` | Timer + two-task switcher + textareas + Submit/Abandon. |
| `src/modules/simulator-c1/SimulatorResult.vue` | Combined report + per-task expandable panels. |
| `tests/composables/useSimulatorC1.test.ts` | Pure-function tests (compute helpers + session CRUD with `fake-indexeddb`). |

**Files modified (additions only)**

| Path | Change |
|---|---|
| `src/db/index.ts` | Add `simulatorSessions` Dexie table; schema version bump v5 → v6. |
| `src/router.ts` | +3 new routes (home / run / result). |
| `src/composables/useQuizHistory.ts` | Extend `QuizHistoryType` with `'simulator-c1'`; extend `QuizHistoryMeta` with `sessionId`, `task1Score`, `task2Score`, `combinedScore`, `passes`. |
| `src/components/charts/quiz-type-labels.ts` | Exhaustive `Record<QuizHistoryType, …>` entries for `'simulator-c1'`. |
| `src/composables/useQuizStats.ts` | Exhaustive bucket entries for `'simulator-c1'`. |
| `src/modules/history/HistoryPage.vue` | Label + ordering + special-case rendering (combined score / band chip / task chips). |
| `src/modules/home/Home.vue` | Insert Simulator tile at numeral VII; renumber Settings to VIII; breadcrumb `I/VII` → `I/VIII`. |
| `tests/composables/useQuizHistory.test.ts` | Add a coverage test for `'simulator-c1'` meta. |

---

## Conventions to follow

- **AI provider:** Google Gemini via the existing `useClaude.ts` wrapper (returns `AiClient`, structurally compatible with `GeminiClient` shapes used elsewhere).
- **Model selection:** read `useSettings().settings.value.model` at call time. Don't hard-code.
- **Loading overlay** during grading uses `useLoading().wrap(asyncFn, { title, subtitle })`.
- **Toasts** for success/error.
- **API-key guard** mirrors the Module 10 pattern.
- **CSS classes** reuse existing tokens (`.page`, `.section-header`, `.field`, `.btn`, `.alert`, etc.). New module-specific classes prefixed `.simulator-*`.
- **No Vue component tests** — composable tests + manual smoke at the end (matches Sprint 1A/1B parity).
- **`crypto.randomUUID()`** for session and draft ids.

---

## Task 1: Extend history types and history-page rendering for simulator-c1

**Files:**
- Modify: `src/composables/useQuizHistory.ts`
- Modify: `src/modules/history/HistoryPage.vue`
- Modify: `src/components/charts/quiz-type-labels.ts`
- Modify: `src/composables/useQuizStats.ts`
- Test: `tests/composables/useQuizHistory.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `tests/composables/useQuizHistory.test.ts` inside the existing `describe('useQuizHistory', …)` block:

```ts
  it('persists a simulator-c1 entry with combined-score meta', () => {
    saveQuizRun({
      type: 'simulator-c1',
      startedAt: new Date('2026-05-24T09:00:00Z').toISOString(),
      finishedAt: new Date('2026-05-24T10:08:00Z').toISOString(),
      durationMs: 4_080_000,            // 68 minutes
      count: 1,
      correct: 1,
      meta: {
        sessionId: 'sim-abc-123',
        task1Score: 78,
        task2Score: 65,
        combinedScore: 73,              // 78*0.6 + 65*0.4 = 72.8 → 73
        passes: true
      }
    })
    const [entry] = loadHistory()
    expect(entry.type).toBe('simulator-c1')
    expect(entry.meta.sessionId).toBe('sim-abc-123')
    expect(entry.meta.task1Score).toBe(78)
    expect(entry.meta.task2Score).toBe(65)
    expect(entry.meta.combinedScore).toBe(73)
    expect(entry.meta.passes).toBe(true)
  })
```

- [ ] **Step 2: Confirm the test fails**

Run:

```
npm test -- useQuizHistory
```

Expected: TypeScript error — `'simulator-c1'` not in `QuizHistoryType`; new meta fields don't exist.

- [ ] **Step 3: Extend `QuizHistoryType` and `QuizHistoryMeta`**

In `src/composables/useQuizHistory.ts`:

1. Add `'simulator-c1'` as the new final entry of `QuizHistoryType`. The final state should be:

```ts
export type QuizHistoryType =
  | 'noun-gender'
  | 'noun-translation'
  | 'adjective'
  | 'verb-translation'
  | 'verb-conjugation'
  | 'prep-case'
  | 'prep-article'
  | 'prep-two-way'
  | 'decl-table'
  | 'decl-article'
  | 'decl-adjective'
  | 'decl-pronoun'
  | 'decl-case-recognition'
  | 'decl-article-ai'
  | 'konjunktiv-rewrite'
  | 'passiv-transform'
  | 'writing-grade'
  | 'simulator-c1'
```

2. At the end of `QuizHistoryMeta` (before the closing brace), add these new optional fields under a `// Simulator C1` comment header:

```ts
  // Simulator C1
  sessionId?: string
  task1Score?: number
  task2Score?: number
  combinedScore?: number
  passes?: boolean
```

(The fields are deliberately loosely typed — same pattern as previous module meta additions.)

- [ ] **Step 4: Confirm the new test passes; expect cascade typecheck failures**

```
npm test -- useQuizHistory
npm run typecheck
```

Tests: PASS. Typecheck: FAIL in `quiz-type-labels.ts` and `useQuizStats.ts` (exhaustive Records).

- [ ] **Step 5: Add `'simulator-c1'` to the cascade files**

In `src/components/charts/quiz-type-labels.ts`:
- Add to `QUIZ_TYPE_LABEL`: `'simulator-c1': 'Goethe C1 · Mock exam'`
- Add to `QUIZ_TYPE_DE`: `'simulator-c1': 'Goethe C1 · Prüfungssimulation'`
- Append `'simulator-c1'` to `QUIZ_TYPES_ORDER` after `'writing-grade'`.

In `src/composables/useQuizStats.ts`:
- Add `'simulator-c1': 0` to the `zeroRunsByType()` Record.
- Add `'simulator-c1': emptyBucket()` to the `zeroAccuracyByType()` Record.

(Match the structural pattern used for `'writing-grade'` in Sprint 1B — commit `e4e3350` is the reference.)

- [ ] **Step 6: Wire HistoryPage rendering**

In `src/modules/history/HistoryPage.vue`:

1. Add to the `QUIZ_TYPES` constant:

```ts
  'simulator-c1': { label: 'Goethe C1 — mock exam', de: 'Goethe C1 · Prüfungssimulation', module: 'Schreiben' }
```

2. Append `'simulator-c1'` to `typeOrder` immediately after `'writing-grade'`.

3. **Score-column override.** Sprint 1B added a `v-if="it.type === 'writing-grade'"` branch in both the desktop table `<td>` and the mobile card score div (around lines 420–460 in HistoryPage.vue). Extend each `v-if` to ALSO match `'simulator-c1'` rows, rendering `{{ it.meta.combinedScore }}/100 · {{ it.meta.passes ? 'PASS' : 'FAIL' }}`. The cleanest way is to change the existing `v-if="it.type === 'writing-grade'"` to `v-if="it.type === 'writing-grade' || it.type === 'simulator-c1'"` and add an inner `v-if`/`v-else` to select the per-type display. Concrete change:

```vue
<td v-if="it.type === 'writing-grade' || it.type === 'simulator-c1'">
  <span class="history-pct-success">
    <template v-if="it.type === 'writing-grade'">
      {{ it.meta.totalScore }}/100 · {{ it.meta.bandEstimate }}
    </template>
    <template v-else>
      {{ it.meta.combinedScore }}/100 · {{ it.meta.passes ? 'PASS' : 'FAIL' }}
    </template>
  </span>
</td>
<td v-else>
  <!-- existing percentage render -->
</td>
```

Apply the same v-if extension to the mobile card score div.

4. **`summariseMeta` override.** Extend the existing writing-grade early-return branch in `summariseMeta` to also handle `'simulator-c1'`. The chip row should show: task1 score, task2 score, combined score with PASS/FAIL chip. Concrete addition before the existing `writing-grade` branch (or as a parallel branch):

```ts
if (it.type === 'simulator-c1') {
  const m = it.meta
  const parts: string[] = []
  if (typeof m.task1Score === 'number') parts.push(`T1: ${m.task1Score}`)
  if (typeof m.task2Score === 'number') parts.push(`T2: ${m.task2Score}`)
  if (typeof m.combinedScore === 'number') parts.push(`Σ ${m.combinedScore}`)
  if (m.passes !== undefined) parts.push(m.passes ? 'PASS' : 'FAIL')
  return parts.join(' · ')
}
```

- [ ] **Step 7: Type-check + full test suite**

```
npm run typecheck
npm test
```

Both clean. Every existing test (377+) still green.

- [ ] **Step 8: Commit**

```bash
git add src/composables/useQuizHistory.ts src/modules/history/HistoryPage.vue src/components/charts/quiz-type-labels.ts src/composables/useQuizStats.ts tests/composables/useQuizHistory.test.ts
git commit -m "feat(history): add simulator-c1 history type"
```

---

## Task 2: Dexie `simulatorSessions` table + schema v6

**Files:**
- Modify: `src/db/index.ts`

The `SimulatorSession` interface lives in `src/data/simulatorC1.ts` (created in Task 3). To keep this task self-contained, declare a local placeholder interface inside `db/index.ts`; Task 3 will swap it for the real import.

- [ ] **Step 1: Add the placeholder type and table declaration**

In `src/db/index.ts`:

1. Just after the existing imports (alongside the `WritingDraft` import from Sprint 1B), add:

```ts
// Placeholder shape — replaced by an import from ../data/simulatorC1 in Task 3.
interface SimulatorSessionPlaceholder {
  id: string
  startedAt: number
  endsAt: number
  status: string
  task1PromptId: string
  task1DraftId: string
  task2PromptId: string
  task2DraftId: string
  submittedAt?: number
  gradedAt?: number
  abandonedAt?: number
}
```

2. Inside the `GermanTrainerDb` class body, alongside the existing `writingDrafts` field, add:

```ts
  simulatorSessions!: Table<SimulatorSessionPlaceholder, string>
```

- [ ] **Step 2: Add the version 6 migration**

In the `GermanTrainerDb` constructor, after the existing `.version(5)` block and before the closing brace, add:

```ts
    this.version(6).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt'
    })
```

(Full stores object required by Dexie. Additive only — no upgrade callback.)

- [ ] **Step 3: Type-check**

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/db/index.ts
git commit -m "feat(db): add simulatorSessions Dexie table (schema v6)"
```

---

## Task 3: simulatorC1 data file

**Files:**
- Create: `src/data/simulatorC1.ts`
- Modify: `src/db/index.ts` (swap placeholder for real import)

- [ ] **Step 1: Create the data file**

Write `src/data/simulatorC1.ts`:

```ts
// Goethe C1 Schreiben Simulator — types and constants.
//
// The simulator wraps two Module-10 WritingDraft rows under a single
// 75-minute countdown. Drafts are stored in the existing writingDrafts
// table; sessions get their own table (writingSession-like).

export const EXAM_DURATION_MS = 75 * 60 * 1000      // 75 minutes
export const TASK1_WEIGHT = 0.6                      // Forumsbeitrag (heavier per Goethe spec)
export const TASK2_WEIGHT = 0.4                      // formelle E-Mail (lighter)
export const PASSING_SCORE = 60                      // module pass mark out of 100

export type SimulatorStatus =
  | 'in_progress'   // timer running; user can switch tasks and edit
  | 'submitted'     // user clicked Submit (or timer expired); grading in flight
  | 'graded'        // both tasks graded; result page reachable
  | 'abandoned'     // user explicitly abandoned; row preserved but locked

export const SIMULATOR_STATUSES: SimulatorStatus[] = [
  'in_progress', 'submitted', 'graded', 'abandoned'
]

/** One mock-exam session. */
export interface SimulatorSession {
  id: string                       // crypto.randomUUID()
  startedAt: number                // ms epoch when "Start new exam" was clicked
  endsAt: number                   // startedAt + EXAM_DURATION_MS
  status: SimulatorStatus
  task1PromptId: string            // resolves via getPromptById to a Forumsbeitrag (Goethe C1)
  task1DraftId: string             // existing writingDrafts row, created at session-creation time
  task2PromptId: string            // resolves to a formelle E-Mail (Goethe C1)
  task2DraftId: string             // existing writingDrafts row
  submittedAt?: number             // ms epoch when user clicked Submit (or timer ran out)
  gradedAt?: number                // ms epoch when the second grade completed
  abandonedAt?: number             // ms epoch when user abandoned
}

/** Computed per-session from the drafts' .result fields. Not persisted standalone. */
export interface SimulatorReport {
  task1Score: number | null        // null if grading failed or not done
  task2Score: number | null
  task1Band: string | null
  task2Band: string | null
  combinedScore: number | null     // task1*0.6 + task2*0.4, rounded to int; null if either is null
  passes: boolean                  // combinedScore !== null && combinedScore >= PASSING_SCORE
}
```

- [ ] **Step 2: Swap the placeholder in `db/index.ts`**

In `src/db/index.ts`:

1. Remove the `SimulatorSessionPlaceholder` interface added in Task 2.
2. At the top of the file (alongside the `WritingDraft` import), add:

```ts
import type { SimulatorSession } from '../data/simulatorC1'
```

3. Update the table field type:

```ts
  simulatorSessions!: Table<SimulatorSession, string>
```

- [ ] **Step 3: Typecheck**

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/data/simulatorC1.ts src/db/index.ts
git commit -m "feat(simulator): data types + constants"
```

---

## Task 4: useSimulatorC1 — pure helpers with TDD

**Files:**
- Create: `src/composables/useSimulatorC1.ts` (helpers only — session CRUD comes in Task 5)
- Test: `tests/composables/useSimulatorC1.test.ts`

This task ships the two pure helpers `computeRemaining` and `computeReport`. Session CRUD and `submitAndGrade` come in Task 5.

- [ ] **Step 1: Write the failing tests**

Create `tests/composables/useSimulatorC1.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  computeRemaining,
  computeReport
} from '../../src/composables/useSimulatorC1'
import {
  EXAM_DURATION_MS,
  PASSING_SCORE,
  type SimulatorSession
} from '../../src/data/simulatorC1'
import type { WritingDraft } from '../../src/data/writingPrompts'
import type { WritingGradeResult } from '../../src/data/rubrics'

function makeSession(overrides: Partial<SimulatorSession> = {}): SimulatorSession {
  const startedAt = 1_700_000_000_000
  return {
    id: 'sim-1',
    startedAt,
    endsAt: startedAt + EXAM_DURATION_MS,
    status: 'in_progress',
    task1PromptId: 'wp-forum-wohnen-stadt-land',
    task1DraftId: 'd-1',
    task2PromptId: 'wp-email-beschwerde-kurs',
    task2DraftId: 'd-2',
    ...overrides
  }
}

function makeGradeResult(score: number, band: 'B2' | 'C1-' | 'C1' | 'C1+'): WritingGradeResult {
  return {
    rubric: 'goethe-c1',
    totalScore: score,
    bandEstimate: band,
    passes: score >= PASSING_SCORE,
    criteria: [],
    inlineNotes: [],
    paragraphFeedback: [],
    overallDe: '',
    overallEn: '',
    generatedAt: 0,
    modelUsed: 'gemini-2.5-flash'
  }
}

function makeDraft(id: string, result: WritingGradeResult | undefined): WritingDraft {
  return {
    id,
    promptId: 'wp-x',
    rubric: 'goethe-c1',
    text: 'some text',
    wordCount: 200,
    createdAt: 0,
    updatedAt: 0,
    result
  }
}

describe('computeRemaining', () => {
  test('positive when current time is before endsAt', () => {
    const session = makeSession()
    const now = session.startedAt + 30 * 60 * 1000   // 30 min in
    expect(computeRemaining(session, now)).toBe(45 * 60 * 1000)
  })
  test('zero when current time equals endsAt', () => {
    const session = makeSession()
    expect(computeRemaining(session, session.endsAt)).toBe(0)
  })
  test('clamps at zero when current time is past endsAt', () => {
    const session = makeSession()
    expect(computeRemaining(session, session.endsAt + 60_000)).toBe(0)
  })
  test('full duration at session start', () => {
    const session = makeSession()
    expect(computeRemaining(session, session.startedAt)).toBe(EXAM_DURATION_MS)
  })
})

describe('computeReport', () => {
  test('both tasks graded — applies 60/40 weighting and rounds to int', () => {
    const session = makeSession()
    const t1 = makeDraft('d-1', makeGradeResult(78, 'C1'))
    const t2 = makeDraft('d-2', makeGradeResult(65, 'C1-'))
    const r = computeReport(session, t1, t2)
    expect(r.task1Score).toBe(78)
    expect(r.task2Score).toBe(65)
    expect(r.combinedScore).toBe(73)   // 78*0.6 + 65*0.4 = 72.8 → 73
    expect(r.passes).toBe(true)
    expect(r.task1Band).toBe('C1')
    expect(r.task2Band).toBe('C1-')
  })

  test('passes false when combined < 60', () => {
    const session = makeSession()
    const t1 = makeDraft('d-1', makeGradeResult(55, 'C1-'))
    const t2 = makeDraft('d-2', makeGradeResult(55, 'C1-'))
    const r = computeReport(session, t1, t2)
    expect(r.combinedScore).toBe(55)
    expect(r.passes).toBe(false)
  })

  test('passes exactly at 60 threshold', () => {
    const session = makeSession()
    const t1 = makeDraft('d-1', makeGradeResult(60, 'C1-'))
    const t2 = makeDraft('d-2', makeGradeResult(60, 'C1-'))
    const r = computeReport(session, t1, t2)
    expect(r.combinedScore).toBe(60)
    expect(r.passes).toBe(true)
  })

  test('task1 graded, task2 not graded — combined is null, passes false', () => {
    const session = makeSession()
    const t1 = makeDraft('d-1', makeGradeResult(78, 'C1'))
    const t2 = makeDraft('d-2', undefined)
    const r = computeReport(session, t1, t2)
    expect(r.task1Score).toBe(78)
    expect(r.task2Score).toBeNull()
    expect(r.combinedScore).toBeNull()
    expect(r.passes).toBe(false)
  })

  test('neither task graded — all nulls, passes false', () => {
    const session = makeSession()
    const t1 = makeDraft('d-1', undefined)
    const t2 = makeDraft('d-2', undefined)
    const r = computeReport(session, t1, t2)
    expect(r.task1Score).toBeNull()
    expect(r.task2Score).toBeNull()
    expect(r.combinedScore).toBeNull()
    expect(r.passes).toBe(false)
  })

  test('rounds combined score correctly at .5 boundary', () => {
    const session = makeSession()
    const t1 = makeDraft('d-1', makeGradeResult(75, 'C1'))   // 75*0.6 = 45
    const t2 = makeDraft('d-2', makeGradeResult(50, 'C1-'))  // 50*0.4 = 20 → combined 65 exactly
    const r = computeReport(session, t1, t2)
    expect(r.combinedScore).toBe(65)
  })
})
```

- [ ] **Step 2: Confirm tests fail**

```
npm test -- useSimulatorC1
```

Expected: module not found.

- [ ] **Step 3: Implement the helpers**

Create `src/composables/useSimulatorC1.ts`:

```ts
import {
  PASSING_SCORE,
  TASK1_WEIGHT,
  TASK2_WEIGHT,
  type SimulatorReport,
  type SimulatorSession
} from '../data/simulatorC1'
import type { WritingDraft } from '../data/writingPrompts'

// ── Pure helpers (Task 4) ─────────────────────────────────────────

export function computeRemaining(session: SimulatorSession, now: number): number {
  return Math.max(0, session.endsAt - now)
}

export function computeReport(
  session: SimulatorSession,
  draft1: WritingDraft,
  draft2: WritingDraft
): SimulatorReport {
  const r1 = draft1.result
  const r2 = draft2.result
  const task1Score = r1 ? r1.totalScore : null
  const task2Score = r2 ? r2.totalScore : null
  const task1Band = r1 ? r1.bandEstimate : null
  const task2Band = r2 ? r2.bandEstimate : null

  let combinedScore: number | null = null
  if (task1Score !== null && task2Score !== null) {
    combinedScore = Math.round(task1Score * TASK1_WEIGHT + task2Score * TASK2_WEIGHT)
  }
  const passes = combinedScore !== null && combinedScore >= PASSING_SCORE

  return {
    task1Score,
    task2Score,
    task1Band,
    task2Band,
    combinedScore,
    passes
  }
}
```

- [ ] **Step 4: Run the tests, confirm green**

```
npm test -- useSimulatorC1
```

Expected: PASS — all 9 assertions green.

- [ ] **Step 5: Typecheck**

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useSimulatorC1.ts tests/composables/useSimulatorC1.test.ts
git commit -m "feat(simulator): computeRemaining + computeReport (pure helpers, TDD)"
```

---

## Task 5: useSimulatorC1 — session CRUD + submitAndGrade

**Files:**
- Modify: `src/composables/useSimulatorC1.ts`
- Modify: `tests/composables/useSimulatorC1.test.ts`

This task adds `createSession`, `resumeSession`, `abandonSession`, and `submitAndGrade`. The CRUD ones touch Dexie and are testable with `fake-indexeddb`. `submitAndGrade` calls the grader — its tests mock the grader function via a parameter (the function accepts a grader callback so tests can substitute a fake).

- [ ] **Step 1: Add the failing tests**

Append to `tests/composables/useSimulatorC1.test.ts`:

```ts
import 'fake-indexeddb/auto'
import { beforeEach } from 'vitest'
import { db } from '../../src/db'
import {
  createSession,
  resumeSession,
  abandonSession,
  submitAndGrade,
  type GradeFn
} from '../../src/composables/useSimulatorC1'

describe('createSession', () => {
  beforeEach(async () => {
    await db.simulatorSessions.clear()
    await db.writingDrafts.clear()
  })

  test('creates a session with two drafts and pairs Goethe-C1 prompts', async () => {
    const session = await createSession()
    expect(session.id).toBeTruthy()
    expect(session.status).toBe('in_progress')
    expect(session.endsAt - session.startedAt).toBe(EXAM_DURATION_MS)
    expect(session.task1PromptId).toBeTruthy()
    expect(session.task2PromptId).toBeTruthy()
    expect(session.task1DraftId).toBeTruthy()
    expect(session.task2DraftId).toBeTruthy()

    const t1 = await db.writingDrafts.get(session.task1DraftId)
    const t2 = await db.writingDrafts.get(session.task2DraftId)
    expect(t1?.rubric).toBe('goethe-c1')
    expect(t2?.rubric).toBe('goethe-c1')
    expect(t1?.text).toBe('')
    expect(t2?.text).toBe('')
  })
})

describe('resumeSession', () => {
  beforeEach(async () => {
    await db.simulatorSessions.clear()
    await db.writingDrafts.clear()
  })

  test('loads an existing session by id', async () => {
    const created = await createSession()
    const resumed = await resumeSession(created.id)
    expect(resumed?.id).toBe(created.id)
  })

  test('returns null for unknown id', async () => {
    const resumed = await resumeSession('does-not-exist')
    expect(resumed).toBeNull()
  })

  test('auto-transitions in_progress → submitted when endsAt has passed', async () => {
    const created = await createSession()
    // Force endsAt into the past.
    await db.simulatorSessions.update(created.id, { endsAt: Date.now() - 1000 })
    const resumed = await resumeSession(created.id)
    expect(resumed?.status).toBe('submitted')
    expect(resumed?.submittedAt).toBeTruthy()
  })

  test('does not transition when status is already graded', async () => {
    const created = await createSession()
    await db.simulatorSessions.update(created.id, {
      endsAt: Date.now() - 1000,
      status: 'graded',
      gradedAt: Date.now() - 500
    })
    const resumed = await resumeSession(created.id)
    expect(resumed?.status).toBe('graded')
  })
})

describe('abandonSession', () => {
  beforeEach(async () => {
    await db.simulatorSessions.clear()
    await db.writingDrafts.clear()
  })

  test('marks an in-progress session as abandoned', async () => {
    const created = await createSession()
    await abandonSession(created.id)
    const after = await db.simulatorSessions.get(created.id)
    expect(after?.status).toBe('abandoned')
    expect(after?.abandonedAt).toBeTruthy()
  })
})

describe('submitAndGrade', () => {
  beforeEach(async () => {
    await db.simulatorSessions.clear()
    await db.writingDrafts.clear()
  })

  test('grades both tasks sequentially and marks session graded', async () => {
    const created = await createSession()
    // Give both drafts some text so the grader has something to score.
    await db.writingDrafts.update(created.task1DraftId, { text: 'x'.repeat(800), wordCount: 200 })
    await db.writingDrafts.update(created.task2DraftId, { text: 'y'.repeat(400), wordCount: 100 })

    const grader: GradeFn = async (draft) => ({
      ...draft,
      rubric: 'goethe-c1',
      gradedAt: Date.now(),
      graderModel: 'gemini-2.5-flash',
      result: makeGradeResult(draft.id === created.task1DraftId ? 78 : 65, 'C1')
    })

    const after = await submitAndGrade(created.id, grader)
    expect(after.session.status).toBe('graded')
    expect(after.draft1.result?.totalScore).toBe(78)
    expect(after.draft2.result?.totalScore).toBe(65)

    const reloaded = await db.simulatorSessions.get(created.id)
    expect(reloaded?.status).toBe('graded')
    expect(reloaded?.gradedAt).toBeTruthy()
  })

  test('idempotent: if both already graded, returns immediately without regrading', async () => {
    const created = await createSession()
    await db.writingDrafts.update(created.task1DraftId, {
      text: 'x',
      wordCount: 1,
      result: makeGradeResult(78, 'C1'),
      gradedAt: 100,
      graderModel: 'cached'
    })
    await db.writingDrafts.update(created.task2DraftId, {
      text: 'y',
      wordCount: 1,
      result: makeGradeResult(65, 'C1-'),
      gradedAt: 100,
      graderModel: 'cached'
    })
    await db.simulatorSessions.update(created.id, { status: 'submitted', submittedAt: 200 })

    let calls = 0
    const grader: GradeFn = async (draft) => {
      calls++
      return draft
    }
    const after = await submitAndGrade(created.id, grader)
    expect(calls).toBe(0)
    expect(after.session.status).toBe('graded')
  })

  test('throws when session id is unknown', async () => {
    const grader: GradeFn = async (draft) => draft
    await expect(submitAndGrade('does-not-exist', grader)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Confirm tests fail**

```
npm test -- useSimulatorC1
```

Expected: `createSession`, `resumeSession`, `abandonSession`, `submitAndGrade`, `GradeFn` not exported.

- [ ] **Step 3: Append the implementation**

Append to `src/composables/useSimulatorC1.ts`:

```ts
import { db } from '../db'
import {
  EXAM_DURATION_MS,
  type SimulatorSession,
  type SimulatorStatus
} from '../data/simulatorC1'
import { WRITING_PROMPTS, type WritingDraft } from '../data/writingPrompts'

// ── Session CRUD (Task 5) ─────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error('No items to pick from')
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function createSession(): Promise<SimulatorSession> {
  const goetheC1 = WRITING_PROMPTS.filter(p => p.defaultRubric === 'goethe-c1')
  const forumPrompts = goetheC1.filter(p => p.type === 'forumsbeitrag')
  const emailPrompts = goetheC1.filter(p => p.type === 'formelle-email')

  if (forumPrompts.length === 0) {
    throw new Error('No Goethe C1 Forumsbeitrag prompts available in the catalogue.')
  }
  if (emailPrompts.length === 0) {
    throw new Error('No Goethe C1 formelle-email prompts available in the catalogue.')
  }

  const now = Date.now()
  const task1Prompt = pickRandom(forumPrompts)
  const task2Prompt = pickRandom(emailPrompts)

  const task1Draft: WritingDraft = {
    id: crypto.randomUUID(),
    promptId: task1Prompt.id,
    rubric: 'goethe-c1',
    text: '',
    wordCount: 0,
    createdAt: now,
    updatedAt: now
  }
  const task2Draft: WritingDraft = {
    id: crypto.randomUUID(),
    promptId: task2Prompt.id,
    rubric: 'goethe-c1',
    text: '',
    wordCount: 0,
    createdAt: now,
    updatedAt: now
  }

  await db.writingDrafts.put(task1Draft)
  await db.writingDrafts.put(task2Draft)

  const session: SimulatorSession = {
    id: crypto.randomUUID(),
    startedAt: now,
    endsAt: now + EXAM_DURATION_MS,
    status: 'in_progress',
    task1PromptId: task1Prompt.id,
    task1DraftId: task1Draft.id,
    task2PromptId: task2Prompt.id,
    task2DraftId: task2Draft.id
  }
  await db.simulatorSessions.put(session)
  return session
}

export async function resumeSession(id: string): Promise<SimulatorSession | null> {
  const session = await db.simulatorSessions.get(id)
  if (!session) return null
  // Auto-transition: in_progress + endsAt passed → submitted.
  if (session.status === 'in_progress' && session.endsAt <= Date.now()) {
    const updated: SimulatorSession = {
      ...session,
      status: 'submitted',
      submittedAt: Date.now()
    }
    await db.simulatorSessions.put(updated)
    return updated
  }
  return session
}

export async function abandonSession(id: string): Promise<void> {
  const now = Date.now()
  await db.simulatorSessions.update(id, {
    status: 'abandoned' as SimulatorStatus,
    abandonedAt: now
  })
}

export async function findActiveSession(): Promise<SimulatorSession | null> {
  // "Active" = in_progress OR submitted-but-not-graded. There can be more than
  // one in pathological tab-races; we return the most recent.
  const all = await db.simulatorSessions.toArray()
  const active = all
    .filter(s => s.status === 'in_progress' || s.status === 'submitted')
    .sort((a, b) => b.startedAt - a.startedAt)
  return active[0] ?? null
}

// ── Submit + grade (Task 5) ───────────────────────────────────────

export type GradeFn = (draft: WritingDraft) => Promise<WritingDraft>

export async function submitAndGrade(
  sessionId: string,
  gradeFn: GradeFn
): Promise<{ session: SimulatorSession; draft1: WritingDraft; draft2: WritingDraft }> {
  const session = await db.simulatorSessions.get(sessionId)
  if (!session) throw new Error(`Simulator session ${sessionId} not found`)

  let draft1 = await db.writingDrafts.get(session.task1DraftId)
  let draft2 = await db.writingDrafts.get(session.task2DraftId)
  if (!draft1 || !draft2) {
    throw new Error('Simulator drafts missing from writingDrafts table')
  }

  // Mark submitted if not already.
  let updatedSession: SimulatorSession = session.status === 'in_progress'
    ? { ...session, status: 'submitted', submittedAt: Date.now() }
    : session
  if (updatedSession !== session) {
    await db.simulatorSessions.put(updatedSession)
  }

  // Grade each task if not already graded. Idempotent.
  if (!draft1.result) draft1 = await gradeFn(draft1)
  if (!draft2.result) draft2 = await gradeFn(draft2)

  // Finalize.
  if (draft1.result && draft2.result) {
    updatedSession = { ...updatedSession, status: 'graded', gradedAt: Date.now() }
    await db.simulatorSessions.put(updatedSession)
  }

  return { session: updatedSession, draft1, draft2 }
}
```

- [ ] **Step 4: Run the tests, confirm green**

```
npm test -- useSimulatorC1
```

Expected: PASS — all session CRUD + grader tests green (plus the original 9 helper tests still passing).

- [ ] **Step 5: Typecheck**

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useSimulatorC1.ts tests/composables/useSimulatorC1.test.ts
git commit -m "feat(simulator): session CRUD + submitAndGrade (idempotent)"
```

---

## Task 6: SimulatorHome page + route

**Files:**
- Create: `src/modules/simulator-c1/SimulatorHome.vue`
- Modify: `src/router.ts`

- [ ] **Step 1: Add the route**

In `src/router.ts`, append after the `writing-compare` route:

```ts
  { path: '/simulator', name: 'simulator-c1', component: () => import('./modules/simulator-c1/SimulatorHome.vue') }
```

(Other routes added in Tasks 7 and 8.)

- [ ] **Step 2: Create the home page**

Create `src/modules/simulator-c1/SimulatorHome.vue` (mkdir the directory first):

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'
import {
  computeRemaining,
  findActiveSession,
  createSession,
  abandonSession
} from '../../composables/useSimulatorC1'
import type { SimulatorSession } from '../../data/simulatorC1'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const toast = useToast()

const active = ref<SimulatorSession | null>(null)
const now = ref(Date.now())
let tick: number | undefined

onMounted(async () => {
  active.value = await findActiveSession()
  tick = window.setInterval(() => { now.value = Date.now() }, 1000)
})

function format(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const remainingDisplay = computed(() => {
  if (!active.value) return null
  if (active.value.status !== 'in_progress') return null
  return format(computeRemaining(active.value, now.value))
})

const submittedDisplay = computed(() =>
  active.value?.status === 'submitted'
)

const recent = computed(() =>
  loadHistory()
    .filter(h => h.type === 'simulator-c1')
    .slice(0, 5)
)

async function start() {
  try {
    const s = await createSession()
    router.push({ name: 'simulator-run', params: { sessionId: s.id } })
  } catch (err) {
    toast.error('Cannot start exam', {
      description: err instanceof Error ? err.message : String(err)
    })
  }
}

function resume() {
  if (!active.value) return
  if (active.value.status === 'submitted') {
    router.push({ name: 'simulator-result', params: { sessionId: active.value.id } })
  } else {
    router.push({ name: 'simulator-run', params: { sessionId: active.value.id } })
  }
}

async function abandon() {
  if (!active.value) return
  const ok = confirm('Diesen Prüfungsversuch wirklich abbrechen? Bisher geschriebene Texte bleiben gespeichert, aber die Sitzung wird beendet.')
  if (!ok) return
  await abandonSession(active.value.id)
  active.value = null
  toast.success('Sitzung beendet')
}

function back() { router.push({ name: 'home' }) }
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Goethe C1 Schreiben</div>
        <h1 class="section-title">Mock exam<em>.</em></h1>
        <p class="section-subtitle">
          75 Minuten · Forumsbeitrag (~230 Wörter) + halbformelle E-Mail (~120 Wörter)
          · automatisch nach der Goethe-C1-Rubrik bewertet.
        </p>
      </div>
    </header>

    <div class="alert alert-info simulator-disclaimer">
      <span class="alert-label">Hinweis</span>
      Bewertungen sind indikativ und ersetzen keinen offiziellen Prüfer.
      Die 60/40-Gewichtung folgt der dokumentierten Goethe-Schreiben-Bewertung;
      offizielle Modellsätze bleiben die maßgebliche Vorbereitungsquelle.
    </div>

    <div v-if="active && active.status === 'in_progress'" class="card simulator-cta">
      <div class="simulator-cta-head">
        <h2>Resume exam</h2>
        <span class="simulator-time-left">Verbleibend: {{ remainingDisplay }}</span>
      </div>
      <p class="simulator-cta-desc">Du hast eine Prüfung in Bearbeitung. Klicke „Fortsetzen", um zurückzukehren — oder „Abbrechen", um diese Sitzung zu beenden.</p>
      <div class="simulator-cta-actions">
        <button class="btn btn-accent" type="button" @click="resume">Fortsetzen <span aria-hidden="true">→</span></button>
        <button class="btn btn-quiet" type="button" @click="abandon">Abbrechen</button>
      </div>
    </div>

    <div v-else-if="submittedDisplay" class="card simulator-cta">
      <div class="simulator-cta-head">
        <h2>Time's up</h2>
      </div>
      <p class="simulator-cta-desc">Diese Prüfung wurde abgegeben (Zeit abgelaufen oder du hast „Submit" geklickt). Klicke „Bewerten", um die Ergebnisse zu sehen, oder „Abbrechen", um sie zu verwerfen.</p>
      <div class="simulator-cta-actions">
        <button class="btn btn-accent" type="button" @click="resume">Bewerten <span aria-hidden="true">→</span></button>
        <button class="btn btn-quiet" type="button" @click="abandon">Abbrechen</button>
      </div>
    </div>

    <div v-else class="card simulator-cta">
      <div class="simulator-cta-head">
        <h2>Start a new exam</h2>
        <span class="simulator-cta-meta">75 Min · 2 Aufgaben · ≈ 2 große Bewertungsaufrufe</span>
      </div>
      <p class="simulator-cta-desc">Zwei zufällig ausgewählte Goethe-C1-Prompts (Forumsbeitrag + E-Mail) unter einem 75-Minuten-Timer. Auto-Abgabe bei Zeitablauf.</p>
      <div class="simulator-cta-actions">
        <button class="btn btn-accent" type="button" @click="start">Start <span aria-hidden="true">→</span></button>
      </div>
    </div>

    <section v-if="recent.length > 0" class="recent-runs">
      <h3 class="recent-runs-title">Recent exams</h3>
      <ul class="recent-runs-list">
        <li v-for="r in recent" :key="r.id">
          <span class="rr-date">{{ new Date(r.startedAt).toLocaleDateString() }}</span>
          <span class="rr-score">{{ r.meta.combinedScore ?? '—' }} / 100 · {{ r.meta.passes ? 'PASS' : 'FAIL' }}</span>
          <span class="rr-tasks">T1 {{ r.meta.task1Score ?? '—' }} · T2 {{ r.meta.task2Score ?? '—' }}</span>
          <span class="rr-duration">{{ format(r.durationMs) }}</span>
        </li>
      </ul>
    </section>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
    </div>
  </div>
</template>

<style scoped>
.simulator-disclaimer { margin-bottom: 24px; max-width: 720px; }

.simulator-cta {
  padding: 24px;
  max-width: 720px;
  margin: 16px 0 32px;
}
.simulator-cta-head {
  display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap;
}
.simulator-cta-head h2 {
  font-family: var(--font-display);
  font-size: 22px;
  margin: 0;
}
.simulator-time-left {
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.simulator-cta-meta {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mute);
}
.simulator-cta-desc {
  font-family: var(--font-body);
  font-size: 14.5px;
  color: var(--ink-soft);
  margin: 12px 0 16px;
}
.simulator-cta-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.recent-runs { margin-top: 32px; max-width: 720px; }
.recent-runs-title {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 12px;
}
.recent-runs-list { list-style: none; padding: 0; margin: 0; }
.recent-runs-list li {
  display: flex; gap: 16px; align-items: baseline; flex-wrap: wrap;
  padding: 8px 0; border-bottom: 1px solid var(--hairline); font-size: 14px;
}
.rr-date { color: var(--mute); flex: 0 0 110px; font-variant-numeric: tabular-nums; }
.rr-score { font-family: var(--font-display); }
.rr-tasks { color: var(--ink-soft); font-family: var(--font-mono); font-size: 12px; }
.rr-duration { margin-left: auto; color: var(--mute); font-family: var(--font-mono); font-size: 12px; font-variant-numeric: tabular-nums; }

.setup-actions { display: flex; justify-content: flex-start; margin-top: 40px; }
</style>
```

NOTE: This component references routes `simulator-run` and `simulator-result` that don't exist yet — added in Tasks 7 and 8. Forward references; runtime warnings expected until those tasks land.

- [ ] **Step 3: Typecheck**

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/modules/simulator-c1/SimulatorHome.vue src/router.ts
git commit -m "feat(simulator): home page (start/resume/abandon) + route"
```

---

## Task 7: SimulatorRun page + route

**Files:**
- Create: `src/modules/simulator-c1/SimulatorRun.vue`
- Modify: `src/router.ts`

- [ ] **Step 1: Add the route**

In `src/router.ts`, after the `simulator-c1` route:

```ts
  { path: '/simulator/run/:sessionId', name: 'simulator-run', component: () => import('./modules/simulator-c1/SimulatorRun.vue') }
```

- [ ] **Step 2: Create the runner**

Create `src/modules/simulator-c1/SimulatorRun.vue`:

```vue
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../../db'
import type { WritingDraft, WritingPrompt } from '../../data/writingPrompts'
import { getPromptById } from '../../composables/useWritingPrompts'
import {
  abandonSession,
  computeRemaining,
  resumeSession,
  submitAndGrade,
  type GradeFn
} from '../../composables/useSimulatorC1'
import type { SimulatorSession } from '../../data/simulatorC1'
import { useSettings } from '../../composables/useSettings'
import { makeGeminiClient } from '../../composables/useClaude'
import { useLoading } from '../../composables/useLoading'
import { useToast } from '../../composables/useToast'
import { gradeAndPersist, GraderError } from '../../composables/useWritingGrader'
import { RUBRICS } from '../../data/rubrics'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const loading = useLoading()
const { settings, hasApiKey, load: loadSettings } = useSettings()

const sessionId = computed(() => route.params.sessionId as string)
const session = ref<SimulatorSession | null>(null)
const prompt1 = ref<WritingPrompt | null>(null)
const prompt2 = ref<WritingPrompt | null>(null)
const draft1 = ref<WritingDraft | null>(null)
const draft2 = ref<WritingDraft | null>(null)

const text1 = ref('')
const text2 = ref('')
const activeTab = ref<1 | 2>(1)
const submitting = ref(false)
const submitError = ref<string | null>(null)

const initializing = ref(true)
const error = ref<string | null>(null)
const now = ref(Date.now())
let tick: number | undefined
let autosaveTimer: number | undefined

function countWords(s: string): number {
  const m = s.trim().match(/\S+/g)
  return m ? m.length : 0
}

const wordCount1 = computed(() => countWords(text1.value))
const wordCount2 = computed(() => countWords(text2.value))

function bandColor(count: number, target: WritingPrompt['targetWords'] | null): string {
  if (!target || target.min === 0) return 'ok'
  if (count < target.min * 0.9) return 'far-under'
  if (count < target.min) return 'under'
  if (count <= target.max) return 'ok'
  if (count <= target.max * 1.15) return 'over'
  return 'far-over'
}

const band1 = computed(() => bandColor(wordCount1.value, prompt1.value?.targetWords ?? null))
const band2 = computed(() => bandColor(wordCount2.value, prompt2.value?.targetWords ?? null))

const remaining = computed(() => {
  if (!session.value) return 0
  return computeRemaining(session.value, now.value)
})

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const timerDisplay = computed(() => formatTime(remaining.value))
const timerCritical = computed(() => remaining.value <= 5 * 60 * 1000)
const timeUp = computed(() => remaining.value === 0)
const sessionLocked = computed(() => session.value && session.value.status !== 'in_progress')

const canSubmit = computed(() => {
  if (!session.value || !prompt1.value || !prompt2.value || sessionLocked.value) return false
  const floor1 = Math.floor(prompt1.value.targetWords.min * 0.6)
  const floor2 = Math.floor(prompt2.value.targetWords.min * 0.6)
  return hasApiKey.value && wordCount1.value >= floor1 && wordCount2.value >= floor2 && !submitting.value
})

onMounted(async () => {
  await loadSettings()
  try {
    const s = await resumeSession(sessionId.value)
    if (!s) {
      error.value = 'Sitzung nicht gefunden.'
      return
    }
    session.value = s
    prompt1.value = getPromptById(s.task1PromptId)
    prompt2.value = getPromptById(s.task2PromptId)
    draft1.value = await db.writingDrafts.get(s.task1DraftId) ?? null
    draft2.value = await db.writingDrafts.get(s.task2DraftId) ?? null
    if (!prompt1.value || !prompt2.value || !draft1.value || !draft2.value) {
      error.value = 'Sitzungsdaten unvollständig.'
      return
    }
    text1.value = draft1.value.text
    text2.value = draft2.value.text

    // If the session is already submitted or graded, redirect.
    if (s.status === 'submitted' || s.status === 'graded') {
      router.replace({ name: 'simulator-result', params: { sessionId: s.id } })
      return
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ladefehler.'
  } finally {
    initializing.value = false
  }
  tick = window.setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (tick !== undefined) window.clearInterval(tick)
  if (autosaveTimer !== undefined) window.clearTimeout(autosaveTimer)
})

function scheduleAutosave() {
  if (autosaveTimer !== undefined) window.clearTimeout(autosaveTimer)
  autosaveTimer = window.setTimeout(async () => {
    if (!draft1.value || !draft2.value) return
    const next1: WritingDraft = { ...draft1.value, text: text1.value, wordCount: wordCount1.value, updatedAt: Date.now() }
    const next2: WritingDraft = { ...draft2.value, text: text2.value, wordCount: wordCount2.value, updatedAt: Date.now() }
    await db.writingDrafts.put(next1)
    await db.writingDrafts.put(next2)
    draft1.value = next1
    draft2.value = next2
  }, 1000)
}

watch([text1, text2], scheduleAutosave)

// Auto-submit when the timer hits zero.
watch(timeUp, async (up) => {
  if (!up || !session.value || session.value.status !== 'in_progress' || submitting.value) return
  await doSubmit(true)
})

async function doSubmit(auto: boolean) {
  if (!session.value || !prompt1.value || !prompt2.value) return
  if (!hasApiKey.value) {
    toast.error('Gemini API key required', { description: 'Bitte API-Key in den Einstellungen setzen.' })
    return
  }
  if (!auto) {
    const ok = confirm('Beide Aufgaben einreichen und bewerten lassen? Nach dem Submit kannst du den Text nicht mehr ändern.')
    if (!ok) return
  }
  submitting.value = true
  submitError.value = null
  // Flush pending autosave so what we grade is what we saved.
  if (autosaveTimer !== undefined) {
    window.clearTimeout(autosaveTimer)
    autosaveTimer = undefined
  }
  if (draft1.value) {
    const pinned1: WritingDraft = { ...draft1.value, text: text1.value, wordCount: wordCount1.value, updatedAt: Date.now() }
    await db.writingDrafts.put(pinned1)
    draft1.value = pinned1
  }
  if (draft2.value) {
    const pinned2: WritingDraft = { ...draft2.value, text: text2.value, wordCount: wordCount2.value, updatedAt: Date.now() }
    await db.writingDrafts.put(pinned2)
    draft2.value = pinned2
  }

  const grader: GradeFn = async (draft) => {
    const promptForDraft = draft.id === session.value!.task1DraftId
      ? prompt1.value!
      : prompt2.value!
    const client = makeGeminiClient(settings.value.geminiApiKey)
    return await gradeAndPersist(client, settings.value.model, promptForDraft, draft, 'goethe-c1')
  }

  try {
    await loading.wrap(
      async () => submitAndGrade(session.value!.id, grader),
      {
        title: 'Bewerten…',
        subtitle: 'Gemini bewertet beide Aufgaben nacheinander gegen die Goethe-C1-Rubrik (≈ 30–90 Sekunden pro Aufgabe).'
      }
    )
    router.push({ name: 'simulator-result', params: { sessionId: session.value!.id } })
  } catch (err) {
    const msg = err instanceof GraderError
      ? `Bewertung fehlgeschlagen nach ${err.attempts} Versuchen.`
      : err instanceof Error ? err.message : 'Bewertung fehlgeschlagen.'
    submitError.value = msg
    toast.error('Bewertung fehlgeschlagen', { description: msg })
  } finally {
    submitting.value = false
  }
}

async function onAbandon() {
  if (!session.value) return
  const ok = confirm('Diesen Prüfungsversuch wirklich abbrechen?')
  if (!ok) return
  await abandonSession(session.value.id)
  router.push({ name: 'simulator-c1' })
}

function backHome() { router.push({ name: 'simulator-c1' }) }
</script>

<template>
  <div v-if="initializing" class="page loading-state"><div class="micro-mark">Loading…</div></div>
  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="backHome">← Back</button>
  </div>
  <div v-else-if="session && prompt1 && prompt2" class="page run-page">
    <header class="simulator-header">
      <div class="simulator-timer" :class="{ 'is-critical': timerCritical }">
        <span class="simulator-timer-label">Verbleibend</span>
        <span class="simulator-timer-value">{{ timerDisplay }}</span>
      </div>
      <div class="simulator-header-meta">
        <span>Goethe C1 · Schreiben</span>
      </div>
      <div class="simulator-header-actions">
        <button class="btn btn-quiet" type="button" @click="onAbandon">Abbrechen</button>
      </div>
    </header>

    <div class="alert alert-info simulator-disclaimer-small">
      <span class="alert-label">Hinweis</span>
      Bewertungen sind indikativ; offizielle Modellsätze bleiben die maßgebliche Quelle.
    </div>

    <div v-if="!hasApiKey" class="alert alert-warning">
      <span class="alert-label">Required</span>
      Setze deinen Gemini-API-Key unter <router-link :to="{ name: 'settings' }">Settings</router-link>, sonst kann die Bewertung am Ende nicht laufen.
    </div>

    <div class="simulator-tabs">
      <button type="button" class="simulator-tab" :class="{ active: activeTab === 1 }" @click="activeTab = 1">
        <span class="tab-label">Aufgabe 1 · Forumsbeitrag</span>
        <span class="tab-meta" :class="['band-' + band1]">{{ wordCount1 }} / {{ prompt1.targetWords.target }}</span>
      </button>
      <button type="button" class="simulator-tab" :class="{ active: activeTab === 2 }" @click="activeTab = 2">
        <span class="tab-label">Aufgabe 2 · formelle E-Mail</span>
        <span class="tab-meta" :class="['band-' + band2]">{{ wordCount2 }} / {{ prompt2.targetWords.target }}</span>
      </button>
    </div>

    <div v-show="activeTab === 1" class="simulator-task">
      <details class="prompt-zone" open>
        <summary>Aufgabenstellung 1</summary>
        <div class="prompt-zone-text">{{ prompt1.promptText }}</div>
        <div v-if="prompt1.promptContext" class="prompt-zone-context">{{ prompt1.promptContext }}</div>
      </details>
      <textarea
        class="editor-textarea"
        :class="['band-' + band1]"
        v-model="text1"
        :readonly="sessionLocked"
        rows="16"
        placeholder="Schreibe deinen Forumsbeitrag hier …"
        spellcheck="false"
        autocomplete="off"
      ></textarea>
      <div class="editor-meta">
        <span class="word-count" :class="['band-' + band1]">{{ wordCount1 }} Wörter</span>
        <span class="word-target">Ziel {{ prompt1.targetWords.min }}–{{ prompt1.targetWords.max }}</span>
      </div>
    </div>

    <div v-show="activeTab === 2" class="simulator-task">
      <details class="prompt-zone" open>
        <summary>Aufgabenstellung 2</summary>
        <div class="prompt-zone-text">{{ prompt2.promptText }}</div>
        <div v-if="prompt2.promptContext" class="prompt-zone-context">{{ prompt2.promptContext }}</div>
      </details>
      <textarea
        class="editor-textarea"
        :class="['band-' + band2]"
        v-model="text2"
        :readonly="sessionLocked"
        rows="16"
        placeholder="Schreibe deine E-Mail hier …"
        spellcheck="false"
        autocomplete="off"
      ></textarea>
      <div class="editor-meta">
        <span class="word-count" :class="['band-' + band2]">{{ wordCount2 }} Wörter</span>
        <span class="word-target">Ziel {{ prompt2.targetWords.min }}–{{ prompt2.targetWords.max }}</span>
      </div>
    </div>

    <div v-if="submitError" class="alert alert-danger"><span class="alert-label">Fehler</span>{{ submitError }}</div>

    <div class="simulator-actions">
      <span class="simulator-cost-hint">≈ 2 große Bewertungsaufrufe ({{ RUBRICS['goethe-c1'].labelDe }})</span>
      <button
        class="btn btn-accent btn-meta"
        type="button"
        :disabled="!canSubmit"
        @click="doSubmit(false)"
      >
        <span class="bm-main">{{ submitting ? 'Bewertet…' : 'Submit &amp; grade' }} <span v-if="!submitting" aria-hidden="true">→</span></span>
        <span class="bm-sub">T1 {{ wordCount1 }}w · T2 {{ wordCount2 }}w</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.run-page { max-width: 880px; }
.simulator-header {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 12px 16px;
  background: var(--paper-deep); border-radius: 4px; margin-bottom: 16px;
  position: sticky; top: 0; z-index: 1;
}
.simulator-timer { display: flex; flex-direction: column; gap: 2px; }
.simulator-timer-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute);
}
.simulator-timer-value {
  font-family: var(--font-mono); font-size: 28px; font-variant-numeric: tabular-nums; color: var(--accent);
}
.simulator-timer.is-critical .simulator-timer-value { color: var(--danger); }
.simulator-header-meta {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute);
}
.simulator-disclaimer-small { margin-bottom: 16px; }

.simulator-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
.simulator-tab {
  flex: 1;
  background: transparent; border: 1px solid var(--rule); border-radius: 4px 4px 0 0;
  padding: 10px 14px; cursor: pointer;
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
  text-align: left;
}
.simulator-tab.active { background: var(--paper); border-bottom-color: transparent; }
.tab-label { font-family: var(--font-display); font-size: 16px; color: var(--ink); }
.tab-meta {
  font-family: var(--font-mono); font-size: 11px; font-variant-numeric: tabular-nums;
}
.tab-meta.band-ok { color: var(--success); }
.tab-meta.band-under, .tab-meta.band-over { color: var(--warn, #b58800); }
.tab-meta.band-far-under, .tab-meta.band-far-over { color: var(--danger); }

.simulator-task { margin-bottom: 16px; }

.prompt-zone {
  margin-bottom: 12px;
  padding: 14px 16px;
  background: var(--paper-deep);
  border-radius: 4px;
}
.prompt-zone summary {
  cursor: pointer;
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute);
}
.prompt-zone-text { margin-top: 10px; font-family: var(--font-body); font-size: 14px; line-height: 1.55; white-space: pre-wrap; }
.prompt-zone-context {
  margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--hairline);
  font-family: var(--font-body); font-style: italic; font-size: 13px; color: var(--ink-soft);
  white-space: pre-wrap;
}

.editor-textarea {
  width: 100%;
  padding: 16px 16px 32px;
  border: 1px solid var(--rule); border-radius: 4px;
  font-family: var(--font-body); font-size: 16px; line-height: 1.65; color: var(--ink);
  background: var(--paper); resize: vertical; outline: none;
}
.editor-textarea:focus { border-color: var(--accent); }
.editor-textarea[readonly] { background: var(--paper-deep); }

.editor-meta {
  margin-top: -28px; position: relative; right: 12px; text-align: right;
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
  display: flex; gap: 12px; justify-content: flex-end; pointer-events: none;
}
.word-count.band-ok { color: var(--success); }
.word-count.band-under, .word-count.band-over { color: var(--warn, #b58800); }
.word-count.band-far-under, .word-count.band-far-over { color: var(--danger); }
.word-target { color: var(--mute); }

.simulator-actions {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 24px; gap: 16px;
}
.simulator-cost-hint {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
}
@media (max-width: 720px) {
  .simulator-actions { flex-direction: column-reverse; align-items: stretch; }
}
</style>
```

NOTE: References `simulator-result` route — added in Task 8.

- [ ] **Step 3: Typecheck**

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/modules/simulator-c1/SimulatorRun.vue src/router.ts
git commit -m "feat(simulator): run page — timer + tabs + autosave + submit"
```

---

## Task 8: SimulatorResult page + route + home tile + breadcrumb bump

**Files:**
- Create: `src/modules/simulator-c1/SimulatorResult.vue`
- Modify: `src/router.ts`
- Modify: `src/modules/home/Home.vue`

- [ ] **Step 1: Add the route**

In `src/router.ts`, after `simulator-run`:

```ts
  { path: '/simulator/result/:sessionId', name: 'simulator-result', component: () => import('./modules/simulator-c1/SimulatorResult.vue') }
```

- [ ] **Step 2: Create the result page**

Create `src/modules/simulator-c1/SimulatorResult.vue`:

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../../db'
import type { WritingDraft, WritingPrompt } from '../../data/writingPrompts'
import { getPromptById } from '../../composables/useWritingPrompts'
import {
  computeReport,
  resumeSession,
  submitAndGrade,
  type GradeFn
} from '../../composables/useSimulatorC1'
import type { SimulatorSession } from '../../data/simulatorC1'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { useSettings } from '../../composables/useSettings'
import { makeGeminiClient } from '../../composables/useClaude'
import { useLoading } from '../../composables/useLoading'
import { useToast } from '../../composables/useToast'
import { gradeAndPersist } from '../../composables/useWritingGrader'
import { RUBRICS, type GradeCriterion, type WritingGradeResult } from '../../data/rubrics'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const loading = useLoading()
const { settings, hasApiKey, load: loadSettings } = useSettings()

const sessionId = computed(() => route.params.sessionId as string)
const session = ref<SimulatorSession | null>(null)
const prompt1 = ref<WritingPrompt | null>(null)
const prompt2 = ref<WritingPrompt | null>(null)
const draft1 = ref<WritingDraft | null>(null)
const draft2 = ref<WritingDraft | null>(null)
const initializing = ref(true)
const error = ref<string | null>(null)
const retrying = ref(false)
const historySaved = ref(false)
const expanded = ref<{ t1: boolean; t2: boolean }>({ t1: false, t2: false })

const report = computed(() => {
  if (!session.value || !draft1.value || !draft2.value) return null
  return computeReport(session.value, draft1.value, draft2.value)
})

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const timeTaken = computed(() => {
  if (!session.value || !session.value.submittedAt) return null
  return session.value.submittedAt - session.value.startedAt
})

const ungradedTasks = computed(() => {
  const missing: number[] = []
  if (draft1.value && !draft1.value.result) missing.push(1)
  if (draft2.value && !draft2.value.result) missing.push(2)
  return missing
})

async function load() {
  initializing.value = true
  try {
    const s = await resumeSession(sessionId.value)
    if (!s) {
      error.value = 'Sitzung nicht gefunden.'
      return
    }
    session.value = s
    prompt1.value = getPromptById(s.task1PromptId)
    prompt2.value = getPromptById(s.task2PromptId)
    draft1.value = await db.writingDrafts.get(s.task1DraftId) ?? null
    draft2.value = await db.writingDrafts.get(s.task2DraftId) ?? null
    if (!prompt1.value || !prompt2.value || !draft1.value || !draft2.value) {
      error.value = 'Sitzungsdaten unvollständig.'
      return
    }
    maybeSaveHistory()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ladefehler.'
  } finally {
    initializing.value = false
  }
}

async function tryGradeMissing() {
  if (!session.value || !prompt1.value || !prompt2.value) return
  if (!hasApiKey.value) {
    toast.error('Gemini API key required', { description: 'Bitte API-Key in den Einstellungen setzen.' })
    return
  }
  retrying.value = true
  try {
    const grader: GradeFn = async (draft) => {
      const p = draft.id === session.value!.task1DraftId ? prompt1.value! : prompt2.value!
      const client = makeGeminiClient(settings.value.geminiApiKey)
      return await gradeAndPersist(client, settings.value.model, p, draft, 'goethe-c1')
    }
    await loading.wrap(
      async () => submitAndGrade(session.value!.id, grader),
      { title: 'Bewerten…', subtitle: 'Fehlende Aufgabe(n) werden bewertet.' }
    )
    await load()
  } catch (err) {
    toast.error('Bewertung fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    retrying.value = false
  }
}

onMounted(async () => {
  await loadSettings()
  await load()
})

// Persist history exactly once, when both tasks are graded. Called from
// load() and from tryGradeMissing() after a successful regrade.
function maybeSaveHistory() {
  if (historySaved.value) return
  if (!session.value || !report.value || session.value.status !== 'graded') return
  if (report.value.task1Score === null || report.value.task2Score === null) return
  historySaved.value = true
  const dur = (session.value.submittedAt ?? Date.now()) - session.value.startedAt
  saveQuizRun({
    type: 'simulator-c1',
    startedAt: new Date(session.value.startedAt).toISOString(),
    finishedAt: new Date(session.value.gradedAt ?? Date.now()).toISOString(),
    durationMs: dur,
    count: 1,
    correct: report.value.passes ? 1 : 0,
    meta: {
      sessionId: session.value.id,
      task1Score: report.value.task1Score,
      task2Score: report.value.task2Score,
      combinedScore: report.value.combinedScore ?? undefined,
      passes: report.value.passes
    }
  })
}

function back() { router.push({ name: 'simulator-c1' }) }
function newRun() { router.push({ name: 'simulator-c1' }) }

function paragraphTextAt(draft: WritingDraft | null, idx: number): string {
  if (!draft) return ''
  const paras = draft.text.split(/\n\s*\n+/).map(s => s.trim()).filter(s => s.length > 0)
  return paras[idx] ?? ''
}
</script>

<template>
  <div v-if="initializing" class="page loading-state"><div class="micro-mark">Loading…</div></div>
  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="back">← Back</button>
  </div>
  <div v-else-if="session && prompt1 && prompt2 && draft1 && draft2 && report" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Goethe C1</div>
        <div class="result-score">
          <span class="result-score-num">{{ report.combinedScore ?? '—' }}</span><span class="result-score-denom"> / 100</span>
        </div>
        <p class="section-subtitle">
          <span v-if="timeTaken !== null">Bearbeitungszeit: {{ formatTime(timeTaken) }} · </span>
          Goethe-C1-Gewichtung 60/40 (Forumsbeitrag/E-Mail).
        </p>
      </div>
      <div class="result-actions">
        <span class="result-pass-chip" :class="report.passes ? 'is-pass' : 'is-fail'">{{ report.passes ? 'BESTANDEN' : 'NICHT BESTANDEN' }}</span>
      </div>
    </header>

    <div class="alert alert-info simulator-disclaimer-small">
      <span class="alert-label">Hinweis</span>
      Bewertungen sind indikativ. Übe ergänzend mit dem offiziellen Modellsatz.
    </div>

    <div class="result-task-chips">
      <div class="task-chip">
        <span class="task-chip-label">Aufgabe 1 · Forumsbeitrag</span>
        <span class="task-chip-score">{{ report.task1Score ?? '—' }} / 100 · {{ report.task1Band ?? '—' }}</span>
      </div>
      <div class="task-chip">
        <span class="task-chip-label">Aufgabe 2 · formelle E-Mail</span>
        <span class="task-chip-score">{{ report.task2Score ?? '—' }} / 100 · {{ report.task2Band ?? '—' }}</span>
      </div>
    </div>

    <div v-if="ungradedTasks.length > 0" class="alert alert-warning">
      <span class="alert-label">Unvollständig</span>
      Aufgabe {{ ungradedTasks.join(' & ') }} wurde nicht erfolgreich bewertet.
      <button class="btn btn-quiet" type="button" :disabled="retrying" @click="tryGradeMissing">{{ retrying ? 'Bewerte…' : 'Erneut bewerten' }}</button>
    </div>

    <!-- Per-task panels -->
    <section class="result-tasks">
      <article v-for="taskNum in [1, 2] as const" :key="taskNum" class="result-task-card card">
        <header class="result-task-head" role="button" tabindex="0"
          @click="taskNum === 1 ? expanded.t1 = !expanded.t1 : expanded.t2 = !expanded.t2"
          @keydown.enter="taskNum === 1 ? expanded.t1 = !expanded.t1 : expanded.t2 = !expanded.t2"
        >
          <div>
            <h3 class="result-task-title">
              Aufgabe {{ taskNum }} · {{ taskNum === 1 ? prompt1.titleDe : prompt2.titleDe }}
            </h3>
            <div class="result-task-meta">
              Score: {{ (taskNum === 1 ? report.task1Score : report.task2Score) ?? '—' }} / 100 ·
              Band: {{ (taskNum === 1 ? report.task1Band : report.task2Band) ?? '—' }} ·
              {{ (taskNum === 1 ? draft1.wordCount : draft2.wordCount) }} Wörter
            </div>
          </div>
          <span class="result-task-toggle">{{ (taskNum === 1 ? expanded.t1 : expanded.t2) ? '−' : '+' }}</span>
        </header>

        <div v-if="(taskNum === 1 ? expanded.t1 : expanded.t2) && (taskNum === 1 ? draft1.result : draft2.result)" class="result-task-body">
          <!-- Score block -->
          <div class="result-task-overall">
            <div class="result-task-overall-de">{{ (taskNum === 1 ? draft1.result : draft2.result)!.overallDe }}</div>
            <div class="result-task-overall-en">{{ (taskNum === 1 ? draft1.result : draft2.result)!.overallEn }}</div>
          </div>

          <!-- Criteria -->
          <h4 class="result-task-section-title">Per criterion</h4>
          <ul class="criteria-list">
            <li v-for="c in ((taskNum === 1 ? draft1.result : draft2.result) as WritingGradeResult).criteria" :key="c.key" class="criterion-card">
              <div class="criterion-head">
                <span class="criterion-label">{{ c.labelDe }}</span>
                <span class="criterion-score">{{ c.score }} / {{ c.maxPoints }}</span>
              </div>
              <div class="criterion-strengths"><strong>+</strong> {{ c.strengthsDe }}</div>
              <div class="criterion-weaknesses"><strong>−</strong> {{ c.weaknessesDe }}</div>
            </li>
          </ul>

          <!-- Paragraph feedback -->
          <h4 class="result-task-section-title">Per paragraph</h4>
          <ul class="paragraph-list">
            <li v-for="p in ((taskNum === 1 ? draft1.result : draft2.result) as WritingGradeResult).paragraphFeedback" :key="p.paragraphIndex" class="paragraph-card">
              <div class="paragraph-head">
                <span class="paragraph-label">Absatz {{ p.paragraphIndex + 1 }}</span>
              </div>
              <div class="paragraph-summary">{{ p.summaryDe }}</div>
              <details v-if="p.upgradedText" class="paragraph-upgrade">
                <summary>Vorschlag (C1-Register)</summary>
                <div class="paragraph-upgrade-row">
                  <div class="paragraph-upgrade-cell">
                    <div class="paragraph-upgrade-cell-label">Original</div>
                    <div class="paragraph-upgrade-cell-text">{{ paragraphTextAt(taskNum === 1 ? draft1 : draft2, p.paragraphIndex) }}</div>
                  </div>
                  <div class="paragraph-upgrade-cell">
                    <div class="paragraph-upgrade-cell-label">Vorschlag</div>
                    <div class="paragraph-upgrade-cell-text">{{ p.upgradedText }}</div>
                  </div>
                </div>
              </details>
            </li>
          </ul>
        </div>
      </article>
    </section>

    <div class="result-page-actions">
      <button class="btn btn-ghost" type="button" @click="back">Home</button>
      <button class="btn btn-accent" type="button" @click="newRun">Neue Prüfung starten <span aria-hidden="true">→</span></button>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-score { display: flex; align-items: baseline; gap: 4px; margin-bottom: 4px; }
.result-score-num { font-family: var(--font-display); font-size: 56px; font-weight: 500; color: var(--ink); }
.result-score-denom { font-family: var(--font-display); font-size: 18px; color: var(--mute); }
.result-pass-chip {
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.22em;
  text-transform: uppercase; padding: 6px 12px; border-radius: 3px;
}
.result-pass-chip.is-pass { background: color-mix(in srgb, var(--success) 18%, transparent); color: var(--success); }
.result-pass-chip.is-fail { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }

.simulator-disclaimer-small { margin: 16px 0 20px; }

.result-task-chips {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;
}
@media (max-width: 720px) { .result-task-chips { grid-template-columns: 1fr; } }
.task-chip {
  padding: 14px 16px; background: var(--paper-deep); border-radius: 4px;
  display: flex; flex-direction: column; gap: 6px;
}
.task-chip-label { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mute); }
.task-chip-score { font-family: var(--font-display); font-size: 20px; color: var(--ink); }

.result-tasks { margin-top: 20px; display: grid; gap: 12px; }
.result-task-card { padding: 0; overflow: hidden; }
.result-task-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; cursor: pointer; user-select: none;
}
.result-task-title { font-family: var(--font-display); font-size: 17px; margin: 0; }
.result-task-meta { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--mute); margin-top: 4px; }
.result-task-toggle { font-family: var(--font-mono); font-size: 20px; color: var(--accent); }

.result-task-body { padding: 0 18px 18px; border-top: 1px solid var(--hairline); }
.result-task-overall { margin-top: 14px; }
.result-task-overall-de { font-size: 14px; line-height: 1.55; }
.result-task-overall-en { font-size: 13px; color: var(--ink-soft); font-style: italic; margin-top: 6px; }
.result-task-section-title {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin: 20px 0 10px;
}

.criteria-list, .paragraph-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.criterion-card, .paragraph-card { padding: 12px 14px; background: var(--paper-deep); border-radius: 4px; }
.criterion-head, .paragraph-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
.criterion-label, .paragraph-label { font-family: var(--font-display); font-size: 15px; }
.criterion-score { font-family: var(--font-mono); color: var(--accent); font-variant-numeric: tabular-nums; }
.criterion-strengths, .criterion-weaknesses { font-size: 13.5px; line-height: 1.5; margin: 4px 0; }
.criterion-strengths strong { color: var(--success); margin-right: 4px; }
.criterion-weaknesses strong { color: var(--danger); margin-right: 4px; }
.paragraph-summary { font-size: 13.5px; line-height: 1.5; color: var(--ink-soft); }

.paragraph-upgrade { margin-top: 8px; }
.paragraph-upgrade summary {
  cursor: pointer;
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--mute);
}
.paragraph-upgrade-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
@media (max-width: 720px) { .paragraph-upgrade-row { grid-template-columns: 1fr; } }
.paragraph-upgrade-cell { padding: 10px; background: var(--paper); border: 1px solid var(--hairline); border-radius: 4px; }
.paragraph-upgrade-cell-label { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--mute); margin-bottom: 4px; }
.paragraph-upgrade-cell-text { font-family: var(--font-body); font-size: 13.5px; line-height: 1.55; white-space: pre-wrap; }

.result-page-actions { display: flex; justify-content: space-between; gap: 12px; margin-top: 32px; }
</style>
```

- [ ] **Step 3: Add the home tile + breadcrumb bump**

In `src/modules/home/Home.vue`, insert a new entry into `modules` between the existing Writing tutor entry (numeral VI) and the Settings entry (currently numeral VII):

```ts
  {
    numeral: 'VII',
    route: 'simulator-c1',
    de: 'Goethe C1 · Schreiben',
    title: 'Mock exam',
    desc: 'Sit a timed Goethe C1 Schreiben mock — Forumsbeitrag und formelle E-Mail in 75 Minuten, beide automatisch nach der offiziellen Rubrik bewertet.',
    meta: '75 min · 2 Aufgaben · AI-graded'
  },
```

Renumber the existing Settings entry from `numeral: 'VII'` to `numeral: 'VIII'`. Update the template breadcrumb from `Frontispiece · I/VII` to `Frontispiece · I/VIII`.

- [ ] **Step 4: Typecheck**

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/modules/simulator-c1/SimulatorResult.vue src/router.ts src/modules/home/Home.vue
git commit -m "feat(simulator): result page + home tile + breadcrumb bump"
```

---

## Task 9: Final verification

**Files:** none modified.

- [ ] **Step 1: Run the full test suite**

```
npm test
```

Expected: ALL tests pass — at minimum the new simulator-c1 tests plus every test that was passing before this sprint (~380+ across ~38 files).

- [ ] **Step 2: Run the full typecheck**

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 3: Manual smoke (user-driven, requires Gemini key)**

Document for the user — do not run yourself:

1. From `/`, click the **Mock exam** tile (numeral VII) → land on `/simulator`.
2. Click **Start** → land on `/simulator/run/:sessionId` with the timer counting down from 75:00.
3. Switch tabs — Aufgabe 1 shows a Forumsbeitrag prompt, Aufgabe 2 shows an E-Mail prompt.
4. Type ~150 words in each task; watch the band colour transition. Refresh the tab — confirm the text and the timer survive.
5. Click **Submit & grade** → loading overlay → land on `/simulator/result/:sessionId`.
6. Confirm the combined score appears with PASS/FAIL chip, both task chips show their scores, the per-task panels expand to show criteria.
7. Visit `/history` → confirm a `Goethe C1 — mock exam` row exists with the combined score and PASS/FAIL chip.
8. From `/`, confirm the breadcrumb reads `Frontispiece · I/VIII` and the Mock-exam tile sits at numeral VII.

- [ ] **Step 4: Verify all simulator files are present**

```
ls E:/Projects/German/src/modules/simulator-c1/
ls E:/Projects/German/src/composables/ | grep -i simulator
ls E:/Projects/German/src/data/ | grep simulatorC1
```

Expected: `SimulatorHome.vue`, `SimulatorRun.vue`, `SimulatorResult.vue` in modules/simulator-c1; `useSimulatorC1.ts` in composables; `simulatorC1.ts` in data.

- [ ] **Step 5: Verify the git log shape**

```
git log --oneline d357547..HEAD
```

Expected: ~8 commits, the most recent being the result-page commit from Task 8.

- [ ] **Step 6: No commit needed**

Verification only.

---

## Definition of Done

- [ ] `/simulator` is reachable from the home page; tile lands cleanly without console errors.
- [ ] "Start new exam" creates a session, randomly pairs Goethe-C1 prompts, and lands in `/simulator/run/:sessionId` with timer counting down.
- [ ] Tab switcher swaps between Aufgabe 1 and Aufgabe 2; word counters update live; autosave persists text to `writingDrafts`.
- [ ] "Submit & grade" disabled until both tasks ≥ 60% of min word target; on click, runs both grades sequentially and lands on `/simulator/result/:sessionId`.
- [ ] Result page shows weighted combined score, P/F badge, per-task chips, time taken, and two expandable per-task panels with full criteria/paragraph-feedback UI.
- [ ] Timer reaches 0 → auto-submit kicks in; if the tab is closed at the time, the next visit to `/simulator` shows "Time's up — grade now or abandon."
- [ ] A `'simulator-c1'` history entry appears in `/history` with combined score, band-style chip, and per-task scores.
- [ ] Composable tests pass (`npm test`); typecheck clean (`npm run typecheck`).
- [ ] Disclaimer ribbon visible on all three simulator screens.
