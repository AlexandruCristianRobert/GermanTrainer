# German Trainer — Design Spec

- **Date:** 2026-05-04
- **Project root:** `D:\Repos\GermanTrainer`
- **Status:** Draft, pending user review

## 1. Goal

A personal-use Vue web app for practicing German vocabulary. Two independent modules:

1. **Nouns module** — quiz the user on noun gender (`der` / `die` / `das`) or English translation.
2. **Adjectives module** — generate German sentences via the Anthropic API using random adjectives from a user-managed list, blank out the adjective, and have the user fill it in.

Both modules support user-managed word lists (add/edit/delete, persisted locally) and configurable quiz length.

## 2. Constraints and decisions

| # | Decision | Reason |
|---|---|---|
| 1 | Pure Vue SPA, no backend | Personal use only; user accepts API key in browser. |
| 2 | Anthropic (Claude) is the AI provider | User preference. SDK called direct from browser with `dangerouslyAllowBrowser: true`. |
| 3 | Bundled JSON seed data + in-app editor | Predictable starter content; user can curate over time. |
| 4 | IndexedDB (Dexie) for all persistence | User expects ~500 entries per module; keeps all persistence in one place. |
| 5 | Vue 3 + Vite + TypeScript + Naive UI | Modern default with a polished component library; user picked Naive UI. |
| 6 | Composables (no Pinia) | Two modules; Pinia is unneeded ceremony. |
| 7 | Quiz feedback: inline per question + end-of-quiz summary | User study preference (option C). |
| 8 | Quiz history not persisted in v1 | Explicitly out of scope. |

## 3. Tech stack

- **Framework:** Vue 3, Vite, TypeScript (strict).
- **UI library:** Naive UI.
- **Routing:** Vue Router 4.
- **Persistence:** Dexie (IndexedDB).
- **Utilities:** VueUse (used sparingly, e.g. for the API-key input).
- **AI client:** `@anthropic-ai/sdk` with `dangerouslyAllowBrowser: true`.
- **Tests:** Vitest, Vue Test Utils, `fake-indexeddb`.

## 4. Project layout

```
GermanTrainer/
├── docs/superpowers/specs/                  # this spec lives here
├── public/
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router.ts
│   ├── data/
│   │   ├── nouns.seed.json                  # ~150 starter nouns
│   │   └── adjectives.seed.json             # ~150 starter adjectives
│   ├── db/
│   │   ├── index.ts                         # Dexie schema, migrations, seeding
│   │   └── types.ts                         # Noun, Adjective, Settings interfaces
│   ├── composables/
│   │   ├── useNouns.ts                      # CRUD + random sampling
│   │   ├── useAdjectives.ts                 # CRUD + random sampling
│   │   ├── useSettings.ts                   # API key + model
│   │   └── useClaude.ts                     # Anthropic SDK wrapper
│   ├── modules/
│   │   ├── nouns/
│   │   │   ├── NounsHome.vue
│   │   │   ├── ManageNouns.vue
│   │   │   ├── QuizSetup.vue
│   │   │   ├── GenderQuiz.vue
│   │   │   ├── TranslationQuiz.vue
│   │   │   └── QuizResult.vue
│   │   └── adjectives/
│   │       ├── AdjectivesHome.vue
│   │       ├── ManageAdjectives.vue
│   │       ├── QuizSetup.vue
│   │       ├── SentenceQuiz.vue
│   │       └── QuizResult.vue
│   └── components/
│       ├── NavShell.vue
│       ├── EntryList.vue
│       ├── EntryEditor.vue
│       └── ApiKeyForm.vue
├── tests/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 5. Data model

### 5.1 IndexedDB schema (Dexie)

```ts
type Gender = 'der' | 'die' | 'das'

interface Noun {
  id?: number          // auto-increment PK
  german: string       // e.g. "Tisch" — no leading article; gender stored separately
  gender: Gender
  english: string      // e.g. "table"; multiple acceptable answers separated by "/"
  createdAt: number    // epoch ms
}

interface Adjective {
  id?: number
  german: string       // base form, e.g. "schön"
  english: string      // e.g. "beautiful"
  createdAt: number
}

