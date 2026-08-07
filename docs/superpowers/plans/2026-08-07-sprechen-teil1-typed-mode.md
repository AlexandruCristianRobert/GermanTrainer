# Sprechen Teil 1 — Typed-Mode Honesty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two remaining typed-mode bugs on the Sprechen Teil 1 screens and stop the two places that make false claims about typed runs.

**Architecture:** Four contained changes. One condition fix in `Teil1Runner.vue`, template-only copy changes in `Teil1Runner.vue` and `Teil1Setup.vue`, and one comment correction in `useVortragTimer.ts`. No new state, no new components, no new modules.

**Tech Stack:** Vue 3 SFC (`<script setup lang="ts">`), Vitest + `@vue/test-utils` (jsdom), Dexie.

**Spec:** `docs/superpowers/specs/2026-08-07-sprechen-teil1-typed-mode-design.md`

## Global Constraints

- Word targets and clocks always come from `VORTRAG_TARGET_WORDS` / `vortragClock` / `GLIEDERUNGSPUNKTE` — **never a hardcoded number**.
- Non-goal: **no wall clock for typed runs.** Do not start, stamp, or display elapsed time for typed.
- Non-goal: **no Zeitlimit for typed runs.** Do not render the Zeitlimit control when typed, and do not let `hardLimit` become `true` on a typed stash.
- Non-goal: **do not modify `redezeit()`** in `useVortragTimer.ts`. Its word-based budget is correct. Only its `hardLimitReached` doc comment changes.
- Do not touch `Teil1Prep.vue` (already modality-clean) or `Teil1Result.vue`'s wording (already honest — it is the reference).
- Spoken-mode output must be byte-identical after every task. Every copy change is typed-only.
- German copy is fixed verbatim by this plan. Do not paraphrase, retranslate, or "improve" it.
- Verification gate for every task: `npx vitest run` fully green and `npm run typecheck` clean. Baseline before this plan: **213 files / 2791 tests** (verified on branch `fix/sprechen-teil1-typed-mode` at commit `0461327`).
- Do **not** run any `git` command. The controller handles all commits.

## File ownership groups

Tasks 1 and 2 both edit `src/modules/sprechen/Teil1Runner.vue` and `tests/modules/Teil1Runner.test.ts`. **They must be done by the same worker, in order.** Task 3 is disjoint and may run in parallel. Task 4 is controller-only.

| Group | Tasks | Files owned |
|---|---|---|
| A | 1, 2 | `src/modules/sprechen/Teil1Runner.vue`, `tests/modules/Teil1Runner.test.ts` |
| B | 3 | `src/modules/sprechen/Teil1Setup.vue`, `tests/modules/Teil1Setup.test.ts` |
| C | 4 | `src/composables/useVortragTimer.ts` |

---

### Task 1: Stuck detection survives a mic downgrade (spec §2 / gap C)

**Files:**
- Modify: `src/modules/sprechen/Teil1Runner.vue:342`
- Test: `tests/modules/Teil1Runner.test.ts` (append inside the existing `describe('Teil1Runner mic-denied downgrade (F13)', …)` block)

**Interfaces:**
- Consumes: existing `typedSurface` computed (`Teil1Runner.vue:190`) — `computed(() => !spoken.value || downgraded.value)`. Already defined; do not redefine it.
- Produces: nothing new. Behaviour change only.

**Background:** `armStuckTimer` currently bails on `spoken.value`, which is `v.modality === 'spoken'`. F13 deliberately never mutates `modality` on a mic denial, so `spoken` stays `true` forever after a downgrade. The learner is now typing, so the spoken restart-based trigger cannot fire either — the run has *no* stuck detection. `typedSurface` is the flag that answers "is the learner typing right now?".

- [ ] **Step 1: Write the failing test**

Append this inside the existing `describe('Teil1Runner mic-denied downgrade (F13)', …)` block, after the last `it(...)`:

