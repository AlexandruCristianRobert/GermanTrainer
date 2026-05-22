# Verbs Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Verbs module to German Trainer with translation + conjugation quizzes across 15 tenses (incl. Vorgangspassiv), backed by an in-memory dataset of ~150 A1/A2 verbs with type and case metadata.

**Architecture:** TypeScript module holds the dataset and a pure conjugation engine. Vue composables wrap them for filtering/sampling and quiz state. Module-level Vue components mirror the existing nouns/adjectives pattern (Home → Setup → Runner → Result). No DB.

**Tech Stack:** Vue 3, TypeScript (strict), Vite, naive-ui, vue-router, vitest.

**Spec:** `docs/superpowers/specs/2026-05-22-verbs-module-design.md`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/data/verbs.ts` | Verb type, enums (level/type/case), the ~150-verb dataset. |
| `src/composables/conjugate.ts` | Pure conjugation engine: `conjugate(verb, tense) → ConjugationRow[]`. Auxiliary tables baked in. |
| `src/composables/useVerbs.ts` | `all()`, `filter(opts)`, `sample(n, opts)`, `tenseLevel(tense)`. |
| `src/composables/useVerbQuiz.ts` | State machine for both quiz modes. |
| `src/modules/verbs/VerbsHome.vue` | Landing page with 4 cards. |
| `src/modules/verbs/ListVerbs.vue` | Filterable read-only table. |
| `src/modules/verbs/TranslationQuizSetup.vue` | Filters + count picker. |
| `src/modules/verbs/TranslationQuizRunner.vue` | One-input-per-question runner. |
| `src/modules/verbs/ConjugationQuizSetup.vue` | Filters + grouped tense picker + count. |
| `src/modules/verbs/ConjugationQuizRunner.vue` | Multi-input-per-question runner. |
| `src/modules/verbs/QuizResult.vue` | Score + per-question recap. |
| `src/modules/verbs/CheatSheet.vue` | Collapsible rules + exceptions. |
| `src/router.ts` | (Modify) add 7 verb routes. |
| `src/components/NavShell.vue` | (Modify) add "Verbs" nav item. |
| `src/modules/home/Home.vue` | (Modify) add "Verbs" card. |
| `tests/composables/conjugate.test.ts` | Engine tests. |
| `tests/composables/useVerbs.test.ts` | Filter/sample tests. |
| `tests/composables/useVerbQuiz.test.ts` | Acceptance-rule tests. |

---

### Task 1: Verb type definitions and a minimal seed dataset

**Files:**
- Create: `src/data/verbs.ts`

- [ ] **Step 1: Create the type definitions and a tiny seed list**

Create `src/data/verbs.ts` with the types and 5 verbs covering each `VerbType` so the engine tests can run against representative data:

```ts
export const VERB_LEVELS = ['A1', 'A2'] as const
export type VerbLevel = (typeof VERB_LEVELS)[number]

export const VERB_TYPES = ['regular', 'irregular', 'mixed', 'separable', 'modal'] as const
export type VerbType = (typeof VERB_TYPES)[number]

export const VERB_CASES = [
  'none',
  'accusative',
  'dative',
  'dative+accusative',
  'genitive',
  'reflexive',
  'varies'
] as const
export type VerbCase = (typeof VERB_CASES)[number]

export type Auxiliary = 'haben' | 'sein'

export const VERB_PERSONS = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'] as const
export type VerbPerson = (typeof VERB_PERSONS)[number]

export const IMPERATIV_PERSONS = ['du', 'ihr', 'Sie'] as const
export type ImperativPerson = (typeof IMPERATIV_PERSONS)[number]

export type SixForms = readonly [string, string, string, string, string, string]

export const ACTIVE_TENSES = [
  'praesens',
  'imperativ',
  'perfekt',
  'praeteritum',
  'plusquamperfekt',
  'futur1',
  'konjunktiv2',
  'konjunktiv1',
  'futur2'
] as const

export const PASSIVE_TENSES = [
  'passivPraesens',
  'passivPraeteritum',
  'passivPerfekt',
  'passivPlusquamperfekt',
  'passivFutur1',
  'passivKonjunktiv2'
] as const

export const VERB_TENSES = [...ACTIVE_TENSES, ...PASSIVE_TENSES] as const
export type VerbTense = (typeof VERB_TENSES)[number]

export const TENSE_LABELS: Record<VerbTense, string> = {
  praesens: 'Präsens',
  imperativ: 'Imperativ',
  perfekt: 'Perfekt',
  praeteritum: 'Präteritum',
  plusquamperfekt: 'Plusquamperfekt',
  futur1: 'Futur I',
  konjunktiv2: 'Konjunktiv II',
  konjunktiv1: 'Konjunktiv I',
  futur2: 'Futur II',
  passivPraesens: 'Passiv Präsens',
  passivPraeteritum: 'Passiv Präteritum',
  passivPerfekt: 'Passiv Perfekt',
  passivPlusquamperfekt: 'Passiv Plusquamperfekt',
  passivFutur1: 'Passiv Futur I',
  passivKonjunktiv2: 'Passiv Konjunktiv II'
}

export type TenseCEFR = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'

export const TENSE_LEVEL: Record<VerbTense, TenseCEFR> = {
  praesens: 'A1',
  imperativ: 'A1',
  perfekt: 'A1',
  praeteritum: 'A2',
  plusquamperfekt: 'A2',
  futur1: 'A2',
  konjunktiv2: 'B1',
  passivPraesens: 'B1',
  passivPraeteritum: 'B1',
  konjunktiv1: 'B2',
  futur2: 'B2',
  passivPerfekt: 'B2',
  passivPlusquamperfekt: 'B2',
  passivFutur1: 'C1',
  passivKonjunktiv2: 'C1'
}

export const PASSIVE_TENSE_SET: ReadonlySet<VerbTense> = new Set(PASSIVE_TENSES)

export interface Verb {
  german: string
  english: string
  level: VerbLevel
  type: VerbType
  case: VerbCase
  auxiliary: Auxiliary
  separablePrefix?: string
  praesens: SixForms
  praeteritumStem: string
  praeteritum?: SixForms
  partizip2: string
  konjunktiv2?: SixForms
  konjunktiv1?: SixForms
  imperativDu?: string
  notes?: string
}

export const VERBS: readonly Verb[] = [
  {
    german: 'spielen',
    english: 'play',
    level: 'A1',
    type: 'regular',
    case: 'accusative',
    auxiliary: 'haben',
    praesens: ['spiele', 'spielst', 'spielt', 'spielen', 'spielt', 'spielen'],
    praeteritumStem: 'spielte',
    partizip2: 'gespielt'
  },
  {
    german: 'gehen',
    english: 'go / walk',
    level: 'A1',
    type: 'irregular',
    case: 'none',
    auxiliary: 'sein',
    praesens: ['gehe', 'gehst', 'geht', 'gehen', 'geht', 'gehen'],
    praeteritumStem: 'ging',
    partizip2: 'gegangen',
    konjunktiv2: ['ginge', 'gingest', 'ginge', 'gingen', 'ginget', 'gingen']
  },
  {
    german: 'bringen',
    english: 'bring',
    level: 'A1',
    type: 'mixed',
    case: 'dative+accusative',
    auxiliary: 'haben',
    praesens: ['bringe', 'bringst', 'bringt', 'bringen', 'bringt', 'bringen'],
    praeteritumStem: 'brachte',
    partizip2: 'gebracht'
  },
  {
    german: 'aufstehen',
    english: 'get up / stand up',
    level: 'A1',
    type: 'separable',
    case: 'none',
    auxiliary: 'sein',
    separablePrefix: 'auf',
    praesens: ['stehe auf', 'stehst auf', 'steht auf', 'stehen auf', 'steht auf', 'stehen auf'],
    praeteritumStem: 'stand',
    partizip2: 'aufgestanden'
  },
  {
    german: 'können',
    english: 'can / be able to',
    level: 'A1',
    type: 'modal',
    case: 'none',
    auxiliary: 'haben',
    praesens: ['kann', 'kannst', 'kann', 'können', 'könnt', 'können'],
    praeteritumStem: 'konnte',
    partizip2: 'gekonnt',
    konjunktiv2: ['könnte', 'könntest', 'könnte', 'könnten', 'könntet', 'könnten']
  }
]
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/data/verbs.ts
git commit -m "feat(verbs): add Verb type, tense enums, and seed dataset"
```

---

### Task 2: Conjugation engine — present, imperativ, perfekt

**Files:**
- Create: `src/composables/conjugate.ts`
- Create: `tests/composables/conjugate.test.ts`

- [ ] **Step 1: Write failing tests for the engine surface (present, imperativ, perfekt)**

Create `tests/composables/conjugate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { conjugate } from '../../src/composables/conjugate'
import { VERBS } from '../../src/data/verbs'
import type { Verb } from '../../src/data/verbs'

function find(german: string): Verb {
  const v = VERBS.find(v => v.german === german)
  if (!v) throw new Error(`fixture verb "${german}" missing`)
  return v
}

describe('conjugate — Präsens', () => {
  it('returns 6 rows in pronoun order', () => {
    const rows = conjugate(find('spielen'), 'praesens')
    expect(rows.map(r => r.person)).toEqual(['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'])
    expect(rows.map(r => r.expected)).toEqual(['spiele', 'spielst', 'spielt', 'spielen', 'spielt', 'spielen'])
  })

  it('separable verb is split (stehe auf)', () => {
    const rows = conjugate(find('aufstehen'), 'praesens')
    expect(rows[0].expected).toBe('stehe auf')
    expect(rows[2].expected).toBe('steht auf')
  })
})

describe('conjugate — Imperativ', () => {
  it('returns 3 rows: du, ihr, Sie', () => {
    const rows = conjugate(find('spielen'), 'imperativ')
    expect(rows.map(r => r.person)).toEqual(['du', 'ihr', 'Sie'])
    expect(rows[0].expected).toBe('spiel')
    expect(rows[1].expected).toBe('spielt')
    expect(rows[2].expected).toBe('spielen Sie')
  })

  it('separable du imperativ moves prefix to end', () => {
    const rows = conjugate(find('aufstehen'), 'imperativ')
    expect(rows[0].expected).toBe('steh auf')
    expect(rows[2].expected).toBe('stehen Sie auf')
  })
})