interface Settings {
  id: 'singleton'      // fixed key — only one row
  anthropicApiKey: string
  model: string        // default 'claude-sonnet-4-6'
}
```

Dexie indexes:

- `nouns`: `++id, &german, gender`
- `adjectives`: `++id, &german`
- `settings`: keyed by `id`

`&german` makes the German word a unique index per table — prevents duplicate entries.

### 5.2 Seeding

On app startup, for each of `nouns` and `adjectives`: if the table is empty, bulk-insert from the corresponding `*.seed.json`. Idempotent — re-runs after the user has edited the table do nothing. A "Reset to defaults" action in the manage screens wipes the table and re-seeds (with confirmation).

### 5.3 Quiz session — in memory only

A `QuizSession` object lives in the active component while a quiz runs. It is **not** persisted; refreshing mid-quiz loses progress. Shape:

```ts
interface QuizQuestion<T> {
  item: T                          // Noun, Adjective, or { adjective, sentence, blanked }
  userAnswer: string | null
  isCorrect: boolean | null
}

interface QuizSession<T> {
  mode: string                     // 'gender' | 'translation' | 'sentence'
  questions: QuizQuestion<T>[]
  currentIndex: number
}
```

## 6. User flows

### 6.1 Routes

```
/                          home (cards: Nouns, Adjectives, Settings)
/settings                  API key + model
/nouns                     module home (Manage / Quiz)
/nouns/manage              CRUD table
/nouns/quiz                setup → quiz → result
/adjectives                module home
/adjectives/manage         CRUD table
/adjectives/quiz           setup → generate → quiz → result
```

### 6.2 Noun quiz

1. Setup screen: pick **mode** (Gender / English translation) and **count** (10 / 15 / 20 / custom number; capped to total nouns in DB).
2. App samples N random nouns, no repeats within a quiz.
3. Per question:
   - **Gender mode:** show German word, three buttons `der` `die` `das`.
   - **Translation mode:** show German word, single text input. Match is case-insensitive and trimmed; if the stored English contains `/`, any segment is accepted (e.g. `"table/desk"` accepts both).
4. Inline feedback after each answer (✅/❌, correct answer revealed, "Next" button).
5. End-of-quiz summary: every question with the user's answer, the correct answer, and a final score (e.g. 14/20).

### 6.3 Adjective quiz

1. Setup screen: pick **count** (10 / 15 / 20 / custom). Capped to total adjectives in DB.
2. App samples N random adjectives.
3. **One** Anthropic API call generates all N sentences (see §7).
4. While the call is in flight: loading state with a "Cancel" button.
5. On success, build the quiz: each entry's `adjective_inflected` is replaced with `_____` in the sentence.
6. Per question:
   - Show the blanked sentence, single text input.
   - Match accepts **either** the inflected form or the base form (case-insensitive, trimmed).
   - Inline feedback: ✅/❌, reveal both the inflected form (as it appeared) and the base form.
7. End-of-quiz summary: each sentence un-blanked, user's answer, both correct forms, final score.

### 6.4 Manage screens (both modules)

- Naive UI `n-data-table` with column-based search.
- Add via modal form; edit inline or via modal; delete with single-row confirmation.
- "Reset to defaults" with a strong-confirmation modal ("This deletes all your custom entries").

### 6.5 Settings

- Anthropic API key — masked password input.
- Model dropdown: default `claude-sonnet-4-6`; alt `claude-haiku-4-5-20251001`.
- "Test connection" button — sends a one-line prompt; shows green check or the error message.

## 7. Anthropic API integration

### 7.1 Request shape

One API call per adjective quiz, using the Messages API with **tool use as structured output**.

- **Model:** from settings.
- **System prompt** (cached with `cache_control: { type: 'ephemeral' }`): "You generate short, natural German sentences for adjective practice. Each sentence must use exactly the given adjective in a grammatically correct inflected form."
- **User message:** the list of N adjective base forms.
- **Tool definition** (`submit_sentences`) with input schema:

```json
{
  "type": "object",
  "properties": {
    "sentences": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "adjective_base": { "type": "string" },
          "adjective_inflected": { "type": "string" },
          "sentence": { "type": "string" }
        },
        "required": ["adjective_base", "adjective_inflected", "sentence"]
      }
    }
  },
  "required": ["sentences"]
}
```

- **`tool_choice`:** `{ "type": "tool", "name": "submit_sentences" }` to force the call.

### 7.2 Response handling

- Read the assistant's tool-use block; parse `input.sentences`.
- Validate each entry: all three fields non-empty AND `sentence.toLowerCase()` contains `adjective_inflected.toLowerCase()`.
- If fewer than N valid entries remain, make **one** top-up call for the missing adjectives. After that, present whatever is valid; if zero, surface an error.

### 7.3 Why tool use, not free-form JSON

Tool inputs are server-side schema-validated, eliminating prose preambles, ```json fences, and partial parses.

