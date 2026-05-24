# Sprint 1A — Konjunktiv I + Passiv Transformation Modules · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship two new B2–C1 grammar-transformation drills — **Konjunktiv I "Indirekte Rede"** rewrite and **Passiv** transformation — as new modules in the GermanTrainer SPA.

**Architecture:** Two parallel module folders, each mirroring `useDeclensionAI` + `ArticleAIQuizRunner`. Each module has its own composable (generator + retry + Gemini-judge) and its own Vue routes. No shared abstraction is extracted — that decision is deferred to Sprint 2.

**Tech Stack:** Vue 3 (`<script setup lang="ts">`), TypeScript, Vite, Naive UI (currently in the dependency tree but the project styles things with custom CSS — match the existing `.btn`, `.chip`, `.field` classes), Vue Router, Dexie (untouched), `@google/genai` for the LLM, Vitest + `fake-indexeddb` + jsdom for tests. **The AI provider is Gemini, not Anthropic** — the README is stale; ignore any "Claude" references. The wrapper `src/composables/useClaude.ts` is misleadingly named and exports `makeGeminiClient`.

**Spec:** `docs/superpowers/specs/2026-05-24-konjunktiv-passiv-design.md` (commit `4fedcbe`).

---

## File map

**Files created**

| Path | Responsibility |
|---|---|
| `src/data/konjunktiv.ts` | Types, difficulty briefs, topic enum, JSON response schemas for Module 3. |
| `src/composables/useKonjunktivQuiz.ts` | Konjunktiv I generator (prompt + retry + validator) and judge. |
| `src/modules/konjunktiv/KonjunktivHome.vue` | Module entry, "Start session" CTA, recent-runs preview. |
| `src/modules/konjunktiv/QuizSetup.vue` | Difficulty + count + topic-bias controls + Generate-and-start. |
| `src/modules/konjunktiv/QuizRunner.vue` | One quote at a time, judge on submit, in-place feedback. |
| `src/modules/konjunktiv/QuizResult.vue` | Session summary + per-item review. |
| `src/data/passiv.ts` | Types, difficulty briefs, transformation enum + labels, response schemas. |
| `src/composables/usePassivQuiz.ts` | Passiv generator and judge. |
| `src/modules/passiv/PassivHome.vue` | Module entry. |
| `src/modules/passiv/QuizSetup.vue` | Difficulty + count + transformation-type focus + Generate-and-start. |
| `src/modules/passiv/QuizRunner.vue` | Target tag + active sentence + input + judge. |
| `src/modules/passiv/QuizResult.vue` | Summary with per-type breakdown. |
| `tests/composables/useKonjunktivQuiz.test.ts` | Validator + retry + judge-fallback tests. |
| `tests/composables/usePassivQuiz.test.ts` | Validator + retry + judge-fallback tests. |

**Files modified**

| Path | Change |
|---|---|
| `src/router.ts` | +8 routes (4 per module). |
| `src/composables/useQuizHistory.ts` | Extend `QuizHistoryType` and `QuizHistoryMeta`. |
| `src/modules/history/HistoryPage.vue` | Add labels + ordering for the two new types. |
| `src/modules/home/Home.vue` | Add 2 module tiles + bump the chapter counter ("I/IV" → "I/VI"). |
| `tests/composables/useQuizHistory.test.ts` | Add coverage for the new meta-field shapes. |
| `README.md` | Replace stale "Anthropic" / "Claude" mentions with Gemini reality. |

---

## Conventions to follow

These come from precedent in the codebase. Do not deviate:

- **Session handoff** between QuizSetup and QuizRunner uses `sessionStorage` with a key shaped like `gt:lastDeclArticleAI`. We use `gt:lastKonjunktiv` and `gt:lastPassiv`.
- **Setup-screen persistence** between visits uses `localStorage` with keys like `konjunktivSetup` and `passivSetup` (matches `declArticleSetup` precedent).
- **Loading overlay** during the generator call uses `useLoading().wrap(asyncFn, { title, subtitle })`. Subtitle copy mirrors the declension AI screen: *"Asking Gemini for {N} {difficulty}-difficulty sentences. This usually takes 1–3 minutes — please don't close the tab."*
- **Toasts** for success/error use `useToast()`.
- **API-key guard** copies the alert block from `declension/ArticleQuizSetup.vue:346-349` (the `<div v-if="!hasApiKey" class="alert alert-warning">…</div>` pattern).
- **Component styling** is plain CSS scoped to each component file. Reuse class names already present in declension pages: `.page`, `.section-header`, `.field`, `.chip-row`, `.chip`, `.btn`, `.btn-accent`, `.btn-ghost`, `.btn-quiet`, `.segmented`, `.alert`, `.alert-warning`, `.alert-info`, `.alert-danger`, `.setup-actions`. Do not introduce new design tokens.
- **No new Dexie tables** — generated content lives only in `sessionStorage` for the current session.
- **Composables export** their own `GeminiClient` interface (copy from `useDeclensionAI.ts:108-116`) so tests can construct minimal fakes.
- **All Gemini calls** use `gemini-2.5-flash` by default (read from `useSettings().settings.value.model`). Don't hard-code the model.

---

## Task 1: Extend history types and history-page rendering for both new modules

**Files:**
- Modify: `src/composables/useQuizHistory.ts` (the `QuizHistoryType` union + `QuizHistoryMeta` interface)
- Modify: `src/modules/history/HistoryPage.vue` (the `QUIZ_TYPES` map + `typeOrder` array)
- Test: `tests/composables/useQuizHistory.test.ts` (new test cases)

- [ ] **Step 1: Add the failing tests**

Append to `tests/composables/useQuizHistory.test.ts` inside the existing `describe('useQuizHistory', …)` block:

```ts
  it('persists a konjunktiv-rewrite entry with K-I meta', () => {
    saveQuizRun({
      type: 'konjunktiv-rewrite',
      startedAt: new Date('2026-05-24T10:00:00Z').toISOString(),
      finishedAt: new Date('2026-05-24T10:05:00Z').toISOString(),
      durationMs: 300000,
      count: 10,
      correct: 7,
      meta: { kiDifficulty: 'medium', kiTopics: ['Politik', 'Wirtschaft'] }
    })
    const [entry] = loadHistory()
    expect(entry.type).toBe('konjunktiv-rewrite')
    expect(entry.meta.kiDifficulty).toBe('medium')
    expect(entry.meta.kiTopics).toEqual(['Politik', 'Wirtschaft'])
  })

  it('persists a passiv-transform entry with per-type breakdown', () => {
    saveQuizRun({
      type: 'passiv-transform',
      startedAt: new Date('2026-05-24T11:00:00Z').toISOString(),
      finishedAt: new Date('2026-05-24T11:06:00Z').toISOString(),
      durationMs: 360000,
      count: 8,
      correct: 6,
      meta: {
        passivDifficulty: 'hard',
        passivFocusedTypes: ['vorgangspassiv', 'sich-lassen'],
        passivPerTypeCorrect: {
          'vorgangspassiv': { correct: 3, total: 4 },
          'sich-lassen': { correct: 3, total: 4 }
        }
      }
    })
    const [entry] = loadHistory()
    expect(entry.type).toBe('passiv-transform')
    expect(entry.meta.passivDifficulty).toBe('hard')
    expect(entry.meta.passivPerTypeCorrect?.['vorgangspassiv']).toEqual({ correct: 3, total: 4 })
  })
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```
npm test -- useQuizHistory
```

Expected: TypeScript compilation error — `'konjunktiv-rewrite'` is not assignable to type `QuizHistoryType`; properties `kiDifficulty`, `kiTopics`, `passivDifficulty`, `passivFocusedTypes`, `passivPerTypeCorrect` do not exist on type `QuizHistoryMeta`.

- [ ] **Step 3: Extend `QuizHistoryType` and `QuizHistoryMeta`**

In `src/composables/useQuizHistory.ts`, replace the existing `QuizHistoryType` union with:

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
```

And extend `QuizHistoryMeta` by adding these optional fields at the end of the interface (before the closing brace):

```ts
  // Konjunktiv I
  kiDifficulty?: 'easy' | 'medium' | 'hard'
  kiTopics?: string[]

  // Passiv
  passivDifficulty?: 'easy' | 'medium' | 'hard'
  passivFocusedTypes?: string[]
  passivPerTypeCorrect?: Record<string, { correct: number; total: number }>
```

The meta fields are intentionally typed loosely (`string` / `string[]`) to keep `useQuizHistory.ts` free of cross-module imports. The strict types live in `src/data/konjunktiv.ts` and `src/data/passiv.ts` and are narrowed at the call sites.

- [ ] **Step 4: Run the tests, confirm green**

Run:

```
npm test -- useQuizHistory
```

Expected: PASS, including the two new cases.

- [ ] **Step 5: Wire the new types into the history page**

In `src/modules/history/HistoryPage.vue`, extend the `QUIZ_TYPES` constant by adding these two entries at the end (before the closing brace):

```ts
  'konjunktiv-rewrite': { label: 'Konjunktiv I — indirect speech', de: 'Konjunktiv I · Indirekte Rede', module: 'Grammatik' },
  'passiv-transform':   { label: 'Passiv transformation',          de: 'Passiv · Transformation',     module: 'Grammatik' }
```

And append the two type IDs to the `typeOrder` array after `'decl-article-ai'`:

```ts
  'decl-article-ai',
  'konjunktiv-rewrite',
  'passiv-transform'
```

- [ ] **Step 6: Type-check**

Run:

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/composables/useQuizHistory.ts src/modules/history/HistoryPage.vue tests/composables/useQuizHistory.test.ts
git commit -m "feat(history): add konjunktiv-rewrite + passiv-transform history types"
```

---

## Task 2: Module 3 — data + types file

**Files:**
- Create: `src/data/konjunktiv.ts`

- [ ] **Step 1: Create the data file**

Write `src/data/konjunktiv.ts`:

```ts
// Konjunktiv I "Indirekte Rede" rewriter — data shapes and constants.
//
// Generation + grading are both on-demand (no Dexie table); this file holds
// the static type/enum scaffolding the composable and Vue pages import.

export type KiDifficulty = 'easy' | 'medium' | 'hard'

export const KI_DIFFICULTIES = ['easy', 'medium', 'hard'] as const

export const KI_DIFFICULTY_LABEL: Record<KiDifficulty, string> = {
  easy:   'Easy · B1',
  medium: 'Medium · B2',
  hard:   'Hard · C1'
}

export const KI_DIFFICULTY_BLURB: Record<KiDifficulty, string> = {
  easy:   'Simple SVO quotes with er/sie/es subjects so Konjunktiv I works cleanly. Reporting verbs: sagte, meinte.',
  medium: 'Mixed subjects including plural and 1st person, which forces Konjunktiv II as a fallback in some cases. Reporting verbs: erklärte, behauptete, betonte.',
  hard:   'News-register: subordinate clauses, modal verbs, time-of-utterance shifts. Reporting verbs: konstatierte, dementierte, wies darauf hin.'
}

export const KI_TOPICS = ['Politik', 'Wirtschaft', 'Wissenschaft', 'Sport', 'Kultur'] as const
export type KiTopic = (typeof KI_TOPICS)[number]

/** One generated quote-rewrite question. */
export interface KiQuestion {
  /** Stable id assigned client-side (e.g. "ki-<timestamp>-<n>"). */
  id: string
  difficulty: KiDifficulty
  /** Direct-speech sentence including the speaker, colon, and German quote marks. */
  source: string
  /** Reporting clause shown as a stem before the user input. Ends with ", ". */
  reportingClause: string
  /** Canonical rewrite — used as fallback for grading and as the displayed answer. */
  referenceAnswer: string
  /** Whether the canonical answer uses K-I directly or has to fall back to K-II. */
  expectedMood: 'K1' | 'K2-fallback'
  /** Short English rationale shown after submit. */
  rationale: string
}

/** Output of the LLM judge for a single user submission. */
export interface KiJudgeResult {
  verdict: 'correct' | 'partially_correct' | 'incorrect'
  /** Canonical reference echoed back (always equals KiQuestion.referenceAnswer). */
  expected: string
  /** Other forms the judge will accept as correct. */
  acceptedVariants: string[]
  /** 1–3 sentence English explanation. */
  feedback: string
  /** Which mood the judge detected in the user's answer. */
  moodCheck: {
    used: 'K1' | 'K2' | 'indicative' | 'other'
    ok: boolean
  }
}

/** JSON schema for the generator response. Used by Gemini's responseSchema. */
export const KI_GENERATOR_SCHEMA = {
  type: 'object',
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          reportingClause: { type: 'string' },
          referenceAnswer: { type: 'string' },
          expectedMood: { type: 'string', enum: ['K1', 'K2-fallback'] },
          rationale: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] }
        },
        required: ['source', 'reportingClause', 'referenceAnswer', 'expectedMood', 'rationale', 'difficulty']
      }
    }
  },
  required: ['entries']
} as const

/** JSON schema for the judge response. */
export const KI_JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['correct', 'partially_correct', 'incorrect'] },
    expected: { type: 'string' },
    acceptedVariants: { type: 'array', items: { type: 'string' } },
    feedback: { type: 'string' },
    moodCheck: {
      type: 'object',
      properties: {
        used: { type: 'string', enum: ['K1', 'K2', 'indicative', 'other'] },
        ok: { type: 'boolean' }
      },
      required: ['used', 'ok']
    }
  },
  required: ['verdict', 'expected', 'acceptedVariants', 'feedback', 'moodCheck']
} as const
```

- [ ] **Step 2: Verify type-check passes**

Run:

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/konjunktiv.ts
git commit -m "feat(konjunktiv): data types + schemas for K-I rewriter"
```

---

## Task 3: Module 3 — generator validator (pure, TDD)

