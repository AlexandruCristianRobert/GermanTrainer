import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import CaseRunner from '../../../src/modules/da-compounds/CaseRunner.vue'
import type { CollocationCase } from '../../../src/data/collocations'

// Stub useBreakpoint so the component doesn't call window.matchMedia in jsdom
vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

// Deterministic sampling: slice instead of shuffle. Unlike the pick-mode gap-fill
// drills, this runner has no options array to fix via a pinned Math.random — the
// two case buttons are always Akkusativ/Dativ in that order — so the sample itself
// must be made predictable to know which item (and therefore which case) a test
// is looking at.
vi.mock('../../../src/composables/useDaSubstitutionQuiz', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/useDaSubstitutionQuiz')>()
  return {
    ...actual,
    sampleSubstitutionItems: (count: number, f: Parameters<typeof actual.filterSubstitutionItems>[0] = {}) =>
      actual.filterSubstitutionItems(f).slice(0, count),
  }
})
import { filterSubstitutionItems } from '../../../src/composables/useDaSubstitutionQuiz'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds/case/run', name: 'dacompounds-case-run', component: { template: '<div />' } },
      { path: '/da-compounds/case', name: 'dacompounds-case', component: { template: '<div />' } },
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-case-run', query })
  const wrapper = mount(CaseRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

function caseName(c: CollocationCase): string {
  return c === 'accusative' ? 'Akkusativ' : 'Dativ'
}

/** The opposite label to the collocation's own case — a guaranteed-wrong pick. */
function wrongLabelFor(c: CollocationCase): string {
  return caseName(c === 'accusative' ? 'dative' : 'accusative')
}

describe('CaseRunner — smoke tests', () => {
  it('renders the quiz stage', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(wrapper.find('.case-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders both case buttons (Akkusativ and Dativ)', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('button')
    expect(buttons.find(b => b.text() === 'Akkusativ')).toBeTruthy()
    expect(buttons.find(b => b.text() === 'Dativ')).toBeTruthy()
    wrapper.unmount()
  })

  it('reveals feedback after clicking the wrong case', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1', roles: 'verb' })
    const firstItem = filterSubstitutionItems({ levels: ['B1'], roles: ['verb'] })[0]
    const btn = wrapper.findAll('button').find(b => b.text() === wrongLabelFor(firstItem.colloc.case))
    await btn!.trigger('click')
    expect(wrapper.find('.case-feedback-bad').exists()).toBe(true)
    wrapper.unmount()
  })

  it('reveals success feedback after clicking the correct case', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1', roles: 'verb' })
    const firstItem = filterSubstitutionItems({ levels: ['B1'], roles: ['verb'] })[0]
    const btn = wrapper.findAll('button').find(b => b.text() === caseName(firstItem.colloc.case))
    await btn!.trigger('click')
    expect(wrapper.find('.case-feedback-ok').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('CaseRunner — history recording (ADR-0010)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  async function completeOneCardWrong(wrapper: VueWrapper, wrongLabel: string) {
    const btn = wrapper.findAll('button').find(b => b.text() === wrongLabel)
    await btn!.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes, with the right type and meta', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1', roles: 'verb' })
    const firstItem = filterSubstitutionItems({ levels: ['B1'], roles: ['verb'] })[0]
    await completeOneCardWrong(wrapper, wrongLabelFor(firstItem.colloc.case))
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dac-case',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({ levels: ['B1'], roles: ['verb'] }),
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    const firstItem = filterSubstitutionItems({})[0]
    const wrongLabel = wrongLabelFor(firstItem.colloc.case)
    await completeOneCardWrong(wrapper, wrongLabel)
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')
    // Retry rebuilds the quiz from a single-item wrongItems array — shuffling one
    // item is a no-op regardless of RNG, so the same wrong item/case comes back.
    await completeOneCardWrong(wrapper, wrongLabel)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
