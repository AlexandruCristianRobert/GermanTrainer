# Wiedervorlage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrections in the Korrekturdrill come due again on expanding intervals (3/10/30 days, retire after the 4th spaced success), derived read-side from the append-only events table per ADR-0025.

**Architecture:** All scheduling state is computed at read time in `useSprechenArchive.ts` from `sprechenCorrectionEvents` — no schema change, no row mutation (ADR-0012). A pure `computeSchedule(events, now)` maps one correction's events to `{ status, streak, lastCorrectAt, dueAt }`; `openCorrections` keeps its signature but "offen" now means trailing-streak-0; new `dueCorrections` and `drillQueue` feed the drill (offen newest-first, then fällig most-overdue-first). Four UI surfaces update: SprechenDrill (queue + fällig badge), SprechenArchive (three-state tags/counts), SprechenHome + SchreibenHome (offen · fällig · nachgeübt counts).

**Tech Stack:** Vue 3 `<script setup>`, Dexie (fake-indexeddb in tests), Vitest + @vue/test-utils, vue-tsc.

## Global Constraints

- ADR-0012 append-only: NEVER call `.update()`/`.modify()` on `db.sprechenCorrections` or `db.sprechenCorrectionEvents`; `recordDrillResult` stays byte-identical.
- ADR-0025 constants, verbatim: intervals `[3, 10, 30]` days, retire at streak `4`; a wrong event resets the streak to 0 (status offen).
- Counts are shown side by side ("offen", "fällig", "nachgeübt"), never summed into one number.
- German UI copy, lowercase state words: `offen`, `fällig`, `nachgeübt` (ASCII `faellig`/`nachgeuebt` only in code identifiers).
- Test convention: mock `Date.now` via `vi.spyOn(Date, 'now')`, never `vi.useFakeTimers()` (fake-indexeddb stalls under fake timers — see `tests/db/sprechenArchive.test.ts:50`).
- Run tests with `npx vitest run <file>`; typecheck is `npm run typecheck` (vue-tsc — plain tsc output is meaningless in this repo).
- Commit per task; never `git add -A` — stage the task's files by explicit path.

---

### Task 1: Scheduling core in useSprechenArchive.ts

**Files:**
- Modify: `src/composables/useSprechenArchive.ts` (add scheduling section after `recordDrillResult`; REMOVE `drilledIds`; rewrite `openCorrections`)
- Test: `tests/composables/wiedervorlage.test.ts` (new)
- Modify: `tests/db/sprechenArchive.test.ts` (it imports `drilledIds` — migrate those assertions)

**Interfaces:**
- Consumes: existing `CorrectionEvent`, `ArchivedCorrection`, `listCorrections`, `recordDrillResult`.
- Produces (later tasks rely on these EXACT names/types):

```ts
export const WIEDERVORLAGE_INTERVALS_DAYS = [3, 10, 30] as const
export const WIEDERVORLAGE_RETIRE_STREAK = 4
export type CorrectionStatus = 'offen' | 'faellig' | 'nachgeuebt'
export interface CorrectionSchedule {
  status: CorrectionStatus
  streak: number               // trailing correct streak; 0 ⇒ offen
  lastCorrectAt: number | null // last correct event of the trailing streak; null when streak 0
  dueAt: number | null         // when the item becomes/became fällig; null when offen or retired
}
export interface QueuedCorrection extends ArchivedCorrection { schedule: CorrectionSchedule }
export function computeSchedule(events: CorrectionEvent[], now?: number): CorrectionSchedule
export async function scheduleByCorrection(now?: number): Promise<Map<string, CorrectionSchedule>>
export async function openCorrections(limit?: number, part?: 1 | 2, module?: 'sprechen' | 'schreiben'): Promise<ArchivedCorrection[]>  // signature unchanged; offen = streak 0
export async function dueCorrections(part?: 1 | 2, module?: 'sprechen' | 'schreiben', now?: number): Promise<QueuedCorrection[]>       // status faellig, dueAt ascending (most overdue first)
export async function drillQueue(limit?: number, part?: 1 | 2, module?: 'sprechen' | 'schreiben', now?: number): Promise<QueuedCorrection[]> // openCorrections (as QueuedCorrection) ++ dueCorrections, then slice(0, limit)
```

