# Schreiben Teil 2 Review Round Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 12 improvements agreed in the grilled Fable-tester review of Schreiben Teil 2 (v1.21.00): fix four mis-teaching check/matcher defects, add the Nachbessern revision pass (ADR-0024), the Aufbau drawer tab, hub/archive Teil-2 parity, generator format riders, and 15 flagship Inhalts-Baukästen.

**Architecture:** Pure logic lands in composables/data modules first (tasks A1–A6, disjoint files, parallelizable), UI wiring second (tasks B1–B5, disjoint files, parallelizable), release last. Nachbessern follows ADR-0024: a module-scoped in-memory handoff consumed once on the Result page, string-check states, zero writes.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Dexie, Vitest (jsdom + fake-indexeddb), vue-tsc.

## Global Constraints

- All learner-facing copy is German, in the app's existing register (du-form toward the learner, e.g. "Schreib deine Nachricht"). English appears only in `noteEn`-style gloss fields.
- Use CONTEXT.md's canonical terms exactly: Nachricht, Schreibauftrag, Schreibanlass, Gerüst-Check, Radar, Nachbessern (never "Nachbesserung" in Teil 2 UI copy — that noun is taught there as Beschwerde content vocabulary), Nachrichtenmittel, Move.
- Typecheck is `npm run typecheck` (vue-tsc). Plain `tsc` floods ~212 fake `.vue` errors — never use it.
- Run tests per file: `npx vitest run tests/<path>` ; full suite: `npm run test`.
- **Subagents never run git.** Commit steps are executed by the controller after task review.
- Follow the surrounding file's comment density and style; comments state constraints, not narration.
- ADR-0024 (docs/adr/0024-nachbessern-volatile-revision-pass.md) and the updated CONTEXT.md entries (Nachbessern, Gerüst-Check) are already committed context — read them before tasks A3/B3.

---

## Group A — pure logic & data (A1–A6 are file-disjoint; run in parallel)

### Task A1: Tolerant Schreibplan keyword matching (shared helper)

**Files:**
- Create: `src/composables/useSchreibplanMatch.ts`
- Test: `tests/composables/useSchreibplanMatch.test.ts`

**Interfaces:**
- Produces: `normalizeForMatch(s: string): string` and `keywordWritten(keyword: string, normalizedHay: string): boolean` — consumed by tasks B1 (Teil2Runner) and B2 (Teil1Runner, both Preps).

Background: both Schreiben runners currently match a Schreibplan keyword with whole-string `hay.includes(needle)`, so a multi-word keyword ("Heizung Beamer Stühle") almost never lights. Agreed fix: a keyword is *written* when **every** of its tokens appears in the text — a strict superset of today's behavior (single-word keywords are byte-identical).

- [ ] **Step 1: Write the failing test**

```ts
// tests/composables/useSchreibplanMatch.test.ts
import { describe, expect, it } from 'vitest'
import { keywordWritten, normalizeForMatch } from '../../src/composables/useSchreibplanMatch'

describe('normalizeForMatch', () => {
  it('strips punctuation, collapses whitespace, lowercases', () => {
    expect(normalizeForMatch('  Heizung,  Beamer! ')).toBe('heizung beamer')
  })
})

describe('keywordWritten', () => {
  const hay = normalizeForMatch(
    'Betreff: Mängel im Kursraum\nSehr geehrte Frau Hoffmann,\nseit Wochen sind die Heizung und der Beamer kaputt, außerdem fehlen Stühle. Bitte antworten Sie bis Januar — die Frist drängt.'
  )
  it('matches a single-word keyword exactly as before', () => {
    expect(keywordWritten('Heizung', hay)).toBe(true)
    expect(keywordWritten('Whiteboard', hay)).toBe(false)
  })
  it('matches a multi-word keyword when every token appears anywhere', () => {
    expect(keywordWritten('Heizung Beamer Stühle', hay)).toBe(true)
    expect(keywordWritten('Januar Frist', hay)).toBe(true)
  })
  it('fails when any token is missing', () => {
    expect(keywordWritten('Heizung Whiteboard', hay)).toBe(false)
  })
  it('is falsy for empty keyword or empty hay', () => {
    expect(keywordWritten('', hay)).toBe(false)
    expect(keywordWritten('Heizung', '')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/composables/useSchreibplanMatch.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/composables/useSchreibplanMatch.ts
//
// Schreibplan keyword matching for BOTH Schreiben runners (CONTEXT.md →
// "Schreibplan"). One shared definition of "written", so Teil 1 and Teil 2
// can never drift apart. Pure module — no Vue, no Dexie, no AI.
//
// A keyword is written when EVERY of its tokens appears in the normalized
// text — a strict superset of the old whole-string `includes`: single-word
// keywords behave byte-identically, multi-word keywords ("Heizung Beamer
// Stühle") now light once all their words are down, in any order and with
// any words between them. Plan dots are transient run UI; nothing here is
// banked, so loosening changes no historical metric.

/** Same normalisation as the Redemittel matcher, so every matcher in the
 *  app agrees on what a token is. */
export function normalizeForMatch(s: string): string {
  return s.replace(/[.,;:!?…]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

/** True when every token of `keyword` occurs in `normalizedHay`
 *  (which callers produce once per text via normalizeForMatch). */
export function keywordWritten(keyword: string, normalizedHay: string): boolean {
  const tokens = normalizeForMatch(keyword).split(' ').filter(t => t.length > 0)
  if (tokens.length === 0 || normalizedHay.length === 0) return false
  return tokens.every(t => normalizedHay.includes(t))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/composables/useSchreibplanMatch.test.ts`
Expected: PASS.

- [ ] **Step 5 (controller): Commit** — `feat(schreiben): shared tolerant Schreibplan keyword matcher`

---

### Task A2: Gerüst-Check anrede whitelist, body-scoped Absätze, Radar 40-word floor

**Files:**
- Modify: `src/composables/useNachrichtChecks.ts`
- Test: `tests/composables/useNachrichtChecks.test.ts` (exists — extend)

**Interfaces:**
- `geruestSignals(text: string, empfaengerName: string): GeruestSignal[]` — signature unchanged; behavior of the `anrede` and `absaetze` checks changes as below. The `anrede` hint becomes dynamic (renders the resolved target form).
- `radarWarnungen(text: string, anlass: SchreibAnlass, words: number): RadarWarnung[]` — **gains a third parameter**. Task B1 updates the caller.

Three agreed behavior changes (grilling rounds 1/3/4):

