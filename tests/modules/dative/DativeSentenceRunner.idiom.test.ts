import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DativeSentenceRunner from '../../../src/modules/dative/DativeSentenceRunner.vue'
import type { DativeSentenceSpec } from '../../../src/composables/useDativeSentenceQuiz'

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

vi.mock('../../../src/composables/useDativeLedger', () => ({ bumpDativeLedger: vi.fn() }))

const IDIOM = { spans: ['helfe', 'meiner Mutter'], form: 'jemandem helfen', gloss: 'to help someone' }
const GERMAN = 'Ich helfe meiner Mutter in der Küche.'
const ENGLISH = 'I help my mother in the kitchen.'

vi.mock('../../../src/composables/useDativeSentenceQuiz', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../src/composables/useDativeSentenceQuiz')>()
  return {
    ...real,
    generateDatSentenceBatch: async (_c: unknown, opts: { specs: DativeSentenceSpec[] }) => ({
      sentences: opts.specs.map(s => ({ ...s, english: ENGLISH, german: GERMAN, usedForm: 'helfe', dativeObject: 'meiner Mutter', idiom: IDIOM })),
      failedIndices: []
    }),
    gradeDativeSentence: async () => ({ correct: false, tip: 'test tip', tags: ['case'] })
  }
})

function stash() {
  const specs: DativeSentenceSpec[] = [{ index: 0, verb: 'helfen', family: 'co-agent' }]
  sessionStorage.setItem('datSentenceStash', JSON.stringify({ specs, families: ['co-agent'], focus: 'all' }))
}

async function mountRunner() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dative', component: { template: '<div />' } },
      { path: '/sentence', name: 'dative-sentence', component: { template: '<div />' } },
      { path: '/sentence/run', name: 'dative-sentence-run', component: { template: '<div />' } }
    ]
  })
  await router.push({ name: 'dative-sentence-run' })
  const wrapper = mount(DativeSentenceRunner, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('DativeSentenceRunner — idiom hookup (graded feedback)', () => {
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
