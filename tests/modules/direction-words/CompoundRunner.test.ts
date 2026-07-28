import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import CompoundRunner from '../../../src/modules/direction-words/CompoundRunner.vue'

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
      { path: '/direction-words/compounds/run', name: 'directionwords-compounds-run', component: { template: '<div />' } },
      { path: '/direction-words/compounds', name: 'directionwords-compounds', component: { template: '<div />' } },
      { path: '/direction-words', name: 'directionwords', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'directionwords-compounds-run', query })
  const wrapper = mount(CompoundRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

// All levels and all pairs — so the full COMPOUND_ITEMS bank is in play.
const PICK_QUERY = { count: '1', levels: 'A2,B1,B2,C1', pairs: 'ein,aus,auf,unter,über,ab', mode: 'pick' }
const TYPE_QUERY = { count: '1', levels: 'A2,B1,B2,C1', pairs: 'ein,aus,auf,unter,über,ab', mode: 'type' }

describe('CompoundRunner — pick mode', () => {
  it('renders a scene diagram and exactly 4 option buttons', async () => {
    const { wrapper } = await mountRunner(PICK_QUERY)
    expect(wrapper.find('.scene-diagram').exists()).toBe(true)
    expect(wrapper.findAll('.cp-choice').length).toBe(4)
    wrapper.unmount()
  })

  it('records exactly one Run with meta.mode "pick"; retry is not recorded', async () => {
    vi.mocked(saveQuizRun).mockClear()
    const { wrapper } = await mountRunner(PICK_QUERY)

    const buttons = wrapper.findAll('.cp-choice')
    // Click the first option — whichever it is, grading will mark it right or wrong,
    // but either way the single card finishes the round.
    await buttons[0]!.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')

    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dw-compound',
      count: 1,
      meta: expect.objectContaining({ mode: 'pick' }),
    }))

    // If the round was wrong, a retry modal offers a retry; retrying must not record again.
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    if (retryBtn) {
      await retryBtn.trigger('click')
      const retryButtons = wrapper.findAll('.cp-choice')
      await retryButtons[0]!.trigger('click')
      const retryFinish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
      await retryFinish!.trigger('click')
      expect(saveQuizRun).toHaveBeenCalledTimes(1)
    }
    wrapper.unmount()
  })
})

describe('CompoundRunner — type mode', () => {
  let wrapper: VueWrapper

  beforeEach(async () => {
    ({ wrapper } = await mountRunner(TYPE_QUERY))
  })
  afterEach(() => wrapper.unmount())

  it('renders a text input instead of option buttons', () => {
    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.findAll('.cp-choice').length).toBe(0)
  })

  it('shows "Korrekt:" feedback after submitting a wrong value, and records meta.mode "type"', async () => {
    vi.mocked(saveQuizRun).mockClear()
    const input = wrapper.find('input')
    await input.setValue('x')
    await input.trigger('keyup.enter')
    await flushPromises()

    expect(wrapper.text()).toContain('Korrekt:')

    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')

    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dw-compound',
      meta: expect.objectContaining({ mode: 'type' }),
    }))
  })
})
