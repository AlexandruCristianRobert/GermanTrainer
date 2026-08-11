# Phase 4 — Dativ Families VIII–X (T10–T13) + Cheatsheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Dativ module is completed: T10 *Freier Dativ* (family VIII), T11 *Satzübersetzung* — the module's ONLY AI drill (family IX, streamed per ADR-0004/0008, AI-graded with [Dative error tag]s, recorded per ADR-0010), T12 *Kein persönliches Passiv* and T13 *Reflexiver Dativ* (family X), plus card A `DativeCheatsheet.vue` — after which every one of the 14 catalogue cards resolves to a live route and the hub shows no "Bald" rows.

**Architecture:** Two new authored data files (`src/data/dativeFree.ts` for T10, `src/data/dativeConsequences.ts` for T12+T13) feed three deterministic pick drills through phase 3's shared `useDativeQuiz` engine — all three are **band-tracked only** (never `bumpDativeLedger`). T11 gets its own pure layer `useDativeSentenceQuiz.ts` (spec sampling → progressive generation → AI grading, mirroring `useDwSentenceQuiz.ts`), a weak-point layer `useDativeStats.ts` (100-run window per ADR-0002, mirroring `useDwSentenceStats.ts`), and a Setup/Runner pair mirroring the Direction Words `SentenceSetup.vue`/`SentenceRunner.vue` minus word hints. The cheatsheet is data-driven from the phase 1–3 banks (`DATIVE_VERBS`, `TWIN_PAIRS`, `OBJECT_ORDER_ITEMS` via `objectOrderAnswer`, `DATIVE_ADJECTIVES`) and cross-links out to Prepositions and Declension instead of re-teaching them. No `drillCatalogue.ts` changes: phase 2 registered all 14 cards up front; adding routes flips the hub's disabled "Bald" rows live via `router.hasRoute` (the staged-arrival pattern).

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Vitest + @vue/test-utils (jsdom), vue-tsc, `shuffle` (src/data/pool.ts), phase 2/3 pinned APIs (`useDativeQuiz`, `DativeQuizCard`, `bumpDativeLedger` — deliberately absent from T10/T12/T13), `planRampBatches`/`generateProgressively` (src/composables/useProgressiveGenerator.ts), `resolveAiClient` (src/composables/localClaude.ts), `saveQuizRun` (localStorage history).

## Global Constraints

