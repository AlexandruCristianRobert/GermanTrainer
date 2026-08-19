# Relativsätze & N-Deklination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two new offline deterministic grammar modules — Relativsätze (pick the relative pronoun) and N-Deklination (inflect/classify weak nouns) — closing the two biggest verified B2 grammar holes, with seeded item banks, data-gate tests, Setup+Runner pages, and full history wiring.

**Architecture:** Each module follows the proven small-module shape: a seeded data bank in `src/data/` guarded by a data-gate test, a Setup page (level/kind/count filters persisted to localStorage, count via query) cloned from the dative module's `FreeSetup.vue`, and a Runner cloned structurally from `FreeRunner.vue`/`SprechenDrill.vue` (options-click for Relativ; typed + options for N-Dekl), recording runs via `saveQuizRun` under two new `QuizHistoryType`s. No AI, no ledger — band-style history only.

**Tech Stack:** Vue 3 `<script setup>`, vue-router, localStorage, Vitest + @vue/test-utils (jsdom).

## Global Constraints

- Offline deterministic (ADR-0007 family): no AI calls anywhere in these modules.
- New `QuizHistoryType`s, verbatim: `'relativ-pronomen'` and `'ndekl-form'`. Adding them REQUIRES updating every exhaustive map — the union in `useQuizHistory.ts`, `zeroRunsByType` + `zeroAccuracyByType` in `useQuizStats.ts`, `QUIZ_TYPE_LABEL` + `QUIZ_TYPE_DE` in `components/charts/quiz-type-labels.ts`, `QUIZ_TYPES` in `modules/history/HistoryPage.vue`, `TYPE_LABEL` in `useLevelAssessment.ts`. vue-tsc enforces this; typecheck must exit 0 at the end of Task 3.
- Route names, verbatim: `relativ`, `relativ-run`, `ndekl`, `ndekl-run` (paths `/relativ`, `/relativ/run`, `/ndekl`, `/ndekl/run`).
- Item authoring: never emit more than ~12 items per tool call (Write first ~12, then Edit-append ≤12 at a time) — larger single calls exceed the output-token limit and terminate the agent.
- German content quality: natural sentences a native teacher would write; explanations in German following the dative banks' house style.
- Answer-balance rule (the DW-T8 lesson): no drill may be one-button-winnable — see each bank's distribution floors.
- Tests: `npx vitest run <file>`; typecheck `npm run typecheck`; mock clock never via `vi.useFakeTimers()`.
- Never `git add -A`.

---

### Task 1: Relativsätze item bank + data gate

**Files:**
- Create: `src/data/relativItems.ts`
- Test: `tests/data/relativItems.test.ts`

**Interfaces (Task 3 consumes these EXACT exports):**

```ts
export const RELATIV_PRONOUNS = ['der', 'die', 'das', 'den', 'dem', 'denen', 'dessen', 'deren'] as const
export type RelativLevel = 'B1' | 'B2' | 'C1'
export const RELATIV_LEVELS: readonly RelativLevel[] = ['B1', 'B2', 'C1']
export type RelativKind = 'standard' | 'genitiv' | 'praeposition'
export const RELATIV_KINDS: readonly RelativKind[] = ['standard', 'genitiv', 'praeposition']
export const RELATIV_KIND_LABEL: Record<RelativKind, string> = {
  standard: 'Pronomen wählen',
  genitiv: 'dessen / deren',
  praeposition: 'Präposition + Pronomen',
}
export interface RelativItem {
  id: string                 // 'rel-' prefix, kebab-case, unique
  level: RelativLevel
  kind: RelativKind
  prompt: string             // the sentence with exactly one ___ where the pronoun goes;
                             // for 'praeposition' the preposition stands in the prompt before ___
  options: string[]          // exactly 4, unique, all from RELATIV_PRONOUNS, containing the answer
  answers: string[]          // exactly 1
  antecedent: string         // the head noun phrase, exactly as it appears in prompt
  roleCase: 'Nominativ' | 'Akkusativ' | 'Dativ' | 'Genitiv'   // the pronoun's case from its role IN the relative clause
  translation: string        // English of the complete sentence (gap filled)
  explanation: string        // German: antecedent's gender/number + the role in the clause → the pronoun
}
export const RELATIV_ITEMS: RelativItem[] = [ ... ]
export function filterRelativItems(f: { levels: RelativLevel[]; kinds: string[] }): RelativItem[] {
  return RELATIV_ITEMS.filter(i => f.levels.includes(i.level) && f.kinds.includes(i.kind))
}
```

