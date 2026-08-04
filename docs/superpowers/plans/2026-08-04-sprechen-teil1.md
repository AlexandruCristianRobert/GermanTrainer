# Sprechen Teil 1 (Vortrag) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Sprechen Teil 1 — one Vortragsthema chosen from two task sheets, a Gliederung planner, one continuous four-minute Rede, one AI Nachfrage, and a four-criterion grade — with a help system that is free and local except for one paid tip.

**Architecture:** Four new routes and four new screens beside the shipped Teil 2 flow. The genuinely part-agnostic modules (`useRedemittelMatch`, `useRedemittelYield`, `useSprechenArchive`) gain **optional parameters with defaults**, so no existing caller changes and no existing test moves. Everything Teil-1-specific lands in new files. Dexie goes to version 11 for one new table.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, vue-router, Dexie (IndexedDB), vitest + @vue/test-utils + fake-indexeddb, Gemini / local-Claude via `resolveAiClient`.

**Source of truth:** [the spec](../specs/2026-08-04-sprechen-teil1-design.md) and [ADR-0014](../../adr/0014-teil1-continuous-rede-coverage-judged-not-measured.md). Where this plan and the spec disagree, the spec wins — report the conflict rather than guessing.

## Global Constraints

- **Never run git.** The controller commits between waves. Do not `git add`, `git commit`, `git checkout`, or `git stash`.
- **Typecheck with `npm run typecheck`** (vue-tsc). Plain `tsc` floods with ~212 bogus `.vue` module errors and means nothing.
- **Test with `npm test`** (`vitest run`). Test files live at `tests/<mirror-of-src-path>.test.ts` and import via relative `../../src/...`.
- **Touch only the files listed in your task.** Another agent is editing the neighbouring files in the same wave.
- **No new CSS tokens.** Use the existing ones only: `--accent`, `--accent-wash`, `--accent-tint`, `--ochre`, `--clay`, `--cobalt`, `--paper-deep`, `--paper-card`, `--rule`, `--hairline`, `--mute`, `--ink-soft`, `--success`, `--danger`, `--font-display`, `--font-mono`, `--font-body`.
- **German copy is user-facing and must be correct German.** English glosses go in `noteEn` / `*En` fields only.
- **Redezeit constants are fixed:** `VORTRAG_WPM = 90`, `VORTRAG_TARGET_WORDS = 360`, point targets `45 / 75 / 95 / 75 / 70`. The five targets must sum to 360 — a test asserts it. Do **not** use the prototype's 110 wpm / 445 words.
- **No help may affect a score.** Help usage is recorded and displayed; it never enters the grader prompt except the KI-Tipp count, which is not sent at all.
- **`PUNKT_MOVES` must never drive coverage** (ADR-0014). Its only consumer is the drawer's outlining.
- **Aufwertungen never enter `sprechenCorrections`.**
- **Terminology in code and copy:** *Vortrag* = the whole unit, *Rede* = the monologue, *Nachfrage* = the follow-up exchange, *Vortragsthema* = the subject, *Gliederungspunkt* = one of the five points, *Vortragsplan* = the five keywords. Never "section" / "Abschnitt" for a Gliederungspunkt.

---

## File Structure

**New data**
| File | Responsibility |
|---|---|
| `src/data/sprechenVortragsmittel.ts` | 35 phrases in 7 Move groups, the five Gliederungspunkte, `PUNKT_MOVES`, Rettungsleinen, Konnektoren, wpm/word constants, `vortragClock()` |
| `src/data/sprechenVortragsthemen.ts` | 60 seeded Vortragsthemen + the generator response schema |

**New composables**
| File | Responsibility |
|---|---|
| `src/composables/useVortrag.ts` | Dexie lifecycle for the `sprechenVortraege` row |
| `src/composables/useVortragCoverage.ts` | Vortragsplan keyword → Gliederungspunkt matching, furthest-reached derivation |
| `src/composables/useVortragTimer.ts` | Redezeit measurement + hard-limit predicate |
| `src/composables/useVortragsthemen.ts` | Pool, custom pool, done-list, A/B draw, AI generation |
| `src/composables/useVortragPartner.ts` | Nachfrage generation + Teil-1 KI-Tipp |
| `src/composables/useVortragGrader.ts` | Grade call, schema, validator, result stash |

**New screens** — `src/modules/sprechen/Teil1Setup.vue`, `Teil1Prep.vue`, `Teil1Runner.vue`, `Teil1Result.vue`

**Modified** — `src/data/sprechen.ts` (Vortrag types), `src/data/rubrics.ts` (`SPRECHEN_B2_TEIL1`), `src/data/sprechenArguments.ts` + `src/composables/useSprechenArguments.ts` (optional `phrases`), `src/composables/useRedemittelMatch.ts` + `useRedemittelYield.ts` (optional bank params), `src/composables/useSprechenArchive.ts` (`part`), `src/db/index.ts` (v11), `src/router.ts`, `src/styles/sprechen.css`, `src/modules/sprechen/SprechenHome.vue`, `SprechenCheatsheet.vue`, `src/composables/useQuizHistory.ts`, `useLevelAssessment.ts`, `useQuizStats.ts`, `useUserData.ts`, `src/components/charts/quiz-type-labels.ts`, `src/modules/history/HistoryPage.vue`

## Execution Waves

Tasks within a wave touch **disjoint files** and run in parallel. Waves are strictly ordered.

| Wave | Tasks | Depends on |
|---|---|---|
| **A** | 1 · 2 · 3 · 4 | — |
| **B** | 5 · 6 · 7 · 8 | A |
| **C** | 9 · 10 · 11 | B |
| **D** | 12 | C |
| **E** | 13 · 14 · 15 · 16 | D |
| **F** | 17 · 18 | E |

---

### Task 1: Vortragsmittel, Gliederungspunkte and the Teil-1 constants

**Files:**
- Create: `src/data/sprechenVortragsmittel.ts`
- Test: `tests/data/sprechenVortragsmittel.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `VORTRAG_MOVES`, `type VortragMove`, `VORTRAG_MOVE_LABEL`, `type Vortragsmittel`, `SPRECHEN_VORTRAGSMITTEL`, `vortragsmittelForMove()`, `GLIEDERUNGSPUNKTE`, `type GliederungKey`, `type Gliederungspunkt`, `PUNKT_MOVES`, `VORTRAG_WPM`, `VORTRAG_TARGET_WORDS`, `vortragClock()`, `RETTUNGSLEINEN`, `KONNEKTOREN`.

- [ ] **Step 1: Write the failing test**

`tests/data/sprechenVortragsmittel.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  SPRECHEN_VORTRAGSMITTEL, VORTRAG_MOVES, VORTRAG_MOVE_LABEL, vortragsmittelForMove,
  GLIEDERUNGSPUNKTE, PUNKT_MOVES, VORTRAG_TARGET_WORDS, VORTRAG_WPM, vortragClock,
  RETTUNGSLEINEN, KONNEKTOREN
} from '../../src/data/sprechenVortragsmittel'
import { redemittelNeedle } from '../../src/composables/useRedemittelMatch'

describe('SPRECHEN_VORTRAGSMITTEL', () => {
  it('ships 35 phrases with unique ids', () => {
    expect(SPRECHEN_VORTRAGSMITTEL).toHaveLength(35)
    expect(new Set(SPRECHEN_VORTRAGSMITTEL.map(r => r.id)).size).toBe(35)
  })

  it('covers all seven Moves, five phrases each', () => {
    for (const m of VORTRAG_MOVES) expect(vortragsmittelForMove(m)).toHaveLength(5)
  })

  it('labels every Move in German and English', () => {
    for (const m of VORTRAG_MOVES) {
      expect(VORTRAG_MOVE_LABEL[m].de.length).toBeGreaterThan(3)
      expect(VORTRAG_MOVE_LABEL[m].en.length).toBeGreaterThan(3)
    }
  })

  it('gives every phrase a non-empty English gloss', () => {
    for (const r of SPRECHEN_VORTRAGSMITTEL) expect(r.noteEn.trim().length).toBeGreaterThan(0)
  })

  // The invariant that caught the comma bug in the Teil 2 bank.
  it('produces 35 distinct needles, none a substring of another', () => {
    const needles = SPRECHEN_VORTRAGSMITTEL.map(r => redemittelNeedle(r.phraseDe))
    expect(new Set(needles).size).toBe(35)
    const overlaps: string[] = []
    for (const a of needles) {
      for (const b of needles) if (a !== b && b.includes(a)) overlaps.push(`${a} ⊂ ${b}`)
    }
    expect(overlaps).toEqual([])
  })

  it('never produces a needle shorter than 12 chars', () => {
    for (const r of SPRECHEN_VORTRAGSMITTEL) {
      expect(redemittelNeedle(r.phraseDe).length).toBeGreaterThanOrEqual(12)
    }
  })
})

describe('GLIEDERUNGSPUNKTE', () => {
  it('has five points, numbered 1..5, with unique keys', () => {
    expect(GLIEDERUNGSPUNKTE).toHaveLength(5)
    expect(GLIEDERUNGSPUNKTE.map(p => p.n)).toEqual([1, 2, 3, 4, 5])
    expect(new Set(GLIEDERUNGSPUNKTE.map(p => p.key)).size).toBe(5)
  })

  it('word targets sum to VORTRAG_TARGET_WORDS', () => {
    const sum = GLIEDERUNGSPUNKTE.reduce((n, p) => n + p.words, 0)
    expect(sum).toBe(VORTRAG_TARGET_WORDS)
    expect(VORTRAG_TARGET_WORDS).toBe(360)
    expect(VORTRAG_WPM).toBe(90)
  })

  it('gives every point a hint', () => {
    for (const p of GLIEDERUNGSPUNKTE) expect(p.hintDe.trim().length).toBeGreaterThan(10)
  })
})

describe('PUNKT_MOVES', () => {
  it('maps every Gliederungspunkt to existing Moves', () => {
    for (const p of GLIEDERUNGSPUNKTE) {
      const moves = PUNKT_MOVES[p.key]
      expect(moves.length).toBeGreaterThan(0)
      for (const m of moves) expect(VORTRAG_MOVES).toContain(m)
    }
  })
})

describe('vortragClock', () => {
  it('reads the target as 4:00 at 90 wpm', () => {
    expect(vortragClock(VORTRAG_TARGET_WORDS)).toBe('4:00')
  })

  it('zero-pads the seconds', () => {
    expect(vortragClock(135)).toBe('1:30')
    expect(vortragClock(0)).toBe('0:00')
  })
})

