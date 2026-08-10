# Plan: Sprechen grader recalibration (Teil 1 + Teil 2)

Spec: `docs/superpowers/specs/2026-08-10-sprechen-grader-recalibration-design.md`

## Global Constraints

- **Spoken-modality behavior is unchanged except the persona sentence.** The
  SPRECHDATEN blocks, their "nur kohaerenz" scoping, the spoken spelling-tag ban,
  `hardLimitReached`, and `redezeit()` are not touched.
- **Validator logic is unchanged** in both graders: F9 consistency check, re-anchoring,
  Aufwertung dosing, derived `totalScore`/`passes`, coverage projection. Only prompt
  strings, rubric strings, and one new exported constant change.
- The line `Pro nicht behandeltem Gliederungspunkt mindestens 4 Punkte Abzug bei
  erfuellung.` stays verbatim in the Teil 1 prompt.
- All new German prompt text must be grammatically correct, in the same examiner
  register as the existing strings (informal-free, du-form addressing the grader).
- The new floor constant is `VORTRAG_MIN_WORDS = 200`, exported from
  `src/data/sprechenVortragsmittel.ts` next to `VORTRAG_TARGET_WORDS`, and is the ONLY
  place the number 200 appears — grader prompt and runner confirm both import it.
- `npm test` and `npm run typecheck` green after every task.

## Task 1 — Teil 1 grader recalibration

Files: `src/data/sprechenVortragsmittel.ts`, `src/data/rubrics.ts`,
`src/composables/useVortragGrader.ts`, `tests/data/rubrics.teil1.test.ts`,
`tests/composables/useVortragGrader.test.ts`.

1. `sprechenVortragsmittel.ts`: export `const VORTRAG_MIN_WORDS = 200` beside
   `VORTRAG_TARGET_WORDS`, with a comment: the grading floor — below it only
   `erfuellung` may be reduced; at or above it length must not move any score.
2. `rubrics.ts` → `SPRECHEN_B2_TEIL1`:
   - `erfuellung.descriptorDe`: replace the sentence "Ist der Vortrag angemessen lang
     und durchgehend auf das Thema bezogen?" with "Ist der Vortrag durchgehend auf das
     Thema bezogen?" (length judgement removed, topic focus kept).
   - `notes` (typed): remove "Die Redezeit wird hier über den Umfang geschätzt
     (360 Wörter ≈ 4 Minuten), nicht über eine Uhr." and add instead: "Der Umfang des
     Vortrags beeinflusst die Bewertung nicht, solange er mindestens 200 Wörter
     umfasst." (Write the number via string interpolation of `VORTRAG_MIN_WORDS` if
     rubrics.ts can import it without a cycle; otherwise keep the sentence generic:
     "solange er die Mindestlänge erreicht" — the binding rule lives in the grader
     prompt either way.) `notesSpokenDe` is unchanged.
3. `useVortragGrader.ts`:
   - `graderPersonaDe`: in BOTH branches replace "strenge, kalibrierte Prüferin" with
     "faire, realistisch kalibrierte Prüferin". Append to both branches: " Du bewertest
     wie in der echten Goethe-Prüfung: wohlwollend im Zweifel, ohne Fehler zu erfinden."
   - `TEIL1_BAND_ANCHORS`: rewrite all four criteria as four CONTIGUOUS bands
     23–25 / 18–22 / 12–17 / 5–11. The top band must explicitly tolerate isolated
     small slips, e.g. for `erfuellung`: "23–25: alle fünf Punkte tragen, Position klar
     begründet, Nachfrage inhaltlich beantwortet — vereinzelte kleine Ausrutscher
     ändern daran nichts." Keep each anchor's register and content parallel to the
     current text, adjusted to the new band edges. Keep the record's key type unchanged.
   - System prompt: add a calibration block (after the Aufwertungen paragraph, before
     the JSON shape) reading: "KALIBRIERUNG: Ein Vortrag, der alle fünf
     Gliederungspunkte behandelt, klar gegliedert ist und nur vereinzelte kleine Fehler
     enthält, gehört in den Bereich 90–100. Vergib im Zweifel die höhere Punktzahl."
   - Typed-only typo rule: in the mistakes bullet list, immediately after the
     `spellingCaveatDe` slot, inject for TYPED runs only (new helper, same resolver
     pattern): "- Tippfehler (Kategorie \"spelling\") werden als Fehler aufgelistet,
     dürfen aber KEINE Kriteriumsnote senken — die echte Prüfung ist mündlich, dort
     wird Rechtschreibung nicht bewertet.\n"
   - Typed-only UMFANG block: in `buildVortragGraderPrompt`, for typed runs append to
     the `user` string (where spoken runs get `sprechdaten`):
     `UMFANG: Der Vortrag umfasst <N> Wörter (vom System gezählt).` followed by:
     "Ab ${VORTRAG_MIN_WORDS} Wörtern darf der Umfang keine Punktzahl beeinflussen —
     weder positiv noch negativ. Nur unter ${VORTRAG_MIN_WORDS} Wörtern mindert der
     geringe Umfang die Punktzahl bei erfuellung, und NUR dort." Compute N with the
     existing `wordCount()` on `v.rede.textDe`. Spoken runs: no UMFANG block.