**Files:**
- Create: `src/composables/useKonjunktivQuiz.ts` (validator only — generator and judge come in subsequent tasks)
- Test: `tests/composables/useKonjunktivQuiz.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/composables/useKonjunktivQuiz.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { validateKiEntry } from '../../src/composables/useKonjunktivQuiz'

const sampleValid = {
  source: 'Der Minister sagte: „Wir senken die Steuern."',
  reportingClause: 'Der Minister sagte, ',
  referenceAnswer: 'Der Minister sagte, sie senkten die Steuern.',
  expectedMood: 'K2-fallback' as const,
  rationale: 'Plural "sie senken" matches the indicative, so K-II "senkten" is required.',
  difficulty: 'medium' as const
}

describe('validateKiEntry — structural sanity', () => {
  test('valid entry passes', () => {
    expect(validateKiEntry({ ...sampleValid })).not.toBeNull()
  })
  test('missing source rejected', () => {
    expect(validateKiEntry({ ...sampleValid, source: undefined as unknown as string })).toBeNull()
  })
  test('empty reportingClause rejected', () => {
    expect(validateKiEntry({ ...sampleValid, reportingClause: '' })).toBeNull()
  })
  test('empty referenceAnswer rejected', () => {
    expect(validateKiEntry({ ...sampleValid, referenceAnswer: '' })).toBeNull()
  })
  test('non-object rejected', () => {
    expect(validateKiEntry(null)).toBeNull()
    expect(validateKiEntry('not an object')).toBeNull()
  })
})

describe('validateKiEntry — quote formatting', () => {
  test('source without colon rejected', () => {
    expect(validateKiEntry({ ...sampleValid, source: 'Der Minister sagte „Wir senken die Steuern."' })).toBeNull()
  })
  test('source without German quote marks rejected', () => {
    expect(validateKiEntry({ ...sampleValid, source: 'Der Minister sagte: Wir senken die Steuern.' })).toBeNull()
  })
  test('accepts both „…" and «…» style', () => {
    expect(validateKiEntry({
      ...sampleValid,
      source: 'Der Minister sagte: «Wir senken die Steuern.»'
    })).not.toBeNull()
  })
})

describe('validateKiEntry — reportingClause/reference consistency', () => {
  test('reportingClause must end with ", "', () => {
    expect(validateKiEntry({ ...sampleValid, reportingClause: 'Der Minister sagte,' })).toBeNull()
    expect(validateKiEntry({ ...sampleValid, reportingClause: 'Der Minister sagte ' })).toBeNull()
  })
  test('referenceAnswer must start with reportingClause', () => {
    expect(validateKiEntry({
      ...sampleValid,
      referenceAnswer: 'Sie senkten die Steuern.'
    })).toBeNull()
  })
})

describe('validateKiEntry — enum validity', () => {
  test('rejects unknown expectedMood', () => {
    expect(validateKiEntry({ ...sampleValid, expectedMood: 'subjunctive' as unknown as 'K1' })).toBeNull()
  })
  test('rejects unknown difficulty', () => {
    expect(validateKiEntry({ ...sampleValid, difficulty: 'expert' as unknown as 'easy' })).toBeNull()
  })
  test('rejects blank rationale', () => {
    expect(validateKiEntry({ ...sampleValid, rationale: '   ' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```
npm test -- useKonjunktivQuiz
```

Expected: FAIL — module `useKonjunktivQuiz` cannot be found.

- [ ] **Step 3: Implement the validator**

Create `src/composables/useKonjunktivQuiz.ts`:

```ts
import {
  KI_DIFFICULTIES,
  type KiDifficulty,
  type KiQuestion
} from '../data/konjunktiv'

const KI_MOODS = ['K1', 'K2-fallback'] as const

const GERMAN_QUOTE_PAIRS: Array<[string, string]> = [
  ['„', '"'],
  ['«', '»']
]

/**
 * Validate one raw generator entry. Returns the entry shape (without id)
 * if valid, null otherwise.
 *
 * Checks: structural sanity → quote formatting → reporting clause shape
 * → reference-answer consistency → enum validity.
 */
export function validateKiEntry(raw: unknown): Omit<KiQuestion, 'id'> | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>

  // 1. Structural sanity
  if (typeof e.source !== 'string' || e.source.length === 0) return null
  if (typeof e.reportingClause !== 'string' || e.reportingClause.length === 0) return null
  if (typeof e.referenceAnswer !== 'string' || e.referenceAnswer.length === 0) return null
  if (typeof e.expectedMood !== 'string') return null
  if (typeof e.rationale !== 'string' || e.rationale.trim().length === 0) return null
  if (typeof e.difficulty !== 'string') return null

  // 2. Quote formatting — must contain a colon AND a matched German quote pair.
  if (!e.source.includes(':')) return null
  const hasGermanQuotes = GERMAN_QUOTE_PAIRS.some(
    ([open, close]) => (e.source as string).includes(open) && (e.source as string).includes(close)
  )
  if (!hasGermanQuotes) return null

  // 3. Reporting clause shape — ends with ", " so the user's typed continuation
  //    concatenates cleanly into a full sentence.
  if (!(e.reportingClause as string).endsWith(', ')) return null

  // 4. Reference consistency — referenceAnswer must start with the reporting clause.
  if (!(e.referenceAnswer as string).startsWith(e.reportingClause as string)) return null

  // 5. Enum validity
  if (!(KI_MOODS as readonly string[]).includes(e.expectedMood)) return null
  if (!(KI_DIFFICULTIES as readonly string[]).includes(e.difficulty)) return null

  return {
    source: e.source as string,
    reportingClause: e.reportingClause as string,
    referenceAnswer: e.referenceAnswer as string,
    expectedMood: e.expectedMood as 'K1' | 'K2-fallback',
    rationale: e.rationale as string,
    difficulty: e.difficulty as KiDifficulty
  }
}
```

- [ ] **Step 4: Run the tests, confirm green**

Run:

```
npm test -- useKonjunktivQuiz
```

Expected: PASS — all 13 assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useKonjunktivQuiz.ts tests/composables/useKonjunktivQuiz.test.ts
git commit -m "feat(konjunktiv): validator for K-I generator entries"
```

---

## Task 4: Module 3 — generator with prompt + retry loop

**Files:**
- Modify: `src/composables/useKonjunktivQuiz.ts` (add generator)
- Modify: `tests/composables/useKonjunktivQuiz.test.ts` (add retry tests)

- [ ] **Step 1: Add the failing tests**

Append to `tests/composables/useKonjunktivQuiz.test.ts`:

```ts
import { generateKiQuestions, type GeminiClient } from '../../src/composables/useKonjunktivQuiz'

interface MockResponse { text: string }

function makeMockClient(responses: MockResponse[]): GeminiClient {
  let i = 0
  return {
    models: {
      generateContent: async () => {
        const r = responses[i] ?? { text: '' }
        i += 1
        return r
      }
    }
  }
}

const ENTRY_OK_1 = {
  source: 'Der Minister sagte: „Wir senken die Steuern."',
  reportingClause: 'Der Minister sagte, ',
  referenceAnswer: 'Der Minister sagte, sie senkten die Steuern.',
  expectedMood: 'K2-fallback',
  rationale: 'Plural matches indicative, K-II required.',
  difficulty: 'medium'
}

const ENTRY_OK_2 = {
  source: 'Sie meinte: „Er kommt morgen."',
  reportingClause: 'Sie meinte, ',
  referenceAnswer: 'Sie meinte, er komme morgen.',
  expectedMood: 'K1',
  rationale: '3rd person singular K-I is clean.',
  difficulty: 'easy'
}

const ENTRY_BAD = {
  source: 'No colon and no German quotes here.',
  reportingClause: 'Sie meinte, ',
  referenceAnswer: 'Sie meinte, etwas.',
  expectedMood: 'K1',
  rationale: 'r',
  difficulty: 'easy'
}

describe('generateKiQuestions — retry loop', () => {
  test('returns N valid entries from a single clean batch', async () => {
    const client = makeMockClient([
      { text: JSON.stringify({ entries: [ENTRY_OK_1, ENTRY_OK_2] }) }
    ])
    const result = await generateKiQuestions(client, {
      model: 'gemini-2.5-flash',
      count: 2,
      difficulty: 'medium'
    })
    expect(result.entries).toHaveLength(2)
    expect(result.rejected).toBe(0)
    expect(result.attempts).toBe(1)
  })

  test('retries when the first batch fails validation', async () => {
    const client = makeMockClient([
      { text: JSON.stringify({ entries: [ENTRY_BAD] }) },
      { text: JSON.stringify({ entries: [ENTRY_OK_1, ENTRY_OK_2] }) }
    ])
    const result = await generateKiQuestions(client, {
      model: 'gemini-2.5-flash',
      count: 2,
      difficulty: 'medium',
      maxRetries: 2
    })
    expect(result.entries).toHaveLength(2)
    expect(result.rejected).toBe(1)
    expect(result.attempts).toBe(2)
  })

  test('returns partial batch when retries exhaust', async () => {
    const client = makeMockClient([
      { text: JSON.stringify({ entries: [ENTRY_OK_1] }) },
      { text: JSON.stringify({ entries: [ENTRY_BAD] }) },
      { text: JSON.stringify({ entries: [ENTRY_BAD] }) }
    ])
    const result = await generateKiQuestions(client, {
      model: 'gemini-2.5-flash',
      count: 2,
      difficulty: 'medium',
      maxRetries: 2
    })
    expect(result.entries).toHaveLength(1)
    expect(result.rejected).toBe(2)
    expect(result.attempts).toBe(3)
  })

  test('survives malformed JSON in a response', async () => {
    const client = makeMockClient([
      { text: 'not-json {{{' },
      { text: JSON.stringify({ entries: [ENTRY_OK_1, ENTRY_OK_2] }) }
    ])
    const result = await generateKiQuestions(client, {
      model: 'gemini-2.5-flash',
      count: 2,
      difficulty: 'medium'
    })
    expect(result.entries).toHaveLength(2)
    expect(result.attempts).toBe(2)
  })
})
```

- [ ] **Step 2: Confirm tests fail**

Run:

```
npm test -- useKonjunktivQuiz
```

Expected: `generateKiQuestions` is not exported.

- [ ] **Step 3: Add the generator implementation**

Append to `src/composables/useKonjunktivQuiz.ts`:

```ts
import {
  KI_DIFFICULTY_BLURB,
  KI_GENERATOR_SCHEMA,
  KI_TOPICS,
  type KiTopic
} from '../data/konjunktiv'

// ── Gemini client shape (matches useDeclensionAI.GeminiClient) ──

export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

// ── Prompt builder ──────────────────────────────────────────────

export function buildKiGeneratorPrompt(
  count: number,
  difficulty: KiDifficulty,
  topics?: readonly KiTopic[]
): string {
  const topicLine =
    topics && topics.length > 0 && topics.length < KI_TOPICS.length
      ? `Bias topics toward: ${topics.join(', ')}.`
      : 'Mix topics across the batch.'

  return `Generate ${count} German direct-speech quote / indirect-speech rewrite pairs
for a Konjunktiv I drill.

DIFFICULTY: ${difficulty}
${KI_DIFFICULTY_BLURB[difficulty]}

REQUIREMENTS for every entry:
- "source" is a single sentence containing a speaker, a reporting verb in the
  preterite, a colon, and the direct quote in German quote marks („…" or «…»).
  Example: Der Minister sagte: „Wir senken die Steuern."
- "reportingClause" is the speaker + reporting verb + ", " (literally ending with
  a comma and a space). Example: "Der Minister sagte, "
- "referenceAnswer" is the full indirect-speech rewrite, starting EXACTLY with the
  reportingClause string. Use Konjunktiv I where it differs from the indicative;
  fall back to Konjunktiv II ONLY when K-I would coincide with the indicative
  (typically plural and 1st-person forms).
- "expectedMood" is "K1" when the canonical answer is in K-I, or "K2-fallback"
  when the canonical answer must use K-II.
- "rationale" is a short English explanation (one or two sentences) of WHY the
  chosen mood applies — especially the K-I/K-II collision rule when relevant.
- "difficulty" is exactly "${difficulty}".
- ${topicLine}
- Vary reporting verbs and subjects across the batch.
- About 30–40% of entries SHOULD deliberately require the K-II fallback so the
  drill reinforces the collision rule.

Return ONLY valid JSON matching the schema. No prose. No markdown fences.`
}

// ── Generator with retry ────────────────────────────────────────

export interface KiGenerateOptions {
  model: string
  count: number
  difficulty: KiDifficulty
  topics?: readonly KiTopic[]
  maxRetries?: number
}

export interface KiGenerateResult {
  entries: KiQuestion[]
  rejected: number
  attempts: number
}

export async function generateKiQuestions(
  client: GeminiClient,
  opts: KiGenerateOptions
): Promise<KiGenerateResult> {
  const maxRetries = opts.maxRetries ?? 2
  let totalRejected = 0
  let attempts = 0
  const accepted: KiQuestion[] = []

  while (accepted.length < opts.count && attempts <= maxRetries) {
    attempts++
    const remaining = opts.count - accepted.length
    const prompt = buildKiGeneratorPrompt(remaining, opts.difficulty, opts.topics)

    const response = await client.models.generateContent({
      model: opts.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: KI_GENERATOR_SCHEMA as unknown as Record<string, unknown>,
        temperature: 0.4
      }
    })

    const text = response.text ?? ''
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      continue
    }
    if (!parsed || typeof parsed !== 'object') continue
    const entries = (parsed as { entries?: unknown[] }).entries
    if (!Array.isArray(entries)) continue

    for (const raw of entries) {
      const v = validateKiEntry(raw)
      if (v === null) {
        totalRejected++
        continue
      }
      accepted.push({
        id: `ki-${Date.now()}-${accepted.length}`,
        ...v
      })
      if (accepted.length >= opts.count) break
    }
  }

  return { entries: accepted, rejected: totalRejected, attempts }
}
```

- [ ] **Step 4: Confirm tests pass**

Run:

```
npm test -- useKonjunktivQuiz
```

Expected: PASS — all four new retry-loop tests green.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useKonjunktivQuiz.ts tests/composables/useKonjunktivQuiz.test.ts
git commit -m "feat(konjunktiv): K-I generator with retry loop"
```

---

## Task 5: Module 3 — judge function with fallback

**Files:**
- Modify: `src/composables/useKonjunktivQuiz.ts` (add judge)
- Modify: `tests/composables/useKonjunktivQuiz.test.ts` (add judge tests)

- [ ] **Step 1: Add the failing tests**

Append to `tests/composables/useKonjunktivQuiz.test.ts`:

```ts
import { judgeKi, type KiQuestion } from '../../src/composables/useKonjunktivQuiz'

const SAMPLE_QUESTION: KiQuestion = {
  id: 'ki-test-1',
  source: 'Der Minister sagte: „Wir senken die Steuern."',
  reportingClause: 'Der Minister sagte, ',
  referenceAnswer: 'Der Minister sagte, sie senkten die Steuern.',
  expectedMood: 'K2-fallback',
  rationale: 'Plural matches indicative, K-II required.',
  difficulty: 'medium'
}

const JUDGE_RESPONSE_CORRECT = JSON.stringify({
  verdict: 'correct',
  expected: SAMPLE_QUESTION.referenceAnswer,
  acceptedVariants: [],
  feedback: 'Correct Konjunktiv II — the K-I form would have collided with the indicative.',
  moodCheck: { used: 'K2', ok: true }
})

describe('judgeKi — happy path', () => {
  test('parses a well-formed judge response', async () => {
    const client = makeMockClient([{ text: JUDGE_RESPONSE_CORRECT }])
    const result = await judgeKi(client, 'gemini-2.5-flash', SAMPLE_QUESTION, SAMPLE_QUESTION.referenceAnswer)
    expect(result.verdict).toBe('correct')
    expect(result.moodCheck.used).toBe('K2')
    expect(result.moodCheck.ok).toBe(true)
  })
})

describe('judgeKi — degraded fallback', () => {
  test('falls back to local string match when the call throws', async () => {
    const client: GeminiClient = {
      models: {
        generateContent: async () => {
          throw new Error('network down')
        }
      }
    }
    const result = await judgeKi(client, 'gemini-2.5-flash', SAMPLE_QUESTION, SAMPLE_QUESTION.referenceAnswer)
    expect(result.verdict).toBe('correct')
    expect(result.feedback).toMatch(/fallback/i)
    expect(result.moodCheck.used).toBe('other')
  })

  test('falls back to local string match when JSON is malformed', async () => {
    const client = makeMockClient([{ text: 'not-json' }])
    const result = await judgeKi(client, 'gemini-2.5-flash', SAMPLE_QUESTION, '  ' + SAMPLE_QUESTION.referenceAnswer.toUpperCase() + '  ')
    expect(result.verdict).toBe('correct')
    expect(result.feedback).toMatch(/fallback/i)
  })

  test('fallback marks divergent answers incorrect', async () => {
    const client = makeMockClient([{ text: '{ invalid' }])
    const result = await judgeKi(client, 'gemini-2.5-flash', SAMPLE_QUESTION, 'Etwas ganz anderes.')
    expect(result.verdict).toBe('incorrect')
  })
})
```

- [ ] **Step 2: Confirm tests fail**

Run:

```
npm test -- useKonjunktivQuiz
```

Expected: `judgeKi` is not exported.

- [ ] **Step 3: Implement the judge**

Append to `src/composables/useKonjunktivQuiz.ts`:

```ts
import { KI_JUDGE_SCHEMA, type KiJudgeResult } from '../data/konjunktiv'

const KI_JUDGE_SYSTEM_INSTRUCTION =
  'You are a strict German grammar teacher grading indirekte-Rede transformations. ' +
  'Accept any grammatically valid Konjunktiv I or Konjunktiv II form that preserves ' +
  'the meaning. When Konjunktiv I coincides with the indicative (typical for plural ' +
  'and 1st-person), Konjunktiv II is required — flag this in moodCheck. ' +
  'Set moodCheck.used to "K1", "K2", "indicative", or "other". Set moodCheck.ok=true ' +
  'when the chosen mood is appropriate for the source quote.'

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function localFallback(question: KiQuestion, userAnswer: string): KiJudgeResult {
  const match = normalize(userAnswer) === normalize(question.referenceAnswer)
  return {
    verdict: match ? 'correct' : 'incorrect',
    expected: question.referenceAnswer,
    acceptedVariants: [],
    feedback: 'Grader unavailable — fallback to reference match.',
    moodCheck: { used: 'other', ok: match }
  }
}

function validateJudgeResponse(raw: unknown, question: KiQuestion): KiJudgeResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const verdicts = ['correct', 'partially_correct', 'incorrect'] as const
  const moods = ['K1', 'K2', 'indicative', 'other'] as const
  if (typeof r.verdict !== 'string' || !(verdicts as readonly string[]).includes(r.verdict)) return null
  if (typeof r.expected !== 'string') return null
  if (!Array.isArray(r.acceptedVariants) || r.acceptedVariants.some(v => typeof v !== 'string')) return null
  if (typeof r.feedback !== 'string') return null
  const mc = r.moodCheck as Record<string, unknown> | undefined
  if (!mc || typeof mc !== 'object') return null
  if (typeof mc.used !== 'string' || !(moods as readonly string[]).includes(mc.used)) return null
  if (typeof mc.ok !== 'boolean') return null
  return {
    verdict: r.verdict as KiJudgeResult['verdict'],
    expected: question.referenceAnswer,        // always echo the canonical reference
    acceptedVariants: r.acceptedVariants as string[],
    feedback: r.feedback as string,
    moodCheck: { used: mc.used as KiJudgeResult['moodCheck']['used'], ok: mc.ok as boolean }
  }
}