describe('help copy banks', () => {
  it('ships at least three Rettungsleinen, all non-empty', () => {
    expect(RETTUNGSLEINEN.length).toBeGreaterThanOrEqual(3)
    for (const r of RETTUNGSLEINEN) expect(r.trim().length).toBeGreaterThan(10)
  })

  it('ships Konnektoren grouped by the join they make', () => {
    expect(KONNEKTOREN.length).toBeGreaterThanOrEqual(4)
    for (const g of KONNEKTOREN) {
      expect(g.labelDe.trim().length).toBeGreaterThan(3)
      expect(g.words.length).toBeGreaterThanOrEqual(3)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/data/sprechenVortragsmittel.test.ts`
Expected: FAIL — cannot resolve `../../src/data/sprechenVortragsmittel`.

- [ ] **Step 3: Write the implementation**

`src/data/sprechenVortragsmittel.ts`. The 35 phrases are adopted verbatim from the design prototype's `SPR1_REDEMITTEL`; the word targets are **not** (see Global Constraints).

```ts
//
// Sprechen Teil 1 (Vortrag) — the phrase bank, the five Gliederungspunkte, and
// the Redezeit constants. See CONTEXT.md → "Vortragsmittel", "Gliederungspunkt",
// "Rede", "Move".
//
// A Vortragsmittel IS a kind of Redemittel; this is the second phrase bank, not
// a rival concept. Its Move set is disjoint from the Discussion's six
// Gesprächszüge, which is why the two yields are never summed.

export const VORTRAG_MOVES = [
  'einstieg', 'gliederung', 'aspekt', 'kontrast', 'beispiel', 'abschluss', 'nachfrage'
] as const

export type VortragMove = (typeof VORTRAG_MOVES)[number]

export const VORTRAG_MOVE_LABEL: Record<VortragMove, { de: string; en: string }> = {
  einstieg:   { de: 'Thema eröffnen',     en: 'Open the topic' },
  gliederung: { de: 'Aufbau ankündigen',  en: 'Announce the structure' },
  aspekt:     { de: 'Aspekt einführen',   en: 'Introduce an aspect' },
  kontrast:   { de: 'Gegenüberstellen',   en: 'Contrast two sides' },
  beispiel:   { de: 'Belegen & erzählen', en: 'Give evidence or an example' },
  abschluss:  { de: 'Zusammenfassen',     en: 'Summarize and close' },
  nachfrage:  { de: 'Auf Nachfragen',     en: 'Answer a follow-up question' }
}

export interface Vortragsmittel {
  id: string            // 'vm-einstieg-1'
  move: VortragMove
  phraseDe: string
  noteEn: string
}

const P = (id: string, move: VortragMove, phraseDe: string, noteEn: string): Vortragsmittel =>
  ({ id, move, phraseDe, noteEn })

export const SPRECHEN_VORTRAGSMITTEL: Vortragsmittel[] = [
  P('vm-einstieg-1', 'einstieg', 'Ich möchte heute über das Thema … sprechen.', 'today I would like to speak about …'),
  P('vm-einstieg-2', 'einstieg', 'In meinem Vortrag geht es um …', 'my talk is about …'),
  P('vm-einstieg-3', 'einstieg', 'Das Thema beschäftigt mich, weil …', 'the topic concerns me because …'),
  P('vm-einstieg-4', 'einstieg', 'Dieses Thema ist zurzeit besonders aktuell, denn …', 'this topic is especially current, because …'),
  P('vm-einstieg-5', 'einstieg', 'Kaum ein Thema wird so kontrovers diskutiert wie …', 'few topics are debated as controversially as …'),

  P('vm-gliederung-1', 'gliederung', 'Ich habe meinen Vortrag in drei Teile gegliedert.', 'I have divided my talk into three parts.'),
  P('vm-gliederung-2', 'gliederung', 'Zuerst …, danach …, und zum Schluss …', 'first …, then …, and finally …'),
  P('vm-gliederung-3', 'gliederung', 'Ich beginne mit einem kurzen Überblick.', 'I will begin with a brief overview.'),
  P('vm-gliederung-4', 'gliederung', 'Anschließend komme ich zu den Vor- und Nachteilen.', 'after that I come to the advantages and disadvantages.'),
  P('vm-gliederung-5', 'gliederung', 'Am Ende fasse ich meine Position kurz zusammen.', 'at the end I will briefly sum up my position.'),

  P('vm-aspekt-1', 'aspekt', 'Zunächst möchte ich auf … eingehen.', 'first I would like to address …'),
  P('vm-aspekt-2', 'aspekt', 'Ein weiterer wichtiger Punkt ist …', 'another important point is …'),
  P('vm-aspekt-3', 'aspekt', 'Damit komme ich zum zweiten Punkt: …', 'this brings me to my second point: …'),
  P('vm-aspekt-4', 'aspekt', 'In meinem Heimatland sieht die Situation so aus: …', 'in my home country the situation is as follows: …'),
  P('vm-aspekt-5', 'aspekt', 'Besonders auffällig ist dabei, dass …', 'what is particularly striking is that …'),

  P('vm-kontrast-1', 'kontrast', 'Einerseits …, andererseits …', 'on the one hand …, on the other …'),
  P('vm-kontrast-2', 'kontrast', 'Für … spricht, dass …; dagegen spricht …', 'in favour of … is …; against it …'),
  P('vm-kontrast-3', 'kontrast', 'Der größte Vorteil liegt darin, dass …', 'the biggest advantage lies in the fact that …'),
  P('vm-kontrast-4', 'kontrast', 'Dem steht allerdings der Nachteil gegenüber, dass …', 'set against this, however, is the drawback that …'),
  P('vm-kontrast-5', 'kontrast', 'Man darf dabei aber nicht vergessen, dass …', 'one must not forget, though, that …'),

  P('vm-beispiel-1', 'beispiel', 'Ein Beispiel aus meinem eigenen Alltag: …', 'an example from my own daily life: …'),
  P('vm-beispiel-2', 'beispiel', 'Als ich noch … war, habe ich erlebt, dass …', 'when I was still …, I experienced that …'),
  P('vm-beispiel-3', 'beispiel', 'Untersuchungen zeigen, dass …', 'studies show that …'),
  P('vm-beispiel-4', 'beispiel', 'Das lässt sich gut an … erkennen.', 'this can be clearly seen in …'),
  P('vm-beispiel-5', 'beispiel', 'In meinem Bekanntenkreis ist es üblich, dass …', 'among the people I know it is common that …'),

  P('vm-abschluss-1', 'abschluss', 'Zusammenfassend möchte ich sagen, dass …', 'to sum up, I would like to say that …'),
  P('vm-abschluss-2', 'abschluss', 'Abschließend bleibt festzuhalten, dass …', 'in closing it remains to be noted that …'),
  P('vm-abschluss-3', 'abschluss', 'Meine persönliche Meinung dazu ist, dass …', 'my personal opinion on this is that …'),
  P('vm-abschluss-4', 'abschluss', 'Aus den genannten Gründen bin ich der Ansicht, dass …', 'for the reasons given I take the view that …'),
  P('vm-abschluss-5', 'abschluss', 'Vielen Dank für Ihre Aufmerksamkeit.', 'thank you for your attention.'),

  P('vm-nachfrage-1', 'nachfrage', 'Vielen Dank für Ihre Frage.', 'thank you for your question.'),
  P('vm-nachfrage-2', 'nachfrage', 'Das ist ein guter Punkt — ich würde sagen, …', 'that is a good point — I would say …'),
  P('vm-nachfrage-3', 'nachfrage', 'Wenn ich Sie richtig verstehe, meinen Sie …', 'if I understand you correctly, you mean …'),
  P('vm-nachfrage-4', 'nachfrage', 'Darauf bin ich im Vortrag nur kurz eingegangen, aber …', 'I only touched on that briefly in the talk, but …'),
  P('vm-nachfrage-5', 'nachfrage', 'Da muss ich kurz überlegen … Ich denke, …', 'I need a moment to think … I believe …')
]

export function vortragsmittelForMove(move: VortragMove): Vortragsmittel[] {
  return SPRECHEN_VORTRAGSMITTEL.filter(r => r.move === move)
}

/* ── The five Gliederungspunkte ── */

export const GLIEDERUNG_KEYS = [
  'einstieg', 'situation', 'aspekte', 'erfahrung', 'fazit'
] as const

export type GliederungKey = (typeof GLIEDERUNG_KEYS)[number]

export interface Gliederungspunkt {
  key: GliederungKey
  n: 1 | 2 | 3 | 4 | 5
  labelDe: string
  hintDe: string
  words: number
}

// Word targets are rebased from the prototype's 110 wpm / 445 words to 90 wpm /
// 360 — a rate a B2 speaker actually reaches, so a typed and a spoken Rede are
// asked for the same amount of content. See the spec, §2.
export const GLIEDERUNGSPUNKTE: Gliederungspunkt[] = [
  { key: 'einstieg',  n: 1, labelDe: 'Einstieg',           hintDe: 'Thema nennen, Aufbau ankündigen, sagen warum es relevant ist.', words: 45 },
  { key: 'situation', n: 2, labelDe: 'Situation',          hintDe: 'Wie sieht es in deinem Heimatland oder Umfeld aus?',            words: 75 },
  { key: 'aspekte',   n: 3, labelDe: 'Vor- und Nachteile', hintDe: 'Zwei Seiten gegenüberstellen, nicht nur aufzählen.',            words: 95 },
  { key: 'erfahrung', n: 4, labelDe: 'Eigene Erfahrung',   hintDe: 'Ein konkretes Beispiel aus deinem Leben.',                      words: 75 },
  { key: 'fazit',     n: 5, labelDe: 'Meinung & Abschluss', hintDe: 'Position beziehen, begründen, zusammenfassen.',                words: 70 }
]

export const VORTRAG_WPM = 90
export const VORTRAG_TARGET_WORDS = 360

/** Words → m:ss at VORTRAG_WPM. A display convention, not a claim about the learner. */
export function vortragClock(words: number): string {
  const total = Math.round((words / VORTRAG_WPM) * 60)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/**
 * Which Move groups each Gliederungspunkt naturally wants.
 *
 * ADR-0014: this drives the hint drawer's OUTLINING ONLY. It must never drive
 * coverage — `situation` and `erfahrung` share the identical pair, `aspekt`
 * serves three points and `kontrast` two, so a phrase match cannot identify
 * points 2–4 at all. The live checklist uses the learner's own Vortragsplan
 * keyword instead.
 */
export const PUNKT_MOVES: Record<GliederungKey, VortragMove[]> = {
  einstieg:  ['einstieg', 'gliederung'],
  situation: ['aspekt', 'beispiel'],
  aspekte:   ['kontrast', 'aspekt'],
  erfahrung: ['beispiel', 'aspekt'],
  fazit:     ['abschluss', 'kontrast']
}

/* ── Rettungsleine: time-buying lines. Filling four minutes without dead air
      is the examined skill, so these are teaching material, not a crutch. ── */

export const RETTUNGSLEINEN: string[] = [
  'Da muss ich kurz überlegen …',
  'Um es kurz zusammenzufassen: …',
  'Kommen wir zum nächsten Punkt: …',
  'Was ich damit sagen will, ist …',
  'Ein Beispiel macht das deutlicher: …',
  'Lassen Sie mich das etwas genauer erklären.'
]

/* ── Konnektoren, grouped by the join they make ── */

export interface KonnektorGroup {
  labelDe: string
  words: string[]
}

export const KONNEKTOREN: KonnektorGroup[] = [
  { labelDe: 'Weiterführen',      words: ['zunächst', 'anschließend', 'außerdem', 'darüber hinaus', 'schließlich'] },
  { labelDe: 'Aufzählen',         words: ['erstens', 'zweitens', 'zum einen', 'zum anderen'] },
  { labelDe: 'Gegenüberstellen',  words: ['einerseits', 'andererseits', 'dagegen', 'im Gegensatz dazu', 'trotzdem'] },
  { labelDe: 'Belegen',           words: ['zum Beispiel', 'nämlich', 'denn', 'deshalb', 'dadurch'] },
  { labelDe: 'Abschließen',       words: ['zusammenfassend', 'insgesamt', 'abschließend', 'alles in allem'] }
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/data/sprechenVortragsmittel.test.ts`
Expected: PASS, all cases.

If the needle-substring test fails, do **not** change the test. Change the offending `phraseDe` minimally so its first 24 normalised characters stop shadowing another, and note which phrase you changed in your report.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors introduced by this file. Report your task complete with a list of the exports you produced.

---

### Task 2: The 60 Vortragsthemen

**Files:**
- Create: `src/data/sprechenVortragsthemen.ts`
- Test: `tests/data/sprechenVortragsthemen.test.ts`

**Interfaces:**
- Consumes: `TOPIC_TAGS`, `type TopicTag` from `src/data/sprechenTopics.ts` (do **not** modify that file).
- Produces: `type Vortragsthema`, `SPRECHEN_VORTRAGSTHEMEN`, `VORTRAGSTHEMA_GENERATOR_SCHEMA`.

- [ ] **Step 1: Write the failing test**

`tests/data/sprechenVortragsthemen.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SPRECHEN_VORTRAGSTHEMEN, VORTRAGSTHEMA_GENERATOR_SCHEMA } from '../../src/data/sprechenVortragsthemen'
import { TOPIC_TAGS } from '../../src/data/sprechenTopics'

describe('SPRECHEN_VORTRAGSTHEMEN', () => {
  it('ships 60 themes with unique ids and unique titles', () => {
    expect(SPRECHEN_VORTRAGSTHEMEN).toHaveLength(60)
    expect(new Set(SPRECHEN_VORTRAGSTHEMEN.map(t => t.id)).size).toBe(60)
    expect(new Set(SPRECHEN_VORTRAGSTHEMEN.map(t => t.titleDe)).size).toBe(60)
  })

  it('ids are all vt- prefixed and slug-shaped', () => {
    for (const t of SPRECHEN_VORTRAGSTHEMEN) expect(t.id).toMatch(/^vt-[a-z0-9-]+$/)
  })

  it('every theme is a task-sheet instruction, not a thesis', () => {
    for (const t of SPRECHEN_VORTRAGSTHEMEN) {
      expect(t.taskDe.startsWith('Halten Sie einen kurzen Vortrag darüber')).toBe(true)
      expect(t.taskDe.endsWith('.')).toBe(true)
      expect(t.taskDe.length).toBeGreaterThan(60)
      expect(t.taskDe.length).toBeLessThan(220)
      // A Vortragsthema takes no sides — it must not be phrased as a question.
      expect(t.taskDe).not.toContain('?')
    }
  })

  it('titles are short labels', () => {
    for (const t of SPRECHEN_VORTRAGSTHEMEN) {
      expect(t.titleDe.length).toBeGreaterThanOrEqual(3)
      expect(t.titleDe.length).toBeLessThanOrEqual(45)
    }
  })

  it('tags every theme with 1-2 known TopicTags', () => {
    for (const t of SPRECHEN_VORTRAGSTHEMEN) {
      expect(t.tags.length).toBeGreaterThanOrEqual(1)
      expect(t.tags.length).toBeLessThanOrEqual(2)
      for (const tag of t.tags) expect(TOPIC_TAGS).toContain(tag)
    }
  })

  it('uses every one of the ten tag fields at least three times', () => {
    for (const tag of TOPIC_TAGS) {
      const n = SPRECHEN_VORTRAGSTHEMEN.filter(t => t.tags.includes(tag)).length
      expect(n, `tag ${tag}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('marks every seeded theme level B2 and source seed', () => {
    for (const t of SPRECHEN_VORTRAGSTHEMEN) {
      expect(t.level).toBe('B2')
      expect(t.source).toBe('seed')
    }
  })
})

describe('VORTRAGSTHEMA_GENERATOR_SCHEMA', () => {
  it('requires titleDe, taskDe and tags per item', () => {
    const item = (VORTRAGSTHEMA_GENERATOR_SCHEMA as any).properties.themen.items
    expect(item.required).toEqual(['titleDe', 'taskDe', 'tags'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/data/sprechenVortragsthemen.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/data/sprechenVortragsthemen.ts`. Follow the shape and the local-helper convention of `src/data/sprechenTopics.ts` — read that file first.

```ts
//
// Sprechen Teil 1 — the Vortragsthema pool. See CONTEXT.md → "Vortragsthema".
//
// A Vortragsthema is deliberately NOT a [Topic]: it takes no sides and is
// phrased as the exam's own instruction, because Teil 1 is a monologue and
// there is nobody to argue against. Separate pool, separate generator.
// Tags reuse Teil 2's ten fields unchanged so resolveArgumentBank's tag-level
// fallback serves these themes with no new authoring.

import { TOPIC_TAGS, type TopicTag } from './sprechenTopics'

export interface Vortragsthema {
  id: string          // 'vt-ehrenamt' / custom: 'vt-custom-<epoch>-<i>'
  titleDe: string     // short label, unique — the done-theme memory key
  taskDe: string      // the exam's instruction: „Halten Sie einen kurzen Vortrag darüber, …"
  tags: TopicTag[]
  level: 'B2'
  source: 'seed' | 'custom'
}

const V = (id: string, titleDe: string, taskDe: string, tags: TopicTag[]): Vortragsthema =>
  ({ id, titleDe, taskDe, tags, level: 'B2', source: 'seed' })

export const SPRECHEN_VORTRAGSTHEMEN: Vortragsthema[] = [
  // AUTHOR 60 ENTRIES HERE — see the authoring brief below.
]

export const VORTRAGSTHEMA_GENERATOR_SCHEMA = {
  type: 'object',
  properties: {
    themen: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titleDe: { type: 'string' },
          taskDe: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } }
        },
        required: ['titleDe', 'taskDe', 'tags']
      }
    }
  },
  required: ['themen']
}

export { TOPIC_TAGS }
```

**Authoring brief for the 60 entries.** These twelve come from the design prototype and must appear verbatim (ids included):

```ts
  V('vt-ehrenamt', 'Ehrenamtliches Engagement', 'Halten Sie einen kurzen Vortrag darüber, welche Rolle freiwillige Arbeit in einer Gesellschaft spielt.', ['Gesellschaft', 'Arbeit']),
  V('vt-stadt-land', 'Stadt oder Land', 'Halten Sie einen kurzen Vortrag darüber, wo man heute besser lebt — in der Stadt oder auf dem Land.', ['Gesellschaft', 'Umwelt']),
  V('vt-lebenslanges-lernen', 'Lebenslanges Lernen', 'Halten Sie einen kurzen Vortrag darüber, warum Erwachsene weiterlernen — und was sie daran hindert.', ['Bildung', 'Arbeit']),
  V('vt-social-media', 'Soziale Netzwerke im Alltag', 'Halten Sie einen kurzen Vortrag darüber, wie soziale Netzwerke unseren Alltag verändert haben.', ['Medien', 'Technologie']),
  V('vt-gesunde-ernaehrung', 'Gesunde Ernährung', 'Halten Sie einen kurzen Vortrag darüber, wie sich Essgewohnheiten in den letzten Jahrzehnten verändert haben.', ['Gesundheit', 'Konsum']),
  V('vt-homeoffice', 'Arbeiten von zu Hause', 'Halten Sie einen kurzen Vortrag darüber, was das Homeoffice mit der Arbeitswelt gemacht hat.', ['Arbeit', 'Technologie']),
  V('vt-fremdsprachen', 'Fremdsprachen lernen', 'Halten Sie einen kurzen Vortrag darüber, welchen Wert Fremdsprachen heute noch haben.', ['Bildung', 'Reisen']),
  V('vt-nachhaltig-leben', 'Nachhaltig leben', 'Halten Sie einen kurzen Vortrag darüber, was der Einzelne für die Umwelt tun kann — und wo seine Grenzen liegen.', ['Umwelt', 'Konsum']),
  V('vt-familie-heute', 'Familie heute', 'Halten Sie einen kurzen Vortrag darüber, wie sich das Zusammenleben in Familien gewandelt hat.', ['Familie', 'Gesellschaft']),
  V('vt-freizeit-sport', 'Sport in der Freizeit', 'Halten Sie einen kurzen Vortrag darüber, welchen Stellenwert Sport im Alltag der Menschen hat.', ['Gesundheit', 'Gesellschaft']),
  V('vt-oeffentlicher-verkehr', 'Öffentlicher Nahverkehr', 'Halten Sie einen kurzen Vortrag darüber, wie Menschen sich in Ihrer Region fortbewegen.', ['Umwelt', 'Gesellschaft']),
  V('vt-medienkonsum-kinder', 'Kinder und Bildschirme', 'Halten Sie einen kurzen Vortrag darüber, wie viel Bildschirmzeit für Kinder angemessen ist.', ['Familie', 'Medien']),
```

Author **48 more** to reach 60, obeying every rule the test enforces plus these:

- `taskDe` always begins `Halten Sie einen kurzen Vortrag darüber, ` and continues with an indirect question or noun phrase (`wie …`, `warum …`, `welche Rolle …`, `was … bedeutet`, `wovon … abhängt`). Never a direct question, never a yes/no thesis — that is what a Teil 2 [Topic] is, and mixing the two is the single most likely mistake here.
- Everyday, B2-level, opinion-bearing, non-hostile. No party politics, no religion, nothing about a named living person, nothing requiring specialist knowledge.
- Every theme must be fillable from ordinary life for all five Gliederungspunkte — in particular *Eigene Erfahrung* must be plausible for an adult learner.
- Spread across the ten tags: aim for roughly six themes per tag as a primary tag. The test only enforces ≥ 3.
- `id` is `vt-` plus a short slug of the title, ASCII only (`ö→oe`, `ü→ue`, `ä→ae`, `ß→ss`).
- Vary the grammatical shape of the instruction so the pool does not read as a template.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/data/sprechenVortragsthemen.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean. Report the tag distribution you achieved (theme count per tag) in your completion report.

---

### Task 3: Vortrag types and the Teil-1 rubric

**Files:**
- Modify: `src/data/sprechen.ts` (append only — do not touch existing exports)
- Modify: `src/data/rubrics.ts` (append `SPRECHEN_B2_TEIL1`; do not touch `SPRECHEN_B2_TEIL2`)
- Test: `tests/data/rubrics.teil1.test.ts`

**Interfaces:**
- Consumes: `GliederungKey` from `src/data/sprechenVortragsmittel.ts` (Task 1 — a type-only import; write it even though that file lands in parallel).
- Produces, from `src/data/sprechen.ts`: `type VortragStatus`, `type VortragThemaRef`, `type VortragHelps`, `type HelpKind`, `type VortragPlanEntry`, `type RedeRecord`, `type NachfrageRecord`, `type HelpLogEntry`, `interface SprechenVortrag`, `TEIL1_STASH_KEY`, `interface Teil1RunStash`, `PREP_SECONDS`.
- Produces, from `src/data/rubrics.ts`: `SPRECHEN_B2_TEIL1`.

- [ ] **Step 1: Write the failing test**

`tests/data/rubrics.teil1.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SPRECHEN_B2_TEIL1, SPRECHEN_B2_TEIL2, sprechenDescriptor, sprechenNotes, praedikat } from '../../src/data/rubrics'

describe('SPRECHEN_B2_TEIL1', () => {
  it('mirrors Teil 2 structurally so the two scores stay comparable', () => {
    expect(SPRECHEN_B2_TEIL1.totalMax).toBe(SPRECHEN_B2_TEIL2.totalMax)
    expect(SPRECHEN_B2_TEIL1.passingScore).toBe(SPRECHEN_B2_TEIL2.passingScore)
    expect(SPRECHEN_B2_TEIL1.criteria.map(c => c.key)).toEqual(SPRECHEN_B2_TEIL2.criteria.map(c => c.key))
    expect(SPRECHEN_B2_TEIL1.criteria.map(c => c.maxPoints)).toEqual([25, 25, 25, 25])
  })

  it('sums to its own totalMax', () => {
    const sum = SPRECHEN_B2_TEIL1.criteria.reduce((n, c) => n + c.maxPoints, 0)
    expect(sum).toBe(SPRECHEN_B2_TEIL1.totalMax)
  })

  it('renames the first criterion to Gliederung and asks about coverage and the Nachfrage', () => {
    const c = SPRECHEN_B2_TEIL1.criteria[0]
    expect(c.key).toBe('erfuellung')
    expect(c.labelDe).toContain('Gliederung')
    expect(c.descriptorDe).toContain('Gliederungspunkt')
    expect(c.descriptorDe).toContain('Nachfrage')
  })

  it('carries a spoken variant on kohaerenz and on no other criterion', () => {
    const withSpoken = SPRECHEN_B2_TEIL1.criteria.filter(c => c.descriptorSpokenDe !== undefined)
    expect(withSpoken.map(c => c.key)).toEqual(['kohaerenz'])
  })

  it('hedges fluency when typed and drops the hedge when spoken', () => {
    const koh = SPRECHEN_B2_TEIL1.criteria.find(c => c.key === 'kohaerenz')!
    expect(sprechenDescriptor(koh, 'typed')).toContain('schriftliche Form')
    expect(sprechenDescriptor(koh, 'spoken')).not.toContain('schriftliche Form')
    expect(sprechenDescriptor(koh, 'spoken')).toContain('Sprechtempo')
  })

  it('mentions that Aussprache stays excluded, in both modalities', () => {
    expect(sprechenNotes(SPRECHEN_B2_TEIL1, 'typed')).toContain('Aussprache')
    expect(sprechenNotes(SPRECHEN_B2_TEIL1, 'spoken')).toContain('Aussprache')
  })

  it('shares the Prädikat bands with Teil 2', () => {
    expect(praedikat(SPRECHEN_B2_TEIL1.passingScore)).toBe('ausreichend')
    expect(praedikat(SPRECHEN_B2_TEIL1.passingScore - 1)).toBe('nicht bestanden')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/data/rubrics.teil1.test.ts`
Expected: FAIL — `SPRECHEN_B2_TEIL1` is not exported.

- [ ] **Step 3a: Append the Vortrag types to `src/data/sprechen.ts`**

Append at the end of the file. `Modality`, `SpeechSpan` and `sentenceAround` already exist there — reuse, do not redeclare.

```ts
/* ────────────────────────────────────────────────────────────────────────────
   Sprechen Teil 1 — Vortrag. See CONTEXT.md → "Vortrag", "Rede", "Nachfrage".

   A Vortrag is the whole practice unit: one Vortragsthema, one Rede, one
   Nachfrage, one grade, one Run. The Rede is the monologue inside it and is
   composed in ONE take — never point by point (ADR-0014).
   ──────────────────────────────────────────────────────────────────────────── */

export type VortragStatus = 'in_progress' | 'submitted'

export interface VortragThemaRef {
  id: string
  titleDe: string
  taskDe: string
  source: 'seed' | 'custom'
}

/** The four help switches, frozen when the Vortrag starts. */
export interface VortragHelps {
  hints: boolean       // drawer, Move nudge, Rettungsleine, stuck detection
  checklist: boolean   // live Gliederung checklist + Redezeit bar
  kiTipp: boolean      // the one paid live help
  hardLimit: boolean   // spoken only — always false when typed
}

/** What the Hilfe-Protokoll counts. Descriptive only, never scored. */
export type HelpKind = 'drawer' | 'phrase' | 'rettungsleine' | 'nudge' | 'kitipp' | 'vorsprechen'

export interface HelpLogEntry {
  at: number           // ms epoch
  kind: HelpKind
}

/** One line of the Vortragsplan: a keyword against a Gliederungspunkt. */
export interface VortragPlanEntry {
  key: GliederungKey
  keyword: string
}

export interface RedeRecord {
  textDe: string
  seconds?: number     // spoken only — real elapsed
  restarts?: number    // spoken only — long-pause proxy
  spans?: SpeechSpan[] // spoken only
}

export interface NachfrageRecord {
  questionDe: string
  answerDe: string
}

export interface SprechenVortrag {
  id: string                     // crypto.randomUUID()
  thema: VortragThemaRef
  modality: Modality             // fixed at creation
  helps: VortragHelps            // frozen at creation
  plan: VortragPlanEntry[]       // the Vortragsplan — five entries, keywords may be ''
  notes: string
  rede: RedeRecord
  nachfrage?: NachfrageRecord
  kiTippCount: number
  helpLog: HelpLogEntry[]
  status: VortragStatus          // no graded/abandoned states — those rows are deleted
  startedAt: number
  endedAt?: number               // set when submitted
}

export const TEIL1_STASH_KEY = 'gt:lastSprechenTeil1'

/** Setup → prep → runner handoff, sessionStorage. */
export interface Teil1RunStash {
  thema: VortragThemaRef
  modality: Modality
  helps: VortragHelps
  prepSeconds: number
  plan: VortragPlanEntry[]
  notes: string
  model: string
}

export const PREP_SECONDS = [0, 180, 900] as const
```

Add the type-only import at the top of the file, beside the existing imports:

```ts
import type { GliederungKey } from './sprechenVortragsmittel'
```

- [ ] **Step 3b: Append `SPRECHEN_B2_TEIL1` to `src/data/rubrics.ts`**

Place it immediately after `SPRECHEN_B2_TEIL2`. Reuse the existing `SprechenRubric` / `SprechenCriterion` interfaces unchanged.

```ts
/**
 * Teil 1 · Vortrag. Structurally identical to Teil 2 — four criteria à 25,
 * pass at 60, same Prädikat bands — so a Teil 1 and a Teil 2 score sit on one
 * scale. Two things differ: `erfuellung` becomes Erfüllung / Gliederung and
 * asks about the five Gliederungspunkte and the Nachfrage instead of about
 * interaction, and `kohaerenz` carries a spoken variant, because a Rede is
 * ENTIRELY a fluency performance and the typed hedge cannot cover both.
 */
export const SPRECHEN_B2_TEIL1: SprechenRubric = {
  labelDe: 'Goethe-Zertifikat B2 · Sprechen Teil 1 (adaptiert, ohne Aussprache)',
  totalMax: 100,
  passingScore: 60,
  criteria: [
    {
      key: 'erfuellung',
      labelDe: 'Erfüllung / Gliederung',
      labelEn: 'Task fulfilment / structure',
      maxPoints: 25,
      descriptorDe:
        'Werden alle fünf Gliederungspunkte des Aufgabenblatts behandelt — Einstieg, ' +
        'Situation, Vor- und Nachteile, eigene Erfahrung, Meinung und Abschluss? ' +
        'Ist der Vortrag angemessen lang und durchgehend auf das Thema bezogen? ' +
        'Wird eine eigene Position genannt UND begründet? Wird die Nachfrage am Ende ' +
        'inhaltlich beantwortet, statt nur höflich quittiert? Ein ausgelassener oder ' +
        'nur angetippter Gliederungspunkt mindert die Punktzahl in diesem Kriterium.'
    },
    {
      key: 'kohaerenz',
      labelDe: 'Kohärenz & Flüssigkeit',
      labelEn: 'Coherence & flow',
      maxPoints: 25,
      descriptorDe:
        'Ist der Vortrag als Ganzes erkennbar gegliedert (Einstieg, Hauptteil, Schluss)? ' +
        'Werden die Punkte durch Signalwörter verbunden (zunächst, anschließend, ' +
        'einerseits/andererseits, zusammenfassend) statt bloß aneinandergereiht? ' +
        'Für die schriftliche Form angepasst: Flüssigkeit heißt hier ein tragender ' +
        'Aufbau, nicht Sprechtempo.',
      descriptorSpokenDe:
        'Ist der Vortrag als Ganzes erkennbar gegliedert (Einstieg, Hauptteil, Schluss)? ' +
        'Werden die Punkte durch Signalwörter verbunden (zunächst, anschließend, ' +
        'einerseits/andererseits, zusammenfassend) statt bloß aneinandergereiht? ' +
        'Da dies ein gesprochener Vortrag ist, gehört hier auch die Vortragsweise zur ' +
        'Bewertung: Spricht die Person in einem natürlichen Tempo, vier Minuten lang, ' +
        'ohne lähmendes Zögern oder auffällig häufige Pausen? Nutze dafür die ' +
        'mitgelieferten SPRECHDATEN (Redezeit, Wörter pro Minute, Anzahl langer Pausen).'
    },
    {
      key: 'wortschatz',
      labelDe: 'Wortschatz',
      labelEn: 'Vocabulary',
      maxPoints: 25,
      descriptorDe:
        'Ist der Wortschatz für einen B2-Vortrag breit und präzise? Werden ' +
        'themenspezifische Begriffe und feste Wortverbindungen verwendet statt ' +
        'Allgemeinplätze wie „machen" und „gut"? Werden Vortragsmittel ' +
        'variantenreich eingesetzt oder immer dieselben zwei?'
    },
    {
      key: 'strukturen',
      labelDe: 'Strukturen',
      labelEn: 'Structures',
      maxPoints: 25,
      descriptorDe:
        'Wie korrekt und variantenreich sind die grammatischen Strukturen im Monolog ' +
        '(Nebensätze, Passiv, Konjunktiv II, Nominalisierungen, Verbstellung)? ' +
        'Wie häufig und wie schwerwiegend sind Fehler, und beeinträchtigen sie das ' +
        'Verständnis?'
    }
  ],
  notes:
    'Adaptierte Bewertung für getippte Vorträge: Aussprache wird nicht bewertet; ' +
    'vier Kriterien zu je 25 Punkten, Bestehensgrenze 60. Die Redezeit wird hier ' +
    'über den Umfang geschätzt (360 Wörter ≈ 4 Minuten), nicht über eine Uhr. ' +
    'Prädikate wie im Goethe-Zeugnis: 90+ sehr gut, 80+ gut, 70+ befriedigend, ' +
    '60+ ausreichend, darunter nicht bestanden.',
  notesSpokenDe:
    'Adaptierte Bewertung für gesprochene Vorträge: Aussprache wird nicht bewertet; ' +
    'vier Kriterien zu je 25 Punkten, Bestehensgrenze 60. Die Redezeit ist hier ' +
    'gemessen, nicht geschätzt. Prädikate wie im Goethe-Zeugnis: 90+ sehr gut, ' +
    '80+ gut, 70+ befriedigend, 60+ ausreichend, darunter nicht bestanden.'
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/data/rubrics.teil1.test.ts tests/data/rubrics.sprechen.test.ts`
Expected: both PASS — the second proves you left Teil 2 alone.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean once Task 1 has landed. If `GliederungKey` cannot resolve, Task 1 is still in flight — report that rather than inlining a duplicate type.

---

### Task 4: Parameterise the matcher and the yield by phrase bank

**Files:**
- Modify: `src/composables/useRedemittelMatch.ts`
- Modify: `src/composables/useRedemittelYield.ts`
- Test: `tests/composables/useRedemittelMatch.test.ts` (extend), `tests/composables/useRedemittelYield.test.ts` (extend)

**Interfaces:**
- Consumes: `SPRECHEN_VORTRAGSMITTEL` from Task 1 (tests only).
- Produces: `matchRedemittel(texts, bank?)`, `movesUsed(used)`, `pickMoveNudge(texts, lifetime, bank?, moves?)`, `lifetimeCounts(bank?)` — **all with defaults preserving today's behaviour exactly**.

**This is the one task that edits shipped, working code. Every existing test must still pass byte-identically, and no caller may need changing.**

- [ ] **Step 1: Write the failing tests**

Append to `tests/composables/useRedemittelMatch.test.ts`:

```ts
import { SPRECHEN_VORTRAGSMITTEL, VORTRAG_MOVES } from '../../src/data/sprechenVortragsmittel'

describe('bank parameterisation', () => {
  it('defaults to the Teil 2 bank, unchanged', () => {
    const hits = matchRedemittel(['Da stimme ich Ihnen völlig zu, das sehe ich auch so.'])
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every(r => r.id.startsWith('rm-'))).toBe(true)
  })

  it('matches the Vortragsmittel bank when given it', () => {
    const hits = matchRedemittel(
      ['Ich möchte heute über das Thema Ehrenamt sprechen. Vielen Dank für Ihre Aufmerksamkeit.'],
      SPRECHEN_VORTRAGSMITTEL
    )
    const ids = hits.map(h => h.id)
    expect(ids).toContain('vm-einstieg-1')
    expect(ids).toContain('vm-abschluss-5')
  })

  it('never returns a phrase from the other bank', () => {
    const hits = matchRedemittel(
      ['Da stimme ich Ihnen völlig zu. Ich möchte heute über das Thema Sport sprechen.'],
      SPRECHEN_VORTRAGSMITTEL
    )
    expect(hits.every(r => r.id.startsWith('vm-'))).toBe(true)
  })

  it('nudges a Vortrag Move the learner has not used', () => {
    const nudge = pickMoveNudge(
      ['Ich möchte heute über das Thema Sport sprechen.'],
      {},
      SPRECHEN_VORTRAGSMITTEL,
      VORTRAG_MOVES
    )
    expect(nudge).not.toBe('einstieg')
    expect(VORTRAG_MOVES).toContain(nudge as any)
  })

  it('prefers the Vortrag Move with the coldest lifetime count', () => {
    const lifetime: Record<string, number> = {}
    // Make every group warm except 'kontrast'.
    for (const r of SPRECHEN_VORTRAGSMITTEL) if (r.move !== 'kontrast') lifetime[r.id] = 5
    const nudge = pickMoveNudge([''], lifetime, SPRECHEN_VORTRAGSMITTEL, VORTRAG_MOVES)
    expect(nudge).toBe('kontrast')
  })

  it('returns null when every Move of the given bank was used', () => {
    const all = SPRECHEN_VORTRAGSMITTEL.map(r => r.phraseDe).join(' ')
    expect(pickMoveNudge([all], {}, SPRECHEN_VORTRAGSMITTEL, VORTRAG_MOVES)).toBeNull()
  })
})
```

Append to `tests/composables/useRedemittelYield.test.ts`:

```ts
import { SPRECHEN_VORTRAGSMITTEL } from '../../src/data/sprechenVortragsmittel'
import { SPRECHEN_REDEMITTEL } from '../../src/data/sprechenRedemittel'

describe('lifetimeCounts bank filter', () => {
  it('returns every id when no bank is given — today’s behaviour', () => {
    bumpRedemittelYield(['rm-agree-1', 'vm-einstieg-1'], 1000)
    expect(Object.keys(lifetimeCounts()).sort()).toEqual(['rm-agree-1', 'vm-einstieg-1'])
  })

  it('keeps the two banks’ tallies separate when filtered', () => {
    bumpRedemittelYield(['rm-agree-1', 'vm-einstieg-1', 'vm-abschluss-5'], 1000)
    expect(Object.keys(lifetimeCounts(SPRECHEN_REDEMITTEL))).toEqual(['rm-agree-1'])
    expect(Object.keys(lifetimeCounts(SPRECHEN_VORTRAGSMITTEL)).sort())
      .toEqual(['vm-abschluss-5', 'vm-einstieg-1'])
  })

  it('drops ids that belong to no given bank', () => {
    bumpRedemittelYield(['ghost-1'], 1000)
    expect(lifetimeCounts(SPRECHEN_REDEMITTEL)['ghost-1']).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/composables/useRedemittelMatch.test.ts tests/composables/useRedemittelYield.test.ts`
Expected: the new cases FAIL (extra arguments ignored / wrong bank); the pre-existing cases still PASS.

- [ ] **Step 3: Implement the parameterisation**

In `src/composables/useRedemittelMatch.ts`, replace the three affected functions. Keep `redemittelNeedle`, `normalize`, `NEEDLE_MAX`, `TURN_SEP` and `movePerTurn` exactly as they are.

```ts
/** The minimum a phrase bank must provide to be matchable. */
export interface PhraseLike {
  id: string
  move: string
  phraseDe: string
}

/**
 * Which phrases of `bank` the learner's own words actually contained.
 * Generic over the bank so the Vortragsmittel bank works without widening
 * Teil 2's return type: with the default, `T` infers as `Redemittel`.
 */
export function matchRedemittel<T extends PhraseLike>(
  learnerTexts: readonly string[],
  bank: readonly T[] = SPRECHEN_REDEMITTEL as unknown as readonly T[]
): T[] {
  const hay = learnerTexts.map(normalize).join(TURN_SEP)
  if (hay.length === 0) return []
  return bank.filter(r => hay.includes(redemittelNeedle(r.phraseDe)))
}

export function movesUsed<M extends string>(
  used: readonly { move: M }[]
): Partial<Record<M, number>> {
  const counts: Partial<Record<M, number>> = {}
  for (const r of used) counts[r.move] = (counts[r.move] ?? 0) + 1
  return counts
}

/**
 * The Move nudge (CONTEXT.md → "Move nudge"): a Move not used in THIS run,
 * preferring the one the learner's LIFETIME yield shows they reach for least.
 * Generic over the Move type, so Teil 2 callers keep `Move | null` and Teil 1
 * gets `VortragMove | null`.
 */
export function pickMoveNudge<M extends string>(
  learnerTexts: readonly string[],
  lifetime: Readonly<Record<string, number>>,
  bank: readonly (PhraseLike & { move: M })[] =
    SPRECHEN_REDEMITTEL as unknown as readonly (PhraseLike & { move: M })[],
  moves: readonly M[] = HINT_MOVES as unknown as readonly M[]
): M | null {
  const usedThisRun = movesUsed(matchRedemittel(learnerTexts, bank))
  const candidates = moves.filter(m => (usedThisRun[m] ?? 0) === 0)
  if (candidates.length === 0) return null

  const lifetimeFor = (m: M): number =>
    bank.filter(r => r.move === m).reduce((sum, r) => sum + (lifetime[r.id] ?? 0), 0)

  // `moves` order is the tie-break, so a strict `<` keeps the first-listed
  // candidate when totals are equal.
  let best = candidates[0]
  let bestN = lifetimeFor(best)
  for (const m of candidates.slice(1)) {
    const n = lifetimeFor(m)
    if (n < bestN) { best = m; bestN = n }
  }
  return best
}
```

In `src/composables/useRedemittelYield.ts`, replace `lifetimeCounts` only:

```ts
/**
 * Lifetime counts, optionally narrowed to one phrase bank.
 *
 * The store is shared because phrase ids are globally unique (`rm-*` vs
 * `vm-*`), but the two banks' Move sets are disjoint, so any figure the learner
 * SEES must be per bank (CONTEXT.md → "Redemittel yield"). Omitting `bank`
 * returns everything, which is what every pre-Teil-1 caller wants.
 */
export function lifetimeCounts(
  bank?: readonly { id: string }[]
): Record<string, number> {
  const store = loadRedemittelYield()
  const allow = bank ? new Set(bank.map(r => r.id)) : null
  const out: Record<string, number> = {}
  for (const [id, use] of Object.entries(store)) {
    if (allow && !allow.has(id)) continue
    out[id] = use.count
  }
  return out
}
```

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS. Every pre-existing sprechen test must still pass — that is the point of the defaults. If `Teil2Runner.vue`, `Teil2Result.vue`, `SprechenHome.vue` or `SprechenCheatsheet.vue` now fail to typecheck, your generics are wrong: fix the signature, **do not edit those files** (another wave owns them).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean. Report whether any call site required a change (the answer must be no).

---

### Task 5: Dexie v11 and the Vortrag lifecycle

**Files:**
- Modify: `src/db/index.ts`
- Create: `src/composables/useVortrag.ts`
- Test: `tests/db/sprechenVortraege.test.ts`, `tests/composables/useVortrag.test.ts`

**Interfaces:**
- Consumes: `SprechenVortrag`, `VortragThemaRef`, `VortragHelps`, `VortragPlanEntry`, `HelpKind`, `Modality` from `src/data/sprechen.ts` (Task 3).
- Produces: `createVortrag`, `findActiveVortrag`, `saveRede`, `saveNachfrage`, `markVortragSubmitted`, `incrementVortragKiTipp`, `logHelp`, `abandonVortrag`, `deleteVortrag`.

- [ ] **Step 1: Write the failing tests**

`tests/db/sprechenVortraege.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { db } from '../../src/db'
import type { SprechenVortrag } from '../../src/data/sprechen'

function row(id: string): SprechenVortrag {
  return {
    id,
    thema: { id: 'vt-ehrenamt', titleDe: 'Ehrenamtliches Engagement', taskDe: 'Halten Sie einen kurzen Vortrag darüber, welche Rolle freiwillige Arbeit in einer Gesellschaft spielt.', source: 'seed' },
    modality: 'typed',
    helps: { hints: true, checklist: true, kiTipp: false, hardLimit: false },
    plan: [{ key: 'einstieg', keyword: 'Sportvereine' }],
    notes: '',
    rede: { textDe: '' },
    kiTippCount: 0,
    helpLog: [],
    status: 'in_progress',
    startedAt: Date.now()
  }
}

describe('sprechenVortraege table (db version 11)', () => {
  it('stores and retrieves a Vortrag row by id', async () => {
    await db.sprechenVortraege.put(row('v-test-1'))
    const got = await db.sprechenVortraege.get('v-test-1')
    expect(got?.thema.titleDe).toBe('Ehrenamtliches Engagement')
    expect(got?.status).toBe('in_progress')
    await db.sprechenVortraege.delete('v-test-1')
  })

  it('indexes status and startedAt', async () => {
    await db.sprechenVortraege.put(row('v-test-2'))
    const byStatus = await db.sprechenVortraege.where('status').equals('in_progress').toArray()
    expect(byStatus.map(r => r.id)).toContain('v-test-2')
    await db.sprechenVortraege.delete('v-test-2')
  })

  it('leaves the Teil 2 tables intact', async () => {
    expect(db.sprechenDiscussions).toBeDefined()
    expect(db.sprechenCorrections).toBeDefined()
    expect(db.sprechenCorrectionEvents).toBeDefined()
    expect(db.sprechenArgumentBanks).toBeDefined()
  })
})
```

`tests/composables/useVortrag.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { db } from '../../src/db'
import {
  createVortrag, findActiveVortrag, saveRede, saveNachfrage, markVortragSubmitted,
  incrementVortragKiTipp, logHelp, abandonVortrag, deleteVortrag
} from '../../src/composables/useVortrag'
import type { VortragHelps, VortragThemaRef } from '../../src/data/sprechen'

const thema: VortragThemaRef = {
  id: 'vt-homeoffice', titleDe: 'Arbeiten von zu Hause',
  taskDe: 'Halten Sie einen kurzen Vortrag darüber, was das Homeoffice mit der Arbeitswelt gemacht hat.',
  source: 'seed'
}
const helps: VortragHelps = { hints: true, checklist: true, kiTipp: true, hardLimit: false }

beforeEach(async () => { await db.sprechenVortraege.clear() })

describe('the Vortrag lifecycle', () => {
  it('creates an in_progress row with the plan and helps frozen', async () => {
    const v = await createVortrag(thema, 'spoken', helps, [{ key: 'fazit', keyword: 'Freistellung' }], 'Notizen')
    expect(v.status).toBe('in_progress')
    expect(v.modality).toBe('spoken')
    expect(v.helps).toEqual(helps)
    expect(v.plan[0].keyword).toBe('Freistellung')
    expect(v.notes).toBe('Notizen')
    expect(v.rede.textDe).toBe('')
    expect(v.kiTippCount).toBe(0)
    expect(v.helpLog).toEqual([])
    expect(await db.sprechenVortraege.get(v.id)).not.toBeUndefined()
  })

  it('finds the most recent active Vortrag, filtered by modality', async () => {
    const typed = await createVortrag(thema, 'typed', helps, [], '')
    await new Promise(r => setTimeout(r, 2))
    const spoken = await createVortrag(thema, 'spoken', helps, [], '')
    expect((await findActiveVortrag())?.id).toBe(spoken.id)
    expect((await findActiveVortrag('typed'))?.id).toBe(typed.id)
  })

  it('returns null when there is nothing active', async () => {
    expect(await findActiveVortrag()).toBeNull()
  })

  it('saves the Rede with its spoken evidence', async () => {
    const v = await createVortrag(thema, 'spoken', helps, [], '')
    await saveRede(v.id, { textDe: 'Ich möchte heute über …', seconds: 231, restarts: 3, spans: [{ text: 'Ich', confidence: 0.9 }] })
    const got = await db.sprechenVortraege.get(v.id)
    expect(got?.rede.textDe).toBe('Ich möchte heute über …')
    expect(got?.rede.seconds).toBe(231)
    expect(got?.rede.restarts).toBe(3)
  })

  it('saves the Nachfrage exchange', async () => {
    const v = await createVortrag(thema, 'typed', helps, [], '')
    await saveNachfrage(v.id, { questionDe: 'Wer soll das bezahlen?', answerDe: 'Beide, denke ich.' })
    expect((await db.sprechenVortraege.get(v.id))?.nachfrage?.answerDe).toBe('Beide, denke ich.')
  })

  it('marks submitted with an endedAt', async () => {
    const v = await createVortrag(thema, 'typed', helps, [], '')
    await markVortragSubmitted(v.id)
    const got = await db.sprechenVortraege.get(v.id)
    expect(got?.status).toBe('submitted')
    expect(got?.endedAt).toBeGreaterThan(0)
  })

  it('counts KI-Tipps', async () => {
    const v = await createVortrag(thema, 'typed', helps, [], '')
    await incrementVortragKiTipp(v.id)
    await incrementVortragKiTipp(v.id)
    expect((await db.sprechenVortraege.get(v.id))?.kiTippCount).toBe(2)
  })

  it('appends to the Hilfe-Protokoll without losing earlier entries', async () => {
    const v = await createVortrag(thema, 'typed', helps, [], '')
    await logHelp(v.id, 'drawer', 1000)
    await logHelp(v.id, 'rettungsleine', 2000)
    const got = await db.sprechenVortraege.get(v.id)
    expect(got?.helpLog).toEqual([
      { at: 1000, kind: 'drawer' },
      { at: 2000, kind: 'rettungsleine' }
    ])
  })

  it('never lets a help-log write break the run', async () => {
    await expect(logHelp('does-not-exist', 'drawer', 1)).resolves.toBeUndefined()
  })

  it('abandon and post-grade delete both remove the row', async () => {
    const a = await createVortrag(thema, 'typed', helps, [], '')
    await abandonVortrag(a.id)
    expect(await db.sprechenVortraege.get(a.id)).toBeUndefined()
    const b = await createVortrag(thema, 'typed', helps, [], '')
    await deleteVortrag(b.id)
    expect(await db.sprechenVortraege.get(b.id)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/db/sprechenVortraege.test.ts tests/composables/useVortrag.test.ts`
Expected: FAIL — `db.sprechenVortraege` undefined, module not found.

- [ ] **Step 3a: Add the table at version 11**

In `src/db/index.ts`: add the type import beside the existing ones, add the field beside the other tables, and append a `version(11)` block after `version(10)`. Copy every table string from version 10 unchanged and add one line. **No `.upgrade()` hook** — this is a pure additive table.

```ts
import type { SprechenDiscussion, SprechenVortrag } from '../data/sprechen'
```

```ts
  sprechenDiscussions!: Table<SprechenDiscussion, string>
  /** Teil 1 working state — one in-flight Vortrag at a time (see useVortrag.ts). */
  sprechenVortraege!: Table<SprechenVortrag, string>
```

```ts
    this.version(11).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt',
      sprechenDiscussions: '&id, status, startedAt',
      sprechenCorrections: '&id, kind, createdAt, topicTitle',
      sprechenCorrectionEvents: '&id, correctionId, at',
      sprechenArgumentBanks: 'topicId',
      // Teil 1 working state. Purely additive — no upgrade hook, because no
      // existing row gains a required field.
      sprechenVortraege: '&id, status, startedAt'
    })
```

- [ ] **Step 3b: Write `src/composables/useVortrag.ts`**

Mirror `useSprechenDiscussion.ts` — read it first. Same transaction discipline, same delete-don't-flag posture.

```ts
//
// Sprechen Teil 1 — the Vortrag row's lifecycle. See CONTEXT.md → "Vortrag".
//
// Ephemeral working state, exactly like a Discussion: it exists so a
// four-minute Rede survives a dead tab and a failed grade stays retryable.
// `in_progress` → `submitted` → the row is DELETED once the Run is recorded.
// There is no `graded` and no `abandoned` status — those rows do not exist.

import { db } from '../db'
import type {
  HelpKind, Modality, NachfrageRecord, RedeRecord, SprechenVortrag,
  VortragHelps, VortragPlanEntry, VortragThemaRef
} from '../data/sprechen'

export async function createVortrag(
  thema: VortragThemaRef,
  modality: Modality,
  helps: VortragHelps,
  plan: VortragPlanEntry[],
  notes = ''
): Promise<SprechenVortrag> {
  const row: SprechenVortrag = {
    id: crypto.randomUUID(),
    thema,
    modality,
    // A hard limit models an examiner interrupting, which only exists in real
    // time — defence in depth against a stale typed stash carrying it true.
    helps: { ...helps, hardLimit: modality === 'spoken' && helps.hardLimit },
    plan,
    notes,
    rede: { textDe: '' },
    kiTippCount: 0,
    helpLog: [],
    status: 'in_progress',
    startedAt: Date.now()
  }
  await db.sprechenVortraege.put(row)
  return row
}

/**
 * Active = in_progress OR submitted-but-not-graded. Most recent wins.
 * `modality`, when given, restricts the search: a spoken Rede must never be
 * offered as a resumable typed one — the input surfaces are not interchangeable
 * mid-run.
 */
export async function findActiveVortrag(modality?: Modality): Promise<SprechenVortrag | null> {
  const all = await db.sprechenVortraege.toArray()
  const candidates = modality ? all.filter(v => v.modality === modality) : all
  return candidates.sort((a, b) => b.startedAt - a.startedAt)[0] ?? null
}

export async function saveRede(id: string, rede: RedeRecord): Promise<void> {
  await db.sprechenVortraege.update(id, { rede })
}

export async function saveNachfrage(id: string, nachfrage: NachfrageRecord): Promise<void> {
  await db.sprechenVortraege.update(id, { nachfrage })
}

export async function markVortragSubmitted(id: string): Promise<void> {
  await db.sprechenVortraege.update(id, { status: 'submitted' as const, endedAt: Date.now() })
}

export async function incrementVortragKiTipp(id: string): Promise<void> {
  await db.transaction('rw', db.sprechenVortraege, async () => {
    const row = await db.sprechenVortraege.get(id)
    if (!row) throw new Error(`Vortrag ${id} not found`)
    await db.sprechenVortraege.update(id, { kiTippCount: row.kiTippCount + 1 })
  })
}

/**
 * Append one Hilfe-Protokoll entry. Deliberately non-fatal: the protocol is
 * descriptive, and a failed write must never interrupt a Rede in progress.
 */
export async function logHelp(id: string, kind: HelpKind, at = Date.now()): Promise<void> {
  try {
    await db.transaction('rw', db.sprechenVortraege, async () => {
      const row = await db.sprechenVortraege.get(id)
      if (!row) return
      await db.sprechenVortraege.update(id, { helpLog: [...row.helpLog, { at, kind }] })
    })
  } catch {
    // Descriptive telemetry only — swallowed on purpose.
  }
}

/** Abandon = the learner walked away. The row is deleted, nothing recorded. */
export async function abandonVortrag(id: string): Promise<void> {
  await db.sprechenVortraege.delete(id)
}

/** Post-grading cleanup — called only AFTER saveQuizRun succeeded. */
export async function deleteVortrag(id: string): Promise<void> {
  await db.sprechenVortraege.delete(id)
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/db tests/composables/useVortrag.test.ts`
Expected: PASS, including the existing `sprechenDiscussions` and `sprechenArchive` db tests.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean.

---

### Task 6: Coverage and the Redezeit timer

**Files:**
- Create: `src/composables/useVortragCoverage.ts`
- Create: `src/composables/useVortragTimer.ts`
- Test: `tests/composables/useVortragCoverage.test.ts`, `tests/composables/useVortragTimer.test.ts`

**Interfaces:**
- Consumes: `GLIEDERUNGSPUNKTE`, `GliederungKey`, `PUNKT_MOVES`, `VortragMove`, `VORTRAG_TARGET_WORDS`, `vortragClock` (Task 1); `VortragPlanEntry`, `Modality` (Task 3); `countWords` from `src/composables/useSpeechRecognizer.ts`.
- Produces: `type PunktSignal`, `planSignals()`, `furthestReachedPunkt()`, `outlinedMoves()`, `emptyPlan()`; `type RedezeitBand`, `type RedezeitState`, `redezeit()`, `hardLimitReached()`.

- [ ] **Step 1: Write the failing tests**

`tests/composables/useVortragCoverage.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  planSignals, furthestReachedPunkt, outlinedMoves, emptyPlan
} from '../../src/composables/useVortragCoverage'
import { GLIEDERUNGSPUNKTE } from '../../src/data/sprechenVortragsmittel'
import type { VortragPlanEntry } from '../../src/data/sprechen'

const plan: VortragPlanEntry[] = [
  { key: 'einstieg', keyword: 'Sportvereine' },
  { key: 'situation', keyword: 'ein Drittel' },
  { key: 'aspekte', keyword: 'Freistellung' },
  { key: 'erfahrung', keyword: '' },
  { key: 'fazit', keyword: 'Unterstützung' }
]

describe('emptyPlan', () => {
  it('is one blank entry per Gliederungspunkt, in order', () => {
    expect(emptyPlan().map(p => p.key)).toEqual(GLIEDERUNGSPUNKTE.map(p => p.key))
    expect(emptyPlan().every(p => p.keyword === '')).toBe(true)
  })
})

describe('planSignals', () => {
  it('lights exactly the points whose own keyword was said', () => {
    const rede = 'In meiner Stadt tragen Sportvereine alles. Später kam die Freistellung dazu.'
    const said = planSignals(plan, rede).filter(s => s.said).map(s => s.key)
    expect(said).toEqual(['einstieg', 'aspekte'])
  })

  it('matches an inflected form of the planned keyword', () => {
    const said = planSignals(plan, 'Über Freistellungen wird viel geredet.').filter(s => s.said)
    expect(said.map(s => s.key)).toEqual(['aspekte'])
  })

  it('is case- and punctuation-insensitive', () => {
    const said = planSignals(plan, 'FREISTELLUNG, ja!').filter(s => s.said)
    expect(said.map(s => s.key)).toEqual(['aspekte'])
  })

  it('never lights a point whose keyword is empty', () => {
    const signals = planSignals(plan, 'Alles und jedes Wort der Welt.')
    expect(signals.find(s => s.key === 'erfahrung')!.said).toBe(false)
    expect(signals.find(s => s.key === 'erfahrung')!.keyword).toBe('')
  })

  it('returns one signal per Gliederungspunkt even for a short plan', () => {
    const signals = planSignals([{ key: 'fazit', keyword: 'Ende' }], 'Ende.')
    expect(signals).toHaveLength(GLIEDERUNGSPUNKTE.length)
    expect(signals.find(s => s.key === 'fazit')!.said).toBe(true)
  })

  it('does not light anything for an empty Rede', () => {
    expect(planSignals(plan, '').every(s => !s.said)).toBe(true)
  })
})

describe('furthestReachedPunkt', () => {
  it('is the last plan-ordered point whose keyword was said', () => {
    const signals = planSignals(plan, 'Sportvereine … Freistellung …')
    expect(furthestReachedPunkt(signals)).toBe('aspekte')
  })

  it('is null when nothing has been said', () => {
    expect(furthestReachedPunkt(planSignals(plan, ''))).toBeNull()
  })

  it('ignores order of appearance and follows the plan order', () => {
    const signals = planSignals(plan, 'Unterstützung zuerst, dann Sportvereine.')
    expect(furthestReachedPunkt(signals)).toBe('fazit')
  })
})

describe('outlinedMoves', () => {
  it('outlines the first point’s Moves before anything is said', () => {
    expect(outlinedMoves(null)).toEqual(['einstieg', 'gliederung'])
  })

  it('outlines the furthest reached point’s Moves', () => {
    expect(outlinedMoves('aspekte')).toEqual(['kontrast', 'aspekt'])
  })
})
```

`tests/composables/useVortragTimer.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { redezeit, hardLimitReached } from '../../src/composables/useVortragTimer'

describe('redezeit', () => {
  it('measures a typed Rede in words against 360', () => {
    const s = redezeit({ words: 180, modality: 'typed' })
    expect(s.words).toBe(180)
    expect(s.pct).toBeCloseTo(0.5, 5)
    expect(s.band).toBe('under')
    expect(s.clock).toBe('2:00')
  })

  it('measures a spoken Rede on the clock against 4:00', () => {
    const s = redezeit({ words: 180, seconds: 228, modality: 'spoken' })
    expect(s.seconds).toBe(228)
    expect(s.pct).toBeCloseTo(228 / 240, 5)
    expect(s.band).toBe('ok')
  })

  it('enters the band at 88% and leaves it past 110%', () => {
    expect(redezeit({ words: 316, modality: 'typed' }).band).toBe('ok')       // 87.8% → just under
    expect(redezeit({ words: 317, modality: 'typed' }).band).toBe('ok')
    expect(redezeit({ words: 315, modality: 'typed' }).band).toBe('under')    // 87.5%
    expect(redezeit({ words: 396, modality: 'typed' }).band).toBe('ok')       // 110.0%
    expect(redezeit({ words: 400, modality: 'typed' }).band).toBe('over')     // 111.1%
  })

  it('falls back to the word proxy when a spoken run has no clock yet', () => {
    const s = redezeit({ words: 90, modality: 'spoken' })
    expect(s.pct).toBeCloseTo(0.25, 5)
  })

  it('never returns a negative or NaN pct', () => {
    expect(redezeit({ words: 0, modality: 'typed' }).pct).toBe(0)
    expect(redezeit({ words: 0, seconds: 0, modality: 'spoken' }).pct).toBe(0)
  })
})

describe('hardLimitReached', () => {
  it('is false unless the switch is on', () => {
    expect(hardLimitReached({ seconds: 999, modality: 'spoken', hardLimit: false })).toBe(false)
  })

  it('fires at 4:00 in a spoken Rede', () => {
    expect(hardLimitReached({ seconds: 239, modality: 'spoken', hardLimit: true })).toBe(false)
    expect(hardLimitReached({ seconds: 240, modality: 'spoken', hardLimit: true })).toBe(true)
  })

  it('never fires in a typed Rede — the switch does not exist there', () => {
    expect(hardLimitReached({ seconds: 9999, modality: 'typed', hardLimit: true })).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/composables/useVortragCoverage.test.ts tests/composables/useVortragTimer.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3a: Write `src/composables/useVortragCoverage.ts`**

```ts
//
// Sprechen Teil 1 — the live Gliederung checklist. See ADR-0014.
//
// ONE dot per Gliederungspunkt, lit by the learner's OWN Vortragsplan keyword.
// That signal is unambiguous by construction: the learner assigned each keyword
// to exactly one point.
//
// PUNKT_MOVES deliberately does NOT drive this. `situation` and `erfahrung` map
// to the identical Move pair, `aspekt` serves three points and `kontrast` two,
// so a phrase match can only identify points 1 and 5 — and attributing the rest
// sequentially would invent precision we do not have. PUNKT_MOVES' only job is
// `outlinedMoves` below.

import {
  GLIEDERUNGSPUNKTE, PUNKT_MOVES, type GliederungKey, type VortragMove
} from '../data/sprechenVortragsmittel'
import type { VortragPlanEntry } from '../data/sprechen'

export interface PunktSignal {
  key: GliederungKey
  labelDe: string
  n: number
  keyword: string
  said: boolean
}

/** Same normalisation as the Redemittel matcher, so both agree on what "said" is. */
function normalize(s: string): string {
  return s.replace(/[.,;:!?…]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

export function emptyPlan(): VortragPlanEntry[] {
  return GLIEDERUNGSPUNKTE.map(p => ({ key: p.key, keyword: '' }))
}

/**
 * One signal per Gliederungspunkt, in plan order, whatever the plan contains.
 * A missing or empty keyword yields `said: false` and an empty `keyword` — the
 * rail renders a dash for it and never a false dot.
 *
 * Matching is a normalised substring test, so a planned "Freistellung" also
 * matches "Freistellungen". A keyword the speech recognizer splits
 * ("Schwimm Verein") will not match; that is the documented, accepted cost,
 * on the same terms as mishearings in the archive (ADR-0012).
 */
export function planSignals(plan: readonly VortragPlanEntry[], redeText: string): PunktSignal[] {
  const hay = normalize(redeText)
  const byKey = new Map(plan.map(p => [p.key, p.keyword ?? '']))
  return GLIEDERUNGSPUNKTE.map(p => {
    const keyword = (byKey.get(p.key) ?? '').trim()
    const needle = normalize(keyword)
    return {
      key: p.key,
      labelDe: p.labelDe,
      n: p.n,
      keyword,
      said: needle.length > 0 && hay.length > 0 && hay.includes(needle)
    }
  })
}

/** The last plan-ordered point whose own keyword has been said. */
export function furthestReachedPunkt(signals: readonly PunktSignal[]): GliederungKey | null {
  let out: GliederungKey | null = null
  for (const s of signals) if (s.said) out = s.key
  return out
}

/** Which drawer Move groups to outline — the furthest reached point's, or point 1's. */
export function outlinedMoves(furthest: GliederungKey | null): VortragMove[] {
  return PUNKT_MOVES[furthest ?? GLIEDERUNGSPUNKTE[0].key]
}
```

- [ ] **Step 3b: Write `src/composables/useVortragTimer.ts`**

```ts
//
// Sprechen Teil 1 — Redezeit. See CONTEXT.md → "Rede".
//
// Two Modalities, two measurements, and the spec says plainly that they are not
// the same thing: a spoken Rede is measured on the clock because there IS a
// clock; a typed Rede is measured in words because that is all there is. The
// 90 wpm figure that relates them is a display convention.

import { VORTRAG_TARGET_WORDS, vortragClock } from '../data/sprechenVortragsmittel'
import type { Modality } from '../data/sprechen'

export const VORTRAG_TARGET_SECONDS = 240

export type RedezeitBand = 'under' | 'ok' | 'over'

export interface RedezeitState {
  words: number
  seconds: number | null
  pct: number          // 0..n, 1.0 = on target
  band: RedezeitBand
  clock: string        // m:ss — measured when spoken, estimated when typed
}

const BAND_IN = 0.88
const BAND_OUT = 1.10

export function redezeit(input: {
  words: number
  seconds?: number
  modality: Modality
}): RedezeitState {
  const words = Math.max(0, Math.round(input.words))
  const seconds = input.modality === 'spoken' && typeof input.seconds === 'number'
    ? Math.max(0, Math.round(input.seconds))
    : null

  const raw = seconds !== null
    ? seconds / VORTRAG_TARGET_SECONDS
    : words / VORTRAG_TARGET_WORDS
  const pct = Number.isFinite(raw) ? Math.max(0, raw) : 0

  const band: RedezeitBand = pct < BAND_IN ? 'under' : pct <= BAND_OUT ? 'ok' : 'over'

  const clock = seconds !== null
    ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    : vortragClock(words)

  return { words, seconds, pct, band, clock }
}

/**
 * The hard limit models an examiner interrupting, which only happens in real
 * time. It therefore exists in the spoken Modality ONLY — a word cap on a typed
 * Rede has no exam analogue and would punish thoroughness.
 */
export function hardLimitReached(input: {
  seconds: number
  modality: Modality
  hardLimit: boolean
}): boolean {
  if (!input.hardLimit) return false
  if (input.modality !== 'spoken') return false
  return input.seconds >= VORTRAG_TARGET_SECONDS
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/composables/useVortragCoverage.test.ts tests/composables/useVortragTimer.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean.

---

### Task 7: The Vortragsthema pool, the A/B draw and generation

**Files:**
- Create: `src/composables/useVortragsthemen.ts`
- Test: `tests/composables/useVortragsthemen.test.ts`

**Interfaces:**
- Consumes: `SPRECHEN_VORTRAGSTHEMEN`, `VORTRAGSTHEMA_GENERATOR_SCHEMA`, `type Vortragsthema` (Task 2); `loadHistory` from `src/composables/useQuizHistory.ts`; `TOPIC_TAGS` from `src/data/sprechenTopics.ts`.
- Produces: `CUSTOM_VORTRAGSTHEMEN_KEY`, `THEMEN_PER_GENERATION`, `loadCustomThemen`, `addCustomThemen`, `deleteCustomThema`, `allThemen`, `doneThemaTitles`, `drawThemaPair`, `validateGeneratedThema`, `buildThemaGeneratorPrompt`, `generateThemen`, `type GeminiClient`.

Read `src/composables/useSprechenTopics.ts` in full first; this is its Teil-1 twin and must follow it structurally — same validation posture, same `fakeClient` testability, same retry shape.

- [ ] **Step 1: Write the failing test**

`tests/composables/useVortragsthemen.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  CUSTOM_VORTRAGSTHEMEN_KEY, THEMEN_PER_GENERATION, loadCustomThemen, addCustomThemen,
  deleteCustomThema, allThemen, doneThemaTitles, drawThemaPair, validateGeneratedThema,
  buildThemaGeneratorPrompt, generateThemen
} from '../../src/composables/useVortragsthemen'
import { SPRECHEN_VORTRAGSTHEMEN } from '../../src/data/sprechenVortragsthemen'
import { saveQuizRun } from '../../src/composables/useQuizHistory'

function fakeClient(responses: string[]) {
  let i = 0
  const calls: string[] = []
  return {
    client: {
      models: {
        generateContent: async (opts: { contents: string }) => {
          calls.push(opts.contents)
          return { text: responses[Math.min(i++, responses.length - 1)] }
        }
      }
    },
    calls
  }
}

beforeEach(() => {
  localStorage.removeItem(CUSTOM_VORTRAGSTHEMEN_KEY)
  localStorage.removeItem('gt:quizHistory')
})

describe('the custom pool', () => {
  it('is empty and forgiving when absent or corrupt', () => {
    expect(loadCustomThemen()).toEqual([])
    localStorage.setItem(CUSTOM_VORTRAGSTHEMEN_KEY, 'not json')
    expect(loadCustomThemen()).toEqual([])
  })

  it('adds, lists and deletes', () => {
    addCustomThemen([{ id: 'vt-custom-1', titleDe: 'Testthema', taskDe: 'Halten Sie einen kurzen Vortrag darüber, wie man testet.', tags: ['Bildung'], level: 'B2', source: 'custom' }])
    expect(loadCustomThemen()).toHaveLength(1)
    expect(allThemen()).toHaveLength(SPRECHEN_VORTRAGSTHEMEN.length + 1)
    deleteCustomThema('vt-custom-1')
    expect(loadCustomThemen()).toEqual([])
  })

  it('forces level and source on load', () => {
    localStorage.setItem(CUSTOM_VORTRAGSTHEMEN_KEY, JSON.stringify([
      { id: 'vt-custom-2', titleDe: 'X', taskDe: 'Halten Sie einen kurzen Vortrag darüber, was X ist.', tags: ['Medien'], level: 'C1', source: 'seed' }
    ]))
    const [t] = loadCustomThemen()
    expect(t.level).toBe('B2')
    expect(t.source).toBe('custom')
  })
})

describe('doneThemaTitles', () => {
  it('reads Teil 1 Runs only', () => {
    saveQuizRun({ type: 'sprechen-teil1', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 1, count: 1, correct: 1, meta: { topicTitle: 'Ehrenamtliches Engagement' } })
    saveQuizRun({ type: 'sprechen-teil2', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 1, count: 1, correct: 1, meta: { topicTitle: 'Autofreie Innenstädte' } })
    const done = doneThemaTitles()
    expect(done.has('Ehrenamtliches Engagement')).toBe(true)
    expect(done.has('Autofreie Innenstädte')).toBe(false)
  })
})

describe('drawThemaPair', () => {
  it('draws two distinct themes', () => {
    const [a, b] = drawThemaPair(() => 0)
    expect(a.id).not.toBe(b.id)
  })

  it('prefers themes with no graded Vortrag', () => {
    for (const t of SPRECHEN_VORTRAGSTHEMEN.slice(0, SPRECHEN_VORTRAGSTHEMEN.length - 2)) {
      saveQuizRun({ type: 'sprechen-teil1', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 1, count: 1, correct: 1, meta: { topicTitle: t.titleDe } })
    }
    const undone = SPRECHEN_VORTRAGSTHEMEN.slice(-2).map(t => t.id)
    const [a, b] = drawThemaPair(() => 0)
    expect(undone).toContain(a.id)
    expect(undone).toContain(b.id)
  })

  it('falls back to the whole pool when everything is done', () => {
    for (const t of SPRECHEN_VORTRAGSTHEMEN) {
      saveQuizRun({ type: 'sprechen-teil1', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 1, count: 1, correct: 1, meta: { topicTitle: t.titleDe } })
    }
    const [a, b] = drawThemaPair(() => 0.5)
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    expect(a.id).not.toBe(b.id)
  })
})

describe('validateGeneratedThema', () => {
  const ok = { titleDe: 'Ehrenamt im Dorf', taskDe: 'Halten Sie einen kurzen Vortrag darüber, wie Vereine ein Dorf zusammenhalten.', tags: ['Gesellschaft'] }

  it('accepts a well-formed theme', () => {
    expect(validateGeneratedThema(ok)).not.toBeNull()
  })

  it('rejects a thesis-shaped task', () => {
    expect(validateGeneratedThema({ ...ok, taskDe: 'Sollten Vereine mehr Geld bekommen?' })).toBeNull()
  })

  it('rejects a task that is not the exam instruction', () => {
    expect(validateGeneratedThema({ ...ok, taskDe: 'Sprechen Sie über Vereine im Dorf und deren Rolle heute.' })).toBeNull()
  })

  it('rejects empty, over-long and unknown-tag input', () => {
    expect(validateGeneratedThema({ ...ok, titleDe: '' })).toBeNull()
    expect(validateGeneratedThema({ ...ok, titleDe: 'x'.repeat(60) })).toBeNull()
    expect(validateGeneratedThema({ ...ok, tags: ['Sport'] })).toBeNull()
    expect(validateGeneratedThema(null)).toBeNull()
  })

  it('keeps only known tags when some are unknown', () => {
    const v = validateGeneratedThema({ ...ok, tags: ['Gesellschaft', 'Sport'] })
    expect(v?.tags).toEqual(['Gesellschaft'])
  })
})

describe('buildThemaGeneratorPrompt', () => {
  it('spells out the JSON envelope in prose — the local-claude bridge drops responseSchema', () => {
    const p = buildThemaGeneratorPrompt(['A'], ['B'])
    expect(p).toContain('"themen"')
    expect(p).toContain('titleDe')
    expect(p).toContain('taskDe')
    expect(p).toContain('Halten Sie einen kurzen Vortrag darüber')
    expect(p).toContain(String(THEMEN_PER_GENERATION))
  })

  it('passes both avoid-lists to the model', () => {
    const p = buildThemaGeneratorPrompt(['Vorhandenes Thema'], ['Gehaltenes Thema'])
    expect(p).toContain('Vorhandenes Thema')
    expect(p).toContain('Gehaltenes Thema')
  })
})

describe('generateThemen', () => {
  it('stamps ids, level and source on accepted themes', async () => {
    const { client } = fakeClient([JSON.stringify({ themen: [
      { titleDe: 'Fahrrad in der Stadt', taskDe: 'Halten Sie einen kurzen Vortrag darüber, wie das Fahrrad den Verkehr verändert.', tags: ['Umwelt'] }
    ] })])
    const out = await generateThemen(client as any, 'gemini-2.5-flash')
    expect(out).toHaveLength(1)
    expect(out[0].id).toMatch(/^vt-custom-/)
    expect(out[0].level).toBe('B2')
    expect(out[0].source).toBe('custom')
  })

  it('retries past malformed JSON', async () => {
    const { client, calls } = fakeClient(['not json', JSON.stringify({ themen: [
      { titleDe: 'Musik im Alltag', taskDe: 'Halten Sie einen kurzen Vortrag darüber, welche Rolle Musik im Alltag spielt.', tags: ['Medien'] }
    ] })])
    const out = await generateThemen(client as any, 'gemini-2.5-flash')
    expect(out).toHaveLength(1)
    expect(calls.length).toBe(2)
  })

  it('throws when nothing usable ever arrives', async () => {
    const { client } = fakeClient(['{}'])
    await expect(generateThemen(client as any, 'gemini-2.5-flash')).rejects.toThrow()
  })

  it('never returns a title already in the pool', async () => {
    const existing = SPRECHEN_VORTRAGSTHEMEN[0]
    const { client } = fakeClient([JSON.stringify({ themen: [
      { titleDe: existing.titleDe, taskDe: existing.taskDe, tags: existing.tags },
      { titleDe: 'Ganz neues Thema', taskDe: 'Halten Sie einen kurzen Vortrag darüber, warum Neues schwerfällt.', tags: ['Bildung'] }
    ] })])
    const out = await generateThemen(client as any, 'gemini-2.5-flash')
    expect(out.map(t => t.titleDe)).toEqual(['Ganz neues Thema'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/composables/useVortragsthemen.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/composables/useVortragsthemen.ts`**

Structure it exactly like `useSprechenTopics.ts`. The specifics that differ:

- `CUSTOM_VORTRAGSTHEMEN_KEY = 'gt:sprechenCustomVortragsthemen'`, `THEMEN_PER_GENERATION = 5`.
- `doneThemaTitles()` filters `loadHistory()` on `e.type === 'sprechen-teil1'` (**not** `-teil2`) reading `e.meta.topicTitle`.
- `TASK_PREFIX = 'Halten Sie einen kurzen Vortrag darüber'`. `validateGeneratedThema` requires `taskDe.startsWith(TASK_PREFIX)`, rejects any `taskDe` containing `?`, bounds `titleDe` to 3–45 chars and `taskDe` to 60–220, and filters `tags` against `TOPIC_TAGS`, rejecting when nothing survives.
- `drawThemaPair(rng = Math.random): [Vortragsthema, Vortragsthema]` — build the candidate list as undone-preferring (`allThemen()` minus `doneThemaTitles()`, falling back to the whole pool when fewer than two remain), pick index `i = Math.floor(rng() * candidates.length)`, then pick a second index `j` deterministically distinct from `i` (`(i + 1 + Math.floor(rng() * (candidates.length - 1))) % candidates.length`, and if that equals `i`, advance by one). Guard: if the pool has fewer than two entries, throw — it never can, and a silent duplicate would be worse.
- `buildThemaGeneratorPrompt(existingTitles, doneTitles, rng = Math.random)` — pick four random focus tags, a base-36 seed, union the avoid-lists, and demand exactly `THEMEN_PER_GENERATION` themes. **State the JSON envelope in prose** (`{"themen": [{"titleDe": "…", "taskDe": "…", "tags": ["…"]}]}`, no Markdown fences) *and* pass `responseSchema: VORTRAGSTHEMA_GENERATOR_SCHEMA` — the local-Claude bridge drops the schema, so the prose is what actually carries. Instruct the model explicitly: the task must be an **instruction, never a question, never a thesis**, because Teil 1 is a monologue.
- `generateThemen(client, model, maxRetries = 2)` — `temperature: 0.85`, `topP: 0.95`, `responseMimeType: 'application/json'`; dedupe against `allThemen()` titles case-insensitively; stamp `id: \`vt-custom-${stamp}-${i}\``, `level: 'B2'`, `source: 'custom'`; throw when nothing is accepted.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/composables/useVortragsthemen.test.ts`
Expected: PASS. `doneThemaTitles` will only pass once `'sprechen-teil1'` is a valid `QuizHistoryType` — Task 11 adds it. If the test fails to typecheck on that string, report it and leave the test in place; the wave-C task unblocks it.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: one known error until Task 11 lands (`'sprechen-teil1'` not assignable to `QuizHistoryType`). Report it explicitly; do **not** widen the type yourself.

---

### Task 8: `part` on archived corrections, and collocations in the argument bank

**Files:**
- Modify: `src/composables/useSprechenArchive.ts`
- Modify: `src/data/sprechenArguments.ts`
- Modify: `src/composables/useSprechenArguments.ts`
- Test: `tests/db/sprechenArchive.test.ts` (extend), `tests/composables/useSprechenArguments.test.ts` (extend)

**Interfaces:**
- Produces: `ArchivedCorrection.part?: 1 | 2`, `listCorrections({ kind?, part?, limit? })`, `countsByKind(part?)`, `openCorrections(limit?, part?)`; `ArgumentBank.phrases?: TopicWord[]`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/db/sprechenArchive.test.ts`:

```ts
describe('part on archived corrections', () => {
  beforeEach(async () => { await clearArchive() })

  const base = {
    discussionId: 'v-1', topicTitle: 'Ehrenamt', modality: 'typed' as const,
    kind: 'grammar' as const, quote: 'für die Wettkämpfe gefahren',
    suggested: 'zu den Wettkämpfen gefahren', reasonDe: 'Ziel: zu + Dativ.',
    reasonEn: 'Destination takes zu + dative.', context: 'Ich bin für die Wettkämpfe gefahren.'
  }

  it('stores the part it came from', async () => {
    await appendCorrections([{ ...base, part: 1 }])
    const [row] = await listCorrections()
    expect(row.part).toBe(1)
  })

  it('reads a row stored without part as Teil 2, without rewriting it', async () => {
    // ADR-0012: an Archived correction row is never mutated, so there is no
    // backfill — the default happens on read.
    await db.sprechenCorrections.add({ ...base, id: 'legacy-1', createdAt: Date.now() } as any)
    const [row] = await listCorrections()
    expect(row.part).toBe(2)
    const raw = await db.sprechenCorrections.get('legacy-1')
    expect((raw as any).part).toBeUndefined()
  })

  it('filters by part', async () => {
    await appendCorrections([{ ...base, part: 1 }, { ...base, part: 2, quote: 'anders' }])
    expect(await listCorrections({ part: 1 })).toHaveLength(1)
    expect(await listCorrections({ part: 2 })).toHaveLength(1)
    expect(await listCorrections()).toHaveLength(2)
  })

  it('counts by kind per part', async () => {
    await appendCorrections([{ ...base, part: 1 }, { ...base, part: 2, quote: 'anders' }])
    expect((await countsByKind(1)).grammar).toBe(1)
    expect((await countsByKind()).grammar).toBe(2)
  })

  it('serves open corrections from both parts to the drill', async () => {
    await appendCorrections([{ ...base, part: 1 }, { ...base, part: 2, quote: 'anders' }])
    expect(await openCorrections()).toHaveLength(2)
    expect(await openCorrections(undefined, 1)).toHaveLength(1)
  })
})
```

Append to `tests/composables/useSprechenArguments.test.ts`:

```ts
describe('collocations on the argument bank', () => {
  it('accepts a bank without phrases — cached banks predate the field', () => {
    const v = validateArgumentBank({
      pro: [{ claim: 'A', why: 'B' }, { claim: 'C', why: 'D' }, { claim: 'E', why: 'F' }],
      contra: [{ claim: 'A', why: 'B' }, { claim: 'C', why: 'D' }, { claim: 'E', why: 'F' }],
      words: [{ de: 'der Test', en: 'the test' }, { de: 'die Sache', en: 'the thing' }, { de: 'das Ding', en: 'the object' }, { de: 'die Zeit', en: 'the time' }]
    })
    expect(v).not.toBeNull()
    expect(v!.phrases).toBeUndefined()
  })

  it('keeps well-formed phrases when present', () => {
    const v = validateArgumentBank({
      pro: [{ claim: 'A', why: 'B' }, { claim: 'C', why: 'D' }, { claim: 'E', why: 'F' }],
      contra: [{ claim: 'A', why: 'B' }, { claim: 'C', why: 'D' }, { claim: 'E', why: 'F' }],
      words: [{ de: 'der Test', en: 'the test' }, { de: 'die Sache', en: 'the thing' }, { de: 'das Ding', en: 'the object' }, { de: 'die Zeit', en: 'the time' }],
      phrases: [{ de: 'eine Rolle spielen', en: 'to play a role' }]
    })
    expect(v!.phrases).toEqual([{ de: 'eine Rolle spielen', en: 'to play a role' }])
  })

  it('drops a malformed phrases field rather than failing the whole bank', () => {
    const v = validateArgumentBank({
      pro: [{ claim: 'A', why: 'B' }, { claim: 'C', why: 'D' }, { claim: 'E', why: 'F' }],
      contra: [{ claim: 'A', why: 'B' }, { claim: 'C', why: 'D' }, { claim: 'E', why: 'F' }],
      words: [{ de: 'der Test', en: 'the test' }, { de: 'die Sache', en: 'the thing' }, { de: 'das Ding', en: 'the object' }, { de: 'die Zeit', en: 'the time' }],
      phrases: 'nope'
    })
    expect(v).not.toBeNull()
    expect(v!.phrases).toBeUndefined()
  })

  it('asks the generator for collocations', () => {
    const p = buildArgumentBankPrompt({ titleDe: 'X', statementDe: 'Y?' })
    expect(p).toContain('phrases')
    expect(p).toContain('Wortverbindungen')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/db/sprechenArchive.test.ts tests/composables/useSprechenArguments.test.ts`
Expected: the new cases FAIL; the pre-existing ones PASS.

- [ ] **Step 3a: `part` on the archive**

In `src/composables/useSprechenArchive.ts`:

- Add to `ArchivedCorrection`:
  ```ts
  /**
   * Which exam part the correction came from. OPTIONAL and written on new rows
   * only: ADR-0012 forbids mutating an Archived correction row, so there is no
   * backfill migration. `undefined` reads as 2 — the only part that existed —
   * and the defaulting lives here in the repository, never in the schema.
   */
  part?: 1 | 2
  ```
- In `listCorrections`, widen the filter to `{ kind?: SprechenErrorTag; part?: 1 | 2; limit?: number }`, and **normalise every row on read** with `{ ...row, part: row.part ?? 2 }` before filtering, so no consumer ever sees `undefined`.
- `countsByKind(part?: 1 | 2)` — filter by the normalised part when given.
- `openCorrections(limit?: number, part?: 1 | 2)` — pass `part` through to `listCorrections`.
- Do **not** touch `appendCorrections`' write path beyond letting `part` ride along in the spread, and do **not** add an index for `part` (a full-table scan is what every read here already does, and adding an index would need a version bump this task does not own).

- [ ] **Step 3b: `phrases` on the argument bank**

In `src/data/sprechenArguments.ts`, add to `ArgumentBank`:

```ts
  /**
   * Topic collocations — „eine Rolle spielen", „auf … angewiesen sein".
   * OPTIONAL because banks already cached in `sprechenArgumentBanks` predate
   * the field: a missing value renders one Wortschatz row instead of two and is
   * never an error. Bare nouns do not lift the Wortschatz criterion;
   * combinations do.
   */
  phrases?: TopicWord[]
```

Author `phrases` (four to six each) for all ten `TAG_ARGUMENT_BANKS` entries and all four `TOPIC_ARGUMENT_BANKS` entries. Real B2 collocations relevant to the field, `de` including the governed preposition or case where it matters.

In `src/composables/useSprechenArguments.ts`:
- Extend `buildArgumentBankPrompt` to ask for `"phrases": genau 5 feste Wortverbindungen zum Thema` in the same `{de, en}` shape, and add `phrases` to the prose JSON envelope.
- In `validateArgumentBank`, validate `phrases` with the existing `validateWords` helper but **never fail the bank on it**: `const phrases = validateWords(r.phrases); return { pro, contra, words, ...(phrases && phrases.length > 0 ? { phrases } : {}) }`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/db tests/composables/useSprechenArguments.test.ts tests/modules/SprechenArchive.test.ts tests/modules/SprechenDrill.test.ts`
Expected: PASS. The archive screen and drill must keep working untouched.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean.

---

### Task 9: The Nachfrage and the Teil-1 KI-Tipp

**Files:**
- Create: `src/composables/useVortragPartner.ts`
- Test: `tests/composables/useVortragPartner.test.ts`

**Interfaces:**
- Consumes: `SprechenVortrag` (Task 3), `PunktSignal` + `planSignals` (Task 6), `GLIEDERUNGSPUNKTE` (Task 1).
- Produces: `type GeminiClient`, `NACHFRAGE_SCHEMA`, `buildNachfragePrompt`, `validateNachfrage`, `generateNachfrage`, `VORTRAG_KITIPP_SCHEMA`, `buildVortragKiTippPrompt`, `generateVortragKiTipp`, `class NachfrageError`.

Read `src/composables/useSprechenPartner.ts` first — same structural type, same prose-fallback trick, same retry posture.

- [ ] **Step 1: Write the failing test**

`tests/composables/useVortragPartner.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  buildNachfragePrompt, validateNachfrage, generateNachfrage,
  buildVortragKiTippPrompt, generateVortragKiTipp
} from '../../src/composables/useVortragPartner'
import type { SprechenVortrag } from '../../src/data/sprechen'

const v: SprechenVortrag = {
  id: 'v1',
  thema: { id: 'vt-ehrenamt', titleDe: 'Ehrenamtliches Engagement', taskDe: 'Halten Sie einen kurzen Vortrag darüber, welche Rolle freiwillige Arbeit in einer Gesellschaft spielt.', source: 'seed' },
  modality: 'typed',
  helps: { hints: true, checklist: true, kiTipp: true, hardLimit: false },
  plan: [{ key: 'einstieg', keyword: 'Sportvereine' }, { key: 'fazit', keyword: 'Freistellung' }],
  notes: '',
  rede: { textDe: 'Ich möchte heute über das Thema Ehrenamt sprechen. Freiwillige brauchen Freistellung von der Arbeit.' },
  kiTippCount: 0,
  helpLog: [],
  status: 'in_progress',
  startedAt: 0
}

function fakeClient(responses: string[]) {
  let i = 0
  const calls: Array<{ contents: string; config?: any }> = []
  return {
    client: {
      models: {
        generateContent: async (opts: { contents: string; config?: any }) => {
          calls.push(opts)
          return { text: responses[Math.min(i++, responses.length - 1)] }
        }
      }
    },
    calls
  }
}

describe('buildNachfragePrompt', () => {
  it('sends the Rede so the question is about what was actually said', () => {
    const p = buildNachfragePrompt(v)
    expect(p).toContain('Freistellung von der Arbeit')
    expect(p).toContain(v.thema.taskDe)
  })

  it('demands exactly one question, and one that cannot be answered yes or no', () => {
    const p = buildNachfragePrompt(v)
    expect(p).toContain('GENAU EINE')
    expect(p).toContain('questionDe')
    expect(p).toMatch(/nicht mit ja oder nein/i)
  })
})

describe('validateNachfrage', () => {
  it('accepts a plausible question', () => {
    expect(validateNachfrage({ questionDe: 'Wer soll diese Ausfallzeit bezahlen — die Betriebe oder der Staat?' }))
      .toBe('Wer soll diese Ausfallzeit bezahlen — die Betriebe oder der Staat?')
  })

  it('rejects the empty, the tiny and the enormous', () => {
    expect(validateNachfrage({ questionDe: '' })).toBeNull()
    expect(validateNachfrage({ questionDe: 'Was?' })).toBeNull()
    expect(validateNachfrage({ questionDe: 'A'.repeat(400) })).toBeNull()
    expect(validateNachfrage(null)).toBeNull()
  })

  it('rejects a non-question', () => {
    expect(validateNachfrage({ questionDe: 'Das war ein guter Vortrag über das Ehrenamt.' })).toBeNull()
  })
})

describe('generateNachfrage', () => {
  it('returns the question', async () => {
    const { client } = fakeClient([JSON.stringify({ questionDe: 'Und wer bezahlt die Ausfallzeit dann?' })])
    expect(await generateNachfrage(client as any, 'm', v)).toBe('Und wer bezahlt die Ausfallzeit dann?')
  })

  it('accepts bare prose — the local-claude bridge drops responseSchema', async () => {
    const { client } = fakeClient(['Und wer bezahlt die Ausfallzeit dann?'])
    expect(await generateNachfrage(client as any, 'm', v)).toBe('Und wer bezahlt die Ausfallzeit dann?')
  })

  it('retries past junk, then throws', async () => {
    const { client, calls } = fakeClient(['{}'])
    await expect(generateNachfrage(client as any, 'm', v)).rejects.toThrow()
    expect(calls.length).toBe(3)
  })
})

describe('buildVortragKiTippPrompt', () => {
  it('names the points still missing and asks for a direction, not a sentence', () => {
    const p = buildVortragKiTippPrompt(v)
    expect(p).toContain('Eigene Erfahrung')     // planned nothing, said nothing
    expect(p).toContain('Vor- und Nachteile')
    expect(p).toMatch(/KEINEN fertigen Satz/i)
    expect(p).toContain('tippDe')
  })

  it('does not leak the Vortragsplan keywords as text to speak', () => {
    const p = buildVortragKiTippPrompt(v)
    expect(p).toMatch(/Stichwort|geplant/i)
  })
})

describe('generateVortragKiTipp', () => {
  it('returns the tip', async () => {
    const { client } = fakeClient([JSON.stringify({ tippDe: 'Stell den Vorteilen einen Nachteil gegenüber.' })])
    expect(await generateVortragKiTipp(client as any, 'm', v)).toBe('Stell den Vorteilen einen Nachteil gegenüber.')
  })

  it('accepts bare prose', async () => {
    const { client } = fakeClient(['Nenne jetzt ein eigenes Beispiel.'])
    expect(await generateVortragKiTipp(client as any, 'm', v)).toBe('Nenne jetzt ein eigenes Beispiel.')
  })

  it('throws when nothing usable arrives', async () => {
    const { client } = fakeClient(['{"nope": 1}'])
    await expect(generateVortragKiTipp(client as any, 'm', v)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/composables/useVortragPartner.test.ts` → FAIL, module not found.

- [ ] **Step 3: Implement**

`src/composables/useVortragPartner.ts`. Key requirements:

- `GeminiClient` — copy the structural interface from `useSprechenPartner.ts` verbatim.
- `NACHFRAGE_SCHEMA = { type: 'object', properties: { questionDe: { type: 'string' } }, required: ['questionDe'] }`.
- `buildNachfragePrompt(v)` — German prompt. Give it the `taskDe`, the full `rede.textDe`, and, when present, the Nachfrage-less note that this is a B2 practice exam. Instruct: you are the examining partner; ask **GENAU EINE** follow-up question about something the candidate actually said; pick their weakest or vaguest claim; the question must be answerable in two or three sentences and **nicht mit ja oder nein**; polite Sie-form; no correcting their German. Envelope in prose: `{"questionDe": "…"}`, no fences.
- `validateNachfrage(raw)` — requires `questionDe` string, trimmed length 12–300, and `endsWith('?')`. Returns the trimmed string or `null`.
- `generateNachfrage(client, model, v, maxRetries = 2)` — `temperature: 0.8`, `topP: 0.95`, `responseMimeType: 'application/json'`, `responseSchema: NACHFRAGE_SCHEMA`; JSON first, then the bare-prose fallback (accept text that does not start with `{` or `[` and passes `validateNachfrage({ questionDe: text })`); on exhaustion `throw new NachfrageError(...)` carrying `attempts`.
- `buildVortragKiTippPrompt(v)` — compute `planSignals(v.plan, v.rede.textDe)`, list the Gliederungspunkte **not yet said** by their `labelDe`, and include the Rede so far (truncate to the last 1200 characters — a four-minute Rede plus a system prompt is otherwise wasteful). Instruct: 1–2 sentences, du-form, name the next argumentative move for the point they are heading into; **formuliere KEINEN fertigen Satz zum Abschreiben**; mention the learner's own planned Stichwort for that point when they have one. Envelope `{"tippDe": "…"}`.
- `generateVortragKiTipp(client, model, v)` — one call, no retry loop (mirrors `generateKiTipp`), `temperature: 0.7`, `topP: 0.95`; JSON then prose fallback; `throw new Error('KI-Tipp returned no usable text')` when neither works.

- [ ] **Step 4: Run test** → `npx vitest run tests/composables/useVortragPartner.test.ts` → PASS.
- [ ] **Step 5: Typecheck** → `npm run typecheck` → clean.

---

### Task 10: The Vortrag grader

**Files:**
- Create: `src/composables/useVortragGrader.ts`
- Test: `tests/composables/useVortragGrader.test.ts`

**Interfaces:**
- Consumes: `SPRECHEN_B2_TEIL1`, `sprechenDescriptor`, `sprechenNotes`, `praedikat`, `type Praedikat` from `src/data/rubrics.ts`; `reAnchor`, `type SprechenCriterionScore`, `type BilingualNote`, `type GeminiClient` from `src/composables/useSprechenGrader.ts` (**import, do not duplicate**); `GLIEDERUNGSPUNKTE`, `GliederungKey` (Task 1); `SprechenVortrag` (Task 3); `redezeit` (Task 6); `type SprechenErrorTag`.
- Produces: `VORTRAG_GRADE_SCHEMA`, `type VortragCoverageCell`, `type VortragMistake`, `type Aufwertung`, `type VortragGradeResult`, `buildVortragGraderPrompt`, `validateVortragGrade`, `gradeVortrag`, `class VortragGraderError`, `VORTRAG_RESULT_KEY`, `type Teil1ResultStash`, `AUFWERTUNG_CAP`.

- [ ] **Step 1: Write the failing test**

`tests/composables/useVortragGrader.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  buildVortragGraderPrompt, validateVortragGrade, gradeVortrag, AUFWERTUNG_CAP
} from '../../src/composables/useVortragGrader'
import { GLIEDERUNGSPUNKTE } from '../../src/data/sprechenVortragsmittel'
import type { SprechenVortrag } from '../../src/data/sprechen'

const REDE = 'Ich möchte heute über das Thema Ehrenamt sprechen. Ausserdem lernt man dabei viel. Ich bin für die Wettkämpfe gefahren. Zusammenfassend ist das Ehrenamt unverzichtbar.'

function vortrag(over: Partial<SprechenVortrag> = {}): SprechenVortrag {
  return {
    id: 'v1',
    thema: { id: 'vt-ehrenamt', titleDe: 'Ehrenamtliches Engagement', taskDe: 'Halten Sie einen kurzen Vortrag darüber, welche Rolle freiwillige Arbeit in einer Gesellschaft spielt.', source: 'seed' },
    modality: 'typed',
    helps: { hints: true, checklist: true, kiTipp: false, hardLimit: false },
    plan: [], notes: '',
    rede: { textDe: REDE },
    nachfrage: { questionDe: 'Wer bezahlt die Ausfallzeit?', answerDe: 'Vielen Dank für Ihre Frage. Ich denke, beide.' },
    kiTippCount: 0, helpLog: [], status: 'submitted', startedAt: 0,
    ...over
  }
}

function goodPayload(over: Record<string, unknown> = {}) {
  return {
    criteria: [
      { key: 'erfuellung', score: 20, justificationDe: 'de', justificationEn: 'en' },
      { key: 'kohaerenz', score: 19, justificationDe: 'de', justificationEn: 'en' },
      { key: 'wortschatz', score: 17, justificationDe: 'de', justificationEn: 'en' },
      { key: 'strukturen', score: 16, justificationDe: 'de', justificationEn: 'en' }
    ],
    coverage: GLIEDERUNGSPUNKTE.map(p => ({ key: p.key, covered: true, note: 'ok' })),
    mistakes: [
      { phase: 'rede', quote: 'Ausserdem', suggested: 'Außerdem', kind: 'spelling', reasonDe: 'ß nach langem Vokal.', reasonEn: 'ß after a long vowel.' },
      { phase: 'rede', quote: 'für die Wettkämpfe gefahren', suggested: 'zu den Wettkämpfen gefahren', kind: 'grammar', reasonDe: 'Ziel: zu + Dativ.', reasonEn: 'Destination takes zu + dative.' }
    ],
    aufwertungen: [
      { quote: 'lernt man dabei viel', better: 'erwirbt man dabei Fähigkeiten', whyDe: 'Präziser.', whyEn: 'More precise.' }
    ],
    strengths: [{ de: 'a', en: 'b' }],
    weaknesses: [{ de: 'c', en: 'd' }],
    overallDe: 'Gut gebaut.',
    overallEn: 'Well built.',
    ...over
  }
}

describe('buildVortragGraderPrompt', () => {
  it('embeds the Teil-1 rubric, not the Teil-2 one', () => {
    const { system } = buildVortragGraderPrompt(vortrag())
    expect(system).toContain('Erfüllung / Gliederung')
    expect(system).not.toContain('Erfüllung / Interaktion')
  })

  it('lists all five Gliederungspunkte by key for the coverage field', () => {
    const { system } = buildVortragGraderPrompt(vortrag())
    for (const p of GLIEDERUNGSPUNKTE) expect(system).toContain(p.key)
  })

  it('asks for Aufwertungen and says they are not errors', () => {
    const { system } = buildVortragGraderPrompt(vortrag())
    expect(system).toContain('aufwertungen')
    expect(system).toMatch(/KEINE Fehler|kein Fehler/i)
  })

  it('sends the Rede and the Nachfrage exchange, labelled', () => {
    const { user } = buildVortragGraderPrompt(vortrag())
    expect(user).toContain('VORTRAG:')
    expect(user).toContain('NACHFRAGE:')
    expect(user).toContain('ANTWORT:')
    expect(user).toContain('Ausserdem')
  })

  it('tells the grader when there was no Nachfrage, so Erfüllung is not docked', () => {
    const { user } = buildVortragGraderPrompt(vortrag({ nachfrage: undefined }))
    expect(user).toMatch(/keine Nachfrage/i)
    expect(user).toMatch(/nicht.*abwerten|nicht negativ/i)
  })

  it('forbids the spelling tag and sends Sprechdaten when spoken', () => {
    const { system, user } = buildVortragGraderPrompt(
      vortrag({ modality: 'spoken', rede: { textDe: REDE, seconds: 231, restarts: 4 } })
    )
    expect(system).toContain('spelling')
    expect(system).toMatch(/NIEMALS/)
    expect(user).toContain('SPRECHDATEN')
    expect(user).toContain('3:51')
  })

  it('says nothing about Sprechdaten when typed', () => {
    const { user } = buildVortragGraderPrompt(vortrag())
    expect(user).not.toContain('SPRECHDATEN')
  })
})

describe('validateVortragGrade', () => {
  it('derives the total and the pass flag from the criteria', () => {
    const r = validateVortragGrade(goodPayload(), vortrag())!
    expect(r.totalScore).toBe(72)
    expect(r.passes).toBe(true)
    expect(r.praedikat).toBe('befriedigend')
  })

  it('ignores the model’s own arithmetic', () => {
    const r = validateVortragGrade(goodPayload({ totalScore: 99, passes: false }), vortrag())!
    expect(r.totalScore).toBe(72)
    expect(r.passes).toBe(true)
  })

  it('rejects a missing criterion and an out-of-range score', () => {
    expect(validateVortragGrade(goodPayload({ criteria: goodPayload().criteria.slice(1) }), vortrag())).toBeNull()
    const bad = goodPayload()
    ;(bad.criteria as any)[0].score = 26
    expect(validateVortragGrade(bad, vortrag())).toBeNull()
  })

  it('requires exactly the five coverage keys', () => {
    expect(validateVortragGrade(goodPayload({ coverage: [] }), vortrag())).toBeNull()
    expect(validateVortragGrade(goodPayload({
      coverage: GLIEDERUNGSPUNKTE.map(p => ({ key: p.key === 'fazit' ? 'schluss' : p.key, covered: true, note: '' }))
    }), vortrag())).toBeNull()
  })

  it('never consumes a words field even when the model volunteers one', () => {
    const r = validateVortragGrade(goodPayload({
      coverage: GLIEDERUNGSPUNKTE.map(p => ({ key: p.key, covered: true, note: 'ok', words: 999 }))
    }), vortrag())!
    expect((r.coverage[0] as any).words).toBeUndefined()
  })

  it('re-anchors mistakes and drops the unanchorable', () => {
    const r = validateVortragGrade(goodPayload({
      mistakes: [
        { phase: 'rede', quote: 'Ausserdem', suggested: 'Außerdem', kind: 'spelling', reasonDe: 'x', reasonEn: 'y' },
        { phase: 'rede', quote: 'niemals gesagt', suggested: 'egal', kind: 'grammar', reasonDe: 'x', reasonEn: 'y' }
      ]
    }), vortrag())!
    expect(r.mistakes).toHaveLength(1)
    expect(r.mistakes[0].spanStart).toBeGreaterThanOrEqual(0)
  })

  it('anchors a Nachfrage mistake against the answer, not the Rede', () => {
    const r = validateVortragGrade(goodPayload({
      mistakes: [{ phase: 'nachfrage', quote: 'Ich denke, beide', suggested: 'Ich denke, beide sollten', kind: 'grammar', reasonDe: 'x', reasonEn: 'y' }]
    }), vortrag())!
    expect(r.mistakes).toHaveLength(1)
    expect(r.mistakes[0].phase).toBe('nachfrage')
  })

  it('suppresses the spelling tag in a spoken Vortrag', () => {
    const r = validateVortragGrade(goodPayload(), vortrag({ modality: 'spoken', rede: { textDe: REDE, seconds: 200 } }))!
    expect(r.mistakes.map(m => m.kind)).not.toContain('spelling')
    expect(r.mistakes).toHaveLength(1)
  })

  it('re-anchors and caps Aufwertungen, and never treats them as errors', () => {
    const many = Array.from({ length: 9 }, () => ({ quote: 'lernt man dabei viel', better: 'x', whyDe: 'y', whyEn: 'z' }))
    const r = validateVortragGrade(goodPayload({ aufwertungen: many }), vortrag())!
    expect(r.aufwertungen.length).toBe(AUFWERTUNG_CAP)
    expect(r.aufwertungen[0].spanStart).toBeGreaterThanOrEqual(0)
    expect(r.mistakes.every(m => (m as any).better === undefined)).toBe(true)
  })

  it('drops an unanchorable Aufwertung', () => {
    const r = validateVortragGrade(goodPayload({
      aufwertungen: [{ quote: 'nie gesagt', better: 'x', whyDe: 'y', whyEn: 'z' }]
    }), vortrag())!
    expect(r.aufwertungen).toEqual([])
  })

  it('tolerates aufwertungen and coverage being absent — a good grade must not fail on extras', () => {
    const p = goodPayload()
    delete (p as any).aufwertungen
    const r = validateVortragGrade(p, vortrag())!
    expect(r.aufwertungen).toEqual([])
  })
})

describe('gradeVortrag', () => {
  function fakeClient(responses: string[]) {
    let i = 0
    const calls: any[] = []
    return {
      client: { models: { generateContent: async (o: any) => { calls.push(o); return { text: responses[Math.min(i++, responses.length - 1)] } } } },
      calls
    }
  }

  it('grades at temperature 0 and stamps the model', async () => {
    const { client, calls } = fakeClient([JSON.stringify(goodPayload())])
    const r = await gradeVortrag(client as any, 'gemini-2.5-flash', vortrag())
    expect(r.totalScore).toBe(72)
    expect(r.modelUsed).toBe('gemini-2.5-flash')
    expect(calls[0].config.temperature).toBe(0)
  })

  it('retries past malformed JSON then throws with the attempt count', async () => {
    const { client } = fakeClient(['nope'])
    await expect(gradeVortrag(client as any, 'm', vortrag())).rejects.toThrow(/3 attempts/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails** → FAIL, module not found.

- [ ] **Step 3: Implement `src/composables/useVortragGrader.ts`**

Mirror `useSprechenGrader.ts` closely — read it in full first. Differences that matter:

- **Reuse, never re-declare:** `import { reAnchor, type BilingualNote, type GeminiClient, type SprechenCriterionScore } from './useSprechenGrader'`.
- `AUFWERTUNG_CAP = 5`.
- Types:
  ```ts
  export interface VortragCoverageCell { key: GliederungKey; covered: boolean; note: string }
  export interface VortragMistake {
    phase: 'rede' | 'nachfrage'
    quote: string; suggested: string; kind: SprechenErrorTag
    reasonDe: string; reasonEn: string; spanStart: number; spanEnd: number
  }
  export interface Aufwertung {
    quote: string; better: string; whyDe: string; whyEn: string
    spanStart: number; spanEnd: number
  }
  export interface VortragGradeResult {
    totalScore: number; passes: boolean; praedikat: Praedikat
    criteria: SprechenCriterionScore[]
    coverage: VortragCoverageCell[]
    mistakes: VortragMistake[]
    aufwertungen: Aufwertung[]
    strengths: BilingualNote[]; weaknesses: BilingualNote[]
    overallDe: string; overallEn: string
    generatedAt: number; modelUsed: string
  }
  ```
- `VORTRAG_GRADE_SCHEMA` — same shape as `SPRECHEN_GRADE_SCHEMA` but: `mistakes.items` swaps `turnIndex: number` for `phase: string`; add `coverage` (array of `{key, covered, note}`, all required); add `aufwertungen` (array of `{quote, better, whyDe, whyEn}`, all required). `required` lists `['criteria', 'coverage', 'mistakes', 'strengths', 'weaknesses', 'overallDe', 'overallEn']` — **not** `totalScore`/`passes`, which are derived.
- `buildVortragGraderPrompt(v)` returns `{ system, user }`:
  - `system` — persona ("strenge, kalibrierte Prüferin", spoken variant mentioning speech recognition), the rubric rendered from `SPRECHEN_B2_TEIL1` via `sprechenDescriptor(c, v.modality)` and `sprechenNotes(...)`, the mistake instructions (identical five `kind` values, `phase` being `"rede"` or `"nachfrage"`, verbatim `quote`), the **spelling caveat when spoken** (copy the wording pattern from `spellingCaveatDe`), the coverage instruction naming all five keys from `GLIEDERUNGSPUNKTE` with their `labelDe`, and the Aufwertungen instruction: *genau bis zu 5, Stellen die NICHT falsch sind, mit einer B2-typischeren Formulierung und einer kurzen Begründung; das sind KEINE Fehler und dürfen die Punktzahl nicht verändern.* Then the prose JSON envelope, no fences.
  - `user` — `THEMA:`/`AUFGABE:` from `thema`, then `VORTRAG:\n<rede.textDe>`, then either `NACHFRAGE:\n…\nANTWORT:\n…` or a `HINWEIS: Es wurde keine Nachfrage gestellt` line saying plainly *bewerte „erfuellung" deswegen nicht negativ*. When `modality === 'spoken'` and `rede.seconds` exists, append a `SPRECHDATEN` block with the measured clock (use `redezeit({...}).clock`), words per minute, and `restarts` as *lange Pausen*, plus the same "only for kohaerenz" warning Teil 2 uses.
- `validateVortragGrade(raw, v)`:
  1. Require `overallDe`/`overallEn` strings and `criteria` / `mistakes` / `strengths` / `weaknesses` arrays.
  2. Criteria matched **by key** against `SPRECHEN_B2_TEIL1.criteria`, each present exactly once, score rounded and range-checked, justifications required. `totalScore` = sum; `passes` = `total >= SPRECHEN_B2_TEIL1.passingScore`; `praedikat = praedikat(total)`. Ignore the model's echoed `totalScore`/`passes`.
  3. Coverage: require an array; project to exactly the five `GLIEDERUNGSPUNKTE` keys in **rubric order**, taking `covered === true` and `note` as a string (default `''`). Return `null` if any of the five keys is missing. **Build the cell literally as `{ key, covered, note }`** so a volunteered `words` can never reach a consumer.
  4. Mistakes: validate `phase` ∈ `{'rede','nachfrage'}`; pick the anchor text (`v.rede.textDe` or `v.nachfrage?.answerDe ?? ''`); validate `kind` against the five tags; **drop `spelling` entirely when `v.modality === 'spoken'`**; `reAnchor` and drop on `spanStart < 0`.
  5. Aufwertungen: optional. Anchor each against `v.rede.textDe` first, then the Nachfrage answer; drop the unanchorable; `slice(0, AUFWERTUNG_CAP)`. Absent or malformed → `[]`, never `null`.
- `gradeVortrag(client, model, v, maxRetries = 2)` — copy `gradeDiscussion` structurally: `temperature: 0`, `systemInstruction: system`, `responseSchema`, JSON parse then validate, stamp `modelUsed`, `throw new VortragGraderError(\`Grader exhausted ${attempts} attempts. Last error: ${lastError}\`, attempts)`.
- `VORTRAG_RESULT_KEY = 'gt:lastSprechenTeil1Result'` and:
  ```ts
  export interface Teil1ResultStash {
    thema: VortragThemaRef
    modality: Modality
    helps: VortragHelps
    plan: VortragPlanEntry[]
    rede: RedeRecord
    nachfrage?: NachfrageRecord
    kiTippCount: number
    helpLog: HelpLogEntry[]
    vortragsmittel: string[]     // matched ids, for the Ausbeute block
    startedAt: number
    finishedAt: number
    result: VortragGradeResult
  }
  ```

- [ ] **Step 4: Run tests** → `npx vitest run tests/composables/useVortragGrader.test.ts tests/composables/useSprechenGrader.test.ts` → both PASS.
- [ ] **Step 5: Typecheck** → clean.

---

### Task 11: History plumbing for `sprechen-teil1`

**Files:**
- Modify: `src/composables/useQuizHistory.ts`
- Modify: `src/composables/useLevelAssessment.ts`
- Modify: `src/composables/useQuizStats.ts`
- Modify: `src/components/charts/quiz-type-labels.ts`
- Modify: `src/modules/history/HistoryPage.vue`
- Modify: `src/composables/useUserData.ts`
- Test: `tests/composables/useQuizHistory.sprechen.test.ts` (extend)

**Interfaces:**
- Produces: `'sprechen-teil1'` as a `QuizHistoryType`, the Teil-1 meta fields, and two new `USER_DATA_KEYS`.

There are **six** exhaustive structures over `QuizHistoryType`. Miss one and `npm run typecheck` fails — that is the safety net, so run it.

- [ ] **Step 1: Write the failing test**

Append to `tests/composables/useQuizHistory.sprechen.test.ts`:

```ts
import { USER_DATA_KEYS } from '../../src/composables/useUserData'
import { QUIZ_TYPE_LABEL, QUIZ_TYPE_DE, QUIZ_TYPES_ORDER } from '../../src/components/charts/quiz-type-labels'

describe('sprechen-teil1 history type', () => {
  it('round-trips a Teil 1 Run with its full meta', () => {
    localStorage.removeItem('gt:quizHistory')
    saveQuizRun({
      type: 'sprechen-teil1',
      startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
      durationMs: 1000, count: 1, correct: 1,
      meta: {
        topicTitle: 'Ehrenamtliches Engagement',
        sprechenScore: 74, maxScore: 100, passes: true, sprechenPraedikat: 'befriedigend',
        sprechenCriteria: [{ key: 'erfuellung', score: 21, maxPoints: 25 }],
        sprechenModality: 'spoken',
        sectionsCovered: 5,
        spokenSeconds: 231,
        wordCount: 352,
        sprechenVortragsmittel: ['vm-einstieg-1'],
        kiTippCount: 1,
        sprechenHelps: { hints: true, checklist: true, kiTipp: true, hardLimit: false },
        sprechenAufwertungen: [{ quote: 'a', better: 'b', whyDe: 'c', whyEn: 'd' }],
        sprechenMistakeCounts: { grammar: 2 }
      }
    })
    const [run] = loadHistory()
    expect(run.type).toBe('sprechen-teil1')
    expect(run.meta.sectionsCovered).toBe(5)
    expect(run.meta.sprechenAufwertungen).toHaveLength(1)
    expect(run.meta.sprechenHelps?.hardLimit).toBe(false)
  })

  it('is labelled everywhere a chart or a page enumerates types', () => {
    expect(QUIZ_TYPE_LABEL['sprechen-teil1']).toBeTruthy()
    expect(QUIZ_TYPE_DE['sprechen-teil1']).toContain('Vortrag')
    expect(QUIZ_TYPES_ORDER).toContain('sprechen-teil1')
  })

  it('registers the Teil 1 user-data keys for export and import', () => {
    expect(USER_DATA_KEYS).toContain('sprechenTeil1Setup')
    expect(USER_DATA_KEYS).toContain('gt:sprechenCustomVortragsthemen')
  })
})
```

- [ ] **Step 2: Run test to verify it fails** → FAIL on the type and the keys.

- [ ] **Step 3: Make the six edits plus the keys**

1. `src/composables/useQuizHistory.ts` — add `| 'sprechen-teil1'` to `QuizHistoryType` immediately **before** `'sprechen-teil2'`, and append to `QuizHistoryMeta`:
   ```ts
   // Sprechen Teil 1 (Vortrag) — summary only, no Rede, no Nachfrage.
   // `topicTitle` is deliberately reused rather than forked to `themaTitle`:
   // the hub's merged recents list reads meta.topicTitle for both parts, and
   // the Topic/Vortragsthema distinction is a domain one, not a storage one.
   sectionsCovered?: number                          // 0–5, the GRADER's coverage, never the rail's dots
   wordCount?: number
   spokenSeconds?: number
   sprechenVortragsmittel?: string[]
   sprechenHelps?: { hints: boolean; checklist: boolean; kiTipp: boolean; hardLimit: boolean }
   sprechenAufwertungen?: Array<{ quote: string; better: string; whyDe: string; whyEn: string }>
   ```
   Reuse the existing `topicTitle`, `sprechenScore`, `maxScore`, `passes`, `sprechenPraedikat`, `sprechenCriteria`, `sprechenModality`, `sprechenMistakeCounts`, `kiTippCount`, `sprechenStrengths`, `sprechenWeaknesses`, `sprechenOverallDe`, `sprechenOverallEn` fields — do not duplicate them. If `maxScore` or `passes` are not already on `QuizHistoryMeta`, add them as `maxScore?: number` / `passes?: boolean`.
2. `src/composables/useLevelAssessment.ts` — beside the Teil 2 line:
   ```ts
   'sprechen-teil1': 'Sprechen Teil 1 — a four-minute Vortrag on a task sheet with five fixed points, plus one follow-up question, typed or spoken (score 0-100, Goethe B2 rubric)',
   ```
3. `src/components/charts/quiz-type-labels.ts` — three additions:
   ```ts
   'sprechen-teil1': 'Sprechen · Teil 1 Vortrag',        // QUIZ_TYPE_LABEL
   'sprechen-teil1': 'Sprechen · Teil 1 Vortrag',        // QUIZ_TYPE_DE
   'sprechen-teil1',                                      // QUIZ_TYPES_ORDER, before 'sprechen-teil2'
   ```
4. `src/modules/history/HistoryPage.vue` — in `QUIZ_TYPES`, matching the column alignment of its neighbours:
   ```ts
   'sprechen-teil1':     { label: 'Sprechen — Teil 1 Vortrag',        de: 'Sprechen · Teil 1 Vortrag',    module: 'Sprechen' },
   ```
   and `'sprechen-teil1',` in `typeOrder` before `'sprechen-teil2'`.
5. `src/composables/useQuizStats.ts` — `'sprechen-teil1': 0,` in the counts builder and `'sprechen-teil1': emptyBucket(),` in the accuracy builder.
6. `src/composables/useUserData.ts` — add `'sprechenTeil1Setup',` beside `'sprechenTeil2Setup'` and `'gt:sprechenCustomVortragsthemen',` beside `'gt:sprechenCustomTopics'`. Add matching entries to `KEY_LABELS` if that map is exhaustive — check, and follow the wording style of the Teil 2 entries. Do **not** add `sprechenVortraege`: it is a Dexie table and only ever holds one in-flight Vortrag.

- [ ] **Step 4: Run the full suite** → `npm test` → PASS, including `tests/composables/useVortragsthemen.test.ts` from Task 7, which was blocked on this type.
- [ ] **Step 5: Typecheck** → `npm run typecheck` → clean. If it still complains about a `Record<QuizHistoryType, …>`, you missed a seventh site: add it and report where.

---

### Task 12: Routes and the Teil-1 stylesheet blocks

**Files:**
- Modify: `src/router.ts`
- Modify: `src/styles/sprechen.css`
- Test: `tests/router.teil1.test.ts`

**Interfaces:**
- Produces: routes `sprechen-teil1`, `sprechen-teil1-prep`, `sprechen-teil1-run`, `sprechen-teil1-result`; CSS classes the wave-E screens consume.

**This task creates the four `.vue` files as minimal placeholders** so the routes resolve; wave E fills them in. Each placeholder is exactly:

```vue
<script setup lang="ts">
// Filled in by the Teil 1 screen tasks.
</script>

<template>
  <div class="page" />
</template>
```

- [ ] **Step 1: Write the failing test**

`tests/router.teil1.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { routes } from '../src/router'

describe('Teil 1 routes', () => {
  const names = (routes as Array<{ name?: string; path: string }>).map(r => r.name)

  it('registers all four stages', () => {
    expect(names).toContain('sprechen-teil1')
    expect(names).toContain('sprechen-teil1-prep')
    expect(names).toContain('sprechen-teil1-run')
    expect(names).toContain('sprechen-teil1-result')
  })

  it('keeps the hyphen-free head so NavShell derives the Sprechen tab', () => {
    for (const n of names.filter(n => n?.startsWith('sprechen'))) {
      expect(n!.split('-')[0]).toBe('sprechen')
    }
  })

  it('paths sit under /sprechen/teil1', () => {
    const byName = new Map((routes as any[]).map(r => [r.name, r.path]))
    expect(byName.get('sprechen-teil1')).toBe('/sprechen/teil1')
    expect(byName.get('sprechen-teil1-prep')).toBe('/sprechen/teil1/prep')
    expect(byName.get('sprechen-teil1-run')).toBe('/sprechen/teil1/run')
    expect(byName.get('sprechen-teil1-result')).toBe('/sprechen/teil1/result')
  })
})
```

If `src/router.ts` does not already export `routes`, export it (`export const routes = [...]`) while keeping the default router export exactly as it is.

- [ ] **Step 2: Run test to verify it fails** → FAIL.

- [ ] **Step 3a: Register the routes**

In `src/router.ts`, insert directly **before** the `sprechen-teil2` block, matching the existing lazy-import style and adding a comment in the same voice:

```ts
  // Teil 1 — ONE continuous Rede, not five composers (ADR-0014). Prep is a real
  // route so it survives a reload, exactly like the runner.
  { path: '/sprechen/teil1', name: 'sprechen-teil1', component: () => import('./modules/sprechen/Teil1Setup.vue') },
  { path: '/sprechen/teil1/prep', name: 'sprechen-teil1-prep', component: () => import('./modules/sprechen/Teil1Prep.vue') },
  { path: '/sprechen/teil1/run', name: 'sprechen-teil1-run', component: () => import('./modules/sprechen/Teil1Runner.vue') },
  { path: '/sprechen/teil1/result', name: 'sprechen-teil1-result', component: () => import('./modules/sprechen/Teil1Result.vue') },
```

- [ ] **Step 3b: Port the Teil-1 CSS blocks**

The design project holds the blocks the Teil 2 import deliberately omitted. Fetch the sheet:

```
ToolSearch: select:DesignSync
DesignSync: { method: "get_file", projectId: "ff880a7a-b49d-4411-8435-65c0519723c4", path: "styles-sprechen.css" }
```

From it, append to `src/styles/sprechen.css` — under a comment `/* ── Teil 1 · Vortrag ── */` — **only** the rules for these selectors, verbatim apart from the notes below:

- The two task sheets: `.spr-ab`, `.spr-ab-ctl`, `.spr-sheet`, `.spr-sheet.sel`, `.spr-sheet-h`, `.spr-sheet-letter`, `.spr-sheet-flags`, `.spr-sheet-t`, `.spr-sheet-task`, `.spr-sheet-glied`, `.spr-sheet-glied li`, `.spr-sheet-glied b`, `.spr-sheet-f`, `.spr-sheet-pick`
- The Gliederung planner: `.spr-plan`, `.spr-plan-row`, `.spr-plan-row.on`, `.spr-plan-n`, `.spr-plan-l`, `.spr-plan-t`, `.spr-plan-h`, `.spr-plan-w`, `.spr-plan-in`
- The time bar and coverage: `.spr-timebar`, `.spr-timebar span`, `.spr-timebar span.ok`, `.spr-timebar-l`, `.spr-cov`, `.spr-cov-row`, `.spr-cov-t`, `.spr-cov-bar`, `.spr-cov-bar span`, `.spr-cov-bar span.ok`, `.spr-cov-w`, `.spr-cov-n`
- The step button used by the rail checklist: `.spr-step-btn`, `.spr-step-btn.done`, `.spr-step-btn.now`
- The drawer's fit modifier: `.spr-move.fit`
- Whatever `@media (max-width: 1080px)` / `(max-width: 720px)` rules in the sheet target **only** the selectors above.

**Omit** every `.spr-secmast*` rule and any rule that only exists for section-at-a-time composition — there is no section masthead in this build (ADR-0014).

**Add** two rules of our own, which the design has no equivalent for, and mark them as deliberate divergences in a comment:

```css
/* Deliberate additions — the design's Teil 1 had no continuous-take composer
   and no Rettungsleine. Both reuse existing tokens only. */
.spr-timebar span.over { background: var(--danger) }
.spr-lifeline { display: flex; align-items: center; gap: 10px; margin-top: 14px; padding: 10px 12px; border-left: 2px solid var(--ochre); background: var(--paper-deep) }
.spr-lifeline-t { font-size: 14px; line-height: 1.5; color: var(--ink-soft); flex: 1 1 auto }
```

- [ ] **Step 3c: Create the four placeholder components** exactly as shown above.

- [ ] **Step 4: Run tests** → `npx vitest run tests/router.teil1.test.ts` → PASS. Then `npm test` → PASS (the placeholders render an empty page and break nothing).
- [ ] **Step 5: Typecheck** → clean. In your report, list every selector you ported and every one you omitted.

---

### Task 13: `Teil1Setup.vue` — the two task sheets

**Files:**
- Modify: `src/modules/sprechen/Teil1Setup.vue` (replace the placeholder)
- Test: `tests/modules/Teil1Setup.test.ts`

**Interfaces:**
- Consumes: `drawThemaPair`, `allThemen`, `doneThemaTitles`, `loadCustomThemen`, `addCustomThemen`, `deleteCustomThema`, `generateThemen` (Task 7); `cachedBankIds` from `useSprechenArguments`; `TEIL1_STASH_KEY`, `Teil1RunStash`, `PREP_SECONDS`, `VortragHelps` (Task 3); `emptyPlan` (Task 6); `GLIEDERUNGSPUNKTE` (Task 1); `findActiveVortrag`, `abandonVortrag` (Task 5); `useSettings`, `resolveAiClient`, `useToast`, `isSpeechRecognitionSupported`.
- Produces: a `Teil1RunStash` in `sessionStorage[TEIL1_STASH_KEY]` and navigation to `sprechen-teil1-prep` (or `-run` when prep is off).

**Read first, in this order:** `src/modules/sprechen/Teil2Setup.vue` in full — it holds the `micSupported` detection, the modality defence-in-depth, the resume banner, the effective-modality downgrade in `start()`, and the localStorage setup persistence, all of which must survive here. Then fetch the design's markup and copy:

```
DesignSync: { method: "get_file", projectId: "ff880a7a-b49d-4411-8435-65c0519723c4", path: "sprechen-teil1.jsx" }
```

Port `Spr1Setup`'s **markup and copy**, ignoring its demo data (`SPR1_TOPICS`, `t.done`, `t.cached` come from real sources here) and its two-field control bar, which becomes six.

**Screen requirements:**

1. **Header** — breadcrumb `Sprechen Teil 1 · Etappe 01`, title `Themenwahl.`, the design's subtitle verbatim, and the right-hand `Vortragslänge · ca. 4 Minuten` block.
2. **Two `.spr-sheet` panels** in `.spr-ab`, from `drawThemaPair()`. Each prints `Thema A` / `Thema B`, the flags (`✓ gehalten` when `doneThemaTitles().has(t.titleDe)`, `Argumente im Cache` when `cachedBankIds()` contains its id, `generiert` when `source === 'custom'`), the `titleDe`, the `taskDe`, **all five `GLIEDERUNGSPUNKTE` as an `<ol class="spr-sheet-glied">` with `labelDe` bold and `hintDe` after it**, the tags, and the pick affordance. Selecting sets `pick`.
3. **Füllbarkeits-Check** — beneath each sheet, three toggle chips: `eigenes Beispiel?`, `drei Wörter?`, `Meinung?`, with a `2/3` counter. Component-local `ref` only — **never** written to the stash, to Dexie, or to history, and it never blocks the CTA. Add a one-line note: *„Nur für dich — wird nicht gespeichert."*
4. **Control bar** (`.spr-ab-ctl`): `Andere zwei Themen ziehen` (redraw + clear `pick`), `Alle {n} Themen` (toggles the `.spr-tlist` ledger, custom rows deletable), and `5 neue Themen generieren` (gated on `canUseAi`, appends in place via `addCustomThemen`, toast on failure, `ai-cost-note` beneath saying `1 Call`).
5. **Prüfungskarte fields** — six `.spr-fld` segmented rows, in this order: **Modalität** (`getippt` / `gesprochen`, the second disabled with the Teil-2 hint when `!micSupported`), **Vorbereitungszeit** (`Aus` / `3 Min` / `15 Min` from `PREP_SECONDS`), **Hilfen** (`An`/`Aus`), **Live-Checkliste** (`An`/`Aus`), **KI-Tipp** (`An`/`Aus`, disabled when `!canUseAi`), **Zeitlimit 4:00** (`Hart`/`Weich`) — and that last field **must not render at all when the modality is `getippt`** (spec §3). Persist all of it to `localStorage['sprechenTeil1Setup']`.
6. **Resume banner** — when `findActiveVortrag()` returns a row, offer `Vortrag fortsetzen` (navigate to `sprechen-teil1-run`) and `Verwerfen` (`abandonVortrag`), exactly as Teil 2 does.
7. **CTA** — `btn btn-accent btn-meta`, disabled until a sheet is picked. `.bm-main` reads `Vorbereitung →` when prep > 0 else `Vortrag halten →`; `.bm-sub` echoes `{titleDe} · 5 Gliederungspunkte · {modalityWord}`. On click, write the stash with `plan: emptyPlan()`, `notes: ''`, the resolved `helps` (with `hardLimit` forced `false` when typed), and `model: settings.model`, then navigate.

- [ ] **Step 1: Write the failing test** — `tests/modules/Teil1Setup.test.ts`, following `tests/modules/Teil2Setup.test.ts`'s mocking style. Cover at minimum:

```
- renders exactly two .spr-sheet panels
- each sheet prints all five Gliederungspunkte with their hints
- picking a sheet enables the CTA; before that it is disabled
- the Füllbarkeits-Check counter goes 0/3 → 1/3 on a chip click and writes nothing to localStorage
- the Zeitlimit field is absent when the modality is typed and present when spoken
- the gesprochen option is disabled when speech recognition is unsupported
- the KI-Tipp field is disabled when canUseAi is false
- 'Andere zwei Themen ziehen' redraws and clears the selection
- 'Alle N Themen' toggles the ledger list
- a done Vortragsthema renders the ✓ gehalten flag
- start() writes a Teil1RunStash with five plan entries, all keywords empty, and hardLimit false when typed
- start() navigates to sprechen-teil1-prep when prep > 0 and to sprechen-teil1-run when prep is 0
- an active Vortrag renders the resume banner, and Verwerfen calls abandonVortrag
```

- [ ] **Step 2: Run it and watch it fail.**
- [ ] **Step 3: Implement the screen.**
- [ ] **Step 4: `npx vitest run tests/modules/Teil1Setup.test.ts`** → PASS.
- [ ] **Step 5: `npm run typecheck`** → clean.

---

### Task 14: `Teil1Prep.vue` — the Gliederung planner

**Files:**
- Modify: `src/modules/sprechen/Teil1Prep.vue`
- Test: `tests/modules/Teil1Prep.test.ts`

**Interfaces:**
- Consumes: the stash from Task 13; `GLIEDERUNGSPUNKTE`, `vortragClock`, `KONNEKTOREN` (Task 1); `emptyPlan` (Task 6); `resolveArgumentBank`, `loadCachedBank`, `saveCachedBank`, `generateArgumentBank`; `useSettings`, `useToast`.
- Produces: the same stash with `plan` and `notes` filled, then navigation to `sprechen-teil1-run`.

**Read first:** `src/modules/sprechen/Teil2Prep.vue` in full — the countdown, the pause/stop controls, the bank resolution with its `scopeLabel`, the regenerate button with its `ai-cost-note`, and the stash round-trip all carry over. Then port `Spr1Prep`'s markup from the design file fetched in Task 13.

**Screen requirements:**

1. **Guard** — no stash → the `alert alert-info` *„Kein Thema gewählt — die Vorbereitung braucht ein Aufgabenblatt."* plus a back button, exactly as Teil 2 does.
2. **Mast** — `Aufgabenblatt · {titleDe}`, the `taskDe` as `.spr-prep-stmt`, a `.spr-sides` row reading `Fünf Punkte · {n} geplant · Ziel {vortragClock(VORTRAG_TARGET_WORDS)} · Modus {modalityWord}`, and the `.spr-timer` countdown from `stash.prepSeconds` with Pause / Stopp. Expiry turns red and says *„Zeit vorbei — starten geht weiter"*; it never forces the start.
3. **Gliederung planner** — five `.spr-plan-row`s. Each: `.spr-plan-n` zero-padded, `.spr-plan-t` = `labelDe`, `.spr-plan-h` = `hintDe`, `.spr-plan-w` = `~{words} Wörter · {vortragClock(words)}`, and a `.spr-plan-in` text input bound to that point's keyword. `.on` when the keyword is non-empty. Above the block, the header *Gliederung* with the note *„Ein Stichwort pro Punkt · wird im Vortrag mitgezählt"*.
4. **Erfahrungs-Ausgrabung** — pinned beside the `erfahrung` row (below it on narrow widths): the three fixed questions *Wann hattest du damit zu tun? · Was hast du gemacht? · Was kam dabei heraus?* under a `.spr-lbl` reading `Beispiel ausgraben`. Static text, no AI, never varied.
5. **Konnektoren-Palette** — a block of `KONNEKTOREN` groups; each word is a button that appends itself to the notes textarea. Header note: *„Signalwörter — genau die Stellen, an denen ein Vortrag sonst abbricht."*
6. **Argumentenspeicher** — reuse Teil 2's two-column `.spr-angles` block wholesale, but relabel: left `Dafür spricht`, right `Dagegen spricht`, and a one-line note that both belong in *Vor- und Nachteile*. Resolve the bank by `thema.id` + tags through `loadCachedBank` → `resolveArgumentBank`; keep the `scopeLabel` wording honest about AI vs bundled; keep the regenerate button gated on `canUseAi`.
7. **Wortschatz + Kollokationen** — the existing six-word `.spr-wordstrip`, plus a **second row** rendering `bank.phrases` when present, labelled `Wortverbindungen`. Absent field → the second row simply does not render.
8. **Notes** — `.spr-notes` textarea, placeholder generated from the bank's first pro and contra claims, as Teil 2 does.
9. **CTA** — `Vortrag halten →` with `.bm-sub` = `{n} von 5 Punkten geplant`. Writes `plan` + `notes` back to the stash and navigates. Never blocked by an unfinished plan.

- [ ] **Step 1: Write the failing test** covering at least:

```
- no stash → renders the guard alert and no planner
- renders five .spr-plan-row rows in Gliederungspunkt order with their hints and word targets
- typing a keyword marks that row .on and bumps the "n geplant" counter
- the three Erfahrungs-Ausgrabung questions are present, verbatim
- clicking a Konnektor appends it to the notes textarea
- the Wortverbindungen row renders when bank.phrases exists and is absent when it does not
- the countdown ticks down and the expiry note appears at 0 without forcing navigation
- the CTA writes plan and notes into the stash and navigates to sprechen-teil1-run
- the regenerate button is disabled when canUseAi is false
```

- [ ] **Step 2: Fail.** — [ ] **Step 3: Implement.** — [ ] **Step 4: PASS.** — [ ] **Step 5: Typecheck clean.**

---

### Task 15: `Teil1Runner.vue` — one continuous Rede, then the Nachfrage

**Files:**
- Modify: `src/modules/sprechen/Teil1Runner.vue`
- Test: `tests/modules/Teil1Runner.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1, 3, 5, 6, 9, 10; `useSpeechRecognizer`, `useSpeechVoice`, `matchRedemittel`, `pickMoveNudge`, `lifetimeCounts`, `bumpRedemittelYield`, `appendCorrections`, `saveQuizRun`, `sentenceAround`.
- Produces: a graded Run, a `Teil1ResultStash`, archived corrections, a bumped yield, and a deleted Vortrag row.

**This is the largest screen. Read `src/modules/sprechen/Teil2Runner.vue` in full before writing anything** — the recognizer wiring, the `runRecorded` double-record guard, the grade pipeline and the archive write are all there and must be reproduced faithfully. Port the rail, drawer and composer markup from the design's `Spr1Run` (fetched via DesignSync as in Task 12), but **not** its section stepper: there is one composer, not five (ADR-0014).

**Screen requirements:**

1. **Boot** — read the stash; no stash and no active Vortrag → guard alert + back to setup. With a stash, `createVortrag(...)` once; with an active row and no stash, resume it. Persist the Rede to Dexie on a debounce (typed: 1 s after the last keystroke; spoken: on each committed final) via `saveRede`, so a dead tab loses nothing.
2. **Rail** (`.spr-rail`, sticky) — four sections:
   - `Aufgabenblatt · {titleDe}` + the `taskDe`.
   - **Live-Checkliste**, only when `helps.checklist`: one `.spr-step-btn` per `PunktSignal` from `planSignals(v.plan, redeText)`, `.done` when `said`, showing `labelDe` and the planned keyword (or `—` when empty). **One dot per row. No per-point word count. The label is `gesagt`, never `abgedeckt`.**
   - **Redezeit**, same switch: `.spr-timebar` with the fill width from `redezeit(...).pct` and the class from `.band` (`ok` / `over`), plus `{words} Wörter` and the clock.
   - **Vortragsmittel** dots: 35 `.spr-used-dot`s, `.on` for each id in `matchRedemittel([redeText, nachfrageAnswer], SPRECHEN_VORTRAGSMITTEL)`.
   - The prep notes, when non-empty.
3. **Composer** — one field for the whole Rede.
   - *typed*: a tall textarea. Word count beneath; when `helps.hardLimit` is somehow true it is ignored (typed has no limit).
   - *spoken*: the Teil 2 mic surface — start/stop, `liveText`, the mic hint. On `end()`, append the returned `text` to the Rede and accumulate `seconds`, `restarts` and `spans`. `not-allowed` → downgrade to typed for the remainder, toast, and record the downgrade for the result page.
   - **Hard limit**: when `helps.hardLimit` and `hardLimitReached(...)`, commit the text first, then close the recognizer, then show a `Zeit vorbei — der Vortrag ist beendet` notice and move to the Nachfrage. The limit must never cost text already spoken.
4. **Help surface**, all gated on `helps.hints`:
   - **Move nudge** — `.spr-nudge` reading `Diesmal {label}`, from `pickMoveNudge([redeText], lifetimeCounts(SPRECHEN_VORTRAGSMITTEL), SPRECHEN_VORTRAGSMITTEL, VORTRAG_MOVES)`, shown once the Rede passes ~40 words, dismissible for the run.
   - **Drawer** — `.spr-drawer` with the two tabs *Wie* (Vortragsmittel) and *Was* (the argument angles). In *Wie*: the seven `.spr-move` chips with `.fit` on those from `outlinedMoves(furthestReachedPunkt(signals))`, `·neu` on groups whose lifetime count is zero, and the phrase list where a tap **inserts the stub at the caret** (typed) and already-used phrases read `schon benutzt` instead of their gloss. Each phrase also carries a **speaker button** calling `useSpeechVoice().speak(phraseDe)` when `voice.supported && voices.length > 0` — hearing it before saying it is the point.
   - **Rettungsleine** — a `.spr-lifeline` strip with one rotating line from `RETTUNGSLEINEN` and a `Nächste` button. Copy above it: *„Zeit gewinnen ist Prüfungsstoff, keine Ausrede."*
   - **Stuck-Erkennung** — typed: 20 s without a keystroke; spoken: two consecutive recognizer restarts. On trigger, raise the Rettungsleine and the nudge, and **offer** the KI-Tipp once per run when `helps.kiTipp`. It must never spend a call by itself.
   - **KI-Tipp** — `✦ KI-Tipp · 1 Call`, rendered whenever `helps.kiTipp && canUseAi`, **independently of `helps.hints`**. Calls `generateVortragKiTipp`, then `incrementVortragKiTipp`; failure is a toast only. Renders into a cobalt-ruled `.spr-kitipp` block.
   - Every one of drawer-open, phrase-insert, Rettungsleine, nudge-shown, KI-Tipp, vorsprechen calls `logHelp(v.id, kind)`.
5. **Nachfrage phase** — `Vortrag beenden` (or the hard limit) → `saveRede`, then `generateNachfrage`. Show the Rede read-only as a `.spr-proto` block, the question as a partner turn, and one answer composer in the same Modality. The drawer switches its *Wie* tab to the `nachfrage` Move group. On call failure: a retry action, and after repeated failure a `Ohne Nachfrage abgeben` escape that proceeds to grading with `nachfrage` left undefined.
6. **Grade pipeline** — on submit: `saveNachfrage`, `markVortragSubmitted`, `gradeVortrag`. On success, in this order and **once only**, behind a `runRecorded` guard copied from Teil 2:
   1. `matchRedemittel([rede, nachfrageAnswer], SPRECHEN_VORTRAGSMITTEL)` → `bumpRedemittelYield(ids, finishedAt)`.
   2. `appendCorrections(...)` for every mistake — `part: 1`, `discussionId: v.id`, `topicTitle: thema.titleDe`, `modality`, `kind`, `quote`, `suggested`, `reasonDe`, `reasonEn`, and `context` from `sentenceAround(anchorText, m.spanStart)`. **Aufwertungen are not archived.**
   3. `saveQuizRun({ type: 'sprechen-teil1', ... })` with the meta from Task 11 — `sectionsCovered` from the **grader's** coverage, `wordCount` always, `spokenSeconds` only when spoken.
   4. Write `sessionStorage[VORTRAG_RESULT_KEY]`, then `deleteVortrag(v.id)`, then navigate to `sprechen-teil1-result`.
   On grade failure the row stays `submitted` and the screen offers `Analyse erneut versuchen`.

- [ ] **Step 1: Write the failing test** covering at least:

```
- no stash and no active Vortrag → guard alert
- renders ONE composer, not five: exactly one textarea/mic surface for the Rede
- the rail renders five checklist rows with one dot each and no per-point word count
- a planned keyword appearing in the Rede lights exactly its own row
- the checklist and the Redezeit bar are both absent when helps.checklist is false
- the drawer, the nudge and the Rettungsleine are all absent when helps.hints is false
- the KI-Tipp button renders with helps.hints false and helps.kiTipp true
- the KI-Tipp button is absent when helps.kiTipp is false
- tapping a phrase inserts its stub into the composer and logs a help
- the outlined Move groups follow the furthest reached point
- 'Vortrag beenden' requests a Nachfrage and renders the question
- a failed Nachfrage offers a retry and, after that, 'Ohne Nachfrage abgeben'
- the grade pipeline records exactly one Run even when submit fires twice
- corrections are archived with part: 1 and Aufwertungen are not archived at all
- the Vortrag row is deleted only after saveQuizRun succeeded
- a failed grade leaves the row submitted and offers a retry
- the hard limit is ignored in a typed run
```

- [ ] **Step 2: Fail.** — [ ] **Step 3: Implement.** — [ ] **Step 4: PASS.** — [ ] **Step 5: Typecheck clean.**

---

### Task 16: `Teil1Result.vue` — the Auswertung

**Files:**
- Modify: `src/modules/sprechen/Teil1Result.vue`
- Test: `tests/modules/Teil1Result.test.ts`

**Interfaces:**
- Consumes: `VORTRAG_RESULT_KEY`, `Teil1ResultStash` (Task 10); `SPRECHEN_B2_TEIL1`, `sprechenDescriptor`, `sprechenNotes` (Task 3); `GLIEDERUNGSPUNKTE`, `SPRECHEN_VORTRAGSMITTEL`, `VORTRAG_MOVES`, `VORTRAG_MOVE_LABEL` (Task 1); `reAnchor`; `redezeit` (Task 6).

**Read first:** `src/modules/sprechen/Teil2Result.vue` — the DE/EN toggle, the criterion bars reading descriptors from the rubric, the segmented marked-transcript renderer and its detail card, and the archive CTA all carry over. Port `Spr1Result`'s markup and copy from the design file.

**Blocks, in this exact order:**

1. **Header** — breadcrumb `Sprechen Teil 1 · Etappe 04`, title `Auswertung.`, a subtitle naming the Vortragsthema, `{n} von 5 Gliederungspunkten`, the Redezeit, and whether the Nachfrage was answered. DE/EN segmented toggle, default `de`, remembered in `localStorage['sprechenTeil1Setup']`. `Neuer Vortrag →`.
2. **Verdict** — `.spr-verdict`: the score at `.spr-vscore` with ` / 100`, the `.spr-stamp` Prädikat, `sprechenNotes(SPRECHEN_B2_TEIL1, modality)` beneath it, and the four `.spr-vcrit` bars. Each bar shows the AI justification **and** `sprechenDescriptor(criterion, modality)` in mute italic — read from the rubric, never paraphrased. In a **typed** run, add one line stating that Redezeit was estimated from the word count, not measured.
3. **Gliederung coverage** — `.spr-cov`, one row per `GLIEDERUNGSPUNKTE` entry: the grader's `covered` dot, the label, the grader's `note`, **and beside it the rail's keyword signal** (`gesagt: „Freistellung"` / `kein Stichwort geplant`) so *saying the word you planned* and *covering the point* are visibly different claims. **No word bar and no per-point word count.**
4. **Vortragsmittel-Ausbeute** — a Teil-1 `SprYield` equivalent over `VORTRAG_MOVES` and `stash.vortragsmittel`. Either extend `src/components/sprechen/SprYield.vue` with optional `moves` / `bank` / `labels` props defaulting to the Teil 2 values, or add `SprVortragYield.vue` beside it — your call, but if you extend `SprYield.vue` its existing test must still pass untouched.
5. **Marked Rede** — `.spr-proto` with the Rede as one learner turn labelled `Vortrag` and, when present, the Nachfrage question and answer as two further turns. Mistake spans are `.spr-mistake` buttons; **re-anchor every span with `reAnchor(quote, text)` at render time** rather than trusting the stored offsets. Tapping opens one `.spr-mkcard` with Art / Du / Besser / Warum. Kind counts as chips beneath.
6. **Aufwertungen** — its own block, styled in clay, **not** danger, headed `Aufwertungen` with the note *„Keine Fehler — so klingt es auf B2 besser."* Each entry: the quote, the better wording, and the why in the selected language. Absent or empty → the block does not render.
7. **Nachfrage** — when it exists, the exchange; when it does not, one line saying no question was asked and that Erfüllung was not docked for it.
8. **Hilfe-Protokoll** — from `stash.helpLog`: totals per `HelpKind` plus a minute-by-minute distribution relative to `startedAt`. A line stating plainly that this is descriptive and affects no score.
9. **Stärken / Schwächen / Gesamturteil**, then the **archive and drill CTA** — the Teil 2 wording, adjusted to say that Vortrag and Diskussion write into the same archive.
10. **One-time view** — fed from the sessionStorage stash. No stash → a guard alert and a link back to `sprechen`.

- [ ] **Step 1: Write the failing test** covering at least:

```
- no stash → guard alert, no verdict
- renders the score, the Prädikat stamp and four criterion bars
- each bar shows the Teil-1 rubric descriptor verbatim from rubrics.ts
- the typed run adds the word-proxy note; the spoken run does not
- the coverage table has five rows, no word bar, and shows the keyword signal beside the grader's dot
- the DE/EN toggle flips justifications, reasons and Aufwertung whys
- a mistake span is a button and opens the detail card with Art / Du / Besser / Warum
- spans are re-anchored at render time, and a mistake whose quote is absent renders no button
- the Aufwertungen block renders in its own section and never inside the mistake counts
- the Aufwertungen block is absent when there are none
- the Nachfrage block says so when no question was asked
- the Hilfe-Protokoll reports counts and states it is descriptive
- the Vortragsmittel yield renders seven Move columns
```

- [ ] **Step 2: Fail.** — [ ] **Step 3: Implement.** — [ ] **Step 4: PASS.** — [ ] **Step 5: Typecheck clean.**

---

### Task 17: The hub goes live

**Files:**
- Modify: `src/modules/sprechen/SprechenHome.vue`
- Test: `tests/modules/SprechenHome.test.ts` (rewrite the dead-panel cases)

**Screen requirements:**

1. **The Teil 1 panel becomes live** — drop `.dead`, `disabled` and the `In Vorbereitung` stamp; add a `.spr-part-go` reading `Starten →` and a click handler navigating to `sprechen-teil1`. Its `.spr-part-stats` read from `sprechen-teil1` Runs: `{n} Themen offen` of `SPRECHEN_VORTRAGSTHEMEN.length` (using `doneThemaTitles`, the same function the draw uses, so the two can never disagree), `zuletzt {score}` / `noch keine`, and `{n} Vorträge`.
2. **One part toggle** — a segmented `Teil 1` / `Teil 2` control near the masthead driving **both** the `SprCriterionBars` panel and the Redemittel-Ausbeute block. Teil 1 selected → bars from the latest `sprechen-teil1` Run per Modality against `SPRECHEN_B2_TEIL1`, and the Ausbeute over `SPRECHEN_VORTRAGSMITTEL` with `lifetimeCounts(SPRECHEN_VORTRAGSMITTEL)`. Teil 2 selected → exactly today's behaviour. Persist the choice in `localStorage['sprechenTeil1Setup']`.
3. **Merged recents** — one date-sorted list over both types, each row labelled with its part. Teil 1 rows show `{n}/5 Punkte` and the Redezeit where a Teil 2 row shows `{n} Beiträge`.
4. **Masthead copy** — the subtitle currently says Teil 2 is the built one. Rewrite it so it describes both parts as live, keeping the register.
5. **Cheatsheet row** — its description mentions `Teil 2` only; widen it to cover both banks and update its meta counts to `SPRECHEN_REDEMITTEL.length + SPRECHEN_VORTRAGSMITTEL.length`.

- [ ] **Step 1** Rewrite the three dead-panel tests (`marks the Teil 1 panel dead…`, `does not navigate when the Teil 1 panel is clicked`, `does not render a Teil 1 / Teil 2 yield toggle`) into their live equivalents, and add: the part toggle switches the bars and the Ausbeute; a Teil 1 Run appears in the merged recents labelled with its part; the Teil 1 panel navigates to `sprechen-teil1`. Keep every other existing case passing untouched.
- [ ] **Step 2: Fail.** — [ ] **Step 3: Implement.** — [ ] **Step 4: `npx vitest run tests/modules/SprechenHome.test.ts`** → PASS. — [ ] **Step 5: Typecheck clean.**

---

### Task 18: The cheatsheet gains its Teil 1 tab

**Files:**
- Modify: `src/modules/sprechen/SprechenCheatsheet.vue`
- Test: `tests/modules/SprechenCheatsheet.test.ts` (extend)

**Screen requirements:**

1. A `Teil 1 · Vortrag` / `Teil 2 · Diskussion` segmented control, Teil 2 selected by default so the existing behaviour is what a returning learner sees first.
2. The **Teil 1 tab** shows: a Bauplan mast walking the five `GLIEDERUNGSPUNKTE` (`Einstieg → Situation → Vor & Nachteile → Erfahrung → Fazit`) with each one's `hintDe`, `words` and `vortragClock(words)`; a rubric summary read from `SPRECHEN_B2_TEIL1` (labels, maxima, passing score — never re-typed); and the seven `VORTRAG_MOVES` groups with all 35 phrases, each carrying a filled/hollow lifetime-usage dot from `lifetimeCounts(SPRECHEN_VORTRAGSMITTEL)`.
3. A short *Strategie* chapter for Teil 1: choose the sheet you can fill, plan one keyword per point, announce your structure and keep it, and buy time in German rather than in silence.
4. The **Teil 2 tab is byte-for-byte what it is today.**

- [ ] **Step 1** Extend the test: the part control exists; Teil 2 is the default and its existing assertions still hold; switching to Teil 1 renders 35 phrases, seven group headings, the five Gliederungspunkte and the Teil-1 rubric labels; the two banks are never shown at the same time.
- [ ] **Step 2: Fail.** — [ ] **Step 3: Implement.** — [ ] **Step 4: PASS.** — [ ] **Step 5: Typecheck clean.**

---

## Release (controller only, after wave F)

- [ ] `npm run typecheck` → clean
- [ ] `npm test` → all green
- [ ] Prepend a `1.17.00` / `kind: 'module'` entry to `CHANGELOG` in `src/data/changelog.ts`, set `APP_VERSION = '1.17.00'`
- [ ] Sync `package.json` `version` to `1.17.00`
- [ ] Commit, merge to `main`, push, `npm run deploy`

## Self-Review

**Spec coverage.** Every numbered spec section maps to a task: §0 vocabulary → 1/2/3; §1 flow → 12 + 13–16; §1 working state → 5; §2 data → 1/2/3 + 8; §3 stage 01 → 13; §3 stage 02 → 14; §3 stage 03 → 15 (helps) + 6 (checklist/timer) + 9 (KI-Tipp); §3 stage 04 → 16; §4 grading → 10; §4b result order → 16; §5 persistence → 11 + 8 + 5; §6 code sharing → 4 + 8 + 10; §7 cheatsheet → 18; §8 error handling → 5/9/10/15; §9 testing → distributed across every task; §10 release → the Release section. The hub, which the spec covers under §1, is Task 17.

**Deliberate omissions, restated so nobody adds them back:** no Mustergliederung, no Mustervortrag, no cross-run coaching store, no Wiederholung-ohne-Hilfen comparison, no Hilfestufen ladder, no help budget, no adaptive fading, no Satzanfang-Bank, no section-at-a-time composition, no per-point word measurement, no Aussprache scoring, no `part` index on `sprechenCorrections`, no backfill of `part`.

**Type consistency.** `GliederungKey` is used identically in Tasks 1, 3, 6, 10 and 16. `VortragMove` in 1, 4, 6, 15, 16, 18. `PunktSignal` is produced in 6 and consumed in 9, 15, 16. `Teil1RunStash` is written in 13, read in 14 and 15. `Teil1ResultStash` is written in 15 and read in 16. `matchRedemittel`'s optional bank parameter (Task 4) is what makes 15, 16, 17 and 18 possible without a second matcher.

