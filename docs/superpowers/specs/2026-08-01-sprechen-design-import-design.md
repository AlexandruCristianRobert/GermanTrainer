# Design import: Sprechen editorial revamp (Teil 2 complete, Teil 1 deferred)

**Date:** 2026-08-01
**Source:** claude.ai Design project `ff880a7a-b49d-4411-8435-65c0519723c4` ("German Trainer"),
`SPRECHEN-REDESIGN.md` + `sprechen.jsx`, `sprechen-run.jsx`, `sprechen-result.jsx`,
`spr-data.js`, `styles-sprechen.css`
**Target version:** 1.15.00 → 1.16.00
**Precedent:** `2026-07-31-dw-dac-design-import-design.md` (the DW/DaC import, same shape of work)

## Why

Sprechen was built fast and wears home-grown chrome: a `.module-card` grid hub, a `.recent-runs`
list, and five screens each carrying their own scoped `prep-*` / `topic-*` / `run-*` / `proto-*` /
`mistake-*` / `archive-*` vocabulary. The design project rebuilds it on the editorial module system
already shipped for Da-Compounds and Direction Words — ruled ledger rows, mono micro-labels,
display-serif headlines, sticky rails — and adds three behaviour packages the app never had.

**The prototype is behind this repo, not ahead of it.** `SPRECHEN-REDESIGN.md` was written against
`main` when only Teil 2 existed. Since then the repo shipped several things the doc lists as *new*.
Establishing the real delta first is the point of this section:

| `SPRECHEN-REDESIGN.md` says | Actual repo state |
|---|---|
| §8.1 add `tags: string[]` to Topic | **Done.** `TopicTag[]`, ten tags, backfilled across all 100 seeds |
| §4 new `Teil2Prep.vue` + argument bank cache | **Done.** Route, screen, `useSprechenArguments.ts`, Dexie `sprechenArgumentBanks`, and a *four*-layer resolution (cached → per-topic → per-tag → Gesellschaft) vs the doc's three |
| §5 "two-axis hint drawer — *Was* is new" | **Done.** `Teil2Runner.vue` already has `'was'` / `'wie'` tabs |
| §5.2 `sprReAnchor` fallback chain | **Done.** `reAnchor()` in `useSprechenGrader.ts`, exact → case-insensitive → drop |
| §7 Fehlerarchiv | **Done.** `SprechenArchive.vue` + ADR-0012's append-only tables |
| §7 `sprFold` for drill grading | **Superseded.** `foldGerman()` already exists in `drillGrading.ts` |
| §2 masthead reads last run's criterion bars | **Free.** `meta.sprechenCriteria` is already written on every Run |
| — | **Not in the doc at all: [Modality].** Typed vs spoken landed on this branch and the prototype knows nothing about it |

So this is mostly a **re-skin plus three genuinely-absent behaviours**, not a rebuild.

## Scope

Confirmed with the user in a grill session. Twelve decisions, recorded here with their reasoning
because several contradict the design doc.

### In scope

1. **The `.spr-*` visual system** — port `styles-sprechen.css`, rebuild the hub, re-clothe all five
   existing screens plus the cheatsheet.
2. **Local Redemittel matcher + yield** (§5.3) — zero AI cost, and `CONTEXT.md` already documents
   Redemittel yield as though it exists.
3. **Move nudge** (§5).
4. **Grader `structure[]` + `interaction{}` and the Argumentation & Interaktion matrix** (§5.2, §8.3).
5. **Korrekturdrill** (§7) — the `/sprechen/drill` route.

### Out of scope

- **Teil 1 · Vortrag in every form.** No route, no component, no `SPRECHEN_B2_TEIL1` rubric, no
  `spr1-data.js` port, no Vortragsmittel data, no `sprechen-teil1` history type, no `part` field.
  A single dead panel on the hub is the whole of it (decision 3).
