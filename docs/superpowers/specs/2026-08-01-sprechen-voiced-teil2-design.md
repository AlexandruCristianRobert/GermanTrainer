# Sprechen Teil 2 — Voiced Discussion (Design)

**Date:** 2026-08-01
**Status:** Grilled, approved, in implementation
**Depends on:** [ADR-0012](../../adr/0012-error-archive-append-only-dexie.md), CONTEXT.md → *Modality*, *Archived correction*, *Redemittel yield*

## Goal

A **spoken** Teil 2 Discussion: the AI partner's turns are read aloud, the learner answers
out loud, and the whole thing is graded on the existing rubric plus real fluency data. Free
only — browser `SpeechRecognition` and `speechSynthesis`, no audio recorded, uploaded, or
stored. Aussprache remains ungraded; **Flüssigkeit stops being a fudge.**

Offered as a separate test in the Sprechen module — its own hub entry, route, setup, prep
and runner — over the same [Discussion] concept the typed test uses.

## Decisions (settled during the grilling session)

| # | Question | Decision |
|---|---|---|
| 1 | Is a spoken Discussion its own concept? | **No.** `Discussion` widened to be modality-neutral; new **Modality** term (`typed` \| `spoken`). Separate *test*, same concept. |
| 2 | Phantom errors from misrecognition in the archive | **Archived unfiltered.** No Modality filter, no confidence gate, no delete. Per-tag counts read as "mistakes **or** mishearings". |
| 3 | How much context does an [Archived correction] keep? | **The learner's full sentence** — and the app's "conversation is never stored" copy is corrected to say what is actually true. |
| 4 | Where does the archive live? | **Dexie now, shaped like the future Supabase table** — append-only, drilled-ness as events. See ADR-0012. |
| 5 | Scope | **A new spoken runner in the design's visual language.** The typed runner is untouched; the 7-screen redesign is not a prerequisite. |
| 6 | Hints while the mic is live | **Everything stays visible.** Consequence: [Redemittel yield] measures use, not command. |
| 7 | Prep content | **Full argument bank incl. per-tag fallback** — every Topic has content instantly, offline, no call (fits ADR-0007). |
| 8 | Rubric and Run type | **Same 4 criteria × 25, modality-specific `kohaerenz` descriptor, one `QuizHistoryType`** with Modality in meta — so typed and spoken scores stay directly comparable. |

## 1. The speech engine

Two composables, both testable against fakes, neither aware of Vue routing.

### `useSpeechRecognizer.ts`

The auto-stop is not configurable — Chrome's endpointer fires `onend` on its own schedule. We
make `onend` a no-op while the learner still holds the floor:

- `holding` flag set by `start()` / cleared by `end()`; `onend` restarts the recognizer while
  it is set, and lets it die when it is not.
- **The finals buffer lives outside the recognizer.** Each restart resets `e.results`, so
  reading that array wholesale loses everything on every restart. Finals are appended to our
  own buffer; restarts become invisible to the caller.
- `restarts` is counted and returned — the endpointer only gives up after a silence long
  enough to end the utterance, so the count is a free **long-pause proxy**.
- Per-final `{ text, confidence }` spans are retained and returned for the result page.
- `onerror` mapping: `no-speech` → restart normally; `not-allowed` → kill voice mode and fall
  back to typing; `network`/`aborted` → surface, keep the turn.
- `rec.start()` throws `InvalidStateError` when already running — guarded.

Returns per turn: `{ text, startedAt, endedAt, restarts, spans }`.

### `useSpeechVoice.ts`

- German voices filtered from `getVoices()`, behind the async `voiceschanged` population.
- Persisted voice name and `rate`; `speak(text): Promise<void>` resolving on `onend`.
- A `speaking` flag with a short tail delay, because `speechSynthesis.speaking` stays true
  past `onend` in some browsers — this is what stops the partner being transcribed into the
  learner's own answer.

## 2. Interaction

Partner turn arrives → `speak()` → **then** the mic unlocks (gated on `myTurn && !speaking`).

- **Space** toggles the mic (`preventDefault`, or the page scrolls). Not bound while focus is
  in a text field.
- Live interim text streams into the learner's turn bubble, so self-repair works naturally.
- **Space again ends the turn, and ending sends it.** The transcript is **locked** — no edit
  step, by decision. One key, one action.
- Barge-in is impossible on the free path, so the flow stays strictly turn-based, which is
  what `computePhase` already assumes. **Partner wiederholen** re-speaks the last partner turn
  and a rate slider makes it slower; both are free listening practice.
- Firefox has no `SpeechRecognition` → the spoken test is disabled at setup with a plain note.
  A mid-run `not-allowed` drops to the textarea.

## 3. Fluency data (free, no AI)

Per learner turn: `spokenMs`, `reactionMs` (partner TTS end → mic open), `restarts`, `words`.
Derived: WPM, average reaction, total speaking time, pause count.

These reach the grader as a `SPRECHDATEN` block so `kohaerenz` is judged on evidence, and the
spoken descriptor drops the written-form hedge. They also surface on the result page and in
Run meta, so fluency is chartable over time.

## 4. What is out of scope

- `MediaRecorder`, audio upload, and Gemini audio grading — the ~$0.005/run path that would
  unlock a real Aussprache criterion. Deliberately deferred; the free loop ships first.
- Live API, barge-in, Teil 1 Vortrag.
- The archive browse screen and Korrekturdrill UI. The **write** path and repository ship here
  (corrections are archived from the first spoken run); the two screens are shared with the
  typed redesign and land with it.
- The 7-screen typed redesign from the Claude Design project.
