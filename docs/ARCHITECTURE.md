# Grammatik-Atelier · Architecture Reference

> Snapshot for the `improve-codebase-architecture` skill. Captures how data is
> stored, retrieved, and threaded through every quiz / module — plus
> known duplication patterns worth refactoring.
>
> Last verified: v1.11.02 (2026-05-25).

---

## 1. Stack & top-level shape

- **Vue 3 + TypeScript + Vite**, SPA, single bundle, no SSR.
- **Routing:** `vue-router` history mode, ~30 named routes (`src/router.ts`).
- **UI primitives:** `naive-ui` (typography stays serif via `tokens.css` overrides), `echarts` for the history dashboard.
- **Persistence:** Dexie 4 over IndexedDB **+** raw `localStorage`. No backend.
- **AI:** `@google/genai` (Gemini 2.5 Flash by default). User supplies their own API key in Settings; it's stored locally.
- **Deploy:** static `vite build` → `gh-pages` branch.

Entry: `src/main.ts` → boots Dexie, seeds if empty, applies persisted prompt-sizes and palette to `:root`, then mounts `App.vue` which wraps `<NavShell>` in naive-ui providers.

---

## 2. The five storage layers

The app uses five distinct storage strategies. **Knowing which layer a piece of data lives in is the single most important fact when changing anything.**

| # | Layer | What lives there | Lifetime | Touchpoints |
|---|---|---|---|---|
| 1 | **Static TS modules** (`src/data/*.ts`) | All grammar reference data the user can't edit: verbs, prepositions, declension tables, pronouns, case-recognition sentences, writing prompts, rubrics, transformation labels, verb tips, changelog | Bundled · readonly | Imported directly by composables, no DB roundtrip |
| 2 | **Seed JSON** (`src/data/*.seed.json`) | Vocabulary decks the user *can* edit (Manage UI): nouns + adjectives | Bundled at build; copied into Dexie on first run, then independent | `src/db/index.ts` `seedIfEmpty()` / `resetTableToSeed()` |
| 3 | **Dexie / IndexedDB** (`src/db/index.ts`) | `nouns`, `adjectives`, `settings`, `writingDrafts`, `simulatorSessions` | Persistent across reloads; survives until user clears site data | Composables `useNouns` / `useAdjectives` / `useSettings` / `useWritingGrader` / `useSimulatorC1` |
| 4 | **localStorage** (~20 keys, all prefixed `gt:` or named `xxxSetup`) | Quiz history (capped 100), theme, palette overrides, per-quiz prompt sizes, per-quiz setup memory (last selected groups/levels/cases) | Persistent · cleared via Settings · Data tab | `useQuizHistory`, `usePalette`, `useTheme`, `usePromptSizes`, every `*QuizSetup.vue` |
| 5 | **AI runtime** (no persistence) | Declension AI sentences, Konjunktiv I questions, Passiv questions, adjective sentences, paragraph upgrades, writing grades | Per-run only — regenerated on every quiz start; grades persist *into* `writingDrafts` after | `useDeclensionAI`, `useKonjunktivQuiz`, `usePassivQuiz`, `useClaude`, `useWritingGrader` |

Key invariant: **AI-generated content never gets seeded into Dexie**. Writing drafts (Dexie row) store the LLM grade *result* but not the prompt that was used.

---

## 3. Per-dataset catalogue

Every dataset, where it lives, what indexes it on, current size.

