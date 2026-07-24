import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import HomographRunner from '../../../src/modules/da-compounds/HomographRunner.vue'

// Stub useBreakpoint so the component doesn't call window.matchMedia in jsdom
vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

// Deterministic sampling: slice instead of shuffle (same technique as
// ContrastRunner.test.ts), so tests can know exactly which item a
// `count`+filter combination will draw.
vi.mock('../../../src/composables/useDaHomographQuiz', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/useDaHomographQuiz')>()
  return {
    ...actual,
    sampleHomographItems: vi.fn((count: number, f: Parameters<typeof actual.filterHomographItems>[0] = {}) =>
      actual.filterHomographItems(f).slice(0, count)),
  }
})
import { sampleHomographItems, filterHomographItems } from '../../../src/composables/useDaHomographQuiz'
import { HOMOGRAPH_WORDS } from '../../../src/data/daHomograph'

const wordByKey = new Map(HOMOGRAPH_WORDS.map(w => [w.word, w]))

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds/homograph/run', name: 'dacompounds-homograph-run', component: { template: '<div />' } },
      { path: '/da-compounds/homograph', name: 'dacompounds-homograph', component: { template: '<div />' } },
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-homograph-run', query })
  const wrapper = mount(HomographRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('HomographRunner — smoke tests', () => {
  beforeEach(() => { vi.mocked(sampleHomographItems).mockClear() })

  it('renders the quiz stage', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(wrapper.find('.sub-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('bolds the ambiguous word inside the sentence', async () => {
    const first = filterHomographItems({})[0]
    const { wrapper } = await mountRunner({ count: '1' })
    const strong = wrapper.find('.sub-stem strong')
    expect(strong.exists()).toBe(true)
    expect(strong.text().toLowerCase()).toBe(first.word)
    wrapper.unmount()
  })

  it('renders exactly two option buttons with the word\'s compound + connector labels', async () => {
    const first = filterHomographItems({})[0]
    const w = wordByKey.get(first.word)!
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    expect(buttons).toHaveLength(2)
    expect(buttons.some(b => b.text().includes(w.compoundLabel))).toBe(true)
    expect(buttons.some(b => b.text().includes(w.connectorLabel))).toBe(true)
    wrapper.unmount()
  })

  it('shows success feedback when the correct reading is picked', async () => {
    const first = filterHomographItems({})[0]
    const w = wordByKey.get(first.word)!
    const label = first.reading === 'compound' ? w.compoundLabel : w.connectorLabel
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const correctBtn = buttons.find(b => b.text().includes(label))!
    await correctBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows wrong feedback when the incorrect reading is picked', async () => {
    const first = filterHomographItems({})[0]
    const w = wordByKey.get(first.word)!
    const wrongLabel = first.reading === 'compound' ? w.connectorLabel : w.compoundLabel
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const wrongBtn = buttons.find(b => b.text().includes(wrongLabel))!
    await wrongBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-bad').exists()).toBe(true)
    wrapper.unmount()
  })

  it('reveals the explanation and both labels after answering, right or wrong', async () => {
    const first = filterHomographItems({})[0]
    const w = wordByKey.get(first.word)!
    const wrongLabel = first.reading === 'compound' ? w.connectorLabel : w.compoundLabel
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const wrongBtn = buttons.find(b => b.text().includes(wrongLabel))!
    await wrongBtn.trigger('click')
    const revealText = wrapper.find('.sub-reveal').text()
    expect(revealText).toContain(w.compoundLabel)
    expect(revealText).toContain(w.connectorLabel)
    expect(revealText).toContain(first.explanation.split(' / ')[0].slice(0, 20))
    wrapper.unmount()
  })

  it('highlights the correct option after answering wrong', async () => {
    const first = filterHomographItems({})[0]
    const w = wordByKey.get(first.word)!
    const correctLabel = first.reading === 'compound' ? w.compoundLabel : w.connectorLabel
    const wrongLabel = first.reading === 'compound' ? w.connectorLabel : w.compoundLabel
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const wrongBtn = buttons.find(b => b.text().includes(wrongLabel))!
    await wrongBtn.trigger('click')
    const correctBtn = wrapper.findAll('.sub-choice').find(b => b.text().includes(correctLabel))!
    expect(correctBtn.classes()).toContain('correct')
    expect(wrongBtn.classes()).toContain('wrong')
    wrapper.unmount()
  })

  it('shows an error state when no items match the filters', async () => {
    // Every level carries items (see daHomograph.test.ts floors), so force the
    // zero-match branch the same way the engine layer already covers it —
    // by mocking the sampler for just this one call.
    vi.mocked(sampleHomographItems).mockReturnValueOnce([])
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('HomographRunner — history recording (ADR-0010)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  async function completeOneCard(wrapper: VueWrapper, correct: boolean) {
    const first = filterHomographItems({ levels: ['B1'] })[0]
    const w = wordByKey.get(first.word)!
    const correctLabel = first.reading === 'compound' ? w.compoundLabel : w.connectorLabel
    const wrongLabel = first.reading === 'compound' ? w.connectorLabel : w.compoundLabel
    const buttons = wrapper.findAll('.sub-choice')
    const btn = correct
      ? buttons.find(b => b.text().includes(correctLabel))!
      : buttons.find(b => b.text().includes(wrongLabel))!
    await btn.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes, with the right type and meta', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1' })
    await completeOneCard(wrapper, false)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dac-homograph',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({
        levels: ['B1'],
      }),
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1' })
    await completeOneCard(wrapper, false)
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')
    await completeOneCard(wrapper, false)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('does not record an empty/never-started run', async () => {
    vi.mocked(sampleHomographItems).mockReturnValueOnce([])
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(saveQuizRun).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
