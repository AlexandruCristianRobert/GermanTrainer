# Progressive, streaming generation for the verb sentence quiz

The preposition sentence quiz generates **all N** sentences in one AI call inside a
loading overlay, stashes the finished array, then navigates to the runner. For the verb
sentence quiz we decided to **stream** instead. We sample all N verb+noun specs up front
(local, instant — so randomization is fully decided before any AI call), then generate
sentences progressively: the **first sentence is its own 1-item call** for the fastest
possible first paint, and the remaining specs generate in **concurrent batches (~5)**.
The runner opens the moment the first sentence resolves and consumes sentences as they
arrive. If the learner outruns generation, a brief *"preparing next sentence…"* state
shows until the next one is ready. A batch that still fails after its retries just yields
fewer sentences, surfaced at the end ("Generated X of N"). The progressive batch-runner
is extracted as a shared, tested utility; the prep quiz is left unchanged and may adopt
it later.

## Considered options

- **Progressive streaming** (chosen) — fastest start and best perceived speed, which was
  the explicit goal. Cost: the Setup→Runner contract changes, the runner gains
  background-generation state, and partial-batch failure must be handled mid-run.
- **Chunked parallel, but await all batches before opening** — simpler runner (it still
  receives a complete list) and far faster than one big call, but loses the instant start.
- **Single big call, just tuned** (variety cues + fewer retries + tighter prompt) —
  smallest change and lowest risk, but a 25-sentence run remains one long generation.

## Consequences

- The Setup no longer hands the runner a complete sentence array. It hands the sampled
  **specs** + the AI params, and the **runner owns generation**. Because sampling happens
  up front, variety/randomization is unaffected by streaming.
- The runner gains async state: a ready queue, in-flight batches, the "preparing next"
  interstitial, and an end-of-run shortfall notice. This is new bug surface (a batch
  failing or arriving out of order) that the prep runner never had.
- Per-item weak-point records are appended as sentences are answered, but the run is still
  saved to history once at the end — so the per-item meta model
  ([ADR-0002](0002-per-item-tracking-prep-sentence.md)) is unchanged; the verb quiz is
  simply its second consumer.
- The shared progressive-generation utility is reusable. Migrating the prep quiz onto it
  is a deliberate **follow-up**, not part of this work.
