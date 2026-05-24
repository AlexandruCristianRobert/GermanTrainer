# Sprint 1B — Module 10 · AI Writing Tutor with Goethe/telc Rubric Grading

**Status:** Spec — pending approval
**Date:** 2026-05-24
**Scope:** One new B2–C1 productive-skill module added to the existing GermanTrainer SPA — a free-form German writing surface with Goethe-Zertifikat C1 and telc C1 rubric grading.
**Out of scope (deferred / belongs elsewhere):**
- **Module 1 — Goethe C1 Schreiben Simulator** (Sprint 2) reuses this module's grading but adds the 75-minute timed exam shell; not built here.
- **Sprint 1A — Modules 3 & 4** (Konjunktiv I / Passiv) ship under their own spec at `docs/superpowers/specs/2026-05-24-konjunktiv-passiv-design.md`.

## 1. Purpose

The current app drills receptive and word-level productive skills (gender, translation, declension, conjugation, transformation). It does not yet test **extended productive writing** against a real rubric — the single biggest gap between the trainer's current ceiling and the actual Goethe-Zertifikat C1 / telc C1 productive tasks.

Module 10 closes that gap with one focused surface:

- a **prompt catalogue** covering the six exam-relevant task types (Forumsbeitrag, formelle E-Mail, argumentativer Aufsatz, Grafik-Beschreibung, Zusammenfassung, Stellungnahme),
- a **plain-text editor** with live word-count tracking against the prompt's target band,
- a **rubric-driven grader** that returns per-criterion scores, verbatim text citations, overall band estimate, and inline rewrite suggestions, and
- a **draft history** so the user can rewrite the same prompt and watch their scores move.

This is the highest-leverage single module in the B2–C1 expansion plan because almost all the infrastructure already exists: Gemini wiring (via `useClaude.ts`, despite the name), settings, history, the AI-driven generator/judge pipeline from `useDeclensionAI`. The only genuinely new infrastructure is one Dexie table for drafts.

## 2. Context — current repo state

- **Stack:** Vue 3 + TypeScript + Vite + Naive UI + Vue Router + Dexie (IndexedDB).
- **AI provider:** Google Gemini (`@google/genai`). Default model `gemini-2.5-flash`. The `README.md` and the original `2026-05-04-german-trainer-design.md` still mention Anthropic / `@anthropic-ai/sdk` — out of date; do not follow. The `useClaude.ts` filename is misleading; it wraps `GoogleGenAI`. Re-use it.
- **Module convention:** each module lives in `src/modules/<name>/` with `<Name>Home.vue` + setup + runner + (optional) result, plus a composable in `src/composables/use<Name>.ts` and typed data in `src/data/<name>.ts`. No shared abstractions; this convention is preserved.
- **AI-driven precedent:** `src/composables/useDeclensionAI.ts` + `src/modules/declension/ArticleAIQuizRunner.vue`. Pipeline: `buildPrompt → generateContent(responseSchema) → JSON.parse → local validator → retry up to N times`. The grader half of Module 10 reuses this exact shape; the writing surface differs from a quiz runner only in input style.
- **Settings:** singleton Dexie row exposes `geminiApiKey` and `model`. Reused as-is.
- **History:** `useQuizHistory.ts` writes typed entries to localStorage (FIFO, cap 100). Each module appends to a discriminated `QuizHistoryType` union. Module 10 extends this for "graded a draft" events.
- **Sprint 1A modules** (Konjunktiv I, Passiv) ship before this one. They establish the generator+judge pattern but introduce no new Dexie tables. Module 10 is the first module that genuinely needs persisted user content (drafts).

## 3. Architecture

### 3.1 File layout

One new module folder, two new composables, two new data files, **one new Dexie table**. No new top-level abstractions.

