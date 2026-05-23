# Handoff: German Trainer — Editorial "Grammatik-Atelier" Redesign

## Overview

A full visual redesign of the German Trainer single-user web app — a workbook for German A1–B2 vocabulary and grammar with three drill modules (Nouns / Adjectives / Verbs), a settings page, and a twelve-chapter long-form cheatsheet.

The redesign keeps the existing **functional contract intact** (see `FUNCTIONALITY.md` in the source repo) but replaces the default naive-ui chrome with a unified **editorial "Grammatik-Atelier"** aesthetic: warm paper/ink palette, serif typography, mono micro-labels, marginalia treatments, drop caps, and sage/clay/ochre/cobalt accent colors. The cheatsheet's existing visual direction has been extended across the whole app so the marketing pages, drill screens, and grammar reference all feel like a single published volume.

## About the Design Files

The HTML/CSS/JSX files in this bundle are **design references** — interactive prototypes built in plain React+CSS to show intended look, layout, and behavior. They are **not production code to copy verbatim**.

**The task is to recreate these designs in the existing Vue 3 + TypeScript + Vite codebase** at https://github.com/AlexandruCristianRobert/GermanTrainer, using its established patterns:
- Vue 3 single-file components, `<script setup lang="ts">`
- naive-ui as the component library (NButton, NInput, NSelect, NCheckboxGroup, NDataTable, NModal, NDrawer, etc.)
- Vue Router for routing
- Dexie/IndexedDB for nouns/adjectives/settings persistence
- localStorage for theme + quiz setup memory

Use the prototype's **design tokens, typography, layout, and interaction patterns**, but build each screen as a real Vue component that talks to the existing data layer. Where the prototype stubs a flow (e.g. the adjective quiz runner, the conjugation quiz runner, chapters III–XII of the cheatsheet), follow the same visual system to build the remaining screens to spec.

## Fidelity

**High-fidelity.** Every value in the prototype is intentional — exact hex codes, type sizes, line heights, spacing, border radii, shadow values, animation durations. Recreate pixel-perfectly. If naive-ui's defaults conflict with a token in this design, override the component theme via `<NConfigProvider :theme-overrides="…">` to match the design tokens rather than visually approximating.

## Design Tokens

All tokens live as CSS custom properties on `:root` in `styles.css`. Dark mode overrides them via `[data-theme="dark"]`. The same tokens should be applied as naive-ui `themeOverrides` and as CSS variables for custom components.

### Fonts (Google Fonts)

```
Fraunces       (display — italic for ornament, regular/semibold for headings)
Source Serif 4 (body — regular + italic, 17px / line-height 1.6)
JetBrains Mono (mono — micro-labels, code, verb forms, kbd hints)
```

Load with:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Source+Serif+4:ital,opsz,wght@0,8..60,300..700;1,8..60,300..700&family=JetBrains+Mono:wght@400;500;600&display=swap" />
```

### Color palette — light theme (default)

```
--paper:        #FAF7F0     page background (warm off-white)
--paper-deep:   #F1ECDE     callouts, hover row background, mono-block bg
--paper-card:   #FCFAF3     card surface (slightly lighter than paper)
--ink:          #15130E     primary text, primary button bg
--ink-soft:     #3A372F     secondary text, italic emphasis
--mute:         #948C7C     tertiary text, dotted hairlines, mono-mark color
--rule:         #1E1B14     solid horizontal rules, table top-border
--hairline:     rgba(30,27,20,0.14)  dotted dividers, card borders

--sage:         #5C7A52     primary accent (default)
--sage-tint:    rgba(92,122,82,0.18)   tint backgrounds, chip selected
--sage-wash:    rgba(92,122,82,0.06)   hover wash on gender buttons
--clay:         #A03B2B     secondary accent (exceptions, dative cases)
--clay-tint:    rgba(160,59,43,0.18)
--ochre:        #B8852F     tertiary accent (notes, warnings, neuter tag)
--ochre-tint:   rgba(184,133,47,0.20)
--cobalt:       #2C5282     quaternary accent (examples, accusative tag, info)
--cobalt-tint:  rgba(44,82,130,0.18)

--success:      = --sage    correct-answer signaling
--danger:       = --clay    wrong-answer signaling
```

### Color palette — dark theme (`[data-theme="dark"]`)

```
--paper:        #15130E
--paper-deep:   #1E1B14
--paper-card:   #1B1812
--ink:          #EDE7D6
--ink-soft:     #B8B0A0
--mute:         #6A6557
--rule:         #3A372F
--hairline:     rgba(237,231,214,0.14)

