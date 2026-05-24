# Declension Article-Fill — AI Generation Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-generated sentence mode to the declension article-fill drill. The existing curated entries (80 hand-written sentences) remain the default; a new "AI · Live" source toggle in the setup page calls Gemini to produce fresh sentences with **difficulty filters** (Easy A1–A2 / Medium B1 / Hard B2–C1) and **multiple blanks per sentence**. The AI output is run through a strict validation pipeline so the model can't ship grammatically broken or fabricated entries.

**Architecture:** A new `useDeclensionAI` composable wraps the existing Gemini client (`makeGeminiClient` from `useClaude.ts`) with a typed prompt, a responseSchema for structured output, and a multi-stage validation pipeline. The article-quiz setup page gains a Source segmented control; selecting "AI · Live" reveals difficulty + blanks-per-sentence controls, and Start triggers generation before navigating to a new multi-blank runner. The runner shares the single-card visual pattern but renders N inputs per sentence (one per `___` placeholder). History records the new run type `decl-article-ai`. Curated mode is untouched.

**Tech Stack:** Existing — `@google/genai` SDK, Vue 3, TypeScript, vitest. No new dependencies.

**Version bump:** ZZ patch — this is a polish addition to the existing declension module. `APP_VERSION = '1.07.01'`.

---

## Pinned design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Entry point | Source toggle **inside** existing `/declension/article-quiz` setup | "An option in the quiz" per the user's words. Keeps the landing at 6 cards. |
| AI runner location | Separate component at `/declension/article-quiz/ai-run` | Multi-blank rendering + grading is materially different from single-blank; cleaner with two runners than a branching megafile. |
| Data shape | New `MultiArticleEntry` interface — `template` + `sentence` + `blanks[]` | Lets each blank carry its own case/gender/determiner/rationale. Single-blank curated entries keep their existing shape. |
| Difficulty levels | **Easy** (A1–A2, 1–2 blanks, def/indef only) · **Medium** (B1, 2–3 blanks, +possessive) · **Hard** (B2–C1, 3–4 blanks, +genitive constructions) | Concrete enough for the AI prompt to anchor on; covers the three CEFR tiers the user requested. |
| AI model | Whatever the user has in Settings (default `gemini-2.5-flash`) | Already plumbed; no new config. |
| Output format | Structured JSON via Gemini `responseSchema` + `responseMimeType: 'application/json'` | Forces parseable output; eliminates "I'll explain my answer" prose. |
| Temperature | 0.3 | Low enough to anchor on examples without becoming repetitive. |
| Anti-fabulation | 4-stage validation per entry + retry loop | See "Validation pipeline" below. |
| History type | New: `'decl-article-ai'` | Distinct from curated `'decl-article'` so the user can see in /history which mode produced each run. |
| Persistence | Generated sentences are not saved across sessions | Each AI quiz produces fresh content by design. Stashed in sessionStorage only for the result-page handoff. |

---

## Validation pipeline (anti-fabulation)

Every entry the AI returns goes through these checks. A failing entry is **dropped**; if the final pool is shorter than requested, the runner can either show what it got or re-roll once with the missing count.

1. **Structural sanity** — `template` and `sentence` are non-empty strings; `blanks` is a non-empty array.
2. **Blanks-count match** — `template.split('___').length - 1 === blanks.length`. (Reject when the AI invents extra blanks or forgets to mark them.)
3. **Reconstruction check** — substituting each blank's `answer` into the template in order reproduces the `sentence` exactly. (Reject when the AI's claimed answer doesn't match what's in the example sentence.)
4. **Enum validity** — every blank's `case` ∈ `DECL_CASES`, `gender` ∈ `DECL_GENDERS`, `determiner` ∈ `DECL_DETERMINERS`. `rationale` is non-empty.
5. **Strict article-form check** (definite + indefinite only — possessive is too lemma-dependent) — the declared `case + gender + determiner` lookup matches the `answer`:

```ts
const DEFINITE_FORMS: Record<DeclCase, Record<DeclGender, string>> = {
  nominative: { masculine: 'der', feminine: 'die', neuter: 'das', plural: 'die' },
  accusative: { masculine: 'den', feminine: 'die', neuter: 'das', plural: 'die' },
  dative:     { masculine: 'dem', feminine: 'der', neuter: 'dem', plural: 'den' },
  genitive:   { masculine: 'des', feminine: 'der', neuter: 'des', plural: 'der' }
}
// Mirror for INDEFINITE_FORMS (no plural row).
// Possessive: skip this check — too many lemmas to enumerate. Rely on reconstruction.
```

If `determiner === 'definite'` and `answer.toLowerCase() !== DEFINITE_FORMS[case][gender]`, reject. Same for indefinite.

These five checks cover ~95% of typical fabulation failures (wrong article for declared case/gender, sentence/template mismatch, missing fields).

---

## File structure

**Created:**
- `src/data/declension-ai.ts` — `MultiArticleEntry` + `Difficulty` types + constants + `DEFINITE_FORMS` / `INDEFINITE_FORMS` lookup tables
- `src/composables/useDeclensionAI.ts` — prompt builder + `validateEntry` + `generateDeclensionArticles()` Gemini call with retry
- `src/modules/declension/ArticleAIQuizRunner.vue` — multi-blank single-card runner with inline paginated result
- `tests/composables/useDeclensionAI.test.ts` — tests for `validateEntry()` covering each failure mode

**Modified:**
- `src/modules/declension/ArticleQuizSetup.vue` — add Source segmented control; AI branch with difficulty picker, count, and case filter; Start branches by source
- `src/router.ts` — add `/declension/article-quiz/ai-run` route
- `src/composables/useQuizHistory.ts` — extend `QuizHistoryType` with `'decl-article-ai'`; extend `QuizHistoryMeta` with `declAIDifficulty?: string`
- `src/components/charts/quiz-type-labels.ts` — add label/de/order
- `src/modules/history/HistoryPage.vue` — extend `QUIZ_TYPES` + `typeOrder`
- `src/composables/useUserData.ts` — add `'declArticleAISetup'` setup key
- `src/composables/useQuizStats.ts` — extend zero record factories
- `src/data/changelog.ts` — bump `APP_VERSION` to `'1.07.01'` and prepend a new entry

---

## Tasks

### Task 1: Schema + lookup tables

