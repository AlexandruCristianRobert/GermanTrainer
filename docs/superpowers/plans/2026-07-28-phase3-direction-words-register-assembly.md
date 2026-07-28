# Phase 3 — Direction Words Register & Assembly Drills (T4–T5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Direction Words module gains T4 (r-forms & register judgment) and T5 (sentence assembly with tiles) — both offline, deterministic, recording Runs (spec §7 Phase 3: "Register & offline production").

**Architecture:** Two new authored datasets: `src/data/directionRegister.ts` (three-verdict judgment items: standard / spoken-only / always wrong, mirroring `daRegister.ts` including the `correctedForm` quoted-form convention) and `src/data/directionAssembly.ts` (tile sentences with curated accepted orders, mirroring `daAssembly.ts` but standalone — no collocation join, level-only filtering, plus a `translation` field). Two engines mirror their da-compounds siblings (`useDaRegisterQuiz`, `useDaAssemblyQuiz`) with the module's own types. Runners mirror `RegisterRunner.vue` / `AssemblyRunner.vue` chrome with the Phase-2 house recording pattern.

**Deliberate deviation from spec §3 T4:** the spec sketches two item shapes (r-form expansion pick + register judgment). This plan ships the judgment mechanic only; the expansion knowledge (*runter* = *hinunter* OR *herunter*) is embedded in every spoken-item reveal (the explanation names both full forms) and is already drilled by T2's distractor axis and the cheatsheet table. A separate expansion pick would be a dead-easy 1-of-6 mapping quiz — judged not worth a second mechanic. Content-design decision made at planning time, not an omission.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Vitest + @vue/test-utils, `createPool`/`shuffle` (src/data/pool.ts), localStorage history (`saveQuizRun`).

## Global Constraints

- Branch `feat/phase3-direction-words-register-assembly` off `main`; merge in the final controller step.
- Route names hyphen-free under the `directionwords` head: `directionwords-register`, `directionwords-register-run`, `directionwords-assembly`, `directionwords-assembly-run`. Paths `/direction-words/register(/run)`, `/direction-words/assembly(/run)`.
- New `QuizHistoryType` ids exactly `'dw-register'`, `'dw-assembly'`, inserted after `'dw-question'` in every registry (union, both label maps, `QUIZ_TYPES_ORDER`, HistoryPage `QUIZ_TYPES` + `typeOrder`, both `useQuizStats` zero-maps, `useLevelAssessment` `TYPE_LABEL`).
- Recording: house pattern (`startedAtMs` + `historySaved` + `watch(finished)` — the Phase-2 runners are the in-repo template); retry rounds and `total === 0` never record; meta `{ levels }` for both drills.
- **German correctness is a shipping gate.** Known authoring traps from Phase 2 (both bit items that survived self-review — check for them explicitly):
  1. *Separable-prefix fusion:* a bare adverb tile directly before an infinitive/participle in ANY accepted order produces non-standard orthography ("hinüber gehen"). Rule: fused forms (*hinübergehen*, *hineingelaufen*) are ONE tile; bare adverb tiles appear only clause-final after a finite verb.
  2. *Synonym twins:* never write a register item whose verdict natives would debate; one phenomenon per item. Assembly grading is index-based, so twins can't mis-grade there.
- Register verdict truth is part of the gate: 'standard' items contain no r-forms; every 'wrong' item's explanation names the corrected form in double quotes (the `correctedForm` extraction convention); explanations are `German / English` halves.
- Phone-first ~390px (assembly tile pool must wrap, tiles ≥44px tall); controller probes before release.
- Gates: `npx vitest run --testTimeout=30000` green (ThemeToggle order-dependent flake: sole failure → rerun once, proceed), `npm run typecheck` green. Never touch dist/ or GermanVerbTester/.
- Release: v1.14.02, changelog kind 'polish', date 2026-07-28.
- Commits end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: Register item bank (authored)

**Files:**
- Create: `src/data/directionRegister.ts`
- Test: `tests/data/directionRegister.test.ts`

**Interfaces:**
- Consumes: `type DirectionLevel`, `DIRECTION_LEVELS` from `src/data/directionWords.ts`.
- Produces (Tasks 3–4 rely on): `type DwRegisterVerdict = 'standard' | 'spoken' | 'wrong'`, `interface DwRegisterItem { id: string; phrase: string; verdict: DwRegisterVerdict; explanation: string; level: DirectionLevel; pair: string | null }`, `DIRECTION_REGISTER: DwRegisterItem[]` (≥36). `pair` names the [Adverb pair] element the item hinges on (`'über'` for a *rüber* item), or `null` for pair-independent items (bare hin/her, *Komm hier*, wo-splits) — spec §6.6 mandates pair chips on T4, and null-pair items match every pair selection (they are core-rule facts, documented in the setup hint).

