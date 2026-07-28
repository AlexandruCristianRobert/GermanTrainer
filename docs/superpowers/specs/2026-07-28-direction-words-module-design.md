# Direction Words Module (hin & her) — Test Catalog

**Date:** 2026-07-28
**Status:** Content spec — describes what the module should contain (test types + data). No implementation details.
**Groomed:** 2026-07-28 grill session — scope, placement, naming, scene diagrams, filters, error
tagging, and phasing resolved; see §6 (decisions) and §7 (phase roadmap). Glossary terms added
to `CONTEXT.md` under *Direction words*.

A new module for the German hin/her system: the perspective rule (*hin* = away from the
speaker, *her* = toward the speaker), the compound pairs (*hinein/herein*, *hinauf/herauf*, …),
the colloquial r-forms (*rein, raus, rauf, runter, rüber*), the question and pointer words
(*wohin, woher, dahin, dorthin*), lexicalized prefix verbs (*herstellen*, *hinweisen*), and the
idioms (*hin und her*, *hin und wieder*). It covers building sentences with them, understanding
usage, and drilling the distinctions German courses test at A2–C1.

---

## 1. What the module teaches (linguistic scope)

1. **The perspective rule:** *hin* marks motion away from the speaker's position, *her* motion
   toward it: "Komm **her**!" vs. "Geh **hin**!". English transfer trap: "come here" →
   \*"Komm hier!" (correct: *Komm her!*).
2. **Compound pairs ([Adverb pair]s):** hin/her + directional element — *hinein/herein* (in),
   *hinauf/herauf* (up), *hinaus/heraus* (out), *hinunter/herunter* (down),
   *hinüber/herüber* (across), *hinab/herab* (down, elevated register) — plus the unpaired
   *herum*, *hervor*, *hindurch*, *hinterher*. Two independent choices per gap: the
   perspective side (hin vs. her) and the direction part (-auf vs. -aus …).
3. **R-forms:** spoken German contracts the compounds to *rein, raus, rauf, runter, rüber*,
   collapsing the hin/her distinction entirely. Register skill: standard in speech, marked in
   writing, never wrong the way \**hinrein* is wrong.