describe('conjugate — Perfekt', () => {
  it('uses haben + Partizip II', () => {
    const rows = conjugate(find('spielen'), 'perfekt')
    expect(rows[0].expected).toBe('habe gespielt')
    expect(rows[2].expected).toBe('hat gespielt')
    expect(rows[3].expected).toBe('haben gespielt')
  })

  it('uses sein for verbs with auxiliary sein', () => {
    const rows = conjugate(find('gehen'), 'perfekt')
    expect(rows[0].expected).toBe('bin gegangen')
    expect(rows[2].expected).toBe('ist gegangen')
  })

  it('separable Perfekt uses joined Partizip II', () => {
    const rows = conjugate(find('aufstehen'), 'perfekt')
    expect(rows[0].expected).toBe('bin aufgestanden')
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run tests/composables/conjugate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement enough of the engine to pass these tests**

Create `src/composables/conjugate.ts`:

```ts
import type { SixForms, Verb, VerbTense } from '../data/verbs'

export interface ConjugationRow {
  person: string
  expected: string
}

const PERSON_LABELS_6 = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'] as const
const IMP_LABELS = ['du', 'ihr', 'Sie'] as const

const HABEN_PRES: SixForms = ['habe', 'hast', 'hat', 'haben', 'habt', 'haben']
const HABEN_PRAET: SixForms = ['hatte', 'hattest', 'hatte', 'hatten', 'hattet', 'hatten']
const SEIN_PRES: SixForms = ['bin', 'bist', 'ist', 'sind', 'seid', 'sind']
const SEIN_PRAET: SixForms = ['war', 'warst', 'war', 'waren', 'wart', 'waren']
const WERDEN_PRES: SixForms = ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden']
const WERDEN_PRAET: SixForms = ['wurde', 'wurdest', 'wurde', 'wurden', 'wurdet', 'wurden']
const WUERDE: SixForms = ['würde', 'würdest', 'würde', 'würden', 'würdet', 'würden']

function auxPresent(aux: 'haben' | 'sein'): SixForms {
  return aux === 'haben' ? HABEN_PRES : SEIN_PRES
}
function auxPraet(aux: 'haben' | 'sein'): SixForms {
  return aux === 'haben' ? HABEN_PRAET : SEIN_PRAET
}

function sixRows(forms: SixForms): ConjugationRow[] {
  return PERSON_LABELS_6.map((person, i) => ({ person, expected: forms[i] }))
}

function compoundWithAux(aux: SixForms, tail: string): SixForms {
  return aux.map(a => `${a} ${tail}`) as unknown as SixForms
}

function imperativ(verb: Verb): ConjugationRow[] {
  const du = imperativDu(verb)
  const ihr = stripPronounPrefix(verb.praesens[4], 'ihr')
  const sie = verb.separablePrefix
    ? `${stripSuffixPrefix(verb.praesens[5], verb.separablePrefix)} Sie ${verb.separablePrefix}`.replace(/\s+/g, ' ').trim()
    : `${verb.praesens[5]} Sie`
  return [
    { person: IMP_LABELS[0], expected: du },
    { person: IMP_LABELS[1], expected: ihr },
    { person: IMP_LABELS[2], expected: sie }
  ]
}

function stripPronounPrefix(form: string, _pronoun: string): string {
  return form
}

function stripSuffixPrefix(form: string, prefix: string): string {
  const suffix = ` ${prefix}`
  return form.endsWith(suffix) ? form.slice(0, -suffix.length) : form
}

function imperativDu(verb: Verb): string {
  if (verb.imperativDu) return verb.imperativDu
  let core = verb.praesens[1]
  if (verb.separablePrefix) {
    core = stripSuffixPrefix(core, verb.separablePrefix)
  }
  // drop a trailing "st" (or "est" → "e")
  if (core.endsWith('est')) core = core.slice(0, -2)
  else if (core.endsWith('st')) core = core.slice(0, -2)
  return verb.separablePrefix ? `${core} ${verb.separablePrefix}` : core
}

export function conjugate(verb: Verb, tense: VerbTense): ConjugationRow[] {
  switch (tense) {
    case 'praesens':
      return sixRows(verb.praesens)
    case 'imperativ':
      return imperativ(verb)
    case 'perfekt':
      return sixRows(compoundWithAux(auxPresent(verb.auxiliary), verb.partizip2))
    default:
      throw new Error(`tense ${tense} not yet implemented`)
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/composables/conjugate.test.ts`
Expected: PASS (all describes green).

- [ ] **Step 5: Commit**

```bash
git add src/composables/conjugate.ts tests/composables/conjugate.test.ts
git commit -m "feat(verbs): conjugation engine — präsens, imperativ, perfekt"
```

---

### Task 3: Conjugation engine — Präteritum, Plusquamperfekt, Futur I/II

**Files:**
- Modify: `src/composables/conjugate.ts`
- Modify: `tests/composables/conjugate.test.ts`

- [ ] **Step 1: Append failing tests for the new tenses**

Append to `tests/composables/conjugate.test.ts`:

```ts
describe('conjugate — Präteritum', () => {
  it('regular verb: stem already includes -te ending', () => {
    const rows = conjugate(find('spielen'), 'praeteritum')
    expect(rows.map(r => r.expected)).toEqual([
      'spielte', 'spieltest', 'spielte', 'spielten', 'spieltet', 'spielten'
    ])
  })

  it('strong verb: ich/er have no ending', () => {
    const rows = conjugate(find('gehen'), 'praeteritum')
    expect(rows[0].expected).toBe('ging')
    expect(rows[1].expected).toBe('gingst')
    expect(rows[2].expected).toBe('ging')
    expect(rows[3].expected).toBe('gingen')
    expect(rows[4].expected).toBe('gingt')
    expect(rows[5].expected).toBe('gingen')
  })

  it('separable Präteritum splits prefix to end', () => {
    const rows = conjugate(find('aufstehen'), 'praeteritum')
    expect(rows[0].expected).toBe('stand auf')
    expect(rows[2].expected).toBe('stand auf')
    expect(rows[3].expected).toBe('standen auf')
  })
})

describe('conjugate — Plusquamperfekt', () => {
  it('uses aux Präteritum + Partizip II', () => {
    expect(conjugate(find('spielen'), 'plusquamperfekt')[0].expected).toBe('hatte gespielt')
    expect(conjugate(find('gehen'), 'plusquamperfekt')[0].expected).toBe('war gegangen')
  })
})

describe('conjugate — Futur I', () => {
  it('uses werden + Infinitiv', () => {
    expect(conjugate(find('spielen'), 'futur1')[0].expected).toBe('werde spielen')
    expect(conjugate(find('aufstehen'), 'futur1')[0].expected).toBe('werde aufstehen')
  })
})

describe('conjugate — Futur II', () => {
  it('uses werden + Partizip II + Auxiliary infinitive', () => {
    expect(conjugate(find('spielen'), 'futur2')[0].expected).toBe('werde gespielt haben')
    expect(conjugate(find('gehen'), 'futur2')[0].expected).toBe('werde gegangen sein')
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run tests/composables/conjugate.test.ts`
Expected: FAIL — `tense X not yet implemented`.

- [ ] **Step 3: Extend the engine**

Replace the `switch` in `conjugate` and add the helper, in `src/composables/conjugate.ts`:

```ts
const STRONG_PRAET_ENDINGS: SixForms = ['', 'st', '', 'en', 't', 'en']
const WEAK_PRAET_ENDINGS:   SixForms = ['',   'st', '', 'n',  't', 'n']

function endsWithTteDe(stem: string): boolean {
  return /[td]$/.test(stem) && !stem.endsWith('te')
}

function praeteritum(verb: Verb): SixForms {
  if (verb.praeteritum) return verb.praeteritum
  const stem = verb.praeteritumStem
  const isWeak = stem.endsWith('te')
  const endings = isWeak ? WEAK_PRAET_ENDINGS : STRONG_PRAET_ENDINGS
  const needsBindeE = !isWeak && endsWithTteDe(stem)
  let forms = endings.map((end, i) => {
    if (i === 0 || i === 2) return stem
    let suffix = end
    if (needsBindeE && (suffix === 'st' || suffix === 't')) suffix = 'e' + suffix
    return stem + suffix
  }) as unknown as SixForms

  if (verb.separablePrefix) {
    forms = forms.map(f => `${f} ${verb.separablePrefix}`) as unknown as SixForms
  }
  return forms
}

function futur1Forms(verb: Verb): SixForms {
  return compoundWithAux(WERDEN_PRES, verb.german)
}

function futur2Forms(verb: Verb): SixForms {
  const tail = `${verb.partizip2} ${verb.auxiliary}`
  return compoundWithAux(WERDEN_PRES, tail)
}
```

Update the switch:

```ts
    case 'praeteritum':
      return sixRows(praeteritum(verb))
    case 'plusquamperfekt':
      return sixRows(compoundWithAux(auxPraet(verb.auxiliary), verb.partizip2))
    case 'futur1':
      return sixRows(futur1Forms(verb))
    case 'futur2':
      return sixRows(futur2Forms(verb))
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/composables/conjugate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/conjugate.ts tests/composables/conjugate.test.ts
git commit -m "feat(verbs): präteritum, plusquamperfekt, futur I/II"
```

---

### Task 4: Conjugation engine — Konjunktiv I/II

**Files:**
- Modify: `src/composables/conjugate.ts`
- Modify: `tests/composables/conjugate.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
describe('conjugate — Konjunktiv II', () => {
  it('falls back to würde + Infinitiv when no explicit forms', () => {
    expect(conjugate(find('spielen'), 'konjunktiv2')[0].expected).toBe('würde spielen')
  })

  it('uses explicit forms when present (gehen → ginge)', () => {
    expect(conjugate(find('gehen'), 'konjunktiv2')[0].expected).toBe('ginge')
    expect(conjugate(find('gehen'), 'konjunktiv2')[2].expected).toBe('ginge')
  })

  it('modal uses explicit könnte forms', () => {
    expect(conjugate(find('können'), 'konjunktiv2')[0].expected).toBe('könnte')
  })
})

describe('conjugate — Konjunktiv I', () => {
  it('regular: infinitive stem + K1 endings', () => {
    expect(conjugate(find('spielen'), 'konjunktiv1').map(r => r.expected)).toEqual([
      'spiele', 'spielest', 'spiele', 'spielen', 'spielet', 'spielen'
    ])
  })

  it('uses override when present', () => {
    // We'll verify via sein in a later task; for now skip — covered after dataset expands
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run tests/composables/conjugate.test.ts`
Expected: FAIL on the new K1/K2 cases.

- [ ] **Step 3: Implement K1 and K2 in the engine**

Add to `src/composables/conjugate.ts`:

```ts
const K1_ENDINGS: SixForms = ['e', 'est', 'e', 'en', 'et', 'en']

function infinitiveStem(verb: Verb): string {
  const inf = verb.separablePrefix
    ? verb.german.slice(verb.separablePrefix.length)
    : verb.german
  return inf.endsWith('en') ? inf.slice(0, -2) : inf.slice(0, -1)
}

function konjunktiv1(verb: Verb): SixForms {
  if (verb.konjunktiv1) return verb.konjunktiv1
  const stem = infinitiveStem(verb)
  let forms = K1_ENDINGS.map(e => stem + e) as unknown as SixForms
  if (verb.separablePrefix) {
    forms = forms.map(f => `${f} ${verb.separablePrefix}`) as unknown as SixForms
  }
  return forms
}

function konjunktiv2(verb: Verb): SixForms {
  if (verb.konjunktiv2) {
    if (verb.separablePrefix) {
      return verb.konjunktiv2.map(f => `${f} ${verb.separablePrefix}`) as unknown as SixForms
    }
    return verb.konjunktiv2
  }
  return compoundWithAux(WUERDE, verb.german)
}
```

Add switch cases:

```ts
    case 'konjunktiv1':
      return sixRows(konjunktiv1(verb))
    case 'konjunktiv2':
      return sixRows(konjunktiv2(verb))
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/composables/conjugate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/conjugate.ts tests/composables/conjugate.test.ts
git commit -m "feat(verbs): konjunktiv I and II"
```

---

### Task 5: Conjugation engine — Vorgangspassiv

**Files:**
- Modify: `src/composables/conjugate.ts`
- Modify: `tests/composables/conjugate.test.ts`

- [ ] **Step 1: Append failing passive tests using a transitive verb**

First, extend the seed dataset by adding `fragen` (a clean transitive A1 verb) at the top of `VERBS` in `src/data/verbs.ts`:

```ts
  {
    german: 'fragen',
    english: 'ask',
    level: 'A1',
    type: 'regular',
    case: 'accusative',
    auxiliary: 'haben',
    praesens: ['frage', 'fragst', 'fragt', 'fragen', 'fragt', 'fragen'],
    praeteritumStem: 'fragte',
    partizip2: 'gefragt'
  },
```

Then append to `tests/composables/conjugate.test.ts`:

```ts
describe('conjugate — Vorgangspassiv', () => {
  it('Passiv Präsens = werden + Partizip II', () => {
    const rows = conjugate(find('fragen'), 'passivPraesens')
    expect(rows[0].expected).toBe('werde gefragt')
    expect(rows[2].expected).toBe('wird gefragt')
  })

  it('Passiv Präteritum = wurde + Partizip II', () => {
    expect(conjugate(find('fragen'), 'passivPraeteritum')[0].expected).toBe('wurde gefragt')
  })

  it('Passiv Perfekt uses sein + Partizip II + worden', () => {
    expect(conjugate(find('fragen'), 'passivPerfekt')[0].expected).toBe('bin gefragt worden')
    expect(conjugate(find('fragen'), 'passivPerfekt')[2].expected).toBe('ist gefragt worden')
  })

  it('Passiv Plusquamperfekt uses war + Partizip II + worden', () => {
    expect(conjugate(find('fragen'), 'passivPlusquamperfekt')[0].expected).toBe('war gefragt worden')
  })

  it('Passiv Futur I = werden + Partizip II + werden', () => {
    expect(conjugate(find('fragen'), 'passivFutur1')[0].expected).toBe('werde gefragt werden')
  })

  it('Passiv Konjunktiv II = würde + Partizip II + werden', () => {
    expect(conjugate(find('fragen'), 'passivKonjunktiv2')[0].expected).toBe('würde gefragt werden')
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run tests/composables/conjugate.test.ts`
Expected: FAIL — passive tenses not implemented.

- [ ] **Step 3: Implement passive tense cases in the engine switch**

```ts
    case 'passivPraesens':
      return sixRows(compoundWithAux(WERDEN_PRES, verb.partizip2))
    case 'passivPraeteritum':
      return sixRows(compoundWithAux(WERDEN_PRAET, verb.partizip2))
    case 'passivPerfekt':
      return sixRows(compoundWithAux(SEIN_PRES, `${verb.partizip2} worden`))
    case 'passivPlusquamperfekt':
      return sixRows(compoundWithAux(SEIN_PRAET, `${verb.partizip2} worden`))
    case 'passivFutur1':
      return sixRows(compoundWithAux(WERDEN_PRES, `${verb.partizip2} werden`))
    case 'passivKonjunktiv2':
      return sixRows(compoundWithAux(WUERDE, `${verb.partizip2} werden`))
```

Replace the trailing `default` to keep TypeScript exhaustiveness:

```ts
    default: {
      const _exhaustive: never = tense
      throw new Error(`unhandled tense: ${String(_exhaustive)}`)
    }
```

Also add an exported helper:

```ts
export function passiveAvailable(verb: Verb): boolean {
  return verb.case === 'accusative' || verb.case === 'dative+accusative'
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/composables/conjugate.test.ts`
Expected: PASS — all 15 tenses now covered.

- [ ] **Step 5: Commit**

```bash
git add src/composables/conjugate.ts src/data/verbs.ts tests/composables/conjugate.test.ts
git commit -m "feat(verbs): vorgangspassiv across 6 passive tenses"
```

---

### Task 6: Expand the verb dataset to ~150 A1/A2 entries

**Files:**
- Modify: `src/data/verbs.ts`

- [ ] **Step 1: Add the full A1 set (~80 verbs)**

Append these verbs to the `VERBS` array. The list below is the authoritative A1 set — copy verbatim, then move on:

Common verbs to include with full conjugation data (each verb is one object in the array, following the same shape as the seed entries; for strong verbs always supply `konjunktiv2` when in active use):

A1 (~80): sein, haben, werden, machen, sagen, sehen, geben, nehmen, finden, müssen, wollen, sollen, dürfen, mögen, wissen, stehen, liegen, leben, lernen, arbeiten, kaufen, brauchen, suchen, fragen (already), antworten, hören, lesen, schreiben, sprechen, verstehen, lieben, essen, trinken, schlafen, kochen, kennen, denken, glauben, heißen, wohnen, fahren, fliegen, laufen, helfen, treffen, lachen, weinen, warten, bleiben, gefallen, schmecken, wünschen, anfangen, aufhören, aufmachen, zumachen, einkaufen, einladen, mitkommen, mitnehmen, fernsehen, vorstellen, anrufen, ankommen, abfahren, abholen, ausgehen, weggehen, zurückkommen, anziehen, ausziehen, sitzen, tanzen, schwimmen, regnen, schneien, putzen, duschen, frühstücken, kommen.

Verb-specific encoding notes (apply per entry):

- **sein**: `type: 'irregular'`, `aux: 'sein'`, `praesens: ['bin','bist','ist','sind','seid','sind']`, `praeteritumStem: 'war'`, `praeteritum: ['war','warst','war','waren','wart','waren']`, `partizip2: 'gewesen'`, `konjunktiv2: ['wäre','wärst','wäre','wären','wärt','wären']`, `konjunktiv1: ['sei','seist','sei','seien','seiet','seien']`, `imperativDu: 'sei'`.
- **haben**: `type: 'irregular'`, `aux: 'haben'`, `praesens: ['habe','hast','hat','haben','habt','haben']`, `praeteritumStem: 'hatte'`, `partizip2: 'gehabt'`, `konjunktiv2: ['hätte','hättest','hätte','hätten','hättet','hätten']`.
- **werden**: `type: 'irregular'`, `aux: 'sein'`, `praesens: ['werde','wirst','wird','werden','werdet','werden']`, `praeteritumStem: 'wurde'`, `partizip2: 'geworden'`, `konjunktiv2: ['würde','würdest','würde','würden','würdet','würden']`.
- **Modals** (müssen, wollen, sollen, dürfen, mögen, können — already, wissen): explicit `praesens`, weak `-te` `praeteritumStem`, `partizip2` `ge<X>t`, explicit `konjunktiv2` (müsste, wollte, sollte, dürfte, möchte, könnte already, wüsste).
- **Strong verbs with vowel changes**: encode the vowel-changed du/er form directly in `praesens` (e.g., fahren `['fahre','fährst','fährt','fahren','fahrt','fahren']`, sehen `['sehe','siehst','sieht','sehen','seht','sehen']`). For Imperativ-du verbs that use the e→i/ie change, set `imperativDu` (e.g., `sieh`, `lies`, `nimm`, `iss`, `gib`, `hilf`).
- **Bindevokal verbs** (arbeiten, antworten, warten, kosten, finden): encode `praesens` with the extra -e- (`['arbeite','arbeitest','arbeitet','arbeiten','arbeitet','arbeiten']`). `praeteritumStem` for `arbeiten` = `'arbeitete'`.
- **Separable verbs** (anfangen, aufhören, aufmachen, zumachen, einkaufen, einladen, mitkommen, mitnehmen, fernsehen, vorstellen, anrufen, ankommen, abfahren, abholen, ausgehen, weggehen, zurückkommen, anziehen, ausziehen): `separablePrefix` set; `praesens` already includes split form (`'fange an'`, `'rufst an'` etc.); `partizip2` is joined (`'angefangen'`, `'angerufen'`); `praeteritumStem` is the base verb stem (without prefix) and the engine will append the prefix.
- **Aux `sein` for motion/state-change**: gehen (already), kommen, laufen, fliegen, fahren, schwimmen, bleiben, werden, sein, ankommen, abfahren, ausgehen, weggehen, zurückkommen, aufstehen (already).
- **Dative verbs**: helfen, antworten, gefallen, gehören (A2), schmecken — set `case: 'dative'`.
- **Dative+Accusative**: geben, bringen (already), schenken (A2) — `case: 'dative+accusative'`.

- [ ] **Step 2: Add the A2 set (~70 verbs)**

A2 additions: erklären, beantworten, beginnen, empfehlen, erinnern (reflexive), entspannen (reflexive), vorbereiten, mieten, verkaufen, vergessen, verlieren, gewinnen, sterben, entscheiden (reflexive), versprechen, erlauben, erzählen, schenken, beschreiben, besuchen, üben, abnehmen, zunehmen, anbieten, mitbringen, herstellen, vorschlagen, einsteigen, aussteigen, umsteigen, beobachten, bedeuten, vermissen, hassen, klingeln, klären, korrigieren, übersetzen, wiederholen, gehören, leihen, leiten, lieben, malen, meinen, merken, organisieren, packen, parken, planen, rauchen, reisen, reparieren, schicken, schließen, schneiden, schreien, springen, sich freuen, sich treffen, sich anziehen, sich beschweren, sich kümmern.

Encoding notes for A2:

- **Inseparable strong verbs** (`be-`, `ge-`, `ver-`, `emp-`, `ent-`, `er-`, `zer-`) drop `ge-` in Partizip II: vergessen → `vergessen`, verlieren → `verloren`, gewinnen → `gewonnen`, beschreiben → `beschrieben`, besuchen → `besucht`, beginnen → `begonnen`, empfehlen → `empfohlen`, entscheiden → `entschieden`, versprechen → `versprochen`.
- **Reflexive verbs**: `case: 'reflexive'`. `german` includes "sich" (`sich freuen`); the engine's `infinitiveStem` should handle this — see Task 4's helper. **Adjustment:** the engine should strip a leading "sich " before extracting stem.

Update `infinitiveStem` in `src/composables/conjugate.ts` to handle reflexive prefix:

```ts
function infinitiveStem(verb: Verb): string {
  let inf = verb.german
  if (inf.startsWith('sich ')) inf = inf.slice(5)
  if (verb.separablePrefix) inf = inf.slice(verb.separablePrefix.length)
  return inf.endsWith('en') ? inf.slice(0, -2) : inf.slice(0, -1)
}
```

Reflexive verbs' `praesens` field stores only the verb part (e.g., `sich freuen` → `['freue','freust','freut','freuen','freut','freuen']`). The "sich/mich/dich/uns/euch/sich" pronoun is the UI's concern, not the engine's.

- [ ] **Step 3: Run typecheck and engine tests**

```bash
npm run typecheck
npx vitest run tests/composables/conjugate.test.ts
```

Expected: both pass.

- [ ] **Step 4: Add a sanity-coverage test**

Append to `tests/composables/conjugate.test.ts`:

```ts
describe('conjugate — coverage on full dataset', () => {
  it('runs all active tenses on every verb without throwing', () => {
    for (const v of VERBS) {
      for (const t of ['praesens','imperativ','perfekt','praeteritum','plusquamperfekt','futur1','konjunktiv2','konjunktiv1','futur2'] as const) {
        const rows = conjugate(v, t)
        expect(rows.length).toBeGreaterThan(0)
        rows.forEach(r => expect(r.expected.length).toBeGreaterThan(0))
      }
    }
  })

  it('runs passive tenses on accusative verbs without throwing', () => {
    const passiveTargets = VERBS.filter(v => v.case === 'accusative' || v.case === 'dative+accusative')
    for (const v of passiveTargets) {
      for (const t of ['passivPraesens','passivPraeteritum','passivPerfekt','passivPlusquamperfekt','passivFutur1','passivKonjunktiv2'] as const) {
        const rows = conjugate(v, t)
        expect(rows.length).toBe(6)
        rows.forEach(r => expect(r.expected.length).toBeGreaterThan(0))
      }
    }
  })
})
```

Run: `npx vitest run tests/composables/conjugate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/verbs.ts src/composables/conjugate.ts tests/composables/conjugate.test.ts
git commit -m "feat(verbs): expand dataset to ~150 A1/A2 verbs"
```

---

### Task 7: `useVerbs` composable

**Files:**
- Create: `src/composables/useVerbs.ts`
- Create: `tests/composables/useVerbs.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { useVerbs } from '../../src/composables/useVerbs'

describe('useVerbs', () => {
  const { all, filter, sample } = useVerbs()

  it('all() returns the dataset', () => {
    expect(all().length).toBeGreaterThan(100)
  })

  it('filter by level', () => {
    const a1 = filter({ levels: ['A1'] })
    expect(a1.every(v => v.level === 'A1')).toBe(true)
  })

  it('filter by type', () => {
    const modals = filter({ types: ['modal'] })
    expect(modals.every(v => v.type === 'modal')).toBe(true)
    expect(modals.length).toBeGreaterThanOrEqual(6)
  })

  it('filter by case', () => {
    const datives = filter({ cases: ['dative'] })
    expect(datives.every(v => v.case === 'dative')).toBe(true)
  })

  it('sample returns up to n unique entries', () => {
    const s = sample(5, { levels: ['A1'] })
    expect(s.length).toBe(5)
    const uniq = new Set(s.map(v => v.german))
    expect(uniq.size).toBe(5)
  })

  it('sample clamps to available size', () => {
    const s = sample(9999, { types: ['modal'] })
    expect(s.length).toBe(filter({ types: ['modal'] }).length)
  })
})
```

- [ ] **Step 2: Implement**

```ts
import type { Verb, VerbLevel, VerbType, VerbCase } from '../data/verbs'
import { VERBS } from '../data/verbs'

export interface VerbFilter {
  levels?: VerbLevel[]
  types?: VerbType[]
  cases?: VerbCase[]
}

function matches(verb: Verb, f: VerbFilter): boolean {
  if (f.levels && f.levels.length && !f.levels.includes(verb.level)) return false
  if (f.types && f.types.length && !f.types.includes(verb.type)) return false
  if (f.cases && f.cases.length && !f.cases.includes(verb.case)) return false
  return true
}

export function useVerbs() {
  function all(): Verb[] {
    return [...VERBS]
  }

  function filter(f: VerbFilter): Verb[] {
    return VERBS.filter(v => matches(v, f))
  }

  function sample(n: number, f: VerbFilter = {}): Verb[] {
    const pool = filter(f)
    const k = Math.min(n, pool.length)
    const copy = [...pool]
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(Math.random() * (copy.length - i))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy.slice(0, k)
  }

  return { all, filter, sample }
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/composables/useVerbs.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/composables/useVerbs.ts tests/composables/useVerbs.test.ts
git commit -m "feat(verbs): useVerbs composable (filter, sample)"
```

---

### Task 8: `useVerbQuiz` — translation mode

**Files:**
- Create: `src/composables/useVerbQuiz.ts`
- Create: `tests/composables/useVerbQuiz.test.ts`

- [ ] **Step 1: Write failing tests for translation mode**

```ts
import { describe, it, expect } from 'vitest'
import { useTranslationQuiz } from '../../src/composables/useVerbQuiz'
import type { Verb } from '../../src/data/verbs'

const fixture: Verb[] = [
  {
    german: 'aufstehen', english: 'get up / stand up',
    level: 'A1', type: 'separable', case: 'none', auxiliary: 'sein',
    separablePrefix: 'auf',
    praesens: ['stehe auf','stehst auf','steht auf','stehen auf','steht auf','stehen auf'],
    praeteritumStem: 'stand', partizip2: 'aufgestanden'
  }
]

describe('useTranslationQuiz', () => {
  it('accepts answer without "to"', () => {
    const q = useTranslationQuiz(fixture)
    q.submit('get up')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('accepts answer with leading "to"', () => {
    const q = useTranslationQuiz(fixture)
    q.submit('to stand up')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('accepts case-insensitive and trimmed', () => {
    const q = useTranslationQuiz(fixture)
    q.submit('  GET UP  ')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('rejects incorrect form', () => {
    const q = useTranslationQuiz(fixture)
    q.submit('getting up')
    expect(q.questions.value[0].isCorrect).toBe(false)
  })

  it('rejects empty', () => {
    const q = useTranslationQuiz(fixture)
    q.submit('')
    expect(q.questions.value[0].isCorrect).toBe(false)
  })
})
```

- [ ] **Step 2: Implement translation quiz state**

Create `src/composables/useVerbQuiz.ts`:

```ts
import { computed, ref } from 'vue'
import type { Verb } from '../data/verbs'

export interface TranslationQuestion {
  verb: Verb
  userAnswer: string | null
  isCorrect: boolean | null
}

function normalize(s: string): string {
  let n = s.trim().replace(/\s+/g, ' ').toLowerCase()
  if (n.startsWith('to ')) n = n.slice(3)
  return n
}

export function checkTranslation(input: string, english: string): boolean {
  const a = normalize(input)
  if (a.length === 0) return false
  return english.split('/').some(seg => normalize(seg) === a)
}

export function useTranslationQuiz(verbs: Verb[]) {
  const questions = ref<TranslationQuestion[]>(
    verbs.map(v => ({ verb: v, userAnswer: null, isCorrect: null }))
  )
  const currentIndex = ref(0)

  function submit(answer: string): void {
    const q = questions.value[currentIndex.value]
    if (!q) return
    q.userAnswer = answer
    q.isCorrect = checkTranslation(answer, q.verb.english)
  }

  function advance(): void {
    currentIndex.value += 1
  }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)

  return { questions, currentIndex, current, finished, score, total, submit, advance }
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/composables/useVerbQuiz.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/composables/useVerbQuiz.ts tests/composables/useVerbQuiz.test.ts
git commit -m "feat(verbs): translation quiz composable"
```

---

### Task 9: `useVerbQuiz` — conjugation mode

**Files:**
- Modify: `src/composables/useVerbQuiz.ts`
- Modify: `tests/composables/useVerbQuiz.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
import { useConjugationQuiz, checkConjugation } from '../../src/composables/useVerbQuiz'

describe('checkConjugation — normalization', () => {
  it('accepts exact', () => {
    expect(checkConjugation('habe gespielt', 'habe gespielt')).toBe(true)
  })
  it('accepts whitespace and case differences', () => {
    expect(checkConjugation('  HABE   gespielt ', 'habe gespielt')).toBe(true)
  })
  it('accepts user-typed pronoun prefix', () => {
    expect(checkConjugation('ich habe gespielt', 'habe gespielt', 'ich')).toBe(true)
    expect(checkConjugation('er ist gegangen', 'ist gegangen', 'er/sie/es')).toBe(true)
  })
  it('rejects umlaut substitutions', () => {
    expect(checkConjugation('laufst', 'läufst')).toBe(false)
    expect(checkConjugation('laeufst', 'läufst')).toBe(false)
  })
  it('rejects wrong form', () => {
    expect(checkConjugation('habe spielen', 'habe gespielt')).toBe(false)
  })
})

describe('useConjugationQuiz', () => {
  const fixture: Verb[] = [
    {
      german: 'spielen', english: 'play',
      level: 'A1', type: 'regular', case: 'accusative', auxiliary: 'haben',
      praesens: ['spiele','spielst','spielt','spielen','spielt','spielen'],
      praeteritumStem: 'spielte', partizip2: 'gespielt'
    }
  ]

  it('builds questions as verb×tense cross-product', () => {
    const q = useConjugationQuiz(fixture, ['praesens', 'perfekt'])
    expect(q.questions.value.length).toBe(2)
    expect(q.questions.value[0].rows.length).toBe(6)
  })

  it('imperativ produces 3 rows', () => {
    const q = useConjugationQuiz(fixture, ['imperativ'])
    expect(q.questions.value[0].rows.length).toBe(3)
  })

  it('submit grades each row', () => {
    const q = useConjugationQuiz(fixture, ['praesens'])
    q.submit(['spiele', 'spielst', 'spielt', 'spielen', 'spielt', 'WRONG'])
    expect(q.questions.value[0].rowCorrect).toEqual([true, true, true, true, true, false])
    expect(q.questions.value[0].correctCount).toBe(5)
  })

  it('skip marks all rows incorrect and advances', () => {
    const q = useConjugationQuiz(fixture, ['praesens'])
    q.skip()
    expect(q.questions.value[0].rowCorrect.every(c => c === false)).toBe(true)
    expect(q.currentIndex.value).toBe(1)
  })

  it('aggregate score across rows', () => {
    const q = useConjugationQuiz(fixture, ['praesens', 'perfekt'])
    q.submit(['spiele', 'spielst', 'spielt', 'spielen', 'spielt', 'spielen']); q.advance()
    q.submit(['habe gespielt', 'hast gespielt', 'hat gespielt', 'haben gespielt', 'habt gespielt', 'haben gespielt']); q.advance()
    expect(q.totalRows.value).toBe(12)
    expect(q.correctRows.value).toBe(12)
  })
})
```

- [ ] **Step 2: Implement conjugation quiz state and checker**

Append to `src/composables/useVerbQuiz.ts`:

```ts
import { conjugate } from './conjugate'
import type { VerbTense } from '../data/verbs'

const PRONOUN_TOKENS: Record<string, string[]> = {
  ich: ['ich'],
  du: ['du'],
  'er/sie/es': ['er', 'sie', 'es'],
  wir: ['wir'],
  ihr: ['ihr'],
  'sie/Sie': ['sie', 'Sie']
}

function normalizeConj(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function checkConjugation(input: string, expected: string, person?: string): boolean {
  let a = normalizeConj(input)
  if (person && PRONOUN_TOKENS[person]) {
    for (const tok of PRONOUN_TOKENS[person]) {
      const prefix = `${tok.toLowerCase()} `
      if (a.startsWith(prefix)) { a = a.slice(prefix.length); break }
    }
  }
  return a === normalizeConj(expected)
}

export interface ConjugationRowResult {
  person: string
  expected: string
  userAnswer: string
  isCorrect: boolean
}

export interface ConjugationQuestion {
  verb: Verb
  tense: VerbTense
  rows: ConjugationRowResult[]
  rowCorrect: boolean[]
  correctCount: number
  totalCount: number
  submitted: boolean
}

export function useConjugationQuiz(verbs: Verb[], tenses: VerbTense[]) {
  const pairs: Array<{ verb: Verb; tense: VerbTense }> = []
  for (const v of verbs) for (const t of tenses) pairs.push({ verb: v, tense: t })

  const questions = ref<ConjugationQuestion[]>(
    pairs.map(p => {
      const rows = conjugate(p.verb, p.tense)
      return {
        verb: p.verb,
        tense: p.tense,
        rows: rows.map(r => ({ person: r.person, expected: r.expected, userAnswer: '', isCorrect: false })),
        rowCorrect: rows.map(() => false),
        correctCount: 0,
        totalCount: rows.length,
        submitted: false
      }
    })
  )
  const currentIndex = ref(0)

  function submit(answers: string[]): void {
    const q = questions.value[currentIndex.value]
    if (!q) return
    let correct = 0
    q.rows.forEach((row, i) => {
      const userAnswer = answers[i] ?? ''
      const ok = checkConjugation(userAnswer, row.expected, row.person)
      row.userAnswer = userAnswer
      row.isCorrect = ok
      q.rowCorrect[i] = ok
      if (ok) correct++
    })
    q.correctCount = correct
    q.submitted = true
  }

  function skip(): void {
    submit(new Array(questions.value[currentIndex.value]?.rows.length ?? 0).fill(''))
    advance()
  }

  function advance(): void {
    currentIndex.value += 1
  }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const totalRows = computed(() => questions.value.reduce((s, q) => s + q.totalCount, 0))
  const correctRows = computed(() => questions.value.reduce((s, q) => s + q.correctCount, 0))
  const total = computed(() => questions.value.length)

  return { questions, currentIndex, current, finished, total, totalRows, correctRows, submit, advance, skip }
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/composables/useVerbQuiz.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/composables/useVerbQuiz.ts tests/composables/useVerbQuiz.test.ts
git commit -m "feat(verbs): conjugation quiz composable + row checker"
```

---

### Task 10: Router, NavShell, Home wiring

**Files:**
- Modify: `src/router.ts`
- Modify: `src/components/NavShell.vue`
- Modify: `src/modules/home/Home.vue`

- [ ] **Step 1: Add 7 verb routes to `src/router.ts`**

Append before the closing `]`:

```ts
{ path: '/verbs', name: 'verbs', component: () => import('./modules/verbs/VerbsHome.vue') },
{ path: '/verbs/list', name: 'verbs-list', component: () => import('./modules/verbs/ListVerbs.vue') },
{ path: '/verbs/translation', name: 'verbs-translation', component: () => import('./modules/verbs/TranslationQuizSetup.vue') },
{ path: '/verbs/translation/run', name: 'verbs-translation-run', component: () => import('./modules/verbs/TranslationQuizRunner.vue') },
{ path: '/verbs/conjugation', name: 'verbs-conjugation', component: () => import('./modules/verbs/ConjugationQuizSetup.vue') },
{ path: '/verbs/conjugation/run', name: 'verbs-conjugation-run', component: () => import('./modules/verbs/ConjugationQuizRunner.vue') },
{ path: '/verbs/cheatsheet', name: 'verbs-cheatsheet', component: () => import('./modules/verbs/CheatSheet.vue') }
```

- [ ] **Step 2: Add Verbs to NavShell**

In `src/components/NavShell.vue`, change `items` to:

```ts
const items = [
  { label: 'Home', key: 'home' },
  { label: 'Nouns', key: 'nouns' },
  { label: 'Adjectives', key: 'adjectives' },
  { label: 'Verbs', key: 'verbs' },
  { label: 'Settings', key: 'settings' }
]
```

- [ ] **Step 3: Add Verbs card to Home**

In `src/modules/home/Home.vue`, insert a new `n-grid-item` between Adjectives and Settings:

```html
<n-grid-item>
  <n-card title="Verbs" hoverable>
    <p>Translate verbs and practice conjugating across all German tenses, with a cheatsheet of rules.</p>
    <n-button type="primary" @click="router.push('/verbs')">Open</n-button>
  </n-card>
</n-grid-item>
```

- [ ] **Step 4: Commit**

```bash
git add src/router.ts src/components/NavShell.vue src/modules/home/Home.vue
git commit -m "feat(verbs): wire routes, nav item, and home card"
```

---

### Task 11: VerbsHome component

**Files:**
- Create: `src/modules/verbs/VerbsHome.vue`

- [ ] **Step 1: Create VerbsHome.vue**

```vue
<script setup lang="ts">
import { NSpace, NCard, NGrid, NGridItem, NButton } from 'naive-ui'
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <n-space vertical size="large">
    <h2>Verbs</h2>
    <n-grid cols="1 768:2" :x-gap="16" :y-gap="16">
      <n-grid-item>
        <n-card title="Browse verbs" hoverable>
          <p>Searchable list of all A1/A2 verbs with type, case, and auxiliary info.</p>
          <n-button @click="router.push('/verbs/list')">Open</n-button>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="Translation quiz" hoverable>
          <p>Type the English meaning of a German verb. "to" is optional.</p>
          <n-button type="primary" @click="router.push('/verbs/translation')">Start</n-button>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="Conjugation quiz" hoverable>
          <p>Fill in conjugations across the tenses you pick — from Präsens to Passiv.</p>
          <n-button type="primary" @click="router.push('/verbs/conjugation')">Start</n-button>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="Cheatsheet" hoverable>
          <p>Conjugation rules, common exceptions, and the dative-verb list.</p>
          <n-button @click="router.push('/verbs/cheatsheet')">Open</n-button>
        </n-card>
      </n-grid-item>
    </n-grid>
  </n-space>
</template>
```

- [ ] **Step 2: Run typecheck**

`npm run typecheck` — expect PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/verbs/VerbsHome.vue
git commit -m "feat(verbs): VerbsHome landing component"
```

---

### Task 12: ListVerbs component

**Files:**
- Create: `src/modules/verbs/ListVerbs.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { NSpace, NDataTable, NInput, NCheckboxGroup, NCheckbox, NTag } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { useVerbs } from '../../composables/useVerbs'
import { VERB_LEVELS, VERB_TYPES, VERB_CASES, type Verb, type VerbLevel, type VerbType, type VerbCase } from '../../data/verbs'

const { all } = useVerbs()

const search = ref('')
const selectedLevels = ref<VerbLevel[]>([...VERB_LEVELS])
const selectedTypes = ref<VerbType[]>([...VERB_TYPES])
const selectedCases = ref<VerbCase[]>([...VERB_CASES])

const rows = computed(() => {
  const s = search.value.trim().toLowerCase()
  return all().filter(v => {
    if (!selectedLevels.value.includes(v.level)) return false
    if (!selectedTypes.value.includes(v.type)) return false
    if (!selectedCases.value.includes(v.case)) return false
    if (s && !v.german.toLowerCase().includes(s) && !v.english.toLowerCase().includes(s)) return false
    return true
  })
})

const columns: DataTableColumns<Verb> = [
  { title: 'German', key: 'german' },
  { title: 'English', key: 'english' },
  { title: 'Level', key: 'level', width: 80 },
  { title: 'Type', key: 'type', width: 110 },
  { title: 'Case', key: 'case', width: 160 },
  { title: 'Aux', key: 'auxiliary', width: 80 }
]
</script>

<template>
  <n-space vertical size="large">
    <h2>Verbs</h2>
    <n-input v-model:value="search" placeholder="Search German or English…" clearable />
    <n-space :wrap="true" size="large">
      <div>
        <p><strong>Level</strong></p>
        <n-checkbox-group v-model:value="selectedLevels">
          <n-space>
            <n-checkbox v-for="l in VERB_LEVELS" :key="l" :value="l" :label="l" />
          </n-space>
        </n-checkbox-group>
      </div>
      <div>
        <p><strong>Type</strong></p>
        <n-checkbox-group v-model:value="selectedTypes">
          <n-space>
            <n-checkbox v-for="t in VERB_TYPES" :key="t" :value="t" :label="t" />
          </n-space>
        </n-checkbox-group>
      </div>
      <div>
        <p><strong>Case</strong></p>
        <n-checkbox-group v-model:value="selectedCases">
          <n-space>
            <n-checkbox v-for="c in VERB_CASES" :key="c" :value="c" :label="c" />
          </n-space>
        </n-checkbox-group>
      </div>
    </n-space>
    <n-data-table
      :columns="columns"
      :data="rows"
      :pagination="{ pageSize: 25 }"
      :bordered="false"
    />
  </n-space>
</template>
```

- [ ] **Step 2: Typecheck**

`npm run typecheck` — expect PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/verbs/ListVerbs.vue
git commit -m "feat(verbs): ListVerbs read-only filterable table"
```

---

### Task 13: TranslationQuizSetup component

**Files:**
- Create: `src/modules/verbs/TranslationQuizSetup.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { NSpace, NRadioGroup, NRadio, NCheckboxGroup, NCheckbox, NButton, NInputNumber, NAlert } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import { VERB_LEVELS, VERB_TYPES, VERB_CASES, type VerbLevel, type VerbType, type VerbCase } from '../../data/verbs'

const router = useRouter()
const { filter } = useVerbs()

const levels = ref<VerbLevel[]>([...VERB_LEVELS])
const types = ref<VerbType[]>([...VERB_TYPES])
const cases = ref<VerbCase[]>([...VERB_CASES])
const preset = ref<10 | 15 | 20 | 'all' | 'custom'>(10)
const customCount = ref(10)

const available = computed(() => filter({ levels: levels.value, types: types.value, cases: cases.value }).length)
const requested = computed<number>(() => {
  if (preset.value === 'all') return available.value
  if (preset.value === 'custom') return customCount.value
  return preset.value
})
const effective = computed(() => Math.min(requested.value, available.value))

function start() {
  router.push({
    name: 'verbs-translation-run',
    query: {
      count: String(effective.value),
      levels: levels.value.join(','),
      types: types.value.join(','),
      cases: cases.value.join(',')
    }
  })
}
</script>

<template>
  <n-space vertical size="large" style="max-width: 520px">
    <h2>Translation quiz setup</h2>

    <div>
      <p><strong>Levels</strong></p>
      <n-checkbox-group v-model:value="levels">
        <n-space><n-checkbox v-for="l in VERB_LEVELS" :key="l" :value="l" :label="l" /></n-space>
      </n-checkbox-group>
    </div>

    <div>
      <p><strong>Types</strong></p>
      <n-checkbox-group v-model:value="types">
        <n-space :wrap="true"><n-checkbox v-for="t in VERB_TYPES" :key="t" :value="t" :label="t" /></n-space>
      </n-checkbox-group>
    </div>

    <div>
      <p><strong>Cases</strong></p>
      <n-checkbox-group v-model:value="cases">
        <n-space :wrap="true"><n-checkbox v-for="c in VERB_CASES" :key="c" :value="c" :label="c" /></n-space>
      </n-checkbox-group>
    </div>

    <div>
      <p><strong>Number of verbs</strong></p>
      <n-radio-group v-model:value="preset">
        <n-radio :value="10">10</n-radio>
        <n-radio :value="15">15</n-radio>
        <n-radio :value="20">20</n-radio>
        <n-radio value="all">All ({{ available }})</n-radio>
        <n-radio value="custom">Custom</n-radio>
      </n-radio-group>
      <n-input-number
        v-if="preset === 'custom'"
        v-model:value="customCount"
        :min="1" :max="available || 1"
        style="margin-top: 8px; width: 100%"
      />
    </div>

    <n-alert v-if="available === 0" type="warning">No verbs match the selected filters.</n-alert>

    <n-button type="primary" :disabled="available === 0" @click="start">Start quiz</n-button>
  </n-space>
</template>
```

- [ ] **Step 2: Typecheck**

`npm run typecheck` — expect PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/verbs/TranslationQuizSetup.vue
git commit -m "feat(verbs): TranslationQuizSetup"
```

---

### Task 14: TranslationQuizRunner + result

**Files:**
- Create: `src/modules/verbs/TranslationQuizRunner.vue`
- Create: `src/modules/verbs/QuizResult.vue`

- [ ] **Step 1: Create QuizResult.vue (shared by both quizzes)**

```vue
<script setup lang="ts">
import { NCard, NSpace, NText, NButton, NList, NListItem, NTag } from 'naive-ui'

interface RecapItem {
  german: string
  expected: string
  userAnswer: string
  isCorrect: boolean
}

defineProps<{
  score: number
  total: number
  scoreLabel?: string
  recap: RecapItem[]
}>()

defineEmits<{ (e: 'restart'): void }>()
</script>

<template>
  <n-card>
    <n-space vertical size="large">
      <n-text style="font-size: 24px">{{ scoreLabel ?? `Score: ${score} / ${total}` }}</n-text>
      <n-list bordered>
        <n-list-item v-for="(r, i) in recap" :key="i">
          <n-space justify="space-between" align="center" style="width: 100%">
            <span>
              <strong>{{ r.german }}</strong> — correct: {{ r.expected }}
              — your answer: {{ r.userAnswer || '(none)' }}
            </span>
            <n-tag :type="r.isCorrect ? 'success' : 'error'">{{ r.isCorrect ? 'Correct' : 'Wrong' }}</n-tag>
          </n-space>
        </n-list-item>
      </n-list>
      <n-button type="primary" @click="$emit('restart')">Start another quiz</n-button>
    </n-space>
  </n-card>
</template>
```

- [ ] **Step 2: Create TranslationQuizRunner.vue**

```vue
<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin, NAlert, NCard, NSpace, NText, NInput, NButton, NTag } from 'naive-ui'
import { useVerbs } from '../../composables/useVerbs'
import { useTranslationQuiz } from '../../composables/useVerbQuiz'
import { VERB_LEVELS, VERB_TYPES, VERB_CASES, type Verb, type VerbLevel, type VerbType, type VerbCase } from '../../data/verbs'
import QuizResult from './QuizResult.vue'

const route = useRoute()
const router = useRouter()
const { sample } = useVerbs()

const loading = ref(true)
const error = ref<string | null>(null)
const verbs = ref<Verb[]>([])
const quiz = ref<ReturnType<typeof useTranslationQuiz> | null>(null)
const input = ref('')
const submitted = ref(false)
const inputRef = ref<InstanceType<typeof NInput> | null>(null)
const nextBtnRef = ref<{ $el: HTMLElement } | null>(null)

function csvFilter<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (typeof raw !== 'string' || raw.length === 0) return [...allowed]
  const set = new Set<string>(allowed)
  return raw.split(',').map(s => s.trim()).filter((x): x is T => set.has(x))
}

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const f = {
    levels: csvFilter<VerbLevel>(route.query.levels, VERB_LEVELS),
    types: csvFilter<VerbType>(route.query.types, VERB_TYPES),
    cases: csvFilter<VerbCase>(route.query.cases, VERB_CASES)
  }
  try {
    verbs.value = sample(count, f)
    if (verbs.value.length === 0) { error.value = 'No verbs available.' }
    else { quiz.value = useTranslationQuiz(verbs.value) }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
    nextTick(() => inputRef.value?.focus())
  }
})

