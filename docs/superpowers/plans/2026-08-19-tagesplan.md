# Tagesplan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A read-only "Tagesplan" panel at the top of Home that lists what currently asks for attention — Korrekturdrill offen/fällig, wackelige Dativ-Wörter, schwache Präpositionen/Verben, lowest mastery bands — each row deep-linking into the owning module (ADR-0026).

**Architecture:** One new pure-aggregation composable `useTagesplan.ts` reads the five existing public readers and returns typed rows; one new component `TagesplanPanel.vue` renders them on Home. Aggregate, never sample: no drill logic changes anywhere.

**Tech Stack:** Vue 3 `<script setup>`, Dexie (fake-indexeddb in tests), localStorage stores, Vitest + @vue/test-utils.

## Global Constraints

- ADR-0026: read-only. This plan touches NO drill, setup, or store-writing code.
- Fail-soft: any reader that throws hides its row(s); `buildTagesplan` never rejects.
- German row copy exactly as specified in Task 1's table (lowercase state words offen/fällig).
- Rows render only when something asks for attention; all-empty → the panel renders nothing at all (no header, no empty-state box).
- Test convention: mock `Date.now` via `vi.spyOn(Date, 'now')`, never `vi.useFakeTimers()`.
- Run tests with `npx vitest run <file>`; typecheck via `npm run typecheck` (vue-tsc).
- Never `git add -A` — explicit paths only.

---

### Task 1: useTagesplan composable

**Files:**
- Create: `src/composables/useTagesplan.ts`
- Test: `tests/composables/useTagesplan.test.ts` (new)

**Interfaces:**
- Consumes (all existing):
  - `openCorrections(limit?, part?, module?): Promise<ArchivedCorrection[]>`, `dueCorrections(part?, module?, now?): Promise<QueuedCorrection[]>` from `./useSprechenArchive`
  - `readDativeLedger(): DativeLedger`, `ledgerState(entry): 'new'|'wackelig'|'gesichert'` from `./useDativeLedger`
  - `computeWeakPoints(entries): WeakPoints` (`weakPreps: WeakPrep[]` score desc, `WeakPrep.german`) from `./usePrepRemedial`
  - `computeVerbWeakPoints(entries): VerbWeakPoints` (`weakVerbs: WeakVerb[]` score desc, `WeakVerb.verbKey`) from `./useVerbSentenceStats`
  - `computeDrillMastery(entries): Record<string, DrillMastery>` (`{ key, band, accuracy, total, lastAt }`) from `./useDrillMastery`
  - `DW_FAMILIES, DAC_PHASES, DAT_FAMILIES: DrillFamily[]` (cards carry `code, route, title, de`) from `../data/drillCatalogue`
  - `type QuizHistoryEntry` from `./useQuizHistory`
- Produces (Task 2 relies on these EXACT names/types):

```ts
export interface TagesplanRow {
  id: string        // 'korrekturen' | 'dativ-wackelig' | 'schwache-praepositionen' | 'schwache-verben' | `band-${masteryKey}`
  title: string
  detail: string
  route: string     // vue-router route NAME
  count: number
}
export async function buildTagesplan(entries: QuizHistoryEntry[], now?: number): Promise<TagesplanRow[]>
```

