# Phase 0 — Recording Foundation (ADR-0010 retrofit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The three deterministic drills (Fixed prepositions, Principal parts, Verb case government) record a Run in quiz history when their main round finishes — retry rounds stay practice — per ADR-0010.

**Architecture:** Three new `QuizHistoryType` values flow through the existing localStorage-backed history store (`useQuizHistory.ts`) and every TS-enforced consumer record (stats, labels, level assessment, HistoryPage). Each runner copies the proven `CaseQuizRunner`/`ConjugationQuizRunner` pattern: a `startedAtMs` timestamp at engine creation, a `historySaved` once-flag, and a `watch(finished)` that records exactly once — the flag is never reset by `retryWrong()`, so retry rounds (which replace the engine instance) are never recorded.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Vitest + @vue/test-utils (jsdom), vue-tsc, localStorage history (Supabase of ADR-0005/0006 is NOT implemented — see reality note task).

## Global Constraints

- Work on branch `feat/phase0-recording` off `main`; merge back in the final task.
- New history type ids (exact strings): `'prep-collocations'`, `'verb-stammformen'`, `'verb-case-government'`.
- Retry rounds must never record (ADR-0010: "A retry round remains practice, never a Run").
- Runs with `total === 0` must never record.
- Meta values are derived from the actually sampled questions (like `CaseQuizRunner`), not from raw query params.
- Full gates before merge: `npm run test` green, `npm run typecheck` green.
- Mobile is the primary target (~390px) — the History page filter row must remain usable with the three new chips.
- Commit after every task; end commit messages with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: History plumbing — three new Run types across every consumer

**Files:**
- Modify: `src/composables/useQuizHistory.ts` (union at lines 4-26; meta interface ~line 49)
- Modify: `src/composables/useQuizStats.ts` (`zeroRunsByType()` lines 88-113, `zeroAccuracyByType()` lines 115-140)
- Modify: `src/components/charts/quiz-type-labels.ts` (`QUIZ_TYPE_LABEL`, `QUIZ_TYPE_DE`, `QUIZ_TYPES_ORDER`)
- Modify: `src/composables/useLevelAssessment.ts` (`TYPE_LABEL` lines 88-111)
- Modify: `src/modules/history/HistoryPage.vue` (`QUIZ_TYPES` lines 43-66, `typeOrder` lines 68-81, `summariseMeta` generic branch ~lines 215-221)
- Test: `tests/components/quiz-type-labels.test.ts` (new)
- Test: `tests/composables/useQuizHistory.test.ts` (extend)

**Interfaces:**
- Consumes: existing `saveQuizRun(entry: Omit<QuizHistoryEntry,'id'>): void`, `loadHistory(): QuizHistoryEntry[]`.
- Produces: union members `'prep-collocations' | 'verb-stammformen' | 'verb-case-government'` on `QuizHistoryType`; new meta field `roles?: string[]` on `QuizHistoryMeta`. Tasks 2-4 rely on exactly these names.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feat/phase0-recording
```

- [ ] **Step 2: Write the failing tests**

New file `tests/components/quiz-type-labels.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { QUIZ_TYPE_LABEL, QUIZ_TYPE_DE, QUIZ_TYPES_ORDER } from '../../src/components/charts/quiz-type-labels'

