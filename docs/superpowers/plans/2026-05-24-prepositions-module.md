# Prepositions Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/prepositions` module that teaches the German preposition system through three focused drills (which-case multiple choice, article fill-in, two-way decision) backed by a curated dataset of 37 prepositions across A1–B2.

**Architecture:** A TypeScript module ships the read-only dataset (mirroring `src/data/verbs.ts`). Two composables handle sampling/filtering and quiz acceptance. Three setup + runner pairs reuse the existing test-sheet and single-card patterns. The module integrates with the existing quiz history, stats dashboard, setup-memory, and data-backup composables — no schema changes; just new union-typed values.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, vue-router, vitest. Same patterns as the Verbs module already in the repo.

---

## File structure

**Created:**
- `src/data/prepositions.ts` — schema, level/case constants, curated `PREPOSITIONS` array
- `src/composables/usePrepositions.ts` — sample + filter helpers
- `src/composables/usePrepositionQuiz.ts` — acceptance + quiz state helpers
- `src/modules/prepositions/PrepositionsHome.vue` — 4-card landing
- `src/modules/prepositions/ListPrepositions.vue` — searchable browse table
- `src/modules/prepositions/CaseQuizSetup.vue` — filters for which-case drill
- `src/modules/prepositions/CaseQuizRunner.vue` — test-sheet, segmented 4-case picker per row
- `src/modules/prepositions/CaseQuizResult.vue` — recap with per-prep grading
- `src/modules/prepositions/ArticleQuizSetup.vue` — filters for article-fill
- `src/modules/prepositions/ArticleQuizRunner.vue` — single-card per sentence, text input
- `src/modules/prepositions/TwoWayQuizSetup.vue` — filters for two-way drill
- `src/modules/prepositions/TwoWayQuizRunner.vue` — single-card, two big buttons (Akk/Dat)
- `tests/data/prepositions.test.ts` — data integrity
- `tests/composables/usePrepositionQuiz.test.ts` — acceptance

**Modified:**
- `src/router.ts` — 9 new routes
- `src/components/NavShell.vue` — add "Prepositions" between Verbs and History
- `src/composables/useQuizHistory.ts` — extend `QuizHistoryType` with 3 new values
- `src/components/charts/quiz-type-labels.ts` — label/de map entries + order
- `src/modules/history/HistoryPage.vue` — `QUIZ_TYPES` entries
- `src/composables/useUserData.ts` — 3 new keys in `USER_DATA_KEYS` + `KEY_LABELS`
- `tests/composables/useUserData.test.ts` — assert new keys appear in the export summary

---

## Curated dataset

Total **37 prepositions**, deliberately small enough to ship in one curation pass:

**Accusative (8):** `durch · für · gegen · ohne · um · bis · entlang · wider`
**Dative (10):** `aus · bei · mit · nach · seit · von · zu · gegenüber · außer · ab`
**Two-way / Wechselpräpositionen (9):** `an · auf · hinter · in · neben · über · unter · vor · zwischen`
**Genitive (10):** `während · trotz · wegen · (an)statt · innerhalb · außerhalb · aufgrund · dank · mithilfe · laut`

Each preposition gets **2–3 example sentences**. The most common A1 ones (`mit`, `in`, `für`, `auf`, `zu`) get 3 examples; rarer B2 ones (`wider`, `mithilfe`, `mithilfe`) get 2. Total ≈ 90 example sentences across the dataset.

---

## Tasks

### Task 1: Schema + curated dataset

**Files:**
- Create: `src/data/prepositions.ts`

The dataset file is the foundation everything else builds on. Get the types right first; the engineer will then populate ~90 example sentences mechanically.

- [ ] **Step 1: Write the type definitions and constants**

```ts
// src/data/prepositions.ts

export type PrepCase = 'accusative' | 'dative' | 'genitive' | 'two-way'
export type PrepLevel = 'A1' | 'A2' | 'B1' | 'B2'

/** The case actually used in a specific example sentence (resolves two-way). */
export type UsedCase = 'accusative' | 'dative' | 'genitive'

export interface PrepositionExample {
  /** Full sentence with the inflected article in place. */
  sentence: string
  /** Same sentence with the article replaced by '___'. */
  blanked: string
  /** The article the learner must produce (e.g. "dem", "den", "die", "ihren"). */
  expectedAnswer: string
  /** Additional acceptable forms — rare, usually omitted. */
  alternatives?: string[]
  /** Resolves which case this specific example uses (esp. for two-way preps). */
  usedCase: UsedCase
  /** English gloss shown after submit + as the hint in article-fill mode. */
  gloss: string
}

export interface Preposition {
  /** Lower-case kebab id, e.g. "mit", "anstatt". Used as key in storage + tests. */
  id: string
  /** Surface form shown to learners. */
  german: string
  /** English gloss for browse table + tooltips. */
  english: string
  case: PrepCase
  level: PrepLevel
  examples: PrepositionExample[]
}

export const PREPOSITION_CASES = ['accusative', 'dative', 'genitive', 'two-way'] as const
export const PREPOSITION_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const

/** Two-way prepositions in a Set for fast lookup. */
export const TWO_WAY_PREPS = new Set([
  'an', 'auf', 'hinter', 'in', 'neben', 'über', 'unter', 'vor', 'zwischen'
])
```

- [ ] **Step 2: Populate the `PREPOSITIONS` array — accusative section**

```ts
export const PREPOSITIONS: Preposition[] = [
  // ─── Accusative (8) ───────────────────────────────────────────
  {
    id: 'durch', german: 'durch', english: 'through', case: 'accusative', level: 'A1',
    examples: [
      {
        sentence: 'Wir gehen durch den Park.',
        blanked: 'Wir gehen durch ___ Park.',
        expectedAnswer: 'den',
        usedCase: 'accusative',
        gloss: 'We go through the park.'
      },
      {
        sentence: 'Sie fährt durch die Stadt.',
        blanked: 'Sie fährt durch ___ Stadt.',
        expectedAnswer: 'die',
        usedCase: 'accusative',
        gloss: 'She drives through the city.'
      }
    ]
  },
  {
    id: 'fuer', german: 'für', english: 'for', case: 'accusative', level: 'A1',
    examples: [
      {
        sentence: 'Das Geschenk ist für den Lehrer.',
        blanked: 'Das Geschenk ist für ___ Lehrer.',
        expectedAnswer: 'den',
        usedCase: 'accusative',
        gloss: 'The gift is for the teacher.'
      },
      {
        sentence: 'Ich kaufe Blumen für meine Mutter.',
        blanked: 'Ich kaufe Blumen für ___ Mutter.',
        expectedAnswer: 'meine',
        usedCase: 'accusative',
        gloss: 'I buy flowers for my mother.'
      },
      {
        sentence: 'Das ist ein Buch für das Kind.',
        blanked: 'Das ist ein Buch für ___ Kind.',
        expectedAnswer: 'das',
        usedCase: 'accusative',
        gloss: 'That is a book for the child.'
      }
    ]
  },
  {
    id: 'gegen', german: 'gegen', english: 'against', case: 'accusative', level: 'A1',
    examples: [
      {
        sentence: 'Wir spielen gegen die andere Mannschaft.',
        blanked: 'Wir spielen gegen ___ andere Mannschaft.',
        expectedAnswer: 'die',
        usedCase: 'accusative',
        gloss: 'We play against the other team.'
      },
      {
        sentence: 'Er fährt gegen einen Baum.',
        blanked: 'Er fährt gegen ___ Baum.',
        expectedAnswer: 'einen',
        usedCase: 'accusative',
        gloss: 'He crashes into a tree.'
      }
    ]
  },
  {
    id: 'ohne', german: 'ohne', english: 'without', case: 'accusative', level: 'A1',
    examples: [
      {
        sentence: 'Ich komme ohne meinen Bruder.',
        blanked: 'Ich komme ohne ___ Bruder.',
        expectedAnswer: 'meinen',
        usedCase: 'accusative',
        gloss: 'I come without my brother.'
      },
      {
        sentence: 'Sie reist ohne den Koffer.',
        blanked: 'Sie reist ohne ___ Koffer.',
        expectedAnswer: 'den',
        usedCase: 'accusative',
        gloss: 'She travels without the suitcase.'
      }
    ]
  },
  {
    id: 'um', german: 'um', english: 'around / at (time)', case: 'accusative', level: 'A1',
    examples: [
      {
        sentence: 'Wir gehen um den See.',
        blanked: 'Wir gehen um ___ See.',
        expectedAnswer: 'den',
        usedCase: 'accusative',
        gloss: 'We walk around the lake.'
      },
      {
        sentence: 'Sie sitzen um den Tisch.',
        blanked: 'Sie sitzen um ___ Tisch.',
        expectedAnswer: 'den',
        usedCase: 'accusative',
        gloss: 'They sit around the table.'
      }
    ]
  },
  {
    id: 'bis', german: 'bis', english: 'until / up to', case: 'accusative', level: 'A1',
    examples: [
      {
        sentence: 'Er bleibt bis nächsten Montag.',
        blanked: 'Er bleibt bis ___ Montag.',
        expectedAnswer: 'nächsten',
        usedCase: 'accusative',
        gloss: 'He stays until next Monday.'
      },
      {
        sentence: 'Ich warte bis den Abend.',
        blanked: 'Ich warte bis ___ Abend.',
        expectedAnswer: 'den',
        usedCase: 'accusative',
        gloss: 'I wait until evening.'
      }
    ]
  },
  {
    id: 'entlang', german: 'entlang', english: 'along', case: 'accusative', level: 'A2',
    examples: [
      {
        sentence: 'Sie laufen den Fluss entlang.',
        blanked: 'Sie laufen ___ Fluss entlang.',
        expectedAnswer: 'den',
        usedCase: 'accusative',
        gloss: 'They walk along the river.'
      },
      {
        sentence: 'Wir fahren die Straße entlang.',
        blanked: 'Wir fahren ___ Straße entlang.',
        expectedAnswer: 'die',
        usedCase: 'accusative',
        gloss: 'We drive along the street.'
      }
    ]
  },
  {
    id: 'wider', german: 'wider', english: 'against / contrary to', case: 'accusative', level: 'B2',
    examples: [
      {
        sentence: 'Er handelt wider den Willen seines Vaters.',
        blanked: 'Er handelt wider ___ Willen seines Vaters.',
        expectedAnswer: 'den',
        usedCase: 'accusative',
        gloss: 'He acts against his father\'s will.'
      },
      {
        sentence: 'Das ist wider die Vernunft.',
        blanked: 'Das ist wider ___ Vernunft.',
        expectedAnswer: 'die',
        usedCase: 'accusative',
        gloss: 'That is against reason.'
      }
    ]
  },
  // ─── Dative (10) — populate following the same shape ─────────
  // ─── Two-way (9)  — populate following the same shape ─────────
  // ─── Genitive (10) — populate following the same shape ─────────
]
```

