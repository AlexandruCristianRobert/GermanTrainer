# Word-hint spans come from AI-returned English surfaces

The EN→DE preposition sentence quiz highlights the preposition and the assigned theme
nouns in the English prompt and reveals their German on hover/tap. To highlight them we
need to know *where* those words sit in the AI-generated English sentence. We decided the
generation call returns the exact English surface strings it used (`prepSpanEn`,
`nounSpansEn`, one per assigned noun in order); at render time we locate each surface in
the untouched `english` string (case-insensitive, word-boundary, first non-overlapping
occurrence) and **silently drop any span that doesn't anchor**. The German reveal is built
from data we already hold (`prepGerman`, and each noun's `article + german`), so the AI is
never asked for the German side.

## Considered options

- **Local string-matching** against the preposition gloss / noun lemma — rejected: fails on
  inflections, plurals, synonyms and contractions ("onto" vs gloss "on", "tables" vs
  "table"), silently missing many highlights.
- **Inline markers** in the sentence text (e.g. `[[n:table]]`) — rejected: couples span data
  into the string we display and grade against, requiring a strip step and degrading badly
  on malformed markers.
- **AI structured surfaces** (chosen) — the AI already wrote both sentences, so it knows its
  own alignment; returning the surfaces keeps the clean sentence intact for display/grading.

## Consequences

- The generation schema, prompt, and `validateSentencePair` carry two optional fields; the
  span fields are best-effort, so a sentence with missing/invalid spans is still fully
  usable — it just shows no hints.
- Highlighting can be partial (some words anchor, some don't); this is acceptable and never
  blocks the quiz.