describe('quiz-type-labels', () => {
  it('QUIZ_TYPES_ORDER lists every labelled type exactly once', () => {
    expect([...QUIZ_TYPES_ORDER].sort()).toEqual(Object.keys(QUIZ_TYPE_LABEL).sort())
    expect(new Set(QUIZ_TYPES_ORDER).size).toBe(QUIZ_TYPES_ORDER.length)
  })

  it('every type has a German label', () => {
    expect(Object.keys(QUIZ_TYPE_DE).sort()).toEqual(Object.keys(QUIZ_TYPE_LABEL).sort())
  })

  it('includes the deterministic drills (ADR-0010)', () => {
    expect(QUIZ_TYPES_ORDER).toContain('prep-collocations')
    expect(QUIZ_TYPES_ORDER).toContain('verb-stammformen')
    expect(QUIZ_TYPES_ORDER).toContain('verb-case-government')
  })
})
```

Append to `tests/composables/useQuizHistory.test.ts` (inside the existing top-level describe, following the file's existing save/load style — it clears localStorage in `beforeEach`):

```ts
it('round-trips the deterministic-drill types and their meta (ADR-0010)', () => {
  saveQuizRun({
    type: 'prep-collocations',
    startedAt: '2026-07-23T10:00:00.000Z', finishedAt: '2026-07-23T10:05:00.000Z',
    durationMs: 300_000, count: 10, correct: 8,
    meta: { levels: ['B1', 'B2'], roles: ['noun', 'verb'] }
  })
  saveQuizRun({
    type: 'verb-stammformen',
    startedAt: '2026-07-23T11:00:00.000Z', finishedAt: '2026-07-23T11:04:00.000Z',
    durationMs: 240_000, count: 10, correct: 9,
    meta: { levels: ['A1', 'A2'], types: ['irregular'] }
  })
  saveQuizRun({
    type: 'verb-case-government',
    startedAt: '2026-07-23T12:00:00.000Z', finishedAt: '2026-07-23T12:03:00.000Z',
    durationMs: 180_000, count: 10, correct: 7,
    meta: { levels: ['B1'], types: ['regular'], cases: ['dative'] }
  })
  const all = loadHistory()
  expect(all.map(e => e.type)).toEqual(['verb-case-government', 'verb-stammformen', 'prep-collocations'])
  expect(all[2].meta.roles).toEqual(['noun', 'verb'])
  expect(all[0].meta.cases).toEqual(['dative'])
})
```

- [ ] **Step 3: Verify failure**

Run: `npx vitest run tests/components/quiz-type-labels.test.ts` → FAIL ("includes the deterministic drills").
Run: `npm run typecheck` → FAIL (`'prep-collocations'` not assignable to `QuizHistoryType`).

- [ ] **Step 4: Implement**

`src/composables/useQuizHistory.ts` — extend the union (keep the existing grouping):

```ts
  | 'prep-two-way'
  | 'prep-collocations'
  ...
  | 'verb-conjugation'
  | 'verb-stammformen'
  | 'verb-case-government'
```

Add to `QuizHistoryMeta` next to `levels?/types?/cases?`:

```ts
  roles?: string[]   // Fixed prepositions drill: collocation word types (verb/adjective/noun)
```

`src/components/charts/quiz-type-labels.ts` — add to BOTH records and the order array:

```ts
// QUIZ_TYPE_LABEL
'prep-collocations': 'Preposition · fixed',
'verb-stammformen': 'Verb · principal parts',
'verb-case-government': 'Verb · case government',
// QUIZ_TYPE_DE
'prep-collocations': 'Feste Präpositionen',
'verb-stammformen': 'Verb · Stammformen',
'verb-case-government': 'Verb · Rektion',
```

`QUIZ_TYPES_ORDER`: insert `'verb-stammformen', 'verb-case-government'` directly after `'verb-conjugation'`, and `'prep-collocations'` directly after `'prep-two-way'`.

`src/composables/useQuizStats.ts` — add to both zero-maps (`zeroRunsByType`: value `0`; `zeroAccuracyByType`: same zero-bucket literal the neighbors use):

```ts
'prep-collocations': 0,
'verb-stammformen': 0,
'verb-case-government': 0,
```

`src/composables/useLevelAssessment.ts` — add to `TYPE_LABEL` (match neighbor style):

```ts
'prep-collocations': 'Fixed prepositions',
'verb-stammformen': 'Verb principal parts',
'verb-case-government': 'Verb case government',
```

`src/modules/history/HistoryPage.vue` — add to `QUIZ_TYPES`:

```ts
'prep-collocations':    { label: 'Preposition · fixed',    de: 'Feste Präpositionen', module: 'Prepositions' },
'verb-stammformen':     { label: 'Verb · principal parts', de: 'Verb · Stammformen',  module: 'Verbs' },
'verb-case-government': { label: 'Verb · case government', de: 'Verb · Rektion',      module: 'Verbs' },
```

`typeOrder`: insert `'verb-stammformen', 'verb-case-government'` after `'verb-conjugation'` and `'prep-collocations'` after `'prep-two-way'`. In `summariseMeta`'s generic branch, alongside the existing `m.types` handling and using the same accumulator variable, add:

```ts
if (m.roles?.length) parts.push(m.roles.join(', '))
```

- [ ] **Step 5: Verify green**

Run: `npx vitest run tests/components/quiz-type-labels.test.ts tests/composables/useQuizHistory.test.ts` → PASS.
Run: `npm run typecheck` → PASS (this proves all five TS-enforced records were extended).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(history): prep-collocations + verb-stammformen + verb-case-government Run types"
```

