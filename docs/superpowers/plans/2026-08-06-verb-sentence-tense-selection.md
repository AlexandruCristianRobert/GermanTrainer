# Verb Sentence Quiz · Zeitformen Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the learner pick which German tenses/forms (Präsens … Passiv Konjunktiv II) the Satz (KI) sentence-translation drill uses; each generated sentence gets one selected form assigned before any AI call.

**Architecture:** The existing `VerbTense` vocabulary (`src/data/verbs.ts:55-115`) is reused end-to-end. `buildVerbSpecs` assigns a tense per spec from a refilling shuffled bag (even coverage, offline — ADR-0004); the generation prompt demands that form per item; the setup screen grows a CEFR-grouped Zeitformen chip field with a level-following default; the runner shows a tense badge and tells the grader the required form. Specs without a tense (remedial flow, old stashes) behave exactly as today.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Vitest + @vue/test-utils (jsdom), localStorage/sessionStorage persistence.

**Spec:** `docs/superpowers/specs/2026-08-06-verb-sentence-tense-selection-design.md` — read it first.

## Global Constraints

- German UI labels come from `TENSE_LABELS`; CEFR grades from `TENSE_LEVEL`; never invent a new tense enum.
- All randomization happens before any AI call (ADR-0004). The model never chooses a tense when one is assigned.
- Specs without `tense` must produce byte-identical prompts to today's (backward compatibility for the remedial flow and old stashes).
- Run `npx vitest run <file>` for single files; full suite is `npm test`; typecheck+build is `npm run build`.
- Commit style: `feat(verbs): …` / `test(verbs): …`, body line `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Working branch: `feat/verb-sentence-tenses` (already created). Do NOT push or merge.

---

### Task 1: Tense-aware spec building (data layer)

**Files:**
- Modify: `src/composables/useVerbSentenceQuiz.ts` (imports at top; `VerbRef` ~line 20; `verbToRef` ~line 68; `VerbSentenceSpec` ~line 32; `buildVerbSpecs` ~line 100)
- Test: `tests/composables/useVerbSentenceQuiz.test.ts` (extend `buildVerbSpecs` + `verbToRef` describes)

**Interfaces:**
- Consumes: `VerbCase`, `VerbTense`, `PASSIVE_TENSE_SET` from `src/data/verbs.ts` (all exist).
- Produces (later tasks rely on these exact shapes):
  - `VerbRef` gains `case?: VerbCase`; `verbToRef` copies `v.case`.
  - `VerbSentenceSpec` gains `tense?: VerbTense`.
  - `buildVerbSpecs(verbPool, nounPool, count, verbsPer, nounsPer, rng: () => number = Math.random, tenses?: readonly VerbTense[])` — new optional 7th param; existing 6-arg calls unchanged.

- [ ] **Step 1: Write the failing tests**

In `tests/composables/useVerbSentenceQuiz.test.ts`, update the `verbToRef` test and add tense tests to the `buildVerbSpecs` describe. Give the fixtures cases (this changes no existing assertion — `toEqual` ignores `undefined` props, but be explicit):

```ts
// Replace the VERBS_FIX fixture (top of file):
const VERBS_FIX: VerbRef[] = [
  { german: 'gehen', english: 'go', level: 'A1', case: 'none' },
  { german: 'machen', english: 'make / do', level: 'A1', case: 'accusative' },
  { german: 'verstehen', english: 'understand', level: 'A2', case: 'accusative' }
]

// Replace the verbToRef test body:
describe('verbToRef', () => {
  test('projects a Verb to the lean ref, including its case', () => {
    const v = { german: 'gehen', english: 'go', level: 'A1', case: 'none' } as Verb
    expect(verbToRef(v)).toEqual({ german: 'gehen', english: 'go', level: 'A1', case: 'none' })
  })
})

// Add inside describe('buildVerbSpecs'):
  test('no tenses param → specs carry no tense field (today’s behaviour)', () => {
    const specs = buildVerbSpecs(VERBS_FIX, NOUNS_FIX, 3, 1, 1, seqRng([0]))
    for (const s of specs) expect(s.tense).toBeUndefined()
  })
  test('tenses cycle evenly: 4 specs × 2 tenses → each tense exactly twice', () => {
    const specs = buildVerbSpecs(VERBS_FIX, NOUNS_FIX, 4, 1, 1, seqRng([0]), ['praesens', 'perfekt'])
    const counts = new Map<string, number>()
    for (const s of specs) {
      expect(['praesens', 'perfekt']).toContain(s.tense)
      counts.set(s.tense!, (counts.get(s.tense!) ?? 0) + 1)
    }
    expect(counts.get('praesens')).toBe(2)
    expect(counts.get('perfekt')).toBe(2)
  })
  test('passive tense specs draw only accusative-capable verbs', () => {
    const specs = buildVerbSpecs(VERBS_FIX, NOUNS_FIX, 6, 1, 1, seqRng([0, 0.3, 0.7]), ['passivPraesens'])
    for (const s of specs) {
      expect(s.tense).toBe('passivPraesens')
      for (const v of s.verbs) {
        expect(v.case === 'accusative' || v.case === 'dative+accusative').toBe(true)
      }
    }
  })
  test('passive tenses are dropped when the pool has no accusative verbs', () => {
    const noAcc: VerbRef[] = [{ german: 'gehen', english: 'go', level: 'A1', case: 'none' }]
    const specs = buildVerbSpecs(noAcc, NOUNS_FIX, 3, 1, 1, seqRng([0]), ['praesens', 'passivPraesens'])
    for (const s of specs) expect(s.tense).toBe('praesens')
  })
  test('only passive selected + no accusative verbs → specs carry no tense (natural fallback)', () => {
    const noAcc: VerbRef[] = [{ german: 'gehen', english: 'go', level: 'A1', case: 'none' }]
    const specs = buildVerbSpecs(noAcc, NOUNS_FIX, 2, 1, 1, seqRng([0]), ['passivPraesens'])
    for (const s of specs) expect(s.tense).toBeUndefined()
  })
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run tests/composables/useVerbSentenceQuiz.test.ts`
Expected: the five new tests FAIL (tense is undefined / case not copied); every pre-existing test still PASSES.

- [ ] **Step 3: Implement**

In `src/composables/useVerbSentenceQuiz.ts`:

```ts
// Import line (extend the existing imports from '../data/verbs'):
import { VERB_LEVELS, verbLevelToCefr, PASSIVE_TENSE_SET } from '../data/verbs'
import type { Verb, VerbLevel, VerbCase, VerbTense } from '../data/verbs'

