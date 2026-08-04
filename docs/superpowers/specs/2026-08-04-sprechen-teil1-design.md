# Sprechen Teil 1 — Vortrag (Design)

**Date:** 2026-08-04
**Status:** Approved design, pre-implementation
**Target version:** 1.17.00 (`kind: 'module'`)
**Depends on:** the shipped Teil 2 module (1.13.00–1.16.02), [ADR-0012](../../adr/0012-error-archive-append-only-dexie.md), CONTEXT.md → *Discussion*, *Modality*, *Move*, *Redemittel yield*, *Archived correction*
**Decides:** [ADR-0014](../../adr/0014-teil1-continuous-rede-coverage-judged-not-measured.md) — one continuous Rede; coverage judged, not measured

## Goal

The second half of the Sprechen module: **Teil 1 · Vortrag**. One Vortragsthema chosen from
two task sheets, a planning stage, **one continuous four-minute Rede**, one Nachfrage from the
AI partner, then the same four-criterion grade Teil 2 uses — with Teil-1 descriptors.

The reason to build it now is not coverage of the exam. It is that a monologue exposes a
different failure than a discussion does, and therefore needs a different kind of help.
Teil 2's problem is *what do I say back*. Teil 1's problem is *can I keep talking for four
minutes without the structure collapsing*. **The help system is the substance of this
spec**; the surrounding flow exists to hold it.

## Prior art

The claude.ai design project (`ff880a7a-b49d-4411-8435-65c0519723c4`) already contains a
Teil 1 prototype — `sprechen-teil1.jsx`, `sprechen-teil1-run.jsx`, `spr1-data.js`, and
`SPRECHEN-REDESIGN.md §6` — which the Teil 2 design import deliberately skipped ("no Teil 1,
in any form"). Its **data** is adopted here (the five Gliederungspunkte and their word
targets, 35 Vortragsmittel in seven groups, the Teil-1 rubric descriptors, the A/B sheet
draw). Its **section-at-a-time runner is rejected** — see decision 2.

## Decisions (settled during brainstorming)

| # | Question | Decision |
|---|---|---|
| 1 | How is help organised — a graded ladder or independent switches? | **Independent switches**, like today's *Hilfen An/Aus*. No Hilfestufen concept, no adaptive hiding, no help budget. Most helps are always-on furniture; only four things get a switch. |
| 2 | Is the Vortrag composed section by section or in one take? | **One continuous take.** The exam gives four unbroken minutes; the app rehearses that. The five Gliederungspunkte become a live checklist beside the composer, not a wizard. |
| 3 | How far does the help system go? | **Free/local, plus riders on the grade call already paid for.** No Mustergliederung, no Mustervortrag, no cross-run coaching store, no repeat-without-help comparison. KI-Tipp stays the single paid live help. |
| 4 | Which helps get their own switch? | **Four:** Hilfen (master), Live-Checkliste & Redezeit, KI-Tipp, hartes Zeitlimit 4:00. |
| 5 | How does Teil 1 share Teil 2's machinery? | **Hybrid.** Parameterise the genuinely part-agnostic pure modules; put Teil-1-specific logic in new modules that never touch Teil 2. No up-front grand refactor. |
| 6 | Modality | **Both**, exactly as Teil 2 — one setup, one prep, one runner, one result, the input surface switching on `modality`. |
| 7 | Error archive | **Shared** with Teil 2, rows gaining `part`. Aufwertungen stay out of it. |
| 8 | Retention | **None**, as Teil 2. The Rede and the Nachfrage die with the result tab; the Run summary, its Aufwertungen and the [Archived correction]s outlive them. |

## 0 · Vocabulary

Settled during grilling and written into CONTEXT.md:

- **Vortrag** — the whole Teil-1 practice unit, the counterpart of a *Discussion*.
- **Rede** — the continuous four-minute monologue inside it. The Redezeit budget is the Rede's.
- **Nachfrage** — the one AI follow-up question and the learner's answer. Part of the Vortrag.
- **Vortragsthema** — the subject plus its task-sheet instruction. Explicitly **not** a *Topic*:
  a Topic is a controversial statement with two arguable sides, which is exactly what a
  Vortragsthema lacks and why Teil 1 is a monologue. Separate pools, separate generators,
  separate done-lists. Both are tagged with the same ten fields, so both resolve an argument
  bank identically. Accepted cost: a learner who covers the same subject in both parts pays for
  two cached banks.
