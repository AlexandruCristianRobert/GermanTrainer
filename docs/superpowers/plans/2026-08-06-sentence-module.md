# Sentence Module (Kapitel XII) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "packed sentence" quiz — a new Sentence module where the learner sets a per-card count for five categories (verbs, nouns, prepositions, da-compounds, connectors) and the AI writes one EN/DE sentence pair per card containing every requested item.

**Architecture:** A new pure-logic composable (`usePackedSentenceQuiz.ts`) mirrors the proven `useVerbSentenceQuiz.ts` pattern (specs sampled up-front per ADR-0004, progressive batch generation per ADR-0008, AI grading with local fallback), plus a new connector data bank with per-part word-order behavior. Three Vue surfaces (Setup / Runner / Result) recreate design Variant A „Das Register" from `docs/design_handoff_sentence_module/` pixel-per-pixel on existing Grammatik-Atelier tokens. Runs record as type `sentence-packed` and pool per-item evidence into the existing weak-point scorers (ADR-0015).

**Tech Stack:** Vue 3 + TypeScript + Vite, vitest + @vue/test-utils, localStorage history (`useQuizHistory`), Gemini / local-claude via `resolveAiClient`.

## Global Constraints

- **Typecheck only via `npm run typecheck`** (vue-tsc). Plain `tsc` floods ~212 fake `.vue` module errors — its output means nothing.
- **Tests:** `npm test` (vitest run). Single file: `npx vitest run tests/path/file.test.ts`.
- **Route-name head must be hyphen-free**: `sentence`, `sentence-run` (NavShell derives the active tab via `name.split('-')[0]`).
- **Run type is `sentence-packed`.** Adding it to `QuizHistoryType` makes five exhaustive `Record<QuizHistoryType, …>` registries compile errors until all are updated (Task 2 does them together).
- **Every AI system prompt MUST spell out the JSON envelope in prose** (e.g. `'Return JSON {"items":[…]}'`) in addition to `responseSchema` — the local-claude dev bridge drops `responseSchema`.
- **Design fidelity:** markup/class names/German copy come verbatim from `docs/design_handoff_sentence_module/sentence-a.jsx` + `styles-sentence-redesign.css` (Variant A only — `.snb-*` / Variant B is rejected, do not port). Use only existing CSS variables from `src/styles/tokens.css`; invent no tokens.
- **Grill decisions (override the design prototype where they conflict):**
  - Word hints are **hybrid**: verb + noun spans reveal the German in a hover/tap popover; preposition, da-compound, and connector spans highlight only, never reveal (CONTEXT.md → "Word hint").
  - Run scoring is **all-or-nothing per card**: `correct` counts only cards where every item was right; `Teils richtig` counts as wrong and joins the retry deck.
  - Connector bank is **comprehensive (~39 words)** incl. two-part correlatives; behavior is stored **per part** (`je … desto` = [end, inv]).
  - Practice rounds (retry-wrong) are **never recorded** (CONTEXT.md → "Run"). Do not copy `VerbSentenceRunner.retryWrong`'s `historySaved = false` reset.
  - DE→EN is meaning-only: no error tags, no hints, no modality choice, no per-item list.
  - Budget: each category 0–3 (connectors 0–2), total ≤ 8, warn state at ≥ 7. Card presets 3 / 5 / 8 / Custom (1–12).
  - Direction Words are NOT a category.
- **Commits:** one per task, message prefix `feat(sentence):` (or `test:`/`chore:` where noted). End commit messages with the Co-Authored-By line from the repo convention.

---

### Task 1: Connector data bank

**Files:**
- Create: `src/data/connectors.ts`
- Test: `tests/data/connectors.test.ts`

**Interfaces:**
- Consumes: nothing (leaf data file).
- Produces:
  ```ts
  export type ConnFamilyId = 'adversativ' | 'kausal' | 'konzessiv' | 'temporal' | 'alternativ' | 'additiv'
  export type ConnBehavior = '0' | 'inv' | 'end'
  export interface ConnectorPart { text: string; behavior: ConnBehavior }
  export interface Connector { id: string; display: string; english: string; family: ConnFamilyId; parts: ConnectorPart[] }
  export interface ConnFamily { id: ConnFamilyId; label: string; de: string }
  export const CONN_FAMILIES: ConnFamily[]
  export const CONNECTORS: Connector[]
  export const CONN_BEHAVIOR_LABEL: Record<ConnBehavior, string>
  export function connectorsForFamilies(fams: readonly ConnFamilyId[]): Connector[]
  export function isPair(c: Connector): boolean
  ```

- [ ] **Step 1: Write the failing test**

`tests/data/connectors.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  CONNECTORS, CONN_FAMILIES, CONN_BEHAVIOR_LABEL,
  connectorsForFamilies, isPair
} from '../../src/data/connectors'

// da-compound homographs must stay out: a card can drill a da-compound AND a
// connector at once, and these words would make grading attribution ambiguous.
const DA_HOMOGRAPHS = ['darum', 'dagegen', 'danach', 'dabei', 'davor', 'damit']

describe('connector bank', () => {
  test('ids are unique', () => {
    const ids = CONNECTORS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  test('displays are unique and pairs use the ellipsis form', () => {
    const displays = CONNECTORS.map(c => c.display)
    expect(new Set(displays).size).toBe(displays.length)
    for (const c of CONNECTORS.filter(isPair)) {
      expect(c.display).toContain(' … ')
      expect(c.parts).toHaveLength(2)
    }
  })
  test('every connector has 1 or 2 parts, non-empty text, valid behavior', () => {
    for (const c of CONNECTORS) {
      expect([1, 2]).toContain(c.parts.length)
      for (const p of c.parts) {
        expect(p.text.trim().length).toBeGreaterThan(0)
        expect(['0', 'inv', 'end']).toContain(p.behavior)
      }
    }
  })
  test('single-word display equals its only part text', () => {
    for (const c of CONNECTORS.filter(c => !isPair(c))) {
      expect(c.display).toBe(c.parts[0].text)
    }
  })
  test('all six families exist and none is empty', () => {
    expect(CONN_FAMILIES.map(f => f.id).sort()).toEqual(
      ['additiv', 'adversativ', 'alternativ', 'kausal', 'konzessiv', 'temporal']
    )
    for (const f of CONN_FAMILIES) {
      expect(connectorsForFamilies([f.id]).length).toBeGreaterThan(0)
    }
  })
  test('bank is comprehensive (>= 35 connectors) and excludes da-homographs', () => {
    expect(CONNECTORS.length).toBeGreaterThanOrEqual(35)
    for (const c of CONNECTORS) {
      for (const p of c.parts) expect(DA_HOMOGRAPHS).not.toContain(p.text)
    }
  })
  test('known word-order behaviors are correct', () => {
    const byId = new Map(CONNECTORS.map(c => [c.id, c]))
    expect(byId.get('aber')!.parts[0].behavior).toBe('0')
    expect(byId.get('jedoch')!.parts[0].behavior).toBe('inv')
    expect(byId.get('weil')!.parts[0].behavior).toBe('end')
    expect(byId.get('je-desto')!.parts.map(p => p.behavior)).toEqual(['end', 'inv'])
    expect(byId.get('zwar-aber')!.parts.map(p => p.behavior)).toEqual(['inv', '0'])
  })
  test('behavior labels', () => {
    expect(CONN_BEHAVIOR_LABEL['0']).toBe('Wortstellung bleibt')
    expect(CONN_BEHAVIOR_LABEL.inv).toBe('Inversion')
    expect(CONN_BEHAVIOR_LABEL.end).toBe('Verb ans Ende')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/data/connectors.test.ts`
Expected: FAIL — cannot resolve `src/data/connectors`.

- [ ] **Step 3: Write the data file**

`src/data/connectors.ts`:

