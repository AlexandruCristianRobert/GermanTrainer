# Verb Sentence Quiz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-generated EN→DE verb sentence-translation quiz (with verb+noun highlighting, progressive streaming generation, AI grading, weak-point tracking, and a weak-weighted remedial drill), plus persist each list page's chosen page size.

**Architecture:** Mirror the preposition sentence quiz, but (1) the AI returns the German dictionary form for *every* highlighted word so incidental nouns can be hinted (ADR-0003), and (2) sentences stream in progressively — the first sentence is a 1-item call, the rest generate in concurrent batches, and the runner opens on the first sentence (ADR-0004). The hard part — the progressive batch runner — is extracted as a shared, tested utility; the prep quiz is left untouched. Pure logic lives in composables (heavily unit-tested); Vue SFCs wire it together (type-check + dev verification).

**Tech Stack:** Vue 3 (`<script setup>`), TypeScript, Vue Router, Dexie (IndexedDB), Vitest + @vue/test-utils, `@google/genai`. Commands: `npm test` (all), `npx vitest run <file>` (one file), `npm run typecheck` (vue-tsc), `npm run dev` (manual).

---

## Background the implementer must read first

- **Model to copy:** `src/composables/useSentenceQuiz.ts` (prep generation/grading/hints) and `src/modules/prepositions/SentenceQuizSetup.vue` + `SentenceQuizRunner.vue` (UI). The verb quiz is the verb-targeted twin, with the two differences above.
- **Reused as-is (import, don't duplicate):** from `src/composables/useSentenceQuiz.ts` — `buildHintSegments`, `HintInput`, `HintSegment`, `NounRef`, `nounToRef`, `normalizeGerman`, `checkSentence`. One small additive change to that file is required (Task 9): widen `HintKind`.
- **Weak-point pattern:** `src/composables/usePrepRemedial.ts::computeWeakPoints` + `weightedScore`. Verb version is a slimmer copy.
- **Decisions:** `docs/adr/0003-verb-sentence-hints-german-from-ai.md`, `docs/adr/0004-progressive-streaming-sentence-generation.md`. Glossary terms in `CONTEXT.md` (Verb sentence quiz, Drilled verb, Verb error tag, Verb remedial drill).
- **Quiz is EN→DE + AI-grading only.** No direction toggle, no exact-match toggle (the verb error tags require AI grading).

## File Structure

**New files**
- `src/composables/useProgressiveGenerator.ts` — generic, framework-free progressive batch runner (`planBatches`, `generateProgressively`). Shared core (ADR-0004).
- `src/composables/useVerbSentenceQuiz.ts` — verb-specific domain: types, spec sampling, prompt/schema, validation, batch generation, AI grading, hint-input + drill-item builders.
- `src/composables/useVerbSentenceStats.ts` — pure weak-point scoring (`computeVerbWeakPoints`) + remedial key selection (`weakKeysForRemedial`).
- `src/modules/verbs/VerbSentenceSetup.vue` — setup (verb filters + noun theme + per-sentence dials + hints toggle + count). Samples specs, stashes, routes.
- `src/modules/verbs/VerbSentenceRunner.vue` — progressive runner + result page (one SFC, like `SentenceQuizRunner.vue`).
- `src/modules/verbs/VerbRemedialSetup.vue` — weak-weighted remedial setup; reuses the runner.
- `src/components/charts/VerbWeakPoints.vue` — weak-verb / weak-noun chart for the history page.
- Test files mirroring each composable under `tests/composables/`.

**Modified files**
- `src/composables/usePagination.ts` — optional per-page persist key.
- `src/components/Pagination.vue` — no logic change; persistence is in the composable. (Left as-is unless type errors.)
- 9 SFCs that call `usePagination(...)` — add a stable persist key (Task 2).
- `src/composables/useQuizHistory.ts` — `VerbErrorTag`, `VerbDrillItem`, meta fields, two new `QuizHistoryType`s.
- `src/components/charts/quiz-type-labels.ts` — labels/order for the two new types.
- `src/router.ts` — three routes.
- `src/modules/verbs/VerbsHome.vue` — a card for the new quiz + a "practise weak verbs" entry.
- `src/modules/history/HistoryPage.vue` — mount `VerbWeakPoints` (Task 18).
- `CONTEXT.md` — already updated during design; no change needed.

---

# PART 1 — Pagination persistence (independent; ship first)

### Task 1: Per-page persisted page size in `usePagination`

**Files:**
- Modify: `src/composables/usePagination.ts`
- Test: `tests/composables/usePagination.test.ts`

- [ ] **Step 1: Write the failing tests** — append to `tests/composables/usePagination.test.ts`:

```ts
import { beforeEach } from 'vitest'

describe('usePagination — persisted page size', () => {
  beforeEach(() => localStorage.clear())

  test('with no stored value, uses the default', () => {
    const p = usePagination(() => Array.from({ length: 50 }, (_, i) => i), 10, 'unit-test-a')
    expect(p.pageSize.value).toBe(10)
  })

  test('setPageSize persists under the namespaced key', () => {
    const p = usePagination(() => Array.from({ length: 50 }, (_, i) => i), 10, 'unit-test-b')
    p.setPageSize(50)
    expect(localStorage.getItem('gt:pageSize:unit-test-b')).toBe('50')
  })

  test('a fresh instance with the same key restores the stored size', () => {
    usePagination(() => [], 10, 'unit-test-c').setPageSize(100)
    const p2 = usePagination(() => Array.from({ length: 200 }, (_, i) => i), 10, 'unit-test-c')
    expect(p2.pageSize.value).toBe(100)
    expect(p2.slice.value.length).toBe(100)
  })

  test('a corrupt or non-positive stored value falls back to the default', () => {
    localStorage.setItem('gt:pageSize:unit-test-d', 'NaN')
    expect(usePagination(() => [], 10, 'unit-test-d').pageSize.value).toBe(10)
    localStorage.setItem('gt:pageSize:unit-test-d', '0')
    expect(usePagination(() => [], 10, 'unit-test-d').pageSize.value).toBe(10)
  })

  test('without a key, nothing is persisted', () => {
    const p = usePagination(() => [], 10)
    p.setPageSize(25)
    expect(localStorage.getItem('gt:pageSize:undefined')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/composables/usePagination.test.ts`
Expected: FAIL — `usePagination` ignores the third argument (the persisted-size tests fail).

- [ ] **Step 3: Implement persistence** — edit `src/composables/usePagination.ts`. Change the signature and seed/persist the size:

```ts
const PAGE_SIZE_PREFIX = 'gt:pageSize:'

function readStoredSize(key: string | undefined, fallback: number): number {
  if (!key || typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(PAGE_SIZE_PREFIX + key)
    const n = raw == null ? NaN : parseInt(raw, 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
  } catch {
    return fallback
  }
}

function writeStoredSize(key: string | undefined, n: number): void {
  if (!key || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(PAGE_SIZE_PREFIX + key, String(n))
  } catch {
    /* ignore quota / disabled */
  }
}

export function usePagination<T>(
  source: () => readonly T[] | T[],
  defaultPageSize = 10,
  persistKey?: string
): PaginationApi<T> {
  const page = ref(1)
  const pageSize = ref(readStoredSize(persistKey, defaultPageSize))
  // ...everything else unchanged...
```

Then update `setPageSize` to persist:

```ts
  function setPageSize(n: number) {
    pageSize.value = Math.max(1, n)
    page.value = 1
    writeStoredSize(persistKey, pageSize.value)
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/composables/usePagination.test.ts`
Expected: PASS (all, including the originals).

- [ ] **Step 5: Commit**

```bash
git add src/composables/usePagination.ts tests/composables/usePagination.test.ts
git commit -m "feat(pagination): optional per-page persisted page size"
```

### Task 2: Wire a persist key into every paginated page

**Files (modify one line each):**
- `src/modules/history/HistoryPage.vue:83`
- `src/modules/nouns/ManageNouns.vue:35`
- `src/modules/nouns/QuizResult.vue:15`
- `src/modules/verbs/TranslationQuizResult.vue:45`
- `src/modules/version/VersionPage.vue:10`
- `src/modules/declension/TableQuizResult.vue:45`
- `src/modules/declension/PronounQuizResult.vue:45`
- `src/modules/declension/ArticleAIQuizRunner.vue:137`
- `src/modules/declension/CaseRecognitionRunner.vue:157`

- [ ] **Step 1: Add a third argument (a stable, unique key) to each `usePagination(...)` call.** Exact edits:

```ts
// HistoryPage.vue
const pagination = usePagination(() => filtered.value, 25, 'history')
// ManageNouns.vue
const pagination = usePagination(() => filtered.value, 25, 'nouns-manage')
// nouns/QuizResult.vue
const pagination = usePagination(() => props.questions, 25, 'noun-quiz-result')
// verbs/TranslationQuizResult.vue
const pagination = usePagination(() => data.value?.graded ?? [], 25, 'verb-translation-result')
// version/VersionPage.vue
const pagination = usePagination(() => CHANGELOG, 10, 'version')
// declension/TableQuizResult.vue
const pagination = usePagination(() => data.value?.questions ?? [], 25, 'decl-table-result')
// declension/PronounQuizResult.vue
const pagination = usePagination(() => data.value?.questions ?? [], 25, 'decl-pronoun-result')
// declension/ArticleAIQuizRunner.vue
const resultPagination = usePagination(() => questions.value, 25, 'decl-article-ai-result')
// declension/CaseRecognitionRunner.vue
const pagination = usePagination(() => questions.value, 10, 'decl-cr-result')
```

- [ ] **Step 2: Type-check**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. Open History, change "Per page" to 100, navigate away and back → it stays 100. Confirm a second list page (e.g. Browse verbs is not paginated; use Manage nouns) keeps its own size independently.

- [ ] **Step 4: Commit**

```bash
git add src/modules
git commit -m "feat(pagination): persist page size on all list pages"
```

---

# PART 2 — Shared progressive generator core (ADR-0004)

### Task 3: `planBatches` — split specs into first-of-1 + chunks

**Files:**
- Create: `src/composables/useProgressiveGenerator.ts`
- Test: `tests/composables/useProgressiveGenerator.test.ts`

- [ ] **Step 1: Write the failing test** — `tests/composables/useProgressiveGenerator.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { planBatches } from '../../src/composables/useProgressiveGenerator'

describe('planBatches', () => {
  test('empty input → no batches', () => {
    expect(planBatches([], 1, 5)).toEqual([])
  })
  test('single item → one batch', () => {
    expect(planBatches([1], 1, 5)).toEqual([[1]])
  })
  test('first batch of 1, then chunks of 5', () => {
    expect(planBatches([1, 2, 3, 4, 5, 6, 7], 1, 5)).toEqual([[1], [2, 3, 4, 5, 6], [7]])
  })
  test('first batch of 1, remainder smaller than chunk', () => {
    expect(planBatches([1, 2, 3], 1, 5)).toEqual([[1], [2, 3]])
  })
  test('firstBatchSize larger than input → single batch', () => {
    expect(planBatches([1, 2], 5, 5)).toEqual([[1, 2]])
  })
  test('exact chunk multiples after the first', () => {
    expect(planBatches([0, 1, 2, 3, 4, 5], 1, 5)).toEqual([[0], [1, 2, 3, 4, 5]])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/composables/useProgressiveGenerator.test.ts`
Expected: FAIL — module/function not found.

- [ ] **Step 3: Implement `planBatches`** in `src/composables/useProgressiveGenerator.ts`:

```ts
// Generic, framework-free progressive batch generation (ADR-0004).
// `planBatches` slices a work-list so the first batch is tiny (fastest first
// paint) and the rest are even chunks. `generateProgressively` runs the first
// batch alone, surfaces it, then runs the remaining batches concurrently,
// delivering each batch's results via a callback as they resolve.

/** First chunk of `firstBatchSize`, then chunks of `batchSize`. */
export function planBatches<T>(items: readonly T[], firstBatchSize: number, batchSize: number): T[][] {
  const out: T[][] = []
  const first = Math.max(1, firstBatchSize)
  const rest = Math.max(1, batchSize)
  if (items.length === 0) return out
  out.push(items.slice(0, first))
  for (let i = first; i < items.length; i += rest) {
    out.push(items.slice(i, i + rest))
  }
  return out
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/composables/useProgressiveGenerator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useProgressiveGenerator.ts tests/composables/useProgressiveGenerator.test.ts
git commit -m "feat(gen): planBatches helper for progressive generation"
```

### Task 4: `generateProgressively` — first batch alone, rest concurrent

**Files:**
- Modify: `src/composables/useProgressiveGenerator.ts`
- Test: `tests/composables/useProgressiveGenerator.test.ts`

- [ ] **Step 1: Write the failing tests** — append:

```ts
import { generateProgressively } from '../../src/composables/useProgressiveGenerator'

describe('generateProgressively', () => {
  test('delivers the first batch before any later batch, and all results', async () => {
    const batches = [[1], [2, 3], [4, 5]]
    const order: number[][] = []
    await generateProgressively<number, number>({
      batches,
      runBatch: async (b) => b.map(n => n * 10),
      onResults: (r) => { order.push(r) },
      concurrency: 2
    })
    expect(order[0]).toEqual([10]) // first batch surfaced first
    const all = order.flat().sort((a, b) => a - b)
    expect(all).toEqual([10, 20, 30, 40, 50])
  })

  test('a throwing batch routes to onBatchError and never rejects', async () => {
    const seen: number[] = []
    const errors: unknown[] = []
    await expect(generateProgressively<number, number>({
      batches: [[1], [2], [3]],
      runBatch: async (b) => { if (b[0] === 2) throw new Error('boom'); return b },
      onResults: (r) => seen.push(...r),
      onBatchError: (_b, e) => errors.push(e),
      concurrency: 2
    })).resolves.toBeUndefined()
    expect(seen.sort()).toEqual([1, 3])
    expect(errors).toHaveLength(1)
  })

  test('empty batches → resolves immediately, no callbacks', async () => {
    let called = false
    await generateProgressively<number, number>({
      batches: [], runBatch: async (b) => b, onResults: () => { called = true }
    })
    expect(called).toBe(false)
  })

  test('if the first batch throws, later batches still run', async () => {
    const seen: number[] = []
    await generateProgressively<number, number>({
      batches: [[1], [2], [3]],
      runBatch: async (b) => { if (b[0] === 1) throw new Error('first failed'); return b },
      onResults: (r) => seen.push(...r),
      onBatchError: () => {}
    })
    expect(seen.sort()).toEqual([2, 3])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/composables/useProgressiveGenerator.test.ts`
Expected: FAIL — `generateProgressively` not exported.

- [ ] **Step 3: Implement** — append to `src/composables/useProgressiveGenerator.ts`:

```ts
export interface ProgressiveOptions<S, R> {
  /** Pre-planned batches (see planBatches). batches[0] runs alone, first. */
  batches: S[][]
  /** Generate one batch's results. May reject; rejection routes to onBatchError. */
  runBatch: (batch: S[]) => Promise<R[]>
  /** Called with each batch's results as it resolves (arrival order). */
  onResults: (results: R[]) => void
  /** Called when a batch rejects after runBatch's own retries. */
  onBatchError?: (batch: S[], err: unknown) => void
  /** Max concurrent batches for the remainder (after the first). Default 4. */
  concurrency?: number
}

/**
 * Run the first batch alone (so the caller can open the UI the moment it
 * resolves via onResults), then run the remaining batches with bounded
 * concurrency. Resolves when every batch has settled. Never rejects — batch
 * failures go to onBatchError.
 */
export async function generateProgressively<S, R>(opts: ProgressiveOptions<S, R>): Promise<void> {
  const { batches, runBatch, onResults, onBatchError } = opts
  const concurrency = Math.max(1, opts.concurrency ?? 4)
  if (batches.length === 0) return

  async function runOne(batch: S[]): Promise<void> {
    try {
      const results = await runBatch(batch)
      onResults(results)
    } catch (err) {
      onBatchError?.(batch, err)
    }
  }

  await runOne(batches[0])

  const rest = batches.slice(1)
  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < rest.length) {
      const batch = rest[cursor++]
      await runOne(batch)
    }
  }
  const workerCount = Math.min(concurrency, rest.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/composables/useProgressiveGenerator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useProgressiveGenerator.ts tests/composables/useProgressiveGenerator.test.ts
git commit -m "feat(gen): generateProgressively concurrent batch runner"
```

---

# PART 3 — Verb sentence domain (pure logic)

### Task 5: Types + spec sampling (`buildVerbSpecs`)

**Files:**
- Create: `src/composables/useVerbSentenceQuiz.ts`
- Test: `tests/composables/useVerbSentenceQuiz.test.ts`

- [ ] **Step 1: Write the failing test** — `tests/composables/useVerbSentenceQuiz.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  verbToRef, buildVerbSpecs, type VerbRef
} from '../../src/composables/useVerbSentenceQuiz'
import type { NounRef } from '../../src/composables/useSentenceQuiz'
import type { Verb } from '../../src/data/verbs'

const VERBS_FIX: VerbRef[] = [
  { german: 'gehen', english: 'go', level: 'A1' },
  { german: 'machen', english: 'make / do', level: 'A1' },
  { german: 'verstehen', english: 'understand', level: 'A2' }
]
const NOUNS_FIX: NounRef[] = [
  { german: 'Tisch', article: 'der', english: 'table' },
  { german: 'Katze', article: 'die', english: 'cat' }
]
// Deterministic RNG: cycles through the given values.
function seqRng(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

describe('verbToRef', () => {
  test('projects a Verb to the lean ref', () => {
    const v = { german: 'gehen', english: 'go', level: 'A1' } as Verb
    expect(verbToRef(v)).toEqual({ german: 'gehen', english: 'go', level: 'A1' })
  })
})

describe('buildVerbSpecs', () => {
  test('produces exactly `count` specs, indexed 0..count-1', () => {
    const specs = buildVerbSpecs(VERBS_FIX, NOUNS_FIX, 4, 1, 1, seqRng([0]))
    expect(specs).toHaveLength(4)
    expect(specs.map(s => s.index)).toEqual([0, 1, 2, 3])
  })
  test('fixed verbsPer / nounsPer honoured', () => {
    const specs = buildVerbSpecs(VERBS_FIX, NOUNS_FIX, 3, 2, 1, seqRng([0]))
    for (const s of specs) {
      expect(s.verbs.length).toBe(2)
      expect(s.nouns.length).toBe(1)
    }
  })
  test('verbs within a sentence are distinct', () => {
    const specs = buildVerbSpecs(VERBS_FIX, NOUNS_FIX, 5, 2, 2, seqRng([0, 0.5, 0.9, 0.1]))
    for (const s of specs) {
      const keys = s.verbs.map(v => v.german)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })
  test("'mix' yields 1 or 2 depending on rng", () => {
    const one = buildVerbSpecs(VERBS_FIX, NOUNS_FIX, 1, 'mix', 'mix', seqRng([0.2]))[0]
    expect(one.verbs.length).toBe(1)
    const two = buildVerbSpecs(VERBS_FIX, NOUNS_FIX, 1, 'mix', 'mix', seqRng([0.8]))[0]
    expect(two.verbs.length).toBe(2)
  })
  test('empty verb pool → specs with empty verb arrays (no crash)', () => {
    const specs = buildVerbSpecs([], NOUNS_FIX, 2, 1, 1, seqRng([0]))
    expect(specs).toHaveLength(2)
    expect(specs[0].verbs).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/composables/useVerbSentenceQuiz.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — create `src/composables/useVerbSentenceQuiz.ts` with the types + sampling. (Later tasks append to this file.)

```ts
// AI-generated verb sentence-translation quiz (EN→DE, AI-graded).
//
// The learner picks a verb pool (level/type/case) and a noun theme. We sample
// per-sentence "specs" (1–2 drilled verbs + 1–2 theme nouns) up front — so all
// randomization is decided before any AI call (ADR-0004) — then generate the
// English+German sentence pairs progressively. The AI also returns the German
// dictionary form for every highlighted word so incidental nouns can be hinted
// (ADR-0003). The learner reads the English and types the German.

import { shuffle } from '../data/pool'
import type { Verb, VerbLevel } from '../data/verbs'
import type { NounRef } from './useSentenceQuiz'

// ─────────────────────────────── Types ────────────────────────────────

/** A drilled verb handed to the AI to build a sentence around. */
export interface VerbRef {
  german: string   // infinitive / dictionary form
  english: string  // gloss, e.g. "go" or "make / do"
  level: VerbLevel
}

export type WordsPer = 1 | 2 | 'mix'

/** A verb error category the AI grader may assign (re-exported from history). */
export type { VerbErrorTag } from './useQuizHistory'

/** Drilled verbs + theme nouns for one sentence, before the AI writes it. */
export interface VerbSentenceSpec {
  index: number
  verbs: VerbRef[]
  nouns: NounRef[]
}

/** A noun/verb the AI introduced for naturalness, with its German to reveal. */
export interface ExtraWord {
  en: string   // exact English surface in the sentence
  de: string   // German dictionary form (infinitive / article + noun)
  kind: 'verb' | 'noun'
}

/** A spec once the AI has produced the sentence pair + highlight surfaces. */
export interface GeneratedVerbSentence extends VerbSentenceSpec {
  english: string
  german: string
  /** Exact English surface for each drilled verb, in order. */
  verbSpansEn?: string[]
  /** Exact English surface for each theme noun, in order. */
  nounSpansEn?: string[]
  /** Other highlighted nouns/verbs with AI-supplied German. */
  extraWords?: ExtraWord[]
}

export interface VerbSentenceVerdict {
  index: number
  correct: boolean
  correction: string   // the reference German, shown when wrong
  tip?: string
  tags?: import('./useQuizHistory').VerbErrorTag[]
}

// ───────────────────────────── Pure helpers ───────────────────────────

/** Project a stored Verb to the lean ref the prompt needs. */
export function verbToRef(v: Verb): VerbRef {
  return { german: v.german, english: v.english, level: v.level }
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
 * Build `count` specs, each with `verbsPer` distinct drilled verbs and
 * `nounsPer` distinct theme nouns drawn from refilling bags (good spread).
 */
export function buildVerbSpecs(
  verbPool: readonly VerbRef[],
  nounPool: readonly NounRef[],
  count: number,
  verbsPer: WordsPer,
  nounsPer: WordsPer,
  rng: () => number = Math.random
): VerbSentenceSpec[] {
  const nextVerb = makeBag(verbPool, rng)
  const nextNoun = makeBag(nounPool, rng)
  const specs: VerbSentenceSpec[] = []
  for (let index = 0; index < count; index++) {
    const kv = verbsPer === 'mix' ? (rng() < 0.5 ? 1 : 2) : verbsPer
    const kn = nounsPer === 'mix' ? (rng() < 0.5 ? 1 : 2) : nounsPer
    specs.push({
      index,
      verbs: drawUnique(nextVerb, kv, v => v.german),
      nouns: drawUnique(nextNoun, kn, n => n.german)
    })
  }
  return specs
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/composables/useVerbSentenceQuiz.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useVerbSentenceQuiz.ts tests/composables/useVerbSentenceQuiz.test.ts
git commit -m "feat(verbs): verb sentence types + spec sampling"
```

### Task 6: Generation prompt + schema (with variety injection)

**Files:**
- Modify: `src/composables/useVerbSentenceQuiz.ts`
- Test: `tests/composables/useVerbSentenceQuiz.test.ts`

- [ ] **Step 1: Write the failing test** — append:

```ts
import {
  VERB_ANGLE_POOL, levelLabel, buildVerbGeneratePrompt
} from '../../src/composables/useVerbSentenceQuiz'

describe('levelLabel', () => {
  test('all four levels → A1–B2 range', () => {
    expect(levelLabel(['A1', 'A2', 'B1', 'B2'])).toBe('A1–B2')
  })
  test('subset → slash-joined', () => {
    expect(levelLabel(['A2', 'B1'])).toBe('A2/B1')
  })
  test('empty → a sane default', () => {
    expect(levelLabel([])).toBe('A2–B1')
  })
})

describe('buildVerbGeneratePrompt', () => {
  const specs = [
    { index: 0, verbs: [{ german: 'gehen', english: 'go', level: 'A1' as const }], nouns: [{ german: 'Schule', article: 'die' as const, english: 'school' }] },
    { index: 1, verbs: [{ german: 'kaufen', english: 'buy', level: 'A1' as const }, { german: 'wollen', english: 'want', level: 'A1' as const }], nouns: [] }
  ]
  const prompt = buildVerbGeneratePrompt(specs, 'A1–A2', { angles: ['set it at breakfast', 'use a question'], seed: 'abc123' })

  test('lists every spec index with its verbs and nouns', () => {
    expect(prompt).toContain('#0')
    expect(prompt).toContain('gehen')
    expect(prompt).toContain('die Schule (school)')
    expect(prompt).toContain('#1')
    expect(prompt).toContain('kaufen')
    expect(prompt).toContain('wollen')
  })
  test('injects the variety angles and seed', () => {
    expect(prompt).toContain('set it at breakfast')
    expect(prompt).toContain('abc123')
  })
  test('states the target level', () => {
    expect(prompt).toContain('A1–A2')
  })
  test('VERB_ANGLE_POOL has enough distinct angles to rotate', () => {
    expect(new Set(VERB_ANGLE_POOL).size).toBeGreaterThanOrEqual(12)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/composables/useVerbSentenceQuiz.test.ts`
Expected: FAIL — exports missing.

- [ ] **Step 3: Implement** — append to `src/composables/useVerbSentenceQuiz.ts`:

```ts
// ──────────────────────────── AI generation ───────────────────────────

/** Rotating one-line angles injected per batch so sentences don't converge. */
export const VERB_ANGLE_POOL = [
  'set the scene at breakfast',
  'place the action at the office',
  'use a first-person plural subject (wir)',
  'use a child as the subject',
  'set it on a weekend trip',
  'frame it as a question',
  'put it in the Perfekt (past)',
  'use a 2nd-person informal subject (du)',
  'set it in a kitchen',
  'use a future intention (morgen / nächste Woche)',
  'frame it as advice or a suggestion',
  'set it during bad weather',
  'use a polite request (Sie)',
  'open with an adverb of time',
  'set it at a train station',
  'frame it as something overheard'
] as const

/** Compact label for the chosen CEFR levels. */
export function levelLabel(levels: readonly VerbLevel[]): string {
  if (levels.length === 0) return 'A2–B1'
  const order: VerbLevel[] = ['A1', 'A2', 'B1', 'B2']
  const present = order.filter(l => levels.includes(l))
  if (present.length >= 4) return 'A1–B2'
  return present.join('/')
}

export const VERB_GEN_SYSTEM =
  'You are a German teacher writing translation exercises. For each item you are given ' +
  'one or two German verbs (dictionary form, with an English gloss) and zero or more nouns. ' +
  'Write ONE natural, everyday German sentence that uses the given verb(s) correctly ' +
  'conjugated and naturally incorporates the given noun(s), then give a faithful, natural ' +
  'English translation. Vary the tense naturally for the requested CEFR level (present-heavy ' +
  'for A1, mixing in Perfekt/Präteritum for A2+). Keep sentences concise (6–14 words). ' +
  'Return JSON {"items":[{"index":<number>,"english":"...","german":"...","verbSpansEn":[...],' +
  '"nounSpansEn":[...],"extraWords":[{"en":"...","de":"...","kind":"verb|noun"}]}]} with exactly ' +
  'one entry per requested index. ' +
  '"verbSpansEn" = the exact English word(s) expressing each given verb, in the SAME order, ' +
  'copied verbatim from YOUR English sentence (one entry per given verb). ' +
  '"nounSpansEn" = the exact English word(s) for each given noun, in the SAME order (the noun ' +
  'head, WITHOUT its article; one entry per given noun; use [] when none were given). ' +
  '"extraWords" = EVERY OTHER noun and finite verb in your English sentence that is NOT already ' +
  'listed above (subjects, objects, auxiliaries, modals, incidental nouns), each with "en" = its ' +
  'exact English surface, "de" = its German dictionary form (the infinitive for a verb; the ' +
  'article + nominative singular for a noun, e.g. "die Katze"), and "kind". ' +
  'All "en" surfaces MUST be exact substrings of your English sentence so they can be located.'

export const VERB_GEN_SCHEMA = {
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
          verbSpansEn: { type: 'array', items: { type: 'string' } },
          nounSpansEn: { type: 'array', items: { type: 'string' } },
          extraWords: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                en: { type: 'string' },
                de: { type: 'string' },
                kind: { type: 'string', enum: ['verb', 'noun'] }
              },
              required: ['en', 'de', 'kind']
            }
          }
        },
        required: ['index', 'english', 'german', 'verbSpansEn', 'nounSpansEn', 'extraWords']
      }
    }
  },
  required: ['items']
}