--sage:         #8FAE82
--sage-tint:    rgba(143,174,130,0.22)
--clay:         #D4604E
--ochre:        #E2B158
--cobalt:       #6090C2
```

### Live accent token

`--accent`, `--accent-tint`, `--accent-wash` are set on `:root` from JS and follow the user's accent choice (sage / clay / ochre / cobalt). Everything sage-tinted in the design (chapter numerals, drop caps, vowel-shift highlights, conjugation endings, chip selected state, progress pips, CTA button, focused inputs) reads from `--accent`. Wiring this through means a single dropdown changes the entire app's accent.

### Spacing & sizing

- Page max-width: **1240px** on most pages, **720px** centered on quiz setup / settings (single-column forms), **880px** on result screens, **1160px** on cheatsheet.
- Page padding: **56px 48px 96px** desktop, **32px 20px 80px** mobile (≤ 720px).
- Card padding: **28px** standard, **36px 32px** for module cards on the home/landing pages.
- Border radius: **2px** for chips, tags, inputs, buttons (very small — restrained); **4px** for cards and gender-mode buttons. Avoid pill shapes — this aesthetic is "Reclam paperback", not "iOS".
- Hairlines: **1px dotted** (`var(--hairline)`) for dividers between list rows and chapter rail items; **1px solid** (`var(--rule)`) for above-the-fold rules under section titles and the conj-table border.

### Typography scale

```
.section-title       Fraunces 500, 56px desktop / 38px mobile, letter-spacing -0.01em, line-height 1
.section-subtitle    Source Serif 4 italic, 19px, color --ink-soft, max-width 560px
.chapter-title       Fraunces 600, 44px / 36px mobile, line-height 1.1
.chapter-subtitle    Source Serif 4 italic, 18px, --ink-soft
.prompt-german       Fraunces 500, 92px / 58px mobile, letter-spacing -0.02em, line-height 0.95
.prompt-english      Source Serif 4 italic, 22px, --ink-soft
body                 Source Serif 4 17px / line-height 1.6
.micro-mark          JetBrains Mono 11px, letter-spacing 0.22em, uppercase, color --mute
.field-label         JetBrains Mono 11px, letter-spacing 0.22em, uppercase, color --mute
.tag (mono)          JetBrains Mono 11px, letter-spacing 0.06em, uppercase
.kbd                 JetBrains Mono 11px, 1px hairline border with 2px bottom, color --ink-soft
```

The italic `em` element after the section title (e.g. **Üben<em>.</em>** with `em` colored `var(--accent)`) is a deliberate ornament — the period gets the accent color via italic Fraunces. Keep this everywhere a section title appears.

## Sitemap & screens

These match the existing app routes exactly. Don't change the URLs — they're documented in `FUNCTIONALITY.md` §4 and persist via localStorage.

```
/                       Home               — module landing (4 cards: Nouns / Adjectives / Verbs / Settings)
/settings               Settings           — Gemini API key + model picker

/nouns                  Nouns landing      — 2 cards: Manage / Quiz
/nouns/manage           Manage Nouns       — search + table (desktop) / card list (mobile) + Add/Reset
/nouns/quiz             Noun quiz setup    — groups + mode + count form
/nouns/quiz/run         Gender or Translation quiz runner
                        → result screen

/adjectives             Adjectives landing — 2 cards: Manage / Quiz
/adjectives/manage      Manage Adjectives  — same shape as Manage Nouns, no gender column
/adjectives/quiz        Adjective quiz setup
/adjectives/quiz/run    Sentence fill-in runner (Gemini-generated)
                        → result screen

/verbs                  Verbs landing      — 4 cards: Browse / Translation / Conjugation / Cheatsheet
/verbs/list             Browse Verbs       — search + 3 filter checkbox groups + paginated table
/verbs/translation      Translation quiz setup
/verbs/translation/run  Translation quiz runner — test-sheet (all verbs in one list, single submit)
/verbs/translation/result  Translation result screen
/verbs/conjugation      Conjugation quiz setup — verb filters + tense picker w/ CEFR badges
/verbs/conjugation/run  Conjugation quiz runner — 6 inputs per (verb × tense) question
                        → result screen
/verbs/cheatsheet       Cheatsheet — 12 chapters with sticky rail nav

