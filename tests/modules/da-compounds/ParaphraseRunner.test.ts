import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import ParaphraseRunner from '../../../src/modules/da-compounds/ParaphraseRunner.vue'

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
vi.mock('../../../src/composables/useDaParaphraseQuiz', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/useDaParaphraseQuiz')>()
  return {
    ...actual,
    sampleParaphraseItems: vi.fn((count: number, f: Parameters<typeof actual.filterParaphraseItems>[0] = {}) =>
      actual.filterParaphraseItems(f).slice(0, count)),
  }
})
import { sampleParaphraseItems, filterParaphraseItems } from '../../../src/composables/useDaParaphraseQuiz'
import { paraphraseAnswers } from '../../../src/data/daParaphrase'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds/paraphrase/run', name: 'dacompounds-paraphrase-run', component: { template: '<div />' } },
      { path: '/da-compounds/paraphrase', name: 'dacompounds-paraphrase', component: { template: '<div />' } },
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-paraphrase-run', query })
  const wrapper = mount(ParaphraseRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

function inputs(wrapper: VueWrapper) {
  return wrapper.findAll('.pp-gap-input')
}

async function submit(wrapper: VueWrapper, prep: string, korrelat: string) {
  const [prepInput, korrelatInput] = inputs(wrapper)
  await prepInput.setValue(prep)
  await korrelatInput.setValue(korrelat)
  const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
  await submitBtn!.trigger('click')
}

describe('ParaphraseRunner — smoke tests', () => {
  beforeEach(() => { vi.mocked(sampleParaphraseItems).mockClear() })

  it('renders the quiz stage', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(wrapper.find('.pp-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders two gap inputs — one for the noun sentence, one for the clause', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(inputs(wrapper)).toHaveLength(2)
    wrapper.unmount()
  })

  it('renders both sentence lines around their gaps', async () => {
    const first = filterParaphraseItems({})[0]
    const { wrapper } = await mountRunner({ count: '1' })
    const lines = wrapper.findAll('.pp-line')
    expect(lines).toHaveLength(2)
    expect(lines[0].text()).toContain(first.item.nounSentence.replace('___', '').trim().split(' ')[0])
    wrapper.unmount()
  })

  it('has aria-labels on both gap inputs (Präposition / Korrelat)', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    const [prepInput, korrelatInput] = inputs(wrapper)
    expect(prepInput.attributes('aria-label')).toBe('Präposition')
    expect(korrelatInput.attributes('aria-label')).toBe('Korrelat (da-Verbindung)')
    wrapper.unmount()
  })

  it('disables Submit until both gaps are filled', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    expect((submitBtn!.element as HTMLButtonElement).disabled).toBe(true)

    const [prepInput] = inputs(wrapper)
    await prepInput.setValue('auf')
    expect((submitBtn!.element as HTMLButtonElement).disabled).toBe(true)

    const [, korrelatInput] = inputs(wrapper)
    await korrelatInput.setValue('darauf')
    expect((submitBtn!.element as HTMLButtonElement).disabled).toBe(false)
    wrapper.unmount()
  })

  it('reveals feedback after submitting', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    await submit(wrapper, 'xyz-wrong', 'xyz-wrong-too')
    expect(wrapper.find('.sub-feedback').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows success feedback when both slots are correct', async () => {
    const first = filterParaphraseItems({})[0]
    const { prep, korrelat } = paraphraseAnswers(first.item)
    const { wrapper } = await mountRunner({ count: '1' })
    await submit(wrapper, prep, korrelat)
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    expect(wrapper.find('.sub-reveal').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows per-slot ✓/✗ and the reveal explanation when only one slot is wrong', async () => {
    const first = filterParaphraseItems({})[0]
    const { korrelat } = paraphraseAnswers(first.item)
    const { wrapper } = await mountRunner({ count: '1' })
    await submit(wrapper, 'totally-wrong', korrelat)
    expect(wrapper.find('.sub-feedback-bad').exists()).toBe(true)
    expect(wrapper.find('.ok-mark').exists()).toBe(true) // the correct (korrelat) slot
    expect(wrapper.find('.pp-expected').exists()).toBe(true) // the wrong (prep) slot
    const reveal = wrapper.find('.sub-reveal')
    expect(reveal.exists()).toBe(true)
    expect(reveal.text()).toContain(first.colloc.coreIdeaExplanation)
    wrapper.unmount()
  })

  it('shows an error state when no items match the filters', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'C1' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('ParaphraseRunner — history recording (ADR-0010)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  async function completeOneCardWrong(wrapper: VueWrapper) {
    await submit(wrapper, 'completely-wrong-xyz', 'also-wrong-xyz')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes, with the right type and meta', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1' })
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dac-paraphrase',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({
        levels: ['B1'],
      }),
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    await completeOneCardWrong(wrapper)
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('does not record an empty/never-started run', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'C1' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(saveQuizRun).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