- [ ] **Step 1: Write the failing tests** — new file `tests/composables/wiedervorlage.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  appendCorrections, recordDrillResult, clearArchive,
  computeSchedule, scheduleByCorrection, openCorrections, dueCorrections, drillQueue,
  WIEDERVORLAGE_INTERVALS_DAYS, WIEDERVORLAGE_RETIRE_STREAK,
  type CorrectionEvent, type ArchivedCorrection
} from '../../src/composables/useSprechenArchive'

const DAY = 86_400_000
const ev = (correct: boolean, at: number): CorrectionEvent =>
  ({ id: `e-${at}`, correctionId: 'c-1', correct, at })

describe('computeSchedule (ADR-0025, pure)', () => {
  it('no events → offen, streak 0', () => {
    expect(computeSchedule([], 1000)).toEqual(
      { status: 'offen', streak: 0, lastCorrectAt: null, dueAt: null })
  })
  it('wrong-only events → offen', () => {
    expect(computeSchedule([ev(false, 10)], 1000).status).toBe('offen')
  })
  it('a wrong event resets an earlier success (demotion honesty)', () => {
    const s = computeSchedule([ev(true, 10), ev(false, 20)], 1000)
    expect(s).toEqual({ status: 'offen', streak: 0, lastCorrectAt: null, dueAt: null })
  })
  it('streak 1: rests until day 3, fällig from day 3', () => {
    const events = [ev(true, 0)]
    expect(computeSchedule(events, 3 * DAY - 1)).toEqual(
      { status: 'nachgeuebt', streak: 1, lastCorrectAt: 0, dueAt: 3 * DAY })
    expect(computeSchedule(events, 3 * DAY).status).toBe('faellig')
  })
  it('streak 2 waits 10 days, streak 3 waits 30 days, anchored on the LAST correct event', () => {
    const twoAt5 = [ev(true, 0), ev(true, 5 * DAY)]
    expect(computeSchedule(twoAt5, 5 * DAY + 10 * DAY - 1).status).toBe('nachgeuebt')
    expect(computeSchedule(twoAt5, 5 * DAY + 10 * DAY).status).toBe('faellig')
    const three = [ev(true, 0), ev(true, DAY), ev(true, 2 * DAY)]
    expect(computeSchedule(three, 2 * DAY + 30 * DAY - 1).status).toBe('nachgeuebt')
    expect(computeSchedule(three, 2 * DAY + 30 * DAY).status).toBe('faellig')
  })
  it('streak counts only the TRAILING run: wrong resets, later successes rebuild from 1', () => {
    const s = computeSchedule([ev(true, 0), ev(true, 1), ev(false, 2), ev(true, 3)], 4)
    expect(s.streak).toBe(1)
    expect(s.dueAt).toBe(3 + 3 * DAY)
  })
  it(`retires at streak ${WIEDERVORLAGE_RETIRE_STREAK}: nachgeuebt forever, dueAt null`, () => {
    const four = [ev(true, 0), ev(true, 1), ev(true, 2), ev(true, 3)]
    const s = computeSchedule(four, 400 * DAY)
    expect(s).toEqual({ status: 'nachgeuebt', streak: 4, lastCorrectAt: 3, dueAt: null })
  })
  it('unsorted event input is sorted by at before computing', () => {
    expect(computeSchedule([ev(false, 20), ev(true, 10)], 1000).status).toBe('offen')
    expect(computeSchedule([ev(true, 20), ev(false, 10)], 1000).streak).toBe(1)
  })
  it('interval ladder is exported as documented', () => {
    expect([...WIEDERVORLAGE_INTERVALS_DAYS]).toEqual([3, 10, 30])
  })
})

describe('archive scheduling reads (Dexie round-trip)', () => {
  beforeEach(async () => { await clearArchive() })

  const base: Omit<ArchivedCorrection, 'id' | 'createdAt'> = {
    discussionId: 'd-1', topicTitle: 'Ehrenamt', modality: 'typed',
    kind: 'grammar', quote: 'für die Wettkämpfe', suggested: 'zu den Wettkämpfen',
    reasonDe: 'Ziel: zu + Dativ.', reasonEn: 'Destination takes zu.', context: 'Ich bin für die Wettkämpfe gefahren.'
  }

  it('openCorrections REOPENS an item missed after an old success (the ADR-0025 redefinition)', async () => {
    const [row] = await appendCorrections([base])
    await recordDrillResult(row.id, true)
    await recordDrillResult(row.id, false)
    const open = await openCorrections()
    expect(open.map(c => c.id)).toEqual([row.id])
  })

  it('a freshly-drilled item is neither open nor due; it appears in scheduleByCorrection as nachgeuebt', async () => {
    const [row] = await appendCorrections([base])
    await recordDrillResult(row.id, true)
    expect(await openCorrections()).toHaveLength(0)
    expect(await dueCorrections()).toHaveLength(0)
    const s = (await scheduleByCorrection()).get(row.id)
    expect(s?.status).toBe('nachgeuebt')
    expect(s?.streak).toBe(1)
  })

  it('dueCorrections returns fällig items most-overdue first, with schedules attached', async () => {
    const [a, b] = await appendCorrections([{ ...base, quote: 'a' }, { ...base, quote: 'b' }])
    await recordDrillResult(a.id, true)
    await recordDrillResult(b.id, true)
    // both due when read 40 days in the future; a's event is older ⇒ more overdue…
    // events were written milliseconds apart, so force distinct dueAt via the now param only:
    const now = Date.now() + 40 * DAY
    const due = await dueCorrections(undefined, undefined, now)
    expect(due).toHaveLength(2)
    expect(due.every(q => q.schedule.status === 'faellig')).toBe(true)
    expect(due[0].schedule.dueAt! <= due[1].schedule.dueAt!).toBe(true)
  })

  it('drillQueue serves offen first (newest first), then fällig, and honors the cap', async () => {
    // Distinct createdAt per append — same-ms appends tie under the stable
    // newest-first sort (see tests/db/sprechenArchive.test.ts:50 for why
    // Date.now is spied rather than useFakeTimers).
    const nowSpy = vi.spyOn(Date, 'now')
    let oldOpen: ArchivedCorrection, drilled: ArchivedCorrection, newOpen: ArchivedCorrection
    try {
      nowSpy.mockReturnValue(1_000)
      ;[oldOpen] = await appendCorrections([{ ...base, quote: 'open-old' }])
      nowSpy.mockReturnValue(2_000)
      ;[drilled] = await appendCorrections([{ ...base, quote: 'drilled' }])
      await recordDrillResult(drilled.id, true)
      nowSpy.mockReturnValue(3_000)
      ;[newOpen] = await appendCorrections([{ ...base, quote: 'open-new' }])
    } finally {
      nowSpy.mockRestore()
    }
    const now = 2_000 + 4 * DAY   // 'drilled' is fällig (3-day interval elapsed)
    const q = await drillQueue(undefined, undefined, undefined, now)
    expect(q.map(c => c.id)).toEqual([newOpen.id, oldOpen.id, drilled.id])
    expect(q[2].schedule.status).toBe('faellig')
    expect(await drillQueue(2, undefined, undefined, now)).toHaveLength(2)
  })

  it('module filter flows through drillQueue', async () => {
    await appendCorrections([{ ...base, module: 'sprechen', quote: 's' }, { ...base, module: 'schreiben', quote: 'w' }])
    expect(await drillQueue(undefined, undefined, 'schreiben')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/composables/wiedervorlage.test.ts` → FAIL: `computeSchedule` is not exported.

