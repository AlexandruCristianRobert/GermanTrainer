# Verb sentence quiz · Zeitformen selection

**Date**: 2026-08-06
**Status**: approved

## The idea

The Satz (KI) drill currently leaves tense to the model — the system prompt says "vary the tense
naturally for the requested CEFR level" and that is the only control anyone has. This adds a
**Zeitformen** field to the sentence-quiz setup: the learner picks which tenses/forms to practise,
and every generated sentence is *assigned* one of them before any AI call. The model is told the
required form per item, the card shows it as a badge, and the grader knows it too.

This is the verb *sentence* drill only. The word-level Übersetzen quiz has no sentences and no
tense; it is untouched.

## Decisions

| Question | Decision |
|---|---|
| Tense vocabulary | The existing `VerbTense` union — 9 active + 6 passive forms with `TENSE_LABELS` and CEFR grades in `TENSE_LEVEL` (`src/data/verbs.ts:55-115`). All 15 are offered. No new enum. |
| How the choice takes effect | Per-spec assignment before generation: each sentence spec gets one tense from the selection via a refilling shuffled bag (even coverage), decided offline like every other randomization (ADR-0004). Not a prompt-level "pick from these" — the model gets no say. |
| First-run default | Level-aware: all tenses at or below the highest selected verb level (CEFR via `verbLevelToCefr`; empty levels cap at B1, matching `levelLabel`'s fallback band). The selection *follows* the level until the learner first touches a tense chip or All/None; from then on it is persisted verbatim in `verbSentenceSetup` and level changes stop affecting it. |
| Persistence | `tenses?: VerbTense[]` in the `verbSentenceSetup` blob, written only once customised; validated against `VERB_TENSES` on load (the `verbConjQuiz` precedent). |
| Empty selection | Start disabled plus a warning alert, like the other empty-pool cases on this screen. |
| Passive tenses | A passive sentence needs a passivizable verb. Chips for passive forms are disabled (with a short info note) when the filtered verb pool has no verb with case `accusative` or `dative+accusative` — the exact `passiveSupported` rule from `ConjugationQuizSetup.vue:55-57`. At start, disabled-but-still-stored passive tenses are dropped from the effective selection. |
| Specs with a passive tense | The tense is drawn first; when it is passive, that spec's verbs are drawn from the accusative-capable subset of the pool (its own refilling bag), so every verb in the sentence can actually be passivized. |
| Remedial flow | Unchanged. `VerbRemedialSetup` builds specs without tenses; specs without a `tense` keep today's "vary naturally" generation verbatim. |
| Card display | Each card shows the assigned form as a small badge next to the English sentence (`TENSE_LABELS`). Necessary: English does not disambiguate Perfekt vs. Präteritum, nor signal Konjunktiv. |
| Grading | `gradeVerbAnswer` learns the required tense. The grade prompt gains a `TARGET TENSE` line and an instruction that a correct sentence in the *wrong* tense is incorrect, tagged `conjugation` (the tag already exists). |
| Response schema | Unchanged. We assigned the tense ourselves; the spec is the source of truth. An echo field would only repeat the claim, not verify it. |
| History | The run's `meta` gains `verbSentenceTenses` alongside the existing levels/types/cases. |

## Architecture

### Data model (`useVerbSentenceQuiz.ts`)

- `VerbRef` gains `case?: VerbCase` (filled by `verbToRef`) — the passive-eligibility check needs it
  inside spec building. Optional, so stashed specs from older sessions still parse.
- `VerbSentenceSpec` gains `tense?: VerbTense`. `GeneratedVerbSentence` extends the spec, so the
  tense flows to cards and grading for free.
- `buildVerbSpecs` gains an optional `tenses?: readonly VerbTense[]` parameter. Per spec it draws
  the tense first (a `makeBag` over the tense selection — the same refilling-shuffled-bag primitive
  the verbs and nouns already use), then draws verbs: from the full pool normally, from the
  accusative-capable subset when the tense is passive. No `tenses` → no `tense` fields → exactly
  today's behaviour.

### Generation prompts

- A `TENSE_PROMPT_HINTS: Record<VerbTense, string>` map gives each form its German name plus a short
  English gloss for the model — e.g. `perfekt` → "Perfekt (conversational past)", `imperativ` →
  "Imperativ (a command, du-form)", `konjunktiv1` → "Konjunktiv I (reported speech — frame the
  sentence as indirect speech)", passive forms → "Vorgangspassiv (werden + Partizip II)" variants.
- Each spec line in `buildVerbGeneratePrompt` gains `; Zeitform: <hint>`, and a tensed batch adds
  one instruction: every item names its required form and the German sentence MUST use it.
