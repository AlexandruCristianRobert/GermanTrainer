# Nouns: retry-wrong loop + Fantasy/Switzerland categories — Design

**Date:** 2026-05-29
**Status:** Approved (brainstorming)

## Overview

Three related changes to the **nouns** trainer:

1. **Retry-wrong loop** — after finishing a noun quiz, offer to immediately re-quiz **only the nouns answered wrong**, repeating until none remain.
2. **Two new categories** — `Fantasy` and `Switzerland`, each with **≥ 100** nouns.
3. **Data expansion + dedup** — add ~15–20 nouns to each of the 20 existing categories, and physically remove the 263 duplicate `german` keys already sitting in the seed file (keeping the existing runtime guard).

### Context (current state)

- Nouns live in the **Dexie** DB (`db.nouns`), seeded from `src/data/nouns.seed.json` (1,670 entries; **263 duplicate german keys**).
- `german` is a **unique** Dexie index (`&german`). The same word cannot exist in two categories.
- `dedupeNouns()` (in `src/db/index.ts`, last-wins by trimmed `german`) already collapses dupes at seed/migration time, so the live DB holds ~1,407 unique nouns. New-category words must therefore have germans that **do not collide** with any existing entry.
- `Noun = { id?, german, gender, english, group, createdAt }` — **no plural field**.
- Categories are `NOUN_GROUPS` (20, ending in `'Other'`) in `src/db/types.ts`. `QuizSetup.vue` iterates `NOUN_GROUPS` and defaults selection to groups with count > 0, so new categories auto-appear once seeded.
- Two quiz modes (`gender`, `translation`) share `QuizRunner.vue` → `QuizResult.vue`. `useNounQuiz(nouns, mode)` tracks per-question `isCorrect`.
- Adding seed data for **existing users** requires an explicit Dexie `.upgrade()` (they never re-run `seedIfEmpty`). `version(4)` in `db/index.ts` is the established top-up pattern: add missing germans, update changed groups, leave user-added nouns untouched.

## Feature 1 — Retry-wrong loop

### Chosen approach: in-component re-init (A1)

`QuizResult` emits a new `retry-wrong` event; `QuizRunner` rebuilds the quiz **in place** with the wrong nouns from the just-finished round. No routing, no noun data in the URL. (Rejected: A2 route-based with IDs in URL — ugly, extra by-id load; A3 shared store — needless indirection.)

### Mechanism