- [ ] **Step 3: Populate dative + two-way + genitive sections**

For each remaining preposition, follow the **exact same shape** as the accusative examples. Reference grammar:

- **Dative** (`aus, bei, mit, nach, seit, von, zu, gegenüber, außer, ab`): articles use dative forms — `dem` (m/n), `der` (f), `den ...n` (plural)
- **Two-way** (`an, auf, hinter, in, neben, über, unter, vor, zwischen`): each preposition needs **at least one accusative and one dative example** — accusative when there's motion toward a destination ("Wohin?"), dative when describing a location ("Wo?"). For example, `auf den Tisch` (acc, motion onto) vs `auf dem Tisch` (dat, located on).
- **Genitive** (`während, trotz, wegen, (an)statt, innerhalb, außerhalb, aufgrund, dank, mithilfe, laut`): articles `des ...s` (m/n), `der` (f/plural)

Each example must have `expectedAnswer` exactly matching the article (and any noun-suffix changes embedded in the blanked sentence). When the answer is two words (e.g. `meines Vaters`), put both into `expectedAnswer`.

Aim for **2 examples for B2 preps, 3 examples for A1–B1 preps**.

- [ ] **Step 4: Commit**

```bash
git add src/data/prepositions.ts
git commit -m "feat(prepositions): schema + curated dataset (37 preps, ~90 examples)"
```

---

### Task 2: Data integrity tests

**Files:**
- Create: `tests/data/prepositions.test.ts`

Catch curation mistakes (duplicate ids, blanked sentence missing `___`, expectedAnswer not present in the original sentence, etc.) before they reach users.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/data/prepositions.test.ts
import { describe, test, expect } from 'vitest'
import {
  PREPOSITIONS,
  PREPOSITION_CASES,
  PREPOSITION_LEVELS,
  TWO_WAY_PREPS
} from '../../src/data/prepositions'