// VerbRef:
export interface VerbRef {
  german: string   // infinitive / dictionary form
  english: string  // gloss, e.g. "go" or "make / do"
  level: VerbLevel
  /** Object case — passive-eligibility check in buildVerbSpecs. Optional:
   *  stashed specs from before this field existed lack it. */
  case?: VerbCase
}

// verbToRef:
export function verbToRef(v: Verb): VerbRef {
  return { german: v.german, english: v.english, level: v.level, case: v.case }
}

// VerbSentenceSpec:
export interface VerbSentenceSpec {
  index: number
  verbs: VerbRef[]
  nouns: NounRef[]
  /** Required German form for the sentence; absent → the model varies naturally. */
  tense?: VerbTense
}

// buildVerbSpecs — full replacement:
export function buildVerbSpecs(
  verbPool: readonly VerbRef[],
  nounPool: readonly NounRef[],
  count: number,
  verbsPer: WordsPer,
  nounsPer: WordsPer,
  rng: () => number = Math.random,
  tenses?: readonly VerbTense[]
): VerbSentenceSpec[] {
  // Passive needs a passivizable (accusative-capable) verb. The setup screen
  // gates this too; this is the backstop for direct callers.
  const accusativePool = verbPool.filter(v => v.case === 'accusative' || v.case === 'dative+accusative')
  const usableTenses = (tenses ?? []).filter(t => !PASSIVE_TENSE_SET.has(t) || accusativePool.length > 0)
  const nextTense = usableTenses.length > 0 ? makeBag(usableTenses, rng) : null
  const nextVerb = makeBag(verbPool, rng)
  const nextAccVerb = makeBag(accusativePool, rng)
  const nextNoun = makeBag(nounPool, rng)
  const specs: VerbSentenceSpec[] = []
  for (let index = 0; index < count; index++) {
    const kv = verbsPer === 'mix' ? (rng() < 0.5 ? 1 : 2) : verbsPer
    const kn = nounsPer === 'mix' ? (rng() < 0.5 ? 1 : 2) : nounsPer
    const tense = nextTense ? nextTense() : null
    const passive = tense !== null && PASSIVE_TENSE_SET.has(tense)
    const spec: VerbSentenceSpec = {
      index,
      verbs: drawUnique(passive ? nextAccVerb : nextVerb, kv, v => v.german),
      nouns: drawUnique(nextNoun, kn, n => n.german)
    }
    if (tense !== null) spec.tense = tense
    specs.push(spec)
  }
  return specs
}
```

Keep the header doc-comment of `buildVerbSpecs` (extend it with one line about tense assignment).

- [ ] **Step 4: Run tests to verify all pass**

Run: `npx vitest run tests/composables/useVerbSentenceQuiz.test.ts`
Expected: ALL PASS.

- [ ] **Step 5: Typecheck**

Run: `npx vue-tsc --noEmit`
Expected: clean. (`VerbRemedialSetup.vue` and `VerbSentenceSetup.vue` call `buildVerbSpecs` with 5 args — still valid.)

- [ ] **Step 6: Commit**

```bash
git add src/composables/useVerbSentenceQuiz.ts tests/composables/useVerbSentenceQuiz.test.ts
git commit -m "feat(verbs): tense-aware sentence spec building" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Tensed generation + grading prompts

**Files:**
- Modify: `src/composables/useVerbSentenceQuiz.ts` (`VERB_ANGLE_POOL` ~line 126; `VERB_GEN_SYSTEM` ~line 155; `buildVerbGeneratePrompt` ~line 210; `generateVerbSentenceBatch` ~line 300; `GradeVerbOptions` ~line 382; `buildVerbGradePrompt` ~line 445)
- Test: `tests/composables/useVerbSentenceQuiz.test.ts`

