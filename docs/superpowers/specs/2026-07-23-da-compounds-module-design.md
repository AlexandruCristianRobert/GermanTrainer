# Da-Compounds Module (Pronominaladverbien) — Test Catalog

**Date:** 2026-07-23
**Status:** Content spec — describes what the module should contain (test types + data). No implementation details.
**Groomed:** 2026-07-23 grill session — naming, placement, selection, granularity, grading, recording (ADR-0010), and cheatsheet resolved; see §6 (decisions) and §7 (phase roadmap).
**Completed:** 2026-07-24 — all 9 phases (0–8) implemented and released, v1.12.1 → v1.12.9. All 20 tests + cheatsheet + weak points live.

A new module for German pronominal adverbs (dafür, davon, darüber, daran, …) and their
interrogative counterparts (wofür, wovon, worüber, woran, …). It covers building sentences
with them, translating EN↔DE, case tests, and the full range of skills real German courses
drill at A2–C1.

---

## 1. What the module teaches (linguistic scope)

1. **Formation:** `da` + consonant-initial preposition (dabei, dafür, damit, danach, davon,
   davor, dazu, dagegen, dadurch, daneben, dazwischen) vs. `dar` + vowel-initial preposition
   (daran, darauf, daraus, darin, darüber, darunter, darum). Same rule for the question
   forms: wobei, wofür, womit … vs. woran, worauf, worüber …
   Some prepositions form **no** compound at all: *ohne, seit, außer, gegenüber* and the
   genitive prepositions (*während, wegen, trotz*) — these are trap material.
2. **Things vs. people (the core rule):** da-compounds refer only to things, abstracts, and
   whole clauses — never to persons. Persons take preposition + personal pronoun with the
   correct case: "Ich denke **daran**" (the exam) vs. "Ich denke **an ihn**" (Karl).
3. **Questions:** things → wo(r)-compound ("**Worauf** wartest du?"); persons →
   preposition + wen/wem ("**Auf wen** wartest du?").
4. **Korrelat (cataphoric use):** the da-compound announces a following dass-/ob-/wh-clause
   or zu-infinitive: "Ich freue mich **darauf**, dich zu sehen." Per verb it is obligatory
   (bestehen darauf, es kommt darauf an, sich darauf verlassen, davon abhängen), optional
   (sich (daran) erinnern, (darauf) hoffen, (davon) träumen), or wrong
   (\*Ich weiß darüber, dass…).
5. **Case:** the compound hides the preposition's case, which resurfaces in the
   person-pronoun alternative and in article endings. Two-way prepositions in verbal objects
   are usually accusative — except the an+Dativ verbs (arbeiten an, teilnehmen an,
   leiden an, zweifeln an).

## 2. Data foundation

- **Primary source:** the existing collocation dataset (~500 verb/adjective/noun +
  preposition + case entries with levels B1/B2/C1, example sentences, and hints). The
  da-/wo-compound of each entry is a mechanical transform of its preposition, so no
  duplicate data is needed for the recall and case drills.
- **Selection — as done at the verbs:** every setup screen filters the pool with chip rows:
  - **Level** (B1 / B2 / C1 collocation levels)
  - **Word type** (verbs / adjectives / nouns)
  - **Preposition** (the 16 governed prepositions, colored with the existing
    preposition colors)
  - **Noun theme** (the noun groups, for the AI sentence tests — same as the verb
    sentence quiz)
  - Direction segmented control (EN→DE / DE→EN) and the usual count presets.
- **New content the module needs (data, not code):**
  - Person/thing marking or example pairs for the people-vs-things drills (each item needs
    an object that is clearly a person or clearly a thing).
  - Korrelat classification per verb: obligatory / optional / excluded.
  - Contrast pairs: sich freuen auf/über, leiden an/unter, bestehen auf/aus, denken an vs.
    nachdenken über, sich beschweren bei+D über+A, sich bewerben bei+D um+A, kämpfen
    für/gegen/um.
  - Homograph sentences (damit, darum, dabei, dagegen in both readings).
  - Register items (colloquial forms: "Da weiß ich nichts von", "dadrauf", "Auf was?").
  - Trap list of non-compoundable prepositions.

