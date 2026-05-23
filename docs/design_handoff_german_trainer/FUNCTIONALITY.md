# German Trainer — Functionality Spec

> A complete description of what the app does today, written for a designer who will redesign the UI without changing the behavior. No design opinions in here — just features, flows, data, and UI states.

## 1. Purpose

A single-user web app for practicing German vocabulary and grammar at A1–B2 level. Three vocabulary domains:

1. **Nouns** — practice gender (der/die/das) and English translation.
2. **Adjectives** — fill-in-the-blank quiz on AI-generated German sentences (the user supplies their own Gemini API key).
3. **Verbs** — translation quiz, full-tense conjugation quiz with answer checking, and a grammar cheatsheet.

The app runs entirely in the browser. All vocabulary data is bundled with the app; the only network call is to Google's Gemini API when generating adjective quiz sentences.

## 2. Tech context (for orientation, not design constraints)

- Vue 3 + TypeScript + Vite, deployed to GitHub Pages at `/GermanTrainer/`.
- Persistence: IndexedDB (via Dexie) for nouns, adjectives, settings; localStorage for theme preference, quiz setup preferences (selected groups, last preset count, etc.).
- Component library: naive-ui (provides buttons, cards, modals, tables, inputs, drawers, etc.). The designer is welcome to recommend replacing it, but every component currently used has a naive-ui equivalent.
- The verbs dataset and conjugation engine are pure TypeScript modules — no DB.

## 3. Theming

- The app has **light** and **dark** themes plus a "system" mode.
- The current theme is the value of `<html data-theme="light|dark">`. The preference is persisted in `localStorage` under key `theme` (`light`, `dark`, or absent = system).
- A small **sun/moon icon toggle** sits in the top navigation header on every page. Clicking it flips between light and dark and persists the explicit choice (it does not go back to system mode).
- On first visit, theme follows `prefers-color-scheme`. If the user has not chosen explicitly, the app reacts live to system theme changes.
- Both naive-ui's component theme and any custom CSS palettes follow `data-theme`.

## 4. Sitemap

| Path | Page | Public name |
|---|---|---|
| `/` | Home | Home |
| `/settings` | Settings | Settings |
| `/nouns` | Nouns landing | Nouns |
| `/nouns/manage` | Manage Nouns | Manage nouns |
| `/nouns/quiz` | Noun quiz setup | (no nav entry; reached from Nouns landing) |
| `/nouns/quiz/run` | Noun quiz runner | (no nav entry; reached from setup) |
| `/adjectives` | Adjectives landing | Adjectives |
| `/adjectives/manage` | Manage Adjectives | (no nav entry) |
| `/adjectives/quiz` | Adjective quiz setup | (no nav entry) |
| `/adjectives/quiz/run` | Adjective quiz runner | (no nav entry) |
| `/verbs` | Verbs landing | Verbs |
| `/verbs/list` | Browse Verbs | (no nav entry) |
| `/verbs/translation` | Translation quiz setup | (no nav entry) |
| `/verbs/translation/run` | Translation quiz runner | (no nav entry) |
| `/verbs/conjugation` | Conjugation quiz setup | (no nav entry) |
| `/verbs/conjugation/run` | Conjugation quiz runner | (no nav entry) |
| `/verbs/cheatsheet` | Cheatsheet | (no nav entry; reached from Verbs landing) |

**Top nav** shows five items: Home, Nouns, Adjectives, Verbs, Settings (+ the theme toggle). On mobile, the menu becomes a hamburger that opens a left drawer with the same items. The active page is highlighted in the nav.

## 5. Home page (`/`)

Grid of three or four hoverable cards, each linking to a module:

- **Nouns** — "Quiz the gender (der/die/das) or English translation of German nouns." — button: Open
- **Adjectives** — "Fill-in-the-blank quiz with AI-generated German sentences." — button: Open
- **Verbs** — "Translate verbs and practice conjugating across all German tenses, with a cheatsheet of rules." — button: Open
- **Settings** — "Set your Gemini API key and pick a model." — button: Open

## 6. Settings (`/settings`)

Single form. Stored in IndexedDB as a singleton row.

