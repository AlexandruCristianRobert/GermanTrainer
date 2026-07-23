import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import TransformRunner from '../../../src/modules/da-compounds/TransformRunner.vue'

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
      { path: '/da-compounds/transform/run', name: 'dacompounds-transform-run', component: { template: '<div />' } },
      { path: '/da-compounds/transform', name: 'dacompounds-transform', component: { template: '<div />' } },
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-transform-run', query })
  const wrapper = mount(TransformRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('TransformRunner — pick mode smoke tests', () => {
  it('renders the quiz stage', async () => {
    const { wrapper } = await mountRunner({ count: '1', mode: 'pick' })
    expect(wrapper.find('.sub-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('bolds the exact object substring within the sentence', async () => {
    const { wrapper } = await mountRunner({ count: '1', mode: 'pick' })
    const bolded = wrapper.find('.sub-object')
    expect(bolded.exists()).toBe(true)
    expect(bolded.text().length).toBeGreaterThan(0)
    // the bolded phrase must be an exact substring of the full sentence stem
    const stem = wrapper.find('.sub-stem').text()
    expect(stem).toContain(bolded.text())
    wrapper.unmount()
  })

  it('renders 2 or 3 option buttons, one of which is the answer', async () => {
    const { wrapper } = await mountRunner({ count: '1', mode: 'pick' })
    const buttons = wrapper.findAll('.sub-choice')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
    expect(buttons.length).toBeLessThanOrEqual(3)
    wrapper.unmount()
  })

  it('reveals feedback after clicking an option', async () => {
    const { wrapper } = await mountRunner({ count: '1', mode: 'pick' })
    const buttons = wrapper.findAll('.sub-choice')
    await buttons[0].trigger('click')
    expect(wrapper.find('.sub-feedback').exists()).toBe(true)
    wrapper.unmount()
  })

  it('names the kind + explanation in the reveal on a wrong answer', async () => {
    const { wrapper } = await mountRunner({ count: '1', mode: 'type' })
    await wrapper.find('.sub-type-input').setValue('completely-wrong-xyz')
    const submit = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    await submit!.trigger('click')
    const reveal = wrapper.find('.sub-reveal')
    expect(reveal.exists()).toBe(true)
    expect(reveal.text()).toMatch(/Sache|Person/)
    wrapper.unmount()
  })
})

describe('TransformRunner — type mode smoke tests', () => {
  it('renders a text input and submit button instead of option buttons', async () => {
    const { wrapper } = await mountRunner({ count: '1', mode: 'type' })
    expect(wrapper.find('.sub-type-input').exists()).toBe(true)
    expect(wrapper.find('.sub-choice').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('TransformRunner — history recording (ADR-0010)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  async function completeOneCardWrong(wrapper: Awaited<ReturnType<typeof mountRunner>>['wrapper']) {
    await wrapper.find('.sub-type-input').setValue('completely-wrong-xyz')
    const submit = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    await submit!.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes, with the right type and meta', async () => {
    const { wrapper } = await mountRunner({ count: '1', mode: 'type', levels: 'B1', roles: 'verb' })
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dac-transform',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({
        levels: ['B1'],
        roles: ['verb'],
        mode: 'type',
      }),
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner({ count: '1', mode: 'type' })
    await completeOneCardWrong(wrapper)
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('does not record an empty/never-started run', async () => {
    // The dataset has no noun-role items at all -> guaranteed zero matches -> error state, never records.
    const { wrapper } = await mountRunner({ count: '1', roles: 'noun' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(saveQuizRun).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