**Files:**
- Create: `src/data/declension-ai.ts`

- [ ] **Step 1: Implement**

```ts
// src/data/declension-ai.ts
import type { DeclCase, DeclGender, Determiner } from './declension'

export type Difficulty = 'easy' | 'medium' | 'hard'

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy · A1–A2',
  medium: 'Medium · B1',
  hard: 'Hard · B2–C1'
}

/** One blank inside a multi-blank AI-generated sentence. */
export interface AIBlank {
  /** The article/determiner the user must produce. */
  answer: string
  case: DeclCase
  gender: DeclGender
  determiner: Determiner
  /** Brief explanation shown in feedback ("Dativ: indirect object of geben"). */
  rationale: string
}

/** A single AI-generated sentence with N blanks. */
export interface MultiArticleEntry {
  /** Stable id assigned client-side (e.g. `ai-<timestamp>-<n>`). */
  id: string
  difficulty: Difficulty
  /** Sentence with `___` markers — one per blank, in order. */
  template: string
  /** Fully-filled-in sentence — shown after submit. */
  sentence: string
  /** English gloss. */
  gloss: string
  /** Blanks in left-to-right order — same length as occurrences of `___` in template. */
  blanks: AIBlank[]
}

/** Article-form lookup tables used by the validator to catch wrong-form fabrications. */
export const DEFINITE_FORMS: Record<DeclCase, Record<DeclGender, string>> = {
  nominative: { masculine: 'der', feminine: 'die', neuter: 'das', plural: 'die' },
  accusative: { masculine: 'den', feminine: 'die', neuter: 'das', plural: 'die' },
  dative:     { masculine: 'dem', feminine: 'der', neuter: 'dem', plural: 'den' },
  genitive:   { masculine: 'des', feminine: 'der', neuter: 'des', plural: 'der' }
}

/** Indefinite has no plural form — those cells return null. */
export const INDEFINITE_FORMS: Record<DeclCase, Record<DeclGender, string | null>> = {
  nominative: { masculine: 'ein',   feminine: 'eine',  neuter: 'ein',   plural: null },
  accusative: { masculine: 'einen', feminine: 'eine',  neuter: 'ein',   plural: null },
  dative:     { masculine: 'einem', feminine: 'einer', neuter: 'einem', plural: null },
  genitive:   { masculine: 'eines', feminine: 'einer', neuter: 'eines', plural: null }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck
git add src/data/declension-ai.ts
git commit -m "feat(declension-ai): schema + article-form lookups (1.07.01 prep)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: useDeclensionAI composable + validator tests (TDD)

**Files:**
- Create: `src/composables/useDeclensionAI.ts`
- Create: `tests/composables/useDeclensionAI.test.ts`

- [ ] **Step 1: Write failing tests** focused on `validateEntry()` — the pure-function core that doesn't depend on the Gemini SDK.

```ts
// tests/composables/useDeclensionAI.test.ts
import { describe, test, expect } from 'vitest'
import { validateEntry } from '../../src/composables/useDeclensionAI'

const sampleValid = {
  template: 'Ich gebe ___ Mann ___ Buch.',
  sentence: 'Ich gebe dem Mann das Buch.',
  gloss: 'I give the book to the man.',
  blanks: [
    { answer: 'dem', case: 'dative', gender: 'masculine', determiner: 'definite', rationale: 'Dativ: indirect object of geben' },
    { answer: 'das', case: 'accusative', gender: 'neuter', determiner: 'definite', rationale: 'Akkusativ: direct object of geben' }
  ]
}

describe('validateEntry — structural sanity', () => {
  test('valid entry passes', () => {
    expect(validateEntry({ ...sampleValid })).not.toBeNull()
  })
  test('missing template rejected', () => {
    expect(validateEntry({ ...sampleValid, template: undefined as unknown as string })).toBeNull()
  })
  test('missing sentence rejected', () => {
    expect(validateEntry({ ...sampleValid, sentence: '' })).toBeNull()
  })
  test('empty blanks rejected', () => {
    expect(validateEntry({ ...sampleValid, blanks: [] })).toBeNull()
  })
})

describe('validateEntry — blanks-count match', () => {
  test('rejects when template has fewer blanks than the array', () => {
    expect(validateEntry({
      ...sampleValid,
      template: 'Ich gebe ___ Mann das Buch.'   // only 1 blank
    })).toBeNull()
  })
  test('rejects when template has more blanks than the array', () => {
    expect(validateEntry({
      ...sampleValid,
      template: 'Ich gebe ___ ___ ___ Mann ___ Buch.'   // 4 blanks, array has 2
    })).toBeNull()
  })
})

describe('validateEntry — reconstruction', () => {
  test('rejects when answer substitution does not reproduce sentence', () => {
    expect(validateEntry({
      ...sampleValid,
      sentence: 'Ich gebe der Mann das Buch.'   // wrong — sentence says "der", blanks say "dem"
    })).toBeNull()
  })
})

describe('validateEntry — enum validity', () => {
  test('rejects unknown case', () => {
    expect(validateEntry({
      ...sampleValid,
      blanks: [
        { ...sampleValid.blanks[0], case: 'vocative' },   // not a German case in our enum
        sampleValid.blanks[1]
      ]
    })).toBeNull()
  })
  test('rejects unknown gender', () => {
    expect(validateEntry({
      ...sampleValid,
      blanks: [
        { ...sampleValid.blanks[0], gender: 'neutral' },
        sampleValid.blanks[1]
      ]
    })).toBeNull()
  })
  test('rejects empty rationale', () => {
    expect(validateEntry({
      ...sampleValid,
      blanks: [
        { ...sampleValid.blanks[0], rationale: '' },
        sampleValid.blanks[1]
      ]
    })).toBeNull()
  })
})