```ts
// src/data/connectors.ts
//
// Curated connector (Konnektor) bank for the Sentence quiz (CONTEXT.md →
// "Connector", ADR-0015). Grouped by MEANING FAMILY (how the learner filters)
// with word-order BEHAVIOR stored PER PART, because two-part correlatives can
// force a different word order at each position (je … desto = end + inv).
//
// Deliberately excluded:
//  - da-compound homographs (darum, dagegen, danach, dabei, davor, damit) — a
//    packed card can drill a da-compound and a connector at once, and these
//    words would make per-item grading attribution ambiguous.
//  - und (trivial), nämlich (position quirks), als/wenn (conditional ambiguity).

export type ConnFamilyId = 'adversativ' | 'kausal' | 'konzessiv' | 'temporal' | 'alternativ' | 'additiv'

/** '0' = position zero, word order unchanged · 'inv' = inversion (verb right
 *  after the connector) · 'end' = subjunctor, verb to the clause end. */
export type ConnBehavior = '0' | 'inv' | 'end'

export interface ConnectorPart { text: string; behavior: ConnBehavior }

export interface Connector {
  /** kebab id; pairs join parts with '-': 'zwar-aber' */
  id: string
  /** display form; pairs use ' … ': 'zwar … aber' */
  display: string
  english: string
  family: ConnFamilyId
  /** 1 entry for a single word, 2 for a correlative pair — behavior per part */
  parts: ConnectorPart[]
}

export interface ConnFamily { id: ConnFamilyId; label: string; de: string }

export const CONN_FAMILIES: ConnFamily[] = [
  { id: 'adversativ', label: 'Adversative', de: 'Gegensatz' },
  { id: 'kausal', label: 'Causal', de: 'Grund & Folge' },
  { id: 'konzessiv', label: 'Concessive', de: 'Einräumung' },
  { id: 'temporal', label: 'Temporal', de: 'Zeit' },
  { id: 'alternativ', label: 'Alternative', de: 'Wahl' },
  { id: 'additiv', label: 'Additive', de: 'Hinzufügung' }
]

export const CONN_BEHAVIOR_LABEL: Record<ConnBehavior, string> = {
  '0': 'Wortstellung bleibt',
  inv: 'Inversion',
  end: 'Verb ans Ende'
}

const w = (id: string, english: string, family: ConnFamilyId, behavior: ConnBehavior): Connector =>
  ({ id, display: id, english, family, parts: [{ text: id, behavior }] })
const pair = (
  id: string, a: ConnectorPart, b: ConnectorPart, english: string, family: ConnFamilyId
): Connector => ({ id, display: `${a.text} … ${b.text}`, english, family, parts: [a, b] })

export const CONNECTORS: Connector[] = [
  // ── adversativ (Gegensatz) ──
  w('aber', 'but', 'adversativ', '0'),
  w('sondern', 'but rather', 'adversativ', '0'),
  w('doch', 'yet / but', 'adversativ', '0'),
  w('jedoch', 'however', 'adversativ', 'inv'),
  w('allerdings', 'though / admittedly', 'adversativ', 'inv'),
  w('hingegen', 'by contrast', 'adversativ', 'inv'),
  pair('zwar-aber', { text: 'zwar', behavior: 'inv' }, { text: 'aber', behavior: '0' },
    'admittedly … but', 'adversativ'),
  pair('einerseits-andererseits', { text: 'einerseits', behavior: 'inv' }, { text: 'andererseits', behavior: 'inv' },
    'on the one hand … on the other', 'adversativ'),
  // ── kausal (Grund & Folge) ──
  w('denn', 'because / for', 'kausal', '0'),
  w('weil', 'because', 'kausal', 'end'),
  w('da', 'since / as', 'kausal', 'end'),
  w('deshalb', 'therefore', 'kausal', 'inv'),
  w('deswegen', 'that is why', 'kausal', 'inv'),
  w('daher', 'hence', 'kausal', 'inv'),
  w('folglich', 'consequently', 'kausal', 'inv'),
  w('sodass', 'so that', 'kausal', 'end'),
  pair('je-desto', { text: 'je', behavior: 'end' }, { text: 'desto', behavior: 'inv' },
    'the … the', 'kausal'),
  // ── konzessiv (Einräumung) ──
  w('obwohl', 'although', 'konzessiv', 'end'),
  w('obgleich', 'even though', 'konzessiv', 'end'),
  w('trotzdem', 'nevertheless', 'konzessiv', 'inv'),
  w('dennoch', 'nonetheless', 'konzessiv', 'inv'),
  // ── temporal (Zeit) ──
  w('während', 'while', 'temporal', 'end'),
  w('bevor', 'before', 'temporal', 'end'),
  w('nachdem', 'after', 'temporal', 'end'),
  w('seitdem', 'since (time)', 'temporal', 'end'),
  w('sobald', 'as soon as', 'temporal', 'end'),
  w('solange', 'as long as', 'temporal', 'end'),
  w('bis', 'until', 'temporal', 'end'),
  w('dann', 'then', 'temporal', 'inv'),
  w('anschließend', 'afterwards', 'temporal', 'inv'),
  // ── alternativ (Wahl) ──
  w('oder', 'or', 'alternativ', '0'),
  pair('entweder-oder', { text: 'entweder', behavior: 'inv' }, { text: 'oder', behavior: '0' },
    'either … or', 'alternativ'),
  pair('weder-noch', { text: 'weder', behavior: 'inv' }, { text: 'noch', behavior: 'inv' },
    'neither … nor', 'alternativ'),
  w('sonst', 'otherwise', 'alternativ', 'inv'),
  w('stattdessen', 'instead', 'alternativ', 'inv'),
  // ── additiv (Hinzufügung) ──
  w('außerdem', 'besides / moreover', 'additiv', 'inv'),
  w('zudem', 'in addition', 'additiv', 'inv'),
  pair('sowohl-als-auch', { text: 'sowohl', behavior: '0' }, { text: 'als auch', behavior: '0' },
    'both … and', 'additiv'),
  pair('nicht-nur-sondern-auch', { text: 'nicht nur', behavior: 'inv' }, { text: 'sondern auch', behavior: '0' },
    'not only … but also', 'additiv')
]

export function connectorsForFamilies(fams: readonly ConnFamilyId[]): Connector[] {
  const set = new Set(fams)
  return CONNECTORS.filter(c => set.has(c.family))
}

export function isPair(c: Connector): boolean {
  return c.parts.length === 2
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/data/connectors.test.ts`
Expected: PASS (all 8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/connectors.ts tests/data/connectors.test.ts
git commit -m "feat(sentence): connector bank with per-part word-order behavior"
```

---

### Task 2: History type + registries

**Files:**
- Modify: `src/composables/useQuizHistory.ts` (type union ~line 62, new item type after `DwDrillItem` ~line 131, meta fields at the end of `QuizHistoryMeta` ~line 279)
- Modify: `src/components/charts/quiz-type-labels.ts` (all three records)
- Modify: `src/modules/history/HistoryPage.vue:44` (`QUIZ_TYPES` record)
- Modify: `src/composables/useQuizStats.ts` (`zeroRunsByType` ~line 88, `zeroAccuracyByType` ~line 149)
- Modify: `src/composables/useLevelAssessment.ts:88` (`TYPE_LABEL` record)

**Interfaces:**
- Consumes: nothing new.
- Produces (used by Tasks 5, 6, 10):
  ```ts
  // in useQuizHistory.ts
  QuizHistoryType gains | 'sentence-packed'
  export type ConnErrorTag = 'connector' | 'word-order' | 'typo'
  export interface ConnectorDrillItem { connId?: string; connWord?: string; correct: boolean; tags?: ConnErrorTag[] }
  // QuizHistoryMeta gains:
  //   packedCounts?: { verb: number; noun: number; prep: number; dac: number; conn: number }
  //   packedDirection?: 'en-de' | 'de-en'
  //   packedModality?: 'typed' | 'spoken'
  //   packedHints?: boolean
  //   packedItemsOk?: number
  //   packedItemsTotal?: number
  //   packedConnItems?: ConnectorDrillItem[]
  // Packed runs REUSE sentenceItems / verbSentenceItems / dacSentenceItems for
  // prep / verb+noun / dac per-item records so existing scorers pool evidence.
  ```

- [ ] **Step 1: Add the type + item shape + meta fields**

In `src/composables/useQuizHistory.ts`, append `| 'sentence-packed'` to the `QuizHistoryType` union (after `'sprechen-drill'`). After the `DwDrillItem` interface add:

```ts
/** A connector error category the packed-sentence grader may assign. */
export type ConnErrorTag = 'connector' | 'word-order' | 'typo'

/** One recorded connector result in a sentence-packed run (EN→DE only). */
export interface ConnectorDrillItem {
  connId?: string      // stable connector id ('zwar-aber') for weak-point keying
  connWord?: string    // display form, denormalized ('zwar … aber')
  correct: boolean
  tags?: ConnErrorTag[]
}
```

At the end of `QuizHistoryMeta` (after `sprechenDowngraded`) add:

```ts
  // Sentence module — packed cards (sentence-packed). Per-item records for
  // verbs/nouns reuse verbSentenceItems, preps reuse sentenceItems, and
  // da-compounds reuse dacSentenceItems (nounKeys: [] on all of them), so the
  // existing weak-point scorers pool packed evidence (ADR-0015). Connectors
  // are new and get their own item list.
  packedCounts?: { verb: number; noun: number; prep: number; dac: number; conn: number }
  packedDirection?: 'en-de' | 'de-en'
  packedModality?: 'typed' | 'spoken'
  packedHints?: boolean
  packedItemsOk?: number      // items hit across the run (for the result header)
  packedItemsTotal?: number
  packedConnItems?: ConnectorDrillItem[]
```

- [ ] **Step 2: Run typecheck to enumerate every registry that must follow**

Run: `npm run typecheck`
Expected: FAIL with "Property 'sentence-packed' is missing" in `quiz-type-labels.ts` (×3), `HistoryPage.vue`, `useQuizStats.ts` (×2), `useLevelAssessment.ts`.

- [ ] **Step 3: Register the type everywhere**

- `quiz-type-labels.ts`: add to `QUIZ_TYPE_LABEL`: `'sentence-packed': 'Sentence · packed (AI)'`; to `QUIZ_TYPE_DE`: `'sentence-packed': 'Satz · Gepackt (KI)'`; to `QUIZ_TYPES_ORDER`: insert `'sentence-packed'` after `'prep-remedial'`.
- `HistoryPage.vue` `QUIZ_TYPES`: `'sentence-packed': { label: 'Sentence · packed (AI)', de: 'Satz · Gepackt (KI)', module: 'Sentence' },`
- `useQuizStats.ts`: add `'sentence-packed': 0` in `zeroRunsByType()` and `'sentence-packed': emptyBucket()` in `zeroAccuracyByType()`.
- `useLevelAssessment.ts` `TYPE_LABEL`: `'sentence-packed': 'Sentence · packed (AI)',`

- [ ] **Step 4: Verify typecheck and tests pass**

Run: `npm run typecheck && npm test`
Expected: PASS (no new test needed — the exhaustive records ARE the gate).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useQuizHistory.ts src/components/charts/quiz-type-labels.ts src/modules/history/HistoryPage.vue src/composables/useQuizStats.ts src/composables/useLevelAssessment.ts
git commit -m "feat(sentence): register sentence-packed run type + connector drill items"
```

---

### Task 3: Packed core — budget, refs, sampling, da-compound formation

**Files:**
- Create: `src/composables/usePackedSentenceQuiz.ts`
- Test: `tests/composables/usePackedSentenceQuiz.test.ts`

**Interfaces:**
- Consumes: `NounRef` from `./useSentenceQuiz`; `Verb, VerbLevel, VerbCase` from `../data/verbs`; `PrepCase` from `../data/prepositions`; `Connector, ConnFamilyId, ConnectorPart` from `../data/connectors`; `shuffle` from `../data/pool`.
- Produces (used by Tasks 4, 5, 9, 10):
  ```ts
  export type PackedCategory = 'verb' | 'noun' | 'prep' | 'dac' | 'conn'
  export const PACKED_CATS: readonly PackedCategory[]  // ['verb','noun','prep','dac','conn']
  export interface PackedCounts { verb: number; noun: number; prep: number; dac: number; conn: number }
  export const PACKED_MAX: PackedCounts   // { verb: 3, noun: 3, prep: 3, dac: 3, conn: 2 }
  export const PACKED_BUDGET = 8
  export const PACKED_WARN_AT = 7
  export function packedTotal(c: PackedCounts): number
  export interface PackedVerbRef { german: string; english: string; level: VerbLevel; case: VerbCase }
  export function packedVerbToRef(v: Verb): PackedVerbRef
  export interface PackedPrepRef { id: string; german: string; english: string; case: PrepCase }
  export interface PackedCollocRef { id: string; word: string; english: string; preposition: string; case: 'accusative' | 'dative' }
  export interface PackedItemSpec { key: string; cat: PackedCategory; verb?: PackedVerbRef; noun?: NounRef; prep?: PackedPrepRef; colloc?: PackedCollocRef; conn?: Connector }
  export interface PackedCardSpec { index: number; items: PackedItemSpec[] }
  export interface PackedPools { verbs: readonly PackedVerbRef[]; nouns: readonly NounRef[]; preps: readonly PackedPrepRef[]; collocs: readonly PackedCollocRef[]; conns: readonly Connector[] }
  export function buildPackedSpecs(pools: PackedPools, counts: PackedCounts, cards: number, rng?: () => number): PackedCardSpec[]
  export function daCompoundFor(preposition: string): string
  export function rektShort(c: VerbCase): string | null
  ```

- [ ] **Step 1: Write the failing tests**

`tests/composables/usePackedSentenceQuiz.test.ts` (this file grows across Tasks 3–5; start it now):

```ts
import { describe, test, expect } from 'vitest'
import {
  PACKED_MAX, PACKED_BUDGET, packedTotal, buildPackedSpecs, daCompoundFor, rektShort,
  type PackedPools, type PackedCounts
} from '../../src/composables/usePackedSentenceQuiz'
import { CONNECTORS } from '../../src/data/connectors'
import type { NounRef } from '../../src/composables/useSentenceQuiz'

function seqRng(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

const POOLS: PackedPools = {
  verbs: [
    { german: 'warten', english: 'wait', level: 'B1', case: 'accusative' },
    { german: 'helfen', english: 'help', level: 'A2', case: 'dative' },
    { german: 'gehen', english: 'go', level: 'A1', case: 'none' },
    { german: 'sehen', english: 'see', level: 'A1', case: 'accusative' }
  ],
  nouns: [
    { german: 'Bericht', article: 'der', english: 'report' },
    { german: 'Wohnung', article: 'die', english: 'apartment' },
    { german: 'Kollege', article: 'der', english: 'colleague' }
  ] as NounRef[],
  preps: [
    { id: 'seit', german: 'seit', english: 'since', case: 'dative' },
    { id: 'durch', german: 'durch', english: 'through', case: 'accusative' }
  ],
  collocs: [
    { id: 'warten-auf', word: 'warten', english: 'to wait for', preposition: 'auf', case: 'accusative' },
    { id: 'denken-an', word: 'denken', english: 'to think of', preposition: 'an', case: 'accusative' }
  ],
  conns: CONNECTORS.slice(0, 5)
}

describe('packedTotal / budget constants', () => {
  test('sums the five categories; max config stays within budget', () => {
    expect(packedTotal({ verb: 2, noun: 2, prep: 1, dac: 1, conn: 1 })).toBe(7)
    expect(packedTotal(PACKED_MAX)).toBeGreaterThan(PACKED_BUDGET) // maxes alone exceed 8 — the setup enforces the cap
  })
})

describe('buildPackedSpecs', () => {
  const counts: PackedCounts = { verb: 2, noun: 2, prep: 1, dac: 1, conn: 1 }
  test('produces `cards` specs, each with all requested items, keyed by category', () => {
    const specs = buildPackedSpecs(POOLS, counts, 3, seqRng([0.1, 0.5, 0.9]))
    expect(specs).toHaveLength(3)
    for (const s of specs) {
      expect(s.items).toHaveLength(7)
      expect(s.items.filter(i => i.cat === 'verb').map(i => i.key)).toEqual(['v1', 'v2'])
      expect(s.items.filter(i => i.cat === 'noun').map(i => i.key)).toEqual(['n1', 'n2'])
      expect(s.items.filter(i => i.cat === 'prep').map(i => i.key)).toEqual(['p1'])
      expect(s.items.filter(i => i.cat === 'dac').map(i => i.key)).toEqual(['d1'])
      expect(s.items.filter(i => i.cat === 'conn').map(i => i.key)).toEqual(['k1'])
    }
  })
  test('items within a card are distinct per category', () => {
    const specs = buildPackedSpecs(POOLS, counts, 5, seqRng([0.2, 0.7, 0.4, 0.9, 0.1]))
    for (const s of specs) {
      const verbs = s.items.filter(i => i.cat === 'verb').map(i => i.verb!.german)
      expect(new Set(verbs).size).toBe(verbs.length)
    }
  })
  test('zero-count categories are simply absent', () => {
    const specs = buildPackedSpecs(POOLS, { verb: 1, noun: 0, prep: 0, dac: 0, conn: 0 }, 2, seqRng([0.3]))
    for (const s of specs) {
      expect(s.items).toHaveLength(1)
      expect(s.items[0].cat).toBe('verb')
    }
  })
  test('an empty pool yields fewer items than requested, never a crash', () => {
    const specs = buildPackedSpecs({ ...POOLS, preps: [] }, counts, 1, seqRng([0.3]))
    expect(specs[0].items.filter(i => i.cat === 'prep')).toHaveLength(0)
  })
})

describe('daCompoundFor', () => {
  test('dar- before vowel, da- otherwise', () => {
    expect(daCompoundFor('auf')).toBe('darauf')
    expect(daCompoundFor('an')).toBe('daran')
    expect(daCompoundFor('über')).toBe('darüber')
    expect(daCompoundFor('mit')).toBe('damit')
    expect(daCompoundFor('von')).toBe('davon')
    expect(daCompoundFor('für')).toBe('dafür')
  })
})

describe('rektShort', () => {
  test('maps VerbCase to the badge label', () => {
    expect(rektShort('accusative')).toBe('Akk')
    expect(rektShort('dative')).toBe('Dat')
    expect(rektShort('dative+accusative')).toBe('Dat + Akk')
    expect(rektShort('genitive')).toBe('Gen')
    expect(rektShort('reflexive')).toBe('refl')
    expect(rektShort('none')).toBeNull()
    expect(rektShort('varies')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/composables/usePackedSentenceQuiz.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the core**

Create `src/composables/usePackedSentenceQuiz.ts`. Header comment: packed-sentence quiz per ADR-0015 — per-card category counts, fresh sampling per card (ADR-0004), all randomness up front. Then:

```ts
import { shuffle } from '../data/pool'
import type { Verb, VerbLevel, VerbCase } from '../data/verbs'
import type { PrepCase } from '../data/prepositions'
import type { NounRef } from './useSentenceQuiz'
import type { Connector } from '../data/connectors'

export type PackedCategory = 'verb' | 'noun' | 'prep' | 'dac' | 'conn'
export const PACKED_CATS: readonly PackedCategory[] = ['verb', 'noun', 'prep', 'dac', 'conn']
export interface PackedCounts { verb: number; noun: number; prep: number; dac: number; conn: number }
export const PACKED_MAX: PackedCounts = { verb: 3, noun: 3, prep: 3, dac: 3, conn: 2 }
export const PACKED_BUDGET = 8
export const PACKED_WARN_AT = 7

export function packedTotal(c: PackedCounts): number {
  return PACKED_CATS.reduce((s, cat) => s + c[cat], 0)
}

export interface PackedVerbRef { german: string; english: string; level: VerbLevel; case: VerbCase }
export function packedVerbToRef(v: Verb): PackedVerbRef {
  return { german: v.german, english: v.english, level: v.level, case: v.case }
}
export interface PackedPrepRef { id: string; german: string; english: string; case: PrepCase }
export interface PackedCollocRef { id: string; word: string; english: string; preposition: string; case: 'accusative' | 'dative' }

export interface PackedItemSpec {
  key: string
  cat: PackedCategory
  verb?: PackedVerbRef
  noun?: NounRef
  prep?: PackedPrepRef
  colloc?: PackedCollocRef
  conn?: Connector
}
export interface PackedCardSpec { index: number; items: PackedItemSpec[] }
export interface PackedPools {
  verbs: readonly PackedVerbRef[]
  nouns: readonly NounRef[]
  preps: readonly PackedPrepRef[]
  collocs: readonly PackedCollocRef[]
  conns: readonly Connector[]
}

/** A refilling shuffled bag: draws spread the pool before any repeat. */
function makeBag<T>(pool: readonly T[], rng: () => number) {
  let bag: T[] = []
  let i = 0
  return function next(): T | null {
    if (pool.length === 0) return null
    if (i >= bag.length) { bag = shuffle(pool, pool.length, rng); i = 0 }
    return bag[i++] ?? null
  }
}

/** Draw up to `k` distinct items (by `key`) from a bag. */
function drawUnique<T>(next: () => T | null, k: number, key: (t: T) => string): T[] {
  const out: T[] = []
  let guard = 0
  while (out.length < k && guard < k * 4) {
    guard++
    const t = next()
    if (t === null) break
    if (!out.some(x => key(x) === key(t))) out.push(t)
  }
  return out
}

/**
 * Build `cards` packed specs. Counts are PER CARD; every card samples fresh
 * words from refilling bags, so a run spreads each pool before repeating.
 */
export function buildPackedSpecs(
  pools: PackedPools, counts: PackedCounts, cards: number, rng: () => number = Math.random
): PackedCardSpec[] {
  const nextVerb = makeBag(pools.verbs, rng)
  const nextNoun = makeBag(pools.nouns, rng)
  const nextPrep = makeBag(pools.preps, rng)
  const nextColloc = makeBag(pools.collocs, rng)
  const nextConn = makeBag(pools.conns, rng)
  const specs: PackedCardSpec[] = []
  for (let index = 0; index < cards; index++) {
    const items: PackedItemSpec[] = []
    drawUnique(nextVerb, counts.verb, v => v.german)
      .forEach((verb, i) => items.push({ key: `v${i + 1}`, cat: 'verb', verb }))
    drawUnique(nextNoun, counts.noun, n => n.german)
      .forEach((noun, i) => items.push({ key: `n${i + 1}`, cat: 'noun', noun }))
    drawUnique(nextPrep, counts.prep, p => p.id)
      .forEach((prep, i) => items.push({ key: `p${i + 1}`, cat: 'prep', prep }))
    drawUnique(nextColloc, counts.dac, c => c.id)
      .forEach((colloc, i) => items.push({ key: `d${i + 1}`, cat: 'dac', colloc }))
    drawUnique(nextConn, counts.conn, c => c.id)
      .forEach((conn, i) => items.push({ key: `k${i + 1}`, cat: 'conn', conn }))
    specs.push({ index, items })
  }
  return specs
}

/** da(r) + preposition — 'dar-' before a vowel-initial preposition. */
export function daCompoundFor(preposition: string): string {
  const p = preposition.toLowerCase()
  return /^[aeiouäöü]/.test(p) ? `dar${p}` : `da${p}`
}

/** Short Rektion badge label for a verb ('warten + Akk'); null when there is
 *  no meaningful governed case to show. */
export function rektShort(c: VerbCase): string | null {
  switch (c) {
    case 'accusative': return 'Akk'
    case 'dative': return 'Dat'
    case 'dative+accusative': return 'Dat + Akk'
    case 'genitive': return 'Gen'
    case 'reflexive': return 'refl'
    default: return null
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/composables/usePackedSentenceQuiz.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/usePackedSentenceQuiz.ts tests/composables/usePackedSentenceQuiz.test.ts
git commit -m "feat(sentence): packed spec sampling, budget constants, da-compound formation"
```

---

### Task 4: Generation — prompt, validator, batch, hint segments

**Files:**
- Modify: `src/composables/usePackedSentenceQuiz.ts` (append)
- Test: `tests/composables/usePackedSentenceQuiz.test.ts` (append)

**Interfaces:**
- Consumes: Task 3 types; `AiClient` from `./useClaude`; `prepUsed, normalizeGerman` from `./useSentenceQuiz`; `PromptVariation` shape `{ angles: string[]; seed: string }` (same as `useVerbSentenceQuiz`); `CONN_BEHAVIOR_LABEL, isPair` from `../data/connectors`.
- Produces:
  ```ts
  export interface PackedSpan { key: string; en: string }
  export interface GeneratedPackedCard extends PackedCardSpec { english: string; german: string; sents: number; spans: PackedSpan[] }
  export const PACKED_GEN_SYSTEM: string
  export const PACKED_GEN_SCHEMA: object
  export const PACKED_ANGLE_POOL: readonly string[]
  export function buildPackedGeneratePrompt(specs: readonly PackedCardSpec[], level: string, variation: { angles: string[]; seed: string }): string
  export function connUsed(german: string, conn: Connector): boolean
  export function validatePackedCard(raw: unknown, spec: PackedCardSpec): GeneratedPackedCard | null
  export function generatePackedBatch(client: AiClient, opts: { model: string; specs: PackedCardSpec[]; level?: string; maxRetries?: number; rng?: () => number }): Promise<{ cards: GeneratedPackedCard[]; rejected: number; attempts: number }>
  export interface PackedSegment { text: string; item?: { key: string; cat: PackedCategory; reveal?: string } }
  export function buildPackedSegments(english: string, card: GeneratedPackedCard): PackedSegment[]
  ```

- [ ] **Step 1: Write the failing tests** (append to the test file)

```ts
import {
  validatePackedCard, buildPackedGeneratePrompt, buildPackedSegments, connUsed,
  type PackedCardSpec, type GeneratedPackedCard
} from '../../src/composables/usePackedSentenceQuiz'

const CONN_ABER = CONNECTORS.find(c => c.id === 'aber')!
const CONN_PAIR = CONNECTORS.find(c => c.id === 'sowohl-als-auch')!

const SPEC: PackedCardSpec = {
  index: 0,
  items: [
    { key: 'v1', cat: 'verb', verb: { german: 'warten', english: 'wait', level: 'B1', case: 'accusative' } },
    { key: 'n1', cat: 'noun', noun: { german: 'Bericht', article: 'der', english: 'report' } },
    { key: 'p1', cat: 'prep', prep: { id: 'seit', german: 'seit', english: 'since', case: 'dative' } },
    { key: 'd1', cat: 'dac', colloc: { id: 'warten-auf', word: 'warten', english: 'to wait for', preposition: 'auf', case: 'accusative' } },
    { key: 'k1', cat: 'conn', conn: CONN_ABER }
  ]
}
const GOOD_RAW = {
  index: 0,
  english: 'My colleague has been waiting for the report since Monday, but I am still working on it.',
  german: 'Mein Kollege wartet seit Montag auf den Bericht, aber ich arbeite noch daran.',
  sentenceCount: 1,
  spans: [
    { key: 'v1', en: 'waiting' }, { key: 'n1', en: 'report' }, { key: 'p1', en: 'since' },
    { key: 'd1', en: 'on it' }, { key: 'k1', en: 'but' }
  ]
}

describe('connUsed', () => {
  test('single word, word-bounded', () => {
    expect(connUsed('Ich bleibe, aber du gehst.', CONN_ABER)).toBe(true)
    expect(connUsed('Das ist aberwitzig.', CONN_ABER)).toBe(false)
  })
  test('two-part requires both parts', () => {
    expect(connUsed('Sowohl die Miete als auch die Kosten steigen.', CONN_PAIR)).toBe(true)
    expect(connUsed('Sowohl die Miete steigt.', CONN_PAIR)).toBe(false)
  })
})

describe('validatePackedCard', () => {
  test('accepts a good card', () => {
    const v = validatePackedCard(GOOD_RAW, SPEC)!
    expect(v).not.toBeNull()
    expect(v.sents).toBe(1)
    expect(v.spans).toHaveLength(5)
    expect(v.german).toContain('daran')
  })
  test('rejects when the connector is missing from the German', () => {
    const raw = { ...GOOD_RAW, german: 'Mein Kollege wartet seit Montag auf den Bericht und ich arbeite noch daran.' }
    expect(validatePackedCard(raw, SPEC)).toBeNull()
  })
  test('rejects when the preposition is missing', () => {
    const raw = { ...GOOD_RAW, german: 'Mein Kollege wartet auf den Bericht, aber ich arbeite noch daran.' }
    expect(validatePackedCard(raw, SPEC)).toBeNull()
  })
  test('rejects when the da-compound is missing', () => {
    const raw = { ...GOOD_RAW, german: 'Mein Kollege wartet seit Montag auf den Bericht, aber ich arbeite noch.' }
    expect(validatePackedCard(raw, SPEC)).toBeNull()
  })
  test('derives sents from the German when sentenceCount is absent, clamped 1..4', () => {
    const raw = { ...GOOD_RAW, sentenceCount: undefined }
    expect(validatePackedCard(raw, SPEC)!.sents).toBe(1)
    const raw9 = { ...GOOD_RAW, sentenceCount: 9 }
    expect(validatePackedCard(raw9, SPEC)!.sents).toBe(4)
  })
  test('keeps only well-formed spans, tolerates missing ones', () => {
    const raw = { ...GOOD_RAW, spans: [{ key: 'v1', en: 'waiting' }, { key: 'zz', en: 5 }] }
    const v = validatePackedCard(raw, SPEC)!
    expect(v.spans).toEqual([{ key: 'v1', en: 'waiting' }])
  })
})

describe('buildPackedGeneratePrompt', () => {
  test('lists every item with its key, Rektion, da-compound and behavior', () => {
    const p = buildPackedGeneratePrompt([SPEC], 'B1/B2', { angles: ['set it at the office'], seed: 'abc' })
    expect(p).toContain('[v1]')
    expect(p).toContain('warten')
    expect(p).toContain('[p1]')
    expect(p).toContain('Dativ')
    expect(p).toContain('darauf')      // the required da-compound is named outright
    expect(p).toContain('[k1]')
    expect(p).toContain('aber')
  })
})

describe('buildPackedSegments', () => {
  const card: GeneratedPackedCard = { ...SPEC, ...GOOD_RAW, sents: 1, spans: GOOD_RAW.spans }
  test('locates spans, keys them, reveals German only for verb + noun (hybrid)', () => {
    const segs = buildPackedSegments(card.english, card)
    const items = segs.filter(s => s.item)
    expect(items.map(s => s.item!.key)).toEqual(['n1x', 'v1', 'n1', 'p1', 'k1', 'd1'].filter(k => k !== 'n1x'))
    const byKey = new Map(items.map(s => [s.item!.key, s]))
    expect(byKey.get('v1')!.item!.reveal).toBe('warten')
    expect(byKey.get('n1')!.item!.reveal).toBe('der Bericht')
    expect(byKey.get('p1')!.item!.reveal).toBeUndefined()
    expect(byKey.get('d1')!.item!.reveal).toBeUndefined()
    expect(byKey.get('k1')!.item!.reveal).toBeUndefined()
  })
  test('two-part connector yields two spans sharing one key', () => {
    const pairSpec: PackedCardSpec = { index: 1, items: [{ key: 'k1', cat: 'conn', conn: CONN_PAIR }] }
    const pairCard: GeneratedPackedCard = {
      ...pairSpec,
      english: 'Both the rent and the costs are rising.',
      german: 'Sowohl die Miete als auch die Kosten steigen.',
      sents: 1,
      spans: [{ key: 'k1', en: 'Both' }, { key: 'k1', en: 'and' }]
    }
    const segs = buildPackedSegments(pairCard.english, pairCard)
    expect(segs.filter(s => s.item?.key === 'k1')).toHaveLength(2)
  })
  test('segments concatenate back to the source string', () => {
    const segs = buildPackedSegments(card.english, card)
    expect(segs.map(s => s.text).join('')).toBe(card.english)
  })
})
```

Note the first assertion in the hybrid test: expected key order is simply document order of located spans — write it as `expect(items.map(s => s.item!.key)).toEqual(['v1', 'n1', 'p1', 'k1', 'd1'])` (span order in `GOOD_RAW.english`: waiting → report → since → but → on it; "on it" appears last).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/composables/usePackedSentenceQuiz.test.ts`
Expected: FAIL — new exports missing.

- [ ] **Step 3: Implement generation + segments** (append to the composable)

```ts
import type { AiClient } from './useClaude'
import { prepUsed, normalizeGerman } from './useSentenceQuiz'
import { CONN_BEHAVIOR_LABEL, isPair, type Connector } from '../data/connectors'
// (merge these into the existing import lines at the top of the file)

export interface PackedSpan { key: string; en: string }
export interface GeneratedPackedCard extends PackedCardSpec {
  english: string
  german: string
  /** 1–4 sentences; ≥3 renders the "Kurztext" note and the smaller type size. */
  sents: number
  /** One span per item; a two-part connector carries TWO spans with one key. */
  spans: PackedSpan[]
}

export const PACKED_ANGLE_POOL = [
  'set the scene at the office', 'set it during a move to a new apartment',
  'use a first-person plural subject (wir)', 'frame part of it as a question',
  'set it on a weekend trip', 'put one clause in the Perfekt (past)',
  'set it in a kitchen', 'use a polite request (Sie)', 'open with an adverb of time',
  'set it at a train station', 'frame it as something overheard', 'set it during bad weather'
] as const

export const PACKED_GEN_SYSTEM =
  'You are a German teacher writing packed translation exercises. For each item you are given ' +
  'a list of REQUIRED ingredients, each with a key: German verbs (conjugate them), nouns, ' +
  'prepositions (with their governed case), da-compounds (the exact compound word is given), ' +
  'and connectors (with the word order each part forces). Write ONE natural German passage of ' +
  '1–2 sentences that contains EVERY ingredient used correctly — stretch to 3 or at most 4 ' +
  'sentences ONLY when no natural 1–2 sentence packing exists — then give a faithful, natural ' +
  'English translation. The German MUST contain each given preposition (contractions like "im" ' +
  'are fine), each given da-compound word exactly, and every part of each given connector with ' +
  'the word order that part forces. ' +
  'Return ONLY one JSON object of exactly this shape (no prose, no markdown fences): ' +
  '{"items":[{"index":<number>,"english":"...","german":"...","sentenceCount":<1-4>,' +
  '"spans":[{"key":"v1","en":"..."}]}]} — exactly one entry per requested index. ' +
  '"spans" = one entry per ingredient key, where "en" is the exact English word(s) expressing ' +
  'that ingredient, copied verbatim from YOUR English translation (an exact substring of it); ' +
  'a TWO-PART connector gets TWO span entries with the same key, one per part.'

export const PACKED_GEN_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          english: { type: 'string' },
          german: { type: 'string' },
          sentenceCount: { type: 'integer' },
          spans: {
            type: 'array',
            items: {
              type: 'object',
              properties: { key: { type: 'string' }, en: { type: 'string' } },
              required: ['key', 'en']
            }
          }
        },
        required: ['index', 'english', 'german', 'sentenceCount', 'spans']
      }
    }
  },
  required: ['items']
}

function caseWord(c: string): string {
  switch (c) {
    case 'accusative': return 'Akkusativ'
    case 'dative': return 'Dativ'
    case 'dative+accusative': return 'Dativ + Akkusativ'
    case 'genitive': return 'Genitiv'
    case 'reflexive': return 'reflexiv'
    case 'two-way': return 'Wechselpräposition (Akkusativ for direction, Dativ for location)'
    default: return c
  }
}

function itemLine(it: PackedItemSpec): string {
  if (it.cat === 'verb' && it.verb) {
    const rekt = rektShort(it.verb.case)
    return `  [${it.key}] verb "${it.verb.german}" (${it.verb.english})${rekt ? ` — its object takes ${caseWord(it.verb.case)}` : ''}`
  }
  if (it.cat === 'noun' && it.noun) {
    return `  [${it.key}] noun "${it.noun.article} ${it.noun.german}" (${it.noun.english})`
  }
  if (it.cat === 'prep' && it.prep) {
    return `  [${it.key}] preposition "${it.prep.german}" (${it.prep.english}) — governs ${caseWord(it.prep.case)}`
  }
  if (it.cat === 'dac' && it.colloc) {
    const compound = daCompoundFor(it.colloc.preposition)
    return `  [${it.key}] da-compound "${compound}" — from "${it.colloc.word} ${it.colloc.preposition}" (${it.colloc.english}); the referent is a THING, so use the compound, never "${it.colloc.preposition} + pronoun"`
  }
  if (it.cat === 'conn' && it.conn) {
    if (isPair(it.conn)) {
      const [a, b] = it.conn.parts
      return `  [${it.key}] two-part connector "${it.conn.display}" (${it.conn.english}) — "${a.text}": ${CONN_BEHAVIOR_LABEL[a.behavior]}; "${b.text}": ${CONN_BEHAVIOR_LABEL[b.behavior]}. BOTH parts must appear (two span entries, same key).`
    }
    const p = it.conn.parts[0]
    return `  [${it.key}] connector "${p.text}" (${it.conn.english}) — ${CONN_BEHAVIOR_LABEL[p.behavior]}`
  }
  return `  [${it.key}] (unknown)`
}

export function buildPackedGeneratePrompt(
  specs: readonly PackedCardSpec[], level: string, variation: { angles: string[]; seed: string }
): string {
  const blocks = specs.map(s => `#${s.index} — required ingredients:\n${s.items.map(itemLine).join('\n')}`)
  return (
    `Target CEFR level: ${level}.\n` +
    `Write one packed German passage (1–2 sentences, 3–4 only if unavoidable) and its English translation for each of the following ${specs.length} item(s):\n` +
    blocks.join('\n') +
    `\nVary the framing across the batch — draw inspiration from these angles (do not echo them as text): ${variation.angles.join(' · ')}.` +
    `\nBatch variation seed: ${variation.seed}.` +
    `\nAlso return sentenceCount and spans (one per ingredient key; two-part connectors get two entries with the same key), each "en" an exact substring of your English translation.`
  )
}

/** True if `german` contains every part of the connector as whole words. */
export function connUsed(german: string, conn: Connector): boolean {
  const hay = ' ' + normalizeGerman(german) + ' '
  return conn.parts.every(p => hay.includes(' ' + normalizeGerman(p.text) + ' '))
}

function countSentences(german: string): number {
  return german.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0).length
}

export function validatePackedCard(raw: unknown, spec: PackedCardSpec): GeneratedPackedCard | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const english = typeof e.english === 'string' ? e.english.trim() : ''
  const german = typeof e.german === 'string' ? e.german.trim() : ''
  if (english.length < 3 || german.length < 3) return null

  // Hard containment checks — a packed card that silently dropped a drilled
  // item would grade the learner on an ingredient that is not there.
  const hay = ' ' + normalizeGerman(german) + ' '
  for (const it of spec.items) {
    if (it.cat === 'prep' && it.prep && !prepUsed(german, it.prep.german)) return null
    if (it.cat === 'dac' && it.colloc && !hay.includes(' ' + daCompoundFor(it.colloc.preposition) + ' ')) return null
    if (it.cat === 'conn' && it.conn && !connUsed(german, it.conn)) return null
  }

  const rawSents = typeof e.sentenceCount === 'number' && Number.isFinite(e.sentenceCount)
    ? Math.round(e.sentenceCount) : countSentences(german)
  const sents = Math.min(4, Math.max(1, rawSents))

  const validKeys = new Set(spec.items.map(i => i.key))
  const spans: PackedSpan[] = Array.isArray(e.spans)
    ? e.spans
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
        .map(s => ({ key: typeof s.key === 'string' ? s.key : '', en: typeof s.en === 'string' ? s.en.trim() : '' }))
        .filter(s => s.en.length > 0 && validKeys.has(s.key))
    : []

  return { ...spec, english, german, sents, spans }
}

