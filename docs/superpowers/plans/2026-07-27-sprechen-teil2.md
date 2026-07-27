# Sprechen Teil 2 (Diskussion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new Sprechen module for Goethe B2 speaking practice: a typed Discussion with an AI partner on a Topic, a tabbed Redemittel cheatsheet, layered hints (static Moves + on-demand KI-Tipp), and a post-Discussion analysis graded 0–100 against an adapted Goethe B2 rubric with a one-time marked transcript.

**Architecture:** Transcript-in-prompt single-shot AI calls (existing `AiClient` pattern, works with Gemini and local-Claude). Active Discussion state lives in a new Dexie `sprechenDiscussions` table (ephemeral: deleted after the Run is recorded or abandoned). The grade result is stashed in `sessionStorage['gt:lastSprechenResult']` for the one-time result page; history keeps a summary-only Run (`type: 'sprechen-teil2'`). Topics: 100 seeded in a static data file + AI-generated ones persisted in `localStorage['gt:sprechenCustomTopics']`; done-topic memory reads from Run meta via `loadHistory()`.

**Tech Stack:** Vue 3 + TypeScript + Vite, Dexie/IndexedDB, `@google/genai` via `resolveAiClient`, vitest + jsdom + fake-indexeddb. No new dependencies.

**Authoritative spec:** `docs/superpowers/specs/2026-07-27-sprechen-teil2-design.md` (read it before starting; terminology in `CONTEXT.md` → Sprechen section: Discussion, Topic, Sprechen error tag, Move, KI-Tipp, Prädikat).

**Repo conventions that bind every task:**
- `npm run build` runs `vue-tsc --noEmit` first — the codebase is strict-clean; no `any`, no unused vars.
- Tests: `npx vitest run <file>` for one file, `npx vitest run` for all. `tests/setup.ts` already wires jsdom + fake-indexeddb.
- Commit after every task (small, imperative messages, prefix `feat(sprechen):` / `test(sprechen):` / `chore(release):`).
- The duck-typed `GeminiClient` interface is re-declared per composable (existing convention — do NOT try to centralize it).
- AI temperatures: generators 0.85–0.9 / topP 0.95, graders 0, KI-Tipp 0.7.

---

## File structure

**Create:**

| File | Responsibility |
|---|---|
| `src/data/sprechenTopics.ts` | `SprechenTopic` type, `TOPIC_TAGS`, 100 seeded Topics, `TOPIC_GENERATOR_SCHEMA` |
| `src/data/sprechenRedemittel.ts` | `Move` type + labels, `Redemittel` phrase bank (7 groups), `HINT_MOVES` |
| `src/data/sprechen.ts` | Discussion domain types (`SprechenDiscussion`, `DiscussionTurn`, `TurnTarget`, `PartnerStance`, statuses) |
| `src/composables/useSprechenDiscussion.ts` | Dexie CRUD lifecycle: create / find-active / resume / append turn / mark submitted / delete |
| `src/composables/useSprechenPartner.ts` | Partner-turn prompt builder + schema + validator + retry loop; KI-Tipp call |
| `src/composables/useSprechenTopics.ts` | Custom-Topic pool (localStorage), random picker, done-Topic memory, Topic generator |
| `src/composables/useSprechenGrader.ts` | `SprechenGradeResult` types, grade schema, strict validator with per-turn quote re-anchoring, grader call |
| `src/modules/sprechen/SprechenHome.vue` | Module home: cheatsheet + Teil 2 cards, recent Runs list |
| `src/modules/sprechen/SprechenCheatsheet.vue` | Tab-rail cheatsheet (single Teil 2 tab): Redemittel chapters + strategy |
| `src/modules/sprechen/Teil2Setup.vue` | Topic picker / generator / turn target / stance / hints; resume-or-abandon gate |
| `src/modules/sprechen/Teil2Runner.vue` | Chat runner: turns, hints panel, KI-Tipp, finish → grade → record → result |
| `src/modules/sprechen/Teil2Result.vue` | One-time result: score + Prädikat, criteria, marked transcript, DE/EN toggle |
| `tests/data/sprechenTopics.test.ts` | Seed integrity |
| `tests/data/sprechenRedemittel.test.ts` | Phrase-bank integrity |
| `tests/data/rubrics.sprechen.test.ts` | Rubric shape + Prädikat bands |
| `tests/composables/useSprechenDiscussion.test.ts` | Lifecycle on fake-indexeddb |
| `tests/composables/useSprechenPartner.test.ts` | Prompt builders, validator, retry |
| `tests/composables/useSprechenTopics.test.ts` | Pool persistence, picker, generator validation |
| `tests/composables/useSprechenGrader.test.ts` | Validator: sums, pass flag, re-anchoring, dropped mistakes |

**Modify:**

| File | Change |
|---|---|
| `src/data/rubrics.ts` | Append `SPRECHEN_B2_TEIL2` rubric + `Praedikat` type + `praedikat()` helper |
| `src/db/index.ts` | `version(9)` adding `sprechenDiscussions` table |
| `src/composables/useQuizHistory.ts` | `'sprechen-teil2'` type, `SprechenErrorTag`, meta fields |
| `src/components/charts/quiz-type-labels.ts` | 3 exhaustive maps |
| `src/composables/useLevelAssessment.ts` | `TYPE_LABEL` entry |
| `src/composables/useQuizStats.ts` | `zeroRunsByType` + `zeroAccuracyByType` entries |
| `src/modules/history/HistoryPage.vue` | `QUIZ_TYPES` map + `typeOrder` entry |
| `src/composables/useUserData.ts` | `USER_DATA_KEYS` + `KEY_LABELS` for the 2 new localStorage keys |
| `src/router.ts` | 5 routes (`sprechen*` names — hyphen-free head) |
| `src/components/NavShell.vue` | Nav item |
| `src/modules/home/Home.vue` | Module card IX · Sprechen (Settings → X), breadcrumb `I/X` |
| `src/data/changelog.ts` | `APP_VERSION = '1.13.00'`, `kind: 'module'` entry |
| `package.json` | version `1.13.00` |

Dependency order: Tasks 1–4 (data + db) → 5–8 (composables) → 9 (history plumbing) → 10–15 (UI) → 16 (release). Tasks 1, 2, 3 are mutually independent; 5–8 each depend only on 1–4.

---

### Task 1: Seeded Topics dataset

**Files:**
- Create: `src/data/sprechenTopics.ts`
- Test: `tests/data/sprechenTopics.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/data/sprechenTopics.test.ts
import { describe, expect, it } from 'vitest'
import { SPRECHEN_TOPICS, TOPIC_TAGS } from '../../src/data/sprechenTopics'

describe('sprechenTopics seed', () => {
  it('contains exactly 100 topics', () => {
    expect(SPRECHEN_TOPICS.length).toBe(100)
  })

  it('has unique ids', () => {
    const ids = new Set(SPRECHEN_TOPICS.map(t => t.id))
    expect(ids.size).toBe(SPRECHEN_TOPICS.length)
  })

  it('has unique titles (done-topic memory keys on titleDe)', () => {
    const titles = new Set(SPRECHEN_TOPICS.map(t => t.titleDe))
    expect(titles.size).toBe(SPRECHEN_TOPICS.length)
  })

  it('every topic is a well-formed seed entry', () => {
    for (const t of SPRECHEN_TOPICS) {
      expect(t.id).toMatch(/^st-[a-z0-9-]+$/)
      expect(t.titleDe.length).toBeGreaterThan(2)
      expect(t.statementDe.length).toBeGreaterThan(10)
      expect(t.level).toBe('B2')
      expect(t.source).toBe('seed')
      expect(t.tags.length).toBeGreaterThan(0)
      for (const tag of t.tags) expect(TOPIC_TAGS).toContain(tag)
    }
  })

  it('spreads across all ten tags (at least 8 topics each)', () => {
    for (const tag of TOPIC_TAGS) {
      const n = SPRECHEN_TOPICS.filter(t => t.tags.includes(tag)).length
      expect(n).toBeGreaterThanOrEqual(8)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/data/sprechenTopics.test.ts`
Expected: FAIL — cannot resolve `../../src/data/sprechenTopics`.

- [ ] **Step 3: Write the dataset**

```ts
// src/data/sprechenTopics.ts
//
// Sprechen Teil 2 — seeded Topics (see CONTEXT.md → "Topic").
// 100 hand-authored controversial statements in the exam's format. There is
// no Dexie table for Topics (writingPrompts.ts convention): adding seeds is
// a code change; `source: 'custom'` marks AI-generated Topics living in
// localStorage['gt:sprechenCustomTopics'] (see useSprechenTopics.ts).

export const TOPIC_TAGS = [
  'Umwelt', 'Arbeit', 'Technologie', 'Bildung', 'Gesundheit',
  'Medien', 'Gesellschaft', 'Reisen', 'Konsum', 'Familie'
] as const

export type TopicTag = (typeof TOPIC_TAGS)[number]

export interface SprechenTopic {
  id: string                 // 'st-umwelt-autofreie-innenstadt' / custom: 'st-custom-<epoch>-<i>'
  titleDe: string            // short label, unique — the done-topic memory key
  statementDe: string        // the controversial statement/question the Discussion argues
  tags: TopicTag[]
  level: 'B2'
  source: 'seed' | 'custom'
}

const T = (id: string, titleDe: string, statementDe: string, tags: TopicTag[]): SprechenTopic =>
  ({ id, titleDe, statementDe, tags, level: 'B2', source: 'seed' })

export const SPRECHEN_TOPICS: SprechenTopic[] = [
  // ── Umwelt ──────────────────────────────────────────────────────
  T('st-umwelt-autofreie-innenstadt', 'Autofreie Innenstädte', 'Sollten Autos aus den Innenstädten verbannt werden?', ['Umwelt']),
  T('st-umwelt-kurzstreckenfluege', 'Kurzstreckenflüge', 'Sollten Kurzstreckenflüge stark besteuert oder ganz verboten werden?', ['Umwelt', 'Reisen']),
  T('st-umwelt-einwegplastik', 'Einwegplastik', 'Sollte Einwegplastik komplett verboten werden?', ['Umwelt', 'Konsum']),
  T('st-umwelt-fleischpreis', 'Teureres Fleisch', 'Sollte Fleisch teurer werden, um das Klima zu schützen?', ['Umwelt', 'Gesundheit']),
  T('st-umwelt-atomkraft', 'Atomkraft', 'Ist Atomkraft eine gute Lösung gegen den Klimawandel?', ['Umwelt', 'Technologie']),
  T('st-umwelt-tempolimit', 'Tempolimit', 'Brauchen wir ein generelles Tempolimit auf Autobahnen?', ['Umwelt', 'Gesellschaft']),
  T('st-umwelt-muelltrennung', 'Mülltrennung', 'Sollte Mülltrennung gesetzlich vorgeschrieben und kontrolliert werden?', ['Umwelt']),
  T('st-umwelt-klimaproteste', 'Klimaproteste', 'Sind radikale Klimaproteste gerechtfertigt?', ['Umwelt', 'Gesellschaft']),
  T('st-umwelt-nahverkehr-kostenlos', 'Kostenloser Nahverkehr', 'Sollten Busse und Bahnen für alle kostenlos sein?', ['Umwelt', 'Gesellschaft']),
  T('st-umwelt-schottergaerten', 'Schottergärten', 'Sollten pflegeleichte Schottergärten verboten werden?', ['Umwelt']),
  // ── Arbeit ──────────────────────────────────────────────────────
  T('st-arbeit-recht-auf-homeoffice', 'Recht auf Homeoffice', 'Sollten Arbeitnehmer ein gesetzliches Recht auf Homeoffice haben?', ['Arbeit']),
  T('st-arbeit-vier-tage-woche', 'Vier-Tage-Woche', 'Sollte die Vier-Tage-Woche zum Standard werden?', ['Arbeit']),
  T('st-arbeit-mindestlohn', 'Höherer Mindestlohn', 'Sollte der Mindestlohn deutlich erhöht werden?', ['Arbeit', 'Gesellschaft']),
  T('st-arbeit-dresscode', 'Dresscode im Büro', 'Sind Kleidervorschriften am Arbeitsplatz noch zeitgemäß?', ['Arbeit']),
  T('st-arbeit-jobwechsel', 'Häufige Jobwechsel', 'Ist es besser, oft den Arbeitgeber zu wechseln, als lange in einer Firma zu bleiben?', ['Arbeit']),
  T('st-arbeit-ueberstunden', 'Überstunden', 'Sollten Überstunden immer bezahlt werden müssen?', ['Arbeit']),
  T('st-arbeit-rente-mit-70', 'Rente mit 70', 'Müssen wir in Zukunft bis 70 arbeiten?', ['Arbeit', 'Gesellschaft']),
  T('st-arbeit-anonyme-bewerbung', 'Anonyme Bewerbungen', 'Sollten Bewerbungen ohne Foto und Namen erfolgen?', ['Arbeit', 'Gesellschaft']),
  T('st-arbeit-unbezahlte-praktika', 'Unbezahlte Praktika', 'Sollten unbezahlte Praktika verboten werden?', ['Arbeit', 'Bildung']),
  T('st-arbeit-sinn-oder-gehalt', 'Sinn oder Gehalt', 'Ist ein sinnvoller Job wichtiger als ein hohes Gehalt?', ['Arbeit']),
  // ── Technologie ─────────────────────────────────────────────────
  T('st-tech-ki-im-alltag', 'KI im Alltag', 'Macht künstliche Intelligenz unser Leben besser?', ['Technologie']),
  T('st-tech-smartphone-kinder', 'Smartphones für Kinder', 'Sollten Kinder unter zwölf Jahren ein eigenes Smartphone haben?', ['Technologie', 'Familie']),
  T('st-tech-klarnamenpflicht', 'Klarnamenpflicht', 'Sollte man sich im Internet nur mit echtem Namen äußern dürfen?', ['Technologie', 'Medien']),
  T('st-tech-bargeld', 'Bargeldloses Bezahlen', 'Sollte Bargeld abgeschafft werden?', ['Technologie', 'Konsum']),
  T('st-tech-elektroautos', 'Elektroautos', 'Sind Elektroautos wirklich die Zukunft?', ['Technologie', 'Umwelt']),
  T('st-tech-videoueberwachung', 'Videoüberwachung', 'Brauchen wir mehr Videoüberwachung an öffentlichen Plätzen?', ['Technologie', 'Gesellschaft']),
  T('st-tech-online-shopping', 'Online-Shopping', 'Zerstört Online-Shopping die Innenstädte?', ['Technologie', 'Konsum']),
  T('st-tech-digital-detox', 'Digital Detox', 'Brauchen wir regelmäßige Pausen vom Internet?', ['Technologie', 'Gesundheit']),
  T('st-tech-pflegeroboter', 'Roboter in der Pflege', 'Sollten Roboter alte Menschen pflegen?', ['Technologie', 'Gesundheit']),
  T('st-tech-computerspiele', 'Computerspiele', 'Sind Computerspiele ein wertvolles Hobby oder Zeitverschwendung?', ['Technologie', 'Medien']),
  // ── Bildung ─────────────────────────────────────────────────────
  T('st-bildung-schulnoten', 'Schulnoten', 'Sollten Schulnoten abgeschafft werden?', ['Bildung']),
  T('st-bildung-hausaufgaben', 'Hausaufgaben', 'Sind Hausaufgaben sinnvoll?', ['Bildung']),
  T('st-bildung-handyverbot', 'Handyverbot an Schulen', 'Sollten Handys an Schulen verboten werden?', ['Bildung', 'Technologie']),
  T('st-bildung-kostenloses-studium', 'Kostenloses Studium', 'Sollte das Studium für alle kostenlos sein?', ['Bildung', 'Gesellschaft']),
  T('st-bildung-schuluniform', 'Schuluniform', 'Sollten Schülerinnen und Schüler eine Schuluniform tragen?', ['Bildung']),
  T('st-bildung-zwei-fremdsprachen', 'Fremdsprachenpflicht', 'Sollte jeder mindestens zwei Fremdsprachen lernen müssen?', ['Bildung']),
  T('st-bildung-ki-hausarbeiten', 'KI in der Schule', 'Sollten Schüler künstliche Intelligenz für Hausarbeiten benutzen dürfen?', ['Bildung', 'Technologie']),
  T('st-bildung-weiterbildung', 'Lebenslanges Lernen', 'Ist berufliche Weiterbildung Pflicht des Arbeitgebers oder Privatsache?', ['Bildung', 'Arbeit']),
  T('st-bildung-alltagswissen', 'Alltagswissen', 'Sollte die Schule mehr praktisches Alltagswissen wie Steuern und Verträge vermitteln?', ['Bildung']),
  T('st-bildung-auslandsjahr', 'Auslandsjahr', 'Sollte jeder junge Mensch eine Zeit im Ausland verbringen?', ['Bildung', 'Reisen']),
  // ── Gesundheit ──────────────────────────────────────────────────
  T('st-gesundheit-zuckersteuer', 'Zuckersteuer', 'Sollten zuckerhaltige Getränke höher besteuert werden?', ['Gesundheit', 'Konsum']),
  T('st-gesundheit-rauchverbot', 'Rauchverbot', 'Sollte Rauchen in der Öffentlichkeit komplett verboten werden?', ['Gesundheit', 'Gesellschaft']),
  T('st-gesundheit-krankenkassen-sport', 'Belohnung für Sport', 'Sollten Krankenkassen sportlich aktive Mitglieder finanziell belohnen?', ['Gesundheit']),
  T('st-gesundheit-fastfood-werbung', 'Fast-Food-Werbung', 'Sollte Werbung für ungesundes Essen verboten werden?', ['Gesundheit', 'Medien']),
  T('st-gesundheit-psychische-gesundheit', 'Psychische Gesundheit', 'Nehmen wir psychische Gesundheit ernst genug?', ['Gesundheit', 'Gesellschaft']),
  T('st-gesundheit-homoeopathie', 'Alternative Medizin', 'Sollten Krankenkassen Homöopathie bezahlen?', ['Gesundheit']),
  T('st-gesundheit-organspende', 'Organspende', 'Sollte jeder automatisch Organspender sein, solange er nicht widerspricht?', ['Gesundheit', 'Gesellschaft']),
  T('st-gesundheit-impfpflicht', 'Impfpflicht', 'Sollte es für bestimmte Krankheiten eine Impfpflicht geben?', ['Gesundheit']),
  T('st-gesundheit-spaeter-schulbeginn', 'Später Schulbeginn', 'Sollte die Schule später am Morgen beginnen?', ['Gesundheit', 'Bildung']),
  T('st-gesundheit-fitness-tracker', 'Fitness-Tracker', 'Machen Fitness-Tracker uns wirklich gesünder?', ['Gesundheit', 'Technologie']),
  // ── Medien ──────────────────────────────────────────────────────
  T('st-medien-bildschirmzeit', 'Bildschirmzeit für Kinder', 'Sollten Eltern die Bildschirmzeit ihrer Kinder streng begrenzen?', ['Medien', 'Familie']),
  T('st-medien-influencer', 'Influencer', 'Sind Influencer gute Vorbilder für Jugendliche?', ['Medien']),
  T('st-medien-taegliche-nachrichten', 'Tägliche Nachrichten', 'Muss man täglich Nachrichten verfolgen, um informiert zu sein?', ['Medien']),
  T('st-medien-fake-news-haftung', 'Haftung für Fake News', 'Sollten soziale Netzwerke für Falschnachrichten haften?', ['Medien', 'Technologie']),
  T('st-medien-rundfunkbeitrag', 'Rundfunkbeitrag', 'Ist der öffentlich-rechtliche Rundfunk sein Geld wert?', ['Medien', 'Gesellschaft']),
  T('st-medien-buecher-oder-serien', 'Bücher oder Serien', 'Sind Bücher die bessere Unterhaltung als Filme und Serien?', ['Medien']),
  T('st-medien-personalisierte-werbung', 'Personalisierte Werbung', 'Sollte personalisierte Werbung im Internet verboten werden?', ['Medien', 'Technologie']),
  T('st-medien-podcast-statt-zeitung', 'Podcast statt Zeitung', 'Können Podcasts und Videos die Zeitung ersetzen?', ['Medien']),
  T('st-medien-reality-tv', 'Reality-TV', 'Ist Reality-TV harmlose Unterhaltung oder schädlich?', ['Medien']),
  T('st-medien-streaming-kino', 'Streaming und Kino', 'Machen Streaming-Dienste das Kino überflüssig?', ['Medien', 'Technologie']),
  // ── Gesellschaft ────────────────────────────────────────────────
  T('st-gesellschaft-soziales-jahr', 'Soziales Jahr', 'Sollte jeder Bürger ein verpflichtendes soziales Jahr leisten?', ['Gesellschaft']),
  T('st-gesellschaft-wahlalter-16', 'Wählen mit 16', 'Sollte das Wahlalter auf 16 gesenkt werden?', ['Gesellschaft']),
  T('st-gesellschaft-grundeinkommen', 'Grundeinkommen', 'Sollte der Staat allen ein bedingungsloses Grundeinkommen zahlen?', ['Gesellschaft', 'Arbeit']),
  T('st-gesellschaft-nachbarschaft', 'Anonyme Nachbarschaft', 'Ist es ein Problem, dass viele Menschen ihre Nachbarn nicht mehr kennen?', ['Gesellschaft']),
  T('st-gesellschaft-hoeflichkeit', 'Höflichkeit', 'Wird Höflichkeit in unserer Gesellschaft unwichtiger?', ['Gesellschaft']),
  T('st-gesellschaft-tattoos-beruf', 'Tattoos im Beruf', 'Sollten sichtbare Tattoos in allen Berufen akzeptiert werden?', ['Gesellschaft', 'Arbeit']),
  T('st-gesellschaft-sonntagsoeffnung', 'Sonntagsöffnung', 'Sollten Geschäfte auch sonntags öffnen dürfen?', ['Gesellschaft', 'Konsum']),
  T('st-gesellschaft-haustiere-stadt', 'Haustiere in der Stadt', 'Ist Haustierhaltung in kleinen Stadtwohnungen fair gegenüber den Tieren?', ['Gesellschaft']),
  T('st-gesellschaft-mehr-feiertage', 'Mehr Feiertage', 'Braucht Deutschland mehr gesetzliche Feiertage?', ['Gesellschaft', 'Arbeit']),
  T('st-gesellschaft-siezen', 'Du oder Sie', 'Sollten wir das Siezen abschaffen?', ['Gesellschaft']),
  // ── Reisen ──────────────────────────────────────────────────────
  T('st-reisen-massentourismus', 'Massentourismus', 'Sollten beliebte Reiseziele die Zahl der Besucher begrenzen?', ['Reisen', 'Umwelt']),
  T('st-reisen-kreuzfahrten', 'Kreuzfahrten', 'Sollten Kreuzfahrten wegen der Umweltbelastung eingeschränkt werden?', ['Reisen', 'Umwelt']),
  T('st-reisen-urlaub-im-inland', 'Urlaub im Inland', 'Ist Urlaub im eigenen Land die bessere Wahl?', ['Reisen']),
  T('st-reisen-camping', 'Camping oder Hotel', 'Ist Camping die schönste Art zu reisen?', ['Reisen']),
  T('st-reisen-im-ausland-leben', 'Im Ausland leben', 'Sollte man für einige Jahre im Ausland leben?', ['Reisen', 'Arbeit']),
  T('st-reisen-all-inclusive', 'All-inclusive-Urlaub', 'Ist All-inclusive-Urlaub echter Urlaub oder nur Bequemlichkeit?', ['Reisen', 'Konsum']),
  T('st-reisen-bildung', 'Reisen bildet', 'Lernt man auf Reisen mehr als aus Büchern?', ['Reisen', 'Bildung']),
  T('st-reisen-stadt-oder-natur', 'Stadt oder Natur', 'Erholt man sich in der Natur besser als in der Stadt?', ['Reisen', 'Gesundheit']),
  T('st-reisen-planung', 'Spontan oder geplant', 'Sollte man Reisen bis ins Detail planen?', ['Reisen']),
  T('st-reisen-workation', 'Arbeiten vom Strand', 'Arbeiten von überall auf der Welt — funktioniert das wirklich?', ['Reisen', 'Arbeit']),
  // ── Konsum ──────────────────────────────────────────────────────
  T('st-konsum-secondhand', 'Secondhand kaufen', 'Sollten wir mehr gebrauchte Dinge kaufen statt neue?', ['Konsum', 'Umwelt']),
  T('st-konsum-fast-fashion', 'Fast Fashion', 'Sollte Billigmode höher besteuert werden?', ['Konsum', 'Umwelt']),
  T('st-konsum-regionale-produkte', 'Regional kaufen', 'Sind regionale Produkte ihren höheren Preis wert?', ['Konsum']),
  T('st-konsum-weniger-ist-mehr', 'Weniger ist mehr', 'Macht weniger Konsum glücklicher?', ['Konsum', 'Gesellschaft']),
  T('st-konsum-lieferdienste', 'Lieferdienste', 'Machen Lieferdienste unser Leben besser?', ['Konsum', 'Technologie']),
  T('st-konsum-reparierbarkeit', 'Wegwerfgesellschaft', 'Sollten Hersteller verpflichtet werden, reparierbare Geräte zu bauen?', ['Konsum', 'Umwelt']),
  T('st-konsum-markenkleidung', 'Markenkleidung', 'Lohnt es sich, für Marken mehr zu bezahlen?', ['Konsum']),
  T('st-konsum-lebensmittel-spenden', 'Lebensmittelverschwendung', 'Sollten Supermärkte unverkaufte Lebensmittel spenden müssen?', ['Konsum', 'Gesellschaft']),
  T('st-konsum-black-friday', 'Rabattaktionen', 'Verführen Aktionen wie der Black Friday zu unnötigen Käufen?', ['Konsum']),
  T('st-konsum-abo-modelle', 'Abo statt Besitz', 'Besitzen wir bald nichts mehr — und ist das schlimm?', ['Konsum', 'Technologie']),
  // ── Familie ─────────────────────────────────────────────────────
  T('st-familie-taschengeld', 'Taschengeld', 'Sollten Kinder ein festes Taschengeld bekommen?', ['Familie']),
  T('st-familie-grosseltern', 'Großeltern als Betreuer', 'Sollten Großeltern regelmäßig bei der Kinderbetreuung helfen?', ['Familie']),
  T('st-familie-hausarbeit', 'Hausarbeit teilen', 'Sollte Hausarbeit in der Familie streng zur Hälfte geteilt werden?', ['Familie', 'Gesellschaft']),
  T('st-familie-hotel-mama', 'Hotel Mama', 'Sollten junge Erwachsene früh von zu Hause ausziehen?', ['Familie']),
  T('st-familie-gemeinsames-essen', 'Gemeinsames Abendessen', 'Ist das gemeinsame Abendessen für Familien wichtig?', ['Familie']),
  T('st-familie-strenge-erziehung', 'Regeln oder Freiheit', 'Brauchen Kinder mehr Regeln oder mehr Freiheit?', ['Familie', 'Bildung']),
  T('st-familie-ganztagsbetreuung', 'Ganztagsbetreuung', 'Sollten Kitas und Schulen ganztags betreuen?', ['Familie', 'Bildung']),
  T('st-familie-karriere', 'Familie und Karriere', 'Kann man Familie und Karriere wirklich vereinbaren?', ['Familie', 'Arbeit']),
  T('st-familie-ehe', 'Heiraten', 'Ist die Ehe noch zeitgemäß?', ['Familie', 'Gesellschaft']),
  T('st-familie-mehrgenerationenhaus', 'Mehrgenerationenhaus', 'Sollten mehrere Generationen unter einem Dach leben?', ['Familie'])
]

// Gemini responseSchema for the Topic generator (used by useSprechenTopics.ts).
export const TOPIC_GENERATOR_SCHEMA = {
  type: 'object',
  properties: {
    topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titleDe: { type: 'string' },
          statementDe: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } }
        },
        required: ['titleDe', 'statementDe', 'tags']
      }
    }
  },
  required: ['topics']
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/data/sprechenTopics.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/sprechenTopics.ts tests/data/sprechenTopics.test.ts
git commit -m "feat(sprechen): 100 seeded B2 discussion Topics with tags and generator schema"
```

