import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import RelativeRunner from '../../../src/modules/da-compounds/RelativeRunner.vue'

// Stub useBreakpoint so the component doesn't call window.matchMedia in jsdom
vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

// Deterministic sampling: slice instead of shuffle (same technique as
// KorrelatRunner.test.ts), so tests can know exactly which item a
// `count`+filter combination will draw.
vi.mock('../../../src/composables/useDaRelativeQuiz', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/useDaRelativeQuiz')>()
  return {
    ...actual,
    sampleRelativeItems: vi.fn((count: number, f: Parameters<typeof actual.filterRelativeItems>[0] = {}) =>
      actual.filterRelativeItems(f).slice(0, count)),
  }
})
import { sampleRelativeItems, filterRelativeItems } from '../../../src/composables/useDaRelativeQuiz'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds/relative/run', name: 'dacompounds-relative-run', component: { template: '<div />' } },
      { path: '/da-compounds/relative', name: 'dacompounds-relative', component: { template: '<div />' } },
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-relative-run', query })
  const wrapper = mount(RelativeRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('RelativeRunner — smoke tests', () => {
  beforeEach(() => { vi.mocked(sampleRelativeItems).mockClear() })

  it('renders the quiz stage', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(wrapper.find('.sub-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders exactly two option buttons: prepForm and woForm', async () => {
    const first = filterRelativeItems({})[0]
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    expect(buttons).toHaveLength(2)
    expect(buttons.some(b => b.text().includes(first.prepForm))).toBe(true)
    expect(buttons.some(b => b.text().includes(first.woForm))).toBe(true)
    wrapper.unmount()
  })

  it('shows the sentence with the gap', async () => {
    const first = filterRelativeItems({})[0]
    const { wrapper } = await mountRunner({ count: '1' })
    const stem = wrapper.find('.sub-stem').text()
    const [pre, post] = first.sentence.split('___')
    expect(stem).toContain(pre.trim())
    expect(stem).toContain(post.trim())
    wrapper.unmount()
  })

  it('accepts the wo-form for an indefinite antecedent', async () => {
    const indefinite = filterRelativeItems({}).find(i => i.antecedentKind === 'indefinite')!
    vi.mocked(sampleRelativeItems).mockReturnValueOnce([indefinite])
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const woBtn = buttons.find(b => b.text().includes(indefinite.woForm))!
    await woBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    wrapper.unmount()
  })

  it('rejects the prep-form for an indefinite antecedent', async () => {
    const indefinite = filterRelativeItems({}).find(i => i.antecedentKind === 'indefinite')!
    vi.mocked(sampleRelativeItems).mockReturnValueOnce([indefinite])
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const prepBtn = buttons.find(b => b.text().includes(indefinite.prepForm))!
    await prepBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-bad').exists()).toBe(true)
    wrapper.unmount()
  })

  it('accepts the prep-form for a person antecedent', async () => {
    const person = filterRelativeItems({}).find(i => i.antecedentKind === 'person')!
    vi.mocked(sampleRelativeItems).mockReturnValueOnce([person])
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const prepBtn = buttons.find(b => b.text().includes(person.prepForm))!
    await prepBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    wrapper.unmount()
  })

  it('rejects the wo-form for a person antecedent', async () => {
    const person = filterRelativeItems({}).find(i => i.antecedentKind === 'person')!
    vi.mocked(sampleRelativeItems).mockReturnValueOnce([person])
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const woBtn = buttons.find(b => b.text().includes(person.woForm))!
    await woBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-bad').exists()).toBe(true)
    wrapper.unmount()
  })

  it('accepts BOTH forms for a thing antecedent, and notes the preferred form', async () => {
    const thing = filterRelativeItems({}).find(i => i.antecedentKind === 'thing')!
    vi.mocked(sampleRelativeItems).mockReturnValueOnce([thing])
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const woBtn = buttons.find(b => b.text().includes(thing.woForm))!
    await woBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    expect(wrapper.find('.sub-reveal').text()).toContain(thing.prepForm)
    wrapper.unmount()
  })

  it('reveals the explanation after answering, right or wrong', async () => {
    const first = filterRelativeItems({})[0]
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    await buttons[0].trigger('click')
    const reveal = wrapper.find('.sub-reveal')
    expect(reveal.exists()).toBe(true)
    expect(reveal.text()).toContain(first.explanation.split(' / ')[0].slice(0, 20))
    wrapper.unmount()
  })

  it('shows an error state when no items match the filters', async () => {
    vi.mocked(sampleRelativeItems).mockReturnValueOnce([])
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('RelativeRunner — history recording (ADR-0010)', () => {
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
      type: 'dac-relative',
      count: 1,
      meta: expect.objectContaining({
        levels: ['B1'],
      }),
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const person = filterRelativeItems({ levels: ['B1'] }).find(i => i.antecedentKind === 'person')!
    vi.mocked(sampleRelativeItems).mockReturnValueOnce([person])
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1' })
    const buttons = wrapper.findAll('.sub-choice')
    const woBtn = buttons.find(b => b.text().includes(person.woForm))! // wrong for a person item
    await woBtn.trigger('click')
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
    vi.mocked(sampleRelativeItems).mockReturnValueOnce([])
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(saveQuizRun).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
