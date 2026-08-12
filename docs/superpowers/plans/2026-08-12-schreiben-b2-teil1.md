# Schreiben B2 · Teil 1 (Forumsbeitrag) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new `schreiben` module that trains Goethe B2 Schreiben Teil 1 — one Schreibthema task sheet, one guided writing sitting, AI grading against the four official criteria — with a Schreibmittel cheatsheet, a strategy page, and full Sprechen-style helps (drawer, Move nudge, KI-Tipp, Hilfe-Protokoll).

**Architecture:** A faithful structural mirror of Sprechen Teil 1 (Vortrag): seeded + AI-custom task pools in plain TS/localStorage, a Dexie row (`schreibenBeitraege`) for in-progress resumability, one-shot sessionStorage stashes between screens, a single non-streaming AI grade call validated key-by-key, Runs in `gt:quizHistory`, corrections appended into the shared Sprechen archive with a `module` discriminator (ADR-0020), and the essay discarded after grading (ADR-0019). The spec is `CONTEXT.md` → *Schreiben* section (Forumsbeitrag, Schreibthema, Inhaltspunkt, Schreibplan, Schreibmittel, Correction tag) plus ADR-0019/0020.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Dexie 4, Vitest 4, vue-tsc. AI via `resolveAiClient` (Gemini or local-claude bridge).

## Global Constraints

- Read `CONTEXT.md` → **Schreiben** section, **Correction tag**, **Move**, **Redemittel yield**, **Hilfe-Protokoll**, **KI-Tipp**, **Move nudge**, **Prädikat** and `docs/adr/0019-*.md`, `docs/adr/0020-*.md` before starting. They are the spec; this plan implements them.
- The essay is **discarded after grading** (ADR-0019). Never persist `textDe` beyond the Dexie in-progress row and the one-shot result stash. Anything derived from the text (yield, mistake counts) is computed and banked at grade time.
- Corrections go into the **existing** `db.sprechenCorrections` via `appendCorrections` with `module: 'schreiben', part: 1, modality: 'typed'` (ADR-0020). Old rows are never mutated; `module` defaults to `'sprechen'` on read, in the repository layer only.
- Every grader/generator validator must match keyed arrays **by key, never by position**, and every prompt must spell out the exact JSON envelope in prose — the local-claude bridge silently drops `responseSchema` (see `useVortragGrader.ts:250-254`).
- UI copy is German in the app voice of the Sprechen module; English only in `noteEn`/`labelEn`-style secondary glosses. The unit is **Forumsbeitrag**, the task sheet **Schreibthema**, its points **Inhaltspunkte** — never "draft", "prompt", "Topic", "Gliederungspunkt".
- Word rules: `SCHREIBEN_MIN_WORDS = 150` (exam: "mindestens 150 Wörter"), display target 180, comfort ceiling 240. Time budget 50 min, **soft** — overtime is shown, never enforced, no auto-submit.
- Modality is always `'typed'`. `spelling` mistakes are always assignable (no recognizer excuse).
- Ids: Schreibthemen `wt-<slug>` (custom `wt-custom-<epoch>-<i>`), Schreibmittel `sm-<move>-<n>`. These prefixes keep the shared yield store (`gt:sprechenRedemittel`) and shared archive collision-free.
- Verification commands: `npx vitest run <file>` per task, `npm test` + `npm run typecheck` at the end of every task (vue-tsc — plain `tsc` produces ~212 bogus `.vue` errors and means nothing).
- Never run `git` from a subagent; the controller commits.
- Existing files you extend (`rubrics.ts`, `useQuizHistory.ts`, `useSprechenArchive.ts`, `router.ts`, `Home.vue`, `db/index.ts`, `quiz-type-labels.ts`, `useQuizStats.ts`, `HistoryPage.vue`, `useLevelAssessment.ts`, `SprechenArchive.vue`) — change only what the task names; never reformat or "improve" neighboring code.

**Parallel dispatch map (controller):** Wave A = Tasks 1–5 (disjoint, parallel) · Wave B = Tasks 6–9 (parallel, need A's types) · Wave C = Tasks 10–11 (parallel) · Wave D = Tasks 12–13 (parallel) · Wave E = Task 14 (solo).

---

### Task 1: Goethe B2 Schreiben Teil 1 rubric

**Files:**
- Modify: `src/data/rubrics.ts` (append after `SPRECHEN_B2_TEIL1`, before the `Praedikat` type at ~line 524)
- Test: `tests/data/rubrics.schreiben.test.ts` (create)

**Interfaces:**
- Consumes: `SprechenRubric`, `SprechenCriterion` (already in `rubrics.ts`).
- Produces: `export const SCHREIBEN_B2_TEIL1: SprechenRubric` — Tasks 8, 10, 13 import it. Criterion keys are exactly `'erfuellung' | 'kohaerenz' | 'wortschatz' | 'strukturen'`, 25 points each, `totalMax: 100`, `passingScore: 60`. No `descriptorSpokenDe`/`notesSpokenDe` anywhere (writing is typed-only).

- [ ] **Step 1: Write the failing test**

Create `tests/data/rubrics.schreiben.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { SCHREIBEN_B2_TEIL1, praedikat } from '../../src/data/rubrics'

describe('SCHREIBEN_B2_TEIL1 rubric', () => {
  test('four criteria à 25, total 100, pass 60 — same scale as Sprechen', () => {
    expect(SCHREIBEN_B2_TEIL1.totalMax).toBe(100)
    expect(SCHREIBEN_B2_TEIL1.passingScore).toBe(60)
    expect(SCHREIBEN_B2_TEIL1.criteria.map(c => c.key))
      .toEqual(['erfuellung', 'kohaerenz', 'wortschatz', 'strukturen'])
    for (const c of SCHREIBEN_B2_TEIL1.criteria) expect(c.maxPoints).toBe(25)
  })
  test('typed-only: no spoken descriptor variants', () => {
    for (const c of SCHREIBEN_B2_TEIL1.criteria) expect(c.descriptorSpokenDe).toBeUndefined()
    expect(SCHREIBEN_B2_TEIL1.notesSpokenDe).toBeUndefined()
  })
  test('erfuellung descriptor names the four Inhaltspunkte and the word floor', () => {
    const erf = SCHREIBEN_B2_TEIL1.criteria[0]
    expect(erf.descriptorDe).toMatch(/Inhaltspunkte/)
    expect(SCHREIBEN_B2_TEIL1.notes).toMatch(/150/)
  })
  test('praedikat mapping unchanged', () => {
    expect(praedikat(90)).toBe('sehr gut')
    expect(praedikat(59)).toBe('nicht bestanden')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/data/rubrics.schreiben.test.ts`
Expected: FAIL — `SCHREIBEN_B2_TEIL1` is not exported.

- [ ] **Step 3: Add the rubric const**

Append to `src/data/rubrics.ts` (after `SPRECHEN_B2_TEIL1`, mirroring its comment style):

```ts
/**
 * Schreiben Teil 1 · Forumsbeitrag. Deliberately SprechenRubric-shaped —
 * four criteria à 25, pass at 60, same Prädikat bands — so a Schreiben score
 * sits on the same 0-100 scale as both Sprechen parts. Typed-only: no
 * spoken descriptor variants. Inhaltspunkt coverage is judged by the grader
 * inside `erfuellung`, never mechanically measured (ADR-0014's logic).
 */
export const SCHREIBEN_B2_TEIL1: SprechenRubric = {
  labelDe: 'Goethe-Zertifikat B2 · Schreiben Teil 1 (adaptiert)',
  totalMax: 100,
  passingScore: 60,
  criteria: [
    {
      key: 'erfuellung',
      labelDe: 'Erfüllung / Inhalt',
      labelEn: 'Task fulfilment / content',
      maxPoints: 25,
      descriptorDe:
        'Werden alle vier Inhaltspunkte des Aufgabenblatts behandelt — nicht nur ' +
        'gestreift, sondern jeweils mit mindestens einem eigenen Gedanken ausgeführt? ' +
        'Ist der Text ein erkennbarer Forumsbeitrag: eine eigene, begründete Position ' +
        'zum Thema, an die Diskussion angeschlossen, mit Einleitung und Schluss? ' +
        'Ein komplett fehlender Inhaltspunkt begrenzt dieses Kriterium deutlich; ' +
        'ebenso ein Text, der die Mindestwortzahl klar verfehlt.'
    },
    {
      key: 'kohaerenz',
      labelDe: 'Kohärenz & Textaufbau',
      labelEn: 'Coherence & text structure',
      maxPoints: 25,
      descriptorDe:
        'Ist der Text als Ganzes logisch aufgebaut — Absätze mit je einem Gedanken, ' +
        'ein roter Faden von der Einleitung zum Fazit? Werden Konnektoren und ' +
        'Verweismittel (deshalb, trotzdem, einerseits/andererseits, dabei, darauf) ' +
        'passend und variantenreich eingesetzt, statt Sätze nur aneinanderzureihen? ' +
        'Sind die Übergänge zwischen den Inhaltspunkten geglättet?'
    },
    {
      key: 'wortschatz',
      labelDe: 'Wortschatz',
      labelEn: 'Vocabulary',
      maxPoints: 25,
      descriptorDe:
        'Ist der Wortschatz für B2 angemessen breit und präzise — themenspezifische ' +
        'Nomen, treffende Verben, schriftsprachliche Redemittel des Argumentierens ' +
        '(Meinung, Begründung, Einräumung, Fazit)? Führen Lücken zu Umschreibungen, ' +
        'Wiederholungen oder Registerbrüchen (zu mündlich für einen Forumsbeitrag)?'
    },
    {
      key: 'strukturen',
      labelDe: 'Strukturen',
      labelEn: 'Structures',
      maxPoints: 25,
      descriptorDe:
        'Wie korrekt und variantenreich sind die grammatischen Strukturen — ' +
        'Nebensätze (weil, obwohl, während), Konjunktiv II für Vorschläge, Passiv, ' +
        'korrekte Verbstellung nach Konnektoren? Wie häufig und wie schwerwiegend ' +
        'sind Fehler in Deklination, Konjugation und Rechtschreibung, und ' +
        'beeinträchtigen sie das Verständnis?'
    }
  ],
  notes:
    'Adaptierte Bewertung für getippte Forumsbeiträge (Schreiben Teil 1): vier ' +
    'Kriterien zu je 25 Punkten, Bestehensgrenze 60. Die Aufgabe verlangt ' +
    'mindestens 150 Wörter; ein deutlich kürzerer Text senkt die Erfüllung. ' +
    'Prädikate wie im Goethe-Zeugnis: 90+ sehr gut, 80+ gut, 70+ befriedigend, ' +
    '60+ ausreichend, darunter nicht bestanden.'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/data/rubrics.schreiben.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean.

---

### Task 2: Schreibthema seed pool

**Files:**
- Create: `src/data/schreibenThemen.ts`
- Test: `tests/data/schreibenThemen.test.ts` (create)

**Interfaces:**
- Consumes: `TOPIC_TAGS`, `TopicTag` from `src/data/sprechenTopics.ts`.
- Produces (Tasks 4, 6, 10, 11 rely on these exact names):

```ts
export interface Schreibthema {
  id: string                  // 'wt-<slug>' | custom: 'wt-custom-<epoch>-<i>'
  titleDe: string             // short unique label — the done-thema memory key
  forumContextDe: string      // one sentence: the forum thread the post answers
  taskDe: string              // exam instruction, starts with TASK_PREFIX, names the 150-word floor
  inhaltspunkte: string[]     // exactly four, topic-flavored (CONTEXT.md → Inhaltspunkt)
  tags: TopicTag[]            // 1-2 of the shared ten fields
  level: 'B2'
  source: 'seed' | 'custom'
}
export const SCHREIBEN_TASK_PREFIX = 'Schreiben Sie einen Forumsbeitrag'
export const SCHREIBEN_THEMEN: Schreibthema[]        // exactly 24 seeded
export const SCHREIBTHEMA_GENERATOR_SCHEMA: object   // Gemini responseSchema for Task 6
export function W(id: string, titleDe: string, forumContextDe: string, taskDe: string, inhaltspunkte: string[], tags: TopicTag[]): Schreibthema
```

- [ ] **Step 1: Write the failing test**

Create `tests/data/schreibenThemen.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  SCHREIBEN_THEMEN, SCHREIBEN_TASK_PREFIX, SCHREIBTHEMA_GENERATOR_SCHEMA
} from '../../src/data/schreibenThemen'
import { TOPIC_TAGS } from '../../src/data/sprechenTopics'

