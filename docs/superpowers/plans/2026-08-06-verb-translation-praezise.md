# Verb Translation · Präzise Variante Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the **Präzise** EN→DE variant to the word-level Verb translation drill: one card per *sense* (a situation-narrowed English meaning), where only the German verb(s) fitting that exact situation count.

**Architecture:** A new seeded dataset `src/data/verb-senses.ts` maps every ambiguous English meaning (one shared by 2+ verbs) to its senses — `{cue, verbs[]}` — guarded by a coverage test. Pure deck-building/grading/miss-explanation functions join the existing ones in `src/composables/useVerbQuiz.ts`. A new `PraeziseRunner.vue` (modeled on `BedeutungsfeldRunner.vue`) is dispatched from `TranslationQuizRunner.vue` by a new `variant` query param, which the setup page's new **Variante** segmented control supplies. Runs record the existing `verb-translation` history type with `meta.variant`.

**Tech Stack:** Vue 3 + TypeScript (strict, `vue-tsc`), Vitest, vue-router. No new dependencies.

## Global Constraints

- **No runtime AI** in this drill (ADR-0007: offline-first deterministic drills). All sense data is seeded and committed (ADR-0016).
- **Terminology** (CONTEXT.md): the variants are *Bedeutungsfeld* and *Präzise* — never "level 1/2" ([Verb level] means the A1–B2.2 frequency batches). The setup selector is the *Variante*. A card drills a *Sense*: situation cue + set of verbs fitting it equally.
- **Merged synonyms are deliberate** (ADR-0016): verbs no situation can split (*anfangen/beginnen*) share one sense; do NOT invent register cues.
- **Cues are English**, never contain German, never contain parentheses (the UI adds them).
- **Phone-first**: drill and setup must render and work at ~390px viewport.
- **German UI copy** on drill pages, matching the house tone (Bedeutungsfeld runner: „Prüfen →", „Aufdecken & weiter", „Auswertung").
- Commit style: `feat(verbs): …` / `test(verbs): …` / `chore: …`; end commit messages with the Claude Code co-author line.
- Run tests with `npx vitest run <file>` (full suite: `npm test`); typecheck with `npm run typecheck`.

---

### Task 1: Sense dataset + guard tests (`verb-senses.ts`)

**Files:**
- Create: `src/data/verb-senses.ts`
- Test: `tests/data/verbSenses.test.ts`

**Interfaces:**
- Consumes: `VERBS`, `type Verb` from `src/data/verbs.ts`.
- Produces (later tasks rely on these exact names):
  - `interface VerbSense { cue: string; verbs: readonly string[] }`
  - `interface MeaningSenses { meaning: string; senses: readonly VerbSense[] }`
  - `const VERB_SENSES: readonly MeaningSenses[]`
  - `function normalizeMeaning(s: string): string`
  - `function englishAlternativesOf(english: string): string[]`
  - `function buildMeaningMembers(verbs: readonly Pick<Verb, 'german' | 'english'>[]): Map<string, string[]>` — meaning → German infinitives carrying it
  - `function senseLookup(senses: readonly MeaningSenses[]): ReadonlyMap<string, MeaningSenses>` — keyed by normalized meaning

- [ ] **Step 1: Write the failing guard test**

`tests/data/verbSenses.test.ts` — this test file *defines done* for the authoring work:

```ts
import { describe, test, expect } from 'vitest'
import { VERBS } from '../../src/data/verbs'
import {
  VERB_SENSES,
  normalizeMeaning,
  englishAlternativesOf,
  buildMeaningMembers,
  senseLookup
} from '../../src/data/verb-senses'

const members = buildMeaningMembers(VERBS)
const ambiguous = [...members.entries()].filter(([, list]) => list.length > 1)
const lookup = senseLookup(VERB_SENSES)

describe('verb senses dataset', () => {
  test('meaning keys are normalized and unique', () => {
    const seen = new Set<string>()
    for (const m of VERB_SENSES) {
      expect(m.meaning, `not normalized: "${m.meaning}"`).toBe(normalizeMeaning(m.meaning))
      expect(seen.has(m.meaning), `duplicate meaning: ${m.meaning}`).toBe(false)
      seen.add(m.meaning)
    }
  })

  test('every entry belongs to a genuinely ambiguous meaning', () => {
    const offenders = VERB_SENSES
      .filter(m => (members.get(m.meaning) ?? []).length < 2)
      .map(m => m.meaning)
    expect(offenders).toEqual([])
  })

  test('cues are English-shaped: non-empty, no parens, no slashes, ≤80 chars, unique per meaning', () => {
    for (const m of VERB_SENSES) {
      const seen = new Set<string>()
      for (const s of m.senses) {
        expect(s.cue.trim().length, `${m.meaning}: empty cue`).toBeGreaterThan(0)
        expect(s.cue, `${m.meaning}: cue has parens`).not.toMatch(/[()]/)
        expect(s.cue, `${m.meaning}: cue has slash`).not.toMatch(/\//)
        expect(s.cue.length, `${m.meaning}: cue too long: ${s.cue}`).toBeLessThanOrEqual(80)
        expect(seen.has(s.cue), `${m.meaning}: duplicate cue "${s.cue}"`).toBe(false)
        seen.add(s.cue)
      }
    }
  })

  test('every sense verb exists and carries the meaning', () => {
    const byGerman = new Map(VERBS.map(v => [v.german, v]))
    for (const m of VERB_SENSES) {
      for (const s of m.senses) {
        expect(s.verbs.length, `${m.meaning}: empty sense`).toBeGreaterThan(0)
        for (const g of s.verbs) {
          const v = byGerman.get(g)
          expect(v, `${m.meaning}: unknown verb ${g}`).toBeTruthy()
          expect(
            englishAlternativesOf(v!.english).includes(m.meaning),
            `${m.meaning}: ${g} does not carry this meaning`
          ).toBe(true)
        }
      }
    }
  })

  test('COVERAGE: every ambiguous meaning has an entry whose senses cover every member', () => {
    const gaps: string[] = []
    for (const [meaning, germanList] of ambiguous) {
      const entry = lookup.get(meaning)
      if (!entry) { gaps.push(`${meaning} (no entry; members: ${germanList.join(', ')})`); continue }
      const covered = new Set(entry.senses.flatMap(s => [...s.verbs]))
      const missing = germanList.filter(g => !covered.has(g))
      if (missing.length > 0) gaps.push(`${meaning}: uncovered ${missing.join(', ')}`)
    }
    expect(gaps).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/data/verbSenses.test.ts`
Expected: FAIL — cannot resolve `src/data/verb-senses`.

- [ ] **Step 3: Create the module skeleton (helpers + empty data)**

`src/data/verb-senses.ts`:

```ts
// Seeded sense data for the Präzise variant of the Verb translation drill.
// A Sense = one situation-specific reading of an English meaning: a short
// English cue plus the verbs that fit that situation EQUALLY (ADR-0016).
// Verbs no situation can split (anfangen/beginnen) share one sense — do not
// "complete" the data by inventing register cues; the merge is the decision.
import type { Verb } from './verbs'

export interface VerbSense {
  /** English situation cue, shown parenthesized after the meaning. Never
   *  contains parens, slashes, or German. */
  cue: string
  /** German infinitives (exactly as in VERBS.german) fitting this situation
   *  equally — every one is graded correct. */
  verbs: readonly string[]
}

export interface MeaningSenses {
  /** Normalized English alternative (lowercase, no "to ", no parentheticals). */
  meaning: string
  senses: readonly VerbSense[]
}

/** Same normalization the translation grader applies to English alternatives. */
export function normalizeMeaning(s: string): string {
  let n = s.replace(/\([^)]*\)/g, '').trim().replace(/\s+/g, ' ').toLowerCase()
  if (n.startsWith('to ')) n = n.slice(3).trim()
  return n
}

/** A verb's english split into normalized slash-alternatives. */
export function englishAlternativesOf(english: string): string[] {
  return english.split('/').map(normalizeMeaning).filter(s => s.length > 0)
}

/** meaning → German infinitives carrying it. Entries with 2+ are ambiguous. */
export function buildMeaningMembers(
  verbs: readonly Pick<Verb, 'german' | 'english'>[]
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const v of verbs) {
    for (const alt of englishAlternativesOf(v.english)) {
      const list = map.get(alt) ?? []
      if (!list.includes(v.german)) list.push(v.german)
      map.set(alt, list)
    }
  }
  return map
}

/** Lookup keyed by normalized meaning. */
export function senseLookup(
  senses: readonly MeaningSenses[]
): ReadonlyMap<string, MeaningSenses> {
  return new Map(senses.map(m => [m.meaning, m]))
}

export const VERB_SENSES: readonly MeaningSenses[] = [
  // authored in Step 5
]
```

- [ ] **Step 4: Run the guard test — only COVERAGE should fail now**

Run: `npx vitest run tests/data/verbSenses.test.ts`
Expected: 4 tests PASS, the COVERAGE test FAILS listing every ambiguous meaning. That failure list is the authoring worklist.

- [ ] **Step 5: Author `VERB_SENSES` until the COVERAGE test passes**

Enumerate the worklist (also printed by the failing test):

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('src/data/verbs.ts','utf8');
const re = /german: \"([^\"]+)\",\s*\n\s*english: \"([^\"]+)\"/g;
let m, verbs = [];
while ((m = re.exec(src))) verbs.push({de: m[1], en: m[2]});
const norm = s => { let n = s.replace(/\([^)]*\)/g,'').trim().replace(/\s+/g,' ').toLowerCase(); if (n.startsWith('to ')) n = n.slice(3).trim(); return n; };
const byAlt = new Map();
for (const v of verbs) for (const a of v.en.split('/').map(norm).filter(Boolean)) { if (!byAlt.has(a)) byAlt.set(a, []); byAlt.get(a).push(v.de); }
for (const [a, list] of [...byAlt.entries()].filter(([,l]) => l.length > 1)) console.log(a, '->', list.join(', '));
"
```

(~200 meanings.) For each, partition the members into senses by *situation*:

```ts
  {
    meaning: 'accept',
    senses: [
      { cue: 'an offer, an invitation, a gift', verbs: ['annehmen'] },
      { cue: 'a fact or situation you have to live with', verbs: ['akzeptieren'] }
    ]
  },
  {
    meaning: 'begin',
    senses: [
      // true synonyms — no situation splits them, so they share one sense
      { cue: 'starting to do something', verbs: ['anfangen', 'beginnen'] }
    ]
  },
  {
    meaning: 'stop',
    senses: [
      { cue: 'quitting an activity yourself', verbs: ['aufhören'] },
      { cue: 'bringing a vehicle or machine to a halt', verbs: ['stoppen', 'halten'] }
    ]
  },
