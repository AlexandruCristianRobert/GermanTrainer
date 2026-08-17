# Schreiben B2 · Teil 2 (Nachricht) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Schreiben Teil 2 trainer — one Schreibauftrag (situation + Empfänger + four Inhaltspunkte + Schreibanlass), one guided halbformelle-Nachricht sitting, AI grading against the four official criteria — with the full Teil 1 helper suite plus the new Teil-2 helpers (Rahmen-Gerüst scaffold, Gerüst-Check, Du/Sie-Radar, Höflichkeits-Check, Zeit-Phasen, Anlass-aware Move nudge, Inhalts-Baukasten), 20 seeded Aufträge in five Anlass groups, and five 4-layer Musternachrichten.

**Architecture:** A structural mirror of Schreiben Teil 1 (Forumsbeitrag): seeded + AI-custom pools in plain TS/localStorage, a Dexie row (`schreibenNachrichten`, v16) for resumability, one-shot sessionStorage stashes, a single non-streaming grade call validated key-by-key, Runs in `gt:quizHistory`, corrections into the shared archive with `module:'schreiben', part:2` (ADR-0020), text discarded after grading (ADR-0019). Teil 2 diverges where ADR-0023 says it must: the Schreibanlass is a **structural field** (stored, generated, filtered, Musternachricht-keyed, Move-aptness-driving), and the local-check helpers exploit the genre's fixed frame.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Dexie 4, Vitest 4, vue-tsc. AI via `resolveAiClient` (Gemini or local-claude bridge).

**Spec:** `CONTEXT.md` → *Schreiben* section (Nachricht, Schreibauftrag, Schreibanlass, Nachrichtenmittel, Musternachricht, Rahmen-Gerüst, Gerüst-Check, Radar, Inhalts-Baukasten inside Schreibauftrag) + `docs/adr/0023-schreibanlass-structural-field.md`, `docs/adr/0019-*.md`, `docs/adr/0020-*.md`.

## Global Constraints

- Read the spec files above before starting. They are the spec; this plan implements them.
- The text is **discarded after grading** (ADR-0019). Never persist `textDe`/slots beyond the Dexie in-progress row and the one-shot result stash.
- Corrections go into the existing `db.sprechenCorrections` via `appendCorrections` with `module: 'schreiben', part: 2, modality: 'typed'` (ADR-0020). The module discriminator and `normalizeCorrection` already exist — no archive changes in this plan.
- Every validator matches keyed arrays **by key, never by position**; every prompt spells out the exact JSON envelope in prose (the local-claude bridge silently drops `responseSchema`).
- UI copy is German in the Schreiben module's voice; English only in `noteEn`/`labelEn` secondary glosses. The unit is **Nachricht**, the sheet **Schreibauftrag**, its points **Inhaltspunkte**, the group **Schreibanlass** — never "E-Mail" (the medium), "Thema", "Szenario", "Textsorte".
- Word rules: `NACHRICHT_MIN_WORDS = 100` (exam: "mindestens 100 Wörter"), target 120, comfort ceiling 160. Time budget 25 min, **soft** — overtime shown, never enforced, no auto-submit. Phases 5 planen / 15 schreiben / 5 prüfen, display only.
- Modality is always `'typed'`. `spelling` mistakes are always assignable.
- Ids: Schreibaufträge `wa-<slug>` (custom `wa-custom-<epoch>-<i>`), Nachrichtenmittel `nm-<move>-<n>`, Rahmen-Paare `rp-<n>`. `wa-`/`nm-` keep the shared yield store (`gt:sprechenRedemittel`) and archive collision-free (`wt-`/`sm-` are Teil 1's).
- Anlass slugs are **frozen API** (ADR-0023): `entschuldigung | bitte | beschwerde | vorschlag | dank`.
- The five Nachrichtfunktionen occasion-cores map onto these slugs; `bezug`, `begruendung`, `abschluss` fit every Nachricht. The nudge must never suggest a Move not apt for the Auftrag's Anlass.
- Mobile-first: every new screen must render and work at ~390 px width (the app is phone-first).
- Verification commands: `npx vitest run <file>` per task, `npm test` + `npm run typecheck` (vue-tsc — plain `tsc` produces bogus `.vue` errors) at the end of every task.
- Never run `git` from a subagent; the controller commits.
- Existing files you extend (`rubrics.ts`, `schreibenTipps.ts`, `useQuizHistory.ts`, `router.ts`, `nav.ts`, `Home.vue`, `SchreibenHome.vue`, `SchreibenCheatsheet.vue`, `db/index.ts`, `quiz-type-labels.ts`, `useQuizStats.ts`, `HistoryPage.vue`, `useLevelAssessment.ts`) — change only what the task names; never reformat neighboring code.

**Parallel dispatch map (controller, ≤5 concurrent):** Wave A = Tasks 1–2 · Wave B = Tasks 3, 5 · Wave C = Tasks 4, 6, 7, 8, 9 · Wave D = Tasks 10, 11 · Wave E = Tasks 12, 13, 14 (disjoint SFCs, routes exist after 11) · Wave F = Task 15.

---

### Task 1: Goethe B2 Schreiben Teil 2 rubric

**Files:**
- Modify: `src/data/rubrics.ts` (append `SCHREIBEN_B2_TEIL2` directly after `SCHREIBEN_B2_TEIL1`)
- Test: `tests/data/rubrics.schreiben2.test.ts` (create)

**Interfaces:**
- Consumes: `SprechenRubric` (in `rubrics.ts`).
- Produces: `export const SCHREIBEN_B2_TEIL2: SprechenRubric` — Tasks 9, 11, 14 import it. Criterion keys exactly `'erfuellung' | 'kohaerenz' | 'wortschatz' | 'strukturen'`, 25 points each, `totalMax: 100`, `passingScore: 60`, no spoken descriptor variants.

- [ ] **Step 1: Write the failing test**

Create `tests/data/rubrics.schreiben2.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { SCHREIBEN_B2_TEIL2, praedikat } from '../../src/data/rubrics'

describe('SCHREIBEN_B2_TEIL2 rubric', () => {
  test('four criteria à 25, total 100, pass 60 — same scale as Teil 1', () => {
    expect(SCHREIBEN_B2_TEIL2.totalMax).toBe(100)
    expect(SCHREIBEN_B2_TEIL2.passingScore).toBe(60)
    expect(SCHREIBEN_B2_TEIL2.criteria.map(c => c.key))
      .toEqual(['erfuellung', 'kohaerenz', 'wortschatz', 'strukturen'])
    for (const c of SCHREIBEN_B2_TEIL2.criteria) expect(c.maxPoints).toBe(25)
  })
  test('typed-only: no spoken descriptor variants', () => {
    for (const c of SCHREIBEN_B2_TEIL2.criteria) expect(c.descriptorSpokenDe).toBeUndefined()
    expect(SCHREIBEN_B2_TEIL2.notesSpokenDe).toBeUndefined()
  })
  test('erfuellung judges the frame and the word floor; strukturen names Konjunktiv II', () => {
    expect(SCHREIBEN_B2_TEIL2.criteria[0].descriptorDe).toMatch(/Anrede/)
    expect(SCHREIBEN_B2_TEIL2.criteria[0].descriptorDe).toMatch(/Inhaltspunkte/)
    expect(SCHREIBEN_B2_TEIL2.criteria[3].descriptorDe).toMatch(/Konjunktiv II/)
    expect(SCHREIBEN_B2_TEIL2.notes).toMatch(/100/)
  })
  test('praedikat mapping unchanged', () => {
    expect(praedikat(90)).toBe('sehr gut')
    expect(praedikat(59)).toBe('nicht bestanden')
  })
})
```

- [ ] **Step 2: Run it to verify it fails** — `npx vitest run tests/data/rubrics.schreiben2.test.ts`, FAIL (not exported).

- [ ] **Step 3: Add the rubric const**

Append after `SCHREIBEN_B2_TEIL1`, mirroring its comment style:

```ts
/**
 * Schreiben Teil 2 · Nachricht. Same SprechenRubric shape as Teil 1 — four
 * criteria à 25, pass at 60, same Prädikat bands. Typed-only. What Teil 2
 * grades differently lives in the descriptors: the communicative frame
 * (Betreff, Anrede, Grußformel), the Sie-register, and the politeness
 * grammar of requests. Inhaltspunkt coverage is judged by the grader inside
 * `erfuellung`, never mechanically measured (ADR-0014's logic).
 */
export const SCHREIBEN_B2_TEIL2: SprechenRubric = {
  labelDe: 'Goethe-Zertifikat B2 · Schreiben Teil 2 (adaptiert)',
  totalMax: 100,
  passingScore: 60,
  criteria: [
    {
      key: 'erfuellung',
      labelDe: 'Erfüllung / Inhalt',
      labelEn: 'Task fulfilment / content',
      maxPoints: 25,
      descriptorDe:
        'Werden alle vier Inhaltspunkte des Aufgabenblatts behandelt — jeweils mit ' +
        'mindestens einem eigenen Gedanken? Ist der Text eine erkennbare halbformelle ' +
        'Nachricht an die genannte Person: Betreff, passende Anrede, Bezug auf die ' +
        'Situation, Grußformel mit Name? Ein fehlender Inhaltspunkt oder eine fehlende ' +
        'Anrede/Grußformel begrenzt dieses Kriterium deutlich; ebenso ein Text klar ' +
        'unter der Mindestwortzahl.'
    },
    {
      key: 'kohaerenz',
      labelDe: 'Kohärenz & Textaufbau',
      labelEn: 'Coherence & text structure',
      maxPoints: 25,
      descriptorDe:
        'Folgt die Nachricht einem klaren Bogen — Bezug auf den Anlass, Erklärung der ' +
        'Situation, Anliegen, verbindlicher Abschluss? Sind die Inhaltspunkte zu ' +
        'Absätzen gebündelt statt aneinandergereiht, und verbinden Konnektoren ' +
        '(deshalb, daher, dennoch, außerdem) die Gedanken sichtbar?'
    },
    {
      key: 'wortschatz',
      labelDe: 'Wortschatz & Register',
      labelEn: 'Vocabulary & register',
      maxPoints: 25,
      descriptorDe:
        'Ist der Wortschatz präzise und durchgehend im Sie-Register — höfliche ' +
        'Wendungen des Bittens, Entschuldigens, Vorschlagens statt Alltagston? ' +
        'Registerbrüche (du-Formen, mündliche Füller, saloppe Abkürzungen) und ' +
        'unpassend distanzlose Formulierungen kosten hier.'
    },
    {
      key: 'strukturen',
      labelDe: 'Strukturen',
      labelEn: 'Structures',
      maxPoints: 25,
      descriptorDe:
        'Wie korrekt und variantenreich sind die Strukturen — Konjunktiv II für ' +
        'höfliche Bitten (könnten Sie, wäre es möglich), Nebensätze, indirekte ' +
        'Fragen, korrekte Kommasetzung um Anrede und Einschübe? Wie häufig und wie ' +
        'schwerwiegend sind Fehler in Deklination, Konjugation und Rechtschreibung?'
    }
  ],
  notes:
    'Adaptierte Bewertung für getippte halbformelle Nachrichten (Schreiben Teil 2): ' +
    'vier Kriterien zu je 25 Punkten, Bestehensgrenze 60. Die Aufgabe verlangt ' +
    'mindestens 100 Wörter; ein deutlich kürzerer Text senkt die Erfüllung. ' +
    'Prädikate wie im Goethe-Zeugnis: 90+ sehr gut, 80+ gut, 70+ befriedigend, ' +
    '60+ ausreichend, darunter nicht bestanden.'
}
```

- [ ] **Step 4: Run the test to verify it passes** — PASS (4 tests).
- [ ] **Step 5: Typecheck** — `npm run typecheck`, clean.

---

### Task 2: Schreibauftrag seed pool (20, 4 per Anlass)

**Files:**
- Create: `src/data/schreibenAuftraege.ts`
- Test: `tests/data/schreibenAuftraege.test.ts` (create)

**Interfaces:**
- Consumes: nothing app-side (self-contained data module).
- Produces (Tasks 3–14 rely on these exact names):

```ts
export const SCHREIB_ANLAESSE = ['entschuldigung', 'bitte', 'beschwerde', 'vorschlag', 'dank'] as const
export type SchreibAnlass = (typeof SCHREIB_ANLAESSE)[number]
export const ANLASS_LABEL: Record<SchreibAnlass, { de: string; en: string }>
// entschuldigung „Entschuldigung & Absage" · bitte „Bitte & Anfrage" ·
// beschwerde „Beschwerde & Problem melden" · vorschlag „Vorschlag & Anregung" ·
// dank „Dank & Rückmeldung"

export interface Schreibauftrag {
  id: string                   // 'wa-<slug>' | custom: 'wa-custom-<epoch>-<i>'
  titleDe: string              // short unique label — the done-auftrag memory key
  situationDe: string          // 1-2 sentences: the workplace/course situation
  empfaengerName: string       // 'Frau Kling' / 'Herr Semder' — what the Anrede must contain
  empfaengerRolleDe: string    // 'Ihre Vorgesetzte', 'Ihr Kursleiter', …
  taskDe: string               // exam instruction, starts with NACHRICHT_TASK_PREFIX, names the 100-word floor
  inhaltspunkte: string[]      // exactly four, situation-flavored (CONTEXT.md → Inhaltspunkt)
  anlass: SchreibAnlass        // exactly one — structural (ADR-0023)
  level: 'B2'
  source: 'seed' | 'custom'
}
export const NACHRICHT_TASK_PREFIX = 'Schreiben Sie eine Nachricht'
export const SCHREIBEN_AUFTRAEGE: Schreibauftrag[]     // exactly 20 seeded, 4 per Anlass
export const SCHREIBAUFTRAG_GENERATOR_SCHEMA: object   // Gemini responseSchema for Task 7
export function A(id: string, titleDe: string, anlass: SchreibAnlass, empfaengerName: string,
  empfaengerRolleDe: string, situationDe: string, taskDe: string, inhaltspunkte: string[]): Schreibauftrag
```

- [ ] **Step 1: Write the failing test**

Create `tests/data/schreibenAuftraege.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  SCHREIBEN_AUFTRAEGE, SCHREIB_ANLAESSE, ANLASS_LABEL,
  NACHRICHT_TASK_PREFIX, SCHREIBAUFTRAG_GENERATOR_SCHEMA
} from '../../src/data/schreibenAuftraege'

describe('schreibenAuftraege seed pool', () => {
  test('exactly 20 Aufträge, unique ids and titles, 4 per Anlass', () => {
    expect(SCHREIBEN_AUFTRAEGE.length).toBe(20)
    expect(new Set(SCHREIBEN_AUFTRAEGE.map(a => a.id)).size).toBe(20)
    expect(new Set(SCHREIBEN_AUFTRAEGE.map(a => a.titleDe)).size).toBe(20)
    for (const anlass of SCHREIB_ANLAESSE) {
      expect(SCHREIBEN_AUFTRAEGE.filter(a => a.anlass === anlass).length, anlass).toBe(4)
    }
  })
  test('ids match wa- slug pattern', () => {
    for (const a of SCHREIBEN_AUFTRAEGE) expect(a.id).toMatch(/^wa-[a-z0-9-]+$/)
  })
  test('taskDe: exam wording with the 100-word floor, names the Empfänger, no question mark', () => {
    for (const a of SCHREIBEN_AUFTRAEGE) {
      expect(a.taskDe.startsWith(NACHRICHT_TASK_PREFIX), a.id).toBe(true)
      expect(a.taskDe, a.id).toMatch(/mindestens 100 Wörter/)
      expect(a.taskDe, a.id).toContain(a.empfaengerName)
      expect(a.taskDe, a.id).not.toContain('?')
      expect(a.taskDe.length, a.id).toBeGreaterThan(60)
      expect(a.taskDe.length, a.id).toBeLessThan(280)
    }
  })
  test('situationDe situates; Empfänger has name and role', () => {
    for (const a of SCHREIBEN_AUFTRAEGE) {
      expect(a.situationDe.trim().length, a.id).toBeGreaterThan(40)
      expect(a.situationDe.length, a.id).toBeLessThan(300)
      expect(a.empfaengerName, a.id).toMatch(/^(Frau|Herr) [A-ZÄÖÜ]/)
      expect(a.empfaengerRolleDe.trim().length, a.id).toBeGreaterThan(3)
    }
  })
  test('exactly four situation-flavored Inhaltspunkte each, distinct, no question marks', () => {
    for (const a of SCHREIBEN_AUFTRAEGE) {
      expect(a.inhaltspunkte.length, a.id).toBe(4)
      for (const p of a.inhaltspunkte) {
        expect(p.trim().length, a.id).toBeGreaterThan(15)
        expect(p.length, a.id).toBeLessThan(140)
        expect(p, a.id).not.toContain('?')
      }
      expect(new Set(a.inhaltspunkte).size, a.id).toBe(4)
    }
  })
  test('titles 3-45 chars; every seed entry B2/seed; labels for all five Anlässe', () => {
    for (const a of SCHREIBEN_AUFTRAEGE) {
      expect(a.titleDe.length).toBeGreaterThanOrEqual(3)
      expect(a.titleDe.length).toBeLessThanOrEqual(45)
      expect(a.level).toBe('B2')
      expect(a.source).toBe('seed')
    }
    for (const anlass of SCHREIB_ANLAESSE) {
      expect(ANLASS_LABEL[anlass].de.length).toBeGreaterThan(3)
      expect(ANLASS_LABEL[anlass].en.length).toBeGreaterThan(3)
    }
  })
  test('generator schema requires the seven content fields incl. anlass', () => {
    const req = (SCHREIBAUFTRAG_GENERATOR_SCHEMA as any).properties.auftraege.items.required
    expect(req).toEqual(['titleDe', 'situationDe', 'empfaengerName', 'empfaengerRolleDe', 'taskDe', 'inhaltspunkte', 'anlass'])
  })
})
```

- [ ] **Step 2: Run it to verify it fails** — FAIL, module not found.

- [ ] **Step 3: Author the pool**

Create `src/data/schreibenAuftraege.ts` with a header comment mirroring `schreibenThemen.ts`'s (what the pool is, CONTEXT.md → Schreibauftrag/Schreibanlass, ADR-0023: anlass is structural). Two entries verbatim (author the remaining 18 in exactly this register — a real workplace/course situation, a named Empfänger, an instruction naming the Empfänger and the 100-word floor, four situation-flavored points following the exam's recurring patterns: Bezug/Dank für die Information · Situation/Grund erklären · Bitte/Vorschlag/Forderung · Ausblick/Verbindlichkeit):