- [ ] **Step 1: Write the failing tests** — `tests/composables/useTagesplan.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { buildTagesplan } from '../../src/composables/useTagesplan'
import { appendCorrections, recordDrillResult, clearArchive } from '../../src/composables/useSprechenArchive'
import { LEDGER_KEY } from '../../src/composables/useDativeLedger'
import type { ArchivedCorrection } from '../../src/composables/useSprechenArchive'
import type { QuizHistoryEntry } from '../../src/composables/useQuizHistory'

const DAY = 86_400_000
const base: Omit<ArchivedCorrection, 'id' | 'createdAt'> = {
  discussionId: 'd-1', topicTitle: 'Ehrenamt', modality: 'typed',
  kind: 'grammar', quote: 'für die Wettkämpfe', suggested: 'zu den Wettkämpfen',
  reasonDe: 'Ziel: zu + Dativ.', reasonEn: 'Destination takes zu.', context: 'Ich bin für die Wettkämpfe gefahren.'
}

beforeEach(async () => {
  await clearArchive()
  localStorage.clear()
})

describe('buildTagesplan (ADR-0026)', () => {
  it('empty state → no rows at all', async () => {
    expect(await buildTagesplan([])).toEqual([])
  })

  it('Korrekturen row counts offen and fällig side by side and links to the drill', async () => {
    const [a] = await appendCorrections([{ ...base, quote: 'a' }])
    await appendCorrections([{ ...base, quote: 'b' }, { ...base, quote: 'c' }])
    await recordDrillResult(a.id, true)
    const rows = await buildTagesplan([], Date.now() + 4 * DAY)  // a is fällig (3-day interval elapsed)
    const k = rows.find(r => r.id === 'korrekturen')!
    expect(k.route).toBe('sprechen-drill')
    expect(k.count).toBe(3)
    expect(k.detail).toBe('2 offen · 1 fällig')
    expect(rows[0].id).toBe('korrekturen')   // first section in order
  })

  it('Dativ row lists up to three wackelige items, longest-unseen first, and the surplus as +N', async () => {
    // seed the ledger store directly: four wackelig entries (last encounter wrong)
    const entry = (lastAt: number) => ({ recent: [false], encounters: 1, lastAt })
    localStorage.setItem(LEDGER_KEY, JSON.stringify({
      helfen: entry(4_000), danken: entry(1_000), folgen: entry(3_000), gehören: entry(2_000)
    }))
    const rows = await buildTagesplan([])
    const d = rows.find(r => r.id === 'dativ-wackelig')!
    expect(d.route).toBe('dative')
    expect(d.count).toBe(4)
    expect(d.detail).toBe('danken · gehören · folgen · +1')
    expect(d.title).toBe('Dativ · Wackelige Wörter')
  })

  it('gesichert and new ledger entries produce no Dativ row', async () => {
    localStorage.setItem(LEDGER_KEY, JSON.stringify({
      helfen: { recent: [true, true, true], encounters: 3, lastAt: 1 }
    }))
    expect((await buildTagesplan([])).find(r => r.id === 'dativ-wackelig')).toBeUndefined()
  })

  it('band rows come from the mastery rollup, lowest band first, capped at three, titled from the catalogue', async () => {
    // rollup shape per useDrillMastery: Record<key, { runs, total, correct, lastAt }>
    localStorage.setItem('gt:drillTotals', JSON.stringify({
      'dat-T10': { runs: 1, total: 4, correct: 1, lastAt: 1 },   // band 1
      'dw-T1':  { runs: 2, total: 12, correct: 7, lastAt: 1 },   // band 2 (>=10, acc .583)
      'dac-T5': { runs: 1, total: 5, correct: 1, lastAt: 1 },    // band 1 (acc .2)
      'dat-T6': { runs: 9, total: 80, correct: 76, lastAt: 1 },  // band 5 — never shown
    }))
    localStorage.setItem('gt:drillTotalsSeeded', '1')
    const rows = await buildTagesplan([])
    const bands = rows.filter(r => r.id.startsWith('band-'))
    expect(bands).toHaveLength(3)
    expect(bands[0].id).toBe('band-dac-T5')       // band 1, accuracy .2 < .25
    expect(bands[1].id).toBe('band-dat-T10')      // band 1, accuracy .25
    expect(bands[2].id).toBe('band-dw-T1')        // band 2
    expect(bands[1].route).toBe('dative-free')    // catalogue card route for dat T10
    expect(bands[1].detail).toBe('Band 1 · 25 % · 4 Fragen')
    expect(bands[1].count).toBe(1)
  })

  it('a rollup key with no catalogue card is skipped silently', async () => {
    localStorage.setItem('gt:drillTotals', JSON.stringify({
      'dw-T99': { runs: 1, total: 4, correct: 1, lastAt: 1 }
    }))
    localStorage.setItem('gt:drillTotalsSeeded', '1')
    expect((await buildTagesplan([])).filter(r => r.id.startsWith('band-'))).toHaveLength(0)
  })

  it('weak-point rows appear only when history evidence yields scored items', async () => {
    // No history → neither row
    const rows = await buildTagesplan([])
    expect(rows.find(r => r.id === 'schwache-praepositionen')).toBeUndefined()
    expect(rows.find(r => r.id === 'schwache-verben')).toBeUndefined()
  })

  it('section order is korrekturen, dativ, preps, verbs, bands', async () => {
    await appendCorrections([{ ...base }])
    localStorage.setItem(LEDGER_KEY, JSON.stringify({ helfen: { recent: [false], encounters: 1, lastAt: 1 } }))
    localStorage.setItem('gt:drillTotals', JSON.stringify({ 'dat-T10': { runs: 1, total: 4, correct: 1, lastAt: 1 } }))
    localStorage.setItem('gt:drillTotalsSeeded', '1')
    const ids = (await buildTagesplan([])).map(r => r.id)
    expect(ids).toEqual(['korrekturen', 'dativ-wackelig', 'band-dat-T10'])
  })
})
```

  Note on the weak-prep/weak-verb positive path: crafting valid `QuizHistoryEntry` fixtures for `computeWeakPoints` requires that module's meta shape. Look at the existing fixtures in `tests/composables/usePrepRemedial.test.ts` (or the nearest test importing `computeWeakPoints`) and add ONE positive test per weak row reusing that fixture style: at least one prep with `score > 0` → row `{ id: 'schwache-praepositionen', title: 'Präpositionen · Schwache Stellen', route: 'prepositions-remedial', count: <weak count>, detail: '<german names of top ≤3 joined with " · ">' }`, and the analogous verb row (`id: 'schwache-verben'`, title `'Verben · Schwache Stellen'`, route `'verbs-remedial'`, names from `verbKey`). If no existing fixture file exists, derive the minimal entry from reading `computeWeakPoints`/`computeVerbWeakPoints` source.

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/composables/useTagesplan.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `src/composables/useTagesplan.ts`:**

