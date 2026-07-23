# Phase 1 — Da-Compounds Module Scaffold + Cheatsheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Da-Compounds module exists as a navigable top-level module (routes, nav tab, home-grid card, section-headed module home) with a complete, data-driven cheatsheet — Phase 1 of the da-compounds roadmap (spec §7).

**Architecture:** A new data module `src/data/daCompounds.ts` holds the formation transform (da/dar + wo/wor before vowels), the compound table with glosses, the no-compound trap list, the things-vs-people example pairs, and the Korrelat verb lists. The cheatsheet view is data-driven and reuses the existing cheatsheet chrome (`ChapterNav`, `Callout`, `cheatsheet.css`) exactly like `PrepositionCheatsheet.vue`. The module home renders cards grouped under section headings (the pattern later phases will fill with ~20 drill cards); Phase 1 ships one section (Reference) with one card (Cheatsheet).

**Tech Stack:** Vue 3 `<script setup lang="ts">`, vue-router 4 (flat route table, lazy imports), Vitest + @vue/test-utils (jsdom, memory-history routers), vue-tsc.

## Global Constraints

- Work on branch `feat/phase1-dacompounds-scaffold` off `main`; merge back in the final controller step.
- **Route names are hyphen-free**: `dacompounds` (home) and `dacompounds-cheatsheet` — because `NavShell.vue:33` derives the active nav tab via `name.split('-')[0]` ('da-compounds' would yield 'da' and never highlight). Route *paths* keep the hyphen: `/da-compounds`, `/da-compounds/cheatsheet`.
- Canonical terminology (CONTEXT.md): **Da-compound** (German subtitle *Pronominaladverbien*), **Wo-compound**. Never "Präpositionaladverb" in UI copy.
- German content correctness is a shipping gate: a wrong compound or Korrelat example teaches wrong German — copy the plan's content verbatim; do not improvise new German sentences.
- Phone-first: every new page must render cleanly at ~390px (formation table scrolls inside its own wrapper, never the page body).
- Full gates before merge: `npm run test` green, `npm run typecheck` green. Never touch dist/ (a stale dist/index.html diff is pre-existing).
- Commit after every task; end commit messages with:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: Da-compound data module

**Files:**
- Create: `src/data/daCompounds.ts`
- Test: `tests/data/daCompounds.test.ts`

**Interfaces:**
- Consumes: `COLLOCATIONS` from `src/data/collocations.ts` (test-side integration invariant only — the data module itself imports nothing).
- Produces (Tasks 2–3 rely on these exact names): `daCompound(prep: string): string`, `woCompound(prep: string): string`, `isVowelInitial(prep: string): boolean`, `canFormCompound(prep: string): boolean`, `DA_COMPOUND_PREPOSITIONS: DaCompoundEntry[]` (`{ preposition, gloss }`), `NO_COMPOUND_PREPOSITIONS: readonly string[]`, `THING_VS_PERSON: ReferencePair[]` (`{ base, thingQ, thingA, personQ, personA }`), `KORRELAT: { obligatory: KorrelatEntry[]; optional: KorrelatEntry[]; excluded: KorrelatEntry[] }` (`{ expression, example }`).

- [ ] **Step 1: Write the failing test**