---

## 3. Test catalog

Legend — **Mode:** `offline` = static, deterministic, locally graded; `AI` = generated
and/or graded by the AI provider. **Answer style:** `pick` = buttons/multiple choice,
`type` = free text input. Offline tests never require typing a full free sentence — the
learner types single-word/short gaps or orders tiles; free sentence production is AI-graded
only (T14, T15, T17). Every drill records a [Run] when online and silently skips recording
offline (ADR-0010).

### Family A — Formation basics (A2)

**T1. da- or dar-? speed round** · offline · pick
Show a preposition (or a gapped sentence) and three buttons: **da-**, **dar-**, **no
compound**. Traps: \*daohne, \*daseit, \*dawährend, \*dagegenüber.
Tests: the formation rule and knowing which prepositions can't form compounds.

**T2. Compound matching** · offline · pick
Match da-compounds to sentence halves or short meanings, 4–6 pairs per screen
(e.g. "Ich warte …" → darauf; "Sie träumt …" → davon).
Tests: recognition-level verb→preposition mapping.

### Family B — Compound recall (A2–B2) — the bread-and-butter drill

**T3. Substitution gap-fill** · offline · pick (B1 mode) or type (B2 mode)
"Anita freut sich **über die bestandene Prüfung**. → Sie freut sich ___." (→ darüber).
The most common format on every surveyed site. MC distractors are other da-compounds;
typed mode also tests da/dar spelling (\*daauf, \*darmit rejected).
Tests: preposition recall + formation + anaphoric reference.

**T4. Near-neighbor discrimination** · offline · pick
Blank in a sentence, distractors drawn from verbs in the same semantic family:
denken **an** / warten **auf** / sprechen **über** / träumen **von**.
Tests: fine-grained verb→preposition mapping where confusion is likeliest.

### Family C — Case tests

**T5. Compound → case pick** · offline · pick
"Ich verlasse mich **darauf**." → which case does the hidden *auf* govern here?
Akkusativ/Dativ buttons (same mechanic as the fixed-prepositions drill).
Tests: that the compound still carries the preposition's government.

**T6. Person-pronoun case** · offline · type or pick
"Ich warte ___ (er)." → *auf ihn* (not \*auf ihm); "Sie spricht ___ (er)" → *mit ihm*.
Tests: case realized through the pronoun — the place where wrong case becomes visible.

**T7. Two-way preposition article fill** · offline · type
"Wir arbeiten an ein___ Projekt." (→ einem — an+Dat verb); "Ich warte auf d___ Bus."
(→ den). Tests: the usually-accusative rule and its an+Dativ exceptions.

### Family D — People vs. things (B1 signature skill)

**T8. Forced-choice transformation** · offline · pick (easy) or type (hard)
Replace the highlighted object: thing → da-compound, person → preposition + pronoun.
"Ich denke an **Karl**" → *an ihn*; "Wir fragen nach **dem Preis**" → *danach*.
Options in pick mode: darüber / über ihn / über sie. The #1 learner error per every source.
Tests: the animacy rule + pronoun case in one item.

**T9. Wo-question formation** · offline · type (gap-constrained)
Given a statement with a highlighted complement, complete the scaffolded question — only
the question word is typed, never the full sentence:
"Ich habe Angst vor **Prüfungen**" → "___ hast du Angst?" (→ *Wovor*); person variant →
"___ wartest du?" (→ *Auf wen*). Mixed sets force the choice.
Tests: wo/wor formation, interrogative animacy rule, wen/wem case.

**T10. Dialogue completion** · offline · type (gap-constrained)
Both slots gapped, sentence scaffolds given:
"___ wartest du? — Ich warte ___, dass endlich Ferien sind."
(→ Worauf / darauf). Tests: the interrogative↔demonstrative pairing in discourse.

### Family E — Korrelat & dass-clauses (B2 flagship)

**T11. Korrelat completion** · offline · type or pick
"Ich freue mich ___, dass du kommst." (→ darauf); "Es kommt ___ an, pünktlich zu sein."
(→ darauf). Include excluded-Korrelat traps with a "— (nothing)" option:
\*"Ich weiß darüber, dass…", \*"Ich hoffe darauf, dass…" (marked/heavy).
Tests: obligatory vs. optional vs. wrong Korrelat.

