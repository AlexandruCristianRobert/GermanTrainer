import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import IdiomRunner from '../../../src/modules/direction-words/IdiomRunner.vue'
import { DIRECTION_IDIOMS, type DwIdiomItem } from '../../../src/data/directionIdioms'

// Stub useBreakpoint so the component doesn't call window.matchMedia in jsdom
vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

// Deterministic sampling: slice instead of shuffle (the LexicalRunner /
// HomographRunner technique). It is mocked rather than pinned via
// vi.spyOn(Math, 'random') because useDwIdiomQuiz samples through createPool
// (src/data/pool.ts), whose `rng` default is resolved ONCE when the pool is
// built at module load — a spy installed later in beforeEach never reaches it.
vi.mock('../../../src/composables/useDwIdiomQuiz', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/useDwIdiomQuiz')>()
  return {
    ...actual,
    sampleIdiomItems: vi.fn((count: number, f: Parameters<typeof actual.filterIdiomItems>[0] = {}) =>
      actual.filterIdiomItems(f).slice(0, count)),
  }
})
import { sampleIdiomItems, filterIdiomItems } from '../../../src/composables/useDwIdiomQuiz'
import { DIRECTION_LEVELS } from '../../../src/data/directionWords'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/direction-words/idioms/run', name: 'directionwords-idioms-run', component: { template: '<div />' } },
      { path: '/direction-words/idioms', name: 'directionwords-idioms', component: { template: '<div />' } },
      { path: '/direction-words', name: 'directionwords', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'directionwords-idioms-run', query })
  const wrapper = mount(IdiomRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

/** Mounts a round of exactly the given item (bypasses the sliced sampler). */
async function mountItem(item: DwIdiomItem) {
  vi.mocked(sampleIdiomItems).mockReturnValueOnce([item])
  return mountRunner(QUERY)
}

function itemById(id: string): DwIdiomItem {
  return DIRECTION_IDIOMS.find(i => i.id === id)!
}

/** The option button whose label is EXACTLY this surface ('her mit' vs 'her damit'). */
function buttonFor(wrapper: VueWrapper, surface: string) {
  return wrapper.findAll('.choice')
    .find(b => b.find('.c-label').text() === surface)!
}

// Every level that carries items (the bank has no A2 content), so the whole
// DIRECTION_IDIOMS bank is in play and the sliced sampler draws its first item.
const LEVELS = ['B1', 'B2', 'C1'] as const
const QUERY = { count: '1', levels: LEVELS.join(',') }

const SAMPLED = filterIdiomItems({ levels: [...LEVELS] })[0]!
const WRONG = SAMPLED.options.find(o => o !== SAMPLED.answer)!
const FOUR_OPTION_ITEM = DIRECTION_IDIOMS.find(i => i.options.length === 4)!

describe('IdiomRunner — the card', () => {
  beforeEach(() => {
    vi.mocked(saveQuizRun).mockClear()
    vi.mocked(sampleIdiomItems).mockClear()
  })

  it('renders one button per authored option — three for a 3-option item', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const labels = wrapper.findAll('.choice').map(b => b.find('.c-label').text())
    expect(SAMPLED.options).toHaveLength(3)
    expect([...labels].sort()).toEqual([...SAMPLED.options].sort())
    wrapper.unmount()
  })

  it('renders four buttons for a 4-option item, keyed 1–4', async () => {
    const { wrapper } = await mountItem(FOUR_OPTION_ITEM)
    const buttons = wrapper.findAll('.choice')
    expect(buttons).toHaveLength(4)
    expect(buttons.map(b => b.find('.c-key').text())).toEqual(['1', '2', '3', '4'])
    expect(buttons.map(b => b.find('.c-label').text()).sort())
      .toEqual([...FOUR_OPTION_ITEM.options].sort())
    wrapper.unmount()
  })

  it('renders the sentence with its gap in a styled .gap span', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const sentence = wrapper.find('.im-sentence')
    expect(sentence.text()).toBe(SAMPLED.sentence)
    expect(sentence.find('.drill-gap').text()).toBe('___')
    wrapper.unmount()
  })

  it('picks with the number keys — pressing 2 answers with the second button', async () => {
    const { wrapper } = await mountRunner(QUERY)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))
    await flushPromises()
    const buttons = wrapper.findAll('.choice')
    expect(buttons[1].classes()).toContain('selected')
    expect(wrapper.find('.drill-feedback').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows an error state when no items match the filters', async () => {
    vi.mocked(sampleIdiomItems).mockReturnValueOnce([])
    const { wrapper } = await mountRunner(QUERY)
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(saveQuizRun).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe('IdiomRunner — the reveal', () => {
  beforeEach(() => { vi.mocked(sampleIdiomItems).mockClear() })

  it('a wrong pick reveals the explanation, the filled sentence and the answer', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await buttonFor(wrapper, WRONG).trigger('click')

    expect(wrapper.find('.feedback-line.wrong').exists()).toBe(true)
    expect(wrapper.find('.im-explanation').text()).toBe(SAMPLED.explanation)
    expect(wrapper.find('.im-filled').text())
      .toBe(SAMPLED.sentence.replace('___', SAMPLED.answer))

    expect(buttonFor(wrapper, SAMPLED.answer).classes()).toContain('correct')
    expect(buttonFor(wrapper, WRONG).classes()).toContain('wrong')
    wrapper.unmount()
  })

  it('a CORRECT pick also reveals the filled sentence and the explanation', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await buttonFor(wrapper, SAMPLED.answer).trigger('click')

    expect(wrapper.find('.feedback-line.correct').exists()).toBe(true)
    expect(wrapper.find('.im-explanation').text()).toBe(SAMPLED.explanation)
    expect(wrapper.find('.im-filled').text())
      .toBe(SAMPLED.sentence.replace('___', SAMPLED.answer))
    wrapper.unmount()
  })
})

