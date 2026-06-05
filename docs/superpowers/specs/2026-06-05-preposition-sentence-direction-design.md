# Drill E — Bidirectional + dual-grading Sentence Translation

**Date:** 2026-06-05
**Module:** Prepositions → Drill E (Satzübersetzung · KI)
**Status:** Approved, ready for implementation

## Problem

The preposition sentence-translation quiz (drill **E**) only runs one way: the AI
generates an English+German sentence pair per random preposition, the learner reads
the **English** and types the **German**, and the answer is graded by a local
exact-match against the German reference. The learner wants to also drill the reverse
direction (read German, type English), and to choose how answers are graded.

## Decisions

1. **Direction is a single per-quiz choice** picked on Setup: `EN → DE` (current) or
   `DE → EN`. No "mixed" option.
2. **Grading mode is an independent per-quiz choice:** `AI` or `Exact match`. The two
   controls are orthogonal — all four combinations are valid:

   | | Exact-match | AI grading |
   |---|---|---|
   | **EN→DE** | today's behavior (local match vs German) | AI judges the German, accepts valid alternatives, tip on miss |
   | **DE→EN** | strict local match vs English | AI judges the English, accepts paraphrases, tip on miss |

3. **AI grading runs per answer (immediate),** preserving the existing
   answer → feedback → Next rhythm. A short "Checking…" state shows while the call runs.
4. **AI grading returns a coaching tip on wrong answers** — one short, specific hint
   referencing the mistake (case, preposition, word choice, meaning drift).
5. **Sentence generation is unchanged.** The AI already produces both English and German
   for every item (German validated to use the target preposition); both directions read
   from the same generated pair. No generation prompt/schema change.

## Components

### 1. `src/composables/useSentenceQuiz.ts` (data model + AI grader)
- New types: `export type Direction = 'en-de' | 'de-en'` and
  `export type GradingMode = 'ai' | 'exact'`.
- `SentenceVerdict` gains `tip?: string`.
- New AI grader, mirroring `useWritingGrader.gradeDraft` structure:
  - `buildGradePrompt(opts)` → `{ system: string; user: string }` — **pure, tested**.
  - `parseGrade(raw: unknown)` → `{ correct: boolean; tip?: string } | null` — **pure, tested**.
  - `gradeAnswer(client, opts)` → `Promise<{ correct: boolean; tip?: string }>` — one
    retry; throws on exhausted attempts (caller falls back to local check).
  - `GradeAnswerOptions`: `{ model, direction, english, german, prepGerman, prepEnglish, case, userAnswer }`.
  - Schema `{ correct: boolean, tip: string }`, `temperature: 0`.
  - Prompt: state the reference pair + which language the learner typed; instruct the
    model to accept natural alternative phrasings (for German the target preposition must
    be present in the correct case); return `correct`; **if incorrect, return a one-sentence
    English `tip`** pinpointing the error; empty tip when correct.
- `checkSentence` / `normalizeGerman` / `prepUsed` are kept and reused for exact mode.

### 2. `src/modules/prepositions/SentenceQuizSetup.vue`
- Two new segmented controls (mirroring the existing "Nouns per sentence" control):
  - **Direction:** `EN → DE` / `DE → EN`.
  - **Grading:** `AI` / `Exact match` (with one line of helper text each).
- Both values persisted in the existing `prepSentenceSetup` localStorage blob (`Stored`)
  and written into the session stash (`gt:lastPrepSentenceQuiz`).
- "How this drill works" alert text reflects the chosen direction + grading mode.

### 3. `src/modules/prepositions/SentenceQuizRunner.vue`
- Reads `direction` + `gradingMode` from the stash (defaults: `en-de`, `exact` for
  backward compatibility with any stash written before this change).
- **Prompt card** shows the *source* sentence — English for `en-de`, German for `de-en`.
  Hint + input placeholder flip ("Translate into German." / "Deutsch…" ↔
  "Translate into English." / "English…").
- **submit():**
  - *exact* → synchronous local `checkSentence(userInput, target)` where target =
    German for `en-de`, English for `de-en`.
  - *ai* → `phase = 'checking'`, `await gradeAnswer(...)` (client via
    `resolveAiClient(settings)`, model via `settings.model`), store `{ correct, tip }`;
    input disabled and Submit shows "Checking…" during the call. On error, fall back to
    the local `checkSentence` against the target and surface a quiet note.
- **Feedback + result rows:** the reference shown is the *target*-language sentence; when
  a `tip` is present (AI mode, wrong answer) it is shown beneath the reference.
- **Retry-wrong** carries the same direction/grading (deck reload only).
- **History:** `saveQuizRun` meta gains `sentenceDirection` and `sentenceGrading`
  (same `prep-sentence` `type`).

### 4. `src/composables/useQuizHistory.ts`
- `QuizHistoryMeta` gains `sentenceDirection?: 'en-de' | 'de-en'` and
  `sentenceGrading?: 'ai' | 'exact'` (additive; existing charts unaffected).

### 5. `src/data/changelog.ts`
- Prepend a `polish` entry; bump `APP_VERSION` to `1.11.11`.

## Stash / storage contract (shared between Setup and Runner)
- Session stash `gt:lastPrepSentenceQuiz`: existing `{ sentences, cases, groups, nounsPer }`
  **plus** `direction: 'en-de' | 'de-en'` and `gradingMode: 'ai' | 'exact'`.
- Setup localStorage `prepSentenceSetup`: existing keys **plus** `direction?`, `gradingMode?`.

## Testing
- TDD on the pure pieces: `buildGradePrompt` (covers both directions + tip instruction),
  `parseGrade` (valid / missing-fields / non-object), and a `gradeAnswer` happy-path +
  retry/throw path using the existing `fakeClient` helper in the test file.
- Existing `useSentenceQuiz` tests must keep passing.
- `npm run build` (typecheck) and `npm test` green before deploy.

## Out of scope (YAGNI)
- No "Mixed" direction. No batch-at-finish grading. No change to sentence generation.
  No new history `type`. No new chart.