```ts
// Tagesplan (ADR-0026) — the read-only "what should I practise today" aggregation.
// Reads each tracking store through its public reader and returns display rows;
// it never samples, weights, or writes. Every reader is fail-soft: a throwing
// source drops its row(s) instead of breaking Home. No Vue/DOM.

import { openCorrections, dueCorrections } from './useSprechenArchive'
import { readDativeLedger, ledgerState } from './useDativeLedger'
import { computeWeakPoints } from './usePrepRemedial'
import { computeVerbWeakPoints } from './useVerbSentenceStats'
import { computeDrillMastery } from './useDrillMastery'
import { DW_FAMILIES, DAC_PHASES, DAT_FAMILIES, type DrillCard } from '../data/drillCatalogue'
import type { QuizHistoryEntry } from './useQuizHistory'

export interface TagesplanRow {
  id: string
  title: string
  detail: string
  route: string
  count: number
}

const MODULE_LABEL: Record<string, string> = {
  dw: 'Richtungswörter',
  dac: 'Pronominaladverbien',
  dat: 'Dativ',
}

/** 'dw-T1' → its catalogue card, or null when no card carries that code. */
function cardFor(masteryKey: string): { card: DrillCard; module: string } | null {
  const [module, code] = masteryKey.split('-', 2)
  const families = module === 'dw' ? DW_FAMILIES : module === 'dac' ? DAC_PHASES : module === 'dat' ? DAT_FAMILIES : null
  if (!families || !code) return null
  for (const family of families) {
    const card = family.cards.find(c => c.code === code)
    if (card) return { card, module }
  }
  return null
}

function joinNames(names: string[], max: number): string {
  const shown = names.slice(0, max)
  const rest = names.length - shown.length
  return rest > 0 ? `${shown.join(' · ')} · +${rest}` : shown.join(' · ')
}

export async function buildTagesplan(
  entries: QuizHistoryEntry[], now: number = Date.now()
): Promise<TagesplanRow[]> {
  const rows: TagesplanRow[] = []

  // 1 — Korrekturdrill: offen + fällig (ADR-0025 states, shown side by side, never summed)
  try {
    const [open, due] = await Promise.all([openCorrections(), dueCorrections(undefined, undefined, now)])
    if (open.length + due.length > 0) {
      rows.push({
        id: 'korrekturen',
        title: 'Korrekturdrill',
        detail: `${open.length} offen · ${due.length} fällig`,
        route: 'sprechen-drill',
        count: open.length + due.length,
      })
    }
  } catch { /* fail-soft: row omitted */ }

  // 2 — Dativ ledger: wackelige items, longest-unseen first
  try {
    const ledger = readDativeLedger()
    const shaky = Object.entries(ledger)
      .filter(([, e]) => ledgerState(e) === 'wackelig')
      .sort((a, b) => a[1].lastAt - b[1].lastAt)
      .map(([key]) => key)
    if (shaky.length > 0) {
      rows.push({
        id: 'dativ-wackelig',
        title: 'Dativ · Wackelige Wörter',
        detail: joinNames(shaky, 3),
        route: 'dative',
        count: shaky.length,
      })
    }
  } catch { /* fail-soft */ }

  // 3 + 4 — weak points (prep, verb): evidence-scored from the history window
  try {
    const weak = computeWeakPoints(entries).weakPreps.filter(p => p.score > 0)
    if (weak.length > 0) {
      rows.push({
        id: 'schwache-praepositionen',
        title: 'Präpositionen · Schwache Stellen',
        detail: joinNames(weak.map(p => p.german), 3),
        route: 'prepositions-remedial',
        count: weak.length,
      })
    }
  } catch { /* fail-soft */ }
  try {
    const weak = computeVerbWeakPoints(entries).weakVerbs.filter(v => v.score > 0)
    if (weak.length > 0) {
      rows.push({
        id: 'schwache-verben',
        title: 'Verben · Schwache Stellen',
        detail: joinNames(weak.map(v => v.verbKey), 3),
        route: 'verbs-remedial',
        count: weak.length,
      })
    }
  } catch { /* fail-soft */ }

  // 5 — lowest mastery bands (1–2): the drills that most need work, capped at 3
  try {
    const mastery = Object.values(computeDrillMastery(entries))
      .filter(m => m.band >= 1 && m.band <= 2)
      .sort((a, b) => (a.band - b.band) || (a.accuracy - b.accuracy) || (b.total - a.total))
    let added = 0
    for (const m of mastery) {
      if (added >= 3) break
      const hit = cardFor(m.key)
      if (!hit) continue
      rows.push({
        id: `band-${m.key}`,
        title: `${MODULE_LABEL[hit.module]} · ${hit.card.de}`,
        detail: `Band ${m.band} · ${Math.round(m.accuracy * 100)} % · ${m.total} Fragen`,
        route: hit.card.route,
        count: 1,
      })
      added += 1
    }
  } catch { /* fail-soft */ }

  return rows
}
```

  IMPORTANT check while implementing: the band test asserts `bands[1].title` comes from the catalogue — verify the actual `de` value of the dat-T10 card in `DAT_FAMILIES` (route `dative-free`) and adjust the TEST's title assertion if you asserted one (the sample tests above deliberately assert only `route`/`detail`/`count` for band rows — keep it that way unless you add a title assertion with the real catalogue value).

