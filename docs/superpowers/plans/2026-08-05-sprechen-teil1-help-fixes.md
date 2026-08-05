# Sprechen Teil 1 Help-System Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the 22 fixes of [the help-fixes spec](../specs/2026-08-05-sprechen-teil1-help-fixes-design.md) — truthful measurements, honest helps, and the highest-yield help improvements — as release 1.17.01.

**Architecture:** No new routes, no Dexie version bump, no new rubric. Additive type fields, one additive recognizer callback, four explicit needle overrides instead of an algorithm change, and prompt/validator work inside the existing single grade call. The two runner tasks are sequential (same file); everything else is disjoint per wave.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Dexie, vitest + @vue/test-utils + fake-indexeddb.

**Source of truth:** the spec (F1–F22). Where this plan and the spec disagree, the spec wins — report the conflict rather than guessing. Each F-number below refers to it.

## Global Constraints

- **Never run git.** The controller commits between waves.
- **Typecheck with `npm run typecheck`** (vue-tsc). Plain `tsc` output means nothing here.
- **Test with `npm test` / `npx vitest run <paths>`.** Tests mirror src paths under `tests/`.
- **Touch only the files listed in your task.** Other agents own the neighbouring files in the same wave.
- **Teil 2 must not move:** `Teil2*.vue`, `useSprechenGrader.ts`, `useSprechenPartner.ts`, `useSprechenDiscussion.ts`, `sprechenRedemittel.ts`, `sprechenTopics.ts` are out of bounds for every task. Teil 2's matcher needles must be byte-identical after F5 (that is why F5 is overrides, not an algorithm change).
- **The three help invariants:** no help validated against, no help affects a score, no help costs a call except KI-Tipp. Aufwertungen never reach `appendCorrections`. The grade pipeline records exactly one Run.
- **German copy must be correct, idiomatic, and in the app's editorial register.** All new user-facing German in this plan was reviewed — use it verbatim unless it is marked as an authoring brief.
- **When a plan-provided test contradicts its own comment or the arithmetic, fix the TEST, state the reasoning in your report, and never bend the implementation to match a wrong number.** (Three agents did this correctly in the 1.17.00 build.)
- **Behavioural tests you own that assert the OLD behaviour must be updated to the new behaviour** — never deleted, never weakened below the invariant they protect.

## Execution Waves

