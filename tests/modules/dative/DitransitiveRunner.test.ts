import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DitransitiveRunner from '../../../src/modules/dative/DitransitiveRunner.vue'
import { DITRANSITIVE_ITEMS } from '../../../src/data/dativeDitransitive'

vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))
vi.mock('../../../src/composables/useQuizHistory', () => ({ saveQuizRun: vi.fn() }))
vi.mock('../../../src/composables/useDativeLedger', () => ({ bumpDativeLedger: vi.fn() }))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'
import { bumpDativeLedger } from '../../../src/composables/useDativeLedger'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dative/ditrans/run', name: 'dative-ditrans-run', component: { template: '<div />' } },
      { path: '/dative/ditrans', name: 'dative-ditrans', component: { template: '<div />' } },
      { path: '/dative', name: 'dative', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string>) {
  const router = makeRouter()
  await router.push({ name: 'dative-ditrans-run', query })
  const wrapper = mount(DitransitiveRunner, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

const QUERY = { count: '1', levels: 'A2,B1,B2,C1', roles: 'dative,accusative' }
// Math.random pinned to 0 → identity-preserving shuffle → the sampled item is
// the bank's first entry under these filters.
const FIRST = DITRANSITIVE_ITEMS[0]
const WRONG = FIRST.options.find(o => !FIRST.answers.includes(o))!

describe('DitransitiveRunner', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.mocked(saveQuizRun).mockClear()
    vi.mocked(bumpDativeLedger).mockClear()
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => { randomSpy.mockRestore() })

  async function completeOneCardWrong(wrapper: VueWrapper) {
    const btn = wrapper.findAll('.choice').find(b => b.find('.c-label').text() === WRONG)!
    await btn.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))!
    await finish.trigger('click')
  }

  it('renders the prompt and exactly two choice buttons', async () => {
    const { wrapper } = await mountRunner(QUERY)
    expect(wrapper.findAll('.choice').length).toBe(2)
    wrapper.unmount()
  })

  it('wrong pick reveals feedback with the correct answer and the explanation', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const btn = wrapper.findAll('.choice').find(b => b.find('.c-label').text() === WRONG)!
    await btn.trigger('click')
    expect(wrapper.find('.drill-feedback').exists()).toBe(true)
    expect(wrapper.text()).toContain(FIRST.answers[0])
    expect(wrapper.text()).toContain(FIRST.explanation)
    wrapper.unmount()
  })

  it('records one dat-ditrans Run and never touches the ledger — ditransitives are rule-driven, not in gt:dativeLedger', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({ type: 'dat-ditrans', count: 1 }))
    expect(bumpDativeLedger).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('does not record the retry round, and still never touches the ledger (ADR-0010)', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    const retry = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))!
    await retry.trigger('click')
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(bumpDativeLedger).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
