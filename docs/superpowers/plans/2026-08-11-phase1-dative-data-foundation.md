# Phase 1 — Dativ Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The verb pool grows from 15 to 44 dative verbs with complete, correct conjugation data; `stehen`'s mis-tag is fixed; the module's two side-tables (`dativeVerbs.ts`, `dativeAdjectives.ts`) ship fully authored with their invariant gates; the spec's glossary lands in `CONTEXT.md`. No UI — this phase lands no user-visible feature by design (spec §Phases: "the module cannot be built on a 15-verb pool").

**Architecture:** 29 new `Verb` entries join `src/data/verbs.ts` in their level sections (each also needs a `VERB_TIPS` entry — the 1:1 test in `tests/data/verbs.test.ts` enforces it — and any English gloss shared with an existing verb needs `VERB_SENSES` coverage — the COVERAGE gate in `tests/data/verbSenses.test.ts` enforces that). `dativeVerbs.ts` is a **side-table** in the `verb-tips.ts`/`verb-senses.ts` mold: teaching data only, keyed by `VERBS.german`; `verbs.ts` stays the single source of truth for what a verb *is*. `dativeAdjectives.ts` is its adjective sibling. Both get gate-style tests (named tests listing offending ids via `expect(bad).toEqual([])`).

**Tech Stack:** TypeScript data modules, Vitest (`npx vitest run <path>`), vue-tsc (`npm run typecheck`).

## Global Constraints

