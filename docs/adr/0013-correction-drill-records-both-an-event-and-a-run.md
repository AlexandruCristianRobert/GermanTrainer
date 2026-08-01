# A Korrekturdrill attempt is recorded twice — as a correction event and as a Run

[ADR-0012](0012-error-archive-append-only-dexie.md) made the [Error archive](../../CONTEXT.md)
append-only: "the learner has re-practised this correction" is *not* a `drilled` boolean on the
[Archived correction](../../CONTEXT.md) row but a second append-only table,
`sprechenCorrectionEvents`, with drilled-ness derived by joining the two. That table is therefore
**mandatory** — the [Correction drill](../../CONTEXT.md) cannot work without appending to it, and
because it is Dexie it works offline.

[ADR-0010](0010-record-runs-when-online-for-all-drills.md) says every drill records a
[Run](../../CONTEXT.md) when online. Applying it here means a Korrekturdrill session *also* saves a
`sprechen-drill` Run. So one drilled correction produces **two records of the same activity**: a
`CorrectionEvent` (always) and a slice of a Run (when online). A future reader will find that
duplication and assume one of them is a mistake. It isn't — they answer different questions. The
event answers "has this specific correction been re-practised?", which is what the archive screen's
drilled-vs-open strips and the drill's own item selection need. The Run answers "did I practise
today, and how did it go?", which is what the History page, the charts and the learner's sense of
momentum need. Neither is derivable from the other: the events table has no session boundary and no
duration, and the Run has no per-correction identity.

## Considered options

- **Both records** (chosen) — events for fidelity and offline capability, a Run for uniformity and
  discoverability. Costs the duplication described above and the drift below.
- **Events only, no Run** — rejected by the user after being recommended. It keeps a single source
  of truth and keeps an idiosyncratic drill out of the cross-type charts, but it makes the
  Korrekturdrill the *only* practice in the app that leaves no trace in History, which reads as the
  feature being unfinished rather than as a deliberate modelling choice.
- **A Run only, drilled-ness derived from Run meta** — rejected outright: it contradicts ADR-0012,
  loses every attempt made offline, and would put per-correction identity into `meta`, which is
  exactly the mutable-shaped data ADR-0012 exists to keep out.

## Consequences

- **The two records can legitimately disagree.** A session drilled offline appends events and saves
  no Run (ADR-0010). So the archive can show a correction as drilled with no Run explaining when —
  and the total attempts implied by History will read lower than the events table's. This is
  expected, not corruption; nothing should reconcile them.
- **`sprechen-drill` joins `QuizHistoryType`.** Because `useQuizStats`, `quiz-type-labels` and
  `useLevelAssessment` key exhaustive `Record<QuizHistoryType, …>` maps, the compiler forces every
  call site to be updated — the addition cannot be half-done.
- **The CEFR level assessor is told what this type is.** `useLevelAssessment`'s description names it
  as re-practice of the learner's own previously-marked mistakes, so a high score is read as
  "revised successfully" rather than as fresh B2 competence. Without that wording the drill would
  inflate the estimate precisely because its items are the learner's known weak spots.
- **A Run's `correct` counts first-try answers only.** An item the learner misses stays open and
  comes back in a later session, where it may well be answered right; that later pass is a new
  event and belongs to a different Run. The Run is a snapshot of one sitting, not of the
  correction's lifetime.
