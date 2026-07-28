import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SentenceRunner from '../../../src/modules/direction-words/SentenceRunner.vue'
import type { DwSentenceSpec } from '../../../src/composables/useDwSentenceQuiz'

const STASH_KEY = 'dwSentenceStash'

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
  pair: 'auf',
  side: 'her',
  target: 'herauf',
  nouns: [{ german: 'Treppe', article: 'die', english: 'staircase' }]
}

const GENERATED_ENGLISH = 'Grandma calls up the staircase for you to come visit soon.'
const GENERATED_GERMAN = 'Oma ruft: Komm die Treppe herauf, wir warten schon!'
const GRADE_TIP = 'Wrong side — Grandma is above you, so it should be herauf, not hinauf.'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/direction-words/sentence/run', name: 'directionwords-sentence-run', component: { template: '<div />' } },
      { path: '/direction-words/sentence', name: 'directionwords-sentence', component: { template: '<div />' } },
      { path: '/direction-words', name: 'directionwords', component: { template: '<div />' } }
    ]
  })
}

async function mountRunner() {
  const router = makeRouter()
  await router.push({ name: 'directionwords-sentence-run' })
  const wrapper = mount(SentenceRunner, { global: { plugins: [router] } })
  await flushPromises()
  await flushPromises()
  return { wrapper, router }
}

describe('SentenceRunner (T6 AI sentence translation)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.mocked(saveQuizRun).mockClear()
    generateContentMock.mockReset()
    generateContentMock.mockImplementation(async (params: Record<string, unknown>) => {
      const contents = String(params.contents ?? '')
      if (contents.includes("LEARNER'S GERMAN ANSWER")) {
        return { text: JSON.stringify({ correct: false, tip: GRADE_TIP, errorTags: ['direction'] }) }
      }
      return {
        text: JSON.stringify({
          items: [{
            index: 0,
            english: GENERATED_ENGLISH,
            german: GENERATED_GERMAN,
            nounSpansEn: ['staircase'],
            extraWords: [{ en: 'calls', de: 'rufen', kind: 'verb' }]
          }]
        })
      }
    })
    sessionStorage.setItem(STASH_KEY, JSON.stringify({
      specs: [SPEC],
      levels: ['A2', 'B1'],
      pairs: ['auf'],
      groups: ['House'],
      nounsPer: 1,
      hints: true
    }))
  })

  it('renders the generated sentence', async () => {
    const { wrapper } = await mountRunner()
    expect(wrapper.find('.en-sentence').exists()).toBe(true)
    expect(wrapper.text()).toContain('staircase')
  })

  it('shows a noun hint, but never a hint that leaks the target compound', async () => {
    const { wrapper } = await mountRunner()
    const hints = wrapper.findAll('.hint')
    expect(hints.length).toBeGreaterThan(0)
    const nounHint = hints.find(h => h.classes().includes('hint-noun'))
    expect(nounHint).toBeTruthy()
    expect(nounHint!.text().toLowerCase()).not.toContain('herauf')
    for (const h of hints) {
      expect(h.text().toLowerCase()).not.toContain('herauf')
      expect((h.attributes('aria-label') ?? '').toLowerCase()).not.toContain('herauf')
    }
  })

  it('on a wrong submit, shows the AI tip and a "direction" tag chip', async () => {
    const { wrapper } = await mountRunner()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Oma ruft: Komm die Treppe hinauf!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('.prep-feedback-tip').text()).toContain('Wrong side')
    const tagChips = wrapper.findAll('.tag-error')
    expect(tagChips.some(t => t.text() === 'direction')).toBe(true)
  })

  it('records a dw-sentence history run whose item carries the direction tag', async () => {
    const { wrapper } = await mountRunner()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Oma ruft: Komm die Treppe hinauf!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await flushPromises()

    const finishBtn = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))!
    await finishBtn.trigger('click')

    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dw-sentence',
      meta: expect.objectContaining({
        dwSentenceItems: expect.arrayContaining([
          expect.objectContaining({ tags: expect.arrayContaining(['direction']) })
        ])
      })
    }))
  })
})
