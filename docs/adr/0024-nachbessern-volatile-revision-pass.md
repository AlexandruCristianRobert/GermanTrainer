# Nachbessern holds the graded text in volatile memory and marks nothing

A graded [Nachricht](../../CONTEXT.md) now offers [Nachbessern](../../CONTEXT.md): one
optional guided revision pass, directly on the result, where the learner works the run's
marked mistakes into the just-graded text before it is discarded. The grader finds the
mistakes and explains the fixes; until now the learner never *produced* the corrected
form at the moment of feedback — the moment of highest motivation. Nachbessern closes
that gap without touching the retention model.

The text lives in a **module-scoped in-memory handoff, consumed on the result page's
first mount** (read-then-clear). A reload or navigation loses the offer and the result
page degrades to exactly today's behavior. ADR-0019's boundary is thereby *scoped*, not
breached: the boundary sits at the sitting — no store (Dexie, sessionStorage,
`history.state`) ever carries the graded text, nothing survives leaving the result page,
and rereading an old text stays impossible. The Dexie row still dies the moment grading
succeeds; the result stash still carries no `textDe`.

Each correction is tracked by live local string containment over the edited text, with a
**case-preserving** normalization (punctuation/whitespace only — lowercasing would blind
the check to exactly the register and orthography fixes, *sie* → *Sie*): **offen** while
the quoted wrong wording is still present anywhere, **behoben** once the quote is gone
*and* the suggested wording is present, **geändert** (amber) when the quote is gone but
the suggestion is absent. There is deliberately no red state and no correctness claim
beyond containment; the amber copy owns the limit ("ob die neue Fassung stimmt, kann nur
die nächste Bewertung sagen"). Span offsets are dead after free editing, so containment
is checked globally — and a wrong string that occurs twice should go twice anyway.

## Considered options

- **Volatile handoff, no writes anywhere** (chosen) — the pass is a continuation of the
  grading *moment*, not access to a stored text. Zero mutation surface, smallest possible
  ADR-0019 footprint, "reload loses the offer" is the boundary working rather than a cost.
- **Carry `textDe` on the result stash** — rejected: sessionStorage survives reload, so
  it *is* persistence; the stash's missing `textDe` is ADR-0019's own enforcement and
  stays that way.
- **Mark worked corrections as nachgeübt** (a drill event per completed span) — rejected:
  *nachgeübt* means correctly retrieved after delay (ADR-0012/0013); a copy-edit performed
  with the correction on screen has near-zero retrieval strength, and counting it would
  drain the [Korrekturdrill](../../CONTEXT.md) queue of precisely its freshest items.
  Nachbessern and the Korrekturdrill are the two halves of one consolidation loop —
  immediate in-context production now, decontextualized spaced retrieval later — split
  on purpose; doing the rewrite twice is the point.
- **AI re-grade of the revised text** — rejected: pays a call to verify what the next
  real Nachricht verifies anyway, and a second verdict would make Nachbessern a shadow
  [Run](../../CONTEXT.md).

## Consequences

- Nachbessern is never a Run, never graded, never persisted; it writes to no store —
  not the archive, not the drill-events table, not the yield. Nothing about a graded
  result changes whether the pass was taken, skipped, or lost to a reload.
- The offen/geändert/behoben states are string facts, not judgements. UI copy must never
  present amber as wrong or green as verified-correct.
- Ships on the Nachricht (Teil 2) first, where short texts make the pass a ~2-minute
  habit and span-local errors keep the string check honest. The surface is deliberately
  part-agnostic — `{ text, corrections[] }` — so a later Forumsbeitrag adoption is
  wiring under this same ADR, not a new decision.
- UI copy prefers the verb form ("Korrekturen einarbeiten"); *die Nachbesserung* is
  taught in Teil 2 as Beschwerde content vocabulary (the remedy the writer demands), so
  the noun stays out of Teil 2 surfaces.
- ADR-0019's consequences gain a pointer to this scoping.