describe('prepositions dataset', () => {
  test('no duplicate ids', () => {
    const ids = PREPOSITIONS.map(p => p.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  test('every preposition has ≥1 example', () => {
    const empty = PREPOSITIONS.filter(p => p.examples.length === 0)
    expect(empty).toEqual([])
  })

  test('every example has a "___" placeholder', () => {
    const offenders: string[] = []
    for (const p of PREPOSITIONS) {
      for (const e of p.examples) {
        if (!e.blanked.includes('___')) offenders.push(`${p.id}: ${e.blanked}`)
      }
    }
    expect(offenders).toEqual([])
  })

  test('every example.expectedAnswer appears verbatim in example.sentence', () => {
    const offenders: string[] = []
    for (const p of PREPOSITIONS) {
      for (const e of p.examples) {
        if (!e.sentence.includes(e.expectedAnswer)) {
          offenders.push(`${p.id}: "${e.expectedAnswer}" not in "${e.sentence}"`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  test('every example.usedCase is one of acc/dat/gen', () => {
    const offenders: string[] = []
    for (const p of PREPOSITIONS) {
      for (const e of p.examples) {
        if (!['accusative', 'dative', 'genitive'].includes(e.usedCase)) {
          offenders.push(`${p.id}: usedCase = ${e.usedCase}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  test('non-two-way prepositions only use their declared case', () => {
    const offenders: string[] = []
    for (const p of PREPOSITIONS) {
      if (p.case === 'two-way') continue
      for (const e of p.examples) {
        if (e.usedCase !== p.case) {
          offenders.push(`${p.id} (${p.case}): example uses ${e.usedCase}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  test('two-way prepositions show ≥1 accusative and ≥1 dative example', () => {
    const offenders: string[] = []
    for (const p of PREPOSITIONS) {
      if (p.case !== 'two-way') continue
      const hasAcc = p.examples.some(e => e.usedCase === 'accusative')
      const hasDat = p.examples.some(e => e.usedCase === 'dative')
      if (!hasAcc) offenders.push(`${p.id}: no accusative example`)
      if (!hasDat) offenders.push(`${p.id}: no dative example`)
    }
    expect(offenders).toEqual([])
  })

  test('TWO_WAY_PREPS set matches the dataset', () => {
    const datasetTwoWay = new Set(PREPOSITIONS.filter(p => p.case === 'two-way').map(p => p.id))
    expect(datasetTwoWay).toEqual(TWO_WAY_PREPS)
  })

  test('every preposition has a valid case + level', () => {
    const validCases = new Set<string>(PREPOSITION_CASES)
    const validLevels = new Set<string>(PREPOSITION_LEVELS)
    for (const p of PREPOSITIONS) {
      expect(validCases.has(p.case), `${p.id}: bad case ${p.case}`).toBe(true)
      expect(validLevels.has(p.level), `${p.id}: bad level ${p.level}`).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/data/prepositions.test.ts`
Expected: all green (if any fail, fix the dataset before moving on).

- [ ] **Step 3: Commit**

```bash
git add tests/data/prepositions.test.ts
git commit -m "test(prepositions): data integrity"
```

---

### Task 3: usePrepositions composable

**Files:**
- Create: `src/composables/usePrepositions.ts`

Sampling helpers mirroring `useVerbs`. Pure functions over the imported dataset — no reactive state.

- [ ] **Step 1: Implement**

```ts
// src/composables/usePrepositions.ts
import {
  PREPOSITIONS,
  type Preposition,
  type PrepCase,
  type PrepLevel,
  type PrepositionExample,
  TWO_WAY_PREPS
} from '../data/prepositions'

export interface PrepFilter {
  levels?: PrepLevel[]
  cases?: PrepCase[]
}

export function filterPrepositions(f: PrepFilter = {}): Preposition[] {
  const levels = f.levels && f.levels.length > 0 ? new Set(f.levels) : null
  const cases = f.cases && f.cases.length > 0 ? new Set(f.cases) : null
  return PREPOSITIONS.filter(p => {
    if (levels && !levels.has(p.level)) return false
    if (cases && !cases.has(p.case)) return false
    return true
  })
}

/** Sample N prepositions matching a filter, without replacement, fresh shuffle each call. */
export function samplePrepositions(count: number, f: PrepFilter = {}): Preposition[] {
  const pool = filterPrepositions(f)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/** Flatten all examples whose parent preposition matches the filter. */
export function filterExamples(f: PrepFilter = {}): Array<{
  prep: Preposition
  example: PrepositionExample
}> {
  return filterPrepositions(f).flatMap(prep =>
    prep.examples.map(example => ({ prep, example }))
  )
}

/** Sample N examples for the article-fill drill. */
export function sampleExamples(
  count: number,
  f: PrepFilter = {}
): Array<{ prep: Preposition; example: PrepositionExample }> {
  const pool = filterExamples(f)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/** Sample N examples that use a two-way preposition, for the two-way decision drill. */
export function sampleTwoWayExamples(
  count: number
): Array<{ prep: Preposition; example: PrepositionExample }> {
  const pool = PREPOSITIONS
    .filter(p => p.case === 'two-way')
    .flatMap(prep => prep.examples.map(example => ({ prep, example })))
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function usePrepositions() {
  return {
    all: PREPOSITIONS,
    filter: filterPrepositions,
    sample: samplePrepositions,
    sampleExamples,
    sampleTwoWayExamples,
    TWO_WAY_PREPS
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/composables/usePrepositions.ts
git commit -m "feat(prepositions): usePrepositions sampling + filter helpers"
```

---

### Task 4: usePrepositionQuiz composable + tests

**Files:**
- Create: `src/composables/usePrepositionQuiz.ts`
- Create: `tests/composables/usePrepositionQuiz.test.ts`

Acceptance logic — pure functions. TDD because the rules have edge cases (case-insensitive, multi-word answers like "meines Vaters", optional alternatives).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/composables/usePrepositionQuiz.test.ts
import { describe, test, expect } from 'vitest'
import { checkArticle } from '../../src/composables/usePrepositionQuiz'

describe('checkArticle', () => {
  test('exact match accepts', () => {
    expect(checkArticle('dem', 'dem', [])).toBe(true)
  })

  test('case-insensitive', () => {
    expect(checkArticle('DEM', 'dem', [])).toBe(true)
    expect(checkArticle('Dem', 'dem', [])).toBe(true)
  })

  test('trims and collapses inner whitespace', () => {
    expect(checkArticle('  dem  ', 'dem', [])).toBe(true)
    expect(checkArticle('meines   Vaters', 'meines Vaters', [])).toBe(true)
  })

  test('rejects empty input', () => {
    expect(checkArticle('', 'dem', [])).toBe(false)
    expect(checkArticle('   ', 'dem', [])).toBe(false)
  })

  test('rejects wrong article', () => {
    expect(checkArticle('den', 'dem', [])).toBe(false)
  })

  test('accepts a listed alternative', () => {
    expect(checkArticle('einer', 'der', ['einer'])).toBe(true)
  })

  test('alternatives are also case + whitespace tolerant', () => {
    expect(checkArticle(' EINER ', 'der', ['einer'])).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/composables/usePrepositionQuiz.test.ts`
Expected: FAIL with "module not found" or similar.

- [ ] **Step 3: Implement**

```ts
// src/composables/usePrepositionQuiz.ts
import { computed, ref } from 'vue'
import type { Preposition, PrepositionExample, PrepCase } from '../data/prepositions'

// ── Article-fill acceptance ───────────────────────────────────

function normalizeArticle(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function checkArticle(input: string, expected: string, alternatives: string[]): boolean {
  const a = normalizeArticle(input)
  if (a.length === 0) return false
  if (normalizeArticle(expected) === a) return true
  return alternatives.some(alt => normalizeArticle(alt) === a)
}

// ── Which-case acceptance ─────────────────────────────────────

export function checkCase(picked: PrepCase | null, expected: PrepCase): boolean {
  return picked === expected
}

// ── Two-way decision acceptance ───────────────────────────────

export type TwoWayPick = 'accusative' | 'dative'

export function checkTwoWay(picked: TwoWayPick | null, usedCase: 'accusative' | 'dative' | 'genitive'): boolean {
  if (picked === null) return false
  // Two-way preps only ever use acc or dat in our dataset; guard anyway.
  if (usedCase === 'genitive') return false
  return picked === usedCase
}

// ── Quiz state holders (mirrors useVerbQuiz patterns) ─────────

export interface CaseQuestion {
  prep: Preposition
  picked: PrepCase | null
  isCorrect: boolean | null
}

export function useCaseQuiz(preps: Preposition[]) {
  const questions = ref<CaseQuestion[]>(preps.map(p => ({ prep: p, picked: null, isCorrect: null })))

  function pick(i: number, value: PrepCase) {
    const q = questions.value[i]
    if (!q) return
    q.picked = value
  }

  function grade() {
    for (const q of questions.value) {
      q.isCorrect = checkCase(q.picked, q.prep.case)
    }
  }

  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  return { questions, pick, grade, score, total }
}

export interface ArticleQuestion {
  prep: Preposition
  example: PrepositionExample
  userAnswer: string
  isCorrect: boolean | null
}

export function useArticleQuiz(pairs: Array<{ prep: Preposition; example: PrepositionExample }>) {
  const questions = ref<ArticleQuestion[]>(
    pairs.map(p => ({ prep: p.prep, example: p.example, userAnswer: '', isCorrect: null }))
  )
  const currentIndex = ref(0)

  function submit(answer: string) {
    const q = questions.value[currentIndex.value]
    if (!q) return
    q.userAnswer = answer
    q.isCorrect = checkArticle(answer, q.example.expectedAnswer, q.example.alternatives ?? [])
  }

  function advance() {
    currentIndex.value += 1
  }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  return { questions, currentIndex, current, finished, submit, advance, score, total }
}

export interface TwoWayQuestion {
  prep: Preposition
  example: PrepositionExample
  picked: TwoWayPick | null
  isCorrect: boolean | null
}

export function useTwoWayQuiz(pairs: Array<{ prep: Preposition; example: PrepositionExample }>) {
  const questions = ref<TwoWayQuestion[]>(
    pairs.map(p => ({ prep: p.prep, example: p.example, picked: null, isCorrect: null }))
  )
  const currentIndex = ref(0)

  function pick(value: TwoWayPick) {
    const q = questions.value[currentIndex.value]
    if (!q) return
    q.picked = value
    q.isCorrect = checkTwoWay(value, q.example.usedCase)
  }

  function advance() {
    currentIndex.value += 1
  }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  return { questions, currentIndex, current, finished, pick, advance, score, total }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/composables/usePrepositionQuiz.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/composables/usePrepositionQuiz.ts tests/composables/usePrepositionQuiz.test.ts
git commit -m "feat(prepositions): usePrepositionQuiz acceptance + state holders"
```

---

### Task 5: Router + Nav + History wiring

**Files:**
- Modify: `src/router.ts`
- Modify: `src/components/NavShell.vue`
- Modify: `src/composables/useQuizHistory.ts`
- Modify: `src/components/charts/quiz-type-labels.ts`
- Modify: `src/modules/history/HistoryPage.vue`
- Modify: `src/composables/useUserData.ts`
- Modify: `tests/composables/useUserData.test.ts`

Wire up the new module's shell so subsequent component tasks have a working route + history integration. Do this before the components themselves so each runner commit is verifiable end-to-end.

- [ ] **Step 1: Add routes**

In `src/router.ts`, add these entries inside the `routes` array (place them between the verbs cheatsheet route and the existing history/settings entries — wherever the verbs section ends):

```ts
{ path: '/prepositions', name: 'prepositions', component: () => import('./modules/prepositions/PrepositionsHome.vue') },
{ path: '/prepositions/list', name: 'prepositions-list', component: () => import('./modules/prepositions/ListPrepositions.vue') },
{ path: '/prepositions/case-quiz', name: 'prepositions-case', component: () => import('./modules/prepositions/CaseQuizSetup.vue') },
{ path: '/prepositions/case-quiz/run', name: 'prepositions-case-run', component: () => import('./modules/prepositions/CaseQuizRunner.vue') },
{ path: '/prepositions/case-quiz/result', name: 'prepositions-case-result', component: () => import('./modules/prepositions/CaseQuizResult.vue') },
{ path: '/prepositions/article-quiz', name: 'prepositions-article', component: () => import('./modules/prepositions/ArticleQuizSetup.vue') },
{ path: '/prepositions/article-quiz/run', name: 'prepositions-article-run', component: () => import('./modules/prepositions/ArticleQuizRunner.vue') },
{ path: '/prepositions/two-way-quiz', name: 'prepositions-twoway', component: () => import('./modules/prepositions/TwoWayQuizSetup.vue') },
{ path: '/prepositions/two-way-quiz/run', name: 'prepositions-twoway-run', component: () => import('./modules/prepositions/TwoWayQuizRunner.vue') }
```

- [ ] **Step 2: Add Prepositions to NavShell**

In `src/components/NavShell.vue`, find the `items` array. After the `verbs` entry and before `history`, add:

```ts
{ route: 'prepositions', label: 'Prepositions', de: 'Präpositionen' },
```

- [ ] **Step 3: Extend QuizHistoryType + Meta**

In `src/composables/useQuizHistory.ts`, change the `QuizHistoryType` union:

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
```

In the same file, extend `QuizHistoryMeta` to allow preposition-specific filter metadata:

```ts
export interface QuizHistoryMeta {
  mode?: 'gender' | 'translation'
  groups?: string[]
  levels?: string[]
  types?: string[]
  cases?: string[]
  tenses?: string[]
  prepLevels?: string[]
  prepCases?: string[]
}
```

- [ ] **Step 4: Add labels for the new types**

In `src/components/charts/quiz-type-labels.ts`, extend both records and the order array. Replace the file contents:

```ts
import type { QuizHistoryType } from '../../composables/useQuizHistory'

export const QUIZ_TYPE_LABEL: Record<QuizHistoryType, string> = {
  'noun-gender': 'Noun gender',
  'noun-translation': 'Noun translation',
  adjective: 'Adjective',
  'verb-translation': 'Verb translation',
  'verb-conjugation': 'Verb conjugation',
  'prep-case': 'Preposition · case',
  'prep-article': 'Preposition · article',
  'prep-two-way': 'Preposition · two-way'
}

export const QUIZ_TYPE_DE: Record<QuizHistoryType, string> = {
  'noun-gender': 'Genus',
  'noun-translation': 'Substantive',
  adjective: 'Adjektive',
  'verb-translation': 'Übersetzen',
  'verb-conjugation': 'Konjugation',
  'prep-case': 'Präposition · Kasus',
  'prep-article': 'Präposition · Artikel',
  'prep-two-way': 'Präposition · Wechsel'
}

export const QUIZ_TYPES_ORDER: QuizHistoryType[] = [
  'noun-gender',
  'noun-translation',
  'adjective',
  'verb-translation',
  'verb-conjugation',
  'prep-case',
  'prep-article',
  'prep-two-way'
]
```

- [ ] **Step 5: Extend HistoryPage QUIZ_TYPES map**

In `src/modules/history/HistoryPage.vue`, find the `QUIZ_TYPES` object literal and add three entries:

```ts
const QUIZ_TYPES: Record<QuizHistoryType, TypeMeta> = {
  'noun-gender':      { label: 'Noun gender',        de: 'Substantiv · der/die/das', module: 'Nouns' },
  'noun-translation': { label: 'Noun translation',   de: 'Substantiv · Übersetzung', module: 'Nouns' },
  'adjective':        { label: 'Adjective sentence', de: 'Adjektiv · Lückentext',    module: 'Adjectives' },
  'verb-translation': { label: 'Verb translation',   de: 'Verb · Übersetzung',       module: 'Verbs' },
  'verb-conjugation': { label: 'Verb conjugation',   de: 'Verb · Konjugation',       module: 'Verbs' },
  'prep-case':        { label: 'Preposition · case', de: 'Präposition · Kasus',      module: 'Prepositions' },
  'prep-article':     { label: 'Preposition · article', de: 'Präposition · Artikel', module: 'Prepositions' },
  'prep-two-way':     { label: 'Preposition · two-way', de: 'Präposition · Wechsel', module: 'Prepositions' }
}
```

In the same file, extend the `typeOrder` array:

```ts
const typeOrder: QuizHistoryType[] = [
  'noun-gender', 'noun-translation', 'adjective',
  'verb-translation', 'verb-conjugation',
  'prep-case', 'prep-article', 'prep-two-way'
]
```

- [ ] **Step 6: Add the 3 new setup keys to useUserData**

In `src/composables/useUserData.ts`, extend `USER_DATA_KEYS` (add inside the "quiz setup memory" group, before the legacy entries):

```ts
export const USER_DATA_KEYS = [
  'theme',
  'gt:testVerbSize',
  'gt:nounPromptSize',
  'gt:adjectivePromptSize',
  'gt:palette',
  'nounQuizSetup',
  'adjectiveQuizSetup',
  'verbTransSetup',
  'verbConjQuiz',
  'prepCaseSetup',
  'prepArticleSetup',
  'prepTwoWaySetup',
  // legacy keys (kept readable for migration)
  'nounQuizGroups',
  'adjectiveQuizGroups',
  // history
  'gt:quizHistory'
] as const
```

In the same file, extend `KEY_LABELS`:

```ts
const KEY_LABELS: Record<UserDataKey, { label: string; group: string }> = {
  // … existing entries unchanged …
  prepCaseSetup: { label: 'Preposition case quiz setup', group: 'Quiz setup' },
  prepArticleSetup: { label: 'Preposition article quiz setup', group: 'Quiz setup' },
  prepTwoWaySetup: { label: 'Preposition two-way quiz setup', group: 'Quiz setup' }
  // … rest unchanged …
}
```

- [ ] **Step 7: Add assertions to userdata tests**

In `tests/composables/useUserData.test.ts`, add a new test block at the bottom of the `describe('buildExport')` block:

```ts
  test('preposition setup keys are recognized', () => {
    localStorage.setItem('prepCaseSetup', JSON.stringify({ levels: ['A1'], count: 10 }))
    localStorage.setItem('prepArticleSetup', JSON.stringify({ levels: ['A1'], count: 10 }))
    localStorage.setItem('prepTwoWaySetup', JSON.stringify({ count: 5 }))
    const out = buildExport()
    expect(out.data['prepCaseSetup']).toEqual({ levels: ['A1'], count: 10 })
    expect(out.data['prepArticleSetup']).toEqual({ levels: ['A1'], count: 10 })
    expect(out.data['prepTwoWaySetup']).toEqual({ count: 5 })
  })
```

- [ ] **Step 8: Verify typecheck + tests**

Run: `npm run typecheck`
Expected: clean.

Run: `npx vitest run tests/composables/useUserData.test.ts`
Expected: 8 tests (7 existing + 1 new) all green.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(prepositions): router + nav + history + userdata wiring"
```

---

### Task 6: PrepositionsHome — landing

**Files:**
- Create: `src/modules/prepositions/PrepositionsHome.vue`

Mirrors `VerbsHome.vue` — a 4-card module grid. Browse · Which case · Article fill · Two-way decision.

- [ ] **Step 1: Implement**

```vue
<!-- src/modules/prepositions/PrepositionsHome.vue -->
<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

interface Card {
  numeral: string
  route: string
  title: string
  de: string
  desc: string
  cta: string
}

const cards: Card[] = [
  {
    numeral: 'A', route: 'prepositions-list',
    title: 'Browse prepositions', de: 'Liste',
    desc: 'Searchable list of 37 prepositions with their case, examples, and CEFR level.',
    cta: 'Open'
  },
  {
    numeral: 'B', route: 'prepositions-case',
    title: 'Which case?', de: 'Kasus',
    desc: 'For each preposition, pick the case it governs — accusative, dative, genitive, or two-way.',
    cta: 'Start'
  },
  {
    numeral: 'C', route: 'prepositions-article',
    title: 'Article fill', de: 'Artikel einsetzen',
    desc: 'Fill in the article in a real sentence. Tests the case rule in context.',
    cta: 'Start'
  },
  {
    numeral: 'D', route: 'prepositions-twoway',
    title: 'Two-way decision', de: 'Wechsel · Akk. oder Dat.',
    desc: 'For the nine Wechselpräpositionen, decide whether the sentence uses accusative or dative.',
    cta: 'Start'
  }
]
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel IV · Präpositionen</div>
        <h1 class="section-title">Prepositions<em>.</em></h1>
        <p class="section-subtitle">
          German prepositions govern case — and the case is the difference between
          <em>auf dem Tisch</em> (on the table) and <em>auf den Tisch</em> (onto the table).
          Three focused drills, one rule each.
        </p>
      </div>
    </header>

    <div class="module-grid">
      <article
        v-for="c in cards"
        :key="c.route"
        class="card module-card interactive"
        role="button"
        tabindex="0"
        @click="router.push({ name: c.route })"
        @keydown.enter="router.push({ name: c.route })"
      >
        <div class="module-numeral">{{ c.numeral }}</div>
        <h2>{{ c.title }}</h2>
        <div class="module-de">{{ c.de }}</div>
        <p class="module-desc">{{ c.desc }}</p>
        <div class="module-cta">{{ c.cta }} <span aria-hidden="true">→</span></div>
      </article>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Visual smoke check**

Run: `npm run dev`
Navigate to `/prepositions` in browser. Verify 4 cards render, accent numerals visible, hover lift works, click navigates (even though target pages don't exist yet — error is OK).

- [ ] **Step 3: Commit**

```bash
git add src/modules/prepositions/PrepositionsHome.vue
git commit -m "feat(prepositions): home landing — 4-card module grid"
```

---

### Task 7: ListPrepositions — searchable browse table

**Files:**
- Create: `src/modules/prepositions/ListPrepositions.vue`

Mirrors `ListVerbs.vue`. Search across `german`, `english`, `case`, `level`. Show columns: preposition, English, case, level, examples (first sentence inline).

- [ ] **Step 1: Implement**

```vue
<!-- src/modules/prepositions/ListPrepositions.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PREPOSITIONS, type PrepCase } from '../../data/prepositions'

const router = useRouter()
const search = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return PREPOSITIONS
  return PREPOSITIONS.filter(p =>
    p.german.toLowerCase().includes(q) ||
    p.english.toLowerCase().includes(q) ||
    p.case.toLowerCase().includes(q) ||
    p.level.toLowerCase().includes(q)
  )
})

function caseTagClass(c: PrepCase): string {
  if (c === 'accusative') return 'tag-cobalt'
  if (c === 'dative') return 'tag-clay'
  if (c === 'genitive') return 'tag-ochre'
  if (c === 'two-way') return 'tag-accent'
  return ''
}

function back() { router.push({ name: 'prepositions' }) }
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel IV · Liste</div>
        <h1 class="section-title">Browse<em>.</em></h1>
        <p class="section-subtitle">
          All 37 prepositions with their governed case and example sentences.
        </p>
      </div>
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
    </header>

    <div class="toolbar">
      <input
        class="input search-input"
        placeholder="Search prepositions, English, case…"
        v-model="search"
      />
      <span class="micro-mark">{{ filtered.length }} of {{ PREPOSITIONS.length }}</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 14%">Preposition</th>
          <th style="width: 22%">English</th>
          <th style="width: 14%">Case</th>
          <th style="width: 8%">Level</th>
          <th style="width: 42%">First example</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in filtered" :key="p.id">
          <td>
            <span class="prep-word">{{ p.german }}</span>
          </td>
          <td class="prep-en">{{ p.english }}</td>
          <td>
            <span class="tag" :class="caseTagClass(p.case)">{{ p.case }}</span>
          </td>
          <td>
            <span class="tag">{{ p.level }}</span>
          </td>
          <td class="prep-example">
            <div class="prep-example-sentence">{{ p.examples[0]?.sentence }}</div>
            <div class="prep-example-gloss">{{ p.examples[0]?.gloss }}</div>
          </td>
        </tr>
        <tr v-if="filtered.length === 0">
          <td colspan="5" class="prep-empty">No prepositions match.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.prep-word {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 19px;
}
.prep-en {
  color: var(--ink-soft);
}
.prep-example-sentence {
  font-family: var(--font-display);
  font-size: 14px;
}
.prep-example-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 12px;
  color: var(--mute);
  margin-top: 2px;
}
.prep-empty {
  text-align: center;
  padding: 40px;
  color: var(--mute);
  font-style: italic;
}
</style>
```

- [ ] **Step 2: Visual smoke check**

`npm run dev`, navigate to `/prepositions/list`, verify rows render with correct tag colors (cobalt for acc, clay for dat, ochre for gen, accent for two-way). Try searching for "in" — should match the preposition + any English containing "in".

- [ ] **Step 3: Commit**

```bash
git add src/modules/prepositions/ListPrepositions.vue
git commit -m "feat(prepositions): browse list with search + case tags"
```

---

### Task 8: Which-case quiz — setup + runner + result

**Files:**
- Create: `src/modules/prepositions/CaseQuizSetup.vue`
- Create: `src/modules/prepositions/CaseQuizRunner.vue`
- Create: `src/modules/prepositions/CaseQuizResult.vue`

Test-sheet layout — show N prepositions, each row has a 4-button segmented control to pick the case. Submit-all grades the whole sheet at once.

- [ ] **Step 1: CaseQuizSetup.vue**

```vue
<!-- src/modules/prepositions/CaseQuizSetup.vue -->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { filterPrepositions } from '../../composables/usePrepositions'
import {
  PREPOSITION_LEVELS, PREPOSITION_CASES,
  type PrepLevel, type PrepCase
} from '../../data/prepositions'

const STORAGE_KEY = 'prepCaseSetup'
const router = useRouter()

const levels = ref<PrepLevel[]>([...PREPOSITION_LEVELS])
const cases  = ref<PrepCase[]>([...PREPOSITION_CASES])
type CountPreset = 10 | 15 | 20 | 'all' | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

interface Stored {
  levels?: PrepLevel[]
  cases?: PrepCase[]
  count?: CountPreset
  customCount?: number
}

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return null
    return p as Stored
  } catch { return null }
}
function saveStored(): void {
  try {
    const payload: Stored = {
      levels: [...levels.value],
      cases: [...cases.value],
      count: count.value,
      customCount: customCount.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(() => {
  const s = loadStored()
  if (!s) return
  if (Array.isArray(s.levels)) levels.value = s.levels.filter(l => (PREPOSITION_LEVELS as readonly string[]).includes(l))
  if (Array.isArray(s.cases)) cases.value = s.cases.filter(c => (PREPOSITION_CASES as readonly string[]).includes(c))
  if (s.count !== undefined) count.value = s.count
  if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
})
watch([levels, cases, count, customCount], saveStored, { deep: true })

const available = computed(() => filterPrepositions({ levels: levels.value, cases: cases.value }).length)
const effective = computed(() => {
  if (count.value === 'all') return available.value
  if (count.value === 'custom') return Math.min(customCount.value, available.value)
  return Math.min(count.value, available.value)
})

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v)
  if (i >= 0) return set.filter((_, j) => j !== i)
  return [...set, v]
}

function start() {
  if (available.value === 0) return
  router.push({
    name: 'prepositions-case-run',
    query: {
      count: String(effective.value),
      levels: levels.value.join(','),
      cases: cases.value.join(',')
    }
  })
}

function back() { router.push({ name: 'prepositions' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel IV · Kasus · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          Pick which CEFR levels and case-categories to drill, then how many prepositions to test.
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Level · {{ levels.length }} of {{ PREPOSITION_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...PREPOSITION_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="l in PREPOSITION_LEVELS" :key="l"
          class="chip"
          :class="{ selected: levels.includes(l) }"
          @click="levels = toggle(levels, l)"
        >{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Case category · {{ cases.length }} of {{ PREPOSITION_CASES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="cases = [...PREPOSITION_CASES]">All</button>
          <button class="btn btn-quiet" type="button" @click="cases = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="c in PREPOSITION_CASES" :key="c"
          class="chip"
          :class="{ selected: cases.includes(c) }"
          @click="cases = toggle(cases, c)"
        >{{ c }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of prepositions</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: count === 10 }" @click="count = 10">10</button>
          <button :class="{ active: count === 15 }" @click="count = 15">15</button>
          <button :class="{ active: count === 20 }" @click="count = 20">20</button>
          <button :class="{ active: count === 'all' }" @click="count = 'all'">All · {{ available }}</button>
          <button :class="{ active: count === 'custom' }" @click="count = 'custom'">Custom</button>
        </div>
        <input
          v-if="count === 'custom'"
          class="input custom-count"
          type="number"
          :min="1"
          :max="available || 1"
          v-model.number="customCount"
        />
        <span class="micro-mark count-avail">{{ available }} match</span>
      </div>
    </div>

    <div v-if="available === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      No prepositions match the selected filters.
    </div>

    <div class="alert alert-info">
      <span class="alert-label">How this drill works</span>
      For each preposition, pick the case it governs (accusative · dative · genitive · two-way). Submit all at once — feedback appears on the result screen.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button
        class="btn btn-accent"
        type="button"
        :disabled="available === 0"
        @click="start"
      >Start quiz · {{ effective }} prepositions <span aria-hidden="true">→</span></button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.field-row {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 10px; gap: 12px; flex-wrap: wrap;
}
.field-actions { display: flex; gap: 4px; }
.count-row { align-items: center; gap: 12px; }
.custom-count { width: 80px; font-size: 17px; padding: 4px 0; }
.count-avail { margin-left: auto; }
.setup-actions {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 40px; gap: 16px;
}
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
</style>
```

- [ ] **Step 2: CaseQuizRunner.vue**

```vue
<!-- src/modules/prepositions/CaseQuizRunner.vue -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { samplePrepositions } from '../../composables/usePrepositions'
import { useCaseQuiz } from '../../composables/usePrepositionQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import {
  PREPOSITION_LEVELS, PREPOSITION_CASES,
  type Preposition, type PrepLevel, type PrepCase
} from '../../data/prepositions'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
const deck = ref<Preposition[]>([])
const startedAt = ref<number>(0)
let quiz: ReturnType<typeof useCaseQuiz> | null = null

function csvFilter<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (typeof raw !== 'string' || raw.length === 0) return [...allowed]
  const set = new Set<string>(allowed)
  return raw.split(',').map(s => s.trim()).filter((x): x is T => set.has(x))
}

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const levels = csvFilter<PrepLevel>(route.query.levels, PREPOSITION_LEVELS)
  const cases  = csvFilter<PrepCase>(route.query.cases, PREPOSITION_CASES)
  try {
    const preps = samplePrepositions(count, { levels, cases })
    if (preps.length === 0) {
      error.value = 'No prepositions match the selected filters.'
    } else {
      deck.value = preps
      quiz = useCaseQuiz(preps)
      startedAt.value = Date.now()
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

const filledCount = computed(() => quiz?.questions.value.filter(q => q.picked !== null).length ?? 0)
const total = computed(() => deck.value.length)

function pick(i: number, c: PrepCase) {
  quiz?.pick(i, c)
}

function submitAll() {
  if (!quiz || filledCount.value === 0) return
  quiz.grade()
  const finishedAt = Date.now()
  const prepLevels = Array.from(new Set(deck.value.map(p => p.level))).sort()
  const prepCases = Array.from(new Set(deck.value.map(p => p.case))).sort()
  saveQuizRun({
    type: 'prep-case',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: total.value,
    correct: quiz.score.value,
    meta: { prepLevels, prepCases }
  })
  try {
    sessionStorage.setItem('gt:lastPrepCase', JSON.stringify({
      questions: quiz.questions.value,
      score: quiz.score.value,
      total: total.value
    }))
  } catch { /* ignore */ }
  router.push({ name: 'prepositions-case-result' })
}

function endQuiz() { router.push({ name: 'prepositions-case' }) }
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger">
      <span class="alert-label">Error</span>{{ error }}
    </div>
    <button class="btn btn-ghost" @click="endQuiz">← Back to setup</button>
  </div>

  <div v-else class="page">
    <div class="test-sheet">
      <header class="section-header" style="margin-bottom: 0">
        <div>
          <div class="breadcrumb">Kapitel IV · Kasus · {{ total }} Präpositionen</div>
          <h1 class="section-title">Welcher Kasus<em>?</em></h1>
          <p class="section-subtitle">
            For each preposition, pick the case it governs. Submit-all reveals your score on the next screen.
          </p>
        </div>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </header>

      <div class="test-sheet-header">
        <span class="filled-count">
          <strong>{{ filledCount }}</strong> · von {{ total }} beantwortet
        </span>
        <div class="quiz-progress-bar test-progress">
          <div v-for="(q, i) in quiz?.questions.value" :key="i"
               class="pip" :class="{ current: q.picked !== null }" />
        </div>
      </div>

      <div class="test-rows">
        <div
          v-for="(q, i) in quiz?.questions.value"
          :key="i"
          class="test-row"
        >
          <div class="test-num">
            <strong>{{ String(i + 1).padStart(2, '0') }}.</strong>
          </div>
          <div class="test-content">
            <div class="test-prompt-row">
              <span class="test-verb">{{ q.prep.german }}</span>
              <span class="test-chips">
                <span class="tag">{{ q.prep.level }}</span>
                <span class="prep-english-hint">{{ q.prep.english }}</span>
              </span>
            </div>
            <div class="case-picker">
              <button
                v-for="c in PREPOSITION_CASES"
                :key="c"
                type="button"
                class="case-btn"
                :class="{ selected: q.picked === c }"
                @click="pick(i, c)"
              >{{ c }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="test-sheet-footer">
        <span class="filled-count">
          <strong>{{ filledCount }}</strong> answered · {{ total - filledCount }} remaining
        </span>
        <button
          id="submit-all-case-btn"
          class="btn btn-accent"
          type="button"
          :disabled="filledCount === 0"
          @click="submitAll"
        >Submit all · {{ total }} prepositions <span aria-hidden="true">→</span></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.test-progress { flex: 1; max-width: 280px; margin: 0 0 0 24px; }

.prep-english-hint {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 14px;
  color: var(--mute);
  margin-right: 6px;
}

.case-picker {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.case-btn {
  background: transparent;
  border: 1px solid var(--hairline);
  border-radius: 2px;
  padding: 6px 14px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
  cursor: pointer;
  transition: all .15s;
}
.case-btn:hover { border-color: var(--ink-soft); color: var(--ink); }
.case-btn.selected {
  background: var(--accent-tint);
  border-color: var(--accent);
  color: var(--accent);
}
</style>
```

- [ ] **Step 3: CaseQuizResult.vue**

```vue
<!-- src/modules/prepositions/CaseQuizResult.vue -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { CaseQuestion } from '../../composables/usePrepositionQuiz'

interface Stashed { questions: CaseQuestion[]; score: number; total: number }

const router = useRouter()
const data = ref<Stashed | null>(null)

onMounted(() => {
  try {
    const raw = sessionStorage.getItem('gt:lastPrepCase')
    if (raw) data.value = JSON.parse(raw) as Stashed
  } catch { /* ignore */ }
})

const pct = computed(() => {
  const d = data.value
  if (!d || d.total === 0) return 0
  return Math.round((d.score / d.total) * 100)
})

const summary = computed(() => {
  if (pct.value >= 80) return 'Stark. The case rules are sticking.'
  if (pct.value >= 50) return 'Solid. The two-way ones are the trickiest — keep at them.'
  return 'Worth another pass. Memorise the four lists from /prepositions/list.'
})

function restart() { router.push({ name: 'prepositions-case' }) }
function home() { router.push({ name: 'prepositions' }) }
</script>

<template>
  <div v-if="!data" class="page">
    <div class="alert alert-info">No recent quiz result to show.</div>
    <button class="btn btn-accent" @click="restart">Start a new quiz →</button>
  </div>

  <div v-else class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Kasus</div>
        <div class="result-score">{{ data.score }}<span class="denom"> / {{ data.total }}</span></div>
        <p class="section-subtitle">{{ summary }}</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="home">← Prepositions</button>
        <button class="btn btn-accent" type="button" @click="restart">Start another <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="(q, i) in data.questions" :key="i" class="result-row">
        <div class="german">
          <span class="prep-result-german">{{ q.prep.german }}</span>
          <div class="prep-result-en">{{ q.prep.english }}</div>
        </div>
        <div class="answers">
          your answer:
          <strong :style="q.isCorrect ? 'color: var(--success)' : 'color: var(--danger)'">
            {{ q.picked ?? '—' }}
          </strong>
          <span v-if="!q.isCorrect"> · correct: <strong>{{ q.prep.case }}</strong></span>
        </div>
        <div>
          <span v-if="q.isCorrect" class="tag" style="background: var(--success-tint); color: var(--success)">✓ Correct</span>
          <span v-else class="tag" style="background: var(--danger-tint); color: var(--danger)">✗ Missed</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.prep-result-german {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 20px;
}
.prep-result-en {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--ink-soft);
  margin-top: 2px;
}
</style>
```

- [ ] **Step 4: Smoke check**

`npm run dev`, navigate `/prepositions/case-quiz`, start with 10 prepositions, pick a case for each (mix correct + intentionally wrong), submit. Verify the result page shows the score + per-row grading + the correct case for misses.

- [ ] **Step 5: Verify history integration**

Navigate to `/history` after the quiz. The new run should appear with type "Preposition · case", and the stats radar/donut/breakdown should include it.

- [ ] **Step 6: Commit**

```bash
git add src/modules/prepositions/CaseQuizSetup.vue src/modules/prepositions/CaseQuizRunner.vue src/modules/prepositions/CaseQuizResult.vue
git commit -m "feat(prepositions): which-case quiz (test-sheet)"
```

---

### Task 9: Article-fill quiz — setup + runner

**Files:**
- Create: `src/modules/prepositions/ArticleQuizSetup.vue`
- Create: `src/modules/prepositions/ArticleQuizRunner.vue`

Single-card runner — one sentence per screen. Reuses the prompt-card pattern from `TranslationQuiz.vue`. The result screen is inlined in the runner (history-style), no separate file needed.

- [ ] **Step 1: ArticleQuizSetup.vue**

```vue
<!-- src/modules/prepositions/ArticleQuizSetup.vue -->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { filterExamples } from '../../composables/usePrepositions'
import {
  PREPOSITION_LEVELS, PREPOSITION_CASES,
  type PrepLevel, type PrepCase
} from '../../data/prepositions'

const STORAGE_KEY = 'prepArticleSetup'
const router = useRouter()

const levels = ref<PrepLevel[]>([...PREPOSITION_LEVELS])
const cases  = ref<PrepCase[]>([...PREPOSITION_CASES])
type CountPreset = 10 | 15 | 20 | 'all' | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

interface Stored {
  levels?: PrepLevel[]
  cases?: PrepCase[]
  count?: CountPreset
  customCount?: number
}

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return null
    return p as Stored
  } catch { return null }
}
function saveStored(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      levels: [...levels.value],
      cases: [...cases.value],
      count: count.value,
      customCount: customCount.value
    } satisfies Stored))
  } catch { /* ignore */ }
}

onMounted(() => {
  const s = loadStored()
  if (!s) return
  if (Array.isArray(s.levels)) levels.value = s.levels.filter(l => (PREPOSITION_LEVELS as readonly string[]).includes(l))
  if (Array.isArray(s.cases)) cases.value = s.cases.filter(c => (PREPOSITION_CASES as readonly string[]).includes(c))
  if (s.count !== undefined) count.value = s.count
  if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
})
watch([levels, cases, count, customCount], saveStored, { deep: true })

const available = computed(() => filterExamples({ levels: levels.value, cases: cases.value }).length)
const effective = computed(() => {
  if (count.value === 'all') return available.value
  if (count.value === 'custom') return Math.min(customCount.value, available.value)
  return Math.min(count.value, available.value)
})

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v)
  if (i >= 0) return set.filter((_, j) => j !== i)
  return [...set, v]
}

function start() {
  if (available.value === 0) return
  router.push({
    name: 'prepositions-article-run',
    query: {
      count: String(effective.value),
      levels: levels.value.join(','),
      cases: cases.value.join(',')
    }
  })
}

function back() { router.push({ name: 'prepositions' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel IV · Artikel einsetzen · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          One sentence per screen. Type the article that fills the blank.
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Level · {{ levels.length }} of {{ PREPOSITION_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...PREPOSITION_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="l in PREPOSITION_LEVELS" :key="l"
          class="chip"
          :class="{ selected: levels.includes(l) }"
          @click="levels = toggle(levels, l)"
        >{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Case category · {{ cases.length }} of {{ PREPOSITION_CASES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="cases = [...PREPOSITION_CASES]">All</button>
          <button class="btn btn-quiet" type="button" @click="cases = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="c in PREPOSITION_CASES" :key="c"
          class="chip"
          :class="{ selected: cases.includes(c) }"
          @click="cases = toggle(cases, c)"
        >{{ c }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of sentences</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: count === 10 }" @click="count = 10">10</button>
          <button :class="{ active: count === 15 }" @click="count = 15">15</button>
          <button :class="{ active: count === 20 }" @click="count = 20">20</button>
          <button :class="{ active: count === 'all' }" @click="count = 'all'">All · {{ available }}</button>
          <button :class="{ active: count === 'custom' }" @click="count = 'custom'">Custom</button>
        </div>
        <input
          v-if="count === 'custom'"
          class="input custom-count"
          type="number"
          :min="1"
          :max="available || 1"
          v-model.number="customCount"
        />
        <span class="micro-mark count-avail">{{ available }} match</span>
      </div>
    </div>

    <div v-if="available === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      No sentences match the selected filters.
    </div>

    <div class="alert alert-info">
      <span class="alert-label">Acceptance</span>
      Case and whitespace are ignored. The preposition's case rule is shown above each sentence as a hint.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button class="btn btn-accent" type="button" :disabled="available === 0" @click="start">
        Start quiz · {{ effective }} sentences <span aria-hidden="true">→</span>
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
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
</style>
```

- [ ] **Step 2: ArticleQuizRunner.vue**

```vue
<!-- src/modules/prepositions/ArticleQuizRunner.vue -->
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sampleExamples } from '../../composables/usePrepositions'
import { useArticleQuiz } from '../../composables/usePrepositionQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import {
  PREPOSITION_LEVELS, PREPOSITION_CASES,
  type Preposition, type PrepositionExample,
  type PrepLevel, type PrepCase
} from '../../data/prepositions'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
let quiz: ReturnType<typeof useArticleQuiz> | null = null
const ready = ref(false)
const startedAt = ref<number>(0)
const historySaved = ref(false)

const userInput = ref('')
const submitted = ref(false)
const isCorrectFeedback = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

function csvFilter<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (typeof raw !== 'string' || raw.length === 0) return [...allowed]
  const set = new Set<string>(allowed)
  return raw.split(',').map(s => s.trim()).filter((x): x is T => set.has(x))
}

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const levels = csvFilter<PrepLevel>(route.query.levels, PREPOSITION_LEVELS)
  const cases  = csvFilter<PrepCase>(route.query.cases, PREPOSITION_CASES)
  try {
    const pairs = sampleExamples(count, { levels, cases })
    if (pairs.length === 0) {
      error.value = 'No sentences match the selected filters.'
    } else {
      quiz = useArticleQuiz(pairs)
      ready.value = true
      startedAt.value = Date.now()
      nextTick(() => inputRef.value?.focus())
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

const current = computed<{ prep: Preposition; example: PrepositionExample } | null>(() => {
  if (!ready.value || !quiz) return null
  const q = quiz.current.value
  return q ? { prep: q.prep, example: q.example } : null
})

const finished = computed(() => ready.value && quiz?.finished.value === true)

function caseHintLabel(prep: Preposition): string {
  if (prep.case === 'two-way') return 'two-way · acc. (motion) or dat. (location)'
  return prep.case
}

function submit() {
  if (!quiz || submitted.value) return
  quiz.submit(userInput.value)
  const cur = quiz.questions.value[quiz.currentIndex.value]
  isCorrectFeedback.value = cur?.isCorrect === true
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz) return
  quiz.advance()
  userInput.value = ''
  submitted.value = false
  isCorrectFeedback.value = false
  if (!quiz.finished.value) {
    nextTick(() => inputRef.value?.focus())
  }
}

function onEnter(e: KeyboardEvent) {
  e.preventDefault()
  if (!submitted.value) submit()
  else next()
}

// Save history once when finished.
watch(finished, (now) => {
  if (!now || !quiz || historySaved.value) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'prep-article',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: quiz.total.value,
    correct: quiz.score.value,
    meta: {
      prepLevels: csvFilter<PrepLevel>(route.query.levels, PREPOSITION_LEVELS),
      prepCases: csvFilter<PrepCase>(route.query.cases, PREPOSITION_CASES)
    }
  })
})

function restart() { router.push({ name: 'prepositions-article' }) }
function endQuiz() { router.push({ name: 'prepositions-article' }) }
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" @click="restart">← Back to setup</button>
  </div>

  <div v-else-if="finished && quiz" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Artikel einsetzen</div>
        <div class="result-score">
          {{ quiz.score.value }}<span class="denom"> / {{ quiz.total.value }}</span>
        </div>
        <p class="section-subtitle">
          The case rule for each preposition is shown above its row — review the misses below.
        </p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="restart">Setup another</button>
        <button class="btn btn-accent" type="button" @click="restart">Start another quiz <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="(q, i) in quiz.questions.value" :key="i" class="result-row">
        <div class="german">
          <span class="prep-result-prep">{{ q.prep.german }}</span>
          <span class="prep-result-case">{{ caseHintLabel(q.prep) }}</span>
          <div class="prep-result-sentence">{{ q.example.sentence }}</div>
          <div class="prep-result-gloss">{{ q.example.gloss }}</div>
        </div>
        <div class="answers">
          your answer:
          <strong :style="q.isCorrect ? 'color: var(--success)' : 'color: var(--danger)'">
            {{ q.userAnswer || '—' }}
          </strong>
          <span v-if="!q.isCorrect"> · expected: <strong>{{ q.example.expectedAnswer }}</strong></span>
        </div>
        <div>
          <span v-if="q.isCorrect" class="tag" style="background: var(--success-tint); color: var(--success)">✓</span>
          <span v-else class="tag" style="background: var(--danger-tint); color: var(--danger)">✗</span>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="current && quiz" class="page">
    <div class="quiz-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ quiz.currentIndex.value + 1 }} · von {{ quiz.total.value }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <div class="prep-prompt">
        <span class="prep-prompt-word">{{ current.prep.german }}</span>
        <span class="prep-prompt-case">{{ caseHintLabel(current.prep) }}</span>
      </div>

      <div class="prompt-card">
        <div class="prep-sentence" :style="{ fontSize: 'var(--noun-prompt-size, 56px)' }">
          {{ current.example.blanked }}
        </div>
        <div class="prep-gloss">{{ current.example.gloss }}</div>
      </div>

      <form class="prep-input-wrap" @submit.prevent="submit">
        <input
          ref="inputRef"
          class="input prep-input"
          type="text"
          placeholder="Article (e.g. dem, den, die, meinen…)"
          v-model="userInput"
          :readonly="submitted"
          autocomplete="off"
          spellcheck="false"
          @keydown.enter="onEnter"
          :style="submitted ? {
            color: isCorrectFeedback ? 'var(--success)' : 'var(--danger)',
            borderBottomColor: isCorrectFeedback ? 'var(--success)' : 'var(--danger)'
          } : undefined"
        />
        <button
          v-if="!submitted"
          type="submit"
          class="btn btn-accent"
          :disabled="userInput.trim().length === 0"
        >Submit</button>
        <button
          v-else
          ref="nextBtnRef"
          type="button"
          class="btn btn-accent"
          @click="next"
        >{{ quiz.currentIndex.value + 1 >= quiz.total.value ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
      </form>

      <div v-if="submitted" class="prep-feedback">
        <template v-if="isCorrectFeedback">
          <span class="prep-feedback-mark prep-feedback-ok">✓ Richtig.</span>
          <span class="prep-feedback-full">{{ current.example.sentence }}</span>
        </template>
        <template v-else>
          <span class="prep-feedback-mark prep-feedback-bad">✗ Korrekt: <strong>{{ current.example.expectedAnswer }}</strong></span>
          <span class="prep-feedback-full">{{ current.example.sentence }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.quiz-card { max-width: 720px; margin: 0 auto; }
.quiz-meta {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 32px;
}
.quiz-counter {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
}

.prep-prompt {
  text-align: center;
  margin-bottom: 8px;
}
.prep-prompt-word {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 28px;
  color: var(--accent);
  margin-right: 12px;
}
.prep-prompt-case {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
}

.prep-sentence {
  font-family: var(--font-display);
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: -0.005em;
  color: var(--ink);
  text-align: center;
}
.prep-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 18px;
  color: var(--ink-soft);
  margin-top: 14px;
  text-align: center;
}

.prep-input-wrap {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  margin-top: 36px;
}
.prep-input {
  flex: 1;
  text-align: center;
  font-size: 22px;
  border: 0;
  border-bottom: 2px solid var(--rule);
  padding: 8px 0;
}
.prep-input:focus { border-bottom-color: var(--accent); outline: none; }

.prep-feedback {
  margin-top: 18px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.prep-feedback-mark { font-family: var(--font-display); font-style: italic; font-size: 17px; }
.prep-feedback-ok { color: var(--success); }
.prep-feedback-bad { color: var(--danger); }
.prep-feedback-full {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--ink-soft);
}

.prep-result-prep {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 18px;
  color: var(--accent);
  margin-right: 10px;
}
.prep-result-case {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
}
.prep-result-sentence {
  font-family: var(--font-display);
  font-size: 16px;
  margin-top: 6px;
}
.prep-result-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--ink-soft);
  margin-top: 2px;
}
</style>
```

- [ ] **Step 3: Smoke check**

`npm run dev`, navigate `/prepositions/article-quiz`, run a 5-question session typing a mix of correct + intentional mistakes. Verify:
- The case hint (`accusative` / `dative` / `genitive` / `two-way · acc. (motion) or dat. (location)`) renders above each sentence.
- Enter submits the answer, then Enter again advances.
- The result page shows per-row grading with the expected answer for misses.
- `/history` shows the new run as "Preposition · article".

- [ ] **Step 4: Commit**

```bash
git add src/modules/prepositions/ArticleQuizSetup.vue src/modules/prepositions/ArticleQuizRunner.vue
git commit -m "feat(prepositions): article-fill quiz (single-card)"
```

---

### Task 10: Two-way decision quiz — setup + runner

**Files:**
- Create: `src/modules/prepositions/TwoWayQuizSetup.vue`
- Create: `src/modules/prepositions/TwoWayQuizRunner.vue`

Single-card with two big buttons. Filter is just count (since two-way is a closed set of 9 prepositions; no need for level/case sub-filters).

- [ ] **Step 1: TwoWayQuizSetup.vue**

```vue
<!-- src/modules/prepositions/TwoWayQuizSetup.vue -->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PREPOSITIONS } from '../../data/prepositions'

const STORAGE_KEY = 'prepTwoWaySetup'
const router = useRouter()

type CountPreset = 10 | 15 | 20 | 'all' | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

interface Stored { count?: CountPreset; customCount?: number }

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return null
    return p as Stored
  } catch { return null }
}
function saveStored(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      count: count.value,
      customCount: customCount.value
    } satisfies Stored))
  } catch { /* ignore */ }
}

onMounted(() => {
  const s = loadStored()
  if (!s) return
  if (s.count !== undefined) count.value = s.count
  if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
})
watch([count, customCount], saveStored, { deep: true })

const available = computed(() =>
  PREPOSITIONS.filter(p => p.case === 'two-way').reduce((sum, p) => sum + p.examples.length, 0)
)
const effective = computed(() => {
  if (count.value === 'all') return available.value
  if (count.value === 'custom') return Math.min(customCount.value, available.value)
  return Math.min(count.value, available.value)
})

function start() {
  if (available.value === 0) return
  router.push({
    name: 'prepositions-twoway-run',
    query: { count: String(effective.value) }
  })
}
function back() { router.push({ name: 'prepositions' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel IV · Wechsel · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          For the nine Wechselpräpositionen (<em>an · auf · hinter · in · neben · über · unter · vor · zwischen</em>),
          decide whether the sentence uses accusative (Wohin? motion) or dative (Wo? location).
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-label">Number of sentences</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: count === 10 }" @click="count = 10">10</button>
          <button :class="{ active: count === 15 }" @click="count = 15">15</button>
          <button :class="{ active: count === 20 }" @click="count = 20">20</button>
          <button :class="{ active: count === 'all' }" @click="count = 'all'">All · {{ available }}</button>
          <button :class="{ active: count === 'custom' }" @click="count = 'custom'">Custom</button>
        </div>
        <input
          v-if="count === 'custom'"
          class="input custom-count"
          type="number"
          :min="1"
          :max="available || 1"
          v-model.number="customCount"
        />
        <span class="micro-mark count-avail">{{ available }} examples available</span>
      </div>
    </div>

    <div class="alert alert-info">
      <span class="alert-label">Rule</span>
      Wechselpräpositionen take <strong>accusative</strong> when there's motion toward a destination
      (answers <em>Wohin?</em> — "Ich gehe <strong>in den</strong> Park"), and <strong>dative</strong>
      when describing a location (answers <em>Wo?</em> — "Ich bin <strong>in dem</strong> Park").
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button class="btn btn-accent" type="button" :disabled="available === 0" @click="start">
        Start quiz · {{ effective }} sentences <span aria-hidden="true">→</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.field-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; gap: 12px; flex-wrap: wrap; }
.count-row { align-items: center; gap: 12px; }
.custom-count { width: 80px; font-size: 17px; padding: 4px 0; }
.count-avail { margin-left: auto; }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
</style>
```

- [ ] **Step 2: TwoWayQuizRunner.vue**

```vue
<!-- src/modules/prepositions/TwoWayQuizRunner.vue -->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sampleTwoWayExamples } from '../../composables/usePrepositions'
import { useTwoWayQuiz, type TwoWayPick } from '../../composables/usePrepositionQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import type { Preposition, PrepositionExample } from '../../data/prepositions'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
let quiz: ReturnType<typeof useTwoWayQuiz> | null = null
const ready = ref(false)
const startedAt = ref<number>(0)
const historySaved = ref(false)
const submitted = ref(false)

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  try {
    const pairs = sampleTwoWayExamples(count)
    if (pairs.length === 0) {
      error.value = 'No two-way examples available.'
    } else {
      quiz = useTwoWayQuiz(pairs)
      ready.value = true
      startedAt.value = Date.now()
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

const current = computed<{ prep: Preposition; example: PrepositionExample } | null>(() => {
  if (!ready.value || !quiz) return null
  const q = quiz.current.value
  return q ? { prep: q.prep, example: q.example } : null
})

const finished = computed(() => ready.value && quiz?.finished.value === true)
const currentIsCorrect = computed(() => {
  if (!ready.value || !quiz) return null
  return quiz.current.value?.isCorrect ?? null
})

function pick(value: TwoWayPick) {
  if (!quiz || submitted.value) return
  quiz.pick(value)
  submitted.value = true
}
function next() {
  if (!quiz) return
  quiz.advance()
  submitted.value = false
}

// Save history once when finished.
watch(finished, (now) => {
  if (!now || !quiz || historySaved.value) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'prep-two-way',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: quiz.total.value,
    correct: quiz.score.value,
    meta: {}
  })
})

function restart() { router.push({ name: 'prepositions-twoway' }) }
function endQuiz() { router.push({ name: 'prepositions-twoway' }) }
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" @click="restart">← Back to setup</button>
  </div>

  <div v-else-if="finished && quiz" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Wechsel</div>
        <div class="result-score">
          {{ quiz.score.value }}<span class="denom"> / {{ quiz.total.value }}</span>
        </div>
        <p class="section-subtitle">
          The motion-vs-location distinction is the hardest B1 rule. Misses below are worth re-reading slowly.
        </p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="restart">Setup another</button>
        <button class="btn btn-accent" type="button" @click="restart">Start another quiz <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="(q, i) in quiz.questions.value" :key="i" class="result-row">
        <div class="german">
          <span class="prep-result-prep">{{ q.prep.german }}</span>
          <div class="prep-result-sentence">{{ q.example.sentence }}</div>
          <div class="prep-result-gloss">{{ q.example.gloss }}</div>
        </div>
        <div class="answers">
          you picked:
          <strong :style="q.isCorrect ? 'color: var(--success)' : 'color: var(--danger)'">
            {{ q.picked ?? '—' }}
          </strong>
          <span v-if="!q.isCorrect"> · correct: <strong>{{ q.example.usedCase }}</strong></span>
        </div>
        <div>
          <span v-if="q.isCorrect" class="tag" style="background: var(--success-tint); color: var(--success)">✓</span>
          <span v-else class="tag" style="background: var(--danger-tint); color: var(--danger)">✗</span>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="current && quiz" class="page">
    <div class="quiz-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ quiz.currentIndex.value + 1 }} · von {{ quiz.total.value }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <div class="prep-prompt">
        <span class="prep-prompt-word">{{ current.prep.german }}</span>
        <span class="prep-prompt-case">two-way · acc. or dat.?</span>
      </div>

      <div class="prompt-card">
        <div class="prep-sentence" :style="{ fontSize: 'var(--noun-prompt-size, 48px)' }">
          {{ current.example.sentence }}
        </div>
        <div class="prep-gloss">{{ current.example.gloss }}</div>
      </div>

      <div class="twoway-row">
        <button
          type="button"
          class="twoway-btn"
          :class="twoWayBtnClass('accusative', currentIsCorrect)"
          :disabled="submitted"
          @click="pick('accusative')"
        >
          <span class="twoway-btn-de">Akkusativ</span>
          <span class="twoway-btn-en">Wohin? · motion</span>
        </button>
        <button
          type="button"
          class="twoway-btn"
          :class="twoWayBtnClass('dative', currentIsCorrect)"
          :disabled="submitted"
          @click="pick('dative')"
        >
          <span class="twoway-btn-de">Dativ</span>
          <span class="twoway-btn-en">Wo? · location</span>
        </button>
      </div>

      <div v-if="submitted" class="prep-feedback">
        <template v-if="currentIsCorrect">
          <span class="prep-feedback-mark prep-feedback-ok">✓ Richtig — {{ current.example.usedCase }}.</span>
        </template>
        <template v-else>
          <span class="prep-feedback-mark prep-feedback-bad">✗ Korrekt: <strong>{{ current.example.usedCase }}</strong>.</span>
        </template>
        <button type="button" class="btn btn-accent" style="margin-top: 16px;" @click="next">
          {{ quiz.currentIndex.value + 1 >= quiz.total.value ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Helper kept out of <script setup> to keep types tight.
function twoWayBtnClass(
  side: 'accusative' | 'dative',
  isCorrect: boolean | null
): Record<string, boolean> {
  return {}
}
export { twoWayBtnClass }
</script>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.quiz-card { max-width: 720px; margin: 0 auto; }
.quiz-meta { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 32px; }
.quiz-counter {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
}

.prep-prompt { text-align: center; margin-bottom: 8px; }
.prep-prompt-word {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 28px;
  color: var(--accent);
  margin-right: 12px;
}
.prep-prompt-case {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
}

.prep-sentence {
  font-family: var(--font-display);
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: -0.005em;
  color: var(--ink);
  text-align: center;
}
.prep-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 18px;
  color: var(--ink-soft);
  margin-top: 14px;
  text-align: center;
}

.twoway-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 36px;
}
.twoway-btn {
  background: var(--paper-card);
  border: 1px solid var(--rule);
  border-radius: 4px;
  padding: 36px 24px;
  cursor: pointer;
  text-align: center;
  transition: all .15s;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}
.twoway-btn:not(:disabled):hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  background: var(--accent-wash);
}
.twoway-btn-de {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 500;
  font-size: 36px;
  color: var(--ink);
}
.twoway-btn-en {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
}

.prep-feedback {
  margin-top: 18px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.prep-feedback-mark { font-family: var(--font-display); font-style: italic; font-size: 17px; }
.prep-feedback-ok { color: var(--success); }
.prep-feedback-bad { color: var(--danger); }

.prep-result-prep {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 18px;
  color: var(--accent);
  margin-right: 10px;
}
.prep-result-sentence {
  font-family: var(--font-display);
  font-size: 16px;
  margin-top: 6px;
}
.prep-result-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--ink-soft);
  margin-top: 2px;
}
</style>
```

Note: the `twoWayBtnClass` helper above is left as a no-op stub for v1 — the visual feedback after pick is conveyed by the inline `prep-feedback` block, not by recoloring the buttons themselves. The function exists as a hook in case we want per-button success/danger tint in a later pass; deleting it now and adding it later is fine.

- [ ] **Step 3: Smoke check**

`npm run dev`, navigate `/prepositions/two-way-quiz`, run a 10-sentence session. Verify:
- Two big buttons (Akkusativ / Dativ) with Wohin/Wo labels.
- After click, feedback renders below + Next button focuses.
- The result page shows the per-sentence used case.
- `/history` shows it as "Preposition · two-way".

- [ ] **Step 4: Commit**

```bash
git add src/modules/prepositions/TwoWayQuizSetup.vue src/modules/prepositions/TwoWayQuizRunner.vue
git commit -m "feat(prepositions): two-way decision quiz (single-card)"
```

---

### Task 11: Build, test, deploy

**Files:**
- (none modified)

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: clean (no errors).

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All green. Tally should be 216 (previous baseline) + 9 (data integrity) + 7 (acceptance) + 1 (userdata extension) = **233 tests**.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: PASS. Acceptable warning about chunk size — HistoryPage chunk still ≈ 250KB gzipped from echarts; the new module is small (~10-15KB gzipped).

- [ ] **Step 4: Deploy**

```bash
npm run deploy
git checkout -- dist/
```

Expected: gh-pages reports "Published".

- [ ] **Step 5: Final verification in browser**

Open the deployed site, navigate `/prepositions`, click each of the 4 cards, run a 5-question session of each of the 3 quiz types. Confirm `/history` shows three new entries with the new types appearing in the stats donut, radar, and breakdown automatically (no chart-component changes needed — they read the labels from `quiz-type-labels.ts` which was updated in Task 5).

---

## Self-Review

**1. Spec coverage:**
- Data layer (Task 1) ✓
- Data integrity (Task 2) ✓
- Sampling + filter helpers (Task 3) ✓
- Quiz acceptance + state holders (Task 4) ✓
- Router + nav + history + userdata wiring (Task 5) ✓
- Module landing (Task 6) ✓
- Browse list (Task 7) ✓
- Which-case quiz (Task 8) ✓ — setup + runner + result
- Article-fill quiz (Task 9) ✓ — setup + runner (result inlined)
- Two-way quiz (Task 10) ✓ — setup + runner (result inlined)
- Verify + deploy (Task 11) ✓

**2. Placeholder scan:**
- ⚠ Task 1 Step 3 says "populate following the same shape" for the dative/two-way/genitive sections. This is necessary because the alternative is dumping ~200 lines of curated sentences in the plan itself, which doesn't add information — the implementer has the type definition + 8 fully-worked accusative examples + an explicit list of which prepositions go in each bucket. That's enough to mechanically extend.
- The `twoWayBtnClass` stub in Task 10 is noted as intentional v1 no-op — kept because removing the function call sites would mean editing the template twice (once now, once when we re-add it).

**3. Type consistency:**
- `Preposition.case: PrepCase = 'accusative' | 'dative' | 'genitive' | 'two-way'` — used consistently in samplePrepositions, useCaseQuiz, ArticleQuizSetup, TwoWayQuizRunner.
- `PrepositionExample.usedCase` is the **resolved** case (acc/dat/gen only — no `two-way`) — used in checkTwoWay, the article-fill grader, and the result screens.
- `TwoWayPick = 'accusative' | 'dative'` — narrower union than PrepCase, used only in checkTwoWay + TwoWayQuizRunner.
- History types: `'prep-case' | 'prep-article' | 'prep-two-way'` — used consistently in saveQuizRun calls, QUIZ_TYPE_LABEL, QUIZ_TYPE_DE, QUIZ_TYPES_ORDER, and the HistoryPage QUIZ_TYPES map.
- Storage keys: `prepCaseSetup`, `prepArticleSetup`, `prepTwoWaySetup` — used consistently in the three setup pages and in `USER_DATA_KEYS`.
- Route names: `prepositions`, `prepositions-list`, `prepositions-case`, `prepositions-case-run`, `prepositions-case-result`, `prepositions-article`, `prepositions-article-run`, `prepositions-twoway`, `prepositions-twoway-run` — used consistently in NavShell, PrepositionsHome, ListPrepositions, all 3 setup pages, all 3 runner pages.

No issues found beyond the one explicit data-curation hand-off in Task 1 Step 3, which is unavoidable.

---

## Risks

- **Curation effort** — Task 1 Step 3 requires writing ~70 example sentences. Tests (Task 2) will catch shape errors but not grammatical errors; a German-fluent review pass before merging is recommended.
- **Two-way example coverage** — Each of the 9 two-way prepositions must have at least one accusative AND one dative example for the two-way quiz to be meaningful. The data-integrity test asserts this; failing it blocks deploy.
- **Quiz history schema** — The new `prepLevels` / `prepCases` fields in `QuizHistoryMeta` are additive, so existing entries remain valid. No migration needed.
- **Bundle size** — Each runner page is < 12KB minified. Total module adds ≈ 50KB across the 9 new files, well under the existing 500KB chunk warning threshold.
