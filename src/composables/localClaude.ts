import { ref } from 'vue'
import { makeGeminiClient, type AiClient } from './useClaude'

export const LOCAL_AI_HEALTH_PATH = '/api/ai/health'
export const LOCAL_AI_GENERATE_PATH = '/api/ai/generate'

/**
 * Resolve an API path under Vite's configured base (e.g. "/GermanTrainer/"),
 * since Vite's dev server rejects requests outside the base. In tests the base
 * is "/" so this is a no-op.
 */
export function aiUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return base + path
}

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

export const localClaudeAvailable = ref(false)
let probed = false

/** One-shot health probe (cached). Pass { force: true } to re-probe. */
export async function probeLocalClaude(opts: { force?: boolean } = {}): Promise<boolean> {
  if (probed && !opts.force) return localClaudeAvailable.value
  probed = true
  try {
    const res = await fetch(aiUrl(LOCAL_AI_HEALTH_PATH), { method: 'GET' })
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
        const res = await fetch(aiUrl(LOCAL_AI_GENERATE_PATH), {
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