- The base design system (`styles.css` → `tokens.css`, already ported).
- The prototype's own seed data — `spr-data.js` mirrors `src/data/*.ts` and is thinner. The one
  exception is `SPR_ARG_TAG`, whose ten tag banks are already in `sprechenArguments.ts`.
- The `tweaks-panel.jsx` design harness.

## Decisions

### 1 · Tiers (all four, minus Teil 1)

Re-skin + matcher/nudge + grader schema + Korrekturdrill.

### 2 · Modality lives in the Prüfungskarte

The prototype's sticky Prüfungskarte has four segmented fields — Beiträge, Position, Vorbereitungs-
zeit, Hilfen. Modality becomes **field #1**, above Beiträge, with the partner-voice picker and the
mic-support note rendering beneath it when `spoken` is selected.

Rationale: commit 46f08cc already decided "one Teil 2 flow with a Modality toggle", and
`CONTEXT.md` → Modality argues explicitly that typed and spoken produce *the same kind of Run* so
the scores are comparable. A screen-level tab or two hub CTAs would present them as two different
tests, which the glossary rejects.

### 3 · Teil 1 is a dead stamped panel

The hub's two-panel band is the design's central composition, so both panels render. Teil 1 gets the
mono label, display title, italic claim and description, but is **non-interactive**: no `role`, no
`tabindex`, no click handler, and its three stats are replaced by an ochre `IN VORBEREITUNG` stamp
with no `Starten →` line.

Nothing else Teil-1-shaped is built (decision 4): no cheatsheet tab strip (a one-live-tab segmented
control is noise, unlike the hub band), no rubric sibling, no `part` field — verified free to add
later, since `sprechenCorrections` is indexed `'&id, kind, createdAt, topicTitle'` and a non-indexed
field needs no Dexie version bump. Only *filtering* by part would.

### 4 · `structure[]` / `interaction{}` are descriptive, not scored

**The design doc's premise is wrong.** §8.3 justifies the new fields with "the official criteria name
Argumentationsfähigkeit and Interaktionsfähigkeit distinctly". They don't — Goethe B2 mündlich scores
Erfüllung, Kohärenz, Wortschatz, Strukturen, Aussprache, and argumentation/interaction are aspects
*of* Erfüllung. That is exactly why `SPRECHEN_B2_TEIL2` labels its first criterion
`'Erfüllung / Interaktion'` and drops Aussprache as out of scope. Splitting the score would drift
*away* from the official rubric.

It would also orphan data: `meta.sprechenCriteria` is persisted per Run with its keys,
`validateSprechenGrade` matches criteria **by key** (commit 69043f5), and the new masthead reads four
bars. So: **four criteria at 25 points each, unchanged.** The matrix is evidence explaining where
`erfuellung` landed, moving no points.

### 5 · The new grader fields are optional and degrade silently

Not added to the schema's `required`. Present and well-formed → the matrix renders. Absent,
malformed, or the wrong length → `structure` stays `undefined` and the Auswertung omits that block;
verdict, transcript and everything else are unaffected. Length mismatch is padded/truncated to the
learner-turn count, never rejected.

Rationale: the local-claude dev bridge drops `responseSchema` entirely, so the prompt's prose is the
only schema. Two more *required* fields would be two more ways for an otherwise-good grade to fail
after N retries, and the failure would read as "grading broke" rather than "the matrix is missing".

### 6 · Lifetime Redemittel yield is banked at grade time

**§5.3 has a hole.** It says to call the matcher for "the hub's lifetime yield", and §5.1 wants a
per-phrase lifetime usage dot on the cheatsheet. There is nothing to match against: `CONTEXT.md` →
Discussion says the conversation is discarded once graded. Lifetime yield cannot be recomputed; it
must be recorded.

Two writes at grade time:

- `meta.sprechenRedemittel: string[]` — the matched phrase ids, so every history row is
  self-consistent.
- `gt:sprechenRedemittel` — `Record<phraseId, { count, lastAt }>`, added to `USER_DATA_KEYS`.

