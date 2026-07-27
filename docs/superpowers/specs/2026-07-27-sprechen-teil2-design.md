# Sprechen Module — Teil 2 Diskussion (Design)

**Date:** 2026-07-27
**Status:** Approved design, pre-implementation
**Target version:** 1.13.00 (`kind: 'module'`)

## Goal

A new **Sprechen** module for Goethe-Zertifikat B2 speaking practice, starting with **Teil 2 (Diskussion)**: a typed discussion with an AI partner on a controversial theme, a tabbed Redemittel cheatsheet, layered in-test hints, and a post-discussion analysis that marks every mistake in the learner's turns and scores the run against an adapted Goethe B2 rubric.

## Decisions (settled during brainstorming)

| Question | Decision |
|---|---|
| Input mode | **Type only.** No STT/TTS. Aussprache criterion excluded from scoring, stated explicitly in the UI. Voice is future work. |
| Session shape | **Fixed turn count** chosen at setup (6 / 8 / 10 learner turns), progress meter, "Diskussion beenden" ends early. |
| Hints | **Layered:** static move chips + Redemittel instantly (no API call), plus on-demand **KI-Tipp** button (one AI call) returning a strategic direction, not a ready-made sentence. |
| Generated themes | **Saved to a persistent personal pool** (`localStorage['gt:sprechenCustomThemes']`), browsable/deletable, exported/imported. |
| Explanation language | **German + English toggle.** Grader returns `reasonDe` + `reasonEn` per mistake in one call; result page has a global DE/EN switch. |
| Conversation architecture | **A: Transcript-in-prompt + resumable Dexie session.** Each AI turn is a single `generateContent` call with the serialized transcript; works with both Gemini and local-Claude providers; session state in a new Dexie `sprechenSessions` table (C1-simulator pattern). |

## 1. Module structure & navigation

- Route names (hyphen-free head, `NavShell` derives the active tab from `name.split('-')[0]`):
  - `sprechen` — module home
  - `sprechen-cheatsheet` — tabbed Spickzettel
  - `sprechen-teil2` — setup
  - `sprechen-teil2-run` — discussion runner
  - `sprechen-teil2-result` — analysis view (also reopens past sessions by id)
- `src/modules/sprechen/`: `SprechenHome.vue`, `SprechenCheatsheet.vue`, `Teil2Setup.vue`, `Teil2Runner.vue`, `Teil2Result.vue`.
- Nav item in `NavShell.vue`; Home card **X · Sprechen** in `Home.vue` (numerals become I–X; update the hardcoded `I/IX` breadcrumb).
- `SprechenHome.vue`: cards for *Spickzettel · Cheatsheet* and *Teil 2 · Diskussion*, plus a "Recent discussions" list (Konjunktiv-home style); each entry reopens the saved analysis from Dexie.

### Cheatsheet

- Uses the **Settings-page tab-rail pattern** (`TabSpec[]` — id, roman numeral, titleDe, titleEn, blurb) so future Teile slot in as sibling tabs. For now a single tab: **II · Diskussion**.
- Tab body: chapters of Redemittel groups — Meinung äußern, Zustimmen, Widersprechen, Teilweise zustimmen, Nachfragen, Beispiele geben, Zusammenfassen/Fazit — plus a short *Strategie* chapter describing how exam Teil 2 works and what graders look for.
- Reuses existing cheatsheet CSS/kit where applicable (`.chapter*`, `Callout.vue`).

## 2. Data

### `src/data/sprechenRedemittel.ts`

- Phrase bank grouped by discussion **move**, with stable ids: `{ id, move: 'agree' | 'disagree' | 'partial' | 'ask' | 'example' | 'summarize' | 'opinion', phraseDe, noteEn? }` organized into groups for the cheatsheet chapters.
- **Single source of truth**: the cheatsheet renders it AND the hint panel pulls from it. A test asserts every id referenced by the hint moves exists (prepCheatsheet ↔ collocations precedent).

### `src/data/sprechenThemes.ts`

- **100 hand-authored seeded themes** in exam format: `{ id, titleDe, statementDe, tags, level: 'B2', source: 'seed' }` where `statementDe` is the controversial thesis/question (e.g. *"Sollten Autos aus Innenstädten verbannt werden?"*).
- Tags across ~10 categories: Umwelt, Arbeit, Technologie, Bildung, Gesundheit, Medien, Gesellschaft, Reisen, Konsum, Familie.
- Follows the `writingPrompts.ts` convention: plain exported array, no Dexie seeding, `source: 'custom'` reserved for user-pool items.