- [ ] **Step 4: Run tests** — `npx vitest run tests/composables/useTagesplan.test.ts` → PASS. Then `npm run typecheck` → exit 0.

- [ ] **Step 5: Commit** — controller commits (implementers do not run git).

---

### Task 2: TagesplanPanel component on Home

**Files:**
- Create: `src/modules/home/TagesplanPanel.vue`
- Modify: `src/modules/home/Home.vue` (mount the panel between `</header>` and `<div class="module-grid">`)
- Test: `tests/modules/TagesplanPanel.test.ts` (new)

**Interfaces:**
- Consumes from Task 1: `buildTagesplan(entries): Promise<TagesplanRow[]>`, `type TagesplanRow` from `../../composables/useTagesplan`; `loadHistory()` from `../../composables/useQuizHistory`.
- Produces: nothing consumed later.

- [ ] **Step 1: Write the failing tests** — `tests/modules/TagesplanPanel.test.ts`: mock `../../src/composables/useTagesplan` (`buildTagesplan: vi.fn()`); mount `TagesplanPanel` with a router stub (follow the mount conventions of `tests/modules/SprechenHome.test.ts` — same helpers, same flushPromises pattern). Cases: (a) `buildTagesplan` resolves `[]` → the component renders NOTHING (`wrapper.find('.tagesplan').exists()` is false); (b) two rows → both rendered with title, detail, and count badge text; (c) clicking a row pushes its route name (assert on the router mock); (d) `buildTagesplan` rejects → renders nothing (fail-soft).

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/modules/TagesplanPanel.test.ts` → FAIL.

- [ ] **Step 3: Implement `TagesplanPanel.vue`:**

```vue
<script setup lang="ts">
// Tagesplan (ADR-0026): read-only "what asks for attention today" on Home.
// Renders nothing while loading, on error, and when no row has content —
// Home stays the quiet frontispiece unless something genuinely wants work.
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { buildTagesplan, type TagesplanRow } from '../../composables/useTagesplan'
import { loadHistory } from '../../composables/useQuizHistory'