- [ ] **Step 3: Implement in `src/composables/useSprechenArchive.ts`.** Delete `drilledIds` (lines 130–145) and the old `openCorrections` body; add after `recordDrillResult`:

```ts
// ─── Wiedervorlage (ADR-0025) ────────────────────────────────────────────
// Everything below is DERIVED at read time from sprechenCorrectionEvents.
// The only state is the trailing correct streak; a wrong event resets it and
// the correction is offen again (the wackelig demotion honesty, ADR-0017).

export const WIEDERVORLAGE_INTERVALS_DAYS = [3, 10, 30] as const
export const WIEDERVORLAGE_RETIRE_STREAK = 4
const DAY_MS = 86_400_000

export type CorrectionStatus = 'offen' | 'faellig' | 'nachgeuebt'

export interface CorrectionSchedule {
  status: CorrectionStatus
  streak: number
  lastCorrectAt: number | null
  dueAt: number | null
}

export interface QueuedCorrection extends ArchivedCorrection {
  schedule: CorrectionSchedule
}

const OFFEN: CorrectionSchedule = Object.freeze(
  { status: 'offen', streak: 0, lastCorrectAt: null, dueAt: null })

/**
 * Pure ADR-0025 rule for ONE correction's events. `now` is a parameter so
 * tests hit exact interval boundaries without mocking the clock. Events may
 * arrive unsorted (Dexie returns primary-key order); ties on `at` keep array
 * order — a same-millisecond wrong/right pair is vanishingly rare and
 * self-corrects on the next drill.
 */
export function computeSchedule(events: CorrectionEvent[], now: number = Date.now()): CorrectionSchedule {
  const sorted = [...events].sort((a, b) => a.at - b.at)
  let streak = 0
  let lastCorrectAt: number | null = null
  for (const e of sorted) {
    if (e.correct) { streak += 1; lastCorrectAt = e.at }
    else { streak = 0; lastCorrectAt = null }
  }
  if (streak === 0) return OFFEN
  if (streak >= WIEDERVORLAGE_RETIRE_STREAK) {
    return { status: 'nachgeuebt', streak, lastCorrectAt, dueAt: null }
  }
  const dueAt = (lastCorrectAt as number) + WIEDERVORLAGE_INTERVALS_DAYS[streak - 1] * DAY_MS
  return { status: now >= dueAt ? 'faellig' : 'nachgeuebt', streak, lastCorrectAt, dueAt }
}

/**
 * One events-table scan → per-correction schedule. Corrections with no
 * events are absent from the map; readers treat a missing id as offen.
 * Same full-table-scan posture drilledIds() had (small, cold-storage table).
 */
export async function scheduleByCorrection(now: number = Date.now()): Promise<Map<string, CorrectionSchedule>> {
  const events = await db.sprechenCorrectionEvents.toArray()
  const byCorrection = new Map<string, CorrectionEvent[]>()
  for (const e of events) {
    const list = byCorrection.get(e.correctionId)
    if (list) list.push(e)
    else byCorrection.set(e.correctionId, [e])
  }
  const out = new Map<string, CorrectionSchedule>()
  for (const [id, list] of byCorrection) out.set(id, computeSchedule(list, now))
  return out
}

/** Offene corrections (trailing streak 0 — ADR-0025's redefinition), newest first. */
export async function openCorrections(
  limit?: number, part?: 1 | 2, module?: 'sprechen' | 'schreiben'
): Promise<ArchivedCorrection[]> {
  const schedules = await scheduleByCorrection()
  const filter: { part?: 1 | 2; module?: 'sprechen' | 'schreiben' } = {}
  if (part != null) filter.part = part
  if (module != null) filter.module = module
  const all = await listCorrections(filter)
  const open = all.filter(c => (schedules.get(c.id) ?? OFFEN).status === 'offen')
  return limit != null ? open.slice(0, limit) : open
}

/** Fällige corrections, most overdue first (dueAt ascending). */
export async function dueCorrections(
  part?: 1 | 2, module?: 'sprechen' | 'schreiben', now: number = Date.now()
): Promise<QueuedCorrection[]> {
  const schedules = await scheduleByCorrection(now)
  const filter: { part?: 1 | 2; module?: 'sprechen' | 'schreiben' } = {}
  if (part != null) filter.part = part
  if (module != null) filter.module = module
  const all = await listCorrections(filter)
  return all
    .map(c => ({ ...c, schedule: schedules.get(c.id) ?? OFFEN }))
    .filter(q => q.schedule.status === 'faellig')
    .sort((a, b) => (a.schedule.dueAt ?? 0) - (b.schedule.dueAt ?? 0))
}

/**
 * The Korrekturdrill's queue (ADR-0025): offene first — newest first, the
 * pre-Wiedervorlage order, so new mistakes are never crowded out — then
 * fällige, most overdue first. `limit` caps the combined list.
 */
export async function drillQueue(
  limit?: number, part?: 1 | 2, module?: 'sprechen' | 'schreiben', now: number = Date.now()
): Promise<QueuedCorrection[]> {
  const open = await openCorrections(undefined, part, module)
  const due = await dueCorrections(part, module, now)
  const queue: QueuedCorrection[] = [
    ...open.map(c => ({ ...c, schedule: OFFEN })),
    ...due
  ]
  return limit != null ? queue.slice(0, limit) : queue
}
```

  Note: `openCorrections`' JSDoc replaces the old "no successful drill event yet" line. Do NOT touch `recordDrillResult`, `appendCorrections`, `listCorrections`, `normalizeCorrection`, `countsByKind`, `clearArchive`.