Fields:
- **Gemini API key** (password-masked input with show-on-click). Required for the Adjectives quiz only.
- **Model** (dropdown). Options: `gemini-2.5-flash` (default, free tier), `gemini-2.5-flash-lite` (cheapest), `gemini-2.5-pro` (more capable).

Actions:
- **Save** — writes both fields to IndexedDB.
- **Test connection** — sends a minimal request to Gemini and reports success or the error message inline. Disabled when the key is empty.

Informational alerts on the page:
- A warning that the key is stored locally and only sent to Google.
- An info card pointing to `aistudio.google.com/apikey` with instructions.

## 7. Nouns module

### 7.1 Data

~1,400 noun entries (after dedupe) across **20 categories**:

`Office`, `Work`, `Furniture`, `House`, `Rooms`, `Family`, `School`, `Bank & Money`, `Food`, `Body & Health`, `Clothing`, `Nature & Weather`, `Animals`, `Transport & Travel`, `Technology`, `Sports & Hobbies`, `Culture & Arts`, `Time & Numbers`, `City & Shopping`, `Other`.

Each noun has: `german` (string, unique), `gender` (`der` | `die` | `das`), `english` (string; multiple meanings separated by ` / `), `group` (one of the 20).

### 7.2 Nouns landing (`/nouns`)

Two cards in a 1- or 2-column grid:

- **Manage nouns** — "Add, edit, or delete nouns. Reset to defaults from the seed list." — button: Open
- **Quiz** — "Pick gender or translation mode and quiz yourself on N random nouns." — button: Start quiz

### 7.3 Manage nouns (`/nouns/manage`)

Top action bar:
- **Add noun** (primary button) — opens a modal with German / Gender / English / Group fields. Gender is a `der/die/das` select. Group is a select.
- **Reset to defaults** (warning-style button with a popconfirm) — wipes all user noun entries and re-loads the seed list. Confirmation text: "This will delete all your custom entries and restore the seed list. Continue?"

Below the action bar: a **searchable, filterable table** of all nouns.

Desktop: full data table with columns *German* (showing "der Tisch"-style combined gender+word), *Gender*, *English*, *Group*, *Actions* (Edit, Delete-with-confirm).

Mobile: vertical list of cards. Each card shows the German word as title, the English as subtitle, a small group tag, and a kebab menu with Edit / Delete (Delete pops a confirm dialog).

Search box on top filters across all columns. Empty state: "No entries."

The modal editor uses the same form for Add and Edit; "Save" is disabled until all fields are non-empty.

### 7.4 Noun quiz setup (`/nouns/quiz`)

A vertical form (single column, max-width ~480px):

1. **Groups** (checkbox group of all 20 categories with a per-group count, e.g. "Food (87)"). Below it, two small buttons: **All** and **None**. Selection persists in localStorage. Disabled groups (count = 0) are non-interactive.
2. **Mode** (radio group):
   - `Gender (der/die/das)`
   - `English translation`
3. **Number of questions** (radio group): `10`, `15`, `20`, `Custom`. If Custom is selected, a number input appears (min 1, max = total available in selected groups).
4. Inline info alert when the requested count exceeds available — "Only N nouns available in selected groups — quizzing all of them."
5. Inline warnings when groups is empty or there are no nouns.
6. Primary action: **Start quiz**. Disabled until at least one group is selected with nouns available.

### 7.5 Noun quiz runner (`/nouns/quiz/run`)

Single-question card UI. Two variants based on mode:

**Gender mode** (`GenderQuiz`):
- "Question N of M" small text.
- Big German word with the English translation in smaller italic underneath.
- A small group tag.
- Three large buttons: **der**, **die**, **das**, side by side.
- On click: buttons lock; the correct answer turns success-colored; the user's wrong choice (if any) turns error-colored; a feedback line shows ✅ Correct or ❌ Correct: der/die/das.
- A **Next** button appears with auto-focus to allow Enter-to-continue.

**Translation mode** (`TranslationQuiz`):
- Same header layout.
- Big "der Tisch"-style display.
- A text input (autofocused) with placeholder "English meaning". Enter submits.
- **Submit** button (primary). After submit: input locks, feedback line shows ✅ Correct or ❌ Correct: <expected>. **Next** button auto-focuses.