| Dataset | File / table | Shape (key fields) | Count (v1.11.02) | Filterable by |
|---|---|---|---|---|
| Nouns | `nouns.seed.json` → Dexie `nouns` | `{german, gender, english, group, createdAt}` PK auto-id, unique `german`, indexes on `gender, group` | 1670 | `group` |
| Adjectives | `adjectives.seed.json` → Dexie `adjectives` | `{german, english, group, createdAt}` PK auto-id, unique `german`, index `group` | 325 | `group` |
| Verbs | `verbs.ts` `VERBS` (frozen array) | `{german, english, level, type, case, auxiliary, praesens, praeteritumStem, partizip2, konjunktiv2?, konjunktiv1?, imperativDu?, ...}` | 378 | `level, type, case` |
| Verb tips | `verb-tips.ts` `VERB_TIPS` (record) | `Record<germanLemma, hintDe>` | 345 | by lemma |
| Prepositions | `prepositions.ts` `PREPOSITIONS` | `{id, german, english, case, level, examples: PrepositionExample[]}` — examples carry their own `usedCase` (resolves two-way), `blanked`, `expectedAnswer` | 37 preps · 400 examples | `level, case` |
| Declension tables | `declension.ts` `DECLENSION_TABLES` | `{id, level, determiner, gender, noun, adjective?, forms: Record<DeclCase,string>}` | 30 | `level, determiner, gender` |
| Article-fill | `declension.ts` `ARTICLE_FILL_ENTRIES` | `{id, level, case, gender, determiner, sentence, blanked, expectedAnswer, alternatives?, gloss, caseRationale}` | 500 (9 themes × ~47) | `level, case, gender, determiner` |
| Adjective endings | `declension.ts` `ADJECTIVE_ENDING_ENTRIES` | `{id, level, inflection, case, gender, preceding, sentence, blanked, baseAdjective, expectedAnswer, gloss}` | 80 | `level, inflection, case, gender` |
| Pronouns | `pronouns.ts` `PRONOUNS` | `{id, category, nominative, english?, meta?, forms: Record<DeclCase,string>}` (reflexive nom/gen = `—`) | 17 | `category` |
| Case-recognition | `case-recognition.ts` | `{id, level, sentence, phrase, case, gloss, rationale}` | 40 | `level, case` |
| Konjunktiv I | runtime (`useKonjunktivQuiz`) | `KiQuestion {id, difficulty, source, reportingClause, referenceAnswer, expectedMood, rationale}` | LLM-generated | `difficulty, topics[]` |
| Passiv | runtime (`usePassivQuiz`) | `PassivQuestion {id, difficulty, active, target, legalTypes, referenceAnswer, rationale}` | LLM-generated | `difficulty, focusedTypes[]` |
| Writing prompts | `writingPrompts.ts` `WRITING_PROMPTS` | `{id, type, defaultRubric, level, titleDe, promptText, promptContext?, targetWords, suggestedMinutes, tags?, source}` | 12 (2 per task type) | `type, level` |
| Writing drafts | Dexie `writingDrafts` | `{id (uuid), promptId, rubric, text, wordCount, createdAt, updatedAt, gradedAt?, graderModel?, result?}` PK `id`, indexes `promptId, gradedAt, createdAt` | user-created | `promptId` |
| Simulator sessions | Dexie `simulatorSessions` | `{id (uuid), startedAt, endsAt, status, task1PromptId, task1DraftId, task2PromptId, task2DraftId, submittedAt?, gradedAt?, abandonedAt?, historySavedAt?}` PK `id`, indexes `status, startedAt` | user-created | `status` |
| Settings | Dexie `settings` | `{id: 'singleton', geminiApiKey, model}` | 1 | — |
| Quiz history | localStorage `gt:quizHistory` | `QuizHistoryEntry[]` cap 100, FIFO | user-runs | by `type` in UI |

---

## 4. Quiz-by-quiz data lifecycle

The app exposes ~17 distinct quiz / drill surfaces. **Each follows the same 4-step pattern** but the storage backing each step differs:

```
Setup page                Runner page                    Result page
─────────                 ───────────                    ───────────
1. Load filter options    2. Read filter from query/     4. saveQuizRun(...) →
   from <data layer>         localStorage; sample            localStorage
                             from <data layer>            → re-route to result
                          3. User answers each item;
                             grade locally OR via LLM
```