- [ ] **Step 1: Invariant tests FIRST.** Create `tests/data/directionRegister.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { DIRECTION_REGISTER } from '../../src/data/directionRegister'
import { DIRECTION_LEVELS } from '../../src/data/directionWords'

const R_FORM = /\b(rein|raus|rauf|runter|rüber)\b/i

describe('DIRECTION_REGISTER invariants', () => {
  test('unique ids, valid levels, non-empty fields', () => {
    expect(new Set(DIRECTION_REGISTER.map(i => i.id)).size).toBe(DIRECTION_REGISTER.length)
    const bad = DIRECTION_REGISTER.filter(i =>
      !(DIRECTION_LEVELS as readonly string[]).includes(i.level)
      || i.phrase.trim().length === 0 || i.explanation.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('explanations carry German / English halves', () => {
    const bad = DIRECTION_REGISTER.filter(i => !i.explanation.includes(' / '))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('standard phrases contain no r-forms', () => {
    const bad = DIRECTION_REGISTER.filter(i => i.verdict === 'standard' && R_FORM.test(i.phrase))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('spoken phrases contain an r-form or a wo…hin/her split', () => {
    const bad = DIRECTION_REGISTER.filter(i =>
      i.verdict === 'spoken'
      && !R_FORM.test(i.phrase)
      && !/\bwo\b.*\b(hin|her|lang|durch)\b/i.test(i.phrase))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every wrong item names a corrected form in double quotes (English half)', () => {
    const bad = DIRECTION_REGISTER.filter(i => {
      if (i.verdict !== 'wrong') return false
      const en = i.explanation.split(' / ')[1] ?? ''
      return ![...en.matchAll(/"([^"]+)"/g)].length
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('pair is a real element or null; spoken r-form items always carry a pair; each r-form pair ≥3 items', () => {
    const ELEMENTS = ['ein', 'aus', 'auf', 'unter', 'über', 'ab']
    const bad = DIRECTION_REGISTER.filter(i =>
      (i.pair !== null && !ELEMENTS.includes(i.pair))
      || (i.verdict === 'spoken' && R_FORM.test(i.phrase) && i.pair === null))
    expect(bad.map(i => i.id)).toEqual([])
    for (const el of ['ein', 'aus', 'auf', 'unter', 'über'])
      expect(DIRECTION_REGISTER.filter(i => i.pair === el).length, el).toBeGreaterThanOrEqual(3)
  })

  test('floors: ≥36 total; ≥12 per verdict; levels A2≥6, B1≥10, B2≥8, C1≥4', () => {
    expect(DIRECTION_REGISTER.length).toBeGreaterThanOrEqual(36)
    for (const v of ['standard', 'spoken', 'wrong'] as const)
      expect(DIRECTION_REGISTER.filter(i => i.verdict === v).length, v).toBeGreaterThanOrEqual(12)
    const n = (l: string) => DIRECTION_REGISTER.filter(i => i.level === l).length
    expect(n('A2')).toBeGreaterThanOrEqual(6)
    expect(n('B1')).toBeGreaterThanOrEqual(10)
    expect(n('B2')).toBeGreaterThanOrEqual(8)
    expect(n('C1')).toBeGreaterThanOrEqual(4)
  })
})
```

- [ ] **Step 2: RED.** **Step 3: Author the data.** File header documents the three verdicts exactly like `src/data/daRegister.ts:1-21` (read it first — the phrase-shown-raw and corrected-form conventions carry over). ids `dwr-<n>`. Authoring rules:
  - **standard (≥12):** correct full compounds and bare hin/her in sentences fine in writing — *"Sie ging langsam die Treppe hinunter."*, *"Kommen Sie bitte herein!"*, *"Wohin fahren Sie im Urlaub?"*. No r-forms anywhere.
  - **spoken (≥12):** r-forms in natural colloquial lines — *"Komm rüber, das Essen wird kalt!"*, *"Ich geh mal kurz raus."*, *"Kommst du mit runter?"* — and wo-splits (*"Wo willst du denn hin?"*). EVERY spoken explanation names both full forms the r-form collapses (*"rüber = herüber oder hinüber — gesprochen; geschrieben: herüber/hinüber"*) — this carries the spec's expansion teaching.
  - **wrong (≥12):** hin/her glued to an r-form (*"Er ist schnell hinrein gegangen."* → "hinein"), *Komm hier* (→ "her"), nonexistent \**rab* (→ "hinab"), doubled forms (*"Herrein!"* → "Herein"). Phrase shown raw, no asterisk; explanation names the phenomenon + corrected form in double quotes in the English half.
  - One phenomenon per item; if natives would debate the verdict, don't ship the item. Exemplars (may be included):