```
src/
├── modules/
│   └── writing/
│       ├── WritingHome.vue           # catalogue grid + recent drafts panel
│       ├── PromptDetail.vue          # one prompt + its draft history list
│       ├── EditorSurface.vue         # write → grade → annotated feedback
│       └── DraftCompare.vue          # side-by-side two-draft view
├── composables/
│   ├── useWritingPrompts.ts          # load seed catalogue + custom-prompt CRUD
│   └── useWritingGrader.ts           # grade(), upgradeParagraph()
└── data/
    ├── writingPrompts.ts             # types + seed catalogue (~30 prompts)
    └── rubrics.ts                    # rubric descriptors (Goethe C1, telc C1)
```

### 3.2 Files modified (additions only)

- `src/router.ts` — 5 new routes (see §4.9).
- `src/db/types.ts` — **one new Dexie table** `writingDrafts` (see §6.1). Schema version bump.
- `src/composables/useQuizHistory.ts` — extend `QuizHistoryType` with `'writing-grade'`; extend `QuizHistoryMeta` with `promptId`, `taskType`, `rubric`, `bandEstimate`, `totalScore`, `wordCount`.
- `src/modules/home/Home.vue` — one new tile (placement follows whatever grouping is in use).
- `src/modules/history/HistoryPage.vue` — label mapping + meta-chip renderer for `'writing-grade'`.

### 3.3 What does NOT change

- `useSettings.ts` — unchanged. Same `geminiApiKey` / `model` row powers grading.
- `useClaude.ts` — unchanged. Same `generateContent` entry point.
- Existing modules — no behavioural changes.

## 4. Module 10 — detail

### 4.1 Types (`src/data/writingPrompts.ts`)

```ts
export type WritingTaskType =
  | 'forumsbeitrag'              // Goethe C1, ~230 words
  | 'formelle-email'             // Goethe C1, ~120 words
  | 'argumentativer-aufsatz'     // telc C1 + general C1 prep
  | 'grafik-beschreibung'        // telc C1 — chart/data description
  | 'zusammenfassung'            // summary, general C1 prep
  | 'stellungnahme'              // opinion piece, general C1 prep

export type RubricSystem = 'goethe-c1' | 'telc-c1'

export interface WritingPrompt {
  id: string                         // 'wp-forum-wohnen-stadt-land'
  type: WritingTaskType
  defaultRubric: RubricSystem        // user can override at draft time
  level: 'B2' | 'C1'
  titleDe: string                    // 'Wohnen: Stadt oder Land?'
  promptText: string                 // full task body (German); may contain newlines
  promptContext?: string             // forum thread excerpt / email situation / chart caption
  targetWords: { min: number; target: number; max: number }
  suggestedMinutes: number
  tags?: string[]                    // 'Wohnen', 'Umwelt', 'Bildung', 'Arbeit', …
  source: 'seed' | 'custom'
}

export interface WritingDraft {
  id: string                         // crypto.randomUUID()
  promptId: string
  rubric: RubricSystem               // chosen at grade time
  text: string                       // full draft, plain text
  wordCount: number
  createdAt: number                  // ms epoch
  updatedAt: number
  gradedAt?: number
  graderModel?: string               // e.g. 'gemini-2.5-flash'
  result?: WritingGradeResult        // present once graded
}
```

### 4.2 Rubric descriptors (`src/data/rubrics.ts`)

Each rubric is a fully encoded descriptor — same shape, swap-in for any Gemini call. The grader prompt **injects the rubric verbatim**; the response schema is rubric-shaped.