describe('schreibenThemen seed pool', () => {
  test('exactly 24 themes, unique ids and titles', () => {
    expect(SCHREIBEN_THEMEN.length).toBe(24)
    expect(new Set(SCHREIBEN_THEMEN.map(t => t.id)).size).toBe(24)
    expect(new Set(SCHREIBEN_THEMEN.map(t => t.titleDe)).size).toBe(24)
  })
  test('ids match wt- slug pattern', () => {
    for (const t of SCHREIBEN_THEMEN) expect(t.id).toMatch(/^wt-[a-z0-9-]+$/)
  })
  test('taskDe: exam wording with the 150-word floor, no question mark', () => {
    for (const t of SCHREIBEN_THEMEN) {
      expect(t.taskDe.startsWith(SCHREIBEN_TASK_PREFIX), t.id).toBe(true)
      expect(t.taskDe, t.id).toMatch(/mindestens 150 Wörter/)
      expect(t.taskDe, t.id).not.toContain('?')
      expect(t.taskDe.length, t.id).toBeGreaterThan(60)
      expect(t.taskDe.length, t.id).toBeLessThan(260)
    }
  })
  test('forumContextDe is one situating sentence', () => {
    for (const t of SCHREIBEN_THEMEN) {
      expect(t.forumContextDe.trim().length, t.id).toBeGreaterThan(30)
      expect(t.forumContextDe.length, t.id).toBeLessThan(220)
    }
  })
  test('exactly four topic-flavored Inhaltspunkte each', () => {
    for (const t of SCHREIBEN_THEMEN) {
      expect(t.inhaltspunkte.length, t.id).toBe(4)
      for (const p of t.inhaltspunkte) {
        expect(p.trim().length, t.id).toBeGreaterThan(15)
        expect(p.length, t.id).toBeLessThan(140)
        expect(p, t.id).not.toContain('?')
      }
      expect(new Set(t.inhaltspunkte).size, t.id).toBe(4)
    }
  })
  test('titles 3-45 chars; 1-2 valid tags; every tag used at least twice', () => {
    const tagUse = new Map<string, number>()
    for (const t of SCHREIBEN_THEMEN) {
      expect(t.titleDe.length).toBeGreaterThanOrEqual(3)
      expect(t.titleDe.length).toBeLessThanOrEqual(45)
      expect(t.tags.length).toBeGreaterThanOrEqual(1)
      expect(t.tags.length).toBeLessThanOrEqual(2)
      for (const tag of t.tags) {
        expect(TOPIC_TAGS).toContain(tag)
        tagUse.set(tag, (tagUse.get(tag) ?? 0) + 1)
      }
    }
    for (const tag of TOPIC_TAGS) {
      expect(tagUse.get(tag) ?? 0, `tag ${tag} under-covered`).toBeGreaterThanOrEqual(2)
    }
  })
  test('every seed entry is B2/seed', () => {
    for (const t of SCHREIBEN_THEMEN) {
      expect(t.level).toBe('B2')
      expect(t.source).toBe('seed')
    }
  })
  test('generator schema requires the five content fields', () => {
    const req = (SCHREIBTHEMA_GENERATOR_SCHEMA as any).properties.themen.items.required
    expect(req).toEqual(['titleDe', 'forumContextDe', 'taskDe', 'inhaltspunkte', 'tags'])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/data/schreibenThemen.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Author the pool**

Create `src/data/schreibenThemen.ts` with a header comment mirroring `sprechenVortragsthemen.ts`'s (what the pool is, CONTEXT.md → Schreibthema, why localStorage-custom). Two entries verbatim (author the remaining 22 in exactly this register — instruction + situating context + four *topic-flavored* points following the exam's recurring patterns: Meinung äußern / begründen / Vor- oder Nachteile / Beispiele aus eigener Erfahrung / Alternative vorschlagen / auf Gegenmeinungen eingehen):

```ts
export const SCHREIBEN_THEMEN: Schreibthema[] = [
  W('wt-homeoffice', 'Homeoffice als Normalfall',
    'Im Online-Forum „Arbeitswelt heute" diskutieren Nutzerinnen und Nutzer, ob Arbeiten von zu Hause der Normalfall werden sollte.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob das Homeoffice der Normalfall für Büroberufe werden sollte.',
    [
      'Äußern Sie Ihre Meinung zum Arbeiten im Homeoffice und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile des Homeoffice für Berufstätige.',
      'Berichten Sie von eigenen Erfahrungen oder Beobachtungen.',
      'Nennen Sie eine Alternative zum reinen Homeoffice.'
    ],
    ['Arbeit', 'Technologie']),
  W('wt-ki-im-alltag', 'KI im Alltag',
    'Im Forum „Digital leben" wird darüber diskutiert, wie stark künstliche Intelligenz den Alltag bestimmen darf.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, wie stark künstliche Intelligenz unseren Alltag bestimmen sollte.',
    [
      'Äußern Sie Ihre Meinung zum Einsatz von KI im Alltag und begründen Sie sie.',
      'Nennen Sie Bereiche, in denen KI besonders nützlich oder besonders riskant ist.',
      'Gehen Sie auf eine mögliche Gegenmeinung ein.',
      'Machen Sie einen Vorschlag, wie ein verantwortungsvoller Umgang mit KI aussehen könnte.'
    ],
    ['Technologie', 'Gesellschaft']),
  // …22 more, one W(...) per line-block, same register …
]
```

Pin these 22 remaining ids/titles/tags (author `forumContextDe`, `taskDe`, `inhaltspunkte` for each):
`wt-fast-fashion` „Fast Fashion" [Konsum, Umwelt] · `wt-vier-tage-woche` „Vier-Tage-Woche" [Arbeit] · `wt-autofreie-innenstadt` „Autofreie Innenstädte" [Umwelt, Gesellschaft] · `wt-social-media-jugend` „Soziale Medien und Jugendliche" [Medien, Familie] · `wt-fleischkonsum` „Weniger Fleisch essen" [Gesundheit, Umwelt] · `wt-bargeld` „Bargeld abschaffen" [Konsum, Technologie] · `wt-noten-schule` „Noten in der Schule" [Bildung] · `wt-ehrenamt-pflicht` „Pflichtjahr für alle" [Gesellschaft] · `wt-tourismus-grenzen` „Grenzen des Tourismus" [Reisen, Umwelt] · `wt-online-studium` „Online studieren" [Bildung, Technologie] · `wt-teilzeit-fuer-alle` „Teilzeit für alle" [Arbeit, Familie] · `wt-werbung-kinder` „Werbung für Kinder verbieten" [Medien, Konsum] · `wt-fitness-tracker` „Gesundheits-Apps und Tracker" [Gesundheit, Technologie] · `wt-mehrgenerationenhaus` „Wohnen mit mehreren Generationen" [Familie, Gesellschaft] · `wt-billigfluege` „Billigflüge" [Reisen, Umwelt] · `wt-smartphone-schule` „Smartphones an Schulen" [Bildung, Medien] · `wt-selbstoptimierung` „Ständige Selbstoptimierung" [Gesundheit, Gesellschaft] · `wt-regionale-produkte` „Regional einkaufen" [Konsum, Umwelt] · `wt-streaming-kino` „Streaming statt Kino" [Medien] · `wt-auswandern` „Zum Arbeiten ins Ausland" [Reisen, Arbeit] · `wt-haustiere-stadt` „Haustiere in der Stadtwohnung" [Familie, Gesellschaft] · `wt-lebenslanges-lernen` „Lebenslanges Lernen" [Bildung, Arbeit].

Add the generator schema (mirror `VORTRAGSTHEMA_GENERATOR_SCHEMA`'s structure in `sprechenVortragsthemen.ts:106-123`):

```ts
export const SCHREIBTHEMA_GENERATOR_SCHEMA = {
  type: 'object',
  properties: {
    themen: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titleDe: { type: 'string' },
          forumContextDe: { type: 'string' },
          taskDe: { type: 'string' },
          inhaltspunkte: { type: 'array', items: { type: 'string' } },
          tags: { type: 'array', items: { type: 'string' } }
        },
        required: ['titleDe', 'forumContextDe', 'taskDe', 'inhaltspunkte', 'tags']
      }
    }
  },
  required: ['themen']
} as const
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/data/schreibenThemen.test.ts`
Expected: PASS. If a length bound fails, fix the entry, not the test.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck` — clean.

---

### Task 3: Schreibmittel bank + Beitragsfunktionen + strategy tips

**Files:**
- Create: `src/data/schreibenMittel.ts`
- Create: `src/data/schreibenTipps.ts`
- Test: `tests/data/schreibenMittel.test.ts` (create)

**Interfaces:**
- Consumes: `redemittelNeedle`, `phraseNeedle` from `src/composables/useRedemittelMatch.ts` (test-side only).
- Produces (Tasks 8, 10, 12, 13 rely on these exact names):

```ts
// schreibenMittel.ts
export const SCHREIB_MOVES = ['aufgreifen', 'meinung', 'begruendung', 'beispiel', 'gegenmeinung', 'alternative', 'fazit'] as const
export type SchreibMove = (typeof SCHREIB_MOVES)[number]
export const SCHREIB_MOVE_LABEL: Record<SchreibMove, { de: string; en: string }>
export interface Schreibmittel { id: string; move: SchreibMove; phraseDe: string; noteEn: string; needle?: string }
export const SCHREIBEN_SCHREIBMITTEL: Schreibmittel[]   // 35 = 5 per move, ids 'sm-<move>-<n>'
export function schreibmittelForMove(move: SchreibMove): Schreibmittel[]

// schreibenTipps.ts
export interface TippSection { id: string; titleDe: string; items: { de: string; en?: string }[] }
export const SCHREIBEN_TEIL1_TIPPS: TippSection[]        // 6 sections, ≥4 items each
```

The seven Moves are CONTEXT.md's Beitragsfunktionen, labels:
`aufgreifen` „Thema aufgreifen"/(take up the topic) · `meinung` „Meinung äußern"/(state an opinion) · `begruendung` „Begründen"/(justify) · `beispiel` „Beispiel geben"/(give an example) · `gegenmeinung` „Gegenmeinung einräumen"/(concede the counter-view) · `alternative` „Alternative vorschlagen"/(suggest an alternative) · `fazit` „Fazit ziehen"/(draw a conclusion).

- [ ] **Step 1: Write the failing test**

Create `tests/data/schreibenMittel.test.ts` (mirrors `tests/data/sprechenVortragsmittel.test.ts`'s needle invariants — they caught real bugs there):

```ts
import { describe, test, expect } from 'vitest'
import {
  SCHREIB_MOVES, SCHREIB_MOVE_LABEL, SCHREIBEN_SCHREIBMITTEL, schreibmittelForMove
} from '../../src/data/schreibenMittel'
import { SCHREIBEN_TEIL1_TIPPS } from '../../src/data/schreibenTipps'
import { phraseNeedle } from '../../src/composables/useRedemittelMatch'
import { VORTRAG_MOVES } from '../../src/data/sprechenVortragsmittel'
import { MOVES } from '../../src/data/sprechenRedemittel'

describe('Schreibmittel bank', () => {
  test('35 phrases, unique sm- ids, 5 per move', () => {
    expect(SCHREIBEN_SCHREIBMITTEL.length).toBe(35)
    expect(new Set(SCHREIBEN_SCHREIBMITTEL.map(p => p.id)).size).toBe(35)
    for (const p of SCHREIBEN_SCHREIBMITTEL) expect(p.id).toMatch(/^sm-[a-z]+-\d$/)
    for (const m of SCHREIB_MOVES) expect(schreibmittelForMove(m).length).toBe(5)
  })
  test('Move set is disjoint from both Sprechen banks (CONTEXT.md → Move)', () => {
    for (const m of SCHREIB_MOVES) {
      expect(VORTRAG_MOVES as readonly string[]).not.toContain(m)
      expect(MOVES as readonly string[]).not.toContain(m)
    }
  })
  test('labels present for all seven Beitragsfunktionen', () => {
    for (const m of SCHREIB_MOVES) {
      expect(SCHREIB_MOVE_LABEL[m].de.length).toBeGreaterThan(3)
      expect(SCHREIB_MOVE_LABEL[m].en.length).toBeGreaterThan(3)
    }
  })
  test('needles: distinct, none a substring of another, floor 12 (10 for overrides)', () => {
    const needles = SCHREIBEN_SCHREIBMITTEL.map(p => ({ p, n: phraseNeedle(p) }))
    expect(new Set(needles.map(x => x.n)).size).toBe(35)
    for (const a of needles) for (const b of needles) {
      if (a.p.id !== b.p.id) expect(a.n.includes(b.n), `${a.p.id} swallows ${b.p.id}`).toBe(false)
    }
    for (const { p, n } of needles) {
      expect(n.length, p.id).toBeGreaterThanOrEqual(p.needle ? 10 : 12)
    }
  })
  test('every phrase has a non-empty noteEn', () => {
    for (const p of SCHREIBEN_SCHREIBMITTEL) expect(p.noteEn.trim().length).toBeGreaterThan(0)
  })
})

describe('Teil 1 strategy tips', () => {
  test('six sections, each with a title and at least four tips', () => {
    expect(SCHREIBEN_TEIL1_TIPPS.length).toBe(6)
    expect(new Set(SCHREIBEN_TEIL1_TIPPS.map(s => s.id)).size).toBe(6)
    for (const s of SCHREIBEN_TEIL1_TIPPS) {
      expect(s.titleDe.length).toBeGreaterThan(3)
      expect(s.items.length).toBeGreaterThanOrEqual(4)
      for (const i of s.items) expect(i.de.trim().length).toBeGreaterThan(10)
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/data/schreibenMittel.test.ts` — FAIL, modules missing.

- [ ] **Step 3: Author both banks**

`src/data/schreibenMittel.ts`: header comment (CONTEXT.md → Schreibmittel, Beitragsfunktionen; ids share the yield store with `rm-*`/`vm-*`, hence the `sm-` prefix), the `SCHREIB_MOVES`/`SCHREIB_MOVE_LABEL` blocks, the `P(id, move, phraseDe, noteEn, needle?)` helper (copy shape from `sprechenVortragsmittel.ts:38-40`), then 35 phrases — **written register**, one exemplar per move here, author the other four each in the same register:

```ts
P('sm-aufgreifen-1', 'aufgreifen', 'In letzter Zeit wird viel darüber diskutiert, ob …', 'opens by naming the debate'),
P('sm-meinung-1', 'meinung', 'Meiner Meinung nach spricht vieles dafür, dass …', 'states a position with room to argue'),
P('sm-begruendung-1', 'begruendung', 'Ein wichtiges Argument dafür ist, dass …', 'introduces a main reason'),
P('sm-beispiel-1', 'beispiel', 'Ein Beispiel aus meinem Umfeld zeigt, dass …', 'grounds the claim in experience'),
P('sm-gegenmeinung-1', 'gegenmeinung', 'Natürlich lässt sich einwenden, dass …', 'concedes before countering'),
P('sm-alternative-1', 'alternative', 'Eine sinnvolle Alternative dazu wäre, …', 'proposes a different solution'),
P('sm-fazit-1', 'fazit', 'Zusammenfassend lässt sich sagen, dass …', 'signals the conclusion'),
```

Rules for the remaining 28: every `phraseDe` a usable written sentence-opener ending in `…` where it trails off; no two phrases in the whole bank sharing their first 24 normalized chars (the needle test enforces this — vary the opening words); use `needle` overrides only where an `…` falls inside the first 24 chars.

`src/data/schreibenTipps.ts`: header comment (the strategy page content — CONTEXT.md's "tips" surface, static and offline). Six sections with ids `aufbau`, `zeit`, `wortzahl`, `redemittel`, `fehler`, `bewertung`; author ≥4 items each. Register: direct coaching German with optional English glosses. Exemplar:

```ts
export const SCHREIBEN_TEIL1_TIPPS: TippSection[] = [
  {
    id: 'aufbau',
    titleDe: 'Aufbau des Forumsbeitrags',
    items: [
      { de: 'Fünf Bausteine in fester Reihenfolge: Thema aufgreifen → Meinung → Argumente mit Beispiel → Gegenmeinung einräumen → Fazit.', en: 'Five building blocks, fixed order.' },
      { de: 'Ein Absatz pro Inhaltspunkt — der Prüfer hakt die vier Punkte einzeln ab, mach sie ihm sichtbar.' },
      { de: 'Die Einleitung nennt das Thema, nie schon alle Argumente. Zwei Sätze reichen.' },
      { de: 'Das Fazit wiederholt die Meinung mit anderen Worten — kein neues Argument im letzten Satz.' }
    ]
  },
  // … zeit (50-Minuten-Budget: 10 planen / 30 schreiben / 10 prüfen …),
  //   wortzahl (mindestens 150, Ziel ~180, über 240 kostet Zeit ohne Punkte …),
  //   redemittel (jede Beitragsfunktion mindestens einmal …),
  //   fehler (Verbstellung nach weil/deshalb, Kommas, du/Sie-Mischung, mündlicher Ton …),
  //   bewertung (die vier Kriterien und was sie konkret belohnen …)
]
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/data/schreibenMittel.test.ts` — PASS.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck` — clean.

---

### Task 4: Writing argument banks

**Files:**
- Create: `src/data/schreibenArguments.ts`
- Test: `tests/data/schreibenArguments.test.ts` (create)

**Interfaces:**
- Consumes: `ArgumentBank`, `ArgumentAngle`, `TopicWord` types from `src/data/sprechenArguments.ts` (import the types — same shape, own content, per the grill decision); `TopicTag`, `TOPIC_TAGS` from `sprechenTopics.ts`; `Schreibthema` from Task 2.
- Produces (Tasks 7, 11 rely on):

```ts
export const SCHREIB_TAG_ARGUMENT_BANKS: Record<TopicTag, ArgumentBank>     // 10 fallback banks, 3 pro / 3 contra / 6 words
export const SCHREIB_THEMA_ARGUMENT_BANKS: Record<string, ArgumentBank>     // flagships: wt-homeoffice, wt-ki-im-alltag, wt-fast-fashion (4/4/6)
export function resolveSchreibArgumentBank(
  thema: Pick<Schreibthema, 'id' | 'tags'>,
  cached?: ArgumentBank
): { bank: ArgumentBank; scope: 'cached' | 'thema' | TopicTag }
```

- [ ] **Step 1: Write the failing test**

Create `tests/data/schreibenArguments.test.ts` — mirror `tests/data/sprechenArguments.test.ts` structurally, with these assertions: a bank for every one of the ten `TOPIC_TAGS` and no extra keys; every tag bank exactly 3 pro / 3 contra / 6 words; flagship keys exactly `['wt-homeoffice', 'wt-ki-im-alltag', 'wt-fast-fashion']` and each a real id in `SCHREIBEN_THEMEN`; flagships exactly 4 pro / 4 contra / 6 words; across all banks no claim > 120 chars, no empty field after trim, every `word.de` matching `/^(der|die|das)\s/`; `resolveSchreibArgumentBank` prefers `cached`, then flagship by id, then first matching tag in `thema.tags` order, then `Gesellschaft` for unknown/empty tags. Also one writing-register spot check:

```ts
  test('claims read as written argument, not spoken filler', () => {
    for (const bank of Object.values(SCHREIB_TAG_ARGUMENT_BANKS)) {
      for (const a of [...bank.pro, ...bank.contra]) {
        expect(a.claim).not.toMatch(/^(Na ja|Also|Ich finde halt)/)
        expect(a.claim.endsWith('.')).toBe(true)
      }
    }
  })
```

- [ ] **Step 2: Run it to verify it fails** — `npx vitest run tests/data/schreibenArguments.test.ts`, FAIL (module missing).

- [ ] **Step 3: Author the banks**

Header comment: own content in written register (grill decision — arguments phrased with written connectors, Textwortschatz), same three-layer resolution as `sprechenArguments.ts:8-17`; the cached layer arrives in Task 7 with its own Dexie table. Author all ten tag banks and three flagships fresh — **do not copy** the Sprechen banks' sentences; write claims a Forumsbeitrag could lift directly (e.g. Umwelt pro: `{ claim: 'Konsequenter Klimaschutz zahlt sich langfristig doppelt aus.', why: 'Wer heute in Effizienz investiert, spart später Energiekosten und Folgeschäden.' }`). The resolver is small — full code:

```ts
export function resolveSchreibArgumentBank(
  thema: Pick<Schreibthema, 'id' | 'tags'>,
  cached?: ArgumentBank
): { bank: ArgumentBank; scope: 'cached' | 'thema' | TopicTag } {
  if (cached) return { bank: cached, scope: 'cached' }
  const flagship = SCHREIB_THEMA_ARGUMENT_BANKS[thema.id]
  if (flagship) return { bank: flagship, scope: 'thema' }
  for (const tag of thema.tags) {
    const bank = SCHREIB_TAG_ARGUMENT_BANKS[tag as TopicTag]
    if (bank) return { bank, scope: tag as TopicTag }
  }
  return { bank: SCHREIB_TAG_ARGUMENT_BANKS.Gesellschaft, scope: 'Gesellschaft' }
}
```

- [ ] **Step 4: Run the test to verify it passes** — PASS.
- [ ] **Step 5: Typecheck** — `npm run typecheck`, clean.

---

### Task 5: Core module data, Dexie v13, Beitrag repository

**Files:**
- Create: `src/data/schreiben.ts`
- Create: `src/composables/useSchreibenBeitrag.ts`
- Modify: `src/db/index.ts` (class field + `version(13)`)
- Test: `tests/data/schreiben.test.ts` (create)

**Interfaces:**
- Consumes: `HelpKind`, `HelpLogEntry` from `src/data/sprechen.ts` (reused, not redefined); `TopicTag` from `sprechenTopics.ts`.
- Produces (Tasks 8, 11, 12, 13 rely on these exact names):

```ts
// src/data/schreiben.ts
export interface SchreibThemaRef {           // denormalized onto the row — custom themes can be deleted
  id: string; titleDe: string; forumContextDe: string; taskDe: string
  inhaltspunkte: string[]; tags: TopicTag[]
}
export interface SchreibHelps { hints: boolean; checklist: boolean; kiTipp: boolean; timer: boolean }
export interface SchreibPlanEntry { index: number; keyword: string }    // index 0..3 ↔ inhaltspunkte[index]
export interface SchreibenBeitrag {
  id: string; thema: SchreibThemaRef; helps: SchreibHelps; plan: SchreibPlanEntry[]
  textDe: string; status: 'in_progress' | 'submitted'
  startedAt: number; updatedAt: number; kiTippCount: number; helpLog: HelpLogEntry[]
}
export const SCHREIBEN_MIN_WORDS = 150
export const SCHREIBEN_TARGET_WORDS = 180
export const SCHREIBEN_COMFORT_MAX_WORDS = 240
export const SCHREIBEN_TIME_BUDGET_SECONDS = 50 * 60
export function schreibenWordBand(words: number): 'under' | 'ok' | 'over'
export function schreibenClock(seconds: number): string          // m:ss, works past 60 min
export const SCHREIBEN_STASH_KEY = 'gt:lastSchreibenTeil1'       // Setup/Prep → Runner, one-shot
export interface SchreibenRunStash {
  thema: SchreibThemaRef; helps: SchreibHelps; plan: SchreibPlanEntry[]; model: string
}
export function emptySchreibPlan(): SchreibPlanEntry[]           // four entries, keyword ''

// src/composables/useSchreibenBeitrag.ts   (mirrors useVortrag.ts discipline: repository module,
//                                           all Dexie access for the table goes through here)
export async function createBeitrag(init: { thema: SchreibThemaRef; helps: SchreibHelps; plan: SchreibPlanEntry[] }): Promise<SchreibenBeitrag>
export async function findActiveBeitrag(): Promise<SchreibenBeitrag | undefined>   // newest in_progress OR submitted row
export async function saveText(id: string, textDe: string): Promise<void>          // also bumps updatedAt
export async function savePlan(id: string, plan: SchreibPlanEntry[]): Promise<void>
export async function logHelp(id: string, kind: HelpKind, at: number): Promise<void>   // non-fatal, mirrors useVortrag.ts:111-121
export async function incrementKiTipp(id: string): Promise<void>                   // db.transaction, mirrors useVortrag.ts:99-105
export async function markSubmitted(id: string): Promise<void>
export async function abandonBeitrag(id: string): Promise<void>                    // delete
export async function deleteBeitrag(id: string): Promise<void>                     // delete (post-grade)
```

- [ ] **Step 1: Write the failing test**

Create `tests/data/schreiben.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  SCHREIBEN_MIN_WORDS, SCHREIBEN_TARGET_WORDS, SCHREIBEN_COMFORT_MAX_WORDS,
  SCHREIBEN_TIME_BUDGET_SECONDS, schreibenWordBand, schreibenClock, emptySchreibPlan
} from '../../src/data/schreiben'

describe('schreiben core constants', () => {
  test('exam constants', () => {
    expect(SCHREIBEN_MIN_WORDS).toBe(150)
    expect(SCHREIBEN_TARGET_WORDS).toBe(180)
    expect(SCHREIBEN_COMFORT_MAX_WORDS).toBe(240)
    expect(SCHREIBEN_TIME_BUDGET_SECONDS).toBe(3000)
  })
  test('word band: floor at 150, comfort ceiling at 240', () => {
    expect(schreibenWordBand(0)).toBe('under')
    expect(schreibenWordBand(149)).toBe('under')
    expect(schreibenWordBand(150)).toBe('ok')
    expect(schreibenWordBand(240)).toBe('ok')
    expect(schreibenWordBand(241)).toBe('over')
  })
  test('clock formats past the hour and zero-pads', () => {
    expect(schreibenClock(0)).toBe('0:00')
    expect(schreibenClock(65)).toBe('1:05')
    expect(schreibenClock(3000)).toBe('50:00')
    expect(schreibenClock(3720)).toBe('62:00')
  })
  test('empty plan: four entries, indices 0..3, empty keywords', () => {
    const plan = emptySchreibPlan()
    expect(plan.map(p => p.index)).toEqual([0, 1, 2, 3])
    for (const p of plan) expect(p.keyword).toBe('')
  })
})
```

- [ ] **Step 2: Run it to verify it fails** — FAIL, module missing.

- [ ] **Step 3: Implement data module, repository, and the Dexie bump**

`src/data/schreiben.ts`: implement per the interface block (`schreibenWordBand` = `words < 150 ? 'under' : words <= 240 ? 'ok' : 'over'`; `schreibenClock(s)` = `` `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` ``). Header comment mirrors `src/data/sprechen.ts`'s.

`src/composables/useSchreibenBeitrag.ts`: mirror `src/composables/useVortrag.ts` function-for-function (same non-fatal try/catch on `logHelp`, same `db.transaction` on `incrementKiTipp`, `crypto.randomUUID()` ids, `status: 'in_progress'` on create, `findActiveBeitrag` = newest row whose status is `in_progress` or `submitted`, ordered by `startedAt` descending). Table: `db.schreibenBeitraege`.

`src/db/index.ts`: add the class field (`schreibenBeitraege!: Table<SchreibenBeitrag, string>` with the import type from `../data/schreiben`) and `schreibenArgumentBanks!: Table<CachedSchreibArgumentBank, string>` (type comes from Task 7 — declare it here as `{ themaId: string; bank: ArgumentBank; generatedAt: number }` via an import from `../data/schreibenArguments`… **no**: to keep this task self-contained, declare the row type inline in `src/data/schreiben.ts`:

```ts
export interface CachedSchreibArgumentBank { themaId: string; bank: import('./sprechenArguments').ArgumentBank; generatedAt: number }
```

…and have Task 7 import it from there). Then append `version(13)` **restating all ten existing table specs verbatim from the `version(12)` block** plus:

```ts
this.version(13).stores({
  /* …all ten specs from version(12) unchanged… */
  schreibenBeitraege: '&id, status, startedAt',
  schreibenArgumentBanks: 'themaId'
})
// Purely additive — no upgrade hook, because no existing row gains a required field.
```

- [ ] **Step 4: Run the test to verify it passes** — PASS.
- [ ] **Step 5: Typecheck** — `npm run typecheck`, clean (proves the Dexie field/type wiring).

---

### Task 6: Schreibthema pool composable (custom pool + AI generation)

**Files:**
- Create: `src/composables/useSchreibenThemen.ts`
- Test: `tests/composables/useSchreibenThemen.test.ts` (create)

**Interfaces:**
- Consumes: `Schreibthema`, `SCHREIBEN_THEMEN`, `SCHREIBEN_TASK_PREFIX`, `SCHREIBTHEMA_GENERATOR_SCHEMA` (Task 2); `TOPIC_TAGS` (`sprechenTopics.ts`); `loadHistory` (`useQuizHistory.ts`); the `GeminiClient` structural type from `useSprechenGrader.ts`.
- Produces (Tasks 10, 11 rely on):

```ts
export const CUSTOM_SCHREIBTHEMEN_KEY = 'gt:schreibenCustomThemen'
export const THEMEN_PER_GENERATION = 4
export function loadCustomThemen(): Schreibthema[]
export function addCustomThemen(themen: Schreibthema[]): void
export function deleteCustomThema(id: string): void
export function allThemen(): Schreibthema[]
export function doneThemaTitles(): Set<string>        // runs where type === 'schreiben-teil1', meta.topicTitle
export function drawThema(rng?: () => number): Schreibthema   // single draw preferring undone; throws on empty pool
export function validateGeneratedThema(raw: unknown): Pick<Schreibthema, 'titleDe' | 'forumContextDe' | 'taskDe' | 'inhaltspunkte' | 'tags'> | null
export function buildThemaGeneratorPrompt(existingTitles: string[], doneTitles: Set<string>, rng?: () => number): string
export async function generateThemen(client: GeminiClient, model: string, maxRetries = 2): Promise<Schreibthema[]>
```

- [ ] **Step 1: Write the failing test**

Create `tests/composables/useSchreibenThemen.test.ts`. Mirror the harness style of `tests/composables/` neighbors (plain vitest, stub `localStorage` if the existing tests do — check `useVortragsthemen`'s test if present, else follow `useRedemittelMatch.test.ts`'s plain style). Cover, at minimum, with real assertions:

```ts
import { describe, test, expect } from 'vitest'
import { validateGeneratedThema, buildThemaGeneratorPrompt, drawThema } from '../../src/composables/useSchreibenThemen'

const good = {
  titleDe: 'Camping statt Hotel',
  forumContextDe: 'Im Reiseforum wird diskutiert, ob einfacher Urlaub der bessere Urlaub ist.',
  taskDe: 'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob einfacher Urlaub erholsamer ist als Komfortreisen.',
  inhaltspunkte: [
    'Äußern Sie Ihre Meinung zu einfachen Urlaubsformen und begründen Sie sie.',
    'Nennen Sie Vorteile oder Nachteile von Campingurlaub.',
    'Berichten Sie von eigenen Reiseerfahrungen.',
    'Nennen Sie eine Alternative für Menschen, die beides verbinden wollen.'
  ],
  tags: ['Reisen']
}

describe('validateGeneratedThema', () => {
  test('accepts a well-formed thema', () => {
    expect(validateGeneratedThema(good)).not.toBeNull()
  })
  test('rejects wrong prefix, question marks, wrong point count, bad tags', () => {
    expect(validateGeneratedThema({ ...good, taskDe: 'Verfassen Sie einen Text über Camping (mindestens 150 Wörter).' })).toBeNull()
    expect(validateGeneratedThema({ ...good, taskDe: good.taskDe.replace('.', '?') })).toBeNull()
    expect(validateGeneratedThema({ ...good, inhaltspunkte: good.inhaltspunkte.slice(0, 3) })).toBeNull()
    expect(validateGeneratedThema({ ...good, tags: ['Quatsch'] })).toBeNull()
    expect(validateGeneratedThema({ ...good, taskDe: 'Schreiben Sie einen Forumsbeitrag ohne Mindestwortzahl.' })).toBeNull()
  })
})

describe('buildThemaGeneratorPrompt', () => {
  test('embeds the avoid-list, the JSON envelope, and the exam constraints in prose', () => {
    const p = buildThemaGeneratorPrompt(['Homeoffice als Normalfall'], new Set(['KI im Alltag']))
    expect(p).toContain('Homeoffice als Normalfall')
    expect(p).toContain('KI im Alltag')
    expect(p).toContain('"themen"')
    expect(p).toContain('mindestens 150 Wörter')
    expect(p).toContain('genau vier')
  })
})

describe('drawThema', () => {
  test('returns a thema from the pool deterministically under a fixed rng', () => {
    const t = drawThema(() => 0)
    expect(t.id).toMatch(/^wt-/)
  })
})
```

- [ ] **Step 2: Run it to verify it fails** — FAIL, module missing.

- [ ] **Step 3: Implement**

Mirror `src/composables/useVortragsthemen.ts` block-for-block (constants → isValidStored → load/save/add/delete → allThemen → doneThemaTitles → draw → validate → prompt → generate), with these divergences:
- `doneThemaTitles()` filters `e.type === 'schreiben-teil1'` reading `e.meta.topicTitle` (deliberately the same meta key — document with the same comment style as `useVortragsthemen.ts:96`).
- `drawThema` draws **one** (the exam offers no choice): prefer undone (`!done.has(t.titleDe)`), fall back to the full pool; `pool[Math.floor(rng() * pool.length)]`.
- `validateGeneratedThema`: trims all strings; `titleDe` 3–45; `forumContextDe` 30–220; `taskDe` starts with `SCHREIBEN_TASK_PREFIX`, contains `'mindestens 150 Wörter'`, contains no `?`, length 60–260; `inhaltspunkte` exactly 4 strings, each trimmed 15–140 chars, no `?`, pairwise distinct; `tags` filtered to `TOPIC_TAGS`, ≥1 survivor.
- `buildThemaGeneratorPrompt`: German prompt asking for `THEMEN_PER_GENERATION` (4) new B2 Schreibthemen for Schreiben Teil 1; requires the exact JSON envelope `{"themen": [{"titleDe": "…", "forumContextDe": "…", "taskDe": "…", "inhaltspunkte": ["…", "…", "…", "…"], "tags": ["…"]}]}` spelled out in prose (no markdown fences); demands `taskDe` start with the exact prefix and name `mindestens 150 Wörter`; demands **genau vier** topic-flavored Inhaltspunkte following the exam patterns (Meinung + Begründung / Vor- oder Nachteile / eigene Erfahrungen / Alternative oder Gegenmeinung); 4 random focus tags + base-36 variation seed + avoid-list, exactly as `useVortragsthemen.ts:153-191` does.
- `generateThemen`: same retry loop as `useVortragsthemen.ts:193-245`, `responseSchema: SCHREIBTHEMA_GENERATOR_SCHEMA`, ids `wt-custom-${Date.now()}-${i}`, cap `THEMEN_PER_GENERATION`.

- [ ] **Step 4: Run the test to verify it passes** — PASS.
- [ ] **Step 5: Run the neighbors too** — `npx vitest run tests/composables tests/data` all green; `npm run typecheck` clean.

---

### Task 7: Writing argument-bank composable (generate + cache)

**Files:**
- Create: `src/composables/useSchreibenArguments.ts`
- Test: `tests/composables/useSchreibenArguments.test.ts` (create)

**Interfaces:**
- Consumes: `ArgumentBank` type + `validateArgumentBank` (exported by `useSprechenArguments.ts` — reuse, do not fork); `CachedSchreibArgumentBank` from `src/data/schreiben.ts` (Task 5); `db.schreibenArgumentBanks`; `GeminiClient` type; `Schreibthema` (Task 2).
- Produces (Task 11 relies on):

```ts
export function buildSchreibArgumentBankPrompt(thema: Pick<Schreibthema, 'titleDe' | 'taskDe'>): string
export async function generateSchreibArgumentBank(client: GeminiClient, model: string, thema: Pick<Schreibthema, 'titleDe' | 'taskDe'>, maxRetries = 2): Promise<ArgumentBank>
export async function loadCachedSchreibBank(themaId: string): Promise<ArgumentBank | undefined>
export async function cachedSchreibBankIds(): Promise<Set<string>>
export async function saveCachedSchreibBank(themaId: string, bank: ArgumentBank): Promise<void>
```

- [ ] **Step 1: Write the failing test**

Create `tests/composables/useSchreibenArguments.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { buildSchreibArgumentBankPrompt } from '../../src/composables/useSchreibenArguments'

describe('buildSchreibArgumentBankPrompt', () => {
  test('asks for written-register material and spells out the JSON envelope', () => {
    const p = buildSchreibArgumentBankPrompt({ titleDe: 'Fast Fashion', taskDe: 'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zum Thema Fast Fashion.' })
    expect(p).toContain('Fast Fashion')
    expect(p).toContain('"pro"')
    expect(p).toContain('"contra"')
    expect(p).toContain('"words"')
    expect(p).toContain('"phrases"')
    expect(p).toMatch(/schriftlich|Forumsbeitrag/)
    expect(p).not.toMatch(/```/)
  })
})
```

- [ ] **Step 2: Run it to verify it fails** — FAIL.

- [ ] **Step 3: Implement**

Mirror `useSprechenArguments.ts` exactly, with: prompt asking for pro/contra angles **formulated as written argument a Forumsbeitrag could adapt** (schriftsprachlich, keine mündlichen Füller), exactly 4 pro / 4 contra / 6 words-with-article / 5 phrases (collocations with case), same length caps, same envelope prose; reuse `validateArgumentBank` from `useSprechenArguments`; cache against `db.schreibenArgumentBanks` (`put({ themaId, bank, generatedAt: Date.now() })`, `get(themaId)`, `toCollection().primaryKeys()`); no `responseSchema` (matches `useSprechenArguments.ts:6-7`'s local-claude note), `responseMimeType: 'application/json'`, `temperature: 0.7`, `topP: 0.95`.

- [ ] **Step 4: Run the test to verify it passes** — PASS.
- [ ] **Step 5: Typecheck** — clean.

### Task 8: Grader, KI-Tipp, history type

**Files:**
- Create: `src/composables/useSchreibenGrader.ts`
- Create: `src/composables/useSchreibenTipp.ts`
- Modify: `src/composables/useQuizHistory.ts` (add `'schreiben-teil1'` to `QuizHistoryType` next to `'sprechen-teil1'` at ~line 61; add a one-line comment in the Sprechen meta cluster at ~322 noting `schreiben-teil1` runs reuse the `sprechen*` meta fields — the type discriminates, ADR-0020's misnomer-containment spirit)
- Modify: `src/components/charts/quiz-type-labels.ts` (~:57, ~:130, list at ~:204), `src/composables/useQuizStats.ts` (~:143, ~:218), `src/modules/history/HistoryPage.vue` (map ~:99, list ~:147), `src/composables/useLevelAssessment.ts` (~:142) — the union member breaks these exhaustive `Record<QuizHistoryType, …>` maps the moment it lands, so the one-liners belong to THIS task, mirroring each file's `'sprechen-teil1'` line. Label: `Schreiben · Teil 1 Forumsbeitrag`, module label `Schreiben`; `useLevelAssessment` description: `'Schreiben Teil 1 — a forum post of at least 150 words covering a task sheet's four content points (score 0-100, Goethe B2 rubric)'`.
- Test: `tests/composables/useSchreibenGrader.test.ts` (create)

**Interfaces:**
- Consumes: `SprechenRubric` + `SCHREIBEN_B2_TEIL1` + `praedikat`, `Praedikat` (Task 1 / `rubrics.ts`); `reAnchor`, `BilingualNote`, `GeminiClient`, `SprechenCriterionScore` from `useSprechenGrader.ts`; `Aufwertung` from `useVortragGrader.ts`; `SprechenErrorTag` from `useQuizHistory.ts`; `SchreibenBeitrag`, `SCHREIBEN_MIN_WORDS`, `SchreibThemaRef`, `SchreibHelps`, `SchreibPlanEntry` + `HelpLogEntry` (Task 5 / `data/sprechen.ts`).
- Produces (Tasks 12, 13 rely on these exact names):

```ts
export interface SchreibenCoverageCell { index: number; punkt: string; covered: boolean; note: string }
export interface SchreibenMistake {
  quote: string; suggested: string; kind: SprechenErrorTag
  reasonDe: string; reasonEn: string; spanStart: number
}
export interface SchreibenGradeResult {
  totalScore: number; passes: boolean; praedikat: Praedikat
  criteria: SprechenCriterionScore[]           // keys erfuellung|kohaerenz|wortschatz|strukturen
  coverage: SchreibenCoverageCell[]            // exactly 4, in inhaltspunkte order
  mistakes: SchreibenMistake[]
  aufwertungen: Aufwertung[]
  strengths: BilingualNote[]; weaknesses: BilingualNote[]
  overallDe: string; overallEn: string
}
export const SCHREIBEN_GRADE_SCHEMA: object
export const SCHREIBEN_AUFWERTUNG_CAP = 5
export class SchreibenGraderError extends Error { constructor(message: string, public readonly attempts: number) }
export function buildSchreibenGraderPrompt(b: SchreibenBeitrag): { system: string; user: string }
export function validateSchreibenGrade(raw: unknown, b: SchreibenBeitrag): SchreibenGradeResult | null
export async function gradeSchreiben(client: GeminiClient, model: string, b: SchreibenBeitrag, maxRetries = 2): Promise<SchreibenGradeResult>
export const SCHREIBEN_RESULT_KEY = 'gt:lastSchreibenTeil1Result'
export interface SchreibenResultStash {
  thema: SchreibThemaRef; helps: SchreibHelps; plan: SchreibPlanEntry[]
  wordCount: number; kiTippCount: number; helpLog: HelpLogEntry[]
  schreibmittel: string[]                       // matched sm- ids, counted before discard
  startedAt: number; finishedAt: number
  result: SchreibenGradeResult
}

// useSchreibenTipp.ts
export function buildSchreibenKiTippPrompt(b: SchreibenBeitrag): string
export async function generateSchreibenKiTipp(client: GeminiClient, model: string, b: SchreibenBeitrag): Promise<string>
```

- [ ] **Step 1: Write the failing test**

Create `tests/composables/useSchreibenGrader.test.ts`. Build a `mkBeitrag()` factory (a ~170-word German essay in `textDe` containing a known mistake quote, four Inhaltspunkte on the thema) and a `mkRaw()` factory returning a well-formed grade envelope; then:

```ts
import { describe, test, expect } from 'vitest'
import { validateSchreibenGrade, buildSchreibenGraderPrompt } from '../../src/composables/useSchreibenGrader'
import type { SchreibenBeitrag } from '../../src/data/schreiben'

const ESSAY =
  'Meiner Meinung nach ist das Homeoffice eine große Chance. ' +
  'Viele Menschen arbeiten zu Hause produktiver, weil sie weniger unterbrochen werden. ' +
  'Ein Beispiel aus meinem Umfeld zeigt, dass der Arbeitsweg viel Zeit kostet. ' +
  'Natürlich lässt sich einwenden, dass der Kontakt zu Kollegen leidet. ' +
  'Ich habe das Bericht gelesen und finde die Argumente überzeugend. ' +
  'Eine sinnvolle Alternative dazu wäre ein hybrides Modell mit festen Bürotagen. ' +
  'Zusammenfassend lässt sich sagen, dass flexible Regeln allen helfen.'

function mkBeitrag(): SchreibenBeitrag {
  return {
    id: 'b1',
    thema: {
      id: 'wt-homeoffice', titleDe: 'Homeoffice als Normalfall',
      forumContextDe: 'Im Online-Forum „Arbeitswelt heute" wird diskutiert.',
      taskDe: 'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zum Homeoffice.',
      inhaltspunkte: ['Meinung äußern und begründen', 'Vor- oder Nachteile nennen', 'Eigene Erfahrungen', 'Alternative vorschlagen'],
      tags: ['Arbeit']
    },
    helps: { hints: true, checklist: true, kiTipp: true, timer: true },
    plan: [], textDe: ESSAY, status: 'submitted',
    startedAt: 1, updatedAt: 2, kiTippCount: 0, helpLog: []
  }
}

function mkRaw() {
  return {
    criteria: [
      { key: 'erfuellung', score: 21, justificationDe: 'Alle vier Punkte behandelt.', justificationEn: 'All four points covered.' },
      { key: 'kohaerenz', score: 20, justificationDe: 'Klar gegliedert.', justificationEn: 'Clearly structured.' },
      { key: 'wortschatz', score: 19, justificationDe: 'Angemessen.', justificationEn: 'Adequate.' },
      { key: 'strukturen', score: 18, justificationDe: 'Wenige Fehler.', justificationEn: 'Few errors.' }
    ],
    coverage: [
      { index: 0, covered: true, note: 'Meinung klar.' },
      { index: 1, covered: true, note: 'Vorteile genannt.' },
      { index: 2, covered: true, note: 'Beispiel vorhanden.' },
      { index: 3, covered: true, note: 'Hybrides Modell.' }
    ],
    mistakes: [
      { quote: 'das Bericht', suggested: 'den Bericht', kind: 'grammar', reasonDe: 'Der Bericht ist maskulin.', reasonEn: 'Bericht is masculine.' }
    ],
    aufwertungen: [], strengths: [{ de: 'Klare Position.', en: 'Clear stance.' }],
    weaknesses: [{ de: 'Wenig Variation.', en: 'Little variation.' }],
    overallDe: 'Solide.', overallEn: 'Solid.'
  }
}

describe('validateSchreibenGrade', () => {
  test('happy path: derives total/passes/praedikat locally, anchors the mistake', () => {
    const r = validateSchreibenGrade(mkRaw(), mkBeitrag())!
    expect(r.totalScore).toBe(78)
    expect(r.passes).toBe(true)
    expect(r.praedikat).toBe('befriedigend')
    expect(r.mistakes[0].spanStart).toBe(ESSAY.indexOf('das Bericht'))
  })
  test('criteria matched by key, not position', () => {
    const raw = mkRaw()
    raw.criteria.reverse()
    expect(validateSchreibenGrade(raw, mkBeitrag())!.totalScore).toBe(78)
  })
  test('consistency check: ≤2 covered cannot coexist with erfuellung ≥ 20', () => {
    const raw = mkRaw()
    raw.coverage[2].covered = false
    raw.coverage[3].covered = false
    expect(validateSchreibenGrade(raw, mkBeitrag())).toBeNull()
  })
  test('unanchorable mistakes are dropped, not fatal', () => {
    const raw = mkRaw()
    raw.mistakes.push({ quote: 'gibt es hier nicht', suggested: 'x', kind: 'grammar', reasonDe: 'x', reasonEn: 'x' } as any)
    expect(validateSchreibenGrade(raw, mkBeitrag())!.mistakes.length).toBe(1)
  })
  test('spelling mistakes are kept (typed-only module)', () => {
    const raw = mkRaw()
    raw.mistakes[0].kind = 'spelling'
    expect(validateSchreibenGrade(raw, mkBeitrag())!.mistakes[0].kind).toBe('spelling')
  })
  test('score out of range rejects', () => {
    const raw = mkRaw()
    raw.criteria[0].score = 26
    expect(validateSchreibenGrade(raw, mkBeitrag())).toBeNull()
  })
})

describe('buildSchreibenGraderPrompt', () => {
  test('embeds the four Inhaltspunkte, the word floor, the envelope, and the tag enum', () => {
    const { system, user } = buildSchreibenGraderPrompt(mkBeitrag())
    expect(user).toContain('Alternative vorschlagen')
    expect(user).toContain(ESSAY.slice(0, 40))
    expect(system).toContain('mindestens 150')
    expect(system).toContain('"criteria"')
    expect(system).toContain('grammar')
    expect(system).toContain('word-order')
    expect(system).not.toMatch(/```/)
  })
})
```

- [ ] **Step 2: Run it to verify it fails** — FAIL, module missing.

- [ ] **Step 3: Implement the grader**

Mirror `useVortragGrader.ts` section-for-section. Divergences, exhaustively:
- **Persona/system**: grader persona for a *written* Forumsbeitrag (kein Prüfergespräch): experienced Goethe B2 rater, strict but fair, evaluating a typed forum post. Include: per-mistake tagging rules with the five `Correction tag` kinds (`grammar|word-order|vocabulary|spelling|register` — CONTEXT.md renamed the term; the code type stays `SprechenErrorTag`), **no** spoken-modality spelling caveat (always assignable), `register` explicitly includes "zu mündlicher Ton für einen schriftlichen Beitrag"; coverage instructions for **exactly four** Inhaltspunkte **by index 0-3 in task-sheet order**; aufwertungen rules (cap `SCHREIBEN_AUFWERTUNG_CAP`, "NOT errors"); a KALIBRIERUNG paragraph anchoring 90-100 to "alle vier Inhaltspunkte ausgeführt, klar gegliedert, nur vereinzelte Flüchtigkeitsfehler"; the literal JSON envelope; rubric lines rendered from `SCHREIBEN_B2_TEIL1` (label/max/passing + per-criterion descriptor) plus grader-local band anchors `SCHREIBEN_BAND_ANCHORS` (own const, 4 contiguous bands per criterion, 23-25/18-22/12-17/5-11, keep **out of** `rubrics.ts` exactly as `TEIL1_BAND_ANCHORS` is kept out — `useVortragGrader.ts:92-105`).
- **User message**: THEMA/FORUM-KONTEXT/AUFGABE blocks, the four `INHALTSPUNKTE` numbered `0.`–`3.`, `FORUMSBEITRAG:` + `b.textDe`, then a typed-words block: computed word count + the rule that only `erfuellung` may be docked for a shortfall under `SCHREIBEN_MIN_WORDS` (mirror `useVortragGrader.ts`'s `umfang` block).
- **Schema** `SCHREIBEN_GRADE_SCHEMA`: like `VORTRAG_GRADE_SCHEMA` minus `phase` on mistakes, with `coverage` items `{ index: number, covered: boolean, note: string }`.
- **Validator**: criteria by key against `SCHREIBEN_B2_TEIL1.criteria` (rounded, range-checked); coverage projected onto indices 0-3 in order (missing → reject); consistency check `coveredCount <= 2 && erfuellungScore >= 20 → null`; mistakes: `kind` in the five tags, re-anchor every quote with `reAnchor(m.quote, b.textDe)`, drop unanchorable, `spanStart` from the anchor; **no** spelling drop; aufwertungen anchored against `b.textDe`, dropped on overlap with a mistake span, capped at 5 (2 if `mistakes.length > 6`); `totalScore`/`passes`/`praedikat` derived locally, never trusted.
- **`gradeSchreiben`**: single-shot `generateContent` with `systemInstruction`, `responseMimeType: 'application/json'`, `responseSchema: SCHREIBEN_GRADE_SCHEMA`, `temperature: 0`, retry loop to `maxRetries`, throw `SchreibenGraderError(message, attempts)`.

`src/composables/useSchreibenTipp.ts`: mirror `useVortragPartner.ts:162-238`'s pair. Prompt from: `b.thema.taskDe` + the four Inhaltspunkte + unwritten plan keywords (from `planSignals`-style matching — inline the same normalized-substring rule against `b.textDe`; label it explicitly unreliable) + last 1200 chars of `b.textDe`; ask for a 1-2 sentence strategic direction in German (what to argue/which point to develop next), never ready-made text. `responseSchema: { type: 'object', properties: { tippDe: { type: 'string' } }, required: ['tippDe'] }`, `temperature: 0.7`, bare-prose fallback when JSON parsing fails (local-claude), mirror the fallback logic in `generateVortragKiTipp`.

- [ ] **Step 4: Run the test to verify it passes** — `npx vitest run tests/composables/useSchreibenGrader.test.ts`, PASS.
- [ ] **Step 5: Full suite + typecheck** — `npm test`, `npm run typecheck`, clean.

---

### Task 9: Archive extension — module discriminator (ADR-0020)

**Files:**
- Modify: `src/composables/useSprechenArchive.ts`
- Modify: `src/modules/sprechen/SprechenArchive.vue`
- Test: `tests/composables/useSprechenArchive.module.test.ts` (create)

**Interfaces:**
- Produces (Task 12 relies on): `ArchivedCorrection` gains `module?: 'sprechen' | 'schreiben'` (optional, new rows only, ADR-0012 forbids backfill — read-normalized `module: row.module ?? 'sprechen'`, exactly like the existing `part ?? 2` at `useSprechenArchive.ts:80-94`); `listCorrections`/`openCorrections`/`countsByKind` each gain an optional `module` filter parameter alongside `part`.

- [ ] **Step 1: Write the failing test**

Create `tests/composables/useSprechenArchive.module.test.ts`. First check how existing Dexie-touching tests are set up: run `grep -rl "fake-indexeddb\|indexedDB" tests/ package.json`. If a fake-indexeddb harness exists, mirror it and test the full write→read defaulting round-trip; if not, keep the test at the pure level and export the read-normalizer so it is testable:

```ts
import { describe, test, expect } from 'vitest'
import { normalizeCorrection } from '../../src/composables/useSprechenArchive'