```ts
{ id: 'dwr-1', verdict: 'standard', level: 'A2', pair: 'unter',
  phrase: 'Sie ging langsam die Treppe hinunter.',
  explanation: 'Volle Zusammensetzung „hinunter" — Standard, auch geschrieben. / Full compound "hinunter"; standard, also written.' },
{ id: 'dwr-13', verdict: 'spoken', level: 'A2', pair: 'über',
  phrase: 'Komm rüber, das Essen wird kalt!',
  explanation: '„rüber" = herüber (oder hinüber) — gesprochen völlig normal, geschrieben „herüber". / "rüber" collapses "herüber/hinüber"; fine in speech, written standard keeps the full form.' },
{ id: 'dwr-25', verdict: 'wrong', level: 'B1', pair: 'ein',
  phrase: 'Er ist schnell hinrein gegangen.',
  explanation: '„hinrein" existiert nicht — „rein" ERSETZT hinein/herein. / "hinrein" does not exist; the r-form already replaced the full compound — correct: "hinein" (or spoken "rein").' },
{ id: 'dwr-26', verdict: 'wrong', level: 'A2', pair: null,
  phrase: 'Komm hier, ich zeige dir etwas!',
  explanation: '„hier" ist ein Ort, keine Bewegung — die Bewegung zum Sprecher heißt „her". / "hier" is a place, not a motion; correct: "Komm her".' },
```

- [ ] **Step 4: GREEN + typecheck.** **Step 5: Commit** `feat(direction-words): register item bank (36+ authored judgments)`

---

### Task 2: Assembly item bank (authored)

**Files:**
- Create: `src/data/directionAssembly.ts`
- Test: `tests/data/directionAssembly.test.ts`

**Interfaces:**
- Consumes: `type DirectionLevel`, `DIRECTION_LEVELS`.
- Produces (Tasks 3, 5 rely on): `interface DwAssemblyItem { id: string; level: DirectionLevel; tiles: string[]; variants?: number[][]; punctuation: '.' | '!' | '?'; translation: string }`, `DIRECTION_ASSEMBLY: DwAssemblyItem[]` (≥24), `dwAssemblySentence(item, order?): string`, `dwAcceptedOrders(item): number[][]` (same logic as `daAssembly.ts:51-61` — reimplement locally over `DwAssemblyItem`, do not import across modules).

