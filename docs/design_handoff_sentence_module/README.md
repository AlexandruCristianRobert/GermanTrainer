# Handoff: Sentence Module (Kapitel XII · Sätze)

## Overview
A new drill module for the German Trainer Vue app: the "packed sentence" quiz. The learner sets a per-card count for five categories (verbs, nouns, prepositions, da-compounds, connectors); the AI writes one EN/DE sentence pair per card containing *every* requested item (1–2 sentences, stretching to a 3–4-sentence short text at high packing). Three surfaces: **Setup** (`/sentence`) → **Runner** (`/sentence/run`) → **Result**.

**The chosen design is Variant A — „Das Register"** (`SentenceA` in `sentence-a.jsx`). Variant B (`sentence-b.jsx`) was explored and rejected; it is included only so the comparison page runs. Do not implement B.

## About the Design Files
The files in this bundle are **design references created in HTML/React** — interactive prototypes showing intended look and behavior, not production code. The task is to **recreate Variant A in the GermanTrainer codebase** (Vue 3 + TypeScript, `src/modules/`, Dexie history, existing composable patterns like `useVerbQuiz.ts` / `useDirectionDrill.ts`), following the module conventions of `src/modules/da-compounds/` (Setup/Runner pattern) and the existing design-system CSS. AI generation/grading is mocked in the prototype (canned cards + substring matching); the real implementation should call the app's AI layer.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and interaction states are final and use the app's existing Grammatik-Atelier tokens (`styles.css`). Recreate pixel-perfectly with the app's existing CSS variables — do not invent new tokens.

## Screens / Views (Variant A)

### 1. Setup (`/sentence`) — `SnaSetup`
- Column, max-width 760px, standard skeleton: breadcrumb `Kapitel XII · Satz · Einrichtung`, title `Setup.`, subtitle, ghost Back + accent Start CTA row at bottom.
- **Budget meter** (`SnaMeter`): sticky (top: 0, z-index 40, translucent paper bg + blur(8px), border-top 2px solid var(--rule)). Left: 8 cells 22×30px, 1px dashed var(--hairline) when empty; filled cells get solid border + category color background and show the category letter (V/N/P/D/K, mono 10.5px, paper color). Right-aligned mono caption (10.5px, uppercase, ls .14em): `0` → "Leer — wähle mindestens ein Item" (muted); 1–6 → "n / 8 Items pro Karte"; 7–8 → warn state, ochre top border + ochre text: "n / 8 — Karten werden zu Kurztexten (3–4 Sätze) gedehnt".
- **Five category blocks** (`SnaBlock`), each a ledger row (border-bottom hairline, padding 20px 0 18px):
  - Row 1: 10px category color dot · name in Fraunces 22px/500 with italic "pro Karte" suffix (15px muted) · right: segmented count control `0 1 2 3` (mono 12px). Counts: 0–3 all categories, connectors 0–2. A count option is **disabled** when picking it would push the 5-category total past 8.
  - Row 2: mono filter summary (10.5px muted) + accent "Filter" disclosure link (mono 10px uppercase, accent underline) that toggles the inline filter panel.
  - Filters per category: **Verbs** — Niveau chips (A1 A2 B1 B2.1 B2.2), Typ chips (regelmäßig/unregelmäßig/trennbar/reflexiv), Rektion chips (Akkusativ / Dativ / Dativ + Akkusativ / reflexiv / mit Präposition) each with All/None quiet buttons and per-chip counts; hint "„Verb + Dativ" gezielt üben: nur Dativ anwählen." **Nouns** — theme-group chips with counts, empty groups disabled at 35% opacity. **Prepositions** — case-group chips (mit Akkusativ / mit Dativ / Wechselpräpositionen / mit Genitiv). **Da-Komposita** — count only, summary "feste Kollokationsliste — keine Filter in v1", no disclosure. **Konnektoren** — see two-tier picker below.
- **Two-tier connector picker**: default tier = 6 family chips (Adversative, Causal, Concessive, Temporal, Alternative, Additive) with word counts; a quiet "Detailliert" button switches to word tier: selected families render as labeled groups (mono label `Familie · de`) inside a left-dotted-border indent, each word as a chip (two-part pairs as ONE chip with ellipsis: `sowohl … als auch`). Entering detail pre-selects all words of the selected families; "← Familien" returns. Hint below: "Familie gewählt = alle Wörter der Familie im Topf. Zweiteilige Paare (sowohl … als auch) zählen als ein Item."
- **Run options** (below a 2px rule):
  - Richtung: segmented `EN → DE / DE → EN`; DE→EN hint: "nur Bedeutungs-Bewertung — keine Fehler-Tags, keine Wort-Hinweise."
  - Modalität (EN→DE only): `Getippt / Gesprochen`; Gesprochen disabled without mic + hint "Gesprochen erfordert Mikrofonzugriff — in diesem Browser nicht verfügbar."
  - Wort-Hinweise (EN→DE only): `An / Aus`, default An.
  - Anzahl Karten: presets `3 / 5 / 8 / Custom` (custom = number input 1–12). Deliberately smaller than other drills — caption "1 Karte ≈ n bewertete Items".
