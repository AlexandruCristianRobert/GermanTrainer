# Sprint 1A — Konjunktiv I & Passiv Transformation Modules

**Status:** Spec — pending approval
**Date:** 2026-05-24
**Scope:** Two new B2–C1 grammar-transformation modules, added to the existing GermanTrainer SPA.
**Out of scope (deferred to Sprint 1B):** Module 10 (AI Writing Tutor with Goethe/telc rubric grading) — see separate handoff brief.

## 1. Purpose

The current app drills word-level recognition (gender, translation, declension, conjugation) but not the transformation-style grammar that B2–C1 productive tasks reward. This spec adds two transformation drills that target the highest-leverage register skills at C1:

- **Module 3 — Konjunktiv I "Indirekte Rede" rewriter**: convert a direct-speech quote into reported speech using Konjunktiv I (or Konjunktiv II where K-I coincides with the indicative). The dominant register marker in news, academic writing, and the Goethe/telc productive tasks.
- **Module 4 — Passiv transformation drill**: convert an active sentence into a *specific* requested passive form — `Vorgangspassiv`, `Zustandspassiv`, `sich lassen + Infinitiv`, `sein + zu + Infinitiv`, `-bar`-Adjektiv, or `man`-Konstruktion. Bread-and-butter of academic register, almost never drilled systematically.

These two modules were prioritised together because they share an architectural shape (LLM-generated source + LLM-judged user transformation) and because the existing `useDeclensionAI` composable provides a direct template.

## 2. Context — current repo state

- **Stack:** Vue 3 + TypeScript + Vite + Naive UI + Vue Router + Dexie (IndexedDB).
- **AI provider:** Google Gemini (`@google/genai`). Default model `gemini-2.5-flash`. **Note:** the project's `README.md` and the older `2026-05-04-german-trainer-design.md` still reference Anthropic Claude / `@anthropic-ai/sdk` from the original spec — out of date; do not follow those when wiring AI calls. The `useClaude.ts` filename is also misleading and wraps `GoogleGenAI`.
- **Module convention:** every existing module lives in `src/modules/<name>/` with its own `<Name>Home.vue` + `QuizSetup.vue` + `QuizRunner.vue` + (optional) `QuizResult.vue`, plus a composable in `src/composables/use<Name>Quiz.ts` and (optionally) typed data in `src/data/<name>.ts`. No abstraction is shared between modules — that convention is preserved here.
- **AI-driven precedent:** `src/composables/useDeclensionAI.ts` + `src/modules/declension/ArticleAIQuizRunner.vue`. Pipeline: `buildPrompt → generateContent (responseSchema) → JSON.parse → local validateEntry → retry up to N times`. Both new modules copy this shape; neither extracts shared code.
- **Settings:** singleton Dexie row with `geminiApiKey` and `model`. The same key/model power the existing AI modules — no settings changes.
- **History:** `src/composables/useQuizHistory.ts` writes typed entries to `localStorage` (FIFO, cap 100). Each module appends to a discriminated union of `QuizHistoryType` values.

## 3. Architecture

### 3.1 File layout

Two new module folders, two new composables, two new data files. No new top-level abstractions.

```
src/
├── modules/
│   ├── konjunktiv/
│   │   ├── KonjunktivHome.vue        # entry tile + recent-runs preview
│   │   ├── QuizSetup.vue             # difficulty, count, topic bias
│   │   ├── QuizRunner.vue            # one quote at a time
│   │   └── QuizResult.vue            # session summary + per-item review
│   └── passiv/
│       ├── PassivHome.vue
│       ├── QuizSetup.vue             # difficulty, count, transformation focus
│       ├── QuizRunner.vue            # one transformation type per question
│       └── QuizResult.vue
├── composables/
│   ├── useKonjunktivQuiz.ts          # generator + judge + retry
│   └── usePassivQuiz.ts              # generator + judge + retry
└── data/
    ├── konjunktiv.ts                 # types, difficulty briefs, response schemas
    └── passiv.ts                     # types, transformation enum, briefs, schemas
```

### 3.2 Files modified (additions only)

