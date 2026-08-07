# Sprechen Teil 1 — typed mode tells the truth

**Date:** 2026-08-07
**Status:** approved
**Scope:** `Teil1Runner.vue`, `Teil1Setup.vue`, `useVortragTimer.ts`, `useVortrag.ts`

## Why

A learner reported being unable to submit a typed Teil 1 Vortrag — twice. The
root cause turned out to be a hard blocker that had shipped with the feature:
typed mode had never been submittable at all. Investigating it surfaced four
further places where the Teil 1 screens either misbehave in typed mode or make
claims about it that are not true.

This spec covers the blocker (already implemented, recorded here for the
record) and the four follow-ups.

## Non-goals

Decided explicitly, not by omission:

- **No wall clock for typed.** A typed Rede is measured in words; that stays
  the only content budget.
- **No Zeitlimit for typed.** Typing 360 German words in four minutes is
  90 wpm. A spoken-calibrated wall limit applied to typing would measure
  typing speed, not German.
- **No change to `redezeit()`.** Its word-based budget is correct.
- **`Teil1Prep` is untouched** — it is already modality-clean.
- **`Teil1Result`'s wording is untouched** — it already states that a typed
  Redezeit was estimated. It is the model the runner should match, not the
  other way round.

## Changes

### 1. The submit blocker (implemented — commit `55a1eca`)

The runner holds the Vortrag in a `ref`, so `v.value.rede` reads back as a
reactive **Proxy**. IndexedDB stores values with the structured clone
algorithm, which throws `DataCloneError` on any object carrying internal slots
other than `[[Prototype]]`/`[[Extensible]]` — which every Proxy does. So
`saveRede` rejected on every call.

The rejection was invisible because `commitRede()` is awaited inside
`finishRede` *before* the phase flip:

```
finishRede → await commitRede() → saveRede → DataCloneError
           ✗ phase.value = 'nachfrage'   ← never reached
```

The click handler died mid-await. No phase change, no toast, no error — the
button simply did nothing.

**Fix:** a recursive `plain()` unwrap applied in `saveRede`, `saveNachfrage`
and `createVortrag`, at the persistence boundary so no caller can reintroduce
it. `toRaw` alone is insufficient — it is shallow, and the runner builds
`rede.spans` by spreading a reactive array (`[...vv.rede.spans, …]`), which
yields per-element proxies inside an otherwise plain array.

`finishRede` additionally catches and toasts, so a future failure there is
visible rather than silent.

Teil 2 was never affected only because `appendTurn` re-reads its row from
Dexie before writing it back — luck, not design.

### 2. (C) Stuck detection survives a mic downgrade — `Teil1Runner.vue`

`armStuckTimer` bails on `spoken.value`, which is `modality === 'spoken'` and
stays `true` forever after a mic denial (F13 deliberately never mutates
`modality`). After a downgrade the learner is typing, so the spoken
restart-based trigger can no longer fire either — the run ends up with **no
stuck detection at all**.

Gate on `!typedSurface.value` instead. That arms the 20s timer for typed runs
*and* downgraded-spoken runs, while live-mic runs keep using the recognizer's
restart signal as before.

**Behavioural consequence, accepted:** a downgraded run can now log `stuck`
help events, so its Hilfe-Protokoll count can rise where it previously could
not. That is correct — the help genuinely fires now.

### 3. (D) The runner stops presenting an estimate as a measurement — `Teil1Runner.vue`

Display only; `redeState` is not touched.

Typed currently renders a bare clock derived from word count at 90 wpm — e.g.
`211 Wörter · 2:21`, where `2:21` is a function of the 211, not of time spent.
Spoken renders `Redezeit 2:21 · Gesamt 3:40`, which *are* measurements. The two
are visually identical and mean different things.