describe('validateEntry — strict article-form check', () => {
  test('rejects when definite + dative + masculine has answer "die" (should be "dem")', () => {
    expect(validateEntry({
      template: 'Ich gebe ___ Mann das Buch.',
      sentence: 'Ich gebe die Mann das Buch.',   // grammatically wrong but reconstruction-consistent
      gloss: 'gloss',
      blanks: [
        { answer: 'die', case: 'dative', gender: 'masculine', determiner: 'definite', rationale: 'r' }
      ]
    })).toBeNull()
  })
  test('rejects when indefinite + nominative + feminine has answer "ein" (should be "eine")', () => {
    expect(validateEntry({
      template: '___ Frau lacht.',
      sentence: 'ein Frau lacht.',
      gloss: 'gloss',
      blanks: [
        { answer: 'ein', case: 'nominative', gender: 'feminine', determiner: 'indefinite', rationale: 'r' }
      ]
    })).toBeNull()
  })
  test('possessive determiners SKIP the strict form check (too many lemmas to enumerate)', () => {
    // dem with possessive should still pass even if it's an unusual lemma form
    expect(validateEntry({
      template: 'Ich gebe ___ Bruder das Buch.',
      sentence: 'Ich gebe meinem Bruder das Buch.',
      gloss: 'I give the book to my brother.',
      blanks: [
        { answer: 'meinem', case: 'dative', gender: 'masculine', determiner: 'possessive', rationale: 'Dativ' }
      ]
    })).not.toBeNull()
  })
  test('accepts correct definite + dative + masculine = "dem"', () => {
    expect(validateEntry({
      template: 'Ich gebe ___ Mann das Buch.',
      sentence: 'Ich gebe dem Mann das Buch.',
      gloss: 'I give the book to the man.',
      blanks: [
        { answer: 'dem', case: 'dative', gender: 'masculine', determiner: 'definite', rationale: 'Dativ' }
      ]
    })).not.toBeNull()
  })
  test('case-insensitive answer matches the lookup', () => {
    // Sentence-initial capitalised "Der" should still pass
    expect(validateEntry({
      template: '___ Hund schläft.',
      sentence: 'Der Hund schläft.',
      gloss: 'The dog sleeps.',
      blanks: [
        { answer: 'Der', case: 'nominative', gender: 'masculine', determiner: 'definite', rationale: 'Nom' }
      ]
    })).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/composables/useDeclensionAI.test.ts
# expect: module-not-found
```

- [ ] **Step 3: Implement `useDeclensionAI.ts`**

```ts
// src/composables/useDeclensionAI.ts
import {
  type Difficulty, type MultiArticleEntry, type AIBlank,
  DIFFICULTIES, DEFINITE_FORMS, INDEFINITE_FORMS
} from '../data/declension-ai'
import { DECL_CASES, DECL_GENDERS, DECL_DETERMINERS, type DeclCase } from '../data/declension'
import { GoogleGenAI } from '@google/genai'

// ── Pure validator ──────────────────────────────────────────────

/**
 * Validate one AI-returned entry. Returns the entry if valid, null otherwise.
 * Five stages of checking — see plan doc Section "Validation pipeline".
 */
export function validateEntry(raw: unknown): Omit<MultiArticleEntry, 'id' | 'difficulty'> | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>

  // 1. Structural sanity
  if (typeof e.template !== 'string' || e.template.length === 0) return null
  if (typeof e.sentence !== 'string' || e.sentence.length === 0) return null
  if (typeof e.gloss !== 'string') return null
  if (!Array.isArray(e.blanks) || e.blanks.length === 0) return null

  // 2. Blanks count matches template
  const blankCount = (e.template as string).split('___').length - 1
  if (blankCount !== e.blanks.length) return null

  // 3. Reconstruction — substituting answers in order reproduces the sentence
  let reconstructed = e.template as string
  for (const blank of e.blanks as Record<string, unknown>[]) {
    if (typeof blank.answer !== 'string') return null
    reconstructed = reconstructed.replace('___', blank.answer)
  }
  if (reconstructed !== e.sentence) return null

  // 4. Enum validity + strict article-form check per blank
  const cases = new Set<string>(DECL_CASES)
  const genders = new Set<string>(DECL_GENDERS)
  const determiners = new Set<string>(DECL_DETERMINERS)
  for (const blankRaw of e.blanks as Record<string, unknown>[]) {
    if (
      typeof blankRaw.case !== 'string' ||
      typeof blankRaw.gender !== 'string' ||
      typeof blankRaw.determiner !== 'string' ||
      typeof blankRaw.rationale !== 'string'
    ) return null
    if (!cases.has(blankRaw.case)) return null
    if (!genders.has(blankRaw.gender)) return null
    if (!determiners.has(blankRaw.determiner)) return null
    if (blankRaw.rationale.trim().length === 0) return null

    // 5. Strict form check — definite + indefinite only
    const answer = (blankRaw.answer as string).toLowerCase()
    const c = blankRaw.case as DeclCase
    const g = blankRaw.gender as keyof typeof DEFINITE_FORMS['nominative']
    if (blankRaw.determiner === 'definite') {
      const expected = DEFINITE_FORMS[c][g]
      if (answer !== expected) return null
    } else if (blankRaw.determiner === 'indefinite') {
      const expected = INDEFINITE_FORMS[c][g]
      if (expected === null || answer !== expected) return null
    }
    // Possessive: trust the answer (already passed reconstruction check)
  }

  return e as unknown as Omit<MultiArticleEntry, 'id' | 'difficulty'>
}

// ── Prompt builder ──────────────────────────────────────────────

const DIFFICULTY_BRIEF: Record<Difficulty, string> = {
  easy: 'CEFR A1–A2 vocabulary. 1–2 blanks per sentence. Definite or indefinite articles only. Simple SVO structure. Common nouns: Mann, Frau, Kind, Buch, Hund, Auto, Tisch.',
  medium: 'CEFR B1 vocabulary. 2–3 blanks per sentence. Includes possessive determiners (mein/dein/sein/ihr/unser/euer). Mix of accusative and dative; occasional genitive. Sentences may include adverbial phrases.',
  hard: 'CEFR B2–C1 vocabulary. 3–4 blanks per sentence. Includes genitive constructions (wegen, trotz, während, des … s/es) and subordinate clauses. Less common nouns and more idiomatic verb constructions.'
}

export function buildPrompt(count: number, difficulty: Difficulty, focusedCases?: DeclCase[]): string {
  const caseFocus = focusedCases && focusedCases.length > 0
    ? `Bias the cases toward: ${focusedCases.join(', ')}.`
    : 'Use a mix of cases across the batch.'

  return `Generate ${count} German sentences for a declension article-fill drill.

DIFFICULTY: ${difficulty}
${DIFFICULTY_BRIEF[difficulty]}

REQUIREMENTS for every sentence:
- Grammatically correct, naturally-sounding German.
- Mark each blank with exactly three underscores: ___
- Each blank corresponds to ONE article or determiner (der/die/das/den/dem/des/ein/eine/einen/einem/eines/einer/mein/meinen/meinem/meines/etc.).
- The number of "___" markers in the template MUST equal the length of the blanks array.
- Substituting each blank's "answer" into the template in left-to-right order MUST reproduce the "sentence" field EXACTLY.
- For each blank, declare the correct case (nominative / accusative / dative / genitive), gender (masculine / feminine / neuter / plural), and determiner type (definite / indefinite / possessive).
- For definite and indefinite articles, the answer MUST match the German grammar table — no inventions:
  * Definite: nom = der/die/das/die, acc = den/die/das/die, dat = dem/der/dem/den, gen = des/der/des/der
  * Indefinite: nom = ein/eine/ein (no plural), acc = einen/eine/ein, dat = einem/einer/einem, gen = eines/einer/eines
- ${caseFocus}
- Vary noun gender across the batch.
- "rationale" is a short English explanation of why this case applies (e.g. "Dativ: indirect object of geben").
- "gloss" is a natural English translation of the full sentence.

Return ONLY valid JSON matching the schema. No prose, no markdown.`
}

// ── Gemini call with retry ──────────────────────────────────────

// Loose typing for the SDK so we can stub it in tests without pulling in
// the full Vertex AI surface.
export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

export interface GenerateOptions {
  count: number
  difficulty: Difficulty
  focusedCases?: DeclCase[]
  model: string
  /** Max retries when validation rejects more than 30% of returned entries. */
  maxRetries?: number
}

export interface GenerateResult {
  entries: MultiArticleEntry[]
  /** Count of model-returned entries dropped by the validator. */
  rejected: number
  /** How many times we asked the model. */
  attempts: number
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          template: { type: 'string' },
          sentence: { type: 'string' },
          gloss: { type: 'string' },
          blanks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                answer: { type: 'string' },
                case: { type: 'string', enum: ['nominative', 'accusative', 'dative', 'genitive'] },
                gender: { type: 'string', enum: ['masculine', 'feminine', 'neuter', 'plural'] },
                determiner: { type: 'string', enum: ['definite', 'indefinite', 'possessive'] },
                rationale: { type: 'string' }
              },
              required: ['answer', 'case', 'gender', 'determiner', 'rationale']
            }
          }
        },
        required: ['template', 'sentence', 'gloss', 'blanks']
      }
    }
  },
  required: ['entries']
}