- `src/router.ts` — 8 new routes (4 per module): `/konjunktiv`, `/konjunktiv/quiz`, `/konjunktiv/quiz/run`, `/konjunktiv/quiz/result` and the parallel four for `/passiv/...`.
- `src/composables/useQuizHistory.ts` — extend `QuizHistoryType` with `'konjunktiv-rewrite'` and `'passiv-transform'`; extend `QuizHistoryMeta` with `kiDifficulty`, `kiTopics`, `passivDifficulty`, `passivFocusedTypes`, `passivPerTypeCorrect`.
- `src/modules/home/Home.vue` — two new tiles. Placement follows whatever grouping the page already uses.
- `src/modules/history/HistoryPage.vue` — label mappings for the two new types and meta-chip rendering.

### 3.3 What does NOT change

- `db/types.ts` — no new Dexie tables. Generated content is in-memory per session, never persisted (matches `useDeclensionAI`).
- `composables/useSettings.ts` — unchanged.
- Existing modules — no behavioural changes.

## 4. Module 3 — Konjunktiv I "Indirekte Rede"

### 4.1 Types (`src/data/konjunktiv.ts`)

```ts
export type KiDifficulty = 'easy' | 'medium' | 'hard'  // B1 / B2 / C1

export interface KiQuestion {
  id: string
  source: string                         // 'Der Minister sagte: „Wir senken die Steuern."'
  reportingClause: string                // 'Der Minister sagte, '
  referenceAnswer: string                // canonical K-I (or K-II fallback) rewrite
  expectedMood: 'K1' | 'K2-fallback'     // K2-fallback when K-I = indicative
  rationale: string                      // English, 1–2 lines
  difficulty: KiDifficulty
}

export interface KiJudgeResult {
  verdict: 'correct' | 'partially_correct' | 'incorrect'
  expected: string                       // canonical reference (echoed)
  acceptedVariants: string[]             // other forms the judge accepts
  feedback: string                       // 1–3 sentences, English
  moodCheck: {
    used: 'K1' | 'K2' | 'indicative' | 'other'
    ok: boolean
  }
}

export const KI_TOPICS = ['Politik', 'Wirtschaft', 'Wissenschaft', 'Sport', 'Kultur'] as const
export type KiTopic = (typeof KI_TOPICS)[number]
```

### 4.2 Generator (`useKonjunktivQuiz.ts`)

Mirrors `generateDeclensionArticles` in shape:

- `buildGeneratorPrompt(count, difficulty, topics)` returns a string instructing Gemini to produce `count` items, each with the schema above, biased toward the requested topics, and deliberately including items where K-I form coincides with indicative (so `expectedMood = 'K2-fallback'`).
- Difficulty briefs:
  - **easy (B1)**: simple SVO, subjects `er/sie/es` so K-I works cleanly; common reporting verbs (`sagte`, `meinte`).
  - **medium (B2)**: mixes plural and 1st-person subjects (forces K-II fallback in some); broader reporting verbs (`erklärte`, `behauptete`, `betonte`).
  - **hard (C1)**: news-register with subordinate clauses, modal verbs, time-of-utterance shifts; formal reporting verbs (`konstatierte`, `dementierte`, `wies darauf hin`).
- `responseSchema` — JSON schema with `entries: [{ source, reportingClause, referenceAnswer, expectedMood, rationale, difficulty }]`, all `required`, `expectedMood` enum, `difficulty` enum.
- `validateKiEntry(raw)` (pure, exported, testable) — checks: `source` contains a colon and German quotation marks, `reportingClause` ends with `,` and a trailing space (so the user input concatenates cleanly), `referenceAnswer` starts with `reportingClause`, all string fields non-empty, `expectedMood` and `difficulty` are valid enum values.
- Retry loop: same as `useDeclensionAI` — max 2 retries, top up to `count` valid items across retries.

### 4.3 Judge (`useKonjunktivQuiz.ts`)

```ts
async function judgeKi(
  client: GeminiClient,
  model: string,
  question: KiQuestion,
  userAnswer: string
): Promise<KiJudgeResult>
```

System instruction: *"You are a strict German grammar teacher grading indirekte-Rede transformations. Accept any grammatically valid Konjunktiv I or Konjunktiv II form that preserves the meaning. When K-I coincides with the indicative, K-II is required — flag this in `moodCheck`."*

