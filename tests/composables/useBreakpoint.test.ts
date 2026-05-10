import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useBreakpoint } from '../../src/composables/useBreakpoint'

interface FakeMediaQueryList {
  matches: boolean
  media: string
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  _trigger: (matches: boolean) => void
}

function makeFakeMatchMedia(initialMatches: boolean): FakeMediaQueryList {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  return {
    matches: initialMatches,
    media: '',
    addEventListener: vi.fn((_event: string, cb: (e: { matches: boolean }) => void) => {
      listeners.push(cb)
    }),
    removeEventListener: vi.fn(),
    _trigger(matches: boolean) {
      this.matches = matches
      for (const l of listeners) l({ matches })
    }
  }
}

describe('useBreakpoint', () => {
  let fake: FakeMediaQueryList

  beforeEach(() => {
    fake = makeFakeMatchMedia(false)
    vi.stubGlobal('matchMedia', vi.fn(() => fake))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('isMobile is false when the media query does not match', () => {
    const { isMobile } = useBreakpoint()
    expect(isMobile.value).toBe(false)
  })

  it('isMobile is true when the media query matches at startup', () => {
    fake = makeFakeMatchMedia(true)
    vi.stubGlobal('matchMedia', vi.fn(() => fake))
    const { isMobile } = useBreakpoint()
    expect(isMobile.value).toBe(true)
  })

  it('isMobile updates when the media query change event fires', () => {
    const { isMobile } = useBreakpoint()
    expect(isMobile.value).toBe(false)
    fake._trigger(true)
    expect(isMobile.value).toBe(true)
    fake._trigger(false)
    expect(isMobile.value).toBe(false)
  })

  it('uses the (max-width: 767.99px) query', () => {
    const matchMedia = window.matchMedia as unknown as ReturnType<typeof vi.fn>
    useBreakpoint()
    expect(matchMedia).toHaveBeenCalledWith('(max-width: 767.99px)')
  })
})
