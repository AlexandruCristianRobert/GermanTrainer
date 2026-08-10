# Dativ — a module for the whole dative territory

Date: 2026-08-11 · Status: approved

## Problem

The app can already tell a learner *that* `helfen` governs the dative — the Verbs module's
Rektion drill (`CaseGovernmentRunner.vue`) asks "which of six cases does this verb take?"
and grades it. What it cannot do is make the dative *stick*, for three reasons.

**1. The pool cannot support the topic.** `src/data/verbs.ts` holds 578 verbs, of which
only **15** are tagged `case: "dative"` — *antworten, helfen, gefallen, schmecken,
gehören, drohen, gelingen, schaden, vertrauen, entsprechen, zustimmen, dienen, folgen,
fehlen, passen*. The canonical teaching set is ~45 verbs. **29 are absent from the pool
entirely**, including the A1/A2 staples `danken`, `zuhören`, `passieren`, `wehtun`,
`raten`, `gratulieren`, `begegnen`, `verzeihen`, `widersprechen`, `ähneln`, `genügen`,
`einfallen`. `stehen` is mis-tagged `case: "none"` although it is dative in *Das Kleid
steht dir*. `glauben` and `vergeben` sit in `varies`, which the Rektion drill deliberately
excludes — so two of the most instructive dative verbs are unreachable by design.

**2. Recognition is not the failure mode.** A 6-way "pick the case" question is a
recognition task. Research on L2 German case acquisition locates the failure in
*production*, driven by the first-noun strategy and L1 transfer — learners assign a
subject role by position rather than by morphology, and English's transitive
*help / follow / thank / answer / trust* pulls them straight into the accusative. A drill
that only asks for a label never exercises the thing that breaks.

