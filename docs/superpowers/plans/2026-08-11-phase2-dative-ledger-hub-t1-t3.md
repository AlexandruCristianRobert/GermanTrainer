# Phase 2 — Dativ Ledger, Hub, and Drills T1–T3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Dativ module becomes visible and usable: the item ledger (`gt:dativeLedger`, ADR-0017), the full drill catalogue (`DAT_FAMILIES`, all 10 families + cheatsheet card, unshipped drills rendered "Bald"), the hub (`DativeHome.vue` with the `31 / 60 gesichert` meter), and the first three drills — T1 Dativ oder Akkusativ?, T2 Verb → Dativobjekt, T3 Fallen-Karten — offline, deterministic, recording Runs and bumping the ledger.

**Architecture:** One new store (`useDativeLedger.ts`) is the phase's only new persistence — lifetime, **item-keyed** where ADR-0011's `gt:drillTotals` is drill-keyed, hence ADR-0017. Everything else is additive registration: 13 `QuizHistoryType`s ripple through five exhaustive registries plus `DAT_TYPE_TO_CODE` in `useDrillMastery.ts` (bands then come for free); `DAT_FAMILIES` joins `drillCatalogue.ts` and the hub renders from it; item banks live in `dativeItems.ts` guarded by gate tests; `useDativeDrill.ts` is the shared deterministic sampling/grading layer. The three Setup/Runner pairs copy the Direction Words house skeleton (chips → runner → ✓/✗ reveal with [Core-idea explanation] on a miss → retry round; main round records once, retries never).

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Vitest + jsdom (`npx vitest run <path>`), vue-tsc (`npm run typecheck`), `shuffle` (src/data/pool.ts), `checkText` (src/composables/drillGrading.ts), localStorage history (`saveQuizRun`), phase 1's `dativeVerbs.ts` / `dativeAdjectives.ts`.

## Global Constraints

- **Prerequisite:** the phase 1 plan (`2026-08-11-phase1-dative-data-foundation.md`) is merged — `DATIVE_VERBS` (44 entries), `DATIVE_ADJECTIVES` (16 entries) exist and their gates are green.
- Branch `feat/phase2-dative-ledger-hub` off `main`. No pushes; the controller merges.
- Route names hyphen-free under the `dative` head (NavShell derives the active tab via `name.split('-')[0]`): `dative`, `dative-case`, `dative-case-run`, `dative-form`, `dative-form-run`, `dative-trap`, `dative-trap-run`. Paths under `/dative/…`.
- New `QuizHistoryType` ids exactly, in this order: `'dat-case'`, `'dat-form'`, `'dat-trap'`, `'dat-subject'`, `'dat-experiencer'`, `'dat-twin'`, `'dat-ditrans'`, `'dat-object-order'`, `'dat-adjective'`, `'dat-free'`, `'dat-sentence'`, `'dat-passive'`, `'dat-reflexive'` — mapping to T1..T13. All 13 register now (phases 3–4 only add runners), in **every** registry: the union, both label maps + `QUIZ_TYPES_ORDER` (quiz-type-labels.ts — its test enforces completeness), HistoryPage `QUIZ_TYPES` + `typeOrder`, both `useQuizStats` zero-maps, `useLevelAssessment` `TYPE_LABEL`.
- The meter's denominator is **derived, never hard-coded**: `DATIVE_VERB_KEYS.length + DATIVE_ADJECTIVE_KEYS.length` (= 60 today; the spec's "57" was an estimate). No literal 57 or 60 anywhere in source.
- Recording: main round records once (`startedAtMs` + `historySaved` + `watch(finished)`); retry rounds and empty rounds never record and never bump the ledger. Ledger bumps happen exactly once per run, at record time, one bump per card (ADR-0007/0010 + spec §Data flow).
- Pinned interfaces (shared with phases 3–4, names verbatim): `DativeVerbEntry`/`DATIVE_VERBS`/`DATIVE_VERB_KEYS`/`dativeVerbsBy` (phase 1); `LedgerState`, `LedgerEntry`, `DativeLedger`, `ledgerState`, `bumpDativeLedger(item, correct, at)`, `readDativeLedger`, `ledgerSummary`, `LEDGER_KEY = 'gt:dativeLedger'`; `DativeCard`, `sampleDativeCards`, `gradeDativeAnswer`; `DAT_TYPE_TO_CODE`.
- German content correctness is a shipping gate. Use the item sentences exactly as printed here.
- Gates per task: named vitest run + `npm run typecheck` (vue-tsc — never plain tsc). Final task: `npx vitest run --testTimeout=30000` (known ThemeToggle order-dependent flake: if sole failure, rerun to confirm and proceed).
- Do not touch `dist/` or `GermanVerbTester/`.
- Commits end with: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

### Task 1: `useDativeLedger.ts` + ADR-0017 + backup key

**Files:**
- Create: `src/composables/useDativeLedger.ts`
- Create: `docs/adr/0017-dative-item-ledger-keyed-by-item.md`
- Modify: `src/composables/useUserData.ts` (USER_DATA_KEYS + KEY_LABELS)
- Test: `tests/composables/useDativeLedger.test.ts`

**Interfaces:**
- Consumes: `DATIVE_VERBS`, `DATIVE_VERB_KEYS` from `src/data/dativeVerbs.ts`; `DATIVE_ADJECTIVES`, `DATIVE_ADJECTIVE_KEYS` from `src/data/dativeAdjectives.ts`.
- Produces (pinned): `LedgerState`, `LedgerEntry { recent: boolean[]; encounters: number; lastAt: number }`, `DativeLedger`, `ledgerState(entry)`, `bumpDativeLedger(item, correct, at)`, `readDativeLedger()`, `ledgerSummary(): { secured; shaky; fresh; total }`, `LEDGER_KEY = 'gt:dativeLedger'`. Tasks 6–9 call `ledgerSummary`/`readDativeLedger`/`bumpDativeLedger`.

- [ ] **Step 1: Write the failing unit tests (spec gate 10).** Create `tests/composables/useDativeLedger.test.ts`:

```ts
import { describe, test, expect, beforeEach } from 'vitest'
import {
  LEDGER_KEY, ledgerState, bumpDativeLedger, readDativeLedger, ledgerSummary,
} from '../../src/composables/useDativeLedger'
import { DATIVE_VERB_KEYS } from '../../src/data/dativeVerbs'
import { DATIVE_ADJECTIVE_KEYS } from '../../src/data/dativeAdjectives'

const ITEM = 'helfen'          // a real verb item
const ADJ = 'wichtig'          // a real adjective item

beforeEach(() => localStorage.clear())

describe('ledgerState rule', () => {
  test('an unknown key reads new', () => {
    expect(ledgerState(undefined)).toBe('new')
    expect(readDativeLedger()[ITEM]).toBeUndefined()
  })

  test('three correct encounters make an item gesichert', () => {
    bumpDativeLedger(ITEM, true, 1)
    bumpDativeLedger(ITEM, true, 2)
    expect(ledgerState(readDativeLedger()[ITEM])).toBe('wackelig')
    bumpDativeLedger(ITEM, true, 3)
    expect(ledgerState(readDativeLedger()[ITEM])).toBe('gesichert')
  })

  test('a single miss demotes a secured item', () => {
    for (const at of [1, 2, 3]) bumpDativeLedger(ITEM, true, at)
    bumpDativeLedger(ITEM, false, 4)
    expect(ledgerState(readDativeLedger()[ITEM])).toBe('wackelig')
  })

  test('a fourth encounter evicts the oldest: miss then three corrects re-secures', () => {
    bumpDativeLedger(ITEM, false, 1)
    bumpDativeLedger(ITEM, true, 2)
    bumpDativeLedger(ITEM, true, 3)
    bumpDativeLedger(ITEM, true, 4)
    const entry = readDativeLedger()[ITEM]
    expect(entry.recent).toEqual([true, true, true])
    expect(entry.encounters).toBe(4)
    expect(entry.lastAt).toBe(4)
    expect(ledgerState(entry)).toBe('gesichert')
  })

  test('adjective keys are ledger items too', () => {
    for (const at of [1, 2, 3]) bumpDativeLedger(ADJ, true, at)
    expect(ledgerState(readDativeLedger()[ADJ])).toBe('gesichert')
  })
})

describe('unknown keys and the denominator', () => {
  test('a bump for a key with no matching item writes nothing', () => {
    bumpDativeLedger('kein-item', true, 1)
    expect(localStorage.getItem(LEDGER_KEY)).toBeNull()
  })

  test('a stored key with no matching item is excluded on read and from the summary', () => {
    localStorage.setItem(LEDGER_KEY, JSON.stringify({
      'kein-item': { recent: [true, true, true], encounters: 3, lastAt: 9 },
    }))
    expect(Object.keys(readDativeLedger())).toEqual([])
    const s = ledgerSummary()
    expect(s.secured).toBe(0)
    expect(s.total).toBe(DATIVE_VERB_KEYS.length + DATIVE_ADJECTIVE_KEYS.length)
  })

  test('the denominator is derived from the two side-tables, never hard-coded', () => {
    const s = ledgerSummary()
    expect(s.total).toBe(DATIVE_VERB_KEYS.length + DATIVE_ADJECTIVE_KEYS.length)
    expect(s.fresh).toBe(s.total)
    bumpDativeLedger(ITEM, true, 1)
    const s2 = ledgerSummary()
    expect(s2.shaky).toBe(1)
    expect(s2.fresh).toBe(s2.total - 1)
  })

  test('a corrupt store reads as empty (absent-store = valid empty state)', () => {
    localStorage.setItem(LEDGER_KEY, '{not json')
    expect(readDativeLedger()).toEqual({})
    expect(ledgerSummary().secured).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify failure.**

Run: `npx vitest run tests/composables/useDativeLedger.test.ts`
Expected: FAIL — cannot resolve `../../src/composables/useDativeLedger`.

- [ ] **Step 3: Create `src/composables/useDativeLedger.ts`:**

```ts
// The Dativ module's item ledger — lifetime, per-ITEM progress (ADR-0017),
// where gt:drillTotals (ADR-0011) is lifetime per-DRILL. One entry per
// memorization item: the DATIVE_VERBS keys plus the DATIVE_ADJECTIVES keys.
// Storing only the last three booleans keeps the entry small and makes the
// gesichert rule auditable; a missing key reads as 'new', so an absent store
// is a valid empty state with no migration. No Vue/DOM.
//
// Write-side guard AND read-side exclusion: a key with no matching item (a
// verb later renamed in verbs.ts) is never written, ignored on read, and
// excluded from the denominator — the meter cannot exceed 100%.

import { DATIVE_VERBS } from '../data/dativeVerbs'
import { DATIVE_ADJECTIVES } from '../data/dativeAdjectives'

export const LEDGER_KEY = 'gt:dativeLedger'

export type LedgerState = 'new' | 'wackelig' | 'gesichert'

export interface LedgerEntry {
  /** Most recent first, capped at 3 — all the streak rule needs. */
  recent: boolean[]
  encounters: number
  lastAt: number
}

export type DativeLedger = Record<string, LedgerEntry>   // key: VERBS.german | adjective lemma

function isKnownItem(key: string): boolean {
  return key in DATIVE_VERBS || key in DATIVE_ADJECTIVES
}

export function ledgerState(entry: LedgerEntry | undefined): LedgerState {
  if (!entry || entry.encounters === 0) return 'new'
  if (entry.recent.length === 3 && entry.recent.every(Boolean)) return 'gesichert'
  return 'wackelig'
}

function safeGet(key: string): string | null {
  if (typeof localStorage === 'undefined') return null
  try { return localStorage.getItem(key) } catch { return null }
}

function safeSet(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(key, value) } catch { /* ignore quota / disabled */ }
}

