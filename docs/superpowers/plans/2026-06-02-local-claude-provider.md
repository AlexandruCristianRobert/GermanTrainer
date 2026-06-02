# Local Claude AI provider (dev-only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the app, when run via `npm run dev`, route all AI features through the user's Claude Code subscription (no API key) — selected manually in Settings → API — falling back to Gemini everywhere else.

**Architecture:** A dev-only Vite middleware (`/api/ai/health`, `/api/ai/generate`) shells out to the `claude` CLI in headless JSON mode. A browser-side `makeLocalClaudeClient()` implements the existing `AiClient` interface by POSTing to that endpoint, so all current call sites work unchanged once they obtain their client from a new `resolveAiClient(settings)`. Provider choice is stored in settings; the live static site has no endpoint, so it stays on Gemini.

**Tech Stack:** Vue 3, TypeScript, Vite (dev middleware + `node:child_process`), Vitest, Dexie (settings storage), Claude Code CLI.

---

## File structure

- **Create** `src/composables/localClaude.ts` — shared, mostly pure: path constants, `extractClaudeText`, `buildClaudeArgs`, `makeLocalClaudeClient`, `localClaudeAvailable`/`probeLocalClaude`, `resolveAiClient`.
- **Create** `vite-plugins/localClaude.ts` — Node, dev-only Vite plugin; imports the pure helpers from `src/composables/localClaude.ts`.
- **Create** `tests/composables/localClaude.test.ts` — unit tests for the pure helpers + the fetch client + resolver.
- **Modify** `vite.config.ts` — register the plugin.
- **Modify** `src/db/types.ts` — add `aiProvider` to `Settings`.
- **Modify** `src/composables/useSettings.ts` — load/save `aiProvider`, add `canUseAi`, kick the probe.
- **Modify** `src/modules/settings/SettingsApi.vue` — provider selector + local status + provider-aware test.
- **Modify** the 11 AI client-creation sites (Task 6 + Task 7).

---

## Task 1: Pure core of `localClaude.ts` (constants, envelope parse, args)

**Files:**
- Create: `src/composables/localClaude.ts`
- Test: `tests/composables/localClaude.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/composables/localClaude.test.ts
import { describe, test, expect } from 'vitest'
import {
  extractClaudeText, buildClaudeArgs,
  LOCAL_AI_HEALTH_PATH, LOCAL_AI_GENERATE_PATH
} from '../../src/composables/localClaude'

describe('extractClaudeText', () => {
  test('returns the .result text from the CLI JSON envelope', () => {
    const stdout = JSON.stringify({ result: '{"items":[]}', session_id: 'x', total_cost_usd: 0.001 })
    expect(extractClaudeText(stdout)).toBe('{"items":[]}')
  })
  test('strips ```json fences around the result', () => {
    const stdout = JSON.stringify({ result: '```json\n{"a":1}\n```' })
    expect(extractClaudeText(stdout)).toBe('{"a":1}')
  })
  test('strips bare ``` fences', () => {
    const stdout = JSON.stringify({ result: '```\nhello\n```' })
    expect(extractClaudeText(stdout)).toBe('hello')
  })
  test('returns empty string when result is missing', () => {
    expect(extractClaudeText(JSON.stringify({ session_id: 'x' }))).toBe('')
  })
  test('throws on a non-JSON envelope', () => {
    expect(() => extractClaudeText('not json')).toThrow()
  })
})

describe('buildClaudeArgs', () => {
  test('base args request headless JSON', () => {
    expect(buildClaudeArgs({})).toEqual(['-p', '--output-format', 'json'])
  })
  test('adds --model only when provided', () => {
    expect(buildClaudeArgs({ model: 'sonnet' })).toEqual(['-p', '--output-format', 'json', '--model', 'sonnet'])
  })
})

