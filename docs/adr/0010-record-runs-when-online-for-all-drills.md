# Every drill records a Run when online; offline completions are silently unrecorded

Recording is now the norm for **all** drills — including the offline deterministic family
(Fixed prepositions, Principal parts, Verb case government) that
[ADR-0007](0007-offline-first-deterministic-drills.md) had made practice-only, and every drill of the
upcoming Da-compounds module. A finished drill attempts the Supabase insert; with no connection it
skips **silently** — no error toast, no local outbox, the session simply counts as practice. This
adopts the "record only when online, skip silently offline" option ADR-0007 explicitly deferred:
history, stats, and weak-point coverage across all drills is now worth re-coupling the deterministic
drills to the history cache ([ADR-0006](0006-sync-reactive-history-cache.md)), while a queue-and-sync
outbox remains unjustified complexity.

**Reality note (2026-07-23):** ADR-0005/0006 (Supabase history) are accepted but **not yet
implemented** — `saveQuizRun` writes to device-local `localStorage`, which works offline. Until the
Supabase migration lands, every completed drill records locally regardless of connectivity; the
"insert online, skip silently offline" rule of this ADR binds the future remote backend, not the
current store.

## Consequences

- ADR-0007's *unrecorded* decision is superseded; its offline-first deterministic design (local
  generation, local grading, zero network to practice) still stands.
- The three existing deterministic drills gain `QuizHistoryType`s and start recording — a
  retroactive change to shipped behavior.
- A drill finished offline leaves no trace in History; users comparing sessions must know recording
  is online-only. A retry round remains practice, never a Run, as before.