```

Authoring rules (the guard test enforces the mechanical ones):
- Cue must *discriminate*: a German speaker reading only `meaning (cue)` should land on that sense's verb(s) and not a sibling's. Cues within one meaning must sound clearly different.
- Merge verbs into one sense when they genuinely fit the same situations equally (register/formality twins). When unsure whether a situation truly splits two verbs, merge — a false split marks defensible answers wrong, a false merge is only lenient.
- A verb may appear in several senses of the same meaning if it genuinely fits both.
- Keep cues short (aim ≤60 chars; hard cap 80), lowercase, concrete: "a fact you have to live with", not "abstract acceptance contexts".
- Order entries alphabetically by `meaning` for reviewability.

Work in batches (~40 meanings at a time), re-running the COVERAGE test between batches — its failure list shrinks to zero.

- [ ] **Step 6: Run the full guard suite and typecheck**

Run: `npx vitest run tests/data/verbSenses.test.ts` — Expected: all 5 PASS.
Run: `npm run typecheck` — Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/data/verb-senses.ts tests/data/verbSenses.test.ts
git commit -m "feat(verbs): seeded sense dataset for the Präzise variant (ADR-0016)"
```

---

### Task 2: Deck building, grading, miss explanation (`useVerbQuiz.ts`)

**Files:**
- Modify: `src/composables/useVerbQuiz.ts` (append a new section after the Bedeutungsfeld section, ~line 108)
- Test: `tests/composables/useSenseQuiz.test.ts`

