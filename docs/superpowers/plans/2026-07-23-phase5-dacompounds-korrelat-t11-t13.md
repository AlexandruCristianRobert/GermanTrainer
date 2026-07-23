# Phase 5 — Da-Compounds Korrelat Drills (T11–T13) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Family E ships — T11 Korrelat completion, T12 paraphrase pairs, T13 meaning contrast — offline, deterministic, recording Runs (spec §7 Phase 5).

**Architecture:** Three authored datasets. T11 items carry a `korrelat` status (`obligatory | optional | excluded`); the answer compound derives from the item's collocation (or an explicit `preposition` for verbs absent from COLLOCATIONS, e.g. *es kommt an auf*); excluded items (wissen/glauben/sagen/denken=meinen …) carry neither. **T11 is pick-only** — options are three compounds + a "— kein Korrelat" choice; `optional` items grade BOTH the compound and "kein Korrelat" correct, with the reveal teaching the status (obligatorisch/fakultativ/ausgeschlossen). This deliberately narrows the spec's "type or pick": typing cannot express "nothing here" cleanly. T12 is a two-slot all-or-nothing card (T10 dialogue engine precedent): preposition gap in the noun-phrase sentence, Korrelat gap in the clause sentence, both derived. T13 drills bare-preposition choice by meaning over `CONTRAST_SETS` (word + 2-3 prepositions each with a one-line sense); options = the set's prepositions.

## Global Constraints

- Branch `feat/phase5-dacompounds-korrelat` off `main`; controller merges/releases v1.12.6 (kind 'polish').
- Routes: `dacompounds-korrelat(-run)`, `dacompounds-paraphrase(-run)`, `dacompounds-contrast(-run)`; paths `/da-compounds/korrelat|paraphrase|contrast(/run)`.
- History ids exactly: `'dac-korrelat'`, `'dac-paraphrase'`, `'dac-contrast'`. Labels EN/DE (module 'Da-Compounds'): 'Da-compounds · Korrelat'/'Da-Compounds · Korrelat'; 'Da-compounds · paraphrase'/'Da-Compounds · Umformung'; 'Da-compounds · meaning contrast'/'Da-Compounds · Bedeutungskontrast'.
- Recording/meta/retry rules as before; T11 meta `{ levels, kinds }` (the korrelat-status filter), T12/T13 meta `{ levels, preps }` / `{ levels }`.
- Answers derived; German gate: T11 clause sentences must be natural with AND without the compound for `optional`, natural only WITH for `obligatory`, and natural only WITHOUT for `excluded` (the defining property — the reviewer will read them that way). T12 pairs must be true paraphrases. T13 sentences must force exactly one preposition by meaning.
- Home group `{ heading: 'Korrelat & meaning', de: 'Korrelat' }` between 'People vs things' and 'Reference'; numerals 'T11' ('Korrelat', de 'darauf, dass …'), 'T12' ('Paraphrase', de 'Umformung'), 'T13' ('Meaning contrast', de 'auf oder über?').
- Gates: `npx vitest run --testTimeout=30000` (+ one flake rerun) + `npm run typecheck`. Never touch dist/. Controller probes 390px. Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Authored datasets ×3 (opus)

**Files:** Create `src/data/daKorrelat.ts`, `src/data/daParaphrase.ts`, `src/data/daContrast.ts`; tests `tests/data/daKorrelat.test.ts`, `daParaphrase.test.ts`, `daContrast.test.ts` (invariants FIRST; mirror `tests/data/daDialogue.test.ts`).

**Interfaces (Tasks 2-4 rely on exact names):**

