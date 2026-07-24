# Phase 7 — Da-Compounds Production Drills (T16–T17) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Family F completes — T16 sentence assembly (offline tiles) and T17 answer-the-question (AI) — recording Runs (spec §7 Phase 7).

**Architecture:** T16: an authored dataset of tile sets in canonical order plus curated accepted permutations (fronting variants); the engine grades the tapped **index sequence** (never strings), so capitalization can't break — tiles are authored lowercase-initial (nouns capitalized internally) and the UI uppercases the first letter of the assembled sentence at render. T17: a new engine `useDaAnswerQuiz.ts` reuses Phase 6's spec machinery (`CollocRef`, `buildDacSpecs`, noun themes); generation writes one natural German du-QUESTION per collocation (+ an `exampleAnswer` for the reveal); the learner types a free German answer; AI grading accepts Mittelfeld and fronted compound placement plus ja/nein phrasings, tagging with `DacErrorTag` **extended by `'word-order'`**. Weak points extend to `'dac-answer'` entries.

## Global Constraints

- Branch `feat/phase7-dacompounds-production` off `main`; controller merges/releases v1.12.8 (kind 'polish').
- Routes: `dacompounds-assembly(-run)` (`/da-compounds/assembly(/run)`), `dacompounds-answer(-run)` (`/da-compounds/answer(/run)`).
- History ids exactly `'dac-assembly'`, `'dac-answer'`. Labels: 'Da-compounds · assembly'/'Da-Compounds · Satzbau'; 'Da-compounds · answer (AI)'/'Da-Compounds · Antworten (KI)'; module 'Da-Compounds'.
- `DacErrorTag` gains `'word-order'` (compound/verb placement). Both parse filters accept the full 6-tag set; only T17's grading prompt defines/asks for `word-order`. `computeDacWeakPoints` extends: entries of type `'dac-sentence'` (meta.dacSentenceItems) OR `'dac-answer'` (meta.dacAnswerItems); `word-order` joins the colloc fault-tag set. New meta: `dacAnswerLevels?, dacAnswerRoles?, dacAnswerPreps?, dacAnswerGroups?: string[]`, `dacAnswerHints?: boolean`, `dacAnswerItems?: DacDrillItem[]`.
- T16 recording: offline family rules (once-only, retry never records, `total===0` never) — meta `{ levels, preps }`. T17 recording: AI family rules (retry re-records, commented) — meta per above.
- Home: NEW group `{ heading: 'Production', de: 'Produktion' }` between 'Sentence translation' and 'Reference'; cards `T16` 'Sentence assembly' de 'Satzbau' and `T17` 'Answer the question' de 'Antworten (KI)'.
- German gates: T16 canonical orders and every accepted variant must be natural German (variants only where genuinely idiomatic — fronted adverbials/objects with correct V2); T17 prompts force collocation correctness and must accept BOTH da-compound and full-noun-phrase answers when natural.
- Gates: `npx vitest run --testTimeout=30000` (+ one ThemeToggle flake rerun) + `npm run typecheck`. Never touch dist/. Controller probes 390px. Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: T16 assembly dataset (opus)

**Files:** Create `src/data/daAssembly.ts`; test `tests/data/daAssembly.test.ts` (invariants FIRST; mirror `tests/data/daDialogue.test.ts`).

**Interfaces (Task 2 relies on):**

```ts
export interface AssemblyItem {
  id: string             // 'as-<collocationId>'
  collocationId: string
  tiles: string[]        // 4-7 pre-inflected chunks, CANONICAL sentence order; lowercase-initial
                         // (nouns capitalized internally, e.g. 'mein Vater', 'interessiert sich',
                         // 'für Briefmarken'); the prepositional object or da-compound is its OWN tile
  variants?: number[][]  // additional accepted index orders (fronting etc.), each a permutation
  punctuation: '.' | '!' | '?'
  level: CollocationLevel
}
export const DA_ASSEMBLY: AssemblyItem[]   // ≥40
export function assemblySentence(item: AssemblyItem, order?: number[]): string
// joins tiles in the given order (default canonical), uppercases first letter, appends punctuation
export function acceptedOrders(item: AssemblyItem): number[][]  // [canonical 0..n-1, ...variants]
```

