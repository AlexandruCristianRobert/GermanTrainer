# Sprint 1B — Module 10 · AI Writing Tutor · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a free-form German writing surface with Goethe C1 / telc C1 rubric grading — drafting, autosave, per-criterion rubric feedback, inline note overlay, paragraph upgrade, draft history, and draft-to-draft comparison.

**Architecture:** One new module folder (`src/modules/writing/`), two new composables, two new data files, one new Dexie table (`writingDrafts`), one history-union extension. The grader pipeline mirrors `useDeclensionAI` (build prompt → Gemini with `responseSchema` → JSON.parse → validate → retry). The editor surface is a single page with a draft mode and a post-grade review mode — no Setup→Editor→Result triplet, deliberately.

**Tech Stack:** Vue 3 (`<script setup lang="ts">`), TypeScript, Vite, Naive UI (used only for inputs and buttons; the rest is custom CSS reusing existing tokens), Vue Router, Dexie (IndexedDB — gets one new table here), `@google/genai` for Gemini (the misleadingly-named `useClaude.ts` is the wrapper — reuse it; do NOT add an Anthropic SDK). Vitest + `fake-indexeddb` + jsdom for tests.

**Spec:** `docs/superpowers/specs/2026-05-24-writing-tutor-design.md` (commit `f85145f`).

**Predecessor:** Sprint 1A (Konjunktiv I + Passiv) is shipped on `main`. The history extension pattern, the AI generator/judge pattern, the home-tile pattern, and the `useClaude`/`useSettings`/`useLoading`/`useToast` plumbing are all established. Mirror them.

---

## File map

**Files created**

| Path | Responsibility |
|---|---|
| `src/data/writingPrompts.ts` | Types (`WritingTaskType`, `RubricSystem`, `WritingPrompt`, `WritingDraft`) + 12-prompt seed catalogue. |
| `src/data/rubrics.ts` | Rubric descriptor types + `GOETHE_C1` + `TELC_C1` + `RUBRICS` map. |
| `src/composables/useWritingPrompts.ts` | Seed-array loader, lookup-by-id, filter by task type / level. |
| `src/composables/useWritingGrader.ts` | `validateGradeResult` (pure), `gradeDraft` (with retry), `upgradeParagraph`, `gradeAndPersist` (Dexie write + history). |
| `src/modules/writing/WritingHome.vue` | Catalogue grid (six task types) + recent-drafts panel. |
| `src/modules/writing/PromptDetail.vue` | One prompt's body + its draft history list with actions. |
| `src/modules/writing/EditorSurface.vue` | Draft mode (autosave) + Review mode (criteria panel, inline notes, paragraph upgrade). |
| `src/modules/writing/DraftCompare.vue` | Side-by-side two-draft view with score deltas. |
| `tests/composables/useWritingGrader.test.ts` | Validator + retry + fallback tests. |
| `tests/composables/useWritingPrompts.test.ts` | Lookup + filter tests. |

**Files modified**

| Path | Change |
|---|---|
| `src/db/types.ts` | No change to type exports; the `Settings` type stays as-is. |
| `src/db/index.ts` | Add `writingDrafts!: Table<WritingDraft, string>` and `.version(5)` migration. |
| `src/router.ts` | +5 new routes (see Task 9 / 10 / 11 / 13). |
| `src/composables/useQuizHistory.ts` | Extend `QuizHistoryType` with `'writing-grade'`; extend `QuizHistoryMeta` with `promptId`, `taskType`, `rubric`, `bandEstimate`, `totalScore`, `wordCount`. |
| `src/modules/history/HistoryPage.vue` | Add label + ordering for `'writing-grade'`. |
| `src/components/charts/quiz-type-labels.ts` | Add `'writing-grade'` to exhaustive `Record<QuizHistoryType, …>` maps. |
| `src/composables/useQuizStats.ts` | Add `'writing-grade'` to exhaustive bucket maps. |
| `src/modules/home/Home.vue` | Add Writing tile (numeral VI), renumber Settings to VII, bump breadcrumb `I/VI` → `I/VII`. |
| `tests/composables/useQuizHistory.test.ts` | Add coverage for `'writing-grade'` meta shape. |

**Out of scope (per spec §6, do NOT do these):**
- Custom-prompt CRUD UI (type slot reserved).
- Module 1 — timed Schreiben simulator (uses this grader but is Sprint 2).
- Rich-text editor / markdown / inline autocorrect.
- Audio / pronunciation.
- Backend proxy.

---

## Conventions to follow

These come from precedent. Do not deviate.

