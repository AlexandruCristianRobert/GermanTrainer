import { describe, it, expect } from 'vitest'
import { NOUN_GROUPS } from '../../src/db/types'

describe('NOUN_GROUPS', () => {
  it('includes the Fantasy and Switzerland categories', () => {
    expect(NOUN_GROUPS).toContain('Fantasy')
    expect(NOUN_GROUPS).toContain('Switzerland')
  })

  it('keeps "Other" as the last group', () => {
    expect(NOUN_GROUPS[NOUN_GROUPS.length - 1]).toBe('Other')
  })

  it('has no duplicate group names', () => {
    expect(new Set(NOUN_GROUPS).size).toBe(NOUN_GROUPS.length)
  })
})