describe('archive module discriminator (ADR-0020)', () => {
  const base = {
    id: 'c1', discussionId: 'd1', topicTitle: 'T', modality: 'typed' as const,
    kind: 'grammar' as const, quote: 'q', suggested: 's', reasonDe: 'r', reasonEn: 'r',
    context: 'ctx', createdAt: 1
  }
  test('rows without module read as sprechen; part defaulting unchanged', () => {
    const n = normalizeCorrection(base as any)
    expect(n.module).toBe('sprechen')
    expect(n.part).toBe(2)
  })
  test('schreiben rows keep their discriminator', () => {
    const n = normalizeCorrection({ ...base, module: 'schreiben', part: 1 } as any)
    expect(n.module).toBe('schreiben')
    expect(n.part).toBe(1)
  })
})
```

- [ ] **Step 2: Run it to verify it fails** — FAIL (`normalizeCorrection` not exported).

- [ ] **Step 3: Implement**

In `useSprechenArchive.ts`: add the `module?: 'sprechen' | 'schreiben'` field to `ArchivedCorrection` with a doc comment mirroring the existing `part` comment (lines 37-43) and citing ADR-0020; extract the read normalization into an exported pure `normalizeCorrection(row: ArchivedCorrection): ArchivedCorrection & { part: 1 | 2; module: 'sprechen' | 'schreiben' }` used inside `listCorrections`; widen the filters: `listCorrections(filter: { kind?; part?; module?: 'sprechen' | 'schreiben'; limit? })`, `openCorrections(limit?, part?, module?)`, `countsByKind(part?, module?)` — in-memory filtering after normalization, same as `part` today. `SprechenDrill.vue` stays untouched (pools both modules by design).

In `SprechenArchive.vue`: add a module chip row above the kind filter — `Alle · Sprechen · Schreiben` (a `selectedModule: Ref<'sprechen' | 'schreiben' | null>` passed into `listCorrections`), and a small `Schreiben` badge on rows whose normalized `module === 'schreiben'` (next to the existing "gesprochen" badge slot, same styling class family). Follow the component's existing chip markup for the kind filter (lines 33-135) so the two filter rows look identical.

- [ ] **Step 4: Run the test to verify it passes** — PASS; `npm test` still green (no existing archive test may regress).
- [ ] **Step 5: Typecheck** — clean.

---

### Task 10: Hub, cheatsheet, routes, Home tile

**Files:**
- Create: `src/modules/schreiben/SchreibenHome.vue`
- Create: `src/modules/schreiben/SchreibenCheatsheet.vue`
- Create: `src/components/schreiben/SchrYield.vue`
- Modify: `src/router.ts` (after the sprechen block, ~line 201)
- Modify: `src/modules/home/Home.vue` (tile XIV + breadcrumb)

**Interfaces:**
- Consumes: `SCHREIBEN_THEMEN` + `allThemen`/`doneThemaTitles` (Tasks 2/6), `SCHREIBEN_SCHREIBMITTEL`/`SCHREIB_MOVES`/`SCHREIB_MOVE_LABEL`/`schreibmittelForMove` (Task 3), `SCHREIBEN_TEIL1_TIPPS` (Task 3), `SCHREIBEN_B2_TEIL1` (Task 1), `lifetimeCounts` (`useRedemittelYield.ts`), `loadHistory` (`useQuizHistory.ts`), `countsByKind`/`openCorrections` (Task 9), `SprCriterionBars` (existing).
- Produces: route names `schreiben`, `schreiben-cheatsheet`, `schreiben-teil1`, `schreiben-teil1-prep`, `schreiben-teil1-run`, `schreiben-teil1-result` (Tasks 11-13 navigate by exactly these); `SchrYield.vue` with `defineProps<{ usedIds: string[]; note?: string }>()`.

- [ ] **Step 1: Routes**

In `src/router.ts`, append after the sprechen block, mirroring its comment style:

```ts
  // Schreiben (Goethe B2 exam trainer — CONTEXT.md → Forumsbeitrag). Distinct
  // from /writing, the C1 keep-every-draft tutor.
  { path: '/schreiben', name: 'schreiben', component: () => import('./modules/schreiben/SchreibenHome.vue') },
  { path: '/schreiben/cheatsheet', name: 'schreiben-cheatsheet', component: () => import('./modules/schreiben/SchreibenCheatsheet.vue') },
  { path: '/schreiben/teil1', name: 'schreiben-teil1', component: () => import('./modules/schreiben/Teil1Setup.vue') },
  { path: '/schreiben/teil1/prep', name: 'schreiben-teil1-prep', component: () => import('./modules/schreiben/Teil1Prep.vue') },
  { path: '/schreiben/teil1/run', name: 'schreiben-teil1-run', component: () => import('./modules/schreiben/Teil1Runner.vue') },
  { path: '/schreiben/teil1/result', name: 'schreiben-teil1-result', component: () => import('./modules/schreiben/Teil1Result.vue') },
