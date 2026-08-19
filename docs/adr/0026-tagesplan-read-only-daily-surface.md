# Tagesplan: a read-only daily surface over the tracking stores — aggregate, never sample

The app tracks weakness in five independent places — offene/fällige corrections
([ADR-0025](0025-wiedervorlage-expanding-intervals-read-side.md)), the dative item ledger
([ADR-0017](0017-dative-item-ledger-keyed-by-item.md)), preposition and verb weak points
(the [ADR-0002](0002-per-item-tracking-prep-sentence.md) per-item pattern), and the drill
mastery rollup ([ADR-0011](0011-drill-mastery-lifetime-rollup.md)) — and schedules nothing
with any of them: every practice session starts with the learner guessing which of
fourteen modules deserves attention. ADR-0017 deferred exactly this layer: "a scheduler
can be layered on later if the ledger proves it earns one." The ledger has (hub meter,
honest demotion, Wiedervorlage now feeding on the same philosophy), so this is that layer —
in its weakest sufficient form.

**Tagesplan** is a panel at the top of Home that answers "what should I practise today":
one row per thing currently asking for attention — Korrekturdrill (offen · fällig),
wackelige Dativ-Wörter, schwache Präpositionen, schwache Verben, and the lowest mastery
bands — each row deep-linking into the owning module's existing Setup or drill. It
**aggregates; it never samples**: no drill's card selection changes because Tagesplan
exists. Weakness-drawn runs remain the province of the named [Remedial drill] pattern
(prep, verb), never a silent reweighting of a curated Setup. When nothing asks for
attention, the panel renders nothing — Home stays the quiet frontispiece it is.

## Considered options

- **Read-only aggregation on Home** (chosen) — Home is where every session starts, so a
  surface there is seen without being sought; deep links reuse the Setups and their
  learner-curated filters; each source keeps its one owner and its public reader.
- **Weakness-weighted sampling inside the standard drills** — rejected: silently changing
  what a curated Setup deals breaks the learner's mental model of "I chose levels and
  count"; where weakness-drawn runs are wanted, the app already has the named Remedial
  drill shape, opt-in and honest about what it is.
- **A dedicated route/page ("Statistik", "Heute")** — rejected: a page nobody navigates
  to schedules nothing; the History dashboard already exists for retrospection. The point
  is to be in the way, gently, at session start.
- **A one-button mixed queue dealing cards across modules** — rejected here and named for
  later: that is the Mischrunde (cross-module interleaved run), which needs a renderer
  for every card shape. Tagesplan must not grow into it implicitly; if the Mischrunde
  comes, it will be its own drill consuming the same readers.

## Consequences

- Home gains its first stateful reads (Dexie + localStorage). All are fail-soft: a read
  that throws hides its row rather than breaking Home; an empty state renders nothing.
- Tagesplan imports each store's public reader (`openCorrections`/`dueCorrections`,
  `readDativeLedger`/`ledgerState`, `computeWeakPoints`, `computeVerbWeakPoints`,
  `computeDrillMastery`) — never a storage key. The stores keep their single owners.
- Band rows cover only drills in the mastery rollup's key space (DW/DAC/DAT per
  ADR-0011); other modules join the Tagesplan's band section if and when they join the
  rollup. Accepted — the other three sections are module-agnostic already.
- The panel is advice, not obligation: nothing is blocked, nothing expires, no streak
  guilt. It shows counts and links; the learner still chooses.
