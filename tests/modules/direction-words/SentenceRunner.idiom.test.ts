import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SentenceRunner from '../../../src/modules/direction-words/SentenceRunner.vue'
import type { DwSentenceSpec } from '../../../src/composables/useDwSentenceQuiz'

// Task 2 hookup check: the graded feedback line renders the German solution
// through GermanSolutionText, so a sentence carrying a validated `idiom`
// shows its underline + popover there. This module is EN→DE only.
vi.mock('../../../src/composables/useSettings', async () => {
  const vue = await import('vue')
  return {
    useSettings: () => ({
      settings: vue.ref({ id: 'singleton', geminiApiKey: 'AIzaTest', model: 'gemini-test', aiProvider: 'gemini', localClaudeModel: 'sonnet', localClaudeEffort: 'low' }),
      canUseAi: vue.computed(() => true),
      load: async () => {}
    })
  }
})

const IDIOM = { spans: ['Komm', 'herauf'], form: 'die Treppe heraufkommen', gloss: 'to come up the stairs' }
const GERMAN = 'Oma ruft von oben: Komm die Treppe herauf!'
const ENGLISH = "Grandma calls from the top of the stairs: come up to me!"

vi.mock('../../../src/composables/useDwSentenceQuiz', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../src/composables/useDwSentenceQuiz')>()
  return {
    ...real,
    generateDwSentenceBatch: async (_c: unknown, opts: { specs: DwSentenceSpec[] }) => ({
      sentences: opts.specs.map(s => ({ ...s, english: ENGLISH, german: GERMAN, idiom: IDIOM })),
      failedIndices: []
    }),
    gradeDwAnswer: async () => ({ correct: false, tip: 'test tip', tags: ['direction'] })
  }
})

function stash() {
  const specs: DwSentenceSpec[] = [{ index: 0, pair: 'auf', side: 'her', target: 'herauf', nouns: [] }]
  sessionStorage.setItem('dwSentenceStash', JSON.stringify({
    specs, levels: ['A2', 'B1'], pairs: ['auf'], groups: [], nounsPer: 'mix', hints: true
  }))
}

async function mountRunner() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'directionwords', component: { template: '<div />' } },
      { path: '/sentence', name: 'directionwords-sentence', component: { template: '<div />' } },
      { path: '/sentence/run', name: 'directionwords-sentence-run', component: { template: '<div />' } }
    ]
  })
  await router.push({ name: 'directionwords-sentence-run' })
  const wrapper = mount(SentenceRunner, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('direction-words SentenceRunner — idiom hookup (graded feedback)', () => {
  beforeEach(() => { sessionStorage.clear() })

  it('underlines the idiom spans in the graded feedback line, with a popover carrying form + gloss', async () => {
    stash()
    const w = await mountRunner()
    await w.find('textarea.prep-input').setValue('falsch.')
    await w.find('form').trigger('submit')
    await flushPromises()

    const feedback = w.find('.prep-feedback-full')
    expect(feedback.exists()).toBe(true)
    const idiomSpans = feedback.findAll('.sn-i[data-cat="idiom"]')
    expect(idiomSpans).toHaveLength(2)
    for (const span of idiomSpans) {
      expect(span.find('em').text()).toBe(IDIOM.form)
      expect(span.find('.sn-pop').text()).toContain(IDIOM.gloss)
    }
    const clone = feedback.element.cloneNode(true) as HTMLElement
    clone.querySelectorAll('.sn-pop').forEach(p => p.remove())
    expect(clone.textContent).toContain(GERMAN)
  })
})