| Wave | Tasks | Files are disjoint? |
|---|---|---|
| **A** | 1 · 2 · 3 · 4 · 5 · 6 | yes (T5/T6 have type-only reads of T1's new fields — transient typecheck errors mid-wave are expected and resolve when the wave lands) |
| **B** | 7 · 8 · 9 · 10 | yes |
| **C** | 11 · 12 | yes (T11 owns `Teil1Runner.vue` after T9 finished with it) |
| **Release** | controller only | — |

## Shared interface contract (all tasks code against these exact names)

```ts
// src/data/sprechen.ts (T1)
export type HelpKind = 'drawer' | 'phrase' | 'rettungsleine' | 'nudge' | 'kitipp' | 'vorsprechen' | 'stuck'
export interface RedeRecord {
  textDe: string
  seconds?: number        // spoken only — accumulated mic-open time
  restarts?: number
  spans?: SpeechSpan[]
  firstSpokenAt?: number  // ms epoch of the first mic open (F2)
  wallSeconds?: number    // wall time since firstSpokenAt while the runner was open (F2)
}
export interface SprechenVortrag { /* existing fields */ downgradedAt?: number /* F13 */ }

// src/composables/useVortrag.ts (T1)
export async function markDowngraded(id: string, at?: number): Promise<void>

// src/composables/useQuizHistory.ts (T1)
// QuizHistoryMeta gains: sprechenWallSeconds?: number; sprechenDowngraded?: boolean

// src/composables/useRedemittelMatch.ts (T2)
export interface PhraseLike { id: string; move: string; phraseDe: string; needle?: string }
export function phraseNeedle(p: PhraseLike): string   // p.needle ?? redemittelNeedle(p.phraseDe)

// src/data/sprechenVortragsmittel.ts (T2)
export interface Konnektor { wort: string; frameDe: string }
export interface KonnektorGroup { labelDe: string; stellungDe: string; konnektoren: Konnektor[] }
export const KONNEKTOREN: KonnektorGroup[]

// src/composables/useSpeechRecognizer.ts (T4)
export interface CommittedSpeech { text: string; spans: SpeechSpan[]; restarts: number }
export function useSpeechRecognizer(lang = 'de-DE', onFinal?: (c: CommittedSpeech) => void): SpeechRecognizer

// src/composables/useVortragTimer.ts (T4)
export function hardLimitReached(input: { wallSeconds: number; modality: Modality; hardLimit: boolean }): boolean

// src/composables/useVortragGrader.ts (T6)
// Teil1ResultStash gains: downgradedAt?: number
```

---

### Task 1: Types, lifecycle and Run meta (F2, F6, F13 — the data layer)

**Files:**
- Modify: `src/data/sprechen.ts` (the Teil 1 block only)
- Modify: `src/composables/useVortrag.ts`
- Modify: `src/composables/useQuizHistory.ts` (meta only)
- Test: `tests/composables/useVortrag.test.ts` (extend)

**Interfaces:** produces the T1 block of the shared contract above. All additions optional — no Dexie migration, no existing row gains a required field.

- [ ] **Step 1: Write the failing tests** — append to `tests/composables/useVortrag.test.ts`:

```ts
describe('downgrade and wall-clock persistence', () => {
  it('records the mic-denied downgrade without touching modality', async () => {
    const v = await createVortrag(thema, 'spoken', helps, [], '')
    await markDowngraded(v.id, 1234)
    const got = await db.sprechenVortraege.get(v.id)
    expect(got?.downgradedAt).toBe(1234)
    expect(got?.modality).toBe('spoken')   // F13: the seconds are real, spelling suppression must stay
  })

  it('markDowngraded on a missing row is non-fatal', async () => {
    await expect(markDowngraded('nope', 1)).resolves.toBeUndefined()
  })

  it('persists firstSpokenAt and wallSeconds with the Rede', async () => {
    const v = await createVortrag(thema, 'spoken', helps, [], '')
    await saveRede(v.id, { textDe: 'Hallo', seconds: 10, firstSpokenAt: 111, wallSeconds: 25 })
    const got = await db.sprechenVortraege.get(v.id)
    expect(got?.rede.firstSpokenAt).toBe(111)
    expect(got?.rede.wallSeconds).toBe(25)
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/composables/useVortrag.test.ts` → FAIL (`markDowngraded` not exported; type errors).
- [ ] **Step 3: Implement** — in `src/data/sprechen.ts`: add `'stuck'` to the `HelpKind` union; add `firstSpokenAt?: number` and `wallSeconds?: number` to `RedeRecord` with the F2 comment (wall time from the first mic open while the runner is open; closed-tab time excluded); add `downgradedAt?: number` to `SprechenVortrag` with the F13 comment (mic denied mid-Rede; modality deliberately stays `'spoken'`). In `useVortrag.ts` add, mirroring `logHelp`'s non-fatal posture:

```ts
/** F13 — the mic died mid-Rede and the input surface fell back to typing.
 *  Recorded as data so the grader, the result page and the Run all state it.
 *  Non-fatal: a failed write must not interrupt the Rede. */
export async function markDowngraded(id: string, at = Date.now()): Promise<void> {
  try {
    await db.sprechenVortraege.update(id, { downgradedAt: at })
  } catch { /* descriptive only */ }
}
```

In `useQuizHistory.ts`, in the Teil 1 meta block: `sprechenWallSeconds?: number` and `sprechenDowngraded?: boolean`, one comment line each.
- [ ] **Step 4: Run** — the file's tests pass; then `npm run typecheck` (transient errors from parallel wave-A tasks are possible — report, don't fix others' files).
- [ ] **Step 5: Report** exports added and test counts.

---

### Task 2: Needle overrides and the Konnektoren reshape (F5, F10)

**Files:**
- Modify: `src/composables/useRedemittelMatch.ts`
- Modify: `src/data/sprechenVortragsmittel.ts`
- Test: `tests/composables/useRedemittelMatch.test.ts` (extend), `tests/data/sprechenVortragsmittel.test.ts` (update)

**Interfaces:** produces `PhraseLike.needle?`, `phraseNeedle()`, the new `KONNEKTOREN` shape (see contract). `matchRedemittel` must use `phraseNeedle(r)` instead of `redemittelNeedle(r.phraseDe)` — that is the whole matcher change; `redemittelNeedle` itself is untouched, so **every Teil 2 needle is byte-identical**.

- [ ] **Step 1: Failing tests.** Append to `tests/composables/useRedemittelMatch.test.ts`:

```ts
describe('needle overrides (F5)', () => {
  it('matches the four placeholder-first Vortragsmittel from natural sentences', () => {
    const cases: Array<[string, string]> = [
      ['vm-kontrast-1', 'Einerseits ist das Ehrenamt praktisch, andererseits kostet es Zeit.'],
      ['vm-kontrast-2', 'Für das Ehrenamt spricht, dass man Verantwortung lernt.'],
      ['vm-gliederung-2', 'Zuerst beschreibe ich die Lage, danach die Vorteile, und zum Schluss meine Meinung.'],
      ['vm-beispiel-2', 'Als ich noch Studentin war, habe ich erlebt, dass niemand Zeit hatte.']
    ]
    for (const [id, sentence] of cases) {
      const ids = matchRedemittel([sentence], SPRECHEN_VORTRAGSMITTEL).map(r => r.id)
      expect(ids, id).toContain(id)
    }
  })

  it('keeps every Teil 2 needle byte-identical — overrides only exist in the Vortrag bank', () => {
    for (const r of SPRECHEN_REDEMITTEL) {
      expect((r as PhraseLike).needle).toBeUndefined()
      expect(phraseNeedle(r)).toBe(redemittelNeedle(r.phraseDe))
    }
  })

  it('all effective Vortrag needles stay distinct and non-nesting', () => {
    const needles = SPRECHEN_VORTRAGSMITTEL.map(r => phraseNeedle(r))
    expect(new Set(needles).size).toBe(needles.length)
    const overlaps: string[] = []
    for (const a of needles) for (const b of needles) if (a !== b && b.includes(a)) overlaps.push(`${a} ⊂ ${b}`)
    expect(overlaps).toEqual([])
  })
})
```

In `tests/data/sprechenVortragsmittel.test.ts`: relax the min-length invariant **for overridden phrases only** — an override must be ≥ 10 normalized chars (comment: overrides are hand-verified against natural realizations; 10 is enough when the string is hand-chosen), derived needles keep ≥ 12. Replace the KONNEKTOREN test with the new shape:

```ts
describe('KONNEKTOREN (F10)', () => {
  it('groups by the Stellung each word forces, with a frame per word', () => {
    expect(KONNEKTOREN.length).toBeGreaterThanOrEqual(4)
    for (const g of KONNEKTOREN) {
      expect(g.stellungDe.trim().length).toBeGreaterThan(5)
      expect(g.konnektoren.length).toBeGreaterThanOrEqual(3)
      for (const k of g.konnektoren) {
        expect(k.frameDe).toContain(k.wort.split(' ')[0])
        expect(k.frameDe).toContain('…')
      }
    }
  })

  it('never offers nämlich as a sentence opener', () => {
    const all = KONNEKTOREN.flatMap(g => g.konnektoren)
    const naemlich = all.find(k => k.wort === 'nämlich')
    expect(naemlich).toBeTruthy()
    expect(naemlich!.frameDe.startsWith('Nämlich')).toBe(false)
  })
})
```

- [ ] **Step 2: Verify failure.**
- [ ] **Step 3: Implement.** In `useRedemittelMatch.ts`: add `needle?: string` to `PhraseLike`, export `phraseNeedle(p: PhraseLike): string` returning `p.needle ?? redemittelNeedle(p.phraseDe)`, and switch `matchRedemittel`'s filter to `hay.includes(phraseNeedle(r))`. Nothing else moves. In `sprechenVortragsmittel.ts`: give exactly four phrases a `needle` (already normalized — lowercase, no punctuation): `vm-kontrast-1 → 'andererseits'`, `vm-kontrast-2 → 'spricht dass'`, `vm-gliederung-2 → 'und zum schluss'`, `vm-beispiel-2 → 'als ich noch'`, each with a one-line comment naming the natural realization it matches. Reshape `KONNEKTOREN` to the contract shape. Authoring brief (write correct German frames; the ellipsis is the learner's continuation):
  - *Satzanfang — Verb an Position 2* (`stellungDe: 'Konnektor auf Position 1, Verb direkt danach'`): zunächst → `Zunächst möchte ich …`, anschließend → `Anschließend komme ich zu …`, außerdem → `Außerdem ist …`, trotzdem → `Trotzdem bleibt …`, deshalb → `Deshalb finde ich …`, zusammenfassend → `Zusammenfassend lässt sich sagen, dass …`
  - *Aufzählen* (same Stellung note): erstens → `Erstens ist …`, zweitens → `Zweitens zeigt …`, zum einen / zum anderen → `Zum einen … , zum anderen …`
  - *Gegenüberstellen* : einerseits/andererseits → `Einerseits … , andererseits …`, dagegen → `Dagegen spricht …`, im Gegensatz dazu → `Im Gegensatz dazu ist …`
  - *Im Satz — normale Wortstellung* (`stellungDe: 'mitten im Satz, Wortstellung bleibt'`): denn → `… , denn ich habe …`, nämlich → `… , ich habe nämlich …`, zum Beispiel → `… , zum Beispiel …`
  Keep group count ≥ 4 and ≥ 3 words each; adjust freely within the brief.
