import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import ExperiencerRunner from '../../../src/modules/dative/ExperiencerRunner.vue'
import { EXPERIENCER_PRODUCTION_ITEMS, EXPERIENCER_VERBS } from '../../../src/data/dativeExperiencer'

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
      { path: '/dative/experiencer/run', name: 'dative-experiencer-run', component: { template: '<div />' } },
      { path: '/dative/experiencer', name: 'dative-experiencer', component: { template: '<div />' } },
      { path: '/dative', name: 'dative', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string>) {
  const router = makeRouter()
  await router.push({ name: 'dative-experiencer-run', query })
  const wrapper = mount(ExperiencerRunner, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

const QUERY = { count: '1', levels: 'A2,B1,B2,C1', verbs: EXPERIENCER_VERBS.join(',') }
// Math.random pinned to 0 → identity-preserving shuffle → the sampled item is
// the bank's first entry under these filters.
const FIRST = EXPERIENCER_PRODUCTION_ITEMS[0]

describe('ExperiencerRunner', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.mocked(saveQuizRun).mockClear()
    vi.mocked(bumpDativeLedger).mockClear()
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => { randomSpy.mockRestore() })

  async function completeOneCardWrong(wrapper: VueWrapper) {
    const input = wrapper.find('input.type-input')
    await input.setValue('falsch')
    await input.trigger('keydown.enter')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))!
    await finish.trigger('click')
  }

  it('renders the English prompt and a text input', async () => {
    const { wrapper } = await mountRunner(QUERY)
    expect(wrapper.text()).toContain(FIRST.promptEn)
    expect(wrapper.find('input.type-input').exists()).toBe(true)
    wrapper.unmount()
  })

  it('wrong typed answer reveals feedback with the correct answer', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const input = wrapper.find('input.type-input')
    await input.setValue('falsch')
    await input.trigger('keydown.enter')
    expect(wrapper.find('.drill-feedback').exists()).toBe(true)
    expect(wrapper.text()).toContain(FIRST.answers[0])
    wrapper.unmount()
  })

  it('accepts the alternative answer, case-folded, with trailing punctuation', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const input = wrapper.find('input.type-input')
    await input.setValue(`${FIRST.answers[1].toLowerCase()}.`)
    await input.trigger('keydown.enter')
    expect(wrapper.text()).toContain('Richtig')
    wrapper.unmount()
  })

  it('records one dat-experiencer Run and bumps the ledger once, keyed by the verb', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({ type: 'dat-experiencer', count: 1 }))
    expect(bumpDativeLedger).toHaveBeenCalledTimes(1)
    expect(bumpDativeLedger).toHaveBeenCalledWith(FIRST.verb, false, expect.any(Number))
    wrapper.unmount()
  })

  // Regression: pressing Enter on the focused advance button fired the NEXT
  // card's submit on the *keyup* of that same physical keystroke. The advance
  // runs on keydown (native button activation) and re-focuses the input, so a
  // keyup-bound handler landed on a fresh, empty card and graded it blank.
  it('a stray Enter keyup on the input never submits the card', async () => {
    const { wrapper } = await mountRunner({ ...QUERY, count: '2' })
    const input = wrapper.find('input.type-input')

    // Card 1 is untouched and empty. A bare keyup must not grade it.
    await input.trigger('keyup', { key: 'Enter' })
    expect(wrapper.text()).not.toContain('Richtig')
    expect(wrapper.text()).not.toContain('Korrekt')
    expect(wrapper.find('input.type-input').attributes('readonly')).toBeUndefined()
    wrapper.unmount()
  })

  it('Enter keydown submits, and the keyup of that same keystroke does not advance-and-resubmit', async () => {
    const { wrapper } = await mountRunner({ ...QUERY, count: '2' })
    const input = wrapper.find('input.type-input')

    await input.setValue('irgendein Satz')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    // Graded: the card is now read-only and showing feedback.
    expect(wrapper.find('input.type-input').attributes('readonly')).toBeDefined()

    // The keyup half of the SAME keystroke must be inert.
    await input.trigger('keyup', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.find('input.type-input').attributes('readonly')).toBeDefined()
    wrapper.unmount()
  })

  it('Enter on an empty input is inert; the Submit button still grades a blank deliberately', async () => {
    const { wrapper } = await mountRunner({ ...QUERY, count: '2' })
    const input = wrapper.find('input.type-input')

    // Enter with nothing typed must not burn the card.
    await input.trigger('keydown.enter')
    await flushPromises()
    expect(wrapper.find('input.type-input').attributes('readonly')).toBeUndefined()
    expect(wrapper.find('.drill-feedback').exists()).toBe(false)

    // Whitespace only is still empty.
    await input.setValue('   ')
    await input.trigger('keydown.enter')
    await flushPromises()
    expect(wrapper.find('input.type-input').attributes('readonly')).toBeUndefined()

    // The explicit button remains the deliberate "I don't know" path.
    const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))!
    await submitBtn.trigger('click')
    await flushPromises()
    expect(wrapper.find('.drill-feedback').exists()).toBe(true)
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
