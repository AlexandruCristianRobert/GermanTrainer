import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import RouteProgress from '../../src/components/RouteProgress.vue'
import { useRouteProgress } from '../../src/composables/useRouteProgress'

describe('RouteProgress.vue', () => {
  beforeEach(() => { vi.useFakeTimers(); useRouteProgress().done() })
  afterEach(() => { vi.useRealTimers() })

  test('renders nothing when not loading', () => {
    const wrapper = mount(RouteProgress, { global: { stubs: { Teleport: true } } })
    expect(wrapper.find('.route-progress').exists()).toBe(false)
  })

  test('renders the bar once progress is visible', async () => {
    const wrapper = mount(RouteProgress, { global: { stubs: { Teleport: true } } })
    useRouteProgress().start()
    vi.advanceTimersByTime(120)
    await nextTick()
    expect(wrapper.find('.route-progress').exists()).toBe(true)
  })
})
