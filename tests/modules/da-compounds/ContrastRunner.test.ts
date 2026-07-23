import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import ContrastRunner from '../../../src/modules/da-compounds/ContrastRunner.vue'

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
vi.mock('../../../src/composables/useDaContrastQuiz', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/useDaContrastQuiz')>()
  return {
    ...actual,
    sampleContrastItems: vi.fn((count: number, f: Parameters<typeof actual.filterContrastItems>[0] = {}) =>
      actual.filterContrastItems(f).slice(0, count)),
  }
})
import { sampleContrastItems, filterContrastItems } from '../../../src/composables/useDaContrastQuiz'
import { CONTRAST_SETS } from '../../../src/data/daContrast'

const setByKey = new Map(CONTRAST_SETS.map(s => [s.key, s]))

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds/contrast/run', name: 'dacompounds-contrast-run', component: { template: '<div />' } },
      { path: '/da-compounds/contrast', name: 'dacompounds-contrast', component: { template: '<div />' } },
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-contrast-run', query })
  const wrapper = mount(ContrastRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('ContrastRunner — smoke tests', () => {
  beforeEach(() => { vi.mocked(sampleContrastItems).mockClear() })

  it('renders the quiz stage', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(wrapper.find('.sub-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders one option button per the item\'s set option (2-3)', async () => {
    const first = filterContrastItems({})[0]
    const set = setByKey.get(first.contrastKey)!
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    expect(buttons).toHaveLength(set.options.length)
    for (const opt of set.options) {
      expect(buttons.some(b => b.text().includes(opt.preposition))).toBe(true)
    }
    wrapper.unmount()
  })

  it('shows success feedback when the correct preposition is picked', async () => {
    const first = filterContrastItems({})[0]
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const correctBtn = buttons.find(b => b.text().includes(first.correct))!
    await correctBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows wrong feedback when an incorrect preposition is picked', async () => {
    const first = filterContrastItems({})[0]
    const set = setByKey.get(first.contrastKey)!
    const wrongOpt = set.options.find(o => o.preposition !== first.correct)!
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const wrongBtn = buttons.find(b => b.text().includes(wrongOpt.preposition))!
    await wrongBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-bad').exists()).toBe(true)
    wrapper.unmount()
  })

  it('reveals EVERY option\'s sense line after answering, right or wrong', async () => {
    const first = filterContrastItems({})[0]
    const set = setByKey.get(first.contrastKey)!
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const wrongOpt = set.options.find(o => o.preposition !== first.correct)!
    const wrongBtn = buttons.find(b => b.text().includes(wrongOpt.preposition))!
    await wrongBtn.trigger('click')
    const revealText = wrapper.find('.sub-reveal').text()
    for (const opt of set.options) {
      expect(revealText).toContain(opt.sense)
    }
    wrapper.unmount()
  })

  it('reveals every sense line even on a CORRECT pick — the reveal is never conditional on wrongness', async () => {
    const first = filterContrastItems({})[0]
    const set = setByKey.get(first.contrastKey)!
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const correctBtn = buttons.find(b => b.text().includes(first.correct))!
    await correctBtn.trigger('click')
    const revealText = wrapper.find('.sub-reveal').text()
    for (const opt of set.options) {
      expect(revealText).toContain(opt.sense)
    }
    wrapper.unmount()
  })

  it('highlights the correct option after answering wrong', async () => {
    const first = filterContrastItems({})[0]
    const set = setByKey.get(first.contrastKey)!
    const wrongOpt = set.options.find(o => o.preposition !== first.correct)!
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    const wrongBtn = buttons.find(b => b.text().includes(wrongOpt.preposition))!
    await wrongBtn.trigger('click')
    const correctBtn = wrapper.findAll('.sub-choice').find(b => b.text().includes(first.correct))!
    expect(correctBtn.classes()).toContain('correct')
    expect(wrongBtn.classes()).toContain('wrong')
    wrapper.unmount()
  })

  it('shows an error state when no items match the filters (no C1 items exist)', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'C1' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('ContrastRunner — history recording (ADR-0010)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  async function completeOneCard(wrapper: VueWrapper, correct: boolean) {
    const first = filterContrastItems({ levels: ['B1'] })[0]
    const set = setByKey.get(first.contrastKey)!
    const buttons = wrapper.findAll('.sub-choice')
    const btn = correct
      ? buttons.find(b => b.text().includes(first.correct))!
      : buttons.find(b => b.text().includes(set.options.find(o => o.preposition !== first.correct)!.preposition))!
    await btn.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes, with the right type and meta', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1' })
    await completeOneCard(wrapper, false)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dac-contrast',
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
    const { wrapper } = await mountRunner({ count: '1', levels: 'C1' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(saveQuizRun).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
