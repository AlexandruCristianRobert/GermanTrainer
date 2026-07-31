# Design import: Direction Words + Da-Compounds editorial revamp

**Date:** 2026-07-31
**Source:** claude.ai Design project `ff880a7a-b49d-4411-8435-65c0519723c4` ("German Trainer")
**Target version:** 1.15.00

## Why

The design project's `styles.css` is **byte-identical** to `docs/design_handoff_german_trainer/styles.css`, already ported into `src/styles/tokens.css` (147 of 195 selectors verbatim, zero token drift). Nothing to import there.

The delta is everything the design gained *since* that handoff — and it covers exactly the two modules the handoff never reached:

| New in the design project | State in repo |
|---|---|
| `styles-modules.css` (358 lines / 27 KB) | absent entirely |
| `direction-words.jsx` — hub, perspective study, runner | absent |
| `da-compounds.jsx` — hub, formation widget, ledger, runner | absent |
| `drill-bits.jsx` — `Mastery`, `MasteryDots`, `LevelChip`, `SceneDiagram` | only `SceneDiagram.vue` exists |
| `module-cheatsheets.jsx` — `.plate` / `.mini-table` primitives | absent |
| `dw-data.js`, `dac-data.js` | thinner mirrors of the real `src/data/*.ts` — **not** imported |

Both modules are fully built in Vue (Direction Words: 21 files, 9 drills; Da-Compounds: 40 files, 20 drills) but wear home-grown chrome: flat card-grid landings, a copy-pasted `.sub-*` runner vocabulary with ten prefix clones, and identical scoped CSS duplicated across 28 setups and 28 runners.

## Scope

Confirmed with the user:

1. **In scope** — the new global module stylesheet layer; both hub pages rebuilt on the editorial layout; both cheatsheets rebuilt on `.plate`/`.mini-table`; **all 28 drill runners** migrated from `.sub-*`/prefix-clone vocabulary to the design's shared drill vocabulary; the shared drill primitives as Vue components; mastery meters driven by real data.
2. **Out of scope** — the base design system (already ported); any module other than these two; the `tweaks-panel.jsx` design harness; the design's `data-screen-label` screenshot hooks; the design's own seed data.

## Architecture

### 1. New global layer: `src/styles/modules.css`

Ported from the design's `styles-modules.css`, imported in `src/main.ts` immediately after `tokens.css`. It owns the shared drill vocabulary plus the two module-specific families (`.dw-*`, `.dac-*`).

**Deliberate divergences from the source:**

- **Drop the `@media (max-width: 980px)` nav rule.** The design's sheet sets `.nav-links{display:none}` / `.nav-burger{display:inline-flex}` at 980px, which in the prototype silently overrode `styles.css`'s 720px because it loaded second. `NavShell.vue` owns the app's responsive nav at 720px; importing that rule would move the burger breakpoint app-wide as a side effect.
- **Keep `.ok` / `.err`** as the gap/input verdict modifiers, not the design's `.no`. The app already establishes `.ok`/`.err` in `.sub-type-input` across five runners, and `.err` is the name the migrated templates carry.
- **Add the missing `--warn` token** (light `#B8852F`, dark `#E2B158`) to `tokens.css`. It is referenced 16 times across the app and has never been declared; every use currently renders its hardcoded `#b58800` fallback. Free fix while in the stylesheet.
- **Do not port** `.choice.trap-tag::after { content: 'Falle' }`'s hardcoded string as-is — keep the visual stamp, but drive the label from the template so it is not German copy buried in CSS.

### 2. Drill catalogue: `src/data/drillCatalogue.ts`

Both hubs currently hold their drill list as an inline `groups: Group[]` literal — the app's **only** catalogue of these 29 drills; nothing else in `src/` enumerates them. Extract to a module:

```ts
export interface DrillCard {
  code: string            // 'T1' … 'T20' | 'A'
  route: string           // vue-router name
  query?: Record<string,string>
  title: string; de: string; desc: string
  level: DrillLevel       // 'A2' | 'B1' | 'B2' | 'C1' | 'Ref'   ← new, from the design
  ai?: true               // ← new, from the design; drives the ochre LevelChip
}
export interface DrillFamily { id: string; numeral: string; heading: string; de: string; blurb?: string; cards: DrillCard[] }
export const DW_FAMILIES: DrillFamily[]    // 7 families → 10 cards
export const DAC_PHASES: DrillFamily[]     // 9 phases → 21 cards
```