```ts
  // A downgraded run is a TYPED run from the learner's point of view, so the
  // 20s typed stuck timer must arm. It could not before: armStuckTimer gated
  // on `spoken`, which F13 deliberately leaves true forever, while the spoken
  // restart trigger needs a live mic it no longer has — so the run ended up
  // with no stuck detection from either path.
  it('arms the typed stuck timer after the mic is denied', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const w = await mountSpokenReady()
      await w.find('.mic-btn').trigger('click')
      const inst = currentSrInstance()
      inst.onerror!({ error: 'not-allowed' })
      await flushPromises()
      expect(w.find('.rede-textarea').exists()).toBe(true)

      vi.mocked(logHelp).mockClear()
      await w.find('.rede-textarea').setValue('Ich tippe jetzt weiter, weil das Mikrofon weg ist')
      vi.advanceTimersByTime(20000)
      await flushPromises()

      expect(vi.mocked(logHelp)).toHaveBeenCalledWith('v1', 'stuck', expect.any(Number))
    } finally {
      vi.useRealTimers()
    }
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/modules/Teil1Runner.test.ts -t "arms the typed stuck timer"`

Expected: **FAIL** — `logHelp` was never called with `'stuck'`, because `armStuckTimer` returned early on `spoken.value`.

- [ ] **Step 3: Make the minimal change**

In `src/modules/sprechen/Teil1Runner.vue`, in `armStuckTimer` (line ~340), change **only** the second line of the guard:

```ts
function armStuckTimer() {
  if (!v.value?.helps.hints) return
  if (!typedSurface.value || phase.value !== 'rede') return
  if (stuckCount.value >= 2) return
  if (stuckTimer) clearTimeout(stuckTimer)
  stuckTimer = setTimeout(() => triggerStuck(), 20000)
}
```

Then update the F6 doc comment directly above `armStuckTimer` so it describes the new gate. Replace the existing comment with:

```ts
/** F6 — refuses to schedule once `stuckCount` has hit its cap of 2, so the
 *  timer is genuinely "never re-armed past that" no matter which caller asks
 *  (a keystroke, a tab switch, a phrase tap, `triggerStuck`'s own re-arm…).
 *
 *  Gated on `typedSurface`, NOT `spoken`: a live-mic run gets its stuck signal
 *  from the recognizer's restarts instead (see `endSpokenSegment`), but a run
 *  that fell back to typing after a mic denial has neither a mic to restart
 *  nor — under the old `spoken` gate — this timer, so it had no stuck
 *  detection at all. `modality` stays 'spoken' forever after a downgrade (F13),
 *  which is exactly why `spoken` is the wrong question to ask here. */
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/modules/Teil1Runner.test.ts -t "arms the typed stuck timer"`
Expected: **PASS**

- [ ] **Step 5: Run the whole runner suite for regressions**

Run: `npx vitest run tests/modules/Teil1Runner.test.ts`

Expected: all pass. Pay attention to the two existing spoken stuck tests — a live-mic spoken run must still **not** arm the 20s timer (`typedSurface` is false while the mic works, so this holds). If a spoken test now fails, the guard was inverted; re-read Step 3.

- [ ] **Step 6: Report completion to the controller**

Do not commit. Report which files you changed and paste the final test summary line.

---

### Task 2: The runner stops presenting an estimate as a measurement (spec §3 / gap D)

**Files:**
- Modify: `src/modules/sprechen/Teil1Runner.vue:963` (header counter) and `:999-1009` (rail)
- Test: `tests/modules/Teil1Runner.test.ts` (new `describe` block, append at end of file)

**Interfaces:**
- Consumes: existing `spoken` computed, `redeState` computed, `targetClock` const, `currentWords` computed. All already defined.
- Produces: nothing new. Template text only — **no script changes at all in this task.**

**Background:** For a typed run, `redeState.clock` is `vortragClock(words)` — the word count converted at 90 wpm. It is a function of how much you wrote, not of time spent. Spoken renders real measurements in the same visual slot with the same formatting, so the two are indistinguishable. `Teil1Result.vue` already says "Die Redezeit wurde aus der Wortzahl geschätzt, nicht gemessen." — the runner must match that honesty.