### 7.4 Caching

The system prompt is identical across calls; marking it as a cache breakpoint reduces cost on repeated quizzes within the 5-minute TTL.

## 8. Error handling

| Situation | Behavior |
|---|---|
| No API key set | Adjective-quiz "Start" button disabled with a tooltip "Set your API key in Settings". Nouns module is unaffected. |
| Key invalid (401 from Anthropic) | Toast: "Anthropic rejected the key. Check Settings." |
| Rate limited (429) | Toast with retry-after; auto-retry once after the suggested delay; if still failing, show manual retry. |
| Network failure | Toast plus manual "Retry" button on the loading screen. |
| No tool call in response / malformed input | Show the raw response in a collapsible panel + "Regenerate" button. No silent fallback. |
| Sentence does not contain its `adjective_inflected` | Drop the entry. If short of `count`, one top-up call for the missing adjectives. |
| Empty word list when starting a quiz | Setup screen shows "Add some entries first" plus a button to Manage. |
| User picks count > available entries | Cap to available; show inline notice "Only N entries available — quizzing all of them." |
| Reset-to-defaults | Confirmation modal: "This deletes all your custom entries. Continue?" |
| IndexedDB unavailable (e.g. Firefox private mode) | Fatal-state screen explaining the app needs IndexedDB. |

## 9. Security notes

- The Anthropic API key sits in IndexedDB and is sent directly from the browser to `api.anthropic.com`. Anyone with access to the user's browser profile can read it.
- This is acceptable for personal use only and is documented in the Settings screen (small note under the key field).
- The app must not be deployed as a public site without a backend proxy; this is called out in the project README.

## 10. Testing strategy

### 10.1 Vitest unit tests (primary coverage)

- `db/index.ts` — schema setup, seeding idempotency, CRUD for nouns/adjectives/settings, using `fake-indexeddb`.
- `composables/useNouns.ts`, `useAdjectives.ts` — random sampling (no repeats, count, capping), CRUD round-trips.
- Answer matching — case-insensitive trimmed match, `/`-separated multi-answer for translation, base-or-inflected acceptance for adjectives.
- Sentence validation — rejects entries whose sentence does not contain the inflected form.
- `useClaude.ts` — request-shape building (system prompt, tool definition, model from settings), response parsing for the success case, and each error-matrix branch with mocked SDK responses.

### 10.2 Vue Test Utils component tests

- `GenderQuiz.vue` — clicking a gender button records the answer, shows correct/incorrect, advances on Next.
- `SentenceQuiz.vue` — input is blanked correctly, accepts both inflected and base forms.
- `QuizResult.vue` — renders all questions with markers and final score.
- `EntryList.vue` / `EntryEditor.vue` — add/edit/delete round-trips through the composable.

### 10.3 Not unit-tested

- Real Anthropic API calls. The SDK is mocked in unit tests; correctness of generated German is verified by a manual smoke run (paste real key, run a 10-adjective quiz, sanity-check the sentences).

### 10.4 Out of scope for v1

- E2E tests (Playwright/Cypress).
- Visual regression tests.
- Performance tests (500 entries in IndexedDB is trivial).

## 11. Out of scope for v1

- Quiz history / score tracking across sessions.
- Verb conjugation module (separate `GermanVerbTester` ASP.NET project already covers this).
- Multi-user / sync / cloud backup.
- Import/export of word lists (other than editing the seed JSON before build).
- Backend proxy for the Anthropic key.
- i18n — UI is English only.

## 12. Open questions

None at spec-write time. All decisions in §2 came from explicit user choice.