Descriptions come from the **Vue** literals, which are substantially richer than the design's. `level`, `ai`, `numeral` and the family `blurb` come from the design. `id` is new and stable, used for anchors (`#dwfam-{id}`) and scroll-spy.

The design's `DAC_PHASES` gives family blurbs the Vue version lacks; port them.

### 3. Mastery: `src/composables/useDrillMastery.ts`

The hubs are organised around a 0–5 band and an attempt count per drill. Derivable today from `gt:quizHistory` with no schema change: every one of the 29 drills records a Run with a distinct `type` string, and T14/T15 — the only pair sharing a type (`dac-sentence`) — are separated by `meta.dacSentenceDirection`.

Pure module, no Vue import, mirroring the established `useDwSentenceStats.ts` convention (module-level key map, `Map` accumulation, pure scoring function, deterministic tie-break):

```ts
export interface DrillMastery {
  key: string; runs: number; total: number; correct: number
  accuracy: number; band: 0|1|2|3|4|5; lastAt: number | null
}
export function drillKey(entry: QuizHistoryEntry): string | null
export function computeDrillMastery(entries: QuizHistoryEntry[]): Record<string, DrillMastery>
```

**Band function** gates on `total` (questions answered), not `runs` — `count` is user-chosen per run, and AI runs can fall short of the requested count:

| Band | Condition |
|---|---|
| 0 | `total === 0` |
| 1 | `total > 0` (attempted at all) |
| 2 | `total >= 10 && accuracy >= 0.50` |
| 3 | `total >= 20 && accuracy >= 0.65` |
| 4 | `total >= 40 && accuracy >= 0.80` |
| 5 | `total >= 60 && accuracy >= 0.90` |

Highest satisfied band wins.

**Lifetime rollup — `gt:drillTotals`.** `HISTORY_LIMIT` caps `gt:quizHistory` at 100 runs *app-wide across all 54 quiz types*. A band derived from that window decays to 0 when the learner practises other modules, with no regression — acceptable for weak points (ADR-0002 says so explicitly) but wrong for a meter that reads as accumulated progress. So `saveQuizRun` additionally bumps a per-drill rollup:

```ts
// localStorage['gt:drillTotals'] → Record<drillKey, { runs, total, correct, lastAt }>
```