---

### Task 2: CollocationsRunner records a Run (main round only)

**Files:**
- Modify: `src/modules/prepositions/CollocationsRunner.vue` (watch at lines 175-177; `retryWrong` at 179-188; engine creation in `onMounted` ~lines 55-70)
- Test: `tests/modules/prepositions/CollocationsRunner.test.ts` (extend)

**Interfaces:**
- Consumes: `saveQuizRun` + `'prep-collocations'` type and `roles` meta from Task 1; engine API `useCollocationQuiz` → `{ questions, finished, score, total, wrongItems }`, question shape `{ item: Collocation, ... }` with `item.level` / `item.role`.
- Produces: nothing later tasks rely on (pattern is repeated verbatim per drill).

- [ ] **Step 1: Write the failing tests**

Append to `tests/modules/prepositions/CollocationsRunner.test.ts`. At the top of the file (after existing mocks, before imports of the component are evaluated) add the history mock; note the existing `mountRunner` helper is reused:

```ts
vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'
```

New describe block. Driving one card to completion mirrors the existing "summary rows carry per-item style vars" test (answer → Submit → button starting with `'Finish'` → RetryModal). RetryModal's buttons are `Retry {n} wrong →` (accent) and `Review instead` (ghost).

```ts
describe('CollocationsRunner — history recording (ADR-0010)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  async function completeOneCardWrong(wrapper: Awaited<ReturnType<typeof mountRunner>>['wrapper']) {
    await wrapper.find('.input-prep').setValue('xxx')          // guaranteed-wrong preposition
    const akk = wrapper.findAll('button').find(b => b.text() === 'Akkusativ')
    await akk!.trigger('click')
    const submit = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    await submit!.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1', retype: '0' })
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'prep-collocations',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({ levels: ['B1'], roles: ['verb'] }),
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1', retype: '0' })
    await completeOneCardWrong(wrapper)
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')                            // start retry round
    await completeOneCardWrong(wrapper)                        // finish retry round
    expect(saveQuizRun).toHaveBeenCalledTimes(1)               // still only the main round
    wrapper.unmount()
  })
})
```

If the wrong-answer path forces the retype-on-miss box despite `retype: '0'`, check the runner's `retype` query handling (`route.query.retype !== '0'`) — the test passes `'0'` to disable it. Adjust the driver only if a step's button genuinely differs; assertions stay as written.

- [ ] **Step 2: Verify failure**

Run: `npx vitest run tests/modules/prepositions/CollocationsRunner.test.ts` → the two new tests FAIL (`saveQuizRun` never called).

- [ ] **Step 3: Implement**

In `src/modules/prepositions/CollocationsRunner.vue`:

```ts
import { saveQuizRun } from '../../composables/useQuizHistory'

const startedAtMs = ref(0)
const historySaved = ref(false)
```

Set the clock where the engine is created in `onMounted` (right after `quiz.value = useCollocationQuiz(...)`):

```ts
startedAtMs.value = Date.now()
```

Extend the finish watch (lines 175-177) — record BEFORE the retry modal logic:

```ts
// Record the main round once; retry rounds are practice, never a Run (ADR-0010).
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  const qs = quiz.value.questions.value
  saveQuizRun({
    type: 'prep-collocations',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: {
      levels: Array.from(new Set(qs.map(q => q.item.level))).sort(),
      roles: Array.from(new Set(qs.map(q => q.item.role))).sort(),
    },
  })
}

watch(finished, (now) => {
  if (now && ready.value) {
    recordRun()
    onFinished()
  }
})
```

`retryWrong()` must NOT reset `historySaved` (leave it untouched).

- [ ] **Step 4: Verify green**

Run: `npx vitest run tests/modules/prepositions/CollocationsRunner.test.ts` → ALL tests PASS (including the pre-existing ones).
Run: `npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(prep): Fixed prepositions drill records a Run (ADR-0010)"
```

---

### Task 3: StammformenRunner records a Run (main round only)

**Files:**
- Modify: `src/modules/verbs/StammformenRunner.vue` (watch at lines 122-124; `retryWrong` at 126-134; engine creation in `onMounted` ~lines 42-50)
- Test: `tests/modules/verbs/StammformenRunner.test.ts` (extend)

