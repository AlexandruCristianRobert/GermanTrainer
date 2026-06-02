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

// A minimal system prompt that REPLACES Claude Code's default agentic prompt,
// so a generation call behaves like a plain, fast LLM (no CLAUDE.md / tool /
// agent overhead). Fixed ASCII — safe on argv even under shell:true on Windows.
export const LEAN_SYSTEM_PROMPT = 'Output only what the user asks. No preamble and no markdown code fences.'
export const CLAUDE_EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const
export const CLAUDE_MODELS = ['sonnet', 'haiku', 'opus'] as const
export type ClaudeEffort = (typeof CLAUDE_EFFORT_LEVELS)[number]
export type ClaudeModel = (typeof CLAUDE_MODELS)[number]

/**
 * CLI args for a lean, fast, one-shot structured generation. Effort and model
 * are validated against allow-lists HERE — the security boundary, so nothing
 * untrusted ever reaches argv — and an absent/invalid effort falls back to
 * 'low'. Skips MCP servers, session persistence, and the agentic system prompt
 * (the prompt + the caller's instructions come in via stdin).
 */
export function buildClaudeArgs(opts: { model?: string; effort?: string }): string[] {
  const effort = opts.effort && (CLAUDE_EFFORT_LEVELS as readonly string[]).includes(opts.effort)
    ? opts.effort
    : 'low'
  const args = [
    '-p', '--output-format', 'json',
    '--no-session-persistence', '--strict-mcp-config',
    '--system-prompt', LEAN_SYSTEM_PROMPT,
    '--effort', effort
  ]
  if (opts.model && (CLAUDE_MODELS as readonly string[]).includes(opts.model)) {
    args.push('--model', opts.model)
  }
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
export function makeLocalClaudeClient(opts: { model?: string; effort?: string } = {}): AiClient {
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
          body: JSON.stringify({
            contents,
            systemInstruction: config.systemInstruction,
            model: opts.model,
            effort: opts.effort
          })
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
export function resolveAiClient(settings: {
  aiProvider?: string
  geminiApiKey: string
  localClaudeModel?: string
  localClaudeEffort?: string
}): AiClient {
  return settings.aiProvider === 'local-claude'
    ? makeLocalClaudeClient({ model: settings.localClaudeModel, effort: settings.localClaudeEffort })
    : makeGeminiClient(settings.geminiApiKey)
}