**T12. Paraphrase pairs** · offline · type (gap-constrained)
Noun phrase ↔ clause version, both gapped:
"Ich kümmere mich **um** die Einhaltung des Termins. / Ich kümmere mich **darum**, dass
der Termin eingehalten wird." Gaps are the preposition, the Korrelat, and optionally the
finite verb form — never free sentence production.
Tests: equivalence of Präpositionalobjekt and dass-clause.

**T13. Meaning contrast** · offline · pick
"Ich freue mich ___ meinen Geburtstag nächste Woche." (auf — future) vs.
"Ich freue mich ___ das Geschenk, das du mir gegeben hast." (über — present/past).
Also: leiden an (illness) / unter (suffering), bestehen auf (insist) / aus (consist).
Tests: preposition choice changes meaning.

### Family F — Sentence production & translation (headline feature)

**T14. AI sentence translation EN→DE** · AI · type
The AI generates an English sentence from a sampled collocation + selected noun theme
("I'm looking forward to the meeting with my colleagues."), the learner writes the German
("Ich freue mich auf das Treffen / darauf, …"), AI grades meaning + grammar with specific
feedback on preposition, compound form, and case. Same pattern as the verb sentence quiz.

**T15. AI sentence translation DE→EN** · AI · type
Reverse direction; grading focuses on whether the learner decoded the compound correctly
(darauf = "to it/that" in context, not "on it" literally).

**T16. Sentence assembly** · offline · pick (tiles)
Pre-inflected chunks tapped into order: [interessiert] [sich] [Mein Vater] [für Briefmarken]
→ "Mein Vater interessiert sich für Briefmarken." Accepted orders curated (fronting
variants allowed); deterministic to grade.
Tests: word order and prepositional-object/compound placement (conjugation is drilled
elsewhere).

**T17. Answer the question** · AI · type
"Freust du dich auf das Wochenende?" → "Ja, ich freue mich (sehr) darauf."
Tests: production + placement of the compound in the Mittelfeld; fronting variant
("Darauf freue ich mich schon lange") accepted.

### Family G — Advanced traps (C1)

**T18. Homograph discrimination** · offline · pick
Same word, two readings: *damit* (conjunction "so that") vs. *damit* (= mit + it);
*darum* ("therefore") vs. *darum* (object of bitten um); *dabei* (concessive "yet") vs.
*dabei* (bei-object); *dagegen* (contrastive connector) vs. *dagegen* (gegen-object).
Learner picks the reading, or picks which sentence uses the pronominal-adverb reading.

**T19. Register judgment** · offline · pick
"Da weiß ich nichts von." / "dadrauf" / "Auf was wartest du?" → learner tags:
✅ standard written / 🗣 spoken-only / ❌ always wrong (\*daauf, \*worauf for a person).
Tests: colloquial splits and doubled forms vs. genuine errors.

**T20. Relative wo-compounds** · offline · pick
"Das ist alles, ___ ich mich freue." (→ worüber — required after alles/nichts/etwas);
"Das Buch, ___ wir gesprochen haben" (→ über das — preferred with concrete nouns);
"Die Frau, ___ ich erzählt habe" (→ von der — obligatory for persons, \*wovon).
Tests: when the wo-form is required, preferred, or wrong in relative clauses.

---

## 4. Suggested difficulty path

| Stage | Tests | Skill milestone |
|---|---|---|
| A2 | T1, T2, T3 (pick) | Forms exist, da/dar rule, first verb+prep pairs |
| B1 | T3 (type), T4, T5, T8, T9, T10 | Animacy rule, wo-questions, solid recall |
| B2 | T6, T7, T11, T12, T13, T14–T17 | Case mastery, Korrelat, free production |
| C1 | T18, T19, T20 | Homographs, register, relative clauses |

## 5. Trap bank (learner errors every test's distractors should draw from)

