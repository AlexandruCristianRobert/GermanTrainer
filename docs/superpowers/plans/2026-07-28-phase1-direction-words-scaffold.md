# Phase 1 — Direction Words Module Scaffold + Cheatsheet + Scene Diagrams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Direction Words module exists as a navigable top-level module (routes, nav tab, home-grid card, section-headed module home) with a complete data-driven cheatsheet and the parametric SVG [Scene diagram] component — Phase 1 of the Direction Words roadmap (spec §7, `docs/superpowers/specs/2026-07-28-direction-words-module-design.md`).

**Architecture:** A new data module `src/data/directionWords.ts` holds the [Adverb pair] table with r-forms, the perspective minimal pairs, the wo/wohin/woher rows, the lexicalized-verb and idiom banks, and the scene-spec types + archetype geometry contract (`SCENE_POSITIONS`) that Phase 2's item banks will conform to. One parametric component `SceneDiagram.vue` renders all six scene archetypes as inline SVG from a `SceneSpec` — `currentColor` line art only, so both themes work with zero extra assets. The cheatsheet is data-driven and reuses the existing cheatsheet chrome (`ChapterNav`, `Callout`, `cheatsheet.css`) exactly like `DaCompoundsCheatsheet.vue`. The module home renders cards grouped under section headings; Phase 1 ships one section (Reference) with one card (Cheatsheet).

**Tech Stack:** Vue 3 `<script setup lang="ts">`, vue-router 4 (flat route table, lazy imports), Vitest + @vue/test-utils (jsdom, memory-history routers), vue-tsc.

## Global Constraints