describe('path constants', () => {
  test('are under /api/ai', () => {
    expect(LOCAL_AI_HEALTH_PATH).toBe('/api/ai/health')
    expect(LOCAL_AI_GENERATE_PATH).toBe('/api/ai/generate')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/composables/localClaude.test.ts`
Expected: FAIL — module/exports not found.

- [ ] **Step 3: Implement the pure core**

```ts
// src/composables/localClaude.ts
export const LOCAL_AI_HEALTH_PATH = '/api/ai/health'
export const LOCAL_AI_GENERATE_PATH = '/api/ai/generate'

/** Parse the `claude -p --output-format json` envelope and return clean text. */
export function extractClaudeText(stdout: string): string {
  const env = JSON.parse(stdout) as { result?: unknown }
  let text = typeof env.result === 'string' ? env.result.trim() : ''
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  }
  return text
}

/** Fixed CLI flags for a one-shot headless JSON generation (no untrusted args). */
export function buildClaudeArgs(opts: { model?: string }): string[] {
  const args = ['-p', '--output-format', 'json']
  if (opts.model) args.push('--model', opts.model)
  return args
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/composables/localClaude.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/localClaude.ts tests/composables/localClaude.test.ts
git commit -m "feat(ai): local Claude envelope parsing + CLI arg helpers"
```

---

## Task 2: Browser client, availability probe, resolver

**Files:**
- Modify: `src/composables/localClaude.ts`
- Test: `tests/composables/localClaude.test.ts`

- [ ] **Step 1: Add failing tests** (append to the test file)

```ts
import { vi, beforeEach, afterEach } from 'vitest'
import { makeLocalClaudeClient, resolveAiClient, localClaudeAvailable, probeLocalClaude } from '../../src/composables/localClaude'

describe('makeLocalClaudeClient', () => {
  afterEach(() => { vi.unstubAllGlobals() })
  test('POSTs contents+systemInstruction and returns { text }', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ text: '{"items":[]}' }) }))
    vi.stubGlobal('fetch', fetchMock)
    const client = makeLocalClaudeClient()
    const out = await client.models.generateContent({
      model: 'ignored', contents: 'Translate X', config: { systemInstruction: 'Be terse' }
    })
    expect(out.text).toBe('{"items":[]}')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.contents).toBe('Translate X')
    expect(body.systemInstruction).toBe('Be terse')
  })
  test('throws with the endpoint error message on non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: 'not logged in' }) })))
    const client = makeLocalClaudeClient()
    await expect(client.models.generateContent({ contents: 'x' })).rejects.toThrow('not logged in')
  })
})

describe('resolveAiClient', () => {
  test('returns a local client when aiProvider is local-claude', () => {
    const c = resolveAiClient({ aiProvider: 'local-claude', geminiApiKey: '' })
    expect(typeof c.models.generateContent).toBe('function')
  })
  test('returns a gemini client otherwise', () => {
    const c = resolveAiClient({ aiProvider: 'gemini', geminiApiKey: 'AIzaTest' })
    expect(typeof c.models.generateContent).toBe('function')
  })
})

describe('probeLocalClaude', () => {
  beforeEach(() => { localClaudeAvailable.value = false })
  afterEach(() => { vi.unstubAllGlobals() })
  test('sets availability true when health responds ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })))
    expect(await probeLocalClaude({ force: true })).toBe(true)
    expect(localClaudeAvailable.value).toBe(true)
  })
  test('sets availability false when health throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('no server') }))
    expect(await probeLocalClaude({ force: true })).toBe(false)
    expect(localClaudeAvailable.value).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/composables/localClaude.test.ts`
Expected: FAIL — `makeLocalClaudeClient`/`resolveAiClient`/`probeLocalClaude` not exported.

- [ ] **Step 3: Implement** (append to `src/composables/localClaude.ts`)

```ts
import { ref } from 'vue'
import { makeGeminiClient, type AiClient } from './useClaude'

export const localClaudeAvailable = ref(false)
let probed = false

/** One-shot health probe (cached). Pass { force: true } to re-probe. */
export async function probeLocalClaude(opts: { force?: boolean } = {}): Promise<boolean> {
  if (probed && !opts.force) return localClaudeAvailable.value
  probed = true
  try {
    const res = await fetch(LOCAL_AI_HEALTH_PATH, { method: 'GET' })
    localClaudeAvailable.value = !!res.ok
  } catch {
    localClaudeAvailable.value = false
  }
  return localClaudeAvailable.value
}

/** AiClient that brokers generation through the dev-only /api/ai/generate endpoint. */
export function makeLocalClaudeClient(): AiClient {
  return {
    models: {
      async generateContent(params: Record<string, unknown>) {
        const contents = typeof params.contents === 'string'
          ? params.contents
          : JSON.stringify(params.contents ?? '')
        const config = (params.config ?? {}) as { systemInstruction?: string }
        const res = await fetch(LOCAL_AI_GENERATE_PATH, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ contents, systemInstruction: config.systemInstruction })
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({} as { error?: string }))
          throw new Error(e.error || `Local Claude endpoint error (${res.status})`)
        }
        const data = await res.json() as { text?: string }
        return { text: typeof data.text === 'string' ? data.text : '' }
      }
    }
  }
}

