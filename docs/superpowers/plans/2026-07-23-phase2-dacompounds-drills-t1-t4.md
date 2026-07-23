# Phase 2 — Da-Compounds Formation & Recall Drills (T1–T4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Da-Compounds module gains its first four drills — T1 formation speed round, T2 compound matching, T3 substitution gap-fill (pick/type), T4 near-neighbor discrimination — all offline, deterministic, recording Runs (spec §7 Phase 2).

**Architecture:** T1 draws from the Phase 1 formation data (19 compoundable + 8 trap prepositions). T3/T4 drill anaphoric substitution over a NEW authored dataset (`daSubstitution.ts`, ≥90 items keyed to collocation ids; answers derived via `daCompound()`); T4 differs from T3-pick only in distractor strategy (a static near-neighbor preposition map). T2 matches collocation words to their compounds in screens of 5 pairs. All four follow the house drill skeleton (setup filters → runner → per-item ✓/✗ reveal → retry-the-missed round, recorded once via the `historySaved` watch pattern) and the collocation-filter chips (level/word type/preposition) from the grill decisions.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Vitest + @vue/test-utils, `createPool`/`shuffle` (src/data/pool.ts), `checkText`/`foldGerman` (src/composables/drillGrading.ts), `prepColorStyle` (src/data/prepColors.ts), localStorage history.

## Global Constraints