- [ ] **Step 4: Run** `npx vitest run tests/composables/useRedemittelMatch.test.ts tests/data/sprechenVortragsmittel.test.ts tests/composables/useRedemittelYield.test.ts` → all PASS (the Teil 2 byte-identical test is the gate). Typecheck note: `Teil1Prep.vue` consumes the old `KONNEKTOREN.words` and will fail typecheck until wave B's T8 lands — expected, report it.
- [ ] **Step 5: Report** the four overrides and the final group/word counts.

---

### Task 3: Vortragsthemen reauthoring (F20)

**Files:**
- Modify: `src/data/sprechenVortragsthemen.ts`
- Test: `tests/data/sprechenVortragsthemen.test.ts` (extend)

- [ ] **Step 1: Failing test** — append:

```ts
describe('no premise-loaded tasks (F20)', () => {
  const LOADED = [
    /warum .* so wichtig/i,
    /warum immer (mehr|weniger)/i,
    /warum .* noch immer/i,
    /an Bedeutung verliert/i,
    /Vor- und Nachteile/,          // pre-empts Gliederungspunkt 3
    / oder /                        // an either-or belongs in the Teil 2 Topic pool
  ]
  it('every taskDe leaves both sides and the Meinung open', () => {
    for (const t of SPRECHEN_VORTRAGSTHEMEN) {
      for (const p of LOADED) expect(t.taskDe, `${t.id} loaded: ${p}`).not.toMatch(p)
    }
  })
  it('ids and titles are unchanged — history keys on titleDe', () => {
    expect(SPRECHEN_VORTRAGSTHEMEN).toHaveLength(60)
    expect(new Set(SPRECHEN_VORTRAGSTHEMEN.map(t => t.titleDe)).size).toBe(60)
  })
})
```

- [ ] **Step 2: Verify failure** — the current data trips several patterns.
- [ ] **Step 3: Reauthor** every `taskDe` the test flags (the review named: `vt-vorsorge-statt-nachsorge`, `vt-lesen-in-der-freizeit`, the psychische-Gesundheit theme, Grünflächen, Konsumverzicht, regional/saisonal, Podcasts, Zusammenhalt, plus `vt-stadt-land` and `vt-selbststaendig-oder-festangestellt` — but the test, not the list, is authoritative). Rules: keep `id`, `titleDe`, `tags` untouched; keep the `Halten Sie einen kurzen Vortrag darüber, ` prefix, no `?`, 60–220 chars; convert assertions to open framings (*„…darüber, warum regelmäßige Vorsorgeuntersuchungen so wichtig sind"* → *„…darüber, welche Rolle Vorsorgeuntersuchungen im Alltag der Menschen spielen."*; *„wo man heute besser lebt — in der Stadt oder auf dem Land"* → *„wie sich das Leben in der Stadt vom Leben auf dem Land unterscheidet."*). Every reworked task must still be fillable for all five Gliederungspunkte.
- [ ] **Step 4: Run** the whole data test file → PASS (the existing shape tests gate the rewrite).
- [ ] **Step 5: Report** every id you reworded, old → new.

---

### Task 4: Recognizer `onFinal` and the wall-clock limit (F1, F2 — the plumbing)

**Files:**
- Modify: `src/composables/useSpeechRecognizer.ts`
- Modify: `src/composables/useVortragTimer.ts`
- Test: `tests/composables/useSpeechRecognizer.test.ts` (create if absent — check `tests/composables/` first), `tests/composables/useVortragTimer.test.ts` (update)