export async function judgeKi(
  client: GeminiClient,
  model: string,
  question: KiQuestion,
  userAnswer: string
): Promise<KiJudgeResult> {
  const userPrompt =
    `Source quote:\n${question.source}\n\n` +
    `Canonical indirect-speech reference:\n${question.referenceAnswer}\n\n` +
    `Expected mood: ${question.expectedMood}\n\n` +
    `Student's submitted answer:\n${userAnswer.trim() || '(empty)'}`

  try {
    const response = await client.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: KI_JUDGE_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: KI_JUDGE_SCHEMA as unknown as Record<string, unknown>,
        temperature: 0
      }
    })
    const text = response.text ?? ''
    const parsed = JSON.parse(text)
    const v = validateJudgeResponse(parsed, question)
    if (v === null) return localFallback(question, userAnswer)
    return v
  } catch {
    return localFallback(question, userAnswer)
  }
}
```

- [ ] **Step 4: Confirm tests pass**

Run:

```
npm test -- useKonjunktivQuiz
```

Expected: PASS — all judge tests green.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useKonjunktivQuiz.ts tests/composables/useKonjunktivQuiz.test.ts
git commit -m "feat(konjunktiv): K-I judge with local fallback"
```

---

## Task 6: Module 3 — Home page + route

**Files:**
- Create: `src/modules/konjunktiv/KonjunktivHome.vue`
- Modify: `src/router.ts`

- [ ] **Step 1: Add the route**

In `src/router.ts`, append to the `routes` array (after the declension routes, before the closing `]`):

```ts
  { path: '/konjunktiv', name: 'konjunktiv', component: () => import('./modules/konjunktiv/KonjunktivHome.vue') }
```

(Setup/Runner/Result routes are added in their own tasks.)

- [ ] **Step 2: Create the home page**

Create `src/modules/konjunktiv/KonjunktivHome.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'

const router = useRouter()

const recent = computed(() =>
  loadHistory()
    .filter(h => h.type === 'konjunktiv-rewrite')
    .slice(0, 5)
)

function formatPct(correct: number, count: number) {
  if (count === 0) return '—'
  return `${Math.round((correct / count) * 100)}%`
}

function startSession() { router.push({ name: 'konjunktiv-quiz' }) }
function back() { router.push({ name: 'home' }) }
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Konjunktiv I</div>
        <h1 class="section-title">Indirect speech<em>.</em></h1>
        <p class="section-subtitle">
          Rewrite direct-speech quotes as reported speech using Konjunktiv I — with
          the K-II fallback when the K-I form coincides with the indicative.
          The dominant register marker in news, academic writing, and the Goethe
          and telc productive tasks.
        </p>
      </div>
    </header>

    <div class="card module-card konjunktiv-cta interactive"
      role="button" tabindex="0"
      @click="startSession" @keydown.enter="startSession">
      <div class="module-numeral">→</div>
      <h2>Start a session</h2>
      <div class="module-de">Sitzung beginnen</div>
      <p class="module-desc">
        Pick a difficulty (B1 · B2 · C1), topic mix, and number of quotes.
        Each quote is judged by Gemini against the canonical Konjunktiv I rewrite.
      </p>
      <div class="module-cta">Open <span aria-hidden="true">→</span></div>
    </div>

    <section v-if="recent.length > 0" class="recent-runs">
      <h3 class="recent-runs-title">Recent runs</h3>
      <ul class="recent-runs-list">
        <li v-for="r in recent" :key="r.id">
          <span class="rr-date">{{ new Date(r.startedAt).toLocaleDateString() }}</span>
          <span class="rr-score">{{ r.correct }} / {{ r.count }} · {{ formatPct(r.correct, r.count) }}</span>
          <span class="rr-meta">{{ r.meta.kiDifficulty ?? '—' }}</span>
        </li>
      </ul>
    </section>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
    </div>
  </div>
</template>

<style scoped>
.konjunktiv-cta { max-width: 720px; margin: 12px 0 32px; }
.recent-runs { margin-top: 32px; max-width: 720px; }
.recent-runs-title {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 12px;
}
.recent-runs-list { list-style: none; padding: 0; margin: 0; }
.recent-runs-list li {
  display: flex;
  gap: 16px;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px solid var(--hairline);
  font-size: 14px;
}
.rr-date { color: var(--mute); flex: 0 0 110px; font-variant-numeric: tabular-nums; }
.rr-score { font-family: var(--font-display); }
.rr-meta { color: var(--mute); margin-left: auto; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; }
.setup-actions { display: flex; justify-content: flex-start; margin-top: 40px; }
</style>
```

- [ ] **Step 3: Verify the page loads**

Run:

```
npm run typecheck
```

Expected: no errors. Then start the dev server (`npm run dev`) and navigate to `http://localhost:5173/konjunktiv` to confirm the page renders. Stop the dev server before committing.

- [ ] **Step 4: Commit**

```bash
git add src/modules/konjunktiv/KonjunktivHome.vue src/router.ts
git commit -m "feat(konjunktiv): home page + route"
```

---

## Task 7: Module 3 — QuizSetup page + route + home-tile

**Files:**
- Create: `src/modules/konjunktiv/QuizSetup.vue`
- Modify: `src/router.ts`
- Modify: `src/modules/home/Home.vue`

- [ ] **Step 1: Add the route**

In `src/router.ts`, add after the `konjunktiv` route:

```ts
  { path: '/konjunktiv/quiz', name: 'konjunktiv-quiz', component: () => import('./modules/konjunktiv/QuizSetup.vue') }
```

- [ ] **Step 2: Create the setup page**

Create `src/modules/konjunktiv/QuizSetup.vue`:

```vue
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  KI_DIFFICULTIES,
  KI_DIFFICULTY_LABEL,
  KI_DIFFICULTY_BLURB,
  KI_TOPICS,
  type KiDifficulty,
  type KiTopic
} from '../../data/konjunktiv'
import {
  generateKiQuestions,
  type KiGenerateResult
} from '../../composables/useKonjunktivQuiz'
import { useSettings } from '../../composables/useSettings'
import { makeGeminiClient } from '../../composables/useClaude'
import { useLoading } from '../../composables/useLoading'
import { useToast } from '../../composables/useToast'

const STORAGE_KEY = 'konjunktivSetup'
const router = useRouter()

const difficulty = ref<KiDifficulty>('medium')
const count = ref<number>(10)
const topics = ref<KiTopic[]>([...KI_TOPICS])

const { settings, hasApiKey, load: loadSettings } = useSettings()
onMounted(loadSettings)

const generating = ref(false)
const error = ref<string | null>(null)
const lastResult = ref<KiGenerateResult | null>(null)

interface Stored { difficulty?: KiDifficulty; count?: number; topics?: KiTopic[] }

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.difficulty && (KI_DIFFICULTIES as readonly string[]).includes(s.difficulty)) {
      difficulty.value = s.difficulty
    }
    if (typeof s.count === 'number' && s.count >= 5 && s.count <= 25) count.value = s.count
    if (Array.isArray(s.topics)) {
      topics.value = s.topics.filter(t => (KI_TOPICS as readonly string[]).includes(t)) as KiTopic[]
    }
  } catch { /* ignore */ }
})

watch([difficulty, count, topics], () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      difficulty: difficulty.value,
      count: count.value,
      topics: topics.value
    } satisfies Stored))
  } catch { /* ignore */ }
}, { deep: true })

function toggleTopic(t: KiTopic) {
  topics.value = topics.value.includes(t)
    ? topics.value.filter(x => x !== t)
    : [...topics.value, t]
}

const loading = useLoading()
const toast = useToast()

async function start() {
  if (!hasApiKey.value) {
    toast.error('Gemini API key required', {
      description: 'Set your API key in Settings before starting a session.'
    })
    return
  }
  generating.value = true
  error.value = null
  lastResult.value = null
  try {
    const result = await loading.wrap(
      async () => {
        const client = makeGeminiClient(settings.value.geminiApiKey)
        const focusTopics = topics.value.length > 0 && topics.value.length < KI_TOPICS.length
          ? topics.value
          : undefined
        return await generateKiQuestions(client, {
          model: settings.value.model,
          count: count.value,
          difficulty: difficulty.value,
          topics: focusTopics,
          maxRetries: 2
        })
      },
      {
        title: 'Generating quotes',
        subtitle: `Asking Gemini for ${count.value} ${difficulty.value}-difficulty quote pairs. This usually takes 1–3 minutes — please don't close the tab.`
      }
    )
    lastResult.value = result
    if (result.entries.length === 0) {
      const msg = `The model returned ${result.rejected} entries but none passed validation. Try a different difficulty or retry.`
      error.value = msg
      toast.error('Generation produced no valid quotes', { description: msg })
      return
    }
    toast.success(`Generated ${result.entries.length} quotes`, {
      description: result.rejected > 0
        ? `${result.rejected} entries rejected · ${result.attempts} attempt${result.attempts === 1 ? '' : 's'}`
        : `Took ${result.attempts} attempt${result.attempts === 1 ? '' : 's'}.`
    })
    sessionStorage.setItem('gt:lastKonjunktiv', JSON.stringify({
      entries: result.entries,
      difficulty: difficulty.value,
      topics: topics.value
    }))
    router.push({ name: 'konjunktiv-quiz-run' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Generation failed.'
    error.value = msg
    toast.error('Generation failed', { description: msg })
  } finally {
    generating.value = false
  }
}

