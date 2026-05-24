import { describe, test, expect } from 'vitest'
import {
  getAllPrompts,
  getPromptById,
  filterByTaskType,
  filterByLevel
} from '../../src/composables/useWritingPrompts'

describe('useWritingPrompts', () => {
  test('getAllPrompts returns the seed catalogue', () => {
    const prompts = getAllPrompts()
    expect(prompts.length).toBeGreaterThanOrEqual(12)
    for (const p of prompts) {
      expect(p.source).toBe('seed')
    }
  })

  test('getPromptById returns the matching prompt', () => {
    const p = getPromptById('wp-forum-wohnen-stadt-land')
    expect(p).not.toBeNull()
    expect(p?.type).toBe('forumsbeitrag')
  })

  test('getPromptById returns null for unknown id', () => {
    expect(getPromptById('does-not-exist')).toBeNull()
  })

  test('filterByTaskType returns only matching prompts', () => {
    const emails = filterByTaskType('formelle-email')
    expect(emails.length).toBeGreaterThanOrEqual(2)
    for (const p of emails) {
      expect(p.type).toBe('formelle-email')
    }
  })

  test('filterByLevel returns only matching level', () => {
    const c1 = filterByLevel('C1')
    expect(c1.length).toBeGreaterThan(0)
    for (const p of c1) {
      expect(p.level).toBe('C1')
    }
  })
})
