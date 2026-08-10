# Sprechen grader recalibration (Teil 1 + Teil 2)

Date: 2026-08-10 · Status: approved

## Problem

A typed Teil 1 Vortrag that covered everything and contained only typos scored 75/100.
Three causes, all in the grader prompts — the validators are fine:

1. **Word count is scored.** The typed rubric note says "Die Redezeit wird hier über den
   Umfang geschätzt (360 Wörter ≈ 4 Minuten)" and `erfuellung` asks "Ist der Vortrag
   angemessen lang?" — so a complete but compact Vortrag reads as "too short for 4
   minutes" and gets docked.
2. **Band anchors have a hole.** `TEIL1_BAND_ANCHORS` describes 24–25 and 18–19 with
   nothing between: "very good with small flaws" mechanically lands at ~19 × 4 ≈ 76.
3. **Typos count as real errors.** Typed runs let `spelling` mistakes dock criteria,
   although the real exam is oral — spelling is not assessed there. The "strenge,
   kalibrierte Prüferin" persona amplifies all of the above.

## Decisions (user-approved)

- **Length leaves the scoring.** A new floor `VORTRAG_MIN_WORDS = 200` replaces all
  length judgement: at ≥200 words, length must not influence any criterion; below 200,
  only `erfuellung` is reduced. The word count is computed in code and injected into the
  prompt so the model never miscounts. Typed runs only — spoken runs keep the real clock
  and the SPRECHDATEN→`kohaerenz` scoping unchanged.
- **Typos are feedback-only** (both Teile, typed runs): still detected and listed as
  `spelling` mistakes, but the prompt states they must not lower any criterion score.
- **Calibration target: 90+ / sehr gut** for a complete, clearly structured performance
  with only isolated small slips. Anchors rewritten as four contiguous bands
  (23–25 / 18–22 / 12–17 / 5–11) with a generous top band, plus an explicit
  "im Zweifel die höhere Punktzahl" line. Teil 2 has no anchors; it gets the same
  calibration line instead.
- **Persona softened** (both Teile, both modalities): "strenge, kalibrierte Prüferin" →
  a fair, realistically calibrated examiner who grades like a real Goethe examiner.
- **Runner floor aligned:** the under-length confirmation in Teil1Runner moves from
  150 to 200 words (`VORTRAG_MIN_WORDS`).

## What deliberately stays

- Per-missing-Gliederungspunkt deduction ("mindestens 4 Punkte Abzug") — coverage is
  content, not length.
- The F9 coverage/erfuellung consistency check and all validator/re-anchoring logic;
  `totalScore`/`passes` stay derived.
- Teil 2's "sehr kurze, einsilbige Beiträge mindern die Punktzahl" and the few-turns
  strictness note — they are the Teil 2 analog of the 200-word floor.
- The live word meter, Redezeit display, and `redezeit()` bands — display-only.
- Spoken-modality evidence blocks (SPRECHDATEN), the spoken spelling-tag ban, and
  `hardLimitReached`.

## Tests

The byte-pinned Teil 2 baseline (`BASELINE_TYPED_SYSTEM`) is re-pinned to the new
strings — this is a deliberate behavior change. New assertions: the 200-word rule and
computed word count appear for typed Teil 1 runs only; the typo rule appears for typed
runs only; the new persona and contiguous anchors are present.
