# Phase 6 — Da-Compounds AI Sentence Translation (T14–T15) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The module's first AI drills ship — T14 EN→DE and T15 DE→EN sentence translation over sampled collocations + noun themes, AI-graded with a new `compound` error tag feeding Da-compound weak points (spec §7 Phase 6, grill decisions 3 & 7).

**Architecture:** One engine (`useDaSentenceQuiz.ts`) mirrors `useVerbSentenceQuiz.ts` function-for-function (specs pre-sampled in Setup per ADR-0004, batch generation with rotating angles + retry-missing, lenient validation, EN word-hint spans per ADR-0001/0003, AI grading at temperature 0 with tag filtering, drill-item builder). Direction handling mirrors the PREP sentence quiz: one history type `'dac-sentence'` with `dacSentenceDirection` meta; DE→EN grades meaning only (no tags), disables hints, and records no per-item data. Generation's pedagogical twist: roughly half the German reference sentences use the **da-compound construction** (anaphoric or Korrelat: *Ich freue mich darauf, dass …*), half the plain **preposition + noun object** — so learners meet both surfaces. Weak points: `computeDacWeakPoints` over `meta.dacSentenceItems` (keyed by collocation and by preposition) + a `DacWeakPoints.vue` panel on the module home. T14/T15 are two home cards presetting `direction` on one shared Setup route (grill's one-card-per-test honored; the drills differ only in direction).

## Global Constraints