function makeSeed(rng: () => number): string {
  return Math.floor(rng() * 1_000_000_000).toString(36)
}

export async function generatePackedBatch(
  client: AiClient,
  opts: { model: string; specs: PackedCardSpec[]; level?: string; maxRetries?: number; rng?: () => number }
): Promise<{ cards: GeneratedPackedCard[]; rejected: number; attempts: number }> {
  const rng = opts.rng ?? Math.random
  const level = opts.level ?? 'B1/B2'
  const maxRetries = opts.maxRetries ?? 2
  const bySpec = new Map(opts.specs.map(s => [s.index, s]))
  const accepted = new Map<number, GeneratedPackedCard>()
  let rejected = 0
  let attempts = 0

  while (accepted.size < opts.specs.length && attempts <= maxRetries) {
    attempts++
    const remaining = opts.specs.filter(s => !accepted.has(s.index))
    const angles = shuffle([...PACKED_ANGLE_POOL], Math.max(3, Math.min(6, remaining.length)), rng)
    const prompt = buildPackedGeneratePrompt(remaining, level, { angles, seed: makeSeed(rng) })

    let text = ''
    try {
      const res = await client.models.generateContent({
        model: opts.model,
        contents: prompt,
        config: {
          systemInstruction: PACKED_GEN_SYSTEM,
          responseMimeType: 'application/json',
          responseSchema: PACKED_GEN_SCHEMA,
          temperature: 0.95,
          topP: 0.95
        }
      })
      text = res.text ?? ''
    } catch { continue }

    let parsed: unknown
    try { parsed = JSON.parse(text) } catch { continue }
    const items = (parsed as { items?: unknown }).items
    if (!Array.isArray(items)) continue

    for (const raw of items) {
      const idx = typeof (raw as { index?: unknown }).index === 'number' ? (raw as { index: number }).index : NaN
      const spec = bySpec.get(idx)
      if (!spec || accepted.has(idx)) continue
      const v = validatePackedCard(raw, spec)
      if (v) accepted.set(idx, v); else rejected++
    }
  }

  const cards = opts.specs.filter(s => accepted.has(s.index)).map(s => accepted.get(s.index)!)
  return { cards, rejected, attempts }
}