**Acceptance rules (translation):**
- Whitespace and case ignored.
- Multiple accepted answers separated by `/` in the stored data — any one matches.

**End-of-quiz result screen:**
- "Score: X / Y" headline.
- A bordered list of all questions with German word, correct answer, user answer, and a success/error tag.
- Primary button: **Start another quiz** → goes back to `/nouns/quiz`.

## 8. Adjectives module

### 8.1 Data

A bundled seed of ~250 adjective entries across **11 categories**:

`People & Character`, `Feelings & Emotions`, `Size & Quantity`, `Quality & Condition`, `Time & Sequence`, `Position & Direction`, `Health & Body`, `Food & Taste`, `Social & Abstract`, `Actions & Verbs`, `Other`.

Each adjective has: `german`, `english` (slash-separated meanings ok), `group`.

### 8.2 Adjectives landing (`/adjectives`)

Same shape as Nouns landing — two cards: **Manage adjectives** and **Quiz**.

### 8.3 Manage adjectives (`/adjectives/manage`)

Same UX as Manage Nouns but without the gender field. Add / Edit modal: German, English, Group. Reset-to-defaults popconfirm. Search + table on desktop, card list on mobile.

### 8.4 Adjective quiz setup (`/adjectives/quiz`)

Same shape as Noun quiz setup but no mode picker (there's only one mode: sentence fill-in).

Extra elements:
- A warning alert at the top if the user has no Gemini API key set: "Set your Gemini API key in [Settings] first." — `Settings` is a link to `/settings`.
- The Start button is disabled when the API key is missing.

Primary action: **Generate sentences and start**.

### 8.5 Adjective quiz runner (`/adjectives/quiz/run`)

On entry the page calls Gemini with the selected adjectives to generate one German example sentence per adjective. Each sentence is returned with:
- `sentence` (full German sentence)
- `adjective_base` (the dictionary form, e.g. `schön`)
- `adjective_inflected` (how it appears in the sentence with case+gender ending, e.g. `schönen`)
- `blanked` (the sentence with the inflected adjective replaced by `____`)
- `hint` (a short English clue, e.g. "the beautiful park")

While loading, show a spinner. If the API call fails, show the error and a way to go back.

Each question card shows:
- "Question N of M" header.
- The blanked sentence (large).
- The English hint in italic smaller text underneath.
- A text input (autofocus, placeholder "adjective"). Enter submits.
- **Submit** button. After submit: input locks; feedback shows ✅ Correct or ❌ Correct: `<inflected>` (base: `<base>`). Below feedback, the full original sentence is shown so the user can read it in context.
- **Next** button auto-focuses.

**Acceptance:** The user's answer is matched against `adjective_inflected` (case-insensitive, trimmed). Typing the base form is NOT accepted — the point is to get the inflection right.

End-of-quiz result screen: same shape as the noun result screen.

## 9. Verbs module

### 9.1 Data

A bundled in-memory TypeScript module (no DB). **378 verbs** spanning levels A1 / A2 / B1 / B2.

Each verb has:
- `german` (infinitive)
- `english` (slash-separated meanings)
- `level` (`A1` | `A2` | `B1` | `B2`)
- `type` (`regular` | `irregular` | `mixed` | `separable` | `modal`)
- `case` (object case the verb governs: `none` | `accusative` | `dative` | `dative+accusative` | `genitive` | `reflexive` | `varies`)
- `auxiliary` (`haben` | `sein`) for compound tenses
- `separablePrefix` (optional, for separable verbs)
- `praesens` (6 present-tense forms ich/du/er/wir/ihr/sie)
- `praeteritumStem` (and optional full `praeteritum`)
- `partizip2`
- Optional explicit `konjunktiv2`, `konjunktiv1`, `imperativDu`
- Optional `notes` (short string shown in the list)

### 9.2 The conjugation engine

A pure TypeScript function `conjugate(verb, tense) → Array<{ person, expected }>` that produces all six conjugated forms for a given tense, or three forms for Imperativ.

**Supported tenses (15 total):**

Active (always available):
| Tense | CEFR level |
|---|---|
| Präsens | A1 |
| Imperativ (du / ihr / Sie) | A1 |
| Perfekt | A1 |
| Präteritum | A2 |
| Plusquamperfekt | A2 |
| Futur I | A2 |
| Konjunktiv II | B1 |
| Konjunktiv I | B2 |
| Futur II | B2 |

Vorgangspassiv (passive — only enabled when at least one accusative-taking verb is in scope):
| Tense | CEFR level |
|---|---|
| Passiv Präsens | B1 |
| Passiv Präteritum | B1 |
| Passiv Perfekt | B2 |
| Passiv Plusquamperfekt | B2 |
| Passiv Futur I | C1 |
| Passiv Konjunktiv II | C1 |

The engine outputs verb forms only — no personal pronoun (the UI shows the pronoun as a label next to each input). For reflexive verbs, the engine also omits "sich".

### 9.3 Verbs landing (`/verbs`)

Four hoverable cards in a 1- or 2-column grid:

- **Browse verbs** — "Searchable list of all A1/A2 verbs with type, case, and auxiliary info." — button: Open → `/verbs/list`
- **Translation quiz** — "Type the English meaning of a German verb. 'to' is optional." — button: Start → `/verbs/translation`
- **Conjugation quiz** — "Fill in conjugations across the tenses you pick — from Präsens to Passiv." — button: Start → `/verbs/conjugation`
- **Cheatsheet** — "Conjugation rules, common exceptions, and the dative-verb list." — button: Open → `/verbs/cheatsheet`

### 9.4 Browse Verbs (`/verbs/list`)

A page with:
- A **search input** filtering across German + English.
- Three checkbox groups stacked horizontally: **Level** (A1/A2/B1/B2), **Type** (regular/irregular/mixed/separable/modal), **Case** (the 7 case values).
- A data table with columns: *German*, *English*, *Level*, *Type*, *Case*, *Aux*. Paginated, 25 per page.

All entries are read-only (the verbs dataset is bundled, not user-editable, unlike nouns/adjectives).

### 9.5 Translation quiz setup (`/verbs/translation`)

A vertical form (max ~520px):
- **Levels** checkbox group (A1, A2, B1, B2). Default all.
- **Types** checkbox group (multi-select). Default all.
- **Cases** checkbox group (multi-select). Default all.
- **Number of verbs** radio group: 10, 15, 20, All (with the current available count), Custom.
- Warning alert if filters yield zero verbs.
- Primary button: **Start quiz**. Disabled if zero matches.

### 9.6 Translation quiz runner (`/verbs/translation/run`)

Single-card UI per question:
- Header text "Question N of M".
- Big German infinitive (e.g. "aufstehen").
- A row of small chips below it: level (e.g. `A1`), type (e.g. `separable`, info-color), case (e.g. `none`, warning-color).
- Text input (autofocus) with placeholder "English (to is optional)". Enter submits.
- **Submit** button (primary).
- After submit: feedback line ✅ Correct or ❌ Correct: `<english>` (showing the canonical slash-separated list). **Next** button auto-focuses.

**Acceptance rule (the key behavior):**
- Whitespace and case ignored.
- A leading `"to "` is stripped before comparison. "to get up", "Get up", "get up " all match the stored `"get up / stand up"`.
- Any one of the slash-separated alternatives matches.

End-of-quiz screen: Score X/Y + a recap list (German, correct English, user answer, success/error tag).

### 9.7 Conjugation quiz setup (`/verbs/conjugation`)

A wider form (~720px). At the top: heading "Conjugation quiz setup" with a secondary button "Open cheatsheet" to the right.

Content blocks, top to bottom:

1. **Verb filters** — three checkbox groups (Level / Type / Case), same as the translation setup.

2. **Tenses** — grouped picker. Tenses are organized into 5 collapsible-or-flat sections by CEFR level: **A1**, **A2**, **B1**, **B2**, **C1**. Each section header is bold. Each tense in the section is a clickable pill-chip with a small level-badge inside it. Selected chips are highlighted (sage-tinted background); deselected are outlined.

   Passive tenses appear in their level groups, but if the current verb filter has no accusative-taking verbs, the passive chips are greyed out and unclickable, with an inline info alert: "Passive tenses are disabled — your verb filter has no transitive (accusative) verbs."

3. **Number of verbs** radio group: 10, 15, 20, All (with current available count), Custom. A live preview underneath: "≈ 30 questions (10 verbs × 3 tenses)" so the user sees how big the quiz will be.

4. Warnings:
   - "No verbs match the selected filters." (if filter is too narrow)
   - "Pick at least one tense." (if tenses is empty)

5. Primary button: **Start quiz**. Disabled until both verbs and tenses are non-empty.

All selections persist to localStorage (key `verbConjQuiz`): levels, types, cases, tenses, preset, customCount.

### 9.8 Conjugation quiz runner (`/verbs/conjugation/run`)

Each question shows one (verb, tense) pair. Total questions = verbs × tenses.

Card layout per question:
- Header row: "Question N of M" on the left, a small **Cheatsheet** quaternary button on the right (jumps to `/verbs/cheatsheet`).
- Big German infinitive (e.g. "aufstehen").
- A row of small chips below: tense name with CEFR badge in parens (e.g. `Präsens (A1)`), type, case, `aux: haben` or `aux: sein`.
- Then the input rows. For indicative tenses: 6 rows labeled `ich`, `du`, `er/sie/es`, `wir`, `ihr`, `sie/Sie`. For Imperativ: 3 rows labeled `du`, `ihr`, `Sie`. Each row is a person label on the left + a text input.
- Action buttons row:
  - Before submit: **Submit** (primary) + **Skip** (secondary).
  - After submit: **Next** (primary).

**Acceptance per row:**
- Whitespace and case ignored.
- ä/ö/ü/ß must match exactly (no ae/oe/ue/ss substitutions).
- If the user types the pronoun as a prefix (e.g. `"ich habe gespielt"` when expected is `"habe gespielt"`), the pronoun is stripped before comparison.
- On submit, each row gets a per-row indicator: ✅ for correct, ❌ followed by the expected form for wrong.
- **Skip** counts as zero correct for that question and advances.

**End-of-quiz screen:**
- Aggregate score: "Score: 24 / 30 forms (3/5 fully correct)" — both per-row total and per-question fully-correct count.
- A recap list. Each item: "infinitive — TenseName — per-row: ich: …; du: … — your: ich: …; du: …" + a success-tag (only if all rows were correct).
- Primary button: **Start another quiz** → back to setup.

### 9.9 Cheatsheet (`/verbs/cheatsheet`)

A long-form editorial reference page with 12 chapters. Sidebar nav with scroll-spy on desktop, sticky pill-bar on tablet/mobile.

Structure overall:
- Header: "GRAMMATIK · KONJUGATION" mark on the left.
- Sticky left-rail navigation (240px) with title "INHALT", a search input ("Suche…"), and a numbered list of all 12 chapters. The active chapter is highlighted with a sage left border. Search dims non-matching chapters. Clicking a chapter smooth-scrolls to that section.

On tablet (640–1023px) the rail becomes a sticky pill-bar at the top of the page that wraps. On mobile (<640px) it becomes a horizontally-scrolling pill bar at top.

Each chapter section has:
- A large Roman numeral on the left (outside the text column on desktop, inline on smaller widths).
- A title pair: bold German title + smaller italic English subtitle (e.g. "Schwache Verben" + "Regular (weak) verbs — predictable endings on an unchanging stem").
- A short horizontal rule.
- A lead paragraph with a sage-green drop cap on the first letter (smaller / inline on mobile).
- Body content varies per chapter (rules, examples, conjugation tables, callout boxes).

**Conjugation tables** in the cheatsheet use the same component the quiz uses. Layout: a thin top border with the caption notch ("PRÄSENS — spielen"), then rows in a multi-column grid that auto-fits to width (1/2/3 columns at 260/540/820px). Each row has a person label on the left, the form on the right. Verb forms use a monospace font.

**Vowel-change highlights** (e.g. the `ä` in "fährt") render as a soft sage-tinted background box around the changed letter with bolder weight and sage color — a visual cue that the letter has shifted from the infinitive's stem vowel.

**Callout boxes** come in three flavors, each with a colored left rule and an uppercase mono label:
- `BEACHTE` (ochre rule, "note" callout for rules / things to remember)
- `AUSNAHME` (clay/brick rule, exceptions)
- `BEISPIELE` (cobalt rule, example sentences in italic)

**Pattern subsections** within chapters (e.g. the 4 vowel-change patterns in Strong Verbs) get a CSS counter prefix: "a. a → ä", "b. au → äu", "c. e → i", "d. e → ie".

**The 12 chapters (titles + topics):**

| # | German title | English subtitle | Topics |
|---|---|---|---|
| I | Schwache Verben | Regular (weak) verbs | Present endings, Bindevokal -e- rule, -s/-ß/-z/-tz stem rule. Side-by-side tables for `spielen` and `arbeiten`. |
| II | Starke Verben | Strong verbs | Four vowel-shift patterns with example verbs and chip-highlighted letters: a→ä, au→äu, e→i, e→ie. |
| III | Mischverben | Mixed verbs | Stammformen table for 8 mixed verbs (bringen, denken, wissen, kennen, …). |
| IV | Modalverben | Modal verbs full grid | Full 6×9 table: 6 modals × all persons + Präteritum + Konjunktiv II + Partizip II rows. Doppel-Infinitiv rule. möchte-of-mögen note. |
| V | Trennbar & untrennbar | Separable vs. inseparable prefixes | Two-column lists, the ambiguous prefixes (durch-/über-/um-/unter-), example sentences. |
| VI | Partizip II | Past participle formation | Decision tree by branch: Weak / Strong / Separable / Inseparable / -ieren. ~6 examples per branch. |
| VII | Haben oder Sein | Auxiliary selection | Grouped lists: motion verbs, state-change verbs, always-sein irregulars. |
| VIII | Imperativ | Commands (du/ihr/Sie) | ConjugationTable for spielen. The e→i carry-through rule + the a→ä non-carry rule + Bindevokal cases. |
| IX | Konjunktiv II | Subjunctive II | 17-row table of common real-K2 ich-forms. Rule for using würde+Infinitiv as default. |
| X | Vorgangspassiv | Process passive | Tense ladder for `fragen` (er-form across 6 tenses). "worden vs geworden" callout. |
| XI | Reflexive Verben | Reflexive verbs | Two side-by-side tables (accusative pronouns / dative pronouns with mir/dir highlighted). Lists of common reflexive verbs by case. |
| XII | Verben mit Dativ | Dative verbs | Two `.pattern-heading` subsections: pure-dative verbs and dative+accusative ditransitive verbs. Common-mistake callout. |

**Print stylesheet**: The cheatsheet is intended to be printable. In print mode the nav rail and search are hidden, chapters break to new pages, the paper-and-ink color contrast is preserved.

## 10. Reusable interaction patterns currently in the app

### Quiz card pattern
Used across all 4 quiz types (noun gender, noun translation, adjective sentence, verb translation, verb conjugation):
- Centered card, max-width ~480-560px.
- "Question N of M" small header text.
- The prompt (a big word, a sentence with a blank, a verb, etc.).
- Context chips below the prompt where applicable.
- One or more inputs/buttons for the answer.
- Submit button. After submit: per-answer feedback color (success green / error red) + the correct form. Next button auto-focuses.
- Enter key submits the current answer. After submit, Enter advances.

### Manage table pattern
Used for nouns and adjectives:
- Search input at top.
- Add button + Reset-to-defaults button.
- Data table on desktop, card list on mobile.
- Per-row Edit and Delete-with-confirm actions.
- Edit/Add uses the same modal form with field-presence validation.

### Setup form pattern
Used for all 4 quizzes:
- Filter checkbox groups (groups / levels / types / cases) with per-group counts.
- "All" and "None" buttons where useful.
- Mode radio group (where applicable).
- Number-of-questions radio group with the standard 10/15/20/All/Custom set + custom number input.
- Live count of available items.
- Disabled-state warnings.
- Primary "Start" button at the bottom.

### Storage-unavailable error
If the browser can't open IndexedDB (private/incognito mode, blocked storage), `main.ts` replaces the app root with a static error page:
> "Storage unavailable — This app needs IndexedDB. Your browser blocked it (private/incognito mode?). Open a normal window and try again."

The designer should make this a styled error page in the redesign.

## 11. Responsive breakpoints currently used

- **< 640px** — mobile: single column, hamburger nav, sticky horizontal pill bar nav on the cheatsheet, drop caps go inline.
- **640–1023px** — tablet: single column, hamburger usually replaced with full nav, cheatsheet uses a sticky wrap-pill rail.
- **≥ 1024px** — desktop: full horizontal nav, two-column cheatsheet with sticky left rail.

The Manage tables and Browse tables switch to a card list at the mobile breakpoint; everything else just reflows.

## 12. Accessibility behaviors currently implemented

- All interactive elements are keyboard-reachable; the cheatsheet chapter nav items support Enter/Space activation with focus-visible outlines.
- `prefers-reduced-motion: reduce` disables the page-load entry animation, the vowel-shift pulse, and the theme-toggle rotation.
- The theme toggle has a dynamic `aria-label` ("Switch to dark theme" / "Switch to light theme").
- The cheatsheet's hidden search label uses an `sr-only` class.
- All form inputs are labeled. Error states use color + text (not color alone).

## 13. Data persistence summary

| Data | Storage | Notes |
|---|---|---|
| Nouns (user-editable) | IndexedDB (`nouns` table) | Seeded on first run from `nouns.seed.json` (1407 unique entries after dedupe). Re-seedable from Manage page. |
| Adjectives (user-editable) | IndexedDB (`adjectives` table) | Seeded on first run from `adjectives.seed.json` (~250 entries). Re-seedable from Manage page. |
| Settings | IndexedDB (`settings` table, single row) | Holds `geminiApiKey` and `model`. |
| Verbs | TypeScript module (bundled) | 378 entries, not user-editable. |
| Theme preference | `localStorage` (`theme`: `light` \| `dark` \| absent) | Absent = follow system. |
| Quiz setup memory | `localStorage` per quiz: `nounQuizGroups`, `adjectiveQuizGroups`, `verbConjQuiz` | Recalls last-used filters / tense picks. |

## 14. What a redesign needs to preserve (functional contract)

- The 5 nav destinations (Home / Nouns / Adjectives / Verbs / Settings) and their landing pages.
- All 4 quiz flows: setup → runner (one question at a time) → result.
- All filter primitives currently exposed (groups, levels, types, cases, mode toggles).
- The 12-chapter cheatsheet content (it can look completely different but the chapter list, chapter titles in both languages, and the categories of callouts must remain).
- The Conjugation quiz tense picker with CEFR badges and passive-tense conditional disabling.
- The dark/light theme toggle in the header and the persistence + system-follow behavior.
- The Manage tables with Add / Edit / Delete / Reset-to-defaults / search.
- The "no API key" warning on the Adjectives quiz setup.
- The Storage-unavailable error fallback.
- Keyboard usability of all quizzes (Enter submits, Enter advances, focus moves to next input).
- All localStorage keys (theme + quiz setup memory) should keep working through a redesign; not load-bearing for the look, but loading a saved filter set after a redesign should still feel correct.

## 15. What a redesign is free to change

- Any visual treatment: typography, color palette, spacing, motion, layout density, shapes, decorations.
- The component library (naive-ui is current but not sacred — the underlying primitives are buttons, inputs, selects, checkboxes, radio groups, tables, modals, drawers, alerts, tags, cards, lists, popconfirms; any UI kit covers these).
- The navigation chrome (header / drawer / breadcrumbs / tabs — anything that gets a user to the same 5 destinations is fine).
- The way the cheatsheet is presented (scrolling page is current; tabs / accordions / multi-page / spread layouts are all on the table as long as the 12 chapters are reachable).
- How quiz questions are arranged on screen (currently centered cards; could be split-screen, side-rail context, etc.).
- The result screen format (currently a list recap; could be a chart, a heatmap, etc.).