- **Alerts** (standard `.alert` pattern): danger "KI-Schlüssel fehlt" (Start disabled); per-category warning "Leerer Pool — {Kategorie} stehen auf n, aber kein Wort passt zu den Filtern" whenever count > 0 and its filter selection is empty (Start disabled).
- Start CTA: `Start · 6 Karten →`, disabled at 0 items / empty pools / missing key.

### 2. Runner (`/sentence/run`) — `SnaRunner`
- Single column, max-width 860px. Header: `Karte 2 · von 6` mono counter + quiet "Runde beenden"; pips progress bar (green ok / ochre partly / red wrong / accent current).
- **Streaming state** between cards and before card 1: dashed box, mono "Karte wird geschrieben…" / "Nächste Karte wird geschrieben…" with animated dots + 3 pulsing skeleton bars (~1s).
- **Generation shortfall** alert (warning): "Nur 4 von 6 Karten konnten generiert werden — der Pool gab nicht mehr her."
- **Manifest strip** (EN→DE only): dotted top+bottom border, mono 11px: label `GESUCHT` + parts `2 Verben · 2 Nomen · 1 Präposition · 1 da-Kompositum · 1 Konnektor` (connector deliberately NOT named in this variant). Cards with 3+ sentences get an italic right-aligned "Kurztext · 4 Sätze".
- **Source text**: Fraunces 500, size steps by length — 1 sentence clamp(24–33px), 2 sentences clamp(22–28px), 3–4 sentences clamp(19–23px)/1.55. **Hint spans** (when on): 2px dotted underline in category color (verb sage, noun cobalt, prep ochre, dac clay, connector solid ink-soft); hover lights the span with the category tint — **both parts of a two-part connector share a key and light together**, each part carrying a superscript `¹`.
- **Answer**: auto-growing textarea (border-left 2px accent), placeholder "Deine deutsche Übersetzung — gern mehrere Sätze …". Submit = button "Einreichen →" or Ctrl/Cmd+Enter (Enter = newline). Spoken modality: circular record button (space toggles), pulsing clay while live, auto-submits the transcript ~600ms after stop. Mic denied mid-run: warning alert "Zugriff verweigert — Modalität für diese Runde auf Getippt umgestellt", typed fallback.
- **Grading**: answer freezes muted + mono "KI bewertet…" (~850ms), then the **compact graded view** replaces manifest+source:
  - **Sticky context block** (`.sna-sticky`: position sticky top 0, translucent paper + blur, 2px rule top / 1px rule bottom): verdict line (Fraunces 17px — `Richtig` green / `Teils richtig` ochre / `Daneben` red, `· 5 / 7 Items`), offline badge when applicable, TTS replay button right-aligned; then three label/value rows `QUELLE` (EN source, clamp(15px,2.3vh,20px)), `DU` (learner answer, italic, verdict color), `REFERENZ` (German reference, Fraunces clamp(17px,2.7vh,24px)). Text sizes scale with viewport height so the block + list fit the screen.
  - Coaching tip below (italic 14.5px). Offline-graded run instead shows: dashed ochre badge "offline bewertet" + "KI-Bewertung nicht erreichbar — lokale Prüfung per Wortabgleich, ohne Coaching-Tipp."
  - **Flat compact correction list**, one line per item, scrolls under the sticky block: ✓ (green) / ✗ (red) mono mark · 8px category color dot · italic EN prompt (muted) · German solution (Fraunces ~15–17px) · right meta: **Rektion badge** for verbs (mono, ochre tint: `warten auf + Akk`) and, on failed items, **error-tag chips** (mono uppercase, clay tint: conjugation · case · word-order · noun · preposition · compound · connector · typo).
  - Footer: `Enter — weiter` + accent "Nächste Karte →" / "Runde abschließen →" (autofocus).
- **DE→EN variant** (lighter, not broken): German source, no manifest, no hint spans; graded view shows verdict + tip + EN reference only, note "Nur Bedeutungs-Bewertung — keine Fehler-Tags in DE → EN."
- **Retry modal** after last card (only if any card not fully correct, never after a practice round): dialog on 34% black backdrop — "N Karten gingen daneben.", "Eine Übungsrunde wiederholt nur diese Karten — sie wird nicht gewertet.", ghost "Zur Auswertung" + accent "Fehler üben · N Karten →". Practice rounds show "— Übungsrunde, wird nicht gewertet" in the counter and are not recorded.

