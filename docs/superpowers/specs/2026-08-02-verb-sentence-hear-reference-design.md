# Verb sentence quiz · hear the reference sentence

**Date**: 2026-08-02
**Status**: approved

## The idea

A graded card already shows the model German sentence. This lets the learner *hear* it: on a graded
card, **Space plays the reference sentence aloud, Enter moves on**. On demand only — nothing ever
speaks by itself.

It completes the loop the spoken Modality started in 1.16.01. That change gave the drill an ear;
this one gives it a voice, and deliberately in **both** Modalities — a typed learner has just as much
use for hearing how the sentence sounds. Playback is therefore *not* a property of [Modality]:
Modality still decides only how the answer goes in.

## Decisions

| Question | Decision |
|---|---|
| What is spoken? | The reference sentence the card displays — `verdict.correction || sentence.german`. Never the learner's own answer, even when it was correct. |
| Keys | `Space` = hear (replays from the start), `Enter` = next. Same mapping in typed and spoken runs. |
| Voice | The German voice and tempo already chosen for the Sprechen Diskussion, via `useSpeechVoice()`. No second picker, no second stored preference. |
| Automatic playback? | No. Never speaks unless asked. |

### This changes a behaviour shipped in 1.16.01

In a spoken run, Space on a graded card currently advances to the next sentence (it falls through to
the focused Next button). It now speaks instead. Space keeps its recording job for the whole answer
phase — start, then end-and-submit — and only takes on "hear it" once the card is graded. Enter
advances in both Modalities, at every phase where advancing is possible.

## Architecture

`useSpeechVoice()` is reused unchanged — it already owns the voice list, the `voiceschanged`
refresh, the persisted voice/rate, the tail delay on `speaking`, and a `speak()` that always
resolves. The runner adds no TTS logic of its own.

```
VerbSentenceRunner
  ├─ useSpeechRecognizer  → answer in   (spoken Modality only)
  └─ useSpeechVoice       → reference out (both Modalities, graded phase only)
```

### Keyboard, precisely

The `window` keydown listener is currently bound only in spoken runs. It is now bound in **both**,
because a typed run needs Space and Enter on its graded cards too. One handler, evaluated in order:

- not `Space`/`Enter`, or `e.repeat` → ignore
- focus is in an `INPUT` / `TEXTAREA` / `contentEditable` → ignore, so typing a space still types a
  space and the typed composer's own Enter-to-submit still works
- `ending` is true → ignore (an in-flight `recognizer.end()`)
- **Space**, spoken run, and (phase is `input` or the recognizer is listening) → record / end-and-submit,
  exactly as today
- **Space**, phase is `graded`, playback available → speak the reference
- **Enter**, phase is `graded` → next
- anything else → fall through without `preventDefault`

Both handled cases call `preventDefault()`, which also cancels the browser's native
Space/Enter-activates-the-focused-button. That matters: after clicking the Anhören button, focus
sits on *it*, and without an explicit Enter case Enter would replay instead of advancing. Owning
both keys at the window makes the mapping independent of what happens to hold focus.

**When playback is unavailable** (no speech synthesis, or no German voice — the same bar Teil2Setup
applies), the Space case is skipped and the event falls through, so Space still activates the
focused Next button. A learner who can hear nothing keeps a working keyboard flow rather than a
dead key.

### Playback

`hearReference()` cancels anything mid-utterance and speaks from the start, so Space always means
the same thing however often it is pressed. Speech is cancelled when the card changes
(`tryAdvance`), when the run restarts (`retryWrong`), when it ends (`finishQuiz`) and on unmount —
a half-spoken sentence must never bleed into the next card.

### UI

Inside the existing `.prep-feedback` block, directly under the reference sentence it plays, a quiet
button plus a key hint:

```
✓ Richtig.
Der Hund hat den Ball gefangen.
🔊 Anhören          Leertaste hören · Enter weiter
```

The button reads `🔊 Anhören`, and `● Spricht…` while speaking. Absent entirely when playback is
unavailable — no disabled control, no explanation the learner cannot act on. The hint line is the
only place the key mapping is stated, and it renders in both Modalities.

## Files

| File | Change |
|---|---|
| `src/modules/verbs/VerbSentenceRunner.vue` | `useSpeechVoice`, `canHear`, `hearReference`, rewritten `onKey` (both Modalities, Space + Enter), cancel-on-transition, feedback-block button and hint, updated header comment |
| `CONTEXT.md` | [Verb sentence quiz] notes that either Modality can play the reference aloud on demand |
| `tests/modules/verbs/VerbSentenceRunner.voice.test.ts` | new — playback keys, what is spoken, cancel-on-advance, unavailable-voice fallback |
| `tests/modules/verbs/VerbSentenceRunner.spoken.test.ts` | update the graded-phase Space expectation |

## Out of scope

Playback on the result page's per-sentence rows, playback of the learner's own answer, playback of
the English prompt, and any auto-play. A voice picker in the verb setup: the Sprechen one is the
single place that preference lives.
