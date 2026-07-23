# Verb levels are frequency batches drawn from a UD German-HDT-derived ranking

The verb pool (`src/data/verbs.ts`) had four hand-picked levels — A1 (86), A2 (59), B1 (64),
B2 (169) — authored from general knowledge of German frequency. To grow the pool past ~378 verbs we
decided that a **[Verb level](../../CONTEXT.md)** is a **frequency batch, not a CEFR classification**:
the existing B2 is renamed **B2.1** (its 169 verbs frozen exactly as they are), and **B2.2** is the
top **200** verbs from a published frequency ranking that are not already in any level. The ranking's
source of truth is a top-5000 verb-lemma CSV at `tools/data/verb-frequency.csv`, derived from
**UD German-HDT** (the Universal Dependencies release of the Hamburg Dependency Treebank: ~173k
sentences of news/nonfiction/web German, lemma + STTS POS tags, **CC BY-SA 4.0**): tokens with XPOS
`VV*` (main verbs — auxiliaries and modals are `VA*`/`VM*` and all already in the pool), separated
separable prefixes (`PTKVZ`, deprel `compound:prt`) re-attached to their head verb's lemma before
counting, aggregated by lemma. The CSV carries a header noting source, method, extraction date, and
license (the derived list is itself CC BY-SA 4.0). Future batches (B2.3, …) continue down the same CSV.

## Considered options

- **UD German-HDT-derived CSV** (chosen) — openly redistributable lemma + POS data, so verb
  extraction is fully mechanical and the ranking is reproducible from a committed script.
- **DeReKoGram** (IDS Mannheim, 43.2B tokens) — the first choice for corpus size, rejected after
  attempting it: the data files return 401; download requires IDS registration and a EULA
  (derekoeula@ids-mannheim.de), which puts redistribution in the same restricted class as DeReWo.
- **Model-knowledge ranking** (how the first 378 were picked) — rejected: unverifiable and
  irreproducible; two sessions would produce two different "next 200"s.
- **Routledge *A Frequency Dictionary of German*** — rejected: copyrighted; its ranking cannot be
  reproduced in the repo.
- **DeReWo lemma list (IDS)** — rejected: non-commercial license restricts redistribution, and this
  repo publishes to gh-pages, so a committed list *is* redistribution.
- **Leipzig Corpora / OpenSubtitles word-form lists** — rejected: cleanly licensed but no POS or
  lemmas, so extracting verbs would reintroduce hand curation.

## Consequences

- **Rank inversion between batches is accepted.** The original 378 were hand-picked and skipped some
  common verbs; B2.2 hoovers up those gaps first, so it contains verbs more frequent than B2.1's tail.
  The alternative — re-sorting existing levels — would break "B2.1 is exactly the B2 learners had".
- HDT is ~3M tokens (vs DeReKoGram's 43.2B) and news-heavy: ranks beyond ~2000 are sparse and the
  register skews written German. Acceptable — a batch is a frequency *band*, not a precise rank — and
  documented in the CSV header.
- A saved level selection of `"B2"` (localStorage) migrates to `"B2.1"` only — the same verb set the
  learner chose — never silently expanding to include B2.2. History [Run](../../CONTEXT.md)s recorded
  as "B2" stay untouched.
- `B2.1`/`B2.2` are app-internal batch labels: AI-facing prompt text and run labels normalize them to
  plain CEFR `B2` (`levelLabel()` in `useVerbSentenceQuiz.ts`), which also keeps new history labels
  comparable with pre-rename ones.
- The purist objection stands by design: individual B2.2 verbs may be officially B1 or C1 — the label
  claims frequency band, not certification.
- Growing the dataset by ~200 hand-authored conjugation entries makes data correctness a shipping
  gate (as with `collocations.ts`, [ADR-0007](0007-offline-first-deterministic-drills.md)): a new
  `tests/data/verbs.test.ts` enforces mechanical invariants (unique infinitives, 1:1 with
  `VERB_TIPS`, wir/sie = infinitive, separable-prefix and weak-verb consistency, explicit
  `imperativDu` for vowel-changing verbs).