- **AI provider:** Google Gemini via `makeGeminiClient(apiKey)` from `src/composables/useClaude.ts`. Don't add `@anthropic-ai/sdk`.
- **Model selection:** read `useSettings().settings.value.model` at call time. Don't hard-code `gemini-2.5-flash`.
- **Loading overlay:** `useLoading().wrap(asyncFn, { title, subtitle })`. Subtitle copy mirrors the Sprint 1A AI runs.
- **Toasts:** `useToast()` for success and error feedback.
- **API-key guard:** the `<div v-if="!hasApiKey" class="alert alert-warning">` block from `src/modules/declension/ArticleQuizSetup.vue:346-349`.
- **CSS classes:** reuse `.page`, `.section-header`, `.field`, `.chip-row`, `.chip`, `.btn`, `.btn-accent`, `.btn-ghost`, `.btn-quiet`, `.segmented`, `.alert`, `.alert-warning`, `.alert-info`, `.alert-danger`, `.setup-actions`, `.card`, `.module-card`, `.section-title`, `.section-subtitle`, `.breadcrumb`, `.micro-mark`. New module-specific classes prefixed `.writing-*`.
- **Dexie:** new table goes through a `.version(5)` migration with no data transform.
- **GeminiClient interface:** the new composable declares its own (copy from `useKonjunktivQuiz.ts`'s shape). Don't import from another composable.
- **No Vue component tests** for the writing module (matches every other AI-driven module — composable tests cover the logic, manual smoke covers the UI).

---

## Task 1: Extend history types and history-page rendering for writing-grade

**Files:**
- Modify: `src/composables/useQuizHistory.ts`
- Modify: `src/modules/history/HistoryPage.vue`
- Modify: `src/components/charts/quiz-type-labels.ts`
- Modify: `src/composables/useQuizStats.ts`
- Test: `tests/composables/useQuizHistory.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `tests/composables/useQuizHistory.test.ts` inside the existing `describe('useQuizHistory', …)` block:

```ts
  it('persists a writing-grade entry with full meta', () => {
    saveQuizRun({
      type: 'writing-grade',
      startedAt: new Date('2026-05-24T13:00:00Z').toISOString(),
      finishedAt: new Date('2026-05-24T13:25:00Z').toISOString(),
      durationMs: 1_500_000,
      count: 1,
      correct: 1,
      meta: {
        promptId: 'wp-forum-wohnen-stadt-land',
        taskType: 'forumsbeitrag',
        rubric: 'goethe-c1',
        bandEstimate: 'C1',
        totalScore: 78,
        wordCount: 232
      }
    })
    const [entry] = loadHistory()
    expect(entry.type).toBe('writing-grade')
    expect(entry.meta.promptId).toBe('wp-forum-wohnen-stadt-land')
    expect(entry.meta.taskType).toBe('forumsbeitrag')
    expect(entry.meta.rubric).toBe('goethe-c1')
    expect(entry.meta.bandEstimate).toBe('C1')
    expect(entry.meta.totalScore).toBe(78)
    expect(entry.meta.wordCount).toBe(232)
  })
```

- [ ] **Step 2: Run the test, confirm it fails**

Run:

```
npm test -- useQuizHistory
```

Expected: TypeScript error — `'writing-grade'` is not assignable to `QuizHistoryType`; `promptId`, `taskType`, `rubric`, `bandEstimate`, `totalScore`, `wordCount` do not exist on `QuizHistoryMeta`.

- [ ] **Step 3: Extend `QuizHistoryType` and `QuizHistoryMeta`**

In `src/composables/useQuizHistory.ts`:

1. Add `'writing-grade'` to the `QuizHistoryType` union as the new final entry:

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
  | 'writing-grade'
```

2. Add the six new optional meta fields at the end of `QuizHistoryMeta` (before the closing brace), grouped under a "Writing" comment:

```ts
  // Writing tutor
  promptId?: string
  taskType?: string
  rubric?: string
  bandEstimate?: string
  totalScore?: number
  wordCount?: number
```

The fields are loosely typed (`string` rather than narrowed `'forumsbeitrag' | …`) so `useQuizHistory.ts` stays free of cross-module imports — same pattern as the K-I and Passiv meta fields. Strict types live in `src/data/writingPrompts.ts` and `src/data/rubrics.ts` and are narrowed at the call sites.

- [ ] **Step 4: Confirm the test passes; expect cascade typecheck failures**

Run:

```
npm test -- useQuizHistory
```

Expected: PASS (11 tests now, including the new one).

Run:

```
npm run typecheck
```

Expected: FAIL with errors in `src/components/charts/quiz-type-labels.ts` and `src/composables/useQuizStats.ts` — both use exhaustive `Record<QuizHistoryType, …>` types and need entries for the new `'writing-grade'` key.

- [ ] **Step 5: Add `'writing-grade'` to the cascade files**

In `src/components/charts/quiz-type-labels.ts`, add to the existing `QUIZ_TYPE_LABEL` map (English) and `QUIZ_TYPE_DE` map (German), and append to `QUIZ_TYPES_ORDER`:

```ts
// QUIZ_TYPE_LABEL — add:
  'writing-grade': 'Writing · graded essay',

// QUIZ_TYPE_DE — add:
  'writing-grade': 'Schreiben · benoteter Aufsatz',

// QUIZ_TYPES_ORDER — append the new entry at the end:
  'passiv-transform',
  'writing-grade'
```

In `src/composables/useQuizStats.ts`, find the two exhaustive zero-bucket helpers (`zeroRunsByType()` and `zeroAccuracyByType()`) and add the new entry to each:

```ts
// In the object literal returned by zeroRunsByType, append:
  'writing-grade': 0

// In the object literal returned by zeroAccuracyByType, append:
  'writing-grade': emptyBucket()
```

(If the field names in the actual file differ from these names, mirror whatever pattern was used for `'passiv-transform'` — it was added in Sprint 1A and the cascade pattern is consistent.)

- [ ] **Step 6: Wire the new type into `HistoryPage.vue`**

In `src/modules/history/HistoryPage.vue`:

1. Add to the `QUIZ_TYPES` constant:

```ts
  'writing-grade': { label: 'Writing — graded essay', de: 'Schreiben · benoteter Aufsatz', module: 'Schreiben' }
```

2. Append to the `typeOrder` array after `'passiv-transform'`:

```ts
  'passiv-transform',
  'writing-grade'
```

- [ ] **Step 7: Type-check + run the full test suite**

Run:

```
npm run typecheck
npm test
```

Expected: both clean, every existing test still passes.

- [ ] **Step 8: Commit**

```bash
git add src/composables/useQuizHistory.ts src/modules/history/HistoryPage.vue src/components/charts/quiz-type-labels.ts src/composables/useQuizStats.ts tests/composables/useQuizHistory.test.ts
git commit -m "feat(history): add writing-grade history type"
```

---

## Task 2: Dexie `writingDrafts` table + schema v5

**Files:**
- Modify: `src/db/index.ts`

Note: the `WritingDraft` interface lives in `src/data/writingPrompts.ts` (created in Task 3). This task only adds the table declaration and the migration scaffolding. The type import lands on the same task (we have a chicken-and-egg between the table type and the data file). To keep typecheck clean within this single task, declare a local placeholder interface inside `db/index.ts`; Task 3 will switch the import to the data file and remove the placeholder.

- [ ] **Step 1: Add the placeholder type and table declaration**

Open `src/db/index.ts`. After the existing `import` statements at the top, add:

```ts
// Placeholder shape — replaced in Task 3 by an import from ../data/writingPrompts.
// Keeps typecheck green between this task and the next.
interface WritingDraftPlaceholder {
  id: string
  promptId: string
  rubric: string
  text: string
  wordCount: number
  createdAt: number
  updatedAt: number
  gradedAt?: number
  graderModel?: string
  result?: unknown
}
```

Inside the `GermanTrainerDb` class, alongside `nouns`, `adjectives`, `settings`, add the new table field:

```ts
  writingDrafts!: Table<WritingDraftPlaceholder, string>
```

- [ ] **Step 2: Add the version 5 migration**

In the `GermanTrainerDb` constructor, after the existing `.version(4)` migration block and before the closing `}`, add:

```ts
    this.version(5).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt'
    })
```

(The full stores object must be repeated — Dexie requires the complete schema in each `.version()` call. The migration is purely additive: a new table, no upgrade callback needed.)

- [ ] **Step 3: Type-check**

Run:

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/db/index.ts
git commit -m "feat(db): add writingDrafts Dexie table (schema v5)"
```

---

## Task 3: Writing prompts data file

**Files:**
- Create: `src/data/writingPrompts.ts`
- Modify: `src/db/index.ts` (swap placeholder import)

- [ ] **Step 1: Create the data file with types + seed**

Write `src/data/writingPrompts.ts`:

```ts
// Writing tutor — types and seed catalogue.
//
// The catalogue is loaded into memory once on first use. There is no Dexie
// table for prompts (matches the noun/adjective seed-JSON pattern). Adding
// prompts is a code change; the `source: 'custom'` slot is reserved for a
// future Manage UI.

import type { WritingGradeResult } from './rubrics'

export type WritingTaskType =
  | 'forumsbeitrag'              // Goethe C1, ~230 words
  | 'formelle-email'             // Goethe C1, ~120 words
  | 'argumentativer-aufsatz'     // telc C1 + general C1 prep
  | 'grafik-beschreibung'        // telc C1 — chart/data description
  | 'zusammenfassung'            // summary, general C1 prep
  | 'stellungnahme'              // opinion piece, general C1 prep

export const WRITING_TASK_TYPES: WritingTaskType[] = [
  'forumsbeitrag',
  'formelle-email',
  'argumentativer-aufsatz',
  'grafik-beschreibung',
  'zusammenfassung',
  'stellungnahme'
]

export const WRITING_TASK_LABEL: Record<WritingTaskType, string> = {
  'forumsbeitrag':           'Forumsbeitrag',
  'formelle-email':          'Formelle E-Mail',
  'argumentativer-aufsatz':  'Argumentativer Aufsatz',
  'grafik-beschreibung':     'Grafik-Beschreibung',
  'zusammenfassung':         'Zusammenfassung',
  'stellungnahme':           'Stellungnahme'
}

export const WRITING_TASK_BLURB: Record<WritingTaskType, string> = {
  'forumsbeitrag':           'Goethe C1 · diskursiver Online-Beitrag · ~230 Wörter',
  'formelle-email':          'Goethe C1 · (halb-)formelle Mitteilung · ~120 Wörter',
  'argumentativer-aufsatz':  'C1 · argumentativer Text mit These, Pro/Contra, Schlussfolgerung',
  'grafik-beschreibung':     'telc C1 · Beschreibung und Interpretation einer Statistik',
  'zusammenfassung':         'C1 · sachliche Zusammenfassung eines Quelltextes',
  'stellungnahme':           'C1 · persönliche Positionierung zu einem Sachverhalt'
}

export type RubricSystem = 'goethe-c1' | 'telc-c1'

export interface WritingPrompt {
  id: string                         // 'wp-forum-wohnen-stadt-land'
  type: WritingTaskType
  defaultRubric: RubricSystem
  level: 'B2' | 'C1'
  titleDe: string                    // 'Wohnen: Stadt oder Land?'
  promptText: string                 // full task body (German); may contain newlines
  promptContext?: string             // forum thread excerpt / email situation / chart caption
  targetWords: { min: number; target: number; max: number }
  suggestedMinutes: number
  tags?: string[]
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

export const WRITING_PROMPTS: WritingPrompt[] = [
  // ── Forumsbeitrag (Goethe C1) ────────────────────────────────────
  {
    id: 'wp-forum-wohnen-stadt-land',
    type: 'forumsbeitrag',
    defaultRubric: 'goethe-c1',
    level: 'C1',
    titleDe: 'Wohnen: Stadt oder Land?',
    promptText:
      'Schreiben Sie einen Beitrag zur Diskussion im Online-Forum. Erläutern Sie, ' +
      'welche Vor- und Nachteile das Leben in der Stadt bzw. auf dem Land Ihrer Meinung ' +
      'nach hat. Nennen Sie konkrete Beispiele aus Ihrem Umfeld, vergleichen Sie zwei ' +
      'Lebensphasen (z. B. Studium und Familie) und ziehen Sie ein begründetes Fazit. ' +
      'Schreiben Sie circa 230 Wörter.',
    promptContext:
      'Forumsthread "Wohin nach dem Studium?": Mehrere Nutzer:innen diskutieren, ob ' +
      'eine Großstadt oder eine ländliche Kleinstadt der bessere Ort zum Leben ist.',
    targetWords: { min: 195, target: 230, max: 265 },
    suggestedMinutes: 30,
    tags: ['Wohnen', 'Stadt', 'Land'],
    source: 'seed'
  },
  {
    id: 'wp-forum-homeoffice',
    type: 'forumsbeitrag',
    defaultRubric: 'goethe-c1',
    level: 'C1',
    titleDe: 'Homeoffice — Segen oder Belastung?',
    promptText:
      'Verfassen Sie einen Forumsbeitrag, in dem Sie sich zu der Frage äußern, ob die ' +
      'dauerhafte Arbeit im Homeoffice Berufstätige eher entlastet oder belastet. ' +
      'Beschreiben Sie zwei konkrete Vor- und zwei konkrete Nachteile, beziehen Sie ' +
      'sich auf eigene Erfahrungen oder Beobachtungen und schließen Sie mit einer ' +
      'Empfehlung. Circa 230 Wörter.',
    promptContext:
      'Forumsthread "Arbeit der Zukunft": Diskussion über die Auswirkungen ' +
      'dauerhafter Homeoffice-Regelungen auf Produktivität und Wohlbefinden.',
    targetWords: { min: 195, target: 230, max: 265 },
    suggestedMinutes: 30,
    tags: ['Arbeit', 'Homeoffice'],
    source: 'seed'
  },

  // ── Formelle E-Mail (Goethe C1) ───────────────────────────────────
  {
    id: 'wp-email-beschwerde-kurs',
    type: 'formelle-email',
    defaultRubric: 'goethe-c1',
    level: 'C1',
    titleDe: 'Beschwerde an die Sprachschule',
    promptText:
      'Sie haben an einem dreiwöchigen Intensivkurs an der Sprachschule Lingua Berlin ' +
      'teilgenommen. Der Unterricht wurde mehrmals kurzfristig verlegt, die ' +
      'angekündigten Materialien wurden nicht ausgegeben, und der versprochene ' +
      'Online-Zugang zu Übungen war nie aktiv. Schreiben Sie eine halbformelle E-Mail ' +
      'an die Schulleitung, in der Sie die Probleme klar darlegen, eine ' +
      'Teilrückerstattung verlangen und um schnelle Antwort bitten. Circa 120 Wörter.',
    promptContext:
      'Adressatin: Frau Dr. Renate Engels, Schulleitung Lingua Berlin. ' +
      'Sie selbst: Pia/Paul Falk, Kursteilnehmer:in des Kurses C1-Intensiv März.',
    targetWords: { min: 100, target: 120, max: 140 },
    suggestedMinutes: 20,
    tags: ['Beschwerde', 'Sprachschule', 'formell'],
    source: 'seed'
  },
  {
    id: 'wp-email-praktikumsanfrage',
    type: 'formelle-email',
    defaultRubric: 'goethe-c1',
    level: 'C1',
    titleDe: 'Anfrage Praktikumsplatz',
    promptText:
      'Sie haben in einer Stellenausschreibung des Goethe-Instituts München von einem ' +
      'sechsmonatigen Praktikum in der Abteilung Bildungskooperationen gelesen. ' +
      'Schreiben Sie eine halbformelle E-Mail an Herrn Marc Wieland (Personalreferat), ' +
      'in der Sie sich kurz vorstellen, Ihre Motivation und Eignung darlegen und um ' +
      'Auskunft zum Bewerbungsverfahren bitten. Circa 120 Wörter.',
    promptContext:
      'Adressat: Herr Marc Wieland, Personalreferat Goethe-Institut München. ' +
      'Sie selbst: Sam Vogel, M.A.-Studentin/Student Germanistik im 3. Semester.',
    targetWords: { min: 100, target: 120, max: 140 },
    suggestedMinutes: 20,
    tags: ['Praktikum', 'Bewerbung', 'formell'],
    source: 'seed'
  },

  // ── Argumentativer Aufsatz ────────────────────────────────────────
  {
    id: 'wp-arg-handy-schule',
    type: 'argumentativer-aufsatz',
    defaultRubric: 'telc-c1',
    level: 'C1',
    titleDe: 'Handyverbot an Schulen?',
    promptText:
      'In mehreren Bundesländern wird ein striktes Handyverbot an Schulen diskutiert. ' +
      'Verfassen Sie einen argumentativen Aufsatz von circa 250 Wörtern. Formulieren ' +
      'Sie eine klare These, führen Sie mindestens zwei Argumente dafür und zwei ' +
      'dagegen aus, gewichten Sie die Argumente begründet und schließen Sie mit einer ' +
      'eigenen Position. Achten Sie auf eine deutliche Gliederung in Einleitung, ' +
      'Hauptteil und Schluss.',
    targetWords: { min: 210, target: 250, max: 285 },
    suggestedMinutes: 40,
    tags: ['Bildung', 'Digitalisierung'],
    source: 'seed'
  },
  {
    id: 'wp-arg-mindestlohn-jugend',
    type: 'argumentativer-aufsatz',
    defaultRubric: 'telc-c1',
    level: 'C1',
    titleDe: 'Mindestlohn auch für unter 18-Jährige?',
    promptText:
      'In Deutschland gilt der gesetzliche Mindestlohn nicht für Beschäftigte unter ' +
      '18 Jahren ohne abgeschlossene Berufsausbildung. Schreiben Sie einen ' +
      'argumentativen Aufsatz von circa 250 Wörtern: Stellen Sie das Problem dar, ' +
      'argumentieren Sie für und gegen eine Ausweitung des Mindestlohns auf ' +
      'Jugendliche, gewichten Sie die Argumente und kommen Sie zu einer begründeten ' +
      'Empfehlung.',
    targetWords: { min: 210, target: 250, max: 285 },
    suggestedMinutes: 40,
    tags: ['Arbeit', 'Politik', 'Jugend'],
    source: 'seed'
  },

  // ── Grafik-Beschreibung (telc C1) ────────────────────────────────
  {
    id: 'wp-grafik-online-shopping',
    type: 'grafik-beschreibung',
    defaultRubric: 'telc-c1',
    level: 'C1',
    titleDe: 'Online-Einkäufe nach Altersgruppen',
    promptText:
      'Beschreiben und interpretieren Sie die unten skizzierte Statistik. Nennen Sie ' +
      'die wichtigsten Datenpunkte, vergleichen Sie die Altersgruppen, identifizieren ' +
      'Sie Auffälligkeiten und stellen Sie zwei plausible Erklärungen vor. Circa 200 ' +
      'Wörter.',
    promptContext:
      'Statistik (Statistisches Bundesamt 2025): "Anteil der Personen, die mindestens ' +
      'einmal pro Woche online einkaufen, in Prozent." 16–24 Jahre: 68 %, 25–44 ' +
      'Jahre: 71 %, 45–64 Jahre: 49 %, 65+ Jahre: 22 %.',
    targetWords: { min: 170, target: 200, max: 230 },
    suggestedMinutes: 30,
    tags: ['Statistik', 'Konsum', 'Digitalisierung'],
    source: 'seed'
  },
  {
    id: 'wp-grafik-energieverbrauch',
    type: 'grafik-beschreibung',
    defaultRubric: 'telc-c1',
    level: 'C1',
    titleDe: 'Stromverbrauch privater Haushalte',
    promptText:
      'Beschreiben und interpretieren Sie die unten skizzierte Statistik zum ' +
      'Stromverbrauch privater Haushalte. Vergleichen Sie die Anteile, gehen Sie auf ' +
      'die zwei größten Posten ein und nennen Sie zwei Maßnahmen, mit denen Haushalte ' +
      'ihren Verbrauch senken könnten. Circa 200 Wörter.',
    promptContext:
      'Statistik (Umweltbundesamt 2024): "Stromverbrauch nach Anwendungsbereich, ' +
      'Anteile in Prozent." Heizen/Warmwasser: 33 %, Kühlen/Gefrieren: 17 %, ' +
      'Beleuchtung: 9 %, Kochen: 11 %, Waschen/Trocknen: 13 %, Sonstiges (IT, TV, ' +
      'Kleingeräte): 17 %.',
    targetWords: { min: 170, target: 200, max: 230 },
    suggestedMinutes: 30,
    tags: ['Statistik', 'Energie', 'Umwelt'],
    source: 'seed'
  },

  // ── Zusammenfassung ────────────────────────────────────────────────
  {
    id: 'wp-zus-stadtbegruenung',
    type: 'zusammenfassung',
    defaultRubric: 'telc-c1',
    level: 'C1',
    titleDe: 'Stadtbegrünung als Klimaanpassung',
    promptText:
      'Fassen Sie den unten stehenden Artikel sachlich und in eigenen Worten ' +
      'zusammen. Geben Sie die Hauptaussagen und mindestens zwei genannte Beispiele ' +
      'wieder. Verzichten Sie auf eigene Meinung. Circa 180 Wörter.',
    promptContext:
      'Quelltext (gekürzt, Sueddeutsche Zeitung 2025):\n\n' +
      '"Klimaanpassung in urbanen Räumen rückt zunehmend in den Fokus kommunaler ' +
      'Politik. Begrünte Fassaden, entsiegelte Innenhöfe und kleinflächige Parks ' +
      'können laut Studien des Umweltbundesamtes die gefühlte Temperatur an ' +
      'Hitzetagen um bis zu 4 °C senken. In München wurden 2024 dreißig öffentliche ' +
      'Plätze entsiegelt und mit klimaresistenten Baumarten bepflanzt; Hamburg ' +
      'subventioniert seit 2023 Dachbegrünungen für Mietshäuser mit bis zu 50 ' +
      'Prozent der Kosten. Kritiker bemängeln, dass solche Maßnahmen meist nur ' +
      'einkommensstarke Stadtteile erreichen und damit bestehende Ungleichheiten ' +
      'verschärfen. Stadtplaner:innen fordern daher verbindliche Quoten für ' +
      'Begrünung in sozial schwächeren Vierteln und eine Kopplung von ' +
      'Bauprojekten an Versickerungsflächen-Auflagen."',
    targetWords: { min: 150, target: 180, max: 210 },
    suggestedMinutes: 25,
    tags: ['Umwelt', 'Stadt', 'Klima'],
    source: 'seed'
  },
  {
    id: 'wp-zus-digitale-medizin',
    type: 'zusammenfassung',
    defaultRubric: 'telc-c1',
    level: 'C1',
    titleDe: 'Digitale Sprechstunden in Hausarztpraxen',
    promptText:
      'Fassen Sie den unten stehenden Artikel sachlich und in eigenen Worten ' +
      'zusammen. Geben Sie die Hauptaussagen und mindestens zwei genannte Beispiele ' +
      'wieder. Verzichten Sie auf eigene Meinung. Circa 180 Wörter.',
    promptContext:
      'Quelltext (gekürzt, Die Zeit 2025):\n\n' +
      '"Seit der Pandemie sind Videosprechstunden ein fester Bestandteil vieler ' +
      'Hausarztpraxen. Eine aktuelle Auswertung der Kassenärztlichen ' +
      'Bundesvereinigung zeigt, dass 2024 rund 18 Prozent aller hausärztlichen ' +
      'Konsultationen digital stattfanden — ein Anstieg von zwölf Prozentpunkten ' +
      'gegenüber 2019. Patient:innen schätzen den Wegfall langer Wartezeiten, ' +
      'insbesondere in ländlichen Regionen. Eine Hausärztin aus dem Allgäu berichtet, ' +
      'dass sie pro Tag bis zu zwanzig digitale Konsultationen abhalte und so ' +
      'dreifach mehr Patient:innen versorgen könne als zuvor. Allerdings warnen ' +
      'Ärztekammern vor Qualitätsverlust bei reiner Bildübertragung: Diagnosen ohne ' +
      'körperliche Untersuchung blieben unsicher. Datenschutzbedenken bezüglich der ' +
      'eingesetzten Plattformen sind ein weiteres Hindernis für die flächendeckende ' +
      'Einführung."',
    targetWords: { min: 150, target: 180, max: 210 },
    suggestedMinutes: 25,
    tags: ['Medizin', 'Digitalisierung'],
    source: 'seed'
  },

  // ── Stellungnahme ─────────────────────────────────────────────────
  {
    id: 'wp-stell-vier-tage-woche',
    type: 'stellungnahme',
    defaultRubric: 'telc-c1',
    level: 'C1',
    titleDe: 'Vier-Tage-Woche bei gleichem Lohn',
    promptText:
      'In mehreren europäischen Ländern wird die Einführung einer Vier-Tage-Woche ' +
      'bei vollem Lohnausgleich diskutiert. Nehmen Sie persönlich Stellung: Ist eine ' +
      'solche Regelung für die deutsche Wirtschaft realistisch und wünschenswert? ' +
      'Stützen Sie Ihre Position auf mindestens zwei begründete Argumente und gehen ' +
      'Sie auf einen Gegeneinwand ein. Circa 200 Wörter.',
    targetWords: { min: 170, target: 200, max: 230 },
    suggestedMinutes: 30,
    tags: ['Arbeit', 'Gesellschaft'],
    source: 'seed'
  },
  {
    id: 'wp-stell-tempolimit',
    type: 'stellungnahme',
    defaultRubric: 'telc-c1',
    level: 'C1',
    titleDe: 'Tempolimit auf Autobahnen',
    promptText:
      'Deutschland ist eines der wenigen Länder ohne generelles Tempolimit auf ' +
      'Autobahnen. Nehmen Sie persönlich Stellung zu der Frage, ob ein Tempolimit von ' +
      '130 km/h eingeführt werden sollte. Stützen Sie Ihre Position auf mindestens ' +
      'zwei begründete Argumente, gehen Sie auf einen häufig genannten Gegeneinwand ' +
      'ein und schließen Sie mit einer klaren Empfehlung. Circa 200 Wörter.',
    targetWords: { min: 170, target: 200, max: 230 },
    suggestedMinutes: 30,
    tags: ['Verkehr', 'Politik', 'Umwelt'],
    source: 'seed'
  }
]
```

- [ ] **Step 2: Swap the placeholder in `db/index.ts`**

In `src/db/index.ts`:

1. Remove the `WritingDraftPlaceholder` interface added in Task 2.
2. At the top of the file, add the import:

```ts
import type { WritingDraft } from '../data/writingPrompts'
```

3. Update the table field type:

```ts
  writingDrafts!: Table<WritingDraft, string>
```

- [ ] **Step 3: Type-check**

Run:

```
npm run typecheck
```

Expected: clean. (`WritingGradeResult` is imported from `./rubrics`, which is created in the next task — the type is structural so TypeScript will accept the forward reference; if it fails, defer this import-swap to after Task 4 and stay with the placeholder for one more commit.)

Note: if Step 3 fails because `WritingGradeResult` is not yet exported from `./rubrics`, revert the `import type { WritingGradeResult }` line at the top of `writingPrompts.ts` to a local placeholder for now:

```ts
// Replaced by an import from ./rubrics in Task 4.
export interface WritingGradeResult { totalScore: number; bandEstimate: string; rubric: string; [k: string]: unknown }
```

Then re-run typecheck and proceed.

- [ ] **Step 4: Commit**

```bash
git add src/data/writingPrompts.ts src/db/index.ts
git commit -m "feat(writing): prompt catalogue types + 12-prompt seed"
```

---

## Task 4: Rubrics data file

**Files:**
- Create: `src/data/rubrics.ts`
- Modify: `src/data/writingPrompts.ts` (swap to real `WritingGradeResult` import, if placeholder was inserted)

The `descriptorDe` band-descriptor strings are intended to be filled in from the official Goethe-Institut / telc Bewertungsbogen PDFs. If you don't have those PDFs on hand, **use the working text below** — they are accurate 2–3 sentence summaries of each criterion that the grader can score against, and the file already contains a comment marking them for replacement with verbatim text.

- [ ] **Step 1: Create the rubrics file**

Write `src/data/rubrics.ts`:

```ts
// Goethe-Zertifikat C1 (modular, effective 1 Jan 2024) and telc Deutsch C1
// writing-task rubric descriptors.
//
// The `descriptorDe` text on each criterion is what the grader injects into
// the Gemini system instruction. The strings below are working summaries
// adequate for grading; replace with verbatim text from the official
// Bewertungsbogen PDFs when those are obtained.
//
// References:
//   - Goethe C1 Modellsatz Erwachsene (Feb 2023 modular edition)
//   - telc Deutsch C1 Übungstest 1 — Bewertungsbogen Schreiben

import type { WritingTaskType } from './writingPrompts'

export type RubricSystem = 'goethe-c1' | 'telc-c1'

export type BandEstimate = 'B2' | 'C1-' | 'C1' | 'C1+'

export const BAND_ESTIMATES: BandEstimate[] = ['B2', 'C1-', 'C1', 'C1+']

export interface RubricCriterion {
  key: string                        // 'erfuellung'
  labelDe: string                    // 'Erfüllung'
  labelEn: string                    // 'Task fulfilment'
  maxPoints: number
  descriptorDe: string               // injected into the grader prompt
}

export interface RubricDescriptor {
  system: RubricSystem
  labelDe: string                    // 'Goethe-Zertifikat C1'
  totalMax: number                   // 100
  passingScore: number               // 60
  criteria: RubricCriterion[]
  notes: string                      // grader instruction footer
}

// ── Goethe C1 ────────────────────────────────────────────────────

export const GOETHE_C1: RubricDescriptor = {
  system: 'goethe-c1',
  labelDe: 'Goethe-Zertifikat C1',
  totalMax: 100,
  passingScore: 60,
  criteria: [
    {
      key: 'erfuellung',
      labelDe: 'Erfüllung',
      labelEn: 'Task fulfilment',
      maxPoints: 20,
      descriptorDe:
        'Werden alle Aufgabenpunkte (Sprachfunktionen) inhaltlich angemessen, ' +
        'ausführlich und klar bearbeitet? Wird die geforderte Textsorte mit ihren ' +
        'typischen Merkmalen umgesetzt? Wird der Wortumfang eingehalten?'
    },
    {
      key: 'kohaerenz',
      labelDe: 'Kohärenz',
      labelEn: 'Coherence',
      maxPoints: 20,
      descriptorDe:
        'Ist der Text gut strukturiert und logisch aufgebaut? Werden ' +
        'Konnektoren, Bezüge und Gliederungssignale wirkungsvoll eingesetzt? ' +
        'Folgen die Gedanken einander nachvollziehbar und ohne Brüche?'
    },
    {
      key: 'wortschatz',
      labelDe: 'Wortschatz',
      labelEn: 'Vocabulary',
      maxPoints: 20,
      descriptorDe:
        'Ist der Wortschatz breit, differenziert und situationsgerecht? Werden ' +
        'idiomatische Wendungen und Kollokationen angemessen eingesetzt? Gibt ' +
        'es störende Wiederholungen oder unpassende Registerwahl?'
    },
    {
      key: 'strukturen',
      labelDe: 'Strukturen',
      labelEn: 'Structures',
      maxPoints: 20,
      descriptorDe:
        'Wird ein abwechslungsreiches Spektrum komplexer Strukturen ' +
        '(Nebensätze, Partizipialkonstruktionen, Passiv, Konjunktiv, ' +
        'Nominalisierung) sicher verwendet? Ist die Satzgliedstellung korrekt?'
    },
    {
      key: 'korrektheit',
      labelDe: 'Korrektheit',
      labelEn: 'Correctness',
      maxPoints: 20,
      descriptorDe:
        'Wie häufig und wie schwerwiegend sind Fehler in Grammatik, ' +
        'Rechtschreibung, Zeichensetzung und Wortstellung? Beeinträchtigen ' +
        'sie das Verständnis?'
    }
  ],
  notes:
    'Modular Goethe-Zertifikat C1, gültig seit 1. Januar 2024. Maximale ' +
    'Punktzahl 100; Bestehensgrenze 60.'
}

// ── telc C1 ──────────────────────────────────────────────────────

export const TELC_C1: RubricDescriptor = {
  system: 'telc-c1',
  labelDe: 'telc Deutsch C1',
  totalMax: 100,
  passingScore: 60,
  criteria: [
    {
      key: 'aufgabengerechtigkeit',
      labelDe: 'Aufgabengerechtigkeit',
      labelEn: 'Task appropriateness',
      maxPoints: 25,
      descriptorDe:
        'Werden alle in der Aufgabenstellung geforderten Inhalte vollständig ' +
        'und im richtigen Register behandelt? Ist die Textsorte korrekt ' +
        'gewählt und der Adressatenbezug klar?'
    },
    {
      key: 'aufbau-form',
      labelDe: 'Aufbau und Form',
      labelEn: 'Structure and form',
      maxPoints: 25,
      descriptorDe:
        'Hat der Text einen erkennbaren Aufbau (Einleitung, Hauptteil, ' +
        'Schluss bzw. textsortenspezifische Form)? Werden Absätze sinnvoll ' +
        'gesetzt und Übergänge sprachlich markiert?'
    },
    {
      key: 'kommunikative-gestaltung',
      labelDe: 'Kommunikative Gestaltung',
      labelEn: 'Communicative quality',
      maxPoints: 25,
      descriptorDe:
        'Wirkt der Text auf den Adressaten zielgerichtet und überzeugend? ' +
        'Werden Argumente, Erläuterungen und Beispiele wirkungsvoll verknüpft? ' +
        'Ist der Wortschatz differenziert und idiomatisch?'
    },
    {
      key: 'sprachliche-richtigkeit',
      labelDe: 'Sprachliche Richtigkeit',
      labelEn: 'Linguistic accuracy',
      maxPoints: 25,
      descriptorDe:
        'Wie korrekt sind Grammatik, Syntax, Rechtschreibung und Zeichensetzung? ' +
        'Wie häufig sind kommunikationsstörende Fehler im Vergleich zu ' +
        'akzeptablen Performanzfehlern?'
    }
  ],
  notes:
    'telc Deutsch C1, produktive Schreibaufgabe. Vier Kriterien zu je 25 ' +
    'Punkten, Gesamtsumme 100, Bestehensgrenze 60.'
}

export const RUBRICS: Record<RubricSystem, RubricDescriptor> = {
  'goethe-c1': GOETHE_C1,
  'telc-c1':   TELC_C1
}

// ── Grade-result types ────────────────────────────────────────────
//
// Returned by `useWritingGrader.gradeDraft()` and persisted on
// `WritingDraft.result`. The grader's JSON response is validated against
// these shapes (with retries) before persistence.

export interface EvidenceQuote {
  quote: string                      // verbatim substring of draft.text
  spanStart: number                  // char index into draft.text (-1 if not located)
  spanEnd: number                    // exclusive
  commentDe: string                  // why this quote supports the score
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

export interface InlineNote {
  spanStart: number                  // char index into draft.text
  spanEnd: number                    // exclusive
  kind: 'fix' | 'upgrade' | 'comment'
  before: string                     // text of the span (echoed for sanity check)
  suggested?: string                 // proposed rewrite (always present for 'fix'/'upgrade')
  reasonDe: string                   // 1–2 sentences in German
}

export interface ParagraphFeedback {
  paragraphIndex: number             // 0-based
  summaryDe: string                  // 1–2 sentence note
  upgradedText?: string              // populated lazily by upgradeParagraph()
  upgradedAt?: number
}

export interface WritingGradeResult {
  rubric: RubricSystem
  totalScore: number                 // 0–100
  bandEstimate: BandEstimate
  passes: boolean                    // totalScore >= rubric.passingScore
  criteria: GradeCriterion[]
  inlineNotes: InlineNote[]
  paragraphFeedback: ParagraphFeedback[]
  overallDe: string                  // 3–5 sentences, German, holistic
  overallEn: string                  // 2–3 sentences, English, holistic
  generatedAt: number
  modelUsed: string
}

// ── Task-type guidance injected into the grader prompt ────────────

export const TASK_TYPE_HINT: Record<WritingTaskType, string> = {
  'forumsbeitrag':           'Erwartete Textsorte: Diskussionsbeitrag in einem Online-Forum. Adressatenbezug zu den anderen Forumsbeiträgen. Sprachfunktionen typischerweise: Position vertreten, Vor-/Nachteile abwägen, Beispiele anführen, Schlussfolgerung.',
  'formelle-email':          'Erwartete Textsorte: halbformelle E-Mail. Anrede und Schlussformel angemessen. Klare Bitte/Forderung. Höflichkeit und Sachlichkeit überwiegen vor persönlichem Ton.',
  'argumentativer-aufsatz':  'Erwartete Textsorte: argumentativer Aufsatz. Klare These, Pro- und Contra-Argumentation mit Gewichtung, Schlussfolgerung. Gliederungssignale erwartet.',
  'grafik-beschreibung':     'Erwartete Textsorte: Statistik-Beschreibung und -Interpretation. Datenbasierte Aussagen, Vergleiche zwischen Kategorien, plausible Erklärungsversuche. Konjunktiv I bei Quellenangabe wo passend.',
  'zusammenfassung':         'Erwartete Textsorte: sachliche Zusammenfassung. Indirekte Rede (Konjunktiv I), nominaler Stil. Keine eigene Meinung. Wichtigste Aussagen knapp und neutral wiedergegeben.',
  'stellungnahme':           'Erwartete Textsorte: persönliche Stellungnahme. Klare Positionierung, mindestens zwei begründete Argumente, Eingehen auf einen Gegeneinwand, abschließende Empfehlung.'
}

// ── JSON schema for Gemini responseSchema ─────────────────────────

export const GRADE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    rubric: { type: 'string', enum: ['goethe-c1', 'telc-c1'] },
    totalScore: { type: 'number' },
    bandEstimate: { type: 'string', enum: BAND_ESTIMATES },
    passes: { type: 'boolean' },
    criteria: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          labelDe: { type: 'string' },
          maxPoints: { type: 'number' },
          score: { type: 'number' },
          strengthsDe: { type: 'string' },
          weaknessesDe: { type: 'string' },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                quote: { type: 'string' },
                spanStart: { type: 'number' },
                spanEnd: { type: 'number' },
                commentDe: { type: 'string' }
              },
              required: ['quote', 'spanStart', 'spanEnd', 'commentDe']
            }
          }
        },
        required: ['key', 'labelDe', 'maxPoints', 'score', 'strengthsDe', 'weaknessesDe', 'evidence']
      }
    },
    inlineNotes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          spanStart: { type: 'number' },
          spanEnd: { type: 'number' },
          kind: { type: 'string', enum: ['fix', 'upgrade', 'comment'] },
          before: { type: 'string' },
          suggested: { type: 'string' },
          reasonDe: { type: 'string' }
        },
        required: ['spanStart', 'spanEnd', 'kind', 'before', 'reasonDe']
      }
    },
    paragraphFeedback: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          paragraphIndex: { type: 'number' },
          summaryDe: { type: 'string' }
        },
        required: ['paragraphIndex', 'summaryDe']
      }
    },
    overallDe: { type: 'string' },
    overallEn: { type: 'string' }
  },
  required: ['rubric', 'totalScore', 'bandEstimate', 'passes', 'criteria', 'inlineNotes', 'paragraphFeedback', 'overallDe', 'overallEn']
} as const