```ts
export const SCHREIBEN_AUFTRAEGE: Schreibauftrag[] = [
  A('wa-besprechung-absagen', 'Absage einer Besprechung', 'entschuldigung',
    'Herr Semder', 'Ihr Abteilungsleiter',
    'Ihr Abteilungsleiter, Herr Semder, hat Sie zu einer wichtigen Team-Besprechung am Freitag eingeladen. Am selben Tag haben Sie einen unaufschiebbaren Arzttermin.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Herrn Semder.',
    [
      'Entschuldigen Sie sich höflich, dass Sie nicht an der Besprechung teilnehmen können.',
      'Erklären Sie den Grund für Ihre Absage.',
      'Schlagen Sie vor, wie Sie die Inhalte der Besprechung nachholen können.',
      'Bitten Sie um die Unterlagen oder das Protokoll.'
    ]),
  A('wa-homeoffice-antrag', 'Bitte um Homeoffice', 'bitte',
    'Frau Kling', 'Ihre Vorgesetzte',
    'Sie arbeiten in Vollzeit im Büro. Aus familiären Gründen möchten Sie künftig zwei Tage pro Woche von zu Hause arbeiten.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihre Vorgesetzte, Frau Kling.',
    [
      'Nennen Sie Ihr Anliegen und beziehen Sie sich auf Ihre Situation.',
      'Begründen Sie, warum das Homeoffice für Sie wichtig ist.',
      'Erklären Sie, wie Sie Ihre Aufgaben von zu Hause zuverlässig erledigen.',
      'Bitten Sie um ein Gespräch oder eine Rückmeldung.'
    ]),
  // …18 more, one A(...) per block, same register …
]
```

Pin these 18 remaining ids/titles/Anlässe/Empfänger (author `situationDe`, `taskDe`, `inhaltspunkte` for each; keep ~2/3 work, ~1/3 course/education contexts):

*entschuldigung:* `wa-fortbildung-krank` „Krankmeldung zur Fortbildung" — Frau Berger, Ihre Ansprechpartnerin in der Personalabteilung · `wa-projekt-verspaetung` „Verspätete Abgabe" — Frau Weber, Ihre Projektleiterin · `wa-kurs-fehlen` „Fehlen im Deutschkurs" — Herr Roth, Ihr Kursleiter.
*bitte:* `wa-infos-konferenz` „Bitte um Informationen zur Konferenz" — Herr Maurer, der Organisator der Konferenz · `wa-urlaub-verschieben` „Bitte um Urlaubsverschiebung" — Frau Steiner, Ihre Teamleiterin · `wa-empfehlung-praktikum` „Bitte um ein Empfehlungsschreiben" — Frau Lang, Ihre Dozentin.
*beschwerde:* `wa-kantine-qualitaet` „Beschwerde über die Kantine" — Herr Vogel, der Verwaltungsleiter · `wa-it-probleme` „Störungen im IT-System" — Frau Brandt, die IT-Leiterin · `wa-laerm-buero` „Lärm im Großraumbüro" — Herr Fischer, der Office-Manager · `wa-kurs-ausstattung` „Mängel im Kursraum" — Frau Hoffmann, die Leiterin der Sprachschule.
*vorschlag:* `wa-teamausflug` „Vorschlag für den Teamausflug" — Frau Neumann, Ihre Abteilungsleiterin · `wa-gruenes-buero` „Nachhaltigkeit im Büro" — Herr Krause, der Geschäftsführer · `wa-einarbeitung` „Bessere Einarbeitung neuer Kollegen" — Frau Sommer, die Personalleiterin · `wa-lerngruppe` „Vorschlag einer Lerngruppe" — Herr Yilmaz, Ihr Kursleiter.
*dank:* `wa-dank-einarbeitung` „Dank für die Einarbeitung" — Frau Albrecht, Ihre Mentorin · `wa-dank-fortbildung` „Rückmeldung zur Fortbildung" — Herr Winter, Ihr Vorgesetzter · `wa-dank-vertretung` „Dank für die Vertretung" — Frau Otto, Ihre Kollegin · `wa-dank-projekt` „Dank nach dem Projektabschluss" — Herr Schmid, Ihr Projektleiter.

Flagships (Task 4 authors their Baukästen, Task 10 answers them): `wa-besprechung-absagen`, `wa-homeoffice-antrag`, `wa-kantine-qualitaet`, `wa-teamausflug`, `wa-dank-fortbildung`.

Add the generator schema (mirror `SCHREIBTHEMA_GENERATOR_SCHEMA` in `schreibenThemen.ts`):

```ts
export const SCHREIBAUFTRAG_GENERATOR_SCHEMA = {
  type: 'object',
  properties: {
    auftraege: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titleDe: { type: 'string' },
          situationDe: { type: 'string' },
          empfaengerName: { type: 'string' },
          empfaengerRolleDe: { type: 'string' },
          taskDe: { type: 'string' },
          inhaltspunkte: { type: 'array', items: { type: 'string' } },
          anlass: { type: 'string' }
        },
        required: ['titleDe', 'situationDe', 'empfaengerName', 'empfaengerRolleDe', 'taskDe', 'inhaltspunkte', 'anlass']
      }
    }
  },
  required: ['auftraege']
} as const
```

- [ ] **Step 4: Run the test to verify it passes** — PASS. If a length bound fails, fix the entry, not the test.
- [ ] **Step 5: Typecheck** — clean.

---

### Task 3: Nachrichtenmittel bank + Move aptness + Rahmen-Paare + Teil 2 tips

**Files:**
- Create: `src/data/schreibenNachrichtenMittel.ts`
- Modify: `src/data/schreibenTipps.ts` (append `SCHREIBEN_TEIL2_TIPPS` after `SCHREIBEN_TEIL1_TIPPS`, reusing its `TippSection` type)
- Test: `tests/data/schreibenNachrichtenMittel.test.ts` (create)

**Interfaces:**
- Consumes: `SchreibAnlass`, `SCHREIB_ANLAESSE` (Task 2); `phraseNeedle` from `useRedemittelMatch.ts` (test-side).
- Produces (Tasks 11, 13, 14, 15 rely on these exact names):

```ts
// Slugs deliberately avoid every existing bank's move slugs (the disjointness
// test enforces it): Teil 1 already owns 'begruendung', so the explain-move is
// 'situation'; the close-move is 'ausblick' to stay clear of the Vortrag bank.
export const NACHRICHT_MOVES = ['bezug', 'situation', 'entschuldigung', 'bitte', 'beschwerde', 'vorschlag', 'dank', 'ausblick'] as const
export type NachrichtMove = (typeof NACHRICHT_MOVES)[number]
export const NACHRICHT_MOVE_LABEL: Record<NachrichtMove, { de: string; en: string }>
/** 'alle' = fits every Nachricht; otherwise the Anlässe the Move is apt for (CONTEXT.md → Move). */
export const NACHRICHT_MOVE_ANLAESSE: Record<NachrichtMove, 'alle' | SchreibAnlass[]>
export function movesForAnlass(anlass: SchreibAnlass): NachrichtMove[]
export interface Nachrichtenmittel { id: string; move: NachrichtMove; phraseDe: string; noteEn: string; needle?: string }
export const SCHREIBEN_NACHRICHTENMITTEL: Nachrichtenmittel[]   // 40 = 5 per move, ids 'nm-<move>-<n>'
export function nachrichtenmittelForMove(move: NachrichtMove): Nachrichtenmittel[]
export interface RahmenPaar { id: string; anredeDe: string; grussDe: string; noteEn: string }
export const RAHMEN_PAARE: RahmenPaar[]                          // 4 matched Anrede↔Gruß pairs
// schreibenTipps.ts
export const SCHREIBEN_TEIL2_TIPPS: TippSection[]                // 6 sections, ≥4 items each
```

Move labels: `bezug` „Bezug nehmen"/(refer to the occasion) · `situation` „Situation erklären"/(explain the situation) · `entschuldigung` „Sich entschuldigen"/(apologize) · `bitte` „Höflich bitten"/(request politely) · `beschwerde` „Unzufriedenheit ausdrücken"/(express dissatisfaction) · `vorschlag` „Vorschlag machen"/(propose) · `dank` „Danken"/(thank) · `ausblick` „Verbindlich abschließen"/(close with commitment).

Aptness table (exactly this):

```ts
export const NACHRICHT_MOVE_ANLAESSE: Record<NachrichtMove, 'alle' | SchreibAnlass[]> = {
  bezug: 'alle',
  situation: 'alle',
  entschuldigung: ['entschuldigung', 'bitte'],
  bitte: ['bitte', 'entschuldigung', 'beschwerde', 'vorschlag'],
  beschwerde: ['beschwerde'],
  vorschlag: ['vorschlag', 'beschwerde', 'entschuldigung'],
  dank: ['dank', 'bitte', 'entschuldigung'],
  ausblick: 'alle'
}
```

- [ ] **Step 1: Write the failing test**