- Work on branch `feat/phase1-direction-words-scaffold` off `main`; merge back in the final controller step.
- **Route names are hyphen-free**: `directionwords` (home) and `directionwords-cheatsheet` — because `NavShell.vue:35` derives the active nav tab via `name.split('-')[0]` ('direction-words' would yield 'direction' and never highlight). Route *paths* keep the hyphen: `/direction-words`, `/direction-words/cheatsheet`.
- Canonical terminology (CONTEXT.md, section *Direction words*): the word class is **Perspective adverb**; the hin/her twins are an **Adverb pair**; *rein/raus/…* are **R-forms**; *herstellen*-type verbs are **Lexicalized prefix verbs**; the picture is a **Scene diagram**. Module display title: **Direction Words**, German subtitle **hin & her**. Never call the word class "directional adverb" or "direction word" in UI copy ([Direction] means EN→DE/DE→EN elsewhere in the app).
- German content correctness is a shipping gate: a wrong compound or a wrong perspective example teaches wrong German — copy the plan's content verbatim; do not improvise new German sentences.
- **Scene diagrams must be theme-proof**: SVG strokes/fills use `currentColor` (inherited from `var(--ink)`) only — no hardcoded hex colors. The gate check is "all archetypes render in both themes".
- Phone-first: every new page must render cleanly at ~390px (pair table scrolls inside its own wrapper, never the page body).
- Version **1.14.00** (X.YY.ZZ — YY bumps for a new module, like Sprechen's 1.13.00), date 2026-07-28.
- Full gates before merge: `npm run test` green, `npm run typecheck` green. Never touch dist/ (a stale dist/index.html diff is pre-existing) and never touch `GermanVerbTester/` (unrelated untracked directory).
- Commit after every task; end commit messages with:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: Direction-words data module

**Files:**
- Create: `src/data/directionWords.ts`
- Test: `tests/data/directionWords.test.ts`

**Interfaces:**
- Consumes: nothing (self-contained data module).
- Produces (Tasks 2–3 rely on these exact names): `hinForm(element: string): string`, `herForm(element: string): string`, `ADVERB_PAIRS: AdverbPair[]` (`{ element, rForm, gloss }`), `UNPAIRED_ADVERBS: UnpairedAdverb[]` (`{ form, gloss }`), `PERSPECTIVE_PAIRS: PerspectivePair[]` (`{ her, herNote, hin, hinNote }`), `QUESTION_WORDS: QuestionWordRow[]` (`{ word, asksDe, asksEn, example, split }`), `POINTER_WORDS: PointerWord[]` (`{ word, gloss, example }`), `LEXICALIZED_VERBS: LexicalizedVerb[]` (`{ verb, meaning, example }`), `IDIOMS: Idiom[]` (`{ idiom, meaning, example }`), `SCENE_ARCHETYPES: readonly SceneArchetype[]`, `SCENE_POSITIONS: Record<SceneArchetype, [ScenePosition, ScenePosition]>`, `otherPosition(archetype, pos): ScenePosition`, `validSceneSpec(spec): boolean`, types `SceneArchetype`, `ScenePosition`, `SceneSpec`, `DirectionLevel`, `PerspectiveItem`.

- [ ] **Step 1: Write the failing test**

Create `tests/data/directionWords.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import {
  hinForm, herForm, ADVERB_PAIRS, UNPAIRED_ADVERBS,
  PERSPECTIVE_PAIRS, QUESTION_WORDS, POINTER_WORDS,
  LEXICALIZED_VERBS, IDIOMS,
  SCENE_ARCHETYPES, SCENE_POSITIONS, otherPosition, validSceneSpec,
  type SceneSpec,
} from '../../src/data/directionWords'

describe('adverb pairs', () => {
  test('hin-/her- forms derive from the element', () => {
    expect(hinForm('ein')).toBe('hinein')
    expect(herForm('ein')).toBe('herein')
    expect(hinForm('unter')).toBe('hinunter')
    expect(herForm('über')).toBe('herüber')
  })

  test('no duplicate elements', () => {
    const els = ADVERB_PAIRS.map(p => p.element)
    expect(new Set(els).size).toBe(els.length)
  })

  test('every r-form is r + element', () => {
    for (const p of ADVERB_PAIRS.filter(p => p.rForm !== null))
      expect(p.rForm).toBe('r' + p.element)
  })

  test('only hinab/herab lacks an r-form (no *rab)', () => {
    expect(ADVERB_PAIRS.filter(p => p.rForm === null).map(p => p.element)).toEqual(['ab'])
  })

  test('unpaired adverbs start with hin- or her- and do not duplicate pair forms', () => {
    const pairForms = new Set(ADVERB_PAIRS.flatMap(p => [hinForm(p.element), herForm(p.element)]))
    for (const u of UNPAIRED_ADVERBS) {
      expect(u.form).toMatch(/^(hin|her)/)
      expect(pairForms.has(u.form)).toBe(false)
      expect(u.gloss.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('cheatsheet content', () => {
  test('perspective minimal pairs use her on the her side and hin on the hin side', () => {
    expect(PERSPECTIVE_PAIRS.length).toBeGreaterThanOrEqual(3)
    for (const p of PERSPECTIVE_PAIRS) {
      expect(p.her.toLowerCase()).toContain('her')
      expect(p.hin.toLowerCase()).toContain('hin')
      expect(p.herNote.trim().length).toBeGreaterThan(0)
      expect(p.hinNote.trim().length).toBeGreaterThan(0)
    }
  })

  test('question words cover wo, wohin, woher — with split variants for the moving two', () => {
    expect(QUESTION_WORDS.map(q => q.word)).toEqual(['wo', 'wohin', 'woher'])
    const wohin = QUESTION_WORDS.find(q => q.word === 'wohin')!
    const woher = QUESTION_WORDS.find(q => q.word === 'woher')!
    expect(wohin.split).toMatch(/hin\?$/)
    expect(woher.split).toMatch(/her\?$/)
    expect(QUESTION_WORDS.find(q => q.word === 'wo')!.split).toBeNull()
  })

  test('pointer words include dahin, dorthin, hierher, daher', () => {
    const words = POINTER_WORDS.map(p => p.word)
    for (const w of ['dahin', 'dorthin', 'hierher', 'daher']) expect(words).toContain(w)
  })

  test('lexicalized verbs carry a hin-/her- prefix, a meaning, and an example', () => {
    expect(LEXICALIZED_VERBS.length).toBeGreaterThanOrEqual(6)
    for (const v of LEXICALIZED_VERBS) {
      expect(v.verb.replace(/^sich /, '')).toMatch(/^(hin|her)/)
      expect(v.meaning.trim().length).toBeGreaterThan(0)
      expect(v.example.trim().length).toBeGreaterThan(0)
    }
  })

  test('idiom bank is populated and every entry has an example', () => {
    expect(IDIOMS.length).toBeGreaterThanOrEqual(6)
    const idioms = IDIOMS.map(i => i.idiom)
    expect(idioms).toContain('hin und her')
    expect(idioms).toContain('hin und wieder')
    for (const i of IDIOMS) {
      expect(/hin|her/.test(i.idiom)).toBe(true)
      expect(i.example.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('scene specs', () => {
  test('all six archetypes have exactly two positions', () => {
    expect(SCENE_ARCHETYPES.length).toBe(6)
    for (const a of SCENE_ARCHETYPES) expect(SCENE_POSITIONS[a].length).toBe(2)
  })

  test('otherPosition flips between the two archetype positions', () => {
    expect(otherPosition('stairs', 'bottom')).toBe('top')
    expect(otherPosition('stairs', 'top')).toBe('bottom')
    expect(otherPosition('doorway', 'inside')).toBe('outside')
    expect(otherPosition('street', 'far')).toBe('near')
  })

  test('validSceneSpec accepts matching positions and rejects foreign ones', () => {
    const ok: SceneSpec = {
      archetype: 'stairs', speakerAt: 'top',
      motion: 'toward-speaker', description: 'You stand at the top; someone climbs up toward you.',
    }
    expect(validSceneSpec(ok)).toBe(true)
    expect(validSceneSpec({ ...ok, speakerAt: 'inside' })).toBe(false)
    expect(validSceneSpec({ ...ok, description: '  ' })).toBe(false)
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run tests/data/directionWords.test.ts`
Expected: FAIL — cannot resolve `../../src/data/directionWords`.

- [ ] **Step 3: Implement**

Create `src/data/directionWords.ts` with EXACTLY this content (German sentences verbatim — do not rephrase):

```ts
// Direction words (hin & her) — perspective adverbs, r-forms, question words,
// lexicalized prefix verbs, idioms, and the scene-spec contract.
// hin = away from the speaker, her = toward the speaker (CONTEXT.md: Perspective adverb).
// Phase 1 ships the cheatsheet content and the schema; drill item banks arrive in Phase 2+.

export interface AdverbPair {
  element: string        // 'ein' — the directional element both twins share
  rForm: string | null   // 'rein' — the colloquial R-form; null when none exists (no *rab)
  gloss: string          // short English sense
}

export function hinForm(element: string): string {
  return 'hin' + element
}

export function herForm(element: string): string {
  return 'her' + element
}

/** The six compound pairs — the module's analogue of a governed preposition. */
export const ADVERB_PAIRS: AdverbPair[] = [
  { element: 'ein',   rForm: 'rein',   gloss: 'in — into something' },
  { element: 'aus',   rForm: 'raus',   gloss: 'out — out of something' },
  { element: 'auf',   rForm: 'rauf',   gloss: 'up — onto or up something' },
  { element: 'unter', rForm: 'runter', gloss: 'down' },
  { element: 'über',  rForm: 'rüber',  gloss: 'across — to the other side' },
  { element: 'ab',    rForm: null,     gloss: 'down — elevated register' },
]

export interface UnpairedAdverb {
  form: string
  gloss: string
}

/** Forms with no hin/her twin — one fixed perspective or none. */
export const UNPAIRED_ADVERBS: UnpairedAdverb[] = [
  { form: 'herum',     gloss: 'around — in circles, or aimlessly' },
  { form: 'hervor',    gloss: 'out from behind or under something' },
  { form: 'hindurch',  gloss: 'through — all the way through' },
  { form: 'hinterher', gloss: 'after — following behind' },
]

export interface PerspectivePair {
  her: string      // example sentence on the her side
  herNote: string  // why it is her
  hin: string      // example sentence on the hin side
  hinNote: string  // why it is hin
}

/** Minimal pairs for the perspective rule — same situation, flipped speaker. */
export const PERSPECTIVE_PAIRS: PerspectivePair[] = [
  {
    her: 'Komm her!',            herNote: 'toward the speaker',
    hin: 'Geh hin!',             hinNote: 'away from the speaker',
  },
  {
    her: 'Wo kommst du her?',    herNote: 'origin — toward me',
    hin: 'Wo gehst du hin?',     hinNote: 'goal — away from me',
  },
  {
    her: 'Sie kommt herein.',    herNote: 'the speaker is inside',
    hin: 'Sie geht hinein.',     hinNote: 'the speaker is outside',
  },
]

export interface QuestionWordRow {
  word: string           // 'wohin'
  asksDe: string         // 'Ziel'
  asksEn: string         // 'where to — goal'
  example: string        // question + short answer
  split: string | null   // the split spoken variant, if one exists
}

export const QUESTION_WORDS: QuestionWordRow[] = [
  { word: 'wo',    asksDe: 'Ort',      asksEn: 'where — static place', example: 'Wo bist du? — Im Büro.',           split: null },
  { word: 'wohin', asksDe: 'Ziel',     asksEn: 'where to — goal',      example: 'Wohin gehst du? — Zum Bahnhof.',   split: 'Wo gehst du hin?' },
  { word: 'woher', asksDe: 'Herkunft', asksEn: 'where from — origin',  example: 'Woher kommst du? — Aus der Stadt.', split: 'Wo kommst du her?' },
]

export interface PointerWord {
  word: string
  gloss: string
  example: string
}

export const POINTER_WORDS: PointerWord[] = [
  { word: 'dahin',   gloss: 'to there — to the place just mentioned', example: 'Fährst du nach Rom? — Ja, ich fahre morgen dahin.' },
  { word: 'dorthin', gloss: 'to that place — pointing more firmly',   example: 'Stell die Kiste bitte dorthin.' },
  { word: 'hierher', gloss: 'to here — toward the speaker',           example: 'Komm bitte hierher.' },
  { word: 'daher',   gloss: 'from there — and, as a trap, „therefore"', example: 'Daher kommt der Lärm. / Daher weiß ich es (= deshalb).' },
]

export interface LexicalizedVerb {
  verb: string     // infinitive, incl. 'sich' where reflexive
  meaning: string  // English meaning — deliberately non-directional
  example: string  // one German sentence
}

/** Verbs whose hin-/her- prefix no longer means direction (CONTEXT.md: Lexicalized prefix verb). */
export const LEXICALIZED_VERBS: LexicalizedVerb[] = [
  { verb: 'herstellen',         meaning: 'to manufacture, produce',   example: 'Die Firma stellt Möbel her.' },
  { verb: 'hinrichten',         meaning: 'to execute (put to death)', example: 'Der Verräter wurde 1601 hingerichtet.' },
  { verb: 'hinweisen auf',      meaning: 'to point out',              example: 'Sie weist auf ein Problem hin.' },
  { verb: 'hinzufügen',         meaning: 'to add',                    example: 'Er fügte hinzu, dass er müde sei.' },
  { verb: 'herausfinden',       meaning: 'to find out',               example: 'Wir haben die Wahrheit herausgefunden.' },
  { verb: 'herausfordern',      meaning: 'to challenge',              example: 'Der Boxer fordert den Meister heraus.' },
  { verb: 'sich herausstellen', meaning: 'to turn out',               example: 'Es stellte sich heraus, dass alles gut war.' },
  { verb: 'hervorheben',        meaning: 'to emphasize, highlight',   example: 'Die Lehrerin hebt das Wichtigste hervor.' },
]

export interface Idiom {
  idiom: string
  meaning: string
  example: string
}

export const IDIOMS: Idiom[] = [
  { idiom: 'hin und her',      meaning: 'back and forth',                    example: 'Wir haben lange hin und her überlegt.' },
  { idiom: 'hin und wieder',   meaning: 'now and then',                      example: 'Hin und wieder gehe ich ins Kino.' },
  { idiom: 'hin und zurück',   meaning: 'there and back — a return ticket',  example: 'Einmal Berlin hin und zurück, bitte.' },
  { idiom: 'vor sich hin',     meaning: 'to oneself, absently',              example: 'Sie summte vor sich hin.' },
  { idiom: 'hinter … her',     meaning: 'in pursuit of',                     example: 'Der Hund ist hinter der Katze her.' },
  { idiom: 'lange her',        meaning: 'long ago (time since)',             example: 'Das ist schon lange her.' },
  { idiom: 'noch lange hin',   meaning: 'still a long way off (time until)', example: 'Bis Weihnachten ist es noch lange hin.' },
  { idiom: 'her mit …!',       meaning: 'hand it over!',                     example: 'Her mit dem Geld!' },
]

// ---------------------------------------------------------------------------
// Scene diagrams (CONTEXT.md: Scene diagram) — the schema Phase 2 item banks
// conform to. Each archetype has exactly two logical positions; the speaker
// stands at one of them, and motion runs toward or away from the speaker
// (her = toward-speaker, hin = away-from-speaker).
// ---------------------------------------------------------------------------

export type SceneArchetype = 'stairs' | 'hill' | 'doorway' | 'window' | 'room' | 'street'
export type ScenePosition = 'top' | 'bottom' | 'inside' | 'outside' | 'near' | 'far'
export type SceneMotion = 'toward-speaker' | 'away-from-speaker'

export interface SceneSpec {
  archetype: SceneArchetype
  speakerAt: ScenePosition   // must be one of the archetype's two positions
  motion: SceneMotion
  description: string        // one-line English scene text — the accessible fallback
}

export const SCENE_ARCHETYPES = ['stairs', 'hill', 'doorway', 'window', 'room', 'street'] as const satisfies readonly SceneArchetype[]

export const SCENE_POSITIONS: Record<SceneArchetype, [ScenePosition, ScenePosition]> = {
  stairs:  ['bottom', 'top'],
  hill:    ['bottom', 'top'],
  doorway: ['outside', 'inside'],
  window:  ['outside', 'inside'],
  room:    ['outside', 'inside'],
  street:  ['near', 'far'],
}

export function otherPosition(archetype: SceneArchetype, pos: ScenePosition): ScenePosition {
  const [a, b] = SCENE_POSITIONS[archetype]
  return pos === a ? b : a
}

export function validSceneSpec(spec: SceneSpec): boolean {
  return SCENE_POSITIONS[spec.archetype].includes(spec.speakerAt)
    && spec.description.trim().length > 0
}

// ---------------------------------------------------------------------------
// Drill item schema — defined now so Phase 2 seed data conforms to it.
// No items ship in Phase 1.
// ---------------------------------------------------------------------------

export type DirectionLevel = 'A2' | 'B1' | 'B2' | 'C1'

export interface PerspectiveItem {
  id: string
  level: DirectionLevel
  sentence: string     // German sentence with a ___ gap
  answers: string[]    // accepted forms; first entry is the canonical reveal
  pair: string | null  // AdverbPair element ('ein', 'auf', …) for pair-filtered drills; null for bare hin/her
  scene: SceneSpec
  translation: string  // English rendering shown on the reveal
}
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run tests/data/directionWords.test.ts` → PASS (all tests).
Run: `npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/directionWords.ts tests/data/directionWords.test.ts
git commit -m "feat(direction-words): data module — adverb pairs, r-forms, question words, lexicalized verbs, idioms, scene schema"
```

---

### Task 2: SceneDiagram component

**Files:**
- Create: `src/modules/direction-words/SceneDiagram.vue`
- Test: `tests/modules/direction-words/SceneDiagram.test.ts`

**Interfaces:**
- Consumes: `SceneSpec`, `SCENE_POSITIONS`, `otherPosition` from `src/data/directionWords` (Task 1).
- Produces: `<SceneDiagram :scene="spec" />` — a `<figure class="scene-diagram">` wrapping a `role="img"` SVG. Root carries `data-archetype`, `data-motion`, and `data-arrow-to` (the position name the motion arrow points at). Task 3 embeds it; Phase 2 drill runners will reuse it unchanged.

- [ ] **Step 1: Write the failing test**

Create `tests/modules/direction-words/SceneDiagram.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SceneDiagram from '../../../src/modules/direction-words/SceneDiagram.vue'
import { SCENE_ARCHETYPES, SCENE_POSITIONS, type SceneSpec } from '../../../src/data/directionWords'

function spec(overrides: Partial<SceneSpec> = {}): SceneSpec {
  return {
    archetype: 'stairs',
    speakerAt: 'top',
    motion: 'toward-speaker',
    description: 'You stand at the top; someone climbs up toward you.',
    ...overrides,
  }
}

describe('SceneDiagram', () => {
  it('renders an accessible SVG for every archetype', () => {
    for (const archetype of SCENE_ARCHETYPES) {
      const s = spec({ archetype, speakerAt: SCENE_POSITIONS[archetype][0] })
      const wrapper = mount(SceneDiagram, { props: { scene: s } })
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
      expect(svg.attributes('role')).toBe('img')
      expect(svg.attributes('aria-label')).toBe(s.description)
      expect(wrapper.attributes('data-archetype')).toBe(archetype)
    }
  })

  it('points the arrow at the speaker when motion is toward-speaker', () => {
    const wrapper = mount(SceneDiagram, { props: { scene: spec() } })
    expect(wrapper.attributes('data-motion')).toBe('toward-speaker')
    expect(wrapper.attributes('data-arrow-to')).toBe('top')
  })

  it('points the arrow away from the speaker when motion is away-from-speaker', () => {
    const wrapper = mount(SceneDiagram, { props: { scene: spec({ motion: 'away-from-speaker' }) } })
    expect(wrapper.attributes('data-arrow-to')).toBe('bottom')
  })

  it('draws speaker, mover, and arrow', () => {
    const wrapper = mount(SceneDiagram, { props: { scene: spec() } })
    expect(wrapper.find('.dw-speaker').exists()).toBe(true)
    expect(wrapper.find('.dw-mover').exists()).toBe(true)
    expect(wrapper.find('.dw-arrow').exists()).toBe(true)
  })

  it('is theme-proof: currentColor only, no hardcoded hex colors', () => {
    for (const archetype of SCENE_ARCHETYPES) {
      const s = spec({ archetype, speakerAt: SCENE_POSITIONS[archetype][1] })
      const html = mount(SceneDiagram, { props: { scene: s } }).html()
      expect(html).toContain('currentColor')
      expect(html).not.toMatch(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/)
    }
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run tests/modules/direction-words/SceneDiagram.test.ts`
Expected: FAIL — cannot resolve the component.

- [ ] **Step 3: Implement**

Create `src/modules/direction-words/SceneDiagram.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { otherPosition, type SceneSpec, type ScenePosition } from '../../data/directionWords'

const props = defineProps<{ scene: SceneSpec }>()

interface Pt { x: number; y: number }

interface Geometry {
  paths: string[]                                  // stroke-only background line art
  anchors: Partial<Record<ScenePosition, Pt>>      // figure foot points for the two positions
}

// viewBox is 0 0 220 130 for every archetype. Figures are ~33 units tall.
const GEOMETRIES: Record<SceneSpec['archetype'], Geometry> = {
  stairs: {
    paths: ['M10 118 H210', 'M40 118 V104 H70 V90 H100 V76 H130 V62 H160 V48 H190'],
    anchors: { bottom: { x: 24, y: 118 }, top: { x: 196, y: 48 } },
  },
  hill: {
    paths: ['M10 118 Q110 10 210 118'],
    anchors: { bottom: { x: 20, y: 118 }, top: { x: 110, y: 64 } },
  },
  doorway: {
    paths: ['M10 118 H210', 'M118 118 V20 H210', 'M130 118 V44 H164 V118'],
    anchors: { outside: { x: 60, y: 118 }, inside: { x: 190, y: 118 } },
  },
  window: {
    paths: ['M10 118 H210', 'M128 118 V16', 'M140 96 H196 V44 H140 Z'],
    anchors: { outside: { x: 60, y: 118 }, inside: { x: 168, y: 112 } },
  },
  room: {
    paths: ['M10 118 H210', 'M120 118 V30 H206 V118', 'M120 30 H92'],
    anchors: { outside: { x: 52, y: 118 }, inside: { x: 164, y: 118 } },
  },
  street: {
    paths: ['M10 72 H210', 'M10 104 H210', 'M60 78 V98 M80 78 V98 M100 78 V98 M120 78 V98 M140 78 V98 M160 78 V98'],
    anchors: { near: { x: 40, y: 124 }, far: { x: 170, y: 66 } },
  },
}

const geometry = computed(() => GEOMETRIES[props.scene.archetype])

const speakerPos = computed(() => props.scene.speakerAt)
const moverPos = computed(() => otherPosition(props.scene.archetype, props.scene.speakerAt))

const speakerPt = computed<Pt>(() => geometry.value.anchors[speakerPos.value]!)
const farPt = computed<Pt>(() => geometry.value.anchors[moverPos.value]!)

// The mover walks mid-path between the two anchors.
const moverPt = computed<Pt>(() => ({
  x: (speakerPt.value.x + farPt.value.x) / 2,
  y: (speakerPt.value.y + farPt.value.y) / 2,
}))

// her = motion toward the speaker; hin = away from the speaker.
const arrowTo = computed<ScenePosition>(() =>
  props.scene.motion === 'toward-speaker' ? speakerPos.value : moverPos.value
)

function raised(p: Pt): Pt {
  return { x: p.x, y: p.y - 44 }
}

function inset(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

const arrow = computed(() => {
  const from = raised(arrowTo.value === speakerPos.value ? farPt.value : speakerPt.value)
  const to = raised(arrowTo.value === speakerPos.value ? speakerPt.value : farPt.value)
  return { from: inset(from, to, 0.15), to: inset(from, to, 0.85) }
})
</script>

<template>
  <figure
    class="scene-diagram"
    :data-archetype="scene.archetype"
    :data-motion="scene.motion"
    :data-arrow-to="arrowTo"
  >
    <svg viewBox="0 0 220 130" role="img" :aria-label="scene.description">
      <title>{{ scene.description }}</title>
      <defs>
        <marker id="dw-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="currentColor" />
        </marker>
      </defs>

      <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path v-for="(d, i) in geometry.paths" :key="i" :d="d" />

        <!-- Speaker: solid figure with speech marks -->
        <g class="dw-speaker" :transform="`translate(${speakerPt.x}, ${speakerPt.y})`">
          <circle cx="0" cy="-26" r="5" fill="currentColor" />
          <line x1="0" y1="-21" x2="0" y2="-8" />
          <line x1="0" y1="-8" x2="-5" y2="0" />
          <line x1="0" y1="-8" x2="5" y2="0" />
          <path d="M9 -30 q4 4 0 8" />
          <path d="M13 -33 q7 7 0 14" />
        </g>

        <!-- Mover: hollow figure mid-path -->
        <g class="dw-mover" :transform="`translate(${moverPt.x}, ${moverPt.y})`">
          <circle cx="0" cy="-26" r="5" />
          <line x1="0" y1="-21" x2="0" y2="-8" />
          <line x1="0" y1="-8" x2="-6" y2="0" />
          <line x1="0" y1="-8" x2="6" y2="-1" />
        </g>

        <!-- Motion arrow -->
        <line
          class="dw-arrow"
          :x1="arrow.from.x" :y1="arrow.from.y"
          :x2="arrow.to.x" :y2="arrow.to.y"
          stroke-width="2"
          marker-end="url(#dw-arrowhead)"
        />
      </g>
    </svg>
  </figure>
</template>

<style scoped>
.scene-diagram {
  margin: 0;
  color: var(--ink);
}
.scene-diagram svg {
  display: block;
  width: 100%;
  max-width: 340px;
  height: auto;
}
.dw-arrow { opacity: 0.85; }
</style>
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run tests/modules/direction-words/SceneDiagram.test.ts` → PASS.
Run: `npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/direction-words/SceneDiagram.vue tests/modules/direction-words/SceneDiagram.test.ts
git commit -m "feat(direction-words): SceneDiagram — six parametric currentColor SVG archetypes"
```

---

### Task 3: Cheatsheet page

**Files:**
- Create: `src/modules/direction-words/DirectionWordsCheatsheet.vue`
- Test: `tests/modules/direction-words/DirectionWordsCheatsheet.test.ts`

**Interfaces:**
- Consumes: everything Tasks 1–2 produce; shared cheatsheet chrome `src/modules/verbs/cheatsheet/cheatsheet.css`, `ChapterNav.vue` (exports `interface Chapter { id; numeral; titleDe; titleEn }`, props `{ chapters, searchQuery }`, emits `update:searchQuery` + `select`), `Callout.vue` (prop `kind: 'note' | 'exception' | 'example'`).
- Produces: component at the path Task 4's router entry imports. Back-link targets route name `directionwords` (registered in Task 4 — the component only references the name; tests mount with a memory router that registers it).

- [ ] **Step 1: Write the failing test**

Create `tests/modules/direction-words/DirectionWordsCheatsheet.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DirectionWordsCheatsheet from '../../../src/modules/direction-words/DirectionWordsCheatsheet.vue'
import {
  ADVERB_PAIRS, UNPAIRED_ADVERBS, QUESTION_WORDS, POINTER_WORDS,
  LEXICALIZED_VERBS, IDIOMS, hinForm, herForm,
} from '../../../src/data/directionWords'

async function mountSheet() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/direction-words', name: 'directionwords', component: { template: '<div />' } },
      { path: '/direction-words/cheatsheet', name: 'directionwords-cheatsheet', component: { template: '<div />' } },
    ],
  })
  await router.push({ name: 'directionwords-cheatsheet' })
  const wrapper = mount(DirectionWordsCheatsheet, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('DirectionWordsCheatsheet', () => {
  it('renders all six chapters', async () => {
    const wrapper = await mountSheet()
    for (const id of ['dw-rule', 'dw-pairs', 'dw-register', 'dw-questions', 'dw-lexical', 'dw-idioms'])
      expect(wrapper.find(`#${id}`).exists()).toBe(true)
  })

  it('shows two scene diagrams in the rule chapter — one per perspective', async () => {
    const wrapper = await mountSheet()
    const diagrams = wrapper.findAll('#dw-rule .scene-diagram')
    expect(diagrams.length).toBe(2)
    expect(diagrams[0].attributes('data-motion')).toBe('toward-speaker')
    expect(diagrams[1].attributes('data-motion')).toBe('away-from-speaker')
  })

  it('pair table has one row per adverb pair with derived twin forms', async () => {
    const wrapper = await mountSheet()
    const rows = wrapper.findAll('.dw-table tbody tr')
    expect(rows.length).toBe(ADVERB_PAIRS.length)
    const text = wrapper.find('.dw-table').text()
    for (const p of ADVERB_PAIRS) {
      expect(text).toContain(hinForm(p.element))
      expect(text).toContain(herForm(p.element))
    }
    expect(wrapper.find('#dw-pairs').text()).toContain(UNPAIRED_ADVERBS[0].form)
  })

  it('register chapter lists every r-form and marks *hinrein as wrong', async () => {
    const wrapper = await mountSheet()
    const text = wrapper.find('#dw-register').text()
    for (const p of ADVERB_PAIRS.filter(p => p.rForm !== null)) expect(text).toContain(p.rForm!)
    expect(text).toContain('hinrein')
  })

  it('questions chapter covers wo/wohin/woher and the pointer words', async () => {
    const wrapper = await mountSheet()
    const text = wrapper.find('#dw-questions').text()
    for (const q of QUESTION_WORDS) expect(text).toContain(q.example)
    for (const p of POINTER_WORDS) expect(text).toContain(p.word)
  })

  it('renders the lexicalized verbs and the idioms', async () => {
    const wrapper = await mountSheet()
    expect(wrapper.findAll('#dw-lexical .dw-lex-row').length).toBe(LEXICALIZED_VERBS.length)
    expect(wrapper.find('#dw-lexical').text()).toContain('herstellen')
    const idiomText = wrapper.find('#dw-idioms').text()
    for (const i of IDIOMS) expect(idiomText).toContain(i.example)
  })

  it('has a back link to the module home', async () => {
    const wrapper = await mountSheet()
    expect(wrapper.find('.back-link').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run tests/modules/direction-words/DirectionWordsCheatsheet.test.ts`
Expected: FAIL — cannot resolve the component.

- [ ] **Step 3: Implement**

Create `src/modules/direction-words/DirectionWordsCheatsheet.vue` (German copy verbatim):

```vue
<script setup lang="ts">
import { ref, nextTick } from 'vue'
import '../verbs/cheatsheet/cheatsheet.css'
import ChapterNav, { type Chapter } from '../verbs/cheatsheet/ChapterNav.vue'
import Callout from '../verbs/cheatsheet/Callout.vue'
import SceneDiagram from './SceneDiagram.vue'
import {
  ADVERB_PAIRS, UNPAIRED_ADVERBS, PERSPECTIVE_PAIRS, QUESTION_WORDS, POINTER_WORDS,
  LEXICALIZED_VERBS, IDIOMS, hinForm, herForm,
  type SceneSpec,
} from '../../data/directionWords'

const chapters: Chapter[] = [
  { id: 'dw-rule',      numeral: 'I',   titleDe: 'Hin oder her?',       titleEn: 'The perspective rule' },
  { id: 'dw-pairs',     numeral: 'II',  titleDe: 'Die Paare',           titleEn: 'hinein/herein and friends' },
  { id: 'dw-register',  numeral: 'III', titleDe: 'Kurzformen',          titleEn: 'rein, raus — register' },
  { id: 'dw-questions', numeral: 'IV',  titleDe: 'Wo, wohin, woher',    titleEn: 'Questions and pointers' },
  { id: 'dw-lexical',   numeral: 'V',   titleDe: 'Verblasste Richtung', titleEn: 'Verbs where direction died' },
  { id: 'dw-idioms',    numeral: 'VI',  titleDe: 'Redewendungen',       titleEn: 'hin und her, hin und wieder' },
]

const searchQuery = ref('')

function onSelect(id: string) {
  nextTick(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

// Same staircase, flipped speaker — the whole rule in two pictures.
const sceneHer: SceneSpec = {
  archetype: 'stairs', speakerAt: 'top', motion: 'toward-speaker',
  description: 'You stand at the top of the stairs; someone climbs up toward you — herauf.',
}
const sceneHin: SceneSpec = {
  archetype: 'stairs', speakerAt: 'bottom', motion: 'away-from-speaker',
  description: 'You stand at the bottom of the stairs; someone climbs up away from you — hinauf.',
}
</script>

<template>
  <div class="page grammatik">
    <header class="section-header cheatsheet-section-header" data-print-hide>
      <div>
        <div class="breadcrumb">Spickzettel · Cheatsheet</div>
        <h1 class="section-title">Direction Words<em>.</em></h1>
        <p class="section-subtitle">
          hin & her — one rule about where you stand. The pairs, the shortcuts,
          the questions, and the verbs where the direction has faded.
        </p>
      </div>
      <router-link :to="{ name: 'directionwords' }" class="btn btn-ghost back-link">← Direction Words</router-link>
    </header>

    <div class="grammatik-layout">
      <ChapterNav
        :chapters="chapters"
        :search-query="searchQuery"
        @update:search-query="searchQuery = $event"
        @select="onSelect"
      />

      <main class="grammatik-main">
        <section id="dw-rule" class="chapter">
          <div class="chapter-numeral">I</div>
          <h2 class="chapter-title">Hin oder her?</h2>
          <p class="chapter-subtitle">
            One question decides everything: <strong>where does the speaker stand?</strong>
            Motion <strong>toward</strong> the speaker is <strong>her</strong>; motion
            <strong>away</strong> from the speaker is <strong>hin</strong>. The same climb up
            the same stairs takes a different word depending on who is talking.
          </p>
          <hr class="rule" />
          <div class="dw-scene-pair">
            <div>
              <SceneDiagram :scene="sceneHer" />
              <p class="dw-scene-caption"><strong>Komm herauf!</strong> — the speaker waits at the top.</p>
            </div>
            <div>
              <SceneDiagram :scene="sceneHin" />
              <p class="dw-scene-caption"><strong>Er geht hinauf.</strong> — the speaker stays at the bottom.</p>
            </div>
          </div>
          <div v-for="p in PERSPECTIVE_PAIRS" :key="p.her" class="dw-pair">
            <div class="dw-pair-cols">
              <div>
                <div class="dw-pair-label">her — toward the speaker</div>
                <p><strong>{{ p.her }}</strong> <em>({{ p.herNote }})</em></p>
              </div>
              <div>
                <div class="dw-pair-label">hin — away from the speaker</div>
                <p><strong>{{ p.hin }}</strong> <em>({{ p.hinNote }})</em></p>
              </div>
            </div>
          </div>
          <Callout kind="exception">
            <p>
              The classic transfer trap: English <em>"come here"</em> is
              <strong>Komm her!</strong> — never <em>*Komm hier!</em>
              <em>hier</em> is a place, <em>her</em> is a motion.
            </p>
          </Callout>
        </section>

        <section id="dw-pairs" class="chapter">
          <div class="chapter-numeral">II</div>
          <h2 class="chapter-title">Die Paare</h2>
          <p class="chapter-subtitle">
            hin/her + direction — every pair differs <strong>only</strong> in perspective.
            The right column is the spoken shortcut of Chapter III.
          </p>
          <hr class="rule" />
          <div class="dw-table-wrap">
            <table class="dw-table">
              <thead>
                <tr><th>Richtung</th><th>hin-</th><th>her-</th><th>Kurzform</th></tr>
              </thead>
              <tbody>
                <tr v-for="p in ADVERB_PAIRS" :key="p.element">
                  <td class="dw-gloss">{{ p.gloss }}</td>
                  <td class="dw-form">{{ hinForm(p.element) }}</td>
                  <td class="dw-form">{{ herForm(p.element) }}</td>
                  <td class="dw-form">{{ p.rForm ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3 class="pattern-heading">Ohne Zwilling — no hin/her twin</h3>
          <ul class="dw-list">
            <li v-for="u in UNPAIRED_ADVERBS" :key="u.form">
              <strong>{{ u.form }}</strong> — {{ u.gloss }}
            </li>
          </ul>
        </section>

        <section id="dw-register" class="chapter">
          <div class="chapter-numeral">III</div>
          <h2 class="chapter-title">Kurzformen</h2>
          <p class="chapter-subtitle">
            Spoken German shortens the compounds to <strong>r-forms</strong> — and stops
            caring where the speaker stands: <em>rein</em> covers <em>hinein</em>
            <strong>and</strong> <em>herein</em>.
          </p>
          <hr class="rule" />
          <ul class="dw-list">
            <li v-for="p in ADVERB_PAIRS.filter(p => p.rForm !== null)" :key="p.element">
              <strong>{{ p.rForm }}</strong> = {{ hinForm(p.element) }} <em>oder</em> {{ herForm(p.element) }}
              — <em>Komm {{ p.rForm }}!</em>
            </li>
          </ul>
          <Callout kind="note">
            <p>
              🗣 <em>Komm rüber!</em> is everyday spoken German — in an essay, write
              <em>herüber</em>. The r-form is a register choice, never an error.
            </p>
          </Callout>
          <Callout kind="exception">
            <p>
              What <strong>is</strong> always wrong: gluing hin/her onto an r-form —
              <em>*hinrein</em>, <em>*herraus</em>. The r-form already replaced them.
            </p>
          </Callout>
        </section>

        <section id="dw-questions" class="chapter">
          <div class="chapter-numeral">IV</div>
          <h2 class="chapter-title">Wo, wohin, woher</h2>
          <p class="chapter-subtitle">
            German splits English <em>where</em> in three: place, goal, origin —
            and the moving two can split in speech: <em>Wo gehst du <strong>hin</strong>?</em>
          </p>
          <hr class="rule" />
          <div class="dw-table-wrap">
            <table class="dw-table">
              <thead>
                <tr><th>Wort</th><th>fragt nach</th><th>Beispiel</th><th>Gesprochen</th></tr>
              </thead>
              <tbody>
                <tr v-for="q in QUESTION_WORDS" :key="q.word">
                  <td class="dw-form">{{ q.word }}</td>
                  <td class="dw-gloss">{{ q.asksDe }} · {{ q.asksEn }}</td>
                  <td>{{ q.example }}</td>
                  <td>{{ q.split ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3 class="pattern-heading">Zeigewörter — pointers</h3>
          <ul class="dw-list">
            <li v-for="p in POINTER_WORDS" :key="p.word">
              <strong>{{ p.word }}</strong> — {{ p.gloss }} · <em>{{ p.example }}</em>
            </li>
          </ul>
          <Callout kind="exception">
            <p>
              Static vs. motion is a hard line: <em>*Wohin bist du?</em> and
              <em>*Wo gehst du?</em> (meaning a goal) are both wrong —
              <strong>sein</strong> takes <em>wo</em>, <strong>gehen</strong> takes <em>wohin</em>.
            </p>
          </Callout>
        </section>

        <section id="dw-lexical" class="chapter">
          <div class="chapter-numeral">V</div>
          <h2 class="chapter-title">Verblasste Richtung</h2>
          <p class="chapter-subtitle">
            In these verbs the hin-/her- prefix stopped meaning direction — they are
            <strong>vocabulary</strong>, and the perspective rule cannot decode them:
            <em>herstellen</em> is manufacturing, not fetching.
          </p>
          <hr class="rule" />
          <div v-for="v in LEXICALIZED_VERBS" :key="v.verb" class="dw-lex-row">
            <strong>{{ v.verb }}</strong> — {{ v.meaning }}
            <div class="dw-lex-example"><em>{{ v.example }}</em></div>
          </div>
        </section>

        <section id="dw-idioms" class="chapter">
          <div class="chapter-numeral">VI</div>
          <h2 class="chapter-title">Redewendungen</h2>
          <p class="chapter-subtitle">
            Fixed expressions — including the pair that names this module and the
            two time idioms (<em>lange her</em> looks back, <em>noch lange hin</em> looks ahead).
          </p>
          <hr class="rule" />
          <ul class="dw-list">
            <li v-for="i in IDIOMS" :key="i.idiom">
              <strong>{{ i.idiom }}</strong> — {{ i.meaning }} · <em>{{ i.example }}</em>
            </li>
          </ul>
          <Callout kind="note">
            <p>
              Near-miss alert: <strong>hin und her</strong> is <em>back and forth</em>;
              <strong>hin und wieder</strong> is <em>now and then</em>. Swapping them is
              a favourite C1 trap.
            </p>
          </Callout>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.dw-table-wrap { overflow-x: auto; }
.dw-table { width: 100%; border-collapse: collapse; font-size: 15px; }
.dw-table th {
  text-align: left; font-family: var(--font-mono); font-size: 11px;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--mute);
  padding: 6px 12px 6px 0; border-bottom: 1px solid var(--rule);
}
.dw-table td { padding: 7px 12px 7px 0; border-bottom: 1px solid var(--hairline, var(--rule)); }
.dw-form { font-weight: 600; }
.dw-gloss { color: var(--ink-soft); font-size: 14px; }
.dw-list { padding-left: 18px; }
.dw-list li { margin: 6px 0; }
.dw-scene-pair {
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  margin: 12px 0 20px;
}
.dw-scene-caption { margin: 6px 0 0; font-size: 14px; color: var(--ink-soft); }
.dw-pair { margin: 14px 0; }
.dw-pair-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.dw-pair-label {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--mute);
}
.dw-pair-cols p { margin: 2px 0 0; }
.dw-lex-row { margin: 12px 0; }
.dw-lex-example { margin-top: 2px; color: var(--ink-soft); font-size: 14px; }
@media (max-width: 560px) {
  .dw-scene-pair, .dw-pair-cols { grid-template-columns: 1fr; gap: 10px; }
}
</style>
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run tests/modules/direction-words/DirectionWordsCheatsheet.test.ts` → PASS.
Run: `npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/direction-words/DirectionWordsCheatsheet.vue tests/modules/direction-words/DirectionWordsCheatsheet.test.ts
git commit -m "feat(direction-words): cheatsheet — perspective rule with scene diagrams, pairs, r-forms, questions, lexicalized verbs, idioms"
```

---

### Task 4: Module scaffold + release prep

**Files:**
- Create: `src/modules/direction-words/DirectionWordsHome.vue`
- Modify: `src/router.ts` (new block after the da-compounds block, before `/declension`, ~line 88)
- Modify: `src/components/NavShell.vue` (`items` array, after the `dacompounds` entry at line 25)
- Modify: `src/modules/home/Home.vue` (`modules` array + breadcrumb)
- Modify: `src/data/changelog.ts` + `package.json` (version 1.14.00)
- Test: `tests/modules/direction-words/DirectionWordsHome.test.ts`

**Interfaces:**
- Consumes: `DirectionWordsHome.vue` + `DirectionWordsCheatsheet.vue` component files (Tasks 1–3 done), route names `directionwords` / `directionwords-cheatsheet` (hyphen-free — see Global Constraints).
- Produces: navigable module; released version 1.14.00 after controller merge.

- [ ] **Step 1: Write the failing test**

Create `tests/modules/direction-words/DirectionWordsHome.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DirectionWordsHome from '../../../src/modules/direction-words/DirectionWordsHome.vue'

async function mountHome() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/direction-words', name: 'directionwords', component: { template: '<div />' } },
      { path: '/direction-words/cheatsheet', name: 'directionwords-cheatsheet', component: { template: '<div />' } },
    ],
  })
  await router.push({ name: 'directionwords' })
  const wrapper = mount(DirectionWordsHome, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('DirectionWordsHome', () => {
  it('renders the module header and the Reference section', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.find('.section-title').text()).toContain('Direction Words')
    expect(wrapper.find('.group-heading').text()).toContain('Reference')
  })

  it('shows the cheatsheet card and navigates to it on click', async () => {
    const { wrapper, router } = await mountHome()
    const card = wrapper.find('.module-card')
    expect(card.text()).toContain('Cheatsheet')
    await card.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('directionwords-cheatsheet')
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run tests/modules/direction-words/DirectionWordsHome.test.ts`
Expected: FAIL — cannot resolve the component.

- [ ] **Step 3: Implement the home page**

Create `src/modules/direction-words/DirectionWordsHome.vue`:

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

interface Card {
  numeral: string
  route: string
  title: string
  de: string
  desc: string
}

interface Group {
  heading: string
  de: string
  cards: Card[]
}

// Drill cards arrive family by family (spec §7 phases); Phase 1 ships the reference.
const groups: Group[] = [
  {
    heading: 'Reference',
    de: 'Nachschlagen',
    cards: [
      {
        numeral: 'A', route: 'directionwords-cheatsheet',
        title: 'Cheatsheet', de: 'Spickzettel',
        desc: 'The perspective rule in two pictures, the six hin/her pairs with their rein/raus shortcuts, wo/wohin/woher, the verbs where direction has faded, and the idioms.',
      },
    ],
  },
]

function go(target: string) {
  router.push({ name: target })
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Modul · hin &amp; her</div>
        <h1 class="section-title">Direction Words<em>.</em></h1>
        <p class="section-subtitle">
          hinein or herein? It depends on where you stand. Study the cheatsheet first;
          the drills arrive family by family.
        </p>
      </div>
    </header>

    <template v-for="g in groups" :key="g.heading">
      <h2 class="group-heading">{{ g.heading }} · <span class="group-de">{{ g.de }}</span></h2>
      <div class="module-grid">
        <article
          v-for="c in g.cards"
          :key="c.route"
          class="card module-card interactive"
          role="button"
          tabindex="0"
          @click="go(c.route)"
          @keydown.enter="go(c.route)"
        >
          <div class="module-numeral">{{ c.numeral }}</div>
          <h2>{{ c.title }}</h2>
          <div class="module-de">{{ c.de }}</div>
          <p class="module-desc">{{ c.desc }}</p>
          <div class="module-cta">Open <span aria-hidden="true">→</span></div>
        </article>
      </div>
    </template>
  </div>
</template>

<style scoped>
.module-card:focus-visible { outline: 1px dotted var(--rule); outline-offset: 4px; }
.group-heading {
  margin: 28px 0 14px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
}
.group-de { font-style: italic; text-transform: none; letter-spacing: 0.04em; }
</style>
```

- [ ] **Step 4: Wire routes, nav, and home card**

`src/router.ts` — insert a new block right after the da-compounds block (after the `dacompounds-relative-run` entry, before `/declension`):

```ts
// Direction Words (hin & her). Route names are hyphen-free ('directionwords')
// because NavShell derives the active tab via name.split('-')[0].
{ path: '/direction-words', name: 'directionwords', component: () => import('./modules/direction-words/DirectionWordsHome.vue') },
{ path: '/direction-words/cheatsheet', name: 'directionwords-cheatsheet', component: () => import('./modules/direction-words/DirectionWordsCheatsheet.vue') },
```

`src/components/NavShell.vue` — add to `items` after the `dacompounds` entry (line 25):

```ts
{ route: 'directionwords', label: 'Direction Words', de: 'hin & her' },
```

`src/modules/home/Home.vue` — insert into the `modules` array BEFORE the `settings` entry (which is currently numeral `'X'`), then renumber settings to `'XI'`:

```ts
{
  numeral: 'X',
  route: 'directionwords',
  de: 'hin & her',
  title: 'Direction Words',
  desc: 'hinein or herein? The perspective rule with scene diagrams, the six hin/her pairs, rein/raus shortcuts, and the verbs where direction has faded.',
  meta: 'Cheatsheet live · drills arriving in phases'
},
```

and change the settings entry's `numeral` from `'X'` to `'XI'`, and update the breadcrumb string in the template from `Frontispiece · I/X` to `Frontispiece · I/XI`.

- [ ] **Step 5: Verify green**

Run: `npx vitest run tests/modules/direction-words/DirectionWordsHome.test.ts` → PASS.
Run: `npm run typecheck` → PASS.

- [ ] **Step 6: Changelog + version bump**

`package.json`: `"version": "1.14.00"`; run `npm install --package-lock-only` to sync the lockfile.
`src/data/changelog.ts`: `APP_VERSION = '1.14.00'` and prepend:

```ts
{
  version: '1.14.00', date: '2026-07-28', kind: 'module',
  title: 'Direction Words · a new module opens',
  notes: [
    '<strong>Module X: Direction Words (hin &amp; her).</strong> <em>hinein</em> oder <em>herein</em>? It depends on where you stand. The perspective adverbs get their own home — reachable from the top nav and the front page. The drills arrive family by family over the coming releases; this one lays the foundation.',
    '<strong>The cheatsheet is live — with pictures.</strong> The perspective rule shown as two scene diagrams (same staircase, flipped speaker), the six hin/her pairs with their <em>rein/raus</em> shortcuts and register rules, <em>wo/wohin/woher</em> with the spoken splits (<em>Wo gehst du hin?</em>), the verbs where the direction has faded (<em>herstellen</em> means manufacturing, not fetching), and the idioms from <em>hin und her</em> to <em>lange her</em>.'
  ]
},
```

- [ ] **Step 7: Full gates**

Run: `npx vitest run --testTimeout=30000` → all green.
Run: `npm run typecheck` → green.

- [ ] **Step 8: Commit**

```bash
git add -A -- ':!dist' ':!GermanVerbTester'
git commit -m "feat(direction-words): module scaffold — routes, nav, home card, module home; v1.14.00"
```

---

### Controller wrap-up (not a subagent task)

- [ ] Final whole-branch review (most capable model), fix wave if needed
- [ ] 390px verification of `/direction-words` and `/direction-words/cheatsheet` (pair + question tables scroll in their wrappers, no page-body horizontal scroll; nav drawer shows the new tab; the two scene diagrams stack single-column)
- [ ] **Both-themes verification of all six scene archetypes** (gate check from spec §7): temporarily render each archetype (e.g. via the cheatsheet demos plus a scratch page or by editing the demo specs), toggle light/dark, confirm every archetype is fully visible in both — then revert any scratch edits
- [ ] Merge + release:

```bash
git checkout main
git merge --no-ff feat/phase1-direction-words-scaffold -m "Merge feat/phase1-direction-words-scaffold: Direction Words module + cheatsheet + scene diagrams - v1.14.00"
npm run deploy
git push origin main
```
