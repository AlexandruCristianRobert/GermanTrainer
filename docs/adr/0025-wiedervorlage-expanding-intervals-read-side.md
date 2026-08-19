# Wiedervorlage: corrections come due again on expanding intervals, derived read-side

[ADR-0012](0012-error-archive-append-only-dexie.md) made the Error archive append-only and
derived "drilled" by joining `sprechenCorrectionEvents` against the corrections table.
The join rule was maximally lenient: **one** event with `correct === true` — ever —
retired an [Archived correction](../../CONTEXT.md) from the Korrekturdrill permanently
(`drilledIds()`: "only whether a success ever happened"). Pedagogically that is the wrong
lenience: a single successful retrieval minutes after seeing the correction predicts almost
nothing about retention; repeated retrieval at *expanding delays* is what does
([ADR-0024](0024-nachbessern-review-round.md) already reasons in exactly these terms when it
refuses to count copy-edits as *nachgeübt* — "near-zero retrieval strength"). The archive
carried the full timestamped evidence for a scheduler all along; nothing ever read it.

So the Korrekturdrill gains **Wiedervorlage**: a correction that has been retrieved
correctly comes back after a delay, on an expanding schedule, until it has survived four
spaced retrievals. Everything is **derived at read time** from the events table:

- The trailing correct **streak** *k* — correct events since the most recent incorrect
  event — is the only state, and it is computed, never stored.
- *k* = 0 → **offen**: in the queue now. This deliberately *redefines* offen (previously
  "no success ever"): a miss on a due item resets the streak and reopens the correction —
  the same demotion honesty as `wackelig` ([ADR-0017](0017-dative-item-ledger-keyed-by-item.md)).
  The old rule's items missed-after-success were retired forever; they reopen under this one.
- *k* = 1..3 → due again (**fällig**) once `lastCorrectAt + [3, 10, 30][k−1] days` has
  passed; until then it rests (nachgeübt).
- *k* ≥ 4 → retired for good: nachgeübt, never fällig again.

The drill queue serves **offene first (newest first, the existing order), then fällige
(most overdue first)**, so new mistakes are never crowded out by review. Counts are shown
side by side ("Offen · Fällig"), never summed — offen and fällig stay distinct states in
the UI and the glossary.

## Considered options

- **Read-side derivation over the existing events table** (chosen) — `recordDrillResult`
  and both tables stay byte-identical; the streak is recomputed from the (small,
  cold-storage) events scan that `drilledIds()` already did. No schema bump, no
  migration, ADR-0012's never-mutate rule intact, and old data benefits immediately.
- **A status/due-date field on the correction or a third table** — rejected: mutating
  rows breaks ADR-0012's append-only posture (and its Supabase RLS mirror); a third
  table stores what one pass over the second can compute.
- **A full SRS (SM-2/FSRS per-item ease factors)** — rejected: designed for
  thousand-card decks, needs tuned parameters and per-item state. The archive holds tens
  of items per module; a fixed 3/10/30-day ladder with reset-on-miss is auditable at a
  glance and captures the effect that matters (expanding spacing).
- **Keep retire-after-first-success, add a manual "practise again" button** — rejected:
  self-selected review reintroduces the learner-judgment bias spaced schedules exist to
  remove; nobody volunteers for the items they most need.

## Consequences

- `drilledIds()` disappears; readers use per-correction schedules. "Ever succeeded"
  stops being a meaningful state anywhere in the UI.
- **offen** now means "trailing streak = 0", which can *increase* the open count on
  existing archives (items once missed after a success reopen). This is the fix working,
  not a regression.
- The interval ladder `[3, 10, 30]` days and the retire streak `4` are constants in
  `useSprechenArchive.ts` — changing the pedagogy is a one-line diff, and the pure
  `computeSchedule()` makes the ladder unit-testable at exact boundaries.
- A fällig card is labelled in the drill ("fällig · n. Wiederholung") so review is never
  mistaken for a new mistake; hub rows split their counts into offen · fällig · nachgeübt.
- Wiedervorlage needs the current time; `computeSchedule(events, now)` takes it as a
  parameter so tests never mock the clock.
