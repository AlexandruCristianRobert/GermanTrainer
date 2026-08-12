# Schreiben Mustertexte + Schreibplan-Warning Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the misplaced/premature Schreibplan keyword warning, and ship an annotated five-pattern Mustertext library (Aufgabenmuster) with a layered-highlight viewer linked from hub, cheatsheet, Setup and Prep.

**Architecture:** The spec `docs/superpowers/specs/2026-08-12-schreiben-mustertexte-design.md` is binding — re-read it before each task. New `src/data/schreibenMuster.ts` (five annotated models + thema→pattern map), new `src/modules/schreiben/MusterView.vue` at route `schreiben-muster`, small integration touches, blur-gated in-row warning in Teil1Prep.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Vitest 4 + @vue/test-utils, vue-tsc.

## Global Constraints

- The spec is the requirements document. German content is learner-facing Goethe B2 exam material — exam register, no filler; a failing length/count bound is a content bug, never a reason to loosen a test.
- Verification: `npx vitest run <file>` per task, then `npm test` + `npm run typecheck` (vue-tsc; plain `tsc` is meaningless here). Task 3 also runs `npm run build`.
- Never run `git` from a subagent; the controller commits.
- Scoped CSS on existing tokens only; German module voice (Forumsbeitrag, Schreibthema, Inhaltspunkte, Aufgabenmuster, Mustertext).
- Wave map (controller): A = Tasks 1 ∥ 2 · B = Tasks 3 ∥ 4 (3 owns router.ts + MusterView; 4 owns Home/Cheatsheet/Setup/Prep/CONTEXT.md — disjoint).

---

### Task 1: Blur-gated in-row Schreibplan warning

**Files:**
- Modify: `src/modules/schreiben/Teil1Prep.vue` (warning placement lines ~238-253, `keywordWarnings` ~57-70, scoped CSS ~339-345)
- Test: `tests/modules/SchreibenTeil1Prep.test.ts` (create)

**Interfaces:** none new; behavioral contract is the test below.

- [ ] **Step 1: Write the failing test**

Mirror the mounting harness of an existing `tests/modules/*.test.ts` (read one first — router/sessionStorage handling). Seed `sessionStorage['gt:lastSchreibenTeil1']` with a minimal valid `SchreibenRunStash` (thema with four Inhaltspunkte, all helps on, `plan: emptySchreibPlan()`, model 'x') before mount. Cases, with real assertions:
- typing 2 chars into keyword input 0 shows **no** `.sch-plan-warn` anywhere while the field is focused;
- after `blur` on that field, the too-short warning appears **inside** the same `.spr-plan-row` (assert `row.find('.sch-plan-warn').exists()` — the warning element is a descendant of the row, not a sibling);
- refocusing the field hides its warning; blurring again re-shows it;
- pair warning (keyword 0 = "Kosten", keyword 1 = "Kosten") appears only once **both** fields have been blurred;
- a valid keyword (≥4 normalized chars, unique) shows no warning after blur;
- warnings never disable the CTA buttons.

- [ ] **Step 2: Run it to verify it fails**

`npx vitest run tests/modules/SchreibenTeil1Prep.test.ts` — FAIL (warning currently renders outside the row and while typing).

- [ ] **Step 3: Implement**

In `Teil1Prep.vue`:

```ts
const touched = ref<Set<number>>(new Set())
const focused = ref<number | null>(null)
function markTouched(index: number) {
  focused.value = null
  const next = new Set(touched.value); next.add(index); touched.value = next
}
```

Inputs gain `@focus="focused = index"` and `@blur="markTouched(index)"`.
`keywordWarnings` keeps its existing hygiene rules but reports an index only
when `touched.has(index) && focused !== index`; the pair rule requires both
indices touched (the non-focused one carries the message; if both qualify,
both may show). Template: move the `<p>` inside `.spr-plan-row`, as the last
child of a new wrapper around the input —

```html
<div class="sch-plan-incell">
  <input class="spr-plan-in" ... />
  <p v-if="keywordWarnings[index]" class="sch-plan-warn">{{ keywordWarnings[index] }}</p>
</div>
```

CSS: replace `.spr-plan-warn` with `.sch-plan-incell { display: flex; flex-direction: column; gap: 4px; min-width: 0 }` and `.sch-plan-warn { margin: 0; padding-left: 2px; font-size: 12.5px; line-height: 1.5; color: var(--clay) }`. Verify the row's `align-items: center` still looks right with a two-line cell (switch the row to `align-items: start` **only if** the warning visibly misaligns the number/label columns — note it in the report either way). Keep the mobile breakpoint working (`.spr-plan-in { grid-column: 2 }` at ≤720px applies to the wrapper now — mirror that rule for `.sch-plan-incell`).