const router = useRouter()
const rows = ref<TagesplanRow[]>([])

onMounted(async () => {
  try {
    rows.value = await buildTagesplan(loadHistory())
  } catch {
    rows.value = []   // fail-soft: Home must never break on a bad read
  }
})

function open(row: TagesplanRow) { router.push({ name: row.route }) }

function onRowKey(e: KeyboardEvent, row: TagesplanRow) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    open(row)
  }
}
</script>

<template>
  <section v-if="rows.length > 0" class="tagesplan card">
    <div class="tp-head">
      <span class="micro-mark">Tagesplan · heute</span>
      <span class="micro-mark tp-count">{{ rows.length }} Einträge</span>
    </div>
    <ul class="tp-rows">
      <li
        v-for="r in rows" :key="r.id"
        class="tp-row" role="button" tabindex="0"
        @click="open(r)" @keydown="onRowKey($event, r)"
      >
        <span class="tp-badge spr-num">{{ r.count }}</span>
        <span class="tp-body">
          <span class="tp-title">{{ r.title }}</span>
          <span class="tp-detail">{{ r.detail }}</span>
        </span>
        <span class="tp-cta" aria-hidden="true">→</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.tagesplan { margin: 0 0 40px; padding: 20px 24px; }
.tp-head { display: flex; justify-content: space-between; margin-bottom: 12px; }
.tp-rows { list-style: none; margin: 0; padding: 0; }
.tp-row {
  display: flex; align-items: baseline; gap: 14px;
  padding: 10px 4px; border-top: 1px dotted var(--hairline);
  cursor: pointer; transition: background .16s;
}
.tp-row:hover, .tp-row:focus-visible { background: var(--accent-wash); }
.tp-row:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.tp-badge {
  font-family: var(--font-display); font-size: 22px; font-weight: 500;
  min-width: 34px; text-align: right; font-variant-numeric: tabular-nums;
}
.tp-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.tp-title { font-weight: 600; }
.tp-detail { color: var(--mute); font-size: 13.5px; }
.tp-cta { color: var(--accent); }
@media (max-width: 720px) {
  .tagesplan { padding: 16px; }
}
</style>
```

- [ ] **Step 4: Mount in `Home.vue`** — add `import TagesplanPanel from './TagesplanPanel.vue'` to the script block and place `<TagesplanPanel />` on its own line directly after `</header>` and before `<div class="module-grid">`. No other Home change.

- [ ] **Step 5: Run tests** — `npx vitest run tests/modules/TagesplanPanel.test.ts` → PASS. Then `npm run typecheck` → exit 0.

- [ ] **Step 6: Commit** — controller commits.

---

### Task 3 (controller): Glossary, changelog, release

CONTEXT.md **Tagesplan** entry; changelog 1.21.05 + APP_VERSION; package.json; full suite + typecheck; merge `feat/tagesplan` → main; push; `npm run deploy`.