**Bank size & distribution (exact):** 120 items — kind: standard 60, genitiv 30, praeposition 30. Levels ≈ B1 36 / B2 48 / C1 36. Every one of the 8 pronouns appears as the answer ≥ 8 times; no pronoun exceeds 30 answers. `dessen`/`deren` answers appear only under kind `genitiv`; `genitiv` items answer only `dessen`/`deren`.

**Content rules:** vary antecedent gender/number and clause roles; C1 items use longer sentences, eingeschobene Relativsätze, and less frequent vocabulary. `praeposition` items keep the preposition visible in the prompt (`…, mit ___ ich arbeite, …`) and the answer is the bare pronoun. Explanation pattern (house style): `„die Kollegin" ist feminin Singular; im Relativsatz ist sie Dativobjekt von „helfen" → mit der? Nein — helfen + Dativ → „der".` — name the antecedent, its gender/number, the in-clause role, then the pronoun. No duplicate prompts.

- [ ] **Step 1: Write the data-gate test first** — `tests/data/relativItems.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  RELATIV_ITEMS, RELATIV_PRONOUNS, RELATIV_LEVELS, RELATIV_KINDS, filterRelativItems
} from '../../src/data/relativItems'

describe('RELATIV_ITEMS', () => {
  test('base invariants: unique ids, known level/kind, one gap, texts present', () => {
    expect(new Set(RELATIV_ITEMS.map(i => i.id)).size).toBe(RELATIV_ITEMS.length)
    const bad = RELATIV_ITEMS.filter(i =>
      !RELATIV_LEVELS.includes(i.level)
      || !RELATIV_KINDS.includes(i.kind)
      || (i.prompt.match(/___/g) ?? []).length !== 1
      || i.translation.trim().length === 0
      || i.explanation.trim().length === 0
      || !i.prompt.includes(i.antecedent))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('options: exactly 4 unique pronouns from the paradigm, containing the single answer', () => {
    const bad = RELATIV_ITEMS.filter(i =>
      i.options.length !== 4
      || new Set(i.options).size !== 4
      || !i.options.every(o => (RELATIV_PRONOUNS as readonly string[]).includes(o))
      || i.answers.length !== 1
      || !i.options.includes(i.answers[0]))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('genitiv kind ⇔ dessen/deren answers', () => {
    const bad = RELATIV_ITEMS.filter(i =>
      (i.kind === 'genitiv') !== ['dessen', 'deren'].includes(i.answers[0]))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: 120 total; 60/30/30 by kind; every pronoun ≥8 answers, none >30', () => {
    expect(RELATIV_ITEMS.length).toBe(120)
    expect(RELATIV_ITEMS.filter(i => i.kind === 'standard').length).toBe(60)
    expect(RELATIV_ITEMS.filter(i => i.kind === 'genitiv').length).toBe(30)
    expect(RELATIV_ITEMS.filter(i => i.kind === 'praeposition').length).toBe(30)
    for (const p of RELATIV_PRONOUNS) {
      const n = RELATIV_ITEMS.filter(i => i.answers[0] === p).length
      expect(n, p).toBeGreaterThanOrEqual(8)
      expect(n, p).toBeLessThanOrEqual(30)
    }
  })

  test('filter helper filters by level and kind', () => {
    const some = filterRelativItems({ levels: ['B1'], kinds: ['standard'] })
    expect(some.length).toBeGreaterThan(0)
    expect(some.every(i => i.level === 'B1' && i.kind === 'standard')).toBe(true)
  })

  test('no duplicate prompts', () => {
    expect(new Set(RELATIV_ITEMS.map(i => i.prompt)).size).toBe(RELATIV_ITEMS.length)
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/data/relativItems.test.ts` → FAIL (module missing).
- [ ] **Step 3: Author the bank in ≤12-item chunks** (constants + first 12 items + `]`, then Edit-append) until all 120 items are in and Step 1's gate passes.
- [ ] **Step 4: Run gate + typecheck** — both clean.
- [ ] **Step 5: Commit** — controller commits.