function back() { router.push({ name: 'konjunktiv' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Konjunktiv I · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          Pick a difficulty and topic mix. Gemini generates quotes on demand;
          each session is fresh.
        </p>
      </div>
    </header>

    <div v-if="!hasApiKey" class="alert alert-warning">
      <span class="alert-label">Required</span>
      Set your Gemini API key in <router-link :to="{ name: 'settings' }">Settings</router-link> first.
    </div>

    <div class="field">
      <div class="field-label">Difficulty</div>
      <div class="segmented">
        <button
          v-for="d in KI_DIFFICULTIES" :key="d"
          type="button"
          :class="{ active: difficulty === d }"
          @click="difficulty = d"
        >{{ KI_DIFFICULTY_LABEL[d] }}</button>
      </div>
      <p class="difficulty-blurb">{{ KI_DIFFICULTY_BLURB[difficulty] }}</p>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Topics · {{ topics.length }} of {{ KI_TOPICS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="topics = [...KI_TOPICS]">All</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="t in KI_TOPICS" :key="t"
          type="button"
          class="chip"
          :class="{ selected: topics.includes(t) }"
          @click="toggleTopic(t)"
        >{{ t }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of quotes</div>
      <div class="segmented">
        <button v-for="n in [5, 10, 15, 20, 25]" :key="n"
          type="button"
          :class="{ active: count === n }"
          @click="count = n"
        >{{ n }}</button>
      </div>
      <p class="ai-cost-note">≈{{ count * 2 }} Gemini calls per session.</p>
    </div>

    <div class="alert alert-info">
      <span class="alert-label">How it works</span>
      Quotes are generated fresh on every Start. Each submitted rewrite is graded
      by Gemini against the canonical answer; when grading is unavailable, the
      app falls back to an exact reference match.
    </div>

    <div v-if="error" class="alert alert-danger">
      <span class="alert-label">Generation failed</span>{{ error }}
    </div>

    <div v-if="lastResult && lastResult.entries.length > 0" class="alert alert-info">
      <span class="alert-label">Last run</span>
      {{ lastResult.entries.length }} accepted ·
      {{ lastResult.rejected }} rejected ·
      {{ lastResult.attempts }} {{ lastResult.attempts === 1 ? 'attempt' : 'attempts' }}
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button
        class="btn btn-accent btn-meta"
        type="button"
        :disabled="!hasApiKey || generating || topics.length === 0"
        @click="start"
      >
        <span class="bm-main">{{ generating ? 'Generating…' : 'Generate &amp; start' }} <span v-if="!generating" aria-hidden="true">→</span></span>
        <span class="bm-sub">{{ count }} quotes · {{ KI_DIFFICULTY_LABEL[difficulty] }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.field-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; gap: 12px; flex-wrap: wrap; }
.field-actions { display: flex; gap: 4px; }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
.difficulty-blurb {
  margin: 10px 0 0 0;
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13.5px;
  color: var(--ink-soft);
}
.ai-cost-note {
  margin: 8px 0 0 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--mute);
  text-transform: uppercase;
}
</style>
```

- [ ] **Step 3: Add the home tile**

In `src/modules/home/Home.vue`, replace the existing `modules` constant with:

```ts
const modules: ModuleCard[] = [
  {
    numeral: 'I',
    route: 'nouns',
    de: 'Substantive',
    title: 'Nouns',
    desc: 'Drill der/die/das or English translation across twenty themed groups — around 1,400 words from Möbel to Wetter.',
    meta: '1,407 entries · 20 groups'
  },
  {
    numeral: 'II',
    route: 'adjectives',
    de: 'Adjektive',
    title: 'Adjectives',
    desc: 'AI-generated German sentences with one word missing. Type the inflected form to match the case and gender.',
    meta: '~250 adjectives · 11 groups'
  },
  {
    numeral: 'III',
    route: 'verbs',
    de: 'Verben',
    title: 'Verbs',
    desc: 'Translation drill, full-tense conjugation across all fifteen tenses, plus a twelve-chapter grammar cheatsheet.',
    meta: '378 verbs · 15 tenses'
  },
  {
    numeral: 'IV',
    route: 'konjunktiv',
    de: 'Konjunktiv I',
    title: 'Indirect speech',
    desc: 'Rewrite direct-speech quotes in reported speech using Konjunktiv I — with the K-II fallback for K-I/indicative collisions. B1 · B2 · C1.',
    meta: 'AI-generated · on demand'
  },
  {
    numeral: 'V',
    route: 'settings',
    de: 'Einstellungen',
    title: 'Settings',
    desc: 'Set your Gemini API key and choose a model. Required for AI-driven modules.',
    meta: 'Local · stored in your browser'
  }
]
```

Also bump the chapter counter in the template — change `Frontispiece · I/IV` to `Frontispiece · I/V`. (Passiv will become VI in Task 15.)

- [ ] **Step 4: Type-check + manual smoke**

Run:

```
npm run typecheck
```

Expected: no errors. Then run `npm run dev`, navigate to `/`, click the "Indirect speech" tile, confirm `/konjunktiv` opens, click "Start a session", confirm `/konjunktiv/quiz` renders. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/modules/konjunktiv/QuizSetup.vue src/router.ts src/modules/home/Home.vue
git commit -m "feat(konjunktiv): quiz setup screen + home tile"
```

---

## Task 8: Module 3 — QuizRunner + route

**Files:**
- Create: `src/modules/konjunktiv/QuizRunner.vue`
- Modify: `src/router.ts`

- [ ] **Step 1: Add the route**

In `src/router.ts`, after the `konjunktiv-quiz` route:

```ts
  { path: '/konjunktiv/quiz/run', name: 'konjunktiv-quiz-run', component: () => import('./modules/konjunktiv/QuizRunner.vue') }
```

- [ ] **Step 2: Create the runner**

Create `src/modules/konjunktiv/QuizRunner.vue`:

```vue
<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { KiDifficulty, KiJudgeResult, KiQuestion, KiTopic } from '../../data/konjunktiv'
import { judgeKi } from '../../composables/useKonjunktivQuiz'
import { makeGeminiClient } from '../../composables/useClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

interface Stash {
  entries: KiQuestion[]
  difficulty: KiDifficulty
  topics: KiTopic[]
}

interface QuestionState {
  entry: KiQuestion
  userInput: string
  submitted: boolean
  judging: boolean
  judgement: KiJudgeResult | null
}

const router = useRouter()
const toast = useToast()
const { settings, load: loadSettings } = useSettings()

const loading = ref(true)
const error = ref<string | null>(null)
const stash = ref<Stash | null>(null)
const questions = ref<QuestionState[]>([])
const currentIndex = ref(0)
const startedAt = ref(0)

onMounted(async () => {
  await loadSettings()
  try {
    const raw = sessionStorage.getItem('gt:lastKonjunktiv')
    if (!raw) {
      error.value = 'No session data found. Go back to Setup and run Generate.'
      return
    }
    const s = JSON.parse(raw) as Stash
    if (!Array.isArray(s.entries) || s.entries.length === 0) {
      error.value = 'Session contained no entries.'
      return
    }
    stash.value = s
    questions.value = s.entries.map(e => ({
      entry: e,
      userInput: '',
      submitted: false,
      judging: false,
      judgement: null
    }))
    startedAt.value = Date.now()
    nextTick(focusInput)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

function focusInput() {
  const el = document.querySelector('.ki-input') as HTMLInputElement | null
  el?.focus()
}

const current = computed(() => questions.value[currentIndex.value] ?? null)
const finished = computed(() => questions.value.length > 0 && currentIndex.value >= questions.value.length)
const total = computed(() => questions.value.length)

async function submit() {
  const q = current.value
  if (!q || q.submitted || q.judging) return
  q.judging = true
  try {
    const client = makeGeminiClient(settings.value.geminiApiKey)
    q.judgement = await judgeKi(client, settings.value.model, q.entry, q.userInput)
    q.submitted = true
  } catch (err) {
    toast.error('Grading failed', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    q.judging = false
  }
}

function next() {
  if (currentIndex.value + 1 >= questions.value.length) {
    finalize()
    return
  }
  currentIndex.value += 1
  nextTick(focusInput)
}

function finalize() {
  if (!stash.value) return
  const correct = questions.value.filter(q => q.judgement?.verdict === 'correct').length
  const finishedAt = Date.now()
  sessionStorage.setItem('gt:lastKonjunktivResult', JSON.stringify({
    questions: questions.value.map(q => ({
      entry: q.entry,
      userInput: q.userInput,
      judgement: q.judgement
    })),
    correct,
    total: questions.value.length,
    difficulty: stash.value.difficulty,
    topics: stash.value.topics,
    startedAt: startedAt.value,
    finishedAt
  }))
  router.push({ name: 'konjunktiv-quiz-result' })
}

function onEnter(e: KeyboardEvent) {
  e.preventDefault()
  const q = current.value
  if (!q) return
  if (!q.submitted) {
    if (q.userInput.trim().length > 0 && !q.judging) submit()
  } else {
    next()
  }
}

function endQuiz() { router.push({ name: 'konjunktiv' }) }

const verdictLabel: Record<KiJudgeResult['verdict'], string> = {
  correct: 'Richtig',
  partially_correct: 'Teilweise',
  incorrect: 'Falsch'
}
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="endQuiz">← Back to setup</button>
  </div>

  <div v-else-if="current" class="page">
    <div class="quiz-card ki-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Zitat {{ currentIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <div class="ki-prompt-meta">
        <span class="ki-prompt-difficulty">{{ stash?.difficulty }}</span>
        <span class="ki-prompt-mood">Erwartet: {{ current.entry.expectedMood }}</span>
      </div>

      <div class="prompt-card">
        <div class="ki-source">{{ current.entry.source }}</div>
        <div class="ki-rewrite" @keydown.enter="onEnter">
          <span class="ki-stem">{{ current.entry.reportingClause }}</span>
          <input
            class="ki-input"
            :class="current.submitted && current.judgement ? (current.judgement.verdict === 'correct' ? 'ki-input-right' : current.judgement.verdict === 'partially_correct' ? 'ki-input-partial' : 'ki-input-wrong') : ''"
            type="text"
            v-model="current.userInput"
            :readonly="current.submitted"
            autocomplete="off"
            spellcheck="false"
            placeholder="…sie + Konjunktiv I/II"
          />
        </div>
      </div>

      <div v-if="current.submitted && current.judgement" class="ki-feedback">
        <div class="ki-feedback-row">
          <span class="ki-verdict" :class="`ki-verdict-${current.judgement.verdict}`">
            {{ verdictLabel[current.judgement.verdict] }}
          </span>
          <span class="ki-mood-chip" :class="current.judgement.moodCheck.ok ? 'ki-mood-ok' : 'ki-mood-bad'">
            mood: {{ current.judgement.moodCheck.used }} {{ current.judgement.moodCheck.ok ? '✓' : '✗' }}
          </span>
        </div>
        <div class="ki-expected">
          <span class="ki-expected-label">Erwartet</span>
          <span class="ki-expected-text">{{ current.judgement.expected }}</span>
        </div>
        <div v-if="current.judgement.acceptedVariants.length > 0" class="ki-variants">
          <span class="ki-variants-label">Auch akzeptiert</span>
          <ul>
            <li v-for="v in current.judgement.acceptedVariants" :key="v">{{ v }}</li>
          </ul>
        </div>
        <div class="ki-rationale">{{ current.judgement.feedback }}</div>
        <div class="ki-rationale-author">Source rationale: {{ current.entry.rationale }}</div>
      </div>

      <div class="ai-actions">
        <button
          v-if="!current.submitted"
          type="button"
          class="btn btn-accent"
          @click="submit"
          :disabled="current.userInput.trim().length === 0 || current.judging"
        >{{ current.judging ? 'Grading…' : 'Grade' }}</button>
        <button
          v-else
          type="button"
          class="btn btn-accent"
          @click="next"
        >{{ currentIndex + 1 >= total ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
      </div>
    </div>
  </div>

  <div v-else-if="finished" class="page loading-state"><div class="micro-mark">Wrapping up…</div></div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.ki-card { max-width: 760px; margin: 0 auto; }
.ki-prompt-meta {
  display: flex;
  gap: 18px;
  justify-content: center;
  margin: 8px 0 16px;
}
.ki-prompt-difficulty, .ki-prompt-mood {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
}
.ki-prompt-difficulty { color: var(--accent); }
.ki-source {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 22px;
  line-height: 1.5;
  color: var(--ink);
  margin-bottom: 24px;
}
.ki-rewrite {
  font-family: var(--font-display);
  font-size: 22px;
  line-height: 1.6;
  color: var(--ink);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
}
.ki-stem { white-space: pre; }
.ki-input {
  flex: 1 1 240px;
  min-width: 200px;
  border: 0;
  border-bottom: 2px solid var(--rule);
  font-family: var(--font-display);
  font-size: inherit;
  color: var(--accent);
  padding: 2px 6px;
  background: transparent;
  outline: none;
  transition: border-color .15s, color .15s;
}
.ki-input:focus { border-bottom-color: var(--accent); }
.ki-input.ki-input-right { color: var(--success); border-bottom-color: var(--success); }
.ki-input.ki-input-partial { color: var(--warn, #b58800); border-bottom-color: var(--warn, #b58800); }
.ki-input.ki-input-wrong { color: var(--danger); border-bottom-color: var(--danger); }
.ki-feedback {
  margin: 20px 0;
  padding: 14px 18px;
  background: var(--paper-deep);
  border-radius: 4px;
  border-left: 3px solid var(--accent);
  display: flex; flex-direction: column; gap: 10px;
}
.ki-feedback-row { display: flex; gap: 12px; align-items: center; }
.ki-verdict {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em;
  text-transform: uppercase; padding: 4px 8px; border-radius: 3px;
}
.ki-verdict-correct { background: color-mix(in srgb, var(--success) 18%, transparent); color: var(--success); }
.ki-verdict-partially_correct { background: color-mix(in srgb, var(--warn, #b58800) 18%, transparent); color: var(--warn, #b58800); }
.ki-verdict-incorrect { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
.ki-mood-chip { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--mute); }
.ki-mood-ok { color: var(--success); }
.ki-mood-bad { color: var(--danger); }
.ki-expected, .ki-variants { font-size: 14px; }
.ki-expected-label, .ki-variants-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--mute); display: block;
}
.ki-expected-text { font-family: var(--font-display); }
.ki-variants ul { margin: 4px 0 0 16px; padding: 0; }
.ki-rationale { font-size: 14px; line-height: 1.5; }
.ki-rationale-author {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
}
.ai-actions { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
```

- [ ] **Step 3: Type-check**

Run:

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Manual smoke**

Run `npm run dev`. With a valid Gemini key configured in Settings:
1. Open `/konjunktiv/quiz`.
2. Set difficulty to "Easy · B1", count to 5.
3. Click "Generate & start".
4. After the loading overlay clears, you should land on `/konjunktiv/quiz/run` with the first quote shown.
5. Type a rewrite and click "Grade".
6. Confirm a verdict appears with feedback, then "Next" advances.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/modules/konjunktiv/QuizRunner.vue src/router.ts
git commit -m "feat(konjunktiv): quiz runner with LLM judge"
```

---

## Task 9: Module 3 — QuizResult + route + history save

**Files:**
- Create: `src/modules/konjunktiv/QuizResult.vue`
- Modify: `src/router.ts`

- [ ] **Step 1: Add the route**

In `src/router.ts`:

```ts
  { path: '/konjunktiv/quiz/result', name: 'konjunktiv-quiz-result', component: () => import('./modules/konjunktiv/QuizResult.vue') }
```

- [ ] **Step 2: Create the result page**

Create `src/modules/konjunktiv/QuizResult.vue`:

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { saveQuizRun } from '../../composables/useQuizHistory'
import type { KiDifficulty, KiJudgeResult, KiQuestion, KiTopic } from '../../data/konjunktiv'

interface ResultEntry {
  entry: KiQuestion
  userInput: string
  judgement: KiJudgeResult | null
}

interface StashedResult {
  questions: ResultEntry[]
  correct: number
  total: number
  difficulty: KiDifficulty
  topics: KiTopic[]
  startedAt: number
  finishedAt: number
}

const router = useRouter()
const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<StashedResult | null>(null)
const historySaved = ref(false)

onMounted(() => {
  try {
    const raw = sessionStorage.getItem('gt:lastKonjunktivResult')
    if (!raw) {
      error.value = 'No result data — start a session from setup.'
      return
    }
    data.value = JSON.parse(raw) as StashedResult
    if (!historySaved.value && data.value) {
      historySaved.value = true
      saveQuizRun({
        type: 'konjunktiv-rewrite',
        startedAt: new Date(data.value.startedAt).toISOString(),
        finishedAt: new Date(data.value.finishedAt).toISOString(),
        durationMs: data.value.finishedAt - data.value.startedAt,
        count: data.value.total,
        correct: data.value.correct,
        meta: {
          kiDifficulty: data.value.difficulty,
          kiTopics: data.value.topics
        }
      })
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load result.'
  } finally {
    loading.value = false
  }
})

const partial = computed(() =>
  data.value?.questions.filter(q => q.judgement?.verdict === 'partially_correct').length ?? 0
)
const incorrect = computed(() =>
  data.value?.questions.filter(q => q.judgement?.verdict === 'incorrect').length ?? 0
)
const pct = computed(() => {
  if (!data.value || data.value.total === 0) return 0
  return Math.round((data.value.correct / data.value.total) * 100)
})

function backHome() { router.push({ name: 'konjunktiv' }) }
function newRun() { router.push({ name: 'konjunktiv-quiz' }) }
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>
  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="backHome">← Back</button>
  </div>
  <div v-else-if="data" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Konjunktiv I</div>
        <div class="result-score">{{ data.correct }}<span class="denom"> / {{ data.total }}</span></div>
        <p class="section-subtitle">
          {{ data.total }} quote rewrites · difficulty {{ data.difficulty }}.
        </p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="backHome">Home</button>
        <button class="btn btn-accent" type="button" @click="newRun">Start another session <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="verb-result-summary">
      <div class="vrs-cell is-correct">
        <div class="vrs-num">{{ data.correct }}</div>
        <div class="vrs-label">Richtig · correct</div>
      </div>
      <div class="vrs-cell is-partial">
        <div class="vrs-num">{{ partial }}</div>
        <div class="vrs-label">Teilweise · partial</div>
      </div>
      <div class="vrs-cell is-wrong">
        <div class="vrs-num">{{ incorrect }}</div>
        <div class="vrs-label">Falsch · missed</div>
      </div>
      <div class="vrs-cell">
        <div class="vrs-num">{{ pct }}<span class="vrs-pct-suffix">%</span></div>
        <div class="vrs-label">Quote · score</div>
      </div>
    </div>

    <div class="verb-result-list">
      <div v-for="(q, i) in data.questions" :key="i"
        class="verb-result-card"
        :class="q.judgement?.verdict === 'correct' ? 'is-correct' : q.judgement?.verdict === 'partially_correct' ? 'is-partial' : 'is-wrong'">
        <div class="verb-result-num"># {{ String(i + 1).padStart(2, '0') }}</div>
        <div class="verb-result-prompt">
          <div class="vrp-german">{{ q.entry.source }}</div>
          <div class="ki-result-rewrite">{{ q.entry.referenceAnswer }}</div>
        </div>
        <div class="verb-result-answers">
          <div class="verb-result-line">
            <span class="vrl-label">Du</span>
            <span class="vrl-value">
              <span class="vr-stamp" :class="q.judgement?.verdict === 'correct' ? 'vr-stamp-right' : 'vr-stamp-wrong'">{{ q.userInput || '—' }}</span>
            </span>
          </div>
          <div v-if="q.judgement" class="ki-result-feedback">{{ q.judgement.feedback }}</div>
        </div>
        <div class="verb-result-mark">{{ q.judgement?.verdict === 'correct' ? '✓' : q.judgement?.verdict === 'partially_correct' ? '~' : '✗' }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.vrs-pct-suffix { font-size: 18px; color: var(--mute); margin-left: 2px; }
.vrs-cell.is-partial .vrs-num { color: var(--warn, #b58800); }
.ki-result-rewrite { font-family: var(--font-display); font-style: italic; font-size: 14px; color: var(--ink-soft); margin-top: 4px; }
.ki-result-feedback { margin-top: 6px; font-size: 13px; line-height: 1.5; color: var(--ink-soft); }
</style>
```

- [ ] **Step 3: Type-check**

Run:

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Manual smoke — full flow**

`npm run dev`, run a session of 3 quotes end to end (Setup → Runner → Result). Verify:
1. Result page shows the correct count and a per-quote review list.
2. Navigate to `/history` and confirm a new row labelled "Konjunktiv I — indirect speech" appears.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/modules/konjunktiv/QuizResult.vue src/router.ts
git commit -m "feat(konjunktiv): quiz result page + history save"
```

---

## Task 10: Module 4 — data + types file

**Files:**
- Create: `src/data/passiv.ts`

- [ ] **Step 1: Create the data file**

Write `src/data/passiv.ts`:

```ts
// Passiv transformation drill — data shapes and constants.

export type PassivDifficulty = 'easy' | 'medium' | 'hard'

export const PASSIV_DIFFICULTIES = ['easy', 'medium', 'hard'] as const

export const PASSIV_DIFFICULTY_LABEL: Record<PassivDifficulty, string> = {
  easy:   'Easy · B1',
  medium: 'Medium · B2',
  hard:   'Hard · C1'
}

export const PASSIV_DIFFICULTY_BLURB: Record<PassivDifficulty, string> = {
  easy:   'Simple transitive present-tense sentences with clear actor and object.',
  medium: 'Past tenses, dative-bearing verbs, separable prefixes, mild idiomatic constructions.',
  hard:   'Subordinate clauses, modal verbs, less-frequent verb-noun collocations; preferred targets are sich-lassen and man-Konstruktion.'
}

export type TransformationType =
  | 'vorgangspassiv'
  | 'zustandspassiv'
  | 'sich-lassen'
  | 'sein-zu'
  | 'bar-adjektiv'
  | 'man-konstruktion'

export const TRANSFORMATION_TYPES: TransformationType[] = [
  'vorgangspassiv', 'zustandspassiv', 'sich-lassen',
  'sein-zu', 'bar-adjektiv', 'man-konstruktion'
]

export const TRANSFORMATION_LABELS: Record<TransformationType, string> = {
  'vorgangspassiv':    'Vorgangspassiv (werden + Partizip II)',
  'zustandspassiv':    'Zustandspassiv (sein + Partizip II)',
  'sich-lassen':       'sich lassen + Infinitiv',
  'sein-zu':           'sein + zu + Infinitiv',
  'bar-adjektiv':      '-bar / -lich Adjektiv',
  'man-konstruktion':  'man-Konstruktion (aktiv)'
}

export const TRANSFORMATION_EXAMPLES: Record<TransformationType, string> = {
  'vorgangspassiv':    'Das Haus wird gebaut.',
  'zustandspassiv':    'Das Haus ist gebaut.',
  'sich-lassen':       'Das lässt sich erklären.',
  'sein-zu':           'Das ist zu erklären.',
  'bar-adjektiv':      'Das ist erklärbar.',
  'man-konstruktion':  'Man erklärt das.'
}

/** One generated active-sentence-plus-target question. */
export interface PassivQuestion {
  id: string
  difficulty: PassivDifficulty
  /** Active source sentence — e.g. "Der Techniker repariert das Gerät." */
  active: string
  /** The transformation the user must produce on this question. */
  target: TransformationType
  /** Which transformations are grammatically legal for the source's main verb. */
  legalTypes: TransformationType[]
  /** Canonical answer for the target — used as fallback for grading and display. */
  referenceAnswer: string
  /** English explanation shown after submit. */
  rationale: string
}

/** Output of the LLM judge. */
export interface PassivJudgeResult {
  verdict: 'correct' | 'partially_correct' | 'incorrect'
  expected: string
  acceptedVariants: string[]
  feedback: string
  formCheck: {
    usedType: TransformationType | 'unknown'
    matchesTarget: boolean
  }
}

/** Generator JSON schema. */
export const PASSIV_GENERATOR_SCHEMA = {
  type: 'object',
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          active: { type: 'string' },
          target: { type: 'string', enum: TRANSFORMATION_TYPES },
          legalTypes: { type: 'array', items: { type: 'string', enum: TRANSFORMATION_TYPES } },
          referenceAnswer: { type: 'string' },
          rationale: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] }
        },
        required: ['active', 'target', 'legalTypes', 'referenceAnswer', 'rationale', 'difficulty']
      }
    }
  },
  required: ['entries']
} as const