export const PARAGRAPH_UPGRADE_SCHEMA = {
  type: 'object',
  properties: {
    upgradedText: { type: 'string' },
    rationaleDe: { type: 'string' }
  },
  required: ['upgradedText', 'rationaleDe']
} as const
```

- [ ] **Step 2: If `writingPrompts.ts` has a placeholder `WritingGradeResult`, remove it**

Reopen `src/data/writingPrompts.ts`. If you inserted a local placeholder export of `WritingGradeResult` in Task 3 Step 3, delete it. The real type now lives in `./rubrics`; the existing top-level import `import type { WritingGradeResult } from './rubrics'` should resolve cleanly.

- [ ] **Step 3: Type-check**

Run:

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/data/rubrics.ts src/data/writingPrompts.ts
git commit -m "feat(writing): rubric descriptors + grade-result types"
```

---

## Task 5: `useWritingPrompts` composable

**Files:**
- Create: `src/composables/useWritingPrompts.ts`
- Test: `tests/composables/useWritingPrompts.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/composables/useWritingPrompts.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  getAllPrompts,
  getPromptById,
  filterByTaskType,
  filterByLevel
} from '../../src/composables/useWritingPrompts'

describe('useWritingPrompts', () => {
  test('getAllPrompts returns the seed catalogue', () => {
    const prompts = getAllPrompts()
    expect(prompts.length).toBeGreaterThanOrEqual(12)
    for (const p of prompts) {
      expect(p.source).toBe('seed')
    }
  })

  test('getPromptById returns the matching prompt', () => {
    const p = getPromptById('wp-forum-wohnen-stadt-land')
    expect(p).not.toBeNull()
    expect(p?.type).toBe('forumsbeitrag')
  })

  test('getPromptById returns null for unknown id', () => {
    expect(getPromptById('does-not-exist')).toBeNull()
  })

  test('filterByTaskType returns only matching prompts', () => {
    const emails = filterByTaskType('formelle-email')
    expect(emails.length).toBeGreaterThanOrEqual(2)
    for (const p of emails) {
      expect(p.type).toBe('formelle-email')
    }
  })

  test('filterByLevel returns only matching level', () => {
    const c1 = filterByLevel('C1')
    expect(c1.length).toBeGreaterThan(0)
    for (const p of c1) {
      expect(p.level).toBe('C1')
    }
  })
})
```

- [ ] **Step 2: Confirm tests fail**

Run:

```
npm test -- useWritingPrompts
```

Expected: module not found.

- [ ] **Step 3: Implement the composable**

Create `src/composables/useWritingPrompts.ts`:

```ts
import {
  WRITING_PROMPTS,
  type WritingPrompt,
  type WritingTaskType
} from '../data/writingPrompts'

export function getAllPrompts(): WritingPrompt[] {
  return WRITING_PROMPTS
}

export function getPromptById(id: string): WritingPrompt | null {
  return WRITING_PROMPTS.find(p => p.id === id) ?? null
}

export function filterByTaskType(type: WritingTaskType): WritingPrompt[] {
  return WRITING_PROMPTS.filter(p => p.type === type)
}

export function filterByLevel(level: 'B2' | 'C1'): WritingPrompt[] {
  return WRITING_PROMPTS.filter(p => p.level === level)
}

export function useWritingPrompts() {
  return { getAllPrompts, getPromptById, filterByTaskType, filterByLevel }
}
```

- [ ] **Step 4: Confirm tests pass**

Run:

```
npm test -- useWritingPrompts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useWritingPrompts.ts tests/composables/useWritingPrompts.test.ts
git commit -m "feat(writing): useWritingPrompts composable"
```

---

## Task 6: `useWritingGrader` — grade-result validator (pure, TDD)