// The filled sentence is not a plain string replace: where the gap opens the
// sentence, or follows a colon, German capitalises the surface. These
// expectations are spelled out in full, so a reword of the DATA fails here
// accusing the data rather than silently changing what the reveal teaches.
describe('IdiomRunner — the filled sentence capitalises where German does', () => {
  beforeEach(() => { vi.mocked(sampleIdiomItems).mockClear() })

  async function revealFor(item: DwIdiomItem): Promise<string> {
    const { wrapper } = await mountItem(item)
    await buttonFor(wrapper, item.answer).trigger('click')
    const filled = wrapper.find('.im-filled').text()
    wrapper.unmount()
    return filled
  }

  it('capitalises a gap in the Vorfeld (id-5: the gap opens the sentence)', async () => {
    const item = itemById('id-5')
    expect(item.sentence.startsWith('___')).toBe(true) // precondition on the DATA
    expect(await revealFor(item))
      .toBe('Hin und wieder gehe ich noch in dieses kleine Kino am Hafen.')
  })

  it('capitalises after a colon (id-26: Duden capitalises the full utterance)', async () => {
    const item = itemById('id-26')
    expect(item.sentence).toContain(': ___') // precondition on the DATA
    expect(await revealFor(item))
      .toBe('Der Räuber wollte nur eines: Her mit dem Geld!')
  })

  it('leaves a mid-sentence gap lowercase (id-1)', async () => {
    const item = itemById('id-1')
    expect(await revealFor(item))
      .toBe('Wir haben lange hin und her überlegt, ob wir das Auto verkaufen sollen.')
  })

  // A Gedankenstrich that does not follow terminal punctuation starts no new
  // sentence, so the surface stays lowercase here.
  it('leaves a gap after a bare Gedankenstrich lowercase (id-27)', async () => {
    const item = itemById('id-27')
    expect(item.sentence).toContain('— ___') // precondition on the DATA
    expect(await revealFor(item))
      .toBe('Nicht lange diskutieren — her mit dem Schlüssel, sonst rufe ich den Chef!')
  })
})

describe('IdiomRunner — the summary', () => {
  beforeEach(() => {
    vi.mocked(saveQuizRun).mockClear()
    vi.mocked(sampleIdiomItems).mockClear()
  })

  // An all-correct round goes straight to the summary (no retry modal), which is
  // where the filled sentence gets repeated for review.
  it('lists every card as its filled sentence', async () => {
    const { wrapper } = await mountItem(itemById('id-5'))
    await buttonFor(wrapper, 'hin und wieder').trigger('click')
    await wrapper.findAll('button').find(b => b.text().startsWith('Finish'))!.trigger('click')
    await flushPromises()

    expect(wrapper.find('.result-score').text()).toContain('1 / 1')
    const rows = wrapper.findAll('.drill-result-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].find('.result-sentence').text())
      .toBe('Hin und wieder gehe ich noch in dieses kleine Kino am Hafen.')
    wrapper.unmount()
  })
})

describe('IdiomRunner — history recording (ADR-0010)', () => {
  beforeEach(() => {
    vi.mocked(saveQuizRun).mockClear()
    vi.mocked(sampleIdiomItems).mockClear()
  })

  async function completeOneCardWrong(wrapper: VueWrapper) {
    await buttonFor(wrapper, WRONG).trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes, with the right type, count and meta', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dw-idiom',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({ levels: [...LEVELS] }),
    }))
    wrapper.unmount()
  })

  // useQuizStats credits EVERY level in meta.levels with the whole run, so a
  // level the bank cannot serve would show up as an accuracy bucket for a drill
  // that asked nothing at that level. A2 is queryable (the chip exists, "All"
  // selects it) but DIRECTION_IDIOMS has no A2 item — it must not be recorded.
  it('records only the levels the bank carries — an "All" query books no phantom A2 bucket', async () => {
    expect(DIRECTION_LEVELS).toContain('A2')                   // A2 IS queryable…
    expect(filterIdiomItems({ levels: ['A2'] })).toEqual([])   // …and carries nothing

    const { wrapper } = await mountRunner({ count: '1', levels: DIRECTION_LEVELS.join(',') })
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    const recorded = vi.mocked(saveQuizRun).mock.calls[0][0].meta!.levels
    expect(recorded).not.toContain('A2')
    expect(recorded).toEqual([...LEVELS])
    wrapper.unmount()
  })

  // OFFLINE-drill rule: the main round records once and retry rounds are
  // practice, never a Run — the opposite of the Phase-4 AI drills
  // (SentenceRunner/AnswerRunner deliberately reset historySaved).
  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)

    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    expect(retryBtn).toBeTruthy() // the deliberately-wrong pick must have triggered the retry offer
    await retryBtn!.trigger('click')
    await completeOneCardWrong(wrapper)

    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
