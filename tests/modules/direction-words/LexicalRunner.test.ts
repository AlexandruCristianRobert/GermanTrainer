import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import LexicalRunner from '../../../src/modules/direction-words/LexicalRunner.vue'

// Stub useBreakpoint so the component doesn't call window.matchMedia in jsdom
vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

// Deterministic sampling: slice instead of shuffle (HomographRunner.test.ts
// technique). It is mocked rather than pinned via vi.spyOn(Math, 'random')
// because useDwLexicalQuiz samples through createPool (src/data/pool.ts),
// whose `rng` default is resolved ONCE when the pool is built at module load —
// a spy installed later in beforeEach never reaches it. (The direction-words
// drills that call shuffle() inline, e.g. RegisterRunner, resolve the default
// per call and so *are* spy-pinnable.)
vi.mock('../../../src/composables/useDwLexicalQuiz', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/useDwLexicalQuiz')>()
  return {
    ...actual,
    sampleLexicalItems: vi.fn((count: number, f: Parameters<typeof actual.filterLexicalItems>[0] = {}) =>
      actual.filterLexicalItems(f).slice(0, count)),
  }
})
import { sampleLexicalItems, filterLexicalItems } from '../../../src/composables/useDwLexicalQuiz'
import { verbEntryFor } from '../../../src/data/directionVerbs'
import { DIRECTION_LEVELS } from '../../../src/data/directionWords'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/direction-words/lexical/run', name: 'directionwords-lexical-run', component: { template: '<div />' } },
      { path: '/direction-words/lexical', name: 'directionwords-lexical', component: { template: '<div />' } },
      { path: '/direction-words', name: 'directionwords', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'directionwords-lexical-run', query })
  const wrapper = mount(LexicalRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

// Every level that carries items (the bank has no A2 content), so the whole
// DIRECTION_VERBS bank is in play and the sliced sampler draws its first item.
// Expected strings are derived from that item's own data (never hardcoded), so
// this survives edits to directionVerbs.ts.
const LEVELS = ['B1', 'B2', 'C1'] as const
const QUERY = { count: '1', levels: LEVELS.join(',') }

const SAMPLED = filterLexicalItems({ levels: [...LEVELS] })[0]!
const ENTRY = verbEntryFor(SAMPLED)
const CORRECT_LABEL = SAMPLED.reading === 'directional' ? ENTRY.directionalLabel : ENTRY.lexicalizedLabel
const WRONG_LABEL = SAMPLED.reading === 'directional' ? ENTRY.lexicalizedLabel : ENTRY.directionalLabel

describe('LexicalRunner — the card', () => {
  beforeEach(() => {
    vi.mocked(saveQuizRun).mockClear()
    vi.mocked(sampleLexicalItems).mockClear()
  })

  it('renders exactly two option buttons carrying the verb entry\'s two labels', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const buttons = wrapper.findAll('.choice')
    expect(buttons).toHaveLength(2)
    expect(buttons.some(b => b.text().includes(ENTRY.directionalLabel))).toBe(true)
    expect(buttons.some(b => b.text().includes(ENTRY.lexicalizedLabel))).toBe(true)
    wrapper.unmount()
  })

  it('renders the sentence with its verb surfaces inside bold elements', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const stem = wrapper.find('.drill-sentence')
    expect(stem.text()).toBe(SAMPLED.sentence)
    expect(stem.findAll('strong').map(s => s.text())).toEqual(SAMPLED.surfaces)
    wrapper.unmount()
  })

  it('shows the verb infinitive as a caption', async () => {
    const { wrapper } = await mountRunner(QUERY)
    expect(wrapper.find('.drill-caption').text()).toContain(SAMPLED.verb)
    wrapper.unmount()
  })

  it('shows an error state when no items match the filters', async () => {
    // Every level in the bank carries items, so force the zero-match branch
    // through the sampler (the engine layer already covers empty filters).
    vi.mocked(sampleLexicalItems).mockReturnValueOnce([])
    const { wrapper } = await mountRunner(QUERY)
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(saveQuizRun).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe('LexicalRunner — reveal after a wrong pick', () => {
  beforeEach(() => { vi.mocked(sampleLexicalItems).mockClear() })

  it('reveals the explanation and BOTH labels, marking the correct one', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const wrongBtn = wrapper.findAll('.choice').find(b => b.text().includes(WRONG_LABEL))!
    await wrongBtn.trigger('click')

    expect(wrapper.find('.feedback-line.wrong').exists()).toBe(true)
    expect(wrapper.find('.reveal-b').text()).toBe(SAMPLED.explanation)

    const revealText = wrapper.find('.reveal').text()
    expect(revealText).toContain(ENTRY.directionalLabel)
    expect(revealText).toContain(ENTRY.lexicalizedLabel)

    const lines = wrapper.findAll('.reveal .contrast-sense-line')
    expect(lines).toHaveLength(2)
    const marked = lines.filter(l => l.classes().includes('correct'))
    expect(marked).toHaveLength(1)
    expect(marked[0].text()).toContain(CORRECT_LABEL)

    // …and the correct option button is marked too, the wrong one flagged
    const buttons = wrapper.findAll('.choice')
    expect(buttons.find(b => b.text().includes(CORRECT_LABEL))!.classes()).toContain('correct')
    expect(buttons.find(b => b.text().includes(WRONG_LABEL))!.classes()).toContain('wrong')
    wrapper.unmount()
  })

  // The spec's "the reveal always shows both readings" is a claim about the
  // CORRECT path too — a reveal that only listed the two labels when the learner
  // missed would satisfy the test above.
  it('reveals the explanation and BOTH labels after a CORRECT pick as well', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const rightBtn = wrapper.findAll('.choice').find(b => b.text().includes(CORRECT_LABEL))!
    await rightBtn.trigger('click')

    expect(wrapper.find('.feedback-line.correct').exists()).toBe(true)
    expect(wrapper.find('.reveal-b').text()).toBe(SAMPLED.explanation)

    const revealText = wrapper.find('.reveal').text()
    expect(revealText).toContain(ENTRY.directionalLabel)
    expect(revealText).toContain(ENTRY.lexicalizedLabel)

    const lines = wrapper.findAll('.reveal .contrast-sense-line')
    expect(lines).toHaveLength(2)
    const marked = lines.filter(l => l.classes().includes('correct'))
    expect(marked).toHaveLength(1)
    expect(marked[0].text()).toContain(CORRECT_LABEL)
    wrapper.unmount()
  })
})

describe('LexicalRunner — history recording (ADR-0010)', () => {
  beforeEach(() => {
    vi.mocked(saveQuizRun).mockClear()
    vi.mocked(sampleLexicalItems).mockClear()
  })

  async function completeOneCardWrong(wrapper: VueWrapper) {
    const wrongBtn = wrapper.findAll('.choice').find(b => b.text().includes(WRONG_LABEL))!
    await wrongBtn.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes, with the right type, count and meta', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dw-lexical',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({ levels: [...LEVELS] }),
    }))
    wrapper.unmount()
  })

  // useQuizStats credits EVERY level in meta.levels with the whole run, so a
  // level the bank cannot serve would show up as an accuracy bucket for a drill
  // that asked nothing at that level. A2 is queryable (the chip exists, "All"
  // selects it) but DIRECTION_VERBS has no A2 item — it must not be recorded.
  it('records only the levels the bank carries — an "All" query books no phantom A2 bucket', async () => {
    expect(DIRECTION_LEVELS).toContain('A2')                     // A2 IS queryable…
    expect(filterLexicalItems({ levels: ['A2'] })).toEqual([])   // …and carries nothing

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
