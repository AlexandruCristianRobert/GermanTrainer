import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import KorrelatRunner from '../../../src/modules/da-compounds/KorrelatRunner.vue'

// Stub useBreakpoint so the component doesn't call window.matchMedia in jsdom
vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

// Deterministic sampling: slice instead of shuffle (same technique as
// DialogueRunner.test.ts), so tests can know exactly which item a
// `count`+filter combination will draw.
vi.mock('../../../src/composables/useDaKorrelatQuiz', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/useDaKorrelatQuiz')>()
  return {
    ...actual,
    sampleKorrelatItems: vi.fn((count: number, f: Parameters<typeof actual.filterKorrelatItems>[0] = {}) =>
      actual.filterKorrelatItems(f).slice(0, count)),
  }
})
import { sampleKorrelatItems, filterKorrelatItems, KEIN_KORRELAT } from '../../../src/composables/useDaKorrelatQuiz'
import { korrelatAnswer } from '../../../src/data/daKorrelat'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds/korrelat/run', name: 'dacompounds-korrelat-run', component: { template: '<div />' } },
      { path: '/da-compounds/korrelat', name: 'dacompounds-korrelat', component: { template: '<div />' } },
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-korrelat-run', query })
  const wrapper = mount(KorrelatRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

function firstMatching(kind: 'obligatory' | 'optional' | 'excluded') {
  return filterKorrelatItems({ kinds: [kind] })[0]
}

describe('KorrelatRunner — smoke tests', () => {
  beforeEach(() => { vi.mocked(sampleKorrelatItems).mockClear() })

  it('renders the quiz stage', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(wrapper.find('.sub-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders exactly 4 option buttons', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    expect(buttons).toHaveLength(4)
    wrapper.unmount()
  })

  it('one option is always KEIN_KORRELAT', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    const buttons = wrapper.findAll('.sub-choice')
    expect(buttons.some(b => b.text().includes(KEIN_KORRELAT))).toBe(true)
    wrapper.unmount()
  })

  it('reveals feedback after clicking an option, always showing the explanation', async () => {
    const { wrapper } = await mountRunner({ count: '1', kinds: 'obligatory' })
    const first = firstMatching('obligatory')
    const buttons = wrapper.findAll('.sub-choice')
    await buttons[0].trigger('click')
    expect(wrapper.find('.sub-feedback').exists()).toBe(true)
    const reveal = wrapper.find('.sub-reveal')
    expect(reveal.exists()).toBe(true)
    expect(reveal.text()).toContain(first.explanation)
    wrapper.unmount()
  })

  it('shows the explanation even on a CORRECT pick — the reveal is never conditional on wrongness', async () => {
    const { wrapper } = await mountRunner({ count: '1', kinds: 'obligatory' })
    const first = firstMatching('obligatory')
    const answer = korrelatAnswer(first)!
    const buttons = wrapper.findAll('.sub-choice')
    const answerBtn = buttons.find(b => b.text().includes(answer))!
    await answerBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    const reveal = wrapper.find('.sub-reveal')
    expect(reveal.exists()).toBe(true)
    expect(reveal.text()).toContain(first.explanation)
    wrapper.unmount()
  })

  it('shows success feedback when the correct compound is picked (obligatory)', async () => {
    const { wrapper } = await mountRunner({ count: '1', kinds: 'obligatory' })
    const first = firstMatching('obligatory')
    const answer = korrelatAnswer(first)!
    const buttons = wrapper.findAll('.sub-choice')
    const answerBtn = buttons.find(b => b.text().includes(answer))!
    await answerBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows wrong feedback when KEIN_KORRELAT is picked for an obligatory item', async () => {
    const { wrapper } = await mountRunner({ count: '1', kinds: 'obligatory' })
    const buttons = wrapper.findAll('.sub-choice')
    const keinBtn = buttons.find(b => b.text().includes(KEIN_KORRELAT))!
    await keinBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-bad').exists()).toBe(true)
    wrapper.unmount()
  })

  it('accepts KEIN_KORRELAT as correct for an optional item', async () => {
    const { wrapper } = await mountRunner({ count: '1', kinds: 'optional' })
    const buttons = wrapper.findAll('.sub-choice')
    const keinBtn = buttons.find(b => b.text().includes(KEIN_KORRELAT))!
    await keinBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    // teaching note for the dual-accept rule
    expect(wrapper.text()).toContain('fakultatives Korrelat')
    wrapper.unmount()
  })

  it('accepts the compound as correct for an optional item too', async () => {
    const { wrapper } = await mountRunner({ count: '1', kinds: 'optional' })
    const first = firstMatching('optional')
    const answer = korrelatAnswer(first)!
    const buttons = wrapper.findAll('.sub-choice')
    const answerBtn = buttons.find(b => b.text().includes(answer))!
    await answerBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    wrapper.unmount()
  })

  it('accepts only KEIN_KORRELAT for an excluded item', async () => {
    const { wrapper } = await mountRunner({ count: '1', kinds: 'excluded' })
    const buttons = wrapper.findAll('.sub-choice')
    const keinBtn = buttons.find(b => b.text().includes(KEIN_KORRELAT))!
    await keinBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    wrapper.unmount()
  })

  it('rejects any compound pick for an excluded item', async () => {
    const { wrapper } = await mountRunner({ count: '1', kinds: 'excluded' })
    const buttons = wrapper.findAll('.sub-choice')
    const compoundBtn = buttons.find(b => !b.text().includes(KEIN_KORRELAT))!
    await compoundBtn.trigger('click')
    expect(wrapper.find('.sub-feedback-bad').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows an error state when no items match the filters (no C1 excluded items exist)', async () => {
    const { wrapper } = await mountRunner({ count: '1', kinds: 'excluded', levels: 'C1' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('KorrelatRunner — history recording (ADR-0010)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  async function completeOneCard(wrapper: VueWrapper, useKeinKorrelat: boolean) {
    const buttons = wrapper.findAll('.sub-choice')
    const btn = useKeinKorrelat
      ? buttons.find(b => b.text().includes(KEIN_KORRELAT))!
      : buttons.find(b => !b.text().includes(KEIN_KORRELAT))!
    await btn.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes, with the right type and meta', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1', kinds: 'obligatory' })
    await completeOneCard(wrapper, true) // KEIN_KORRELAT is always wrong for obligatory
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dac-korrelat',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({
        levels: ['B1'],
        kinds: ['obligatory'],
      }),
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner({ count: '1', kinds: 'obligatory' })
    await completeOneCard(wrapper, true)
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')
    await completeOneCard(wrapper, true)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('does not record an empty/never-started run', async () => {
    const { wrapper } = await mountRunner({ count: '1', kinds: 'excluded', levels: 'C1' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(saveQuizRun).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