**Interfaces:**
- Consumes (Task 1): `VERB_SENSES`, `MeaningSenses`, `englishAlternativesOf`, `buildMeaningMembers`, `senseLookup` from `../data/verb-senses`; existing `checkGermanTranslation` in the same file.
- Produces (Task 3 relies on these exact names):
  - `interface SenseCard { meaning: string; cue: string | null; verbs: Verb[] }`
  - `function buildSenseDeck(sampled: readonly Verb[], allVerbs: readonly Verb[], senses?: readonly MeaningSenses[]): SenseCard[]`
  - `function checkSenseAnswer(input: string, card: SenseCard): Verb | null`
  - `type SenseMiss = { kind: 'sibling'; verb: Verb; cue: string } | { kind: 'other'; verb: Verb } | { kind: 'unknown' }`
  - `function explainSenseMiss(input: string, card: SenseCard, allVerbs: readonly Verb[], senses?: readonly MeaningSenses[]): SenseMiss`

- [ ] **Step 1: Write the failing tests**

`tests/composables/useSenseQuiz.test.ts` — synthetic verbs + injected senses so the tests don't depend on authored data:

```ts
import { describe, test, expect } from 'vitest'
import {
  buildSenseDeck,
  checkSenseAnswer,
  explainSenseMiss,
  type SenseCard
} from '../../src/composables/useVerbQuiz'
import type { Verb } from '../../src/data/verbs'
import type { MeaningSenses } from '../../src/data/verb-senses'

function verb(german: string, english: string): Verb {
  return {
    german, english, level: 'A1', type: 'regular', case: 'accusative',
    auxiliary: 'haben', praesens: ['', '', '', '', '', ''], praeteritumStem: '', partizip2: ''
  }
}

const akzeptieren = verb('akzeptieren', 'accept')
const annehmen = verb('annehmen', 'accept / assume')
const anfangen = verb('anfangen', 'begin / start')
const beginnen = verb('beginnen', 'begin')
const schwimmen = verb('schwimmen', 'swim')
const all = [akzeptieren, annehmen, anfangen, beginnen, schwimmen]

const SENSES: readonly MeaningSenses[] = [
  {
    meaning: 'accept',
    senses: [
      { cue: 'an offer, an invitation', verbs: ['annehmen'] },
      { cue: 'a fact you have to live with', verbs: ['akzeptieren'] }
    ]
  },
  {
    meaning: 'begin',
    senses: [{ cue: 'starting to do something', verbs: ['anfangen', 'beginnen'] }]
  },
  {
    meaning: 'start',
    senses: [{ cue: 'starting to do something', verbs: ['anfangen', 'beginnen'] }]
  }
]

describe('buildSenseDeck', () => {
  test('a verb yields one card per sense it carries, plus one plain card for unambiguous alternatives', () => {
    // annehmen: 'accept' is ambiguous (sense card), 'assume' is unique to it (plain card)
    const deck = buildSenseDeck([annehmen], all, SENSES)
    expect(deck).toHaveLength(2)
    const senseCard = deck.find(c => c.cue !== null)!
    expect(senseCard.meaning).toBe('accept')
    expect(senseCard.cue).toBe('an offer, an invitation')
    expect(senseCard.verbs.map(v => v.german)).toEqual(['annehmen'])
    const plain = deck.find(c => c.cue === null)!
    expect(plain.meaning).toBe('assume')
    expect(plain.verbs.map(v => v.german)).toEqual(['annehmen'])
  })

  test('an unambiguous verb yields exactly one plain card with all its alternatives', () => {
    const deck = buildSenseDeck([schwimmen], all, SENSES)
    expect(deck).toEqual([{ meaning: 'swim', cue: null, verbs: [schwimmen] }])
  })

  test('a shared sense appears once however many of its verbs were sampled', () => {
    const deck = buildSenseDeck([anfangen, beginnen], all, SENSES)
    // anfangen: begin-sense + start-sense; beginnen adds nothing new (begin already seen)
    const senseCards = deck.filter(c => c.cue !== null)
    expect(senseCards.map(c => c.meaning).sort()).toEqual(['begin', 'start'])
    for (const c of senseCards) {
      expect(c.verbs.map(v => v.german).sort()).toEqual(['anfangen', 'beginnen'])
    }
    expect(deck.filter(c => c.cue === null)).toHaveLength(0)
  })

  test('an ambiguous meaning with NO authored entry falls back to one lenient card', () => {
    const deck = buildSenseDeck([anfangen, beginnen], all, [])
    const beginCards = deck.filter(c => c.meaning === 'begin')
    expect(beginCards).toHaveLength(1)
    expect(beginCards[0].cue).toBeNull()
    expect(beginCards[0].verbs.map(v => v.german).sort()).toEqual(['anfangen', 'beginnen'])
  })
})

describe('checkSenseAnswer', () => {
  const card: SenseCard = { meaning: 'begin', cue: 'starting to do something', verbs: [anfangen, beginnen] }
  test('any verb of the sense counts, sich-rule and case-insensitivity inherited', () => {
    expect(checkSenseAnswer('beginnen', card)?.german).toBe('beginnen')
    expect(checkSenseAnswer('Anfangen', card)?.german).toBe('anfangen')
    expect(checkSenseAnswer('akzeptieren', card)).toBeNull()
    expect(checkSenseAnswer('', card)).toBeNull()
  })
})

describe('explainSenseMiss', () => {
  const factCard: SenseCard = { meaning: 'accept', cue: 'a fact you have to live with', verbs: [akzeptieren] }
  test('a sibling from another sense of the same meaning is named with its cue', () => {
    const miss = explainSenseMiss('annehmen', factCard, all, SENSES)
    expect(miss).toEqual({ kind: 'sibling', verb: annehmen, cue: 'an offer, an invitation' })
  })
  test('another known verb falls back to kind other', () => {
    const miss = explainSenseMiss('schwimmen', factCard, all, SENSES)
    expect(miss).toEqual({ kind: 'other', verb: schwimmen })
  })
  test('an unknown word is kind unknown', () => {
    expect(explainSenseMiss('blorbieren', factCard, all, SENSES)).toEqual({ kind: 'unknown' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/composables/useSenseQuiz.test.ts`