**Interfaces:**
- Consumes: `saveQuizRun` + `'verb-stammformen'` from Task 1; engine API `useStammformenQuiz` → `{ questions, finished, score, total, wrongVerbs }`, question shape `{ verb: Verb, ... }` with `verb.level` / `verb.type`.
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing tests**

Append to `tests/modules/verbs/StammformenRunner.test.ts`. Add the same mock as Task 2 (adjust relative path):

```ts
vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'
```

Drive one card: copy the fill-and-submit sequence from this file's existing "feedback after submit" test (its selectors for the Präteritum/Partizip inputs and the haben/sein buttons are already proven), enter a guaranteed-wrong Präteritum (`'xxx'`), submit, then click the advance button that appears (text starts with `'Finish'` on the last card; fall back to the button that advances if labeled differently in this runner — mirror the existing test's completion approach). Then:

```ts
describe('StammformenRunner — history recording (ADR-0010)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  it('records exactly one Run when the main round finishes', async () => {
    const { wrapper } = await mountRunner({ levels: 'A1', types: 'irregular', count: '1' })
    await completeOneCardWrong(wrapper)   // helper extracted as described above
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'verb-stammformen',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({ levels: ['A1'], types: ['irregular'] }),
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner({ levels: 'A1', types: 'irregular', count: '1' })
    await completeOneCardWrong(wrapper)
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
```