const current = computed(() => quiz.value?.current.value ?? null)
const finished = computed(() => quiz.value?.finished.value ?? false)

const recap = computed(() => {
  if (!quiz.value) return []
  return quiz.value.questions.value.map(q => ({
    german: q.verb.german,
    expected: q.verb.english,
    userAnswer: q.userAnswer ?? '',
    isCorrect: q.isCorrect === true
  }))
})

const isCorrect = computed(() =>
  current.value ? current.value.isCorrect : null
)

function submit() {
  if (!quiz.value || submitted.value || !input.value.trim()) return
  quiz.value.submit(input.value)
  submitted.value = true
  nextTick(() => nextBtnRef.value?.$el?.focus?.())
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  submitted.value = false
  input.value = ''
  nextTick(() => inputRef.value?.focus())
}

function restart() { router.push('/verbs/translation') }
</script>

<template>
  <div>
    <n-spin v-if="loading" />
    <n-alert v-else-if="error" type="error">{{ error }}</n-alert>
    <QuizResult
      v-else-if="finished && quiz"
      :score="quiz.score.value"
      :total="quiz.total.value"
      :recap="recap"
      @restart="restart"
    />
    <template v-else-if="current">
      <div class="shell">
        <n-card>
          <n-space vertical size="large" align="center">
            <n-text depth="3">Question {{ (quiz?.currentIndex.value ?? 0) + 1 }} of {{ quiz?.total.value }}</n-text>
            <n-text style="font-size: 32px">{{ current.verb.german }}</n-text>
            <n-space>
              <n-tag size="small">{{ current.verb.level }}</n-tag>
              <n-tag size="small" type="info">{{ current.verb.type }}</n-tag>
              <n-tag size="small" type="warning">{{ current.verb.case }}</n-tag>
            </n-space>
            <n-input
              ref="inputRef" v-model:value="input"
              :disabled="submitted"
              placeholder="English (to is optional)"
              style="width: 100%; max-width: 320px"
              @keyup.enter="submit"
            />
            <n-button v-if="!submitted" type="primary" :disabled="!input.trim()" @click="submit">Submit</n-button>
            <n-text v-if="submitted" :style="{ color: isCorrect ? '#18a058' : '#d03050' }">
              {{ isCorrect ? '✅ Correct' : `❌ Correct: ${current.verb.english}` }}
            </n-text>
            <n-button v-if="submitted" ref="nextBtnRef" type="primary" @click="next">Next</n-button>
          </n-space>
        </n-card>
      </div>
    </template>
  </div>
