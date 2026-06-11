# Per-item attempt records for the prep-sentence quiz live in run meta

The quiz history store records only **run-level aggregates** — `count`, `correct`, and a
`meta` bag of the filters a run used. `useQuizStats.ts` derives every per-filter statistic
from those totals and openly documents the limitation: *"We don't store per-question data,
so per-filter accuracy is approximated by attributing the whole run to each listed value."*

To track **which preposition and which assigned theme noun** the learner sees and misses,
to tag *why* a sentence was wrong (preposition / case / noun / typo), and to rank
**weak points**, we need data the aggregate model cannot provide. We decided the
`EN→DE` prep-sentence (and the prep [Remedial drill]) runs will attach a compact
**per-sentence item array** to the run's `meta`: for each sentence, the preposition id, the
assigned theme noun key(s), whether it was correct, and the error tag(s). Weak points are
then derived in `useQuizStats.ts` by scanning these arrays — the same "derive from history"
pattern the app already uses. We deliberately did **not** add a separate lifetime store.

## Considered options

- **Per-item records in `meta`** (chosen) — reuses the existing history pipeline and the
  derive-in-`useQuizStats` pattern; "Clear history" wipes the per-item data for free; no
  second store to keep in sync. Bounded by the 100-run FIFO cap, so weak-point stats reflect
  the learner's most recent ~100 runs rather than all-time — acceptable, and arguably more
  pedagogically relevant (recent weaknesses).
- **Dedicated lifetime weak-point store** (separate localStorage key, keyed by prep/noun) —
  rejected for v1: true all-time totals, but a second source of truth to migrate and keep
  consistent, plus an awkward question of whether "Clear history" should also wipe it.
- **No per-item storage; keep approximating** — rejected: cannot identify individual weak
  prepositions/nouns or attribute error tags at all, which is the whole point of the feature.

## Consequences

- `QuizHistoryMeta` gains an optional per-item array; only `EN→DE` prep-sentence and remedial
  runs populate it. Older entries and other quiz types simply lack it — readers must treat it
  as optional. This is the first quiz type to break the run-aggregate-only model.
- Weak-point stats are scoped to the last ~100 runs by the existing FIFO trim. If lifetime
  tracking is ever needed, it becomes a follow-up migration to a dedicated store.
- Error tags require AI grading; `EN→DE` + Exact-grading runs record item counts (prep/noun
  seen + correct/wrong) but no tags, so any tag-proportioned logic must tolerate tag-less data.
- `DE→EN` runs record no per-item data — the feature is `EN→DE` only.

See [CONTEXT.md](../../CONTEXT.md) for **Error tag**, **Weak point**, and **Remedial drill**.
