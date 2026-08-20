import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SentenceQuizRunner from '../../../src/modules/prepositions/SentenceQuizRunner.vue'
import type { SentenceSpec } from '../../../src/composables/useSentenceQuiz'

// Task 2 hookup check: the graded feedback line and the finished-quiz result
// row both render the German solution through GermanSolutionText, so a
// sentence carrying a validated `idiom` shows its underline + popover there
// — but ONLY in en-de mode (de-en shows the English reference, plain).
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

const IDIOM = { spans: ['wechselte', 'den Besitzer'], form: 'den Besitzer wechseln', gloss: 'to change hands' }
const GERMAN = 'Die Macht wechselte über Nacht den Besitzer.'
const ENGLISH = 'Power changed hands overnight.'

vi.mock('../../../src/composables/useSentenceQuiz', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../src/composables/useSentenceQuiz')>()
  return {
    ...real,
    generateSentences: async (_c: unknown, opts: { specs: SentenceSpec[] }) => ({
      sentences: opts.specs.map(s => ({ ...s, english: ENGLISH, german: GERMAN, idiom: IDIOM })),
      rejected: 0, attempts: 1
    })
  }
})

function stash(direction: 'en-de' | 'de-en' = 'en-de') {
  const specs: SentenceSpec[] = [{ index: 0, prepId: 'mit', prepGerman: 'mit', prepEnglish: 'with', case: 'dative', nouns: [] }]
  sessionStorage.setItem('gt:lastPrepSentenceQuiz', JSON.stringify({
    specs, cases: ['dative'], groups: [], nounsPer: 'mix', direction, gradingMode: 'exact', wordHints: true
  }))
}

async function mountRunner() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'prepositions', component: { template: '<div />' } },
      { path: '/sentence', name: 'prepositions-sentence', component: { template: '<div />' } },
      { path: '/sentence/run', name: 'prepositions-sentence-run', component: { template: '<div />' } }
    ]
  })
  await router.push({ name: 'prepositions-sentence-run' })
  const wrapper = mount(SentenceQuizRunner, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('SentenceQuizRunner — idiom hookup (graded feedback + result list)', () => {
  beforeEach(() => { sessionStorage.clear() })

  it('en-de: underlines the idiom spans in the graded feedback line, with a popover carrying form + gloss', async () => {
    stash('en-de')
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
    // Lossless: the visible text (popovers stripped) still equals the German reference.
    const clone = feedback.element.cloneNode(true) as HTMLElement
    clone.querySelectorAll('.sn-pop').forEach(p => p.remove())
    expect(clone.textContent).toContain(GERMAN)
  })

  it('de-en: the reference (English) line never gets idiom treatment', async () => {
    stash('de-en')
    const w = await mountRunner()
    await w.find('input.prep-input').setValue('wrong')
    await w.find('form').trigger('submit')
    await flushPromises()

    const feedback = w.find('.prep-feedback-full')
    expect(feedback.exists()).toBe(true)
    expect(feedback.findAll('.sn-i[data-cat="idiom"]')).toHaveLength(0)
    expect(feedback.text()).toContain(ENGLISH)
  })
})