- The system prompt becomes `verbGenSystem(tensed: boolean)`: the current "vary the tense naturally"
  sentence stays for untensed batches and is replaced by an obey-the-assigned-form sentence for
  tensed ones.
- `VERB_ANGLE_POOL` splits into tense-neutral angles (scenes, subjects, question framing, adverb
  openers) and tense-implying ones ('put it in the Perfekt (past)', 'use a future intention
  (morgen / nächste Woche)', 'frame it as advice or a suggestion', 'use a polite request (Sie)').
  Tensed batches draw only from the neutral list; untensed batches keep the full pool.
- `validateVerbSentencePair` is unchanged — we cannot reliably verify conjugation client-side, and
  over-strict validation forces slow retries (its own stated principle).

### Setup screen (`VerbSentenceSetup.vue`)

A **Zeitformen** field after "Object case", following the conjugation setup's CEFR-grouped chip
pattern (`ConjugationQuizSetup.vue:67-81, 172-187`): one chip row per CEFR band A1→C1, each chip
labelled from `TENSE_LABELS`, with All/None actions like the neighbouring fields. The grouping
logic is small and the codebase already tolerates this duplication (the `toggle` helper exists in
three setups); no shared component is extracted.

The level-following default:

```
customTenses : VerbTense[] | null   ← null until first chip/All/None interaction, persisted when set
selectedTenses = customTenses ?? defaultTensesFor(levels)
defaultTensesFor: tenses whose TENSE_LEVEL ≤ max CEFR of the selected levels (B1 cap when empty)
```

`canStart` additionally requires a non-empty *effective* selection (selected minus unsupported
passive forms). `start()` passes the effective tenses into `buildVerbSpecs` and adds `tenses` to
the stash `meta`.

### Runner (`VerbSentenceRunner.vue`)

- Stash type: `meta` gains `tenses?: VerbTense[]`.
- The question card shows a badge with `TENSE_LABELS[current.tense]` next to the English sentence
  (both word-hint modes) whenever the spec carries a tense.
- `gradeVerbAnswer` call passes `tense: s.tense`; `GradeVerbOptions` gains `tense?: VerbTense` and
  `buildVerbGradePrompt` adds a `TARGET TENSE` line to the user prompt and the wrong-tense-is-wrong
  rule to the system prompt, both only when a tense is present.
- History meta written at run end gains `verbSentenceTenses`.

### Edge cases

- **Stored junk**: persisted tenses are filtered against `VERB_TENSES` on load.
- **Imperativ**: the hint asks for a du-form command; the English will read as an imperative
  ("Open the door!"). Grading stays as lenient as today about valid variants.
- **Konjunktiv I**: the hint steers generation to reported speech, its only natural habitat.
- **Passive selected, pool loses accusative verbs later**: chips disable reactively; stored
  selection is not mutated, but `start()` drops unsupported passive forms from what it passes on.

## Files

| File | Change |
|---|---|
| `src/composables/useVerbSentenceQuiz.ts` | `VerbRef.case`, `VerbSentenceSpec.tense`, tense-aware `buildVerbSpecs`, `TENSE_PROMPT_HINTS`, angle-pool split, `verbGenSystem(tensed)`, tensed `buildVerbGeneratePrompt`, `GradeVerbOptions.tense` + grade-prompt additions |
| `src/modules/verbs/VerbSentenceSetup.vue` | Zeitformen chip groups, level-following default, persistence + validation, passive gating + info note, `canStart`, effective tenses into specs and stash meta |
| `src/modules/verbs/VerbSentenceRunner.vue` | stash type, tense badge on the card, tense into grading, `verbSentenceTenses` in history meta |
| `CONTEXT.md` | [Verb sentence quiz] notes the Zeitformen selection and the level-following default |
| `tests/composables/useVerbSentenceQuiz.test.ts` (or sibling) | tense assignment: even bag coverage, passive→accusative-verb constraint, untensed specs unchanged; prompt contains per-item Zeitform + batch rule; grade prompt contains TARGET TENSE only when given |
| `tests/modules/verbs/VerbSentenceSetup.test.ts` | default follows level until touched, persistence round-trip, load validation, passive chips disabled without accusative verbs, Start disabled on empty selection |
| `tests/modules/verbs/VerbSentenceRunner.test.ts` (existing suite) | badge renders when a spec has a tense, absent when not |

## Out of scope

Tense support for the word-level Übersetzen quiz, response-schema changes (tense echo), tense-based
statistics or weak-point tracking, a badge on the result rows (the reference German already shows
the form), changes to the remedial flow, and extraction of a shared tense-chip component.
