import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SentenceRunner from '../../../src/modules/sentence/SentenceRunner.vue'
import { CONNECTORS } from '../../../src/data/connectors'

// Task 1 hookup check: the graded "Referenz" line renders the German
// solution through GermanSolutionText, so a card carrying a validated
// `idiom` shows its underline + popover there (and nowhere else — the
// "Quelle"/"Du" lines and the per-item solution list stay plain).
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

vi.mock('../../../src/composables/usePackedSentenceQuiz', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../src/composables/usePackedSentenceQuiz')>()
  return {
    ...real,
    generatePackedBatch: async (
      _c: unknown,
      opts: { specs: Array<{ index: number; items: Array<{ key: string; cat: string }> }> }
    ) => ({
      cards: opts.specs.map(s => ({
        ...s,
        english: 'Power changed hands overnight.',
        german: 'Die Macht wechselte über Nacht den Besitzer.',
        sents: 1,
        spans: [{ key: 'v1', en: 'changed' }],
        extras: [],
        idiom: IDIOM
      })),
      rejected: 0, attempts: 1
    }),
    gradePackedAnswer: async (_c: unknown, o: { card: { items: Array<{ key: string }> } }) => ({
      items: o.card.items.map(i => ({ key: i.key, correct: true })), tip: undefined
    })
  }
})

const CONN = CONNECTORS.find(c => c.id === 'aber')!
function stash() {
  const specs = [{
    index: 0,
    items: [
      { key: 'v1', cat: 'verb', verb: { german: 'wechseln', english: 'to change', level: 'B1', case: 'accusative' } },
      { key: 'k1', cat: 'conn', conn: CONN }
    ]
  }]
  sessionStorage.setItem('gt:lastPackedSentenceQuiz', JSON.stringify({
    specs, direction: 'en-de', modality: 'typed', wordHints: true, level: 'B1',
    meta: { counts: { verb: 1, noun: 0, prep: 0, dac: 0, conn: 1 }, verbLevels: ['B1'], verbTypes: [], verbCases: [], nounGroups: [], prepCases: [], connFamilies: ['adversativ'], connWords: [] }
  }))
}

async function mountRunner() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/sentence', name: 'sentence', component: { template: '<div />' } },
      { path: '/sentence/run', name: 'sentence-run', component: { template: '<div />' } }
    ]
  })
  await router.push({ name: 'sentence-run' })
  const wrapper = mount(SentenceRunner, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('SentenceRunner — idiom hookup (graded Referenz line)', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear() })

  it('underlines the idiom spans in the Referenz line, with a popover carrying form + gloss, after grading', async () => {
    stash()
    const w = await mountRunner()
    await w.find('textarea.sn-ta').setValue('Die Macht wechselte über Nacht den Besitzer.')
    await w.findAll('button').find(b => b.text().startsWith('Einreichen'))!.trigger('click')
    await flushPromises()
    expect(w.find('.sn-verdict').exists()).toBe(true)

    const rows = w.findAll('.sna-st-r')
    const referenzRow = rows.find(r => r.find('.sna-st-l').text() === 'Referenz')!
    const idiomSpans = referenzRow.findAll('.sn-i[data-cat="idiom"]')
    expect(idiomSpans).toHaveLength(2)
    for (const span of idiomSpans) {
      expect(span.find('em').text()).toBe(IDIOM.form)
      expect(span.find('.sn-pop').text()).toContain(IDIOM.gloss)
    }
    // the visible text is unchanged — losslessness holds through the runner too.
    const clone = referenzRow.element.cloneNode(true) as HTMLElement
    clone.querySelectorAll('.sn-pop').forEach(p => p.remove())
    expect(clone.textContent).toContain('Die Macht wechselte über Nacht den Besitzer.')

    // "Quelle" (the English source in en-de mode) must never get idiom treatment.
    const quelleRow = rows.find(r => r.find('.sna-st-l').text() === 'Quelle')!
    expect(quelleRow.findAll('.sn-i[data-cat="idiom"]')).toHaveLength(0)
  })
})