- [ ] **Step 1: Write the failing test**

Append at the very end of `tests/modules/Teil1Runner.test.ts`:

```ts
// The typed clock is vortragClock(words) — a function of the word count at
// 90 wpm, not of elapsed time. Spoken puts real measurements in the same slot
// with the same formatting, so typed must mark itself as estimated or the two
// are indistinguishable. Teil1Result already uses this vocabulary.
describe('Teil1Runner marks the typed Redezeit as estimated (D)', () => {
  it('labels the typed rail and header as an estimate', async () => {
    const w = await mountReady()
    await w.find('.rede-textarea').setValue('Ein Vortrag über das Ehrenamt in unserer Gesellschaft.')
    await flushPromises()

    expect(w.find('.spr-timebar-l').text()).toContain('aus der Wortzahl geschätzt')
    expect(w.findAll('.spr-lbl').some(n => n.text().includes('Redezeit (geschätzt)'))).toBe(true)
    expect(w.find('.quiz-counter').text()).toContain('≈')
  })

  it('never calls a spoken Redezeit an estimate', async () => {
    const w = await mountSpokenReady()
    await flushPromises()

    const rail = w.find('.spr-timebar-l').text()
    expect(rail).not.toContain('geschätzt')
    expect(rail).toContain('Redezeit')
    expect(w.findAll('.spr-lbl').some(n => n.text().includes('Redezeit (geschätzt)'))).toBe(false)
    expect(w.find('.quiz-counter').text()).not.toContain('≈')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/modules/Teil1Runner.test.ts -t "marks the typed Redezeit"`

Expected: the first case **FAILS** (no "geschätzt" anywhere), the second **PASSES** already.

- [ ] **Step 3: Change the header counter**

`src/modules/sprechen/Teil1Runner.vue` line ~963. Replace:

```html
        <span v-if="v.helps.checklist" class="quiz-counter">{{ currentWords }} Wörter · {{ redeState.clock }}</span>
```

with:

```html
        <span v-if="v.helps.checklist" class="quiz-counter">
          {{ currentWords }} Wörter · <template v-if="!spoken">≈ </template>{{ redeState.clock }}
        </span>
```

- [ ] **Step 4: Change the rail label and figure line**

Same file, lines ~999-1009. Replace:

```html
          <div class="spr-lbl">Redezeit · Ziel {{ targetClock }}</div>
```

with:

```html
          <div class="spr-lbl">Redezeit<template v-if="!spoken"> (geschätzt)</template> · Ziel {{ targetClock }}</div>
```

and replace:

```html
            <span v-else class="spr-num">{{ redeState.clock }}</span>
```

with:

```html
            <span v-else class="spr-num">≈ {{ redeState.clock }} · aus der Wortzahl geschätzt</span>
```

