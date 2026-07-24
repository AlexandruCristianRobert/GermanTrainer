import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import RegisterRunner from '../../../src/modules/da-compounds/RegisterRunner.vue'

// Stub useBreakpoint so the component doesn't call window.matchMedia in jsdom
vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

// Deterministic sampling: slice instead of shuffle (same technique as
// HomographRunner.test.ts), so tests can know exactly which item a
// `count`+filter combination will draw.
vi.mock('../../../src/composables/useDaRegisterQuiz', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/useDaRegisterQuiz')>()
  return {
    ...actual,
    sampleRegisterItems: vi.fn((count: number, f: Parameters<typeof actual.filterRegisterItems>[0] = {}) =>
      actual.filterRegisterItems(f).slice(0, count)),
  }
})
import { sampleRegisterItems, filterRegisterItems, correctedForm, REGISTER_OPTIONS } from '../../../src/composables/useDaRegisterQuiz'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds/register/run', name: 'dacompounds-register-run', component: { template: '<div />' } },
      { path: '/da-compounds/register', name: 'dacompounds-register', component: { template: '<div />' } },
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-register-run', query })
  const wrapper = mount(RegisterRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('RegisterRunner — smoke tests', () => {
  beforeEach(() => { vi.mocked(sampleRegisterItems).mockClear() })

  it('renders the quiz stage', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(wrapper.find('.sub-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows the phrase in quotes', async () => {
    const first = filterRegisterItems({})[0]
    const { wrapper } = await mountRunner({ count: '1' })
    const stem = wrapper.find('.sub-stem').text()
    expect(stem).toContain(first.phrase)
    expect(/[„“"«»]/.test(stem)).toBe(true)
    wrapper.unmount()
  })

  it('renders exactly three option buttons with the fixed labels, in order', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    expect(buttons).toHaveLength(3)
    expect(buttons.map(b => b.text())).toEqual(
      REGISTER_OPTIONS.map(o => expect.stringContaining(o.label))
    )
    wrapper.unmount()
  })

  it('shows success feedback when the correct verdict is picked', async () => {
    const first = filterRegisterItems({})[0]
    const label = REGISTER_OPTIONS.find(o => o.verdict === first.verdict)!.label
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const correctBtn = buttons.find(b => b.text().includes(label))!
    await correctBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows wrong feedback when an incorrect verdict is picked', async () => {
    const first = filterRegisterItems({})[0]
    const wrongLabel = REGISTER_OPTIONS.find(o => o.verdict !== first.verdict)!.label
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const wrongBtn = buttons.find(b => b.text().includes(wrongLabel))!
    await wrongBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-bad').exists()).toBe(true)
    wrapper.unmount()
  })

  it('reveals the explanation after answering, right or wrong', async () => {
    const first = filterRegisterItems({})[0]
    const label = REGISTER_OPTIONS.find(o => o.verdict === first.verdict)!.label
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const btn = buttons.find(b => b.text().includes(label))!
    await btn.trigger('click')
    const reveal = wrapper.find('.sub-reveal')
    expect(reveal.exists()).toBe(true)
    expect(reveal.text()).toContain(first.explanation.split(' / ')[0].slice(0, 20))
    wrapper.unmount()
  })

  it('for a "wrong" item, strikes through the phrase and shows the corrected form', async () => {
    const wrongItem = filterRegisterItems({}).find(i => i.verdict === 'wrong' && correctedForm(i))!
    vi.mocked(sampleRegisterItems).mockReturnValueOnce([wrongItem])
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    await buttons[0].trigger('click')
    const fix = correctedForm(wrongItem)!
    expect(wrapper.find('.sub-reveal').text()).toContain(fix)
    expect(wrapper.find('s').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows an error state when no items match the filters', async () => {
    vi.mocked(sampleRegisterItems).mockReturnValueOnce([])
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('RegisterRunner — history recording (ADR-0010)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  async function completeOneCard(wrapper: VueWrapper) {
    const buttons = wrapper.findAll('.sub-choice')
    await buttons[0].trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes, with the right type and meta', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1' })
    await completeOneCard(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dac-register',
      count: 1,
      meta: expect.objectContaining({
        levels: ['B1'],
      }),
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1' })
    // force a wrong answer so a retry is offered
    const first = filterRegisterItems({ levels: ['B1'] })[0]
    const wrongLabel = REGISTER_OPTIONS.find(o => o.verdict !== first.verdict)!.label
    const buttons = wrapper.findAll('.sub-choice')
    const wrongBtn = buttons.find(b => b.text().includes(wrongLabel))!
    await wrongBtn.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
    expect(saveQuizRun).toHaveBeenCalledTimes(1)

    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')
    await completeOneCard(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('does not record an empty/never-started run', async () => {
    vi.mocked(sampleRegisterItems).mockReturnValueOnce([])
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(saveQuizRun).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