**Files:**
- Create: `src/composables/useWritingGrader.ts`
- Test: `tests/composables/useWritingGrader.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/composables/useWritingGrader.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { validateGradeResult } from '../../src/composables/useWritingGrader'
import { GOETHE_C1, type WritingGradeResult } from '../../src/data/rubrics'

const DRAFT_TEXT =
  'Wohnen in der Stadt hat klare Vorteile. Man hat kurze Wege zur Arbeit ' +
  'und ein vielfältiges Kulturangebot. Auf dem Land hingegen genießt man ' +
  'Ruhe und mehr Wohnfläche zum gleichen Preis. Beide Lebensformen haben ihre Berechtigung.'

function makeValidResult(): WritingGradeResult {
  return {
    rubric: 'goethe-c1',
    totalScore: 60,
    bandEstimate: 'C1-',
    passes: true,
    criteria: [
      { key: 'erfuellung',  labelDe: 'Erfüllung',  maxPoints: 20, score: 12, strengthsDe: 'Aufgabenpunkte abgedeckt.', weaknessesDe: 'Schluss fehlt.', evidence: [{ quote: 'Wohnen in der Stadt hat klare Vorteile.', spanStart: 0, spanEnd: 39, commentDe: 'klare Eingangsthese' }] },
      { key: 'kohaerenz',   labelDe: 'Kohärenz',   maxPoints: 20, score: 12, strengthsDe: 'Konnektor "hingegen" gut.', weaknessesDe: 'Übergang abrupt.', evidence: [] },
      { key: 'wortschatz',  labelDe: 'Wortschatz', maxPoints: 20, score: 12, strengthsDe: 'Lexik passend.',          weaknessesDe: 'Wiederholungen.', evidence: [] },
      { key: 'strukturen',  labelDe: 'Strukturen', maxPoints: 20, score: 12, strengthsDe: 'Satzbau abwechslungsreich.', weaknessesDe: '—', evidence: [] },
      { key: 'korrektheit', labelDe: 'Korrektheit',maxPoints: 20, score: 12, strengthsDe: 'Wenige Fehler.',           weaknessesDe: '—', evidence: [] }
    ],
    inlineNotes: [],
    paragraphFeedback: [{ paragraphIndex: 0, summaryDe: 'Solider Auftakt.' }],
    overallDe: 'Erkennbarer C1-Aufbau, ausbaufähig in Wortschatz und Korrektheit.',
    overallEn: 'Identifiably C1, room to grow in vocabulary and accuracy.',
    generatedAt: 1716552000000,
    modelUsed: 'gemini-2.5-flash'
  }
}

describe('validateGradeResult — happy path', () => {
  test('a valid result passes through unchanged', () => {
    const r = validateGradeResult(makeValidResult(), GOETHE_C1, DRAFT_TEXT)
    expect(r).not.toBeNull()
    expect(r?.totalScore).toBe(60)
  })
})

describe('validateGradeResult — structural rejection', () => {
  test('non-object rejected', () => {
    expect(validateGradeResult(null, GOETHE_C1, DRAFT_TEXT)).toBeNull()
    expect(validateGradeResult('nope', GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
  test('mismatched rubric system rejected', () => {
    const bad = { ...makeValidResult(), rubric: 'telc-c1' as const }
    expect(validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
  test('bandEstimate not in enum rejected', () => {
    const bad = { ...makeValidResult(), bandEstimate: 'A2' as unknown as 'C1' }
    expect(validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
})

describe('validateGradeResult — criteria checks', () => {
  test('wrong criterion order rejected', () => {
    const bad = makeValidResult()
    bad.criteria = [bad.criteria[1], bad.criteria[0], ...bad.criteria.slice(2)]
    expect(validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
  test('score out of range rejected', () => {
    const bad = makeValidResult()
    bad.criteria[0].score = 99
    expect(validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
  test('negative score rejected', () => {
    const bad = makeValidResult()
    bad.criteria[0].score = -1
    expect(validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
})

describe('validateGradeResult — total + passes consistency', () => {
  test('totalScore mismatch rejected', () => {
    const bad = makeValidResult()
    bad.totalScore = 80   // criteria still sum to 60
    expect(validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
  test('passes flag inconsistent with totalScore rejected', () => {
    const bad = makeValidResult()
    bad.passes = false    // totalScore is 60, passing
    expect(validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
})

describe('validateGradeResult — evidence re-anchoring', () => {
  test('evidence quote found in draft keeps its indices', () => {
    const r = validateGradeResult(makeValidResult(), GOETHE_C1, DRAFT_TEXT)
    expect(r?.criteria[0].evidence[0].spanStart).toBe(0)
    expect(r?.criteria[0].evidence[0].spanEnd).toBe(39)
  })
  test('evidence quote not in draft gets indices -1, item retained', () => {
    const bad = makeValidResult()
    bad.criteria[0].evidence = [
      { quote: 'never appears in draft', spanStart: 50, spanEnd: 70, commentDe: 'won\'t anchor' }
    ]
    const r = validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)
    expect(r).not.toBeNull()
    expect(r?.criteria[0].evidence[0].spanStart).toBe(-1)
    expect(r?.criteria[0].evidence[0].spanEnd).toBe(-1)
  })
  test('evidence with wrong indices but quote-in-draft is re-anchored', () => {
    const bad = makeValidResult()
    bad.criteria[0].evidence = [
      { quote: 'Wohnen in der Stadt', spanStart: 99, spanEnd: 999, commentDe: 'will re-anchor' }
    ]
    const r = validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)
    expect(r?.criteria[0].evidence[0].spanStart).toBe(0)
    expect(r?.criteria[0].evidence[0].spanEnd).toBe(19)
  })
})

describe('validateGradeResult — inline notes', () => {
  test('inline note whose `before` matches the span is retained', () => {
    const bad = makeValidResult()
    bad.inlineNotes = [
      { spanStart: 0, spanEnd: 6, kind: 'comment', before: 'Wohnen', reasonDe: 'klarer Eröffner' }
    ]
    const r = validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)
    expect(r?.inlineNotes).toHaveLength(1)
  })
  test('inline note whose `before` does NOT match span is dropped', () => {
    const bad = makeValidResult()
    bad.inlineNotes = [
      { spanStart: 0, spanEnd: 6, kind: 'comment', before: 'Etwas anderes', reasonDe: '—' }
    ]
    const r = validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)
    expect(r?.inlineNotes).toHaveLength(0)
  })
})

describe('validateGradeResult — paragraphFeedback', () => {
  test('rejects paragraphFeedback length greater than paragraphs in draft', () => {
    const bad = makeValidResult()
    bad.paragraphFeedback = [
      { paragraphIndex: 0, summaryDe: 'a' },
      { paragraphIndex: 1, summaryDe: 'b' }   // draft has only one paragraph
    ]
    expect(validateGradeResult(bad, GOETHE_C1, DRAFT_TEXT)).toBeNull()
  })
})
```

- [ ] **Step 2: Confirm tests fail**

Run:

```
npm test -- useWritingGrader
```

Expected: module not found.

- [ ] **Step 3: Implement the validator**

Create `src/composables/useWritingGrader.ts`:

```ts
import {
  BAND_ESTIMATES,
  type BandEstimate,
  type GradeCriterion,
  type RubricDescriptor,
  type RubricSystem,
  type WritingGradeResult
} from '../data/rubrics'

// ── Pure validator ────────────────────────────────────────────────

const VERDICTS: readonly RubricSystem[] = ['goethe-c1', 'telc-c1']
const KINDS = ['fix', 'upgrade', 'comment'] as const

function countParagraphs(text: string): number {
  // Paragraphs are separated by a blank line (one or more empty lines between
  // non-empty lines). A draft with no blank lines is still one paragraph.
  const blocks = text.split(/\n\s*\n+/).map(s => s.trim()).filter(s => s.length > 0)
  return Math.max(1, blocks.length)
}

function reAnchor(quote: string, draft: string): { spanStart: number; spanEnd: number } {
  if (quote.length === 0) return { spanStart: -1, spanEnd: -1 }
  const exact = draft.indexOf(quote)
  if (exact >= 0) return { spanStart: exact, spanEnd: exact + quote.length }
  const lower = draft.toLowerCase().indexOf(quote.toLowerCase())
  if (lower >= 0) return { spanStart: lower, spanEnd: lower + quote.length }
  return { spanStart: -1, spanEnd: -1 }
}

export function validateGradeResult(
  raw: unknown,
  rubric: RubricDescriptor,
  draftText: string
): WritingGradeResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  // System + enum checks
  if (typeof r.rubric !== 'string' || !VERDICTS.includes(r.rubric as RubricSystem)) return null
  if (r.rubric !== rubric.system) return null
  if (typeof r.bandEstimate !== 'string' || !BAND_ESTIMATES.includes(r.bandEstimate as BandEstimate)) return null
  if (typeof r.totalScore !== 'number') return null
  if (typeof r.passes !== 'boolean') return null
  if (typeof r.overallDe !== 'string' || typeof r.overallEn !== 'string') return null
  if (!Array.isArray(r.criteria)) return null
  if (!Array.isArray(r.inlineNotes)) return null
  if (!Array.isArray(r.paragraphFeedback)) return null

  // Criteria — must match rubric order and each score in range
  if (r.criteria.length !== rubric.criteria.length) return null
  const validatedCriteria: GradeCriterion[] = []
  let sum = 0
  for (let i = 0; i < r.criteria.length; i++) {
    const expected = rubric.criteria[i]
    const c = r.criteria[i] as Record<string, unknown>
    if (typeof c.key !== 'string' || c.key !== expected.key) return null
    if (typeof c.labelDe !== 'string') return null
    if (typeof c.maxPoints !== 'number' || c.maxPoints !== expected.maxPoints) return null
    if (typeof c.score !== 'number') return null
    if (c.score < 0 || c.score > expected.maxPoints) return null
    if (typeof c.strengthsDe !== 'string') return null
    if (typeof c.weaknessesDe !== 'string') return null
    if (!Array.isArray(c.evidence)) return null

    const reanchoredEvidence = (c.evidence as Array<Record<string, unknown>>).map(ev => {
      if (typeof ev.quote !== 'string') return null
      if (typeof ev.commentDe !== 'string') return null
      const anchored = reAnchor(ev.quote, draftText)
      return {
        quote: ev.quote,
        spanStart: anchored.spanStart,
        spanEnd: anchored.spanEnd,
        commentDe: ev.commentDe
      }
    }).filter((x): x is NonNullable<typeof x> => x !== null)

    sum += c.score
    validatedCriteria.push({
      key: c.key as string,
      labelDe: c.labelDe as string,
      maxPoints: c.maxPoints as number,
      score: c.score as number,
      strengthsDe: c.strengthsDe as string,
      weaknessesDe: c.weaknessesDe as string,
      evidence: reanchoredEvidence
    })
  }

  // totalScore must equal the sum of criterion scores (strict, no tolerance).
  if (sum !== r.totalScore) return null

  // passes must agree with totalScore vs rubric.passingScore.
  if ((r.totalScore as number) >= rubric.passingScore !== r.passes) return null

  // Inline notes — drop any whose `before` doesn't match the span in the draft.
  const validatedInlineNotes = (r.inlineNotes as Array<Record<string, unknown>>).flatMap(n => {
    if (typeof n.spanStart !== 'number' || typeof n.spanEnd !== 'number') return []
    if (typeof n.kind !== 'string' || !(KINDS as readonly string[]).includes(n.kind)) return []
    if (typeof n.before !== 'string') return []
    if (typeof n.reasonDe !== 'string') return []
    if (n.suggested !== undefined && typeof n.suggested !== 'string') return []
    const start = n.spanStart as number
    const end = n.spanEnd as number
    if (start < 0 || end > draftText.length || start >= end) return []
    if (draftText.slice(start, end) !== n.before) return []
    return [{
      spanStart: start,
      spanEnd: end,
      kind: n.kind as 'fix' | 'upgrade' | 'comment',
      before: n.before as string,
      suggested: n.suggested as string | undefined,
      reasonDe: n.reasonDe as string
    }]
  })

  // Paragraph feedback — length cap.
  const draftParagraphs = countParagraphs(draftText)
  if (r.paragraphFeedback.length > draftParagraphs) return null
  const validatedParagraphFeedback = (r.paragraphFeedback as Array<Record<string, unknown>>).map(p => {
    if (typeof p.paragraphIndex !== 'number') return null
    if (typeof p.summaryDe !== 'string') return null
    return {
      paragraphIndex: p.paragraphIndex as number,
      summaryDe: p.summaryDe as string,
      upgradedText: typeof p.upgradedText === 'string' ? (p.upgradedText as string) : undefined,
      upgradedAt: typeof p.upgradedAt === 'number' ? (p.upgradedAt as number) : undefined
    }
  }).filter((x): x is NonNullable<typeof x> => x !== null)

  return {
    rubric: r.rubric as RubricSystem,
    totalScore: r.totalScore as number,
    bandEstimate: r.bandEstimate as BandEstimate,
    passes: r.passes as boolean,
    criteria: validatedCriteria,
    inlineNotes: validatedInlineNotes,
    paragraphFeedback: validatedParagraphFeedback,
    overallDe: r.overallDe as string,
    overallEn: r.overallEn as string,
    generatedAt: typeof r.generatedAt === 'number' ? (r.generatedAt as number) : Date.now(),
    modelUsed: typeof r.modelUsed === 'string' ? (r.modelUsed as string) : 'unknown'
  }
}
```

- [ ] **Step 4: Run the tests, confirm green**

Run:

```
npm test -- useWritingGrader
```

Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useWritingGrader.ts tests/composables/useWritingGrader.test.ts
git commit -m "feat(writing): validateGradeResult with re-anchoring"
```

---

## Task 7: `useWritingGrader` — gradeDraft with retry

**Files:**
- Modify: `src/composables/useWritingGrader.ts`
- Modify: `tests/composables/useWritingGrader.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `tests/composables/useWritingGrader.test.ts`:

```ts
import {
  gradeDraft,
  GraderError,
  type GeminiClient
} from '../../src/composables/useWritingGrader'
import { GOETHE_C1 } from '../../src/data/rubrics'
import type { WritingPrompt, WritingDraft } from '../../src/data/writingPrompts'

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

const SAMPLE_PROMPT: WritingPrompt = {
  id: 'wp-test',
  type: 'forumsbeitrag',
  defaultRubric: 'goethe-c1',
  level: 'C1',
  titleDe: 'Test',
  promptText: 'Schreiben Sie einen Beitrag.',
  targetWords: { min: 195, target: 230, max: 265 },
  suggestedMinutes: 30,
  source: 'seed'
}

const SAMPLE_DRAFT: WritingDraft = {
  id: 'd1',
  promptId: 'wp-test',
  rubric: 'goethe-c1',
  text:
    'Wohnen in der Stadt hat klare Vorteile. Man hat kurze Wege zur Arbeit ' +
    'und ein vielfältiges Kulturangebot. Auf dem Land hingegen genießt man ' +
    'Ruhe und mehr Wohnfläche zum gleichen Preis. Beide Lebensformen haben ihre Berechtigung.',
  wordCount: 39,
  createdAt: 1716552000000,
  updatedAt: 1716552000000
}

function makeValidGradePayload() {
  return {
    rubric: 'goethe-c1',
    totalScore: 60,
    bandEstimate: 'C1-',
    passes: true,
    criteria: [
      { key: 'erfuellung',  labelDe: 'Erfüllung',  maxPoints: 20, score: 12, strengthsDe: 'a', weaknessesDe: 'b', evidence: [] },
      { key: 'kohaerenz',   labelDe: 'Kohärenz',   maxPoints: 20, score: 12, strengthsDe: 'a', weaknessesDe: 'b', evidence: [] },
      { key: 'wortschatz',  labelDe: 'Wortschatz', maxPoints: 20, score: 12, strengthsDe: 'a', weaknessesDe: 'b', evidence: [] },
      { key: 'strukturen',  labelDe: 'Strukturen', maxPoints: 20, score: 12, strengthsDe: 'a', weaknessesDe: 'b', evidence: [] },
      { key: 'korrektheit', labelDe: 'Korrektheit',maxPoints: 20, score: 12, strengthsDe: 'a', weaknessesDe: 'b', evidence: [] }
    ],
    inlineNotes: [],
    paragraphFeedback: [{ paragraphIndex: 0, summaryDe: 'ok' }],
    overallDe: 'ok',
    overallEn: 'ok'
  }
}

describe('gradeDraft — happy path', () => {
  test('returns a validated result on a clean response', async () => {
    const client = makeMockClient([
      { text: JSON.stringify(makeValidGradePayload()) }
    ])
    const r = await gradeDraft(client, 'gemini-2.5-flash', SAMPLE_PROMPT, SAMPLE_DRAFT, GOETHE_C1)
    expect(r.totalScore).toBe(60)
    expect(r.modelUsed).toBe('gemini-2.5-flash')
  })
})

describe('gradeDraft — retry once on validation failure', () => {
  test('retries when first response is malformed JSON, succeeds on second', async () => {
    const client = makeMockClient([
      { text: 'not-json {{{' },
      { text: JSON.stringify(makeValidGradePayload()) }
    ])
    const r = await gradeDraft(client, 'gemini-2.5-flash', SAMPLE_PROMPT, SAMPLE_DRAFT, GOETHE_C1)
    expect(r.totalScore).toBe(60)
  })

  test('retries when first response fails validation, succeeds on second', async () => {
    const bad = { ...makeValidGradePayload(), totalScore: 999 }
    const client = makeMockClient([
      { text: JSON.stringify(bad) },
      { text: JSON.stringify(makeValidGradePayload()) }
    ])
    const r = await gradeDraft(client, 'gemini-2.5-flash', SAMPLE_PROMPT, SAMPLE_DRAFT, GOETHE_C1)
    expect(r.totalScore).toBe(60)
  })

  test('throws GraderError when both attempts fail validation', async () => {
    const client = makeMockClient([
      { text: 'invalid' },
      { text: '{"verdict":"???"}' }
    ])
    await expect(
      gradeDraft(client, 'gemini-2.5-flash', SAMPLE_PROMPT, SAMPLE_DRAFT, GOETHE_C1)
    ).rejects.toBeInstanceOf(GraderError)
  })

  test('throws GraderError when network throws on both attempts', async () => {
    const failing: GeminiClient = {
      models: {
        generateContent: async () => { throw new Error('offline') }
      }
    }
    await expect(
      gradeDraft(failing, 'gemini-2.5-flash', SAMPLE_PROMPT, SAMPLE_DRAFT, GOETHE_C1)
    ).rejects.toBeInstanceOf(GraderError)
  })
})
```