---

### Task 2: N-Deklination bank + data gate

**Files:**
- Create: `src/data/nDeklination.ts`
- Test: `tests/data/nDeklination.test.ts`

**Interfaces (Task 3 consumes these EXACT exports):**

```ts
export type NDeklLevel = 'B1' | 'B2' | 'C1'
export const NDEKL_LEVELS: readonly NDeklLevel[] = ['B1', 'B2', 'C1']
export type NDeklKind = 'form' | 'classify'
export const NDEKL_KINDS: readonly NDeklKind[] = ['form', 'classify']
export const NDEKL_KIND_LABEL: Record<NDeklKind, string> = {
  form: 'Form tippen',
  classify: 'Schwach oder stark?',
}
export const NDEKL_CLASSIFY_OPTIONS = ['schwach (-n)', 'stark (endungslos)'] as const
export interface WeakNoun {
  lemma: string              // 'Kollege'
  article: 'der' | 'das'     // 'das' only for Herz
  english: string
  weakForm: string           // 'Kollegen' — Akk/Dat/Gen Sg form (and plural)
  genitivSg?: string         // only when it differs from weakForm: 'Namens', 'Herzens'
  note?: string              // e.g. '-ns im Genitiv'
}
export const WEAK_NOUNS: WeakNoun[] = [ ... ]   // exactly 40
/** The correct singular form of a weak noun in the given case. */
export function weakNounForm(n: WeakNoun, c: 'Nominativ' | 'Akkusativ' | 'Dativ' | 'Genitiv'): string {
  if (c === 'Nominativ') return n.lemma
  if (c === 'Genitiv') return n.genitivSg ?? n.weakForm
  return n.weakForm
}
export interface NDeklItem {
  id: string                 // 'nd-' prefix, kebab-case, unique
  level: NDeklLevel
  kind: NDeklKind
  prompt: string             // form: sentence with exactly one ___ followed by the lemma cue, e.g. 'Ich habe ___ (der Kollege) gefragt.'
                             // classify: complete sentence with the noun form in place, no gap
  noun: string               // the lemma. form: MUST exist in WEAK_NOUNS. classify: in WEAK_NOUNS ⇔ answer is 'schwach (-n)'
  caseUsed: 'Nominativ' | 'Akkusativ' | 'Dativ' | 'Genitiv'
  options: string[]          // form: [] (typed answer). classify: exactly [...NDEKL_CLASSIFY_OPTIONS]
  answers: string[]          // form: exactly [weakNounForm(noun, caseUsed)]. classify: exactly one of NDEKL_CLASSIFY_OPTIONS
  translation: string
  explanation: string        // German; form: why the -(e)n (or Nominativ/-ns); classify: why weak or strong, with the giveaway
}
export const NDEKL_ITEMS: NDeklItem[] = [ ... ]
export function filterNDeklItems(f: { levels: NDeklLevel[]; kinds: string[] }): NDeklItem[] {
  return NDEKL_ITEMS.filter(i => f.levels.includes(i.level) && f.kinds.includes(i.kind))
}
```

