import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// ThemeToggle is the only component in the suite that pulls in naive-ui's NButton, and
// each test re-imports it after vi.resetModules(). Transforming naive-ui cold costs
// several seconds, so under the parallel contention of a full run this file can exceed
// the 5s default while passing in ~1.7s on its own. The cost is import time, not the
// assertions — so raise the ceiling for this file rather than leave the suite flaky.
vi.setConfig({ testTimeout: 30000 })

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    media: '',
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
    addListener: () => {},
    removeListener: () => {}
  }))
})

describe('ThemeToggle', () => {
  it('renders a button with aria-label "Switch to dark theme" in light mode', async () => {
    const ThemeToggle = (await import('../../src/components/ThemeToggle.vue')).default
    const wrapper = mount(ThemeToggle)
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('aria-label')).toBe('Switch to dark theme')
  })

  it('renders with aria-label "Switch to light theme" in dark mode', async () => {
    localStorage.setItem('theme', 'dark')
    const ThemeToggle = (await import('../../src/components/ThemeToggle.vue')).default
    const wrapper = mount(ThemeToggle)
    expect(wrapper.find('button').attributes('aria-label')).toBe('Switch to light theme')
  })

  it('applies the is-dark class when in dark mode', async () => {
    localStorage.setItem('theme', 'dark')
    const ThemeToggle = (await import('../../src/components/ThemeToggle.vue')).default
    const wrapper = mount(ThemeToggle)
    expect(wrapper.find('.theme-toggle-icon').classes()).toContain('is-dark')
  })

  it('clicking the button toggles the theme', async () => {
    const ThemeToggle = (await import('../../src/components/ThemeToggle.vue')).default
    const { useTheme } = await import('../../src/composables/useTheme')
    const wrapper = mount(ThemeToggle)
    expect(useTheme().resolved.value).toBe('light')
    await wrapper.find('button').trigger('click')
    expect(useTheme().resolved.value).toBe('dark')
  })
})