Create `tests/data/daCompounds.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  daCompound, woCompound, isVowelInitial, canFormCompound,
  DA_COMPOUND_PREPOSITIONS, NO_COMPOUND_PREPOSITIONS,
  THING_VS_PERSON, KORRELAT,
} from '../../src/data/daCompounds'
import { COLLOCATIONS } from '../../src/data/collocations'

describe('formation transform', () => {
  test('da- before consonant-initial prepositions', () => {
    expect(daCompound('für')).toBe('dafür')
    expect(daCompound('mit')).toBe('damit')
    expect(daCompound('von')).toBe('davon')
    expect(daCompound('zu')).toBe('dazu')
  })

  test('dar- before vowel-initial prepositions (incl. umlauts)', () => {
    expect(daCompound('an')).toBe('daran')
    expect(daCompound('auf')).toBe('darauf')
    expect(daCompound('über')).toBe('darüber')
    expect(daCompound('in')).toBe('darin')
    expect(daCompound('um')).toBe('darum')
    expect(daCompound('aus')).toBe('daraus')
    expect(daCompound('unter')).toBe('darunter')
  })

  test('wo-/wor- mirrors the same rule', () => {
    expect(woCompound('für')).toBe('wofür')
    expect(woCompound('nach')).toBe('wonach')
    expect(woCompound('an')).toBe('woran')
    expect(woCompound('auf')).toBe('worauf')
    expect(woCompound('über')).toBe('worüber')
  })

  test('isVowelInitial counts umlauts as vowels', () => {
    expect(isVowelInitial('über')).toBe(true)
    expect(isVowelInitial('an')).toBe(true)
    expect(isVowelInitial('für')).toBe(false)
  })
})

describe('compound table', () => {
  test('no duplicate prepositions', () => {
    const preps = DA_COMPOUND_PREPOSITIONS.map(e => e.preposition)
    expect(new Set(preps).size).toBe(preps.length)
  })

  test('every entry can form a compound and has a gloss', () => {
    const offenders = DA_COMPOUND_PREPOSITIONS.filter(
      e => !canFormCompound(e.preposition) || e.gloss.trim().length === 0
    )
    expect(offenders).toEqual([])
  })

  test('table and trap list are disjoint', () => {
    const table = new Set(DA_COMPOUND_PREPOSITIONS.map(e => e.preposition))
    expect(NO_COMPOUND_PREPOSITIONS.filter(p => table.has(p))).toEqual([])
  })

  test('no-compound prepositions refuse the transform', () => {
    for (const p of NO_COMPOUND_PREPOSITIONS) expect(canFormCompound(p)).toBe(false)
  })

  test('every primary collocation preposition is compoundable (data-drift guard)', () => {
    const primaries = Array.from(new Set(COLLOCATIONS.map(c => c.preposition)))
    const table = new Set(DA_COMPOUND_PREPOSITIONS.map(e => e.preposition))
    expect(primaries.filter(p => !table.has(p))).toEqual([])
  })
})

describe('cheatsheet content', () => {
  test('things-vs-people pairs: thing answer uses a da-compound, person answer does not', () => {
    expect(THING_VS_PERSON.length).toBeGreaterThanOrEqual(3)
    for (const pair of THING_VS_PERSON) {
      expect(pair.thingA).toMatch(/\bda(r)?(an|auf|aus|bei|durch|für|gegen|hinter|in|mit|nach|neben|über|um|unter|von|vor|zu|zwischen)\b/i)
      expect(pair.personA).not.toMatch(/\bda(r)?(an|auf|über|von|mit|für|um|nach|zu)\w*\b/i)
    }
  })

  test('Korrelat lists are populated and examples are non-empty', () => {
    expect(KORRELAT.obligatory.length).toBeGreaterThanOrEqual(4)
    expect(KORRELAT.optional.length).toBeGreaterThanOrEqual(4)
    expect(KORRELAT.excluded.length).toBeGreaterThanOrEqual(3)
    for (const list of [KORRELAT.obligatory, KORRELAT.optional, KORRELAT.excluded])
      for (const e of list) {
        expect(e.expression.trim().length).toBeGreaterThan(0)
        expect(e.example.trim().length).toBeGreaterThan(0)
      }
  })

  test('every obligatory Korrelat example actually contains a da-compound', () => {
    for (const e of KORRELAT.obligatory) expect(e.example).toMatch(/\bda(r)?\w+/)
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run tests/data/daCompounds.test.ts`
Expected: FAIL — cannot resolve `../../src/data/daCompounds`.

- [ ] **Step 3: Implement**

Create `src/data/daCompounds.ts` with EXACTLY this content (German sentences verbatim — do not rephrase):