```ts
// daKorrelat.ts — T11
export type KorrelatStatus = 'obligatory' | 'optional' | 'excluded'
export interface KorrelatItem {
  id: string                 // 'ko-<slug>'
  korrelat: KorrelatStatus
  collocationId?: string     // obligatory/optional: exactly one of collocationId|preposition
  preposition?: string       //   (explicit prep for verbs not in COLLOCATIONS)
  sentence: string           // one '___' directly before the comma + dass/ob/zu/w- clause
  explanation: string        // one German+English line the reveal teaches, names the verb + status
  level: CollocationLevel
}
export const DA_KORRELAT: KorrelatItem[]   // ≥45: ≥15 obligatory, ≥15 optional, ≥12 excluded
export function korrelatAnswer(item: KorrelatItem): string | null  // compound via daCompound, or null for excluded

// daParaphrase.ts — T12
export interface ParaphraseItem {
  id: string                 // 'pp-<collocationId>'
  collocationId: string
  nounSentence: string       // prep gap: 'Ich kümmere mich ___ die Einhaltung des Termins.'
  clauseSentence: string     // Korrelat gap: 'Ich kümmere mich ___, dass der Termin eingehalten wird.'
  level: CollocationLevel
}
export const DA_PARAPHRASE: ParaphraseItem[]  // ≥40
export function paraphraseAnswers(item: ParaphraseItem): { prep: string; korrelat: string }

// daContrast.ts — T13
export interface ContrastOption { preposition: string; sense: string }  // sense: short German+EN hook
export interface ContrastSet { key: string; word: string; options: ContrastOption[] }  // 2-3 options
export const CONTRAST_SETS: ContrastSet[]   // ≥6 sets: sich freuen auf/über, leiden an/unter, bestehen auf/aus, kämpfen für/gegen/um, sich beschweren bei/über, sich bewerben bei/um (+ more if natural)
export interface ContrastItem {
  id: string                 // 'ct-<key>-<n>'
  contrastKey: string
  sentence: string           // one '___'; the context forces exactly one option
  correct: string            // ∈ that set's prepositions
  level: CollocationLevel
}
export const DA_CONTRAST: ContrastItem[]    // ≥36, ≥4 per set
```

Authoring rules: T11 obligatory verbs (bestehen darauf, es kommt darauf an, sich darauf verlassen, davon abhängen, sich darum kümmern, dazu neigen, davon ausgehen, sich dafür einsetzen…), optional (sich (daran) erinnern, sich (darüber/darauf) freuen, (darauf) hoffen, (davon) träumen, (damit) rechnen, sich (darüber) ärgern…), excluded (wissen, glauben=meinen, sagen, denken=meinen, finden, behaupten, hoffen? NO — hoffen is optional; use meinen, versprechen, vergessen, bedauern? — verbs taking plain dass with NO fixed preposition). T12: clauseSentence's clause restates nounSentence's noun phrase truthfully. T13 sentences: temporal/semantic cues force the preposition (nächste Woche → auf; das Geschenk von gestern → über).

Invariants: T11 — status floors; exactly-one-of collocationId/preposition for non-excluded, neither for excluded; one gap right before ', dass|, ob|, zu |, wie '-ish clause (regex `/___,? ?,/`? keep simple: sentence contains '___' once and contains one of ', dass'/', ob'/', wie'/'zu '); `korrelatAnswer` spot-checks incl. null for excluded; explanation non-empty. T12 — join exists, one gap per sentence, clauseSentence contains a clause marker, nounSentence gap fills with the prep naturally (answers spot-check). T13 — correct ∈ set options, ≥4 items/set, every set ≥2 options with non-empty senses, one gap.

- [ ] Invariant tests → RED → author (batches + focused tests; final slow German pass — for every T11 item read the sentence aloud WITH and WITHOUT the compound and confirm the status label is true) → GREEN → full gates → **Commit** `feat(da-compounds): Korrelat + paraphrase + contrast datasets (authored, derived answers)`

---

### Task 2: History plumbing (3 types) + T11 Korrelat drill (sonnet)

**Files:** five TS-enforced records; create `src/composables/useDaKorrelatQuiz.ts`, `KorrelatSetup.vue`, `KorrelatRunner.vue`; router; home (new group + T11 card); tests (engine + runner + labels).

Engine: pick-only. Constant `export const KEIN_KORRELAT = '— kein Korrelat'`. Options: for every item = `[compound-or-3-distractors…, KEIN_KORRELAT]` → concretely: obligatory/optional → `shuffle([answer, d1, d2, KEIN_KORRELAT])` (d1/d2 = distinct compounds of other preps via `daCompound`); excluded → `shuffle([KEIN_KORRELAT, c1, c2, c3])` (3 plausible compounds). Grading: obligatory → only the answer; excluded → only KEIN_KORRELAT; **optional → answer OR KEIN_KORRELAT both correct**. Question exposes `status` + `explanation` for the reveal (reveal ALWAYS shows the explanation — the teaching payload — plus, for optional, "beides richtig: fakultatives Korrelat"). Setup: chips levels + status kinds (obligatorisch/fakultativ/ausgeschlossen; values `obligatory|optional|excluded`), count; localStorage `'dacKorrelatSetup'`; meta `{ levels, kinds }`. Records `'dac-korrelat'`. Tests: option composition per status; optional dual-accept; excluded accepts only KEIN; records once/retry never.

