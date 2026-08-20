import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import VerbSentenceRunner from '../../../src/modules/verbs/VerbSentenceRunner.vue'
import type { VerbSentenceSpec } from '../../../src/composables/useVerbSentenceQuiz'

// Task 2 hookup check: the graded feedback line renders the German solution
// through GermanSolutionText, so a sentence carrying a validated `idiom`
// shows its underline + popover there. VerbSentenceRunner is EN→DE only.
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

const IDIOM = { spans: ['gehen', 'zur Schule'], form: 'zur Schule gehen', gloss: 'to go to school' }
const GERMAN = 'Die Kinder gehen morgens zur Schule.'
const ENGLISH = 'The children go to school in the morning.'

vi.mock('../../../src/composables/useVerbSentenceQuiz', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../src/composables/useVerbSentenceQuiz')>()
  return {
    ...real,
    generateVerbSentenceBatch: async (_c: unknown, opts: { specs: VerbSentenceSpec[] }) => ({
      sentences: opts.specs.map(s => ({ ...s, english: ENGLISH, german: GERMAN, idiom: IDIOM })),
      rejected: 0, attempts: 1
    }),
    gradeVerbAnswer: async () => ({ correct: false, tip: 'test tip', tags: ['conjugation'] })
  }
})

function stash() {
  const specs: VerbSentenceSpec[] = [{ index: 0, verbs: [{ german: 'gehen', english: 'go', level: 'A1' }], nouns: [] }]
  sessionStorage.setItem('gt:lastVerbSentenceQuiz', JSON.stringify({
    specs, runType: 'verb-sentence', level: 'A2–B1', wordHints: true, modality: 'typed'
  }))
}

async function mountRunner() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'verbs', component: { template: '<div />' } },
      { path: '/sentence', name: 'verbs-sentence', component: { template: '<div />' } },
      { path: '/sentence/run', name: 'verbs-sentence-run', component: { template: '<div />' } }
    ]
  })
  await router.push({ name: 'verbs-sentence-run' })
  const wrapper = mount(VerbSentenceRunner, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('VerbSentenceRunner — idiom hookup (graded feedback)', () => {
  beforeEach(() => { sessionStorage.clear() })

  it('underlines the idiom spans in the graded feedback line, with a popover carrying form + gloss', async () => {
    stash()
    const w = await mountRunner()
    await w.find('input.prep-input').setValue('falsch.')
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