- Branch `feat/phase1-dative-data-foundation` off `main`. No pushes; the controller merges.
- **Never** add a verb at level `"B2.2"` — `tests/data/verbs.test.ts` pins that batch at exactly 200 verbs. New dative verbs go in `A1`, `A2`, `B1`, or `B2.1` only.
- Every new verb needs a matching `VERB_TIPS` entry (crossword-clue style, never containing the verb's own English translation) — the "tips are strictly 1:1 with verbs" test fails otherwise.
- Every English gloss alternative shared by 2+ pool verbs needs `VERB_SENSES` coverage — the COVERAGE gate fails otherwise. This plan enumerates every collision; do not add extra gloss alternatives beyond what a task specifies.
- Regular verbs must have `praeteritumStem` ending in `te` and `partizip2` ending in `t` (test-enforced). Separable verbs: `type: "separable"`, `separablePrefix` set, every `praesens` form ends with a space + prefix, `partizip2` starts with the prefix, `praeteritumStem` is the **bare** stem without prefix, `imperativDu` (when given) is the bare core with **no space**. wir/sie Präsens forms must equal the infinitive (prefix split off for separables). A verb whose er-form gains ä/ö over its stem **must** supply `imperativDu`.
- German correctness is a shipping gate: use the conjugation forms exactly as printed in this plan — they have been verified. Never improvise a form.
- Typecheck is `npm run typecheck` (vue-tsc). Plain `tsc` floods ~212 bogus `.vue` errors — never use it.
- The pinned `DativeVerbEntry` interface below is shared with the phase 2–4 plans. Use the names **verbatim**; do not rename anything.
- Do not touch `dist/` or `GermanVerbTester/`.
- Commits end with: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

### Task 1: A1/A2 verbs (9) + tips + sense coverage

**Files:**
- Modify: `src/data/verbs.ts` (three insertion points, see steps)
- Modify: `src/data/verb-tips.ts`
- Modify: `src/data/verb-senses.ts`

**Interfaces:**
- Consumes: `Verb` interface in `src/data/verbs.ts:121-137` (german, english, level, type, case, auxiliary, separablePrefix?, praesens 6-tuple, praeteritumStem, praeteritum?, partizip2, konjunktiv2?, imperativDu?, notes?).
- Produces: 9 new `VERBS` entries — `danken`, `gratulieren`, `begegnen`, `passieren`, `raten`, `verzeihen`, `zuhören`, `wehtun`, `einfallen` — that Tasks 5–7 and the phase 2 plan key against by their exact `german` strings.

- [ ] **Step 1: Add 9 tips to `src/data/verb-tips.ts`.** The file is grouped by region comments `// ─── A1 ───`, `// ─── A2 ───`, `// ─── B1 ───`, `// ─── B2 ───`, `// ─── B2.2 ───`. Insert the danken line directly after the existing `"helfen"` line (A1 region), and the other eight as the last lines of the A2 region — immediately **before** the `// ─── B1 ───` comment. Tips must not contain the verb's English translation:

```ts
  // Task 1 — dative-module pool expansion (A1)
  "danken": "To express gratitude to someone.",
```

```ts
  // Task 1 — dative-module pool expansion (A2)
  "gratulieren": "Warm words on someone's birthday or success.",
  "begegnen": "To cross paths with someone by chance.",
  "passieren": "Events that simply take place, often to someone.",
  "raten": "To suggest what someone should do; also to take a shot at the answer.",
  "verzeihen": "To stop holding someone's mistake against them.",
  "zuhören": "To give a speaker your full attention.",
  "wehtun": "A knee or a back throbbing with pain.",
  "einfallen": "An idea suddenly pops into your head.",
```

- [ ] **Step 2: Add `danken` to the A1 section of `src/data/verbs.ts`.** Insert immediately **before** the line `  // ─── A1 separable verbs ──────────────────────────────────────────────`:

```ts
  {
    german: "danken",
    english: "thank",
    level: "A1",
    type: "regular",
    case: "dative",
    auxiliary: "haben",
    praesens: ["danke", "dankst", "dankt", "danken", "dankt", "danken"],
    praeteritumStem: "dankte",
    partizip2: "gedankt",
    notes: "+ dative person",
  },
```

- [ ] **Step 3: Add 5 plain A2 verbs.** Insert immediately **before** the line `  // ─── A2 separable verbs ──────────────────────────────────────────────`:

```ts
  {
    german: "gratulieren",
    english: "congratulate",
    level: "A2",
    type: "regular",
    case: "dative",
    auxiliary: "haben",
    praesens: [
      "gratuliere",
      "gratulierst",
      "gratuliert",
      "gratulieren",
      "gratuliert",
      "gratulieren",
    ],
    praeteritumStem: "gratulierte",
    partizip2: "gratuliert",
    notes: "+ dative person: jemandem zum Geburtstag gratulieren",
  },
  {
    german: "begegnen",
    english: "encounter / meet",
    level: "A2",
    type: "regular",
    case: "dative",
    auxiliary: "sein",
    praesens: [
      "begegne",
      "begegnest",
      "begegnet",
      "begegnen",
      "begegnet",
      "begegnen",
    ],
    praeteritumStem: "begegnete",
    partizip2: "begegnet",
    notes: "+ dative person; Perfekt with sein: ich bin ihm begegnet",
  },
  {
    german: "passieren",
    english: "happen / occur",
    level: "A2",
    type: "regular",
    case: "dative",
    auxiliary: "sein",
    praesens: [
      "passiere",
      "passierst",
      "passiert",
      "passieren",
      "passiert",
      "passieren",
    ],
    praeteritumStem: "passierte",
    partizip2: "passiert",
    notes: "usually impersonal: es passiert mir",
  },
  {
    german: "raten",
    english: "advise / guess",
    level: "A2",
    type: "irregular",
    case: "dative",
    auxiliary: "haben",
    praesens: ["rate", "rätst", "rät", "raten", "ratet", "raten"],
    praeteritumStem: "riet",
    partizip2: "geraten",
    imperativDu: "rate",
    notes: "+ dative person in the advise sense: ich rate dir",
  },
  {
    german: "verzeihen",
    english: "forgive",
    level: "A2",
    type: "irregular",
    case: "dative",
    auxiliary: "haben",
    praesens: [
      "verzeihe",
      "verzeihst",
      "verzeiht",
      "verzeihen",
      "verzeiht",
      "verzeihen",
    ],
    praeteritumStem: "verzieh",
    partizip2: "verziehen",
    notes: "+ dative person: verzeih mir!",
  },
```

- [ ] **Step 4: Add 3 separable A2 verbs.** Insert immediately **before** the line `  // ─── A2 reflexive verbs ──────────────────────────────────────────────`:

```ts
  {
    german: "zuhören",
    english: "listen",
    level: "A2",
    type: "separable",
    case: "dative",
    auxiliary: "haben",
    separablePrefix: "zu",
    praesens: [
      "höre zu",
      "hörst zu",
      "hört zu",
      "hören zu",
      "hört zu",
      "hören zu",
    ],
    praeteritumStem: "hörte",
    partizip2: "zugehört",
    notes: "+ dative person: hör mir zu!",
  },
  {
    german: "wehtun",
    english: "hurt / ache",
    level: "A2",
    type: "separable",
    case: "dative",
    auxiliary: "haben",
    separablePrefix: "weh",
    praesens: [
      "tue weh",
      "tust weh",
      "tut weh",
      "tun weh",
      "tut weh",
      "tun weh",
    ],
    praeteritumStem: "tat",
    partizip2: "wehgetan",
    notes: "the hurting part is the subject: mein Kopf tut mir weh",
  },
  {
    german: "einfallen",
    english: "occur to / come to mind",
    level: "A2",
    type: "separable",
    case: "dative",
    auxiliary: "sein",
    separablePrefix: "ein",
    praesens: [
      "falle ein",
      "fällst ein",
      "fällt ein",
      "fallen ein",
      "fallt ein",
      "fallen ein",
    ],
    praeteritumStem: "fiel",
    partizip2: "eingefallen",
    imperativDu: "fall",
    notes: "the idea is the subject: der Name fällt mir ein",
  },
```

- [ ] **Step 5: Run the verb invariants — expect a `verbSenses` failure only.**

Run: `npx vitest run tests/data/verbs.test.ts`
Expected: PASS (tips 1:1, plural forms, separable consistency, regular stems all green).

Run: `npx vitest run tests/data/verbSenses.test.ts`
Expected: **FAIL** on the COVERAGE test — the new glosses made `listen`, `advise`, `forgive`, `hurt` ambiguous and extended `meet`, `happen`, `occur`. That failure is the point of Step 6.

- [ ] **Step 6: Sense coverage in `src/data/verb-senses.ts`.** Entries are alphabetical by `meaning` — insert each new entry in alphabetical position, and edit the three existing entries in place.

New entries (4):

```ts
  {
    meaning: 'advise',
    senses: [
      { cue: 'a bank or a lawyer walking you through your options', verbs: ['beraten'] },
      { cue: 'urging a friend to take one course of action', verbs: ['raten'] }
    ]
  },
```

```ts
  {
    meaning: 'forgive',
    senses: [
      { cue: 'letting go of what someone did to you', verbs: ['vergeben', 'verzeihen'] }
    ]
  },
```

```ts
  {
    meaning: 'hurt',
    senses: [
      { cue: 'causing someone a wound or an injury', verbs: ['verletzen'] },
      { cue: 'a body part aching and throbbing', verbs: ['wehtun'] }
    ]
  },
```

```ts
  {
    meaning: 'listen',
    senses: [
      { cue: 'music or the radio playing in your ears', verbs: ['hören'] },
      { cue: 'giving a speaker your full attention', verbs: ['zuhören'] }
    ]
  },
```

Edits to existing entries (3) — change only the lines shown:

In `meaning: 'happen'`, the first sense gains `passieren` (the two fit an accident equally — ADR-0016 says merge, don't invent a cue):

```ts
      { cue: 'an accident or a miracle taking place', verbs: ['geschehen', 'passieren'] },
```

In `meaning: 'meet'`, the first sense gains `begegnen` (running into someone by chance is exactly *begegnen*):

```ts
      { cue: 'running into a friend in town', verbs: ['treffen', 'begegnen'] },
```

In `meaning: 'occur'`, the first sense gains `passieren`:

```ts
      { cue: 'an accident happening out of the blue', verbs: ['geschehen', 'passieren'] },
```

- [ ] **Step 7: Verify green.**

Run: `npx vitest run tests/data/verbs.test.ts tests/data/verbSenses.test.ts`
Expected: PASS (both files, all tests).

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/data/verbs.ts src/data/verb-tips.ts src/data/verb-senses.ts
git commit -m "feat(verbs): 9 A1/A2 dative verbs with tips and sense coverage

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: B1 verbs (11) + tips + sense coverage

**Files:**
- Modify: `src/data/verbs.ts` (one insertion point)
- Modify: `src/data/verb-tips.ts`
- Modify: `src/data/verb-senses.ts`

**Interfaces:**
- Consumes: `Verb` interface (same as Task 1).
- Produces: 11 new `VERBS` entries — `widersprechen`, `ähneln`, `genügen`, `gehorchen`, `nützen`, `auffallen`, `leidtun`, `guttun`, `zusehen`, `zuschauen`, `sich nähern`.

- [ ] **Step 1: Add 11 tips to `src/data/verb-tips.ts`** as the last lines of the `// ─── B1 ───` region — immediately **before** the `// ─── B2 ───` comment:

```ts
  // Task 2 — dative-module pool expansion (B1)
  "widersprechen": "To voice the opposite of what someone just said.",
  "ähneln": "To look or be much like someone.",
  "genügen": "The amount is sufficient; no more is needed.",
  "gehorchen": "To do exactly what one is told.",
  "nützen": "It brings someone a real advantage.",
  "auffallen": "Something catches your eye immediately.",
  "leidtun": "The fixed phrase for regret: es tut mir …",
  "guttun": "A rest or a walk has a healing effect on someone.",
  "zusehen": "To look on while others act.",
  "zuschauen": "To follow a game or performance with your eyes.",
  "sich nähern": "To come closer and closer to something.",
```

- [ ] **Step 2: Add the 11 verbs.** Insert immediately **before** the line `  // ─── B2.1 verbs ──────────────────────────────────────────────────────` in `src/data/verbs.ts`:

```ts
  {
    german: "widersprechen",
    english: "contradict",
    level: "B1",
    type: "irregular",
    case: "dative",
    auxiliary: "haben",
    praesens: [
      "widerspreche",
      "widersprichst",
      "widerspricht",
      "widersprechen",
      "widersprecht",
      "widersprechen",
    ],
    praeteritumStem: "widersprach",
    partizip2: "widersprochen",
    imperativDu: "widersprich",
    notes: "inseparable; + dative person",
  },
  {
    german: "ähneln",
    english: "resemble",
    level: "B1",
    type: "regular",
    case: "dative",
    auxiliary: "haben",
    praesens: ["ähnele", "ähnelst", "ähnelt", "ähneln", "ähnelt", "ähneln"],
    praeteritumStem: "ähnelte",
    partizip2: "geähnelt",
    notes: "+ dative person: er ähnelt seinem Vater",
  },
  {
    german: "genügen",
    english: "be enough",
    level: "B1",
    type: "regular",
    case: "dative",
    auxiliary: "haben",
    praesens: ["genüge", "genügst", "genügt", "genügen", "genügt", "genügen"],
    praeteritumStem: "genügte",
    partizip2: "genügt",
    notes: "the sufficient thing is the subject: das genügt mir",
  },
  {
    german: "gehorchen",
    english: "obey",
    level: "B1",
    type: "regular",
    case: "dative",
    auxiliary: "haben",
    praesens: [
      "gehorche",
      "gehorchst",
      "gehorcht",
      "gehorchen",
      "gehorcht",
      "gehorchen",
    ],
    praeteritumStem: "gehorchte",
    partizip2: "gehorcht",
    notes: "+ dative person: der Hund gehorcht ihr",
  },
  {
    german: "nützen",
    english: "be of use",
    level: "B1",
    type: "regular",
    case: "dative",
    auxiliary: "haben",
    praesens: ["nütze", "nützt", "nützt", "nützen", "nützt", "nützen"],
    praeteritumStem: "nützte",
    partizip2: "genützt",
    notes: "the useful thing is the subject: das nützt mir nichts",
  },
  {
    german: "auffallen",
    english: "stand out / be noticeable",
    level: "B1",
    type: "separable",
    case: "dative",
    auxiliary: "sein",
    separablePrefix: "auf",
    praesens: [
      "falle auf",
      "fällst auf",
      "fällt auf",
      "fallen auf",
      "fallt auf",
      "fallen auf",
    ],
    praeteritumStem: "fiel",
    partizip2: "aufgefallen",
    imperativDu: "fall",
    notes: "the striking thing is the subject: der Fehler fällt mir auf",
  },
  {
    german: "leidtun",
    english: "be sorry",
    level: "B1",
    type: "separable",
    case: "dative",
    auxiliary: "haben",
    separablePrefix: "leid",
    praesens: [
      "tue leid",
      "tust leid",
      "tut leid",
      "tun leid",
      "tut leid",
      "tun leid",
    ],
    praeteritumStem: "tat",
    partizip2: "leidgetan",
    notes: "fixed experiencer pattern: es tut mir leid",
  },
  {
    german: "guttun",
    english: "do good / be good for",
    level: "B1",
    type: "separable",
    case: "dative",
    auxiliary: "haben",
    separablePrefix: "gut",
    praesens: [
      "tue gut",
      "tust gut",
      "tut gut",
      "tun gut",
      "tut gut",
      "tun gut",
    ],
    praeteritumStem: "tat",
    partizip2: "gutgetan",
    notes: "the beneficial thing is the subject: die Pause tut mir gut",
  },
  {
    german: "zusehen",
    english: "watch",
    level: "B1",
    type: "separable",
    case: "dative",
    auxiliary: "haben",
    separablePrefix: "zu",
    praesens: [
      "sehe zu",
      "siehst zu",
      "sieht zu",
      "sehen zu",
      "seht zu",
      "sehen zu",
    ],
    praeteritumStem: "sah",
    partizip2: "zugesehen",
    imperativDu: "sieh",
    notes: "+ dative person: ich sehe dem Koch zu",
  },
  {
    german: "zuschauen",
    english: "watch",
    level: "B1",
    type: "separable",
    case: "dative",
    auxiliary: "haben",
    separablePrefix: "zu",
    praesens: [
      "schaue zu",
      "schaust zu",
      "schaut zu",
      "schauen zu",
      "schaut zu",
      "schauen zu",
    ],
    praeteritumStem: "schaute",
    partizip2: "zugeschaut",
    notes: "+ dative person: wir schauen den Tänzern zu",
  },
  {
    german: "sich nähern",
    english: "approach",
    level: "B1",
    type: "regular",
    case: "dative",
    auxiliary: "haben",
    praesens: ["nähere", "näherst", "nähert", "nähern", "nähert", "nähern"],
    praeteritumStem: "näherte",
    partizip2: "genähert",
    notes: "reflexive + dative: der Zug nähert sich dem Bahnhof",
  },
```

Note: `sich nähern` follows the `sich treffen` precedent — `german` carries the `sich `, the six `praesens` forms do **not** (the invariant test strips `sich ` before comparing). Its `case` is `"dative"`, not `"reflexive"`: the case field records object government, and the phase-1 cross-ref gate (Task 5) requires it.

- [ ] **Step 3: Sense coverage.** In `src/data/verb-senses.ts`:

New entry (alphabetical position):

```ts
  {
    meaning: 'watch',
    senses: [
      { cue: 'looking on while others do something', verbs: ['zusehen', 'zuschauen'] }
    ]
  },
```

(`zusehen`/`zuschauen` are ADR-0016 unsplittable near-synonyms — one merged sense, both graded correct. `fernsehen`'s gloss normalizes to `watch tv`, a different meaning key, so it stays out.)

Edit to the existing `meaning: 'be enough'` entry — the single sense gains `genügen`:

```ts
      { cue: 'having just enough of something to get by', verbs: ['ausreichen', 'reichen', 'genügen'] }
```

- [ ] **Step 4: Verify green.**

Run: `npx vitest run tests/data/verbs.test.ts tests/data/verbSenses.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/verbs.ts src/data/verb-tips.ts src/data/verb-senses.ts
git commit -m "feat(verbs): 11 B1 dative verbs with tips and sense coverage

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: B2.1 verbs (9) + tips + sense coverage

**Files:**
- Modify: `src/data/verbs.ts` (one insertion point)
- Modify: `src/data/verb-tips.ts`
- Modify: `src/data/verb-senses.ts`

**Interfaces:**
- Consumes: `Verb` interface (same as Task 1).
- Produces: 9 new `VERBS` entries — `befehlen`, `imponieren`, `misstrauen`, `beitreten`, `ausweichen`, `beistehen`, `misslingen`, `unterliegen`, `entgehen`. **Never** level B2.2 (test pins that batch at 200).

- [ ] **Step 1: Add 9 tips to `src/data/verb-tips.ts`** as the last lines of the `// ─── B2 ───` region (that region holds the B2.1 batch) — immediately **before** the `// ─── B2.2 ───` comment:

```ts
  // Task 3 — dative-module pool expansion (B2.1)
  "befehlen": "A general tells the troops what to do.",
  "imponieren": "Someone's feat leaves you in quiet awe.",
  "misstrauen": "To withhold your confidence from someone.",
  "beitreten": "To become a member of a club or party.",
  "ausweichen": "To sidestep an obstacle or an awkward question.",
  "beistehen": "To stay at someone's side through their trouble.",
  "misslingen": "The cake collapses; the attempt comes to nothing.",
  "unterliegen": "To lose the contest; also to be bound by rules.",
  "entgehen": "A detail slips past you unnoticed.",
```

- [ ] **Step 2: Add the 9 verbs.** Insert immediately **before** the line `  // ─── B2.2 verbs — frequency-rank order per tools/data/b2-2-selected.txt ─────` in `src/data/verbs.ts`:

```ts
  {
    german: "befehlen",
    english: "order / command",
    level: "B2.1",
    type: "irregular",
    case: "dative",
    auxiliary: "haben",
    praesens: [
      "befehle",
      "befiehlst",
      "befiehlt",
      "befehlen",
      "befehlt",
      "befehlen",
    ],
    praeteritumStem: "befahl",
    partizip2: "befohlen",
    imperativDu: "befiehl",
    notes: "+ dative person: der General befiehlt den Soldaten",
  },
  {
    german: "imponieren",
    english: "impress",
    level: "B2.1",
    type: "regular",
    case: "dative",
    auxiliary: "haben",
    praesens: [
      "imponiere",
      "imponierst",
      "imponiert",
      "imponieren",
      "imponiert",
      "imponieren",
    ],
    praeteritumStem: "imponierte",
    partizip2: "imponiert",
    notes: "the impressive thing is the subject: dein Mut imponiert mir",
  },
  {
    german: "misstrauen",
    english: "distrust / mistrust",
    level: "B2.1",
    type: "regular",
    case: "dative",
    auxiliary: "haben",
    praesens: [
      "misstraue",
      "misstraust",
      "misstraut",
      "misstrauen",
      "misstraut",
      "misstrauen",
    ],
    praeteritumStem: "misstraute",
    partizip2: "misstraut",
    notes: "inseparable; + dative person",
  },
  {
    german: "beitreten",
    english: "join",
    level: "B2.1",
    type: "separable",
    case: "dative",
    auxiliary: "sein",
    separablePrefix: "bei",
    praesens: [
      "trete bei",
      "trittst bei",
      "tritt bei",
      "treten bei",
      "tretet bei",
      "treten bei",
    ],
    praeteritumStem: "trat",
    partizip2: "beigetreten",
    imperativDu: "tritt",
    notes: "+ dative group: er ist dem Verein beigetreten",
  },
  {
    german: "ausweichen",
    english: "dodge / evade",
    level: "B2.1",
    type: "separable",
    case: "dative",
    auxiliary: "sein",
    separablePrefix: "aus",
    praesens: [
      "weiche aus",
      "weichst aus",
      "weicht aus",
      "weichen aus",
      "weicht aus",
      "weichen aus",
    ],
    praeteritumStem: "wich",
    partizip2: "ausgewichen",
    notes: "+ dative: das Auto wich dem Radfahrer aus",
  },
  {
    german: "beistehen",
    english: "assist / stand by",
    level: "B2.1",
    type: "separable",
    case: "dative",
    auxiliary: "haben",
    separablePrefix: "bei",
    praesens: [
      "stehe bei",
      "stehst bei",
      "steht bei",
      "stehen bei",
      "steht bei",
      "stehen bei",
    ],
    praeteritumStem: "stand",
    partizip2: "beigestanden",
    notes: "+ dative person: sie stand ihrer Freundin bei",
  },
  {
    german: "misslingen",
    english: "fail / go wrong",
    level: "B2.1",
    type: "irregular",
    case: "dative",
    auxiliary: "sein",
    praesens: [
      "misslinge",
      "misslingst",
      "misslingt",
      "misslingen",
      "misslingt",
      "misslingen",
    ],
    praeteritumStem: "misslang",
    partizip2: "misslungen",
    notes: "usually impersonal, mirror of gelingen: es misslingt mir",
  },
  {
    german: "unterliegen",
    english: "be subject to / be defeated",
    level: "B2.1",
    type: "irregular",
    case: "dative",
    auxiliary: "haben",
    praesens: [
      "unterliege",
      "unterliegst",
      "unterliegt",
      "unterliegen",
      "unterliegt",
      "unterliegen",
    ],
    praeteritumStem: "unterlag",
    partizip2: "unterlegen",
    notes: "inseparable; Perfekt of the defeated sense often with sein",
  },
  {
    german: "entgehen",
    english: "escape / elude",
    level: "B2.1",
    type: "irregular",
    case: "dative",
    auxiliary: "sein",
    praesens: [
      "entgehe",
      "entgehst",
      "entgeht",
      "entgehen",
      "entgeht",
      "entgehen",
    ],
    praeteritumStem: "entging",
    partizip2: "entgangen",
    notes: "the escaping thing is the subject: der Fehler entging mir",
  },
```

- [ ] **Step 3: Sense coverage.** In `src/data/verb-senses.ts`:

New entries (3, alphabetical position):

```ts
  {
    meaning: 'evade',
    senses: [
      { cue: 'getting around a rule or an obstacle', verbs: ['umgehen'] },
      { cue: 'sidestepping a punch or an awkward question', verbs: ['ausweichen'] }
    ]
  },
```

```ts
  {
    meaning: 'order',
    senses: [
      { cue: 'asking the waiter to bring food or booking goods', verbs: ['bestellen'] },
      { cue: 'a general or a boss demanding something be done', verbs: ['befehlen'] }
    ]
  },
```

```ts
  {
    meaning: 'stand by',
    senses: [
      { cue: 'waiting ready to be used or deployed', verbs: ['bereitstehen'] },
      { cue: 'staying at the side of someone in trouble', verbs: ['beistehen'] }
    ]
  },
```

Edits to existing entries (2):

`meaning: 'fail'` gains a third sense:

```ts
  {
    meaning: 'fail',
    senses: [
      { cue: 'the power or a machine breaking down', verbs: ['ausfallen'] },
      { cue: 'a plan or a relationship falling apart', verbs: ['scheitern'] },
      { cue: 'a cake or an attempt turning out badly', verbs: ['misslingen'] }
    ]
  },
```

`meaning: 'join'` gains a third sense:

```ts
  {
    meaning: 'join',
    senses: [
      { cue: 'attaching yourself to a group that is already going', verbs: ['anschließen'] },
      { cue: 'an extra person or factor being added to the rest', verbs: ['hinzukommen'] },
      { cue: 'formally becoming a member of a club or party', verbs: ['beitreten'] }
    ]
  },
```

- [ ] **Step 4: Verify green.**

Run: `npx vitest run tests/data/verbs.test.ts tests/data/verbSenses.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/verbs.ts src/data/verb-tips.ts src/data/verb-senses.ts
git commit -m "feat(verbs): 9 B2.1 dative verbs with tips and sense coverage

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Fix `stehen` — `case: "none"` → `case: "varies"`

**Decision (committed):** `stehen` becomes `case: "varies"`, **not** `case: "dative"`. Reasoning: the pool's `stehen` is the posture verb — its own tip reads "Upright and still." — and in that dominant sense it takes **no object** (`Ich stehe am Fenster`). Only the suit sense takes a dative (`Das Kleid steht dir`). A flat `dative` tag would make the Rektion drill grade "stehen → Kein Objekt" as wrong and "Dativ" as right, actively teaching a false rule for the sense learners meet first. `glauben` sets the exact precedent (`case: "varies"`, notes "dative for persons, accusative for things"). **Knock-on, accepted:** the Rektion drill excludes `varies`, so `stehen` drops out of it — the same deliberate exclusion already applied to `glauben` and `vergeben` (spec §What deliberately stays out). Consequently `stehen` is **not** a `DATIVE_VERBS` key in Task 5 (the cross-ref gate requires `case: 'dative'`); the suit sense is taught by the module's cheatsheet and twin material (phases 3–4).

**Files:**
- Modify: `src/data/verbs.ts` (the `stehen` entry, currently at ~line 411)

**Interfaces:**
- Consumes: the existing `stehen` entry.
- Produces: `stehen` with `case: "varies"` — downstream, `CaseGovernmentSetup.vue` automatically excludes it (its `CASE_GOVERNMENT_CASES` list omits `varies`).

- [ ] **Step 1: Edit the entry.** In `src/data/verbs.ts`, find the `stehen` entry and change `case: "none"` to `case: "varies"`, adding a `notes` line. The entry becomes:

```ts
  {
    german: "stehen",
    english: "stand",
    level: "A1",
    type: "irregular",
    case: "varies",
    auxiliary: "haben",
    praesens: ["stehe", "stehst", "steht", "stehen", "steht", "stehen"],
    praeteritumStem: "stand",
    partizip2: "gestanden",
    konjunktiv2: [
      "stünde",
      "stündest",
      "stünde",
      "stünden",
      "stündet",
      "stünden",
    ],
    notes: "no object when standing; + dative in the suit sense: das Kleid steht dir",
  },
```

- [ ] **Step 2: Verify green.**

Run: `npx vitest run tests/data/verbs.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/data/verbs.ts
git commit -m "fix(verbs): stehen is case varies, not none — dative in the suit sense

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `src/data/dativeVerbs.ts` — the side-table, all 44 entries + gates 1/3/5/7

**Files:**
- Create: `src/data/dativeVerbs.ts`
- Test: `tests/data/dativeVerbs.test.ts`

**Interfaces:**
- Consumes: `VERBS` from `src/data/verbs.ts` (test only — the side-table itself imports nothing).
- Produces (pinned; phases 2–4 use these names verbatim):

```ts
export interface DativeVerbEntry {
  family: 'recipient' | 'experiencer' | 'co-agent'
  coreIdeaHint: string
  coreIdeaExplanation: string
  twin?: string
  englishPull?: true
  experiencer?: true
  swallowed?: string
}
export const DATIVE_VERBS: Record<string, DativeVerbEntry>
export const DATIVE_VERB_KEYS: readonly string[]        // Object.keys(DATIVE_VERBS), frozen
export function dativeVerbsBy(family: DativeVerbEntry['family']): string[]
```

- [ ] **Step 1: Write the failing gate tests.** Create `tests/data/dativeVerbs.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { VERBS } from '../../src/data/verbs'
import { DATIVE_VERBS, DATIVE_VERB_KEYS, dativeVerbsBy } from '../../src/data/dativeVerbs'

const byGerman = new Map(VERBS.map(v => [v.german, v]))
const entries = Object.entries(DATIVE_VERBS)

describe('DATIVE_VERBS invariants', () => {
  test('CROSS-REF GATE: every key exists in VERBS.german and carries case "dative" there', () => {
    const bad = DATIVE_VERB_KEYS.filter(k => byGerman.get(k)?.case !== 'dative')
    expect(bad).toEqual([])
  })

  test('TWIN GATE: every twin exists in VERBS.german and its case is NOT dative', () => {
    const bad = entries
      .filter(([, e]) => e.twin !== undefined)
      .filter(([, e]) => {
        const t = byGerman.get(e.twin!)
        return !t || t.case === 'dative'
      })
      .map(([k]) => k)
    expect(bad).toEqual([])
  })

  test('SWALLOWED GATE: swallowed is never set on an entry with experiencer: true', () => {
    const bad = entries
      .filter(([, e]) => e.experiencer === true && e.swallowed !== undefined)
      .map(([k]) => k)
    expect(bad).toEqual([])
  })

  test('HINT CONTRACT: ≤90 chars, ≤14 words, unique, never "Dativ" or a dative form', () => {
    const seen = new Set<string>()
    const forbidden = /\b(dativ|dative|dem|den|ihm|ihnen|mir|dir|euch|uns)\b/i
    const bad = entries.filter(([, e]) => {
      const h = e.coreIdeaHint
      const dupe = seen.has(h)
      seen.add(h)
      return dupe
        || h.length > 90
        || h.trim().split(/\s+/).length > 14
        || forbidden.test(h)
    }).map(([k]) => k)
    expect(bad).toEqual([])
  })

  test('explanations name the verb and the case', () => {
    const bad = entries.filter(([k, e]) =>
      !e.coreIdeaExplanation.includes('Dativ')
      || !e.coreIdeaExplanation.toLowerCase().includes(k.toLowerCase())
    ).map(([k]) => k)
    expect(bad).toEqual([])
  })

  test('experiencer family and experiencer flag agree', () => {
    const bad = entries.filter(([, e]) =>
      (e.family === 'experiencer') !== (e.experiencer === true)
    ).map(([k]) => k)
    expect(bad).toEqual([])
  })

  test('the nine spec trap verbs carry englishPull', () => {
    const traps = ['helfen', 'danken', 'folgen', 'antworten', 'vertrauen',
      'gratulieren', 'zuhören', 'widersprechen', 'ähneln']
    const bad = traps.filter(k => DATIVE_VERBS[k]?.englishPull !== true)
    expect(bad).toEqual([])
  })

  test('keys are frozen, derived, and the bank covers the pool: ≥44 entries, every family populated', () => {
    expect(Object.isFrozen(DATIVE_VERB_KEYS)).toBe(true)
    expect([...DATIVE_VERB_KEYS]).toEqual(Object.keys(DATIVE_VERBS))
    expect(DATIVE_VERB_KEYS.length).toBeGreaterThanOrEqual(44)
    for (const fam of ['recipient', 'experiencer', 'co-agent'] as const) {
      expect(dativeVerbsBy(fam).length, fam).toBeGreaterThan(0)
    }
    const sum = dativeVerbsBy('recipient').length + dativeVerbsBy('experiencer').length + dativeVerbsBy('co-agent').length
    expect(sum).toBe(DATIVE_VERB_KEYS.length)
  })

  test('every pool verb with case dative has a side-table entry', () => {
    const missing = VERBS.filter(v => v.case === 'dative' && !DATIVE_VERBS[v.german]).map(v => v.german)
    expect(missing).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure.**

Run: `npx vitest run tests/data/dativeVerbs.test.ts`
Expected: FAIL — cannot resolve `../../src/data/dativeVerbs`.

- [ ] **Step 3: Create `src/data/dativeVerbs.ts`** with this exact content (44 entries: 9 recipient, 18 experiencer, 17 co-agent — the 15 pre-existing dative verbs plus the 29 added in Tasks 1–3; `stehen` is deliberately absent, see Task 4):

```ts
// Dative-verb side-table — teaching data for the Dativ module, following the
// verb-tips.ts / verb-senses.ts precedent: it holds ONLY dative-specific
// content and keys into VERBS.german for the verb itself, its level, and its
// conjugation. verbs.ts stays the single source of truth for what a verb is.
//
// family    — the [Semantic family] (CONTEXT.md): a memory hook, not a rule.
// hint      — [Core-idea hint] contract: ≤90 chars, ≤14 words, unique, never
//             the word "Dativ" or a dative form. Shown BEFORE the answer.
// explanation — [Core-idea explanation]: unpacks the mechanism, then names
//             the verb and case. Shown only on a miss.
// swallowed — the [Swallowed accusative] hook. NEVER on experiencer entries.
// twin      — [Twin verb]: accusative near-synonym, exactly as in VERBS.german.

export interface DativeVerbEntry {
  family: 'recipient' | 'experiencer' | 'co-agent'
  /** ≤ 90 chars, ≤ 14 words, unique — same contract as coreIdeaHint. */
  coreIdeaHint: string
  /** Unpacks the mechanism, then names the verb and case. Shown only on a miss. */
  coreIdeaExplanation: string
  /** Accusative near-synonym, exactly as in VERBS.german, or absent. */
  twin?: string
  /** English equivalent takes a plain direct object. */
  englishPull?: true
  /** Thing is the nominative subject; person is dative. */
  experiencer?: true
  /** Swallowed-accusative hook applies. Never set on experiencer verbs. */
  swallowed?: string
}

export const DATIVE_VERBS: Record<string, DativeVerbEntry> = {
  // ─── recipient ─────────────────────────────────────────────────────────
  'danken': {
    family: 'recipient',
    coreIdeaHint: 'You hand someone your gratitude; the words themselves are the gift.',
    coreIdeaExplanation: 'danken = give [thanks] to somebody: the thing given (der Dank) is swallowed into the verb, leaving only the receiver behind. So danken takes the Dativ: Ich danke dir.',
    englishPull: true,
    swallowed: 'give [thanks] to somebody',
  },
  'antworten': {
    family: 'recipient',
    coreIdeaHint: 'A reply travels to the asker; what travels is already inside the verb.',
    coreIdeaExplanation: 'antworten = give [an answer] to somebody: the accusative (die Antwort) was absorbed into the verb, so only the receiver is left. antworten takes the Dativ: Sie antwortet dem Lehrer. The twin beantworten keeps the thing as its object: eine Frage beantworten (Akkusativ).',
    twin: 'beantworten',
    englishPull: true,
    swallowed: 'give [an answer] to somebody',
  },
  'raten': {
    family: 'recipient',
    coreIdeaHint: 'You pass a piece of guidance across the table to someone.',
    coreIdeaExplanation: 'raten = give [advice] to somebody: der Rat is swallowed into the verb and the person advised stays as the affected receiver. raten takes the Dativ: Ich rate dir zu warten.',
    englishPull: true,
    swallowed: 'give [advice] to somebody',
  },
  'gratulieren': {
    family: 'recipient',
    coreIdeaHint: 'Good wishes delivered straight into another person\'s hands on their big day.',
    coreIdeaExplanation: 'gratulieren = offer [congratulations] to somebody: the Glückwünsche are built into the verb, leaving only the celebrated person. gratulieren takes the Dativ: Wir gratulieren ihr zum Geburtstag.',
    englishPull: true,
    swallowed: 'offer [congratulations] to somebody',
  },
  'verzeihen': {
    family: 'recipient',
    coreIdeaHint: 'Pardon is granted to the person, not aimed at them.',
    coreIdeaExplanation: 'verzeihen = grant [pardon] to somebody: the forgiveness itself is inside the verb, so the forgiven person stands as receiver. verzeihen takes the Dativ: Verzeih mir!',
    englishPull: true,
    swallowed: 'grant [pardon] to somebody',
  },
  'befehlen': {
    family: 'recipient',
    coreIdeaHint: 'A command is issued downward; the order lands with the one who must obey.',
    coreIdeaExplanation: 'befehlen = give [an order] to somebody: der Befehl is swallowed into the verb; the commanded person is its receiver. befehlen takes the Dativ: Der General befiehlt den Soldaten.',
    englishPull: true,
    swallowed: 'give [an order] to somebody',
  },
  'drohen': {
    family: 'recipient',
    coreIdeaHint: 'A threat is delivered like a dark parcel to its target.',
    coreIdeaExplanation: 'drohen = make [a threat] to somebody: die Drohung is packed into the verb, leaving the threatened person as receiver. drohen takes the Dativ: Er droht seinem Nachbarn.',
    englishPull: true,
    swallowed: 'make [a threat] to somebody',
  },
  'vertrauen': {
    family: 'recipient',
    coreIdeaHint: 'You place your confidence in someone\'s keeping, like a deposit.',
    coreIdeaExplanation: 'vertrauen = give [your trust] to somebody: das Vertrauen is handed over, and the person holding it is the receiver. vertrauen takes the Dativ: Ich vertraue meiner Ärztin — English "trust somebody" pulls toward the Akkusativ.',
    englishPull: true,
    swallowed: 'give [your trust] to somebody',
  },
  'misstrauen': {
    family: 'recipient',
    coreIdeaHint: 'The same deposit of confidence, pointedly withheld from its keeper.',
    coreIdeaExplanation: 'misstrauen is vertrauen with the trust withheld — the person is still construed as its would-be receiver. misstrauen takes the Dativ: Sie misstraut jedem Verkäufer.',
    englishPull: true,
  },

  // ─── experiencer (thing is subject, person is dative; NEVER swallowed) ──
  'gefallen': {
    family: 'experiencer',
    coreIdeaHint: 'The thing does the pleasing; the person just registers it.',
    coreIdeaExplanation: 'With gefallen the thing is the subject and controls the verb; the person who feels the appeal is the affected experiencer. gefallen takes the Dativ: Die Schuhe gefallen mir — never *Ich gefalle die Schuhe.',
    experiencer: true,
  },
  'schmecken': {
    family: 'experiencer',
    coreIdeaHint: 'The food performs; the eater only receives the verdict.',
    coreIdeaExplanation: 'The dish is the subject — it does the tasting-good — while the taster is the affected experiencer. schmecken takes the Dativ: Die Suppe schmeckt dem Kind.',
    experiencer: true,
  },
  'gehören': {
    family: 'experiencer',
    coreIdeaHint: 'The object announces its owner; ownership radiates from the thing.',
    coreIdeaExplanation: 'The possessed thing is the subject and the owner is marked as the affected person. gehören takes the Dativ: Das Fahrrad gehört meinem Bruder. (gehören zu means "to be part of" — a different pattern.)',
    experiencer: true,
  },
  'fehlen': {
    family: 'experiencer',
    coreIdeaHint: 'An absence makes itself felt; someone senses the hole it leaves.',
    coreIdeaExplanation: 'What is missing is the subject; the person who feels the lack is the dative experiencer. fehlen takes the Dativ: Du fehlst mir.',
    experiencer: true,
  },
  'passen': {
    family: 'experiencer',
    coreIdeaHint: 'The garment does the fitting; the wearer merely finds out.',
    coreIdeaExplanation: 'The thing that fits is the subject, the person it suits is the experiencer. passen takes the Dativ: Die Jacke passt dir nicht.',
    experiencer: true,
  },
  'gelingen': {
    family: 'experiencer',
    coreIdeaHint: 'Success happens to you; the project itself carries the triumph.',
    coreIdeaExplanation: 'The thing that turns out well is the subject; the person is its beneficiary-experiencer. gelingen takes the Dativ (and sein): Der Kuchen ist mir gelungen.',
    experiencer: true,
  },
  'misslingen': {
    family: 'experiencer',
    coreIdeaHint: 'Failure also happens to you; the project carries the flop.',
    coreIdeaExplanation: 'The mirror of gelingen: the failed thing is the subject, the person the affected experiencer. misslingen takes the Dativ (and sein): Der Plan ist uns misslungen.',
    experiencer: true,
  },
  'schaden': {
    family: 'experiencer',
    coreIdeaHint: 'The harm flows out of the thing and lands on a person.',
    coreIdeaExplanation: 'The damaging thing is the subject; the person or thing harmed is the affected party. schaden takes the Dativ: Rauchen schadet der Gesundheit.',
    experiencer: true,
  },
  'wehtun': {
    family: 'experiencer',
    coreIdeaHint: 'The aching part is the actor; its owner suffers the performance.',
    coreIdeaExplanation: 'The hurting body part is the subject and the person who feels it is the experiencer. wehtun takes the Dativ: Mein Rücken tut mir weh.',
    experiencer: true,
  },
  'einfallen': {
    family: 'experiencer',
    coreIdeaHint: 'An idea drops in uninvited; the mind is only its landing place.',
    coreIdeaExplanation: 'The idea is the subject — it "falls in" — and the person it strikes is the experiencer. einfallen takes the Dativ (and sein): Der Name fällt mir nicht ein.',
    experiencer: true,
  },
  'auffallen': {
    family: 'experiencer',
    coreIdeaHint: 'Something leaps to the eye; the eye\'s owner just registers the jolt.',
    coreIdeaExplanation: 'The striking thing is the subject; the person who notices is the experiencer. auffallen takes the Dativ (and sein): Der Fehler ist mir sofort aufgefallen.',
    experiencer: true,
  },
  'genügen': {
    family: 'experiencer',
    coreIdeaHint: 'The amount declares itself sufficient; a person receives that verdict.',
    coreIdeaExplanation: 'What suffices is the subject and the satisfied person is the experiencer. genügen takes the Dativ: Eine kurze Antwort genügt mir.',
    experiencer: true,
  },
  'nützen': {
    family: 'experiencer',
    coreIdeaHint: 'The tool radiates usefulness toward whoever profits from it.',
    coreIdeaExplanation: 'The useful thing is the subject; the person who benefits is the affected party. nützen takes the Dativ: Das Wörterbuch nützt den Studenten viel.',
    experiencer: true,
  },
  'imponieren': {
    family: 'experiencer',
    coreIdeaHint: 'The feat does the impressing; the admirer only absorbs it.',
    coreIdeaExplanation: 'The impressive thing is the subject, the impressed person the experiencer — English "impress somebody" pulls the wrong way. imponieren takes the Dativ: Dein Mut imponiert mir.',
    englishPull: true,
    experiencer: true,
  },
  'passieren': {
    family: 'experiencer',
    coreIdeaHint: 'Events simply land on people; whoever they strike is marked.',
    coreIdeaExplanation: 'What happens is the subject; the person it happens to is the affected experiencer. passieren takes the Dativ (and sein): Das ist mir noch nie passiert.',
    experiencer: true,
  },
  'leidtun': {
    family: 'experiencer',
    coreIdeaHint: 'The regret radiates from its cause; a person merely holds the sorrow.',
    coreIdeaExplanation: 'The regretted thing (or es) is the subject; the person who is sorry is the experiencer. leidtun takes the Dativ: Es tut mir leid. Er tut ihr leid.',
    experiencer: true,
  },
  'guttun': {
    family: 'experiencer',
    coreIdeaHint: 'The rest cure acts; the patient soaks up its effect.',
    coreIdeaExplanation: 'What does good is the subject; the person restored is the experiencer. guttun takes the Dativ: Die Pause hat mir gutgetan.',
    experiencer: true,
  },
  'entgehen': {
    family: 'experiencer',
    coreIdeaHint: 'The detail slips past; the person is the checkpoint it evaded.',
    coreIdeaExplanation: 'The escaping thing is the subject and the person who misses it is the experiencer. entgehen takes the Dativ (and sein): Der Fehler ist dem Prüfer entgangen.',
    experiencer: true,
  },

  // ─── co-agent ──────────────────────────────────────────────────────────
  'helfen': {
    family: 'co-agent',
    coreIdeaHint: 'Your effort joins another person\'s struggle; two forces working the same problem.',
    coreIdeaExplanation: 'helfen = give [help] to somebody, an action that meets the other person\'s own effort (action–reaction). helfen takes the Dativ: Ich helfe meiner Mutter — English "help somebody" pulls toward the Akkusativ. The twin unterstützen does take the Akkusativ.',
    twin: 'unterstützen',
    englishPull: true,
    swallowed: 'give [help] to somebody',
  },
  'folgen': {
    family: 'co-agent',
    coreIdeaHint: 'You match another mover\'s path, step answering step.',
    coreIdeaExplanation: 'The follower reacts to the leader\'s movement — two agents in one scene. folgen takes the Dativ (and sein): Der Hund folgt seinem Herrn. The twin verfolgen (to pursue, to hunt) takes the Akkusativ.',
    twin: 'verfolgen',
    englishPull: true,
  },
  'widersprechen': {
    family: 'co-agent',
    coreIdeaHint: 'Your words push back against another speaker\'s words.',
    coreIdeaExplanation: 'Contradicting is speech meeting speech — you counter the other person\'s utterance rather than acting on them. widersprechen takes the Dativ: Sie widerspricht ihrem Chef — though English "contradict somebody" is transitive.',
    englishPull: true,
  },
  'zuhören': {
    family: 'co-agent',
    coreIdeaHint: 'Your attention leans toward the speaker and stays fastened there.',
    coreIdeaExplanation: 'zuhören is attention directed at a person mid-performance — an interaction, not a grab. zuhören takes the Dativ: Hör deiner Lehrerin zu! The twin hören (to hear something) takes the Akkusativ: Musik hören.',
    twin: 'hören',
    englishPull: true,
  },
  'zusehen': {
    family: 'co-agent',
    coreIdeaHint: 'Your gaze accompanies someone at work without touching the work.',
    coreIdeaExplanation: 'Watching someone act is a silent participation in their scene. zusehen takes the Dativ: Die Kinder sehen dem Koch zu — English "watch somebody" pulls toward the Akkusativ.',
    englishPull: true,
  },
  'zuschauen': {
    family: 'co-agent',
    coreIdeaHint: 'A spectator\'s eyes travel with the players through the whole match.',
    coreIdeaExplanation: 'Like zusehen, zuschauen construes the watched person as a co-participant, not a grabbed object. zuschauen takes the Dativ: Wir schauen den Tänzern zu.',
    englishPull: true,
  },
  'begegnen': {
    family: 'co-agent',
    coreIdeaHint: 'Two paths cross; each walker is the other\'s counterpart.',
    coreIdeaExplanation: 'A chance meeting is symmetric — the person you run into is your co-agent, not your target. begegnen takes the Dativ (and sein): Ich bin ihm im Park begegnet. The near-twin treffen takes the Akkusativ.',
    twin: 'treffen',
    englishPull: true,
  },
  'gehorchen': {
    family: 'co-agent',
    coreIdeaHint: 'One will bends to another will; the two stay in dialogue.',
    coreIdeaExplanation: 'Obeying answers another person\'s command — reaction to their action. gehorchen takes the Dativ: Der Hund gehorcht seiner Besitzerin — English "obey somebody" is transitive.',
    englishPull: true,
  },
  'dienen': {
    family: 'co-agent',
    coreIdeaHint: 'Your work bends itself around another person\'s purposes.',
    coreIdeaExplanation: 'Serving is sustained cooperation directed at a person\'s interest, not an act done to them. dienen takes the Dativ: Er diente dem König treu — English "serve somebody" pulls toward the Akkusativ.',
    englishPull: true,
  },
  'beistehen': {
    family: 'co-agent',
    coreIdeaHint: 'You plant yourself at a struggling person\'s side and hold the line.',
    coreIdeaExplanation: 'beistehen is literally standing by someone — shoulder to shoulder, co-agents against the trouble. beistehen takes the Dativ: Sie stand ihrer Freundin in der Krise bei.',
  },
  'beitreten': {
    family: 'co-agent',
    coreIdeaHint: 'You step across a threshold and take your place inside a group.',
    coreIdeaExplanation: 'Joining construes the club as the body you attach yourself to. beitreten takes the Dativ (and sein): Er ist dem Verein beigetreten — English "join something" is transitive.',
    englishPull: true,
  },
  'ausweichen': {
    family: 'co-agent',
    coreIdeaHint: 'You bend your own path around what is coming at you.',
    coreIdeaExplanation: 'Dodging is movement answering movement — the obstacle keeps its course and you adjust yours. ausweichen takes the Dativ (and sein): Das Auto wich dem Radfahrer aus. The twin vermeiden (to avoid doing or having something) takes the Akkusativ.',
    twin: 'vermeiden',
    englishPull: true,
  },
  'sich nähern': {
    family: 'co-agent',
    coreIdeaHint: 'Your course and a target\'s position slowly close the gap between them.',
    coreIdeaExplanation: 'Approaching is your movement measured against the other\'s position — a relation, not a grab. sich nähern takes the Dativ: Der Zug nähert sich dem Bahnhof — English "approach something" is transitive.',
    englishPull: true,
  },
  'unterliegen': {
    family: 'co-agent',
    coreIdeaHint: 'In the contest\'s final scene you are the one lying underneath.',
    coreIdeaExplanation: 'Losing to someone keeps both contestants in the frame — the winner is your counterpart. unterliegen takes the Dativ: Sie unterlag ihrer Rivalin im Finale; also "be subject to": Der Vertrag unterliegt dem deutschen Recht.',
  },
  'zustimmen': {
    family: 'co-agent',
    coreIdeaHint: 'Your voice adds itself to another person\'s proposal.',
    coreIdeaExplanation: 'zustimmen = give [your agreement] to a person or proposal — die Zustimmung is inside the verb. zustimmen takes the Dativ: Ich stimme dem Vorschlag zu.',
    swallowed: 'give [your agreement] to somebody',
  },
  'ähneln': {
    family: 'co-agent',
    coreIdeaHint: 'Two faces mirror each other; likeness is a relation, not an action.',
    coreIdeaExplanation: 'Resemblance holds between two counterparts — neither acts on the other. ähneln takes the Dativ: Das Kind ähnelt seinem Großvater — though English "resemble somebody" is transitive.',
    englishPull: true,
  },
  'entsprechen': {
    family: 'co-agent',
    coreIdeaHint: 'One thing lines up point for point with its counterpart.',
    coreIdeaExplanation: 'Corresponding is a matching relation between two items, each the other\'s reference. entsprechen takes the Dativ: Der Bericht entspricht den Tatsachen.',
  },
}

export const DATIVE_VERB_KEYS: readonly string[] = Object.freeze(Object.keys(DATIVE_VERBS))

export function dativeVerbsBy(family: DativeVerbEntry['family']): string[] {
  return DATIVE_VERB_KEYS.filter(k => DATIVE_VERBS[k].family === family)
}
```

- [ ] **Step 4: Run to verify pass.**

Run: `npx vitest run tests/data/dativeVerbs.test.ts`
Expected: PASS — all 9 tests. If the cross-ref gate lists ids, a Task 1–3 verb is missing or mis-cased; fix the data, never the test. If the *inverse* gate ("every pool verb with case dative has a side-table entry") lists a verb this plan does not mention, the pool contains a dative verb the spec did not account for — STOP and report it to the controller rather than inventing an entry.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/dativeVerbs.ts tests/data/dativeVerbs.test.ts
git commit -m "feat(dative): dativeVerbs side-table, 44 entries with cross-ref/twin/swallowed/hint gates

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `src/data/dativeAdjectives.ts` + gates

**Files:**
- Create: `src/data/dativeAdjectives.ts`
- Test: `tests/data/dativeAdjectives.test.ts`

**Interfaces:**
- Consumes: nothing (standalone data module).
- Produces (phase 2's ledger denominator and phase 3's T9 rely on these exact names):

```ts
export interface DativeAdjectiveEntry {
  english: string
  /** Predicative example containing the adjective and a dative person. */
  example: string
  /** ≤90 chars, ≤14 words, unique — same contract as coreIdeaHint. */
  coreIdeaHint: string
  /** Unpacks the pattern, then names the adjective and case. Shown only on a miss. */
  coreIdeaExplanation: string
  /** Impersonal body-state predicative: "Mir ist kalt" — no subject at all. */
  impersonal?: true
}
export const DATIVE_ADJECTIVES: Record<string, DativeAdjectiveEntry>
export const DATIVE_ADJECTIVE_KEYS: readonly string[]   // Object.keys, frozen
```

- [ ] **Step 1: Write the failing gate tests.** Create `tests/data/dativeAdjectives.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { DATIVE_ADJECTIVES, DATIVE_ADJECTIVE_KEYS } from '../../src/data/dativeAdjectives'

const entries = Object.entries(DATIVE_ADJECTIVES)
const DATIVE_MARKER = /\b(mir|dir|ihm|ihr|ihnen|uns|euch|dem|einem|einer|seinem|seiner|ihrem|ihrer|meinem|meiner|deinem|deiner|unserem|eurem)\b/

describe('DATIVE_ADJECTIVES invariants', () => {
  test('floors: ≥12 plain adjectives plus exactly the four impersonal body states', () => {
    const impersonal = entries.filter(([, e]) => e.impersonal).map(([k]) => k).sort()
    expect(impersonal).toEqual(['kalt', 'schlecht', 'warm', 'übel'])
    expect(entries.length - impersonal.length).toBeGreaterThanOrEqual(12)
  })

  test('every example contains its adjective and a dative form', () => {
    const bad = entries.filter(([k, e]) =>
      !new RegExp(`(^|[^a-zäöüß])${k}($|[^a-zäöüß])`, 'i').test(e.example)
      || !DATIVE_MARKER.test(e.example)
    ).map(([k]) => k)
    expect(bad).toEqual([])
  })

  test('HINT CONTRACT: ≤90 chars, ≤14 words, unique, never "Dativ" or a dative form', () => {
    const seen = new Set<string>()
    const forbidden = /\b(dativ|dative|dem|den|ihm|ihnen|mir|dir|euch|uns)\b/i
    const bad = entries.filter(([, e]) => {
      const h = e.coreIdeaHint
      const dupe = seen.has(h)
      seen.add(h)
      return dupe || h.length > 90 || h.trim().split(/\s+/).length > 14 || forbidden.test(h)
    }).map(([k]) => k)
    expect(bad).toEqual([])
  })

  test('explanations name the adjective and the case; english is non-empty', () => {
    const bad = entries.filter(([k, e]) =>
      !e.coreIdeaExplanation.includes('Dativ')
      || !e.coreIdeaExplanation.toLowerCase().includes(k.toLowerCase())
      || e.english.trim().length === 0
    ).map(([k]) => k)
    expect(bad).toEqual([])
  })

  test('keys are frozen and derived', () => {
    expect(Object.isFrozen(DATIVE_ADJECTIVE_KEYS)).toBe(true)
    expect([...DATIVE_ADJECTIVE_KEYS]).toEqual(Object.keys(DATIVE_ADJECTIVES))
  })
})
```

- [ ] **Step 2: Run to verify failure.**

Run: `npx vitest run tests/data/dativeAdjectives.test.ts`
Expected: FAIL — cannot resolve `../../src/data/dativeAdjectives`.

- [ ] **Step 3: Create `src/data/dativeAdjectives.ts`** with this exact content (12 plain adjectives + the 4-member impersonal predicative set = 16 entries):

```ts
// Dative-governing adjectives — family VII of the Dativ module, and the
// adjective half of the module's item ledger (the ledger denominator is
// DATIVE_VERB_KEYS.length + DATIVE_ADJECTIVE_KEYS.length — never hard-coded).
// Same side-table discipline as dativeVerbs.ts: teaching data only.

export interface DativeAdjectiveEntry {
  english: string
  /** Predicative example containing the adjective and a dative person. */
  example: string
  /** ≤90 chars, ≤14 words, unique — same contract as coreIdeaHint. */
  coreIdeaHint: string
  /** Unpacks the pattern, then names the adjective and case. Shown only on a miss. */
  coreIdeaExplanation: string
  /** Impersonal body-state predicative: "Mir ist kalt" — no subject at all. */
  impersonal?: true
}

export const DATIVE_ADJECTIVES: Record<string, DativeAdjectiveEntry> = {
  'wichtig': {
    english: 'important',
    example: 'Deine Meinung ist mir wichtig.',
    coreIdeaHint: 'What matters always matters to a particular person keeping score.',
    coreIdeaExplanation: 'Importance is measured on somebody — the affected person stands in the Dativ next to wichtig: Deine Meinung ist mir wichtig.',
  },
  'peinlich': {
    english: 'embarrassing',
    example: 'Der Fehler ist ihm peinlich.',
    coreIdeaHint: 'Embarrassment needs a person to blush; the cause alone is nothing.',
    coreIdeaExplanation: 'The embarrassing thing is the subject and the person who blushes takes the Dativ with peinlich: Der Fehler ist ihm peinlich.',
  },
  'egal': {
    english: 'all the same',
    example: 'Das ist mir egal.',
    coreIdeaHint: 'Indifference is measured on somebody; things cannot shrug.',
    coreIdeaExplanation: 'egal marks the unmoved person in the Dativ: Das ist mir egal — it is all the same to me.',
  },
  'ähnlich': {
    english: 'similar',
    example: 'Sie ist ihrer Mutter sehr ähnlich.',
    coreIdeaHint: 'Likeness always points at the counterpart it resembles.',
    coreIdeaExplanation: 'The counterpart of the resemblance stands in the Dativ with ähnlich: Sie ist ihrer Mutter sehr ähnlich — same pattern as the verb ähneln.',
  },
  'treu': {
    english: 'loyal / faithful',
    example: 'Der Hund ist seinem Herrn treu.',
    coreIdeaHint: 'Loyalty binds you to the one you keep faith with.',
    coreIdeaExplanation: 'The person you keep faith with takes the Dativ with treu: Der Hund ist seinem Herrn treu.',
  },
  'klar': {
    english: 'clear',
    example: 'Die Regel ist mir jetzt klar.',
    coreIdeaHint: 'Clarity dawns on a particular mind, not in thin air.',
    coreIdeaExplanation: 'The mind something becomes clear to stands in the Dativ with klar: Die Regel ist mir jetzt klar.',
  },
  'leid': {
    english: 'sorry (only with tun)',
    example: 'Das tut mir leid.',
    coreIdeaHint: 'Regret settles on the person who carries it, via one fixed verb.',
    coreIdeaExplanation: 'leid survives only in the fixed pattern with tun — never *das ist mir leid with sein — and the sorry person stands in the Dativ: Das tut mir leid.',
  },
  'bekannt': {
    english: 'known / familiar',
    example: 'Der Name ist mir bekannt.',
    coreIdeaHint: 'Familiarity exists only relative to the person who already knows.',
    coreIdeaExplanation: 'The person who already knows stands in the Dativ with bekannt: Der Name ist mir bekannt.',
  },
  'fremd': {
    english: 'foreign / strange',
    example: 'Die Stadt ist ihr noch fremd.',
    coreIdeaHint: 'Strangeness is strangeness for someone; a newcomer feels it most.',
    coreIdeaExplanation: 'The person something feels strange to stands in the Dativ with fremd: Die Stadt ist ihr noch fremd.',
  },
  'dankbar': {
    english: 'grateful',
    example: 'Ich bin dir sehr dankbar.',
    coreIdeaHint: 'Gratitude flows from the thankful person toward their benefactor.',
    coreIdeaExplanation: 'Here the grateful person is the subject and the benefactor takes the Dativ with dankbar: Ich bin dir sehr dankbar — same receiver as with danken.',
  },
  'böse': {
    english: 'angry (with somebody)',
    example: 'Bist du mir noch böse?',
    coreIdeaHint: 'Anger aimed at a person keeps that person in the sentence.',
    coreIdeaExplanation: 'The person the anger is aimed at stands in the Dativ with böse: Bist du mir noch böse?',
  },
  'recht': {
    english: 'fine / agreeable',
    example: 'Der Termin ist mir recht.',
    coreIdeaHint: 'Suitability is judged by the person it must suit.',
    coreIdeaExplanation: 'The person something suits stands in the Dativ with recht: Der Termin ist mir recht.',
  },

  // ─── impersonal body-state predicatives: no subject at all ─────────────
  'kalt': {
    english: 'cold (feeling)',
    example: 'Mir ist kalt.',
    coreIdeaHint: 'A body state with no actor; only the feeler is named.',
    coreIdeaExplanation: 'The body-state predicative has no real subject — the person who feels it stands in the Dativ: Mir ist kalt, never *Ich bin kalt (that would describe your character).',
    impersonal: true,
  },
  'warm': {
    english: 'warm (feeling)',
    example: 'Ist dir warm genug?',
    coreIdeaHint: 'Warmth felt from inside; the sentence names only who feels it.',
    coreIdeaExplanation: 'Like kalt, warm as a felt state marks the feeler in the Dativ: Ist dir warm genug? — *Ich bin warm claims something about your personality.',
    impersonal: true,
  },
  'schlecht': {
    english: 'nauseous / unwell',
    example: 'Mir ist schlecht.',
    coreIdeaHint: 'Queasiness strikes a person; no thing in the sentence causes it.',
    coreIdeaExplanation: 'The nausea predicative is subjectless — the sufferer stands in the Dativ with schlecht: Mir ist schlecht.',
    impersonal: true,
  },
  'übel': {
    english: 'queasy / sick',
    example: 'Ihm ist übel geworden.',
    coreIdeaHint: 'A wave of sickness washes over someone; the someone is the sentence.',
    coreIdeaExplanation: 'übel in the body-state reading is subjectless and marks the sufferer in the Dativ: Ihm ist übel geworden.',
    impersonal: true,
  },
}

export const DATIVE_ADJECTIVE_KEYS: readonly string[] = Object.freeze(Object.keys(DATIVE_ADJECTIVES))
```

- [ ] **Step 4: Run to verify pass.**

Run: `npx vitest run tests/data/dativeAdjectives.test.ts`
Expected: PASS — all 5 tests.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/dativeAdjectives.ts tests/data/dativeAdjectives.test.ts
git commit -m "feat(dative): dativeAdjectives side-table — 12 adjectives + the mir-ist body states

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `CONTEXT.md` glossary + changelog + full gates

**Files:**
- Modify: `CONTEXT.md` (insert a `### Dative` section between the `### Direction words` section and the `### Sentence` heading)
- Modify: `src/data/changelog.ts` (prepend entry, bump `APP_VERSION`)

**Interfaces:**
- Consumes: the spec's Language section (`docs/superpowers/specs/2026-08-11-dative-module-design.md` §Language) — the text below is that section, already in house entry style.
- Produces: eleven glossary terms the phase 2–4 plans reference by name ([Dative verb], [Semantic family], [Swallowed accusative], [Inverted experiencer], [Twin verb], [English pull], [Ditransitive verb], [Object order], [Free dative], [Dative error tag], [Item ledger], [Secured item]).

- [ ] **Step 1: Insert the glossary section.** In `CONTEXT.md`, immediately **before** the line `### Sentence`, insert:

```markdown
### Dative

**Dative verb** (Dativverb):
A verb whose *only* object is dative — *helfen*, *danken*, *begegnen*. The absence of an accusative object is what defines the class: a verb taking both (*geben*) is a [Ditransitive verb], not a dative verb. Membership is unpredictable from meaning and unpredictable from English, which is why the module tracks it per verb rather than by rule. ~45 members, the module's primary item bank.
_Avoid_: dative-only verb (redundant), indirect-object verb, Dativobjekt-Verb

**Semantic family**:
One of the three readings the dative gives its object across the [Dative verb] set — `recipient` (*danken*, *antworten*, *raten*), `experiencer` (*gefallen*, *schmecken*, *wehtun*), `co-agent` (*helfen*, *folgen*, *widersprechen*). A memory hook, not a rule: membership is still memorized. The organizing spine of the **Dativ cheatsheet**, the way [Fixed-preposition core idea] organizes the preposition cheatsheet. Stored per verb as `family`.
_Avoid_: semantic role, category, group, class

**Swallowed accusative**:
The hook explaining why a [Dative verb] governs the dative: an accusative object was absorbed into the verb's own meaning, leaving the indirect object behind — *antworten* = give [an answer] to sb, *danken* = give [thanks] to sb. Applies to most `recipient`-family verbs and some `co-agent` ones; it does **not** apply to the `experiencer` family, and the data must not claim it does. The content of the [Core-idea explanation] for this module.
_Avoid_: implied object, dropped object, hidden accusative

**Inverted experiencer**:
A [Dative verb] of the `experiencer` family where the *thing* is the nominative subject and controls verb agreement, while the person is the dative object — *Die Schuhe gefallen mir*, *Das Essen schmeckt mir*. The mirror of the English construction, and the source of the two errors the module's family IV exists to kill: `*Ich gefalle das Buch` (person taken as subject) and `*Die Schuhe gefällt mir` (agreement with the dative). Flagged per verb as `experiencer`.
_Avoid_: reversed verb, backwards verb, psych verb, gefallen-type

**Twin verb**:
A near-synonym of a [Dative verb] that governs the *accusative* instead, usually formed by prefixing — *antworten*/*beantworten*, *folgen*/*verfolgen*, *zuhören*/*hören*, *helfen*/*unterstützen*. The pair is the unit family V drills. Stored per verb as `twin`; both members must genuinely differ in governed case per `verbs.ts`, never an invented contrast.
_Avoid_: pair, minimal pair (that is the drill format), synonym, prefix variant

**English pull**:
The property of a [Dative verb] whose English equivalent takes a plain direct object, so L1 transfer pushes the learner toward the accusative — *help*, *follow*, *thank*, *answer*, *trust*, *congratulate*, *contradict*, *resemble*. The highest-yield trap set; flagged per verb as `englishPull` and the basis of family III.
_Avoid_: L1 interference, false friend, transfer error, English trap

**Ditransitive verb** (Verb mit Dativ und Akkusativ):
A verb taking both a dative and an accusative object — *geben*, *erklären*, *schenken*. 36 already carry `case: "dative+accusative"` in the pool. Distinguished from a [Dative verb] in that its dative is *predictable* from the recipient role and needs no memorizing — so it is band-tracked only, never entered in the [Item ledger]. Its own trap is [Object order].
_Avoid_: double-object verb, dative-accusative verb, two-object verb

**Object order**:
The rule governing the sequence of a [Ditransitive verb]'s two objects: dative before accusative by default (*Ich gebe dem Kind das Buch*), but **accusative before dative when both are pronouns** (*Ich gebe es ihm*). The subject matter of T8 and the source of the `object-order` [Dative error tag].
_Avoid_: word order (that is the general concept), pronoun order (only the exception), object sequence

**Free dative** (freier Dativ):
An *optional* dative adjunct the verb does not require, in three readings — `commodi` (to whose benefit: *Ich trage dir den Koffer*), `possessivus`/Pertinenzdativ (an inalienable possessor: *Wasch dir die Hände*), `ethicus` (an emotionally involved non-participant, near-particle, almost only *mir*/*dir*: *Sei mir bloß vorsichtig!*). Contrasted against a [Dative verb]'s obligatory object — dropping a free dative leaves a grammatical sentence, dropping a dative verb's object does not. That test is what family VIII drills.
_Avoid_: optional dative, adverbial dative, extra dative

**Dative error tag**:
A classification the grader assigns to a wrong answer in the Dativ module, the module's counterpart of [Verb error tag]. One of: `case` (accusative — or any wrong case — where dative is required), `subject` (an [Inverted experiencer]'s subject or agreement wrong), `twin` (the [Twin verb] used instead of the dative one, or vice versa), `object-order` ([Object order] violated), plus the reused `conjugation`, `word-order`, `noun`, and `typo`. A single answer may carry several. `case` and `subject` feed [Weak point]s per verb.
_Avoid_: dative mistake, case error (that is one tag, not the set)

**Item ledger**:
The module's per-item lifetime progress store (`gt:dativeLedger`) — one entry per memorization item, meaning the ~45 [Dative verb]s plus the ~12 dative-governing adjectives, ~57 in total. Each entry is `new` (never encountered), `wackelig`, or `gesichert`. Drives the hub's `31 / 57 gesichert` meter. Lifetime-scoped for the same reason ADR-0011 gives, but keyed by *item* where ADR-0011's rollup is keyed by *drill*. Rule-driven families — [Ditransitive verb]s, [Free dative]s, the passive consequence — are band-tracked only and never appear in the ledger, because there is no list to secure.
_Avoid_: mastery (that is the per-drill band), progress store, SRS, verb ledger (it holds adjectives too)

**Secured item** (gesichert):
An [Item ledger] entry whose **last three encounters were all correct**, across any drill. An entry with encounters but no clean streak of three is `wackelig`; one with none is `new`. A single miss demotes a secured item, and it must earn three clean encounters back. Chosen over an accuracy-over-a-floor rule so the meter reads current command rather than accumulated volume.
_Avoid_: mastered (collides with the per-drill mastery band), learned, known, complete

```

- [ ] **Step 2: Changelog + version.** In `src/data/changelog.ts`, set `APP_VERSION = '1.18.10'` and prepend to `CHANGELOG`:

```ts
  {
    version: '1.18.10', date: '2026-08-11', kind: 'polish',
    title: 'Verben · 29 Dativverben im Pool',
    notes: [
      '<strong>Der Verbpool kann jetzt den Dativ tragen.</strong> 29 Dativverben, die bisher fehlten — von <em>danken</em>, <em>zuhören</em> und <em>gratulieren</em> bis <em>misslingen</em>, <em>unterliegen</em> und <em>entgehen</em> — stehen mit vollständigen Stammformen und Konjugation im Pool. Übersetzen, Konjugation, Stammformen und Rektion profitieren sofort.',
      '<strong><em>stehen</em> ist ehrlich getaggt.</strong> Bisher stand es als „kein Objekt" — dabei ist <em>Das Kleid steht dir</em> Dativ. Jetzt gilt es als Verb mit wechselnder Rektion (wie <em>glauben</em>) und verlässt die Rektion-Übung, statt dort eine falsche Regel zu lehren.',
      '<strong>Fundament für das Dativ-Modul.</strong> Zwei neue Datentabellen — 44 Dativverben mit Familie, Merkhilfe und Erklärung sowie 16 Dativ-Adjektive (<em>wichtig, peinlich, egal … mir ist kalt</em>) — liegen getestet bereit. Die Übungen dazu kommen in den nächsten Ausgaben.'
    ]
  },
```

- [ ] **Step 3: Full gates.**

Run: `npx vitest run --testTimeout=30000`
Expected: PASS (known ThemeToggle order-dependent flake: if it is the sole failure, rerun to confirm and proceed).

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add CONTEXT.md src/data/changelog.ts
git commit -m "docs(dative): glossary section in CONTEXT.md; v1.18.10

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage (phase 1 scope):** 29 verbs (Tasks 1–3, level-mapped A1/A2/B1/B2.1 — B2.2 is frozen at 200 by test), `stehen` fix (Task 4), `dativeVerbs.ts` all ~45 → 44 entries (Task 5 — `stehen` excluded, see Task 4 decision), gates 1/3/5/7 (Task 5 tests), `dativeAdjectives.ts` (Task 6), glossary (Task 7). Gates 2/8/9/10 are phase 2 by spec.
- **Hidden-registry sweep:** `VERB_TIPS` 1:1 (Tasks 1–3 Step 1), `VERB_SENSES` coverage for every gloss collision — verified against the live pool: *listen* (hören), *meet* (treffen/sich treffen), *happen* (geschehen/vorgehen), *occur* (geschehen/erfolgen/auftreten), *advise* (beraten), *forgive* (vergeben), *hurt* (verletzen), *be enough* (ausreichen/reichen), *watch* (zusehen↔zuschauen), *order* (bestellen), *evade* (umgehen), *stand by* (bereitstehen), *fail* (ausfallen/scheitern), *join* (anschließen/hinzukommen). Glosses chosen to avoid all other collisions (`genügen` = "be enough" not "suffice", `nützen` = "be of use" not "benefit", `ausweichen` = "dodge / evade" not "avoid", `entgehen` = "escape / elude" — *entkommen* is not in the pool).
- **Type consistency:** `DativeVerbEntry` matches the pinned interface character for character; `DATIVE_VERB_KEYS` frozen; `dativeVerbsBy` signature as pinned. Adjective interface is this plan's to define and is consumed by phases 2–3 under the names shown.
