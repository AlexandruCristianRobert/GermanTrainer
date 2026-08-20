import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SentenceRunner from '../../../src/modules/da-compounds/SentenceRunner.vue'
import type { DacSentenceSpec } from '../../../src/composables/useDaSentenceQuiz'

// Task 2 hookup check: the graded feedback line renders the German solution
// through GermanSolutionText, so a sentence carrying a validated `idiom`
// shows its underline + popover there — but ONLY in en-de mode.
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

const IDIOM = { spans: ['wartete', 'darauf'], form: 'auf etwas warten', gloss: 'to wait for something' }
const GERMAN = 'Sie wartete schon lange darauf.'
const ENGLISH = 'She had been waiting for it for a long time.'

vi.mock('../../../src/composables/useDaSentenceQuiz', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../src/composables/useDaSentenceQuiz')>()
  return {
    ...real,
    generateDacSentenceBatch: async (_c: unknown, opts: { specs: DacSentenceSpec[] }) => ({
      sentences: opts.specs.map(s => ({ ...s, english: ENGLISH, german: GERMAN, idiom: IDIOM })),
      rejected: 0, attempts: 1
    }),
    gradeDacAnswer: async () => ({ correct: false, tip: 'test tip', tags: ['preposition'] })
  }
})

const COLLOC = { id: 'warten-auf', word: 'warten', english: 'to wait for', preposition: 'auf', case: 'accusative' as const, level: 'B1' as const }

function stash(direction: 'en-de' | 'de-en' = 'en-de') {
  const specs: DacSentenceSpec[] = [{ index: 0, colloc: COLLOC, nouns: [] }]
  sessionStorage.setItem('gt:lastDacSentenceQuiz', JSON.stringify({
    specs, direction, level: 'B1–C1', wordHints: true
  }))
}

async function mountRunner() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dacompounds', component: { template: '<div />' } },
      { path: '/sentence', name: 'dacompounds-sentence', component: { template: '<div />' } },
      { path: '/sentence/run', name: 'dacompounds-sentence-run', component: { template: '<div />' } }
    ]
  })
  await router.push({ name: 'dacompounds-sentence-run' })
  const wrapper = mount(SentenceRunner, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('da-compounds SentenceRunner — idiom hookup (graded feedback)', () => {
  beforeEach(() => { sessionStorage.clear() })

  it('en-de: underlines the idiom spans in the graded feedback line, with a popover carrying form + gloss', async () => {
    stash('en-de')
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

  it('de-en: the reference (English) line never gets idiom treatment', async () => {
    stash('de-en')
    const w = await mountRunner()
    await w.find('textarea.prep-input').setValue('wrong')
    await w.find('form').trigger('submit')
    await flushPromises()

    const feedback = w.find('.prep-feedback-full')
    expect(feedback.exists()).toBe(true)
    expect(feedback.findAll('.sn-i[data-cat="idiom"]')).toHaveLength(0)
    expect(feedback.text()).toContain(ENGLISH)
  })
})
