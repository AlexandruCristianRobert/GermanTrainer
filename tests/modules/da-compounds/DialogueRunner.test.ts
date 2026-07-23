import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DialogueRunner from '../../../src/modules/da-compounds/DialogueRunner.vue'

// Stub useBreakpoint so the component doesn't call window.matchMedia in jsdom
vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

// Deterministic sampling: slice instead of shuffle (same technique as
// WoQuestionRunner.test.ts), so tests can know exactly which item a
// `count`+filter combination will draw.
vi.mock('../../../src/composables/useDaDialogueQuiz', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/useDaDialogueQuiz')>()
  return {
    ...actual,
    sampleDialogueItems: vi.fn((count: number, f: Parameters<typeof actual.filterDialogueItems>[0] = {}) =>
      actual.filterDialogueItems(f).slice(0, count)),
  }
})
import { sampleDialogueItems, filterDialogueItems } from '../../../src/composables/useDaDialogueQuiz'
import { dialogueAnswers } from '../../../src/data/daDialogue'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds/dialogue/run', name: 'dacompounds-dialogue-run', component: { template: '<div />' } },
      { path: '/da-compounds/dialogue', name: 'dacompounds-dialogue', component: { template: '<div />' } },
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-dialogue-run', query })
  const wrapper = mount(DialogueRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

function inputs(wrapper: VueWrapper) {
  return wrapper.findAll('.dlg-gap-input')
}

async function submit(wrapper: VueWrapper, wo: string, da: string) {
  const [woInput, daInput] = inputs(wrapper)
  await woInput.setValue(wo)
  await daInput.setValue(da)
  const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
  await submitBtn!.trigger('click')
}

describe('DialogueRunner — smoke tests', () => {
  beforeEach(() => { vi.mocked(sampleDialogueItems).mockClear() })

  it('renders the quiz stage', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(wrapper.find('.dlg-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders two gap inputs — one for the question, one for the reply', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(inputs(wrapper)).toHaveLength(2)
    wrapper.unmount()
  })

  it('renders both scaffold lines around their gaps', async () => {
    const first = filterDialogueItems({})[0]
    const { wrapper } = await mountRunner({ count: '1' })
    const lines = wrapper.findAll('.dlg-line')
    expect(lines).toHaveLength(2)
    expect(lines[0].text()).toContain(first.item.questionScaffold.replace('___ ', '').trim())
    wrapper.unmount()
  })

  it('disables Submit until both gaps are filled', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    expect((submitBtn!.element as HTMLButtonElement).disabled).toBe(true)

    const [woInput] = inputs(wrapper)
    await woInput.setValue('Worauf')
    expect((submitBtn!.element as HTMLButtonElement).disabled).toBe(true)

    const [, daInput] = inputs(wrapper)
    await daInput.setValue('darauf')
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
    const first = filterDialogueItems({})[0]
    const { wo, da } = dialogueAnswers(first.item)
    const { wrapper } = await mountRunner({ count: '1' })
    await submit(wrapper, wo, da)
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    expect(wrapper.find('.sub-reveal').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows per-slot ✓/✗ and the reveal explanation when only one slot is wrong', async () => {
    const first = filterDialogueItems({})[0]
    const { da } = dialogueAnswers(first.item)
    const { wrapper } = await mountRunner({ count: '1' })
    await submit(wrapper, 'totally-wrong', da)
    expect(wrapper.find('.sub-feedback-bad').exists()).toBe(true)
    expect(wrapper.find('.ok-mark').exists()).toBe(true) // the correct (da) slot
    expect(wrapper.find('.dlg-expected').exists()).toBe(true) // the wrong (wo) slot
    const reveal = wrapper.find('.sub-reveal')
    expect(reveal.exists()).toBe(true)
    expect(reveal.text()).toContain(first.colloc.coreIdeaExplanation)
    wrapper.unmount()
  })

  it('shows an error state when no items match the filters', async () => {
    const { wrapper } = await mountRunner({ count: '1', roles: 'noun' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('DialogueRunner — history recording (ADR-0010)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  async function completeOneCardWrong(wrapper: VueWrapper) {
    await submit(wrapper, 'completely-wrong-xyz', 'also-wrong-xyz')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes, with the right type and meta', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1', roles: 'verb' })
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dac-dialogue',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({
        levels: ['B1'],
        roles: ['verb'],
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
    const { wrapper } = await mountRunner({ count: '1', roles: 'noun' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(saveQuizRun).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
