# Design brief — Sentence module (mixed sentence quiz)

You already know the German Trainer design system (nav shell, Kapitel headers, chip rows,
segmented controls, alerts, `micro-mark` captions, light + dark themes). This brief asks you
to design **one new module** in that same language: three surfaces — **Setup**, **Runner**,
**Result** — for the app's fifth and most configurable sentence-translation drill. Deliver in
the usual handoff format (jsx + screenshots), desktop and mobile.

Module identity: nav label **Sentence**, Home frontispiece card **Kapitel XII** (de subtitle
suggestion: *Sätze*), routes `/sentence` → `/sentence/run` → result.

---

## The concept (read this first)

Every existing sentence drill generates one sentence per card drilling **one** category
(verbs, or prepositions, or da-compounds). The Sentence quiz packs **all of them at once**.

The learner sets a per-card count for each category — verbs, nouns, prepositions,
da-compounds, connectors — and how many cards to generate. Each **packed card** is an
AI-written English/German sentence pair containing *every* requested item: normally 1–2
sentences, stretching to a short text of **3–4 sentences** when no natural shorter packing
exists (the AI decides, never the learner). Each card samples **fresh words** from the pools.

Example: config "2 verbs + 2 nouns + 1 preposition + 1 da-compound + connector, 6 cards"
→ 6 cards, each containing all 7 items, all words different card to card.

**Budget rule (hard product constraint, must be visible in the UI):** at most **8 drilled
items per card** — each category 0–3, connectors 0–2 — with a **warning above 6** that cards
will stretch to 3–4-sentence texts.

**Connectors** are a brand-new category: clause-joining words in **meaning families**
(adversative, causal, concessive, temporal, alternative, additive). Two grammar behaviors
hide inside them — *aber/sondern/denn/oder* leave word order alone, *jedoch/trotzdem/
deshalb/dennoch/allerdings* force verb-inversion, *obwohl/weil/während* send the verb to the
end — and mixing them up is the drill's deliberate trap. Some connectors are **two-part
pairs**: *sowohl … als auch*, *nicht nur … sondern auch*, *entweder … oder*, *zwar … aber*.
A pair is ONE item with two placements.

---

## Surface 1 — Setup page (`/sentence`) — the main design job

Follow the standard setup-page skeleton (breadcrumb `Kapitel XII · Satz · Einrichtung`,
`Setup.` title, explanatory subtitle, max-width ~720, ghost Back + accent Start CTA row).
Two genuinely new component problems live here:

### 1a. Five category blocks, each: count stepper + collapsible filters

Each category is a block with a **count control (0–3; connectors 0–2)** — steppers or
segmented `0 1 2 3`, your call — plus its pool filters, which should collapse/expand so the
page doesn't drown (defaults matter: a returning user mostly touches counts only).

| Category | Count | Filters inside the block |
|---|---|---|
| **Verbs** | 0–3 | Level chips (`A1 A2 B1 B2.1 B2.2`), Type chips, **Object case chips (Akkusativ / Dativ / Dativ + Akkusativ / reflexive / …)** — the Rektion filter is a headline feature: "drill verb + Dativ" |
| **Nouns** | 0–3 | Theme group chips with per-group counts (existing pattern, incl. disabled empty groups) |
| **Prepositions** | 0–3 | Case-group chips (accusative / dative / two-way / genitive) |
| **Da-compounds** | 0–3 | None in v1 (draws from the fixed collocation set) — the block is count-only |
| **Connectors** | 0–2 | **Two-tier picker**, see 1c |

### 1b. The budget meter

A persistent element (consider sticky on mobile) summing the five counts against the cap:

- **0 items** → Start disabled, meter empty, hint "pick at least one item"
- **1–6 items** → normal state, e.g. `5 / 8 items per card`
- **7–8 items** → warning state: `7 / 8 — cards will stretch to 3–4-sentence texts`
- Steppers themselves prevent exceeding 8: when the total sits at 8, every "+" is disabled

### 1c. Two-tier connector picker

