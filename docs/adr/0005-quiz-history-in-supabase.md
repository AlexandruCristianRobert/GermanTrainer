# Quiz history lives in Supabase under a no-auth name identity

German Trainer is a static (gh-pages) Vue app, and quiz history was device-local `localStorage`
(`gt:quizHistory`, 100-entry FIFO) — so a learner's progress was siloed to one browser. We decided
to move history to a shared **Supabase** Postgres table (reusing the existing english-trainer
project), read and written **directly from the browser** with the publishable **anon key** baked
into the build via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

A learner is a [User](../../CONTEXT.md) identified **only** by a self-chosen display name kept in
`localStorage` (`gt:user`); every run row carries `username` plus a normalized
[Username key](../../CONTEXT.md). There is **no authentication** — anyone typing the same name reads
and adds to that name's history (honor-system), the same model as english-trainer's ADR-0001. RLS is
enabled with **read-all** + **insert-if-valid** policies and **no update/delete** policies, so
history is **append-only**. A [Run](../../CONTEXT.md) is stored as typed columns
(`username`, `username_key`, `type`, `started_at`, `finished_at`, `duration_ms`, `count`, `correct`,
`created_at`) plus a single `meta jsonb` column holding the rest of the nested meta bag.

## Considered options

- **Stay on localStorage** — rejected: history is siloed per browser with no cross-device continuity;
  the user explicitly asked to adopt the english-trainer DB model.
- **Authenticated users (Supabase Auth)** — rejected: the user explicitly wants zero security and
  name-sharing; auth adds friction and an account concern a static app is trying to avoid.
- **Flat column-per-field schema** (english-trainer style) — rejected: GT's `meta` is ~49 nested
  fields/arrays/records across 20 quiz types; columns would explode and need a migration on every
  `meta` change. Typed top-level columns + `meta jsonb` chosen instead.
- **Allow scoped deletes** (`delete where username_key = …`) — rejected for now: append-only mirrors
  english-trainer's insert-only posture; the History page's "Clear history" button is removed.

## Consequences

- The anon publishable key ships in the static bundle (expected for this model). All history is
  world-readable and world-writable-by-name; impersonation and clobbering are possible **by design**.
- The **Clear-history** button is removed (no delete policy); runs are permanent. The lone
  `clearHistory` caller goes away.
- The client loads the **latest ~200 runs** per `username_key`; weak-points/stats span that window —
  a documented widening of [ADR-0002](0002-per-item-tracking-prep-sentence.md)'s ~100-run recency.
  The DB retains everything.
- Existing device-local history is **not** migrated — a fresh start under the chosen name.
- A `hasSupabase` flag preserves the old `localStorage` behavior when env keys are absent (dev/offline).
- The synchronous history API is preserved via a reactive cache — see
  [ADR-0006](0006-sync-reactive-history-cache.md).