Expected: FAIL — `buildSenseDeck` is not exported.

- [ ] **Step 3: Implement in `useVerbQuiz.ts`**

Append after the Bedeutungsfeld section (after `buildMeaningFields`). Import at the top of the file:

```ts
import { VERB_SENSES, buildMeaningMembers, englishAlternativesOf, senseLookup, type MeaningSenses } from '../data/verb-senses'
```

```ts
// ───── EN→DE Präzise (sense cards) ──────────────────────────────────

export interface SenseCard {
  /** English prompt — the meaning, or the joined unambiguous alternatives on a plain card. */
  meaning: string
  /** Situation cue (no parens) — null on a plain card or lenient fallback. */
  cue: string | null
  /** Acceptable verbs, resolved to records; every one counts. */
  verbs: Verb[]
}

/**
 * One card per sense each sampled verb carries, plus one plain card for a
 * verb's unambiguous alternatives. A sense appears at most once per deck.
 * Ambiguity is judged against the whole collection, like meaningField.
 * An ambiguous meaning without an authored entry (the guard test forbids it,
 * but stay robust) degrades to one lenient Bedeutungsfeld-style card.
 */
export function buildSenseDeck(
  sampled: readonly Verb[],
  allVerbs: readonly Verb[],
  senses: readonly MeaningSenses[] = VERB_SENSES
): SenseCard[] {
  const members = buildMeaningMembers(allVerbs)
  const byGerman = new Map(allVerbs.map(v => [v.german, v]))
  const lookup = senseLookup(senses)
  const cards: SenseCard[] = []
  const seenSense = new Set<string>()
  for (const v of sampled) {
    const plainAlts: string[] = []
    for (const alt of englishAlternativesOf(v.english)) {
      const carriers = members.get(alt) ?? [v.german]
      if (carriers.length < 2) { plainAlts.push(alt); continue }
      const entry = lookup.get(alt)
      if (!entry) {
        if (seenSense.has(alt)) continue
        seenSense.add(alt)
        cards.push({
          meaning: alt,
          cue: null,
          verbs: carriers.map(g => byGerman.get(g)).filter((x): x is Verb => !!x)
        })
        continue
      }
      for (const s of entry.senses) {
        if (!s.verbs.includes(v.german)) continue
        const key = `${alt}|${s.cue}`
        if (seenSense.has(key)) continue
        seenSense.add(key)
        cards.push({
          meaning: alt,
          cue: s.cue,
          verbs: s.verbs.map(g => byGerman.get(g)).filter((x): x is Verb => !!x)
        })
      }
    }
    if (plainAlts.length > 0) {
      cards.push({ meaning: plainAlts.join(' / '), cue: null, verbs: [v] })
    }
  }
  return cards
}

/** The matching verb when the input names any acceptable verb of the card. */
export function checkSenseAnswer(input: string, card: SenseCard): Verb | null {
  return card.verbs.find(v => checkGermanTranslation(input, v.german)) ?? null
}

export type SenseMiss =
  | { kind: 'sibling'; verb: Verb; cue: string }
  | { kind: 'other'; verb: Verb }
  | { kind: 'unknown' }

/**
 * Why a Präzise answer missed: a sibling verb from another sense of the same
 * meaning (the teaching payoff — named with that sense's cue), some other
 * known verb, or a word the pool doesn't know.
 */
export function explainSenseMiss(
  input: string,
  card: SenseCard,
  allVerbs: readonly Verb[],
  senses: readonly MeaningSenses[] = VERB_SENSES
): SenseMiss {
  const typed = allVerbs.find(v => checkGermanTranslation(input, v.german))
  if (!typed) return { kind: 'unknown' }
  if (card.cue !== null) {
    const entry = senseLookup(senses).get(card.meaning)
    const sibling = entry?.senses.find(s => s.cue !== card.cue && s.verbs.includes(typed.german))
    if (sibling) return { kind: 'sibling', verb: typed, cue: sibling.cue }
  }
  return { kind: 'other', verb: typed }
}
```

