# Phase 4 — Da-Compounds People-vs-Things Drills (T8–T10) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Family D ships — T8 forced-choice transformation (thing → da-compound, person → prep+pronoun), T9 wo-question formation (gap-constrained), T10 dialogue completion — offline, deterministic, recording Runs (spec §7 Phase 4).

**Architecture:** Three small authored datasets keyed to collocations, answers DERIVED: T8 reuses `PRONOUN_FORMS` (from `daPersonCase.ts`) + `daCompound`; T9/T10 use `woCompound` + a `PERSON_QUESTION = { accusative: 'wen', dative: 'wem' }` map. T8 pick options are always the animacy+case triple `[daCompound(prep), `${prep} ${acc-pronoun}`, `${prep} ${dat-pronoun}`]` (dedup'd when acc=dat) — one option set tests both the rule and the case (deliberate refinement of the spec's darüber/über ihn/über sie example). Everything else follows the now-standard module patterns (pool join, chips, once-only recording, RetryModal).

## Global Constraints

- Branch `feat/phase4-dacompounds-person` off `main`; controller merges/releases v1.12.5 (kind 'polish').
- Routes: `dacompounds-transform(-run)`, `dacompounds-wo-question(-run)`, `dacompounds-dialogue(-run)`; paths `/da-compounds/transform|wo-question|dialogue(/run)`.
- History ids exactly: `'dac-transform'`, `'dac-wo-question'`, `'dac-dialogue'`. Labels EN/DE (module 'Da-Compounds'): 'Da-compounds · thing or person'/'Da-Compounds · Sache oder Person'; 'Da-compounds · wo-questions'/'Da-Compounds · W-Fragen'; 'Da-compounds · dialogue'/'Da-Compounds · Dialog'.
- Recording/meta/retry rules as Phases 2-3 (`{ levels, roles, preps }` (+`mode` on T8)).
- Answers derived, never authored. German gates: person objects are unambiguous PERSONS with a natural cue pronoun; thing objects THINGS; **invariant from day one: cue 'es' never pairs with an accusative collocation** (Phase 3's Critical, now structural).
- Home group `{ heading: 'People vs things', de: 'Sache oder Person' }` between 'Case tests' and 'Reference'; numerals 'T8'/'T9'/'T10'.
- Gates: `npx vitest run --testTimeout=30000` (+ one flake rerun) + `npm run typecheck`. Never touch dist/. Controller probes 390px.
- Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Authored datasets ×3 (opus)

**Files:** Create `src/data/daTransform.ts`, `src/data/daWoQuestion.ts`, `src/data/daDialogue.ts`; tests `tests/data/daTransform.test.ts`, `daWoQuestion.test.ts`, `daDialogue.test.ts` (mirror `tests/data/daPersonCase.test.ts` structure — invariants FIRST).

**Interfaces (Tasks 2-4 rely on exact names):**

```ts
// daTransform.ts — T8
import { PRONOUN_FORMS, type PronounCue } from './daPersonCase'
export interface TransformItem {
  id: string              // 'tr-<collocationId>'
  collocationId: string
  sentence: string        // contains `object` exactly once
  object: string          // the replaceable phrase, e.g. 'an Karl' | 'nach dem Preis' (INCLUDES the preposition)
  objectKind: 'thing' | 'person'
  personCue?: PronounCue  // person items only
  level: CollocationLevel
}
export const DA_TRANSFORM: TransformItem[]  // ≥60, ≥25 each kind, one per collocation
export function transformAnswer(item: TransformItem): string
// thing → daCompound(colloc.preposition); person → `${prep} ${PRONOUN_FORMS[cue][colloc.case]}`

// daWoQuestion.ts — T9
export const PERSON_QUESTION = { accusative: 'wen', dative: 'wem' } as const
export interface WoQuestionItem {
  id: string              // 'wq-<collocationId>'
  collocationId: string
  statement: string       // uses the collocation with the object
  objectKind: 'thing' | 'person'
  scaffold: string        // question with the gap FIRST: '___ hast du Angst?'
  level: CollocationLevel
}
export const DA_WO_QUESTION: WoQuestionItem[]  // ≥50, ≥30 thing / ≥18 person
export function woQuestionAnswer(item: WoQuestionItem): string
// thing → capitalize(woCompound(prep)) e.g. 'Wovor'; person → `${capitalize(prep)} ${PERSON_QUESTION[colloc.case]}` e.g. 'Auf wen'

// daDialogue.ts — T10 (things only)
export interface DialogueItem {
  id: string              // 'dl-<collocationId>'
  collocationId: string
  questionScaffold: string // '___ wartest du denn schon so lange?'
  answerScaffold: string   // 'Ich warte ___, dass endlich Ferien sind.'
  level: CollocationLevel
}
export const DA_DIALOGUE: DialogueItem[]  // ≥40
export function dialogueAnswers(item: DialogueItem): { wo: string; da: string }
// { wo: capitalize(woCompound(prep)), da: daCompound(prep) }
```

Authoring rules: one item per collocation per file; person objects = named people/roles with obvious cue (*Karl* → er, *die Nachbarin* → sie, *meine Eltern* → sie (Plural), *das Kind* → es ONLY on dative collocations); T8 `object` includes the preposition and appears verbatim once in `sentence`; T9 scaffolds start with `___ ` and contain no preposition; T10 answer scaffolds continue with a dass-/zu-clause or natural continuation; natural idiomatic German, levels copied from collocations.

Invariants (per file, plus): T8 — object-in-sentence-once, person↔cue presence, kind floors, **cue 'es' × accusative forbidden**, `transformAnswer` spot-checks both kinds; T9 — single leading gap, statement contains prep (contraction list from `tests/data/daSubstitution.test.ts`), scaffold lacks prep, kind floors, answer spot-checks ('Wovor', 'Auf wen', a dative 'Mit wem'); T10 — one gap per scaffold, question gap first, neither scaffold contains its derived answer, count floor.

- [ ] Invariant tests → RED → tables/helpers + authored items (batches of ~15 + focused test; final slow German pass) → GREEN → full gates → **Commit** `feat(da-compounds): transform + wo-question + dialogue datasets (authored, derived answers)`

---

### Task 2: History plumbing (3 types) + T8 transform drill (sonnet)

**Files:** the five TS-enforced records; create `src/composables/useDaTransformQuiz.ts`, `src/modules/da-compounds/TransformSetup.vue`, `TransformRunner.vue`; router (2 routes); home (new group + T8 card); tests (engine + runner + labels extension).

Engine: pool join/filter (levels/roles/preps) as `useDaPersonCaseQuiz.ts`; question exposes sentence split around `object` (exact indexOf — no heuristics) for bolding; **pick options** = the animacy+case triple above, dedup'd, shuffled; correct = `transformAnswer`; **type mode** = `checkText(input, answer, alternatives)` where alternatives derive from `alsoAccept` (thing → alt compounds; person → `${alt.preposition} ${PRONOUN_FORMS[cue][alt.case]}`). Runner: sentence with object bolded, prompt "Ersetzen: Sache → da-Wort, Person → Präposition + Pronomen"; reveal names kind + answer + coreIdeaExplanation on wrong; records `'dac-transform'` meta `{ levels, roles, preps, mode }`. Setup: chips + mode toggle + count, localStorage `'dacTransformSetup'`. Card: 'Thing or person?' / de 'Sache oder Person'. Engine tests incl.: thing item option triple contains the compound + both pronoun-case forms; person item graded on case; dedup collapse (wir); type accepts alsoAccept alternative. Runner tests: records once + retry never + object bolded.

- [ ] Tests → RED → implement → GREEN → gates → **Commit** `feat(da-compounds): T8 thing-or-person transform drill + history plumbing`

---

### Task 3: T9 wo-question drill (sonnet)

**Files:** create `src/composables/useDaWoQuestionQuiz.ts`, `WoQuestionSetup.vue`, `WoQuestionRunner.vue`; router; home T9 card ('Wo-questions' / de 'W-Fragen'); tests.

Engine: type-only; answer = `woQuestionAnswer`; alternatives from `alsoAccept` (same derivation split by kind). Runner: statement shown (object NOT highlighted — the learner must decide animacy themselves; this is deliberate), scaffold below with the leading gap as input; reveal shows the full question + rule reminder ("Sache → wo(r)-, Person → Präposition + wen/wem"); records `'dac-wo-question'` meta `{ levels, roles, preps }`. Setup: chips + count, localStorage `'dacWoQuestionSetup'`. Tests: engine derivations (thing/person/dative person), folded input ('worueber'), runner records once/retry never.

- [ ] Tests → RED → implement → GREEN → gates → **Commit** `feat(da-compounds): T9 wo-question drill`

---

### Task 4: T10 dialogue drill + release prep (sonnet)

**Files:** create `src/composables/useDaDialogueQuiz.ts`, `DialogueSetup.vue`, `DialogueRunner.vue`; router; home T10 card ('Dialogue' / de 'Dialog'); changelog + package.json v1.12.5; tests.

Engine: two graded inputs per card (`submitBoth(wo, da)`), each via `checkText` (alternatives from alsoAccept alt-preps: wo-form and da-form respectively); card correct = BOTH correct (all-or-nothing, Stammformen precedent); per-slot verdicts exposed for the reveal. Runner: dialogue layout (question line with input, answer line with input), single Submit, reveal shows both filled lines with per-slot ✓/✗; records `'dac-dialogue'` meta `{ levels, roles, preps }`; count = cards. Setup: chips + count, localStorage `'dacDialogueSetup'`. Release: package.json 1.12.5 + `npm install --package-lock-only`; changelog `APP_VERSION = '1.12.5'` + prepend:

```ts
{
  version: '1.12.5', date: '2026-07-23', kind: 'polish',
  title: 'Da-Compounds · people vs. things',
  notes: [
    '<strong>The signature rule gets its own family.</strong> <em>T8 Thing or person?</em> — replace the object: <em>an Karl</em> → <em>an ihn</em>, but <em>nach dem Preis</em> → <em>danach</em>; the options test the rule and the pronoun case at once. <em>T9 Wo-questions</em> — ask after it: <em>Wovor hast du Angst?</em> for things, <em>Auf wen wartest du?</em> for people. <em>T10 Dialogue</em> — the full pairing: <em>Worauf wartest du? — Ich warte darauf, dass …</em>',
    '<strong>150+ new hand-written sentences</strong>, every answer derived from the collocation\'s stored preposition and case — with the Phase-3 lesson baked in as a permanent invariant: no card can ever pair <em>es</em> with an accusative preposition (<em>*auf es</em> is not German).'
  ]
},
```

- [ ] Tests → RED → implement → GREEN → full gates → **Commit** `feat(da-compounds): T10 dialogue drill; v1.12.5`

---

### Controller wrap-up (not a subagent task)

- [ ] Final whole-branch review (fable; German audit of all three datasets — person/thing kind truth, cue naturalness, scaffold idiomaticity — is the priority) + controller-inline fix wave
- [ ] CDP 390px probe (3 runner pages + home) + one visual screenshot
- [ ] Merge → main (`v1.12.5`), `npm run deploy`, `git push origin main`