- [ ] **Step 1: Invariant tests FIRST.** Create `tests/data/directionAssembly.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { DIRECTION_ASSEMBLY, dwAssemblySentence, dwAcceptedOrders } from '../../src/data/directionAssembly'
import { DIRECTION_LEVELS } from '../../src/data/directionWords'

describe('DIRECTION_ASSEMBLY invariants', () => {
  test('unique ids, valid levels, 4-7 tiles, unique tile strings, non-empty translation', () => {
    expect(new Set(DIRECTION_ASSEMBLY.map(i => i.id)).size).toBe(DIRECTION_ASSEMBLY.length)
    const bad = DIRECTION_ASSEMBLY.filter(i =>
      !(DIRECTION_LEVELS as readonly string[]).includes(i.level)
      || i.tiles.length < 4 || i.tiles.length > 7
      || new Set(i.tiles).size !== i.tiles.length
      || i.translation.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every item carries a direction word in some tile', () => {
    const bad = DIRECTION_ASSEMBLY.filter(i => !i.tiles.some(t => /hin|her|wohin|woher/i.test(t)))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('variants are true permutations differing from canonical', () => {
    const bad = DIRECTION_ASSEMBLY.filter(i => (i.variants ?? []).some(v => {
      const canonical = i.tiles.map((_, k) => k)
      return v.length !== i.tiles.length
        || [...v].sort((a, b) => a - b).join(',') !== canonical.join(',')
        || v.join(',') === canonical.join(',')
    }))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('FUSION GATE: no accepted order places a bare adverb tile directly before a verb-form tile', () => {
    const BARE = /^(hin|her|hinein|herein|hinaus|heraus|hinauf|herauf|hinunter|herunter|hinüber|herüber|hinab|herab)$/i
    const VERBISH = /^(zu )?(ge)?\p{L}+(en|t)$/u   // crude infinitive/participle shape, single word
    const bad = DIRECTION_ASSEMBLY.filter(i => dwAcceptedOrders(i).some(order =>
      order.some((tileIdx, pos) => {
        const next = order[pos + 1]
        return next !== undefined
          && BARE.test(i.tiles[tileIdx].trim())
          && !i.tiles[next].includes(' ')
          && VERBISH.test(i.tiles[next].trim())
      })))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('helpers: sentence renders capitalized with punctuation; canonical is first accepted order', () => {
    const i = DIRECTION_ASSEMBLY[0]
    const s = dwAssemblySentence(i)
    expect(s.charAt(0)).toBe(s.charAt(0).toUpperCase())
    expect(s.endsWith(i.punctuation)).toBe(true)
    expect(dwAcceptedOrders(i)[0]).toEqual(i.tiles.map((_, k) => k))
  })

  test('floors: ≥24 total; A2≥6, B1≥8, B2≥6; ≥6 items with variants; ≥3 questions', () => {
    expect(DIRECTION_ASSEMBLY.length).toBeGreaterThanOrEqual(24)
    const n = (l: string) => DIRECTION_ASSEMBLY.filter(i => i.level === l).length
    expect(n('A2')).toBeGreaterThanOrEqual(6)
    expect(n('B1')).toBeGreaterThanOrEqual(8)
    expect(n('B2')).toBeGreaterThanOrEqual(6)
    expect(DIRECTION_ASSEMBLY.filter(i => (i.variants ?? []).length > 0).length).toBeGreaterThanOrEqual(6)
    expect(DIRECTION_ASSEMBLY.filter(i => i.punctuation === '?').length).toBeGreaterThanOrEqual(3)
  })
})
```

- [ ] **Step 2: RED.** **Step 3: Author.** File header mirrors `src/data/daAssembly.ts:1-22`'s conventions (read it first): tiles in CANONICAL order, lowercase-initial, 4–7 chunks; variants only for genuinely idiomatic V2 fronting (read every accepted order aloud); the direction word is its own tile ONLY in finite-verb clause-final position — in infinitive/participle contexts the FUSED form is one tile (*hineingelaufen*, *hinübergehen*). ids `dwa-<slug>`. Include split questions (*wo … hin?*) and at least one perfect-tense fused participle. Exemplars (may be included):

```ts
{ id: 'dwa-treppe-hinunter', level: 'A2',
  tiles: ['er', 'geht', 'die Treppe', 'hinunter'],
  punctuation: '.', translation: 'He goes down the stairs.' },
{ id: 'dwa-komm-her', level: 'A2',
  tiles: ['komm', 'bitte', 'sofort', 'her'],
  punctuation: '!', translation: 'Please come here at once!' },
{ id: 'dwa-wo-hin', level: 'B1',
  tiles: ['wo', 'gehst', 'du', 'denn', 'hin'],
  punctuation: '?', translation: 'Where are you off to, then?' },
// Fronting variant: "Morgen fahren wir zu Oma hinüber."
{ id: 'dwa-oma-hinueber', level: 'B1',
  tiles: ['wir', 'fahren', 'morgen', 'zu Oma', 'hinüber'],
  variants: [[2, 1, 0, 3, 4]], punctuation: '.', translation: 'Tomorrow we are going over to Grandma\'s.' },
// Perfect tense — participle FUSED into one tile (fusion gate).
{ id: 'dwa-kinder-hineingelaufen', level: 'B2',
  tiles: ['die Kinder', 'sind', 'schnell', 'ins Haus', 'hineingelaufen'],
  variants: [[2, 1, 0, 3, 4]], punctuation: '.', translation: 'The children ran quickly into the house.' },
```

- [ ] **Step 4: GREEN + typecheck.** **Step 5: Commit** `feat(direction-words): assembly item bank (24+ tile sentences)`

---

### Task 3: History plumbing (2 types) + both engines