**Interfaces:**
- Consumes: `VerbSentenceSpec.tense?: VerbTense` from Task 1; `TENSE_LABELS` from `src/data/verbs.ts`.
- Produces:
  - `TENSE_PROMPT_HINTS: Record<VerbTense, string>` (exported).
  - `TENSE_IMPLYING_ANGLES: readonly string[]` and `VERB_ANGLE_POOL_TENSE_NEUTRAL: string[]` (exported).
  - `verbGenSystem(tensed: boolean): string` (exported); `VERB_GEN_SYSTEM` remains exported as `verbGenSystem(false)` for compatibility.
  - `GradeVerbOptions` gains `tense?: VerbTense` (Task 4 passes it).

- [ ] **Step 1: Write the failing tests**

Add to `tests/composables/useVerbSentenceQuiz.test.ts`:

```ts
import {
  TENSE_PROMPT_HINTS, TENSE_IMPLYING_ANGLES, VERB_ANGLE_POOL_TENSE_NEUTRAL, verbGenSystem
} from '../../src/composables/useVerbSentenceQuiz'
import { VERB_TENSES } from '../../src/data/verbs'

describe('tensed generation prompts', () => {
  const tensedSpecs = [
    { index: 0, verbs: [{ german: 'kaufen', english: 'buy', level: 'A1' as const, case: 'accusative' as const }], nouns: [], tense: 'passivPraesens' as const },
    { index: 1, verbs: [{ german: 'gehen', english: 'go', level: 'A1' as const, case: 'none' as const }], nouns: [], tense: 'perfekt' as const }
  ]

  test('every VerbTense has a prompt hint naming its German label', () => {
    for (const t of VERB_TENSES) {
      expect(TENSE_PROMPT_HINTS[t]).toBeTruthy()
    }
    expect(TENSE_PROMPT_HINTS.perfekt).toContain('Perfekt')
    expect(TENSE_PROMPT_HINTS.passivPraesens).toContain('Passiv')
  })
  test('spec lines carry their Zeitform; batch demands exact-form compliance', () => {
    const p = buildVerbGeneratePrompt(tensedSpecs, 'A1–A2', { angles: ['set it in a kitchen'], seed: 's1' })
    expect(p).toContain(`Zeitform: ${TENSE_PROMPT_HINTS.passivPraesens}`)
    expect(p).toContain(`Zeitform: ${TENSE_PROMPT_HINTS.perfekt}`)
    expect(p).toContain('exactly that form')
  })
  test('untensed specs produce a prompt without any Zeitform text (byte-compatible)', () => {
    const specs = [{ index: 0, verbs: [{ german: 'gehen', english: 'go', level: 'A1' as const }], nouns: [] }]
    const p = buildVerbGeneratePrompt(specs, 'A1–A2', { angles: ['set it in a kitchen'], seed: 's1' })
    expect(p).not.toContain('Zeitform')
  })
  test('system prompt: natural variation only when untensed', () => {
    expect(verbGenSystem(false)).toContain('Vary the tense naturally')
    expect(verbGenSystem(true)).not.toContain('Vary the tense naturally')
    expect(verbGenSystem(true)).toContain('Zeitform')
  })
  test('tense-implying angles are excluded from the neutral pool', () => {
    for (const a of TENSE_IMPLYING_ANGLES) {
      expect(VERB_ANGLE_POOL).toContain(a)
      expect(VERB_ANGLE_POOL_TENSE_NEUTRAL).not.toContain(a)
    }
    expect(VERB_ANGLE_POOL_TENSE_NEUTRAL.length).toBeGreaterThanOrEqual(10)
  })
})

describe('tensed grading prompt', () => {
  const base = {
    model: 'm', english: 'The cake was bought.', german: 'Der Kuchen wurde gekauft.',
    verbsGerman: ['kaufen'], nounsGerman: ['Kuchen'], userAnswer: 'Der Kuchen wurde gekauft.'
  }
  test('TARGET TENSE line + wrong-tense rule appear only when a tense is given', () => {
    const with_ = buildVerbGradePrompt({ ...base, tense: 'passivPraeteritum' })
    expect(with_.user).toContain('TARGET TENSE (required German form): Passiv Präteritum')
    expect(with_.system).toContain('MUST use that tense/form')
    const without = buildVerbGradePrompt(base)
    expect(without.user).not.toContain('TARGET TENSE')
    expect(without.system).not.toContain('MUST use that tense/form')
  })
})
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run tests/composables/useVerbSentenceQuiz.test.ts`
Expected: new tests FAIL (missing exports); existing tests PASS.

- [ ] **Step 3: Implement**

In `src/composables/useVerbSentenceQuiz.ts` (import `TENSE_LABELS` value from `'../data/verbs'` alongside `PASSIVE_TENSE_SET`):

