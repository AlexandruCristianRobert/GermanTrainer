# Scene hints + preposition colors — Fixed prepositions drill

Two additions to the **Fixed prepositions** drill (`CollocationsRunner.vue` / `CollocationsSetup.vue`),
designed in a grill session on 2026-07-16 and bound by two new CONTEXT.md glossary terms:
**Scene hint** and **Preposition color**. Read those two entries in `CONTEXT.md` before starting —
they are binding language.

1. Every seeded collocation gets a **scene hint**: a one-line English micro-scene retelling its
   stored German `example`, angled toward the preposition's core idea from
   `src/data/prepCheatsheet.ts`. Shown on the drill card *while answering*, behind a setup toggle
   (default ON).
2. Each of the 15 governed prepositions gets a permanent **preposition color**, applied only
   *after* submitting (card wash + accents) and on drill-summary rows, as a memory anchor.

## Global constraints (binding)

- **Phone-first**: every UI change must render and work at ~390px viewport width.
- Test runner: `npm test` (vitest). Typecheck: `npx vue-tsc --noEmit`. Both must pass before commit.
- The cheatsheet pages (`PrepositionCheatsheet.vue`, `prepCheatsheet.ts`) are **not touched**.
- Preposition colors appear **only post-submit** (and in the summary). Pre-submit the card stays
  neutral — color would leak the answer.
- Correct/wrong verdict colors (`var(--success)` green / `var(--danger)` red) keep their meaning
  and must remain legible on top of any color wash.
- Locked hue mapping (verbatim, do not reassign):
  gegen=red · vor=violet · auf=amber · über=sky blue · für=green · mit=teal · zu=cyan ·
  nach=indigo · an=burnt orange · von=brown · um=magenta · in=emerald · bei=ochre yellow ·
  aus=olive · unter=slate gray.
- Scene-hint authoring rules (verbatim, enforced by tests in Task 1):
  - Retells the entry's German `example` sentence in English — same situation, same actors —
    angled to evoke the preposition's core idea.
  - ≤ 90 characters and ≤ 14 words (target the approved voice: ~8–12 words).
  - Must NOT contain, at a word boundary, case-insensitive: `auf`, `über`, `ueber`, `für`,
    `fuer`, `gegen`, `nach`, `von`, `mit`, `zu`, `vor`, `aus`, `bei`, `um`, `unter`,
    `akkusativ`, `dativ`, `accusative`, `dative`. (`an` and `in` are exempt — they are ordinary
    English words.)
  - Unique across the dataset (no two entries share a scene hint verbatim).
  - Approved voice samples (user-approved; match this register — lowercase fragment, concrete,
    no grammar talk):
    - warten (auf) → "you've been standing there a while; the bus still hasn't come"
    - leiden (an, illness) → "a chronic illness he's carried for years"
    - die Suche (nach) → "the keys are gone; you keep hunting"
    - allergisch (gegen) → "one peanut, and your body revolts"

---

### Task 1: `sceneHint` field + author all 505 hints + data guards

**Files:** `src/data/collocations.ts`, `tests/data/collocations.test.ts`

1. Add a required field to the `Collocation` interface:
   ```ts
   /**
    * Scene hint: one-line English micro-scene retelling `example`, angled toward the
    * preposition's core idea (see CONTEXT.md → "Scene hint"). Shown on the drill card
    * BEFORE the learner answers. Never names the preposition or the case; ≤ 90 chars,
    * ≤ 14 words; unique across the dataset. Enforced by tests/data/collocations.test.ts.
    */
   sceneHint: string
   ```
2. Author `sceneHint` for **every** entry (505 entries — the count test asserts ≥500). Work
   section by section (the file is grouped by preposition/role with `─────` comment banners).
   Each hint follows the Global-constraints authoring rules above. Derive the scene from that
   entry's own `example`; use the chapter's `coreIdea` in `src/data/prepCheatsheet.ts` to pick
   the angle (e.g. *auf* scenes lean on anticipation, *vor* scenes on backing away, *gegen* on
   pushing against).
3. Extend `tests/data/collocations.test.ts` (TDD: write these tests first, watch them fail on
   the not-yet-authored data, then author until green) with:
   - every entry has a non-empty `sceneHint`
   - `sceneHint` length ≤ 90 chars and ≤ 14 words
   - forbidden-token guard: none of the tokens listed in Global constraints appears at a word
     boundary (case-insensitive, `\p{L}`-based boundaries like the existing example test)
   - no duplicate `sceneHint` values across the dataset (mirror the duplicate-example test)
4. No UI changes in this task. `npm test` and `npx vue-tsc --noEmit` must pass.

**Definition of done:** all 505 entries carry a rule-conforming hint; all new and existing
tests green; typecheck green.

---

### Task 2: preposition colors — tokens, mapping, reveal wash, summary rows

**Files:** `src/styles/tokens.css`, new `src/data/prepColors.ts`, new
`tests/data/prepColors.test.ts`, `src/modules/prepositions/CollocationsRunner.vue`,
`tests/modules/prepositions/CollocationsRunner.test.ts`

