import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import RegisterRunner from '../../../src/modules/direction-words/RegisterRunner.vue'
import { DIRECTION_REGISTER } from '../../../src/data/directionRegister'
import { DW_REGISTER_OPTIONS } from '../../../src/composables/useDirectionRegisterQuiz'

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
      { path: '/direction-words/register/run', name: 'directionwords-register-run', component: { template: '<div />' } },
      { path: '/direction-words/register', name: 'directionwords-register', component: { template: '<div />' } },
      { path: '/direction-words', name: 'directionwords', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'directionwords-register-run', query })
  const wrapper = mount(RegisterRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

// All levels and all pairs — so the full DIRECTION_REGISTER bank is in play.
const QUERY = { count: '1', levels: 'A2,B1,B2,C1', pairs: 'ein,aus,auf,unter,über,ab' }

// With levels/pairs covering every item (and pair-independent items always
// matching regardless of the pairs filter — see matchesPair in
// useDirectionRegisterQuiz.ts), Math.random pinned to 0 makes the
// identity-preserving Fisher-Yates in shuffle() (data/pool.ts) a no-op — so a
// count:1 round always draws DIRECTION_REGISTER[0] ('dwr-1', verdict
// 'standard'). Expected strings are derived from the item's own data (not
// hardcoded) so this survives edits to directionRegister.ts.
const SAMPLED = DIRECTION_REGISTER[0]!
const WRONG_LABEL = DW_REGISTER_OPTIONS.find(o => o.verdict !== SAMPLED.verdict)!.label

describe('RegisterRunner — verdict buttons', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => { randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0) })
  afterEach(() => randomSpy.mockRestore())

  it('renders exactly three verdict buttons with the fixed labels, in order', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const buttons = wrapper.findAll('.sub-choice')
    expect(buttons).toHaveLength(3)
    expect(buttons.map(b => b.text())).toEqual(
      DW_REGISTER_OPTIONS.map(o => expect.stringContaining(o.label))
    )
    wrapper.unmount()
  })
})

describe('RegisterRunner — reveal (always shown, win or lose)', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => { randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0) })
  afterEach(() => randomSpy.mockRestore())

  it('reveals the explanation after a wrong pick', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const buttons = wrapper.findAll('.sub-choice')
    const wrongBtn = buttons.find(b => b.text().includes(WRONG_LABEL))!
    await wrongBtn.trigger('click')
    const reveal = wrapper.find('.sub-reveal')
    expect(reveal.exists()).toBe(true)
    expect(reveal.text()).toContain(SAMPLED.explanation.split(' / ')[0].slice(0, 20))
    wrapper.unmount()
  })
})

describe('RegisterRunner — history recording (ADR-0010)', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.mocked(saveQuizRun).mockClear()
    // Pinned for the whole test (mount + any retry): the identity-preserving
    // shuffle this produces always samples DIRECTION_REGISTER[0], whose
    // verdict is 'standard' — so picking any other option is a deterministic,
    // guaranteed-wrong pick, including after retry rebuilds the quiz with a
    // fresh (single-item, no-op) shuffle.
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => randomSpy.mockRestore())

  async function completeOneCardWrong(wrapper: VueWrapper) {
    const buttons = wrapper.findAll('.sub-choice')
    const wrongBtn = buttons.find(b => b.text().includes(WRONG_LABEL))!
    await wrongBtn.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes, with the right type and count', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dw-register',
      count: 1,
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)

    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    expect(retryBtn).toBeTruthy() // the deliberately-wrong pick above must have triggered the retry offer
    await retryBtn!.trigger('click')
    await completeOneCardWrong(wrapper)

    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