Default tier: **family chips** (Adversative, Causal, Concessive, Temporal, Alternative,
Additive) — selecting a family means "sample from all its words". A quiet **"Detailed"**
toggle expands each selected family into its individual word chips (*aber*, *sondern*,
*jedoch*, *zwar … aber*, …) for exact selection. Two-part pairs render as a single chip with
the ellipsis (`sowohl … als auch`). Design both tiers and the transition between them.

### 1d. Run options (standard patterns, specific rules)

- **Direction** — segmented `EN→DE / DE→EN`. Choosing DE→EN must visibly communicate the
  trade-off (micro-mark): *meaning-only grading, no error tags, no word hints*.
- **Modalität** — `Getippt / Gesprochen`, spoken disabled without mic support, with the
  existing German micro-mark copy pattern. **Only shown for EN→DE.**
- **Word hints** — `On / Off`, default On. **EN→DE only** — hide or disable under DE→EN.
- **Number of cards** — presets **`3 / 5 / 8 / Custom`** (deliberately smaller than other
  drills' 10/15/20/25: one card ≈ 6–8 graded items — do not "align" this).
- Standard alerts: AI-key-missing warning; empty-pool warnings per category
  ("Verbs count is 2 but no verbs match the filters").
- Start CTA: `Start · 6 cards →`.

---

## Surface 2 — Runner (`/sentence/run`)

Base it on the existing sentence runners (progress header `Card 2 / 6`, streaming
"preparing next card…" state, retry modal at the end), with these new problems:

1. **The source text is 1–4 sentences long.** The card layout must read comfortably at one
   sentence AND at a four-sentence short text; the answer textarea grows accordingly
   (multi-line; design the submit affordance — the one-sentence drills use Enter).
2. **A category manifest strip** below/above the source: `2 verbs · 2 nouns · 1 prep ·
   1 da-compound · sondern`-style — shows *what to hunt for* without revealing the words
   (connector may be named or not — propose both variants). Keep it quiet.
3. **Hint spans** on every drilled item in the English source (existing highlight/hover
   pattern) — including **both parts of a two-part connector**, which needs a visual link
   between two non-adjacent highlights.
4. **Spoken modality** reuses the verb runner's flow (space to record, auto-submit) — same
   surface, taller stakes since answers are multi-sentence.
5. **Grading reveal**, the dense new piece. After submit show:
   - overall verdict (correct / partly / wrong — propose the treatment) + AI coaching tip
   - the reference German + TTS replay button
   - **per-item verdict list, grouped by category**: each drilled item as a row with
     ✓/✗, and for verbs a **Rektion badge** (`warten auf + Akk`) — the learner asked
     explicitly to be taught "verb + which case" at reveal
   - **error-tag chips** on failed items: `conjugation · case · word-order · noun ·
     preposition · compound · connector · typo`
   - the **offline-graded badge** state (AI grading failed, local fallback used)
6. **DE→EN variant**: German source, no hints, no manifest of tags — just meaning verdict
   + tip. Visibly a lighter mode, not a broken one.

---

## Surface 3 — Result page

Follow the existing result-page pattern (score header, rows per card), plus:

- **Per-category accuracy** (verbs 4/6 · prepositions 2/3 · connectors 3/3 …)
- **Error-tag distribution** for the run
- Expandable per-card rows: source, learner answer, reference, per-item verdicts
- Retry-wrong CTA (existing convention: practice round, never recorded)

---

## States checklist (design each)

| Surface | State |
|---|---|
| Setup | AI key missing · zero items · budget warn (7–8) · empty pool per category · spoken unsupported |
| Runner | first-card loading · next-card streaming · generation shortfall ("only 4 of 6 cards could be generated") · stretched card (4 sentences) · offline-graded · mic denied mid-run |
| Result | perfect run · all-wrong run · DE→EN run (no tags to show) |

## New components vs. reuse

**Reuse as-is:** chip rows w/ All·None, segmented controls, alerts, micro-mark captions,
count presets row, progress header, retry modal, TTS button, hint-span highlights.

**New (the actual design work):** category block with count stepper + collapsible filters ·
budget meter · two-tier connector family/word picker · two-part hint-span pairing ·
category manifest strip · grouped per-item verdict list with Rektion badges and error-tag
chips · per-category accuracy summary.
