import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SubstitutionRunner from '../../../src/modules/da-compounds/SubstitutionRunner.vue'

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
      { path: '/da-compounds/substitution/run', name: 'dacompounds-substitution-run', component: { template: '<div />' } },
      { path: '/da-compounds/substitution', name: 'dacompounds-substitution', component: { template: '<div />' } },
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-substitution-run', query })
  const wrapper = mount(SubstitutionRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('SubstitutionRunner — pick mode smoke tests', () => {
  it('renders the quiz stage', async () => {
    const { wrapper } = await mountRunner({ count: '1', mode: 'pick' })
    expect(wrapper.find('.sub-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders 4 option buttons', async () => {
    const { wrapper } = await mountRunner({ count: '1', mode: 'pick' })
    expect(wrapper.findAll('.sub-choice')).toHaveLength(4)
    wrapper.unmount()
  })

  it('reveals feedback after clicking a wrong option (deterministic via seeded shuffle)', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const { wrapper } = await mountRunner({ count: '1', mode: 'pick' })
    const buttons = wrapper.findAll('.sub-choice')
    // With Math.random pinned to 0, the identity-preserving shuffle leaves the answer
    // in options[0]; options[1] is therefore a guaranteed-wrong distractor.
    await buttons[1].trigger('click')
    expect(wrapper.find('.sub-feedback').exists()).toBe(true)
    expect(wrapper.find('.sub-feedback-bad').exists()).toBe(true)
    randomSpy.mockRestore()
    wrapper.unmount()
  })
})

describe('SubstitutionRunner — type mode smoke tests', () => {
  it('renders a text input and submit button instead of option buttons', async () => {
    const { wrapper } = await mountRunner({ count: '1', mode: 'type' })
    expect(wrapper.find('.sub-type-input').exists()).toBe(true)
    expect(wrapper.find('.sub-choice').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('SubstitutionRunner — history recording (ADR-0010)', () => {
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
      type: 'dac-substitution',
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
})
