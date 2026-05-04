# German Trainer

A personal-use Vue 3 SPA for practicing German vocabulary. Two modules:

- **Nouns** — quiz the gender (`der`/`die`/`das`) or English translation of German nouns.
- **Adjectives** — fill-in-the-blank quiz with sentences generated on demand by the Anthropic API.

## Stack

Vue 3, Vite, TypeScript, Naive UI, Vue Router, Dexie (IndexedDB), `@anthropic-ai/sdk`. All persistence is local. The Anthropic API is called direct from the browser.

## Setup

```
npm install
npm run dev
```

Open the app, go to **Settings**, paste your Anthropic API key, and click **Test connection**. The default model is `claude-sonnet-4-6`; `claude-haiku-4-5-20251001` is cheaper and faster.

## Security

This app is for personal use on personal machines only. The API key sits in IndexedDB and is sent direct to `api.anthropic.com`. Anyone with access to your browser profile can read it. **Do not deploy this as a public site** — there is no backend proxy.

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

## Spec / plan

See `docs/superpowers/specs/2026-05-04-german-trainer-design.md` and `docs/superpowers/plans/2026-05-04-german-trainer.md`.