**(a) Anrede — six-stem resolved whitelist.** `empfaengerName` always starts with `Herr ` or `Frau ` (seeded data + generator validator both guarantee it). Accept exactly the resolved stems for that title, so both the wrong title ("Herr Hoffmann" for Frau Hoffmann) AND the wrong adjective ending ("Sehr geehrte Herr Semder") fail. Stems per title (checked against the line lowercased with commas removed):
- Frau: `sehr geehrte frau`, `liebe frau`, `guten tag frau`
- Herr: `sehr geehrter herr`, `lieber herr`, `guten tag herr`
Keep the existing surname-contained and ends-with-comma requirements. The hint renders the resolved form: for `Frau Hoffmann` → `Die Anrede nennt den Empfänger mit passender Endung — „Sehr geehrte Frau Hoffmann," — und endet mit einem Komma.` (for Herr: „Sehr geehrter Herr Semder,").

**(b) Absätze — body-scoped, one definition for both modes.** When both the Anrede line and the Gruß line are found: the check passes iff at least one blank-line separation exists **strictly between** them with non-whitespace content on both of its sides (i.e. the body itself has ≥2 paragraphs). While either anchor is missing, fall back to the current whole-text rule (≥2 blank-line separations). New hint: `Gliedere den Haupttext in mindestens zwei Absätze — eine Leerzeile trennt sie.`

**(c) Höflichkeits-Check — 40-word floor.** The absence-based `hoeflichkeit` warning fires only when `words >= 40`. The presence-based warnings (`du-form`, `informell`) stay instant.

- [ ] **Step 1: Write the failing tests** (add to the existing describe blocks; keep all currently passing cases green — update any that asserted the old anrede/absaetze behavior)

```ts
// additions to tests/composables/useNachrichtChecks.test.ts
import { geruestSignals, radarWarnungen } from '../../src/composables/useNachrichtChecks'

const get = (text: string, name: string, key: string) =>
  geruestSignals(text, name).find(g => g.key === key)!

describe('anrede title + ending agreement', () => {
  it('rejects the wrong title for the Empfängerin', () => {
    const t = 'Betreff: Test\n\nSehr geehrter Herr Hoffmann,\n\nich schreibe…'
    expect(get(t, 'Frau Hoffmann', 'anrede').ok).toBe(false)
  })
  it('rejects the wrong adjective ending', () => {
    const t = 'Betreff: Test\n\nSehr geehrte Herr Semder,\n\nich schreibe…'
    expect(get(t, 'Herr Semder', 'anrede').ok).toBe(false)
  })
  it('accepts each resolved stem for the right title', () => {
    for (const anrede of ['Sehr geehrte Frau Hoffmann,', 'Liebe Frau Hoffmann,', 'Guten Tag, Frau Hoffmann,']) {
      const t = `Betreff: Test\n\n${anrede}\n\nich schreibe…`
      expect(get(t, 'Frau Hoffmann', 'anrede').ok).toBe(true)
    }
  })
  it('renders the resolved target form in the hint', () => {
    const hint = get('x', 'Frau Hoffmann', 'anrede').hintDe
    expect(hint).toContain('Sehr geehrte Frau Hoffmann,')
    expect(get('x', 'Herr Semder', 'anrede').hintDe).toContain('Sehr geehrter Herr Semder,')
  })
})

describe('absaetze body-scoped', () => {
  const frame = (body: string) =>
    `Betreff: Test\n\nSehr geehrte Frau Hoffmann,\n${body}\n\nMit freundlichen Grüßen\nAnna`
  it('fails when the body between Anrede and Gruß is one block', () => {
    expect(get(frame('ein einziger langer Block ohne Absätze und so weiter'), 'Frau Hoffmann', 'absaetze').ok).toBe(false)
  })
  it('passes when the body itself has a blank-line paragraph break', () => {
    expect(get(frame('erster Absatz hier.\n\nzweiter Absatz dort.'), 'Frau Hoffmann', 'absaetze').ok).toBe(true)
  })
  it('falls back to the whole-text rule while an anchor is missing', () => {
    const noGruss = 'Betreff: Test\n\nSehr geehrte Frau Hoffmann,\n\nabsatz eins\n\nabsatz zwei'
    expect(get(noGruss, 'Frau Hoffmann', 'absaetze').ok).toBe(true)
  })
})

describe('hoeflichkeit floor', () => {
  it('stays silent below 40 words', () => {
    expect(radarWarnungen('Sehr geehrte Frau Kling,', 'bitte', 4).some(w => w.key === 'hoeflichkeit')).toBe(false)
  })
  it('fires at 40+ words without Konjunktiv II', () => {
    expect(radarWarnungen('Geben Sie mir bitte die Unterlagen.', 'bitte', 45).some(w => w.key === 'hoeflichkeit')).toBe(true)
  })
  it('du-form warning stays instant', () => {
    expect(radarWarnungen('danke dir', 'dank', 2).some(w => w.key === 'du-form')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify the new cases fail** — `npx vitest run tests/composables/useNachrichtChecks.test.ts`

- [ ] **Step 3: Implement in `useNachrichtChecks.ts`**

Replace the anrede block of `geruestSignals` (currently lines 62–77) and the anrede hint, replace the absaetze computation, and give `radarWarnungen` the `words` parameter:

```ts
// anrede: among the first five non-empty lines, resolved against the
// Empfänger's own title — the six-stem whitelist catches both the wrong
// Herr/Frau and the wrong adjective ending (Sehr geehrte Herr …). Not
// grammar analysis: a closed class of two formulas × two titles, plus
// Guten Tag, which takes no ending.
const title = empfaengerName.trim().toLowerCase().startsWith('frau') ? 'Frau' : 'Herr'
const stems = title === 'Frau'
  ? ['sehr geehrte frau', 'liebe frau', 'guten tag frau']
  : ['sehr geehrter herr', 'lieber herr', 'guten tag herr']
const surname = lastToken(empfaengerName).toLowerCase()
let anredeIdx = -1
const first5 = lines.slice(0, 5)
for (let i = 0; i < first5.length; i++) {
  const lower = first5[i].toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ')
  const startsOk = stems.some(s => lower.startsWith(s))
  const containsSurname = surname.length > 0 && lower.includes(surname)
  const endsWithComma = first5[i].endsWith(',')
  if (startsOk && containsSurname && endsWithComma) { anredeIdx = i; break }
}
const anredeOk = anredeIdx !== -1
const resolvedAnrede = title === 'Frau'
  ? `Sehr geehrte ${empfaengerName.trim()},`
  : `Sehr geehrter ${empfaengerName.trim()},`
```

(`empfaengerName` is "Frau Hoffmann"/"Herr Semder", so `resolvedAnrede` reads "Sehr geehrte Frau Hoffmann,".) The anrede signal's `hintDe` becomes:
```ts
hintDe: `Die Anrede nennt den Empfänger mit passender Endung — „${resolvedAnrede}" — und endet mit einem Komma.`
```

Absätze — replace the `blankLineSeps` computation:

```ts
// absaetze: the body between Anrede and Gruß must itself break into
// paragraphs — the assembled scaffold frame alone earns nothing (the old
// whole-text rule was trivially satisfied there; see the grilled review).
// While either anchor is missing, fall back to the whole-text rule so a
// half-written draft is not scolded for a frame it does not have yet.
function bodyHasParagraphBreak(raw: string, anredeLine: string, grussLine: string): boolean {
  const phys = raw.split('\n')
  const aIdx = phys.findIndex(l => l.trim() === anredeLine)
  const gIdx = phys.findIndex((l, i) => i > aIdx && l.trim() === grussLine)
  if (aIdx === -1 || gIdx === -1) return false
  const body = phys.slice(aIdx + 1, gIdx).join('\n')
  return /\S[^]*?\n[ \t]*\n[^]*?\S/.test(body)
}
```

Wire it: compute `grussIdx`/`grussOk` **before** absaetze (reorder the function body — gruss detection has no dependency on absaetze), then:

```ts
const absaetzeOk = anredeOk && grussOk
  ? bodyHasParagraphBreak(text, lines[anredeIdx], lines[grussIdx])
  : (text.match(/\n[ \t]*\n/g) ?? []).length >= 2
```

Absätze `hintDe` becomes: `'Gliedere den Haupttext in mindestens zwei Absätze — eine Leerzeile trennt sie.'`

Radar floor — signature and guard:

```ts
export function radarWarnungen(text: string, anlass: SchreibAnlass, words: number): RadarWarnung[] {
```
```ts
  if ((anlass === 'bitte' || anlass === 'beschwerde') && words >= 40) {
    if (!KONJUNKTIV_II_RE.test(text)) { /* existing push unchanged */ }
  }
```
Add above the function: `// The absence-based check waits for 40 words (the codebase's nudge-band rhythm): an empty draft has no Bitte to scold, and at the 120-word target the Bitte empirically lives in the final third — 40 leaves ~80 words of runway. Presence-based checks (du-form, informell) stay instant.`

Note: `KONJUNKTIV_II_RE` also matches "möchte/möchten"? It does **not** today (würde/könnte/wäre/hätte/dürfte families only) — leave the regex untouched; this task changes gating only.

- [ ] **Step 4: Run tests** — file green, then `npm run typecheck`. Typecheck will FAIL in `Teil2Runner.vue` (radarWarnungen arity) — that is task B1's wiring; for THIS task's completion run only the test file, and note the arity change for B1.

- [ ] **Step 5 (controller): Commit** — `fix(schreiben): anrede title+ending whitelist, body-scoped Absätze, Höflichkeits-floor`

---

### Task A3: Nachbessern core (ADR-0024) — handoff, status check, panel component

**Files:**
- Create: `src/composables/useNachbessern.ts`
- Create: `src/components/schreiben/NachbessernPanel.vue`
- Test: `tests/composables/useNachbessern.test.ts`
- Test: `tests/modules/NachbessernPanel.test.ts`

**Interfaces:**
- Produces: `setNachbessernText(text: string): void`, `takeNachbessernText(): string | null` (read-then-clear), `korrekturStatus(text, quote, suggested): 'offen' | 'geaendert' | 'behoben'`, `normalizeKeepCase(s: string): string`.
- Produces: `NachbessernPanel.vue` with `defineProps<{ text: string; mistakes: NachrichtMistake[] }>()` and `defineEmits<{ done: [] }>()`. `NachrichtMistake` is imported from `../../composables/useNachrichtGrader` (fields used: `quote`, `suggested`, `kind`, `reasonDe`).
- Consumed by: B1 (runner sets the handoff), B3 (result consumes + renders).

Read ADR-0024 and CONTEXT.md → "Nachbessern" first. Non-negotiables: no store is ever written (no Dexie, no sessionStorage, no history.state); the states are string facts with no red state; amber copy owns the limit.

- [ ] **Step 1: Write the failing composable test**

```ts
// tests/composables/useNachbessern.test.ts
import { describe, expect, it } from 'vitest'
import {
  korrekturStatus, normalizeKeepCase, setNachbessernText, takeNachbessernText
} from '../../src/composables/useNachbessern'

describe('handoff', () => {
  it('is read-then-clear: the second take returns null', () => {
    setNachbessernText('Sehr geehrte Frau Kling, …')
    expect(takeNachbessernText()).toBe('Sehr geehrte Frau Kling, …')
    expect(takeNachbessernText()).toBeNull()
  })
})

describe('normalizeKeepCase', () => {
  it('strips punctuation and collapses whitespace but preserves case', () => {
    expect(normalizeKeepCase(' danke  dir, im Voraus! ')).toBe('danke dir im Voraus')
  })
})

describe('korrekturStatus', () => {
  const quote = 'weil einige Stühle sind kaputt'
  const suggested = 'weil einige Stühle kaputt sind'
  it('offen while the quote is still present', () => {
    expect(korrekturStatus(`Ich schreibe, ${quote}, Ihnen.`, quote, suggested)).toBe('offen')
  })
  it('behoben when quote is gone and suggested is present', () => {
    expect(korrekturStatus(`Ich schreibe, ${suggested}, Ihnen.`, quote, suggested)).toBe('behoben')
  })
  it('geaendert when quote is gone but suggested is absent', () => {
    expect(korrekturStatus('Ich schreibe wegen der kaputten Stühle.', quote, suggested)).toBe('geaendert')
  })
  it('is case-sensitive — sie→Sie register fixes are visible', () => {
    expect(korrekturStatus('ich danke sie', 'sie', 'Sie')).toBe('offen')
    expect(korrekturStatus('ich danke Ihnen, Sie waren…', 'sie', 'Sie')).toBe('behoben')
  })
  it('deletion fix (empty suggested): behoben once the quote is gone', () => {
    expect(korrekturStatus('sauberer Satz', 'LG', '')).toBe('behoben')
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/composables/useNachbessern.test.ts`

- [ ] **Step 3: Implement the composable**

```ts
// src/composables/useNachbessern.ts
//
// Nachbessern (CONTEXT.md → "Nachbessern", ADR-0024): the optional guided
// revision pass directly after a Nachricht's grading. The just-graded text
// crosses from the runner to the result page through the module-scoped
// handoff below — deliberately NOT sessionStorage and NOT history.state,
// both of which survive a reload and would breach ADR-0019's boundary. A
// reload loses the offer; that is the boundary working, not a bug.
//
// The status check is a string fact, never a judgement: no AI, no red
// state. Case-PRESERVING normalization on purpose — lowercasing would
// blind the check to exactly the register/orthography fixes (sie → Sie).

let pending: string | null = null

export function setNachbessernText(text: string): void {
  pending = text
}

/** Read-then-clear: the offer exists exactly once, in the sitting that earned it. */
export function takeNachbessernText(): string | null {
  const t = pending
  pending = null
  return t
}

/** Punctuation/whitespace normalization that PRESERVES case. */
export function normalizeKeepCase(s: string): string {
  return s.replace(/[.,;:!?…"„“”»«]/g, '').replace(/\s+/g, ' ').trim()
}

export type KorrekturStatus = 'offen' | 'geaendert' | 'behoben'

/**
 * offen    — the quoted wrong wording is still present anywhere.
 * behoben  — quote gone AND the suggested wording present (quote-gone first,
 *            so pasting the suggestion beside the intact error stays offen).
 * geaendert — quote gone, suggestion absent: changed, correctness unknown.
 * Containment is global: span offsets are dead after free editing, and a
 * wrong string that occurs twice should go twice anyway.
 */
export function korrekturStatus(text: string, quote: string, suggested: string): KorrekturStatus {
  const hay = normalizeKeepCase(text)
  const q = normalizeKeepCase(quote)
  const s = normalizeKeepCase(suggested)
  if (q.length > 0 && hay.includes(q)) return 'offen'
  if (s.length === 0 || hay.includes(s)) return 'behoben'
  return 'geaendert'
}
```

- [ ] **Step 4: Composable tests pass** — `npx vitest run tests/composables/useNachbessern.test.ts`

- [ ] **Step 5: Write the failing mount test**

Mirror the harness style of `tests/modules/NachrichtMusterView.test.ts` (read it for the mount pattern used in this repo — jsdom, `@vue/test-utils` `mount`). The panel needs no router and no Dexie.

```ts
// tests/modules/NachbessernPanel.test.ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NachbessernPanel from '../../src/components/schreiben/NachbessernPanel.vue'
import type { NachrichtMistake } from '../../src/composables/useNachrichtGrader'

const mistakes: NachrichtMistake[] = [
  { quote: 'danke dir', suggested: 'danke Ihnen', kind: 'register', reasonDe: 'Sie-Register', reasonEn: 'formal register', spanStart: 10 },
  { quote: 'Verstandnis', suggested: 'Verständnis', kind: 'spelling', reasonDe: 'Umlaut', reasonEn: 'umlaut', spanStart: 40 }
]

const text = 'Sehr geehrte Frau Kling,\n\nich danke dir für Ihr Verstandnis.\n\nMit freundlichen Grüßen\nAnna'

describe('NachbessernPanel', () => {
  it('starts with every correction offen and flips to behoben as the learner edits', async () => {
    const w = mount(NachbessernPanel, { props: { text, mistakes } })
    expect(w.findAll('.nb-status.offen')).toHaveLength(2)
    await w.find('textarea').setValue(text.replace('danke dir', 'danke Ihnen').replace('Verstandnis', 'Verständnis'))
    expect(w.findAll('.nb-status.behoben')).toHaveLength(2)
  })
  it('shows the honest amber copy for a differently-fixed span', async () => {
    const w = mount(NachbessernPanel, { props: { text, mistakes } })
    await w.find('textarea').setValue(text.replace('danke dir', 'bin dankbar'))
    expect(w.find('.nb-status.geaendert').exists()).toBe(true)
    expect(w.text()).toContain('kann nur die nächste Bewertung sagen')
  })
  it('emits done from the finish button and never writes anywhere', async () => {
    const w = mount(NachbessernPanel, { props: { text, mistakes } })
    await w.find('.nb-done').trigger('click')
    expect(w.emitted('done')).toHaveLength(1)
  })
})
```

- [ ] **Step 6: Run to verify failure**, then **implement the panel**

```vue
<!-- src/components/schreiben/NachbessernPanel.vue -->
<script setup lang="ts">
// Nachbessern (CONTEXT.md → "Nachbessern", ADR-0024): the one guided
// revision pass over the just-graded text. Deliberately part-agnostic —
// props are { text, corrections } and nothing else — so a later
// Forumsbeitrag adoption is wiring, not rework. Writes NOTHING: no store,
// no emit but 'done'. The draft lives and dies in this component.
import { computed, ref } from 'vue'
import type { NachrichtMistake } from '../../composables/useNachrichtGrader'
import { korrekturStatus, type KorrekturStatus } from '../../composables/useNachbessern'

const props = defineProps<{ text: string; mistakes: NachrichtMistake[] }>()
const emit = defineEmits<{ done: [] }>()

const draft = ref(props.text)

const STATUS_LABEL: Record<KorrekturStatus, string> = {
  offen: 'offen', geaendert: 'geändert', behoben: 'behoben'
}

const rows = computed(() =>
  props.mistakes.map((m, i) => ({
    m, i, status: korrekturStatus(draft.value, m.quote, m.suggested)
  }))
)
const behobenCount = computed(() => rows.value.filter(r => r.status === 'behoben').length)
const hasAmber = computed(() => rows.value.some(r => r.status === 'geaendert'))
</script>

<template>
  <div class="nb">
    <p class="nb-note">
      Arbeite die Korrekturen in deinen Text ein — lokal geprüft, nichts wird gespeichert.
      Verlässt du die Seite, ist der Text weg.
    </p>
    <textarea v-model="draft" class="nb-text" spellcheck="false" />
    <div class="nb-rows">
      <div v-for="r in rows" :key="r.i" class="nb-row">
        <span class="nb-status" :class="r.status">{{ STATUS_LABEL[r.status] }}</span>
        <span class="nb-quote">{{ r.m.quote }}</span>
        <span class="nb-arrow" aria-hidden="true">→</span>
        <span class="nb-suggested">{{ r.m.suggested || '(streichen)' }}</span>
      </div>
    </div>
    <p v-if="hasAmber" class="nb-amber-note">
      Geändert — ob die neue Fassung stimmt, kann nur die nächste Bewertung sagen.
    </p>
    <div class="nb-foot">
      <span class="nb-count">{{ behobenCount }} / {{ rows.length }} behoben</span>
      <button class="btn btn-ghost nb-done" type="button" @click="emit('done')">
        Fertig — Text verwerfen
      </button>
    </div>
  </div>
</template>

<style scoped>
.nb { margin-top: 16px; display: flex; flex-direction: column; gap: 12px; }
.nb-note { font-size: 13px; font-style: italic; color: var(--mute); margin: 0; }
.nb-text {
  width: 100%; min-height: 260px; background: var(--paper-deep); border: 0;
  padding: 14px 16px; font-family: var(--font-body); font-size: 16px;
  line-height: 1.6; color: var(--ink); resize: vertical;
}
.nb-text:focus { outline: 0; }
.nb-rows { display: flex; flex-direction: column; gap: 6px; }
.nb-row { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; font-size: 14px; }
.nb-status {
  font-family: var(--font-mono); font-size: 9.5px; letter-spacing: .14em;
  text-transform: uppercase; padding: 2px 7px 1px; border: 1px solid var(--hairline);
  color: var(--mute); flex: 0 0 auto;
}
.nb-status.behoben { color: var(--success); border-color: var(--success); }
.nb-status.geaendert { color: var(--ochre); border-color: var(--ochre); }
.nb-quote { color: var(--danger); text-decoration: line-through; }
.nb-arrow { color: var(--mute); }
.nb-suggested { color: var(--success); }
.nb-amber-note { font-size: 12.5px; font-style: italic; color: var(--ochre); margin: 0; }
.nb-foot { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.nb-count { font-family: var(--font-mono); font-size: 11px; color: var(--mute); }
</style>
```

- [ ] **Step 7: All A3 tests pass** — both test files.

- [ ] **Step 8 (controller): Commit** — `feat(schreiben): Nachbessern core — volatile handoff, status check, panel (ADR-0024)`

---

### Task A4: Aufbau data, resolved Rahmen-Paare, KI-Tipp persistence

**Files:**
- Create: `src/data/schreibenAufbau.ts`
- Modify: `src/data/schreibenNachrichtenMittel.ts` (add `resolveRahmenPaar`)
- Modify: `src/data/schreibenNachricht.ts` (add `kiTippText?: string` to `SchreibenNachricht`)
- Modify: `src/composables/useSchreibenNachricht.ts` (persist the tip text)
- Test: `tests/data/schreibenAufbau.test.ts` (new)
- Test: `tests/data/schreibenNachrichtenMittel.test.ts` (exists — extend)

**Interfaces:**
- Produces: `NACHRICHT_AUFBAU: Record<SchreibAnlass, readonly string[]>` (task B1 renders it in the drawer's third tab).
- Produces: `resolveRahmenPaar(p: RahmenPaar, empfaengerName: string): { anredeDe: string; grussDe: string }` (task B1 uses it for insertion AND drawer rendering).
- Changes: `incrementNachrichtKiTipp(id: string, tipText: string): Promise<void>` — **gains a second parameter**; also stores `kiTippText`. Task B1 updates the caller and restores the tip on mount.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/data/schreibenAufbau.test.ts
import { describe, expect, it } from 'vitest'
import { NACHRICHT_AUFBAU } from '../../src/data/schreibenAufbau'
import { SCHREIB_ANLAESSE } from '../../src/data/schreibenAuftraege'

describe('NACHRICHT_AUFBAU', () => {
  it('covers every Schreibanlass with 6–8 steps', () => {
    for (const anlass of SCHREIB_ANLAESSE) {
      const steps = NACHRICHT_AUFBAU[anlass]
      expect(steps.length).toBeGreaterThanOrEqual(6)
      expect(steps.length).toBeLessThanOrEqual(8)
      for (const s of steps) expect(s.length).toBeGreaterThan(10)
    }
  })
  it('is generalized — no Muster-specific scenario nouns leak through', () => {
    const all = Object.values(NACHRICHT_AUFBAU).flat().join(' ')
    for (const leak of ['Arzttermin', 'Protokoll', 'Kantine', 'Homeoffice', 'Teamausflug', 'Fortbildung']) {
      expect(all).not.toContain(leak)
    }
  })
})
```

```ts
// additions to tests/data/schreibenNachrichtenMittel.test.ts
import { RAHMEN_PAARE, resolveRahmenPaar } from '../../src/data/schreibenNachrichtenMittel'

describe('resolveRahmenPaar', () => {
  const rp1 = RAHMEN_PAARE.find(p => p.id === 'rp-1')!
  const rp3 = RAHMEN_PAARE.find(p => p.id === 'rp-3')!
  const rp4 = RAHMEN_PAARE.find(p => p.id === 'rp-4')!
  it('resolves the template to the actual Empfänger, title-aware', () => {
    expect(resolveRahmenPaar(rp1, 'Frau Hoffmann').anredeDe).toBe('Sehr geehrte Frau Hoffmann,')
    expect(resolveRahmenPaar(rp1, 'Herr Semder').anredeDe).toBe('Sehr geehrter Herr Semder,')
    expect(resolveRahmenPaar(rp3, 'Herr Roth').anredeDe).toBe('Guten Tag, Herr Roth,')
  })
  it('leaves the Damen-und-Herren pair untouched', () => {
    expect(resolveRahmenPaar(rp4, 'Frau Kling').anredeDe).toBe('Sehr geehrte Damen und Herren,')
  })
  it('never changes the Grußformel', () => {
    expect(resolveRahmenPaar(rp1, 'Frau Kling').grussDe).toBe(rp1.grussDe)
  })
})
```

- [ ] **Step 2: Run both to verify failure**

- [ ] **Step 3: Create `src/data/schreibenAufbau.ts`** with exactly this content:

```ts
//
// Schreiben Teil 2 — the generalized per-Anlass Bauplan for the runner's
// "Aufbau" drawer tab. The Muster library's per-Muster skeletons narrate
// THAT model's choices ("Grund nennen: Arzttermin …"); these lines are the
// same paragraph plans with the scenario nouns stripped, so they hold for
// every Auftrag of their Anlass. Static reference material: never matched,
// never ticked, never logged beyond the drawer's own tab-switch entry.
//
import type { SchreibAnlass } from './schreibenAuftraege'

export const NACHRICHT_AUFBAU: Record<SchreibAnlass, readonly string[]> = {
  entschuldigung: [
    'Betreff: Anliegen und Termin in einer Zeile',
    'Anrede mit Namen — danach klein weiterschreiben',
    'Absage oder Entschuldigung sofort aussprechen, mit „leider" abgefedert',
    'Grund nennen — am besten im weil-Nebensatz',
    'Vorschlagen, wie das Versäumte nachgeholt wird',
    'Eine Bitte im Konjunktiv II anschließen',
    'Verbindlich abschließen + Grußformel und Name'
  ],
  bitte: [
    'Betreff: das Anliegen in einer Zeile benennen',
    'Anrede mit Namen — danach klein weiterschreiben',
    'Bezug: warum Sie schreiben, in einem Satz',
    'Situation kurz erklären — der Hintergrund der Bitte',
    'Die Bitte selbst im Konjunktiv II formulieren',
    'Anbieten, was Sie selbst dazu beitragen können',
    'Um Rückmeldung bitten + Grußformel und Name'
  ],
  beschwerde: [
    'Betreff: das Problem sachlich in einer Zeile',
    'Anrede mit Namen — danach klein weiterschreiben',
    'Sachlich einsteigen: „Leider muss ich Ihnen mitteilen, dass …"',
    'Das Problem konkret beschreiben — seit wann, wie oft, wen es betrifft',
    'Die Folgen benennen: was das Problem kostet',
    'Eine Lösung mit Frist erbitten — im Konjunktiv II',
    'Verbindlich abschließen + Grußformel und Name'
  ],
  vorschlag: [
    'Betreff: den Vorschlag in einer Zeile ankündigen',
    'Anrede mit Namen — danach klein weiterschreiben',
    'Bezug: den Anlass oder das Thema aufgreifen',
    'Ausgangslage kurz beschreiben — was verbessert werden kann',
    'Den Vorschlag konkret machen: was, wie, wann',
    'Vorteile nennen — für das Team, den Kurs, die Firma',
    'Um Meinung oder Zustimmung bitten + Grußformel und Name'
  ],
  dank: [
    'Betreff: wofür Sie danken, in einer Zeile',
    'Anrede mit Namen — danach klein weiterschreiben',
    'Den Dank sofort aussprechen — konkret, nicht allgemein',
    'Sagen, was die Hilfe möglich gemacht hat',
    'Ein Beispiel oder ein Ergebnis nennen',
    'Ein Angebot anschließen — sich revanchieren, weiterempfehlen',
    'Verbindlich abschließen + Grußformel und Name'
  ]
}
```

- [ ] **Step 4: Add `resolveRahmenPaar` to `schreibenNachrichtenMittel.ts`** (below `RAHMEN_PAARE`):

```ts
/**
 * Resolve a Rahmen-Paar template to the actual Empfänger, title-aware:
 * "Sehr geehrte Frau …, / Sehr geehrter Herr …," becomes the one line that
 * fits THIS Auftrag ("Sehr geehrte Frau Hoffmann,"). In a tool surface,
 * showing a template while inserting something else breaks click-what-you-
 * see — the cheatsheet keeps the templates, the runner shows these. rp-4
 * (Damen und Herren) carries no name slot and passes through unchanged.
 */
export function resolveRahmenPaar(
  p: RahmenPaar, empfaengerName: string
): { anredeDe: string; grussDe: string } {
  const name = empfaengerName.trim()
  const isFrau = name.toLowerCase().startsWith('frau')
  let anredeDe = p.anredeDe
  if (p.id === 'rp-1') anredeDe = isFrau ? `Sehr geehrte ${name},` : `Sehr geehrter ${name},`
  else if (p.id === 'rp-2') anredeDe = isFrau ? `Liebe ${name},` : `Lieber ${name},`
  else if (p.id === 'rp-3') anredeDe = `Guten Tag, ${name},`
  return { anredeDe, grussDe: p.grussDe }
}
```

- [ ] **Step 5: KI-Tipp persistence.** In `src/data/schreibenNachricht.ts`, add to `SchreibenNachricht` after `kiTippCount: number`:

```ts
  kiTippText?: string               // the latest paid tip, restored on resume — app advice, not learner text (ADR-0019 untouched)
```

In `src/composables/useSchreibenNachricht.ts`, change `incrementNachrichtKiTipp`:

```ts
export async function incrementNachrichtKiTipp(id: string, tipText: string): Promise<void> {
  await db.transaction('rw', db.schreibenNachrichten, async () => {
    const row = await db.schreibenNachrichten.get(id)
    if (!row) throw new Error(`Nachricht ${id} not found`)
    await db.schreibenNachrichten.update(id, { kiTippCount: row.kiTippCount + 1, kiTippText: tipText })
  })
}
```

Typecheck will flag the runner's old call — B1 fixes the caller; run only the test files here.

- [ ] **Step 6: Run tests** — `npx vitest run tests/data/schreibenAufbau.test.ts tests/data/schreibenNachrichtenMittel.test.ts tests/data/schreibenNachricht.test.ts`

- [ ] **Step 7 (controller): Commit** — `feat(schreiben): Aufbau data, resolved Rahmen-Paare, KI-Tipp persistence`

---

### Task A5: Generator format riders (prompt + validator)

**Files:**
- Modify: `src/composables/useSchreibenAuftraege.ts`
- Test: `tests/composables/useSchreibenAuftraege.test.ts` (exists — extend)
- Test: `tests/data/schreibenAuftraege.test.ts` (exists — extend)

Two format gaps in generated Aufträge vs. built-ins: Inhaltspunkte lack trailing periods, and `taskDe` drops the canonical "… an [Rolle], [Name]." pattern (e.g. generated "…an Herrn Brandt mit mindestens 100 Wörtern" names no role). Fix as prompt riders; validate only the mechanical one (trailing period). No migration of already-stored custom rows.

- [ ] **Step 1: Failing tests.** First verify the seeded invariant, then the validator rule:

```ts
// addition to tests/data/schreibenAuftraege.test.ts
it('every seeded Inhaltspunkt is a full sentence ending with a period', () => {
  for (const a of SCHREIBEN_AUFTRAEGE) {
    for (const p of a.inhaltspunkte) expect(p.endsWith('.')).toBe(true)
  }
})
```

```ts
// addition to tests/composables/useSchreibenAuftraege.test.ts — build on the
// file's existing valid-Auftrag fixture (there is one for validateGeneratedAuftrag)
it('rejects an Inhaltspunkt without a trailing period', () => {
  const raw = { ...validRaw, inhaltspunkte: [...validRaw.inhaltspunkte.slice(0, 3), 'Bitten Sie um eine Antwort'] }
  expect(validateGeneratedAuftrag(raw)).toBeNull()
})
it('prompt names the trailing-period and Rolle-then-Name rules', () => {
  const prompt = buildAuftragGeneratorPrompt([], new Set())
  expect(prompt).toContain('endet mit einem Punkt')
  expect(prompt).toContain('zuerst die Rolle')
})
```

- [ ] **Step 2: Run to verify the new cases fail** (the seeded invariant should already pass — if any seed lacks a period, STOP and report instead of "fixing" data).

- [ ] **Step 3: Implement.** In `validateGeneratedAuftrag`, inside the Inhaltspunkte loop after the `?` check:

```ts
    if (!p.endsWith('.')) return null
```

In `buildAuftragGeneratorPrompt`, extend the two requirement lines:
- the `taskDe` line gains, before the final period of its sentence: `— nennt dabei zuerst die Rolle und dann den Namen, nach dem Muster „… an Ihre Teamleiterin, Frau Steiner."`
- the `inhaltspunkte` line gains: `Jeder Punkt ist ein vollständiger Imperativsatz mit „Sie" und endet mit einem Punkt.`

- [ ] **Step 4: Run both test files; PASS.**

- [ ] **Step 5 (controller): Commit** — `fix(schreiben): generator prompt riders + Inhaltspunkt period validation`

---

### Task A6: Flagship Inhalts-Baukästen for the 15 remaining seeded Aufträge

**Files:**
- Modify: `src/data/schreibenBaukasten.ts` (extend `AUFTRAG_BAUKAESTEN`)
- Test: `tests/data/schreibenBaukasten.test.ts` (exists — extend)

`AUFTRAG_BAUKAESTEN` covers 5 of the 20 seeded Aufträge (`wa-besprechung-absagen`, `wa-homeoffice-antrag`, `wa-kantine-qualitaet`, `wa-teamausflug`, `wa-dank-fortbildung`). Author the missing 15: `wa-dank-einarbeitung`, `wa-dank-projekt`, `wa-dank-vertretung`, `wa-einarbeitung`, `wa-empfehlung-praktikum`, `wa-fortbildung-krank`, `wa-gruenes-buero`, `wa-infos-konferenz`, `wa-it-probleme`, `wa-kurs-ausstattung`, `wa-kurs-fehlen`, `wa-laerm-buero`, `wa-lerngruppe`, `wa-projekt-verspaetung`, `wa-urlaub-verschieben`.

**Authoring rules (read the 5 existing banks first and match their register exactly):**
- Shape per bank: 4 `gruende`, 4 `loesungen`, 6 `words` — the flagship shape (the per-Anlass fallbacks are 3/3/6).
- Read each Auftrag's `situationDe`, `taskDe`, `inhaltspunkte` in `src/data/schreibenAuftraege.ts` and write ideas **specific to that scenario** (the whole point: the tester's Sprachschule complaint got office-generic fallback ideas).
- Each `ideaDe` is liftable into the Nachricht almost unchanged ("eine Probephase von zwei Monaten vorschlagen"), never abstract ("eine Lösung finden"). B2 register, Sie-Perspektive where a sentence fragment implies one.
- `noteEn` is a short English gloss of when/why the idea works, matching the existing tone.
- `words`: 6 topic nouns with articles (`{ de: 'die Ausstattung', en: 'equipment' }`), specific to the scenario.

Example of the expected specificity — this exact entry for `wa-kurs-ausstattung` (Beschwerde, Frau Hoffmann, Leiterin der Sprachschule, Mängel im Kursraum):

```ts
  'wa-kurs-ausstattung': {
    gruende: [
      { ideaDe: 'die Heizung im Kursraum fällt seit Wochen immer wieder aus', noteEn: 'a dated, recurring defect — the strongest complaint opener' },
      { ideaDe: 'der Beamer funktioniert nur sporadisch, Übungen mit Folien entfallen', noteEn: 'ties the defect to lost lesson content' },
      { ideaDe: 'es fehlen Stühle, Teilnehmende müssen stehen oder wechseln den Raum', noteEn: 'affects the whole course, not just you' },
      { ideaDe: 'trotz einer mündlichen Meldung beim Hausmeister hat sich nichts geändert', noteEn: 'shows you escalated properly before writing' }
    ],
    loesungen: [
      { ideaDe: 'um eine Reparatur von Heizung und Beamer bis Monatsende bitten', noteEn: 'a dated, answerable demand' },
      { ideaDe: 'vorschlagen, den Kurs vorübergehend in einen anderen Raum zu verlegen', noteEn: 'a workable interim fix' },
      { ideaDe: 'zusätzliche Stühle aus dem Nachbarraum anfordern', noteEn: 'cheap, immediate, hard to refuse' },
      { ideaDe: 'um eine kurze Rückmeldung bitten, bis wann die Mängel behoben sind', noteEn: 'closes with a commitment request' }
    ],
    words: [
      { de: 'der Mangel', en: 'defect' }, { de: 'die Ausstattung', en: 'equipment' },
      { de: 'die Heizung', en: 'heating' }, { de: 'der Beamer', en: 'projector' },
      { de: 'die Reparatur', en: 'repair' }, { de: 'die Verlegung', en: 'relocation (of the course)' }
    ]
  },
```

- [ ] **Step 1: Write the failing invariant test** (add to `tests/data/schreibenBaukasten.test.ts`):

```ts
import { SCHREIBEN_AUFTRAEGE } from '../../src/data/schreibenAuftraege'
import { AUFTRAG_BAUKAESTEN } from '../../src/data/schreibenBaukasten'

it('every seeded Auftrag has a hand-authored flagship Baukasten of 4/4/6', () => {
  for (const a of SCHREIBEN_AUFTRAEGE) {
    const bank = AUFTRAG_BAUKAESTEN[a.id]
    expect(bank, `missing flagship bank for ${a.id}`).toBeDefined()
    expect(bank.gruende).toHaveLength(4)
    expect(bank.loesungen).toHaveLength(4)
    expect(bank.words).toHaveLength(6)
  }
})
it('flagship words carry articles', () => {
  for (const bank of Object.values(AUFTRAG_BAUKAESTEN)) {
    for (const w of bank.words) expect(w.de).toMatch(/^(der|die|das) /)
  }
})
```

- [ ] **Step 2: Run to verify failure** (15 missing banks).
- [ ] **Step 3: Author the 15 banks** into `AUFTRAG_BAUKAESTEN`, each preceded by a one-line comment naming the Auftrag's Anlass, Empfänger and scenario (match the existing entries' comment style). Include the `wa-kurs-ausstattung` entry exactly as given above.
- [ ] **Step 4: Run the test file; PASS. Also run `npx vitest run tests/composables/useSchreibenBaukasten.test.ts`** (resolution layering must still hold).
- [ ] **Step 5 (controller): Commit** — `feat(schreiben): flagship Inhalts-Baukästen for all 20 seeded Aufträge`

---

## Group B — UI wiring (start after Group A lands; B1–B5 are file-disjoint; run in parallel)

### Task B1: Teil2Runner wiring — all runner-side changes in one pass

**Files:**
- Modify: `src/modules/schreiben/Teil2Runner.vue`

**Interfaces (consumes, all landed in Group A):**
- `keywordWritten`, `normalizeForMatch` from `../../composables/useSchreibplanMatch`
- `radarWarnungen(text, anlass, words)` — new arity
- `resolveRahmenPaar` from `../../data/schreibenNachrichtenMittel`
- `NACHRICHT_AUFBAU` from `../../data/schreibenAufbau`
- `setNachbessernText` from `../../composables/useNachbessern`
- `incrementNachrichtKiTipp(id, tipText)` — new arity; `SchreibenNachricht.kiTippText`

Eight changes, each small:

- [ ] **Step 1: planSignals uses the shared matcher.** Delete the local `normalizeForMatch` function; import both helpers from `useSchreibplanMatch`. In `planSignals`, replace the `said:` computation:

```ts
    return {
      index: i,
      punkt,
      keyword,
      said: keywordWritten(keyword, hay)
    }
```

(`hay` stays `normalizeForMatch(fullText.value)`; the `needle` const is removed.)

- [ ] **Step 2: Radar call passes the word count.** In `radarAll`:

```ts
const radarAll = computed(() =>
  nachricht.value?.helps.radar
    ? radarWarnungen(checkedText.value, nachricht.value.auftrag.anlass, words.value)
    : []
)
```

- [ ] **Step 3: Prüfzeit note.** A one-time dismissible push-note when the phase flips to `pruefen`, gated by `helps.timer` — the same species as the existing `ueberzeit` note, NOT part of the Radar and NOT a Hilfe-Protokoll entry. Script additions:

```ts
const pruefzeitDismissed = ref(false)
const showPruefzeit = computed(() =>
  nachricht.value?.helps.timer === true && phase.value === 'pruefen' && !pruefzeitDismissed.value && writing.value
)
```

Template — directly above the Radar block (`.nf-radar`):

```html
          <div v-if="showPruefzeit" class="nf-radar nf-pruefzeit">
            <div class="nf-radar-row">
              <span class="nf-radar-l">Prüfzeit</span>
              <div class="nf-radar-b">
                <p class="nf-radar-d">
                  Lies die vier Inhaltspunkte noch einmal gegen deinen Text, prüfe jede Bitte
                  auf Konjunktiv II und Sie/Ihnen/Ihr auf Großschreibung.
                </p>
              </div>
              <button class="spr-nudge-x" type="button" aria-label="Hinweis ausblenden" @click="pruefzeitDismissed = true">×</button>
            </div>
          </div>
```

No new CSS needed beyond reusing `.nf-radar*`; add `.nf-pruefzeit .nf-radar-row { border-left-color: var(--accent); }` and `.nf-pruefzeit .nf-radar-l { color: var(--accent); }` to scoped styles so it reads as clock-advice, not a warning.

- [ ] **Step 4: Resolved Rahmen-Paare.** Import `resolveRahmenPaar`. Build the runner's drawer list (replacing raw `RAHMEN_PAARE` in the template loop):

```ts
/** The drawer shows what a click inserts (click-what-you-see): templates
 *  resolved to THIS Auftrag's Empfänger. rp-4 (Damen und Herren) is
 *  excluded here — these tasks always name a person; the cheatsheet keeps
 *  the full template list. */
const rahmenPaare = computed(() => {
  const n = nachricht.value
  if (!n) return []
  return RAHMEN_PAARE.filter(p => p.id !== 'rp-4')
    .map(p => ({ ...p, ...resolveRahmenPaar(p, n.auftrag.empfaengerName) }))
})
```

Template: `v-for="p in rahmenPaare"` — the button now renders `{{ p.anredeDe }} <i class="nf-paar-sep">…</i> {{ p.grussDe }}` with the resolved text and `applyRahmenPaar(p)` keeps working unchanged (it reads `p.anredeDe`/`p.grussDe`, now resolved).

- [ ] **Step 5: Aufbau drawer tab.** Import `NACHRICHT_AUFBAU`. Widen the tab ref: `const tab = ref<'mittel' | 'baukasten' | 'aufbau'>('mittel')` and `selectTab(t: 'mittel' | 'baukasten' | 'aufbau')`. Third tab button after the "Was" button:

```html
                <button class="spr-dtab" :class="{ on: tab === 'aufbau' }" type="button" @click="selectTab('aufbau')">
                  Wann<span class="spr-dtab-sub">Aufbau</span>
                </button>
```

Body — add as a sibling branch of the existing `tab === 'mittel'` template and the baukasten div (the baukasten branch changes from `v-else` to `v-else-if="tab === 'baukasten'"`):

```html
                <div v-else class="spr-was nf-aufbau">
                  <div class="spr-was-h">Aufbau · {{ ANLASS_LABEL[nachricht.auftrag.anlass].de }}</div>
                  <ol class="nf-aufbau-list">
                    <li v-for="(line, i) in NACHRICHT_AUFBAU[nachricht.auftrag.anlass]" :key="i">{{ line }}</li>
                  </ol>
                </div>
```

Scoped CSS: `.nf-aufbau-list { margin: 8px 0 0; padding-left: 20px; display: flex; flex-direction: column; gap: 7px; font-size: 14px; line-height: 1.5; color: var(--ink-soft); }`

- [ ] **Step 6: Nudge-log dedupe + KI-Tipp restore on mount.** In `onMounted`, after `nachricht.value` is set (both branches resolved, right before `tickElapsed()`):

```ts
  // A resumed row that already logged its Move nudge must not log a second
  // one; the Protokoll's whole value is being descriptively true.
  nudgeLogged.value = nachricht.value.helpLog.some(h => h.kind === 'nudge')
  // The latest paid KI-Tipp survives a reload with its row (app advice, not
  // learner text — ADR-0019 untouched).
  kiTipp.value = nachricht.value.kiTippText ?? null
```

In `fetchKiTipp`, update the billing call and keep the discipline comment true:

```ts
    await incrementNachrichtKiTipp(nachricht.value.id, tip)
    nachricht.value.kiTippCount += 1
    nachricht.value.kiTippText = tip
```

- [ ] **Step 7: Nachbessern handoff.** Import `setNachbessernText`. In `runGrading`, directly before `router.push({ name: 'schreiben-teil2-result' })`:

```ts
    setNachbessernText(n.textDe)                     // ADR-0024: volatile, consumed once by the result page
```

- [ ] **Step 8: Header comment update.** In the file-top comment, replace the clause "— though `absaetze` is trivially satisfied by the assembled frame whenever the scaffold is on (betreff/anrede-text/gruss already join on blank lines); that check truly bites only in free-text mode." with "— and `absaetze` is body-scoped (between Anrede and Grußformel), so the assembled frame alone earns nothing in either mode."

- [ ] **Step 9: Verify** — `npm run typecheck` (must be clean now that A-group arity changes are wired), `npm run test`, then a manual dev-server spot-check is done at release time.

- [ ] **Step 10 (controller): Commit** — `feat(schreiben): runner wiring — Prüfzeit note, Aufbau tab, resolved Paare, tolerant dots, tip persistence, Nachbessern handoff`

---

### Task B2: Prep steering + Teil 1 parity + yield-copy honesty

**Files:**
- Modify: `src/modules/schreiben/Teil2Prep.vue`
- Modify: `src/modules/schreiben/Teil1Prep.vue`
- Modify: `src/modules/schreiben/Teil1Runner.vue`
- Modify: `src/modules/sprechen/Teil1Result.vue` (one string)
- Test: `tests/modules/SchreibenTeil1Prep.test.ts` (exists — extend if it asserts warning behavior; otherwise leave)

- [ ] **Step 1: Teil1Runner planSignals** — same change as B1 Step 1: import `keywordWritten`/`normalizeForMatch` from `../../composables/useSchreibplanMatch`, delete the local `normalizeForMatch`, and replace the `said:` line with `said: keywordWritten(keyword, hay)`.

- [ ] **Step 2: Multi-word keyword steering in both Preps.** Both Prep files have the same blur-gated `keywordWarnings` computed with `RawWarning { msg, requires }`. Add a new single-field rule in the same loop that flags too-short keywords (only where no warning is set yet — duplicates keep priority, so add it FIRST and let later rules overwrite as the existing code does, or add after the too-short rule with the same `if undefined` guard as the pair rules):

```ts
    if (e.raw.includes(' ') && raw[e.index] === undefined) {
      raw[e.index] = {
        msg: `„${e.raw}" hat mehrere Wörter — der Haken leuchtet erst, wenn alle im Text stehen.`,
        requires: [e.index]
      }
    }