// ─────────────────────────── Hint segments ────────────────────────────
//
// Hybrid reveal (CONTEXT.md → "Word hint"): every drilled item is highlighted
// in its category color, but only verbs and nouns carry a German reveal — for
// a preposition, da-compound, or connector the dictionary form would BE the
// graded answer.

export interface PackedSegment {
  text: string
  item?: { key: string; cat: PackedCategory; reveal?: string }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildPackedSegments(english: string, card: GeneratedPackedCard): PackedSegment[] {
  const byKey = new Map(card.items.map(i => [i.key, i]))
  interface Range { start: number; end: number; key: string; cat: PackedCategory; reveal?: string }
  const found: Range[] = []
  const used: Array<[number, number]> = []

  for (const span of card.spans) {
    const it = byKey.get(span.key)
    if (!it) continue
    const surface = span.en.trim()
    if (!surface) continue
    let re: RegExp
    try { re = new RegExp(`\\b${escapeRegExp(surface)}\\b`, 'gi') } catch { continue }
    // First match that does not overlap an already-claimed range — a pair's
    // second part with an identical surface must land on a fresh occurrence.
    let m: RegExpExecArray | null
    let placed = false
    while (!placed && (m = re.exec(english)) !== null) {
      const start = m.index, end = m.index + m[0].length
      if (used.some(([s2, e2]) => start < e2 && end > s2)) continue
      used.push([start, end])
      const reveal = it.cat === 'verb' && it.verb ? it.verb.german
        : it.cat === 'noun' && it.noun ? `${it.noun.article} ${it.noun.german}`
        : undefined
      found.push({ start, end, key: it.key, cat: it.cat, reveal })
      placed = true
    }
  }

  found.sort((a, b) => a.start - b.start)
  if (found.length === 0) return [{ text: english }]

  const segments: PackedSegment[] = []
  let cursor = 0
  for (const r of found) {
    if (r.start > cursor) segments.push({ text: english.slice(cursor, r.start) })
    segments.push({ text: english.slice(r.start, r.end), item: { key: r.key, cat: r.cat, reveal: r.reveal } })
    cursor = r.end
  }
  if (cursor < english.length) segments.push({ text: english.slice(cursor) })
  return segments
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/composables/usePackedSentenceQuiz.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/usePackedSentenceQuiz.ts tests/composables/usePackedSentenceQuiz.test.ts
git commit -m "feat(sentence): packed card generation, validation, hybrid hint segments"
```

---

### Task 5: Grading — AI per-item grade, local fallback, verdicts, meta builders

**Files:**
- Modify: `src/composables/usePackedSentenceQuiz.ts` (append)
- Test: `tests/composables/usePackedSentenceQuiz.test.ts` (append)

**Interfaces:**
- Consumes: Tasks 3–4; `VerbErrorTag, PrepErrorTag, DacErrorTag, ConnErrorTag, VerbDrillItem, PrepDrillItem, DacDrillItem, ConnectorDrillItem` from `./useQuizHistory`.
- Produces:
  ```ts
  export type PackedTag = 'conjugation' | 'case' | 'word-order' | 'noun' | 'preposition' | 'compound' | 'connector' | 'typo'
  export interface PackedItemResult { key: string; correct: boolean; tags?: PackedTag[] }
  export interface PackedGrade { items: PackedItemResult[]; tip?: string }
  export type PackedVerdict = 'ok' | 'part' | 'no'
  export function verdictOf(items: readonly PackedItemResult[]): PackedVerdict
  export function buildPackedGradePrompt(card: GeneratedPackedCard, userAnswer: string, spoken: boolean): { system: string; user: string }
  export function parsePackedGrade(raw: unknown, spec: PackedCardSpec): PackedGrade | null
  export function gradePackedAnswer(client: AiClient, opts: { model: string; card: GeneratedPackedCard; userAnswer: string; spoken?: boolean }): Promise<PackedGrade>   // throws when both attempts fail
  export function localCheckPackedCard(userAnswer: string, card: GeneratedPackedCard): PackedItemResult[]
  export function gradePackedMeaning(client: AiClient, opts: { model: string; card: GeneratedPackedCard; userAnswer: string }): Promise<{ correct: boolean; tip?: string }>  // DE→EN
  export interface PackedMetaItems { verbSentenceItems: VerbDrillItem[]; sentenceItems: PrepDrillItem[]; dacSentenceItems: DacDrillItem[]; packedConnItems: ConnectorDrillItem[] }
  export function buildPackedMetaItems(cards: readonly GeneratedPackedCard[], results: ReadonlyMap<number, readonly PackedItemResult[]>): PackedMetaItems
  ```

- [ ] **Step 1: Write the failing tests** (append)

```ts
import {
  verdictOf, parsePackedGrade, localCheckPackedCard, buildPackedMetaItems, buildPackedGradePrompt
} from '../../src/composables/usePackedSentenceQuiz'

const CARD: GeneratedPackedCard = { ...SPEC, ...GOOD_RAW, sents: 1, spans: GOOD_RAW.spans }

describe('verdictOf', () => {
  const r = (oks: boolean[]) => oks.map((ok, i) => ({ key: `x${i}`, correct: ok }))
  test('ok when all correct, part at >= half, no below half', () => {
    expect(verdictOf(r([true, true, true]))).toBe('ok')
    expect(verdictOf(r([true, true, false]))).toBe('part')   // 2/3 >= ceil(3/2)=2
    expect(verdictOf(r([true, false, false]))).toBe('no')
    expect(verdictOf(r([true, false, false, false]))).toBe('no')
    expect(verdictOf(r([true, true, false, false]))).toBe('part')
  })
})

describe('parsePackedGrade', () => {
  const goodItems = SPEC.items.map(i => ({ key: i.key, correct: true }))
  test('accepts a full per-item grade and filters unknown tags/keys', () => {
    const g = parsePackedGrade({
      items: [...goodItems.slice(0, 4), { key: 'k1', correct: false, tags: ['connector', 'word-order', 'nonsense'] }, { key: 'zz', correct: true }],
      tip: ' Watch the inversion. '
    }, SPEC)!
    expect(g.items).toHaveLength(5)
    expect(g.items.find(i => i.key === 'k1')!.tags).toEqual(['connector', 'word-order'])
    expect(g.tip).toBe('Watch the inversion.')
  })
  test('rejects when an item key is missing (forces a retry, never a silent gap)', () => {
    expect(parsePackedGrade({ items: goodItems.slice(1) }, SPEC)).toBeNull()
  })
  test('rejects non-objects', () => {
    expect(parsePackedGrade('nope', SPEC)).toBeNull()
  })
})

describe('localCheckPackedCard', () => {
  test('checks each item by word presence against the reference machinery', () => {
    const results = localCheckPackedCard(
      'Mein Kollege wartet seit Montag auf den Bericht, aber ich arbeite noch daran.', CARD
    )
    expect(results.every(r => r.correct)).toBe(true)
  })
  test('flags the missing connector and da-compound', () => {
    const results = localCheckPackedCard('Mein Kollege wartet seit Montag auf den Bericht.', CARD)
    const byKey = new Map(results.map(r => [r.key, r]))
    expect(byKey.get('k1')!.correct).toBe(false)
    expect(byKey.get('d1')!.correct).toBe(false)
    expect(byKey.get('p1')!.correct).toBe(true)
  })
  test('accepts an inflected noun (stem containment)', () => {
    const results = localCheckPackedCard('Wir warten seit Tagen auf die Berichte, aber ich arbeite daran.', CARD)
    expect(results.find(r => r.key === 'n1')!.correct).toBe(true)
  })
})

describe('buildPackedGradePrompt', () => {
  test('spoken variant forbids typo and mentions the transcript', () => {
    const { system } = buildPackedGradePrompt(CARD, 'egal', true)
    expect(system).toContain('NEVER')
    expect(system.toLowerCase()).toContain('transcri')
    const typed = buildPackedGradePrompt(CARD, 'egal', false)
    expect(typed.system).toContain('"typo"')
  })
})

describe('buildPackedMetaItems', () => {
  test('splits per-item results into the per-category history shapes (all-or-nothing stays per item)', () => {
    const results = new Map<number, PackedItemResult[]>([[0, [
      { key: 'v1', correct: false, tags: ['conjugation', 'connector'] },
      { key: 'n1', correct: false, tags: ['noun'] },
      { key: 'p1', correct: true },
      { key: 'd1', correct: false, tags: ['compound', 'case'] },
      { key: 'k1', correct: false, tags: ['connector', 'word-order'] }
    ]]])
    const meta = buildPackedMetaItems([CARD], results)
    expect(meta.verbSentenceItems).toEqual([
      { verbKeys: ['warten'], nounKeys: [], correct: false, tags: ['conjugation'] },   // 'connector' filtered out
      { verbKeys: [], nounKeys: ['Bericht'], correct: false, tags: ['noun'] }          // the noun rides as a noun-only item
    ])
    expect(meta.sentenceItems).toEqual([
      { prepId: 'seit', prepGerman: 'seit', nounKeys: [], correct: true }
    ])
    expect(meta.dacSentenceItems).toEqual([
      { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', nounKeys: [], correct: false, tags: ['compound', 'case'] }
    ])
    expect(meta.packedConnItems).toEqual([
      { connId: 'aber', connWord: 'aber', correct: false, tags: ['connector', 'word-order'] }
    ])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/composables/usePackedSentenceQuiz.test.ts`
Expected: FAIL — new exports missing.

- [ ] **Step 3: Implement grading** (append to the composable)

```ts
import type {
  VerbErrorTag, PrepErrorTag, DacErrorTag, ConnErrorTag,
  VerbDrillItem, PrepDrillItem, DacDrillItem, ConnectorDrillItem
} from './useQuizHistory'
// (merge into the top import block)

export type PackedTag = 'conjugation' | 'case' | 'word-order' | 'noun' | 'preposition' | 'compound' | 'connector' | 'typo'
const PACKED_TAGS: readonly PackedTag[] = ['conjugation', 'case', 'word-order', 'noun', 'preposition', 'compound', 'connector', 'typo']

export interface PackedItemResult { key: string; correct: boolean; tags?: PackedTag[] }
export interface PackedGrade { items: PackedItemResult[]; tip?: string }
export type PackedVerdict = 'ok' | 'part' | 'no'

/** ok = every item right · part = at least half · no = below half. */
export function verdictOf(items: readonly PackedItemResult[]): PackedVerdict {
  if (items.length === 0) return 'no'
  const ok = items.filter(i => i.correct).length
  if (ok === items.length) return 'ok'
  return ok >= Math.ceil(items.length / 2) ? 'part' : 'no'
}

const PACKED_GRADE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          correct: { type: 'boolean' },
          tags: { type: 'array', items: { type: 'string', enum: [...PACKED_TAGS] } }
        },
        required: ['key', 'correct']
      }
    },
    tip: { type: 'string' }
  },
  required: ['items']
}

const PACKED_GRADE_COMMON =
  'You are a German teacher grading one packed translation exercise. The learner was shown the ' +
  'ENGLISH passage and produced a GERMAN translation that must contain several required ' +
  'ingredients, each identified by a key. Judge EVERY ingredient separately. Respond ONLY as ' +
  'JSON {"items":[{"key":"<key>","correct":<boolean>,"tags":["<tag>"]}],"tip":"<string>"} — no ' +
  'prose, no markdown fences, exactly one entry per listed key. An ingredient is correct when ' +
  'it appears, correctly formed and correctly placed, in an overall grammatical rendering — ' +
  'accept natural alternative phrasings; do not require an exact match to the reference. ' +
  'When an ingredient is wrong, set "tags" to every applicable value from exactly: ' +
  '"conjugation" (right verb, wrong form), "case" (wrong governed case — article or ending), ' +
  '"word-order" (verb-second/verb-final/inversion or separable-prefix placement wrong, incl. ' +
  'the word order a connector forces), "noun" (wrong noun — word, gender, or form), ' +
  '"preposition" (wrong or missing preposition word), "compound" (malformed or missing ' +
  'da-compound, or preposition+pronoun used for a thing), "connector" (wrong or missing ' +
  'connector word or part)'

const PACKED_GRADE_SYSTEM_TYPED =
  PACKED_GRADE_COMMON +
  ', "typo" (a spelling slip elsewhere). Set "tip" to ONE short English sentence pinpointing ' +
  'the most important mistake when anything is wrong; when everything is correct it may be empty.'

const PACKED_GRADE_SYSTEM_SPOKEN =
  PACKED_GRADE_COMMON +
  '. The learner SPOKE the German and a browser speech recognizer transcribed it — judge only ' +
  'the words as transcribed and ignore capitalisation and punctuation entirely; the transcript ' +
  'has neither reliably. NEVER return "typo" — the spelling in the transcript is the speech ' +
  "recognizer's, not the learner's. Set \"tip\" to ONE short English sentence pinpointing the " +
  'most important mistake when anything is wrong; when everything is correct it may be empty.'

export function buildPackedGradePrompt(
  card: GeneratedPackedCard, userAnswer: string, spoken: boolean
): { system: string; user: string } {
  const system = spoken ? PACKED_GRADE_SYSTEM_SPOKEN : PACKED_GRADE_SYSTEM_TYPED
  const answerLabel = spoken ? "LEARNER'S SPOKEN GERMAN ANSWER (transcript):" : "LEARNER'S GERMAN ANSWER:"
  const user =
    `ENGLISH (source shown to the learner): ${card.english}\n` +
    `GERMAN (reference translation): ${card.german}\n` +
    `INGREDIENTS TO VERIFY (one JSON entry per key):\n${card.items.map(itemLine).join('\n')}\n` +
    `${answerLabel} ${userAnswer}`
  return { system, user }
}

export function parsePackedGrade(raw: unknown, spec: PackedCardSpec): PackedGrade | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.items)) return null
  const validKeys = new Set(spec.items.map(i => i.key))
  const byKey = new Map<string, PackedItemResult>()
  for (const it of r.items) {
    if (!it || typeof it !== 'object') continue
    const e = it as Record<string, unknown>
    if (typeof e.key !== 'string' || !validKeys.has(e.key) || typeof e.correct !== 'boolean') continue
    const result: PackedItemResult = { key: e.key, correct: e.correct }
    if (Array.isArray(e.tags)) {
      const tags = e.tags.filter((t): t is PackedTag => typeof t === 'string' && (PACKED_TAGS as readonly string[]).includes(t))
      if (tags.length > 0) result.tags = tags
    }
    if (!byKey.has(e.key)) byKey.set(e.key, result)
  }
  // Every spec key must be graded — a silent gap would mis-score the card.
  if (byKey.size !== validKeys.size) return null
  const items = spec.items.map(i => byKey.get(i.key)!)
  const grade: PackedGrade = { items }
  if (typeof r.tip === 'string') {
    const tip = r.tip.trim()
    if (tip.length > 0) grade.tip = tip
  }
  return grade
}