- **Prerequisites (merged by phases 1–3 — consume, never re-create):** `src/data/dativeVerbs.ts` (`DATIVE_VERBS`, `DATIVE_VERB_KEYS`, `dativeVerbsBy`); `src/data/dativeAdjectives.ts` (`DATIVE_ADJECTIVES`, `DATIVE_ADJECTIVE_KEYS`); `src/composables/useDativeLedger.ts` (`bumpDativeLedger(item, correct, at)`, `LEDGER_KEY = 'gt:dativeLedger'`); `src/composables/useDativeDrill.ts` (`DATIVE_FAMILIES`, `FAMILY_LABELS`, `type DativeFamily`, `sampleDativeCards`, `gradeDativeAnswer`, and phase 3's `useDativeQuiz` + `interface DativeQuizCard`); `src/data/dativeExperiencer.ts` (`DATIVE_DRILL_LEVELS`, `type DativeDrillLevel`); `src/data/dativeTwins.ts` (`TWIN_PAIRS`); `src/data/dativeDitransitive.ts` (`OBJECT_ORDER_ITEMS`, `objectOrderAnswer`); the 13 `dat-*` `QuizHistoryType`s **and their label/order/stats/mastery registry entries** (all registered in phase 2 — `'dat-free'`, `'dat-sentence'`, `'dat-passive'`, `'dat-reflexive'` included); `DAT_FAMILIES` in `src/data/drillCatalogue.ts` **already contains families VIII/IX/X and Reference with cards T10–T13 + A and their final route names** (`dative-free`, `dative-sentence`, `dative-passive`, `dative-reflexive`, `dative-cheatsheet`) — this phase adds ONLY routes and components, never catalogue entries or history types.
- Branch `feat/phase4-dative-families-viii-x` off `main` (or continue on the controller's active dative integration branch if the controller says phases are landing serially on one branch); merge in the final controller step.
- Routes: paths `/dative/<slug>` + `/dative/<slug>/run`, names `dative-<slug>` + `dative-<slug>-run` (NavShell derives the active tab via `name.split('-')[0]`). This phase adds `dative-free`, `dative-sentence`, `dative-passive`, `dative-reflexive` (+ `-run` each) and the runnerless `dative-cheatsheet`, inserted in `src/router.ts` directly after the **last existing** `dative-*` route line (after `dative-adjectives-run` once phase 3 is merged; after `dative-trap-run` if executing before it — either way, keep the whole `dative-*` block contiguous).
- Breadcrumbs read `Kapitel XIII · Dativ · <drill>` (e.g. `Kapitel XIII · Dativ · Freier Dativ`).
- **Band-only rule (spec requirement, not a detail):** T10, T12, T13 are rule-driven and band-tracked ONLY. Their runners must **NOT** import or call `bumpDativeLedger` — free datives and the passive/reflexive consequences are not ledger items; only the ~44 dative verbs and the 16 dative adjectives are. Every T10/T12/T13 runner test asserts `expect(bumpDativeLedger).not.toHaveBeenCalled()`.
- **T11 ledger rule:** T11's drilled unit IS a ledger item (a `DATIVE_VERBS` key), and the [Item ledger]'s `gesichert` rule counts encounters "across any drill" (CONTEXT.md) — so `DativeSentenceRunner` bumps `bumpDativeLedger(spec.verb, correct, at)` once per generated card, **first (main) pass only**. The AI-drill family re-records retry passes as Runs (the `dw-sentence` precedent), so the ledger guard is a separate `ledgerBumped` flag that never resets on retry — a retry Run records, but never re-bumps.
- Recording: T10/T12/T13 main round records exactly once (`startedAtMs` + `historySaved` + `watch(finished)`, phase 3's SubjectRunner mechanics); their retry rounds and `total === 0` never record (ADR-0010). T11 follows the AI-family convention instead: `retryWrong()` resets `historySaved` so the retry pass records a second `dat-sentence` Run (deliberately different — matches `src/modules/direction-words/SentenceRunner.vue`).
- German content correctness is a shipping gate. Every item below is authored in full; transcribe exactly, do not improvise new sentences. Be exact about the two load-bearing rules: `Mir wird geholfen` / `Es wird mir geholfen` are correct and `*Ich werde geholfen` is the taught error; the ethicus free dative is near-particle and uses only *mir*/*dir*.
- AI prompts must spell out the full JSON envelope **in the prompt text itself** (the local-claude dev bridge drops `responseSchema`); keep the literal marker line `LEARNER'S GERMAN ANSWER:` in the grading prompt — runner tests key on it to tell grading calls from generation calls.
- Gates per task: focused `npx vitest run <files>` + `npm run typecheck` (vue-tsc — plain `tsc` floods with ~212 bogus `.vue` module errors and means nothing). The final task runs the full `npx vitest run --testTimeout=30000` (known ThemeToggle order-dependent flake: if it is the sole failure, rerun to confirm and proceed).
- Never touch `dist/` or `GermanVerbTester/`. Version bump + changelog are left to the controller at merge time (parallel phases decide the number).
- Commits end with: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

### Task 1: T10 item bank — `src/data/dativeFree.ts` + FREE-DATIVE GATE (spec gate 6)

**Files:**
- Create: `src/data/dativeFree.ts`
- Test: `tests/data/dativeFree.test.ts`

**Interfaces:**
- Consumes: `type DativeDrillLevel` from `src/data/dativeExperiencer.ts` (phase 3); `DATIVE_VERBS` from `src/data/dativeVerbs.ts` (phase 1, test only).
- Produces (Task 2 and the cheatsheet rely on these exact names): `type FreeDativeType = 'commodi' | 'possessivus' | 'ethicus'`, `FREE_TYPES: readonly FreeDativeType[]`, `FREE_TYPE_LABEL: Record<FreeDativeType, string>`, `interface FreeDativeItem`, `FREE_DATIVE_ITEMS` (24).

- [ ] **Step 1: Invariant tests FIRST.** Create `tests/data/dativeFree.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { FREE_TYPES, FREE_TYPE_LABEL, FREE_DATIVE_ITEMS } from '../../src/data/dativeFree'
import { DATIVE_DRILL_LEVELS } from '../../src/data/dativeExperiencer'
import { DATIVE_VERBS } from '../../src/data/dativeVerbs'

/** Two-sided word-boundary containment that respects umlauts (JS \b is ASCII-only). */
function containsWord(text: string, word: string): boolean {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-zäöüß])${esc}($|[^a-zäöüß])`, 'i').test(text)
}

describe('FREE_DATIVE_ITEMS (T10)', () => {
  test('base invariants: unique ids, known level, known kind, texts present', () => {
    expect(new Set(FREE_DATIVE_ITEMS.map(i => i.id)).size).toBe(FREE_DATIVE_ITEMS.length)
    const bad = FREE_DATIVE_ITEMS.filter(i =>
      !(DATIVE_DRILL_LEVELS as readonly string[]).includes(i.level)
      || !['drop', 'classify'].includes(i.kind)
      || i.translation.trim().length === 0
      || i.explanation.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('FREE-DATIVE GATE, half 1 (spec gate 6): every item is exactly one of the three readings', () => {
    const bad = FREE_DATIVE_ITEMS.filter(i => !FREE_TYPES.includes(i.type))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('FREE-DATIVE GATE, half 2 (spec gate 6): every item carries a real dative-verb-object counterexample', () => {
    const bad = FREE_DATIVE_ITEMS.filter(i =>
      !(i.counterVerb in DATIVE_VERBS)
      || !containsWord(i.counterSentence, i.counterDativePhrase)
      || i.counterSentence === i.freeSentence)
    expect(bad.map(i => `${i.id}:${i.counterVerb}`)).toEqual([])
  })

  test('DROP TEST: freeSentence carries the free dative; withoutDative genuinely drops it', () => {
    const bad = FREE_DATIVE_ITEMS.filter(i =>
      !containsWord(i.freeSentence, i.dativePhrase)
      || containsWord(i.withoutDative, i.dativePhrase)
      || i.withoutDative.trim().length === 0)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('prompt wiring: classify asks about the free sentence; drop cards point at the probed dative', () => {
    const bad = FREE_DATIVE_ITEMS.filter(i => {
      if (!containsWord(i.prompt, i.probePhrase)) return true
      if (i.kind === 'classify') {
        return i.prompt !== i.freeSentence
          || i.probePhrase !== i.dativePhrase
          || i.answers.length !== 1
          || i.answers[0] !== FREE_TYPE_LABEL[i.type]
          || new Set(i.options).size !== 3
          || !FREE_TYPES.every(t => i.options.includes(FREE_TYPE_LABEL[t]))
      }
      // kind 'drop'
      if (new Set(i.options).size !== 2
        || !i.options.includes('weglassbar') || !i.options.includes('obligatorisch')
        || i.answers.length !== 1) return true
      if (i.answers[0] === 'weglassbar') return i.prompt !== i.freeSentence || i.probePhrase !== i.dativePhrase
      if (i.answers[0] === 'obligatorisch') return i.prompt !== i.counterSentence || i.probePhrase !== i.counterDativePhrase
      return true
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('ethicus stays near-particle: its free dative is mir or dir', () => {
    const bad = FREE_DATIVE_ITEMS.filter(i =>
      i.type === 'ethicus' && !['mir', 'dir'].includes(i.dativePhrase.toLowerCase()))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥24 total, ≥6 per reading, ≥10 classify, ≥10 drop with ≥5 per drop answer', () => {
    expect(FREE_DATIVE_ITEMS.length).toBeGreaterThanOrEqual(24)
    for (const t of FREE_TYPES) {
      expect(FREE_DATIVE_ITEMS.filter(i => i.type === t).length, t).toBeGreaterThanOrEqual(6)
    }
    const drop = FREE_DATIVE_ITEMS.filter(i => i.kind === 'drop')
    expect(FREE_DATIVE_ITEMS.filter(i => i.kind === 'classify').length).toBeGreaterThanOrEqual(10)
    expect(drop.length).toBeGreaterThanOrEqual(10)
    // The DW T8 lesson: never one-button-winnable — both drop answers well represented.
    expect(drop.filter(i => i.answers[0] === 'weglassbar').length).toBeGreaterThanOrEqual(5)
    expect(drop.filter(i => i.answers[0] === 'obligatorisch').length).toBeGreaterThanOrEqual(5)
  })
})
```

- [ ] **Step 2: RED.** `npx vitest run tests/data/dativeFree.test.ts` — unresolvable module.

- [ ] **Step 3: Author the data.** Create `src/data/dativeFree.ts` with EXACTLY this content:

```ts
// Dativ module — family VIII item bank (T10 Freier Dativ).
// FREE-DATIVE GATE (tests/data/dativeFree.test.ts, spec gate 6): every item is
// classified as exactly ONE of commodi / possessivus / ethicus AND carries a
// real dative-VERB-object counterexample, because the drill's whole point is
// the distinguishing test: dropping a free dative leaves a grammatical
// sentence (withoutDative); dropping a dative verb's object does not
// (counterSentence). The ethicus is near-particle and uses only mir/dir.
// Band-tracked only — free datives are not ledger items (spec).

import type { DativeDrillLevel } from './dativeExperiencer'

export type FreeDativeType = 'commodi' | 'possessivus' | 'ethicus'
export const FREE_TYPES: readonly FreeDativeType[] = ['commodi', 'possessivus', 'ethicus']

/** Button labels for the classify cards — German handle + Latin term. */
export const FREE_TYPE_LABEL: Record<FreeDativeType, string> = {
  commodi: 'Vorteil (commodi)',
  possessivus: 'Besitz (possessivus)',
  ethicus: 'Anteilnahme (ethicus)',
}

export interface FreeDativeItem {
  id: string
  level: DativeDrillLevel
  /** The free-dative reading this item teaches — exactly one of the three. */
  type: FreeDativeType
  kind: 'drop' | 'classify'     // drop: weglassbar oder obligatorisch? | classify: which reading?
  /** The sentence shown on the card. classify + drop/weglassbar: === freeSentence; drop/obligatorisch: === counterSentence. */
  prompt: string
  /** The dative phrase the card's question asks about, exactly as it appears in `prompt`. */
  probePhrase: string
  options: string[]
  answers: string[]             // exactly 1
  /** The free-dative sentence and its drop-test rewrite (still grammatical). */
  freeSentence: string
  dativePhrase: string          // the free dative, exactly as in freeSentence
  withoutDative: string
  /** The obligatory counterpart: a DATIVE_VERBS key whose object cannot drop. */
  counterVerb: string
  counterSentence: string
  counterDativePhrase: string
  translation: string           // English of `prompt`
  explanation: string
}

export const FREE_DATIVE_ITEMS: FreeDativeItem[] = [
  // ── commodi — to whose benefit ──
  { id: 'fd-koffer', level: 'B2', type: 'commodi', kind: 'classify',
    prompt: 'Ich trage dir den Koffer zum Bahnhof.', probePhrase: 'dir',
    options: ['Vorteil (commodi)', 'Besitz (possessivus)', 'Anteilnahme (ethicus)'],
    answers: ['Vorteil (commodi)'],
    freeSentence: 'Ich trage dir den Koffer zum Bahnhof.', dativePhrase: 'dir',
    withoutDative: 'Ich trage den Koffer zum Bahnhof.',
    counterVerb: 'gehören', counterSentence: 'Der Koffer gehört meiner Kollegin.', counterDativePhrase: 'meiner Kollegin',
    translation: 'I will carry the suitcase to the station for you.',
    explanation: 'Freier Dativ (commodi): dir nennt den Nutznießer — reine Zugabe. Probe: „Ich trage den Koffer zum Bahnhof“ bleibt korrekt. Gegenprobe gehören: *„Der Koffer gehört“ — ein Dativverb gibt sein Objekt nicht her.' },
  { id: 'fd-tuer', level: 'B2', type: 'commodi', kind: 'classify',
    prompt: 'Er öffnet der alten Dame die Tür.', probePhrase: 'der alten Dame',
    options: ['Vorteil (commodi)', 'Besitz (possessivus)', 'Anteilnahme (ethicus)'],
    answers: ['Vorteil (commodi)'],
    freeSentence: 'Er öffnet der alten Dame die Tür.', dativePhrase: 'der alten Dame',
    withoutDative: 'Er öffnet die Tür.',
    counterVerb: 'ähneln', counterSentence: 'Die Dame ähnelt ihrer Schwester.', counterDativePhrase: 'ihrer Schwester',
    translation: 'He opens the door for the old lady.',
    explanation: 'commodi: der alten Dame sagt, wem zuliebe geöffnet wird. Ohne den Dativ („Er öffnet die Tür“) fehlt nichts. Bei ähneln dagegen ist der Dativ Objekt: *„Die Dame ähnelt“ geht nicht.' },
  { id: 'fd-suppe', level: 'B2', type: 'commodi', kind: 'drop',
    prompt: 'Sie kocht ihrem Mann eine Suppe.', probePhrase: 'ihrem Mann',
    options: ['weglassbar', 'obligatorisch'], answers: ['weglassbar'],
    freeSentence: 'Sie kocht ihrem Mann eine Suppe.', dativePhrase: 'ihrem Mann',
    withoutDative: 'Sie kocht eine Suppe.',
    counterVerb: 'entsprechen', counterSentence: 'Die Suppe entspricht dem Rezept.', counterDativePhrase: 'dem Rezept',
    translation: 'She is cooking a soup for her husband.',
    explanation: 'Weglassbar: „Sie kocht eine Suppe“ ist vollständig — ihrem Mann ist freier Dativ (commodi). Gegenprobe entsprechen: *„Die Suppe entspricht“ — dort ist der Dativ obligatorisch.' },
  { id: 'fd-platz', level: 'B2', type: 'commodi', kind: 'drop',
    prompt: 'Ich halte dir einen Platz frei.', probePhrase: 'dir',
    options: ['weglassbar', 'obligatorisch'], answers: ['weglassbar'],
    freeSentence: 'Ich halte dir einen Platz frei.', dativePhrase: 'dir',
    withoutDative: 'Ich halte einen Platz frei.',
    counterVerb: 'begegnen', counterSentence: 'Ich bin dir gestern im Kino begegnet.', counterDativePhrase: 'dir',
    translation: 'I will save a seat for you.',
    explanation: 'Weglassbar: „Ich halte einen Platz frei“ steht allein — dir ist Zugabe (commodi). Bei begegnen bleibt das Objekt Pflicht: *„Ich bin gestern begegnet“.' },
  { id: 'fd-gehoert', level: 'B2', type: 'commodi', kind: 'drop',
    prompt: 'Das Fahrrad gehört meiner Schwester.', probePhrase: 'meiner Schwester',
    options: ['weglassbar', 'obligatorisch'], answers: ['obligatorisch'],
    freeSentence: 'Ich repariere meiner Schwester das Fahrrad.', dativePhrase: 'meiner Schwester',
    withoutDative: 'Ich repariere das Fahrrad.',
    counterVerb: 'gehören', counterSentence: 'Das Fahrrad gehört meiner Schwester.', counterDativePhrase: 'meiner Schwester',
    translation: 'The bicycle belongs to my sister.',
    explanation: 'Obligatorisch: gehören verlangt seinen Dativ — *„Das Fahrrad gehört“ ist kein Satz. Der freie Dativ daneben: „Ich repariere (meiner Schwester) das Fahrrad“ — dort ist er weglassbar (commodi).' },
  { id: 'fd-entspricht', level: 'C1', type: 'commodi', kind: 'drop',
    prompt: 'Der Bericht entspricht den Tatsachen.', probePhrase: 'den Tatsachen',
    options: ['weglassbar', 'obligatorisch'], answers: ['obligatorisch'],
    freeSentence: 'Sie schreibt dem Chef den Bericht.', dativePhrase: 'dem Chef',
    withoutDative: 'Sie schreibt den Bericht.',
    counterVerb: 'entsprechen', counterSentence: 'Der Bericht entspricht den Tatsachen.', counterDativePhrase: 'den Tatsachen',
    translation: 'The report matches the facts.',
    explanation: 'Obligatorisch: *„Der Bericht entspricht“ bricht ab — den Tatsachen ist Objekt von entsprechen. Frei wäre der Dativ in „Sie schreibt (dem Chef) den Bericht“ (commodi).' },
  { id: 'fd-wagen', level: 'C1', type: 'commodi', kind: 'classify',
    prompt: 'Der Portier holt den Gästen den Wagen.', probePhrase: 'den Gästen',
    options: ['Vorteil (commodi)', 'Besitz (possessivus)', 'Anteilnahme (ethicus)'],
    answers: ['Vorteil (commodi)'],
    freeSentence: 'Der Portier holt den Gästen den Wagen.', dativePhrase: 'den Gästen',
    withoutDative: 'Der Portier holt den Wagen.',
    counterVerb: 'beistehen', counterSentence: 'Die Nachbarn stehen der Familie in der Krise bei.', counterDativePhrase: 'der Familie',
    translation: 'The doorman fetches the car for the guests.',
    explanation: 'commodi: den Gästen zuliebe wird geholt; „Der Portier holt den Wagen“ bleibt korrekt. Anders beistehen: das Dativobjekt (der Familie) ist Pflicht und kann nicht wegfallen.' },
  { id: 'fd-brief', level: 'B2', type: 'commodi', kind: 'classify',
    prompt: 'Kannst du mir den Brief einwerfen?', probePhrase: 'mir',
    options: ['Vorteil (commodi)', 'Besitz (possessivus)', 'Anteilnahme (ethicus)'],
    answers: ['Vorteil (commodi)'],
    freeSentence: 'Kannst du mir den Brief einwerfen?', dativePhrase: 'mir',
    withoutDative: 'Kannst du den Brief einwerfen?',
    counterVerb: 'ähneln', counterSentence: 'Du ähnelst deiner Mutter sehr.', counterDativePhrase: 'deiner Mutter',
    translation: 'Can you post the letter for me?',
    explanation: 'commodi: mir = für mich; „Kannst du den Brief einwerfen?“ funktioniert ohne. Gegenprobe ähneln: *„Du ähnelst“ — das Objekt ist zwingend.' },

  // ── possessivus (Pertinenzdativ) — an inalienable possessor ──
  { id: 'fd-haende', level: 'B2', type: 'possessivus', kind: 'classify',
    prompt: 'Wasch dir vor dem Essen die Hände!', probePhrase: 'dir',
    options: ['Vorteil (commodi)', 'Besitz (possessivus)', 'Anteilnahme (ethicus)'],
    answers: ['Besitz (possessivus)'],
    freeSentence: 'Wasch dir vor dem Essen die Hände!', dativePhrase: 'dir',
    withoutDative: 'Wasch vor dem Essen die Hände!',
    counterVerb: 'beitreten', counterSentence: 'Mein Bruder ist dem Sportverein beigetreten.', counterDativePhrase: 'dem Sportverein',
    translation: 'Wash your hands before dinner!',
    explanation: 'Pertinenzdativ (possessivus): dir markiert, WESSEN Hände — der Dativ ersetzt das Possessiv (nicht „deine Hände“). Probe: „Wasch vor dem Essen die Hände!“ bleibt korrekt. beitreten dagegen verlangt seinen Dativ: wem beigetreten wird, gehört zum Verb.' },
  { id: 'fd-schaedel', level: 'C1', type: 'possessivus', kind: 'classify',
    prompt: 'Mir brummt der Schädel.', probePhrase: 'Mir',
    options: ['Vorteil (commodi)', 'Besitz (possessivus)', 'Anteilnahme (ethicus)'],
    answers: ['Besitz (possessivus)'],
    freeSentence: 'Mir brummt der Schädel.', dativePhrase: 'Mir',
    withoutDative: 'Der Schädel brummt.',
    counterVerb: 'gehören', counterSentence: 'Der Hund gehört dem Nachbarn.', counterDativePhrase: 'dem Nachbarn',
    translation: 'My head is throbbing.',
    explanation: 'possessivus: Mir nennt den Besitzer des Schädels — Körperteile nehmen den Dativ statt des Possessivs. Probe: „Der Schädel brummt“ bleibt grammatisch. gehören dagegen verliert ohne Dativ den Satz: *„Der Hund gehört“.' },
  { id: 'fd-haare', level: 'B2', type: 'possessivus', kind: 'drop',
    prompt: 'Sie schneidet ihrem Sohn die Haare.', probePhrase: 'ihrem Sohn',
    options: ['weglassbar', 'obligatorisch'], answers: ['weglassbar'],
    freeSentence: 'Sie schneidet ihrem Sohn die Haare.', dativePhrase: 'ihrem Sohn',
    withoutDative: 'Sie schneidet die Haare.',
    counterVerb: 'ähneln', counterSentence: 'Ihr Sohn ähnelt seinem Vater.', counterDativePhrase: 'seinem Vater',
    translation: 'She is cutting her son\'s hair.',
    explanation: 'Weglassbar: „Sie schneidet die Haare“ steht — ihrem Sohn ist Pertinenzdativ (wessen Haare). Bei ähneln ist der Dativ Objekt: *„Ihr Sohn ähnelt“.' },
  { id: 'fd-kragen', level: 'C1', type: 'possessivus', kind: 'drop',
    prompt: 'Der Regen tropft mir in den Kragen.', probePhrase: 'mir',
    options: ['weglassbar', 'obligatorisch'], answers: ['weglassbar'],
    freeSentence: 'Der Regen tropft mir in den Kragen.', dativePhrase: 'mir',
    withoutDative: 'Der Regen tropft in den Kragen.',
    counterVerb: 'begegnen', counterSentence: 'Ich bin meinem Professor im Regen begegnet.', counterDativePhrase: 'meinem Professor',
    translation: 'The rain is dripping into my collar.',
    explanation: 'Weglassbar: „Der Regen tropft in den Kragen“ bleibt korrekt — mir sagt nur, wessen Kragen (possessivus). begegnen behält sein Objekt: *„Ich bin im Regen begegnet“.' },
  { id: 'fd-begegnet', level: 'B2', type: 'possessivus', kind: 'drop',
    prompt: 'Gestern ist sie einer alten Freundin begegnet.', probePhrase: 'einer alten Freundin',
    options: ['weglassbar', 'obligatorisch'], answers: ['obligatorisch'],
    freeSentence: 'Sie klopft der Freundin den Schnee vom Mantel.', dativePhrase: 'der Freundin',
    withoutDative: 'Sie klopft den Schnee vom Mantel.',
    counterVerb: 'begegnen', counterSentence: 'Gestern ist sie einer alten Freundin begegnet.', counterDativePhrase: 'einer alten Freundin',
    translation: 'Yesterday she ran into an old friend.',
    explanation: 'Obligatorisch: begegnen ohne Dativ bricht ab — *„Gestern ist sie begegnet“. Frei wäre der Dativ in „Sie klopft (der Freundin) den Schnee vom Mantel“ (possessivus: wessen Mantel).' },
  { id: 'fd-beitritt', level: 'C1', type: 'possessivus', kind: 'drop',
    prompt: 'Österreich ist der Europäischen Union 1995 beigetreten.', probePhrase: 'der Europäischen Union',
    options: ['weglassbar', 'obligatorisch'], answers: ['obligatorisch'],
    freeSentence: 'Die Mutter bindet dem Kind die Schuhe zu.', dativePhrase: 'dem Kind',
    withoutDative: 'Die Mutter bindet die Schuhe zu.',
    counterVerb: 'beitreten', counterSentence: 'Österreich ist der Europäischen Union 1995 beigetreten.', counterDativePhrase: 'der Europäischen Union',
    translation: 'Austria joined the European Union in 1995.',
    explanation: 'Obligatorisch: beitreten braucht den Dativ — wem beigetreten wird, gehört zum Verb. Frei dagegen: „Die Mutter bindet (dem Kind) die Schuhe zu“ — possessivus, weglassbar.' },
  { id: 'fd-zaehne', level: 'B2', type: 'possessivus', kind: 'classify',
    prompt: 'Putz dir die Zähne!', probePhrase: 'dir',
    options: ['Vorteil (commodi)', 'Besitz (possessivus)', 'Anteilnahme (ethicus)'],
    answers: ['Besitz (possessivus)'],
    freeSentence: 'Putz dir die Zähne!', dativePhrase: 'dir',
    withoutDative: 'Putz die Zähne!',
    counterVerb: 'gehören', counterSentence: 'Die Zahnbürste gehört deinem Bruder.', counterDativePhrase: 'deinem Bruder',
    translation: 'Brush your teeth!',
    explanation: 'possessivus: dir = deine Zähne; der Dativ ersetzt das Possessiv bei Körperpflege. „Putz die Zähne!“ bleibt korrekt. gehören gibt sein Objekt nicht her: *„Die Zahnbürste gehört“.' },
  { id: 'fd-traenen', level: 'C1', type: 'possessivus', kind: 'classify',
    prompt: 'Dem Kind laufen die Tränen übers Gesicht.', probePhrase: 'Dem Kind',
    options: ['Vorteil (commodi)', 'Besitz (possessivus)', 'Anteilnahme (ethicus)'],
    answers: ['Besitz (possessivus)'],
    freeSentence: 'Dem Kind laufen die Tränen übers Gesicht.', dativePhrase: 'Dem Kind',
    withoutDative: 'Die Tränen laufen übers Gesicht.',
    counterVerb: 'entsprechen', counterSentence: 'Das Ergebnis entspricht den Erwartungen.', counterDativePhrase: 'den Erwartungen',
    translation: 'Tears are running down the child\'s face.',
    explanation: 'possessivus: Dem Kind nennt den Besitzer der Tränen — Subjekt sind die Tränen. Probe: „Die Tränen laufen übers Gesicht“ steht allein. entsprechen dagegen: *„Das Ergebnis entspricht“.' },

  // ── ethicus — an emotionally involved non-participant; near-particle, only mir/dir ──
  { id: 'fd-vorsichtig', level: 'C1', type: 'ethicus', kind: 'classify',
    prompt: 'Sei mir bloß vorsichtig auf der Leiter!', probePhrase: 'mir',
    options: ['Vorteil (commodi)', 'Besitz (possessivus)', 'Anteilnahme (ethicus)'],
    answers: ['Anteilnahme (ethicus)'],
    freeSentence: 'Sei mir bloß vorsichtig auf der Leiter!', dativePhrase: 'mir',
    withoutDative: 'Sei bloß vorsichtig auf der Leiter!',
    counterVerb: 'gehören', counterSentence: 'Die Leiter gehört dem Hausmeister.', counterDativePhrase: 'dem Hausmeister',
    translation: 'Do be careful on that ladder — I mean it!',
    explanation: 'Dativus ethicus: mir drückt nur die Anteilnahme des Sprechers aus — fast eine Partikel, fast immer mir/dir. Probe: „Sei bloß vorsichtig auf der Leiter!“ bleibt unverändert korrekt. gehören dagegen behält sein Objekt: *„Die Leiter gehört“.' },
  { id: 'fd-krank', level: 'C1', type: 'ethicus', kind: 'classify',
    prompt: 'Werd mir bloß nicht krank!', probePhrase: 'mir',
    options: ['Vorteil (commodi)', 'Besitz (possessivus)', 'Anteilnahme (ethicus)'],
    answers: ['Anteilnahme (ethicus)'],
    freeSentence: 'Werd mir bloß nicht krank!', dativePhrase: 'mir',
    withoutDative: 'Werd bloß nicht krank!',
    counterVerb: 'ähneln', counterSentence: 'Du ähnelst deinem Großvater immer mehr.', counterDativePhrase: 'deinem Großvater',
    translation: 'Do not go getting sick on me!',
    explanation: 'ethicus: mir heißt „ich bin emotional beteiligt“, nicht Empfänger und nicht Besitzer. „Werd bloß nicht krank!“ bleibt korrekt. Gegenprobe ähneln: dort ist der Dativ Objekt und muss bleiben.' },
  { id: 'fd-puenktlich', level: 'C1', type: 'ethicus', kind: 'classify',
    prompt: 'Dass ihr mir ja pünktlich seid!', probePhrase: 'mir',
    options: ['Vorteil (commodi)', 'Besitz (possessivus)', 'Anteilnahme (ethicus)'],
    answers: ['Anteilnahme (ethicus)'],
    freeSentence: 'Dass ihr mir ja pünktlich seid!', dativePhrase: 'mir',
    withoutDative: 'Dass ihr ja pünktlich seid!',
    counterVerb: 'beitreten', counterSentence: 'Ihr seid dem Chor im Herbst beigetreten.', counterDativePhrase: 'dem Chor',
    translation: 'You had better be on time — I am warning you!',
    explanation: 'ethicus: das mir gehört dem mahnenden Sprecher — fast eine Partikel, nur mir/dir möglich. „Dass ihr ja pünktlich seid!“ steht ohne. beitreten braucht seinen Dativ dagegen zwingend.' },
  { id: 'fd-hinfallen', level: 'C1', type: 'ethicus', kind: 'drop',
    prompt: 'Fall mir nicht hin!', probePhrase: 'mir',
    options: ['weglassbar', 'obligatorisch'], answers: ['weglassbar'],
    freeSentence: 'Fall mir nicht hin!', dativePhrase: 'mir',
    withoutDative: 'Fall nicht hin!',
    counterVerb: 'begegnen', counterSentence: 'Auf der Treppe bin ich dem Nachbarn begegnet.', counterDativePhrase: 'dem Nachbarn',
    translation: 'Do not fall over — I am telling you!',
    explanation: 'Weglassbar: „Fall nicht hin!“ ist vollständig — mir ist reiner Anteilnahme-Dativ (ethicus). begegnen verliert ohne Dativ den Satz: *„Auf der Treppe bin ich begegnet“.' },
  { id: 'fd-dummheiten', level: 'C1', type: 'ethicus', kind: 'drop',
    prompt: 'Mach mir keine Dummheiten im Urlaub!', probePhrase: 'mir',
    options: ['weglassbar', 'obligatorisch'], answers: ['weglassbar'],
    freeSentence: 'Mach mir keine Dummheiten im Urlaub!', dativePhrase: 'mir',
    withoutDative: 'Mach keine Dummheiten im Urlaub!',
    counterVerb: 'beistehen', counterSentence: 'Im Notfall stehen dir deine Freunde bei.', counterDativePhrase: 'dir',
    translation: 'No silly business on holiday, you hear!',
    explanation: 'Weglassbar: „Mach keine Dummheiten im Urlaub!“ — mir zeigt nur die emotionale Beteiligung (ethicus). beistehen dagegen: das Dativobjekt ist Pflicht.' },
  { id: 'fd-aehnelt', level: 'C1', type: 'ethicus', kind: 'drop',
    prompt: 'Das Mädchen ähnelt seiner Großmutter.', probePhrase: 'seiner Großmutter',
    options: ['weglassbar', 'obligatorisch'], answers: ['obligatorisch'],
    freeSentence: 'Bleib mir gesund!', dativePhrase: 'mir',
    withoutDative: 'Bleib gesund!',
    counterVerb: 'ähneln', counterSentence: 'Das Mädchen ähnelt seiner Großmutter.', counterDativePhrase: 'seiner Großmutter',
    translation: 'The girl resembles her grandmother.',
    explanation: 'Obligatorisch: *„Das Mädchen ähnelt“ bricht ab — seiner Großmutter ist Objekt von ähneln. Der freie Gegenpol: „Bleib (mir) gesund!“ — ethicus, weglassbar.' },
  { id: 'fd-beisteht', level: 'C1', type: 'ethicus', kind: 'drop',
    prompt: 'Die Anwältin steht ihrer Mandantin vor Gericht bei.', probePhrase: 'ihrer Mandantin',
    options: ['weglassbar', 'obligatorisch'], answers: ['obligatorisch'],
    freeSentence: 'Verlauf dich mir nicht in der Altstadt!', dativePhrase: 'mir',
    withoutDative: 'Verlauf dich nicht in der Altstadt!',
    counterVerb: 'beistehen', counterSentence: 'Die Anwältin steht ihrer Mandantin vor Gericht bei.', counterDativePhrase: 'ihrer Mandantin',
    translation: 'The lawyer stands by her client in court.',
    explanation: 'Obligatorisch: beistehen verlangt, WEM beigestanden wird — ihrer Mandantin bleibt. Frei wäre: „Verlauf dich (mir) nicht in der Altstadt!“ — ethicus, nur Anteilnahme.' },
  { id: 'fd-spaet', level: 'C1', type: 'ethicus', kind: 'classify',
    prompt: 'Komm mir nicht wieder zu spät nach Hause!', probePhrase: 'mir',
    options: ['Vorteil (commodi)', 'Besitz (possessivus)', 'Anteilnahme (ethicus)'],
    answers: ['Anteilnahme (ethicus)'],
    freeSentence: 'Komm mir nicht wieder zu spät nach Hause!', dativePhrase: 'mir',
    withoutDative: 'Komm nicht wieder zu spät nach Hause!',
    counterVerb: 'entsprechen', counterSentence: 'Das entspricht nicht unserer Abmachung.', counterDativePhrase: 'unserer Abmachung',
    translation: 'Do not come home late again — I mean it!',
    explanation: 'ethicus: mir = „ich sage dir das mit Nachdruck“ — kein Empfänger, keine Besitzangabe. „Komm nicht wieder zu spät nach Hause!“ bleibt korrekt. entsprechen dagegen führt seinen Dativ als Objekt.' },
]
```

- [ ] **Step 4: GREEN.** `npx vitest run tests/data/dativeFree.test.ts` → PASS. Any failure lists offending ids — fix the item, never the test. If the counterexample gate reports a `counterVerb` missing from `DATIVE_VERBS`, STOP and report (phase 1 owns that table; all six used here — gehören, ähneln, entsprechen, begegnen, beitreten, beistehen — are in its 44 keys).
- [ ] **Step 5: Typecheck.** `npm run typecheck` → PASS.
- [ ] **Step 6: Commit** `feat(dative): family VIII free-dative bank (24 items) with gate 6`

---
### Task 2: T10 drill — Freier Dativ (`dat-free`)

**Files:**
- Modify: `src/composables/useDativeDrill.ts` (append builder + filter), `src/router.ts` (2 routes)
- Create: `src/modules/dative/FreeSetup.vue`, `src/modules/dative/FreeRunner.vue`
- Test: `tests/modules/dative/FreeRunner.test.ts`

**Interfaces:**
- Consumes: `FREE_DATIVE_ITEMS`, `FREE_TYPE_LABEL`, `type FreeDativeItem` (Task 1); `useDativeQuiz`, `DativeQuizCard` (phase 3); `DATIVE_DRILL_LEVELS`, `type DativeDrillLevel` (phase 3); `shuffle` (src/data/pool.ts); `saveQuizRun`; `csv` (src/composables/quizQuery.ts).
- Produces: routes `dative-free` / `dative-free-run`; records type `'dat-free'`; `buildFreeCards(items: FreeDativeItem[]): DativeQuizCard[]` and `filterFreeItems(f: { levels: DativeDrillLevel[]; kinds: string[] }): FreeDativeItem[]` in `useDativeDrill.ts`.
- **Band-tracked ONLY: this runner must NOT import or call `bumpDativeLedger`** — free datives are not ledger items (spec).

- [ ] **Step 1: Failing runner test.** Create `tests/modules/dative/FreeRunner.test.ts` — the exact skeleton of phase 3's `tests/modules/dative/SubjectRunner.test.ts` (memory router, `Math.random` pinned to 0, the three mocks incl. the ledger mock), with these deltas:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import FreeRunner from '../../../src/modules/dative/FreeRunner.vue'
import { FREE_DATIVE_ITEMS } from '../../../src/data/dativeFree'

vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))
vi.mock('../../../src/composables/useQuizHistory', () => ({ saveQuizRun: vi.fn() }))
vi.mock('../../../src/composables/useDativeLedger', () => ({ bumpDativeLedger: vi.fn() }))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'
import { bumpDativeLedger } from '../../../src/composables/useDativeLedger'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dative/free/run', name: 'dative-free-run', component: { template: '<div />' } },
      { path: '/dative/free', name: 'dative-free', component: { template: '<div />' } },
      { path: '/dative', name: 'dative', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string>) {
  const router = makeRouter()
  await router.push({ name: 'dative-free-run', query })
  const wrapper = mount(FreeRunner, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

const QUERY = { count: '1', levels: 'A2,B1,B2,C1', kinds: 'drop,classify' }
// Math.random pinned to 0 → identity-preserving shuffle → the sampled item is
// the bank's first entry under these filters (fd-koffer, a classify card).
const FIRST = FREE_DATIVE_ITEMS[0]
const WRONG = FIRST.options.find(o => !FIRST.answers.includes(o))!

describe('FreeRunner', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.mocked(saveQuizRun).mockClear()
    vi.mocked(bumpDativeLedger).mockClear()
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => { randomSpy.mockRestore() })

  async function completeOneCardWrong(wrapper: VueWrapper) {
    const btn = wrapper.findAll('.choice').find(b => b.find('.c-label').text() === WRONG)!
    await btn.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))!
    await finish.trigger('click')
  }

  it('renders the prompt with its question suffix and three classify choices', async () => {
    const { wrapper } = await mountRunner(QUERY)
    expect(wrapper.text()).toContain('Welche Lesart')
    expect(wrapper.findAll('.choice').length).toBe(3)
    wrapper.unmount()
  })

  it('wrong pick reveals the correct reading and the explanation with the counterexample', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const btn = wrapper.findAll('.choice').find(b => b.find('.c-label').text() === WRONG)!
    await btn.trigger('click')
    expect(wrapper.find('.drill-feedback').exists()).toBe(true)
    expect(wrapper.text()).toContain(FIRST.answers[0])
    expect(wrapper.text()).toContain(FIRST.explanation)
    wrapper.unmount()
  })

  it('records one dat-free Run and NEVER touches the ledger (band-tracked only)', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({ type: 'dat-free', count: 1 }))
    expect(bumpDativeLedger).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('does not record the retry round (ADR-0010)', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    const retry = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))!
    await retry.trigger('click')
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(bumpDativeLedger).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
```

- [ ] **Step 2: RED.** `npx vitest run tests/modules/dative/FreeRunner.test.ts` — unresolvable component.

- [ ] **Step 3: Builder + filter.** Append to `src/composables/useDativeDrill.ts` (add the import `import { FREE_DATIVE_ITEMS, type FreeDativeItem } from '../data/dativeFree'`; `DativeDrillLevel` is already imported by phase 3):

```ts
export function buildFreeCards(items: FreeDativeItem[]): DativeQuizCard[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.kind === 'drop'
      ? `${item.prompt} — Ist „${item.probePhrase}“ weglassbar?`
      : `${item.prompt} — Welche Lesart hat „${item.probePhrase}“?`,
    answers: item.answers,
    options: item.options,
    translation: item.translation,
    note: item.explanation,
    ledgerKey: null,   // rule-driven family: band-tracked only, never in the ledger
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function filterFreeItems(f: { levels: DativeDrillLevel[]; kinds: string[] }): FreeDativeItem[] {
  return FREE_DATIVE_ITEMS.filter(i => f.levels.includes(i.level) && f.kinds.includes(i.kind))
}
```

- [ ] **Step 4: Setup.** Create `src/modules/dative/FreeSetup.vue` — copy `src/modules/dative/SubjectSetup.vue` (phase 3; read it first, keep its `load`/`save`/`toggle`/preset skeleton verbatim) and change exactly:
  - `const STORAGE_KEY = 'datFreeSetup'`; import `filterFreeItems` from `../../composables/useDativeDrill` (drop the subject-drill imports).
  - State: `levels = ref<DativeDrillLevel[]>(['B2', 'C1'])` (the bank is B2/C1), `kinds = ref<string[]>(['drop', 'classify'])`.
  - Kind chips: `drop` → label `Weglassbar?`, `classify` → label `Welche Lesart?` (chip row titled `Aufgabe · {{ kinds.length }} of 2`).
  - `availableItems = computed(() => filterFreeItems({ levels: levels.value, kinds: kinds.value }).length)`; keep the warning alert + disabled start when 0.
  - Header: breadcrumb `Kapitel XIII · Dativ · Freier Dativ`, title `Freier Dativ<em>.</em>`, subtitle: `Ich trage dir den Koffer — drop the dative and the sentence survives; drop a dative verb's object and it collapses. Benefit, possession, or pure emotion: learn the three free readings and the test that separates them from real objects.`
  - `start()` → `router.push({ name: 'dative-free-run', query: { count: String(effectiveCount.value), levels: levels.value.join(','), kinds: kinds.value.join(',') } })`. Back button → `router.push({ name: 'dative' })`.

- [ ] **Step 5: Runner.** Create `src/modules/dative/FreeRunner.vue` — copy `src/modules/dative/SubjectRunner.vue` (phase 3) and change exactly:
  - Imports: `filterFreeItems`, `buildFreeCards`, `type FreeDativeItem` instead of the subject-drill trio. **Delete the `bumpDativeLedger` import** — this runner never touches the ledger.
  - `const items = ref<FreeDativeItem[]>([])`; mount parses `count`, `levels` (csv against `DATIVE_DRILL_LEVELS`), `kinds` (`csv<string>(route.query.kinds, ['drop', 'classify'] as const)`); `items.value = shuffle(filterFreeItems({ levels, kinds }), count)`; `quiz.value = useDativeQuiz(buildFreeCards(items.value))`.
  - Choice buttons: classify cards carry THREE options — extend SubjectRunner's two-button keyboard handler to number keys 1–N over `current.options` (loop `current.options.length`, not a hard-coded 2).
  - Feedback: `✓ Richtig — <answers[0]>` / `✗ Korrekt: <answers[0]>`; always show `current.translation` (italic) and `current.note` (the explanation carries the drop test and the counterexample — no extra template work needed).
  - `recordRun()` — replace the whole body with the band-only variant (NO ledger loop):

```ts
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  // Band-tracked only (spec): free datives are rule-driven — no ledger bump.
  saveQuizRun({
    type: 'dat-free',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: { levels: queriedLevels.value, kinds: queriedKinds.value },
  })
}
```

  - All `dative-subject` route pushes become `dative-free`; breadcrumb `Kapitel XIII · Dativ · Freier Dativ`; summary breadcrumb `Auswertung · Freier Dativ`. Retry rebuilds via `buildFreeCards` from `wrongIndexes.map(i => items.value[i])` shuffled; `RetryModal` `item-label="cards"`.

- [ ] **Step 6: Routes.** In `src/router.ts`, directly after the last `dative-*` route line:

```ts
  { path: '/dative/free', name: 'dative-free', component: () => import('./modules/dative/FreeSetup.vue') },
  { path: '/dative/free/run', name: 'dative-free-run', component: () => import('./modules/dative/FreeRunner.vue') },
```

No catalogue change: `DAT_FAMILIES` already carries family VIII with card T10 → route `dative-free` (phase 2). Verify with `grep -n "dative-free" src/data/drillCatalogue.ts` — if it is somehow absent, STOP and report (phase 2 gap).

- [ ] **Step 7: GREEN.** `npx vitest run tests/modules/dative/FreeRunner.test.ts tests/data/drillCatalogue.test.ts` → PASS; `npm run typecheck` → PASS.
- [ ] **Step 8: Commit** `feat(dative): T10 Freier Dativ drill (family VIII, band-tracked only)`

---

### Task 3: Item banks for T12/T13 — `src/data/dativeConsequences.ts` + gates

**Files:**
- Create: `src/data/dativeConsequences.ts`
- Test: `tests/data/dativeConsequences.test.ts`

**Interfaces:**
- Consumes: `type DativeDrillLevel` (phase 3); `DATIVE_VERBS` (phase 1) and `VERBS` (test only).
- Produces (Tasks 4–5 rely on these exact names): `interface PassiveItem`, `PASSIVE_ITEMS` (24), `interface ReflexiveItem`, `REFLEXIVE_ITEMS` (23), `REFLEXIVE_CONTRAST_VERBS`.

- [ ] **Step 1: Invariant tests FIRST.** Create `tests/data/dativeConsequences.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { PASSIVE_ITEMS, REFLEXIVE_ITEMS, REFLEXIVE_CONTRAST_VERBS } from '../../src/data/dativeConsequences'
import { DATIVE_DRILL_LEVELS } from '../../src/data/dativeExperiencer'
import { DATIVE_VERBS } from '../../src/data/dativeVerbs'
import { VERBS } from '../../src/data/verbs'

const byGerman = new Map(VERBS.map(v => [v.german, v]))

function containsWord(text: string, word: string): boolean {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-zäöüß])${esc}($|[^a-zäöüß])`, 'i').test(text)
}

