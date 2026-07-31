import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import CompoundRunner from '../../../src/modules/direction-words/CompoundRunner.vue'
import { COMPOUND_ITEMS } from '../../../src/data/directionItems'
import { ADVERB_PAIRS } from '../../../src/data/directionWords'

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

// With `levels`/`pairs` covering every item and Math.random pinned to 0, the
// identity-preserving Fisher-Yates in shuffle() (data/pool.ts) leaves the
// filtered array in its original order and samples items[0] — so a count:1
// round with PICK_QUERY/TYPE_QUERY always draws COMPOUND_ITEMS[0]
// ('cp-herein-klopfen'). Its pair ('ein') has an r-form ('rein'), so it also
// exercises the revealNote line. Expected strings are derived from the item's
// own data (not hardcoded) so this survives edits to directionItems.ts.
const SAMPLED = COMPOUND_ITEMS[0]!
const SAMPLED_PAIR = ADVERB_PAIRS.find(p => p.element === SAMPLED.pair)!
const SAMPLED_ANSWER = SAMPLED.answers[0]!
const SAMPLED_FILLED = SAMPLED.sentence.replace('___', SAMPLED_ANSWER)
const SAMPLED_NOTE = SAMPLED_PAIR.rForm ? `Gesprochene Kurzform: ${SAMPLED_PAIR.rForm}` : null

describe('CompoundRunner — pick mode', () => {
  it('renders a scene diagram and exactly 4 option buttons', async () => {
    const { wrapper } = await mountRunner(PICK_QUERY)
    expect(wrapper.find('.scene-diagram').exists()).toBe(true)
    expect(wrapper.findAll('.choice').length).toBe(4)
    wrapper.unmount()
  })
})

describe('CompoundRunner — pick mode history recording (ADR-0010)', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.mocked(saveQuizRun).mockClear()
    // Pinned for the whole test (mount + any retry): the identity-preserving
    // shuffle this produces always samples COMPOUND_ITEMS[0], whose answer is
    // 'herein' — so any option labeled differently is a deterministic,
    // guaranteed-wrong pick, including after retry rebuilds the quiz with a
    // fresh (single-item, no-op) shuffle.
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => { randomSpy.mockRestore() })

  async function completeOneCardWrong(wrapper: VueWrapper) {
    const buttons = wrapper.findAll('.choice')
    const wrongBtn = buttons.find(b => b.find('.c-label').text() !== SAMPLED_ANSWER)
    await wrongBtn!.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes', async () => {
    const { wrapper } = await mountRunner(PICK_QUERY)
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dw-compound',
      count: 1,
      meta: expect.objectContaining({ mode: 'pick' }),
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner(PICK_QUERY)
    await completeOneCardWrong(wrapper)

    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    expect(retryBtn).toBeTruthy() // the deliberately-wrong pick above must have triggered the retry offer
    await retryBtn!.trigger('click')
    await completeOneCardWrong(wrapper)

    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})

describe('CompoundRunner — reveal content (always shown, win or lose)', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => { randomSpy.mockRestore() })

  it('shows the filled sentence, translation, and r-form note after a wrong pick', async () => {
    const { wrapper } = await mountRunner(PICK_QUERY)
    const buttons = wrapper.findAll('.choice')
    const wrongBtn = buttons.find(b => b.find('.c-label').text() !== SAMPLED_ANSWER)
    await wrongBtn!.trigger('click')

    const feedback = wrapper.find('.drill-feedback')
    expect(feedback.exists()).toBe(true)
    expect(feedback.text()).toContain(SAMPLED_FILLED)
    expect(feedback.text()).toContain(SAMPLED.translation)
    if (SAMPLED_NOTE) expect(feedback.text()).toContain(SAMPLED_NOTE)
    wrapper.unmount()
  })

  it('shows the filled sentence, translation, and r-form note after a correct pick', async () => {
    const { wrapper } = await mountRunner(PICK_QUERY)
    const buttons = wrapper.findAll('.choice')
    const correctBtn = buttons.find(b => b.find('.c-label').text() === SAMPLED_ANSWER)
    await correctBtn!.trigger('click')

    const feedback = wrapper.find('.drill-feedback')
    expect(feedback.exists()).toBe(true)
    expect(feedback.text()).toContain(SAMPLED_FILLED)
    expect(feedback.text()).toContain(SAMPLED.translation)
    if (SAMPLED_NOTE) expect(feedback.text()).toContain(SAMPLED_NOTE)
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
    expect(wrapper.findAll('.choice').length).toBe(0)
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