```ts
/** German name + short construction gloss the generator gets for a required form. */
export const TENSE_PROMPT_HINTS: Record<VerbTense, string> = {
  praesens: 'Präsens (present tense)',
  imperativ: 'Imperativ (a command in the du-form, e.g. "Öffne die Tür!")',
  perfekt: 'Perfekt (conversational past: haben/sein + Partizip II)',
  praeteritum: 'Präteritum (simple past)',
  plusquamperfekt: 'Plusquamperfekt (past perfect: hatte/war + Partizip II)',
  futur1: 'Futur I (werden + Infinitiv)',
  konjunktiv2: 'Konjunktiv II (hypothetical or polite: würde/wäre/hätte …)',
  konjunktiv1: 'Konjunktiv I (reported speech — frame the sentence as indirect speech, e.g. "Er sagt, er gehe …")',
  futur2: 'Futur II (werden + Partizip II + haben/sein)',
  passivPraesens: 'Passiv Präsens / Vorgangspassiv (wird + Partizip II)',
  passivPraeteritum: 'Passiv Präteritum (wurde + Partizip II)',
  passivPerfekt: 'Passiv Perfekt (ist + Partizip II + worden)',
  passivPlusquamperfekt: 'Passiv Plusquamperfekt (war + Partizip II + worden)',
  passivFutur1: 'Passiv Futur I (wird + Partizip II + werden)',
  passivKonjunktiv2: 'Passiv Konjunktiv II (würde + Partizip II + werden)'
}

/** Angles that push toward a particular tense/form — excluded when every
 *  sentence already has an assigned Zeitform, so the two instructions can
 *  never fight. */
export const TENSE_IMPLYING_ANGLES: readonly string[] = [
  'put it in the Perfekt (past)',
  'use a future intention (morgen / nächste Woche)',
  'frame it as advice or a suggestion',
  'use a polite request (Sie)'
]
export const VERB_ANGLE_POOL_TENSE_NEUTRAL: string[] =
  VERB_ANGLE_POOL.filter(a => !TENSE_IMPLYING_ANGLES.includes(a))
```

Split `VERB_GEN_SYSTEM` into head + tense sentence + tail so only the tense sentence varies. The head is everything up to and including `'…natural English translation. '`; the tail starts at `'Keep sentences concise (6–14 words). '`. Copy the existing text VERBATIM — do not retype it:

```ts
const VERB_GEN_TENSE_NATURAL =
  'Vary the tense naturally for the requested CEFR level (present-heavy ' +
  'for A1, mixing in Perfekt/Präteritum for A2+). '
const VERB_GEN_TENSE_ASSIGNED =
  'Each item names its required Zeitform (German tense/form) — the German sentence MUST use ' +
  'exactly that form for the given verb(s). '

export function verbGenSystem(tensed: boolean): string {
  return VERB_GEN_SYSTEM_HEAD + (tensed ? VERB_GEN_TENSE_ASSIGNED : VERB_GEN_TENSE_NATURAL) + VERB_GEN_SYSTEM_TAIL
}
/** Untensed system prompt — byte-identical to the pre-feature constant. */
export const VERB_GEN_SYSTEM = verbGenSystem(false)
```

`buildVerbGeneratePrompt` — extend the line builder and the assembled string:

```ts
const lines = specs.map(s => {
  const verbs = /* unchanged */
  const nouns = /* unchanged */
  const tense = s.tense ? `; Zeitform: ${TENSE_PROMPT_HINTS[s.tense]}` : ''
  return `#${s.index} — verb(s): ${verbs}; build around noun(s): ${nouns}${tense}`
})
const tensed = specs.some(s => s.tense !== undefined)
```

and in the returned template string, directly after `lines.join('\n')`:

```ts
(tensed ? '\nEvery item above names its required Zeitform — write the GERMAN sentence in exactly that form.' : '') +
```

`generateVerbSentenceBatch` — pick pool and system by whether the batch is tensed (before the `while` loop):

```ts
const tensed = opts.specs.some(s => s.tense !== undefined)
const anglePool = tensed ? VERB_ANGLE_POOL_TENSE_NEUTRAL : [...VERB_ANGLE_POOL]
```

then use `anglePool` in the `shuffle(...)` call and `verbGenSystem(tensed)` as `systemInstruction`.

Grading — `GradeVerbOptions` gains `tense?: VerbTense`; in `buildVerbGradePrompt`:

```ts
const VERB_GRADE_TENSE_RULE =
  ' A TARGET TENSE is specified for this exercise: the German answer MUST use that tense/form. ' +
  'An otherwise correct translation in a different tense or form is NOT correct — set "correct" ' +
  'false and include "conjugation" in errorTags.'

// inside buildVerbGradePrompt:
const system = (opts.spoken ? VERB_GRADE_SYSTEM_SPOKEN : VERB_GRADE_SYSTEM_TYPED)
  + (opts.tense ? VERB_GRADE_TENSE_RULE : '')
const tenseLine = opts.tense ? `TARGET TENSE (required German form): ${TENSE_LABELS[opts.tense]}\n` : ''
const user =
  `ENGLISH (source shown to the learner): ${opts.english}\n` +
  `GERMAN (reference translation): ${opts.german}\n` +
  `TARGET VERB(S): ${verbs}\n` +
  `THEME NOUN(S): ${nouns}\n` +
  tenseLine +
  `${answerLabel} ${opts.userAnswer}`
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npx vitest run tests/composables/useVerbSentenceQuiz.test.ts`
Expected: ALL PASS (including the pre-existing `buildVerbGeneratePrompt` and `buildVerbGradePrompt` describes — they use untensed inputs and must be untouched).

- [ ] **Step 5: Typecheck**

Run: `npx vue-tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useVerbSentenceQuiz.ts tests/composables/useVerbSentenceQuiz.test.ts
git commit -m "feat(verbs): tensed generation and grading prompts" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Zeitformen field on the sentence-quiz setup

**Files:**
- Modify: `src/modules/verbs/VerbSentenceSetup.vue`
- Create: `tests/modules/verbs/VerbSentenceSetup.test.ts`
- Reference (read, do not modify): `src/modules/verbs/ConjugationQuizSetup.vue` (chip-group pattern, lines 53-101 script / 166-187 template / 253-269 styles), `tests/modules/verbs/TranslationQuizSetup.test.ts` (mount pattern)

