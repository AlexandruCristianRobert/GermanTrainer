import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import WoQuestionRunner from '../../../src/modules/da-compounds/WoQuestionRunner.vue'

// Stub useBreakpoint so the component doesn't call window.matchMedia in jsdom
vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

// Deterministic sampling: slice instead of shuffle (same technique as
// ArticleFillRunner.test.ts), so tests can know exactly which item a
// `count`+filter combination will draw.
vi.mock('../../../src/composables/useDaWoQuestionQuiz', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/useDaWoQuestionQuiz')>()
  return {
    ...actual,
    sampleWoQuestionItems: vi.fn((count: number, f: Parameters<typeof actual.filterWoQuestionItems>[0] = {}) =>
      actual.filterWoQuestionItems(f).slice(0, count)),
  }
})
import { sampleWoQuestionItems, filterWoQuestionItems } from '../../../src/composables/useDaWoQuestionQuiz'
import { woQuestionAnswer } from '../../../src/data/daWoQuestion'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds/wo-question/run', name: 'dacompounds-wo-question-run', component: { template: '<div />' } },
      { path: '/da-compounds/wo-question', name: 'dacompounds-wo-question', component: { template: '<div />' } },
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-wo-question-run', query })
  const wrapper = mount(WoQuestionRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

async function submit(wrapper: VueWrapper, text: string) {
  await wrapper.find('.sub-type-input').setValue(text)
  const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
  await submitBtn!.trigger('click')
}

describe('WoQuestionRunner — smoke tests', () => {
  beforeEach(() => { vi.mocked(sampleWoQuestionItems).mockClear() })

  it('renders the quiz stage', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(wrapper.find('.sub-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders a single text input (no pick options)', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(wrapper.find('.sub-type-input').exists()).toBe(true)
    expect(wrapper.find('.sub-choice').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows the statement WITHOUT any highlighted object — the learner judges animacy themselves', async () => {
    const first = filterWoQuestionItems({})[0]
    const { wrapper } = await mountRunner({ count: '1' })
    expect(wrapper.find('.sub-statement').text()).toBe(first.item.statement)
    expect(wrapper.find('.sub-object').exists()).toBe(false)
    wrapper.unmount()
  })

  it('renders the scaffold with a blank gap before answering', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    const gap = wrapper.find('.sub-gap')
    expect(gap.exists()).toBe(true)
    expect(gap.text()).toBe('＿＿＿')
    wrapper.unmount()
  })

  it('reveals feedback after submitting', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    await submit(wrapper, 'xyz-completely-wrong')
    expect(wrapper.find('.sub-feedback').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows success feedback for the correct typed interrogative, and fills the gap with it', async () => {
    const first = filterWoQuestionItems({})[0]
    const { wrapper } = await mountRunner({ count: '1' })
    await submit(wrapper, woQuestionAnswer(first.item))
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    expect(wrapper.find('.sub-gap').text()).toBe(woQuestionAnswer(first.item))
    wrapper.unmount()
  })

  it('shows an error state when no items match the filters', async () => {
    // The dataset has no noun-role items at all -> guaranteed zero matches -> error state.
    const { wrapper } = await mountRunner({ count: '1', roles: 'noun' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('WoQuestionRunner — reveal teaches the rule + explanation (wrong answers)', () => {
  it('shows the rule reminder and coreIdeaExplanation for a wrong answer', async () => {
    const first = filterWoQuestionItems({})[0]
    const { wrapper } = await mountRunner({ count: '1' })
    await submit(wrapper, 'totally-wrong')
    const reveal = wrapper.find('.sub-reveal')
    expect(reveal.exists()).toBe(true)
    expect(reveal.text()).toContain('Sache → wo(r)-, Person → Präposition + wen/wem')
    expect(reveal.text()).toContain(first.colloc.coreIdeaExplanation)
    wrapper.unmount()
  })

  it('does not show the reveal box for a correct answer', async () => {
    const first = filterWoQuestionItems({})[0]
    const { wrapper } = await mountRunner({ count: '1' })
    await submit(wrapper, woQuestionAnswer(first.item))
    expect(wrapper.find('.sub-reveal').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('WoQuestionRunner — history recording (ADR-0010)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  async function completeOneCardWrong(wrapper: VueWrapper) {
    await submit(wrapper, 'completely-wrong-xyz')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes, with the right type and meta', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1', roles: 'verb' })
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dac-wo-question',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({
        levels: ['B1'],
        roles: ['verb'],
      }),
    }))
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

  it('does not record an empty/never-started run', async () => {
    const { wrapper } = await mountRunner({ count: '1', roles: 'noun' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(saveQuizRun).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
