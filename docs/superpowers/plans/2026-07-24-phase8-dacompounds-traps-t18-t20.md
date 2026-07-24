# Phase 8 — Da-Compounds Trap Drills (T18–T20) Implementation Plan — FINAL PHASE

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Family G ships — T18 homograph discrimination, T19 register judgment, T20 relative wo-compounds — completing the module at 20/20 drills (spec §7 Phase 8).

**Architecture:** Three authored datasets, three simple pick engines (Korrelat/Contrast precedents). T18: sentences using an ambiguous word (*damit/darum/dabei/dagegen/danach/davor*) in ONE reading; a `HOMOGRAPH_WORDS` table defines each word's two reading labels (compound vs connector/adverb); two-button pick. T19: phrases judged **standard / spoken-only / always-wrong** — the dataset deliberately contains wrong German (*\*daauf*) and colloquial forms ("Da weiß ich nichts von"); verdict truth is the German gate. T20: relative-clause gaps with the Duden three-way rule — indefinite antecedents (alles/nichts/etwas/das + superlative) REQUIRE the wo-form; person antecedents FORBID it; concrete-thing antecedents prefer prep+relative-pronoun but ACCEPT both (T11 dual-accept precedent, reveal names the preference). No collocation join — items carry their own level; filters are levels-only.

## Global Constraints

- Branch `feat/phase8-dacompounds-traps` off `main`; controller merges/releases v1.12.9 (kind 'polish').
- Routes: `dacompounds-homograph(-run)`, `dacompounds-register(-run)`, `dacompounds-relative(-run)`; paths `/da-compounds/homograph|register|relative(/run)`.
- History ids exactly `'dac-homograph'`, `'dac-register'`, `'dac-relative'`. Labels (module 'Da-Compounds'): 'Da-compounds · homographs'/'Da-Compounds · Doppelgänger'; 'Da-compounds · register'/'Da-Compounds · Register'; 'Da-compounds · relative clauses'/'Da-Compounds · Relativsätze'.
- Offline family recording rules (once-only, retry never, empty never); meta `{ levels }` each (+ `kinds` on T19? NO — keep levels only; YAGNI).
- Home: NEW group `{ heading: 'Advanced traps', de: 'Fallen (C1)' }` between 'Production' and 'Reference'; cards `T18` 'Homographs' de 'damit oder damit?', `T19` 'Register' de 'gesprochen oder falsch?', `T20` 'Relative clauses' de 'worüber oder über das?'.
- Module-completion polish ships with this release (Task 4): DaCompoundsHome subtitle drops "the drills arrive family by family"; Home.vue card meta becomes '20 drills · cheatsheet · weak points'.
- German gates: T18 each sentence must admit ONLY its labeled reading; T19 each verdict must be true (spoken-only items genuinely attested colloquial German, wrong items genuinely ungrammatical in any register); T20 the three-way rule applied exactly (Duden: wo-form required after alles/nichts/etwas/das/superlatives; \*wo-form for persons; both possible for concrete things with prep+pronoun preferred).
- Gates: `npx vitest run --testTimeout=30000` (+ one ThemeToggle flake rerun; it is slow — 11s isolated — so rerun alone before judging) + `npm run typecheck`. Never touch dist/. Controller probes 390px. Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Authored datasets ×3 (opus)

**Files:** Create `src/data/daHomograph.ts`, `src/data/daRegister.ts`, `src/data/daRelative.ts`; tests `tests/data/daHomograph.test.ts`, `daRegister.test.ts`, `daRelative.test.ts` (invariants FIRST; `tests/data/daKorrelat.test.ts` is the structural precedent).

**Interfaces (Tasks 2-3 rely on exact names):**