/** Pick the AI client based on the chosen provider. */
export function resolveAiClient(settings: { aiProvider?: string; geminiApiKey: string }): AiClient {
  return settings.aiProvider === 'local-claude'
    ? makeLocalClaudeClient()
    : makeGeminiClient(settings.geminiApiKey)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/composables/localClaude.test.ts`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Commit**

```bash
git add src/composables/localClaude.ts tests/composables/localClaude.test.ts
git commit -m "feat(ai): local Claude fetch client, health probe, provider resolver"
```

---

## Task 3: Settings schema + `useSettings` (aiProvider, canUseAi)

**Files:**
- Modify: `src/db/types.ts:63-67` (the `Settings` interface)
- Modify: `src/composables/useSettings.ts`
- Test: `tests/composables/useSettings.test.ts`

- [ ] **Step 1: Add failing tests** (append to `tests/composables/useSettings.test.ts`)

```ts
import { localClaudeAvailable } from '../../src/composables/localClaude'

test('defaults aiProvider to gemini and computes canUseAi from the key', async () => {
  const { settings, hasApiKey, canUseAi } = useSettings()
  settings.value.aiProvider = 'gemini'
  settings.value.geminiApiKey = ''
  expect(canUseAi.value).toBe(false)
  settings.value.geminiApiKey = 'AIzaTest'
  expect(hasApiKey.value).toBe(true)
  expect(canUseAi.value).toBe(true)
})

test('under local-claude, canUseAi follows endpoint availability not the key', () => {
  const { settings, canUseAi } = useSettings()
  settings.value.aiProvider = 'local-claude'
  settings.value.geminiApiKey = ''
  localClaudeAvailable.value = false
  expect(canUseAi.value).toBe(false)
  localClaudeAvailable.value = true
  expect(canUseAi.value).toBe(true)
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/composables/useSettings.test.ts`
Expected: FAIL — `canUseAi`/`aiProvider` missing.

- [ ] **Step 3: Add `aiProvider` to the Settings type**

In `src/db/types.ts`, change the `Settings` interface to:

```ts
export type AiProvider = 'gemini' | 'local-claude'

export interface Settings {
  id: 'singleton'
  geminiApiKey: string
  model: string
  aiProvider: AiProvider
}
```

- [ ] **Step 4: Update `useSettings.ts`**

```ts
import { computed, ref } from 'vue'
import { db } from '../db'
import { DEFAULT_MODEL, type Settings } from '../db/types'
import { localClaudeAvailable, probeLocalClaude } from './localClaude'

export function useSettings() {
  const settings = ref<Settings>({
    id: 'singleton',
    geminiApiKey: '',
    model: DEFAULT_MODEL,
    aiProvider: 'gemini'
  })

  async function load(): Promise<void> {
    const stored = await db.settings.get('singleton')
    if (stored) {
      const legacyKey = (stored as unknown as { anthropicApiKey?: string }).anthropicApiKey
      const modelOk = typeof stored.model === 'string' && stored.model.startsWith('gemini-')
      settings.value = {
        id: 'singleton',
        geminiApiKey: stored.geminiApiKey ?? (legacyKey && legacyKey.startsWith('AIza') ? legacyKey : ''),
        model: modelOk ? stored.model : DEFAULT_MODEL,
        aiProvider: stored.aiProvider === 'local-claude' ? 'local-claude' : 'gemini'
      }
    }
    // Fire-and-forget: learn whether the dev endpoint exists (no-op on the static site).
    void probeLocalClaude()
  }

  async function save(): Promise<void> {
    await db.settings.put({ ...settings.value, id: 'singleton' })
  }

  const hasApiKey = computed(() => settings.value.geminiApiKey.trim().length > 0)
  const canUseAi = computed(() =>
    settings.value.aiProvider === 'local-claude' ? localClaudeAvailable.value : hasApiKey.value
  )

  return { settings, hasApiKey, canUseAi, load, save }
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run tests/composables/useSettings.test.ts`
Expected: PASS. (If pre-existing tests construct `Settings` literals without `aiProvider`, add `aiProvider: 'gemini'` to them.)

- [ ] **Step 6: Commit**

```bash
git add src/db/types.ts src/composables/useSettings.ts tests/composables/useSettings.test.ts
git commit -m "feat(ai): add aiProvider setting + canUseAi guard"
```

---

## Task 4: Dev-only Vite middleware that shells to `claude`

**Files:**
- Create: `vite-plugins/localClaude.ts`
- Modify: `vite.config.ts`

No unit test (process boundary) — verified manually in Task 8.

- [ ] **Step 1: Verify the CLI contract once, by hand**

Run (in a shell where Claude Code is logged in):
```
echo "Reply with the single JSON object {\"ok\":true} and nothing else." | claude -p --output-format json
```
Expected: a JSON line whose `result` field contains `{"ok":true}` (possibly fenced). Confirms `-p`, stdin, and `--output-format json`. If `claude` is not found, note the absolute path / that it's a `.cmd` (informs `shell` below).

- [ ] **Step 2: Create the plugin**

```ts
// vite-plugins/localClaude.ts
import type { Plugin } from 'vite'
import { spawn } from 'node:child_process'
import {
  extractClaudeText, buildClaudeArgs,
  LOCAL_AI_HEALTH_PATH, LOCAL_AI_GENERATE_PATH
} from '../src/composables/localClaude'

export function localClaudePlugin(): Plugin {
  return {
    name: 'local-claude-dev',
    apply: 'serve', // dev server only — absent from `vite build`
    configureServer(server) {
      server.middlewares.use(LOCAL_AI_HEALTH_PATH, (_req, res) => {
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
      })

      server.middlewares.use(LOCAL_AI_GENERATE_PATH, (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let raw = ''
        req.on('data', c => { raw += c })
        req.on('end', () => {
          let body: { contents?: string; systemInstruction?: string; model?: string }
          try { body = JSON.parse(raw || '{}') }
          catch { res.statusCode = 400; res.end(JSON.stringify({ error: 'invalid JSON body' })); return }

          // Merge the system instruction into the prompt so nothing untrusted
          // goes on argv; only fixed flags do.
          const prompt = body.systemInstruction
            ? `${body.systemInstruction}\n\n${body.contents ?? ''}`
            : (body.contents ?? '')

          const env = { ...process.env }
          delete env.ANTHROPIC_API_KEY // force subscription auth

          const child = spawn('claude', buildClaudeArgs({ model: body.model }), {
            env,
            shell: process.platform === 'win32' // .cmd shim needs a shell on Windows
          })

          let out = '', err = ''
          child.stdout.on('data', d => { out += d })
          child.stderr.on('data', d => { err += d })
          child.on('error', e => {
            res.statusCode = 500
            res.end(JSON.stringify({ error: `could not start claude: ${e.message}` }))
          })
          child.on('close', code => {
            if (code !== 0) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.trim() || `claude exited with code ${code}` }))
              return
            }
            try {
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ text: extractClaudeText(out) }))
            } catch (e) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: `failed to parse claude output: ${(e as Error).message}` }))
            }
          })
          child.stdin.write(prompt)
          child.stdin.end()
        })
      })
    }
  }
}
```

- [ ] **Step 3: Register it in `vite.config.ts`**

Add the import and include `localClaudePlugin()` in the `plugins` array alongside `vue()`:

```ts
import { localClaudePlugin } from './vite-plugins/localClaude'
// ...
export default defineConfig({
  plugins: [vue(), localClaudePlugin()],
  // ...existing config unchanged
})
```

- [ ] **Step 4: Smoke-test the endpoint**

Run `npm run dev` in one terminal, then in another:
```
curl -s http://localhost:5173/api/ai/health
curl -s -X POST http://localhost:5173/api/ai/generate -H "content-type: application/json" -d "{\"contents\":\"Reply with only the JSON {\\\"ok\\\":true}\"}"
```
Expected: `{"ok":true}` from health; `{"text":"{\"ok\":true}"}` (or similar clean JSON text) from generate. (Vite's dev port may differ — use the one it prints.)

- [ ] **Step 5: Commit**

```bash
git add vite-plugins/localClaude.ts vite.config.ts
git commit -m "feat(ai): dev-only Vite endpoint that runs the claude CLI"
```

---

## Task 5: Settings → API provider selector + local status

**Files:**
- Modify: `src/modules/settings/SettingsApi.vue`

- [ ] **Step 1: Replace the script block**

```ts
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSettings } from '../../composables/useSettings'
import { generateAdjectiveSentences } from '../../composables/useClaude'
import { resolveAiClient, localClaudeAvailable, probeLocalClaude } from '../../composables/localClaude'