- **Gliederungspunkt** — one of the five fixed task-sheet points a Rede must cover.
- **Vortragsplan** — the five keywords written against those points while preparing.
- **Aufwertung** — a style upgrade on wording that was not wrong. Never an *Archived correction*.
- **Hilfe-Protokoll** — what the learner reached for, and when. Descriptive only.
- **Move** — widened: *the communicative job a Redemittel does*, with two disjoint sets, six
  Gesprächszüge in a Discussion and seven Vortragsfunktionen in a Vortrag. Never summed across
  parts, which is why *Redemittel yield* is now counted per phrase bank.

## 1 · Flow & screens

Four routes, hyphen-free head so `NavShell` keeps deriving the active tab from
`name.split('-')[0]`:

| Route | Path | Component | Stage |
|---|---|---|---|
| `sprechen-teil1` | `/sprechen/teil1` | `Teil1Setup.vue` | 01 Themenwahl — two task sheets |
| `sprechen-teil1-prep` | `/sprechen/teil1/prep` | `Teil1Prep.vue` | 02 Vorbereitung — Gliederung planner |
| `sprechen-teil1-run` | `/sprechen/teil1/run` | `Teil1Runner.vue` | 03 Vortrag + Nachfrage |
| `sprechen-teil1-result` | `/sprechen/teil1/result` | `Teil1Result.vue` | 04 Auswertung |

Prep is a real route, not a modal — it must survive a reload like the runner does.

### Hub

`SprechenHome.vue`'s dead Teil 1 panel goes live, carrying three stats
(`n Themen offen · zuletzt n/100 · n Vorträge`) and losing `.dead`, `disabled` and the
*In Vorbereitung* stamp. The existing tests asserting the panel is inert are rewritten,
not deleted.

One **Teil 1 / Teil 2 toggle** near the top of the hub drives *both* the masthead's
criterion bars and the Redemittel-Ausbeute block. The two parts have different rubrics and
disjoint phrase banks; averaging either across parts would be meaningless. Recent runs
merge into one date-sorted list, each row labelled with its part.

### Working state

New Dexie table `sprechenVortraege` at **`db.version(11)`**, same lifecycle as
`sprechenDiscussions`: `in_progress` → `submitted` → row deleted once the Run is recorded.
A four-minute spoken take must survive a dead tab, and a failed grade must be retryable
without re-giving the Rede.

```ts
interface Vortrag {
  id: string
  thema: { id: string; titleDe: string; taskDe: string; source: 'seed' | 'custom' }
  modality: 'typed' | 'spoken'
  helps: {                           // frozen at start — see below
    hints: boolean
    checklist: boolean
    kiTipp: boolean
    hardLimit: boolean               // spoken only; always false when typed
  }
  plan: { key: GliederungKey; keyword: string }[]   // the Vortragsplan — five keywords
  notes: string
  rede: {
    textDe: string
    seconds?: number                 // spoken only — real elapsed
    restarts?: number                // spoken only — long-pause proxy
    spans?: { text: string; confidence: number }[]
  }
  nachfrage?: { questionDe: string; answerDe: string }
  kiTippCount: number
  helpLog: { at: number; kind: HelpKind }[]      // feeds the Hilfe-Protokoll
  status: 'in_progress' | 'submitted'
  startedAt: number
  endedAt?: number
}
```

`sprechenVortraege: '&id, status, startedAt'`, matching `sprechenDiscussions`. Excluded from
export/import for the same reason: it only ever holds one in-flight Vortrag.

## 2 · Data

### `src/data/sprechenVortragsthemen.ts`

**60 hand-authored** `{ id, titleDe, taskDe, tags, level: 'B2', source: 'seed' }`, where
`taskDe` is the exam's own instruction (*„Halten Sie einen kurzen Vortrag darüber, …"*).
Sixty gives thirty runs before the two-sheet draw must repeat.

