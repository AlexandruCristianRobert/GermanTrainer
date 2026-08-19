import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import RelativRunner from '../../src/modules/relativ/RelativRunner.vue'
import { filterRelativItems, type RelativItem } from '../../src/data/relativItems'

vi.mock('../../src/composables/useQuizHistory', () => ({ saveQuizRun: vi.fn() }))
import { saveQuizRun } from '../../src/composables/useQuizHistory'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/relativ', name: 'relativ', component: { template: '<div />' } },
      { path: '/relativ/run', name: 'relativ-run', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string>) {
  const router = makeRouter()
  await router.push({ name: 'relativ-run', query })
  const wrapper = mount(RelativRunner, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

// Math.random pinned to 0 → identity-preserving shuffle for BOTH the item
// sample and each card's option order, so card 1 is the bank's first
// B1/standard entry and the option labels stay in bank order.
const QUERY = { count: '1', levels: 'B1', kinds: 'standard' }
const ITEMS = filterRelativItems({ levels: ['B1'], kinds: ['standard'] })
const FIRST = ITEMS[0]
const SECOND = ITEMS[1]

function wrongFor(i: RelativItem): string {
  return i.options.find(o => !i.answers.includes(o))!
}

function pick(w: VueWrapper, label: string) {
  const btn = w.findAll('.choice').find(b => b.find('.c-label').text() === label)
  if (!btn) throw new Error(`no option button labelled "${label}"`)
  return btn.trigger('click')
}

describe('RelativRunner', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.mocked(saveQuizRun).mockClear()
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => { randomSpy.mockRestore() })

  it('has at least two B1/standard items to drive the fixtures', () => {
    expect(ITEMS.length).toBeGreaterThanOrEqual(2)
  })

  it('renders the first card: the prompt with the gap marked and four options', async () => {
    const w = await mountRunner(QUERY)
    const sentence = w.find('.drill-sentence')
    expect(sentence.exists()).toBe(true)
    expect(sentence.text()).toContain(FIRST.prompt.split('___')[0].trim())
    expect(sentence.find('.drill-gap').exists()).toBe(true)
    expect(w.findAll('.choice').length).toBe(4)
    expect(w.findAll('.choice').map(b => b.find('.c-label').text()).sort())
      .toEqual([...FIRST.options].sort())
    w.unmount()
  })

  it('a correct pick shows the correct verdict, the full corrected sentence and the explanation', async () => {
    const w = await mountRunner(QUERY)
    await pick(w, FIRST.answers[0])
    expect(w.find('.feedback-line.correct').exists()).toBe(true)
    expect(w.find('.feedback-line').text()).toContain('Richtig')
    expect(w.text()).toContain(FIRST.prompt.replace('___', FIRST.answers[0]))
    expect(w.text()).toContain(FIRST.explanation)
    w.unmount()
  })

  it('a wrong pick shows the wrong verdict plus the correct pronoun', async () => {
    const w = await mountRunner(QUERY)
    await pick(w, wrongFor(FIRST))
    expect(w.find('.feedback-line.wrong').exists()).toBe(true)
    expect(w.find('.feedback-line').text()).toContain('Noch nicht')
    expect(w.text()).toContain(FIRST.answers[0])
    expect(w.text()).toContain(FIRST.explanation)
    w.unmount()
  })

  it('records exactly one relativ-pronomen Run with attempted/correct counts', async () => {
    const w = await mountRunner({ ...QUERY, count: '2' })
    await pick(w, FIRST.answers[0])
    await w.find('button.drill-advance').trigger('click')
    await pick(w, wrongFor(SECOND))
    await w.find('button.drill-advance').trigger('click')
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    const run = vi.mocked(saveQuizRun).mock.calls[0][0]
    expect(run.type).toBe('relativ-pronomen')
    expect(run.count).toBe(2)
    expect(run.correct).toBe(1)
    // meta records WHAT was drilled — the parsed query filters, so History can
    // say more than "a relativ round happened".
    expect(run.meta.levels).toEqual(['B1'])
    expect(run.meta.kinds).toEqual(['standard'])
    expect(w.text()).toContain('1 / 2')
    w.unmount()
  })

  it('moves focus to the advance button after a pick, back to the card on the next one', async () => {
    const w = await mountRunner({ ...QUERY, count: '2' })
    await nextTick()
    expect(document.activeElement).toBe(w.find('.drill-stage').element)
    await pick(w, FIRST.answers[0])
    await nextTick()
    // Focus on the advance button means plain Enter activates it natively —
    // the 1.21.02 keyboard convention, no extra key handler needed.
    expect(document.activeElement).toBe(w.find('button.drill-advance').element)
    await w.find('button.drill-advance').trigger('click')
    await nextTick()
    expect(document.activeElement).toBe(w.find('.drill-stage').element)
    w.unmount()
  })

  it('the digit keys advertised on the buttons pick that option', async () => {
    const w = await mountRunner(QUERY)
    // Options are in bank order (identity shuffle), so find where the answer sits.
    const at = FIRST.options.indexOf(FIRST.answers[0])
    window.dispatchEvent(new KeyboardEvent('keydown', { key: String(at + 1) }))
    await nextTick()
    expect(w.find('.feedback-line.correct').exists()).toBe(true)
    w.unmount()
  })

  it('shows an error and no card when the filters match nothing', async () => {
    const w = await mountRunner({ count: '5', levels: 'B1', kinds: 'nonesuch' })
    expect(w.find('.alert-danger').exists()).toBe(true)
    expect(w.find('.choice').exists()).toBe(false)
    expect(saveQuizRun).not.toHaveBeenCalled()
    w.unmount()
  })
})
