# Dative item ledger is keyed by item, not by drill

[ADR-0011](0011-drill-mastery-lifetime-rollup.md) gave drills a lifetime rollup —
`gt:drillTotals: Record<drillKey, {…}>` — because a progress meter must not decay when the
learner studies something else for a week. The Dativ module needs the same lifetime property
one level further down: its hub meter reads "31 / 60 gesichert", where the unit is a
**memorization item** — one of the ~44 [Dative verb](../../CONTEXT.md)s or ~16
dative-governing adjectives — not a drill. A drill-keyed rollup cannot answer "which verbs
are secured"; per-item evidence in run `meta` ([ADR-0002](0002-per-item-tracking-prep-sentence.md))
cannot either, because it is trimmed by `gt:quizHistory`'s 100-run FIFO and the module's
deterministic drills record no per-item arrays at all.

So the module gets its own small store, `gt:dativeLedger: Record<item, LedgerEntry>`, with
`LedgerEntry = { recent: boolean[]; encounters: number; lastAt: number }`. `recent` holds
the last **three** encounter results, most recent first — exactly what the
[Secured item](../../CONTEXT.md) rule needs: `gesichert` iff all three are correct,
`wackelig` otherwise, `new` when the key is absent. A single miss demotes; three clean
encounters re-secure. Every drill that shows an item bumps it once per recorded run
(retry rounds are practice and never bump, matching
[ADR-0010](0010-record-runs-when-online-for-all-drills.md)'s recording rule).

The meter's denominator is **derived** — `DATIVE_VERB_KEYS.length +
DATIVE_ADJECTIVE_KEYS.length` — so adding a verb moves the denominator instead of silently
capping the meter. A ledger key with no matching item (a verb later renamed in `verbs.ts`)
is never written, ignored on read, and excluded from the denominator.

## Considered options

- **Item-keyed lifetime store, `gt:dativeLedger`** (chosen) — a second small localStorage
  key beside `gt:drillTotals`, same safe-read/safe-write discipline, no migration: an
  absent key reads as all-`new`. Storing only the last three booleans keeps entries tiny
  and the rule auditable.
- **Derive from `gt:quizHistory` per ADR-0002** — rejected: the 100-run FIFO makes
  "gesichert" decay when the learner drills other modules, which is exactly the bug
  ADR-0011 fixed for bands; and the deterministic Dativ drills would need new per-item
  meta arrays on every run just to feed it.
- **Widen `gt:drillTotals` with a per-item map** — rejected: different key space, different
  rule (streak, not accuracy), different consumers. Overloading ADR-0011's store muddles
  its contract for no shared machinery.
- **An SRS scheduler with due dates** — rejected per the module spec: the ledger answers
  "what is shaky" without answering "what is due today"; a scheduler can be layered on
  later if the ledger proves it earns one.

## Consequences

- `gt:dativeLedger` joins `USER_DATA_KEYS` so it ships in backup/restore.
- The streak rule means the meter reads *current command*, not accumulated volume — a
  learner returning after months sees their secured count honestly shrink only when
  re-encounters actually go wrong, never from mere absence.
- Rule-driven families (ditransitives, free datives, the passive consequence) are
  deliberately **not** ledger items — there is no list to secure; they stay band-tracked
  only via ADR-0011.
- Readers must not conflate the two lifetime stores: `gt:drillTotals` answers "how far am
  I with drill X", `gt:dativeLedger` answers "which words do I own".