- [ ] **Step 4: Run the test to verify it passes** — PASS, then `npm test` + `npm run typecheck` clean.

---

### Task 2: Aufgabenmuster data — five annotated Mustertexte

**Files:**
- Create: `src/data/schreibenMuster.ts`
- Test: `tests/data/schreibenMuster.test.ts` (create)

**Interfaces (Tasks 3, 4 rely on these exact names):** the spec's data block, verbatim:

```ts
export type MusterId = 'abwaegen' | 'alternative' | 'erfahrung' | 'gegenmeinung' | 'vorschlag'
export type MusterLayer = 'konnektor' | 'mittel' | 'struktur'
export interface MusterSegment { t: string; layer?: MusterLayer; noteDe?: string }
export interface Mustertext {
  id: MusterId; titleDe: string; signalDe: string
  themaId: string; skeleton: string[]; segments: MusterSegment[]
}
export const SCHREIBEN_MUSTER: Mustertext[]                  // exactly 5, one per MusterId
export const SCHREIBTHEMA_MUSTER: Record<string, MusterId>   // all 24 seeded thema ids
export const MUSTER_LAYER_LABEL: Record<MusterLayer, { de: string; en: string }>
```

- [ ] **Step 1: Write the failing test**

Create `tests/data/schreibenMuster.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { SCHREIBEN_MUSTER, SCHREIBTHEMA_MUSTER, MUSTER_LAYER_LABEL } from '../../src/data/schreibenMuster'
import { SCHREIBEN_THEMEN } from '../../src/data/schreibenThemen'

const MUSTER_IDS = ['abwaegen', 'alternative', 'erfahrung', 'gegenmeinung', 'vorschlag'] as const
const words = (m: (typeof SCHREIBEN_MUSTER)[number]) =>
  m.segments.map(s => s.t).join('').trim().split(/\s+/).length

describe('schreibenMuster', () => {
  test('exactly five models, one per pattern id', () => {
    expect(SCHREIBEN_MUSTER.map(m => m.id).sort()).toEqual([...MUSTER_IDS].sort())
  })
  test('map covers exactly the 24 seeded themes, each pattern used at least twice', () => {
    const seeded = SCHREIBEN_THEMEN.map(t => t.id).sort()
    expect(Object.keys(SCHREIBTHEMA_MUSTER).sort()).toEqual(seeded)
    for (const id of MUSTER_IDS) {
      expect(Object.values(SCHREIBTHEMA_MUSTER).filter(v => v === id).length,
        `pattern ${id} under-used`).toBeGreaterThanOrEqual(2)
    }
  })
  test('each model answers a real seeded thema mapped to its own pattern', () => {
    for (const m of SCHREIBEN_MUSTER) {
      expect(SCHREIBEN_THEMEN.some(t => t.id === m.themaId), m.id).toBe(true)
      expect(SCHREIBTHEMA_MUSTER[m.themaId], m.id).toBe(m.id)
    }
  })
  test('exam length: 150-200 words; five skeleton lines', () => {
    for (const m of SCHREIBEN_MUSTER) {
      expect(words(m), m.id).toBeGreaterThanOrEqual(150)
      expect(words(m), m.id).toBeLessThanOrEqual(200)
      expect(m.skeleton.length, m.id).toBe(5)
    }
  })
  test('layer coverage: ≥4 konnektor, ≥4 mittel, ≥3 struktur spans per model', () => {
    for (const m of SCHREIBEN_MUSTER) {
      const n = (l: string) => m.segments.filter(s => s.layer === l).length
      expect(n('konnektor'), m.id).toBeGreaterThanOrEqual(4)
      expect(n('mittel'), m.id).toBeGreaterThanOrEqual(4)
      expect(n('struktur'), m.id).toBeGreaterThanOrEqual(3)
    }
  })
  test('every annotated span explains itself (noteDe ≤ 180 chars); plain spans carry no note', () => {
    for (const m of SCHREIBEN_MUSTER) for (const s of m.segments) {
      if (s.layer) {
        expect(s.noteDe?.trim().length ?? 0, `${m.id}: "${s.t}"`).toBeGreaterThan(15)
        expect(s.noteDe!.length, m.id).toBeLessThanOrEqual(180)
      } else {
        expect(s.noteDe, m.id).toBeUndefined()
      }
    }
  })
  test('labels exist for all three layers', () => {
    for (const l of ['konnektor', 'mittel', 'struktur'] as const) {
      expect(MUSTER_LAYER_LABEL[l].de.length).toBeGreaterThan(3)
      expect(MUSTER_LAYER_LABEL[l].en.length).toBeGreaterThan(3)
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails** — module missing.

- [ ] **Step 3: Author the data**

Header comment citing CONTEXT.md → Aufgabenmuster/Mustertext (Task 4 adds the
entries; reference them anyway) and the spec. Labels: konnektor „Konnektoren"/
(connectors) · mittel „Schreibmittel & Züge"/(moves & phrases) · struktur
„Grammatische Strukturen"/(grammar structures).

**The map:** read each of the 24 themes' actual `inhaltspunkte` in
`src/data/schreibenThemen.ts` and assign the **dominant** pattern per the
spec's signalDe rules. Starting assignment to correct against the real
data (change any entry whose points read differently, keeping every pattern
≥2): abwaegen → wt-fast-fashion, wt-vier-tage-woche, wt-social-media-jugend,
wt-bargeld, wt-streaming-kino, wt-haustiere-stadt · alternative →
wt-homeoffice, wt-noten-schule, wt-teilzeit-fuer-alle, wt-smartphone-schule,
wt-lebenslanges-lernen · erfahrung → wt-online-studium, wt-fitness-tracker,
wt-mehrgenerationenhaus, wt-regionale-produkte, wt-auswandern · gegenmeinung
→ wt-autofreie-innenstadt, wt-ehrenamt-pflicht, wt-werbung-kinder,
wt-selbstoptimierung · vorschlag → wt-ki-im-alltag, wt-fleischkonsum,
wt-tourismus-grenzen, wt-billigfluege.

**The five models:** `themaId` per pattern = wt-vier-tage-woche (abwaegen),
wt-homeoffice (alternative), wt-online-studium (erfahrung),
wt-autofreie-innenstadt (gegenmeinung), wt-fleischkonsum (vorschlag) —
adjust alongside the map if your corrected mapping moves one. Each model:
`signalDe` one line per the spec table; `skeleton` = five paragraph-plan
lines (Einstieg → the pattern's own middle three → Fazit); `segments` =
the full ~160-word Forumsbeitrag genuinely answering that thema's four
Inhaltspunkte, split so annotated spans sit on exactly the device they
mark. Segment exemplar (authoring style — notes explain WHY-HERE, not
definitions):

```ts
{ t: 'In letzter Zeit wird viel darüber diskutiert, ob ', layer: 'mittel',
  noteDe: 'Klassischer Einstieg: benennt die Debatte, ohne schon Position zu beziehen — der Leser weiß sofort, worum es geht.' },
{ t: 'die Vier-Tage-Woche für alle Branchen taugt.' },
{ t: ' Einerseits ', layer: 'konnektor',
  noteDe: 'Erster Teil des Abwäge-Paars — kündigt an, dass gleich die Gegenseite folgt; der Prüfer sieht die Struktur sofort.' },