Seeded once from the existing history on first read, so current users do not start at zero. No Dexie change (Dexie holds no run data; `tests/db/index.test.ts`'s exact six-table assertion is untouched), no new `QuizHistoryType`, no migration — an absent key reads as zero. Add the key to `USER_DATA_KEYS` so it ships in backup/restore. Because ADR-0002 rejected a lifetime store for weak points, this warrants a short ADR scoped to mastery.

### 4. Shared drill primitives: `src/components/drill/`

| Component | Props | Renders |
|---|---|---|
| `MasteryBars.vue` | `band: number \| null`, `attempts`, `showNum` | five rising strokes (`.mast`); `null` → "reference" |
| `MasteryDots.vue` | `band: number \| null` | five dots (`.mdot`); `null` → "ref" |
| `LevelChip.vue` | `level`, `ai?` | `.lvl-chip`, ochre `.is-ai` when AI-graded |
| `ProgressDial.vue` | `pct` | the 56px SVG donut (`.dw-dial`) |

`SceneDiagram.vue` stays where it is — the Vue version is the original the design's `drill-bits.jsx` was back-ported *from*, and is equivalent.

### 5. Runner migration — the shared drill vocabulary

One canonical vocabulary in `modules.css` replaces `.sub-*` and its ten prefix clones (`cp-`, `hh-`, `qw-`, `im-`, `fr-`, `case-`, `dlg-`, `pp-`, `asm-`, `match-`):

| Old | New |
|---|---|
| `.sub-stage`, `.cp-stage`, `.hh-stage`, … | `.drill-stage` |
| `.sub-prompt`, `.cp-prompt`, … | `.drill-prompt` |
| `.sub-stem`, `.sub-sentence`, `.cp-sentence`, … | `.drill-sentence` |
| `.sub-gap`, `.gap` | `.drill-gap` (+ `.ok` / `.err`) |
| `.sub-picker-grid`, `.cp-picker-grid`, … | `.choice-row` (+ `.quad`) |
| `.sub-choice`, `.cp-choice`, … | `.choice` (+ `.mono-face`, `.trap-tag`) |
| `.sub-choice-key` | `.c-key` |
| `.sub-choice-label` | `.c-label` |
| `.sub-feedback`, `.sub-feedback-mark`, `.sub-feedback-ok/-bad` | `.drill-feedback`, `.feedback-line` (+ `.correct` / `.wrong`) |
| `.sub-reveal` and its 4 variants | `.reveal` (+ `.is-wrong`), `.reveal-l`, `.reveal-t`, `.reveal-b` |
| `.sub-type-row`, `.cp-type-row` | `.type-row` |
| `.sub-type-input` | `.type-input` (+ `.ok` / `.err`) |
| `.sub-instruction` | `.drill-instruction` |
| `.sub-result-row` and its 4 variants | `.drill-result-row` |
| `style="margin-top:16px"` on 23 advance buttons | `.drill-advance` |

**Variant reconciliation.** The old vocabulary carries genuine drift the port must resolve, not average away:

- `.sub-reveal` has 4 variants; the split is meaningful — da-compounds reveals are tinted per preposition (`--prep-accent` / `--prep-wash`), direction-words reveals are `--accent`. Resolve as `.reveal` (accent, the design's default) plus `.reveal.is-prep` for the preposition-tinted variant. **`--prep-accent`/`--prep-wash` are inline-injected by `prepColorStyle()` on 25 sites and only resolve on DOM descendants of those bindings — the migration must not move `.reveal` or `.drill-result-row` out from under them.** This is the single highest-risk mechanical detail; it is guarded by `tests/data/prepColors.test.ts` and the "Preposition color" memory anchor documented in `CONTEXT.md`.
- `.sub-choice` mono vs body face → `.choice` (body) + `.choice.mono-face` (mono), matching the design.
- `.sub-picker-grid` 1-col vs 2-col → `.choice-row` (flex) + `.choice-row.quad` (2×2 grid), matching the design; the two long-option Register drills take the 1-column form.
- `.drill-result-row` needs an explicit `display: grid`. `.sub-result-row` never declared it, inheriting from global `.result-list .result-row` at equal specificity resolved only by injection order.

**Inline styles that must be rewritten, not restyled.** Four AI-graded runners write verdict colours inline:

```
:style="phase === 'graded' ? { color: …'var(--success)'/'var(--danger)', borderBottomColor: … } : undefined"
```
at `direction-words/{Answer,Sentence}Runner.vue` and `da-compounds/{Answer,Sentence}Runner.vue`. These beat any stylesheet rule. Replace with `:class="{ ok, err }"`, the pattern `.type-input.ok/.err` already uses.

### 6. Setup screens

The 28 setups are already byte-uniform: 11 distinct selectors, one variant each. Delete the duplicated scoped blocks and let `modules.css` own `.setup-page`, `.field-row`, `.count-row`, `.count-avail`, `.field-actions`, `.setup-actions`, `.grading-hint`, `.custom-count`, `.chip-count`. Two pre-existing bugs get fixed for free: `dw/IdiomSetup.vue` and `dw/LexicalSetup.vue` render `.count-avail` without declaring it, so its `margin-left:auto` never applies.

### 7. The two hubs

**`DirectionWordsHome.vue`** → `.dw-layout` (302px sticky rail + panels):

- Rail: `DwPerspectiveStudy.vue` (new — pick one of six elements `-ein -aus -auf -unter -über -ab`, flip your standpoint, watch the compound and its gloss recompute live, with a `SceneDiagram` above); `ProgressDial` over module mastery; family nav with `MasteryDots` per family; footer stats.
- Panels: one `section.dw-panel` per family, each a list of `button.dw-row` carrying code, title + German, description, `LevelChip`, `MasteryBars`. The `pairs` family additionally renders the `.dw-axis` her/element/hin/R-form table from `DW_PAIRS`.
- Scroll-spy syncs the rail to the visible panel.

**`DaCompoundsHome.vue`** → `.dac-masthead` + `.dac-body`:

- Masthead: `DacFormation.vue` (new — the `da + [r] + prep = compound` formula recomputing across 19 real prepositions plus the four traps that form none, with the wo-twin and a three-branch rule line); mastery summary with the three weakest drills as bars; "sort weakest first".
- Tools: live search over title/German/description/code; Lehrgang ↔ Schwächste sort toggle; result count.
- Ledger: `.dac-phase` groups of `button.dac-lrow` rows with `MasteryDots`; marginalia rail with the things-vs-people key, the no-compound list, and the Korrelat ●◐○ key.

Both keep `router.push` navigation (the app's convention; route names are deliberately hyphen-free because active state derives from `route.name.split('-')[0]`). **T14/T15 must keep their `?direction=` query** — they are two cards on one route. Their `v-for` key changes from `c.route` to `c.code`, fixing a live duplicate-key bug.

`DwWeakPoints` / `DacWeakPoints` move into the rail/marginalia rather than being dropped — mastery answers "how far have I got", weak points answer "what should I fix".

### 8. The two cheatsheets

Rebuild on the design's `.plate` (numeral + title + German header over a body) and `.mini-table` (mono uppercase headers, `.t-de` / `.t-mono` / `.t-it` / `.t-ex` cell modifiers), replacing the bespoke `.dw-table` / `.dac-table`. Both remain fully data-driven from `src/data/directionWords.ts` and `src/data/daCompounds.ts`; no content changes. **Section IDs (`#dw-rule`, `#dw-pairs`, `#dw-questions`, `#dw-register`, `#dw-lexical`, `#dw-idioms`, `#dac-korrelat`, `#dac-none`, `#dac-person`) are preserved** — they are anchor targets and test hooks.

Port the design's two additions: `.persp-pairs` (the her/hin two-column key) and `.k-cols` (the ●◐○ Korrelat columns), plus `.dac-nolist` chips.

## Testing

The suite is the main hazard: **36 test files mount these components, issuing class-based queries with zero `data-testid` anywhere.** Blast radius by class: `.sub-choice` 13 tests, `.sub-reveal` 12, `.sub-feedback-ok/-bad` 12, `.sub-stage` 11, `.sub-feedback` 8, `.sub-stem` 6, `.sub-type-input` 5, plus every prefix clone.

Approach: **migrate each runner and its own test file as one unit**, so the tests stay meaningful rather than being routed around by test ids.

Hard constraints:

- The bare state-class strings `selected`, `correct`, `wrong`, `active`, `hint-noun` are asserted via `.classes()` in 9 tests and must stay bare — not `is-correct`, not `choice--correct`.
- Element-level assertions must survive: the AI-graded input row keeps its `<form>`; `da-compounds/RegisterRunner`'s reveal keeps its `<s>` child.
- Markup hooks with no CSS behind them (`.asm-canonical`, `.asm-also-correct`, `.c-label` and friends) must keep existing as attributes.
- `DaCompoundsHome.test.ts` (301 lines) pins `.module-grid` **by index**, exact `.module-card` counts per group, and nine ordered `.group-heading` strings. The hub redesign replaces that markup, so this test is rewritten against the new ledger — asserting the same *facts* (21 cards, 9 phases, T14/T15 carry distinct `?direction=`, every card routes correctly).
- Baseline: `npm test` is **fully green — 2,020/2,020 tests, 158/158 files, 21.5s** (measured on this branch before any change). An earlier audit reported a `ThemeToggle` timeout; it did not reproduce. There is therefore no tolerated failure: **any red test after this work is a regression.**

New tests: `tests/composables/useDrillMastery.test.ts` (band boundaries, T14/T15 split, rollup seeding, empty history), plus mount tests for the four new primitives and the two new widgets.

## Verification

- `npm run typecheck` clean (`noUnusedLocals`/`noUnusedParameters` are on — deleting markup without deleting the `ref`/`computed` behind it fails the build).
- `npm test` green, with the single documented pre-existing failure.
- Manual pass at 1440 / 900 / 720 / 480 px in both themes on: both hubs, both cheatsheets, and one runner per interaction archetype (pick-one, type-in, dual-mode, assembly, matching, dialogue two-gap, AI-graded).
- Preposition colours still resolve on da-compounds reveals and result rows.
- A user palette override still applies (the `usePalette` contract is test-locked).

## Release

Version `1.14.04` → **`1.15.00`** (the `YY` field marks a module-level change; the revamp qualifies). Bump `src/data/changelog.ts` `APP_VERSION` + a new entry, and `package.json`, as two commits; merge to `main`, push, `npm run deploy`.

## Deliberately not done

- No consolidation of the app-wide copy-paste layer outside these two modules (`.setup-actions` ×64, `.loading-state` ×57 span all 16 modules). The user chose the scoped option; a cross-module hoist is a separate change.
- No `data-testid` migration for the wider app.
- naive-ui stays where it is; neither module uses it.
- The 7 dead components the audit found (`EntryList`, `EntryEditor`, `ApiKeyForm`, `ThemeToggle`, `charts/StudyHeatmap`, `charts/ActivityHeatmap30`, `verbs/QuizResult`) are left alone — unrelated cleanup.