| Quiz type (`QuizHistoryType`) | Pool source | Sampler | Local grading? | AI in loop? | History `meta` fields |
|---|---|---|---|---|---|
| `noun-gender` | Dexie `nouns` (group filter) | `useNouns.sampleByGroups` | yes (`gender === answer`) | no | `mode, groups` |
| `noun-translation` | Dexie `nouns` (group filter) | `useNouns.sampleByGroups` | yes (case-insensitive equality on `english`, split on `/`) | no | `mode, groups` |
| `adjective` | Dexie `adjectives` + LLM sentence generator (`useClaude.generateAdjectiveSentences`) | sample N adjs → 1 LLM call per batch → per-item grade | mixed: sentence is LLM-generated, but answer check is local (substring of inflected form) | yes (generator) | `groups` |
| `verb-translation` | `VERBS` const | `useVerbs.sample({levels, types, cases})` | yes (strip parentheticals + slash-split + lowercase) | no | `levels, types, cases` |
| `verb-conjugation` | `VERBS` const | `useVerbs.sample(...)` + tense matrix | yes (via `conjugate.ts` deterministic conjugator) | no | `levels, types, cases, tenses` |
| `prep-case` | `PREPOSITIONS` const | `samplePrepositions({levels, cases})` | yes (compare to `prep.case`) | no | `prepLevels, prepCases` |
| `prep-article` | `PREPOSITIONS` const (examples) | `sampleExamples({levels, cases})` | yes (compare to `example.expectedAnswer` after `normalizeAnswer`) | no | `prepLevels, prepCases` |
| `prep-two-way` | `PREPOSITIONS` const filtered to `case === 'two-way'` | `sampleTwoWayExamples` | yes (compare to `example.usedCase`) | no | — |
| `decl-table` | `DECLENSION_TABLES` const | `sampleDeclensionTables({levels, determiners, genders})` | yes (4 inputs per card → each compared to `forms[case]`) | no | `declLevels, declDeterminers` |
| `decl-article` | `ARTICLE_FILL_ENTRIES` const | `sampleArticleFill({levels, cases, determiners, genders})` | yes (compare to `expectedAnswer` + `alternatives`) | no | `declLevels, declCases, declDeterminers` |
| `decl-adjective` | `ADJECTIVE_ENDING_ENTRIES` const | `sampleAdjectiveEndings({levels, inflections, cases, genders})` | yes (compare to `expectedAnswer`) | no | `declLevels, declInflections` |
| `decl-pronoun` | `PRONOUNS` const | shuffle by `categories` filter | yes (4-row table compare; reflexives skip nom+gen) | no | `declPronounCategories` |
| `decl-case-recognition` | `CASE_RECOGNITION_ENTRIES` const | sample by level | yes (1-of-4 button compare) | no | `declCRLevels, declCRCases` |
| `decl-article-ai` | LLM (`useDeclensionAI.generateDeclensionArticles`) | N/A — model returns N entries direct | yes (per-blank `expectedAnswer` compare; LLM only generated) | yes (generator) | `declAIDifficulty, declAIBlanksCount` |
| `konjunktiv-rewrite` | LLM (`useKonjunktivQuiz.generateKiQuestions`) | model returns N items | **no** — every answer judged via second LLM call (`judgeKi`, temp 0); falls back to reference-equality if grader fails | yes (generator + judge) | `kiDifficulty, kiTopics` |
| `passiv-transform` | LLM (`usePassivQuiz.generatePassivQuestions`) | model returns N items | **no** — LLM judge (`judgePassiv`, temp 0) detects which transformation type the learner produced | yes (generator + judge) | `passivDifficulty, passivFocusedTypes, passivPerTypeCorrect` |
| `writing-grade` | `WRITING_PROMPTS` + user draft (Dexie) | one prompt at a time | **no** — LLM grader (`gradeDraft`, temp 0, retry loop) returns `WritingGradeResult` shaped per Goethe-C1 / telc-C1 rubric in `rubrics.ts` | yes (grader + paragraph-upgrade re-roll) | `promptId, taskType, rubric, bandEstimate, totalScore, wordCount` |
| `simulator-c1` | wraps two `writing-grade` runs under one Dexie row | `createSession()` picks random Forumsbeitrag + formelle-E-Mail prompts | inherits writing-grade behaviour | yes (calls writing grader twice) | `sessionId, task1Score, task2Score, combinedScore, passes` |

---

## 5. Composable patterns (three families)

