import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import NeighborsRunner from '../../../src/modules/da-compounds/NeighborsRunner.vue'

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
      { path: '/da-compounds/neighbors/run', name: 'dacompounds-neighbors-run', component: { template: '<div />' } },
      { path: '/da-compounds/neighbors', name: 'dacompounds-neighbors', component: { template: '<div />' } },
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-neighbors-run', query })
  const wrapper = mount(NeighborsRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('NeighborsRunner — smoke tests', () => {
  it('renders the quiz stage', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(wrapper.find('.sub-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders 4 option buttons (the answer plus its 3 near-neighbor compounds)', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(wrapper.findAll('.sub-choice')).toHaveLength(4)
    wrapper.unmount()
  })

  it('has no mode toggle in the query — reveals feedback after a wrong pick', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    // With Math.random pinned to 0, the identity-preserving shuffle leaves the answer
    // in options[0]; options[1] is therefore a guaranteed-wrong distractor.
    await buttons[1].trigger('click')
    expect(wrapper.find('.sub-feedback-bad').exists()).toBe(true)
    randomSpy.mockRestore()
    wrapper.unmount()
  })
})

describe('NeighborsRunner — history recording (ADR-0010)', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.mocked(saveQuizRun).mockClear()
    // Pinned for the whole test (mount + any retry): the identity-preserving
    // shuffle this produces always leaves the answer in options[0], so
    // options[1] is a deterministic, guaranteed-wrong distractor to click —
    // including after a retry round rebuilds the quiz with a fresh shuffle.
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => { randomSpy.mockRestore() })

  async function completeOneCardWrong(wrapper: Awaited<ReturnType<typeof mountRunner>>['wrapper']) {
    const buttons = wrapper.findAll('.sub-choice')
    await buttons[1].trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes, with the right type and meta (no mode)', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1', roles: 'verb' })
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    const call = vi.mocked(saveQuizRun).mock.calls[0][0]
    expect(call).toEqual(expect.objectContaining({
      type: 'dac-neighbors',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({ levels: ['B1'], roles: ['verb'] }),
    }))
    expect(call.meta.mode).toBeUndefined()
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    await completeOneCardWrong(wrapper)
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