```

Where a `mittel` span can naturally echo a Schreibmittel-bank phrasing, do
so (recognition effect), but never force it. Use Konjunktiv II, ein Passiv
und echte Nebensätze in every model so the `struktur` layer has honest
material — each `struktur` note names the structure AND its effect (e.g.
„Konjunktiv II macht den Vorschlag höflich-hypothetisch statt fordernd").

- [ ] **Step 4: Run the test to verify it passes** — PASS; `npm test` + `npm run typecheck` clean.

---

### Task 3: MusterView page + route

**Files:**
- Create: `src/modules/schreiben/MusterView.vue`
- Modify: `src/router.ts` (one line after `schreiben-cheatsheet`)
- Test: `tests/modules/MusterView.test.ts` (create)

**Interfaces:**
- Consumes: everything Task 2 exports; `SCHREIBEN_THEMEN` (task-sheet context); route names `schreiben`.
- Produces: route `{ path: '/schreiben/muster', name: 'schreiben-muster', component: () => import('./modules/schreiben/MusterView.vue') }` (Task 4 links to it). Nav coverage guard passes via the `schreiben` prefix — do not touch `nav.ts`.

- [ ] **Step 1: Write the failing mount test**

Mirror an existing `tests/modules/*.test.ts` harness. Cases: renders five pattern chips; default pattern is `abwaegen` unless `?muster=` query preselects (mount with router at `/schreiben/muster?muster=erfahrung` → that chip active, that model's title shown); three layer toggles default on with per-layer counts; toggling `konnektor` off removes the `on`/highlight class from konnektor spans (assert via class, not color); clicking an annotated span pins its `noteDe` text into the note panel and marks the span pinned; switching patterns clears the pinned note; back link navigates to `schreiben`.

- [ ] **Step 2: Run it to verify it fails** — component missing.

- [ ] **Step 3: Implement**

Script: `activeId = ref<MusterId>` seeded from `route.query.muster` when valid; `model = computed(...)`; `layersOn = ref<Record<MusterLayer, boolean>>` all true; `pinned = ref<MusterSegment | null>` (cleared on pattern switch); counts per layer computed from `model.segments`. Template top-to-bottom: breadcrumb `Kapitel · Schreiben · Mustertexte`, title + the model's `signalDe`; five chips (`.spr-kind`-style buttons, active state); collapsible task-sheet context (`<details>`: thema title + four Inhaltspunkte from `SCHREIBEN_THEMEN`); skeleton as an ordered mini-list; layer toggle row (three buttons with color swatch + label + count, `aria-pressed`); the text as a `<p class="muster-text">` of inline segments — annotated spans are `<button class="muster-span" :class="[seg.layer, { dim: !layersOn[seg.layer], pinned: pinned === seg }]" :title="seg.noteDe" @click="pinned = seg">`, plain segments plain text; the note panel `<div class="muster-note">` below (empty-state hint „Tippe eine Markierung an …" when nothing pinned). Layer colors as scoped vars derived from existing tokens: konnektor `var(--accent)`, mittel `color-mix(in oklab, var(--accent) 45%, var(--ink))`... choose three clearly distinct hues consistent in both themes and note the choice in the report; highlight = tinted underline/background wash, `dim` = no highlight, `pinned` = stronger wash + outline. Keyboard: spans are real buttons; Escape clears `pinned`.

- [ ] **Step 4: Run the mount test to verify it passes** — PASS.
- [ ] **Step 5: Full gate** — `npm test`, `npm run typecheck`, `npm run build` all clean. Manual dev-server look allowed.

---

### Task 4: Integration links + glossary

**Files:**
- Modify: `src/modules/schreiben/SchreibenHome.vue` (Mustertexte tile), `src/modules/schreiben/SchreibenCheatsheet.vue` (pointer row), `src/modules/schreiben/Teil1Setup.vue` + `src/modules/schreiben/Teil1Prep.vue` (contextual links), `CONTEXT.md` (two entries)

**Interfaces:** consumes `SCHREIBTHEMA_MUSTER`, `MusterId` (Task 2); route `schreiben-muster` (Task 3; runtime-only dependency, typechecks regardless).

- [ ] **Step 1: Integration edits**

- SchreibenHome: a „Mustertexte" row/tile beside the Cheatsheet entry (subtitle „Fünf Aufgabenmuster, Satz für Satz erklärt"), → `schreiben-muster`. Follow the hub's existing tile markup.
- SchreibenCheatsheet: one pointer row at the top of the Strategie tab („Die fünf Aufgabenmuster mit kommentierten Mustertexten → Mustertexte"), → `schreiben-muster`.
- Teil1Setup (task-sheet preview) + Teil1Prep (header area near the task sheet): when `SCHREIBTHEMA_MUSTER[thema.id]` exists, a quiet link „Mustertext zu diesem Aufgabentyp →" → `{ name: 'schreiben-muster', query: { muster: id } }`; otherwise (custom themes) „Mustertexte ansehen →" without query. Style as the app's quiet inline links, not a button. **Coordinate with Task 1's Teil1Prep edits: this task runs in Wave B, after Task 1 is committed — rebase-read the file fresh before editing.**
- CONTEXT.md, in the Schreiben section after [Schreibmittel], two entries in the house style (bold term, definition, _Avoid_ line):

**Aufgabenmuster**: One of five recurring shapes the four [Inhaltspunkt]s of a [Schreibthema] take — *Pro & Contra abwägen*, *Meinung + Alternative vorschlagen*, *Eigene Erfahrung als Beleg*, *Gegenmeinung entkräften*, *Maßnahme bewerten & empfehlen*. Every seeded Schreibthema is mapped to its **dominant** Aufgabenmuster (custom themes are not mapped); the mapping is a study lens that picks the right [Mustertext], never a filter, never a grading input.
_Avoid_: Textsorte (email genres are Teil 2's world), task type, Kategorie, pattern (code-only term)

**Mustertext**: The annotated model [Forumsbeitrag] for one [Aufgabenmuster]: a hand-authored answer of exam length to one seeded [Schreibthema], marked up in three layers — Konnektoren, [Schreibmittel]-style moves, grammatische Strukturen — where every marked span carries a note explaining why the device works *at that spot*. Read-only teaching material: never graded, never counted in [Redemittel yield], never a [Run].
_Avoid_: sample essay, Vorlage, Musterlösung (implies the one correct answer), template (that is the skeleton, the paragraph plan beside it)

- [ ] **Step 2: Verify**

`npm test` green (nav coverage guard confirms the new route is reachable), `npm run typecheck` clean. Manual: hub tile → viewer; drawn seeded thema in Setup/Prep shows the pattern link with the right query.
