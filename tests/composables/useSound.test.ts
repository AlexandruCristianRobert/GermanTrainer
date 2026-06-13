import { describe, test, expect, beforeEach, vi } from 'vitest'
import { useSound } from '../../src/composables/useSound'

describe('useSound', () => {
  beforeEach(() => {
    localStorage.clear()
    useSound().setEnabled(true) // normalize the module singleton
  })

  test('setEnabled persists and reflects in enabled', () => {
    const s = useSound()
    s.setEnabled(false)
    expect(s.enabled.value).toBe(false)
    expect(localStorage.getItem('gt:soundEnabled')).toBe('false')
    s.setEnabled(true)
    expect(s.enabled.value).toBe(true)
    expect(localStorage.getItem('gt:soundEnabled')).toBe('true')
  })

  test('defaults to enabled when nothing is stored (fresh module load)', async () => {
    localStorage.clear()
    vi.resetModules()
    const { useSound: fresh } = await import('../../src/composables/useSound')
    expect(fresh().enabled.value).toBe(true)
  })

  test('treats a stored "false" as disabled on fresh load', async () => {
    localStorage.setItem('gt:soundEnabled', 'false')
    vi.resetModules()
    const { useSound: fresh } = await import('../../src/composables/useSound')
    expect(fresh().enabled.value).toBe(false)
  })

  test('playReady is a no-op (no throw) when disabled', () => {
    const s = useSound()
    s.setEnabled(false)
    expect(() => s.playReady()).not.toThrow()
  })

  test('playReady never throws when AudioContext is unavailable', () => {
    const s = useSound()
    s.setEnabled(true)
    // jsdom has no Web Audio: window.AudioContext is undefined here.
    expect(() => s.playReady()).not.toThrow()
  })

  test('playReady swallows a throwing AudioContext constructor', () => {
    const s = useSound()
    s.setEnabled(true)
    const Throwing = class { constructor() { throw new Error('blocked') } }
    ;(window as unknown as { AudioContext: unknown }).AudioContext = Throwing
    expect(() => s.playReady()).not.toThrow()
    delete (window as unknown as { AudioContext?: unknown }).AudioContext
  })
})