Create `tests/data/schreibenNachrichtenMittel.test.ts` (mirrors `tests/data/schreibenMittel.test.ts`'s needle invariants):

```ts
import { describe, test, expect } from 'vitest'
import {
  NACHRICHT_MOVES, NACHRICHT_MOVE_LABEL, NACHRICHT_MOVE_ANLAESSE, movesForAnlass,
  SCHREIBEN_NACHRICHTENMITTEL, nachrichtenmittelForMove, RAHMEN_PAARE
} from '../../src/data/schreibenNachrichtenMittel'
import { SCHREIB_ANLAESSE } from '../../src/data/schreibenAuftraege'
import { SCHREIBEN_TEIL2_TIPPS } from '../../src/data/schreibenTipps'
import { phraseNeedle } from '../../src/composables/useRedemittelMatch'
import { SCHREIB_MOVES } from '../../src/data/schreibenMittel'
import { VORTRAG_MOVES } from '../../src/data/sprechenVortragsmittel'
import { MOVES } from '../../src/data/sprechenRedemittel'

describe('Nachrichtenmittel bank', () => {
  test('40 phrases, unique nm- ids, 5 per move', () => {
    expect(SCHREIBEN_NACHRICHTENMITTEL.length).toBe(40)
    expect(new Set(SCHREIBEN_NACHRICHTENMITTEL.map(p => p.id)).size).toBe(40)
    for (const p of SCHREIBEN_NACHRICHTENMITTEL) expect(p.id).toMatch(/^nm-[a-z]+-\d$/)
    for (const m of NACHRICHT_MOVES) expect(nachrichtenmittelForMove(m).length).toBe(5)
  })
  test('Move slugs disjoint from all three existing banks (CONTEXT.md → Move)', () => {
    for (const m of NACHRICHT_MOVES) {
      expect(SCHREIB_MOVES as readonly string[], m).not.toContain(m)
      expect(VORTRAG_MOVES as readonly string[], m).not.toContain(m)
      expect(MOVES as readonly string[], m).not.toContain(m)
    }
  })
  test('aptness: universal moves + occasion-cores; every Anlass gets its core', () => {
    expect(NACHRICHT_MOVE_ANLAESSE.bezug).toBe('alle')
    expect(NACHRICHT_MOVE_ANLAESSE.situation).toBe('alle')
    expect(NACHRICHT_MOVE_ANLAESSE.ausblick).toBe('alle')
    for (const anlass of SCHREIB_ANLAESSE) {
      const apt = movesForAnlass(anlass)
      expect(apt, anlass).toContain('bezug')
      expect(apt, anlass).toContain('ausblick')
      expect(apt, anlass).toContain(anlass)      // core move slug === anlass slug
      expect(apt.length, anlass).toBeLessThan(NACHRICHT_MOVES.length) // never all 8
    }
    expect(movesForAnlass('dank')).not.toContain('entschuldigung')
    expect(movesForAnlass('dank')).not.toContain('beschwerde')
  })
  test('needles: distinct, none a substring of another, floor 12 (10 for overrides)', () => {
    const needles = SCHREIBEN_NACHRICHTENMITTEL.map(p => ({ p, n: phraseNeedle(p) }))
    expect(new Set(needles.map(x => x.n)).size).toBe(40)
    for (const a of needles) for (const b of needles) {
      if (a.p.id !== b.p.id) expect(a.n.includes(b.n), `${a.p.id} swallows ${b.p.id}`).toBe(false)
    }
    for (const { p, n } of needles) expect(n.length, p.id).toBeGreaterThanOrEqual(p.needle ? 10 : 12)
  })
  test('every phrase has a non-empty noteEn; labels for all eight moves', () => {
    for (const p of SCHREIBEN_NACHRICHTENMITTEL) expect(p.noteEn.trim().length).toBeGreaterThan(0)
    for (const m of NACHRICHT_MOVES) {
      expect(NACHRICHT_MOVE_LABEL[m].de.length).toBeGreaterThan(3)
      expect(NACHRICHT_MOVE_LABEL[m].en.length).toBeGreaterThan(3)
    }
  })
  test('4 Rahmen-Paare: Anrede ends with comma, Gruß has no trailing punctuation', () => {
    expect(RAHMEN_PAARE.length).toBe(4)
    for (const rp of RAHMEN_PAARE) {
      expect(rp.anredeDe.trim().endsWith(',')).toBe(true)
      expect(rp.grussDe.trim()).toMatch(/[a-zä]$/i)
      expect(rp.noteEn.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('Teil 2 strategy tips', () => {
  test('six sections, each with a title and at least four tips', () => {
    expect(SCHREIBEN_TEIL2_TIPPS.length).toBe(6)
    expect(new Set(SCHREIBEN_TEIL2_TIPPS.map(s => s.id)).size).toBe(6)
    for (const s of SCHREIBEN_TEIL2_TIPPS) {
      expect(s.titleDe.length).toBeGreaterThan(3)
      expect(s.items.length).toBeGreaterThanOrEqual(4)
      for (const i of s.items) expect(i.de.trim().length).toBeGreaterThan(10)
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails** — FAIL, modules missing.

- [ ] **Step 3: Author the banks**

`src/data/schreibenNachrichtenMittel.ts`: header comment (CONTEXT.md → Nachrichtenmittel, Move — the Anlass-aware set; `nm-` prefix keeps the shared yield store collision-free), the moves/labels/aptness blocks, `movesForAnlass` (`NACHRICHT_MOVES.filter(m => { const a = NACHRICHT_MOVE_ANLAESSE[m]; return a === 'alle' || a.includes(anlass) })`), the `P(id, move, phraseDe, noteEn, needle?)` helper (copy shape from `schreibenMittel.ts`), then 40 phrases — **written Sie-register**, one exemplar per move here, author the other four each in the same register:

```ts
P('nm-bezug-1', 'bezug', 'ich wende mich an Sie, weil …', 'names why you are writing, right after the Anrede'),
P('nm-situation-1', 'situation', 'Der Grund dafür ist, dass …', 'introduces the explanation'),
P('nm-entschuldigung-1', 'entschuldigung', 'Bitte entschuldigen Sie, dass ich …', 'direct, polite apology'),
P('nm-bitte-1', 'bitte', 'Ich wäre Ihnen sehr dankbar, wenn Sie …', 'Konjunktiv II softens the request'),
P('nm-beschwerde-1', 'beschwerde', 'Leider muss ich Ihnen mitteilen, dass …', 'firm but courteous opener for a complaint'),
P('nm-vorschlag-1', 'vorschlag', 'Ich möchte Ihnen daher vorschlagen, …', 'ties the proposal to the reason before it'),
P('nm-dank-1', 'dank', 'Ich möchte mich herzlich bei Ihnen für … bedanken.', 'carries the thanks with warmth, still formal'),
P('nm-ausblick-1', 'ausblick', 'Über eine kurze Rückmeldung würde ich mich sehr freuen.', 'closes with a commitment-inviting line'),
```

Rules for the remaining 32: every `phraseDe` a usable written opener/frame in Sie-register ending in `…` where it trails off; the `bitte` move's five phrases **all** use Konjunktiv II (könnten Sie, wäre es möglich, dürfte ich, würden Sie, ich wäre Ihnen dankbar); no two phrases in the bank sharing their first 24 normalized chars; `needle` overrides only where an `…` falls inside the first 24 chars. Then the four `RAHMEN_PAARE`:

```ts
export const RAHMEN_PAARE: RahmenPaar[] = [
  { id: 'rp-1', anredeDe: 'Sehr geehrte Frau …, / Sehr geehrter Herr …,', grussDe: 'Mit freundlichen Grüßen', noteEn: 'the default formal pair — always safe' },
  { id: 'rp-2', anredeDe: 'Liebe Frau …, / Lieber Herr …,', grussDe: 'Herzliche Grüße', noteEn: 'warm semi-formal — colleagues you know well' },
  { id: 'rp-3', anredeDe: 'Guten Tag, Frau …,', grussDe: 'Freundliche Grüße', noteEn: 'modern neutral — fine for most workplace mail' },
  { id: 'rp-4', anredeDe: 'Sehr geehrte Damen und Herren,', grussDe: 'Mit freundlichen Grüßen', noteEn: 'when no name is known — not for these tasks, which always name one' }
]
```

`schreibenTipps.ts`: append `SCHREIBEN_TEIL2_TIPPS` with section ids `rahmen`, `zeit`, `wortzahl`, `hoeflichkeit`, `fehler`, `bewertung`; ≥4 items each, direct coaching German. Exemplar section:

```ts
export const SCHREIBEN_TEIL2_TIPPS: TippSection[] = [
  {
    id: 'rahmen',
    titleDe: 'Der Rahmen der Nachricht',
    items: [
      { de: 'Feste Reihenfolge: Betreff → Anrede → Bezug auf den Anlass → Anliegen → verbindlicher Abschluss → Grußformel → Name.', en: 'Fixed frame, top to bottom.' },
      { de: 'Nach der Anrede steht ein Komma — und die nächste Zeile beginnt klein: „Sehr geehrte Frau Kling, / vielen Dank für …".' },
      { de: 'Die Grußformel steht allein auf ihrer Zeile und bekommt kein Komma und keinen Punkt.' },
      { de: 'Der Betreff ist kein Satz: drei bis sechs Wörter, die das Anliegen nennen („Absage der Besprechung am Freitag").' }
    ]
  },
  // … zeit (25-Minuten-Budget: 5 planen / 15 schreiben / 5 prüfen …),
  //   wortzahl (mindestens 100, Ziel ~120, über 160 kostet Zeit ohne Punkte …),
  //   hoeflichkeit (Konjunktiv II für Bitten; „leider", „gern" als Weichmacher; nie Imperativ an Vorgesetzte …),
  //   fehler (du/Sie-Mischung, Großschreibung von Sie/Ihnen/Ihr, Komma nach Anrede, LG/MfG-Abkürzungen …),
  //   bewertung (die vier Kriterien und was sie konkret belohnen …)
]
```

- [ ] **Step 4: Run the test to verify it passes** — PASS.
- [ ] **Step 5: Typecheck** — clean. Also `npx vitest run tests/data/schreibenMittel.test.ts` still green (shared file touched).

---

### Task 4: Inhalts-Baukasten banks (5 Anlass fallbacks + 5 flagships)

**Files:**
- Create: `src/data/schreibenBaukasten.ts`
- Test: `tests/data/schreibenBaukasten.test.ts` (create)

**Interfaces:**
- Consumes: `NachrichtBaukasten`, `BaukastenIdee` types from `src/data/schreibenNachricht.ts` (Task 5 — **wait for it**; the type block is quoted below so both tasks agree); `SchreibAnlass`, `SCHREIB_ANLAESSE`, `Schreibauftrag` (Task 2); `TopicWord` type from `sprechenArguments.ts`.
- Produces (Tasks 8, 12, 13 rely on):

```ts
export const ANLASS_BAUKAESTEN: Record<SchreibAnlass, NachrichtBaukasten>   // 5 fallbacks: 3 gruende / 3 loesungen / 6 words
export const AUFTRAG_BAUKAESTEN: Record<string, NachrichtBaukasten>        // flagships (4/4/6): wa-besprechung-absagen, wa-homeoffice-antrag, wa-kantine-qualitaet, wa-teamausflug, wa-dank-fortbildung
export function resolveBaukasten(
  auftrag: Pick<Schreibauftrag, 'id' | 'anlass'>,
  cached?: NachrichtBaukasten
): { bank: NachrichtBaukasten; scope: 'cached' | 'auftrag' | SchreibAnlass }
```

- [ ] **Step 1: Write the failing test**

Create `tests/data/schreibenBaukasten.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { ANLASS_BAUKAESTEN, AUFTRAG_BAUKAESTEN, resolveBaukasten } from '../../src/data/schreibenBaukasten'
import { SCHREIB_ANLAESSE, SCHREIBEN_AUFTRAEGE } from '../../src/data/schreibenAuftraege'

const FLAGSHIPS = ['wa-besprechung-absagen', 'wa-homeoffice-antrag', 'wa-kantine-qualitaet', 'wa-teamausflug', 'wa-dank-fortbildung']

describe('Baukasten banks', () => {
  test('a fallback bank for every Anlass, no extra keys, 3/3/6 each', () => {
    expect(Object.keys(ANLASS_BAUKAESTEN).sort()).toEqual([...SCHREIB_ANLAESSE].sort())
    for (const bank of Object.values(ANLASS_BAUKAESTEN)) {
      expect(bank.gruende.length).toBe(3)
      expect(bank.loesungen.length).toBe(3)
      expect(bank.words.length).toBe(6)
    }
  })
  test('flagship keys exactly the five, each a real seeded Auftrag, 4/4/6', () => {
    expect(Object.keys(AUFTRAG_BAUKAESTEN).sort()).toEqual([...FLAGSHIPS].sort())
    const ids = new Set(SCHREIBEN_AUFTRAEGE.map(a => a.id))
    for (const id of FLAGSHIPS) expect(ids.has(id), id).toBe(true)
    for (const bank of Object.values(AUFTRAG_BAUKAESTEN)) {
      expect(bank.gruende.length).toBe(4)
      expect(bank.loesungen.length).toBe(4)
      expect(bank.words.length).toBe(6)
    }
  })
  test('content hygiene: no idea over 120 chars, nothing empty, words carry articles', () => {
    for (const bank of [...Object.values(ANLASS_BAUKAESTEN), ...Object.values(AUFTRAG_BAUKAESTEN)]) {
      for (const i of [...bank.gruende, ...bank.loesungen]) {
        expect(i.ideaDe.trim().length).toBeGreaterThan(0)
        expect(i.ideaDe.length).toBeLessThanOrEqual(120)
        expect(i.noteEn.trim().length).toBeGreaterThan(0)
      }
      for (const w of bank.words) expect(w.de).toMatch(/^(der|die|das)\s/)
    }
  })
  test('resolution: cached > flagship > Anlass fallback', () => {
    const flag = { id: 'wa-homeoffice-antrag', anlass: 'bitte' as const }
    const plain = { id: 'wa-urlaub-verschieben', anlass: 'bitte' as const }
    const cached = ANLASS_BAUKAESTEN.dank
    expect(resolveBaukasten(flag, cached)).toEqual({ bank: cached, scope: 'cached' })
    expect(resolveBaukasten(flag).scope).toBe('auftrag')
    expect(resolveBaukasten(plain).scope).toBe('bitte')
    expect(resolveBaukasten({ id: 'wa-custom-123-0', anlass: 'beschwerde' }).scope).toBe('beschwerde')
  })
})
```

- [ ] **Step 2: Run it to verify it fails** — FAIL, module missing.

- [ ] **Step 3: Author the banks**

Header comment: CONTEXT.md → Schreibauftrag (Inhalts-Baukasten paragraph) — per-Anlass building blocks instead of pro/contra because a Nachricht argues nothing; three-layer resolution like Teil 1's argument banks (cached arrives in Task 8). Author all five fallback banks and five flagship banks fresh; ideas a Nachricht could lift directly. Exemplar (fallback `entschuldigung`):

```ts
entschuldigung: {
  gruende: [
    { ideaDe: 'ein unaufschiebbarer Arzttermin, der sich nicht verlegen lässt', noteEn: 'medical — always accepted, no details owed' },
    { ideaDe: 'eine kurzfristige familiäre Verpflichtung (Kinderbetreuung, Pflegefall)', noteEn: 'family duty — name it briefly, no drama' },
    { ideaDe: 'eine Terminüberschneidung mit einem früher zugesagten Termin', noteEn: 'prior commitment — shows reliability, not chaos' }
  ],
  loesungen: [
    { ideaDe: 'das Protokoll oder die Unterlagen anfordern und selbstständig nacharbeiten', noteEn: 'shows initiative to catch up' },
    { ideaDe: 'einen Ersatztermin oder ein kurzes Gespräch in der Folgewoche vorschlagen', noteEn: 'offer a concrete alternative' },
    { ideaDe: 'eine Kollegin oder einen Kollegen um Vertretung bitten', noteEn: 'the task still gets done' }
  ],
  words: [
    { de: 'die Absage', en: 'cancellation' }, { de: 'der Termin', en: 'appointment' },
    { de: 'das Verständnis', en: 'understanding' }, { de: 'die Vertretung', en: 'stand-in / cover' },
    { de: 'das Protokoll', en: 'minutes' }, { de: 'der Ersatztermin', en: 'alternative date' }
  ]
}
```

The resolver — full code:

```ts
export function resolveBaukasten(
  auftrag: Pick<Schreibauftrag, 'id' | 'anlass'>,
  cached?: NachrichtBaukasten
): { bank: NachrichtBaukasten; scope: 'cached' | 'auftrag' | SchreibAnlass } {
  if (cached) return { bank: cached, scope: 'cached' }
  const flagship = AUFTRAG_BAUKAESTEN[auftrag.id]
  if (flagship) return { bank: flagship, scope: 'auftrag' }
  return { bank: ANLASS_BAUKAESTEN[auftrag.anlass], scope: auftrag.anlass }
}
```

- [ ] **Step 4: Run the test to verify it passes** — PASS.
- [ ] **Step 5: Typecheck** — clean.

---

### Task 5: Core module data, Dexie v16, Nachricht repository

**Files:**
- Create: `src/data/schreibenNachricht.ts`
- Create: `src/composables/useSchreibenNachricht.ts`
- Modify: `src/db/index.ts` (two class fields + `version(16)`)
- Test: `tests/data/schreibenNachricht.test.ts` (create)

**Interfaces:**
- Consumes: `HelpKind`, `HelpLogEntry` from `src/data/sprechen.ts` (reused); `SchreibPlanEntry`, `emptySchreibPlan` from `src/data/schreiben.ts` (reused — same four-keyword plan); `SchreibAnlass` (Task 2); `TopicWord` from `sprechenArguments.ts`.
- Produces (Tasks 4, 6, 8, 9, 12, 13, 14 rely on these exact names):

```ts
// src/data/schreibenNachricht.ts
export interface SchreibauftragRef {          // denormalized onto the row — custom Aufträge can be deleted
  id: string; titleDe: string; situationDe: string; empfaengerName: string
  empfaengerRolleDe: string; taskDe: string; inhaltspunkte: string[]; anlass: SchreibAnlass
}
export interface NachrichtHelps {
  hints: boolean; checklist: boolean; kiTipp: boolean; timer: boolean
  rahmen: boolean; radar: boolean            // the two new switches (CONTEXT.md → Rahmen-Gerüst, Radar)
}
export interface NachrichtSlots { betreff: string; anrede: string; text: string; gruss: string }
export function assembleNachricht(slots: NachrichtSlots): string
// `Betreff: ${betreff.trim()}\n\n${anrede.trim()}\n${text.trim()}\n\n${gruss.trim()}` — parts left
// empty are skipped together with their separator, so a half-filled scaffold still assembles cleanly.
export interface SchreibenNachricht {
  id: string; auftrag: SchreibauftragRef; helps: NachrichtHelps; plan: SchreibPlanEntry[]
  textDe: string                              // ALWAYS the authoritative full text (assembled when rahmen on)
  slots?: NachrichtSlots                      // present iff helps.rahmen — the resume surface
  status: 'in_progress' | 'submitted'
  startedAt: number; updatedAt: number; kiTippCount: number; helpLog: HelpLogEntry[]
}
export const NACHRICHT_MIN_WORDS = 100
export const NACHRICHT_TARGET_WORDS = 120
export const NACHRICHT_COMFORT_MAX_WORDS = 160
export const NACHRICHT_TIME_BUDGET_SECONDS = 25 * 60
export function nachrichtWordBand(words: number): 'under' | 'ok' | 'over'
export type NachrichtPhase = 'planen' | 'schreiben' | 'pruefen' | 'ueberzeit'
export function nachrichtPhase(elapsedSeconds: number): NachrichtPhase   // <300 planen, <1200 schreiben, <=1500 pruefen, else ueberzeit
export const NACHRICHT_STASH_KEY = 'gt:lastSchreibenTeil2'
export interface NachrichtRunStash { auftrag: SchreibauftragRef; helps: NachrichtHelps; plan: SchreibPlanEntry[]; model: string }
export interface BaukastenIdee { ideaDe: string; noteEn: string }
export interface NachrichtBaukasten {
  gruende: BaukastenIdee[]; loesungen: BaukastenIdee[]
  words: import('./sprechenArguments').TopicWord[]
}
export interface CachedNachrichtBaukasten { auftragId: string; bank: NachrichtBaukasten; generatedAt: number }

// src/composables/useSchreibenNachricht.ts  (repository — all Dexie access for the table lives here,
//                                            mirror useSchreibenBeitrag.ts function-for-function)
export async function createNachricht(init: { auftrag: SchreibauftragRef; helps: NachrichtHelps; plan: SchreibPlanEntry[] }): Promise<SchreibenNachricht>
export async function findActiveNachricht(): Promise<SchreibenNachricht | undefined>
export async function saveNachrichtText(id: string, textDe: string, slots?: NachrichtSlots): Promise<void>
export async function saveNachrichtPlan(id: string, plan: SchreibPlanEntry[]): Promise<void>
export async function logNachrichtHelp(id: string, kind: HelpKind, at: number): Promise<void>   // non-fatal try/catch
export async function incrementNachrichtKiTipp(id: string): Promise<void>                       // db.transaction
export async function markNachrichtSubmitted(id: string): Promise<void>
export async function abandonNachricht(id: string): Promise<void>
export async function deleteNachricht(id: string): Promise<void>
```

- [ ] **Step 1: Write the failing test**

Create `tests/data/schreibenNachricht.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  NACHRICHT_MIN_WORDS, NACHRICHT_TARGET_WORDS, NACHRICHT_COMFORT_MAX_WORDS,
  NACHRICHT_TIME_BUDGET_SECONDS, nachrichtWordBand, nachrichtPhase, assembleNachricht
} from '../../src/data/schreibenNachricht'