export interface PromptVariation { angles: string[]; seed: string }

export function buildVerbGeneratePrompt(
  specs: readonly VerbSentenceSpec[],
  level: string,
  variation: PromptVariation
): string {
  const lines = specs.map(s => {
    const verbs = s.verbs.length
      ? s.verbs.map(v => `"${v.german}" (${v.english}) [${v.level}]`).join(' + ')
      : '(any fitting verb)'
    const nouns = s.nouns.length
      ? s.nouns.map(n => `${n.article} ${n.german} (${n.english})`).join(' + ')
      : '(any fitting noun)'
    return `#${s.index} — verb(s): ${verbs}; build around noun(s): ${nouns}`
  })
  return (
    `Target CEFR level: ${level}.\n` +
    `Write one German sentence and its English translation for each of the following ${specs.length} item(s):\n` +
    lines.join('\n') +
    `\nVary the framing across the batch — draw inspiration from these angles (do not echo them as text): ${variation.angles.join(' · ')}.` +
    `\nBatch variation seed: ${variation.seed}.` +
    `\nAlso return verbSpansEn, nounSpansEn (one per listed noun, in order), and extraWords (every other noun/verb), each surface an exact substring of your English sentence.`
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/composables/useVerbSentenceQuiz.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useVerbSentenceQuiz.ts tests/composables/useVerbSentenceQuiz.test.ts
git commit -m "feat(verbs): verb generation prompt, schema, variety injection"
```

### Task 7: `validateVerbSentencePair`

**Files:**
- Modify: `src/composables/useVerbSentenceQuiz.ts`
- Test: `tests/composables/useVerbSentenceQuiz.test.ts`

- [ ] **Step 1: Write the failing test** — append:

```ts
import { validateVerbSentencePair } from '../../src/composables/useVerbSentenceQuiz'

describe('validateVerbSentencePair', () => {
  const spec = { index: 0, verbs: [{ german: 'gehen', english: 'go', level: 'A1' as const }], nouns: [{ german: 'Schule', article: 'die' as const, english: 'school' }] }

  test('accepts a well-formed pair and keeps spans + extras', () => {
    const out = validateVerbSentencePair({
      index: 0, english: 'The children go to school in the morning.', german: 'Die Kinder gehen morgens zur Schule.',
      verbSpansEn: ['go'], nounSpansEn: ['school'],
      extraWords: [{ en: 'children', de: 'das Kind', kind: 'noun' }, { en: 'morning', de: 'der Morgen', kind: 'noun' }]
    }, spec)
    expect(out).not.toBeNull()
    expect(out!.verbSpansEn).toEqual(['go'])
    expect(out!.nounSpansEn).toEqual(['school'])
    expect(out!.extraWords).toHaveLength(2)
    expect(out!.verbs).toEqual(spec.verbs) // spec carried through
  })
  test('rejects non-objects and too-short sentences', () => {
    expect(validateVerbSentencePair(null, spec)).toBeNull()
    expect(validateVerbSentencePair({ english: 'Hi', german: 'Ja' }, spec)).toBeNull()
  })
  test('tolerates missing/garbage span fields (best-effort, never rejects on them)', () => {
    const out = validateVerbSentencePair({ index: 0, english: 'We bought a cake.', german: 'Wir haben einen Kuchen gekauft.' }, spec)
    expect(out).not.toBeNull()
    expect(out!.verbSpansEn).toBeUndefined()
    expect(out!.extraWords).toBeUndefined()
  })
  test('drops malformed extraWords entries, keeps valid ones', () => {
    const out = validateVerbSentencePair({
      index: 0, english: 'The cat sleeps on the table.', german: 'Die Katze schläft auf dem Tisch.',
      extraWords: [{ en: 'cat', de: 'die Katze', kind: 'noun' }, { en: '', de: 'x', kind: 'noun' }, { en: 'sleeps', de: '', kind: 'verb' }, 'junk']
    }, spec)
    expect(out!.extraWords).toEqual([{ en: 'cat', de: 'die Katze', kind: 'noun' }])
  })
  test('coerces an unknown extraWords kind to "noun"', () => {
    const out = validateVerbSentencePair({
      index: 0, english: 'He runs fast.', german: 'Er läuft schnell.',
      extraWords: [{ en: 'runs', de: 'laufen', kind: 'banana' }]
    }, spec)
    expect(out!.extraWords).toEqual([{ en: 'runs', de: 'laufen', kind: 'noun' }])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/composables/useVerbSentenceQuiz.test.ts`
Expected: FAIL — `validateVerbSentencePair` not exported.

- [ ] **Step 3: Implement** — append to `src/composables/useVerbSentenceQuiz.ts`:

```ts
function trimStr(x: unknown): string {
  return typeof x === 'string' ? x.trim() : ''
}

/**
 * Validate one AI sentence pair against its spec. We do NOT require the verb
 * surface to appear (conjugated forms diverge from the infinitive — over-strict
 * checks force slow retries). Span/extra fields are best-effort: malformed or
 * missing values are dropped, never a reason to reject the pair.
 */
export function validateVerbSentencePair(
  raw: unknown,
  spec: VerbSentenceSpec
): GeneratedVerbSentence | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const english = trimStr(e.english)
  const german = trimStr(e.german)
  if (english.length < 3 || german.length < 3) return null

  const out: GeneratedVerbSentence = { ...spec, english, german }

  if (Array.isArray(e.verbSpansEn)) {
    out.verbSpansEn = e.verbSpansEn.filter((x): x is string => typeof x === 'string').map(s => s.trim())
  }
  if (Array.isArray(e.nounSpansEn)) {
    out.nounSpansEn = e.nounSpansEn.filter((x): x is string => typeof x === 'string').map(s => s.trim())
  }
  if (Array.isArray(e.extraWords)) {
    const extras = e.extraWords
      .filter((w): w is Record<string, unknown> => !!w && typeof w === 'object')
      .map(w => ({
        en: trimStr(w.en),
        de: trimStr(w.de),
        kind: w.kind === 'verb' ? ('verb' as const) : ('noun' as const)
      }))
      .filter(w => w.en.length > 0 && w.de.length > 0)
    if (extras.length > 0) out.extraWords = extras
  }
  return out
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/composables/useVerbSentenceQuiz.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useVerbSentenceQuiz.ts tests/composables/useVerbSentenceQuiz.test.ts
git commit -m "feat(verbs): validate verb sentence pairs (best-effort spans)"
```

### Task 8: `generateVerbSentenceBatch` (one call + retry)

**Files:**
- Modify: `src/composables/useVerbSentenceQuiz.ts`
- Test: `tests/composables/useVerbSentenceQuiz.test.ts`

- [ ] **Step 1: Write the failing test** — append:

```ts
import { generateVerbSentenceBatch } from '../../src/composables/useVerbSentenceQuiz'
import type { AiClient } from '../../src/composables/useClaude'

function fakeClient(responder: (prompt: string) => string): AiClient {
  return { models: { generateContent: async (p) => ({ text: responder(String(p.contents ?? '')) }) } }
}
const SPECS = [
  { index: 0, verbs: [{ german: 'gehen', english: 'go', level: 'A1' as const }], nouns: [] },
  { index: 1, verbs: [{ german: 'sehen', english: 'see', level: 'A1' as const }], nouns: [] }
]

describe('generateVerbSentenceBatch', () => {
  test('returns one validated sentence per spec', async () => {
    const client = fakeClient(() => JSON.stringify({ items: [
      { index: 0, english: 'I go home.', german: 'Ich gehe nach Hause.', verbSpansEn: ['go'], nounSpansEn: [], extraWords: [] },
      { index: 1, english: 'I see the dog.', german: 'Ich sehe den Hund.', verbSpansEn: ['see'], nounSpansEn: [], extraWords: [{ en: 'dog', de: 'der Hund', kind: 'noun' }] }
    ] }))
    const res = await generateVerbSentenceBatch(client, { model: 'm', specs: SPECS, maxRetries: 0 })
    expect(res.sentences).toHaveLength(2)
    expect(res.sentences.map(s => s.index).sort()).toEqual([0, 1])
  })
  test('retries only the missing specs', async () => {
    let call = 0
    const client = fakeClient(() => {
      call++
      return call === 1
        ? JSON.stringify({ items: [{ index: 0, english: 'I go home.', german: 'Ich gehe heim.', verbSpansEn: ['go'], nounSpansEn: [], extraWords: [] }] })
        : JSON.stringify({ items: [{ index: 1, english: 'I see it.', german: 'Ich sehe es.', verbSpansEn: ['see'], nounSpansEn: [], extraWords: [] }] })
    })
    const res = await generateVerbSentenceBatch(client, { model: 'm', specs: SPECS, maxRetries: 2 })
    expect(res.sentences).toHaveLength(2)
    expect(res.attempts).toBe(2)
  })
  test('survives malformed JSON without throwing', async () => {
    const client = fakeClient(() => 'not json at all')
    const res = await generateVerbSentenceBatch(client, { model: 'm', specs: SPECS, maxRetries: 1 })
    expect(res.sentences).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/composables/useVerbSentenceQuiz.test.ts`
Expected: FAIL — `generateVerbSentenceBatch` not exported.

- [ ] **Step 3: Implement** — append to `src/composables/useVerbSentenceQuiz.ts` (add `import { shuffle }` already present; add the AiClient import at top of file):

At the top of the file, add to the imports:

```ts
import type { AiClient } from './useClaude'
```

Then append:

```ts
export interface GenerateVerbBatchOptions {
  model: string
  specs: VerbSentenceSpec[]
  level?: string
  maxRetries?: number
  rng?: () => number
}

export interface GenerateVerbBatchResult {
  sentences: GeneratedVerbSentence[]
  rejected: number
  attempts: number
}

/** A short random-ish token for the batch seed (no Date/crypto dependency). */
function makeSeed(rng: () => number): string {
  return Math.floor(rng() * 1_000_000_000).toString(36)
}

/**
 * Ask the AI for a sentence pair per spec in this batch, validating each and
 * retrying only the missing/failed specs up to `maxRetries` extra rounds. Fresh
 * variety angles + seed each attempt so retries don't reproduce failures.
 */
export async function generateVerbSentenceBatch(
  client: AiClient,
  opts: GenerateVerbBatchOptions
): Promise<GenerateVerbBatchResult> {
  const rng = opts.rng ?? Math.random
  const level = opts.level ?? 'A2–B1'
  const maxRetries = opts.maxRetries ?? 2
  const bySpec = new Map(opts.specs.map(s => [s.index, s]))
  const accepted = new Map<number, GeneratedVerbSentence>()
  let rejected = 0
  let attempts = 0

  while (accepted.size < opts.specs.length && attempts <= maxRetries) {
    attempts++
    const remaining = opts.specs.filter(s => !accepted.has(s.index))
    const angles = shuffle([...VERB_ANGLE_POOL], Math.max(3, Math.min(6, remaining.length)), rng)
    const prompt = buildVerbGeneratePrompt(remaining, level, { angles, seed: makeSeed(rng) })

    let text = ''
    try {
      const res = await client.models.generateContent({
        model: opts.model,
        contents: prompt,
        config: {
          systemInstruction: VERB_GEN_SYSTEM,
          responseMimeType: 'application/json',
          responseSchema: VERB_GEN_SCHEMA,
          temperature: 0.95,
          topP: 0.95
        }
      })
      text = res.text ?? ''
    } catch {
      continue
    }

    let parsed: unknown
    try { parsed = JSON.parse(text) } catch { continue }
    const items = (parsed as { items?: unknown }).items
    if (!Array.isArray(items)) continue

    for (const raw of items) {
      const idx = typeof (raw as { index?: unknown }).index === 'number'
        ? (raw as { index: number }).index : NaN
      const spec = bySpec.get(idx)
      if (!spec || accepted.has(idx)) continue
      const v = validateVerbSentencePair(raw, spec)
      if (v) accepted.set(idx, v); else rejected++
    }
  }

  const sentences = opts.specs.filter(s => accepted.has(s.index)).map(s => accepted.get(s.index)!)
  return { sentences, rejected, attempts }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/composables/useVerbSentenceQuiz.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useVerbSentenceQuiz.ts tests/composables/useVerbSentenceQuiz.test.ts
git commit -m "feat(verbs): generateVerbSentenceBatch with per-spec retry"
```

### Task 9: Hint inputs + widen `HintKind`

**Files:**
- Modify: `src/composables/useSentenceQuiz.ts` (one line — widen `HintKind`)
- Modify: `src/composables/useVerbSentenceQuiz.ts`
- Test: `tests/composables/useVerbSentenceQuiz.test.ts`

- [ ] **Step 1: Widen `HintKind`.** In `src/composables/useSentenceQuiz.ts` change:

```ts
export type HintKind = 'prep' | 'noun'
```
to
```ts
export type HintKind = 'prep' | 'noun' | 'verb'
```

(Additive — existing prep code only emits `'prep'`/`'noun'`.)

- [ ] **Step 2: Write the failing test** — append to `tests/composables/useVerbSentenceQuiz.test.ts`:

```ts
import { buildVerbHintInputs } from '../../src/composables/useVerbSentenceQuiz'
import { buildHintSegments } from '../../src/composables/useSentenceQuiz'

describe('buildVerbHintInputs', () => {
  const sentence = {
    index: 0,
    verbs: [{ german: 'gehen', english: 'go', level: 'A1' as const }],
    nouns: [{ german: 'Schule', article: 'die' as const, english: 'school' }],
    english: 'The children go to school in the morning.',
    german: 'Die Kinder gehen morgens zur Schule.',
    verbSpansEn: ['go'],
    nounSpansEn: ['school'],
    extraWords: [{ en: 'children', de: 'das Kind', kind: 'noun' as const }]
  }

  test('builds hints for drilled verb (our German), theme noun (our German), and extras (AI German)', () => {
    const hints = buildVerbHintInputs(sentence)
    expect(hints).toContainEqual({ surface: 'go', kind: 'verb', reveal: 'gehen' })
    expect(hints).toContainEqual({ surface: 'school', kind: 'noun', reveal: 'die Schule' })
    expect(hints).toContainEqual({ surface: 'children', kind: 'noun', reveal: 'das Kind' })
  })
  test('the hints anchor into the sentence via buildHintSegments', () => {
    const segs = buildHintSegments(sentence.english, buildVerbHintInputs(sentence))
    expect(segs.map(s => s.text).join('')).toBe(sentence.english) // lossless
    expect(segs.some(s => s.hint?.kind === 'verb' && s.hint.reveal === 'gehen')).toBe(true)
  })
  test('skips empty surfaces and missing arrays', () => {
    const hints = buildVerbHintInputs({ ...sentence, verbSpansEn: [''], nounSpansEn: undefined, extraWords: undefined })
    expect(hints.every(h => h.surface.length > 0)).toBe(true)
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run tests/composables/useVerbSentenceQuiz.test.ts`
Expected: FAIL — `buildVerbHintInputs` not exported.

- [ ] **Step 4: Implement** — append to `src/composables/useVerbSentenceQuiz.ts` (add `HintInput` to the existing `useSentenceQuiz` import at top):

Change the top import to:
```ts
import type { NounRef, HintInput } from './useSentenceQuiz'
```

Then append:

```ts
// ─────────────────────────── Hint inputs ──────────────────────────────
//
// Per ADR-0003: the German for drilled verbs and theme nouns comes from OUR
// stored data (the spec); only incidental/extra words use the AI's German.

/** Build the (surface, kind, reveal) inputs for buildHintSegments. */
export function buildVerbHintInputs(s: GeneratedVerbSentence): HintInput[] {
  const hints: HintInput[] = []
  ;(s.verbSpansEn ?? []).forEach((surf, i) => {
    const v = s.verbs[i]
    if (surf && v) hints.push({ surface: surf, kind: 'verb', reveal: v.german })
  })
  ;(s.nounSpansEn ?? []).forEach((surf, i) => {
    const n = s.nouns[i]
    if (surf && n) hints.push({ surface: surf, kind: 'noun', reveal: `${n.article} ${n.german}` })
  })
  ;(s.extraWords ?? []).forEach(w => {
    if (w.en && w.de) hints.push({ surface: w.en, kind: w.kind, reveal: w.de })
  })
  return hints
}
```

- [ ] **Step 5: Run to verify it passes (and the prep tests still pass)**

Run: `npx vitest run tests/composables/useVerbSentenceQuiz.test.ts tests/composables/useSentenceQuiz.test.ts`
Expected: PASS for both.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useSentenceQuiz.ts src/composables/useVerbSentenceQuiz.ts tests/composables/useVerbSentenceQuiz.test.ts
git commit -m "feat(verbs): hint inputs (our German for drilled words, AI for extras)"
```

### Task 10: AI grading + drill-item builder

**Files:**
- Modify: `src/composables/useVerbSentenceQuiz.ts`
- Test: `tests/composables/useVerbSentenceQuiz.test.ts`

- [ ] **Step 1: Write the failing test** — append:

```ts
import {
  buildVerbGradePrompt, parseVerbGrade, gradeVerbAnswer, buildVerbDrillItem
} from '../../src/composables/useVerbSentenceQuiz'

describe('buildVerbGradePrompt', () => {
  const p = buildVerbGradePrompt({
    model: 'm', english: 'I go to school.', german: 'Ich gehe zur Schule.',
    verbsGerman: ['gehen'], nounsGerman: ['Schule'], userAnswer: 'Ich gehe zur Schule.'
  })
  test('mentions the target verbs and the learner answer, and lists the 5 tags', () => {
    expect(p.system).toContain('conjugation')
    expect(p.system).toContain('word-order')
    expect(p.user).toContain('gehen')
    expect(p.user).toContain('Ich gehe zur Schule.')
  })
})

describe('parseVerbGrade', () => {
  test('valid correct grade', () => {
    expect(parseVerbGrade({ correct: true })).toEqual({ correct: true })
  })
  test('keeps tip + filters tags to the known set', () => {
    expect(parseVerbGrade({ correct: false, tip: 'Wrong tense.', errorTags: ['conjugation', 'banana', 'case'] }))
      .toEqual({ correct: false, tip: 'Wrong tense.', tags: ['conjugation', 'case'] })
  })
  test('rejects non-objects and missing boolean', () => {
    expect(parseVerbGrade(null)).toBeNull()
    expect(parseVerbGrade({ tip: 'x' })).toBeNull()
  })
})

describe('gradeVerbAnswer', () => {
  test('returns the parsed grade', async () => {
    const client: AiClient = { models: { generateContent: async () => ({ text: JSON.stringify({ correct: false, tip: 'Verb at the end.', errorTags: ['word-order'] }) }) } }
    const g = await gradeVerbAnswer(client, { model: 'm', english: 'x', german: 'y', verbsGerman: ['gehen'], nounsGerman: [], userAnswer: 'z' })
    expect(g.correct).toBe(false)
    expect(g.tags).toEqual(['word-order'])
  })
  test('throws after exhausting retries on bad JSON', async () => {
    const client: AiClient = { models: { generateContent: async () => ({ text: 'nope' }) } }
    await expect(gradeVerbAnswer(client, { model: 'm', english: 'x', german: 'y', verbsGerman: [], nounsGerman: [], userAnswer: 'z' })).rejects.toThrow()
  })
})

describe('buildVerbDrillItem', () => {
  const s = { index: 0, verbs: [{ german: 'gehen', english: 'go', level: 'A1' as const }, { german: 'sehen', english: 'see', level: 'A1' as const }], nouns: [{ german: 'Schule', article: 'die' as const, english: 'school' }], english: 'x', german: 'y' }
  test('records verb + noun keys and correctness', () => {
    expect(buildVerbDrillItem(s, true)).toEqual({ verbKeys: ['gehen', 'sehen'], nounKeys: ['Schule'], correct: true })
  })
  test('attaches tags when present', () => {
    expect(buildVerbDrillItem(s, false, ['conjugation']).tags).toEqual(['conjugation'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/composables/useVerbSentenceQuiz.test.ts`
Expected: FAIL — grading exports missing.

- [ ] **Step 3: Implement** — append to `src/composables/useVerbSentenceQuiz.ts` (add `VerbDrillItem` to the history import):

Add near the top imports:
```ts
import type { VerbErrorTag, VerbDrillItem } from './useQuizHistory'
```

Then append:

```ts
// ──────────────────────────── AI grading ──────────────────────────────
//
// EN→DE only. Mirrors useSentenceQuiz.gradeAnswer: temperature 0, JSON schema,
// one retry, THROWS if both attempts fail (caller falls back to exact check).

export interface GradeVerbOptions {
  model: string
  english: string        // reference English (shown to the learner)
  german: string         // reference German (generated up front)
  verbsGerman: string[]  // drilled verb infinitives
  nounsGerman: string[]  // theme noun heads
  userAnswer: string
}

export interface VerbAnswerGrade {
  correct: boolean
  tip?: string
  tags?: VerbErrorTag[]
}

const VERB_ERROR_TAGS: readonly VerbErrorTag[] = ['conjugation', 'case', 'word-order', 'noun', 'typo']

const VERB_GRADE_SCHEMA = {
  type: 'object',
  properties: {
    correct: { type: 'boolean' },
    tip: { type: 'string' },
    errorTags: { type: 'array', items: { type: 'string', enum: ['conjugation', 'case', 'word-order', 'noun', 'typo'] } }
  },
  required: ['correct']
}

export function buildVerbGradePrompt(opts: GradeVerbOptions): { system: string; user: string } {
  const system =
    'You are a German teacher grading one translation exercise. The learner was shown the ENGLISH ' +
    'sentence and typed a GERMAN translation. Respond ONLY as JSON {"correct": boolean, "tip": string, ' +
    '"errorTags": string[]} — no prose, no markdown fences. Set "correct" true when the German is a ' +
    'correct, grammatical translation that uses the target verb(s) appropriately; accept natural ' +
    'alternative phrasings, synonyms, and word order — do not require an exact match to the reference. ' +
    'When "correct" is false, set "tip" to ONE short English sentence pinpointing the mistake, and set ' +
    '"errorTags" to every applicable value from exactly: "conjugation" (right verb, wrong form — tense, ' +
    'person, auxiliary, or Partizip), "case" (wrong case for an object the verb governs), "word-order" ' +
    '(verb-second, verb-final, or split separable-prefix placement wrong), "noun" (a wrong theme noun — ' +
    'word, gender, or form), "typo" (a slip elsewhere). When "correct" is true, "tip" may be empty and ' +
    '"errorTags" omitted.'
  const verbs = opts.verbsGerman.length ? opts.verbsGerman.join(', ') : '(any fitting verb)'
  const nouns = opts.nounsGerman.length ? opts.nounsGerman.join(', ') : '(none)'
  const user =
    `ENGLISH (source shown to the learner): ${opts.english}\n` +
    `GERMAN (reference translation): ${opts.german}\n` +
    `TARGET VERB(S): ${verbs}\n` +
    `THEME NOUN(S): ${nouns}\n` +
    `LEARNER'S GERMAN ANSWER: ${opts.userAnswer}`
  return { system, user }
}

export function parseVerbGrade(raw: unknown): VerbAnswerGrade | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.correct !== 'boolean') return null
  const grade: VerbAnswerGrade = { correct: r.correct }
  if (typeof r.tip === 'string') {
    const tip = r.tip.trim()
    if (tip.length > 0) grade.tip = tip
  }
  if (Array.isArray(r.errorTags)) {
    const tags = r.errorTags.filter(
      (t): t is VerbErrorTag => typeof t === 'string' && (VERB_ERROR_TAGS as readonly string[]).includes(t)
    )
    if (tags.length > 0) grade.tags = tags
  }
  return grade
}

export async function gradeVerbAnswer(client: AiClient, opts: GradeVerbOptions): Promise<VerbAnswerGrade> {
  const { system, user } = buildVerbGradePrompt(opts)
  const maxRetries = 1
  let attempts = 0
  let lastError = 'no attempts'
  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model: opts.model,
        contents: user,
        config: { systemInstruction: system, responseMimeType: 'application/json', responseSchema: VERB_GRADE_SCHEMA, temperature: 0 }
      })
      let parsed: unknown
      try { parsed = JSON.parse(response.text ?? '') } catch { lastError = 'malformed JSON'; continue }
      const grade = parseVerbGrade(parsed)
      if (grade === null) { lastError = 'validation failed'; continue }
      return grade
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new Error(`gradeVerbAnswer exhausted ${attempts} attempts. Last error: ${lastError}`)
}

/** The per-item record stored in run meta for one graded verb sentence. */
export function buildVerbDrillItem(
  s: GeneratedVerbSentence,
  correct: boolean,
  tags?: VerbErrorTag[]
): VerbDrillItem {
  const item: VerbDrillItem = {
    verbKeys: s.verbs.map(v => v.german),
    nounKeys: s.nouns.map(n => n.german),
    correct
  }
  if (tags && tags.length > 0) item.tags = tags
  return item
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/composables/useVerbSentenceQuiz.test.ts`
Expected: PASS. (This depends on Task 13's history types — if `VerbErrorTag`/`VerbDrillItem` aren't there yet, do Task 13 first. **Reorder note:** implement Task 13 before Task 10's type-check if executing strictly in order; tests here import the types transitively.)

> **Dependency:** Tasks 5–10 reference `VerbErrorTag`/`VerbDrillItem` from `useQuizHistory`. Execute **Task 13 first** (it only adds types/strings and has no dependency on the composables), then Tasks 5–12. The ordering in this doc is by topic; the executor should do **13 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 14…**.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useVerbSentenceQuiz.ts tests/composables/useVerbSentenceQuiz.test.ts
git commit -m "feat(verbs): AI grading + drill-item builder for verb sentences"
```

---

# PART 4 — Weak points + remedial (pure)

### Task 11: `computeVerbWeakPoints`

**Files:**
- Create: `src/composables/useVerbSentenceStats.ts`
- Test: `tests/composables/useVerbSentenceStats.test.ts`

- [ ] **Step 1: Write the failing test** — `tests/composables/useVerbSentenceStats.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { computeVerbWeakPoints, weakKeysForRemedial } from '../../src/composables/useVerbSentenceStats'
import type { QuizHistoryEntry } from '../../src/composables/useQuizHistory'

function run(items: any[]): QuizHistoryEntry {
  return {
    id: 1, type: 'verb-sentence', startedAt: '', finishedAt: '', durationMs: 0,
    count: items.length, correct: items.filter(i => i.correct).length,
    meta: { verbSentenceItems: items }
  }
}

describe('computeVerbWeakPoints', () => {
  test('ranks verbs by error rate weighted by log(seen)', () => {
    const entries = [run([
      { verbKeys: ['gehen'], nounKeys: ['Schule'], correct: false, tags: ['conjugation'] },
      { verbKeys: ['gehen'], nounKeys: [], correct: false, tags: ['conjugation'] },
      { verbKeys: ['gehen'], nounKeys: [], correct: true },
      { verbKeys: ['sehen'], nounKeys: [], correct: true }
    ])]
    const wp = computeVerbWeakPoints(entries)
    expect(wp.weakVerbs[0].verbKey).toBe('gehen')
    expect(wp.weakVerbs[0].seen).toBe(3)
    expect(wp.weakVerbs[0].wrong).toBe(2)
    expect(wp.tagCounts.conjugation).toBe(2)
  })
  test('a noun-tagged miss counts against the noun, not the verb', () => {
    const wp = computeVerbWeakPoints([run([
      { verbKeys: ['machen'], nounKeys: ['Katze'], correct: false, tags: ['noun'] }
    ])])
    const verb = wp.weakVerbs.find(v => v.verbKey === 'machen')!
    const noun = wp.weakNouns.find(n => n.nounKey === 'Katze')!
    expect(verb.wrong).toBe(0)  // miss was the noun's fault
    expect(noun.wrong).toBe(1)
  })
  test('a tagless miss blames every item it touched', () => {
    const wp = computeVerbWeakPoints([run([
      { verbKeys: ['fahren'], nounKeys: ['Bus'], correct: false }
    ])])
    expect(wp.weakVerbs.find(v => v.verbKey === 'fahren')!.wrong).toBe(1)
    expect(wp.weakNouns.find(n => n.nounKey === 'Bus')!.wrong).toBe(1)
  })
  test('ignores non-verb-sentence run types', () => {
    const e = run([{ verbKeys: ['x'], correct: false }]); e.type = 'noun-gender'
    const wp = computeVerbWeakPoints([e])
    expect(wp.weakVerbs).toHaveLength(0)
  })
  test('also reads verb-remedial runs', () => {
    const e = run([{ verbKeys: ['lesen'], correct: false, tags: ['conjugation'] }]); e.type = 'verb-remedial'
    const wp = computeVerbWeakPoints([e])
    expect(wp.weakVerbs[0].verbKey).toBe('lesen')
  })
})

describe('weakKeysForRemedial', () => {
  test('returns weakest verb + noun keys, capped', () => {
    const wp = computeVerbWeakPoints([run([
      { verbKeys: ['a'], correct: false, tags: ['conjugation'] },
      { verbKeys: ['b'], correct: false, tags: ['conjugation'] },
      { verbKeys: ['c'], correct: true },
      { verbKeys: ['d'], nounKeys: ['N1'], correct: false, tags: ['noun'] }
    ])])
    const keys = weakKeysForRemedial(wp, 2)
    expect(keys.verbKeys.length).toBeLessThanOrEqual(2)
    expect(keys.verbKeys).toContain('a')
    expect(keys.nounKeys).toContain('N1')
  })
  test('excludes items that were never wrong', () => {
    const wp = computeVerbWeakPoints([run([{ verbKeys: ['perfect'], correct: true }])])
    expect(weakKeysForRemedial(wp, 10).verbKeys).not.toContain('perfect')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/composables/useVerbSentenceStats.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/composables/useVerbSentenceStats.ts`:

```ts
// Pure weak-point scoring for verb-sentence drills (no Vue/DOM/storage).
// Mirrors usePrepRemedial.computeWeakPoints, slimmed for verbs.

import type { VerbErrorTag, VerbDrillItem, QuizHistoryEntry } from './useQuizHistory'

export interface WeakVerb { verbKey: string; seen: number; wrong: number; score: number }
export interface WeakVerbNoun { nounKey: string; seen: number; wrong: number; score: number }
export interface VerbWeakPoints {
  weakVerbs: WeakVerb[]   // score desc
  weakNouns: WeakVerbNoun[] // score desc
  tagCounts: Record<VerbErrorTag, number>
}

const VERB_REMEDIAL_TYPES = new Set(['verb-sentence', 'verb-remedial'])
// A miss blames the verb unless it was purely a noun's fault.
const VERB_FAULT_TAGS: VerbErrorTag[] = ['conjugation', 'case', 'word-order', 'typo']

/** Error-rate weighted by log of attempts (1-of-1 wrong → 0). */
export function weightedScore(wrong: number, seen: number): number {
  return seen > 0 ? (wrong / seen) * Math.log(seen) : 0
}

function emptyTagCounts(): Record<VerbErrorTag, number> {
  return { conjugation: 0, case: 0, 'word-order': 0, noun: 0, typo: 0 }
}

function byScoreDesc(a: { score: number; wrong: number; seen: number }, b: { score: number; wrong: number; seen: number }): number {
  if (b.score !== a.score) return b.score - a.score
  if (b.wrong !== a.wrong) return b.wrong - a.wrong
  return b.seen - a.seen
}

export function computeVerbWeakPoints(entries: QuizHistoryEntry[]): VerbWeakPoints {
  const verbMap = new Map<string, WeakVerb>()
  const nounMap = new Map<string, WeakVerbNoun>()
  const tagCounts = emptyTagCounts()

  for (const entry of entries) {
    if (!VERB_REMEDIAL_TYPES.has(entry.type)) continue
    const items: VerbDrillItem[] = entry.meta.verbSentenceItems ?? []
    for (const item of items) {
      const tags = item.tags
      const hasTags = Array.isArray(tags) && tags.length > 0

      for (const key of item.verbKeys ?? []) {
        let v = verbMap.get(key)
        if (!v) { v = { verbKey: key, seen: 0, wrong: 0, score: 0 }; verbMap.set(key, v) }
        v.seen++
        if (!item.correct) {
          const verbWrong = hasTags ? tags!.some(t => VERB_FAULT_TAGS.includes(t)) : true
          if (verbWrong) v.wrong++
        }
      }
      for (const key of item.nounKeys ?? []) {
        let n = nounMap.get(key)
        if (!n) { n = { nounKey: key, seen: 0, wrong: 0, score: 0 }; nounMap.set(key, n) }
        n.seen++
        if (!item.correct) {
          const nounWrong = hasTags ? tags!.includes('noun') : true
          if (nounWrong) n.wrong++
        }
      }
      if (hasTags) for (const t of tags!) tagCounts[t]++
    }
  }

  const weakVerbs = [...verbMap.values()]
  for (const v of weakVerbs) v.score = weightedScore(v.wrong, v.seen)
  weakVerbs.sort(byScoreDesc)

  const weakNouns = [...nounMap.values()]
  for (const n of weakNouns) n.score = weightedScore(n.wrong, n.seen)
  weakNouns.sort(byScoreDesc)

  return { weakVerbs, weakNouns, tagCounts }
}

/** Weakest verb + noun keys (those actually missed), capped at `limit` each. */
export function weakKeysForRemedial(wp: VerbWeakPoints, limit: number): { verbKeys: string[]; nounKeys: string[] } {
  return {
    verbKeys: wp.weakVerbs.filter(v => v.wrong > 0).slice(0, limit).map(v => v.verbKey),
    nounKeys: wp.weakNouns.filter(n => n.wrong > 0).slice(0, limit).map(n => n.nounKey)
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/composables/useVerbSentenceStats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useVerbSentenceStats.ts tests/composables/useVerbSentenceStats.test.ts
git commit -m "feat(verbs): verb weak-point scoring + remedial key selection"
```

### Task 12: Remedial pool selection (`selectRemedialPool`)

**Files:**
- Modify: `src/composables/useVerbSentenceStats.ts`
- Test: `tests/composables/useVerbSentenceStats.test.ts`

- [ ] **Step 1: Write the failing test** — append:

```ts
import { selectRemedialPool } from '../../src/composables/useVerbSentenceStats'

describe('selectRemedialPool', () => {
  test('uses weak refs when present', () => {
    const weak = [{ german: 'a', english: 'a', level: 'A1' as const }]
    const fallback = [{ german: 'x', english: 'x', level: 'A1' as const }]
    expect(selectRemedialPool(weak, fallback)).toEqual(weak)
  })
  test('falls back to the full pool when there are no weak refs', () => {
    const fallback = [{ german: 'x', english: 'x', level: 'A1' as const }]
    expect(selectRemedialPool([], fallback)).toEqual(fallback)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/composables/useVerbSentenceStats.test.ts`
Expected: FAIL — `selectRemedialPool` not exported.

- [ ] **Step 3: Implement** — append to `src/composables/useVerbSentenceStats.ts`:

```ts
/** Prefer the weak items; if there are none, drill the whole pool. */
export function selectRemedialPool<T>(weak: readonly T[], fallback: readonly T[]): T[] {
  return weak.length > 0 ? [...weak] : [...fallback]
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/composables/useVerbSentenceStats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useVerbSentenceStats.ts tests/composables/useVerbSentenceStats.test.ts
git commit -m "feat(verbs): remedial pool selection helper"
```

---

# PART 5 — History types + labels

### Task 13: Extend history schema (do this FIRST — see dependency note)

**Files:**
- Modify: `src/composables/useQuizHistory.ts`
- Modify: `src/components/charts/quiz-type-labels.ts`
- Test: `tests/composables/useQuizHistory.test.ts`

- [ ] **Step 1: Write the failing test** — append a block to `tests/composables/useQuizHistory.test.ts`:

```ts
import { saveQuizRun, loadHistory, clearHistory } from '../../src/composables/useQuizHistory'
import type { VerbDrillItem } from '../../src/composables/useQuizHistory'

describe('verb-sentence history', () => {
  test('round-trips a verb-sentence run with per-item data', () => {
    clearHistory()
    const items: VerbDrillItem[] = [{ verbKeys: ['gehen'], nounKeys: ['Schule'], correct: false, tags: ['conjugation'] }]
    saveQuizRun({
      type: 'verb-sentence', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
      durationMs: 1000, count: 1, correct: 0,
      meta: { verbSentenceLevels: ['A1'], verbsPerSentence: 'mix', verbSentenceNounsPer: 1, verbSentenceHints: true, verbSentenceItems: items }
    })
    const all = loadHistory()
    expect(all[0].type).toBe('verb-sentence')
    expect(all[0].meta.verbSentenceItems?.[0].verbKeys).toEqual(['gehen'])
    clearHistory()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/composables/useQuizHistory.test.ts`
Expected: FAIL — type `verb-sentence` / meta fields not accepted by `vue-tsc`-checked test (and the field reads compile-error).

- [ ] **Step 3: Implement** — in `src/composables/useQuizHistory.ts`:

(a) Add to the `QuizHistoryType` union (after `'prep-remedial'`):
```ts
  | 'verb-sentence'
  | 'verb-remedial'
```

(b) Add the verb tag + drill item types (after the `PrepDrillItem` interface):
```ts
export type VerbErrorTag = 'conjugation' | 'case' | 'word-order' | 'noun' | 'typo'

/** One recorded answer in a verb-sentence or verb-remedial run. */
export interface VerbDrillItem {
  verbKeys?: string[]    // german infinitives of the drilled verbs
  nounKeys?: string[]    // german surfaces of the theme nouns
  correct: boolean
  tags?: VerbErrorTag[]  // why wrong; absent when correct
}
```

(c) Add to `QuizHistoryMeta` (after the prep sentence block):
```ts
  // Verb sentence-translation (AI) — EN→DE, AI-graded
  verbSentenceLevels?: string[]
  verbSentenceTypes?: string[]
  verbSentenceCases?: string[]
  verbSentenceGroups?: string[]
  verbsPerSentence?: 1 | 2 | 'mix'
  verbSentenceNounsPer?: 1 | 2 | 'mix'
  verbSentenceHints?: boolean
  verbSentenceItems?: VerbDrillItem[]
```

(d) In `src/components/charts/quiz-type-labels.ts`, add entries to **all three** maps. In `QUIZ_TYPE_LABEL` (after `'prep-remedial'`):
```ts
  'verb-sentence': 'Verb · sentence (AI)',
  'verb-remedial': 'Verb · remedial',
```
In `QUIZ_TYPE_DE`:
```ts
  'verb-sentence': 'Verb · Satz (KI)',
  'verb-remedial': 'Verb · Schwachstellen',
```
In `QUIZ_TYPES_ORDER`, insert after `'verb-conjugation'`:
```ts
  'verb-sentence',
  'verb-remedial',
```

- [ ] **Step 4: Run to verify it passes + type-check the labels map is exhaustive**

Run: `npx vitest run tests/composables/useQuizHistory.test.ts && npm run typecheck`
Expected: PASS, no type errors. (`QUIZ_TYPE_LABEL` is a `Record<QuizHistoryType, string>`, so a missing entry fails `vue-tsc` — confirms exhaustiveness.)

- [ ] **Step 5: Commit**

```bash
git add src/composables/useQuizHistory.ts src/components/charts/quiz-type-labels.ts tests/composables/useQuizHistory.test.ts
git commit -m "feat(history): verb-sentence + verb-remedial types and meta"
```

---

# PART 6 — UI

### Task 14: Routes + Verbs landing entries

**Files:**
- Modify: `src/router.ts`
- Modify: `src/modules/verbs/VerbsHome.vue`

- [ ] **Step 1: Add routes** — in `src/router.ts`, after the `verbs-cheatsheet` route (line 23):

```ts
  { path: '/verbs/sentence', name: 'verbs-sentence', component: () => import('./modules/verbs/VerbSentenceSetup.vue') },
  { path: '/verbs/sentence/run', name: 'verbs-sentence-run', component: () => import('./modules/verbs/VerbSentenceRunner.vue') },
  { path: '/verbs/remedial', name: 'verbs-remedial', component: () => import('./modules/verbs/VerbRemedialSetup.vue') },
```

- [ ] **Step 2: Add landing cards** — in `src/modules/verbs/VerbsHome.vue`, extend the `cards` array (renumber so Cheatsheet stays last):

```ts
const cards: ModuleCard[] = [
  { numeral: 'A', route: 'verbs-list',         title: 'Browse verbs',     de: 'Liste',       desc: 'Searchable list of all 378 A1/A2/B1/B2 verbs with type, case, and auxiliary.' },
  { numeral: 'B', route: 'verbs-translation',  title: 'Translation quiz', de: 'Übersetzen',  desc: 'Type the English meaning of a German verb. "to" is optional.' },
  { numeral: 'C', route: 'verbs-sentence',     title: 'Sentence quiz',    de: 'Satz (KI)',   desc: 'AI writes English sentences with your verbs + nouns; you translate to German and the AI grades you.' },
  { numeral: 'D', route: 'verbs-remedial',     title: 'Practise weak verbs', de: 'Schwachstellen', desc: 'A sentence drill focused on the verbs and nouns you get wrong most often.' },
  { numeral: 'E', route: 'verbs-conjugation',  title: 'Conjugation quiz', de: 'Konjugation', desc: 'Fill in all six forms across the tenses you pick — from Präsens to Passiv.' },
  { numeral: 'F', route: 'verbs-cheatsheet',   title: 'Cheatsheet',       de: 'Grammatik',   desc: 'Twelve chapters of conjugation rules, exceptions, and example sentences.' }
]
```

- [ ] **Step 3: Type-check**

Run: `npm run typecheck`
Expected: PASS (the two new SFCs don't exist yet → this will error on the dynamic imports only at build time, not typecheck; if `vue-tsc` complains about missing modules, proceed to Task 15/16 then re-run). To keep the tree compiling between tasks, create empty stub SFCs now:

```vue
<!-- src/modules/verbs/VerbSentenceSetup.vue, VerbSentenceRunner.vue, VerbRemedialSetup.vue -->
<script setup lang="ts"></script>
<template><div class="page">TODO</div></template>
```

- [ ] **Step 4: Commit**

```bash
git add src/router.ts src/modules/verbs/VerbsHome.vue src/modules/verbs/VerbSentenceSetup.vue src/modules/verbs/VerbSentenceRunner.vue src/modules/verbs/VerbRemedialSetup.vue
git commit -m "feat(verbs): routes + landing entries (stubs) for sentence quiz"
```

### Task 15: `VerbSentenceSetup.vue`

**Files:**
- Modify: `src/modules/verbs/VerbSentenceSetup.vue`

- [ ] **Step 1: Implement the setup** (models `SentenceQuizSetup.vue` + `TranslationQuizSetup.vue`). It samples specs and stashes them — generation happens in the runner (ADR-0004).

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import { useNouns } from '../../composables/useNouns'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'
import { VERB_LEVELS, VERB_TYPES, VERB_CASES, type VerbLevel, type VerbType, type VerbCase } from '../../data/verbs'
import { NOUN_GROUPS, type NounGroup } from '../../db/types'
import { nounToRef } from '../../composables/useSentenceQuiz'
import { verbToRef, buildVerbSpecs, levelLabel, type WordsPer } from '../../composables/useVerbSentenceQuiz'

const STORAGE_KEY = 'verbSentenceSetup'
const STASH_KEY = 'gt:lastVerbSentenceQuiz'
const router = useRouter()

const { filter } = useVerbs()
const { sampleByGroups, countsByGroup } = useNouns()
const { settings, canUseAi, load: loadSettings } = useSettings()
const toast = useToast()

const levels = ref<VerbLevel[]>([...VERB_LEVELS])
const types = ref<VerbType[]>([...VERB_TYPES])
const cases = ref<VerbCase[]>([...VERB_CASES])
const groups = ref<NounGroup[]>([])
const verbsPer = ref<WordsPer>('mix')
const nounsPer = ref<WordsPer>('mix')
const wordHints = ref(true)
type CountPreset = 10 | 15 | 20 | 25 | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

const nounCounts = ref<Record<NounGroup, number>>(
  Object.fromEntries(NOUN_GROUPS.map(g => [g, 0])) as Record<NounGroup, number>
)

interface Stored {
  levels?: VerbLevel[]; types?: VerbType[]; cases?: VerbCase[]; groups?: NounGroup[]
  verbsPer?: WordsPer; nounsPer?: WordsPer; wordHints?: boolean; count?: CountPreset; customCount?: number
}
function loadStored(): Stored | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as Stored : null } catch { return null }
}
function saveStored(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      levels: [...levels.value], types: [...types.value], cases: [...cases.value], groups: [...groups.value],
      verbsPer: verbsPer.value, nounsPer: nounsPer.value, wordHints: wordHints.value,
      count: count.value, customCount: customCount.value
    } satisfies Stored))
  } catch { /* ignore */ }
}

onMounted(async () => {
  await loadSettings()
  nounCounts.value = await countsByGroup()
  const s = loadStored()
  if (s) {
    if (Array.isArray(s.levels)) levels.value = s.levels.filter(l => (VERB_LEVELS as readonly string[]).includes(l))
    if (Array.isArray(s.types)) types.value = s.types.filter(t => (VERB_TYPES as readonly string[]).includes(t))
    if (Array.isArray(s.cases)) cases.value = s.cases.filter(c => (VERB_CASES as readonly string[]).includes(c))
    if (Array.isArray(s.groups)) groups.value = s.groups.filter(g => (NOUN_GROUPS as readonly string[]).includes(g))
    if (s.verbsPer === 1 || s.verbsPer === 2 || s.verbsPer === 'mix') verbsPer.value = s.verbsPer
    if (s.nounsPer === 1 || s.nounsPer === 2 || s.nounsPer === 'mix') nounsPer.value = s.nounsPer
    if (typeof s.wordHints === 'boolean') wordHints.value = s.wordHints
    if (s.count !== undefined) count.value = s.count
    if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
  }
  if (groups.value.length === 0) groups.value = NOUN_GROUPS.filter(g => (nounCounts.value[g] ?? 0) > 0)
})
watch([levels, types, cases, groups, verbsPer, nounsPer, wordHints, count, customCount], saveStored, { deep: true })

const availableVerbs = computed(() => filter({ levels: levels.value, types: types.value, cases: cases.value }).length)
const effective = computed(() => count.value === 'custom' ? Math.max(1, customCount.value) : count.value)
const selectedNounTotal = computed(() => groups.value.reduce((sum, g) => sum + (nounCounts.value[g] ?? 0), 0))
const canStart = computed(() =>
  canUseAi.value && availableVerbs.value > 0 && selectedNounTotal.value > 0 && levels.value.length > 0 && types.value.length > 0 && cases.value.length > 0
)

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v); return i >= 0 ? set.filter((_, j) => j !== i) : [...set, v]
}

async function start() {
  if (!canUseAi.value) {
    toast.error(
      settings.value.aiProvider === 'local-claude' ? 'Local Claude not reachable' : 'Gemini API key required',
      { description: 'Set your API key (or pick Local Claude) in Settings before generating sentences.' }
    )
    return
  }
  if (!canStart.value) return
  const n = effective.value
  const verbPool = filter({ levels: levels.value, types: types.value, cases: cases.value }).map(verbToRef)
  const nounPool = (await sampleByGroups(groups.value, 100000)).map(nounToRef)
  const specs = buildVerbSpecs(verbPool, nounPool, n, verbsPer.value, nounsPer.value)
  sessionStorage.setItem(STASH_KEY, JSON.stringify({
    specs,
    runType: 'verb-sentence',
    level: levelLabel(levels.value),
    wordHints: wordHints.value,
    meta: { levels: levels.value, types: types.value, cases: cases.value, groups: groups.value, verbsPer: verbsPer.value, nounsPer: nounsPer.value }
  }))
  router.push({ name: 'verbs-sentence-run' })
}

function back() { router.push({ name: 'verbs' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel III · Satzübersetzung · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          Pick a verb pool and a noun theme. The AI writes one English+German sentence per item using
          1–2 of your verbs and 1–2 nouns — you read the English and type the German, and the AI grades it.
        </p>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning">
      <span class="alert-label">AI access needed</span>
      Set a Gemini API key, or pick <em>Local Claude (dev)</em>, in Settings.
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Level · {{ levels.length }} of {{ VERB_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...VERB_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="l in VERB_LEVELS" :key="l" class="chip" :class="{ selected: levels.includes(l) }" @click="levels = toggle(levels, l)">{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Type · {{ types.length }} of {{ VERB_TYPES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="types = [...VERB_TYPES]">All</button>
          <button class="btn btn-quiet" type="button" @click="types = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="t in VERB_TYPES" :key="t" class="chip" :class="{ selected: types.includes(t) }" @click="types = toggle(types, t)">{{ t }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Object case · {{ cases.length }} of {{ VERB_CASES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="cases = [...VERB_CASES]">All</button>
          <button class="btn btn-quiet" type="button" @click="cases = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="c in VERB_CASES" :key="c" class="chip" :class="{ selected: cases.includes(c) }" @click="cases = toggle(cases, c)">{{ c }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Theme · {{ groups.length }} group{{ groups.length === 1 ? '' : 's' }} · {{ selectedNounTotal }} nouns</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="groups = NOUN_GROUPS.filter(g => (nounCounts[g] ?? 0) > 0)">All</button>
          <button class="btn btn-quiet" type="button" @click="groups = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="g in NOUN_GROUPS" :key="g" class="chip" :class="{ selected: groups.includes(g) }" :disabled="(nounCounts[g] ?? 0) === 0" @click="groups = toggle(groups, g)">
          <span>{{ g }}</span><span class="chip-count">{{ nounCounts[g] ?? 0 }}</span>
        </button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Verbs per sentence</div>
      <div class="segmented">
        <button :class="{ active: verbsPer === 1 }" @click="verbsPer = 1">1</button>
        <button :class="{ active: verbsPer === 2 }" @click="verbsPer = 2">2</button>
        <button :class="{ active: verbsPer === 'mix' }" @click="verbsPer = 'mix'">1–2 (mixed)</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Nouns per sentence</div>
      <div class="segmented">
        <button :class="{ active: nounsPer === 1 }" @click="nounsPer = 1">1</button>
        <button :class="{ active: nounsPer === 2 }" @click="nounsPer = 2">2</button>
        <button :class="{ active: nounsPer === 'mix' }" @click="nounsPer = 'mix'">1–2 (mixed)</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Word hints</div>
      <div class="segmented">
        <button :class="{ active: wordHints }" @click="wordHints = true">On</button>
        <button :class="{ active: !wordHints }" @click="wordHints = false">Off</button>
      </div>
      <p class="micro-mark grading-hint">
        {{ wordHints
          ? 'Highlights every verb and noun in the English prompt — hover or tap a highlight to reveal the German.'
          : 'No highlights — translate the full sentence unaided.' }}
      </p>
    </div>

    <div class="field">
      <div class="field-label">Number of sentences</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: count === 10 }" @click="count = 10">10</button>
          <button :class="{ active: count === 15 }" @click="count = 15">15</button>
          <button :class="{ active: count === 20 }" @click="count = 20">20</button>
          <button :class="{ active: count === 25 }" @click="count = 25">25</button>
          <button :class="{ active: count === 'custom' }" @click="count = 'custom'">Custom</button>
        </div>
        <input v-if="count === 'custom'" class="input custom-count" type="number" :min="1" :max="50" v-model.number="customCount" />
        <span class="micro-mark count-avail">{{ availableVerbs }} verbs in pool</span>
      </div>
    </div>

    <div v-if="availableVerbs === 0" class="alert alert-warning"><span class="alert-label">Warning</span>No verbs match the selected filters.</div>
    <div v-else-if="selectedNounTotal === 0" class="alert alert-warning"><span class="alert-label">Warning</span>Select at least one theme group that has nouns.</div>

    <div class="alert alert-info">
      <span class="alert-label">How this drill works</span>
      We sample {{ effective }} sentence spec{{ effective === 1 ? '' : 's' }} from your verbs + nouns, then the AI
      writes them one batch at a time. The quiz opens on the first sentence and the rest stream in as you go.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button class="btn btn-accent" type="button" :disabled="!canStart" @click="start">
        Start · {{ effective }} sentence{{ effective === 1 ? '' : 's' }} <span aria-hidden="true">→</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.field-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; gap: 12px; flex-wrap: wrap; }
.field-actions { display: flex; gap: 4px; }
.count-row { align-items: center; gap: 12px; }
.custom-count { width: 80px; font-size: 17px; padding: 4px 0; }
.count-avail { margin-left: auto; }
.grading-hint { margin: 8px 0 0; }
.chip-count { margin-left: 6px; font-family: var(--font-mono); font-size: 11px; opacity: 0.6; }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) { .setup-actions { flex-direction: column-reverse; align-items: stretch; } .setup-actions .btn { justify-content: center; } }
</style>
```

- [ ] **Step 2: Type-check**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/verbs/VerbSentenceSetup.vue
git commit -m "feat(verbs): verb sentence quiz setup page"
```

### Task 16: `VerbSentenceRunner.vue` (progressive runner + result)

**Files:**
- Modify: `src/modules/verbs/VerbSentenceRunner.vue`

- [ ] **Step 1: Implement the runner.** It reads the stash, drives `generateProgressively`, opens on the first sentence, shows "preparing next…" when the learner outruns generation, AI-grades each answer, and saves history (with per-item data) on finish.

```vue
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { shuffle } from '../../data/pool'
import { buildHintSegments, checkSentence, type HintSegment } from '../../composables/useSentenceQuiz'
import {
  buildVerbHintInputs, gradeVerbAnswer, buildVerbDrillItem, generateVerbSentenceBatch,
  type GeneratedVerbSentence, type VerbSentenceSpec, type VerbSentenceVerdict
} from '../../composables/useVerbSentenceQuiz'
import { planBatches, generateProgressively } from '../../composables/useProgressiveGenerator'
import { saveQuizRun, type QuizHistoryType } from '../../composables/useQuizHistory'
import { useSettings } from '../../composables/useSettings'
import { resolveAiClient } from '../../composables/localClaude'
import { useToast } from '../../composables/useToast'
import RetryModal from '../../components/RetryModal.vue'
import QuizProgress from '../../components/QuizProgress.vue'

const STASH_KEY = 'gt:lastVerbSentenceQuiz'
const router = useRouter()
const { settings, load: loadSettings } = useSettings()
const toast = useToast()

interface Stash {
  specs: VerbSentenceSpec[]
  runType?: QuizHistoryType
  level?: string
  wordHints?: boolean
  meta?: { levels: string[]; types: string[]; cases: string[]; groups: string[]; verbsPer: 1 | 2 | 'mix'; nounsPer: 1 | 2 | 'mix' }
}

const error = ref<string | null>(null)
const expected = ref(0)            // requested N
const deck = ref<GeneratedVerbSentence[]>([])  // arrival order
const generationDone = ref(false)
const runType = ref<QuizHistoryType>('verb-sentence')
const level = ref('A2–B1')
const wordHints = ref(true)
const metaInfo = ref<Stash['meta']>(undefined)

const answers = ref<string[]>([])
const verdicts = ref<Map<number, VerbSentenceVerdict>>(new Map())
const startedAt = ref(0)
const historySaved = ref(false)

const index = ref(0)
const userInput = ref('')
const phase = ref<'input' | 'checking' | 'graded'>('input')
const finished = ref(false)
const awaitingNext = ref(false)    // outran generation
const inputRef = ref<HTMLInputElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

const ready = computed(() => deck.value.length > 0 || generationDone.value || error.value !== null)
const total = computed(() => expected.value)
const current = computed<GeneratedVerbSentence | null>(() => deck.value[index.value] ?? null)
const currentVerdict = computed(() => verdicts.value.get(index.value) ?? null)
const correctCount = computed(() => { let n = 0; for (const v of verdicts.value.values()) if (v.correct) n++; return n })
const wrongAnswered = computed(() => { let n = 0; for (const v of verdicts.value.values()) if (!v.correct) n++; return n })
const generatedTotal = computed(() => deck.value.length)
const wrongCount = computed(() => generatedTotal.value - correctCount.value)
const allCorrect = computed(() => finished.value && wrongCount.value === 0)
const isLastGenerated = computed(() => index.value + 1 >= deck.value.length)

// Tap-to-toggle reveal, keyed by segment index.
const revealed = ref<Set<number>>(new Set())
function toggleReveal(i: number) {
  const next = new Set(revealed.value); next.has(i) ? next.delete(i) : next.add(i); revealed.value = next
}

const currentSegments = computed<HintSegment[]>(() => {
  const s = current.value
  if (!s) return []
  if (!wordHints.value) return [{ text: s.english }]
  return buildHintSegments(s.english, buildVerbHintInputs(s))
})

function hintClass(kind: string): string { return 'hint-' + kind }

onMounted(async () => {
  await loadSettings()
  let stash: Stash | null = null
  try {
    const raw = sessionStorage.getItem(STASH_KEY)
    if (!raw) { error.value = 'No quiz in this session. Go back to setup.'; return }
    stash = JSON.parse(raw) as Stash
  } catch (e) { error.value = e instanceof Error ? e.message : 'Failed to load.'; return }
  if (!stash || !Array.isArray(stash.specs) || stash.specs.length === 0) { error.value = 'No sentence specs in this session.'; return }

  expected.value = stash.specs.length
  runType.value = stash.runType === 'verb-remedial' ? 'verb-remedial' : 'verb-sentence'
  level.value = stash.level ?? 'A2–B1'
  wordHints.value = stash.wordHints !== false
  metaInfo.value = stash.meta
  startedAt.value = Date.now()
  answers.value = []

  const client = resolveAiClient(settings.value)
  const batches = planBatches(stash.specs, 1, 5)
  generateProgressively<VerbSentenceSpec, GeneratedVerbSentence>({
    batches,
    runBatch: async (batch) => {
      const res = await generateVerbSentenceBatch(client, { model: settings.value.model, specs: batch, level: level.value, maxRetries: 1 })
      return res.sentences
    },
    onResults: (sentences) => {
      for (const s of sentences) { deck.value.push(s); answers.value.push('') }
      if (awaitingNext.value) tryAdvance()
      nextTick(() => { if (deck.value.length === sentences.length) inputRef.value?.focus() })
    },
    concurrency: 4
  }).finally(() => {
    generationDone.value = true
    if (deck.value.length === 0) error.value = 'The model returned no usable sentences. Go back and try again.'
    if (awaitingNext.value) tryAdvance()
  })
})

async function submit() {
  if (!current.value || phase.value !== 'input') return
  if (userInput.value.trim().length === 0) return
  const i = index.value
  const s = current.value
  phase.value = 'checking'
  let verdict: VerbSentenceVerdict
  try {
    const grade = await gradeVerbAnswer(resolveAiClient(settings.value), {
      model: settings.value.model,
      english: s.english, german: s.german,
      verbsGerman: s.verbs.map(v => v.german), nounsGerman: s.nouns.map(n => n.german),
      userAnswer: userInput.value
    })
    verdict = { index: i, correct: grade.correct, correction: s.german, tip: grade.tip, tags: grade.tags }
  } catch {
    verdict = { index: i, correct: checkSentence(userInput.value, s.german), correction: s.german }
    toast.info('Graded offline', { description: 'The AI grader was unreachable, so this answer was checked by exact match.' })
  }
  answers.value[i] = userInput.value
  verdicts.value.set(i, verdict)
  verdicts.value = new Map(verdicts.value)
  phase.value = 'graded'
  nextTick(() => nextBtnRef.value?.focus())
}

function finishQuiz() {
  finished.value = true
  awaitingNext.value = false
  if (historySaved.value) return
  historySaved.value = true
  const finishedAt = Date.now()
  const items = deck.value.map((s, i) => buildVerbDrillItem(s, verdicts.value.get(i)?.correct ?? false, verdicts.value.get(i)?.tags))
  saveQuizRun({
    type: runType.value,
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: generatedTotal.value,
    correct: correctCount.value,
    meta: {
      verbSentenceLevels: metaInfo.value?.levels, verbSentenceTypes: metaInfo.value?.types,
      verbSentenceCases: metaInfo.value?.cases, verbSentenceGroups: metaInfo.value?.groups,
      verbsPerSentence: metaInfo.value?.verbsPer, verbSentenceNounsPer: metaInfo.value?.nounsPer,
      verbSentenceHints: wordHints.value, verbSentenceItems: items
    }
  })
}

/** Move to the next card, or wait for generation, or finish. */
function tryAdvance() {
  if (index.value + 1 < deck.value.length) {
    index.value++
    userInput.value = ''
    phase.value = 'input'
    awaitingNext.value = false
    revealed.value = new Set()
    nextTick(() => inputRef.value?.focus())
  } else if (generationDone.value) {
    finishQuiz()
  } else {
    awaitingNext.value = true // wait; onResults/finally will re-call tryAdvance
  }
}

function next() {
  if (phase.value !== 'graded') return
  tryAdvance()
}

function onEnter(e: KeyboardEvent) {
  e.preventDefault()
  if (phase.value === 'input') submit()
  else if (phase.value === 'graded') next()
}

function retryWrong() {
  const wrong = deck.value.filter((_, i) => !verdicts.value.get(i)?.correct)
  if (wrong.length === 0) return
  deck.value = shuffle(wrong)
  answers.value = deck.value.map(() => '')
  verdicts.value = new Map()
  expected.value = deck.value.length
  generationDone.value = true
  index.value = 0; userInput.value = ''; phase.value = 'input'; finished.value = false
  revealed.value = new Set()
  startedAt.value = Date.now(); historySaved.value = false
  nextTick(() => inputRef.value?.focus())
}

function newQuiz() { router.push({ name: 'verbs-sentence' }) }
function endQuiz() { router.push({ name: 'verbs' }) }

// If we were waiting and generation finished with nothing more, finish.
watch([deck, generationDone], () => { if (awaitingNext.value) tryAdvance() }, { deep: true })
</script>

<template>
  <div v-if="!ready" class="page loading-state"><div class="micro-mark">Generating the first sentence…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="newQuiz">← Back to setup</button>
  </div>

  <!-- Result -->
  <div v-else-if="finished" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel III · Satzübersetzung · Auswertung</div>
        <h1 class="section-title">{{ correctCount }} / {{ generatedTotal }}<em>.</em></h1>
        <p v-if="allCorrect" class="section-subtitle">Alles richtig! 🎉</p>
        <p v-else class="section-subtitle">{{ wrongCount }} to fix. Reference translations and notes below.</p>
        <p v-if="generatedTotal < expected" class="section-subtitle">Generated {{ generatedTotal }} of {{ expected }} — some sentences failed to generate.</p>
      </div>
    </header>

    <div class="result-rows">
      <div v-for="(s, i) in deck" :key="i" class="result-row" :class="{ good: verdicts.get(i)?.correct, bad: !verdicts.get(i)?.correct }">
        <div class="rr-head">
          <span class="rr-mark">{{ verdicts.get(i)?.correct ? '✓' : '✗' }}</span>
          <span class="rr-en">{{ s.english }}</span>
          <span class="rr-tags">
            <span v-for="t in verdicts.get(i)?.tags" :key="t" class="tag tag-error">{{ t }}</span>
          </span>
        </div>
        <div class="rr-you" :class="{ 'rr-you-empty': !answers[i]?.trim() }"><span class="rr-label">You</span> {{ answers[i]?.trim() || '— (blank)' }}</div>
        <div v-if="!verdicts.get(i)?.correct" class="rr-ref"><span class="rr-label">Answer</span> {{ verdicts.get(i)?.correction || s.german }}</div>
        <div v-if="!verdicts.get(i)?.correct && verdicts.get(i)?.tip" class="rr-tip"><span class="rr-label">Tip</span> {{ verdicts.get(i)?.tip }}</div>
      </div>
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="endQuiz">← Verbs</button>
      <div class="result-cta">
        <button v-if="wrongCount > 0" class="btn btn-quiet" type="button" @click="retryWrong">Retry {{ wrongCount }} wrong</button>
        <button class="btn btn-accent" type="button" @click="newQuiz">New quiz <span aria-hidden="true">→</span></button>
      </div>
    </div>
    <RetryModal :wrong-count="wrongCount" item-label="sentences" @retry="retryWrong" />
  </div>

  <!-- One sentence per step -->
  <div v-else class="page">
    <div class="quiz-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ index + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <QuizProgress class="sentence-progress" :correct="correctCount" :wrong="wrongAnswered" :total="total" :current-index="index" />

      <div v-if="awaitingNext" class="prompt-card"><div class="micro-mark">Preparing next sentence…</div></div>

      <template v-else-if="current">
        <div class="prompt-card">
          <div v-if="!wordHints" class="en-sentence">{{ current.english }}</div>
          <div v-else class="en-sentence">
            <template v-for="(seg, i) in currentSegments" :key="i"><span
              v-if="seg.hint"
              class="hint"
              :class="[hintClass(seg.hint.kind), { revealed: revealed.has(i) }]"
              tabindex="0" role="button"
              :aria-label="seg.hint.kind + ' hint: ' + seg.hint.reveal"
              @click="toggleReveal(i)"
              @keydown.enter.prevent="toggleReveal(i)"
              @keydown.space.prevent="toggleReveal(i)"
            >{{ seg.text }}<span class="hint-pop">{{ seg.hint.reveal }}</span></span><template v-else>{{ seg.text }}</template></template>
          </div>
          <div class="en-hint">Translate into German.</div>
        </div>

        <form class="prep-input-wrap" @submit.prevent="submit">
          <input ref="inputRef" class="input prep-input" type="text" placeholder="Deutsch…" v-model="userInput"
            :readonly="phase !== 'input'" autocomplete="off" spellcheck="false" @keydown.enter="onEnter"
            :style="phase === 'graded' ? { color: currentVerdict?.correct ? 'var(--success)' : 'var(--danger)', borderBottomColor: currentVerdict?.correct ? 'var(--success)' : 'var(--danger)' } : undefined" />
          <button v-if="phase === 'input'" type="submit" class="btn btn-accent" :disabled="userInput.trim().length === 0">Submit</button>
          <button v-else-if="phase === 'checking'" type="button" class="btn btn-accent" disabled>Checking…</button>
          <button v-else ref="nextBtnRef" type="button" class="btn btn-accent" @click="next">{{ (isLastGenerated && generationDone) ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
        </form>

        <div v-if="phase === 'graded' && currentVerdict" class="prep-feedback">
          <span class="prep-feedback-mark" :class="currentVerdict.correct ? 'prep-feedback-ok' : 'prep-feedback-bad'">{{ currentVerdict.correct ? '✓ Richtig.' : '✗ Nicht ganz.' }}</span>
          <span class="prep-feedback-full">{{ currentVerdict.correction || current.german }}</span>
          <span v-if="currentVerdict.tip" class="prep-feedback-tip">💡 {{ currentVerdict.tip }}</span>
          <span v-if="currentVerdict.tags?.length" class="prep-feedback-tags">
            <span v-for="t in currentVerdict.tags" :key="t" class="tag tag-error">{{ t }}</span>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.quiz-card { max-width: 720px; margin: 0 auto; }
.quiz-meta { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
.quiz-counter { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mute); }
.sentence-progress { margin-bottom: 36px; }
.prompt-card { text-align: center; }
.en-sentence { font-family: var(--font-display); font-weight: 500; font-size: 30px; line-height: 1.3; letter-spacing: -0.005em; color: var(--ink); }
.en-hint { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); margin-top: 14px; }
.hint { position: relative; cursor: help; text-decoration: underline dotted; text-underline-offset: 4px; border-radius: 2px; padding: 0 1px; transition: background-color 120ms ease; outline: none; }
.hint-verb { text-decoration-color: var(--accent); }
.hint-verb:hover, .hint-verb:focus-visible, .hint-verb.revealed { background-color: var(--accent-tint); }
.hint-noun { text-decoration-color: var(--cobalt); }
.hint-noun:hover, .hint-noun:focus-visible, .hint-noun.revealed { background-color: var(--cobalt-tint); }
.hint-pop { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(-6px); white-space: nowrap; font-family: var(--font-mono); font-size: 13px; line-height: 1.2; padding: 4px 8px; border-radius: 4px; background: var(--paper-card, #fff); color: var(--ink); border: 1px solid var(--rule); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18); pointer-events: none; opacity: 0; visibility: hidden; transition: opacity 120ms ease; z-index: 2; }
.hint:hover .hint-pop, .hint:focus-visible .hint-pop, .hint.revealed .hint-pop { opacity: 1; visibility: visible; }
.prep-input-wrap { display: flex; gap: 12px; align-items: flex-end; margin-top: 36px; }
.prep-input { flex: 1; text-align: center; font-size: 22px; border: 0; border-bottom: 2px solid var(--rule); padding: 8px 0; }
.prep-input:focus { border-bottom-color: var(--accent); outline: none; }
.prep-feedback { margin-top: 18px; text-align: center; display: flex; flex-direction: column; gap: 8px; }
.prep-feedback-mark { font-family: var(--font-display); font-style: italic; font-size: 17px; }
.prep-feedback-ok { color: var(--success); }
.prep-feedback-bad { color: var(--danger); }
.prep-feedback-full { font-family: var(--font-display); font-size: 18px; color: var(--ink); }
.prep-feedback-tip { font-size: 14px; color: var(--ink-soft); }
.prep-feedback-tags { margin-top: 4px; display: inline-flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.tag.tag-error { background: var(--danger-tint); color: var(--danger); }
.result-page { max-width: 880px; }
.result-rows { display: flex; flex-direction: column; gap: 12px; margin: 24px 0; }
.result-row { border: 1px solid var(--rule); border-left: 3px solid var(--rule); border-radius: 3px; padding: 14px 16px; }
.result-row.good { border-left-color: var(--sage, #6b8e6b); }
.result-row.bad { border-left-color: var(--clay, #b5654a); }
.rr-head { display: flex; align-items: baseline; gap: 10px; }
.rr-mark { font-family: var(--font-mono); font-weight: 600; }
.result-row.good .rr-mark { color: var(--sage, #6b8e6b); }
.result-row.bad .rr-mark { color: var(--clay, #b5654a); }
.rr-en { flex: 1; font-family: var(--font-body); color: var(--ink); }
.rr-tags { margin-left: auto; display: inline-flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.rr-you, .rr-ref, .rr-tip { font-family: var(--font-mono); font-size: 14px; margin-top: 6px; color: var(--ink-soft); }
.rr-you-empty { opacity: 0.6; }
.rr-ref { color: var(--ink); }
.rr-label { display: inline-block; min-width: 56px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mute); }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; gap: 16px; }
.result-cta { display: flex; gap: 12px; }
@media (max-width: 720px) { .setup-actions { flex-direction: column-reverse; align-items: stretch; } .result-cta { flex-direction: column; } .setup-actions .btn { justify-content: center; } }
</style>
```

- [ ] **Step 2: Type-check**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Manual verification** (requires AI access in Settings)

Run: `npm run dev`. Verbs → Sentence quiz → pick filters + theme → Start. Confirm: quiz opens after the first sentence (not all N); hovering a verb shows its infinitive, a noun shows der/die/das + noun, and an incidental noun shows AI German; toggling hints off in setup removes highlights; submitting gets an AI verdict + tip; "Retry N wrong" works; finishing records a `verb-sentence` run in History.

- [ ] **Step 4: Commit**

```bash
git add src/modules/verbs/VerbSentenceRunner.vue
git commit -m "feat(verbs): progressive verb sentence runner + result"
```

### Task 17: `VerbRemedialSetup.vue` (weak-weighted drill)

**Files:**
- Modify: `src/modules/verbs/VerbRemedialSetup.vue`

- [ ] **Step 1: Implement.** Compute weak points from history, resolve weak keys to refs (full pool as fallback), build specs, stash with `runType: 'verb-remedial'`, reuse the runner.

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import { useNouns } from '../../composables/useNouns'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'
import { loadHistory } from '../../composables/useQuizHistory'
import { NOUN_GROUPS } from '../../db/types'
import { nounToRef, type NounRef } from '../../composables/useSentenceQuiz'
import { verbToRef, buildVerbSpecs, levelLabel, type VerbRef } from '../../composables/useVerbSentenceQuiz'
import { computeVerbWeakPoints, weakKeysForRemedial, selectRemedialPool } from '../../composables/useVerbSentenceStats'

const STASH_KEY = 'gt:lastVerbSentenceQuiz'
const router = useRouter()
const { all: allVerbs } = useVerbs()
const { sampleByGroups } = useNouns()
const { settings, canUseAi, load: loadSettings } = useSettings()
const toast = useToast()

const wp = ref(computeVerbWeakPoints([]))
type CountPreset = 10 | 15 | 20 | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)
const wordHints = ref(true)

const effective = computed(() => count.value === 'custom' ? Math.max(1, customCount.value) : count.value)
const weakVerbCount = computed(() => wp.value.weakVerbs.filter(v => v.wrong > 0).length)
const weakNounCount = computed(() => wp.value.weakNouns.filter(n => n.wrong > 0).length)
const hasWeak = computed(() => weakVerbCount.value > 0)

onMounted(async () => {
  await loadSettings()
  wp.value = computeVerbWeakPoints(loadHistory())
})

function toggle<T>(set: T[], v: T): T[] { const i = set.indexOf(v); return i >= 0 ? set.filter((_, j) => j !== i) : [...set, v] }

async function start() {
  if (!canUseAi.value) { toast.error('AI access needed', { description: 'Set a Gemini API key (or Local Claude) in Settings.' }); return }
  if (!hasWeak.value) { toast.info('No weak verbs yet', { description: 'Finish a few verb sentence quizzes first.' }); return }

  const keys = weakKeysForRemedial(wp.value, 40)
  const byGerman = new Map(allVerbs().map(v => [v.german, verbToRef(v)]))
  const weakVerbRefs: VerbRef[] = keys.verbKeys.map(k => byGerman.get(k)).filter((v): v is VerbRef => !!v)
  const verbPool = selectRemedialPool(weakVerbRefs, allVerbs().map(verbToRef))

  // Resolve weak nouns from the full noun store; fall back to all nouns.
  const allNouns = (await sampleByGroups([...NOUN_GROUPS], 100000)).map(nounToRef)
  const byNoun = new Map(allNouns.map(n => [n.german, n]))
  const weakNounRefs: NounRef[] = keys.nounKeys.map(k => byNoun.get(k)).filter((n): n is NounRef => !!n)
  const nounPool = selectRemedialPool(weakNounRefs, allNouns)

  const specs = buildVerbSpecs(verbPool, nounPool, effective.value, 'mix', 'mix')
  sessionStorage.setItem(STASH_KEY, JSON.stringify({
    specs, runType: 'verb-remedial', level: levelLabel(['A1', 'A2', 'B1', 'B2']), wordHints: wordHints.value,
    meta: { levels: [], types: [], cases: [], groups: [], verbsPer: 'mix', nounsPer: 'mix' }
  }))
  router.push({ name: 'verbs-sentence-run' })
}

function back() { router.push({ name: 'verbs' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel III · Schwachstellen · Einrichtung</div>
        <h1 class="section-title">Practise weak verbs<em>.</em></h1>
        <p class="section-subtitle">A sentence drill drawn from the verbs and nouns you've missed most across your recent runs.</p>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning"><span class="alert-label">AI access needed</span>Set a Gemini API key, or pick Local Claude, in Settings.</div>
    <div v-else-if="!hasWeak" class="alert alert-info"><span class="alert-label">Nothing to drill yet</span>Finish a few verb sentence quizzes so we can spot your weak spots.</div>

    <div v-else class="alert alert-info">
      <span class="alert-label">Your weak spots</span>
      {{ weakVerbCount }} weak verb{{ weakVerbCount === 1 ? '' : 's' }} and {{ weakNounCount }} weak noun{{ weakNounCount === 1 ? '' : 's' }} from recent runs. We'll weight the drill toward them.
    </div>

    <div class="field">
      <div class="field-label">Word hints</div>
      <div class="segmented">
        <button :class="{ active: wordHints }" @click="wordHints = true">On</button>
        <button :class="{ active: !wordHints }" @click="wordHints = false">Off</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of sentences</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: count === 10 }" @click="count = 10">10</button>
          <button :class="{ active: count === 15 }" @click="count = 15">15</button>
          <button :class="{ active: count === 20 }" @click="count = 20">20</button>
          <button :class="{ active: count === 'custom' }" @click="count = 'custom'">Custom</button>
        </div>
        <input v-if="count === 'custom'" class="input custom-count" type="number" :min="1" :max="50" v-model.number="customCount" />
      </div>
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button class="btn btn-accent" type="button" :disabled="!canUseAi || !hasWeak" @click="start">Start · {{ effective }} sentences <span aria-hidden="true">→</span></button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.field-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; gap: 12px; flex-wrap: wrap; }
.count-row { align-items: center; gap: 12px; }
.custom-count { width: 80px; font-size: 17px; padding: 4px 0; }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) { .setup-actions { flex-direction: column-reverse; align-items: stretch; } .setup-actions .btn { justify-content: center; } }
</style>
```

- [ ] **Step 2: Type-check**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. After completing ≥1 verb sentence quiz with some wrong answers, open Verbs → Practise weak verbs → confirm it reports your weak counts and runs a drill saved as `verb-remedial`.

- [ ] **Step 4: Commit**

```bash
git add src/modules/verbs/VerbRemedialSetup.vue
git commit -m "feat(verbs): weak-weighted remedial setup"
```

### Task 18: `VerbWeakPoints` chart on the history page

**Files:**
- Create: `src/components/charts/VerbWeakPoints.vue`
- Modify: `src/modules/history/HistoryPage.vue`
- Test: `tests/components/VerbWeakPoints.test.ts`

- [ ] **Step 1: Look at the existing chart for the pattern.** Read `src/components/charts/PrepWeakPoints.vue` and `src/modules/history/HistoryPage.vue` to match how charts receive `entries`/are conditionally rendered. Mirror its props and "no data → hidden" behaviour.

- [ ] **Step 2: Write the failing test** — `tests/components/VerbWeakPoints.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VerbWeakPoints from '../../src/components/charts/VerbWeakPoints.vue'
import type { QuizHistoryEntry } from '../../src/composables/useQuizHistory'

function entry(items: any[]): QuizHistoryEntry {
  return { id: 1, type: 'verb-sentence', startedAt: '', finishedAt: '', durationMs: 0, count: items.length, correct: 0, meta: { verbSentenceItems: items } }
}

describe('VerbWeakPoints', () => {
  test('renders the weakest verb when there is data', () => {
    const wrapper = mount(VerbWeakPoints, { props: { entries: [entry([
      { verbKeys: ['gehen'], correct: false, tags: ['conjugation'] },
      { verbKeys: ['gehen'], correct: false, tags: ['conjugation'] }
    ])] } })
    expect(wrapper.text()).toContain('gehen')
  })
  test('renders nothing useful when there is no verb-sentence data', () => {
    const wrapper = mount(VerbWeakPoints, { props: { entries: [] } })
    expect(wrapper.text()).not.toContain('gehen')
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run tests/components/VerbWeakPoints.test.ts`
Expected: FAIL — component missing.

- [ ] **Step 4: Implement `src/components/charts/VerbWeakPoints.vue`** — a compact ranked list (no echarts dependency needed; keep it simple and robust):

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { QuizHistoryEntry } from '../../composables/useQuizHistory'
import { computeVerbWeakPoints } from '../../composables/useVerbSentenceStats'

const props = defineProps<{ entries: QuizHistoryEntry[] }>()

const wp = computed(() => computeVerbWeakPoints(props.entries))
const topVerbs = computed(() => wp.value.weakVerbs.filter(v => v.wrong > 0).slice(0, 8))
const topNouns = computed(() => wp.value.weakNouns.filter(n => n.wrong > 0).slice(0, 8))
const hasData = computed(() => topVerbs.value.length > 0 || topNouns.value.length > 0)
function pct(wrong: number, seen: number): number { return seen > 0 ? Math.round((wrong / seen) * 100) : 0 }
</script>

<template>
  <section v-if="hasData" class="card weak-card">
    <h3 class="weak-title">Verb weak points</h3>
    <p class="weak-sub">Highest miss-rate from your recent verb sentence runs.</p>
    <div class="weak-cols">
      <div v-if="topVerbs.length" class="weak-col">
        <div class="weak-h">Verbs</div>
        <ul class="weak-list">
          <li v-for="v in topVerbs" :key="v.verbKey"><span class="weak-key">{{ v.verbKey }}</span><span class="weak-rate">{{ pct(v.wrong, v.seen) }}% · {{ v.wrong }}/{{ v.seen }}</span></li>
        </ul>
      </div>
      <div v-if="topNouns.length" class="weak-col">
        <div class="weak-h">Nouns</div>
        <ul class="weak-list">
          <li v-for="n in topNouns" :key="n.nounKey"><span class="weak-key">{{ n.nounKey }}</span><span class="weak-rate">{{ pct(n.wrong, n.seen) }}% · {{ n.wrong }}/{{ n.seen }}</span></li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.weak-card { padding: 20px; }
.weak-title { font-family: var(--font-display); margin: 0 0 4px; }
.weak-sub { font-size: 13px; color: var(--mute); margin: 0 0 16px; }
.weak-cols { display: flex; gap: 32px; flex-wrap: wrap; }
.weak-col { flex: 1; min-width: 200px; }
.weak-h { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mute); margin-bottom: 8px; }
.weak-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.weak-list li { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
.weak-key { font-family: var(--font-body); color: var(--ink); }
.weak-rate { font-family: var(--font-mono); font-size: 12px; color: var(--danger); }
</style>
```

- [ ] **Step 5: Mount it on the history page.** In `src/modules/history/HistoryPage.vue`, import and place it alongside the existing charts (mirror where `PrepWeakPoints` is rendered — pass the loaded history entries). Add to the script imports:

```ts
import VerbWeakPoints from '../../components/charts/VerbWeakPoints.vue'
```
and in the template, near `<PrepWeakPoints .../>` (use the same entries source the page already passes to charts, e.g. `entries` / `history`):
```vue
<VerbWeakPoints :entries="entries" />
```

> Match the actual variable name HistoryPage uses for the entries array (read the file first — it may be `history`, `entries`, or `filtered`). Use whatever `PrepWeakPoints` is given.

- [ ] **Step 6: Run the test + type-check**

Run: `npx vitest run tests/components/VerbWeakPoints.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/charts/VerbWeakPoints.vue src/modules/history/HistoryPage.vue tests/components/VerbWeakPoints.test.ts
git commit -m "feat(history): verb weak-points panel"
```

---

# PART 7 — Full verification

### Task 19: Whole-suite + build + manual smoke

- [ ] **Step 1: Run the entire test suite**

Run: `npm test`
Expected: PASS (all files, including the untouched prep suite — confirms the `HintKind` widening and shared-core extraction didn't regress prep).

- [ ] **Step 2: Production type-check + build**

Run: `npm run build`
Expected: PASS (`vue-tsc --noEmit` clean, Vite build succeeds).

- [ ] **Step 3: Manual end-to-end** (dev server, AI configured)

Run: `npm run dev`. Verify in order:
1. Verbs → Sentence quiz: opens on the first sentence; later sentences stream in; "preparing next…" appears only if you race ahead.
2. Highlights: verb → infinitive; theme noun → article+noun; incidental noun → AI German. Toggle off → no highlights.
3. Variety: run twice with the same filters; sentences differ.
4. AI grades each answer with a tip; offline fallback toast if the grader is unreachable.
5. Retry-wrong; finishing saves a `verb-sentence` run; History shows it + the Verb weak-points panel.
6. Practise weak verbs runs a `verb-remedial` drill weighted to your misses.
7. Pagination: set History to 100, leave and return → still 100; a different list page keeps its own size.

- [ ] **Step 4: Final commit (if any docs/touch-ups)**

```bash
git add -A
git commit -m "chore(verbs): verb sentence quiz — final verification pass"
```

---

## Self-Review (completed by plan author)

**Spec coverage:**
- New verb sentence quiz like prep → Tasks 5–10, 15, 16. ✓
- Verb pool by level/type/case + noun theme → Task 15. ✓
- 1–2 verbs + 1–2 nouns, two dials → Task 5 (`buildVerbSpecs`), Task 15 (controls). ✓
- EN→DE, AI grades → Task 10 (`gradeVerbAnswer`), Task 16. ✓
- Highlight verbs + ALL nouns, AI German for incidentals, toggle → Tasks 6/7 (schema/extras), 9 (hint inputs), 16 (render + toggle), ADR-0003. ✓
- Better randomizer (variety) → Task 6 (angle pool + seed) + Task 8 (fresh per attempt). ✓
- Faster (progressive) → Tasks 3, 4, 16, ADR-0004. ✓
- History of verbs done + weak points → Tasks 11, 13, 16 (per-item save), 18 (chart). ✓
- Make tests from most-wrong → Tasks 11/12 (weak keys/pool), 17 (remedial). ✓
- Persist pagination on all pages → Tasks 1, 2. ✓

**Placeholder scan:** No TBD/TODO left in logic steps (the only `TODO` is the deliberate stub SFC in Task 14, replaced in Tasks 15–17). All code steps include full code.

**Type consistency:** `VerbRef`, `VerbSentenceSpec`, `GeneratedVerbSentence`, `ExtraWord`, `WordsPer`, `VerbErrorTag`, `VerbDrillItem`, `VerbSentenceVerdict` defined once (Tasks 5/13) and used consistently. `verbToRef`, `buildVerbSpecs`, `buildVerbGeneratePrompt`, `validateVerbSentencePair`, `generateVerbSentenceBatch`, `buildVerbHintInputs`, `gradeVerbAnswer`, `buildVerbDrillItem`, `computeVerbWeakPoints`, `weakKeysForRemedial`, `selectRemedialPool`, `planBatches`, `generateProgressively` — names match across tasks. Stash shape (`specs/runType/level/wordHints/meta`) identical in Tasks 15, 16, 17. `STASH_KEY = 'gt:lastVerbSentenceQuiz'` consistent.

**Execution order reminder:** 13 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 14 → 15 → 16 → 17 → 18 → 19. (Task 13 first because the composables import its types; Tasks 1–2 can ship anytime.)
