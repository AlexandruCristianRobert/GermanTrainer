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
        english: 'We are waiting at the station, but he is not coming.',
        german: 'Wir warten am Bahnhof, aber er kommt nicht.',
        sents: 1,
        spans: [{ key: 'v1', en: 'waiting' }, { key: 'k1', en: 'but' }],
        extraNouns: [{ en: 'station', de: 'der Bahnhof' }]
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

  it('renders the manifest and hint spans for the first card, every span revealing German', async () => {
    stash()
    const w = await mountRunner()
    expect(w.find('.sna-manifest').text()).toContain('Gesucht')
    const spans = w.findAll('.sn-i')
    expect(spans.length).toBe(3) // verb + connector + the extra noun
    // every hint span carries a reveal popover now
    const pops = spans.map(s => s.find('.sn-pop'))
    expect(pops.every(p => p.exists())).toBe(true)
    const texts = spans.map(s => s.find('.sn-pop').text())
    expect(texts).toContain('warten + Akk')
    // the connector reveals its clause + position as badges, then the word order
    const conn = spans.find(s => s.attributes('data-cat') === 'conn')!
    expect(conn.find('.sn-pop-w').text()).toBe('aber')
    expect(conn.findAll('.sn-badge').map(b => b.text())).toEqual(['HZ', 'Pos. 0'])
    expect(conn.find('.sn-badge').classes()).toContain('hz')
    expect(conn.find('.sn-pop-n').text()).toBe('Wortstellung bleibt')
    // the incidental noun is a subtle extra span revealing article + noun (gender)
    const extra = spans.filter(s => s.classes().includes('extra'))
    expect(extra).toHaveLength(1)
    expect(extra[0].text()).toContain('station')
    expect(extra[0].find('.sn-pop').text()).toBe('der Bahnhof')
  })

  it('shifts a hint popover back into the viewport when it would clip at the edge', async () => {
    stash(1)
    const w = await mountRunner()
    const span = w.findAll('.sn-i')[0]
    const pop = span.find('.sn-pop').element as HTMLElement
    // simulate a popover poking 100px past the left viewport edge
    Object.defineProperty(pop, 'getBoundingClientRect', {
      value: () => ({ left: -100, right: 60, width: 160, top: 0, bottom: 20, height: 20 })
    })
    await span.trigger('mouseenter')
    expect(pop.style.getPropertyValue('--pop-dx')).toBe('108px') // 8px inset − (−100)
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