function baseChecks(items: { id: string; level: string; translation: string; explanation: string }[]) {
  expect(new Set(items.map(i => i.id)).size).toBe(items.length)
  const bad = items.filter(i =>
    !(DATIVE_DRILL_LEVELS as readonly string[]).includes(i.level)
    || i.translation.trim().length === 0
    || i.explanation.trim().length === 0)
  expect(bad.map(i => i.id)).toEqual([])
}

describe('PASSIVE_ITEMS (T12)', () => {
  test('base invariants', () => baseChecks(PASSIVE_ITEMS))

  test('cross-ref: dative items name DATIVE_VERBS keys; accusative contrast items are accusative in VERBS and agreement-kind only', () => {
    const bad = PASSIVE_ITEMS.filter(i => i.verbCase === 'dative'
      ? !(i.verb in DATIVE_VERBS)
      : byGerman.get(i.verb)?.case !== 'accusative' || i.kind !== 'agreement')
    expect(bad.map(i => `${i.id}:${i.verb}`)).toEqual([])
  })

  test('options: 2 unique, exactly one is the answer', () => {
    const bad = PASSIVE_ITEMS.filter(i =>
      i.options.length !== 2 || new Set(i.options).size !== 2
      || i.answers.length !== 1 || i.options.filter(o => i.answers.includes(o)).length !== 1)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('TRANSFORM GATE: the prompt shows the active sentence + question; the correct passive is impersonal (wird, never werden)', () => {
    const bad = PASSIVE_ITEMS.filter(i => i.kind === 'transform' && (
      !i.prompt.endsWith(' — Wie lautet das Passiv?')
      || i.prompt.includes('___')
      || !containsWord(i.answers[0], 'wird')
      || containsWord(i.answers[0], 'werden')))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('AGREEMENT GATE: one gap, options exactly wird/werden; dative → wird (verb frozen 3sg), accusative contrast → werden', () => {
    const bad = PASSIVE_ITEMS.filter(i => {
      if (i.kind !== 'agreement') return false
      const optSet = new Set(i.options)
      if ((i.prompt.match(/___/g) ?? []).length !== 1) return true
      if (optSet.size !== 2 || !optSet.has('wird') || !optSet.has('werden')) return true
      return i.verbCase === 'dative' ? i.answers[0] !== 'wird' : i.answers[0] !== 'werden'
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('ES GATE: es is a pure position-1 placeholder — es-first keeps it up front, fronted drops it', () => {
    const bad = PASSIVE_ITEMS.filter(i => {
      if (i.kind !== 'es') return false
      if (i.prompt !== 'Welcher Satz ist richtig?') return true
      const wrong = i.options.find(o => !i.answers.includes(o))
      if (!wrong) return true
      if (i.esPattern === 'es-first') return !i.answers[0].startsWith('Es wird') || wrong.startsWith('Es')
      if (i.esPattern === 'fronted') return containsWord(i.answers[0], 'es') || !containsWord(wrong, 'es')
      return true
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥8 transform, ≥8 agreement (both cases present — never one-button-winnable), ≥6 es (both patterns)', () => {
    expect(PASSIVE_ITEMS.filter(i => i.kind === 'transform').length).toBeGreaterThanOrEqual(8)
    const agr = PASSIVE_ITEMS.filter(i => i.kind === 'agreement')
    expect(agr.length).toBeGreaterThanOrEqual(8)
    expect(agr.filter(i => i.verbCase === 'dative').length).toBeGreaterThanOrEqual(5)
    expect(agr.filter(i => i.verbCase === 'accusative').length).toBeGreaterThanOrEqual(3)
    const es = PASSIVE_ITEMS.filter(i => i.kind === 'es')
    expect(es.length).toBeGreaterThanOrEqual(6)
    expect(es.filter(i => i.esPattern === 'es-first').length).toBeGreaterThanOrEqual(2)
    expect(es.filter(i => i.esPattern === 'fronted').length).toBeGreaterThanOrEqual(2)
  })
})

describe('REFLEXIVE_ITEMS (T13)', () => {
  test('base invariants', () => baseChecks(REFLEXIVE_ITEMS))

  test('REFLEXIVE GATE: dative kind proves its accusative object sits in the prompt; accusative kind has none', () => {
    const bad = REFLEXIVE_ITEMS.filter(i => i.kind === 'dative'
      ? !i.accObject || !containsWord(i.prompt, i.accObject)
      : i.accObject !== undefined)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('pronoun wiring: one gap; options are the person-matched mir/mich or dir/dich pair; answer case matches kind', () => {
    const PAIRS: Record<string, string[]> = {
      mir: ['mir', 'mich'], mich: ['mir', 'mich'],
      dir: ['dir', 'dich'], dich: ['dir', 'dich'],
    }
    const DATIVE_FORMS = ['mir', 'dir']
    const bad = REFLEXIVE_ITEMS.filter(i => {
      if ((i.prompt.match(/___/g) ?? []).length !== 1) return true
      if (i.answers.length !== 1) return true
      const pair = PAIRS[i.answers[0]]
      if (!pair) return true
      if (new Set(i.options).size !== 2 || !pair.every(p => i.options.includes(p))) return true
      const isDativeForm = DATIVE_FORMS.includes(i.answers[0])
      return (i.kind === 'dative') !== isDativeForm
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('contrast pairs: every contrast verb appears in BOTH kinds (the mich/mir minimal pairs are the lesson)', () => {
    for (const v of REFLEXIVE_CONTRAST_VERBS) {
      expect(REFLEXIVE_ITEMS.some(i => i.verb === v && i.kind === 'dative'), `${v} dative`).toBe(true)
      expect(REFLEXIVE_ITEMS.some(i => i.verb === v && i.kind === 'accusative'), `${v} accusative`).toBe(true)
    }
  })

  test('floors: ≥20 total, ≥12 dative, ≥9 accusative, ≥5 contrast verbs', () => {
    expect(REFLEXIVE_ITEMS.length).toBeGreaterThanOrEqual(20)
    expect(REFLEXIVE_ITEMS.filter(i => i.kind === 'dative').length).toBeGreaterThanOrEqual(12)
    expect(REFLEXIVE_ITEMS.filter(i => i.kind === 'accusative').length).toBeGreaterThanOrEqual(9)
    expect(REFLEXIVE_CONTRAST_VERBS.length).toBeGreaterThanOrEqual(5)
  })
})
```

- [ ] **Step 2: RED.** `npx vitest run tests/data/dativeConsequences.test.ts`.

- [ ] **Step 3: Author the data.** Create `src/data/dativeConsequences.ts` with EXACTLY this content:

```ts
// Dativ module — family X item banks (T12 Kein persönliches Passiv,
// T13 Reflexiver Dativ). Both band-tracked only — consequences of dative-verb
// grammar, not ledger items.
//
// T12 teaches all three facets of the rule: (1) with no accusative object,
// nothing can become the passive subject — the dative SURVIVES (Mir wird
// geholfen, never *Ich werde geholfen); (2) with no subject the verb freezes
// in the 3rd person SINGULAR (Den Kindern wird geholfen — the agreement cards
// mix in real personal passives of accusative verbs so wird/werden is a
// genuine decision, never one-button-winnable); (3) the dummy es exists only
// to fill position 1 and VANISHES when anything else fronts (Es wird mir
// geholfen → Jetzt wird mir geholfen).
//
// T13: the reflexive pronoun goes DATIVE when an accusative object is already
// present (ich wasche mir die Hände) and stays ACCUSATIVE when the reflexive
// itself is the object (ich wasche mich). Only ich/du forms are drilled —
// 3rd-person sich never shows the case. Verbs here are ordinary transitives,
// NOT DATIVE_VERBS members; the gate instead proves an accusative object is
// literally present in every dative-kind prompt. Options never carry final
// punctuation.

import type { DativeDrillLevel } from './dativeExperiencer'

export interface PassiveItem {
  id: string
  /** kind transform/es + verbCase 'dative': a DATIVE_VERBS key. Agreement contrast cards: an accusative VERBS entry. */
  verb: string
  verbCase: 'dative' | 'accusative'
  level: DativeDrillLevel
  kind: 'transform' | 'agreement' | 'es'
  esPattern?: 'es-first' | 'fronted'   // es kind only
  prompt: string
  options: string[]                    // exactly 2
  answers: string[]                    // exactly 1
  translation: string
  explanation: string
}

export const PASSIVE_ITEMS: PassiveItem[] = [
  // ── kind 'transform': Aktiv → Passiv, pick the grammatical passive ──
  { id: 'pv-helfen', verb: 'helfen', verbCase: 'dative', level: 'B2', kind: 'transform',
    prompt: 'Die Sanitäter helfen dem Verletzten. — Wie lautet das Passiv?',
    options: ['Dem Verletzten wird geholfen', 'Der Verletzte wird geholfen'],
    answers: ['Dem Verletzten wird geholfen'],
    translation: 'The injured man is being helped.',
    explanation: 'helfen hat kein Akkusativobjekt — nichts kann im Passiv zum Subjekt werden. Der Dativ überlebt: Dem Verletzten wird geholfen. *Der Verletzte wird geholfen ist der englische Sog (he is being helped).' },
  { id: 'pv-danken', verb: 'danken', verbCase: 'dative', level: 'B2', kind: 'transform',
    prompt: 'Die Stadt dankt den Helfern. — Wie lautet das Passiv?',
    options: ['Den Helfern wird gedankt', 'Die Helfer werden gedankt'],
    answers: ['Den Helfern wird gedankt'],
    translation: 'The helpers are being thanked.',
    explanation: 'Kein Akkusativ, kein Subjekt: Den Helfern wird gedankt — das Verb bleibt Singular (wird), obwohl die Helfer viele sind.' },
  { id: 'pv-gratulieren', verb: 'gratulieren', verbCase: 'dative', level: 'B2', kind: 'transform',
    prompt: 'Alle gratulieren der Gewinnerin. — Wie lautet das Passiv?',
    options: ['Der Gewinnerin wird gratuliert', 'Die Gewinnerin wird gratuliert'],
    answers: ['Der Gewinnerin wird gratuliert'],
    translation: 'The winner is being congratulated.',
    explanation: 'gratulieren + Dativ: Der Gewinnerin wird gratuliert. *Die Gewinnerin wird gratuliert erfände ein Subjekt, das es nicht gibt.' },
  { id: 'pv-vertrauen', verb: 'vertrauen', verbCase: 'dative', level: 'B2', kind: 'transform',
    prompt: 'Die Kollegen vertrauen dem neuen Chef. — Wie lautet das Passiv?',
    options: ['Dem neuen Chef wird vertraut', 'Der neue Chef wird vertraut'],
    answers: ['Dem neuen Chef wird vertraut'],
    translation: 'The new boss is trusted.',
    explanation: 'Dem neuen Chef wird vertraut — der Dativ bleibt Dativ. Ein persönliches Passiv (*Der neue Chef wird vertraut) gibt es nur bei Akkusativverben.' },
  { id: 'pv-widersprechen', verb: 'widersprechen', verbCase: 'dative', level: 'C1', kind: 'transform',
    prompt: 'Niemand widerspricht der Richterin. — Wie lautet das Passiv?',
    options: ['Der Richterin wird nicht widersprochen', 'Die Richterin wird nicht widersprochen'],
    answers: ['Der Richterin wird nicht widersprochen'],
    translation: 'The judge is not being contradicted.',
    explanation: 'Der Richterin wird nicht widersprochen — unpersönliches Passiv, kein Nominativ weit und breit.' },
  { id: 'pv-zuhoeren', verb: 'zuhören', verbCase: 'dative', level: 'B2', kind: 'transform',
    prompt: 'Alle hören dem Redner zu. — Wie lautet das Passiv?',
    options: ['Dem Redner wird zugehört', 'Der Redner wird zugehört'],
    answers: ['Dem Redner wird zugehört'],
    translation: 'The speaker is being listened to.',
    explanation: 'Dem Redner wird zugehört. Die Person bleibt Dativ; die Subjektstelle bleibt leer (oder es als Platzhalter: Es wird dem Redner zugehört).' },
  { id: 'pv-drohen', verb: 'drohen', verbCase: 'dative', level: 'C1', kind: 'transform',
    prompt: 'Man droht den Zeugen. — Wie lautet das Passiv?',
    options: ['Den Zeugen wird gedroht', 'Die Zeugen werden gedroht'],
    answers: ['Den Zeugen wird gedroht'],
    translation: 'The witnesses are being threatened.',
    explanation: 'Den Zeugen wird gedroht — Dativ Plural, Verb trotzdem Singular. *Die Zeugen werden gedroht wäre ein persönliches Passiv, das drohen nicht bilden kann.' },
  { id: 'pv-verzeihen', verb: 'verzeihen', verbCase: 'dative', level: 'C1', kind: 'transform',
    prompt: 'Am Ende verzeihen alle dem Jungen. — Wie lautet das Passiv?',
    options: ['Dem Jungen wird am Ende verziehen', 'Der Junge wird am Ende verziehen'],
    answers: ['Dem Jungen wird am Ende verziehen'],
    translation: 'In the end the boy is forgiven.',
    explanation: 'Dem Jungen wird am Ende verziehen — der Dativ von verzeihen übersteht das Passiv unverändert. der Junge ist ein n-Nomen: Dativ dem Jungen.' },

  // ── kind 'agreement': wird oder werden? — dative verbs freeze at 3sg;
  //    the accusative contrast cards form REAL personal passives and agree ──
  { id: 'pa-kindern', verb: 'helfen', verbCase: 'dative', level: 'B2', kind: 'agreement',
    prompt: 'Den Kindern ___ bei den Hausaufgaben geholfen.',
    options: ['wird', 'werden'], answers: ['wird'],
    translation: 'The children are being helped with their homework.',
    explanation: 'Kein Subjekt im Satz — das Verb erstarrt in der 3. Person Singular: wird. Der Dativ (den Kindern) steuert nie die Kongruenz.' },
  { id: 'pa-gaesten', verb: 'danken', verbCase: 'dative', level: 'B2', kind: 'agreement',
    prompt: 'Den Gästen ___ für die Geduld gedankt.',
    options: ['wird', 'werden'], answers: ['wird'],
    translation: 'The guests are being thanked for their patience.',
    explanation: 'Den Gästen ist Dativ, nicht Subjekt — also Singular: wird gedankt.' },
  { id: 'pa-gewinnern', verb: 'gratulieren', verbCase: 'dative', level: 'B2', kind: 'agreement',
    prompt: 'Den Gewinnern ___ nach dem Rennen gratuliert.',
    options: ['wird', 'werden'], answers: ['wird'],
    translation: 'The winners are being congratulated after the race.',
    explanation: 'Viele Gewinner, trotzdem wird: ohne Nominativ-Subjekt gibt es nichts, womit das Verb kongruieren könnte.' },
  { id: 'pa-zeugen', verb: 'drohen', verbCase: 'dative', level: 'C1', kind: 'agreement',
    prompt: 'Den Zeugen ___ vor dem Prozess gedroht.',
    options: ['wird', 'werden'], answers: ['wird'],
    translation: 'The witnesses are being threatened before the trial.',
    explanation: 'drohen + Dativ: der Plural den Zeugen bleibt Objekt — das unpersönliche Passiv steht starr im Singular.' },
  { id: 'pa-schuelern', verb: 'zuhören', verbCase: 'dative', level: 'B2', kind: 'agreement',
    prompt: 'Den Schülern ___ heute kaum zugehört.',
    options: ['wird', 'werden'], answers: ['wird'],
    translation: 'Hardly anyone is listening to the pupils today.',
    explanation: 'zuhören hat nur ein Dativobjekt — im Passiv bleibt die Subjektstelle leer und das Verb Singular: wird zugehört.' },
  { id: 'pa-experten', verb: 'vertrauen', verbCase: 'dative', level: 'C1', kind: 'agreement',
    prompt: 'Den Experten ___ blind vertraut.',
    options: ['wird', 'werden'], answers: ['wird'],
    translation: 'The experts are trusted blindly.',
    explanation: 'Den Experten ist Dativ Plural — und genau deshalb NICHT Subjekt: wird vertraut, nie *werden vertraut.' },
  { id: 'pa-kinder-gefragt', verb: 'fragen', verbCase: 'accusative', level: 'B2', kind: 'agreement',
    prompt: 'Die Kinder ___ vom Lehrer gefragt.',
    options: ['werden', 'wird'], answers: ['werden'],
    translation: 'The children are being asked by the teacher.',
    explanation: 'Kontrast: fragen nimmt den Akkusativ → echtes persönliches Passiv. Die Kinder SIND das Subjekt, das Verb kongruiert im Plural: werden. Genau das kann ein Dativverb nicht.' },
  { id: 'pa-gaeste-abgeholt', verb: 'abholen', verbCase: 'accusative', level: 'B2', kind: 'agreement',
    prompt: 'Die Gäste ___ vom Bahnhof abgeholt.',
    options: ['werden', 'wird'], answers: ['werden'],
    translation: 'The guests are being picked up from the station.',
    explanation: 'abholen + Akkusativ: die Gäste werden im Passiv zum Subjekt und steuern das Verb — werden abgeholt.' },
  { id: 'pa-studenten-eingeladen', verb: 'einladen', verbCase: 'accusative', level: 'B2', kind: 'agreement',
    prompt: 'Die Studenten ___ zur Feier eingeladen.',
    options: ['werden', 'wird'], answers: ['werden'],
    translation: 'The students are being invited to the party.',
    explanation: 'einladen + Akkusativ → persönliches Passiv mit Plural-Kongruenz: die Studenten werden eingeladen. Vergleiche das starre wird der Dativverben.' },
  { id: 'pa-karten-kontrolliert', verb: 'kontrollieren', verbCase: 'accusative', level: 'C1', kind: 'agreement',
    prompt: 'Die Fahrkarten ___ im Zug kontrolliert.',
    options: ['werden', 'wird'], answers: ['werden'],
    translation: 'The tickets are being checked on the train.',
    explanation: 'kontrollieren + Akkusativ: die Fahrkarten sind Subjekt des Passivsatzes → werden kontrolliert.' },

  // ── kind 'es': the dummy es fills position 1 and vanishes when fronted ──
  { id: 'pe-es-hilfe', verb: 'helfen', verbCase: 'dative', level: 'B2', kind: 'es', esPattern: 'es-first',
    prompt: 'Welcher Satz ist richtig?',
    options: ['Es wird dir geholfen', 'Dir wird es geholfen'],
    answers: ['Es wird dir geholfen'],
    translation: 'You are being helped.',
    explanation: 'es ist nur ein Platzhalter für die erste Position: Es wird dir geholfen. Mitten im Satz hat es nichts verloren — *Dir wird es geholfen. Ohne Platzhalter: Dir wird geholfen.' },
  { id: 'pe-front-hilfe', verb: 'helfen', verbCase: 'dative', level: 'B2', kind: 'es', esPattern: 'fronted',
    prompt: 'Welcher Satz ist richtig?',
    options: ['Jetzt wird dir geholfen', 'Jetzt wird es dir geholfen'],
    answers: ['Jetzt wird dir geholfen'],
    translation: 'Now you are being helped.',
    explanation: 'Sobald jetzt die erste Position füllt, fällt der Platzhalter weg: Jetzt wird dir geholfen, nie *Jetzt wird es dir geholfen.' },
  { id: 'pe-es-dank', verb: 'danken', verbCase: 'dative', level: 'B2', kind: 'es', esPattern: 'es-first',
    prompt: 'Welcher Satz ist richtig?',
    options: ['Es wird den Helfern gedankt', 'Den Helfern wird es gedankt'],
    answers: ['Es wird den Helfern gedankt'],
    translation: 'The helpers are being thanked.',
    explanation: 'Es besetzt Position 1, sonst nichts. Steht den Helfern vorn, verschwindet es: Den Helfern wird gedankt.' },
  { id: 'pe-front-dank', verb: 'danken', verbCase: 'dative', level: 'B2', kind: 'es', esPattern: 'fronted',
    prompt: 'Welcher Satz ist richtig?',
    options: ['Heute wird den Helfern gedankt', 'Heute wird es den Helfern gedankt'],
    answers: ['Heute wird den Helfern gedankt'],
    translation: 'Today the helpers are being thanked.',
    explanation: 'heute nimmt die erste Position — der Platzhalter es muss weichen: Heute wird den Helfern gedankt.' },
  { id: 'pe-front-gratulation', verb: 'gratulieren', verbCase: 'dative', level: 'C1', kind: 'es', esPattern: 'fronted',
    prompt: 'Welcher Satz ist richtig?',
    options: ['Nach dem Spiel wird der Mannschaft gratuliert', 'Nach dem Spiel wird es der Mannschaft gratuliert'],
    answers: ['Nach dem Spiel wird der Mannschaft gratuliert'],
    translation: 'After the match the team is congratulated.',
    explanation: 'Die Angabe nach dem Spiel füllt Position 1 — es hat dort nichts mehr zu suchen.' },
  { id: 'pe-es-widerspruch', verb: 'widersprechen', verbCase: 'dative', level: 'C1', kind: 'es', esPattern: 'es-first',
    prompt: 'Welcher Satz ist richtig?',
    options: ['Es wird dem Plan widersprochen', 'Dem Plan wird es widersprochen'],
    answers: ['Es wird dem Plan widersprochen'],
    translation: 'The plan is being contradicted.',
    explanation: 'Es wird dem Plan widersprochen — es nur ganz vorn. Mit dem Plan vorn heißt es schlicht: Dem Plan wird widersprochen.' },
]

/** The mich/mir minimal-pair verbs — every one appears in BOTH kinds below. */
export const REFLEXIVE_CONTRAST_VERBS = ['waschen', 'vorstellen', 'anziehen', 'kämmen', 'rasieren'] as const

export interface ReflexiveItem {
  id: string
  /** Infinitive label for contrast pairing and display — ordinary transitives, deliberately NOT cross-refd against DATIVE_VERBS. */
  verb: string
  level: DativeDrillLevel
  kind: 'dative' | 'accusative'
  prompt: string                 // one ___ where the reflexive goes (ich/du persons only)
  /** dative kind ONLY: the accusative object phrase, exactly as in prompt — the gate proves it is present. */
  accObject?: string
  options: string[]              // exactly 2: the person-matched mir/mich or dir/dich pair
  answers: string[]              // exactly 1
  translation: string
  explanation: string
}

export const REFLEXIVE_ITEMS: ReflexiveItem[] = [
  // ── kind 'dative': an accusative object is already there → reflexive goes dative ──
  { id: 'rf-haende', verb: 'waschen', level: 'B1', kind: 'dative',
    prompt: 'Ich wasche ___ vor dem Essen die Hände.', accObject: 'die Hände',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I wash my hands before dinner.',
    explanation: 'die Hände ist schon das Akkusativobjekt — das Reflexivpronomen weicht in den Dativ aus: Ich wasche mir die Hände. Vergleiche: Ich wasche mich (kein zweites Objekt → Akkusativ).' },
  { id: 'rf-zaehne', verb: 'putzen', level: 'B1', kind: 'dative',
    prompt: 'Du putzt ___ nach dem Frühstück die Zähne.', accObject: 'die Zähne',
    options: ['dir', 'dich'], answers: ['dir'],
    translation: 'You brush your teeth after breakfast.',
    explanation: 'die Zähne besetzt den Akkusativ — das Reflexivpronomen wird Dativ: Du putzt dir die Zähne.' },
  { id: 'rf-auto', verb: 'kaufen', level: 'B1', kind: 'dative',
    prompt: 'Ich kaufe ___ ein Auto.', accObject: 'ein Auto',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I am buying myself a car.',
    explanation: 'ein Auto ist das Akkusativobjekt; der Nutznießer-Reflexiv steht im Dativ: Ich kaufe mir ein Auto — *Ich kaufe mich ein Auto ist unmöglich.' },
  { id: 'rf-vorstellen-dat', verb: 'vorstellen', level: 'B2', kind: 'dative',
    prompt: 'Ich stelle ___ das neue Haus schon genau vor.', accObject: 'das neue Haus',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I can already picture the new house exactly.',
    explanation: 'sich (Dativ) etwas vorstellen = imagine: das neue Haus trägt den Akkusativ, also mir. Ich stelle mich vor (Akkusativ, ohne Objekt) hieße: ich stelle mich selbst vor.' },
  { id: 'rf-merken', verb: 'merken', level: 'B2', kind: 'dative',
    prompt: 'Ich merke ___ deine Telefonnummer.', accObject: 'deine Telefonnummer',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I will memorize your phone number.',
    explanation: 'sich (Dativ) etwas merken: deine Telefonnummer ist Akkusativ, das Reflexiv Dativ — Ich merke mir deine Telefonnummer.' },
  { id: 'rf-anziehen-dat', verb: 'anziehen', level: 'B1', kind: 'dative',
    prompt: 'Zieh ___ warme Schuhe an!', accObject: 'warme Schuhe',
    options: ['dir', 'dich'], answers: ['dir'],
    translation: 'Put on warm shoes!',
    explanation: 'warme Schuhe füllt den Akkusativ — das Reflexiv weicht aus: Zieh dir warme Schuhe an! Ohne Objekt: Zieh dich an!' },
  { id: 'rf-kaemmen-dat', verb: 'kämmen', level: 'B1', kind: 'dative',
    prompt: 'Ich kämme ___ die Haare.', accObject: 'die Haare',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I comb my hair.',
    explanation: 'die Haare ist Akkusativobjekt → Dativ-Reflexiv: Ich kämme mir die Haare. Ich kämme mich sagt dasselbe ohne den Körperteil.' },
  { id: 'rf-rasieren-dat', verb: 'rasieren', level: 'B2', kind: 'dative',
    prompt: 'Ich rasiere ___ den Bart ab.', accObject: 'den Bart',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I am shaving off my beard.',
    explanation: 'den Bart trägt den Akkusativ — Ich rasiere mir den Bart ab. Ohne Objekt bleibt das Reflexiv Akkusativ: Ich rasiere mich.' },
  { id: 'rf-leisten', verb: 'leisten', level: 'B2', kind: 'dative',
    prompt: 'Ich leiste ___ dieses Jahr einen langen Urlaub.', accObject: 'einen langen Urlaub',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'This year I am treating myself to a long vacation.',
    explanation: 'sich (Dativ) etwas leisten: einen langen Urlaub ist Akkusativ — Ich leiste mir einen langen Urlaub.' },
  { id: 'rf-ueberlegen', verb: 'überlegen', level: 'B2', kind: 'dative',
    prompt: 'Ich überlege ___ deinen Vorschlag noch einmal.', accObject: 'deinen Vorschlag',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I will think your suggestion over once more.',
    explanation: 'sich (Dativ) etwas überlegen: deinen Vorschlag ist das Akkusativobjekt — Ich überlege mir deinen Vorschlag.' },
  { id: 'rf-ansehen', verb: 'ansehen', level: 'B2', kind: 'dative',
    prompt: 'Siehst du ___ den Film heute Abend an?', accObject: 'den Film',
    options: ['dir', 'dich'], answers: ['dir'],
    translation: 'Are you going to watch the film tonight?',
    explanation: 'sich (Dativ) etwas ansehen: den Film ist Akkusativ — Siehst du dir den Film an?' },
  { id: 'rf-einbilden', verb: 'einbilden', level: 'C1', kind: 'dative',
    prompt: 'Das bildest du ___ nur ein!', accObject: 'Das',
    options: ['dir', 'dich'], answers: ['dir'],
    translation: 'You are only imagining that!',
    explanation: 'sich (Dativ) etwas einbilden: das vorangestellte Das ist das Akkusativobjekt — Das bildest du dir nur ein!' },
  { id: 'rf-wuenschen', verb: 'wünschen', level: 'B1', kind: 'dative',
    prompt: 'Ich wünsche ___ ein Fahrrad zum Geburtstag.', accObject: 'ein Fahrrad',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I want a bicycle for my birthday.',
    explanation: 'ein Fahrrad ist Akkusativ — der Wünschende für sich selbst steht im Dativ: Ich wünsche mir ein Fahrrad.' },

  // ── kind 'accusative': no other object — the reflexive IS the accusative ──
  { id: 'rf-waschen-akk', verb: 'waschen', level: 'B1', kind: 'accusative',
    prompt: 'Ich wasche ___ jeden Morgen mit kaltem Wasser.',
    options: ['mir', 'mich'], answers: ['mich'],
    translation: 'I wash with cold water every morning.',
    explanation: 'Kein weiteres Objekt: das Reflexivpronomen IST das Akkusativobjekt — Ich wasche mich. Erst ein zweites Objekt (die Hände) drängt es in den Dativ.' },
  { id: 'rf-vorstellen-akk', verb: 'vorstellen', level: 'B2', kind: 'accusative',
    prompt: 'Ich stelle ___ kurz vor: Ich heiße Jana.',
    options: ['mir', 'mich'], answers: ['mich'],
    translation: 'Let me briefly introduce myself: my name is Jana.',
    explanation: 'sich (Akkusativ) vorstellen = sich selbst präsentieren: Ich stelle mich vor. Mit mir kippt die Bedeutung zu „sich etwas ausmalen“ — und bräuchte ein Akkusativobjekt.' },
  { id: 'rf-anziehen-akk', verb: 'anziehen', level: 'B1', kind: 'accusative',
    prompt: 'Zieh ___ schnell an, wir müssen los!',
    options: ['dir', 'dich'], answers: ['dich'],
    translation: 'Get dressed quickly, we have to go!',
    explanation: 'Ohne Kleidungsstück im Satz bleibt das Reflexiv Akkusativ: Zieh dich an! Mit Objekt: Zieh dir die Jacke an.' },
  { id: 'rf-kaemmen-akk', verb: 'kämmen', level: 'B1', kind: 'accusative',
    prompt: 'Ich kämme ___ vor dem Spiegel.',
    options: ['mir', 'mich'], answers: ['mich'],
    translation: 'I comb my hair in front of the mirror.',
    explanation: 'Kein zweites Objekt → Ich kämme mich. Sobald die Haare dazukommen, wird es mir: Ich kämme mir die Haare.' },
  { id: 'rf-rasieren-akk', verb: 'rasieren', level: 'B2', kind: 'accusative',
    prompt: 'Ich rasiere ___ nur alle zwei Tage.',
    options: ['mir', 'mich'], answers: ['mich'],
    translation: 'I only shave every two days.',
    explanation: 'Das Reflexiv ist hier selbst das Objekt: Ich rasiere mich. Mit Körperteil: Ich rasiere mir den Bart ab.' },
  { id: 'rf-freuen', verb: 'freuen', level: 'B1', kind: 'accusative',
    prompt: 'Freust du ___ auf das Wochenende?',
    options: ['dir', 'dich'], answers: ['dich'],
    translation: 'Are you looking forward to the weekend?',
    explanation: 'sich freuen ist immer Akkusativ-reflexiv: Freust du dich? Die Präpositionalgruppe auf das Wochenende ist KEIN Akkusativobjekt und drängt nichts in den Dativ.' },
  { id: 'rf-erinnern', verb: 'erinnern', level: 'B2', kind: 'accusative',
    prompt: 'Ich erinnere ___ gern an den Sommer.',
    options: ['mir', 'mich'], answers: ['mich'],
    translation: 'I like remembering the summer.',
    explanation: 'sich erinnern an + Akk: das Reflexiv bleibt Akkusativ (mich) — an den Sommer ist Präpositionalgruppe, kein Objekt.' },
  { id: 'rf-beeilen', verb: 'beeilen', level: 'B1', kind: 'accusative',
    prompt: 'Beeil ___, der Bus kommt!',
    options: ['dir', 'dich'], answers: ['dich'],
    translation: 'Hurry up, the bus is coming!',
    explanation: 'sich beeilen ist rein reflexiv, das Pronomen immer Akkusativ: Beeil dich!' },
  { id: 'rf-irren', verb: 'irren', level: 'B2', kind: 'accusative',
    prompt: 'Da irrst du ___.',
    options: ['dir', 'dich'], answers: ['dich'],
    translation: 'You are wrong there.',
    explanation: 'sich irren: kein weiteres Objekt, Reflexiv Akkusativ — Da irrst du dich.' },
  { id: 'rf-legen', verb: 'legen', level: 'B1', kind: 'accusative',
    prompt: 'Ich lege ___ kurz aufs Sofa.',
    options: ['mir', 'mich'], answers: ['mich'],
    translation: 'I will lie down on the sofa for a bit.',
    explanation: 'Ich lege mich aufs Sofa — das Reflexiv ist das Akkusativobjekt; aufs Sofa ist Richtungsangabe, kein Objekt.' },
]
```

- [ ] **Step 4: GREEN.** `npx vitest run tests/data/dativeConsequences.test.ts` → PASS. If the cross-ref gate reports `fragen`/`abholen`/`einladen`/`kontrollieren` as not-accusative, check `src/data/verbs.ts` — all four carry `case: "accusative"` there today; fix the item only if the pool genuinely disagrees, and report it.
- [ ] **Step 5: Typecheck + commit** `feat(dative): family X banks — passive consequence + reflexive dative with gates`

---
### Task 4: T12 drill — Kein persönliches Passiv (`dat-passive`)

**Files:**
- Modify: `src/composables/useDativeDrill.ts` (builder + filter), `src/router.ts` (2 routes)
- Create: `src/modules/dative/PassiveSetup.vue`, `src/modules/dative/PassiveRunner.vue`
- Test: `tests/modules/dative/PassiveRunner.test.ts`

**Interfaces:**
- Consumes: `PASSIVE_ITEMS`, `type PassiveItem` (Task 3); `useDativeQuiz`, `DativeQuizCard`, `DATIVE_DRILL_LEVELS` (phase 3); `shuffle`; `saveQuizRun`; `csv`.
- Produces: routes `dative-passive` / `dative-passive-run`; records type `'dat-passive'`; `buildPassiveCards(items: PassiveItem[]): DativeQuizCard[]`, `filterPassiveItems(f: { levels: DativeDrillLevel[]; kinds: string[] }): PassiveItem[]`.
- **Band-tracked ONLY — no `bumpDativeLedger` import or call.**

- [ ] **Step 1: Failing runner test.** Create `tests/modules/dative/PassiveRunner.test.ts` — Task 2's skeleton verbatim (same three mocks incl. the ledger mock, pinned `Math.random`), with these deltas: import `PassiveRunner` from `../../../src/modules/dative/PassiveRunner.vue` and `PASSIVE_ITEMS` from `../../../src/data/dativeConsequences`; router names `dative-passive-run`/`dative-passive`/`dative`; `QUERY = { count: '1', levels: 'A2,B1,B2,C1', kinds: 'transform,agreement,es' }`; `FIRST = PASSIVE_ITEMS[0]` (pv-helfen, a transform card with two full-sentence options); `WRONG = FIRST.options.find(o => !FIRST.answers.includes(o))!`. Assertions:
  - renders the prompt (`expect(wrapper.text()).toContain('Wie lautet das Passiv?')`) and exactly 2 `.choice` buttons;
  - wrong pick reveals feedback containing `FIRST.answers[0]` (`Dem Verletzten wird geholfen`) and `FIRST.explanation`;
  - finish records once `expect.objectContaining({ type: 'dat-passive', count: 1 })` and **`expect(bumpDativeLedger).not.toHaveBeenCalled()`** — the band-only assertion is the point of the test;
  - retry round not re-recorded (ADR-0010).

- [ ] **Step 2: RED.** `npx vitest run tests/modules/dative/PassiveRunner.test.ts`.

- [ ] **Step 3: Builder + filter.** Append to `src/composables/useDativeDrill.ts` (extend the dativeConsequences import — create it as `import { PASSIVE_ITEMS, type PassiveItem } from '../data/dativeConsequences'`):

```ts
export function buildPassiveCards(items: PassiveItem[]): DativeQuizCard[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.prompt,        // authored complete per kind (question suffix / gap / constant)
    answers: item.answers,
    options: item.options,
    translation: item.translation,
    note: item.explanation,
    ledgerKey: null,   // rule-driven family: band-tracked only, never in the ledger
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function filterPassiveItems(f: { levels: DativeDrillLevel[]; kinds: string[] }): PassiveItem[] {
  return PASSIVE_ITEMS.filter(i => f.levels.includes(i.level) && f.kinds.includes(i.kind))
}
```

- [ ] **Step 4: Setup.** Create `src/modules/dative/PassiveSetup.vue` — copy `src/modules/dative/FreeSetup.vue` (Task 4 runs after Task 2) and change exactly:
  - `const STORAGE_KEY = 'datPassiveSetup'`; import/count via `filterPassiveItems`.
  - State: `levels = ref<DativeDrillLevel[]>(['B2', 'C1'])`, `kinds = ref<string[]>(['transform', 'agreement', 'es'])`.
  - Kind chips: `transform` → `Aktiv → Passiv`, `agreement` → `wird oder werden?`, `es` → `Wohin mit es?` (row titled `Aufgabe · {{ kinds.length }} of 3`).
  - Header: breadcrumb `Kapitel XIII · Dativ · Kein persönliches Passiv`, title `Kein persönliches Passiv<em>.</em>`, subtitle: `Mir wird geholfen — never *Ich werde geholfen. With no accusative object nothing can become the subject: the dative survives, the verb freezes at third-person singular, and the dummy es vanishes the moment anything else takes first position.`
  - `start()` → `dative-passive-run` with query `{ count, levels, kinds }`. Back → `dative`.

- [ ] **Step 5: Runner.** Create `src/modules/dative/PassiveRunner.vue` — copy `src/modules/dative/FreeRunner.vue` and change exactly: imports `filterPassiveItems`, `buildPassiveCards`, `type PassiveItem`; `kinds` csv against `['transform', 'agreement', 'es'] as const`; `recordRun()` identical band-only shape with `type: 'dat-passive'` and `meta: { levels: queriedLevels.value, kinds: queriedKinds.value }` (still NO ledger import); when the prompt contains `___` (agreement cards) the feedback additionally shows the filled sentence (`current.prompt.replace('___', current.answers[0])`); all route pushes → `dative-passive`; breadcrumbs `Kapitel XIII · Dativ · Kein persönliches Passiv` / `Auswertung · Kein persönliches Passiv`; options stay max 2, so the keyboard loop from FreeRunner needs no change; `item-label="cards"`.

- [ ] **Step 6: Routes.** After the Task-2 pair in `src/router.ts`:

```ts
  { path: '/dative/passive', name: 'dative-passive', component: () => import('./modules/dative/PassiveSetup.vue') },
  { path: '/dative/passive/run', name: 'dative-passive-run', component: () => import('./modules/dative/PassiveRunner.vue') },
```

Catalogue already carries T12 (`dative-passive`, family X) from phase 2 — do not touch it.

- [ ] **Step 7: GREEN + typecheck.** `npx vitest run tests/modules/dative/PassiveRunner.test.ts tests/data/drillCatalogue.test.ts` → PASS; `npm run typecheck` → PASS.
- [ ] **Step 8: Commit** `feat(dative): T12 Kein persönliches Passiv drill (family X, band-tracked only)`

---

### Task 5: T13 drill — Reflexiver Dativ (`dat-reflexive`)

**Files:**
- Modify: `src/composables/useDativeDrill.ts` (builder + filter), `src/router.ts` (2 routes)
- Create: `src/modules/dative/ReflexiveSetup.vue`, `src/modules/dative/ReflexiveRunner.vue`
- Test: `tests/modules/dative/ReflexiveRunner.test.ts`

**Interfaces:**
- Consumes: `REFLEXIVE_ITEMS`, `type ReflexiveItem` (Task 3); `useDativeQuiz`, `DativeQuizCard`, `DATIVE_DRILL_LEVELS` (phase 3); `shuffle`; `saveQuizRun`; `csv`.
- Produces: routes `dative-reflexive` / `dative-reflexive-run`; records type `'dat-reflexive'`; `buildReflexiveCards(items: ReflexiveItem[]): DativeQuizCard[]`, `filterReflexiveItems(f: { levels: DativeDrillLevel[] }): ReflexiveItem[]`.
- **Band-tracked ONLY — no `bumpDativeLedger` import or call.** Deliberately NO kind filter in the setup: letting the learner select only `dative` (or only `accusative`) cards would make every answer mir/dir (or mich/dich) — one-button-winnable, the DW T8 mistake.

- [ ] **Step 1: Failing runner test.** Create `tests/modules/dative/ReflexiveRunner.test.ts` — Task 2's skeleton with deltas: import `ReflexiveRunner` and `REFLEXIVE_ITEMS`; router names `dative-reflexive-run`/`dative-reflexive`/`dative`; `QUERY = { count: '1', levels: 'A2,B1,B2,C1' }`; `FIRST = REFLEXIVE_ITEMS[0]` (rf-haende: gap card, options mir/mich); `WRONG` derived as before. Assertions: 2 `.choice` buttons; wrong pick reveals the filled sentence (`FIRST.prompt.replace('___', FIRST.answers[0])` — i.e. `Ich wasche mir vor dem Essen die Hände.`) and `FIRST.explanation`; finish records once `{ type: 'dat-reflexive', count: 1 }`; `expect(bumpDativeLedger).not.toHaveBeenCalled()`; retry not re-recorded.

- [ ] **Step 2: RED.**

- [ ] **Step 3: Builder + filter.** Append to `useDativeDrill.ts` (extend the dativeConsequences import with `REFLEXIVE_ITEMS, type ReflexiveItem`):

```ts
export function buildReflexiveCards(items: ReflexiveItem[]): DativeQuizCard[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.prompt,
    answers: item.answers,
    options: item.options,
    translation: item.translation,
    note: item.explanation,
    ledgerKey: null,   // rule-driven family: band-tracked only, never in the ledger
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function filterReflexiveItems(f: { levels: DativeDrillLevel[] }): ReflexiveItem[] {
  return REFLEXIVE_ITEMS.filter(i => f.levels.includes(i.level))
}
```

- [ ] **Step 4: Setup.** Create `src/modules/dative/ReflexiveSetup.vue` — copy `FreeSetup.vue` and change exactly: `STORAGE_KEY = 'datReflexiveSetup'`; **delete the kind-chip field entirely** (levels + count only — see the Interfaces note for why); `levels` default `['B1', 'B2']`; `availableItems` via `filterReflexiveItems({ levels: levels.value })`; breadcrumb `Kapitel XIII · Dativ · Reflexiver Dativ`, title `Reflexiver Dativ<em>.</em>`, subtitle: `ich wasche mich — but ich wasche mir die Hände: the moment an accusative object is already in the sentence, the reflexive moves to the dative. mir/dir against mich/dich, and the sentence decides.`; `start()` query `{ count, levels }` → `dative-reflexive-run`.

- [ ] **Step 5: Runner.** Create `src/modules/dative/ReflexiveRunner.vue` — copy `PassiveRunner.vue` and change exactly: imports `filterReflexiveItems`, `buildReflexiveCards`, `type ReflexiveItem`; mount parses `count` + `levels` only (no kinds); `filterReflexiveItems({ levels })`; `recordRun()` band-only with `type: 'dat-reflexive'`, `meta: { levels: queriedLevels.value }`; feedback always shows the filled sentence (every T13 prompt has a gap) + translation + note; route pushes → `dative-reflexive`; breadcrumbs `Kapitel XIII · Dativ · Reflexiver Dativ` / `Auswertung · Reflexiver Dativ`; `item-label="cards"`.

- [ ] **Step 6: Routes.** After the Task-4 pair:

```ts
  { path: '/dative/reflexive', name: 'dative-reflexive', component: () => import('./modules/dative/ReflexiveSetup.vue') },
  { path: '/dative/reflexive/run', name: 'dative-reflexive-run', component: () => import('./modules/dative/ReflexiveRunner.vue') },
```

Catalogue already carries T13 (`dative-reflexive`, family X) from phase 2 — do not touch it.

- [ ] **Step 7: GREEN + typecheck.** `npx vitest run tests/modules/dative/ReflexiveRunner.test.ts tests/data/drillCatalogue.test.ts` → PASS; `npm run typecheck` → PASS.
- [ ] **Step 8: Commit** `feat(dative): T13 Reflexiver Dativ drill (family X complete)`

---

### Task 6: T11 pure layer — history types + `useDativeSentenceQuiz.ts`

**Files:**
- Modify: `src/composables/useQuizHistory.ts` (one tag type, one item interface, one meta block)
- Create: `src/composables/useDativeSentenceQuiz.ts`
- Test: `tests/composables/useDativeSentenceQuiz.test.ts`

**Interfaces:**
- Consumes: `DATIVE_VERBS` (phase 1); `type DativeFamily` from `src/composables/useDativeDrill.ts` (phase 2); `shuffle`, `type Rng` (src/data/pool.ts); `type AiClient` (src/composables/useClaude.ts); `type PromptVariation` (src/composables/useVerbSentenceQuiz.ts).
- Produces (Tasks 7–8 rely on these exact names):
  - in `useQuizHistory.ts`: `export type DatErrorTag = 'case' | 'subject' | 'twin' | 'object-order' | 'conjugation' | 'word-order' | 'noun' | 'typo'`; `export interface DatDrillItem { verb?: string; family?: string; correct: boolean; tags?: DatErrorTag[] }`; `QuizHistoryMeta.datSentenceFamilies?: string[]`, `.datSentenceFocus?: 'all' | 'weak'`, `.datSentenceItems?: DatDrillItem[]`
  - in `useDativeSentenceQuiz.ts`: `interface DativeSentenceSpec { index: number; verb: string; family: DativeFamily }`; `buildDativeSentenceSpecs(verbPool: readonly string[], count: number, rng?: Rng): DativeSentenceSpec[]`; `interface GeneratedDatSentence extends DativeSentenceSpec { english: string; german: string; usedForm: string; dativeObject: string }`; `generateDatSentenceBatch(client: AiClient, opts: { model: string; specs: DativeSentenceSpec[]; maxRetries?: number; rng?: Rng }): Promise<{ sentences: GeneratedDatSentence[]; failedIndices: number[] }>`; `interface DatAnswerGrade { correct: boolean; tip: string; tags: DatErrorTag[] }`; `gradeDativeSentence(client: AiClient, opts: { spec: GeneratedDatSentence; answer: string; model: string }): Promise<DatAnswerGrade>` (throws when both attempts fail — caller falls back to a local check); `buildDatDrillItem(s: GeneratedDatSentence, correct: boolean, tags?: DatErrorTag[]): DatDrillItem`; plus the testable internals `validateDatSentencePair`, `buildDatGeneratePrompt`, `buildDatGradePrompt`, `parseDatGrade`.

- [ ] **Step 1: Guard check.** Open `src/composables/useQuizHistory.ts` and confirm no `DatErrorTag`/`DatDrillItem`/`datSentenceItems` exist yet (phase 2 added only the 13 type ids and `families?`; phase 3 only `verbs?`/`adjectives?`). If a same-named export somehow exists, adopt it instead of re-adding and say so in your completion report.

- [ ] **Step 2: Failing tests.** Create `tests/composables/useDativeSentenceQuiz.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  buildDativeSentenceSpecs, validateDatSentencePair, buildDatGeneratePrompt,
  buildDatGradePrompt, parseDatGrade, buildDatDrillItem,
  type DativeSentenceSpec, type GeneratedDatSentence,
} from '../../src/composables/useDativeSentenceQuiz'

const SPEC: DativeSentenceSpec = { index: 0, verb: 'helfen', family: 'co-agent' }
const GEN: GeneratedDatSentence = {
  ...SPEC,
  english: 'I help my mother in the kitchen.',
  german: 'Ich helfe meiner Mutter in der Küche.',
  usedForm: 'helfe',
  dativeObject: 'meiner Mutter',
}

describe('buildDativeSentenceSpecs', () => {
  test('a count equal to the pool size uses every verb once, indices sequential', () => {
    const specs = buildDativeSentenceSpecs(['helfen', 'danken', 'gefallen'], 3, () => 0)
    expect(specs).toHaveLength(3)
    expect(new Set(specs.map(s => s.verb)).size).toBe(3)
    expect(specs.map(s => s.index)).toEqual([0, 1, 2])
  })

  test('the bag refills: 2× the pool drills each verb exactly twice; family read from DATIVE_VERBS', () => {
    const specs = buildDativeSentenceSpecs(['helfen', 'gefallen'], 4, () => 0)
    const counts = new Map<string, number>()
    for (const s of specs) counts.set(s.verb, (counts.get(s.verb) ?? 0) + 1)
    expect([...counts.values()]).toEqual([2, 2])
    expect(specs.find(s => s.verb === 'gefallen')!.family).toBe('experiencer')
    expect(specs.find(s => s.verb === 'helfen')!.family).toBe('co-agent')
  })

  test('an empty pool yields no specs', () => {
    expect(buildDativeSentenceSpecs([], 5)).toEqual([])
  })
})

describe('validateDatSentencePair', () => {
  const raw = { index: 0, english: GEN.english, german: GEN.german, usedForm: 'helfe', dativeObject: 'meiner Mutter' }

  test('accepts a valid pair', () => {
    const v = validateDatSentencePair(raw, SPEC)
    expect(v).not.toBeNull()
    expect(v!.usedForm).toBe('helfe')
    expect(v!.dativeObject).toBe('meiner Mutter')
  })

  test('rejects a German missing the used form or the dative object', () => {
    expect(validateDatSentencePair({ ...raw, german: 'Ich unterstütze meine Mutter in der Küche.' }, SPEC)).toBeNull()
    expect(validateDatSentencePair({ ...raw, dativeObject: 'dem Vater' }, SPEC)).toBeNull()
  })

  test('LEAK GATE: rejects an English sentence containing the target infinitive', () => {
    expect(validateDatSentencePair({ ...raw, english: 'Use helfen when you help someone.' }, SPEC)).toBeNull()
  })

  test('rejects a mismatched index', () => {
    expect(validateDatSentencePair({ ...raw, index: 3 }, SPEC)).toBeNull()
  })
})

describe('prompts', () => {
  test('generation prompt: target line per spec, twin ban for helfen, experiencer note for gefallen, JSON envelope in prose', () => {
    const specs: DativeSentenceSpec[] = [SPEC, { index: 1, verb: 'gefallen', family: 'experiencer' }]
    const p = buildDatGeneratePrompt(specs, { angles: ['set it at work'], seed: 'abc' })
    expect(p).toContain('TARGET verb: "helfen"')
    expect(p).toContain('unterstützen')
    expect(p).toContain('TARGET verb: "gefallen"')
    expect(p).toContain('experiencer')
    expect(p).toContain('seed: abc')
  })

  test('grade prompt names the twin and carries the literal learner-answer marker line', () => {
    const { user } = buildDatGradePrompt({ spec: GEN, answer: 'Ich helfe ihm' })
    expect(user).toContain('ACCUSATIVE TWIN to reject: "unterstützen"')
    expect(user).toContain("LEARNER'S GERMAN ANSWER: Ich helfe ihm")
  })
})

describe('parseDatGrade / buildDatDrillItem', () => {
  test('filters unknown tags; missing correct is a parse failure', () => {
    expect(parseDatGrade({ correct: false, errorTags: ['case', 'nonsense'] }))
      .toEqual({ correct: false, tip: '', tags: ['case'] })
    expect(parseDatGrade({ tip: 'x' })).toBeNull()
  })

  test('drill item carries verb + family and omits empty tags', () => {
    expect(buildDatDrillItem(GEN, true)).toEqual({ verb: 'helfen', family: 'co-agent', correct: true })
    expect(buildDatDrillItem(GEN, false, ['case'])).toEqual({ verb: 'helfen', family: 'co-agent', correct: false, tags: ['case'] })
  })
})
```

- [ ] **Step 3: RED.** `npx vitest run tests/composables/useDativeSentenceQuiz.test.ts` — unresolvable module.

- [ ] **Step 4: History types.** In `src/composables/useQuizHistory.ts`, directly after the `DwDrillItem` interface block, add:

```ts
/**
 * A Dativ-module error category the AI grader may assign (see CONTEXT.md,
 * [Dative error tag]). 'case', 'subject', 'twin' and 'object-order' are the
 * module's own; the other four mirror the verb-sentence tags.
 */
export type DatErrorTag = 'case' | 'subject' | 'twin' | 'object-order' | 'conjugation' | 'word-order' | 'noun' | 'typo'

/** One recorded answer in a dat-sentence run (T11, EN→DE only). */
export interface DatDrillItem {
  verb?: string          // the drilled dative verb (DATIVE_VERBS key)
  family?: string        // its semantic family, denormalized for display
  correct: boolean
  tags?: DatErrorTag[]   // why wrong; absent when correct
}
```

And inside `QuizHistoryMeta`, directly after the `dwAnswerItems?: DwDrillItem[]` line, add:

```ts
  // Dativ sentence-translation (AI) — T11, EN→DE, AI-graded
  datSentenceFamilies?: string[]
  datSentenceFocus?: 'all' | 'weak'
  datSentenceItems?: DatDrillItem[]
```

- [ ] **Step 5: Create `src/composables/useDativeSentenceQuiz.ts`:**

```ts
// AI-generated Dativ sentence-translation quiz (T11 Satzübersetzung, EN→DE,
// AI-graded) — the Dativ module's ONLY AI drill; everything else is offline
// per ADR-0007.
//
// The learner picks semantic families (or the weak-verb focus); one drilled
// dative verb per sentence is sampled up front from a refilling bag, so all
// randomization is decided before any AI call (ADR-0004). The English/German
// pairs then generate progressively (ADR-0008) and the AI grades each answer,
// assigning [Dative error tag]s (CONTEXT.md): the accusative-under-English-
// pull slip is 'case', the inverted-experiencer slips are 'subject', a
// swapped accusative near-synonym is 'twin'.
//
// The prompts spell out the full JSON envelope in prose because the
// local-claude dev bridge drops responseSchema.

import { shuffle } from '../data/pool'
import type { Rng } from '../data/pool'
import { DATIVE_VERBS } from '../data/dativeVerbs'
import type { DativeFamily } from './useDativeDrill'
import type { AiClient } from './useClaude'
import type { DatErrorTag, DatDrillItem } from './useQuizHistory'
import type { PromptVariation } from './useVerbSentenceQuiz'

/** A Dativ error category the AI grader may assign (re-exported from history). */
export type { DatErrorTag } from './useQuizHistory'

// ─────────────────────────────── Types ────────────────────────────────

/** One drilled dative verb, decided before the AI writes anything. */
export interface DativeSentenceSpec {
  index: number
  verb: string            // DATIVE_VERBS key
  family: DativeFamily
}

/** A spec once the AI has produced the sentence pair. */
export interface GeneratedDatSentence extends DativeSentenceSpec {
  english: string
  german: string          // reference translation containing the target verb
  usedForm: string        // the target verb's form exactly as in `german` (one token)
  dativeObject: string    // the dative NP/pronoun exactly as in `german`
}

// ───────────────────────────── Pure helpers ───────────────────────────

/** A refilling shuffled bag: draws spread the pool before any repeat. */
function makeBag<T>(pool: readonly T[], rng: Rng) {
  let bag: T[] = []
  let i = 0
  return function next(): T | null {
    if (pool.length === 0) return null
    if (i >= bag.length) { bag = shuffle(pool, pool.length, rng); i = 0 }
    return bag[i++] ?? null
  }
}

/** Build `count` specs, one dative verb each, spread via a refilling bag. */
export function buildDativeSentenceSpecs(
  verbPool: readonly string[],
  count: number,
  rng: Rng = Math.random
): DativeSentenceSpec[] {
  if (verbPool.length === 0) return []
  const next = makeBag(verbPool, rng)
  const specs: DativeSentenceSpec[] = []
  for (let index = 0; index < count; index++) {
    const verb = next()
    if (!verb) break
    specs.push({ index, verb, family: DATIVE_VERBS[verb]?.family ?? 'recipient' })
  }
  return specs
}

// ──────────────────────────── AI generation ───────────────────────────

/** Rotating one-line angles injected per batch so sentences don't converge. */
export const DAT_ANGLE_POOL = [
  'set it in a family kitchen',
  'set it at work between colleagues',
  'set it at a birthday party',
  'set it in a shop or at a market',
  'set it at school or in a lecture',
  'set it on a phone call',
  'set it at the doctor\'s office',
  'frame it as a question',
  'frame it as advice or a warning',
  'use a 2nd-person informal subject (du)',
  'use a first-person plural subject (wir)',
  'use a polite request (Sie)',
  'put it in the Perfekt (past)',
  'open with an adverb of time',
  'contrast two people\'s opinions',
  'set it on a trip or at a station',
] as const

export const DAT_GEN_SYSTEM = `You are a German-language exercise writer for an app drilling DATIVE VERBS — verbs whose only object is dative (helfen, danken, gefallen, folgen, fehlen, …).
For each requested item you are given a TARGET verb with teaching notes. Write:
- "english": one natural English sentence (level-appropriate, 6–14 words, no German words anywhere) whose German translation must use the TARGET verb with a dative object. Use the natural ENGLISH construction: for experiencer verbs that is the English mirror ("Anna likes the shoes" for gefallen, "I miss my brother" for fehlen) so the learner must invert the sentence themselves; for verbs whose English equivalent is plain transitive ("help", "thank", "follow") write it that way — the accusative pull IS the drill.
- "german": the reference translation, natural German, using the TARGET verb and its dative object. Mostly Präsens, occasionally Perfekt.
- "usedForm": the finite form or participle of the TARGET verb exactly as it appears in your German sentence, a single word (e.g. "hilft", "geholfen", "fällt").
- "dativeObject": the dative noun phrase or pronoun in your German sentence, exactly as written (e.g. "meiner Mutter", "ihm").
Return ONLY JSON in exactly this shape: {"items":[{"index":<number>,"english":"...","german":"...","usedForm":"...","dativeObject":"..."}]}
No markdown fences, no commentary.`

export const DAT_GEN_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          english: { type: 'string' },
          german: { type: 'string' },
          usedForm: { type: 'string' },
          dativeObject: { type: 'string' }
        },
        required: ['index', 'english', 'german', 'usedForm', 'dativeObject']
      }
    }
  },
  required: ['items']
}

function specLine(s: DativeSentenceSpec): string {
  const e = DATIVE_VERBS[s.verb]
  const notes: string[] = [`family: ${s.family}`]
  if (e?.experiencer) notes.push('experiencer verb — in the GERMAN the thing is the nominative subject controlling agreement, the person is dative; the ENGLISH uses its natural mirror construction')
  if (e?.englishPull) notes.push('the English equivalent takes a plain direct object — write it that way')
  if (e?.twin && e.twin !== s.verb) notes.push(`do NOT use the accusative near-synonym "${e.twin}" in the German`)
  return `#${s.index} — TARGET verb: "${s.verb}" (${notes.join('; ')})`
}

export function buildDatGeneratePrompt(
  specs: readonly DativeSentenceSpec[],
  variation: PromptVariation
): string {
  return (
    `Target CEFR level: B1–B2.\n` +
    `Write one English sentence and its German reference translation for each of the following ${specs.length} item(s), each built around its TARGET dative verb:\n` +
    specs.map(specLine).join('\n') +
    `\nVary the framing across the batch — draw inspiration from these angles (do not echo them as text): ${variation.angles.join(' · ')}.` +
    `\nBatch variation seed: ${variation.seed}.`
  )
}

function trimStr(x: unknown): string {
  return typeof x === 'string' ? x.trim() : ''
}

/**
 * Validate one AI sentence pair against its spec. The German MUST contain the
 * reported usedForm and dativeObject (the verb IS the drill), and the English
 * must not leak the German infinitive. Anything malformed rejects the pair.
 */
export function validateDatSentencePair(
  raw: unknown,
  spec: DativeSentenceSpec
): GeneratedDatSentence | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  if (typeof e.index === 'number' && e.index !== spec.index) return null

  const english = trimStr(e.english)
  const german = trimStr(e.german)
  const usedForm = (trimStr(e.usedForm).split(/\s+/)[0] ?? '')
  const dativeObject = trimStr(e.dativeObject)
  if (english.length < 3 || german.length < 3 || usedForm.length < 2 || dativeObject.length < 2) return null

  const lowGerman = german.toLowerCase()
  if (!lowGerman.includes(usedForm.toLowerCase())) return null
  if (!lowGerman.includes(dativeObject.toLowerCase())) return null

  // Leak gate: the English may never contain the target infinitive
  // ('sich nähern' → check 'nähern').
  const head = spec.verb.split(' ').pop()!
  const esc = head.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (new RegExp(`(^|[^a-zäöüß])${esc}($|[^a-zäöüß])`, 'i').test(english)) return null

  return { ...spec, english, german, usedForm, dativeObject }
}

export interface GenerateDatBatchOptions {
  model: string
  specs: DativeSentenceSpec[]
  maxRetries?: number
  rng?: Rng
}

export interface GenerateDatBatchResult {
  sentences: GeneratedDatSentence[]
  failedIndices: number[]
}

/** A short random-ish token for the batch seed (no Date/crypto dependency). */
function makeSeed(rng: Rng): string {
  return Math.floor(rng() * 1_000_000_000).toString(36)
}

/**
 * Ask the AI for a sentence pair per spec, validating each and retrying only
 * the missing/failed specs. Never throws — a spec that never validates is
 * simply listed in failedIndices. Mirrors generateDwSentenceBatch.
 */
export async function generateDatSentenceBatch(
  client: AiClient,
  opts: GenerateDatBatchOptions
): Promise<GenerateDatBatchResult> {
  const rng = opts.rng ?? Math.random
  const maxRetries = opts.maxRetries ?? 2
  const bySpec = new Map(opts.specs.map(s => [s.index, s]))
  const accepted = new Map<number, GeneratedDatSentence>()
  let attempts = 0

  while (accepted.size < opts.specs.length && attempts <= maxRetries) {
    attempts++
    const remaining = opts.specs.filter(s => !accepted.has(s.index))
    const angles = shuffle([...DAT_ANGLE_POOL], Math.max(3, Math.min(6, remaining.length)), rng)
    const prompt = buildDatGeneratePrompt(remaining, { angles, seed: makeSeed(rng) })

    let text = ''
    try {
      const res = await client.models.generateContent({
        model: opts.model,
        contents: prompt,
        config: {
          systemInstruction: DAT_GEN_SYSTEM,
          responseMimeType: 'application/json',
          responseSchema: DAT_GEN_SCHEMA,
          temperature: 0.95,
          topP: 0.95
        }
      })
      text = res.text ?? ''
    } catch {
      continue
    }

    let parsed: unknown
    try { parsed = JSON.parse(text) } catch { continue }
    const items = (parsed as { items?: unknown }).items
    if (!Array.isArray(items)) continue

    for (const raw of items) {
      const idx = typeof (raw as { index?: unknown }).index === 'number'
        ? (raw as { index: number }).index : NaN
      const spec = bySpec.get(idx)
      if (!spec || accepted.has(idx)) continue
      const v = validateDatSentencePair(raw, spec)
      if (v) accepted.set(idx, v)
    }
  }

  const sentences = opts.specs.filter(s => accepted.has(s.index)).map(s => accepted.get(s.index)!)
  const failedIndices = opts.specs.filter(s => !accepted.has(s.index)).map(s => s.index)
  return { sentences, failedIndices }
}

// ──────────────────────────── AI grading ──────────────────────────────
//
// EN→DE only, always WITH error tags. Temperature 0, JSON schema, one retry;
// THROWS if both attempts fail (caller falls back to a local check),
// mirroring gradeDwAnswer / gradeDacAnswer / gradeVerbAnswer.

export interface DatAnswerGrade {
  correct: boolean
  tip: string
  tags: DatErrorTag[]
}

const DAT_ERROR_TAGS: readonly DatErrorTag[] =
  ['case', 'subject', 'twin', 'object-order', 'conjugation', 'word-order', 'noun', 'typo']

const DAT_GRADE_SCHEMA = {
  type: 'object',
  properties: {
    correct: { type: 'boolean' },
    tip: { type: 'string' },
    errorTags: { type: 'array', items: { type: 'string', enum: ['case', 'subject', 'twin', 'object-order', 'conjugation', 'word-order', 'noun', 'typo'] } }
  },
  required: ['correct']
}

const DAT_GRADE_SYSTEM = `You grade a learner's German translation in a DATIVE-VERB drill. Judge the answer against the English sentence and the reference German. The answer is CORRECT when it preserves the meaning, uses the TARGET verb, and is acceptable German — a different word order or a different but correctly dative object phrase is fine. Apply these drill-specific rules:
- The TARGET verb's object must be DATIVE. Accusative (or any other case) where the dative belongs: tag "case". This is the drill's core error — English pulls toward "mich" / "den Mann".
- For experiencer verbs (gefallen, schmecken, fehlen, gelingen, …) the THING must be the nominative subject controlling verb agreement, the person dative. Person-as-subject (*Ich gefalle das Buch) or agreement with the dative (*Die Schuhe gefällt mir): tag "subject".
- If the learner replaced the TARGET verb with an accusative near-synonym (named below when one exists), or bent the sentence around such a twin: incorrect, tag "twin".
- Dative/accusative objects in the wrong sequence: tag "object-order". Verb placement gone wrong (verb-second, verb-final, separable prefix): tag "word-order".
- "conjugation": right verb, wrong form. "noun": a wrong noun. "typo": a small slip elsewhere.
errorTags: multiple allowed; empty when correct. "tip": ONE short English sentence naming what to fix (or reinforcing why the answer is right). Never reveal an unrelated better translation.
Return ONLY JSON in exactly this shape: {"correct": true|false, "tip": "...", "errorTags": ["..."]}
No markdown fences, no commentary.`

export interface DatGradePromptInput {
  spec: GeneratedDatSentence
  answer: string
}

export interface GradeDatOptions extends DatGradePromptInput {
  model: string
}

export function buildDatGradePrompt(opts: DatGradePromptInput): { system: string; user: string } {
  const s = opts.spec
  const entry = DATIVE_VERBS[s.verb]
  const user =
    `ENGLISH (source shown to the learner): ${s.english}\n` +
    `GERMAN (reference translation): ${s.german}\n` +
    `TARGET VERB: "${s.verb}" (dative verb, family ${s.family})\n` +
    (entry?.twin && entry.twin !== s.verb ? `ACCUSATIVE TWIN to reject: "${entry.twin}"\n` : '') +
    `LEARNER'S GERMAN ANSWER: ${opts.answer}`
  return { system: DAT_GRADE_SYSTEM, user }
}

export function parseDatGrade(raw: unknown): DatAnswerGrade | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.correct !== 'boolean') return null
  const tip = typeof r.tip === 'string' ? r.tip.trim() : ''
  const tags = Array.isArray(r.errorTags)
    ? r.errorTags.filter((t): t is DatErrorTag => typeof t === 'string' && (DAT_ERROR_TAGS as readonly string[]).includes(t))
    : []
  return { correct: r.correct, tip, tags }
}

export async function gradeDativeSentence(client: AiClient, opts: GradeDatOptions): Promise<DatAnswerGrade> {
  const { system, user } = buildDatGradePrompt(opts)
  const maxRetries = 1
  let attempts = 0
  let lastError = 'no attempts'
  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model: opts.model,
        contents: user,
        config: { systemInstruction: system, responseMimeType: 'application/json', responseSchema: DAT_GRADE_SCHEMA, temperature: 0 }
      })
      let parsed: unknown
      try { parsed = JSON.parse(response.text ?? '') } catch { lastError = 'malformed JSON'; continue }
      const grade = parseDatGrade(parsed)
      if (grade === null) { lastError = 'validation failed'; continue }
      return grade
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new Error(`gradeDativeSentence exhausted ${attempts} attempts. Last error: ${lastError}`)
}

/** The per-item record stored in run meta for one graded dative sentence. */
export function buildDatDrillItem(
  s: GeneratedDatSentence,
  correct: boolean,
  tags?: DatErrorTag[]
): DatDrillItem {
  const item: DatDrillItem = { verb: s.verb, family: s.family, correct }
  if (tags && tags.length > 0) item.tags = tags
  return item
}
```

- [ ] **Step 6: GREEN.** `npx vitest run tests/composables/useDativeSentenceQuiz.test.ts tests/composables/useQuizHistory.test.ts` → PASS. `npm run typecheck` → PASS (proves no exhaustive registry needed extending — the 13 types were registered in phase 2; this task adds only optional meta).
- [ ] **Step 7: Commit** `feat(dative): T11 pure layer — spec sampling, streaming generation, AI grading with Dative error tags`

---
### Task 7: Weak points — `useDativeStats.ts`

**Files:**
- Create: `src/composables/useDativeStats.ts`
- Test: `tests/composables/useDativeStats.test.ts`

**Interfaces:**
- Consumes: `type DatErrorTag`, `type DatDrillItem`, `type QuizHistoryEntry`, `type QuizHistoryType` from `src/composables/useQuizHistory.ts` (Task 6).
- Produces (Task 8's Setup relies on these exact names): `interface WeakDativeVerb { verb: string; family: string | null; wrong: number; seen: number; score: number }`, `interface DativeWeakPoints { weakVerbs: WeakDativeVerb[]; tagCounts: Record<DatErrorTag, number> }`, `computeDativeWeakPoints(entries: QuizHistoryEntry[]): DativeWeakPoints`, `weakestDativeVerbs(entries: QuizHistoryEntry[], limit?: number): string[]`, `weightedScore(wrong: number, seen: number): number`.

- [ ] **Step 1: Failing tests.** Create `tests/composables/useDativeStats.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { computeDativeWeakPoints, weakestDativeVerbs, weightedScore } from '../../src/composables/useDativeStats'
import type { DatDrillItem, QuizHistoryEntry } from '../../src/composables/useQuizHistory'

function entry(type: string, items: DatDrillItem[]): QuizHistoryEntry {
  return { type, meta: { datSentenceItems: items } } as unknown as QuizHistoryEntry
}
const miss = (verb: string, tags?: DatDrillItem['tags']): DatDrillItem =>
  ({ verb, family: 'co-agent', correct: false, ...(tags ? { tags } : {}) })
const hit = (verb: string): DatDrillItem => ({ verb, family: 'co-agent', correct: true })

describe('computeDativeWeakPoints', () => {
  test('aggregates per verb across runs; only dat-sentence entries count', () => {
    const wp = computeDativeWeakPoints([
      entry('dat-sentence', [miss('helfen', ['case']), hit('danken')]),
      entry('dat-sentence', [miss('helfen', ['case', 'typo'])]),
      entry('dw-sentence', [miss('helfen', ['case'])]),
    ])
    const h = wp.weakVerbs.find(v => v.verb === 'helfen')!
    expect(h.wrong).toBe(2)
    expect(h.seen).toBe(2)
    expect(wp.tagCounts.case).toBe(2)   // the dw-sentence entry is invisible here
    expect(wp.tagCounts.typo).toBe(1)
    const d = wp.weakVerbs.find(v => v.verb === 'danken')!
    expect(d.wrong).toBe(0)
    expect(d.seen).toBe(1)
  })

  test('a noun-only miss never blames the verb (the DW precedent)', () => {
    const wp = computeDativeWeakPoints([entry('dat-sentence', [miss('gefallen', ['noun'])])])
    const g = wp.weakVerbs.find(v => v.verb === 'gefallen')!
    expect(g.wrong).toBe(0)
    expect(g.seen).toBe(1)
    expect(wp.tagCounts.noun).toBe(1)
  })

  test('an untagged miss blames the verb', () => {
    const wp = computeDativeWeakPoints([entry('dat-sentence', [miss('folgen')])])
    expect(wp.weakVerbs.find(v => v.verb === 'folgen')!.wrong).toBe(1)
  })

  test('weightedScore: 1-of-1 wrong scores 0; repeated evidence outranks it', () => {
    expect(weightedScore(1, 1)).toBe(0)
    expect(weightedScore(2, 2)).toBeGreaterThan(0)
  })
})

describe('weakestDativeVerbs', () => {
  const entries = [entry('dat-sentence', [
    miss('helfen', ['case']), miss('helfen', ['case']), hit('helfen'),
    miss('danken', ['case']),
    hit('gefallen'),
  ])]

  test('returns only verbs with misses, worst first', () => {
    const out = weakestDativeVerbs(entries, 8)
    expect(out[0]).toBe('helfen')
    expect(out).toContain('danken')
    expect(out).not.toContain('gefallen')
  })

  test('respects the limit', () => {
    expect(weakestDativeVerbs(entries, 1)).toEqual(['helfen'])
  })
})
```

- [ ] **Step 2: RED.** `npx vitest run tests/composables/useDativeStats.test.ts`.

- [ ] **Step 3: Create `src/composables/useDativeStats.ts`:**

```ts
// Pure weak-point scoring for the Dativ sentence drill (no Vue/DOM/storage).
// Mirrors useDwSentenceStats.computeDwWeakPoints, keyed on the dative VERB.
// Reads the 100-run history window (ADR-0002) — weak points SHOULD decay;
// the lifetime store for "which words do I own" is gt:dativeLedger (ADR-0017),
// not this.

import type { DatErrorTag, DatDrillItem, QuizHistoryEntry, QuizHistoryType } from './useQuizHistory'

export interface WeakDativeVerb { verb: string; family: string | null; wrong: number; seen: number; score: number }
export interface DativeWeakPoints {
  weakVerbs: WeakDativeVerb[]  // score desc
  tagCounts: Record<DatErrorTag, number>
}

export const DAT_SENTENCE_TYPES = new Set<QuizHistoryType>(['dat-sentence'])
// A miss blames the verb unless it was purely the noun's fault — the same
// precedent as da-compounds and direction-words: 'noun' never counts against
// the drilled item.
const DAT_FAULT_TAGS: DatErrorTag[] = ['case', 'subject', 'twin', 'object-order', 'conjugation', 'word-order', 'typo']

/** Error-rate weighted by log of attempts (1-of-1 wrong → 0). */
export function weightedScore(wrong: number, seen: number): number {
  return seen > 0 ? (wrong / seen) * Math.log(seen) : 0
}

function emptyTagCounts(): Record<DatErrorTag, number> {
  return { 'case': 0, 'subject': 0, 'twin': 0, 'object-order': 0, 'conjugation': 0, 'word-order': 0, 'noun': 0, 'typo': 0 }
}

function byScoreDesc(a: WeakDativeVerb, b: WeakDativeVerb): number {
  if (b.score !== a.score) return b.score - a.score
  if (b.wrong !== a.wrong) return b.wrong - a.wrong
  return b.seen - a.seen
}

export function computeDativeWeakPoints(entries: QuizHistoryEntry[]): DativeWeakPoints {
  const verbMap = new Map<string, WeakDativeVerb>()
  const tagCounts = emptyTagCounts()

  for (const entry of entries) {
    if (!DAT_SENTENCE_TYPES.has(entry.type)) continue
    const items: DatDrillItem[] = entry.meta.datSentenceItems ?? []
    for (const item of items) {
      const tags = item.tags
      const hasTags = Array.isArray(tags) && tags.length > 0
      const blamesVerb = !item.correct && (hasTags ? tags!.some(t => DAT_FAULT_TAGS.includes(t)) : true)

      if (item.verb) {
        let v = verbMap.get(item.verb)
        if (!v) {
          v = { verb: item.verb, family: item.family ?? null, wrong: 0, seen: 0, score: 0 }
          verbMap.set(item.verb, v)
        }
        v.seen++
        if (blamesVerb) v.wrong++
      }

      if (hasTags) for (const t of tags!) tagCounts[t]++
    }
  }

  const weakVerbs = [...verbMap.values()]
  for (const v of weakVerbs) v.score = weightedScore(v.wrong, v.seen)
  weakVerbs.sort(byScoreDesc)

  return { weakVerbs, tagCounts }
}

/** The remedial pool: verbs with at least one blamed miss, worst first. */
export function weakestDativeVerbs(entries: QuizHistoryEntry[], limit = 8): string[] {
  return computeDativeWeakPoints(entries).weakVerbs
    .filter(v => v.wrong > 0)
    .slice(0, limit)
    .map(v => v.verb)
}
```

- [ ] **Step 4: GREEN + typecheck.** `npx vitest run tests/composables/useDativeStats.test.ts` → PASS; `npm run typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(dative): useDativeStats weak points over the 100-run window`

---

### Task 8: T11 drill — Satzübersetzung (`dat-sentence`, the module's only AI drill)

**Files:**
- Create: `src/modules/dative/DativeSentenceSetup.vue`, `src/modules/dative/DativeSentenceRunner.vue`
- Modify: `src/router.ts` (2 routes)
- Test: `tests/modules/dative/DativeSentenceRunner.test.ts`

**Interfaces:**
- Consumes: everything Task 6/7 produced; `DATIVE_FAMILIES`, `FAMILY_LABELS`, `type DativeFamily` (phase 2, `useDativeDrill.ts`); `dativeVerbsBy` (phase 1); `planRampBatches`, `generateProgressively` (useProgressiveGenerator); `resolveAiClient` (localClaude); `useSettings` (`canUseAi`, `settings.model`); `checkSentence` (useSentenceQuiz — the offline fallback); `saveQuizRun`; `bumpDativeLedger` (phase 2 — T11 IS a ledger drill, see Global Constraints); `useToast`, `useSound`, `RetryModal`, `QuizProgress`.
- Produces: routes `dative-sentence` / `dative-sentence-run`; records type `'dat-sentence'` with `meta.datSentenceItems`; sessionStorage stash key `datSentenceStash`, localStorage setup key `datSentenceSetup`; the weak-verb remedial entry point (Schwerpunkt toggle + `?focus=weak` deep link).

- [ ] **Step 1: Failing runner test.** Create `tests/modules/dative/DativeSentenceRunner.test.ts` — the exact mocking pattern of `tests/modules/direction-words/SentenceRunner.test.ts` (hoisted `generateContentMock` discriminating grading calls by the literal `LEARNER'S GERMAN ANSWER` marker; mocked `useSettings`; mocked `saveQuizRun`; plus a ledger mock):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DativeSentenceRunner from '../../../src/modules/dative/DativeSentenceRunner.vue'
import type { DativeSentenceSpec } from '../../../src/composables/useDativeSentenceQuiz'

const STASH_KEY = 'datSentenceStash'

const { generateContentMock } = vi.hoisted(() => ({ generateContentMock: vi.fn() }))

vi.mock('../../../src/composables/localClaude', () => ({
  resolveAiClient: () => ({ models: { generateContent: generateContentMock } })
}))

vi.mock('../../../src/composables/useSettings', async () => {
  const vue = await import('vue')
  return {
    useSettings: () => ({
      settings: vue.ref({
        id: 'singleton', geminiApiKey: 'AIzaTest', model: 'gemini-test',
        aiProvider: 'gemini', localClaudeModel: 'sonnet', localClaudeEffort: 'low'
      }),
      canUseAi: vue.computed(() => true),
      load: async () => {}
    })
  }
})

vi.mock('../../../src/composables/useQuizHistory', () => ({ saveQuizRun: vi.fn() }))
vi.mock('../../../src/composables/useDativeLedger', () => ({ bumpDativeLedger: vi.fn() }))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'
import { bumpDativeLedger } from '../../../src/composables/useDativeLedger'

const SPEC: DativeSentenceSpec = { index: 0, verb: 'helfen', family: 'co-agent' }
const GEN_ENGLISH = 'I help my mother in the kitchen every evening.'
const GEN_GERMAN = 'Ich helfe meiner Mutter jeden Abend in der Küche.'
const GRADE_TIP = 'helfen takes the dative: meiner Mutter, not meine Mutter.'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dative/sentence/run', name: 'dative-sentence-run', component: { template: '<div />' } },
      { path: '/dative/sentence', name: 'dative-sentence', component: { template: '<div />' } },
      { path: '/dative', name: 'dative', component: { template: '<div />' } }
    ]
  })
}

async function mountRunner() {
  const router = makeRouter()
  await router.push({ name: 'dative-sentence-run' })
  const wrapper = mount(DativeSentenceRunner, { global: { plugins: [router] } })
  await flushPromises()
  await flushPromises()
  return { wrapper, router }
}

async function submitWrongAnswer(wrapper: ReturnType<typeof mount>) {
  const textarea = wrapper.find('textarea')
  await textarea.setValue('Ich helfe meine Mutter jeden Abend.')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  await flushPromises()
}

describe('DativeSentenceRunner (T11 AI sentence translation)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.mocked(saveQuizRun).mockClear()
    vi.mocked(bumpDativeLedger).mockClear()
    generateContentMock.mockReset()
    generateContentMock.mockImplementation(async (params: Record<string, unknown>) => {
      const contents = String(params.contents ?? '')
      if (contents.includes("LEARNER'S GERMAN ANSWER")) {
        return { text: JSON.stringify({ correct: false, tip: GRADE_TIP, errorTags: ['case'] }) }
      }
      return {
        text: JSON.stringify({
          items: [{ index: 0, english: GEN_ENGLISH, german: GEN_GERMAN, usedForm: 'helfe', dativeObject: 'meiner Mutter' }]
        })
      }
    })
    sessionStorage.setItem(STASH_KEY, JSON.stringify({ specs: [SPEC], families: ['co-agent'], focus: 'all' }))
  })

  it('renders the generated English sentence', async () => {
    const { wrapper } = await mountRunner()
    expect(wrapper.text()).toContain(GEN_ENGLISH)
  })

  it('on a wrong submit, shows the reference German, the AI tip and a case tag chip', async () => {
    const { wrapper } = await mountRunner()
    await submitWrongAnswer(wrapper)
    expect(wrapper.text()).toContain(GEN_GERMAN)
    expect(wrapper.find('.prep-feedback-tip').text()).toContain('helfen takes the dative')
    expect(wrapper.findAll('.tag-error').some(t => t.text() === 'case')).toBe(true)
  })

  it('records a dat-sentence Run with tagged items and bumps the ledger once, keyed by the verb', async () => {
    const { wrapper } = await mountRunner()
    await submitWrongAnswer(wrapper)
    const finishBtn = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))!
    await finishBtn.trigger('click')

    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dat-sentence',
      meta: expect.objectContaining({
        datSentenceFamilies: ['co-agent'],
        datSentenceFocus: 'all',
        datSentenceItems: expect.arrayContaining([
          expect.objectContaining({ verb: 'helfen', correct: false, tags: expect.arrayContaining(['case']) })
        ])
      })
    }))
    expect(bumpDativeLedger).toHaveBeenCalledTimes(1)
    expect(bumpDativeLedger).toHaveBeenCalledWith('helfen', false, expect.any(Number))
  })

  it('a retry pass records a SECOND Run (AI-family convention) but never re-bumps the ledger', async () => {
    const { wrapper } = await mountRunner()
    await submitWrongAnswer(wrapper)
    const finishBtn = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))!
    await finishBtn.trigger('click')

    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))!
    await retryBtn.trigger('click')
    await flushPromises()
    await submitWrongAnswer(wrapper)
    const finishBtn2 = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))!
    await finishBtn2.trigger('click')

    expect(saveQuizRun).toHaveBeenCalledTimes(2)
    expect(bumpDativeLedger).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: RED.** `npx vitest run tests/modules/dative/DativeSentenceRunner.test.ts` — unresolvable component.