```ts
// daHomograph.ts — T18
export interface HomographWord {
  word: string                       // 'damit' | 'darum' | 'dabei' | 'dagegen' | 'danach' | 'davor'
  compoundLabel: string              // German+EN reading label, e.g. 'mit + Sache — "with it"'
  connectorLabel: string             // e.g. 'Konjunktion — "so that"' / 'Adverb — "therefore"'
}
export const HOMOGRAPH_WORDS: HomographWord[]   // ≥4 words (damit, darum, dabei, dagegen; danach/davor optional)
export type HomographReading = 'compound' | 'connector'
export interface HomographItem {
  id: string                         // 'hg-<word>-<n>'
  word: string                       // ∈ HOMOGRAPH_WORDS
  sentence: string                   // uses the word in exactly ONE reading (word present verbatim)
  reading: HomographReading
  explanation: string                // one German+EN teaching line naming the reading and why
  level: CollocationLevel
}
export const DA_HOMOGRAPH: HomographItem[]      // ≥36, ≥8 per core word, both readings ≥3 per word

// daRegister.ts — T19
export type RegisterVerdict = 'standard' | 'spoken' | 'wrong'
export interface RegisterItem {
  id: string                         // 'rg-<n>'
  phrase: string                     // full sentence shown raw (wrong items contain the error!)
  verdict: RegisterVerdict
  explanation: string                // names the phenomenon (split compound, doubling, was-for-wo, *daauf …)
  level: CollocationLevel
}
export const DA_REGISTER: RegisterItem[]        // ≥36, ≥10 per verdict

// daRelative.ts — T20
export type AntecedentKind = 'indefinite' | 'thing' | 'person'
export interface RelativeItem {
  id: string                         // 'rl-<n>'
  sentence: string                   // one '___' in the relative-clause slot
  antecedentKind: AntecedentKind
  woForm: string                     // 'worüber'
  prepForm: string                   // 'über das' / 'von der' — correctly inflected for the antecedent
  explanation: string
  level: CollocationLevel
}
export const DA_RELATIVE: RelativeItem[]        // ≥36, ≥10 per kind
export function relativeAccepted(item: RelativeItem): string[]
// indefinite → [woForm]; person → [prepForm]; thing → [prepForm, woForm] (preferred first)
```

Authoring: T18 disambiguation must be airtight — *"Ich schreibe dir, damit du Bescheid weißt."* (connector) vs *"Hier ist dein Stift — was soll ich damit?"* (compound); include darum=deshalb vs bitten-darum, dabei=dennoch/anwesend vs bei-object, dagegen=hingegen vs gegen-object; danach/davor temporal-adverb vs object readings if included. T19 spoken items: north-German split ("Da weiß ich nichts von."), doubling ("Da freu ich mich schon drauf." / "dadrauf"), was-for-wo ("Auf was wartest du?"), wo-split ("Wo träumst du von?"); wrong items: \*daauf, \*darmit, \*woauf, wo-compound for a person ("\*Worauf wartest du?" with explicit person context in the sentence — e.g. "\*Worauf wartest du? — Auf meinen Bruder." as one phrase), \*auf es for a thing, \*danach for a person; standard items: ordinary correct compound sentences. T20 prepForm must be correctly inflected (über das/den/die, von der/dem, an die/den …) for the authored antecedent; indefinite items use alles/nichts/etwas/das Beste/das Einzige; person items use clear person nouns.

Invariants: T18 — word ∈ HOMOGRAPH_WORDS, word appears in sentence (case-insensitive token), floors incl. per-word reading balance, explanations non-empty; T19 — verdict floors, unique phrases, explanations non-empty; T20 — one gap, kind floors, `relativeAccepted` order spot-checks per kind, woForm starts with 'wo', prepForm contains a space.