/** Judge JSON schema. */
export const PASSIV_JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['correct', 'partially_correct', 'incorrect'] },
    expected: { type: 'string' },
    acceptedVariants: { type: 'array', items: { type: 'string' } },
    feedback: { type: 'string' },
    formCheck: {
      type: 'object',
      properties: {
        usedType: { type: 'string', enum: [...TRANSFORMATION_TYPES, 'unknown'] },
        matchesTarget: { type: 'boolean' }
      },
      required: ['usedType', 'matchesTarget']
    }
  },
  required: ['verdict', 'expected', 'acceptedVariants', 'feedback', 'formCheck']
} as const
```

- [ ] **Step 2: Type-check**

Run:

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/passiv.ts
git commit -m "feat(passiv): data types + schemas for transformation drill"
```

---

## Task 11: Module 4 — generator validator (pure, TDD)

**Files:**
- Create: `src/composables/usePassivQuiz.ts` (validator only)
- Create: `tests/composables/usePassivQuiz.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/composables/usePassivQuiz.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { validatePassivEntry } from '../../src/composables/usePassivQuiz'

const sampleValid = {
  active: 'Der Techniker repariert das Gerät.',
  target: 'sich-lassen' as const,
  legalTypes: ['vorgangspassiv', 'zustandspassiv', 'sich-lassen', 'sein-zu', 'man-konstruktion'],
  referenceAnswer: 'Das Gerät lässt sich reparieren.',
  rationale: 'Transitive verb with no resultant-state adjective form; sich-lassen is idiomatic.',
  difficulty: 'medium' as const
}

describe('validatePassivEntry — structural sanity', () => {
  test('valid entry passes', () => {
    expect(validatePassivEntry({ ...sampleValid })).not.toBeNull()
  })
  test('missing active rejected', () => {
    expect(validatePassivEntry({ ...sampleValid, active: '' })).toBeNull()
  })
  test('missing referenceAnswer rejected', () => {
    expect(validatePassivEntry({ ...sampleValid, referenceAnswer: '' })).toBeNull()
  })
  test('non-object rejected', () => {
    expect(validatePassivEntry(null)).toBeNull()
    expect(validatePassivEntry(42)).toBeNull()
  })
})

describe('validatePassivEntry — enum validity', () => {
  test('rejects unknown target', () => {
    expect(validatePassivEntry({ ...sampleValid, target: 'es-werden-passiv' })).toBeNull()
  })
  test('rejects unknown legalTypes entry', () => {
    expect(validatePassivEntry({
      ...sampleValid,
      legalTypes: ['vorgangspassiv', 'something-else']
    })).toBeNull()
  })
  test('rejects empty legalTypes', () => {
    expect(validatePassivEntry({ ...sampleValid, legalTypes: [] })).toBeNull()
  })
  test('rejects unknown difficulty', () => {
    expect(validatePassivEntry({ ...sampleValid, difficulty: 'expert' })).toBeNull()
  })
})

describe('validatePassivEntry — target/legalTypes consistency', () => {
  test('rejects when target is not in legalTypes', () => {
    expect(validatePassivEntry({
      ...sampleValid,
      target: 'bar-adjektiv',
      legalTypes: ['vorgangspassiv', 'sich-lassen']
    })).toBeNull()
  })
})

describe('validatePassivEntry — heuristic referenceAnswer check', () => {
  test('rejects vorgangspassiv reference without "werden"', () => {
    expect(validatePassivEntry({
      ...sampleValid,
      target: 'vorgangspassiv',
      legalTypes: ['vorgangspassiv'],
      referenceAnswer: 'Das Gerät ist repariert.'
    })).toBeNull()
  })
  test('rejects sich-lassen reference without "lass"', () => {
    expect(validatePassivEntry({
      ...sampleValid,
      target: 'sich-lassen',
      legalTypes: ['sich-lassen'],
      referenceAnswer: 'Das Gerät wird repariert.'
    })).toBeNull()
  })
  test('rejects man-konstruktion reference without "man"', () => {
    expect(validatePassivEntry({
      ...sampleValid,
      target: 'man-konstruktion',
      legalTypes: ['man-konstruktion'],
      referenceAnswer: 'Das Gerät wird repariert.'
    })).toBeNull()
  })
  test('rejects blank rationale', () => {
    expect(validatePassivEntry({ ...sampleValid, rationale: '   ' })).toBeNull()
  })
})
```

- [ ] **Step 2: Confirm tests fail**

Run:

```
npm test -- usePassivQuiz
```

Expected: module `usePassivQuiz` cannot be found.

- [ ] **Step 3: Implement the validator**

Create `src/composables/usePassivQuiz.ts`:

```ts
import {
  PASSIV_DIFFICULTIES,
  TRANSFORMATION_TYPES,
  type PassivDifficulty,
  type PassivQuestion,
  type TransformationType
} from '../data/passiv'

const TYPE_SET = new Set<string>(TRANSFORMATION_TYPES)

// Weak heuristic per target type. The LLM judge is source of truth for user
// submissions; these checks only reject obvious generator hallucinations.
function looksLike(target: TransformationType, ref: string): boolean {
  const r = ref.toLowerCase()
  switch (target) {
    case 'vorgangspassiv':
      // Some form of werden + a Partizip II
      return /\b(wird|wurde|werde|wurden|worden|werden)\b/.test(r) && /(ge\w+t|ge\w+en)\b/.test(r)
    case 'zustandspassiv':
      // Some form of sein + a Partizip II
      return /\b(ist|sind|war|waren)\b/.test(r) && /(ge\w+t|ge\w+en)\b/.test(r)
    case 'sich-lassen':
      return /\blass/.test(r) && /sich\b/.test(r)
    case 'sein-zu':
      return /\b(ist|sind|war|waren)\b/.test(r) && /\bzu\s+\w+en\b/.test(r)
    case 'bar-adjektiv':
      // -bar or -lich adjective; ist/sind copula optional
      return /\w+(bar|lich)\b/.test(r)
    case 'man-konstruktion':
      return /\bman\b/.test(r)
  }
}

/**
 * Validate one raw generator entry. Returns the entry shape (without id),
 * null on rejection.
 */
export function validatePassivEntry(raw: unknown): Omit<PassivQuestion, 'id'> | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>

  // Structural sanity
  if (typeof e.active !== 'string' || e.active.trim().length === 0) return null
  if (typeof e.target !== 'string') return null
  if (!Array.isArray(e.legalTypes) || e.legalTypes.length === 0) return null
  if (typeof e.referenceAnswer !== 'string' || e.referenceAnswer.trim().length === 0) return null
  if (typeof e.rationale !== 'string' || e.rationale.trim().length === 0) return null
  if (typeof e.difficulty !== 'string') return null

  // Enum validity
  if (!TYPE_SET.has(e.target)) return null
  if (!(PASSIV_DIFFICULTIES as readonly string[]).includes(e.difficulty)) return null
  for (const t of e.legalTypes) {
    if (typeof t !== 'string' || !TYPE_SET.has(t)) return null
  }

  // Target must be in legalTypes
  if (!(e.legalTypes as string[]).includes(e.target as string)) return null

  // Heuristic reference shape check
  if (!looksLike(e.target as TransformationType, e.referenceAnswer as string)) return null

  return {
    active: (e.active as string).trim(),
    target: e.target as TransformationType,
    legalTypes: e.legalTypes as TransformationType[],
    referenceAnswer: (e.referenceAnswer as string).trim(),
    rationale: (e.rationale as string).trim(),
    difficulty: e.difficulty as PassivDifficulty
  }
}
```

- [ ] **Step 4: Confirm tests pass**

Run:

```
npm test -- usePassivQuiz
```

Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/composables/usePassivQuiz.ts tests/composables/usePassivQuiz.test.ts
git commit -m "feat(passiv): validator for Passiv generator entries"
```

---

## Task 12: Module 4 — generator with prompt + retry loop

**Files:**
- Modify: `src/composables/usePassivQuiz.ts`
- Modify: `tests/composables/usePassivQuiz.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `tests/composables/usePassivQuiz.test.ts`:

```ts
import { generatePassivQuestions, type GeminiClient } from '../../src/composables/usePassivQuiz'

interface MockResponse { text: string }

function makeMockClient(responses: MockResponse[]): GeminiClient {
  let i = 0
  return {
    models: {
      generateContent: async () => {
        const r = responses[i] ?? { text: '' }
        i += 1
        return r
      }
    }
  }
}

const ENTRY_OK = {
  active: 'Der Techniker repariert das Gerät.',
  target: 'sich-lassen',
  legalTypes: ['vorgangspassiv', 'sich-lassen', 'man-konstruktion'],
  referenceAnswer: 'Das Gerät lässt sich reparieren.',
  rationale: 'Transitive verb, no resultant state — sich-lassen is idiomatic.',
  difficulty: 'medium'
}

const ENTRY_BAD = {
  active: '',
  target: 'sich-lassen',
  legalTypes: ['sich-lassen'],
  referenceAnswer: 'Das Gerät lässt sich reparieren.',
  rationale: 'r',
  difficulty: 'medium'
}

describe('generatePassivQuestions — retry loop', () => {
  test('returns N valid entries from a single clean batch', async () => {
    const client = makeMockClient([
      { text: JSON.stringify({ entries: [ENTRY_OK, { ...ENTRY_OK, active: 'Der Mechaniker prüft den Wagen.' }] }) }
    ])
    const result = await generatePassivQuestions(client, {
      model: 'gemini-2.5-flash',
      count: 2,
      difficulty: 'medium'
    })
    expect(result.entries).toHaveLength(2)
    expect(result.rejected).toBe(0)
    expect(result.attempts).toBe(1)
  })

  test('retries when validation rejects all entries', async () => {
    const client = makeMockClient([
      { text: JSON.stringify({ entries: [ENTRY_BAD] }) },
      { text: JSON.stringify({ entries: [ENTRY_OK] }) }
    ])
    const result = await generatePassivQuestions(client, {
      model: 'gemini-2.5-flash',
      count: 1,
      difficulty: 'medium',
      maxRetries: 2
    })
    expect(result.entries).toHaveLength(1)
    expect(result.rejected).toBe(1)
    expect(result.attempts).toBe(2)
  })

  test('survives malformed JSON', async () => {
    const client = makeMockClient([
      { text: 'not-json' },
      { text: JSON.stringify({ entries: [ENTRY_OK] }) }
    ])
    const result = await generatePassivQuestions(client, {
      model: 'gemini-2.5-flash',
      count: 1,
      difficulty: 'medium'
    })
    expect(result.entries).toHaveLength(1)
    expect(result.attempts).toBe(2)
  })
})
```

- [ ] **Step 2: Confirm tests fail**

Run:

```
npm test -- usePassivQuiz
```

Expected: `generatePassivQuestions` is not exported.

- [ ] **Step 3: Implement the generator**

Append to `src/composables/usePassivQuiz.ts`:

```ts
import {
  PASSIV_DIFFICULTY_BLURB,
  PASSIV_GENERATOR_SCHEMA
} from '../data/passiv'

export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

export function buildPassivGeneratorPrompt(
  count: number,
  difficulty: PassivDifficulty,
  focusedTypes?: readonly TransformationType[]
): string {
  const focus = focusedTypes && focusedTypes.length > 0 && focusedTypes.length < TRANSFORMATION_TYPES.length
    ? `Bias the chosen "target" toward: ${focusedTypes.join(', ')}.`
    : 'Distribute "target" choices across the six transformation types.'

  return `Generate ${count} active German sentences for a Passiv transformation drill.

DIFFICULTY: ${difficulty}
${PASSIV_DIFFICULTY_BLURB[difficulty]}

REQUIREMENTS for every entry:
- "active" is a single active sentence in German.
- "legalTypes" enumerates every transformation that is grammatically legal
  for this verb. Exclude:
  * "zustandspassiv" for verbs without a resultant state.
  * "bar-adjektiv" for verbs that don't form a -bar/-lich adjective.
  * "sein-zu" when the modal nuance is unnatural.
  * All passive forms except "man-konstruktion" for intransitive verbs.
- "target" MUST be one of the entries in "legalTypes".
- "referenceAnswer" is the canonical rewrite of "active" into the "target"
  transformation. Examples:
  * vorgangspassiv:  "Das Gerät wird repariert."
  * zustandspassiv:  "Das Gerät ist repariert."
  * sich-lassen:     "Das Gerät lässt sich reparieren."
  * sein-zu:         "Das Gerät ist zu reparieren."
  * bar-adjektiv:    "Das Gerät ist reparierbar."
  * man-konstruktion: "Man repariert das Gerät."
- "rationale" is a short English explanation (one sentence) of WHY this
  transformation is appropriate and how the form is built.
- "difficulty" is exactly "${difficulty}".
- ${focus}
- Vary verbs across the batch.

Return ONLY valid JSON matching the schema. No prose. No markdown fences.`
}

export interface PassivGenerateOptions {
  model: string
  count: number
  difficulty: PassivDifficulty
  focusedTypes?: readonly TransformationType[]
  maxRetries?: number
}

export interface PassivGenerateResult {
  entries: PassivQuestion[]
  rejected: number
  attempts: number
}

export async function generatePassivQuestions(
  client: GeminiClient,
  opts: PassivGenerateOptions
): Promise<PassivGenerateResult> {
  const maxRetries = opts.maxRetries ?? 2
  let totalRejected = 0
  let attempts = 0
  const accepted: PassivQuestion[] = []

  while (accepted.length < opts.count && attempts <= maxRetries) {
    attempts++
    const remaining = opts.count - accepted.length
    const prompt = buildPassivGeneratorPrompt(remaining, opts.difficulty, opts.focusedTypes)

    const response = await client.models.generateContent({
      model: opts.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: PASSIV_GENERATOR_SCHEMA as unknown as Record<string, unknown>,
        temperature: 0.4
      }
    })

    const text = response.text ?? ''
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      continue
    }
    if (!parsed || typeof parsed !== 'object') continue
    const entries = (parsed as { entries?: unknown[] }).entries
    if (!Array.isArray(entries)) continue

    for (const raw of entries) {
      const v = validatePassivEntry(raw)
      if (v === null) {
        totalRejected++
        continue
      }
      accepted.push({
        id: `passiv-${Date.now()}-${accepted.length}`,
        ...v
      })
      if (accepted.length >= opts.count) break
    }
  }

  return { entries: accepted, rejected: totalRejected, attempts }
}
```

- [ ] **Step 4: Confirm tests pass**

Run:

```
npm test -- usePassivQuiz
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/usePassivQuiz.ts tests/composables/usePassivQuiz.test.ts
git commit -m "feat(passiv): Passiv generator with retry loop"
```

---

## Task 13: Module 4 — judge function with fallback

**Files:**
- Modify: `src/composables/usePassivQuiz.ts`
- Modify: `tests/composables/usePassivQuiz.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `tests/composables/usePassivQuiz.test.ts`:

```ts
import { judgePassiv, type PassivQuestion } from '../../src/composables/usePassivQuiz'

const SAMPLE_QUESTION: PassivQuestion = {
  id: 'passiv-test-1',
  active: 'Der Techniker repariert das Gerät.',
  target: 'sich-lassen',
  legalTypes: ['vorgangspassiv', 'sich-lassen', 'man-konstruktion'],
  referenceAnswer: 'Das Gerät lässt sich reparieren.',
  rationale: 'Transitive verb, no resultant state — sich-lassen is idiomatic.',
  difficulty: 'medium'
}

const JUDGE_RESPONSE_OK = JSON.stringify({
  verdict: 'correct',
  expected: SAMPLE_QUESTION.referenceAnswer,
  acceptedVariants: [],
  feedback: 'Correct sich-lassen form.',
  formCheck: { usedType: 'sich-lassen', matchesTarget: true }
})

describe('judgePassiv — happy path', () => {
  test('parses a well-formed response', async () => {
    const client = makeMockClient([{ text: JUDGE_RESPONSE_OK }])
    const result = await judgePassiv(client, 'gemini-2.5-flash', SAMPLE_QUESTION, SAMPLE_QUESTION.referenceAnswer)
    expect(result.verdict).toBe('correct')
    expect(result.formCheck.usedType).toBe('sich-lassen')
    expect(result.formCheck.matchesTarget).toBe(true)
  })
})

describe('judgePassiv — fallback', () => {
  test('falls back to local match on thrown error', async () => {
    const client: GeminiClient = {
      models: {
        generateContent: async () => {
          throw new Error('offline')
        }
      }
    }
    const result = await judgePassiv(client, 'gemini-2.5-flash', SAMPLE_QUESTION, SAMPLE_QUESTION.referenceAnswer)
    expect(result.verdict).toBe('correct')
    expect(result.feedback).toMatch(/fallback/i)
    expect(result.formCheck.usedType).toBe('unknown')
  })

  test('fallback marks divergent answer incorrect', async () => {
    const client = makeMockClient([{ text: 'garbage' }])
    const result = await judgePassiv(client, 'gemini-2.5-flash', SAMPLE_QUESTION, 'Das Gerät wird repariert.')
    expect(result.verdict).toBe('incorrect')
  })
})
```

- [ ] **Step 2: Confirm tests fail**

Run:

```
npm test -- usePassivQuiz
```

Expected: `judgePassiv` is not exported.

- [ ] **Step 3: Implement the judge**

Append to `src/composables/usePassivQuiz.ts`:

```ts
import {
  PASSIV_JUDGE_SCHEMA,
  TRANSFORMATION_LABELS,
  type PassivJudgeResult
} from '../data/passiv'

const PASSIV_JUDGE_SYSTEM_INSTRUCTION =
  'You grade German Passiv and Passiv-alternative transformations. The student ' +
  'was asked to produce a SPECIFIC transformation type. Identify which type the ' +
  'student actually produced (vorgangspassiv, zustandspassiv, sich-lassen, ' +
  'sein-zu, bar-adjektiv, man-konstruktion, or "unknown"), set formCheck.usedType ' +
  'and formCheck.matchesTarget accordingly. Reject answers that are grammatically ' +
  'correct but use the wrong type — verdict "partially_correct" — and explain the ' +
  'type mismatch in feedback.'

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function localPassivFallback(question: PassivQuestion, userAnswer: string): PassivJudgeResult {
  const match = normalize(userAnswer) === normalize(question.referenceAnswer)
  return {
    verdict: match ? 'correct' : 'incorrect',
    expected: question.referenceAnswer,
    acceptedVariants: [],
    feedback: 'Grader unavailable — fallback to reference match.',
    formCheck: { usedType: 'unknown', matchesTarget: match }
  }
}

function validatePassivJudgeResponse(raw: unknown, question: PassivQuestion): PassivJudgeResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const verdicts = ['correct', 'partially_correct', 'incorrect'] as const
  const allUsedTypes = [...TRANSFORMATION_TYPES, 'unknown' as const]
  if (typeof r.verdict !== 'string' || !(verdicts as readonly string[]).includes(r.verdict)) return null
  if (typeof r.expected !== 'string') return null
  if (!Array.isArray(r.acceptedVariants) || r.acceptedVariants.some(v => typeof v !== 'string')) return null
  if (typeof r.feedback !== 'string') return null
  const fc = r.formCheck as Record<string, unknown> | undefined
  if (!fc || typeof fc !== 'object') return null
  if (typeof fc.usedType !== 'string' || !(allUsedTypes as readonly string[]).includes(fc.usedType)) return null
  if (typeof fc.matchesTarget !== 'boolean') return null
  return {
    verdict: r.verdict as PassivJudgeResult['verdict'],
    expected: question.referenceAnswer,
    acceptedVariants: r.acceptedVariants as string[],
    feedback: r.feedback as string,
    formCheck: {
      usedType: fc.usedType as PassivJudgeResult['formCheck']['usedType'],
      matchesTarget: fc.matchesTarget as boolean
    }
  }
}

export async function judgePassiv(
  client: GeminiClient,
  model: string,
  question: PassivQuestion,
  userAnswer: string
): Promise<PassivJudgeResult> {
  const userPrompt =
    `Active source:\n${question.active}\n\n` +
    `Target transformation: ${question.target} (${TRANSFORMATION_LABELS[question.target]})\n\n` +
    `Canonical reference:\n${question.referenceAnswer}\n\n` +
    `Student's submitted answer:\n${userAnswer.trim() || '(empty)'}`

  try {
    const response = await client.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: PASSIV_JUDGE_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: PASSIV_JUDGE_SCHEMA as unknown as Record<string, unknown>,
        temperature: 0
      }
    })
    const text = response.text ?? ''
    const parsed = JSON.parse(text)
    const v = validatePassivJudgeResponse(parsed, question)
    if (v === null) return localPassivFallback(question, userAnswer)
    return v
  } catch {
    return localPassivFallback(question, userAnswer)
  }
}
```

- [ ] **Step 4: Confirm tests pass**

Run:

```
npm test -- usePassivQuiz
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/usePassivQuiz.ts tests/composables/usePassivQuiz.test.ts
git commit -m "feat(passiv): Passiv judge with local fallback"
```

---

## Task 14: Module 4 — Home page + route

**Files:**
- Create: `src/modules/passiv/PassivHome.vue`
- Modify: `src/router.ts`

- [ ] **Step 1: Add the route**

In `src/router.ts`, after the `konjunktiv-quiz-result` route:

```ts
  { path: '/passiv', name: 'passiv', component: () => import('./modules/passiv/PassivHome.vue') }
```

- [ ] **Step 2: Create the home page**

Create `src/modules/passiv/PassivHome.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'

const router = useRouter()

const recent = computed(() =>
  loadHistory()
    .filter(h => h.type === 'passiv-transform')
    .slice(0, 5)
)

function formatPct(correct: number, count: number) {
  if (count === 0) return '—'
  return `${Math.round((correct / count) * 100)}%`
}

function startSession() { router.push({ name: 'passiv-quiz' }) }
function back() { router.push({ name: 'home' }) }
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Passiv</div>
        <h1 class="section-title">Passiv transformations<em>.</em></h1>
        <p class="section-subtitle">
          Rewrite active sentences into a specific passive form — Vorgangspassiv,
          Zustandspassiv, sich-lassen, sein-zu, -bar-Adjektiv, or man-Konstruktion.
          The grammar that turns a B2 essay into a C1 essay.
        </p>
      </div>
    </header>

    <div class="card module-card passiv-cta interactive"
      role="button" tabindex="0"
      @click="startSession" @keydown.enter="startSession">
      <div class="module-numeral">→</div>
      <h2>Start a session</h2>
      <div class="module-de">Sitzung beginnen</div>
      <p class="module-desc">
        Pick a difficulty, a focus across the six transformation types, and a
        session length. Gemini generates active sentences and judges each rewrite.
      </p>
      <div class="module-cta">Open <span aria-hidden="true">→</span></div>
    </div>

    <section v-if="recent.length > 0" class="recent-runs">
      <h3 class="recent-runs-title">Recent runs</h3>
      <ul class="recent-runs-list">
        <li v-for="r in recent" :key="r.id">
          <span class="rr-date">{{ new Date(r.startedAt).toLocaleDateString() }}</span>
          <span class="rr-score">{{ r.correct }} / {{ r.count }} · {{ formatPct(r.correct, r.count) }}</span>
          <span class="rr-meta">{{ r.meta.passivDifficulty ?? '—' }}</span>
        </li>
      </ul>
    </section>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
    </div>
  </div>
</template>