- **`QuizRunner.vue`**: hold the quiz in a `shallowRef<ReturnType<typeof useNounQuiz> | null>`. Re-assigning `.value` re-renders cleanly and lets us **drop the existing `(ready.value, …)` reactivity hack** in the computeds (a small tidy of code we're already touching).
- Add a small **exported pure helper** `wrongNouns(questions: NounQuestion[]): Noun[]` in `useNounQuiz.ts` (returns the `isCorrect === false` nouns). This keeps the retry logic testable without mounting an SFC.
- `retryWrong()` in the runner:
  ```
  const wrong = wrongNouns(quizRef.value.questions.value)
  if (wrong.length === 0) return
  nouns.value = shuffle(wrong)            // fair reshuffle each round (shared shuffle from src/data/pool.ts)
  quizRef.value = useNounQuiz(nouns.value, mode.value)
  ```
- **`QuizResult.vue`**: when `wrongCount > 0`, show a `Retry N wrong →` action (alongside the existing Setup/Start-another buttons), emitting `retry-wrong`. When `wrongCount === 0`, show a celebratory end-state ("Alles richtig! 🎉") with only **Setup another / Home** — no retry button. This is what makes the option re-offer each round and disappear when clean.
- Works identically for **both** modes (shared component).

### History

Retry rounds are **not** saved. The existing save-once guard (`historySaved`) fires only on the first `finished → true` transition, so the original full run is recorded and subsequent rounds are skipped automatically. Add a comment documenting this is intentional.

### Edge cases

- All-correct original run → no retry button, celebratory state shown immediately.
- Single wrong answer → retry of 1; if still wrong, re-offered; loop terminates when 0.
- Reshuffle each round so order isn't memorised.

## Feature 2 — Categories & data

### NOUN_GROUPS

Add `'Fantasy'` and `'Switzerland'` to `NOUN_GROUPS` in `src/db/types.ts`, inserted **before `'Other'`**.

### New category content (≥ 100 each, unique germans)

- **Fantasy** — fantasy / medieval / mythical vocabulary: e.g. *der Drache, die Hexe, der Zauberer, das Schwert, der Zwerg, die Elfe, der Ritter, die Burg, der Zauberstab, das Einhorn, der Kobold, der Troll, die Magie, der Zaubertrank, der Drachentöter, das Verlies, der Zauberspruch…*
- **Switzerland** — Switzerland-**themed** nouns: geography (cantons, lakes, passes, *das Matterhorn, der Jura, der Genfersee*), food specialities (*das Fondue, das Raclette, die Rösti, der Cervelat, der Emmentaler*), culture / symbols / politics (*das Alphorn, das Edelweiss, die Eidgenossenschaft, der Nationalrat, der Jodel, das Schwingen*). Authored to **not collide** with existing germans.

### Top-up of existing categories

Add ~15–20 new **unique** nouns to each of the 20 existing categories (~300–400 total). Each entry: `{ german, gender, english, group }`.

## Feature 3 — Dedup cleanup + unique-german guard

- Rewrite `src/data/nouns.seed.json` with duplicates removed using **last-wins** (identical semantics to `dedupeNouns`), so the resulting DB content is **unchanged vs today** (1,670 → ~1,407 before new additions). Keep `dedupeNouns()` as the runtime safety guard.
- Add a test asserting **the seed has zero duplicate german keys** (after cleanup). This doubles as the **collision guard** for all new data: any new noun whose german clashes with an existing entry fails the test, instead of being silently dropped by last-wins.

## DB migration (existing users)

Bump Dexie to **`version(7)`** with a top-up `.upgrade()` reusing the exact `version(4)` pattern in `db/index.ts`:
- Add seed germans not already present (the new categories + per-category additions).
- Update `group` where the seed re-assigns it; leave user-added nouns untouched.
- New users and "reset to seed" get everything through the existing `seedIfEmpty` / `resetTableToSeed` paths (both already call `dedupeNouns`).

## Testing

Seed-integrity test(s) over `nouns.seed.json`:
- Zero duplicate `german` keys.
- Every `group` is a valid `NounGroup`; every `gender ∈ {der, die, das}`.
- `Fantasy` count ≥ 100 and `Switzerland` count ≥ 100.

`useNounQuiz` retry test (via the exported `wrongNouns` helper):
- After a round with mixed results, `wrongNouns(questions)` equals exactly the `isCorrect === false` nouns.
- An all-correct round yields `[]` (loop terminates).

(`QuizResult`/`QuizRunner` wiring is covered by the unit test on the wrong-set computation + manual smoke; no heavy SFC test harness exists in this repo.)

## Data-quality approach (primary risk: ~500–600 genders)

Authoring 500–600 German nouns with correct **gender** is the main risk. Plan:
- Author in **category batches via subagents** (each batch: unique germans, correct gender, concise english, correct group).
- A dedicated **gender-verification pass** (separate reviewer subagent) re-checks each entry's gender/translation.
- The uniqueness test (Feature 3) catches any german collisions across the whole seed.
- Note: a final native-speaker spot-check remains advisable; this is flagged, not blocking.

## Files affected

| File | Change |
|---|---|
| `src/db/types.ts` | Add `'Fantasy'`, `'Switzerland'` to `NOUN_GROUPS` |
| `src/data/nouns.seed.json` | Dedup (last-wins) + ~300–400 top-up + ≥100 Fantasy + ≥100 Switzerland |
| `src/db/index.ts` | Add `version(7)` top-up migration (reuse v4 pattern) |
| `src/composables/useNounQuiz.ts` | Export pure `wrongNouns(questions)` helper |
| `src/modules/nouns/QuizRunner.vue` | `shallowRef` quiz + `retryWrong()`; drop `(ready,…)` hack |
| `src/modules/nouns/QuizResult.vue` | `Retry N wrong` action + celebratory all-correct end-state; `retry-wrong` emit |
| `tests/data/nouns.seed.test.ts` (new) | Seed integrity + dedup/collision + per-category-count assertions |
| `tests/composables/useNounQuiz.test.ts` (new/extend) | Wrong-set + loop-termination |

## Out of scope

- No `plural` field added to `Noun`.
- No change to adjectives, or to the non-noun quiz modules.
- No new quiz mode; retry reuses the current mode.
- Retry rounds are not persisted to history.