User message includes: source, reference, expectedMood, userAnswer. Response uses JSON schema matching `KiJudgeResult`. Validator rejects malformed responses; on rejection or thrown error, fall back to local exact-string match against `referenceAnswer` (case-insensitive, whitespace-collapsed) and return a degraded `KiJudgeResult` with `feedback: "Grader unavailable — fallback to reference match."` and `moodCheck.used = 'other'`.

### 4.4 UX flow

1. **`KonjunktivHome.vue`** — title, one-sentence description ("Rewrite direct quotes as indirect speech using Konjunktiv I."), "Start session" button → `/konjunktiv/quiz`, optional recent-runs panel reading from quiz history filtered to `type === 'konjunktiv-rewrite'`. No Manage screen — content is on-demand.
2. **`QuizSetup.vue`** — `n-select` for difficulty (B1/B2/C1, default B2), `n-slider` for count (default 10, range 5–25), `n-checkbox-group` for topic bias (optional, default = all topics). Existing `useSettings().hasApiKey` guard banner if missing. Cost-warning hint: *"≈20 API calls per session."* "Start" → `LoadingOverlay` while generator runs → `router.push('/konjunktiv/quiz/run')` with the generated batch passed via a transient store or route param (whichever pattern the existing AI runner uses).
3. **`QuizRunner.vue`** — single card per question:
   - Source quote, shown verbatim with German quotation marks rendered.
   - Reporting stem (e.g. `Der Minister sagte, ` ) followed by an `n-input` (single line, autofocus).
   - "Grade" button → `judgeKi`. Disabled + spinner while in flight. Submit-on-Enter supported.
   - On verdict: card flips to feedback mode showing verdict badge, expected form, accepted variants (if any), rationale, mood-check chip.
   - "Next" advances. Progress bar uses existing `QuizProgress.vue`.
4. **`QuizResult.vue`** — total/correct, duration, per-item collapsible review cards, "Save & exit" → `saveQuizRun({ type: 'konjunktiv-rewrite', meta: { kiDifficulty, kiTopics } })` → home.

### 4.5 Edge cases

- **K-I = indicative collision**: generator deliberately seeds items where this happens; judge enforces via `moodCheck.ok`.
- **User uses K-II where K-I is preferred**: verdict `partially_correct`, feedback explains both are accepted but K-I is preferred in news register.
- **Empty input**: verdict `incorrect`, feedback prompts the user to include the reporting clause.
- **API failure mid-session**: toast + retry on the current question. The in-memory batch is preserved; no progress is lost.
- **All retries exhausted in generator**: setup screen stays mounted, toast "Couldn't generate questions. Try again or lower difficulty."

### 4.6 Routes

```
/konjunktiv                 → KonjunktivHome.vue
/konjunktiv/quiz            → QuizSetup.vue
/konjunktiv/quiz/run        → QuizRunner.vue
/konjunktiv/quiz/result     → QuizResult.vue
```

## 5. Module 4 — Passiv transformation drill

### 5.1 Types (`src/data/passiv.ts`)

```ts
export type PassivDifficulty = 'easy' | 'medium' | 'hard'  // B1 / B2 / C1

export type TransformationType =
  | 'vorgangspassiv'      // werden + Partizip II
  | 'zustandspassiv'      // sein + Partizip II
  | 'sich-lassen'         // sich lassen + Infinitiv
  | 'sein-zu'             // sein + zu + Infinitiv
  | 'bar-adjektiv'        // -bar / -lich adjective form
  | 'man-konstruktion'    // active 'man' construction

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

export interface PassivQuestion {
  id: string
  active: string                         // 'Der Techniker repariert das Gerät.'
  target: TransformationType             // 'sich-lassen'
  legalTypes: TransformationType[]       // every transformation legal for THIS verb
  referenceAnswer: string                // 'Das Gerät lässt sich reparieren.'
  rationale: string                      // English, 1–2 lines
  difficulty: PassivDifficulty
}

export interface PassivJudgeResult {
  verdict: 'correct' | 'partially_correct' | 'incorrect'
  expected: string
  acceptedVariants: string[]
  feedback: string
  formCheck: {
    usedType: TransformationType | 'unknown'
    matchesTarget: boolean               // did the user produce the form they were asked for?
  }
}
```