**Interfaces:** produces `CommittedSpeech`, the optional `onFinal` second parameter, and `hardLimitReached({ wallSeconds, modality, hardLimit })`. **Additive only on the recognizer** — `Teil2Runner.vue` and `VerbSentenceRunner.vue` call `useSpeechRecognizer(lang)` with one argument and must not change; their tests are the gate.

- [ ] **Step 1: Failing tests.** For the recognizer, follow the existing mocking approach in this repo's speech tests (look at how `tests/` fakes the SR constructor; if no precedent exists, stub `window.SpeechRecognition` with a minimal fake class that lets the test fire `onresult` events). Cover: `onFinal` fires once per committed final with the ACCUMULATED `{ text, spans, restarts }`; it does not fire on interim results; a recognizer constructed without `onFinal` behaves exactly as before. For the timer, update the `hardLimitReached` block to the new input name and add:

```ts
it('fires on wall seconds — pausing the mic no longer pauses the exam', () => {
  expect(hardLimitReached({ wallSeconds: 239, modality: 'spoken', hardLimit: true })).toBe(false)
  expect(hardLimitReached({ wallSeconds: 240, modality: 'spoken', hardLimit: true })).toBe(true)
})
it('still returns false off-switch and off-modality', () => {
  expect(hardLimitReached({ wallSeconds: 999, modality: 'spoken', hardLimit: false })).toBe(false)
  expect(hardLimitReached({ wallSeconds: 999, modality: 'typed', hardLimit: true })).toBe(false)
})
```

- [ ] **Step 2: Verify failure.**
- [ ] **Step 3: Implement.** Recognizer: add the optional `onFinal` param; inside `onresult`, after a final is appended to the module buffer/spans, call `onFinal?.({ text: buffer, spans: [...spans], restarts })` in a try/catch (a listener throw must never kill recognition — comment this). Timer: rename the input field to `wallSeconds` and update the comment: the limit models an examiner's clock, which runs while you think; `VORTRAG_TARGET_SECONDS` unchanged. `redezeit()` is NOT touched — the bar keeps measuring speaking time as the content budget (F2).
- [ ] **Step 4: Run** your two test files **plus** `npx vitest run tests/modules/Teil2Setup.test.ts tests/modules/verbs tests/composables/useSpeechVoice.test.ts` → PASS (proves the additive claim). Runner tests will fail on the renamed timer input until T9 — expected, report.
- [ ] **Step 5: Report** the final signatures.

---

### Task 5: Partner — honest KI-Tipp, rotated Nachfrage (F7, F18-generator)

**Files:**
- Modify: `src/composables/useVortragPartner.ts`
- Test: `tests/composables/useVortragPartner.test.ts` (update + extend)

- [ ] **Step 1: Failing tests.** Update the KI-Tipp prompt tests: the prompt must NO LONGER assert unsaid points as fact — replace the old assertions with:

```ts
describe('buildVortragKiTippPrompt (F7)', () => {
  it('asks the model to judge coverage itself and labels the keyword signal unreliable', () => {
    const p = buildVortragKiTippPrompt(v)
    expect(p).toMatch(/beurteile selbst/i)
    expect(p).toMatch(/unzuverlässig/i)
    expect(p).not.toMatch(/Noch nicht angesprochene Gliederungspunkte:/)
  })
  it('carries the Redezeit state so the tip can be pacing advice', () => {
    const p = buildVortragKiTippPrompt({ ...v, rede: { ...v.rede, seconds: 190, wallSeconds: 230 } })
    expect(p).toMatch(/Redezeit|Gesamt/)
    expect(p).toContain('3:10')
  })
  it('still forbids a ready-made sentence', () => {
    expect(buildVortragKiTippPrompt(v)).toMatch(/KEINEN fertigen Satz/i)
  })
})

describe('Nachfrage rotation and validation (F18)', () => {
  it('rotates the question type deterministically per Vortrag', () => {
    const a = buildNachfragePrompt({ ...v, startedAt: 0 })
    const b = buildNachfragePrompt({ ...v, startedAt: 1 })
    const c = buildNachfragePrompt({ ...v, startedAt: 2 })
    const d = buildNachfragePrompt({ ...v, startedAt: 3 })
    expect(new Set([a, b, c, d]).size).toBe(4)
    expect(buildNachfragePrompt({ ...v, startedAt: 4 })).toBe(a)
  })
  it('rejects yes/no-shaped openers', () => {
    expect(validateNachfrage({ questionDe: 'Sind Sie sicher, dass das stimmt?' })).toBeNull()
    expect(validateNachfrage({ questionDe: 'Gibt es dafür Beispiele in Ihrem Land?' })).toBeNull()
    expect(validateNachfrage({ questionDe: 'Wer soll diese Ausfallzeit denn bezahlen?' })).not.toBeNull()
    expect(validateNachfrage({ questionDe: 'Wie würde das in Ihrem Heimatland funktionieren?' })).not.toBeNull()
  })
})
```