- [ ] **Step 2: Confirm tests fail**

Run:

```
npm test -- useWritingGrader
```

Expected: `gradeDraft`, `GraderError`, and `GeminiClient` not exported.

- [ ] **Step 3: Implement the grader**

Append to `src/composables/useWritingGrader.ts`:

```ts
import {
  GRADE_RESPONSE_SCHEMA,
  TASK_TYPE_HINT
} from '../data/rubrics'
import type { WritingPrompt, WritingDraft } from '../data/writingPrompts'

// ── Gemini client shape (matches useKonjunktivQuiz.GeminiClient) ──

export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

export class GraderError extends Error {
  constructor(message: string, public readonly attempts: number) {
    super(message)
    this.name = 'GraderError'
  }
}

// ── Prompt builder ────────────────────────────────────────────────

function rubricBlock(rubric: RubricDescriptor): string {
  const lines: string[] = []
  lines.push(`RUBRIC: ${rubric.labelDe} (System: ${rubric.system})`)
  lines.push(`Maximalpunktzahl: ${rubric.totalMax} · Bestehensgrenze: ${rubric.passingScore}`)
  lines.push('')
  lines.push('Kriterien (in dieser Reihenfolge, jedes mit max. Punktzahl):')
  for (const c of rubric.criteria) {
    lines.push(`- key="${c.key}" — ${c.labelDe} (max ${c.maxPoints} Punkte):`)
    lines.push(`    ${c.descriptorDe}`)
  }
  lines.push('')
  lines.push(`Hinweis: ${rubric.notes}`)
  return lines.join('\n')
}

export function buildGraderPrompt(
  prompt: WritingPrompt,
  draft: WritingDraft,
  rubric: RubricDescriptor
): { system: string; user: string } {
  const system =
    'Du bist eine strenge, kalibrierte Prüferin für deutsche schriftliche ' +
    'Abschlussprüfungen auf Niveau C1. Du benotest den Text der Studentin/des ' +
    'Studenten ausschließlich nach der unten angegebenen Rubrik. Deine Antwort ' +
    'ist ausschließlich JSON gemäß dem responseSchema — kein Prosa-Vorspann, ' +
    'keine Markdown-Fences. Für jedes Kriterium gibst du eine ganzzahlige ' +
    'Punktzahl im erlaubten Bereich, sowie kurze Stärken- und Schwächen-' +
    'Begründungen auf Deutsch. Belege (EvidenceQuote) zitierst du WÖRTLICH aus ' +
    'dem eingereichten Text und gibst die korrekten Zeichenpositionen (0-' +
    'indiziert, Halb-Offen) an. Anschließend formulierst du ein holistisches ' +
    'Gesamturteil auf Deutsch (3–5 Sätze) und auf Englisch (2–3 Sätze).\n\n' +
    rubricBlock(rubric)

  const overWords = draft.wordCount > prompt.targetWords.max
    ? `\n\nACHTUNG: Der Text überschreitet die obere Zielmarke (${prompt.targetWords.max} Wörter). Das soll bei "erfuellung" / "aufgabengerechtigkeit" zu Punktabzug führen.`
    : draft.wordCount < prompt.targetWords.min
    ? `\n\nACHTUNG: Der Text unterschreitet die untere Zielmarke (${prompt.targetWords.min} Wörter). Das soll bei "erfuellung" / "aufgabengerechtigkeit" zu Punktabzug führen.`
    : ''

  const user =
    `AUFGABENTYP: ${prompt.type}\n${TASK_TYPE_HINT[prompt.type]}\n\n` +
    `AUFGABENSTELLUNG:\n${prompt.promptText}\n\n` +
    (prompt.promptContext ? `KONTEXT:\n${prompt.promptContext}\n\n` : '') +
    `ZIELUMFANG: ${prompt.targetWords.min}–${prompt.targetWords.max} Wörter (Ziel: ${prompt.targetWords.target}).\n` +
    `EINGEREICHTER TEXT (Wortzahl ${draft.wordCount}):\n${draft.text}` +
    overWords

  return { system, user }
}

// ── Grader call with one retry ────────────────────────────────────

export async function gradeDraft(
  client: GeminiClient,
  model: string,
  prompt: WritingPrompt,
  draft: WritingDraft,
  rubric: RubricDescriptor
): Promise<WritingGradeResult> {
  const { system, user } = buildGraderPrompt(prompt, draft, rubric)
  const maxRetries = 1
  let attempts = 0
  let lastError: string = 'no attempts'

  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model,
        contents: user,
        config: {
          systemInstruction: system,
          responseMimeType: 'application/json',
          responseSchema: GRADE_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
          temperature: 0
        }
      })
      const text = response.text ?? ''
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        lastError = 'malformed JSON'
        continue
      }
      const validated = validateGradeResult(parsed, rubric, draft.text)
      if (validated === null) {
        lastError = 'validation failed'
        continue
      }
      validated.generatedAt = Date.now()
      validated.modelUsed = model
      return validated
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }

  throw new GraderError(`Grader exhausted ${attempts} attempts. Last error: ${lastError}`, attempts)
}
```

- [ ] **Step 4: Run the tests, confirm green**

Run:

```
npm test -- useWritingGrader
```

Expected: PASS — validator tests still green, plus 4 new gradeDraft tests.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useWritingGrader.ts tests/composables/useWritingGrader.test.ts
git commit -m "feat(writing): gradeDraft with one-retry budget"
```

---

## Task 8: `useWritingGrader` — upgradeParagraph + gradeAndPersist

**Files:**
- Modify: `src/composables/useWritingGrader.ts`
- Modify: `tests/composables/useWritingGrader.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `tests/composables/useWritingGrader.test.ts`:

```ts
import { upgradeParagraph } from '../../src/composables/useWritingGrader'

describe('upgradeParagraph', () => {
  test('returns upgradedText and rationaleDe from a clean response', async () => {
    const payload = { upgradedText: 'Aufgrund der vorliegenden Statistik …', rationaleDe: 'Nominaler Stil eingeführt.' }
    const client = makeMockClient([{ text: JSON.stringify(payload) }])
    const r = await upgradeParagraph(client, 'gemini-2.5-flash', SAMPLE_PROMPT, 'Die Statistik zeigt …', 'goethe-c1')
    expect(r.upgradedText).toBe(payload.upgradedText)
    expect(r.rationaleDe).toBe(payload.rationaleDe)
  })

  test('throws on malformed JSON (no retry)', async () => {
    const client = makeMockClient([{ text: 'not-json' }])
    await expect(
      upgradeParagraph(client, 'gemini-2.5-flash', SAMPLE_PROMPT, 'paragraph', 'goethe-c1')
    ).rejects.toThrow()
  })

  test('throws on missing fields', async () => {
    const client = makeMockClient([{ text: JSON.stringify({ upgradedText: 'only this' }) }])
    await expect(
      upgradeParagraph(client, 'gemini-2.5-flash', SAMPLE_PROMPT, 'paragraph', 'goethe-c1')
    ).rejects.toThrow()
  })

  test('throws on network error (no retry)', async () => {
    const failing: GeminiClient = {
      models: { generateContent: async () => { throw new Error('offline') } }
    }
    await expect(
      upgradeParagraph(failing, 'gemini-2.5-flash', SAMPLE_PROMPT, 'paragraph', 'goethe-c1')
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Confirm tests fail**

Run:

```
npm test -- useWritingGrader
```

Expected: `upgradeParagraph` not exported.

- [ ] **Step 3: Implement upgradeParagraph + gradeAndPersist**

Append to `src/composables/useWritingGrader.ts`:

```ts
import { PARAGRAPH_UPGRADE_SCHEMA, RUBRICS } from '../data/rubrics'
import type { RubricSystem } from '../data/rubrics'
import { db } from '../db'
import { saveQuizRun } from './useQuizHistory'

// ── Paragraph upgrade ────────────────────────────────────────────

const UPGRADE_SYSTEM_INSTRUCTION =
  'Du formulierst den vorliegenden Absatz in ein höheres C1-Register um: ' +
  'mehr Nominalisierung, formelle Konnektoren (folglich, hinsichtlich, ' +
  'insofern als, mithin), Verzicht auf umgangssprachliche Wendungen, ' +
  'idiomatische Kollokationen. Bedeutung und Aussage bleiben erhalten. ' +
  'Antworte ausschließlich als JSON nach dem responseSchema, ohne Prosa.'

export async function upgradeParagraph(
  client: GeminiClient,
  model: string,
  prompt: WritingPrompt,
  paragraphText: string,
  _rubric: RubricSystem
): Promise<{ upgradedText: string; rationaleDe: string }> {
  const user =
    `AUFGABENTYP: ${prompt.type}\n` +
    `URSPRÜNGLICHER ABSATZ:\n${paragraphText}\n\n` +
    'Formuliere diesen Absatz in höherem C1-Register um.'

  const response = await client.models.generateContent({
    model,
    contents: user,
    config: {
      systemInstruction: UPGRADE_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: PARAGRAPH_UPGRADE_SCHEMA as unknown as Record<string, unknown>,
      temperature: 0.2
    }
  })
  const text = response.text ?? ''
  const parsed = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object') throw new Error('paragraph upgrade returned non-object')
  const p = parsed as Record<string, unknown>
  if (typeof p.upgradedText !== 'string') throw new Error('paragraph upgrade missing upgradedText')
  if (typeof p.rationaleDe !== 'string') throw new Error('paragraph upgrade missing rationaleDe')
  return { upgradedText: p.upgradedText, rationaleDe: p.rationaleDe }
}

// ── gradeAndPersist: grade + write to Dexie + history entry ──────

export async function gradeAndPersist(
  client: GeminiClient,
  model: string,
  prompt: WritingPrompt,
  draft: WritingDraft,
  rubric: RubricSystem
): Promise<WritingDraft> {
  const startedAt = Date.now()
  const result = await gradeDraft(client, model, prompt, draft, RUBRICS[rubric])
  const finishedAt = Date.now()

  const updated: WritingDraft = {
    ...draft,
    rubric,
    gradedAt: finishedAt,
    graderModel: model,
    result,
    updatedAt: finishedAt
  }
  await db.writingDrafts.put(updated)

  saveQuizRun({
    type: 'writing-grade',
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt,
    count: 1,
    correct: result.passes ? 1 : 0,
    meta: {
      promptId: prompt.id,
      taskType: prompt.type,
      rubric,
      bandEstimate: result.bandEstimate,
      totalScore: result.totalScore,
      wordCount: draft.wordCount
    }
  })

  return updated
}

// ── Composable wrapper ───────────────────────────────────────────

export function useWritingGrader() {
  return { gradeDraft, gradeAndPersist, upgradeParagraph, buildGraderPrompt, validateGradeResult }
}
```

- [ ] **Step 4: Run the full suite**

Run:

```
npm test
npm run typecheck
```

Expected: all tests pass, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useWritingGrader.ts tests/composables/useWritingGrader.test.ts
git commit -m "feat(writing): upgradeParagraph + gradeAndPersist"
```

---

## Task 9: WritingHome page + route

**Files:**
- Create: `src/modules/writing/WritingHome.vue`
- Modify: `src/router.ts`

- [ ] **Step 1: Add the route**

In `src/router.ts`, append after the `passiv-quiz-result` route (before the closing `]`):

```ts
  { path: '/writing', name: 'writing', component: () => import('./modules/writing/WritingHome.vue') }
```

(Add a comma to the previous line.)

- [ ] **Step 2: Create the home page**

Create `src/modules/writing/WritingHome.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  WRITING_TASK_TYPES,
  WRITING_TASK_LABEL,
  WRITING_TASK_BLURB
} from '../../data/writingPrompts'
import { filterByTaskType, getPromptById } from '../../composables/useWritingPrompts'
import { loadHistory } from '../../composables/useQuizHistory'

const router = useRouter()

const recent = computed(() =>
  loadHistory()
    .filter(h => h.type === 'writing-grade')
    .slice(0, 5)
)

function promptTitleById(id: string | undefined): string {
  if (!id) return '—'
  const p = getPromptById(id)
  return p?.titleDe ?? id
}

function back() { router.push({ name: 'home' }) }
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Schreiben</div>
        <h1 class="section-title">Writing tutor<em>.</em></h1>
        <p class="section-subtitle">
          Six task types, Goethe C1 and telc C1 rubric grading on demand.
          Draft as long as you need, then ask Gemini to score against the
          official-style criteria with inline notes.
        </p>
      </div>
    </header>

    <div class="alert alert-info writing-disclaimer">
      <span class="alert-label">Hinweis</span>
      Bewertungen sind indikativ und ersetzen keinen offiziellen Prüfer.
      Übe ergänzend mit dem offiziellen Modellsatz.
    </div>

    <section class="writing-grid">
      <article
        v-for="t in WRITING_TASK_TYPES"
        :key="t"
        class="card writing-tile interactive"
        role="button" tabindex="0"
        @click="router.push({ name: 'writing-task', params: { taskType: t } })"
        @keydown.enter="router.push({ name: 'writing-task', params: { taskType: t } })"
      >
        <h2 class="writing-tile-title">{{ WRITING_TASK_LABEL[t] }}</h2>
        <p class="writing-tile-blurb">{{ WRITING_TASK_BLURB[t] }}</p>
        <div class="writing-tile-meta">{{ filterByTaskType(t).length }} prompts</div>
      </article>
    </section>

    <section v-if="recent.length > 0" class="recent-runs">
      <h3 class="recent-runs-title">Recent graded drafts</h3>
      <ul class="recent-runs-list">
        <li v-for="r in recent" :key="r.id">
          <span class="rr-date">{{ new Date(r.startedAt).toLocaleDateString() }}</span>
          <span class="rr-title">{{ promptTitleById(r.meta.promptId) }}</span>
          <span class="rr-score">{{ r.meta.totalScore }} / 100 · {{ r.meta.bandEstimate }}</span>
          <span class="rr-meta">{{ r.meta.rubric }}</span>
        </li>
      </ul>
    </section>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
    </div>
  </div>
</template>

<style scoped>
.writing-disclaimer { margin-bottom: 28px; max-width: 720px; }
.writing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  max-width: 880px;
}
.writing-tile {
  padding: 20px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.writing-tile-title {
  font-family: var(--font-display);
  font-size: 20px;
  margin: 0;
}
.writing-tile-blurb {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--ink-soft);
  margin: 0;
}
.writing-tile-meta {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mute);
  margin-top: auto;
  padding-top: 8px;
}
.recent-runs { margin-top: 36px; max-width: 880px; }
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
.rr-title { font-family: var(--font-display); flex: 1; }
.rr-score { font-family: var(--font-display); flex: 0 0 140px; text-align: right; }
.rr-meta { color: var(--mute); flex: 0 0 90px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; text-align: right; }
.setup-actions { display: flex; justify-content: flex-start; margin-top: 40px; }
</style>
```