```ts
// Da-compounds (Pronominaladverbien) — formation rules + cheatsheet content.
// A Da-compound stands in for preposition + pronoun when the referent is a thing,
// an abstract, or a whole clause — never a person (see CONTEXT.md: Da-compound).
// Drill data for later phases derives da/wo forms from collocations.ts via these
// transforms; nothing here duplicates the collocation dataset.

export interface DaCompoundEntry {
  preposition: string // the governed preposition, e.g. 'auf'
  gloss: string       // short English sense of the da-form
}

export interface ReferencePair {
  base: string    // the governing expression, e.g. 'warten auf'
  thingQ: string  // sentence with a thing object
  thingA: string  // its da-compound replacement
  personQ: string // sentence with a person object
  personA: string // its preposition + pronoun replacement
}

export interface KorrelatEntry {
  expression: string // pattern, e.g. 'bestehen darauf, dass'
  example: string    // one German example sentence
}

const VOWEL_INITIAL = /^[aeiouäöü]/i

export function isVowelInitial(preposition: string): boolean {
  return VOWEL_INITIAL.test(preposition)
}

/** darauf / dafür — the linking -r- appears before a vowel. */
export function daCompound(preposition: string): string {
  return (isVowelInitial(preposition) ? 'dar' : 'da') + preposition
}

/** worauf / wofür — the interrogative counterpart, same rule. */
export function woCompound(preposition: string): string {
  return (isVowelInitial(preposition) ? 'wor' : 'wo') + preposition
}

/** Prepositions that form NO da-/wo-compound — trap material for drills. */
export const NO_COMPOUND_PREPOSITIONS = [
  'ohne', 'seit', 'außer', 'gegenüber', 'während', 'wegen', 'trotz', 'statt',
] as const

export function canFormCompound(preposition: string): boolean {
  return !(NO_COMPOUND_PREPOSITIONS as readonly string[]).includes(preposition)
}

/** The standard compoundable prepositions, with a short sense for the table. */
export const DA_COMPOUND_PREPOSITIONS: DaCompoundEntry[] = [
  { preposition: 'an',       gloss: 'at / on it — thinking of it' },
  { preposition: 'auf',      gloss: 'on it — awaiting or counting on it' },
  { preposition: 'aus',      gloss: 'out of it — made from it' },
  { preposition: 'bei',      gloss: 'with it — in the process of it' },
  { preposition: 'durch',    gloss: 'through it — thereby' },
  { preposition: 'für',      gloss: 'for it — in favour of it' },
  { preposition: 'gegen',    gloss: 'against it' },
  { preposition: 'hinter',   gloss: 'behind it' },
  { preposition: 'in',       gloss: 'in it — inside it' },
  { preposition: 'mit',      gloss: 'with it' },
  { preposition: 'nach',     gloss: 'after it — seeking it' },
  { preposition: 'neben',    gloss: 'next to it' },
  { preposition: 'über',     gloss: 'about it — above it' },
  { preposition: 'um',       gloss: 'around it — asking for it' },
  { preposition: 'unter',    gloss: 'under it — among them' },
  { preposition: 'von',      gloss: 'of / from it' },
  { preposition: 'vor',      gloss: 'before it — afraid of it' },
  { preposition: 'zu',       gloss: 'to it — in addition to it' },
  { preposition: 'zwischen', gloss: 'between them' },
]

/** Same object, thing vs person — the signature rule of the topic. */
export const THING_VS_PERSON: ReferencePair[] = [
  {
    base: 'warten auf',
    thingQ: 'Ich warte auf den Bus.',
    thingA: 'Ich warte darauf.',
    personQ: 'Ich warte auf meinen Bruder.',
    personA: 'Ich warte auf ihn.',
  },
  {
    base: 'denken an',
    thingQ: 'Sie denkt an die Prüfung.',
    thingA: 'Sie denkt daran.',
    personQ: 'Sie denkt an ihren Freund.',
    personA: 'Sie denkt an ihn.',
  },
  {
    base: 'sprechen über',
    thingQ: 'Wir sprechen über das Wetter.',
    thingA: 'Wir sprechen darüber.',
    personQ: 'Wir sprechen über die Nachbarin.',
    personA: 'Wir sprechen über sie.',
  },
  {
    base: 'träumen von',
    thingQ: 'Er träumt von einem eigenen Haus.',
    thingA: 'Er träumt davon.',
    personQ: 'Er träumt von seiner Großmutter.',
    personA: 'Er träumt von ihr.',
  },
]

/**
 * Korrelat: the da-compound that announces a following dass-/ob-clause or
 * zu-infinitive. Per verb it is obligatory, optional, or wrong (see spec §1.4).
 */
export const KORRELAT: {
  obligatory: KorrelatEntry[]
  optional: KorrelatEntry[]
  excluded: KorrelatEntry[]
} = {
  obligatory: [
    { expression: 'bestehen darauf, dass',        example: 'Er besteht darauf, dass wir pünktlich sind.' },
    { expression: 'es kommt darauf an, ob',       example: 'Es kommt darauf an, ob du Zeit hast.' },
    { expression: 'sich darauf verlassen, dass',  example: 'Ich verlasse mich darauf, dass du kommst.' },
    { expression: 'davon abhängen, ob',           example: 'Es hängt davon ab, ob es regnet.' },
    { expression: 'sich darum kümmern, dass',     example: 'Sie kümmert sich darum, dass alles klappt.' },
  ],
  optional: [
    { expression: 'sich (daran) erinnern, dass',  example: 'Ich erinnere mich (daran), dass wir dort waren.' },
    { expression: 'sich (darüber) freuen, dass',  example: 'Ich freue mich (darüber), dass du da bist.' },
    { expression: 'sich (darauf) freuen, zu …',   example: 'Ich freue mich (darauf), dich zu sehen.' },
    { expression: '(darauf) hoffen, dass',        example: 'Wir hoffen (darauf), dass es klappt.' },
    { expression: '(davon) träumen, zu …',        example: 'Sie träumt (davon), am Meer zu leben.' },
  ],
  excluded: [
    { expression: 'wissen, dass — nie *darüber',      example: 'Ich weiß, dass du recht hast. (nicht: *Ich weiß darüber, dass …)' },
    { expression: 'glauben, dass — nie *daran',       example: 'Ich glaube, dass es morgen regnet. (nicht: *Ich glaube daran, dass …)' },
    { expression: 'sagen, dass — nie *darüber',       example: 'Er sagt, dass er müde ist.' },
    { expression: 'denken (= meinen), dass — nie *daran', example: 'Ich denke, dass das eine gute Idee ist.' },
  ],
}
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run tests/data/daCompounds.test.ts` → PASS (all tests).
Run: `npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/daCompounds.ts tests/data/daCompounds.test.ts
git commit -m "feat(da-compounds): formation data module — transforms, table, traps, Korrelat"
```