/history                Quiz history — past runs with score, duration, time, filters
```

## Layout & visual patterns

### Nav header (every page)

- Sticky top, blurred backdrop (`backdrop-filter: blur(10px)`, bg `color-mix(in oklab, var(--paper) 88%, transparent)`), 1px hairline bottom.
- Inner padded `18px 48px` desktop, `14px 20px` mobile. Inner max-width 1240px.
- Logo block on the left: italic Fraunces **"Grammatik"** at 22px on top, mono micro-mark **"ATELIER · GERMAN TRAINER"** at 9.5px / letter-spacing 0.28em underneath.
- Nav links centered-right: Home / Nouns / Adjectives / Verbs / Settings — 15px Source Serif, button-style with hover + active state. Active link gets a 2px accent underline absolutely positioned at the bottom.
- Far right: theme toggle (sun/moon icon button, 36×36 circle with 1px hairline border).
- Mobile (< 720px): nav links hidden, hamburger button shows. Tapping opens a left-anchored drawer (`280px` wide, `transform: translateX(-100%)` → `0`, 260ms ease). Drawer items are full-width buttons with dotted hairline between them; active item is colored `var(--accent)` (no underline).

### Module card (Home, Nouns landing, Verbs landing)

The big repeating component on the landing pages. Use this pattern instead of square buttons or generic cards.

```
┌─────────────────────────────────────┐
│ I                                   │   ← module-numeral (italic Fraunces 64px,
│                                     │      `--accent`, opacity .85, line-height 1, mb 18px)
│ Nouns                               │   ← h2, Fraunces 600, 32px
│ Substantive                         │   ← module-de, italic Fraunces, 17px, `--ink-soft`, mb 14px
│                                     │
│ Drill der/die/das or English        │   ← module-desc, 16px, `--ink-soft`
│ translation across twenty themed    │
│ groups…                             │
│                                     │
│ 1,407 entries · 20 groups           │   ← module-meta, mono 11px, `--mute`, mt-auto
│                                     │
│ OPEN →                              │   ← module-cta, mono 12px, letter-spacing 0.22em,
└─────────────────────────────────────┘     uppercase, `--ink`, mt 24px
```

- Card padding **36px 32px 32px**, min-height **240px**, background `var(--paper-card)`, 1px hairline border, border-radius **4px**, fully clickable.
- Hover: `translateY(-2px)`, border-color → `var(--ink-soft)`, soft shadow `0 12px 30px -20px rgba(20,17,10,0.30)`.
- Grid: **2 columns desktop, 1 column mobile**, gap 24px / 16px mobile.

### Section header (top of every page)

Three pieces in a row, baseline-aligned, `margin-bottom: 32px`:

```
KAPITEL I · SUBSTANTIVE             ← micro-mark (mono 11px, 0.22em tracking, uppercase, --mute)
Nouns.                              ← section-title with em on the period
A small workbook for German…        ← section-subtitle, italic, --ink-soft, max-w 560px
```

On the right (optional): a paired meta block (e.g. "NIVEAU / A1 — B2") or an action button. On mobile (< 720px) the right block stacks below.

### Quiz card (Nouns / Verbs / Adjectives runners)

Two-column desktop layout that becomes single-column on tablet (< 900px):

```
┌─────────────────────────────────────┐  ┌──────────────────┐
│ FRAGE 1 · VON 10           End quiz │  │ Marginalia       │
│ ━━━━━━──────────────────────────────│  │ ────────────────  │
│ ─────────────────────────────────── │  │ BEACHTE          │
│                                     │  │ "Die meisten     │
│                  Wasser             │  │  Wörter auf -e   │
│                  water              │  │  sind feminin."  │
│ ─────────────────────────────────── │  │                  │
│  ┌──────┐  ┌──────┐  ┌──────┐       │  │ SCORE SO FAR     │
│  │ der  │  │ die  │  │ das  │       │  │ 7 / 10           │
│  │MASC. │  │FEM.  │  │NEU.  │       │  │                  │
│  └──────┘  └──────┘  └──────┘       │  │ LEGEND           │
│                                     │  │  der  masculine  │
│ ✓ Richtig.                          │  │  die  feminine   │
│                                     │  │  das  neuter     │
│ PRESS ENTER TO ADVANCE     Next →   │  │                  │
└─────────────────────────────────────┘  └──────────────────┘
```

- Grid `grid-template-columns: minmax(0, 1fr) 220px`, gap 48px, max-width 980px centered.
- The German prompt sits in a `.prompt-card` framed by 1px-solid top and bottom rules (`var(--rule)`), with the group tag positioned absolutely at top-left.
- Progress bar above the prompt: thin horizontal pips, one per question, **flex: 1** each. State: `--hairline` (pending), `var(--accent)` (current/uncertain), `var(--success)` (correct), `var(--danger)` (wrong).
- Marginalia is `position: sticky; top: 96px` so it stays in view as the body scrolls.

### Gender buttons (Noun gender mode)

3-column grid, gap 16px. Each button:
- `var(--paper-card)` bg, 1px `var(--rule)` border, 4px radius, **36×24×32 padding**.
- Centered italic Fraunces **44px** for the article, mono **10px / 0.24em tracking** subtitle ("MASCULINE" etc.) below at `--mute`.
- Hover (unpicked): `translateY(-2px)`, bg → `var(--accent-wash)`, border → `var(--accent)`.
- **After pick — critical**: switch the picked state from native `disabled` to `aria-disabled="true"` + `pointer-events: none` inline style. The native `disabled` attribute prevents user-agent stylesheets and your CSS from reaching the element in some browser configurations. Use `aria-disabled` for the semantic state and `pointer-events: none` for the click guard.
- Correct: bg `var(--success-tint)`, border + text `var(--success)`, opacity 1.
- Wrong: bg `var(--danger-tint)`, border + text `var(--danger)`, opacity 1.
- Unpicked siblings dimmed to opacity 0.35.

### Translation input (Translation quizzes, Adjective sentence fill)

- Borderless input with bottom-only 2px `var(--rule)` underline. 22px font size, centered text-align, no rounded corners.
- Focus state: bottom border → `var(--accent)`.
- Submit button (`.btn-accent`) sits inline to the right.
- After submit: input becomes readonly; bottom border and text color switch to `var(--success)` or `var(--danger)`. Feedback line below shows ✓ Richtig or ✗ Korrekt — **{expected}**.

### Forms — chips, segmented, inputs

- **Chip** (checkbox/multi-select): 7×14 padding, 1px hairline border, 2px radius, 14px font. Selected = `var(--accent-tint)` bg + accent border + accent count text.
- **Chip count**: mono 11px, `--mute` (turns accent when chip selected). Sits inside the chip after the label.
- **Segmented** (radio/single-select): inline-flex, 1px hairline border, 2px radius, overflow hidden. Buttons separated by 1px hairlines. Active button: `var(--ink)` bg + `var(--paper)` text (inverted).
- **Input**: borderless, bottom-only 1px `var(--rule)` border, 17px Source Serif, 8px vertical padding, italic placeholder in `--mute`. Focus turns bottom border to `var(--accent)`.
- **Select**: same as input, with a CSS-drawn down-chevron in the right padding (two linear gradients forming a 5×5px ▼).
- **Buttons**:
  - `.btn`: 15px Source Serif 500, 11×22 padding, 2px radius, 1px border, inline-flex with 8px gap (for arrow icons).
  - `.btn` (primary/default): `var(--ink)` bg, `var(--paper)` text.
  - `.btn-accent`: `var(--accent)` bg, paper text. In dark mode swap text to `--ink` so it stays readable on the brighter accent.
  - `.btn-ghost`: transparent bg, hairline border. Hover fills with `var(--paper-deep)`.
  - `.btn-quiet`: transparent + transparent border, 8×12 padding, `--ink-soft` text. Used for inline "All / None" buttons and "End quiz" links.
  - `.btn-danger`: clay border + text, transparent bg.

### Tables (Manage Nouns / Browse Verbs)

- Headers: mono 11px / 0.18em tracking, uppercase, `--mute`, weight 400. 12×12 padding. 1px solid bottom border (`var(--rule)`).
- Rows: 14×12 padding, 1px dotted bottom border (`var(--hairline)`). Row hover: bg → `var(--paper-deep)`.
- Gender display in the German column: italic gray `--mute` article inline-prefixing the noun, like "*der* Tisch". The Fraunces noun is 500 weight, 19px.
- Gender column: a tag chip — der = cobalt-tinted, die = clay-tinted, das = ochre-tinted. (Carry this color logic anywhere a gender displays.)
- Group column: a plain `.tag` with `--paper-deep` background.
- Actions column: right-aligned `.btn-quiet` "Edit" with `.btn-danger` "Delete" alongside.

### Tags

Small mono labels (11px / 0.06em / uppercase / 3×8 padding / 2px radius). Color combinations used:

- Plain: `--paper-deep` bg, `--ink-soft` text. Default.
- `.tag-accent` — accent-tint bg, accent text. (For "selected", reflexive verbs, things tinted by the live accent.)
- `.tag-cobalt` — cobalt-tint bg, cobalt text. (For *der*, accusative case, info contexts.)
- `.tag-clay` — clay-tint bg, clay text. (For *die*, dative case, exceptions.)
- `.tag-ochre` — ochre-tint bg, ochre text. (For *das*, genitive case, notes.)

For verb type/case tags in the translation runner: irregular = clay, separable = cobalt, modal = ochre, mixed = accent. See `verbs.jsx` `typeTagClass` / `caseTagClass`.

### Alerts (info / warning / danger / generic)

Left rule + uppercase mono label + body. 14×18 padding, `var(--paper-deep)` bg, **0 2px 2px 0** radius (sharp on the left where the rule is).

- Generic: rule color `--mute`.
- `.alert-info`: rule `--cobalt`, label colored `--mute`. Used for "X items available", how-to instructions.
- `.alert-warning`: rule `--ochre`. Used for "Set your Gemini API key first", privacy warnings.
- `.alert-danger`: rule `--clay`. Used for reset-to-defaults confirmation, errors.

### Marginalia (quiz runner sidebar, can be reused anywhere)

A right-rail container that holds short labelled vignettes — grammar rules, mnemonics, score readouts, legends. Each `.marg-section`:
- Mono `--mute` label at the top (10px / 0.22em / uppercase).
- A pull-quote in italic Fraunces 22px, line-height 1.25, `--ink`. Prefixed with a giant accent-color `"` mark (size 60px, set as `::before`, vertical-align baseline).
- A small body paragraph in regular body font.
- Sections separated by dotted 1px hairlines with 24px padding.

