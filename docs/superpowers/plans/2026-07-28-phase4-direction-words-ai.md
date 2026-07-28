# Phase 4 — Direction Words AI Production Drills (T6–T7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Direction Words module gains T6 (AI sentence translation EN→DE) and T7 (AI answer-the-question), a `direction` error tag, and weak points per [Adverb pair] on the module home (spec §7 Phase 4; gate: "Grader feedback names the perspective/compound/placement axis that failed").

**Architecture:** Mirrors the da-compounds AI pipeline exactly. One topic composable `useDwSentenceQuiz.ts` (specs, generation prompt + validator, grading prompt + parser, drill-item builder) and a sibling `useDwAnswerQuiz.ts` that re-exports the shared spec sampling. Both runners hand-roll the house streaming state over the generic `planRampBatches`/`generateProgressively` primitives (the established pattern — no shared runner hook exists). Weak points get a pair-keyed sibling of `useDacSentenceStats` + a `DwWeakPoints.vue` panel on the module home. A spec = one [Adverb pair] element + a sampled side (hin/her) + 1–2 theme nouns; the target compound is derived, and the generated ENGLISH must pin the speaker's position textually (AI drills have no scene diagram).

**Three topic-specific design decisions (deviations from the dac template, all deliberate):**
1. **Hints never reveal the direction word.** In dac, hints reveal the collocation (scaffold); here the compound IS the tested answer. Hints cover assigned nouns + AI-supplied incidental words only.
2. **Grading accepts synonyms:** the vertical twin (*hinab*⟷*hinunter*, *herab*⟷*herunter*) is always correct; r-forms (*rauf*) are correct with a written-form note in the tip, never a `direction` tag; *kommen* toward the addressee accepts both sides (herauf/hinauf), preferring her- in the tip.
3. **EN→DE only** (grill decision §6.6 — no direction toggle on T6).

**Tech Stack:** Vue 3, Vitest; reuse as-is: `useProgressiveGenerator.ts`, `resolveAiClient`/`useClaude.ts`/`localClaude.ts`, `useSettings.ts` (`canUseAi`), `useSentenceQuiz.ts` (`buildHintSegments`, `HintInput`, `nounToRef`, `NounRef`, `checkSentence` fallback), `ExtraWord`/`PromptVariation` from `useVerbSentenceQuiz.ts`, `useNouns.ts` (`countsByGroup`, `sampleByGroups`), `NOUN_GROUPS`.

## Global Constraints

