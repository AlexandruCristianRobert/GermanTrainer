import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import FormationRunner from '../../../src/modules/da-compounds/FormationRunner.vue'

// Stub useBreakpoint so the component doesn't call window.matchMedia in jsdom
vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds/formation/run', name: 'dacompounds-formation-run', component: { template: '<div />' } },
      { path: '/da-compounds/formation', name: 'dacompounds-formation', component: { template: '<div />' } },
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-formation-run', query })
  const wrapper = mount(FormationRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('FormationRunner — smoke tests', () => {
  it('renders the quiz stage with a preposition', async () => {
    const { wrapper } = await mountRunner({ count: '1', traps: '0' })
    expect(wrapper.find('.fr-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows three choice buttons', async () => {
    const { wrapper } = await mountRunner({ count: '1', traps: '0' })
    const buttons = wrapper.findAll('.fr-choice')
    expect(buttons).toHaveLength(3)
    wrapper.unmount()
  })

  it('reveals feedback after clicking a wrong choice', async () => {
    const { wrapper } = await mountRunner({ count: '1', traps: '0' })
    // 'none' is guaranteed wrong for any of the 19 compoundable prepositions.
    const noneBtn = wrapper.findAll('.fr-choice').find(b => b.find('.fr-choice-label').text() === 'keine Bildung')
    await noneBtn!.trigger('click')
    expect(wrapper.find('.fr-feedback').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('FormationRunner — history recording (ADR-0010)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  async function completeOneCardWrong(wrapper: Awaited<ReturnType<typeof mountRunner>>['wrapper']) {
    const noneBtn = wrapper.findAll('.fr-choice').find(b => b.find('.fr-choice-label').text() === 'keine Bildung')
    await noneBtn!.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes', async () => {
    const { wrapper } = await mountRunner({ count: '1', traps: '0' })
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dac-formation',
      count: 1,
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner({ count: '1', traps: '0' })
    await completeOneCardWrong(wrapper)
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