This is ADR-0011's shape for the same reason: `HISTORY_LIMIT` caps `gt:quizHistory` at 100 runs
**app-wide across all quiz types**, so a "have I ever used this phrase" dot derived from that window
un-fills itself when the learner drills nouns for a week. Cite ADR-0011; no new ADR.

`CONTEXT.md` → Redemittel yield was updated in this session to name both scopes and to say the
lifetime figure is banked because the conversation can never be re-counted.

### 7 · The matcher strips *all* punctuation — a real bug fix over the prototype

The prototype's `sprNeedle` strips only `… ? ! .`, keeping commas. Ten of the 42 needles therefore
carry a comma inside their first 24 characters:

```
ich bin der ansicht, das      für mich steht fest, das      im prinzip ja, allerding
ich bin davon überzeugt,      einerseits stimmt das, a      darf ich nachfragen, wie
ich finde es wichtig, da      das mag sein, trotzdem        wir sind uns also einig,
                                                            insgesamt denke ich, das
```

Chrome's speech recognizer does not emit commas, so **24% of the Redemittel are unmatchable in a
`spoken` Discussion**, and easily missed in typed input too. Fix: strip `[.,;:!?…]` and collapse
whitespace on both needle and haystack. Verified safe — still **zero** 24-char prefix collisions
across all 42 phrases, shortest needle 16 chars (`aus meiner sicht`).

Also verified and deliberately *not* changed: all 42 phrases are Sie-forms, and the partner prompt
siezt the learner (`useSprechenPartner.ts:54`). A learner who duzt misses the match *and* earns a
`register` tag — the right outcome, not a bug.

`CONTEXT.md` already settles what counts: yield measures *use*, not command, so a phrase the learner
produced without consulting the panel counts.

### 8 · Move nudge: unused this run, tie-broken by lifetime