NOTE: This references a route `writing-task` that doesn't exist yet — added in Task 10. Expected forward reference.

- [ ] **Step 3: Type-check**

Run:

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/modules/writing/WritingHome.vue src/router.ts
git commit -m "feat(writing): home page (catalogue + recent drafts) + route"
```

---

## Task 10: PromptDetail page + route + home tile

**Files:**
- Create: `src/modules/writing/PromptDetail.vue`
- Modify: `src/router.ts`
- Modify: `src/modules/home/Home.vue`

- [ ] **Step 1: Add the route**

In `src/router.ts`, after the `writing` route:

```ts
  { path: '/writing/task/:taskType', name: 'writing-task', component: () => import('./modules/writing/PromptDetail.vue') }
```

NOTE: this is the task-type listing (route param `taskType`). The per-prompt detail page is also `PromptDetail.vue` but reachable via `/writing/prompt/:promptId`. We use ONE component for both — it inspects the route params and renders the right level (a list of prompts when only `taskType` is given, a single prompt's detail when `promptId` is given). Add the second route in this same step:

```ts
  { path: '/writing/prompt/:promptId', name: 'writing-prompt', component: () => import('./modules/writing/PromptDetail.vue') }
```

- [ ] **Step 2: Create PromptDetail.vue**

Create `src/modules/writing/PromptDetail.vue`:

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../../db'
import type { WritingDraft, WritingPrompt, WritingTaskType } from '../../data/writingPrompts'
import { WRITING_TASK_LABEL, WRITING_TASK_BLURB } from '../../data/writingPrompts'
import { filterByTaskType, getPromptById } from '../../composables/useWritingPrompts'
import { useToast } from '../../composables/useToast'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const taskType = computed(() => (route.params.taskType as string | undefined) as WritingTaskType | undefined)
const promptId = computed(() => route.params.promptId as string | undefined)

// Two views in one component: list of prompts for a task type, or detail of one prompt.
const mode = computed<'list' | 'detail'>(() => promptId.value ? 'detail' : 'list')

const promptsInType = computed<WritingPrompt[]>(() =>
  taskType.value ? filterByTaskType(taskType.value) : []
)

const currentPrompt = computed<WritingPrompt | null>(() =>
  promptId.value ? getPromptById(promptId.value) : null
)

const drafts = ref<WritingDraft[]>([])

async function loadDrafts() {
  if (!promptId.value) {
    drafts.value = []
    return
  }
  const rows = await db.writingDrafts.where('promptId').equals(promptId.value).toArray()
  drafts.value = rows.sort((a, b) => b.createdAt - a.createdAt)
}

onMounted(loadDrafts)
watch(promptId, loadDrafts)

function newDraft() {
  if (!currentPrompt.value) return
  router.push({ name: 'writing-draft-new', params: { promptId: currentPrompt.value.id } })
}

function openDraft(d: WritingDraft) {
  router.push({
    name: 'writing-draft',
    params: { promptId: d.promptId, draftId: d.id }
  })
}

async function deleteDraft(d: WritingDraft) {
  const sure = confirm(`Delete draft from ${new Date(d.createdAt).toLocaleString()}?`)
  if (!sure) return
  await db.writingDrafts.delete(d.id)
  await loadDrafts()
  toast.success('Draft deleted')
}

function compareToPrevious(d: WritingDraft) {
  const graded = drafts.value.filter(x => x.id !== d.id && x.result)
  const previous = graded[0]
  if (!previous) {
    toast.info('No previous graded draft to compare to.')
    return
  }
  router.push({ name: 'writing-compare', params: { draftA: previous.id, draftB: d.id } })
}

function backToTaskList() { router.push({ name: 'writing' }) }
function backToTaskType() {
  if (currentPrompt.value) {
    router.push({ name: 'writing-task', params: { taskType: currentPrompt.value.type } })
  } else {
    backToTaskList()
  }
}
</script>

<template>
  <!-- List mode: prompts for a task type ───────────────────────── -->
  <div v-if="mode === 'list' && taskType" class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Schreiben · {{ WRITING_TASK_LABEL[taskType] }}</div>
        <h1 class="section-title">{{ WRITING_TASK_LABEL[taskType] }}<em>.</em></h1>
        <p class="section-subtitle">{{ WRITING_TASK_BLURB[taskType] }}</p>
      </div>
    </header>

    <ul class="prompt-list">
      <li v-for="p in promptsInType" :key="p.id" class="prompt-row card interactive"
        role="button" tabindex="0"
        @click="router.push({ name: 'writing-prompt', params: { promptId: p.id } })"
        @keydown.enter="router.push({ name: 'writing-prompt', params: { promptId: p.id } })"
      >
        <div class="prompt-row-title">{{ p.titleDe }}</div>
        <div class="prompt-row-meta">{{ p.targetWords.target }} Wörter · {{ p.suggestedMinutes }} min · {{ p.defaultRubric }}</div>
      </li>
    </ul>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="backToTaskList">← Back</button>
    </div>
  </div>

  <!-- Detail mode: one prompt + its draft history ────────────────── -->
  <div v-else-if="mode === 'detail' && currentPrompt" class="page detail-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Schreiben · {{ WRITING_TASK_LABEL[currentPrompt.type] }} · {{ currentPrompt.titleDe }}</div>
        <h1 class="section-title">{{ currentPrompt.titleDe }}<em>.</em></h1>
        <p class="section-subtitle">{{ WRITING_TASK_BLURB[currentPrompt.type] }} · Ziel {{ currentPrompt.targetWords.target }} Wörter</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-accent" type="button" @click="newDraft">Neuer Entwurf <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="prompt-card prompt-detail-card">
      <div class="prompt-detail-text">{{ currentPrompt.promptText }}</div>
      <div v-if="currentPrompt.promptContext" class="prompt-detail-context">
        <span class="prompt-detail-context-label">Kontext</span>
        <div class="prompt-detail-context-text">{{ currentPrompt.promptContext }}</div>
      </div>
      <div class="prompt-detail-meta">
        <span>{{ currentPrompt.targetWords.min }}–{{ currentPrompt.targetWords.max }} Wörter</span>
        <span>· {{ currentPrompt.suggestedMinutes }} Min</span>
        <span>· Rubrik: {{ currentPrompt.defaultRubric }}</span>
      </div>
    </div>

    <section class="drafts-section">
      <h3 class="drafts-title">Drafts ({{ drafts.length }})</h3>
      <div v-if="drafts.length === 0" class="micro-mark">No drafts yet. Click "Neuer Entwurf" to start.</div>
      <ul v-else class="draft-list">
        <li v-for="d in drafts" :key="d.id" class="draft-row card">
          <div class="draft-row-meta">
            <span>{{ new Date(d.createdAt).toLocaleString() }}</span>
            <span>· {{ d.wordCount }} Wörter</span>
            <span v-if="d.result">· {{ d.result.totalScore }} / 100 · {{ d.result.bandEstimate }}</span>
            <span v-if="d.result">· {{ d.rubric }}</span>
            <span v-else class="draft-row-unmarked">· nicht benotet</span>
          </div>
          <div class="draft-row-actions">
            <button class="btn btn-quiet" type="button" @click="openDraft(d)">{{ d.result ? 'Open' : 'Continue editing' }}</button>
            <button v-if="d.result" class="btn btn-quiet" type="button" @click="compareToPrevious(d)">Compare</button>
            <button class="btn btn-quiet" type="button" @click="deleteDraft(d)">Delete</button>
          </div>
        </li>
      </ul>
    </section>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="backToTaskType">← Back</button>
    </div>
  </div>

  <!-- Fallback / not-found ────────────────────────────────────────── -->
  <div v-else class="page">
    <div class="alert alert-danger">Unknown writing task or prompt.</div>
    <button class="btn btn-ghost" type="button" @click="backToTaskList">← Back</button>
  </div>
</template>

<style scoped>
.prompt-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; max-width: 720px; }
.prompt-row { padding: 14px 18px; cursor: pointer; }
.prompt-row-title { font-family: var(--font-display); font-size: 18px; }
.prompt-row-meta {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute); margin-top: 4px;
}
.detail-page { max-width: 880px; }
.prompt-detail-card { padding: 24px; margin: 16px 0 28px; }
.prompt-detail-text {
  font-family: var(--font-body); font-size: 16px; line-height: 1.55; color: var(--ink); white-space: pre-wrap;
}
.prompt-detail-context { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--hairline); }
.prompt-detail-context-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); display: block; margin-bottom: 8px;
}
.prompt-detail-context-text {
  font-family: var(--font-body); font-size: 14px; line-height: 1.55; color: var(--ink-soft); white-space: pre-wrap;
}
.prompt-detail-meta {
  margin-top: 14px;
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
  display: flex; gap: 8px; flex-wrap: wrap;
}
.drafts-section { margin: 24px 0; }
.drafts-title {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 12px;
}
.draft-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.draft-row { padding: 12px 16px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.draft-row-meta { display: flex; gap: 6px; flex-wrap: wrap; font-size: 14px; }
.draft-row-unmarked { color: var(--mute); font-style: italic; }
.draft-row-actions { display: flex; gap: 6px; margin-left: auto; }
.setup-actions { display: flex; justify-content: flex-start; margin-top: 40px; }
</style>
```

NOTE: forward references to routes `writing-draft-new`, `writing-draft`, `writing-compare` — all added in Tasks 11 / 13.

- [ ] **Step 3: Add the home tile + breadcrumb bump**

In `src/modules/home/Home.vue`, find the `modules` array. After the Passiv entry (numeral V) and before Settings (currently numeral VI), insert:

```ts
  {
    numeral: 'VI',
    route: 'writing',
    de: 'Schreiben',
    title: 'Writing tutor',
    desc: 'Goethe C1 / telc C1 rubric grading on a free-form German essay. Six task types, draft history, paragraph-upgrade suggestions, per-criterion feedback.',
    meta: 'AI-graded · on demand'
  },
```

Renumber the existing Settings entry from `numeral: 'VI'` to `numeral: 'VII'`. Update the breadcrumb in the template from `Frontispiece · I/VI` to `Frontispiece · I/VII`.

- [ ] **Step 4: Type-check**

Run:

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/modules/writing/PromptDetail.vue src/router.ts src/modules/home/Home.vue
git commit -m "feat(writing): prompt detail page + draft list + home tile"
```

---

## Task 11: EditorSurface — draft mode + autosave + Grade button

**Files:**
- Create: `src/modules/writing/EditorSurface.vue`
- Modify: `src/router.ts`

The editor has two modes — draft and review. This task ships only draft mode plus the grade trigger; review mode (criteria panel, inline notes overlay, paragraph upgrade) is Task 12.

- [ ] **Step 1: Add the routes**

In `src/router.ts`, after `writing-prompt`:

```ts
  { path: '/writing/prompt/:promptId/draft/new', name: 'writing-draft-new', component: () => import('./modules/writing/EditorSurface.vue') },
  { path: '/writing/prompt/:promptId/draft/:draftId', name: 'writing-draft', component: () => import('./modules/writing/EditorSurface.vue') }
```

- [ ] **Step 2: Create EditorSurface.vue (draft mode + grade trigger)**

Create `src/modules/writing/EditorSurface.vue`:

```vue
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../../db'
import type { WritingDraft, WritingPrompt, RubricSystem } from '../../data/writingPrompts'
import { getPromptById } from '../../composables/useWritingPrompts'
import { RUBRICS } from '../../data/rubrics'
import { useSettings } from '../../composables/useSettings'
import { makeGeminiClient } from '../../composables/useClaude'
import { useLoading } from '../../composables/useLoading'
import { useToast } from '../../composables/useToast'
import { gradeAndPersist, GraderError } from '../../composables/useWritingGrader'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const loading = useLoading()
const { settings, hasApiKey, load: loadSettings } = useSettings()

const promptId = computed(() => route.params.promptId as string)
const draftIdParam = computed(() => route.params.draftId as string | undefined)

const prompt = ref<WritingPrompt | null>(null)
const draft = ref<WritingDraft | null>(null)
const rubricSystem = ref<RubricSystem>('goethe-c1')
const initializing = ref(true)
const grading = ref(false)
const gradeError = ref<string | null>(null)

const text = ref('')

// Word count: count contiguous non-whitespace blocks.
function countWords(s: string): number {
  const m = s.trim().match(/\S+/g)
  return m ? m.length : 0
}

const wordCount = computed(() => countWords(text.value))

const targetBand = computed(() => prompt.value?.targetWords ?? { min: 0, target: 0, max: 0 })

type BandColor = 'under' | 'ok' | 'over' | 'far-under' | 'far-over'
const bandColor = computed<BandColor>(() => {
  const w = wordCount.value
  const t = targetBand.value
  if (t.min === 0) return 'ok'
  if (w < t.min * 0.9) return 'far-under'
  if (w < t.min) return 'under'
  if (w <= t.max) return 'ok'
  if (w <= t.max * 1.15) return 'over'
  return 'far-over'
})

const canGrade = computed(() =>
  hasApiKey.value && wordCount.value >= Math.floor((targetBand.value.min || 1) * 0.6) && !grading.value && !draft.value?.result
)

const isGraded = computed(() => !!draft.value?.result)

// Autosave debounce.
let autosaveTimer: number | undefined
function scheduleAutosave() {
  if (autosaveTimer !== undefined) window.clearTimeout(autosaveTimer)
  autosaveTimer = window.setTimeout(async () => {
    if (!draft.value || !prompt.value) return
    // If the draft is graded and the user edited the text, clear the grade.
    const editedAfterGrade = isGraded.value && text.value !== draft.value.text
    const next: WritingDraft = {
      ...draft.value,
      text: text.value,
      wordCount: wordCount.value,
      updatedAt: Date.now(),
      ...(editedAfterGrade ? { result: undefined, gradedAt: undefined, graderModel: undefined } : {})
    }
    await db.writingDrafts.put(next)
    draft.value = next
  }, 1000)
}

watch(text, scheduleAutosave)
watch(rubricSystem, scheduleAutosave)   // persists the chosen rubric pre-grade

onMounted(async () => {
  await loadSettings()
  prompt.value = getPromptById(promptId.value)
  if (!prompt.value) {
    initializing.value = false
    return
  }
  rubricSystem.value = prompt.value.defaultRubric

  if (draftIdParam.value) {
    const existing = await db.writingDrafts.get(draftIdParam.value)
    if (existing && existing.promptId === promptId.value) {
      draft.value = existing
      text.value = existing.text
      rubricSystem.value = existing.rubric
    }
  } else {
    const now = Date.now()
    const fresh: WritingDraft = {
      id: crypto.randomUUID(),
      promptId: promptId.value,
      rubric: prompt.value.defaultRubric,
      text: '',
      wordCount: 0,
      createdAt: now,
      updatedAt: now
    }
    await db.writingDrafts.put(fresh)
    draft.value = fresh
    // Replace the URL so refresh resumes this draft instead of creating another.
    router.replace({ name: 'writing-draft', params: { promptId: prompt.value.id, draftId: fresh.id } })
  }
  initializing.value = false
})

onUnmounted(() => {
  if (autosaveTimer !== undefined) window.clearTimeout(autosaveTimer)
})