### 5a. **DB-backed CRUD** — `useNouns`, `useAdjectives`, `useSettings`

```ts
const items = ref<T[]>([])
async refresh() { items.value = await db.<table>.orderBy(...).toArray() }
async create(input) { await db.<table>.add({...input, createdAt: Date.now()}); await refresh() }
async update(id, patch) { await db.<table>.update(id, patch); await refresh() }
async remove(id) { await db.<table>.delete(id); await refresh() }
async sample(n) | sampleByGroups(groups, n) { /* in-memory Fisher-Yates */ }
```

> Each consumer instantiates its own `ref` — no shared store. That's fine because Manage and Quiz pages don't share state, but **the Fisher-Yates sampler is duplicated literally in `useNouns`, `useAdjectives`, `useVerbs`, `useDeclension`, `usePrepositions`** — a candidate for extraction.

### 5b. **Const-backed filter + sample** — `useVerbs`, `useDeclension`, `usePrepositions`, `useWritingPrompts`, `useUserData`

No async, no DB. Pure functions over a frozen array:

```ts
export function filterX(f: Filter): T[] { return ARRAY.filter(matches) }
export function sampleX(n: number, f: Filter): T[] {
  const pool = filterX(f); return [...pool].sort(() => Math.random() - 0.5).slice(0, n)
}
```

> Every const-backed sampler uses the **same `[...pool].sort(() => Math.random() - 0.5)` idiom** even though `useNouns` uses Fisher-Yates. Both produce a shuffle; the sort-by-random is statistically biased but the bias is invisible at our pool sizes. Worth picking one canonical approach.

### 5c. **AI generator + validator** — `useDeclensionAI`, `useKonjunktivQuiz`, `usePassivQuiz`, `useClaude`, `useWritingGrader`

Each has the same five-piece anatomy:

```
1. SYSTEM_PROMPT / DIFFICULTY_BRIEF       — string constants
2. <POOL>                                  — random-scenario / subject / verb-domain
                                              array (added v1.11.01–02 for variety)
3. RESPONSE_SCHEMA                         — Gemini responseSchema JSON
4. validateEntry(raw)                      — multi-stage rejection (struct sanity →
                                              enum check → grammar-table lookup)
5. generateX(client, opts)                 — retry loop (default 2 retries) calling
                                              client.models.generateContent with
                                              { responseMimeType: 'application/json',
                                                responseSchema, temperature, topP }
                                              and pushing accepted entries into the
                                              return array until `count` reached or
                                              retries exhausted
```

Generators run at `temperature: 0.85–0.9, topP: 0.95` (post v1.11.01) and inject:

- a random subset of a scenario / subject / domain pool, listed in the prompt
- a short `Math.random()` base-36 token labelled "variation seed"

Graders/judges (`judgeKi`, `judgePassiv`, `gradeDraft`) intentionally run at `temperature: 0` for deterministic verdicts. `upgradeParagraph` (the C1-rewrite tool) runs at `0.75` — a compromise (high enough to give a different rewrite each click, low enough to stay faithful to the source).

`GeminiClient` is **interface-duck-typed** in each file (same shape, declared 5×). The single concrete client lives in `useClaude.ts` (`makeGeminiClient(apiKey)`) and wraps `GoogleGenAI`. Refactor candidate: hoist `GeminiClient` to a shared type.

---

## 6. AI generation pipeline (v1.11.02)

All five Gemini calls now look like this. Documented for the skill's reference:

```
[prompt builder]
   ├── difficulty brief             (per-quiz constant)
   ├── case/topic/type focus        (user setup filter, or "mix across batch")
   ├── pickFrom(<POOL>, ~6, Math.random)   ← variety seed
   ├── crypto-strength variation token
   └── strict requirements + schema reminder

         ↓

[client.models.generateContent]
   model:    settings.model (default gemini-2.5-flash)
   contents: prompt
   config:   responseMimeType json, responseSchema, temperature, topP

         ↓

[parse + validate]
   JSON.parse → entries[]
   for each: validateEntry(raw)         ← rejects malformed or wrong-form
   push accepted, count rejected

         ↓

[retry?]
   while accepted.length < count && attempts < maxRetries
```