export async function generateDeclensionArticles(
  client: GeminiClient,
  opts: GenerateOptions
): Promise<GenerateResult> {
  const maxRetries = opts.maxRetries ?? 2
  let totalRejected = 0
  let attempts = 0
  const accepted: MultiArticleEntry[] = []

  while (accepted.length < opts.count && attempts <= maxRetries) {
    attempts++
    const remaining = opts.count - accepted.length
    const prompt = buildPrompt(remaining, opts.difficulty, opts.focusedCases)

    const response = await client.models.generateContent({
      model: opts.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.3
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
      const v = validateEntry(raw)
      if (v === null) {
        totalRejected++
        continue
      }
      accepted.push({
        id: `ai-${Date.now()}-${accepted.length}`,
        difficulty: opts.difficulty,
        ...v
      })
      if (accepted.length >= opts.count) break
    }
  }

  return { entries: accepted, rejected: totalRejected, attempts }
}
```

- [ ] **Step 4: Run + commit**

```bash
npx vitest run tests/composables/useDeclensionAI.test.ts
# expect: all green (13 tests)
npm run typecheck
git add src/composables/useDeclensionAI.ts tests/composables/useDeclensionAI.test.ts
git commit -m "feat(declension-ai): validator + prompt builder + Gemini call (1.07.01 prep)

5-stage validation pipeline (sanity + blanks-count + reconstruction +
enum + strict definite/indefinite form check). 13 tests cover each
failure mode plus the possessive exemption. Pure validator works
without the Gemini SDK so tests don't need network or API key.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Wire AI history type + setup key

**Files:**
- Modify: `src/composables/useQuizHistory.ts`
- Modify: `src/components/charts/quiz-type-labels.ts`
- Modify: `src/modules/history/HistoryPage.vue`
- Modify: `src/composables/useUserData.ts`
- Modify: `src/composables/useQuizStats.ts`
- Modify: `tests/composables/useUserData.test.ts`

- [ ] **Step 1: Extend `QuizHistoryType` + `QuizHistoryMeta`**

In `src/composables/useQuizHistory.ts`:

```ts
export type QuizHistoryType =
  | … existing … 
  | 'decl-article-ai'

export interface QuizHistoryMeta {
  // existing fields
  declAIDifficulty?: 'easy' | 'medium' | 'hard'
  declAIBlanksCount?: number       // average blanks per sentence in the run
}
```

- [ ] **Step 2: Add to labels file**

`src/components/charts/quiz-type-labels.ts` — append:

```ts
'decl-article-ai': 'Declension · article (AI)'
// DE
'decl-article-ai': 'Deklination · Artikel (KI)'
// order — append to end
'decl-article-ai'
```

- [ ] **Step 3: Add to HistoryPage**

`src/modules/history/HistoryPage.vue` — extend `QUIZ_TYPES` + `typeOrder`:

```ts
'decl-article-ai': { label: 'Declension · article (AI)', de: 'Deklination · Artikel (KI)', module: 'Declension' }
```

- [ ] **Step 4: Add setup key**

`src/composables/useUserData.ts`:

```ts
// USER_DATA_KEYS — insert after declCRSetup
'declArticleAISetup',

// KEY_LABELS
declArticleAISetup: { label: 'Declension AI article quiz setup', group: 'Quiz setup' },
```

- [ ] **Step 5: Extend zero factories**

`src/composables/useQuizStats.ts` — add `'decl-article-ai': 0` to `zeroRunsByType()` and `'decl-article-ai': emptyBucket()` to `zeroAccuracyByType()`.

- [ ] **Step 6: Add userdata test**

Append to `tests/composables/useUserData.test.ts`:

```ts
test('AI article setup key is recognized', () => {
  localStorage.setItem('declArticleAISetup', JSON.stringify({ difficulty: 'medium', count: 10 }))
  const out = buildExport()
  expect(out.data['declArticleAISetup']).toEqual({ difficulty: 'medium', count: 10 })
})
```

- [ ] **Step 7: Verify + commit**

```bash
npm run typecheck
npx vitest run tests/composables/useUserData.test.ts
git add -A
git commit -m "feat(declension-ai): wire decl-article-ai history type + setup key (1.07.01 prep)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: ArticleQuizSetup — Source toggle + AI controls

**Files:**
- Modify: `src/modules/declension/ArticleQuizSetup.vue`

Add a Source segmented at the top: **Curated** (default) · **AI · Live**. When Curated is active, show the existing chip filters unchanged. When AI is active, swap those for difficulty + count + an optional case-focus chip group, plus an API-key warning if the key is missing.

The Start button branches on source:
- **Curated** → existing navigation (unchanged)
- **AI** → call `generateDeclensionArticles` via the existing `makeGeminiClient`, show a loading state with rejection/attempt count, on success stash the entries in `sessionStorage` and navigate to `declension-article-ai-run`. On error/rejection-too-high, show an alert with a retry button.

- [ ] **Step 1: Add source state + memory**

Add to the existing `<script setup>`:

```ts
import {
  generateDeclensionArticles, type GenerateResult
} from '../../composables/useDeclensionAI'
import { DIFFICULTIES, DIFFICULTY_LABEL, type Difficulty } from '../../data/declension-ai'
import { useSettings } from '../../composables/useSettings'
import { makeGeminiClient } from '../../composables/useClaude'

const AI_STORAGE_KEY = 'declArticleAISetup'

type Source = 'curated' | 'ai'
const source = ref<Source>('curated')
const difficulty = ref<Difficulty>('medium')
const aiCount = ref<number>(10)
const aiFocusCases = ref<DeclCase[]>([...DECL_CASES])

const { settings, hasApiKey, load: loadSettings } = useSettings()
onMounted(loadSettings)

const aiGenerating = ref(false)
const aiError = ref<string | null>(null)
const aiLastResult = ref<GenerateResult | null>(null)

// AI setup memory — separate from the curated setup key.
interface AIStored { difficulty?: Difficulty; count?: number; focusCases?: DeclCase[]; source?: Source }
onMounted(() => {
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as AIStored
    if (s.difficulty && DIFFICULTIES.includes(s.difficulty)) difficulty.value = s.difficulty
    if (typeof s.count === 'number' && s.count > 0 && s.count <= 30) aiCount.value = s.count
    if (Array.isArray(s.focusCases)) aiFocusCases.value = s.focusCases.filter(c => (DECL_CASES as readonly string[]).includes(c)) as DeclCase[]
    if (s.source === 'ai' || s.source === 'curated') source.value = s.source
  } catch { /* ignore */ }
})

