# Schreiben · Mustertexte + Schreibplan-warning fix — design

Date: 2026-08-12 · Status: approved by user

## Problem

1. **UI bug:** the Schreibplan keyword warning in `src/modules/schreiben/Teil1Prep.vue`
   renders as a `<p>` *between* `.spr-plan-row` elements (negative top margin,
   floating under the previous row's border — visually unanchored), and it is
   computed live per keystroke, so "zu kurz" appears while the learner is
   still mid-word at 1–3 characters.
2. **Missing teaching asset:** the module drills writing but never *shows*
   what a strong Forumsbeitrag looks like, or how connectors, Redemittel and
   grammatical structures do the work in real prose.

## Part 1 — Warning fix (Teil1Prep.vue)

- Move the warning inside its row: rendered beneath the `.spr-plan-in` input,
  in the input's grid column, above the row's bottom border. New scoped class,
  same clay color and 12.5px size.
- Blur-gate all keyword warnings: a `touched: Set<number>` marks a field on
  `blur`; `keywordWarnings` only reports indices in `touched`, and a focused
  field never shows its own warning even when touched (re-shown on next
  blur). Pair warnings (equal/substring) appear only when both fields are
  touched. Advisory-only contract unchanged — never gates the CTA.

## Part 2 — Aufgabenmuster + Mustertexte

### Taxonomy (five patterns)

| id | titleDe | signalDe (woran erkennbar) |
|---|---|---|
| `abwaegen` | Pro & Contra abwägen | „Nennen Sie Vor- und Nachteile …" + Gegenmeinung/Fazit-Punkte |
| `alternative` | Meinung + Alternative vorschlagen | „Nennen Sie eine Alternative zu …" |
| `erfahrung` | Eigene Erfahrung als Beleg | „Berichten Sie von eigenen Erfahrungen …" trägt die Argumentation |
| `gegenmeinung` | Gegenmeinung entkräften | „Gehen Sie auf Gegenargumente/eine Gegenmeinung ein" |
| `vorschlag` | Maßnahme bewerten & empfehlen | „Machen Sie einen Vorschlag / Was sollte geschehen …" |

Each of the 24 seeded Schreibthemen maps to its **dominant** pattern in
`SCHREIBTHEMA_MUSTER: Record<string, MusterId>` (lives in
`schreibenMuster.ts`, keyed by thema id — the `Schreibthema` interface is
NOT extended, so custom/AI themes are unaffected and link to the library
generically). A data test asserts the map covers exactly the 24 seeded ids
and every pattern is used at least twice.

### Data — `src/data/schreibenMuster.ts` (new)

```ts
export type MusterLayer = 'konnektor' | 'mittel' | 'struktur'
export interface MusterSegment { t: string; layer?: MusterLayer; noteDe?: string }
export interface Mustertext {
  id: MusterId; titleDe: string; signalDe: string
  themaId: string                 // the seeded Schreibthema the model answers
  skeleton: string[]              // 5 paragraph-plan lines
  segments: MusterSegment[]       // the full model text, annotated
}
export type MusterId = 'abwaegen' | 'alternative' | 'erfahrung' | 'gegenmeinung' | 'vorschlag'
export const SCHREIBEN_MUSTER: Mustertext[]                  // exactly 5
export const SCHREIBTHEMA_MUSTER: Record<string, MusterId>   // 24 seeded ids
export const MUSTER_LAYER_LABEL: Record<MusterLayer, { de: string; en: string }>
```

Content rules (test-enforced): joined text 150–200 words; every annotated
segment has a non-empty `noteDe` (≤180 chars) explaining *why the device
works here*, not just naming it; per model ≥4 `konnektor`, ≥4 `mittel`,
≥3 `struktur` spans; `themaId` is a real seeded thema whose mapped pattern
is this model's id; the model genuinely addresses that thema's four
Inhaltspunkte (reviewer judgment, not mechanical). `mittel` spans should be
recognizable Schreibmittel-bank phrasings where natural, but are not
required to needle-match the bank.

### Viewer — `src/modules/schreiben/MusterView.vue` (new)

- Route `schreiben-muster` at `/schreiben/muster` (nav coverage guard passes
  via the `schreiben` prefix; no nav.ts change).
- Pattern chips (5) across the top; `?muster=<id>` query preselects.
- Three layer toggle buttons with per-layer counts + color legend
  (distinct accent-family colors set as scoped CSS vars; all three on by
  default). Toggling a layer off removes its highlight styling.
- Task-sheet context: the model's thema (title + four Inhaltspunkte)
  collapsible above the text; the skeleton as a numbered mini-list.
- The text renders the segments; annotated spans are `<button>`s (keyboard
  reachable) with the layer color; click/tap pins that span's `noteDe` into
  a note panel fixed below the text (span shows a pinned state); `title`
  attr as hover bonus.
- German module voice; scoped CSS on existing tokens.

### Integration

- SchreibenHome: "Mustertexte" tile (→ `schreiben-muster`).
- SchreibenCheatsheet: pointer row linking the library.
- Teil1Setup task-sheet preview + Teil1Prep header: when the drawn thema's
  id is in `SCHREIBTHEMA_MUSTER`, show „Mustertext zu diesem Aufgabentyp →"
  (→ `schreiben-muster?muster=<id>`); custom themes show „Mustertexte
  ansehen →" without a pattern.
- CONTEXT.md: new entries **Aufgabenmuster** (the five task shapes, per-thema
  dominant mapping) and **Mustertext** (annotated model Forumsbeitrag, the
  three layers, never graded/counted); cross-reference from Schreibthema.

## Testing

- `tests/data/schreibenMuster.test.ts`: the content rules above, mechanically.
- `tests/modules/MusterView.test.ts`: mount — pattern switch re-renders,
  layer toggle adds/removes highlight class, span click pins its note,
  query preselect works.
- `tests/modules/Teil1Prep.warn.test.ts` (or extend an existing harness):
  warning hidden while typing in a focused field, shown after blur,
  pair-warning needs both touched.
- Full gate: `npm test`, `npm run typecheck`, `npm run build`.

## Out of scope

Teil 2 / email genres, AI-generated Mustertexte, grading integration,
pattern filters in Setup, drawer/nav changes.