1. **Tokens** (`src/styles/tokens.css`): for each of the 15 prepositions add two custom
   properties — `--prep-<slug>` (strong accent, readable as text on the theme background) and
   `--prep-<slug>-wash` (soft background tint, e.g. `color-mix(in srgb, <accent> 9%,
   transparent)`; a stronger mix in dark theme). Slugs: umlauts transliterate (`über` →
   `ueber`, `für` → `fuer`). Define light values under `:root` and dark overrides under
   `[data-theme="dark"]` (existing pattern in the file). Hues follow the locked mapping;
   print-muted shades that harmonize with the app's paper/ink aesthetic. Suggested starting
   accents (tune for contrast, keep the hue): gegen `#B0392F`, vor `#7A4FA3`, auf `#B87E1F`,
   über `#3E7CB1`, für `#4E7F3B`, mit `#2F7F74`, zu `#2E8FA3`, nach `#44519E`, an `#B85C25`,
   von `#7F5B3B`, um `#A33E7C`, in `#2F8F5B`, bei `#A38A1F`, aus `#6E7F2F`, unter `#5C6B7A`.
2. **Mapping module** (`src/data/prepColors.ts`): export
   `prepColorStyle(preposition: string): Record<string, string>` returning
   `{ '--prep-accent': 'var(--prep-<slug>)', '--prep-wash': 'var(--prep-<slug>-wash)' }`,
   plus the slug helper. Unknown preposition → empty object (defensive, not expected).
3. **Test** (`tests/data/prepColors.test.ts`): every distinct `preposition` in `COLLOCATIONS`
   yields a non-empty style object; slugs are ASCII.
4. **Runner reveal** (`CollocationsRunner.vue`):
   - When `submitted` is true, bind `prepColorStyle(current.item.preposition)` onto the stage
     element so descendants see `--prep-accent` / `--prep-wash`.
   - `.colloc-prompt` (prompt card) and `.colloc-inputs` get `background: var(--prep-wash)`
     while submitted (pre-submit: unchanged).
   - Preposition feedback: after submit, the governed preposition is always visible in the
     prep row rendered in `var(--prep-accent)` (bold) — when correct as `✓ auf` (check stays
     green), when wrong as `→ auf` (arrow stays red). The input's green/red verdict styling
     is unchanged.
   - Reveal block: the example sentence text renders in `var(--prep-accent)` with an accent
     left border on `.colloc-reveal`; notes stay muted.
   - Case buttons/feedback keep their existing green/red treatment.
5. **Summary rows** (same file, result list): bind each row's prep style vars; row background
   `var(--prep-wash)`; the preposition value renders in `var(--prep-accent)` (replacing its
   current ok/err green/red — correctness on the prep is still visible via the row's ✓/✗ tag);
   the case value keeps its ok/err coloring.
6. **Component tests** (`CollocationsRunner.test.ts`, follow the file's existing patterns):
   after submit the stage carries the item's `--prep-accent` style; before submit it does not;
   summary rows carry per-item style vars.
7. Verify at ~390px (wash fills the card edge-to-edge, no horizontal overflow).

**Definition of done:** color visible only post-submit + summary; both themes defined; tests
and typecheck green.

---

### Task 3: "Scene hints" setup toggle + card display

**Files:** `src/modules/prepositions/CollocationsSetup.vue`,
`src/modules/prepositions/CollocationsRunner.vue`,
`tests/modules/prepositions/CollocationsRunner.test.ts`

1. **Setup** (`CollocationsSetup.vue`): add a "Scene hints" on/off control styled like the
   existing chip/field patterns, default **ON**. Persist as `hints?: boolean` inside the
   existing `gtCollocations` localStorage payload (extend `Stored`, `load()`, `save()`). Pass
   to the runner as query param `hints: '1' | '0'` in `start()`.
2. **Runner** (`CollocationsRunner.vue`): read `route.query.hints` — hints are ON unless the
   param is exactly `'0'`. When ON, render the current item's `sceneHint` on the prompt card
   under `.prompt-english`: small, italic, muted (`var(--ink-soft)`/`var(--mute)` family), and
   it stays visible after submit (the German example then confirms the scene). When OFF, the
   card is exactly today's card — no hint element in the DOM.
3. Retry rounds (`retryWrong`) keep the same hints setting (they reuse the same route — verify
   no code change needed, or thread the flag if there is).
4. **Tests** (`CollocationsRunner.test.ts`): hint text rendered when `hints=1` (and by
   default), absent from the DOM when `hints=0`, still present after submit. If a setup test
   file exists, extend persistence coverage; do not create a new setup test file otherwise.
5. Verify at ~390px: hint wraps to multiple lines without overflowing the card.

**Definition of done:** toggle round-trips (setup → query → runner → localStorage); default ON;
drill with hints OFF is pixel-identical to today's; tests and typecheck green.
