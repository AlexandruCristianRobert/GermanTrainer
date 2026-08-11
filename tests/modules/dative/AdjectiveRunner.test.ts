import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AdjectiveRunner from '../../../src/modules/dative/AdjectiveRunner.vue'
import { DATIVE_ADJECTIVE_ITEMS, DATIVE_ADJECTIVE_KEYS } from '../../../src/data/dativeAdjectives'

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
      { path: '/dative/adjectives/run', name: 'dative-adjectives-run', component: { template: '<div />' } },
      { path: '/dative/adjectives', name: 'dative-adjectives', component: { template: '<div />' } },
      { path: '/dative', name: 'dative', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string>) {
  const router = makeRouter()
  await router.push({ name: 'dative-adjectives-run', query })
  const wrapper = mount(AdjectiveRunner, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

const ALL_ADJECTIVES = DATIVE_ADJECTIVE_KEYS.join(',')
const QUERY = { count: '1', levels: 'A2,B1,B2,C1', adjectives: ALL_ADJECTIVES }
// Math.random pinned to 0 → identity-preserving shuffle (src/data/pool.ts) →
// the sampled item is the bank's first entry under these filters.
const FIRST = DATIVE_ADJECTIVE_ITEMS[0]
const WRONG = FIRST.options.find(o => !FIRST.answers.includes(o))!

describe('AdjectiveRunner', () => {
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

  it('renders whatever sentence the item bank carries verbatim (leid stays tun, never ist)', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'A2,B1,B2,C1', adjectives: 'leid' })
    // da-leid-1: 'Es tut ___ wirklich leid. (ich)' — the runner must render this
    // fixed tun-pattern as authored, never normalize it to a *ist ... leid sentence.
    expect(wrapper.text()).toContain('tut')
    expect(wrapper.text()).toMatch(/tut\s+\S+\s+wirklich leid/)
    expect(wrapper.text()).not.toMatch(/ist\s+\S+\s+(wirklich\s+)?leid/)
    wrapper.unmount()
  })

  it('marks an impersonal body-state adjective (kalt) distinctly from the sein+adjective pattern', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'A2,B1,B2,C1', adjectives: 'kalt' })
    const tag = wrapper.find('.pattern-tag')
    expect(tag.exists()).toBe(true)
    expect(tag.text()).toContain('Unpersönlich')
    expect(tag.classes()).toContain('tag-cobalt')
    wrapper.unmount()
  })

  it('marks a personal das-ist-mir-adjektiv item (wichtig) as the sein+adjective pattern', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'A2,B1,B2,C1', adjectives: 'wichtig' })
    const tag = wrapper.find('.pattern-tag')
    expect(tag.exists()).toBe(true)
    expect(tag.text()).not.toContain('Unpersönlich')
    expect(tag.classes()).toContain('tag-ochre')
    wrapper.unmount()
  })

  it('records one dat-adjective Run and bumps the ledger once, keyed by the adjective LEMMA', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({ type: 'dat-adjective', count: 1 }))
    expect(bumpDativeLedger).toHaveBeenCalledTimes(1)
    expect(bumpDativeLedger).toHaveBeenCalledWith(FIRST.adjective, false, expect.any(Number))
    wrapper.unmount()
  })

  it('does not record or re-bump the retry round (ADR-0010)', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    const retry = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))!
    await retry.trigger('click')
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(bumpDativeLedger).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