4. Tests:
   - `useVortragGrader.test.ts`: the band-anchor test (~line 179) must assert the new
     contiguous bands (e.g. `toContain('23–25')` and `toContain('18–22')` for one
     criterion) and keep `toMatch(/mindestens 4 Punkte Abzug/)`. Add: typed prompt
     contains `UMFANG:` and the computed word count and the 200-word rule; spoken
     prompt does NOT contain `UMFANG:`; typed prompt contains the typo rule, spoken
     prompt does not; both personas say "faire, realistisch kalibrierte"; system
     contains `KALIBRIERUNG`.
   - `rubrics.teil1.test.ts`: adjust any assertion touching the removed sentences;
     assert `notes` no longer contains "360" and `descriptorDe` of erfuellung no longer
     contains "angemessen lang".
   - Run the full suite; fix any other test pinning the old strings
     (`Teil1Runner`/`Teil1Result` fixtures do not pin prompt text, but verify).

## Task 2 — Teil 2 grader leniency

Files: `src/composables/useSprechenGrader.ts`,
`tests/composables/useSprechenGrader.test.ts`.

1. `graderPersonaDe`: both branches "strenge, kalibrierte Prüferin" → "faire,
   realistisch kalibrierte Prüferin", with the same appended sentence as Task 1
   ("Du bewertest wie in der echten Goethe-Prüfung: wohlwollend im Zweifel, ohne
   Fehler zu erfinden.").
2. Typed-only typo rule, same wording and resolver pattern as Task 1, injected after
   the `spellingCaveatDe` slot (adjusted: "Diese Übung ist getippt, die echte Prüfung
   ist mündlich" applies identically).
3. Calibration line in the system prompt (after the descriptive-fields paragraph,
   before the rubric lines): "KALIBRIERUNG: Beiträge mit klarer Position, Begründung
   und Reaktion auf den Partner, die nur vereinzelte kleine Fehler enthalten, gehören
   in den Bereich 90–100. Vergib im Zweifel die höhere Punktzahl."
4. The source comment saying the typed branch "must never be touched" (above
   `graderPersonaDe`) is updated: the baseline was re-pinned on 2026-08-10 as part of
   the deliberate grader recalibration; the invariant is now "typed and spoken differ
   only in modality wording", not byte-stability against the pre-spoken-feature text.
5. Tests: re-pin `BASELINE_TYPED_SYSTEM` to the exact new typed system string
   (`BASELINE_TYPED_USER` is unchanged — the user string gains nothing for typed
   Teil 2). Add assertions: typed system contains the typo rule and `KALIBRIERUNG`;
   spoken system does not contain the typo rule; both contain "faire, realistisch
   kalibrierte". The fewTurns "entsprechend streng" line stays verbatim.

## Task 3 — Runner floor alignment

Files: `src/modules/sprechen/Teil1Runner.vue`, `tests/modules/Teil1Runner.test.ts`.

1. Import `VORTRAG_MIN_WORDS` and use it in the F12 under-length confirmation:
   threshold `currentWords < VORTRAG_MIN_WORDS` (was 150), message "Mit weniger als
   200 Wörtern ist die Bewertung wenig aussagekräftig. Trotzdem beenden?" built from
   the constant, not a literal 200.
2. Update the F12-related comments (~lines 400 and 670) from "150" to
   `VORTRAG_MIN_WORDS`.
3. Update `Teil1Runner.test.ts` F12 cases: word counts that previously sat just above
   150 to dodge/trigger the confirm move to sit around 200 accordingly.

## Release (orchestrator, after final review)

Patch-bump `package.json` (1.18.08 → 1.18.09), changelog entry in
`src/data/changelog.ts`, merge to main, `npm run deploy`, push main.
