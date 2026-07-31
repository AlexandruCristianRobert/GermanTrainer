# Drill mastery gets a lifetime rollup; ADR-0002's "derive from history" default is reversed for this one case

[ADR-0002](0002-per-item-tracking-prep-sentence.md) considered a dedicated lifetime store for
weak points and rejected it: weak-point stats derive from `gt:quizHistory`'s 100-run FIFO
window, which is bounded but "arguably more pedagogically relevant (recent weaknesses)" — a
learner's rustiest prepositions five years ago shouldn't still outrank what they're missing
this week. Direction Words and Da-Compounds add a different reading of the same history: a
per-drill **mastery band** (0–5) and attempt count, the hubs' answer to "how far have I got
with this drill". `useDrillMastery.ts` derives it the same way weak points are derived — until
the learner works other modules for a while. `gt:quizHistory` is capped at 100 runs **across
all 54 quiz types app-wide**, not per drill, so a run of Nouns or Verbs practice can push a
Da-Compounds drill's history out of the window entirely. Recomputing the band from what's left
then makes it fall — a T18 the learner mastered weeks ago reads as "never attempted" the moment
their history fills up with unrelated practice.

That's fine for weak points — an old miss recorded once genuinely deserves to age out. It's
wrong for a meter that reads as *accumulated* progress: nothing changed about the learner's
actual command of T18, only what else they've practised since. So `saveQuizRun` (in
`useQuizHistory.ts`) additionally bumps a per-drill lifetime total —
`gt:drillTotals: Record<drillKey, { runs, total, correct, lastAt }>` — every time a Direction
Words or Da-Compounds run is saved, independent of the 100-run trim. `computeDrillMastery`
reads this rollup as its primary source per drill, falling back to the history window only for
a key the rollup has no entry for.

## Considered options

- **Per-drill lifetime rollup, `gt:drillTotals`** (chosen) — a second small localStorage key,
  seeded once from whatever history already exists so current users don't start at zero, then
  kept current by every future `saveQuizRun`. No Dexie change (Dexie holds no run data — the six
  -table shape in `tests/db/index.test.ts` is untouched), no new `QuizHistoryType`, no migration:
  an absent key simply reads as all-zero for every drill.
- **Derive mastery from `gt:quizHistory` alone, same as weak points** — rejected: this is
  exactly the decay described above, and unlike weak points there is no pedagogical argument for
  it. A progress meter that quietly resets because the learner studied verbs for a week is a
  bug, not a feature.
- **Raise `HISTORY_LIMIT` instead** — rejected: `HISTORY_LIMIT` is shared by all 54 quiz types
  app-wide; raising it to keep Direction Words/Da-Compounds mastery stable would bloat every
  other module's history read for a fix that only two modules need, and it only pushes the same
  decay further out rather than removing it.

## Consequences

- `gt:drillTotals` is added to `USER_DATA_KEYS` so it ships in backup/restore alongside
  `gt:quizHistory`.
- Weak points are untouched: `useDwSentenceStats.ts` / the Da-Compounds equivalent still derive
  purely from the 100-run window, per ADR-0002. This ADR reverses that decision **only** for the
  mastery rollup — weak points keep their recency scoping because it is the right behavior for
  them, not an oversight this ADR is fixing.
- `useDrillMastery.ts` must not import `useQuizHistory.ts` as a value (only its types, erased at
  build time via `import type`), so that `useQuizHistory.ts` can import `bumpDrillTotals` from
  it without the two composables forming a runtime circular dependency.
- The rollup is seeded exactly once, guarded by a marker key, from whatever history is present
  the first time it's read or bumped — not a full lifetime record predating this feature, since
  `gt:quizHistory` itself never held more than the last 100 runs to begin with.