(If this test file has no `mountRunner` helper yet, create one mirroring the CollocationsRunner test's — memory router with the `verbs-stammformen-run` / `verbs-stammformen` / `verbs` routes from `src/router.ts`.)

- [ ] **Step 2: Verify failure**

Run: `npx vitest run tests/modules/verbs/StammformenRunner.test.ts` → new tests FAIL.

- [ ] **Step 3: Implement**

Same pattern as Task 2, in `src/modules/verbs/StammformenRunner.vue`:

```ts
import { saveQuizRun } from '../../composables/useQuizHistory'

const startedAtMs = ref(0)      // set to Date.now() right after quiz.value = useStammformenQuiz(...)
const historySaved = ref(false)

function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  const qs = quiz.value.questions.value
  saveQuizRun({
    type: 'verb-stammformen',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: {
      levels: Array.from(new Set(qs.map(q => q.verb.level))).sort(),
      types: Array.from(new Set(qs.map(q => q.verb.type))).sort(),
    },
  })
}

watch(finished, (now) => {
  if (now && ready.value) {
    recordRun()
    onFinished()
  }
})
```

`retryWrong()` unchanged (does not touch `historySaved`).

- [ ] **Step 4: Verify green**

Run: `npx vitest run tests/modules/verbs/StammformenRunner.test.ts` → PASS. `npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(verbs): Stammformen drill records a Run (ADR-0010)"
```

---

### Task 4: CaseGovernmentRunner records a Run (main round only)

**Files:**
- Modify: `src/modules/verbs/CaseGovernmentRunner.vue` (watch at lines 144-148; `retryWrong` at 150-159; engine creation in `onMounted` ~lines 58-70)
- Test: `tests/modules/verbs/CaseGovernmentRunner.test.ts` (extend)

**Interfaces:**
- Consumes: `saveQuizRun` + `'verb-case-government'` from Task 1; engine API `useCaseGovernmentQuiz` → `{ questions, finished, pick, score, total, wrongVerbs }`, question shape `{ verb: Verb, ... }` with `verb.level` / `verb.type` / `verb.case`.
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing tests**

Append to `tests/modules/verbs/CaseGovernmentRunner.test.ts`, same mock pattern (path `'../../../src/composables/useQuizHistory'`). Guaranteed-wrong pick: mount with `cases: 'dative'` so every sampled verb governs dative, then click the **Genitiv** case button (this runner grades on pick — the existing "feedback after pick" test shows the button-finding approach). Advance via the button that appears after the pick (text starts with `'Finish'` on the last card — mirror the existing tests).

```ts
describe('CaseGovernmentRunner — history recording (ADR-0010)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  it('records exactly one Run when the main round finishes', async () => {
    const { wrapper } = await mountRunner({ levels: 'A1', cases: 'dative', count: '1' })
    await completeOneCardWrong(wrapper)   // pick Genitiv → wrong; then advance/finish
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'verb-case-government',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({ levels: ['A1'], cases: ['dative'] }),
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner({ levels: 'A1', cases: 'dative', count: '1' })
    await completeOneCardWrong(wrapper)
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run tests/modules/verbs/CaseGovernmentRunner.test.ts` → new tests FAIL.

- [ ] **Step 3: Implement**

In `src/modules/verbs/CaseGovernmentRunner.vue` — note this runner's watch condition is inline; restructure so recording happens on every main-round finish (even with zero wrong answers), then the modal logic:

```ts
import { saveQuizRun } from '../../composables/useQuizHistory'

const startedAtMs = ref(0)      // set to Date.now() right after quiz.value = useCaseGovernmentQuiz(...)
const historySaved = ref(false)

function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  const qs = quiz.value.questions.value
  saveQuizRun({
    type: 'verb-case-government',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: {
      levels: Array.from(new Set(qs.map(q => q.verb.level))).sort(),
      types: Array.from(new Set(qs.map(q => q.verb.type))).sort(),
      cases: Array.from(new Set(qs.map(q => q.verb.case))).sort(),
    },
  })
}

watch(finished, (now) => {
  if (now && ready.value) {
    recordRun()
    if (wrongVerbs.value.length > 0 && !dismissed.value) {
      showRetryModal.value = true
    }
  }
})
```

`retryWrong()` unchanged (does not touch `historySaved`). The mid-drill "End drill" button is an abandonment path and must NOT record (it navigates away without `finished` becoming true — no change needed, just don't add recording there).

- [ ] **Step 4: Verify green**

Run: `npx vitest run tests/modules/verbs/CaseGovernmentRunner.test.ts` → PASS. `npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(verbs): Case government drill records a Run (ADR-0010)"
```

---

### Task 5: Docs reality-fix, changelog, release

**Files:**
- Modify: `docs/adr/0010-record-runs-when-online-for-all-drills.md` (reality note)
- Modify: `docs/superpowers/specs/2026-07-23-da-compounds-module-design.md` (§7 Phase 0 gate wording)
- Modify: `src/data/changelog.ts` (new entry + `APP_VERSION`)
- Modify: `package.json` (version)

**Interfaces:**
- Consumes: Tasks 1-4 merged and green.
- Produces: released version `1.11.35` on gh-pages.

- [ ] **Step 1: ADR-0010 reality note**

Append this paragraph to the end of the intro section (before `## Consequences`) of `docs/adr/0010-record-runs-when-online-for-all-drills.md`:

```md
**Reality note (2026-07-23):** ADR-0005/0006 (Supabase history) are accepted but **not yet
implemented** — `saveQuizRun` writes to device-local `localStorage`, which works offline. Until the
Supabase migration lands, every completed drill records locally regardless of connectivity; the
"insert online, skip silently offline" rule of this ADR binds the future remote backend, not the
current store.
```

- [ ] **Step 2: Spec gate wording**

In `docs/superpowers/specs/2026-07-23-da-compounds-module-design.md` §7, change Phase 0's row:

- Contents: `Recording foundation: ADR-0010 retrofit — Run types + recording for the three existing deterministic drills (history is currently localStorage; the online/offline rule activates with the future Supabase backend)`
- Gate check: `The three drills appear in History with correct score/meta; retry rounds are not recorded`

- [ ] **Step 3: Changelog + version bump**

`package.json`: `"version": "1.11.35"`. `src/data/changelog.ts`: `APP_VERSION = '1.11.35'` and prepend:

```ts
{
  version: '1.11.35', date: '2026-07-23', kind: 'polish',
  title: 'History · the three practice drills now count',
  notes: [
    '<strong>Fixed prepositions, Principal parts, and Case government now record to History.</strong> Every finished round lands in your quiz history with its score and filters — so the practice family finally shows up in your stats, charts, and streaks alongside every other drill.',
    '<strong>Retry rounds stay practice.</strong> Only the main round records; the focused retry-the-missed rounds remain unscored, as before.'
  ]
},
```

- [ ] **Step 4: Full verification**

Run: `npm run test` → all green. Run: `npm run typecheck` → green.
Then verify in the app (`npm run dev`): finish one short Fixed-prepositions drill and confirm it appears on the History page with the "Preposition · fixed" label, and that the filter chips row still renders cleanly at ~390px width.

- [ ] **Step 5: Merge + release**

```bash
git checkout main
git merge --no-ff feat/phase0-recording -m "Merge feat/phase0-recording: deterministic drills record Runs — v1.11.35"
npm run deploy
git push origin main
```

(If the sandbox blocks `npm run deploy` / `git push`, ask the user to run them via `!`.)
