# Cheatsheet Redesign — Design Spec

**Date:** 2026-05-23
**Status:** Approved (sections A, B, C confirmed in brainstorm)
**Scope:** Replace `src/modules/verbs/CheatSheet.vue` with an editorial-styled, content-expanded reference

## Goal

The current cheatsheet (`n-collapse` with concise prose) reads as a code-comment dump. The new design treats German grammar with the gravitas it deserves: an editorial layout inspired by classic German grammar references (Duden, Klett), with refined typography, marginal callouts, color-coded vowel changes, and roughly tripled content depth.

## Non-goals

- No dark-mode toggle on this page (the rest of the app uses naive-ui's auto-theme; defer for a separate ticket).
- No interactive practice or input fields — this is read-only reference content.
- No internationalization framework — content stays in mixed German+English as currently written.
- No persistence (no "favorite a section" or "track progress" features).

## Aesthetic direction: "Grammatik-Atelier"

A scholarly editorial experience. Warm cream paper, deep ink colors, generous typography, structured grid, marginal annotations. References: Klett/Hueber grammar books, Swiss editorial design (Vignelli, Gerstner), modern long-form sites (The Pudding, Atlas Obscura). Refined, not flashy.

The memorable detail: **vowel changes painted sage green**, so `fahren → fährt` reads as a transformation, not a typo.

## File structure

```
src/modules/verbs/
  CheatSheet.vue                    # rewritten — page shell + 12 sections
  cheatsheet/
    ChapterNav.vue                  # left rail with scroll-spy + search filter
    ConjugationTable.vue            # framed mono table component
    Callout.vue                     # Beachte / Ausnahme / Beispiele box
    VowelShift.vue                  # <VowelShift>ä</VowelShift> inline highlight
    cheatsheet.css                  # CSS variables + base typography + utilities

src/main.ts                         # @fontsource imports added
package.json                        # @fontsource/fraunces, source-serif-4, jetbrains-mono
```

Naive-ui is intentionally **not** used inside the cheatsheet — the editorial aesthetic requires custom styling that fights naive-ui's defaults. Naive-ui stays available throughout the rest of the app.

## Typography

Fonts loaded via `@fontsource` (self-hosted, no third-party CDN dependency):

```css
--font-display: 'Fraunces', Georgia, serif;        /* variable serif, dramatic at large sizes */
--font-body:    'Source Serif 4', Georgia, serif;  /* refined long-form serif */
--font-mono:    'JetBrains Mono', ui-monospace, monospace;
```

Subsets to import (kept minimal to limit bundle):
- `@fontsource/fraunces` — weights 300, 400, 600; italic 400 (display + drop caps)
- `@fontsource/source-serif-4` — weights 400, 600 (body + bold)
- `@fontsource/jetbrains-mono` — weight 400 only (verb forms)

Type scale (desktop):

| role | size | font | weight | line-height |
|---|---|---|---|---|
| Page header mark | 14px | mono | 400 | 1.4 |
| Chapter numeral | 96px | display italic | 300 | 1 |
| Chapter title (DE) | 44px | display | 600 | 1.1 |
| Chapter subtitle (EN) | 18px | body italic | 400 | 1.4 |
| Section heading | 22px | display | 600 | 1.3 |
| Body | 17px | body | 400 | 1.72 |
| Body bold | 17px | body | 600 | 1.72 |
| Mono (verb forms) | 14.5px | mono | 400 | 1.55 |
| Callout body | 15px | body | 400 | 1.6 |
| Callout label | 12px | mono | 400 (uppercase, letter-spaced) | 1 |
| Marginalia | 13px | body italic | 400 | 1.4 |
| Nav item | 14px | body | 400 | 1.3 |

Mobile breakpoints (< 768px): chapter numeral 64px, title 32px, body 16px. Everything else proportional.

## Color palette

```css
--paper:        #F7F2E8;  /* warm cream */
--paper-deep:   #EFE8D8;  /* inset blocks, hover */
--ink:          #1A1814;  /* deep warm black, body text */
--ink-soft:     #3D3A33;  /* secondary text */
--mute:         #8C8576;  /* tertiary, dividers */
--rule:         #2A2620;  /* horizontal rules */

--sage:   #5C7A52;  /* vowel changes, "highlighted" verbs */
--clay:   #A03B2B;  /* exceptions, warnings */
--ochre:  #C29242;  /* notes (Beachte) */
--cobalt: #2C5282;  /* examples, secondary */
```

A near-invisible SVG noise overlay at ~3% opacity gives the paper its grain. The SVG is inlined as a data URL in `cheatsheet.css`.

## Layout

**Desktop (≥ 960px):**

```
┌──────────────────────────────────────────────────────────────────┐
│  GRAMMATIK · KONJUGATION                       [Suche...]   [↑]  │
│  ────────────────────────────────────────────────────────────── │
│  ┌────────────┬─────────────────────────────────────────────┐    │
│  │ INHALT     │                                             │    │
│  │            │  I                                          │    │
│  │ ─ I        │  Schwache Verben                            │    │
│  │   II       │  Regular (weak) verbs                       │    │
│  │   III      │  ─────                                      │    │
│  │   IV       │                                             │    │
│  │   ...      │  D rop-cap paragraph...                     │    │
│  │            │                                             │    │
│  │ progress▎  │  [ KONJUGATION table ]                      │    │
│  │            │                                             │    │
│  │ (sticky)   │  ┃ BEACHTE callout                          │    │
│  │            │  ┃ AUSNAHME callout                         │    │
│  │            │  ┃ BEISPIELE callout                        │    │
│  │            │                                             │    │
│  └────────────┴─────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

- Outer container: max-width 1160px, centered. Side padding 32px desktop / 16px mobile.
- Left rail: 240px wide, position sticky, top 96px. Vertical list of Roman numerals + German titles. The active item has a 2px sage left-border that slides between items on a 280ms ease-out transition.
- Main column: max-width 720px, side margin 64px.
- Search field: pinned top-right of the page header, 240px wide. As-you-type filtering dims non-matching chapters to 30% opacity.

**Mobile (< 768px):**

- Single column layout
- Chapter index becomes a horizontal scroll bar pinned to top (sticky), 56px tall. Each chapter pill is `I · Schwache Verben`; current pill is centered automatically as user scrolls
- Marginalia/callouts flow inline below the related content
- Tap targets ≥ 44px

## Sub-component contracts

### `ChapterNav.vue`

Props:
- `chapters: Array<{ id: string; numeral: string; titleDe: string; titleEn: string }>`
- `searchQuery: string`

Emits:
- `update:searchQuery(value: string)`
- `select(id: string)`  — fires when user clicks a chapter

Behavior:
- Uses IntersectionObserver to track which chapter section is currently in view; highlights the matching nav item.
- Smooth-scrolls to the section on click.
- On mobile, renders the horizontal-pill variant via CSS media query (no separate component).

### `ConjugationTable.vue`

Props:
- `verb: string` — infinitive, displayed in the table caption
- `rows: Array<{ person: string; form: string; highlightVowel?: string }>`
- `caption?: string` — optional override (default "KONJUGATION")

Renders a framed mono table with:
- Notched top border bearing the caption
- Person column (left-aligned, ink-soft)
- Form column (mono, ink) with optional vowel highlighting via inline `<VowelShift>`
- Row hover: background tint to `--paper-deep`

### `Callout.vue`

Props:
- `kind: 'note' | 'exception' | 'example'` — controls color (ochre / clay / cobalt) and label (BEACHTE / AUSNAHME / BEISPIELE)
- `label?: string` — optional override

Slot: default slot for body content.

Structure: a left side-rule (4px wide) in the kind's color, uppercase letter-spaced label in mono, body content in regular body type.

### `VowelShift.vue`

Props:
- `from?: string` — the original verb form, shown in a tooltip on hover (e.g., from="fahren")

Slot: the changed letter(s) — typically a single character.

Wraps the slot content in `<span class="vowel-shift">`, painted `var(--sage)`. On the section's first scroll-into-view it does a one-time gentle pulse (0.4s, scale 1 → 1.06 → 1). Hover reveals an optional tooltip showing the `from` value.

## Motion

Restrained. Every animation has a purpose.

- **Page load:** chapter sections fade up sequentially (staggered, 80ms apart, 400ms duration each). Chapter numeral arrives 100ms after its containing section.
- **Scroll-triggered:** chapter numerals scale subtly (0.5% via `transform: scale(1.005)`) as their section enters view; implemented with IntersectionObserver, not scroll-linked work.
- **Nav rail indicator:** the active sage border slides to follow the current section, 280ms ease-out.
- **Vowel-change pulse:** one-time animation when a section's containing element first becomes visible (via IntersectionObserver `once: true`).
- **Hover on conjugation rows:** 150ms background tint to `--paper-deep` + a 1px sage underline beneath any highlighted vowel.
- **Search filter:** non-matching chapters fade to 30% opacity (200ms). Nav re-orders matches to top with FLIP-style animation (using simple CSS transitions).
- **No** scroll-jacking, parallax, infinite loaders, or skeleton states.

All animations respect `prefers-reduced-motion: reduce` (set transition durations to 0.01ms).

## Content expansion — section-by-section

Roughly triples the prose. Concrete additions per chapter (see brainstorm Section B for the full table):

1. **I. Schwache Verben** — full present-tense tables for `spielen` and `arbeiten` side by side; Bindevokal rule with 5 stem examples (`-d`, `-t`, `-chn`, `-ffn`, `-tm`); s-stem rule with 4 examples (`tanzen`, `heißen`, `sitzen`, `reisen`); 3 example sentences.

2. **II. Starke Verben** — categorized into 4 patterns (a→ä, au→äu, e→i, e→ie); each pattern lists 4-6 verbs with du/er forms; one sample sentence per pattern; "verbs you'd expect to change but don't" note (e.g., `kommen` → `kommt`, no umlaut).

3. **III. Mischverben** — full table of 8 mixed verbs with columns: Infinitiv | Präsens (er) | Präteritum | Partizip II | Konjunktiv II. Explanatory paragraph about the irregular-stem-with-weak-endings pattern.

4. **IV. Modalverben** — complete grid: all 6 modals × all 6 persons present + Präteritum + K2 + Partizip II. Double-infinitive rule explained (`Ich habe arbeiten müssen`, not `gemusst`) with 2 examples. Note about `möchte` being formally a K2 of `mögen` but used as its own modal.

5. **V. Trennbar / untrennbar** — two clear lists, then the "sometimes-both" prefixes (durch-, über-, um-, unter-, wieder-) with stress-determines-meaning pair examples (`umfahren` "drive around" vs "run over"). Visual diagram: `aufstehen → ich stehe ... auf` showing the prefix migrating in main clauses.

6. **VI. Partizip II** — decision tree presented as a flowchart: regular vs strong vs separable vs inseparable vs `-ieren`. 6+ examples per branch. Sub-note about double-prefix verbs (e.g., `vorbereiten` → `vorbereitet`).

7. **VII. haben vs sein** — concrete rules: motion (`gehen`, `kommen`, `fahren`, `fliegen`, `laufen`, `schwimmen`); state-change (`sterben`, `werden`, `aufstehen`, `einschlafen`); always-sein irregulars (`sein`, `bleiben`, `passieren`, `geschehen`). Grouped lists with ~12 verbs.

8. **VIII. Imperativ** — du / ihr / Sie patterns. The e→i carry-through rule with 5 examples (`gib!`, `nimm!`, `sieh!`, `lies!`, `iss!`). The a→ä non-carry rule with 4 examples (`fahr!`, `schlaf!`, `lauf!`, `trag!`). Bindevokal verbs (`arbeite!`, `warte!`).

9. **IX. Konjunktiv II** — "real K2 vs würde+Infinitiv" decision rule. Complete real-K2 forms for sein/haben/werden + 6 modals + 8 common strong verbs (`gehen→ginge`, `kommen→käme`, `finden→fände`, `geben→gäbe`, `lassen→ließe`, `wissen→wüsste`, `bleiben→bliebe`, `tun→täte`). Example pairs showing the stylistic difference.

10. **X. Passiv** — full Vorgangspassiv tense ladder with one sample per tense. "worden vs geworden" callout (worden in passive, geworden as past participle of werden). Only-with-accusative rule + brief note on Zustandspassiv (sein + P2) for state passive, deferred for out-of-scope.

11. **XI. Reflexive Verben** — accusative reflexive pronouns table (mich/dich/sich/uns/euch/sich); dative reflexive pronouns table (mir/dir/sich/uns/euch/sich). ~15 common reflexive verbs grouped by required case. Verb + sich + preposition patterns (`sich freuen über`, `sich freuen auf`, `sich erinnern an`).

12. **XII. Verben mit Dativ** — categorized list: pure-dative (10 verbs with sentence examples — `helfen`, `danken`, `gefallen`, `gehören`, `passieren`, `schmecken`, `antworten`, `gratulieren`, `folgen`, `vertrauen`); ditransitive dative+accusative (8 verbs — `geben`, `bringen`, `schenken`, `schicken`, `schreiben`, `zeigen`, `erklären`, `sagen`). "Common mistakes" callout: `Ich helfe dir` (not `dich`).

Content sourced from the existing CheatSheet.vue + a fresh pass for accuracy and completeness. Cited grammar references: Hammer's German Grammar (Durrell), Duden Grammatik, where relevant.

## Print stylesheet

Because reference content should print well:
- `@media print`: hide ChapterNav, search field, back-to-top
- Force `print-color-adjust: exact` to preserve the paper-and-ink contrast
- `page-break-before: always` between chapters
- Drop the noise overlay
- Add a print-only footer with "GRAMMATIK · Konjugation · printed from German Trainer"

## Accessibility

- All interactive elements keyboard-reachable; Tab order follows visual order
- `prefers-reduced-motion: reduce` → all transitions become 0.01ms
- Sufficient contrast: ink-on-paper meets WCAG AA at the chosen colors (verified: `#1A1814` on `#F7F2E8` is 14.2:1)
- Sage and clay accents meet AA against paper at body sizes
- Search field has explicit `<label>` (visually hidden via `.sr-only`)
- IntersectionObserver-based active-chapter highlighting also updates `aria-current="location"` on the nav item

## Testing

Vitest, focused on the helper components (the page itself is mostly static content):

- `Callout.test.ts` — renders the three kinds with correct labels and color classes
- `VowelShift.test.ts` — renders slot content with the highlight class; respects `from` prop in title/tooltip
- `ConjugationTable.test.ts` — renders caption, person column, form column; applies hover class on relevant interactions
- `CheatSheet.test.ts` (lighter) — page mounts, all 12 chapter ids exist, ChapterNav receives the chapters prop

No tests for visual styling (CSS values aren't worth asserting); manual visual QA covers that.

## Open implementation notes

- `@fontsource` is added to `dependencies` in `package.json`, imported once in `src/main.ts`. CSS variables in `cheatsheet.css` reference the font families by name.
- The noise SVG is a 200×200 inline-svg data URL, applied via `body::before` only on the cheatsheet page (not site-wide).
- The chapter content lives **as static markup** in `CheatSheet.vue` rather than a data array — each chapter has its own anchor id, prose, callouts, and tables. This keeps the content readable in the source and easy to hand-tune.
- The router entry stays unchanged (`/verbs/cheatsheet` → `CheatSheet.vue`).