- [ ] **Step 3: Setup.** Create `src/modules/dative/DativeSentenceSetup.vue` with this content (the DW `SentenceSetup.vue` skeleton minus nouns/hints, plus the family chips and the weak-verb focus — the module's remedial entry point):

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'
import { loadHistory } from '../../composables/useQuizHistory'
import { DATIVE_FAMILIES, FAMILY_LABELS, type DativeFamily } from '../../composables/useDativeDrill'
import { dativeVerbsBy } from '../../data/dativeVerbs'
import { buildDativeSentenceSpecs } from '../../composables/useDativeSentenceQuiz'
import { weakestDativeVerbs } from '../../composables/useDativeStats'

const STORAGE_KEY = 'datSentenceSetup'
const STASH_KEY = 'datSentenceStash'
const router = useRouter()
const route = useRoute()
const { settings, canUseAi, load: loadSettings } = useSettings()
const toast = useToast()

const families = ref<DativeFamily[]>([...DATIVE_FAMILIES])
const focus = ref<'all' | 'weak'>('all')
type CountPreset = 10 | 15 | 20 | 25 | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

interface Stored {
  families?: DativeFamily[]; focus?: 'all' | 'weak'
  count?: CountPreset; customCount?: number
}
function loadStored(): Stored | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as Stored : null } catch { return null }
}
function saveStored(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      families: [...families.value], focus: focus.value,
      count: count.value, customCount: customCount.value
    } satisfies Stored))
  } catch { /* ignore */ }
}

