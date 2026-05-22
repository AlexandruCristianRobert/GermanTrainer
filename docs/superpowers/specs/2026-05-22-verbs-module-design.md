# Verbs Module — Design Spec

**Date:** 2026-05-22
**Status:** Approved (sections 1–9 confirmed in brainstorm)
**Module:** `src/modules/verbs/`

## Goal

Add a Verbs practice module to German Trainer with two quiz types:

1. **Translation quiz** — show a German infinitive, user types the English meaning.
2. **Conjugation quiz** — show an infinitive + a tense, user fills in all forms.

Plus a read-only verb list and a cheatsheet of conjugation rules.

## Non-goals

- No persistence layer for verbs. The dataset is a TypeScript module loaded in memory; no Dexie table.
- No user-supplied verbs (no Manage/Edit UI).
- No Zustandspassiv (state passive). Only Vorgangspassiv.
- No translation direction reversal (English → German). German → English only.

## Module structure

```
src/
  data/
    verbs.ts                   # in-memory dataset + Verb type + enums
  composables/
    conjugate.ts               # pure conjugation engine
    useVerbs.ts                # queries (filter by level/type/case, random sample)
    useVerbQuiz.ts             # shared quiz state machine
  modules/verbs/
    VerbsHome.vue              # landing: List | Translation quiz | Conjugation quiz | Cheatsheet
    ListVerbs.vue              # searchable/filterable read-only table
    TranslationQuizSetup.vue
    TranslationQuizRunner.vue
    ConjugationQuizSetup.vue
    ConjugationQuizRunner.vue
    QuizResult.vue
    CheatSheet.vue
tests/
  conjugate.spec.ts            # engine tests
  useVerbQuiz.spec.ts          # acceptance-rule tests
```

Routes (added to `src/router.ts`):

| Path | Component |
|---|---|
| `/verbs` | `VerbsHome.vue` |
| `/verbs/list` | `ListVerbs.vue` |
| `/verbs/translation` | `TranslationQuizSetup.vue` |
| `/verbs/translation/run` | `TranslationQuizRunner.vue` |
| `/verbs/conjugation` | `ConjugationQuizSetup.vue` |
| `/verbs/conjugation/run` | `ConjugationQuizRunner.vue` |
| `/verbs/cheatsheet` | `CheatSheet.vue` |

Nav: add "Verbs" to `NavShell.vue` (between Adjectives and Settings) and a card on `Home.vue`.

## Verb data model

```ts
export type VerbLevel = 'A1' | 'A2'
export type VerbType  = 'regular' | 'irregular' | 'mixed' | 'separable' | 'modal'
export type VerbCase  = 'none' | 'accusative' | 'dative' | 'dative+accusative' | 'genitive' | 'reflexive' | 'varies'
export type Auxiliary = 'haben' | 'sein'

export type SixForms = [string, string, string, string, string, string] // ich, du, er, wir, ihr, sie

export interface Verb {
  german: string                 // infinitive, e.g. "aufstehen"
  english: string                // no leading "to "; multiple meanings " / "-separated
  level: VerbLevel
  type: VerbType
  case: VerbCase
  auxiliary: Auxiliary
  separablePrefix?: string       // "auf" for aufstehen — present-tense engine splits the prefix
  praesens: SixForms
  praeteritumStem: string        // e.g. "ging" (irregular), "spielte" (regular — already includes -te)
  praeteritum?: SixForms         // override if endings are irregular (rare; e.g. sein)
  partizip2: string              // "gegangen", "gespielt", "aufgestanden"
  konjunktiv2?: SixForms         // explicit forms when proper K2 is in active use (sein/haben/modals/common strong)
  konjunktiv1?: SixForms         // override for sein (sei/seist/...) — other verbs derived by engine
  imperativDu?: string           // override for irregular du-imperativ ("iss", "nimm", "sieh", "lies")
  notes?: string                 // free-text shown in ListVerbs, e.g. "+ dative person"
}
```

**Dataset scope:** ~150 verbs covering A1 + A2. Curated from common A1/A2 vocabulary lists. Each entry is hand-verified.

## Tense matrix

The engine supports 15 tenses. Each tense has a CEFR badge; the Conjugation quiz setup groups them by level.

### Active (always available)

| Tense | Level | Persons | Source |
|---|---|---|---|
| Präsens | A1 | 6 | `verb.praesens` |
| Imperativ | A1 | 3 (du / ihr / Sie) | engine from praesens + optional `imperativDu` |
| Perfekt | A1 | 6 | `aux.praesens[p] + " " + partizip2` |
| Präteritum | A2 | 6 | `verb.praeteritum` if present, else `praeteritumStem` + endings |
| Plusquamperfekt | A2 | 6 | `aux.praeteritum[p] + " " + partizip2` |
| Futur I | A2 | 6 | `werden.praesens[p] + " " + infinitive` |
| Konjunktiv II | B1 | 6 | `verb.konjunktiv2` if present, else `würde[p] + " " + infinitive` |
| Konjunktiv I | B2 | 6 | infinitive stem + K1 endings; `sein` overrides via `konjunktiv1` |
| Futur II | B2 | 6 | `werden.praesens[p] + " " + partizip2 + " " + auxiliary` |