Typed must mark the figure as estimated, in both the header counter and the
rail, using the vocabulary `Teil1Result` already uses ("aus der Wortzahl
geschätzt, nicht gemessen"). Spoken output is unchanged.

Exact copy, so nothing diverges:

| Slot | Spoken (unchanged) | Typed (new) |
|---|---|---|
| Header counter | `{{ currentWords }} Wörter · {{ redeState.clock }}` | `{{ currentWords }} Wörter · ≈ {{ redeState.clock }}` |
| Rail section label | `Redezeit · Ziel {{ targetClock }}` | `Redezeit (geschätzt) · Ziel {{ targetClock }}` |
| Rail figure line | `Redezeit {{ redeState.clock }}` [`· Gesamt {{ wallClock }}`] | `≈ {{ redeState.clock }} · aus der Wortzahl geschätzt` |

The rail label is modality-conditional, so it must not be hoisted out of the
`v-if="v.helps.checklist"` block it already lives in.

### 4. (E) Prüfungsmodus stops promising four minutes it will not deliver — `Teil1Setup.vue`

The preset's note reads:

> Wie in der Prüfung: Aufgabenblatt, deine Notizen, vier Minuten — sonst nichts.

In typed mode there are no four minutes: the Zeitlimit control is hidden
(`v-if="modality === 'spoken'"`) and `start()` forces `hardLimit` false. So the
strictest preset is silently *less* strict when typed, and says otherwise.

Make the note modality-aware. Typed drops the "vier Minuten" clause and states
that the Zeitlimit exists only for spoken runs, and that typed is measured by
Umfang instead. The word figure must come from `VORTRAG_TARGET_WORDS`, never a
literal (existing project constraint).

Exact copy:

- **Spoken (unchanged):** `Wie in der Prüfung: Aufgabenblatt, deine Notizen, vier Minuten — sonst nichts.`
- **Typed (new):** `Wie in der Prüfung: Aufgabenblatt, deine Notizen — sonst nichts. Das Zeitlimit gibt es nur gesprochen; getippt zählt der Umfang: {{ VORTRAG_TARGET_WORDS }} Wörter.`

`applyPruefungsmodus()` keeps setting `hardLimitOn = true`: that is the correct
starting value should the learner switch to spoken, and `start()` already
discards it when typed. Only the claim was wrong, not the state.

### 5. Stale justification — `useVortragTimer.ts`

`hardLimitReached`'s doc comment justifies the spoken-only restriction as
rejecting "a word cap on a typed Rede". Since F2 the hard limit reads
`wallSeconds` — it *is* a wall clock, not a word cap, so the comment no longer
describes the code it sits on.

Reword to the actual reason (see Non-goals). Comment only.

## Testing

| Change | Test |
|---|---|
| 1 | Done: 6 tests across `Teil1Runner.persistence.test.ts` (real Dexie, real component), `sprechenVortraege.test.ts`, `Teil1Runner.test.ts`. All six verified to fail without the fix with the exact `DataCloneError`. |
| 2 (C) | New case in `Teil1Runner.test.ts`'s F13 block: deny the mic, type, advance 20s, assert `logHelp` fires with `'stuck'`. Fails today. |
| 3 (D) | Assert the typed runner renders the estimate caveat and the spoken runner does not. |
| 4 (E) | Assert the typed Prüfungsmodus note omits "vier Minuten" and names the Umfang; spoken keeps it. |
| 5 | None — comment. |

Gate: full suite plus `npm run typecheck` (vue-tsc) green. Baseline is 213
files / 2791 tests.

## Risk

Low. Change 2 is one condition; 3 and 4 are template strings; 5 is a comment.
The only behavioural change beyond the bug fix is the downgraded-run help
logging noted in §2.

## Known limitation, deliberately not fixed here

**A downgraded run's Redezeit freezes.** Found by adversarial review of this
work; pre-existing, not introduced by it.

`redeState` (`Teil1Runner.vue`) passes `seconds` whenever
`modality === 'spoken'`, and F13 keeps `modality` spoken forever after a mic
denial. So once downgraded:

- the clock is pinned to the spoken seconds already recorded and never moves
  again, however much the learner then types;
- `redeState.pct` is `seconds / 240`, so the Redezeit bar sits frozen — at 0%
  if the mic died before any segment committed;
- §3's typed estimate marking does not apply, because it keys on `spoken`,
  so the stale measurement is presented as the live one with no caveat.

That is a stronger version of the very complaint §3 fixes, and §2's new
comment argues at length that `spoken` is the wrong question to ask about a
typing learner — yet §3 asks it. The two halves of this change disagree.

Not fixed here because it is not a flag flip: it needs a decision about how a
*mixed* run should measure itself, and all the options cost something.

1. **Switch to the word estimate once downgraded.** Consistent with §3, but
   the real spoken seconds — which F13 insists are real and must survive —
   disappear from the live view.
2. **Show both** (`Redezeit 1:20 gesprochen · ≈ 2:10 getippt`). Honest and
   complete; needs a two-part budget model and does not fit the 262px rail.
3. **Leave it.** Zero cost, but the runner keeps showing a frozen number as
   if it were live.

Recommendation: option 2, as its own change, with the grader and
`Teil1Result` taught the same two-part shape — they have the identical
`modality === 'spoken'` assumption baked in. Worth doing only if the mic-denial
path turns out to be common; it is currently rare.
