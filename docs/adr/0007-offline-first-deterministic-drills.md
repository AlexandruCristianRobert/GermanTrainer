# Three new practice drills are offline-first, deterministic, and unrecorded

German Trainer's typed-answer quizzes lean on the network *at runtime*: the AI sentence quizzes call
Gemini to **generate** sentences and again to **grade** each answer ([ADR-0003](0003-verb-sentence-hints-german-from-ai.md),
[ADR-0004](0004-progressive-streaming-sentence-generation.md)), and every completed quiz is saved as
a [Run](../../CONTEXT.md) to Supabase ([ADR-0005](0005-quiz-history-in-supabase.md),
[ADR-0006](0006-sync-reactive-history-cache.md)). The primary learner, however, opens the app for a
single online page load and is then **offline with no further calls possible**. We decided the three
new drills — **[Principal parts](../../CONTEXT.md)** (Stammformen), **[Verb case government](../../CONTEXT.md)**
(Rektion), and the **Fixed prepositions** drill (**[Prepositional collocation](../../CONTEXT.md)**) —
form a distinct family that needs **zero network at runtime**: every question is built locally from
curated data plus the existing grammar engines, every answer is graded locally with a forgiving exact
match, and a finished drill is **practice, not a Run** — never sent to Supabase, never feeding
[Weak point](../../CONTEXT.md)s.

Principal parts and case government read entirely from the existing static verb data
(`src/data/verbs.ts`) and `conjugate.ts` — no new data. Fixed prepositions has no existing data, so it
gets a new **curated static seed** (`src/data/collocations.ts`, ~500 level-tagged verb/adjective/noun
entries) shipped in the bundle. Because hand-authored grammar facts will contain errors, that seed
ships only after a dedicated data-accuracy review.

## Considered options

- **Offline-first, deterministic, unrecorded** (chosen) — the only model that works under "online for
  one load, then offline." These topics (principal parts, governed case, fixed prepositions) are
  deterministic facts that don't need an LLM, and unrecorded practice already has a home in the model:
  a retry round is "practice, not a Run" per [CONTEXT.md](../../CONTEXT.md).
- **Reuse the AI sentence-quiz pattern** — rejected: AI grading is a per-answer network call, impossible
  offline; and an LLM is overkill for facts we can check against data.
- **Record like the existing word-level quizzes** (noun gender, verb translation) — rejected: a Supabase
  insert can't happen offline, and a failed insert surfaces an error toast ([ADR-0006](0006-sync-reactive-history-cache.md)) —
  exactly the wrong UX for an offline drill.
- **Record only when online, skip silently offline** — viable and a clean future upgrade, but it
  re-couples the drills to the history/cache reconciliation of [ADR-0006](0006-sync-reactive-history-cache.md)
  for little present gain; deferred.
- **Collocations as a user-editable deck (like nouns/adjectives) or AI-generated on demand** — rejected:
  collocations are closed-class grammar, not a personal vocabulary list; a static seed avoids an
  IndexedDB table, a manage UI, migrations, and any sync concern, and is the simplest path to
  rock-solid offline.

## Consequences

- A new class of drills exists that deliberately bypasses the app's AI, Supabase, history, and
  weak-point machinery. Readers must **not** assume every quiz records a Run or grades via AI — these
  three do neither, by design.
- No progress tracking for these drills (no history, no stats, no weak points). Acceptable now;
  promoting to "record when online" is a localized future change.
- They run with **no API key and no connection** — the app's first fully offline typed practice.
- `src/data/collocations.ts` becomes a curated, level-tagged source of truth whose correctness is a
  **shipping gate**: a wrong fixed case teaches wrong German.
- **Mobile is the primary target.** Each drill's phone rendering is verified at ~390px (every control
  exercised) before it is considered done — a Definition-of-Done gate, not just responsive CSS.
- The three share a local-only skeleton — setup filters → runner → per-item ✓/✗ reveal →
  retry-the-missed round — reused across all of them.