Authoring rules: mostly verb collocations across levels; mix plain prepositional objects and da-compound/Korrelat sentences (e.g. tiles `['ich', 'freue mich', 'darauf,', 'dass du kommst']`); a fronting variant ONLY when the reordering is idiomatic V2 German (verb-second preserved — e.g. canonical `['mein Vater', 'interessiert sich', 'für Briefmarken']` + variant `[2,1,0]` "für Briefmarken interessiert sich mein Vater"); NEVER a variant that is merely grammatical-but-odd; tiles must be unambiguous (no two identical tiles in one item).

Invariants: unique ids; join exists; 4-7 tiles; no duplicate tile strings within an item; every variant is a true permutation of 0..n-1 and differs from canonical; no two accepted orders identical; `assemblySentence` spot-checks (capitalization + punctuation); count floor; per-item: canonical order's tile[0] lowercase-initial unless a noun/proper (soft — audit).

- [ ] Tests → RED → author (batches + focused tests; final German pass reading EVERY accepted order aloud as a sentence) → GREEN → full gates → **Commit** `feat(da-compounds): sentence-assembly dataset (authored tile sets + variants)`

---

### Task 2: Plumbing (2 types) + T16 assembly drill (sonnet)

**Files:** five TS-enforced records (both new ids; also add `'word-order'` to `DacErrorTag` + the `dacAnswer*` meta fields in `useQuizHistory.ts` now so Task 3-4 need no further plumbing); create `src/composables/useDaAssemblyQuiz.ts`, `AssemblySetup.vue`, `AssemblyRunner.vue`; router; home (new 'Production' group + T16 card); tests (engine + runner + labels extension).

Engine: pool joins `DA_ASSEMBLY` to `COLLOCATIONS` (filters levels/preps); question state: `pool: {index, tile}[]` (shuffled deterministically via `shuffle`), `placed: number[]`; `place(tileIndex)`, `unplace(position)`, `allPlaced`, `submitOrder()` grades `placed` against `acceptedOrders(item)`; reveal exposes the canonical sentence via `assemblySentence` (+ "auch richtig: …" for other accepted orders when the learner used one). All-or-nothing per card; `wrongItems` for retry. Runner: tile buttons pool above, assembled sequence below (tap placed tile to return it), Submit when all placed, per-card ✓/✗ + canonical sentence + `coreIdeaExplanation` on wrong; 44px tiles, wrap at 390px; records `'dac-assembly'` meta `{ levels, preps }` (offline once-only rules). Setup: chips levels/preps + count; localStorage `'dacAssemblySetup'`. Tests: engine (place/unplace, canonical accept, variant accept, wrong order, shuffle determinism via injected rng if needed), runner (records once, retry never, tiles render).

- [ ] Tests → RED → implement → GREEN → gates → **Commit** `feat(da-compounds): T16 sentence-assembly drill + production plumbing`

---

### Task 3: T17 answer engine (opus)

**Files:** Create `src/composables/useDaAnswerQuiz.ts`; test `tests/composables/useDaAnswerQuiz.test.ts` (fake `AiClient` pattern).

Reuse from `useDaSentenceQuiz.ts`: `CollocRef`, `collocToRef`, `buildDacSpecs` (import; specs are identical), level label helper. New exports mirroring the sentence engine's shape:

```ts
export interface GeneratedDacQuestion extends DacSentenceSpec { question: string; exampleAnswer: string }
export function buildAnswerGeneratePrompt(specs, level, variation): string
export function validateDacQuestion(raw, spec): GeneratedDacQuestion | null
export function generateDacQuestionBatch(client, opts): Promise<{ questions: GeneratedDacQuestion[] }>  // retry-missing, never throws
export function buildAnswerGradePrompt(opts: { question; exampleAnswer; collocWord; preposition; case; userAnswer }): { system; user }
export function parseAnswerGrade(raw): DacAnswerGrade | null   // filters to the 6-tag set
export function gradeDacAnswerReply(client, opts): Promise<DacAnswerGrade>  // temp 0, one retry then throw
export function buildDacAnswerItem(s, correct, tags?): DacDrillItem
```

