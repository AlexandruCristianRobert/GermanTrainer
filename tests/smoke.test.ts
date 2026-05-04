import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2)
  })

  it('has indexedDB available', () => {
    expect(typeof indexedDB).toBe('object')
    expect(indexedDB).not.toBeNull()
  })
})
