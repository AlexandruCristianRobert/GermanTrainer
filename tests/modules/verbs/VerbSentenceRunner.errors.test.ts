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

const SPEC: VerbSentenceSpec = {
  index: 0,
  verbs: [{ german: 'kaufen', english: 'buy', level: 'A1', case: 'accusative' }],
  nouns: []
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

let wrapper: ReturnType<typeof mount> | null = null
beforeEach(() => { sessionStorage.clear(); generateContentMock.mockReset() })
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

describe('VerbSentenceRunner generation errors', () => {
  it('shows the underlying error when every generation call fails (e.g. expired Claude login)', async () => {
    generateContentMock.mockRejectedValue(new Error('Claude Code login expired or missing — open Claude Code, run /login, then try again.'))
    const w = await mountRunner({ specs: [SPEC], level: 'A1' })
    const alert = w.find('.alert-danger')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('/login')
    expect(alert.text()).not.toContain('no usable sentences')
  })

  it('keeps the generic message when the model returns unusable output without throwing', async () => {
    generateContentMock.mockResolvedValue({ text: 'not json at all' })
    const w = await mountRunner({ specs: [SPEC], level: 'A1' })
    const alert = w.find('.alert-danger')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('no usable sentences')
  })
})