The pool members + their files:

| File | Pool name | Used in |
|---|---|---|
| `useDeclensionAI.ts` | `SCENARIO_POOL` (36 scenarios) | `buildPrompt` |
| `useKonjunktivQuiz.ts` | `KI_SUBJECT_POOL` (20 subjects), `KI_REPORTING_VERB_POOL` (16 verbs) | `buildKiGeneratorPrompt` |
| `usePassivQuiz.ts` | `PASSIV_DOMAIN_POOL` (24 domains) | `buildPassivGeneratorPrompt` |
| `useClaude.ts` | `ADJECTIVE_ANGLE_POOL` (14 angles) | `generateAdjectiveSentences` |
| `useWritingGrader.ts` | `UPGRADE_ANGLE_POOL` (12 rhetorical strategies) | `upgradeParagraph` |

---

## 7. History (single shared layer)

- **One localStorage key**: `gt:quizHistory`. **One write function**: `saveQuizRun(entry)` from `useQuizHistory.ts`. Called from **17 places** (every runner / result page).
- Cap: **100 entries**, FIFO via `arr.slice(0, 100)` after `unshift`.
- Each entry carries a `type: QuizHistoryType` (string union of 17 values) and a `meta: QuizHistoryMeta` (loose record with all per-quiz extras — 30+ optional fields jammed into one shape). 
- The `id` field is set to `Date.parse(startedAt)` so it sorts naturally and is stable per run.
- **`useQuizStats.ts`** (422 LOC) does all aggregate / chart computation off this single source. ECharts options are themed via `useEchartsTheme.ts`.

> Smell: `QuizHistoryMeta` is a kitchen-sink with ~30 mutually-exclusive optional fields. Could be split into a discriminated union keyed off `type`. Currently saved by callers that hand-pick the right subset; nothing in the type system prevents an `adjective` run from setting `kiTopics`.

---

## 8. Settings / display / palette

Three independent stacks, all written before Dexie was added for settings:

| Concern | Storage | Module | CSS surface |
|---|---|---|---|
| Theme (light/dark) | `localStorage.theme` + `<html data-theme>` | `useTheme` (FOUC-prevention in `main.ts`) | tokens.css `:root[data-theme="dark"]` overrides |
| Palette overrides | `localStorage.gt:palette` (`{light: Record<token,hex>, dark: Record<token,hex>}`) | `usePalette` (12 tokens × 2 themes) | sets CSS vars on `:root` |
| Prompt sizes | `localStorage.gt:{kind}PromptSize` × 4 (verb/noun/adj/decl) | `usePromptSizes` (initialized in `main.ts` pre-mount) | sets CSS vars on `:root` |
| Gemini API key + model | Dexie `settings` row PK `'singleton'` | `useSettings` | n/a |

> `useUserData.ts` is the export/import bridge — bundles all 20+ localStorage keys into one JSON payload. **Does not touch Dexie** by design (API key safety).

---

## 9. Cross-cutting helpers

| Helper | File | Used by | Notes |
|---|---|---|---|
| Conjugation engine | `conjugate.ts` (198 LOC) | verb-conjugation quiz, verb cheatsheet | Pure deterministic — 15 tenses computed from `Verb` record fields. **No tests of irregulars beyond what `VERBS` data covers.** |
| Pagination | `usePagination.ts` | History, Manage Nouns, every result list | Shared reactive component |
| Breakpoint | `useBreakpoint.ts` | Layouts that need conditional rendering | 720px split |
| Toast stack | `useToast.ts` + `ToastStack.vue` | AI errors, save successes | 4s default, 6s for errors |
| Loading mask | `useLoading.ts` + `LoadingOverlay.vue` | Wrapped around every Gemini call | Pulsing dots + title/subtitle |
| ECharts theming | `useEchartsTheme.ts` | History dashboard | Reads from same CSS vars as `usePalette` so charts re-skin with the palette |
| Naive-ui glue | `App.vue` | NConfigProvider with darkTheme when `resolved.value === 'dark'` |

