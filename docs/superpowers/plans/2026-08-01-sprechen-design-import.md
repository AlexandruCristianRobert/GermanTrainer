# Sprechen Design Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the whole Sprechen module onto the design project's editorial `.spr-*` system and add the three behaviours it never had — a local Redemittel matcher with lifetime yield, a Move nudge, and the Argumentation & Interaktion matrix — plus the Korrekturdrill, leaving Teil 1 as a single dead panel.

**Architecture:** A new global `src/styles/sprechen.css` owns the `.spr-*` vocabulary; two new pure composables (`useRedemittelMatch`, `useRedemittelYield`) own the matcher and its lifetime rollup; seven existing components are rewritten against the new classes and one new component (`SprechenDrill.vue`) is added. The grader gains two **optional** descriptive fields that never affect the score. No rubric change, no Dexie version bump, no Teil 1.

**Tech Stack:** Vue 3 (`<script setup lang="ts">`), vue-router, Dexie, Vitest + `@vue/test-utils`, plain CSS with the app's existing design tokens.

**Spec:** `docs/superpowers/specs/2026-08-01-sprechen-design-import-design.md` — read it before Task 1. Its twelve numbered decisions are binding and several contradict the design doc on purpose.

## Global Constraints

- **Design source:** claude.ai Design project `ff880a7a-b49d-4411-8435-65c0519723c4`. Fetch prototype files with the `DesignSync` tool (`ToolSearch` query `select:DesignSync` first — it is a deferred tool). Read methods do not prompt.
- **No new CSS tokens.** Every token the sheet uses already exists in `src/styles/tokens.css`, including `--ochre-tint`. If a port seems to need a new colour, it is a porting error.
- **No Teil 1, in any form** beyond the dead hub panel. No route, no component, no `SPRECHEN_B2_TEIL1`, no `spr1-data.js`, no Vortragsmittel, no `sprechen-teil1` history type, no `part` field on any row.
- **Four rubric criteria at 25 points each, unchanged.** `SPRECHEN_B2_TEIL2` is not edited. `structure`/`interaction` move no points.
- **German UI copy, English code comments.** The app's existing convention.
- **`noUnusedLocals` / `noUnusedParameters` are on.** Deleting markup without deleting the `ref`/`computed` behind it fails `npm run typecheck`.
- **`CONTEXT.md` terms are binding vocabulary:** Discussion, Modality, Topic, Move, Move nudge, Redemittel yield, KI-Tipp, Prädikat, Archived correction, Error archive, Correction drill, Run. Never rename these in code or UI.
- **Every AI prompt must spell out its JSON shape in prose.** The local-claude bridge drops `responseSchema`, so prose is the only schema.
- **Commit after every task.** Conventional commits, scope `sprechen`.
- **Baseline:** run `npm test` and record the pass count before Task 1. Any red test afterwards is a regression.

---

## File Structure

**Create**

| File | Responsibility |
|---|---|
| `src/styles/sprechen.css` | the ported `.spr-*` sheet, Teil 1 blocks omitted |
| `src/composables/useRedemittelMatch.ts` | pure matcher: needle building, per-run matching, per-turn Move attribution, nudge selection |
| `src/composables/useRedemittelYield.ts` | the `gt:sprechenRedemittel` lifetime rollup |
| `src/components/sprechen/SprYield.vue` | 7-Move × 6-tick yield display |
| `src/components/sprechen/SprCriterionBars.vue` | paired typed/spoken criterion bars |
| `src/modules/sprechen/SprechenDrill.vue` | Korrekturdrill runner |
| `tests/composables/useRedemittelMatch.test.ts` | matcher invariants incl. the punctuation regression |
|  `tests/composables/useRedemittelYield.test.ts` | rollup read/bump + defensive reads |
| `tests/components/SprYield.test.ts` | yield rendering |
| `tests/components/SprCriterionBars.test.ts` | paired-bar fallbacks |
| `tests/modules/SprechenDrill.test.ts` | drill grading + event/Run recording |

**Rewrite** — `SprechenHome.vue`, `Teil2Setup.vue`, `Teil2Prep.vue`, `Teil2Runner.vue`, `Teil2Result.vue`, `SprechenArchive.vue`, `SprechenCheatsheet.vue`.

**Modify** — `src/main.ts`, `src/router.ts`, `src/composables/useSprechenGrader.ts`, `src/composables/useQuizHistory.ts`, `src/composables/useUserData.ts`, `src/composables/useQuizStats.ts`, `src/composables/useLevelAssessment.ts`, `src/components/charts/quiz-type-labels.ts`, `src/modules/history/HistoryPage.vue`, `src/data/changelog.ts`, `package.json`.

---

# Phase 1 — Foundation

Nothing visible ships in this phase. It produces the stylesheet every later task depends on and the two logic modules that three later screens read.

### Task 1: Port the stylesheet

**Files:**
- Create: `src/styles/sprechen.css`
- Modify: `src/main.ts:15` (add the import after `modules.css`)

**Interfaces:**
- Produces: the `.spr-*` class vocabulary consumed by Tasks 4–16. Notably `.spr-mast`, `.spr-mast-main`, `.spr-mast-side`, `.spr-claim`, `.spr-flow`, `.spr-stage`, `.spr-crits`, `.spr-crit-row`, `.spr-crit-bar`, `.spr-crit-fill`, `.spr-pass`, `.spr-parts`, `.spr-part`, `.spr-part-h/-n/-t/-claim/-d/-stats/-go`, `.spr-rows`, `.spr-row`, `.spr-row-n/-t/-de/-d/-meta`, `.spr-yield`, `.spr-ymove`, `.spr-ticks`, `.spr-tick`, `.spr-setup`, `.spr-search-row`, `.spr-tagrow`, `.spr-tag`, `.spr-tlist`, `.spr-titem`, `.spr-flag`, `.spr-card`, `.spr-fld`, `.spr-prep-mast`, `.spr-timer`, `.spr-angles`, `.spr-acol`, `.spr-angle`, `.spr-wordstrip`, `.spr-notes`, `.spr-run`, `.spr-rail`, `.spr-steps`, `.spr-step`, `.spr-used`, `.spr-proto`, `.spr-turn`, `.spr-nudge`, `.spr-drawer`, `.spr-dtab`, `.spr-move`, `.spr-phrases`, `.spr-was`, `.spr-kitipp`, `.spr-composer`, `.spr-count`, `.spr-verdict`, `.spr-vscore`, `.spr-stamp`, `.spr-vgrid`, `.spr-vcrit*`, `.spr-block`, `.spr-matrix`, `.spr-mx-*`, `.spr-rate*`, `.spr-mistake`, `.spr-mkcard`, `.spr-mk-*`, `.spr-counts`, `.spr-sw`, `.spr-overall`, `.spr-kinds`, `.spr-kind`, `.spr-arow`, `.spr-remed*`, plus the new `.spr-part.dead`.

- [ ] **Step 1: Fetch the source sheet**

```
ToolSearch: select:DesignSync
DesignSync: { method: "get_file", projectId: "ff880a7a-b49d-4411-8435-65c0519723c4", path: "styles-sprechen.css" }
```

- [ ] **Step 2: Write `src/styles/sprechen.css` — the whole sheet verbatim EXCEPT the omissions below**

Omit these Teil 1 selector blocks entirely (they are grouped under the comments `/* ── Teil 1: the two task sheets ── */`, `/* ── Teil 1: Gliederung planner ── */` and `/* ── Teil 1: section masthead, time bar, coverage ── */`):

```
.spr-ab            .spr-sheet          .spr-sheet-h        .spr-sheet-letter
.spr-sheet-flags   .spr-sheet-t        .spr-sheet-task     .spr-sheet-glied
.spr-sheet-f       .spr-sheet-pick     .spr-ab-ctl
.spr-plan          .spr-plan-row       .spr-plan-n         .spr-plan-t
.spr-plan-h        .spr-plan-w         .spr-plan-in
.spr-secmast       .spr-secmast-t      .spr-secmast-h      .spr-secmast-r
.spr-secmast-plan  .spr-step-btn       .spr-step-t         .spr-timebar
.spr-timebar-l     .spr-move.fit       .spr-cov            .spr-cov-row
.spr-cov-t         .spr-cov-bar        .spr-cov-w          .spr-cov-n
```

**Keep `.spr-remed`, `.spr-remed-ctx`, `.spr-remed-in`** — that is the Korrekturdrill, which is in scope.

The source has **two** `@media (max-width:1080px)` blocks. The first mixes Teil 1 rules with `.spr-parts` / `.spr-part`, which are needed. Replace that first block with exactly:

```css
@media (max-width:1080px){
  .spr-parts{grid-template-columns:minmax(0,1fr);gap:0}
  .spr-part{border-right:0;padding-right:0}
  .spr-part:last-child{padding-left:0}
}
```

Keep the second `@media (max-width:1080px)` block and the `@media (max-width:720px)` block unchanged.

- [ ] **Step 3: Append the dead-panel modifier**

The sheet has no state for a non-interactive part panel. Add at the end of the `/* ── Hub: the two exam parts ── */` section:

```css
/* Teil 1 is not built yet — the panel renders for composition but must not
   look or behave clickable (see spec decision 3). */
.spr-part.dead{cursor:default}
.spr-part.dead:hover{background:transparent}
.spr-part.dead:hover::before{transform:scaleY(0)}
.spr-part.dead .spr-part-t,.spr-part.dead .spr-part-claim,.spr-part.dead .spr-part-d{color:var(--mute)}
.spr-part.dead .spr-part-n{color:var(--mute)}
.spr-part-soon{margin-top:18px;display:inline-block;padding:3px 10px 2px;background:var(--ochre-tint);color:var(--ochre);font-family:var(--font-mono);font-size:9.5px;letter-spacing:.2em;text-transform:uppercase}
```

- [ ] **Step 4: Import it**

In `src/main.ts`, directly after the `modules.css` import:

```ts
import './styles/modules.css'
import './styles/sprechen.css'
```

Order matters: `.spr-*` must be able to override the shared drill vocabulary.

- [ ] **Step 5: Verify nothing regressed**

Run: `npm run typecheck && npm test`
Expected: typecheck clean, test count equal to the recorded baseline. A stylesheet import cannot change behaviour; a diff here means something else was touched.

- [ ] **Step 6: Commit**

```bash
git add src/styles/sprechen.css src/main.ts
git commit -m "feat(sprechen): port the .spr-* editorial stylesheet"
```

---

### Task 2: The Redemittel matcher

**Files:**
- Create: `src/composables/useRedemittelMatch.ts`
- Test: `tests/composables/useRedemittelMatch.test.ts`

**Interfaces:**
- Consumes: `SPRECHEN_REDEMITTEL`, `MOVES`, `HINT_MOVES`, `Move`, `Redemittel` from `src/data/sprechenRedemittel.ts`.
- Produces:
  ```ts
  export function redemittelNeedle(phraseDe: string): string
  export function matchRedemittel(learnerTexts: readonly string[]): Redemittel[]
  export function movesUsed(used: readonly Redemittel[]): Partial<Record<Move, number>>
  export function movePerTurn(learnerTexts: readonly string[]): (Move | null)[]
  export function pickMoveNudge(
    learnerTexts: readonly string[],
    lifetime: Readonly<Record<string, number>>
  ): Move | null
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/composables/useRedemittelMatch.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  redemittelNeedle, matchRedemittel, movesUsed, movePerTurn, pickMoveNudge
} from '../../src/composables/useRedemittelMatch'
import { SPRECHEN_REDEMITTEL } from '../../src/data/sprechenRedemittel'

describe('redemittelNeedle', () => {
  it('strips every punctuation mark, not just sentence enders', () => {
    // The design prototype stripped only . ? ! … and kept commas, which made
    // 10 of 42 phrases unmatchable against speech-recognizer output.
    expect(redemittelNeedle('Ich bin der Ansicht, dass …')).toBe('ich bin der ansicht dass')
    expect(redemittelNeedle('Das mag sein, trotzdem …')).toBe('das mag sein trotzdem')
  })

  it('collapses inner whitespace', () => {
    expect(redemittelNeedle('Aus   meiner  Sicht …')).toBe('aus meiner sicht')
  })

  it('caps the needle at 24 characters', () => {
    expect(redemittelNeedle('Bis zu einem gewissen Grad stimme ich zu, jedoch …').length).toBe(24)
  })

  it('never produces a needle shorter than 12 chars for any shipped phrase', () => {
    for (const r of SPRECHEN_REDEMITTEL) {
      expect(redemittelNeedle(r.phraseDe).length).toBeGreaterThanOrEqual(12)
    }
  })

  it('produces 42 distinct needles — no phrase can shadow another', () => {
    const needles = SPRECHEN_REDEMITTEL.map(r => redemittelNeedle(r.phraseDe))
    expect(needles.length).toBe(42)
    expect(new Set(needles).size).toBe(42)
  })

  it('no needle is a substring of another needle', () => {
    const needles = SPRECHEN_REDEMITTEL.map(r => redemittelNeedle(r.phraseDe))
    const overlaps: string[] = []
    for (const a of needles) {
      for (const b of needles) {
        if (a !== b && b.includes(a)) overlaps.push(`${a} ⊂ ${b}`)
      }
    }
    expect(overlaps).toEqual([])
  })
})

describe('matchRedemittel', () => {
  it('matches a phrase written with its comma', () => {
    const hits = matchRedemittel(['Ich bin der Ansicht, dass wir handeln müssen.'])
    expect(hits.map(h => h.id)).toContain('rm-opinion-2')
  })

  it('matches the same phrase with no comma at all — the spoken case', () => {
    const hits = matchRedemittel(['ich bin der ansicht dass wir handeln müssen'])
    expect(hits.map(h => h.id)).toContain('rm-opinion-2')
  })

  it('matches all ten comma-carrying phrases from comma-free speech text', () => {
    const commaPhrases = [
      'rm-opinion-2', 'rm-opinion-3', 'rm-opinion-5', 'rm-opinion-6',
      'rm-partial-2', 'rm-partial-3', 'rm-partial-4', 'rm-ask-4',
      'rm-summarize-2', 'rm-summarize-3'
    ]
    for (const id of commaPhrases) {
      const phrase = SPRECHEN_REDEMITTEL.find(r => r.id === id)!
      const spoken = phrase.phraseDe.replace(/[.,;:!?…]/g, '').toLowerCase()
      expect(matchRedemittel([spoken]).map(h => h.id), id).toContain(id)
    }
  })

  it('does not bleed across turn boundaries', () => {
    // A needle must not be assembled from the tail of one turn and the head of
    // the next, so turns are joined with a separator that cannot occur in one.
    const hits = matchRedemittel(['Aus meiner', 'Sicht ist das falsch.'])
    expect(hits.map(h => h.id)).not.toContain('rm-opinion-4')
  })

  it('returns an empty array for text containing no Redemittel', () => {
    expect(matchRedemittel(['Das Wetter ist heute schön.'])).toEqual([])
  })
})

describe('movesUsed', () => {
  it('counts hits per Move', () => {
    const used = matchRedemittel([
      'Aus meiner Sicht ist das falsch.',
      'Meiner Meinung nach stimmt das nicht.',
      'Wie sehen Sie das?'
    ])
    const counts = movesUsed(used)
    expect(counts.opinion).toBe(2)
    expect(counts.ask).toBe(1)
    expect(counts.agree).toBeUndefined()
  })
})

describe('movePerTurn', () => {
  it('labels each turn with the Move it used', () => {
    expect(movePerTurn([
      'Aus meiner Sicht ist das falsch.',
      'Wie sehen Sie das?'
    ])).toEqual(['opinion', 'ask'])
  })

  it('returns null for a turn that used no Redemittel', () => {
    expect(movePerTurn(['Das Wetter ist heute schön.'])).toEqual([null])
  })

  it('breaks a tie by HINT_MOVES order, not array order of the data', () => {
    // One agree hit and one ask hit in the same turn: 'agree' precedes 'ask'
    // in HINT_MOVES, so it wins.
    expect(movePerTurn(['Das sehe ich genauso. Wie sehen Sie das?'])).toEqual(['agree'])
  })

  it('prefers the Move with more hits over HINT_MOVES order', () => {
    // Two ask hits beat one agree hit even though agree sorts first.
    expect(movePerTurn([
      'Das sehe ich genauso. Wie sehen Sie das? Was halten Sie davon?'
    ])).toEqual(['ask'])
  })
})

describe('pickMoveNudge', () => {
  it('never nudges toward a Move already used this run', () => {
    const nudge = pickMoveNudge(['Das sehe ich genauso.'], {})
    expect(nudge).not.toBe('agree')
  })

  it('prefers the least-used Move by lifetime count', () => {
    // Everything unused this run; 'ask' has the lowest lifetime total.
    const lifetime = {
      'rm-agree-1': 9, 'rm-disagree-1': 7, 'rm-partial-1': 5,
      'rm-ask-1': 1, 'rm-example-1': 4, 'rm-summarize-1': 3
    }
    expect(pickMoveNudge([], lifetime)).toBe('ask')
  })

  it('falls back to HINT_MOVES order when lifetime counts tie', () => {
    expect(pickMoveNudge([], {})).toBe('agree')
  })

  it('returns null when every hint Move has been used this run', () => {
    const allSix = [
      'Das sehe ich genauso.',
      'Da bin ich anderer Meinung.',
      'Das mag sein, trotzdem …',
      'Wie sehen Sie das?',
      'Ein gutes Beispiel dafür ist …',
      'Insgesamt denke ich, dass …'
    ]
    expect(pickMoveNudge(allSix, {})).toBeNull()
  })

  it('ignores the opinion Move — it is not offered by the hint panel', () => {
    const lifetime = { 'rm-opinion-1': 0, 'rm-agree-1': 99 }
    expect(pickMoveNudge([], lifetime)).not.toBe('opinion')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/composables/useRedemittelMatch.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/composables/useRedemittelMatch"`.

- [ ] **Step 3: Write the implementation**

Create `src/composables/useRedemittelMatch.ts`:

```ts
//
// Local Redemittel matcher — see CONTEXT.md → "Redemittel yield".
// Pure module, no Vue import, NEVER a network call: the yield is counted
// locally by text matching and must never cost an AI call.
//
// Divergence from the design prototype's `sprNeedle`, deliberate: it stripped
// only `… ? ! .` and kept commas, so 10 of the 42 needles carried a comma
// inside their first 24 characters ("ich bin der ansicht, das"). Chrome's
// speech recognizer emits no commas, which made 24% of the Redemittel
// unmatchable in a spoken Discussion. We strip ALL punctuation. Verified safe:
// the 42 needles stay distinct and none is a substring of another
// (locked by tests/composables/useRedemittelMatch.test.ts).

import {
  SPRECHEN_REDEMITTEL, HINT_MOVES, type Move, type Redemittel
} from '../data/sprechenRedemittel'

const NEEDLE_MAX = 24

/** A separator that cannot occur inside one turn, so needles never span turns. */
const TURN_SEP = ' ¶ '

function normalize(s: string): string {
  return s
    .replace(/[.,;:!?…]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function redemittelNeedle(phraseDe: string): string {
  return normalize(phraseDe).slice(0, NEEDLE_MAX)
}

/** Which of the 42 Redemittel the learner's turns actually contained. */
export function matchRedemittel(learnerTexts: readonly string[]): Redemittel[] {
  const hay = learnerTexts.map(normalize).join(TURN_SEP)
  if (hay.length === 0) return []
  return SPRECHEN_REDEMITTEL.filter(r => hay.includes(redemittelNeedle(r.phraseDe)))
}

export function movesUsed(used: readonly Redemittel[]): Partial<Record<Move, number>> {
  const counts: Partial<Record<Move, number>> = {}
  for (const r of used) counts[r.move] = (counts[r.move] ?? 0) + 1
  return counts
}

/**
 * The Move each learner turn reached for, for the runner rail's L1–Ln stepper.
 * Most hits wins; ties resolve by HINT_MOVES order (the panel's display order),
 * NOT by the order phrases happen to sit in the data. A turn that matched
 * nothing is null — the rail renders an em dash for it, never a blank.
 */
export function movePerTurn(learnerTexts: readonly string[]): (Move | null)[] {
  return learnerTexts.map(text => {
    const counts = movesUsed(matchRedemittel([text]))
    let best: Move | null = null
    let bestN = 0
    for (const m of HINT_MOVES) {
      const n = counts[m] ?? 0
      if (n > bestN) { best = m; bestN = n }
    }
    // A turn may use only the cheatsheet-only 'opinion' Move, which HINT_MOVES
    // excludes; fall back to it rather than reporting nothing.
    if (best === null && (counts.opinion ?? 0) > 0) return 'opinion'
    return best
  })
}

/**
 * The Move nudge (CONTEXT.md → "Move nudge"): a Move not used in THIS
 * Discussion, preferring the one the learner's LIFETIME yield shows they reach
 * for least. Satisfies both readings — actionable now, informed by history.
 * Never includes 'opinion': the hint panel does not offer it.
 */
export function pickMoveNudge(
  learnerTexts: readonly string[],
  lifetime: Readonly<Record<string, number>>
): Move | null {
  const usedThisRun = movesUsed(matchRedemittel(learnerTexts))
  const candidates = HINT_MOVES.filter(m => (usedThisRun[m] ?? 0) === 0)
  if (candidates.length === 0) return null

  const lifetimeFor = (m: Move): number =>
    SPRECHEN_REDEMITTEL
      .filter(r => r.move === m)
      .reduce((sum, r) => sum + (lifetime[r.id] ?? 0), 0)

  // HINT_MOVES order is the tie-break, so a strict `<` keeps the first-listed
  // candidate when totals are equal.
  let best = candidates[0]
  let bestN = lifetimeFor(best)
  for (const m of candidates.slice(1)) {
    const n = lifetimeFor(m)
    if (n < bestN) { best = m; bestN = n }
  }
  return best
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/composables/useRedemittelMatch.test.ts`
Expected: PASS, all cases.

If `no needle is a substring of another needle` fails, do **not** relax the assertion — it guards the matcher against silent double-counting. Raise `NEEDLE_MAX` until it passes and update the 24-char test.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useRedemittelMatch.ts tests/composables/useRedemittelMatch.test.ts
git commit -m "feat(sprechen): local Redemittel matcher with full punctuation folding"
```

---

### Task 3: The lifetime yield rollup

**Files:**
- Create: `src/composables/useRedemittelYield.ts`
- Modify: `src/composables/useUserData.ts:22` (`USER_DATA_KEYS`)
- Test: `tests/composables/useRedemittelYield.test.ts`

**Interfaces:**
- Consumes: nothing. Deliberately **not** `matchRedemittel` (the rollup stores ids already matched elsewhere) and deliberately **not** `loadHistory()` — unlike ADR-0011's `gt:drillTotals`, this rollup **cannot** be seeded from existing history: historical Runs carry no `meta.sprechenRedemittel` (Task 11 is the first writer) and their transcripts are already deleted, so there is nothing to back-fill from. An absent key reading as zero is the whole migration.
- Produces:
  ```ts
  export const REDEMITTEL_YIELD_KEY = 'gt:sprechenRedemittel'
  export interface RedemittelUse { count: number; lastAt: number }
  export function loadRedemittelYield(): Record<string, RedemittelUse>
  export function bumpRedemittelYield(ids: readonly string[], at: number): void
  export function lifetimeCounts(): Record<string, number>
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/composables/useRedemittelYield.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  REDEMITTEL_YIELD_KEY, loadRedemittelYield, bumpRedemittelYield, lifetimeCounts
} from '../../src/composables/useRedemittelYield'

beforeEach(() => localStorage.clear())

describe('loadRedemittelYield', () => {
  it('reads an absent key as an empty record', () => {
    expect(loadRedemittelYield()).toEqual({})
  })

  it('survives corrupt JSON without throwing', () => {
    localStorage.setItem(REDEMITTEL_YIELD_KEY, '{not json')
    expect(loadRedemittelYield()).toEqual({})
  })

  it('discards entries that are not shaped like a RedemittelUse', () => {
    localStorage.setItem(REDEMITTEL_YIELD_KEY, JSON.stringify({
      'rm-agree-1': { count: 3, lastAt: 1000 },
      'rm-agree-2': 'nope',
      'rm-agree-3': { count: 'x', lastAt: 1 }
    }))
    expect(loadRedemittelYield()).toEqual({ 'rm-agree-1': { count: 3, lastAt: 1000 } })
  })
})

describe('bumpRedemittelYield', () => {
  it('creates an entry on first use', () => {
    bumpRedemittelYield(['rm-agree-1'], 5000)
    expect(loadRedemittelYield()).toEqual({ 'rm-agree-1': { count: 1, lastAt: 5000 } })
  })

  it('increments an existing entry and moves lastAt forward', () => {
    bumpRedemittelYield(['rm-agree-1'], 5000)
    bumpRedemittelYield(['rm-agree-1'], 9000)
    expect(loadRedemittelYield()['rm-agree-1']).toEqual({ count: 2, lastAt: 9000 })
  })

  it('counts a phrase once per call even if passed twice', () => {
    bumpRedemittelYield(['rm-agree-1', 'rm-agree-1'], 5000)
    expect(loadRedemittelYield()['rm-agree-1'].count).toBe(1)
  })

  it('does not move lastAt backwards', () => {
    bumpRedemittelYield(['rm-agree-1'], 9000)
    bumpRedemittelYield(['rm-agree-1'], 5000)
    expect(loadRedemittelYield()['rm-agree-1']).toEqual({ count: 2, lastAt: 9000 })
  })

  it('is a no-op for an empty id list', () => {
    bumpRedemittelYield([], 5000)
    expect(localStorage.getItem(REDEMITTEL_YIELD_KEY)).toBeNull()
  })
})