### Custom themes & generation

- Generated themes: same shape with `source: 'custom'`, persisted in `localStorage['gt:sprechenCustomThemes']`, registered in `USER_DATA_KEYS` (export/import).
- **Generation with memory**: the generator prompt receives (a) titles of all pool themes (seeded + custom) and (b) theme titles of completed discussions from `sprechenSessions`, instructed to avoid overlap. Each generation request produces **5 themes** (fixed count — keeps the call cheap and the validator simple). Standard 5-piece AI anatomy: system prompt, variety pool of category tags, `RESPONSE_SCHEMA`, validator (unique, non-empty, B2-appropriate length), retry loop. Generator temperature ~0.85.
- **Theme picker** in setup: *Zufallsthema* (random, preferring not-yet-done themes), browse list (seeded + custom, custom deletable), or generate new.

## 3. Discussion engine

### Setup (`sprechen-teil2`)

- Theme picker (above), learner turn count (6/8/10), hints on/off, partner stance (*Zufällig* default / *dafür* / *dagegen*), `canUseAi` gate with provider-aware toast. Settings persisted in `localStorage['sprechenTeil2Setup']`.

### Session (Dexie `sprechenSessions`, `db.version(9)`)

```ts
{
  id: string
  theme: { id: string, titleDe: string, statementDe: string, source: 'seed'|'custom' }
  turnTarget: 6 | 8 | 10
  stance: 'pro' | 'contra'          // partner's stance, resolved at start
  status: 'in_progress' | 'submitted' | 'graded' | 'abandoned'
  turns: { role: 'learner' | 'partner', textDe: string, at: string }[]
  startedAt / endedAt? / gradedAt? / abandonedAt? / historySavedAt?
  analysis?: SprechenGradeResult    // persisted once grading succeeds
}
```

- Every turn written to Dexie as it happens → reload mid-discussion offers **"Diskussion fortsetzen?"** (`findActiveSession` / `resumeSession` / `abandonSession`, simulator pattern).
- **One active session at a time**: starting a new discussion while one is `in_progress` prompts to resume it or abandon it (discussions have no timer, so there is no time-based auto-expiry).
- `submitted` = discussion finished, analysis not yet successfully run → analysis is retryable without redoing the discussion.

### Turn flow

1. Partner opens with a 2–3 sentence position statement on the theme.
2. Alternating turns; progress meter counts **learner** turns toward `turnTarget`.
3. After the learner's final turn, the partner gives one short closing turn, then grading starts (status → `submitted` → `graded`).
4. *"Diskussion beenden"* ends early at any point; below 3 learner turns the UI warns the evaluation may be unreliable.

### Partner behavior (system prompt rules)

- Clean B2-level German; 2–4 sentences per turn (learner does most of the talking).
- Defends its assigned stance; concedes good points ("Da haben Sie recht, aber …").
- Asks the learner a question roughly every second turn.
- **Never corrects the learner's German mid-discussion** — correction happens only in the final analysis (like a real exam partner).
- One `generateContent` call per turn: persona system prompt + serialized transcript + "produce the next partner turn" instruction. Temperature ~0.8, `responseSchema: { replyDe: string }`, standard 2-retry validation loop.

### Hints (learner's turn, if enabled; toggleable mid-run)

- Collapsible panel with six move chips: *Zustimmen · Widersprechen · Teilweise zustimmen · Nachfragen · Beispiel geben · Zusammenfassen*. Tapping a chip reveals 2–3 Redemittel from `sprechenRedemittel.ts`. Instant, no API call. (The seventh Redemittel group, *Meinung äußern*, appears in the cheatsheet only — mid-discussion you are reacting, not opening.)
- **KI-Tipp** button: one on-demand call (temperature ~0.7) returning a 1–2 sentence strategic suggestion in German tailored to the partner's last turn — a *direction*, explicitly not a full sentence to copy.

### Runner UI

- Chat transcript with learner turns visually distinct (these are the turns that get annotated later). Textarea input, Enter to send, `.quiz-meter` progress, existing token classes throughout, `LoadingOverlay`/typing indicator while the partner "thinks".

## 4. Analysis & evaluation

### Grader call

One temperature-0 call (Writing-grader pattern) with the full transcript, learner turns indexed. Returns `SprechenGradeResult`:

1. **Per-criterion scores** — rubric adapted from the official Goethe B2 Sprechen grid, added to `rubrics.ts`:
   - *Erfüllung / Interaktion* — argued a position, reacted to the partner, sustained the discussion
   - *Kohärenz & Flüssigkeit* — connectors, logical flow (adapted for written form)
   - *Wortschatz* — range and precision
   - *Strukturen* — grammatical accuracy and complexity
   - **Aussprache excluded** — result page states this explicitly. Four criteria rescaled to total **100 points**, pass at **≥ 60**, Goethe Prädikat bands: 90+ *sehr gut*, 80+ *gut*, 70+ *befriedigend*, 60+ *ausreichend*, < 60 *nicht bestanden*. Each criterion carries a short justification (De + En).
   - Rubric prompt embeds B2 descriptors so grading tracks the standard, not vibes.
2. **Inline mistake annotations** — per error in learner turns: `{ turnIndex, quote (verbatim), suggested, kind: 'grammar' | 'vocabulary' | 'word-order' | 'spelling' | 'register', reasonDe, reasonEn, spanStart, spanEnd }`. Validator **re-anchors each quote** into the actual turn text and silently drops non-matching annotations (Writing grader's `reAnchor` trick) — no corrections pointing at text the learner never wrote.
3. **Strengths / weaknesses / overall verdict** — each in German and English.

Validator also enforces: criterion count/keys/max-points match the rubric, points sum to total, pass flag consistent with threshold. Standard retry loop; on persistent failure the session stays `submitted` with an *"Analyse erneut versuchen"* action.

### Result page (`sprechen-teil2-result`)

- Score header + Prädikat stamp, criterion table, Aussprache-exclusion note.
- **Marked transcript**: full conversation replayed; learner turns highlighted; each mistake underlined in place; clicking opens an explanation card (quote → correction → why).
- **DE/EN toggle** at page top flips all explanation texts instantly (both languages already in the result).
- Strengths/weaknesses lists + mistake-count summary by category.
- Short-discussion warning banner when ended very early.
- Reachable later by session id from the module home's Recent list.

## 5. History & persistence

- **`gt:quizHistory`** gets one lean entry per graded discussion — new `QuizHistoryType: 'sprechen-teil2'`; meta: theme title, learner turn count, score, maxScore 100, passes, Prädikat, mistake counts by kind. Update the exhaustive `TYPE_LABEL` map in `useLevelAssessment.ts`, `charts/quiz-type-labels.ts`, and `HistoryPage.vue` (vue-tsc forces this).
- **Full transcript + analysis stay in Dexie** (`sprechenSessions`) — quizHistory stays lean under its 100-entry cap.
- Theme-avoidance memory reads done-theme titles from `sprechenSessions`.
- `USER_DATA_KEYS` additions: `gt:sprechenCustomThemes`, `sprechenTeil2Setup`. For `sprechenSessions`, match whatever export/import treatment `useUserData.ts` already gives `writingDrafts`/`simulatorSessions` (verify the existing precedent at implementation time and mirror it).

## 6. Error handling

- Partner-turn call fails after retries → toast + "nochmal senden"; transcript already safe in Dexie.
- Grader fails → session remains `submitted`; result page offers retry. Discussion is never lost to a failed analysis.
- No API key / provider down → existing `canUseAi` gate blocks at setup; mid-run provider loss surfaces the retry toast and the session stays resumable.
- KI-Tipp failure is non-blocking (toast only).

## 7. Testing (vitest, existing conventions)

- Theme data integrity: 100 unique ids, valid tags, non-empty statements.
- Redemittel: hint-move references resolve to existing phrase ids.
- Grader validator: criterion-sum enforcement, pass-flag consistency, quote re-anchoring, dropping of non-matching annotations.
- Session lifecycle on fake-indexeddb: create → resume → submit → grade idempotency → abandoned expiry.
- Prompt builders: transcript serialization, stance injection, theme-avoidance list inclusion.

## 8. Release checklist

- Routes + NavShell item + Home card (numerals I–X, breadcrumb fix).
- `CONTEXT.md`: add *Theme*, *Diskussionsrunde*, *Move*, *KI-Tipp*, *Prädikat*.
- Changelog entry, `APP_VERSION = '1.13.00'`, `package.json` sync.

## Out of scope (explicitly deferred)

- Voice input/output (STT/TTS) and any Aussprache evaluation.
- Cheatsheet tabs for Teil 1 (Vortrag) — the tab structure accommodates them later.
- A Teil 1 practice drill.
- Editing seeded themes or authoring custom themes by hand (pool grows only via AI generation for now).
