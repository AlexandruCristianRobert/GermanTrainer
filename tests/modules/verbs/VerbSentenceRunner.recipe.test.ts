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

function spec(index: number, tense: VerbSentenceSpec['tense']): VerbSentenceSpec {
  return { index, verbs: [{ german: 'kaufen', english: 'buy', level: 'A1', case: 'accusative' }], nouns: [], tense }
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

function genResponse(index = 0) {
  return { text: JSON.stringify({ items: [{
    index, english: 'The cake is bought.', german: 'Der Kuchen wird gekauft.',
    verbSpansEn: ['is bought'], nounSpansEn: [], extraWords: []
  }] }) }
}

let wrapper: ReturnType<typeof mount> | null = null
beforeEach(() => { sessionStorage.clear(); generateContentMock.mockReset() })
afterEach(() => { wrapper?.unmount(); wrapper = null })

async function mountRunner(stash: object) {
  sessionStorage.setItem(STASH_KEY, JSON.stringify(stash))
  const router = makeRouter()
  await router.push({ name: 'verbs-sentence-run' })
  wrapper = mount(VerbSentenceRunner, { global: { plugins: [router] } , attachTo: document.body })
  for (let i = 0; i < 40; i++) {
    await flushPromises()
    if (!wrapper.find('.loading-state').exists()) break
  }
  return wrapper
}

function altR() {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'R', altKey: true, bubbles: true }))
}

describe('VerbSentenceRunner tense recipe', () => {
  it('flips the badge to formula and example on click', async () => {
    generateContentMock.mockResolvedValue(genResponse())
    const w = await mountRunner({ specs: [spec(0, 'passivPraesens')], level: 'A1' })

    expect(w.find('.tense-badge').text()).toBe('Passiv Präsens')
    await w.find('.tense-badge').trigger('click')
    expect(w.find('.tense-badge').text()).toContain('wird + Partizip II')
    expect(w.find('.tense-badge').text()).toContain('wird gekauft')
  })

  it('flips back on a second click', async () => {
    generateContentMock.mockResolvedValue(genResponse())
    const w = await mountRunner({ specs: [spec(0, 'passivPraesens')], level: 'A1' })

    await w.find('.tense-badge').trigger('click')
    await w.find('.tense-badge').trigger('click')
    expect(w.find('.tense-badge').text()).toBe('Passiv Präsens')
  })

  it('reveals while hovered and hides again on leave', async () => {
    generateContentMock.mockResolvedValue(genResponse())
    const w = await mountRunner({ specs: [spec(0, 'passivPraesens')], level: 'A1' })

    await w.find('.tense-badge').trigger('mouseenter')
    expect(w.find('.tense-badge').text()).toContain('wird gekauft')
    await w.find('.tense-badge').trigger('mouseleave')
    expect(w.find('.tense-badge').text()).toBe('Passiv Präsens')
  })

  it('flips on Alt+R while the answer input has focus', async () => {
    generateContentMock.mockResolvedValue(genResponse())
    const w = await mountRunner({ specs: [spec(0, 'passivPraesens')], level: 'A1' })

    const input = w.find('input.prep-input').element as HTMLInputElement
    input.focus()
    altR()
    await flushPromises()
    expect(w.find('.tense-badge').text()).toContain('wird gekauft')

    altR()
    await flushPromises()
    expect(w.find('.tense-badge').text()).toBe('Passiv Präsens')
  })

  it('does not swallow a plain capital R typed into the answer', async () => {
    generateContentMock.mockResolvedValue(genResponse())
    const w = await mountRunner({ specs: [spec(0, 'passivPraesens')], level: 'A1' })

    const input = w.find('input.prep-input')
    ;(input.element as HTMLInputElement).focus()
    const ev = new KeyboardEvent('keydown', { code: 'KeyR', key: 'R', shiftKey: true, bubbles: true, cancelable: true })
    input.element.dispatchEvent(ev)
    await flushPromises()
    expect(ev.defaultPrevented).toBe(false)
    expect(w.find('.tense-badge').text()).toBe('Passiv Präsens')
  })

  it('resets the flip when the next sentence arrives', async () => {
    generateContentMock
      .mockResolvedValueOnce(genResponse(0))                            // batch 1
      .mockResolvedValueOnce(genResponse(1))                            // batch 2
      .mockResolvedValue({ text: JSON.stringify({ correct: true }) })   // grading
    const w = await mountRunner({ specs: [spec(0, 'passivPraesens'), spec(1, 'passivPraesens')], level: 'A1' })

    await w.find('.tense-badge').trigger('click')
    expect(w.find('.tense-badge').text()).toContain('wird gekauft')

    await w.find('input.prep-input').setValue('Der Kuchen wird gekauft.')
    await w.find('form.prep-input-wrap').trigger('submit')
    await flushPromises()
    await w.findAll('button').find(b => b.text().includes('Next'))!.trigger('click')
    await flushPromises()

    expect(w.find('.tense-badge').text()).toBe('Passiv Präsens')
  })

  it('has no badge and ignores Alt+R for an untensed sentence', async () => {
    generateContentMock.mockResolvedValue(genResponse())
    const w = await mountRunner({ specs: [spec(0, undefined)], level: 'A1' })

    altR()
    await flushPromises()
    expect(w.find('.tense-badge').exists()).toBe(false)
  })
})