async function gradeNow() {
  if (!prompt.value || !draft.value) return
  if (!hasApiKey.value) {
    toast.error('Gemini API key required', { description: 'Set your API key in Settings before grading.' })
    return
  }
  grading.value = true
  gradeError.value = null
  // Flush pending autosave so the draft text on Dexie matches what we grade.
  if (autosaveTimer !== undefined) {
    window.clearTimeout(autosaveTimer)
    autosaveTimer = undefined
  }
  const pinned: WritingDraft = {
    ...draft.value,
    text: text.value,
    wordCount: wordCount.value,
    updatedAt: Date.now()
  }
  await db.writingDrafts.put(pinned)
  draft.value = pinned

  try {
    const updated = await loading.wrap(
      async () => {
        const client = makeGeminiClient(settings.value.geminiApiKey)
        return await gradeAndPersist(client, settings.value.model, prompt.value!, pinned, rubricSystem.value)
      },
      {
        title: 'Grading',
        subtitle: 'Asking Gemini to score against ' + RUBRICS[rubricSystem.value].labelDe + '. This usually takes 30–90 seconds.'
      }
    )
    draft.value = updated
    toast.success(`Graded · ${updated.result?.totalScore} / 100 · ${updated.result?.bandEstimate}`)
  } catch (err) {
    const msg = err instanceof GraderError
      ? `Grading failed after ${err.attempts} attempts. Try again or simplify the draft.`
      : err instanceof Error ? err.message : 'Grading failed.'
    gradeError.value = msg
    toast.error('Grading failed', { description: msg })
  } finally {
    grading.value = false
  }
}

function backToPrompt() {
  router.push({ name: 'writing-prompt', params: { promptId: promptId.value } })
}
</script>

<template>
  <div v-if="initializing" class="page loading-state"><div class="micro-mark">Loading…</div></div>
  <div v-else-if="!prompt" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>Unknown prompt.</div>
    <button class="btn btn-ghost" type="button" @click="router.push({ name: 'writing' })">← Back</button>
  </div>
  <div v-else class="page editor-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Schreiben · {{ prompt.titleDe }}</div>
        <h1 class="section-title">Writing<em>.</em></h1>
        <p class="section-subtitle">Ziel {{ prompt.targetWords.target }} Wörter · {{ prompt.suggestedMinutes }} min · Rubrik {{ rubricSystem }}</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="backToPrompt">← Back</button>
      </div>
    </header>

    <div class="alert alert-info writing-disclaimer-small">
      <span class="alert-label">Hinweis</span>
      Bewertungen sind indikativ und ersetzen keinen offiziellen Prüfer.
      Übe ergänzend mit dem offiziellen Modellsatz.
    </div>

    <details class="prompt-zone" open>
      <summary>Aufgabenstellung anzeigen</summary>
      <div class="prompt-zone-text">{{ prompt.promptText }}</div>
      <div v-if="prompt.promptContext" class="prompt-zone-context">{{ prompt.promptContext }}</div>
    </details>

    <div class="field rubric-field">
      <div class="field-label">Rubrik</div>
      <div class="segmented" :class="{ 'is-locked': isGraded }">
        <button type="button" :class="{ active: rubricSystem === 'goethe-c1' }"
          :disabled="isGraded"
          @click="rubricSystem = 'goethe-c1'">Goethe C1</button>
        <button type="button" :class="{ active: rubricSystem === 'telc-c1' }"
          :disabled="isGraded"
          @click="rubricSystem = 'telc-c1'">telc C1</button>
      </div>
    </div>

    <div v-if="!hasApiKey" class="alert alert-warning">
      <span class="alert-label">Required</span>
      Set your Gemini API key in <router-link :to="{ name: 'settings' }">Settings</router-link> before grading. Drafting still works.
    </div>

    <div class="editor-wrapper" :data-band="bandColor">
      <textarea
        class="editor-textarea"
        :class="['band-' + bandColor]"
        v-model="text"
        :readonly="isGraded"
        placeholder="Schreibe deinen Text hier …"
        rows="20"
        spellcheck="false"
        autocomplete="off"
      ></textarea>
      <div class="editor-meta">
        <span class="word-count" :class="['band-' + bandColor]">{{ wordCount }} Wörter</span>
        <span class="word-target">Ziel {{ targetBand.min }}–{{ targetBand.max }}</span>
      </div>
    </div>

    <div v-if="gradeError" class="alert alert-danger">
      <span class="alert-label">Grading failed</span>{{ gradeError }}
    </div>

    <div class="editor-actions">
      <span class="editor-cost-hint">≈ 1 großer Bewertungsaufruf</span>
      <button
        class="btn btn-accent btn-meta"
        type="button"
        :disabled="!canGrade"
        @click="gradeNow"
      >
        <span class="bm-main">{{ grading ? 'Grading…' : (isGraded ? 'Bereits benotet' : 'Grade me') }} <span v-if="!grading && !isGraded" aria-hidden="true">→</span></span>
        <span class="bm-sub">{{ rubricSystem === 'goethe-c1' ? 'Goethe C1' : 'telc C1' }} · {{ wordCount }} Wörter</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.editor-page { max-width: 880px; }
.writing-disclaimer-small { margin-bottom: 20px; }

.prompt-zone {
  margin: 0 0 20px;
  padding: 16px;
  background: var(--paper-deep);
  border-radius: 4px;
}
.prompt-zone summary {
  cursor: pointer;
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute);
}
.prompt-zone-text {
  margin-top: 12px;
  font-family: var(--font-body); font-size: 14.5px; line-height: 1.55;
  white-space: pre-wrap;
}
.prompt-zone-context {
  margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--hairline);
  font-family: var(--font-body); font-style: italic; font-size: 13px; color: var(--ink-soft);
  white-space: pre-wrap;
}

.rubric-field { margin-bottom: 16px; }
.rubric-field .segmented.is-locked { opacity: 0.6; }

.editor-wrapper { position: relative; margin: 8px 0 20px; }
.editor-textarea {
  width: 100%;
  min-height: 360px;
  padding: 18px 18px 36px;
  border: 1px solid var(--rule);
  border-radius: 4px;
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.65;
  color: var(--ink);
  background: var(--paper);
  resize: vertical;
  transition: border-color .15s;
  outline: none;
}
.editor-textarea:focus { border-color: var(--accent); }
.editor-textarea[readonly] { background: var(--paper-deep); }