- [ ] **Step 4: Migrate `tests/db/sprechenArchive.test.ts`** — it imports `drilledIds`. Replace every `drilledIds()` assertion with the equivalent over `scheduleByCorrection()` (an id is "drilled" ⇔ map entry exists with `streak >= 1`); where the old test asserted "wrong then right still counts as drilled", keep it (trailing streak 1); where it asserted "right then wrong stays drilled", INVERT it — under ADR-0025 that item is offen — and cite ADR-0025 in a comment. Do not delete unrelated blocks.

- [ ] **Step 5: Run both test files** — `npx vitest run tests/composables/wiedervorlage.test.ts tests/db/sprechenArchive.test.ts tests/composables/useSprechenArchive.module.test.ts` → PASS.

- [ ] **Step 6: Typecheck** — `npm run typecheck`. Expect errors ONLY in the four .vue consumers still calling removed/changed APIs (`SprechenArchive.vue` uses `drilledIds`); those are Tasks 2–4's job — if the errors are exactly there, proceed.

- [ ] **Step 7: Commit** — `git add src/composables/useSprechenArchive.ts tests/composables/wiedervorlage.test.ts tests/db/sprechenArchive.test.ts` then `git commit -m "feat(archive): Wiedervorlage scheduling core — read-side expanding intervals (ADR-0025)"`.

