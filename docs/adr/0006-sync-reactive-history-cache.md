# A synchronous reactive cache adapts the history API to async Supabase

The history API (`loadHistory` / `saveQuizRun` / `clearHistory`) is **synchronous** and consumed by
18 fire-and-forget writers and by readers like `useQuizStats`'s
`computed(() => computeStats(loadHistory()))` and `usePrepRemedial`'s `computeWeakPoints`. Supabase
calls are **async**. Rather than rewrite every consumer to `await` (see [ADR-0005](0005-quiz-history-in-supabase.md)
for the storage move), we adapt with a cache.

A module-level **reactive history ref** backs `loadHistory()`, which stays **synchronous** and returns
`ref.value` — so the existing `computed(() => computeStats(loadHistory()))` re-runs reactively the
moment data arrives. An async `ensureHistoryLoaded()` / `refresh()` fetches the User's latest ~200 runs
into the ref, **throttled to at most once per 60 s** via a `localStorage` timestamp+payload cache
(mirroring english-trainer's `etcache:` `{ t, v }` 60 s TTL) so 1000 refreshes in a minute hit the DB
once. `saveQuizRun()` stays fire-and-forget: it **optimistically prepends** to the ref (instant UI)
and inserts in the background, busting the cache on success. The app shell (and history/stats pages)
call `ensureHistoryLoaded()` on mount.

## Considered options

- **Make every consumer async** — rejected: touches all 18 writers and every reader, and breaks the
  synchronous reactive-stats pattern; large churn for no user-visible gain.
- **In-memory-only cache** — rejected: it wouldn't survive a page refresh, so the "load at most once
  per minute across refreshes" guarantee fails. english-trainer persists the cache in `localStorage`.
- **No throttle (load on every mount)** — rejected: the user explicitly wants at most one load per
  minute no matter how many times the page is opened or refreshed.

## Consequences

- `loadHistory()` can return data up to 60 s stale; a write busts the cache so a just-finished run
  shows immediately rather than waiting out the minute.
- A brief empty→populated transition on first load (acceptable; charts already render an empty state).
- The optimistic prepend must reconcile: replace the temporary client id with the inserted row's id on
  success, and revert + surface a toast on insert failure.
- The cache key is scoped to the active `username_key` (+ load window); a name change re-loads.
- This is the first GT data path that is remote-but-read-synchronously; future remote stores should
  follow the same ref-backed adapter rather than leaking promises into reactive `computed`s.