The runner cycles through 3–4 marginalia vignettes per question type — see `GENDER_MARGINALIA` in `data.js` and `TRANS_MARGINALIA` in `verbs.jsx` for the content shape. Real production app should ship one or two dozen per quiz type so the user encounters variety across a session.

### Cheatsheet (`/verbs/cheatsheet`)

Two-column grid (240px sticky rail + 1fr main column, max-width 1160px). On `< 1023px` the rail moves above the body as a pill-bar or list. Each chapter section:

- A small mono `Kapitel I` label above the title (NOT a giant italic numeral — earlier version overlapped content, was changed in feedback).
- `chapter-title` Fraunces 600 44px and `chapter-subtitle` italic 18px below.
- Short solid rule (80px wide, `var(--rule)`) under the subtitle.
- Lead paragraph with `.dropcap-p` — first letter rendered with `::first-letter { float: left; font: 3em italic Fraunces 300; color: var(--accent); margin: 4px 10px -2px 0; }`. On mobile (`< 480px`) the drop cap becomes inline at 1.4em.
- Body content: prose with inline `<code>` mono, h3 `.pattern-heading` (Fraunces 22px / accent / counter-incremented prefix "a." "b." "c." via CSS counter).
- **Conjugation tables** — `.conj-table` is a bordered grid (1px `--rule` border, 2px radius) with a notched mono caption escaping the top edge (background `var(--paper)` so it bridges the border). Inside: a grid auto-fitting to columns of `minmax(160px, 1fr)`, rendered as pairs of `.person` (italic, `--ink-soft`) + `.form` (mono 15px). Verb endings inside forms get an `.ending` span colored `var(--accent)` weight 600 (this catches the eye on the conjugated suffix). Vowel-shift highlights use `.vh` — accent color, weight 600, accent-tint background, padded 0 3px with 2px radius.
- **Callout boxes** — `.callout` with a 3px left rule. Three variants by `kind`: `note` (ochre rule + label), `exception` (clay), `example` (cobalt). 16×20 padding, `--paper-deep` bg, **0 2px 2px 0** radius. Label is mono 10px / 0.22em / uppercase, color-matched to the rule. Use `BEACHTE` / `AUSNAHME` / `BEISPIELE` as the German labels.
- Sticky rail on the left: `INHALT` micro-label, `Suche…` input, ordered list of all 12 chapters with mono Roman numeral prefix + bilingual title (German Fraunces, English italic gray subtitle). Active chapter gets a 2px accent left border. Search input dims non-matching chapters to opacity 0.32 (not hidden — kept in place so scroll-spy still works).