**WEAK_NOUNS content (exactly 40):** the canonical B1–C1 weak nouns — Junge, Kollege, Kunde, Experte, Herr (weakForm 'Herrn'), Mensch, Student, Praktikant, Präsident, Polizist, Journalist, Tourist, Assistent, Patient, Kandidat, Soldat, Automat, Diplomat, Nachbar (weakForm 'Nachbarn'), Bauer, Held, Zeuge, Riese, Löwe, Affe, Hase, Rabe, Bote, Erbe, Pilot, Fotograf, Architekt, Philosoph, Biologe, Psychologe, Katholik, Demokrat, Elefant, plus the -ns irregulars Name (genitivSg 'Namens') and Herz (article 'das', weakForm 'Herzen', genitivSg 'Herzens', note on the Akk exception 'das Herz' — see below). For Herz: Akkusativ is endungslos ('das Herz'); model this by authoring NO 'form' item for Herz in the Akkusativ (gate cannot express the exception; the cheat lives in explanation text of its Dativ/Genitiv items).

**Item distribution (exact):** 100 items — form 60, classify 40. form: no Nominativ items (nothing to inflect) — spread Akkusativ/Dativ/Genitiv roughly evenly across ~25 distinct nouns, including Name/Herz genitives. classify: 20 answers 'schwach (-n)' (nouns from WEAK_NOUNS) and 20 'stark (endungslos)' (real masculine STRONG distractors that learners over-inflect: Lehrer, Arzt, Chef, Freund, Vater, Bruder, Wagen, Computer, Tisch, Schüler, Anwalt, Direktor, Ingenieur, Autor…, each used once or twice). Levels ≈ B1 30 / B2 44 / C1 26.