Note: the `verb()` factory in the test omits optional `Verb` fields — if `vue-tsc` complains about the tuple type, type the `praesens` literal `as SixForms` (import it). Do not weaken the `Verb` interface.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/composables/useSenseQuiz.test.ts` — Expected: PASS.
Run: `npx vitest run tests/data/verbSenses.test.ts` — Expected: still PASS.
Run: `npm run typecheck` — Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useVerbQuiz.ts tests/composables/useSenseQuiz.test.ts
git commit -m "feat(verbs): Präzise deck building, grading and sense-aware miss explanation"
```

---

### Task 3: PraeziseRunner + dispatch + history meta

**Files:**
- Create: `src/modules/verbs/PraeziseRunner.vue`
- Modify: `src/modules/verbs/TranslationQuizRunner.vue` (dispatch by `variant` query)
- Modify: `src/modules/verbs/BedeutungsfeldRunner.vue:151` (record `variant: 'bedeutungsfeld'`)
- Modify: `src/composables/useQuizHistory.ts:156` (new meta field)
- Test: `tests/modules/verbs/PraeziseRunner.test.ts`

**Interfaces:**
- Consumes (Task 2): `buildSenseDeck`, `checkSenseAnswer`, `explainSenseMiss`, `type SenseCard`, `type SenseMiss` from `../../composables/useVerbQuiz`; `shuffle` from `../../data/pool`; `useVerbs().sample/all`; `saveQuizRun`.
- Produces: route `verbs-translation-run` renders PraeziseRunner when `query.direction === 'en-de' && query.variant === 'praezise'` (Task 4 sends that query).

- [ ] **Step 1: Add the meta field**

In `src/composables/useQuizHistory.ts`, below `verbDirection` (line 156):

```ts
  /** Verb translation EN→DE Variante; absent on DE→EN and on runs before it existed (= bedeutungsfeld). */
  variant?: 'bedeutungsfeld' | 'praezise'
```

- [ ] **Step 2: Write the failing component test**

`tests/modules/verbs/PraeziseRunner.test.ts` — mirror the mounting pattern of `tests/modules/verbs/CaseGovernmentRunner.test.ts` (router mock via `vi.mock('vue-router', …)`, same style as that file — copy its scaffolding). Test through the real dataset by driving the route query deterministically:

```ts
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PraeziseRunner from '../../../src/modules/verbs/PraeziseRunner.vue'

const push = vi.fn()
let query: Record<string, string> = {}
vi.mock('vue-router', () => ({
  useRoute: () => ({ query }),
  useRouter: () => ({ push })
}))
vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn()
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

beforeEach(() => {
  query = { count: '5', levels: 'A1', types: '', cases: '' }
  push.mockClear()
  vi.mocked(saveQuizRun).mockClear()
})

describe('PraeziseRunner', () => {
  test('renders a card with a prompt and an input', async () => {
    const wrapper = mount(PraeziseRunner)
    await flushPromises()
    expect(wrapper.find('.vq-meaning').exists()).toBe(true)
    expect(wrapper.find('input').exists()).toBe(true)
  })

  test('grading a full run records variant praezise with card count', async () => {
    const wrapper = mount(PraeziseRunner)
    await flushPromises()
    // answer every card wrong via the reveal button to reach the finish deterministically
    while (wrapper.find('.vq-input-row').exists()) {
      await wrapper.find('button.btn-quiet:not(.end-quiz)').trigger('click')
      await flushPromises()
    }
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    const run = vi.mocked(saveQuizRun).mock.calls[0][0]
    expect(run.type).toBe('verb-translation')
    expect(run.meta).toMatchObject({ verbDirection: 'en-de', variant: 'praezise' })
    expect(run.count).toBeGreaterThanOrEqual(5) // one card per sense: deck ≥ sampled verbs
    expect(run.correct).toBe(0)
  })
})
```

Adjust selectors to the real template while implementing — but keep the assertions (meaning element, input, `saveQuizRun` payload shape) exactly.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/modules/verbs/PraeziseRunner.test.ts`
Expected: FAIL — component file does not exist.

- [ ] **Step 4: Implement `PraeziseRunner.vue`**

Clone the structure of `BedeutungsfeldRunner.vue` (states, streak, pips, last-outcome corner card, Auswertung view, scoped styles) with these differences:

Script setup:

```ts
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import { shuffle } from '../../data/pool'
import {
  buildSenseDeck, checkSenseAnswer, explainSenseMiss,
  type SenseCard, type SenseMiss
} from '../../composables/useVerbQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { VERB_LEVELS, VERB_TYPES, VERB_CASES, type Verb, type VerbLevel, type VerbType, type VerbCase } from '../../data/verbs'

interface CardResult { card: SenseCard; ok: boolean }
interface LastOutcome {
  n: number
  ok: boolean
  card: SenseCard
  hitDe?: string
  typed?: string
  miss?: SenseMiss
  skipped?: boolean
}
```

`onMounted`: parse `count/levels/types/cases` from the query with the same `csvFilter` helper as BedeutungsfeldRunner; then:

```ts
const { sample, all } = useVerbs()
// …
const sampled = sample(count, f)
if (sampled.length === 0) { error.value = 'No verbs match the selected filters.' }
else {
  sampledVerbs.value = sampled
  deck.value = shuffle(buildSenseDeck(sampled, all()))
}
```

(`sampledVerbs = ref<Verb[]>([])` is kept for the run's levels/types/cases meta. No retry branch — EN→DE has none, matching Bedeutungsfeld.)

`submit()`:

```ts
function submit() {
  const t = input.value.trim()
  if (!t || !current.value) return
  const hit = checkSenseAnswer(t, current.value)
  if (hit) {
    setFlash('hit')
    advance(true, { hitDe: hit.german })
  } else {
    setFlash('miss')
    advance(false, { typed: t, miss: explainSenseMiss(t, current.value, all()) })
  }
}
```

`finishRun()` — meta from `sampledVerbs`, count = cards:

```ts
saveQuizRun({
  type: 'verb-translation',
  startedAt: new Date(startedAt.value).toISOString(),
  finishedAt: new Date(finishedAt).toISOString(),
  durationMs: finishedAt - startedAt.value,
  count: deck.value.length,
  correct: okCount.value,
  meta: { levels, types, cases, verbDirection: 'en-de', variant: 'praezise' }
})
```

Template, card area (breadcrumb `Kapitel III · Übersetzen · EN → DE · Präzise`):

```html
<div class="spr-lbl">Bedeutung</div>
<div class="vq-meaning">
  {{ current.meaning }}
  <span v-if="current.cue" class="pz-cue">({{ current.cue }})</span>
</div>
<p class="vq-sub">{{ current.verbs.length === 1
  ? 'Genau ein Verb passt zu dieser Situation.'
  : current.verbs.length + ' Verben passen gleichermaßen — jedes zählt.' }}</p>
```

Last-outcome corner card — the sense-aware reveal:

```html
<div class="vq-last-m">
  {{ last.card.meaning }}<span v-if="last.card.cue"> ({{ last.card.cue }})</span>
</div>
<div class="vq-last-v">
  <span v-for="v in last.card.verbs" :key="v.german" class="vq-last-verb"
    :class="{ hit: v.german === last.hitDe }">{{ v.german }}</span>
</div>
<div v-if="!last.ok && !last.skipped" class="vq-last-n">
  <template v-if="last.miss?.kind === 'sibling'">
    „{{ last.typed }}" passt zu <em>{{ last.card.meaning }} ({{ last.miss.cue }})</em>
  </template>
  <template v-else-if="last.miss?.kind === 'other'">
    „{{ last.typed }}" heißt <em>{{ last.miss.verb.english }}</em>
  </template>
  <template v-else>„{{ last.typed }}" kennt der Pool nicht</template>