---

## 10. File map (with sizes)

```
src/
├── data/                                     # Layer 1 + 2 (static + seed)
│   ├── verbs.ts                  6,481 LOC   # 378 verbs (largest single file)
│   ├── nouns.seed.json           7,438 lines # 1670 nouns
│   ├── prepositions.ts           1,037 LOC   # 37 preps · 400 examples
│   ├── declension.ts             2,560 LOC   # tables 30 + article-fill 500 + adj 80
│   ├── adjectives.seed.json        327 lines # 325 adjs
│   ├── verb-tips.ts                413 LOC   # 345 German hints
│   ├── case-recognition.ts         386 LOC   # 40 entries
│   ├── writingPrompts.ts           335 LOC   # 12 prompts + types
│   ├── rubrics.ts                  301 LOC   # Goethe-C1 + telc-C1 criteria
│   ├── changelog.ts                221 LOC   # APP_VERSION + history
│   ├── konjunktiv.ts                99 LOC   # types + LLM schema (no static items)
│   ├── passiv.ts                   119 LOC   # types + LLM schema (no static items)
│   ├── pronouns.ts                  90 LOC   # 17 pronouns
│   ├── declension-ai.ts             64 LOC   # types + DEFINITE/INDEFINITE_FORMS lookup
│   └── simulatorC1.ts               46 LOC   # types + EXAM constants
│
├── db/
│   ├── index.ts                    138 LOC   # Dexie class, 6 versions, seedIfEmpty
│   └── types.ts                     67 LOC   # Noun/Adjective/Settings + group enums
│
├── composables/
│   ├── useQuizStats.ts             422 LOC   # all history aggregations + chart data
│   ├── useWritingGrader.ts         391 LOC   # grader + upgradeParagraph + persist
│   ├── usePassivQuiz.ts            310 LOC   # generator + judge
│   ├── useKonjunktivQuiz.ts        305 LOC   # generator + judge
│   ├── useDeclensionQuiz.ts        259 LOC   # all three declension quiz orchestrators
│   ├── useUserData.ts              257 LOC   # localStorage export/import
│   ├── useDeclensionAI.ts          253 LOC   # AI declension generator
│   ├── usePalette.ts               225 LOC   # 12 tokens × 2 themes
│   ├── useSimulatorC1.ts           184 LOC   # session CRUD + grading
│   ├── usePromptSizes.ts           158 LOC   # 4 size sliders
│   ├── useVerbQuiz.ts              157 LOC
│   ├── useClaude.ts                152 LOC   # adjective sentence generator
│   ├── usePrepositionQuiz.ts       122 LOC
│   ├── useQuizHistory.ts           127 LOC   # **single source of truth for history**
│   ├── useDeclension.ts             93 LOC   # const filter + sample wrappers
│   ├── useTheme.ts                  77 LOC
│   ├── useToast.ts                  73 LOC
│   ├── usePagination.ts             75 LOC
│   ├── usePrepositions.ts           72 LOC
│   ├── useNouns.ts                  65 LOC
│   ├── useAdjectives.ts             65 LOC
│   ├── useLoading.ts                59 LOC
│   ├── useAdjectiveQuiz.ts          56 LOC
│   ├── useNounQuiz.ts               47 LOC
│   ├── useVerbs.ts                  38 LOC
│   ├── useSettings.ts               32 LOC
│   ├── useEchartsTheme.ts          105 LOC
│   ├── useWritingPrompts.ts         25 LOC
│   ├── useBreakpoint.ts             19 LOC
│   └── conjugate.ts                198 LOC   # **pure** conjugation engine
│
├── modules/                                  # One folder per module (13 total)
│   └── <name>/  Home.vue + Setup.vue + Runner.vue + Result.vue
│
├── components/
│   ├── NavShell.vue                          # header, drawer, router-view container
│   ├── LoadingOverlay.vue
│   ├── ToastStack.vue
│   ├── VersionBadge.vue
│   ├── Pagination.vue
│   └── charts/ ...                           # ECharts panel components
│
└── styles/
    └── tokens.css                            # ~2000 LOC — design tokens, paper grain,
                                              # nav layout, mobile overrides, sticky-fix
```

