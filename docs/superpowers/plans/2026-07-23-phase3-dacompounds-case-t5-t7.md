# Phase 3 — Da-Compounds Case Drills (T5–T7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Family C ships — T5 compound→case pick, T6 person-pronoun case, T7 two-way article fill — offline, deterministic, recording Runs (spec §7 Phase 3).

**Architecture:** T5 reuses the Phase 2 substitution items: fill each stem's gap with its answer to get a natural sentence containing the da-compound (`splitGap` already splits it — pre + answer + post, compound boldable with zero heuristics) and ask which case the hidden preposition governs (= the joined collocation's stored `case`; `alsoAccept` entries with the SAME preposition add acceptable cases). T6/T7 get small authored datasets whose ANSWERS are derived, never authored: T6 frames carry a person-pronoun cue and the answer is `preposition + inflected pronoun` from a local declension table + the collocation's case; T7 sentences carry an article gap (`d___`/`ein___`) + noun gender and the answer comes from local definite/indefinite article tables + the collocation's case. Three new history types; same drill skeleton, chips, and recording pattern as Phase 2 (rich in-module precedents now exist).

**Tech Stack:** as Phase 2 (Vue 3, Vitest, createPool/shuffle, checkText, prepColorStyle).

## Global Constraints

- Branch `feat/phase3-dacompounds-case` off `main`; merge in the final controller step.
- Route names (hyphen-free head): `dacompounds-case(-run)`, `dacompounds-pronoun-case(-run)`, `dacompounds-article(-run)`; paths `/da-compounds/case`, `/da-compounds/pronoun-case`, `/da-compounds/article` (+`/run`).
- History type ids exactly: `'dac-case'`, `'dac-pronoun-case'`, `'dac-article'`.
- Recording, retry, meta rules identical to Phase 2 (once-only pattern; meta `{ levels, roles, preps }` from sampled items, + `mode` where a pick/type toggle exists).
- Grammar facts (pronoun forms, article forms) live in ONE local table each and answers are DERIVED — authored items never contain an answer string.
- Authored German: T6 objects are PERSONS (the inverse of Phase 2's rule — prep + pronoun is only right for people); T7 objects are THINGS. Correctness is a shipping gate.
- Home: new group `{ heading: 'Case tests', de: 'Kasus' }` between 'Compound recall' and 'Reference'; card numerals 'T5'/'T6'/'T7'.
- Gates: `npx vitest run --testTimeout=30000` (ThemeToggle flake: one rerun) + `npm run typecheck`. Never touch dist/. Phone-first; controller probes at 390px.
- Release v1.12.4, kind 'polish'. Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: History plumbing (3 types) + T5 compound→case drill

**Files:**
- Modify: the five TS-enforced records (`useQuizHistory.ts` union, `useQuizStats.ts` zero-maps ×2, `quiz-type-labels.ts` LABEL/DE/ORDER, `useLevelAssessment.ts` TYPE_LABEL, `HistoryPage.vue` QUIZ_TYPES + typeOrder)
- Create: `src/composables/useDaCaseQuiz.ts`, `src/modules/da-compounds/CaseSetup.vue`, `src/modules/da-compounds/CaseRunner.vue`
- Modify: `src/router.ts` (2 routes), `DaCompoundsHome.vue` (new 'Case tests' group + T5 card)
- Test: `tests/composables/useDaCaseQuiz.test.ts`, `tests/modules/da-compounds/CaseRunner.test.ts`, extend `tests/components/quiz-type-labels.test.ts`

**Interfaces:**
- Consumes: `filterSubstitutionItems`/`sampleSubstitutionItems`/`splitGap`/`substitutionAnswer`, type `JoinedItem` from `useDaSubstitutionQuiz.ts`; `CollocationCase` from collocations.
- Produces: the three history types (Tasks 3-4 rely on them); labels (EN/DE/module 'Da-Compounds'): `dac-case` 'Da-compounds · case'/'Da-Compounds · Kasus'; `dac-pronoun-case` 'Da-compounds · pronoun case'/'Da-Compounds · Pronomen-Kasus'; `dac-article` 'Da-compounds · article fill'/'Da-Compounds · Artikel' (TYPE_LABEL lowercase: 'da-compound case', 'da-compound pronoun case', 'da-compound article fill'); engine `useDaCaseQuiz(items: JoinedItem[])`.

Engine core (test-first — full code):

```ts
import { computed, ref } from 'vue'
import type { JoinedItem } from './useDaSubstitutionQuiz'
import { splitGap, substitutionAnswer } from './useDaSubstitutionQuiz'
import type { CollocationCase } from '../data/collocations'

export interface CaseQuestion extends JoinedItem {
  /** The stem with its gap filled — a natural sentence containing the da-compound. */
  sentence: { pre: string; compound: string; post: string }
  /** Every case the dataset grades correct for THIS preposition (primary + same-prep alsoAccept). */
  acceptedCases: CollocationCase[]
  picked: CollocationCase | null
  isCorrect: boolean | null
}

export function buildCaseQuestion(ji: JoinedItem): Omit<CaseQuestion, 'picked' | 'isCorrect'> {
  const { pre, post } = splitGap(ji.item.stem)
  const compound = substitutionAnswer(ji.item)
  const acceptedCases = Array.from(new Set([
    ji.colloc.case,
    ...(ji.colloc.alsoAccept ?? [])
      .filter(a => a.preposition === ji.colloc.preposition)
      .map(a => a.case),
  ]))
  return { ...ji, sentence: { pre, compound, post }, acceptedCases }
}
```

`useDaCaseQuiz` mirrors the house engine shape (`questions/currentIndex/current/finished/pick/advance/score/total/wrongItems`); `pick(c: CollocationCase)` grades `acceptedCases.includes(c)`. Engine tests: sentence assembly (pre+compound+post reconstructs the filled stem), accusative/dative grading, an alsoAccept same-prep case counts correct (find such an item in COLLOCATIONS in the test, or construct a JoinedItem fixture), wrongItems, finished/score.

Runner: sentence with the compound bolded (+ `prepColorStyle` accent on reveal), Akkusativ/Dativ buttons (keyboard 1/2 — mirror `CollocationsRunner.vue`'s case buttons), reveal names word + preposition + case and shows `coreIdeaExplanation` on wrong answers; records `'dac-case'` meta `{ levels, roles, preps }`. Setup: chips levels/roles/preps + count presets, localStorage `'dacCaseSetup'` (mirror `SubstitutionSetup.vue` minus the mode toggle). Runner tests: records once (count=1, correct meta), retry not recorded, both case buttons render.

- [ ] Failing tests → RED → plumbing + engine + views + routes + home group/card → GREEN → full gates → **Commit** `feat(da-compounds): T5 compound-case drill + history plumbing for the case family`

---

### Task 2: Authored datasets for T6 + T7

**Files:**
- Create: `src/data/daPersonCase.ts`, `src/data/daArticleFill.ts`
- Test: `tests/data/daPersonCase.test.ts`, `tests/data/daArticleFill.test.ts`

**Interfaces (Tasks 3-4 rely on these exact names):**

```ts
// daPersonCase.ts
export type PronounCue = 'ich' | 'du' | 'er' | 'sie' | 'es' | 'wir' | 'ihr' | 'sie (Plural)' | 'Sie'
export const PRONOUN_FORMS: Record<PronounCue, { accusative: string; dative: string }> = {
  ich: { accusative: 'mich', dative: 'mir' },
  du: { accusative: 'dich', dative: 'dir' },
  er: { accusative: 'ihn', dative: 'ihm' },
  sie: { accusative: 'sie', dative: 'ihr' },
  es: { accusative: 'es', dative: 'ihm' },
  wir: { accusative: 'uns', dative: 'uns' },
  ihr: { accusative: 'euch', dative: 'euch' },
  'sie (Plural)': { accusative: 'sie', dative: 'ihnen' },
  Sie: { accusative: 'Sie', dative: 'Ihnen' },
}
export interface PersonCaseItem { id: string; collocationId: string; frame: string; cue: PronounCue; level: CollocationLevel }
export const DA_PERSON_CASE: PersonCaseItem[]  // ≥50
export function personCaseAnswer(item: PersonCaseItem): string  // `${colloc.preposition} ${PRONOUN_FORMS[cue][colloc.case]}`

// daArticleFill.ts
export type ArticleGender = 'masculine' | 'feminine' | 'neuter'
export const DEFINITE: Record<ArticleGender, { accusative: string; dative: string }> = {
  masculine: { accusative: 'den', dative: 'dem' },
  feminine:  { accusative: 'die', dative: 'der' },
  neuter:    { accusative: 'das', dative: 'dem' },
}
export const INDEFINITE: Record<ArticleGender, { accusative: string; dative: string }> = {
  masculine: { accusative: 'einen', dative: 'einem' },
  feminine:  { accusative: 'eine',  dative: 'einer' },
  neuter:    { accusative: 'ein',   dative: 'einem' },
}
export const TWO_WAY_PREPS = ['an', 'auf', 'in', 'über', 'unter', 'vor'] as const
export interface ArticleFillItem { id: string; collocationId: string; sentence: string; article: 'definite' | 'indefinite'; gender: ArticleGender; level: CollocationLevel }
export const DA_ARTICLE_FILL: ArticleFillItem[]  // ≥50
export function articleFillAnswer(item: ArticleFillItem): string  // table[gender][colloc.case]
```

Authoring rules:
- **T6 frames (≥50):** one sentence with exactly one `___` where `prep + pronoun` goes; the object is a PERSON (choose collocations that naturally take people: warten auf, denken an, sich verlassen auf, sich kümmern um, sich ärgern über, sprechen mit/über, sich bedanken bei, gehören zu …); the frame must NOT contain the preposition (it's part of the answer); cue chosen so the sentence stays natural; ids `pc-<collocationId>`; one item per collocation; level = collocation's. Mix cues (all nine at least twice). Exemplar: `{ id: 'pc-warten-auf', collocationId: 'warten-auf', frame: 'Ich warte schon seit einer Stunde ___.', cue: 'er', level: 'B1' }` → answer `auf ihn`.
- **T7 sentences (≥50):** only collocations whose preposition ∈ TWO_WAY_PREPS; sentence uses the collocation with a THING noun phrase whose article is gapped as `d___` (definite) or `ein___` (indefinite) — exactly one gap, gap matches the declared `article` kind; gender declared truthfully for the noun; ids `af-<collocationId>`; one item per collocation; spread across an+Dativ verbs (arbeiten an, teilnehmen an, leiden an, zweifeln an …) AND accusative ones so the "usually-Akk except an+Dat" contrast is drilled. Exemplar: `{ id: 'af-arbeiten-an', collocationId: 'arbeiten-an', sentence: 'Wir arbeiten seit Wochen an ein___ neuen Projekt.', article: 'indefinite', gender: 'neuter', level: 'B2' }` → answer `einem`.

Invariant tests (write FIRST; mirror `tests/data/daSubstitution.test.ts` structure): unique ids; collocation join exists; level matches; exactly one gap (`___` for T6; `/\b(d|ein)___/` for T7 and it agrees with `article`); T6 frame does not contain the collocation's preposition as a word; T7 collocation's preposition ∈ TWO_WAY_PREPS; count floors (≥50 each; T7: ≥12 items whose collocation case is dative); every cue used ≥2×; `personCaseAnswer`/`articleFillAnswer` derivation spot-checks (warten-auf + er → 'auf ihn'; a dative one → 'mit ihm' etc.).

- [ ] Tests → RED → tables + authored items (batches of ~15, focused test after each; slow German self-review pass at the end) → GREEN → full gates → **Commit** `feat(da-compounds): person-case + article-fill datasets (authored) with derived answers`

---

### Task 3: T6 person-pronoun case drill

**Files:**
- Create: `src/composables/useDaPersonCaseQuiz.ts`, `src/modules/da-compounds/PronounCaseSetup.vue`, `src/modules/da-compounds/PronounCaseRunner.vue`
- Modify: router (2 routes), home (T6 card in 'Case tests')
- Test: `tests/composables/useDaPersonCaseQuiz.test.ts`, `tests/modules/da-compounds/PronounCaseRunner.test.ts`

Engine: join `DA_PERSON_CASE` to collocations (same pool pattern as Phase 2; filters levels/roles/preps); `answer = personCaseAnswer(item)`; **pick mode** options = 3 forms of the same prep+pronoun: accusative, dative, and nominative (`${prep} ${cue === 'sie (Plural)' ? 'sie' : cue}`), shuffled, deduplicated (wir/euch collapse acc=dat — then options are 2); **type mode** `checkText(input, answer)`. Question exposes `frame` split on the gap + the `cue` chip (render as `(er)` next to the gap). Runner: mode from setup (`mode` query + meta like T3), reveal names preposition + case + pronoun form, `coreIdeaExplanation` on wrong; records `'dac-pronoun-case'` meta `{ levels, roles, preps, mode }`. Setup mirrors `SubstitutionSetup.vue` (chips + mode toggle + count; localStorage `'dacPronounCaseSetup'`).

Engine tests: answer derivation, pick options contain exactly the ≤3 dedup'd forms incl. answer, type accepts folded input, wrongItems. Runner tests: records once + retry not recorded + cue visible.

- [ ] Tests → RED → implement → GREEN → gates → **Commit** `feat(da-compounds): T6 person-pronoun case drill`

---

### Task 4: T7 article-fill drill + release prep

**Files:**
- Create: `src/composables/useDaArticleQuiz.ts`, `src/modules/da-compounds/ArticleFillSetup.vue`, `src/modules/da-compounds/ArticleFillRunner.vue`
- Modify: router (2 routes), home (T7 card), `changelog.ts` + `package.json` (v1.12.4)
- Test: `tests/composables/useDaArticleQuiz.test.ts`, `tests/modules/da-compounds/ArticleFillRunner.test.ts`

Engine: join `DA_ARTICLE_FILL` to collocations (filters levels/preps — roles chip omitted: article items are noun-phrase-object sentences across roles, keep levels+preps only); `answer = articleFillAnswer(item)`; type-only (input replaces the `d___`/`ein___` gap — learner types the FULL article word, e.g. `einem`); grade `checkText(input, answer)`; also expose `hintCase` for the reveal (`colloc.case`) and whether the item is an an+Dativ exception (`colloc.preposition === 'an' && colloc.case === 'dative'`) so the reveal can teach the rule: "Präpositionalobjekt → meistens Akkusativ; an + Dativ-Verben sind die Ausnahme."
Runner: sentence with the gap rendered as the stub (`ein` + input, or show the raw gap and a single input for the whole article — implement the single-input variant: show sentence with `___` replacing the whole `d___`/`ein___` token, placeholder shows the stub), reveal shows the filled sentence + case + rule line + coreIdeaExplanation on wrong; records `'dac-article'` meta `{ levels, preps }`. Setup: chips levels/preps + count; localStorage `'dacArticleSetup'`.
Release prep: `package.json` 1.12.4 + `npm install --package-lock-only`; changelog `APP_VERSION = '1.12.4'` + prepend:

```ts
{
  version: '1.12.4', date: '2026-07-23', kind: 'polish',
  title: 'Da-Compounds · the case family',
  notes: [
    '<strong>Three case drills join the module.</strong> <em>T5 Case pick</em> — a sentence carries the compound (<em>Ich warte darauf</em>); you name the hidden preposition\'s case. <em>T6 Pronoun case</em> — people don\'t take da-compounds: type or choose <em>auf ihn</em>, not <em>*auf ihm</em>. <em>T7 Article fill</em> — two-way prepositions in verb objects: <em>an ein___ Projekt</em> → <em>einem</em>, because <em>arbeiten an</em> is one of the dative exceptions.',
    '<strong>Answers are derived, never hand-typed:</strong> 100+ new authored sentences carry only the situation; pronoun and article forms come from declension tables joined to the collocation\'s stored case — so a grading disagreement is impossible by construction.'
  ]
},
```

- [ ] Tests → RED → implement → GREEN → full gates → **Commit** `feat(da-compounds): T7 article-fill drill; v1.12.4`

---

### Controller wrap-up (not a subagent task)

- [ ] Final whole-branch review (fable; German audit of both authored datasets — T6 person-objects REQUIRED, T7 thing-objects + gender/case truthfulness — is the priority) + controller-inline fix wave
- [ ] CDP 390px probe (3 new runner pages + home); visual check of one runner
- [ ] Merge → main (`v1.12.4`), `npm run deploy`, `git push origin main`