### 5.2 Generator (`usePassivQuiz.ts`)

Structurally identical to the Konjunktiv I generator with one important addition:

- Generator produces a batch of source sentences, each tagged with `legalTypes`. The runner picks one `target` per question from `legalTypes`, weighted by the user's setup-screen focus.
- Difficulty briefs:
  - **easy (B1)**: simple transitive present-tense sentences (`Der Techniker repariert das Gerät`), one clear `referenceAnswer` per legal type.
  - **medium (B2)**: past tenses, dative-bearing verbs, separable prefixes, mild idiomatic verb constructions.
  - **hard (C1)**: subordinate clauses, modal verbs, less-frequent verb-noun collocations.
- Generator prompt explicitly enumerates which `legalTypes` are allowed for each verb category:
  - Intransitives → `man-konstruktion` only.
  - Transitives without resultant state → exclude `zustandspassiv`.
  - Verbs without `-bar`/`-lich` adjective form → exclude `bar-adjektiv`.
  - Modal-laden source → prefer `man-konstruktion` and `sich-lassen` as targets.
- `validatePassivEntry(raw)` (pure, exported, testable) — schema check + heuristic match between `referenceAnswer` and the *first* `legalTypes` entry (e.g. for `vorgangspassiv` contains a `werden`-form and a Partizip II; for `sich-lassen` contains the lemma `lassen`). Weak heuristics; LLM judge remains source of truth on user submissions.

### 5.3 Judge (`usePassivQuiz.ts`)

```ts
async function judgePassiv(
  client: GeminiClient,
  model: string,
  question: PassivQuestion,
  userAnswer: string
): Promise<PassivJudgeResult>
```

System instruction: *"You grade German Passiv and Passiv-alternative transformations. The student was asked to produce a SPECIFIC transformation type; reject answers that are grammatically correct but use the wrong type. Identify which type the student actually produced and set `formCheck.matchesTarget` accordingly."*

User message includes: active source, expected reference, target type, target label, user answer. Response uses JSON schema matching `PassivJudgeResult`. Same validator + local-string-match fallback as Module 3.

### 5.4 UX flow

Same skeleton as Module 3. Runner-specific differences:

- The target transformation label is shown as a prominent `n-tag` above the input (e.g. *"Form: sich lassen + Infinitiv"*).
- A "?" icon next to the tag opens a one-line example of that transformation, using a *different* verb (not gameable).
- Result screen adds a per-type breakdown panel — e.g. *"Vorgangspassiv 3/3, sich-lassen 1/2, man-Konstruktion 2/2"*. Computed from the per-item verdicts on result mount.

### 5.5 Edge cases

- **Intransitives**: generator excludes them from any target other than `man-konstruktion`.
- **User produces a correct-but-wrong-type passive**: `formCheck.matchesTarget = false`, verdict `partially_correct`, feedback shows both forms and explains the type mismatch.
- **Modal verbs in source**: limited to `hard` difficulty; targets restricted to `sich-lassen` / `man-konstruktion`.
- **Generator returns a `target` not in `legalTypes`**: validator rejects, item drops from the batch.

### 5.6 Routes

```
/passiv                 → PassivHome.vue
/passiv/quiz            → QuizSetup.vue
/passiv/quiz/run        → QuizRunner.vue
/passiv/quiz/result     → QuizResult.vue
```

## 6. Cross-cutting plumbing

### 6.1 History (`composables/useQuizHistory.ts`)

```ts
export type QuizHistoryType =
  | …existing…
  | 'konjunktiv-rewrite'
  | 'passiv-transform'

export interface QuizHistoryMeta {
  …existing…
  kiDifficulty?: KiDifficulty
  kiTopics?: KiTopic[]
  passivDifficulty?: PassivDifficulty
  passivFocusedTypes?: TransformationType[]
  passivPerTypeCorrect?: Partial<Record<TransformationType, { correct: number; total: number }>>
}
```

`HistoryPage.vue` — additive only: label mappings and meta-chip renderers for the two new types.

### 6.2 Home page

`modules/home/Home.vue` — two new tiles. Group placement follows whatever pattern the page currently uses; implementation can confirm during the build.