```

Place it AFTER the too-short rule (a 3-char two-word keyword should warn about length first). Copy is identical in both files.

- [ ] **Step 3: Yield-note honesty copy.** The local matcher counts bank phrases verbatim; "nicht vorgekommen" overclaims. Three one-string changes:
- `src/modules/schreiben/Teil2Result.vue`: note becomes `"In dieser Nachricht nicht wörtlich verwendet."` **(coordinate: this file belongs to B3 — hand THIS one string to B3 and change only the other two here; B3's checklist includes it.)**
- `src/modules/schreiben/Teil1Result.vue`: `note="In diesem Beitrag nicht wörtlich verwendet."`
- `src/modules/sprechen/Teil1Result.vue`: `note="In diesem Vortrag nicht wörtlich verwendet."`

- [ ] **Step 4: Verify** — `npx vitest run tests/modules/SchreibenTeil1Prep.test.ts tests/router.teil1.test.ts`, `npm run typecheck`.

- [ ] **Step 5 (controller): Commit** — `fix(schreiben): tolerant plan dots in Teil 1, Prep steering hint, honest yield copy`

---

### Task B3: Teil2Result — Nachbessern integration

**Files:**
- Modify: `src/modules/schreiben/Teil2Result.vue`

**Interfaces (consumes):** `takeNachbessernText` from `../../composables/useNachbessern`; `NachbessernPanel` from `../../components/schreiben/NachbessernPanel.vue`.

- [ ] **Step 1: Consume the handoff on first mount.** Script additions:

```ts
import { takeNachbessernText } from '../../composables/useNachbessern'
import NachbessernPanel from '../../components/schreiben/NachbessernPanel.vue'