**Files:**
- Modify: the six registries (same files/insertion style as Phase 2, now after `'dw-question'`)
- Create: `src/composables/useDirectionRegisterQuiz.ts`, `src/composables/useDirectionAssemblyQuiz.ts`
- Test: `tests/composables/useDirectionRegisterQuiz.test.ts`, `tests/composables/useDirectionAssemblyQuiz.test.ts`, extend `tests/components/quiz-type-labels.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2 banks + helpers; `createPool`, `shuffle`, `Rng` from pool.
- Produces: `'dw-register'` / `'dw-assembly'` types; register engine mirroring `src/composables/useDaRegisterQuiz.ts` one-for-one with these renames — `DwRegisterVerdict`, `DwRegisterFilter { levels?: DirectionLevel[]; pairs?: string[] }` (custom filter function, NOT bare createPool: an item matches when its level passes AND (`pair === null` OR `pair ∈ pairs`) — null-pair items match every non-empty pair selection; an empty `pairs` array excludes only pair-tagged items), `filterDwRegisterItems`, `sampleDwRegisterItems`, `DW_REGISTER_OPTIONS` (same three labels verbatim), `useDwRegisterQuiz(items)`, `dwCorrectedForm(item)` (same last-quoted-string extraction); assembly engine mirroring `src/composables/useDaAssemblyQuiz.ts` MINUS the collocation join — pool directly over `DwAssemblyItem`, `DwAssemblyFilter { levels?: DirectionLevel[] }`, `filterDwAssemblyItems`, `sampleDwAssemblyItems`, `useDwAssemblyQuiz(items, rng?)` with the identical question/place/unplace/submitOrder/dealPool logic (`dealPool` keeps the 8-retry no-accepted-order guard) and `wrongItems: DwAssemblyItem[]`.

Registry entries (after each file's `dw-question` line):
- LABEL: `'dw-register': 'Direction words · register'`, `'dw-assembly': 'Direction words · assembly'`
- DE: `'dw-register': 'Hin & Her · Kurzformen'`, `'dw-assembly': 'Hin & Her · Satzbau'`
- HistoryPage QUIZ_TYPES: same label/de pairs, `module: 'Direction Words'`
- TYPE_LABEL: `'dw-register': 'r-form register judgment'`, `'dw-assembly': 'direction sentence assembly'`

Engine tests (write fully, test-first): register — pick grades against verdict, options are the fixed three in stable order, `dwCorrectedForm` extracts the quoted form from a wrong item and returns null for standard; assembly — place/unplace round-trips tiles, `submitOrder` accepts canonical AND a variant order (use a bank item with variants), rejects a wrong order into `wrongItems`, `dealPool` with `rng: () => 0` never deals an accepted order, double-submit is a no-op.

- [ ] Steps: failing tests (incl. the two ids added to the labels test) → RED → registries → engines → GREEN + typecheck + full suite once → **Commit** `feat(direction-words): history plumbing (register/assembly) + drill engines`

---

### Task 4: T4 Register drill UI

**Files:**
- Create: `src/modules/direction-words/RegisterSetup.vue`, `src/modules/direction-words/RegisterRunner.vue`
- Modify: `src/router.ts` (2 routes after `directionwords-questions-run`), `DirectionWordsHome.vue` (new group after 'Questions & pointers')
- Test: `tests/modules/direction-words/RegisterRunner.test.ts`

Build: mirror `src/modules/da-compounds/RegisterRunner.vue` chrome (phrase card, three fixed verdict buttons keyboard 1–3, reveal with explanation + struck-through phrase and corrected form for wrong items via `dwCorrectedForm`) with the Phase-2 house recording (`type: 'dw-register'`, `meta: { levels, pairs }`) and retry pattern; Setup mirrors `CompoundSetup.vue` (level chips default `['A2', 'B1']`, PAIR chips — same `hinForm/herForm` labels, default all, with a hint line noting that core-rule items without a pair always appear — count presets 10/15/20/all, localStorage `'dwRegisterSetup'`, breadcrumb `Modul · hin & her · Kurzformen`). Query params `{ count, levels, pairs }`. Routes:

```ts
{ path: '/direction-words/register', name: 'directionwords-register', component: () => import('./modules/direction-words/RegisterSetup.vue') },
{ path: '/direction-words/register/run', name: 'directionwords-register-run', component: () => import('./modules/direction-words/RegisterRunner.vue') },
```

Home group (after 'Questions & pointers', before Reference):

```ts
{
  heading: 'Register',
  de: 'Kurzformen',
  cards: [
    {
      numeral: 'T4', route: 'directionwords-register',
      title: 'R-forms & register', de: 'rein, raus, rüber',
      desc: 'Standard, spoken-only, or plain wrong? Judge rüber and friends — and learn why *hinrein never was a word.',
    },
  ],
},
```

Runner test: deterministic sampling (Math.random pinned, unconditional assertions — the Phase-2 pattern); three verdict buttons with the fixed labels; wrong pick reveals explanation; records `{ type: 'dw-register', count: 1 }` exactly once; retry not recorded.

- [ ] Steps: failing test → RED → build → routes/home → GREEN + typecheck + full suite → **Commit** `feat(direction-words): T4 register judgment drill`

---

### Task 5: T5 Assembly drill UI + release prep

**Files:**
- Create: `src/modules/direction-words/AssemblySetup.vue`, `src/modules/direction-words/AssemblyRunner.vue`
- Modify: `src/router.ts` (2 routes), `DirectionWordsHome.vue` (group 'Production · Satzbau' after 'Register'), `src/data/changelog.ts` + `package.json` (v1.14.02)
- Test: `tests/modules/direction-words/AssemblyRunner.test.ts`

Build: mirror `src/modules/da-compounds/AssemblyRunner.vue` (tile pool + placed row, tap to place/unplace, submit gated on `allPlaced`, reveal shows the rendered sentence via `dwAssemblySentence` + `translation` + a "variant accepted" tag when `usedVariant`; tiles ≥44px, pool wraps at 390px) with house recording (`type: 'dw-assembly'`, `meta: { levels }`); Setup: level chips + count presets (default 10), localStorage `'dwAssemblySetup'`, breadcrumb `Modul · hin & her · Satzbau`. Routes:

```ts
{ path: '/direction-words/assembly', name: 'directionwords-assembly', component: () => import('./modules/direction-words/AssemblySetup.vue') },
{ path: '/direction-words/assembly/run', name: 'directionwords-assembly-run', component: () => import('./modules/direction-words/AssemblyRunner.vue') },
```

Home group (after 'Register', before Reference):

```ts
{
  heading: 'Production',
  de: 'Satzbau',
  cards: [
    {
      numeral: 'T5', route: 'directionwords-assembly',
      title: 'Sentence assembly', de: 'Satzbau',
      desc: 'Tap the tiles into order — the direction word lands at the clause end, and idiomatic frontings count too.',
    },
  ],
},
```

Runner test: deterministic; tiles render as buttons; placing all tiles enables submit; a deliberately wrong full order grades wrong and offers retry (not recorded); assembling the canonical order (derive from the pinned item's data) grades correct; records `{ type: 'dw-assembly' }` exactly once.

Release prep: `package.json` `"1.14.02"` (+ `npm install --package-lock-only`); `changelog.ts` `APP_VERSION = '1.14.02'` and prepend:

```ts
{
  version: '1.14.02', date: '2026-07-28', kind: 'polish',
  title: 'Direction Words · register & sentence assembly',
  notes: [
    '<strong>T4 R-forms &amp; register.</strong> <em>Komm rüber!</em> — fine, say it all day. Write it in an essay? Keep <em>herüber</em>. And <em>*hinrein</em> was never a word: judge every phrase as standard, spoken-only, or plain wrong, with the correction on every miss.',
    '<strong>T5 Sentence assembly.</strong> Tap pre-inflected tiles into order and put the direction word where German wants it — clause-final after the finite verb (<em>Wo gehst du denn hin?</em>), fused when it must be (<em>hineingelaufen</em> is one tile, one word). Curated fronting variants count as correct. Both drills record to History and filter by level.'
  ]
},
```

- [ ] Steps: failing test → RED → build → routes/home → changelog/bump → GREEN + typecheck + full suite → **Commit** `feat(direction-words): T5 sentence assembly drill; v1.14.02`

---

### Controller wrap-up (not a subagent task)

- [ ] Final whole-branch review (most capable model; German audit of all ~60 authored items — register verdict truth and every accepted assembly order read aloud are the highest-value passes) + ONE fix wave + scoped re-review
- [ ] Headless-Chrome 390px probe on both runners (drive one card each: judge a phrase; place all tiles and submit; no page-body overflow; tiles wrap) + dark spot-check on the assembly runner
- [ ] Merge `feat/phase3-direction-words-register-assembly` → main (`v1.14.02` merge message), suite green on merged main, `npm run deploy`, `git push origin main`