---

### Task 2: SprechenDrill queue + fällig badge

**Files:**
- Modify: `src/modules/sprechen/SprechenDrill.vue`
- Test: `tests/modules/SprechenDrill.test.ts` (exists — extend)

**Interfaces:**
- Consumes from Task 1: `drillQueue(limit?) → Promise<QueuedCorrection[]>`, `QueuedCorrection` (= `ArchivedCorrection & { schedule: CorrectionSchedule }`), `schedule.status: 'offen' | 'faellig' | 'nachgeuebt'`, `schedule.streak: number`.
- Produces: nothing consumed later.

- [ ] **Step 1: Read `tests/modules/SprechenDrill.test.ts`** to see how it currently mocks `openCorrections`, then write the failing test additions: (a) the component calls `drillQueue(20)`; (b) a queued item whose `schedule.status === 'faellig'` renders a badge containing `fällig · 2. Wiederholung` (for `streak: 1`) inside the `.micro-mark` line; (c) an offen item renders no `fällig` text. Mock shape:

```ts
vi.mock('../../src/composables/useSprechenArchive', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  drillQueue: vi.fn(async () => [/* QueuedCorrection fixtures */]),
  recordDrillResult: vi.fn(async () => {})
}))
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/modules/SprechenDrill.test.ts` → new cases FAIL (component still imports `openCorrections`).

- [ ] **Step 3: Implement in `SprechenDrill.vue`:**
  - Import change: `import { drillQueue, recordDrillResult } from '../../composables/useSprechenArchive'` and `import type { QueuedCorrection } from '../../composables/useSprechenArchive'`; `items = ref<QueuedCorrection[]>([])`; `onMounted`: `items.value = await drillQueue(20)`.
  - In the `.micro-mark` line, after `{{ current.topicTitle }}`, append:

```html
        <template v-if="current.schedule.status === 'faellig'">
          · <span class="wv-badge">fällig · {{ current.schedule.streak + 1 }}. Wiederholung</span>
        </template>
```

  - Add scoped style: `.wv-badge { color: var(--accent); }` (scoped block doesn't exist yet — add `<style scoped>`).
  - Empty-state copy (`v-else-if="items.length === 0"`): change body text to `Es gibt gerade keine offenen oder fälligen Korrekturen. Führe eine Diskussion — markierte Fehler landen automatisch hier, und Nachgeübtes kommt nach 3, 10 und 30 Tagen wieder.` and the alert label from `Nichts offen` to `Nichts offen oder fällig`.
  - Finished-state line `Was du verfehlt hast, bleibt offen und kommt wieder.` → `Was du verfehlt hast, ist wieder offen; was du geschafft hast, kommt zur Wiedervorlage zurück.`
  - Header subtitle and grading logic unchanged. The file-header comment's line "the item stays open and returns in a later session" still holds — extend it with one line: `Wiedervorlage (ADR-0025): a solved item returns after 3/10/30 days until it survives four spaced retrievals.`

- [ ] **Step 4: Run tests** — `npx vitest run tests/modules/SprechenDrill.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git add src/modules/sprechen/SprechenDrill.vue tests/modules/SprechenDrill.test.ts` then `git commit -m "feat(sprechen): Korrekturdrill serves the Wiedervorlage queue with fällig badges"`.

---

### Task 3: SprechenArchive three-state view

**Files:**
- Modify: `src/modules/sprechen/SprechenArchive.vue`
- Test: `tests/modules/SprechenArchive.test.ts` (exists — extend/adjust)

**Interfaces:**
- Consumes from Task 1: `scheduleByCorrection() → Promise<Map<string, CorrectionSchedule>>`, `CorrectionStatus`. (`drilledIds` no longer exists.)
- Produces: nothing consumed later.

- [ ] **Step 1: Read `tests/modules/SprechenArchive.test.ts`** (it asserts tag text and `.spr-kind` counts — keep its 5-element `.spr-kind` assumption intact), then write failing test additions: (a) a row whose schedule is faellig shows tag text `fällig`; (b) a row with no schedule entry shows `offen`; (c) a row with status nachgeuebt shows `nachgeübt`; (d) the drill-button row shows `Offen 1 · Fällig 1` for one offen + one fällig fixture; (e) the drill button is enabled when offen=0 but fällig>0. Mock `scheduleByCorrection` (not `drilledIds`).

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/modules/SprechenArchive.test.ts`.

- [ ] **Step 3: Implement in `SprechenArchive.vue`:**
  - Import `scheduleByCorrection, type CorrectionSchedule` instead of `drilledIds`; state `const schedules = ref<Map<string, CorrectionSchedule>>(new Map())`; in `loadAll()`'s `Promise.all`, replace `drilledIds()` with `scheduleByCorrection()` into `schedules.value`.
  - Helper: `function statusOf(id: string): 'offen' | 'faellig' | 'nachgeuebt' { return schedules.value.get(id)?.status ?? 'offen' }`
  - Replace `openByKind` with `statusByKind` (counts per kind per status) keeping a derived `openByKind`-equivalent for the strip:

```ts
const statusByKind = computed(() => {
  const zero = () => ({ offen: 0, faellig: 0, nachgeuebt: 0 })
  const out: Record<SprechenErrorTag, { offen: number; faellig: number; nachgeuebt: number }> = {
    grammar: zero(), 'word-order': zero(), vocabulary: zero(), spelling: zero(), register: zero()
  }
  for (const c of allCorrections.value) out[c.kind][statusOf(c.id)] += 1
  return out
})
const openTotal = computed(() => KIND_ORDER.reduce((a, k) => a + statusByKind.value[k].offen, 0))
const faelligTotal = computed(() => KIND_ORDER.reduce((a, k) => a + statusByKind.value[k].faellig, 0))
```

  - `drilledSegments(kind)`: `done` becomes `statusByKind.value[kind].nachgeuebt` (fällig counts as work asking to be done, not done).
  - Row model: replace `isDrilled: boolean` with `status: 'offen' | 'faellig' | 'nachgeuebt'` (`status: statusOf(c.id)`), and the row tag becomes:

```html
                <span class="tag" :class="{
                  'tag-success': r.status === 'nachgeuebt',
                  'tag-ochre': r.status === 'offen',
                  'tag-accent': r.status === 'faellig'
                }">
                  {{ r.status === 'nachgeuebt' ? 'nachgeübt' : r.status === 'faellig' ? 'fällig' : 'offen' }}
                </span>