The full 12-chapter content is in the source repo's `CheatSheet.vue` — only chapters I and II are shown in the prototype as a representative sample. Port all 12 verbatim.

## Interactions & behavior

### Theme

Sun/moon button in nav header toggles `data-theme="light|dark"` on `<html>`. Persist to `localStorage.theme`. On first load if no stored value, follow `prefers-color-scheme` AND set up a `matchMedia` listener so the page reacts live to system theme changes (until the user clicks the toggle, which "commits" their choice). The toggle's `aria-label` should describe the destination state ("Switch to dark theme" / "Switch to light theme") — not the current state. Reduce-motion should disable the icon's spin transition.

### Accent color

Stored in localStorage (under whatever key fits the app — the prototype writes to its in-memory Tweaks state). Possible values: `sage`, `clay`, `ochre`, `cobalt`. On change, set `--accent`, `--accent-tint`, `--accent-wash` on `:root` using the light or dark variant matching the current theme. Surface as a small picker in Settings, NOT in the nav header — this is a preference, not a frequent action.

### Quiz keyboard flow

- Setup: nothing required. Start button triggers navigation to `/…/quiz/run`.
- Runner before submit: input autofocus on every question. **Enter submits.** Submit button disabled while input empty.
- Runner after submit: focus moves to the **Next** button (or feedback advances automatically). **Enter advances** (works because Next button is focused).
- Last question: Next button label changes to "Finish quiz".

### Quiz progress pips

Update live as the user answers — fill in `--success` or `--danger` after each submit. The current pip is `--accent` until answered. This is one of the small touches that makes the runner feel like a real product instead of a static mock.

### Reduced motion