- Branch `feat/phase4-direction-words-ai` off `main`; merge in the final controller step.
- Route names hyphen-free: `directionwords-sentence(-run)`, `directionwords-answer(-run)`; paths `/direction-words/sentence(/run)`, `/direction-words/answer(/run)`.
- New `QuizHistoryType` ids exactly `'dw-sentence'`, `'dw-answer'` after `'dw-assembly'` in every registry (the six files; grep `'dw-assembly'`).
- **Local-claude JSON convention (hard rule):** every generation AND grading prompt states its exact JSON envelope in prose text — the local-claude bridge drops `responseSchema` entirely; a prompt that references "the schema" without spelling it out fails all retries. Mirror `DAC_GEN_SYSTEM`'s prose-shape line style.
- Error tags exactly `DwErrorTag = 'direction' | 'conjugation' | 'case' | 'word-order' | 'noun' | 'typo'` (CONTEXT.md [Direction error tag]). `direction` = wrong perspective side, wrong compound, or misformed form — never for an accepted synonym/r-form.
- Recording: both drills follow the dac AI-runner pattern INCLUDING the deliberate retry behavior — `retryWrong()` resets `historySaved` so the retry pass writes a second history entry (weak points see retry outcomes; this deviates from the offline drills' never-record-retries rule and matches `SentenceRunner.vue`/`AnswerRunner.vue`).
- Grading failures fall back to local `checkSentence` exact-match with a "Graded offline" toast (dac pattern).
- hin = away from the speaker, her = toward the speaker — in every prompt, tip rubric, and UI copy.
- Phone-first ~390px. Gates: full suite green (ThemeToggle flake rule) + typecheck. Never touch dist/ or GermanVerbTester/.
- Release: v1.14.03, kind 'polish', date 2026-07-28.
- Commits end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: History plumbing + T6 sentence composable

**Files:**
- Modify: `src/composables/useQuizHistory.ts` (2 union members; `DwErrorTag`; `DwDrillItem`; meta fields), the other five registries
- Create: `src/composables/useDwSentenceQuiz.ts`
- Test: `tests/composables/useDwSentenceQuiz.test.ts`, extend `tests/components/quiz-type-labels.test.ts`

**Interfaces:**
- Consumes: `ADVERB_PAIRS`, `hinForm`, `herForm`, `DIRECTION_LEVELS`, `type DirectionLevel` from directionWords.ts; `NounRef`, `nounToRef`, `HintInput` from useSentenceQuiz.ts; `ExtraWord`, `PromptVariation` from useVerbSentenceQuiz.ts; `AiClient`.
- Produces (Tasks 2–5 rely on):

```ts
// useQuizHistory.ts additions
export type DwErrorTag = 'direction' | 'conjugation' | 'case' | 'word-order' | 'noun' | 'typo'
export interface DwDrillItem {
  pair?: string          // adverb-pair element ('auf')
  compound?: string      // the target compound ('herauf'), denormalized for display
  nounKeys?: string[]
  correct: boolean
  tags?: DwErrorTag[]
}
// QuizHistoryMeta additions (after dacAnswerItems block):
//   dwSentenceLevels?, dwSentencePairs?, dwSentenceGroups?: string[]
//   dwSentenceNounsPer?: 1 | 2 | 'mix'
//   dwSentenceHints?: boolean
//   dwSentenceItems?: DwDrillItem[]
//   dwAnswerLevels?, dwAnswerPairs?, dwAnswerGroups?: string[]
//   dwAnswerItems?: DwDrillItem[]
```

Registry labels (after `'dw-assembly'`): LABEL `'dw-sentence': 'Direction words · sentence (AI)'`, `'dw-answer': 'Direction words · answer (AI)'`; DE `'Hin & Her · Satz (KI)'`, `'Hin & Her · Antworten (KI)'`; HistoryPage module `'Direction Words'`; TYPE_LABEL `'direction sentence translation'`, `'direction answer-the-question'`.

`useDwSentenceQuiz.ts` — mirror `src/composables/useDaSentenceQuiz.ts` section-for-section (read it fully; keep the same bag-sampler, batch-retry, and never-throw generation semantics). Topic deltas, exact shapes:

```ts
export type DwSide = 'hin' | 'her'
export interface DwSentenceSpec {
  index: number
  pair: string          // element, e.g. 'auf'
  side: DwSide
  target: string        // side === 'hin' ? hinForm(pair) : herForm(pair)
  nouns: NounRef[]
}
export const VERTICAL_TWIN: Record<string, string> = { unter: 'ab', ab: 'unter' }
export function twinCompound(spec: DwSentenceSpec): string | null   // side + VERTICAL_TWIN[pair], else null
export function buildDwSpecs(pairPool: string[], nounPool: NounRef[], count: number, nounsPer: 1|2|'mix', rng?: Rng): DwSentenceSpec[]
  // bag over pairPool elements; side by rng coin flip; target derived; [] when pairPool empty
export function dwLevelLabel(levels: DirectionLevel[]): string
export interface GeneratedDwSentence extends DwSentenceSpec {
  english: string
  german: string          // reference translation containing target (or its twin)
  nounSpansEn?: string[]
  extraWords?: ExtraWord[]
}
export const DW_GEN_SYSTEM: string
export function buildDwGeneratePrompt(specs: DwSentenceSpec[], level: string, variation: PromptVariation): string
export function validateDwSentencePair(raw: unknown, spec: DwSentenceSpec): GeneratedDwSentence | null
  // german must contain target OR twinCompound (case-insensitive); english/german non-empty; index echo
export function generateDwSentenceBatch(client: AiClient, opts): Promise<{ sentences: GeneratedDwSentence[]; failedIndices: number[] }>
export function buildDwHintInputs(s: GeneratedDwSentence): HintInput[]
  // NOUNS + extraWords ONLY — never the direction word (design decision 1)
export interface DwAnswerGrade { correct: boolean; tip: string; tags: DwErrorTag[] }
export function buildDwGradePrompt(opts: { spec: GeneratedDwSentence; answer: string }): { system: string; user: string }
export function parseDwGrade(raw: unknown): DwAnswerGrade | null
export function gradeDwAnswer(client: AiClient, opts): Promise<DwAnswerGrade>   // maxRetries=1, throws after
export function buildDwDrillItem(s: GeneratedDwSentence, correct: boolean, tags?: DwErrorTag[]): DwDrillItem
```

`DW_GEN_SYSTEM` (use this text verbatim; single string, backtick literal):

```
You are a German-language exercise writer for an app drilling DIRECTIONAL ADVERBS (hin-/her- compounds: hinauf/herauf, hinein/herein, hinaus/heraus, hinunter/herunter, hinüber/herüber, hinab/herab).
Rule being drilled: hin = motion away from the speaker, her = motion toward the speaker.
For each requested item you are given a TARGET compound and theme nouns. Write:
- "english": a natural English sentence (level-appropriate) whose German translation must use the TARGET compound. The sentence MUST make the speaker's position unambiguous in words (e.g. "Grandma calls from the top of the stairs: 'Come up to me!'" — the caller is above, so the German is herauf). Never leave the perspective guessable.
- "german": the reference translation, natural German, containing the TARGET compound (its synonym hinab/hinunter or herab/herunter is also acceptable where the target is one of those).
- Use each given theme noun naturally in the sentence.
- "nounSpansEn": the exact English word(s) you used for each theme noun, in order.
- "extraWords": up to 3 other content words (verbs/nouns) a learner might not know, each with its German.
Return ONLY JSON in exactly this shape: {"items":[{"index":<number>,"english":"...","german":"...","nounSpansEn":["..."],"extraWords":[{"en":"...","de":"...","kind":"verb|noun"}]}]}
No markdown fences, no commentary.
```

`buildDwGradePrompt` system (verbatim; the drilled rubric):

```
You grade a learner's German translation in a directional-adverb drill (hin = away from the speaker, her = toward the speaker).
Judge the answer against the English sentence and the reference German. The answer is CORRECT when it preserves the meaning and is acceptable German. Apply these drill-specific rules:
- The directional adverb must express the right perspective for the scenario. The exact reference compound is not required: its vertical synonym (hinab=hinunter, herab=herunter) is fully correct; colloquial short forms (rauf, runter, rein, raus, rüber) are CORRECT — mention the written full form in the tip, but do not mark the answer wrong or tag it.
- With "kommen" toward the addressee, both herauf and hinauf (etc.) are acceptable; prefer her- in the tip.
- The WRONG side (herauf where the speaker is below, hinein where the speaker is inside) is incorrect: tag "direction".
- Misformed words (hinrein, rab) are incorrect: tag "direction".
errorTags values: "direction" (wrong side, wrong compound, misformed), "conjugation" (verb form), "case" (wrong case ending), "word-order" (verb-second or adverb placement), "noun" (wrong theme noun), "typo" (small slip elsewhere). Multiple tags allowed; empty when correct.
"tip": ONE short sentence, English, naming what to fix (or reinforcing why the answer is right). Never reveal an unrelated better translation.
Return ONLY JSON in exactly this shape: {"correct": true|false, "tip": "...", "errorTags": ["..."]}
No markdown fences, no commentary.
```

Tests (write fully, test-first): `buildDwSpecs` draws distinct pairs before refilling, sides vary under a supplied rng, target derives correctly; `twinCompound` returns hinab for hin+unter's twin etc., null for 'auf'; `validateDwSentencePair` accepts german containing target, accepts the twin, rejects missing compound/empty fields/index mismatch; `buildDwHintInputs` NEVER emits a hint whose reveal or surface contains the target compound (property-test over crafted GeneratedDwSentence fixtures); `parseDwGrade` accepts the envelope, filters unknown tags, null on garbage; prompt-text assertions — `DW_GEN_SYSTEM` and the grade system contain the literal JSON-shape lines (regression against the local-claude convention).

- [ ] Steps: failing tests (incl. labels ids) → RED → registries → composable → GREEN + typecheck + full suite → **Commit** `feat(direction-words): history plumbing (AI types) + T6 sentence composable`

---

### Task 2: T7 answer composable

**Files:**
- Create: `src/composables/useDwAnswerQuiz.ts`
- Test: `tests/composables/useDwAnswerQuiz.test.ts`

Mirror `src/composables/useDaAnswerQuiz.ts` (read fully): re-export `buildDwSpecs`, `dwLevelLabel`, types from Task 1's file (the shared-sampling pattern). Topic shapes:

```ts
export interface GeneratedDwQuestion extends DwSentenceSpec { question: string; exampleAnswer: string }
export const DW_ANSWER_GEN_SYSTEM: string
export function buildDwAnswerGeneratePrompt(specs, level, variation): string
export function validateDwQuestion(raw, spec): GeneratedDwQuestion | null   // question must NOT contain the target compound (it would give the answer away); exampleAnswer MUST contain target or twin
export function generateDwQuestionBatch(client, opts): Promise<{ questions: GeneratedDwQuestion[]; failedIndices: number[] }>
export function buildDwAnswerGradePrompt(opts: { q: GeneratedDwQuestion; answer: string }): { system, user }
export function gradeDwReply(client, opts): Promise<DwAnswerGrade>
export function buildDwAnswerItem(q, correct, tags?): DwDrillItem
```

`DW_ANSWER_GEN_SYSTEM` (verbatim):

```
You write German prompts for a speaking-style drill on directional adverbs (hin = away from the speaker, her = toward the speaker).
For each item you are given a TARGET compound and theme nouns. Write:
- "question": a short German scenario + question addressed to the learner (du-form) that sets a scene where the natural answer uses the TARGET compound. State the learner's position explicitly in the scenario (e.g. "Du stehst unten an der Treppe, deine Oma ist oben. Was rufst du ihr zu?"). The question itself must NOT contain the target compound or any hin-/her- compound of the same pair.
- "exampleAnswer": one natural German answer containing the TARGET compound (or its hinab/hinunter-type synonym).
- Weave the given theme nouns into the scenario naturally. Level-appropriate German.
Return ONLY JSON in exactly this shape: {"items":[{"index":<number>,"question":"...","exampleAnswer":"..."}]}
No markdown fences, no commentary.
```

Grade prompt: same rubric as Task 1's grade system (reuse the string via a shared exported constant `DW_GRADE_RULES` if convenient), judging the learner's free German answer against the scenario question + exampleAnswer; the answer is correct when it answers the question naturally with the right perspective; fronted variants and Mittelfeld placements both fine; tag set identical.

Tests: validator rejects a question containing the target or its pair sibling, accepts twin in exampleAnswer; prompt-shape literals present; re-exports intact (import `buildDwSpecs` from the answer module and check it is the same function reference as Task 1's).

- [ ] Steps: failing tests → RED → composable → GREEN + typecheck → **Commit** `feat(direction-words): T7 answer composable`

---

### Task 3: T6 Sentence drill UI

**Files:**
- Create: `src/modules/direction-words/SentenceSetup.vue`, `src/modules/direction-words/SentenceRunner.vue`
- Modify: `src/router.ts` (2 routes after `directionwords-assembly-run`), `DirectionWordsHome.vue` (T6 card appended to the 'Production' group)
- Test: `tests/modules/direction-words/SentenceRunner.test.ts`

Mirror `src/modules/da-compounds/SentenceSetup.vue` + `SentenceRunner.vue` (read both fully) with these deltas:
- Setup chips: **Level** (DIRECTION_LEVELS, default ['A2','B1'] — flavors generation), **Pair** (ADVERB_PAIRS elements, hinForm/herForm labels, default all), **Noun theme** (NOUN_GROUPS with counts via `countsByGroup()`), nouns-per segmented (1/2/mix), **Word hints toggle** (hint copy: 'Hints reveal nouns and unknown words — never the direction word; that one is yours.'), count presets; NO direction control (EN→DE by design). localStorage `'dwSentenceSetup'`. Stash `{ specs, levels, pairs, groups, nounsPer, hints }` to sessionStorage key `'dwSentenceStash'`; `canUseAi` gates Start.
- Runner: `planRampBatches(stash.specs, [1, 2, 5], 10)` + `generateProgressively` house pattern; hint segments via `buildHintSegments(s.english, buildDwHintInputs(s))` when hints on; submit → `gradeDwAnswer`, catch → `checkSentence` fallback + 'Graded offline' toast; reveal shows the reference german + tip + tags as chips; finish → `saveQuizRun({ type: 'dw-sentence', …, meta: { dwSentenceLevels, dwSentencePairs, dwSentenceGroups, dwSentenceNounsPer, dwSentenceHints, dwSentenceItems: items } })` with `items = deck.map((s,i) => buildDwDrillItem(s, verdicts…))`; `retryWrong()` resets `historySaved` (second entry by design).
- Home card in 'Production': `{ numeral: 'T6', route: 'directionwords-sentence', title: 'Sentence translation (AI)', de: 'Satz (KI)', desc: 'The AI writes the scene in English — where the speaker stands is in the words. You write the German; wrong-side compounds get called out as perspective errors.' }`
- Routes:

```ts
{ path: '/direction-words/sentence', name: 'directionwords-sentence', component: () => import('./modules/direction-words/SentenceSetup.vue') },
{ path: '/direction-words/sentence/run', name: 'directionwords-sentence-run', component: () => import('./modules/direction-words/SentenceRunner.vue') },
```

Runner test (mirror the dac SentenceRunner test mechanics if one exists; else the house AI-runner test style): mock the AI client module (`vi.mock` on resolveAiClient to return canned generate/grade responses) + seed sessionStorage stash with 1 spec; drive: sentence renders, hints show noun span but NOT the compound, submit wrong answer → tip + `direction` tag chip rendered, finish records `type: 'dw-sentence'` with `meta.dwSentenceItems[0].tags` containing 'direction'.

- [ ] Steps: failing test → RED → build → routes/home → GREEN + typecheck + full suite → **Commit** `feat(direction-words): T6 AI sentence translation drill`

---

### Task 4: T7 Answer drill UI

**Files:**
- Create: `src/modules/direction-words/AnswerSetup.vue`, `src/modules/direction-words/AnswerRunner.vue`
- Modify: `src/router.ts` (2 routes), `DirectionWordsHome.vue` (T7 card in 'Production')
- Test: `tests/modules/direction-words/AnswerRunner.test.ts`

Mirror `src/modules/da-compounds/AnswerSetup.vue` + `AnswerRunner.vue` with the module's deltas (level/pair/theme chips as Task 3, no hints toggle — dac precedent has none, question rendered plain). Recording `type: 'dw-answer'`, meta `{ dwAnswerLevels, dwAnswerPairs, dwAnswerGroups, dwAnswerItems }` (always items — single direction); retry resets historySaved. Home card: `{ numeral: 'T7', route: 'directionwords-answer', title: 'Answer the question (AI)', de: 'Antworten (KI)', desc: 'The AI sets the scene in German and asks; you answer with the right direction word — fronted or mid-field, both count.' }` Routes `/direction-words/answer(/run)`. Runner test: mocked client; question renders; wrong reply → tip; records once with items.

- [ ] Steps: failing test → RED → build → routes/home → GREEN + typecheck + full suite → **Commit** `feat(direction-words): T7 AI answer-the-question drill`

---

### Task 5: Weak points + release prep

**Files:**
- Create: `src/composables/useDwSentenceStats.ts`, `src/components/charts/DwWeakPoints.vue`
- Modify: `src/modules/direction-words/DirectionWordsHome.vue` (panel above the groups, dac pattern), `src/data/changelog.ts` + `package.json` (v1.14.03)
- Test: `tests/composables/useDwSentenceStats.test.ts`

Mirror `src/composables/useDacSentenceStats.ts` + `src/components/charts/DacWeakPoints.vue` (read both) keyed on [Adverb pair]:

```ts
export interface WeakPair { pair: string; compoundExamples: string[]; wrong: number; seen: number; score: number }
export interface DwWeakPoints { weakPairs: WeakPair[]; tagCounts: Record<DwErrorTag, number> }
export const DW_HISTORY_TYPES = new Set<QuizHistoryType>(['dw-sentence', 'dw-answer'])
export function computeDwWeakPoints(entries: QuizHistoryEntry[]): DwWeakPoints
// itemsFor picks meta.dwAnswerItems ?? meta.dwSentenceItems by entry.type
// fault tags = ['direction','conjugation','case','word-order','typo'] — excludes 'noun' (dac precedent: a noun-only miss doesn't blame the pair)
// weightedScore(wrong, seen) = (wrong / seen) * Math.log(seen); byScoreDesc identical to the dac sibling
```

Panel shows top-8 weak pairs (label `hinForm(pair)/herForm(pair)`, wrong/seen) + tag counts; home wires `loadHistory()` one-shot into `<DwWeakPoints :entries="historyEntries" />` above the groups (dac home pattern). Tests: aggregation over crafted entries (both types feed in; noun-only misses don't count against the pair; ordering by weighted score; empty history → empty arrays).

Release prep: `package.json` `"1.14.03"` + `npm install --package-lock-only`; `changelog.ts` `APP_VERSION = '1.14.03'` + prepend:

```ts
{
  version: '1.14.03', date: '2026-07-28', kind: 'polish',
  title: 'Direction Words · AI sentence production',
  notes: [
    '<strong>T6 Sentence translation (KI).</strong> The AI writes the scene in English — where the speaker stands is in the words — and you write the German. Grading is perspective-aware: <em>herauf</em> where the speaker is below gets a <em>direction</em> tag, <em>hinab</em> counts for <em>hinunter</em>, and spoken short forms (<em>rauf</em>) pass with a written-form tip. Word hints reveal nouns and unknown words — never the direction word.',
    '<strong>T7 Answer the question (KI).</strong> A German scenario asks; you answer freely with the right direction word — Mittelfeld or fronted, both count. <strong>Weak points</strong> from both AI drills now sit on the module home: your shakiest pairs, by the numbers.'
  ]
},
```

- [ ] Steps: failing stats tests → RED → composable + panel + home wiring → changelog/bump → GREEN + typecheck + full suite → **Commit** `feat(direction-words): weak points per adverb pair; v1.14.03`

---

### Controller wrap-up (not a subagent task)

- [ ] Final whole-branch review (most capable model): prompt-text quality is the highest-value pass (rubric correctness incl. the kommen-both-sides rule, JSON-prose envelopes present, no perspective flip anywhere), plus meta/registry integrity and the weak-points math
- [ ] ONE fix wave + scoped re-review
- [ ] Live gate: with the dev server up, attempt ONE real end-to-end T6 run through the local-claude provider (settings seeded to local-claude; count=2) — verifies generation + grading against a real model per the phase gate; if the CLI is unavailable, fall back to 390px probes of both setup pages + mocked-runner evidence and note it
- [ ] 390px probe on both setup pages; dark spot-check on the sentence runner (mocked or live)
- [ ] Merge `feat/phase4-direction-words-ai` → main (`v1.14.03` merge message), suite green on merged main, `npm run deploy`, `git push origin main` (user pre-authorized merge+push for this phase)
