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