- Branch `feat/phase2-dacompounds-drills` off `main`; merge in the final controller step.
- Route names hyphen-free under the `dacompounds` head (NavShell split hazard, see Phase 1 plan): `dacompounds-formation`, `dacompounds-formation-run`, `dacompounds-match`, `dacompounds-match-run`, `dacompounds-substitution`, `dacompounds-substitution-run`, `dacompounds-neighbors`, `dacompounds-neighbors-run`. Paths under `/da-compounds/…`.
- New `QuizHistoryType` ids exactly: `'dac-formation'`, `'dac-match'`, `'dac-substitution'`, `'dac-neighbors'`.
- Recording: main round records once (`startedAtMs` + `historySaved` + `watch(finished)` — copy `CaseQuizRunner.vue`); retry rounds and `total === 0` never record; meta derived from sampled items.
- Selection chips: collocation level (B1/B2/C1), word type (verb/adjective/noun), preposition (the distinct primary prepositions of `COLLOCATIONS`, sorted). Same chip/count-preset/localStorage pattern as `CollocationsSetup.vue` — mirror its markup and `toggle`/`load`/`save` helpers exactly.
- German content correctness is a shipping gate. Authored sentences: things/abstracts as objects only — NEVER persons or animals (da-compounds don't refer to people; a person-object item would teach wrong German).
- Da-compounds in answers are graded with `checkText` (umlaut folding: `darueber` accepted for `darüber`).
- Phone-first ~390px; controller verifies with the CDP probe before release.
- Gates: `npx vitest run --testTimeout=30000` green (known ThemeToggle cold-compile flake — rerun once if the flake is the sole failure), `npm run typecheck` green. Never touch dist/.
- Release: v1.12.3, changelog kind 'polish'.
- Commits end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: History plumbing (4 types) + T1 formation speed round

**Files:**
- Modify: `src/composables/useQuizHistory.ts` (union + meta), `src/composables/useQuizStats.ts` (both zero-maps), `src/components/charts/quiz-type-labels.ts` (LABEL/DE/ORDER), `src/composables/useLevelAssessment.ts` (TYPE_LABEL), `src/modules/history/HistoryPage.vue` (QUIZ_TYPES + typeOrder)
- Create: `src/composables/useDaFormationQuiz.ts`, `src/modules/da-compounds/FormationSetup.vue`, `src/modules/da-compounds/FormationRunner.vue`
- Modify: `src/router.ts` (2 routes), `src/modules/da-compounds/DaCompoundsHome.vue` (new group + card)
- Test: `tests/composables/useDaFormationQuiz.test.ts`, `tests/modules/da-compounds/FormationRunner.test.ts`, extend `tests/components/quiz-type-labels.test.ts`

**Interfaces:**
- Consumes: `DA_COMPOUND_PREPOSITIONS`, `NO_COMPOUND_PREPOSITIONS`, `daCompound`, `woCompound`, `isVowelInitial` from `src/data/daCompounds.ts`.
- Produces: the four `QuizHistoryType` members (Tasks 3-4 rely on them); `QuizHistoryMeta.preps?: string[]` and `mode?` widened to include `'pick' | 'type'` (extend the existing `mode?: 'gender' | 'translation'` union with these two members); engine `useDaFormationQuiz(items: FormationItem[])` returning `{ questions, currentIndex, current, finished, pick, advance, score, total, wrongItems }`.

- [ ] **Step 1: Failing tests first.** History: extend `tests/components/quiz-type-labels.test.ts`'s "includes" test with the four new ids. Engine test `tests/composables/useDaFormationQuiz.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { useDaFormationQuiz, buildFormationItems, type FormationChoice } from '../../src/composables/useDaFormationQuiz'

describe('buildFormationItems', () => {
  test('includes traps when asked, only compoundable otherwise', () => {
    expect(buildFormationItems(true).length).toBe(27)
    expect(buildFormationItems(false).length).toBe(19)
  })
})

describe('useDaFormationQuiz', () => {
  test('grades da/dar/none picks and finishes', () => {
    const items = buildFormationItems(true).filter(i => ['für', 'auf', 'ohne'].includes(i.preposition))
    const quiz = useDaFormationQuiz(items)
    const answers: Record<string, FormationChoice> = { 'für': 'da', 'auf': 'dar', 'ohne': 'none' }
    for (let i = 0; i < 3; i++) {
      quiz.pick(answers[quiz.current.value!.preposition])
      expect(quiz.current.value!.isCorrect).toBe(true)
      quiz.advance()
    }
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(3)
  })

  test('wrong pick lands in wrongItems', () => {
    const items = buildFormationItems(false).filter(i => i.preposition === 'auf')
    const quiz = useDaFormationQuiz(items)
    quiz.pick('da') // wrong: darauf
    quiz.advance()
    expect(quiz.score.value).toBe(0)
    expect(quiz.wrongItems.value.length).toBe(1)
  })
})
```

- [ ] **Step 2: Verify RED** (`npx vitest run tests/composables/useDaFormationQuiz.test.ts` unresolvable; `npm run typecheck` fails after writing the label-test additions? No — labels test fails at runtime, typecheck fails once union edits begin; run both).

- [ ] **Step 3: Implement history plumbing.** Union members after `'prep-collocations'`:

```ts
  | 'dac-formation'
  | 'dac-match'
  | 'dac-substitution'
  | 'dac-neighbors'
```

Meta: add `preps?: string[]   // Da-compound drills: preposition filter` and widen `mode?: 'gender' | 'translation' | 'pick' | 'type'`. Labels (EN / DE / HistoryPage module `'Da-Compounds'`):

- `dac-formation`: `'Da-compounds · formation'` / `'Da-Compounds · Bildung'`
- `dac-match`: `'Da-compounds · matching'` / `'Da-Compounds · Zuordnung'`
- `dac-substitution`: `'Da-compounds · gap-fill'` / `'Da-Compounds · Lückentext'`
- `dac-neighbors`: `'Da-compounds · near neighbors'` / `'Da-Compounds · Verwechslung'`

Insert the four (this order) after `'prep-collocations'` in `QUIZ_TYPES_ORDER`, HistoryPage `typeOrder`, both zero-maps, `TYPE_LABEL` (lowercase style there: `'da-compound formation'`, `'da-compound matching'`, `'da-compound gap-fill'`, `'da-compound near-neighbor choice'`).

- [ ] **Step 4: Implement the engine** `src/composables/useDaFormationQuiz.ts`:

```ts
import { computed, ref } from 'vue'
import {
  DA_COMPOUND_PREPOSITIONS, NO_COMPOUND_PREPOSITIONS, daCompound, woCompound, isVowelInitial,
} from '../data/daCompounds'

export type FormationChoice = 'da' | 'dar' | 'none'

export interface FormationItem {
  preposition: string
  expected: FormationChoice
  da: string | null   // darauf | null for traps
  wo: string | null
}

export interface FormationQuestion extends FormationItem {
  picked: FormationChoice | null
  isCorrect: boolean | null
}

export function buildFormationItems(includeTraps: boolean): FormationItem[] {
  const table: FormationItem[] = DA_COMPOUND_PREPOSITIONS.map(e => ({
    preposition: e.preposition,
    expected: isVowelInitial(e.preposition) ? 'dar' : 'da',
    da: daCompound(e.preposition),
    wo: woCompound(e.preposition),
  }))
  if (!includeTraps) return table
  const traps: FormationItem[] = NO_COMPOUND_PREPOSITIONS.map(p => ({
    preposition: p, expected: 'none', da: null, wo: null,
  }))
  return [...table, ...traps]
}

export function useDaFormationQuiz(items: FormationItem[]) {
  const questions = ref<FormationQuestion[]>(items.map(i => ({ ...i, picked: null, isCorrect: null })))
  const currentIndex = ref(0)
  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  const wrongItems = computed(() =>
    questions.value.filter(q => q.isCorrect === false).map(({ picked, isCorrect, ...item }) => item as FormationItem))

  function pick(choice: FormationChoice) {
    const q = questions.value[currentIndex.value]
    if (!q || q.picked !== null) return
    q.picked = choice
    q.isCorrect = choice === q.expected
  }
  function advance() {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }
  return { questions, currentIndex, current, finished, pick, advance, score, total, wrongItems }
}
```

- [ ] **Step 5: Setup + Runner + wiring.** `FormationSetup.vue`: no filter chips (the pool is the 27 prepositions) — an "Include no-compound traps" toggle (default on, persists in localStorage key `'dacFormationSetup'`) + the standard count presets (10/15/20/all; mirror `CollocationsSetup.vue`'s segmented control and `start()` query serialization: `traps: '1'|'0'`, `count`). Runner `FormationRunner.vue` (mirror `CaseGovernmentRunner.vue`'s chrome): big preposition, three buttons `da-` / `dar-` / `keine Bildung` (keyboard 1/2/3), immediate grading, reveal shows `darauf · worauf` (or `bildet keine Zusammensetzung —` plus the workaround hint `Präposition + Pronomen: ohne es`), ✓/✗ verdict, RetryModal (`itemLabel="prepositions"`), summary screen with per-item rows, recording per the standard pattern:

```ts
saveQuizRun({
  type: 'dac-formation',
  startedAt: new Date(startedAtMs.value).toISOString(),
  finishedAt: new Date(finishedAt).toISOString(),
  durationMs: finishedAt - startedAtMs.value,
  count: quiz.value.total.value,
  correct: quiz.value.score.value,
  meta: {},
})
```

Routes (after the `dacompounds-cheatsheet` entry):

```ts
{ path: '/da-compounds/formation', name: 'dacompounds-formation', component: () => import('./modules/da-compounds/FormationSetup.vue') },
{ path: '/da-compounds/formation/run', name: 'dacompounds-formation-run', component: () => import('./modules/da-compounds/FormationRunner.vue') },
```

Home: add group `{ heading: 'Formation basics', de: 'Bildung', cards: [...] }` BEFORE the Reference group with card `{ numeral: 'T1', route: 'dacompounds-formation', title: 'da- or dar-?', de: 'Bildung', desc: 'Speed round: da-, dar-, or no compound at all — including the trap prepositions (*darohne).' }`.

Runner test `tests/modules/da-compounds/FormationRunner.test.ts`: mock `saveQuizRun` (Phase 0 pattern), mount with memory router (`dacompounds-formation-run` / `dacompounds-formation` / `dacompounds` routes), query `{ count: '1', traps: '0' }`; assert three choice buttons render; pick a wrong choice → feedback; drive to finish → `saveQuizRun` called once with `objectContaining({ type: 'dac-formation', count: 1 })`; retry round → still once.

- [ ] **Step 6: GREEN + full gates** (focused tests, then full suite + typecheck).
- [ ] **Step 7: Commit** `feat(da-compounds): T1 formation speed round + history plumbing for the four drills`

---

### Task 2: Substitution dataset (authored) + near-neighbor map

**Files:**
- Create: `src/data/daSubstitution.ts`
- Test: `tests/data/daSubstitution.test.ts`

**Interfaces:**
- Consumes: `COLLOCATIONS` (join by `collocationId`), `daCompound`.
- Produces (Task 3 relies on): `interface SubstitutionItem { id: string; collocationId: string; context: string; stem: string; level: CollocationLevel }`, `DA_SUBSTITUTION: SubstitutionItem[]` (≥90), `NEIGHBOR_PREPS: Record<string, string[]>` (each key → 3 distinct compoundable prepositions ≠ key), helper `substitutionAnswer(item): string` (= `daCompound` of the joined collocation's preposition).

- [ ] **Step 1: Invariant tests FIRST** (`tests/data/daSubstitution.test.ts`):

```ts
import { describe, test, expect } from 'vitest'
import { DA_SUBSTITUTION, NEIGHBOR_PREPS, substitutionAnswer } from '../../src/data/daSubstitution'
import { COLLOCATIONS } from '../../src/data/collocations'
import { daCompound, canFormCompound } from '../../src/data/daCompounds'

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

describe('DA_SUBSTITUTION invariants', () => {
  test('at least 90 items with unique ids and unique collocations', () => {
    expect(DA_SUBSTITUTION.length).toBeGreaterThanOrEqual(90)
    expect(new Set(DA_SUBSTITUTION.map(i => i.id)).size).toBe(DA_SUBSTITUTION.length)
    expect(new Set(DA_SUBSTITUTION.map(i => i.collocationId)).size).toBe(DA_SUBSTITUTION.length)
  })
  test('every item joins a real collocation and matches its level', () => {
    const bad = DA_SUBSTITUTION.filter(i => !byId.has(i.collocationId) || byId.get(i.collocationId)!.level !== i.level)
    expect(bad.map(i => i.id)).toEqual([])
  })
  test('stem has exactly one gap and never contains the answer', () => {
    const bad = DA_SUBSTITUTION.filter(i => {
      const gaps = (i.stem.match(/___/g) ?? []).length
      return gaps !== 1 || i.stem.toLowerCase().includes(substitutionAnswer(i).toLowerCase())
    })
    expect(bad.map(i => i.id)).toEqual([])
  })
  test('context uses the preposition (incl. common contractions)', () => {
    const CONTRACTIONS: Record<string, string[]> = {
      an: ['am', 'ans'], auf: ['aufs'], in: ['im', 'ins'], von: ['vom'],
      zu: ['zum', 'zur'], für: ['fürs'], um: ['ums'], über: ['übers'], vor: ['vorm'],
    }
    const bad = DA_SUBSTITUTION.filter(i => {
      const prep = byId.get(i.collocationId)!.preposition
      const words = i.context.toLowerCase().split(/[^a-zäöüß]+/)
      return !(words.includes(prep) || (CONTRACTIONS[prep] ?? []).some(c => words.includes(c)))
    })
    expect(bad.map(i => i.id)).toEqual([])
  })
  test('level floors: B1>=30, B2>=30, C1>=15', () => {
    const n = (l: string) => DA_SUBSTITUTION.filter(i => i.level === l).length
    expect(n('B1')).toBeGreaterThanOrEqual(30)
    expect(n('B2')).toBeGreaterThanOrEqual(30)
    expect(n('C1')).toBeGreaterThanOrEqual(15)
  })
})

describe('NEIGHBOR_PREPS', () => {
  test('each entry maps to 3 distinct compoundable prepositions, none the key itself', () => {
    for (const [prep, neighbors] of Object.entries(NEIGHBOR_PREPS)) {
      expect(new Set(neighbors).size).toBe(3)
      expect(neighbors).not.toContain(prep)
      for (const n of neighbors) expect(canFormCompound(n)).toBe(true)
    }
  })
  test('covers every primary collocation preposition', () => {
    const primaries = new Set(COLLOCATIONS.map(c => c.preposition))
    for (const p of primaries) expect(NEIGHBOR_PREPS[p]).toBeDefined()
  })
  test('answers derive from the collocation preposition', () => {
    const item = DA_SUBSTITUTION[0]
    expect(substitutionAnswer(item)).toBe(daCompound(byId.get(item.collocationId)!.preposition))
  })
})
```

- [ ] **Step 2: RED**, then **Step 3: author the data**. `NEIGHBOR_PREPS` (use exactly):

```ts
export const NEIGHBOR_PREPS: Record<string, string[]> = {
  an: ['auf', 'über', 'von'], auf: ['an', 'über', 'um'], über: ['an', 'von', 'auf'],
  von: ['über', 'an', 'nach'], für: ['um', 'gegen', 'zu'], um: ['für', 'auf', 'über'],
  mit: ['zu', 'bei', 'von'], nach: ['zu', 'um', 'von'], vor: ['von', 'gegen', 'um'],
  zu: ['für', 'nach', 'mit'], gegen: ['für', 'um', 'vor'], bei: ['mit', 'zu', 'an'],
  aus: ['von', 'in', 'nach'], in: ['an', 'auf', 'aus'], unter: ['über', 'von', 'mit'],
}
```

Authoring rules for the ≥90 items (this is careful German writing — take your time, self-review every sentence):
- Pick ≥90 distinct collocations across levels/roles (mostly verbs; sprinkle adjectives/nouns like *stolz auf*, *die Angst vor*).
- `context`: one natural sentence using the collocation with a **thing or abstract** object (never a person/animal — the follow-up da-compound would be wrong German for persons). A2/B1-friendly vocabulary at B1 level; freer at B2/C1.
- `stem`: a natural follow-up sentence replacing the prepositional phrase anaphorically with `___`. It must read as an answer/echo: `Anita freut sich über die bestandene Prüfung.` / `Sie freut sich schon lange ___.`
- `id`: `sub-<collocationId>`. Level copied from the collocation.
- Exemplars (author in this quality; these five may be included):

```ts
{ id: 'sub-warten-auf', collocationId: 'warten-auf', level: 'B1',
  context: 'Ich warte seit zehn Minuten auf den Bus.',
  stem: 'Ich warte schon viel zu lange ___.' },
{ id: 'sub-sich-freuen-ueber', collocationId: 'sich-freuen-ueber', level: 'B1',
  context: 'Anita freut sich über die bestandene Prüfung.',
  stem: 'Sie freut sich wirklich sehr ___.' },
{ id: 'sub-traeumen-von', collocationId: 'traeumen-von', level: 'B1',
  context: 'Er träumt von einem eigenen Restaurant.',
  stem: 'Er träumt schon seit Jahren ___.' },
{ id: 'sub-sich-gewoehnen-an', collocationId: 'sich-gewoehnen-an', level: 'B1',
  context: 'Sie gewöhnt sich langsam an das kalte Wetter.',
  stem: 'Man gewöhnt sich mit der Zeit ___.' },
{ id: 'sub-abhaengen-von', collocationId: 'abhaengen-von', level: 'B2',
  context: 'Der Ausflug hängt vom Wetter ab.',
  stem: 'Ob wir fahren, hängt ganz ___ ab.' },
```

(Verify each `collocationId` against `collocations.ts` — ids there are kebab-case of word+preposition; look them up, do not guess. If a chosen collocation's id differs, use the real id.)

- [ ] **Step 4: GREEN + full gates.** **Step 5: Commit** `feat(da-compounds): substitution dataset (90+ authored items) + near-neighbor map`

---

### Task 3: T3 substitution gap-fill + T4 near-neighbor discrimination

**Files:**
- Create: `src/composables/useDaSubstitutionQuiz.ts`, `src/modules/da-compounds/SubstitutionSetup.vue`, `src/modules/da-compounds/SubstitutionRunner.vue`, `src/modules/da-compounds/NeighborsSetup.vue`, `src/modules/da-compounds/NeighborsRunner.vue`
- Modify: `src/router.ts` (4 routes), `DaCompoundsHome.vue` (group 'Compound recall · Einsetzen' with cards T3, T4)
- Test: `tests/composables/useDaSubstitutionQuiz.test.ts`, `tests/modules/da-compounds/SubstitutionRunner.test.ts`, `tests/modules/da-compounds/NeighborsRunner.test.ts`

**Interfaces:**
- Consumes: Task 2's exports; `checkText` from drillGrading; `shuffle` from pool; `prepColorStyle`; Task 1's history types.
- Produces: engine `useDaSubstitutionQuiz(items: JoinedItem[], opts: { mode: 'pick' | 'type'; distractors: 'random' | 'neighbors' })` where `JoinedItem = { item: SubstitutionItem; colloc: Collocation }`; question exposes `{ answer, options (pick mode: 4 shuffled), submitText(input), pickOption(option), isCorrect }`.

Key engine logic (write fully, test-first):
- `answer = daCompound(colloc.preposition)`.
- Pick options: `random` → 3 distractor compounds sampled (via `shuffle`) from the OTHER distinct compounds of the run's item pool (fall back to all compoundable preps when the pool has <4 distinct); `neighbors` → `NEIGHBOR_PREPS[colloc.preposition].map(daCompound)`. Always 4 options, shuffled, answer included exactly once.
- Type grading: `checkText(input, answer)`.
- Reveal payload for the runner: the collocation's `word`, `preposition` (+ `prepColorStyle` accent), `case`, and `coreIdeaExplanation` on wrong answers — same teaching reveal as the Fixed prepositions drill.

Setups: chips for levels/roles/preps (prep values = `Array.from(new Set(COLLOCATIONS.map(c => c.preposition))).sort()`), count presets, and on T3 a mode segmented control (`pick` "B1 · choose" / `type` "B2 · type it"); localStorage keys `'dacSubstitutionSetup'` / `'dacNeighborsSetup'`; query params `levels,roles,preps,count,mode`. Runners: context sentence (collocation word bolded), stem with the gap; pick = 4 option buttons (keyboard 1-4), type = text input + submit; recording (`'dac-substitution'` meta `{ levels, roles, preps, mode }` derived from sampled items + chosen mode; `'dac-neighbors'` meta `{ levels, roles, preps }`); RetryModal + summary per house pattern. Pool filtering joins `DA_SUBSTITUTION` to `COLLOCATIONS` and filters on the collocation's `level`/`role`/`preposition`.

Tests: engine (pick options contain answer + 3 uniques; neighbors mode uses the map's compounds; type mode accepts folded umlauts `darueber`; wrong → wrongItems), runners (mock `saveQuizRun`; count=1; records once with right type+meta; retry not recorded; option buttons render 4 choices).

- [ ] Steps: failing tests → RED → engine → setups/runners → routes + home cards (`T3` 'Gap-fill' / de 'Lückentext'; `T4` 'Near neighbors' / de 'Verwechslungsgefahr') → GREEN → full gates → **Commit** `feat(da-compounds): T3 substitution gap-fill + T4 near-neighbor drill`

---

### Task 4: T2 compound matching + release prep

**Files:**
- Create: `src/composables/useDaMatchQuiz.ts`, `src/modules/da-compounds/MatchSetup.vue`, `src/modules/da-compounds/MatchRunner.vue`
- Modify: `src/router.ts` (2 routes), `DaCompoundsHome.vue` (card T2 in 'Formation basics'), `src/data/changelog.ts` + `package.json` (v1.12.3)
- Test: `tests/composables/useDaMatchQuiz.test.ts`, `tests/modules/da-compounds/MatchRunner.test.ts`

**Interfaces:**
- Consumes: `COLLOCATIONS` filters, `daCompound`, `shuffle`, Task 1's `'dac-match'` type.
- Produces: engine `useDaMatchQuiz(collocs: Collocation[], pairsPerScreen = 5)`.

Engine design (test-first): screens built from the sampled collocations, each screen = up to 5 collocations with **pairwise-distinct prepositions** (greedy pack: walk the shuffled sample, start a new screen when a prep repeats or 5 reached). Screen state: `left: { collocId, word, english }[]`, `right: string[]` (that screen's compounds, shuffled), `pairs: Map<collocId, compound>`, `submitScreen()` grades each pair (`compound === daCompound(colloc.preposition)`), per-pair correct feeds `score`/`total` (total = number of collocations sampled); `wrongCollocs` for retry. API: `{ screens, screenIndex, currentScreen, assign(collocId, compound), unassign(collocId), allAssigned, submitScreen, advanceScreen, finished, score, total, wrongCollocs }`.

Runner UI: two columns (left word+gloss rows, right compound chips); tap a left row (highlights) then a right chip to pair (chip shows on the row; chip leaves the pool); tapping a paired row unassigns. Submit enabled when `allAssigned`; on submit, rows go green/red with the correct compound revealed on red rows (+ `prepColorStyle` accent on reveal); Weiter → next screen. RetryModal on finish when `wrongCollocs.length > 0` (retry = new engine over the wrong collocations). Record once: `'dac-match'`, `count = total`, `correct = score`, meta `{ levels, roles, preps }` derived from the sample. Mobile: columns stack ≤560px (left list full-width, right chips wrap in a row above them) — keep rows ≥44px tall.

Setup: chips (levels/roles/preps) + count presets (count = number of collocations, i.e. pairs, default 15); localStorage `'dacMatchSetup'`.

Release prep: `package.json` 1.12.3 (+ `npm install --package-lock-only`), `changelog.ts` `APP_VERSION = '1.12.3'` and prepend:

```ts
{
  version: '1.12.3', date: '2026-07-23', kind: 'polish',
  title: 'Da-Compounds · the first four drills',
  notes: [
    '<strong>Four drills open the module.</strong> <em>T1 da- or dar-?</em> — a speed round on formation, traps included (<em>*darohne</em> doesn\'t exist). <em>T2 Matching</em> — pair verbs with their compound. <em>T3 Gap-fill</em> — replace the prepositional phrase anaphorically (<em>Sie freut sich ___</em> → <em>darüber</em>), choose-from-four or type-it modes. <em>T4 Near neighbors</em> — distractors picked to be confusable (<em>denken an / warten auf / sprechen über</em>).',
    '<strong>90+ hand-written sentence pairs</strong> drive the gap-fill drills, each tied to a collocation from the Fixed prepositions dataset and guarded by automated invariants. Every drill records to History and filters by level, word type, and preposition.'
  ]
},
```

- [ ] Steps: failing tests → RED → engine → setup/runner → routes + home card (`T2` 'Matching' / de 'Zuordnung') → changelog/bump → GREEN → full gates → **Commit** `feat(da-compounds): T2 matching drill; v1.12.3`

---

### Controller wrap-up (not a subagent task)

- [ ] Final whole-branch review (most capable model; German audit of all authored sentences is the highest-value pass) + fix wave (controller-inline if small)
- [ ] CDP 390px probe on all four runner pages + module home (0 overflow offenders; matching columns stack)
- [ ] Merge `feat/phase2-dacompounds-drills` → main (`v1.12.3` merge message), `npm run deploy`, `git push origin main`