<style scoped>
.passiv-cta { max-width: 720px; margin: 12px 0 32px; }
.recent-runs { margin-top: 32px; max-width: 720px; }
.recent-runs-title {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 12px;
}
.recent-runs-list { list-style: none; padding: 0; margin: 0; }
.recent-runs-list li {
  display: flex; gap: 16px; align-items: baseline;
  padding: 8px 0; border-bottom: 1px solid var(--hairline); font-size: 14px;
}
.rr-date { color: var(--mute); flex: 0 0 110px; font-variant-numeric: tabular-nums; }
.rr-score { font-family: var(--font-display); }
.rr-meta { color: var(--mute); margin-left: auto; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; }
.setup-actions { display: flex; justify-content: flex-start; margin-top: 40px; }
</style>
```

- [ ] **Step 3: Type-check + smoke**

Run:

```
npm run typecheck
```

Expected: no errors. Then `npm run dev`, navigate to `/passiv`, confirm it renders, then stop the server.

- [ ] **Step 4: Commit**

```bash
git add src/modules/passiv/PassivHome.vue src/router.ts
git commit -m "feat(passiv): home page + route"
```

---

## Task 15: Module 4 — QuizSetup + route + home tile

**Files:**
- Create: `src/modules/passiv/QuizSetup.vue`
- Modify: `src/router.ts`
- Modify: `src/modules/home/Home.vue`

- [ ] **Step 1: Add the route**

```ts
  { path: '/passiv/quiz', name: 'passiv-quiz', component: () => import('./modules/passiv/QuizSetup.vue') }
```

- [ ] **Step 2: Create the setup page**

Create `src/modules/passiv/QuizSetup.vue`:

```vue
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  PASSIV_DIFFICULTIES,
  PASSIV_DIFFICULTY_LABEL,
  PASSIV_DIFFICULTY_BLURB,
  TRANSFORMATION_TYPES,
  TRANSFORMATION_LABELS,
  type PassivDifficulty,
  type TransformationType
} from '../../data/passiv'
import {
  generatePassivQuestions,
  type PassivGenerateResult
} from '../../composables/usePassivQuiz'
import { useSettings } from '../../composables/useSettings'
import { makeGeminiClient } from '../../composables/useClaude'
import { useLoading } from '../../composables/useLoading'
import { useToast } from '../../composables/useToast'

const STORAGE_KEY = 'passivSetup'
const router = useRouter()

const difficulty = ref<PassivDifficulty>('medium')
const count = ref<number>(10)
const focusTypes = ref<TransformationType[]>([...TRANSFORMATION_TYPES])

const { settings, hasApiKey, load: loadSettings } = useSettings()
onMounted(loadSettings)

const generating = ref(false)
const error = ref<string | null>(null)
const lastResult = ref<PassivGenerateResult | null>(null)

interface Stored { difficulty?: PassivDifficulty; count?: number; focusTypes?: TransformationType[] }

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.difficulty && (PASSIV_DIFFICULTIES as readonly string[]).includes(s.difficulty)) {
      difficulty.value = s.difficulty
    }
    if (typeof s.count === 'number' && s.count >= 5 && s.count <= 25) count.value = s.count
    if (Array.isArray(s.focusTypes)) {
      focusTypes.value = s.focusTypes.filter(
        t => (TRANSFORMATION_TYPES as readonly string[]).includes(t)
      ) as TransformationType[]
    }
  } catch { /* ignore */ }
})

watch([difficulty, count, focusTypes], () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      difficulty: difficulty.value,
      count: count.value,
      focusTypes: focusTypes.value
    } satisfies Stored))
  } catch { /* ignore */ }
}, { deep: true })

function toggleType(t: TransformationType) {
  focusTypes.value = focusTypes.value.includes(t)
    ? focusTypes.value.filter(x => x !== t)
    : [...focusTypes.value, t]
}

const loading = useLoading()
const toast = useToast()