Tags reuse Teil 2's ten fields **unchanged** (Umwelt, Arbeit, Technologie, Bildung,
Gesundheit, Medien, Gesellschaft, Reisen, Konsum, Familie), so `resolveArgumentBank`'s
tag-level fallback serves Vortragsthemen with no new authoring at all.

Custom pool mirrors Teil 2: five per generation request, avoiding both pool titles and
already-held topic titles read from Run meta, stored in
`localStorage['gt:sprechenCustomVortragsthemen']`, registered in `USER_DATA_KEYS`.

### `src/data/sprechenVortragsmittel.ts`

- **35 phrases in seven groups** — `einstieg · gliederung · aspekt · kontrast · beispiel ·
  abschluss · nachfrage` — adopted from the prototype's `SPR1_REDEMITTEL`.
- **`GLIEDERUNGSPUNKTE`** — the five [Gliederungspunkt]s with `key`, `n`, `labelDe`, `hintDe`
  and target words: Einstieg 45 · Situation 75 · Vor- und Nachteile 95 · Eigene Erfahrung 75 ·
  Meinung & Abschluss 70. **Sum `VORTRAG_TARGET_WORDS` = 360 ≈ 4:00 at `VORTRAG_WPM` = 90**,
  and a test asserts the sum.

  > **Why 90 wpm and not the prototype's 110.** 110 wpm is a fluent-native planning rate, and
  > the prototype does not honour it either: its demo talk sums to 352 words but is labelled
  > 3:50 (92 wpm), while its own `spr1Clock(352)` returns 3:12 — the data and the formula
  > disagree by 38 seconds. Keeping 445 would hold a typed Rede to more content than a spoken
  > learner can produce in the same nominal four minutes, breaking the one property [Modality]
  > exists to protect. 90 wpm is taken from the prototype's own demo (its most realistic B2
  > artefact, at 91.8 wpm) rather than invented, and 4:00 × 90 gives a round 360 that the five
  > per-point targets divide into multiples of five.