---

### Task 2: Redemittel phrase bank

**Files:**
- Create: `src/data/sprechenRedemittel.ts`
- Test: `tests/data/sprechenRedemittel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/data/sprechenRedemittel.test.ts
import { describe, expect, it } from 'vitest'
import {
  HINT_MOVES, MOVES, MOVE_LABEL, SPRECHEN_REDEMITTEL, phrasesForMove
} from '../../src/data/sprechenRedemittel'

describe('sprechenRedemittel', () => {
  it('has unique ids', () => {
    const ids = new Set(SPRECHEN_REDEMITTEL.map(r => r.id))
    expect(ids.size).toBe(SPRECHEN_REDEMITTEL.length)
  })

  it('every phrase belongs to a known Move and is non-empty', () => {
    for (const r of SPRECHEN_REDEMITTEL) {
      expect(MOVES).toContain(r.move)
      expect(r.phraseDe.trim().length).toBeGreaterThan(3)
    }
  })

  it('every Move has at least 4 phrases (hint panel shows up to 3)', () => {
    for (const m of MOVES) {
      expect(phrasesForMove(m).length).toBeGreaterThanOrEqual(4)
    }
  })

  it('HINT_MOVES is the six in-Discussion moves — opinion is cheatsheet-only', () => {
    expect(HINT_MOVES).toEqual(['agree', 'disagree', 'partial', 'ask', 'example', 'summarize'])
    expect(HINT_MOVES).not.toContain('opinion')
  })

  it('every Move has DE and EN labels', () => {
    for (const m of MOVES) {
      expect(MOVE_LABEL[m].de.length).toBeGreaterThan(0)
      expect(MOVE_LABEL[m].en.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/data/sprechenRedemittel.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the dataset**

```ts
// src/data/sprechenRedemittel.ts
//
// Sprechen Teil 2 — Redemittel grouped by Move (see CONTEXT.md → "Move").
// Single source of truth: the cheatsheet renders ALL seven groups; the
// in-Discussion hint panel offers the six reactive HINT_MOVES ('opinion'
// is for opening a statement, which mid-discussion you rarely need).

export const MOVES = [
  'opinion', 'agree', 'disagree', 'partial', 'ask', 'example', 'summarize'
] as const

export type Move = (typeof MOVES)[number]

export const MOVE_LABEL: Record<Move, { de: string; en: string }> = {
  opinion:   { de: 'Meinung äußern',       en: 'State an opinion' },
  agree:     { de: 'Zustimmen',            en: 'Agree' },
  disagree:  { de: 'Widersprechen',        en: 'Disagree' },
  partial:   { de: 'Teilweise zustimmen',  en: 'Partially agree' },
  ask:       { de: 'Nachfragen',           en: 'Ask back' },
  example:   { de: 'Beispiel geben',       en: 'Give an example' },
  summarize: { de: 'Zusammenfassen',       en: 'Summarize / conclude' }
}

/** The six Moves offered by the in-Discussion hint panel, in display order. */
export const HINT_MOVES: Move[] = ['agree', 'disagree', 'partial', 'ask', 'example', 'summarize']

export interface Redemittel {
  id: string          // 'rm-agree-1'
  move: Move
  phraseDe: string
  noteEn: string      // short English gloss shown in the cheatsheet
}

const R = (id: string, move: Move, phraseDe: string, noteEn: string): Redemittel =>
  ({ id, move, phraseDe, noteEn })

export const SPRECHEN_REDEMITTEL: Redemittel[] = [
  // Meinung äußern
  R('rm-opinion-1', 'opinion', 'Meiner Meinung nach …', 'in my opinion …'),
  R('rm-opinion-2', 'opinion', 'Ich bin der Ansicht, dass …', 'I take the view that …'),
  R('rm-opinion-3', 'opinion', 'Ich bin davon überzeugt, dass …', 'I am convinced that …'),
  R('rm-opinion-4', 'opinion', 'Aus meiner Sicht …', 'from my point of view …'),
  R('rm-opinion-5', 'opinion', 'Für mich steht fest, dass …', 'for me it is clear that …'),
  R('rm-opinion-6', 'opinion', 'Ich finde es wichtig, dass …', 'I find it important that …'),
  // Zustimmen
  R('rm-agree-1', 'agree', 'Da stimme ich Ihnen völlig zu.', 'I completely agree with you.'),
  R('rm-agree-2', 'agree', 'Das sehe ich genauso.', 'I see it exactly the same way.'),
  R('rm-agree-3', 'agree', 'Da haben Sie vollkommen recht.', 'you are absolutely right.'),
  R('rm-agree-4', 'agree', 'Dem kann ich nur zustimmen.', 'I can only agree with that.'),
  R('rm-agree-5', 'agree', 'Genau das wollte ich auch sagen.', 'that is exactly what I wanted to say.'),
  R('rm-agree-6', 'agree', 'Das ist ein überzeugendes Argument.', 'that is a convincing argument.'),
  // Widersprechen
  R('rm-disagree-1', 'disagree', 'Da bin ich anderer Meinung.', 'I disagree.'),
  R('rm-disagree-2', 'disagree', 'Das sehe ich ganz anders.', 'I see that very differently.'),
  R('rm-disagree-3', 'disagree', 'Da muss ich Ihnen widersprechen.', 'I have to contradict you there.'),
  R('rm-disagree-4', 'disagree', 'Das überzeugt mich nicht, denn …', 'that does not convince me, because …'),
  R('rm-disagree-5', 'disagree', 'Ich halte das für problematisch, weil …', 'I consider that problematic, because …'),
  R('rm-disagree-6', 'disagree', 'Das stimmt so meiner Meinung nach nicht.', 'in my opinion that is not correct.'),
  // Teilweise zustimmen
  R('rm-partial-1', 'partial', 'Da haben Sie teilweise recht, aber …', 'you are partly right, but …'),
  R('rm-partial-2', 'partial', 'Einerseits stimmt das, andererseits …', 'on the one hand true, on the other …'),
  R('rm-partial-3', 'partial', 'Das mag sein, trotzdem …', 'that may be, nevertheless …'),
  R('rm-partial-4', 'partial', 'Im Prinzip ja, allerdings …', 'in principle yes, however …'),
  R('rm-partial-5', 'partial', 'Ich verstehe Ihren Punkt, dennoch …', 'I see your point, yet …'),
  R('rm-partial-6', 'partial', 'Bis zu einem gewissen Grad stimme ich zu, jedoch …', 'I agree to a certain degree, but …'),
  // Nachfragen
  R('rm-ask-1', 'ask', 'Wie sehen Sie das?', 'how do you see it?'),
  R('rm-ask-2', 'ask', 'Was halten Sie davon?', 'what do you think of that?'),
  R('rm-ask-3', 'ask', 'Sind Sie nicht auch der Meinung, dass …?', 'don\'t you also think that …?'),
  R('rm-ask-4', 'ask', 'Darf ich nachfragen, wie Sie das meinen?', 'may I ask what you mean by that?'),
  R('rm-ask-5', 'ask', 'Und wie sieht es Ihrer Meinung nach mit … aus?', 'and what about …, in your view?'),
  R('rm-ask-6', 'ask', 'Können Sie ein Beispiel dafür nennen?', 'can you give an example of that?'),
  // Beispiel geben
  R('rm-example-1', 'example', 'Ein gutes Beispiel dafür ist …', 'a good example of that is …'),
  R('rm-example-2', 'example', 'Nehmen wir zum Beispiel …', 'let\'s take for example …'),
  R('rm-example-3', 'example', 'Aus eigener Erfahrung kann ich sagen, dass …', 'from my own experience I can say …'),
  R('rm-example-4', 'example', 'Man sieht das deutlich an …', 'you can see that clearly in …'),
  R('rm-example-5', 'example', 'Denken Sie nur an …', 'just think of …'),
  R('rm-example-6', 'example', 'In meinem Umfeld habe ich erlebt, dass …', 'in my own circle I have seen that …'),
  // Zusammenfassen
  R('rm-summarize-1', 'summarize', 'Zusammenfassend lässt sich sagen, dass …', 'in summary one can say that …'),
  R('rm-summarize-2', 'summarize', 'Wir sind uns also einig, dass …', 'so we agree that …'),
  R('rm-summarize-3', 'summarize', 'Insgesamt denke ich, dass …', 'overall I think that …'),
  R('rm-summarize-4', 'summarize', 'Am Ende bleibt festzuhalten, dass …', 'in the end it remains to note that …'),
  R('rm-summarize-5', 'summarize', 'Wenn ich unsere Diskussion zusammenfasse, …', 'if I sum up our discussion, …'),
  R('rm-summarize-6', 'summarize', 'Unterm Strich bin ich der Meinung, dass …', 'the bottom line is I think that …')
]