const weakVerbs = ref<string[]>([])

onMounted(async () => {
  await loadSettings()
  const s = loadStored()
  if (s) {
    if (Array.isArray(s.families)) families.value = s.families.filter(f => (DATIVE_FAMILIES as readonly string[]).includes(f))
    if (s.focus === 'all' || s.focus === 'weak') focus.value = s.focus
    if (s.count !== undefined) count.value = s.count
    if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
  }
  if (families.value.length === 0) families.value = [...DATIVE_FAMILIES]
  // Remedial deep link: the hub / stats surfaces can send ?focus=weak.
  if (route.query.focus === 'weak') focus.value = 'weak'
  weakVerbs.value = weakestDativeVerbs(loadHistory())
})
watch([families, focus, count, customCount], saveStored, { deep: true })

const effective = computed(() => count.value === 'custom' ? Math.max(1, customCount.value) : count.value)
const familyPool = computed(() => families.value.flatMap(f => dativeVerbsBy(f)))
const weakPool = computed(() => weakVerbs.value.filter(v => familyPool.value.includes(v)))
/** Weak focus narrows the bag to the weakest verbs; with no recorded misses it falls back to the whole pool. */
const effectiveFocus = computed<'all' | 'weak'>(() => focus.value === 'weak' && weakPool.value.length > 0 ? 'weak' : 'all')
const pool = computed(() => effectiveFocus.value === 'weak' ? weakPool.value : familyPool.value)
const canStart = computed(() => canUseAi.value && families.value.length > 0 && pool.value.length > 0)

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v); return i >= 0 ? set.filter((_, j) => j !== i) : [...set, v]
}