4. **Questions & pointers:** *wohin/woher* vs. static *wo* ("Wo bist du?" vs. "Wohin gehst
   du?"); split variants ("Wo kommst du **her**?"); pointer words *dahin, daher, dorthin*.
5. **Lexicalized prefix verbs:** hin-/her- prefixes whose direction meaning is gone —
   *herstellen* (produce), *hinweisen* (point out), *hinrichten* (execute), *herausfinden*
   (find out), *hervorheben* (emphasize), *hinfallen* (fall down). Vocabulary, not rule: the
   perspective rule cannot be used to guess these.
6. **Idioms:** *hin und her* (back and forth), *hin und wieder* (now and then), *vor sich hin*
   (to oneself), *hinter … her* (in pursuit of), temporal *her* ("Das ist lange her"),
   *her mit …!* (hand it over).

## 2. Data foundation

Unlike da-compounds (derived from the collocation dataset), **all drill data is new seed
data** — the app holds no directional-adverb content today (only six hin/her separable-prefix
verbs in the verb pool, a starting point for §1.5).

- **Scene-anchored item bank** (T1, T2): sentence with gap, accepted answer(s), level, and a
  [Scene diagram] reference — scene archetype plus speaker position and motion direction. The
  diagram fixes the speaker's location where the sentence alone would be ambiguous
  ("Er ging die Treppe ___" needs to know whether the narrator waits above or below). Each
  item carries a one-line text description of the scene as the accessible fallback.
- **Scene archetypes:** a small reusable set (~6): stairs, doorway, window, street-crossing,
  hill, room. Parametric — the same archetype renders every speaker/motion combination.
  Deterministic and theme-aware; no per-item artwork, no binary assets.
- **Question-word items** (T3): statement or answer plus a gapped question; mixed static
  (*wo*) and motion (*wohin/woher*) targets, split-variant answers accepted where idiomatic.
- **R-form register items** (T4): r-form ↔ full-form mappings and register-judgment sentences
  (standard written / spoken-only / always wrong).
- **Lexicalized verb bank** (T5): verb, actual meaning, and the tempting literal-directional
  misreading as distractor material.
- **Idiom bank** (T6): idiom, meaning, gapped example sentences; near-miss distractors
  (*hin und her* vs. *hin und wieder*).
- **Tile sentences** (T7): pre-inflected chunks with curated accepted orders.
- **AI tests** (T8, T9) reuse the existing noun themes and sample [Adverb pair]s; no stored
  sentences.

**Selection — chip filters on setup screens:**
- **Level** (A2 / B1 / B2 / C1, tagged per item)
- **Adverb pair** (on T2 and T4, colored chips — the analogue of da-compounds' preposition
  chips) so a learner can isolate a confused pair (*hinauf/herauf*)
- **Noun theme** (AI sentence tests only, as in the verb sentence quiz)
- The usual count presets.

---

## 3. Test catalog

Legend — **Mode:** `offline` = static, deterministic, locally graded; `AI` = generated and/or
graded by the AI provider. **Answer style:** `pick` = buttons/multiple choice, `type` = free
text. Offline tests never require a full free sentence; free production is AI-graded only
(T8, T9). Every drill records a [Run] when online and silently skips recording offline
(ADR-0010).

### Family A — The perspective rule (A2)

**T1. Hin or her?** · offline · pick
A [Scene diagram] plus a gapped sentence; two buttons (**hin** / **her**), occasionally a
third trap (**hier**) for the "come here" transfer error.
"Sie steht am Fenster und ruft: Komm ___!" (→ her).
Tests: the bare perspective rule, anchored to a visible speaker position.

### Family B — Compound pairs (A2–B2) — the bread-and-butter drill

**T2. Compound gap-fill** · offline · pick (B1 mode) or type (B2 mode)
Scene diagram + gapped sentence; the answer is a full compound.
"Oma ruft: Komm ___!" — the diagram shows Oma upstairs and you below (→ herauf).
Pick-mode distractors cross both axes: wrong side (*hinauf*), wrong part (*heraus*),
misformed (\**hinrein*). Typed mode also rejects misspellings.
Tests: perspective side + direction part as two independent choices.

### Family C — Questions & pointers (A2–B1)

**T3. Wo, wohin or woher?** · offline · pick or type (gap-constrained)
"___ gehst du? — Zum Bahnhof." (→ Wohin); "___ bist du gerade? — Im Büro." (→ Wo);
"___ kommst du so spät? — Aus der Stadt." (→ Woher). Split variants accepted where
idiomatic ("Wo kommst du her?"). Pointer items: "Fährst du nach Rom? — Ja, ich fahre
___ ." (→ dahin/dorthin).
Tests: static vs. motion, source vs. goal, and the pointer words.

### Family D — Register (B1–B2)

**T4. R-forms & register** · offline · pick
Two item shapes: (1) expand an r-form — *runter* stands for which full forms? (both
*hinunter* and *herunter*); (2) register judgment on a sentence — ✅ standard written /
🗣 spoken-only / ❌ always wrong ("Komm rüber!" 🗣; \*"Er ging hinrein" ❌; essay register
with *raus* 🗣-misused).
Tests: the contraction mappings and where they belong — same mechanic as da-compounds T19.

### Family E — Production (B1–B2)

**T5. Sentence assembly** · offline · pick (tiles)
Pre-inflected chunks tapped into order: [kommt] [Der Hund] [ins Haus] [herein] →
"Der Hund kommt ins Haus herein." Accepted orders curated (fronting variants allowed);
deterministic to grade.
Tests: adverb placement in the sentence bracket (directional adverb sits at the clause end;
split question forms).

**T6. AI sentence translation EN→DE** · AI · type
The AI generates an English sentence from a sampled [Adverb pair] + selected noun theme
("She looked out of the window and called me up to her."), the learner writes the German,
the AI grades meaning + grammar with specific feedback on the [Direction error tag] axes:
perspective side, compound choice, placement. Same pattern as the verb sentence quiz.

**T7. AI answer-the-question** · AI · type
"Wohin fährst du im Sommer?" / "Dein Freund steht unten — was rufst du ihm zu?" → free
typed answer that must deploy a perspective adverb correctly; fronting variants accepted.
Tests: contextual production where the learner chooses the perspective themselves.

### Family F — Traps (B2–C1)

**T8. Directional or lexicalized?** · offline · pick
"Die Firma stellt Möbel her." → does *her* mean "toward the speaker"? (no — *herstellen* =
produce). Meaning-match and reading-discrimination items over the lexicalized verb bank;
includes verbs where both readings exist in different sentences (*hinweisen* vs. literal
*hin + weisen*). Same mechanic as da-compounds T18 homographs.
Tests: recognizing when the perspective rule does not apply.

**T9. Idiom gap-fill** · offline · pick
"Wir überlegten lange ___ ___ ___." (→ hin und her); "___ ___ ___ gehe ich ins Kino."
(→ Hin und wieder); "Das ist schon Jahre ___." (→ her). Near-miss distractors swap the
idioms for each other.
Tests: the fixed expressions as vocabulary, incl. temporal *her*.

---

## 4. Suggested difficulty path

| Stage | Tests | Skill milestone |
|---|---|---|
| A2 | T1, T3 (pick) | Perspective rule, wo/wohin/woher |
| B1 | T2 (pick), T3 (type), T4 | Compound pairs, r-form mappings |
| B2 | T2 (type), T5, T6, T7 | Spelling-exact compounds, placement, free production |
| C1 | T8, T9 | Lexicalized readings, idioms, register mastery |

## 5. Trap bank (learner errors every test's distractors should draw from)

1. English transfer \*"Komm hier!" (→ her)
2. Wrong perspective side: *herauf* where the speaker is below (→ hinauf)
3. Wrong direction part: *hinaus* for upward motion (→ hinauf)
4. Misformed compounds: \**hinrein*, \**herrunter*, r-form + hin/her doubling (\**hinrunter*)
5. R-form in formal writing ("Ich ging raus" in an essay)
6. Static/motion confusion: \*"Wohin bist du?", \*"Wo gehst du?" (goal sense)
7. *woher* answered with a goal / *wohin* with a source
8. Lexicalized verbs read directionally (*herstellen* ≠ put here; *hinrichten* ≠ direct there)
9. Idiom swap: *hin und her* ↔ *hin und wieder*
10. Adverb misplaced in the bracket (\*"Er herein kommt", compound not clause-final)
11. Pointer confusion: *daher* (= therefore, homograph) read as motion in the wrong context

## 6. Resolved decisions (2026-07-28 grill session)

1. **Scope:** everything — perspective rule, compound pairs, r-forms, question/pointer
   words, lexicalized prefix verbs, idioms. All first-class drill material.
2. **Placement:** own top-level module, display title **Direction Words**, with home card,
   nav entry, section-headed module home, and cheatsheet — the da-compounds pattern.
3. **Naming:** canonical glossary term **[Perspective adverb]** (user's pick over
   "directional adverb"); module title "Direction Words" is explicitly fenced off from the
   existing [Direction] term (EN→DE/DE→EN). New glossary entries: Perspective adverb,
   Adverb pair, R-form, Lexicalized prefix verb, Scene diagram, Direction error tag.
4. **Catalog:** full nine tests (T1–T9), phased.
5. **Scene cue:** a visual [Scene diagram] fixes the speaker's position for T1/T2 —
   parametric reusable scene archetypes (~6), data-driven per item, deterministic,
   theme-aware, with a one-line text description as the accessible fallback. Chosen over
   in-sentence cues, per-item artwork, emoji, and AI-generated images.
6. **Filters:** level chips (A2–C1), [Adverb pair] chips on T2/T4, noun theme on the AI
   tests, count presets. No direction control — T6 is EN→DE production by design.
7. **Grading & recording:** offline drills deterministic and gap-constrained (ADR-0007);
   every drill records a [Run] when online, silently skips offline (ADR-0010). No new ADRs
   needed — this module changes no app-wide policy.
8. **Error tagging:** one new `direction` tag ([Direction error tag]) beside the reused
   conjugation/case/word-order/noun/typo tags; [Weak point]s track the [Adverb pair].
9. **Cheatsheet:** ships in phase 1 — perspective rule with scene diagram, compound-pair
   table, r-form register table, wo/wohin/woher, lexicalized verb list, idiom list.
10. **Phasing:** strictly pedagogical — all offline mastery before free production (chosen
    over pulling the AI sentence tests forward).

## 7. Phase roadmap

Each phase is released and user-tested before the next one starts (a per-phase
implementation plan is written when the phase is green-lit).

| Phase | Contents | Gate check |
|---|---|---|
| 1 | Module scaffold: routes, nav, home card, section-headed module home + **Cheatsheet** + scene archetype components + seed data schema | Module navigable on phone (~390px), cheatsheet correct, all archetypes render in both themes |
| 2 | Perspective core: T1, T2, T3 (+ scene-anchored item bank, question-word items) | Core drilling works end-to-end with scene diagrams, records Runs |
| 3 | Register & offline production: T4, T5 (+ r-form items, tile sentences) | |
| 4 | AI production: T6, T7 (+ `direction` error tag, weak points per adverb pair) | Grader feedback names the perspective/compound/placement axis that failed |
| 5 | Traps: T8, T9 (+ lexicalized verb bank, idiom bank) | |

## 8. Out of scope (possible later phases)

- hier-compounds as directional contrast (*hierher*, *hierhin*) beyond the T1 "hier" trap
- *daher/dahin* homograph drills (therefore/hence readings) — trap material noted in §5.11,
  no dedicated test yet
- Elevated/archaic forms (*hinab/herab* beyond passive recognition, *empor*, *hernieder*)
- A da-compounds-style remedial drill blending formats from direction weak points
- Spaced repetition of missed items across sessions (app-wide gap, same as da-compounds §8)
