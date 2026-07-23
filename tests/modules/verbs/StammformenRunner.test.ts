import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import StammformenRunner from '../../../src/modules/verbs/StammformenRunner.vue'

// Stub useBreakpoint so the component doesn't call window.matchMedia in jsdom
vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/verbs/stammformen/run', name: 'verbs-stammformen-run', component: { template: '<div />' } },
      { path: '/verbs/stammformen', name: 'verbs-stammformen', component: { template: '<div />' } },
      { path: '/verbs', name: 'verbs', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  // Navigate to the run route with query params
  await router.push({ name: 'verbs-stammformen-run', query })
  const wrapper = mount(StammformenRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('StammformenRunner — smoke tests', () => {
  it('renders a card with the verb infinitive', async () => {
    // Use A1, irregular verbs — gehen is always available
    const { wrapper } = await mountRunner({
      levels: 'A1',
      types: 'irregular',
      count: '1',
    })
    // The card should show some verb name (the page renders)
    expect(wrapper.find('.stammformen-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows Präteritum and Partizip II input fields before submit', async () => {
    const { wrapper } = await mountRunner({
      levels: 'A1',
      types: 'irregular',
      count: '1',
    })
    expect(wrapper.find('.input-praeteritum').exists()).toBe(true)
    expect(wrapper.find('.input-partizip').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows haben and sein buttons', async () => {
    const { wrapper } = await mountRunner({
      levels: 'A1',
      types: 'irregular',
      count: '1',
    })
    const buttons = wrapper.findAll('button')
    const habenBtn = buttons.find(b => b.text() === 'haben')
    const seinBtn = buttons.find(b => b.text() === 'sein')
    expect(habenBtn).toBeTruthy()
    expect(seinBtn).toBeTruthy()
    wrapper.unmount()
  })

  it('reveals feedback after Submit is clicked', async () => {
    const { wrapper } = await mountRunner({
      levels: 'A1',
      types: 'irregular',
      count: '1',
    })
    // Click 'sein' to pick an aux (ensures form is valid)
    const seinBtn = wrapper.findAll('button').find(b => b.text() === 'sein')
    await seinBtn!.trigger('click')

    // Find Submit button
    const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    await submitBtn!.trigger('click')

    // After submit, feedback section should be visible (class stammf-feedback)
    expect(wrapper.find('.stammf-feedback').exists()).toBe(true)
    wrapper.unmount()
  })

  it('Handles count=0 gracefully', async () => {
    // count=0 → Math.max(1, 0) = 1, so one quiz item is still loaded
    const { wrapper } = await mountRunner({
      levels: 'A1',
      types: 'irregular',
      count: '0',
    })
    // The quiz stage should still render (not an error state)
    expect(wrapper.find('.stammformen-stage').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('StammformenRunner — history recording (ADR-0010)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  async function completeOneCardWrong(wrapper: Awaited<ReturnType<typeof mountRunner>>['wrapper']) {
    await wrapper.find('.input-praeteritum').setValue('xxx')   // guaranteed-wrong Präteritum
    const sein = wrapper.findAll('button').find(b => b.text() === 'sein')
    await sein!.trigger('click')
    const submit = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    await submit!.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes', async () => {
    const { wrapper } = await mountRunner({ levels: 'A1', types: 'irregular', count: '1' })
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'verb-stammformen',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({ levels: ['A1'], types: ['irregular'] }),
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner({ levels: 'A1', types: 'irregular', count: '1' })
    await completeOneCardWrong(wrapper)
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