function start() {
  if (!canUseAi.value) {
    toast.error(
      settings.value.aiProvider === 'local-claude' ? 'Local Claude not reachable' : 'Gemini API key required',
      { description: 'Set your API key (or pick Local Claude) in Settings before generating sentences.' }
    )
    return
  }
  if (!canStart.value) return
  if (focus.value === 'weak' && weakPool.value.length === 0) {
    toast.info('No weak verbs yet', { description: 'No recorded misses to draw from — drilling the full pool instead.' })
  }
  const specs = buildDativeSentenceSpecs(pool.value, effective.value)
  sessionStorage.setItem(STASH_KEY, JSON.stringify({
    specs,
    families: families.value,
    focus: effectiveFocus.value
  }))
  router.push({ name: 'dative-sentence-run' })
}

function back() { router.push({ name: 'dative' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel XIII · Dativ · Satzübersetzung · Einrichtung</div>
        <h1 class="section-title">Satzübersetzung<em>.</em></h1>
        <p class="section-subtitle">
          The AI writes English around your dative verbs — help, thank, like, follow —
          and you write the German. The grader names what slipped: case, subject, twin, or order.
        </p>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning">
      <span class="alert-label">AI access needed</span>
      Set a Gemini API key, or pick <em>Local Claude (dev)</em>, in Settings.
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Familie · {{ families.length }} of {{ DATIVE_FAMILIES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="families = [...DATIVE_FAMILIES]">All</button>
          <button class="btn btn-quiet" type="button" @click="families = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="f in DATIVE_FAMILIES" :key="f" class="chip" :class="{ selected: families.includes(f) }" @click="families = toggle(families, f)">
          {{ FAMILY_LABELS[f] }}
        </button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Schwerpunkt</div>
      <div class="segmented">
        <button :class="{ active: focus === 'all' }" @click="focus = 'all'">Alle Verben</button>
        <button :class="{ active: focus === 'weak' }" @click="focus = 'weak'">Schwache Verben</button>
      </div>
      <p v-if="focus === 'weak' && weakPool.length > 0" class="micro-mark grading-hint">
        Drills your recorded misses: {{ weakPool.join(', ') }}
      </p>
      <p v-else-if="focus === 'weak'" class="micro-mark grading-hint">
        No recorded misses yet — the round will draw from the full pool.
      </p>
    </div>

    <div class="field">
      <div class="field-label">Number of sentences</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: count === 10 }" @click="count = 10">10</button>
          <button :class="{ active: count === 15 }" @click="count = 15">15</button>
          <button :class="{ active: count === 20 }" @click="count = 20">20</button>
          <button :class="{ active: count === 25 }" @click="count = 25">25</button>
          <button :class="{ active: count === 'custom' }" @click="count = 'custom'">Custom</button>
        </div>
        <input v-if="count === 'custom'" class="input custom-count" type="number" :min="1" :max="50" v-model.number="customCount" />
      </div>
    </div>

    <div v-if="families.length === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>Select at least one semantic family.
    </div>

    <div class="alert alert-info">
      <span class="alert-label">How this drill works</span>
      We sample {{ effective }} spec{{ effective === 1 ? '' : 's' }} — one dative verb each, spread across
      your chosen families — then the AI writes the English sentences one batch at a time. You type the
      German; the AI grades it and tags every slip (case, subject, twin, object order). No word hints:
      choosing the dative verb over its accusative twin is part of the exercise.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button class="btn btn-accent" type="button" :disabled="!canStart" @click="start">
        Start · {{ effective }} sentence{{ effective === 1 ? '' : 's' }} <span aria-hidden="true">→</span>
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Runner.** Create `src/modules/dative/DativeSentenceRunner.vue` with this content (the DW `SentenceRunner.vue` streaming skeleton minus the hint machinery, plus the ledger coupling — `ledgerBumped` is separate from `historySaved` on purpose):

```vue
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { shuffle } from '../../data/pool'
import { checkSentence } from '../../composables/useSentenceQuiz'
import {
  generateDatSentenceBatch, gradeDativeSentence, buildDatDrillItem,
  type GeneratedDatSentence, type DativeSentenceSpec, type DatErrorTag
} from '../../composables/useDativeSentenceQuiz'
import type { DativeFamily } from '../../composables/useDativeDrill'
import { planRampBatches, generateProgressively } from '../../composables/useProgressiveGenerator'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { bumpDativeLedger } from '../../composables/useDativeLedger'
import { useSettings } from '../../composables/useSettings'
import { resolveAiClient } from '../../composables/localClaude'
import { useToast } from '../../composables/useToast'
import { useSound } from '../../composables/useSound'
import RetryModal from '../../components/RetryModal.vue'
import QuizProgress from '../../components/QuizProgress.vue'

const STASH_KEY = 'datSentenceStash'
const router = useRouter()
const { settings, load: loadSettings } = useSettings()
const toast = useToast()
const sound = useSound()
let chimed = false

interface Stash {
  specs: DativeSentenceSpec[]
  families?: DativeFamily[]
  focus?: 'all' | 'weak'
}

/** Per-card grade, kept local (mirrors DwSentenceVerdict in the DW runner). */
interface DatSentenceVerdict {
  index: number
  correct: boolean
  correction: string   // the reference German translation, shown when wrong
  tip?: string
  tags?: DatErrorTag[]
}

const error = ref<string | null>(null)
const expected = ref(0)                                  // requested N
const deck = ref<GeneratedDatSentence[]>([])             // arrival order
const generationDone = ref(false)
const metaInfo = ref<Stash>({ specs: [] })

const answers = ref<string[]>([])
const verdicts = ref<Map<number, DatSentenceVerdict>>(new Map())
const startedAt = ref(0)
const historySaved = ref(false)
// The ledger bumps on the FIRST finish only. The AI family re-records retry
// passes (historySaved resets in retryWrong) but a retry is still practice
// for the ledger — this flag never resets.
const ledgerBumped = ref(false)

const index = ref(0)
const userInput = ref('')
const phase = ref<'input' | 'checking' | 'graded'>('input')
const finished = ref(false)
const awaitingNext = ref(false)                          // outran generation
const inputRef = ref<HTMLTextAreaElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

const ready = computed(() => deck.value.length > 0 || generationDone.value || error.value !== null)
const total = computed(() => expected.value)
const current = computed<GeneratedDatSentence | null>(() => deck.value[index.value] ?? null)
const currentVerdict = computed(() => verdicts.value.get(index.value) ?? null)
const correctCount = computed(() => { let n = 0; for (const v of verdicts.value.values()) if (v.correct) n++; return n })
const wrongAnswered = computed(() => { let n = 0; for (const v of verdicts.value.values()) if (!v.correct) n++; return n })
const generatedTotal = computed(() => deck.value.length)
const wrongCount = computed(() => generatedTotal.value - correctCount.value)
const allCorrect = computed(() => finished.value && wrongCount.value === 0)
const isLastGenerated = computed(() => index.value + 1 >= deck.value.length)

onMounted(async () => {
  await loadSettings()
  let stash: Stash | null = null
  try {
    const raw = sessionStorage.getItem(STASH_KEY)
    if (!raw) { error.value = 'No quiz in this session. Go back to setup.'; return }
    stash = JSON.parse(raw) as Stash
  } catch (e) { error.value = e instanceof Error ? e.message : 'Failed to load.'; return }
  if (!stash || !Array.isArray(stash.specs) || stash.specs.length === 0) { error.value = 'No sentence specs in this session.'; return }

  expected.value = stash.specs.length
  metaInfo.value = stash
  startedAt.value = Date.now()
  answers.value = []

  const client = resolveAiClient(settings.value)
  // Ramp 1 → 2 → 5, then batches of 10 (ADR-0008): fast first paint, efficient tail.
  const batches = planRampBatches(stash.specs, [1, 2, 5], 10)
  generateProgressively<DativeSentenceSpec, GeneratedDatSentence>({
    batches,
    runBatch: async (batch) => {
      const res = await generateDatSentenceBatch(client, { model: settings.value.model, specs: batch, maxRetries: 1 })
      return res.sentences
    },
    onResults: (sentences) => {
      for (const s of sentences) { deck.value.push(s); answers.value.push('') }
      if (!chimed && deck.value.length > 0) { chimed = true; sound.playReady() }
      if (awaitingNext.value) tryAdvance()
      nextTick(() => { if (deck.value.length === sentences.length) inputRef.value?.focus() })
    },
    concurrency: 4
  }).finally(() => {
    generationDone.value = true
    if (deck.value.length === 0) error.value = 'The model returned no usable sentences. Go back and try again.'
    if (awaitingNext.value) tryAdvance()
  })
})

async function submit() {
  if (!current.value || phase.value !== 'input') return
  if (userInput.value.trim().length === 0) return
  const i = index.value
  const s = current.value
  phase.value = 'checking'
  let verdict: DatSentenceVerdict
  try {
    const grade = await gradeDativeSentence(resolveAiClient(settings.value), {
      model: settings.value.model,
      spec: s,
      answer: userInput.value
    })
    verdict = { index: i, correct: grade.correct, correction: s.german, tip: grade.tip, tags: grade.tags }
  } catch {
    verdict = { index: i, correct: checkSentence(userInput.value, s.german), correction: s.german }
    toast.info('Graded offline', { description: 'The AI grader was unreachable, so this answer was checked by exact match.' })
  }
  answers.value[i] = userInput.value
  verdicts.value.set(i, verdict)
  verdicts.value = new Map(verdicts.value) // trigger reactivity
  phase.value = 'graded'
  nextTick(() => nextBtnRef.value?.focus())
}

function finishQuiz() {
  finished.value = true
  awaitingNext.value = false
  if (historySaved.value) return
  historySaved.value = true
  const finishedAt = Date.now()
  // Item ledger (ADR-0017): T11's drilled unit IS a ledger item — one
  // encounter per generated card, keyed by the dative verb. First pass only;
  // retry passes record Runs but never re-bump.
  if (!ledgerBumped.value) {
    ledgerBumped.value = true
    for (let i = 0; i < deck.value.length; i++) {
      bumpDativeLedger(deck.value[i].verb, verdicts.value.get(i)?.correct ?? false, finishedAt)
    }
  }
  const items = deck.value.map((s, i) => buildDatDrillItem(s, verdicts.value.get(i)?.correct ?? false, verdicts.value.get(i)?.tags))
  saveQuizRun({
    type: 'dat-sentence',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: generatedTotal.value,
    correct: correctCount.value,
    meta: {
      datSentenceFamilies: metaInfo.value.families,
      datSentenceFocus: metaInfo.value.focus,
      datSentenceItems: items
    }
  })
}

/** Move to the next card, or wait for generation, or finish. */
function tryAdvance() {
  if (index.value + 1 < deck.value.length) {
    index.value++
    userInput.value = ''
    phase.value = 'input'
    awaitingNext.value = false
    nextTick(() => inputRef.value?.focus())
  } else if (generationDone.value) {
    finishQuiz()
  } else {
    awaitingNext.value = true // wait; onResults/finally will re-call tryAdvance
  }
}

function next() {
  if (phase.value !== 'graded') return
  tryAdvance()
}

function onEnter(e: KeyboardEvent) {
  if (e.shiftKey) return // allow a literal newline in the textarea
  e.preventDefault()
  if (phase.value === 'input') submit()
  else if (phase.value === 'graded') next()
}

// AI-family precedent (dw/dac/verb sentence runners): retrying the wrong items
// resets historySaved so finishQuiz() records a SECOND 'dat-sentence' Run for
// the retry pass — deliberately different from the deterministic Dativ drills
// (T1–T10, T12, T13), which never re-record. ledgerBumped stays true: the
// ledger counts first encounters only.
function retryWrong() {
  const wrong = deck.value.filter((_, i) => !verdicts.value.get(i)?.correct)
  if (wrong.length === 0) return
  deck.value = shuffle(wrong)
  answers.value = deck.value.map(() => '')
  verdicts.value = new Map()
  expected.value = deck.value.length
  generationDone.value = true
  index.value = 0; userInput.value = ''; phase.value = 'input'; finished.value = false
  startedAt.value = Date.now(); historySaved.value = false
  nextTick(() => inputRef.value?.focus())
}

function newQuiz() { router.push({ name: 'dative-sentence' }) }
function endQuiz() { router.push({ name: 'dative' }) }

// If we were waiting and generation delivered more (or finished), advance.
watch([deck, generationDone], () => { if (awaitingNext.value) tryAdvance() }, { deep: true })
</script>

<template>
  <div v-if="!ready" class="page loading-state"><div class="micro-mark">Generating the first sentence…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="endQuiz">← Back</button>
  </div>

  <!-- Result -->
  <div v-else-if="finished" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel XIII · Dativ · Satzübersetzung · Auswertung</div>
        <h1 class="section-title">{{ correctCount }} / {{ generatedTotal }}<em>.</em></h1>
        <p v-if="allCorrect" class="section-subtitle">Alles richtig!</p>
        <p v-else class="section-subtitle">{{ wrongCount }} to fix. Reference translations and notes below.</p>
        <p v-if="generatedTotal < expected" class="section-subtitle">Generated {{ generatedTotal }} of {{ expected }} — some sentences failed to generate.</p>
      </div>
    </header>

    <div class="result-rows">
      <div v-for="(s, i) in deck" :key="i" class="ai-result-row" :class="{ good: verdicts.get(i)?.correct, bad: !verdicts.get(i)?.correct }">
        <div class="rr-head">
          <span class="rr-mark">{{ verdicts.get(i)?.correct ? '✓' : '✗' }}</span>
          <span class="rr-en">{{ s.english }}</span>
          <span class="rr-tags">
            <span v-for="t in verdicts.get(i)?.tags" :key="t" class="tag tag-error">{{ t }}</span>
          </span>
        </div>
        <div class="rr-you" :class="{ 'rr-you-empty': !answers[i]?.trim() }"><span class="rr-label">You</span> {{ answers[i]?.trim() || '— (blank)' }}</div>
        <div v-if="!verdicts.get(i)?.correct" class="rr-ref"><span class="rr-label">Answer</span> {{ verdicts.get(i)?.correction || s.german }}</div>
        <div v-if="!verdicts.get(i)?.correct && verdicts.get(i)?.tip" class="rr-tip"><span class="rr-label">Tip</span> {{ verdicts.get(i)?.tip }}</div>
      </div>
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="endQuiz">← Dativ</button>
      <div class="result-cta">
        <button v-if="wrongCount > 0" class="btn btn-quiet" type="button" @click="retryWrong">Retry {{ wrongCount }} wrong</button>
        <button class="btn btn-accent" type="button" @click="newQuiz">New quiz <span aria-hidden="true">→</span></button>
      </div>
    </div>
    <RetryModal :wrong-count="wrongCount" item-label="sentences" @retry="retryWrong" />
  </div>

  <!-- One sentence per step -->
  <div v-else class="page">
    <div class="quiz-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ index + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <QuizProgress class="sentence-progress" :correct="correctCount" :wrong="wrongAnswered" :total="total" :current-index="index" />

      <div v-if="awaitingNext" class="prompt-card"><div class="micro-mark">Preparing next sentence…</div></div>

      <template v-else-if="current">
        <div class="prompt-card">
          <div class="en-sentence">{{ current.english }}</div>
          <div class="en-hint">Translate into German — the right dative verb is part of the answer.</div>
        </div>

        <form class="prep-input-wrap" @submit.prevent="submit">
          <textarea ref="inputRef" class="input prep-input" rows="2" placeholder="Deutsch…" v-model="userInput"
            :readonly="phase !== 'input'" autocomplete="off" spellcheck="false" @keydown.enter="onEnter"
            :class="{ ok: phase === 'graded' && currentVerdict?.correct, err: phase === 'graded' && currentVerdict && !currentVerdict.correct }"></textarea>
          <button v-if="phase === 'input'" type="submit" class="btn btn-accent" :disabled="userInput.trim().length === 0">Submit</button>
          <button v-else-if="phase === 'checking'" type="button" class="btn btn-accent" disabled>Checking…</button>
          <button v-else ref="nextBtnRef" type="button" class="btn btn-accent" @click="next">{{ (isLastGenerated && generationDone) ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
        </form>

        <div v-if="phase === 'graded' && currentVerdict" class="prep-feedback">
          <span class="prep-feedback-mark" :class="currentVerdict.correct ? 'prep-feedback-ok' : 'prep-feedback-bad'">{{ currentVerdict.correct ? '✓ Richtig.' : '✗ Nicht ganz.' }}</span>
          <span class="prep-feedback-full">{{ currentVerdict.correction || current.german }}</span>
          <span v-if="currentVerdict.tip" class="prep-feedback-tip">💡 {{ currentVerdict.tip }}</span>
          <span v-if="currentVerdict.tags?.length" class="prep-feedback-tags">
            <span v-for="t in currentVerdict.tags" :key="t" class="tag tag-error">{{ t }}</span>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.quiz-meta { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
.quiz-counter { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mute); }
.prompt-card { text-align: center; }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; gap: 16px; }
@media (max-width: 720px) { .setup-actions { flex-direction: column-reverse; align-items: stretch; } .setup-actions .btn { justify-content: center; } }
</style>
```

- [ ] **Step 5: Routes.** After the Task-5 pair in `src/router.ts`:

```ts
  { path: '/dative/sentence', name: 'dative-sentence', component: () => import('./modules/dative/DativeSentenceSetup.vue') },
  { path: '/dative/sentence/run', name: 'dative-sentence-run', component: () => import('./modules/dative/DativeSentenceRunner.vue') },
```

Catalogue already carries T11 (`dative-sentence`, family IX, `ai: true` — the hub renders the ochre `[AI]` LevelChip from it) — do not touch it.

- [ ] **Step 6: GREEN.** `npx vitest run tests/modules/dative/DativeSentenceRunner.test.ts tests/data/drillCatalogue.test.ts` → PASS; `npm run typecheck` → PASS.
- [ ] **Step 7: Live smoke-test note.** AI runtime behaviour is not unit-testable (ADR-0008); the controller's wrap-up drives one real T11 round against the dev server. Do not attempt it inside this task.
- [ ] **Step 8: Commit** `feat(dative): T11 Satzübersetzung — streaming AI drill with weak-verb focus (family IX)`

---
### Task 9: Card A — `DativeCheatsheet.vue`

**Files:**
- Create: `src/modules/dative/DativeCheatsheet.vue`
- Modify: `src/router.ts` (1 route, no `-run`)
- Test: `tests/modules/dative/DativeCheatsheet.test.ts`

**Interfaces:**
- Consumes: `DATIVE_VERBS`, `DATIVE_VERB_KEYS`, `dativeVerbsBy` (phase 1); `DATIVE_ADJECTIVES`, `DATIVE_ADJECTIVE_KEYS` (phase 1); `TWIN_PAIRS`, `type TwinPair` (phase 3 — the `contrast` lines were authored as cheatsheet table rows); `OBJECT_ORDER_ITEMS`, `objectOrderAnswer` (phase 3 — the example sentences are derived through the executable rule, never re-typed); `DATIVE_FAMILIES`, `FAMILY_LABELS`, `type DativeFamily` (phase 2). Route names cross-linked: `prepositions`, `prepositions-cheatsheet`, `declension`, `verbs` (all exist in `src/router.ts`).
- Produces: route `dative-cheatsheet`. The module deliberately does NOT re-teach dative prepositions or dative morphology (spec Scope table) — plate X cross-links out instead of restating.

- [ ] **Step 1: Failing smoke test.** Create `tests/modules/dative/DativeCheatsheet.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DativeCheatsheet from '../../../src/modules/dative/DativeCheatsheet.vue'
import { TWIN_PAIRS } from '../../../src/data/dativeTwins'
import { DATIVE_ADJECTIVE_KEYS } from '../../../src/data/dativeAdjectives'

function makeRouter() {
  const stub = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dative/cheatsheet', name: 'dative-cheatsheet', component: stub },
      { path: '/dative', name: 'dative', component: stub },
      { path: '/prepositions', name: 'prepositions', component: stub },
      { path: '/prepositions/cheatsheet', name: 'prepositions-cheatsheet', component: stub },
      { path: '/declension', name: 'declension', component: stub },
      { path: '/verbs', name: 'verbs', component: stub },
    ],
  })
}

describe('DativeCheatsheet (card A)', () => {
  it('renders the ten plates with the load-bearing rules, tables, and cross-links', async () => {
    const router = makeRouter()
    await router.push({ name: 'dative-cheatsheet' })
    const wrapper = mount(DativeCheatsheet, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.findAll('.plate').length).toBeGreaterThanOrEqual(10)
    const text = wrapper.text()
    // The passive rule, both sides of it.
    expect(text).toContain('Mir wird geholfen')
    expect(text).toContain('Ich werde geholfen')
    // Object order, derived through objectOrderAnswer.
    expect(text).toContain('Ich gebe dem Kind das Buch')
    expect(text).toContain('Ich gebe es ihm')
    // Swallowed-accusative table and the twin table (from the phase 1/3 banks).
    expect(text).toContain('danken')
    for (const p of TWIN_PAIRS) expect(text).toContain(p.dativeVerb)
    // Adjectives listed from the side-table.
    for (const k of DATIVE_ADJECTIVE_KEYS.slice(0, 3)) expect(text).toContain(k)
    // The free-dative readings.
    expect(text).toContain('commodi')
    expect(text).toContain('Sei mir bloß vorsichtig!')

    // Cross-links out (the spec's Scope table): Prepositions + Declension.
    const hrefs = wrapper.findAll('a').map(a => a.attributes('href'))
    expect(hrefs).toContain('/prepositions/cheatsheet')
    expect(hrefs).toContain('/declension')
  })
})
```

- [ ] **Step 2: RED.** `npx vitest run tests/modules/dative/DativeCheatsheet.test.ts` — unresolvable component.

- [ ] **Step 3: Create `src/modules/dative/DativeCheatsheet.vue`** (the Direction Words cheatsheet's self-contained plate pattern — `src/modules/direction-words/DirectionWordsCheatsheet.vue`; the `plate`/`mini-table` classes are global styles):

```vue
<script setup lang="ts">
import { DATIVE_VERBS, DATIVE_VERB_KEYS, dativeVerbsBy } from '../../data/dativeVerbs'
import { DATIVE_ADJECTIVES, DATIVE_ADJECTIVE_KEYS } from '../../data/dativeAdjectives'
import { TWIN_PAIRS, type TwinPair } from '../../data/dativeTwins'
import { OBJECT_ORDER_ITEMS, objectOrderAnswer } from '../../data/dativeDitransitive'
import { DATIVE_FAMILIES, FAMILY_LABELS, type DativeFamily } from '../../composables/useDativeDrill'

// I — the dative map: three semantic families, straight from the side-table.
const FAMILY_GLOSS: Record<DativeFamily, string> = {
  'recipient': 'jemand bekommt etwas — oft steckt das Etwas schon im Verb',
  'experiencer': 'die Sache ist Subjekt; der Mensch erlebt sie nur',
  'co-agent': 'zwei Beteiligte in einer Szene — Aktion und Reaktion',
}
const familyCols = DATIVE_FAMILIES.map(f => ({
  family: f,
  label: FAMILY_LABELS[f],
  gloss: FAMILY_GLOSS[f],
  verbs: dativeVerbsBy(f),
}))
function pull(verb: string): boolean { return DATIVE_VERBS[verb]?.englishPull === true }

// II — the swallowed-accusative hook, derived (never set on experiencer entries).
const swallowedRows = DATIVE_VERB_KEYS
  .filter(k => DATIVE_VERBS[k].swallowed)
  .map(k => ({ verb: k, hook: DATIVE_VERBS[k].swallowed! }))

// III — the inverted experiencers.
const experiencerVerbs = dativeVerbsBy('experiencer')

// IV — twin table rows; the contrast lines are authored in the phase 3 bank.
function twinLabel(p: TwinPair): string {
  if (p.twinParticle) return `${p.dativeVerb} | ${p.twin} ${p.twinParticle}`
  if (p.dativeVerb === p.twin) return `${p.dativeVerb} +Dat | +Akk`
  return `${p.dativeVerb} | ${p.twin}`
}

// V — object order, derived through the executable rule so the cheatsheet can
// never contradict the T8 drill.
const ORDER_KINDS = [
  { kind: 'nn' as const, label: 'Nomen + Nomen', rule: 'Dativ vor Akkusativ' },
  { kind: 'pp' as const, label: 'Pronomen + Pronomen', rule: 'Akkusativ vor Dativ' },
  { kind: 'mixed' as const, label: 'Pronomen + Nomen', rule: 'Pronomen zuerst' },
]
const orderRows = ORDER_KINDS.map(k => {
  const item = OBJECT_ORDER_ITEMS.find(i => i.kind === k.kind)!
  return { ...k, sentence: `${item.stem} ${objectOrderAnswer(item)}${item.punct}` }
})

// VI — the three free-dative readings (CONTEXT.md's canonical examples).
const FREE_ROWS = [
  { reading: 'commodi', de: 'Vorteil', example: 'Ich trage dir den Koffer.', test: 'Ich trage den Koffer. — bleibt korrekt' },
  { reading: 'possessivus', de: 'Besitz (Pertinenzdativ)', example: 'Wasch dir die Hände!', test: 'Wasch die Hände! — bleibt korrekt' },
  { reading: 'ethicus', de: 'Anteilnahme', example: 'Sei mir bloß vorsichtig!', test: 'Sei bloß vorsichtig! — bleibt korrekt' },
]

// VIII — reflexive dative minimal pairs.
const REFLEXIVE_ROWS = [
  { akk: 'Ich wasche mich.', dat: 'Ich wasche mir die Hände.' },
  { akk: 'Ich ziehe mich an.', dat: 'Ich ziehe mir die Schuhe an.' },
  { akk: 'Ich stelle mich vor. (vorstellen = präsentieren)', dat: 'Ich stelle mir das vor. (vorstellen = ausmalen)' },
]

// IX — adjectives from the phase 1 side-table.
const adjectiveRows = DATIVE_ADJECTIVE_KEYS.map(k => ({ lemma: k, ...DATIVE_ADJECTIVES[k] }))
</script>

<template>
  <div class="page">
    <header class="section-header cheatsheet-section-header">
      <div>
        <div class="breadcrumb">Kapitel XIII · Dativ · Spickzettel</div>
        <h1 class="section-title">Der Dativ<em>.</em></h1>
        <p class="section-subtitle">
          An affected person, marked on the verb. The map by semantic family, the swallowed
          accusative, the twins, the orders, the free datives — and where the rest lives.
        </p>
      </div>
      <router-link :to="{ name: 'dative' }" class="btn btn-ghost back-link">← Dativ</router-link>
    </header>

    <section id="dat-map" class="plate">
      <div class="plate-h">
        <span class="plate-n">I</span>
        <h2 class="plate-t">The dative map</h2>
        <span class="plate-de">Drei Familien</span>
      </div>
      <div class="plate-b">
        <p>
          The dative marks an <strong>affected person</strong>. Membership is memorized per verb —
          but three readings organize the whole set. Verbs marked ↯ carry the
          <strong>English pull</strong>: their English twin is plain transitive
          (<em>help, thank, follow, answer, trust</em>), and your hand reaches for the accusative.
        </p>
        <div class="dat-fam-grid">
          <div v-for="col in familyCols" :key="col.family" class="dat-fam-col">
            <div class="dat-fam-h">{{ col.label }}</div>
            <div class="dat-fam-gloss">{{ col.gloss }}</div>
            <div class="dat-fam-verbs">
              <span v-for="v in col.verbs" :key="v" class="dat-verb">{{ v }}<template v-if="pull(v)"> ↯</template></span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="dat-swallowed" class="plate">
      <div class="plate-h">
        <span class="plate-n">II</span>
        <h2 class="plate-t">The swallowed accusative</h2>
        <span class="plate-de">Der verschluckte Akkusativ</span>
      </div>
      <div class="plate-b">
        <p>
          Why is there no accusative? Because the verb already <strong>ate it</strong>:
          <em>antworten</em> = give [an answer] to somebody. The direct object was absorbed
          into the verb; the person was always the indirect object — and stays dative.
          The hook never applies to the experiencer family.
        </p>
        <table class="mini-table">
          <tbody>
            <tr v-for="row in swallowedRows" :key="row.verb">
              <td class="t-de">{{ row.verb }}</td>
              <td class="t-it">{{ row.hook }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="dat-inverted" class="plate">
      <div class="plate-h">
        <span class="plate-n">III</span>
        <h2 class="plate-t">Inverted experiencers</h2>
        <span class="plate-de">Umgekehrte Verben</span>
      </div>
      <div class="plate-b">
        <p>
          <strong>Die Schuhe gefallen mir.</strong> The thing is the nominative subject and
          controls agreement; the person is dative. Two errors live here, and both are wrong:
          <em>*Ich gefalle das Buch</em> (person taken as subject) and
          <em>*Die Schuhe gefällt mir</em> (verb agreeing with the dative).
        </p>
        <p class="dat-verblist">
          <span v-for="v in experiencerVerbs" :key="v" class="dat-verb">{{ v }}</span>
        </p>
      </div>
    </section>

    <section id="dat-twins" class="plate">
      <div class="plate-h">
        <span class="plate-n">IV</span>
        <h2 class="plate-t">Twin verbs</h2>
        <span class="plate-de">Zwillinge</span>
      </div>
      <div class="plate-b">
        <p>
          Near-synonyms on opposite sides of the case line — usually the prefix eats the dative:
          <em>antworten + Dat</em> but <em>beantworten + Akk</em>.
        </p>
        <table class="mini-table">
          <tbody>
            <tr v-for="p in TWIN_PAIRS" :key="p.pairId">
              <td class="t-de">{{ twinLabel(p) }}</td>
              <td class="t-it">{{ p.contrast }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="dat-order" class="plate">
      <div class="plate-h">
        <span class="plate-n">V</span>
        <h2 class="plate-t">Two objects and their order</h2>
        <span class="plate-de">Objektfolge</span>
      </div>
      <div class="plate-b">
        <p>
          Ditransitives (<em>geben, schenken, erklären</em>) keep the person dative and the thing
          accusative — that part is predictable. The trap is the sequence:
        </p>
        <table class="mini-table">
          <thead>
            <tr><th>Konstellation</th><th>Regel</th><th>Beispiel</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in orderRows" :key="r.kind">
              <td class="t-it">{{ r.label }}</td>
              <td class="t-mono">{{ r.rule }}</td>
              <td class="t-ex">{{ r.sentence }}</td>
            </tr>
          </tbody>
        </table>
        <p>
          Never <em>*Ich gebe ihm es</em> — two pronouns always flip to accusative-first.
        </p>
      </div>
    </section>

    <section id="dat-free" class="plate">
      <div class="plate-h">
        <span class="plate-n">VI</span>
        <h2 class="plate-t">Free datives</h2>
        <span class="plate-de">Freier Dativ</span>
      </div>
      <div class="plate-b">
        <p>
          Optional datives the verb never asked for, in three readings. The test:
          <strong>drop it</strong>. A free dative leaves a grammatical sentence behind;
          a dative verb's object does not (<em>*Das Fahrrad gehört</em>).
          The ethicus is near-particle and takes almost only <em>mir/dir</em>.
        </p>
        <table class="mini-table">
          <thead>
            <tr><th>Lesart</th><th>Beispiel</th><th>Probe</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in FREE_ROWS" :key="r.reading">
              <td class="t-mono">{{ r.de }} ({{ r.reading }})</td>
              <td class="t-de">{{ r.example }}</td>
              <td class="t-it">{{ r.test }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="dat-passive" class="plate">
      <div class="plate-h">
        <span class="plate-n">VII</span>
        <h2 class="plate-t">No personal passive</h2>
        <span class="plate-de">Kein persönliches Passiv</span>
      </div>
      <div class="plate-b">
        <p>
          With no accusative object, nothing can become a passive subject. So:
          <strong>Mir wird geholfen</strong> — or with the position-1 placeholder,
          <strong>Es wird mir geholfen</strong> — and never <em>*Ich werde geholfen</em>.
        </p>
        <p>
          The dative survives, the verb freezes in the 3rd person singular
          (<em>Den Kindern <strong>wird</strong> geholfen</em>, never <em>*werden</em>),
          and the dummy <em>es</em> vanishes as soon as anything else takes first position:
          <em>Jetzt wird mir geholfen</em>, not <em>*Jetzt wird es mir geholfen</em>.
        </p>
      </div>
    </section>

    <section id="dat-reflexive" class="plate">
      <div class="plate-h">
        <span class="plate-n">VIII</span>
        <h2 class="plate-t">Reflexive dative</h2>
        <span class="plate-de">Reflexiver Dativ</span>
      </div>
      <div class="plate-b">
        <p>
          When an accusative object is already in the sentence, the reflexive pronoun
          moves to the dative — visible only in <em>mir/dir</em> against <em>mich/dich</em>.
        </p>
        <table class="mini-table">
          <thead>
            <tr><th>Reflexiv = Objekt (Akk)</th><th>Objekt schon da → Reflexiv Dativ</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in REFLEXIVE_ROWS" :key="r.dat">
              <td class="t-de">{{ r.akk }}</td>
              <td class="t-de">{{ r.dat }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="dat-adjectives" class="plate">
      <div class="plate-h">
        <span class="plate-n">IX</span>
        <h2 class="plate-t">Dative adjectives</h2>
        <span class="plate-de">Dativ ohne Objekt</span>
      </div>
      <div class="plate-b">
        <p>
          A dozen adjectives mark their person dative with no verb object in sight —
          plus the subjectless body states (<em>Mir ist kalt</em>, never <em>*Ich bin kalt</em>
          unless you mean your character).
        </p>
        <table class="mini-table">
          <tbody>
            <tr v-for="a in adjectiveRows" :key="a.lemma">
              <td class="t-de">{{ a.lemma }}<template v-if="a.impersonal"> °</template></td>
              <td class="t-it">{{ a.english }}</td>
              <td class="t-ex">{{ a.example }}</td>
            </tr>
          </tbody>
        </table>
        <p class="micro-mark">° subjectless body state — the dative person is all there is.</p>
      </div>
    </section>

    <section id="dat-elsewhere" class="plate">
      <div class="plate-h">
        <span class="plate-n">X</span>
        <h2 class="plate-t">Where the rest lives</h2>
        <span class="plate-de">Nachschlagen</span>
      </div>
      <div class="plate-b">
        <p>
          This module deliberately does <strong>not</strong> re-teach the rest of the dative
          territory — it is already drilled elsewhere:
        </p>
        <ul class="dat-links">
          <li>
            <strong>Dative prepositions</strong> (<em>aus, bei, mit, nach, seit, von, zu</em>),
            the two-way prepositions and the fixed collocations (<em>Angst vor + Dat</em>) —
            <router-link :to="{ name: 'prepositions' }">Präpositionen</router-link> ·
            <router-link :to="{ name: 'prepositions-cheatsheet' }">deren Spickzettel</router-link>
          </li>
          <li>
            <strong>Dative morphology</strong> — <em>dem/der/den +n</em>, adjective endings,
            pronoun tables — <router-link :to="{ name: 'declension' }">Deklination</router-link>
          </li>
          <li>
            <strong>Which of six cases does a verb govern?</strong> — the Rektion drill in
            <router-link :to="{ name: 'verbs' }">Verben</router-link>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page { max-width: 980px; }
.cheatsheet-section-header { margin-bottom: 48px; }
.back-link { text-decoration: none; border-bottom: 0; }

.dat-fam-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 6px;
}
.dat-fam-h {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--accent);
}
.dat-fam-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--ink-soft);
  margin: 2px 0 10px;
}
.dat-verb {
  display: inline-block;
  font-size: 14px;
  color: var(--ink);
  border: 1px solid var(--hairline);
  border-radius: 3px;
  padding: 2px 8px;
  margin: 0 6px 6px 0;
}
.dat-verblist { margin-top: 8px; }
.dat-links { margin: 8px 0 0; padding-left: 20px; }
.dat-links li { margin-bottom: 10px; }

@media (max-width: 720px) {
  .dat-fam-grid { grid-template-columns: 1fr; }
}
</style>
```

- [ ] **Step 4: Route.** After the Task-8 pair in `src/router.ts`:

```ts
  { path: '/dative/cheatsheet', name: 'dative-cheatsheet', component: () => import('./modules/dative/DativeCheatsheet.vue') },
```

Catalogue already carries card A (`dative-cheatsheet`, `level: 'Ref'`, Reference family) — do not touch it.

- [ ] **Step 5: GREEN.** `npx vitest run tests/modules/dative/DativeCheatsheet.test.ts` → PASS; `npm run typecheck` → PASS.
- [ ] **Step 6: Commit** `feat(dative): card A cheatsheet — the dative map with cross-links out`

---

### Task 10: Whole-module verification — the ladder resolves end to end

**Files:**
- Modify: `tests/data/drillCatalogue.test.ts` (full-ladder route-resolution gate)
- Test: full suite + typecheck + hub render check

**Interfaces:**
- Consumes: everything above; phase 2's `datCards`/`routeNames` fixtures already defined at the top of `tests/data/drillCatalogue.test.ts`.
- Produces: the release gate for the module — all 11 families, all 14 cards, no dead routes.

- [ ] **Step 1: Full-ladder route gate.** Append inside the describe block of `tests/data/drillCatalogue.test.ts` (keep phase 2's T1–T3 test as-is; this supersedes it in coverage):

```ts
  test('the whole Dativ ladder resolves: every card route and every runner route exists', () => {
    expect(routeNames.has('dative')).toBe(true)
    for (const card of datCards) {
      expect(routeNames.has(card.route), card.code).toBe(true)
      if (card.level !== 'Ref') {
        expect(routeNames.has(`${card.route}-run`), `${card.code} runner`).toBe(true)
      }
    }
  })
```

- [ ] **Step 2: Run it.** `npx vitest run tests/data/drillCatalogue.test.ts` → PASS. A failure names the card code whose route is missing — that is a phase 3 (T4–T9) or phase 4 (T10–T13, A) route gap; fix the route, never the catalogue.

- [ ] **Step 3: Full suite.**

Run: `npx vitest run --testTimeout=30000`
Expected: PASS (known ThemeToggle order-dependent flake: if it is the sole failure, rerun to confirm and proceed).

- [ ] **Step 4: Typecheck.**

Run: `npm run typecheck`
Expected: PASS (vue-tsc — plain `tsc` output means nothing here).

- [ ] **Step 5: Hub render check.** Start the dev server (`npm run dev -- --port 5199 --strictPort`, use `localhost` not `127.0.0.1`) and open `/dative`: all 11 family panels (I–X + Reference) render, **zero** "Bald" rows remain, the meter reads the derived denominator, and every one of the 14 rows navigates somewhere real (spot-click T10, T11, T12, T13, and the cheatsheet at minimum; T11's card shows the ochre `[AI]` chip). The Playwright MCP may drive this check; report any dead route as a failure of this task.

- [ ] **Step 6: Commit** `test(dative): whole-ladder route gate — module complete`

---

### Controller wrap-up (not a subagent task)

- [ ] Final whole-branch review — **the German audit of the ~70 newly authored items is the highest-value pass**: every T10 drop-test rewrite really is grammatical, every counterexample really cannot drop its object, every T12 passive keeps `wird` where the correct option claims it, every T13 gap takes exactly the printed pronoun — plus ONE fix wave and a scoped re-review.
- [ ] Live T11 smoke-test (AI runtime is not unit-testable, ADR-0008): one real round from setup → streamed cards → graded answer with tags → result page → retry pass; confirm the ledger meter on `/dative` moved after the main pass only. With the local-claude provider, confirm generation survives the bridge dropping `responseSchema` (the prompt's prose JSON envelope is the safety net).
- [ ] Playwright 390px probe: FreeRunner (3-option classify card), PassiveRunner, ReflexiveRunner, DativeSentenceRunner, the cheatsheet (tables scroll, no horizontal overflow), both themes spot-checked once.
- [ ] Merge per the house ritual; full suite green on merged main; version bump + changelog entry (the module-complete entry — mention the whole ladder T1–T13 + Spickzettel if phases 2–3 shipped unreleased); `npm run deploy` + push per ritual.

---

## Plan self-review (author's check against the spec)

- **Spec coverage:** family VIII → Tasks 1–2 (T10 `dat-free`, gate 6 both halves: exactly-one-classification + counterexample-carried, plus the drop-test invariant); family IX → Tasks 6–8 (T11 `dat-sentence`: specs decided before any AI call per ADR-0004, ramped streaming per ADR-0008, AI grading with the full [Dative error tag] set, recording per ADR-0010, `useDativeStats` weak points per ADR-0002 with the weak-verb focus as the remedial entry point); family X → Tasks 3–5 (T12 `dat-passive` covering all three facets — dative survives / verb frozen 3sg / `es` vanishes when fronted — and T13 `dat-reflexive` with the accusative-object-present rule proven mechanically by the `accObject` gate); card A → Task 9 (map by semantic family, swallowed-accusative hook, twin table, object order, free datives, no-personal-passive, cross-links out to Prepositions and Declension per the Scope table); whole-module gates → Task 10. CONTEXT.md glossary needed no work (phase 1 shipped it); copy uses its terms (`[Semantic family]`, `commodi/possessivus/ethicus`, `wackelig/gesichert`).
- **Band-only rule:** stated in Global Constraints and enforced three times over — `ledgerKey: null` in every T10/T12/T13 builder, no `bumpDativeLedger` import in their runners, and a `not.toHaveBeenCalled()` assertion in each runner test.
- **Pinned interfaces:** only consumed, never redefined — `useDativeQuiz`/`DativeQuizCard` (all three deterministic drills), `DativeDrillLevel`/`DATIVE_DRILL_LEVELS` (every bank), `objectOrderAnswer` + `TWIN_PAIRS` (cheatsheet derivations), `bumpDativeLedger(item, correct, at)` (T11 only), `DATIVE_VERBS`/`DATIVE_VERB_KEYS`/`dativeVerbsBy`, `FAMILY_LABELS`/`DATIVE_FAMILIES`. History types were all registered in phase 2; this plan adds only optional meta fields + `DatErrorTag`/`DatDrillItem`.
- **Type consistency:** `FreeDativeItem`/`FREE_TYPE_LABEL` (Task 1) consumed by Task 2's builder and Task 9's test imports nothing from it (readings hard-coded from CONTEXT.md — deliberate, the cheatsheet must not depend on drill-bank phrasing); `PassiveItem`/`ReflexiveItem`/`REFLEXIVE_CONTRAST_VERBS` (Task 3) consumed in Tasks 4–5; `DativeSentenceSpec`/`GeneratedDatSentence`/`DatAnswerGrade`/`buildDatDrillItem` (Task 6) consumed in Task 8; `WeakDativeVerb`/`weakestDativeVerbs` (Task 7) consumed in Task 8's Setup; `datSentenceItems` meta key consistent across Task 6 (declaration), Task 7 (reader), Task 8 (writer + test).
- **Placeholder scan:** every item bank is authored literally (24 + 24 + 23 items, all German + translations + explanations); every new composable and both T11 components are full listings; the three deterministic Setup/Runner pairs are copy-from-named-file instructions with exhaustive deltas and full `recordRun()` bodies — the phase 2/3 house convention for the Nth mirror of an existing component.
- **Known judgment calls, flagged for the controller:** (1) T11 bumps the ledger — the spec's Data-flow section wires only the deterministic drills to it, but the band-only exclusion list (spec + CONTEXT.md) deliberately omits T11, its drilled unit is a ledger item, and [Secured item] counts encounters "across any drill"; main-pass-only via the `ledgerBumped` flag keeps retry passes out. (2) T12's agreement cards mix in four real personal passives of accusative pool verbs (`fragen`, `abholen`, `einladen`, `kontrollieren`) so `wird/werden` is a genuine decision — the DW T8 one-button-winnable lesson applied. (3) T13 deliberately has no kind filter (same lesson) and its verbs are not cross-ref'd against `VERBS` (ordinary transitives, no pool guarantee); the gate instead proves an accusative object is literally present in every dative-kind prompt.
