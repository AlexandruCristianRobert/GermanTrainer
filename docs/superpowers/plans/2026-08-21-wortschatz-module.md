# Wortschatz Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone Wortschatz module that builds productive B2 exam vocabulary (words + chunks) across the ten Themenfelder, drilled on a 5-stage ladder (guess-intro → Erkennen → Lücke → Abruf → Anwendung) and scheduled by FSRS.

**Architecture:** Pure logic (scheduler, grading, queue) in dependency-free composable files with unit tests; persistence in three new Dexie tables (v17); AI generation/rescue/grading mirrors the `useSchreibenArguments.ts` pattern (prose JSON envelope — local-claude drops responseSchema); two runner views + hub view wired into router/nav/Tagesplan/history exactly like existing modules.

**Tech Stack:** Vue 3 + TypeScript, Dexie 4, naive-ui, vitest (jsdom + fake-indexeddb), `ts-fsrs@5.4.1` (already in package.json).

**Design authority:** `CONTEXT.md` → section "### Wortschatz" (all eight terms) and `docs/adr/0027-wortschatz-fsrs-stored-scheduler-state.md`. Read both before implementing any task.

## Global Constraints

- Glossary names are law: Themenfeld, Vokabel, Einzelwort, Wortverbindung, Vokabelstufe (`Neu → Erkennen → Lücke → Abruf → Anwendung`), Gefestigt, Lernsitzung, Wiederholsitzung. Never use: Domain, Themengruppe, Kollokation, Wendung, gesichert, SRS (in UI copy).
- Route names: `wortschatz`, `wortschatz-lernen-run`, `wortschatz-wiederholen-run` — head must be the single token `wortschatz` (NavShell derives the active tab via `name.split('-')[0]`).
- Typecheck is `npm run typecheck` (vue-tsc) — plain `tsc` output is meaningless in this repo.
- Never hand a Vue `ref`/`reactive` proxy to Dexie — build plain object literals for every `put()` (silent rejection otherwise).
- All AI prompts must spell out the exact JSON envelope in prose (no responseSchema reliance) and be validated + retried ≤2 times, mirroring `generateSchreibArgumentBank` in `src/composables/useSchreibenArguments.ts`.
- Pure-logic files carry the house header comment style and the note `No Vue/DOM.` (see `src/composables/useTagesplan.ts:1-5`).
- FSRS desired retention: `0.9`. Gefestigt threshold: clean Anwendung pass with ≥ `21` elapsed days since `last_review`.
- Rating map (never self-graded): wrong → `Rating.Again`, correct-with-hint → `Rating.Hard`, clean correct → `Rating.Good`; `Rating.Easy` unused.
- Tests: vitest, files under `tests/…` mirroring `src/…`; run a single file with `npx vitest run tests/<path>` .
- German UI copy, English code identifiers except glossary nouns.
- Implementer subagents NEVER run git commands — the controller commits after reviewing each task.

## File map (who owns what)

| File | Task | Responsibility |
|---|---|---|
| `src/data/wortschatz.ts` | 1 | Types, Themenfeld list, stage constants, seed aggregator, invariant helpers |
| `src/data/wortschatzUmwelt.ts` … one per feld (10 files) | 1 (scaffold), 12–14 (content) | Seeded Vokabeln per Themenfeld |
| `src/composables/wortschatzScheduler.ts` | 2 | FSRS wrapper + stage machine (pure) |
| `src/composables/wortschatzGrading.ts` | 3 | Local strict-core grading (pure) |
| `src/db/index.ts`, `src/composables/useWortschatzProgress.ts` | 4 | Dexie v17 + progress/custom/sentence stores |
| `src/composables/wortschatzQueue.ts` | 5 | Lern-Auswahl sampling + interleaved due queue (pure) |
| `src/composables/useWortschatzAi.ts` | 6 | AI: expansion, extra sentences, rescue, Anwendung grading |
| `src/composables/useQuizHistory.ts`, `src/composables/useTagesplan.ts` | 7 | New history types + Tagesplan row |
| `src/router.ts`, `src/data/nav.ts`, `src/modules/wortschatz/WortschatzHome.vue` | 8 | Routes, nav, hub |
| `src/modules/wortschatz/{IntroCard,ErkennenCard,LueckeCard,AbrufCard,AnwendungCard}.vue` | 9 | Presentational stage cards |
| `src/modules/wortschatz/LernenRunner.vue` | 10 | Lernsitzung flow |
| `src/modules/wortschatz/WiederholenRunner.vue` | 11 | Wiederholsitzung flow |
| `src/data/changelog.ts`, `package.json` | 15 | Version + changelog (controller) |

---

### Task 1: Data types, seed scaffold, invariant tests

**Files:**
- Create: `src/data/wortschatz.ts`
- Create: `src/data/wortschatzUmwelt.ts`, `wortschatzArbeit.ts`, `wortschatzTechnologie.ts`, `wortschatzBildung.ts`, `wortschatzGesundheit.ts`, `wortschatzMedien.ts`, `wortschatzGesellschaft.ts`, `wortschatzReisen.ts`, `wortschatzKonsum.ts`, `wortschatzFamilie.ts` (ten files)
- Test: `tests/data/wortschatz.test.ts`

**Interfaces:**
- Consumes: `TOPIC_TAGS`, `TopicTag` from `src/data/sprechenTopics.ts`
- Produces (everything below is relied on by Tasks 2–14):

```ts
export type Themenfeld = TopicTag
export const THEMENFELDER: readonly Themenfeld[] // re-export of TOPIC_TAGS
export type VokabelKind = 'einzelwort' | 'wortverbindung'
export interface KontextSatz { de: string; en: string }   // de contains exactly one {{…}} blank
export interface Vokabel {
  id: string                 // seed: 'vk-<feld lowercase>-<slug>' | custom: 'vk-custom-<epoch>-<i>'
  feld: Themenfeld
  kind: VokabelKind
  de: string                 // canonical form: 'die Maßnahme' | 'eine Maßnahme ergreifen'
  en: string                 // gloss, also the Abruf cue
  plural?: string            // nouns only; '' = no plural
  rektion?: string           // e.g. 'auf + Akk' when the item governs one
  variants: string[]         // additional accepted full answers
  saetze: KontextSatz[]      // exactly 2 for seeds
  source: 'seed' | 'custom'
}
export const STUFEN = ['erkennen', 'luecke', 'abruf', 'anwendung'] as const
export type Stufe = (typeof STUFEN)[number]
export const STUFE_LABEL: Record<Stufe, string> // { erkennen:'Erkennen', luecke:'Lücke', abruf:'Abruf', anwendung:'Anwendung' }
export const WORTSCHATZ_VOKABELN: Vokabel[]      // aggregation of all ten per-feld arrays
export function clozeParts(satzDe: string): { before: string; blank: string; after: string } | null
```

- [ ] **Step 1: Write the failing test**

`tests/data/wortschatz.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  WORTSCHATZ_VOKABELN, THEMENFELDER, clozeParts, STUFEN
} from '../../src/data/wortschatz'

describe('wortschatz seed invariants', () => {
  it('has the ten Themenfelder', () => {
    expect(THEMENFELDER).toHaveLength(10)
    expect(THEMENFELDER).toContain('Umwelt')
  })

  it('every seed item is mechanically valid', () => {
    const ids = new Set<string>()
    const des = new Set<string>()
    for (const v of WORTSCHATZ_VOKABELN) {
      expect(v.id, v.id).toMatch(/^vk-[a-z]+-[a-z0-9-]+$/)
      expect(ids.has(v.id), `duplicate id ${v.id}`).toBe(false)
      ids.add(v.id)
      const deKey = v.de.toLowerCase()
      expect(des.has(deKey), `duplicate de ${v.de}`).toBe(false)
      des.add(deKey)
      expect(THEMENFELDER).toContain(v.feld)
      expect(v.de.length).toBeGreaterThan(2)
      expect(v.en.length).toBeGreaterThan(1)
      expect(v.source).toBe('seed')
      expect(v.saetze).toHaveLength(2)
      for (const s of v.saetze) {
        const parts = clozeParts(s.de)
        expect(parts, `${v.id}: satz needs exactly one {{…}}: ${s.de}`).not.toBeNull()
        expect(parts!.blank.length).toBeGreaterThan(1)
        expect(s.en.length).toBeGreaterThan(3)
        // the satz must not contain a second blank
        expect(s.de.indexOf('{{')).toBe(s.de.lastIndexOf('{{'))
      }
      if (v.kind === 'einzelwort' && /^(der|die|das) /.test(v.de)) {
        expect(v.plural, `${v.id}: noun needs plural ('' if none)`).toBeDefined()
      }
      if (v.kind === 'wortverbindung') {
        expect(v.de.split(' ').length, `${v.id}: a Wortverbindung is multi-word`).toBeGreaterThan(1)
      }
    }
  })

  it('clozeParts splits a marked sentence', () => {
    expect(clozeParts('Wir müssen {{eine Maßnahme ergreifen}}.')).toEqual({
      before: 'Wir müssen ', blank: 'eine Maßnahme ergreifen', after: '.'
    })
    expect(clozeParts('kein Blank hier.')).toBeNull()
  })

  it('stage ladder is the glossary ladder', () => {
    expect(STUFEN).toEqual(['erkennen', 'luecke', 'abruf', 'anwendung'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/data/wortschatz.test.ts`