**Interfaces:**
- Consumes: `buildVerbSpecs(…, rng, tenses)` from Task 1; `VERB_TENSES`, `TENSE_LABELS`, `TENSE_LEVEL`, `PASSIVE_TENSE_SET`, `verbLevelToCefr`, types `VerbTense`, `TenseCEFR` from `src/data/verbs.ts`.
- Produces: the sessionStorage stash (`gt:lastVerbSentenceQuiz`) gains `meta.tenses: VerbTense[]` (effective selection) and its `specs` carry `tense` — Task 4's runner reads both.

- [ ] **Step 1: Write the failing tests**

Create `tests/modules/verbs/VerbSentenceSetup.test.ts`. The component uses `useNouns` (IndexedDB) and `useSettings`; mock both so mounting is synchronous and `canUseAi` is true:

```ts
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import VerbSentenceSetup from '../../../src/modules/verbs/VerbSentenceSetup.vue'
import { NOUN_GROUPS } from '../../../src/db/types'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

vi.mock('../../../src/composables/useNouns', () => ({
  useNouns: () => ({
    sampleByGroups: async () => [{ german: 'Tisch', article: 'der', english: 'table', group: 'Alltag' }],
    countsByGroup: async () => Object.fromEntries(NOUN_GROUPS.map(g => [g, 5]))
  })
}))
vi.mock('../../../src/composables/useSettings', () => ({
  useSettings: () => ({
    settings: ref({ aiProvider: 'gemini', apiKey: 'k', model: 'm' }),
    canUseAi: computed(() => true),
    load: async () => {}
  })
}))

beforeEach(() => {
  push.mockClear()
  localStorage.clear()
  sessionStorage.clear()
})

function chip(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('button.tense-chip').find(b => b.text().includes(label))!
}

describe('VerbSentenceSetup Zeitformen', () => {
  test('default follows the level selection: A1-only levels → only A1 forms selected', async () => {
    const wrapper = mount(VerbSentenceSetup)
    await flushPromises()
    // Narrow levels to A1 (default is all levels): click every level chip except A1 off.
    for (const lvl of ['A2', 'B1', 'B2.1', 'B2.2']) {
      const b = wrapper.findAll('.chip').find(c => c.text() === lvl)!
      await b.trigger('click')
    }
    expect(chip(wrapper, 'Präsens').classes()).toContain('selected')
    expect(chip(wrapper, 'Perfekt').classes()).toContain('selected')
    expect(chip(wrapper, 'Präteritum').classes()).not.toContain('selected')  // A2 form
    expect(chip(wrapper, 'Konjunktiv II').classes()).not.toContain('selected')
  })

  test('manual toggle pins the selection: it persists and stops following the level', async () => {
    const first = mount(VerbSentenceSetup)
    await flushPromises()
    await chip(first, 'Konjunktiv II').trigger('click') // deselect one (default all-levels incl. B1)
    first.unmount()
    const second = mount(VerbSentenceSetup)
    await flushPromises()
    expect(chip(second, 'Konjunktiv II').classes()).not.toContain('selected')
    expect(chip(second, 'Perfekt').classes()).toContain('selected')
  })

  test('stored junk tenses are dropped on load', async () => {
    localStorage.setItem('verbSentenceSetup', JSON.stringify({ tenses: ['perfekt', 'banana'] }))
    const wrapper = mount(VerbSentenceSetup)
    await flushPromises()
    expect(chip(wrapper, 'Perfekt').classes()).toContain('selected')
    expect(chip(wrapper, 'Präsens').classes()).not.toContain('selected')
    expect(wrapper.text()).toContain('Zeitformen · 1 of 15')
  })

  test('passive chips disable when the case filter has no accusative verbs', async () => {
    const wrapper = mount(VerbSentenceSetup)
    await flushPromises()
    // Deselect every case except 'none' → no accusative-capable verbs remain.
    for (const c of ['accusative', 'dative', 'dative+accusative', 'genitive', 'reflexive', 'varies']) {
      const b = wrapper.findAll('.chip').find(x => x.text() === c)!
      await b.trigger('click')
    }
    expect(wrapper.text()).toContain('Passive tenses are disabled')
    expect(chip(wrapper, 'Passiv Präsens').attributes('disabled')).toBeDefined()
  })

  test('None empties the selection and disables Start', async () => {
    const wrapper = mount(VerbSentenceSetup)
    await flushPromises()
    const zeitformenField = wrapper.findAll('.field').find(f => f.text().includes('Zeitformen'))!
    const none = zeitformenField.findAll('button').find(b => b.text() === 'None')!
    await none.trigger('click')
    expect(wrapper.text()).toContain('Pick at least one Zeitform')
    const start = wrapper.findAll('button').find(b => b.text().includes('Start'))!
    expect(start.attributes('disabled')).toBeDefined()
  })

  test('start stashes effective tenses in meta and tensed specs', async () => {
    const wrapper = mount(VerbSentenceSetup)
    await flushPromises()
    await wrapper.findAll('button').find(b => b.text().includes('Start'))!.trigger('click')
    await flushPromises()
    const stash = JSON.parse(sessionStorage.getItem('gt:lastVerbSentenceQuiz')!)
    expect(Array.isArray(stash.meta.tenses)).toBe(true)
    expect(stash.meta.tenses.length).toBeGreaterThan(0)
    expect(stash.specs.every((s: { tense?: string }) => typeof s.tense === 'string')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/modules/verbs/VerbSentenceSetup.test.ts`