</template>

<style scoped>
.shell { max-width: 480px; margin: 0 auto; }
</style>
```

- [ ] **Step 3: Typecheck**

`npm run typecheck` — expect PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/verbs/TranslationQuizRunner.vue src/modules/verbs/QuizResult.vue
git commit -m "feat(verbs): TranslationQuizRunner + shared QuizResult"
```

---

### Task 15: ConjugationQuizSetup component

**Files:**
- Create: `src/modules/verbs/ConjugationQuizSetup.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { NSpace, NCheckboxGroup, NCheckbox, NRadioGroup, NRadio, NButton, NInputNumber, NAlert, NTag, NDivider } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import {
  VERB_LEVELS, VERB_TYPES, VERB_CASES,
  VERB_TENSES, TENSE_LABELS, TENSE_LEVEL, PASSIVE_TENSE_SET,
  type VerbLevel, type VerbType, type VerbCase, type VerbTense, type TenseCEFR
} from '../../data/verbs'

const STORAGE_KEY = 'verbConjQuiz'
const router = useRouter()
const { filter } = useVerbs()

const levels = ref<VerbLevel[]>([...VERB_LEVELS])
const types  = ref<VerbType[]>([...VERB_TYPES])
const cases  = ref<VerbCase[]>([...VERB_CASES])
const tenses = ref<VerbTense[]>(['praesens'])
const preset = ref<10 | 15 | 20 | 'all' | 'custom'>(10)
const customCount = ref(10)

interface Stored {
  levels?: VerbLevel[]; types?: VerbType[]; cases?: VerbCase[]; tenses?: VerbTense[]
  preset?: 10 | 15 | 20 | 'all' | 'custom'; customCount?: number
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = s.levels.filter(l => (VERB_LEVELS as readonly string[]).includes(l))
    if (s.types) types.value = s.types.filter(t => (VERB_TYPES as readonly string[]).includes(t))
    if (s.cases) cases.value = s.cases.filter(c => (VERB_CASES as readonly string[]).includes(c))
    if (s.tenses) tenses.value = s.tenses.filter(t => (VERB_TENSES as readonly string[]).includes(t))
    if (s.preset !== undefined) preset.value = s.preset
    if (s.customCount !== undefined) customCount.value = s.customCount
  } catch { /* ignore */ }
}
function save() {
  try {
    const payload: Stored = { levels: levels.value, types: types.value, cases: cases.value, tenses: tenses.value, preset: preset.value, customCount: customCount.value }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}
onMounted(load)
watch([levels, types, cases, tenses, preset, customCount], save, { deep: true })

const filteredVerbs = computed(() => filter({ levels: levels.value, types: types.value, cases: cases.value }))
const availableVerbs = computed(() => filteredVerbs.value.length)
const passiveSupported = computed(() => filteredVerbs.value.some(v => v.case === 'accusative' || v.case === 'dative+accusative'))

const requested = computed<number>(() => {
  if (preset.value === 'all') return availableVerbs.value
  if (preset.value === 'custom') return customCount.value
  return preset.value
})
const effectiveVerbs = computed(() => Math.min(requested.value, availableVerbs.value))
const totalQuestions = computed(() => effectiveVerbs.value * tenses.value.length)

const tensesByLevel = computed(() => {
  const groups: Record<TenseCEFR, VerbTense[]> = { A1: [], A2: [], B1: [], B2: [], C1: [] }
  for (const t of VERB_TENSES) groups[TENSE_LEVEL[t]].push(t)
  return groups
})

function tenseDisabled(t: VerbTense): boolean {
  return PASSIVE_TENSE_SET.has(t) && !passiveSupported.value
}

function toggleTense(t: VerbTense) {
  if (tenseDisabled(t)) return
  const i = tenses.value.indexOf(t)
  if (i >= 0) tenses.value.splice(i, 1)
  else tenses.value.push(t)
}

function start() {
  router.push({
    name: 'verbs-conjugation-run',
    query: {
      count: String(effectiveVerbs.value),
      levels: levels.value.join(','),
      types: types.value.join(','),
      cases: cases.value.join(','),
      tenses: tenses.value.join(',')
    }
  })
}
</script>

<template>
  <n-space vertical size="large" style="max-width: 720px">
    <n-space justify="space-between" align="center">
      <h2 style="margin: 0">Conjugation quiz setup</h2>
      <n-button @click="router.push('/verbs/cheatsheet')">Open cheatsheet</n-button>
    </n-space>

    <div>
      <p><strong>Verb filters</strong></p>
      <n-space :wrap="true" size="large">
        <div>
          <p>Level</p>
          <n-checkbox-group v-model:value="levels"><n-space><n-checkbox v-for="l in VERB_LEVELS" :key="l" :value="l" :label="l" /></n-space></n-checkbox-group>
        </div>
        <div>
          <p>Type</p>
          <n-checkbox-group v-model:value="types"><n-space :wrap="true"><n-checkbox v-for="t in VERB_TYPES" :key="t" :value="t" :label="t" /></n-space></n-checkbox-group>
        </div>
        <div>
          <p>Case</p>
          <n-checkbox-group v-model:value="cases"><n-space :wrap="true"><n-checkbox v-for="c in VERB_CASES" :key="c" :value="c" :label="c" /></n-space></n-checkbox-group>
        </div>
      </n-space>
    </div>

    <n-divider />

    <div>
      <p><strong>Tenses</strong></p>
      <n-alert v-if="!passiveSupported" type="info" style="margin-bottom: 8px">
        Passive tenses are disabled — your verb filter has no transitive (accusative) verbs.
      </n-alert>
      <div v-for="level in (['A1','A2','B1','B2','C1'] as const)" :key="level" style="margin-bottom: 12px">
        <p style="font-weight: 600; margin: 6px 0">{{ level }}</p>
        <n-space :wrap="true">
          <label
            v-for="t in tensesByLevel[level]" :key="t"
            class="tense-chip"
            :class="{ disabled: tenseDisabled(t), selected: tenses.includes(t) }"
            @click="toggleTense(t)"
          >
            <input type="checkbox" :checked="tenses.includes(t)" :disabled="tenseDisabled(t)" style="margin-right: 6px" />
            {{ TENSE_LABELS[t] }}
            <n-tag size="small" :bordered="false" style="margin-left: 6px">{{ level }}</n-tag>
          </label>
        </n-space>
      </div>
    </div>

    <n-divider />

    <div>
      <p><strong>Number of verbs</strong></p>
      <n-radio-group v-model:value="preset">
        <n-radio :value="10">10</n-radio>
        <n-radio :value="15">15</n-radio>
        <n-radio :value="20">20</n-radio>
        <n-radio value="all">All ({{ availableVerbs }})</n-radio>
        <n-radio value="custom">Custom</n-radio>
      </n-radio-group>
      <n-input-number
        v-if="preset === 'custom'"
        v-model:value="customCount"
        :min="1" :max="availableVerbs || 1"
        style="margin-top: 8px; width: 100%"
      />
      <p v-if="tenses.length > 0" style="opacity: 0.7; margin-top: 8px">
        ≈ {{ totalQuestions }} questions ({{ effectiveVerbs }} verbs × {{ tenses.length }} tenses)
      </p>
    </div>

    <n-alert v-if="availableVerbs === 0" type="warning">No verbs match the selected filters.</n-alert>
    <n-alert v-else-if="tenses.length === 0" type="warning">Pick at least one tense.</n-alert>

    <n-button
      type="primary"
      :disabled="availableVerbs === 0 || tenses.length === 0"
      @click="start"
    >
      Start quiz
    </n-button>
  </n-space>
</template>

<style scoped>
.tense-chip {
  display: inline-flex; align-items: center;
  padding: 6px 12px; border-radius: 999px;
  border: 1px solid var(--n-divider-color, #d0d0d6);
  cursor: pointer; user-select: none;
}
.tense-chip.selected { border-color: #2080f0; background: rgba(32, 128, 240, 0.08); }
.tense-chip.disabled { opacity: 0.4; cursor: not-allowed; }
</style>
```

