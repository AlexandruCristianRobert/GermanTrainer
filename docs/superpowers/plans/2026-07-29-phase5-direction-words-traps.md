# Phase 5 — Direction Words Trap Drills (T8–T9), Module Complete — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Direction Words module gains its final two drills — T8 "Directional or lexicalized?" and T9 "Idiom gap-fill" — completing the module (spec §7 Phase 5, §3 Family F).

**Architecture:** Both drills mirror the da-compounds T18 homograph pattern: a standalone authored bank, level-filtered via `createPool`, a pick-one-of-N engine with per-item options built once and never re-rolled, and a reveal that always shows the teaching explanation. T8 = two readings per item (`directional` | `lexicalized`) with per-verb labels (the `HOMOGRAPH_WORDS` analogue) and explicit **surface spans** so the runner can bold a split verb ("stellt … her"). T9 = four idiom options per item, all real idioms, exactly one correct. Both UIs mirror the module's own `RegisterRunner.vue`/`RegisterSetup.vue` (in-repo, reviewed clean) — the same judge-a-card-then-reveal shape.

**Two design decisions:**
1. **T8 uses explicit `surfaces: string[]` per item, not a computed word match.** German separable prefixes split ("Die Firma stellt Möbel **her**") and inflect ("herausgefunden"), so no regex over the infinitive can reliably locate the verb in the sentence. The data names the exact substrings to bold; an invariant checks each appears verbatim. (This also sidesteps the Phase-4 boundary-matching class of bug entirely.)
2. **T9 distractors are always REAL idioms used wrongly, never invented phrases** — the same principle as Phase 2's "no misformed compounds as tappable options": showing a learner a fake idiom as a plausible choice normalizes it. Every option must come from the declared idiom inventory.

**Tech Stack:** Vue 3, Vitest; reuse `createPool`/`shuffle` (`src/data/pool.ts`), `saveQuizRun`, `RetryModal`, the module's Setup/Runner conventions.

## Global Constraints

- Branch `feat/phase5-direction-words-traps` off `main`; merge in the final controller step.
- Route names hyphen-free: `directionwords-lexical(-run)`, `directionwords-idioms(-run)`; paths `/direction-words/lexical(/run)`, `/direction-words/idioms(/run)`.
- New `QuizHistoryType` ids exactly `'dw-lexical'`, `'dw-idiom'`, inserted after `'dw-answer'` in every registry (grep `'dw-answer'` — six files: `useQuizHistory.ts` union, `quiz-type-labels.ts` ×3, `HistoryPage.vue` ×2, `useQuizStats.ts` ×2, `useLevelAssessment.ts`).
- Recording: offline-drill rules (NOT the AI-drill convention) — record the main round once via `startedAtMs` + `historySaved` + `watch(finished)`; **retry rounds never record**; meta `{ levels }` for both.
- **German accuracy is a shipping gate.** For T8 specifically: every item's claimed reading must be the ONLY reading its sentence admits — read each sentence in both readings; one must be impossible or absurd (the `daHomograph.ts` header states this discipline; apply it verbatim). A verb listed as admitting both readings must have BOTH genuinely attested in real German — if a reading is only theoretically constructible, that verb is lexicalized-only.
- Known authoring traps from Phases 2–4 (check explicitly): separable-prefix fusion in any sentence you author; no debatable verdicts (if natives would argue the reading, drop the item); distractors must never be non-words.
- hin = away from the speaker, her = toward the speaker — in every label, explanation, and UI string.
- Phone-first ~390px (option buttons ≥44px, wrap). Gates: full suite green (known ThemeToggle order-dependent flake: sole failure → isolated rerun, proceed) + `npm run typecheck`. Never touch dist/ or GermanVerbTester/.
- Release: **v1.14.04**, kind `'polish'`, date `2026-07-29` — the module-complete release (da-compounds' v1.12.9 is the precedent for framing).
- Commits end with: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>` (this phase runs on Opus 5; earlier phases used the then-current model's trailer)

---

### Task 1: T8 verb-reading bank (authored)

**Files:**
- Create: `src/data/directionVerbs.ts`
- Test: `tests/data/directionVerbs.test.ts`

**Interfaces:**
- Consumes: `type DirectionLevel`, `DIRECTION_LEVELS`, `LEXICALIZED_VERBS` from `src/data/directionWords.ts`.
- Produces (Tasks 3–4 rely on):

```ts
export type DwVerbReading = 'directional' | 'lexicalized'
export interface DwVerbEntry {
  verb: string               // infinitive as the drill labels it, e.g. 'herstellen'
  directionalLabel: string   // what the prefix would mean literally (German — English)
  lexicalizedLabel: string   // the fixed meaning (German — English)
  bothReadings: boolean      // true when real German attests BOTH for this verb
}
export interface DwVerbItem {
  id: string                 // `lx-<n>`
  verb: string               // joins DW_VERB_ENTRIES
  sentence: string           // uses the verb in exactly ONE reading
  surfaces: string[]         // 1–2 substrings appearing VERBATIM in `sentence`, spanning the verb (e.g. ['stellt', 'her'])
  reading: DwVerbReading
  explanation: string        // 'Deutsch … / English …'
  level: DirectionLevel
}
export const DW_VERB_ENTRIES: DwVerbEntry[]      // ≥12 verbs, ≥5 with bothReadings
export const DIRECTION_VERBS: DwVerbItem[]       // ≥32 items
export function verbEntryFor(item: DwVerbItem): DwVerbEntry   // throws on unknown verb (daHomograph's wordFor precedent)
```

- [ ] **Step 1: Invariant tests FIRST.** Create `tests/data/directionVerbs.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  DW_VERB_ENTRIES, DIRECTION_VERBS, verbEntryFor,
} from '../../src/data/directionVerbs'
import { DIRECTION_LEVELS, LEXICALIZED_VERBS } from '../../src/data/directionWords'

