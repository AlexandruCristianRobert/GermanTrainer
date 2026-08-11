import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DativeSentenceRunner from '../../../src/modules/dative/DativeSentenceRunner.vue'
import type { DativeSentenceSpec } from '../../../src/composables/useDativeSentenceQuiz'

const STASH_KEY = 'datSentenceStash'

const { generateContentMock } = vi.hoisted(() => ({ generateContentMock: vi.fn() }))

vi.mock('../../../src/composables/localClaude', () => ({
  resolveAiClient: () => ({ models: { generateContent: generateContentMock } })
}))

vi.mock('../../../src/composables/useSettings', async () => {
  const vue = await import('vue')
  return {
    useSettings: () => ({
      settings: vue.ref({
        id: 'singleton', geminiApiKey: 'AIzaTest', model: 'gemini-test',
        aiProvider: 'gemini', localClaudeModel: 'sonnet', localClaudeEffort: 'low'
      }),
      canUseAi: vue.computed(() => true),
      load: async () => {}
    })
  }
})

vi.mock('../../../src/composables/useQuizHistory', () => ({ saveQuizRun: vi.fn() }))
vi.mock('../../../src/composables/useDativeLedger', () => ({ bumpDativeLedger: vi.fn() }))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'
import { bumpDativeLedger } from '../../../src/composables/useDativeLedger'

const SPEC: DativeSentenceSpec = { index: 0, verb: 'helfen', family: 'co-agent' }
const GEN_ENGLISH = 'I help my mother in the kitchen every evening.'
const GEN_GERMAN = 'Ich helfe meiner Mutter jeden Abend in der Küche.'
const GRADE_TIP = 'helfen takes the dative: meiner Mutter, not meine Mutter.'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dative/sentence/run', name: 'dative-sentence-run', component: { template: '<div />' } },
      { path: '/dative/sentence', name: 'dative-sentence', component: { template: '<div />' } },
      { path: '/dative', name: 'dative', component: { template: '<div />' } }
    ]
  })
}

async function mountRunner() {
  const router = makeRouter()
  await router.push({ name: 'dative-sentence-run' })
  const wrapper = mount(DativeSentenceRunner, { global: { plugins: [router] } })
  await flushPromises()
  await flushPromises()
  return { wrapper, router }
}

async function submitWrongAnswer(wrapper: ReturnType<typeof mount>) {
  const textarea = wrapper.find('textarea')
  await textarea.setValue('Ich helfe meine Mutter jeden Abend.')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  await flushPromises()
}

describe('DativeSentenceRunner (T11 AI sentence translation)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.mocked(saveQuizRun).mockClear()
    vi.mocked(bumpDativeLedger).mockClear()
    generateContentMock.mockReset()
    generateContentMock.mockImplementation(async (params: Record<string, unknown>) => {
      const contents = String(params.contents ?? '')
      if (contents.includes("LEARNER'S GERMAN ANSWER")) {
        return { text: JSON.stringify({ correct: false, tip: GRADE_TIP, errorTags: ['case'] }) }
      }
      return {
        text: JSON.stringify({
          items: [{ index: 0, english: GEN_ENGLISH, german: GEN_GERMAN, usedForm: 'helfe', dativeObject: 'meiner Mutter' }]
        })
      }
    })
    sessionStorage.setItem(STASH_KEY, JSON.stringify({ specs: [SPEC], families: ['co-agent'], focus: 'all' }))
  })

  it('renders the generated English sentence', async () => {
    const { wrapper } = await mountRunner()
    expect(wrapper.text()).toContain(GEN_ENGLISH)
  })

  it('on a wrong submit, shows the reference German, the AI tip and a case tag chip', async () => {
    const { wrapper } = await mountRunner()
    await submitWrongAnswer(wrapper)
    expect(wrapper.text()).toContain(GEN_GERMAN)
    expect(wrapper.find('.prep-feedback-tip').text()).toContain('helfen takes the dative')
    expect(wrapper.findAll('.tag-error').some(t => t.text() === 'case')).toBe(true)
  })

  it('records a dat-sentence Run with tagged items and bumps the ledger once, keyed by the verb', async () => {
    const { wrapper } = await mountRunner()
    await submitWrongAnswer(wrapper)
    const finishBtn = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))!
    await finishBtn.trigger('click')

    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dat-sentence',
      meta: expect.objectContaining({
        datSentenceFamilies: ['co-agent'],
        datSentenceFocus: 'all',
        datSentenceItems: expect.arrayContaining([
          expect.objectContaining({ verb: 'helfen', correct: false, tags: expect.arrayContaining(['case']) })
        ])
      })
    }))
    expect(bumpDativeLedger).toHaveBeenCalledTimes(1)
    expect(bumpDativeLedger).toHaveBeenCalledWith('helfen', false, expect.any(Number))
  })

  it('a retry pass records a SECOND Run (AI-family convention) but never re-bumps the ledger', async () => {
    const { wrapper } = await mountRunner()
    await submitWrongAnswer(wrapper)
    const finishBtn = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))!
    await finishBtn.trigger('click')

    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))!
    await retryBtn.trigger('click')
    await flushPromises()
    await submitWrongAnswer(wrapper)
    const finishBtn2 = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))!
    await finishBtn2.trigger('click')

    expect(saveQuizRun).toHaveBeenCalledTimes(2)
    expect(bumpDativeLedger).toHaveBeenCalledTimes(1)
  })
})