---

### Task 2: Cheatsheet page

**Files:**
- Create: `src/modules/da-compounds/DaCompoundsCheatsheet.vue`
- Test: `tests/modules/da-compounds/DaCompoundsCheatsheet.test.ts`

**Interfaces:**
- Consumes: everything Task 1 produces; shared cheatsheet chrome `src/modules/verbs/cheatsheet/cheatsheet.css`, `ChapterNav.vue` (exports `interface Chapter { id; numeral; titleDe; titleEn }`, props `{ chapters, searchQuery }`, emits `update:searchQuery` + `select`), `Callout.vue` (prop `kind: 'note' | 'exception' | 'example'`).
- Produces: component at the path Task 3's router entry imports. Back-link targets route name `dacompounds` (registered in Task 3 — the component only references the name, which is resolved at click time; tests mount with a memory router that registers it).

- [ ] **Step 1: Write the failing test**

Create `tests/modules/da-compounds/DaCompoundsCheatsheet.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DaCompoundsCheatsheet from '../../../src/modules/da-compounds/DaCompoundsCheatsheet.vue'
import {
  DA_COMPOUND_PREPOSITIONS, NO_COMPOUND_PREPOSITIONS, THING_VS_PERSON, KORRELAT,
} from '../../../src/data/daCompounds'

async function mountSheet() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
      { path: '/da-compounds/cheatsheet', name: 'dacompounds-cheatsheet', component: { template: '<div />' } },
    ],
  })
  await router.push({ name: 'dacompounds-cheatsheet' })
  const wrapper = mount(DaCompoundsCheatsheet, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('DaCompoundsCheatsheet', () => {
  it('renders all four chapters', async () => {
    const wrapper = await mountSheet()
    for (const id of ['dac-formation', 'dac-none', 'dac-person', 'dac-korrelat'])
      expect(wrapper.find(`#${id}`).exists()).toBe(true)
  })

  it('formation table has one row per compoundable preposition, with derived forms', async () => {
    const wrapper = await mountSheet()
    const rows = wrapper.findAll('.dac-table tbody tr')
    expect(rows.length).toBe(DA_COMPOUND_PREPOSITIONS.length)
    expect(wrapper.find('.dac-table').text()).toContain('darüber')
    expect(wrapper.find('.dac-table').text()).toContain('worüber')
    expect(wrapper.find('.dac-table').text()).toContain('dafür')
  })

  it('lists every no-compound trap preposition', async () => {
    const wrapper = await mountSheet()
    const text = wrapper.find('#dac-none').text()
    for (const p of NO_COMPOUND_PREPOSITIONS) expect(text).toContain(p)
  })

  it('renders the things-vs-people pairs and the Korrelat lists', async () => {
    const wrapper = await mountSheet()
    expect(wrapper.findAll('#dac-person .dac-pair').length).toBe(THING_VS_PERSON.length)
    const korrelat = wrapper.find('#dac-korrelat').text()
    expect(korrelat).toContain(KORRELAT.obligatory[0].example)
    expect(korrelat).toContain(KORRELAT.excluded[0].expression)
  })

  it('has a back link to the module home', async () => {
    const wrapper = await mountSheet()
    expect(wrapper.find('.back-link').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run tests/modules/da-compounds/DaCompoundsCheatsheet.test.ts`
Expected: FAIL — cannot resolve the component.

- [ ] **Step 3: Implement**

Create `src/modules/da-compounds/DaCompoundsCheatsheet.vue` (German copy verbatim):

```vue
<script setup lang="ts">
import { ref, nextTick } from 'vue'
import '../verbs/cheatsheet/cheatsheet.css'
import ChapterNav, { type Chapter } from '../verbs/cheatsheet/ChapterNav.vue'
import Callout from '../verbs/cheatsheet/Callout.vue'
import {
  DA_COMPOUND_PREPOSITIONS, NO_COMPOUND_PREPOSITIONS, THING_VS_PERSON, KORRELAT,
  daCompound, woCompound, isVowelInitial,
} from '../../data/daCompounds'

const chapters: Chapter[] = [
  { id: 'dac-formation', numeral: 'I',   titleDe: 'Bildung',          titleEn: 'da(r) + preposition, wo(r) for questions' },
  { id: 'dac-none',      numeral: 'II',  titleDe: 'Keine Bildung',    titleEn: 'Prepositions that form no compound' },
  { id: 'dac-person',    numeral: 'III', titleDe: 'Sache oder Person', titleEn: 'Things take da-, people take pronouns' },
  { id: 'dac-korrelat',  numeral: 'IV',  titleDe: 'Korrelat',         titleEn: 'Pointing at a dass-clause' },
]

const searchQuery = ref('')

function onSelect(id: string) {
  nextTick(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
</script>

<template>
  <div class="page grammatik">
    <header class="section-header cheatsheet-section-header" data-print-hide>
      <div>
        <div class="breadcrumb">Spickzettel · Cheatsheet</div>
        <h1 class="section-title">Da-Compounds<em>.</em></h1>
        <p class="section-subtitle">
          dafür, darauf, davon — the pronoun the preposition swallowed. Formation,
          the things-vs-people rule, and the Korrelat.
        </p>
      </div>
      <router-link :to="{ name: 'dacompounds' }" class="btn btn-ghost back-link">← Da-Compounds</router-link>
    </header>

    <div class="grammatik-layout">
      <ChapterNav
        :chapters="chapters"
        :search-query="searchQuery"
        @update:search-query="searchQuery = $event"
        @select="onSelect"
      />

      <main class="grammatik-main">
        <section id="dac-formation" class="chapter">
          <div class="chapter-numeral">I</div>
          <h2 class="chapter-title">Bildung</h2>
          <p class="chapter-subtitle">
            <strong>da + Präposition</strong> — and a linking <strong>-r-</strong> when the
            preposition starts with a vowel: da<em>r</em>auf, da<em>r</em>über. Questions
            about things use the same rule with <strong>wo(r)-</strong>.
          </p>
          <hr class="rule" />
          <div class="dac-table-wrap">
            <table class="dac-table">
              <thead>
                <tr><th>Präposition</th><th>da-</th><th>wo-</th><th>Sense</th></tr>
              </thead>
              <tbody>
                <tr v-for="e in DA_COMPOUND_PREPOSITIONS" :key="e.preposition">
                  <td class="dac-prep">{{ e.preposition }}</td>
                  <td :class="{ 'dac-r': isVowelInitial(e.preposition) }">{{ daCompound(e.preposition) }}</td>
                  <td :class="{ 'dac-r': isVowelInitial(e.preposition) }">{{ woCompound(e.preposition) }}</td>
                  <td class="dac-gloss">{{ e.gloss }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Callout kind="note">
            <p>
              Spelling traps: <em>*daauf</em>, <em>*darmit</em>, <em>*woauf</em> —
              the <strong>-r-</strong> exists only before a vowel, never after <em>da</em>/<em>wo</em>
              before a consonant.
            </p>
          </Callout>
        </section>

        <section id="dac-none" class="chapter">
          <div class="chapter-numeral">II</div>
          <h2 class="chapter-title">Keine Bildung</h2>
          <p class="chapter-subtitle">These prepositions form <strong>no</strong> da- or wo-compound.</p>
          <hr class="rule" />
          <ul class="dac-none-list">
            <li v-for="p in NO_COMPOUND_PREPOSITIONS" :key="p">
              <strong>{{ p }}</strong> — <em>*da{{ p }}</em> does not exist
            </li>
          </ul>
          <Callout kind="exception">
            <p>
              <strong>ohne</strong> and the genitive prepositions (<em>während, wegen, trotz, statt</em>)
              repeat the noun or use a pronoun instead: <em>ohne das Auto → ohne es</em>.
            </p>
          </Callout>
        </section>

        <section id="dac-person" class="chapter">
          <div class="chapter-numeral">III</div>
          <h2 class="chapter-title">Sache oder Person?</h2>
          <p class="chapter-subtitle">
            Da-compounds stand for <strong>things, abstracts, and whole clauses</strong> — never for
            people. A person keeps <strong>Präposition + Pronomen</strong>, and questions split the
            same way: <em>Worauf?</em> for things, <em>Auf wen?</em> for people.
          </p>
          <hr class="rule" />
          <div v-for="pair in THING_VS_PERSON" :key="pair.base" class="dac-pair">
            <div class="dac-pair-base">{{ pair.base }}</div>
            <div class="dac-pair-cols">
              <div>
                <div class="dac-pair-label">Sache</div>
                <p>{{ pair.thingQ }} → <strong>{{ pair.thingA }}</strong></p>
              </div>
              <div>
                <div class="dac-pair-label">Person</div>
                <p>{{ pair.personQ }} → <strong>{{ pair.personA }}</strong></p>
              </div>
            </div>
          </div>
          <Callout kind="note">
            <p>
              A da-compound can also point at a whole previous sentence:
              <em>Sie hat die Prüfung bestanden. <strong>Damit</strong> hat niemand gerechnet.</em>
            </p>
          </Callout>
        </section>

        <section id="dac-korrelat" class="chapter">
          <div class="chapter-numeral">IV</div>
          <h2 class="chapter-title">Korrelat</h2>
          <p class="chapter-subtitle">
            The da-compound can announce a following <em>dass</em>-/<em>ob</em>-clause or
            <em>zu</em>-infinitive: <em>Ich freue mich <strong>darauf</strong>, dich zu sehen.</em>
            Whether it must, may, or must not appear depends on the verb.
          </p>
          <hr class="rule" />
          <h3 class="pattern-heading">Obligatorisch — the compound must appear</h3>
          <ul class="dac-korrelat-list">
            <li v-for="e in KORRELAT.obligatory" :key="e.expression">
              <strong>{{ e.expression }}</strong> — <em>{{ e.example }}</em>
            </li>
          </ul>
          <h3 class="pattern-heading">Fakultativ — with or without</h3>
          <ul class="dac-korrelat-list">
            <li v-for="e in KORRELAT.optional" :key="e.expression">
              <strong>{{ e.expression }}</strong> — <em>{{ e.example }}</em>
            </li>
          </ul>
          <h3 class="pattern-heading">Ausgeschlossen — plain dass, no compound</h3>
          <ul class="dac-korrelat-list">
            <li v-for="e in KORRELAT.excluded" :key="e.expression">
              <strong>{{ e.expression }}</strong> — <em>{{ e.example }}</em>
            </li>
          </ul>
          <Callout kind="exception">
            <p>
              Overusing the Korrelat is a real error: <em>*Ich weiß darüber, dass …</em> —
              <strong>wissen</strong>, <strong>glauben</strong>, <strong>sagen</strong> take a plain
              <em>dass</em>-clause.
            </p>
          </Callout>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.dac-table-wrap { overflow-x: auto; }
.dac-table { width: 100%; border-collapse: collapse; font-size: 15px; }
.dac-table th {
  text-align: left; font-family: var(--font-mono); font-size: 11px;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--mute);
  padding: 6px 12px 6px 0; border-bottom: 1px solid var(--rule);
}
.dac-table td { padding: 7px 12px 7px 0; border-bottom: 1px solid var(--hairline, var(--rule)); }
.dac-prep { font-weight: 600; }
.dac-r { font-style: italic; }
.dac-gloss { color: var(--ink-soft); font-size: 14px; }
.dac-none-list, .dac-korrelat-list { padding-left: 18px; }
.dac-none-list li, .dac-korrelat-list li { margin: 6px 0; }
.dac-pair { margin: 18px 0; }
.dac-pair-base {
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 4px;
}
.dac-pair-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.dac-pair-label { font-size: 12px; font-style: italic; color: var(--mute); }
.dac-pair-cols p { margin: 2px 0 0; }
@media (max-width: 560px) {
  .dac-pair-cols { grid-template-columns: 1fr; gap: 8px; }
}
</style>
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run tests/modules/da-compounds/DaCompoundsCheatsheet.test.ts` → PASS.
Run: `npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/da-compounds/DaCompoundsCheatsheet.vue tests/modules/da-compounds/DaCompoundsCheatsheet.test.ts
git commit -m "feat(da-compounds): cheatsheet — formation table, traps, person rule, Korrelat"
```

---

### Task 3: Module scaffold + release prep

**Files:**
- Create: `src/modules/da-compounds/DaCompoundsHome.vue`
- Modify: `src/router.ts` (new block after the prepositions block, ~line 45)
- Modify: `src/components/NavShell.vue` (`items`, lines 19-28)
- Modify: `src/modules/home/Home.vue` (`modules` array + breadcrumb count, lines 15-80/96)
- Modify: `src/data/changelog.ts` + `package.json` (version 1.12.2)
- Test: `tests/modules/da-compounds/DaCompoundsHome.test.ts`

**Interfaces:**
- Consumes: `DaCompoundsHome.vue` + `DaCompoundsCheatsheet.vue` component files (Tasks 1-2 done), route names `dacompounds` / `dacompounds-cheatsheet` (hyphen-free — see Global Constraints).
- Produces: navigable module; released version 1.12.2 after controller merge.

- [ ] **Step 1: Write the failing test**

Create `tests/modules/da-compounds/DaCompoundsHome.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DaCompoundsHome from '../../../src/modules/da-compounds/DaCompoundsHome.vue'

async function mountHome() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
      { path: '/da-compounds/cheatsheet', name: 'dacompounds-cheatsheet', component: { template: '<div />' } },
    ],
  })
  await router.push({ name: 'dacompounds' })
  const wrapper = mount(DaCompoundsHome, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('DaCompoundsHome', () => {
  it('renders the module header and the Reference section', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.find('.section-title').text()).toContain('Da-Compounds')
    expect(wrapper.find('.group-heading').text()).toContain('Reference')
  })

  it('shows the cheatsheet card and navigates to it on click', async () => {
    const { wrapper, router } = await mountHome()
    const card = wrapper.find('.module-card')
    expect(card.text()).toContain('Cheatsheet')
    await card.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('dacompounds-cheatsheet')
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run tests/modules/da-compounds/DaCompoundsHome.test.ts`
Expected: FAIL — cannot resolve the component.

- [ ] **Step 3: Implement the home page**

Create `src/modules/da-compounds/DaCompoundsHome.vue`:

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

interface Card {
  numeral: string
  route: string
  title: string
  de: string
  desc: string
}

interface Group {
  heading: string
  de: string
  cards: Card[]
}

// Drill cards arrive family by family (spec §7 phases); Phase 1 ships the reference.
const groups: Group[] = [
  {
    heading: 'Reference',
    de: 'Nachschlagen',
    cards: [
      {
        numeral: 'A', route: 'dacompounds-cheatsheet',
        title: 'Cheatsheet', de: 'Spickzettel',
        desc: 'The formation table (da/dar, wo/wor), prepositions that form no compound, the things-vs-people rule, and the Korrelat verb lists.',
      },
    ],
  },
]

function go(target: string) {
  router.push({ name: target })
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Modul · Pronominaladverbien</div>
        <h1 class="section-title">Da-Compounds<em>.</em></h1>
        <p class="section-subtitle">
          dafür, darauf, davon — one small word instead of preposition + pronoun.
          Study the cheatsheet first; the drills arrive family by family.
        </p>
      </div>
    </header>

    <template v-for="g in groups" :key="g.heading">
      <h2 class="group-heading">{{ g.heading }} · <span class="group-de">{{ g.de }}</span></h2>
      <div class="module-grid">
        <article
          v-for="c in g.cards"
          :key="c.route"
          class="card module-card interactive"
          role="button"
          tabindex="0"
          @click="go(c.route)"
          @keydown.enter="go(c.route)"
        >
          <div class="module-numeral">{{ c.numeral }}</div>
          <h2>{{ c.title }}</h2>
          <div class="module-de">{{ c.de }}</div>
          <p class="module-desc">{{ c.desc }}</p>
          <div class="module-cta">Open <span aria-hidden="true">→</span></div>
        </article>
      </div>
    </template>
  </div>
</template>

<style scoped>
.module-card:focus-visible { outline: 1px dotted var(--rule); outline-offset: 4px; }
.group-heading {
  margin: 28px 0 14px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
}
.group-de { font-style: italic; text-transform: none; letter-spacing: 0.04em; }
</style>
```

- [ ] **Step 4: Wire routes, nav, and home card**

`src/router.ts` — insert a new block right after the prepositions block (after the `prepositions-cheatsheet` entry):

```ts
// Da-Compounds (Pronominaladverbien). Route names are hyphen-free ('dacompounds')
// because NavShell derives the active tab via name.split('-')[0].
{ path: '/da-compounds', name: 'dacompounds', component: () => import('./modules/da-compounds/DaCompoundsHome.vue') },
{ path: '/da-compounds/cheatsheet', name: 'dacompounds-cheatsheet', component: () => import('./modules/da-compounds/DaCompoundsCheatsheet.vue') },
```

`src/components/NavShell.vue` — add to `items` after the `prepositions` entry:

```ts
{ route: 'dacompounds', label: 'Da-Compounds', de: 'Pronominaladverbien' },
```

`src/modules/home/Home.vue` — append to the `modules` array (before `settings` — keep settings last, renumber it if it has a numeral ordering; check the existing entries: if settings is VIII, the new card becomes VIII and settings IX, OR simply append as IX after settings — choose: insert BEFORE settings, new card numeral 'VIII', settings becomes 'IX'):

```ts
{
  numeral: 'VIII',
  route: 'dacompounds',
  de: 'Pronominaladverbien',
  title: 'Da-Compounds',
  desc: 'dafür, darauf, davon — build them, pick their case, spot when a person needs a pronoun instead.',
  meta: 'Cheatsheet live · drills arriving in phases'
},
```

and change the settings entry's `numeral` to `'IX'`, and update the breadcrumb string `Frontispiece · I/VIII` → `Frontispiece · I/IX`.

- [ ] **Step 5: Verify green**

Run: `npx vitest run tests/modules/da-compounds/DaCompoundsHome.test.ts` → PASS.
Run: `npm run typecheck` → PASS.

- [ ] **Step 6: Changelog + version bump**

`package.json`: `"version": "1.12.2"`; run `npm install --package-lock-only` to sync the lockfile.
`src/data/changelog.ts`: `APP_VERSION = '1.12.2'` and prepend:

```ts
{
  version: '1.12.2', date: '2026-07-23', kind: 'module',
  title: 'Da-Compounds · a new module opens',
  notes: [
    '<strong>Module IX: Da-Compounds (Pronominaladverbien).</strong> dafür, darauf, davon &amp; friends get their own home — reachable from the top nav and the front page. The drills arrive family by family over the coming releases; this one lays the foundation.',
    '<strong>The cheatsheet is live.</strong> The full formation table (<em>da/dar</em> and <em>wo/wor</em> — the linking <em>-r-</em> only before a vowel), the prepositions that refuse to form compounds (<em>*daohne</em>), the things-vs-people rule (<em>darauf</em> vs. <em>auf ihn</em>), and which verbs demand, allow, or forbid a Korrelat (<em>Ich freue mich darauf, dass …</em>).'
  ]
},
```

- [ ] **Step 7: Full gates**

Run: `npx vitest run --testTimeout=30000` → all green.
Run: `npm run typecheck` → green.

- [ ] **Step 8: Commit**

```bash
git add -A -- ':!dist'
git commit -m "feat(da-compounds): module scaffold — routes, nav, home card, module home; v1.12.2"
```

---

### Controller wrap-up (not a subagent task)

- [ ] Final whole-branch review (most capable model), fix wave if needed
- [ ] 390px verification of `/da-compounds` and `/da-compounds/cheatsheet` (formation table scrolls in its wrapper, no page-body horizontal scroll; nav drawer shows the new tab)
- [ ] Merge + release:

```bash
git checkout main
git merge --no-ff feat/phase1-dacompounds-scaffold -m "Merge feat/phase1-dacompounds-scaffold: Da-Compounds module + cheatsheet - v1.12.2"
npm run deploy
git push origin main
```