- **`PUNKT_MOVES`** — which Move groups each [Gliederungspunkt] naturally wants (the
  prototype's `SPR1_SECTION_MOVES`, renamed away from "section" per the glossary). Its **only**
  job is outlining groups in the drawer; it must never drive coverage — see ADR-0014.
- **`RETTUNGSLEINEN`** — a small authored set of time-buying lines (§3, Rettungsleine).
- **`KONNEKTOREN`** — signal words grouped by the join they make (§3, Konnektoren-Palette).

### `src/data/rubrics.ts`

Add **`SPRECHEN_B2_TEIL1`**: the same four criteria × 25 points, pass ≥ 60, the same
Prädikat bands — with Teil-1 descriptors. The first criterion is
*Erfüllung / Gliederung* and asks whether all five [Gliederungspunkt]s are treated, whether
the [Rede] is of appropriate length, whether a position is stated and justified, and whether
the [Nachfrage] is answered on substance. `SPRECHEN_B2_TEIL2` is not touched. Components read
`descriptorDe` verbatim and never paraphrase it.

**`kohaerenz` also carries `descriptorSpokenDe`**, the optional field `SprechenCriterion`
already defines and `sprechenDescriptor()` already falls back for. The prototype's
`SPR1_CRITERIA` omits it; that omission is not adopted. A Rede is *entirely* a fluency
performance, so the two Modalities cannot share one wording:

- **typed** — structure, connectors and Gliederungssignale only, carrying the same explicit
  *„für die schriftliche Form angepasst"* hedge Teil 2 uses. The result page additionally
  states that Redezeit was measured as a word proxy, not a clock.
- **spoken** — hedge dropped; tempo, hesitation and pausing explicitly in scope, judged on
  real seconds, words per minute and recognizer restarts.

Same key, same 25 points either way, so a typed and a spoken Teil 1 score remain directly
comparable — the property [Modality] exists to protect.

### `ArgumentBank`

Gains an optional `phrases: { de: string; en: string }[]` for the collocation row. **Optional**
because banks already cached in `sprechenArgumentBanks` predate it — a missing field renders
one Wortschatz row instead of two and is never an error. The generator prompt and the ten
authored tag banks both gain it.

## 3 · The help system

Three invariants hold for every item below:

1. **No help is ever validated against.** Nothing checks whether you took it.
2. **No help ever affects the score.** Uses are counted and shown; they never move a point.
3. **No help costs an AI call** except the one that says so.

**The four switches are frozen when the Vortrag starts** and cannot be flipped mid-run. This
matches the shipped Teil 2 runner — whose spec claims hints are "toggleable mid-run" while
`Teil2Runner.vue` only ever reads `hintsOn` from the stash — and it is what makes the Run's
record of which helps were on truthful rather than a snapshot of the last flip. KI-Tipp is
independent of the Hilfen master switch: with Hilfen off and KI-Tipp on, the tip button renders
alone, because the two are separate switches by decision 4.

### Stage 01 · Themenwahl

**Aufgabenblatt ×2** — two sheets side by side, each printing the title, the `taskDe`
sentence and **all five [Gliederungspunkt]s with their hints**, so the choice is made on
substance rather than on a title. `Andere zwei Themen ziehen` redraws; `Alle 60 Themen`
expands the ledger list below. Row markers: `✓ gehalten`, `Argumente im Cache`, `generiert`.

**The draw prefers unheld Vortragsthemen and nothing more** — the same policy
`pickRandomTopic` already implements for Teil 2, pointed at the Vortragsthema pool, falling
back to the whole pool once they run out. A weakness-aware draw was considered and rejected:
it needs a per-tag score rollup that does not exist, it would be unexplainable to the learner
(two sheets appear, with no way to see why), and it works against the Füllbarkeits-Check —
the app would be steering you toward the subject you can least fill while a panel asks you
whether you can fill it. **Declining a sheet does not mark that Vortragsthema as held**; only
a graded Vortrag does, and the id of the declined sheet is not stored at all.

**Füllbarkeits-Check** — three probes under each sheet: *eigenes Beispiel? · drei Wörter? ·
Meinung?* The learner taps them for themselves and the sheet shows `2/3`. Nothing is stored,
nothing is blocked, nothing is scored. It exists to make topic choice a deliberate act,
because choosing the topic you cannot fill is how this exam part is actually lost.

### Stage 02 · Vorbereitung

**Gliederung planner** — five rows: number, name, hint, target words with its clock at 90 wpm
(*Vor- und Nachteile · 95 Wörter · ~1:03*), and one keyword field. These five keywords are the
[Vortragsplan], and they are what makes a continuous take survivable: they return in the runner
as live checkboxes.

**Erfahrungs-Ausgrabung** — three fixed questions pinned beside row 4: *Wann hattest du
damit zu tun? · Was hast du gemacht? · Was kam dabei heraus?* Deliberately not AI and
deliberately never varied — the same three questions every run, until asking them unprompted
becomes the habit. *Eigene Erfahrung* is the point where most learners have nothing.

**Konnektoren-Palette** — signal words grouped by the join they make: Einstieg→Situation,
Aufzählen, Gegenüberstellen, Belegen, Fazit. Tap to drop into the notes. This targets a
named failure rather than a vague one — the prototype's own demo weakness is *„zwischen
Abschnitt 3 und 4 fehlt ein Übergang."*

**Wortschatz + Kollokationen** — the existing six-word strip gains a second row of four to
six topic collocations (*„eine Rolle spielen"*, *„auf … angewiesen sein"*). Rides the
argument bank already paid for. Bare nouns do not lift the Wortschatz criterion;
combinations do.

**Argumentenspeicher** — reused from Teil 2 unchanged, both columns. In a monologue the
opposing column stops being *„damit wird der Partner kommen"* and becomes *„das gehört in
Abschnitt 3"* — same data, relabelled, because Vor- und Nachteile is a Gliederungspunkt whose
two sides must both be filled.

**Notizen** — carried into the runner and visible throughout, as in Teil 2.

### Stage 03 · Vortrag

**Live-Checkliste** *(switch)* — the five [Gliederungspunkt]s as rail rows, **one dot each**:

```
01 Einstieg              ● „Sportvereine"
02 Situation             ○ „ein Drittel"
03 Vor- und Nachteile    ● „Freistellung"
04 Eigene Erfahrung      ○ „Schwimmverein"
05 Meinung & Abschluss   ○ „Unterstützung"
                          212 / 360 Wörter · 2:21
```

The dot lights when **the learner's own [Vortragsplan] keyword for that point** appears in the
live Rede, matched by the same local needle matcher that counts Redemittel — zero AI, and
personal to what *this* learner planned rather than to a template. A point whose keyword was
left empty shows a dash, never a false dot. **Only the total word count is shown**, never a
per-point one.

> **Why no per-point measurement, and no *signalisiert* dot.** An earlier draft lit a second
> dot per point when a Vortragsmittel from that point's `PUNKT_MOVES` groups appeared, and
> split the Rede into per-point spans at those matches. The prototype's own mapping makes that
> impossible: `situation` and `erfahrung` are mapped to the identical pair `{aspekt, beispiel}`,
> `aspekt` serves three points and `kontrast` two, so only points 1 and 5 are identifiable by
> phrase group. Sequential attribution would have restored the numbers by *assuming* the learner
> proceeds in order — inventing precision the rail does not have. The keyword dot is kept
> because it is the one signal that is unambiguous by construction: the learner assigned each
> keyword to exactly one point.

Matching rules for keywords: normalise with the existing helper (punctuation stripped,
case-folded, whitespace collapsed), then substring-test, so a planned *Freistellung* also
matches *Freistellungen*. Empty keywords are skipped. A keyword the speech recognizer splits
(*„Schwimm Verein"*) will not match — the same accepted cost as mishearings in the archive
(ADR-0012).

The rail never claims coverage: the rows say **gesagt**, never *abgedeckt*. The grader's real
coverage judgement arrives on the result page and sits beside it.

**Redezeit** *(same switch)* — typed: words / 360. Spoken: real elapsed seconds against 4:00.
Ochre below the band, green from 88%, red past 110%.

**Vortragsmittel drawer** *(Hilfen switch)* — two axes, as Teil 2. *Wie*: the seven Move
groups, with the groups serving the **furthest point whose keyword has been said** outlined
(point 1's groups when none has), `·neu` on groups never used
across the learner's lifetime, and `schon benutzt` replacing the gloss on phrases already in
this Rede. *Was*: the argument angles. In getippt a tap inserts the stub at the caret; in
gesprochen it enlarges for reading aloud — which is what the exam's own notes are for.

**Vortragsmittel vorsprechen** — a speaker button per phrase, reusing the verb-quiz sentence
playback. Hearing a phrase before saying it is the difference between recognising it and
producing it. Output, not input, so it is Modality-independent.

**Move nudge** *(Hilfen switch)* — *„Diesmal: gegenüberstellen"*, chosen from the Move groups
the matcher has **not yet found a phrase from** in this Rede, preferring the one the learner's
lifetime yield says they avoid. Identical logic to Teil 2's `pickMoveNudge`, over the other
bank. Dismissible for the run, never validated.

**Rettungsleine** *(Hilfen switch)* — one always-visible button handing over one time-buying
line from `RETTUNGSLEINEN`, rotating: *„Da muss ich kurz überlegen …" · „Um es kurz
zusammenzufassen …" · „Kommen wir zum nächsten Punkt: …"*. Not a crutch to feel guilty
about — filling four minutes without dead air is the examined skill, and these are the
sentences that do it.

**Stuck-Erkennung** *(Hilfen switch)* — typed: no keystroke for 20 s. Spoken: two consecutive
recognizer restarts (the long-pause proxy already computed by `useSpeechRecognizer`). On
trigger the rail raises the Rettungsleine and the nudge, and if KI-Tipp is on it *offers*
the tip once per run, one tap away. **It never spends a call on its own.**

**KI-Tipp** *(own switch, one call)* — reads the Rede so far, the [Vortragsplan], and which
planned keywords have been said; returns one or two sentences of direction: *„Du hast bei Vor-
und Nachteile nur
Vorteile genannt — stell den Punkt Zeitmangel daneben."* A direction, never a sentence to
speak. Counted into `kiTippCount`, shown on the result, never scored.

**Hartes Zeitlimit** *(own switch, spoken only)* — the recognizer closes at 4:00 the way an
examiner interrupts, committing the text before closing anything: the limit never costs the
learner what they already said.

**In the typed Modality this switch does not exist** and is not rendered — the Prüfungskarte
drops to five fields. A hard limit models an examiner cutting you off, which only happens in
real time; a 360-word composer lock would have no exam analogue and would punish thoroughness
rather than train anything, since a typed learner has unlimited time regardless. Length
discipline in typed comes from the Redezeit bar turning red past 360 and from *Erfüllung*
judging whether the Rede is of appropriate length. This is the same admission the typed
`kohaerenz` hedge already makes: a typed Rede is not a timed performance.

**Nachfrage** — when the Rede ends (limit reached, or *„Vortrag beenden"*), **one call**
generates a single follow-up question from what the learner actually said, and the
`nachfrage` Move group surfaces for the answer. A canned per-topic question would teach
nothing; being asked about your own weakest claim is the point.

Three boundary rules follow from *Vortrag = Rede + Nachfrage* (§0 vocabulary):

1. The Nachfrage answer is **not** counted against the Rede's 360-word / 4:00 budget. The
   Redezeit bar closes when the Rede does.
2. Mistakes in the Nachfrage answer **are** marked and archived — it is the learner's own
   German, and the rubric grades it.
3. Redemittel yield counts **both** phases. It has to: the `nachfrage` Move group can only
   ever be used in the second phase, so excluding it would leave one of the seven groups
   permanently unlightable and permanently at the top of the Move nudge's queue.

### Stage 04 · Auswertung, as help

**Hilfe-Protokoll** — read from `helpLog`: counts plus a **minute timeline**, since §3 removed
the per-point attribution this originally assumed — *„Drawer 7× · davon 5× in Minute 2–3 ·
1 KI-Tipp · Rettungsleine 2×"*. Descriptive, never scored, and the page says so. Knowing that
five of seven drawer opens fell in one minute of the Rede still names where it went wrong.

**Aufwertungen** — see §4.

### Deliberate cut

A **Satzanfang-Bank** was proposed and dropped. The Vortragsmittel already *are* sentence
openings (*„Zunächst möchte ich auf … eingehen"*, *„Ein weiterer wichtiger Punkt ist …"*);
a second bank of openings is the same help twice under a different name, and 35 phrases is
already more than anyone reads mid-Rede.

## 4 · Grading

One temperature-0 call, Writing-grader pattern, over the Rede plus the Nachfrage
exchange. Returns:

1. **Four criterion scores × 25** against `SPRECHEN_B2_TEIL1`, each with `reasonDe` /
   `reasonEn`. Validator enforces criterion keys, per-criterion maxima, sum = 100, and a
   pass flag consistent with ≥ 60.
2. **`coverage`** — per [Gliederungspunkt] `{ key, covered, note }`. Exactly five entries whose
   keys are exactly the five `GLIEDERUNGSPUNKTE`; the validator rejects anything else.
   **No `words` field**: a per-point word count is precisely what ADR-0014 says we do not have,
   and asking a model to count words is unreliable in any case. The only word figure on the page
   is the total, measured locally.
3. **Mistake annotations** — `{ quote, suggested, kind, reasonDe, reasonEn }`, `kind` a
   [Sprechen error tag], each re-anchored into the Rede (or the Nachfrage answer) and silently
   dropped when it does not match. `spelling` is never assigned in a spoken Modality — the
   spelling there is the recognizer's.
4. **`aufwertungen`** — `{ quote, better, whyDe, whyEn }`, capped at five, re-anchored the
   same way. **These are not errors**: they render in clay rather than danger and are
   **never written to the Fehlerarchiv**. Mixing a style upgrade into an error archive would
   corrupt the one dataset in the app that means "things I actually got wrong"; an Aufwertung
   says "this was fine and could be better", which is a different claim.

   They are, however, **kept in full** — all five, `{ quote, better, whyDe, whyEn }`, in the
   Run's meta, exactly as Teil 2 already stores strengths and weaknesses as full De+En text
   rather than counts. So they survive in history, ride along in export/import, and stay
   readable after the result tab dies. Unlike the [Rede], an Aufwertung is not the learner's
   private speech — it is the app's advice, and there is no retention argument against keeping
   advice.
5. **Strengths / weaknesses / overall verdict**, each De + En.

The Nachfrage answer is graded inside *Erfüllung / Gliederung*, as the Teil-1 descriptor says.

### Result page order

Verdict (score, Prädikat stamp, four criterion bars each carrying the AI judgement **and**
the rubric's own `descriptorDe` beneath it) → **Gliederung coverage** table, with the
grader's `covered` beside the rail's keyword dots so the difference between *saying the word
you planned* and *actually covering the point* is visible → Vortragsmittel-Ausbeute →
marked Rede (spans as inline buttons opening one detail block: Art / Du / Besser / Warum) →
**Aufwertungen**, own block → Nachfrage exchange → **Hilfe-Protokoll** → Stärken /
Schwächen → Gesamturteil → archive and drill call to action.

DE/EN toggle at the top, default German, remembered in `sprechenTeil1Setup`.

One-time view, fed from `sessionStorage['gt:lastSprechenTeil1Result']`. Afterwards only the
Run summary and the archived corrections remain.

## 5 · Persistence

- New `QuizHistoryType: 'sprechen-teil1'`. Meta keeps the **`topicTitle`** key rather than
  inventing `themaTitle`, deliberately: the hub's merged recents list reads `r.meta.topicTitle`
  today and must keep working across both parts without a per-part branch. The glossary
  distinction between [Topic] and [Vortragsthema] is a domain distinction, not a reason to fork
  a meta key. Meta: `topicTitle`, `sprechenScore`, `maxScore`
  100, `passes`, `sprechenPraedikat`, `sprechenCriteria`, `sprechenModality`,
  `sectionsCovered` (0–5, **the grader's `coverage`**, never the rail's keyword dots),
  `spokenSeconds` **or** `wordCount`, `sprechenVortragsmittel` (ids used), `kiTippCount`, the
  four help switches as set, mistake counts by kind, and `sprechenAufwertungen` in full. The exhaustive
  `TYPE_LABEL` maps in `useLevelAssessment.ts`, `charts/quiz-type-labels.ts` and
  `HistoryPage.vue` all need the new key — `npm run typecheck` (vue-tsc) forces it; plain
  `tsc` does not.
- **`sprechenCorrections` rows gain `part?: 1 | 2`, written on new rows only.** ADR-0012 states
  that an [Archived correction] row is never mutated, so there is **no backfill upgrade**:
  `part === undefined` reads as Teil 2 — the only part that existed — and the defaulting happens
  in the repository module, not in the schema. The archive UI gains a part filter; the
  Korrekturdrill serves both without caring. Aufwertungen never enter.
- **Lifetime yield is keyed per phrase bank** so the two parts' yields never mix. This is
  what the hub's part toggle reads.
- `USER_DATA_KEYS` additions: `gt:sprechenCustomVortragsthemen`, `sprechenTeil1Setup`.
- The Rede and the Nachfrage are never persisted past the result stash. Same rule as Teil 2.

## 6 · Code sharing (decision 5)

**Parameterised, small, provable edits:**

| Module | Change |
|---|---|
| `useRedemittelMatch.ts` | Already a pure module over a phrase list — take the bank as an argument instead of importing `SPRECHEN_REDEMITTEL`. Existing tests must pass byte-identically for Teil 2's bank. |
| `useRedemittelYield.ts` | Key lifetime counts per bank. |
| `useSprechenArchive.ts` | `part` on write, optional `part` filter on read. |
| `useSprechenGrader.ts` | Extract `reAnchor` and the criterion-sum validator for reuse; add the Teil-1 response shape beside the Teil-2 one. |
| `useSprechenArguments.ts` | Unchanged, plus the optional `phrases` field. |

**New, Teil-1 only:** `useVortragCoverage.ts` (keyword→point matching, checklist dots, the
furthest-point derivation the drawer outlines from),
`useVortragTimer.ts` (Redezeit, hard limit), `useVortragPartner.ts` (Nachfrage, KI-Tipp),
`sprechenVortragsmittel.ts`, `sprechenVortragsthemen.ts`, the four screens, and
`SPRECHEN_B2_TEIL1`.

No grand refactor first: Teil 1's genuinely different parts — coverage, Redezeit, the
[Gliederungspunkt]s — would fight a premature abstraction.

## 7 · Cheatsheet

`SprechenCheatsheet.vue` gains a **Teil 1 · Vortrag / Teil 2 · Diskussion** segmented
control (the tab structure the Teil 2 spec left room for). The Teil 1 tab shows its own
Bauplan mast (Einstieg → Situation → Vor & Nachteile → Erfahrung → Fazit), its own rubric
summary read from `SPRECHEN_B2_TEIL1`, and its seven phrase groups with a filled/hollow dot
per phrase for lifetime usage.

## 8 · Error handling

- **Nachfrage call fails** after retries → retry action; the Rede is already safe in Dexie.
  If it keeps failing, grading proceeds **without** a Nachfrage and the prompt is told so, so
  *Erfüllung* is not docked for a question that was never asked.
- **Grader fails** → the row stays `submitted`; the result page offers *„Analyse erneut
  versuchen"*. A four-minute Rede is never lost to a failed grade.
- **Mic denied or lost mid-Rede** → fall back to typed for the remainder, record the
  downgrade, state it on the result (Teil 2 precedent).
- **Hard limit** commits the text before closing anything.
- **KI-Tipp and TTS failures** are toast-only, never blocking.
- **No API key / provider down** → the existing `canUseAi` gate blocks at setup.

## 9 · Testing (vitest, existing conventions)

- Vortragsthema data: 60 unique ids, valid tags, non-empty `taskDe`.
- Vortragsmittel: 35 phrases; needles distinct with none a substring of another (the
  invariant that caught the comma bug); every `PUNKT_MOVES` key resolves to existing
  phrase ids; the five word targets sum to `VORTRAG_TARGET_WORDS` (360).
- **Matcher regression**: the parameterised `matchRedemittel` returns identical results for
  Teil 2's bank as today, then handles the Teil 1 bank.
- Checklist matching: a planned keyword lights exactly its own point; an inflected form of it
  matches; an empty keyword never lights; a keyword split by the recognizer does not match (the
  documented cost); the drawer outlines the furthest reached point's groups, and point 1's when
  nothing has matched.
- Grader validator: criterion sum, coverage keys exactly the five [Gliederungspunkt]s and no
  `words` field consumed even if a model volunteers one, Aufwertungen re-anchored and capped at
  five, `spelling` suppressed in spoken, a Nachfrage-answer mistake anchored and archived.
- Vortrag lifecycle on fake-indexeddb: create → resume → submit → grade → Run saved → row
  deleted; the Nachfrage-failure path grades anyway; abandon deletes the row.
- Hard-limit timer and the three Redezeit thresholds.
- Hub: the Teil 1 panel is live and navigable (rewriting the tests that assert it is dead);
  the part toggle drives both the criterion bars and the Ausbeute.
- Archive: `part` written on Teil 1 corrections, the filter works, and a row stored **without**
  `part` (a pre-Teil-1 correction) reads back as Teil 2 without being rewritten.

## 10 · Release checklist

- Routes, hub panel live, cheatsheet tab.
- **`CONTEXT.md` — already done during grilling, nothing left at release.** Added: *Vortrag*,
  *Rede*, *Nachfrage*, *Vortragsthema*, *Gliederungspunkt*, *Vortragsplan*, *Vortragsmittel*,
  *Aufwertung*, *Hilfe-Protokoll*. Widened: *Move* (two disjoint sets), *Modality* (three
  drill families, and Redezeit measurement), *Redemittel yield* (per bank), *Prädikat*,
  *Archived correction*, *Error archive*. Scoped: *Topic* is now explicitly Teil 2 only.
- **ADR-0014** committed alongside this spec.
- Changelog entry, `APP_VERSION = '1.17.00'`, `package.json` sync.

## Out of scope (explicitly deferred)

- **Mustergliederung** in prep and **Mustervortrag** on the result — the two model-output
  helps. Rejected for now as the two closest to doing the work for the learner; revisit once
  the free surface is proven.
- **Cross-run coaching loop** (*Mitnehmen für nächstes Mal*) and **Wiederholung ohne Hilfen**.
  Both need a persistent store of advice, which nothing in the app has yet.
- **Hilfestufen**, adaptive help fading, and a help budget — rejected in decision 1.
- **Section-at-a-time composition** — rejected in decision 2.
- **Satzanfang-Bank** — cut as duplicative.
- **Aussprache scoring.** Still excluded, in both parts.