Expected: FAIL — module `src/data/wortschatz` does not exist.

- [ ] **Step 3: Implement**

`src/data/wortschatz.ts` (house header comment pointing at CONTEXT.md → "Vokabel"). Define the types above verbatim. `clozeParts` implementation:

```ts
export function clozeParts(satzDe: string): { before: string; blank: string; after: string } | null {
  const m = /^([^{}]*)\{\{([^{}]+)\}\}([^{}]*)$/.exec(satzDe)
  if (!m) return null
  return { before: m[1], blank: m[2], after: m[3] }
}
```

Each of the ten per-feld files exports `export const WORTSCHATZ_<FELD>: Vokabel[] = []` (typed, empty) EXCEPT `wortschatzUmwelt.ts`, which gets two bootstrap items so downstream tests have real data:

```ts
import type { Vokabel } from './wortschatz'

export const WORTSCHATZ_UMWELT: Vokabel[] = [
  {
    id: 'vk-umwelt-massnahme-ergreifen', feld: 'Umwelt', kind: 'wortverbindung',
    de: 'eine Maßnahme ergreifen', en: 'to take a measure',
    variants: ['Maßnahmen ergreifen'],
    saetze: [
      { de: 'Die Stadt hat endlich {{eine Maßnahme ergriffen}}, um den Lärm zu senken.',
        en: 'The city finally took a measure to reduce the noise.' },
      { de: 'Gegen die steigenden Emissionen müssen wir {{Maßnahmen ergreifen}}.',
        en: 'We must take measures against rising emissions.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-verpackung', feld: 'Umwelt', kind: 'einzelwort',
    de: 'die Verpackung', en: 'packaging', plural: 'Verpackungen',
    variants: [],
    saetze: [
      { de: 'Viele Produkte stecken in unnötig großer {{Verpackung}}.',
        en: 'Many products come in needlessly large packaging.' },
      { de: 'Der Laden verzichtet vollständig auf {{Verpackungen}} aus Plastik.',
        en: 'The shop completely does without plastic packaging.' }
    ],
    source: 'seed'
  }
]
```

`wortschatz.ts` aggregates: `export const WORTSCHATZ_VOKABELN: Vokabel[] = [...WORTSCHATZ_UMWELT, ...WORTSCHATZ_ARBEIT, /* …all ten */]`.

Note the bootstrap shows the cloze convention: **the blank holds the inflected form as it appears in that sentence** — grading compares against the blank text, not the canonical `de`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/data/wortschatz.test.ts` — Expected: PASS.
Also run: `npm run typecheck` — Expected: clean.

- [ ] **Step 5: Controller commits** — `feat(wortschatz): data types + seed scaffold`

---

### Task 2: Scheduler — FSRS wrapper + stage machine

**Files:**
- Create: `src/composables/wortschatzScheduler.ts`
- Test: `tests/composables/wortschatzScheduler.test.ts`

**Interfaces:**
- Consumes: `Stufe`, `STUFEN` from `src/data/wortschatz.ts`; `ts-fsrs` (`fsrs`, `generatorParameters`, `createEmptyCard`, `Rating`, type `Card`).
- Produces:

```ts
export interface StoredFsrsCard {          // plain JSON — epochs, never Date
  due: number; stability: number; difficulty: number
  elapsed_days: number; scheduled_days: number; learning_steps: number
  reps: number; lapses: number; state: number; last_review?: number
}
export interface VokabelProgress {
  vokabelId: string
  stufe: Stufe
  gatePasses: number
  gefestigt: boolean
  learnedVariants: string[]     // AI-rescued answers, accepted locally from then on
  fsrs: StoredFsrsCard
  introducedAt: number
  updatedAt: number
}
export type AnswerOutcome = 'wrong' | 'hint' | 'correct'
export const DESIRED_RETENTION = 0.9
export const GEFESTIGT_MIN_ELAPSED_DAYS = 21
export const GATE: Record<Stufe, number>  // { erkennen: 2, luecke: 3, abruf: 3, anwendung: 1 }
export function newProgress(vokabelId: string, now: number): VokabelProgress
export function applyOutcome(
  p: VokabelProgress, outcome: AnswerOutcome, now: number, servedStufe: Stufe
): VokabelProgress                        // pure — returns a NEW plain object
export function isDue(p: VokabelProgress, now: number): boolean
```

- [ ] **Step 1: Write the failing test**

`tests/composables/wortschatzScheduler.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  newProgress, applyOutcome, isDue, GATE, GEFESTIGT_MIN_ELAPSED_DAYS
} from '../../src/composables/wortschatzScheduler'

const NOW = Date.parse('2026-08-21T10:00:00Z')
const DAY = 24 * 60 * 60 * 1000

