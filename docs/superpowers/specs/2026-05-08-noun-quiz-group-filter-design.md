# Quiz group filter — design

Date: 2026-05-08

## Summary

Let users restrict the noun quiz and adjective quiz to a subset of groups (Food, Office, Family, …) via checkboxes on the setup screen. Multiple groups can be selected; the selection is persisted in `localStorage` and re-applied on the next visit. Each checkbox shows the number of items currently in that group.

## Motivation

Today both quizzes pull a random sample from the entire collection. As the collection grows, users want to focus practice on one topic at a time (e.g. only food vocabulary) without permanently changing the data. A per-quiz, persisted group filter makes this trivial.

## Scope

In scope:

- Group filter UI on the noun quiz setup page (`src/modules/nouns/QuizSetup.vue`).
- Group filter UI on the adjective quiz setup page (`src/modules/adjectives/QuizSetup.vue`).
- Group-aware sampling in the data layer (`useNouns`, `useAdjectives`).
- Persistence of the last-used selection in `localStorage`, separately per quiz.

Out of scope:

- Dexie schema or `Settings` table changes.
- Per-group performance tracking, statistics, or weighting.
- A separate "manage groups" UI.

## Design

### Data layer

`src/composables/useNouns.ts` gains:

- `sampleByGroups(groups: NounGroup[], n: number): Promise<Noun[]>` — filters `db.nouns` to rows whose `group` is in `groups`, then shuffles in place using the same Fisher–Yates pattern as the existing `sample`, and returns the first `min(n, filtered.length)` items. If `groups` is empty, returns `[]`.
- `countsByGroup(): Promise<Record<NounGroup, number>>` — returns a count per group, including zero entries for groups with no nouns. Used to render the badge next to each checkbox.

Existing `sample` and `count` are kept untouched so other call sites are unaffected.

`src/composables/useAdjectives.ts` gets the analogous `sampleByGroups` and `countsByGroup` typed against `AdjectiveGroup`.

### Setup UI

Both `QuizSetup.vue` files (nouns and adjectives) gain a "Groups" section directly above "Number of questions". The section contains:

- An `NCheckboxGroup` bound to a `selectedGroups` ref (`Ref<NounGroup[]>` / `Ref<AdjectiveGroup[]>`).
- One `NCheckbox` per group from `NOUN_GROUPS` / `ADJECTIVE_GROUPS`, with label `"{group} ({count})"`.
- Groups whose count is zero render with `disabled` so they cannot be selected.
- Two small inline buttons below the list: **All** (selects every non-empty group) and **None** (clears the selection).

### State and persistence

On mount:

1. Fetch `countsByGroup()` and store in a `counts` ref.
2. Read `localStorage.getItem('nounQuizGroups')` (or `'adjectiveQuizGroups'`).
3. If present and parses as a `string[]`, intersect with the current group list (drops any unknown groups) and assign to `selectedGroups`.
4. Otherwise initialize `selectedGroups` to all groups whose count is `> 0`.

A `watch` on `selectedGroups` writes the array back to `localStorage` on every change, JSON-stringified.

Failures from `JSON.parse` or `localStorage` access fall back to the "all non-empty groups" default — never throw.

### Effective count and Start gating

The existing `totalAvailable`, `requested`, and `effective` computeds are reworked:

- `totalAvailable = computed(() => sum(counts[g] for g in selectedGroups))` — items available given the current filter.
- `requested` is unchanged (preset or custom).
- `effective = computed(() => Math.min(requested, totalAvailable))`.

The existing "Only X available — quizzing all of them" `NAlert` continues to fire when `requested > totalAvailable`.

The Start button is disabled when `selectedGroups.length === 0` or `totalAvailable === 0`. A new `NAlert` of type `warning` shows when no groups are selected: "Select at least one group."

### Routing handoff

`QuizSetup` pushes the selected groups through the existing route query as a comma-joined string:

```
/nouns/quiz/run?mode=gender&count=10&groups=Food,Other
```

`QuizRunner.vue` (both nouns and adjectives) parses `route.query.groups`:

- If present and non-empty, split on `,`, filter against the known group list, and call `sampleByGroups(parsed, count)`.
- If absent or empty, fall back to the existing `sample(count)` so old bookmarks and the back button still work.

Group names contain spaces and `&` (e.g. `"Bank & Money"`, `"People & Character"`). Vue Router URL-encodes query values automatically, so no manual encoding is needed at the call site, but the runner uses `decodeURIComponent` defensively when splitting.

## Testing

Manual checks:

- Open noun quiz setup with a fresh storage: all non-empty groups checked, empty groups disabled.
- Uncheck all but one group, start a 10-question quiz: every question is from that group.
- Refresh the page: selection persists.
- Select a single group with fewer items than the requested count: the "Only X available" alert shows and the quiz uses what's available.
- Repeat all of the above on the adjective quiz.
- Bookmark a runner URL without a `groups` query, revisit: behaves like today (samples from all).

## Files touched

- `src/composables/useNouns.ts` — add `sampleByGroups`, `countsByGroup`.
- `src/composables/useAdjectives.ts` — add `sampleByGroups`, `countsByGroup`.
- `src/modules/nouns/QuizSetup.vue` — group checkbox UI, persistence, route query.
- `src/modules/nouns/QuizRunner.vue` — read `groups` query, call `sampleByGroups` when present.
- `src/modules/adjectives/QuizSetup.vue` — same as noun setup.
- `src/modules/adjectives/QuizRunner.vue` — same as noun runner.

No changes to `src/db/types.ts` or the Dexie schema.
