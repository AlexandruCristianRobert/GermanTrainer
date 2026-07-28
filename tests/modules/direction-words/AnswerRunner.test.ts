import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AnswerRunner from '../../../src/modules/direction-words/AnswerRunner.vue'
import type { DwSentenceSpec } from '../../../src/composables/useDwAnswerQuiz'

const STASH_KEY = 'dwAnswerStash'

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

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn()
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

const SPEC: DwSentenceSpec = {
  index: 0,
  pair: 'unter',
  side: 'hin',
  target: 'hinunter',
  nouns: [{ german: 'Treppe', article: 'die', english: 'staircase' }]
}

const GENERATED_QUESTION = 'Du stehst unten an der Treppe, deine Oma ist oben. Was rufst du ihr zu?'
const GENERATED_EXAMPLE = 'Komm die Treppe hinunter!'
const GRADE_TIP = 'Wrong side — the speaker is below, calling someone down, so it should be hinunter, not herunter.'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/direction-words/answer/run', name: 'directionwords-answer-run', component: { template: '<div />' } },
      { path: '/direction-words/answer', name: 'directionwords-answer', component: { template: '<div />' } },
      { path: '/direction-words', name: 'directionwords', component: { template: '<div />' } }
    ]
  })
}

async function mountRunner() {
  const router = makeRouter()
  await router.push({ name: 'directionwords-answer-run' })
  const wrapper = mount(AnswerRunner, { global: { plugins: [router] } })
  await flushPromises()
  await flushPromises()
  return { wrapper, router }
}

describe('AnswerRunner (T7 AI answer-the-question)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.mocked(saveQuizRun).mockClear()
    generateContentMock.mockReset()
    generateContentMock.mockImplementation(async (params: Record<string, unknown>) => {
      const contents = String(params.contents ?? '')
      if (contents.includes("LEARNER'S GERMAN ANSWER: Komm die Treppe hinunter!")) {
        return { text: JSON.stringify({ correct: true, tip: '', errorTags: [] }) }
      }
      if (contents.includes("LEARNER'S GERMAN ANSWER")) {
        return { text: JSON.stringify({ correct: false, tip: GRADE_TIP, errorTags: ['direction'] }) }
      }
      return {
        text: JSON.stringify({
          items: [{ index: 0, question: GENERATED_QUESTION, exampleAnswer: GENERATED_EXAMPLE }]
        })
      }
    })
    sessionStorage.setItem(STASH_KEY, JSON.stringify({
      specs: [SPEC],
      levels: ['A2', 'B1'],
      pairs: ['unter'],
      groups: ['House'],
      nounsPer: 1
    }))
  })

  it('renders the generated question', async () => {
    const { wrapper } = await mountRunner()
    expect(wrapper.text()).toContain(GENERATED_QUESTION)
  })

  it('on a wrong reply, shows the AI tip, a "direction" tag chip, and reveals the example answer', async () => {
    const { wrapper } = await mountRunner()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Komm die Treppe herunter!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('.prep-feedback-tip').text()).toContain('Wrong side')
    const tagChips = wrapper.findAll('.tag-error')
    expect(tagChips.some(t => t.text() === 'direction')).toBe(true)
    expect(wrapper.find('.prep-feedback-full').text()).toContain(GENERATED_EXAMPLE)
  })

  it('records a dw-answer history run exactly once, with meta.dwAnswerItems, and the retry pass records a SECOND run', async () => {
    const { wrapper } = await mountRunner()

    // First pass: answer wrong, finish.
    let textarea = wrapper.find('textarea')
    await textarea.setValue('Komm die Treppe herunter!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await flushPromises()

    let finishBtn = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))!
    await finishBtn.trigger('click')

    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dw-answer',
      meta: expect.objectContaining({
        dwAnswerLevels: ['A2', 'B1'],
        dwAnswerPairs: ['unter'],
        dwAnswerGroups: ['House'],
        dwAnswerItems: expect.arrayContaining([
          expect.objectContaining({ correct: false, tags: expect.arrayContaining(['direction']) })
        ])
      })
    }))

    // Retry the wrong item — AI-drill convention (dac AnswerRunner / dw
    // SentenceRunner): retryWrong() resets historySaved, so finishing the
    // retry pass records a SECOND 'dw-answer' history entry, letting
    // weak-point tracking see whether the retry itself was answered right.
    // Task 3's review flagged this path as untested for the sentence drill —
    // covering it here for the answer drill too.
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))!
    await retryBtn.trigger('click')
    await flushPromises()

    textarea = wrapper.find('textarea')
    await textarea.setValue('Komm die Treppe hinunter!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await flushPromises()

    finishBtn = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))!
    await finishBtn.trigger('click')

    expect(saveQuizRun).toHaveBeenCalledTimes(2)
    expect(saveQuizRun).toHaveBeenNthCalledWith(2, expect.objectContaining({
      type: 'dw-answer',
      meta: expect.objectContaining({
        dwAnswerItems: expect.arrayContaining([
          expect.objectContaining({ correct: true })
        ])
      })
    }))
  })
})