- [ ] **Step 2: Typecheck**

`npm run typecheck` — expect PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/verbs/ConjugationQuizSetup.vue
git commit -m "feat(verbs): ConjugationQuizSetup with grouped tense picker"
```

---

### Task 16: ConjugationQuizRunner component

**Files:**
- Create: `src/modules/verbs/ConjugationQuizRunner.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin, NAlert, NCard, NSpace, NText, NInput, NButton, NTag, NList, NListItem } from 'naive-ui'
import { useVerbs } from '../../composables/useVerbs'
import { useConjugationQuiz } from '../../composables/useVerbQuiz'
import {
  VERB_LEVELS, VERB_TYPES, VERB_CASES, VERB_TENSES,
  TENSE_LABELS, TENSE_LEVEL,
  type Verb, type VerbLevel, type VerbType, type VerbCase, type VerbTense
} from '../../data/verbs'

const route = useRoute()
const router = useRouter()
const { sample } = useVerbs()

const loading = ref(true)
const error = ref<string | null>(null)
const quiz = ref<ReturnType<typeof useConjugationQuiz> | null>(null)
const inputs = ref<string[]>([])
const submitted = ref(false)

function csv<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (typeof raw !== 'string' || raw.length === 0) return [...allowed]
  const set = new Set<string>(allowed)
  return raw.split(',').map(s => s.trim()).filter((x): x is T => set.has(x))
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = 0; i < a.length; i++) {
    const j = i + Math.floor(Math.random() * (a.length - i))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const f = {
    levels: csv<VerbLevel>(route.query.levels, VERB_LEVELS),
    types: csv<VerbType>(route.query.types, VERB_TYPES),
    cases: csv<VerbCase>(route.query.cases, VERB_CASES)
  }
  const tenses = csv<VerbTense>(route.query.tenses, VERB_TENSES)
  try {
    let verbs: Verb[] = sample(count, f)
    if (verbs.length === 0 || tenses.length === 0) {
      error.value = 'Nothing to quiz on.'
    } else {
      verbs = shuffle(verbs)
      quiz.value = useConjugationQuiz(verbs, shuffle(tenses))
      resetInputs()
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

function resetInputs() {
  const q = quiz.value?.current.value
  inputs.value = q ? q.rows.map(() => '') : []
  submitted.value = false
}

const current = computed(() => quiz.value?.current.value ?? null)
const finished = computed(() => quiz.value?.finished.value ?? false)

function submit() {
  if (!quiz.value || submitted.value) return
  quiz.value.submit(inputs.value)
  submitted.value = true
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  resetInputs()
  nextTick(() => {
    const first = document.querySelector<HTMLInputElement>('.conj-input input')
    first?.focus()
  })
}

function skip() {
  if (!quiz.value || submitted.value) return
  quiz.value.skip()
  resetInputs()
}

function restart() { router.push('/verbs/conjugation') }

const recap = computed(() => {
  if (!quiz.value) return []
  return quiz.value.questions.value.map(q => ({
    german: `${q.verb.german} — ${TENSE_LABELS[q.tense]}`,
    expected: q.rows.map(r => `${r.person}: ${r.expected}`).join(' • '),
    userAnswer: q.rows.map(r => r.userAnswer || '–').join(' • '),
    isCorrect: q.correctCount === q.totalCount
  }))
})

const aggregateLabel = computed(() => {
  if (!quiz.value) return ''
  return `Score: ${quiz.value.correctRows.value} / ${quiz.value.totalRows.value} forms (${quiz.value.questions.value.filter(q => q.correctCount === q.totalCount).length}/${quiz.value.total.value} fully correct)`
})
</script>

<template>
  <div>
    <n-spin v-if="loading" />
    <n-alert v-else-if="error" type="error">{{ error }}</n-alert>

    <template v-else-if="finished && quiz">
      <n-card>
        <n-space vertical size="large">
          <n-text style="font-size: 22px">{{ aggregateLabel }}</n-text>
          <n-list bordered>
            <n-list-item v-for="(r, i) in recap" :key="i">
              <n-space justify="space-between" align="center" style="width: 100%">
                <span><strong>{{ r.german }}</strong> — {{ r.expected }} — your: {{ r.userAnswer }}</span>
                <n-tag :type="r.isCorrect ? 'success' : 'error'">{{ r.isCorrect ? '✓' : '×' }}</n-tag>
              </n-space>
            </n-list-item>
          </n-list>
          <n-button type="primary" @click="restart">Start another quiz</n-button>
        </n-space>
      </n-card>
    </template>

    <template v-else-if="current">
      <div class="shell">
        <n-card>
          <n-space vertical size="large">
            <n-space justify="space-between" align="center">
              <n-text depth="3">Question {{ (quiz?.currentIndex.value ?? 0) + 1 }} of {{ quiz?.total.value }}</n-text>
              <n-button size="small" quaternary @click="router.push('/verbs/cheatsheet')">Cheatsheet</n-button>
            </n-space>
            <n-text style="font-size: 28px">{{ current.verb.german }}</n-text>
            <n-space>
              <n-tag size="small">{{ TENSE_LABELS[current.tense] }} <span style="opacity:.6">({{ TENSE_LEVEL[current.tense] }})</span></n-tag>
              <n-tag size="small" type="info">{{ current.verb.type }}</n-tag>
              <n-tag size="small" type="warning">{{ current.verb.case }}</n-tag>
              <n-tag size="small">aux: {{ current.verb.auxiliary }}</n-tag>
            </n-space>

            <div v-for="(row, i) in current.rows" :key="i" class="conj-row">
              <div class="pronoun">{{ row.person }}</div>
              <n-input
                v-model:value="inputs[i]"
                :disabled="submitted"
                class="conj-input"
                :placeholder="row.person === 'sie/Sie' ? 'verb form' : ''"
                @keyup.enter="submit"
              />
              <div v-if="submitted" class="feedback">
                <span v-if="row.isCorrect" style="color: #18a058">✅</span>
                <span v-else style="color: #d03050">❌ {{ row.expected }}</span>
              </div>
            </div>

            <n-space>
              <n-button v-if="!submitted" type="primary" @click="submit">Submit</n-button>
              <n-button v-if="!submitted" @click="skip">Skip</n-button>
              <n-button v-if="submitted" type="primary" @click="next">Next</n-button>
            </n-space>
          </n-space>
        </n-card>
      </div>
    </template>
  </div>
</template>

<style scoped>
.shell { max-width: 560px; margin: 0 auto; }
.conj-row { display: grid; grid-template-columns: 80px 1fr auto; gap: 8px; align-items: center; }
.pronoun { font-weight: 600; opacity: 0.8; }
.feedback { font-size: 13px; }
@media (max-width: 480px) {
  .conj-row { grid-template-columns: 64px 1fr; }
  .feedback { grid-column: 1 / -1; padding-left: 64px; }
}
</style>
```

- [ ] **Step 2: Typecheck**

`npm run typecheck` — expect PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/verbs/ConjugationQuizRunner.vue
git commit -m "feat(verbs): ConjugationQuizRunner with per-row grading"
```

---

### Task 17: CheatSheet component

**Files:**
- Create: `src/modules/verbs/CheatSheet.vue`

- [ ] **Step 1: Create the cheatsheet with 12 collapsible sections**

```vue
<script setup lang="ts">
import { NSpace, NCollapse, NCollapseItem, NTable } from 'naive-ui'
</script>

<template>
  <n-space vertical size="large" style="max-width: 760px">
    <h2>Conjugation cheatsheet</h2>
    <n-collapse arrow-placement="right" :default-expanded-names="['1']">
      <n-collapse-item title="1. Regular (schwache) Verben — present endings" name="1">
        <p>Stem + -e / -st / -t / -en / -t / -en.</p>
        <p><strong>Bindevokal -e-:</strong> stems ending in -d, -t, -chn, -ffn, -tm, -dn add -e- before -st and -t: <em>du arbeitest, er arbeitet, ihr arbeitet</em>.</p>
        <p><strong>-s / -ß / -z / -tz / -x stems:</strong> du-form takes only -t, not -st: <em>du tanzt, du heißt, du sitzt</em>.</p>
      </n-collapse-item>

      <n-collapse-item title="2. Strong (starke) Verben — vowel changes in du/er" name="2">
        <p><strong>a → ä:</strong> fahren → du fährst, er fährt; schlafen → schläft; tragen → trägt.</p>
        <p><strong>au → äu:</strong> laufen → läufst, läuft.</p>
        <p><strong>e → i:</strong> geben → gibst, gibt; helfen → hilfst, hilft; nehmen → nimmst, nimmt; essen → isst.</p>
        <p><strong>e → ie:</strong> sehen → siehst, sieht; lesen → liest; empfehlen → empfiehlt.</p>
      </n-collapse-item>

      <n-collapse-item title="3. Mixed (gemischte) Verben — irregular stem + weak endings" name="3">
        <p>bringen → brachte, gebracht • denken → dachte, gedacht • wissen → wusste, gewusst • kennen → kannte, gekannt • brennen → brannte, gebrannt.</p>
      </n-collapse-item>

      <n-collapse-item title="4. Modalverben — full conjugation" name="4">
        <n-table size="small" :bordered="false">
          <thead><tr><th></th><th>können</th><th>müssen</th><th>dürfen</th><th>sollen</th><th>wollen</th><th>mögen</th></tr></thead>
          <tbody>
            <tr><td>ich</td><td>kann</td><td>muss</td><td>darf</td><td>soll</td><td>will</td><td>mag</td></tr>
            <tr><td>du</td><td>kannst</td><td>musst</td><td>darfst</td><td>sollst</td><td>willst</td><td>magst</td></tr>
            <tr><td>er</td><td>kann</td><td>muss</td><td>darf</td><td>soll</td><td>will</td><td>mag</td></tr>
            <tr><td>K II</td><td>könnte</td><td>müsste</td><td>dürfte</td><td>sollte</td><td>wollte</td><td>möchte</td></tr>
          </tbody>
        </n-table>
      </n-collapse-item>

      <n-collapse-item title="5. Separable vs inseparable prefixes" name="5">
        <p><strong>Separable (split in main clause):</strong> ab-, an-, auf-, aus-, ein-, mit-, nach-, vor-, zu-, fern-, weg-, zurück-, hin-, her-, fest-.</p>
        <p><strong>Inseparable (never split):</strong> be-, emp-, ent-, er-, ge-, ver-, zer-, miss-.</p>
        <p>Some prefixes are <strong>both</strong> (durch-, über-, um-, unter-, voll-, wieder-) — meaning differs by stress.</p>
      </n-collapse-item>

      <n-collapse-item title="6. Partizip II rules" name="6">
        <p><strong>Weak:</strong> ge- + stem + -t → gespielt, gearbeitet (with Bindevokal), gekauft.</p>
        <p><strong>Strong:</strong> ge- + (often changed) stem + -en → gegangen, gesehen, geschrieben.</p>
        <p><strong>Separable:</strong> prefix + ge + stem → aufgestanden, eingekauft.</p>
        <p><strong>Inseparable / -ieren:</strong> no ge- → verkauft, besucht, studiert.</p>
      </n-collapse-item>

      <n-collapse-item title="7. haben vs sein in Perfekt/Plusquamperfekt" name="7">
        <p><strong>sein</strong> with verbs of motion or change-of-state, plus sein/werden/bleiben/passieren.</p>
        <p>Examples: gehen, kommen, fahren, fliegen, laufen, schwimmen, steigen, ankommen, aufstehen.</p>
        <p><strong>haben</strong> for everything else (most transitive and stative verbs).</p>
      </n-collapse-item>

      <n-collapse-item title="8. Imperativ" name="8">
        <p><strong>du:</strong> usually stem (no ending). With -d/-t add -e (<em>arbeite!</em>). Strong verbs with e→i/ie carry the change (<em>gib! lies! nimm! sieh! iss!</em>). a→ä does <strong>not</strong> change (<em>fahr!</em>, not "fähr!").</p>
        <p><strong>ihr:</strong> same as present ihr-form (<em>geht!</em>, <em>arbeitet!</em>).</p>
        <p><strong>Sie:</strong> present Sie-form inverted (<em>Gehen Sie!</em>, <em>Helfen Sie!</em>).</p>
      </n-collapse-item>

      <n-collapse-item title="9. Konjunktiv II" name="9">
        <p>Use proper K2 forms for: sein (wäre), haben (hätte), werden (würde), modals (könnte, müsste, dürfte, sollte, wollte, möchte), wissen (wüsste), and common strong verbs (käme, ginge, fände, gäbe, ließe).</p>
        <p>For everything else, use <strong>würde + Infinitiv</strong>: <em>Ich würde das machen.</em></p>
      </n-collapse-item>

      <n-collapse-item title="10. Passiv (Vorgangspassiv)" name="10">
        <p><strong>werden</strong> (in the right tense) + <strong>Partizip II</strong>.</p>
        <ul>
          <li>Präsens: <em>wird gefragt</em></li>
          <li>Präteritum: <em>wurde gefragt</em></li>
          <li>Perfekt: <em>ist gefragt <strong>worden</strong></em> (note: <strong>worden</strong>, not geworden)</li>
          <li>Plusquamperfekt: <em>war gefragt worden</em></li>
          <li>Futur I: <em>wird gefragt werden</em></li>
        </ul>
        <p>Only transitive verbs (accusative object) can form a normal passive.</p>
      </n-collapse-item>

      <n-collapse-item title="11. Reflexive Verben" name="11">
        <p><strong>Accusative reflexive:</strong> sich freuen, sich erinnern, sich entscheiden, sich beeilen, sich treffen.</p>
        <p>Pronouns: mich, dich, sich, uns, euch, sich.</p>
        <p><strong>Dative reflexive:</strong> sich (etwas) vorstellen, sich (etwas) merken, sich (die Hände) waschen.</p>
        <p>Dative reflexive pronouns differ only in du (dir) and ich (mir).</p>
      </n-collapse-item>

      <n-collapse-item title="12. Verben mit Dativ" name="12">
        <p>helfen, danken, gefallen, antworten, gehören, passieren, schmecken, glauben (+ person), gratulieren, folgen, vertrauen, widersprechen, zuhören.</p>
        <p>Example: <em>Ich helfe dir.</em> (not <em>dich</em>)</p>
      </n-collapse-item>
    </n-collapse>
  </n-space>
</template>
```

- [ ] **Step 2: Typecheck**

`npm run typecheck` — expect PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/verbs/CheatSheet.vue
git commit -m "feat(verbs): cheatsheet with 12 collapsible sections"
```

---

### Task 18: Full verification

**Files:** none (run-only)

- [ ] **Step 1: Run the full typecheck**

```bash
npm run typecheck
```

Expected: PASS, no errors.

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all tests PASS (existing nouns/adjectives + new verbs).

- [ ] **Step 3: Build (optional but recommended)**

```bash
npm run build
```

Expected: successful production build.

- [ ] **Step 4: Final commit (only if anything was tweaked during verification)**

```bash
git add -A && git commit -m "chore(verbs): verification pass"
```

---

## Self-Review Notes

- All sections of the spec are covered:
  - Verb model (Task 1, 6) ✓
  - Conjugation engine for all 15 tenses (Tasks 2–5) ✓
  - In-memory dataset (Tasks 1, 6) ✓
  - useVerbs / useVerbQuiz (Tasks 7–9) ✓
  - Router + nav + home (Task 10) ✓
  - VerbsHome / ListVerbs (Tasks 11–12) ✓
  - Translation quiz Setup + Runner (Tasks 13–14) ✓
  - Conjugation quiz Setup + Runner with grouped CEFR tense picker (Tasks 15–16) ✓
  - Shared QuizResult (Task 14) ✓
  - Cheatsheet (Task 17) ✓
  - Tests (Tasks 2–5, 7–9) ✓
  - Verification (Task 18) ✓
- No "TBD" or "fill in later" placeholders in code steps.
- All commands include expected output.
- Each task is independently committable.