const { settings, load, save } = useSettings()

const showKey = ref(false)
const testState = ref<'idle' | 'testing' | 'ok' | 'error'>('idle')
const testError = ref('')
const savedFlash = ref(false)

onMounted(async () => {
  await load()
  await probeLocalClaude({ force: true })
})

async function onSave() {
  await save()
  savedFlash.value = true
  setTimeout(() => { savedFlash.value = false }, 2000)
}

async function recheckLocal() { await probeLocalClaude({ force: true }) }

async function onTest() {
  if (settings.value.aiProvider === 'gemini' && !settings.value.geminiApiKey.trim()) return
  testState.value = 'testing'
  testError.value = ''
  try {
    const client = resolveAiClient(settings.value)
    await generateAdjectiveSentences(client, {
      model: settings.value.model,
      adjectives: [{ german: 'schön', english: 'beautiful' }]
    })
    testState.value = 'ok'
  } catch (err) {
    testState.value = 'error'
    testError.value = err instanceof Error ? err.message : String(err)
  }
}
</script>
```

- [ ] **Step 2: Add the provider selector to the template**

Insert this block at the top of `<section>`, before the Privacy alert, and wrap the existing Gemini key + model fields in `v-if="settings.aiProvider === 'gemini'"`; add the local-status block for `v-else`:

```html
<div class="field">
  <div class="field-label">AI provider</div>
  <div class="segmented">
    <button :class="{ active: settings.aiProvider === 'gemini' }" @click="settings.aiProvider = 'gemini'">Gemini (API key)</button>
    <button :class="{ active: settings.aiProvider === 'local-claude' }" @click="settings.aiProvider = 'local-claude'">Local Claude (dev)</button>
  </div>
