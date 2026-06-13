# Verb-sentence word hints take their German from the AI

The verb sentence quiz (EN→DE) highlights every [Drilled verb] and *every* noun —
assigned theme nouns **and** incidental ones — in the English prompt, revealing the
German on hover/tap. Incidental nouns ("the cat", "the morning") aren't in our store,
so we cannot build their German from stored data. We decided the generation call
returns, per highlighted word, the exact English surface it used, that word's German
**dictionary form** (a verb infinitive; an article + noun), and its `kind`
(`verb` | `noun`). At render time we anchor each surface in the untouched `english`
string with the existing `buildHintSegments` (case-insensitive, word-bounded, first
non-overlapping match) and reveal the AI-supplied German.

This **reverses ADR-0001's** decision that the German side is always built from data we
already hold and *"the AI is never asked for the German side"* — but only for this quiz.
The preposition sentence quiz keeps its data-derived reveals; ADR-0001 still governs it.

## Considered options

- **AI returns German for every highlighted word** (chosen) — the only way to hint
  incidental nouns, and the AI already wrote both sentences so it knows the exact forms
  it used. Costs a few extra fields per item in a response we're already fetching.
- **Reveal only stored words** (drilled verbs + theme nouns), leaving incidental nouns
  highlighted but inert — keeps ADR-0001, but produces silent dead highlights and an
  inconsistent UX, and doesn't help the learner produce the *whole* German sentence.
- **Pure visual highlighting, no reveal** — cheapest, but drops the "stuck → peek the
  word" scaffold the prep quiz established and the learner asked to keep.
- **Local alignment of the German reference to English surfaces** — rejected for the
  same reasons ADR-0001 rejected local string-matching: inflection, plurals, synonyms,
  and word-order drift make it silently miss many words.

## Consequences

- The verb generation schema, prompt, and validator carry a per-item highlight array of
  `{ surface, german, kind }`. Like ADR-0001's span fields these are **best-effort**: an
  entry that doesn't anchor, or is missing, simply doesn't render — the quiz stays usable.
- AI-supplied German can occasionally be wrong. For drilled verbs and assigned theme
  nouns we hold the canonical German and **prefer our own**, trusting the AI only for
  incidental nouns — bounding the blast radius of a bad form.
- Two reveal-sourcing models now coexist in the app. Readers must **not** assume the
  prep rule ("never ask the AI for German") holds app-wide; it is scoped to that quiz.
- See [CONTEXT.md](../../CONTEXT.md) for **Word hint**, **Drilled verb**, and
  **Incidental noun**, and [ADR-0001](0001-word-hint-spans-from-ai-surfaces.md) for the
  decision this one scopes-out.
