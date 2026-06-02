import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  extractClaudeText, buildClaudeArgs,
  LOCAL_AI_HEALTH_PATH, LOCAL_AI_GENERATE_PATH,
  makeLocalClaudeClient, resolveAiClient, localClaudeAvailable, probeLocalClaude
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
  test('base args run a lean headless JSON call (no session, no MCP, lean system prompt, effort low)', () => {
    const a = buildClaudeArgs({})
    expect(a.slice(0, 3)).toEqual(['-p', '--output-format', 'json'])
    expect(a).toContain('--no-session-persistence')
    expect(a).toContain('--strict-mcp-config')
    expect(a).toContain('--system-prompt')
    expect(a[a.indexOf('--effort') + 1]).toBe('low') // default effort
    expect(a).not.toContain('--model')               // no model by default
  })
  test('uses a valid effort level', () => {
    expect(buildClaudeArgs({ effort: 'high' })[buildClaudeArgs({ effort: 'high' }).indexOf('--effort') + 1]).toBe('high')
  })
  test('falls back to effort low for an invalid level', () => {
    const a = buildClaudeArgs({ effort: 'turbo' })
    expect(a[a.indexOf('--effort') + 1]).toBe('low')
  })
  test('adds --model only for an allow-listed alias', () => {
    const a = buildClaudeArgs({ model: 'opus' })
    expect(a[a.indexOf('--model') + 1]).toBe('opus')
  })
  test('rejects a non-allow-listed model (gemini id or injection attempt)', () => {
    expect(buildClaudeArgs({ model: 'gemini-2.5-flash' })).not.toContain('--model')
    expect(buildClaudeArgs({ model: 'x & calc' })).not.toContain('--model')
  })
})

describe('path constants', () => {
  test('are under /api/ai', () => {
    expect(LOCAL_AI_HEALTH_PATH).toBe('/api/ai/health')
    expect(LOCAL_AI_GENERATE_PATH).toBe('/api/ai/generate')
  })
})

describe('makeLocalClaudeClient', () => {
  afterEach(() => { vi.unstubAllGlobals() })
  test('POSTs contents+systemInstruction and returns { text }', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({ ok: true, json: async () => ({ text: '{"items":[]}' }) }))
    vi.stubGlobal('fetch', fetchMock)
    const client = makeLocalClaudeClient()
    const out = await client.models.generateContent({
      model: 'ignored', contents: 'Translate X', config: { systemInstruction: 'Be terse' }
    })
    expect(out.text).toBe('{"items":[]}')
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string)
    expect(body.contents).toBe('Translate X')
    expect(body.systemInstruction).toBe('Be terse')
  })
  test('throws with the endpoint error message on non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: 'not logged in' }) })))
    const client = makeLocalClaudeClient()
    await expect(client.models.generateContent({ contents: 'x' })).rejects.toThrow('not logged in')
  })
  test('forwards model + effort in the request body', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({ ok: true, json: async () => ({ text: '{}' }) }))
    vi.stubGlobal('fetch', fetchMock)
    const client = makeLocalClaudeClient({ model: 'opus', effort: 'high' })
    await client.models.generateContent({ contents: 'x' })
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string)
    expect(body.model).toBe('opus')
    expect(body.effort).toBe('high')
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
