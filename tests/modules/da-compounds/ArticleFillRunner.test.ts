import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import ArticleFillRunner from '../../../src/modules/da-compounds/ArticleFillRunner.vue'

// Stub useBreakpoint so the component doesn't call window.matchMedia in jsdom
vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

// Deterministic sampling: slice instead of shuffle (same technique as CaseRunner.test.ts),
// so tests can know exactly which item a `count`+filter combination will draw.
vi.mock('../../../src/composables/useDaArticleQuiz', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/useDaArticleQuiz')>()
  return {
    ...actual,
    sampleArticleItems: vi.fn((count: number, f: Parameters<typeof actual.filterArticleItems>[0] = {}) =>
      actual.filterArticleItems(f).slice(0, count)),
  }
})
import { sampleArticleItems, filterArticleItems, joinArticleItems } from '../../../src/composables/useDaArticleQuiz'
import { articleFillAnswer } from '../../../src/data/daArticleFill'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds/article/run', name: 'dacompounds-article-run', component: { template: '<div />' } },
      { path: '/da-compounds/article', name: 'dacompounds-article', component: { template: '<div />' } },
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-article-run', query })
  const wrapper = mount(ArticleFillRunner, {
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

describe('ArticleFillRunner — smoke tests', () => {
  beforeEach(() => { vi.mocked(sampleArticleItems).mockClear() })

  it('renders the quiz stage', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(wrapper.find('.sub-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders a single text input (no pick options) whose placeholder shows the gap stub', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    const input = wrapper.find('.sub-type-input')
    expect(input.exists()).toBe(true)
    expect(wrapper.find('.sub-choice').exists()).toBe(false)
    expect(['d___', 'ein___']).toContain(input.attributes('placeholder'))
    wrapper.unmount()
  })

  it('renders the gapped sentence with the whole d___/ein___ token replaced by a single blank', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    const stem = wrapper.find('.sub-stem').text()
    expect(stem).not.toContain('d___')
    expect(stem).not.toContain('ein___')
    wrapper.unmount()
  })

  it('reveals feedback after submitting', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    await submit(wrapper, 'xyz-completely-wrong')
    expect(wrapper.find('.sub-feedback').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows success feedback for the correct typed article', async () => {
    const first = filterArticleItems({})[0]
    const { wrapper } = await mountRunner({ count: '1' })
    await submit(wrapper, articleFillAnswer(first.item))
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows an error state when no items match the filters', async () => {
    // B1 + unter has zero DA_ARTICLE_FILL matches (see useDaArticleQuiz.test.ts).
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1', preps: 'unter' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('ArticleFillRunner — reveal teaches the case + rule (wrong answers)', () => {
  it('shows the case name, the rule line, and coreIdeaExplanation for a wrong answer', async () => {
    const first = filterArticleItems({})[0] // af-denken-an: an + Akkusativ (the usual case)
    expect(first.item.id).toBe('af-denken-an')
    const { wrapper } = await mountRunner({ count: '1' })
    await submit(wrapper, 'totally-wrong')
    const reveal = wrapper.find('.sub-reveal')
    expect(reveal.exists()).toBe(true)
    expect(reveal.text()).toContain('Akkusativ')
    expect(reveal.text()).toContain('Präpositionalobjekt')
    expect(reveal.text()).toContain('meistens Akkusativ')
    expect(reveal.text()).toContain(first.colloc.coreIdeaExplanation)
    wrapper.unmount()
  })

  it('does not show the an+Dativ exception flag for a non-exception item', async () => {
    const nonException = joinArticleItems().find(ji => !(ji.colloc.preposition === 'an' && ji.colloc.case === 'dative'))!
    vi.mocked(sampleArticleItems).mockReturnValueOnce([nonException])
    const { wrapper } = await mountRunner({ count: '1' })
    await submit(wrapper, 'totally-wrong')
    expect(wrapper.find('.article-exception-flag').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows the an+Dativ exception flag when the item IS the exception (e.g. arbeiten an)', async () => {
    const exception = joinArticleItems().find(ji => ji.colloc.preposition === 'an' && ji.colloc.case === 'dative')!
    vi.mocked(sampleArticleItems).mockReturnValueOnce([exception])
    const { wrapper } = await mountRunner({ count: '1' })
    await submit(wrapper, 'totally-wrong')
    expect(wrapper.find('.article-exception-flag').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('ArticleFillRunner — history recording (ADR-0010)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  async function completeOneCardWrong(wrapper: VueWrapper) {
    await submit(wrapper, 'completely-wrong-xyz')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes, with the right type and meta', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1', preps: 'an' })
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dac-article',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({
        levels: ['B1'],
        preps: ['an'],
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
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1', preps: 'unter' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(saveQuizRun).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
