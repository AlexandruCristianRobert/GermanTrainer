import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import HinHerRunner from '../../../src/modules/direction-words/HinHerRunner.vue'

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
      { path: '/direction-words/hin-her/run', name: 'directionwords-hinher-run', component: { template: '<div />' } },
      { path: '/direction-words/hin-her', name: 'directionwords-hinher', component: { template: '<div />' } },
      { path: '/direction-words', name: 'directionwords', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'directionwords-hinher-run', query })
  const wrapper = mount(HinHerRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

// All four levels — so HIN_HER_ITEMS' full A2/B1 set is in play.
const QUERY = { count: '1', levels: 'A2,B1,B2,C1' }

describe('HinHerRunner — smoke tests', () => {
  it('renders a scene diagram on the card', async () => {
    const { wrapper } = await mountRunner(QUERY)
    expect(wrapper.find('.scene-diagram').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders at least two choice buttons', async () => {
    const { wrapper } = await mountRunner(QUERY)
    expect(wrapper.findAll('.choice').length).toBeGreaterThanOrEqual(2)
    wrapper.unmount()
  })

  it('reveals feedback with the correct answer after a wrong pick', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const { wrapper } = await mountRunner(QUERY)
    // With Math.random pinned to 0, the identity-preserving shuffle samples the
    // first matching item: hh-komm-her (hierTrap, answer 'her'). 'hin' is a
    // guaranteed-wrong pick.
    const buttons = wrapper.findAll('.choice')
    const hinBtn = buttons.find(b => b.find('.c-label').text() === 'hin')
    await hinBtn!.trigger('click')
    expect(wrapper.find('.drill-feedback').exists()).toBe(true)
    expect(wrapper.text()).toContain('her')
    randomSpy.mockRestore()
    wrapper.unmount()
  })
})

describe('HinHerRunner — history recording (ADR-0010)', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.mocked(saveQuizRun).mockClear()
    // Pinned for the whole test (mount + any retry): the identity-preserving
    // shuffle this produces always samples hh-komm-her, so 'hin' is a
    // deterministic, guaranteed-wrong pick — including after retry rebuilds
    // the quiz with a fresh (single-item, no-op) shuffle.
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => { randomSpy.mockRestore() })

  async function completeOneCardWrong(wrapper: VueWrapper) {
    const buttons = wrapper.findAll('.choice')
    const hinBtn = buttons.find(b => b.find('.c-label').text() === 'hin')
    await hinBtn!.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dw-hinher',
      count: 1,
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