```

Note: Tasks 11-13 create the four Teil1 components; if this task lands first, create four placeholder SFCs (`<template><div /></template>`) so the router import resolves and typecheck stays green — Tasks 11-13 overwrite them.

- [ ] **Step 2: Home tile**

In `src/modules/home/Home.vue`: append tile XIV to `modules` and bump the breadcrumb `Frontispiece · I/XIII` → `I/XIV`:

```ts
  {
    numeral: 'XIV',
    route: 'schreiben',
    de: 'Goethe B2 · Schreiben',
    title: 'Forumsbeitrag',
    desc: 'Teil 1 der B2-Prüfung trainieren: ein Schreibthema, vier Inhaltspunkte, mindestens 150 Wörter — mit Schreibplan, Redemittel-Drawer und Bewertung nach der offiziellen Rubrik.',
    meta: 'Teil 1 live · Teil 2 folgt · AI-graded'
  }
```

- [ ] **Step 3: SchrYield.vue**

Copy `src/components/sprechen/SprVortragYield.vue` to `src/components/schreiben/SchrYield.vue`, swap `VORTRAG_MOVES`/`VORTRAG_MOVE_LABEL`/`SPRECHEN_VORTRAGSMITTEL` for `SCHREIB_MOVES`/`SCHREIB_MOVE_LABEL`/`SCHREIBEN_SCHREIBMITTEL`, same `defineProps<{ usedIds: string[]; note?: string }>()`. (Kept separate for the same reason SprYield and SprVortragYield are separate — disjoint Move sets.)

- [ ] **Step 4: SchreibenHome.vue**

Mirror `SprechenHome.vue`'s band structure, single-part (no part toggle — Teil 2 is a disabled panel):
- Masthead: breadcrumb `Kapitel · Goethe B2 · Schreiben`, title `Forumsbeitrag<em>.</em>`, subtitle naming Teil 1, the four criteria, and the discard rule ("Der Text wird nach der Bewertung verworfen — was bleibt, sind Korrekturen und Ergebnis").
- Primary tiles: **Teil 1 starten** (→ `schreiben-teil1`, shows `n/24+` done via `doneThemaTitles().size` over `allThemen().length`), **Cheatsheet & Tipps** (→ `schreiben-cheatsheet`), **Fehlerarchiv** (→ `sprechen-archive`), **Korrekturdrill** (→ `sprechen-drill`), and a visually disabled **Teil 2 · halbformelle Nachricht** tile with meta `folgt`.
- Criterion bars: `<SprCriterionBars :typed="latestCriteria" :spoken="null" :rubric="SCHREIBEN_B2_TEIL1" />` where `latestCriteria` = newest `loadHistory()` entry of type `'schreiben-teil1'` reading `meta.sprechenCriteria` (same latest-not-best rule as `SprechenHome.vue:61-65`).
- Ausbeute: `<SchrYield :used-ids="Object.keys(lifetimeCounts(SCHREIBEN_SCHREIBMITTEL))" />`.
- Recent runs list: last 5 `'schreiben-teil1'` runs — date, `meta.topicTitle`, `meta.sprechenScore` / 100, `meta.sprechenPraedikat`.
- Archive teaser: `countsByKind(1, 'schreiben')` chips.
- Copy the scoped CSS from `SprechenHome.vue` and trim to what is used.

- [ ] **Step 5: SchreibenCheatsheet.vue**

Two tabs (mirror `SprechenCheatsheet.vue`'s tab mechanics): **Schreibmittel** — one section per `SCHREIB_MOVES` entry (`SCHREIB_MOVE_LABEL[m].de` heading, the five phrases with `noteEn` subtext, lifetime tick via `lifetimeCounts(SCHREIBEN_SCHREIBMITTEL)`); **Strategie** — render `SCHREIBEN_TEIL1_TIPPS` sections as headed lists (the "a lot of tips" surface). Back link to `schreiben`.

- [ ] **Step 6: Verify**

`npm run typecheck` clean; `npm test` green; `npm run dev` and click Home → tile XIV → hub → cheatsheet (controller may verify visually via Playwright MCP later — do not block on it).

---

### Task 11: Teil1Setup.vue + Teil1Prep.vue

**Files:**
- Create: `src/modules/schreiben/Teil1Setup.vue`
- Create: `src/modules/schreiben/Teil1Prep.vue`

**Interfaces:**
- Consumes: `drawThema`/`allThemen`/`generateThemen`/`addCustomThemen`/`deleteCustomThema`/`doneThemaTitles` (Task 6), `resolveSchreibArgumentBank` (Task 4) + `loadCachedSchreibBank`/`generateSchreibArgumentBank`/`saveCachedSchreibBank` (Task 7), `SchreibenRunStash`/`SCHREIBEN_STASH_KEY`/`emptySchreibPlan`/`SchreibHelps` (Task 5), `findActiveBeitrag` (Task 5), `useSettings`/`resolveAiClient`, route names (Task 10).
- Produces: the one-shot stash contract — Setup writes `SchreibenRunStash` to `sessionStorage[SCHREIBEN_STASH_KEY]`; Prep re-writes it (debounced) with the live plan; Runner (Task 12) consumes it once.

- [ ] **Step 1: Teil1Setup.vue**

Mirror `src/modules/sprechen/Teil1Setup.vue`'s skeleton, with these Schreiben rules:
- localStorage key `schreibenTeil1Setup`, stored shape `{ hintsOn?: boolean; checklistOn?: boolean; kiTippOn?: boolean; timerOn?: boolean; lang?: 'de' | 'en' }`, merge-write on change (same `watch` + spread pattern as `Teil1Setup.vue:141-154`; Result also writes `lang` into this key).
- Thema draw: **one** Schreibthema via `drawThema()` shown as the full task sheet preview (title, `forumContextDe`, `taskDe`, the four Inhaltspunkte as a numbered list, tag chips, `erledigt` mark when `doneThemaTitles()` has it) + a `Neu ziehen` reroll button + a collapsible full-pool list (seeded + custom, custom rows deletable) to pick directly.
- `Neue Themen generieren (KI)` button gated on `canUseAi`: `generateThemen(resolveAiClient(settings), model)` → `addCustomThemen`, toast on failure (mirror the Sprechen setup's generation UX).
- Four help toggles: Hinweise (drawer + nudge), Checkliste (plan signals + word bar), KI-Tipp, Timer — defaults all **on**.
- Resume banner: `findActiveBeitrag()` on mount → „Forumsbeitrag fortsetzen?" with `Fortsetzen` (→ `schreiben-teil1-run` directly, no stash) and `Verwerfen` (`abandonBeitrag`), exactly the `Teil1Setup.vue:107,212` pattern.
- `Weiter zur Planung` CTA: write `SchreibenRunStash` (`{ thema: toRef(chosen), helps, plan: emptySchreibPlan(), model }` — `SchreibThemaRef` is the denormalized copy of the chosen thema) to `sessionStorage[SCHREIBEN_STASH_KEY]`, then `router.push({ name: 'schreiben-teil1-prep' })`. There is no prep-skip toggle: Prep itself has an „Ohne Plan starten" button (the Schreibplan is skippable, CONTEXT.md → Schreibplan).

- [ ] **Step 2: Teil1Prep.vue**

Mirror `src/modules/sprechen/Teil1Prep.vue`:
- Read the stash on mount (missing → back to `schreiben-teil1`).
- Task sheet at the top (context, task, the four Inhaltspunkte).
- **Schreibplan**: one keyword input per Inhaltspunkt (`plan[index].keyword`), with the same advisory hygiene warnings as `Teil1Prep.vue:65-94` (min 4 normalized chars, no keyword a substring of another; same normalizer: strip `.,;:!?…`, collapse whitespace, lowercase). Never gates the CTA.
- **Argumente panel**: `loadCachedSchreibBank(thema.id)` → `resolveSchreibArgumentBank(thema, cached)`; render pro/contra claims + `words`/`phrases` lists with EN glosses; a `Bank mit KI verfeinern` button gated on `canUseAi` → `generateSchreibArgumentBank` → `saveCachedSchreibBank` → re-resolve (mirror Teil2Prep's flow); scope note line („aus dem Fach {tag}" when scope is a tag, „für dieses Thema" when flagship/cached).
- Debounced (~500 ms) stash re-write with the live plan (`Teil1Prep.vue:177-191` pattern); `Schreiben beginnen` flushes synchronously then → `schreiben-teil1-run`; `Ohne Plan starten` clears keywords then navigates; back link → `schreiben-teil1`.

- [ ] **Step 3: Verify**

`npm run typecheck` clean. Manual: Setup draws a sheet, reroll works, toggles persist across reload, Prep shows the bank and plan inputs, CTA lands on the (placeholder) Runner without console errors.

---

### Task 12: Teil1Runner.vue — the guided sitting

**Files:**
- Create: `src/modules/schreiben/Teil1Runner.vue` (overwrite placeholder)

**Interfaces:**
- Consumes: everything from Tasks 5, 8, 9 plus `matchRedemittel`/`pickMoveNudge`/`movesUsed` (`useRedemittelMatch.ts`), `bumpRedemittelYield`/`lifetimeCounts` (`useRedemittelYield.ts`), `appendCorrections` (Task 9), `saveQuizRun` (`useQuizHistory.ts`), `praedikat` already inside the grade result, `SCHREIBEN_SCHREIBMITTEL`/`SCHREIB_MOVES`/`SCHREIB_MOVE_LABEL`/`schreibmittelForMove` (Task 3), `generateSchreibenKiTipp` (Task 8), `HelpKind` (`data/sprechen.ts`), the `sentenceAround` helper (locate it where `Teil1Runner.vue` imports it from and import the same).
- Produces: on successful grade — the `SchreibenResultStash` in `sessionStorage[SCHREIBEN_RESULT_KEY]`, the recorded Run, archived corrections, banked yield; then the Dexie row is deleted and navigation goes to `schreiben-teil1-result`.

- [ ] **Step 1: Lifecycle and state (mirror `sprechen/Teil1Runner.vue`'s mount contract)**

On mount: consume `sessionStorage[SCHREIBEN_STASH_KEY]` (then `removeItem` immediately) → `createBeitrag({ thema, helps, plan })`; if no stash, `findActiveBeitrag()`; if neither, back to `schreiben-teil1`. Core refs: `beitrag: Ref<SchreibenBeitrag | null>`, `textDraft: Ref<string>` (seeded from `beitrag.textDe` on resume), `grading/gradeFailed/awaitingGradeStart/runRecorded` booleans, `nudgeDismissed`, `kiTipp: Ref<string | null>`, `elapsedSeconds` (interval from `beitrag.startedAt`, display only).

- [ ] **Step 2: Editor + live meters**

A single `<textarea>` (autofocus, spellcheck **off** — the learner's spelling is graded) bound to `textDraft`, debounced 1 s into `saveText(beitrag.id, textDraft)` (the resume guarantee, `Teil1Runner.vue:311-320` pattern). Word count via the same `countWords` used by the Vortrag runner (import from `useSpeechRecognizer.ts` if exported, else the one-liner `trimmed.split(/\s+/).length`). Meters (gated on `helps.checklist`):
- Word bar: fill `Math.min(100, words / SCHREIBEN_TARGET_WORDS * 100)%`, class from `schreibenWordBand(words)`; label `X Wörter · mindestens 150`.
- Timer (gated additionally on `helps.timer`): countdown `schreibenClock(max(0, SCHREIBEN_TIME_BUDGET_SECONDS - elapsedSeconds))`, once over budget switch to `+schreibenClock(elapsed - budget)` in the `over` style — soft, display only, never blocks (ADR: the glossary's soft-countdown rule).
- Inhaltspunkt checklist: four dots — `plan` keywords matched against `textDraft` with the exact normalized-substring rule of `useVortragCoverage.ts:46-60` (inline a local `planSignals` equivalent over indices; keywordless entries render as neutral).

- [ ] **Step 3: Helps (all logged via `logHelp`, mirroring the Vortrag `HelpKind` semantics)**

- Drawer (gated `helps.hints`): tabs **Schreibmittel** (Move chips → `schreibmittelForMove`, click inserts `phraseDe` at the caret into `textDraft` and logs `'phrase'`; tab/Move changes log `'drawer'`) and **Argumente** (the Prep bank via `resolveSchreibArgumentBank(thema, cached)` — read-only here, no generation).
- Move nudge (gated `helps.hints`): `pickMoveNudge([frozenText], lifetimeCounts(SCHREIBEN_SCHREIBMITTEL), SCHREIBEN_SCHREIBMITTEL, SCHREIB_MOVES)` re-evaluated per 40-word band with the frozen-text pattern (`Teil1Runner.vue:246-261`), rendered as „Diesmal: {label}" with a dismiss ×, log `'nudge'` once on first visibility.
- KI-Tipp (gated `helps.kiTipp && canUseAi`): button → `incrementKiTipp` **before** assigning the tip (billing order, `Teil1Runner.vue:534-552`), `generateSchreibenKiTipp`, log `'kitipp'`.
- No Rettungsleine, no stuck-detection, no TTS (speech-specific — deliberately absent).

- [ ] **Step 4: Submission + grading pipeline**

`Abgeben & bewerten` CTA: if `words < SCHREIBEN_MIN_WORDS`, `window.confirm` warning first (mirror `Teil1Runner.vue:688-691`). Then `markSubmitted` → `runGrading()`:

```ts
async function runGrading() {
  const b = beitrag.value!; grading.value = true; gradeFailed.value = false
  try {
    const result = await gradeSchreiben(resolveAiClient(settings.value), model.value, b)
    const finishedAt = Date.now()
    const matched = matchRedemittel([b.textDe], SCHREIBEN_SCHREIBMITTEL).map(p => p.id)
    if (!runRecorded.value) {
      runRecorded.value = true
      bumpRedemittelYield(matched, finishedAt)
      saveQuizRun({
        type: 'schreiben-teil1',
        startedAt: new Date(b.startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: finishedAt - b.startedAt,
        count: 100, correct: result.totalScore,
        meta: {
          topicTitle: b.thema.titleDe,
          sprechenScore: result.totalScore, maxScore: 100, passes: result.passes,
          sprechenPraedikat: result.praedikat,
          sprechenCriteria: result.criteria.map(c => ({ key: c.key, score: c.score, maxPoints: c.maxPoints })),
          sprechenModality: 'typed',
          sectionsCovered: result.coverage.filter(c => c.covered).length,
          wordCount: countWords(b.textDe),
          sprechenVortragsmittel: matched, kiTippCount: b.kiTippCount,
          sprechenHelps: b.helps,
          sprechenAufwertungen: result.aufwertungen,
          sprechenMistakeCounts: countMistakes(result.mistakes),
          sprechenStrengths: result.strengths, sprechenWeaknesses: result.weaknesses,
          sprechenOverallDe: result.overallDe, sprechenOverallEn: result.overallEn
        }
      })
      try {
        await appendCorrections(result.mistakes.map(m => ({
          discussionId: b.id, topicTitle: b.thema.titleDe, modality: 'typed' as const,
          kind: m.kind, quote: m.quote, suggested: m.suggested,
          reasonDe: m.reasonDe, reasonEn: m.reasonEn,
          context: sentenceAround(b.textDe, m.spanStart),
          part: 1 as const, module: 'schreiben' as const
        })))
      } catch { toast('Fehlerarchiv nicht erreichbar — Korrekturen nicht gespeichert.') }
    }
    const stash: SchreibenResultStash = {
      thema: b.thema, helps: b.helps, plan: b.plan,
      wordCount: countWords(b.textDe), kiTippCount: b.kiTippCount, helpLog: b.helpLog,
      schreibmittel: matched, startedAt: b.startedAt, finishedAt, result
    }
    sessionStorage.setItem(SCHREIBEN_RESULT_KEY, JSON.stringify(stash))
    await deleteBeitrag(b.id)                       // ADR-0019: the essay dies here
    router.push({ name: 'schreiben-teil1-result' })
  } catch {
    gradeFailed.value = true                         // row stays 'submitted'; retry re-grades, latch prevents double-record
  } finally { grading.value = false }
}
```

(`countMistakes` = fold to `Partial<Record<SprechenErrorTag, number>>`. `sentenceAround` — same import as the Vortrag runner uses.) Grade-failed state shows the retry alert (mirror `Teil1Runner.vue:1085-1092`); `Abbrechen` → `abandonBeitrag` + back to setup.

- [ ] **Step 5: Verify**

`npm run typecheck` clean, `npm test` green. Manual smoke: write ≥150 words, watch dots/meters, insert a phrase, grade (needs AI configured), land on Result; reload mid-writing and resume via Setup banner.

---

### Task 13: Teil1Result.vue

**Files:**
- Create: `src/modules/schreiben/Teil1Result.vue` (overwrite placeholder)

**Interfaces:**
- Consumes: `SCHREIBEN_RESULT_KEY`/`SchreibenResultStash` (Task 8), `SCHREIBEN_B2_TEIL1` (Task 1), `SchrYield` (Task 10), `SCHREIB_MOVE_LABEL` (Task 3), route names, the `schreibenTeil1Setup` localStorage key for the `lang` toggle.

- [ ] **Step 1: Implement (mirror `sprechen/Teil1Result.vue` section-for-section)**

- Read `sessionStorage[SCHREIBEN_RESULT_KEY]` once on mount; absent → the permanent „Dieses Ergebnis wird nur einmal angezeigt" notice.
- Header: score `/100`, Prädikat, pass marker, thema title, word count, DE/EN language toggle (persisted as `lang` in `schreibenTeil1Setup`, merge-write).
- Criterion bars: per-criterion score vs 25 with the rubric descriptors (inline bars like `Teil1Result.vue:360`), justifications in the toggled language.
- **Inhaltspunkte coverage**: four rows — grader's `covered` ✓/✗ + note, plus the local plan-keyword `said` signal as a secondary dot where a keyword existed (both signals side by side, `Teil1Result.vue:129-151` pattern).
- **Korrekturen**: one card per mistake — quote → suggested, kind chip (the five Correction-tag labels), reason in toggled language; footer note that these are now in the Fehlerarchiv (link → `sprechen-archive`).
- **Aufwertungen**: quote → better + why, visually distinct from mistakes („war nicht falsch").
- Stärken/Schwächen lists + `overallDe/En`.
- Ausbeute: `<SchrYield :used-ids="data.schreibmittel" />` + per-Move counts.
- Hilfe-Protokoll: per-kind totals over the fixed order `['drawer','phrase','nudge','kitipp']` + the per-minute strip (`Teil1Result.vue:274-299` pattern, minute buckets from `startedAt→finishedAt`), with the same „rein beschreibend" footer.
- Actions: `Neuer Forumsbeitrag` (→ `schreiben-teil1`), `Zur Übersicht` (→ `schreiben`), `Fehlerarchiv` (→ `sprechen-archive`), `Korrekturdrill` (→ `sprechen-drill`).

- [ ] **Step 2: Verify**

`npm run typecheck` clean. Manual: grade a run (or hand-inject a stash in devtools) and check every section renders in both languages.

---

### Task 14: README + final sweep

**Files:**
- Modify: `README.md` (module list, if one exists — `grep -n "Sprechen" README.md`)

**Interfaces:** none new. (The history/stats/label maps were Task 8's job — verify here that `grep -rn "'schreiben-teil1'" src | wc -l` covers useQuizHistory, quiz-type-labels ×3, useQuizStats ×2, HistoryPage ×2, useLevelAssessment, and the module code itself.)

- [ ] **Step 2: README**

Add the module to README's feature list next to the Sprechen entry (one bullet: Goethe B2 Schreiben Teil 1 trainer — Schreibthemen, Schreibplan, Schreibmittel cheatsheet, official-rubric AI grading, shared Fehlerarchiv).

- [ ] **Step 3: Full verification**

Run: `npm test` → all green. `npm run typecheck` → clean. `npm run build` → succeeds.

- [ ] **Step 4: Self-review sweep**

`grep -rn "TODO\|FIXME\|placeholder" src/modules/schreiben src/data/schreiben* src/composables/useSchreiben*` → empty. Grep `Vortrag` inside `src/modules/schreiben/` → only in comments referencing the mirrored pattern, never in UI copy.