### Passive — Vorgangspassiv (enabled only when `case ∈ {accusative, dative+accusative}`)

| Tense | Level | Construction |
|---|---|---|
| Passiv Präsens | B1 | `werden.praesens[p] + " " + partizip2` |
| Passiv Präteritum | B1 | `werden.praeteritum[p] + " " + partizip2` |
| Passiv Perfekt | B2 | `sein.praesens[p] + " " + partizip2 + " worden"` |
| Passiv Plusquamperfekt | B2 | `sein.praeteritum[p] + " " + partizip2 + " worden"` |
| Passiv Futur I | C1 | `werden.praesens[p] + " " + partizip2 + " werden"` |
| Passiv Konjunktiv II | C1 | `würde[p] + " " + partizip2 + " werden"` |

## Conjugation engine — `src/composables/conjugate.ts`

Pure function:

```ts
export type ConjugationRow = { person: string; expected: string }

export function conjugate(verb: Verb, tense: VerbTense): ConjugationRow[]
```

**Output convention:** strings do NOT include the personal pronoun. The pronoun is the UI label on each input row; the user types only the verb part (`habe gespielt`, not `ich habe gespielt`).

**Separable verbs:**
- Präsens & Präteritum: prefix splits to the end → `stehe auf`, `stand auf`.
- Imperativ du: prefix at end → `steh auf`.
- Perfekt/Plusquamperfekt: `partizip2` already contains the prefix joined (`aufgestanden`).
- Futur I / Konjunktiv II würde-form: infinitive is joined (`aufstehen`).

**Auxiliary tables (built into the engine):**
- `haben.praesens` = `['habe','hast','hat','haben','habt','haben']`
- `haben.praeteritum` = `['hatte','hattest','hatte','hatten','hattet','hatten']`
- `sein.praesens` = `['bin','bist','ist','sind','seid','sind']`
- `sein.praeteritum` = `['war','warst','war','waren','wart','waren']`
- `werden.praesens` = `['werde','wirst','wird','werden','werdet','werden']`
- `werden.praeteritum` = `['wurde','wurdest','wurde','wurden','wurdet','wurden']`
- `wuerde` (K2 of werden) = `['würde','würdest','würde','würden','würdet','würden']`

**Imperativ derivation:**
- du-form: `imperativDu` if set, else strip a trailing `-st` from `praesens.du` (e.g. `gehst → geh`, `arbeitest → arbeite`); for separable, move prefix to end.
- ihr-form: same as `praesens.ihr`.
- Sie-form: `praesens.sie + " Sie"`.

**Konjunktiv I endings:** `-e, -est, -e, -en, -et, -en` appended to infinitive stem (infinitive minus `-en`). Only `sein` is irregular here.

## Translation quiz

**Setup:** count (10 / 15 / 20 / All / Custom N), level filter (A1/A2/both, default both), type filter (multi-select, default all), case filter (multi-select, default all).

**Runner:** shows infinitive + chip row (`[A1] [separable] [+ dative]`). User types English; submit on Enter.

**Acceptance rule:** the stored `english` field is a `/`-separated list of accepted answers. The leading "to " on the user input is **stripped before comparison** (so both `get up` and `to get up` are accepted, but neither is required). Each accepted form is also normalized identically before comparison.

Normalization steps applied to both user input and each accepted form:
1. Trim leading/trailing whitespace.
2. Collapse runs of internal whitespace to a single space.
3. Lowercase.
4. If the result starts with `to `, remove that prefix.
5. Compare for exact equality.

A match against **any** accepted form counts as correct.

**Feedback:** ✅/❌ with the full accepted list on miss; Enter advances.

## Conjugation quiz

**Setup:**
- Verb filters: level, type (multi-select), case (multi-select). Defaults: both levels, all types, all cases.
- Tense picker: grouped sections labeled `A1`, `A2`, `B1`, `B2`, `C1`. Each tense is a labeled checkbox with a CEFR badge. Passive tenses appear in their respective level groups and are greyed-out & unselectable when the current verb filters cannot yield at least one accusative-taking verb.
- Count: 10 / 15 / 20 / All / Custom (counts **verbs**; total questions = verbs × tenses, shown live below the picker).
- Persisted to `localStorage` under key `verbConjQuiz` (selected tenses + filters + count preset).
- "Open cheatsheet" link next to the picker.

**Runner:**
- One question = one (verb, tense) pair, ordered randomly across the verbs × tenses cross-product.
- Card: large infinitive, tense name + CEFR badge, chips for verb type / case.
- Input rows:
  - Indicative & Konjunktiv tenses: 6 rows labeled `ich`, `du`, `er/sie/es`, `wir`, `ihr`, `sie/Sie`.
  - Imperativ: 3 rows labeled `du`, `ihr`, `Sie`.
- "Skip" button (0 of N for that question). "Show cheatsheet" link.
- Submit checks all rows at once. Each row gets ✅ or ❌ + the correct form.

**Scoring:** score is `sum(correct rows) / sum(total rows)` across the quiz. Per-question we also report "fully correct" / "partial" / "wrong" in the result summary.