describe('nachricht core constants', () => {
  test('exam constants', () => {
    expect(NACHRICHT_MIN_WORDS).toBe(100)
    expect(NACHRICHT_TARGET_WORDS).toBe(120)
    expect(NACHRICHT_COMFORT_MAX_WORDS).toBe(160)
    expect(NACHRICHT_TIME_BUDGET_SECONDS).toBe(1500)
  })
  test('word band: floor at 100, comfort ceiling at 160', () => {
    expect(nachrichtWordBand(99)).toBe('under')
    expect(nachrichtWordBand(100)).toBe('ok')
    expect(nachrichtWordBand(160)).toBe('ok')
    expect(nachrichtWordBand(161)).toBe('over')
  })
  test('phases: 5 planen / 15 schreiben / 5 prüfen, then Überzeit', () => {
    expect(nachrichtPhase(0)).toBe('planen')
    expect(nachrichtPhase(299)).toBe('planen')
    expect(nachrichtPhase(300)).toBe('schreiben')
    expect(nachrichtPhase(1199)).toBe('schreiben')
    expect(nachrichtPhase(1200)).toBe('pruefen')
    expect(nachrichtPhase(1500)).toBe('pruefen')
    expect(nachrichtPhase(1501)).toBe('ueberzeit')
  })
  test('assembleNachricht: full frame, and empty slots collapse cleanly', () => {
    expect(assembleNachricht({
      betreff: 'Absage der Besprechung', anrede: 'Sehr geehrter Herr Semder,',
      text: 'leider kann ich nicht teilnehmen.', gruss: 'Mit freundlichen Grüßen\nAnna'
    })).toBe(
      'Betreff: Absage der Besprechung\n\nSehr geehrter Herr Semder,\nleider kann ich nicht teilnehmen.\n\nMit freundlichen Grüßen\nAnna'
    )
    expect(assembleNachricht({ betreff: '', anrede: '', text: 'nur Text.', gruss: '' })).toBe('nur Text.')
  })
})
```

- [ ] **Step 2: Run it to verify it fails** — FAIL, module missing.

- [ ] **Step 3: Implement data module, repository, and the Dexie bump**

`src/data/schreibenNachricht.ts`: implement per the interface block. Header comment mirrors `src/data/schreiben.ts`'s (lifecycle: `in_progress` → `submitted` → row DELETED once the Run is recorded; ADR-0019). `nachrichtWordBand` = `words < 100 ? 'under' : words <= 160 ? 'ok' : 'over'`. `nachrichtPhase` per the test. `assembleNachricht`: build the three blocks (`betreff` → `Betreff: …`; `anrede`+`text` joined by `\n`; `gruss`), drop empty parts, join non-empty blocks with `\n\n` (when anrede is empty but text is not, the middle block is just the text). Reuse `schreibenClock` from `./schreiben` — do not duplicate it.

`src/composables/useSchreibenNachricht.ts`: mirror `src/composables/useSchreibenBeitrag.ts` function-for-function against table `db.schreibenNachrichten` (`crypto.randomUUID()` ids, `status: 'in_progress'` on create, `findActiveNachricht` = newest `in_progress`/`submitted` by `startedAt` desc, non-fatal `logNachrichtHelp`, `db.transaction` in `incrementNachrichtKiTipp`; `saveNachrichtText` writes `textDe`, `slots` and bumps `updatedAt` — pass `slots: undefined` to clear when rahmen is off).

`src/db/index.ts`: add two class fields after `schreibenArgumentBanks` (line 28), with the same comment style:

```ts
  /** Schreiben Teil 2 working state — one in-flight Nachricht at a time (see useSchreibenNachricht.ts). */
  schreibenNachrichten!: Table<SchreibenNachricht, string>
  /** Cached AI-generated Inhalts-Baukasten per Schreibauftrag (see ../data/schreibenNachricht). */
  schreibenBaukaesten!: Table<CachedNachrichtBaukasten, string>
```

Then append `version(16)` after the `version(15)` block, restating all twelve existing table specs verbatim from `version(15)` plus:

```ts
      // Schreiben Teil 2 working state (see useSchreibenNachricht.ts) plus its
      // cached Inhalts-Baukasten. Purely additive — no upgrade hook, because no
      // existing row gains a required field.
      schreibenNachrichten: '&id, status, startedAt',
      schreibenBaukaesten: 'auftragId'