Candidates are the `HINT_MOVES` not yet used in this Discussion — nudging toward a Move already used
this run is noise. Among those, pick the one with the **lowest lifetime count** rather than the first
in array order, so a learner who never asks back is nudged toward Nachfragen before Beispiel geben.
This satisfies both the doc (§5: "not used this run") and `CONTEXT.md` (lifetime yield is "the basis
for suggesting a Move the learner has not reached for").

Shown from turn 2, dismissible for the run, hidden when hints are off, **never validated against**.
A `Move nudge` entry was added to `CONTEXT.md` in this session, pinning it against [KI-Tipp]: the
nudge is free, local, and suggests *how*; a KI-Tipp costs a call and suggests *what*.

### 9 · Korrekturdrill grading is deterministic

`foldGerman()` (existing, not the doc's duplicate `sprFold`) plus punctuation/whitespace stripping,
against `suggested`. Zero AI, works offline, consistent with ADR-0007. A miss is not punitive: the
reveal shows `suggested` and `reasonDe`, and the item stays open and returns in a later session. If
misses prove annoying in practice, an AI equivalence check can be added later with no data change.

### 10 · A Korrekturdrill session records a Run — see ADR-0013

`sprechen-drill` joins `QuizHistoryType`. The append-only `CorrectionEvent` writes are *not*
optional (ADR-0012 derives drilled-ness from them), so a drilled correction produces two records.
ADR-0013 records why, and that the two can legitimately disagree offline.

Because `useQuizStats`, `quiz-type-labels` and `useLevelAssessment` key exhaustive
`Record<QuizHistoryType, …>` maps, the compiler forces every call site. The level-assessor
description names it as re-practice of previously-marked mistakes so a high score reads as "revised
successfully", not as fresh B2 competence.

Run fields: `count` = items served, `correct` = items right on **first try** in that sitting.

### 11 · A new `src/styles/sprechen.css`

Imported in `main.ts` *after* `modules.css`, so `.spr-*` can override shared drill vocabulary. Keeps
three unrelated module families out of one ~1,100-line file and is the first step toward splitting
`modules.css` per family. `.spr-*` collides with nothing in the repo (current classes are `prep-*`,
`topic-*`, `run-*`, `proto-*`, `mistake-*`, `archive-*`, all of which are deleted).

Per §9 the sheet uses existing tokens only — no new colours. Breakpoints: rails and sticky cards
unstick at 1080px; two-column grids collapse at 720px, where the matrix drops its quote column.

**Deliberate divergences from the design source** (the DW/DaC import documented its own; this is the
equivalent list):

- **Omit every Teil 1 selector family** — `.spr-ab`, `.spr-sheet*`, `.spr-plan*`, `.spr-secmast*`,
  `.spr-timebar*`, `.spr-cov*`, `.spr-step-btn`, `.spr-step-t`, `.spr-move.fit` — and rewrite the
  first of the two `@media (max-width:1080px)` blocks, which interleaved Teil 1 rules with the
  `.spr-parts` rules that are needed.
- **Add `.spr-part.dead` / `.spr-part-soon`.** The design has no state for a non-interactive part
  panel; Teil 1's deferred panel must not look clickable.
- **Add `flex-wrap:wrap` to `.spr-sides`.** The design's row carries three items; the app's carries
  four because Modality joins them, and the rule it replaces (`.sides` in the old `Teil2Prep.vue`)
  wrapped. Without it the row overflows at narrow widths.

### 12 · The masthead compares Modalities

The doc shows the last run's four criterion bars. Instead, each criterion gets a **paired** bar — the
latest typed run and the latest spoken run — with a `Δ gesprochen −15` line and the pass rule
beneath. Latest per Modality, not best or mean: it matches the panel's own label and avoids
cherry-picking.

Falls back to a single bar set when only one Modality has runs, and to empty bars against the rubric
maxima when there are none (as the doc specifies — never an empty state).

Rationale: `CONTEXT.md` → Modality says the point of one shared rubric is that *"how much worse am I
when I have to speak?" is an answerable question*. A single bar set doesn't answer it, and every Run
already carries `meta.sprechenCriteria` + `meta.sprechenModality`.

## Architecture

### New modules

| File | Contents |
|---|---|
| `src/styles/sprechen.css` | ported `.spr-*` sheet (decision 11) |
| `src/composables/useRedemittelMatch.ts` | `needle()`, `matchRedemittel(texts)`, `movesUsed()`, `movePerTurn()`; pure, no network, no Vue import — mirrors the `useDwSentenceStats.ts` convention |
| `src/composables/useRedemittelYield.ts` | the `gt:sprechenRedemittel` rollup: read + bump. Cannot be seeded from history — old Runs carry no matched ids and their transcripts are gone |
| `src/modules/sprechen/SprechenDrill.vue` | Korrekturdrill runner, route `sprechen-drill` at `/sprechen/drill` |
| `src/components/sprechen/SprYield.vue` | one column per Move, `hit/total`, a tick row, an italic line under any zero-hit Move |
| `src/components/sprechen/SprCriterionBars.vue` | the paired typed/spoken bars, reused by hub masthead and Auswertung |

### Rewritten

`SprechenHome.vue` (four bands: masthead, part panels, shared rows, Ausbeute + run list),
`Teil2Setup.vue` (browser + sticky Prüfungskarte), `Teil2Prep.vue` (re-skin only — behaviour is
already correct), `Teil2Runner.vue` (rail + protocol + two-axis drawer + nudge + composer),
`Teil2Result.vue` (verdict → matrix → yield → marked transcript → Stärken/Schwächen → Gesamturteil),
`SprechenArchive.vue` (`.spr-kind` counters + ledger rows), `SprechenCheatsheet.vue`
(`.plate` / `.mini-table`, no tab strip).

Delete `.sprechen-grid`, `.recent-runs*` and every scoped block the new sheet replaces.

### Touched

`useSprechenGrader.ts` (optional `structure` / `interaction`, prompt extension),
`useQuizHistory.ts` (`sprechen-drill` type, `meta.sprechenRedemittel`, rollup bump),
`HistoryPage.vue`, `quiz-type-labels.ts`, `useQuizStats.ts`, `useLevelAssessment.ts` (exhaustive
maps + the stale "typed discussion" wording at line 142), `useUserData.ts` (`USER_DATA_KEYS`),
`router.ts` (one route).

### Result-page detail the doc misses

`SPRECHEN_B2_TEIL2.criteria[1]` carries **both** `descriptorDe` and `descriptorSpokenDe`. §5.2 says
to read the descriptor verbatim and never paraphrase — so the Auswertung must pick the spoken variant
when `modality === 'spoken'`.

### Runner rail details

- The L1–L`n` stepper labels each completed turn with the Move it actually used, from
  `movePerTurn()`. Ties resolve by most matches, then `HINT_MOVES` order. A turn that matched nothing
  shows `—`, not an empty cell.
- 42-dot Redemittel grid, live, from the in-memory turns.
- For a `spoken` Discussion the rail also shows live tempo (wpm) from `TurnSpeech` — the one thing
  that Modality uniquely measures and the prototype could not know to display.
- The composer's `· für einen B2-Beitrag noch knapp` warning under 25 words applies to **both**
  Modalities; a spoken turn's word count is known live from the recognizer.

## Testing

**The Sprechen module has zero component tests.** All 13 existing test files
(`tests/composables/useSprechen*.test.ts`, `tests/data/sprechen*.test.ts`, `tests/db/sprechen*.test.ts`,
1,532 lines total) cover data and composables — nothing mounts a `.vue` file. Unlike the DW/DaC
import, where 36 test files queried `.sub-*` classes, **the re-skin has essentially no blast
radius.** New tests target the new logic instead:

- `tests/composables/useRedemittelMatch.test.ts` — punctuation stripping (all ten comma needles must
  match a comma-free haystack), the zero-collision invariant across all 42 phrases as a guarded data
  test in the spirit of `tests/data/directionItems.test.ts`, `movePerTurn` tie-breaks, the no-match
  `—` case.
- `tests/composables/useRedemittelYield.test.ts` — bump, absent key reads as zero, corrupt JSON and malformed entries discarded.
- `useSprechenGrader.test.ts` additions — a response *without* `structure`/`interaction` still
  validates; a wrong-length `structure` is padded/truncated, not rejected.
- Move-nudge selection: unused-this-run filtered, lifetime tie-break, hidden when hints off.
- Korrekturdrill grading: folded match, umlaut folding, a miss leaves the item open.
- `sprechen-drill` in every exhaustive `Record<QuizHistoryType, …>`.

Baseline must be measured on this branch before any change; any red test afterwards is a regression.

## Verification

- `npm run typecheck` clean (`noUnusedLocals` / `noUnusedParameters` are on — deleting markup without
  deleting the `ref`/`computed` behind it fails the build).
- `npm test` green.
- Manual pass at 1440 / 1080 / 720 / 480 px in both themes: hub, Themenwahl, Vorbereitung, runner in
  **both** Modalities, Auswertung with and without `structure`, archive, Korrekturdrill, cheatsheet.
- A graded spoken Discussion yields a non-empty Redemittel match (the punctuation fix).
- A user palette override still applies (the `usePalette` contract is test-locked).

## Release

`1.15.00` → **`1.16.00`** (`YY` marks a module-level change). Bump `src/data/changelog.ts`
`APP_VERSION` + a new entry and `package.json` as two commits, merge to `main`, push, `npm run deploy`.

## Deliberately not done

- Teil 1, in any form beyond the dead panel.
- No `part` field anywhere — free to add when Teil 1 lands.
- No rubric change, no new criterion, no score split (decision 4).
- No cross-module CSS consolidation; `modules.css` is untouched.
- No `data-testid` migration.