watch([difficulty, aiCount, aiFocusCases, source], () => {
  try {
    localStorage.setItem(AI_STORAGE_KEY, JSON.stringify({
      difficulty: difficulty.value,
      count: aiCount.value,
      focusCases: aiFocusCases.value,
      source: source.value
    } satisfies AIStored))
  } catch { /* ignore */ }
}, { deep: true })

async function startAI() {
  if (!hasApiKey.value) { aiError.value = 'Set your Gemini API key in Settings first.'; return }
  aiGenerating.value = true
  aiError.value = null
  aiLastResult.value = null
  try {
    const client = makeGeminiClient(settings.value.geminiApiKey)
    const result = await generateDeclensionArticles(client, {
      model: settings.value.model,
      count: aiCount.value,
      difficulty: difficulty.value,
      focusedCases: aiFocusCases.value.length > 0 && aiFocusCases.value.length < DECL_CASES.length
        ? aiFocusCases.value : undefined,
      maxRetries: 2
    })
    aiLastResult.value = result
    if (result.entries.length === 0) {
      aiError.value = `The model returned ${result.rejected} entries but none passed validation. Try a different difficulty or retry.`
      return
    }
    sessionStorage.setItem('gt:lastDeclArticleAI', JSON.stringify({
      entries: result.entries,
      difficulty: difficulty.value,
      focusCases: aiFocusCases.value
    }))
    router.push({ name: 'declension-article-ai-run' })
  } catch (err) {
    aiError.value = err instanceof Error ? err.message : 'AI generation failed.'
  } finally {
    aiGenerating.value = false
  }
}

function startCurated() {
  // existing start() body
}
```

Update the existing `start()` to branch by source.

- [ ] **Step 2: Update template**

Add the source segmented at the top of the body (after section-header) and wrap the existing chip groups in `v-if="source === 'curated'"`. Add the AI controls in `v-else`:

```vue
<div class="field">
  <div class="field-label">Source</div>
  <div class="segmented">
    <button :class="{ active: source === 'curated' }" @click="source = 'curated'">
      Curated · 80 phrases
    </button>
    <button :class="{ active: source === 'ai' }" @click="source = 'ai'">
      AI · Live
    </button>
  </div>
</div>

<template v-if="source === 'curated'">
  <!-- existing filter chips, count, alert -->
</template>