```

- [ ] **Step 4: Run the test to verify it passes** — PASS.
- [ ] **Step 5: Typecheck** — `npm run typecheck`, clean (proves the Dexie wiring); `npx vitest run tests/db` green.

---

### Task 6: Local checks — Gerüst-Check, Du/Sie-Radar, Höflichkeits-Check

**Files:**
- Create: `src/composables/useNachrichtChecks.ts`
- Test: `tests/composables/useNachrichtChecks.test.ts` (create)

**Interfaces:**
- Consumes: `SchreibAnlass` (Task 2). Pure functions — no Dexie, no AI, no Vue.
- Produces (Tasks 13, 14 rely on):

```ts
export type GeruestKey = 'betreff' | 'anrede' | 'kleinschreibung' | 'absaetze' | 'gruss' | 'name'
export interface GeruestSignal { key: GeruestKey; ok: boolean; labelDe: string; hintDe: string }
/** Six frame checks against the raw text (works identically on assembled scaffold output). */
export function geruestSignals(text: string, empfaengerName: string): GeruestSignal[]
export type RadarKey = 'du-form' | 'informell' | 'hoeflichkeit'
export interface RadarWarnung { key: RadarKey; labelDe: string; detailDe: string; matches: string[] }
/** Empty array = nothing to warn about. `hoeflichkeit` fires only for bitte/beschwerde. */
export function radarWarnungen(text: string, anlass: SchreibAnlass): RadarWarnung[]
export const GRUSS_FORMELN: string[]   // exported for the Gerüst hint copy
```

Check rules (implement exactly; all matching case-insensitive on trimmed lines):
- `betreff`: some line among the first two non-empty lines matches `/^betreff\s*:\s*\S{3,}/i`.
- `anrede`: some line among the first five non-empty lines starts with `sehr geehrte`, `liebe`, or `guten tag`, **contains the Empfänger's surname** (last whitespace-separated token of `empfaengerName`), and ends with `,`.
- `kleinschreibung`: evaluated only when `anrede` is ok (otherwise `ok: true`, neutral): the first letter character on the first non-empty line *after* the Anrede line is lowercase.
- `absaetze`: the text contains at least two blank-line separations (`/\n[ \t]*\n/` matched ≥ 2 times).
- `gruss`: some line among the last five non-empty lines equals one of `GRUSS_FORMELN` = `['mit freundlichen grüßen', 'freundliche grüße', 'viele grüße', 'herzliche grüße', 'beste grüße']` **without trailing punctuation** (a trailing comma/period fails the check — classic error).
- `name`: at least one non-empty line exists after the Gruß line (only evaluated when `gruss` ok, else `ok: false`).
- `du-form`: whole-word match of any of `du, dich, dir, dein, deine, deinen, deinem, deiner, deins, euch, euer, eure` (word boundaries, case-insensitive but **skip matches whose first letter is uppercase mid-sentence is NOT required** — simple `\b(du|dich|…)\b/gi` is fine; report the matched words).
- `informell`: whole-word/phrase match of any of `na ja, halt, echt, krass, mega, voll cool, super, okay, lg, mfg, hey, hi` (report matches).
- `hoeflichkeit`: only when `anlass === 'bitte' || anlass === 'beschwerde'`: warn when the text contains **no** match of `/\b(würde|würden|könnte|könnten|wäre|wären|hätte|hätten|dürfte|dürften)\b/i`. `detailDe`: `'Ihre Bitte klingt wie eine Anweisung — Konjunktiv II macht sie höflich (könnten Sie …, wäre es möglich …).'`, `matches: []`.

- [ ] **Step 1: Write the failing test**

Create `tests/composables/useNachrichtChecks.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { geruestSignals, radarWarnungen } from '../../src/composables/useNachrichtChecks'

const GOOD =
  'Betreff: Absage der Besprechung am Freitag\n\n' +
  'Sehr geehrter Herr Semder,\n' +
  'leider kann ich an der Besprechung am Freitag nicht teilnehmen, da ich einen Arzttermin habe.\n\n' +
  'Ich würde die Inhalte gern selbstständig nacharbeiten. Könnten Sie mir das Protokoll schicken?\n\n' +
  'Mit freundlichen Grüßen\n' +
  'Anna Petrescu'

function byKey(text: string, name = 'Herr Semder') {
  return Object.fromEntries(geruestSignals(text, name).map(s => [s.key, s.ok]))
}

describe('geruestSignals', () => {
  test('the good frame passes all six', () => {
    expect(byKey(GOOD)).toEqual({
      betreff: true, anrede: true, kleinschreibung: true, absaetze: true, gruss: true, name: true
    })
  })
  test('missing Betreff fails betreff only', () => {
    const t = GOOD.replace('Betreff: Absage der Besprechung am Freitag\n\n', '')
    expect(byKey(t).betreff).toBe(false)
    expect(byKey(t).anrede).toBe(true)
  })
  test('Anrede must name the Empfänger and end with a comma', () => {
    expect(byKey(GOOD.replace('Herr Semder,', 'Herr Semder')).anrede).toBe(false)
    expect(byKey(GOOD.replace('Sehr geehrter Herr Semder,', 'Sehr geehrter Herr Vogel,')).anrede).toBe(false)
    expect(byKey(GOOD, 'Frau Kling').anrede).toBe(false)
  })
  test('capital letter after the Anrede comma fails kleinschreibung', () => {
    expect(byKey(GOOD.replace('leider kann ich', 'Leider kann ich')).kleinschreibung).toBe(false)
  })
  test('Grußformel with trailing comma fails gruss; missing name line fails name', () => {
    expect(byKey(GOOD.replace('Mit freundlichen Grüßen', 'Mit freundlichen Grüßen,')).gruss).toBe(false)
    expect(byKey(GOOD.replace('\nAnna Petrescu', '')).name).toBe(false)
  })
})