.editor-meta {
  position: absolute; right: 12px; bottom: 10px;
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
  display: flex; gap: 12px;
  pointer-events: none;
}
.word-count { font-variant-numeric: tabular-nums; }
.word-count.band-ok { color: var(--success); }
.word-count.band-under { color: var(--warn, #b58800); }
.word-count.band-over { color: var(--warn, #b58800); }
.word-count.band-far-under, .word-count.band-far-over { color: var(--danger); }
.word-target { color: var(--mute); }

.editor-actions {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 20px; gap: 16px;
}
.editor-cost-hint {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
}
@media (max-width: 720px) {
  .editor-actions { flex-direction: column-reverse; align-items: stretch; }
}
</style>
```

NOTE: Review mode (criteria panel, inline notes, paragraph upgrade UI) is added in Task 12. This task ships the draft-and-grade path only; once graded, the user sees the textarea become read-only and the "Bereits benotet" button label, but no criteria panel yet.

- [ ] **Step 3: Type-check**

Run:

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/modules/writing/EditorSurface.vue src/router.ts
git commit -m "feat(writing): editor surface — draft mode + autosave + grade trigger"
```

---

## Task 12: EditorSurface — review mode (criteria panel + inline notes + paragraph upgrade)

**Files:**
- Modify: `src/modules/writing/EditorSurface.vue`

This extends the editor with the post-grade review UI. Inline notes are rendered by replacing the textarea with a span-based renderer once graded.

- [ ] **Step 1: Add the review UI**

Open `src/modules/writing/EditorSurface.vue`. Make the following changes:

1. Extend the `<script setup>` block — add new imports and review-mode state. Insert after the existing `import { gradeAndPersist, GraderError } from '../../composables/useWritingGrader'` line:

```ts
import { upgradeParagraph } from '../../composables/useWritingGrader'
import type { GradeCriterion, InlineNote, ParagraphFeedback } from '../../data/rubrics'
```

Then append (at the bottom of `<script setup>`, just before the `</script>`):

```ts
// ── Review mode helpers ──────────────────────────────────────────

interface RenderSegment {
  text: string
  start: number
  end: number
  notes: InlineNote[]
}

function buildSegments(draftText: string, notes: InlineNote[]): RenderSegment[] {
  // Build a flat list of segments by splitting on note span boundaries.
  if (notes.length === 0) {
    return [{ text: draftText, start: 0, end: draftText.length, notes: [] }]
  }
  const boundaries = new Set<number>([0, draftText.length])
  for (const n of notes) {
    boundaries.add(n.spanStart)
    boundaries.add(n.spanEnd)
  }
  const sorted = Array.from(boundaries).sort((a, b) => a - b)
  const segments: RenderSegment[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]
    const end = sorted[i + 1]
    if (end <= start) continue
    const overlapping = notes.filter(n => n.spanStart <= start && n.spanEnd >= end)
    segments.push({
      text: draftText.slice(start, end),
      start,
      end,
      notes: overlapping
    })
  }
  return segments
}

const reviewSegments = computed<RenderSegment[]>(() => {
  if (!draft.value?.result) return []
  return buildSegments(draft.value.text, draft.value.result.inlineNotes)
})

const criteria = computed<GradeCriterion[]>(() => draft.value?.result?.criteria ?? [])
const paragraphs = computed<ParagraphFeedback[]>(() => draft.value?.result?.paragraphFeedback ?? [])

// Track which evidence card is currently highlighted (for scroll-into-view).
const highlightedSpan = ref<{ start: number; end: number } | null>(null)
function focusEvidence(start: number, end: number) {
  if (start < 0) return
  highlightedSpan.value = { start, end }
  setTimeout(() => { highlightedSpan.value = null }, 1500)
}

function isHighlighted(seg: RenderSegment): boolean {
  if (!highlightedSpan.value) return false
  return highlightedSpan.value.start === seg.start && highlightedSpan.value.end === seg.end
}

// ── Paragraph upgrade ────────────────────────────────────────────

const upgradingIdx = ref<number | null>(null)

async function runParagraphUpgrade(idx: number) {
  if (!prompt.value || !draft.value || !draft.value.result) return
  upgradingIdx.value = idx
  try {
    // Slice the draft text into paragraphs by blank lines, in the same order
    // the grader was instructed to use.
    const paras = draft.value.text.split(/\n\s*\n+/).map(s => s.trim()).filter(s => s.length > 0)
    const paragraphText = paras[idx]
    if (!paragraphText) {
      toast.error('Paragraph not found in draft text.')
      return
    }
    const client = makeGeminiClient(settings.value.geminiApiKey)
    const { upgradedText } = await upgradeParagraph(
      client, settings.value.model, prompt.value, paragraphText, draft.value.rubric
    )
    // Persist the upgrade onto the draft.
    const nextFeedback = [...draft.value.result.paragraphFeedback]
    const existing = nextFeedback.find(p => p.paragraphIndex === idx)
    if (existing) {
      existing.upgradedText = upgradedText
      existing.upgradedAt = Date.now()
    } else {
      nextFeedback.push({ paragraphIndex: idx, summaryDe: '—', upgradedText, upgradedAt: Date.now() })
    }
    const next: WritingDraft = {
      ...draft.value,
      result: { ...draft.value.result, paragraphFeedback: nextFeedback },
      updatedAt: Date.now()
    }
    await db.writingDrafts.put(next)
    draft.value = next
  } catch (err) {
    toast.error('Paragraph upgrade failed', { description: err instanceof Error ? err.message : String(err) })
  } finally {
    upgradingIdx.value = null
  }
}

function paragraphTextAt(idx: number): string {
  if (!draft.value) return ''
  const paras = draft.value.text.split(/\n\s*\n+/).map(s => s.trim()).filter(s => s.length > 0)
  return paras[idx] ?? ''
}
```

2. Replace the `<textarea>` block in the template (when `isGraded` is true) with a span-renderer. Find the `<div class="editor-wrapper" …>` block and modify it so the textarea is shown when NOT graded, and the renderer when graded:

```vue
    <div class="editor-wrapper" :data-band="bandColor">
      <textarea
        v-if="!isGraded"
        class="editor-textarea"
        :class="['band-' + bandColor]"
        v-model="text"
        placeholder="Schreibe deinen Text hier …"
        rows="20"
        spellcheck="false"
        autocomplete="off"
      ></textarea>
      <div v-else class="editor-rendered" role="article" aria-readonly="true">
        <template v-for="(seg, i) in reviewSegments" :key="i">
          <span
            :class="[
              'rendered-seg',
              seg.notes.length > 0 ? 'has-note has-' + seg.notes[0].kind : '',
              isHighlighted(seg) ? 'is-highlight' : ''
            ]"
            :data-start="seg.start"
            :data-end="seg.end"
          >{{ seg.text }}</span>
        </template>
      </div>
      <div class="editor-meta">
        <span class="word-count" :class="['band-' + bandColor]">{{ wordCount }} Wörter</span>
        <span class="word-target">Ziel {{ targetBand.min }}–{{ targetBand.max }}</span>
      </div>
    </div>
```

3. Append the review-mode panels in the template after the `<div class="editor-actions">` block (i.e. after the Grade button). Add:

```vue
    <section v-if="isGraded && draft?.result" class="review-section">
      <header class="review-header">
        <div class="review-score-block">
          <div class="review-total"><span class="review-total-num">{{ draft.result.totalScore }}</span><span class="review-total-denom"> / {{ RUBRICS[draft.result.rubric].totalMax }}</span></div>
          <div class="review-band" :class="`band-chip-${draft.result.bandEstimate.toLowerCase().replace('+','plus').replace('-','minus')}`">{{ draft.result.bandEstimate }}</div>
          <div class="review-pass" :class="draft.result.passes ? 'is-pass' : 'is-fail'">{{ draft.result.passes ? 'Bestanden' : 'Nicht bestanden' }}</div>
        </div>
        <div class="review-overall">
          <div class="review-overall-de">{{ draft.result.overallDe }}</div>
          <div class="review-overall-en">{{ draft.result.overallEn }}</div>
        </div>
      </header>

      <h3 class="review-section-title">Per criterion</h3>
      <ul class="criteria-list">
        <li v-for="c in criteria" :key="c.key" class="criterion-card card">
          <div class="criterion-head">
            <span class="criterion-label">{{ c.labelDe }}</span>
            <span class="criterion-score">{{ c.score }} / {{ c.maxPoints }}</span>
          </div>
          <div class="criterion-strengths"><strong>+</strong> {{ c.strengthsDe }}</div>
          <div class="criterion-weaknesses"><strong>−</strong> {{ c.weaknessesDe }}</div>
          <ul v-if="c.evidence.length > 0" class="criterion-evidence">
            <li v-for="(ev, ei) in c.evidence" :key="ei">
              <button
                type="button"
                class="evidence-quote"
                :class="{ 'is-unanchored': ev.spanStart < 0 }"
                @click="focusEvidence(ev.spanStart, ev.spanEnd)"
                :title="ev.spanStart < 0 ? 'Quote not located in draft' : 'Click to highlight'"
              >„{{ ev.quote }}"</button>
              <span class="evidence-comment">— {{ ev.commentDe }}</span>
            </li>
          </ul>
        </li>
      </ul>

      <h3 class="review-section-title">Per paragraph</h3>
      <ul class="paragraph-list">
        <li v-for="p in paragraphs" :key="p.paragraphIndex" class="paragraph-card card">
          <div class="paragraph-head">
            <span class="paragraph-label">Absatz {{ p.paragraphIndex + 1 }}</span>
            <button
              type="button"
              class="btn btn-quiet"
              :disabled="upgradingIdx === p.paragraphIndex"
              @click="runParagraphUpgrade(p.paragraphIndex)"
            >{{ upgradingIdx === p.paragraphIndex ? 'Verbessere…' : (p.upgradedText ? 'Erneut verbessern' : 'Upgrade this paragraph') }}</button>
          </div>
          <div class="paragraph-summary">{{ p.summaryDe }}</div>
          <details v-if="p.upgradedText" class="paragraph-upgrade" open>
            <summary>Vorschlag (C1-Register)</summary>
            <div class="paragraph-upgrade-row">
              <div class="paragraph-upgrade-cell">
                <div class="paragraph-upgrade-cell-label">Original</div>
                <div class="paragraph-upgrade-cell-text">{{ paragraphTextAt(p.paragraphIndex) }}</div>
              </div>
              <div class="paragraph-upgrade-cell">
                <div class="paragraph-upgrade-cell-label">Vorschlag</div>
                <div class="paragraph-upgrade-cell-text">{{ p.upgradedText }}</div>
              </div>
            </div>
          </details>
        </li>
      </ul>
    </section>
```

4. Make `RUBRICS` available to the template by adding it to the imports if not already there:

```ts
import { RUBRICS } from '../../data/rubrics'
```

(This is already imported in the existing Task 11 script — keep the import as-is.)

5. Append the review-mode CSS to the scoped `<style>` block:

```css
.editor-rendered {
  padding: 18px 18px 36px;
  border: 1px solid var(--rule);
  border-radius: 4px;
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.65;
  color: var(--ink);
  background: var(--paper-deep);
  min-height: 360px;
  white-space: pre-wrap;
}
.rendered-seg { transition: background-color .2s; }
.rendered-seg.has-note { border-bottom: 2px solid transparent; padding-bottom: 1px; }
.rendered-seg.has-fix     { border-bottom-color: var(--danger);          background: color-mix(in srgb, var(--danger) 8%, transparent); }
.rendered-seg.has-upgrade { border-bottom-color: var(--warn, #b58800);   background: color-mix(in srgb, var(--warn, #b58800) 8%, transparent); }
.rendered-seg.has-comment { border-bottom-color: var(--accent);          background: color-mix(in srgb, var(--accent) 8%, transparent); }
.rendered-seg.is-highlight { background: color-mix(in srgb, var(--accent) 25%, transparent); }

.review-section { margin-top: 32px; }
.review-header {
  display: flex; gap: 24px; padding: 18px; margin-bottom: 20px;
  background: var(--paper-deep); border-radius: 4px; border-left: 3px solid var(--accent);
  align-items: flex-start; flex-wrap: wrap;
}
.review-score-block { display: flex; gap: 16px; align-items: baseline; flex: 0 0 auto; }
.review-total { font-family: var(--font-display); }
.review-total-num { font-size: 36px; font-weight: 500; }
.review-total-denom { font-size: 16px; color: var(--mute); }
.review-band {
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.16em;
  text-transform: uppercase; padding: 4px 10px; border-radius: 3px;
  background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent);
}
.review-pass {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.16em;
  text-transform: uppercase; padding: 4px 8px; border-radius: 3px;
}
.review-pass.is-pass { background: color-mix(in srgb, var(--success) 18%, transparent); color: var(--success); }
.review-pass.is-fail { background: color-mix(in srgb, var(--danger) 18%, transparent);  color: var(--danger); }
.review-overall { flex: 1; font-size: 14px; line-height: 1.55; min-width: 280px; }
.review-overall-de { color: var(--ink); }
.review-overall-en { color: var(--ink-soft); font-style: italic; margin-top: 6px; font-size: 13px; }

.review-section-title {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin: 24px 0 12px;
}

.criteria-list, .paragraph-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.criterion-card, .paragraph-card { padding: 16px 18px; }
.criterion-head, .paragraph-head {
  display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;
}
.criterion-label, .paragraph-label {
  font-family: var(--font-display); font-size: 16px;
}
.criterion-score { font-family: var(--font-mono); color: var(--accent); font-variant-numeric: tabular-nums; }
.criterion-strengths { font-size: 14px; line-height: 1.5; margin: 4px 0; }
.criterion-strengths strong { color: var(--success); margin-right: 4px; }
.criterion-weaknesses { font-size: 14px; line-height: 1.5; margin: 4px 0; }
.criterion-weaknesses strong { color: var(--danger); margin-right: 4px; }
.criterion-evidence { list-style: none; padding: 0; margin: 8px 0 0; display: grid; gap: 4px; font-size: 13px; }
.evidence-quote {
  background: none; border: 0; padding: 0;
  font-family: var(--font-body); font-style: italic; color: var(--accent);
  cursor: pointer;
}
.evidence-quote.is-unanchored { color: var(--mute); cursor: help; }
.evidence-comment { color: var(--ink-soft); margin-left: 4px; }

.paragraph-summary { font-size: 14px; line-height: 1.5; color: var(--ink-soft); }
.paragraph-upgrade { margin-top: 12px; }
.paragraph-upgrade summary {
  cursor: pointer;
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--mute);
}
.paragraph-upgrade-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
@media (max-width: 720px) {
  .paragraph-upgrade-row { grid-template-columns: 1fr; }
}
.paragraph-upgrade-cell { padding: 12px; background: var(--paper); border: 1px solid var(--hairline); border-radius: 4px; }
.paragraph-upgrade-cell-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 6px;
}
.paragraph-upgrade-cell-text { font-family: var(--font-body); font-size: 14px; line-height: 1.55; white-space: pre-wrap; }
```

- [ ] **Step 2: Type-check**

Run:

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/modules/writing/EditorSurface.vue
git commit -m "feat(writing): editor review mode — criteria panel, inline notes, paragraph upgrade"
```

---

## Task 13: DraftCompare page + route

**Files:**
- Create: `src/modules/writing/DraftCompare.vue`
- Modify: `src/router.ts`

- [ ] **Step 1: Add the route**

In `src/router.ts`, after `writing-draft`:

```ts
  { path: '/writing/compare/:draftA/:draftB', name: 'writing-compare', component: () => import('./modules/writing/DraftCompare.vue') }
```

- [ ] **Step 2: Create DraftCompare.vue**

Create `src/modules/writing/DraftCompare.vue`:

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../../db'
import type { WritingDraft } from '../../data/writingPrompts'
import { getPromptById } from '../../composables/useWritingPrompts'
import { RUBRICS } from '../../data/rubrics'

const route = useRoute()
const router = useRouter()

const draftA = ref<WritingDraft | null>(null)
const draftB = ref<WritingDraft | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const [a, b] = await Promise.all([
      db.writingDrafts.get(route.params.draftA as string),
      db.writingDrafts.get(route.params.draftB as string)
    ])
    if (!a || !b) {
      error.value = 'One or both drafts not found.'
      return
    }
    if (a.promptId !== b.promptId) {
      error.value = 'Drafts belong to different prompts.'
      return
    }
    draftA.value = a
    draftB.value = b
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

const prompt = computed(() => draftA.value ? getPromptById(draftA.value.promptId) : null)

interface CriterionDelta {
  key: string
  labelDe: string
  scoreA: number
  scoreB: number
  delta: number
  maxPoints: number
}

const criterionDeltas = computed<CriterionDelta[]>(() => {
  if (!draftA.value?.result || !draftB.value?.result) return []
  const rubricKeys = RUBRICS[draftA.value.result.rubric].criteria.map(c => c.key)
  return rubricKeys.map(key => {
    const a = draftA.value!.result!.criteria.find(c => c.key === key)
    const b = draftB.value!.result!.criteria.find(c => c.key === key)
    return {
      key,
      labelDe: a?.labelDe ?? key,
      scoreA: a?.score ?? 0,
      scoreB: b?.score ?? 0,
      delta: (b?.score ?? 0) - (a?.score ?? 0),
      maxPoints: a?.maxPoints ?? 0
    }
  })
})

const totalDelta = computed(() => {
  if (!draftA.value?.result || !draftB.value?.result) return 0
  return draftB.value.result.totalScore - draftA.value.result.totalScore
})

const wordDelta = computed(() => {
  if (!draftA.value || !draftB.value) return 0
  return draftB.value.wordCount - draftA.value.wordCount
})

function deltaClass(delta: number): string {
  if (delta > 0) return 'is-positive'
  if (delta < 0) return 'is-negative'
  return 'is-neutral'
}

function back() {
  if (draftA.value) {
    router.push({ name: 'writing-prompt', params: { promptId: draftA.value.promptId } })
  } else {
    router.push({ name: 'writing' })
  }
}
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>
  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="back">← Back</button>
  </div>
  <div v-else-if="draftA && draftB && draftA.result && draftB.result" class="page compare-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Schreiben · {{ prompt?.titleDe ?? '…' }} · Vergleich</div>
        <h1 class="section-title">Compare drafts<em>.</em></h1>
        <p class="section-subtitle">
          A · {{ new Date(draftA.createdAt).toLocaleString() }} → B · {{ new Date(draftB.createdAt).toLocaleString() }}
        </p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      </div>
    </header>

    <div class="compare-summary card">
      <div class="compare-cell">
        <div class="compare-cell-label">Total score</div>
        <div class="compare-cell-row">
          <span>{{ draftA.result.totalScore }}</span>
          <span class="arrow">→</span>
          <span>{{ draftB.result.totalScore }}</span>
          <span class="delta" :class="deltaClass(totalDelta)">{{ totalDelta >= 0 ? '+' : '' }}{{ totalDelta }}</span>
        </div>
      </div>
      <div class="compare-cell">
        <div class="compare-cell-label">Band</div>
        <div class="compare-cell-row">
          <span>{{ draftA.result.bandEstimate }}</span>
          <span class="arrow">→</span>
          <span>{{ draftB.result.bandEstimate }}</span>
        </div>
      </div>
      <div class="compare-cell">
        <div class="compare-cell-label">Word count</div>
        <div class="compare-cell-row">
          <span>{{ draftA.wordCount }}</span>
          <span class="arrow">→</span>
          <span>{{ draftB.wordCount }}</span>
          <span class="delta" :class="deltaClass(wordDelta)">{{ wordDelta >= 0 ? '+' : '' }}{{ wordDelta }}</span>
        </div>
      </div>
    </div>

    <h3 class="compare-section-title">Per criterion</h3>
    <ul class="compare-criteria">
      <li v-for="cd in criterionDeltas" :key="cd.key" class="compare-criterion-row">
        <span class="cc-label">{{ cd.labelDe }}</span>
        <span class="cc-scores">{{ cd.scoreA }} / {{ cd.maxPoints }} → {{ cd.scoreB }} / {{ cd.maxPoints }}</span>
        <span class="cc-delta" :class="deltaClass(cd.delta)">{{ cd.delta >= 0 ? '+' : '' }}{{ cd.delta }}</span>
      </li>
    </ul>

    <h3 class="compare-section-title">Overall summaries</h3>
    <div class="compare-overall-stack">
      <div class="compare-overall-card card">
        <div class="compare-overall-label">A · {{ new Date(draftA.createdAt).toLocaleDateString() }}</div>
        <div class="compare-overall-text">{{ draftA.result.overallDe }}</div>
      </div>
      <div class="compare-overall-card card">
        <div class="compare-overall-label">B · {{ new Date(draftB.createdAt).toLocaleDateString() }}</div>
        <div class="compare-overall-text">{{ draftB.result.overallDe }}</div>
      </div>
    </div>
  </div>
  <div v-else class="page">
    <div class="alert alert-warning">
      <span class="alert-label">Not comparable</span>
      Both drafts must be graded to compare them.
    </div>
    <button class="btn btn-ghost" type="button" @click="back">← Back</button>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.compare-page { max-width: 880px; }
.compare-summary {
  display: flex; gap: 24px; padding: 18px;
  background: var(--paper-deep); margin: 16px 0 28px;
  flex-wrap: wrap;
}
.compare-cell { flex: 1 1 200px; }
.compare-cell-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 6px;
}
.compare-cell-row {
  display: flex; gap: 10px; align-items: baseline;
  font-family: var(--font-display); font-size: 22px;
}
.compare-cell-row .arrow { color: var(--mute); }
.delta {
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.14em;
  padding: 2px 8px; border-radius: 3px; margin-left: auto;
}
.delta.is-positive { background: color-mix(in srgb, var(--success) 18%, transparent); color: var(--success); }
.delta.is-negative { background: color-mix(in srgb, var(--danger) 18%, transparent);  color: var(--danger); }
.delta.is-neutral  { background: color-mix(in srgb, var(--mute) 18%, transparent);   color: var(--mute); }

.compare-section-title {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin: 24px 0 12px;
}

.compare-criteria { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
.compare-criterion-row {
  display: flex; gap: 16px; align-items: baseline;
  padding: 8px 0; border-bottom: 1px solid var(--hairline); font-size: 14px;
}
.cc-label { font-family: var(--font-display); flex: 0 0 220px; }
.cc-scores { font-family: var(--font-mono); font-variant-numeric: tabular-nums; color: var(--mute); }
.cc-delta {
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.14em;
  padding: 2px 8px; border-radius: 3px; margin-left: auto;
}
.cc-delta.is-positive { background: color-mix(in srgb, var(--success) 18%, transparent); color: var(--success); }
.cc-delta.is-negative { background: color-mix(in srgb, var(--danger) 18%, transparent);  color: var(--danger); }
.cc-delta.is-neutral  { color: var(--mute); }

.compare-overall-stack { display: grid; gap: 12px; }
.compare-overall-card { padding: 16px 18px; }
.compare-overall-label {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 8px;
}
.compare-overall-text { font-size: 14px; line-height: 1.55; }
</style>
```

- [ ] **Step 3: Type-check**

Run:

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/modules/writing/DraftCompare.vue src/router.ts
git commit -m "feat(writing): draft comparison page + route"
```

---

## Task 14: Final verification

**Files:** none modified.

- [ ] **Step 1: Run the full test suite**

```
npm test
```

Expected: all tests pass — at minimum the new Writing-grader (validator + retry + upgrade) tests and Writing-prompts (lookup + filter) tests, plus every test that was passing before this sprint.

- [ ] **Step 2: Run the full typecheck**

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 3: Manual smoke (user-driven, requires Gemini key)**

Skip if the user does this themselves; otherwise document the steps for them:

1. From `/`, click the **Writing tutor** tile (numeral VI) → land on `/writing`.
2. Pick **Forumsbeitrag** → land on `/writing/task/forumsbeitrag` showing two prompts.
3. Pick **Wohnen: Stadt oder Land?** → land on `/writing/prompt/wp-forum-wohnen-stadt-land`.
4. Click **Neuer Entwurf** → land on the editor with a fresh draft id.
5. Type a ~230-word German draft. Watch the word counter colour transition red → green.
6. Refresh the tab — confirm the draft survives (autosave to Dexie).
7. Click **Grade me** → loading overlay → land back on the editor with the criteria panel visible.
8. Click an evidence quote — confirm the corresponding span in the rendered text highlights briefly.
9. Click **Upgrade this paragraph** on one paragraph — confirm the side-by-side "Original / Vorschlag" panel appears.
10. Switch back to `/writing/prompt/wp-forum-wohnen-stadt-land` — confirm the draft row shows the score.
11. Create a second draft of the same prompt, grade it, and click **Compare** — confirm score deltas render.
12. Visit `/history` → confirm a `Writing — graded essay` row exists with the right prompt title and score.
13. From `/`, hit ESC → confirm the home page shows the new tile and the breadcrumb reads `Frontispiece · I/VII`.

- [ ] **Step 4: No commit needed**

This task is verification only; nothing to add.

---

## Definition of Done

- [ ] `/writing` is reachable from the home page; tile renders cleanly without console errors.
- [ ] Catalogue lists all six task types; each task type has at least two prompts (12 prompts seeded).
- [ ] Drafting → autosave → reload → resume works on the same `:promptId/:draftId` URL.
- [ ] Grading produces a `WritingGradeResult` with criteria, inline notes, paragraph feedback, and overall summaries; the disclaimer ribbon is visible on every editor surface.
- [ ] Inline notes overlay correctly highlights the right spans in the rendered draft.
- [ ] "Upgrade this paragraph" produces a side-by-side higher-register rewrite.
- [ ] `DraftCompare.vue` renders score deltas between two graded drafts of the same prompt.
- [ ] A `writing-grade` event appears in `/history` with `promptId`, `taskType`, `rubric`, `bandEstimate`, `totalScore`, `wordCount` meta.
- [ ] `npm test` and `npm run typecheck` both clean.