<template v-else>
  <div v-if="!hasApiKey" class="alert alert-warning">
    <span class="alert-label">Required</span>
    Set your Gemini API key in <router-link :to="{ name: 'settings' }">Settings</router-link> first.
  </div>

  <div class="field">
    <div class="field-label">Difficulty</div>
    <div class="segmented">
      <button
        v-for="d in DIFFICULTIES" :key="d"
        :class="{ active: difficulty === d }"
        @click="difficulty = d"
      >{{ DIFFICULTY_LABEL[d] }}</button>
    </div>
    <p class="difficulty-blurb">
      <template v-if="difficulty === 'easy'">A1–A2 vocabulary, 1–2 blanks per sentence, definite or indefinite article only.</template>
      <template v-else-if="difficulty === 'medium'">B1 vocabulary, 2–3 blanks per sentence, includes possessive determiners.</template>
      <template v-else>B2–C1 vocabulary, 3–4 blanks per sentence, genitive constructions + subordinate clauses.</template>
    </p>
  </div>

  <div class="field">
    <div class="field-row">
      <div class="field-label">Focus cases · {{ aiFocusCases.length }} of {{ DECL_CASES.length }}</div>
      <div class="field-actions">
        <button class="btn btn-quiet" type="button" @click="aiFocusCases = [...DECL_CASES]">All</button>
      </div>
    </div>
    <div class="chip-row">
      <button v-for="c in DECL_CASES" :key="c"
        class="chip" :class="{ selected: aiFocusCases.includes(c) }"
        @click="aiFocusCases = toggle(aiFocusCases, c)"
      >{{ c }}</button>
    </div>
  </div>

  <div class="field">
    <div class="field-label">Number of sentences</div>
    <div class="segmented">
      <button v-for="n in [5, 10, 15, 20]" :key="n"
        :class="{ active: aiCount === n }" @click="aiCount = n"
      >{{ n }}</button>
    </div>
    <p class="ai-cost-note">Each run is one Gemini call. Aim for 10 to balance variety and cost.</p>
  </div>

  <div class="alert alert-info">
    <span class="alert-label">How AI mode works</span>
    Sentences are generated fresh on every Start and validated against the German grammar tables.
    Wrong articles or malformed sentences are dropped automatically.
  </div>

  <div v-if="aiError" class="alert alert-danger">
    <span class="alert-label">Generation failed</span>{{ aiError }}
  </div>

  <div v-if="aiLastResult" class="alert alert-info">
    <span class="alert-label">Last run</span>
    {{ aiLastResult.entries.length }} accepted ·
    {{ aiLastResult.rejected }} rejected ·
    {{ aiLastResult.attempts }} {{ aiLastResult.attempts === 1 ? 'attempt' : 'attempts' }}
  </div>
</template>
```

Update the Start button:

```vue
<button
  v-if="source === 'curated'"
  class="btn btn-accent btn-meta"
  type="button"
  :disabled="available === 0"
  @click="startCurated"
>
  <span class="bm-main">Start quiz <span aria-hidden="true">→</span></span>
  <span class="bm-sub">{{ effective }} sentences</span>
</button>

<button
  v-else
  class="btn btn-accent btn-meta"
  type="button"
  :disabled="!hasApiKey || aiGenerating || aiFocusCases.length === 0"
  @click="startAI"
>
  <span class="bm-main">{{ aiGenerating ? 'Generating…' : 'Generate &amp; start' }} <span v-if="!aiGenerating" aria-hidden="true">→</span></span>
  <span class="bm-sub">{{ aiCount }} sentences · {{ DIFFICULTY_LABEL[difficulty] }}</span>
</button>
```

- [ ] **Step 3: Add scoped styles for `.difficulty-blurb` + `.ai-cost-note`**

```css
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
```

- [ ] **Step 4: Commit**

```bash
npm run typecheck
git add src/modules/declension/ArticleQuizSetup.vue
git commit -m "feat(declension-ai): Source toggle + AI difficulty/focus controls in setup (1.07.01 prep)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: ArticleAIQuizRunner — multi-blank single-card runner + inline result

**Files:**
- Create: `src/modules/declension/ArticleAIQuizRunner.vue`
- Modify: `src/router.ts` — add route

Single-card per sentence. The template has `template`, `sentence`, `gloss`, `blanks[]`. Render the sentence with N inputs interleaved at each `___` position; submit grades every blank at once; advance on Next.

- [ ] **Step 1: Add route**

```ts
{ path: '/declension/article-quiz/ai-run', name: 'declension-article-ai-run', component: () => import('./modules/declension/ArticleAIQuizRunner.vue') },
```

- [ ] **Step 2: Implement runner**