// ADR-0024: consumed exactly once — a reload or revisit finds null and the
// page degrades to the plain result with no conditional debt.
const nachbessernText = ref<string | null>(null)
const nachbessernOpen = ref(false)
```

In `onMounted`, after `data.value` is parsed successfully: `nachbessernText.value = takeNachbessernText()`.

```ts
function finishNachbessern() {
  nachbessernText.value = null       // the text dies here (ADR-0024)
  nachbessernOpen.value = false
}
```

- [ ] **Step 2: Offer + panel in the Korrekturen section.** Directly under the last mistake-card loop (before the `mistakeCounts` chip row), add:

```html
      <template v-if="mistakes.length > 0 && nachbessernText !== null">
        <button
          v-if="!nachbessernOpen" class="btn btn-accent nb-open" type="button"
          @click="nachbessernOpen = true"
        >Korrekturen einarbeiten <span aria-hidden="true">→</span></button>
        <NachbessernPanel
          v-else :text="nachbessernText" :mistakes="mistakes"
          @done="finishNachbessern"
        />
      </template>
```

Scoped CSS: `.nb-open { margin-top: 16px; }`

- [ ] **Step 3: Yield-note copy** (owned here per B2's coordination note): the `SchrNachrichtYield` note becomes `note="In dieser Nachricht nicht wörtlich verwendet."`

- [ ] **Step 4: Verify** — `npm run typecheck`; `npx vitest run tests/modules/NachbessernPanel.test.ts` still green.

- [ ] **Step 5 (controller): Commit** — `feat(schreiben): Nachbessern on the Teil 2 result (ADR-0024)`

---

### Task B4: Hub parity (SchreibenHome)

**Files:**
- Modify: `src/modules/schreiben/SchreibenHome.vue`

Six changes; keep the header comment honest by rewriting it to say the shared bands are now explicitly per-Teil.

- [ ] **Step 1: Imports + Teil 2 stats.** Add imports: `SCHREIBEN_NACHRICHTENMITTEL` from `../../data/schreibenNachrichtenMittel`, `SchrNachrichtYield` from `../../components/schreiben/SchrNachrichtYield.vue`, `SCHREIBEN_B2_TEIL2` from `../../data/rubrics`. Add computeds beside the Teil 1 ones:

```ts
const latestTeil2Criteria = computed<CriterionScore[] | null>(() => {
  const cs = teil2Runs.value[0]?.meta.sprechenCriteria
  return Array.isArray(cs) && cs.length > 0 ? (cs as CriterionScore[]) : null
})
const usedNachrichtenmittelIds = computed(() => Object.keys(lifetimeCounts(SCHREIBEN_NACHRICHTENMITTEL)))
```

- [ ] **Step 2: Retitle the Teil 1 bands.** `"Letzte Bewertung"` → `"Letzte Bewertung · Teil 1"`; `"Schreibmittel-Ausbeute"` → `"Schreibmittel-Ausbeute · Teil 1"`.

- [ ] **Step 3: Add the two Teil 2 sections** directly after their Teil 1 counterparts:

```html
    <!-- 03b · Letzte Bewertung Teil 2 -->
    <section class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Letzte Bewertung · Teil 2</h2>
        <span class="spr-block-n">nach der offiziellen Rubrik · getippt</span>
      </div>
      <SprCriterionBars :typed="latestTeil2Criteria" :spoken="null" :rubric="SCHREIBEN_B2_TEIL2" />
    </section>
