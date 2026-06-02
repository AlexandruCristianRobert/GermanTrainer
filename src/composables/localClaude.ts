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