### 3. Result — `SnaResult`
- Breadcrumb `Kapitel XII · Satz · Auswertung`; score `3 / 5` (Fraunces 72px, denom muted) + italic sub "Karten ganz richtig · 24 von 33 Items getroffen".
- **Nach Kategorie**: per-category accuracy bars (mono label · 4px track · category-color fill · `4 / 6` mono).
- **Fehlerbild**: error-tag distribution as bordered chips `3× case`, sorted desc. DE→EN run: hint "In DE → EN gibt es keine Fehler-Tags — bewertet wird nur die Bedeutung."
- **Karten**: expandable rows (✓/◐/✗ mark · source sentence in Fraunces 16px · öffnen/schließen). Expanded: Deine Antwort (italic), Referenz, per-item verdict list (same compact row anatomy as the runner).
- Footer: ghost "← Neue Runde" + accent "Fehler üben · N Karten →" (EN→DE only, hidden on perfect runs).

## Interactions & Behavior
- Budget rule is a hard constraint: total ≤ 8; count options that would exceed it are disabled; warn state at ≥7.
- Flow state machine (`useSnRun` in `sn-shared.jsx`): prep(~1.1s) → answer → grading(~850ms, skipped when offline) → graded → stream(~900ms) → … → done. Real app replaces timers with actual AI streaming/grading.
- Card text sizes and graded-view type scale respond to sentence count and viewport height (vh clamps).
- Hover on hint span highlights all spans with the same item key (pair linking).
- `html,body{overflow-x:clip}` is required — `overflow-x:hidden` on body breaks the sticky meter and sticky graded context (see `styles-sentence-redesign.css` header comment).

## State Management
- Setup: counts per category, filter selections (Sets), connector tier + word set, direction, modality, hints, card-count preset/custom.
- Run: deck (cards), idx, phase, history [{card, answer, res:{verdict, items:[{k,ok}], okCount}, offline}], practice flag, practice deck.
- Result derives per-category accuracy and tag distribution from history (`snAggregate`).
- Real app: persist runs via the existing Dexie history (`saveQuizRun` pattern, type e.g. `sentence-packed`); practice rounds are never recorded.

## Design Tokens
All from the app's existing `styles.css` — key ones used: `--paper #FAF7F0`, `--paper-deep #F1ECDE`, `--paper-card #FCFAF3`, `--ink #15130E`, `--ink-soft #3A372F`, `--mute #948C7C`, `--rule #1E1B14`, `--hairline rgba(30,27,20,.14)`; category colors: verb `--sage #5C7A52`, noun `--cobalt #2C5282`, prep `--ochre #B8852F`, dac `--clay #A03B2B`, connector `--ink-soft`; `--accent = --sage`; success/danger = sage/clay. Fonts: Fraunces (display), Source Serif 4 (body), JetBrains Mono (labels/badges). Dark theme works via the existing `[data-theme="dark"]` overrides. Radii: 2px buttons/chips, 4px cards. Module-specific CSS lives in `styles-sentence-redesign.css` (`.sn-*` shared, `.sna-*` variant A; `.snb-*` is variant B, ignore).

## Data
- Connector taxonomy (6 meaning families, per-word grammar behavior `0`/`inv`/`end`, two-part pairs) and category metadata: `sn-data.js` (`SN_CONN_FAMILIES`, `SN_CAT`, `SN_MAX`, `SN_BUDGET`). Real word pools come from the app's `src/data/*.ts` banks; the 10 canned cards in `SN_CARDS` are prototype seed data showing the expected card shape (token-span source, per-item accepted forms, Rektion strings, fail tags, tip).
- Error-tag vocabulary: `conjugation, case, word-order, noun, preposition, compound, connector, typo`.

## Assets
None — no images/icons beyond text glyphs (✓ ✗ ◐ ● ■ ▶) and the design-system fonts (Google Fonts).

## Files
- `Sentence Redesign.html` — runnable comparison page (open in a browser; pick "A · Das Register")
- `sentence-a.jsx` — **Variant A, the chosen design** (Setup / Runner / Result + flow shell)
- `sn-shared.jsx` — shared logic: run state machine, grading mock, pips, TTS, hint-span renderer, retry modal, aggregation
- `sn-data.js` — connector families, category meta, budget constants, canned cards
- `styles-sentence-redesign.css` — all module CSS (`.sn-*` + `.sna-*`)
- `sentence-b.jsx` — rejected Variant B, included only so the HTML runs
- `styles.css`, `styles-modules.css` — app design system, for reference/running only (already in the codebase)
