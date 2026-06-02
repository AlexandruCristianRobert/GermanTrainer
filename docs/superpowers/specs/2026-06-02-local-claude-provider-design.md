# Local Claude AI provider (dev-only) — design

**Date:** 2026-06-02
**Status:** approved direction, pending spec review

## Goal

When running the app locally (`npm run dev`), let the user run all AI features
through their **Claude Code subscription** instead of a Gemini API key — chosen
manually via a new option in the Settings → API section.

## The constraint (what "local Claude" means here)

There is no on-device Claude model. Claude runs in Anthropic's cloud. "Local"
here means: the **credential lives on the machine** (the existing Claude Code
login), not pasted into the app. The browser cannot call Claude directly, so a
local process must broker the call. That process only exists during
`npm run dev` (the Vite dev server is a Node process). The **deployed gh-pages
site is a static bundle with no server**, so Local Claude is unavailable there;
the live site keeps using Gemini exactly as today.

## Selection model (decided)

- A new **AI provider** choice in Settings → API: `Gemini (API key)` (default)
  or `Local Claude (local dev only)`.
- **Manual** selection, persisted in settings. Default stays Gemini. We do NOT
  auto-switch.
- When `Local Claude` is selected, **every** AI feature routes through it
  (sentence quiz, adjective sentences, declension-AI, konjunktiv, passiv,
  writing grader, simulator, level assessment).

## Architecture

### 1. Dev-only endpoint (Vite middleware)

A Vite plugin in `vite.config.ts` (`configureServer`) — runs only under
`vite dev`, absent from `vite build`:

- `GET /api/ai/health` → `200 { ok: true }`. Lets the client detect local mode.
- `POST /api/ai/generate` with JSON body `{ contents: string, systemInstruction?: string, model?: string }`:
  1. Spawn the `claude` CLI with `child_process.spawn` (no `shell`, so no shell
     injection). Prompt (`contents`) is written to the child's **stdin** (avoids
     arg-escaping / length limits).
  2. Args: `['-p', '--output-format', 'json']`, plus `--append-system-prompt <systemInstruction>`
     when provided, plus `--model <model>` only when explicitly provided
     (otherwise the user's Claude Code default model is used).
  3. Child env = `{ ...process.env, ANTHROPIC_API_KEY: undefined }` — forces
     subscription auth (Claude Code prefers an API key if present).
  4. On exit 0: `JSON.parse(stdout)` → take `.result` (the assistant text) →
     strip ``` fences if present → return `200 { text }`.
  5. On non-zero exit / spawn error / unparseable envelope → `500 { error }`
     with stderr message (e.g. "not logged in", "claude not found").

Exact flag names will be re-verified against `claude --help` at implementation
time; the envelope's `.result` field and `-p --output-format json` are the
stable contract.

### 2. Client implementing the existing `AiClient` interface

`useClaude.ts` already defines `AiClient = { models: { generateContent(params) => Promise<{ text? }> } }`.
Add:

```ts
export function makeLocalClaudeClient(): AiClient
```

Its `generateContent` POSTs `{ contents, systemInstruction, model }` (extracted
from `params.contents` and `params.config?.systemInstruction`) to
`/api/ai/generate` and returns `{ text }`. It ignores Gemini-only params
(`responseSchema`, `responseMimeType`, `temperature`) — JSON adherence is
handled the same way the code already handles it: the prompt instructs JSON and
each consumer validates + retries (`generateSentences`, `validateEntry`, the
graders all already parse `.text` / JSON defensively). Model: not forwarded by
default (CLI uses the CC default); a fixed `sonnet` default can be added later
if needed — out of scope for v1.

A small parse helper is extracted and unit-tested:

```ts
export function extractClaudeText(envelopeStdout: string): string  // JSON.parse -> .result -> strip fences
```

### 3. Local-availability probe

A tiny module caches a reactive `localClaudeAvailable` ref, set by a one-shot
`fetch('/api/ai/health')` (resolves false on the static site / when the dev
endpoint is absent). Used by Settings (status display) and by the AI-usable
guard.

### 4. Provider resolver + settings

- `db/types.ts` `Settings`: add `aiProvider: 'gemini' | 'local-claude'`
  (default `'gemini'`).
- `useSettings.ts`:
  - `load()` defaults `aiProvider` to `'gemini'` when absent (back-compat for
    existing stored settings).
  - `save()` persists it.
  - Add `canUseAi` computed: `aiProvider === 'gemini' ? hasApiKey.value : localClaudeAvailable.value`.
  - Keep `hasApiKey` for the Gemini key field UI.
- `useClaude.ts`: add `resolveAiClient(settings: Settings): AiClient` →
  `settings.aiProvider === 'local-claude' ? makeLocalClaudeClient() : makeGeminiClient(settings.geminiApiKey)`.

### 5. Call-site refactor (all AI features)

Replace, at each of the 10 client-creation sites, `makeGeminiClient(settings.value.geminiApiKey)`
with `resolveAiClient(settings.value)`; replace `hasApiKey`-based guards/labels
with `canUseAi` (provider-aware). Sites:

`ApiKeyForm.vue`, `SettingsApi.vue`, `passiv/QuizSetup.vue`, `passiv/QuizRunner.vue`,
`simulator-c1/SimulatorRun.vue`, `simulator-c1/SimulatorResult.vue`,
`konjunktiv/QuizSetup.vue`, `konjunktiv/QuizRunner.vue`, `writing/EditorSurface.vue`,
`adjectives/QuizRunner.vue` (+ `adjectives/QuizSetup.vue` guard),
`declension/ArticleQuizSetup.vue`, `charts/LevelAssessmentPanel.vue`,
`prepositions/SentenceQuizSetup.vue`.

The "API key needed" warnings become provider-aware: under Local Claude they
read e.g. "Local Claude is selected but the local dev endpoint isn't reachable —
run `npm run dev`, or switch to Gemini in Settings."

### 6. Settings → API UI

In the API section (`SettingsApi.vue` / `ApiKeyForm.vue`): a provider selector
(segmented or radio). Selecting **Local Claude** shows a status line driven by
the health probe — "✓ Local endpoint detected (uses your Claude Code login, no
key needed)" or "✗ Not reachable (only works under `npm run dev`)" — and a
**Test** button that runs a trivial generate. Selecting **Gemini** shows the
existing key field + model + test, unchanged.

## Error handling

- Provider selected but unavailable → guards disable the action and show the
  provider-aware warning; no silent fallback (selection is manual/explicit).
- Endpoint 500 → existing per-call `try/catch` toasts surface the stderr-derived
  message (e.g. "not logged in to Claude Code").

## Testing

- **Unit:** `extractClaudeText` (envelope parse, `.result` extraction, fence
  stripping, malformed input throws). `resolveAiClient` returns the right client
  per `aiProvider`. `canUseAi` logic.
- **Manual/integration:** run `npm run dev`, select Local Claude, Test in
  Settings, run a sentence quiz; confirm no key needed and a wrong/expired login
  surfaces a clear error. The middleware + spawn are not unit-tested (process
  boundary); kept thin.

## Out of scope

- The deployed/live site (static — no server). Local Claude is dev-only.
- Offline/on-device model (not possible).
- Streaming responses; per-feature Claude model selection (could add later).

## Security

- The endpoint exists only on the dev server (localhost). Prompt is passed via
  stdin and `spawn` runs without a shell, so there is no command injection.
- `ANTHROPIC_API_KEY` is stripped from the child env to force subscription auth.