**3. Five distinct skills hide behind "learn the dative verbs."** Membership, form
production, resisting the English pull, inverting the experiencer verbs
(*Die Schuhe gefallen mir* — the thing is the subject and controls agreement), and telling
near-twins apart (*antworten*/*beantworten*). They fail independently and need separate
drills. A single list-based quiz conflates all five.

Meanwhile the progress machinery this needs already exists: `useDrillMastery.ts` +
`gt:drillTotals` (ADR-0011) gives lifetime-stable mastery bands immune to the 100-run
history trim, and `drillCatalogue.ts` gives the numbered-family hub layout that Direction
Words and Da-Compounds render from.

## Research basis

- **Item bank size.** EasyDeutsch's list of 45 dative verbs, levelled A1–C1, is the
  reference set. Most sources put "true" dative verbs at ~50.
- **The teaching hook.** Popular resources say the set is unpredictable and must be
  memorised. The linguistics literature offers more: the dative marks an **affected
  person**, in three semantic families — RECIPIENT/BENEFICIARY, EXPERIENCER, and CO-AGENT
  (Wegener 1985 reads *helfen* as action–reaction). Sharper still, many dative verbs have
  a **swallowed accusative**: *antworten* = give [an answer] to sb, *danken* = give
  [thanks] to sb, *raten* = give [advice] to sb. The dative survives because it was always
  the *indirect* object; the direct one got absorbed into the verb. This is the same
  mechanism as the existing [Fixed-preposition core idea] → [Core-idea hint] →
  [Core-idea explanation] chain, transplanted to verbs.
- **The signature errors.** `*Ich gefalle das Buch` (experiencer taken as subject),
  `*Die Schuhe gefällt mir` (agreement with the dative rather than the nominative),
  accusative under English pull, and `*Ich werde geholfen` (dative verbs have no personal
  passive — *Mir wird geholfen* / *Es wird mir geholfen*).
- **Boundary.** The **free datives** (commodi / possessivus / ethicus, per Grammis/IDS)
  are optional adjuncts, not verb complements — learners conflate them with dative-verb
  objects, so the contrast is teachable content rather than a footnote.

## Scope

The module covers the dative territory that no existing module owns. It **assumes**
dative morphology and **teaches** dative triggers and sentence shape.

Deliberately excluded, because already shipped:

| Content | Existing home |
|---|---|
| Dative prepositions (*aus, bei, mit, nach, seit, von, zu*) | Prepositions · Case quiz, Article quiz |
| Two-way prepositions, dative side (location) | Prepositions · TwoWay quiz |
| Fixed collocations governing dative (*Angst vor + Dat*) | Prepositions · Collocations |
| Dative morphology — *dem/der/den+n*, adjective endings, pronoun tables | Declension · Article fill, Adjective endings, Pronoun forms, Case recognition |
| "Which of six cases does this verb govern?" | Verbs · Rektion |

The cheatsheet cross-links out to each of these rather than restating them.

## Language

New glossary terms, to be added to `CONTEXT.md` under a `### Dative` heading.

**Dative verb** (Dativverb):
A verb whose *only* object is dative — *helfen*, *danken*, *begegnen*. The absence of an
accusative object is what defines the class: a verb taking both (*geben*) is a
[Ditransitive verb], not a dative verb. Membership is unpredictable from meaning and
unpredictable from English, which is why the module tracks it per verb rather than by
rule. ~45 members, the module's primary item bank.
_Avoid_: dative-only verb (redundant), indirect-object verb, Dativobjekt-Verb

**Semantic family**:
One of the three readings the dative gives its object across the [Dative verb] set —
`recipient` (*danken*, *antworten*, *raten*), `experiencer` (*gefallen*, *schmecken*,
*wehtun*), `co-agent` (*helfen*, *folgen*, *widersprechen*). A memory hook, not a rule:
membership is still memorized. The organizing spine of the **Dativ cheatsheet**, the way
[Fixed-preposition core idea] organizes the preposition cheatsheet. Stored per verb as
`family`.
_Avoid_: semantic role, category, group, class

**Swallowed accusative**:
The hook explaining why a [Dative verb] governs the dative: an accusative object was
absorbed into the verb's own meaning, leaving the indirect object behind — *antworten* =
give [an answer] to sb, *danken* = give [thanks] to sb. Applies to most `recipient`-family
verbs and some `co-agent` ones; it does **not** apply to the `experiencer` family, and the
data must not claim it does. The content of the [Core-idea explanation] for this module.
_Avoid_: implied object, dropped object, hidden accusative

**Inverted experiencer**:
A [Dative verb] of the `experiencer` family where the *thing* is the nominative subject
and controls verb agreement, while the person is the dative object — *Die Schuhe gefallen
mir*, *Das Essen schmeckt mir*. The mirror of the English construction, and the source of
the two errors the module's family IV exists to kill: `*Ich gefalle das Buch` (person
taken as subject) and `*Die Schuhe gefällt mir` (agreement with the dative). Flagged per
verb as `experiencer`.
_Avoid_: reversed verb, backwards verb, psych verb, gefallen-type

**Twin verb**:
A near-synonym of a [Dative verb] that governs the *accusative* instead, usually formed by
prefixing — *antworten*/*beantworten*, *folgen*/*verfolgen*, *zuhören*/*hören*,
*helfen*/*unterstützen*. The pair is the unit family V drills. Stored per verb as `twin`;
both members must genuinely differ in governed case per `verbs.ts`, never an invented
contrast.
_Avoid_: pair, minimal pair (that is the drill format), synonym, prefix variant

**English pull**:
The property of a [Dative verb] whose English equivalent takes a plain direct object, so
L1 transfer pushes the learner toward the accusative — *help*, *follow*, *thank*,
*answer*, *trust*, *congratulate*, *contradict*, *resemble*. The highest-yield trap set;
flagged per verb as `englishPull` and the basis of family III.
_Avoid_: L1 interference, false friend, transfer error, English trap

**Ditransitive verb** (Verb mit Dativ und Akkusativ):
A verb taking both a dative and an accusative object — *geben*, *erklären*, *schenken*.
36 already carry `case: "dative+accusative"` in the pool. Distinguished from a
[Dative verb] in that its dative is *predictable* from the recipient role and needs no
memorizing — so it is band-tracked only, never entered in the [Item ledger]. Its own trap
is [Object order].
_Avoid_: double-object verb, dative-accusative verb, two-object verb

**Object order**:
The rule governing the sequence of a [Ditransitive verb]'s two objects: dative before
accusative by default (*Ich gebe dem Kind das Buch*), but **accusative before dative when
both are pronouns** (*Ich gebe es ihm*). The subject matter of T8 and the source of the
`object-order` [Dative error tag].
_Avoid_: word order (that is the general concept), pronoun order (only the exception),
object sequence

**Free dative** (freier Dativ):
An *optional* dative adjunct the verb does not require, in three readings — `commodi`
(to whose benefit: *Ich trage dir den Koffer*), `possessivus`/Pertinenzdativ (an
inalienable possessor: *Wasch dir die Hände*), `ethicus` (an emotionally involved
non-participant, near-particle, almost only *mir*/*dir*: *Sei mir bloß vorsichtig!*).
Contrasted against a [Dative verb]'s obligatory object — dropping a free dative leaves a
grammatical sentence, dropping a dative verb's object does not. That test is what family
VIII drills.
_Avoid_: optional dative, adverbial dative, extra dative