async function start() {
  if (!hasApiKey.value) {
    toast.error('Gemini API key required', {
      description: 'Set your API key in Settings before starting a session.'
    })
    return
  }
  generating.value = true
  error.value = null
  lastResult.value = null
  try {
    const result = await loading.wrap(
      async () => {
        const client = makeGeminiClient(settings.value.geminiApiKey)
        const focus = focusTypes.value.length > 0 && focusTypes.value.length < TRANSFORMATION_TYPES.length
          ? focusTypes.value
          : undefined
        return await generatePassivQuestions(client, {
          model: settings.value.model,
          count: count.value,
          difficulty: difficulty.value,
          focusedTypes: focus,
          maxRetries: 2
        })
      },
      {
        title: 'Generating sentences',
        subtitle: `Asking Gemini for ${count.value} ${difficulty.value}-difficulty active sentences. This usually takes 1–3 minutes — please don't close the tab.`
      }
    )
    lastResult.value = result
    if (result.entries.length === 0) {
      const msg = `The model returned ${result.rejected} entries but none passed validation.`
      error.value = msg
      toast.error('Generation produced no valid sentences', { description: msg })
      return
    }
    toast.success(`Generated ${result.entries.length} sentences`, {
      description: result.rejected > 0
        ? `${result.rejected} rejected · ${result.attempts} attempt${result.attempts === 1 ? '' : 's'}`
        : `Took ${result.attempts} attempt${result.attempts === 1 ? '' : 's'}.`
    })
    sessionStorage.setItem('gt:lastPassiv', JSON.stringify({
      entries: result.entries,
      difficulty: difficulty.value,
      focusTypes: focusTypes.value
    }))
    router.push({ name: 'passiv-quiz-run' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Generation failed.'
    error.value = msg
    toast.error('Generation failed', { description: msg })
  } finally {
    generating.value = false
  }
}

function back() { router.push({ name: 'passiv' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Passiv · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          One active sentence per screen, one transformation per question.
        </p>
      </div>
    </header>

    <div v-if="!hasApiKey" class="alert alert-warning">
      <span class="alert-label">Required</span>
      Set your Gemini API key in <router-link :to="{ name: 'settings' }">Settings</router-link> first.
    </div>

    <div class="field">
      <div class="field-label">Difficulty</div>
      <div class="segmented">
        <button
          v-for="d in PASSIV_DIFFICULTIES" :key="d"
          type="button"
          :class="{ active: difficulty === d }"
          @click="difficulty = d"
        >{{ PASSIV_DIFFICULTY_LABEL[d] }}</button>
      </div>
      <p class="difficulty-blurb">{{ PASSIV_DIFFICULTY_BLURB[difficulty] }}</p>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Focus types · {{ focusTypes.length }} of {{ TRANSFORMATION_TYPES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="focusTypes = [...TRANSFORMATION_TYPES]">All</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="t in TRANSFORMATION_TYPES" :key="t"
          type="button"
          class="chip"
          :class="{ selected: focusTypes.includes(t) }"
          @click="toggleType(t)"
          :title="TRANSFORMATION_LABELS[t]"
        >{{ t }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of sentences</div>
      <div class="segmented">
        <button v-for="n in [5, 10, 15, 20, 25]" :key="n"
          type="button"
          :class="{ active: count === n }"
          @click="count = n"
        >{{ n }}</button>
      </div>
      <p class="ai-cost-note">≈{{ count * 2 }} Gemini calls per session.</p>
    </div>

    <div class="alert alert-info">
      <span class="alert-label">How it works</span>
      Sentences are generated fresh on every Start. Each rewrite is judged by Gemini;
      grading also reports which transformation type your answer actually used, so
      you can spot type mismatches.
    </div>

    <div v-if="error" class="alert alert-danger">
      <span class="alert-label">Generation failed</span>{{ error }}
    </div>

    <div v-if="lastResult && lastResult.entries.length > 0" class="alert alert-info">
      <span class="alert-label">Last run</span>
      {{ lastResult.entries.length }} accepted ·
      {{ lastResult.rejected }} rejected ·
      {{ lastResult.attempts }} {{ lastResult.attempts === 1 ? 'attempt' : 'attempts' }}
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button
        class="btn btn-accent btn-meta"
        type="button"
        :disabled="!hasApiKey || generating || focusTypes.length === 0"
        @click="start"
      >
        <span class="bm-main">{{ generating ? 'Generating…' : 'Generate &amp; start' }} <span v-if="!generating" aria-hidden="true">→</span></span>
        <span class="bm-sub">{{ count }} sentences · {{ PASSIV_DIFFICULTY_LABEL[difficulty] }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.field-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; gap: 12px; flex-wrap: wrap; }
.field-actions { display: flex; gap: 4px; }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
.difficulty-blurb {
  margin: 10px 0 0 0;
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13.5px;
  color: var(--ink-soft);
}
.ai-cost-note {
  margin: 8px 0 0 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--mute);
  text-transform: uppercase;
}
</style>
```

- [ ] **Step 3: Add the home tile**

In `src/modules/home/Home.vue`, insert a new entry into `modules` between the existing `konjunktiv` entry and the `settings` entry:

```ts
  {
    numeral: 'V',
    route: 'passiv',
    de: 'Passiv',
    title: 'Passiv transformations',
    desc: 'Rewrite active sentences as Vorgangs-, Zustandspassiv, sich-lassen, sein-zu, -bar-Adjektiv, or man-Konstruktion — one target form at a time.',
    meta: 'AI-generated · on demand'
  },
```

Renumber the existing `settings` entry's `numeral` to `'VI'` and update the chapter counter in the template from `Frontispiece · I/V` to `Frontispiece · I/VI`.

- [ ] **Step 4: Type-check + smoke**

Run:

```
npm run typecheck
```

Then `npm run dev`, navigate to `/passiv/quiz`, confirm rendering. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/modules/passiv/QuizSetup.vue src/router.ts src/modules/home/Home.vue
git commit -m "feat(passiv): quiz setup screen + home tile"
```

---

## Task 16: Module 4 — QuizRunner + route

**Files:**
- Create: `src/modules/passiv/QuizRunner.vue`
- Modify: `src/router.ts`

- [ ] **Step 1: Add the route**

```ts
  { path: '/passiv/quiz/run', name: 'passiv-quiz-run', component: () => import('./modules/passiv/QuizRunner.vue') }
```

- [ ] **Step 2: Create the runner**

Create `src/modules/passiv/QuizRunner.vue`:

```vue
<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  TRANSFORMATION_EXAMPLES,
  TRANSFORMATION_LABELS,
  type PassivDifficulty,
  type PassivJudgeResult,
  type PassivQuestion,
  type TransformationType
} from '../../data/passiv'
import { judgePassiv } from '../../composables/usePassivQuiz'
import { makeGeminiClient } from '../../composables/useClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

interface Stash {
  entries: PassivQuestion[]
  difficulty: PassivDifficulty
  focusTypes: TransformationType[]
}

interface QuestionState {
  entry: PassivQuestion
  userInput: string
  submitted: boolean
  judging: boolean
  judgement: PassivJudgeResult | null
  exampleOpen: boolean
}

const router = useRouter()
const toast = useToast()
const { settings, load: loadSettings } = useSettings()

const loading = ref(true)
const error = ref<string | null>(null)
const stash = ref<Stash | null>(null)
const questions = ref<QuestionState[]>([])
const currentIndex = ref(0)
const startedAt = ref(0)

onMounted(async () => {
  await loadSettings()
  try {
    const raw = sessionStorage.getItem('gt:lastPassiv')
    if (!raw) {
      error.value = 'No session data found. Go back to Setup and run Generate.'
      return
    }
    const s = JSON.parse(raw) as Stash
    if (!Array.isArray(s.entries) || s.entries.length === 0) {
      error.value = 'Session contained no entries.'
      return
    }
    stash.value = s
    questions.value = s.entries.map(e => ({
      entry: e,
      userInput: '',
      submitted: false,
      judging: false,
      judgement: null,
      exampleOpen: false
    }))
    startedAt.value = Date.now()
    nextTick(focusInput)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

function focusInput() {
  const el = document.querySelector('.passiv-input') as HTMLInputElement | null
  el?.focus()
}

const current = computed(() => questions.value[currentIndex.value] ?? null)
const total = computed(() => questions.value.length)

async function submit() {
  const q = current.value
  if (!q || q.submitted || q.judging) return
  q.judging = true
  try {
    const client = makeGeminiClient(settings.value.geminiApiKey)
    q.judgement = await judgePassiv(client, settings.value.model, q.entry, q.userInput)
    q.submitted = true
  } catch (err) {
    toast.error('Grading failed', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    q.judging = false
  }
}

function next() {
  if (currentIndex.value + 1 >= questions.value.length) {
    finalize()
    return
  }
  currentIndex.value += 1
  nextTick(focusInput)
}

function finalize() {
  if (!stash.value) return
  const correct = questions.value.filter(q => q.judgement?.verdict === 'correct').length
  const finishedAt = Date.now()

  const perType: Record<string, { correct: number; total: number }> = {}
  for (const q of questions.value) {
    const t = q.entry.target as string
    perType[t] = perType[t] ?? { correct: 0, total: 0 }
    perType[t].total += 1
    if (q.judgement?.verdict === 'correct') perType[t].correct += 1
  }

  sessionStorage.setItem('gt:lastPassivResult', JSON.stringify({
    questions: questions.value.map(q => ({
      entry: q.entry,
      userInput: q.userInput,
      judgement: q.judgement
    })),
    correct,
    total: questions.value.length,
    difficulty: stash.value.difficulty,
    focusTypes: stash.value.focusTypes,
    perType,
    startedAt: startedAt.value,
    finishedAt
  }))
  router.push({ name: 'passiv-quiz-result' })
}

function onEnter(e: KeyboardEvent) {
  e.preventDefault()
  const q = current.value
  if (!q) return
  if (!q.submitted) {
    if (q.userInput.trim().length > 0 && !q.judging) submit()
  } else {
    next()
  }
}

function endQuiz() { router.push({ name: 'passiv' }) }

const verdictLabel: Record<PassivJudgeResult['verdict'], string> = {
  correct: 'Richtig',
  partially_correct: 'Teilweise',
  incorrect: 'Falsch'
}
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="endQuiz">← Back to setup</button>
  </div>

  <div v-else-if="current" class="page">
    <div class="quiz-card passiv-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ currentIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <div class="passiv-target-row">
        <span class="passiv-target-label">Form</span>
        <span class="passiv-target-tag">{{ TRANSFORMATION_LABELS[current.entry.target] }}</span>
        <button
          type="button"
          class="passiv-example-toggle"
          :aria-expanded="current.exampleOpen"
          @click="current.exampleOpen = !current.exampleOpen"
        >?</button>
      </div>
      <div v-if="current.exampleOpen" class="passiv-example">
        e.g. <span class="passiv-example-text">{{ TRANSFORMATION_EXAMPLES[current.entry.target] }}</span>
      </div>

      <div class="prompt-card">
        <div class="passiv-active">{{ current.entry.active }}</div>
        <div class="passiv-input-row" @keydown.enter="onEnter">
          <input
            class="passiv-input"
            :class="current.submitted && current.judgement ? (current.judgement.verdict === 'correct' ? 'passiv-input-right' : current.judgement.verdict === 'partially_correct' ? 'passiv-input-partial' : 'passiv-input-wrong') : ''"
            type="text"
            v-model="current.userInput"
            :readonly="current.submitted"
            autocomplete="off"
            spellcheck="false"
            placeholder="Type the rewrite…"
          />
        </div>
      </div>

      <div v-if="current.submitted && current.judgement" class="passiv-feedback">
        <div class="passiv-feedback-row">
          <span class="passiv-verdict" :class="`passiv-verdict-${current.judgement.verdict}`">
            {{ verdictLabel[current.judgement.verdict] }}
          </span>
          <span class="passiv-form-chip" :class="current.judgement.formCheck.matchesTarget ? 'passiv-form-ok' : 'passiv-form-bad'">
            used: {{ current.judgement.formCheck.usedType }} {{ current.judgement.formCheck.matchesTarget ? '✓' : '✗' }}
          </span>
        </div>
        <div class="passiv-expected">
          <span class="passiv-expected-label">Erwartet</span>
          <span class="passiv-expected-text">{{ current.judgement.expected }}</span>
        </div>
        <div v-if="current.judgement.acceptedVariants.length > 0" class="passiv-variants">
          <span class="passiv-variants-label">Auch akzeptiert</span>
          <ul>
            <li v-for="v in current.judgement.acceptedVariants" :key="v">{{ v }}</li>
          </ul>
        </div>
        <div class="passiv-rationale">{{ current.judgement.feedback }}</div>
        <div class="passiv-rationale-author">Source rationale: {{ current.entry.rationale }}</div>
      </div>

      <div class="ai-actions">
        <button
          v-if="!current.submitted"
          type="button"
          class="btn btn-accent"
          @click="submit"
          :disabled="current.userInput.trim().length === 0 || current.judging"
        >{{ current.judging ? 'Grading…' : 'Grade' }}</button>
        <button
          v-else
          type="button"
          class="btn btn-accent"
          @click="next"
        >{{ currentIndex + 1 >= total ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.passiv-card { max-width: 760px; margin: 0 auto; }
.passiv-target-row { display: flex; gap: 12px; align-items: center; margin: 8px 0 4px; }
.passiv-target-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute);
}
.passiv-target-tag {
  font-family: var(--font-display); font-size: 16px; color: var(--accent);
  padding: 4px 10px; border: 1px solid var(--accent); border-radius: 3px;
}
.passiv-example-toggle {
  background: transparent; border: 1px solid var(--rule);
  width: 22px; height: 22px; border-radius: 50%;
  color: var(--mute); cursor: pointer; line-height: 1;
}
.passiv-example {
  margin: 4px 0 12px; font-size: 13px; color: var(--mute);
  font-family: var(--font-body); font-style: italic;
}
.passiv-example-text { color: var(--ink-soft); }
.passiv-active {
  font-family: var(--font-display); font-style: italic;
  font-size: 22px; line-height: 1.5; color: var(--ink); margin-bottom: 18px;
}
.passiv-input-row { display: flex; }
.passiv-input {
  flex: 1; border: 0; border-bottom: 2px solid var(--rule);
  font-family: var(--font-display); font-size: 22px;
  color: var(--accent); padding: 6px 6px;
  background: transparent; outline: none;
  transition: border-color .15s, color .15s;
}
.passiv-input:focus { border-bottom-color: var(--accent); }
.passiv-input.passiv-input-right { color: var(--success); border-bottom-color: var(--success); }
.passiv-input.passiv-input-partial { color: var(--warn, #b58800); border-bottom-color: var(--warn, #b58800); }
.passiv-input.passiv-input-wrong { color: var(--danger); border-bottom-color: var(--danger); }
.passiv-feedback {
  margin: 20px 0; padding: 14px 18px;
  background: var(--paper-deep); border-radius: 4px;
  border-left: 3px solid var(--accent);
  display: flex; flex-direction: column; gap: 10px;
}
.passiv-feedback-row { display: flex; gap: 12px; align-items: center; }
.passiv-verdict {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em;
  text-transform: uppercase; padding: 4px 8px; border-radius: 3px;
}
.passiv-verdict-correct { background: color-mix(in srgb, var(--success) 18%, transparent); color: var(--success); }
.passiv-verdict-partially_correct { background: color-mix(in srgb, var(--warn, #b58800) 18%, transparent); color: var(--warn, #b58800); }
.passiv-verdict-incorrect { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
.passiv-form-chip { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--mute); }
.passiv-form-ok { color: var(--success); }
.passiv-form-bad { color: var(--danger); }
.passiv-expected, .passiv-variants { font-size: 14px; }
.passiv-expected-label, .passiv-variants-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--mute); display: block;
}
.passiv-expected-text { font-family: var(--font-display); }
.passiv-variants ul { margin: 4px 0 0 16px; padding: 0; }
.passiv-rationale { font-size: 14px; line-height: 1.5; }
.passiv-rationale-author {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
}
.ai-actions { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
```

- [ ] **Step 3: Type-check + smoke**

Run:

```
npm run typecheck
```

Expected: no errors. With a valid Gemini key, run a 3-sentence session and confirm the target tag shows, the example popover toggles, the input grades, and a per-attempt verdict appears.

- [ ] **Step 4: Commit**

```bash
git add src/modules/passiv/QuizRunner.vue src/router.ts
git commit -m "feat(passiv): quiz runner with LLM judge + target tag UI"
```

---

## Task 17: Module 4 — QuizResult + route + history save

**Files:**
- Create: `src/modules/passiv/QuizResult.vue`
- Modify: `src/router.ts`

- [ ] **Step 1: Add the route**

```ts
  { path: '/passiv/quiz/result', name: 'passiv-quiz-result', component: () => import('./modules/passiv/QuizResult.vue') }
```

- [ ] **Step 2: Create the result page**

Create `src/modules/passiv/QuizResult.vue`:

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { saveQuizRun } from '../../composables/useQuizHistory'
import {
  TRANSFORMATION_LABELS,
  type PassivDifficulty,
  type PassivJudgeResult,
  type PassivQuestion,
  type TransformationType
} from '../../data/passiv'

interface ResultEntry {
  entry: PassivQuestion
  userInput: string
  judgement: PassivJudgeResult | null
}

interface StashedResult {
  questions: ResultEntry[]
  correct: number
  total: number
  difficulty: PassivDifficulty
  focusTypes: TransformationType[]
  perType: Record<string, { correct: number; total: number }>
  startedAt: number
  finishedAt: number
}

const router = useRouter()
const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<StashedResult | null>(null)
const historySaved = ref(false)

onMounted(() => {
  try {
    const raw = sessionStorage.getItem('gt:lastPassivResult')
    if (!raw) {
      error.value = 'No result data — start a session from setup.'
      return
    }
    data.value = JSON.parse(raw) as StashedResult
    if (!historySaved.value && data.value) {
      historySaved.value = true
      saveQuizRun({
        type: 'passiv-transform',
        startedAt: new Date(data.value.startedAt).toISOString(),
        finishedAt: new Date(data.value.finishedAt).toISOString(),
        durationMs: data.value.finishedAt - data.value.startedAt,
        count: data.value.total,
        correct: data.value.correct,
        meta: {
          passivDifficulty: data.value.difficulty,
          passivFocusedTypes: data.value.focusTypes,
          passivPerTypeCorrect: data.value.perType
        }
      })
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load result.'
  } finally {
    loading.value = false
  }
})

const partial = computed(() =>
  data.value?.questions.filter(q => q.judgement?.verdict === 'partially_correct').length ?? 0
)
const incorrect = computed(() =>
  data.value?.questions.filter(q => q.judgement?.verdict === 'incorrect').length ?? 0
)
const pct = computed(() => {
  if (!data.value || data.value.total === 0) return 0
  return Math.round((data.value.correct / data.value.total) * 100)
})

const perTypeRows = computed(() => {
  if (!data.value) return []
  return Object.entries(data.value.perType).map(([type, c]) => ({
    type: type as TransformationType,
    label: TRANSFORMATION_LABELS[type as TransformationType] ?? type,
    correct: c.correct,
    total: c.total
  }))
})

function backHome() { router.push({ name: 'passiv' }) }
function newRun() { router.push({ name: 'passiv-quiz' }) }
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>
  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="backHome">← Back</button>
  </div>
  <div v-else-if="data" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Passiv</div>
        <div class="result-score">{{ data.correct }}<span class="denom"> / {{ data.total }}</span></div>
        <p class="section-subtitle">
          {{ data.total }} active-to-passive transformations · difficulty {{ data.difficulty }}.
        </p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="backHome">Home</button>
        <button class="btn btn-accent" type="button" @click="newRun">Start another session <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="verb-result-summary">
      <div class="vrs-cell is-correct">
        <div class="vrs-num">{{ data.correct }}</div>
        <div class="vrs-label">Richtig · correct</div>
      </div>
      <div class="vrs-cell is-partial">
        <div class="vrs-num">{{ partial }}</div>
        <div class="vrs-label">Teilweise · partial</div>
      </div>
      <div class="vrs-cell is-wrong">
        <div class="vrs-num">{{ incorrect }}</div>
        <div class="vrs-label">Falsch · missed</div>
      </div>
      <div class="vrs-cell">
        <div class="vrs-num">{{ pct }}<span class="vrs-pct-suffix">%</span></div>
        <div class="vrs-label">Quote · score</div>
      </div>
    </div>

    <section class="per-type-section">
      <h3 class="per-type-title">Per transformation type</h3>
      <ul class="per-type-list">
        <li v-for="row in perTypeRows" :key="row.type">
          <span class="ptl-label">{{ row.label }}</span>
          <span class="ptl-count">{{ row.correct }} / {{ row.total }}</span>
        </li>
      </ul>
    </section>

    <div class="verb-result-list">
      <div v-for="(q, i) in data.questions" :key="i"
        class="verb-result-card"
        :class="q.judgement?.verdict === 'correct' ? 'is-correct' : q.judgement?.verdict === 'partially_correct' ? 'is-partial' : 'is-wrong'">
        <div class="verb-result-num"># {{ String(i + 1).padStart(2, '0') }}</div>
        <div class="verb-result-prompt">
          <div class="vrp-german">{{ q.entry.active }}</div>
          <div class="passiv-result-target">Target: {{ TRANSFORMATION_LABELS[q.entry.target] }}</div>
          <div class="passiv-result-ref">{{ q.entry.referenceAnswer }}</div>
        </div>
        <div class="verb-result-answers">
          <div class="verb-result-line">
            <span class="vrl-label">Du</span>
            <span class="vrl-value">
              <span class="vr-stamp" :class="q.judgement?.verdict === 'correct' ? 'vr-stamp-right' : 'vr-stamp-wrong'">{{ q.userInput || '—' }}</span>
            </span>
          </div>
          <div v-if="q.judgement" class="passiv-result-feedback">{{ q.judgement.feedback }}</div>
        </div>
        <div class="verb-result-mark">{{ q.judgement?.verdict === 'correct' ? '✓' : q.judgement?.verdict === 'partially_correct' ? '~' : '✗' }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.vrs-pct-suffix { font-size: 18px; color: var(--mute); margin-left: 2px; }
.vrs-cell.is-partial .vrs-num { color: var(--warn, #b58800); }
.per-type-section { margin: 24px 0; }
.per-type-title { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mute); margin-bottom: 12px; }
.per-type-list { list-style: none; padding: 0; margin: 0; }
.per-type-list li { display: flex; align-items: baseline; gap: 16px; padding: 6px 0; border-bottom: 1px solid var(--hairline); font-size: 14px; }
.ptl-label { font-family: var(--font-display); }
.ptl-count { margin-left: auto; font-family: var(--font-mono); font-size: 12px; color: var(--mute); font-variant-numeric: tabular-nums; }
.passiv-result-target { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); margin-top: 4px; }
.passiv-result-ref { font-family: var(--font-display); font-style: italic; font-size: 14px; color: var(--ink-soft); margin-top: 4px; }
.passiv-result-feedback { margin-top: 6px; font-size: 13px; line-height: 1.5; color: var(--ink-soft); }
</style>
```

- [ ] **Step 3: Type-check**

Run:

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Manual smoke — full Passiv flow**

`npm run dev`. Run a 3-sentence Passiv session end to end and verify:
1. The result page shows the per-type breakdown.
2. `/history` shows a row labelled "Passiv transformation".

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/modules/passiv/QuizResult.vue src/router.ts
git commit -m "feat(passiv): quiz result page + per-type breakdown + history save"
```

---

## Task 18: README cleanup + final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the README**

Open `README.md`. Replace its current content with:

```markdown
# German Trainer

A personal-use Vue 3 SPA for practicing German vocabulary and grammar.

## Modules

- **Nouns** — quiz the gender (`der`/`die`/`das`) or English translation of German nouns, grouped by theme.
- **Adjectives** — fill-in-the-blank quiz with sentences generated on demand by Gemini.
- **Verbs** — translation and conjugation drills across all tenses, plus a twelve-chapter grammar cheatsheet.
- **Prepositions** — case, article, and two-way preposition drills.
- **Declension** — tables reference plus case/article/adjective/pronoun/recognition drills, including an AI-driven article-in-context mode.
- **Konjunktiv I** — rewrite direct-speech quotes as reported speech, judged by Gemini against the canonical K-I form (or K-II fallback).
- **Passiv** — transform active sentences into a specific passive form (Vorgangs-, Zustands-, sich-lassen, sein-zu, -bar-Adjektiv, or man-Konstruktion), judged by Gemini.
- **History** — every run is logged locally; charts visualise per-type accuracy and study cadence.

## Stack

Vue 3, Vite, TypeScript, Vue Router, Dexie (IndexedDB), `@google/genai` for the Gemini API. All persistence is local; the Gemini API is called directly from the browser.

## Setup

```
npm install
npm run dev
```

Open the app, go to **Settings**, paste your Gemini API key, and click **Test connection**. The default model is `gemini-2.5-flash`.

## Security

This app is for personal use on personal machines only. The API key sits in IndexedDB and is sent direct to Google. Anyone with access to your browser profile can read it. **Do not deploy this as a public site** — there is no backend proxy.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server. |
| `npm run build` | Type-check and produce a production build in `dist/`. |
| `npm run preview` | Serve the production build. |
| `npm run typecheck` | Type-check without emitting. |
| `npm test` | Run Vitest unit tests. |
| `npm run test:watch` | Vitest in watch mode. |

## Adding entries

The seed lists in `src/data/*.seed.json` are loaded on first run. After that, manage entries via the **Manage nouns** / **Manage adjectives** screens. Use **Reset to defaults** to wipe and re-seed (with confirmation).

## Specs / plans

See the latest specs and plans in `docs/superpowers/specs/` and `docs/superpowers/plans/`.
```

- [ ] **Step 2: Final verification — full test suite + typecheck**

Run:

```
npm test
npm run typecheck
```

Expected: all tests PASS, no type errors.

- [ ] **Step 3: Final verification — manual smoke against Definition of Done**

`npm run dev`. With a valid Gemini key configured:

1. From `/`, click the new **Indirect speech** tile → setup → Generate & start. Run a 5-question session through to the result page. Observe at least one of each verdict (correct, partially_correct, incorrect) — submit a deliberately wrong answer on one question to force `incorrect`, a K-II answer where K-I is preferred to provoke `partially_correct`.
2. From `/`, click the new **Passiv transformations** tile → setup → Generate & start. Run a 5-question session through to the result page. Verify the per-type breakdown matches the sum of correct verdicts.
3. Navigate to `/history`. Confirm both new run types appear with the correct labels.

Stop the dev server. If any of the above fails, fix and re-run.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): rewrite for current modules + Gemini reality"
```

---

## Definition of done (mirrors spec §9)

- [ ] Both modules ship as routes; tile entry points work from `/`.
- [ ] Setup → run → result flow lands without console errors.
- [ ] `npm test` passes (validator + retry + judge-fallback tests).
- [ ] `npm run typecheck` passes.
- [ ] Manual smoke completed for both modules; correct, partially_correct, and incorrect verdicts each observed at least once.
- [ ] History entries visible in `/history` for both new modules.
- [ ] README reflects Gemini reality.
