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

// pair 'unter' has a vertical twin ('ab') per VERTICAL_TWIN in
// useDwSentenceQuiz.ts, so hin+unter's target 'hinunter' twins to 'hinab' —
// this lets one fixture exercise buildDwHintInputs' filtering of BOTH the
// exact target and its vertical-synonym twin, not just the target.
const SPEC: DwSentenceSpec = {
  index: 0,
  pair: 'unter',
  side: 'hin',
  target: 'hinunter',
  nouns: [{ german: 'Treppe', article: 'die', english: 'staircase' }]
}

const GENERATED_ENGLISH = 'Someone waves you down the staircase, calling out to hurry.'
const GENERATED_GERMAN = 'Jemand ruft: Geh die Treppe hinunter, beeil dich!'
const GRADE_TIP = 'Wrong side — the speaker is below, calling you down, so it should be hinunter, not herunter.'

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
            // 'waves' is a legitimate extra-word hint. The other two are
            // deliberate LEAK CANDIDATES the real AI might plausibly return —
            // one revealing the exact target compound, one revealing its
            // vertical twin — planted here so the test can prove the Runner
            // routes hints through buildDwHintInputs' filtering rather than
            // rendering every AI-supplied extraWord verbatim.
            extraWords: [
              { en: 'waves', de: 'winken', kind: 'verb' },
              { en: 'hurry', de: 'hinunter', kind: 'verb' },
              { en: 'down', de: 'hinab', kind: 'noun' }
            ]
          }]
        })
      }
    })
    sessionStorage.setItem(STASH_KEY, JSON.stringify({
      specs: [SPEC],
      levels: ['A2', 'B1'],
      pairs: ['unter'],
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

  it('shows the legitimate hints, but never a hint that leaks the target compound or its twin', async () => {
    const { wrapper } = await mountRunner()
    const hints = wrapper.findAll('.hint')

    // The legitimate hints still render: the theme noun, and the one
    // extra-word ('waves' → 'winken') that doesn't touch the target/twin.
    const nounHint = hints.find(h => h.classes().includes('hint-noun'))
    expect(nounHint).toBeTruthy()
    expect(nounHint!.text()).toContain('staircase')
    const wavesHint = hints.find(h => h.text().includes('waves'))
    expect(wavesHint).toBeTruthy()
    expect(wavesHint!.text()).toContain('winken')

    // Exactly the two legitimate hints render — the two leak candidates
    // ('hurry'→'hinunter' and 'down'→'hinab') were dropped by
    // buildDwHintInputs, not merely coincidentally free of the leaked text.
    expect(hints.length).toBe(2)
    const hurryHint = hints.find(h => h.text().includes('hurry'))
    const downHint = hints.find(h => h.text().includes('down'))
    expect(hurryHint).toBeUndefined()
    expect(downHint).toBeUndefined()

    // Belt and suspenders: whatever DOES render as a hint must never expose
    // the target compound or its vertical twin, in the visible surface, the
    // reveal popover, or the aria-label.
    for (const h of hints) {
      const text = h.text().toLowerCase()
      const ariaLabel = (h.attributes('aria-label') ?? '').toLowerCase()
      expect(text).not.toContain('hinunter')
      expect(text).not.toContain('hinab')
      expect(ariaLabel).not.toContain('hinunter')
      expect(ariaLabel).not.toContain('hinab')
    }
  })

  it('on a wrong submit, shows the AI tip and a "direction" tag chip', async () => {
    const { wrapper } = await mountRunner()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Geh die Treppe herunter!')
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
    await textarea.setValue('Geh die Treppe herunter!')
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