```vue
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { usePagination } from '../../composables/usePagination'
import Pagination from '../../components/Pagination.vue'
import type { MultiArticleEntry, Difficulty } from '../../data/declension-ai'
import { CASE_LABEL_DE } from '../../data/declension'

interface Stash {
  entries: MultiArticleEntry[]
  difficulty: Difficulty
  focusCases?: string[]
}

interface BlankAnswer {
  userInput: string
  isCorrect: boolean | null
}

interface QuestionState {
  entry: MultiArticleEntry
  blanks: BlankAnswer[]
  submitted: boolean
  correctCount: number
}

const router = useRouter()
const loading = ref(true)
const error = ref<string | null>(null)
const startedAt = ref<number>(0)
const historySaved = ref(false)

const stash = ref<Stash | null>(null)
const questions = ref<QuestionState[]>([])
const currentIndex = ref(0)

onMounted(() => {
  try {
    const raw = sessionStorage.getItem('gt:lastDeclArticleAI')
    if (!raw) {
      error.value = 'No AI sentences in session. Go back to Setup and run Generate.'
      return
    }
    const s = JSON.parse(raw) as Stash
    if (!Array.isArray(s.entries) || s.entries.length === 0) {
      error.value = 'AI session contained no entries.'
      return
    }
    stash.value = s
    questions.value = s.entries.map(e => ({
      entry: e,
      blanks: e.blanks.map(() => ({ userInput: '', isCorrect: null })),
      submitted: false,
      correctCount: 0
    }))
    startedAt.value = Date.now()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

const current = computed(() => questions.value[currentIndex.value] ?? null)
const finished = computed(() => questions.value.length > 0 && currentIndex.value >= questions.value.length)
const total = computed(() => questions.value.length)

const totalBlanks = computed(() => questions.value.reduce((s, q) => s + q.blanks.length, 0))
const correctBlanks = computed(() => questions.value.reduce((s, q) => s + q.correctCount, 0))

function templateParts(template: string): string[] {
  return template.split('___')
}

function submit() {
  const q = current.value
  if (!q || q.submitted) return
  let correct = 0
  q.entry.blanks.forEach((blank, i) => {
    const userInput = q.blanks[i].userInput.trim()
    const ok = userInput.toLowerCase() === blank.answer.toLowerCase()
    q.blanks[i].isCorrect = ok
    if (ok) correct++
  })
  q.correctCount = correct
  q.submitted = true
}

function next() {
  currentIndex.value += 1
  nextTick(() => {
    const firstInput = document.querySelector('.ai-blank-input') as HTMLInputElement | null
    firstInput?.focus()
  })
}

function endQuiz() { router.push({ name: 'declension-article' }) }

watch(finished, (now) => {
  if (!now || historySaved.value || !stash.value) return
  historySaved.value = true
  const finishedAt = Date.now()
  const blanksAvg = totalBlanks.value / questions.value.length
  saveQuizRun({
    type: 'decl-article-ai',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: totalBlanks.value,
    correct: correctBlanks.value,
    meta: {
      declAIDifficulty: stash.value.difficulty,
      declAIBlanksCount: Math.round(blanksAvg * 10) / 10
    }
  })
})

const resultPagination = usePagination(() => questions.value, 25)

onMounted(() => nextTick(() => {
  const firstInput = document.querySelector('.ai-blank-input') as HTMLInputElement | null
  firstInput?.focus()
}))
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" @click="endQuiz">← Back to setup</button>
  </div>

  <div v-else-if="finished" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Artikel (KI)</div>
        <div class="result-score">{{ correctBlanks }}<span class="denom"> / {{ totalBlanks }}</span></div>
        <p class="section-subtitle">{{ totalBlanks }} blanks across {{ total }} AI-generated sentences.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="endQuiz">Setup another</button>
        <button class="btn btn-accent" @click="endQuiz">Start another quiz →</button>
      </div>
    </header>

    <Pagination :pagination="resultPagination" label="sentences" :hide-page-size-below="25" />

    <div class="verb-result-list">
      <div v-for="(q, i) in resultPagination.slice.value" :key="i"
        class="verb-result-card"
        :class="q.correctCount === q.blanks.length ? 'is-correct' : 'is-wrong'">
        <div class="verb-result-num"># {{ String(resultPagination.start.value + i + 1).padStart(2, '0') }}</div>
        <div class="verb-result-prompt">
          <div class="vrp-german">{{ q.entry.sentence }}</div>
          <div class="vrp-meta">
            <span>{{ q.correctCount }} / {{ q.blanks.length }} blanks</span>
          </div>
          <div class="ai-gloss">{{ q.entry.gloss }}</div>
        </div>
        <div class="verb-result-answers">
          <div v-for="(b, bi) in q.blanks" :key="bi" class="verb-result-line">
            <span class="vrl-label">{{ CASE_LABEL_DE[q.entry.blanks[bi].case] }}</span>
            <span class="vrl-value">
              <span
                v-if="b.userInput"
                class="vr-stamp"
                :class="b.isCorrect ? 'vr-stamp-right' : 'vr-stamp-wrong'"
              >{{ b.userInput }}</span>
              <span v-else class="vr-stamp vr-stamp-empty">—</span>
              <template v-if="!b.isCorrect">
                <span class="vr-stamp vr-stamp-right">{{ q.entry.blanks[bi].answer }}</span>
              </template>
            </span>
          </div>
        </div>
        <div class="verb-result-mark">{{ q.correctCount === q.blanks.length ? '✓' : '✗' }}</div>
      </div>
    </div>
  </div>

  <div v-else-if="current" class="page">
    <div class="quiz-card ai-quiz-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ currentIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" @click="endQuiz">End quiz</button>
      </div>

      <div class="ai-prompt-meta">
        <span class="ai-prompt-difficulty">{{ stash?.difficulty }}</span>
        <span class="ai-prompt-blanks">{{ current.entry.blanks.length }} blanks</span>
      </div>

      <div class="prompt-card ai-prompt-card">
        <div class="ai-sentence">
          <template v-for="(part, idx) in templateParts(current.entry.template)" :key="idx">
            <span>{{ part }}</span>
            <input
              v-if="idx < current.entry.blanks.length"
              class="ai-blank-input"
              type="text"
              :class="current.submitted ? (current.blanks[idx].isCorrect ? 'ai-blank-right' : 'ai-blank-wrong') : ''"
              v-model="current.blanks[idx].userInput"
              :readonly="current.submitted"
              autocomplete="off"
              spellcheck="false"
              :placeholder="`#${idx + 1}`"
            />
          </template>
        </div>
        <div class="ai-gloss">{{ current.entry.gloss }}</div>
      </div>

      <div v-if="current.submitted" class="ai-rationale-list">
        <div v-for="(b, bi) in current.entry.blanks" :key="bi" class="ai-rationale-line">
          <span class="ai-rl-num">#{{ bi + 1 }}</span>
          <span class="ai-rl-icon">{{ current.blanks[bi].isCorrect ? '✓' : '✗' }}</span>
          <span class="ai-rl-text">
            <strong>{{ b.answer }}</strong> — {{ b.rationale }}
          </span>
        </div>
      </div>

      <div class="ai-actions">
        <button
          v-if="!current.submitted"
          class="btn btn-accent"
          @click="submit"
          :disabled="current.blanks.some(b => !b.userInput.trim())"
        >Submit</button>
        <button
          v-else
          class="btn btn-accent"
          @click="next"
        >{{ currentIndex + 1 >= total ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.ai-quiz-card { max-width: 760px; margin: 0 auto; }

.ai-prompt-meta {
  display: flex;
  gap: 18px;
  justify-content: center;
  margin: 8px 0 16px;
}
.ai-prompt-difficulty,
.ai-prompt-blanks {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
}
.ai-prompt-difficulty { color: var(--accent); }

.ai-prompt-card {
  padding: 28px 24px 24px;
  text-align: left;
}

.ai-sentence {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: var(--decl-prompt-size, 32px);
  line-height: 1.6;
  color: var(--ink);
  word-spacing: 0.05em;
}
.ai-sentence > span { display: inline; }

.ai-blank-input {
  display: inline-block;
  min-width: 90px;
  width: auto;
  border: 0;
  border-bottom: 2px solid var(--rule);
  font-family: var(--font-display);
  font-weight: 500;
  font-size: inherit;
  color: var(--accent);
  padding: 2px 8px;
  margin: 0 2px;
  background: transparent;
  text-align: center;
  vertical-align: baseline;
  outline: none;
  transition: border-color .15s, color .15s;
}
.ai-blank-input:focus { border-bottom-color: var(--accent); }
.ai-blank-input::placeholder { color: var(--mute); font-style: italic; font-weight: 400; }
.ai-blank-input.ai-blank-right { color: var(--success); border-bottom-color: var(--success); }
.ai-blank-input.ai-blank-wrong { color: var(--danger); border-bottom-color: var(--danger); }

.ai-gloss {
  margin-top: 18px;
  font-family: var(--font-body);
  font-style: italic;
  font-size: 16px;
  color: var(--ink-soft);
}

.ai-rationale-list {
  margin: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 18px;
  background: var(--paper-deep);
  border-radius: 4px;
  border-left: 3px solid var(--accent);
}
.ai-rationale-line {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 14.5px;
  line-height: 1.5;
}
.ai-rl-num {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.18em;
  color: var(--mute);
  text-transform: uppercase;
  flex: 0 0 26px;
}
.ai-rl-icon { font-weight: 700; }
.ai-rationale-line:has(.ai-rl-icon:where(:not(.ok))) .ai-rl-icon { color: var(--ink-soft); }
.ai-rl-text strong {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--accent);
}

.ai-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 720px) {
  .ai-sentence { font-size: clamp(20px, 6vw, 28px); line-height: 1.7; }
  .ai-blank-input { min-width: 70px; padding: 2px 6px; }
}
</style>
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add src/router.ts src/modules/declension/ArticleAIQuizRunner.vue
git commit -m "feat(declension-ai): multi-blank runner with inline result + rationale list (1.07.01 part 1)