</div>

<template v-if="settings.aiProvider === 'local-claude'">
  <div v-if="localClaudeAvailable" class="alert alert-info">
    <span class="alert-label">Local endpoint detected</span>
    Generation runs through your Claude Code login on this machine — no API key needed.
    Works only while the app runs via <code>npm run dev</code>.
  </div>
  <div v-else class="alert alert-warning">
    <span class="alert-label">Not reachable</span>
    No local endpoint. This option only works when you run the app with <code>npm run dev</code>
    and have the <code>claude</code> CLI logged in. The deployed site can’t use it.
    <button type="button" class="btn btn-quiet" @click="recheckLocal">Re-check</button>
  </div>
</template>
```

Then gate the existing Privacy alert + key field + model field with `v-if="settings.aiProvider === 'gemini'"` (wrap them in a `<template v-if=...>`), and change the Test button's `:disabled` to:

```html
:disabled="(settings.aiProvider === 'gemini' && !settings.geminiApiKey.trim()) || (settings.aiProvider === 'local-claude' && !localClaudeAvailable) || testState === 'testing'"
```

- [ ] **Step 3: Update the Settings.vue blurb (optional polish)**

In `src/modules/settings/Settings.vue:24`, change the `api` tab blurb to: `'Choose an AI provider — your Gemini API key, or local Claude when running in dev.'`

- [ ] **Step 4: Verify by hand**

`npm run dev` → Settings → API: toggle providers; Local shows "detected"; Gemini shows the key field. Save, reload — choice persists. Test button works for the selected provider.

- [ ] **Step 5: Commit**

```bash
git add src/modules/settings/SettingsApi.vue src/modules/settings/Settings.vue
git commit -m "feat(ai): provider selector + local-Claude status in Settings"
```

---

## Task 6: Route the preposition sentence quiz through the resolver

**Files:**
- Modify: `src/modules/prepositions/SentenceQuizSetup.vue`

- [ ] **Step 1: Swap imports + client + guard**

- Add import: `import { resolveAiClient } from '../../composables/localClaude'`
- Change the destructure `const { settings, hasApiKey, load: loadSettings } = useSettings()` → `const { settings, canUseAi, load: loadSettings } = useSettings()`
- In `canStart` (line ~88), replace `hasApiKey.value` with `canUseAi.value`.
- In `start()` (line ~97), replace the key guard:

```ts
  if (!canUseAi.value) {
    toast.error(
      settings.value.aiProvider === 'local-claude'
        ? 'Local Claude not reachable'
        : 'Gemini API key required',
      { description: settings.value.aiProvider === 'local-claude'
          ? 'Run the app with npm run dev, or switch to Gemini in Settings.'
          : 'Set your API key in Settings before generating sentences.' }
    )
    return
  }