- [ ] **Step 1: Write the data-gate test first** — `tests/data/nDeklination.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  WEAK_NOUNS, NDEKL_ITEMS, NDEKL_LEVELS, NDEKL_KINDS, NDEKL_CLASSIFY_OPTIONS,
  weakNounForm, filterNDeklItems
} from '../../src/data/nDeklination'

describe('WEAK_NOUNS', () => {
  test('exactly 40, unique lemmas, forms present, only Herz is das', () => {
    expect(WEAK_NOUNS.length).toBe(40)
    expect(new Set(WEAK_NOUNS.map(n => n.lemma)).size).toBe(40)
    const bad = WEAK_NOUNS.filter(n =>
      n.weakForm.trim().length === 0 || n.english.trim().length === 0
      || (n.article === 'das' && n.lemma !== 'Herz'))
    expect(bad.map(n => n.lemma)).toEqual([])
  })
  test('weakNounForm: Nominativ = lemma, Genitiv honors -ns irregulars', () => {
    const name = WEAK_NOUNS.find(n => n.lemma === 'Name')!
    expect(weakNounForm(name, 'Nominativ')).toBe('Name')
    expect(weakNounForm(name, 'Dativ')).toBe('Namen')
    expect(weakNounForm(name, 'Genitiv')).toBe('Namens')
  })
})

describe('NDEKL_ITEMS', () => {
  const byLemma = new Map(WEAK_NOUNS.map(n => [n.lemma, n]))

  test('base invariants: unique ids, known level/kind, texts present', () => {
    expect(new Set(NDEKL_ITEMS.map(i => i.id)).size).toBe(NDEKL_ITEMS.length)
    const bad = NDEKL_ITEMS.filter(i =>
      !NDEKL_LEVELS.includes(i.level)
      || !NDEKL_KINDS.includes(i.kind)
      || i.translation.trim().length === 0
      || i.explanation.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('FORM GATE: gap present, noun is weak, answer IS the declined form, never Nominativ, no Herz-Akkusativ', () => {
    const forms = NDEKL_ITEMS.filter(i => i.kind === 'form')
    const bad = forms.filter(i => {
      const n = byLemma.get(i.noun)
      return !n
        || (i.prompt.match(/___/g) ?? []).length !== 1
        || i.caseUsed === 'Nominativ'
        || (i.noun === 'Herz' && i.caseUsed === 'Akkusativ')
        || i.options.length !== 0
        || i.answers.length !== 1
        || i.answers[0] !== weakNounForm(n, i.caseUsed)
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('CLASSIFY GATE: options fixed, weak ⇔ schwach answer, prompt has no gap and contains the noun form or lemma', () => {
    const cls = NDEKL_ITEMS.filter(i => i.kind === 'classify')
    const bad = cls.filter(i => {
      const isWeak = byLemma.has(i.noun)
      return JSON.stringify(i.options) !== JSON.stringify([...NDEKL_CLASSIFY_OPTIONS])
        || i.answers.length !== 1
        || i.prompt.includes('___')
        || (i.answers[0] === 'schwach (-n)') !== isWeak
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: 100 total, 60 form / 40 classify, classify balanced 20/20', () => {
    expect(NDEKL_ITEMS.length).toBe(100)
    expect(NDEKL_ITEMS.filter(i => i.kind === 'form').length).toBe(60)
    const cls = NDEKL_ITEMS.filter(i => i.kind === 'classify')
    expect(cls.length).toBe(40)
    expect(cls.filter(i => i.answers[0] === 'schwach (-n)').length).toBe(20)
    expect(cls.filter(i => i.answers[0] === 'stark (endungslos)').length).toBe(20)
  })

  test('filter helper filters by level and kind', () => {
    const some = filterNDeklItems({ levels: ['B2'], kinds: ['form'] })
    expect(some.length).toBeGreaterThan(0)
    expect(some.every(i => i.level === 'B2' && i.kind === 'form')).toBe(true)
  })

  test('no duplicate prompts', () => {
    expect(new Set(NDEKL_ITEMS.map(i => i.prompt)).size).toBe(NDEKL_ITEMS.length)
  })
})
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Author WEAK_NOUNS then items in ≤12-item chunks until the gate passes.**
- [ ] **Step 4: Gate + typecheck clean.**
- [ ] **Step 5: Commit** — controller commits.

---

### Task 3: Module UI + history wiring (both modules)

**Files:**
- Modify: `src/composables/useQuizHistory.ts` (union: add `'relativ-pronomen'` and `'ndekl-form'`)
- Modify: `src/composables/useQuizStats.ts` (`zeroRunsByType`, `zeroAccuracyByType`: two entries each)
- Modify: `src/components/charts/quiz-type-labels.ts` (`QUIZ_TYPE_LABEL`: `'relativ-pronomen': 'Relative pronouns'`, `'ndekl-form': 'Weak nouns'`; `QUIZ_TYPE_DE`: `'relativ-pronomen': 'Relativpronomen'`, `'ndekl-form': 'N-Deklination'`)
- Modify: `src/modules/history/HistoryPage.vue` (`QUIZ_TYPES`: follow the file's TypeMeta shape, grouping with the other grammar drills)
- Modify: `src/composables/useLevelAssessment.ts` (`TYPE_LABEL`: same two labels as QUIZ_TYPE_LABEL)
- Modify: `src/router.ts` (4 routes as in Global Constraints)
- Modify: `src/data/nav.ts` (grammar section, after passiv: `{ route: 'relativ', label: 'Relativsätze', de: 'der, den, dessen' }`, `{ route: 'ndekl', label: 'N-Deklination', de: 'Schwache Substantive' }`)
- Modify: `src/modules/home/Home.vue` (two module cards, numerals XV and XVI, before the Settings card if numbering conflicts — keep existing numerals stable and append XV/XVI at the end of the array)
- Create: `src/modules/relativ/RelativSetup.vue`, `src/modules/relativ/RelativRunner.vue`
- Create: `src/modules/ndekl/NDeklSetup.vue`, `src/modules/ndekl/NDeklRunner.vue`
- Test: `tests/modules/RelativRunner.test.ts`, `tests/modules/NDeklRunner.test.ts` (new; mount tests)

**Interfaces:**
- Consumes: Task 1 + Task 2 exports exactly as declared; `saveQuizRun` from useQuizHistory; `foldGerman` from `composables/drillGrading`; `shuffle` from `data/pool`; `csv` from `composables/quizQuery`.
- Produces: nothing consumed later.

**Setup pages** — clone `src/modules/dative/FreeSetup.vue` structure exactly (storage keys `relativSetup` / `ndeklSetup`; level chips from RELATIV_LEVELS/NDEKL_LEVELS; kind chips from the KIND_LABEL maps; count presets 10/15/20/All; available-count line; Start pushes `{ name: 'relativ-run' | 'ndekl-run', query: { count, levels, kinds } }`). Breadcrumbs `Kapitel XV · Relativsätze` / `Kapitel XVI · N-Deklination`. Each Setup gets a short "How it works" info alert in the FreeSetup style: Relativ — gender/number from the antecedent, case from the role inside the clause, the two probes to run in your head; N-Dekl — weak masculines take -(e)n everywhere except Nominativ Singular, the -ns irregulars, and what "stark" means.

**Runners** — self-contained local state in the `SprechenDrill.vue` style (items/index/verdict/check/next/finish + saveQuizRun), reading query filters like `FreeRunner.vue` does (`csv`, count, `shuffle`):
- RelativRunner: renders `prompt` with the `___` visually emphasized; 4 option buttons (`options` shuffled once per card); click = answer → verdict + explanation card (`Du/Besser`-style reveal showing the full corrected sentence: prompt with ___ replaced by the answer, plus `explanation`); Enter advances after verdict. `saveQuizRun({ type: 'relativ-pronomen', startedAt, finishedAt, durationMs, count: attempted, correct: firstTryCorrect, meta: {} })` on finish.
- NDeklRunner: for `kind === 'form'` a typed input, graded `normalize(answer) === normalize(expected)` with `const normalize = (s: string) => foldGerman(s.trim().toLowerCase())`; for `kind === 'classify'` two option buttons. Same reveal + finish pattern, `type: 'ndekl-form'`.
- Both: keyboard flow per the 1.21.02 convention — Enter checks when unanswered (typed kind), Enter advances after verdict; focus follows the card (input or next-button).

**Mount tests** — follow `tests/modules/SprechenDrill.test.ts` conventions (router stub, flushPromises). Per runner: (a) renders the first card's prompt from a mocked/query-driven bank sample; (b) a correct answer shows the correct verdict and explanation; (c) a wrong answer shows the wrong verdict; (d) finishing calls `saveQuizRun` with the right `type` and counts. Mock the data module or drive via query filters against the real bank — whichever the existing mount tests' convention favors (check how FreeRunner/dative runner tests do it and match).

- [ ] **Step 1:** Read the four template files (`FreeSetup.vue`, `FreeRunner.vue`, `SprechenDrill.vue`, one dative runner mount test) once. Write the two failing mount tests.
- [ ] **Step 2:** Run to verify failure.
- [ ] **Step 3:** Implement the wiring (union + 6 maps + router + nav + Home cards), then the four components.
- [ ] **Step 4:** `npx vitest run tests/modules/RelativRunner.test.ts tests/modules/NDeklRunner.test.ts tests/data/relativItems.test.ts tests/data/nDeklination.test.ts tests/data/nav.test.ts` → PASS; `npm run typecheck` → exit 0 (this proves every exhaustive map was updated).
- [ ] **Step 5:** Commit — controller commits.

---

### Task 4 (controller): changelog, release

Changelog `1.22.00`, kind `'module'`, title `'Relativsätze & N-Deklination'`; APP_VERSION + package.json; full suite + typecheck; merge `feat/relativ-ndekl` → main; push; `npm run deploy`.
