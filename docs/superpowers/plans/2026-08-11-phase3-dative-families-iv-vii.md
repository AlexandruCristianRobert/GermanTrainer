# Phase 3 — Dativ Families IV–VII (T4–T9) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Dativ module gains six deterministic drills — T4 *Wer ist Subjekt?* and T5 *Produktion* (inverted experiencers, family IV), T6 *Zwillingspaare* (family V), T7 *Welches Objekt?* and T8 *Objektfolge* (ditransitives, family VI), T9 *Dativ-Adjektive* (family VII) — all offline per ADR-0007, recording Runs per ADR-0010, feeding `gt:drillTotals` (band) and — for the memorization drills only — `gt:dativeLedger` (per item).

**Architecture:** Three new authored data files (`src/data/dativeExperiencer.ts`, `src/data/dativeTwins.ts`, `src/data/dativeDitransitive.ts`) plus a T9 item bank appended to the phase-1 `src/data/dativeAdjectives.ts`. One shared question engine `useDativeQuiz` (added to `src/composables/useDativeDrill.ts` beside phase 2's pinned helpers) runs all six drills; per-drill builder + filter functions normalize items into `DativeQuizCard`s. Six Setup/Runner pairs mirror the Direction Words house skeleton (`CompoundSetup.vue`/`CompoundRunner.vue`): localStorage-persisted chips, count presets, `availableItems === 0` warning, router push to `dative-<slug>-run` with query params, ✓/✗ reveal, retry round never re-recorded. The EXPERIENCER GATE (spec gate 4) makes a number-agreement error in the T4/T5 banks unshippable by recomputing the finite verb from `VERBS` conjugation data.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Vitest + @vue/test-utils, `shuffle` (src/data/pool.ts), phase-2 pinned APIs (`useDativeLedger`, `useDativeDrill`), `saveQuizRun` (localStorage history).

## Global Constraints

- **Prerequisites (already merged by phases 1–2 — consume, never re-create):** `src/data/dativeVerbs.ts` (`DATIVE_VERBS`, `DATIVE_VERB_KEYS`, `dativeVerbsBy`); `src/composables/useDativeLedger.ts` (`bumpDativeLedger(item, correct, at)`); `src/composables/useDativeDrill.ts` (`DativeCard`, `sampleDativeCards`, `gradeDativeAnswer(given, answers): boolean`); `DAT_FAMILIES: DrillFamily[]` in `src/data/drillCatalogue.ts`; the 13 `dat-*` `QuizHistoryType`s **and their label/order/stats registry entries** — do NOT re-add any of these.
- Branch `feat/phase3-dative-families-iv-vii` off `main`; merge in the final controller step.
- Routes: paths `/dative/<slug>` + `/dative/<slug>/run`, names `dative-<slug>` + `dative-<slug>-run`. Names keep the single-word `dative` head (NavShell derives the active tab via `name.split('-')[0]`). This phase adds `dative-subject`, `dative-experiencer`, `dative-twins`, `dative-ditransitive`, `dative-object-order`, `dative-adjectives` (+ `-run` each), inserted in `src/router.ts` directly after the existing `dative-*` block from phase 2.
- Breadcrumbs read `Kapitel XIII · Dativ · <drill>` (e.g. `Kapitel XIII · Dativ · Zwillingspaare`).
- **Ledger rule (spec requirement, not a detail):** T4, T5, T6, T9 bump `gt:dativeLedger` once per graded card via `bumpDativeLedger` — keyed by the dative **verb** (T4/T5/T6) or the **adjective lemma** (T9), main round only. T7 and T8 are rule-driven and band-tracked ONLY: their runners must NOT import or call `bumpDativeLedger`, because ditransitives are not in the ledger.
- Recording: main round records exactly once (`startedAtMs` + `historySaved` + `watch(finished)` — copy `src/modules/direction-words/CompoundRunner.vue` lines 165–188 mechanics); retry rounds and `total === 0` never record (ADR-0010).
- **The experiencer agreement invariant is a shipping gate**: in every T4/T5 item the nominative subject is the *thing* and the finite verb agrees with it in number — a plural subject takes *gefallen*, never *gefällt*. Tests enforce it mechanically against `VERBS` conjugation data; never weaken a test to make data pass — fix the data.
- German content correctness is a shipping gate. Every item below is authored in full; transcribe exactly, do not improvise new sentences.
- Typed answers graded via `gradeDativeAnswer` (phase 2; checkText-style folding — `ue` accepted for `ü`, case-insensitive); the engine strips trailing `.`/`!`/`?` before grading.
- Gates per task: focused `npx vitest run <files>`; the final task runs full `npx vitest run` + `npm run typecheck` (vue-tsc — plain `tsc` floods with ~212 bogus `.vue` module errors and means nothing).
- Never touch `dist/` or `GermanVerbTester/`. Version bump + changelog are left to the controller at merge time (parallel phases decide the number).
- Commits end with: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

### Task 1: Shared quiz engine `useDativeQuiz` + history meta fields

**Files:**
- Modify: `src/composables/useDativeDrill.ts` (additive — append below phase 2's exports; do not touch `DativeCard`, `sampleDativeCards`, `gradeDativeAnswer`)
- Modify: `src/composables/useQuizHistory.ts` (two optional meta fields)
- Test: `tests/composables/useDativeQuiz.test.ts`

**Interfaces:**
- Consumes: `gradeDativeAnswer(given: string, answers: readonly string[]): boolean` (phase 2, same file).
- Produces (Tasks 2–11 rely on these exact names):
  - `interface DativeQuizCard { key: string; prompt: string; answers: string[]; options: string[]; translation: string; note: string | null; ledgerKey: string | null; sourceIndex: number; picked: string | null; typed: string | null; isCorrect: boolean | null }`
  - `useDativeQuiz(cards: DativeQuizCard[])` → `{ questions, currentIndex, current, finished, pickOption, submitText, advance, score, total, wrongIndexes }` (same surface as `useDirectionDrill` in `src/composables/useDirectionDrill.ts`)
  - `QuizHistoryMeta.verbs?: string[]`, `QuizHistoryMeta.adjectives?: string[]`

- [ ] **Step 1: Guard check.** Open `src/composables/useDativeDrill.ts` and confirm no export named `useDativeQuiz` or `DativeQuizCard` exists (phase 2 pinned only `DativeCard`, `sampleDativeCards`, `gradeDativeAnswer`). If a same-named export somehow exists, rename ours to `useDativeQuizEngine`/`DativeQuizEngineCard` consistently across ALL of this plan's code and say so in your completion report.

- [ ] **Step 2: Failing test.** Create `tests/composables/useDativeQuiz.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { useDativeQuiz, type DativeQuizCard } from '../../src/composables/useDativeDrill'

function card(over: Partial<DativeQuizCard> = {}): DativeQuizCard {
  return {
    key: 'k1', prompt: 'Die Schuhe ___ mir.', answers: ['gefallen'],
    options: ['gefällt', 'gefallen'], translation: 'I like the shoes.',
    note: null, ledgerKey: 'gefallen', sourceIndex: 0,
    picked: null, typed: null, isCorrect: null, ...over,
  }
}

describe('useDativeQuiz', () => {
  test('pick grading, score, finish, wrongIndexes', () => {
    const quiz = useDativeQuiz([card(), card({ key: 'k2', sourceIndex: 1 })])
    quiz.pickOption('gefallen')
    expect(quiz.current.value!.isCorrect).toBe(true)
    quiz.advance()
    quiz.pickOption('gefällt')
    expect(quiz.current.value!.isCorrect).toBe(false)
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(1)
    expect(quiz.wrongIndexes.value).toEqual([1])
  })

  test('typed grading folds umlauts, accepts alternatives, strips trailing punctuation', () => {
    const quiz = useDativeQuiz([card({
      prompt: 'I like the shoes.',
      answers: ['Die Schuhe gefallen mir', 'Mir gefallen die Schuhe'],
      options: [],
    })])
    quiz.submitText('mir gefallen die schuhe.')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('double answer ignored; empty typed input is wrong', () => {
    const quiz = useDativeQuiz([card()])
    quiz.pickOption('gefallen')
    quiz.pickOption('gefällt')
    expect(quiz.current.value!.isCorrect).toBe(true)
    const quiz2 = useDativeQuiz([card({ options: [] })])
    quiz2.submitText('   ')
    expect(quiz2.current.value!.isCorrect).toBe(false)
  })
})
```

- [ ] **Step 3: RED.** `npx vitest run tests/composables/useDativeQuiz.test.ts` — fails (no such exports).

- [ ] **Step 4: Implement.** Append to `src/composables/useDativeDrill.ts` (ensure `import { computed, ref } from 'vue'` is present at the top — add it if phase 2's file lacks it):

```ts
// ─── Phase 3+: shared question engine for the deterministic Dativ drills ───
// Mirrors useDirectionDrill's state machine. `ledgerKey` names the gt:dativeLedger
// item this card is an encounter of (a dative verb or adjective lemma) — or null
// for the rule-driven drills (T7/T8/T10/T12/T13), which are band-tracked only.

export interface DativeQuizCard {
  key: string
  prompt: string
  answers: string[]        // [0] canonical; the rest accepted alternatives (type mode)
  options: string[]        // pick-mode buttons; [] in type-only drills
  translation: string
  note: string | null      // teaching line revealed after grading
  ledgerKey: string | null
  sourceIndex: number      // index into the sampled source array (retry rebuild)
  picked: string | null
  typed: string | null
  isCorrect: boolean | null
}

export function useDativeQuiz(cards: DativeQuizCard[]) {
  const questions = ref<DativeQuizCard[]>(cards)
  const currentIndex = ref(0)
  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  const wrongIndexes = computed(() =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.sourceIndex))

  function pickOption(option: string) {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.picked = option
    q.isCorrect = q.answers.includes(option)
  }

  function submitText(input: string) {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    const cleaned = input.replace(/[.!?]+\s*$/, '')
    q.typed = input
    q.isCorrect = gradeDativeAnswer(cleaned, q.answers)
  }

  function advance() {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }

  return { questions, currentIndex, current, finished, pickOption, submitText, advance, score, total, wrongIndexes }
}
```

- [ ] **Step 5: Meta fields.** In `src/composables/useQuizHistory.ts`, inside `QuizHistoryMeta`, directly after the `roles?: string[]` line, add (skip any line phase 2 already added — check first):

```ts
  verbs?: string[]        // Dativ drills: drilled dative-verb filter (T5)
  adjectives?: string[]   // Dativ adjective drill (T9): adjective lemma filter
```

- [ ] **Step 6: GREEN.** `npx vitest run tests/composables/useDativeQuiz.test.ts` → PASS. `npm run typecheck` → PASS.
- [ ] **Step 7: Commit** `feat(dative): shared useDativeQuiz engine + history meta fields`

---
### Task 2: Item banks for T4/T5 — `dativeExperiencer.ts` + EXPERIENCER GATE

**Files:**
- Create: `src/data/dativeExperiencer.ts`
- Test: `tests/data/dativeExperiencer.test.ts`

**Interfaces:**
- Consumes: `VERBS` from `src/data/verbs.ts` (the gate recomputes finite verbs from `praesens[2]`/`praesens[5]`).
- Produces (Tasks 3–4 and phase 4 rely on these exact names): `DATIVE_DRILL_LEVELS = ['A2','B1','B2','C1'] as const`, `type DativeDrillLevel`, `EXPERIENCER_VERBS`, `interface ExperiencerSubjectItem`, `EXPERIENCER_SUBJECT_ITEMS` (25), `interface ExperiencerProductionItem`, `EXPERIENCER_PRODUCTION_ITEMS` (22).

- [ ] **Step 1: Invariant tests FIRST.** Create `tests/data/dativeExperiencer.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  DATIVE_DRILL_LEVELS, EXPERIENCER_VERBS,
  EXPERIENCER_SUBJECT_ITEMS, EXPERIENCER_PRODUCTION_ITEMS,
} from '../../src/data/dativeExperiencer'
import { VERBS } from '../../src/data/verbs'

const byGerman = new Map(VERBS.map(v => [v.german, v]))

/** Two-sided word-boundary containment that respects umlauts (JS \b is ASCII-only). */
function containsWord(text: string, word: string): boolean {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-zäöüß])${esc}($|[^a-zäöüß])`, 'i').test(text)
}

function expectedFinite(verb: string, num: 'sg' | 'pl'): string | undefined {
  const v = byGerman.get(verb)
  return num === 'pl' ? v?.praesens[5] : v?.praesens[2]
}

function baseChecks(items: { id: string; level: string }[]) {
  expect(new Set(items.map(i => i.id)).size).toBe(items.length)
  const bad = items.filter(i => !(DATIVE_DRILL_LEVELS as readonly string[]).includes(i.level))
  expect(bad.map(i => i.id)).toEqual([])
}

describe('EXPERIENCER_SUBJECT_ITEMS (T4)', () => {
  test('base invariants', () => baseChecks(EXPERIENCER_SUBJECT_ITEMS))

  test('cross-ref: verb exists in VERBS with case dative (catches the stehen mis-tag)', () => {
    const bad = EXPERIENCER_SUBJECT_ITEMS.filter(i => byGerman.get(i.verb)?.case !== 'dative')
    expect(bad.map(i => `${i.id}:${i.verb}`)).toEqual([])
  })

  test('EXPERIENCER GATE: finiteVerb IS the praesens form agreeing with the thing-subject', () => {
    const bad = EXPERIENCER_SUBJECT_ITEMS.filter(i => i.finiteVerb !== expectedFinite(i.verb, i.subjectNumber))
    expect(bad.map(i => `${i.id}: ${i.finiteVerb} ≠ ${expectedFinite(i.verb, i.subjectNumber)}`)).toEqual([])
  })

  test('subject kind: answer IS the subject NP; the sentence carries the agreeing finite verb', () => {
    const bad = EXPERIENCER_SUBJECT_ITEMS.filter(i => i.kind === 'subject' && (
      i.answers.length !== 1
      || i.answers[0] !== i.subject
      || !i.options.includes(i.subject)
      || i.options.length < 2
      || new Set(i.options).size !== i.options.length
      || !i.finiteVerb.split(' ').every(tok => containsWord(i.sentence, tok))
    ))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('agreement kind: options are exactly the sg/pl finite tokens; answer matches the number; no leak', () => {
    const bad = EXPERIENCER_SUBJECT_ITEMS.filter(i => {
      if (i.kind !== 'agreement') return false
      const sg = expectedFinite(i.verb, 'sg')?.split(' ')[0]
      const pl = expectedFinite(i.verb, 'pl')?.split(' ')[0]
      if (!sg || !pl) return true
      const optSet = new Set(i.options)
      return !((i.sentence.match(/___/g) ?? []).length === 1
        && optSet.size === 2 && optSet.has(sg) && optSet.has(pl)
        && i.answers.length === 1
        && i.answers[0] === i.finiteVerb.split(' ')[0]
        && !containsWord(i.sentence, i.answers[0]))
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥20 total, ≥10 subject kind, ≥8 agreement kind, ≥10 per subject number', () => {
    expect(EXPERIENCER_SUBJECT_ITEMS.length).toBeGreaterThanOrEqual(20)
    expect(EXPERIENCER_SUBJECT_ITEMS.filter(i => i.kind === 'subject').length).toBeGreaterThanOrEqual(10)
    expect(EXPERIENCER_SUBJECT_ITEMS.filter(i => i.kind === 'agreement').length).toBeGreaterThanOrEqual(8)
    expect(EXPERIENCER_SUBJECT_ITEMS.filter(i => i.subjectNumber === 'pl').length).toBeGreaterThanOrEqual(10)
    expect(EXPERIENCER_SUBJECT_ITEMS.filter(i => i.subjectNumber === 'sg').length).toBeGreaterThanOrEqual(10)
  })
})

describe('EXPERIENCER_PRODUCTION_ITEMS (T5)', () => {
  test('base invariants', () => baseChecks(EXPERIENCER_PRODUCTION_ITEMS))

  test('cross-ref: verb exists in VERBS with case dative', () => {
    const bad = EXPERIENCER_PRODUCTION_ITEMS.filter(i => byGerman.get(i.verb)?.case !== 'dative')
    expect(bad.map(i => `${i.id}:${i.verb}`)).toEqual([])
  })

  test('EXPERIENCER GATE: finiteVerb agrees with the thing-subject in number', () => {
    const bad = EXPERIENCER_PRODUCTION_ITEMS.filter(i => i.finiteVerb !== expectedFinite(i.verb, i.subjectNumber))
    expect(bad.map(i => `${i.id}: ${i.finiteVerb} ≠ ${expectedFinite(i.verb, i.subjectNumber)}`)).toEqual([])
  })

  test('every accepted answer contains the agreeing finite tokens AND the subject NP', () => {
    const bad = EXPERIENCER_PRODUCTION_ITEMS.filter(i =>
      i.answers.length < 1
      || !i.answers.every(a =>
        i.finiteVerb.split(' ').every(tok => containsWord(a, tok)) && containsWord(a, i.subject)))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥20 total, ≥8 plural subjects, each of the nine verbs ≥2 items', () => {
    expect(EXPERIENCER_PRODUCTION_ITEMS.length).toBeGreaterThanOrEqual(20)
    expect(EXPERIENCER_PRODUCTION_ITEMS.filter(i => i.subjectNumber === 'pl').length).toBeGreaterThanOrEqual(8)
    for (const v of EXPERIENCER_VERBS) {
      const n = EXPERIENCER_PRODUCTION_ITEMS.filter(i => i.verb === v).length
      expect(n, `verb ${v}`).toBeGreaterThanOrEqual(2)
    }
  })
})
```

- [ ] **Step 2: RED.** `npx vitest run tests/data/dativeExperiencer.test.ts` — unresolvable module.

- [ ] **Step 3: Author the data.** Create `src/data/dativeExperiencer.ts` with EXACTLY this content (the `finiteVerb` strings must byte-match the verb's `praesens[2]`/`praesens[5]` in `verbs.ts` — the gate recomputes them; if phase 1 entered a different conjugation string for a separable verb, fix the ITEM to match `verbs.ts`, then re-check the German still reads correctly):

```ts
// Dativ module — family IV item banks (T4 Wer ist Subjekt?, T5 Produktion).
// EXPERIENCER GATE (tests/data/dativeExperiencer.test.ts): the nominative
// subject is the THING and the finite verb agrees with it in number — a
// plural subject takes gefallen, never gefällt. finiteVerb is recomputed
// from VERBS.praesens at test time; never author it free-hand.

export const DATIVE_DRILL_LEVELS = ['A2', 'B1', 'B2', 'C1'] as const
export type DativeDrillLevel = (typeof DATIVE_DRILL_LEVELS)[number]

/** The inverted-experiencer verbs families IV drills (stehen was re-tagged dative in phase 1). */
export const EXPERIENCER_VERBS = [
  'gefallen', 'schmecken', 'fehlen', 'gehören', 'passen',
  'wehtun', 'einfallen', 'gelingen', 'stehen',
] as const

export interface ExperiencerSubjectItem {
  id: string
  verb: string                    // VERBS.german key, case 'dative'
  level: DativeDrillLevel
  kind: 'subject' | 'agreement'   // find the subject NP | pick the agreeing verb form
  sentence: string                // subject: complete sentence; agreement: one ___ where the finite token goes
  options: string[]
  answers: string[]               // exactly one
  subject: string                 // the thing-NP, exactly as it appears in the sentence/answer
  subjectNumber: 'sg' | 'pl'
  finiteVerb: string              // VERBS.praesens[2] (sg) or [5] (pl), incl. separable tail
  translation: string
  explanation: string             // shown on the reveal — names the inversion mechanism
}

export const EXPERIENCER_SUBJECT_ITEMS: ExperiencerSubjectItem[] = [
  // ── kind 'subject': Was ist das Subjekt? ──
  { id: 'es-schuhe', verb: 'gefallen', level: 'A2', kind: 'subject',
    sentence: 'Die Schuhe gefallen mir.',
    options: ['die Schuhe', 'mir'], answers: ['die Schuhe'],
    subject: 'die Schuhe', subjectNumber: 'pl', finiteVerb: 'gefallen',
    translation: 'I like the shoes.',
    explanation: 'gefallen ist umgekehrt: die Sache (die Schuhe) ist Subjekt und steuert das Verb; die Person steht im Dativ (mir).' },
  { id: 'es-buch', verb: 'gefallen', level: 'A2', kind: 'subject',
    sentence: 'Das Buch gefällt meiner Schwester.',
    options: ['das Buch', 'meiner Schwester'], answers: ['das Buch'],
    subject: 'das Buch', subjectNumber: 'sg', finiteVerb: 'gefällt',
    translation: 'My sister likes the book.',
    explanation: 'Die Sache (das Buch) ist Nominativ-Subjekt; meiner Schwester ist Dativ — nie das Subjekt.' },
  { id: 'es-suppe', verb: 'schmecken', level: 'A2', kind: 'subject',
    sentence: 'Die Suppe schmeckt den Kindern.',
    options: ['die Suppe', 'den Kindern'], answers: ['die Suppe'],
    subject: 'die Suppe', subjectNumber: 'sg', finiteVerb: 'schmeckt',
    translation: 'The children like the soup.',
    explanation: 'schmecken: das Essen ist Subjekt, die Person steht im Dativ (den Kindern).' },
  { id: 'es-kollege', verb: 'fehlen', level: 'B1', kind: 'subject',
    sentence: 'Mir fehlt mein alter Kollege.',
    options: ['mein alter Kollege', 'mir'], answers: ['mein alter Kollege'],
    subject: 'mein alter Kollege', subjectNumber: 'sg', finiteVerb: 'fehlt',
    translation: 'I miss my old colleague.',
    explanation: 'Auch vorangestellt bleibt mir Dativ — Subjekt ist der vermisste Mensch (mein alter Kollege), und fehlt richtet sich nach ihm.' },
  { id: 'es-garten', verb: 'gehören', level: 'A2', kind: 'subject',
    sentence: 'Dem Nachbarn gehört der große Garten.',
    options: ['der große Garten', 'dem Nachbarn'], answers: ['der große Garten'],
    subject: 'der große Garten', subjectNumber: 'sg', finiteVerb: 'gehört',
    translation: 'The big garden belongs to the neighbor.',
    explanation: 'Erst-Position täuscht: dem Nachbarn ist Dativ. Subjekt ist die Sache, die besessen wird (der große Garten).' },
  { id: 'es-jacke', verb: 'passen', level: 'A2', kind: 'subject',
    sentence: 'Die Jacke passt dir perfekt.',
    options: ['die Jacke', 'dir'], answers: ['die Jacke'],
    subject: 'die Jacke', subjectNumber: 'sg', finiteVerb: 'passt',
    translation: 'The jacket fits you perfectly.',
    explanation: 'passen: das Kleidungsstück ist Subjekt; die Person (dir) steht im Dativ.' },
  { id: 'es-fuesse', verb: 'wehtun', level: 'B1', kind: 'subject',
    sentence: 'Mir tun die Füße weh.',
    options: ['die Füße', 'mir'], answers: ['die Füße'],
    subject: 'die Füße', subjectNumber: 'pl', finiteVerb: 'tun weh',
    translation: 'My feet hurt.',
    explanation: 'wehtun: der Körperteil ist Subjekt (die Füße → tun); die Person steht im Dativ (mir).' },
  { id: 'es-loesung', verb: 'einfallen', level: 'B1', kind: 'subject',
    sentence: 'Dir fällt bestimmt eine Lösung ein.',
    options: ['eine Lösung', 'dir'], answers: ['eine Lösung'],
    subject: 'eine Lösung', subjectNumber: 'sg', finiteVerb: 'fällt ein',
    translation: 'You will surely think of a solution.',
    explanation: 'einfallen: der Einfall (eine Lösung) ist Subjekt; die Person, der er einfällt, steht im Dativ (dir).' },
  { id: 'es-experiment', verb: 'gelingen', level: 'B1', kind: 'subject',
    sentence: 'Das Experiment gelingt ihm.',
    options: ['das Experiment', 'ihm'], answers: ['das Experiment'],
    subject: 'das Experiment', subjectNumber: 'sg', finiteVerb: 'gelingt',
    translation: 'He succeeds with the experiment.',
    explanation: 'gelingen: das Gelingende ist Subjekt; die Person steht im Dativ (ihm) — nie *er gelingt.' },
  { id: 'es-kleid', verb: 'stehen', level: 'B1', kind: 'subject',
    sentence: 'Das Kleid steht dir wirklich gut.',
    options: ['das Kleid', 'dir'], answers: ['das Kleid'],
    subject: 'das Kleid', subjectNumber: 'sg', finiteVerb: 'steht',
    translation: 'The dress really suits you.',
    explanation: 'stehen (= gut kleiden): das Kleidungsstück ist Subjekt, die Person Dativ (dir).' },
  { id: 'es-filme', verb: 'gefallen', level: 'A2', kind: 'subject',
    sentence: 'Die alten Filme gefallen meinem Vater.',
    options: ['die alten Filme', 'meinem Vater'], answers: ['die alten Filme'],
    subject: 'die alten Filme', subjectNumber: 'pl', finiteVerb: 'gefallen',
    translation: 'My father likes the old films.',
    explanation: 'Plural-Subjekt (die alten Filme) → gefallen; meinem Vater bleibt Dativ.' },
  { id: 'es-kartoffeln', verb: 'schmecken', level: 'B1', kind: 'subject',
    sentence: 'Den Gästen schmecken die Kartoffeln.',
    options: ['die Kartoffeln', 'den Gästen'], answers: ['die Kartoffeln'],
    subject: 'die Kartoffeln', subjectNumber: 'pl', finiteVerb: 'schmecken',
    translation: 'The guests like the potatoes.',
    explanation: 'Das erste Wort ist NICHT automatisch Subjekt: den Gästen ist Dativ; Subjekt sind die Kartoffeln (→ schmecken).' },
  { id: 'es-unterschriften', verb: 'fehlen', level: 'B1', kind: 'subject',
    sentence: 'Mir fehlen noch zwei Unterschriften.',
    options: ['zwei Unterschriften', 'mir'], answers: ['zwei Unterschriften'],
    subject: 'zwei Unterschriften', subjectNumber: 'pl', finiteVerb: 'fehlen',
    translation: 'I am still missing two signatures.',
    explanation: 'fehlen richtet sich nach dem Fehlenden: zwei Unterschriften (Plural) → fehlen, nicht *fehlt.' },
  { id: 'es-handschuhe', verb: 'gehören', level: 'A2', kind: 'subject',
    sentence: 'Die Handschuhe gehören dem Trainer.',
    options: ['die Handschuhe', 'dem Trainer'], answers: ['die Handschuhe'],
    subject: 'die Handschuhe', subjectNumber: 'pl', finiteVerb: 'gehören',
    translation: 'The gloves belong to the coach.',
    explanation: 'gehören: die Sache ist Subjekt (die Handschuhe), der Besitzer Dativ (dem Trainer).' },
  { id: 'es-hosen', verb: 'passen', level: 'A2', kind: 'subject',
    sentence: 'Diese Hosen passen ihr nicht.',
    options: ['diese Hosen', 'ihr'], answers: ['diese Hosen'],
    subject: 'diese Hosen', subjectNumber: 'pl', finiteVerb: 'passen',
    translation: 'These trousers do not fit her.',
    explanation: 'passen: Plural-Subjekt (diese Hosen) → passen; ihr ist Dativ.' },

  // ── kind 'agreement': pick the verb form that agrees with the thing ──
  { id: 'ea-schuhe', verb: 'gefallen', level: 'A2', kind: 'agreement',
    sentence: 'Die Schuhe ___ mir.',
    options: ['gefällt', 'gefallen'], answers: ['gefallen'],
    subject: 'die Schuhe', subjectNumber: 'pl', finiteVerb: 'gefallen',
    translation: 'I like the shoes.',
    explanation: 'Subjekt ist die Schuhe (Plural) → gefallen. *Die Schuhe gefällt mir richtet das Verb fälschlich nach mir.' },
  { id: 'ea-lied', verb: 'gefallen', level: 'A2', kind: 'agreement',
    sentence: 'Das Lied ___ mir sehr.',
    options: ['gefällt', 'gefallen'], answers: ['gefällt'],
    subject: 'das Lied', subjectNumber: 'sg', finiteVerb: 'gefällt',
    translation: 'I like the song a lot.',
    explanation: 'Singular-Subjekt (das Lied) → gefällt; mir bleibt Dativ.' },
  { id: 'ea-nudeln', verb: 'schmecken', level: 'A2', kind: 'agreement',
    sentence: 'Die Nudeln ___ dem Kind.',
    options: ['schmeckt', 'schmecken'], answers: ['schmecken'],
    subject: 'die Nudeln', subjectNumber: 'pl', finiteVerb: 'schmecken',
    translation: 'The child likes the noodles.',
    explanation: 'Subjekt die Nudeln (Plural) → schmecken; dem Kind (Dativ) steuert das Verb nicht.' },
  { id: 'ea-worte', verb: 'fehlen', level: 'B1', kind: 'agreement',
    sentence: 'Mir ___ die Worte.',
    options: ['fehlt', 'fehlen'], answers: ['fehlen'],
    subject: 'die Worte', subjectNumber: 'pl', finiteVerb: 'fehlen',
    translation: 'I am at a loss for words.',
    explanation: 'Vorangestelltes mir ist Dativ; Subjekt sind die Worte (Plural) → fehlen.' },
  { id: 'ea-schal', verb: 'gehören', level: 'A2', kind: 'agreement',
    sentence: 'Der Schal ___ meiner Oma.',
    options: ['gehört', 'gehören'], answers: ['gehört'],
    subject: 'der Schal', subjectNumber: 'sg', finiteVerb: 'gehört',
    translation: 'The scarf belongs to my grandma.',
    explanation: 'Singular-Subjekt (der Schal) → gehört; meiner Oma ist Dativ.' },
  { id: 'ea-stiefel', verb: 'passen', level: 'A2', kind: 'agreement',
    sentence: 'Die Stiefel ___ dir nicht.',
    options: ['passt', 'passen'], answers: ['passen'],
    subject: 'die Stiefel', subjectNumber: 'pl', finiteVerb: 'passen',
    translation: 'The boots do not fit you.',
    explanation: 'Plural-Subjekt (die Stiefel) → passen; dir ist Dativ.' },
  { id: 'ea-ruecken', verb: 'wehtun', level: 'B1', kind: 'agreement',
    sentence: 'Mir ___ der Rücken weh.',
    options: ['tut', 'tun'], answers: ['tut'],
    subject: 'der Rücken', subjectNumber: 'sg', finiteVerb: 'tut weh',
    translation: 'My back hurts.',
    explanation: 'Subjekt der Rücken (Singular) → tut; mir ist Dativ, nicht Subjekt.' },
  { id: 'ea-worte-ein', verb: 'einfallen', level: 'B2', kind: 'agreement',
    sentence: 'Ihr ___ die richtigen Worte nicht ein.',
    options: ['fällt', 'fallen'], answers: ['fallen'],
    subject: 'die richtigen Worte', subjectNumber: 'pl', finiteVerb: 'fallen ein',
    translation: 'She cannot think of the right words.',
    explanation: 'Subjekt die richtigen Worte (Plural) → fallen … ein; ihr ist Dativ.' },
  { id: 'ea-plan', verb: 'gelingen', level: 'B1', kind: 'agreement',
    sentence: 'Dem Team ___ der Plan.',
    options: ['gelingt', 'gelingen'], answers: ['gelingt'],
    subject: 'der Plan', subjectNumber: 'sg', finiteVerb: 'gelingt',
    translation: 'The team succeeds with the plan.',
    explanation: 'dem Team ist Dativ; Subjekt ist der Plan (Singular) → gelingt.' },
  { id: 'ea-farben', verb: 'stehen', level: 'B1', kind: 'agreement',
    sentence: 'Die Farben ___ dir ausgezeichnet.',
    options: ['steht', 'stehen'], answers: ['stehen'],
    subject: 'die Farben', subjectNumber: 'pl', finiteVerb: 'stehen',
    translation: 'The colors suit you wonderfully.',
    explanation: 'stehen (= gut kleiden): Plural-Subjekt (die Farben) → stehen; dir ist Dativ.' },
]

export interface ExperiencerProductionItem {
  id: string
  verb: string
  level: DativeDrillLevel
  promptEn: string          // the English sentence to render in German
  cue: string               // building blocks shown to the learner, dictionary forms
  answers: string[]         // [0] canonical German (no final period), rest accepted variants
  subject: string
  subjectNumber: 'sg' | 'pl'
  finiteVerb: string        // VERBS.praesens[2] or [5]
  explanation: string
}

export const EXPERIENCER_PRODUCTION_ITEMS: ExperiencerProductionItem[] = [
  { id: 'ep-schuhe', verb: 'gefallen', level: 'A2',
    promptEn: 'I like the shoes.', cue: 'gefallen · die Schuhe · ich',
    answers: ['Die Schuhe gefallen mir', 'Mir gefallen die Schuhe'],
    subject: 'die Schuhe', subjectNumber: 'pl', finiteVerb: 'gefallen',
    explanation: 'Umgekehrt bauen: die Sache wird Subjekt (die Schuhe → gefallen), die Person Dativ (mir). *Ich gefalle die Schuhe ist der klassische Fehler.' },
  { id: 'ep-film', verb: 'gefallen', level: 'A2',
    promptEn: 'My sister likes the film.', cue: 'gefallen · der Film · meine Schwester',
    answers: ['Der Film gefällt meiner Schwester', 'Meiner Schwester gefällt der Film'],
    subject: 'der Film', subjectNumber: 'sg', finiteVerb: 'gefällt',
    explanation: 'Subjekt der Film (Singular) → gefällt; die Person wird Dativ: meiner Schwester.' },
  { id: 'ep-lehrer', verb: 'gefallen', level: 'B1',
    promptEn: 'The students like the new teacher.', cue: 'gefallen · der neue Lehrer · die Studenten',
    answers: ['Der neue Lehrer gefällt den Studenten', 'Den Studenten gefällt der neue Lehrer'],
    subject: 'der neue Lehrer', subjectNumber: 'sg', finiteVerb: 'gefällt',
    explanation: 'Die Gefallenden sind Dativ-Plural (den Studenten); Subjekt ist der neue Lehrer (Singular) → gefällt, nicht *gefallen.' },
  { id: 'ep-suppe', verb: 'schmecken', level: 'A2',
    promptEn: 'The child likes the soup.', cue: 'schmecken · die Suppe · das Kind',
    answers: ['Die Suppe schmeckt dem Kind', 'Dem Kind schmeckt die Suppe'],
    subject: 'die Suppe', subjectNumber: 'sg', finiteVerb: 'schmeckt',
    explanation: 'schmecken: das Essen ist Subjekt, der Genießer Dativ (dem Kind).' },
  { id: 'ep-kartoffeln', verb: 'schmecken', level: 'A2',
    promptEn: 'We like the potatoes.', cue: 'schmecken · die Kartoffeln · wir',
    answers: ['Die Kartoffeln schmecken uns', 'Uns schmecken die Kartoffeln'],
    subject: 'die Kartoffeln', subjectNumber: 'pl', finiteVerb: 'schmecken',
    explanation: 'Plural-Subjekt (die Kartoffeln) → schmecken; wir wird zum Dativ uns.' },
  { id: 'ep-pizza', verb: 'schmecken', level: 'B1',
    promptEn: 'The children like the pizza.', cue: 'schmecken · die Pizza · die Kinder',
    answers: ['Die Pizza schmeckt den Kindern', 'Den Kindern schmeckt die Pizza'],
    subject: 'die Pizza', subjectNumber: 'sg', finiteVerb: 'schmeckt',
    explanation: 'Singular-Subjekt (die Pizza) → schmeckt, obwohl die Dativ-Gruppe Plural ist (den Kindern) — genau hier bricht die Kongruenz sonst.' },
  { id: 'ep-bruder', verb: 'fehlen', level: 'B1',
    promptEn: 'I miss my brother.', cue: 'fehlen · mein Bruder · ich',
    answers: ['Mein Bruder fehlt mir', 'Mir fehlt mein Bruder'],
    subject: 'mein Bruder', subjectNumber: 'sg', finiteVerb: 'fehlt',
    explanation: 'Englisch I miss him dreht sich um: der Vermisste ist Subjekt, ich werde Dativ (mir).' },
  { id: 'ep-euro', verb: 'fehlen', level: 'B1',
    promptEn: 'You (du) are two euros short.', cue: 'fehlen · zwei Euro · du',
    answers: ['Dir fehlen zwei Euro', 'Zwei Euro fehlen dir'],
    subject: 'zwei Euro', subjectNumber: 'pl', finiteVerb: 'fehlen',
    explanation: 'Das Fehlende ist Subjekt (zwei Euro, Plural → fehlen); die Person steht im Dativ (dir).' },
  { id: 'ep-oma', verb: 'fehlen', level: 'B1',
    promptEn: 'We miss our grandma.', cue: 'fehlen · unsere Oma · wir',
    answers: ['Unsere Oma fehlt uns', 'Uns fehlt unsere Oma'],
    subject: 'unsere Oma', subjectNumber: 'sg', finiteVerb: 'fehlt',
    explanation: 'fehlen invertiert: unsere Oma ist Subjekt, wir werden Dativ (uns).' },
  { id: 'ep-auto', verb: 'gehören', level: 'A2',
    promptEn: 'The car belongs to my father.', cue: 'gehören · das Auto · mein Vater',
    answers: ['Das Auto gehört meinem Vater', 'Meinem Vater gehört das Auto'],
    subject: 'das Auto', subjectNumber: 'sg', finiteVerb: 'gehört',
    explanation: 'gehören: die Sache ist Subjekt, der Besitzer Dativ (meinem Vater).' },
  { id: 'ep-buecher', verb: 'gehören', level: 'A2',
    promptEn: 'The books belong to the teacher.', cue: 'gehören · die Bücher · der Lehrer',
    answers: ['Die Bücher gehören dem Lehrer', 'Dem Lehrer gehören die Bücher'],
    subject: 'die Bücher', subjectNumber: 'pl', finiteVerb: 'gehören',
    explanation: 'Plural-Subjekt (die Bücher) → gehören; der Besitzer steht im Dativ (dem Lehrer).' },
  { id: 'ep-hund', verb: 'gehören', level: 'B1',
    promptEn: 'The dog belongs to the boy.', cue: 'gehören · der Hund · der Junge',
    answers: ['Der Hund gehört dem Jungen', 'Dem Jungen gehört der Hund'],
    subject: 'der Hund', subjectNumber: 'sg', finiteVerb: 'gehört',
    explanation: 'der Junge ist ein n-Nomen: im Dativ dem Jungen. Subjekt bleibt der Hund.' },
  { id: 'ep-jacke', verb: 'passen', level: 'A2',
    promptEn: 'The jacket fits you (du).', cue: 'passen · die Jacke · du',
    answers: ['Die Jacke passt dir', 'Dir passt die Jacke'],
    subject: 'die Jacke', subjectNumber: 'sg', finiteVerb: 'passt',
    explanation: 'passen: das Kleidungsstück ist Subjekt, die Person Dativ (dir).' },
  { id: 'ep-schuhe-passen', verb: 'passen', level: 'A2',
    promptEn: 'The shoes do not fit me.', cue: 'passen · die Schuhe · ich · nicht',
    answers: ['Die Schuhe passen mir nicht', 'Mir passen die Schuhe nicht'],
    subject: 'die Schuhe', subjectNumber: 'pl', finiteVerb: 'passen',
    explanation: 'Plural-Subjekt (die Schuhe) → passen; ich wird Dativ (mir).' },
  { id: 'ep-kopf', verb: 'wehtun', level: 'B1',
    promptEn: 'My head hurts.', cue: 'wehtun · der Kopf · ich',
    answers: ['Der Kopf tut mir weh', 'Mir tut der Kopf weh'],
    subject: 'der Kopf', subjectNumber: 'sg', finiteVerb: 'tut weh',
    explanation: 'wehtun: der Körperteil ist Subjekt (der Kopf → tut … weh); die Person steht im Dativ (mir), nicht als Possessiv wie im Englischen.' },
  { id: 'ep-fuesse', verb: 'wehtun', level: 'B1',
    promptEn: 'My feet hurt.', cue: 'wehtun · die Füße · ich',
    answers: ['Die Füße tun mir weh', 'Mir tun die Füße weh'],
    subject: 'die Füße', subjectNumber: 'pl', finiteVerb: 'tun weh',
    explanation: 'Plural-Subjekt (die Füße) → tun … weh; mir bleibt Dativ.' },
  { id: 'ep-loesung', verb: 'einfallen', level: 'B2',
    promptEn: 'I cannot think of a solution.', cue: 'einfallen · keine Lösung · ich',
    answers: ['Mir fällt keine Lösung ein', 'Keine Lösung fällt mir ein'],
    subject: 'keine Lösung', subjectNumber: 'sg', finiteVerb: 'fällt ein',
    explanation: 'einfallen invertiert das englische I think of: der Einfall ist Subjekt, die Person Dativ (mir).' },
  { id: 'ep-beispiel', verb: 'einfallen', level: 'B2',
    promptEn: 'A good example occurs to him.', cue: 'einfallen · ein gutes Beispiel · er',
    answers: ['Ihm fällt ein gutes Beispiel ein', 'Ein gutes Beispiel fällt ihm ein'],
    subject: 'ein gutes Beispiel', subjectNumber: 'sg', finiteVerb: 'fällt ein',
    explanation: 'Subjekt ist ein gutes Beispiel; die Person steht im Dativ (ihm).' },
  { id: 'ep-kuchen', verb: 'gelingen', level: 'B1',
    promptEn: 'My cake is turning out well.', cue: 'gelingen · der Kuchen · ich',
    answers: ['Der Kuchen gelingt mir', 'Mir gelingt der Kuchen'],
    subject: 'der Kuchen', subjectNumber: 'sg', finiteVerb: 'gelingt',
    explanation: 'gelingen: das Werk ist Subjekt, die Person Dativ (mir) — nie *ich gelinge.' },
  { id: 'ep-fotos', verb: 'gelingen', level: 'B2',
    promptEn: 'Her photos are turning out well.', cue: 'gelingen · die Fotos · sie (Singular)',
    answers: ['Die Fotos gelingen ihr', 'Ihr gelingen die Fotos'],
    subject: 'die Fotos', subjectNumber: 'pl', finiteVerb: 'gelingen',
    explanation: 'Plural-Subjekt (die Fotos) → gelingen; sie wird Dativ (ihr).' },
  { id: 'ep-kleid', verb: 'stehen', level: 'B1',
    promptEn: 'The dress suits you (du) well.', cue: 'stehen · das Kleid · du · gut',
    answers: ['Das Kleid steht dir gut', 'Dir steht das Kleid gut'],
    subject: 'das Kleid', subjectNumber: 'sg', finiteVerb: 'steht',
    explanation: 'stehen (= gut kleiden) nimmt die Person im Dativ (dir); Subjekt ist das Kleid.' },
  { id: 'ep-farben', verb: 'stehen', level: 'B1',
    promptEn: 'These colors suit my mother.', cue: 'stehen · diese Farben · meine Mutter',
    answers: ['Diese Farben stehen meiner Mutter', 'Meiner Mutter stehen diese Farben'],
    subject: 'diese Farben', subjectNumber: 'pl', finiteVerb: 'stehen',
    explanation: 'Plural-Subjekt (diese Farben) → stehen; die Person wird Dativ (meiner Mutter).' },
]
```

- [ ] **Step 4: GREEN.** `npx vitest run tests/data/dativeExperiencer.test.ts` → PASS. If the EXPERIENCER GATE or cross-ref fails, the failure message names the offending ids and the expected finite form — fix the item (or, for `stehen`/`wehtun`/`einfallen`, verify phase 1 actually added/re-tagged them in `verbs.ts`; if a verb is genuinely missing there, STOP and report — that is a phase-1 gap, not something this task patches).
- [ ] **Step 5: Typecheck.** `npm run typecheck` → PASS.
- [ ] **Step 6: Commit** `feat(dative): family IV item banks (T4/T5) with experiencer agreement gate`

---
### Task 3: T4 drill — Wer ist Subjekt? (`dat-subject`)

**Files:**
- Modify: `src/composables/useDativeDrill.ts` (append builder + filter), `src/router.ts` (2 routes), `src/data/drillCatalogue.ts` (family IV)
- Create: `src/modules/dative/SubjectSetup.vue`, `src/modules/dative/SubjectRunner.vue`
- Test: `tests/modules/dative/SubjectRunner.test.ts`

**Interfaces:**
- Consumes: `EXPERIENCER_SUBJECT_ITEMS`, `DATIVE_DRILL_LEVELS`, `type DativeDrillLevel`, `type ExperiencerSubjectItem` (Task 2); `useDativeQuiz`, `DativeQuizCard` (Task 1); `bumpDativeLedger` (phase 2); `shuffle` (src/data/pool.ts); `saveQuizRun`; `csv` (src/composables/quizQuery.ts); `RetryModal`, `useBreakpoint`.
- Produces: routes `dative-subject` / `dative-subject-run`; records type `'dat-subject'`; `buildSubjectCards(items: ExperiencerSubjectItem[]): DativeQuizCard[]` and `filterSubjectItems(f: { levels: DativeDrillLevel[]; kinds: string[] }): ExperiencerSubjectItem[]` in `useDativeDrill.ts`.

- [ ] **Step 1: Failing runner test.** Create `tests/modules/dative/SubjectRunner.test.ts` (mirror the mechanics of `tests/modules/direction-words/HinHerRunner.test.ts` — memory router, pinned `Math.random`, mocked `saveQuizRun`; additionally mock the ledger):

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SubjectRunner from '../../../src/modules/dative/SubjectRunner.vue'
import { EXPERIENCER_SUBJECT_ITEMS } from '../../../src/data/dativeExperiencer'

vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))
vi.mock('../../../src/composables/useQuizHistory', () => ({ saveQuizRun: vi.fn() }))
vi.mock('../../../src/composables/useDativeLedger', () => ({ bumpDativeLedger: vi.fn() }))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'
import { bumpDativeLedger } from '../../../src/composables/useDativeLedger'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dative/subject/run', name: 'dative-subject-run', component: { template: '<div />' } },
      { path: '/dative/subject', name: 'dative-subject', component: { template: '<div />' } },
      { path: '/dative', name: 'dative', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string>) {
  const router = makeRouter()
  await router.push({ name: 'dative-subject-run', query })
  const wrapper = mount(SubjectRunner, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

const QUERY = { count: '1', levels: 'A2,B1,B2,C1', kinds: 'subject,agreement' }
// Math.random pinned to 0 → identity-preserving shuffle → the sampled item is
// the bank's first entry under these filters.
const FIRST = EXPERIENCER_SUBJECT_ITEMS[0]
const WRONG = FIRST.options.find(o => !FIRST.answers.includes(o))!

describe('SubjectRunner', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.mocked(saveQuizRun).mockClear()
    vi.mocked(bumpDativeLedger).mockClear()
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => { randomSpy.mockRestore() })

  async function completeOneCardWrong(wrapper: VueWrapper) {
    const btn = wrapper.findAll('.choice').find(b => b.find('.c-label').text() === WRONG)!
    await btn.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))!
    await finish.trigger('click')
  }

  it('renders the prompt and at least two choice buttons', async () => {
    const { wrapper } = await mountRunner(QUERY)
    expect(wrapper.findAll('.choice').length).toBeGreaterThanOrEqual(2)
    wrapper.unmount()
  })

  it('wrong pick reveals feedback with the correct answer and the explanation', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const btn = wrapper.findAll('.choice').find(b => b.find('.c-label').text() === WRONG)!
    await btn.trigger('click')
    expect(wrapper.find('.drill-feedback').exists()).toBe(true)
    expect(wrapper.text()).toContain(FIRST.answers[0])
    expect(wrapper.text()).toContain(FIRST.explanation)
    wrapper.unmount()
  })

  it('records one dat-subject Run and bumps the ledger once, keyed by the verb', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({ type: 'dat-subject', count: 1 }))
    expect(bumpDativeLedger).toHaveBeenCalledTimes(1)
    expect(bumpDativeLedger).toHaveBeenCalledWith(FIRST.verb, false, expect.any(Number))
    wrapper.unmount()
  })

  it('does not record or re-bump the retry round (ADR-0010)', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    const retry = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))!
    await retry.trigger('click')
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(bumpDativeLedger).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
```

- [ ] **Step 2: RED.** `npx vitest run tests/modules/dative/SubjectRunner.test.ts` — unresolvable component.

- [ ] **Step 3: Builder + filter.** Append to `src/composables/useDativeDrill.ts` (add the import `import { EXPERIENCER_SUBJECT_ITEMS, type ExperiencerSubjectItem, type DativeDrillLevel } from '../data/dativeExperiencer'`):

```ts
export function buildSubjectCards(items: ExperiencerSubjectItem[]): DativeQuizCard[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.kind === 'subject' ? `${item.sentence} — Was ist das Subjekt?` : item.sentence,
    answers: item.answers,
    options: item.options,
    translation: item.translation,
    note: item.explanation,
    ledgerKey: item.verb,
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function filterSubjectItems(f: { levels: DativeDrillLevel[]; kinds: string[] }): ExperiencerSubjectItem[] {
  return EXPERIENCER_SUBJECT_ITEMS.filter(i => f.levels.includes(i.level) && f.kinds.includes(i.kind))
}
```

- [ ] **Step 4: Setup.** Create `src/modules/dative/SubjectSetup.vue` — mirror `src/modules/direction-words/CompoundSetup.vue` structurally (read it first; keep its `load`/`save`/`toggle`/preset skeleton verbatim), with these exact deltas:
  - Imports: `filterSubjectItems` from `../../composables/useDativeDrill`; `DATIVE_DRILL_LEVELS, type DativeDrillLevel` from `../../data/dativeExperiencer`. No pairs, no mode.
  - `const STORAGE_KEY = 'datSubjectSetup'`. State: `levels = ref<DativeDrillLevel[]>(['A2', 'B1'])`, `kinds = ref<string[]>(['subject', 'agreement'])`, `preset` (10/15/20/'all').
  - Kind chips (labels): `subject` → `Subjekt finden`, `agreement` → `Verbform wählen` (chip row titled `Aufgabe · {{ kinds.length }} of 2`).
  - `availableItems = computed(() => filterSubjectItems({ levels: levels.value, kinds: kinds.value }).length)`; warning alert + disabled start when 0 (copy the CompoundSetup block).
  - Header: breadcrumb `Kapitel XIII · Dativ · Wer ist Subjekt?`, title `Wer ist Subjekt?<em>.</em>`, subtitle: `Die Schuhe gefallen mir — the thing is the subject and controls the verb; the person is dative. This drill exists to kill *Ich gefalle das Buch and *Die Schuhe gefällt mir.`
  - `start()` → `router.push({ name: 'dative-subject-run', query: { count: String(effectiveCount.value), levels: levels.value.join(','), kinds: kinds.value.join(',') } })`. Back button → `router.push({ name: 'dative' })`.

- [ ] **Step 5: Runner.** Create `src/modules/dative/SubjectRunner.vue` — mirror `src/modules/direction-words/CompoundRunner.vue` chrome (loading/error/summary/RetryModal/pips/keyboard/focus/`watch(finished)`), minus SceneDiagram and minus type-mode. Exact deltas:
  - Mount: `const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)`; `const levels = csv<DativeDrillLevel>(route.query.levels, DATIVE_DRILL_LEVELS)`; `const kinds = csv<string>(route.query.kinds, ['subject', 'agreement'] as const)`; `items.value = shuffle(filterSubjectItems({ levels, kinds }), count)`; `quiz.value = useDativeQuiz(buildSubjectCards(items.value))`.
  - Quiz meta line: `Karte {{ questionIndex + 1 }} · von {{ total }}`; End-drill button → `dative-subject`.
  - Choice buttons from `current.options` (2, keyboard 1–2, `.choice`/`.c-key`/`.c-label` classes as in CompoundRunner).
  - Feedback: `✓ Richtig — <answers[0]>` / `✗ Korrekt: <answers[0]>`; when the prompt contains `___`, also show the filled sentence (`current.prompt.replace('___', current.answers[0])`); always show `current.translation` (italic) and `current.note` (the explanation).
  - `recordRun()` — replace CompoundRunner's body with (this is the ledger-coupled variant every memorization runner in this plan uses):

```ts
import { bumpDativeLedger } from '../../composables/useDativeLedger'

function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  // Item ledger: one encounter per graded card, keyed by the drilled verb —
  // main round only; retries are practice (ADR-0010) and never re-bump.
  for (const q of quiz.value.questions.value) {
    if (q.ledgerKey && q.isCorrect !== null) bumpDativeLedger(q.ledgerKey, q.isCorrect, finishedAt)
  }
  saveQuizRun({
    type: 'dat-subject',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: { levels: queriedLevels.value, kinds: queriedKinds.value },
  })
}
```

  - Retry: `retryWrong()` rebuilds via `buildSubjectCards` from `wrongIndexes.map(i => items.value[i])` shuffled (mirror CompoundRunner). `RetryModal` `item-label="cards"`. Summary rows: prompt (gap filled where present, answer bolded), picked vs correct, ✓/✗ tag.

- [ ] **Step 6: Routes.** In `src/router.ts`, after the phase-2 `dative-*` block:

```ts
{ path: '/dative/subject', name: 'dative-subject', component: () => import('./modules/dative/SubjectSetup.vue') },
{ path: '/dative/subject/run', name: 'dative-subject-run', component: () => import('./modules/dative/SubjectRunner.vue') },
```

- [ ] **Step 7: Catalogue.** In `src/data/drillCatalogue.ts`, append to `DAT_FAMILIES` after the family with numeral `'III'` (if phase 2 scaffolded a family with id `'inverted'`, replace it wholesale with this object):

```ts
{
  id: 'inverted', numeral: 'IV', heading: 'Inverted experiencers', de: 'Umgekehrte Verben',
  blurb: 'The thing is the subject; the person is dative. Agreement follows the thing.',
  cards: [
    {
      code: 'T4', route: 'dative-subject',
      title: 'Who is the subject?', de: 'Wer ist Subjekt?', level: 'B1',
      desc: 'Die Schuhe gefallen mir — find the nominative subject and make the verb agree with it, not with the dative.',
    },
  ],
},
```

- [ ] **Step 8: GREEN.** `npx vitest run tests/modules/dative/SubjectRunner.test.ts tests/data/drillCatalogue.test.ts` → PASS; `npm run typecheck` → PASS.
- [ ] **Step 9: Commit** `feat(dative): T4 Wer ist Subjekt? drill (family IV)`

---

### Task 4: T5 drill — Produktion (`dat-experiencer`)

**Files:**
- Modify: `src/composables/useDativeDrill.ts` (builder + filter), `src/router.ts` (2 routes), `src/data/drillCatalogue.ts` (T5 card into family IV)
- Create: `src/modules/dative/ExperiencerSetup.vue`, `src/modules/dative/ExperiencerRunner.vue`
- Test: `tests/modules/dative/ExperiencerRunner.test.ts`

**Interfaces:**
- Consumes: `EXPERIENCER_PRODUCTION_ITEMS`, `EXPERIENCER_VERBS`, `DATIVE_DRILL_LEVELS` (Task 2); `useDativeQuiz`, `DativeQuizCard` (Task 1); `bumpDativeLedger`; `shuffle`; `saveQuizRun`; `csv`.
- Produces: routes `dative-experiencer` / `dative-experiencer-run`; records type `'dat-experiencer'`; `buildProductionCards(items: ExperiencerProductionItem[]): DativeQuizCard[]`, `filterProductionItems(f: { levels: DativeDrillLevel[]; verbs: string[] }): ExperiencerProductionItem[]`.

- [ ] **Step 1: Failing runner test.** Create `tests/modules/dative/ExperiencerRunner.test.ts` — same skeleton as Task 3's test (same mocks, router names `dative-experiencer-run`/`dative-experiencer`/`dative`), with these deltas:
  - `QUERY = { count: '1', levels: 'A2,B1,B2,C1', verbs: EXPERIENCER_VERBS.join(',') }` (import `EXPERIENCER_VERBS`, `EXPERIENCER_PRODUCTION_ITEMS` from `../../../src/data/dativeExperiencer`); `FIRST = EXPERIENCER_PRODUCTION_ITEMS[0]`.
  - Type mode instead of pick: find `input.type-input`, `setValue('falsch')`, `trigger('keyup.enter')` → expect feedback shows `FIRST.answers[0]`; then Finish → `saveQuizRun` once with `objectContaining({ type: 'dat-experiencer', count: 1 })` and `bumpDativeLedger` once with `(FIRST.verb, false, expect.any(Number))`.
  - A correct-answer case: `setValue(FIRST.answers[1].toLowerCase() + '.')` (fronted variant, lowercased, trailing period) → feedback contains `Richtig` — proving alternatives + punctuation-strip + case-folding.
  - Retry-not-recorded case as in Task 3.

- [ ] **Step 2: RED.** Run it — fails.

- [ ] **Step 3: Builder + filter.** Append to `src/composables/useDativeDrill.ts` (extend the existing dativeExperiencer import with `EXPERIENCER_PRODUCTION_ITEMS, type ExperiencerProductionItem`):

```ts
export function buildProductionCards(items: ExperiencerProductionItem[]): DativeQuizCard[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.promptEn,
    answers: item.answers,
    options: [],
    translation: `Bausteine: ${item.cue}`,
    note: item.explanation,
    ledgerKey: item.verb,
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function filterProductionItems(f: { levels: DativeDrillLevel[]; verbs: string[] }): ExperiencerProductionItem[] {
  return EXPERIENCER_PRODUCTION_ITEMS.filter(i => f.levels.includes(i.level) && f.verbs.includes(i.verb))
}
```

- [ ] **Step 4: Setup.** `src/modules/dative/ExperiencerSetup.vue` — mirror CompoundSetup with: `STORAGE_KEY = 'datExperiencerSetup'`; Level chips (default `['A2', 'B1']`); **Verb chips** — one per `EXPERIENCER_VERBS` entry, label = the infinitive, default all, All/None buttons; count presets; `availableItems` from `filterProductionItems`. Breadcrumb `Kapitel XIII · Dativ · Produktion`; title `Produktion<em>.</em>`; subtitle: `Read the English, build the German experiencer clause yourself — the thing becomes the subject, the person turns dative. Both orders count: Die Schuhe gefallen mir and Mir gefallen die Schuhe.` `start()` query `{ count, levels, verbs: verbs.join(',') }` → `dative-experiencer-run`.

- [ ] **Step 5: Runner.** `src/modules/dative/ExperiencerRunner.vue` — mirror CompoundRunner in TYPE mode only (no options row, no SceneDiagram; keep the `type-row` input + submit flow, Enter submits/advances). Deltas:
  - Mount: parse `count`, `levels` (csv against `DATIVE_DRILL_LEVELS`), `verbs` (csv against `EXPERIENCER_VERBS`); sample via `shuffle(filterProductionItems({ levels, verbs }), count)`; `useDativeQuiz(buildProductionCards(items))`.
  - Card: the English prompt sentence large (`drill-sentence`), beneath it the cue line `{{ current.translation }}` in `micro-mark` styling — the Bausteine are visible BEFORE answering (they name the verb + dictionary forms; producing the inversion and the dative is the drill). Input placeholder `Deutscher Satz…`.
  - Feedback: `✓ Richtig — <answers[0]>` / `✗ Korrekt: <answers[0]>`; when `answers[1]` exists add the line `Auch richtig: {{ current.answers[1] }}`; always show `current.note`.
  - `recordRun()`: identical shape to Task 3's block, with `type: 'dat-experiencer'` and `meta: { levels: queriedLevels.value, verbs: queriedVerbs.value }`. Ledger loop stays (ledgerKey = verb).
  - Retry via `buildProductionCards`; `item-label="sentences"`.

- [ ] **Step 6: Routes + catalogue.** Routes after the Task-3 pair:

```ts
{ path: '/dative/experiencer', name: 'dative-experiencer', component: () => import('./modules/dative/ExperiencerSetup.vue') },
{ path: '/dative/experiencer/run', name: 'dative-experiencer-run', component: () => import('./modules/dative/ExperiencerRunner.vue') },
```

In `drillCatalogue.ts`, append to the `id: 'inverted'` family's `cards` array (after T4):

```ts
{
  code: 'T5', route: 'dative-experiencer',
  title: 'Production', de: 'Produktion', level: 'B1',
  desc: 'Type the full experiencer clause: gefallen, schmecken, fehlen, gehören, passen, wehtun, einfallen, gelingen, stehen.',
},
```

- [ ] **Step 7: GREEN + typecheck.** `npx vitest run tests/modules/dative/ExperiencerRunner.test.ts tests/data/drillCatalogue.test.ts` → PASS; `npm run typecheck` → PASS.
- [ ] **Step 8: Commit** `feat(dative): T5 Produktion drill (family IV complete)`

---
### Task 5: Item bank for T6 — `dativeTwins.ts` + twin gate

**Files:**
- Create: `src/data/dativeTwins.ts`
- Test: `tests/data/dativeTwins.test.ts`

**Interfaces:**
- Consumes: `VERBS` (cross-ref), `DativeDrillLevel` from `src/data/dativeExperiencer.ts`.
- Produces (Task 6 + phase 4 cheatsheet rely on): `interface TwinPair { pairId: string; dativeVerb: string; twin: string; twinParticle?: string; contrast: string }`, `TWIN_PAIRS` (8), `interface TwinItem`, `TWIN_ITEMS` (24).

- [ ] **Step 1: Invariant tests FIRST.** Create `tests/data/dativeTwins.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { TWIN_PAIRS, TWIN_ITEMS } from '../../src/data/dativeTwins'
import { DATIVE_DRILL_LEVELS } from '../../src/data/dativeExperiencer'
import { VERBS } from '../../src/data/verbs'

const byGerman = new Map(VERBS.map(v => [v.german, v]))

function containsWord(text: string, word: string): boolean {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-zäöüß])${esc}($|[^a-zäöüß])`, 'i').test(text)
}

describe('TWIN_PAIRS', () => {
  test('TWIN GATE: dative member is dative (or varies for glauben); twin exists and is NOT dative', () => {
    const bad = TWIN_PAIRS.filter(p => {
      const d = byGerman.get(p.dativeVerb)
      const t = byGerman.get(p.twin)
      if (!d || !t) return true
      if (!['dative', 'varies'].includes(d.case)) return true
      // same-verb case splits (glauben Dat/Akk) and particle twins (gehören zu)
      // are exempt from the not-dative check — the contrast is real either way.
      if (p.twin === p.dativeVerb || p.twinParticle) return false
      return t.case === 'dative'
    })
    expect(bad.map(p => p.pairId)).toEqual([])
  })

  test('pairIds unique; contrast lines non-empty', () => {
    expect(new Set(TWIN_PAIRS.map(p => p.pairId)).size).toBe(TWIN_PAIRS.length)
    expect(TWIN_PAIRS.filter(p => p.contrast.trim().length === 0)).toEqual([])
  })
})

describe('TWIN_ITEMS (T6)', () => {
  test('base invariants: unique ids, known level, exactly one gap, pairId known', () => {
    expect(new Set(TWIN_ITEMS.map(i => i.id)).size).toBe(TWIN_ITEMS.length)
    const pairIds = new Set(TWIN_PAIRS.map(p => p.pairId))
    const bad = TWIN_ITEMS.filter(i =>
      !(DATIVE_DRILL_LEVELS as readonly string[]).includes(i.level)
      || (i.prompt.match(/___/g) ?? []).length !== 1
      || !pairIds.has(i.pairId)
      || i.translation.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('options: exactly 2, unique, exactly one is the answer', () => {
    const bad = TWIN_ITEMS.filter(i =>
      i.options.length !== 2
      || new Set(i.options).size !== 2
      || i.answers.length !== 1
      || i.options.filter(o => i.answers.includes(o)).length !== 1)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('no answer leak: the prompt never contains the answer as a standalone word', () => {
    const bad = TWIN_ITEMS.filter(i => containsWord(i.prompt, i.answers[0]))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥20 total; every pair ≥2 items; both kinds present', () => {
    expect(TWIN_ITEMS.length).toBeGreaterThanOrEqual(20)
    for (const p of TWIN_PAIRS) {
      expect(TWIN_ITEMS.filter(i => i.pairId === p.pairId).length, `pair ${p.pairId}`).toBeGreaterThanOrEqual(2)
    }
    expect(TWIN_ITEMS.some(i => i.kind === 'verb-choice')).toBe(true)
    expect(TWIN_ITEMS.some(i => i.kind === 'object-choice')).toBe(true)
  })
})
```

- [ ] **Step 2: RED.** `npx vitest run tests/data/dativeTwins.test.ts`.

- [ ] **Step 3: Author the data.** Create `src/data/dativeTwins.ts` EXACTLY:

```ts
// Dativ module — family V (Zwillinge): near-synonym pairs on opposite sides of
// the case line. TWIN GATE (tests/data/dativeTwins.test.ts): the dative member
// carries case 'dative' (or 'varies' for glauben) in VERBS; the twin exists in
// VERBS and is NOT dative — an invented contrast cannot ship. gehören zu is a
// particle twin (same verb + zu); glauben is its own twin (person Dat / thing Akk).

import type { DativeDrillLevel } from './dativeExperiencer'

export interface TwinPair {
  pairId: string
  dativeVerb: string      // VERBS.german, case 'dative' (or 'varies': glauben)
  twin: string            // VERBS.german, the non-dative member
  twinParticle?: string   // 'zu' for gehören zu
  contrast: string        // one-line meaning/case contrast (cheatsheet table row)
}

export const TWIN_PAIRS: TwinPair[] = [
  { pairId: 'antworten-beantworten', dativeVerb: 'antworten', twin: 'beantworten',
    contrast: 'antworten + Dat (der Person antworten) · beantworten + Akk (die Frage beantworten)' },
  { pairId: 'folgen-verfolgen', dativeVerb: 'folgen', twin: 'verfolgen',
    contrast: 'folgen + Dat (hinterhergehen) · verfolgen + Akk (jagen, verfolgen)' },
  { pairId: 'zuhoeren-hoeren', dativeVerb: 'zuhören', twin: 'hören',
    contrast: 'zuhören + Dat (aufmerksam lauschen) · hören + Akk (bloß wahrnehmen)' },
  { pairId: 'glauben-dat-akk', dativeVerb: 'glauben', twin: 'glauben',
    contrast: 'glauben + Dat für Personen (ich glaube dir) · + Akk für Sachen (ich glaube die Geschichte nicht)' },
  { pairId: 'gehoeren-gehoeren-zu', dativeVerb: 'gehören', twin: 'gehören', twinParticle: 'zu',
    contrast: 'gehören + Dat = Besitz (das Rad gehört mir) · gehören zu = Zugehörigkeit (Belgien gehört zur EU)' },
  { pairId: 'helfen-unterstuetzen', dativeVerb: 'helfen', twin: 'unterstützen',
    contrast: 'helfen + Dat · unterstützen + Akk — gleiche Idee, andere Seite der Kasusgrenze' },
  { pairId: 'begegnen-treffen', dativeVerb: 'begegnen', twin: 'treffen',
    contrast: 'begegnen + Dat, Perfekt mit sein (zufällig) · treffen + Akk, mit haben (auch verabredet)' },
  { pairId: 'raten-beraten', dativeVerb: 'raten', twin: 'beraten',
    contrast: 'raten + Dat (jemandem einen Rat geben) · beraten + Akk (jemanden fachlich beraten)' },
]

export interface TwinItem {
  id: string
  pairId: string
  level: DativeDrillLevel
  kind: 'verb-choice' | 'object-choice'
  prompt: string          // one ___ gap
  options: string[]       // exactly 2
  answers: string[]       // exactly 1
  translation: string
  explanation: string
}

export const TWIN_ITEMS: TwinItem[] = [
  // antworten | beantworten
  { id: 'tw-antworte-lehrer', pairId: 'antworten-beantworten', level: 'B1', kind: 'verb-choice',
    prompt: 'Ich ___ dem Lehrer sofort.', options: ['antworte', 'beantworte'], answers: ['antworte'],
    translation: 'I answer the teacher right away.',
    explanation: 'dem Lehrer ist Dativ → antworten (= [eine Antwort] geben + Dat). beantworten nimmt die Sache im Akkusativ.' },
  { id: 'tw-beantworte-mail', pairId: 'antworten-beantworten', level: 'B1', kind: 'verb-choice',
    prompt: 'Ich ___ die E-Mail heute Abend.', options: ['beantworte', 'antworte'], answers: ['beantworte'],
    translation: 'I will answer the email tonight.',
    explanation: 'die E-Mail ist Akkusativ-Sache → beantworten. antworten ginge nur mit Dativ-Person (oder auf + Akk).' },
  { id: 'tw-frage-akk', pairId: 'antworten-beantworten', level: 'B1', kind: 'object-choice',
    prompt: 'Sie beantwortet ___ Frage ruhig.', options: ['die', 'der'], answers: ['die'],
    translation: 'She answers the question calmly.',
    explanation: 'beantworten regiert den Akkusativ: die Frage. der Frage wäre der Dativ des Zwillings antworten.' },

  // folgen | verfolgen
  { id: 'tw-hund-folgt', pairId: 'folgen-verfolgen', level: 'B1', kind: 'verb-choice',
    prompt: 'Der Hund ___ dem Kind bis zur Schule.', options: ['folgt', 'verfolgt'], answers: ['folgt'],
    translation: 'The dog follows the child all the way to school.',
    explanation: 'dem Kind ist Dativ → folgen. verfolgen (+ Akk) hieße jagen.' },
  { id: 'tw-polizei-verfolgt', pairId: 'folgen-verfolgen', level: 'B1', kind: 'verb-choice',
    prompt: 'Die Polizei ___ den Dieb durch die Stadt.', options: ['verfolgt', 'folgt'], answers: ['verfolgt'],
    translation: 'The police pursue the thief through the city.',
    explanation: 'den Dieb ist Akkusativ → verfolgen (jagen). folgen bräuchte den Dativ: dem Dieb.' },
  { id: 'tw-reiseleiterin', pairId: 'folgen-verfolgen', level: 'B1', kind: 'object-choice',
    prompt: 'Wir folgen ___ Reiseleiterin.', options: ['der', 'die'], answers: ['der'],
    translation: 'We follow the tour guide.',
    explanation: 'folgen regiert den Dativ: der Reiseleiterin. die Reiseleiterin (Akk) gehört zu verfolgen.' },

  // zuhören | hören
  { id: 'tw-lehrerin-zu', pairId: 'zuhoeren-hoeren', level: 'B1', kind: 'object-choice',
    prompt: 'Die Schüler hören ___ aufmerksam zu.', options: ['der Lehrerin', 'die Lehrerin'], answers: ['der Lehrerin'],
    translation: 'The pupils listen attentively to the teacher.',
    explanation: 'zuhören (aufmerksames Lauschen) regiert den Dativ: der Lehrerin. die Lehrerin hören hieße nur: ihre Stimme wahrnehmen.' },
  { id: 'tw-musik-akk', pairId: 'zuhoeren-hoeren', level: 'B1', kind: 'object-choice',
    prompt: 'Ich höre ___ am liebsten im Zug.', options: ['Musik', 'der Musik'], answers: ['Musik'],
    translation: 'I like listening to music best on the train.',
    explanation: 'hören nimmt den bloßen Akkusativ: Musik hören. der Musik zuhören ginge — aber dann mit zuhören.' },
  { id: 'tw-kurz-zuhoeren', pairId: 'zuhoeren-hoeren', level: 'B1', kind: 'verb-choice',
    prompt: 'Kannst du mir bitte kurz ___?', options: ['zuhören', 'hören'], answers: ['zuhören'],
    translation: 'Can you please listen to me for a moment?',
    explanation: 'mir ist Dativ → zuhören. *mir hören ist unmöglich; hören nähme mich (Akk) und hieße etwas anderes.' },

  // glauben +Dat | +Akk
  { id: 'tw-glaube-mann', pairId: 'glauben-dat-akk', level: 'B2', kind: 'object-choice',
    prompt: 'Ich glaube ___ nicht.', options: ['dem Mann', 'den Mann'], answers: ['dem Mann'],
    translation: 'I do not believe the man.',
    explanation: 'Personen, denen man glaubt, stehen im Dativ: dem Mann. den Mann glauben gibt es nicht.' },
  { id: 'tw-glaube-geschichte', pairId: 'glauben-dat-akk', level: 'B2', kind: 'object-choice',
    prompt: 'Ich glaube ___ Geschichte nicht.', options: ['die', 'der'], answers: ['die'],
    translation: 'I do not believe the story.',
    explanation: 'Sachen, die man glaubt, stehen im Akkusativ: die Geschichte. Der Dativ ist für die Person reserviert.' },
  { id: 'tw-glaubst-du', pairId: 'glauben-dat-akk', level: 'B2', kind: 'object-choice',
    prompt: 'Glaubst du ___ etwa nicht?', options: ['mir', 'mich'], answers: ['mir'],
    translation: 'Do you not believe me?',
    explanation: 'Ich bin eine Person → Dativ mir. *Glaubst du mich ist der englische Sog (believe me).' },

  // gehören +Dat | gehören zu
  { id: 'tw-fahrrad', pairId: 'gehoeren-gehoeren-zu', level: 'B2', kind: 'object-choice',
    prompt: 'Das Fahrrad gehört ___ Schwester.', options: ['meiner', 'zu meiner'], answers: ['meiner'],
    translation: 'The bicycle belongs to my sister.',
    explanation: 'Besitz = gehören + bloßer Dativ: meiner Schwester. gehören zu hieße Teil-von-etwas-Sein.' },
  { id: 'tw-belgien', pairId: 'gehoeren-gehoeren-zu', level: 'B2', kind: 'object-choice',
    prompt: 'Belgien gehört ___ Europäischen Union.', options: ['zur', 'der'], answers: ['zur'],
    translation: 'Belgium is part of the European Union.',
    explanation: 'Zugehörigkeit (Mitglied sein) = gehören zu. Belgien gehört der EU hieße: die EU besitzt Belgien.' },
  { id: 'tw-schluessel', pairId: 'gehoeren-gehoeren-zu', level: 'B2', kind: 'object-choice',
    prompt: 'Dieser Schlüssel gehört ___ Hausmeister.', options: ['dem', 'zum'], answers: ['dem'],
    translation: 'This key belongs to the caretaker.',
    explanation: 'Der Hausmeister BESITZT den Schlüssel → bloßer Dativ. zum Hausmeister gehören würde ihn zum Inventar erklären.' },

  // helfen | unterstützen
  { id: 'tw-umzug', pairId: 'helfen-unterstuetzen', level: 'B1', kind: 'object-choice',
    prompt: 'Kannst du ___ beim Umzug helfen?', options: ['mir', 'mich'], answers: ['mir'],
    translation: 'Can you help me with the move?',
    explanation: 'helfen + Dat: mir. *mich helfen ist der englische Sog (help me) — der Akkusativ gehört zu unterstützen.' },
  { id: 'tw-verein', pairId: 'helfen-unterstuetzen', level: 'B2', kind: 'object-choice',
    prompt: 'Der Verein unterstützt ___ mit Geld.', options: ['junge Familien', 'jungen Familien'], answers: ['junge Familien'],
    translation: 'The club supports young families financially.',
    explanation: 'unterstützen + Akk: junge Familien. jungen Familien (Dativ) gehört zum Zwilling helfen.' },
  { id: 'tw-nachbarin', pairId: 'helfen-unterstuetzen', level: 'B1', kind: 'verb-choice',
    prompt: 'Ich ___ meiner Nachbarin im Garten.', options: ['helfe', 'unterstütze'], answers: ['helfe'],
    translation: 'I help my neighbor in the garden.',
    explanation: 'meiner Nachbarin ist Dativ → helfen. unterstützen bräuchte den Akkusativ: meine Nachbarin.' },

  // begegnen | treffen
  { id: 'tw-freund-begegnet', pairId: 'begegnen-treffen', level: 'B2', kind: 'object-choice',
    prompt: 'Gestern bin ich ___ alten Freund begegnet.', options: ['einem', 'einen'], answers: ['einem'],
    translation: 'Yesterday I ran into an old friend.',
    explanation: 'begegnen + Dat (und Perfekt mit sein): einem alten Freund. einen alten Freund gehört zu treffen.' },
  { id: 'tw-freund-treffe', pairId: 'begegnen-treffen', level: 'B1', kind: 'object-choice',
    prompt: 'Ich treffe ___ Freund morgen im Café.', options: ['einen', 'einem'], answers: ['einen'],
    translation: 'I am meeting a friend at the café tomorrow.',
    explanation: 'treffen + Akk: einen Freund. Der Dativ (einem Freund) gehört zu begegnen.' },
  { id: 'tw-professor', pairId: 'begegnen-treffen', level: 'B2', kind: 'verb-choice',
    prompt: 'Im Park bin ich zufällig meinem Professor ___.', options: ['begegnet', 'getroffen'], answers: ['begegnet'],
    translation: 'In the park I ran into my professor by chance.',
    explanation: 'bin + meinem Professor (Dativ) verlangen begegnen. treffen bräuchte habe + meinen Professor.' },

  // raten | beraten
  { id: 'tw-patientin', pairId: 'raten-beraten', level: 'B2', kind: 'object-choice',
    prompt: 'Der Arzt rät ___ Patientin zu mehr Bewegung.', options: ['der', 'die'], answers: ['der'],
    translation: 'The doctor advises the patient to exercise more.',
    explanation: 'raten + Dat (= [einen Rat] geben): der Patientin. die Patientin (Akk) gehört zu beraten.' },
  { id: 'tw-kunden', pairId: 'raten-beraten', level: 'B2', kind: 'object-choice',
    prompt: 'Die Anwältin berät ___ Kunden ausführlich.', options: ['den', 'dem'], answers: ['den'],
    translation: 'The lawyer advises the client in detail.',
    explanation: 'beraten + Akk: den Kunden. dem Kunden (Dativ) gehört zum Zwilling raten.' },
  { id: 'tw-situation', pairId: 'raten-beraten', level: 'B2', kind: 'verb-choice',
    prompt: 'Was würdest du mir in dieser Situation ___?', options: ['raten', 'beraten'], answers: ['raten'],
    translation: 'What would you advise me (to do) in this situation?',
    explanation: 'mir ist Dativ → raten. beraten nähme mich (Akk): du könntest mich beraten.' },
]
```

- [ ] **Step 4: GREEN.** `npx vitest run tests/data/dativeTwins.test.ts` → PASS. If the TWIN GATE reports `zuhören`, `begegnen` or `raten` missing from `VERBS`, STOP and report — phase 1 owns those additions.
- [ ] **Step 5: Typecheck + commit** `feat(dative): family V twin-pair bank (8 pairs, 24 items) with twin gate`

---

### Task 6: T6 drill — Zwillingspaare (`dat-twin`)

**Files:**
- Modify: `src/composables/useDativeDrill.ts` (builder + filter), `src/router.ts` (2 routes), `src/data/drillCatalogue.ts` (family V)
- Create: `src/modules/dative/TwinSetup.vue`, `src/modules/dative/TwinRunner.vue`
- Test: `tests/modules/dative/TwinRunner.test.ts`

**Interfaces:**
- Consumes: `TWIN_PAIRS`, `TWIN_ITEMS`, types (Task 5); `useDativeQuiz`, `DativeQuizCard` (Task 1); `bumpDativeLedger`; `shuffle`; `saveQuizRun`; `csv`; `DATIVE_DRILL_LEVELS`.
- Produces: routes `dative-twins` / `dative-twins-run`; records type `'dat-twin'`; `buildTwinCards(items: TwinItem[]): DativeQuizCard[]`, `filterTwinItems(f: { levels: DativeDrillLevel[]; pairs: string[] }): TwinItem[]`.

- [ ] **Step 1: Failing runner test.** `tests/modules/dative/TwinRunner.test.ts` — same skeleton as Task 3's test (same three mocks), router names `dative-twins-run`/`dative-twins`/`dative`. `QUERY = { count: '1', levels: 'A2,B1,B2,C1', pairs: TWIN_PAIRS.map(p => p.pairId).join(',') }`; `FIRST = TWIN_ITEMS[0]`; `WRONG = FIRST.options.find(o => !FIRST.answers.includes(o))!`. Assertions: 2 choice buttons; wrong pick shows feedback containing `FIRST.answers[0]` and `FIRST.explanation`; finish records once `{ type: 'dat-twin', count: 1 }`; **ledger bumped once with the pair's DATIVE verb**: `expect(bumpDativeLedger).toHaveBeenCalledWith(TWIN_PAIRS.find(p => p.pairId === FIRST.pairId)!.dativeVerb, false, expect.any(Number))`; retry not re-recorded.

- [ ] **Step 2: RED.**

- [ ] **Step 3: Builder + filter.** Append to `useDativeDrill.ts` (import `TWIN_PAIRS, TWIN_ITEMS, type TwinItem` from `../data/dativeTwins`):

```ts
const TWIN_DATIVE_BY_PAIR = new Map(TWIN_PAIRS.map(p => [p.pairId, p.dativeVerb]))

export function buildTwinCards(items: TwinItem[]): DativeQuizCard[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.prompt,
    answers: item.answers,
    options: item.options,
    translation: item.translation,
    note: item.explanation,
    // The ledger item is always the DATIVE member of the pair — twins are
    // teaching contrast, not ledger entries.
    ledgerKey: TWIN_DATIVE_BY_PAIR.get(item.pairId) ?? null,
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function filterTwinItems(f: { levels: DativeDrillLevel[]; pairs: string[] }): TwinItem[] {
  return TWIN_ITEMS.filter(i => f.levels.includes(i.level) && f.pairs.includes(i.pairId))
}
```

- [ ] **Step 4: Setup.** `src/modules/dative/TwinSetup.vue` — mirror CompoundSetup: `STORAGE_KEY = 'datTwinsSetup'`; Level chips (default `['B1', 'B2']` — the bank is B1/B2); **Pair chips** — one per `TWIN_PAIRS`, label from the pair (`antworten | beantworten`, `folgen | verfolgen`, `zuhören | hören`, `glauben +Dat | +Akk`, `gehören | gehören zu`, `helfen | unterstützen`, `begegnen | treffen`, `raten | beraten`; build labels as `p.twinParticle ? \`${p.dativeVerb} | ${p.twin} ${p.twinParticle}\` : p.dativeVerb === p.twin ? \`${p.dativeVerb} +Dat | +Akk\` : \`${p.dativeVerb} | ${p.twin}\``), value = `pairId`, default all; count presets; warning-when-0. Breadcrumb `Kapitel XIII · Dativ · Zwillingspaare`; title `Zwillingspaare<em>.</em>`; subtitle: `antworten or beantworten? Near-synonyms sit on opposite sides of the case line — the object's case (or the auxiliary) tells you which twin the sentence wants.` `start()` query `{ count, levels, pairs }` → `dative-twins-run`.

- [ ] **Step 5: Runner.** `src/modules/dative/TwinRunner.vue` — mirror Task 3's SubjectRunner exactly (pick-only, 2 options, keyboard 1–2), with: mount parses `pairs` (csv against `TWIN_PAIRS.map(p => p.pairId)`) + `levels`; sample via `filterTwinItems`; build via `buildTwinCards`; feedback shows filled prompt (`prompt.replace('___', answers[0])`), translation, note; `recordRun()` block identical to Task 3's with `type: 'dat-twin'` and `meta: { levels: queriedLevels.value, pairs: queriedPairs.value }` (ledger loop included — `ledgerKey` is the pair's dative verb). End-drill/back → `dative-twins`. Retry via `buildTwinCards`; `item-label="cards"`.

- [ ] **Step 6: Routes + catalogue.**

```ts
{ path: '/dative/twins', name: 'dative-twins', component: () => import('./modules/dative/TwinSetup.vue') },
{ path: '/dative/twins/run', name: 'dative-twins-run', component: () => import('./modules/dative/TwinRunner.vue') },
```

Append to `DAT_FAMILIES` after the `id: 'inverted'` family:

```ts
{
  id: 'twins', numeral: 'V', heading: 'Twin verbs', de: 'Zwillinge',
  blurb: 'Near-synonyms on opposite sides of the case line — the prefix usually eats the dative.',
  cards: [
    {
      code: 'T6', route: 'dative-twins',
      title: 'Twin pairs', de: 'Zwillingspaare', level: 'B2',
      desc: 'antworten or beantworten? folgen or verfolgen? The object\'s case decides which twin the sentence wants.',
    },
  ],
},
```

- [ ] **Step 7: GREEN + typecheck.** `npx vitest run tests/modules/dative/TwinRunner.test.ts tests/data/drillCatalogue.test.ts` → PASS; `npm run typecheck` → PASS.
- [ ] **Step 8: Commit** `feat(dative): T6 Zwillingspaare drill (family V)`

---
### Task 7: Item banks for T7/T8 — `dativeDitransitive.ts` + OBJECT-ORDER GATE

**Files:**
- Create: `src/data/dativeDitransitive.ts`
- Test: `tests/data/dativeDitransitive.test.ts`

**Interfaces:**
- Consumes: `VERBS` (cross-ref: every drilled verb carries `case: 'dative+accusative'`), `DativeDrillLevel`.
- Produces (Tasks 8–9 rely on): `interface DitransitiveItem`, `DITRANSITIVE_ITEMS` (26), `interface ObjectOrderItem`, `OBJECT_ORDER_ITEMS` (21), `objectOrderAnswer(item): string`, `OBJECT_PRONOUNS`.

- [ ] **Step 1: Invariant tests FIRST.** Create `tests/data/dativeDitransitive.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  DITRANSITIVE_ITEMS, OBJECT_ORDER_ITEMS, OBJECT_PRONOUNS, objectOrderAnswer,
} from '../../src/data/dativeDitransitive'
import { DATIVE_DRILL_LEVELS } from '../../src/data/dativeExperiencer'
import { VERBS } from '../../src/data/verbs'

const byGerman = new Map(VERBS.map(v => [v.german, v]))
const isPronoun = (phrase: string) => (OBJECT_PRONOUNS as readonly string[]).includes(phrase)

describe('DITRANSITIVE_ITEMS (T7)', () => {
  test('base: unique ids, known level, one gap, translation present', () => {
    expect(new Set(DITRANSITIVE_ITEMS.map(i => i.id)).size).toBe(DITRANSITIVE_ITEMS.length)
    const bad = DITRANSITIVE_ITEMS.filter(i =>
      !(DATIVE_DRILL_LEVELS as readonly string[]).includes(i.level)
      || (i.prompt.match(/___/g) ?? []).length !== 1
      || i.translation.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('cross-ref: every verb carries case dative+accusative in VERBS', () => {
    const bad = DITRANSITIVE_ITEMS.filter(i => byGerman.get(i.verb)?.case !== 'dative+accusative')
    expect(bad.map(i => `${i.id}:${i.verb}`)).toEqual([])
  })

  test('options: 2 unique, exactly one answer', () => {
    const bad = DITRANSITIVE_ITEMS.filter(i =>
      i.options.length !== 2 || new Set(i.options).size !== 2
      || i.answers.length !== 1 || i.options.filter(o => i.answers.includes(o)).length !== 1)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥24 total, ≥12 dative gaps, ≥8 accusative gaps, ≥15 distinct verbs', () => {
    expect(DITRANSITIVE_ITEMS.length).toBeGreaterThanOrEqual(24)
    expect(DITRANSITIVE_ITEMS.filter(i => i.gapRole === 'dative').length).toBeGreaterThanOrEqual(12)
    expect(DITRANSITIVE_ITEMS.filter(i => i.gapRole === 'accusative').length).toBeGreaterThanOrEqual(8)
    expect(new Set(DITRANSITIVE_ITEMS.map(i => i.verb)).size).toBeGreaterThanOrEqual(15)
  })
})

describe('OBJECT_ORDER_ITEMS (T8)', () => {
  test('base: unique ids, known level, verb is dative+accusative', () => {
    expect(new Set(OBJECT_ORDER_ITEMS.map(i => i.id)).size).toBe(OBJECT_ORDER_ITEMS.length)
    const bad = OBJECT_ORDER_ITEMS.filter(i =>
      !(DATIVE_DRILL_LEVELS as readonly string[]).includes(i.level)
      || byGerman.get(i.verb)?.case !== 'dative+accusative')
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('OBJECT-ORDER GATE: kind matches the phrases, and the derived answer obeys the rule', () => {
    const bad = OBJECT_ORDER_ITEMS.filter(i => {
      const datPro = isPronoun(i.datPhrase)
      const akkPro = isPronoun(i.akkPhrase)
      if (i.kind === 'pp' && !(datPro && akkPro)) return true
      if (i.kind === 'nn' && (datPro || akkPro)) return true
      if (i.kind === 'mixed') {
        if (datPro === akkPro) return true
        const pronounIs = datPro ? 'dative' : 'accusative'
        if (i.pronounRole !== pronounIs) return true
      }
      // Rule: AKK first iff both pronouns, or the single pronoun is accusative.
      const akkFirst = i.kind === 'pp' || (i.kind === 'mixed' && i.pronounRole === 'accusative')
      const expected = akkFirst ? `${i.akkPhrase} ${i.datPhrase}` : `${i.datPhrase} ${i.akkPhrase}`
      return objectOrderAnswer(i) !== expected
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥20 total, ≥6 per kind', () => {
    expect(OBJECT_ORDER_ITEMS.length).toBeGreaterThanOrEqual(20)
    for (const k of ['nn', 'pp', 'mixed'] as const) {
      expect(OBJECT_ORDER_ITEMS.filter(i => i.kind === k).length, `kind ${k}`).toBeGreaterThanOrEqual(6)
    }
  })
})
```

- [ ] **Step 2: RED.** `npx vitest run tests/data/dativeDitransitive.test.ts`.

- [ ] **Step 3: Author the data.** Create `src/data/dativeDitransitive.ts` EXACTLY:

```ts
// Dativ module — family VI (Zwei Objekte). T7: which object takes which case
// (article pick). T8: object order — DAT before AKK by default, AKK before DAT
// when both are pronouns, the pronoun first in mixed pairs. The OBJECT-ORDER
// GATE recomputes each item's correct ordering from its structured fields.

import type { DativeDrillLevel } from './dativeExperiencer'

export interface DitransitiveItem {
  id: string
  verb: string              // VERBS.german, case 'dative+accusative'
  level: DativeDrillLevel
  gapRole: 'dative' | 'accusative'
  prompt: string            // one ___ on an article/determiner of one object
  options: string[]         // exactly 2
  answers: string[]         // exactly 1
  translation: string
  explanation: string
}

export const DITRANSITIVE_ITEMS: DitransitiveItem[] = [
  { id: 'dt-geben-d', verb: 'geben', level: 'A2', gapRole: 'dative',
    prompt: 'Ich gebe ___ Kind das Buch.', options: ['dem', 'das'], answers: ['dem'],
    translation: 'I give the child the book.',
    explanation: 'Der Empfänger steht im Dativ (dem Kind), die Sache im Akkusativ (das Buch).' },
  { id: 'dt-geben-a', verb: 'geben', level: 'A2', gapRole: 'accusative',
    prompt: 'Ich gebe dem Kind ___ Buch.', options: ['das', 'dem'], answers: ['das'],
    translation: 'I give the child the book.',
    explanation: 'Die gegebene Sache ist Akkusativ: das Buch. Der Dativ (dem Kind) ist schon vergeben.' },
  { id: 'dt-schenken-d', verb: 'schenken', level: 'A2', gapRole: 'dative',
    prompt: 'Wir schenken ___ Mutter einen Gutschein.', options: ['der', 'die'], answers: ['der'],
    translation: 'We are giving (our) mother a voucher.',
    explanation: 'Die Beschenkte ist Dativ: der Mutter. die Mutter wäre Akkusativ — der gehört dem Gutschein nicht.' },
  { id: 'dt-schenken-a', verb: 'schenken', level: 'A2', gapRole: 'accusative',
    prompt: 'Wir schenken der Mutter ___ Gutschein.', options: ['einen', 'einem'], answers: ['einen'],
    translation: 'We are giving (our) mother a voucher.',
    explanation: 'Die geschenkte Sache ist Akkusativ: einen Gutschein.' },
  { id: 'dt-zeigen-d', verb: 'zeigen', level: 'A2', gapRole: 'dative',
    prompt: 'Er zeigt ___ Besucherin den Weg.', options: ['der', 'die'], answers: ['der'],
    translation: 'He shows the visitor the way.',
    explanation: 'Wem gezeigt wird → Dativ: der Besucherin. Was gezeigt wird → Akkusativ: den Weg.' },
  { id: 'dt-zeigen-a', verb: 'zeigen', level: 'A2', gapRole: 'accusative',
    prompt: 'Sie zeigt dem Gast ___ Zimmer.', options: ['das', 'dem'], answers: ['das'],
    translation: 'She shows the guest the room.',
    explanation: 'Das Gezeigte ist Akkusativ: das Zimmer.' },
  { id: 'dt-erklaeren-d', verb: 'erklären', level: 'A2', gapRole: 'dative',
    prompt: 'Die Lehrerin erklärt ___ Schülern die Regel.', options: ['den', 'die'], answers: ['den'],
    translation: 'The teacher explains the rule to the pupils.',
    explanation: 'Dativ Plural: den Schülern (+n). die Schülern ist keine mögliche Form.' },
  { id: 'dt-erklaeren-a', verb: 'erklären', level: 'A2', gapRole: 'accusative',
    prompt: 'Die Lehrerin erklärt den Schülern ___ Regel.', options: ['die', 'der'], answers: ['die'],
    translation: 'The teacher explains the rule to the pupils.',
    explanation: 'Das Erklärte ist Akkusativ: die Regel.' },
  { id: 'dt-empfehlen-d', verb: 'empfehlen', level: 'B1', gapRole: 'dative',
    prompt: 'Der Kellner empfiehlt ___ Gästen den Fisch.', options: ['den', 'die'], answers: ['den'],
    translation: 'The waiter recommends the fish to the guests.',
    explanation: 'Wem empfohlen wird → Dativ Plural: den Gästen.' },
  { id: 'dt-empfehlen-a', verb: 'empfehlen', level: 'B1', gapRole: 'accusative',
    prompt: 'Der Kellner empfiehlt den Gästen ___ Fisch.', options: ['den', 'dem'], answers: ['den'],
    translation: 'The waiter recommends the fish to the guests.',
    explanation: 'Das Empfohlene ist Akkusativ: den Fisch (maskulin). Zwei Mal den in einem Satz — einmal Dativ Plural, einmal Akkusativ Singular.' },
  { id: 'dt-bringen-d', verb: 'bringen', level: 'A2', gapRole: 'dative',
    prompt: 'Bringst du ___ Oma die Zeitung?', options: ['der', 'die'], answers: ['der'],
    translation: 'Will you bring grandma the newspaper?',
    explanation: 'Die Empfängerin ist Dativ: der Oma.' },
  { id: 'dt-bringen-a', verb: 'bringen', level: 'A2', gapRole: 'accusative',
    prompt: 'Bringst du der Oma ___ Zeitung?', options: ['die', 'der'], answers: ['die'],
    translation: 'Will you bring grandma the newspaper?',
    explanation: 'Das Gebrachte ist Akkusativ: die Zeitung.' },
  { id: 'dt-schicken-d', verb: 'schicken', level: 'A2', gapRole: 'dative',
    prompt: 'Ich schicke ___ Freund ein Paket.', options: ['meinem', 'meinen'], answers: ['meinem'],
    translation: 'I am sending my friend a package.',
    explanation: 'Der Empfänger ist Dativ: meinem Freund. meinen Freund wäre Akkusativ — der gehört dem Paket.' },
  { id: 'dt-schicken-a', verb: 'schicken', level: 'A2', gapRole: 'accusative',
    prompt: 'Ich schicke meinem Freund ___ Paket.', options: ['ein', 'einem'], answers: ['ein'],
    translation: 'I am sending my friend a package.',
    explanation: 'Die geschickte Sache ist Akkusativ: ein Paket (Neutrum, endungslos).' },
  { id: 'dt-erzaehlen-d', verb: 'erzählen', level: 'A2', gapRole: 'dative',
    prompt: 'Der Opa erzählt ___ Enkeln eine Geschichte.', options: ['den', 'die'], answers: ['den'],
    translation: 'Grandpa tells the grandchildren a story.',
    explanation: 'Wem erzählt wird → Dativ Plural: den Enkeln.' },
  { id: 'dt-leihen-d', verb: 'leihen', level: 'B1', gapRole: 'dative',
    prompt: 'Leihst du ___ Kollegin dein Fahrrad?', options: ['der', 'die'], answers: ['der'],
    translation: 'Will you lend the colleague your bicycle?',
    explanation: 'Die Person, der geliehen wird, ist Dativ: der Kollegin.' },
  { id: 'dt-wuenschen-d', verb: 'wünschen', level: 'A2', gapRole: 'dative',
    prompt: 'Wir wünschen ___ Team viel Erfolg.', options: ['dem', 'das'], answers: ['dem'],
    translation: 'We wish the team every success.',
    explanation: 'Wem gewünscht wird → Dativ: dem Team. Der Erfolg ist die Akkusativ-Sache.' },
  { id: 'dt-versprechen-a', verb: 'versprechen', level: 'B1', gapRole: 'accusative',
    prompt: 'Er verspricht seiner Tochter ___ Hund.', options: ['einen', 'einem'], answers: ['einen'],
    translation: 'He promises his daughter a dog.',
    explanation: 'Das Versprochene ist Akkusativ: einen Hund. seiner Tochter trägt den Dativ schon.' },
  { id: 'dt-erlauben-d', verb: 'erlauben', level: 'B1', gapRole: 'dative',
    prompt: 'Die Eltern erlauben ___ Sohn die Reise.', options: ['dem', 'den'], answers: ['dem'],
    translation: 'The parents allow their son the trip.',
    explanation: 'erlauben: die Person im Dativ (dem Sohn), das Erlaubte im Akkusativ (die Reise).' },
  { id: 'dt-verbieten-d', verb: 'verbieten', level: 'B1', gapRole: 'dative',
    prompt: 'Der Arzt verbietet ___ Patientin das Rauchen.', options: ['der', 'die'], answers: ['der'],
    translation: 'The doctor forbids the patient to smoke.',
    explanation: 'verbieten spiegelt erlauben: Person im Dativ (der Patientin), Sache im Akkusativ (das Rauchen).' },
  { id: 'dt-anbieten-a', verb: 'anbieten', level: 'B1', gapRole: 'accusative',
    prompt: 'Sie bietet dem Besucher ___ Kaffee an.', options: ['einen', 'einem'], answers: ['einen'],
    translation: 'She offers the visitor a coffee.',
    explanation: 'Das Angebotene ist Akkusativ: einen Kaffee.' },
  { id: 'dt-mitbringen-d', verb: 'mitbringen', level: 'A2', gapRole: 'dative',
    prompt: 'Ich bringe ___ Kindern Schokolade mit.', options: ['den', 'die'], answers: ['den'],
    translation: 'I am bringing the children chocolate.',
    explanation: 'Die Empfänger sind Dativ Plural: den Kindern.' },
  { id: 'dt-vorschlagen-d', verb: 'vorschlagen', level: 'B1', gapRole: 'dative',
    prompt: 'Er schlägt ___ Chefin einen neuen Termin vor.', options: ['der', 'die'], answers: ['der'],
    translation: 'He suggests a new date to the boss.',
    explanation: 'Wem vorgeschlagen wird → Dativ: der Chefin.' },
  { id: 'dt-beibringen-d', verb: 'beibringen', level: 'B2', gapRole: 'dative',
    prompt: 'Die Trainerin bringt ___ Anfängern das Schwimmen bei.', options: ['den', 'die'], answers: ['den'],
    translation: 'The coach teaches the beginners how to swim.',
    explanation: 'beibringen: die Lernenden im Dativ (den Anfängern), das Gelehrte im Akkusativ.' },
  { id: 'dt-vorstellen-a', verb: 'vorstellen', level: 'B1', gapRole: 'accusative',
    prompt: 'Ich stelle dir ___ neuen Kollegen vor.', options: ['den', 'dem'], answers: ['den'],
    translation: 'Let me introduce the new colleague to you.',
    explanation: 'Der Vorgestellte ist die Akkusativ-Sache des Satzes: den neuen Kollegen (n-Nomen). dir trägt den Dativ.' },
  { id: 'dt-verkaufen-d', verb: 'verkaufen', level: 'B1', gapRole: 'dative',
    prompt: 'Der Händler verkauft ___ Studentin ein gebrauchtes Fahrrad.', options: ['der', 'die'], answers: ['der'],
    translation: 'The dealer sells the student a used bicycle.',
    explanation: 'Die Käuferin ist Dativ: der Studentin.' },
]

/** Object pronouns the ORDER GATE recognizes — a phrase equal to one of these counts as a pronoun. */
export const OBJECT_PRONOUNS = ['mir', 'dir', 'ihm', 'ihr', 'ihnen', 'uns', 'euch', 'es', 'ihn', 'sie'] as const

export interface ObjectOrderItem {
  id: string
  verb: string              // VERBS.german, case 'dative+accusative'
  level: DativeDrillLevel
  kind: 'nn' | 'pp' | 'mixed'
  stem: string              // opening up to the two objects, e.g. 'Ich gebe'
  datPhrase: string
  akkPhrase: string
  pronounRole?: 'dative' | 'accusative'   // mixed only: which phrase is the pronoun
  punct: string             // '.' or '?'
  translation: string
  explanation: string
}

/** The rule, executable: AKK first iff both objects are pronouns, or the single pronoun is accusative. */
export function objectOrderAnswer(i: ObjectOrderItem): string {
  const akkFirst = i.kind === 'pp' || (i.kind === 'mixed' && i.pronounRole === 'accusative')
  return akkFirst ? `${i.akkPhrase} ${i.datPhrase}` : `${i.datPhrase} ${i.akkPhrase}`
}

export const OBJECT_ORDER_ITEMS: ObjectOrderItem[] = [
  // nn — two nouns: DAT before AKK (neutral order)
  { id: 'oo-nn-geben', verb: 'geben', level: 'B1', kind: 'nn',
    stem: 'Ich gebe', datPhrase: 'dem Kind', akkPhrase: 'das Buch', punct: '.',
    translation: 'I give the child the book.',
    explanation: 'Zwei Nomen: Dativ vor Akkusativ — Ich gebe dem Kind das Buch.' },
  { id: 'oo-nn-schenken', verb: 'schenken', level: 'B1', kind: 'nn',
    stem: 'Er schenkt', datPhrase: 'seiner Freundin', akkPhrase: 'einen Ring', punct: '.',
    translation: 'He gives his girlfriend a ring.',
    explanation: 'Neutral: der Empfänger (Dativ) zuerst, dann die Sache (Akkusativ).' },
  { id: 'oo-nn-zeigen', verb: 'zeigen', level: 'B1', kind: 'nn',
    stem: 'Wir zeigen', datPhrase: 'den Gästen', akkPhrase: 'die Wohnung', punct: '.',
    translation: 'We show the guests the apartment.',
    explanation: 'Zwei Nomen: den Gästen (Dativ) vor die Wohnung (Akkusativ).' },
  { id: 'oo-nn-erklaeren', verb: 'erklären', level: 'B1', kind: 'nn',
    stem: 'Die Lehrerin erklärt', datPhrase: 'der Klasse', akkPhrase: 'die Grammatik', punct: '.',
    translation: 'The teacher explains the grammar to the class.',
    explanation: 'Neutral: Dativ (der Klasse) vor Akkusativ (die Grammatik).' },
  { id: 'oo-nn-schicken', verb: 'schicken', level: 'B1', kind: 'nn',
    stem: 'Ich schicke', datPhrase: 'meiner Tante', akkPhrase: 'eine Postkarte', punct: '.',
    translation: 'I send my aunt a postcard.',
    explanation: 'Zwei Nomen: meiner Tante (Dativ) zuerst.' },
  { id: 'oo-nn-empfehlen', verb: 'empfehlen', level: 'B1', kind: 'nn',
    stem: 'Der Arzt empfiehlt', datPhrase: 'dem Patienten', akkPhrase: 'eine Kur', punct: '.',
    translation: 'The doctor recommends a health cure to the patient.',
    explanation: 'Neutral: dem Patienten (Dativ) vor eine Kur (Akkusativ).' },
  { id: 'oo-nn-leihen', verb: 'leihen', level: 'B1', kind: 'nn',
    stem: 'Sie leiht', datPhrase: 'ihrem Bruder', akkPhrase: 'das Auto', punct: '.',
    translation: 'She lends her brother the car.',
    explanation: 'Zwei Nomen: ihrem Bruder (Dativ) vor das Auto (Akkusativ).' },

  // pp — two pronouns: AKK before DAT (Ich gebe es ihm)
  { id: 'oo-pp-geben', verb: 'geben', level: 'B1', kind: 'pp',
    stem: 'Ich gebe', datPhrase: 'ihm', akkPhrase: 'es', punct: '.',
    translation: 'I give it to him.',
    explanation: 'Zwei Pronomen drehen die Folge um: Akkusativ vor Dativ — Ich gebe es ihm, nie *Ich gebe ihm es.' },
  { id: 'oo-pp-schenken', verb: 'schenken', level: 'B1', kind: 'pp',
    stem: 'Wir schenken', datPhrase: 'ihr', akkPhrase: 'ihn', punct: '.',
    translation: 'We give it (the ring) to her.',
    explanation: 'Beide Objekte pronominal → Akkusativ (ihn) vor Dativ (ihr).' },
  { id: 'oo-pp-zeigen', verb: 'zeigen', level: 'B1', kind: 'pp',
    stem: 'Er zeigt', datPhrase: 'uns', akkPhrase: 'sie', punct: '.',
    translation: 'He shows it (the apartment) to us.',
    explanation: 'Pronomen + Pronomen: sie (Akk) vor uns (Dat).' },
  { id: 'oo-pp-erklaeren', verb: 'erklären', level: 'B1', kind: 'pp',
    stem: 'Sie erklärt', datPhrase: 'mir', akkPhrase: 'sie', punct: '.',
    translation: 'She explains it (the rule) to me.',
    explanation: 'Beide pronominal → Akkusativ zuerst: Sie erklärt sie mir.' },
  { id: 'oo-pp-bringen', verb: 'bringen', level: 'B1', kind: 'pp',
    stem: 'Ich bringe', datPhrase: 'dir', akkPhrase: 'es', punct: '.',
    translation: 'I will bring it to you.',
    explanation: 'es (Akk) vor dir (Dat): Ich bringe es dir.' },
  { id: 'oo-pp-schicken', verb: 'schicken', level: 'B1', kind: 'pp',
    stem: 'Wir schicken', datPhrase: 'euch', akkPhrase: 'sie', punct: '.',
    translation: 'We will send them (the photos) to you.',
    explanation: 'Beide pronominal → sie (Akk) vor euch (Dat).' },
  { id: 'oo-pp-leihen', verb: 'leihen', level: 'B1', kind: 'pp',
    stem: 'Er leiht', datPhrase: 'ihnen', akkPhrase: 'es', punct: '.',
    translation: 'He lends it (the bicycle) to them.',
    explanation: 'es (Akk) vor ihnen (Dat): Er leiht es ihnen.' },

  // mixed — one pronoun, one noun: the pronoun comes first, whatever its case
  { id: 'oo-mx-es-kind', verb: 'geben', level: 'B2', kind: 'mixed',
    stem: 'Ich gebe', datPhrase: 'dem Kind', akkPhrase: 'es', pronounRole: 'accusative', punct: '.',
    translation: 'I give it to the child.',
    explanation: 'Pronomen vor Nomen: es (Akk-Pronomen) steht vor dem Kind — Ich gebe es dem Kind.' },
  { id: 'oo-mx-ihm-buch', verb: 'geben', level: 'B2', kind: 'mixed',
    stem: 'Ich gebe', datPhrase: 'ihm', akkPhrase: 'das Buch', pronounRole: 'dative', punct: '.',
    translation: 'I give him the book.',
    explanation: 'Pronomen vor Nomen: ihm (Dat-Pronomen) vor das Buch.' },
  { id: 'oo-mx-ihn-mutter', verb: 'schenken', level: 'B2', kind: 'mixed',
    stem: 'Sie schenkt', datPhrase: 'ihrer Mutter', akkPhrase: 'ihn', pronounRole: 'accusative', punct: '.',
    translation: 'She gives it (the scarf) to her mother.',
    explanation: 'Das Pronomen geht voran: Sie schenkt ihn ihrer Mutter.' },
  { id: 'oo-mx-ihr-fotos', verb: 'zeigen', level: 'B2', kind: 'mixed',
    stem: 'Wir zeigen', datPhrase: 'ihr', akkPhrase: 'die Fotos', pronounRole: 'dative', punct: '.',
    translation: 'We show her the photos.',
    explanation: 'ihr (Dat-Pronomen) vor die Fotos (Nomen).' },
  { id: 'oo-mx-sie-kindern', verb: 'erzählen', level: 'B2', kind: 'mixed',
    stem: 'Der Opa erzählt', datPhrase: 'den Kindern', akkPhrase: 'sie', pronounRole: 'accusative', punct: '.',
    translation: 'Grandpa tells it (the story) to the children.',
    explanation: 'sie (Akk-Pronomen) vor den Kindern: Der Opa erzählt sie den Kindern.' },
  { id: 'oo-mx-sie-chef', verb: 'schicken', level: 'B2', kind: 'mixed',
    stem: 'Ich schicke', datPhrase: 'meinem Chef', akkPhrase: 'sie', pronounRole: 'accusative', punct: '.',
    translation: 'I send them (the documents) to my boss.',
    explanation: 'Pronomen zuerst: Ich schicke sie meinem Chef.' },
  { id: 'oo-mx-mir-zeitung', verb: 'bringen', level: 'B2', kind: 'mixed',
    stem: 'Bringst du', datPhrase: 'mir', akkPhrase: 'die Zeitung', pronounRole: 'dative', punct: '?',
    translation: 'Will you bring me the newspaper?',
    explanation: 'mir (Dat-Pronomen) vor die Zeitung: Bringst du mir die Zeitung?' },
]
```

- [ ] **Step 4: GREEN.** `npx vitest run tests/data/dativeDitransitive.test.ts` → PASS.
- [ ] **Step 5: Typecheck + commit** `feat(dative): family VI banks — ditransitive articles + object order gate`

---
### Task 8: T7 drill — Welches Objekt? (`dat-ditrans`)

**Files:**
- Modify: `src/composables/useDativeDrill.ts` (builder + filter), `src/router.ts` (2 routes), `src/data/drillCatalogue.ts` (family VI)
- Create: `src/modules/dative/DitransitiveSetup.vue`, `src/modules/dative/DitransitiveRunner.vue`
- Test: `tests/modules/dative/DitransitiveRunner.test.ts`

**Interfaces:**
- Consumes: `DITRANSITIVE_ITEMS`, `type DitransitiveItem` (Task 7); `useDativeQuiz`; `shuffle`; `saveQuizRun`; `csv`; `DATIVE_DRILL_LEVELS`.
- Produces: routes `dative-ditransitive` / `dative-ditransitive-run`; records type `'dat-ditrans'`; `buildDitransitiveCards(items: DitransitiveItem[]): DativeQuizCard[]`, `filterDitransitiveItems(f: { levels: DativeDrillLevel[]; roles: string[] }): DitransitiveItem[]`.
- **Band-tracked ONLY: this runner must NOT import or call `bumpDativeLedger`** — ditransitives are not ledger items (spec).

- [ ] **Step 1: Failing runner test.** `tests/modules/dative/DitransitiveRunner.test.ts` — Task 3's skeleton (all three mocks, incl. the ledger mock), router names `dative-ditransitive-run`/`dative-ditransitive`/`dative`. `QUERY = { count: '1', levels: 'A2,B1,B2,C1', roles: 'dative,accusative' }`; `FIRST = DITRANSITIVE_ITEMS[0]`; `WRONG` derived as before. Assertions: 2 choice buttons; wrong pick reveals `FIRST.answers[0]` + `FIRST.explanation`; finish records once `{ type: 'dat-ditrans', count: 1 }`; **`expect(bumpDativeLedger).not.toHaveBeenCalled()`** (the drill is band-tracked only — this assertion is the point of the test); retry not re-recorded.

- [ ] **Step 2: RED.**

- [ ] **Step 3: Builder + filter.** Append to `useDativeDrill.ts` (import `DITRANSITIVE_ITEMS, type DitransitiveItem` from `../data/dativeDitransitive`):

```ts
export function buildDitransitiveCards(items: DitransitiveItem[]): DativeQuizCard[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.prompt,
    answers: item.answers,
    options: item.options,
    translation: item.translation,
    note: item.explanation,
    ledgerKey: null,   // rule-driven family: band-tracked only, never in the ledger
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function filterDitransitiveItems(f: { levels: DativeDrillLevel[]; roles: string[] }): DitransitiveItem[] {
  return DITRANSITIVE_ITEMS.filter(i => f.levels.includes(i.level) && f.roles.includes(i.gapRole))
}
```

- [ ] **Step 4: Setup.** `src/modules/dative/DitransitiveSetup.vue` — mirror CompoundSetup: `STORAGE_KEY = 'datDitransSetup'`; Level chips (default `['A2', 'B1']`); **Gap chips** `roles` (values `dative`/`accusative`, labels `Dativ-Lücke` / `Akkusativ-Lücke`, default both); count presets; warning-when-0 via `filterDitransitiveItems`. Breadcrumb `Kapitel XIII · Dativ · Welches Objekt?`; title `Welches Objekt?<em>.</em>`; subtitle: `Ich schenke dem Bruder das Buch — the person is dative, the thing accusative. Pick the article that fits the gapped object.` `start()` query `{ count, levels, roles }` → `dative-ditransitive-run`.

- [ ] **Step 5: Runner.** `src/modules/dative/DitransitiveRunner.vue` — mirror Task 3's SubjectRunner (pick-only, 2 options) with: mount parses `roles` (csv against `['dative', 'accusative']`) + `levels`; `filterDitransitiveItems` → `buildDitransitiveCards`; feedback shows filled prompt + translation + note. `recordRun()` WITHOUT any ledger code:

```ts
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  // Band-tracked only (spec): ditransitives are rule-driven — no ledger bump.
  saveQuizRun({
    type: 'dat-ditrans',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: { levels: queriedLevels.value, roles: queriedRoles.value },
  })
}
```

- [ ] **Step 6: Routes + catalogue.**

```ts
{ path: '/dative/ditransitive', name: 'dative-ditransitive', component: () => import('./modules/dative/DitransitiveSetup.vue') },
{ path: '/dative/ditransitive/run', name: 'dative-ditransitive-run', component: () => import('./modules/dative/DitransitiveRunner.vue') },
```

Append to `DAT_FAMILIES` after the `id: 'twins'` family:

```ts
{
  id: 'ditransitive', numeral: 'VI', heading: 'Two objects', de: 'Zwei Objekte',
  blurb: 'geben, schenken, erklären — the person is dative, the thing accusative, and the order has one exception.',
  cards: [
    {
      code: 'T7', route: 'dative-ditransitive',
      title: 'Which object?', de: 'Welches Objekt?', level: 'A2',
      desc: 'Ich schenke dem Bruder das Buch — pick the right article for recipient and thing.',
    },
  ],
},
```

- [ ] **Step 7: GREEN + typecheck; commit** `feat(dative): T7 Welches Objekt? drill (family VI, band-tracked only)`

---

### Task 9: T8 drill — Objektfolge (`dat-object-order`)

**Files:**
- Modify: `src/composables/useDativeDrill.ts` (builder + filter), `src/router.ts` (2 routes), `src/data/drillCatalogue.ts` (T8 card into family VI)
- Create: `src/modules/dative/ObjectOrderSetup.vue`, `src/modules/dative/ObjectOrderRunner.vue`
- Test: `tests/modules/dative/ObjectOrderRunner.test.ts`

**Interfaces:**
- Consumes: `OBJECT_ORDER_ITEMS`, `objectOrderAnswer`, `type ObjectOrderItem` (Task 7); `useDativeQuiz`; `shuffle`, `type Rng` (src/data/pool.ts); `saveQuizRun`; `csv`.
- Produces: routes `dative-object-order` / `dative-object-order-run`; records type `'dat-object-order'`; `buildObjectOrderCards(items: ObjectOrderItem[], rng?: Rng): DativeQuizCard[]`, `filterObjectOrderItems(f: { levels: DativeDrillLevel[]; kinds: string[] }): ObjectOrderItem[]`.
- **Band-tracked ONLY — no `bumpDativeLedger` import or call.**

- [ ] **Step 1: Failing tests.** Extend `tests/composables/useDativeQuiz.test.ts` with a builder block, and create the runner test.

Builder test (append to `tests/composables/useDativeQuiz.test.ts`):

```ts
import { buildObjectOrderCards } from '../../src/composables/useDativeDrill'
import { OBJECT_ORDER_ITEMS, objectOrderAnswer } from '../../src/data/dativeDitransitive'

describe('buildObjectOrderCards', () => {
  test('two options: the rule-derived order and its flip; answer is the derived order', () => {
    const cards = buildObjectOrderCards([...OBJECT_ORDER_ITEMS], () => 0.99)
    for (const c of cards) {
      const item = OBJECT_ORDER_ITEMS[c.sourceIndex]
      const correct = objectOrderAnswer(item)
      const flipped = correct === `${item.datPhrase} ${item.akkPhrase}`
        ? `${item.akkPhrase} ${item.datPhrase}` : `${item.datPhrase} ${item.akkPhrase}`
      expect(c.answers).toEqual([correct])
      expect(new Set(c.options)).toEqual(new Set([correct, flipped]))
      expect(c.prompt).toBe(`${item.stem} ___${item.punct}`)
      expect(c.ledgerKey).toBeNull()
    }
  })
})
```

Runner test `tests/modules/dative/ObjectOrderRunner.test.ts` — Task 3's skeleton, router names `dative-object-order-run`/`dative-object-order`/`dative`; `QUERY = { count: '1', levels: 'A2,B1,B2,C1', kinds: 'nn,pp,mixed' }`; `FIRST = OBJECT_ORDER_ITEMS[0]`; the wrong button is the one whose label ≠ `objectOrderAnswer(FIRST)`. Assertions: 2 choice buttons; wrong pick reveals feedback containing `objectOrderAnswer(FIRST)`; records once `{ type: 'dat-object-order', count: 1 }`; `bumpDativeLedger` never called; retry not re-recorded.

- [ ] **Step 2: RED.**

- [ ] **Step 3: Builder + filter.** Append to `useDativeDrill.ts` (extend the dativeDitransitive import with `OBJECT_ORDER_ITEMS, objectOrderAnswer, type ObjectOrderItem`; import `shuffle, type Rng` from `../data/pool` if not present):

```ts
export function buildObjectOrderCards(items: ObjectOrderItem[], rng: Rng = Math.random): DativeQuizCard[] {
  return items.map((item, sourceIndex) => {
    const correct = objectOrderAnswer(item)
    const flipped = correct === `${item.datPhrase} ${item.akkPhrase}`
      ? `${item.akkPhrase} ${item.datPhrase}` : `${item.datPhrase} ${item.akkPhrase}`
    return {
      key: item.id,
      prompt: `${item.stem} ___${item.punct}`,
      answers: [correct],
      options: shuffle([correct, flipped], 2, rng),
      translation: item.translation,
      note: item.explanation,
      ledgerKey: null,   // rule-driven: band-tracked only
      sourceIndex,
      picked: null, typed: null, isCorrect: null,
    }
  })
}

export function filterObjectOrderItems(f: { levels: DativeDrillLevel[]; kinds: string[] }): ObjectOrderItem[] {
  return OBJECT_ORDER_ITEMS.filter(i => f.levels.includes(i.level) && f.kinds.includes(i.kind))
}
```

- [ ] **Step 4: Setup.** `src/modules/dative/ObjectOrderSetup.vue` — mirror CompoundSetup: `STORAGE_KEY = 'datObjectOrderSetup'`; Level chips (default `['B1', 'B2']`); **Kind chips** (`nn` → `Nomen + Nomen`, `pp` → `Pronomen + Pronomen`, `mixed` → `Gemischt`, default all three); count presets; warning-when-0. Breadcrumb `Kapitel XIII · Dativ · Objektfolge`; title `Objektfolge<em>.</em>`; subtitle: `Dativ before Akkusativ by default — but two pronouns flip it: Ich gebe es ihm, never *Ich gebe ihm es. With one pronoun, the pronoun goes first.` `start()` query `{ count, levels, kinds }` → `dative-object-order-run`.

- [ ] **Step 5: Runner.** `src/modules/dative/ObjectOrderRunner.vue` — mirror Task 8's DitransitiveRunner (pick-only, NO ledger). Deltas: parse `kinds` (csv against `['nn', 'pp', 'mixed']`); `filterObjectOrderItems` → `buildObjectOrderCards`; prompt renders the stem + gap, the two option buttons carry the full continuations (`dem Kind das Buch` / `das Buch dem Kind`); above the options add the fixed hint line `Wie geht der Satz neutral weiter?` (`micro-mark`); feedback shows the full correct sentence (`current.prompt.replace('___', current.answers[0])`) + translation + note (the note explains why — for `nn` items the flip is marked rather than flatly ungrammatical, and the note text already says so). `recordRun()` as Task 8 with `type: 'dat-object-order'`, `meta: { levels: queriedLevels.value, kinds: queriedKinds.value }`. `item-label="sentences"`.

- [ ] **Step 6: Routes + catalogue.**

```ts
{ path: '/dative/object-order', name: 'dative-object-order', component: () => import('./modules/dative/ObjectOrderSetup.vue') },
{ path: '/dative/object-order/run', name: 'dative-object-order-run', component: () => import('./modules/dative/ObjectOrderRunner.vue') },
```

Append to the `id: 'ditransitive'` family's `cards` (after T7):

```ts
{
  code: 'T8', route: 'dative-object-order',
  title: 'Object order', de: 'Objektfolge', level: 'B1',
  desc: 'Dativ before Akkusativ by default — but Ich gebe es ihm: two pronouns flip the order.',
},
```

- [ ] **Step 7: GREEN + typecheck; commit** `feat(dative): T8 Objektfolge drill (family VI complete)`

---
### Task 10: T9 item bank — extend `dativeAdjectives.ts` + reachability

**Files:**
- Modify: `src/data/dativeAdjectives.ts` (phase 1 file — APPEND the item bank; keep every existing export untouched)
- Test: `tests/data/dativeAdjectiveItems.test.ts` (new file — do not touch phase 1's `tests/data/dativeAdjectives.test.ts` if it exists)

**Interfaces:**
- Consumes: the phase-1 `DATIVE_ADJECTIVES` record in the same file (keys = adjective lemmas — the ledger denominator reads `Object.keys(DATIVE_ADJECTIVES)`); `DativeDrillLevel` from `./dativeExperiencer`.
- Produces (Task 11 relies on): `interface DativeAdjectiveItem { id: string; adjective: string; level: DativeDrillLevel; prompt: string; cue: string; options: string[]; answers: string[]; translation: string; explanation: string }`, `DATIVE_ADJECTIVE_ITEMS` (≥24).

**Reconciliation rule (spec gate 8 — the meter is a lie without it):** every key of `DATIVE_ADJECTIVES` must appear in ≥1 T9 item, and every item's `adjective` must be a key of the record. After authoring the CORE items below: (a) if a core item's lemma is missing from the record, ADD that lemma to `DATIVE_ADJECTIVES`, copying the structural shape of an existing entry (open the file and match its fields exactly — phase 1 owns the shape) with an accurate gloss; (b) for each record key still uncovered, append the matching RESERVE item below; (c) if a record key matches no reserve item either, author ONE item for it in exactly the `DativeAdjectiveItem` shape (a `… ist ___ <adjektiv>. (cue)` frame with a pronoun/NP dative gap and a 2-option pick) and list it in your completion report. Never delete a record key.

- [ ] **Step 1: Invariant tests FIRST.** Create `tests/data/dativeAdjectiveItems.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { DATIVE_ADJECTIVES, DATIVE_ADJECTIVE_ITEMS } from '../../src/data/dativeAdjectives'
import { DATIVE_DRILL_LEVELS } from '../../src/data/dativeExperiencer'

describe('DATIVE_ADJECTIVE_ITEMS (T9)', () => {
  test('base: unique ids, known level, one gap, cue shown in prompt', () => {
    expect(new Set(DATIVE_ADJECTIVE_ITEMS.map(i => i.id)).size).toBe(DATIVE_ADJECTIVE_ITEMS.length)
    const bad = DATIVE_ADJECTIVE_ITEMS.filter(i =>
      !(DATIVE_DRILL_LEVELS as readonly string[]).includes(i.level)
      || (i.prompt.match(/___/g) ?? []).length !== 1
      || !i.prompt.includes(`(${i.cue})`)
      || i.translation.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('cross-ref: every item adjective is a DATIVE_ADJECTIVES key', () => {
    const keys = new Set(Object.keys(DATIVE_ADJECTIVES))
    const bad = DATIVE_ADJECTIVE_ITEMS.filter(i => !keys.has(i.adjective))
    expect(bad.map(i => `${i.id}:${i.adjective}`)).toEqual([])
  })

  test('REACHABILITY: every DATIVE_ADJECTIVES key appears in ≥1 item (ledger denominator)', () => {
    const covered = new Set(DATIVE_ADJECTIVE_ITEMS.map(i => i.adjective))
    const missing = Object.keys(DATIVE_ADJECTIVES).filter(k => !covered.has(k))
    expect(missing).toEqual([])
  })

  test('options: 2 unique, exactly one answer; the prompt never contains the answer', () => {
    const bad = DATIVE_ADJECTIVE_ITEMS.filter(i => {
      const esc = i.answers[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const leak = new RegExp(`(^|[^a-zäöüß])${esc}($|[^a-zäöüß])`, 'i').test(i.prompt)
      return i.options.length !== 2 || new Set(i.options).size !== 2
        || i.answers.length !== 1 || i.options.filter(o => i.answers.includes(o)).length !== 1 || leak
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floor: ≥20 items', () => {
    expect(DATIVE_ADJECTIVE_ITEMS.length).toBeGreaterThanOrEqual(20)
  })
})
```

- [ ] **Step 2: RED.** `npx vitest run tests/data/dativeAdjectiveItems.test.ts`.

- [ ] **Step 3: Author the bank.** Append to `src/data/dativeAdjectives.ts` (below phase 1's exports; add `import type { DativeDrillLevel } from './dativeExperiencer'` at the top):

```ts
// ─── T9 item bank (phase 3) — Dativ-Adjektive drill ───
// Every item's `adjective` keys into DATIVE_ADJECTIVES above; the reachability
// test demands the reverse too (every key drilled), because the item ledger's
// denominator counts these lemmas.

export interface DativeAdjectiveItem {
  id: string
  adjective: string         // key of DATIVE_ADJECTIVES
  level: DativeDrillLevel
  prompt: string            // one ___ where the dative NP/pronoun goes; ends with the (cue)
  cue: string               // dictionary form of the person, e.g. 'ich', 'der Chef'
  options: string[]         // exactly 2
  answers: string[]         // exactly 1 — the dative form
  translation: string
  explanation: string
}

export const DATIVE_ADJECTIVE_ITEMS: DativeAdjectiveItem[] = [
  // CORE items — always present.
  { id: 'da-wichtig-1', adjective: 'wichtig', level: 'B1',
    prompt: 'Deine Meinung ist ___ sehr wichtig. (ich)', cue: 'ich',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'Your opinion is very important to me.',
    explanation: 'wichtig nimmt die betroffene Person im Dativ: mir wichtig — important TO me.' },
  { id: 'da-wichtig-2', adjective: 'wichtig', level: 'B1',
    prompt: 'Pünktlichkeit ist ___ Chef sehr wichtig. (der Chef)', cue: 'der Chef',
    options: ['dem', 'den'], answers: ['dem'],
    translation: 'Punctuality is very important to the boss.',
    explanation: 'Die Person, für die etwas wichtig ist, steht im Dativ: dem Chef.' },
  { id: 'da-wichtig-3', adjective: 'wichtig', level: 'B1',
    prompt: 'Ist ___ die Umwelt wichtig? (ihr)', cue: 'ihr',
    options: ['euch', 'ihr'], answers: ['euch'],
    translation: 'Is the environment important to you (all)?',
    explanation: 'ihr wird im Dativ zu euch: Ist euch die Umwelt wichtig?' },
  { id: 'da-peinlich-1', adjective: 'peinlich', level: 'B1',
    prompt: 'Der Fehler ist ___ peinlich. (ich)', cue: 'ich',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'The mistake embarrasses me.',
    explanation: 'peinlich + Dativ: mir peinlich. Der englische Sog (embarrasses ME) zieht zum Akkusativ — widerstehen.' },
  { id: 'da-peinlich-2', adjective: 'peinlich', level: 'B2',
    prompt: 'Die Frage war ___ Studentin peinlich. (die Studentin)', cue: 'die Studentin',
    options: ['der', 'die'], answers: ['der'],
    translation: 'The question embarrassed the student.',
    explanation: 'Die Person, der etwas peinlich ist, steht im Dativ: der Studentin.' },
  { id: 'da-egal-1', adjective: 'egal', level: 'B1',
    prompt: 'Das Wetter ist ___ egal. (er)', cue: 'er',
    options: ['ihm', 'ihn'], answers: ['ihm'],
    translation: 'He does not care about the weather.',
    explanation: 'egal + Dativ: ihm egal — gleichgültig für ihn.' },
  { id: 'da-egal-2', adjective: 'egal', level: 'B1',
    prompt: 'Es ist ___ Bruder egal, was du denkst. (mein Bruder)', cue: 'mein Bruder',
    options: ['meinem', 'meinen'], answers: ['meinem'],
    translation: 'My brother does not care what you think.',
    explanation: 'egal nimmt den Dativ: meinem Bruder egal.' },
  { id: 'da-aehnlich-1', adjective: 'ähnlich', level: 'B1',
    prompt: 'Du bist ___ Vater sehr ähnlich. (dein Vater)', cue: 'dein Vater',
    options: ['deinem', 'deinen'], answers: ['deinem'],
    translation: 'You are very similar to your father.',
    explanation: 'ähnlich + Dativ: deinem Vater ähnlich — similar TO him.' },
  { id: 'da-aehnlich-2', adjective: 'ähnlich', level: 'B1',
    prompt: 'Der Sohn ist ___ Mutter ähnlich. (seine Mutter)', cue: 'seine Mutter',
    options: ['seiner', 'seine'], answers: ['seiner'],
    translation: 'The son resembles his mother.',
    explanation: 'Die Vergleichsperson steht im Dativ: seiner Mutter.' },
  { id: 'da-treu-1', adjective: 'treu', level: 'B2',
    prompt: 'Der Hund bleibt ___ Besitzerin treu. (seine Besitzerin)', cue: 'seine Besitzerin',
    options: ['seiner', 'seine'], answers: ['seiner'],
    translation: 'The dog stays loyal to its owner.',
    explanation: 'treu + Dativ: seiner Besitzerin treu — loyal TO her.' },
  { id: 'da-klar-1', adjective: 'klar', level: 'B1',
    prompt: 'Die Antwort ist ___ jetzt klar. (wir)', cue: 'wir',
    options: ['uns', 'wir'], answers: ['uns'],
    translation: 'The answer is clear to us now.',
    explanation: 'klar + Dativ: uns klar — clear TO us.' },
  { id: 'da-dankbar-1', adjective: 'dankbar', level: 'B1',
    prompt: 'Ich bin ___ Eltern sehr dankbar. (meine Eltern)', cue: 'meine Eltern',
    options: ['meinen', 'meine'], answers: ['meinen'],
    translation: 'I am very grateful to my parents.',
    explanation: 'dankbar + Dativ Plural: meinen Eltern dankbar.' },
  { id: 'da-dankbar-2', adjective: 'dankbar', level: 'B1',
    prompt: 'Wir sind ___ für die Hilfe dankbar. (ihr)', cue: 'ihr',
    options: ['euch', 'ihr'], answers: ['euch'],
    translation: 'We are grateful to you (all) for the help.',
    explanation: 'Die Person steht im Dativ (euch), die Sache hinter für.' },
  { id: 'da-bekannt-1', adjective: 'bekannt', level: 'B1',
    prompt: 'Diese Geschichte ist ___ bekannt. (sie, Plural)', cue: 'sie, Plural',
    options: ['ihnen', 'sie'], answers: ['ihnen'],
    translation: 'This story is known to them.',
    explanation: 'bekannt + Dativ: ihnen bekannt — known TO them.' },
  { id: 'da-bekannt-2', adjective: 'bekannt', level: 'B1',
    prompt: 'Der Name ist ___ Lehrerin bekannt. (die Lehrerin)', cue: 'die Lehrerin',
    options: ['der', 'die'], answers: ['der'],
    translation: 'The name is known to the teacher.',
    explanation: 'Wem etwas bekannt ist → Dativ: der Lehrerin.' },
  { id: 'da-fremd-1', adjective: 'fremd', level: 'B2',
    prompt: 'Die Stadt ist ___ noch fremd. (ich)', cue: 'ich',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'The city is still unfamiliar to me.',
    explanation: 'fremd + Dativ: mir fremd — foreign TO me.' },
  { id: 'da-recht-1', adjective: 'recht', level: 'B2',
    prompt: 'Der Termin ist ___ recht. (du)', cue: 'du',
    options: ['dir', 'dich'], answers: ['dir'],
    translation: 'The date suits you fine.',
    explanation: 'recht sein + Dativ: dir recht — fine BY you.' },
  { id: 'da-lieb-1', adjective: 'lieb', level: 'B2',
    prompt: 'Ihr seid ___ alle sehr lieb. (ich)', cue: 'ich',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'You are all very dear to me.',
    explanation: 'lieb + Dativ: mir lieb — dear TO me.' },
  { id: 'da-leid-1', adjective: 'leid', level: 'A2',
    prompt: 'Es tut ___ wirklich leid. (ich)', cue: 'ich',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I am really sorry.',
    explanation: 'leidtun nimmt die Person im Dativ: Es tut MIR leid, nie *mich.' },
  { id: 'da-kalt-1', adjective: 'kalt', level: 'A2',
    prompt: '___ ist kalt — mach bitte das Fenster zu. (ich)', cue: 'ich',
    options: ['Mir', 'Mich'], answers: ['Mir'],
    translation: 'I am cold — please close the window.',
    explanation: 'Befindens-Dativ: Mir ist kalt. *Ich bin kalt beschreibt den Charakter, nicht das Frieren.' },
  { id: 'da-warm-1', adjective: 'warm', level: 'A2',
    prompt: 'Ist ___ zu warm hier? (du)', cue: 'du',
    options: ['dir', 'dich'], answers: ['dir'],
    translation: 'Are you too warm in here?',
    explanation: 'Befindens-Dativ: Ist dir zu warm?' },
  { id: 'da-schlecht-1', adjective: 'schlecht', level: 'A2',
    prompt: '___ ist schlecht — ich brauche frische Luft. (ich)', cue: 'ich',
    options: ['Mir', 'Mich'], answers: ['Mir'],
    translation: 'I feel sick — I need fresh air.',
    explanation: 'Befindens-Dativ: Mir ist schlecht (Übelkeit), nicht *Ich bin schlecht.' },
  { id: 'da-langweilig-1', adjective: 'langweilig', level: 'B1',
    prompt: 'Ohne Freunde ist ___ langweilig. (das Kind)', cue: 'das Kind',
    options: ['dem Kind', 'das Kind'], answers: ['dem Kind'],
    translation: 'Without friends the child is bored.',
    explanation: 'Befindens-Dativ: dem Kind ist langweilig — the boredom belongs to a dative experiencer.' },
  { id: 'da-schwindelig-1', adjective: 'schwindelig', level: 'B1',
    prompt: 'Nach der Achterbahn ist ___ schwindelig. (sie, Singular)', cue: 'sie, Singular',
    options: ['ihr', 'sie'], answers: ['ihr'],
    translation: 'After the roller coaster she feels dizzy.',
    explanation: 'Befindens-Dativ: ihr ist schwindelig.' },

  // RESERVE items — append ONLY those whose lemma is a DATIVE_ADJECTIVES key
  // not already covered by the core items (reconciliation rule in the plan).
  // da-uebel-1:        'Nach dem fettigen Essen ist ___ übel. (er)'            → ['ihm', 'ihn'], 'ihm' — 'He feels queasy after the greasy food.' — 'Befindens-Dativ: ihm ist übel.'
  // da-boese-1:        'Bist du ___ noch böse? (ich)'                          → ['mir', 'mich'], 'mir' — 'Are you still mad at me?' — 'böse sein + Dativ: mir böse.'
  // da-behilflich-1:   'Der Verkäufer ist ___ Kundin gern behilflich. (die Kundin)' → ['der', 'die'], 'der' — 'The sales clerk is happy to assist the customer.' — 'behilflich + Dativ: der Kundin behilflich.'
  // da-gewachsen-1:    'Die Aufgabe ist schwer, aber du bist ___ gewachsen. (sie, die Aufgabe)' → ['ihr', 'sie'], 'ihr' — 'The task is hard, but you are up to it.' — 'gewachsen sein + Dativ: einer Sache gewachsen.'
  // da-gleichgueltig-1:'Seine Noten sind ___ nicht gleichgültig. (die Eltern)' → ['den Eltern', 'die Eltern'], 'den Eltern' — 'His grades are not a matter of indifference to the parents.' — 'gleichgültig + Dativ.'
  // da-sympathisch-1:  'Die neue Kollegin ist ___ sympathisch. (wir)'          → ['uns', 'wir'], 'uns' — 'We find the new colleague likeable.' — 'sympathisch + Dativ: uns sympathisch.'
  // da-vertraut-1:     'Diese Straßen sind ___ seit der Kindheit vertraut. (ich)' → ['mir', 'mich'], 'mir' — 'These streets have been familiar to me since childhood.' — 'vertraut + Dativ.'
  // da-willkommen-1:   'Jede Hilfe ist ___ willkommen. (wir)'                  → ['uns', 'wir'], 'uns' — 'Any help is welcome to us.' — 'willkommen + Dativ.'
  // da-nah-1:          'Diese Themen sind ___ besonders nah. (sie, Singular)'  → ['ihr', 'sie'], 'ihr' — 'These topics are especially close to her heart.' — 'nah + Dativ: jemandem nah.'
  // da-verbunden-1:    'Ich bin ___ sehr verbunden. (Sie, formell)'            → ['Ihnen', 'Sie'], 'Ihnen' — 'I am much obliged to you.' — 'verbunden + Dativ (gehoben): Ihnen verbunden.'
  // da-heiss-1:        'Ist ___ zu heiß in der Jacke? (du)'                    → ['dir', 'dich'], 'dir' — 'Are you too hot in that jacket?' — 'Befindens-Dativ: dir ist heiß.'
  // da-schuldig-1:     'Er ist ___ noch eine Antwort schuldig. (ich)'          → ['mir', 'mich'], 'mir' — 'He still owes me an answer.' — 'schuldig + Dativ der Person.'
  // da-ueberlegen-1:   'Die Gastgeber waren ___ deutlich überlegen. (die Gäste)' → ['den Gästen', 'die Gäste'], 'den Gästen' — 'The hosts were clearly superior to the visitors.' — 'überlegen + Dativ.'
]
```

Each reserve line above expands into a full `DativeAdjectiveItem` literal in the same shape as the core items (id, adjective = the lemma in the id, level `'B2'` except `da-heiss-1`/`da-uebel-1` at `'B1'`, prompt/cue/options/answers/translation/explanation exactly as given). Expand ONLY the ones the reconciliation rule calls for; leave the rest as comments so a future lemma addition finds its item waiting.

- [ ] **Step 4: Reconcile.** Run the reachability test; apply the reconciliation rule (a)/(b)/(c) until it is green. Record in the completion report which lemmas were added to `DATIVE_ADJECTIVES` and which reserves were expanded.
- [ ] **Step 5: GREEN + typecheck.** `npx vitest run tests/data/dativeAdjectiveItems.test.ts tests/data/dativeAdjectives.test.ts` (phase 1's tests must stay green) → PASS; `npm run typecheck` → PASS.
- [ ] **Step 6: Commit** `feat(dative): T9 adjective item bank with reachability gate`

---

### Task 11: T9 drill — Dativ-Adjektive (`dat-adjective`) + phase gates

**Files:**
- Modify: `src/composables/useDativeDrill.ts` (builder + filter), `src/router.ts` (2 routes), `src/data/drillCatalogue.ts` (family VII)
- Create: `src/modules/dative/AdjectiveSetup.vue`, `src/modules/dative/AdjectiveRunner.vue`
- Test: `tests/modules/dative/AdjectiveRunner.test.ts`

**Interfaces:**
- Consumes: `DATIVE_ADJECTIVES`, `DATIVE_ADJECTIVE_ITEMS`, `type DativeAdjectiveItem` (Task 10); `useDativeQuiz`; `bumpDativeLedger`; `shuffle`; `saveQuizRun`; `csv`.
- Produces: routes `dative-adjectives` / `dative-adjectives-run`; records type `'dat-adjective'`; `buildAdjectiveCards(items: DativeAdjectiveItem[]): DativeQuizCard[]`, `filterAdjectiveItems(f: { levels: DativeDrillLevel[]; adjectives: string[] }): DativeAdjectiveItem[]`.
- **Ledger: bumps, keyed by the adjective LEMMA** (`ledgerKey: item.adjective`) — the ~12 adjectives are ledger items alongside the ~45 verbs.

- [ ] **Step 1: Failing runner test.** `tests/modules/dative/AdjectiveRunner.test.ts` — Task 3's skeleton, router names `dative-adjectives-run`/`dative-adjectives`/`dative`; `QUERY = { count: '1', levels: 'A2,B1,B2,C1', adjectives: Object.keys(DATIVE_ADJECTIVES).join(',') }` (import both bank + record); `FIRST = DATIVE_ADJECTIVE_ITEMS[0]`. Mode: pick (2 options). Assertions: wrong pick reveals `FIRST.answers[0]` + explanation; records once `{ type: 'dat-adjective', count: 1 }`; ledger bumped once with `(FIRST.adjective, false, expect.any(Number))` — the LEMMA, not the inflected answer; retry not re-recorded.

- [ ] **Step 2: RED.**

- [ ] **Step 3: Builder + filter.** Append to `useDativeDrill.ts` (import `DATIVE_ADJECTIVE_ITEMS, type DativeAdjectiveItem` from `../data/dativeAdjectives`):

```ts
export function buildAdjectiveCards(items: DativeAdjectiveItem[]): DativeQuizCard[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.prompt,
    answers: item.answers,
    options: item.options,
    translation: item.translation,
    note: item.explanation,
    ledgerKey: item.adjective,   // ledger item = the LEMMA, not the inflected form
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function filterAdjectiveItems(f: { levels: DativeDrillLevel[]; adjectives: string[] }): DativeAdjectiveItem[] {
  return DATIVE_ADJECTIVE_ITEMS.filter(i => f.levels.includes(i.level) && f.adjectives.includes(i.adjective))
}
```

- [ ] **Step 4: Setup.** `src/modules/dative/AdjectiveSetup.vue` — mirror CompoundSetup: `STORAGE_KEY = 'datAdjectiveSetup'`; Level chips (default `['A2', 'B1']`); **Adjective chips** — one per `Object.keys(DATIVE_ADJECTIVES)` (label = lemma, default all, All/None); count presets; warning-when-0 via `filterAdjectiveItems`. Breadcrumb `Kapitel XIII · Dativ · Dativ-Adjektive`; title `Dativ-Adjektive<em>.</em>`; subtitle: `mir ist kalt · das ist mir wichtig / peinlich / egal — a dozen adjectives govern the dative with no verb in sight. Produce the dative the adjective demands.` `start()` query `{ count, levels, adjectives }` → `dative-adjectives-run`.

- [ ] **Step 5: Runner.** `src/modules/dative/AdjectiveRunner.vue` — mirror Task 3's SubjectRunner (pick-only, 2 options, WITH the ledger-coupled `recordRun`): parse `adjectives` (csv against `Object.keys(DATIVE_ADJECTIVES)`) + `levels`; `filterAdjectiveItems` → `buildAdjectiveCards`; `type: 'dat-adjective'`, `meta: { levels: queriedLevels.value, adjectives: queriedAdjectives.value }`; feedback: filled prompt + translation + note. End/back → `dative-adjectives`. `item-label="cards"`.

- [ ] **Step 6: Routes + catalogue.**

```ts
{ path: '/dative/adjectives', name: 'dative-adjectives', component: () => import('./modules/dative/AdjectiveSetup.vue') },
{ path: '/dative/adjectives/run', name: 'dative-adjectives-run', component: () => import('./modules/dative/AdjectiveRunner.vue') },
```

Append to `DAT_FAMILIES` after the `id: 'ditransitive'` family:

```ts
{
  id: 'adjectives', numeral: 'VII', heading: 'Dative without a verb', de: 'Dativ ohne Objekt',
  blurb: 'A dozen adjectives govern the dative on their own — mir ist kalt, das ist mir wichtig.',
  cards: [
    {
      code: 'T9', route: 'dative-adjectives',
      title: 'Dative adjectives', de: 'Dativ-Adjektive', level: 'B1',
      desc: 'mir ist kalt · das ist mir peinlich / egal / ähnlich / treu / klar — produce the dative the adjective demands.',
    },
  ],
},
```

- [ ] **Step 7: Phase gates.** Full `npx vitest run` → green (known ThemeToggle order-dependent flake: if it is the sole failure, rerun to confirm and proceed); `npm run typecheck` → green.
- [ ] **Step 8: Commit** `feat(dative): T9 Dativ-Adjektive drill (family VII) — phase 3 complete`

---

### Controller wrap-up (not a subagent task)

- [ ] Final whole-branch review — **the German audit of all ~130 authored items is the highest-value pass** (agreement in every T4/T5 item, twin-case contrasts, n-noun declensions like `dem Jungen`/`den Kollegen`, object-order continuations) + ONE fix wave + scoped re-review.
- [ ] Playwright 390px probe: drive one card on each of the six runners from its setup page (both a pick drill and the T5 type drill), verify the hub's family panels IV–VII render with mastery bands, no horizontal overflow, both themes spot-checked once.
- [ ] Merge `feat/phase3-dative-families-iv-vii` → main; full suite green on merged main; version bump + changelog entry per the house release ritual (number decided now, given whatever phases landed first); `npm run deploy` + push per ritual.

---

## Plan self-review (author's check against the spec)

- **Spec coverage:** family IV → Tasks 2–4 (T4 `dat-subject`, T5 `dat-experiencer`, gate 4 in Task 2); family V → Tasks 5–6 (T6 `dat-twin`, twin gate); family VI → Tasks 7–9 (T7 `dat-ditrans`, T8 `dat-object-order`, both band-only); family VII → Tasks 10–11 (T9 `dat-adjective`, reachability for the adjective half of gate 8). Coverage floors ≥20 per bank enforced in every data test.
- **Pinned interfaces:** only consumed, never redefined (`bumpDativeLedger`, `gradeDativeAnswer`, `DATIVE_VERBS`, `DAT_FAMILIES`, the `dat-*` history types).
- **Known open risk, by design:** Task 10's reconciliation with the phase-1 `DATIVE_ADJECTIVES` record is the one place the executor exercises bounded judgment (parallel-planned file); the rule is explicit and the reachability test is the arbiter.
- **Type consistency:** `DativeQuizCard`/`useDativeQuiz` (Task 1) consumed by every builder; `DativeDrillLevel` defined once in Task 2 and imported everywhere; `objectOrderAnswer` defined in Task 7, consumed in Task 9's builder and tests.