Single-card per AI-generated sentence. Inputs interleaved at each
___ position in the template; one rationale line per blank shown
after submit explaining each case. Inline paginated result shows
all blanks per sentence with green/red stamps.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Changelog bump + DeclensionHome card note

**Files:**
- Modify: `src/data/changelog.ts`
- Modify: `src/modules/declension/DeclensionHome.vue`

- [ ] **Step 1: Bump APP_VERSION + prepend changelog entry**

```ts
export const APP_VERSION = '1.07.01'

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.07.01', date: '2026-05-24', kind: 'polish',
    title: 'Declension · article-fill AI mode',
    notes: [
      'New "Source · AI · Live" toggle on the article-fill setup page calls Gemini to generate fresh sentences.',
      'Difficulty levels: Easy (A1–A2, 1–2 blanks, def/indef only) · Medium (B1, 2–3 blanks, +possessive) · Hard (B2–C1, 3–4 blanks, +genitive constructions).',
      'Each sentence supports multiple blanks; the runner interleaves inputs at every <code>___</code> in the template.',
      'Anti-fabrication: 5-stage validation per entry (structural sanity, blanks-count match, sentence reconstruction, enum validity, strict definite/indefinite article-form lookup). Failing entries are dropped and the model is asked again.',
      'AI runs land in history as <code>decl-article-ai</code> with the difficulty + average blank-count recorded.'
    ]
  },
  // … existing entries …
]
```

- [ ] **Step 2: Update the article-fill card description on the landing**

In `src/modules/declension/DeclensionHome.vue`, update the card C description:

```ts
{ numeral: 'C', route: 'declension-article', title: 'Article in context', de: 'Artikel einsetzen',
  desc: 'Fill in the missing article in a real sentence. Choose curated A1–B2 entries or generate fresh sentences via Gemini with multiple blanks.',
  cta: 'Start' }
```

- [ ] **Step 3: Commit**

```bash
git add src/data/changelog.ts src/modules/declension/DeclensionHome.vue
git commit -m "feat(version): bump to 1.07.01 + declension landing note for AI mode

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Verify + deploy

- [ ] **Step 1: Typecheck** — `npm run typecheck` → clean
- [ ] **Step 2: Tests** — `npm test` → expected ~302 (289 + 13 new useDeclensionAI tests + 1 userdata extension; if your final count differs by a couple, check the userdata file change)
- [ ] **Step 3: Build** — `npm run build` → succeeds
- [ ] **Step 4: Deploy** — `npm run deploy` + `git checkout -- dist/`
- [ ] **Step 5: Smoke test on the deployed site:**
  - Navigate `/declension/article-quiz`
  - Toggle Source to "AI · Live" — confirm difficulty picker + focus-cases + count appear
  - With a valid API key in Settings, click Generate — confirm loading state, then the runner opens with multi-blank inputs
  - Type answers, submit one sentence, verify rationale list appears with per-blank explanations
  - Finish the run, verify the result page renders with paginated cards and the history entry shows `Declension · article (AI)`
  - Toggle back to Curated — confirm the original quiz still works

---

## Self-Review

**1. Spec coverage:**
- AI integration in the article-fill quiz — Task 4 (setup) + Task 5 (runner)
- Same settings as curated — focus-cases chip group in AI mode mirrors the curated `case` filter
- Difficulty option (Easy / Medium / Hard) — Task 1 (types) + Task 4 (UI) + Task 2 (prompt)
- Multiple blanks per sentence — `MultiArticleEntry.blanks[]` carries N blanks; runner renders N inputs
- AI standardised + no fabrication — 5-stage validation pipeline in Task 2 with TDD coverage of every failure mode

**2. Placeholder scan:** none.

**3. Type consistency:** `Difficulty`, `MultiArticleEntry`, `AIBlank`, `GenerateOptions`, `GenerateResult` used consistently across data file, composable, setup page, and runner. History type `'decl-article-ai'` used in all 5 wiring touch-points (Task 3).

---

## Risks

- **API cost** — each AI run is one Gemini call (with up to 2 retries). At ~10 sentences per call, this is well within free-tier limits. The setup page surfaces the run count so the user controls it.
- **Validation rejection rate** — if Gemini routinely fails the strict article-form check, the runner could end up with fewer entries than requested. The retry loop (up to 2 attempts) buys some forgiveness; the runner displays the final accepted/rejected count so users can see when the model misbehaved.
- **Possessive lemmas slip through** — the strict article-form check is intentionally lenient for possessives because the lemma space (mein/dein/sein/ihr/unser/euer × all four endings) is large. We rely on the reconstruction check + Gemini's training data for those. If we ever see persistent issues, build a full possessive lookup.
- **No new dependencies** — uses the existing `@google/genai` SDK already in the project. No build-size growth.

---

## Effort estimate

| Phase | Days |
|---|---|
| Task 1 — Schema + lookups | 0.25 |
| Task 2 — Composable + 13 validator tests (TDD) | 0.75 |
| Task 3 — History/userdata/stats wiring | 0.25 |
| Task 4 — Setup page Source toggle + AI controls | 0.75 |
| Task 5 — Multi-blank runner + inline paginated result | 1.0 |
| Task 6 — Changelog + landing card update | 0.1 |
| Task 7 — Verify + deploy | 0.15 |
| **Total** | **~3.25 days** |