describe('lifetimeCounts', () => {
  it('flattens the rollup to id → count', () => {
    bumpRedemittelYield(['rm-agree-1', 'rm-ask-1'], 5000)
    bumpRedemittelYield(['rm-agree-1'], 6000)
    expect(lifetimeCounts()).toEqual({ 'rm-agree-1': 2, 'rm-ask-1': 1 })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/composables/useRedemittelYield.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/composables/useRedemittelYield.ts`:

```ts
//
// Lifetime Redemittel yield — see CONTEXT.md → "Redemittel yield".
//
// WHY A SEPARATE STORE AND NOT A HISTORY DERIVATION: a graded Discussion is
// deleted once its Run is recorded (CONTEXT.md → "Discussion"), so the text the
// yield was counted from no longer exists and can never be re-counted. And
// HISTORY_LIMIT caps gt:quizHistory at 100 runs APP-WIDE across every quiz
// type, so a "have I ever used this phrase" figure derived from that window
// un-fills itself when the learner drills nouns for a week.
//
// Same shape and same reasoning as gt:drillTotals — see ADR-0011.

export const REDEMITTEL_YIELD_KEY = 'gt:sprechenRedemittel'

export interface RedemittelUse {
  count: number
  lastAt: number
}

function isUse(v: unknown): v is RedemittelUse {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  return typeof r.count === 'number' && typeof r.lastAt === 'number'
}

export function loadRedemittelYield(): Record<string, RedemittelUse> {
  const raw = localStorage.getItem(REDEMITTEL_YIELD_KEY)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Record<string, RedemittelUse> = {}
    for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (isUse(v)) out[id] = { count: v.count, lastAt: v.lastAt }
    }
    return out
  } catch {
    return {}
  }
}

/**
 * Bank one Discussion's matched Redemittel. Called from the grade pipeline,
 * NOT from the runner — a phrase used in an abandoned Discussion never counted.
 * Deliberately non-fatal: a failed write costs a tick on a meter, and must
 * never break grading.
 */
export function bumpRedemittelYield(ids: readonly string[], at: number): void {
  const unique = Array.from(new Set(ids))
  if (unique.length === 0) return
  try {
    const store = loadRedemittelYield()
    for (const id of unique) {
      const prev = store[id]
      store[id] = {
        count: (prev?.count ?? 0) + 1,
        lastAt: Math.max(prev?.lastAt ?? 0, at)
      }
    }
    localStorage.setItem(REDEMITTEL_YIELD_KEY, JSON.stringify(store))
  } catch {
    // Quota or private-mode failure — silently skipped.
  }
}

export function lifetimeCounts(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [id, use] of Object.entries(loadRedemittelYield())) out[id] = use.count
  return out
}
```

- [ ] **Step 4: Add the key to backup/restore**

In `src/composables/useUserData.ts`, add `'gt:sprechenRedemittel'` to the `USER_DATA_KEYS` array, keeping the file's existing ordering convention. Read the surrounding entries first and match their comment style.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/composables/useRedemittelYield.test.ts && npm run typecheck`
Expected: PASS, typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useRedemittelYield.ts src/composables/useUserData.ts tests/composables/useRedemittelYield.test.ts
git commit -m "feat(sprechen): lifetime Redemittel yield rollup (cf. ADR-0011)"
```

---

# Phase 2 — Shared components and the hub

### Task 4: `SprYield.vue` and `SprCriterionBars.vue`

**Files:**
- Create: `src/components/sprechen/SprYield.vue`
- Create: `src/components/sprechen/SprCriterionBars.vue`
- Test: `tests/components/SprYield.test.ts`, `tests/components/SprCriterionBars.test.ts`

**Interfaces:**
- Consumes: `MOVES`, `MOVE_LABEL`, `SPRECHEN_REDEMITTEL` from `src/data/sprechenRedemittel.ts`; `SPRECHEN_B2_TEIL2` from `src/data/rubrics.ts`; `.spr-yield` / `.spr-crits` classes from Task 1.
- Produces:
  - `SprYield` props: `usedIds: string[]`, `note?: string`
  - `SprCriterionBars` props: `typed?: CriterionScore[] | null`, `spoken?: CriterionScore[] | null`, where `CriterionScore = { key: string; score: number; maxPoints: number }`

- [ ] **Step 1: Write the failing tests**

Create `tests/components/SprYield.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SprYield from '../../src/components/sprechen/SprYield.vue'

describe('SprYield', () => {
  it('renders one column per Move and six ticks each', () => {
    const w = mount(SprYield, { props: { usedIds: [] } })
    expect(w.findAll('.spr-ymove')).toHaveLength(7)
    expect(w.findAll('.spr-tick')).toHaveLength(42)
  })

  it('fills only the ticks whose phrase was used', () => {
    const w = mount(SprYield, { props: { usedIds: ['rm-agree-1', 'rm-agree-2'] } })
    expect(w.findAll('.spr-tick.on')).toHaveLength(2)
  })

  it('shows hit/total per Move', () => {
    const w = mount(SprYield, { props: { usedIds: ['rm-agree-1'] } })
    expect(w.text()).toContain('1/6')
  })

  it('shows the cold note under a Move with zero hits', () => {
    const w = mount(SprYield, { props: { usedIds: [], note: 'Noch nie benutzt.' } })
    expect(w.findAll('.spr-ymove-cold')).toHaveLength(7)
    expect(w.text()).toContain('Noch nie benutzt.')
  })

  it('omits the cold note for a Move that has hits', () => {
    const w = mount(SprYield, { props: { usedIds: ['rm-agree-1'] } })
    expect(w.findAll('.spr-ymove-cold')).toHaveLength(6)
  })
})
```

Create `tests/components/SprCriterionBars.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SprCriterionBars from '../../src/components/sprechen/SprCriterionBars.vue'
import { SPRECHEN_B2_TEIL2 } from '../../src/data/rubrics'

const four = (n: number) => [
  { key: 'erfuellung', score: n, maxPoints: 25 },
  { key: 'kohaerenz', score: n, maxPoints: 25 },
  { key: 'wortschatz', score: n, maxPoints: 25 },
  { key: 'strukturen', score: n, maxPoints: 25 }
]

describe('SprCriterionBars', () => {
  it('renders empty bars against the rubric maxima when there are no runs', () => {
    const w = mount(SprCriterionBars, { props: { typed: null, spoken: null } })
    expect(w.findAll('.spr-crit-row')).toHaveLength(4)
    expect(w.text()).toContain('Erfüllung / Interaktion')
    expect(w.text()).toContain('—/25')
    expect(w.findAll('.spr-crit-fill')).toHaveLength(0)
  })

  it('renders one bar per criterion when only typed has runs', () => {
    const w = mount(SprCriterionBars, { props: { typed: four(20), spoken: null } })
    expect(w.findAll('.spr-crit-fill')).toHaveLength(4)
    expect(w.text()).toContain('20/25')
  })

  it('renders one FILLED bar per criterion when only spoken has runs', () => {
    // Regression: gating the first bar's fill on `typed` alone showed a
    // spoken-only learner correct numbers over a completely blank track.
    const w = mount(SprCriterionBars, { props: { typed: null, spoken: four(14) } })
    expect(w.findAll('.spr-crit-fill')).toHaveLength(4)
    expect(w.text()).toContain('14/25')
  })

  it('renders paired bars when both Modalities have runs', () => {
    const w = mount(SprCriterionBars, { props: { typed: four(20), spoken: four(14) } })
    expect(w.findAll('.spr-crit-fill')).toHaveLength(8)
  })

  it('prints BOTH scores in the paired case, not just the typed one', () => {
    const w = mount(SprCriterionBars, { props: { typed: four(20), spoken: four(14) } })
    expect(w.find('.spr-crit-max').text()).toBe('20·14')
    expect(w.find('.spr-crit-max').attributes('title')).toBe('getippt · gesprochen')
  })

  it('shows the spoken delta only when both Modalities have runs', () => {
    const both = mount(SprCriterionBars, { props: { typed: four(20), spoken: four(14) } })
    expect(both.text()).toContain('−24')   // 56 spoken − 80 typed
    const one = mount(SprCriterionBars, { props: { typed: four(20), spoken: null } })
    expect(one.text()).not.toContain('Δ')
  })

  it('reads the pass mark and total from the rubric rather than hardcoding them', () => {
    const w = mount(SprCriterionBars, { props: { typed: null, spoken: null } })
    // Assert against the rubric's OWN values, so changing rubrics.ts without
    // changing the component breaks this test instead of going stale silently.
    expect(w.find('.spr-pass').text()).toContain(String(SPRECHEN_B2_TEIL2.passingScore))
    expect(w.find('.spr-pass').text()).toContain(String(SPRECHEN_B2_TEIL2.totalMax))
    expect(w.find('.spr-pass').text()).toContain(`${SPRECHEN_B2_TEIL2.criteria.length} Kriterien`)
  })

  it('reads +/-0 as ±0 on an exact tie rather than as a negative', () => {
    const w = mount(SprCriterionBars, { props: { typed: four(20), spoken: four(20) } })
    expect(w.text()).toContain('±0')
    expect(w.text()).not.toContain('−0')
  })

  it('signs a positive delta when spoken beats typed', () => {
    const w = mount(SprCriterionBars, { props: { typed: four(14), spoken: four(20) } })
    expect(w.text()).toContain('+24')
  })

  it('tolerates a criterion the rubric does not know', () => {
    const w = mount(SprCriterionBars, {
      props: { typed: [...four(20), { key: 'ghost', score: 9, maxPoints: 9 }], spoken: null }
    })
    expect(w.findAll('.spr-crit-row')).toHaveLength(4)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components/SprYield.test.ts tests/components/SprCriterionBars.test.ts`
Expected: FAIL — both modules not found.

- [ ] **Step 3: Write `SprYield.vue`**

```vue
<script setup lang="ts">
// Redemittel yield display (CONTEXT.md → "Redemittel yield"). Used at three
// scopes with the same markup: the hub's lifetime figure, the runner rail's
// live figure, and the Auswertung's per-Discussion figure.
import { computed } from 'vue'
import { MOVES, MOVE_LABEL, SPRECHEN_REDEMITTEL, type Move } from '../../data/sprechenRedemittel'

const props = defineProps<{ usedIds: string[]; note?: string }>()

const columns = computed(() =>
  MOVES.map((m: Move) => {
    const phrases = SPRECHEN_REDEMITTEL.filter(r => r.move === m)
    return {
      move: m,
      labelDe: MOVE_LABEL[m].de,
      phrases: phrases.map(p => ({ ...p, on: props.usedIds.includes(p.id) })),
      hit: phrases.filter(p => props.usedIds.includes(p.id)).length,
      total: phrases.length
    }
  })
)
</script>

<template>
  <div class="spr-yield">
    <div v-for="c in columns" :key="c.move" class="spr-ymove">
      <div class="spr-ymove-h">
        <span class="spr-ymove-t">{{ c.labelDe }}</span>
        <span class="spr-ymove-n spr-num">{{ c.hit }}/{{ c.total }}</span>
      </div>
      <div class="spr-ticks">
        <span v-for="p in c.phrases" :key="p.id" class="spr-tick" :class="{ on: p.on }"
          :title="p.phraseDe" />
      </div>
      <p v-if="c.hit === 0" class="spr-ymove-cold">{{ note ?? 'Nie benutzt.' }}</p>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Write `SprCriterionBars.vue`**

```vue
<script setup lang="ts">
// Paired typed/spoken criterion bars. The design showed a single bar set for
// "the last run"; CONTEXT.md → Modality says the point of one shared rubric is
// that "how much worse am I when I have to speak?" is answerable, so both
// Modalities are shown side by side. LATEST per Modality, not best or mean.
import { computed } from 'vue'
import { SPRECHEN_B2_TEIL2 } from '../../data/rubrics'

export interface CriterionScore { key: string; score: number; maxPoints: number }

const props = defineProps<{
  typed?: CriterionScore[] | null
  spoken?: CriterionScore[] | null
}>()

const both = computed(() => !!props.typed?.length && !!props.spoken?.length)

// The rubric drives the rows, not the data — so a run recorded before a
// rubric change, or a hallucinated extra criterion, cannot add a row.
const rows = computed(() =>
  SPRECHEN_B2_TEIL2.criteria.map(def => {
    const typed = props.typed?.find(c => c.key === def.key) ?? null
    const spoken = props.spoken?.find(c => c.key === def.key) ?? null
    return {
      key: def.key,
      labelDe: def.labelDe,
      descriptorDe: def.descriptorDe,
      maxPoints: def.maxPoints,
      typed,
      spoken,
      // Whichever Modality the learner HAS is the primary bar. Gating the
      // first bar on `typed` alone would show a spoken-only learner correct
      // numbers over a blank track.
      primary: typed ?? spoken,
      secondary: typed && spoken ? spoken : null
    }
  })
)

const sum = (cs?: CriterionScore[] | null) => (cs ?? []).reduce((s, c) => s + c.score, 0)
const delta = computed(() => sum(props.spoken) - sum(props.typed))
const deltaLabel = computed(() =>
  delta.value === 0 ? '±0' : delta.value > 0 ? `+${delta.value}` : `−${Math.abs(delta.value)}`
)

function pct(c: CriterionScore | null, max: number): string {
  return c ? `${Math.max(0, Math.min(100, (c.score / max) * 100))}%` : '0%'
}
</script>

<template>
  <div>
    <div class="spr-crits">
      <div v-for="r in rows" :key="r.key" class="spr-crit-row">
        <div class="spr-crit-name" :title="r.descriptorDe">{{ r.labelDe }}</div>
        <div class="spr-crit-max spr-num" :title="r.secondary ? 'getippt · gesprochen' : undefined">
          <template v-if="r.secondary">{{ r.typed!.score }}·{{ r.secondary.score }}</template>
          <template v-else-if="r.primary">{{ r.primary.score }}/{{ r.maxPoints }}</template>
          <template v-else>—/{{ r.maxPoints }}</template>
        </div>
        <div class="spr-crit-bar">
          <span v-if="r.primary" class="spr-crit-fill" :style="{ width: pct(r.primary, r.maxPoints) }" />
        </div>
        <div v-if="r.secondary" class="spr-crit-bar">
          <span class="spr-crit-fill" :style="{ width: pct(r.secondary, r.maxPoints) }" />
        </div>
      </div>
    </div>
    <p class="spr-pass">
      {{ rows.length }} Kriterien, zusammen {{ SPRECHEN_B2_TEIL2.totalMax }} Punkte ·
      Bestehensgrenze <b>{{ SPRECHEN_B2_TEIL2.passingScore }}</b>.
      <template v-if="both">
        Getippt und gesprochen teilen dieselbe Skala —
        <b>Δ gesprochen {{ deltaLabel }}</b>.
      </template>
      <template v-else>
        Getippt und gesprochen teilen dieselbe Skala, damit die Werte vergleichbar bleiben.
      </template>
    </p>
  </div>
</template>
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/components/SprYield.test.ts tests/components/SprCriterionBars.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/sprechen tests/components/SprYield.test.ts tests/components/SprCriterionBars.test.ts
git commit -m "feat(sprechen): SprYield and paired SprCriterionBars components"
```

---

### Task 5: Rebuild `SprechenHome.vue`

**Files:**
- Rewrite: `src/modules/sprechen/SprechenHome.vue`
- Test: `tests/modules/SprechenHome.test.ts` (new)

**Interfaces:**
- Consumes: Task 1's `.spr-mast` / `.spr-parts` / `.spr-rows` / `.spr-block` classes and `.spr-part.dead` / `.spr-part-soon`; Task 3's `lifetimeCounts()`; Task 4's `SprYield` + `SprCriterionBars`; `loadHistory()`; `countsByKind()` + `openCorrections()` from `useSprechenArchive.ts`.
- Produces: nothing consumed downstream.

Four bands in this order — masthead, part panels, shared rows, Ausbeute + run list. Delete `.sprechen-grid`, `.recent-runs*` and the whole existing scoped `<style>` block.

- [ ] **Step 1: Fetch the prototype for reference**

```
DesignSync: { method: "get_file", projectId: "ff880a7a-b49d-4411-8435-65c0519723c4", path: "sprechen.jsx" }
```

Read `SprHub`. Port its **markup and copy**; ignore its data (it reads demo constants) and ignore everything Teil-1 — `SPR1_*`, `Spr1Yield`, the `yieldPart` toggle, and the Teil 1 entries in `recents`.

- [ ] **Step 2: Write the failing test**

Create `tests/modules/SprechenHome.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../../src/composables/useSprechenArchive', () => ({
  countsByKind: vi.fn(async () => ({
    grammar: 2, 'word-order': 1, vocabulary: 0, spelling: 0, register: 0
  })),
  openCorrections: vi.fn(async () => [{ id: 'a' }, { id: 'b' }])
}))

import SprechenHome from '../../src/modules/sprechen/SprechenHome.vue'

const push = vi.fn()
const stubs = { RouterLink: true }
const global = { stubs, mocks: { $router: { push } } }

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

beforeEach(() => { localStorage.clear(); push.mockClear() })

describe('SprechenHome', () => {
  it('renders exactly two part panels', () => {
    const w = mount(SprechenHome, { global })
    expect(w.findAll('.spr-part')).toHaveLength(2)
  })

  it('marks the Teil 1 panel dead and non-interactive', () => {
    const w = mount(SprechenHome, { global })
    const teil1 = w.findAll('.spr-part')[0]
    expect(teil1.classes()).toContain('dead')
    expect(teil1.attributes('disabled')).toBeDefined()
    expect(teil1.text()).toContain('In Vorbereitung')
    expect(teil1.find('.spr-part-go').exists()).toBe(false)
  })

  it('does not navigate when the Teil 1 panel is clicked', async () => {
    const w = mount(SprechenHome, { global })
    await w.findAll('.spr-part')[0].trigger('click')
    expect(push).not.toHaveBeenCalled()
  })

  it('navigates to Teil 2 setup from the Teil 2 panel', async () => {
    const w = mount(SprechenHome, { global })
    await w.findAll('.spr-part')[1].trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'sprechen-teil2' })
  })

  it('renders the four shared stages', () => {
    const w = mount(SprechenHome, { global })
    expect(w.findAll('.spr-stage')).toHaveLength(4)
  })

  it('renders two shared ledger rows — Redemittel, Fehlerarchiv', () => {
    // The Korrekturdrill row arrives in Task 13, with its route. Rendering it
    // here would give the learner a CTA that throws on an unknown route name.
    const w = mount(SprechenHome, { global })
    const rows = w.findAll('.spr-rows')[0].findAll('.spr-row')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Redemittel')
    expect(rows[1].text()).toContain('Fehlerarchiv')
  })

  it('renders the rubric maxima with no runs rather than an empty state', () => {
    const w = mount(SprechenHome, { global })
    expect(w.find('.spr-mast-side').text()).toContain('Erfüllung / Interaktion')
    expect(w.find('.spr-mast-side').text()).not.toContain('Noch keine')
  })

  it('renders the lifetime yield block', () => {
    const w = mount(SprechenHome, { global })
    expect(w.find('.spr-yield').exists()).toBe(true)
  })

  it('distinguishes a failed archive read from a still-loading one', async () => {
    // Regression: `archive === null` was both states, so a failed read told the
    // learner "wird geladen" forever.
    const mod = await import('../../src/composables/useSprechenArchive')
    vi.mocked(mod.countsByKind).mockRejectedValueOnce(new Error('dexie down'))
    const w = mount(SprechenHome, { global })
    expect(w.text()).toContain('Archiv wird geladen')
    await flushPromises()
    expect(w.text()).toContain('Archiv nicht lesbar')
    expect(w.text()).not.toContain('Archiv wird geladen')
  })

  it('shows the archive counts once the read resolves', async () => {
    const w = mount(SprechenHome, { global })
    await flushPromises()
    expect(w.text()).toContain('3 Korrekturen')
    expect(w.text()).toContain('2 offen')
  })

  it('does not render a Teil 1 / Teil 2 yield toggle', () => {
    const w = mount(SprechenHome, { global })
    expect(w.text()).not.toContain('Vortragsmittel')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/modules/SprechenHome.test.ts`
Expected: FAIL — no `.spr-part` in the current card-grid markup.

- [ ] **Step 4: Write the component**

```vue
<script setup lang="ts">
// Sprechen hub — four bands: masthead, the two exam parts, shared rows,
// Ausbeute + recent Runs. Teil 1 (Vortrag) is NOT built; its panel renders for
// the design's two-panel composition but is inert (spec decision 3).
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'
import { countsByKind, openCorrections } from '../../composables/useSprechenArchive'
import { lifetimeCounts } from '../../composables/useRedemittelYield'
import { SPRECHEN_TOPICS } from '../../data/sprechenTopics'
import { doneTopicTitles } from '../../composables/useSprechenTopics'
import { SPRECHEN_REDEMITTEL } from '../../data/sprechenRedemittel'
import SprYield from '../../components/sprechen/SprYield.vue'
import SprCriterionBars, { type CriterionScore } from '../../components/sprechen/SprCriterionBars.vue'

const router = useRouter()
function go(name: string) { router.push({ name }) }

const runs = computed(() => loadHistory().filter(h => h.type === 'sprechen-teil2'))

/** Latest run per Modality — not best, not mean (spec decision 12). */
function latestCriteria(modality: 'typed' | 'spoken'): CriterionScore[] | null {
  const hit = runs.value.find(r => (r.meta.sprechenModality ?? 'typed') === modality)
  const cs = hit?.meta.sprechenCriteria
  return Array.isArray(cs) && cs.length > 0 ? (cs as CriterionScore[]) : null
}
const typedCriteria = computed(() => latestCriteria('typed'))
const spokenCriteria = computed(() => latestCriteria('spoken'))

const lifetimeUsedIds = computed(() => Object.keys(lifetimeCounts()))
const usedCount = computed(() => lifetimeUsedIds.value.length)

// doneTopicTitles() already performs exactly this computation and is the
// same function pickRandomTopic() uses to prefer undiscussed Topics — reuse it
// so the hub's count and the picker can never disagree.
const openTopics = computed(() => {
  const done = doneTopicTitles()
  return SPRECHEN_TOPICS.filter(t => !done.has(t.titleDe)).length
})
const lastScore = computed(() => runs.value[0]?.meta.sprechenScore ?? null)

// Live archive counts — a nice-to-have, never a blocker. THREE states, kept
// distinguishable on purpose: `null` alone would make a failed read look
// identical to a still-loading one, so the row would read "wird geladen"
// forever.
const archive = ref<{ total: number; open: number } | null>(null)
const archiveState = ref<'loading' | 'ready' | 'failed'>('loading')
onMounted(async () => {
  try {
    const [counts, open] = await Promise.all([countsByKind(), openCorrections()])
    archive.value = {
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      open: open.length
    }
    archiveState.value = 'ready'
  } catch {
    archive.value = null
    archiveState.value = 'failed'
  }
})

const recents = computed(() =>
  runs.value.slice(0, 6).map(r => ({
    id: r.id,
    date: new Date(r.startedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
    topic: r.meta.topicTitle ?? '—',
    score: r.meta.sprechenScore ?? r.correct,
    praedikat: r.meta.sprechenPraedikat ?? '—',
    sub: [
      `${r.meta.learnerTurns ?? '?'} Beiträge`,
      (r.meta.sprechenModality ?? 'typed') === 'spoken' ? 'gesprochen' : 'getippt',
      `${(r.meta.sprechenRedemittel as string[] | undefined)?.length ?? 0} Redemittel benutzt`
    ].join(' · ')
  }))
)

// Task 13 appends the Korrekturdrill row here, once its route exists.
const rows = [
  {
    n: 'I', route: 'sprechen-cheatsheet', title: 'Redemittel',
    de: 'Spickzettel · Teil 2',
    desc: `${SPRECHEN_REDEMITTEL.length} Wendungen für die Diskussion, nach Gesprächszug geordnet, mit dem Bauplan eines Beitrags.`
  },
  {
    n: 'II', route: 'sprechen-archive', title: 'Fehlerarchiv',
    de: 'Wiederkehrende Fehler',
    desc: 'Deine eigenen falschen Stellen aus den Diskussionen, nach Fehlerart sortiert. Das Gespräch selbst wird verworfen — diese Sätze nicht.'
  }
]

function metaFor(route: string): string[] {
  if (route === 'sprechen-cheatsheet') {
    return [`${SPRECHEN_REDEMITTEL.length} Wendungen`, `${usedCount.value} davon benutzt`]
  }
  if (archiveState.value === 'loading') return ['Archiv wird geladen']
  if (archiveState.value === 'failed' || !archive.value) return ['Archiv nicht lesbar']
  if (archive.value.total === 0) return ['Noch nichts archiviert']
  return [`${archive.value.total} Korrekturen`, `${archive.value.open} offen`]
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Sprechen</div>
        <h1 class="section-title">Sprechen<em>.</em></h1>
        <p class="section-subtitle">
          Die mündliche B2-Prüfung. Teil 2 ist eine Diskussion gegen einen KI-Partner,
          der nicht locker lässt — getippt oder gesprochen. Aussprache bleibt draußen;
          bewertet werden Argumentation, Redemittel, Strukturen und Reaktion.
        </p>
      </div>
      <div class="spr-level">
        <div class="micro-mark">Niveau</div>
        <div class="spr-level-v">B2</div>
      </div>
    </header>

    <!-- 01 · Masthead -->
    <div class="spr-mast">
      <div class="spr-mast-main">
        <div class="spr-lbl">Zwei Teile · dieselben vier Etappen</div>
        <p class="spr-claim">Erst allein sprechen,<br />dann <em>dagegenhalten</em>.</p>
        <p class="spr-claim-note">
          Teil 1 ist ein Vortrag nach Aufgabenblatt, Teil 2 eine Diskussion gegen einen
          Partner. Beide laufen durch dieselben vier Etappen und werden nach derselben
          Skala bewertet.
        </p>
        <div class="spr-flow">
          <div class="spr-stage">
            <div class="spr-stage-n">01</div>
            <div class="spr-stage-t">Themenwahl</div>
            <div class="spr-stage-d">Thema · Modalität<br />Beiträge · Position</div>
          </div>
          <div class="spr-stage">
            <div class="spr-stage-n">02</div>
            <div class="spr-stage-t">Vorbereitung</div>
            <div class="spr-stage-d">Winkel · Wortschatz<br />Notizen</div>
          </div>
          <div class="spr-stage">
            <div class="spr-stage-n">03</div>
            <div class="spr-stage-t">Diskussion</div>
            <div class="spr-stage-d">Was &amp; Wie zur Hand<br />Notizen bleiben sichtbar</div>
          </div>
          <div class="spr-stage">
            <div class="spr-stage-n">04</div>
            <div class="spr-stage-t">Auswertung</div>
            <div class="spr-stage-d">Fehler markiert<br />ins Archiv übernommen</div>
          </div>
        </div>
      </div>
      <div class="spr-mast-side">
        <div class="spr-lbl">Letzte Werte · getippt / gesprochen</div>
        <SprCriterionBars :typed="typedCriteria" :spoken="spokenCriteria" />
      </div>
    </div>

    <!-- 02 · The two exam parts -->
    <div class="spr-parts">
      <button class="spr-part dead" type="button" disabled>
        <div class="spr-part-h">
          <span class="spr-part-n">Teil 1</span>
          <span class="spr-lbl">allein, ca. 4 Minuten</span>
        </div>
        <div class="spr-part-t">Vortrag</div>
        <p class="spr-part-claim">
          Ein Aufgabenblatt, fünf Punkte, vier Minuten Rede — danach eine Nachfrage.
        </p>
        <p class="spr-part-d">
          Du wählst zwischen zwei Themen, planst die Gliederung und hältst den Vortrag
          Abschnitt für Abschnitt. Bewertet wird, ob alle fünf Punkte tragen.
        </p>
        <!-- Inside the button, so a screen reader announces it as part of the
             button's content. aria-describedby would be redundant here and is
             inconsistently honoured on disabled controls. -->
        <span class="spr-part-soon">In Vorbereitung</span>
      </button>

      <button class="spr-part" type="button" @click="go('sprechen-teil2')">
        <div class="spr-part-h">
          <span class="spr-part-n">Teil 2</span>
          <span class="spr-lbl">mit KI-Partner, ca. 5 Minuten</span>
        </div>
        <div class="spr-part-t">Diskussion</div>
        <p class="spr-part-claim">
          Eine These, zwei Seiten, sechs Beiträge — der Partner lässt nicht locker.
        </p>
        <p class="spr-part-d">
          Thema wählen, getippt oder gesprochen entscheiden, eine Minute vorbereiten,
          deine Seite verteidigen. Bewertet wird auch, wie du auf den Partner reagierst.
        </p>
        <div class="spr-part-stats">
          <div><b>{{ openTopics }} Themen offen</b><span>von {{ SPRECHEN_TOPICS.length }}</span></div>
          <div>
            <b>{{ lastScore === null ? 'noch keine' : `zuletzt ${lastScore}` }}</b>
            <span>{{ lastScore === null ? 'Diskussion' : '/ 100' }}</span>
          </div>
          <div><b>{{ runs.length }} Diskussionen</b><span>bisher</span></div>
        </div>
        <div class="spr-part-go">Starten <span aria-hidden="true">→</span></div>
      </button>
    </div>

    <!-- 03 · Shared rows -->
    <div class="spr-rows spr-rows-shared">
      <button v-for="r in rows" :key="r.route" class="spr-row" type="button" @click="go(r.route)">
        <span class="spr-row-n">{{ r.n }}</span>
        <span>
          <span class="spr-row-t">{{ r.title }}<span class="spr-row-de">{{ r.de }}</span></span>
          <span class="spr-row-d spr-row-block">{{ r.desc }}</span>
        </span>
        <span class="spr-row-meta">
          <span v-for="m in metaFor(r.route)" :key="m">{{ m }}</span>
        </span>
        <span class="spr-row-arrow"><span class="drill-arrow">→</span></span>
      </button>
    </div>

    <!-- 04 · Ausbeute -->
    <section class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Redemittel-Ausbeute</h2>
        <span class="spr-block-n">lokal gezählt · ohne KI · zählt nie in die Note</span>
      </div>
      <p class="spr-sub spr-sub-tight">
        Was du in Diskussionen tatsächlich benutzt hast — über alle Runs hinweg. Ein Move
        ohne Treffer ist genau der, zu dem der Runner dich künftig schubst.
      </p>
      <SprYield :used-ids="lifetimeUsedIds"
        note="Noch nie benutzt — der Runner wird dich darauf schubsen." />
    </section>

    <!-- 04b · Recent Runs -->
    <section v-if="recents.length > 0" class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Letzte Diskussionen</h2>
        <span class="spr-block-n">Gespräche werden nie gespeichert · nur die Bilanz</span>
      </div>
      <div class="spr-rows">
        <div v-for="r in recents" :key="r.id" class="spr-row spr-row-static">
          <span class="spr-row-n">{{ r.date }}</span>
          <span>
            <span class="spr-row-t spr-row-t-sm">{{ r.topic }}</span>
            <span class="spr-row-d spr-row-block">{{ r.sub }}</span>
          </span>
          <span class="spr-row-meta">
            <span class="spr-num" :class="r.score >= 60 ? 'spr-ok' : 'spr-bad'">
              {{ r.score }} / 100
            </span>
            <span>{{ r.praedikat }}</span>
          </span>
          <span class="spr-row-arrow" />
        </div>
      </div>
    </section>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="go('home')">← Back</button>
    </div>
  </div>
</template>

<style scoped>
/* Only what the global sheet has no business owning: this page's own
   arrangement. Everything visual lives in src/styles/sprechen.css. */
.spr-level { text-align: right; }
.spr-level-v {
  font-family: var(--font-display); font-size: 24px;
  font-style: italic; letter-spacing: -0.01em; margin-top: 6px;
}
.spr-claim { margin-top: 16px; }
.spr-rows-shared { margin-top: 44px; }
.spr-row-block { display: block; }
.spr-row-arrow { padding-top: 5px; }
.spr-row-t-sm { font-size: 19px; }
.spr-row-static { cursor: default; }
.spr-row-static:hover { background: transparent; padding-left: 14px; }
.spr-row-static:hover::before { transform: scaleY(0); }
.spr-sub-tight { margin-top: -6px; }
.spr-ok { color: var(--success); font-size: 15px; letter-spacing: 0; }
.spr-bad { color: var(--danger); font-size: 15px; letter-spacing: 0; }
</style>
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/modules/SprechenHome.test.ts && npm run typecheck`
Expected: PASS, typecheck clean. Every route this component pushes to already exists — `sprechen-cheatsheet`, `sprechen-archive`, `sprechen-teil2`, `home`.

- [ ] **Step 6: Commit**

```bash
git add src/modules/sprechen/SprechenHome.vue tests/modules/SprechenHome.test.ts
git commit -m "feat(sprechen): rebuild the hub on the editorial masthead + part panels"
```

---

# Phase 3 — Themenwahl and Vorbereitung

### Task 6: Rebuild `Teil2Setup.vue`

**Files:**
- Rewrite: `src/modules/sprechen/Teil2Setup.vue`
- Test: `tests/modules/Teil2Setup.test.ts` (new)

**Interfaces:**
- Consumes: `.spr-setup`, `.spr-search-row`, `.spr-tagrow`, `.spr-tag`, `.spr-tlist`, `.spr-titem`, `.spr-flag`, `.spr-card`, `.spr-fld` from Task 1; the existing `useSprechenTopics.ts` API (`pickRandomTopic`, custom-topic generation), `TOPIC_TAGS`, `Teil2RunStash`, `TEIL2_STASH_KEY`, `loadCachedBank`.
- Produces: the same `Teil2RunStash` in `sessionStorage` as today — **the stash contract does not change**, so `Teil2Prep`/`Teil2Runner` keep working.

Two columns: topic browser left, sticky Prüfungskarte right. **Preserve every behaviour the current file has** — resume gate for an unfinished Discussion, mic-support gate with the toast fallback to typed, `canUseAi` gating, stash persistence on every field change. This is a re-skin plus one field move, not a rewrite of logic.

- [ ] **Step 1: Read the current file end to end**

Read `src/modules/sprechen/Teil2Setup.vue` in full before writing anything. It is 19.8 KB and contains behaviour that is not in the design and must survive: `micSupported` detection, `selectModality()`'s defence-in-depth, the `active` resume banner, the effective-modality downgrade at `start()`, and the stash `watch`.

- [ ] **Step 2: Fetch the prototype markup**

```
DesignSync: { method: "get_file", projectId: "ff880a7a-b49d-4411-8435-65c0519723c4", path: "sprechen.jsx" }
```

Read `SprSetup`. Port the markup and copy. Its four `.spr-fld` fields become **five**, with Modality first (spec decision 2).

- [ ] **Step 3: Write the failing test**

Create `tests/modules/Teil2Setup.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../src/composables/useSprechenDiscussion', () => ({
  findActiveDiscussion: vi.fn(async () => undefined),
  createDiscussion: vi.fn(async () => ({ id: 'd1' })),
  deleteDiscussion: vi.fn(async () => undefined)
}))
vi.mock('../../src/composables/useSprechenArguments', () => ({
  loadCachedBank: vi.fn(async () => undefined)
}))

import Teil2Setup from '../../src/modules/sprechen/Teil2Setup.vue'

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); push.mockClear() })

describe('Teil2Setup — Prüfungskarte', () => {
  it('renders five fields with Modalität first', async () => {
    const w = mount(Teil2Setup)
    await flushPromises()
    const labels = w.findAll('.spr-fld-l').map(n => n.text())
    expect(labels).toHaveLength(5)
    expect(labels[0]).toContain('Modalität')
    expect(labels[1]).toContain('Beiträge')
    expect(labels[2]).toContain('Position')
    expect(labels[3]).toContain('Vorbereitung')
    expect(labels[4]).toContain('Hilfen')
  })

  it('disables the CTA until a Topic is chosen', async () => {
    const w = mount(Teil2Setup)
    await flushPromises()
    expect(w.find('.spr-card-go .btn').attributes('disabled')).toBeDefined()
    await w.findAll('.spr-titem')[0].trigger('click')
    expect(w.find('.spr-card-go .btn').attributes('disabled')).toBeUndefined()
  })

  it('shows the voice picker only for the spoken Modality', async () => {
    const w = mount(Teil2Setup)
    await flushPromises()
    expect(w.find('.spr-voice').exists()).toBe(false)
  })
})

describe('Teil2Setup — topic browser', () => {
  it('renders a tag chip per TOPIC_TAG with a count', async () => {
    const w = mount(Teil2Setup)
    await flushPromises()
    expect(w.findAll('.spr-tag').length).toBeGreaterThanOrEqual(10)
    expect(w.findAll('.spr-tag')[0].text()).toMatch(/\d/)
  })

  it('filters the list by search text over title and statement', async () => {
    const w = mount(Teil2Setup)
    await flushPromises()
    const before = w.findAll('.spr-titem').length
    await w.find('.spr-search-row input').setValue('Tempolimit')
    expect(w.findAll('.spr-titem').length).toBeLessThan(before)
    expect(w.find('.spr-titem').text()).toContain('Tempolimit')
  })

  it('shows the counter line above the list', async () => {
    const w = mount(Teil2Setup)
    await flushPromises()
    expect(w.text()).toMatch(/von \d+ Themen/)
  })

  it('renders the empty note when no Topic matches', async () => {
    const w = mount(Teil2Setup)
    await flushPromises()
    await w.find('.spr-search-row input').setValue('zzzzzzz')
    expect(w.find('.spr-empty').exists()).toBe(true)
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run tests/modules/Teil2Setup.test.ts`
Expected: FAIL — no `.spr-fld-l` in the current markup.

- [ ] **Step 5: Rewrite the template and styles, keeping the script**

Keep the existing `<script setup>` almost entirely. Add exactly these:

```ts
// Row markers need to know which Topics already have a cached argument bank.
// One Dexie read on mount; a failure just drops the marker.
import { loadCachedBank } from '../../composables/useSprechenArguments'

const cachedIds = ref<Set<string>>(new Set())
onMounted(async () => {
  try {
    const found = await Promise.all(
      pool.value.map(async t => ((await loadCachedBank(t.id)) ? t.id : null))
    )
    cachedIds.value = new Set(found.filter((x): x is string => x !== null))
  } catch {
    cachedIds.value = new Set()
  }
})

const searchQ = ref('')
const activeTags = ref<TopicTag[]>([])
const onlyNew = ref(false)

function toggleTag(t: TopicTag) {
  activeTags.value = activeTags.value.includes(t)
    ? activeTags.value.filter(x => x !== t)
    : [...activeTags.value, t]
}
function resetFilters() { activeTags.value = []; searchQ.value = ''; onlyNew.value = false }

const visible = computed(() => {
  const q = searchQ.value.trim().toLowerCase()
  return pool.value.filter(t => {
    if (onlyNew.value && done.has(t.titleDe)) return false
    if (activeTags.value.length > 0 && !t.tags.some(x => activeTags.value.includes(x))) return false
    if (q && !`${t.titleDe} ${t.statementDe}`.toLowerCase().includes(q)) return false
    return true
  })
})
const openCount = computed(() => visible.value.filter(t => !done.has(t.titleDe)).length)
function tagCount(t: TopicTag) { return pool.value.filter(x => x.tags.includes(t)).length }
```

Replace `done.has(...)` and `pool` with whatever the existing file already calls them — read first, do not invent parallel state.

The template's browser column:

```html
<div class="spr-setup">
  <div>
    <div class="spr-search-row">
      <div class="field spr-search-field">
        <div class="field-label">Suche · Titel und These</div>
        <input class="input" v-model="searchQ" placeholder="z. B. Arbeit, Schule, verbieten …" />
      </div>
      <div class="spr-search-btns">
        <button class="btn btn-quiet" type="button" @click="pickRandom">Zufallsthema</button>
        <button class="btn btn-quiet" type="button" @click="onlyNew = !onlyNew">
          {{ onlyNew ? '✓ Nur neue' : 'Nur neue' }}
        </button>
      </div>
    </div>

    <div class="spr-tagrow">
      <button v-for="t in TOPIC_TAGS" :key="t" type="button"
        class="spr-tag" :class="{ on: activeTags.includes(t) }" @click="toggleTag(t)">
        {{ t }}<i>{{ tagCount(t) }}</i>
      </button>
      <button v-if="activeTags.length > 0 || searchQ || onlyNew" type="button"
        class="spr-tag" @click="resetFilters">Filter zurücksetzen ×</button>
    </div>

    <div class="micro-mark spr-count-line">
      {{ visible.length }} von {{ pool.length }} Themen ·
      {{ openCount }} noch nicht diskutiert
    </div>

    <div class="spr-tlist">
      <button v-for="(t, i) in visible" :key="t.id" type="button"
        class="spr-titem"
        :class="{ sel: t.id === topicId, done: done.has(t.titleDe) }"
        @click="topicId = t.id">
        <span class="spr-titem-mark">
          {{ t.id === topicId ? '●' : done.has(t.titleDe) ? '✓' : String(i + 1).padStart(2, '0') }}
        </span>
        <span class="spr-titem-main">
          <span class="spr-titem-t">
            {{ t.titleDe }}
            <span class="spr-titem-tags">{{ t.tags.join(' · ') }}</span>
          </span>
          <span class="spr-titem-s spr-titem-block">{{ t.statementDe }}</span>
        </span>
        <span class="spr-titem-r">
          <span v-if="t.source === 'custom'" class="spr-flag cache">generiert</span>
          <span v-if="done.has(t.titleDe)" class="spr-flag done">diskutiert</span>
          <span v-if="cachedIds.has(t.id)" class="spr-flag cache">Argumente im Cache</span>
        </span>
      </button>
      <p v-if="visible.length === 0" class="spr-empty">
        Kein Thema passt zu diesen Filtern.
      </p>
    </div>

    <!-- Keep the existing generator alert block verbatim, moved here. -->
  </div>

  <aside class="spr-card"> … Prüfungskarte, see below … </aside>
</div>
```

The Prüfungskarte, five fields, Modality first:

```html
<aside class="spr-card">
  <div class="spr-card-h">
    <span class="spr-lbl">Prüfungskarte</span>
    <span class="spr-lbl">B2 · Teil 2</span>
  </div>
  <div class="spr-card-b">
    <template v-if="topic">
      <div class="spr-card-topic">{{ topic.titleDe }}</div>
      <p class="spr-card-stmt">{{ topic.statementDe }}</p>
    </template>
    <p v-else class="spr-card-none">
      Noch kein Thema gewählt. Nimm eines aus der Liste — oder lass den Zufall entscheiden.
    </p>

    <div class="spr-card-f">
      <div class="spr-fld">
        <span class="spr-fld-l">Modalität</span>
        <div class="segmented">
          <button type="button" :class="{ active: modality === 'typed' }"
            @click="selectModality('typed')">Getippt</button>
          <button type="button" :class="{ active: modality === 'spoken' }"
            :disabled="!micSupported" @click="selectModality('spoken')">Gesprochen</button>
        </div>
        <div v-if="modality === 'spoken' && voice.voices.value.length > 0" class="spr-voice">
          <!-- Keep the existing voice <select> markup here, unchanged. -->
        </div>
        <span v-if="!micSupported" class="spr-fld-note">
          Gesprochen ist in diesem Browser nicht verfügbar. Getippt läuft überall.
        </span>
      </div>

      <div class="spr-fld">
        <span class="spr-fld-l">Deine Beiträge</span>
        <div class="segmented">
          <button v-for="n in TURN_TARGETS" :key="n" type="button"
            :class="{ active: turnTarget === n }" @click="turnTarget = n">{{ n }}</button>
        </div>
      </div>

      <div class="spr-fld">
        <span class="spr-fld-l">Position des Partners</span>
        <div class="segmented">
          <button type="button" :class="{ active: stance === 'random' }"
            @click="stance = 'random'">Zufall</button>
          <button type="button" :class="{ active: stance === 'pro' }"
            @click="stance = 'pro'">Dafür</button>
          <button type="button" :class="{ active: stance === 'contra' }"
            @click="stance = 'contra'">Dagegen</button>
        </div>
        <div v-if="topic" class="spr-card-side">
          <span class="spr-lbl">Du</span>
          <strong :class="mySide === 'pro' ? 'spr-side-pro' : 'spr-side-contra'">
            {{ mySide === 'pro' ? 'dafür' : 'dagegen' }}
          </strong>
          <span v-if="stance === 'random'" class="spr-fld-note">
            (bei Zufall erst beim Start endgültig)
          </span>
        </div>
      </div>

      <div class="spr-fld">
        <span class="spr-fld-l">Vorbereitungszeit</span>
        <div class="segmented">
          <button v-for="p in [[0,'Aus'],[60,'1 Min'],[180,'3 Min']]" :key="String(p[0])"
            type="button" :class="{ active: prepSeconds === p[0] }"
            @click="prepSeconds = p[0] as number">{{ p[1] }}</button>
        </div>
        <span class="spr-fld-note">
          Argumente und Wortschatz zum Thema, plus ein Notizfeld, das während der
          Diskussion sichtbar bleibt.
        </span>
      </div>

      <div class="spr-fld">
        <span class="spr-fld-l">Hilfen im Gespräch</span>
        <div class="segmented">
          <button type="button" :class="{ active: hintsOn }" @click="hintsOn = true">An</button>
          <button type="button" :class="{ active: !hintsOn }" @click="hintsOn = false">Aus</button>
        </div>
        <span class="spr-fld-note">
          Was (Argumente) und Wie (Redemittel) — kostenlos. KI-Tipp auf Abruf kostet einen Call.
        </span>
      </div>
    </div>
  </div>
  <div class="spr-card-go">
    <button class="btn btn-accent btn-meta"
      :disabled="!topic || !canUseAi || (modality === 'spoken' && !micSupported)" @click="start">
      <span class="bm-main">
        {{ prepSeconds > 0 ? 'Vorbereitung' : 'Diskussion starten' }}
        <span aria-hidden="true">→</span>
      </span>
      <span class="bm-sub">
        {{ modality === 'spoken' ? 'gesprochen' : 'getippt' }} ·
        {{ turnTarget }} Beiträge ·
        {{ prepSeconds === 0 ? 'ohne Vorbereitung' : `${prepSeconds / 60} Min` }}
      </span>
    </button>
  </div>
</aside>
```

Scoped styles reduce to `.spr-search-field { margin-bottom: 0 }`, `.spr-search-btns { display: flex; gap: 8px }`, `.spr-count-line { margin-top: 18px }`, `.spr-titem-main { min-width: 0 }`, `.spr-titem-block { display: block }`, `.spr-voice { margin-top: 8px }`, and `.spr-fld-note { font-size: 12.5px; color: var(--mute); font-style: italic; line-height: 1.5 }`. Delete everything else.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/modules/Teil2Setup.test.ts tests/composables/useSprechenTopics.test.ts && npm run typecheck`
Expected: PASS, typecheck clean. The topics composable test must stay green — its API is untouched.

- [ ] **Step 7: Manually verify the behaviours the tests can't reach**

Start the dev server pinned (`npm run dev -- --port 5199 --strictPort`) and check, at `localhost:5199/#/sprechen/teil2`: the resume banner appears when an unfinished Discussion exists; picking Gesprochen in a browser without `SpeechRecognition` is impossible; a stash written before a reload is restored.

- [ ] **Step 8: Commit**

```bash
git add src/modules/sprechen/Teil2Setup.vue tests/modules/Teil2Setup.test.ts
git commit -m "feat(sprechen): Themenwahl on the topic browser + sticky Prüfungskarte"
```

---

### Task 7: Re-skin `Teil2Prep.vue`

**Files:**
- Rewrite (template + styles only): `src/modules/sprechen/Teil2Prep.vue`

**Interfaces:**
- Consumes: `.spr-prep-mast`, `.spr-timer`, `.spr-angles`, `.spr-acol`, `.spr-angle`, `.spr-wordstrip`, `.spr-words`, `.spr-word`, `.spr-notes` from Task 1.
- Produces: unchanged — the same stash handoff to `Teil2Runner`.

**This is a re-skin only.** The behaviour is already correct: countdown with Pause/Stopp, expiry that does not force the start, two argument columns, the Wortschatz strip, the scope label, and the notes field. Do not change the argument-bank resolution, the AI-cost note, or the timer semantics.

- [ ] **Step 1: Read the current file and the prototype's `SprPrep`**

```
DesignSync: { method: "get_file", projectId: "ff880a7a-b49d-4411-8435-65c0519723c4", path: "sprechen.jsx" }
```

- [ ] **Step 2: Map the classes**

| Current | New |
|---|---|
| `.prep-thesis`, `.thesis-text` | `.spr-prep-mast` + `.spr-prep-stmt` |
| `.prep-timer`, `.timer-num`, `.timer-ctl`, `.low`, `.time-up` | `.spr-timer`, `.spr-timer-num`, `.spr-timer-ctl`, `.spr-timer-num.low`, `.micro-mark` |
| `.sides`, `.mySide`, `'side-pro'`, `'side-contra'` | `.spr-sides`, `.spr-side-pro`, `.spr-side-contra` |
| `.angles`, `.angle-col`, `.mine`, `.theirs` | `.spr-angles`, `.spr-acol`, `.spr-acol.mine`, `.spr-acol.theirs` |
| `.angle-head` | `.spr-acol-h` + `.spr-acol-t` |
| `.angle`, `.angle-claim`, `.angle-why` | `.spr-angle`, `.spr-angle-c`, `.spr-angle-w` |
| `.words`, `.word`, `.word-de`, `.word-en` | `.spr-wordstrip` > `.spr-words`, `.spr-word`, `.spr-word-de`, `.spr-word-en` |
| `.notes-field` | `.spr-notes` |
| `.block-heading`, `.scope-note` | `.spr-block-h` + `.spr-block-t` + `.spr-block-n` |

Angle claims gain the numeral the design uses: `<div class="spr-angle-c"><b>{{ String(i+1).padStart(2,'0') }}</b><span>{{ a.claim }}</span></div>`.

- [ ] **Step 3: Add the notes placeholder generated from the bank**

The design generates the placeholder from the topic's own bank. Add:

```ts
const notesPlaceholder = computed(() => {
  const first = mine.value[0]?.claim ?? ''
  const counter = theirs.value[0]?.claim ?? ''
  return `Stichpunkte, keine Sätze — z. B.\n· ${first}\n· Gegenargument entkräften: ${counter}\n· Frage stellen: „Wie sehen Sie das?"`
})
```

Rename `mine` / `theirs` to whatever the file already calls them.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm test`
Expected: typecheck clean, suite green (no test mounts this file).

- [ ] **Step 5: Manually verify at three widths**

At 1440 / 1080 / 720 px: the two argument columns collapse to one at 720 and the timer left-aligns; the countdown still pauses; expiry goes red and does not force the start.

- [ ] **Step 6: Commit**

```bash
git add src/modules/sprechen/Teil2Prep.vue
git commit -m "refactor(sprechen): Vorbereitung on the .spr-* vocabulary"
```

---

# Phase 4 — The runner

### Task 8: Rail, protocol and composer

**Files:**
- Rewrite (template + styles, additive script): `src/modules/sprechen/Teil2Runner.vue`
- Test: `tests/modules/Teil2Runner.test.ts` (new)

**Interfaces:**
- Consumes: `.spr-run`, `.spr-rail`, `.spr-rail-sec`, `.spr-rail-stmt`, `.spr-steps`, `.spr-step`, `.spr-step-n`, `.spr-step-m`, `.spr-railnotes`, `.spr-used`, `.spr-used-dot`, `.spr-proto`, `.spr-turn`, `.spr-turn-m`, `.spr-turn-b`, `.spr-typing`, `.spr-composer`, `.spr-composer-f`, `.spr-count`; `movePerTurn`, `matchRedemittel` from Task 2.
- Produces: nothing consumed downstream. `Teil2Result` reads the graded stash as today.

**Preserve all existing behaviour**: the synchronous double-send guard (commit a604a8e), mic lifecycle and `TurnSpeech` capture, `kiTippCount`, the grade→record→delete pipeline, resume from an in-progress Discussion.

- [ ] **Step 1: Read the current file in full**

`src/modules/sprechen/Teil2Runner.vue` is 28 KB and the most behaviour-dense file in the module. Read all of it before editing.

- [ ] **Step 2: Add the rail's derived state**

```ts
import { matchRedemittel, movePerTurn } from '../../composables/useRedemittelMatch'
import { MOVE_LABEL, SPRECHEN_REDEMITTEL } from '../../data/sprechenRedemittel'

const learnerTexts = computed(
  () => (discussion.value?.turns ?? []).filter(t => t.role === 'learner').map(t => t.textDe)
)

/** Live yield for the rail's 42-dot grid. */
const usedIds = computed(() => new Set(matchRedemittel(learnerTexts.value).map(r => r.id)))

/** L1–Ln stepper: one entry per planned turn, labelled with the Move it used. */
const steps = computed(() => {
  const moves = movePerTurn(learnerTexts.value)
  const target = discussion.value?.turnTarget ?? 6
  return Array.from({ length: target }, (_, i) => {
    const done = i < learnerTexts.value.length
    return {
      n: `L${i + 1}`,
      done,
      now: i === learnerTexts.value.length,
      // A completed turn that matched no Redemittel shows an em dash, never a blank.
      label: done ? (moves[i] ? MOVE_LABEL[moves[i]!].de : '—') : ''
    }
  })
})

/** Spoken Modality only — the one measure typed runs cannot produce. */
const liveWpm = computed(() => {
  const spoken = (discussion.value?.turns ?? []).filter(t => t.role === 'learner' && t.speech)
  if (spoken.length === 0) return null
  const words = spoken.reduce((s, t) => s + (t.speech?.words ?? 0), 0)
  const ms = spoken.reduce((s, t) => s + (t.speech?.spokenMs ?? 0), 0)
  if (ms <= 0) return null
  return Math.round(words / (ms / 60000))
})
```

- [ ] **Step 3: Write the failing test**

Create `tests/modules/Teil2Runner.test.ts`. Mock the composables the runner reaches for; assert only the new surfaces:

```ts
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const discussion = {
  id: 'd1',
  topic: { id: 't1', titleDe: 'Tempolimit', statementDe: 'Brauchen wir ein Tempolimit?', source: 'seed' },
  turnTarget: 6, stance: 'pro', modality: 'typed', status: 'in_progress',
  kiTippCount: 0, notes: 'meine Notizen', startedAt: 1,
  turns: [
    { role: 'partner', textDe: 'Ich halte das für falsch.', at: 1 },
    { role: 'learner', textDe: 'Das sehe ich genauso, aber es reicht nicht.', at: 2 }
  ]
}

vi.mock('../../src/composables/useSprechenDiscussion', () => ({
  findActiveDiscussion: vi.fn(async () => discussion),
  loadDiscussion: vi.fn(async () => discussion),
  appendTurn: vi.fn(async () => discussion),
  saveDiscussion: vi.fn(async () => undefined),
  deleteDiscussion: vi.fn(async () => undefined)
}))

import Teil2Runner from '../../src/modules/sprechen/Teil2Runner.vue'

describe('Teil2Runner rail', () => {
  it('renders one stepper row per planned turn', async () => {
    const w = mount(Teil2Runner); await flushPromises()
    expect(w.findAll('.spr-step')).toHaveLength(6)
  })

  it('labels a completed turn with the Move it actually used', async () => {
    const w = mount(Teil2Runner); await flushPromises()
    expect(w.findAll('.spr-step')[0].text()).toContain('Zustimmen')
  })

  it('renders a 42-dot Redemittel grid with the used ones on', async () => {
    const w = mount(Teil2Runner); await flushPromises()
    expect(w.findAll('.spr-used-dot')).toHaveLength(42)
    expect(w.findAll('.spr-used-dot.on')).toHaveLength(1)
  })

  it('pins the prep notes into the rail', async () => {
    const w = mount(Teil2Runner); await flushPromises()
    expect(w.find('.spr-railnotes').text()).toContain('meine Notizen')
  })

  it('renders ruled protocol turns, not chat bubbles', async () => {
    const w = mount(Teil2Runner); await flushPromises()
    expect(w.findAll('.spr-turn')).toHaveLength(2)
    expect(w.findAll('.spr-turn.learner')).toHaveLength(1)
    expect(w.find('.chat-input-row').exists()).toBe(false)
  })

  it('omits live tempo for a typed Discussion', async () => {
    const w = mount(Teil2Runner); await flushPromises()
    expect(w.text()).not.toContain('WpM')
  })
})

describe('Teil2Runner composer', () => {
  it('warns under 25 words', async () => {
    const w = mount(Teil2Runner); await flushPromises()
    await w.find('.spr-composer textarea').setValue('kurz')
    expect(w.find('.spr-count').classes()).toContain('short')
    expect(w.text()).toContain('noch knapp')
  })

  it('drops the warning at 25 words or more', async () => {
    const w = mount(Teil2Runner); await flushPromises()
    await w.find('.spr-composer textarea').setValue(Array(25).fill('Wort').join(' '))
    expect(w.find('.spr-count').classes()).not.toContain('short')
  })
})
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx vitest run tests/modules/Teil2Runner.test.ts`
Expected: FAIL — no `.spr-step`.

- [ ] **Step 5: Write the rail, protocol and composer markup**

```html
<div class="spr-run">
  <aside class="spr-rail">
    <div class="spr-rail-sec">
      <div class="spr-lbl">These</div>
      <p class="spr-rail-stmt">{{ discussion.topic.statementDe }}</p>
    </div>

    <div class="spr-rail-sec">
      <div class="spr-lbl">Deine Beiträge</div>
      <div class="spr-steps">
        <div v-for="s in steps" :key="s.n" class="spr-step"
          :class="{ done: s.done, now: s.now }">
          <span class="spr-step-n">{{ s.n }}</span>
          <span class="spr-step-m">{{ s.label }}</span>
        </div>
      </div>
    </div>

    <div v-if="liveWpm !== null" class="spr-rail-sec">
      <div class="spr-lbl">Tempo</div>
      <div class="spr-rail-wpm spr-num">{{ liveWpm }} <span class="spr-lbl">WpM</span></div>
    </div>

    <div class="spr-rail-sec">
      <div class="spr-lbl">Redemittel · {{ usedIds.size }} / 42</div>
      <div class="spr-used">
        <span v-for="r in SPRECHEN_REDEMITTEL" :key="r.id" class="spr-used-dot"
          :class="{ on: usedIds.has(r.id) }" :title="r.phraseDe" />
      </div>
    </div>

    <div class="spr-rail-sec">
      <div class="spr-lbl">Notizen</div>
      <p class="spr-railnotes" :class="{ none: !discussion.notes }">
        {{ discussion.notes || 'Keine Notizen aus der Vorbereitung.' }}
      </p>
    </div>
  </aside>

  <div class="spr-run-main">
    <div class="spr-proto">
      <div v-for="(t, i) in discussion.turns" :key="i" class="spr-turn" :class="t.role">
        <div class="spr-turn-m">{{ t.role === 'learner' ? 'Du' : 'Partner' }}</div>
        <div class="spr-turn-b">{{ t.textDe }}</div>
      </div>
      <div v-if="partnerThinking" class="spr-turn partner">
        <div class="spr-turn-m">Partner</div>
        <div class="spr-turn-b spr-typing">···</div>
      </div>
    </div>

    <!-- Move nudge + hint drawer land here in Task 9 -->

    <div class="spr-composer">
      <textarea v-model="draft" :placeholder="composerPlaceholder"
        @keydown.enter.exact.prevent="send" />
      <div class="spr-composer-f">
        <span class="spr-count" :class="{ short: wordCount > 0 && wordCount < 25 }">
          {{ wordCount }} Wörter<template v-if="wordCount > 0 && wordCount < 25">
            · für einen B2-Beitrag noch knapp</template>
        </span>
        <span class="spr-count">
          Beitrag {{ learnerTexts.length + 1 }} / {{ discussion.turnTarget }}
        </span>
        <button class="btn btn-accent" type="button" :disabled="!canSend" @click="send">
          Senden <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  </div>
</div>
```

For the spoken Modality, keep the existing mic row exactly as it is but move it inside `.spr-composer-f`, replacing the Senden button. Do not restructure the recognizer logic. `wordCount` must count the live transcript when spoken and the textarea when typed — reuse whatever the file already computes.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/modules/Teil2Runner.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/sprechen/Teil2Runner.vue tests/modules/Teil2Runner.test.ts
git commit -m "feat(sprechen): runner rail with Move-labelled stepper, live yield and tempo"
```

---

### Task 9: The Move nudge and the two-axis drawer

**Files:**
- Modify: `src/modules/sprechen/Teil2Runner.vue`
- Modify: `tests/modules/Teil2Runner.test.ts`

**Interfaces:**
- Consumes: `pickMoveNudge` from Task 2, `lifetimeCounts` from Task 3, `.spr-nudge*`, `.spr-drawer*`, `.spr-dtab*`, `.spr-move*`, `.spr-phrases`, `.spr-phrase*`, `.spr-was*`, `.spr-kitipp` from Task 1.

The existing drawer already has `'was'` / `'wie'` tabs — this task re-skins it and adds the `·neu` marks, the `schon benutzt` state, and the nudge above it.

- [ ] **Step 1: Add the nudge state**

```ts
import { pickMoveNudge } from '../../composables/useRedemittelMatch'
import { lifetimeCounts } from '../../composables/useRedemittelYield'

const lifetime = lifetimeCounts()          // read once; the rollup only changes at grade time
const nudgeDismissed = ref(false)

/**
 * Move nudge (CONTEXT.md → "Move nudge"). Shown from turn 2 so there is
 * something to not-have-used yet. A suggestion only — never validated against.
 */
const moveNudge = computed(() => {
  if (nudgeDismissed.value) return null
  if (!hintsOn.value) return null
  if (learnerTexts.value.length < 1) return null
  return pickMoveNudge(learnerTexts.value, lifetime)
})
```

- [ ] **Step 2: Add the drawer's derived state**

```ts
/** Moves the learner has not reached for this run get a ·neu mark. */
const freshMoves = computed(() => {
  const used = new Set(matchRedemittel(learnerTexts.value).map(r => r.move))
  return new Set(HINT_MOVES.filter(m => !used.has(m)))
})

const drawerPhrases = computed(() =>
  SPRECHEN_REDEMITTEL
    .filter(r => r.move === activeMove.value)
    .map(r => ({ ...r, used: usedIds.value.has(r.id) }))
)

/** The partner's angles already played, so *Was* can mute them. */
const partnerPlayed = computed(() => {
  const n = (discussion.value?.turns ?? []).filter(t => t.role === 'partner').length
  return theirAngles.value.slice(0, n)
})

/** Insert a phrase stub at the caret, ellipsis stripped, then focus. */
function insertPhrase(phraseDe: string) {
  const stub = phraseDe.replace(/\s*…\s*$/, '').trim()
  const el = composerEl.value
  if (!el) { draft.value = `${draft.value}${draft.value ? ' ' : ''}${stub}`; return }
  const at = el.selectionStart ?? draft.value.length
  draft.value = `${draft.value.slice(0, at)}${stub}${draft.value.slice(at)}`
  requestAnimationFrame(() => {
    el.focus()
    const pos = at + stub.length
    el.setSelectionRange(pos, pos)
  })
}
```

Add `const composerEl = ref<HTMLTextAreaElement | null>(null)` and `ref="composerEl"` on the textarea. Rename `theirAngles` to whatever the file already calls the opposing angles.

- [ ] **Step 3: Add the markup between the protocol and the composer**

```html
<div v-if="moveNudge" class="spr-nudge">
  <span class="spr-nudge-l">Diesmal</span>
  <span class="spr-nudge-t">{{ MOVE_LABEL[moveNudge].de.toLowerCase() }}</span>
  <button class="spr-nudge-x" type="button" aria-label="Hinweis ausblenden"
    @click="nudgeDismissed = true">×</button>
</div>

<div v-if="hintsOn" class="spr-drawer">
  <div class="spr-drawer-h">
    <button class="spr-dtab" :class="{ on: drawerTab === 'was' }" type="button"
      @click="drawerTab = 'was'">
      Was<span class="spr-dtab-sub">Argumente</span>
    </button>
    <button class="spr-dtab" :class="{ on: drawerTab === 'wie' }" type="button"
      @click="drawerTab = 'wie'">
      Wie<span class="spr-dtab-sub">Redemittel</span>
    </button>
    <button class="spr-drawer-x" type="button" :disabled="kiTippLoading" @click="askKiTipp">
      ✦ KI-Tipp · 1 Call
    </button>
  </div>

  <div class="spr-drawer-b">
    <template v-if="drawerTab === 'wie'">
      <div class="spr-moverow">
        <button v-for="m in HINT_MOVES" :key="m" type="button" class="spr-move"
          :class="{ on: activeMove === m, fresh: freshMoves.has(m) }"
          @click="activeMove = m">{{ MOVE_LABEL[m].de }}</button>
      </div>
      <ul class="spr-phrases">
        <li v-for="p in drawerPhrases" :key="p.id" class="spr-phrase">
          <button class="spr-phrase-t" :class="{ used: p.used }" type="button"
            @click="insertPhrase(p.phraseDe)">{{ p.phraseDe }}</button>
          <span class="spr-phrase-en">{{ p.used ? 'schon benutzt' : p.noteEn }}</span>
        </li>
      </ul>
    </template>

    <div v-else class="spr-was">
      <div class="spr-was-h">Deine Seite</div>
      <div v-for="(a, i) in myAngles" :key="`m${i}`" class="spr-was-i">
        <div class="spr-was-c">{{ a.claim }}</div>
        <p class="spr-was-w">{{ a.why }}</p>
      </div>
      <template v-if="partnerPlayed.length > 0">
        <div class="spr-was-h">Schon gespielt vom Partner</div>
        <div v-for="(a, i) in partnerPlayed" :key="`p${i}`" class="spr-was-i">
          <div class="spr-was-c spr-was-muted">{{ a.claim }}</div>
        </div>
      </template>
    </div>

    <p v-if="kiTipp" class="spr-kitipp">{{ kiTipp }}</p>
  </div>
</div>
```

Add `.spr-was-muted { color: var(--mute); font-weight: 400 }` to scoped styles.

- [ ] **Step 4: Add tests**

Append to `tests/modules/Teil2Runner.test.ts`:

```ts
describe('Teil2Runner Move nudge', () => {
  it('names a Move the learner has not used this run', async () => {
    const w = mount(Teil2Runner); await flushPromises()
    // The seeded turn used an 'agree' phrase, so the nudge must not say Zustimmen.
    const nudge = w.find('.spr-nudge')
    expect(nudge.exists()).toBe(true)
    expect(nudge.text().toLowerCase()).not.toContain('zustimmen')
  })

  it('is dismissible for the run', async () => {
    const w = mount(Teil2Runner); await flushPromises()
    await w.find('.spr-nudge-x').trigger('click')
    expect(w.find('.spr-nudge').exists()).toBe(false)
  })
})

describe('Teil2Runner drawer', () => {
  it('marks unused Moves ·neu', async () => {
    const w = mount(Teil2Runner); await flushPromises()
    await w.find('.spr-dtab:nth-child(2)').trigger('click')
    expect(w.findAll('.spr-move.fresh').length).toBeGreaterThan(0)
  })

  it('reads schon benutzt instead of the gloss for a used phrase', async () => {
    const w = mount(Teil2Runner); await flushPromises()
    await w.find('.spr-dtab:nth-child(2)').trigger('click')
    expect(w.text()).toContain('schon benutzt')
  })

  it('inserts a phrase stub with the ellipsis stripped', async () => {
    const w = mount(Teil2Runner); await flushPromises()
    await w.find('.spr-dtab:nth-child(2)').trigger('click')
    await w.findAll('.spr-phrase-t')[0].trigger('click')
    const val = (w.find('.spr-composer textarea').element as HTMLTextAreaElement).value
    expect(val).not.toContain('…')
    expect(val.length).toBeGreaterThan(0)
  })

  it('hides the drawer and the nudge when hints are off', async () => {
    // hintsOn comes off the stash; set it before mounting.
    sessionStorage.setItem('gt:lastSprechenTeil2', JSON.stringify({ hintsOn: false }))
    const w = mount(Teil2Runner); await flushPromises()
    expect(w.find('.spr-drawer').exists()).toBe(false)
    expect(w.find('.spr-nudge').exists()).toBe(false)
  })
})
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/modules/Teil2Runner.test.ts && npm run typecheck`
Expected: PASS. If the last case fails because `hintsOn` is read from the Discussion rather than the stash, adjust the test to match the real source — do not change the source to suit the test.

- [ ] **Step 6: Commit**

```bash
git add src/modules/sprechen/Teil2Runner.vue tests/modules/Teil2Runner.test.ts
git commit -m "feat(sprechen): Move nudge and the two-axis hint drawer"
```

---

# Phase 5 — Grader and Auswertung

### Task 10: Optional `structure` and `interaction` on the grader

**Files:**
- Modify: `src/composables/useSprechenGrader.ts`
- Modify: `tests/composables/useSprechenGrader.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface TurnStructure {
    these: boolean; begruendung: boolean; beispiel: boolean; reacts: boolean
  }
  export interface InteractionSummary { askedBack: number; rate: number }
  // added to SprechenGradeResult:
  //   structure?: TurnStructure[]
  //   interaction?: InteractionSummary
  ```

**Both fields are optional and never affect the score** (spec decisions 4 and 5). `SPRECHEN_B2_TEIL2` is not edited.

- [ ] **Step 1: Write the failing tests**

Append to `tests/composables/useSprechenGrader.test.ts` (reuse the file's existing valid-response fixture and Discussion builder — read them first):

```ts
describe('validateSprechenGrade — descriptive extras', () => {
  it('validates a response with no structure or interaction at all', () => {
    const r = validateSprechenGrade(validResponse(), discussionWith(3))
    expect(r).not.toBeNull()
    expect(r!.structure).toBeUndefined()
    expect(r!.interaction).toBeUndefined()
    expect(r!.totalScore).toBeGreaterThan(0)
  })

  it('keeps a well-formed structure array', () => {
    const raw = { ...validResponse(), structure: [
      { these: true, begruendung: true, beispiel: false, reacts: false },
      { these: true, begruendung: false, beispiel: true, reacts: true },
      { these: false, begruendung: true, beispiel: false, reacts: true }
    ] }
    const r = validateSprechenGrade(raw, discussionWith(3))
    expect(r!.structure).toHaveLength(3)
    expect(r!.structure![1].beispiel).toBe(true)
  })

  it('pads a short structure array to the learner-turn count', () => {
    const raw = { ...validResponse(), structure: [
      { these: true, begruendung: true, beispiel: true, reacts: true }
    ] }
    const r = validateSprechenGrade(raw, discussionWith(3))
    expect(r!.structure).toHaveLength(3)
    expect(r!.structure![2]).toEqual({
      these: false, begruendung: false, beispiel: false, reacts: false
    })
  })

  it('truncates a long structure array', () => {
    const one = { these: true, begruendung: true, beispiel: true, reacts: true }
    const raw = { ...validResponse(), structure: [one, one, one, one, one] }
    expect(validateSprechenGrade(raw, discussionWith(3))!.structure).toHaveLength(3)
  })

  it('drops a structure that is not an array rather than failing the grade', () => {
    const raw = { ...validResponse(), structure: 'nope' }
    const r = validateSprechenGrade(raw, discussionWith(3))
    expect(r).not.toBeNull()
    expect(r!.structure).toBeUndefined()
  })

  it('coerces non-boolean cells to false', () => {
    const raw = { ...validResponse(), structure: [
      { these: 'yes', begruendung: 1, beispiel: null, reacts: true }
    ] }
    const r = validateSprechenGrade(raw, discussionWith(1))
    expect(r!.structure![0]).toEqual({
      these: false, begruendung: false, beispiel: false, reacts: true
    })
  })

  it('clamps the interaction rate to 0–1 and floors askedBack at 0', () => {
    const raw = { ...validResponse(), interaction: { askedBack: -4, rate: 3 } }
    const r = validateSprechenGrade(raw, discussionWith(3))
    expect(r!.interaction).toEqual({ askedBack: 0, rate: 1 })
  })

  it('drops a malformed interaction object', () => {
    const raw = { ...validResponse(), interaction: { askedBack: 'x' } }
    expect(validateSprechenGrade(raw, discussionWith(3))!.interaction).toBeUndefined()
  })

  it('does not let structure or interaction change the total', () => {
    const base = validateSprechenGrade(validResponse(), discussionWith(3))!
    const withExtras = validateSprechenGrade(
      { ...validResponse(), structure: [], interaction: { askedBack: 9, rate: 1 } },
      discussionWith(3)
    )!
    expect(withExtras.totalScore).toBe(base.totalScore)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/composables/useSprechenGrader.test.ts`
Expected: FAIL — `structure` is not a property of the result.

- [ ] **Step 3: Add the types and the schema properties**

```ts
/**
 * Descriptive only — see spec decision 4. The official Goethe B2 criteria do
 * NOT score Argumentationsfähigkeit and Interaktionsfähigkeit separately; both
 * are aspects of `erfuellung`, which is why its label is 'Erfüllung /
 * Interaktion'. These fields explain where that criterion landed. They move
 * no points and the rubric is unchanged.
 */
export interface TurnStructure {
  these: boolean          // did the turn state a position?
  begruendung: boolean    // did it give a reason?
  beispiel: boolean       // did it give a concrete example?
  reacts: boolean         // did it engage the partner's previous point?
}

export interface InteractionSummary {
  askedBack: number       // Rückfragen to the partner
  rate: number            // 0–1, turns that react / total turns
}
```

Add to `SprechenGradeResult`:

```ts
  structure?: TurnStructure[]
  interaction?: InteractionSummary
```

Add to `SPRECHEN_GRADE_SCHEMA.properties` — **not** to `required`:

```ts
    structure: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          these: { type: 'boolean' },
          begruendung: { type: 'boolean' },
          beispiel: { type: 'boolean' },
          reacts: { type: 'boolean' }
        },
        required: ['these', 'begruendung', 'beispiel', 'reacts']
      }
    },
    interaction: {
      type: 'object',
      properties: { askedBack: { type: 'number' }, rate: { type: 'number' } },
      required: ['askedBack', 'rate']
    },
```

- [ ] **Step 4: Add the validator branch**

Insert into `validateSprechenGrade` just before it builds the result, and add the two fields to the returned object:

```ts
  // Descriptive extras: OPTIONAL by design. The local-claude bridge drops
  // responseSchema, so anything required here becomes a way for a good grade
  // to fail. Absent or malformed → undefined, and the result page omits the
  // matrix. Never a reason to return null.
  const turnCount = learnerTurns(d).length

  let structure: TurnStructure[] | undefined
  if (Array.isArray(r.structure)) {
    const cells = (r.structure as unknown[]).map(x => {
      const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
      return {
        these: o.these === true,
        begruendung: o.begruendung === true,
        beispiel: o.beispiel === true,
        reacts: o.reacts === true
      }
    })
    // Pad or truncate to the real turn count — never reject on length.
    structure = Array.from({ length: turnCount }, (_, i) =>
      cells[i] ?? { these: false, begruendung: false, beispiel: false, reacts: false }
    )
  }

  let interaction: InteractionSummary | undefined
  const ri = r.interaction
  if (ri && typeof ri === 'object') {
    const o = ri as Record<string, unknown>
    if (typeof o.askedBack === 'number' && typeof o.rate === 'number') {
      interaction = {
        askedBack: Math.max(0, Math.round(o.askedBack)),
        rate: Math.max(0, Math.min(1, o.rate))
      }
    }
  }
```

- [ ] **Step 5: Extend the prompt**

In the prompt builder, after the existing criteria block, append — matching the file's existing string-concatenation style and its explicit-JSON-shape convention:

```ts
    'ZUSÄTZLICHE BESCHREIBENDE FELDER (beeinflussen die Punktzahl NICHT):\n' +
    '"structure": ein Array mit GENAU einem Objekt pro Lernerbeitrag, in derselben ' +
    'Reihenfolge wie die Beiträge. Jedes Objekt: {"these": <true|false>, ' +
    '"begruendung": <true|false>, "beispiel": <true|false>, "reacts": <true|false>}. ' +
    '"these" = der Beitrag vertritt eine Position; "begruendung" = er nennt einen Grund; ' +
    '"beispiel" = er nennt ein konkretes Beispiel; "reacts" = er geht auf den letzten ' +
    'Punkt des Partners ein.\n' +
    '"interaction": {"askedBack": <Anzahl echter Rückfragen an den Partner>, ' +
    '"rate": <Anteil der Beiträge mit reacts=true, als Dezimalzahl zwischen 0 und 1>}.\n' +
    'Diese beiden Felder sind BESCHREIBEND. Verteile dafür keine Punkte und ändere ' +
    'wegen ihnen keine Kriteriumsnote.\n\n'
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/composables/useSprechenGrader.test.ts && npm run typecheck`
Expected: PASS. Every pre-existing grader test must stay green — the fields are additive.

- [ ] **Step 7: Commit**

```bash
git add src/composables/useSprechenGrader.ts tests/composables/useSprechenGrader.test.ts
git commit -m "feat(sprechen): optional descriptive structure + interaction on the grader"
```

---

### Task 11: Rebuild `Teil2Result.vue`

**Files:**
- Rewrite: `src/modules/sprechen/Teil2Result.vue`
- Modify: `src/modules/sprechen/Teil2Runner.vue` (bank the yield at grade time)
- Test: `tests/modules/Teil2Result.test.ts` (new)

**Interfaces:**
- Consumes: `.spr-verdict`, `.spr-vscore`, `.spr-stamp`, `.spr-vgrid`, `.spr-vcrit*`, `.spr-block*`, `.spr-matrix`, `.spr-mx-*`, `.spr-rate*`, `.spr-mistake`, `.spr-mkcard`, `.spr-mk-*`, `.spr-counts`, `.spr-sw`, `.spr-overall`; Task 2's `matchRedemittel`; Task 3's `bumpRedemittelYield`; Task 4's `SprYield`; Task 10's `structure` / `interaction`.

Block order: verdict → Argumentation & Interaktion → Redemittel-Ausbeute → marked transcript → Stärken/Schwächen → Gesamturteil.

- [ ] **Step 1: Bank the yield in the runner's grade pipeline**

In `Teil2Runner.vue`, inside the `if (!runRecorded.value)` block, before `saveQuizRun`:

```ts
      // Bank the Redemittel yield now — the conversation is deleted moments
      // from here and can never be re-counted (CONTEXT.md → Redemittel yield).
      const matched = matchRedemittel(
        d.turns.filter(t => t.role === 'learner').map(t => t.textDe)
      ).map(r => r.id)
      bumpRedemittelYield(matched, finishedAt)
```

and add `sprechenRedemittel: matched` to the `meta` object. Import `bumpRedemittelYield` from `../../composables/useRedemittelYield`.

**The type declaration already exists.** Task 5 added `sprechenRedemittel?: string[]` to `QuizHistoryMeta` in `src/composables/useQuizHistory.ts` because the hub reads the field to count Redemittel per run, and `noUnusedLocals`-clean typecheck rejected reading an undeclared property. Do not add it a second time.

- [ ] **Step 2: Write the failing test**

Create `tests/modules/Teil2Result.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
import Teil2Result from '../../src/modules/sprechen/Teil2Result.vue'
import { SPRECHEN_B2_TEIL2 } from '../../src/data/rubrics'

const RESULT_KEY = 'gt:lastSprechenResult'   // confirm against the real stash key

function stash(over: Record<string, unknown> = {}) {
  sessionStorage.setItem(RESULT_KEY, JSON.stringify({
    topicTitle: 'Tempolimit',
    modality: 'typed',
    learnerTurns: ['Aus meiner Sicht brauchen wir das.', 'Wie sehen Sie das?'],
    result: {
      totalScore: 72, passes: true, praedikat: 'befriedigend',
      criteria: SPRECHEN_B2_TEIL2.criteria.map(c => ({
        key: c.key, labelDe: c.labelDe, maxPoints: c.maxPoints, score: 18,
        justificationDe: 'ok', justificationEn: 'ok'
      })),
      mistakes: [], strengths: [], weaknesses: [],
      overallDe: 'Gut gemacht.', overallEn: 'Well done.',
      ...over
    }
  }))
}

beforeEach(() => sessionStorage.clear())

describe('Teil2Result', () => {
  it('renders the score, stamp and four criterion bars', () => {
    stash(); const w = mount(Teil2Result)
    expect(w.find('.spr-vscore').text()).toContain('72')
    expect(w.find('.spr-stamp').text()).toContain('befriedigend')
    expect(w.findAll('.spr-vcrit')).toHaveLength(4)
  })

  it('prints each criterion descriptor verbatim from the rubric', () => {
    stash(); const w = mount(Teil2Result)
    expect(w.text()).toContain(SPRECHEN_B2_TEIL2.criteria[0].descriptorDe.slice(0, 40))
  })

  it('uses the spoken descriptor for a spoken Discussion', () => {
    stash()
    const s = JSON.parse(sessionStorage.getItem(RESULT_KEY)!)
    s.modality = 'spoken'
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(s))
    const w = mount(Teil2Result)
    expect(w.text()).toContain('SPRECHDATEN')
  })

  it('omits the matrix entirely when structure is absent', () => {
    stash(); const w = mount(Teil2Result)
    expect(w.find('.spr-matrix').exists()).toBe(false)
    expect(w.text()).not.toContain('Argumentation & Interaktion')
  })

  it('renders one matrix row per learner turn when structure is present', () => {
    stash({
      structure: [
        { these: true, begruendung: true, beispiel: false, reacts: false },
        { these: true, begruendung: true, beispiel: true, reacts: true }
      ],
      interaction: { askedBack: 1, rate: 0.5 }
    })
    const w = mount(Teil2Result)
    expect(w.findAll('.spr-mx-c.turn')).toHaveLength(2)
    expect(w.findAll('.spr-mx-mark.yes')).toHaveLength(6)
    expect(w.text()).toContain('50')
  })

  it('renders the per-Discussion Redemittel yield', () => {
    stash(); const w = mount(Teil2Result)
    // 'Aus meiner Sicht' and 'Wie sehen Sie das' are both real Redemittel.
    expect(w.find('.spr-yield').exists()).toBe(true)
    expect(w.findAll('.spr-tick.on')).toHaveLength(2)
  })

  it('re-anchors a mistake span by searching the turn text', () => {
    stash({ mistakes: [{
      turnIndex: 0, quote: 'brauchen wir das', suggested: 'brauchen wir es',
      kind: 'vocabulary', reasonDe: 'weil', reasonEn: 'because',
      spanStart: 9999, spanEnd: 9999   // stored offsets must be ignored
    }] })
    const w = mount(Teil2Result)
    expect(w.find('.spr-mistake').exists()).toBe(true)
    expect(w.find('.spr-mistake').text()).toBe('brauchen wir das')
  })

  it('opens one detail block when a mistake span is tapped', async () => {
    stash({ mistakes: [{
      turnIndex: 0, quote: 'brauchen wir das', suggested: 'brauchen wir es',
      kind: 'vocabulary', reasonDe: 'weil', reasonEn: 'because'
    }] })
    const w = mount(Teil2Result)
    expect(w.find('.spr-mkcard').exists()).toBe(false)
    await w.find('.spr-mistake').trigger('click')
    expect(w.findAll('.spr-mkcard')).toHaveLength(1)
    expect(w.find('.spr-mk-right').text()).toContain('brauchen wir es')
  })
})
```

Confirm `RESULT_KEY` and the stash shape against `SprechenResultStash` in `useSprechenGrader.ts:432` before running.

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/modules/Teil2Result.test.ts`
Expected: FAIL — no `.spr-vscore`.

- [ ] **Step 4: Write the verdict and matrix**

```ts
const rubricCriteria = SPRECHEN_B2_TEIL2.criteria

/**
 * §5.2: read the descriptor verbatim, never paraphrase it in the component.
 * The rubric carries a spoken variant on `kohaerenz` because a spoken
 * Discussion measures real tempo — pick it when the Modality is spoken.
 */
function descriptorFor(key: string): string {
  const def = rubricCriteria.find(c => c.key === key)
  if (!def) return ''
  return data.value?.modality === 'spoken' && def.descriptorSpokenDe
    ? def.descriptorSpokenDe
    : def.descriptorDe
}

const structure = computed(() => data.value?.result.structure ?? null)
const interaction = computed(() => data.value?.result.interaction ?? null)

/** The matrix's right column: the turn's opening sentence, local, no AI. */
function opener(text: string): string {
  const cut = text.search(/[.?!]/)
  const s = cut < 0 ? text : text.slice(0, cut + 1)
  return s.length > 90 ? `${s.slice(0, 88)}…` : s
}

const withExample = computed(
  () => (structure.value ?? []).filter(s => s.beispiel).length
)
const yieldIds = computed(
  () => matchRedemittel(data.value?.learnerTurns ?? []).map(r => r.id)
)
```

```html
<div class="spr-verdict">
  <div>
    <div class="spr-vscore spr-num">
      {{ result.totalScore }}<span class="denom">/100</span>
    </div>
    <div class="spr-stamp" :class="result.passes ? 'pass' : 'fail'">
      {{ result.praedikat }}
    </div>
  </div>
  <div class="spr-vgrid">
    <div v-for="c in result.criteria" :key="c.key" class="spr-vcrit">
      <div class="spr-vcrit-n">{{ c.labelDe }}</div>
      <div class="spr-vcrit-s spr-num">{{ c.score }}/{{ c.maxPoints }}</div>
      <div class="spr-vcrit-bar">
        <span class="spr-vcrit-fill" :style="{ width: `${(c.score / c.maxPoints) * 100}%` }" />
      </div>
      <p class="spr-vcrit-j">{{ lang === 'de' ? c.justificationDe : c.justificationEn }}</p>
      <p class="spr-vcrit-desc">{{ descriptorFor(c.key) }}</p>
    </div>
  </div>
</div>

<section v-if="structure" class="spr-block">
  <div class="spr-block-h">
    <h2 class="spr-block-t">Argumentation &amp; Interaktion</h2>
    <span class="spr-block-n">beschreibend · zählt nicht extra in die Note</span>
  </div>
  <div class="spr-matrix">
    <div class="spr-mx-h">Beitrag</div>
    <div class="spr-mx-h">These</div>
    <div class="spr-mx-h">Begründung</div>
    <div class="spr-mx-h">Beispiel</div>
    <div class="spr-mx-h">Reaktion</div>
    <div class="spr-mx-h q">Einstieg</div>
    <template v-for="(s, i) in structure" :key="i">
      <div class="spr-mx-c turn">L{{ i + 1 }}</div>
      <div class="spr-mx-c">
        <span class="spr-mx-mark" :class="s.these ? 'yes' : 'no'">{{ s.these ? '●' : '○' }}</span>
      </div>
      <div class="spr-mx-c">
        <span class="spr-mx-mark" :class="s.begruendung ? 'yes' : 'no'">{{ s.begruendung ? '●' : '○' }}</span>
      </div>
      <div class="spr-mx-c">
        <span class="spr-mx-mark" :class="s.beispiel ? 'yes' : 'no'">{{ s.beispiel ? '●' : '○' }}</span>
      </div>
      <div class="spr-mx-c">
        <span class="spr-mx-mark" :class="s.reacts ? 'yes' : 'no'">{{ s.reacts ? '●' : '○' }}</span>
      </div>
      <div class="spr-mx-c spr-mx-q">{{ opener(learnerTurns[i] ?? '') }}</div>
    </template>
  </div>
  <div class="spr-rate">
    <div class="spr-rate-i">
      <div class="spr-rate-n spr-num">{{ Math.round((interaction?.rate ?? 0) * 100) }} %</div>
      <div class="spr-rate-l">Interaktionsrate</div>
    </div>
    <div class="spr-rate-i">
      <div class="spr-rate-n spr-num">{{ withExample }} / {{ structure.length }}</div>
      <div class="spr-rate-l">Beiträge mit Beispiel</div>
    </div>
    <div class="spr-rate-i">
      <div class="spr-rate-n spr-num">{{ interaction?.askedBack ?? 0 }}</div>
      <div class="spr-rate-l">Rückfragen</div>
    </div>
    <p class="spr-rate-note">
      Argumentation und Interaktion stecken beide im Kriterium
      „Erfüllung / Interaktion". Diese Tabelle zeigt, woran es dort lag —
      sie verteilt selbst keine Punkte.
    </p>
  </div>
</section>

<section class="spr-block">
  <div class="spr-block-h">
    <h2 class="spr-block-t">Redemittel-Ausbeute</h2>
    <span class="spr-block-n">{{ yieldIds.length }} von 42 · lokal gezählt</span>
  </div>
  <SprYield :used-ids="yieldIds" note="In dieser Diskussion nicht benutzt." />
</section>
```

Keep the existing marked-transcript, mistake-detail, Stärken/Schwächen, Gesamturteil, fluency and DE/EN toggle logic; re-clothe them in `.spr-mistake`, `.spr-mkcard`, `.spr-mk-*`, `.spr-counts`, `.spr-sw`, `.spr-swlist`, `.spr-overall`. Keep re-anchoring by searching for `quote` — never trust stored offsets.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/modules/Teil2Result.test.ts tests/composables/useQuizHistory.sprechen.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/sprechen/Teil2Result.vue src/modules/sprechen/Teil2Runner.vue tests/modules/Teil2Result.test.ts
git commit -m "feat(sprechen): Auswertung with the Argumentation matrix and banked yield"
```

---

# Phase 6 — Archive, Korrekturdrill, history

### Task 12: The `sprechen-drill` history type

**Files:**
- Modify: `src/composables/useQuizHistory.ts:60`, `src/composables/useQuizStats.ts:143,202`, `src/components/charts/quiz-type-labels.ts:57,114,117`, `src/composables/useLevelAssessment.ts:142`, `src/modules/history/HistoryPage.vue:98,126`
- Modify: `tests/composables/useQuizHistory.sprechen.test.ts`

**Interfaces:**
- Produces: `'sprechen-drill'` as a `QuizHistoryType`, consumed by Task 13.

These are exhaustive `Record<QuizHistoryType, …>` maps, so `npm run typecheck` will name every site that still needs an entry. Add the union member first, then follow the compiler.

- [ ] **Step 1: Write the failing test**

Append to `tests/composables/useQuizHistory.sprechen.test.ts`:

```ts
import { QUIZ_TYPE_LABELS, QUIZ_TYPE_DE, QUIZ_TYPES_ORDER } from '../../src/components/charts/quiz-type-labels'

describe('sprechen-drill history type', () => {
  it('has an English and a German label', () => {
    expect(QUIZ_TYPE_LABELS['sprechen-drill']).toBeTruthy()
    expect(QUIZ_TYPE_DE['sprechen-drill']).toBeTruthy()
  })

  it('appears in the display order next to the Teil 2 entry', () => {
    const i2 = QUIZ_TYPES_ORDER.indexOf('sprechen-teil2')
    const id = QUIZ_TYPES_ORDER.indexOf('sprechen-drill')
    expect(id).toBeGreaterThan(-1)
    expect(id).toBe(i2 + 1)
  })

  it('records and reads back a drill Run', () => {
    saveQuizRun({
      type: 'sprechen-drill',
      startedAt: new Date(1000).toISOString(),
      finishedAt: new Date(2000).toISOString(),
      durationMs: 1000, count: 5, correct: 3,
      meta: { sprechenDrilledKinds: { grammar: 3, register: 2 } }
    })
    const row = loadHistory().find(h => h.type === 'sprechen-drill')
    expect(row?.correct).toBe(3)
    expect(row?.count).toBe(5)
  })
})
```

Match the existing file's imports and helpers rather than re-importing.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/composables/useQuizHistory.sprechen.test.ts`
Expected: FAIL — `'sprechen-drill'` is not assignable to `QuizHistoryType`.

- [ ] **Step 3: Add the union member and follow the compiler**

`src/composables/useQuizHistory.ts`, after `| 'sprechen-teil2'`:

```ts
  | 'sprechen-drill'
```

Then `npm run typecheck` and fill each error site:

- `quiz-type-labels.ts` → `QUIZ_TYPE_LABELS`: `'Sprechen · Korrekturdrill'`; `QUIZ_TYPE_DE`: `'Sprechen · Korrekturdrill'`; add `'sprechen-drill'` to `QUIZ_TYPES_ORDER` immediately after `'sprechen-teil2'`.
- `useQuizStats.ts` → `'sprechen-drill': 0` in the counts seed and `'sprechen-drill': emptyBucket()` in the accuracy seed.
- `HistoryPage.vue` → the label map entry `{ label: 'Sprechen — Korrekturdrill', de: 'Sprechen · Korrekturdrill', module: 'Sprechen' }`, and add `'sprechen-drill'` to the list at line 126.
- `useLevelAssessment.ts` → the description, worded so the assessor discounts it (ADR-0013):

```ts
  'sprechen-drill':
    'Sprechen Korrekturdrill — re-practice of the learner\'s OWN previously marked ' +
    'mistakes, replayed from the error archive. A high score means earlier corrections ' +
    'were revised successfully; it is NOT evidence of fresh B2 command, because every ' +
    'item was already a known weak spot.'
```

While in that file, fix line 142's stale wording: `sprechen-teil2` is no longer "typed discussion" — it is typed **or** spoken. Change it to `'Sprechen Teil 2 — discussion with an AI partner, typed or spoken (score 0-100, Goethe B2 rubric)'`.

- [ ] **Step 4: Run the tests**

Run: `npm run typecheck && npm test`
Expected: typecheck clean, suite green.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useQuizHistory.ts src/composables/useQuizStats.ts src/composables/useLevelAssessment.ts src/components/charts/quiz-type-labels.ts src/modules/history/HistoryPage.vue tests/composables/useQuizHistory.sprechen.test.ts
git commit -m "feat(sprechen): sprechen-drill history type (see ADR-0013)"
```

---

### Task 13: The Korrekturdrill

**Files:**
- Create: `src/modules/sprechen/SprechenDrill.vue`
- Modify: `src/router.ts` (one route after `sprechen-archive`)
- Test: `tests/modules/SprechenDrill.test.ts`

**Interfaces:**
- Consumes: `openCorrections()`, `recordDrillResult()` from `useSprechenArchive.ts`; `foldGerman()` from `drillGrading.ts`; `saveQuizRun()`; `.spr-remed`, `.spr-remed-ctx`, `.spr-remed-in`, `.spr-kinds` from Task 1; the `'sprechen-drill'` type from Task 12.

Grading is deterministic — `foldGerman` plus punctuation stripping against `suggested` (spec decision 9). Every attempt appends a `CorrectionEvent` (mandatory, ADR-0012); the session additionally saves a Run (ADR-0013).

- [ ] **Step 1: Write the failing test**

Create `tests/modules/SprechenDrill.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const recordDrillResult = vi.fn(async () => undefined)
const saveQuizRun = vi.fn()

vi.mock('../../src/composables/useSprechenArchive', () => ({
  openCorrections: vi.fn(async () => ([
    {
      id: 'c1', discussionId: 'd1', topicTitle: 'Tempolimit', modality: 'typed',
      kind: 'grammar', quote: 'wegen dem Vertrag', suggested: 'wegen des Vertrags',
      reasonDe: '„wegen" verlangt den Genitiv.', reasonEn: 'genitive',
      context: 'Ich konnte nicht kündigen, wegen dem Vertrag mit der Firma.',
      createdAt: 1000
    },
    {
      id: 'c2', discussionId: 'd1', topicTitle: 'Tempolimit', modality: 'typed',
      kind: 'register', quote: 'da hast du recht', suggested: 'da haben Sie recht',
      reasonDe: 'In der Prüfung wird gesiezt.', reasonEn: 'formal register',
      context: 'Naja, da hast du recht.', createdAt: 2000
    }
  ])),
  recordDrillResult
}))
vi.mock('../../src/composables/useQuizHistory', () => ({ saveQuizRun }))

import SprechenDrill from '../../src/modules/sprechen/SprechenDrill.vue'

beforeEach(() => { recordDrillResult.mockClear(); saveQuizRun.mockClear(); push.mockClear() })

async function mountDrill() {
  const w = mount(SprechenDrill)
  await flushPromises()
  return w
}

describe('SprechenDrill', () => {
  it('shows the learner\'s own sentence with the wrong span marked', async () => {
    const w = await mountDrill()
    expect(w.find('.spr-remed-ctx').text()).toContain('Ich konnte nicht kündigen')
    expect(w.find('.spr-remed-ctx .hit').text()).toBe('wegen dem Vertrag')
  })

  it('accepts the exact suggestion', async () => {
    const w = await mountDrill()
    await w.find('.spr-remed-in').setValue('wegen des Vertrags')
    await w.find('.btn-accent').trigger('click')
    expect(w.text()).toContain('Richtig')
    expect(recordDrillResult).toHaveBeenCalledWith('c1', true)
  })

  it('folds umlauts and ignores case and punctuation', async () => {
    const w = await mountDrill()
    await w.find('.spr-remed-in').setValue('  WEGEN DES VERTRAGS.  ')
    await w.find('.btn-accent').trigger('click')
    expect(recordDrillResult).toHaveBeenCalledWith('c1', true)
  })

  it('marks a wrong answer wrong, shows the reason, and keeps it open', async () => {
    const w = await mountDrill()
    await w.find('.spr-remed-in').setValue('wegen dem Vertrag')
    await w.find('.btn-accent').trigger('click')
    expect(w.text()).toContain('wegen des Vertrags')
    expect(w.text()).toContain('verlangt den Genitiv')
    expect(recordDrillResult).toHaveBeenCalledWith('c1', false)
  })

  it('advances to the next correction', async () => {
    const w = await mountDrill()
    await w.find('.spr-remed-in').setValue('wegen des Vertrags')
    await w.find('.btn-accent').trigger('click')
    await w.find('.drill-advance').trigger('click')
    expect(w.find('.spr-remed-ctx').text()).toContain('da hast du recht')
  })

  it('saves one Run for the session with first-try correct count', async () => {
    const w = await mountDrill()
    await w.find('.spr-remed-in').setValue('wegen des Vertrags')
    await w.find('.btn-accent').trigger('click')
    await w.find('.drill-advance').trigger('click')
    await w.find('.spr-remed-in').setValue('falsch')
    await w.find('.btn-accent').trigger('click')
    await w.find('.drill-advance').trigger('click')
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    const run = saveQuizRun.mock.calls[0][0]
    expect(run.type).toBe('sprechen-drill')
    expect(run.count).toBe(2)
    expect(run.correct).toBe(1)
  })

  it('shows an empty state when nothing is open', async () => {
    const mod = await import('../../src/composables/useSprechenArchive')
    vi.mocked(mod.openCorrections).mockResolvedValueOnce([])
    const w = await mountDrill()
    expect(w.text()).toContain('Nichts offen')
    expect(w.find('.spr-remed-in').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/modules/SprechenDrill.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

```vue
<script setup lang="ts">
// Korrekturdrill (CONTEXT.md → "Correction drill"). Replays the learner's own
// Archived corrections and asks them to rewrite just the marked wording.
//
// Grading is DETERMINISTIC — foldGerman plus punctuation stripping, no AI, so
// it works offline (ADR-0007). A miss is not punitive: the reveal teaches, and
// the item stays open and returns in a later session.
//
// Every attempt appends a CorrectionEvent — mandatory, because ADR-0012
// derives drilled-ness from that table rather than a boolean on the row. The
// session ALSO saves one Run (ADR-0013), which is why one drilled correction
// leaves two records.
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { openCorrections, recordDrillResult } from '../../composables/useSprechenArchive'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { foldGerman } from '../../composables/drillGrading'
import type { ArchivedCorrection } from '../../composables/useSprechenArchive'
import type { SprechenErrorTag } from '../../data/sprechenRedemittel'

const KIND_LABEL: Record<SprechenErrorTag, string> = {
  grammar: 'Grammatik', 'word-order': 'Wortstellung', vocabulary: 'Wortschatz',
  spelling: 'Rechtschreibung', register: 'Register'
}

const router = useRouter()
const items = ref<ArchivedCorrection[]>([])
const loading = ref(true)
const index = ref(0)
const answer = ref('')
const verdict = ref<'correct' | 'wrong' | null>(null)
const firstTryCorrect = ref(0)
const attempted = ref(0)
const startedAt = Date.now()
const finished = ref(false)

onMounted(async () => {
  try {
    items.value = await openCorrections(20)
  } catch {
    items.value = []
  }
  loading.value = false
})

const current = computed(() => items.value[index.value] ?? null)

/** Split the context on the wrong span so it can be marked inline. */
const parts = computed(() => {
  const c = current.value
  if (!c) return null
  const at = c.context.indexOf(c.quote)
  if (at < 0) return { before: '', hit: c.quote, after: '' }
  return {
    before: c.context.slice(0, at),
    hit: c.quote,
    after: c.context.slice(at + c.quote.length)
  }
})

function normalize(s: string): string {
  return foldGerman(s.replace(/[.,;:!?…„"']/g, '').replace(/\s+/g, ' ').trim().toLowerCase())
}

async function check() {
  const c = current.value
  if (!c || verdict.value !== null) return
  const ok = normalize(answer.value) === normalize(c.suggested)
  verdict.value = ok ? 'correct' : 'wrong'
  attempted.value += 1
  if (ok) firstTryCorrect.value += 1
  // Non-fatal: a lost event costs the learner a drilled mark, nothing more.
  try { await recordDrillResult(c.id, ok) } catch { /* ignore */ }
}

function next() {
  answer.value = ''
  verdict.value = null
  if (index.value + 1 >= items.value.length) { finish(); return }
  index.value += 1
}

function finish() {
  finished.value = true
  const at = Date.now()
  saveQuizRun({
    type: 'sprechen-drill',
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(at).toISOString(),
    durationMs: at - startedAt,
    count: attempted.value,
    // First-try only: an item missed here stays open and returns in a LATER
    // session, which is a different Run (ADR-0013).
    correct: firstTryCorrect.value
  })
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Sprechen · Fehlerarchiv</div>
        <h1 class="section-title">Korrekturdrill<em>.</em></h1>
        <p class="section-subtitle">
          Deine eigenen markierten Stellen, eine nach der anderen. Du tippst nur die
          Korrektur — nicht den ganzen Satz.
        </p>
      </div>
    </header>

    <p v-if="loading" class="loading-state">Archiv wird geladen …</p>

    <div v-else-if="items.length === 0" class="alert alert-info">
      <span class="alert-label">Nichts offen</span>
      Es gibt gerade keine offenen Korrekturen. Führe eine Diskussion — markierte
      Fehler landen automatisch hier.
    </div>

    <div v-else-if="finished" class="spr-remed">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Durch.</h2>
        <span class="spr-block-n">{{ firstTryCorrect }} von {{ attempted }} beim ersten Versuch</span>
      </div>
      <p class="spr-sub">
        Was du verfehlt hast, bleibt offen und kommt wieder.
      </p>
      <div class="setup-actions">
        <button class="btn btn-ghost" type="button"
          @click="router.push({ name: 'sprechen-archive' })">← Fehlerarchiv</button>
      </div>
    </div>

    <div v-else-if="current && parts" class="spr-remed">
      <div class="micro-mark">
        {{ index + 1 }} / {{ items.length }} ·
        {{ KIND_LABEL[current.kind] }} ·
        {{ current.topicTitle }}
      </div>

      <p class="spr-remed-ctx">
        {{ parts.before }}<span class="hit">{{ parts.hit }}</span>{{ parts.after }}
      </p>

      <input class="spr-remed-in" v-model="answer" :disabled="verdict !== null"
        placeholder="Wie muss die markierte Stelle heißen?"
        @keydown.enter.prevent="verdict === null ? check() : next()" />

      <div v-if="verdict === null" class="drill-advance">
        <button class="btn btn-accent" type="button" :disabled="!answer.trim()" @click="check">
          Prüfen
        </button>
      </div>

      <div v-else class="drill-feedback">
        <p class="feedback-line" :class="verdict === 'correct' ? 'correct' : 'wrong'">
          {{ verdict === 'correct' ? 'Richtig.' : 'Noch nicht.' }}
        </p>
        <div class="spr-mkcard">
          <div class="spr-mk-l">
            <span class="spr-mk-k">Du</span>
            <span class="spr-mk-wrong">{{ current.quote }}</span>
          </div>
          <div class="spr-mk-l">
            <span class="spr-mk-k">Besser</span>
            <span class="spr-mk-right">{{ current.suggested }}</span>
          </div>
          <p class="spr-mk-r">{{ current.reasonDe }}</p>
        </div>
        <button class="btn btn-accent drill-advance" type="button" @click="next">
          {{ index + 1 >= items.length ? 'Abschließen' : 'Weiter' }}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button"
        @click="router.push({ name: 'sprechen' })">← Sprechen</button>
    </div>
  </div>
</template>
```

`SprechenErrorTag` may live elsewhere — import it from wherever `useSprechenArchive.ts` imports it.

- [ ] **Step 4: Add the route and the hub row**

In `src/router.ts`, after the `sprechen-archive` entry:

```ts
  { path: '/sprechen/drill', name: 'sprechen-drill', component: () => import('./modules/sprechen/SprechenDrill.vue') }
```

Now that the route resolves, append the third shared row to `SprechenHome.vue`'s `rows` array:

```ts
  {
    n: 'III', route: 'sprechen-drill', title: 'Korrekturdrill',
    de: 'Deine Sätze, noch einmal',
    desc: 'Spielt deine eigenen markierten Stellen aus — du tippst nur die Korrektur. Was du richtig hast, gilt als nachgeübt.'
  }
```

and update `tests/modules/SprechenHome.test.ts`'s shared-rows case to expect three rows, the third containing `Korrekturdrill`.

`metaFor()` currently returns the archive counts for any non-cheatsheet row. Give the drill row its own branch so the two rows do not read identically:

```ts
  if (route === 'sprechen-drill') {
    return [`${archive.value.open} offen`, `${archive.value.total - archive.value.open} nachgeübt`]
  }
```

placed after the three state guards and before the `sprechen-archive` return.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/modules/SprechenDrill.test.ts tests/modules/SprechenHome.test.ts && npm run typecheck && npm test`
Expected: PASS, whole suite green.

- [ ] **Step 6: Commit**

```bash
git add src/modules/sprechen/SprechenDrill.vue src/router.ts src/modules/sprechen/SprechenHome.vue tests/modules/SprechenDrill.test.ts
git commit -m "feat(sprechen): Korrekturdrill over the Error archive"
```

---

### Task 14: Re-skin `SprechenArchive.vue`

**Files:**
- Rewrite (template + styles): `src/modules/sprechen/SprechenArchive.vue`

**Interfaces:**
- Consumes: `.spr-kinds`, `.spr-kind`, `.spr-kind-n`, `.spr-kind-t`, `.spr-kind-b`, `.spr-arow`, `.spr-adate`, `.spr-actx`, `.spr-acorr`, `.spr-atopic` from Task 1.

Behaviour is already correct (committed today). Re-skin only, plus a link to the Korrekturdrill.

- [ ] **Step 1: Map the classes**

| Current | New |
|---|---|
| `.kind-tiles`, `.kind-tile`, `.kt-count`, `.kt-label` | `.spr-kinds`, `.spr-kind` (+ `.on`), `.spr-kind-n`, `.spr-kind-t` |
| `.archive-list`, `.archive-row` | `.spr-rows`, `.spr-arow` |
| `.ar-date` | `.spr-adate` |
| `.ar-context`, `.ar-mistake` | `.spr-actx` with the wrong span as `<span class="hit">` |
| `.ar-fix`, `.ar-fix-label`, `.ar-fix-text`, `.ar-reason` | `.spr-acorr` with `<b>` around the suggestion |
| `.ar-topic` | `.spr-atopic` |

- [ ] **Step 2: Add the drilled-vs-open progress strip to each kind tile**

Each `.spr-kind` gains a five-segment strip showing how much of that tag is nachgeübt. Reuse the existing drilled-ids read:

```html
<div class="spr-kind-b">
  <span v-for="s in 5" :key="s" :class="{ on: s <= drilledSegments(kind) }" />
</div>
```

```ts
/** Five segments, so the strip reads at a glance rather than exactly. */
function drilledSegments(kind: SprechenErrorTag): number {
  const total = counts.value[kind] ?? 0
  if (total === 0) return 0
  const done = total - openByKind.value[kind]
  return Math.round((done / total) * 5)
}
```

Derive `openByKind` from the data the component already loads — do not add a second archive read.

- [ ] **Step 3: Add the Korrekturdrill call to action**

Below the rows:

```html
<div class="setup-actions">
  <button class="btn btn-accent" type="button"
    :disabled="openTotal === 0" @click="router.push({ name: 'sprechen-drill' })">
    Korrekturdrill starten <span aria-hidden="true">→</span>
  </button>
</div>
```

- [ ] **Step 4: Add a mount test**

Create `tests/modules/SprechenArchive.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const row = (id: string, kind: string) => ({
  id, discussionId: 'd1', topicTitle: 'Tempolimit', modality: 'typed', kind,
  quote: 'wegen dem Vertrag', suggested: 'wegen des Vertrags',
  reasonDe: 'Genitiv.', reasonEn: 'genitive',
  context: 'Ich kündigte nicht, wegen dem Vertrag mit der Firma.', createdAt: 1000
})

vi.mock('../../src/composables/useSprechenArchive', () => ({
  listCorrections: vi.fn(async () => [row('c1', 'grammar'), row('c2', 'register')]),
  countsByKind: vi.fn(async () => ({
    grammar: 1, 'word-order': 0, vocabulary: 0, spelling: 0, register: 1
  })),
  drilledIds: vi.fn(async () => new Set(['c1'])),
  openCorrections: vi.fn(async () => [row('c2', 'register')])
}))

import SprechenArchive from '../../src/modules/sprechen/SprechenArchive.vue'

beforeEach(() => push.mockClear())

describe('SprechenArchive', () => {
  it('renders a counter tile per Sprechen error tag', async () => {
    const w = mount(SprechenArchive); await flushPromises()
    expect(w.findAll('.spr-kind')).toHaveLength(5)
  })

  it('renders the drilled-vs-open strip on each tile', async () => {
    const w = mount(SprechenArchive); await flushPromises()
    expect(w.findAll('.spr-kind-b')).toHaveLength(5)
  })

  it('marks the wrong span inside the learner sentence', async () => {
    const w = mount(SprechenArchive); await flushPromises()
    expect(w.find('.spr-actx .hit').text()).toBe('wegen dem Vertrag')
  })

  it('filters the rows when a tile is clicked', async () => {
    const w = mount(SprechenArchive); await flushPromises()
    const before = w.findAll('.spr-arow').length
    await w.findAll('.spr-kind')[0].trigger('click')
    await flushPromises()
    expect(w.findAll('.spr-arow').length).toBeLessThanOrEqual(before)
    expect(w.findAll('.spr-kind')[0].classes()).toContain('on')
  })

  it('routes to the Korrekturdrill', async () => {
    const w = mount(SprechenArchive); await flushPromises()
    await w.find('.btn-accent').trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'sprechen-drill' })
  })
})
```

Match the mocked function names to whatever the component actually imports — read it first.

- [ ] **Step 5: Verify**

Run: `npx vitest run tests/modules/SprechenArchive.test.ts tests/db/sprechenArchive.test.ts && npm run typecheck`
Expected: PASS — the repository tests are untouched by a re-skin.

- [ ] **Step 6: Manually verify**

At `localhost:5199/#/sprechen/archive`: tag counters filter on click, the wrong span is marked inside the learner's sentence, the drill button is disabled with an empty archive.

- [ ] **Step 7: Commit**

```bash
git add src/modules/sprechen/SprechenArchive.vue tests/modules/SprechenArchive.test.ts
git commit -m "refactor(sprechen): Fehlerarchiv on the .spr-* ledger vocabulary"
```

---

# Phase 7 — Cheatsheet and release

### Task 15: Re-skin `SprechenCheatsheet.vue`

**Files:**
- Rewrite: `src/modules/sprechen/SprechenCheatsheet.vue`

**Interfaces:**
- Consumes: `.plate` / `.mini-table` from `src/styles/modules.css` (ported in the DW/DaC import); Task 3's `lifetimeCounts()`.

**No part tab strip** — Teil 1 does not exist, and a one-live-tab segmented control is noise (spec decision 3). Rebuild the existing Move tabs on `.plate` / `.mini-table` and add the lifetime usage dot per phrase.

- [ ] **Step 1: Read the reference primitives**

Read how `DirectionWordsCheatsheet.vue` or `DaCompoundsCheatsheet.vue` uses `.plate` (numeral + title + German header over a body) and `.mini-table` (mono uppercase headers, `.t-de` / `.t-mono` / `.t-it` / `.t-ex` cell modifiers). Match that structure exactly.

- [ ] **Step 2: Add the usage dot**

```ts
import { lifetimeCounts } from '../../composables/useRedemittelYield'
const lifetime = lifetimeCounts()
function everUsed(id: string): boolean { return (lifetime[id] ?? 0) > 0 }
```

Render a filled/hollow mark in each phrase row: `<span class="spr-usedot" :class="{ on: everUsed(r.id) }">{{ everUsed(r.id) ? '●' : '○' }}</span>`, with `.spr-usedot { color: var(--mute) } .spr-usedot.on { color: var(--accent) }` scoped.

- [ ] **Step 3: Add one `.plate` for the Bauplan**

Keep the existing "how Teil 2 works" copy, rendered as a `.plate` with the four-step Bauplan These → Begründung → Beispiel → Rückfrage as a `.mini-table`. This is the copy the Argumentation matrix's columns correspond to — keep the four names identical so the two screens agree.

- [ ] **Step 4: Add a mount test**

Create `tests/modules/SprechenCheatsheet.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { REDEMITTEL_YIELD_KEY } from '../../src/composables/useRedemittelYield'
import { SPRECHEN_REDEMITTEL } from '../../src/data/sprechenRedemittel'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
import SprechenCheatsheet from '../../src/modules/sprechen/SprechenCheatsheet.vue'

beforeEach(() => localStorage.clear())

describe('SprechenCheatsheet', () => {
  it('renders every Redemittel across all seven Moves', () => {
    const w = mount(SprechenCheatsheet)
    expect(w.findAll('.spr-usedot')).toHaveLength(SPRECHEN_REDEMITTEL.length)
  })

  it('renders no part tab strip — Teil 1 does not exist', () => {
    const w = mount(SprechenCheatsheet)
    expect(w.text()).not.toContain('Vortrag')
    expect(w.text()).not.toContain('Vortragsmittel')
  })

  it('fills the usage dot only for phrases in the lifetime rollup', () => {
    localStorage.setItem(REDEMITTEL_YIELD_KEY, JSON.stringify({
      'rm-agree-1': { count: 2, lastAt: 1 }
    }))
    const w = mount(SprechenCheatsheet)
    expect(w.findAll('.spr-usedot.on')).toHaveLength(1)
  })

  it('renders the four Bauplan steps with the matrix column names', () => {
    const w = mount(SprechenCheatsheet)
    for (const step of ['These', 'Begründung', 'Beispiel', 'Rückfrage']) {
      expect(w.text()).toContain(step)
    }
  })
})
```

- [ ] **Step 5: Verify**

Run: `npx vitest run tests/modules/SprechenCheatsheet.test.ts && npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 6: Manually verify**

At `localhost:5199/#/sprechen/cheatsheet`: all seven Move groups render, the usage dots reflect the rollup, no tab strip appears.

- [ ] **Step 7: Commit**

```bash
git add src/modules/sprechen/SprechenCheatsheet.vue tests/modules/SprechenCheatsheet.test.ts
git commit -m "refactor(sprechen): Redemittel cheatsheet on .plate/.mini-table with usage dots"
```

---

### Task 16: Full verification and release

**Files:**
- Modify: `src/data/changelog.ts`, `package.json`

- [ ] **Step 1: Full suite and typecheck**

Run: `npm run typecheck && npm test`
Expected: typecheck clean; test count ≥ the Task 0 baseline, zero failures. **Do not proceed with any red test.**

- [ ] **Step 2: Manual pass — every screen, both themes, four widths**

Start: `npm run dev -- --port 5199 --strictPort`, browse `localhost:5199` (IPv6 `localhost`, not `127.0.0.1`).

At 1440 / 1080 / 720 / 480 px in light **and** dark:

- `#/sprechen` — masthead paired bars; two part panels; Teil 1 dead and unclickable; three shared rows; yield; recent runs.
- `#/sprechen/teil2` — browser + sticky card; card unsticks at 1080; five fields, Modalität first.
- `#/sprechen/teil2/prep` — angle columns collapse at 720; timer left-aligns.
- `#/sprechen/teil2/run` — run one **typed** Discussion end to end and one **spoken**; rail unsticks at 1080; stepper labels appear; nudge appears from turn 2 and dismisses; drawer inserts a phrase at the caret.
- `#/sprechen/teil2/result` — verdict, matrix (drops its quote column at 720), yield, marked transcript, mistake detail.
- `#/sprechen/archive` and `#/sprechen/drill`.
- `#/sprechen/cheatsheet`.

- [ ] **Step 3: Verify the punctuation fix end to end**

After the spoken Discussion, confirm its Auswertung yield is non-empty and that a comma-carrying phrase spoken without a comma (e.g. say *„Ich bin der Ansicht dass wir handeln müssen"*) shows as a filled tick. This is the regression the matcher exists to prevent.

- [ ] **Step 4: Verify a palette override still applies**

Change the accent in the tweaks panel and confirm `.spr-crit-fill`, `.spr-tick.on`, `.spr-titem.sel` and `.spr-move.on` follow it. The `usePalette` contract is test-locked; a hardcoded colour in the port would break it.

- [ ] **Step 5: Bump the version**

`src/data/changelog.ts`: set `APP_VERSION = '1.16.00'` and prepend an entry describing the Sprechen revamp, the Korrekturdrill, the Redemittel yield and the Argumentation matrix. Commit.

```bash
git add src/data/changelog.ts
git commit -m "chore: changelog 1.16.00"
```

- [ ] **Step 6: Bump package.json**

Set `"version": "1.16.00"`. Commit separately.

```bash
git add package.json
git commit -m "chore: bump version to 1.16.00"
```

- [ ] **Step 7: Hand back**

Do **not** merge, push or deploy. Report the suite result and the manual-pass findings, and let the user run the release ritual.

---

## Self-Review

**Spec coverage**

| Spec item | Task |
|---|---|
| Decision 1 — all four tiers, minus Teil 1 | whole plan |
| Decision 2 — Modality first in the Prüfungskarte | 6 |
| Decision 3 — dead stamped Teil 1 panel | 1 (`.spr-part.dead`), 5 |
| Decision 4 — descriptive, not scored | 10, 11 |
| Decision 5 — optional, degrades silently | 10 |
| Decision 6 — yield banked at grade time | 3, 11 |
| Decision 7 — strip all punctuation | 2 |
| Decision 8 — nudge: this run, lifetime tie-break | 2, 9 |
| Decision 9 — deterministic drill grading | 13 |
| Decision 10 — `sprechen-drill` Run, ADR-0013 | 12, 13 |
| Decision 11 — `src/styles/sprechen.css` | 1 |
| Decision 12 — masthead compares Modalities | 4, 5 |
| §5.1 cheatsheet, no tab strip | 15 |
| `descriptorSpokenDe` on the result | 11 |
| Runner rail tempo for spoken | 8 |
| Archive re-skin | 14 |
| Release 1.16.00 | 16 |

**Out-of-scope confirmations:** no task creates a Teil 1 route, component, rubric, history type or `part` field; no task edits `SPRECHEN_B2_TEIL2`; no task adds a CSS token; no task bumps the Dexie version.

**Type consistency:** `matchRedemittel` / `movePerTurn` / `pickMoveNudge` (Task 2) are called with those exact names in Tasks 5, 8, 9, 11. `lifetimeCounts()` (Task 3) is used in Tasks 5, 9, 15. `CriterionScore` is exported from `SprCriterionBars.vue` (Task 4) and imported by name in Task 5. `TurnStructure` / `InteractionSummary` (Task 10) are consumed in Task 11. `bumpRedemittelYield(ids, at)` (Task 3) is called with that signature in Task 11.

**Known soft spots the implementer must resolve by reading, not guessing:** the exact names of `pool` / `done` / `mySide` / `myAngles` / `theirAngles` / `hintsOn` / `draft` / `wordCount` / `partnerThinking` / `activeMove` / `drawerTab` / `kiTipp` in the existing `Teil2Setup.vue`, `Teil2Prep.vue` and `Teil2Runner.vue`; the real `SprechenResultStash` key and shape; and where `SprechenErrorTag` is exported from. Every one is a read-the-file question with a single right answer.