`@media (prefers-reduced-motion: reduce)` — disable the `.chapter` entry animation, the gender-button hover lift, the theme toggle rotation. All transition-duration and animation-duration drop to 0.01ms (effectively instant).

### Storage-unavailable error

When IndexedDB can't open (private window, locked-down browser), `main.ts` currently replaces the root with a static error message. **Style it as a full-page editorial error**: same nav header, centered single-card with mono error label + Fraunces headline "Storage unavailable" + body paragraph explaining the cause + ghost button "Try again". Keep it on-brand — it's the first thing a user might see.

## State management

Use the existing app's stores. Where the prototype keeps state in React `useState`, the production app should:

| Data | Storage |
|---|---|
| Theme | `localStorage.theme` ('light' \| 'dark' \| absent for system) |
| Accent color | `localStorage.accent` ('sage' \| 'clay' \| 'ochre' \| 'cobalt' — new in this redesign) |
| Nouns | IndexedDB `nouns` table (existing) |
| Adjectives | IndexedDB `adjectives` table (existing) |
| Settings (API key + model) | IndexedDB `settings` singleton (existing) |
| Verbs | TypeScript module (bundled, read-only) |
| Quiz setup memory | `localStorage.nounQuizGroups`, `adjectiveQuizGroups`, `verbConjQuiz` (existing) |

The redesign **does not change any persistence schemas**. Existing user data should continue to work.

## Responsive breakpoints

```
< 720px      Phone — hamburger nav drawer, single-column module grid,
             smaller section/prompt titles, smaller gender buttons,
             reduced page padding (20px horizontal).
             Manage tables get horizontal scroll OR convert to a card list
             (the FUNCTIONALITY.md spec calls for a card list — implement that
             at this breakpoint).

< 900px      Tablet — quiz marginalia stacks below the quiz card.

< 1023px     Small laptop / tablet — cheatsheet rail moves above the body
             as a sticky pill bar (FUNCTIONALITY.md §11). On <640 it becomes
             a horizontally-scrolling pill bar.

≥ 1024px     Full desktop — two-column cheatsheet, beside-card marginalia, full nav.
```

## Update 2 — Verb translation test-sheet & History page

After initial review, two screens changed from the original spec. **Implement these as described below; the rest of the document still applies.**

### Verb translation runner — switched from one-at-a-time card to a single test sheet

The old runner showed one verb per screen with submit/next. **The new runner shows all N verbs on one page** with inputs stacked vertically, a single Submit-all button at the bottom, and goes to a separate result page after submit. This proved to feel more like a real worksheet and lets users skim, skip, and revisit before grading.

Layout (`.test-sheet`, max-width **760px**, centered):

- **Section header** at the top — breadcrumb "Kapitel III · Übersetzen · N Verben", title "Übersetzung." with accent period, italic subtitle "Type the English meaning of each verb. 'to' is optional. Press Enter to jump to the next line.", and an "End quiz" quiet button on the right.
- **Sticky meta bar** (`.test-sheet-header`) just below — sticks to `top: 73px` (under nav). Backdrop-blurred bg `color-mix(in oklab, var(--paper) 92%, transparent)`. Contains a filled count ("**6** · von 10 ausgefüllt", mono uppercase 12px / 0.18em tracking) on the left and a thin live progress bar on the right (max 280px wide). Pip turns `var(--accent)` when its row has content.
- **Verb rows** (`.test-row`, 2-column grid `48px 1fr` with 20px gap, 18×0 padding, 1px dotted bottom hairline):
  - Left col: a zero-padded row number `01.` `02.` … in mono 13px `--mute`, slightly indented top.
  - Right col stacks vertically:
    1. A prompt row with the German verb (Fraunces 500, **32px**, letter-spacing -0.01em) on the left and the level/type/case chips on the right (small tags with the existing color logic — irregular=clay, mixed=accent, separable=cobalt, modal=ochre).
    2. A borderless input — bottom-only 1px hairline border, 17px Source Serif, italic muted placeholder "English (to is optional)…". Focus thickens the bottom border to 2px and turns it `var(--accent)`.
- **Sticky footer** (`.test-sheet-footer`, bottom-sticky, same backdrop-blur as header) — "**N** filled · M remaining" mono label on the left, **Submit all · N verbs →** primary button on the right. Disabled until at least one input is filled. Submitting writes a history entry and navigates to the result page.

Keyboard: pressing Enter in any input jumps focus to the next row's input. Pressing Enter on the last input focuses the Submit-all button.

Mobile (`< 600px`): the row grid drops to `36px 1fr / gap 12px`, verb size shrinks to 26px. Everything else flows the same.

The single-card runner pattern from the older translation/gender quizzes still applies for the **noun gender quiz** — keep that one one-at-a-time so the buttons can feel tactile. The list-style is specifically right for translation drills where the user wants to skim the whole set first.

