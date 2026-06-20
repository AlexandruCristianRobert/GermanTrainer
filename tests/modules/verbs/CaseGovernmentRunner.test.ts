import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import CaseGovernmentRunner from '../../../src/modules/verbs/CaseGovernmentRunner.vue'

// Stub useBreakpoint so the component doesn't call window.matchMedia in jsdom
vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/verbs/case-government/run', name: 'verbs-case-government-run', component: { template: '<div />' } },
      { path: '/verbs/case-government', name: 'verbs-case-government', component: { template: '<div />' } },
      { path: '/verbs', name: 'verbs', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'verbs-case-government-run', query })
  const wrapper = mount(CaseGovernmentRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('CaseGovernmentRunner — smoke tests', () => {
  it('renders the quiz stage with a verb', async () => {
    const { wrapper } = await mountRunner({
      levels: 'A1',
      types: 'regular',
      cases: 'accusative',
      count: '1',
    })
    expect(wrapper.find('.cg-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows all six case buttons before a pick', async () => {
    const { wrapper } = await mountRunner({
      levels: 'A1',
      count: '1',
    })
    const buttons = wrapper.findAll('.cg-choice')
    expect(buttons).toHaveLength(6)
    wrapper.unmount()
  })

  it('six buttons have the correct German labels', async () => {
    const { wrapper } = await mountRunner({
      levels: 'A1',
      count: '1',
    })
    const labels = wrapper.findAll('.cg-choice-label').map(el => el.text())
    expect(labels).toContain('Akkusativ')
    expect(labels).toContain('Dativ')
    expect(labels).toContain('Dativ + Akkusativ')
    expect(labels).toContain('Genitiv')
    expect(labels).toContain('Reflexiv')
    expect(labels).toContain('Kein Objekt')
    wrapper.unmount()
  })

  it('shows verb.german and verb.english on the card', async () => {
    const { wrapper } = await mountRunner({
      levels: 'A1',
      types: 'regular',
      cases: 'accusative',
      count: '1',
    })
    expect(wrapper.find('.cg-verb-german').text().length).toBeGreaterThan(0)
    expect(wrapper.find('.cg-verb-english').text().length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('reveals feedback after clicking a case button', async () => {
    const { wrapper } = await mountRunner({
      levels: 'A1',
      types: 'regular',
      cases: 'accusative',
      count: '1',
    })
    const firstBtn = wrapper.find('.cg-choice')
    await firstBtn.trigger('click')
    expect(wrapper.find('.cg-feedback').exists()).toBe(true)
    wrapper.unmount()
  })

  it('buttons are disabled after a pick', async () => {
    const { wrapper } = await mountRunner({
      levels: 'A1',
      count: '1',
    })
    const btns = wrapper.findAll('.cg-choice')
    await btns[0].trigger('click')
    // All buttons should be disabled after pick
    const disabledBtns = wrapper.findAll('.cg-choice:disabled, .cg-choice[disabled]')
    expect(disabledBtns.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('handles count=0 gracefully (clamps to 1)', async () => {
    const { wrapper } = await mountRunner({
      levels: 'A1',
      count: '0',
    })
    // count=0 → Math.max(1,0)=1, quiz should still load
    expect(wrapper.find('.cg-stage').exists()).toBe(true)
    wrapper.unmount()
  })
})
