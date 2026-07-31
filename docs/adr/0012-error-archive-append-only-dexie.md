# The Error archive lives in Dexie, shaped like the Supabase table it will become

The [Error archive](../../CONTEXT.md) is the first thing in the app that must outlive the
[Discussion](../../CONTEXT.md) it came from. [ADR-0005](0005-quiz-history-in-supabase.md) already
decided that this class of durable, cross-device learner data belongs in Supabase — but Supabase is
**accepted and entirely unimplemented**: there is no `@supabase/supabase-js` dependency and the only
trace in `src/` is a comment in `useSprechenTopics.ts`. Blocking the Sprechen work on building that
layer would make a speaking feature wait on an infrastructure project that has not started.

So the archive goes into **Dexie now**, behind a repository module, in the exact shape the Supabase
table will have — rather than in the shape Dexie alone would suggest.

Concretely, that means the archive is **append-only**, mirroring ADR-0005's read-all + insert-if-valid
RLS with no update or delete policies. An [Archived correction](../../CONTEXT.md) row is never
mutated. "The learner has re-practised this correction" is therefore **not** a `drilled` boolean on
the row — it is a second append-only table of correction events, and drilled-ness is derived by
joining the two. Dexie would happily let us flip a boolean; we deliberately do not, because that
boolean is precisely what would not survive the move.

The archive is **cold storage**: never read during app boot, never read while a Discussion runs. It is
queried when the learner opens the archive or a [Correction drill](../../CONTEXT.md), which is what
makes an indexed table the right shape and makes compression the wrong one — a gzipped blob has to be
fully inflated before `where('kind').equals('grammar')` can filter anything.

## Considered options

- **Dexie now, Supabase-shaped** (chosen) — append-only rows plus a correction-events table, indexed
  by kind and date, reached only through a repository module so the eventual swap touches one file.
  Costs a slightly awkward schema today in exchange for a boring migration later. Sentences stay on
  the learner's machine until Supabase is a deliberate decision rather than an inherited one.
- **Supabase now** — rejected for sequencing, not for merit: it makes the archive the *first* table in
  Supabase, ahead of history, which is what ADR-0005 is actually about. It also silently escalates
  what is world-readable under the anon key from scores and counts to the learner's **verbatim German
  sentences** (see Consequences) — a change in kind that deserves its own decision, not a side effect.
- **Dexie, modelled freely** — rejected: a mutable `drilled` flag is the simplest code today and the
  exact field that cannot move to an append-only table later. The migration cost lands precisely where
  we would have to think hardest.
- **Gzipped blob in `localStorage`, per `USER_DATA_KEYS`** — rejected once the archive had to be
  *queryable* by [Sprechen error tag](../../CONTEXT.md). Compression and `where(...)` are mutually
  exclusive, and the lazy-load property compression was bought for is something an indexed table gives
  for free.

## Consequences

- The archive does **not** ship in backup/restore. `USER_DATA_KEYS` covers `localStorage` only, and
  `useUserData.ts` states that IndexedDB-backed data is deliberately excluded. Until Supabase lands,
  clearing site data loses the archive, and it does not follow the learner to another browser.
- Every read goes through the repository module. No component or composable may reach for the Dexie
  table directly, or the Supabase swap stops being a one-file change.
- Corrections from a `spoken` [Modality](../../CONTEXT.md) are archived on the same terms as typed
  ones and are not distinguished. A mistake the speech recognizer invented is archived as readily as
  one the learner made; the per-tag counts on the archive screen therefore read as
  "mistakes **or** mishearings". This was chosen knowingly over filtering, confidence-gating, or a
  per-entry delete.
- The archive stores the learner's **full sentence** as context, so the Korrekturdrill can replay their
  own wording rather than an invented one. The app's "the conversation itself is never stored" copy is
  reworded accordingly — the conversation is discarded, the marked sentences are kept. Roughly 40% of
  what a learner says in a Discussion is retained this way, and saying so plainly is the point.
- When Supabase does land, the archive inherits ADR-0005's posture wholesale: world-readable by
  `username_key` under the shipped anon key. That is the moment the learner's own sentences become
  public, and it should be surfaced then rather than discovered.
