import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import PassiveRunner from '../../../src/modules/dative/PassiveRunner.vue'
import { PASSIVE_ITEMS } from '../../../src/data/dativeConsequences'

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
      { path: '/dative/passive/run', name: 'dative-passive-run', component: { template: '<div />' } },
      { path: '/dative/passive', name: 'dative-passive', component: { template: '<div />' } },
      { path: '/dative', name: 'dative', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string>) {
  const router = makeRouter()
  await router.push({ name: 'dative-passive-run', query })
  const wrapper = mount(PassiveRunner, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

const QUERY = { count: '1', levels: 'A2,B1,B2,C1', kinds: 'transform,agreement,es' }
// Math.random pinned to 0 → identity-preserving shuffle → the sampled item is
// the bank's first entry under these filters (pv-helfen, a transform card
// with two full-sentence options).
const FIRST = PASSIVE_ITEMS[0]
const WRONG = FIRST.options.find(o => !FIRST.answers.includes(o))!

// The four accusative-contrast agreement items (spec): they exist so wird/
// werden is a genuine decision, not a reflex — the setup/runner must never
// filter them out via any kind-level toggle.
const ACCUSATIVE_CONTRAST_VERBS = ['fragen', 'abholen', 'einladen', 'kontrollieren']
const AGREEMENT_ITEMS = PASSIVE_ITEMS.filter(i => i.kind === 'agreement')
const CONTRAST_ITEMS = AGREEMENT_ITEMS.filter(i => ACCUSATIVE_CONTRAST_VERBS.includes(i.verb))

describe('PassiveRunner', () => {
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

  it('renders the transform prompt with its question suffix and exactly two choices', async () => {
    const { wrapper } = await mountRunner(QUERY)
    expect(wrapper.text()).toContain('Wie lautet das Passiv?')
    expect(wrapper.findAll('.choice').length).toBe(2)
    wrapper.unmount()
  })

  it('wrong pick reveals the correct impersonal passive and its explanation', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const btn = wrapper.findAll('.choice').find(b => b.find('.c-label').text() === WRONG)!
    await btn.trigger('click')
    expect(wrapper.find('.drill-feedback').exists()).toBe(true)
    expect(wrapper.text()).toContain(FIRST.answers[0])
    expect(wrapper.text()).toContain(FIRST.explanation)
    wrapper.unmount()
  })

  it('never renders "Ich werde geholfen" as an option or as the revealed correct answer', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const labels = wrapper.findAll('.c-label').map(l => l.text())
    expect(labels.some(l => /Ich werde geholfen/i.test(l))).toBe(false)
    const btn = wrapper.findAll('.choice').find(b => b.find('.c-label').text() === WRONG)!
    await btn.trigger('click')
    expect(wrapper.text()).not.toContain('Ich werde geholfen')
    wrapper.unmount()
  })

  it('records one dat-passive Run and NEVER touches the ledger (band-tracked only)', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({ type: 'dat-passive', count: 1 }))
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

  it('agreement round shows a ___ gap and reveals the filled sentence in feedback', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'A2,B1,B2,C1', kinds: 'agreement' })
    expect(wrapper.find('.drill-gap').exists()).toBe(true)
    const first = AGREEMENT_ITEMS[0]
    const wrong = first.options.find(o => !first.answers.includes(o))!
    const btn = wrapper.findAll('.choice').find(b => b.find('.c-label').text() === wrong)!
    await btn.trigger('click')
    expect(wrapper.text()).toContain(first.prompt.replace('___', first.answers[0]))
    wrapper.unmount()
  })

  it('keeps the four accusative contrast items (fragen, abholen, einladen, kontrollieren) reachable within the agreement kind', async () => {
    // The setup only ever filters by `kind` (transform/agreement/es), never by
    // verbCase — so selecting "agreement" can never exclude just the
    // accusative-contrast cards. Prove it end-to-end: sampling every
    // agreement item (kinds:'agreement', full count, Math.random pinned to 0
    // → identity-preserving shuffle) must surface all four contrast prompts.
    expect(CONTRAST_ITEMS.length).toBe(4)
    const { wrapper } = await mountRunner({
      count: String(AGREEMENT_ITEMS.length), levels: 'A2,B1,B2,C1', kinds: 'agreement',
    })
    const seenPrompts: string[] = []
    for (let i = 0; i < AGREEMENT_ITEMS.length; i++) {
      seenPrompts.push(wrapper.find('.drill-sentence').text())
      await wrapper.findAll('.choice')[0].trigger('click')
      const advance = wrapper.findAll('button').find(b => b.text().startsWith('Next') || b.text().startsWith('Finish'))!
      await advance.trigger('click')
    }
    for (const item of CONTRAST_ITEMS) {
      expect(seenPrompts).toContain(item.prompt)
      expect(item.answers).toEqual(['werden'])
    }
    wrapper.unmount()
  })
})
