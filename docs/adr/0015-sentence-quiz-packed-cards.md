# The Sentence quiz packs every requested item into one adaptive card, and pools its evidence into the existing weak points

The [Sentence quiz](../../CONTEXT.md) is the app's fifth sentence-translation drill, built
*beside* the four single-category ones (preposition, verb, da-compound, direction-words),
which stay untouched. The obvious shape for a "mixed" drill — a shuffled playlist where card
1 is a verb sentence and card 2 a preposition sentence, each reusing its module's proven
prompt — was rejected: it drills nothing the existing four don't already drill. Instead each
[Packed card](../../CONTEXT.md) contains **all** of the run's per-card category counts at
once (freshly sampled words every card), normally in 1–2 sentences, stretching to a
3–4-sentence short text when no natural shorter packing exists. The stretch is the
generator's call. The budget — at most 8 drilled items per card, 0–3 per category, 0–2
[Connector](../../CONTEXT.md)s, a warning above 6 — exists because packing is the point *and*
the failure mode: past ~8 items the AI produces contrived word-salad German, and the drill
would be rehearsing unnatural sentences.

The second half of the decision cuts against the module's otherwise strictly additive
stance: a drilled verb missed in a mixed run counts toward the **same**
[Weak point](../../CONTEXT.md)s the [Verb sentence quiz](../../CONTEXT.md) feeds, and
likewise for prepositions, theme nouns, and collocations; connectors get a tracker of their
own. The isolated alternative (a separate Sentence-only tracker) was rejected because the
same verb would read "weak" in one chart and untracked in another, and the remedial drills
would never see mixed-run evidence.

## Consequences

- **The per-category stats scorers must read mixed-run meta too.** This is the one place the
  "additive only" rule is deliberately broken. Anyone tightening module isolation should not
  "fix" the cross-read; it is the decision.
- **Grading is AI-only.** The Exact [Grading mode](../../CONTEXT.md) is deliberately not
  offered — a forgiving string match over a packed multi-sentence answer is effectively
  unpassable. The silent local fallback when AI grading fails remains, as in every drill.
- **DE→EN records less than EN→DE, by design.** A DE→EN run is judged on meaning alone: no
  error tags, no per-item attribution, no weak-point evidence. Its Run meta is thinner than
  an EN→DE Run's, and that asymmetry is intended, not an oversight.
- **Card-count presets are small (3 / 5 / 8, plus custom).** One packed card is worth ~6–8
  graded items; do not "align" the presets to the other drills' 10/15/20/25 convention.
- **The connector dataset is two-part-aware from day one.** Correlative pairs
  (*sowohl … als auch*, *zwar … aber*) ship in v1, so hint spans, the generation validator,
  and the grader all handle a connector with two placements — single-word-only assumptions
  must not creep in.
- **Direction Words are deliberately not a category.** The hin/her module is complete and its
  sentence drill stays the only place perspective adverbs are drilled.