Leave the `v-if="spoken"` branch above it **exactly** as it is.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/modules/Teil1Runner.test.ts -t "marks the typed Redezeit"`
Expected: both **PASS**

- [ ] **Step 6: Run the whole runner suite for regressions**

Run: `npx vitest run tests/modules/Teil1Runner.test.ts`

Expected: all pass. If a pre-existing test asserted the old bare typed clock string, update that assertion to the new wording rather than reverting this change — but read it first and say so in your report.

- [ ] **Step 7: Report completion to the controller**

Do not commit. Report the files changed, whether you had to touch any pre-existing assertion, and the final test summary line.

---

### Task 3: Prüfungsmodus stops promising four minutes it will not deliver (spec §4 / gap E)

**Files:**
- Modify: `src/modules/sprechen/Teil1Setup.vue:377-382` (the `.spr-examx` note) and its import block (line ~19)
- Test: `tests/modules/Teil1Setup.test.ts` (modify one existing test, add one)

**Interfaces:**
- Consumes: existing `modality` ref (`Teil1Setup.vue:58`, `Ref<Modality>`, defaults to `'typed'`), and `VORTRAG_TARGET_WORDS` (number, `360`) from `../../data/sprechenVortragsmittel`.
- Produces: nothing new. Template text only — **do not change `applyPruefungsmodus()`.**

**Background:** The note claims "vier Minuten". When typed, the Zeitlimit control is hidden (`v-if="modality === 'spoken'"`) and `start()` forces `hardLimit: false`, so there are no four minutes. `applyPruefungsmodus()` setting `hardLimitOn = true` is **correct and must stay** — it is the right starting value if the learner then switches to spoken, and `start()` already discards it when typed. Only the claim is wrong.

**Careful:** `Teil1Setup` defaults to `modality === 'typed'`, and an existing test asserts the old string against that default. It will break. Fixing it is part of this task.

- [ ] **Step 1: Add the import**

`src/modules/sprechen/Teil1Setup.vue` line ~19 currently reads:

```ts
import { GLIEDERUNGSPUNKTE } from '../../data/sprechenVortragsmittel'
```

Change it to:

```ts
import { GLIEDERUNGSPUNKTE, VORTRAG_TARGET_WORDS } from '../../data/sprechenVortragsmittel'
```

- [ ] **Step 2: Write the failing tests**

In `tests/modules/Teil1Setup.test.ts`, inside `describe('Teil1Setup — Prüfungsmodus preset', …)`, **replace** the existing first test:

```ts
  it('shows the exam line and is a button, not a fifth switch', async () => {
    const w = mount(Teil1Setup)
    await flushPromises()
    expect(w.text()).toContain(
      'Wie in der Prüfung: Aufgabenblatt, deine Notizen, vier Minuten — sonst nichts.'
    )
    const examBtn = w.findAll('button').find(b => b.text() === 'Prüfungsmodus')
    expect(examBtn).toBeTruthy()
  })
```

with these two:

```ts
  // The default modality is typed, where the Zeitlimit control is hidden and
  // start() forces hardLimit false — so the note must not promise four
  // minutes it cannot deliver. It names the Umfang budget instead.
  it('shows a typed-honest exam line and is a button, not a fifth switch', async () => {
    const w = mount(Teil1Setup)
    await flushPromises()
    const note = w.find('.spr-examx-note').text()
    expect(note).toContain('Wie in der Prüfung: Aufgabenblatt, deine Notizen — sonst nichts.')
    expect(note).toContain('Das Zeitlimit gibt es nur gesprochen')
    expect(note).toContain(`${VORTRAG_TARGET_WORDS} Wörter`)
    expect(note).not.toContain('vier Minuten')
    const examBtn = w.findAll('button').find(b => b.text() === 'Prüfungsmodus')
    expect(examBtn).toBeTruthy()
  })

  it('keeps the four-minute exam line for a spoken run', async () => {
    const w = mount(Teil1Setup)
    await flushPromises()
    await w.findAll('.spr-fld')[0].findAll('button')[1].trigger('click')
    const note = w.find('.spr-examx-note').text()
    expect(note).toContain(
      'Wie in der Prüfung: Aufgabenblatt, deine Notizen, vier Minuten — sonst nichts.'
    )
    expect(note).not.toContain('geschätzt')
    expect(note).not.toContain('Das Zeitlimit gibt es nur gesprochen')
  })
```

Add the import at the top of the test file if it is not already there:

```ts
import { VORTRAG_TARGET_WORDS } from '../../src/data/sprechenVortragsmittel'
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/modules/Teil1Setup.test.ts -t "exam line"`

Expected: the typed case **FAILS** (still says "vier Minuten"); the spoken case **PASSES** already.

- [ ] **Step 4: Make the note modality-aware**

`src/modules/sprechen/Teil1Setup.vue` lines ~377-382. Replace:

```html
          <div class="spr-examx">
            <button type="button" class="btn btn-quiet" @click="applyPruefungsmodus">Prüfungsmodus</button>
            <p class="spr-examx-note">
              Wie in der Prüfung: Aufgabenblatt, deine Notizen, vier Minuten — sonst nichts.
            </p>
          </div>