- [ ] **Step 2: Verify failure.**
- [ ] **Step 3: Implement.** KI-Tipp prompt rewrite: send the Rede tail (keep the 1200-char truncation), the five Gliederungspunkt labels, and the instruction *„Beurteile selbst anhand des Vortragstexts, welche Gliederungspunkte noch offen sind."*; append the keyword signals as *„Hinweis, unzuverlässig: folgende geplante Stichwörter sind noch nicht gefallen: …"* (or *„alle geplanten Stichwörter sind gefallen"*); append a Redezeit line built from `rede.seconds`/`rede.wallSeconds` when present (`m:ss` format, reuse a small local formatter); keep du-form, 1–2 sentences, `KEINEN fertigen Satz`, the `{"tippDe": …}` envelope. Nachfrage rotation: `const NACHFRAGE_TYPES = ['Vertiefung: frage nach der Begründung der schwächsten Aussage', 'Konkretes Beispiel: bitte um ein konkretes Beispiel zu einer allgemeinen Aussage', 'Gegenposition: konfrontiere höflich mit einem Gegenargument', 'Transfer: frage, wie es sich in einem anderen Land oder Bereich verhält']` (author the full German lines); pick `NACHFRAGE_TYPES[v.startedAt % 4]` and splice into the prompt. `validateNachfrage` additionally rejects questions whose first word (case-insensitive) is one of `sind|ist|war|waren|haben|hat|hatten|können|kann|könnten|würden|wären|sollte|sollten|müssen|muss|darf|dürfen|gibt|gab|finden|glauben|meinen|halten|stimmt|trifft|denken|sehen` — with the comment that W-questions are unaffected and this is a cheap shape check, not NLU.
- [ ] **Step 4: Run** the file's tests → PASS. Typecheck (transient wave-A errors possible).
- [ ] **Step 5: Report** the four rotation lines and the rejection list.

---

### Task 6: Grader — band anchors, consistency, SPRECHDATEN, Aufwertung dosing (F2-grader, F9, F21)

**Files:**
- Modify: `src/composables/useVortragGrader.ts`
- Test: `tests/composables/useVortragGrader.test.ts` (extend + update)

- [ ] **Step 1: Failing tests** — append/update:

```ts
describe('band anchors and consistency (F9)', () => {
  it('embeds four band anchors per criterion and the per-point deduction rule', () => {
    const { system } = buildVortragGraderPrompt(vortrag())
    expect(system).toMatch(/24–25|24-25/)
    expect(system).toMatch(/12–13|12-13/)
    expect(system).toMatch(/mindestens 4 Punkte Abzug/)
  })
  it('rejects a grade whose erfuellung contradicts its own coverage', () => {
    const p = goodPayload({
      coverage: GLIEDERUNGSPUNKTE.map((g, i) => ({ key: g.key, covered: i < 3, note: '' }))
    })
    ;(p.criteria as any)[0].score = 21
    expect(validateVortragGrade(p, vortrag())).toBeNull()
  })
  it('accepts low coverage when erfuellung is low too', () => {
    const p = goodPayload({
      coverage: GLIEDERUNGSPUNKTE.map((g, i) => ({ key: g.key, covered: i < 3, note: '' }))
    })
    ;(p.criteria as any)[0].score = 12
    expect(validateVortragGrade(p, vortrag())).not.toBeNull()
  })
})

describe('SPRECHDATEN wall clock (F2)', () => {
  it('reports Gesamtdauer and Pausenzeit when the wall clock exists', () => {
    const { user } = buildVortragGraderPrompt(vortrag({
      modality: 'spoken',
      rede: { textDe: REDE, seconds: 190, wallSeconds: 350, restarts: 2 }
    }))
    expect(user).toContain('Gesamtdauer 5:50')
    expect(user).toContain('Pausenzeit 2:40')
  })
})

describe('Aufwertung dosing (F21)', () => {
  it('drops an Aufwertung overlapping a mistake span', () => {
    const p = goodPayload({
      mistakes: [{ phase: 'rede', quote: 'Ausserdem', suggested: 'Außerdem', kind: 'spelling', reasonDe: 'x', reasonEn: 'y' }],
      aufwertungen: [{ quote: 'Ausserdem lernt man', better: 'Zudem erwirbt man', whyDe: 'a', whyEn: 'b' }]
    })
    const r = validateVortragGrade(p, vortrag())!
    expect(r.aufwertungen).toEqual([])
  })
  it('caps Aufwertungen at 2 when mistakes exceed 6', () => {
    const mistakes = Array.from({ length: 7 }, (_, i) => ({
      phase: 'rede', quote: REDE.split(' ')[i], suggested: 'x', kind: 'grammar', reasonDe: 'r', reasonEn: 'r'
    }))
    const aufw = Array.from({ length: 5 }, () => ({ quote: 'unverzichtbar', better: 'nicht wegzudenken', whyDe: 'a', whyEn: 'b' }))
    const r = validateVortragGrade(goodPayload({ mistakes, aufwertungen: aufw }), vortrag())!
    expect(r.aufwertungen.length).toBeLessThanOrEqual(2)
  })
})
```

(Adjust the overlap test's quotes so they genuinely anchor and overlap in `REDE` — the existing fixture text has `Ausserdem lernt man dabei viel`; verify before assuming.)

- [ ] **Step 2: Verify failure.**
- [ ] **Step 3: Implement.**
  - **Band anchors:** a module-local `const TEIL1_BAND_ANCHORS: Record<'erfuellung'|'kohaerenz'|'wortschatz'|'strukturen', string>` — one string each, four bands, in the register of the rubric descriptors. Exemplar for `erfuellung` (use verbatim, author the other three in the same shape): `'24–25: alle fünf Punkte tragen, Position klar begründet, Nachfrage inhaltlich beantwortet. 18–19: alle Punkte vorhanden, einer nur angetippt, Position erkennbar. 12–13: ein Punkt fehlt oder mehrere bleiben oberflächlich, Position behauptet statt begründet. 5–6: mehrere Punkte fehlen, kaum Bezug zum Aufgabenblatt.'` Embed each after its criterion's descriptor in the rubric block of the system prompt, plus the rule line *„Pro nicht behandeltem Gliederungspunkt mindestens 4 Punkte Abzug bei erfuellung."* Do **not** touch `src/data/rubrics.ts` — the anchors are grader-local by design (the shared `SprechenCriterion` type must not change).
  - **Consistency rule** in `validateVortragGrade`, after criteria and coverage are both validated: `const covered = coverage.filter(c => c.covered).length; if (covered <= 3 && erfuellungScore >= 20) return null` — with a comment naming F9 and the „2 von 5 neben 21/25" contradiction it prevents.
  - **SPRECHDATEN:** when spoken and `rede.wallSeconds` is present, add `Gesamtdauer m:ss` and `Pausenzeit m:ss` (= wall − spoken, floor 0) lines beside the existing Redezeit/wpm/Pausen lines; one prompt sentence telling the grader that Pausenzeit is thinking time the exam would not grant.
  - **Aufwertung dosing:** after anchoring, drop any Aufwertung whose `[spanStart, spanEnd)` intersects any mistake's span **in the same phase's text**; then cap at `mistakes.length > 6 ? 2 : AUFWERTUNG_CAP`. In the prompt, replace „genau bis zu 5" with „höchstens fünf".
  - **Stash:** add `downgradedAt?: number` to `Teil1ResultStash`.
- [ ] **Step 4: Run** grader tests + `tests/composables/useSprechenGrader.test.ts` (Teil 2 untouched) → PASS.
- [ ] **Step 5: Report** the four anchor strings and the validator rules added.

---

### Task 7: Setup — the gate and the Prüfungsmodus (F3, F15, F22-setup)

**Files:**
- Modify: `src/modules/sprechen/Teil1Setup.vue`
- Test: `tests/modules/Teil1Setup.test.ts` (extend)

Read `src/modules/sprechen/Teil2Setup.vue` first for the exact `canUseAi` gate pattern (persistent alert + CTA disabled + provider-aware wording) and copy its posture.

- [ ] **Step 1: Failing tests** covering: the CTA is disabled when `canUseAi` is false even with a sheet picked, and a persistent alert names the reason; the Prüfungsmodus control sets Hilfen aus / Checkliste aus / KI-Tipp aus / Zeitlimit hart / Vorbereitung 15 Min and shows the line *„Wie in der Prüfung: Aufgabenblatt, deine Notizen, vier Minuten — sonst nichts."*; after the preset the four switches remain individually visible and editable (flipping one afterwards works); in a typed run the preset still never renders the Zeitlimit field; the middle Füllbarkeits chip reads „drei Fachwörter?"; the resume banner renders **above** the sheets, which stay visible behind it; deleting a custom Vortragsthema that is currently drawn on a sheet redraws the pair.
- [ ] **Step 2: Verify failure.** — [ ] **Step 3: Implement.** The preset is a button row on the Prüfungskarte (not a fifth switch): clicking writes the four helps + prep into the existing reactive setup state and persists via the existing merge-write. `removeCustom` bumps the redraw seed when the deleted id is on either drawn sheet. Resume banner: move from the page-replacing `v-if` to an alert block above the content.
- [ ] **Step 4: Run + typecheck.** — [ ] **Step 5: Report.**

---

### Task 8: Prep — hygiene, frames, honest copy, reload-proof (F4-prep, F8, F10-UI, F11, F22-prep)

**Files:**
- Modify: `src/modules/sprechen/Teil1Prep.vue`
- Test: `tests/modules/Teil1Prep.test.ts` (extend + update)

- [ ] **Step 1: Failing tests** covering: typing a keyword that duplicates another shows the inline warning on both rows; a keyword that is a substring of another shows *„‚Sport' steckt in ‚Sportverein' — beide Häkchen leuchten zusammen"*-style copy (assert on a stable fragment, e.g. `steckt in`); a keyword under 4 chars warns; warnings never disable the CTA; tapping a Konnektor inserts its **frame** (assert the notes contain `Trotzdem ist …` after tapping `trotzdem`); the Konnektoren render grouped with their `stellungDe`; the prep tip contains `lass keinen Punkt weg` and no longer contains `vier ganze`; the Ausgrabung block has four questions ending with *„Und was zeigt das Beispiel?"*; editing a keyword then remounting the component (fresh `mount` after the stash write debounce) restores the keyword — plan/notes are debounced into the sessionStorage stash (~500 ms), so a reload keeps them.
- [ ] **Step 2: Verify failure.** — [ ] **Step 3: Implement.** Hygiene as a computed over the normalized keywords (same normalize semantics as `useVortragCoverage` — duplicate, substring either direction, `< 4` chars), rendered as a small warn line under the affected rows; never blocks. Konnektoren template switches to `group.konnektoren` / `k.wort` / inserts `k.frameDe`. Replace the tip copy with the spec's F8 text verbatim. Add the fourth question. Add `watch([plan, notes], …, { deep: true })` with a 500 ms debounce writing the merged stash; `go()` still writes synchronously before navigating.
- [ ] **Step 4: Run + typecheck** (the KONNEKTOREN shape error from wave A resolves here). — [ ] **Step 5: Report.**

---

### Task 9: Runner state machine (F1, F2, F4, F12, F13, F14)

**Files:**
- Modify: `src/modules/sprechen/Teil1Runner.vue`
- Test: `tests/modules/Teil1Runner.test.ts` (extend + update)

The largest task. Read the current runner in full first; every change below is surgical.

- [ ] **Step 1: Failing tests** covering, at minimum:
  - **F1:** constructing the recognizer passes an `onFinal` that persists — simulate a final via the mocked recognizer and assert `saveRede` was called with the committed text *before* any `end()`; unmounting mid-listen flushes rather than discarding (assert a final `saveRede` on unmount).
  - **F2:** the first mic open stamps `firstSpokenAt` (persisted); a 1 s ticking interval accumulates `wallSeconds` while the mic is **paused** too (advance fake timers with mic off, assert the persisted `wallSeconds` grows); the rail shows both `Redezeit` and `Gesamt`; the hard limit fires on `wallSeconds` (mic paused, wall past 4:00 → Nachfrage phase entered, text committed first); the mic hint in a hard-limit run says the clock keeps running (assert fragment `läuft weiter`).
  - **F4:** when the question arrives, `saveNachfrage` is called with the question and an empty answer; typing the answer debounces into `saveNachfrage`; mounting with an `in_progress` row carrying a `nachfrage` restores the phase and the answer, and `generateNachfrage` is NOT called again.
  - **F12:** `finishRede` double-click issues exactly one `generateNachfrage` call (synchronous latch); below 150 words a confirm is required (mock `window.confirm` → false keeps the Rede phase).
  - **F13:** simulated `not-allowed` calls `markDowngraded`, keeps `v.modality === 'spoken'`, switches the input surface to a textarea, renders a persistent alert (not only a toast), and the Run meta carries `sprechenDowngraded: true` and still `spokenSeconds`.
  - **F14:** a header „Vortrag verwerfen" exists in the Rede and Nachfrage phases, confirms, calls `abandonVortrag` and navigates to setup; the grade-failed screen offers it too; mounting on a `submitted` row shows an „Analyse starten" button and does NOT auto-call `gradeVortrag`; `fetchKiTipp` increments and logs before assigning the tip (assert on call order via a mock that throws on increment → tip must not render); the argument bank loads on the resume-into-grading path (mount with `submitted` row → bank fetch attempted).
- [ ] **Step 2: Verify failure.** — [ ] **Step 3: Implement**, keeping the grade pipeline order and `runRecorded` guard byte-for-byte:
  - Recognizer constructed with `onFinal: c => { /* merge base + c.text, persist via saveRede including seconds-so-far, spans, restarts */ }`.
  - Wall clock: on first mic open set `firstSpokenAt` if absent; a 1 s interval while `phase === 'rede'` and `firstSpokenAt` exists accumulates a local `wall` ref seeded from `v.rede.wallSeconds ?? 0` at mount, persisted (with the Rede) every 5 ticks and on every phase transition/unmount; `checkHardLimit` reads it. `onUnmounted`: if listening, best-effort `void recognizer.end().then(persist)`, else persist, then clear intervals.
  - Rail Redezeit block shows `Redezeit {spokenClock} · Gesamt {wallClock}` when spoken (`Gesamt` only once `firstSpokenAt` exists).
  - Mic-denied path: drain committed text (already persisted via onFinal), `markDowngraded(v.id)`, set a `downgraded` ref, render a persistent `alert-danger` naming what happened and that the run continues typed; keep modality untouched everywhere; Run meta gains `sprechenDowngraded: downgraded || !!v.downgradedAt`, and `spokenSeconds`/`sprechenWallSeconds` are written for spoken-origin runs regardless of downgrade. Stash gains `downgradedAt`.
  - Nachfrage persistence and restore exactly as F4 specifies; the „Ohne Nachfrage abgeben" escape stays.
  - `finishing` latch set synchronously at `finishRede` entry; `window.confirm` below 150 words with wording mirroring Teil 2's early-end warning.
  - Header exit + grade-failed exit; `submitted`-on-mount renders the retry screen with „Analyse starten" instead of auto-grading; move `loadBank()` so both paths reach it; reorder `fetchKiTipp`.
- [ ] **Step 4: Run** the runner tests + full suite. Expect T11's future assertions untouched; anything you had to change in existing tests, justify per the Global Constraints.
- [ ] **Step 5: Report** with the call-order proof for the pipeline (unchanged) and the new state fields.

---

### Task 10: Result — SPRECHDATEN, Konnektoren-Ausbeute, truthful protocol display (F6-display, F16, F19)

**Files:**
- Modify: `src/modules/sprechen/Teil1Result.vue`
- Test: `tests/modules/Teil1Result.test.ts` (extend)

- [ ] **Step 1: Failing tests** covering: a spoken stash renders a SPRECHDATEN strip with Redezeit, Gesamtdauer, Pausenzeit, Wörter/Min (against 90) and lange Pausen; a typed stash renders none of it; `kiTippCount` and the four help switches render (assert `1 KI-Tipp` and a fragment like `Hilfen an`); a stash with `downgradedAt` renders the one-sentence downgrade note and suppresses the „geschätzt, nicht gemessen" line; the Konnektoren-Ausbeute lists each Stellung group with its distinct-hit count and names a cold group (`nie`); the minute timeline never renders more buckets than the Rede's own span (stash with `startedAt`/`finishedAt` 3 minutes apart but one stray helpLog entry hours later → ≤ 4 buckets); a `'stuck'` helpLog entry renders as „Stockung erkannt", not as Rettungsleine.
- [ ] **Step 2: Verify failure.** — [ ] **Step 3: Implement.** SPRECHDATEN from `stash.rede` (`seconds`, `wallSeconds`, `restarts`) + word count — small local `clock()` formatter; wpm = words / (seconds/60), guard division. Konnektoren-Ausbeute: a computed over `KONNEKTOREN` matching each `k.wort` (normalized substring, reuse the local normalize the page already has or add one matching `useVortragCoverage`'s) against the Rede text; render per group `hit/total` with the words themselves dimmed/lit; cold group line: *„‚{labelDe}' — nie benutzt."* Help-kind label map gains `'stuck' → 'Stockung erkannt'`. Bound `helpByMinute` to `Math.ceil((finishedAt - startedAt) / 60000)` buckets, dropping entries outside. Downgrade note (German, one sentence: the mic failed mid-Rede, the run continued typed, the measured seconds are real).
- [ ] **Step 4: Run + typecheck.** — [ ] **Step 5: Report.**

---

### Task 11: Runner help surface (F5-insert, F6-logging, F17, F18-UI, F15-clock, F22-runner)

**Files:**
- Modify: `src/modules/sprechen/Teil1Runner.vue` (after T9 — wave C)
- Test: `tests/modules/Teil1Runner.test.ts` (extend + update)

- [ ] **Step 1: Failing tests** covering: tapping a phrase inserts the **full phrase with its placeholders** (assert the composer contains `Einerseits …, andererseits …` — update the old stub-insertion test); `speakPhrase` cancels before speaking and never passes a `…` to `voice.speak` (assert the argument matches `/^[^…]*$/` and contains a comma where the ellipsis was); the Rettungsleine block renders **above** the drawer (DOM order assertion) and has a speaker button; a stuck trigger logs `kind: 'stuck'` (never `'rettungsleine'`), at most twice per run, and visually raises the Rettungsleine (class assertion); interacting with the drawer (tab switch, Move change, phrase tap) resets the stuck timer (advance 15 s, interact, advance 15 s → no trigger); switching to a different tab logs `'drawer'` once and re-tapping the same tab logs nothing; changing the Move group logs `'drawer'`; the Nachfrage drawer's phrases have the 🔊 button; the strategy line *„Nimm die Frage erst in eigenen Worten auf"* renders above the answer composer; in the Nachfrage phase the Rede is collapsed behind a „Vortrag anzeigen" disclosure (question and composer visible without it); with `helps.checklist` false neither the header word/clock nor the composer word count renders; with `helps.hints` false the „Prüfungsbedingungen" reassurance line renders; the checklist rows are not `<button>`s; the Move nudge does not change within a 39-word growth but may at 40 (step function).
- [ ] **Step 2: Verify failure.** — [ ] **Step 3: Implement.** `insertPhrase` inserts `phraseDe` as-is (caret after insertion). `speakPhrase`: `voice.cancel(); void voice.speak(text.replace(/\s*…\s*/g, ', ').replace(/, $/, ''))` — keep the `logHelpAsync('vorsprechen')`. Move the Rettungsleine block above the drawer; add the 🔊; stuck trigger sets a `lifelineRaised` ref (class) and logs `'stuck'`, guarded by a `stuckCount < 2`; reset points as tested. Drawer logging per the tests. Nachfrage: 🔊 in its phrase list; the strategy line; wrap the Rede replay in a native `<details>` with the summary „Vortrag anzeigen" (styles inline/scoped, existing tokens only). Header stats and composer counter gated on `v.helps.checklist`. Reassurance line under the composer when hints are off: *„Prüfungsbedingungen — ohne Hilfsmittel."* Checklist rows to `<div>`. Nudge input quantized: `Math.floor(words / 40)` as the computed's driver.
- [ ] **Step 4: Run** runner tests + full suite + typecheck. — [ ] **Step 5: Report.**

---

### Task 12: Collocation diversity and the stale glossary line (F22-data)

**Files:**
- Modify: `src/data/sprechenArguments.ts`
- Modify: `CONTEXT.md` (one line)
- Test: existing `tests/composables/useSprechenArguments.test.ts` and `tests/data/sprechenArguments.test.ts` must pass unchanged

- [ ] **Step 1:** In CONTEXT.md's *Modality* entry, replace `words against 445 when typed` with `words against 360 when typed` (the 90 wpm rebase made 445 stale). Verify no other `445` remains: `grep -n "445" CONTEXT.md src/`.
- [ ] **Step 2:** In the ten `TAG_ARGUMENT_BANKS`, break the four shared frames: at most **three** of the ten banks may still open with a `Rolle spielen` variant, and no single collocation frame (`angewiesen sein`, `in Kauf nehmen`, `zur Verfügung`) may appear in more than four banks. Replace the surplus with field-specific B2 Wortverbindungen (genuine ones — e.g. Gesundheit: `einer Krankheit vorbeugen`; Arbeit: `eine Stelle antreten`; Medien: `eine Nachricht verbreiten`; Konsum: `auf etwas verzichten`), keeping 4–6 per bank and the `{de, en}` shape. The four `TOPIC_ARGUMENT_BANKS` may keep their entries.
- [ ] **Step 3:** Run `npx vitest run tests/composables/useSprechenArguments.test.ts tests/data` → PASS, `npm run typecheck` → clean.
- [ ] **Step 4:** Report the per-bank replacements.

---

## Release (controller only)

- [ ] `npm run typecheck` clean · `npm test` all green
- [ ] Changelog entry `1.17.01`, `kind: 'fix'`; `APP_VERSION` and `package.json` to `1.17.01`
- [ ] Merge to `main`, push, `npm run deploy`, verify gh-pages

## Self-Review

**Spec coverage:** F1→T4+T9 · F2→T1+T4+T6+T9+T10 · F3→T7 · F4→T9 (Nachfrage) + T8 (prep) · F5→T2 (needles) + T11 (insert) · F6→T1 (kind) + T9/T11 (logging) + T10 (display) · F7→T5 · F8→T8 · F9→T6 · F10→T2 (data) + T8 (UI) · F11→T8 · F12→T9 · F13→T1+T9+T10 · F14→T9 · F15→T7 (preset) + T11 (clock gating) · F16→T10 · F17→T11 · F18→T5 (generator) + T11 (UI) · F19→T10 · F20→T3 · F21→T6 · F22→T2/T7/T8/T10/T11/T12 per its sub-items. Deferred items are listed in the spec and have no task on purpose.

**Type consistency:** `HelpKind 'stuck'` (T1) consumed by T9/T10/T11; `RedeRecord.wallSeconds/firstSpokenAt` (T1) consumed by T4-tests, T6, T9, T10; `phraseNeedle`/`PhraseLike.needle` (T2) consumed by T2's own matcher change only; `KonnektorGroup.konnektoren[].frameDe` (T2) consumed by T8 and T10; `CommittedSpeech`/`onFinal` (T4) consumed by T9; `hardLimitReached({wallSeconds})` (T4) consumed by T9; `Teil1ResultStash.downgradedAt` (T6) written by T9, read by T10; `markDowngraded` (T1) called by T9; `sprechenDowngraded`/`sprechenWallSeconds` (T1) written by T9, asserted by T9's tests.