Prompt requirements (the quality core):
- **Generation system:** German teacher writing conversation practice. Per item: ONE natural German QUESTION addressed to *du* (or *ihr/Sie* when more natural) that uses the given collocation correctly (word + preposition + governed case) and works the given theme noun(s) in naturally; questions must be answerable with the collocation (yes/no OR wh-questions both fine); B-level vocabulary per the target level; plus `exampleAnswer` — one natural full-sentence answer that uses the **da-compound** where a thing/clause is referred to (e.g. Q: *Freust du dich auf das Wochenende?* → A: *Ja, ich freue mich sehr darauf.*). JSON `{items:[{index, question, exampleAnswer}]}` with responseSchema; temperature 0.95.
- **Grading system:** the learner READ the German question and TYPED a German answer. Judge: does it answer the question naturally AND use the collocation/compound grammatically? ACCEPT: da-compound in the Mittelfeld (*Ich freue mich sehr darauf*), FRONTED compound (*Darauf freue ich mich schon lange*), full noun-phrase answers (*Ich freue mich auf das Wochenende*), bare natural short answers only if they still show the structure; ja/nein/doch openers fine. JSON `{correct, tip, errorTags}` — tags from exactly: `preposition`, `compound` (malformed da-compound or compound-for-person / pronoun-for-thing), `case`, `noun`, `word-order` (verb-second violated or compound misplaced), `typo`. Tip = ONE short English sentence.

Tests: prompt content (du-question requirement, exampleAnswer compound rule, grading accept-list incl. fronting, 6-tag definitions), validation leniency, batch retry-missing, parse filtering, grade retry-then-throw, drill-item shape.

- [ ] Tests → RED → implement → GREEN → gates → **Commit** `feat(da-compounds): T17 answer-the-question AI engine`

---

### Task 4: T17 setup/runner + weak-points extension + release (sonnet)

**Files:** Create `src/modules/da-compounds/AnswerSetup.vue`, `AnswerRunner.vue`; modify `src/composables/useDacSentenceStats.ts` (+ its test) to include `'dac-answer'`/`meta.dacAnswerItems` and the `word-order` fault tag; router; home T17 card; changelog + package.json v1.12.8; test `tests/modules/da-compounds/AnswerSetup.test.ts` (light, SentenceSetup.test.ts precedent; no Runner mount test).

Setup mirrors `SentenceSetup.vue` minus direction/hints (no word hints — the source is a German question): chips levels/roles/preps + noun themes + count + canUseAi gating; stash `sessionStorage['gt:lastDacAnswerQuiz'] = { specs, level, meta: { levels, roles, preps, groups, nounsPer } }`; localStorage `'dacAnswerSetup'`. Runner mirrors `SentenceRunner.vue`: progressive ramp, show the German question, textarea answer, `gradeDacAnswerReply` with **fallback on AI-failure = mark ungraded-correct? NO** — fallback: `checkSentence(userInput, exampleAnswer)` + 'Graded offline' toast (imperfect but consistent with the family); reveal shows tip + the exampleAnswer as "so könnte es klingen"; records `'dac-answer'` meta `{ dacAnswerLevels, dacAnswerRoles, dacAnswerPreps, dacAnswerGroups, dacAnswerItems }` (items always — single direction); retry re-records (comment). Release: package.json 1.12.8 + `npm install --package-lock-only`; changelog `APP_VERSION = '1.12.8'` + prepend:

```ts
{
  version: '1.12.8', date: '2026-07-24', kind: 'polish',
  title: 'Da-Compounds · production drills',
  notes: [
    '<strong>Build it, don\'t just pick it.</strong> <em>T16 Sentence assembly</em> — tap pre-inflected tiles into order; curated fronting variants count too (<em>Für Briefmarken interessiert sich mein Vater</em> is as right as the plain order). <em>T17 Answer the question</em> — the AI asks (<em>Freust du dich auf das Wochenende?</em>), you answer freely; Mittelfeld and fronted compounds both accepted, and a new <em>word-order</em> tag joins the weak-point tracking.',
    '<strong>Weak points now learn from both AI drills</strong> — translation and answering feed the same collocation/preposition panel on the module home.'
  ]
},
```

- [ ] Tests → RED → implement → GREEN → full gates → **Commit** `feat(da-compounds): T17 answer drill + weak-point extension; v1.12.8`

---

### Controller wrap-up (not a subagent task)

- [ ] Final whole-branch review (fable; priorities: T16 dataset German audit reading EVERY accepted order aloud, tile-grading correctness, both T17 prompts, weak-point extension) + controller-inline fix wave
- [ ] CDP 390px probe (assembly runner + answer setup + home) + tile-UI screenshot
- [ ] Merge → main (`v1.12.8`), `npm run deploy`, `git push origin main`
