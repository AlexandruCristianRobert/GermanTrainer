# Verb sentence quiz · spoken Modality

**Date**: 2026-08-02
**Status**: approved

## The idea

The [Verb sentence quiz] currently has one input surface: a text field. This adds a second — the
microphone — reusing the exact interaction the Sprechen Diskussion already teaches: **Space starts
the turn, Space again ends it *and* submits**. No edit step, no confirm button. What the recognizer
heard is what was answered.

This is deliberately the *same* concept as Sprechen's [Modality], not a parallel one. A learner who
has done a gesprochene Diskussion already knows how this works, and the term already exists in the
domain language — CONTEXT.md's Modality entry widens from "a Discussion's" to "a Discussion's or a
Verb sentence quiz's" rather than gaining a sibling.

## Decisions

| Question | Decision |
|---|---|
| Where is Modality chosen? | On the setup page, persisted in the drill's localStorage settings, **fixed for the run** — same as Sprechen. No mid-run switching. |
| Does the Remedial drill get it? | Yes. It shares the runner; it is one extra stash field and one extra control. |
| Empty transcript? | Toast `Nichts verstanden`, stay on the card, nothing submitted, nothing marked wrong. Space tries again. |
| Edit before submit? | No. Space-to-end submits, exactly like Teil 2. |

## Architecture

Nothing new is invented for recognition. `useSpeechRecognizer('de-DE')` is used **unchanged** —
it already owns the hard part (Chrome's endpointer restarting under a held floor, the finals buffer
that survives restarts, the flush-on-stop promise, the `denied` error kind).

```
VerbSentenceSetup ──┐
                    ├─ sessionStorage stash { …, modality: 'typed' | 'spoken' }
VerbRemedialSetup ──┘
                              │
                    VerbSentenceRunner
                     ├─ typed  → <input> + Enter          (unchanged path)
                     └─ spoken → useSpeechRecognizer + window Space binding
                                    │
                    gradeVerbAnswer({ …, spoken })  → prompt branch, 'typo' suppressed
                                    │
                    saveQuizRun(meta.verbSentenceModality)
```

### The composer, spoken

The `.prep-input-wrap` form is replaced (not augmented) when the run is spoken:

- **Idle** — a mic button `● Sprechen` and the hint *Leertaste oder Knopf startet die Aufnahme.*
- **Listening** — the button becomes `■ Antwort abgeben` (danger styling), and the live transcript
  (`recognizer.liveText`) renders where the input was, so the learner sees what is being heard.
- **Checking** — button disabled, `Checking…`.
- **Graded** — the transcript stays on screen coloured by verdict (success/danger, mirroring the
  typed input's inline style) and the `Next →` button takes focus.

### Space, precisely

Bound on `window` in `onMounted` only when the run is spoken; removed in `onUnmounted`. It acts only
when it should:

- `e.code !== 'Space'` → ignore
- `e.repeat` → ignore (a held key must not re-enter `end()`)
- target is `INPUT` / `TEXTAREA` / `contentEditable` → ignore
- `ending` is true → ignore (an `end()` is in flight; a re-entrant Space would restart the
  recognizer and wipe the buffer that promise is about to resolve from)
- phase is not `input` and we are not listening → ignore **without `preventDefault`**, so that in the
  graded phase the browser's native Space-activates-the-focused-button carries the learner to the
  next sentence. Space therefore drives the entire run: speak, submit, advance, speak.

Otherwise: `preventDefault()` then toggle — start if idle, end-and-submit if listening.

### Grading a transcript

A speech transcript has no reliable capitalisation and no punctuation at all. Grading it with the
typed prompt would fail every answer on `typo`. So `GradeVerbOptions` gains `spoken?: boolean`, and:

- the system prompt says the learner **spoke** the German and a browser recognizer transcribed it;
  judge the words as transcribed; ignore capitalisation and punctuation entirely; never return
  `typo`, because the spelling is the recognizer's, not the learner's.
- `gradeVerbAnswer` additionally **strips** any `typo` tag from a spoken grade, so a model that
  ignores the instruction cannot leak it into history. Deterministic, not merely requested.

This is the same rule CONTEXT.md already states for [Sprechen error tag]'s `spelling` in a spoken
Discussion, applied to the verb tag set.

The offline fallback needs no change: `checkSentence` → `normalizeGerman` already lower-cases and
strips punctuation.

### Failure modes

| Case | Behaviour |
|---|---|
| Browser has no SpeechRecognition | Setup disables the *Gesprochen* button with a title; a stash that says `spoken` anyway falls back to typed in the runner. |
| Mic permission denied mid-run (`error.kind === 'denied'`) | Terminal for voice: the run drops to the typed composer, a toast explains, the text input takes focus. The quiz continues; no answers are lost. |
| Recognizer heard nothing | Toast, stay on the card, nothing recorded. |
| Network / other recognizer error | Recoverable — `useSpeechRecognizer` already surfaces it and keeps the floor; no runner-side handling. |

### History

`meta.verbSentenceModality?: 'typed' | 'spoken'` is written with every run. Absent means typed
(every run recorded before this change). The point is the same as Sprechen's: a typed and a spoken
score come from the same drill and the same grader, so they are comparable.

## Files

| File | Change |
|---|---|
| `src/composables/useVerbSentenceQuiz.ts` | `spoken` on `GradeVerbOptions`; prompt branch; `typo` stripped when spoken |
| `src/composables/useQuizHistory.ts` | `verbSentenceModality` in run meta |
| `src/modules/verbs/VerbSentenceSetup.vue` | Modalität control, persistence, mic gate, stash field |
| `src/modules/verbs/VerbRemedialSetup.vue` | same control + stash field |
| `src/modules/verbs/VerbSentenceRunner.vue` | recognizer, Space binding, spoken composer, denied fallback, meta |
| `CONTEXT.md` | Modality widened; Verb sentence quiz mentions both modalities; Verb error tag notes `typo` is never spoken |
| `tests/composables/useVerbSentenceQuiz.test.ts` | spoken prompt + tag-strip coverage |
| `tests/modules/verbs/VerbSentenceRunner.spoken.test.ts` | new — Space lifecycle, empty transcript, typed unaffected |

## Out of scope

Fluency measurement (tempo, reaction time, pause counts) — Sprechen captures it because its rubric
judges Flüssigkeit. A translation drill is graded right/wrong; speed is not the skill under test.
No audio is recorded, buffered or uploaded, here or anywhere.