const entryByVerb = new Map(DW_VERB_ENTRIES.map(e => [e.verb, e]))

describe('DW_VERB_ENTRIES', () => {
  test('unique verbs, all hin-/her- prefixed, both labels non-empty', () => {
    const verbs = DW_VERB_ENTRIES.map(e => e.verb)
    expect(new Set(verbs).size).toBe(verbs.length)
    const bad = DW_VERB_ENTRIES.filter(e =>
      !/^(hin|her)/.test(e.verb)
      || e.directionalLabel.trim().length === 0
      || e.lexicalizedLabel.trim().length === 0
      || e.directionalLabel === e.lexicalizedLabel)
    expect(bad.map(e => e.verb)).toEqual([])
  })

  test('floors: ≥12 verbs, ≥5 flagged bothReadings', () => {
    expect(DW_VERB_ENTRIES.length).toBeGreaterThanOrEqual(12)
    expect(DW_VERB_ENTRIES.filter(e => e.bothReadings).length).toBeGreaterThanOrEqual(5)
  })
})

describe('DIRECTION_VERBS', () => {
  test('unique ids, valid levels, non-empty explanation with both halves', () => {
    expect(new Set(DIRECTION_VERBS.map(i => i.id)).size).toBe(DIRECTION_VERBS.length)
    const bad = DIRECTION_VERBS.filter(i =>
      !(DIRECTION_LEVELS as readonly string[]).includes(i.level)
      || !i.explanation.includes(' / ')
      || i.sentence.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every item joins a known verb entry', () => {
    const bad = DIRECTION_VERBS.filter(i => !entryByVerb.has(i.verb))
    expect(bad.map(i => i.id)).toEqual([])
    for (const i of DIRECTION_VERBS) expect(verbEntryFor(i).verb).toBe(i.verb)
  })

  test('SURFACE GATE: 1-2 surfaces, each appearing verbatim in the sentence', () => {
    const bad = DIRECTION_VERBS.filter(i =>
      i.surfaces.length < 1 || i.surfaces.length > 2
      || i.surfaces.some(s => s.trim().length === 0 || !i.sentence.includes(s)))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('SURFACE GATE: the surfaces carry the verb prefix', () => {
    // The prefix is the leading hin/her(+element) of the entry's infinitive; some
    // surface must begin with it (split: 'her'; fused: 'herausgefunden').
    const bad = DIRECTION_VERBS.filter(i => {
      const prefix = /^((?:hin|her)(?:ein|aus|auf|unter|über|ab|um|vor|durch|zu)?)/.exec(i.verb)![1]
      return !i.surfaces.some(s => s.toLowerCase().startsWith(prefix.toLowerCase())
        || prefix.toLowerCase().startsWith(s.toLowerCase()))
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('a verb NOT flagged bothReadings contributes only its one reading', () => {
    const offenders: string[] = []
    for (const e of DW_VERB_ENTRIES.filter(e => !e.bothReadings)) {
      const readings = new Set(DIRECTION_VERBS.filter(i => i.verb === e.verb).map(i => i.reading))
      if (readings.size > 1) offenders.push(e.verb)
    }
    expect(offenders).toEqual([])
  })

  test('every bothReadings verb actually contributes BOTH readings', () => {
    const offenders: string[] = []
    for (const e of DW_VERB_ENTRIES.filter(e => e.bothReadings)) {
      const readings = new Set(DIRECTION_VERBS.filter(i => i.verb === e.verb).map(i => i.reading))
      if (readings.size !== 2) offenders.push(e.verb)
    }
    expect(offenders).toEqual([])
  })

  test('floors: ≥32 items, ≥12 per reading; levels B1≥8, B2≥12, C1≥6', () => {
    expect(DIRECTION_VERBS.length).toBeGreaterThanOrEqual(32)
    for (const r of ['directional', 'lexicalized'] as const)
      expect(DIRECTION_VERBS.filter(i => i.reading === r).length, r).toBeGreaterThanOrEqual(12)
    const n = (l: string) => DIRECTION_VERBS.filter(i => i.level === l).length
    expect(n('B1')).toBeGreaterThanOrEqual(8)
    expect(n('B2')).toBeGreaterThanOrEqual(12)
    expect(n('C1')).toBeGreaterThanOrEqual(6)
  })

  test('cheatsheet coverage: every Phase-1 LEXICALIZED_VERBS entry is drilled', () => {
    // The cheatsheet teaches these; the drill must test them (bare infinitive,
    // reflexive/preposition tails stripped, e.g. 'sich herausstellen' -> 'herausstellen').
    const drilled = new Set(DW_VERB_ENTRIES.map(e => e.verb))
    const missing = LEXICALIZED_VERBS
      .map(v => v.verb.replace(/^sich /, '').replace(/ .*$/, ''))
      .filter(v => !drilled.has(v))
    expect(missing).toEqual([])
  })
})
```

- [ ] **Step 2: Verify RED** (`npx vitest run tests/data/directionVerbs.test.ts` — unresolvable module).

- [ ] **Step 3: Author the data.** Read `src/data/daHomograph.ts` lines 1-70 first — mirror its header discipline (state the two readings, state that accuracy is the gate and how each reading is blocked) and its section-divider comment style. ids `lx-<n>`.

**`DW_VERB_ENTRIES` authoring rules:**
- ≥12 verbs. Include every Phase-1 cheatsheet verb (bare form): `herstellen`, `hinrichten`, `hinweisen`, `hinzufügen`, `herausfinden`, `herausfordern`, `herausstellen`, `hervorheben` (the coverage test enforces this).
- ≥5 flagged `bothReadings: true`. **Verify each claimed pair against real usage before shipping it** — candidates to evaluate (accept only those you can attest both ways): `herausfinden` (find out / find one's way out), `herunterkommen` (come down / go to seed), `hinausgehen` (go out / über etwas hinausgehen = exceed), `hinauslaufen` (run out / auf etwas hinauslaufen = amount to), `herausbringen` (publish / carry out), `hereinfallen` (be duped / fall in), `hereinbrechen` (descend upon / break in). If a candidate fails your check, replace it — do NOT ship a fabricated reading to hit the floor.
- Labels are the two buttons the learner picks between, so both must read as plausible meanings: `directionalLabel` describes the literal prefix reading, `lexicalizedLabel` the fixed meaning. Format `German — "English"`.

**`DIRECTION_VERBS` authoring rules:**
- ≥32 items; ≥12 per reading. Each sentence uses its verb in exactly ONE reading; the other reading must be impossible or absurd in that sentence (context, object, or collocation blocks it — e.g. a factory producing furniture cannot be "putting furniture here"; `über die Grenzen hinausgehen` cannot be literal walking).
- `surfaces` names the exact substrings to bold: split forms give two (`['stellt', 'her']`), fused/infinitive forms give one (`['herausgefunden']`). Copy them from your own sentence — the invariant compares verbatim.
- Levels: lexicalized-only vocabulary skews B2/C1; plain directional readings can sit at B1.
- `explanation` names the reading AND why the other is blocked, German half then English half.

Exemplars (may be included verbatim):

```ts
export const DW_VERB_ENTRIES: DwVerbEntry[] = [
  { verb: 'herstellen', bothReadings: false,
    directionalLabel: 'her = zum Sprecher — "put it over here"',
    lexicalizedLabel: 'herstellen = produzieren — "to manufacture"' },
  { verb: 'herausfinden', bothReadings: true,
    directionalLabel: 'heraus = nach draußen — "find your way out"',
    lexicalizedLabel: 'herausfinden = ermitteln — "to find out"' },
  // …
]

export const DIRECTION_VERBS: DwVerbItem[] = [
  { id: 'lx-1', verb: 'herstellen', reading: 'lexicalized', level: 'B1',
    sentence: 'Die Firma stellt seit über hundert Jahren Möbel her.',
    surfaces: ['stellt', 'her'],
    explanation: 'herstellen = produzieren; niemand "stellt Möbel hierher" — die Firma fertigt sie. / Lexicalized: manufacture. The directional reading (placing furniture here) is blocked by "seit hundert Jahren" and the company subject.' },
  { id: 'lx-2', verb: 'herausfinden', reading: 'lexicalized', level: 'B1',
    sentence: 'Wir haben inzwischen herausgefunden, warum der Zug ausgefallen ist.',
    surfaces: ['herausgefunden'],
    explanation: 'herausfinden = ermitteln — der dass-/warum-Satz zeigt es an. / Lexicalized: find out; the warum-clause blocks any "find the way out" reading.' },
  { id: 'lx-3', verb: 'herausfinden', reading: 'directional', level: 'B2',
    sentence: 'Der Wald ist groß — findest du allein wieder heraus?',
    surfaces: ['findest', 'heraus'],
    explanation: 'Hier wörtlich: den Weg nach draußen finden. / Directional: find your way out of the forest — a physical exit, not a fact.' },
]
```

- [ ] **Step 4: GREEN + typecheck.** `npx vitest run tests/data/directionVerbs.test.ts tests/data/directionWords.test.ts` → PASS; `npm run typecheck` → PASS.
- [ ] **Step 5: Self-review pass.** Read every sentence in BOTH readings; confirm one is blocked. Confirm every `bothReadings` claim is real German you can attest.
- [ ] **Step 6: Commit** `feat(direction-words): lexicalized-verb reading bank (32+ authored items)`

---

### Task 2: T9 idiom bank (authored)

**Files:**
- Create: `src/data/directionIdioms.ts`
- Test: `tests/data/directionIdioms.test.ts`

**Interfaces:**
- Consumes: `type DirectionLevel`, `DIRECTION_LEVELS`, `IDIOMS` from `src/data/directionWords.ts`.
- Produces (Tasks 3, 5 rely on):

```ts
export interface DwIdiomItem {
  id: string          // `id-<n>`
  sentence: string    // exactly one ___ gap standing for the whole idiom surface
  answer: string      // the surface that fills the gap, e.g. 'hin und her'
  options: string[]   // 3–4 unique real idiom surfaces, exactly one === answer
  idiomKey: string    // the IDIOMS[].idiom entry this drills (cheatsheet cross-link)
  explanation: string // 'Deutsch … / English …' — names the meaning and the near-miss it is not
  level: DirectionLevel
}
export const DW_IDIOM_SURFACES: readonly string[]   // the closed inventory every option must come from
export const DIRECTION_IDIOMS: DwIdiomItem[]        // ≥24 items
```

- [ ] **Step 1: Invariant tests FIRST.** Create `tests/data/directionIdioms.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { DIRECTION_IDIOMS, DW_IDIOM_SURFACES } from '../../src/data/directionIdioms'
import { DIRECTION_LEVELS, IDIOMS } from '../../src/data/directionWords'

const KEYS = new Set(IDIOMS.map(i => i.idiom))

describe('DIRECTION_IDIOMS invariants', () => {
  test('unique ids, valid levels, explanation halves, exactly one gap', () => {
    expect(new Set(DIRECTION_IDIOMS.map(i => i.id)).size).toBe(DIRECTION_IDIOMS.length)
    const bad = DIRECTION_IDIOMS.filter(i =>
      !(DIRECTION_LEVELS as readonly string[]).includes(i.level)
      || !i.explanation.includes(' / ')
      || (i.sentence.match(/___/g) ?? []).length !== 1)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('options: 3-4 unique, exactly one is the answer, ALL from the closed inventory', () => {
    const bad = DIRECTION_IDIOMS.filter(i =>
      i.options.length < 3 || i.options.length > 4
      || new Set(i.options).size !== i.options.length
      || i.options.filter(o => o === i.answer).length !== 1
      || i.options.some(o => !DW_IDIOM_SURFACES.includes(o)))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('the answer is itself an inventory surface and never leaks into the sentence', () => {
    const bad = DIRECTION_IDIOMS.filter(i => {
      if (!DW_IDIOM_SURFACES.includes(i.answer)) return true
      const escaped = i.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`\\b${escaped}\\b`, 'i').test(i.sentence)
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every item cross-links a real cheatsheet idiom', () => {
    const bad = DIRECTION_IDIOMS.filter(i => !KEYS.has(i.idiomKey))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('cheatsheet coverage: every IDIOMS entry is drilled at least once', () => {
    const drilled = new Set(DIRECTION_IDIOMS.map(i => i.idiomKey))
    expect(IDIOMS.map(i => i.idiom).filter(k => !drilled.has(k))).toEqual([])
  })

  test('NEAR-MISS GATE: hin und her / hin und wieder always distract each other', () => {
    const TWINS: Record<string, string> = {
      'hin und her': 'hin und wieder',
      'hin und wieder': 'hin und her',
    }
    const bad = DIRECTION_IDIOMS.filter(i =>
      TWINS[i.answer] !== undefined && !i.options.includes(TWINS[i.answer]))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥24 items; ≥2 per cheatsheet idiom for the two C1 twins; levels B1≥8, B2≥8, C1≥4', () => {
    expect(DIRECTION_IDIOMS.length).toBeGreaterThanOrEqual(24)
    for (const key of ['hin und her', 'hin und wieder'])
      expect(DIRECTION_IDIOMS.filter(i => i.idiomKey === key).length, key).toBeGreaterThanOrEqual(2)
    const n = (l: string) => DIRECTION_IDIOMS.filter(i => i.level === l).length
    expect(n('B1')).toBeGreaterThanOrEqual(8)
    expect(n('B2')).toBeGreaterThanOrEqual(8)
    expect(n('C1')).toBeGreaterThanOrEqual(4)
  })
})
```

- [ ] **Step 2: RED.** **Step 3: Author.**

**`DW_IDIOM_SURFACES`** — the closed option inventory. Include the eight cheatsheet idioms in gap-fillable surface form plus a few extra real surfaces to widen distractor choice, e.g.:

```ts
export const DW_IDIOM_SURFACES = [
  'hin und her', 'hin und wieder', 'hin und zurück', 'vor sich hin',
  'her', 'hin', 'hinter ihr her', 'hinter ihm her',
  'noch lange hin', 'lange her', 'her mit', 'nach wie vor',
] as const satisfies readonly string[]
```
(Adjust to what your items actually need — every option must be a real German surface; never invent one.)

**Item authoring rules:**
- ≥24 items; one `___` gap per sentence standing for the whole idiom surface.
- Distractors: 2–3 other REAL surfaces that are wrong *here* — wrong meaning, wrong register, or wrong time direction. The near-miss gate forces the *hin und her*/*hin und wieder* confusion pair to face each other; also exploit *lange her* (time since) vs *noch lange hin* (time until).
- `explanation` states the answer's meaning AND why the tempting near-miss fails (that is the teaching payload).
- Levels: the plain frequency/motion idioms at B1, patterned ones (*hinter … her*, *vor sich hin*) B2, the twin discriminations and *noch lange hin* at C1.

Exemplars (may be included verbatim):

```ts
{ id: 'id-1', idiomKey: 'hin und her', answer: 'hin und her', level: 'B1',
  sentence: 'Wir haben lange ___ überlegt, ob wir das Auto verkaufen sollen.',
  options: ['hin und her', 'hin und wieder', 'hin und zurück'],
  explanation: '„hin und her" = vor und zurück, also lange hin- und herdenken. / "hin und her" = back and forth; "hin und wieder" (now and then) would say how OFTEN you thought, not how you thought.' },
{ id: 'id-2', idiomKey: 'hin und wieder', answer: 'hin und wieder', level: 'B1',
  sentence: '___ gehe ich noch in dieses kleine Kino am Hafen.',
  options: ['hin und wieder', 'hin und her', 'vor sich hin'],
  explanation: '„hin und wieder" = manchmal, gelegentlich. / "hin und wieder" = now and then; "hin und her" would mean going back and forth, not occasionally.' },
{ id: 'id-3', idiomKey: 'lange her', answer: 'lange her', level: 'C1',
  sentence: 'Unser letztes Treffen ist schon ziemlich ___.',
  options: ['lange her', 'noch lange hin', 'hin und her'],
  explanation: '„lange her" blickt zurück (Zeit seit damals). / "lange her" looks BACK; "noch lange hin" looks FORWARD to something still ahead.' },
```

- [ ] **Step 4: GREEN + typecheck.** **Step 5: Self-review** every sentence and every distractor: is the distractor genuinely wrong in that slot (not a second valid answer)? **Step 6: Commit** `feat(direction-words): idiom gap-fill bank (24+ authored items)`

---

### Task 3: History plumbing (2 types) + both engines

**Files:**
- Modify: the six registries (insert after `'dw-answer'`)
- Create: `src/composables/useDwLexicalQuiz.ts`, `src/composables/useDwIdiomQuiz.ts`
- Test: `tests/composables/useDwLexicalQuiz.test.ts`, `tests/composables/useDwIdiomQuiz.test.ts`, extend `tests/components/quiz-type-labels.test.ts`

**Interfaces:**
- Produces:

```ts
// useDwLexicalQuiz.ts — mirrors src/composables/useDaHomographQuiz.ts one-for-one
export type { DwVerbReading }
export type DwLexicalFilter = { levels?: DirectionLevel[] }
export function filterLexicalItems(f?: DwLexicalFilter): DwVerbItem[]
export function sampleLexicalItems(count: number, f?: DwLexicalFilter): DwVerbItem[]
export interface DwLexicalOption { reading: DwVerbReading; label: string }
export interface DwLexicalQuestion { item: DwVerbItem; options: DwLexicalOption[]; picked: DwVerbReading | null; isCorrect: boolean | null }
export function useDwLexicalQuiz(items: DwVerbItem[]): { questions, currentIndex, current, finished, total, score, wrongItems, pick, advance }
/** Splits a sentence around its (1-2) surfaces so the runner can bold them in place. */
export function splitVerbSentence(item: DwVerbItem): Array<{ text: string; bold: boolean }>

// useDwIdiomQuiz.ts
export type DwIdiomFilter = { levels?: DirectionLevel[] }
export function filterIdiomItems(f?: DwIdiomFilter): DwIdiomItem[]
export function sampleIdiomItems(count: number, f?: DwIdiomFilter): DwIdiomItem[]
export interface DwIdiomQuestion { item: DwIdiomItem; options: string[]; picked: string | null; isCorrect: boolean | null }
export function useDwIdiomQuiz(items: DwIdiomItem[]): { questions, currentIndex, current, finished, total, score, wrongItems, pick, advance }
```

Engine notes:
- Options built ONCE per question at construction (`shuffle` of the two labels / of `item.options`), never re-rolled on re-render — the `useDaHomographQuiz` contract. Grading compares the pick against `item.reading` / `item.answer`; a second pick on an answered question is a no-op.
- `splitVerbSentence` walks the sentence left-to-right locating each surface in order via `indexOf` from the running cursor (surfaces are verbatim per the invariant), emitting alternating plain/bold parts. Two surfaces in a split verb appear in sentence order; if a surface is not found after the cursor, emit the remainder as plain (never throw in a render path).

Registry labels (after `'dw-answer'`):
- LABEL: `'dw-lexical': 'Direction words · lexicalized verbs'`, `'dw-idiom': 'Direction words · idioms'`
- DE: `'dw-lexical': 'Hin & Her · Verblasste Richtung'`, `'dw-idiom': 'Hin & Her · Redewendungen'`
- HistoryPage `QUIZ_TYPES`: same pairs, `module: 'Direction Words'`
- TYPE_LABEL: `'dw-lexical': 'directional-or-lexicalized choice'`, `'dw-idiom': 'idiom gap-fill'`

Tests (write fully, test-first): lexical — pick grades against `item.reading`; both option labels come from the item's verb entry and both appear; options stable across repeated reads of `current`; wrong pick lands in `wrongItems`; `splitVerbSentence` on a two-surface item yields bold parts exactly equal to the surfaces and the concatenation of all part texts equals the original sentence (property); on a one-surface item yields exactly one bold part; unknown-verb item throws via `verbEntryFor`. Idiom — options are the item's options (shuffled, same multiset), grading against `answer`, wrongItems, second-pick no-op.

- [ ] Steps: failing tests (incl. the two label ids) → RED → registries → both engines → GREEN + typecheck + full suite → **Commit** `feat(direction-words): history plumbing (traps) + lexical/idiom engines`

---

### Task 4: T8 Directional-or-lexicalized drill UI

**Files:**
- Create: `src/modules/direction-words/LexicalSetup.vue`, `src/modules/direction-words/LexicalRunner.vue`
- Modify: `src/router.ts` (2 routes after `directionwords-answer-run`), `DirectionWordsHome.vue` (new 'Traps · Fallen' group after 'Production', before 'Reference')
- Test: `tests/modules/direction-words/LexicalRunner.test.ts`

Mirror `src/modules/direction-words/RegisterSetup.vue` + `RegisterRunner.vue` (read both fully — same judge-and-reveal shape, same house recording block). Deltas:
- Setup: level chips only (default `['B1','B2']` — this drill has no A2 content) + count presets 10/15/20/all; localStorage `'dwLexicalSetup'`; breadcrumb `Modul · hin & her · Verblasste Richtung`; title `Directional or lexicalized?`; subtitle explaining that in some verbs the hin-/her- prefix stopped meaning direction, and the perspective rule cannot decode them.
- Runner: the sentence rendered with its surfaces bolded via `splitVerbSentence`; the verb's infinitive shown as a small caption; two option buttons carrying `directionalLabel` / `lexicalizedLabel` (keyboard 1–2); reveal always shows both labels with the correct one marked plus `item.explanation`; recording `type: 'dw-lexical'`, `meta: { levels }`; **retry rounds never record** (offline-drill rule); `itemLabel="sentences"`.
- Home group + card:

```ts
{
  heading: 'Traps',
  de: 'Fallen',
  cards: [
    {
      numeral: 'T8', route: 'directionwords-lexical',
      title: 'Directional or lexicalized?', de: 'Verblasste Richtung',
      desc: 'Die Firma stellt Möbel her — nobody is fetching anything. Decide whether the prefix still means direction or the verb is just vocabulary.',
    },
  ],
},
```

- Routes:

```ts
{ path: '/direction-words/lexical', name: 'directionwords-lexical', component: () => import('./modules/direction-words/LexicalSetup.vue') },
{ path: '/direction-words/lexical/run', name: 'directionwords-lexical-run', component: () => import('./modules/direction-words/LexicalRunner.vue') },
```

Runner test (deterministic — pin `Math.random` per the module's established pattern, unconditional assertions): two option buttons with the pinned item's entry labels; the sentence's surfaces render inside bold elements; a wrong pick reveals the explanation and marks the correct label; records `{ type: 'dw-lexical', count: 1 }` exactly once; **the retry round does NOT add a second record** (assert `toHaveBeenCalledTimes(1)` after driving a retry — note this is the opposite of the Phase-4 AI drills).

- [ ] Steps: failing test → RED → build → routes/home → GREEN + typecheck + full suite → **Commit** `feat(direction-words): T8 directional-or-lexicalized drill`

---

### Task 5: T9 Idiom drill UI + module-complete release

**Files:**
- Create: `src/modules/direction-words/IdiomSetup.vue`, `src/modules/direction-words/IdiomRunner.vue`
- Modify: `src/router.ts` (2 routes), `DirectionWordsHome.vue` (T9 card in 'Traps'), `src/data/changelog.ts` + `package.json` (v1.14.04), `docs/superpowers/specs/2026-07-28-direction-words-module-design.md` (completion line)
- Test: `tests/modules/direction-words/IdiomRunner.test.ts`

Mirror Task 4's pair. Deltas: options are the item's 3–4 idiom surfaces (keyboard 1–4); the gapped sentence renders with the `___` styled (reuse the module's existing gap styling from `CompoundRunner.vue`); reveal shows the filled sentence (gap replaced by the answer) + `item.explanation`; recording `type: 'dw-idiom'`, `meta: { levels }`, once, retry never; localStorage `'dwIdiomSetup'`; breadcrumb `Modul · hin & her · Redewendungen`; level chips default `['B1','B2']`. Card:

```ts
{
  numeral: 'T9', route: 'directionwords-idioms',
  title: 'Idiom gap-fill', de: 'Redewendungen',
  desc: 'hin und her or hin und wieder? Back-and-forth versus now-and-then — plus the two time idioms that point in opposite directions.',
},
```

Routes `/direction-words/idioms(/run)` with names `directionwords-idioms(-run)`.

**Release prep:**
- `package.json` `"version": "1.14.04"` + `npm install --package-lock-only`.
- `src/data/changelog.ts`: `APP_VERSION = '1.14.04'`, prepend:

```ts
{
  version: '1.14.04', date: '2026-07-29', kind: 'polish',
  title: 'Direction Words · the traps — module complete',
  notes: [
    '<strong>T8 Directional or lexicalized?</strong> <em>Die Firma stellt Möbel her</em> — nobody is fetching anything. Some verbs kept the direction (<em>Findest du allein wieder heraus?</em>), others turned into plain vocabulary (<em>herausfinden</em> = ermitteln), and a handful do both depending on the sentence. Decide which reading each sentence admits; the reveal shows both and explains what blocks the other.',
    '<strong>T9 Idiom gap-fill.</strong> <em>hin und her</em> or <em>hin und wieder</em>? Back-and-forth versus now-and-then, <em>lange her</em> (looking back) against <em>noch lange hin</em> (still ahead) — every distractor is a real idiom in the wrong slot.',
    '<strong>The Direction Words module is complete:</strong> nine drills — the perspective rule with scene diagrams, compound pairs, question words, r-form register, sentence assembly, two AI production drills with perspective-aware grading and weak points, and now the traps — plus the six-chapter cheatsheet. Every item hand-written, every scene-anchored answer machine-checked against its own diagram.'
  ]
},
```

- Spec doc: add under the `**Groomed:**` line of `docs/superpowers/specs/2026-07-28-direction-words-module-design.md`:
  `**Completed:** 2026-07-29 — all 5 phases implemented and released, v1.14.00 → v1.14.04. All 9 tests (T1–T9) + cheatsheet + weak points live.`
  and in §7, replace the roadmap's status line with `**STATUS: ALL PHASES COMPLETE** (released v1.14.00–v1.14.04, 2026-07-28/29; per-phase plans in docs/superpowers/plans/).`

Runner test: deterministic; 3–4 option buttons; wrong pick → explanation + filled sentence; records `{ type: 'dw-idiom' }` once; retry not recorded.

- [ ] Steps: failing test → RED → build → routes/home → changelog/version/spec → GREEN + typecheck + full suite → **Commit** `feat(direction-words): T9 idiom drill; module complete; v1.14.04`

---

### Controller wrap-up (not a subagent task)

- [ ] Final whole-branch review (Opus 5): **the German audit is the highest-value pass** — every T8 sentence read in both readings (is the claimed one truly the only one?), every `bothReadings` claim attested, every T9 distractor confirmed wrong-in-slot (not a second valid answer); plus registry/recording integrity and the offline-vs-AI retry convention
- [ ] ONE fix wave + scoped re-review
- [ ] Headless-Chrome 390px probe on both runners (judge one card each; bolded surfaces visible; options wrap) + dark spot-check on one
- [ ] Merge `feat/phase5-direction-words-traps` → main (`v1.14.04` merge message), suite green on merged main, `npm run deploy`, `git push origin main` (user pre-authorized the merge/push flow for these phases)
