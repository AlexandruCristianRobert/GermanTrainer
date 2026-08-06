import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import VerbSentenceRunner from '../../../src/modules/verbs/VerbSentenceRunner.vue'
import type { VerbSentenceSpec } from '../../../src/composables/useVerbSentenceQuiz'

const STASH_KEY = 'gt:lastVerbSentenceQuiz'

const { generateContentMock } = vi.hoisted(() => ({ generateContentMock: vi.fn() }))
vi.mock('../../../src/composables/localClaude', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/localClaude')>()
  return { ...actual, resolveAiClient: () => ({ models: { generateContent: generateContentMock } }) }
})
vi.mock('../../../src/composables/useQuizHistory', () => ({ saveQuizRun: vi.fn() }))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

const SPEC: VerbSentenceSpec = {
  index: 0,
  verbs: [{ german: 'kaufen', english: 'buy', level: 'A1', case: 'accusative' }],
  nouns: [],
  tense: 'passivPraeteritum'
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'verbs', component: { template: '<div />' } },
      { path: '/verbs/sentence', name: 'verbs-sentence', component: { template: '<div />' } },
      { path: '/verbs/sentence/run', name: 'verbs-sentence-run', component: { template: '<div />' } }
    ]
  })
}

function genResponse() {
  return { text: JSON.stringify({ items: [{
    index: 0, english: 'The cake was bought.', german: 'Der Kuchen wurde gekauft.',
    verbSpansEn: ['was bought'], nounSpansEn: [], extraWords: []
  }] }) }
}

let wrapper: ReturnType<typeof mount> | null = null
beforeEach(() => { sessionStorage.clear(); generateContentMock.mockReset(); vi.mocked(saveQuizRun).mockClear() })
afterEach(() => { wrapper?.unmount(); wrapper = null })

async function mountRunner(stash: object) {
  sessionStorage.setItem(STASH_KEY, JSON.stringify(stash))
  const router = makeRouter()
  await router.push({ name: 'verbs-sentence-run' })
  wrapper = mount(VerbSentenceRunner, { global: { plugins: [router] } })
  for (let i = 0; i < 40; i++) {
    await flushPromises()
    if (!wrapper.find('.loading-state').exists()) break
  }
  return wrapper
}

describe('VerbSentenceRunner tenses', () => {
  it('shows the tense badge for a tensed spec', async () => {
    generateContentMock.mockResolvedValue(genResponse())
    const w = await mountRunner({ specs: [SPEC], level: 'A1', meta: { levels: ['A1'], types: [], cases: [], groups: [], verbsPer: 1, nounsPer: 1, tenses: ['passivPraeteritum'] } })
    expect(w.find('.tense-badge').exists()).toBe(true)
    expect(w.find('.tense-badge').text()).toBe('Passiv Präteritum')
  })

  it('shows no badge for an untensed spec (remedial/legacy stash)', async () => {
    generateContentMock.mockResolvedValue(genResponse())
    const w = await mountRunner({ specs: [{ ...SPEC, tense: undefined }], level: 'A1' })
    expect(w.find('.tense-badge').exists()).toBe(false)
  })

  it('passes the required tense to the grader and records tenses in history', async () => {
    generateContentMock
      .mockResolvedValueOnce(genResponse())   // generation
      .mockResolvedValue({ text: JSON.stringify({ correct: true }) }) // grading
    const w = await mountRunner({ specs: [SPEC], level: 'A1', meta: { levels: ['A1'], types: [], cases: [], groups: [], verbsPer: 1, nounsPer: 1, tenses: ['passivPraeteritum'] } })
    await w.find('input.prep-input').setValue('Der Kuchen wurde gekauft.')
    await w.find('form.prep-input-wrap').trigger('submit')
    await flushPromises()
    // The grading call is the 2nd generateContent call — its user prompt must name the form.
    const gradeCall = generateContentMock.mock.calls[1][0]
    expect(String(gradeCall.contents)).toContain('TARGET TENSE (required German form): Passiv Präteritum')
    // Finish the run (single card) and check history meta.
    await w.findAll('button').find(b => b.text().includes('Finish quiz'))!.trigger('click')
    await flushPromises()
    expect(vi.mocked(saveQuizRun).mock.calls[0][0].meta.verbSentenceTenses).toEqual(['passivPraeteritum'])
  })
})