```

- Replace `const client = makeGeminiClient(settings.value.geminiApiKey)` → `const client = resolveAiClient(settings.value)` and remove the now-unused `makeGeminiClient` import.
- In the template, change `v-if="!hasApiKey"` warning to `v-if="!canUseAi"` and make its text generic: "AI access needed — set a Gemini key or select Local Claude (dev) in Settings."

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors in this file.

- [ ] **Step 3: Commit**

```bash
git add src/modules/prepositions/SentenceQuizSetup.vue
git commit -m "feat(ai): sentence quiz uses the provider resolver"
```

---

## Task 7: Route the remaining AI call sites through the resolver

Apply the **same transformation** as Task 6 to each file below. The transformation is:

1. `import { makeGeminiClient } from '.../useClaude'` → remove (keep other `useClaude` imports like `generateAdjectiveSentences`); add `import { resolveAiClient } from '<correct depth>/composables/localClaude'`.
2. `const client = makeGeminiClient(settings.value.geminiApiKey)` → `const client = resolveAiClient(settings.value)` (every occurrence).
3. `hasApiKey` from `useSettings()` → `canUseAi`; replace `hasApiKey.value` in guards/`:disabled`/`v-if` with `canUseAi.value` / `canUseAi`.
4. Where a guard shows a hard-coded "API key required" toast/alert, make it provider-aware (same pattern as Task 6 Step 1).

**Files (with their current client lines):**
- [ ] `src/modules/passiv/QuizSetup.vue` (client `:87`; guard `:75`,`:146`,`:217`)
- [ ] `src/modules/passiv/QuizRunner.vue` (client `:87`)
- [ ] `src/modules/konjunktiv/QuizSetup.vue` (client `:84`; guard `:72`,`:144`,`:214`)
- [ ] `src/modules/konjunktiv/QuizRunner.vue` (client `:79`)
- [ ] `src/modules/simulator-c1/SimulatorRun.vue` (client `:198`; guard `:88`,`:160`,`:259`)
- [ ] `src/modules/simulator-c1/SimulatorResult.vue` (client `:98`; guard `:90`)
- [ ] `src/modules/writing/EditorSurface.vue` (clients `:148`,`:247`; guard `:56`,`:125`,`:323`)
- [ ] `src/modules/adjectives/QuizRunner.vue` (client `:51`)
- [ ] `src/modules/adjectives/QuizSetup.vue` (guard only `:94`,`:117`,`:187` — swap `hasApiKey`→`canUseAi`; this file has no client creation)
- [ ] `src/modules/declension/ArticleQuizSetup.vue` (client `:168`; guard `:156`,`:346`,`:436`)
- [ ] `src/components/charts/LevelAssessmentPanel.vue` (client `:132`; guard `:123`,`:162`,`:195`)
- [ ] `src/components/ApiKeyForm.vue` (client `:33` — swap to `resolveAiClient(settings.value)`; keep its key UI as-is, it's a legacy/standalone form)

Note import depth: files in `src/modules/<x>/` use `'../../composables/localClaude'`; files in `src/components/charts/` use `'../../composables/localClaude'`; `src/components/ApiKeyForm.vue` uses `'../composables/localClaude'`.

- [ ] **Step: Typecheck after the batch**

Run: `npm run typecheck`
Expected: zero errors. (Common miss: a file still references `hasApiKey` or `makeGeminiClient`.)
Cross-check: `grep -rn "makeGeminiClient\|hasApiKey" src` should return only `useClaude.ts` (definition of `makeGeminiClient`) and `useSettings.ts` (definition of `hasApiKey`) — no call sites.

- [ ] **Step: Commit**

```bash
git add src/modules src/components
git commit -m "feat(ai): route all AI features through the provider resolver"
```

---

## Task 8: Verify, document, ship

**Files:**
- Modify: `src/data/changelog.ts`

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: all pass (including the new `localClaude` + updated `useSettings` tests). Re-run any flaky UI test in isolation.

- [ ] **Step 2: Typecheck + build**

Run: `npm run build`
Expected: clean (`✓ built in …`). Confirms the plugin is dev-only and doesn't break the production build.

- [ ] **Step 3: Manual end-to-end (the real proof)**

`npm run dev`, Claude Code logged in:
- Settings → API → select **Local Claude (dev)** → status shows detected → **Test connection** succeeds with no Gemini key set.
- Run a preposition sentence quiz → sentences generate via the local endpoint.
- Stop the dev server / open the built `preview` → Local option shows "not reachable"; selecting Gemini still works.

- [ ] **Step 4: Changelog + version bump**

In `src/data/changelog.ts`: set `APP_VERSION = '1.12.00'` (a new capability) and prepend an entry (kind `'module'`, date `2026-06-02`) describing the dev-only Local Claude provider and that it requires `npm run dev` + a logged-in `claude` CLI. (Plain-ASCII apostrophes must be escaped or use `’`.)

- [ ] **Step 5: Commit, then push/deploy per the user's instruction**

```bash
git add src/data/changelog.ts
git commit -m "chore(release): v1.12.00 — dev-only Local Claude AI provider"
```
Then ask the user before `git push origin main` / `npm run deploy` (outward-facing).

---

## Self-review notes

- **Spec coverage:** endpoint (Task 4), local client (Task 2), resolver + settings (Tasks 2–3), provider UI (Task 5), all-call-sites refactor (Tasks 6–7), env-by-environment behavior (probe ⇒ `canUseAi`; build excludes plugin), testing (Tasks 1–3), security (stdin prompt, `shell` only on win32 with no untrusted argv, `ANTHROPIC_API_KEY` stripped). Covered.
- **Model handling:** local client sends no model; endpoint omits `--model`, using the user's Claude Code default — matches the spec's "out of scope: per-feature model selection."
- **Naming consistency:** `resolveAiClient`, `canUseAi`, `localClaudeAvailable`, `probeLocalClaude`, `extractClaudeText`, `buildClaudeArgs`, `LOCAL_AI_HEALTH_PATH`, `LOCAL_AI_GENERATE_PATH`, `aiProvider` used identically across all tasks.