Expected: FAIL — no `.tense-chip` elements exist yet.

- [ ] **Step 3: Implement the Zeitformen field**

In `src/modules/verbs/VerbSentenceSetup.vue`:

Script additions (after the existing refs, ~line 38):

```ts
// Extend the '../../data/verbs' import with:
// VERB_TENSES, TENSE_LABELS, TENSE_LEVEL, PASSIVE_TENSE_SET, verbLevelToCefr,
// type VerbTense, type TenseCEFR

const CEFR_ORDER: TenseCEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1']

/** Default Zeitformen for a level selection: every form at or below the
 *  highest selected CEFR band (B1 cap when no level is selected, matching
 *  levelLabel's 'A2–B1' fallback band). */
function defaultTensesFor(lvls: readonly VerbLevel[]): VerbTense[] {
  const cap = lvls.length === 0
    ? CEFR_ORDER.indexOf('B1')
    : Math.max(...lvls.map(l => CEFR_ORDER.indexOf(verbLevelToCefr(l) as TenseCEFR)))
  return VERB_TENSES.filter(t => CEFR_ORDER.indexOf(TENSE_LEVEL[t]) <= cap)
}

/** null until the learner first touches a tense chip / All / None — until
 *  then the selection FOLLOWS the level choice; after that it is pinned and
 *  persisted (spec: "level-following default"). */
const customTenses = ref<VerbTense[] | null>(null)
const selectedTenses = computed<VerbTense[]>(() => customTenses.value ?? defaultTensesFor(levels.value))

const filteredVerbs = computed(() => filter({ levels: levels.value, types: types.value, cases: cases.value }))
const passiveSupported = computed(() =>
  filteredVerbs.value.some(v => v.case === 'accusative' || v.case === 'dative+accusative')
)
/** What actually starts the run: passive forms drop out when unsupported. */
const effectiveTenses = computed<VerbTense[]>(() =>
  passiveSupported.value ? selectedTenses.value : selectedTenses.value.filter(t => !PASSIVE_TENSE_SET.has(t))
)

const tensesByLevel = computed(() => {
  const g: Record<TenseCEFR, VerbTense[]> = { A1: [], A2: [], B1: [], B2: [], C1: [] }
  for (const t of VERB_TENSES) g[TENSE_LEVEL[t]].push(t)
  return g
})
function tenseDisabled(t: VerbTense): boolean {
  return PASSIVE_TENSE_SET.has(t) && !passiveSupported.value
}
function toggleTense(t: VerbTense) {
  if (tenseDisabled(t)) return
  const base = selectedTenses.value
  customTenses.value = base.includes(t) ? base.filter(x => x !== t) : [...base, t]
}
```

Rewire `availableVerbs` to reuse the new computed: `const availableVerbs = computed(() => filteredVerbs.value.length)`.

Persistence — `Stored` gains `tenses?: VerbTense[]`; in `saveStored()` include it only when pinned:

```ts
...(customTenses.value !== null ? { tenses: [...customTenses.value] } : {})
```

(spread into the stored object; keep `satisfies Stored`). In `onMounted` load: `if (Array.isArray(s.tenses)) customTenses.value = s.tenses.filter((t): t is VerbTense => (VERB_TENSES as readonly string[]).includes(t))`. Add `customTenses` to the `watch([...])` list.

`canStart` gains `&& effectiveTenses.value.length > 0`.

`start()` — pass tenses into specs and stash:

```ts
const specs = buildVerbSpecs(verbPool, nounPool, n, verbsPer.value, nounsPer.value, Math.random, effectiveTenses.value)
```

and in the stash `meta`: `tenses: effectiveTenses.value` (alongside levels/types/cases/groups).

Template — insert after the "Object case" field (`</div>` closing it, ~line 195):

```html
    <div class="field">
      <div class="field-row">
        <div class="field-label">Zeitformen · {{ selectedTenses.length }} of {{ VERB_TENSES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="customTenses = [...VERB_TENSES]">All</button>
          <button class="btn btn-quiet" type="button" @click="customTenses = []">None</button>
        </div>
      </div>
      <div v-if="!passiveSupported" class="alert alert-info passive-hint">
        <span class="alert-label">Info</span>
        Passive tenses are disabled — your verb filter has no transitive (accusative) verbs.
      </div>
      <div v-for="lv in CEFR_ORDER" :key="lv" class="tense-group">
        <div class="tense-group-label">{{ lv }}</div>
        <div class="chip-row">
          <button
            v-for="t in tensesByLevel[lv]" :key="t"
            class="chip tense-chip"
            :class="{ selected: selectedTenses.includes(t) }"
            :disabled="tenseDisabled(t)"
            @click="toggleTense(t)"
          >
            <span>{{ TENSE_LABELS[t] }}</span>
            <span class="chip-count">{{ TENSE_LEVEL[t] }}</span>
          </button>
        </div>
      </div>
    </div>
```

Warning chain (~line 274) gains, after the existing two:

```html
    <div v-else-if="effectiveTenses.length === 0" class="alert alert-warning"><span class="alert-label">Warning</span>Pick at least one Zeitform.</div>
```

Scoped styles — copy from `ConjugationQuizSetup.vue` verbatim:

```css
.passive-hint { margin-top: 0; margin-bottom: 16px; }
.tense-group { margin-bottom: 12px; }
.tense-group-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mute); margin-bottom: 6px; }
.tense-chip { gap: 8px; }
.tense-chip .chip-count { border-left: 1px solid var(--hairline); padding-left: 6px; }
```

- [ ] **Step 4: Run the new tests + the full verb module tests**

Run: `npx vitest run tests/modules/verbs tests/composables/useVerbSentenceQuiz.test.ts`
Expected: ALL PASS.

- [ ] **Step 5: Typecheck**

Run: `npx vue-tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/modules/verbs/VerbSentenceSetup.vue tests/modules/verbs/VerbSentenceSetup.test.ts
git commit -m "feat(verbs): Zeitformen selection on sentence-quiz setup" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Runner — tense badge, tensed grading, history meta

**Files:**
- Modify: `src/modules/verbs/VerbSentenceRunner.vue` (`Stash` interface ~line 45; grade call ~line 204; history meta ~line 238; prompt-card template ~line 442; scoped styles)
- Create: `tests/modules/verbs/VerbSentenceRunner.tenses.test.ts`
- Reference (read, do not modify): `tests/modules/verbs/VerbSentenceRunner.spoken.test.ts` — copy its mock-the-AI-client convention and stash fixture setup.

**Interfaces:**
- Consumes: `VerbSentenceSpec.tense` (Task 1), `GradeVerbOptions.tense` (Task 2), `TENSE_LABELS` from `src/data/verbs.ts`, stash `meta.tenses` (Task 3).
- Produces: history meta key `verbSentenceTenses?: VerbTense[]`.

- [ ] **Step 1: Write the failing tests**

Create `tests/modules/verbs/VerbSentenceRunner.tenses.test.ts`. Follow the spoken test's structure: mock `resolveAiClient` via `vi.hoisted` + `vi.mock('../../../src/composables/localClaude', …)`, mock `useQuizHistory`'s `saveQuizRun`, stash a spec, mount with a memory router. Key content:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import VerbSentenceRunner from '../../../src/modules/verbs/VerbSentenceRunner.vue'
import type { VerbSentenceSpec } from '../../../src/composables/useVerbSentenceQuiz'

const STASH_KEY = 'gt:lastVerbSentenceQuiz'

const { generateContentMock } = vi.hoisted(() => ({ generateContentMock: vi.fn() }))
vi.mock('../../../src/composables/localClaude', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/localClaude')>()
  return { ...actual, resolveAiClient: () => ({ models: { generateContent: generateContentMock } }) }
})
vi.mock('../../../src/composables/useQuizHistory', () => ({ saveQuizRun: vi.fn() }))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

const SPEC: VerbSentenceSpec = {
  index: 0,
  verbs: [{ german: 'kaufen', english: 'buy', level: 'A1', case: 'accusative' }],
  nouns: [],
  tense: 'passivPraeteritum'
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'verbs', component: { template: '<div />' } },
      { path: '/verbs/sentence', name: 'verbs-sentence', component: { template: '<div />' } },
      { path: '/verbs/sentence/run', name: 'verbs-sentence-run', component: { template: '<div />' } }
    ]
  })
}

function genResponse() {
  return { text: JSON.stringify({ items: [{
    index: 0, english: 'The cake was bought.', german: 'Der Kuchen wurde gekauft.',
    verbSpansEn: ['was bought'], nounSpansEn: [], extraWords: []
  }] }) }
}

let wrapper: ReturnType<typeof mount> | null = null
beforeEach(() => { sessionStorage.clear(); generateContentMock.mockReset(); vi.mocked(saveQuizRun).mockClear() })
afterEach(() => { wrapper?.unmount(); wrapper = null })

async function mountRunner(stash: object) {
  sessionStorage.setItem(STASH_KEY, JSON.stringify(stash))
  const router = makeRouter()
  await router.push({ name: 'verbs-sentence-run' })
  wrapper = mount(VerbSentenceRunner, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('VerbSentenceRunner tenses', () => {
  it('shows the tense badge for a tensed spec', async () => {
    generateContentMock.mockResolvedValue(genResponse())
    const w = await mountRunner({ specs: [SPEC], level: 'A1', meta: { levels: ['A1'], types: [], cases: [], groups: [], verbsPer: 1, nounsPer: 1, tenses: ['passivPraeteritum'] } })
    expect(w.find('.tense-badge').exists()).toBe(true)
    expect(w.find('.tense-badge').text()).toBe('Passiv Präteritum')
  })

  it('shows no badge for an untensed spec (remedial/legacy stash)', async () => {
    generateContentMock.mockResolvedValue(genResponse())
    const w = await mountRunner({ specs: [{ ...SPEC, tense: undefined }], level: 'A1' })
    expect(w.find('.tense-badge').exists()).toBe(false)
  })

  it('passes the required tense to the grader and records tenses in history', async () => {
    generateContentMock
      .mockResolvedValueOnce(genResponse())   // generation
      .mockResolvedValue({ text: JSON.stringify({ correct: true }) }) // grading
    const w = await mountRunner({ specs: [SPEC], level: 'A1', meta: { levels: ['A1'], types: [], cases: [], groups: [], verbsPer: 1, nounsPer: 1, tenses: ['passivPraeteritum'] } })
    await w.find('input.prep-input').setValue('Der Kuchen wurde gekauft.')
    await w.find('form.prep-input-wrap').trigger('submit')
    await flushPromises()
    // The grading call is the 2nd generateContent call — its user prompt must name the form.
    const gradeCall = generateContentMock.mock.calls[1][0]
    expect(String(gradeCall.contents)).toContain('TARGET TENSE (required German form): Passiv Präteritum')
    // Finish the run (single card) and check history meta.
    await w.findAll('button').find(b => b.text().includes('Finish quiz'))!.trigger('click')
    await flushPromises()
    expect(vi.mocked(saveQuizRun).mock.calls[0][0].meta.verbSentenceTenses).toEqual(['passivPraeteritum'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/modules/verbs/VerbSentenceRunner.tenses.test.ts`