- [ ] Tests → RED → author (batches + focused tests; final German pass — for T19 read every phrase in the claimed register; for T20 check every prepForm inflection against its antecedent's gender/case) → GREEN → full gates → **Commit** `feat(da-compounds): homograph + register + relative datasets (authored)`

---

### Task 2: History plumbing (3 types) + T18 homograph drill (sonnet)

**Files:** five TS-enforced records (all three ids after `'dac-answer'`); create `src/composables/useDaHomographQuiz.ts`, `HomographSetup.vue`, `HomographRunner.vue`; router; home (new 'Advanced traps' group + T18 card); tests (engine + runner + labels extension).

Engine: filter levels; per question the TWO option labels come from the word's `HOMOGRAPH_WORDS` entry (order shuffled); grade picked reading === item.reading; reveal shows the explanation + both labels with the right one highlighted. Runner: sentence with the ambiguous word bolded (exact token match), two option buttons (keyboard 1/2), records `'dac-homograph'` meta `{ levels }`; offline rules; RetryModal; Setup levels chips + count, localStorage `'dacHomographSetup'`. Precedent: `ContrastRunner.vue`/`ContrastSetup.vue`.

- [ ] Tests → RED → implement → GREEN → gates → **Commit** `feat(da-compounds): T18 homograph drill + trap plumbing`

---

### Task 3: T19 register + T20 relative drills (sonnet)

**Files:** create `src/composables/useDaRegisterQuiz.ts`, `RegisterSetup.vue`, `RegisterRunner.vue`, `useDaRelativeQuiz.ts`, `RelativeSetup.vue`, `RelativeRunner.vue`; router (4 routes); home cards T19 + T20; tests (2 engines + 2 runners).

T19 engine: three fixed options (`standard` ✓ 'Standard – auch geschrieben', `spoken` 🗣 'Nur gesprochen', `wrong` ✗ 'Immer falsch'); grade verdict equality; reveal explanation (+ for 'wrong' items show the phrase struck through with the corrected form if the explanation carries one). Runner shows the phrase in quotes; keyboard 1/2/3; records `'dac-register'` meta `{ levels }`.
T20 engine: options `[prepForm, woForm]` shuffled (2 buttons); grade against `relativeAccepted(item)` — thing items accept BOTH (reveal: "beides möglich — bevorzugt: über das"); indefinite/person single-accept; reveal explanation. Records `'dac-relative'` meta `{ levels }`. Both: offline rules, RetryModal, levels+count setups (localStorage `'dacRegisterSetup'` / `'dacRelativeSetup'`). Tests incl. T20 dual-accept for thing kind and single-accept for the other kinds.

- [ ] Tests → RED → implement → GREEN → gates → **Commit** `feat(da-compounds): T19 register + T20 relative-clause drills`

---

### Task 4: Module-completion polish + release prep (sonnet)

**Files:** modify `src/modules/da-compounds/DaCompoundsHome.vue` (subtitle: drop "Study the cheatsheet first; the drills arrive family by family." → e.g. "dafür, darauf, davon — one small word instead of preposition + pronoun. Twenty drills from formation to free production, plus the cheatsheet."), `src/modules/home/Home.vue` (da-compounds card `meta` → `'20 drills · cheatsheet · weak points'`), changelog + package.json v1.12.9; update home test if it asserts the subtitle.

Changelog: `APP_VERSION = '1.12.9'` + prepend:

```ts
{
  version: '1.12.9', date: '2026-07-24', kind: 'polish',
  title: 'Da-Compounds · the traps — module complete',
  notes: [
    '<strong>The last family: three C1 trap drills.</strong> <em>T18 Homographs</em> — the same word, two readings: <em>damit</em> the conjunction vs. <em>damit</em> = mit + it. <em>T19 Register</em> — judge <em>"Da weiß ich nichts von"</em> (spoken, fine) against <em>*darmit</em> (always wrong). <em>T20 Relative clauses</em> — <em>alles, worüber …</em> (wo-form required), <em>das Buch, über das …</em> (preferred), <em>die Frau, von der …</em> (wo-form forbidden).',
    '<strong>The Da-Compounds module is complete:</strong> twenty drills across seven families — formation, matching, gap-fill, case, people-vs-things, Korrelat, meaning contrast, AI translation and answering, sentence assembly, and the traps — plus the cheatsheet and weak-point tracking. Every dataset hand-written, every answer derived from stored grammar, every release audited.'
  ]
},
```

- [ ] Implement → home-test adjust → full gates → **Commit** `feat(da-compounds): module complete — home polish; v1.12.9`

---

### Controller wrap-up (not a subagent task)

- [ ] Final whole-branch review (fable; priorities: T18 single-reading airtightness, T19 verdict truth per item — the register calls are the hardest German judgments in the whole module —, T20 inflection + three-way rule) + controller-inline fix wave
- [ ] CDP 390px probe (3 runner pages + home) + one screenshot
- [ ] Merge → main (`v1.12.9`), `npm run deploy`, `git push origin main`
- [ ] Post-release: mark the spec §7 roadmap complete (docs commit on main)
