# German Trainer

A personal-use Vue 3 SPA for practicing German vocabulary and grammar.

## Modules

- **Nouns** — quiz the gender (`der`/`die`/`das`) or English translation of German nouns, grouped by theme.
- **Adjectives** — fill-in-the-blank quiz with sentences generated on demand by Gemini.
- **Verbs** — translation and conjugation drills across all tenses, plus a twelve-chapter grammar cheatsheet.
- **Prepositions** — case, article, and two-way preposition drills.
- **Declension** — tables reference plus case/article/adjective/pronoun/recognition drills, including an AI-driven article-in-context mode.
- **Konjunktiv I** — rewrite direct-speech quotes as reported speech, judged by Gemini against the canonical K-I form (or K-II fallback).
- **Passiv** — transform active sentences into a specific passive form (Vorgangs-, Zustands-, sich-lassen, sein-zu, -bar-Adjektiv, or man-Konstruktion), judged by Gemini.
- **History** — every run is logged locally; charts visualise per-type accuracy and study cadence.

## Stack

Vue 3, Vite, TypeScript, Vue Router, Dexie (IndexedDB), `@google/genai` for the Gemini API. All persistence is local; the Gemini API is called directly from the browser.

## Setup

```
npm install
npm run dev
```

Open the app, go to **Settings**, paste your Gemini API key, and click **Test connection**. The default model is `gemini-2.5-flash`.

## Security

This app is for personal use on personal machines only. The API key sits in IndexedDB and is sent direct to Google. Anyone with access to your browser profile can read it. **Do not deploy this as a public site** — there is no backend proxy.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server. |
| `npm run build` | Type-check and produce a production build in `dist/`. |
| `npm run preview` | Serve the production build. |
| `npm run typecheck` | Type-check without emitting. |
| `npm test` | Run Vitest unit tests. |
| `npm run test:watch` | Vitest in watch mode. |

## Adding entries

The seed lists in `src/data/*.seed.json` are loaded on first run. After that, manage entries via the **Manage nouns** / **Manage adjectives** screens. Use **Reset to defaults** to wipe and re-seed (with confirmation).

## Specs / plans

See the latest specs and plans in `docs/superpowers/specs/` and `docs/superpowers/plans/`.
