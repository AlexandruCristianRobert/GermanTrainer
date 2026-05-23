import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Reset the module + DOM + localStorage before each test
beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

afterEach(() => {
  vi.restoreAllMocks()
})

function stubMatchMedia(prefersDark: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: prefersDark,
    media: q,
    addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.push(fn),
    removeEventListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
    addListener: () => {},
    removeListener: () => {}
  }))
  return {
    fireChange(matches: boolean) {
      for (const fn of listeners) fn({ matches })
    }
  }
}

describe('useTheme', () => {
  it('defaults to light when localStorage is empty and prefers-color-scheme is light', async () => {
    stubMatchMedia(false)
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    expect(t.mode.value).toBe('system')
    expect(t.resolved.value).toBe('light')
  })

  it('defaults to dark when localStorage is empty and prefers-color-scheme is dark', async () => {
    stubMatchMedia(true)
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    expect(t.mode.value).toBe('system')
    expect(t.resolved.value).toBe('dark')
  })

  it('reads mode=light from localStorage', async () => {
    localStorage.setItem('theme', 'light')
    stubMatchMedia(true)
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    expect(t.mode.value).toBe('light')
    expect(t.resolved.value).toBe('light')
  })

  it('reads mode=dark from localStorage', async () => {
    localStorage.setItem('theme', 'dark')
    stubMatchMedia(false)
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    expect(t.mode.value).toBe('dark')
    expect(t.resolved.value).toBe('dark')
  })

  it('toggle flips light to dark and persists', async () => {
    localStorage.setItem('theme', 'light')
    stubMatchMedia(false)
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    t.toggle()
    expect(t.mode.value).toBe('dark')
    expect(t.resolved.value).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('toggle from system mode sets explicit opposite of current resolved', async () => {
    stubMatchMedia(true) // system says dark, resolved = dark
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    expect(t.mode.value).toBe('system')
    expect(t.resolved.value).toBe('dark')
    t.toggle()
    expect(t.mode.value).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('setMode("system") clears localStorage and re-reads system preference', async () => {
    localStorage.setItem('theme', 'dark')
    stubMatchMedia(false)
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    expect(t.resolved.value).toBe('dark')
    t.setMode('system')
    expect(t.mode.value).toBe('system')
    expect(t.resolved.value).toBe('light')
    expect(localStorage.getItem('theme')).toBeNull()
  })

  it('updates <html data-theme> when mode changes', async () => {
    stubMatchMedia(false)
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    t.setMode('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('returns the same shared state from multiple calls (singleton)', async () => {
    stubMatchMedia(false)
    const { useTheme } = await import('../../src/composables/useTheme')
    const a = useTheme()
    const b = useTheme()
    expect(a.mode).toBe(b.mode)
    a.setMode('dark')
    expect(b.mode.value).toBe('dark')
  })

  it('follows system change when mode=system', async () => {
    const mql = stubMatchMedia(false)
    const { useTheme } = await import('../../src/composables/useTheme')
    const t = useTheme()
    expect(t.resolved.value).toBe('light')
    mql.fireChange(true)
    expect(t.resolved.value).toBe('dark')
  })
})