export async function gradePackedAnswer(
  client: AiClient,
  opts: { model: string; card: GeneratedPackedCard; userAnswer: string; spoken?: boolean }
): Promise<PackedGrade> {
  const { system, user } = buildPackedGradePrompt(opts.card, opts.userAnswer, !!opts.spoken)
  const maxRetries = 1
  let attempts = 0
  let lastError = 'no attempts'
  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model: opts.model,
        contents: user,
        config: { systemInstruction: system, responseMimeType: 'application/json', responseSchema: PACKED_GRADE_SCHEMA, temperature: 0 }
      })
      let parsed: unknown
      try { parsed = JSON.parse(response.text ?? '') } catch { lastError = 'malformed JSON'; continue }
      const grade = parsePackedGrade(parsed, opts.card)
      if (grade === null) { lastError = 'validation failed'; continue }
      if (opts.spoken) {
        // Deterministic guarantee (mirrors gradeVerbAnswer): 'typo' never
        // reaches history from a spoken run, even if the model ignores the prompt.
        for (const item of grade.items) {
          if (!item.tags) continue
          const tags = item.tags.filter(t => t !== 'typo')
          if (tags.length > 0) item.tags = tags; else delete item.tags
        }
      }
      return grade
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new Error(`gradePackedAnswer exhausted ${attempts} attempts. Last error: ${lastError}`)
}

/**
 * Offline fallback ("lokale Prüfung per Wortabgleich"): per-item word-presence
 * checks against the learner's answer. Degraded by design — no tags, verbs
 * check by stem, umlaut plurals may miss.
 */
export function localCheckPackedCard(userAnswer: string, card: GeneratedPackedCard): PackedItemResult[] {
  const norm = normalizeGerman(userAnswer)
  const hay = ' ' + norm + ' '
  return card.items.map(it => {
    let correct = false
    if (it.cat === 'prep' && it.prep) correct = prepUsed(userAnswer, it.prep.german)
    else if (it.cat === 'dac' && it.colloc) correct = hay.includes(' ' + daCompoundFor(it.colloc.preposition) + ' ')
    else if (it.cat === 'conn' && it.conn) correct = connUsed(userAnswer, it.conn)
    else if (it.cat === 'noun' && it.noun) correct = norm.includes(normalizeGerman(it.noun.german))
    else if (it.cat === 'verb' && it.verb) {
      const inf = normalizeGerman(it.verb.german)
      const stem = inf.replace(/e?n$/, '')
      correct = stem.length >= 3 ? norm.includes(stem) : norm.includes(inf)
    }
    return { key: it.key, correct }
  })
}

const PACKED_MEANING_SCHEMA = {
  type: 'object',
  properties: { correct: { type: 'boolean' }, tip: { type: 'string' } },
  required: ['correct']
}

const PACKED_MEANING_SYSTEM =
  'You are a German teacher grading one translation exercise. The learner was shown the GERMAN ' +
  'passage and typed an ENGLISH translation. Judge whether the English correctly conveys the ' +
  'meaning of the German — accept paraphrases and synonyms; meaning matters, not an exact match ' +
  'to the reference. Respond ONLY as JSON {"correct": <boolean>, "tip": "<string>"} — no prose, ' +
  'no markdown fences. When "correct" is false, set "tip" to ONE short English sentence ' +
  'pinpointing the drift; otherwise it may be empty.'

export async function gradePackedMeaning(
  client: AiClient,
  opts: { model: string; card: GeneratedPackedCard; userAnswer: string }
): Promise<{ correct: boolean; tip?: string }> {
  const user =
    `GERMAN (source shown to the learner): ${opts.card.german}\n` +
    `ENGLISH (reference translation): ${opts.card.english}\n` +
    `LEARNER'S ENGLISH ANSWER: ${opts.userAnswer}`
  const maxRetries = 1
  let attempts = 0
  let lastError = 'no attempts'
  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model: opts.model,
        contents: user,
        config: { systemInstruction: PACKED_MEANING_SYSTEM, responseMimeType: 'application/json', responseSchema: PACKED_MEANING_SCHEMA, temperature: 0 }
      })
      let parsed: unknown
      try { parsed = JSON.parse(response.text ?? '') } catch { lastError = 'malformed JSON'; continue }
      if (!parsed || typeof parsed !== 'object' || typeof (parsed as { correct?: unknown }).correct !== 'boolean') {
        lastError = 'validation failed'; continue
      }
      const r = parsed as { correct: boolean; tip?: unknown }
      const out: { correct: boolean; tip?: string } = { correct: r.correct }
      if (typeof r.tip === 'string' && r.tip.trim().length > 0) out.tip = r.tip.trim()
      return out
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new Error(`gradePackedMeaning exhausted ${attempts} attempts. Last error: ${lastError}`)
}

// ───────────────────────── History meta builders ──────────────────────

const VERB_TAGS: readonly VerbErrorTag[] = ['conjugation', 'case', 'word-order', 'noun', 'typo']
const PREP_TAGS: readonly PrepErrorTag[] = ['preposition', 'case', 'noun', 'typo']
const DAC_TAGS: readonly DacErrorTag[] = ['preposition', 'compound', 'case', 'noun', 'typo', 'word-order']
const CONN_TAGS: readonly ConnErrorTag[] = ['connector', 'word-order', 'typo']

function pick<T extends string>(tags: readonly PackedTag[] | undefined, allowed: readonly T[]): T[] | undefined {
  if (!tags) return undefined
  const out = tags.filter((t): t is T => (allowed as readonly string[]).includes(t))
  return out.length > 0 ? out : undefined
}

export interface PackedMetaItems {
  verbSentenceItems: VerbDrillItem[]
  sentenceItems: PrepDrillItem[]
  dacSentenceItems: DacDrillItem[]
  packedConnItems: ConnectorDrillItem[]
}

/**
 * Split per-item results into the per-category shapes the existing weak-point
 * scorers read (ADR-0015 pooling). Nouns ride as noun-only VerbDrillItems
 * (verbKeys: []) so computeVerbWeakPoints counts them without inventing a
 * verb; every nounKeys elsewhere stays [] to avoid double counting.
 */