---

## 11. Known duplication / refactor candidates

For the architecture-improvement skill — these are the recurring smells I noticed while documenting:

1. **`GeminiClient` interface declared 5×.** Identical shape in `useDeclensionAI.ts`, `useKonjunktivQuiz.ts`, `usePassivQuiz.ts`, `useClaude.ts`, `useWritingGrader.ts`. Hoist to `src/composables/gemini/types.ts`.

2. **Two shuffle idioms coexist.** `[...arr].sort(() => Math.random() - 0.5)` (biased) is used in 6 files; Fisher-Yates only in `useNouns.sample` / `sampleByGroups`. Pick one helper.

3. **AI generator anatomy is identical across 4 files** (`buildPrompt` → `validateEntry` → `generateX` retry loop). Generic `runGenerator(client, opts, schema, prompt, validate, retries)` would collapse ~150 LOC of boilerplate per file.

4. **Pool-selection helper duplicated** — `useDeclensionAI` has `pickScenarios`, `useKonjunktivQuiz` has `pickFrom`, `usePassivQuiz` has `pickDomains`. Same algorithm.

5. **`QuizHistoryMeta` is a 30-field kitchen sink.** Discriminated union keyed off `type` would catch wrong-meta-for-wrong-quiz bugs at compile time.

6. **Setup-page localStorage keys are bare strings** in 14 places (`nounQuizSetup`, `prepCaseSetup`, …) and only re-listed in `useUserData.USER_DATA_KEYS` (which is the only enforcement they form a closed set). Worth a `SETUP_KEYS` const.

7. **Two writing-grade history entry sites:** `useWritingGrader.gradeAndPersist` writes a `writing-grade` history entry; `SimulatorResult.vue` writes a `simulator-c1` entry. Both via direct `saveQuizRun` call — there's no service layer between runner pages and the history store.

8. **`tokens.css` is monolithic (~2000 LOC).** Mixes design tokens, layout rules, mobile overrides, paper-grain SVG, and module-specific styles. Could split by concern.

9. **Module folders don't follow a uniform layout.** Some have `QuizRunner.vue`, some have `QuizRunner` + `TranslationQuizRunner` + `ConjugationQuizRunner`; some have a `Result.vue`, some inline results into the runner. A "module manifest" interface would help.

10. **`useDeclensionQuiz` (259 LOC) does triple duty** — orchestrates table-, article-, and adjective-quiz state. The three quizzes share no UI; splitting into three smaller composables would let each be tested in isolation.

11. **Manage UI exists only for nouns + adjectives.** The other vocabulary surfaces (verbs, prepositions, declension entries) are still TS-module-only. Migration path to "everything is a Dexie row with seed-on-empty" is reasonable but a larger lift.

12. **No central "sample N items from pool" abstraction** even though it's the read-side primitive for every quiz. With #2 and #4 unified, every quiz's setup → runner handoff would look the same.

---

## 12. Test surface (for context)

- 38 test files, 397 tests, all passing as of v1.11.02.
- Heavy on composable unit tests; light on Vue component tests (only `ThemeToggle.test.ts`).
- AI generators tested by mocking `client.models.generateContent` and asserting the validator behavior + retry loop.
- Test for article-fill data invariants (`tests/data/declension.test.ts`) enforces `expectedAnswer` appears exactly once in `sentence` — this is the test that caught 6 substring collisions when the themed seed data was added.

---

## 13. Build + ship

- `npm run dev` — Vite dev server.
- `npm run build` — `vue-tsc --noEmit && vite build` — strict TS, no `any`-cast gates.
- `npm test` — vitest, jsdom, fake-indexeddb for Dexie tests.
- `npm run deploy` — predeploy builds + writes `.nojekyll`, then `gh-pages -d dist --dotfiles`.
- One large chunk (`HistoryPage` ~755 kB) — ECharts is the culprit. Lazy-loading already in place via dynamic imports in `router.ts`.

---

End of architecture snapshot.