```

```html
    <!-- 04b · Nachrichtenmittel-Ausbeute -->
    <section class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Nachrichtenmittel-Ausbeute · Teil 2</h2>
        <span class="spr-block-n">lokal gezählt · ohne KI · zählt nie in die Note</span>
      </div>
      <p class="spr-sub spr-sub-tight">
        Was du in Nachrichten tatsächlich benutzt hast — über alle Runs hinweg. Eine
        Nachrichtfunktion ohne Treffer ist genau die, zu der der Runner dich künftig schubst.
      </p>
      <SchrNachrichtYield :used-ids="usedNachrichtenmittelIds"
        note="Noch nie benutzt — der Runner wird dich darauf schubsen." />
    </section>
```

- [ ] **Step 4: Merge the recents list.** Rename the section title `"Letzte Beiträge"` → `"Letzte Bewertungen"` and make `recents` span both Teils with a tag:

```ts
/** Last 5 graded Schreiben texts across both Teils, newest first —
 *  loadHistory() is already sorted, so filtering preserves order. */
const recents = computed(() =>
  allRuns.value
    .filter(h => h.type === 'schreiben-teil1' || h.type === 'schreiben-teil2')
    .slice(0, 5)
    .map(r => ({
      id: r.id,
      teil: r.type === 'schreiben-teil1' ? 'Teil 1' : 'Teil 2',
      date: new Date(r.startedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      topic: r.meta.topicTitle ?? '—',
      score: r.meta.sprechenScore ?? r.correct,
      praedikat: r.meta.sprechenPraedikat ?? '—'
    }))
)
```

Row template: add `<span class="tag">{{ r.teil }}</span>` inside the row's meta span, before the score.

- [ ] **Step 5: Archive row — module-wide counts, copy, prefilter link.** In `onMounted`: `countsByKind(undefined, 'schreiben')` and `openCorrections(undefined, undefined, 'schreiben')`. Update the module comment above it (part-1-only → module-wide, both Teils). Row IV desc becomes: `'Deine eigenen falschen Stellen aus Forumsbeiträgen und Nachrichten, nach Fehlerart sortiert. Der Text selbst wird verworfen — diese Sätze nicht.'` The rows' click handler is generic `go(r.route)` — special-case the archive row so arrival pre-filters to Schreiben:

```ts
function openRow(route: string) {
  if (route === 'sprechen-archive') { router.push({ name: route, query: { module: 'schreiben' } }); return }
  go(route)
}
```

and the template uses `@click="openRow(r.route)"`.

- [ ] **Step 6: Pluralization.** `{{ teil1Runs.length }} {{ teil1Runs.length === 1 ? 'Beitrag' : 'Beiträge' }}` and `{{ teil2Runs.length }} {{ teil2Runs.length === 1 ? 'Nachricht' : 'Nachrichten' }}` in the two panel stat cells.

- [ ] **Step 7: Verify** — `npm run typecheck`, `npm run test`.

- [ ] **Step 8 (controller): Commit** — `feat(schreiben): hub Teil-2 parity — criteria bars, Nachrichtenmittel yield, merged recents, module-wide archive row`

---

### Task B5: Archive neutralization + history rows

**Files:**
- Modify: `src/modules/sprechen/SprechenArchive.vue`
- Modify: `src/modules/history/HistoryPage.vue`

- [ ] **Step 1: Archive page identity.** The Error archive is one shared surface (CONTEXT.md → "Error archive"); the page keeps its route/URL but drops the Sprechen branding:
- breadcrumb `"Sprechen · Fehlerarchiv"` → `"Goethe B2 · Fehlerarchiv"`
- subtitle → `"Jede bewertete Diskussion, jeder Vortrag, jeder Forumsbeitrag und jede Nachricht wird nach der Bewertung verworfen — deine markierten Fehler nicht. Hier stehen sie, sortiert nach Fehlerart, damit Wiederholung sichtbar wird."`
- empty-state `<p>` → `"Nach einer bewerteten Diskussion, einem Vortrag, Forumsbeitrag oder einer Nachricht erscheinen deine markierten Fehler hier."` (keep the Diskussion-starten CTA button unchanged)
- the file-top comment's first paragraph updates to name all four sources.

- [ ] **Step 2: Prefilter param.** Arriving with `?module=schreiben` (or `sprechen`) pre-selects that module chip — state, not identity. In script: `import { useRoute } from 'vue-router'`, `const route = useRoute()`. **Careful with `loadAll`'s snapshot assumption** (it snapshots `items` as `allCorrections` only because both filters are null on first load). Make the snapshot explicit instead:

```ts
async function loadAll() {
  loading.value = true
  error.value = null
  try {
    const q = route.query.module
    if (q === 'schreiben' || q === 'sprechen') selectedModule.value = q
    const [c, d, all] = await Promise.all([countsByKind(), drilledIds(), listCorrections({})])
    counts.value = c
    drilled.value = d
    allCorrections.value = all
    await loadList()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Fehlerarchiv konnte nicht geladen werden.'
  } finally {
    loading.value = false
  }
}
```

(The old "capture items while filters are null" comment goes away with it.)

- [ ] **Step 3: History-aware back-link.** Find the page's back button (bottom `setup-actions` "← Sprechen" or similar). Replace its handler with:

```ts
function goBack() {
  if (window.history.length > 1) router.back()
  else router.push({ name: 'sprechen' })
}
```

and its label with `← Zurück`.

- [ ] **Step 4: History rows for exam trainers.** In `HistoryPage.vue`, the desktop table's count cell renders `{{ it.count }} asked` — misleading for the four exam-trainer types (count is the 100-point scale, not questions). Add:

```ts
const EXAM_TRAINER_TYPES = new Set(['sprechen-teil1', 'sprechen-teil2', 'schreiben-teil1', 'schreiben-teil2'])
```

Count cell becomes:

```html
          <td>
            <template v-if="EXAM_TRAINER_TYPES.has(it.type)">
              <span class="hist-topic">{{ it.meta.topicTitle ?? '—' }}</span>
            </template>
            <template v-else>
              <span class="mono">{{ it.count }}</span>
              <span class="hist-asked">asked</span>
            </template>
          </td>
```

CSS: `.hist-topic { font-size: 13px; font-style: italic; color: var(--ink-soft); }` — check the mobile card layout too: if it renders the same `count asked` pair, apply the same conditional there; if it only shows label+score, leave it.

- [ ] **Step 5: Verify** — `npm run typecheck`, `npm run test`.

- [ ] **Step 6 (controller): Commit** — `fix(archive,history): neutral Fehlerarchiv identity, module prefilter, exam-trainer history rows`

---

## Task C1: Release (controller only — subagents never run git)

- [ ] Full verification: `npm run typecheck` && `npm run test` — all green.
- [ ] Playwright spot-check on the dev server (port 5199): Teil 2 run through grading with the Rahmen on — Anrede dot rejects wrong title, Prüfzeit note at 20:00 is NOT awaited (verify via code path only), Aufbau tab renders, Nachbessern offer appears on the result and the panel flips states; hub shows the new sections; archive arrives pre-filtered from the Schreiben hub.
- [ ] Bump `package.json` version → `1.21.01`; prepend `src/data/changelog.ts` entry (kind `'polish'`, version `1.21.01`, today's date) summarizing: Nachbessern, ehrlichere Live-Checks (Anrede-Endung, Absätze im Haupttext, Höflichkeits-Radar erst ab 40 Wörtern, mehrwortige Stichwörter), Aufbau-Tab, aufgelöste Anrede-Paare, KI-Tipp überlebt Reload, Hub-Parität für Teil 2, neutrales Fehlerarchiv, 15 neue Auftrag-Baukästen, Generator-Format. Set `APP_VERSION = '1.21.01'`.
- [ ] Merge the feature branch to `main` (no-ff, message `Merge feat/schreiben-teil2-review-round: Teil 2 review round (1.21.01)`), push, `npm run deploy`.

## Self-Review Notes

- Spec coverage: grilling items 1–12 map to A2 (items 1/4 partial), A2+B1 (1, 4, 5), A1+B1+B2 (3), A2+B1 (2 via S3 checks) + A4+B1 (S3 insertion), A3+B1+B3 (7), A4+A6+B1 (10, 11), A5 (S3 validator + nit v), B2 (3), B4 (9), B5 (8, nit iv), B1 (nits ii, iii), B4 (nit i), C1 (release).
- Arity changes (`radarWarnungen`, `incrementNachrichtKiTipp`) intentionally break typecheck between Group A and B1 — Group A tasks verify per-file tests only; B1 restores a clean typecheck. Run Group A fully before starting B1.
- Type consistency: `KorrekturStatus` string union used in both A3 files; `NachrichtMistake` imported from `useNachrichtGrader` everywhere; `keywordWritten(keyword, normalizedHay)` argument order consistent across A1/B1/B2.