- Branch `feat/phase6-dacompounds-sentence` off `main`; controller merges/releases v1.12.7 (kind 'polish').
- Routes: `dacompounds-sentence` (Setup, `/da-compounds/sentence`), `dacompounds-sentence-run` (Runner, `/da-compounds/sentence/run`). Cards navigate with query `{ direction: 'en-de' | 'de-en' }`.
- History id exactly `'dac-sentence'`. Labels: 'Da-compounds · sentence (AI)' / 'Da-Compounds · Satz (KI)' / module 'Da-Compounds'.
- **New error-tag set** `DacErrorTag = 'preposition' | 'compound' | 'case' | 'noun' | 'typo'` — `compound` = wrong/malformed da-compound (misformed \*daauf/\*darmit, a compound used for a person, or preposition+pronoun used for a thing). **New per-item type** `DacDrillItem { collocId?: string; collocWord?: string; prepGerman?: string; nounKeys?: string[]; correct: boolean; tags?: DacErrorTag[] }`. **New meta fields:** `dacSentenceLevels?, dacSentenceRoles?, dacSentencePreps?, dacSentenceGroups?: string[]`, `dacSentenceNounsPer?: 1 | 2 | 'mix'`, `dacSentenceDirection?: 'en-de' | 'de-en'`, `dacSentenceHints?: boolean`, `dacSentenceItems?: DacDrillItem[]` (EN→DE only).
- AI stack: `AiClient` via `resolveAiClient(settings)`; `canUseAi` gating with the standard alert + toast (VerbSentenceSetup precedent, lines ~85-91); responseSchema JSON calls; generation temperature 0.95, grading 0 with one retry then throw; runner falls back to `checkSentence` + "Graded offline" toast.
- Spec hand-off via `sessionStorage['gt:lastDacSentenceQuiz']` (verb precedent — query strings can't carry specs); setup choices in `localStorage['dacSentenceSetup']`.
- Retry-the-wrong rounds RE-RECORD a Run (AI-family precedent: verb/prep sentence runners reset `historySaved`) — deliberate divergence from the offline drills, note in code comment.
- German/prompt gate: generation must demand the collocation used correctly (word + preposition + case) and natural sentences at the pool's CEFR level; grading tips are ONE short English sentence.
- Gates: `npx vitest run --testTimeout=30000` (+ one ThemeToggle flake rerun) + `npm run typecheck`. Never touch dist/. Controller probes 390px. Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Engine + history plumbing (opus)

**Files:** Create `src/composables/useDaSentenceQuiz.ts`; modify `src/composables/useQuizHistory.ts` (type `'dac-sentence'` after `'dac-contrast'`, `DacErrorTag`, `DacDrillItem`, meta block) + the other four TS-enforced records (labels/zero-maps/TYPE_LABEL/HistoryPage incl. typeOrder); test `tests/composables/useDaSentenceQuiz.test.ts` (fake `AiClient` pattern from `tests/composables/useVerbSentenceQuiz.test.ts`) + extend `tests/components/quiz-type-labels.test.ts`.

**Interfaces (mirror `useVerbSentenceQuiz.ts` exactly in shape; Tasks 2-3 rely on these names):**

```ts
export interface CollocRef { id: string; word: string; english: string; preposition: string; case: CollocationCase; level: CollocationLevel }
export function collocToRef(c: Collocation): CollocRef
export interface DacSentenceSpec { index: number; colloc: CollocRef; nouns: NounRef[] }
export function buildDacSpecs(collocPool: CollocRef[], nounPool: NounRef[], count: number, nounsPer: 1 | 2 | 'mix', rng?: () => number): DacSentenceSpec[]  // refilling-bag draws, 1 collocation per sentence
export interface GeneratedDacSentence extends DacSentenceSpec { english: string; german: string; collocSpanEn?: string; nounSpansEn?: string[]; extraWords?: ExtraWord[] }
export function buildDacGeneratePrompt(specs, levelLabel, variation): string
export function validateDacSentencePair(raw, spec): GeneratedDacSentence | null   // lenient like the verb one
export function generateDacSentenceBatch(client, opts): Promise<{ sentences: GeneratedDacSentence[] }>  // retry-missing, angle rotation, never throws
export function buildDacHintInputs(s: GeneratedDacSentence): HintInput[]  // colloc → OUR word+preposition ('sich freuen auf'), theme nouns → OUR article+german, extras → AI de
export function buildDacGradePrompt(opts: { english; german; collocWord; preposition; case; userAnswer; direction }): { system: string; user: string }
export function parseDacGrade(raw): { correct: boolean; tip?: string; tags?: DacErrorTag[] } | null
export function gradeDacAnswer(client, opts): Promise<DacAnswerGrade>  // temp 0, one retry then throw
export function buildDacDrillItem(s, correct, tags?): DacDrillItem
```

Prompt requirements (author carefully — this is the quality core):
- **Generation system prompt:** German teacher writing translation exercises for the topic *Verben/Adjektive/Nomen mit festen Präpositionen und Pronominaladverbien (da-compounds)*. Each item: ONE natural German sentence at the target level that uses the given collocation correctly (word, its preposition, the governed case), naturally incorporating the given theme noun(s); **alternate construction across items — roughly half use the prepositional object with a noun phrase (*Ich freue mich auf das Konzert*), half use the da-compound pointing at a clause or context (*Ich freue mich darauf, dass …* / *Ich freue mich schon darauf*)**; then a faithful natural English translation. Return JSON `{items:[{index, english, german, collocSpanEn, nounSpansEn, extraWords}]}` — `collocSpanEn` = the exact English words expressing the collocation (verbatim substring); `nounSpansEn`, `extraWords` exactly as the verb quiz defines them. Schema mirrors `VERB_GEN_SCHEMA` with `collocSpanEn: string`.
- **Grading system prompt (EN→DE):** learner saw ENGLISH, typed GERMAN. Accept natural alternatives (BOTH the noun-phrase and the da-compound construction are acceptable when they express the meaning). JSON `{correct, tip, errorTags}` with tags from exactly: `preposition` (wrong or missing governed preposition), `compound` (a needed da-compound malformed — \*daauf, \*darmit — or a da-compound used for a person / preposition+pronoun used for a thing), `case` (right preposition, wrong governed case ending), `noun` (wrong theme noun), `typo` (small slip elsewhere). **DE→EN:** meaning-only judgment, `{correct, tip}`, no tags (prep-quiz precedent `useSentenceQuiz.ts` L524-536).

Tests: spec building (bag exhaustion/mix), prompt content (contains collocation word+prep+case cue, the half-and-half construction instruction, span rules), validation leniency, batch retry-missing with fake client, hint inputs (colloc German from OUR data), grade prompt per direction (DE→EN asks no tags), parse filtering to the 5-tag set, drill-item shape, labels-order test extension.

- [ ] Tests → RED → engine + plumbing → GREEN → full gates → **Commit** `feat(da-compounds): AI sentence engine + dac-sentence history plumbing`

---

### Task 2: Setup + Runner + routes + cards (sonnet)

**Files:** Create `src/modules/da-compounds/SentenceSetup.vue`, `SentenceRunner.vue`; router (2 routes); home (new group `{ heading: 'Sentence translation', de: 'Übersetzen (KI)' }` between 'Korrelat & meaning' and 'Reference', cards `T14` 'Translate EN→DE' de 'Satzübersetzung' and `T15` 'Translate DE→EN' de 'Rückübersetzung', both route `dacompounds-sentence` with `query: { direction }`); test `tests/modules/da-compounds/SentenceSetup.test.ts` (light: chips render, canStart gating) — the Runner follows the untested-AI-runner precedent (no mounted test; engine covered in Task 1).

Setup (mirror `VerbSentenceSetup.vue` + prep direction control): collocation chips levels/roles/preps (pool = `COLLOCATIONS` filtered; counts shown), noun-theme chips (`NOUN_GROUPS` + `countsByGroup`, disabled at 0, default non-empty groups), direction segmented control (initialized from `route.query.direction`, default 'en-de'), nounsPer (1/2/mix), word-hints toggle (auto-disabled UI hint when DE→EN), count presets, `canUseAi` alert + toast gating, stash `sessionStorage['gt:lastDacSentenceQuiz'] = { specs, direction, level: collocation levels joined, wordHints, meta: { levels, roles, preps, groups, nounsPer } }`, then push `dacompounds-sentence-run`.

Runner (mirror `VerbSentenceRunner.vue` + prep DE→EN branches): progressive ramp `planRampBatches(specs, [1,2,5], 10)` concurrency 4; per-card show source sentence (EN→DE: English with hint spans via `buildHintSegments`+`buildDacHintInputs`; DE→EN: German, hints off); textarea answer; grade via `gradeDacAnswer` with `checkSentence` offline fallback + toast; verdict card with tip + correction (the reference translation); finish records `'dac-sentence'` with the meta block (items EN→DE only); retry-wrong re-records (AI-family precedent, comment it); End-drill records nothing mid-run.

- [ ] RED (setup test) → implement → GREEN → full gates → **Commit** `feat(da-compounds): T14/T15 AI sentence translation setup + runner`

---

### Task 3: Weak points + release prep (sonnet)

**Files:** Create `src/composables/useDacSentenceStats.ts`, `src/components/charts/DacWeakPoints.vue`; modify `DaCompoundsHome.vue` (render the panel above the groups when data exists, PrepositionsHome-weak-panel style) and `src/modules/history/HistoryPage.vue` ONLY if trivially consistent (else skip — home panel is the deliverable); changelog + package.json v1.12.7; tests `tests/composables/useDacSentenceStats.test.ts`, `tests/components/DacWeakPoints.test.ts` (mirror the verb pair).

`computeDacWeakPoints(entries)`: filter `type === 'dac-sentence'`, read `meta.dacSentenceItems`; weak collocations keyed by `collocId` (display `collocWord + prepGerman`), weak prepositions keyed by `prepGerman`, `tagCounts: Record<DacErrorTag, number>`; attribution mirrors `useVerbSentenceStats` (`weightedScore = (wrong/seen) * ln(seen)`; colloc miss when `!correct && (no tags || tags ∩ {preposition, compound, case, typo})`; noun-tag misses excluded from colloc attribution). Panel: top-8 collocations + preposition chips with pct · wrong/seen, empty-state hidden.

Release: package.json 1.12.7 + `npm install --package-lock-only`; changelog `APP_VERSION = '1.12.7'` + prepend:

```ts
{
  version: '1.12.7', date: '2026-07-24', kind: 'polish',
  title: 'Da-Compounds · AI sentence translation',
  notes: [
    '<strong>The module goes generative.</strong> <em>T14 EN→DE</em> — the AI writes an English sentence around a collocation from your selection plus nouns from your themes; you translate it, and the grader accepts both constructions (<em>auf das Konzert</em> or <em>darauf, dass …</em>) while tagging what went wrong: preposition, compound form, case, noun, or typo. <em>T15 DE→EN</em> — decode the compound in context (<em>darauf</em> is rarely "on it").',
    '<strong>Weak points, da-compound edition.</strong> Wrong answers feed a new panel on the module home showing the collocations and prepositions you miss most — the groundwork for a remedial drill in a later phase.'
  ]
},
```

- [ ] Tests → RED → implement → GREEN → full gates → **Commit** `feat(da-compounds): dac weak points + v1.12.7`

---

### Controller wrap-up (not a subagent task)

- [ ] Final whole-branch review (fable; priorities: BOTH prompts' pedagogical/German quality, tag definitions teachable and mutually exclusive, DE→EN branch parity with the prep quiz, weak-point attribution correctness) + controller-inline fix wave
- [ ] CDP 390px probe (setup + runner + home); runner smoke needs no API key — verify the no-key alert path renders
- [ ] Merge → main (`v1.12.7`), `npm run deploy`, `git push origin main`