</div>
```

Auswertung: same verdict block as BedeutungsfeldRunner with „Karten richtig" wording; the missed list shows `meaning (cue)` → the sense's verbs. Input placeholder: `Deutsches Verb (Infinitiv) …`; buttons „Prüfen →" and „Aufdecken & weiter". Scoped style for the cue:

```css
.pz-cue { font-size: 0.55em; color: var(--mute); font-style: italic; font-weight: 400; }
```

- [ ] **Step 5: Dispatch from `TranslationQuizRunner.vue`**

```ts
import PraeziseRunner from './PraeziseRunner.vue'
// direction resolution stays; retry rounds have no variant → Bedeutungsfeld, by design
const praezise = computed(() => route.query.retry !== '1' && route.query.variant === 'praezise')
```

Template:

```html
<PraeziseRunner v-if="direction === 'en-de' && praezise" />
<BedeutungsfeldRunner v-else-if="direction === 'en-de'" />
```

- [ ] **Step 6: Record the variant in `BedeutungsfeldRunner.vue`**

Line 151: `meta: { levels, types, cases, verbDirection: 'en-de', variant: 'bedeutungsfeld' }`

- [ ] **Step 7: Run tests, typecheck**

Run: `npx vitest run tests/modules/verbs/PraeziseRunner.test.ts` — Expected: PASS.
Run: `npm test` — Expected: full suite PASS (existing `TranslationQuizResult` and history tests unaffected).
Run: `npm run typecheck` — Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/modules/verbs/PraeziseRunner.vue src/modules/verbs/TranslationQuizRunner.vue src/modules/verbs/BedeutungsfeldRunner.vue src/composables/useQuizHistory.ts tests/modules/verbs/PraeziseRunner.test.ts
git commit -m "feat(verbs): Präzise runner with sense-aware reveal, dispatched by variant query"
```

---

### Task 4: Setup page Variante control

**Files:**
- Modify: `src/modules/verbs/TranslationQuizSetup.vue`
- Test: `tests/modules/verbs/TranslationQuizSetup.test.ts` (new; mirror the mounting style of `tests/modules/nouns/QuizSetup.test.ts`)

**Interfaces:**
- Consumes: nothing new — pure UI wiring.
- Produces: `router.push` to `verbs-translation-run` carries `variant: 'bedeutungsfeld' | 'praezise'` when direction is `en-de` (what Task 3's dispatch reads). Stored settings key `verbTransSetup` gains optional `variant`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TranslationQuizSetup from '../../../src/modules/verbs/TranslationQuizSetup.vue'

const push = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push })
}))

beforeEach(() => {
  push.mockClear()
  localStorage.clear()
})

function findByText(wrapper: ReturnType<typeof mount>, selector: string, text: string) {
  return wrapper.findAll(selector).find(b => b.text().includes(text))!
}