export function buildPackedMetaItems(
  cards: readonly GeneratedPackedCard[],
  results: ReadonlyMap<number, readonly PackedItemResult[]>
): PackedMetaItems {
  const meta: PackedMetaItems = { verbSentenceItems: [], sentenceItems: [], dacSentenceItems: [], packedConnItems: [] }
  for (const card of cards) {
    const rs = results.get(card.index)
    if (!rs) continue
    const byKey = new Map(rs.map(r => [r.key, r]))
    for (const it of card.items) {
      const r = byKey.get(it.key)
      if (!r) continue
      if (it.cat === 'verb' && it.verb) {
        const item: VerbDrillItem = { verbKeys: [it.verb.german], nounKeys: [], correct: r.correct }
        const tags = pick(r.tags, VERB_TAGS)
        if (tags) item.tags = tags
        meta.verbSentenceItems.push(item)
      } else if (it.cat === 'noun' && it.noun) {
        const item: VerbDrillItem = { verbKeys: [], nounKeys: [it.noun.german], correct: r.correct }
        const tags = pick(r.tags, VERB_TAGS)
        if (tags) item.tags = tags
        meta.verbSentenceItems.push(item)
      } else if (it.cat === 'prep' && it.prep) {
        const item: PrepDrillItem = { prepId: it.prep.id, prepGerman: it.prep.german, nounKeys: [], correct: r.correct }
        const tags = pick(r.tags, PREP_TAGS)
        if (tags) item.tags = tags
        meta.sentenceItems.push(item)
      } else if (it.cat === 'dac' && it.colloc) {
        const item: DacDrillItem = { collocId: it.colloc.id, collocWord: it.colloc.word, prepGerman: it.colloc.preposition, nounKeys: [], correct: r.correct }
        const tags = pick(r.tags, DAC_TAGS)
        if (tags) item.tags = tags
        meta.dacSentenceItems.push(item)
      } else if (it.cat === 'conn' && it.conn) {
        const item: ConnectorDrillItem = { connId: it.conn.id, connWord: it.conn.display, correct: r.correct }
        const tags = pick(r.tags, CONN_TAGS)
        if (tags) item.tags = tags
        meta.packedConnItems.push(item)
      }
    }
  }
  return meta
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run tests/composables/usePackedSentenceQuiz.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/usePackedSentenceQuiz.ts tests/composables/usePackedSentenceQuiz.test.ts
git commit -m "feat(sentence): per-item AI grading, local fallback, verdicts, history meta builders"
```

---

### Task 6: Weak-point pooling + connector stats

**Files:**
- Modify: `src/composables/useVerbSentenceStats.ts:14`
- Modify: `src/composables/usePrepRemedial.ts:57`
- Modify: `src/composables/useDacSentenceStats.ts:16`
- Create: `src/composables/useConnectorStats.ts`
- Test: `tests/composables/useConnectorStats.test.ts`

**Interfaces:**
- Consumes: `QuizHistoryEntry, ConnErrorTag, ConnectorDrillItem` from `./useQuizHistory`.
- Produces:
  ```ts
  export interface WeakConnector { connId: string; word: string; seen: number; wrong: number; score: number }
  export interface ConnectorWeakPoints { weakConnectors: WeakConnector[]; tagCounts: Record<ConnErrorTag, number> }
  export function computeConnectorWeakPoints(entries: QuizHistoryEntry[]): ConnectorWeakPoints
  ```

- [ ] **Step 1: Write the failing test**

`tests/composables/useConnectorStats.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { computeConnectorWeakPoints } from '../../src/composables/useConnectorStats'
import { computeVerbWeakPoints } from '../../src/composables/useVerbSentenceStats'
import { computeWeakPoints } from '../../src/composables/usePrepRemedial'
import { computeDacWeakPoints } from '../../src/composables/useDacSentenceStats'
import type { QuizHistoryEntry } from '../../src/composables/useQuizHistory'

function packedEntry(): QuizHistoryEntry {
  return {
    id: 1, type: 'sentence-packed',
    startedAt: '2026-08-06T10:00:00Z', finishedAt: '2026-08-06T10:05:00Z',
    durationMs: 300000, count: 2, correct: 1,
    meta: {
      packedConnItems: [
        { connId: 'jedoch', connWord: 'jedoch', correct: false, tags: ['connector', 'word-order'] },
        { connId: 'jedoch', connWord: 'jedoch', correct: false, tags: ['word-order'] },
        { connId: 'aber', connWord: 'aber', correct: true }
      ],
      verbSentenceItems: [
        { verbKeys: ['warten'], nounKeys: [], correct: false, tags: ['conjugation'] },
        { verbKeys: [], nounKeys: ['Bericht'], correct: false, tags: ['noun'] }
      ],
      sentenceItems: [{ prepId: 'seit', prepGerman: 'seit', nounKeys: [], correct: false, tags: ['case'] }],
      dacSentenceItems: [{ collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', nounKeys: [], correct: false, tags: ['compound'] }]
    }
  }
}

describe('computeConnectorWeakPoints', () => {
  test('aggregates seen/wrong/score and tag counts from sentence-packed runs', () => {
    const wp = computeConnectorWeakPoints([packedEntry()])
    expect(wp.weakConnectors[0]).toMatchObject({ connId: 'jedoch', seen: 2, wrong: 2 })
    expect(wp.weakConnectors[0].score).toBeGreaterThan(0)
    expect(wp.weakConnectors.find(w => w.connId === 'aber')).toMatchObject({ seen: 1, wrong: 0 })
    expect(wp.tagCounts.connector).toBe(1)
    expect(wp.tagCounts['word-order']).toBe(2)
  })
  test('ignores non-packed runs', () => {
    const e = packedEntry()
    e.type = 'verb-sentence'
    expect(computeConnectorWeakPoints([e]).weakConnectors).toHaveLength(0)
  })
})

describe('packed runs pool into the existing scorers (ADR-0015)', () => {
  test('verb scorer counts packed verbs and nouns', () => {
    const wp = computeVerbWeakPoints([packedEntry()])
    expect(wp.weakVerbs.find(v => v.verbKey === 'warten')).toMatchObject({ seen: 1, wrong: 1 })
    expect(wp.weakNouns.find(n => n.nounKey === 'Bericht')).toMatchObject({ seen: 1, wrong: 1 })
  })
  test('prep scorer counts packed prepositions', () => {
    const wp = computeWeakPoints([packedEntry()])
    expect(wp.weakPreps.find(p => p.prepId === 'seit')).toBeTruthy()
  })
  test('dac scorer counts packed collocations', () => {
    const wp = computeDacWeakPoints([packedEntry()])
    expect(wp.weakCollocs.find(c => c.collocId === 'warten-auf')).toBeTruthy()
  })
})
```

Before running: check `usePrepRemedial.ts` `WeakPoints` / `WeakPrep` field names (the interface at line 29 — if the id field is named differently, e.g. `prepId` vs `id`, adjust the assertion to the real field; same for `useDacSentenceStats`'s `DacWeakPoints.weakCollocs`). Read those two interfaces first and use the actual property names in the test.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/composables/useConnectorStats.test.ts`
Expected: FAIL — `useConnectorStats` not found, and the pooling tests fail because the scorers don't accept `sentence-packed` yet.

- [ ] **Step 3: Implement**

1. `src/composables/useVerbSentenceStats.ts:14`:
   `const VERB_REMEDIAL_TYPES = new Set(['verb-sentence', 'verb-remedial', 'sentence-packed'])`
   Update the comment: packed runs pool here per ADR-0015.
2. `src/composables/usePrepRemedial.ts:57`:
   `const REMEDIAL_TYPES = new Set(['prep-sentence', 'prep-remedial', 'sentence-packed'])`
3. `src/composables/useDacSentenceStats.ts:16`:
   `const DAC_HISTORY_TYPES = new Set(['dac-sentence', 'dac-answer', 'sentence-packed'])`
4. Create `src/composables/useConnectorStats.ts`:

```ts
// Pure weak-point scoring for connectors in sentence-packed runs
// (no Vue/DOM/storage). Mirrors useVerbSentenceStats, slimmed to one axis.

import type { ConnErrorTag, ConnectorDrillItem, QuizHistoryEntry } from './useQuizHistory'

export interface WeakConnector { connId: string; word: string; seen: number; wrong: number; score: number }
export interface ConnectorWeakPoints {
  weakConnectors: WeakConnector[]   // score desc
  tagCounts: Record<ConnErrorTag, number>
}

const PACKED_TYPES = new Set(['sentence-packed'])

/** Error-rate weighted by log of attempts (1-of-1 wrong → 0). */
export function weightedScore(wrong: number, seen: number): number {
  return seen > 0 ? (wrong / seen) * Math.log(seen) : 0
}

export function computeConnectorWeakPoints(entries: QuizHistoryEntry[]): ConnectorWeakPoints {
  const map = new Map<string, WeakConnector>()
  const tagCounts: Record<ConnErrorTag, number> = { connector: 0, 'word-order': 0, typo: 0 }
  for (const entry of entries) {
    if (!PACKED_TYPES.has(entry.type)) continue
    const items: ConnectorDrillItem[] = entry.meta.packedConnItems ?? []
    for (const item of items) {
      const key = item.connId ?? item.connWord ?? ''
      if (!key) continue
      let w = map.get(key)
      if (!w) { w = { connId: key, word: item.connWord ?? key, seen: 0, wrong: 0, score: 0 }; map.set(key, w) }
      w.seen++
      if (!item.correct) w.wrong++
      if (Array.isArray(item.tags)) for (const t of item.tags) tagCounts[t]++
    }
  }
  const weakConnectors = [...map.values()]
  for (const w of weakConnectors) w.score = weightedScore(w.wrong, w.seen)
  weakConnectors.sort((a, b) => b.score - a.score || b.wrong - a.wrong || b.seen - a.seen)
  return { weakConnectors, tagCounts }
}
```

- [ ] **Step 4: Run the new test + the full suite (regression on the three scorers)**

Run: `npx vitest run tests/composables/useConnectorStats.test.ts && npm test`
Expected: PASS everywhere.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useConnectorStats.ts src/composables/useVerbSentenceStats.ts src/composables/usePrepRemedial.ts src/composables/useDacSentenceStats.ts tests/composables/useConnectorStats.test.ts
git commit -m "feat(sentence): pool packed-run evidence into weak points + connector tracker"
```

---

### Task 7: Module CSS

**Files:**
- Create: `src/styles/sentence.css`
- Modify: `src/main.ts:16` (add `import './styles/sentence.css'` after the sprechen import)

**Interfaces:**
- Consumes: tokens from `src/styles/tokens.css` only.
- Produces: global classes `.sn-*` (shared) and `.sna-*` (Variant A) used by Tasks 8–10.

- [ ] **Step 1: Port the Variant-A CSS**

Copy from `docs/design_handoff_sentence_module/styles-sentence-redesign.css` into `src/styles/sentence.css`:
- KEEP: the `/* pips */` block, `/* source text + hint spans */`, `/* answer area */`, `/* badges + chips */`, `/* A: compact graded view */`, `/* streaming skeleton */`, `/* retry modal */`, `/* record affordance */`, the whole `VARIANT A — Das Register` section, `/* result shared */`, and the `@media (max-width:860px)` block **minus** every `.snb-*` rule inside it.
- DROP: the header `html,body{overflow-x:clip}` line (tokens.css:1852-1853 already sets exactly that), `.sn-page`, `.sn-switch*`, `.sn-demo*`, `.sn-stage` (comparison-shell only), and the entire `VARIANT B` section including the `.snb-card .sn-i` wash rules.
- ADD at the end — the hybrid reveal popover (verb/noun only; markup in Task 10 puts `.sn-pop` inside the span):

```css
/* Hybrid word-hint reveal (CONTEXT.md → "Word hint"): verb + noun spans carry
   a German popover; prep/dac/connector spans highlight only. */
.sn-i.has-pop{cursor:help}
.sn-pop{position:absolute;bottom:100%;left:50%;transform:translateX(-50%) translateY(-6px);max-width:min(80vw,260px);white-space:normal;text-align:center;font-family:var(--font-mono);font-size:13px;line-height:1.2;padding:4px 8px;border-radius:4px;background:var(--paper-card);color:var(--ink);border:1px solid var(--rule);box-shadow:0 4px 12px rgba(0,0,0,.18);pointer-events:none;opacity:0;visibility:hidden;transition:opacity 120ms ease;z-index:2}
.sn-i{position:relative}
.sn-i.has-pop:hover .sn-pop,.sn-i.has-pop:focus-visible .sn-pop,.sn-i.revealed .sn-pop{opacity:1;visibility:visible}
```

Add a header comment naming the source file and Variant A.

- [ ] **Step 2: Register in main.ts**

In `src/main.ts` after `import './styles/sprechen.css'` add `import './styles/sentence.css'`.

- [ ] **Step 3: Verify build**

Run: `npm run typecheck && npx vite build`
Expected: PASS (CSS is syntax-checked by the build).

- [ ] **Step 4: Commit**

```bash
git add src/styles/sentence.css src/main.ts
git commit -m "feat(sentence): port Variant A module CSS"
```

---

### Task 8: Setup surface

**Files:**
- Create: `src/modules/sentence/SentenceSetup.vue`
- Test: `tests/modules/sentence/SentenceSetup.test.ts`

**Interfaces:**
- Consumes: `useVerbs().filter({ levels, types, cases })`, `useNouns().countsByGroup() / sampleByGroups(groups, n)`, `useSettings()` (`settings`, `canUseAi`, `load`), `PREPOSITIONS, PREPOSITION_CASES` from `../../data/prepositions`, `COLLOCATIONS` from `../../data/collocations`, `CONNECTORS, CONN_FAMILIES, connectorsForFamilies, isPair` from `../../data/connectors`, `NOUN_GROUPS` from `../../db/types`, `VERB_LEVELS, VERB_TYPES, VERB_CASES, migrateVerbLevels` from `../../data/verbs`, `nounToRef` from `../../composables/useSentenceQuiz`, `levelLabel` from `../../composables/useVerbSentenceQuiz`, and from `usePackedSentenceQuiz`: `PACKED_CATS, PACKED_MAX, PACKED_BUDGET, PACKED_WARN_AT, packedTotal, packedVerbToRef, buildPackedSpecs`, plus `isSpeechRecognitionSupported`.
- Produces: sessionStorage stash consumed by Task 10:
  ```ts
  const STASH_KEY = 'gt:lastPackedSentenceQuiz'
  interface PackedStash {
    specs: PackedCardSpec[]
    direction: 'en-de' | 'de-en'
    modality: 'typed' | 'spoken'
    wordHints: boolean
    level: string
    meta: {
      counts: PackedCounts
      verbLevels: string[]; verbTypes: string[]; verbCases: string[]
      nounGroups: string[]; prepCases: string[]
      connFamilies: string[]; connWords: string[]
    }
  }
  ```
  localStorage persistence key: `'sentenceSetup'`.

- [ ] **Step 1: Write the failing test**

`tests/modules/sentence/SentenceSetup.test.ts` — mirror the harness of `tests/modules/da-compounds/SentenceSetup.test.ts` exactly (vi.hoisted `canUseAiRef`, `vi.mock` for `useNouns` with the group names `Office/Work/Furniture/House/Rooms/Family/School/Bank & Money/Food/Other`, `vi.mock` for `useSettings`, memory router with routes named `sentence` (`/sentence`) and `sentence-run` (`/sentence/run`) plus `home` (`/`)):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SentenceSetup from '../../../src/modules/sentence/SentenceSetup.vue'

const { canUseAiRef } = vi.hoisted(() => ({ canUseAiRef: { value: true } }))

vi.mock('../../../src/composables/useNouns', () => ({
  useNouns: () => ({
    countsByGroup: async () => ({
      Office: 4, Work: 0, Furniture: 3, House: 5, Rooms: 0,
      Family: 0, School: 0, 'Bank & Money': 0, Food: 0, Other: 0
    }),
    sampleByGroups: async () => [
      { id: 1, german: 'Küche', gender: 'die', english: 'kitchen', group: 'House', createdAt: 0 },
      { id: 2, german: 'Bericht', gender: 'der', english: 'report', group: 'Office', createdAt: 0 }
    ]
  })
}))
vi.mock('../../../src/composables/useSettings', async () => {
  const vue = await import('vue')
  return {
    useSettings: () => ({
      settings: vue.ref({ id: 'singleton', geminiApiKey: 'AIzaTest', model: 'gemini-test', aiProvider: 'gemini', localClaudeModel: 'sonnet', localClaudeEffort: 'low' }),
      canUseAi: vue.computed(() => canUseAiRef.value),
      load: async () => {}
    })
  }
})

async function mountSetup() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/sentence', name: 'sentence', component: { template: '<div />' } },
      { path: '/sentence/run', name: 'sentence-run', component: { template: '<div />' } }
    ]
  })
  await router.push({ name: 'sentence' })
  const wrapper = mount(SentenceSetup, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('SentenceSetup', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    canUseAiRef.value = true
  })

  it('renders five category blocks with the default counts 2/2/1/1/1', async () => {
    const { wrapper } = await mountSetup()
    const names = wrapper.findAll('.sna-name').map(n => n.text())
    expect(names.join(' ')).toContain('Verben')
    expect(names.join(' ')).toContain('Nomen')
    expect(names.join(' ')).toContain('Präpositionen')
    expect(names.join(' ')).toContain('Da-Komposita')
    expect(names.join(' ')).toContain('Konnektoren')
    expect(wrapper.find('.sna-meter-t').text()).toContain('7 / 8')
  })

  it('budget meter warns at >= 7 items and blocks past 8', async () => {
    const { wrapper } = await mountSetup()
    expect(wrapper.find('.sna-meter').classes()).toContain('warn')  // default total is 7
    // every enabled "+"-side count option that would push past 8 must be disabled
    const segs = wrapper.findAll('.sna-count-seg button')
    const three = segs.filter(b => b.text() === '3')
    expect(three.some(b => (b.attributes('disabled') !== undefined))).toBe(true)
  })

  it('DE→EN hides Modalität and Wort-Hinweise', async () => {
    const { wrapper } = await mountSetup()
    const dirBtns = wrapper.findAll('.segmented button').filter(b => b.text() === 'DE → EN')
    await dirBtns[0].trigger('click')
    expect(wrapper.text()).not.toContain('Modalität')
    expect(wrapper.text()).not.toContain('Wort-Hinweise')
  })

  it('start stashes specs and navigates to sentence-run', async () => {
    const { wrapper, router } = await mountSetup()
    const push = vi.spyOn(router, 'push')
    const start = wrapper.findAll('button').find(b => b.text().startsWith('Start ·'))!
    await start.trigger('click')
    await flushPromises()
    const raw = sessionStorage.getItem('gt:lastPackedSentenceQuiz')
    expect(raw).toBeTruthy()
    const stash = JSON.parse(raw!)
    expect(stash.specs).toHaveLength(5)                 // default preset 5 cards
    expect(stash.specs[0].items.length).toBe(7)         // default counts 2+2+1+1+1
    expect(push).toHaveBeenCalledWith({ name: 'sentence-run' })
  })

  it('zero total disables Start', async () => {
    const { wrapper } = await mountSetup()
    // click the 0 option in each of the five count segments
    for (const seg of wrapper.findAll('.sna-count-seg')) {
      await seg.findAll('button').find(b => b.text() === '0')!.trigger('click')
    }
    const start = wrapper.findAll('button').find(b => b.text().startsWith('Start ·'))!
    expect(start.attributes('disabled')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/modules/sentence/SentenceSetup.test.ts`
Expected: FAIL — component missing.

- [ ] **Step 3: Build the component**

`src/modules/sentence/SentenceSetup.vue`, transposing `SnaSetup` from `docs/design_handoff_sentence_module/sentence-a.jsx` to Vue with real pools. Structure (follow `VerbSentenceSetup.vue` conventions for persistence/start):

Script setup:
- State: `counts` (default `{ verb: 2, noun: 2, prep: 1, dac: 1, conn: 1 }`), `vLevels` (default `['A2','B1']`), `vTypes` (all of `VERB_TYPES`), `vCases` (all of `VERB_CASES`), `nGroups` (groups with nouns, set after `countsByGroup()`), `pCases` (all of `PREPOSITION_CASES`), `kFams` (default `['adversativ','kausal','konzessiv']`), `kDetail` (false), `kWords` (Set of `famId:connId`), `open` (which block's filters are open), `direction` (`'en-de'`), `modality` (`'typed'`), `wordHints` (true), `preset` (5), `custom` (6). Persist all to localStorage `'sentenceSetup'` on change; restore in `onMounted` (use `migrateVerbLevels` for levels).
- `total = packedTotal(counts)`; count option disabled when `o > current && total - current + o > PACKED_BUDGET` (exact rule from `SnaCount`).
- Budget meter: category cells with letters V/N/P/D/K and colors `var(--sage)/var(--cobalt)/var(--ochre)/var(--clay)/var(--ink-soft)`; caption German copy exactly from the design (`Leer — wähle mindestens ein Item` / `n / 8 Items pro Karte` / `n / 8 — Karten werden zu Kurztexten (3–4 Sätze) gedehnt`).
- Pools: `availableVerbs = filter({levels: vLevels, types: vTypes, cases: vCases}).length`; prep pool = `PREPOSITIONS.filter(p => pCases.includes(p.case))`; colloc pool = `COLLOCATIONS`; conn pool = `kDetail ? CONNECTORS.filter(c => kWords.has(c.family + ':' + c.id)) : connectorsForFamilies([...kFams])`.
- `emptyPool` per design (`counts.X > 0 && pool empty`); alerts with the design's German copy (`Leerer Pool — … stehen auf {n}, aber …`).
- `canStart = canUseAi && total > 0 && !anyEmpty`.
- `cards = preset === 'custom' ? clamp(custom, 1, 12) : preset`.
- Connector two-tier picker: family chips with `connectorsForFamilies([f.id]).length` counts; `Detailliert` button pre-selects all words of the selected families into `kWords` on first entry (exactly `enterDetail` from the design); word chips show `c.display`; hint copy verbatim: `Familie gewählt = alle Wörter der Familie im Topf. Zweiteilige Paare (sowohl … als auch) zählen als ein Item.`
- Verb filters: Niveau chips (VERB_LEVELS), Typ chips (VERB_TYPES), `Rektion · Objektkasus` chips (VERB_CASES — the app's real enum, not the design mock's) with All/None quiet buttons and the hint `„Verb + Dativ" gezielt üben: nur Dativ anwählen.`
- Noun filter: theme chips with per-group counts, empty groups disabled (reuse `VerbSentenceSetup` pattern).
- Prep filter: chips labeled `mit Akkusativ` / `mit Dativ` / `Wechselpräpositionen` / `mit Genitiv` mapped to `PREPOSITION_CASES` values, with per-case counts (`PREPOSITIONS.filter(p => p.case === c).length`).
- Dac block: `filterless`, summary `feste Kollokationsliste — keine Filter in v1`.
- Run options section (`.sna-opts`): Richtung segmented `EN → DE / DE → EN` + hints copy verbatim; Modalität (EN→DE only, spoken disabled without `isSpeechRecognitionSupported()`); Wort-Hinweise (EN→DE only, default An, hint `Markiert die abgefragten Wörter im englischen Satz.`); Anzahl Karten presets `3/5/8/Custom` (custom input 1–12) + caption `1 Karte ≈ {max(total,1)} bewertete Items`.
- `start()`: guard `canUseAi` (toast like VerbSentenceSetup), build pools → refs (`filter(...).map(packedVerbToRef)`, `(await sampleByGroups([...nGroups], 100000)).map(nounToRef)`, prep pool → `{ id, german, english, case }`, `COLLOCATIONS.map(c => ({ id: c.id, word: c.word, english: c.english, preposition: c.preposition, case: c.case }))`, conn pool as-is), `specs = buildPackedSpecs(pools, counts, cards)`, stash `PackedStash` (level: `levelLabel(vLevels)`; force `modality: direction === 'de-en' ? 'typed' : modality`; `wordHints: direction === 'en-de' && wordHints`), `sessionStorage.setItem(STASH_KEY, …)`, `router.push({ name: 'sentence-run' })`.
- Template skeleton: `.page` > `.sna-wrap` > `section-header` with breadcrumb `Kapitel XII · Satz · Einrichtung`, title `Setup<em>.</em>`, subtitle from the design (`Eine Karte, alle Kategorien: …`); sticky meter; five `.sna-block`s; `.sna-opts`; `.setup-actions` with ghost `← Zurück` (router → home) and accent `Start · {cards} Karten →`.

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run tests/modules/sentence/SentenceSetup.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/sentence/SentenceSetup.vue tests/modules/sentence/SentenceSetup.test.ts
git commit -m "feat(sentence): setup surface — category ledger, budget meter, connector picker"
```

---

### Task 9: Result surface

**Files:**
- Create: `src/modules/sentence/SentenceResult.vue`
- Test: `tests/modules/sentence/SentenceResult.test.ts`

**Interfaces:**
- Consumes: `GeneratedPackedCard, PackedItemResult, PackedVerdict, PackedCategory, rektShort` from `usePackedSentenceQuiz`; `SnTagChips`-style rendering inline.
- Produces (Task 10 imports this):
  ```ts
  // props
  interface CardOutcome {
    card: GeneratedPackedCard
    answer: string
    verdict: PackedVerdict
    items: PackedItemResult[] | null   // null on DE→EN
    tip?: string
    offline: boolean
  }
  defineProps<{ history: CardOutcome[]; direction: 'en-de' | 'de-en' }>()
  defineEmits<{ (e: 'restart'): void; (e: 'practice', cards: GeneratedPackedCard[]): void }>()
  // exported for reuse:
  export interface CardOutcome { … }  // exported from a small `src/modules/sentence/types.ts` if Vue SFC export friction arises — otherwise define in SentenceRunner and pass down; choose ONE and keep it: define CardOutcome in usePackedSentenceQuiz.ts as the canonical home.
  ```
  **Decision:** add to `usePackedSentenceQuiz.ts` (Task 9 step 3a):
  ```ts
  export interface CardOutcome {
    card: GeneratedPackedCard
    answer: string
    verdict: PackedVerdict
    items: PackedItemResult[] | null
    tip?: string
    offline: boolean
  }
  export interface PackedAggregate { cat: Record<PackedCategory, { ok: number; n: number }>; tags: Partial<Record<PackedTag, number>> }
  export function aggregateOutcomes(history: readonly CardOutcome[]): PackedAggregate
  ```

- [ ] **Step 1: Write the failing test**

`tests/modules/sentence/SentenceResult.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SentenceResult from '../../../src/modules/sentence/SentenceResult.vue'
import { aggregateOutcomes, type CardOutcome } from '../../../src/composables/usePackedSentenceQuiz'
import { CONNECTORS } from '../../../src/data/connectors'

const CONN = CONNECTORS.find(c => c.id === 'aber')!
function outcome(verdict: 'ok' | 'part' | 'no'): CardOutcome {
  return {
    card: {
      index: 0,
      items: [
        { key: 'v1', cat: 'verb', verb: { german: 'warten', english: 'wait', level: 'B1', case: 'accusative' } },
        { key: 'k1', cat: 'conn', conn: CONN }
      ],
      english: 'We are waiting, but he is not coming.',
      german: 'Wir warten, aber er kommt nicht.',
      sents: 1,
      spans: [{ key: 'v1', en: 'waiting' }, { key: 'k1', en: 'but' }]
    },
    answer: 'Wir warten, aber er kommt nicht.',
    verdict,
    items: [
      { key: 'v1', correct: verdict === 'ok' },
      { key: 'k1', correct: verdict !== 'no', tags: verdict === 'no' ? ['connector'] : undefined }
    ],
    offline: false
  }
}

describe('aggregateOutcomes', () => {
  it('sums per-category hits and tag counts', () => {
    const agg = aggregateOutcomes([outcome('ok'), outcome('no')])
    expect(agg.cat.verb).toEqual({ ok: 1, n: 2 })
    expect(agg.cat.conn).toEqual({ ok: 1, n: 2 })
    expect(agg.tags.connector).toBe(1)
  })
})

describe('SentenceResult', () => {
  it('shows all-or-nothing card score and items-hit subtitle', () => {
    const w = mount(SentenceResult, { props: { history: [outcome('ok'), outcome('part'), outcome('no')], direction: 'en-de' } })
    expect(w.find('.sn-res-score').text().replace(/\s+/g, ' ')).toContain('1 / 3')
    expect(w.find('.sn-res-sub').text()).toContain('Items getroffen')
  })
  it('offers Fehler üben with the wrong+partly cards (EN→DE only)', async () => {
    const w = mount(SentenceResult, { props: { history: [outcome('ok'), outcome('part'), outcome('no')], direction: 'en-de' } })
    const btn = w.findAll('button').find(b => b.text().includes('Fehler üben'))!
    expect(btn.text()).toContain('2')
    await btn.trigger('click')
    expect(w.emitted('practice')![0][0]).toHaveLength(2)
  })
  it('hides Fehler üben and tags for DE→EN', () => {
    const outcomes = [{ ...outcome('no'), items: null }]
    const w = mount(SentenceResult, { props: { history: outcomes, direction: 'de-en' } })
    expect(w.findAll('button').some(b => b.text().includes('Fehler üben'))).toBe(false)
    expect(w.text()).toContain('keine Fehler-Tags')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/modules/sentence/SentenceResult.test.ts`
Expected: FAIL.

- [ ] **Step 3a: Add CardOutcome + aggregateOutcomes to the composable**

```ts
export interface CardOutcome {
  card: GeneratedPackedCard
  answer: string
  verdict: PackedVerdict
  items: PackedItemResult[] | null   // null on DE→EN (meaning-only)
  tip?: string
  offline: boolean
}

export interface PackedAggregate {
  cat: Record<PackedCategory, { ok: number; n: number }>
  tags: Partial<Record<PackedTag, number>>
}

export function aggregateOutcomes(history: readonly CardOutcome[]): PackedAggregate {
  const cat = Object.fromEntries(PACKED_CATS.map(c => [c, { ok: 0, n: 0 }])) as PackedAggregate['cat']
  const tags: PackedAggregate['tags'] = {}
  for (const h of history) {
    if (!h.items) continue
    const byKey = new Map(h.card.items.map(i => [i.key, i]))
    for (const r of h.items) {
      const it = byKey.get(r.key)
      if (!it) continue
      cat[it.cat].n++
      if (r.correct) cat[it.cat].ok++
      else if (r.tags) for (const t of r.tags) tags[t] = (tags[t] ?? 0) + 1
    }
  }
  return { cat, tags }
}
```

- [ ] **Step 3b: Build the component**

`SentenceResult.vue` transposes `SnaResult`: breadcrumb `Kapitel XII · Satz · Auswertung`; `.sn-res-head` with `.sn-res-score` `{okCards}<span class="denom"> / {history.length}</span>` where `okCards = history.filter(h => h.verdict === 'ok').length` and `.sn-res-sub` `Karten ganz richtig · {itemsOk} von {itemsTotal} Items getroffen` (+ ` · DE → EN, nur Bedeutung bewertet` when `direction === 'de-en'`); `Nach Kategorie` bars (`.sna-bar` grid, category color fills, only categories with `n > 0`, labels from a local `CAT_META` map `{ verb: { de: 'Verben', color: 'var(--sage)' }, noun: { de: 'Nomen', color: 'var(--cobalt)' }, prep: { de: 'Präpositionen', color: 'var(--ochre)' }, dac: { de: 'Da-Komposita', color: 'var(--clay)' }, conn: { de: 'Konnektoren', color: 'var(--ink-soft)' } }`); `Fehlerbild` tag chips `.sna-tagd` sorted desc, or the DE→EN hint `In DE → EN gibt es keine Fehler-Tags — bewertet wird nur die Bedeutung.`; `Karten` expandable rows (`.sna-resrow`, ✓/◐/✗ marks, expanded body with `Deine Antwort` / `Referenz` / per-item `.sna-row` list with `rektShort` badges and `.sn-tag` chips on failed items); footer `.setup-actions` with ghost `← Neue Runde` (emit `restart`) and accent `Fehler üben · N Karten →` (emit `practice` with `history.filter(h => h.verdict !== 'ok').map(h => h.card)`, EN→DE only, hidden when none).

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run tests/modules/sentence/SentenceResult.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/sentence/SentenceResult.vue src/composables/usePackedSentenceQuiz.ts tests/modules/sentence/SentenceResult.test.ts
git commit -m "feat(sentence): result surface with per-category bars and tag distribution"
```

---

### Task 10: Runner surface

**Files:**
- Create: `src/modules/sentence/SentenceRunner.vue`
- Test: `tests/modules/sentence/SentenceRunner.test.ts`

**Interfaces:**
- Consumes: everything from `usePackedSentenceQuiz` (`generatePackedBatch`, `gradePackedAnswer`, `gradePackedMeaning`, `localCheckPackedCard`, `verdictOf`, `buildPackedSegments`, `buildPackedMetaItems`, `aggregateOutcomes`, `rektShort`, `CardOutcome`, types); `planRampBatches, generateProgressively` from `useProgressiveGenerator`; `saveQuizRun` from `useQuizHistory`; `useSettings`, `resolveAiClient`, `useSpeechRecognizer`, `useSpeechVoice`, `useToast`, `useSound`; `SentenceResult.vue`; stash `PackedStash` from Task 8 (`gt:lastPackedSentenceQuiz`).
- Produces: the recorded run:
  ```ts
  saveQuizRun({
    type: 'sentence-packed', startedAt, finishedAt, durationMs,
    count: <generated cards>, correct: <cards with verdict 'ok'>,   // all-or-nothing
    meta: {
      packedCounts, packedDirection, packedModality, packedHints,
      packedItemsOk, packedItemsTotal,
      ...buildPackedMetaItems(cards, resultsByIndex),   // verbSentenceItems, sentenceItems, dacSentenceItems, packedConnItems
      // plus filter echoes: verbSentenceLevels/-Types/-Cases: meta.verbLevels/…, sentenceGroups: meta.nounGroups
    }
  })
  ```

- [ ] **Step 1: Write the failing test** (logic-level, mocking the AI)

`tests/modules/sentence/SentenceRunner.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SentenceRunner from '../../../src/modules/sentence/SentenceRunner.vue'
import { CONNECTORS } from '../../../src/data/connectors'

vi.mock('../../../src/composables/useSettings', async () => {
  const vue = await import('vue')
  return {
    useSettings: () => ({
      settings: vue.ref({ id: 'singleton', geminiApiKey: 'AIzaTest', model: 'gemini-test', aiProvider: 'gemini', localClaudeModel: 'sonnet', localClaudeEffort: 'low' }),
      canUseAi: vue.computed(() => true),
      load: async () => {}
    })
  }
})

// One canned generated card per spec; grader marks everything correct.
vi.mock('../../../src/composables/usePackedSentenceQuiz', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../src/composables/usePackedSentenceQuiz')>()
  return {
    ...real,
    generatePackedBatch: async (_c: unknown, opts: { specs: Array<{ index: number; items: unknown[] }> }) => ({
      cards: opts.specs.map(s => ({
        ...s,
        english: 'We are waiting, but he is not coming.',
        german: 'Wir warten, aber er kommt nicht.',
        sents: 1,
        spans: [{ key: 'v1', en: 'waiting' }, { key: 'k1', en: 'but' }]
      })),
      rejected: 0, attempts: 1
    }),
    gradePackedAnswer: async (_c: unknown, o: { card: { items: Array<{ key: string }> } }) => ({
      items: o.card.items.map(i => ({ key: i.key, correct: true })), tip: undefined
    })
  }
})

const CONN = CONNECTORS.find(c => c.id === 'aber')!
function stash(cards = 2) {
  const specs = Array.from({ length: cards }, (_, index) => ({
    index,
    items: [
      { key: 'v1', cat: 'verb', verb: { german: 'warten', english: 'wait', level: 'B1', case: 'accusative' } },
      { key: 'k1', cat: 'conn', conn: CONN }
    ]
  }))
  sessionStorage.setItem('gt:lastPackedSentenceQuiz', JSON.stringify({
    specs, direction: 'en-de', modality: 'typed', wordHints: true, level: 'B1',
    meta: { counts: { verb: 1, noun: 0, prep: 0, dac: 0, conn: 1 }, verbLevels: ['B1'], verbTypes: [], verbCases: [], nounGroups: [], prepCases: [], connFamilies: ['adversativ'], connWords: [] }
  }))
}

async function mountRunner() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/sentence', name: 'sentence', component: { template: '<div />' } },
      { path: '/sentence/run', name: 'sentence-run', component: { template: '<div />' } }
    ]
  })
  await router.push({ name: 'sentence-run' })
  const wrapper = mount(SentenceRunner, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('SentenceRunner', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear() })

  it('renders the manifest and hint spans for the first card', async () => {
    stash()
    const w = await mountRunner()
    expect(w.find('.sna-manifest').text()).toContain('Gesucht')
    expect(w.findAll('.sn-i').length).toBeGreaterThanOrEqual(2)
    // hybrid: the verb span reveals German, the connector span does not
    const spans = w.findAll('.sn-i')
    const withPop = spans.filter(s => s.find('.sn-pop').exists())
    expect(withPop).toHaveLength(1)
    expect(withPop[0].find('.sn-pop').text()).toBe('warten')
  })

  it('grades a typed answer and records an all-or-nothing run once finished', async () => {
    stash(1)
    const w = await mountRunner()
    await w.find('textarea.sn-ta').setValue('Wir warten, aber er kommt nicht.')
    await w.findAll('button').find(b => b.text().startsWith('Einreichen'))!.trigger('click')
    await flushPromises()
    expect(w.find('.sn-verdict').text()).toContain('Richtig')
    await w.findAll('button').find(b => b.text().includes('Runde abschließen'))!.trigger('click')
    await flushPromises()
    const hist = JSON.parse(localStorage.getItem('gt:quizHistory')!)
    expect(hist).toHaveLength(1)
    expect(hist[0].type).toBe('sentence-packed')
    expect(hist[0].count).toBe(1)
    expect(hist[0].correct).toBe(1)
    expect(hist[0].meta.packedConnItems).toHaveLength(1)
    expect(hist[0].meta.verbSentenceItems).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/modules/sentence/SentenceRunner.test.ts`
Expected: FAIL — component missing.

- [ ] **Step 3: Build the runner**

`src/modules/sentence/SentenceRunner.vue`, structure modeled on `VerbSentenceRunner.vue` with the design's Variant-A visuals:

Script:
- Stash load in `onMounted` (error state on missing stash, exactly like VerbSentenceRunner lines 126–140); `spoken = stash.modality === 'spoken' && recognizer.supported && direction === 'en-de'`.
- Generation: `planRampBatches(stash.specs, [1, 2], 3)` (packed cards are heavy — smaller batches than the [1,2,5]/10 ramp), `generateProgressively` with `runBatch` calling `generatePackedBatch(client, { model: settings.value.model, specs: batch, level, maxRetries: 1 })`, `onResults` pushing to `deck`, chime on first card, `generationDone` in `.finally`.
- Shortfall alert when `generationDone && deck.length < expected` (German copy: `Nur {deck.length} von {expected} Karten konnten generiert werden — der Pool gab nicht mehr her.`).
- Phases per card: `'input' | 'checking' | 'graded'`; streaming panel (`.sn-stream`, `Karte wird geschrieben` / `Nächste Karte wird geschrieben`) when `awaitingNext` or before the first card.
- `submit()`:
  - EN→DE: `try { grade = await gradePackedAnswer(...); items = grade.items; tip = grade.tip; offline = false } catch { items = localCheckPackedCard(userInput, card); tip = undefined; offline = true; toast.info('Offline bewertet', { description: 'KI-Bewertung nicht erreichbar — lokale Prüfung per Wortabgleich, ohne Coaching-Tipp.' }) }`; `verdict = verdictOf(items)`.
  - DE→EN: `try { const g = await gradePackedMeaning(...); verdict = g.correct ? 'ok' : 'no'; tip = g.tip; items = null } catch { verdict = checkSentence(userInput, card.english) ? 'ok' : 'no'; items = null; offline = true }` — note: DE→EN reference for the local check is `card.english`.
  - Push a `CardOutcome` into `outcomes` map keyed by deck position.
- Graded view = the design's compact reveal: `.sna-sticky` block (verdict line `SN_VERDICT`-style labels `Richtig / Teils richtig / Daneben` with `· {ok} / {n} Items` when items exist, offline badge `.sn-off` `offline bewertet`, TTS button EN→DE only), three `QUELLE / DU / REFERENZ` rows, tip `.sna-tip`, DE→EN note, `.sna-list` of `.sna-row.compact` item rows (✓/✗, category dot, italic EN, German solution `it.verb?.german / '{article} {german}' / '{prep.german} + {caseWord}' / daCompoundFor(...) / conn.display + ' — ' + behavior label`, right meta: `rektShort` badge `.sn-rekt` for verbs (`{german} + {short}`), `.sn-tag` chips on failed items).
- Item solution display strings — build a helper `itemSolution(it: PackedItemSpec): string` in the component: verb → `it.verb.german`; noun → `${it.noun.article} ${it.noun.german}`; prep → `${it.prep.german} + ${rektCase}` where rektCase maps PrepCase to `Akk/Dat/Gen/Wechsel`; dac → `daCompoundFor(it.colloc.preposition)`; conn → single: `${part.text} — ${CONN_BEHAVIOR_LABEL[part.behavior]}`, pair: `${conn.display}`.
- Hint spans: render `buildPackedSegments(card.english, card)` when `wordHints`; span classes `sn-i` + `data-cat`; hover sets `lit` key so all spans of that key light (pair linking — bind `:class="{ lit: lit === seg.item.key, 'has-pop': !!seg.item.reveal, revealed: revealedKeys.has(seg.item.key) }"` and `@mouseenter="lit = seg.item.key"` with container `@mouseleave="lit = null"`; tap toggles `revealedKeys` ONLY when `seg.item.reveal` exists); popover `<span v-if="seg.item.reveal" class="sn-pop">{{ seg.item.reveal }}</span>`. Pair superscript `¹` via `.sn-pairmark` on conn spans whose connector `isPair`.
- Manifest strip (EN→DE, phase !== 'graded'): `Gesucht` + parts derived from the card's item counts (`2 Verben · 1 Präposition · 1 Konnektor` — connector NOT named), plus `Kurztext · {sents} Sätze` right note when `sents >= 3`. Source size class `s1/s2/s4` per design.
- Answer composer: auto-growing `textarea.sn-ta` (rows = 2 or `card.sents`), footer `.sn-foot` with kbd note `Enter = neue Zeile · Strg+Enter reicht ein` and accent `Einreichen →`; `@keydown` Ctrl/Cmd+Enter submits. Spoken composer: `.sn-rec` circular button + Space handling copied from VerbSentenceRunner's `onKey`/`toggleMic`/`endAndSubmit` (including the `ending` guard and denied-mic watch that flips to typed with the toast). After grading, Space = TTS reference, Enter = next (same onKey ordering as VerbSentenceRunner).
- Advancing: `tryAdvance()` like VerbSentenceRunner (awaitingNext when generation lags).
- Finish: when the last graded card advances — record ONCE (`historySaved` guard):
  ```ts
  const cards = deck.value
  const resultsByIndex = new Map(cards.map((c, i) => [c.index, outcomes[i].items ?? []]))
  const metaItems = direction === 'en-de' ? buildPackedMetaItems(cards, resultsByIndex) : { verbSentenceItems: [], sentenceItems: [], dacSentenceItems: [], packedConnItems: [] }
  const agg = aggregateOutcomes(outcomeList)
  saveQuizRun({ type: 'sentence-packed', …, count: cards.length, correct: outcomeList.filter(o => o.verdict === 'ok').length,
    meta: { packedCounts: metaInfo.counts, packedDirection: direction, packedModality: spoken ? 'spoken' : 'typed', packedHints: wordHints,
      packedItemsOk: <sum agg.cat[*].ok>, packedItemsTotal: <sum agg.cat[*].n>, ...metaItems } })
  ```
  Then, if any `verdict !== 'ok'` and not in practice mode → show the retry modal (`.sn-modal-back` markup from `sn-shared.jsx` with the exact German copy); `Fehler üben` starts a practice round: `deck = wrong cards (shuffled)`, `practice = true`, outcomes reset, **history is NOT saved again** (the `historySaved` guard stays true for the whole component life; a practice completion goes straight to the result view showing the ORIGINAL outcomes). `Zur Auswertung` → result view.
- Result view: `<SentenceResult :history="recordedOutcomes" :direction="direction" @restart="router.push({ name: 'sentence' })" @practice="startPractice" />` — `recordedOutcomes` is the frozen main-round list; practice rounds never overwrite it.
- Counter shows `Karte {i+1} · von {total}` + ` — Übungsrunde, wird nicht gewertet` in practice mode; `Runde beenden` quiet button → back to setup (main round) / result (practice).
- Progress pips: `.quiz-progress-bar.sn-pips` with `pip done/part/wrong/current` classes derived from outcomes (`part` = ochre per CSS).

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run tests/modules/sentence/SentenceRunner.test.ts && npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/sentence/SentenceRunner.vue tests/modules/sentence/SentenceRunner.test.ts
git commit -m "feat(sentence): runner — streaming packed cards, per-item grading reveal, practice rounds"
```

---

### Task 11: Register the module — router, nav, Home

**Files:**
- Modify: `src/router.ts` (after the prepositions block, ~line 43)
- Modify: `src/components/NavShell.vue:19-31`
- Modify: `src/modules/home/Home.vue` (modules array + Frontispiece counter at line ~120)

- [ ] **Step 1: Router**

```ts
{ path: '/sentence', name: 'sentence', component: () => import('./modules/sentence/SentenceSetup.vue') },
{ path: '/sentence/run', name: 'sentence-run', component: () => import('./modules/sentence/SentenceRunner.vue') },
```

- [ ] **Step 2: Nav**

In `NavShell.vue` `items`, insert after the `declension` entry:
```ts
{ route: 'sentence', label: 'Sentence', de: 'Sätze' },
```

- [ ] **Step 3: Home card**

Append after the Settings card (numerals are load-bearing in module breadcrumbs — do NOT renumber existing cards):
```ts
{
  numeral: 'XII',
  route: 'sentence',
  de: 'Sätze',
  title: 'Sentence',
  desc: 'The packed card: verbs, nouns, prepositions, da-compounds and connectors in one AI-written sentence — you pick how many of each.',
  meta: 'AI-generated · budget of 8 items per card'
}
```
Update the header breadcrumb `Frontispiece · I/XI` → `Frontispiece · I/XII`.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm test`
Expected: PASS. Then `npm run dev -- --port 5199 --strictPort` and check `http://localhost:5199/sentence` renders the setup (use localhost, not 127.0.0.1).

- [ ] **Step 5: Commit**

```bash
git add src/router.ts src/components/NavShell.vue src/modules/home/Home.vue
git commit -m "feat(sentence): register module — routes, nav entry, Kapitel XII home card"
```

---

### Task 12: Connector weak-points chart on the History page

**Files:**
- Create: `src/components/charts/ConnectorWeakPoints.vue`
- Modify: `src/modules/history/HistoryPage.vue` (import + render beside `VerbWeakPoints` / `DacWeakPoints`)

- [ ] **Step 1: Build the chart** (mirrors `VerbWeakPoints.vue` exactly)

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { QuizHistoryEntry } from '../../composables/useQuizHistory'
import { computeConnectorWeakPoints } from '../../composables/useConnectorStats'

const props = defineProps<{ entries: QuizHistoryEntry[] }>()

const wp = computed(() => computeConnectorWeakPoints(props.entries))
const top = computed(() => wp.value.weakConnectors.filter(c => c.wrong > 0).slice(0, 8))
const hasData = computed(() => top.value.length > 0)
function pct(wrong: number, seen: number): number { return seen > 0 ? Math.round((wrong / seen) * 100) : 0 }
</script>

<template>
  <section v-if="hasData" class="card weak-card">
    <h3 class="weak-title">Connector weak points</h3>
    <p class="weak-sub">Highest miss-rate from your packed sentence runs.</p>
    <ul class="weak-list">
      <li v-for="c in top" :key="c.connId"><span class="weak-key">{{ c.word }}</span><span class="weak-rate">{{ pct(c.wrong, c.seen) }}% · {{ c.wrong }}/{{ c.seen }}</span></li>
    </ul>
  </section>
</template>

<style scoped>
.weak-card { padding: 20px; }
.weak-title { font-family: var(--font-display); margin: 0 0 4px; }
.weak-sub { font-size: 13px; color: var(--mute); margin: 0 0 16px; }
.weak-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.weak-list li { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
.weak-key { font-family: var(--font-body); color: var(--ink); }
.weak-rate { font-family: var(--font-mono); font-size: 12px; color: var(--danger); }
</style>
```

- [ ] **Step 2: Wire into HistoryPage**

In `HistoryPage.vue`: `import ConnectorWeakPoints from '../../components/charts/ConnectorWeakPoints.vue'` next to the `DacWeakPoints` import; in the template, find where `<VerbWeakPoints :entries="…" />` renders (grep `<VerbWeakPoints`) and add `<ConnectorWeakPoints :entries="…" />` as a sibling with the same binding.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/charts/ConnectorWeakPoints.vue src/modules/history/HistoryPage.vue
git commit -m "feat(sentence): connector weak-points chart on the history page"
```

---

### Task 13: Full verification + docs

**Files:**
- Modify: `docs/FUNCTIONALITY.md` (add a Sentence module section following the file's existing per-module format — read the file's structure first and match it)

- [ ] **Step 1: Full gates**

Run: `npm test && npm run typecheck && npm run build`
Expected: all PASS.

- [ ] **Step 2: Browser walkthrough (playwright MCP against the dev server)**

Start: `npm run dev -- --port 5199 --strictPort` (use `http://localhost:5199`, never 127.0.0.1). Verify:
1. Home shows the Kapitel XII card; nav shows `Sentence`; both navigate to `/sentence`.
2. Setup: five ledger blocks; default meter `7 / 8` in warn state; setting counts to total 8 disables further `+` options; zero total disables Start with the hint; DE→EN hides Modalität + Wort-Hinweise; connector `Detailliert` tier expands selected families into word chips (pairs shown as one chip with `…`).
3. Dark theme toggle: setup renders correctly in both themes.
4. If the local-claude dev bridge (or a Gemini key) is available: run a 3-card EN→DE round end-to-end — streaming panel, manifest strip, hint hover (verb/noun popover shows German; prep/connector spans only tint), submit, graded sticky block with per-item rows + Rektion badges, retry modal, practice round labeled `Übungsrunde, wird nicht gewertet`, result page bars, and a single `sentence-packed` entry in History (practice added none).

- [ ] **Step 3: Docs**

Add the Sentence module to `docs/FUNCTIONALITY.md` (packed card concept, budget 8, five categories, hybrid hints, all-or-nothing scoring, weak-point pooling, run type `sentence-packed`).

- [ ] **Step 4: Commit**

```bash
git add docs/FUNCTIONALITY.md
git commit -m "docs: functionality notes for the Sentence module"
```

---

## Self-Review (done at plan time)

- **Spec coverage:** ADR-0015 packed card ✓ (T3–T5), budget/warn ✓ (T3/T8), presets 3/5/8/custom ✓ (T8), AI-only grading + offline fallback ✓ (T5/T10), DE→EN thin meta ✓ (T10 skips item meta), weak-point pooling + connector tracker ✓ (T6/T12), two-part-aware dataset ✓ (T1), Direction Words excluded ✓ (no dw category anywhere), hybrid hint reveal ✓ (T4 segments + T7 CSS + T10 markup), all-or-nothing scoring ✓ (T10 `correct`), practice never recorded ✓ (T10), design Variant A fidelity ✓ (T7–T10 class names + German copy), Kapitel XII registration ✓ (T11).
- **Known intentional deviations from the design prototype:** real `VERB_TYPES`/`VERB_CASES` enums instead of the mock's invented Rektion list; V+N reveal popovers added (grill decision); `sentence-packed` run type (README's "Dexie" is wrong — history is localStorage).
- **Type consistency:** `CardOutcome`/`aggregateOutcomes` live in `usePackedSentenceQuiz.ts` (T9) and are consumed by T10; `buildPackedMetaItems` signature matches T5 definition; scorers' set names verified against the real files (`VERB_REMEDIAL_TYPES`, `REMEDIAL_TYPES`, `DAC_HISTORY_TYPES`).
- **Caveat for T6:** confirm `WeakPrep`/`WeakColloc` property names in the two scorers before writing the pooling assertions (noted inline).
