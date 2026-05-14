# Noun Quiz: "All" preset + Gender Tips Panel

Date: 2026-05-14
Status: Design approved

## Goal

Two small additions to the Noun quiz setup page (`src/modules/nouns/QuizSetup.vue`):

1. Let the user quiz on *every* noun in the currently selected groups via a new "All" preset in the question-count radio group.
2. Add a collapsible "Gender tips" panel on the setup page with static, curated patterns that help the user guess the gender of a German noun.

Both changes are scoped to the setup screen. The quiz runner, gender quiz, translation quiz, data model, and persistence layer are unchanged.

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

## Out of scope

- Quiz runner changes (`QuizRunner.vue`, `GenderQuiz.vue`, `TranslationQuiz.vue`).
- Per-noun gender hints shown during a quiz.
- AI-generated or dynamic tips.
- Adjective quiz parity (only nouns for now).
- Editable / user-authored tips.

## Files touched

- `src/modules/nouns/QuizSetup.vue` — preset type widening, new radio, `requested` update, new collapse block in template.

No new files, no new dependencies (`NCollapse` / `NCollapseItem` are part of naive-ui already in use).
