import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import TranslationQuizResult from '../../../src/modules/verbs/TranslationQuizResult.vue'
import type { Verb } from '../../../src/data/verbs'

const gehen: Verb = {
  german: 'gehen', english: 'go / walk',
  level: 'A1', type: 'irregular', case: 'none', auxiliary: 'sein',
  praesens: ['gehe', 'gehst', 'geht', 'gehen', 'geht', 'gehen'],
  praeteritumStem: 'ging', partizip2: 'gegangen'
}
const sehen: Verb = {
  german: 'sehen', english: 'see',
  level: 'A1', type: 'irregular', case: 'accusative', auxiliary: 'haben',
  praesens: ['sehe', 'siehst', 'sieht', 'sehen', 'seht', 'sehen'],
  praeteritumStem: 'sah', partizip2: 'gesehen'
}
const lernen: Verb = {
  german: 'lernen', english: 'learn',
  level: 'A1', type: 'regular', case: 'accusative', auxiliary: 'haben',
  praesens: ['lerne', 'lernst', 'lernt', 'lernen', 'lernt', 'lernen'],
  praeteritumStem: 'lernte', partizip2: 'gelernt'
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/verbs', name: 'verbs', component: { template: '<div />' } },
      { path: '/verbs/translation', name: 'verbs-translation', component: { template: '<div />' } },
      { path: '/verbs/translation/run', name: 'verbs-translation-run', component: { template: '<div />' } }
    ]
  })
}

function stash(graded: Array<{ verb: Verb; input: string; correct: boolean }>, direction?: 'de-en' | 'en-de') {
  sessionStorage.setItem('gt:lastVerbTranslation', JSON.stringify({
    graded,
    total: graded.length,
    correct: graded.filter(g => g.correct).length,
    ...(direction ? { direction } : {})
  }))
}

async function mountResult() {
  const router = makeRouter()
  const wrapper = mount(TranslationQuizResult, {
    attachTo: document.body,
    global: { plugins: [router] }
  })
  await flushPromises()
  return { wrapper, router }
}

describe('TranslationQuizResult — retry the wrong ones', () => {
  beforeEach(() => sessionStorage.clear())

  it('offers "Retry N wrong" counting only the missed rows', async () => {
    stash([
      { verb: gehen, input: 'go', correct: true },
      { verb: sehen, input: 'hear', correct: false },
      { verb: lernen, input: '', correct: false }
    ])
    const { wrapper } = await mountResult()
    const btn = wrapper.findAll('button').find(b => b.text().startsWith('Retry 2 wrong'))
    expect(btn).toBeTruthy()
    wrapper.unmount()
  })

  it('auto-opens the shared retry modal when there are wrong answers', async () => {
    stash([{ verb: sehen, input: 'hear', correct: false }])
    const { wrapper } = await mountResult()
    expect(wrapper.find('.retry-modal').exists()).toBe(true)
    expect(wrapper.find('.retry-modal').text()).toContain('1 verbs')
    wrapper.unmount()
  })

  it('shows no retry button or modal when everything is correct', async () => {
    stash([{ verb: gehen, input: 'go', correct: true }])
    const { wrapper } = await mountResult()
    expect(wrapper.findAll('button').some(b => b.text().includes('Retry'))).toBe(false)
    expect(wrapper.find('.retry-modal').exists()).toBe(false)
    expect(wrapper.text()).toContain('Alles richtig')
    wrapper.unmount()
  })

  it('retry stashes the wrong verbs + direction and routes to the runner', async () => {
    stash([
      { verb: gehen, input: 'gehen', correct: true },
      { verb: sehen, input: 'hören', correct: false }
    ], 'en-de')
    const { wrapper, router } = await mountResult()
    const push = vi.spyOn(router, 'push')

    const btn = wrapper.findAll('button').find(b => b.text().startsWith('Retry 1 wrong'))!
    await btn.trigger('click')

    const raw = sessionStorage.getItem('gt:verbTranslationRetry')
    expect(raw).toBeTruthy()
    const retry = JSON.parse(raw!)
    expect(retry.verbs.map((v: Verb) => v.german)).toEqual(['sehen'])
    expect(retry.direction).toBe('en-de')
    expect(push).toHaveBeenCalledWith(expect.objectContaining({
      name: 'verbs-translation-run',
      query: expect.objectContaining({ retry: '1' })
    }))
    wrapper.unmount()
  })

  it('defaults the retry direction to de-en for stashes without one', async () => {
    stash([{ verb: sehen, input: 'hear', correct: false }])
    const { wrapper } = await mountResult()
    wrapper.findAll('button').find(b => b.text().startsWith('Retry 1 wrong'))!.trigger('click')
    await flushPromises()
    const retry = JSON.parse(sessionStorage.getItem('gt:verbTranslationRetry')!)
    expect(retry.direction).toBe('de-en')
    wrapper.unmount()
  })
})