Expected: FAIL — no `.tense-badge`, no TARGET TENSE line, no `verbSentenceTenses`.

- [ ] **Step 3: Implement**

In `src/modules/verbs/VerbSentenceRunner.vue`:

- Import: `import { TENSE_LABELS, type VerbTense } from '../../data/verbs'`
- `Stash.meta` type gains `tenses?: VerbTense[]` (append inside the existing object type).
- Grade call (~line 204) gains one property: `tense: s.tense,`
- History meta (~line 238) gains: `verbSentenceTenses: metaInfo.value?.tenses,`
- Template — inside `.prompt-card`, directly BEFORE the two `en-sentence` divs (~line 443):

```html
          <div v-if="current.tense" class="tense-badge">{{ TENSE_LABELS[current.tense] }}</div>
```

- Scoped style:

```css
.tense-badge { display: inline-block; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); border: 1px solid currentColor; border-radius: 3px; padding: 2px 8px; margin-bottom: 12px; }
```

- [ ] **Step 4: Run the runner test files**

Run: `npx vitest run tests/modules/verbs`
Expected: ALL PASS — including the pre-existing `VerbSentenceRunner.spoken.test.ts` and `VerbSentenceRunner.voice.test.ts` (their stashes have no tenses; nothing may change for them).

- [ ] **Step 5: Typecheck**

Run: `npx vue-tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/modules/verbs/VerbSentenceRunner.vue tests/modules/verbs/VerbSentenceRunner.tenses.test.ts
git commit -m "feat(verbs): tense badge, tensed grading and history meta in sentence runner" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Docs, changelog, version bump, full verification

**Files:**
- Modify: `CONTEXT.md` (the "Verb sentence quiz" glossary entry, ~lines 101-103 — read the section first and match its voice)
- Modify: `src/data/changelog.ts` (APP_VERSION + prepend entry)
- Modify: `package.json` (version)

**Interfaces:**
- Consumes: everything from Tasks 1-4 merged and green.
- Produces: version `1.18.03` everywhere; a green full suite and build.

- [ ] **Step 1: Update CONTEXT.md**

Read the `Verb sentence quiz` entry in `CONTEXT.md` and append one sentence in its established style, stating: the setup has a Zeitformen selection (all 15 `VerbTense` forms, CEFR-grouped); each spec is assigned a form before generation (even bag rotation, passive only onto accusative-capable specs); the default follows the chosen level until first customised; the remedial flow stays untensed.

- [ ] **Step 2: Bump the version**

`package.json`: `"version": "1.18.03"`.

`src/data/changelog.ts`: set `export const APP_VERSION = '1.18.03'` and prepend to `CHANGELOG`:

```ts
  {
    version: '1.18.03', date: '2026-08-06', kind: 'polish',
    title: 'Satzübersetzung · Zeitformen nach Wahl',
    notes: [
      '<strong>Du bestimmst die Zeitformen.</strong> Die KI-Satzübersetzung kennt jetzt ein Zeitformen-Feld — alle fünfzehn Formen von Präsens bis Passiv Konjunktiv II, nach Niveau gruppiert. Jeder Satz bekommt eine deiner Formen fest zugeteilt, gleichmäßig durchgemischt statt dem Zufall der KI überlassen. Voreingestellt sind die Formen deines Levels; sobald du selbst wählst, bleibt deine Auswahl gespeichert.',
      '<strong>Die Karte sagt, was verlangt ist.</strong> Ein kleines Schild über dem englischen Satz nennt die geforderte Form — wichtig, wo das Englische sie nicht verrät: war das Perfekt oder Präteritum? Und die Bewertung kennt sie auch — ein richtiger Satz in der falschen Form zählt nicht.',
      '<strong>Passiv nur, wo es geht.</strong> Passiv-Formen landen nur auf Sätzen mit einem transitiven Verb; hat dein Filter keins, sind sie sauber abgeschaltet. Die Schwachstellen-Runde bleibt, wie sie war — dort variiert die KI die Zeit weiterhin natürlich.'
    ]
  },
```

- [ ] **Step 3: Full verification**

Run: `npm test`
Expected: entire suite PASSES.

Run: `npm run build`
Expected: vue-tsc clean, vite build succeeds.

- [ ] **Step 4: Commit**

```bash
git add CONTEXT.md src/data/changelog.ts package.json
git commit -m "chore: bump version to 1.18.03" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