function rawRead(): DativeLedger {
  const raw = safeGet(LEDGER_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function validEntry(e: unknown): e is LedgerEntry {
  if (!e || typeof e !== 'object') return false
  const c = e as LedgerEntry
  return Array.isArray(c.recent) && c.recent.every(b => typeof b === 'boolean')
    && typeof c.encounters === 'number' && typeof c.lastAt === 'number'
}

/** The ledger with unknown/malformed keys excluded (read-side guard). */
export function readDativeLedger(): DativeLedger {
  const out: DativeLedger = {}
  for (const [key, entry] of Object.entries(rawRead())) {
    if (isKnownItem(key) && validEntry(entry)) out[key] = entry
  }
  return out
}

/** Records one encounter. Unknown item keys are silently ignored. */
export function bumpDativeLedger(item: string, correct: boolean, at: number): void {
  if (!isKnownItem(item)) return
  const all = rawRead()
  const prev = validEntry(all[item]) ? all[item] : { recent: [], encounters: 0, lastAt: 0 }
  all[item] = {
    recent: [correct, ...prev.recent].slice(0, 3),
    encounters: prev.encounters + 1,
    lastAt: at,
  }
  safeSet(LEDGER_KEY, JSON.stringify(all))
}

/** Hub meter numbers. total is DERIVED — never hard-code the item count. */
export function ledgerSummary(): { secured: number; shaky: number; fresh: number; total: number } {
  const ledger = readDativeLedger()
  const total = Object.keys(DATIVE_VERBS).length + Object.keys(DATIVE_ADJECTIVES).length
  let secured = 0
  let shaky = 0
  for (const entry of Object.values(ledger)) {
    const s = ledgerState(entry)
    if (s === 'gesichert') secured++
    else if (s === 'wackelig') shaky++
  }
  return { secured, shaky, fresh: total - secured - shaky, total }
}
```

- [ ] **Step 4: Run to verify pass.**

Run: `npx vitest run tests/composables/useDativeLedger.test.ts`
Expected: PASS — all 9 tests.

- [ ] **Step 5: Register in backup/restore.** In `src/composables/useUserData.ts`:

In `USER_DATA_KEYS`, after the line `  'gt:sprechenRedemittel'`, add a comma and:

```ts
  // Dativ item ledger (ADR-0017)
  'gt:dativeLedger'
```

In `KEY_LABELS`, after the `'gt:sprechenRedemittel'` line, add:

```ts
  'gt:dativeLedger': { label: 'Dativ item ledger', group: 'History' }
```

(Mind the commas on the preceding lines in both edits.)

- [ ] **Step 6: Write ADR-0017.** Create `docs/adr/0017-dative-item-ledger-keyed-by-item.md`:

```markdown
# Dative item ledger is keyed by item, not by drill

[ADR-0011](0011-drill-mastery-lifetime-rollup.md) gave drills a lifetime rollup —
`gt:drillTotals: Record<drillKey, {…}>` — because a progress meter must not decay when the
learner studies something else for a week. The Dativ module needs the same lifetime property
one level further down: its hub meter reads "31 / 60 gesichert", where the unit is a
**memorization item** — one of the ~44 [Dative verb](../../CONTEXT.md)s or ~16
dative-governing adjectives — not a drill. A drill-keyed rollup cannot answer "which verbs
are secured"; per-item evidence in run `meta` ([ADR-0002](0002-per-item-tracking-prep-sentence.md))
cannot either, because it is trimmed by `gt:quizHistory`'s 100-run FIFO and the module's
deterministic drills record no per-item arrays at all.

So the module gets its own small store, `gt:dativeLedger: Record<item, LedgerEntry>`, with
`LedgerEntry = { recent: boolean[]; encounters: number; lastAt: number }`. `recent` holds
the last **three** encounter results, most recent first — exactly what the
[Secured item](../../CONTEXT.md) rule needs: `gesichert` iff all three are correct,
`wackelig` otherwise, `new` when the key is absent. A single miss demotes; three clean
encounters re-secure. Every drill that shows an item bumps it once per recorded run
(retry rounds are practice and never bump, matching
[ADR-0010](0010-record-runs-when-online-for-all-drills.md)'s recording rule).

The meter's denominator is **derived** — `DATIVE_VERB_KEYS.length +
DATIVE_ADJECTIVE_KEYS.length` — so adding a verb moves the denominator instead of silently
capping the meter. A ledger key with no matching item (a verb later renamed in `verbs.ts`)
is never written, ignored on read, and excluded from the denominator.

## Considered options

- **Item-keyed lifetime store, `gt:dativeLedger`** (chosen) — a second small localStorage
  key beside `gt:drillTotals`, same safe-read/safe-write discipline, no migration: an
  absent key reads as all-`new`. Storing only the last three booleans keeps entries tiny
  and the rule auditable.
- **Derive from `gt:quizHistory` per ADR-0002** — rejected: the 100-run FIFO makes
  "gesichert" decay when the learner drills other modules, which is exactly the bug
  ADR-0011 fixed for bands; and the deterministic Dativ drills would need new per-item
  meta arrays on every run just to feed it.
- **Widen `gt:drillTotals` with a per-item map** — rejected: different key space, different
  rule (streak, not accuracy), different consumers. Overloading ADR-0011's store muddles
  its contract for no shared machinery.
- **An SRS scheduler with due dates** — rejected per the module spec: the ledger answers
  "what is shaky" without answering "what is due today"; a scheduler can be layered on
  later if the ledger proves it earns one.

## Consequences

- `gt:dativeLedger` joins `USER_DATA_KEYS` so it ships in backup/restore.
- The streak rule means the meter reads *current command*, not accumulated volume — a
  learner returning after months sees their secured count honestly shrink only when
  re-encounters actually go wrong, never from mere absence.
- Rule-driven families (ditransitives, free datives, the passive consequence) are
  deliberately **not** ledger items — there is no list to secure; they stay band-tracked
  only via ADR-0011.
- Readers must not conflate the two lifetime stores: `gt:drillTotals` answers "how far am
  I with drill X", `gt:dativeLedger` answers "which words do I own".
```

- [ ] **Step 7: Verify green.**

Run: `npx vitest run tests/composables/useDativeLedger.test.ts tests/composables/useUserData.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/composables/useDativeLedger.ts tests/composables/useDativeLedger.test.ts src/composables/useUserData.ts docs/adr/0017-dative-item-ledger-keyed-by-item.md
git commit -m "feat(dative): item ledger gt:dativeLedger with last-3 streak rule; ADR-0017

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 13 QuizHistoryTypes across every registry + `DAT_TYPE_TO_CODE`

**Files:**
- Modify: `src/composables/useQuizHistory.ts` (union + one meta field)
- Modify: `src/composables/useDrillMastery.ts` (`DAT_TYPE_TO_CODE` + `drillKey`)
- Modify: `src/components/charts/quiz-type-labels.ts` (3 registries)
- Modify: `src/modules/history/HistoryPage.vue` (`QUIZ_TYPES` + `typeOrder`)
- Modify: `src/composables/useQuizStats.ts` (2 zero-maps)
- Modify: `src/composables/useLevelAssessment.ts` (`TYPE_LABEL`)
- Test: `tests/composables/useDrillMastery.test.ts` (additive describe block)

**Interfaces:**
- Consumes: `QuizHistoryType` union, `drillKey(entry)` convention (`dw-T1`-style keys).
- Produces: the 13 `dat-*` history types; `export const DAT_TYPE_TO_CODE: Partial<Record<QuizHistoryType, string>>`; `drillKey` returning `dat-T1` … `dat-T13`; `QuizHistoryMeta.families?: string[]`. Tasks 6–9 save runs with these types; `DativeHome` reads masteryMap keys `dat-<code>`.

- [ ] **Step 1: Union.** In `src/composables/useQuizHistory.ts`, after the line `  | 'sentence-packed'`, add:

```ts
  | 'dat-case'
  | 'dat-form'
  | 'dat-trap'
  | 'dat-subject'
  | 'dat-experiencer'
  | 'dat-twin'
  | 'dat-ditrans'
  | 'dat-object-order'
  | 'dat-adjective'
  | 'dat-free'
  | 'dat-sentence'
  | 'dat-passive'
  | 'dat-reflexive'
```

- [ ] **Step 2: Meta field.** In the same file, inside `QuizHistoryMeta`, directly under the line `  pairs?: string[]   // Direction Words compound drill: adverb-pair element filter`, add:

```ts
  families?: string[] // Dativ drills: semantic-family filter (recipient/experiencer/co-agent)
```

- [ ] **Step 3: Mastery map.** In `src/composables/useDrillMastery.ts`, after the `DAC_TYPE_TO_CODE` const, add (exported — the catalogue test and phases 3–4 read it):

```ts
// Dativ: thirteen distinct run types, one card each (T1–T13). All thirteen
// register in phase 2 even though only T1–T3 have runners yet — a type that
// never occurs simply never produces a key.
export const DAT_TYPE_TO_CODE: Partial<Record<QuizHistoryType, string>> = {
  'dat-case': 'T1',
  'dat-form': 'T2',
  'dat-trap': 'T3',
  'dat-subject': 'T4',
  'dat-experiencer': 'T5',
  'dat-twin': 'T6',
  'dat-ditrans': 'T7',
  'dat-object-order': 'T8',
  'dat-adjective': 'T9',
  'dat-free': 'T10',
  'dat-sentence': 'T11',
  'dat-passive': 'T12',
  'dat-reflexive': 'T13',
}
```

And in `drillKey()`, before `return null`, add:

```ts
  const dat = DAT_TYPE_TO_CODE[entry.type]
  if (dat) return `dat-${dat}`
```

- [ ] **Step 4: Labels.** In `src/components/charts/quiz-type-labels.ts`:

In `QUIZ_TYPE_LABEL`, after the `'sentence-packed'` line (add a trailing comma to it), add:

```ts
  'dat-case': 'Dative · case pick',
  'dat-form': 'Dative · object form',
  'dat-trap': 'Dative · trap cards',
  'dat-subject': 'Dative · who is subject',
  'dat-experiencer': 'Dative · experiencer production',
  'dat-twin': 'Dative · twin pairs',
  'dat-ditrans': 'Dative · which object',
  'dat-object-order': 'Dative · object order',
  'dat-adjective': 'Dative · adjectives',
  'dat-free': 'Dative · free dative',
  'dat-sentence': 'Dative · sentence (AI)',
  'dat-passive': 'Dative · passive',
  'dat-reflexive': 'Dative · reflexive'
```

In `QUIZ_TYPE_DE`, after the `'sentence-packed'` line (trailing comma), add:

```ts
  'dat-case': 'Dativ · Dativ oder Akkusativ',
  'dat-form': 'Dativ · Dativobjekt',
  'dat-trap': 'Dativ · Fallen-Karten',
  'dat-subject': 'Dativ · Wer ist Subjekt',
  'dat-experiencer': 'Dativ · Produktion',
  'dat-twin': 'Dativ · Zwillingspaare',
  'dat-ditrans': 'Dativ · Welches Objekt',
  'dat-object-order': 'Dativ · Objektfolge',
  'dat-adjective': 'Dativ · Adjektive',
  'dat-free': 'Dativ · Freier Dativ',
  'dat-sentence': 'Dativ · Satz (KI)',
  'dat-passive': 'Dativ · Passiv',
  'dat-reflexive': 'Dativ · Reflexiv'
```

In `QUIZ_TYPES_ORDER`, after `'sprechen-drill'` (trailing comma), add:

```ts
  'dat-case',
  'dat-form',
  'dat-trap',
  'dat-subject',
  'dat-experiencer',
  'dat-twin',
  'dat-ditrans',
  'dat-object-order',
  'dat-adjective',
  'dat-free',
  'dat-sentence',
  'dat-passive',
  'dat-reflexive'
```

- [ ] **Step 5: HistoryPage.** In `src/modules/history/HistoryPage.vue`:

In `QUIZ_TYPES`, after the `'sentence-packed'` line (trailing comma), add:

```ts
  'dat-case':         { label: 'Dative · case pick', de: 'Dativ · Dativ oder Akkusativ', module: 'Dativ' },
  'dat-form':         { label: 'Dative · object form', de: 'Dativ · Dativobjekt', module: 'Dativ' },
  'dat-trap':         { label: 'Dative · trap cards', de: 'Dativ · Fallen-Karten', module: 'Dativ' },
  'dat-subject':      { label: 'Dative · who is subject', de: 'Dativ · Wer ist Subjekt', module: 'Dativ' },
  'dat-experiencer':  { label: 'Dative · experiencer production', de: 'Dativ · Produktion', module: 'Dativ' },
  'dat-twin':         { label: 'Dative · twin pairs', de: 'Dativ · Zwillingspaare', module: 'Dativ' },
  'dat-ditrans':      { label: 'Dative · which object', de: 'Dativ · Welches Objekt', module: 'Dativ' },
  'dat-object-order': { label: 'Dative · object order', de: 'Dativ · Objektfolge', module: 'Dativ' },
  'dat-adjective':    { label: 'Dative · adjectives', de: 'Dativ · Adjektive', module: 'Dativ' },
  'dat-free':         { label: 'Dative · free dative', de: 'Dativ · Freier Dativ', module: 'Dativ' },
  'dat-sentence':     { label: 'Dative · sentence (AI)', de: 'Dativ · Satz (KI)', module: 'Dativ' },
  'dat-passive':      { label: 'Dative · passive', de: 'Dativ · Passiv', module: 'Dativ' },
  'dat-reflexive':    { label: 'Dative · reflexive', de: 'Dativ · Reflexiv', module: 'Dativ' }
```

In `typeOrder`, after `'dw-lexical', 'dw-idiom',` add:

```ts
  'dat-case', 'dat-form', 'dat-trap',
  'dat-subject', 'dat-experiencer', 'dat-twin',
  'dat-ditrans', 'dat-object-order', 'dat-adjective',
  'dat-free', 'dat-sentence', 'dat-passive', 'dat-reflexive',
```

- [ ] **Step 6: Zero-maps.** In `src/composables/useQuizStats.ts`, add to **both** `zeroRunsByType()` (value `0`) and `zeroAccuracyByType()` (value `emptyBucket()`), after the `'sentence-packed'` line of each (trailing comma):

```ts
    'dat-case': 0,
    'dat-form': 0,
    'dat-trap': 0,
    'dat-subject': 0,
    'dat-experiencer': 0,
    'dat-twin': 0,
    'dat-ditrans': 0,
    'dat-object-order': 0,
    'dat-adjective': 0,
    'dat-free': 0,
    'dat-sentence': 0,
    'dat-passive': 0,
    'dat-reflexive': 0
```

```ts
    'dat-case': emptyBucket(),
    'dat-form': emptyBucket(),
    'dat-trap': emptyBucket(),
    'dat-subject': emptyBucket(),
    'dat-experiencer': emptyBucket(),
    'dat-twin': emptyBucket(),
    'dat-ditrans': emptyBucket(),
    'dat-object-order': emptyBucket(),
    'dat-adjective': emptyBucket(),
    'dat-free': emptyBucket(),
    'dat-sentence': emptyBucket(),
    'dat-passive': emptyBucket(),
    'dat-reflexive': emptyBucket()
```

- [ ] **Step 7: Level assessment.** In `src/composables/useLevelAssessment.ts`, in `TYPE_LABEL`, after the `'sentence-packed'` line (trailing comma), add:

```ts
  'dat-case': 'dative verb · governs dative or accusative (membership pick)',
  'dat-form': 'dative verb · produce the dative object form',
  'dat-trap': 'dative verb · English-transitive trap cards',
  'dat-subject': 'dative verb · inverted-experiencer subject/agreement pick',
  'dat-experiencer': 'dative verb · inverted-experiencer production',
  'dat-twin': 'dative verb · dative/accusative twin pairs',
  'dat-ditrans': 'ditransitive · tag dative and accusative objects',
  'dat-object-order': 'ditransitive · object order incl. pronoun inversion',
  'dat-adjective': 'dative adjectives and body-state predicatives',
  'dat-free': 'free dative (commodi/possessivus/ethicus) vs verb object',
  'dat-sentence': 'dative · sentence translation (AI)',
  'dat-passive': 'dative verbs · no personal passive',
  'dat-reflexive': 'reflexive dative (wasche mir die Hände)',
```

- [ ] **Step 8: drillKey test.** Append to `tests/composables/useDrillMastery.test.ts` (it already defines the `run(type, count, correct)` helper at the top):

```ts
describe('drillKey — Dativ', () => {
  test('all 13 dat types map to their catalogue codes', () => {
    const expected: Array<[QuizHistoryType, string]> = [
      ['dat-case', 'T1'], ['dat-form', 'T2'], ['dat-trap', 'T3'],
      ['dat-subject', 'T4'], ['dat-experiencer', 'T5'], ['dat-twin', 'T6'],
      ['dat-ditrans', 'T7'], ['dat-object-order', 'T8'], ['dat-adjective', 'T9'],
      ['dat-free', 'T10'], ['dat-sentence', 'T11'], ['dat-passive', 'T12'],
      ['dat-reflexive', 'T13'],
    ]
    for (const [type, code] of expected) {
      expect(drillKey(run(type, 10, 5))).toBe(`dat-${code}`)
    }
  })
})
```

- [ ] **Step 9: Verify green.**

Run: `npx vitest run tests/composables/useDrillMastery.test.ts tests/components/quiz-type-labels.test.ts tests/composables/useQuizStats.test.ts tests/composables/useQuizHistory.test.ts`
Expected: PASS (the labels test's "ORDER lists every labelled type exactly once" is the completeness gate).

Run: `npm run typecheck`
Expected: PASS — this is the step that proves all five exhaustive `Record<QuizHistoryType, …>` registries were extended.

- [ ] **Step 10: Commit**

```bash
git add src/composables/useQuizHistory.ts src/composables/useDrillMastery.ts src/components/charts/quiz-type-labels.ts src/modules/history/HistoryPage.vue src/composables/useQuizStats.ts src/composables/useLevelAssessment.ts tests/composables/useDrillMastery.test.ts
git commit -m "feat(dative): 13 dat-* history types across all registries; DAT_TYPE_TO_CODE

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `DAT_FAMILIES` in the drill catalogue

**Files:**
- Modify: `src/data/drillCatalogue.ts` (append `DAT_FAMILIES` export)
- Test: `tests/data/drillCatalogue.test.ts` (additive tests + one edit)

**Interfaces:**
- Consumes: `DrillCard`, `DrillFamily` from the same file.
- Produces: `export const DAT_FAMILIES: DrillFamily[]` — 11 families (I–X + Reference), 14 cards (T1–T13 + A). `DativeHome.vue` (Task 6) renders from it. Route names on cards **exist for T1–T3 only** after this phase; the hub renders the rest as "Bald" via `router.hasRoute`.

- [ ] **Step 1: Append to `src/data/drillCatalogue.ts`:**

```ts
// ─── Dativ — 10 skill families + reference, 14 cards ───
// All 14 cards register from day one so the hub shows the whole ladder;
// DativeHome renders a card whose route does not resolve yet (phases 3–4)
// as a disabled "Bald" row via router.hasRoute — the staged-arrival pattern.

export const DAT_FAMILIES: DrillFamily[] = [
  {
    id: 'membership', numeral: 'I', heading: 'The affected person', de: 'Der betroffene Mensch',
    blurb: 'The dative marks an affected person. First question, always: does this verb take it?',
    cards: [
      {
        code: 'T1', route: 'dative-case',
        title: 'Dative or accusative?', de: 'Dativ oder Akkusativ?', level: 'A2',
        desc: 'Every dative verb in the pool plus accusative look-alikes — two buttons, fast rounds, the membership instinct.',
      },
    ],
  },
  {
    id: 'form', numeral: 'II', heading: 'The form on the verb', de: 'Die Form am Verb',
    blurb: 'Knowing the verb is dative is half the job; producing dem, der, den …n, ihm, ihr, ihnen is the other half.',
    cards: [
      {
        code: 'T2', route: 'dative-form',
        title: 'Verb → dative object', de: 'Verb → Dativobjekt', level: 'A2',
        desc: 'The sentence hands you a base form — decline it into the dative the verb demands.',
      },
    ],
  },
  {
    id: 'pull', numeral: 'III', heading: 'The English pull', de: 'Der englische Sog',
    blurb: 'help, thank, follow, answer — English takes a plain object and drags you to the accusative. The highest-yield traps.',
    cards: [
      {
        code: 'T3', route: 'dative-trap',
        title: 'Trap cards', de: 'Fallen-Karten', level: 'B1',
        desc: 'An English sentence pulls accusative-ward; the German verb refuses. Type the object the dative verb wants.',
      },
    ],
  },
  {
    id: 'inverted', numeral: 'IV', heading: 'Inverted verbs', de: 'Umgekehrte Verben',
    blurb: 'Die Schuhe gefallen mir — the thing is the subject and controls agreement; the person is the object.',
    cards: [
      {
        code: 'T4', route: 'dative-subject',
        title: 'Who is the subject?', de: 'Wer ist Subjekt?', level: 'B1',
        desc: 'Pick the subject and the agreeing verb form — plural things take gefallen, never gefällt.',
      },
      {
        code: 'T5', route: 'dative-experiencer',
        title: 'Production', de: 'Produktion', level: 'B1',
        desc: 'gefallen, schmecken, fehlen, gehören, passen, wehtun, einfallen, gelingen — build the inverted sentence yourself.',
      },
    ],
  },
  {
    id: 'twins', numeral: 'V', heading: 'Twin verbs', de: 'Zwillinge',
    blurb: 'Near-synonyms on opposite sides of the case line — the boundary that proves membership is per verb.',
    cards: [
      {
        code: 'T6', route: 'dative-twins',
        title: 'Twin pairs', de: 'Zwillingspaare', level: 'B2',
        desc: 'antworten or beantworten? folgen or verfolgen? zuhören or hören? glauben + Dat or + Akk? Pick the verb the sentence demands.',
      },
    ],
  },
  {
    id: 'ditransitives', numeral: 'VI', heading: 'Two objects', de: 'Zwei Objekte',
    blurb: 'geben, schenken, erklären — here the dative is predictable: the receiver. The trap is the order.',
    cards: [
      {
        code: 'T7', route: 'dative-ditransitive',
        title: 'Which object?', de: 'Welches Objekt?', level: 'A2',
        desc: 'Ich schenke dem Bruder das Buch — who receives, what moves. Tag each object with its case.',
      },
      {
        code: 'T8', route: 'dative-object-order',
        title: 'Object order', de: 'Objektfolge', level: 'B1',
        desc: 'Dative before accusative — until both are pronouns: Ich gebe es ihm. Put the objects in order.',
      },
    ],
  },
  {
    id: 'adjectives', numeral: 'VII', heading: 'Dative without an object', de: 'Dativ ohne Objekt',
    blurb: 'Adjectives and body states that mark their person dative — no verb object in sight.',
    cards: [
      {
        code: 'T9', route: 'dative-adjectives',
        title: 'Dative adjectives', de: 'Dativ-Adjektive', level: 'B1',
        desc: 'mir ist kalt · das ist mir wichtig, peinlich, egal, ähnlich, treu, klar — supply the person the state belongs to.',
      },
    ],
  },
  {
    id: 'free', numeral: 'VIII', heading: 'Free datives', de: 'Freier Dativ',
    blurb: 'Optional datives the verb never asked for — drop them and the sentence survives.',
    cards: [
      {
        code: 'T10', route: 'dative-free',
        title: 'Free dative', de: 'Freier Dativ', level: 'C1',
        desc: 'Ich trage dir den Koffer — benefit, possession, or pure emotion, set against a real dative-verb object.',
      },
    ],
  },
  {
    id: 'production', numeral: 'IX', heading: 'In the sentence', de: 'Im Satz',
    cards: [
      {
        code: 'T11', route: 'dative-sentence', level: 'B2', ai: true,
        title: 'Sentence translation (AI)', de: 'Satzübersetzung (KI)',
        desc: 'The AI writes English around your dative verbs; you write the German. Case slips get named as case slips.',
      },
    ],
  },
  {
    id: 'consequences', numeral: 'X', heading: 'Consequences', de: 'Folgen',
    blurb: 'What being a dative verb entails further up the grammar.',
    cards: [
      {
        code: 'T12', route: 'dative-passive',
        title: 'No personal passive', de: 'Kein persönliches Passiv', level: 'B2',
        desc: 'Mir wird geholfen — never *Ich werde geholfen. Dative verbs keep their dative in the passive.',
      },
      {
        code: 'T13', route: 'dative-reflexive',
        title: 'Reflexive dative', de: 'Reflexiver Dativ', level: 'B2',
        desc: 'Ich wasche mir die Hände, ich kaufe mir ein Eis — the reflexive turns dative when an accusative is already taken.',
      },
    ],
  },
  {
    id: 'reference', numeral: 'XI', heading: 'Reference', de: 'Nachschlagen',
    cards: [
      {
        code: 'A', route: 'dative-cheatsheet', level: 'Ref',
        title: 'Cheatsheet', de: 'Spickzettel',
        desc: 'The dative map by semantic family — recipients, experiencers, co-agents — with the swallowed-accusative hooks, plus cross-links out to Prepositions and Declension.',
      },
    ],
  },
]
```

- [ ] **Step 2: Extend `tests/data/drillCatalogue.test.ts`.** Change the import line to include `DAT_FAMILIES`, add `const datCards = DAT_FAMILIES.flatMap(f => f.cards)` beside the other two, and change the kebab-id test's array from `[...DW_FAMILIES, ...DAC_PHASES]` to `[...DW_FAMILIES, ...DAC_PHASES, ...DAT_FAMILIES]`. Then append inside the describe block:

```ts
  test('Dativ: 11 families, 14 cards (T1–T13 + A)', () => {
    expect(DAT_FAMILIES).toHaveLength(11)
    expect(datCards).toHaveLength(14)
  })

  test('every DAT card code is unique and every route sits under the dative- head', () => {
    const codes = datCards.map(c => c.code)
    expect(new Set(codes).size).toBe(codes.length)
    const bad = datCards.filter(c => !/^dative-[a-z-]+$/.test(c.route))
    expect(bad.map(c => c.code)).toEqual([])
  })

  test('DAT: T11 is the only AI card; A is level Ref', () => {
    expect(datCards.filter(c => c.ai).map(c => c.code)).toEqual(['T11'])
    expect(datCards.find(c => c.code === 'A')!.level).toBe('Ref')
  })
```

(Route resolution for T1–T3 is asserted in Task 10, once the routes exist.)

- [ ] **Step 3: Verify green.**

Run: `npx vitest run tests/data/drillCatalogue.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/data/drillCatalogue.ts tests/data/drillCatalogue.test.ts
git commit -m "feat(dative): DAT_FAMILIES catalogue — 11 families, 14 cards

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Item banks — `src/data/dativeItems.ts` (gates 2, 8, 9)

**Files:**
- Create: `src/data/dativeItems.ts`
- Test: `tests/data/dativeItems.test.ts`

**Interfaces:**
- Consumes: `DATIVE_VERBS`, `DATIVE_VERB_KEYS` (phase 1); `VERBS`, `verbLevelToCefr` from `src/data/verbs.ts`.
- Produces (Task 5 and the runners rely on these exact names): `DATIVE_ITEM_LEVELS: readonly ['A2','B1','B2']`, `type DativeItemLevel`, `interface CaseChoiceItem { id; verb; answer: 'dative' | 'accusative'; level }`, `interface FormItem { id; verb; sentence; cue; answers; translation; level }`, `interface TrapItem { id; verb; english; sentence; cue; answers; level }`, `T1_CASE_ITEMS`, `T2_FORM_ITEMS`, `T3_TRAP_ITEMS`.

- [ ] **Step 1: Write the failing gate tests.** Create `tests/data/dativeItems.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { VERBS } from '../../src/data/verbs'
import { DATIVE_VERBS, DATIVE_VERB_KEYS, dativeVerbsBy } from '../../src/data/dativeVerbs'
import {
  DATIVE_ITEM_LEVELS, T1_CASE_ITEMS, T2_FORM_ITEMS, T3_TRAP_ITEMS,
} from '../../src/data/dativeItems'

const byGerman = new Map(VERBS.map(v => [v.german, v]))
const FAMILIES = ['recipient', 'experiencer', 'co-agent'] as const

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Answer-leak gate: the sentence never contains the expected form as a standalone run. */
function leaks(sentence: string, answer: string): boolean {
  return new RegExp(`(^|[^a-zäöüß])${escapeRe(answer)}($|[^a-zäöüß])`, 'i').test(sentence)
}

function baseChecks(items: readonly { id: string; level: string }[]) {
  expect(new Set(items.map(i => i.id)).size).toBe(items.length)
  const bad = items.filter(i => !(DATIVE_ITEM_LEVELS as readonly string[]).includes(i.level))
  expect(bad.map(i => i.id)).toEqual([])
}

describe('T1_CASE_ITEMS (Dativ oder Akkusativ?)', () => {
  test('base invariants', () => baseChecks(T1_CASE_ITEMS))

  test('CORRECTNESS GATE: dative items are DATIVE_VERBS keys; accusative items carry case "accusative" in VERBS', () => {
    const bad = T1_CASE_ITEMS.filter(i => i.answer === 'dative'
      ? !(i.verb in DATIVE_VERBS)
      : byGerman.get(i.verb)?.case !== 'accusative')
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥30 total, ≥10 accusative distractors, ≥1 per semantic family', () => {
    expect(T1_CASE_ITEMS.length).toBeGreaterThanOrEqual(30)
    expect(T1_CASE_ITEMS.filter(i => i.answer === 'accusative').length).toBeGreaterThanOrEqual(10)
    for (const fam of FAMILIES) {
      const n = T1_CASE_ITEMS.filter(i => i.answer === 'dative' && DATIVE_VERBS[i.verb].family === fam).length
      expect(n, fam).toBeGreaterThanOrEqual(1)
    }
  })

  test('T1 covers every DATIVE_VERBS key (membership drill = the whole bank)', () => {
    const covered = new Set(T1_CASE_ITEMS.filter(i => i.answer === 'dative').map(i => i.verb))
    const missing = DATIVE_VERB_KEYS.filter(k => !covered.has(k))
    expect(missing).toEqual([])
  })
})

describe('T2_FORM_ITEMS (Verb → Dativobjekt)', () => {
  test('base invariants', () => baseChecks(T2_FORM_ITEMS))

  test('cross-refs and shape: verb is a DATIVE_VERBS key, exactly one gap, cue + translation + answers present', () => {
    const bad = T2_FORM_ITEMS.filter(i =>
      !(i.verb in DATIVE_VERBS)
      || (i.sentence.match(/___/g) ?? []).length !== 1
      || i.cue.trim().length === 0
      || i.translation.trim().length === 0
      || i.answers.length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('NO ANSWER LEAK: the sentence never contains an expected form', () => {
    const bad = T2_FORM_ITEMS.filter(i => i.answers.some(a => leaks(i.sentence, a)))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥30 total, ≥1 per semantic family', () => {
    expect(T2_FORM_ITEMS.length).toBeGreaterThanOrEqual(30)
    for (const fam of FAMILIES) {
      expect(T2_FORM_ITEMS.filter(i => DATIVE_VERBS[i.verb].family === fam).length, fam).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('T3_TRAP_ITEMS (Fallen-Karten)', () => {
  test('base invariants', () => baseChecks(T3_TRAP_ITEMS))

  test('cross-refs: verb is a DATIVE_VERBS key flagged englishPull, exactly one gap, english present', () => {
    const bad = T3_TRAP_ITEMS.filter(i =>
      DATIVE_VERBS[i.verb]?.englishPull !== true
      || (i.sentence.match(/___/g) ?? []).length !== 1
      || i.english.trim().length === 0
      || i.answers.length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('NO ANSWER LEAK: the sentence never contains an expected form', () => {
    const bad = T3_TRAP_ITEMS.filter(i => i.answers.some(a => leaks(i.sentence, a)))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥20 total, ≥1 per semantic family', () => {
    expect(T3_TRAP_ITEMS.length).toBeGreaterThanOrEqual(20)
    for (const fam of FAMILIES) {
      expect(T3_TRAP_ITEMS.filter(i => DATIVE_VERBS[i.verb].family === fam).length, fam).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('reachability (spec gate 8, verb half)', () => {
  // Adjective items join the union in phase 3 (T9's bank); the verb half of
  // the ~60-item ledger must already be fully reachable through T1–T3.
  test('every DATIVE_VERBS key appears in at least one drill bank', () => {
    const covered = new Set([
      ...T1_CASE_ITEMS.filter(i => i.answer === 'dative').map(i => i.verb),
      ...T2_FORM_ITEMS.map(i => i.verb),
      ...T3_TRAP_ITEMS.map(i => i.verb),
    ])
    const missing = DATIVE_VERB_KEYS.filter(k => !covered.has(k))
    expect(missing).toEqual([])
  })

  test('family helper sanity: the three families partition the keys', () => {
    const sum = FAMILIES.reduce((s, f) => s + dativeVerbsBy(f).length, 0)
    expect(sum).toBe(DATIVE_VERB_KEYS.length)
  })
})
```

- [ ] **Step 2: Run to verify failure.**

Run: `npx vitest run tests/data/dativeItems.test.ts`
Expected: FAIL — cannot resolve `../../src/data/dativeItems`.

- [ ] **Step 3: Create `src/data/dativeItems.ts`:**

```ts
// Item banks for the Dativ module's T1–T3. T1 is DERIVED from the side-table
// (membership is the whole bank — that is what makes the ledger's verb half
// reachable); T2/T3 are authored. Gate tests: tests/data/dativeItems.test.ts.

import { DATIVE_VERB_KEYS } from './dativeVerbs'
import { VERBS, verbLevelToCefr } from './verbs'

export const DATIVE_ITEM_LEVELS = ['A2', 'B1', 'B2'] as const
export type DativeItemLevel = (typeof DATIVE_ITEM_LEVELS)[number]

const LEVEL_OF = new Map(VERBS.map(v => [v.german, verbLevelToCefr(v.level)]))

/** Pool level collapsed to the drill's three buckets (A1 drills as A2). */
function drillLevel(german: string): DativeItemLevel {
  const cefr = LEVEL_OF.get(german) ?? 'B1'
  if (cefr === 'A1' || cefr === 'A2') return 'A2'
  if (cefr === 'B1') return 'B1'
  return 'B2'
}

// ─── T1 · Dativ oder Akkusativ? ─────────────────────────────────────────

export interface CaseChoiceItem {
  id: string
  verb: string                       // VERBS.german
  answer: 'dative' | 'accusative'
  level: DativeItemLevel
}

// Real accusative verbs a learner plausibly suspects of dativehood —
// every one verified case: "accusative" in verbs.ts (test-enforced).
const ACCUSATIVE_DISTRACTORS = [
  'sehen', 'hören', 'treffen', 'fragen', 'brauchen', 'suchen', 'lieben',
  'kaufen', 'kennen', 'anrufen', 'besuchen', 'unterstützen', 'beantworten',
  'verfolgen', 'vermeiden', 'bestellen', 'verletzen', 'stören', 'bitten',
  'einladen',
] as const

export const T1_CASE_ITEMS: readonly CaseChoiceItem[] = [
  ...DATIVE_VERB_KEYS.map(v => ({
    id: `t1-${v.replace(/\s+/g, '-')}`,
    verb: v,
    answer: 'dative' as const,
    level: drillLevel(v),
  })),
  ...ACCUSATIVE_DISTRACTORS.map(v => ({
    id: `t1-${v}`,
    verb: v,
    answer: 'accusative' as const,
    level: drillLevel(v),
  })),
]

// ─── T2 · Verb → Dativobjekt ────────────────────────────────────────────

export interface FormItem {
  id: string
  verb: string                       // DATIVE_VERBS key
  sentence: string                   // exactly one ___
  cue: string                        // base form to decline
  answers: readonly string[]         // first is canonical
  translation: string
  level: DativeItemLevel
}

export const T2_FORM_ITEMS: readonly FormItem[] = [
  { id: 't2-helfen-1', verb: 'helfen', sentence: 'Ich helfe ___ beim Umzug.', cue: 'mein Bruder', answers: ['meinem Bruder'], translation: 'I am helping my brother with the move.', level: 'A2' },
  { id: 't2-danken-1', verb: 'danken', sentence: 'Wir danken ___ für die Einladung.', cue: 'sie (= she)', answers: ['ihr'], translation: 'We thank her for the invitation.', level: 'A2' },
  { id: 't2-gehoeren-1', verb: 'gehören', sentence: 'Das Fahrrad gehört ___.', cue: 'ich', answers: ['mir'], translation: 'The bicycle belongs to me.', level: 'A2' },
  { id: 't2-schmecken-1', verb: 'schmecken', sentence: 'Die Suppe schmeckt ___ nicht.', cue: 'das Kind', answers: ['dem Kind'], translation: 'The child does not like the soup.', level: 'A2' },
  { id: 't2-gefallen-1', verb: 'gefallen', sentence: 'Der Film hat ___ gut gefallen.', cue: 'wir', answers: ['uns'], translation: 'We liked the film a lot.', level: 'A2' },
  { id: 't2-antworten-1', verb: 'antworten', sentence: 'Der Schüler antwortet ___.', cue: 'die Lehrerin', answers: ['der Lehrerin'], translation: 'The pupil answers the teacher.', level: 'A2' },
  { id: 't2-folgen-1', verb: 'folgen', sentence: 'Der Hund folgt ___ durch den Park.', cue: 'sein Herr', answers: ['seinem Herrn'], translation: 'The dog follows its master through the park.', level: 'B1' },
  { id: 't2-vertrauen-1', verb: 'vertrauen', sentence: 'Ich vertraue ___ voll und ganz.', cue: 'du', answers: ['dir'], translation: 'I trust you completely.', level: 'A2' },
  { id: 't2-zuhoeren-1', verb: 'zuhören', sentence: 'Bitte hör ___ genau zu!', cue: 'ich', answers: ['mir'], translation: 'Please listen to me carefully!', level: 'A2' },
  { id: 't2-gratulieren-1', verb: 'gratulieren', sentence: 'Wir gratulieren ___ zum Geburtstag.', cue: 'unsere Oma', answers: ['unserer Oma'], translation: 'We congratulate our grandma on her birthday.', level: 'A2' },
  { id: 't2-raten-1', verb: 'raten', sentence: 'Der Arzt rät ___ zu mehr Bewegung.', cue: 'der Patient', answers: ['dem Patienten'], translation: 'The doctor advises the patient to exercise more.', level: 'B1' },
  { id: 't2-passen-1', verb: 'passen', sentence: 'Die Schuhe passen ___ perfekt.', cue: 'meine Schwester', answers: ['meiner Schwester'], translation: 'The shoes fit my sister perfectly.', level: 'A2' },
  { id: 't2-fehlen-1', verb: 'fehlen', sentence: 'Du fehlst ___ sehr.', cue: 'ich', answers: ['mir'], translation: 'I miss you a lot.', level: 'A2' },
  { id: 't2-drohen-1', verb: 'drohen', sentence: 'Der Chef droht ___ mit Kündigung.', cue: 'die Mitarbeiter (Plural)', answers: ['den Mitarbeitern'], translation: 'The boss threatens the employees with dismissal.', level: 'B1' },
  { id: 't2-begegnen-1', verb: 'begegnen', sentence: 'Gestern bin ich ___ im Supermarkt begegnet.', cue: 'ein alter Freund', answers: ['einem alten Freund'], translation: 'Yesterday I ran into an old friend at the supermarket.', level: 'B1' },
  { id: 't2-verzeihen-1', verb: 'verzeihen', sentence: 'Sie verzeiht ___ den Fehler.', cue: 'er', answers: ['ihm'], translation: 'She forgives him the mistake.', level: 'A2' },
  { id: 't2-widersprechen-1', verb: 'widersprechen', sentence: 'Warum widersprichst du ___ immer?', cue: 'deine Eltern (Plural)', answers: ['deinen Eltern'], translation: 'Why do you always contradict your parents?', level: 'B1' },
  { id: 't2-aehneln-1', verb: 'ähneln', sentence: 'Das Baby ähnelt ___.', cue: 'sein Vater', answers: ['seinem Vater'], translation: 'The baby resembles its father.', level: 'B1' },
  { id: 't2-gelingen-1', verb: 'gelingen', sentence: 'Der Kuchen ist ___ gut gelungen.', cue: 'die Bäckerin', answers: ['der Bäckerin'], translation: 'The baker (f.) succeeded well with the cake.', level: 'B1' },
  { id: 't2-einfallen-1', verb: 'einfallen', sentence: 'Der Name fällt ___ nicht ein.', cue: 'ich', answers: ['mir'], translation: 'The name does not come to my mind.', level: 'A2' },
  { id: 't2-schaden-1', verb: 'schaden', sentence: 'Zu viel Zucker schadet ___.', cue: 'die Zähne (Plural)', answers: ['den Zähnen'], translation: 'Too much sugar harms the teeth.', level: 'B1' },
  { id: 't2-zustimmen-1', verb: 'zustimmen', sentence: 'Ich stimme ___ zu.', cue: 'dein Vorschlag', answers: ['deinem Vorschlag'], translation: 'I agree with your proposal.', level: 'B1' },
  { id: 't2-dienen-1', verb: 'dienen', sentence: 'Diese Regel dient ___.', cue: 'die Sicherheit', answers: ['der Sicherheit'], translation: 'This rule serves safety.', level: 'B1' },
  { id: 't2-entsprechen-1', verb: 'entsprechen', sentence: 'Der Bericht entspricht ___.', cue: 'die Tatsachen (Plural)', answers: ['den Tatsachen'], translation: 'The report corresponds to the facts.', level: 'B2' },
  { id: 't2-wehtun-1', verb: 'wehtun', sentence: 'Der Rücken tut ___ weh.', cue: 'der Großvater', answers: ['dem Großvater'], translation: 'The grandfather\'s back hurts.', level: 'A2' },
  { id: 't2-befehlen-1', verb: 'befehlen', sentence: 'Der General befiehlt ___.', cue: 'die Soldaten (Plural)', answers: ['den Soldaten'], translation: 'The general gives the soldiers orders.', level: 'B2' },
  { id: 't2-gehorchen-1', verb: 'gehorchen', sentence: 'Das Kind gehorcht ___ nicht.', cue: 'seine Eltern (Plural)', answers: ['seinen Eltern'], translation: 'The child does not obey its parents.', level: 'B1' },
  { id: 't2-misstrauen-1', verb: 'misstrauen', sentence: 'Sie misstraut ___.', cue: 'der Verkäufer', answers: ['dem Verkäufer'], translation: 'She distrusts the salesman.', level: 'B2' },
  { id: 't2-beitreten-1', verb: 'beitreten', sentence: 'Mein Vater ist ___ beigetreten.', cue: 'der Verein', answers: ['dem Verein'], translation: 'My father joined the club.', level: 'B2' },
  { id: 't2-ausweichen-1', verb: 'ausweichen', sentence: 'Das Auto wich ___ aus.', cue: 'der Radfahrer', answers: ['dem Radfahrer'], translation: 'The car dodged the cyclist.', level: 'B2' },
  { id: 't2-naehern-1', verb: 'sich nähern', sentence: 'Der Zug nähert sich ___.', cue: 'der Bahnhof', answers: ['dem Bahnhof'], translation: 'The train is approaching the station.', level: 'B2' },
  { id: 't2-imponieren-1', verb: 'imponieren', sentence: 'Dein Mut imponiert ___.', cue: 'wir', answers: ['uns'], translation: 'Your courage impresses us.', level: 'B2' },
  { id: 't2-nuetzen-1', verb: 'nützen', sentence: 'Das Wörterbuch nützt ___ sehr.', cue: 'die Studenten (Plural)', answers: ['den Studenten'], translation: 'The dictionary is very useful to the students.', level: 'B1' },
  { id: 't2-genuegen-1', verb: 'genügen', sentence: 'Eine kurze E-Mail genügt ___.', cue: 'ich', answers: ['mir'], translation: 'A short e-mail is enough for me.', level: 'B1' },
]

// ─── T3 · Fallen-Karten (English pull) ──────────────────────────────────

export interface TrapItem {
  id: string
  verb: string                       // DATIVE_VERBS key with englishPull
  english: string                    // the pulling English sentence
  sentence: string                   // exactly one ___
  cue: string
  answers: readonly string[]
  level: DativeItemLevel
}

export const T3_TRAP_ITEMS: readonly TrapItem[] = [
  { id: 't3-helfen-1', verb: 'helfen', english: 'I help my little brother with his homework.', sentence: 'Ich helfe ___ bei den Hausaufgaben.', cue: 'mein kleiner Bruder', answers: ['meinem kleinen Bruder'], level: 'B1' },
  { id: 't3-danken-1', verb: 'danken', english: 'She thanks the bus driver.', sentence: 'Sie dankt ___.', cue: 'der Busfahrer', answers: ['dem Busfahrer'], level: 'B1' },
  { id: 't3-folgen-1', verb: 'folgen', english: 'The detective follows the suspect.', sentence: 'Der Detektiv folgt ___.', cue: 'der Verdächtige', answers: ['dem Verdächtigen'], level: 'B1' },
  { id: 't3-antworten-1', verb: 'antworten', english: 'Why don\'t you answer your mother?', sentence: 'Warum antwortest du ___ nicht?', cue: 'deine Mutter', answers: ['deiner Mutter'], level: 'B1' },
  { id: 't3-vertrauen-1', verb: 'vertrauen', english: 'I trust my doctor.', sentence: 'Ich vertraue ___.', cue: 'meine Ärztin', answers: ['meiner Ärztin'], level: 'B1' },
  { id: 't3-gratulieren-1', verb: 'gratulieren', english: 'We congratulate the winner.', sentence: 'Wir gratulieren ___.', cue: 'die Gewinnerin', answers: ['der Gewinnerin'], level: 'B1' },
  { id: 't3-zuhoeren-1', verb: 'zuhören', english: 'The students listen to the professor.', sentence: 'Die Studenten hören ___ zu.', cue: 'der Professor', answers: ['dem Professor'], level: 'B1' },
  { id: 't3-widersprechen-1', verb: 'widersprechen', english: 'He contradicts his boss in every meeting.', sentence: 'Er widerspricht ___ in jeder Besprechung.', cue: 'sein Chef', answers: ['seinem Chef'], level: 'B1' },
  { id: 't3-aehneln-1', verb: 'ähneln', english: 'The daughter resembles her grandmother.', sentence: 'Die Tochter ähnelt ___.', cue: 'ihre Großmutter', answers: ['ihrer Großmutter'], level: 'B1' },
  { id: 't3-begegnen-1', verb: 'begegnen', english: 'I met an old colleague at the station.', sentence: 'Ich bin ___ am Bahnhof begegnet.', cue: 'ein alter Kollege', answers: ['einem alten Kollegen'], level: 'B1' },
  { id: 't3-gehorchen-1', verb: 'gehorchen', english: 'The dog obeys its owner.', sentence: 'Der Hund gehorcht ___.', cue: 'sein Besitzer', answers: ['seinem Besitzer'], level: 'B1' },
  { id: 't3-raten-1', verb: 'raten', english: 'The lawyer advises her client to stay silent.', sentence: 'Die Anwältin rät ___ zu schweigen.', cue: 'ihr Mandant', answers: ['ihrem Mandanten'], level: 'B1' },
  { id: 't3-dienen-1', verb: 'dienen', english: 'He served the king for twenty years.', sentence: 'Er diente ___ zwanzig Jahre lang.', cue: 'der König', answers: ['dem König'], level: 'B1' },
  { id: 't3-misstrauen-1', verb: 'misstrauen', english: 'She distrusts the salesman.', sentence: 'Sie misstraut ___.', cue: 'der Verkäufer', answers: ['dem Verkäufer'], level: 'B2' },
  { id: 't3-beitreten-1', verb: 'beitreten', english: 'My sister joined the chess club.', sentence: 'Meine Schwester ist ___ beigetreten.', cue: 'der Schachverein', answers: ['dem Schachverein'], level: 'B2' },
  { id: 't3-ausweichen-1', verb: 'ausweichen', english: 'The cyclist dodged the pedestrian.', sentence: 'Der Radfahrer wich ___ aus.', cue: 'der Fußgänger', answers: ['dem Fußgänger'], level: 'B2' },
  { id: 't3-naehern-1', verb: 'sich nähern', english: 'The ship is approaching the harbor.', sentence: 'Das Schiff nähert sich ___.', cue: 'der Hafen', answers: ['dem Hafen'], level: 'B2' },
  { id: 't3-zusehen-1', verb: 'zusehen', english: 'The children watch the cook.', sentence: 'Die Kinder sehen ___ zu.', cue: 'der Koch', answers: ['dem Koch'], level: 'B1' },
  { id: 't3-zuschauen-1', verb: 'zuschauen', english: 'We watch the dancers.', sentence: 'Wir schauen ___ zu.', cue: 'die Tänzer (Plural)', answers: ['den Tänzern'], level: 'B1' },
  { id: 't3-verzeihen-1', verb: 'verzeihen', english: 'She forgave her friend.', sentence: 'Sie hat ___ verziehen.', cue: 'ihre Freundin', answers: ['ihrer Freundin'], level: 'B1' },
  { id: 't3-imponieren-1', verb: 'imponieren', english: 'Your courage impresses the jury.', sentence: 'Dein Mut imponiert ___.', cue: 'die Jury', answers: ['der Jury'], level: 'B2' },
  { id: 't3-befehlen-1', verb: 'befehlen', english: 'The captain commands the crew.', sentence: 'Der Kapitän befiehlt ___.', cue: 'die Mannschaft', answers: ['der Mannschaft'], level: 'B2' },
]
```

- [ ] **Step 4: Run to verify pass.**

Run: `npx vitest run tests/data/dativeItems.test.ts`
Expected: PASS — all 11 tests. If the leak gate lists an id, fix the item's sentence, never the gate.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/dativeItems.ts tests/data/dativeItems.test.ts
git commit -m "feat(dative): T1-T3 item banks with correctness, leak, floor, and reachability gates

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `useDativeDrill.ts` — shared sampling, filtering, grading

**Files:**
- Create: `src/composables/useDativeDrill.ts`
- Test: `tests/composables/useDativeDrill.test.ts`

**Interfaces:**
- Consumes: `shuffle` (src/data/pool.ts), `checkText` (src/composables/drillGrading.ts), `DATIVE_VERBS`, item banks + types from Task 4.
- Produces (pinned + helpers Tasks 7–9 use):

```ts
export interface DativeCard { id: string; prompt: string; answers: readonly string[]; verb?: string; explanation?: string }
export function sampleDativeCards<T extends { id: string }>(pool: readonly T[], count: number): T[]
export function gradeDativeAnswer(given: string, answers: readonly string[]): boolean
export type DativeFamily = 'recipient' | 'experiencer' | 'co-agent'
export const DATIVE_FAMILIES: readonly DativeFamily[]
export const FAMILY_LABELS: Record<DativeFamily, string>
export interface DativeFilter { levels: DativeItemLevel[]; families: DativeFamily[] }
export function filterCaseItems(f: DativeFilter): CaseChoiceItem[]
export function filterFormItems(f: DativeFilter): FormItem[]
export function filterTrapItems(f: DativeFilter): TrapItem[]
export function buildCaseCards(items: readonly CaseChoiceItem[]): DativeCard[]
export function buildFormCards(items: readonly FormItem[]): DativeCard[]
export function buildTrapCards(items: readonly TrapItem[]): DativeCard[]
```

- [ ] **Step 1: Write the failing tests.** Create `tests/composables/useDativeDrill.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  sampleDativeCards, gradeDativeAnswer, filterCaseItems, filterFormItems,
  buildCaseCards, buildFormCards, DATIVE_FAMILIES,
} from '../../src/composables/useDativeDrill'
import { T1_CASE_ITEMS, T2_FORM_ITEMS, DATIVE_ITEM_LEVELS } from '../../src/data/dativeItems'
import { DATIVE_VERBS } from '../../src/data/dativeVerbs'

describe('sampleDativeCards', () => {
  test('returns count items from the pool, no duplicates', () => {
    const out = sampleDativeCards(T1_CASE_ITEMS, 10)
    expect(out).toHaveLength(10)
    expect(new Set(out.map(i => i.id)).size).toBe(10)
    const ids = new Set(T1_CASE_ITEMS.map(i => i.id))
    expect(out.every(i => ids.has(i.id))).toBe(true)
  })

  test('a count above the pool size returns the whole pool', () => {
    expect(sampleDativeCards(T2_FORM_ITEMS, 10_000)).toHaveLength(T2_FORM_ITEMS.length)
  })
})

describe('gradeDativeAnswer', () => {
  test('forgiving exact match: case, whitespace, folded umlauts', () => {
    expect(gradeDativeAnswer('meinem Bruder', ['meinem Bruder'])).toBe(true)
    expect(gradeDativeAnswer('  MEINEM   bruder ', ['meinem Bruder'])).toBe(true)
    expect(gradeDativeAnswer('der Baeckerin', ['der Bäckerin'])).toBe(true)
    expect(gradeDativeAnswer('meinen Bruder', ['meinem Bruder'])).toBe(false)
    expect(gradeDativeAnswer('', ['mir'])).toBe(false)
  })

  test('any listed alternative is accepted', () => {
    expect(gradeDativeAnswer('ihm', ['dem Mann', 'ihm'])).toBe(true)
  })
})

describe('filters', () => {
  test('accusative distractors survive the family filter (T1 must stay two-sided)', () => {
    const out = filterCaseItems({ levels: [...DATIVE_ITEM_LEVELS], families: ['recipient'] })
    expect(out.some(i => i.answer === 'accusative')).toBe(true)
    const badDative = out.filter(i => i.answer === 'dative' && DATIVE_VERBS[i.verb].family !== 'recipient')
    expect(badDative.map(i => i.id)).toEqual([])
  })

  test('form items filter by level and family', () => {
    for (const fam of DATIVE_FAMILIES) {
      const out = filterFormItems({ levels: [...DATIVE_ITEM_LEVELS], families: [fam] })
      expect(out.every(i => DATIVE_VERBS[i.verb].family === fam)).toBe(true)
    }
    expect(filterFormItems({ levels: [], families: [...DATIVE_FAMILIES] })).toHaveLength(0)
  })
})

describe('card builders', () => {
  test('case cards: prompt is the verb, dative cards carry the core-idea explanation', () => {
    const cards = buildCaseCards(T1_CASE_ITEMS.slice(0, 50))
    for (const c of cards) {
      expect(c.prompt).toBe(c.verb)
      expect(['dative', 'accusative']).toContain(c.answers[0])
      expect((c.explanation ?? '').length).toBeGreaterThan(0)
    }
  })

  test('form cards keep sentence, answers, and explanation wiring', () => {
    const cards = buildFormCards(T2_FORM_ITEMS)
    expect(cards[0].prompt).toBe(T2_FORM_ITEMS[0].sentence)
    expect(cards[0].answers).toEqual(T2_FORM_ITEMS[0].answers)
    expect(cards[0].explanation).toBe(DATIVE_VERBS[T2_FORM_ITEMS[0].verb].coreIdeaExplanation)
  })
})
```

- [ ] **Step 2: Run to verify failure.**

Run: `npx vitest run tests/composables/useDativeDrill.test.ts`
Expected: FAIL — cannot resolve `../../src/composables/useDativeDrill`.

- [ ] **Step 3: Create `src/composables/useDativeDrill.ts`:**

```ts
// Shared deterministic sampling + grading for the Dativ module's offline
// drills (ADR-0007 family). No Vue/DOM — runners own their own ref state,
// this module owns the pure layer: filter → sample → build → grade.

import { shuffle } from '../data/pool'
import { checkText } from './drillGrading'
import { DATIVE_VERBS, type DativeVerbEntry } from '../data/dativeVerbs'
import {
  T1_CASE_ITEMS, T2_FORM_ITEMS, T3_TRAP_ITEMS,
  type CaseChoiceItem, type FormItem, type TrapItem, type DativeItemLevel,
} from '../data/dativeItems'

export interface DativeCard {
  id: string
  prompt: string
  answers: readonly string[]
  verb?: string
  explanation?: string
}

export function sampleDativeCards<T extends { id: string }>(pool: readonly T[], count: number): T[] {
  return shuffle(pool, Math.min(count, pool.length))
}

export function gradeDativeAnswer(given: string, answers: readonly string[]): boolean {
  if (answers.length === 0) return false
  return checkText(given, answers[0], [...answers.slice(1)])
}

export type DativeFamily = DativeVerbEntry['family']
export const DATIVE_FAMILIES: readonly DativeFamily[] = ['recipient', 'experiencer', 'co-agent']
export const FAMILY_LABELS: Record<DativeFamily, string> = {
  'recipient': 'Empfänger',
  'experiencer': 'Erlebender',
  'co-agent': 'Mit-Handelnder',
}

export interface DativeFilter {
  levels: DativeItemLevel[]
  families: DativeFamily[]
}

/** T1: the family filter narrows the DATIVE side only — accusative
 *  distractors always stay in, so a round is never one-button-winnable. */
export function filterCaseItems(f: DativeFilter): CaseChoiceItem[] {
  return T1_CASE_ITEMS.filter(i => f.levels.includes(i.level)
    && (i.answer === 'accusative' || f.families.includes(DATIVE_VERBS[i.verb].family)))
}

export function filterFormItems(f: DativeFilter): FormItem[] {
  return T2_FORM_ITEMS.filter(i => f.levels.includes(i.level)
    && f.families.includes(DATIVE_VERBS[i.verb].family))
}

export function filterTrapItems(f: DativeFilter): TrapItem[] {
  return T3_TRAP_ITEMS.filter(i => f.levels.includes(i.level)
    && f.families.includes(DATIVE_VERBS[i.verb].family))
}

export function buildCaseCards(items: readonly CaseChoiceItem[]): DativeCard[] {
  return items.map(i => ({
    id: i.id,
    prompt: i.verb,
    answers: [i.answer],
    verb: i.verb,
    explanation: i.answer === 'dative'
      ? DATIVE_VERBS[i.verb].coreIdeaExplanation
      : `${i.verb} ist kein Dativverb — es nimmt ein Akkusativobjekt.`,
  }))
}

export function buildFormCards(items: readonly FormItem[]): DativeCard[] {
  return items.map(i => ({
    id: i.id,
    prompt: i.sentence,
    answers: i.answers,
    verb: i.verb,
    explanation: DATIVE_VERBS[i.verb].coreIdeaExplanation,
  }))
}

export function buildTrapCards(items: readonly TrapItem[]): DativeCard[] {
  return items.map(i => ({
    id: i.id,
    prompt: i.sentence,
    answers: i.answers,
    verb: i.verb,
    explanation: DATIVE_VERBS[i.verb].coreIdeaExplanation,
  }))
}
```

- [ ] **Step 4: Run to verify pass.**

Run: `npx vitest run tests/composables/useDativeDrill.test.ts`
Expected: PASS — all 8 tests.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useDativeDrill.ts tests/composables/useDativeDrill.test.ts
git commit -m "feat(dative): useDativeDrill — shared filter/sample/build/grade layer

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Module scaffold — route, NavShell, Home card, `DativeHome.vue`

**Files:**
- Create: `src/modules/dative/DativeHome.vue`
- Modify: `src/router.ts` (one route)
- Modify: `src/components/NavShell.vue` (one nav item)
- Modify: `src/modules/home/Home.vue` (card XIII + breadcrumb count)

**Interfaces:**
- Consumes: `DAT_FAMILIES` (Task 3), `computeDrillMastery` keys `dat-<code>` (Task 2), `ledgerSummary`/`readDativeLedger`/`ledgerState` (Task 1). Reuses the global `dw-*` hub CSS classes (they are global styles, not scoped — DirectionWordsHome has no `<style>` block).
- Produces: route name `dative`; the hub that Tasks 7–9's drills are opened from. Cards whose route does not resolve render as a disabled "Bald" row (`router.hasRoute`).

- [ ] **Step 1: Route.** In `src/router.ts`, after the last `directionwords-*` route line (`.../idioms/run', name: 'directionwords-idioms-run' ...`), add:

```ts
  // Dativ. Route names are hyphen-free under the 'dative' head because
  // NavShell derives the active tab via name.split('-')[0].
  { path: '/dative', name: 'dative', component: () => import('./modules/dative/DativeHome.vue') },
```

- [ ] **Step 2: NavShell.** In `src/components/NavShell.vue`, after the `directionwords` item line, add:

```ts
  { route: 'dative', label: 'Dativ', de: 'Dativverben' },
```

- [ ] **Step 3: Home card.** In `src/modules/home/Home.vue`, append to the `modules` array after the `sentence` card (numeral XII):

```ts
  {
    numeral: 'XIII',
    route: 'dative',
    de: 'Dativ',
    title: 'Dative',
    desc: 'helfen, danken, gefallen — the verbs and adjectives that mark their person dative, the English pull that breaks them, and the inverted sentences.',
    meta: 'Item ledger · drills arriving in phases'
  }
```

And update the header breadcrumb from `Frontispiece · I/XII` to `Frontispiece · I/XIII`.

- [ ] **Step 4: Create `src/modules/dative/DativeHome.vue`:**

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'
import { computeDrillMastery } from '../../composables/useDrillMastery'
import { ledgerSummary, readDativeLedger, ledgerState } from '../../composables/useDativeLedger'
import ProgressDial from '../../components/drill/ProgressDial.vue'
import MasteryDots from '../../components/drill/MasteryDots.vue'
import LevelChip from '../../components/drill/LevelChip.vue'
import MasteryBars from '../../components/drill/MasteryBars.vue'
import { DAT_FAMILIES, type DrillCard, type DrillFamily } from '../../data/drillCatalogue'

const router = useRouter()

// One-shot reads, matching the app's convention for pages that aren't
// long-lived — mastery and ledger are computed once at setup.
const historyEntries = loadHistory()
const masteryMap = computeDrillMastery(historyEntries)
const families = DAT_FAMILIES

interface CardMastery { band: number | null; attempts: number }

function cardMastery(card: DrillCard): CardMastery {
  if (card.level === 'Ref') return { band: null, attempts: 0 }
  const m = masteryMap[`dat-${card.code}`]
  return { band: m?.band ?? 0, attempts: m?.total ?? 0 }
}

function familyAvg(family: DrillFamily): number | null {
  const trackable = family.cards.filter(c => c.level !== 'Ref')
  if (!trackable.length) return null
  const sum = trackable.reduce((s, c) => s + (cardMastery(c).band ?? 0), 0)
  return Math.round(sum / trackable.length)
}

// Staged arrival: a card whose route is not registered yet (phases 3–4)
// renders as a disabled "Bald" row instead of navigating nowhere.
function shipped(card: DrillCard): boolean {
  return router.hasRoute(card.route)
}

// ─── item ledger meter — denominator DERIVED, never hard-coded ───────────
const summary = ledgerSummary()
const pct = summary.total > 0 ? Math.round((summary.secured / summary.total) * 100) : 0

const ledger = readDativeLedger()
const shaky = Object.entries(ledger)
  .filter(([, e]) => ledgerState(e) === 'wackelig')
  .sort((a, b) => b[1].lastAt - a[1].lastAt)
  .slice(0, 10)
  .map(([k]) => k)

// Scroll-spy, same mechanics as DirectionWordsHome.
const active = ref(families[0]?.id ?? '')

function onScroll(): void {
  const tops = families
    .map(f => {
      const el = document.getElementById(`datfam-${f.id}`)
      return el ? { id: f.id, top: el.getBoundingClientRect().top } : null
    })
    .filter((t): t is { id: string; top: number } => t !== null)
  const above = tops.filter(t => t.top < 200)
  if (above.length) active.value = above[above.length - 1].id
  else if (tops.length) active.value = tops[0].id
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})

function scrollToFamily(id: string): void {
  const el = document.getElementById(`datfam-${id}`)
  if (!el) return
  const y = el.getBoundingClientRect().top + window.pageYOffset - 88
  window.scrollTo({ top: y, behavior: 'smooth' })
}

function go(card: DrillCard): void {
  if (!shipped(card)) return
  router.push(card.query ? { name: card.route, query: card.query } : { name: card.route })
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel XIII · Dativ</div>
        <h1 class="section-title">Dative<em>.</em></h1>
        <p class="section-subtitle">
          helfen, danken, gefallen — an affected person, marked on the verb.
          Ten families of drills, one ledger of words to secure.
        </p>
      </div>
    </header>

    <div class="dw-layout">
      <aside class="dw-rail">
        <div class="dw-prog">
          <ProgressDial :pct="pct" />
          <p class="dw-prog-txt">
            <strong>{{ summary.secured }} / {{ summary.total }}</strong> gesichert<br />
            {{ summary.shaky }} wackelig · {{ summary.fresh }} neu
          </p>
        </div>

        <nav class="dw-fams" aria-label="Drill families">
          <button
            v-for="f in families"
            :key="f.id"
            type="button"
            class="dw-fam"
            :class="{ active: active === f.id }"
            @click="scrollToFamily(f.id)"
          >
            <span class="dw-fam-n">{{ f.numeral }}</span>
            <span class="dw-fam-t">{{ f.heading }}</span>
            <MasteryDots :band="familyAvg(f)" />
          </button>
        </nav>

        <div v-if="shaky.length" class="dat-shaky">
          <div class="dat-shaky-l">Wackelig</div>
          <span v-for="k in shaky" :key="k" class="dat-shaky-item">{{ k }}</span>
        </div>

        <div class="dw-rail-foot">
          {{ summary.total }} Einträge im Verzeichnis<br />
          Ausgabe MMXXVI
        </div>
      </aside>

      <div class="dw-panels">
        <section
          v-for="f in families"
          :id="`datfam-${f.id}`"
          :key="f.id"
          class="dw-panel"
        >
          <div class="dw-panel-head">
            <span class="dw-panel-num">{{ f.numeral }}</span>
            <h2 class="dw-panel-t">{{ f.heading }}</h2>
            <span class="dw-panel-de">{{ f.de }}</span>
          </div>

          <p v-if="f.blurb" class="dw-desc">{{ f.blurb }}</p>

          <div class="dw-rows">
            <button
              v-for="c in f.cards"
              :key="c.code"
              type="button"
              class="dw-row"
              :class="{ 'dat-soon-row': !shipped(c) }"
              :disabled="!shipped(c)"
              @click="go(c)"
            >
              <span class="dw-code">{{ c.code }}</span>
              <span class="dw-main">
                <span class="dw-title">{{ c.title }}<span class="dw-title-de">{{ c.de }}</span></span>
                <span class="dw-desc">{{ c.desc }}</span>
              </span>
              <span class="dw-meta">
                <LevelChip :level="c.level" :ai="c.ai" />
                <span v-if="!shipped(c)" class="dat-soon">Bald</span>
                <MasteryBars v-else :band="cardMastery(c).band" :attempts="cardMastery(c).attempts" />
              </span>
              <span class="dw-arrow-cell"><span v-if="shipped(c)" class="drill-arrow">→</span></span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dat-soon-row { opacity: 0.55; cursor: default; }
.dat-soon {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--mute);
  border: 1px solid var(--rule);
  border-radius: 3px;
  padding: 2px 7px;
}
.dat-shaky { margin-top: 22px; }
.dat-shaky-l {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 8px;
}
.dat-shaky-item {
  display: inline-block;
  font-size: 13px;
  color: var(--ink-soft);
  border: 1px solid var(--hairline);
  border-radius: 3px;
  padding: 2px 8px;
  margin: 0 6px 6px 0;
}
</style>
```

- [ ] **Step 5: Verify.**

Run: `npx vitest run tests/data/drillCatalogue.test.ts`
Expected: PASS (unchanged — route assertions come in Task 10).

Run: `npm run typecheck`
Expected: PASS.

Manual sanity (optional but recommended): `npm run dev` and open `/dative` — the hub renders all 11 families, T1–T3 rows disabled with "Bald" (their routes arrive in Tasks 7–9), meter reads `0 / 60 gesichert`.

- [ ] **Step 6: Commit**

```bash
git add src/modules/dative/DativeHome.vue src/router.ts src/components/NavShell.vue src/modules/home/Home.vue
git commit -m "feat(dative): module scaffold — hub with ledger meter, nav, Home card XIII

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: T1 — Dativ oder Akkusativ? (Setup + Runner + routes)

**Files:**
- Create: `src/modules/dative/CaseSetup.vue`
- Create: `src/modules/dative/CaseRunner.vue`
- Modify: `src/router.ts` (two routes)

**Interfaces:**
- Consumes: `filterCaseItems`, `sampleDativeCards`, `buildCaseCards`, `DATIVE_FAMILIES`, `FAMILY_LABELS`, `DativeCard` (Task 5); `DATIVE_ITEM_LEVELS` (Task 4); `saveQuizRun` type `'dat-case'` (Task 2); `bumpDativeLedger` (Task 1); `VERBS` for the English gloss; `RetryModal` (src/components/RetryModal.vue: props `wrong-count`, `item-label`; emits `retry`, `dismiss`).
- Produces: routes `dative-case` / `dative-case-run`. Setup storage key `datCaseSetup`.

- [ ] **Step 1: Routes.** In `src/router.ts`, after the `dative` home route, add:

```ts
  { path: '/dative/case', name: 'dative-case', component: () => import('./modules/dative/CaseSetup.vue') },
  { path: '/dative/case/run', name: 'dative-case-run', component: () => import('./modules/dative/CaseRunner.vue') },
```

- [ ] **Step 2: Create `src/modules/dative/CaseSetup.vue`:**

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { filterCaseItems, DATIVE_FAMILIES, FAMILY_LABELS, type DativeFamily } from '../../composables/useDativeDrill'
import { DATIVE_ITEM_LEVELS, type DativeItemLevel } from '../../data/dativeItems'

const STORAGE_KEY = 'datCaseSetup'
const router = useRouter()

const levels = ref<DativeItemLevel[]>(['A2', 'B1'])
const families = ref<DativeFamily[]>([...DATIVE_FAMILIES])

type CountPreset = 10 | 15 | 20 | 'all'
const preset = ref<CountPreset>(10)

interface Stored {
  levels?: DativeItemLevel[]
  families?: DativeFamily[]
  preset?: CountPreset
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = s.levels.filter(l => (DATIVE_ITEM_LEVELS as readonly string[]).includes(l))
    if (s.families) families.value = s.families.filter(f => (DATIVE_FAMILIES as readonly string[]).includes(f))
    if (s.preset !== undefined) preset.value = s.preset
  } catch { /* ignore */ }
}

function save() {
  try {
    const payload: Stored = { levels: levels.value, families: families.value, preset: preset.value }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(load)
watch([levels, families, preset], save, { deep: true })

const availableItems = computed(() =>
  filterCaseItems({ levels: levels.value, families: families.value }).length
)

const effectiveCount = computed(() =>
  preset.value === 'all' ? availableItems.value : Math.min(preset.value, availableItems.value)
)

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v)
  if (i >= 0) return set.filter((_, j) => j !== i)
  return [...set, v]
}

function start() {
  router.push({
    name: 'dative-case-run',
    query: {
      count: String(effectiveCount.value),
      levels: levels.value.join(','),
      families: families.value.join(','),
    },
  })
}
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel XIII · Dativ · Dativ oder Akkusativ?</div>
        <h1 class="section-title">Dative or accusative?<em>.</em></h1>
        <p class="section-subtitle">
          A verb appears with its English meaning — decide which case its object takes.
          Every dative verb in the pool is here, hidden among accusative look-alikes.
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Level · {{ levels.length }} of {{ DATIVE_ITEM_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...DATIVE_ITEM_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="l in DATIVE_ITEM_LEVELS" :key="l"
          class="chip" :class="{ selected: levels.includes(l) }"
          @click="levels = toggle(levels, l)"
        >{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Semantic family · {{ families.length }} of {{ DATIVE_FAMILIES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="families = [...DATIVE_FAMILIES]">All</button>
          <button class="btn btn-quiet" type="button" @click="families = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="f in DATIVE_FAMILIES" :key="f"
          class="chip" :class="{ selected: families.includes(f) }"
          @click="families = toggle(families, f)"
        >{{ FAMILY_LABELS[f] }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of cards</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: preset === 10 }" @click="preset = 10">10</button>
          <button :class="{ active: preset === 15 }" @click="preset = 15">15</button>
          <button :class="{ active: preset === 20 }" @click="preset = 20">20</button>
          <button :class="{ active: preset === 'all' }" @click="preset = 'all'">All · {{ availableItems }}</button>
        </div>
        <span class="micro-mark count-avail">{{ availableItems }} items match</span>
      </div>
    </div>

    <div v-if="availableItems === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      No items match the selected filters.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="router.push({ name: 'dative' })">← Back</button>
      <button
        class="btn btn-accent"
        type="button"
        :disabled="availableItems === 0"
        @click="start"
      >
        Start drill · {{ effectiveCount }} cards <span aria-hidden="true">→</span>
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Create `src/modules/dative/CaseRunner.vue`:**

```vue
<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  filterCaseItems, sampleDativeCards, buildCaseCards,
  DATIVE_FAMILIES, type DativeCard, type DativeFamily,
} from '../../composables/useDativeDrill'
import { DATIVE_ITEM_LEVELS, type DativeItemLevel } from '../../data/dativeItems'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { bumpDativeLedger } from '../../composables/useDativeLedger'
import { VERBS } from '../../data/verbs'
import RetryModal from '../../components/RetryModal.vue'

const route = useRoute()
const router = useRouter()

const ENGLISH = new Map(VERBS.map(v => [v.german, v.english]))

interface RunCard extends DativeCard {
  picked: string | null
  isCorrect: boolean | null
}

const OPTIONS = [
  { value: 'dative', label: 'Dativ' },
  { value: 'accusative', label: 'Akkusativ' },
] as const

const loading = ref(true)
const error = ref<string | null>(null)
const cards = ref<RunCard[]>([])
const index = ref(0)
const submitted = ref(false)
const startedAtMs = ref(0)
const historySaved = ref(false)
const showRetryModal = ref(false)
const dismissed = ref(false)
const queriedLevels = ref<DativeItemLevel[]>([])
const queriedFamilies = ref<DativeFamily[]>([])
const cardRef = ref<HTMLElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

function toRunCards(pool: DativeCard[]): RunCard[] {
  return pool.map(c => ({ ...c, picked: null, isCorrect: null }))
}

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const rawLevels = ((route.query.levels as string) ?? '').split(',').filter(Boolean)
  const levels = rawLevels.filter((l): l is DativeItemLevel => (DATIVE_ITEM_LEVELS as readonly string[]).includes(l))
  const rawFamilies = ((route.query.families as string) ?? '').split(',').filter(Boolean)
  const families = rawFamilies.filter((f): f is DativeFamily => (DATIVE_FAMILIES as readonly string[]).includes(f))
  queriedLevels.value = levels.length ? levels : [...DATIVE_ITEM_LEVELS]
  queriedFamilies.value = families.length ? families : [...DATIVE_FAMILIES]

  const pool = filterCaseItems({ levels: queriedLevels.value, families: queriedFamilies.value })
  const sampled = sampleDativeCards(pool, count)
  if (sampled.length === 0) {
    error.value = 'Nothing to drill — adjust your filters.'
  } else {
    cards.value = toRunCards(buildCaseCards(sampled))
    startedAtMs.value = Date.now()
    nextTick(() => cardRef.value?.focus())
  }
  loading.value = false
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const current = computed(() => cards.value[index.value] ?? null)
const total = computed(() => cards.value.length)
const finished = computed(() => total.value > 0 && index.value >= total.value)
const score = computed(() => cards.value.filter(c => c.isCorrect === true).length)
const wrong = computed(() => cards.value.filter(c => c.isCorrect === false))

const pips = computed(() => cards.value.map((c, n) => {
  if (n < index.value) return c.isCorrect ? 'done' : 'wrong'
  if (n === index.value && submitted.value) return c.isCorrect ? 'done' : 'wrong'
  if (n === index.value) return 'current'
  return ''
}))

function pick(value: string) {
  const c = current.value
  if (!c || submitted.value) return
  c.picked = value
  c.isCorrect = c.answers[0] === value
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  index.value++
  submitted.value = false
  if (!finished.value) nextTick(() => cardRef.value?.focus())
}

function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  if (!current.value) return
  if (e.key === 'Enter') {
    if (submitted.value) { e.preventDefault(); next() }
    return
  }
  if (submitted.value) return
  if (e.key === '1') { e.preventDefault(); pick('dative') }
  if (e.key === '2') { e.preventDefault(); pick('accusative') }
}

// Main round records once and bumps the ledger once per card; retry rounds
// are practice — never recorded, never bumped (ADR-0010, ADR-0017).
function recordRun() {
  if (historySaved.value || cards.value.length === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  for (const c of cards.value) {
    if (c.verb) bumpDativeLedger(c.verb, c.isCorrect === true, finishedAt)
  }
  saveQuizRun({
    type: 'dat-case',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: cards.value.length,
    correct: score.value,
    meta: { levels: queriedLevels.value, families: queriedFamilies.value },
  })
}

watch(finished, (now) => {
  if (now) {
    recordRun()
    if (wrong.value.length > 0 && !dismissed.value) showRetryModal.value = true
  }
})

function retryWrong() {
  showRetryModal.value = false
  const redo = wrong.value.map(c => ({ ...c, picked: null, isCorrect: null }))
  if (redo.length === 0) return
  cards.value = sampleDativeCards(redo, redo.length)
  index.value = 0
  submitted.value = false
  nextTick(() => cardRef.value?.focus())
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function labelOf(value: string): string {
  return OPTIONS.find(o => o.value === value)?.label ?? value
}
</script>

<template>
  <div v-if="loading" class="page loading-state">
    <div class="micro-mark">Loading…</div>
  </div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" @click="router.push({ name: 'dative-case' })">← Back to setup</button>
  </div>

  <!-- Summary -->
  <div v-else-if="finished && !showRetryModal" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Dativ oder Akkusativ?</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Membership round complete.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'dative' })">← Dativ</button>
        <button class="btn btn-accent" @click="router.push({ name: 'dative-case' })">Start another drill <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="c in cards" :key="c.id" class="result-row drill-result-row">
        <div class="result-verb">
          <div class="german">{{ c.prompt }}</div>
          <div class="dat-gloss">{{ ENGLISH.get(c.verb ?? '') ?? '' }}</div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="c.isCorrect ? 'ok' : 'err'">{{ c.picked ? labelOf(c.picked) : '—' }}</span>
          <span v-if="!c.isCorrect" class="result-correct">→ <strong>{{ labelOf(c.answers[0]) }}</strong></span>
        </div>
        <div class="result-verdict">
          <span class="tag" :class="c.isCorrect ? 'tag-success' : 'tag-danger'">{{ c.isCorrect ? '✓' : '✗' }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Retry modal -->
  <div v-else-if="showRetryModal" class="page">
    <RetryModal
      :wrong-count="wrong.length"
      item-label="verbs"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active card -->
  <div v-else-if="current" class="page">
    <div class="drill-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Verb {{ index + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'dative-case' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <div class="drill-prompt">
        <p class="drill-sentence dat-verb">{{ current.prompt }}</p>
        <p class="dat-gloss">{{ ENGLISH.get(current.verb ?? '') ?? '' }}</p>
      </div>

      <div class="choice-row">
        <button
          v-for="(opt, oi) in OPTIONS"
          :key="opt.value"
          type="button"
          class="choice mono-face"
          :class="{
            selected: current.picked === opt.value,
            correct: submitted && current.answers[0] === opt.value,
            wrong: submitted && current.picked === opt.value && current.answers[0] !== opt.value,
            disabled: submitted,
          }"
          :disabled="submitted"
          @click="pick(opt.value)"
        >
          <span class="c-key">{{ oi + 1 }}</span>
          <span class="c-label">{{ opt.label }}</span>
        </button>
      </div>

      <div v-if="submitted" class="drill-feedback">
        <span v-if="current.isCorrect" class="feedback-line correct">
          ✓ Richtig — <strong>{{ labelOf(current.answers[0]) }}</strong>
        </span>
        <template v-else>
          <span class="feedback-line wrong">✗ Korrekt: <strong>{{ labelOf(current.answers[0]) }}</strong></span>
          <p class="dat-explain">{{ current.explanation }}</p>
        </template>
        <button ref="nextBtnRef" type="button" class="btn btn-accent drill-advance" @click="next">
          {{ index + 1 >= total ? 'Finish drill' : 'Next' }} <span aria-hidden="true">→</span>
        </button>
      </div>

      <div class="drill-hint micro-mark">
        <template v-if="!submitted">Press <span class="kbd">1</span>–<span class="kbd">2</span> to choose</template>
        <template v-else>Press <span class="kbd">Enter</span> to {{ index + 1 >= total ? 'finish' : 'continue' }}</template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dat-verb { font-size: 28px; }
.dat-gloss {
  font-family: var(--font-body);
  font-size: 14px;
  font-style: italic;
  color: var(--mute);
  margin: 4px 0 0;
}
.dat-explain {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink-soft);
  margin: 0;
  max-width: 60ch;
}
.drill-result-row { grid-template-columns: 1fr 200px auto; }
@media (max-width: 720px) {
  .drill-result-row { grid-template-columns: 1fr; gap: 4px; }
}
</style>
```

- [ ] **Step 4: Verify.**

Run: `npm run typecheck`
Expected: PASS.

Run: `npx vitest run tests/composables/useDativeDrill.test.ts tests/composables/useDativeLedger.test.ts`
Expected: PASS (unchanged — proves no regression from the wiring).

Manual sanity: `npm run dev` → `/dative` → T1 row is now live → run a 10-card round; finish; confirm the hub meter's wackelig count rose and History shows a `Dativ · Dativ oder Akkusativ` run.

- [ ] **Step 5: Commit**

```bash
git add src/modules/dative/CaseSetup.vue src/modules/dative/CaseRunner.vue src/router.ts
git commit -m "feat(dative): T1 Dativ oder Akkusativ? drill

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: T2 — Verb → Dativobjekt (Setup + Runner + routes)

**Files:**
- Create: `src/modules/dative/FormSetup.vue`
- Create: `src/modules/dative/FormRunner.vue`
- Modify: `src/router.ts` (two routes)

**Interfaces:**
- Consumes: `filterFormItems`, `sampleDativeCards`, `buildFormCards`, `gradeDativeAnswer` (Task 5); `T2_FORM_ITEMS` item extras (`cue`, `translation`) kept in a parallel array; run type `'dat-form'`.
- Produces: routes `dative-form` / `dative-form-run`. Setup storage key `datFormSetup`.

- [ ] **Step 1: Routes.** In `src/router.ts`, after the `dative-case-run` line, add:

```ts
  { path: '/dative/form', name: 'dative-form', component: () => import('./modules/dative/FormSetup.vue') },
  { path: '/dative/form/run', name: 'dative-form-run', component: () => import('./modules/dative/FormRunner.vue') },
```

- [ ] **Step 2: Create `src/modules/dative/FormSetup.vue`.** Start from the file `src/modules/dative/CaseSetup.vue` **already in the repo** (Task 7 committed it) — copy it and apply exactly these changes:
  - `const STORAGE_KEY = 'datFormSetup'`
  - `import { filterFormItems, ... }` and `filterFormItems({ levels: ..., families: ... }).length` in `availableItems`
  - `start()` pushes `{ name: 'dative-form-run', ... }` (same query keys)
  - Breadcrumb: `Kapitel XIII · Dativ · Verb → Dativobjekt`
  - Title: `Verb → dative object<em>.</em>`
  - Subtitle:

```html
        <p class="section-subtitle">
          The sentence hands you a base form — <em>mein Bruder</em>, <em>ich</em>,
          <em>die Eltern</em> — decline it into the dative the verb demands:
          <em>meinem Bruder</em>, <em>mir</em>, <em>den Eltern</em>.
        </p>
```

- [ ] **Step 3: Create `src/modules/dative/FormRunner.vue`:**

```vue
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  filterFormItems, sampleDativeCards, buildFormCards, gradeDativeAnswer,
  DATIVE_FAMILIES, type DativeCard, type DativeFamily,
} from '../../composables/useDativeDrill'
import { DATIVE_ITEM_LEVELS, type FormItem, type DativeItemLevel } from '../../data/dativeItems'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { bumpDativeLedger } from '../../composables/useDativeLedger'
import RetryModal from '../../components/RetryModal.vue'

const route = useRoute()
const router = useRouter()

interface RunCard extends DativeCard {
  typed: string | null
  isCorrect: boolean | null
}

const loading = ref(true)
const error = ref<string | null>(null)
const items = ref<FormItem[]>([])          // parallel to cards — cue/translation live here
const cards = ref<RunCard[]>([])
const index = ref(0)
const input = ref('')
const submitted = ref(false)
const startedAtMs = ref(0)
const historySaved = ref(false)
const showRetryModal = ref(false)
const dismissed = ref(false)
const queriedLevels = ref<DativeItemLevel[]>([])
const queriedFamilies = ref<DativeFamily[]>([])
const inputRef = ref<HTMLInputElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

function rebuild(sampled: FormItem[]) {
  items.value = sampled
  cards.value = buildFormCards(sampled).map(c => ({ ...c, typed: null, isCorrect: null }))
  index.value = 0
  input.value = ''
  submitted.value = false
  nextTick(() => inputRef.value?.focus())
}

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const rawLevels = ((route.query.levels as string) ?? '').split(',').filter(Boolean)
  const levels = rawLevels.filter((l): l is DativeItemLevel => (DATIVE_ITEM_LEVELS as readonly string[]).includes(l))
  const rawFamilies = ((route.query.families as string) ?? '').split(',').filter(Boolean)
  const families = rawFamilies.filter((f): f is DativeFamily => (DATIVE_FAMILIES as readonly string[]).includes(f))
  queriedLevels.value = levels.length ? levels : [...DATIVE_ITEM_LEVELS]
  queriedFamilies.value = families.length ? families : [...DATIVE_FAMILIES]

  const pool = filterFormItems({ levels: queriedLevels.value, families: queriedFamilies.value })
  const sampled = sampleDativeCards(pool, count)
  if (sampled.length === 0) {
    error.value = 'Nothing to drill — adjust your filters.'
  } else {
    rebuild(sampled)
    startedAtMs.value = Date.now()
  }
  loading.value = false
})

const current = computed(() => cards.value[index.value] ?? null)
const currentItem = computed(() => items.value[index.value] ?? null)
const total = computed(() => cards.value.length)
const finished = computed(() => total.value > 0 && index.value >= total.value)
const score = computed(() => cards.value.filter(c => c.isCorrect === true).length)
const wrongIdx = computed(() => cards.value.map((c, i) => c.isCorrect === false ? i : -1).filter(i => i >= 0))

const pips = computed(() => cards.value.map((c, n) => {
  if (n < index.value) return c.isCorrect ? 'done' : 'wrong'
  if (n === index.value && submitted.value) return c.isCorrect ? 'done' : 'wrong'
  if (n === index.value) return 'current'
  return ''
}))

const promptParts = computed(() => current.value ? current.value.prompt.split('___') : [])
const filledSentence = computed(() =>
  current.value ? current.value.prompt.replace('___', current.value.answers[0]) : ''
)

function submit() {
  const c = current.value
  if (!c || submitted.value || !input.value.trim()) return
  c.typed = input.value
  c.isCorrect = gradeDativeAnswer(input.value, c.answers)
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  index.value++
  input.value = ''
  submitted.value = false
  if (!finished.value) nextTick(() => inputRef.value?.focus())
}

function recordRun() {
  if (historySaved.value || cards.value.length === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  for (const c of cards.value) {
    if (c.verb) bumpDativeLedger(c.verb, c.isCorrect === true, finishedAt)
  }
  saveQuizRun({
    type: 'dat-form',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: cards.value.length,
    correct: score.value,
    meta: { levels: queriedLevels.value, families: queriedFamilies.value },
  })
}

watch(finished, (now) => {
  if (now) {
    recordRun()
    if (wrongIdx.value.length > 0 && !dismissed.value) showRetryModal.value = true
  }
})

function retryWrong() {
  showRetryModal.value = false
  const redo = wrongIdx.value.map(i => items.value[i])
  if (redo.length === 0) return
  rebuild(sampleDativeCards(redo, redo.length))
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}
</script>

<template>
  <div v-if="loading" class="page loading-state">
    <div class="micro-mark">Loading…</div>
  </div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" @click="router.push({ name: 'dative-form' })">← Back to setup</button>
  </div>

  <!-- Summary -->
  <div v-else-if="finished && !showRetryModal" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Verb → Dativobjekt</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Form round complete.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'dative' })">← Dativ</button>
        <button class="btn btn-accent" @click="router.push({ name: 'dative-form' })">Start another drill <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="(c, i) in cards" :key="c.id" class="result-row drill-result-row">
        <div class="result-verb">
          <div class="german">{{ c.prompt.replace('___', '＿＿') }} <em>({{ items[i].cue }})</em></div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="c.isCorrect ? 'ok' : 'err'">{{ c.typed ?? '—' }}</span>
          <span v-if="!c.isCorrect" class="result-correct">→ <strong>{{ c.answers[0] }}</strong></span>
        </div>
        <div class="result-verdict">
          <span class="tag" :class="c.isCorrect ? 'tag-success' : 'tag-danger'">{{ c.isCorrect ? '✓' : '✗' }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Retry modal -->
  <div v-else-if="showRetryModal" class="page">
    <RetryModal
      :wrong-count="wrongIdx.length"
      item-label="sentences"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active card -->
  <div v-else-if="current" class="page">
    <div class="drill-stage">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ index + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'dative-form' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <div class="drill-prompt">
        <p class="drill-sentence">
          <template v-for="(part, i) in promptParts" :key="i">{{ part }}<span v-if="i < promptParts.length - 1" class="drill-gap">___</span></template>
        </p>
        <p class="dat-cue">Grundform: <strong>{{ currentItem?.cue }}</strong></p>
      </div>

      <form class="dat-input-row" @submit.prevent="submitted ? next() : submit()">
        <input
          ref="inputRef"
          v-model="input"
          class="input"
          type="text"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          :disabled="submitted"
          placeholder="Dativform eintippen …"
        />
        <button v-if="!submitted" class="btn btn-accent" type="submit" :disabled="!input.trim()">Prüfen</button>
      </form>

      <div v-if="submitted" class="drill-feedback">
        <span v-if="current.isCorrect" class="feedback-line correct">
          ✓ Richtig — <strong>{{ current.answers[0] }}</strong>
        </span>
        <template v-else>
          <span class="feedback-line wrong">✗ Korrekt: <strong>{{ current.answers[0] }}</strong></span>
          <p class="dat-filled">{{ filledSentence }}</p>
          <p class="dat-translation">{{ currentItem?.translation }}</p>
          <p class="dat-explain">{{ current.explanation }}</p>
        </template>
        <button ref="nextBtnRef" type="button" class="btn btn-accent drill-advance" @click="next">
          {{ index + 1 >= total ? 'Finish drill' : 'Next' }} <span aria-hidden="true">→</span>
        </button>
      </div>

      <div class="drill-hint micro-mark">
        <template v-if="!submitted">Press <span class="kbd">Enter</span> to check</template>
        <template v-else>Press <span class="kbd">Enter</span> to {{ index + 1 >= total ? 'finish' : 'continue' }}</template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dat-cue {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--mute);
  margin: 6px 0 0;
}
.dat-input-row { display: flex; gap: 10px; margin-top: 18px; }
.dat-input-row .input { flex: 1; }
.dat-filled, .dat-translation, .dat-explain {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink-soft);
  margin: 0;
}
.dat-translation { font-style: italic; }
.dat-explain { max-width: 60ch; color: var(--mute); }
.drill-result-row { grid-template-columns: 1fr 220px auto; }
@media (max-width: 720px) {
  .drill-result-row { grid-template-columns: 1fr; gap: 4px; }
}
</style>
```

- [ ] **Step 4: Verify.**

Run: `npm run typecheck`
Expected: PASS.

Manual sanity: run a T2 round at `/dative/form`; typing `meinem bruder` for *meinem Bruder* grades correct (folded case), `meinen Bruder` grades wrong and reveals the filled sentence + explanation.

- [ ] **Step 5: Commit**

```bash
git add src/modules/dative/FormSetup.vue src/modules/dative/FormRunner.vue src/router.ts
git commit -m "feat(dative): T2 Verb → Dativobjekt drill

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: T3 — Fallen-Karten (Setup + Runner + routes)

**Files:**
- Create: `src/modules/dative/TrapSetup.vue`
- Create: `src/modules/dative/TrapRunner.vue`
- Modify: `src/router.ts` (two routes)

**Interfaces:**
- Consumes: `filterTrapItems`, `buildTrapCards`, `gradeDativeAnswer`, `sampleDativeCards`; `TrapItem` extras (`english`, `cue`); run type `'dat-trap'`.
- Produces: routes `dative-trap` / `dative-trap-run`. Setup storage key `datTrapSetup`.

- [ ] **Step 1: Routes.** In `src/router.ts`, after the `dative-form-run` line, add:

```ts
  { path: '/dative/trap', name: 'dative-trap', component: () => import('./modules/dative/TrapSetup.vue') },
  { path: '/dative/trap/run', name: 'dative-trap-run', component: () => import('./modules/dative/TrapRunner.vue') },
```

- [ ] **Step 2: Create `src/modules/dative/TrapSetup.vue`.** Copy the file `src/modules/dative/CaseSetup.vue` **already in the repo** (Task 7 committed it) and change:
  - `const STORAGE_KEY = 'datTrapSetup'`
  - `import { filterTrapItems, ... }` and `filterTrapItems({ ... }).length` in `availableItems`
  - `start()` pushes `{ name: 'dative-trap-run', ... }`
  - Breadcrumb: `Kapitel XIII · Dativ · Fallen-Karten`
  - Title: `Trap cards<em>.</em>`
  - Subtitle:

```html
        <p class="section-subtitle">
          <em>I help my brother</em> — English takes a plain object, and your hand
          reaches for the accusative. The German verb refuses. Read the English,
          then type the object the dative verb wants.
        </p>
```

- [ ] **Step 3: Create `src/modules/dative/TrapRunner.vue`.** Copy the file `src/modules/dative/FormRunner.vue` **already in the repo** (Task 8 committed it) and change exactly the following — everything else stays identical:
  - Imports: `filterTrapItems`, `buildTrapCards` instead of `filterFormItems`, `buildFormCards`; `type TrapItem` instead of `type FormItem`.
  - `const items = ref<TrapItem[]>([])`
  - `rebuild()` uses `buildTrapCards(sampled)`.
  - `onMounted` pool line: `const pool = filterTrapItems({ levels: queriedLevels.value, families: queriedFamilies.value })`
  - `recordRun()` saves `type: 'dat-trap'`.
  - All four `router.push({ name: 'dative-form' })` / `{ name: 'dative-form-run' }` occurrences become `'dative-trap'`.
  - Breadcrumb in the summary: `Auswertung · Fallen-Karten`; subtitle `Trap round complete.`
  - In the **active card** template, insert the English pull line above the German sentence (inside `.drill-prompt`, first child):

```html
        <p class="dat-english">{{ currentItem?.english }}</p>
```

  - And in the summary rows, show the English above the German line:

```html
        <div class="result-verb">
          <div class="dat-english-sm">{{ items[i].english }}</div>
          <div class="german">{{ c.prompt.replace('___', '＿＿') }} <em>({{ items[i].cue }})</em></div>
        </div>
```

  - Add to the scoped styles:

```css
.dat-english {
  font-family: var(--font-body);
  font-size: 16px;
  font-style: italic;
  color: var(--ink-soft);
  margin: 0 0 10px;
}
.dat-english-sm {
  font-family: var(--font-body);
  font-size: 13px;
  font-style: italic;
  color: var(--mute);
}
```

- [ ] **Step 4: Verify.**

Run: `npm run typecheck`
Expected: PASS.

Manual sanity: `/dative/trap` — the card shows the English sentence (the pull), the German gap sentence, and the cue; a wrong answer reveals the [Core-idea explanation].

- [ ] **Step 5: Commit**

```bash
git add src/modules/dative/TrapSetup.vue src/modules/dative/TrapRunner.vue src/router.ts
git commit -m "feat(dative): T3 Fallen-Karten drill — the English pull

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Integration gates + changelog v1.19.00

**Files:**
- Modify: `tests/data/drillCatalogue.test.ts` (route-resolution assertions, now that routes exist)
- Modify: `src/data/changelog.ts` (prepend entry, bump `APP_VERSION`)

**Interfaces:**
- Consumes: everything above.
- Produces: the release gate for the phase.

- [ ] **Step 1: Route-resolution test.** Append inside the describe block of `tests/data/drillCatalogue.test.ts`:

```ts
  test('shipped Dativ drills (T1–T3) and the hub resolve against router.ts', () => {
    expect(routeNames.has('dative')).toBe(true)
    for (const code of ['T1', 'T2', 'T3']) {
      const card = datCards.find(c => c.code === code)!
      expect(routeNames.has(card.route), code).toBe(true)
      expect(routeNames.has(`${card.route}-run`), `${code} runner`).toBe(true)
    }
  })
```

- [ ] **Step 2: Run it.**

Run: `npx vitest run tests/data/drillCatalogue.test.ts`
Expected: PASS.

- [ ] **Step 3: Changelog + version.** In `src/data/changelog.ts`, set `APP_VERSION = '1.19.00'` and prepend to `CHANGELOG`:

```ts
  {
    version: '1.19.00', date: '2026-08-11', kind: 'module',
    title: 'Neues Modul · Dativ',
    notes: [
      '<strong>Kapitel XIII: der Dativ als eigenes Modul.</strong> Zehn Übungsfamilien von der Mitgliedschaftsfrage bis zum Passiv — die ersten drei Übungen sind da: <em>Dativ oder Akkusativ?</em> (jedes Dativverb im Pool, getarnt zwischen Akkusativ-Doppelgängern), <em>Verb → Dativobjekt</em> (Grundform eintippen, Dativform liefern) und die <em>Fallen-Karten</em> — <em>I help my brother</em> zieht ins Falsche, das deutsche Verb weigert sich.',
      '<strong>Das Wörter-Verzeichnis zählt mit.</strong> Jedes Dativverb und jedes Dativ-Adjektiv hat einen eigenen Eintrag: dreimal hintereinander richtig heißt <em>gesichert</em>, ein Fehler stuft zurück. Der Zähler auf der Modulseite liest den echten Bestand — kein fester Nenner, keine Verfallszeit durch anderes Üben.',
      '<strong>Falsch beantwortet? Die Karte erklärt sich.</strong> Jeder Fehler zeigt die Merkhilfe des Verbs — der verschluckte Akkusativ (<em>danken</em> = jemandem [Dank] geben), die umgekehrten Erlebnisverben (<em>die Schuhe gefallen mir</em>) oder der englische Sog. Alles offline, ohne KI-Schlüssel.'
    ]
  },
```

- [ ] **Step 4: Full gates.**

Run: `npx vitest run --testTimeout=30000`
Expected: PASS (known ThemeToggle order-dependent flake: if it is the sole failure, rerun to confirm and proceed).

Run: `npm run typecheck`
Expected: PASS.

Phone check (~390px) for the three runners and the hub — verify every control is reachable and the choice buttons / input row don't overflow.

- [ ] **Step 5: Commit**

```bash
git add tests/data/drillCatalogue.test.ts src/data/changelog.ts
git commit -m "chore: route gates for Dativ T1-T3; bump version to 1.19.00

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage (phase 2 scope):** ledger + ADR-0017 + `USER_DATA_KEYS` (Task 1), `DAT_FAMILIES` I–X + card A (Task 3), hub with derived-denominator meter + ledger + family panels (Task 6), T1/T2/T3 (Tasks 7–9), 13 history types + `DAT_TYPE_TO_CODE` (Task 2), routes/Home card XIII/breadcrumbs `Kapitel XIII · Dativ · <drill>` (Tasks 6–9), gates 2/8/9 (Task 4 tests), gate 10 (Task 1 tests). Error-handling spec points: zero-match warning (Setups), absent ledger reads all-new (Task 1), unknown-key exclusion both on write and read (Task 1), AI-unavailable concerns don't arise (T11 is phase 4).
- **Deliberate scope notes:** gate 8 is implemented for the ledger's verb half — T1's bank is *derived* from `DATIVE_VERB_KEYS` so full verb coverage is structural, and the test still guards it; the adjective half becomes reachable in phase 3 (T9) where the same test extends. `DativeResult.vue` (spec architecture, "where the shape allows") is deferred: T1–T3 use the house inline summary like every DW runner; phases 3–4 can extract it if the shapes converge. All 13 `QuizHistoryType`s and all 14 catalogue cards register now so the hub is complete and phases 3–4 only add components + routes.
- **Type consistency:** pinned names used verbatim (`LEDGER_KEY`, `ledgerState`, `bumpDativeLedger(item, correct, at)`, `readDativeLedger`, `ledgerSummary`, `DativeCard`, `sampleDativeCards<T>`, `gradeDativeAnswer`, `DAT_TYPE_TO_CODE`); masteryMap keys `dat-<code>` match `drillKey`'s `dat-${code}` output; `meta.families` matches the `QuizHistoryMeta` addition; `DativeItemLevel` flows from `dativeItems.ts` through `DativeFilter` into all three Setups/Runners.
- **Registry sweep:** union, `quiz-type-labels` (3 structures, test-enforced complete), `HistoryPage` (2 structures), `useQuizStats` (2 zero-maps), `useLevelAssessment`, `useDrillMastery`, `USER_DATA_KEYS` + `KEY_LABELS`, `NavShell`, `Home.vue` (card + I/XIII breadcrumb), `router.ts` (7 routes), `drillCatalogue` + its test.