export function phrasesForMove(move: Move): Redemittel[] {
  return SPRECHEN_REDEMITTEL.filter(r => r.move === move)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/data/sprechenRedemittel.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/sprechenRedemittel.ts tests/data/sprechenRedemittel.test.ts
git commit -m "feat(sprechen): Redemittel phrase bank grouped by Move"
```

---

### Task 3: Sprechen B2 Teil 2 rubric + Prädikat

**Files:**
- Modify: `src/data/rubrics.ts` (append at end of file; do NOT touch `RubricSystem` — the writing grader's validator enumerates it)
- Test: `tests/data/rubrics.sprechen.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/data/rubrics.sprechen.test.ts
import { describe, expect, it } from 'vitest'
import { SPRECHEN_B2_TEIL2, praedikat } from '../../src/data/rubrics'

describe('SPRECHEN_B2_TEIL2 rubric', () => {
  it('has four criteria of 25 points each, total 100, pass at 60', () => {
    expect(SPRECHEN_B2_TEIL2.criteria.map(c => c.key)).toEqual([
      'erfuellung', 'kohaerenz', 'wortschatz', 'strukturen'
    ])
    for (const c of SPRECHEN_B2_TEIL2.criteria) expect(c.maxPoints).toBe(25)
    expect(SPRECHEN_B2_TEIL2.totalMax).toBe(100)
    expect(SPRECHEN_B2_TEIL2.passingScore).toBe(60)
  })

  it('every criterion carries a German descriptor', () => {
    for (const c of SPRECHEN_B2_TEIL2.criteria) {
      expect(c.descriptorDe.length).toBeGreaterThan(40)
    }
  })
})

describe('praedikat bands', () => {
  it('maps scores to the official Goethe bands', () => {
    expect(praedikat(100)).toBe('sehr gut')
    expect(praedikat(90)).toBe('sehr gut')
    expect(praedikat(89)).toBe('gut')
    expect(praedikat(80)).toBe('gut')
    expect(praedikat(79)).toBe('befriedigend')
    expect(praedikat(70)).toBe('befriedigend')
    expect(praedikat(69)).toBe('ausreichend')
    expect(praedikat(60)).toBe('ausreichend')
    expect(praedikat(59)).toBe('nicht bestanden')
    expect(praedikat(0)).toBe('nicht bestanden')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/data/rubrics.sprechen.test.ts`
Expected: FAIL — `SPRECHEN_B2_TEIL2` is not exported.

- [ ] **Step 3: Append to `src/data/rubrics.ts`**

Add at the very end of the file:

```ts
// ── Sprechen B2 · Teil 2 (Diskussion) — adapted ──────────────────
//
// Adapted from the official Goethe B2 Sprechen assessment grid: the official
// grid spans both Teile and includes Aussprache, which a typed Discussion
// cannot assess. Aussprache is EXCLUDED (the result page says so) and the
// remaining four criteria are weighted equally at 25 points each — a
// deliberate, documented adaptation (see the module spec).
// Deliberately NOT part of RubricSystem: the writing grader's validator
// enumerates that union, and this rubric never flows through it.

export interface SprechenCriterion {
  key: 'erfuellung' | 'kohaerenz' | 'wortschatz' | 'strukturen'
  labelDe: string
  labelEn: string
  maxPoints: number
  descriptorDe: string
}

export interface SprechenRubric {
  labelDe: string
  totalMax: number
  passingScore: number
  criteria: SprechenCriterion[]
  notes: string
}

export const SPRECHEN_B2_TEIL2: SprechenRubric = {
  labelDe: 'Goethe-Zertifikat B2 · Sprechen Teil 2 (adaptiert, ohne Aussprache)',
  totalMax: 100,
  passingScore: 60,
  criteria: [
    {
      key: 'erfuellung',
      labelDe: 'Erfüllung / Interaktion',
      labelEn: 'Task fulfilment / interaction',
      maxPoints: 25,
      descriptorDe:
        'Vertritt die Person eine eigene Position zum Thema und begründet sie? ' +
        'Reagiert sie auf die Argumente des Gesprächspartners (zustimmen, ' +
        'widersprechen, abwägen) statt Monologe zu halten? Hält sie die ' +
        'Diskussion aktiv am Laufen, z. B. durch Nachfragen? Sehr kurze, ' +
        'einsilbige Beiträge mindern die Punktzahl in diesem Kriterium.'
    },
    {
      key: 'kohaerenz',
      labelDe: 'Kohärenz & Flüssigkeit',
      labelEn: 'Coherence & flow',
      maxPoints: 25,
      descriptorDe:
        'Sind die Beiträge in sich logisch aufgebaut und an den Gesprächsverlauf ' +
        'angeschlossen? Werden Konnektoren und Verweismittel (deshalb, trotzdem, ' +
        'einerseits/andererseits, dabei, darauf) passend eingesetzt? Für die ' +
        'schriftliche Form angepasst: Flüssigkeit heißt hier natürlicher ' +
        'Gesprächsfluss, nicht Sprechtempo.'
    },
    {
      key: 'wortschatz',
      labelDe: 'Wortschatz',
      labelEn: 'Vocabulary',
      maxPoints: 25,
      descriptorDe:
        'Ist der Wortschatz für B2 angemessen breit und präzise? Werden ' +
        'Redemittel der Diskussion (Zustimmung, Widerspruch, Abwägung) ' +
        'variantenreich verwendet? Führen Wortschatzlücken zu Umschreibungen ' +
        'oder Brüchen?'
    },
    {
      key: 'strukturen',
      labelDe: 'Strukturen',
      labelEn: 'Structures',
      maxPoints: 25,
      descriptorDe:
        'Wie korrekt und variantenreich sind die grammatischen Strukturen ' +
        '(Nebensätze, Konjunktiv II für Vorschläge, Passiv, Verbstellung)? ' +
        'Wie häufig und wie schwerwiegend sind Fehler, und beeinträchtigen ' +
        'sie das Verständnis?'
    }
  ],
  notes:
    'Adaptierte Bewertung für getippte Diskussionsübungen: Aussprache wird ' +
    'nicht bewertet; vier Kriterien zu je 25 Punkten, Bestehensgrenze 60. ' +
    'Prädikate wie im Goethe-Zeugnis: 90+ sehr gut, 80+ gut, 70+ befriedigend, ' +
    '60+ ausreichend, darunter nicht bestanden.'
}

export type Praedikat = 'sehr gut' | 'gut' | 'befriedigend' | 'ausreichend' | 'nicht bestanden'

export function praedikat(score: number): Praedikat {
  if (score >= 90) return 'sehr gut'
  if (score >= 80) return 'gut'
  if (score >= 70) return 'befriedigend'
  if (score >= 60) return 'ausreichend'
  return 'nicht bestanden'
}
```

- [ ] **Step 4: Run the tests — new file and the existing rubric tests**

Run: `npx vitest run tests/data/rubrics.sprechen.test.ts tests/composables/useWritingGrader.test.ts`
Expected: PASS both — the writing grader is untouched.

- [ ] **Step 5: Commit**

```bash
git add src/data/rubrics.ts tests/data/rubrics.sprechen.test.ts
git commit -m "feat(sprechen): adapted Goethe B2 Teil 2 rubric (4x25) and Praedikat bands"
```

---

### Task 4: Discussion domain types + Dexie v9

**Files:**
- Create: `src/data/sprechen.ts`
- Modify: `src/db/index.ts`
- Test: `tests/db/sprechenDiscussions.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/db/sprechenDiscussions.test.ts
import { describe, expect, it } from 'vitest'
import { db } from '../../src/db'
import type { SprechenDiscussion } from '../../src/data/sprechen'

describe('sprechenDiscussions table (db version 9)', () => {
  it('stores and retrieves a Discussion row by id', async () => {
    const row: SprechenDiscussion = {
      id: 'disc-test-1',
      topic: { id: 'st-umwelt-tempolimit', titleDe: 'Tempolimit', statementDe: 'Brauchen wir ein generelles Tempolimit auf Autobahnen?', source: 'seed' },
      turnTarget: 6,
      stance: 'contra',
      status: 'in_progress',
      turns: [],
      kiTippCount: 0,
      startedAt: Date.now()
    }
    await db.sprechenDiscussions.put(row)
    const got = await db.sprechenDiscussions.get('disc-test-1')
    expect(got?.topic.titleDe).toBe('Tempolimit')
    expect(got?.status).toBe('in_progress')
    await db.sprechenDiscussions.delete('disc-test-1')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/db/sprechenDiscussions.test.ts`
Expected: FAIL — `src/data/sprechen` does not exist / `sprechenDiscussions` is not a table.

- [ ] **Step 3: Create `src/data/sprechen.ts`**

```ts
// src/data/sprechen.ts
//
// Sprechen Teil 2 — Discussion domain types (see CONTEXT.md → "Discussion").
// A Discussion row is EPHEMERAL working state: it exists so an in-progress
// conversation survives reloads and a failed analysis stays retryable.
// It is DELETED once the summary Run is recorded (or on abandon) — the
// conversation is never kept (user decision in the spec).

export type DiscussionStatus = 'in_progress' | 'submitted'

export type PartnerStance = 'pro' | 'contra'

export const TURN_TARGETS = [6, 8, 10] as const
export type TurnTarget = (typeof TURN_TARGETS)[number]

export interface DiscussionTurn {
  role: 'learner' | 'partner'
  textDe: string
  at: number                       // ms epoch
}

export interface DiscussionTopicRef {
  id: string
  titleDe: string
  statementDe: string
  source: 'seed' | 'custom'
}

export interface SprechenDiscussion {
  id: string                       // crypto.randomUUID()
  topic: DiscussionTopicRef
  turnTarget: TurnTarget
  stance: PartnerStance            // the PARTNER's stance, resolved at start
  status: DiscussionStatus         // no graded/abandoned states — those rows are deleted
  turns: DiscussionTurn[]
  kiTippCount: number
  startedAt: number
  endedAt?: number                 // set when submitted
}

export function learnerTurnCount(d: Pick<SprechenDiscussion, 'turns'>): number {
  return d.turns.filter(t => t.role === 'learner').length
}
```

- [ ] **Step 4: Add Dexie version 9 in `src/db/index.ts`**

Add the import next to the existing type imports at the top:

```ts
import type { SprechenDiscussion } from '../data/sprechen'
```

Add the table declaration in the `GermanTrainerDb` class body, after `simulatorSessions`:

```ts
  sprechenDiscussions!: Table<SprechenDiscussion, string>
```

Append inside the constructor, after the `this.version(8)` block (a new version block lists ALL tables):

```ts
    this.version(9).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt',
      sprechenDiscussions: '&id, status, startedAt'
    })
```

- [ ] **Step 5: Run the tests — new file plus existing db tests**

Run: `npx vitest run tests/db/sprechenDiscussions.test.ts tests/db/index.test.ts`
Expected: PASS both.

- [ ] **Step 6: Commit**

```bash
git add src/data/sprechen.ts src/db/index.ts tests/db/sprechenDiscussions.test.ts
git commit -m "feat(sprechen): Discussion domain types and Dexie v9 sprechenDiscussions table"
```

---

### Task 5: Discussion lifecycle composable

**Files:**
- Create: `src/composables/useSprechenDiscussion.ts`
- Test: `tests/composables/useSprechenDiscussion.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/composables/useSprechenDiscussion.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../src/db'
import {
  abandonDiscussion, appendTurn, createDiscussion, deleteDiscussion,
  findActiveDiscussion, incrementKiTipp, markSubmitted
} from '../../src/composables/useSprechenDiscussion'

const TOPIC = {
  id: 'st-umwelt-tempolimit', titleDe: 'Tempolimit',
  statementDe: 'Brauchen wir ein generelles Tempolimit auf Autobahnen?',
  source: 'seed' as const
}

beforeEach(async () => { await db.sprechenDiscussions.clear() })

describe('Discussion lifecycle', () => {
  it('create → findActive returns it', async () => {
    const d = await createDiscussion(TOPIC, 6, 'contra')
    expect(d.status).toBe('in_progress')
    expect(d.turns).toEqual([])
    const active = await findActiveDiscussion()
    expect(active?.id).toBe(d.id)
  })

  it('appendTurn persists turns in order', async () => {
    const d = await createDiscussion(TOPIC, 6, 'pro')
    await appendTurn(d.id, { role: 'partner', textDe: 'Ich bin dafür.', at: 1 })
    await appendTurn(d.id, { role: 'learner', textDe: 'Ich bin dagegen.', at: 2 })
    const got = await db.sprechenDiscussions.get(d.id)
    expect(got?.turns.map(t => t.role)).toEqual(['partner', 'learner'])
  })

  it('markSubmitted sets status and endedAt; row stays findable for retry', async () => {
    const d = await createDiscussion(TOPIC, 6, 'pro')
    await markSubmitted(d.id)
    const got = await db.sprechenDiscussions.get(d.id)
    expect(got?.status).toBe('submitted')
    expect(typeof got?.endedAt).toBe('number')
    const active = await findActiveDiscussion()
    expect(active?.id).toBe(d.id)   // submitted = analysis retryable
  })

  it('abandonDiscussion deletes the row', async () => {
    const d = await createDiscussion(TOPIC, 8, 'contra')
    await abandonDiscussion(d.id)
    expect(await db.sprechenDiscussions.get(d.id)).toBeUndefined()
  })

  it('deleteDiscussion removes the row (post-grading cleanup)', async () => {
    const d = await createDiscussion(TOPIC, 10, 'pro')
    await deleteDiscussion(d.id)
    expect(await db.sprechenDiscussions.get(d.id)).toBeUndefined()
  })

  it('incrementKiTipp bumps the counter', async () => {
    const d = await createDiscussion(TOPIC, 6, 'pro')
    await incrementKiTipp(d.id)
    await incrementKiTipp(d.id)
    const got = await db.sprechenDiscussions.get(d.id)
    expect(got?.kiTippCount).toBe(2)
  })

  it('findActiveDiscussion returns the most recent when several exist', async () => {
    const a = await createDiscussion(TOPIC, 6, 'pro')
    await db.sprechenDiscussions.update(a.id, { startedAt: 1000 })
    const b = await createDiscussion(TOPIC, 6, 'pro')
    await db.sprechenDiscussions.update(b.id, { startedAt: 2000 })
    const active = await findActiveDiscussion()
    expect(active?.id).toBe(b.id)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/composables/useSprechenDiscussion.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the composable**

```ts
// src/composables/useSprechenDiscussion.ts
//
// Dexie CRUD for the ephemeral Discussion row (simulator-session pattern,
// but rows are DELETED on abandon and after the Run is recorded — there are
// no graded/abandoned states to keep).

import { db } from '../db'
import type {
  DiscussionTopicRef, DiscussionTurn, PartnerStance, SprechenDiscussion, TurnTarget
} from '../data/sprechen'

export async function createDiscussion(
  topic: DiscussionTopicRef,
  turnTarget: TurnTarget,
  stance: PartnerStance
): Promise<SprechenDiscussion> {
  const row: SprechenDiscussion = {
    id: crypto.randomUUID(),
    topic,
    turnTarget,
    stance,
    status: 'in_progress',
    turns: [],
    kiTippCount: 0,
    startedAt: Date.now()
  }
  await db.sprechenDiscussions.put(row)
  return row
}

/** Active = in_progress OR submitted-but-not-graded. Most recent wins. */
export async function findActiveDiscussion(): Promise<SprechenDiscussion | null> {
  const all = await db.sprechenDiscussions.toArray()
  const active = all.sort((a, b) => b.startedAt - a.startedAt)
  return active[0] ?? null
}

export async function appendTurn(id: string, turn: DiscussionTurn): Promise<void> {
  const row = await db.sprechenDiscussions.get(id)
  if (!row) throw new Error(`Discussion ${id} not found`)
  row.turns = [...row.turns, turn]
  await db.sprechenDiscussions.put(row)
}

export async function markSubmitted(id: string): Promise<void> {
  await db.sprechenDiscussions.update(id, { status: 'submitted' as const, endedAt: Date.now() })
}

export async function incrementKiTipp(id: string): Promise<void> {
  const row = await db.sprechenDiscussions.get(id)
  if (!row) throw new Error(`Discussion ${id} not found`)
  await db.sprechenDiscussions.update(id, { kiTippCount: row.kiTippCount + 1 })
}

/** Abandon = the learner walked away. The row is deleted, nothing recorded. */
export async function abandonDiscussion(id: string): Promise<void> {
  await db.sprechenDiscussions.delete(id)
}

/** Post-grading cleanup — called only AFTER saveQuizRun succeeded. */
export async function deleteDiscussion(id: string): Promise<void> {
  await db.sprechenDiscussions.delete(id)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/composables/useSprechenDiscussion.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useSprechenDiscussion.ts tests/composables/useSprechenDiscussion.test.ts
git commit -m "feat(sprechen): Discussion lifecycle CRUD on Dexie"
```

---

### Task 6: Partner-turn engine + KI-Tipp

**Files:**
- Create: `src/composables/useSprechenPartner.ts`
- Test: `tests/composables/useSprechenPartner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/composables/useSprechenPartner.test.ts
import { describe, expect, it } from 'vitest'
import type { SprechenDiscussion } from '../../src/data/sprechen'
import {
  buildKiTippPrompt, buildPartnerSystem, buildPartnerTurnPrompt, computePhase,
  generateKiTipp, generatePartnerTurn, serializeTranscript, validatePartnerReply
} from '../../src/composables/useSprechenPartner'

function disc(overrides: Partial<SprechenDiscussion> = {}): SprechenDiscussion {
  return {
    id: 'd1',
    topic: { id: 'st-umwelt-tempolimit', titleDe: 'Tempolimit', statementDe: 'Brauchen wir ein generelles Tempolimit auf Autobahnen?', source: 'seed' },
    turnTarget: 6,
    stance: 'contra',
    status: 'in_progress',
    turns: [],
    kiTippCount: 0,
    startedAt: 0,
    ...overrides
  }
}

function fakeClient(responses: string[]) {
  let i = 0
  const calls: Array<Record<string, unknown>> = []
  return {
    calls,
    client: {
      models: {
        generateContent: async (params: Record<string, unknown>) => {
          calls.push(params)
          return { text: responses[Math.min(i++, responses.length - 1)] }
        }
      }
    }
  }
}

describe('computePhase', () => {
  it('opening when no turns, closing when learner target reached, reply otherwise', () => {
    expect(computePhase(disc())).toBe('opening')
    const mid = disc({ turns: [
      { role: 'partner', textDe: 'A', at: 1 }, { role: 'learner', textDe: 'B', at: 2 }
    ] })
    expect(computePhase(mid)).toBe('reply')
    const turns = [] as SprechenDiscussion['turns']
    for (let k = 0; k < 6; k++) {
      turns.push({ role: 'partner', textDe: 'p', at: k * 2 })
      turns.push({ role: 'learner', textDe: 'l', at: k * 2 + 1 })
    }
    expect(computePhase(disc({ turns }))).toBe('closing')
  })
})

describe('prompt builders', () => {
  it('system prompt carries topic, stance, and the four behavior rules', () => {
    const sys = buildPartnerSystem(disc())
    expect(sys).toContain('Tempolimit')
    expect(sys).toContain('DAGEGEN')
    expect(sys).toContain('Korrigiere')             // never-correct rule
    expect(sys).toContain('Teilaspekt')             // devil's-advocate rule
    expect(sys).toContain('Nachfrage')              // short-turn rule
  })

  it('transcript serializes roles as PARTNER/LERNER lines', () => {
    const d = disc({ turns: [
      { role: 'partner', textDe: 'Ich bin dagegen.', at: 1 },
      { role: 'learner', textDe: 'Warum denn?', at: 2 }
    ] })
    const t = serializeTranscript(d.turns)
    expect(t).toBe('PARTNER: Ich bin dagegen.\nLERNER: Warum denn?')
  })

  it('user prompt names the phase instruction and embeds the transcript', () => {
    const d = disc({ turns: [{ role: 'partner', textDe: 'X', at: 1 }, { role: 'learner', textDe: 'Y', at: 2 }] })
    expect(buildPartnerTurnPrompt(d, 'reply')).toContain('PARTNER: X')
    expect(buildPartnerTurnPrompt(d, 'closing')).toContain('abschließenden')
    expect(buildPartnerTurnPrompt(disc(), 'opening')).toContain('Eröffne')
  })

  it('KI-Tipp prompt forbids ready-made sentences', () => {
    expect(buildKiTippPrompt(disc())).toContain('KEINEN fertigen Satz')
  })
})

describe('validatePartnerReply', () => {
  it('accepts a normal reply and trims it', () => {
    expect(validatePartnerReply({ replyDe: '  Das sehe ich anders. Warum?  ' }))
      .toBe('Das sehe ich anders. Warum?')
  })
  it('rejects non-objects, missing/short/overlong replies', () => {
    expect(validatePartnerReply(null)).toBeNull()
    expect(validatePartnerReply({})).toBeNull()
    expect(validatePartnerReply({ replyDe: 'Ja.' })).toBeNull()
    expect(validatePartnerReply({ replyDe: 'x'.repeat(901) })).toBeNull()
  })
})

describe('generatePartnerTurn', () => {
  it('returns the validated reply', async () => {
    const { client } = fakeClient([JSON.stringify({ replyDe: 'Da widerspreche ich Ihnen deutlich.' })])
    const reply = await generatePartnerTurn(client, 'test-model', disc(), 'opening')
    expect(reply).toBe('Da widerspreche ich Ihnen deutlich.')
  })

  it('retries on malformed JSON then succeeds', async () => {
    const { client, calls } = fakeClient(['not json', JSON.stringify({ replyDe: 'Zweiter Versuch, gutes Argument.' })])
    const reply = await generatePartnerTurn(client, 'test-model', disc(), 'reply')
    expect(reply).toBe('Zweiter Versuch, gutes Argument.')
    expect(calls.length).toBe(2)
  })

  it('throws after exhausting retries', async () => {
    const { client } = fakeClient(['nope'])
    await expect(generatePartnerTurn(client, 'test-model', disc(), 'reply')).rejects.toThrow()
  })
})

describe('generateKiTipp', () => {
  it('returns the tip text', async () => {
    const { client } = fakeClient([JSON.stringify({ tippDe: 'Du könntest widersprechen und ein Alltagsbeispiel bringen.' })])
    const tipp = await generateKiTipp(client, 'test-model', disc())
    expect(tipp).toContain('widersprechen')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/composables/useSprechenPartner.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the composable**

```ts
// src/composables/useSprechenPartner.ts
//
// The AI Gesprächspartner for Sprechen Teil 2. One single-shot generateContent
// call per turn: persona system prompt + the serialized transcript (there is
// no chat-role API anywhere in this codebase — deliberate, see the spec's
// architecture decision). Also home of the on-demand KI-Tipp call.

import { learnerTurnCount, type SprechenDiscussion } from '../data/sprechen'

// ── Gemini client shape (matches useKonjunktivQuiz.GeminiClient) ──

export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

export class PartnerError extends Error {
  constructor(message: string, public readonly attempts: number) {
    super(message)
    this.name = 'PartnerError'
  }
}

export type PartnerPhase = 'opening' | 'reply' | 'closing'

/** opening: no turns yet · closing: learner reached the target · reply: otherwise. */
export function computePhase(d: SprechenDiscussion): PartnerPhase {
  if (d.turns.length === 0) return 'opening'
  if (learnerTurnCount(d) >= d.turnTarget) return 'closing'
  return 'reply'
}

export function serializeTranscript(turns: SprechenDiscussion['turns']): string {
  return turns
    .map(t => `${t.role === 'partner' ? 'PARTNER' : 'LERNER'}: ${t.textDe}`)
    .join('\n')
}

export function buildPartnerSystem(d: SprechenDiscussion): string {
  const stance = d.stance === 'pro' ? 'DAFÜR' : 'DAGEGEN'
  return (
    'Du bist Gesprächspartnerin/Gesprächspartner in einer Übung zum ' +
    'Goethe-Zertifikat B2, Sprechen Teil 2 (Diskussion). Ihr diskutiert ' +
    `über das Thema „${d.topic.titleDe}": ${d.topic.statementDe}\n` +
    `Deine Position: ${stance}.\n\n` +
    'Regeln für JEDEN Beitrag:\n' +
    '- Sauberes, natürliches B2-Deutsch. 2–4 Sätze — der Lernende soll den ' +
    'Großteil des Gesprächs bestreiten.\n' +
    '- Verteidige deine Position, aber gib gute Argumente zu ' +
    '(„Da haben Sie recht, aber …").\n' +
    '- Übernimmt der Lernende deine Position, gib den Punkt zu und eröffne ' +
    'sofort einen neuen strittigen Teilaspekt des Themas ' +
    '(„Aber wie sieht es mit … aus?").\n' +
    '- Auf einen sehr kurzen Lernerbeitrag reagierst du mit einer direkten, ' +
    'konkreten Nachfrage statt mit einem Monolog.\n' +
    '- Stelle ungefähr in jedem zweiten Beitrag eine Frage an den Lernenden.\n' +
    '- Korrigiere NIEMALS die Sprache des Lernenden — weder direkt noch ' +
    'indirekt. Sprachliche Rückmeldung gibt es erst in der Auswertung.\n' +
    '- Sieze den Lernenden.\n\n' +
    'Antworte ausschließlich als JSON nach dem responseSchema — kein Prosa-' +
    'Vorspann, keine Markdown-Fences.'
  )
}

export const PARTNER_TURN_SCHEMA = {
  type: 'object',
  properties: { replyDe: { type: 'string' } },
  required: ['replyDe']
}

const PHASE_INSTRUCTION: Record<PartnerPhase, string> = {
  opening:
    'Eröffne die Diskussion: Begrüße kurz, nimm in 2–3 Sätzen Stellung zum ' +
    'Thema und lade den Lernenden ein, seine Meinung zu sagen.',
  reply:
    'Schreibe den nächsten Partnerbeitrag (2–4 Sätze), der direkt an den ' +
    'letzten Lernerbeitrag anschließt.',
  closing:
    'Schreibe einen kurzen abschließenden Beitrag (2–3 Sätze): fasse den Kern ' +
    'der Diskussion in einem Satz zusammen und bedanke dich für das Gespräch. ' +
    'Stelle KEINE neue Frage.'
}

export function buildPartnerTurnPrompt(d: SprechenDiscussion, phase: PartnerPhase): string {
  const transcript = d.turns.length > 0
    ? `BISHERIGES GESPRÄCH:\n${serializeTranscript(d.turns)}\n\n`
    : ''
  return `${transcript}${PHASE_INSTRUCTION[phase]}`
}

export function validatePartnerReply(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.replyDe !== 'string') return null
  const reply = r.replyDe.trim()
  if (reply.length < 10 || reply.length > 900) return null
  return reply
}

export async function generatePartnerTurn(
  client: GeminiClient,
  model: string,
  d: SprechenDiscussion,
  phase: PartnerPhase,
  maxRetries = 2
): Promise<string> {
  let attempts = 0
  let lastError = 'no attempts'
  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model,
        contents: buildPartnerTurnPrompt(d, phase),
        config: {
          systemInstruction: buildPartnerSystem(d),
          responseMimeType: 'application/json',
          responseSchema: PARTNER_TURN_SCHEMA as unknown as Record<string, unknown>,
          temperature: 0.8,
          topP: 0.95
        }
      })
      const text = response.text ?? ''
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        lastError = 'malformed JSON'
        continue
      }
      const reply = validatePartnerReply(parsed)
      if (reply === null) {
        lastError = 'validation failed'
        continue
      }
      return reply
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new PartnerError(`Partner turn failed after ${attempts} attempts: ${lastError}`, attempts)
}

// ── KI-Tipp ─────────────────────────────────────────────────────

export const KI_TIPP_SCHEMA = {
  type: 'object',
  properties: { tippDe: { type: 'string' } },
  required: ['tippDe']
}

export function buildKiTippPrompt(d: SprechenDiscussion): string {
  const transcript = d.turns.length > 0
    ? `BISHERIGES GESPRÄCH:\n${serializeTranscript(d.turns)}\n\n`
    : ''
  return (
    `${transcript}Der Lernende ist am Zug und diskutiert über: ${d.topic.statementDe}\n` +
    'Gib in 1–2 Sätzen (Deutsch, du-Form) einen strategischen Tipp, WAS der ' +
    'Lernende als Nächstes argumentativ tun könnte — z. B. widersprechen, ' +
    'abwägen, ein konkretes Beispiel bringen, nachfragen. Formuliere KEINEN ' +
    'fertigen Satz zum Abschreiben, nur die Richtung. ' +
    'Antworte ausschließlich als JSON nach dem responseSchema.'
  )
}

export async function generateKiTipp(
  client: GeminiClient,
  model: string,
  d: SprechenDiscussion
): Promise<string> {
  const response = await client.models.generateContent({
    model,
    contents: buildKiTippPrompt(d),
    config: {
      responseMimeType: 'application/json',
      responseSchema: KI_TIPP_SCHEMA as unknown as Record<string, unknown>,
      temperature: 0.7,
      topP: 0.95
    }
  })
  const text = response.text ?? ''
  const parsed = JSON.parse(text) as Record<string, unknown>
  if (!parsed || typeof parsed.tippDe !== 'string' || parsed.tippDe.trim().length === 0) {
    throw new Error('KI-Tipp returned no usable text')
  }
  return parsed.tippDe.trim()
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/composables/useSprechenPartner.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useSprechenPartner.ts tests/composables/useSprechenPartner.test.ts
git commit -m "feat(sprechen): partner-turn engine with phase prompts, retry loop, and KI-Tipp"
```

---

### Task 7: History plumbing — type, tag, meta, exhaustive maps, export keys

This task makes `'sprechen-teil2'` a first-class `QuizHistoryType`. The compiler is the checklist: after adding the type, `vue-tsc` fails on every exhaustive map until all six are updated.

**Files:**
- Modify: `src/composables/useQuizHistory.ts`
- Modify: `src/components/charts/quiz-type-labels.ts` (3 exports)
- Modify: `src/composables/useLevelAssessment.ts` (`TYPE_LABEL`, ~line 88)
- Modify: `src/composables/useQuizStats.ts` (`zeroRunsByType` ~line 88, `zeroAccuracyByType` ~line 137)
- Modify: `src/modules/history/HistoryPage.vue` (`QUIZ_TYPES` ~line 44, `typeOrder` ~line 91)
- Modify: `src/composables/useUserData.ts` (`USER_DATA_KEYS`, `KEY_LABELS`)
- Test: `tests/composables/useQuizHistory.sprechen.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/composables/useQuizHistory.sprechen.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { loadHistory, saveQuizRun, type SprechenErrorTag } from '../../src/composables/useQuizHistory'

beforeEach(() => { localStorage.removeItem('gt:quizHistory') })

describe('sprechen-teil2 history entries', () => {
  it('round-trips a summary-only Run with sprechen meta', () => {
    const counts: Partial<Record<SprechenErrorTag, number>> = { grammar: 3, vocabulary: 1 }
    saveQuizRun({
      type: 'sprechen-teil2',
      startedAt: new Date(1700000000000).toISOString(),
      finishedAt: new Date(1700000600000).toISOString(),
      durationMs: 600000,
      count: 100,
      correct: 74,
      meta: {
        topicTitle: 'Tempolimit',
        turnTarget: 6,
        learnerTurns: 6,
        sprechenScore: 74,
        sprechenPraedikat: 'befriedigend',
        sprechenCriteria: [
          { key: 'erfuellung', score: 20, maxPoints: 25 },
          { key: 'kohaerenz', score: 18, maxPoints: 25 },
          { key: 'wortschatz', score: 19, maxPoints: 25 },
          { key: 'strukturen', score: 17, maxPoints: 25 }
        ],
        sprechenMistakeCounts: counts,
        kiTippCount: 2,
        sprechenStrengths: [{ de: 'Gute Argumente', en: 'Good arguments' }],
        sprechenWeaknesses: [{ de: 'Kasusfehler', en: 'Case errors' }],
        sprechenOverallDe: 'Solide B2-Leistung.',
        sprechenOverallEn: 'Solid B2 performance.',
        passes: true
      }
    })
    const [entry] = loadHistory()
    expect(entry.type).toBe('sprechen-teil2')
    expect(entry.correct).toBe(74)
    expect(entry.meta.topicTitle).toBe('Tempolimit')
    expect(entry.meta.sprechenMistakeCounts?.grammar).toBe(3)
    expect(entry.meta.sprechenCriteria?.length).toBe(4)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/composables/useQuizHistory.sprechen.test.ts`
Expected: FAIL — TS errors: `'sprechen-teil2'` not assignable to `QuizHistoryType`; unknown meta fields.

- [ ] **Step 3: Extend `src/composables/useQuizHistory.ts`**

3a. Append to the `QuizHistoryType` union (after `| 'simulator-c1'`):

```ts
  | 'sprechen-teil2'
```

3b. Add the tag type next to `DacErrorTag` (after its definition):

```ts
/**
 * A Sprechen error tag (see CONTEXT.md) — classification of one marked
 * mistake in a learner's Discussion turns. Unlike the drill tags, exactly
 * ONE kind per marked mistake (each annotation is a single span).
 */
export type SprechenErrorTag = 'grammar' | 'word-order' | 'vocabulary' | 'spelling' | 'register'
```

3c. Append to `QuizHistoryMeta` (before the closing brace, after the Simulator C1 block):

```ts
  // Sprechen Teil 2 (Discussion) — summary only, no transcript (spec decision)
  topicTitle?: string
  turnTarget?: number
  learnerTurns?: number
  sprechenScore?: number                                  // 0–100
  sprechenPraedikat?: string
  sprechenCriteria?: Array<{ key: string; score: number; maxPoints: number }>
  sprechenMistakeCounts?: Partial<Record<SprechenErrorTag, number>>
  kiTippCount?: number
  sprechenStrengths?: Array<{ de: string; en: string }>
  sprechenWeaknesses?: Array<{ de: string; en: string }>
  sprechenOverallDe?: string
  sprechenOverallEn?: string
```

(`passes?: boolean` already exists in the Simulator C1 block — reuse it, do not redeclare.)

- [ ] **Step 4: Update the six exhaustive maps**

4a. `src/components/charts/quiz-type-labels.ts` — add to ALL THREE exports:

```ts
// in QUIZ_TYPE_LABEL, after 'simulator-c1':
  'sprechen-teil2': 'Sprechen · Teil 2 discussion'
// in QUIZ_TYPE_DE, after 'simulator-c1':
  'sprechen-teil2': 'Sprechen · Teil 2 Diskussion'
// in QUIZ_TYPES_ORDER, append as last element:
  'sprechen-teil2'
```

4b. `src/composables/useLevelAssessment.ts` — in `TYPE_LABEL` after `'simulator-c1'`:

```ts
  'sprechen-teil2': 'Sprechen Teil 2 — typed discussion with AI partner (score 0-100, Goethe B2 rubric)'
```

4c. `src/composables/useQuizStats.ts` — add to BOTH zero-maps after `'simulator-c1'`:

```ts
// zeroRunsByType:
    'sprechen-teil2': 0
// zeroAccuracyByType:
    'sprechen-teil2': emptyBucket()
```

4d. `src/modules/history/HistoryPage.vue` — in `QUIZ_TYPES` after `'simulator-c1'`:

```ts
  'sprechen-teil2':     { label: 'Sprechen — Teil 2 discussion',    de: 'Sprechen · Teil 2 Diskussion', module: 'Sprechen' }
```

and append `'sprechen-teil2'` as the last element of the `typeOrder` array.

- [ ] **Step 5: Register the new localStorage keys in `src/composables/useUserData.ts`**

In `USER_DATA_KEYS`, after `'declArticleAISetup'` (end of the quiz-setup group):

```ts
  'sprechenTeil2Setup',
  // sprechen custom topics
  'gt:sprechenCustomTopics',
```

In `KEY_LABELS`, matching entries:

```ts
  sprechenTeil2Setup: { label: 'Sprechen Teil 2 setup', group: 'Quiz setup' },
  'gt:sprechenCustomTopics': { label: 'Sprechen custom topics', group: 'Quiz setup' },
```

- [ ] **Step 6: Run the test + typecheck**

Run: `npx vitest run tests/composables/useQuizHistory.sprechen.test.ts tests/composables/useUserData.test.ts && npx vue-tsc --noEmit`
Expected: tests PASS; `vue-tsc` exits 0 (if it reports another exhaustive `Record<QuizHistoryType, …>` this plan missed, add the entry there following that file's pattern).

- [ ] **Step 7: Commit**

```bash
git add src/composables/useQuizHistory.ts src/components/charts/quiz-type-labels.ts src/composables/useLevelAssessment.ts src/composables/useQuizStats.ts src/modules/history/HistoryPage.vue src/composables/useUserData.ts tests/composables/useQuizHistory.sprechen.test.ts
git commit -m "feat(sprechen): sprechen-teil2 history type, Sprechen error tag, meta fields, export keys"
```

---

### Task 8: Topic pool, picker, and generator

**Files:**
- Create: `src/composables/useSprechenTopics.ts`
- Test: `tests/composables/useSprechenTopics.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/composables/useSprechenTopics.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { SPRECHEN_TOPICS } from '../../src/data/sprechenTopics'
import { saveQuizRun } from '../../src/composables/useQuizHistory'
import {
  CUSTOM_TOPICS_KEY, addCustomTopics, allTopics, buildTopicGeneratorPrompt,
  deleteCustomTopic, doneTopicTitles, generateTopics, loadCustomTopics, pickRandomTopic
} from '../../src/composables/useSprechenTopics'

beforeEach(() => {
  localStorage.removeItem(CUSTOM_TOPICS_KEY)
  localStorage.removeItem('gt:quizHistory')
})

function fakeClient(responses: string[]) {
  let i = 0
  return {
    models: {
      generateContent: async (_params: Record<string, unknown>) =>
        ({ text: responses[Math.min(i++, responses.length - 1)] })
    }
  }
}

describe('custom topic pool', () => {
  it('starts empty; add + delete round-trip', () => {
    expect(loadCustomTopics()).toEqual([])
    addCustomTopics([{ id: 'st-custom-1-0', titleDe: 'Testthema', statementDe: 'Sollte man testen?', tags: ['Bildung'], level: 'B2', source: 'custom' }])
    expect(loadCustomTopics().length).toBe(1)
    expect(allTopics().length).toBe(SPRECHEN_TOPICS.length + 1)
    deleteCustomTopic('st-custom-1-0')
    expect(loadCustomTopics()).toEqual([])
  })

  it('ignores corrupt localStorage content', () => {
    localStorage.setItem(CUSTOM_TOPICS_KEY, '{not json')
    expect(loadCustomTopics()).toEqual([])
  })
})

describe('done-topic memory', () => {
  it('reads titles from sprechen-teil2 Run meta', () => {
    saveQuizRun({
      type: 'sprechen-teil2',
      startedAt: new Date(1700000000000).toISOString(),
      finishedAt: new Date(1700000600000).toISOString(),
      durationMs: 600000, count: 100, correct: 70,
      meta: { topicTitle: 'Tempolimit' }
    })
    expect(doneTopicTitles().has('Tempolimit')).toBe(true)
  })

  it('pickRandomTopic prefers a not-yet-done Topic', () => {
    // Mark every seed Topic done except one.
    const undone = SPRECHEN_TOPICS[0]
    for (const t of SPRECHEN_TOPICS.slice(1)) {
      saveQuizRun({
        type: 'sprechen-teil2',
        startedAt: new Date(1700000000000).toISOString(),
        finishedAt: new Date(1700000600000).toISOString(),
        durationMs: 1, count: 100, correct: 60,
        meta: { topicTitle: t.titleDe }
      })
    }
    // History caps at 100 entries, 99 saves fit. The one undone must be picked.
    expect(pickRandomTopic(() => 0.5).titleDe).toBe(undone.titleDe)
  })
})

describe('topic generator', () => {
  it('prompt embeds avoid-lists', () => {
    const p = buildTopicGeneratorPrompt(['Tempolimit'], ['Zuckersteuer'], () => 0.5)
    expect(p).toContain('Tempolimit')
    expect(p).toContain('Zuckersteuer')
  })

  it('validates, dedupes against existing titles, stamps custom ids', async () => {
    const client = fakeClient([JSON.stringify({ topics: [
      { titleDe: 'Tempolimit', statementDe: 'Doppeltes Thema, wird verworfen?', tags: ['Umwelt'] },
      { titleDe: 'Ein neues Thema', statementDe: 'Sollten wir dieses neue Thema diskutieren?', tags: ['Gesellschaft', 'Quatsch'] },
      { titleDe: '', statementDe: 'Ohne Titel', tags: ['Umwelt'] }
    ] })])
    const out = await generateTopics(client, 'test-model')
    expect(out.length).toBe(1)
    expect(out[0].titleDe).toBe('Ein neues Thema')
    expect(out[0].source).toBe('custom')
    expect(out[0].id).toMatch(/^st-custom-/)
    expect(out[0].tags).toEqual(['Gesellschaft'])   // unknown tags filtered
  })

  it('throws when no usable topics survive after retries', async () => {
    const client = fakeClient(['garbage'])
    await expect(generateTopics(client, 'test-model')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/composables/useSprechenTopics.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the composable**

```ts
// src/composables/useSprechenTopics.ts
//
// Topic pool for Sprechen Teil 2 (see CONTEXT.md → "Topic"):
//   - 100 seeded Topics from src/data/sprechenTopics.ts
//   - AI-generated Topics persisted in localStorage['gt:sprechenCustomTopics']
//   - done-Topic memory derived from Run meta via loadHistory() — this keeps
//     working unchanged when history moves to Supabase (ADR-0005/0006).

import {
  SPRECHEN_TOPICS, TOPIC_GENERATOR_SCHEMA, TOPIC_TAGS,
  type SprechenTopic, type TopicTag
} from '../data/sprechenTopics'
import { loadHistory } from './useQuizHistory'

export const CUSTOM_TOPICS_KEY = 'gt:sprechenCustomTopics'

/** Fixed generation batch size (spec decision — keeps the call cheap). */
export const TOPICS_PER_GENERATION = 5

// ── Gemini client shape (matches useKonjunktivQuiz.GeminiClient) ──

export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

// ── Custom pool (localStorage) ──────────────────────────────────

function isValidStoredTopic(raw: unknown): raw is SprechenTopic {
  if (!raw || typeof raw !== 'object') return false
  const t = raw as Record<string, unknown>
  return typeof t.id === 'string' && typeof t.titleDe === 'string' &&
    typeof t.statementDe === 'string' && Array.isArray(t.tags)
}

export function loadCustomTopics(): SprechenTopic[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(CUSTOM_TOPICS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(isValidStoredTopic).map(t => ({
      id: t.id,
      titleDe: t.titleDe,
      statementDe: t.statementDe,
      tags: t.tags.filter((x): x is TopicTag => (TOPIC_TAGS as readonly string[]).includes(x as string)),
      level: 'B2' as const,
      source: 'custom' as const
    }))
  } catch {
    return []
  }
}

function saveCustomTopics(topics: SprechenTopic[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(CUSTOM_TOPICS_KEY, JSON.stringify(topics))
  } catch { /* ignore quota */ }
}

export function addCustomTopics(topics: SprechenTopic[]): void {
  saveCustomTopics([...loadCustomTopics(), ...topics])
}

export function deleteCustomTopic(id: string): void {
  saveCustomTopics(loadCustomTopics().filter(t => t.id !== id))
}

export function allTopics(): SprechenTopic[] {
  return [...SPRECHEN_TOPICS, ...loadCustomTopics()]
}

// ── Done-topic memory + random picker ───────────────────────────

export function doneTopicTitles(): Set<string> {
  const titles = new Set<string>()
  for (const e of loadHistory()) {
    if (e.type === 'sprechen-teil2' && typeof e.meta.topicTitle === 'string') {
      titles.add(e.meta.topicTitle)
    }
  }
  return titles
}

/** Random Topic, preferring ones not yet discussed; falls back to the full pool. */
export function pickRandomTopic(rng: () => number = Math.random): SprechenTopic {
  const pool = allTopics()
  const done = doneTopicTitles()
  const undone = pool.filter(t => !done.has(t.titleDe))
  const candidates = undone.length > 0 ? undone : pool
  return candidates[Math.floor(rng() * candidates.length)]
}

// ── Generator ───────────────────────────────────────────────────

export function validateGeneratedTopic(
  raw: unknown
): Pick<SprechenTopic, 'titleDe' | 'statementDe' | 'tags'> | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Record<string, unknown>
  if (typeof t.titleDe !== 'string' || typeof t.statementDe !== 'string') return null
  const titleDe = t.titleDe.trim()
  const statementDe = t.statementDe.trim()
  if (titleDe.length < 3 || titleDe.length > 60) return null
  if (statementDe.length < 15 || statementDe.length > 200) return null
  if (!Array.isArray(t.tags)) return null
  const tags = t.tags.filter((x): x is TopicTag => (TOPIC_TAGS as readonly string[]).includes(x as string))
  if (tags.length === 0) return null
  return { titleDe, statementDe, tags }
}

export function buildTopicGeneratorPrompt(
  existingTitles: string[],
  doneTitles: string[],
  rng: () => number = Math.random
): string {
  const tagPool = [...TOPIC_TAGS]
  const focus: string[] = []
  for (let i = 0; i < 4; i++) {
    focus.push(tagPool.splice(Math.floor(rng() * tagPool.length), 1)[0])
  }
  const seed = Math.floor(rng() * 1_000_000).toString(36)
  const avoid = [...new Set([...existingTitles, ...doneTitles])]
  return (
    `Generiere ${TOPICS_PER_GENERATION} neue Diskussionsthemen für eine Übung zum ` +
    'Goethe-Zertifikat B2, Sprechen Teil 2 (Diskussion).\n\n' +
    'ANFORDERUNGEN pro Thema:\n' +
    '- "titleDe": kurzes, eindeutiges Etikett (2–5 Wörter).\n' +
    '- "statementDe": EINE kontroverse Frage oder These auf B2-Niveau, über die ' +
    'zwei Personen ~5 Minuten pro und contra diskutieren können.\n' +
    `- "tags": 1–2 Kategorien, NUR aus dieser Liste: ${TOPIC_TAGS.join(', ')}.\n` +
    `- Bevorzuge in dieser Runde die Kategorien: ${focus.join(', ')}.\n` +
    '- Alltagsnah und meinungsfähig — keine Fachdebatten, nichts Verletzendes.\n\n' +
    'VERMEIDE thematische Überschneidung mit diesen bereits vorhandenen oder ' +
    `bereits diskutierten Themen:\n${avoid.map(t => `- ${t}`).join('\n')}\n\n` +
    `(Variations-Seed, nicht ausgeben: ${seed}.)\n` +
    'Antworte ausschließlich als JSON nach dem responseSchema.'
  )
}

export async function generateTopics(
  client: GeminiClient,
  model: string,
  maxRetries = 2
): Promise<SprechenTopic[]> {
  const existing = allTopics().map(t => t.titleDe)
  const done = [...doneTopicTitles()]
  const seenTitles = new Set(existing.map(t => t.toLowerCase()))
  const accepted: SprechenTopic[] = []
  let attempts = 0

  while (accepted.length === 0 && attempts <= maxRetries) {
    attempts++
    const response = await client.models.generateContent({
      model,
      contents: buildTopicGeneratorPrompt(existing, done),
      config: {
        responseMimeType: 'application/json',
        responseSchema: TOPIC_GENERATOR_SCHEMA as unknown as Record<string, unknown>,
        temperature: 0.85,
        topP: 0.95
      }
    })
    const text = response.text ?? ''
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      continue
    }
    const topics = (parsed as { topics?: unknown[] }).topics
    if (!Array.isArray(topics)) continue
    const stamp = Date.now()
    for (const raw of topics) {
      const v = validateGeneratedTopic(raw)
      if (v === null) continue
      if (seenTitles.has(v.titleDe.toLowerCase())) continue
      seenTitles.add(v.titleDe.toLowerCase())
      accepted.push({
        id: `st-custom-${stamp}-${accepted.length}`,
        ...v,
        level: 'B2',
        source: 'custom'
      })
      if (accepted.length >= TOPICS_PER_GENERATION) break
    }
  }

  if (accepted.length === 0) {
    throw new Error(`Topic generation produced no usable topics after ${attempts} attempts`)
  }
  return accepted
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/composables/useSprechenTopics.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useSprechenTopics.ts tests/composables/useSprechenTopics.test.ts
git commit -m "feat(sprechen): custom Topic pool, done-topic memory, random picker, AI generator"
```

---

### Task 9: The grader — schema, strict validator with re-anchoring, call

**Files:**
- Create: `src/composables/useSprechenGrader.ts`
- Test: `tests/composables/useSprechenGrader.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/composables/useSprechenGrader.test.ts
import { describe, expect, it } from 'vitest'
import type { SprechenDiscussion } from '../../src/data/sprechen'
import {
  buildSprechenGraderPrompt, gradeDiscussion, validateSprechenGrade
} from '../../src/composables/useSprechenGrader'

function disc(): SprechenDiscussion {
  return {
    id: 'd1',
    topic: { id: 'st-umwelt-tempolimit', titleDe: 'Tempolimit', statementDe: 'Brauchen wir ein generelles Tempolimit auf Autobahnen?', source: 'seed' },
    turnTarget: 6,
    stance: 'contra',
    status: 'submitted',
    turns: [
      { role: 'partner', textDe: 'Ich bin gegen ein Tempolimit.', at: 1 },
      { role: 'learner', textDe: 'Ich denke das ein Tempolimit gut ist.', at: 2 },
      { role: 'partner', textDe: 'Warum denn?', at: 3 },
      { role: 'learner', textDe: 'Weil es macht die Straßen sicherer.', at: 4 }
    ],
    kiTippCount: 0,
    startedAt: 0
  }
}

function validRaw() {
  return {
    totalScore: 74,
    passes: true,
    criteria: [
      { key: 'erfuellung', score: 20, justificationDe: 'Position klar vertreten.', justificationEn: 'Clear position.' },
      { key: 'kohaerenz', score: 18, justificationDe: 'Meist verbunden.', justificationEn: 'Mostly connected.' },
      { key: 'wortschatz', score: 19, justificationDe: 'Angemessen.', justificationEn: 'Adequate.' },
      { key: 'strukturen', score: 17, justificationDe: 'Verbstellung fehlerhaft.', justificationEn: 'Word-order errors.' }
    ],
    mistakes: [
      {
        turnIndex: 0, quote: 'das ein Tempolimit gut ist', suggested: 'dass ein Tempolimit gut ist',
        kind: 'spelling', reasonDe: '„dass" als Konjunktion.', reasonEn: '"dass" is the conjunction.'
      },
      {
        turnIndex: 1, quote: 'Weil es macht die Straßen sicherer', suggested: 'Weil es die Straßen sicherer macht',
        kind: 'word-order', reasonDe: 'Nebensatz: Verb ans Ende.', reasonEn: 'Subordinate clause: verb final.'
      }
    ],
    strengths: [{ de: 'Reagiert auf den Partner.', en: 'Responds to the partner.' }],
    weaknesses: [{ de: 'Nebensatz-Wortstellung.', en: 'Subordinate word order.' }],
    overallDe: 'Solide, aber Strukturen üben.', overallEn: 'Solid; practice structures.'
  }
}

describe('validateSprechenGrade', () => {
  it('accepts a valid result, re-anchors quotes, computes the Prädikat locally', () => {
    const r = validateSprechenGrade(validRaw(), disc())
    expect(r).not.toBeNull()
    expect(r!.totalScore).toBe(74)
    expect(r!.praedikat).toBe('befriedigend')
    expect(r!.mistakes.length).toBe(2)
    expect(r!.mistakes[0].spanStart).toBeGreaterThanOrEqual(0)
    // span indexes into the LEARNER turn text
    const learnerText = 'Ich denke das ein Tempolimit gut ist.'
    expect(learnerText.slice(r!.mistakes[0].spanStart, r!.mistakes[0].spanEnd)).toBe('das ein Tempolimit gut ist')
  })

  it('rejects when criterion sum ≠ totalScore', () => {
    const raw = validRaw()
    raw.totalScore = 99
    expect(validateSprechenGrade(raw, disc())).toBeNull()
  })

  it('rejects when passes disagrees with the 60-point threshold', () => {
    const raw = validRaw()
    raw.passes = false
    expect(validateSprechenGrade(raw, disc())).toBeNull()
  })

  it('rejects wrong criterion keys/order', () => {
    const raw = validRaw()
    raw.criteria[0].key = 'aussprache'
    expect(validateSprechenGrade(raw, disc())).toBeNull()
  })

  it('rejects out-of-range criterion scores', () => {
    const raw = validRaw()
    raw.criteria[0].score = 26
    expect(validateSprechenGrade(raw, disc())).toBeNull()
  })

  it('silently drops mistakes whose quote does not re-anchor', () => {
    const raw = validRaw()
    raw.mistakes[0].quote = 'text der nie geschrieben wurde'
    const r = validateSprechenGrade(raw, disc())
    expect(r).not.toBeNull()
    expect(r!.mistakes.length).toBe(1)
  })

  it('silently drops mistakes with bad kind or out-of-range turnIndex', () => {
    const raw = validRaw()
    ;(raw.mistakes[0] as { kind: string }).kind = 'pronunciation'
    raw.mistakes[1].turnIndex = 7
    const r = validateSprechenGrade(raw, disc())
    expect(r).not.toBeNull()
    expect(r!.mistakes.length).toBe(0)
  })
})

describe('buildSprechenGraderPrompt', () => {
  it('labels learner turns L0/L1 and embeds the rubric', () => {
    const { system, user } = buildSprechenGraderPrompt(disc())
    expect(user).toContain('L0: Ich denke das ein Tempolimit gut ist.')
    expect(user).toContain('L1: Weil es macht die Straßen sicherer.')
    expect(user).toContain('PARTNER: Warum denn?')
    expect(system).toContain('Erfüllung / Interaktion')
    expect(system).toContain('25')
  })

  it('adds the limited-material caveat below 3 learner turns', () => {
    const { user } = buildSprechenGraderPrompt(disc())
    expect(user).toContain('wenig Material')
  })
})

describe('gradeDiscussion', () => {
  it('retries on invalid payload then succeeds', async () => {
    let call = 0
    const client = {
      models: {
        generateContent: async () => ({
          text: call++ === 0 ? 'garbage' : JSON.stringify(validRaw())
        })
      }
    }
    const r = await gradeDiscussion(client, 'test-model', disc())
    expect(r.totalScore).toBe(74)
    expect(r.modelUsed).toBe('test-model')
  })

  it('throws SprechenGraderError after exhausting retries', async () => {
    const client = { models: { generateContent: async () => ({ text: 'garbage' }) } }
    await expect(gradeDiscussion(client, 'test-model', disc())).rejects.toThrow(/attempts/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/composables/useSprechenGrader.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the composable**

```ts
// src/composables/useSprechenGrader.ts
//
// Post-Discussion analysis (writing-grader pattern): one temperature-0 call,
// strict validator, per-turn quote re-anchoring. The result is NEVER persisted
// to Dexie — it flows to sessionStorage['gt:lastSprechenResult'] for the
// one-time result page, and only summary fields reach Run meta.

import { SPRECHEN_B2_TEIL2, praedikat, type Praedikat } from '../data/rubrics'
import type { DiscussionTurn, SprechenDiscussion } from '../data/sprechen'
import { learnerTurnCount } from '../data/sprechen'
import type { SprechenErrorTag } from './useQuizHistory'

// ── Result types ─────────────────────────────────────────────────

export interface SprechenMistake {
  turnIndex: number          // index into the LEARNER-turn list (0-based)
  quote: string              // verbatim from that learner turn
  suggested: string
  kind: SprechenErrorTag     // exactly one per mistake (see CONTEXT.md)
  reasonDe: string
  reasonEn: string
  spanStart: number          // char offsets within that learner turn's textDe
  spanEnd: number
}

export interface SprechenCriterionScore {
  key: string
  labelDe: string
  maxPoints: number
  score: number
  justificationDe: string
  justificationEn: string
}

export interface BilingualNote { de: string; en: string }

export interface SprechenGradeResult {
  totalScore: number
  passes: boolean
  praedikat: Praedikat       // computed locally from totalScore, never trusted from the model
  criteria: SprechenCriterionScore[]
  mistakes: SprechenMistake[]
  strengths: BilingualNote[]
  weaknesses: BilingualNote[]
  overallDe: string
  overallEn: string
  generatedAt: number
  modelUsed: string
}

// ── Gemini client shape (matches useKonjunktivQuiz.GeminiClient) ──

export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

export class SprechenGraderError extends Error {
  constructor(message: string, public readonly attempts: number) {
    super(message)
    this.name = 'SprechenGraderError'
  }
}

// ── Schema ───────────────────────────────────────────────────────

export const SPRECHEN_GRADE_SCHEMA = {
  type: 'object',
  properties: {
    totalScore: { type: 'number' },
    passes: { type: 'boolean' },
    criteria: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          score: { type: 'number' },
          justificationDe: { type: 'string' },
          justificationEn: { type: 'string' }
        },
        required: ['key', 'score', 'justificationDe', 'justificationEn']
      }
    },
    mistakes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          turnIndex: { type: 'number' },
          quote: { type: 'string' },
          suggested: { type: 'string' },
          kind: { type: 'string' },
          reasonDe: { type: 'string' },
          reasonEn: { type: 'string' }
        },
        required: ['turnIndex', 'quote', 'suggested', 'kind', 'reasonDe', 'reasonEn']
      }
    },
    strengths: {
      type: 'array',
      items: {
        type: 'object',
        properties: { de: { type: 'string' }, en: { type: 'string' } },
        required: ['de', 'en']
      }
    },
    weaknesses: {
      type: 'array',
      items: {
        type: 'object',
        properties: { de: { type: 'string' }, en: { type: 'string' } },
        required: ['de', 'en']
      }
    },
    overallDe: { type: 'string' },
    overallEn: { type: 'string' }
  },
  required: ['totalScore', 'passes', 'criteria', 'mistakes', 'strengths', 'weaknesses', 'overallDe', 'overallEn']
}

// ── Validator ────────────────────────────────────────────────────

const ERROR_TAGS: readonly string[] = ['grammar', 'word-order', 'vocabulary', 'spelling', 'register']

export function learnerTurns(d: Pick<SprechenDiscussion, 'turns'>): DiscussionTurn[] {
  return d.turns.filter(t => t.role === 'learner')
}

function reAnchor(quote: string, text: string): { spanStart: number; spanEnd: number } {
  if (quote.length === 0) return { spanStart: -1, spanEnd: -1 }
  const exact = text.indexOf(quote)
  if (exact >= 0) return { spanStart: exact, spanEnd: exact + quote.length }
  const lower = text.toLowerCase().indexOf(quote.toLowerCase())
  if (lower >= 0) return { spanStart: lower, spanEnd: lower + quote.length }
  return { spanStart: -1, spanEnd: -1 }
}

export function validateSprechenGrade(
  raw: unknown,
  d: SprechenDiscussion
): SprechenGradeResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  if (typeof r.totalScore !== 'number') return null
  if (typeof r.passes !== 'boolean') return null
  if (typeof r.overallDe !== 'string' || typeof r.overallEn !== 'string') return null
  if (!Array.isArray(r.criteria) || !Array.isArray(r.mistakes)) return null
  if (!Array.isArray(r.strengths) || !Array.isArray(r.weaknesses)) return null

  // Criteria — must match the rubric in order, integer score in range.
  if (r.criteria.length !== SPRECHEN_B2_TEIL2.criteria.length) return null
  const criteria: SprechenCriterionScore[] = []
  let sum = 0
  for (let i = 0; i < r.criteria.length; i++) {
    const expected = SPRECHEN_B2_TEIL2.criteria[i]
    const c = r.criteria[i] as Record<string, unknown>
    if (c.key !== expected.key) return null
    if (typeof c.score !== 'number' || !Number.isInteger(c.score)) return null
    if (c.score < 0 || c.score > expected.maxPoints) return null
    if (typeof c.justificationDe !== 'string' || typeof c.justificationEn !== 'string') return null
    sum += c.score
    criteria.push({
      key: expected.key,
      labelDe: expected.labelDe,
      maxPoints: expected.maxPoints,
      score: c.score,
      justificationDe: c.justificationDe,
      justificationEn: c.justificationEn
    })
  }

  // Strict consistency: sum and pass flag (writing-grader convention).
  if (sum !== r.totalScore) return null
  if ((r.totalScore >= SPRECHEN_B2_TEIL2.passingScore) !== r.passes) return null

  // Mistakes — silently drop what cannot be verified against the transcript.
  const lTurns = learnerTurns(d)
  const mistakes: SprechenMistake[] = (r.mistakes as Array<Record<string, unknown>>).flatMap(m => {
    if (typeof m.turnIndex !== 'number' || !Number.isInteger(m.turnIndex)) return []
    if (m.turnIndex < 0 || m.turnIndex >= lTurns.length) return []
    if (typeof m.quote !== 'string' || m.quote.trim().length === 0) return []
    if (typeof m.suggested !== 'string') return []
    if (typeof m.kind !== 'string' || !ERROR_TAGS.includes(m.kind)) return []
    if (typeof m.reasonDe !== 'string' || typeof m.reasonEn !== 'string') return []
    const anchored = reAnchor(m.quote, lTurns[m.turnIndex].textDe)
    if (anchored.spanStart < 0) return []
    return [{
      turnIndex: m.turnIndex,
      quote: m.quote,
      suggested: m.suggested,
      kind: m.kind as SprechenErrorTag,
      reasonDe: m.reasonDe,
      reasonEn: m.reasonEn,
      spanStart: anchored.spanStart,
      spanEnd: anchored.spanEnd
    }]
  })

  const notes = (arr: unknown[]): BilingualNote[] =>
    (arr as Array<Record<string, unknown>>).flatMap(n =>
      typeof n?.de === 'string' && typeof n?.en === 'string' ? [{ de: n.de, en: n.en }] : []
    )

  return {
    totalScore: r.totalScore,
    passes: r.passes,
    praedikat: praedikat(r.totalScore),
    criteria,
    mistakes,
    strengths: notes(r.strengths),
    weaknesses: notes(r.weaknesses),
    overallDe: r.overallDe,
    overallEn: r.overallEn,
    generatedAt: Date.now(),
    modelUsed: 'unknown'
  }
}

// ── Prompt builder ───────────────────────────────────────────────

export function buildSprechenGraderPrompt(
  d: SprechenDiscussion
): { system: string; user: string } {
  const rubricLines: string[] = []
  rubricLines.push(`RUBRIK: ${SPRECHEN_B2_TEIL2.labelDe}`)
  rubricLines.push(`Maximalpunktzahl: ${SPRECHEN_B2_TEIL2.totalMax} · Bestehensgrenze: ${SPRECHEN_B2_TEIL2.passingScore}`)
  rubricLines.push('')
  rubricLines.push('Kriterien (in dieser Reihenfolge, jedes mit max. Punktzahl):')
  for (const c of SPRECHEN_B2_TEIL2.criteria) {
    rubricLines.push(`- key="${c.key}" — ${c.labelDe} (max ${c.maxPoints} Punkte):`)
    rubricLines.push(`    ${c.descriptorDe}`)
  }
  rubricLines.push('')
  rubricLines.push(`Hinweis: ${SPRECHEN_B2_TEIL2.notes}`)

  const system =
    'Du bist eine strenge, kalibrierte Prüferin für die mündliche Goethe-B2-' +
    'Prüfung, die hier in getippter Form geübt wird. Du bewertest AUSSCHLIESSLICH ' +
    'die Beiträge des Lernenden (mit L0, L1, … markiert) nach der Rubrik unten — ' +
    'die PARTNER-Beiträge stammen von einer KI und werden nicht bewertet.\n\n' +
    'Zusätzlich markierst du JEDEN sprachlichen Fehler in den Lernerbeiträgen:\n' +
    '- "turnIndex": die Zahl hinter dem L des betroffenen Beitrags.\n' +
    '- "quote": die fehlerhafte Stelle WÖRTLICH aus dem Beitrag zitiert ' +
    '(exakte Zeichenfolge, keine Umformulierung).\n' +
    '- "suggested": die korrigierte Fassung der Stelle.\n' +
    '- "kind": GENAU EINE Kategorie aus: grammar (Kasus, Konjugation, Endungen), ' +
    'word-order (Verbstellung, Satzklammer), vocabulary (falsches Wort, ' +
    'Kollokation), spelling (Rechtschreibung), register (Du/Sie, Stilebene).\n' +
    '- "reasonDe" UND "reasonEn": kurze Erklärung, WARUM es falsch ist ' +
    '(Deutsch einfach halten — B2-Lernende lesen sie).\n\n' +
    'Für jedes Kriterium: ganzzahlige Punktzahl im erlaubten Bereich plus kurze ' +
    'Begründung auf Deutsch UND Englisch. totalScore ist die exakte Summe der ' +
    'vier Kriterien; passes ist totalScore >= 60. Danach Stärken, Schwächen und ' +
    'ein Gesamturteil, jeweils Deutsch und Englisch.\n' +
    'Antworte ausschließlich als JSON gemäß responseSchema — kein Prosa-Vorspann.\n\n' +
    rubricLines.join('\n')

  let li = 0
  const transcript = d.turns
    .map(t => t.role === 'learner' ? `L${li++}: ${t.textDe}` : `PARTNER: ${t.textDe}`)
    .join('\n')

  const fewTurns = learnerTurnCount(d) < 3
    ? '\n\nACHTUNG: Die Diskussion wurde früh beendet — es gibt wenig Material. ' +
      'Bewerte trotzdem nach der Rubrik, aber sei bei "erfuellung" entsprechend streng.'
    : ''

  const user =
    `THEMA: „${d.topic.titleDe}" — ${d.topic.statementDe}\n` +
    `Position des PARTNERS: ${d.stance === 'pro' ? 'dafür' : 'dagegen'}.\n\n` +
    `GESPRÄCH:\n${transcript}${fewTurns}`

  return { system, user }
}

// ── Grader call with retries ─────────────────────────────────────

export async function gradeDiscussion(
  client: GeminiClient,
  model: string,
  d: SprechenDiscussion,
  maxRetries = 2
): Promise<SprechenGradeResult> {
  const { system, user } = buildSprechenGraderPrompt(d)
  let attempts = 0
  let lastError = 'no attempts'

  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model,
        contents: user,
        config: {
          systemInstruction: system,
          responseMimeType: 'application/json',
          responseSchema: SPRECHEN_GRADE_SCHEMA as unknown as Record<string, unknown>,
          temperature: 0
        }
      })
      const text = response.text ?? ''
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        lastError = 'malformed JSON'
        continue
      }
      const validated = validateSprechenGrade(parsed, d)
      if (validated === null) {
        lastError = 'validation failed'
        continue
      }
      validated.modelUsed = model
      return validated
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new SprechenGraderError(`Grader exhausted ${attempts} attempts. Last error: ${lastError}`, attempts)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/composables/useSprechenGrader.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useSprechenGrader.ts tests/composables/useSprechenGrader.test.ts
git commit -m "feat(sprechen): B2 discussion grader with strict validator and quote re-anchoring"
```

---

### Task 10: Routes, nav item, Home card

UI tasks (10–15) have no unit tests (matches the AI-runner convention — Konjunktiv's runner has none); the gate is `npx vue-tsc --noEmit` per task and one manual smoke pass in Task 16. Task 10 references the five module components before they exist, so create them as minimal stubs in this task and flesh them out in Tasks 11–15.

**Files:**
- Modify: `src/router.ts`, `src/components/NavShell.vue`, `src/modules/home/Home.vue`
- Create (stubs): `src/modules/sprechen/SprechenHome.vue`, `SprechenCheatsheet.vue`, `Teil2Setup.vue`, `Teil2Runner.vue`, `Teil2Result.vue`

- [ ] **Step 1: Create the five stubs**

Each stub is the same three lines (adjust the title):

```vue
<template>
  <div class="page"><h1 class="section-title">Sprechen<em>.</em></h1></div>
</template>
```

- [ ] **Step 2: Add routes in `src/router.ts`** (after the `simulator-result` line, before the closing `]`; note the comment — same reasoning as dacompounds):

```ts
  // Sprechen. Route names share the hyphen-free head 'sprechen' because
  // NavShell derives the active tab via name.split('-')[0].
  { path: '/sprechen', name: 'sprechen', component: () => import('./modules/sprechen/SprechenHome.vue') },
  { path: '/sprechen/cheatsheet', name: 'sprechen-cheatsheet', component: () => import('./modules/sprechen/SprechenCheatsheet.vue') },
  { path: '/sprechen/teil2', name: 'sprechen-teil2', component: () => import('./modules/sprechen/Teil2Setup.vue') },
  { path: '/sprechen/teil2/run', name: 'sprechen-teil2-run', component: () => import('./modules/sprechen/Teil2Runner.vue') },
  { path: '/sprechen/teil2/result', name: 'sprechen-teil2-result', component: () => import('./modules/sprechen/Teil2Result.vue') }
```

- [ ] **Step 3: Add the nav item in `src/components/NavShell.vue`** — in the `items` array, after the `dacompounds` entry:

```ts
  { route: 'sprechen', label: 'Sprechen', de: 'Diskussion' },
```

- [ ] **Step 4: Add the Home card in `src/modules/home/Home.vue`**

Insert BEFORE the Settings card (Settings becomes numeral `'X'`):

```ts
  {
    numeral: 'IX',
    route: 'sprechen',
    de: 'Sprechen · Teil 2',
    title: 'Discussion',
    desc: 'Argue a controversial Topic with an AI partner in typed turns — Redemittel cheatsheet, layered hints, and a Goethe-B2 evaluation that marks every mistake.',
    meta: '100 topics · AI partner · B2-graded'
  },
```

Change the Settings card's `numeral: 'IX'` to `numeral: 'X'`, and the breadcrumb at the top of the template from `Frontispiece · I/IX` to `Frontispiece · I/X`.

- [ ] **Step 5: Typecheck and commit**

Run: `npx vue-tsc --noEmit`
Expected: exit 0.

```bash
git add src/router.ts src/components/NavShell.vue src/modules/home/Home.vue src/modules/sprechen/
git commit -m "feat(sprechen): routes, nav entry, Home card, module stubs"
```

---

### Task 11: SprechenHome.vue

**Files:**
- Modify: `src/modules/sprechen/SprechenHome.vue` (replace stub)

- [ ] **Step 1: Implement** (KonjunktivHome pattern + module cards; recent list shows the summary-only Runs):

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'

const router = useRouter()

const recent = computed(() =>
  loadHistory()
    .filter(h => h.type === 'sprechen-teil2')
    .slice(0, 5)
)

function go(name: string) { router.push({ name }) }
function back() { router.push({ name: 'home' }) }
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Sprechen</div>
        <h1 class="section-title">Sprechen<em>.</em></h1>
        <p class="section-subtitle">
          Goethe B2 speaking practice, typed. Teil 2: argue a controversial
          Topic with an AI partner, then get every mistake marked and a
          rubric-graded verdict. Aussprache stays out of scope — this trains
          argumentation, Redemittel, and reaction.
        </p>
      </div>
    </header>

    <div class="module-grid sprechen-grid">
      <article class="card module-card interactive" role="button" tabindex="0"
        @click="go('sprechen-cheatsheet')" @keydown.enter="go('sprechen-cheatsheet')">
        <div class="module-numeral">I</div>
        <h2>Cheatsheet</h2>
        <div class="module-de">Spickzettel · Redemittel</div>
        <p class="module-desc">
          Discussion phrases grouped by Move — agree, disagree, weigh up, ask
          back, give an example, conclude — plus how Teil 2 works.
        </p>
        <div class="module-cta">Open <span aria-hidden="true">→</span></div>
      </article>

      <article class="card module-card interactive" role="button" tabindex="0"
        @click="go('sprechen-teil2')" @keydown.enter="go('sprechen-teil2')">
        <div class="module-numeral">II</div>
        <h2>Diskussion</h2>
        <div class="module-de">Teil 2 · mit KI-Partner</div>
        <p class="module-desc">
          Pick or generate a Topic, choose your turn count, and argue your
          side. Afterwards: marked transcript, Prädikat, and per-criterion
          scores — the conversation itself is never stored.
        </p>
        <div class="module-cta">Start <span aria-hidden="true">→</span></div>
      </article>
    </div>

    <section v-if="recent.length > 0" class="recent-runs">
      <h3 class="recent-runs-title">Recent discussions</h3>
      <ul class="recent-runs-list">
        <li v-for="r in recent" :key="r.id">
          <span class="rr-date">{{ new Date(r.startedAt).toLocaleDateString() }}</span>
          <span class="rr-topic">{{ r.meta.topicTitle ?? '—' }}</span>
          <span class="rr-score">{{ r.correct }} / 100</span>
          <span class="rr-meta">{{ r.meta.sprechenPraedikat ?? '—' }}</span>
        </li>
      </ul>
    </section>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
    </div>
  </div>
</template>

<style scoped>
.sprechen-grid { margin-top: 12px; }
.recent-runs { margin-top: 32px; max-width: 720px; }
.recent-runs-title {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 12px;
}
.recent-runs-list { list-style: none; padding: 0; margin: 0; }
.recent-runs-list li {
  display: flex;
  gap: 16px;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px solid var(--hairline);
  font-size: 14px;
}
.rr-date { color: var(--mute); flex: 0 0 110px; font-variant-numeric: tabular-nums; }
.rr-topic { font-family: var(--font-display); flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rr-score { font-variant-numeric: tabular-nums; }
.rr-meta { color: var(--mute); font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; }
.setup-actions { display: flex; justify-content: flex-start; margin-top: 40px; }
</style>
```

- [ ] **Step 2: Typecheck and commit**

Run: `npx vue-tsc --noEmit`

```bash
git add src/modules/sprechen/SprechenHome.vue
git commit -m "feat(sprechen): module home with recent discussions list"
```

---

### Task 12: SprechenCheatsheet.vue — tab rail + Redemittel chapters

Uses the Settings tab-rail pattern (`.settings-rail` / `.settings-tab-header` styles already exist in `tokens.css`) so future Teile become sibling tabs; inside the single Teil 2 tab, one section per Move plus a strategy section.

**Files:**
- Modify: `src/modules/sprechen/SprechenCheatsheet.vue` (replace stub)

- [ ] **Step 1: Implement**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { MOVES, MOVE_LABEL, phrasesForMove } from '../../data/sprechenRedemittel'

type TabId = 'teil2'

interface TabSpec {
  id: TabId
  numeral: string
  titleDe: string
  titleEn: string
  blurb: string
}

// Single tab for now — Teil 1 (Vortrag) slots in as a sibling later.
const TABS: TabSpec[] = [
  {
    id: 'teil2',
    numeral: 'II',
    titleDe: 'Diskussion',
    titleEn: 'Teil 2 · Discussion',
    blurb: 'Redemittel for arguing a Topic: state, agree, disagree, weigh up, ask back, exemplify, conclude — and how the exam part works.'
  }
]

const activeTab = ref<TabId>('teil2')
const active = computed(() => TABS.find(t => t.id === activeTab.value) ?? TABS[0])

const moveNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
</script>

<template>
  <div class="page settings-page">
    <header class="section-header" style="margin-bottom: 32px;">
      <div>
        <div class="breadcrumb">Spickzettel · Cheatsheet</div>
        <h1 class="section-title">Sprechen<em>.</em></h1>
        <p class="section-subtitle">
          Stock phrases win discussions. Reach for the right Move, not the
          perfect sentence.
        </p>
      </div>
      <router-link :to="{ name: 'sprechen' }" class="btn btn-ghost">← Sprechen</router-link>
    </header>

    <div class="settings-layout">
      <aside class="settings-rail">
        <div class="rail-label">Teile</div>
        <ol>
          <li v-for="t in TABS" :key="t.id">
            <button type="button" :class="{ active: activeTab === t.id }" @click="activeTab = t.id">
              <span class="num">{{ t.numeral }}.</span>
              <span>{{ t.titleDe }} <span class="en">{{ t.titleEn }}</span></span>
            </button>
          </li>
        </ol>
      </aside>

      <main class="settings-main">
        <div class="settings-tab-header">
          <span class="micro-mark">Teil {{ active.numeral }}</span>
          <h2 class="settings-tab-title">{{ active.titleDe }}<em>.</em></h2>
          <p class="settings-tab-blurb">{{ active.blurb }}</p>
          <hr class="settings-tab-rule" />
        </div>

        <template v-if="activeTab === 'teil2'">
          <section class="rm-strategy">
            <h3 class="rm-heading">Strategie · how Teil 2 works</h3>
            <p>
              You and a partner discuss a controversial statement for about five
              minutes. Take a position early, react to your partner's arguments
              instead of monologuing, concede good points before countering, and
              close with a short summary. Graders reward <em>interaction</em>:
              agreeing, disagreeing, weighing up, and asking back all count.
            </p>
          </section>

          <section v-for="(m, i) in MOVES" :key="m" class="rm-group">
            <h3 class="rm-heading">
              <span class="rm-numeral">{{ moveNumerals[i] }}.</span>
              {{ MOVE_LABEL[m].de }}
              <span class="rm-en">{{ MOVE_LABEL[m].en }}</span>
            </h3>
            <ul class="rm-list">
              <li v-for="r in phrasesForMove(m)" :key="r.id">
                <span class="rm-phrase">{{ r.phraseDe }}</span>
                <span class="rm-note">{{ r.noteEn }}</span>
              </li>
            </ul>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
.rm-strategy { max-width: 640px; margin-bottom: 36px; }
.rm-strategy p { font-size: 15px; line-height: 1.65; color: var(--ink-soft); }
.rm-group { margin-bottom: 36px; }
.rm-heading {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 10px 0;
}
.rm-numeral { color: var(--accent); margin-right: 6px; }
.rm-en {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
  margin-left: 10px;
}
.rm-list { list-style: none; padding: 0; margin: 0; max-width: 640px; }
.rm-list li {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: baseline;
  padding: 7px 0;
  border-bottom: 1px solid var(--hairline);
}
.rm-phrase { font-family: var(--font-display); font-size: 16px; }
.rm-note { color: var(--mute); font-size: 12.5px; font-style: italic; text-align: right; flex: 0 0 auto; max-width: 45%; }
@media (max-width: 560px) {
  .rm-list li { flex-direction: column; gap: 2px; }
  .rm-note { text-align: left; max-width: 100%; }
}
</style>
```

- [ ] **Step 2: Typecheck and commit**

Run: `npx vue-tsc --noEmit`

```bash
git add src/modules/sprechen/SprechenCheatsheet.vue
git commit -m "feat(sprechen): tabbed Redemittel cheatsheet (Teil 2)"
```

---

### Task 13: Teil2Setup.vue

**Files:**
- Modify: `src/modules/sprechen/Teil2Setup.vue` (replace stub)

Behavior: `canUseAi` gate; **one active Discussion at a time** — if one exists, a resume/abandon panel replaces the start button; Topic modes *Zufallsthema* / *Auswählen*; a generator section that adds 5 custom Topics to the pool (with per-Topic delete); turn target 6/8/10; partner stance *Zufällig*/*dafür*/*dagegen*; hints on/off. Choices persist in `localStorage['sprechenTeil2Setup']`; start stashes runner params in `sessionStorage['gt:lastSprechenTeil2']`.

- [ ] **Step 1: Implement**

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { TURN_TARGETS, type PartnerStance, type SprechenDiscussion, type TurnTarget } from '../../data/sprechen'
import type { SprechenTopic } from '../../data/sprechenTopics'
import {
  abandonDiscussion, findActiveDiscussion
} from '../../composables/useSprechenDiscussion'
import {
  allTopics, deleteCustomTopic, generateTopics, addCustomTopics, loadCustomTopics, pickRandomTopic
} from '../../composables/useSprechenTopics'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

const STORAGE_KEY = 'sprechenTeil2Setup'
// NOTE: no `export` here — <script setup> blocks cannot export bindings.
interface SprechenSetupStored {
  mode?: 'random' | 'choose'
  topicId?: string
  turnTarget?: TurnTarget
  stance?: 'random' | 'pro' | 'contra'
  hintsOn?: boolean
  lang?: 'de' | 'en'
}

const router = useRouter()
const toast = useToast()
const { settings, canUseAi, load: loadSettings } = useSettings()

const mode = ref<'random' | 'choose'>('random')
const topicId = ref<string>('')
const turnTarget = ref<TurnTarget>(6)
const stance = ref<'random' | 'pro' | 'contra'>('random')
const hintsOn = ref(true)
const generating = ref(false)
const customTopics = ref<SprechenTopic[]>([])
const active = ref<SprechenDiscussion | null>(null)

const topics = computed(() => allTopics())

onMounted(async () => {
  await loadSettings()
  customTopics.value = loadCustomTopics()
  active.value = await findActiveDiscussion()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as SprechenSetupStored
    if (s.mode === 'random' || s.mode === 'choose') mode.value = s.mode
    if (typeof s.topicId === 'string') topicId.value = s.topicId
    if (s.turnTarget && (TURN_TARGETS as readonly number[]).includes(s.turnTarget)) turnTarget.value = s.turnTarget
    if (s.stance === 'random' || s.stance === 'pro' || s.stance === 'contra') stance.value = s.stance
    if (typeof s.hintsOn === 'boolean') hintsOn.value = s.hintsOn
  } catch { /* ignore */ }
})

watch([mode, topicId, turnTarget, stance, hintsOn], () => {
  try {
    const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as SprechenSetupStored
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...prev,
      mode: mode.value, topicId: topicId.value, turnTarget: turnTarget.value,
      stance: stance.value, hintsOn: hintsOn.value
    } satisfies SprechenSetupStored))
  } catch { /* ignore */ }
})

async function generate() {
  if (!canUseAi.value || generating.value) return
  generating.value = true
  try {
    const client = resolveAiClient(settings.value)
    const fresh = await generateTopics(client, settings.value.model)
    addCustomTopics(fresh)
    customTopics.value = loadCustomTopics()
    toast.success(`${fresh.length} neue Themen im Pool`)
  } catch (err) {
    toast.error('Themengenerierung fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    generating.value = false
  }
}

function removeCustom(id: string) {
  deleteCustomTopic(id)
  customTopics.value = loadCustomTopics()
  if (topicId.value === id) topicId.value = ''
}

function resumeActive() { router.push({ name: 'sprechen-teil2-run' }) }

async function discardActive() {
  if (!active.value) return
  await abandonDiscussion(active.value.id)
  active.value = null
}

function start() {
  if (!canUseAi.value) {
    toast.error(
      settings.value.aiProvider === 'local-claude' ? 'Local Claude not reachable' : 'Gemini API key required',
      { description: settings.value.aiProvider === 'local-claude'
          ? 'Run the app with npm run dev, or switch to Gemini in Settings.'
          : 'Set your API key in Settings before using AI.' }
    )
    return
  }
  const topic = mode.value === 'choose'
    ? topics.value.find(t => t.id === topicId.value)
    : pickRandomTopic()
  if (!topic) {
    toast.error('Kein Thema gewählt', { description: 'Wähle ein Thema aus der Liste oder nimm Zufallsthema.' })
    return
  }
  const resolvedStance: PartnerStance = stance.value === 'random'
    ? (Math.random() < 0.5 ? 'pro' : 'contra')
    : stance.value
  sessionStorage.setItem('gt:lastSprechenTeil2', JSON.stringify({
    topic: { id: topic.id, titleDe: topic.titleDe, statementDe: topic.statementDe, source: topic.source },
    turnTarget: turnTarget.value,
    stance: resolvedStance,
    hintsOn: hintsOn.value,
    model: settings.value.model
  }))
  router.push({ name: 'sprechen-teil2-run' })
}

function back() { router.push({ name: 'sprechen' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Sprechen Teil 2 · Einrichtung</div>
        <h1 class="section-title">Diskussion<em>.</em></h1>
        <p class="section-subtitle">
          Pick a Topic and argue your side. The partner takes a stance and
          argues back; your mistakes are marked only afterwards.
        </p>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning">
      <span class="alert-label">AI access needed</span>
      Set a Gemini API key, or pick <em>Local Claude (dev)</em>, in <router-link :to="{ name: 'settings' }">Settings</router-link>.
    </div>

    <div v-if="active" class="alert alert-info">
      <span class="alert-label">Diskussion fortsetzen?</span>
      An unfinished discussion on „{{ active.topic.titleDe }}" exists
      ({{ active.turns.filter(t => t.role === 'learner').length }} / {{ active.turnTarget }} turns).
      <div class="resume-actions">
        <button class="btn btn-accent" type="button" @click="resumeActive">Fortsetzen →</button>
        <button class="btn btn-danger" type="button" @click="discardActive">Verwerfen</button>
      </div>
    </div>

    <template v-if="!active">
      <div class="field">
        <div class="field-label">Thema</div>
        <div class="segmented">
          <button type="button" :class="{ active: mode === 'random' }" @click="mode = 'random'">Zufallsthema</button>
          <button type="button" :class="{ active: mode === 'choose' }" @click="mode = 'choose'">Auswählen</button>
        </div>
        <select v-if="mode === 'choose'" v-model="topicId" class="select topic-select">
          <option value="" disabled>— Thema wählen —</option>
          <optgroup label="Seed">
            <option v-for="t in topics.filter(t => t.source === 'seed')" :key="t.id" :value="t.id">{{ t.titleDe }}</option>
          </optgroup>
          <optgroup v-if="customTopics.length > 0" label="Eigene (generiert)">
            <option v-for="t in customTopics" :key="t.id" :value="t.id">{{ t.titleDe }}</option>
          </optgroup>
        </select>
      </div>

      <div class="field">
        <div class="field-label">Neue Themen generieren</div>
        <button class="btn btn-ghost" type="button" :disabled="!canUseAi || generating" @click="generate">
          {{ generating ? 'Generiere…' : '5 neue Themen generieren' }}
        </button>
        <p class="ai-cost-note">Merkt sich bereits diskutierte Themen und vermeidet Wiederholungen.</p>
        <ul v-if="customTopics.length > 0" class="custom-topic-list">
          <li v-for="t in customTopics" :key="t.id">
            <span class="ct-title">{{ t.titleDe }}</span>
            <span class="ct-statement">{{ t.statementDe }}</span>
            <button class="btn btn-quiet" type="button" @click="removeCustom(t.id)">Löschen</button>
          </li>
        </ul>
      </div>

      <div class="field">
        <div class="field-label">Deine Redebeiträge</div>
        <div class="segmented">
          <button v-for="n in TURN_TARGETS" :key="n" type="button"
            :class="{ active: turnTarget === n }" @click="turnTarget = n">{{ n }}</button>
        </div>
      </div>

      <div class="field">
        <div class="field-label">Position des Partners</div>
        <div class="segmented">
          <button type="button" :class="{ active: stance === 'random' }" @click="stance = 'random'">Zufällig</button>
          <button type="button" :class="{ active: stance === 'pro' }" @click="stance = 'pro'">Dafür</button>
          <button type="button" :class="{ active: stance === 'contra' }" @click="stance = 'contra'">Dagegen</button>
        </div>
      </div>

      <div class="field">
        <div class="field-label">Hints</div>
        <div class="segmented">
          <button type="button" :class="{ active: hintsOn }" @click="hintsOn = true">An</button>
          <button type="button" :class="{ active: !hintsOn }" @click="hintsOn = false">Aus</button>
        </div>
        <p class="ai-cost-note">Move-Chips mit Redemitteln (kostenlos) + KI-Tipp auf Abruf (1 Call).</p>
      </div>

      <div class="alert alert-info">
        <span class="alert-label">How it works</span>
        The partner opens with its position, you alternate typed turns, and
        after your last turn the discussion is analyzed: every mistake marked
        and explained, four criteria scored to 100 points (Aussprache excluded).
        The conversation itself is never stored — only the summary.
      </div>

      <div class="setup-actions">
        <button class="btn btn-ghost" type="button" @click="back">← Back</button>
        <button class="btn btn-accent btn-meta" type="button"
          :disabled="!canUseAi || (mode === 'choose' && !topicId)" @click="start">
          <span class="bm-main">Start discussion <span aria-hidden="true">→</span></span>
          <span class="bm-sub">{{ turnTarget }} Beiträge · Partner {{ stance === 'random' ? 'zufällig' : stance === 'pro' ? 'dafür' : 'dagegen' }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
.resume-actions { display: flex; gap: 10px; margin-top: 10px; }
.topic-select { margin-top: 10px; width: 100%; }
.custom-topic-list { list-style: none; padding: 0; margin: 12px 0 0 0; }
.custom-topic-list li {
  display: flex; gap: 12px; align-items: baseline;
  padding: 6px 0; border-bottom: 1px solid var(--hairline); font-size: 14px;
}
.ct-title { font-family: var(--font-display); flex: 0 0 auto; }
.ct-statement { color: var(--mute); flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-cost-note {
  margin: 8px 0 0 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--mute);
  text-transform: uppercase;
}
</style>
```

Note: `useToast` — check the composable's exact API before using (`toast.success(title)` exists in the codebase; if it does not, use `toast.info` or the two-arg `toast.error` shape seen in `QuizSetup.vue`).

- [ ] **Step 2: Typecheck and commit**

Run: `npx vue-tsc --noEmit`

```bash
git add src/modules/sprechen/Teil2Setup.vue
git commit -m "feat(sprechen): Teil 2 setup with topic picker, generator, resume gate"
```

---

### Task 14: Teil2Runner.vue — the discussion

**Files:**
- Modify: `src/composables/useSprechenGrader.ts` (append the result-stash contract)
- Modify: `src/modules/sprechen/Teil2Runner.vue` (replace stub)

- [ ] **Step 1: Append the result-stash contract to `src/composables/useSprechenGrader.ts`**

```ts
// ── Result stash (runner → result page, sessionStorage) ─────────

export const SPRECHEN_RESULT_KEY = 'gt:lastSprechenResult'

/** One-time payload for the result page. Dies with the tab — by design. */
export interface SprechenResultStash {
  topic: { id: string; titleDe: string; statementDe: string; source: 'seed' | 'custom' }
  stance: 'pro' | 'contra'
  turnTarget: number
  turns: DiscussionTurn[]
  kiTippCount: number
  startedAt: number
  finishedAt: number
  result: SprechenGradeResult
}
```

- [ ] **Step 2: Implement the runner**

```vue
<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { SprechenDiscussion, TurnTarget } from '../../data/sprechen'
import { learnerTurnCount } from '../../data/sprechen'
import { HINT_MOVES, MOVE_LABEL, phrasesForMove, type Move } from '../../data/sprechenRedemittel'
import {
  appendTurn, createDiscussion, deleteDiscussion, findActiveDiscussion,
  incrementKiTipp, markSubmitted
} from '../../composables/useSprechenDiscussion'
import {
  computePhase, generateKiTipp, generatePartnerTurn
} from '../../composables/useSprechenPartner'
import {
  SPRECHEN_RESULT_KEY, gradeDiscussion, type SprechenResultStash
} from '../../composables/useSprechenGrader'
import { saveQuizRun, type SprechenErrorTag } from '../../composables/useQuizHistory'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

interface RunStash {
  topic: SprechenDiscussion['topic']
  turnTarget: TurnTarget
  stance: 'pro' | 'contra'
  hintsOn: boolean
  model: string
}

const router = useRouter()
const toast = useToast()
const { settings, load: loadSettings } = useSettings()

const discussion = ref<SprechenDiscussion | null>(null)
const input = ref('')
const hintsOn = ref(true)
const activeMove = ref<Move | null>(null)
const kiTipp = ref<string | null>(null)
const kiTippBusy = ref(false)
const partnerBusy = ref(false)
const partnerFailed = ref(false)
const grading = ref(false)
const gradeFailed = ref(false)
const error = ref<string | null>(null)
const model = ref('')

const learnerCount = computed(() => discussion.value ? learnerTurnCount(discussion.value) : 0)
const target = computed(() => discussion.value?.turnTarget ?? 6)
const myTurn = computed(() =>
  !!discussion.value && !partnerBusy.value && !grading.value &&
  discussion.value.status === 'in_progress' &&
  (discussion.value.turns.length === 0
    ? false
    : discussion.value.turns[discussion.value.turns.length - 1].role === 'partner')
)

onMounted(async () => {
  await loadSettings()
  model.value = settings.value.model
  const raw = sessionStorage.getItem('gt:lastSprechenTeil2')
  if (raw) {
    sessionStorage.removeItem('gt:lastSprechenTeil2')
    try {
      const s = JSON.parse(raw) as RunStash
      hintsOn.value = s.hintsOn
      if (s.model) model.value = s.model
      discussion.value = await createDiscussion(s.topic, s.turnTarget, s.stance)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to start.'
      return
    }
  } else {
    discussion.value = await findActiveDiscussion()
    if (!discussion.value) {
      error.value = 'No discussion found. Go back to setup and start one.'
      return
    }
  }
  if (discussion.value.status === 'submitted') {
    await runGrading()
    return
  }
  await ensurePartnerTurn()
})

/** Fires the pending partner call: opening, reply, or closing (then grading). */
async function ensurePartnerTurn() {
  const d = discussion.value
  if (!d || partnerBusy.value || d.status !== 'in_progress') return
  const last = d.turns[d.turns.length - 1]
  if (d.turns.length > 0 && last.role === 'partner') return   // learner's turn
  const phase = computePhase(d)
  partnerBusy.value = true
  partnerFailed.value = false
  try {
    const client = resolveAiClient(settings.value)
    const reply = await generatePartnerTurn(client, model.value, d, phase)
    const turn = { role: 'partner' as const, textDe: reply, at: Date.now() }
    await appendTurn(d.id, turn)
    d.turns = [...d.turns, turn]
    scrollToEnd()
    if (phase === 'closing') await finish()
  } catch (err) {
    partnerFailed.value = true   // transcript is already safe in Dexie
    toast.error('Partner antwortet nicht', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    partnerBusy.value = false
  }
}

async function send() {
  const d = discussion.value
  const text = input.value.trim()
  if (!d || !myTurn.value || text.length === 0) return
  const turn = { role: 'learner' as const, textDe: text, at: Date.now() }
  await appendTurn(d.id, turn)
  d.turns = [...d.turns, turn]
  input.value = ''
  kiTipp.value = null
  activeMove.value = null
  scrollToEnd()
  await ensurePartnerTurn()
}

async function endEarly() {
  const d = discussion.value
  if (!d || grading.value) return
  const warn = learnerCount.value < 3
    ? 'Mit weniger als 3 Beiträgen ist die Bewertung wenig aussagekräftig. Trotzdem beenden?'
    : 'Diskussion beenden und auswerten?'
  if (!window.confirm(warn)) return
  await finish()
}

async function finish() {
  const d = discussion.value
  if (!d) return
  if (d.status === 'in_progress') {
    await markSubmitted(d.id)
    d.status = 'submitted'
    d.endedAt = Date.now()
  }
  await runGrading()
}

async function runGrading() {
  const d = discussion.value
  if (!d || grading.value) return
  grading.value = true
  gradeFailed.value = false
  try {
    const client = resolveAiClient(settings.value)
    const result = await gradeDiscussion(client, model.value, d)
    const finishedAt = d.endedAt ?? Date.now()

    // 1. Record the summary Run (must succeed before the row is deleted).
    const counts: Partial<Record<SprechenErrorTag, number>> = {}
    for (const m of result.mistakes) counts[m.kind] = (counts[m.kind] ?? 0) + 1
    saveQuizRun({
      type: 'sprechen-teil2',
      startedAt: new Date(d.startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationMs: finishedAt - d.startedAt,
      count: 100,
      correct: result.totalScore,
      meta: {
        topicTitle: d.topic.titleDe,
        turnTarget: d.turnTarget,
        learnerTurns: learnerTurnCount(d),
        sprechenScore: result.totalScore,
        sprechenPraedikat: result.praedikat,
        sprechenCriteria: result.criteria.map(c => ({ key: c.key, score: c.score, maxPoints: c.maxPoints })),
        sprechenMistakeCounts: counts,
        kiTippCount: d.kiTippCount,
        sprechenStrengths: result.strengths,
        sprechenWeaknesses: result.weaknesses,
        sprechenOverallDe: result.overallDe,
        sprechenOverallEn: result.overallEn,
        passes: result.passes
      }
    })

    // 2. Stash the full analysis for the one-time result page.
    const stash: SprechenResultStash = {
      topic: d.topic,
      stance: d.stance,
      turnTarget: d.turnTarget,
      turns: d.turns,
      kiTippCount: d.kiTippCount,
      startedAt: d.startedAt,
      finishedAt,
      result
    }
    sessionStorage.setItem(SPRECHEN_RESULT_KEY, JSON.stringify(stash))

    // 3. Delete the ephemeral row — the conversation is gone by design.
    await deleteDiscussion(d.id)
    router.push({ name: 'sprechen-teil2-result' })
  } catch (err) {
    gradeFailed.value = true
    toast.error('Analyse fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    grading.value = false
  }
}

async function fetchKiTipp() {
  const d = discussion.value
  if (!d || kiTippBusy.value) return
  kiTippBusy.value = true
  try {
    const client = resolveAiClient(settings.value)
    kiTipp.value = await generateKiTipp(client, model.value, d)
    await incrementKiTipp(d.id)
    d.kiTippCount += 1
  } catch (err) {
    toast.error('KI-Tipp fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    kiTippBusy.value = false
  }
}

function toggleMove(m: Move) { activeMove.value = activeMove.value === m ? null : m }

function scrollToEnd() {
  void nextTick(() => {
    const el = document.querySelector('.chat-scroll')
    if (el) el.scrollTop = el.scrollHeight
  })
}

function onEnter(e: KeyboardEvent) {
  if (e.shiftKey) return          // Shift+Enter = newline
  e.preventDefault()
  void send()
}

function backToSetup() { router.push({ name: 'sprechen-teil2' }) }
</script>

<template>
  <div v-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="backToSetup">← Back to setup</button>
  </div>

  <div v-else-if="!discussion" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else class="page discussion-page">
    <header class="discussion-head">
      <div>
        <div class="breadcrumb">Sprechen Teil 2 · Diskussion</div>
        <h1 class="discussion-topic">{{ discussion.topic.statementDe }}</h1>
        <div class="micro-mark">Partner: {{ discussion.stance === 'pro' ? 'dafür' : 'dagegen' }}</div>
      </div>
      <div class="discussion-meta">
        <span class="quiz-counter">Beitrag {{ Math.min(learnerCount + 1, target) }} · von {{ target }}</span>
        <button class="btn btn-quiet" type="button" :disabled="grading" @click="endEarly">Diskussion beenden</button>
      </div>
    </header>

    <div class="quiz-meter" role="progressbar" :aria-valuenow="learnerCount" :aria-valuemax="target">
      <div class="quiz-meter-fill" :style="{ width: `${(learnerCount / target) * 100}%` }" />
    </div>

    <div class="chat-scroll">
      <div v-for="(t, i) in discussion.turns" :key="i"
        class="chat-turn" :class="t.role === 'learner' ? 'chat-learner' : 'chat-partner'">
        <div class="chat-role">{{ t.role === 'learner' ? 'Du' : 'Partner' }}</div>
        <div class="chat-text">{{ t.textDe }}</div>
      </div>
      <div v-if="partnerBusy" class="chat-turn chat-partner">
        <div class="chat-role">Partner</div>
        <div class="chat-text chat-typing">…</div>
      </div>
    </div>

    <div v-if="partnerFailed && !grading" class="alert alert-warning">
      <span class="alert-label">Partner antwortet nicht</span>
      Dein Gespräch ist gespeichert — nichts geht verloren.
      <button class="btn btn-accent" type="button" @click="ensurePartnerTurn">Nochmal senden</button>
    </div>

    <div v-if="grading" class="alert alert-info">
      <span class="alert-label">Auswertung</span>
      Die Diskussion wird analysiert — jeden Fehler markieren dauert einen Moment…
    </div>
    <div v-else-if="gradeFailed" class="alert alert-danger">
      <span class="alert-label">Analyse fehlgeschlagen</span>
      Die Diskussion ist gespeichert und kann erneut ausgewertet werden.
      <button class="btn btn-accent" type="button" @click="runGrading">Analyse erneut versuchen</button>
    </div>

    <template v-else-if="discussion.status === 'in_progress'">
      <div v-if="hintsOn && myTurn" class="hint-panel">
        <div class="hint-chips chip-row">
          <button v-for="m in HINT_MOVES" :key="m" type="button"
            class="chip" :class="{ selected: activeMove === m }" @click="toggleMove(m)">
            {{ MOVE_LABEL[m].de }}
          </button>
          <button class="chip chip-ki" type="button" :disabled="kiTippBusy" @click="fetchKiTipp">
            {{ kiTippBusy ? 'KI-Tipp…' : '✦ KI-Tipp' }}
          </button>
        </div>
        <ul v-if="activeMove" class="hint-phrases">
          <li v-for="r in phrasesForMove(activeMove).slice(0, 3)" :key="r.id">{{ r.phraseDe }}</li>
        </ul>
        <p v-if="kiTipp" class="hint-kitipp">{{ kiTipp }}</p>
      </div>

      <div class="chat-input-row">
        <textarea
          v-model="input"
          class="input chat-input"
          rows="3"
          :disabled="!myTurn"
          :placeholder="myTurn ? 'Dein Beitrag auf Deutsch… (Enter senden, Shift+Enter neue Zeile)' : 'Der Partner ist am Zug…'"
          @keydown.enter="onEnter"
        />
        <button class="btn btn-accent" type="button"
          :disabled="!myTurn || input.trim().length === 0" @click="send">Senden</button>
      </div>
      <div class="hint-toggle-row">
        <button class="btn btn-quiet" type="button" @click="hintsOn = !hintsOn">
          Hints {{ hintsOn ? 'ausblenden' : 'einblenden' }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.discussion-page { max-width: 760px; }
.discussion-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 12px; }
.discussion-topic { font-family: var(--font-display); font-size: 24px; font-style: italic; line-height: 1.35; margin: 4px 0; }
.discussion-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex: 0 0 auto; }
.chat-scroll { max-height: 46vh; overflow-y: auto; margin: 20px 0; display: flex; flex-direction: column; gap: 14px; padding-right: 6px; }
.chat-turn { max-width: 85%; }
.chat-partner { align-self: flex-start; }
.chat-learner { align-self: flex-end; text-align: right; }
.chat-role {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 3px;
}
.chat-text {
  display: inline-block; padding: 10px 14px; border-radius: 6px;
  font-size: 15.5px; line-height: 1.55; text-align: left;
  background: var(--paper-deep); border: 1px solid var(--hairline);
}
.chat-learner .chat-text { background: var(--accent-tint); border-color: transparent; }
.chat-typing { color: var(--mute); letter-spacing: 0.2em; }
.hint-panel { margin: 8px 0 14px; }
.chip-ki { color: var(--accent); }
.hint-phrases { list-style: none; margin: 10px 0 0; padding: 0; }
.hint-phrases li {
  font-family: var(--font-display); font-style: italic; font-size: 15px;
  padding: 4px 0; border-bottom: 1px dotted var(--hairline);
}
.hint-kitipp {
  margin: 10px 0 0; padding: 10px 14px; font-size: 14px; line-height: 1.5;
  background: var(--paper-deep); border-left: 3px solid var(--accent); border-radius: 4px;
}
.chat-input-row { display: flex; gap: 10px; align-items: flex-end; }
.chat-input { flex: 1 1 auto; resize: vertical; }
.hint-toggle-row { margin-top: 8px; display: flex; justify-content: flex-end; }
@media (max-width: 720px) {
  .discussion-head { flex-direction: column; }
  .discussion-meta { flex-direction: row; align-items: center; justify-content: space-between; width: 100%; }
  .chat-turn { max-width: 100%; }
}
</style>
```

Note: `.quiz-meter-fill` — verify the exact inner-fill class name used by `QuizProgress.vue`/`tokens.css` (2046–2101) and reuse it; if the app's meter is a standalone component, use that component instead of raw divs.

- [ ] **Step 3: Typecheck and commit**

Run: `npx vue-tsc --noEmit`

```bash
git add src/composables/useSprechenGrader.ts src/modules/sprechen/Teil2Runner.vue
git commit -m "feat(sprechen): discussion runner — chat flow, hints, KI-Tipp, grade-record-delete pipeline"
```

---

### Task 15: Teil2Result.vue — one-time marked analysis

**Files:**
- Modify: `src/modules/sprechen/Teil2Result.vue` (replace stub)

Reads `sessionStorage['gt:lastSprechenResult']` (survives a reload of the tab, dies with it — deliberate). No history write here — the runner already recorded the Run before deleting the Discussion row.

- [ ] **Step 1: Implement**

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  SPRECHEN_RESULT_KEY, type SprechenMistake, type SprechenResultStash
} from '../../composables/useSprechenGrader'

const router = useRouter()
const data = ref<SprechenResultStash | null>(null)
const error = ref<string | null>(null)
const lang = ref<'de' | 'en'>('de')
const selected = ref<SprechenMistake | null>(null)

const SETUP_KEY = 'sprechenTeil2Setup'

onMounted(() => {
  try {
    const raw = sessionStorage.getItem(SPRECHEN_RESULT_KEY)
    if (!raw) {
      error.value = 'No analysis here — results are shown once, right after a discussion. Past scores live in History.'
      return
    }
    data.value = JSON.parse(raw) as SprechenResultStash
    const setup = JSON.parse(localStorage.getItem(SETUP_KEY) ?? '{}') as { lang?: 'de' | 'en' }
    if (setup.lang === 'en' || setup.lang === 'de') lang.value = setup.lang
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load result.'
  }
})

function setLang(l: 'de' | 'en') {
  lang.value = l
  try {
    const prev = JSON.parse(localStorage.getItem(SETUP_KEY) ?? '{}') as Record<string, unknown>
    localStorage.setItem(SETUP_KEY, JSON.stringify({ ...prev, lang: l }))
  } catch { /* ignore */ }
}

const learnerTurnIndexes = computed(() => {
  if (!data.value) return new Map<number, number>()
  // Map absolute turn index -> learner-turn index (what mistakes reference).
  const map = new Map<number, number>()
  let li = 0
  data.value.turns.forEach((t, abs) => { if (t.role === 'learner') map.set(abs, li++) })
  return map
})

interface Seg { text: string; mistake?: SprechenMistake }

function segmentTurn(text: string, mistakes: SprechenMistake[]): Seg[] {
  const sorted = [...mistakes].sort((a, b) => a.spanStart - b.spanStart)
  const segs: Seg[] = []
  let pos = 0
  for (const m of sorted) {
    if (m.spanStart < pos) continue                        // overlap — first wins
    if (m.spanStart > pos) segs.push({ text: text.slice(pos, m.spanStart) })
    segs.push({ text: text.slice(m.spanStart, m.spanEnd), mistake: m })
    pos = m.spanEnd
  }
  if (pos < text.length) segs.push({ text: text.slice(pos) })
  return segs
}

function mistakesForLearnerTurn(li: number): SprechenMistake[] {
  return data.value?.result.mistakes.filter(m => m.turnIndex === li) ?? []
}

const mistakeCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const m of data.value?.result.mistakes ?? []) {
    counts.set(m.kind, (counts.get(m.kind) ?? 0) + 1)
  }
  return [...counts.entries()]
})

const learnerTurnsTotal = computed(() =>
  data.value ? data.value.turns.filter(t => t.role === 'learner').length : 0
)

const KIND_LABEL: Record<string, string> = {
  grammar: 'Grammatik', 'word-order': 'Wortstellung', vocabulary: 'Wortschatz',
  spelling: 'Rechtschreibung', register: 'Register'
}

function newRun() { router.push({ name: 'sprechen-teil2' }) }
function home() { router.push({ name: 'sprechen' }) }
</script>

<template>
  <div v-if="error" class="page">
    <div class="alert alert-info"><span class="alert-label">Hinweis</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="home">← Sprechen</button>
  </div>

  <div v-else-if="data" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Sprechen Teil 2</div>
        <div class="result-score">{{ data.result.totalScore }}<span class="denom"> / 100</span></div>
        <div class="praedikat-stamp" :class="data.result.passes ? 'praedikat-pass' : 'praedikat-fail'">
          {{ data.result.praedikat }}
        </div>
        <p class="section-subtitle">„{{ data.topic.titleDe }}" · {{ learnerTurnsTotal }} Beiträge
          <template v-if="data.kiTippCount > 0"> · {{ data.kiTippCount }} KI-Tipp{{ data.kiTippCount === 1 ? '' : 's' }} verwendet</template>
        </p>
      </div>
      <div class="result-actions">
        <div class="segmented lang-toggle">
          <button type="button" :class="{ active: lang === 'de' }" @click="setLang('de')">DE</button>
          <button type="button" :class="{ active: lang === 'en' }" @click="setLang('en')">EN</button>
        </div>
        <button class="btn btn-ghost" type="button" @click="home">Sprechen</button>
        <button class="btn btn-accent" type="button" @click="newRun">Neue Diskussion <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="alert alert-info">
      <span class="alert-label">Bewertungsumfang</span>
      Getippte Übung: <strong>Aussprache wird nicht bewertet</strong> — vier Kriterien à 25 Punkte,
      Bestehensgrenze 60. Diese Auswertung ist nur hier sichtbar; im Verlauf bleibt die Zusammenfassung.
    </div>
    <div v-if="learnerTurnsTotal < 3" class="alert alert-warning">
      <span class="alert-label">Wenig Material</span>
      Die Diskussion wurde früh beendet — die Bewertung beruht auf sehr wenig Text.
    </div>

    <h3 class="block-heading">Kriterien</h3>
    <table class="data-table criteria-table">
      <thead><tr><th>Kriterium</th><th>Punkte</th><th>Begründung</th></tr></thead>
      <tbody>
        <tr v-for="c in data.result.criteria" :key="c.key">
          <td>{{ c.labelDe }}</td>
          <td class="crit-score">{{ c.score }} / {{ c.maxPoints }}</td>
          <td>{{ lang === 'de' ? c.justificationDe : c.justificationEn }}</td>
        </tr>
      </tbody>
    </table>

    <h3 class="block-heading">Gespräch · deine Fehler markiert</h3>
    <div class="marked-transcript">
      <div v-for="(t, abs) in data.turns" :key="abs"
        class="mt-turn" :class="t.role === 'learner' ? 'mt-learner' : 'mt-partner'">
        <div class="mt-role">{{ t.role === 'learner' ? 'Du' : 'Partner' }}</div>
        <div class="mt-text">
          <template v-if="t.role === 'partner'">{{ t.textDe }}</template>
          <template v-else>
            <template v-for="(seg, si) in segmentTurn(t.textDe, mistakesForLearnerTurn(learnerTurnIndexes.get(abs) ?? -1))" :key="si">
              <button v-if="seg.mistake" type="button" class="mt-mistake"
                :class="{ selected: selected === seg.mistake }"
                @click="selected = selected === seg.mistake ? null : seg.mistake">{{ seg.text }}</button>
              <span v-else>{{ seg.text }}</span>
            </template>
          </template>
        </div>
      </div>
    </div>

    <div v-if="selected" class="mistake-card">
      <div class="mk-head">
        <span class="tag tag-accent">{{ KIND_LABEL[selected.kind] ?? selected.kind }}</span>
      </div>
      <div class="mk-line"><span class="mk-label">Du</span><span class="mk-wrong">{{ selected.quote }}</span></div>
      <div class="mk-line"><span class="mk-label">Besser</span><span class="mk-right">{{ selected.suggested }}</span></div>
      <p class="mk-reason">{{ lang === 'de' ? selected.reasonDe : selected.reasonEn }}</p>
    </div>

    <div class="chip-row mistake-counts">
      <span v-for="[kind, n] in mistakeCounts" :key="kind" class="chip">{{ KIND_LABEL[kind] ?? kind }} · {{ n }}</span>
      <span v-if="mistakeCounts.length === 0" class="chip">Keine markierten Fehler ✓</span>
    </div>

    <div class="sw-grid">
      <section>
        <h3 class="block-heading">Stärken</h3>
        <ul class="sw-list"><li v-for="(s, i) in data.result.strengths" :key="i">{{ lang === 'de' ? s.de : s.en }}</li></ul>
      </section>
      <section>
        <h3 class="block-heading">Schwächen</h3>
        <ul class="sw-list"><li v-for="(w, i) in data.result.weaknesses" :key="i">{{ lang === 'de' ? w.de : w.en }}</li></ul>
      </section>
    </div>

    <h3 class="block-heading">Gesamturteil</h3>
    <p class="overall">{{ lang === 'de' ? data.result.overallDe : data.result.overallEn }}</p>
  </div>

  <div v-else class="page loading-state"><div class="micro-mark">Loading…</div></div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.praedikat-stamp {
  display: inline-block; margin-top: 6px; padding: 4px 12px; border-radius: 3px;
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase;
}
.praedikat-pass { background: color-mix(in srgb, var(--success) 16%, transparent); color: var(--success); }
.praedikat-fail { background: color-mix(in srgb, var(--danger) 16%, transparent); color: var(--danger); }
.block-heading {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin: 32px 0 12px;
}
.criteria-table .crit-score { font-variant-numeric: tabular-nums; white-space: nowrap; }
.marked-transcript { display: flex; flex-direction: column; gap: 14px; }
.mt-turn { max-width: 85%; }
.mt-partner { align-self: flex-start; }
.mt-learner { align-self: flex-end; }
.mt-role {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 3px;
}
.mt-learner .mt-role { text-align: right; }
.mt-text {
  display: inline-block; padding: 10px 14px; border-radius: 6px;
  font-size: 15.5px; line-height: 1.6;
  background: var(--paper-deep); border: 1px solid var(--hairline);
}
.mt-learner .mt-text { background: var(--accent-tint); border-color: transparent; }
.mt-mistake {
  display: inline; padding: 0 1px; margin: 0; border: 0; cursor: pointer;
  font: inherit; color: var(--danger); background: color-mix(in srgb, var(--danger) 12%, transparent);
  border-bottom: 2px solid var(--danger); border-radius: 2px;
}
.mt-mistake.selected { background: color-mix(in srgb, var(--danger) 26%, transparent); }
.mistake-card {
  margin: 18px 0; padding: 14px 18px; background: var(--paper-deep);
  border-left: 3px solid var(--danger); border-radius: 4px;
  display: flex; flex-direction: column; gap: 8px;
}
.mk-line { display: flex; gap: 12px; align-items: baseline; }
.mk-label {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--mute); flex: 0 0 52px;
}
.mk-wrong { color: var(--danger); text-decoration: line-through; }
.mk-right { color: var(--success); font-family: var(--font-display); }
.mk-reason { margin: 2px 0 0; font-size: 14px; line-height: 1.55; }
.mistake-counts { margin: 18px 0; }
.sw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.sw-list { margin: 0; padding-left: 18px; font-size: 14.5px; line-height: 1.7; }
.overall { font-size: 15.5px; line-height: 1.65; max-width: 640px; }
@media (max-width: 640px) {
  .sw-grid { grid-template-columns: 1fr; }
  .mt-turn { max-width: 100%; }
}
</style>
```

- [ ] **Step 2: Typecheck and commit**

Run: `npx vue-tsc --noEmit`

```bash
git add src/modules/sprechen/Teil2Result.vue
git commit -m "feat(sprechen): one-time result page — marked transcript, criteria, DE/EN toggle"
```

---

### Task 16: Release — version 1.13.00, full verification

**Files:**
- Modify: `src/data/changelog.ts`, `package.json`
- Verify: `CONTEXT.md` (terms were already added during the grilling session — confirm *Discussion*, *Topic*, *Sprechen error tag*, *Move*, *KI-Tipp*, *Prädikat* exist under `### Sprechen`)

- [ ] **Step 1: Full test suite + build**

Run: `npx vitest run`
Expected: all suites PASS (121 pre-existing files + the 7 new ones).

Run: `npm run build`
Expected: `vue-tsc --noEmit` clean, Vite build succeeds.

- [ ] **Step 2: Manual smoke pass** (dev server; see the dev-server memory: `npx vite --port 5199 --strictPort`, use `localhost`):

1. Home shows card IX · Sprechen; breadcrumb reads `I/X`; nav highlights *Sprechen* on all five routes.
2. Cheatsheet renders 7 Redemittel groups + strategy under tab *II · Diskussion*.
3. Setup: generate 5 Topics (needs API key) → they appear under *Eigene*; delete one works.
4. Start a 6-turn discussion: partner opens, hints chips reveal phrases, KI-Tipp returns a direction, Enter sends.
5. Reload mid-discussion → setup offers *Fortsetzen* → conversation intact; resume with the partner mid-reply re-fires the call.
6. Finish → result page: score, Prädikat, marked mistakes clickable, DE/EN toggle flips explanations instantly.
7. History lists the Run with topic + score; module home Recent shows it; Dexie `sprechenDiscussions` is empty afterwards (DevTools → IndexedDB).
8. *Diskussion beenden* after 1 turn → warning, grade banner shows limited-material notice.

- [ ] **Step 3: Changelog + version**

In `src/data/changelog.ts`: set `APP_VERSION = '1.13.00'` and prepend:

```ts
  {
    version: '1.13.00', date: '2026-07-27', kind: 'module',   // ← replace with the actual release date if it differs
    title: 'Sprechen · Teil 2 Diskussion',
    notes: [
      '<strong>Module X: argue with the machine.</strong> Goethe B2 Sprechen Teil 2 as a typed discussion — pick one of <em>100 seeded Topics</em> (or let the AI generate fresh ones that remember what you’ve already discussed), choose 6, 8, or 10 turns, and defend your position against an AI partner that concedes good points, plays devil’s advocate, and never corrects you mid-conversation.',
      '<strong>Hints, layered.</strong> Six Move chips (<em>Zustimmen · Widersprechen · Teilweise zustimmen · Nachfragen · Beispiel geben · Zusammenfassen</em>) reveal Redemittel from the new tabbed Spickzettel instantly; an optional <em>KI-Tipp</em> suggests a direction without writing your sentence. Neither affects the score.',
      '<strong>The reckoning.</strong> Afterwards, every mistake in your turns is marked in place, corrected, and explained — German or English, one toggle. Four criteria à 25 points (Aussprache excluded, stated openly), Prädikat like the real Zeugnis. The verdict is a one-time view: history keeps the summary, never the conversation.'
    ]
  },
```

In `package.json`: `"version": "1.13.00"`.

- [ ] **Step 4: Commit**

```bash
git add src/data/changelog.ts package.json
git commit -m "chore(release): v1.13.00 — Sprechen Teil 2 Diskussion module"
```

Deployment (`npm run deploy`) is deliberately NOT part of this plan — the user runs their release ritual separately.

---

## Post-plan notes for the executor

- **Merge/PR flow:** work happens on a feature branch (e.g. `feat/sprechen-teil2`); when all tasks pass, use the superpowers:finishing-a-development-branch skill. Local main can lag origin — `git fetch` and branch from `origin/main` first.
- **The two "Note:" callouts** (Task 13 `useToast` API, Task 14 quiz-meter class) are the only two places where this plan's code guesses at an internal API it has not read — verify each against the actual source file before relying on it; both are one-line fixes if the guess is wrong.
- **Spec deviations:** none intended. If a conflict emerges between this plan and the spec, the spec wins; update the plan in place.