```

with:

```html
          <div class="spr-examx">
            <button type="button" class="btn btn-quiet" @click="applyPruefungsmodus">Prüfungsmodus</button>
            <!-- The four minutes only exist for a spoken run: the Zeitlimit
                 field is spoken-only and start() forces hardLimit false when
                 typed, so claiming them here would be a promise the preset
                 cannot keep. Typed names its real budget instead. -->
            <p v-if="modality === 'spoken'" class="spr-examx-note">
              Wie in der Prüfung: Aufgabenblatt, deine Notizen, vier Minuten — sonst nichts.
            </p>
            <p v-else class="spr-examx-note">
              Wie in der Prüfung: Aufgabenblatt, deine Notizen — sonst nichts.
              Das Zeitlimit gibt es nur gesprochen; getippt zählt der Umfang: {{ VORTRAG_TARGET_WORDS }} Wörter.
            </p>
          </div>
```

Note: `VORTRAG_TARGET_WORDS` is a module import, so it is available in the template under `<script setup>` without any extra binding.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/modules/Teil1Setup.test.ts -t "exam line"`
Expected: both **PASS**

- [ ] **Step 6: Run the whole Setup suite for regressions**

Run: `npx vitest run tests/modules/Teil1Setup.test.ts`

Expected: all pass. In particular `'never resurrects the Zeitlimit field for a typed run'` must still pass — this task does not change `applyPruefungsmodus()` or `start()`.

- [ ] **Step 7: Report completion to the controller**

Do not commit. Report the files changed and the final test summary line.

---

### Task 4: Correct the stale hard-limit justification (spec §5) — controller only

**Files:**
- Modify: `src/composables/useVortragTimer.ts:51-58` (doc comment on `hardLimitReached`)

**Interfaces:** none. Comment only — zero behaviour change, no test.

**Background:** The comment justifies the spoken-only restriction as rejecting "a word cap on a typed Rede". Since F2 the hard limit reads `wallSeconds` — it *is* a wall clock, not a word cap. The stated reason no longer describes the code beneath it.

- [ ] **Step 1: Replace the doc comment**

Replace the block comment above `hardLimitReached` with:

```ts
/**
 * The hard limit models an examiner's clock, which runs while you think: a
 * real examiner interrupts on wall time, not on however much of it the
 * learner actually spent talking. So this reads `wallSeconds` — time since
 * the Rede began, mic paused or not — never `redezeit()`'s spoken-time
 * content budget.
 *
 * It exists in the spoken Modality ONLY. Not because a typed Rede has no
 * clock — this one would tick perfectly well against a typed run — but
 * because the threshold is calibrated to speech. VORTRAG_TARGET_SECONDS is
 * the four minutes an examiner grants a SPEAKER; applying it to typing would
 * cut learners off for typing speed rather than for German, which is not the
 * skill under test. A typed Rede is therefore bounded by content
 * (VORTRAG_TARGET_WORDS) and nothing else.
 */
```

- [ ] **Step 2: Verify nothing moved**

Run: `npx vitest run tests/composables/useVortragTimer.test.ts`
Expected: PASS, unchanged count.

---

## Final verification (controller)

- [ ] `npm run typecheck` — clean, no output beyond the banner.
- [ ] `npx vitest run` — all green. Expect **213 files** and **2795 tests**: baseline 2791, Task 1 `+1`, Task 2 `+2`, Task 3 `+1` (one existing test replaced by two). No new test files.
- [ ] Confirm spoken mode is untouched: `npx vitest run tests/modules/Teil1Runner.test.ts tests/modules/Teil1Setup.test.ts` with no spoken assertion modified.
- [ ] Commit.

## Self-review notes

- **Spec coverage:** §2→Task 1, §3→Task 2, §4→Task 3, §5→Task 4. §1 already landed in commit `55a1eca`. All five sections covered.
- **Type consistency:** `typedSurface` (Task 1) and `spoken` (Task 2) are both pre-existing computeds in the same file; no new symbols are introduced by any task. `VORTRAG_TARGET_WORDS` is the only new import, used identically in Task 3's source and test.
- **Known collision:** Tasks 1 and 2 share two files — assigned to one worker, sequentially. Recorded in "File ownership groups" above.
