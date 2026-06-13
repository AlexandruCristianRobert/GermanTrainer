import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { useRouteProgress } from '../../src/composables/useRouteProgress'

describe('useRouteProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useRouteProgress().done() // reset module singleton (clears timer, hides)
  })
  afterEach(() => { vi.useRealTimers() })

  test('does not show before the 120ms delay', () => {
    const p = useRouteProgress()
    p.start()
    expect(p.visible.value).toBe(false)
    vi.advanceTimersByTime(119)
    expect(p.visible.value).toBe(false)
  })

  test('shows after the delay elapses', () => {
    const p = useRouteProgress()
    p.start()
    vi.advanceTimersByTime(120)
    expect(p.visible.value).toBe(true)
  })

  test('done() before the delay cancels the show entirely', () => {
    const p = useRouteProgress()
    p.start()
    vi.advanceTimersByTime(50)
    p.done()
    vi.advanceTimersByTime(200)
    expect(p.visible.value).toBe(false)
  })

  test('done() after shown hides the bar', () => {
    const p = useRouteProgress()
    p.start()
    vi.advanceTimersByTime(120)
    expect(p.visible.value).toBe(true)
    p.done()
    expect(p.visible.value).toBe(false)
  })

  test('start() while already visible does not re-arm', () => {
    const p = useRouteProgress()
    p.start()
    vi.advanceTimersByTime(120)
    p.start() // no-op
    p.done()
    expect(p.visible.value).toBe(false)
  })
})