### 6.3 Settings

No changes. Both modules read `useSettings().settings.value.geminiApiKey` and `.model` identically to the existing AI-driven modules.

### 6.4 Error handling

Three failure modes, handled identically across both modules:

1. **Missing API key on entering setup** — banner with "Go to Settings" CTA, identical to `declension/ArticleAIQuizRunner.vue`.
2. **Generator returns nothing valid after `maxRetries` (default 2)** — toast "Couldn't generate questions. Try again or lower difficulty." Setup screen remains mounted.
3. **Judge call fails or returns invalid JSON** — fall back to local exact-string match against `referenceAnswer` (case-insensitive, whitespace-collapsed). Return a degraded verdict with `feedback: "Grader unavailable — fallback to reference match."`

### 6.5 Cost & rate-limit posture

Each session = `count` generator-batch calls (typically 1, occasionally 2 with retries) + `count` judge calls. For a 10-question session that's ~11–12 Gemini calls. At Gemini 2.5 Flash pricing this is negligible. The setup screen surfaces *"≈20 API calls per session"* as a one-line hint, matching the AI-warning toast added in commit `ea3c065`.

### 6.6 Testing

Vitest, mirroring the existing convention. New test files:

```
tests/composables/
├── useKonjunktivQuiz.spec.ts
└── usePassivQuiz.spec.ts
tests/modules/
├── konjunktiv/QuizRunner.spec.ts
└── passiv/QuizRunner.spec.ts
```

Per composable:

- **Generator validator** — pure-function tests (no mocks). Valid sample passes; each rejection cause (wrong field type, missing field, blank rationale, reference doesn't start with `reportingClause`, target not in `legalTypes`, etc.) exercised individually.
- **Generator retry loop** — mock the Gemini client. One rejected batch then one valid batch → top-up succeeds. All retries return invalid → returns the partial batch with `attempts === maxRetries + 1`. Matches `useDeclensionAI` contract.
- **Judge fallback path** — mock judge to throw → returns degraded `KiJudgeResult` / `PassivJudgeResult` with `feedback` flagging fallback.

Per runner (Vue Test Utils + `fake-indexeddb`):

- Question renders source + (for Passiv) target tag.
- Typing into the input and clicking Grade calls the judge with the correct payload shape.
- Verdict states each render the right UI (correct / partially_correct / incorrect).
- "Next" advances to the next question; "Save & exit" calls `saveQuizRun` once with the right `type` and `meta`.

No e2e tests — none of your existing modules have them.

## 7. Out of scope

- **Persisted Konjunktiv I / Passiv content** (no Manage screens, no seed JSON). On-demand only.
- **A shared "transformation drill" engine** — re-evaluated in Sprint 2 if Nominalisierung and Konnektoren modules confirm the pattern.
- **Module 10 — AI Writing Tutor** — handled in a separate Sprint 1B spec, design in flight in another session.
- **Streaks, leaderboards, cross-module aggregates.**
- **Audio / pronunciation, rich-text input, markdown rendering.**
- **Backend proxy.** Personal-use posture preserved — API key still lives in IndexedDB.

## 8. Caveats noted in the source plan

These belong with the spec for the implementer:

- **K-I/K-II rule**: must be encoded in the generator brief AND in the judge instruction. The single most-missed detail in Konjunktiv I instruction.
- **Passiv legality matrix is verb-dependent**: never trust a fixed "always six" list — the generator must filter per verb.
- **The source plan assumed Anthropic SDK and a thinner repo state**; both are stale. This spec is written against the actual Gemini wiring and the actual current module set (nouns, adjectives, declension with AI runner, prepositions, verbs, history, version, settings).

## 9. Definition of done

- Both modules ship as routes; tile entry points work from the home page; setup → run → result flow lands without console errors.
- Generator + judge tests pass (`npm test`).
- Type-check passes (`npm run typecheck`).
- Manual smoke: with a valid Gemini key configured, a 5-question session of each module completes; one correct, one partially_correct, one incorrect verdict observed; history entry visible on the history page.
- README is updated to reflect that the AI provider is Gemini (a stale-section fix the broader codebase has been pending — small enough to bundle here).