- [ ] Tests → RED → implement → GREEN → gates → **Commit** `feat(da-compounds): T11 Korrelat drill + history plumbing`

---

### Task 3: T12 paraphrase drill (sonnet)

**Files:** create `src/composables/useDaParaphraseQuiz.ts`, `ParaphraseSetup.vue`, `ParaphraseRunner.vue`; router; home T12 card; tests.

Engine: two-input all-or-nothing (mirror `useDaDialogueQuiz.ts`): `submitBoth(prepInput, korrelatInput)`; slot 1 graded vs `answers.prep` (+ alsoAccept alt preps), slot 2 vs `answers.korrelat` (+ alt compounds); per-slot verdicts. Runner: both sentences stacked (noun-phrase version first) each with its gap input (≥16px font, aria-labels — the Phase 4 lessons), one Submit, per-slot reveal + coreIdeaExplanation on wrong; records `'dac-paraphrase'` meta `{ levels, preps }`. Setup: chips levels/preps + count; localStorage `'dacParaphraseSetup'`. Tests: both-correct/one-wrong; folded input; alternatives; records once/retry never.

- [ ] Tests → RED → implement → GREEN → gates → **Commit** `feat(da-compounds): T12 paraphrase drill`

---

### Task 4: T13 contrast drill + release prep (sonnet)

**Files:** create `src/composables/useDaContrastQuiz.ts`, `ContrastSetup.vue`, `ContrastRunner.vue`; router; home T13 card; changelog + package.json v1.12.6; tests.

Engine: options = the item's set's prepositions (2-3 buttons, keyboard digits), correct = `item.correct`; reveal shows EVERY option with its sense line (the teaching moment: 'auf — Vorfreude auf Kommendes / über — Freude über Vorhandenes') and highlights the right one. Setup: chips levels (+ set filter? NO — YAGNI) + count; localStorage `'dacContrastSetup'`; records `'dac-contrast'` meta `{ levels }`. Release: package.json 1.12.6 + `npm install --package-lock-only`; changelog `APP_VERSION = '1.12.6'` + prepend:

```ts
{
  version: '1.12.6', date: '2026-07-23', kind: 'polish',
  title: 'Da-Compounds · Korrelat, the B2 flagship',
  notes: [
    '<strong>Three drills on the pointing compound.</strong> <em>T11 Korrelat</em> — darauf, dass …: obligatory for some verbs (<em>Er besteht darauf, dass …</em>), optional for others, and plain wrong for <em>wissen/glauben/sagen</em> — the "— kein Korrelat" option keeps you honest, and optional verbs accept both readings. <em>T12 Paraphrase</em> — the same thought twice: <em>um die Einhaltung des Termins</em> ↔ <em>darum, dass der Termin eingehalten wird</em>. <em>T13 Meaning contrast</em> — one verb, two prepositions, different meanings: <em>freuen auf</em> (ahead) vs. <em>über</em> (at hand), <em>leiden an</em> vs. <em>unter</em>, <em>bestehen auf</em> vs. <em>aus</em>.',
    '<strong>120+ new hand-written items</strong> with derived answers and a reveal that always explains the rule — every T11 sentence was checked to read naturally exactly as its status claims (with, with-or-without, or only without the compound).'
  ]
},
```

- [ ] Tests → RED → implement → GREEN → full gates → **Commit** `feat(da-compounds): T13 meaning-contrast drill; v1.12.6`

---

### Controller wrap-up (not a subagent task)

- [ ] Final whole-branch review (fable; German audit — T11 status truth read WITH/WITHOUT the compound per item, T12 paraphrase equivalence, T13 forced-choice unambiguity — is the priority) + controller-inline fix wave
- [ ] CDP 390px probe (3 runner pages + home) + one visual screenshot
- [ ] Merge → main (`v1.12.6`), `npm run deploy`, `git push origin main`
