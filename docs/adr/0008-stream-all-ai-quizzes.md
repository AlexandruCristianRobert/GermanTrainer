# All AI quizzes stream via shared machinery, on a ramped batch schedule

[ADR-0004](0004-progressive-streaming-sentence-generation.md) made the **verb sentence quiz**
generate progressively — first sentence as a 1-item call for the fastest paint, the rest in
concurrent batches of ~5 — and extracted a shared batch runner (`useProgressiveGenerator`:
`planBatches` + `generateProgressively`). It explicitly deferred migrating the other AI quizzes,
which each still make **one big AI call behind a loading overlay** and only then navigate to the
runner. For large counts that call is slow and failure-prone (token pressure, one validation
cascade loses everything).

We decided to bring **every count-based AI quiz** onto progressive streaming and to change the
batch schedule to a **ramp**: small early batches for a fast first paint, then even batches of
**10** for efficiency on large runs. The already-streaming verb quiz ramps **1 → 2 → 5 → 10…**;
the newly-migrated quizzes ramp **5 → 10…** (open once the first five arrive). This applies to
**all counts** (the ramp adapts: preset 10 → `5,5`; custom 50 → `5,10×4,5`), not only custom.
In scope: prep sentence, prep remedial, verb sentence, verb remedial, declension article-AI,
adjective sentence, Konjunktiv, Passiv. Out of scope: the C1 simulator (a fixed exam, no
custom N) and Writing (AI grading, not generation).

To avoid rebuilding the runner-side streaming state in seven places, the ready-queue / "preparing
next…" / background-generation / end-of-run shortfall logic that lived only in
`VerbSentenceRunner` is extracted into a shared **`useStreamingQuiz`** composable. Each quiz plugs
in its own `runBatch(specs)` (its AI call) and renders its own card; the queue and pacing are shared.

## Considered options

- **Stream everywhere via shared machinery + ramp** (chosen) — consistent fast start and reliable
  large-N generation across every AI quiz, with the streaming complexity written and tested once.
  Cost: every AI Setup→Runner contract changes (Setup samples and stashes *specs*, the runner owns
  generation), and each runner gains async state — real bug surface, mitigated by the shared
  composable and its tests.
- **Batch but await all behind the loading screen** — split the one call into batches of 10, run
  concurrently, show progress, open when done. Simpler (no runner rewrite), still cheaper/more
  reliable, but loses the instant start we explicitly want. Rejected.
- **Batch size only, no ramp** — cap calls at 10 items, plain spinner. Smallest change, but drops
  the fast-first-paint the ramp gives. Rejected.
- **Leave the non-verb quizzes on one call** (status quo of ADR-0004) — no work, but the large-N
  slowness/fragility the user hit remains. Rejected.

## Consequences

- A single streaming model spans all AI quizzes. Readers must not assume any AI quiz "generates all
  N then navigates" — they stream, opening on the first batch, generating the rest in the background.
- `useProgressiveGenerator` gains `planRampBatches(items, firstSizes, batchSize)` alongside
  `planBatches`; `generateProgressively` is unchanged. Concurrency stays 4 concurrent batch-calls.
- The runner-side streaming state is centralised in `useStreamingQuiz`; per-quiz runners shrink to
  "provide runBatch + render a card". Migrating a quiz means: Setup stashes specs (not sentences),
  Runner adopts `useStreamingQuiz`. Grading, history, weak-points and hints are unchanged per quiz.
- A quiz whose generation does not decompose into independent per-item batches cannot stream item-by-
  item; such a quiz is migrated to batches-of-10 that still await-all, or left as-is, and that
  exception is noted where it occurs.
- Caps are unchanged; the ramp simply governs how any N (preset or custom) is sliced.

## Feasibility (from the per-quiz analysis)

Two generation families, needing two batch drivers:

- **Spec-based** — the setup samples N discrete, independent specs and the AI fills each: **prep
  sentence** (`generateSentences({specs})` accepts any subset, results carry `index`), **verb
  sentence**, **verb remedial**, **adjective** (the adjective list is the spec set), and the
  sentence portion of **prep remedial**. These slice cleanly by spec via `planRampBatches` +
  `generateProgressively`; concurrent batches are safe (specs differ).
- **Count-based** — the AI invents the items from a count + constraints, with no per-item spec:
  **Konjunktiv**, **Passiv**, **declension article-AI**. Their generators already loop on
  `remaining = count − accepted` and merge, so they batch *by count* — but running count-batches
  **concurrently risks duplicate sentences** (no batch knows what the others produced), so they
  need a count-ramp driver that dedups (or runs sequentially), not the spec driver.

Status at ADR acceptance: the shared `planRampBatches` and the **verb family** (verb sentence +
verb remedial, which share `VerbSentenceRunner`) ship first on the `1,2,5,10` ramp. The spec-based
and count-based migrations of the remaining quizzes are staged in
`docs/superpowers/plans/2026-07-17-stream-ai-quizzes.md` and land incrementally, each verified with
a live smoke-test (AI runtime behaviour is not unit-testable — runner tests mock the generator).
