# Sätze: Tagesziel 100 Fachgebiet-Karten + Verb-Hover zeigt das echte Verb

**Spec:** user request 2026-08-14 —
(1) "force myself to do 100 sentences from the newly added categories … a checkpoint
daily … 0 from 100 or 57 from 100 … always visible, but not right in the face, like
in a corner"; (2) "the verbs that appear on hover are not the verbs used in the
generated response by the AI — check why; adapt it so the exact German word appears
on hover". Then patch bump + publish (standing release flow).

## Root cause of (2) — confirmed by code reading

`validatePackedCard` (src/composables/usePackedSentenceQuiz.ts) hard-checks that
every drilled preposition, da-compound and connector appears in the AI's German —
but **verbs are never checked** (they are conjugated, so the naive substring check
was skipped). When the AI writes German that uses a synonym instead of the required
verb, the card ships anyway; the hover popover (`packedHint`) still shows the spec
verb's infinitive. Secondary issue: even when the verb IS used, the hint shows only
the dictionary form, which the learner may not recognize in the conjugated /
prefix-separated surface form.

## Global Constraints

- Phone-first: everything must render and work at ~390 px.
- `saveQuizRun` history schema untouched; no dist/ changes in feature commits.
- Existing tests keep passing; new logic gets tests
  (tests/composables/usePackedSentenceQuiz.test.ts pattern).
- German UI copy in the module's existing voice; micro-typography via existing
  utility classes (micro-mark, hairline, paper vars).
- Daily goal target: 100; "newly added categories" = ANY Fachgebiet card
  (`card.domain` set) — the entire Domain bank is < 4 days old.
- Counted: every GRADED packed-sentence card with a domain, both directions,
  main and practice rounds alike (effort tracking, not proficiency stats).
- Storage: localStorage `gt:dailyDomainGoal` = `{ date: 'YYYY-MM-DD' local,
  count: number }`; rollover resets the count, never carries over.
- Verb validation must be deterministic (VERBS conjugation tables), never
  trust an AI-claimed field as presence evidence.
- Nouns stay unvalidated (inflection matcher too risky) — out of scope.

## Tasks

### Task 1 — Verb-presence gate + exact-form hover (bug fix)
Files: `src/composables/usePackedSentenceQuiz.ts`,
`tests/composables/usePackedSentenceQuiz.test.ts`.

a. `verbUsedInGerman(verbGerman, germanText)`: look up the full Verb in VERBS;
   build candidate token-sets (infinitive; partizip2; each praesens /
   praeteritum / konjunktiv2 / konjunktiv1 table form split on whitespace;
   imperativDu; präteritumStem+endings when no table; separable extras: joined
   subordinate forms (prefix+finite), zu-infinitive (auf-zu-stehen)); the verb
   counts as used when any candidate's tokens are ALL present as whole words in
   `normalizeGerman(germanText)`. Wire into `validatePackedCard` as a hard
   containment check like preps/dacs/conns.
b. Verb spans carry the surface form: extend `PackedSpan` with optional
   `deUsed`; ask for it in PACKED_GEN_SYSTEM + buildPackedGeneratePrompt +
   PACKED_GEN_SCHEMA (verb keys only: the exact German form(s) of that verb as
   they appear in the German passage, finite form plus separated prefix if
   split); in validation keep `deUsed` only if all its tokens appear as whole
   words in the German, else strip. `packedHint` gains the form as a muted
   note line: `im Text: <deUsed>` (popover already renders `note`).

### Task 2 — Daily Fachgebiet goal (feature)
Files: `src/composables/useDailyDomainGoal.ts` (new),
`src/components/DailyGoalBadge.vue` (new), `src/App.vue`,
`src/modules/sentence/SentenceRunner.vue`,
`tests/composables/useDailyDomainGoal.test.ts` (new).

Singleton composable (target 100, reactive count, `recordCard()`, local-date
rollover on mount/focus/visibility/record, cross-tab `storage` sync). Runner
records in `submit()` once graded when `card.domain` is set. Badge: fixed
bottom-right corner pill, app-wide in App.vue, subtle (micro-mark type, hairline
border, paper background, slight translucency), `data-print-hide`, z-index below
the mobile drawer, safe-area aware; shows label + `57 / 100`, success tone + ✓
at ≥ 100; click navigates to the sentence setup route.

### Task 3 — Finish (controller)
Full suite + typecheck, version 1.20.08 + changelog (polish), commit, merge
--no-ff to main, deploy, push, dist-index chore commit per release convention.