**Answer normalization (per row):**
1. Trim, collapse internal whitespace.
2. Lowercase.
3. If the user typed the pronoun as a prefix (`ich habe gespielt` against expected `habe gespielt`), strip the leading pronoun.
4. Compare for exact equality with the expected form (also normalized).
5. `ä/ö/ü/ß` must match exactly — no ae/oe/ue/ss equivalence.

## Cheatsheet — `CheatSheet.vue`

Single page, `n-collapse` sections, each ≤ a screen. Sections:

1. **Regular (schwache) Verben** — endings table, Bindevokal `-e-` for `-d/-t/-chn/-ffn` stems, `-s/-ß/-z/-tz` du-stem rule. Examples: `spielen`, `arbeiten`, `tanzen`.
2. **Strong (starke) Verben** — vowel changes in du/er: `a→ä` (fahren), `e→i` (geben), `e→ie` (sehen), `au→äu` (laufen). Top ~15 list.
3. **Mixed (gemischte) Verben** — irregular stem + weak endings: bringen→brachte, denken→dachte, wissen→wusste, kennen→kannte.
4. **Modalverben** — full conjugation table for all 6 modals incl. K2.
5. **Trennbar vs untrennbar** — splitting prefixes (ab-, an-, auf-, aus-, ein-, mit-, vor-, zu-) vs non-splitting (be-, emp-, ent-, er-, ge-, ver-, zer-). Effect on Partizip II.
6. **Partizip II** — formation rules for weak/strong/separable/inseparable.
7. **haben vs sein** — sein for change-of-place/state + bleiben/sein/werden/passieren; haben for the rest.
8. **Imperativ** — du/ihr/Sie rules; `e→i/ie` carries into du (`gib!`, `nimm!`, `sieh!`, `lies!`); `a→ä` does NOT (`fahr!`).
9. **Konjunktiv II** — würde-form everywhere; proper K2 for sein/haben/modals/common strong.
10. **Passiv** — werden + Partizip II; Perfekt passive uses `... worden`, not `geworden`.
11. **Reflexive Verben** — accusative vs dative reflexive pronouns; common examples.
12. **Verben mit Dativ** — short list: helfen, danken, gefallen, antworten, gehören, passieren, schmecken, glauben (+pers), gratulieren, folgen.

## ListVerbs

Read-only table using `naive-ui`'s `n-data-table` directly (NOT `EntryList.vue`, since that component is built around edit/delete row actions which don't apply here). Columns: German, English, Level, Type, Case, Aux. Search box filters across German + English. Filter chips (n-checkbox-group) above the table for level / type / case (mirrors the nouns QuizSetup filter pattern). Mobile fallback: same vertical-card pattern as `EntryList`'s mobile mode, inlined here, but without the dropdown menu.

## Tests

Vitest, pure-function focus. Following existing project test style.

- `tests/conjugate.spec.ts`
  - Regular verb (`spielen`) across all 15 tenses incl. passive.
  - Strong verb (`gehen`) with `sein` aux: Perfekt = `bin gegangen`, Plusquamperfekt = `war gegangen`, Futur II = `werde gegangen sein`.
  - Modal (`können`) — explicit K2 forms used, not würde fallback.
  - Separable (`aufstehen`) — Präsens du = `stehst auf`; Imperativ du = `steh auf`; Perfekt ich = `bin aufgestanden`; Futur I ich = `werde aufstehen`.
  - Reflexive (`sich freuen`) — engine returns verb forms without the reflexive pronoun (UI handles "sich" labeling).
  - Passive composition (`fragen` → Passiv Präsens er = `wird gefragt`; Passiv Perfekt er = `ist gefragt worden`).
  - Imperativ edge cases: `essen` → `iss!`; `nehmen` → `nimm!`; `sehen` → `sieh!`; `arbeiten` → `arbeite!`.

- `tests/useVerbQuiz.spec.ts`
  - Translation: `to get up` accepted for stored `get up / stand up`.
  - Translation: `get up` accepted (no "to" required).
  - Translation: `getting up` rejected.
  - Conjugation: leading pronoun tolerated (`ich habe gespielt` accepted against `habe gespielt`).
  - Conjugation: `lauft` rejected when expected `läuft` (umlaut strictness).
  - Conjugation: whitespace tolerant (`  habe   gespielt  ` accepted).

Component tests are deferred — the existing Nouns/Adjectives modules have none, and consistency wins here.

## Open implementation notes

- Engine output **excludes pronouns**; UI renders pronouns as static labels. The user is allowed to *type* the pronoun and the runner will strip it before checking.
- "Verbs filter could yield 0 verbs after filtering" → Setup screen disables "Start" with an inline alert (mirrors the noun QuizSetup pattern).
- localStorage key for conjugation setup: `verbConjQuiz`. No key for translation setup (count preset only — fine to default each session).
- `useVerbs` exposes `all()`, `filter({level?, types?, cases?})`, `sample(n, filter?)`. No async — it's all in memory.
- `useVerbQuiz` is parameterized by mode (`'translation' | 'conjugation'`) similar to `useNounQuiz`.