**Dative error tag**:
A classification the grader assigns to a wrong answer in the Dativ module, the module's
counterpart of [Verb error tag]. One of: `case` (accusative — or any wrong case — where
dative is required), `subject` (an [Inverted experiencer]'s subject or agreement wrong),
`twin` (the [Twin verb] used instead of the dative one, or vice versa), `object-order`
([Object order] violated), plus the reused `conjugation`, `word-order`, `noun`, and `typo`.
A single answer may carry several. `case` and `subject` feed [Weak point]s per verb.
_Avoid_: dative mistake, case error (that is one tag, not the set)

**Item ledger**:
The module's per-item lifetime progress store (`gt:dativeLedger`) — one entry per
memorization item, meaning the ~45 [Dative verb]s plus the ~12 dative-governing
adjectives, ~57 in total. Each entry is `new` (never encountered), `wackelig`, or
`gesichert`. Drives the hub's `31 / 57 gesichert` meter. Lifetime-scoped for the same
reason ADR-0011 gives, but keyed by *item* where ADR-0011's rollup is keyed by *drill*.
Rule-driven families — [Ditransitive verb]s, [Free dative]s, the passive consequence — are
band-tracked only and never appear in the ledger, because there is no list to secure.
_Avoid_: mastery (that is the per-drill band), progress store, SRS, verb ledger (it holds
adjectives too)

**Secured item** (gesichert):
An [Item ledger] entry whose **last three encounters were all correct**, across any drill.
An entry with encounters but no clean streak of three is `wackelig`; one with none is
`new`. A single miss demotes a secured item, and it must earn three clean encounters back.
Chosen over an accuracy-over-a-floor rule so the meter reads current command rather than
accumulated volume.
_Avoid_: mastered (collides with the per-drill mastery band), learned, known, complete

## The ladder — 10 families, 13 drills

Families are the five failure modes, easiest to hardest, then the wider dative territory.
This mirrors how DW/DAC families already work (skills, not content buckets). [Semantic
family] groupings live in the cheatsheet and the core-idea hints, not the spine; CEFR
level is a setup filter, like [Verb level].

```
I    Der betroffene Mensch      the rule
     T1  Dativ oder Akkusativ?          A2   45 verbs + acc distractors, 2-way, fast

II   Die Form am Verb           produce the object
     T2  Verb → Dativobjekt             A2   dem/der/den+n, ihm/ihr/ihnen, meinem

III  Der englische Sog          L1 interference — highest yield
     T3  Fallen-Karten                  B1   help/thank/follow/answer/trust/
                                             congratulate/listen to/contradict/resemble

IV   Umgekehrte Verben          inverted experiencers
     T4  Wer ist Subjekt?               B1   Die Schuhe gefallen mir — agreement
     T5  Produktion                     B1   gefallen schmecken fehlen gehören
                                             passen wehtun einfallen gelingen

V    Zwillinge                  twin verbs & the boundary
     T6  Zwillingspaare                 B2   antworten|beantworten · folgen|verfolgen
                                             zuhören|hören · glauben+Dat|+Akk
                                             gehören+Dat|gehören zu · helfen|unterstützen

VI   Zwei Objekte               ditransitives
     T7  Welches Objekt?                A2   Ich schenke dem Bruder das Buch
     T8  Objektfolge                    B1   Ich gebe es ihm — AKK before DAT

VII  Dativ ohne Objekt          adjectives & predicative
     T9  Dativ-Adjektive                B1   mir ist kalt · das ist mir wichtig /
                                             peinlich / egal / ähnlich / treu / klar / leid

VIII Freier Dativ               optional datives
     T10 Freier Dativ                   C1   commodi · possessivus · ethicus,
                                             against a real dative-verb object

IX   Im Satz                    production
     T11 Satzübersetzung                B2   EN→DE, AI-graded, all families  [AI]

X    Folgen                     B2/C1 consequences
     T12 Kein persönliches Passiv       B2   Mir wird geholfen / Es wird mir geholfen,
                                             never *Ich werde geholfen
     T13 Reflexiver Dativ               B2   ich wasche mir die Hände · ich kaufe mir

A    Spickzettel                Ref  the dative map by [Semantic family], plus
                                     cross-links out to Prepositions & Declension
```

T1–T10, T12, T13 are deterministic and offline per ADR-0007. T11 is the only AI drill,
streamed per ADR-0008 and ADR-0004.

## Architecture

```
src/modules/dative/
  DativeHome.vue            hub — 31/57 meter, item ledger, family panels I–X
  DativeCheatsheet.vue      card A
  {13 drills}Setup.vue / {13 drills}Runner.vue
  DativeResult.vue          shared result page where the shape allows

src/data/
  dativeVerbs.ts            side-table keyed by VERBS.german
  dativeItems.ts            item banks T1–T6
  dativeAdjectives.ts       family VII
  dativeFree.ts             family VIII
  dativeConsequences.ts     T12 passive, T13 reflexive dative

src/composables/
  useDativeDrill.ts         shared deterministic sampling + grading
  useDativeSentenceQuiz.ts  T11 only
  useDativeStats.ts         weak points, 100-run window per ADR-0002
  useDativeLedger.ts        the item ledger — the one new store
```

`dativeVerbs.ts` is a **side-table**, following the `verb-tips.ts` and `verb-senses.ts`
precedent: it holds only dative-specific teaching data and keys into `VERBS.german` for
the verb itself, its level, and its conjugation. `verbs.ts` stays the single source of
truth for what a verb *is*.

```ts
export interface DativeVerbEntry {
  family: 'recipient' | 'experiencer' | 'co-agent'
  /** ≤ 90 chars, ≤ 14 words, unique — same contract as coreIdeaHint. */
  coreIdeaHint: string
  /** Unpacks the mechanism, then names the verb and case. Shown only on a miss. */
  coreIdeaExplanation: string
  /** Accusative near-synonym, exactly as in VERBS.german, or absent. */
  twin?: string
  /** English equivalent takes a plain direct object. */
  englishPull?: true
  /** Thing is the nominative subject; person is dative. */
  experiencer?: true
  /** Swallowed-accusative hook applies. Never set on experiencer verbs. */
  swallowed?: string
}

export const DATIVE_VERBS: Record<string, DativeVerbEntry> = { /* ~45 entries */ }
```

Registration is additive everywhere else:

- **`drillCatalogue.ts`** — a `DAT_FAMILIES: DrillFamily[]` export (I–X + card A).
  `DativeHome.vue` renders from it; `drillCatalogue.test.ts` extends to cover it.
- **`useQuizHistory.ts`** — 13 new `QuizHistoryType`s: `'dat-case'`, `'dat-form'`,
  `'dat-trap'`, `'dat-subject'`, `'dat-experiencer'`, `'dat-twin'`, `'dat-ditrans'`,
  `'dat-object-order'`, `'dat-adjective'`, `'dat-free'`, `'dat-sentence'`,
  `'dat-passive'`, `'dat-reflexive'`.
- **`useDrillMastery.ts`** — a `DAT_TYPE_TO_CODE` map beside `DW_TYPE_TO_CODE` and
  `DAC_TYPE_TO_CODE`. T1–T13 bands then come for free, with no new plumbing.
- **`router.ts`** — `/dative/...` paths, route names `dative-*` and `dative-*-run`,
  following the Direction Words block's shape.
- **`Home.vue`** — a thirteenth module card, numeral **XIII**, `de: 'Dativ'`.
  Breadcrumbs read `Kapitel XIII · Dativ · <drill>`. Note: Home's numerals and the
  breadcrumb numerals have already drifted (Home IV is Konjunktiv, but Prepositions
  breadcrumbs say *Kapitel IV*); this spec follows Home's sequence and does not fix the
  drift.

## Data flow

**Deterministic drills (T1–T10, T12, T13).** Item bank → `useDativeDrill` samples under
the setup's filters (level, [Semantic family], ledger state) → runner grades locally →
`saveQuizRun` → bumps `gt:drillTotals` *(band)* **and** `gt:dativeLedger` *(per item)* →
result page shows the [Core-idea explanation] under each miss.

**T11.** `useDativeSentenceQuiz` generates progressively and streams per ADR-0004 /
ADR-0008; the AI grades and assigns [Dative error tag]s. Records per ADR-0010.

**Two readings of history, deliberately.** The same split ADR-0011 established, extended
one level down:

- **`gt:dativeLedger`** — lifetime, item-keyed, drives `31 / 57 gesichert`. Never decays
  because the learner spent a week on nouns.
- **Weak points** (`useDativeStats.ts`) — the 100-run window per ADR-0002, drives the
  remedial drill. *Should* decay; last month's miss on *ähneln* is not today's problem.

Because the ledger is item-keyed where ADR-0011's rollup is drill-keyed, it needs its own
ADR (**ADR-0017**, "Dative item ledger is keyed by item, not by drill") and an entry in
`USER_DATA_KEYS` so it ships in backup/restore.

```ts
interface LedgerEntry {
  /** Most recent first, capped at 3 — all the streak rule needs. */
  recent: boolean[]
  encounters: number
  lastAt: number
}
type DativeLedger = Record<string, LedgerEntry>   // key: VERBS.german | adjective lemma
```

`state(entry)` returns `'new'` when `encounters === 0`, `'gesichert'` when
`recent.length === 3 && recent.every(Boolean)`, else `'wackelig'`. Storing only the last
three booleans keeps the key small and makes the rule auditable; a missing key reads as
`new`, so an absent store is a valid empty state with no migration.

The meter's **denominator is derived, never hard-coded**: it is
`Object.keys(DATIVE_VERBS).length + Object.keys(DATIVE_ADJECTIVES).length`. The `57` in
this spec is an estimate of where that lands (~45 + ~12); the UI must read the real count
so adding a verb moves the denominator rather than silently capping the meter.

## Error handling

- **Absent ledger / rollup** reads as all-`new` / all-zero. No migration, matching
  ADR-0011's "an absent key simply reads as all-zero" property.
- **Setup filters matching zero items** — the existing `availableVerbs === 0` warning
  pattern from `CaseGovernmentSetup.vue`, start button disabled.
- **AI unavailable (T11 only)** — the module's other twelve drills are offline per
  ADR-0007, so the hub stays fully usable; T11's card carries the ochre `[AI]` LevelChip
  the catalogue already renders for AI drills.
- **A ledger key with no matching item** (a verb later renamed in `verbs.ts`) is ignored
  on read and excluded from the denominator, so the meter cannot exceed 100%.

## Testing

`tests/data/dativeVerbs.test.ts`, `dativeItems.test.ts`, `dativeAdjectives.test.ts`,
`dativeFree.test.ts`, plus `tests/composables/useDativeLedger.test.ts`. Invariants follow
the `directionItems.test.ts` gate style — named tests that list offending ids rather than
asserting a count. Every previous item bank in this codebase was bitten by authoring
traps, so these are gates, not review notes:

1. **Cross-ref gate** — every `DATIVE_VERBS` key exists in `VERBS.german` *and* carries
   `case: 'dative'` there. This is the test that catches the `stehen` mis-tag.
2. **No answer leak** — no T3 trap sentence contains its own expected dative form as a
   standalone word (the `HIN_HER_ITEMS` leak test, ported).
3. **Twin gate** — for every entry with a `twin`, the twin exists in `VERBS.german` and
   its `case` is *not* `dative`. Prevents an invented contrast.
4. **Experiencer gate** — in every T4/T5 item the nominative subject is the thing and the
   finite verb agrees with it in number: a plural subject takes *gefallen*, never
   *gefällt*. The invariant most likely to break silently during authoring.
5. **Swallowed-accusative gate** — `swallowed` is never set on an entry with
   `experiencer: true`. The hook genuinely does not apply there and the data must not
   claim it does.
6. **Free-dative gate** — every `dativeFree.ts` item is classified as exactly one of
   `commodi` / `possessivus` / `ethicus` and carries a real-dative-object counterexample.
7. **Hint contract** — `coreIdeaHint` ≤ 90 chars, ≤ 14 words, unique across the dataset;
   never contains the word "Dativ" or the expected form.
8. **Reachability floor** — every one of the ~57 ledger items appears in at least one
   drill's item bank. Without this, `57/57` is unreachable and the meter is a lie.
9. **Coverage floors** — per-drill minimum item counts in the DW style (≥30 for T1, ≥20
   for the trap and twin banks), and ≥1 item per [Semantic family] per drill that filters
   by family.
10. **Ledger rule** — `useDativeLedger` unit tests: three correct ⇒ `gesichert`; one miss
    demotes; a fourth encounter evicts the oldest; unknown key reads `new`; a key with no
    matching item is excluded from the denominator.

## Phases

This module is too large for one implementation plan. Following the Da-Compounds and
Direction Words precedent (`docs/superpowers/plans/2026-07-23-phase1-dacompounds-scaffold.md`
and successors), **this spec covers the whole module and each phase below gets its own
implementation plan**, written when the previous phase lands.

1. **Data foundation.** Add the 29 missing verbs to `verbs.ts` with full
   Stammformen/conjugation (they benefit every existing verb drill, not just this module);
   fix `stehen`; author `dativeVerbs.ts` for all ~45; write gates 1, 3, 5, 7. No UI.
2. **Ledger + hub + families I–III.** `useDativeLedger.ts` and ADR-0017;
   `DAT_FAMILIES` in the catalogue; `DativeHome.vue` with the meter and ledger;
   T1, T2, T3; gates 2, 8, 9, 10.
3. **Families IV–VII.** T4, T5 (gate 4), T6, T7, T8, T9 — the inverted experiencers,
   the twins, the ditransitives, the adjectives.
4. **Families VIII–X + cheatsheet.** T10 (gate 6), T11 (the AI drill), T12, T13,
   `DativeCheatsheet.vue`, the `CONTEXT.md` glossary entries, and the Home card.

Phase 1 is a prerequisite for everything and lands no user-visible feature; that is
deliberate — the module cannot be built on a 15-verb pool.

## What deliberately stays out

- **Dative prepositions, two-way prepositions, dative collocations** — Prepositions module
  owns them; the cheatsheet cross-links instead.
- **Dative morphology drills** — Declension module owns article fills, adjective endings,
  and pronoun tables. T2 asks the learner to *know dative is required* and then produce
  it; it is not endings practice.
- **The Rektion drill** — unchanged. Its 6-way recognition question keeps its place in
  Verbs; adding the 29 verbs and fixing `stehen` improves it for free.
- **SRS scheduling.** Considered and rejected for now: it would introduce a due-date
  scheduler this codebase has nowhere else, and a new concept in the domain language. The
  [Item ledger] answers "what is shaky" without answering "what is due today"; a scheduler
  can be layered on later if the ledger proves it earns one.
- **`varies` verbs entering the Rektion drill.** `glauben` and `vergeben` are reachable
  through this module's family V (where the case *is* the lesson) without changing the
  Rektion drill's deliberate exclusion.
