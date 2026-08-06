import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SentenceRunner from '../../../src/modules/sentence/SentenceRunner.vue'
import { CONNECTORS } from '../../../src/data/connectors'

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

// One canned generated card per spec; grader marks everything correct.
vi.mock('../../../src/composables/usePackedSentenceQuiz', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../src/composables/usePackedSentenceQuiz')>()
  return {
    ...real,
    generatePackedBatch: async (_c: unknown, opts: { specs: Array<{ index: number; items: unknown[] }> }) => ({
      cards: opts.specs.map(s => ({
        ...s,
        english: 'We are waiting, but he is not coming.',
        german: 'Wir warten, aber er kommt nicht.',
        sents: 1,
        spans: [{ key: 'v1', en: 'waiting' }, { key: 'k1', en: 'but' }]
      })),
      rejected: 0, attempts: 1
    }),
    gradePackedAnswer: async (_c: unknown, o: { card: { items: Array<{ key: string }> } }) => ({
      items: o.card.items.map(i => ({ key: i.key, correct: true })), tip: undefined
    })
  }
})

const CONN = CONNECTORS.find(c => c.id === 'aber')!
function stash(cards = 2) {
  const specs = Array.from({ length: cards }, (_, index) => ({
    index,
    items: [
      { key: 'v1', cat: 'verb', verb: { german: 'warten', english: 'wait', level: 'B1', case: 'accusative' } },
      { key: 'k1', cat: 'conn', conn: CONN }
    ]
  }))
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

describe('SentenceRunner', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear() })

  it('renders the manifest and hint spans for the first card', async () => {
    stash()
    const w = await mountRunner()
    expect(w.find('.sna-manifest').text()).toContain('Gesucht')
    expect(w.findAll('.sn-i').length).toBeGreaterThanOrEqual(2)
    // hybrid: the verb span reveals German, the connector span does not
    const spans = w.findAll('.sn-i')
    const withPop = spans.filter(s => s.find('.sn-pop').exists())
    expect(withPop).toHaveLength(1)
    expect(withPop[0].find('.sn-pop').text()).toBe('warten')
  })

  it('grades a typed answer and records an all-or-nothing run once finished', async () => {
    stash(1)
    const w = await mountRunner()
    await w.find('textarea.sn-ta').setValue('Wir warten, aber er kommt nicht.')
    await w.findAll('button').find(b => b.text().startsWith('Einreichen'))!.trigger('click')
    await flushPromises()
    expect(w.find('.sn-verdict').text()).toContain('Richtig')
    await w.findAll('button').find(b => b.text().includes('Runde abschließen'))!.trigger('click')
    await flushPromises()
    const hist = JSON.parse(localStorage.getItem('gt:quizHistory')!)
    expect(hist).toHaveLength(1)
    expect(hist[0].type).toBe('sentence-packed')
    expect(hist[0].count).toBe(1)
    expect(hist[0].correct).toBe(1)
    expect(hist[0].meta.packedConnItems).toHaveLength(1)
    expect(hist[0].meta.verbSentenceItems).toHaveLength(1)
  })
})
