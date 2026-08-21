# Wortschatz reviews are scheduled by stored FSRS state, not derived read-side

[ADR-0025](0025-wiedervorlage-expanding-intervals-read-side.md) chose a fixed 3/10/30-day
ladder derived read-side for the Korrekturdrill and explicitly rejected FSRS as "designed
for thousand-card decks". The Wortschatz module inverts every premise of that rejection:
its pool is a thousand-card-class deck by design (~400 seeded [Vokabel](../../CONTEXT.md)n
plus open-ended AI expansion), items vary widely in difficulty (a familiar Einzelwort vs a
five-word Wortverbindung), and the module's daily-habit economics live or die on review
efficiency — FSRS's ~20–30% fewer reviews at equal retention is hours per month at this
scale, and re-deriving schedules from an ever-growing attempt log at read time only gets
slower. So each Vokabel carries a stored FSRS card record (`ts-fsrs`, MIT, plain-JSON
state — Dexie structured-clone-safe), updated on every graded answer.

Ratings are **derived, never self-graded**: wrong → `Again`, correct-with-hint → `Hard`,
clean correct → `Good` (`Easy` unused). A local miss the AI rescues as an acceptable
variant rates `Good` and the variant is appended to the item's accepted set, so the local
matcher accepts it next time. The [Vokabelstufe](../../CONTEXT.md) (which format is asked)
is a separate axis from the schedule (when the item returns): a miss demotes one Stufe
*and* reschedules via `Again`.

## Considered options

- **Stored FSRS state via `ts-fsrs`** (chosen) — the modern scheduler (Anki's default
  since 23.10, outperforms SM-2 for >99% of benchmarked users), tiny MIT TypeScript
  dependency, per-card state is plain JSON.
- **Read-side fixed ladder like ADR-0025** — rejected: right for an archive of tens of
  bounded items, wrong for a growing deck. ADR-0025's own rejection of FSRS ("thousand-card
  decks") is the argument *for* it here.
- **Self-graded Again/Hard/Good/Easy buttons (Anki-style)** — rejected: the app grades
  objectively everywhere; asking the learner to rate themselves reintroduces exactly the
  judgment bias ADR-0025's scheduling exists to remove.
- **Half-life regression / custom forgetting model (Duolingo HLR)** — rejected: needs
  training volumes a single learner never produces.

## Consequences

- First *stored* scheduler state in the app: unlike Wiedervorlage, the schedule is not
  recomputable from the events log alone (FSRS state depends on the parameters at each
  update), so the card records are source of truth — data, not cache.
- `ts-fsrs` becomes a runtime dependency; desired retention defaults to 0.9 as a constant.
- Offline reviews still update FSRS state locally (grading is local-first per the
  Wiederholsitzung definition); only *Anwendung*-stage grading and promotion wait for
  connectivity, with due Anwendung items served in Abruf format meanwhile.
- The FSRS card object must be persisted as plain JSON (dates as ISO strings/epochs) —
  the known Dexie structured-clone constraint applies to `ts-fsrs`'s `Date` fields.