describe('radarWarnungen', () => {
  test('clean formal text yields no warnings', () => {
    expect(radarWarnungen(GOOD, 'entschuldigung')).toEqual([])
  })
  test('du-forms are flagged with the matched words', () => {
    const w = radarWarnungen(GOOD.replace('Könnten Sie mir', 'Kannst du mir'), 'entschuldigung')
    const duW = w.find(x => x.key === 'du-form')!
    expect(duW.matches).toContain('du')
  })
  test('informal markers are flagged', () => {
    const w = radarWarnungen(GOOD.replace('Mit freundlichen Grüßen', 'LG'), 'entschuldigung')
    expect(w.some(x => x.key === 'informell')).toBe(true)
  })
  test('a Bitte without Konjunktiv II fires hoeflichkeit; with KII it does not', () => {
    const noKii = 'Betreff: Bitte\n\nSehr geehrte Frau Kling,\nich will zwei Tage Homeoffice. Schicken Sie mir die Formulare.\n\nMit freundlichen Grüßen\nAnna'
    expect(radarWarnungen(noKii, 'bitte').some(x => x.key === 'hoeflichkeit')).toBe(true)
    expect(radarWarnungen(GOOD, 'bitte').some(x => x.key === 'hoeflichkeit')).toBe(false)
    expect(radarWarnungen(noKii, 'dank').some(x => x.key === 'hoeflichkeit')).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to verify it fails** — FAIL, module missing.
- [ ] **Step 3: Implement** per the check rules above. Header comment: CONTEXT.md → Gerüst-Check, Radar — local, free, advisory, never a grading input; warnings never logged to the Hilfe-Protokoll.
- [ ] **Step 4: Run the test to verify it passes** — PASS.
- [ ] **Step 5: Typecheck** — clean.

---

### Task 7: Schreibauftrag pool composable (custom pool + AI generation + Anlass filter)

**Files:**
- Create: `src/composables/useSchreibenAuftraege.ts`
- Test: `tests/composables/useSchreibenAuftraege.test.ts` (create)

**Interfaces:**
- Consumes: Task 2's exports; `loadHistory` (`useQuizHistory.ts`); `GeminiClient` type from `useSprechenGrader.ts`.
- Produces (Task 12 relies on):

```ts
export const CUSTOM_AUFTRAEGE_KEY = 'gt:schreibenCustomAuftraege'
export const AUFTRAEGE_PER_GENERATION = 5          // one per Anlass — generation is balanced by construction
export function loadCustomAuftraege(): Schreibauftrag[]
export function addCustomAuftraege(auftraege: Schreibauftrag[]): void
export function deleteCustomAuftrag(id: string): void
export function allAuftraege(): Schreibauftrag[]
export function doneAuftragTitles(): Set<string>   // runs where type === 'schreiben-teil2', meta.topicTitle
export function drawAuftrag(anlass?: SchreibAnlass | null, rng?: () => number): Schreibauftrag
export function validateGeneratedAuftrag(raw: unknown): Omit<Schreibauftrag, 'id' | 'level' | 'source'> | null
export function buildAuftragGeneratorPrompt(existingTitles: string[], doneTitles: Set<string>, rng?: () => number): string
export async function generateAuftraege(client: GeminiClient, model: string, maxRetries = 2): Promise<Schreibauftrag[]>
```

- [ ] **Step 1: Write the failing test**

Create `tests/composables/useSchreibenAuftraege.test.ts` (mirror the harness style of `tests/composables/useSchreibenThemen.test.ts` — same localStorage handling as that file uses):

```ts
import { describe, test, expect } from 'vitest'
import { validateGeneratedAuftrag, buildAuftragGeneratorPrompt, drawAuftrag } from '../../src/composables/useSchreibenAuftraege'

const good = {
  titleDe: 'Bitte um Schichttausch',
  situationDe: 'Sie arbeiten im Schichtdienst. Nächste Woche haben Sie einen wichtigen privaten Termin, der mit Ihrer Schicht kollidiert.',
  empfaengerName: 'Frau Sturm',
  empfaengerRolleDe: 'Ihre Schichtleiterin',
  taskDe: 'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihre Schichtleiterin, Frau Sturm.',
  inhaltspunkte: [
    'Nennen Sie Ihr Anliegen und beziehen Sie sich auf Ihren Dienstplan.',
    'Erklären Sie den Grund für den gewünschten Tausch.',
    'Schlagen Sie eine konkrete Lösung vor.',
    'Bitten Sie um eine kurze Rückmeldung.'
  ],
  anlass: 'bitte'
}

describe('validateGeneratedAuftrag', () => {
  test('accepts a well-formed Auftrag', () => {
    expect(validateGeneratedAuftrag(good)).not.toBeNull()
  })
  test('rejects wrong prefix, missing floor, bad anlass, wrong point count, nameless Empfänger', () => {
    expect(validateGeneratedAuftrag({ ...good, taskDe: 'Verfassen Sie eine E-Mail an Frau Sturm (mindestens 100 Wörter).' })).toBeNull()
    expect(validateGeneratedAuftrag({ ...good, taskDe: 'Schreiben Sie eine Nachricht an Frau Sturm.' })).toBeNull()
    expect(validateGeneratedAuftrag({ ...good, anlass: 'reklamation' })).toBeNull()
    expect(validateGeneratedAuftrag({ ...good, inhaltspunkte: good.inhaltspunkte.slice(0, 3) })).toBeNull()
    expect(validateGeneratedAuftrag({ ...good, empfaengerName: 'Kling' })).toBeNull()
  })
})

describe('buildAuftragGeneratorPrompt', () => {
  test('demands one Auftrag per Anlass, the envelope, and the exam constraints', () => {
    const p = buildAuftragGeneratorPrompt(['Bitte um Homeoffice'], new Set(['Absage einer Besprechung']))
    expect(p).toContain('Bitte um Homeoffice')
    expect(p).toContain('Absage einer Besprechung')
    expect(p).toContain('"auftraege"')
    expect(p).toContain('mindestens 100 Wörter')
    expect(p).toContain('genau vier')
    for (const a of ['entschuldigung', 'bitte', 'beschwerde', 'vorschlag', 'dank']) expect(p).toContain(a)
  })
})

describe('drawAuftrag', () => {
  test('deterministic under fixed rng; respects the Anlass filter', () => {
    expect(drawAuftrag(null, () => 0).id).toMatch(/^wa-/)
    for (let i = 0; i < 5; i++) {
      expect(drawAuftrag('beschwerde', () => i / 5).anlass).toBe('beschwerde')
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails** — FAIL, module missing.

- [ ] **Step 3: Implement**

Mirror `src/composables/useSchreibenThemen.ts` block-for-block (constants → isValidStored → load/save/add/delete → all → done → draw → validate → prompt → generate), with these divergences:
- `doneAuftragTitles()` filters `e.type === 'schreiben-teil2'` reading `e.meta.topicTitle`.
- `drawAuftrag(anlass?, rng?)`: filter the pool to the Anlass when given (fall back to the whole pool if the filter empties it — a custom-only pool may lack an Anlass), then prefer undone, then `pool[Math.floor(rng() * pool.length)]`.
- `validateGeneratedAuftrag`: trims all strings; `titleDe` 3–45; `situationDe` 40–300; `empfaengerName` matches `/^(Frau|Herr) [A-ZÄÖÜ]/`; `empfaengerRolleDe` 4–60; `taskDe` starts with `NACHRICHT_TASK_PREFIX`, contains `'mindestens 100 Wörter'`, contains the `empfaengerName`'s surname, no `?`, length 60–280; `inhaltspunkte` exactly 4, each 15–140 chars, no `?`, pairwise distinct; `anlass` ∈ `SCHREIB_ANLAESSE`.
- `buildAuftragGeneratorPrompt`: German prompt asking for **genau fünf** new B2 Schreibaufträge for Schreiben Teil 2 — **einen pro Schreibanlass** (name all five slugs with their `ANLASS_LABEL.de`); requires the exact JSON envelope `{"auftraege": [{"titleDe": "…", "situationDe": "…", "empfaengerName": "Frau …", "empfaengerRolleDe": "…", "taskDe": "…", "inhaltspunkte": ["…", "…", "…", "…"], "anlass": "…"}]}` spelled out in prose (no markdown fences); demands `taskDe` start with the exact prefix, name `mindestens 100 Wörter` and the Empfänger; demands genau vier situationsbezogene Inhaltspunkte (Bezug/Anliegen · Grund erklären · Bitte/Vorschlag/Forderung · Ausblick/Rückmeldung); work/course settings; the avoid-list + base-36 variation seed exactly as `buildThemaGeneratorPrompt` does.
- `generateAuftraege`: same retry loop as `generateThemen`, `responseSchema: SCHREIBAUFTRAG_GENERATOR_SCHEMA`, ids `wa-custom-${Date.now()}-${i}`, cap `AUFTRAEGE_PER_GENERATION`, `level: 'B2'`, `source: 'custom'`.

- [ ] **Step 4: Run the test to verify it passes** — PASS.
- [ ] **Step 5: Neighbors + typecheck** — `npx vitest run tests/composables tests/data` green; `npm run typecheck` clean.

---

### Task 8: Baukasten AI composable (generate + cache)

**Files:**
- Create: `src/composables/useSchreibenBaukasten.ts`
- Test: `tests/composables/useSchreibenBaukasten.test.ts` (create)

**Interfaces:**
- Consumes: `NachrichtBaukasten`, `CachedNachrichtBaukasten` (Task 5); `db.schreibenBaukaesten`; `GeminiClient` type; `Schreibauftrag` (Task 2).
- Produces (Tasks 12, 13 rely on):

```ts
export function buildBaukastenPrompt(auftrag: Pick<Schreibauftrag, 'titleDe' | 'situationDe' | 'taskDe' | 'anlass'>): string
export function validateBaukasten(raw: unknown): NachrichtBaukasten | null
export async function generateBaukasten(client: GeminiClient, model: string, auftrag: Pick<Schreibauftrag, 'titleDe' | 'situationDe' | 'taskDe' | 'anlass'>, maxRetries = 2): Promise<NachrichtBaukasten>
export async function loadCachedBaukasten(auftragId: string): Promise<NachrichtBaukasten | undefined>
export async function saveCachedBaukasten(auftragId: string, bank: NachrichtBaukasten): Promise<void>
```

- [ ] **Step 1: Write the failing test**

Create `tests/composables/useSchreibenBaukasten.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { buildBaukastenPrompt, validateBaukasten } from '../../src/composables/useSchreibenBaukasten'

describe('buildBaukastenPrompt', () => {
  test('asks for situation-specific Gründe/Lösungen and spells out the envelope', () => {
    const p = buildBaukastenPrompt({
      titleDe: 'Bitte um Homeoffice',
      situationDe: 'Sie möchten zwei Tage pro Woche von zu Hause arbeiten.',
      taskDe: 'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Frau Kling.',
      anlass: 'bitte'
    })
    expect(p).toContain('Bitte um Homeoffice')
    expect(p).toContain('"gruende"')
    expect(p).toContain('"loesungen"')
    expect(p).toContain('"words"')
    expect(p).not.toMatch(/```/)
  })
})

describe('validateBaukasten', () => {
  const good = {
    gruende: [{ ideaDe: 'lange Pendelzeit', noteEn: 'commute' }, { ideaDe: 'Betreuung der Kinder am Nachmittag', noteEn: 'childcare' }, { ideaDe: 'konzentriertes Arbeiten', noteEn: 'focus' }],
    loesungen: [{ ideaDe: 'feste Erreichbarkeit vereinbaren', noteEn: 'availability' }, { ideaDe: 'eine Probephase vorschlagen', noteEn: 'trial period' }, { ideaDe: 'Bürotage für Meetings reservieren', noteEn: 'office days' }],
    words: [
      { de: 'die Erreichbarkeit', en: 'availability' }, { de: 'die Probephase', en: 'trial period' },
      { de: 'der Dienstplan', en: 'duty roster' }, { de: 'das Vertrauen', en: 'trust' },
      { de: 'die Vereinbarung', en: 'agreement' }, { de: 'der Arbeitsweg', en: 'commute' }
    ]
  }
  test('accepts a well-formed bank', () => {
    expect(validateBaukasten(good)).not.toBeNull()
  })
  test('rejects short lists, over-long ideas, article-less words', () => {
    expect(validateBaukasten({ ...good, gruende: good.gruende.slice(0, 1) })).toBeNull()
    expect(validateBaukasten({ ...good, loesungen: [{ ...good.loesungen[0], ideaDe: 'x'.repeat(140) }, ...good.loesungen.slice(1)] })).toBeNull()
    expect(validateBaukasten({ ...good, words: [{ de: 'Erreichbarkeit', en: 'availability' }, ...good.words.slice(1)] })).toBeNull()
  })
})
```

- [ ] **Step 2: Run it to verify it fails** — FAIL.

- [ ] **Step 3: Implement**

Mirror `useSchreibenArguments.ts` exactly (same client settings: no `responseSchema`, `responseMimeType: 'application/json'`, `temperature: 0.7`, `topP: 0.95`, same retry loop), with: prompt asking — in German, for THIS Auftrag's situation — for **3-4 plausible Gründe** (why the writer is in this situation / can't attend / needs this), **3-4 konkrete Lösungs- oder Vorschlag-Ideen** the Nachricht could offer, and **exactly 6 Textwortschatz nouns with article** (`{"de": "die Erreichbarkeit", "en": "availability"}`), envelope `{"gruende": [{"ideaDe": "…", "noteEn": "…"}], "loesungen": [...], "words": [...]}` in prose. `validateBaukasten`: 3–4 gruende, 3–4 loesungen (each `ideaDe` 1–120 chars trimmed, `noteEn` non-empty), exactly 6 words each matching `/^(der|die|das)\s/`. Cache via `db.schreibenBaukaesten` (`put({ auftragId, bank, generatedAt: Date.now() })`, `get(auftragId)` → `.bank`).

- [ ] **Step 4: Run the test to verify it passes** — PASS.
- [ ] **Step 5: Typecheck** — clean.

---

### Task 9: Grader, KI-Tipp, history type wiring

**Files:**
- Create: `src/composables/useNachrichtGrader.ts`
- Create: `src/composables/useNachrichtTipp.ts`
- Modify: `src/composables/useQuizHistory.ts` (add `'schreiben-teil2'` to `QuizHistoryType` directly under `'schreiben-teil1'` at line 62; extend the meta-cluster comment at ~line 324 to say both Schreiben types reuse the `sprechen*` meta fields)
- Modify: `src/components/charts/quiz-type-labels.ts` (`:58`, `:132` → `'schreiben-teil2': 'Schreiben · Teil 2 Nachricht'`; list at `:207` → add `'schreiben-teil2'` after `'schreiben-teil1'`)
- Modify: `src/composables/useQuizStats.ts` (`:144`, `:220` — add the `'schreiben-teil2'` key mirroring the `-teil1` line)
- Modify: `src/modules/history/HistoryPage.vue` (map `:100` → `'schreiben-teil2': { label: 'Schreiben — Teil 2 Nachricht', de: 'Schreiben · Teil 2 Nachricht', module: 'Schreiben' }`; list `:149` → add after `-teil1`)
- Modify: `src/composables/useLevelAssessment.ts` (`:143` → add `'schreiben-teil2': 'Schreiben Teil 2 — a semi-formal message of at least 100 words answering a workplace situation with four content points (score 0-100, Goethe B2 rubric)'`)
- Test: `tests/composables/useNachrichtGrader.test.ts` (create)

**Interfaces:**
- Consumes: `SCHREIBEN_B2_TEIL2` (Task 1); `reAnchor`, `BilingualNote`, `GeminiClient`, `SprechenCriterionScore` from `useSprechenGrader.ts`; `Aufwertung` from `useVortragGrader.ts`; `SprechenErrorTag` from `useQuizHistory.ts`; `praedikat`, `Praedikat` from `rubrics.ts`; `SchreibenNachricht`, `NACHRICHT_MIN_WORDS`, `SchreibauftragRef`, `NachrichtHelps` (Task 5); `HelpLogEntry` (`data/sprechen.ts`); `SchreibPlanEntry` (`data/schreiben.ts`).
- Produces (Tasks 13, 14 rely on these exact names):

```ts
export interface NachrichtCoverageCell { index: number; punkt: string; covered: boolean; note: string }
export interface NachrichtMistake { quote: string; suggested: string; kind: SprechenErrorTag; reasonDe: string; reasonEn: string; spanStart: number }
export interface NachrichtGradeResult {
  totalScore: number; passes: boolean; praedikat: Praedikat
  criteria: SprechenCriterionScore[]          // keys erfuellung|kohaerenz|wortschatz|strukturen
  coverage: NachrichtCoverageCell[]           // exactly 4, in inhaltspunkte order
  mistakes: NachrichtMistake[]
  aufwertungen: Aufwertung[]
  strengths: BilingualNote[]; weaknesses: BilingualNote[]
  overallDe: string; overallEn: string
}
export const NACHRICHT_GRADE_SCHEMA: object
export const NACHRICHT_AUFWERTUNG_CAP = 3     // shorter text than Teil 1's 5
export class NachrichtGraderError extends Error { constructor(message: string, public readonly attempts: number) }
export function buildNachrichtGraderPrompt(n: SchreibenNachricht): { system: string; user: string }
export function validateNachrichtGrade(raw: unknown, n: SchreibenNachricht): NachrichtGradeResult | null
export async function gradeNachricht(client: GeminiClient, model: string, n: SchreibenNachricht, maxRetries = 2): Promise<NachrichtGradeResult>
export const NACHRICHT_RESULT_KEY = 'gt:lastSchreibenTeil2Result'
export interface NachrichtResultStash {
  auftrag: SchreibauftragRef; helps: NachrichtHelps; plan: SchreibPlanEntry[]
  wordCount: number; kiTippCount: number; helpLog: HelpLogEntry[]
  nachrichtenmittel: string[]                 // matched nm- ids, counted before discard
  startedAt: number; finishedAt: number
  result: NachrichtGradeResult
}

// useNachrichtTipp.ts
export function buildNachrichtKiTippPrompt(n: SchreibenNachricht): string
export async function generateNachrichtKiTipp(client: GeminiClient, model: string, n: SchreibenNachricht): Promise<string>
```

- [ ] **Step 1: Write the failing test**

Create `tests/composables/useNachrichtGrader.test.ts` — mirror `tests/composables/useSchreibenGrader.test.ts`'s structure with a `mkNachricht()` factory (a ~110-word Nachricht in `textDe` with Betreff/Anrede/Gruß frame and the known mistake `'das Termin'`, the `wa-besprechung-absagen` AuftragRef with `anlass: 'entschuldigung'`, helps all-on incl. `rahmen: true, radar: true`) and a `mkRaw()` factory. Assert, at minimum: happy path derives `totalScore` (sum of four scores) / `passes` / `praedikat` locally and anchors the mistake's `spanStart` via `indexOf`; criteria matched **by key** with a reversed array; coverage consistency reject (`coverage` with ≤2 covered while erfuellung ≥ 20 → `null`); unanchorable mistakes dropped, not fatal; `spelling` kept; `register` kind accepted; score 26 → reject; prompt test: `system` contains `'mindestens 100'`, `'"criteria"'`, `'register'`, no fences; `user` contains the Empfänger name, all four Inhaltspunkte, and the essay text.

- [ ] **Step 2: Run it to verify it fails** — FAIL, module missing.

- [ ] **Step 3: Implement the grader**

Mirror `useSchreibenGrader.ts` section-for-section. Divergences, exhaustively:
- **Persona/system**: Goethe B2 rater for a *halbformelle Nachricht* (Schreiben Teil 2). Rubric lines rendered from `SCHREIBEN_B2_TEIL2`; grader-local `NACHRICHT_BAND_ANCHORS` (4 contiguous bands per criterion, 23-25/18-22/12-17/5-11, kept **out of** `rubrics.ts` like `TEIL1_BAND_ANCHORS`); per-mistake tagging with the five kinds where `register` explicitly includes du/Sie-Brüche, mündlicher Ton und unpassende Abkürzungen (LG, MfG); the frame rule: *fehlende Anrede/Grußformel/Betreff senken die Erfüllung, sind aber keine „mistakes" mit quote — sie gehören in coverage-Noten und weaknesses*; KALIBRIERUNG anchoring 90-100 to „alle vier Inhaltspunkte ausgeführt, durchgehend höfliches Sie-Register, sauberer Rahmen, nur vereinzelte Flüchtigkeitsfehler"; aufwertungen rules (cap 3, "NOT errors", prefer Höflichkeits-Upgrades — ein direkter Satz, der als Konjunktiv-II-Bitte besser klänge); the literal JSON envelope.
- **User message**: SITUATION / EMPFÄNGER (`empfaengerName`, `empfaengerRolleDe`) / AUFGABE blocks, the four `INHALTSPUNKTE` numbered `0.`–`3.`, `NACHRICHT:` + `n.textDe`, then the word-count block: computed count + the rule that only `erfuellung` may be docked for a shortfall under `NACHRICHT_MIN_WORDS`.
- **Schema/validator/`gradeNachricht`**: identical mechanics to Teil 1's (`SCHREIBEN_GRADE_SCHEMA` shape, key-matched criteria, coverage projected onto 0-3, consistency reject, `reAnchor` every quote against `n.textDe`, drop unanchorable, no spelling drop, aufwertungen overlap-dropped and capped at 3 — 2 if `mistakes.length > 5`, totals derived locally, temperature 0, retries, `NachrichtGraderError`).

`src/composables/useNachrichtTipp.ts`: mirror `useSchreibenTipp.ts` — prompt from `n.auftrag.taskDe` + the four Inhaltspunkte + which plan keywords are not yet in `n.textDe` (same normalized-substring rule, labeled unreliable) + last 1200 chars of `n.textDe` + **the Anlass** (`ANLASS_LABEL[n.auftrag.anlass].de`) so the tip can say *what move the Nachricht still owes* (z. B. „Die Entschuldigung steht — es fehlt noch ein konkreter Ersatzvorschlag"); 1-2 sentence strategic German, never ready-made text; same `tippDe` schema + bare-prose fallback.

- [ ] **Step 4: Run the test to verify it passes** — PASS.
- [ ] **Step 5: Full suite + typecheck** — `npm test`, `npm run typecheck`, clean (the union member lands in all exhaustive maps in this task, so both must pass here).

---

### Task 10: Musternachrichten (5 model texts, 4 layers)

**Files:**
- Create: `src/data/schreibenMusterNachrichten.ts`
- Test: `tests/data/schreibenMusterNachrichten.test.ts` (create)

**Interfaces:**
- Consumes: `SchreibAnlass`, `SCHREIB_ANLAESSE`, `SCHREIBEN_AUFTRAEGE` (Task 2).
- Produces (Tasks 11, 12 rely on):

```ts
export type NachrichtMusterLayer = 'konnektor' | 'mittel' | 'struktur' | 'hoeflichkeit'
export interface NachrichtMusterSegment { t: string; layer?: NachrichtMusterLayer; noteDe?: string }
export interface Musternachricht {
  id: SchreibAnlass                    // the Anlass IS the key (ADR-0023)
  titleDe: string; signalDe: string
  auftragId: string                    // the flagship Auftrag this text answers
  skeleton: string[]                   // the paragraph plan, Betreff → Gruß
  segments: NachrichtMusterSegment[]
}
export const NACHRICHT_MUSTER_LAYER_LABEL: Record<NachrichtMusterLayer, { de: string; en: string }>
export const SCHREIBEN_MUSTER_NACHRICHTEN: Musternachricht[]   // exactly 5, one per Anlass
export const NACHRICHT_MUSTER_TITLE: Record<SchreibAnlass, string>
```

- [ ] **Step 1: Write the failing test**

Create `tests/data/schreibenMusterNachrichten.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  SCHREIBEN_MUSTER_NACHRICHTEN, NACHRICHT_MUSTER_LAYER_LABEL
} from '../../src/data/schreibenMusterNachrichten'
import { SCHREIB_ANLAESSE, SCHREIBEN_AUFTRAEGE } from '../../src/data/schreibenAuftraege'

const FLAGSHIPS: Record<string, string> = {
  entschuldigung: 'wa-besprechung-absagen', bitte: 'wa-homeoffice-antrag',
  beschwerde: 'wa-kantine-qualitaet', vorschlag: 'wa-teamausflug', dank: 'wa-dank-fortbildung'
}

describe('Musternachrichten', () => {
  test('exactly five, one per Anlass, each answering its flagship Auftrag', () => {
    expect(SCHREIBEN_MUSTER_NACHRICHTEN.map(m => m.id).sort()).toEqual([...SCHREIB_ANLAESSE].sort())
    const ids = new Set(SCHREIBEN_AUFTRAEGE.map(a => a.id))
    for (const m of SCHREIBEN_MUSTER_NACHRICHTEN) {
      expect(m.auftragId, m.id).toBe(FLAGSHIPS[m.id])
      expect(ids.has(m.auftragId), m.id).toBe(true)
    }
  })
  test('exam length: 95-150 words of running text', () => {
    for (const m of SCHREIBEN_MUSTER_NACHRICHTEN) {
      const words = m.segments.map(s => s.t).join('').trim().split(/\s+/).length
      expect(words, m.id).toBeGreaterThanOrEqual(95)
      expect(words, m.id).toBeLessThanOrEqual(150)
    }
  })
  test('every text carries the frame and all four layers, incl. ≥2 hoeflichkeit spans', () => {
    for (const m of SCHREIBEN_MUSTER_NACHRICHTEN) {
      const full = m.segments.map(s => s.t).join('')
      expect(full, m.id).toMatch(/^Betreff:/)
      expect(full, m.id).toMatch(/Grüßen|Grüße/)
      const layers = m.segments.filter(s => s.layer).map(s => s.layer)
      for (const l of ['konnektor', 'mittel', 'struktur'] as const) expect(layers, `${m.id}:${l}`).toContain(l)
      expect(layers.filter(l => l === 'hoeflichkeit').length, m.id).toBeGreaterThanOrEqual(2)
    }
  })
  test('every annotated span explains itself; skeleton spans Betreff to Gruß', () => {
    for (const m of SCHREIBEN_MUSTER_NACHRICHTEN) {
      for (const s of m.segments) {
        if (s.layer) expect(s.noteDe?.trim().length ?? 0, `${m.id}: "${s.t}"`).toBeGreaterThan(20)
      }
      expect(m.skeleton.length, m.id).toBeGreaterThanOrEqual(5)
      expect(m.skeleton[0].toLowerCase(), m.id).toContain('betreff')
      expect(m.titleDe.length).toBeGreaterThan(3)
      expect(m.signalDe.length).toBeGreaterThan(10)
    }
  })
  test('layer labels for all four layers', () => {
    for (const l of ['konnektor', 'mittel', 'struktur', 'hoeflichkeit'] as const) {
      expect(NACHRICHT_MUSTER_LAYER_LABEL[l].de.length).toBeGreaterThan(3)
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails** — FAIL, module missing.

- [ ] **Step 3: Author the five texts**

Header comment mirroring `schreibenMuster.ts`'s (CONTEXT.md → Musternachricht: own concept beside Mustertext, four layers, hoeflichkeit carries the genre's core skill; never graded, never counted). Layer labels: `konnektor` „Konnektoren"/(connectors) · `mittel` „Nachrichtenmittel & Züge"/(moves & phrases) · `struktur` „Grammatische Strukturen"/(grammar structures) · `hoeflichkeit` „Höflichkeit"/(politeness devices). Each Musternachricht: a genuine ~100-120-word answer to its flagship Auftrag, frame included (`Betreff: …` first segment, Anrede, Gruß + name last), segments in Teil 1's style — every annotated span's `noteDe` explains why the device works **at that spot**. `hoeflichkeit` spans mark KII request frames, softeners (*leider*, *gern*, *durchaus*), and the Anrede/Gruß conventions; the same span never carries two layers — pick the teaching-dominant one. `skeleton`: the paragraph plan from Betreff to Gruß (6-7 lines). `signalDe`: how to recognize the Anlass on a task sheet (e.g. dank: `'„Bedanken Sie sich …" + Rückmeldung/Bericht-Punkte'`). Opening segments of the `entschuldigung` text as the register exemplar:

```ts
segments: [
  { t: 'Betreff: Absage der Besprechung am Freitag', layer: 'mittel',
    noteDe: 'Der Betreff nennt Anliegen und Termin in einer Zeile — der Empfänger weiß vor dem Öffnen, worum es geht.' },
  { t: '\n\n' },
  { t: 'Sehr geehrter Herr Semder,', layer: 'hoeflichkeit',
    noteDe: 'Die neutrale Standard-Anrede mit Namen — immer sicher gegenüber Vorgesetzten. Nach dem Komma geht es klein weiter.' },
  { t: '\n' },
  { t: 'leider ', layer: 'hoeflichkeit',
    noteDe: '„Leider" als Weichmacher direkt am Satzanfang: kündigt die schlechte Nachricht an, ohne sie hart zu machen.' },
  { t: 'muss ich Ihnen mitteilen, dass ich an der Besprechung am Freitag nicht teilnehmen kann. ' },
  // … continue through Grund (struktur: weil-Nebensatz), Vorschlag (hoeflichkeit: KII),
  //   Bitte ums Protokoll (mittel), verbindlicher Abschluss (mittel), Gruß + Name …
]
```

- [ ] **Step 4: Run the test to verify it passes** — PASS. Word-count failures are fixed in the entry, never the test.
- [ ] **Step 5: Typecheck** — clean.

---

### Task 11: Routes, Muster view, hub activation, nav, yield component

**Files:**
- Create: `src/modules/schreiben/NachrichtMusterView.vue`
- Create: `src/components/schreiben/SchrNachrichtYield.vue`
- Create: placeholder SFCs `src/modules/schreiben/Teil2Setup.vue`, `Teil2Prep.vue`, `Teil2Runner.vue`, `Teil2Result.vue` (`<template><div /></template>` — Tasks 12–14 overwrite)
- Modify: `src/router.ts` (after line 209's Teil 1 block)
- Modify: `src/modules/schreiben/SchreibenHome.vue` (activate the dead Teil 2 panel `:167-181`, add Teil 2 stats + Muster row)
- Modify: `src/data/nav.ts` (line 48: `de: 'B2 · Forumsbeitrag'` → `de: 'B2 · Schreiben'`)
- Modify: `src/modules/home/Home.vue` (tile XIV: `meta: 'Teil 1 live · Teil 2 folgt · AI-graded'` → `meta: 'Teil 1 & 2 live · AI-graded'`; append to `desc`: `' Teil 2: die halbformelle Nachricht mit Rahmen-Gerüst und Radar.'`)

**Interfaces:**
- Consumes: Tasks 2, 3, 10 exports; `lifetimeCounts` (`useRedemittelYield.ts`); `loadHistory`.
- Produces: route names `schreiben-teil2`, `schreiben-teil2-prep`, `schreiben-teil2-run`, `schreiben-teil2-result`, `schreiben-muster-teil2` (Tasks 12–14 navigate by exactly these); `SchrNachrichtYield.vue` with `defineProps<{ usedIds: string[]; note?: string }>()`.

- [ ] **Step 1: Routes**

Append after the Teil 1 result route in `src/router.ts`:

```ts
  { path: '/schreiben/teil2', name: 'schreiben-teil2', component: () => import('./modules/schreiben/Teil2Setup.vue') },
  { path: '/schreiben/teil2/prep', name: 'schreiben-teil2-prep', component: () => import('./modules/schreiben/Teil2Prep.vue') },
  { path: '/schreiben/teil2/run', name: 'schreiben-teil2-run', component: () => import('./modules/schreiben/Teil2Runner.vue') },
  { path: '/schreiben/teil2/result', name: 'schreiben-teil2-result', component: () => import('./modules/schreiben/Teil2Result.vue') },
  { path: '/schreiben/muster-teil2', name: 'schreiben-muster-teil2', component: () => import('./modules/schreiben/NachrichtMusterView.vue') },
```

- [ ] **Step 2: SchrNachrichtYield.vue**

Copy `src/components/schreiben/SchrYield.vue`, swap in `NACHRICHT_MOVES`/`NACHRICHT_MOVE_LABEL`/`SCHREIBEN_NACHRICHTENMITTEL`, same props. (Separate component for the same reason SchrYield is separate from SprVortragYield — disjoint Move sets.)

- [ ] **Step 3: NachrichtMusterView.vue**

Mirror `MusterView.vue` section-for-section against the Task 10 data: chips per Musternachricht (`NACHRICHT_MUSTER_TITLE`), `?muster=<anlass>` query preselect, collapsible Aufgabenblatt resolved via `SCHREIBEN_AUFTRAEGE.find(a => a.id === muster.auftragId)` (show situation, Empfänger, task, the four points), numbered skeleton, **four** layer toggles with counts (`NACHRICHT_MUSTER_LAYER_LABEL`), segments as inline `<button>` spans with whitespace pulled outside the button exactly as `MusterView.vue:85-87,146-158` does, click pins `noteDe`. The `hoeflichkeit` layer gets its own highlight color (a 4th CSS class beside the three copied ones — pick a warm tone distinct from the existing three). Back link → `schreiben`. Keep the Betreff/Anrede/Gruß segments rendering their literal `\n` linebreaks (`white-space: pre-wrap` on the text container — the frame must look like a message, not a paragraph).

- [ ] **Step 4: SchreibenHome.vue activation**

Replace the dead panel (`:167-181`) with a live `<button class="spr-part" @click="go('schreiben-teil2')">`, mirroring the Teil 1 panel's structure: header `Teil 2` / `allein, ca. 25 Minuten`, title `Halbformelle Nachricht`, claim `Ein Schreibauftrag, vier Inhaltspunkte, mindestens 100 Wörter.`, description naming Anrede/Grußformel/Sie-Register and the five Schreibanlässe, stats `{{ doneAuftraege }}/{{ totalAuftraege }}` (via `doneAuftragTitles`/`allAuftraege`), last Teil 2 score, run count from a new `teil2Runs = allRuns.filter(h => h.type === 'schreiben-teil2')`; rename the existing `schreibenRuns` computed to `teil1Runs` inside this file only. Update the masthead subtitle (`:126-133`) to name both parts. Add a Musternachrichten row to the shared rows list (`rows`) → route `schreiben-muster-teil2`, mirroring however the Teil 1 Muster library row is wired in this file.

- [ ] **Step 5: nav + Home tile**

Apply the two one-line edits listed under **Files**.

- [ ] **Step 6: Verify**

`npm run typecheck` clean; `npm test` green; `npm run dev`: Home tile → hub shows both live panels, Muster view renders all five texts with four working layer toggles at 390 px width.

---

### Task 12: Teil2Setup.vue + Teil2Prep.vue

**Files:**
- Create: `src/modules/schreiben/Teil2Setup.vue` (overwrite placeholder)
- Create: `src/modules/schreiben/Teil2Prep.vue` (overwrite placeholder)

**Interfaces:**
- Consumes: `drawAuftrag`/`allAuftraege`/`generateAuftraege`/`addCustomAuftraege`/`deleteCustomAuftrag`/`doneAuftragTitles` (Task 7); `resolveBaukasten` (Task 4) + `loadCachedBaukasten`/`generateBaukasten`/`saveCachedBaukasten` (Task 8); `NachrichtRunStash`/`NACHRICHT_STASH_KEY`/`NachrichtHelps` + `emptySchreibPlan` (Task 5 / `data/schreiben.ts`); `findActiveNachricht`/`abandonNachricht` (Task 5); `SCHREIB_ANLAESSE`/`ANLASS_LABEL` (Task 2); `NACHRICHT_MUSTER_TITLE` (Task 10); `useSettings`/`resolveAiClient`; route names (Task 11).
- Produces: the stash contract — Setup writes `NachrichtRunStash`, Prep re-writes it with the live plan, Runner consumes once.

- [ ] **Step 1: Teil2Setup.vue**

Mirror `src/modules/schreiben/Teil1Setup.vue`'s skeleton, with these divergences:
- localStorage key `schreibenTeil2Setup`, stored shape `{ hintsOn?: boolean; checklistOn?: boolean; kiTippOn?: boolean; timerOn?: boolean; rahmenOn?: boolean; radarOn?: boolean; lang?: 'de' | 'en' }`, merge-write.
- **Anlass filter chips** above the draw: `Alle` + one chip per `SCHREIB_ANLAESSE` (label `ANLASS_LABEL[a].de`), `selectedAnlass: Ref<SchreibAnlass | null>` (session-only, not persisted); reroll and the pool list respect it. Each Auftrag row/preview shows its Anlass badge.
- Auftrag draw: one `Schreibauftrag` via `drawAuftrag(selectedAnlass.value)` shown as the full task sheet preview — title, Anlass badge, `situationDe`, **Empfänger card** (`empfaengerName` + `empfaengerRolleDe` — the Anrede target), `taskDe`, the four Inhaltspunkte numbered, `erledigt` mark via `doneAuftragTitles()` — plus `Neu ziehen` and the collapsible full-pool list (grouped by Anlass, custom rows deletable).
- `Neue Aufträge generieren (KI)` gated on `canUseAi` → `generateAuftraege` → `addCustomAuftraege` (five arrive, one per Anlass), toast on failure.
- **Six help switches**: Hinweise · Checkliste (Inhaltspunkt-Dots + Wortzahl + Gerüst-Check) · KI-Tipp · Timer (25 min + Zeit-Phasen) · Rahmen-Gerüst (labeled „Rahmen-Gerüst — Betreff/Anrede/Gruß als Felder") · Radar (labeled „Radar — warnt live vor du-Formen und fehlender Höflichkeit"). Defaults all **on**.
- Resume banner via `findActiveNachricht()` — „Nachricht fortsetzen?" with Fortsetzen (→ `schreiben-teil2-run`) / Verwerfen (`abandonNachricht`).
- `Weiter zur Planung` CTA: write `NachrichtRunStash` (`{ auftrag: <denormalized SchreibauftragRef of the chosen Auftrag>, helps, plan: emptySchreibPlan(), model }`) to `sessionStorage[NACHRICHT_STASH_KEY]` → `schreiben-teil2-prep`.

- [ ] **Step 2: Teil2Prep.vue**

Mirror `src/modules/schreiben/Teil1Prep.vue`:
- Read the stash on mount (missing → back to `schreiben-teil2`). Task sheet at top incl. the Empfänger card and Anlass badge.
- **Musternachricht deep-link**: badge + link → `{ name: 'schreiben-muster-teil2', query: { muster: auftrag.anlass } }`, labeled with `NACHRICHT_MUSTER_TITLE[auftrag.anlass]` — always present (every Auftrag has an Anlass, custom included; note this divergence from Teil 1 in a comment).
- **Schreibplan**: identical to Teil 1's (one keyword per Inhaltspunkt, same hygiene warnings, same debounced stash re-write, `Ohne Plan starten`).
- **Inhalts-Baukasten panel** (replaces Teil 1's Argumente panel): `loadCachedBaukasten(auftrag.id)` → `resolveBaukasten(auftrag, cached)`; render three groups — `Mögliche Gründe`, `Lösungen & Vorschläge`, `Textwortschatz` (nouns with EN gloss) — with a scope note („für diesen Auftrag" when scope is `auftrag`/`cached`, „für den Anlass {ANLASS_LABEL[scope].de}" otherwise); `Baukasten mit KI verfeinern` button gated on `canUseAi` → `generateBaukasten` → `saveCachedBaukasten` → re-resolve.
- `Schreiben beginnen` flushes the stash synchronously → `schreiben-teil2-run`.

- [ ] **Step 3: Verify**

`npm run typecheck` clean. Manual at 390 px: chips filter the draw, Empfänger card renders, six toggles persist, Baukasten shows the flagship bank for `wa-homeoffice-antrag` and the `bitte` fallback for `wa-urlaub-verschieben`, CTA lands on the placeholder Runner.

---

### Task 13: Teil2Runner.vue — the guided sitting

**Files:**
- Create: `src/modules/schreiben/Teil2Runner.vue` (overwrite placeholder)

**Interfaces:**
- Consumes: Tasks 3, 5, 6, 8, 9 + `matchRedemittel`/`pickMoveNudge` (`useRedemittelMatch.ts`), `bumpRedemittelYield`/`lifetimeCounts` (`useRedemittelYield.ts`), `appendCorrections` (`useSprechenArchive.ts`), `saveQuizRun` (`useQuizHistory.ts`), `HelpKind` (`data/sprechen.ts`), `resolveBaukasten`/`loadCachedBaukasten`, the same `sentenceAround` + `countWords` imports `Teil1Runner.vue` uses (copy its import lines).
- Produces: on successful grade — `NachrichtResultStash` in `sessionStorage[NACHRICHT_RESULT_KEY]`, the recorded `'schreiben-teil2'` Run, archived corrections (`part: 2, module: 'schreiben'`), banked yield; Dexie row deleted; navigate to `schreiben-teil2-result`.

- [ ] **Step 1: Lifecycle and compose surface**

Mount contract as `Teil1Runner.vue`: consume stash → `createNachricht(...)`; else `findActiveNachricht()`; else back to `schreiben-teil2`. Compose surface by `helps.rahmen`:
- **rahmen on**: four labeled slots — `Betreff` (single-line input), `Anrede` (single-line input, placeholder `Sehr geehrte(r) … ,`), `Text` (the main `<textarea>`, autofocus), `Gruß & Name` (two-row textarea) — bound to a `slots: Ref<NachrichtSlots>` (seeded from `nachricht.slots` on resume). A computed `fullText = assembleNachricht(slots.value)` feeds every meter, check, matcher, and save. Nothing is prefilled — every slot starts empty (CONTEXT.md → Rahmen-Gerüst).
- **rahmen off**: one `<textarea>` bound to `textDraft` (seeded from `nachricht.textDe`), `fullText = textDraft`.
Debounced 1 s autosave: `saveNachrichtText(id, fullText, helps.rahmen ? slots.value : undefined)`. Spellcheck off. All meters read `fullText`.

- [ ] **Step 2: Aufgabenblatt rail + meters**

Rail: title + Anlass badge, `situationDe`, Empfänger card (name + role — what the Anrede must match), `taskDe`. Meters (gated `helps.checklist`):
- Inhaltspunkt checklist: four dots from plan-keyword matching (same local rule as Teil 1's `planSignals`).
- **Gerüst-Check**: six dots from `geruestSignals(fullText, auftrag.empfaengerName)` rendered under the Inhaltspunkt dots with `labelDe` + failing dots showing `hintDe` on tap; same visual language as the plan dots but its own heading „Rahmen".
- Word bar: fill vs `NACHRICHT_TARGET_WORDS`, band class from `nachrichtWordBand`, label `X Wörter · mindestens 100`.
- Timer (additionally gated `helps.timer`): 25-min countdown flipping to `+Überzeit`, plus the **Zeit-Phasen** strip — three segments (planen/schreiben/prüfen) with the current `nachrichtPhase(elapsed)` highlighted; purely informational.
- Nachrichtenmittel-Ausbeute dot strip via `matchRedemittel([fullText], SCHREIBEN_NACHRICHTENMITTEL)`, always on.

- [ ] **Step 3: Radar (gated `helps.radar`)**

A slim warning strip between editor and meters: `radarWarnungen(fullText, auftrag.anlass)` re-evaluated on the same 1 s debounce; each warning renders `labelDe` + `detailDe` + up to 3 `matches` as chips; dismissible per warning-key for the sitting (a `Set<RadarKey>`), reappearing only if it re-fires after clearing. **Never logged to the help log** (CONTEXT.md → Radar).

- [ ] **Step 4: Helps (all logged via `logNachrichtHelp`)**

- Drawer (gated `helps.hints`), two tabs: **Nachrichtenmittel** — Move chips restricted to `movesForAnlass(auftrag.anlass)` first with the remaining moves in a collapsed „weitere" group; click inserts `phraseDe` at the caret of the *active* text field (rahmen: the Text slot) and logs `'phrase'`; a `Rahmen` sub-section listing `RAHMEN_PAARE` (click fills/replaces the Anrede and Gruß slots when rahmen is on, else inserts at caret). **Baukasten** — the resolved Baukasten read-only.
- Move nudge (gated `helps.hints`): `pickMoveNudge([frozenText], lifetimeCounts(SCHREIBEN_NACHRICHTENMITTEL), aptBank, aptMoves)` where `aptMoves = movesForAnlass(auftrag.anlass)` and `aptBank = SCHREIBEN_NACHRICHTENMITTEL.filter(p => aptMoves.includes(p.move))` — the Anlass-aware restriction (CONTEXT.md → Move). Same 40-word-band frozen-text refresh, dismissible, logged `'nudge'` once.
- KI-Tipp (gated `helps.kiTipp && canUseAi`): `incrementNachrichtKiTipp` before assign, `generateNachrichtKiTipp`, log `'kitipp'`.
- Exam-mode note when hints off.

- [ ] **Step 5: Submission + grading pipeline**

`Abgeben & bewerten`: if `countWords(fullText) < NACHRICHT_MIN_WORDS` → `window.confirm` first. Then `saveNachrichtText` flush → `markNachrichtSubmitted` → `runGrading()` mirroring Teil 1's `runGrading` verbatim with these substitutions: `gradeNachricht`, `SCHREIBEN_NACHRICHTENMITTEL` matching, `type: 'schreiben-teil2'`, `meta.topicTitle = n.auftrag.titleDe`, `meta.sprechenHelps: { ...n.helps, hardLimit: false }`, corrections mapped with `part: 2 as const, module: 'schreiben' as const`, stash `NachrichtResultStash` → `sessionStorage[NACHRICHT_RESULT_KEY]`, `deleteNachricht(n.id)` (ADR-0019), → `schreiben-teil2-result`. Same `runRecorded` latch, same grade-failed retry alert, same `Verwerfen` confirm-abandon.

- [ ] **Step 6: Verify**

`npm run typecheck` clean, `npm test` green. Manual at 390 px: both compose surfaces work and resume correctly (reload mid-writing in each mode), Gerüst dots flip as the frame appears, Radar fires on a `du` and on a KII-less Bitte, drawer inserts into the right field, nudge never suggests `entschuldigung` on a `dank` Auftrag, grade lands on Result.

---

### Task 14: Teil2Result.vue

**Files:**
- Create: `src/modules/schreiben/Teil2Result.vue` (overwrite placeholder)

**Interfaces:**
- Consumes: `NACHRICHT_RESULT_KEY`/`NachrichtResultStash` (Task 9), `SCHREIBEN_B2_TEIL2` (Task 1), `SchrNachrichtYield` (Task 11), `NACHRICHT_MOVE_LABEL` (Task 3), `ANLASS_LABEL` (Task 2), route names (Task 11), the `schreibenTeil2Setup` localStorage key for the `lang` toggle.

- [ ] **Step 1: Implement (mirror `Teil1Result.vue` section-for-section)**

- One-shot stash read; absent → the permanent notice.
- Header: score /100, Prädikat, pass marker, Auftrag title + Anlass badge, word count, DE/EN toggle (persisted as `lang` in `schreibenTeil2Setup`).
- Criterion bars vs 25 from `SCHREIBEN_B2_TEIL2` with justifications.
- Inhaltspunkte coverage: four rows (grader ✓/✗ + note, secondary plan-keyword dot).
- Korrekturen cards (five kind chips — `register` will actually appear here; footer links → `sprechen-archive`).
- Aufwertungen („war nicht falsch"), Stärken/Schwächen, `overallDe/En`.
- Ausbeute: `<SchrNachrichtYield :used-ids="data.nachrichtenmittel" />` + per-Move counts.
- Hilfe-Protokoll: same fixed order `['drawer','phrase','nudge','kitipp']` + minute strip + „rein beschreibend" footer.
- Actions: `Neue Nachricht` (→ `schreiben-teil2`), `Zur Übersicht` (→ `schreiben`), `Musternachricht ansehen` (→ `schreiben-muster-teil2?muster=<anlass>` — the post-grade study loop), `Fehlerarchiv`, `Korrekturdrill`.

- [ ] **Step 2: Verify**

`npm run typecheck` clean. Manual: hand-inject a stash in devtools, check every section in both languages at 390 px.

---

### Task 15: Cheatsheet Teil 2, README, final sweep

**Files:**
- Modify: `src/modules/schreiben/SchreibenCheatsheet.vue`
- Modify: `README.md` (the Schreiben bullet)

**Interfaces:**
- Consumes: `SCHREIBEN_NACHRICHTENMITTEL`/`NACHRICHT_MOVES`/`NACHRICHT_MOVE_LABEL`/`nachrichtenmittelForMove`/`RAHMEN_PAARE` (Task 3), `SCHREIBEN_TEIL2_TIPPS` (Task 3), `lifetimeCounts` (`useRedemittelYield.ts`).

- [ ] **Step 1: Part toggle in the cheatsheet**

Add a Teil 1 / Teil 2 toggle at the top of `SchreibenCheatsheet.vue` (the same mechanics SprechenCheatsheet uses — see the CSS comment at `SchreibenCheatsheet.vue:118-119` pointing there). Teil 1 keeps its existing two tabs untouched. Teil 2 shows: **Nachrichtenmittel** — one section per `NACHRICHT_MOVES` entry (label, five phrases with `noteEn`, lifetime tick via `lifetimeCounts(SCHREIBEN_NACHRICHTENMITTEL)`), prefixed by a **Rahmen** section rendering `RAHMEN_PAARE` as Anrede↔Gruß pairs; **Strategie** — `SCHREIBEN_TEIL2_TIPPS` sections as headed lists.

- [ ] **Step 2: README**

Extend the Schreiben bullet: Teil 1 & Teil 2 — Forumsbeitrag and halbformelle Nachricht, 20 seeded Schreibaufträge in five Anlass groups, Musternachrichten, Rahmen-Gerüst/Gerüst-Check/Radar helpers, official-rubric AI grading, shared Fehlerarchiv.

- [ ] **Step 3: Full verification**

`npm test` all green · `npm run typecheck` clean · `npm run build` succeeds.

- [ ] **Step 4: Self-review sweep**

`grep -rn "TODO\|FIXME\|placeholder" src/modules/schreiben src/data/schreiben* src/composables/useSchreiben* src/composables/useNachricht*` → empty. Grep `Forumsbeitrag` inside the Teil 2 SFCs → only in comments, never UI copy. Grep `E-Mail` in Teil 2 UI copy → none (the unit is Nachricht). `grep -rn "'schreiben-teil2'" src` covers useQuizHistory, quiz-type-labels ×3, useQuizStats ×2, HistoryPage ×2, useLevelAssessment, useSchreibenAuftraege, and the module SFCs.