1. Da-compound used for a person (\*"Mein Bruder? Ich warte darauf.")
2. Wo-compound used for a person (\*"Worauf wartest du?" for a person)
3. English transfer \*auf es / \*über es instead of the compound
4. Wrong preposition (freuen \*für, warten \*für, Angst \*von)
5. Wrong case after preposition + pronoun (\*mit ihn, \*auf ihm in the wait sense)
6. da/dar and wo/wor misspelling (\*daauf, \*darmit, \*darnach, \*woauf)
7. Missing obligatory Korrelat (\*"Er besteht, dass…") / overused Korrelat
   (\*"Ich weiß darüber, dass…")
8. freuen auf/über meaning swap
9. Colloquial forms in written register ("dadrauf", split "Da … von")
10. Non-compoundable prepositions as options (\*daohne, \*daseit, \*dawährend)
11. Relative-clause misuse (\*"die Frau, wovon…")
12. Compound misplaced in word order (cataphoric Korrelat belongs right before the comma)

## 6. Resolved decisions (2026-07-23 grill session)

1. **Canonical term:** *Da-compound* (German subtitle *Pronominaladverbien*); question
   forms are *Wo-compounds*. Both are now glossary entries in `CONTEXT.md`.
2. **Placement:** own top-level module ("Da-Compounds") with its own home, nav entry, and
   home-grid card — data sourced from the shared collocation dataset.
3. **Selection:** chip filters for collocation level (B1/B2/C1), word type
   (verb/adjective/noun), and preposition. No join to [Verb level]s (different scale,
   partial overlap). Noun theme chips apply to the AI sentence tests only.
4. **Granularity:** one card per test (~20 cards) grouped under family section headers on
   the module home; pick/type difficulty variants are setup toggles, not separate cards.
5. **Grading:** offline tests are gap-constrained or tile-based (see legend); free sentence
   production only in the AI-graded tests (T14, T15, T17).
6. **Recording:** every drill records a Run when online and silently skips offline —
   ADR-0010, which supersedes ADR-0007's "unrecorded" rule and retrofits the three
   existing deterministic drills (Fixed prepositions, Principal parts, Case government).
7. **Error tagging:** the AI translation drill gains a `compound` error tag feeding Weak
   points; a da-compound remedial drill is a later option.
8. **Preposition colors:** reused on reveal exactly as in the Fixed prepositions drill.
9. **Cheatsheet:** ships in an early phase (formation table, no-compound list,
   things-vs-people rule, Korrelat verb lists).

## 7. Phase roadmap

Each phase is released and user-tested before the next one starts (a per-phase
implementation plan is written when the phase is green-lit). Time cost deliberately
ignored — ordering is by dependency and pedagogy.

**STATUS: ALL PHASES COMPLETE** (released v1.12.1–v1.12.9, 2026-07-23/24; per-phase plans in
docs/superpowers/plans/). Remaining backlog lives in §8 and the phase ledgers' Minor lists.

| Phase | Contents | Gate check |
|---|---|---|
| 0 | Recording foundation: ADR-0010 retrofit — Run types + recording for the three existing deterministic drills (history is currently localStorage; the online/offline rule activates with the future Supabase backend) | The three drills appear in History with correct score/meta; retry rounds are not recorded |
| 1 | Module scaffold: routes, nav, home card, section-headed module home + **Cheatsheet** + derived da-/wo-compound data and no-compound trap list | Module navigable on phone (~390px), cheatsheet correct |
| 2 | Formation & recall drills: T1, T2, T3, T4 | Core drilling works end-to-end, records Runs |
| 3 | Case drills: T5, T6, T7 | |
| 4 | People vs things: T8, T9, T10 (+ person/thing example data) | |
| 5 | Korrelat: T11, T12, T13 (+ Korrelat classification data) | |
| 6 | AI sentence translation: T14, T15 (+ `compound` error tag, weak points) | |
| 7 | Production extras: T16 tiles, T17 answer-the-question (AI) | |
| 8 | Traps: T18, T19, T20 (+ homograph/register data) | |

## 8. Out of scope (possible later phases)

- hier-compounds (hierfür, hiermit — formal register variant)
- Genitive-preposition collocations (deliberately excluded from the collocation data)
- Narrative-context cloze with word bank (a story-length variant of T3)
- Spaced repetition of missed items across sessions (the app currently has retry rounds
  and weak-point stats only)