describe('wortschatzScheduler', () => {
  it('newProgress starts at erkennen, due now, not gefestigt', () => {
    const p = newProgress('vk-x', NOW)
    expect(p.stufe).toBe('erkennen')
    expect(p.gefestigt).toBe(false)
    expect(p.gatePasses).toBe(0)
    expect(isDue(p, NOW)).toBe(true)
    expect(typeof p.fsrs.due).toBe('number')   // plain JSON, no Date
  })

  it('clean passes promote after the gate', () => {
    let p = newProgress('vk-x', NOW)
    p = applyOutcome(p, 'correct', NOW, 'erkennen')
    expect(p.stufe).toBe('erkennen')
    expect(p.gatePasses).toBe(1)
    p = applyOutcome(p, 'correct', NOW + DAY, 'erkennen')
    expect(p.stufe).toBe('luecke')             // GATE.erkennen = 2
    expect(p.gatePasses).toBe(0)
  })

  it('a miss demotes one rung, never below erkennen, and resets the gate', () => {
    let p = newProgress('vk-x', NOW)
    p = { ...p, stufe: 'abruf', gatePasses: 2 }
    p = applyOutcome(p, 'wrong', NOW, 'abruf')
    expect(p.stufe).toBe('luecke')
    expect(p.gatePasses).toBe(0)
    p = { ...p, stufe: 'erkennen' }
    p = applyOutcome(p, 'wrong', NOW, 'erkennen')
    expect(p.stufe).toBe('erkennen')
  })

  it('hint neither promotes nor demotes but reschedules', () => {
    let p = newProgress('vk-x', NOW)
    const before = p.fsrs.due
    p = applyOutcome(p, 'hint', NOW, 'erkennen')
    expect(p.stufe).toBe('erkennen')
    expect(p.gatePasses).toBe(0)
    expect(p.fsrs.due).toBeGreaterThan(before - 1) // rescheduled (Hard)
  })

  it('served-below-stage (offline fallback) rates FSRS but never promotes', () => {
    let p = newProgress('vk-x', NOW)
    p = { ...p, stufe: 'anwendung', gatePasses: 0 }
    p = applyOutcome(p, 'correct', NOW, 'abruf')  // served as Abruf
    expect(p.stufe).toBe('anwendung')
    expect(p.gatePasses).toBe(0)
    expect(p.gefestigt).toBe(false)
    // a wrong answer at the lower format still demotes:
    p = applyOutcome(p, 'wrong', NOW, 'abruf')
    expect(p.stufe).toBe('abruf')
  })

  it('gefestigt requires a clean anwendung pass ≥21 elapsed days', () => {
    let p = newProgress('vk-x', NOW)
    p = { ...p, stufe: 'anwendung', fsrs: { ...p.fsrs, last_review: NOW - 5 * DAY } }
    p = applyOutcome(p, 'correct', NOW, 'anwendung')
    expect(p.gefestigt).toBe(false)               // only 5 elapsed days
    p = { ...p, stufe: 'anwendung', gefestigt: false,
          fsrs: { ...p.fsrs, last_review: NOW - (GEFESTIGT_MIN_ELAPSED_DAYS + 1) * DAY } }
    p = applyOutcome(p, 'correct', NOW + DAY, 'anwendung')
    expect(p.gefestigt).toBe(true)
    expect(isDue(p, NOW + 400 * DAY)).toBe(false) // gefestigt leaves the queue for good
  })

  it('expanding schedule: a second Good schedules further out than the first', () => {
    let p = newProgress('vk-x', NOW)
    p = applyOutcome(p, 'correct', NOW, 'erkennen')
    const first = p.fsrs.due - NOW
    p = applyOutcome(p, 'correct', p.fsrs.due, 'erkennen')
    const second = p.fsrs.due - (NOW + first)
    expect(second).toBeGreaterThan(first)
    expect(GATE.luecke).toBe(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/composables/wortschatzScheduler.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

`src/composables/wortschatzScheduler.ts` — header comment referencing ADR-0027, `No Vue/DOM.` Core:

```ts
import { fsrs, generatorParameters, createEmptyCard, Rating, type Card } from 'ts-fsrs'
import { STUFEN, type Stufe } from '../data/wortschatz'

const scheduler = fsrs(generatorParameters({ request_retention: DESIRED_RETENTION }))

function toCard(s: StoredFsrsCard): Card {
  return {
    due: new Date(s.due), stability: s.stability, difficulty: s.difficulty,
    elapsed_days: s.elapsed_days, scheduled_days: s.scheduled_days,
    learning_steps: s.learning_steps, reps: s.reps, lapses: s.lapses,
    state: s.state as Card['state'],
    ...(s.last_review != null ? { last_review: new Date(s.last_review) } : {})
  } as Card
}
function fromCard(c: Card): StoredFsrsCard {
  return {
    due: c.due.getTime(), stability: c.stability, difficulty: c.difficulty,
    elapsed_days: c.elapsed_days, scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps, reps: c.reps, lapses: c.lapses,
    state: c.state, ...(c.last_review ? { last_review: c.last_review.getTime() } : {})
  }
}

const RATING = { wrong: Rating.Again, hint: Rating.Hard, correct: Rating.Good } as const

export function newProgress(vokabelId: string, now: number): VokabelProgress {
  return {
    vokabelId, stufe: 'erkennen', gatePasses: 0, gefestigt: false,
    learnedVariants: [], fsrs: fromCard(createEmptyCard(new Date(now))),
    introducedAt: now, updatedAt: now
  }
}

export function applyOutcome(
  p: VokabelProgress, outcome: AnswerOutcome, now: number, servedStufe: Stufe
): VokabelProgress {
  const elapsedDays = p.fsrs.last_review != null
    ? (now - p.fsrs.last_review) / 86_400_000 : 0
  const next = fromCard(scheduler.next(toCard(p.fsrs), new Date(now), RATING[outcome]).card)

  let stufe = p.stufe
  let gatePasses = p.gatePasses
  let gefestigt = p.gefestigt
  const idx = STUFEN.indexOf(p.stufe)
  if (outcome === 'wrong') {
    stufe = STUFEN[Math.max(0, idx - 1)]
    gatePasses = 0
  } else if (outcome === 'correct' && servedStufe === p.stufe) {
    if (p.stufe === 'anwendung' && elapsedDays >= GEFESTIGT_MIN_ELAPSED_DAYS) {
      gefestigt = true
    } else if (gatePasses + 1 >= GATE[p.stufe] && idx < STUFEN.length - 1) {
      stufe = STUFEN[idx + 1]
      gatePasses = 0
    } else {
      gatePasses = gatePasses + 1
    }
  }
  // 'hint' and served-below-stage 'correct': schedule moves, gate does not.
  return { ...p, stufe, gatePasses, gefestigt, fsrs: next, updatedAt: now }
}

export function isDue(p: VokabelProgress, now: number): boolean {
  return !p.gefestigt && p.fsrs.due <= now
}
```

(Plus the exported constants/types from the Interfaces block; `GATE = { erkennen: 2, luecke: 3, abruf: 3, anwendung: 1 }`.)

- [ ] **Step 4: Run tests** — `npx vitest run tests/composables/wortschatzScheduler.test.ts` PASS; `npm run typecheck` clean.
- [ ] **Step 5: Controller commits** — `feat(wortschatz): FSRS scheduler + Vokabelstufe machine`

---

### Task 3: Local grading — strict core, tolerant edges

**Files:**
- Create: `src/composables/wortschatzGrading.ts`
- Test: `tests/composables/wortschatzGrading.test.ts`

**Interfaces:**
- Consumes: `Vokabel` from `src/data/wortschatz.ts`. Does NOT reuse `foldGerman` from `drillGrading.ts` — umlaut folding would accept misspellings a writing exam grades; this module normalizes without folding umlauts.
- Produces:

```ts
export type WrongReason = 'article' | 'preposition' | 'ending' | 'word' | 'empty'
export interface GradeResult { correct: boolean; reason?: WrongReason }
export function normalizeAnswer(s: string): string
export function gradeAgainst(expected: string, given: string): GradeResult
export function gradeVokabelAnswer(
  v: Pick<Vokabel, 'de' | 'variants'>, expectedText: string, given: string,
  learnedVariants?: string[]
): GradeResult
```

Semantics `gradeVokabelAnswer`: `given` is checked against `expectedText` (a cloze blank or the canonical `de`), and — only when `expectedText === v.de` — also against `v.variants` and `learnedVariants`; first `correct` wins, otherwise the result from `expectedText` is returned.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { gradeAgainst, gradeVokabelAnswer, normalizeAnswer } from '../../src/composables/wortschatzGrading'

describe('wortschatzGrading', () => {
  it('normalizes whitespace/case, equates ß and ss, keeps umlauts', () => {
    expect(normalizeAnswer('  die  Maßnahme ')).toBe('die massnahme')
    expect(normalizeAnswer('die Massnahme')).toBe('die massnahme')
    expect(normalizeAnswer('die Mahnahme')).not.toBe('die massnahme')
    expect(normalizeAnswer('über')).toBe('über') // umlauts NOT folded
  })

  it('exact and variant matches are correct', () => {
    expect(gradeAgainst('eine Maßnahme ergreifen', 'eine  maßnahme ergreifen').correct).toBe(true)
    const v = { de: 'eine Maßnahme ergreifen', variants: ['Maßnahmen ergreifen'] }
    expect(gradeVokabelAnswer(v, v.de, 'Maßnahmen ergreifen').correct).toBe(true)
    expect(gradeVokabelAnswer(v, v.de, 'schnell handeln').correct).toBe(false)
  })

  it('article slips are wrong with reason article', () => {
    const r = gradeAgainst('die Maßnahme', 'der Maßnahme')
    expect(r.correct).toBe(false)
    expect(r.reason).toBe('article')
  })

  it('preposition slips are wrong with reason preposition', () => {
    const r = gradeAgainst('auf etwas angewiesen sein', 'an etwas angewiesen sein')
    expect(r.correct).toBe(false)
    expect(r.reason).toBe('preposition')
  })

  it('ending slips are wrong even at Levenshtein 1', () => {
    const r = gradeAgainst('Maßnahmen ergreifen', 'Maßnahmen ergreifem')
    expect(r.correct).toBe(false)
    expect(r.reason).toBe('ending')
  })

  it('a 1-char typo mid-word in a long word is forgiven', () => {
    expect(gradeAgainst('die Verpackung', 'die Verpakung').correct).toBe(true)   // deletion mid-word
    expect(gradeAgainst('die Verpackung', 'die Ferpackung').correct).toBe(true)  // substitution at start
  })

  it('short words get no typo tolerance', () => {
    expect(gradeAgainst('der Müll', 'der Mull').correct).toBe(false)
  })

  it('learned variants are accepted', () => {
    const v = { de: 'eine Maßnahme ergreifen', variants: [] }
    expect(gradeVokabelAnswer(v, v.de, 'zu einer Maßnahme greifen', ['zu einer Maßnahme greifen']).correct).toBe(true)
  })

  it('token-count mismatch and empty input are wrong', () => {
    expect(gradeAgainst('die Maßnahme', 'Maßnahme').reason).toBe('word')
    expect(gradeAgainst('die Maßnahme', '  ').reason).toBe('empty')
  })
})
```

- [ ] **Step 2: Run to verify FAIL** — `npx vitest run tests/composables/wortschatzGrading.test.ts`

- [ ] **Step 3: Implement**

Rules (implement exactly):
- `normalizeAnswer`: trim → collapse whitespace → lowercase → `ß`→`ss`. No umlaut folding.
- Tokenize both strings on single spaces. Different token counts → `{correct:false, reason:'word'}`. Empty given → `'empty'`.
- Closed classes compared exactly per token:
  - `ARTICLES = ['der','die','das','den','dem','des','ein','eine','einen','einem','einer','eines']`
  - `PREPOSITIONS = ['an','auf','aus','bei','für','gegen','hinter','in','mit','nach','neben','ohne','seit','über','um','unter','von','vor','zu','zwischen','durch','trotz','während','wegen']`
  - Mismatch where the expected token is in a closed class → reason `'article'` / `'preposition'`. (Check the *expected* token's class; if the given differs at that token, that's the reason.)
- Open-class tokens: exact match, else Levenshtein distance 1 allowed only when the expected token has length ≥ 6 AND the two tokens agree on their last two characters (else reason `'ending'` if lengths ≥ 3 and distance ≤ 2 and last-two differ; otherwise `'word'`).
- Implement a small `levenshtein(a, b): number` inline (classic DP, both strings ≤ 40 chars — cap loops there).
- First failing token determines `reason`; any failing token makes the whole answer wrong.

- [ ] **Step 4: Run tests** — PASS; `npm run typecheck` clean.
- [ ] **Step 5: Controller commits** — `feat(wortschatz): local strict-core grading`

---

### Task 4: Dexie v17 + progress store

**Files:**
- Modify: `src/db/index.ts` (add version 17 + three table declarations)
- Create: `src/composables/useWortschatzProgress.ts`
- Test: `tests/composables/useWortschatzProgress.test.ts`

**Interfaces:**
- Consumes: `VokabelProgress` from `wortschatzScheduler.ts`; `Vokabel`, `KontextSatz`, `WORTSCHATZ_VOKABELN`, `THEMENFELDER` from `../data/wortschatz`; `isDue` from `wortschatzScheduler.ts`; `db` from `../db`.
- Produces:

```ts
export interface CachedExtraSaetze { vokabelId: string; saetze: KontextSatz[]; generatedAt: number }
export async function allVokabeln(): Promise<Vokabel[]>          // seeds + db.wortschatzCustom
export async function vokabelnByFeld(feld: Themenfeld): Promise<Vokabel[]>
export async function readAllProgress(): Promise<Map<string, VokabelProgress>>
export async function saveProgress(p: VokabelProgress): Promise<void>
export async function addCustomVokabeln(items: Vokabel[]): Promise<void>
export async function loadExtraSaetze(vokabelId: string): Promise<KontextSatz[]>
export async function saveExtraSaetze(vokabelId: string, saetze: KontextSatz[]): Promise<void>
export interface FeldSummary {
  feld: Themenfeld; total: number; neu: number; inArbeit: number; gefestigt: number; faellig: number
}
export async function feldSummaries(now: number): Promise<FeldSummary[]>   // one per THEMENFELDER, in order
export async function dueVokabeln(now: number): Promise<Array<{ v: Vokabel; p: VokabelProgress }>>
export async function dueVokabelCount(now: number): Promise<number>        // Tagesplan reader
```

- [ ] **Step 1: Dexie v17.** In `src/db/index.ts` add table declarations:

```ts
/** Wortschatz per-Vokabel FSRS + Stufe state (ADR-0027). */
wortschatzProgress!: Table<VokabelProgress, string>
/** Learner-owned AI-generated Vokabeln (CONTEXT.md → "Vokabel"). */
wortschatzCustom!: Table<Vokabel, string>
/** Cached AI-generated extra context sentences per Vokabel. */
wortschatzSaetze!: Table<CachedExtraSaetze, string>
```

and a `version(17)` block that repeats version(16)'s stores plus:

```ts
wortschatzProgress: 'vokabelId',
wortschatzCustom: '&id, feld',
wortschatzSaetze: 'vokabelId'
```

Purely additive — no upgrade hook (comment it like version(11) does). Types import from `../composables/wortschatzScheduler` and `../data/wortschatz` (type-only imports keep the dependency direction clean).

- [ ] **Step 2: Write the failing test**

`tests/composables/useWortschatzProgress.test.ts` (fake-indexeddb is auto-loaded via `tests/setup.ts`):

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db'
import {
  allVokabeln, readAllProgress, saveProgress, addCustomVokabeln,
  feldSummaries, dueVokabeln, dueVokabelCount, saveExtraSaetze, loadExtraSaetze
} from '../../src/composables/useWortschatzProgress'
import { newProgress, applyOutcome } from '../../src/composables/wortschatzScheduler'
import { WORTSCHATZ_VOKABELN } from '../../src/data/wortschatz'

const NOW = Date.parse('2026-08-21T10:00:00Z')

beforeEach(async () => {
  await db.wortschatzProgress.clear()
  await db.wortschatzCustom.clear()
  await db.wortschatzSaetze.clear()
})

describe('useWortschatzProgress', () => {
  it('allVokabeln = seeds + custom', async () => {
    const before = (await allVokabeln()).length
    expect(before).toBe(WORTSCHATZ_VOKABELN.length)
    await addCustomVokabeln([{
      id: 'vk-custom-1-0', feld: 'Umwelt', kind: 'einzelwort', de: 'der Test',
      en: 'test', plural: 'Tests', variants: [], source: 'custom',
      saetze: [
        { de: 'Ein {{Test}} läuft.', en: 'A test is running.' },
        { de: 'Der {{Test}} war gut.', en: 'The test was good.' }
      ]
    }])
    expect((await allVokabeln()).length).toBe(before + 1)
  })

  it('progress round-trips through Dexie as plain JSON', async () => {
    const p = newProgress(WORTSCHATZ_VOKABELN[0].id, NOW)
    await saveProgress(p)
    const back = (await readAllProgress()).get(p.vokabelId)
    expect(back).toEqual(p)
  })

  it('feldSummaries counts neu / inArbeit / gefestigt / faellig', async () => {
    const [a, b] = WORTSCHATZ_VOKABELN.filter(v => v.feld === 'Umwelt')
    await saveProgress(newProgress(a.id, NOW))                     // inArbeit + fällig (due=now)
    const done = { ...newProgress(b.id, NOW), gefestigt: true }
    await saveProgress(done)
    const umwelt = (await feldSummaries(NOW)).find(s => s.feld === 'Umwelt')!
    expect(umwelt.gefestigt).toBe(1)
    expect(umwelt.inArbeit).toBe(1)
    expect(umwelt.faellig).toBe(1)
    expect(umwelt.neu).toBe(umwelt.total - 2)
  })

  it('dueVokabeln joins item + progress; gefestigt excluded', async () => {
    const [a, b] = WORTSCHATZ_VOKABELN.filter(v => v.feld === 'Umwelt')
    await saveProgress(newProgress(a.id, NOW))
    await saveProgress({ ...newProgress(b.id, NOW), gefestigt: true })
    const due = await dueVokabeln(NOW)
    expect(due.map(d => d.v.id)).toEqual([a.id])
    expect(await dueVokabelCount(NOW)).toBe(1)
  })

  it('extra sentences round-trip', async () => {
    await saveExtraSaetze('vk-x', [{ de: 'Ein {{Wort}}.', en: 'A word.' }])
    expect((await loadExtraSaetze('vk-x'))).toHaveLength(1)
    expect(await loadExtraSaetze('vk-none')).toEqual([])
  })
})
```

- [ ] **Step 3: Run to verify FAIL**, then implement `useWortschatzProgress.ts`.

Implementation notes:
- House header comment; this file is the *only* reader/writer of the three tables.
- `saveProgress` must `put()` a rebuilt plain literal (`{ ...p, fsrs: { ...p.fsrs }, learnedVariants: [...p.learnedVariants] }`) — never a component-owned proxy (see the Dexie structured-clone project memory).
- `dueVokabeln`: `readAllProgress()` once, `allVokabeln()` once, join in memory, filter `isDue(p, now)`, sort most-overdue first (`p.fsrs.due` ascending).
- `feldSummaries`: `neu` = items with no progress row; `inArbeit` = rows not gefestigt; `faellig` = subset of inArbeit due now.
- Unknown progress rows (vokabelId matching no seed/custom item — e.g. a deleted custom item) are excluded from every read, mirroring `useDativeLedger`'s read-side guard.

- [ ] **Step 4: Run tests** — `npx vitest run tests/composables/useWortschatzProgress.test.ts` PASS; `npm run typecheck`; also `npx vitest run tests/smoke.test.ts` (db schema change smoke).
- [ ] **Step 5: Controller commits** — `feat(wortschatz): Dexie v17 + progress store`

---

### Task 5: Queue building (pure)

**Files:**
- Create: `src/composables/wortschatzQueue.ts`
- Test: `tests/composables/wortschatzQueue.test.ts`

**Interfaces:**
- Consumes: `Vokabel` from `../data/wortschatz`; `VokabelProgress` from `./wortschatzScheduler`.
- Produces:

```ts
export type Rng = () => number   // Math.random-compatible; tests pass a seeded stub
export function buildLernAuswahl(unseen: Vokabel[], count?: number, rng?: Rng): Vokabel[]
// count defaults to 7 (glossary: 5–8); result mixes kinds: when the pool allows,
// at least ceil(count/3) wortverbindungen AND at least ceil(count/3) einzelwörter.
export function buildWiederholQueue<T extends { v: Vokabel }>(due: T[], rng?: Rng): T[]
// input arrives most-overdue-first; output preserves that bias but breaks
// same-feld adjacency whenever another feld is available (interleaved review).
export function pickErkennenOptions(v: Vokabel, pool: Vokabel[], rng?: Rng): string[]
// 4 English glosses: v.en + 3 distractors, same feld & kind preferred,
// topped up cross-feld same-kind, then any; deduped; shuffled; always includes v.en.
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { buildLernAuswahl, buildWiederholQueue, pickErkennenOptions } from '../../src/composables/wortschatzQueue'
import type { Vokabel } from '../../src/data/wortschatz'

function mk(id: string, feld: string, kind: 'einzelwort' | 'wortverbindung', en = id): Vokabel {
  return { id, feld: feld as Vokabel['feld'], kind, de: id, en, variants: [], saetze: [
    { de: `Ein {{${id}}} hier.`, en: 'x' }, { de: `Noch ein {{${id}}}.`, en: 'y' }
  ], source: 'seed' }
}
const seq = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length] }

describe('wortschatzQueue', () => {
  it('buildLernAuswahl mixes kinds and respects count', () => {
    const pool = [
      ...Array.from({ length: 10 }, (_, i) => mk(`ew${i}`, 'Umwelt', 'einzelwort')),
      ...Array.from({ length: 10 }, (_, i) => mk(`wv${i}`, 'Umwelt', 'wortverbindung'))
    ]
    const picked = buildLernAuswahl(pool, 7, seq([0.5]))
    expect(picked).toHaveLength(7)
    expect(picked.filter(v => v.kind === 'wortverbindung').length).toBeGreaterThanOrEqual(3)
    expect(picked.filter(v => v.kind === 'einzelwort').length).toBeGreaterThanOrEqual(3)
    expect(new Set(picked.map(v => v.id)).size).toBe(7)
  })

  it('buildLernAuswahl with a small pool returns the whole pool', () => {
    const pool = [mk('a', 'Umwelt', 'einzelwort'), mk('b', 'Umwelt', 'wortverbindung')]
    expect(buildLernAuswahl(pool, 7, seq([0.1]))).toHaveLength(2)
  })

  it('buildWiederholQueue breaks same-feld adjacency when possible', () => {
    const due = [
      { v: mk('u1', 'Umwelt', 'einzelwort') }, { v: mk('u2', 'Umwelt', 'einzelwort') },
      { v: mk('u3', 'Umwelt', 'einzelwort') }, { v: mk('a1', 'Arbeit', 'einzelwort') },
      { v: mk('a2', 'Arbeit', 'einzelwort') }, { v: mk('k1', 'Konsum', 'einzelwort') }
    ]
    const q = buildWiederholQueue(due, seq([0.3]))
    expect(q).toHaveLength(6)
    let adjacent = 0
    for (let i = 1; i < q.length; i++) if (q[i].v.feld === q[i - 1].v.feld) adjacent++
    expect(adjacent).toBe(0)   // 3+2+1 across three fields is fully interleavable
  })

  it('single-feld queue survives (adjacency unavoidable)', () => {
    const due = [{ v: mk('u1', 'Umwelt', 'einzelwort') }, { v: mk('u2', 'Umwelt', 'einzelwort') }]
    expect(buildWiederholQueue(due, seq([0.5]))).toHaveLength(2)
  })

  it('pickErkennenOptions returns 4 unique glosses including the right one', () => {
    const target = mk('t', 'Umwelt', 'einzelwort', 'target gloss')
    const pool = [target,
      mk('d1', 'Umwelt', 'einzelwort', 'g1'), mk('d2', 'Umwelt', 'einzelwort', 'g2'),
      mk('d3', 'Arbeit', 'einzelwort', 'g3'), mk('d4', 'Umwelt', 'wortverbindung', 'g4')
    ]
    const opts = pickErkennenOptions(target, pool, seq([0.2]))
    expect(opts).toHaveLength(4)
    expect(opts).toContain('target gloss')
    expect(new Set(opts).size).toBe(4)
  })
})
```

- [ ] **Step 2: FAIL**, then implement. Interleave algorithm (greedy, deterministic given rng): walk the overdue-ordered list; maintain the last emitted feld; pick the earliest remaining entry whose feld differs, else the earliest entry. Kind-mix sampling: shuffle (Fisher-Yates with rng) each kind bucket, take the per-kind minimum from each, fill the rest from the merged shuffled remainder. `No Vue/DOM.`
- [ ] **Step 3: Run tests** — PASS; typecheck clean.
- [ ] **Step 4: Controller commits** — `feat(wortschatz): Lern-Auswahl + interleaved due queue`

---

### Task 6: AI composable — expansion, extra sentences, rescue, Anwendung grading

**Files:**
- Create: `src/composables/useWortschatzAi.ts`
- Test: `tests/composables/useWortschatzAi.test.ts`

**Interfaces:**
- Consumes: `GeminiClient` shape (copy the local interface pattern from `useSchreibenArguments.ts:24-32`); `Vokabel`, `KontextSatz`, `Themenfeld`, `clozeParts` from `../data/wortschatz`.
- Produces:

```ts
export interface GeminiClient { models: { generateContent: (opts: {
  model: string; contents: string; config?: Record<string, unknown>
}) => Promise<{ text?: string }> } }

export function buildVokabelnPrompt(feld: Themenfeld, existingDe: string[], count?: number): string
export async function generateVokabeln(
  client: GeminiClient, model: string, feld: Themenfeld, existingDe: string[], count = 8, maxRetries = 2
): Promise<Array<Omit<Vokabel, 'id' | 'source'>>>       // caller assigns id 'vk-custom-<epoch>-<i>' + source:'custom'

export function buildExtraSaetzePrompt(v: Vokabel): string
export async function generateExtraSaetze(client: GeminiClient, model: string, v: Vokabel, maxRetries = 2): Promise<KontextSatz[]>  // exactly 3

export function buildRescuePrompt(v: Vokabel, expected: string, given: string): string
export async function judgeRescue(
  client: GeminiClient, model: string, v: Vokabel, expected: string, given: string
): Promise<{ acceptable: boolean; begruendung: string }>  // single attempt; throw on parse failure (caller treats as not rescued)

export function buildAnwendungPrompt(v: Vokabel, sentence: string): string
export async function gradeAnwendung(
  client: GeminiClient, model: string, v: Vokabel, sentence: string, maxRetries = 2
): Promise<{ correct: boolean; feedback: string; korrektur?: string }>
```

- [ ] **Step 1: Write the failing test** — use a fake client (queue of canned responses), no network:

```ts
import { describe, it, expect } from 'vitest'
import {
  buildVokabelnPrompt, generateVokabeln, buildRescuePrompt, judgeRescue,
  buildAnwendungPrompt, gradeAnwendung, generateExtraSaetze
} from '../../src/composables/useWortschatzAi'
import { WORTSCHATZ_VOKABELN } from '../../src/data/wortschatz'

function fakeClient(responses: string[]) {
  let i = 0
  return { models: { generateContent: async () => ({ text: responses[Math.min(i++, responses.length - 1)] }) } }
}
const V = WORTSCHATZ_VOKABELN[0]

const GOOD_ITEM = {
  kind: 'einzelwort', de: 'die Mülltrennung', en: 'waste separation', plural: '',
  variants: [], saetze: [
    { de: 'Konsequente {{Mülltrennung}} spart Rohstoffe.', en: 'Consistent waste separation saves resources.' },
    { de: 'Ohne {{Mülltrennung}} landet alles in einer Tonne.', en: 'Without waste separation everything ends up in one bin.' }
  ]
}

describe('useWortschatzAi', () => {
  it('prompts spell out the JSON envelope in prose and forbid fences', () => {
    const p = buildVokabelnPrompt('Umwelt', ['die Verpackung'], 8)
    expect(p).toContain('{"vokabeln"')
    expect(p.toLowerCase()).toContain('keine markdown')
    expect(p).toContain('die Verpackung')          // exclusion list is in the prompt
    expect(buildRescuePrompt(V, V.de, 'x')).toContain('"acceptable"')
    expect(buildAnwendungPrompt(V, 'Satz.')).toContain('"correct"')
  })

  it('generateVokabeln validates and returns items; retries on garbage', async () => {
    const good = JSON.stringify({ vokabeln: [GOOD_ITEM] })
    const items = await generateVokabeln(fakeClient(['not json', good]), 'm', 'Umwelt', [], 8)
    expect(items).toHaveLength(1)
    expect(items[0].de).toBe('die Mülltrennung')
  })

  it('generateVokabeln rejects items whose Satz lacks a blank', async () => {
    const bad = JSON.stringify({ vokabeln: [{ ...GOOD_ITEM, saetze: [
      { de: 'Kein Blank.', en: 'x' }, GOOD_ITEM.saetze[1]
    ] }] })
    await expect(generateVokabeln(fakeClient([bad, bad, bad]), 'm', 'Umwelt', [], 8))
      .rejects.toThrow()
  })

  it('judgeRescue parses the verdict', async () => {
    const res = await judgeRescue(
      fakeClient([JSON.stringify({ acceptable: true, begruendung: 'Gleiche Wendung, andere Zahl.' })]),
      'm', V, V.de, 'Maßnahmen ergreifen')
    expect(res.acceptable).toBe(true)
  })

  it('gradeAnwendung parses verdict + feedback', async () => {
    const res = await gradeAnwendung(
      fakeClient([JSON.stringify({ correct: false, feedback: 'Kasus falsch.', korrektur: '…' })]),
      'm', V, 'Wir ergreifen einer Maßnahme.')
    expect(res.correct).toBe(false)
    expect(res.feedback).toContain('Kasus')
  })

  it('generateExtraSaetze returns exactly 3 blanked sentences', async () => {
    const good = JSON.stringify({ saetze: [
      { de: 'A {{Maßnahme}} eins.', en: 'one' }, { de: 'B {{Maßnahme}} zwei.', en: 'two' },
      { de: 'C {{Maßnahme}} drei.', en: 'three' }
    ] })
    expect(await generateExtraSaetze(fakeClient([good]), 'm', V)).toHaveLength(3)
  })
})
```

- [ ] **Step 2: FAIL**, then implement. Prompt requirements (all German, mirroring `buildSchreibArgumentBankPrompt`'s style):
  - **Vokabeln**: B2, schriftsprachlich, exam-register für das Themenfeld; mix `einzelwort`/`wortverbindung` (mindestens 3 Wortverbindungen pro 8); Nomen IMMER mit Artikel und mit `plural` (`''` wenn keiner); `rektion` angeben, wenn das Item eine feste Präposition + Kasus regiert; JEDES Item mit genau 2 Beispielsätzen, in denen die (flektierte!) Form in `{{…}}` steht; NICHT verwenden: die Wörter der Ausschlussliste (existingDe). Envelope: `{"vokabeln": [{"kind": "einzelwort"|"wortverbindung", "de": "…", "en": "…", "plural": "…", "rektion": "…", "variants": ["…"], "saetze": [{"de": "…", "en": "…"}, {"de": "…", "en": "…"}]}]}` — spelled out in prose, „keine Markdown-Fences".
  - **Validator** for each item: kind valid; de/en nonempty; if de starts with `der |die |das ` → plural must be a string; both saetze have `clozeParts() !== null`; drop invalid items; if none survive → retry; after maxRetries → throw.
  - **Rescue**: name the item (`de`, `en`, expected inflected form, the sentence context if any); question: is `given` an acceptable form OF EXACTLY THIS ITEM (Flexion, Zahl, zulässige Variante) — „Ein Synonym oder ein anderes Wort ist NICHT akzeptabel" (Präzise's spirit). Envelope `{"acceptable": true|false, "begruendung": "…"}`.
  - **Anwendung**: grade the learner's own sentence: (1) enthält der Satz das Item in korrekter Flexion, (2) ist die Verwendung grammatisch korrekt (Kasus/Rektion: name `v.rektion` when present), (3) passt das Register (geschriebenes B2)? Unrelated slips elsewhere: mention in feedback, do NOT fail the card for them. Envelope `{"correct": true|false, "feedback": "…", "korrektur": "…"}` (korrektur = corrected sentence, only when wrong).
- [ ] **Step 3: Run tests** — PASS; typecheck clean.
- [ ] **Step 4: Controller commits** — `feat(wortschatz): AI expansion/rescue/Anwendung grading`

---

### Task 7: History types + Tagesplan row

**Files:**
- Modify: `src/composables/useQuizHistory.ts` (QuizHistoryType union at line ~7-82; QuizHistoryMeta at ~178)
- Modify: `src/composables/useTagesplan.ts` (buildTagesplan)
- Test: modify `tests/composables/useTagesplan.test.ts` (exists — extend it; if the file is missing, create it following the existing test style)

**Interfaces:**
- Consumes: `dueVokabelCount(now)` from `useWortschatzProgress.ts`.
- Produces: history types `'wortschatz-lernen' | 'wortschatz-wiederholen'`; meta field `wortschatzFeld?: string`; Tagesplan row id `'wortschatz-faellig'`.

- [ ] **Step 1: Write the failing test** (extend the Tagesplan test):

```ts
it('adds the fällige-Vokabeln row when Vokabeln are due', async () => {
  const { newProgress } = await import('../../src/composables/wortschatzScheduler')
  const { saveProgress } = await import('../../src/composables/useWortschatzProgress')
  const { WORTSCHATZ_VOKABELN } = await import('../../src/data/wortschatz')
  const now = Date.now()
  await saveProgress(newProgress(WORTSCHATZ_VOKABELN[0].id, now - 1000))
  const rows = await buildTagesplan([], now)
  const row = rows.find(r => r.id === 'wortschatz-faellig')
  expect(row).toBeDefined()
  expect(row!.route).toBe('wortschatz')
  expect(row!.count).toBe(1)
  expect(row!.detail).toContain('fällig')
})
```

(Reset `db.wortschatzProgress` in the test's beforeEach.)

- [ ] **Step 2: FAIL**, then implement:
  - Union: add `| 'wortschatz-lernen' | 'wortschatz-wiederholen'` at the end of `QuizHistoryType`.
  - Meta: add `wortschatzFeld?: string` with a one-line comment, near the other module blocks.
  - Tagesplan: insert between the Korrekturdrill block and the Dativ block:

```ts
// 2 — Wortschatz: fällige Vokabeln (ADR-0027 schedule, read through the
// module's own reader; the row deep-links to the hub, never samples).
try {
  const due = await dueVokabelCount(now)
  if (due > 0) {
    rows.push({
      id: 'wortschatz-faellig',
      title: 'Wortschatz · Fällige Vokabeln',
      detail: `${due} fällig`,
      route: 'wortschatz',
      count: due,
    })
  }
} catch { /* fail-soft */ }
```

  - Then grep `grep -rn "sentence-packed" src/` — every label map / switch that lists history types (History page, stats) gains the two new types with labels `'Wortschatz · Lernen'` and `'Wortschatz · Wiederholen'`. Extend each site found; do not skip any.
- [ ] **Step 3: Run tests** — the Tagesplan test file + `npx vitest run tests/composables/useQuizHistory.test.ts` PASS; typecheck clean.
- [ ] **Step 4: Controller commits** — `feat(wortschatz): history types + Tagesplan row`

---

### Task 8: Routes, nav, hub view

**Files:**
- Modify: `src/router.ts`, `src/data/nav.ts`
- Create: `src/modules/wortschatz/WortschatzHome.vue`
- Test: `tests/modules/wortschatz/WortschatzHome.test.ts`

**Interfaces:**
- Consumes: `feldSummaries`, `dueVokabelCount`, `addCustomVokabeln` from `useWortschatzProgress.ts`; `generateVokabeln` from `useWortschatzAi.ts`; `useSettings` + `resolveAiClient` (see `src/composables/localClaude.ts:134-143`); `THEMENFELDER`, `STUFE_LABEL`.
- Produces: routes `wortschatz` (`/wortschatz`), `wortschatz-lernen-run` (`/wortschatz/lernen/run`), `wortschatz-wiederholen-run` (`/wortschatz/wiederholen/run`); nav entry.

- [ ] **Step 1: Router.** After the Schreiben block in `src/router.ts`:

```ts
// Wortschatz (B2 Themenwortschatz — CONTEXT.md → Themenfeld/Vokabel). Route
// names share the head 'wortschatz' for NavShell's name.split('-')[0] tab.
{ path: '/wortschatz', name: 'wortschatz', component: () => import('./modules/wortschatz/WortschatzHome.vue') },
{ path: '/wortschatz/lernen/run', name: 'wortschatz-lernen-run', component: () => import('./modules/wortschatz/LernenRunner.vue') },
{ path: '/wortschatz/wiederholen/run', name: 'wortschatz-wiederholen-run', component: () => import('./modules/wortschatz/WiederholenRunner.vue') }
```

(The two runner views land in Tasks 10–11; create placeholder files now — minimal `<template><div /></template>` SFCs with a TODO-free comment header naming their task — so the router import resolves and `npm run build` stays green.)

- [ ] **Step 2: Nav.** In `src/data/nav.ts`, group `woerter`, after `ndekl`:

```ts
{ route: 'wortschatz', label: 'Wortschatz', de: 'B2 · Themenwortschatz' }
```

Run `npx vitest run tests/data/nav.test.ts` — if it asserts a module count, update it.

- [ ] **Step 3: Write the failing hub test** — mount test in the house style (see `tests/modules/nouns/QuizSetup.test.ts` for router/naive-ui mocking conventions):

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import WortschatzHome from '../../../src/modules/wortschatz/WortschatzHome.vue'
import { db } from '../../../src/db'

beforeEach(async () => { await db.wortschatzProgress.clear(); await db.wortschatzCustom.clear() })

describe('WortschatzHome', () => {
  it('renders one card per Themenfeld with a Lernen link and shows the due count', async () => {
    const w = mount(WortschatzHome, { global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } } })
    await flushPromises()
    expect(w.text()).toContain('Umwelt')
    expect(w.text()).toContain('Familie')
    expect(w.findAll('[data-testid="feld-card"]')).toHaveLength(10)
    expect(w.find('[data-testid="wiederholen-cta"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 4: Implement `WortschatzHome.vue`.** Structure (match SchreibenHome.vue's look — read it first):
  - Header: module title `Wortschatz`, subtitle `B2 · Produktiver Themenwortschatz`.
  - Top CTA card (`data-testid="wiederholen-cta"`): due count from `dueVokabelCount(Date.now())`, button `Wiederholen` → `router.push({ name: 'wortschatz-wiederholen-run' })`; disabled with `Nichts fällig` when 0.
  - Grid of ten Themenfeld cards (`data-testid="feld-card"`): feld name, meter line `X gefestigt · Y in Arbeit · Z neu` from `feldSummaries`, badge `n fällig` when > 0, button `Lernen` → `{ name: 'wortschatz-lernen-run', query: { feld } }` (disabled when `neu === 0`), and a secondary button `Mehr Vokabeln (KI)` — visible only when `canUseAi` — which calls `generateVokabeln` (existingDe = all current items of that feld), assigns ids `vk-custom-<Date.now()>-<i>` + `source: 'custom'`, saves via `addCustomVokabeln`, refreshes summaries, toasts success/failure (`useToast` — see other modules).
  - Load settings via `useSettings().load()` on mount.
- [ ] **Step 5: Run tests** — hub + nav tests PASS; `npm run typecheck` clean.
- [ ] **Step 6: Controller commits** — `feat(wortschatz): routes, nav entry, hub`

---

### Task 9: Stage card components

**Files:**
- Create: `src/modules/wortschatz/IntroCard.vue`, `ErkennenCard.vue`, `LueckeCard.vue`, `AbrufCard.vue`, `AnwendungCard.vue`
- Test: `tests/modules/wortschatz/cards.test.ts`

**Interfaces (props/emits — runners in Tasks 10–11 rely on these exactly):**

```ts
// IntroCard — guess-before-reveal (pretesting effect). Two phases internal.
props: { vokabel: Vokabel }
emits: { (e: 'done'): void }               // fired after the learner has seen the reveal
// Phase 1: shows v.en + feld + kind label, free guess input + button „Aufdecken".
// Phase 2 (after submit or empty skip): reveals de (+ plural/rektion when present),
// both saetze (blanks filled, target bolded), marks the learner's guess right/wrong
// via gradeVokabelAnswer (display only — no outcome is emitted), button „Weiter" → 'done'.

// ErkennenCard — multiple choice, 4 English options.
props: { vokabel: Vokabel; options: string[] }   // options from pickErkennenOptions
emits: { (e: 'answered', outcome: 'correct' | 'wrong'): void }
// Shows v.de (+ one satz with the blank filled, target bolded). Click an option →
// verdict coloring, then „Weiter" button emits.

// LueckeCard — typed cloze.
props: { vokabel: Vokabel; satz: KontextSatz }
emits: { (e: 'answered', outcome: 'correct' | 'hint' | 'wrong', given: string): void,
         (e: 'rescue-check', given: string, resolve: (ok: boolean) => void): void }
// Renders satz.de split by clozeParts: before + <input> + after, satz.en underneath.
// „Erster Buchstabe" button reveals blank[0..revealed] (each press one more char, max 3);
// any reveal caps outcome at 'hint'. Submit → gradeVokabelAnswer(v, blank, given, …).
// On local wrong: emit 'rescue-check' and await resolve — the RUNNER decides (online AI
// rescue or immediate false); if resolved true → verdict correct (outcome 'hint' if hinted,
// else 'correct'). Reveal shows the full satz + reason chip (Artikel/Präposition/Endung).

// AbrufCard — cued production of the full canonical form.
props: { vokabel: Vokabel }
emits: same two events as LueckeCard
// Cue: v.en + kind label (+ 'Nomen: mit Artikel' hint when de starts with der/die/das,
// + rektion display AFTER grading only). Expected = v.de (variants apply).

// AnwendungCard — free production, AI-graded by the RUNNER.
props: { vokabel: Vokabel; grading: boolean; result: { correct: boolean; feedback: string; korrektur?: string } | null }
emits: { (e: 'submit', sentence: string): void, (e: 'next'): void }
// Task copy: „Schreiben Sie einen eigenen Satz mit …". Textarea, min 5 words client-side.
// While grading: spinner. When result set: verdict + feedback (+ korrektur when wrong), „Weiter" → 'next'.
```

- [ ] **Step 1: Write failing mount tests** — one `describe` per card, minimal but real:

```ts
// cards.test.ts — outline (write all five):
// IntroCard: mounts, shows en cue; after typing + „Aufdecken" shows v.de; „Weiter" emits 'done'.
// ErkennenCard: renders 4 options; clicking the right one → 'answered' with 'correct'.
// LueckeCard: renders before/after text; typing the exact blank + submit → 'answered' 'correct';
//   typing garbage → emits 'rescue-check'; resolving false → 'answered' 'wrong';
//   pressing the hint then answering right → 'answered' 'hint'.
// AbrufCard: typing v.de → 'correct'; wrong article → rescue-check → resolve(false) → 'wrong'.
// AnwendungCard: submit emits sentence; with result prop set shows feedback and 'next' works.
```

Use `WORTSCHATZ_VOKABELN[0]` (the Wortverbindung) and `[1]` (the noun) as fixtures. Follow the house mount style; stub naive-ui components only if the existing tests do.

- [ ] **Step 2: FAIL → implement the five SFCs.** Visual style: copy patterns from an existing runner card (read `src/modules/prepositions/CollocationsRunner.vue` for input/verdict/reveal idioms and reuse its class/component approach). Keep each card self-contained; no store access — everything via props/emits.
- [ ] **Step 3: Run tests** — PASS; typecheck.
- [ ] **Step 4: Controller commits** — `feat(wortschatz): five stage cards`

---

### Task 10: LernenRunner (Lernsitzung)

**Files:**
- Modify: `src/modules/wortschatz/LernenRunner.vue` (replace Task 8's placeholder)
- Test: `tests/modules/wortschatz/LernenRunner.test.ts`

**Interfaces:**
- Consumes: route query `feld`; `vokabelnByFeld`, `readAllProgress`, `saveProgress`; `buildLernAuswahl`, `pickErkennenOptions`; `newProgress`, `applyOutcome`; `IntroCard`, `ErkennenCard`; `saveQuizRun`.

**Flow (implement exactly):**
1. On mount: read `feld` from `route.query.feld` (invalid/missing → `router.replace({ name: 'wortschatz' })`). Load the feld's Vokabeln + progress; `unseen` = items with no progress row; `auswahl = buildLernAuswahl(unseen, 7)`. Empty auswahl → friendly „Alles eingeführt" state with link back.
2. **Intro phase**: IntroCard per item in order. On each 'done': `saveProgress(newProgress(v.id, Date.now()))`.
3. **Erkennen phase**: two rounds. Round = every auswahl item once, shuffled (round 2 reshuffled). Per item: `pickErkennenOptions(v, feldPool)` → ErkennenCard. On 'answered': `p = applyOutcome(p, outcome, Date.now(), 'erkennen')`, `saveProgress(p)`; a wrong answer re-queues that item at the end of the current round (max one re-queue per item per round).
4. **Summary**: items introduced, Erkennen accuracy, per-item verdict chips; buttons „Zur Übersicht" (hub) and „Nochmal" (reload with same feld). On reaching summary: `saveQuizRun({ type: 'wortschatz-lernen', startedAt, finishedAt, durationMs, count: auswahl.length, correct: cleanErkennenAnswers, meta: { wortschatzFeld: feld } })` — timestamps ISO strings like other runners (grep one for the exact shape).
5. Progress header: `Schritt x / y` across both phases.

- [ ] **Step 1: Write the failing test** — mount with `feld=Umwelt` query (mock `vue-router`'s `useRoute`/`useRouter` the way existing runner tests do), fake timers not needed. Assert: intro card for first item appears; after driving both intro 'done's and four correct Erkennen answers (2 items × 2 rounds), the summary appears and a `wortschatz-lernen` entry landed in history (`loadHistory()`), and both items now have progress rows at stufe `luecke` (GATE.erkennen = 2 satisfied).
- [ ] **Step 2: FAIL → implement.**
- [ ] **Step 3: Run tests** — PASS; typecheck.
- [ ] **Step 4: Controller commits** — `feat(wortschatz): Lernsitzung runner`

---

### Task 11: WiederholenRunner (Wiederholsitzung)

**Files:**
- Modify: `src/modules/wortschatz/WiederholenRunner.vue` (replace placeholder)
- Test: `tests/modules/wortschatz/WiederholenRunner.test.ts`

**Interfaces:**
- Consumes: `dueVokabeln`, `saveProgress`, `loadExtraSaetze`, `saveExtraSaetze`; `buildWiederholQueue`; `applyOutcome`; all five cards; `gradeVokabelAnswer`; `judgeRescue`, `gradeAnwendung`, `generateExtraSaetze`; `useSettings` + `resolveAiClient` + `canUseAi`; `saveQuizRun`.

**Flow (implement exactly):**
1. Mount: `queue = buildWiederholQueue(await dueVokabeln(Date.now()))`, capped at 20 items per sitting (`.slice(0, 20)`; show „+n weitere fällig" when capped). Empty → „Nichts fällig" state.
2. Per item, render by `p.stufe`:
   - `erkennen` → ErkennenCard (`pickErkennenOptions(v, allItems)`)
   - `luecke` → LueckeCard. Sentence selection: `const all = [...v.saetze, ...(await loadExtraSaetze(v.id))]; satz = all[p.fsrs.reps % all.length]`.
   - `abruf` → AbrufCard
   - `anwendung` → AnwendungCard when `canUseAi`, else AbrufCard (served stufe = `'abruf'` — the offline fallback; promotion blocked by the scheduler).
3. `rescue-check` handling (Lücke/Abruf): if `canUseAi` → `judgeRescue(client, model, v, expected, given)`; on `acceptable` → `resolve(true)` and push `given` into `p.learnedVariants` (deduped) before saving; on failure or offline → `resolve(false)`. Wrap the AI call in try/catch → `resolve(false)`.
4. AnwendungCard: on 'submit' → `grading = true`, `gradeAnwendung(...)` (try/catch → treat as wrong with feedback „Bewertung fehlgeschlagen — Antwort zählt nicht"; in the catch case apply NO outcome and skip to next item instead), set `result`; on 'next' → apply outcome from `result.correct`.
5. After every answered card: `p = applyOutcome(p, outcome, Date.now(), servedStufe)`; `saveProgress(p)`. Track counts.
6. Summary: total, correct, per-stufe breakdown (`STUFE_LABEL`), newly gefestigt items celebrated; `saveQuizRun({ type: 'wortschatz-wiederholen', …, count, correct, meta: {} })`.
7. Header shows `x / y` and the current item's feld + `STUFE_LABEL[p.stufe]` chip.

- [ ] **Step 1: Write the failing test.** Seed two due items at different stufen (`luecke` + `abruf`) by writing progress rows directly (build with `newProgress` then override `stufe` and `fsrs.due = past`). Mock the AI settings composable so `canUseAi` is false (offline path). Drive: correct cloze answer, wrong abruf answer → summary asserts 1/2 correct, history entry `wortschatz-wiederholen` exists, the wrong item demoted one stufe, the correct one advanced `gatePasses`.
- [ ] **Step 2: FAIL → implement.**
- [ ] **Step 3: Run tests** — PASS; typecheck; run the whole suite `npm test` once here.
- [ ] **Step 4: Controller commits** — `feat(wortschatz): Wiederholsitzung runner`

---

### Tasks 12–14: Seed authoring (three parallel batches)

**Files (disjoint per task):**
- Task 12: `src/data/wortschatzUmwelt.ts` (extend to 20), `wortschatzArbeit.ts`, `wortschatzTechnologie.ts`
- Task 13: `src/data/wortschatzBildung.ts`, `wortschatzGesundheit.ts`, `wortschatzMedien.ts`
- Task 14: `src/data/wortschatzGesellschaft.ts`, `wortschatzReisen.ts`, `wortschatzKonsum.ts`, `wortschatzFamilie.ts`

**Per Themenfeld: exactly 20 items** — 12 Einzelwörter (8 nouns with real plurals, 2 verbs, 2 adjectives) + 8 Wortverbindungen (≥ 3 carrying `rektion`). Authoring rules:
- Register: geschriebenes B2 — the vocabulary a strong Forumsbeitrag/eine Nachricht on this field actually uses. No A1/A2 basics (`das Auto`, `gut`), no C1 exotica.
- `en` glosses natural and unambiguous (they are the Abruf cue — a gloss that fits three German words is a bad cue; sharpen with a bracketed nuance like `'to take a measure (action against a problem)'` where needed).
- Every item: exactly 2 `saetze`, each a natural 8–16-word written-register sentence with exactly one `{{…}}` blank holding the item's **inflected form in that sentence**; the two sentences must use different inflections/contexts where the language allows.
- `variants`: legitimate alternative full answers only (number variation for chunks, genuine spelling variants). Never synonyms.
- ids: `vk-<feld lowercase>-<slug>` (slug from the key word, kebab-case, ASCII — umlauts transliterated: ä→ae etc.).
- No `de` duplicated across ALL seed files (the invariant test enforces this globally — coordinate by staying inside your fields' natural vocabulary).
- Keep the existing two Umwelt bootstrap items (extend to 20 total).

- [ ] **Step 1:** Write the items.
- [ ] **Step 2:** `npx vitest run tests/data/wortschatz.test.ts` — invariants PASS.
- [ ] **Step 3:** `npm run typecheck` clean.
- [ ] **Step 4: Controller commits** — one commit per batch: `feat(wortschatz): seed Vokabeln — <fields>`

---

### Task 15: Release (controller only — release-publish ritual)

- [ ] Full verification: `npm test`, `npm run typecheck`, `npm run build`; Playwright pass over the hub + both runners (dev server: `--port <fresh> --strictPort`, use `localhost`).
- [ ] Review discussion with the user-facing summary; apply agreed fixes.
- [ ] `src/data/changelog.ts`: bump `APP_VERSION` to `1.23.00` + changelog entry describing the module; `package.json` version to match. Two commits per ritual (feature merge + version bump), merge branch to main, push, `npm run deploy`.

## Execution notes (controller)

- Branch: `feat/wortschatz-module` off local `main` (local is AHEAD of origin — do not reset to origin/main). Commit the pending CONTEXT.md + ADR-0027 changes as the branch's first commit (`docs: Wortschatz glossary + ADR-0027`), plus `package.json`/`package-lock.json` with ts-fsrs.
- Waves: T1 alone → {T2, T3, T6, T12, T13, T14 (Opus for seeds)} → {T4, T5} → {T7, T8, T9} → {T10} → {T11} → T15. Max 5 concurrent subagents; implementers on Sonnet 5, seed authoring + runners on Opus 5; subagents never run git.
- Every subagent prompt must include: read `CONTEXT.md → ### Wortschatz`, ADR-0027, and this plan's Global Constraints; the exact task text; and the reminder that their file set is exclusive.

## Self-review (done at write time)

- Spec coverage: glossary terms ↔ tasks — Themenfeld/Vokabel/kinds (T1), Vokabelstufe ladder + Gefestigt (T2), strict-core local grading + AI-on-miss (T3, T6, T11), Lernsitzung blocked intro + pretesting (T10), Wiederholsitzung interleaved + offline Anwendung fallback (T5, T11), seeded + custom pools (T1, T12–14, T8), extra sentences cached (T4, T6, T11), Fällig in Tagesplan (T7), Runs (T7, T10, T11), FSRS stored state (T2, T4, ADR-0027). ✔
- Placeholder scan: none — every step carries code or an exact rule. The Task 8 runner placeholders are explicitly temporary files replaced by Tasks 10–11. ✔
- Type consistency: `VokabelProgress.learnedVariants` defined in T2, used in T3 (param), T4 (persistence), T11 (rescue append); `applyOutcome(p, outcome, now, servedStufe)` arity consistent across T2/T10/T11; `pickErkennenOptions` name consistent T5/T9/T10/T11; card emits consistent T9→T10/T11. ✔