describe('TranslationQuizSetup Variante', () => {
  test('Variante control shows for EN→DE and is hidden for DE→EN', async () => {
    const wrapper = mount(TranslationQuizSetup)
    await flushPromises()
    expect(wrapper.text()).toContain('Variante')   // en-de is the stored default
    await findByText(wrapper, '.segmented button', 'DE → EN').trigger('click')
    expect(wrapper.text()).not.toContain('Variante')
  })

  test('starting with Präzise selected pushes variant=praezise', async () => {
    const wrapper = mount(TranslationQuizSetup)
    await flushPromises()
    await findByText(wrapper, '.segmented button', 'Präzise').trigger('click')
    await findByText(wrapper, 'button', 'Start quiz').trigger('click')
    expect(push).toHaveBeenCalledTimes(1)
    expect(push.mock.calls[0][0].query.variant).toBe('praezise')
  })

  test('variant choice persists via localStorage', async () => {
    const first = mount(TranslationQuizSetup)
    await flushPromises()
    await findByText(first, '.segmented button', 'Präzise').trigger('click')
    first.unmount()
    const second = mount(TranslationQuizSetup)
    await flushPromises()
    expect(findByText(second, '.segmented button', 'Präzise').classes()).toContain('active')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/modules/verbs/TranslationQuizSetup.test.ts`
Expected: FAIL — no "Variante" text, no `variant` in query.

- [ ] **Step 3: Implement**

Script additions:

```ts
type Variant = 'bedeutungsfeld' | 'praezise'
const variant = ref<Variant>('bedeutungsfeld')
```

- `Stored` gains `variant?: Variant`; `loadStored` handling: `if (s.variant === 'praezise' || s.variant === 'bedeutungsfeld') variant.value = s.variant`; add to `saveStored` payload and to the `watch` list.
- `start()` query gains `variant: variant.value` (harmless for DE→EN; the dispatch ignores it there).
- Direction segmented labels simplify to `EN → DE` / `DE → EN · Blatt` (the Variante now names the EN→DE flavor); the `micro-mark` beside it becomes direction-only copy.

Template — insert after the Richtung field:

```html
<div v-if="direction === 'en-de'" class="field">
  <div class="field-label">Variante</div>
  <div class="direction-row">
    <div class="segmented">
      <button :class="{ active: variant === 'bedeutungsfeld' }" @click="variant = 'bedeutungsfeld'">Bedeutungsfeld</button>
      <button :class="{ active: variant === 'praezise' }" @click="variant = 'praezise'">Präzise</button>
    </div>
    <span class="micro-mark">{{ variant === 'praezise' ? 'die Situation verlangt ihr genaues Verb' : 'eine Bedeutung, alle ihre Verben' }}</span>
  </div>
</div>
```

Acceptance alert — third branch for `en-de && praezise`:

```html
<template v-else-if="variant === 'praezise'">
  Die Bedeutung kommt mit ihrer Situation — nur das Verb, das genau dazu passt, zählt; seine Geschwister aus anderen Situationen nicht. Passen mehrere Verben gleichermaßen, zählt jedes. Ein Verb mit mehreren Lesarten bringt mehrere Karten mit — das Deck kann also etwas größer sein als die gewählte Verbenzahl.
</template>
```

Start button sub-label: `{{ effective }} {{ direction === 'de-en' ? 'verbs' : variant === 'praezise' ? 'Verben · Präzise' : 'Bedeutungsfelder' }}`.

- [ ] **Step 4: Run tests, typecheck**

Run: `npx vitest run tests/modules/verbs/TranslationQuizSetup.test.ts` — Expected: PASS.
Run: `npm test && npm run typecheck` — Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/modules/verbs/TranslationQuizSetup.vue tests/modules/verbs/TranslationQuizSetup.test.ts
git commit -m "feat(verbs): Variante control on translation setup — Bedeutungsfeld / Präzise"
```

---

### Task 5: Verification, changelog, release (main session — not a subagent)

**Files:**
- Modify: `package.json` (version `1.18.02`)
- Modify: `src/data/changelog.ts` (prepend entry, bump `APP_VERSION`)

- [ ] **Step 1: Full verification**

Run: `npm test` and `npm run build` — Expected: suite green, build clean.

- [ ] **Step 2: Mobile check at ~390px (phone-first rule)**

Start `npm run dev`; with the Chrome tools at 390px width walk: Verbs → Translation quiz → Variante Präzise → start → answer a sense card wrong with a sibling (verify the sense-aware note), reveal one, finish (verify Auswertung). Verify the setup page's Variante control lays out cleanly.

- [ ] **Step 3: Bump version + changelog**

`package.json`: `"version": "1.18.02"`. `src/data/changelog.ts`: `APP_VERSION = '1.18.02'`, prepend:

```ts
  {
    version: '1.18.02', date: '2026-08-06', kind: 'polish',
    title: 'Übersetzen · die Präzise-Variante',
    notes: [
      '<strong>EN → DE kennt jetzt zwei Varianten.</strong> Das <em>Bedeutungsfeld</em> bleibt großzügig: eine Bedeutung, jedes ihrer Verben zählt. Neu ist <em>Präzise</em>: die Bedeutung kommt mit ihrer Situation — <em>accept (an offer, an invitation)</em> verlangt <em>annehmen</em>, und <em>akzeptieren</em> wäre falsch. Umschaltbar in der Einrichtung unter „Variante".',
      '<strong>Falsche Geschwister werden erklärt.</strong> Wer bei <em>accept (a fact …)</em> „annehmen" tippt, erfährt sofort, zu welcher Situation das getippte Verb wirklich gehört — genau der Moment, in dem der Unterschied hängen bleibt.',
      '<strong>Echte Zwillinge bleiben zusammen.</strong> Wo keine Situation zwei Verben trennt (<em>anfangen/beginnen</em>), zählt jedes von beiden — niemand wird für ein richtiges Verb bestraft. Ein Verb mit mehreren Lesarten bringt jede als eigene Karte mit.'
    ]
  },
```

- [ ] **Step 4: Commit, merge to main, deploy** (standing release flow)

```bash
git add package.json src/data/changelog.ts
git commit -m "chore: bump version to 1.18.02"
# merge feature branch to main, then:
npm run deploy
git add dist/index.html && git commit -m "chore: dist index for 1.18.02"
git push origin main
```

If sandboxed/auto mode blocks the remote steps, hand the exact commands to the user to run via `!`.

---

## Self-review notes

- **Spec coverage:** naming (T4 UI + CONTEXT.md already updated), one-situation-per-card (T3 card UI), merged synonyms (T1 data rule + T2 set acceptance), whole-pool decks with plain cards (T2 `plainAlts`), one-card-per-sense + dedup (T2 `seenSense`), seeded data + guard test (T1), sense-aware reveal (T2 `explainSenseMiss` + T3 template), Variante sub-control EN→DE-only (T4), same history type + `meta.variant` (T3). Retry deliberately stays Bedeutungsfeld-only (EN→DE never had retry; stash carries no variant).
- **Type consistency:** `SenseCard`/`SenseMiss`/`buildSenseDeck`/`checkSenseAnswer`/`explainSenseMiss` names match across T2 definitions and T3 imports; `MeaningSenses`/`senseLookup`/`englishAlternativesOf`/`buildMeaningMembers` match T1 exports and T2 imports; `variant` literal union identical in history meta, setup Stored, and query.