### Quiz history (`/history`)

A new top-level destination — sits in the nav between Verbs and Settings.

- **Section header**: breadcrumb "Verlauf · Quiz history", title "History.", italic subtitle, and (when there's data) a "Clear history" quiet danger button on the right.
- **Stat strip** (`.stat-strip`, 4-column grid bordered top + bottom with 1px solid `var(--rule)`, dotted vertical hairlines between cells, 24×24 padding per cell):
  - Total runs · Questions answered · Correct · Overall %
  - Big numbers in Fraunces 500 / 48px / letter-spacing -0.02em. Labels in mono 11px / 0.18em tracking / uppercase / `--mute` underneath. The `%` suffix on the overall percentage renders smaller (24px) and `--mute`.
  - Mobile (`< 720px`): collapses to 2×2 grid.
- **Filter segmented control** (when items exist) — "All · N", then one chip per quiz type that actually has any runs (e.g. "Noun gender · 3", "Verb translation · 5"). Same `.segmented` component used elsewhere.
- **History table** (`.data-table.history-table`) — rows:
  - **Quiz** col (24%): quiz name in Fraunces 500/18px + German subtitle in italic Fraunces/13px/`--mute` below
  - **Started** col (20%): relative time ("3m ago", "2h ago", "5d ago", or "Mar 14" for older) in body font + absolute "Mon 14:32" beneath in mono/12px/`--mute`
  - **Duration** col (12%): formatted like "1m 23s" or "45s" in mono `--ink-soft`
  - **Questions** col (12%): the count + italic "asked" tag
  - **Score** col (18%): "7/10" in Fraunces 22px with denom muted, plus a colored % tag right of it — `--success-tint` ≥80%, `--ochre-tint` 50–79%, `--danger-tint` <50%
  - **Filters** col (14%): mono 11px summary of meta (e.g. "gender · 6 groups", "A1/A2 · regular, irregular")
- **Empty state** (`.empty-state`, when no history): centered card with dashed hairline border, big italic Fraunces "∅" mark, "No quizzes yet." headline, italic subtitle, accent "Back to home →" button.

### Persistence — quiz history storage

Stored in **localStorage** under key `gt:quizHistory` as a JSON array of entries (cap at 100, FIFO trim from oldest). Each entry:

```ts
{
  id: number,           // timestamp ms
  type: 'noun-gender' | 'noun-translation' | 'adjective' | 'verb-translation' | 'verb-conjugation',
  startedAt: string,    // ISO
  finishedAt: string,   // ISO
  durationMs: number,
  count: number,        // total questions asked
  correct: number,      // total correct
  meta: {
    // Whatever filters were used. Shape varies by quiz type:
    mode?: 'gender' | 'translation',  // noun
    groups?: string[],                 // noun, adjective
    levels?: string[],                 // verb
    types?: string[],                  // verb
    cases?: string[],                  // verb
    tenses?: string[],                 // verb conjugation
  }
}
```

Helpers exported from `history.jsx`:
- `saveQuizRun(entry)` — push + trim to 100. Call this from the result screen of every quiz (or from the runner when it transitions to result).
- `loadHistory()` — returns the array (newest first).
- `clearHistory()` — empties the store.

The Vue port should put these in a small composable, e.g. `useQuizHistory.ts`, and inject `saveQuizRun` into each quiz module's result component. The schema is independent of the existing IndexedDB stores — this is a new localStorage key.

### Nav additions

The top-nav `NAV_ITEMS` array now includes a 5th entry **History** between Verbs and Settings. The mobile drawer mirrors this. Active state behaves the same way (2px accent underline on desktop, accent text in drawer).

---

## Screenshots

The `screenshots/` folder in this bundle contains HQ captures of every key screen in the prototype:

| File | Screen |
|---|---|
| `01-home-light.png` | Home — 4-card module grid in light mode |
| `02-nouns-landing.png` | Nouns landing — 2-card layout (Manage / Quiz) |
| `03-manage-nouns.png` | Manage Nouns — search + data table with der/die/das gender tags |
| `04-noun-quiz-setup.png` | Noun quiz setup — group chips, mode segmented, count picker |
| `05-noun-quiz-runner.png` | Noun gender quiz runner — clean state, with marginalia sidebar |
| `06-noun-quiz-feedback.png` | Noun gender quiz runner — post-pick (dark mode) |
| `07-verbs-landing.png` | Verbs landing — 4-card layout (Browse / Translation / Conjugation / Cheatsheet) |
| `08-verb-translation-setup.png` | Verb translation setup — Level / Type / Case chip filters + count |
| `09-verb-translation-runner.png` | ⚠️ Old: single-card runner. **Has been replaced** by the test-sheet layout described in *Update 2*. Capture not yet refreshed — see the description there for the current layout. |
| `10-cheatsheet.png` | Cheatsheet — sticky rail nav + chapter I header |
| `11-settings.png` | Settings — Gemini API key + model picker + test connection |
| `12-home-dark.png` | Home in dark mode — same layout, dark theme tokens |

Note on the feedback screenshot (#6): the **correct** button gets a sage-tinted background + sage text, the **wrong** button gets a clay-tinted background + clay text, the third unpicked button is dimmed to opacity 0.35. The captures don't pop the bg tints as strongly as the live app does at full saturation — implement to the **token spec** (`--success-tint` / `--danger-tint` on bg, `--success` / `--danger` on border + text) rather than pixel-matching the screenshot.

## Files in this bundle

| File | What it is |
|---|---|
| `German Trainer.html` | Entry HTML — Google Fonts link, React+Babel CDN scripts, mount target |
| `styles.css` | Full design system as CSS custom properties + component classes |
| `app.jsx` | App root: theme/accent/route state, route dispatch, mounts Tweaks panel |
| `nav.jsx` | NavShell — sticky header, links, theme toggle, mobile drawer |
| `home.jsx` | Home page — 4-card module grid + footer marks |
| `nouns.jsx` | Nouns landing + Manage table + Quiz setup + Gender quiz runner + Result |
| `verbs.jsx` | Verb data, Translation quiz setup + **test-sheet runner** + result, tag-class helpers |
| `cheatsheet.jsx` | Cheatsheet shell + 2 sample chapters showing the full layout vocabulary |
| `history.jsx` | **Quiz history** — save/load/clear helpers + HistoryPage component |
| `other-pages.jsx` | Settings page + Adjectives/Verbs landing stubs |
| `data.js` | Sample noun data, group counts, marginalia content |
| `tweaks-panel.jsx` | Floating tweaks panel scaffold (host-protocol — drop on port) |
| `FUNCTIONALITY.md` | The original functional spec (what each screen does — unchanged) |

## Recommended implementation order

1. **Set up tokens.** Drop the Google Fonts link into `index.html`. Move the `:root` CSS custom properties from `styles.css` into a global stylesheet imported once at app startup. Add the `[data-theme="dark"]` overrides.
2. **NavShell + theme toggle.** Replace the existing `NavShell.vue` with the new header. Wire up the theme toggle (already half-implemented in `useTheme.ts`).
3. **Home page.** Build the module card component and use it on `/`. This component will be reused on every landing.
4. **One quiz end-to-end** — recommend Noun gender quiz first since it has the cleanest interaction model. Setup → Runner → Result. This proves out the chip / segmented / prompt-card / gender-btn / marginalia / progress-pip / result-row patterns; everything else is variation on these.
5. **Manage table.** Reuse the existing data table from naive-ui (NDataTable) with theme overrides; build the mobile card-list variant per `FUNCTIONALITY.md` §7.3 / §11.
6. **Remaining quizzes.** Noun translation, Verb translation, Adjective sentence-fill, Verb conjugation. Conjugation is the most complex — 6 input rows per question, per-row acceptance, tense picker with passive-disabling logic.
7. **Cheatsheet.** Port all 12 chapters from `CheatSheet.vue`. The visual vocabulary (chapter title, drop-cap, conj-table, callouts, vowel-shift) is already in `cheatsheet.jsx` + `styles.css`.
8. **Settings + storage-unavailable error.**
9. **Reduced motion + a11y polish.** All form inputs labelled, focus-visible outlines on the rail buttons, sr-only label on the cheatsheet search.

## Assets

No external image assets are used. The "paper grain" effect is a small inline SVG noise data-URL applied as a fixed-position overlay at 3% opacity (5% inverted in dark mode). See the `.paper-grain` rule and `<div class="paper-grain"></div>` element in `app.jsx`.

All icons are inline SVG (sun, moon, hamburger — see `nav.jsx`). No icon library required.

## What's intentionally left lo-fi in the prototype

- **Adjective quiz runner** (Gemini sentence fill). Not implemented — follow the same Quiz card pattern as the others, with a blanked sentence as the prompt and an inflection-only input (the *base* form should be rejected).
- **Verb conjugation quiz runner** — six input rows per question, per-row acceptance with ä/ö/ü/ß strict matching. Use the conj-table layout from the cheatsheet as the base; the form swaps in `<input>` elements where forms would be.
- **Browse Verbs table** — Manage table styling applies; just no Add/Edit/Delete since verbs are bundled.
- **Cheatsheet chapters III–XII** — port from source `CheatSheet.vue`. The visual vocabulary is fully established.

For each of these, the visual treatment is the variation on patterns already in the prototype — refer back to the closest implemented screen.
