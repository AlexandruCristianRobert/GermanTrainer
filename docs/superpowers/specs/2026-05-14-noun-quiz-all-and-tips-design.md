# Noun Quiz: "All" preset, Gender Tips Panel, Keyboard Shortcuts

Date: 2026-05-14
Status: Design approved

## Goal

Three small additions to the Noun quiz flow:

1. (Setup) Let the user quiz on *every* noun in the currently selected groups via a new "All" preset in the question-count radio group.
2. (Setup) Add a collapsible "Gender tips" panel on the setup page with static, curated patterns that help the user guess the gender of a German noun.
3. (Gender quiz) Add keyboard shortcuts so a full session can be played without the mouse: `1` → der, `2` → die, `3` → das, `Enter` advances to the next question.

Items 1 and 2 are scoped to `QuizSetup.vue`. Item 3 is scoped to `GenderQuiz.vue`. The translation quiz, data model, and persistence layer are unchanged.

## 1. "All" preset

### UI
A fourth radio button labeled **All** is added to the existing preset radio group, alongside `10`, `15`, `20`, and `Custom`.

```
Number of questions
( ) 10  ( ) 15  ( ) 20  ( ) Custom  ( ) All
```

### Behaviour
- `preset` ref widens from `10 | 15 | 20 | 'custom'` to `10 | 15 | 20 | 'custom' | 'all'`.
- `requested` computed:
  - `preset === 'custom'` → `customCount.value`
  - `preset === 'all'` → `totalAvailable.value`
  - otherwise → numeric preset
- `effective` stays as `Math.min(requested, totalAvailable)` — for `'all'` this is just `totalAvailable`.
- The custom `NInputNumber` stays visible only when `preset === 'custom'`.
- The "Only N nouns available" info alert continues to be driven by `requested > totalAvailable`. With `'all'`, requested equals totalAvailable, so the alert does not appear (correct).
- `start()` already passes `effective.value` via the query string — no runner-side change.

### Edge cases
- If `totalAvailable === 0` (no groups selected, or selected groups empty), the existing "No nouns in the selected groups" warning and the disabled Start button cover the case. The "All" radio is selectable but the Start button remains disabled.

## 2. Gender tips collapsible panel

### Placement
Inside the same `NSpace` column, immediately below the `<h2>Noun quiz setup</h2>` title and above the Groups section. Default state: collapsed, so the layout above the start button is preserved for returning users.

### Component
Naive UI `NCollapse` with `accordion` mode disabled (users may open multiple sub-sections). Each topic below is its own `NCollapseItem`.

### Sections (all static content, baked into the template)

**A. Endings → likely gender**

| Likely gender | Endings |
|---|---|
| die | -ung, -heit, -keit, -schaft, -tät, -ion, -ik, -ie, -ei, -enz, -anz |
| der | -er (agent noun), -ling, -ismus, -ant, -ent, -or, -ist |
| das | -chen, -lein, -ment, -um, -tum, -nis (often), -sel |

**B. Semantic categories**

- **der**: days, months, seasons, points of the compass, weather (Regen, Schnee, Wind), male persons/professions, alcoholic drinks (except das Bier), car brands.
- **die**: female persons/professions, most trees, most flowers, most fruits, cardinal numbers used as nouns (die Eins), motorcycles, ships.
- **das**: metals & chemical elements, most countries & cities, infinitives used as nouns (das Essen), diminutives, colours used as nouns (das Rot), young living things (das Baby, das Kind).

**C. Compound noun rule**

Gender of a compound noun is the gender of its **last** component:
- das Haus + die Tür → **die** Haustür
- die Sonne + der Schein → **der** Sonnenschein

**D. Common traps & exceptions**

- **das Mädchen**, **das Fräulein** — diminutive `-chen`/`-lein` overrides natural gender.
- **der Junge** — masculine despite ending in `-e`.
- **die Person** — feminine regardless of the person's sex.
- **das Baby**, **das Kind** — neuter regardless of sex.
- **die Zeit, die Arbeit, die Antwort** — common `-t` feminines worth memorising.

**E. Plural hint (quick reference)**

- Most **die** feminines form plural with `-(e)n` (die Frau → die Frauen).
- Many **der** masculines and **das** neuters take `-e` (der Tisch → die Tische, das Jahr → die Jahre).
- Many neuters take `-er` with umlaut (das Haus → die Häuser).
- `-chen` / `-lein` diminutives are unchanged in the plural.
- Foreign / loanwords often take `-s` (das Auto → die Autos).

### Content source
Hard-coded in the component template. No store, no editing UI, no localization, no fetching. Adding/changing tips requires editing the Vue file.

## 3. Keyboard shortcuts in the gender quiz

### Bindings
While `GenderQuiz.vue` is mounted:

| Key | Action |
|---|---|
| `1` | Pick **der** (same as clicking the der button) |
| `2` | Pick **die** |
| `3` | Pick **das** |
| `Enter` | After answering, advance to the next question |

Already in place: after `pick()` submits, `nextButtonRef.$el.focus()` runs in `nextTick`, so the browser's default Enter-activates-focused-button behaviour already covers the `Enter → Next` requirement. The spec keeps this rather than adding a separate listener — verify it during implementation; if focus is lost for any reason, add an explicit Enter handler.

### Implementation
- Add a `window` `keydown` listener registered in `onMounted` and removed in `onBeforeUnmount`.
- Ignore the event when:
  - `event.repeat` is true (avoid auto-repeat firing pick repeatedly — single-fire only),
  - `event.ctrlKey`, `event.metaKey`, `event.altKey` are set (don't hijack browser shortcuts),
  - The component is already in the submitted state (1/2/3 are no-ops once an answer is locked, matching the disabled buttons).
- Map `event.key` `'1' | '2' | '3'` to `'der' | 'die' | 'das'` and call `pick(g)`. Use `event.preventDefault()` only on a successful map.
- No listener for Enter is added; the focused Next button handles it natively.

### Scope note
Only the **gender** quiz gets shortcuts. The translation quiz uses free-text input, where number keys are literal input.

## Out of scope

- `QuizRunner.vue` and `TranslationQuiz.vue` changes.
- Keyboard shortcuts in the translation quiz or the adjective quizzes.
- Per-noun gender hints shown during a quiz.
- AI-generated or dynamic tips.
- Adjective quiz parity (only nouns for now).
- Editable / user-authored tips.

## Files touched

- `src/modules/nouns/QuizSetup.vue` — preset type widening, new radio, `requested` update, new collapse block in template.
- `src/modules/nouns/GenderQuiz.vue` — global `keydown` listener mapping `1/2/3` to `pick()`, registered in `onMounted` and torn down in `onBeforeUnmount`.

No new files, no new dependencies (`NCollapse` / `NCollapseItem` are part of naive-ui already in use).