```ts
export interface RubricCriterion {
  key: string                        // 'erfuellung'
  labelDe: string                    // 'Erfüllung'
  labelEn: string                    // 'Task fulfilment'
  maxPoints: number
  descriptorDe: string               // 2–4 sentence band descriptor used in the prompt
}

export interface RubricDescriptor {
  system: RubricSystem
  totalMax: number                   // 100 (Goethe) | 100 (telc)
  passingScore: number               // 60 (Goethe) | 60 (telc)
  criteria: RubricCriterion[]
  notes: string                      // grader instruction footer
}

export const GOETHE_C1: RubricDescriptor = {
  system: 'goethe-c1',
  totalMax: 100,
  passingScore: 60,
  criteria: [
    { key: 'erfuellung',  labelDe: 'Erfüllung',  labelEn: 'Task fulfilment', maxPoints: 20, descriptorDe: '…' },
    { key: 'kohaerenz',   labelDe: 'Kohärenz',   labelEn: 'Coherence',       maxPoints: 20, descriptorDe: '…' },
    { key: 'wortschatz',  labelDe: 'Wortschatz', labelEn: 'Vocabulary',      maxPoints: 20, descriptorDe: '…' },
    { key: 'strukturen',  labelDe: 'Strukturen', labelEn: 'Structures',      maxPoints: 20, descriptorDe: '…' },
    { key: 'korrektheit', labelDe: 'Korrektheit', labelEn: 'Correctness',    maxPoints: 20, descriptorDe: '…' },
  ],
  notes: 'Modular Goethe C1 spec, effective 1 Jan 2024. Pass mark 60/100 per module.',
}

export const TELC_C1: RubricDescriptor = {
  system: 'telc-c1',
  totalMax: 100,
  passingScore: 60,
  criteria: [
    { key: 'aufgabengerechtigkeit',    labelDe: 'Aufgabengerechtigkeit',    labelEn: 'Task appropriateness',    maxPoints: 25, descriptorDe: '…' },
    { key: 'aufbau-form',              labelDe: 'Aufbau und Form',          labelEn: 'Structure and form',      maxPoints: 25, descriptorDe: '…' },
    { key: 'kommunikative-gestaltung', labelDe: 'Kommunikative Gestaltung', labelEn: 'Communicative quality',   maxPoints: 25, descriptorDe: '…' },
    { key: 'sprachliche-richtigkeit',  labelDe: 'Sprachliche Richtigkeit',  labelEn: 'Linguistic accuracy',     maxPoints: 25, descriptorDe: '…' },
  ],
  notes: 'telc Deutsch C1 productive-writing rubric. Each criterion 0–25; total 100; pass 60.',
}

export const RUBRICS: Record<RubricSystem, RubricDescriptor> = {
  'goethe-c1': GOETHE_C1,
  'telc-c1':   TELC_C1,
}
```

The `descriptorDe` fields hold the actual band-descriptor text (2–4 sentences each) that the grader uses as its scoring rubric. They're filled in during implementation from the official Modellsatz Bewertungsbogen; the spec leaves them as `'…'` so the implementer copies them verbatim from a single authoritative source per rubric rather than from a paraphrase.

### 4.3 Grader response schema

```ts
export interface WritingGradeResult {
  rubric: RubricSystem
  totalScore: number                 // 0–100
  bandEstimate: 'B2' | 'C1-' | 'C1' | 'C1+'
  passes: boolean                    // totalScore >= rubric.passingScore
  criteria: GradeCriterion[]
  inlineNotes: InlineNote[]
  paragraphFeedback: ParagraphFeedback[]
  overallDe: string                  // 3–5 sentences, German, holistic
  overallEn: string                  // 2–3 sentences, English, holistic
  generatedAt: number
  modelUsed: string
}

export interface GradeCriterion {
  key: string                        // matches RubricCriterion.key
  labelDe: string
  maxPoints: number
  score: number
  strengthsDe: string                // one or two sentences
  weaknessesDe: string               // one or two sentences
  evidence: EvidenceQuote[]
}

export interface EvidenceQuote {
  quote: string                      // verbatim substring of draft.text
  spanStart: number                  // char index into draft.text (-1 if not located)
  spanEnd: number                    // char index, exclusive
  commentDe: string                  // why this quote supports the score
}

export interface InlineNote {
  spanStart: number                  // char index into draft.text
  spanEnd: number                    // exclusive
  kind: 'fix' | 'upgrade' | 'comment'
  before: string                     // text of the span (echoed for sanity check)
  suggested?: string                 // proposed rewrite (always present for 'fix' and 'upgrade')
  reasonDe: string                   // 1–2 sentences in German
}

export interface ParagraphFeedback {
  paragraphIndex: number             // 0-based
  summaryDe: string                  // 1–2 sentence note
  upgradedText?: string              // populated lazily by upgradeParagraph()
  upgradedAt?: number
}
```

Two design constraints worth calling out:

- **`spanStart` / `spanEnd` are char indices into the submitted draft text**, not paragraph indices and not regex matches. The grader is instructed to return the indices it sees; the local validator re-locates each `quote` substring in `draft.text` and rewrites `spanStart`/`spanEnd` from the first occurrence (case-sensitive, then case-insensitive as fallback). If the substring isn't found, the index pair is set to `-1` and the UI renders the evidence as a non-anchored quote.
- **`paragraphFeedback.upgradedText` is empty on initial grade.** The paragraph upgrade is a separate, smaller Gemini call triggered by the user (§4.6), not part of the main grade response. This keeps the main response small and avoids paying for upgrades the user never reads.

### 4.4 Editor surface (`EditorSurface.vue`)

Single page, three vertical zones:

1. **Prompt zone** (collapsible) — task title, full prompt text, target word band, suggested minutes, rubric chips with a switcher (`n-radio-group` between Goethe C1 / telc C1, defaults to `prompt.defaultRubric`). Disclaimer ribbon: *"Bewertungen sind indikativ und ersetzen keinen offiziellen Prüfer. Übe ergänzend mit dem offiziellen Modellsatz."*
2. **Writing zone** — single `n-input type="textarea"`, monospace-leaning font for predictable line wrapping, autosize within bounds, autofocus on mount.
   - **Live word counter**: bottom-right corner of the textarea container. Tabular numerals.
   - **Target-band colour**: red `< 90%` of `targetWords.min`, green within `[targetWords.min, targetWords.max]`, amber `> targetWords.max + 15%`. Computed reactively.
   - **Autosave**: the in-progress draft writes to the `writingDrafts` Dexie table on a 1-second debounce, including a `gradedAt: undefined` marker. Refreshing the tab restores the draft. This is the only path that mutates a draft after creation.
3. **Action zone** — primary button "Grade me" (`n-button type="primary"`, disabled when word count < 60% of `targetWords.min`), secondary buttons "Save & exit" and "Discard". A small "API call cost ≈ 1 large grade call" hint appears next to the grade button to match the existing AI-warning convention.

After "Grade me":

- Editor flips to **review mode**. The textarea becomes read-only and is wrapped in a span renderer that overlays inline notes as background-highlight underlines (one colour per `kind`: `fix` = clay/red wash, `upgrade` = ochre wash, `comment` = sage wash).
- Above the editor, a **score block** appears: total score with `passes` badge, band estimate chip, rubric switcher disabled (locked to the rubric used for grading).
- Below the editor, a **criteria panel** lists each `GradeCriterion` as a card: criterion label, score / max, strengths, weaknesses, evidence quotes (each quote click-scrolls to the underlined span if `spanStart >= 0`).
- A **paragraph review** section lists each paragraph with its `summaryDe` and an "Upgrade this paragraph" button. Clicking calls `upgradeParagraph()` (§4.6); on resolve, the upgraded text appears in a side-by-side `n-collapse-panel` below the original.

### 4.5 Grader pipeline (`useWritingGrader.ts`)

```ts
async function gradeDraft(
  client: GeminiClient,
  model: string,
  prompt: WritingPrompt,
  draft: WritingDraft,
  rubric: RubricDescriptor,
): Promise<WritingGradeResult>
```

Steps:

1. **Build prompt** — system instruction declares the grader's role and embeds the chosen rubric (`rubric.criteria` array verbatim, plus `notes`). User message bundles: prompt task type, prompt text, target word band, the submitted draft, the draft's word count, and an explicit instruction to return evidence as exact substrings of the submitted draft.
2. **Call Gemini** with the `responseSchema` derived from `WritingGradeResult` (with `criteria`, `inlineNotes`, `paragraphFeedback`, `evidence` arrays typed; all numeric scores have `min`/`max`).
3. **Validate**: `validateGradeResult(raw, rubric, draft)` checks
   - every criterion `key` matches a key in `rubric.criteria`, in order,
   - every `score` is within `[0, criterion.maxPoints]`,
   - `totalScore` equals the sum of criterion scores (tolerance 0; reject mismatches),
   - `passes === (totalScore >= rubric.passingScore)`,
   - `bandEstimate` is one of the allowed strings,
   - every `EvidenceQuote.quote` is a substring of `draft.text` (case-insensitive). For any failures, re-anchor `spanStart`/`spanEnd` from the first matched occurrence; if no match, set both indices to `-1`.
   - `paragraphFeedback.length` ≤ number of double-newline-separated paragraphs in `draft.text`.