```

  - Drill button block: disabled becomes `:disabled="openTotal + faelligTotal === 0"`, and directly above the button add `<p class="micro-mark">Offen {{ openTotal }} · Fällig {{ faelligTotal }}</p>`.

- [ ] **Step 4: Run tests** — `npx vitest run tests/modules/SprechenArchive.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git add src/modules/sprechen/SprechenArchive.vue tests/modules/SprechenArchive.test.ts` then `git commit -m "feat(sprechen): Fehlerarchiv shows offen/fällig/nachgeübt per correction"`.

---

### Task 4: Hub counts (SprechenHome + SchreibenHome)

**Files:**
- Modify: `src/modules/sprechen/SprechenHome.vue:99-182` (archive ref + metaFor)
- Modify: `src/modules/schreiben/SchreibenHome.vue:70-160` (archive ref + metaFor)
- Test: `tests/modules/SprechenHome.test.ts` (exists — extend); SchreibenHome has no mount test today — do NOT create one in this task (out of scope).

**Interfaces:**
- Consumes from Task 1: `dueCorrections(part?, module?) → Promise<QueuedCorrection[]>` (plus existing `openCorrections`, `countsByKind`).
- Produces: nothing consumed later.

- [ ] **Step 1: Read `tests/modules/SprechenHome.test.ts`**; if it asserts the drill row's meta strings (`… offen`, `… nachgeübt`), update those and add: with 2 open, 1 due, 5 total mocked, the drill row shows `2 offen`, `1 fällig`, `2 nachgeübt`. Mock `dueCorrections` alongside the existing archive mocks.

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/modules/SprechenHome.test.ts`.

- [ ] **Step 3: Implement — same edit in BOTH hubs:**
  - Import `dueCorrections` next to `openCorrections`.
  - `archive` ref type: `ref<{ total: number; open: number; due: number } | null>(null)`.
  - SprechenHome fetch: `const [counts, open, due] = await Promise.all([countsByKind(), openCorrections(), dueCorrections()])`; SchreibenHome fetch: `const [counts, open, due] = await Promise.all([countsByKind(undefined, 'schreiben'), openCorrections(undefined, undefined, 'schreiben'), dueCorrections(undefined, 'schreiben')])`. Store `due: due.length`.
  - `metaFor`, drill row (both files): `return [\`${archive.value.open} offen\`, \`${archive.value.due} fällig\`, \`${archive.value.total - archive.value.open - archive.value.due} nachgeübt\`]`.
  - Archive tile row stays `[N Korrekturen, M offen]` in both files.

- [ ] **Step 4: Run tests** — `npx vitest run tests/modules/SprechenHome.test.ts` → PASS. Also `npx vitest run tests/modules` to catch collateral.

- [ ] **Step 5: Commit** — `git add src/modules/sprechen/SprechenHome.vue src/modules/schreiben/SchreibenHome.vue tests/modules/SprechenHome.test.ts` then `git commit -m "feat(hubs): Korrekturdrill rows count offen · fällig · nachgeübt"`.

---

### Task 5 (controller): Glossary, changelog, release

Done by the controller after Tasks 1–4 merge-ready: CONTEXT.md entries (**Wiedervorlage**, **Fällig**, amend **Correction drill**), changelog 1.21.04 entry + APP_VERSION, package.json bump, full `npx vitest run` + `npm run typecheck`, merge `feat/wiedervorlage` → main, push, `npm run deploy`. (Not a subagent task; listed for completeness.)