4. **Retry** on validation failure or thrown error, up to `maxRetries = 1` (graders are expensive — don't burn budget retrying). On final failure, throw a typed `GraderError` that the UI catches and renders as a banner (§6.4).
5. **Return** the validated `WritingGradeResult` with `generatedAt: Date.now()`, `modelUsed: model`.

The composable also handles persisting the result:

```ts
async function gradeAndPersist(draft: WritingDraft, rubric: RubricSystem): Promise<WritingDraft>
```

— calls `gradeDraft`, sets `result`, `gradedAt`, `graderModel`, `rubric` on the draft, writes back to Dexie, and `saveQuizRun({ type: 'writing-grade', meta: { promptId, taskType, rubric, bandEstimate, totalScore, wordCount } })`.

### 4.6 Paragraph upgrade

```ts
async function upgradeParagraph(
  client: GeminiClient,
  model: string,
  prompt: WritingPrompt,
  paragraphText: string,
  rubric: RubricSystem,
): Promise<{ upgradedText: string; rationaleDe: string }>
```

Small, focused call. System instruction: *"Rewrite the user's paragraph in a more C1-register German — heavier nominalisation, formal connectors (folglich, hinsichtlich, insofern als …), avoid colloquialisms. Preserve meaning. Return JSON: { upgradedText, rationaleDe }."* Response schema is the two-field object. No retries — failures show an inline error on the paragraph card.

Triggered exclusively from the "Upgrade this paragraph" button in §4.4. The upgraded text is persisted onto `paragraphFeedback[i].upgradedText` and rewrites the Dexie draft row.

### 4.7 Draft history & comparison

`PromptDetail.vue` lists all drafts for a given `promptId`, sorted newest-first. Each row shows: created timestamp, word count, score (if graded), band estimate (if graded), rubric, and a row-action `n-button-group`:

- **Open** → `EditorSurface.vue` for that draft (read-only if `result` present).
- **Continue editing** → editor surface in edit mode (only available when `result` absent).
- **Compare to previous** → opens `DraftCompare.vue` with this draft and the most recent graded draft of the same prompt.
- **Delete** → confirms, drops the Dexie row.

`DraftCompare.vue` is a simple two-column view: criterion-by-criterion score deltas (sage if improved, clay if worse, mute if unchanged), word-count delta, total-score delta, both `overallDe` summaries stacked. No fancy diff — the value is in the score deltas, not text alignment.

### 4.8 Edge cases

- **No API key**: every entry surface (`WritingHome`, `PromptDetail`, `EditorSurface`) shows the standard "Go to Settings" banner the AI modules already use. The editor is usable for drafting (autosave still works) but "Grade me" is disabled.
- **Word count well below minimum**: "Grade me" is disabled below 60% of `targetWords.min` with an inline tooltip; the user can still save the draft for later.
- **Word count well above maximum**: "Grade me" is enabled, but the grade prompt warns the grader explicitly: *"This draft exceeds the target word band; this should affect `erfuellung` / `aufgabengerechtigkeit`."* No truncation.
- **Grader returns scores that don't sum to `totalScore`**: validator rejects → retry. If retry also fails, the UI shows a "Couldn't grade — try again" banner with the raw response logged to console only.
- **Evidence quote not found in draft text**: as in §4.5, indices set to `-1`; evidence still rendered, but not anchored.
- **`inlineNotes[i].before` doesn't match `draft.text.slice(spanStart, spanEnd)`**: validator drops just that note. Other notes survive.
- **Draft updated after grade**: the grade is invalidated. The UI shows a "draft has been edited — regrade?" banner; the `result` block dims until the user regrades or reverts. Mechanically: any edit to a graded draft clears `result`, `gradedAt`, `graderModel`.
- **Custom prompts**: out of scope for v1 — the catalogue is seed-only. The `source: 'custom'` slot is reserved on the type so a future Manage UI can be added without a migration.

### 4.9 Routes

```
/writing                                 → WritingHome.vue
/writing/:promptId                       → PromptDetail.vue
/writing/:promptId/draft/new             → EditorSurface.vue (creates fresh draft on mount)
/writing/:promptId/draft/:draftId        → EditorSurface.vue (existing draft)
/writing/compare/:draftA/:draftB         → DraftCompare.vue
```

## 5. Cross-cutting plumbing

### 5.1 Dexie additions

**One new table: `writingDrafts`.**

```ts
// in db/types.ts
writingDrafts: '&id, promptId, gradedAt, createdAt'
```

Primary key on `id` (`crypto.randomUUID()` string). Compound indexing on `promptId, gradedAt` so the per-prompt list and the "latest graded" lookups are cheap. The full `WritingDraft` shape (including `result` blob) is stored on each row.

Schema version bumped accordingly; no data migration from previous version (the table is new).

**No table for prompts.** The catalogue is `src/data/writingPrompts.ts` — a typed array of `WritingPrompt`. ~30 seed prompts at ship time, covering the six task types across B2 and C1 levels. Adding/editing is a code change; this matches the existing pattern for noun and adjective seed JSON and avoids a Manage UI for v1.

### 5.2 History

```ts
export type QuizHistoryType =
  | …existing…
  | 'writing-grade'

export interface QuizHistoryMeta {
  …existing…
  promptId?: string
  taskType?: WritingTaskType
  rubric?: RubricSystem
  bandEstimate?: 'B2' | 'C1-' | 'C1' | 'C1+'
  totalScore?: number
  wordCount?: number
}
```

`HistoryPage.vue` — additive only: a row renderer for `writing-grade` events showing prompt title (looked up by `promptId`), rubric chip, score, band, word count, and a link straight to the draft.

### 5.3 Home page

`Home.vue` gets one new tile: *"Schreiben — Goethe C1 / telc C1 rubric grading"*. Tile copy mirrors the existing AI-module tiles. Tile click → `/writing`.

### 5.4 Settings

No changes. Reads `geminiApiKey` and `model` from the existing singleton.

### 5.5 Error handling

Four failure modes:

1. **Missing API key on entering editor** — disabled "Grade me" button + standard "Go to Settings" banner. Drafting remains available.
2. **Grader returns invalid JSON or fails validation after one retry** — toast "Couldn't grade. Try again, or simplify the draft." Draft remains unmarked.
3. **Grader returns scores that contradict `passes` or `totalScore`** — counts as validation failure (§5.5.2).
4. **Paragraph upgrade fails** — inline error on the paragraph card, no toast.

No silent fallback to local exact-string match — there's no meaningful local fallback for free-form essay grading. Failures stay loud.

### 5.6 Cost & rate-limit posture

A single grade is the heaviest call in the app:

- **Input**: rubric (≈800 tokens) + prompt (≈200 tokens) + draft (up to ≈700 tokens for a 230-word essay) ≈ 1.7 k tokens.
- **Output**: structured grade JSON (criteria + inline notes + paragraph feedback + overall) ≈ 1.5–2.5 k tokens.
- **Per session**: 1 grade + 0–3 paragraph upgrades.

At `gemini-2.5-flash` pricing this is still small per call (sub-cent), but materially heavier than the Konjunktiv/Passiv judge calls. Setup screen surfaces the hint *"≈ 1 large grade call (+ optional paragraph upgrades)"* next to the grade button — same convention as the AI-warning toast added in commit `ea3c065`.

Module 10 makes no attempt to share or batch grade calls. One submission, one call. Retries are capped at 1.

### 5.7 Testing

Vitest, mirroring existing convention.

```
tests/composables/
├── useWritingGrader.spec.ts
└── useWritingPrompts.spec.ts
tests/modules/
└── writing/
    ├── EditorSurface.spec.ts
    └── DraftCompare.spec.ts
```

Per composable:

- **`validateGradeResult`** — pure-function tests:
  - Valid sample passes.
  - Wrong criterion order rejected.
  - Score out of range rejected.
  - Score sum mismatch rejected.
  - `passes` boolean inconsistent with `totalScore` rejected.
  - Evidence quote not found in draft → `spanStart` rewritten to `-1`, item retained.
  - Inline note `before` mismatch → item dropped, others retained.
- **`gradeDraft` retry loop** — mock the Gemini client. One invalid response then one valid → success on retry. Two invalid → throws `GraderError`. Matches `useDeclensionAI` contract.
- **`upgradeParagraph`** — mock client. Success returns the upgraded text. Failure throws; no retry.

Vue component tests are deliberately skipped, mirroring Sprint 1A: none of your AI-driven modules (declension AI, Konjunktiv I, Passiv) have Vue component tests. The editor surface is verified by manual smoke against the §8 Definition of Done, the same as the Sprint 1A runners. If component tests prove valuable later, they can be added without re-architecting.

No e2e tests.

## 6. Out of scope

- **Module 1 — Goethe C1 Schreiben Simulator** (timed exam shell with submit-at-zero behaviour). Reuses Module 10's grader but wraps it in a different runner. Sprint 2.
- **Audio / speech / pronunciation feedback.** Sprint 2+ owns Modules 7 & 8 if they ship.
- **AI conversation partner / chat mode.** Not in this module.
- **Multi-user, sharing, leaderboards, community.** Personal-use posture preserved; the Goethe "Deutsch für dich" community is gone, so don't suggest a substitute.
- **Custom-prompt CRUD UI.** Reserved (`source: 'custom'` exists on the type) but no Manage screen this sprint.
- **Rich-text editor / markdown / Word-style formatting.** Plain textarea only.
- **Inline grammar autocorrect while typing.** All grading is on-submit.
- **Backend proxy.** API key stays in IndexedDB.

## 7. Caveats noted in the source brief

These belong with the spec for the implementer:

- **Goethe C1 spec changed 1 Jan 2024.** Use the modular format: ~230-word Forumsbeitrag + ~120-word formelle E-Mail in 75 minutes total. Do **not** use the legacy 200-word + gap-fill letter format. The seed catalogue and rubric descriptors must reflect the modular Modellsatz (Feb 2023+ versions).
- **Grader is not a Goethe/telc examiner.** Module 10 must display the disclaimer on every editor screen, not just the home. Stakes-bearing prep means doing the official Modellsatz too.
- **The original B2–C1 expansion plan is stale on two counts** — it references Anthropic Claude / `@anthropic-ai/sdk`, and it understates the repo state (declension, prepositions, verbs, history, version, settings already shipped). Wire against Gemini. Do not propose redoing groundwork.
- **No community features.** "Deutsch für dich" community is discontinued; only the self-study exercises remain.
- **Personal-use posture is non-negotiable.** No backend, no shared deployment, key in IndexedDB.
- **Cost surfacing**: this module's grade call is heavier than any other in the app. The hint near "Grade me" is mandatory, not nice-to-have.

## 8. Definition of done

- `/writing` is reachable from the home page; a tile lands cleanly without console errors.
- The seed catalogue renders all six task types across at least two prompts each (≥12 prompts at ship, target ~30).
- Drafting → autosave → reload → resume works on the same `:promptId/:draftId`.
- With a valid Gemini key configured, a 230-word forum-post draft grades end-to-end against Goethe C1 and against telc C1; criteria, inline notes, paragraph feedback, and overall summary all render; one inline note's "fix" produces a visible suggested rewrite.
- "Upgrade this paragraph" produces a higher-register rewrite alongside the original.
- A `'writing-grade'` event lands in the History page with the right meta.
- `DraftCompare.vue` renders score deltas between two graded drafts of the same prompt.
- Composable tests pass (`npm test`); type-check passes (`npm run typecheck`).
- The disclaimer ribbon appears on every editor surface.
