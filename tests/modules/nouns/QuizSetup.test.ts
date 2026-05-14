import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { NMessageProvider } from 'naive-ui'
import QuizSetup from '../../../src/modules/nouns/QuizSetup.vue'

vi.mock('../../../src/composables/useNouns', () => ({
  useNouns: () => ({
    countsByGroup: async () => ({
      Office: 4, Work: 0, Furniture: 3, House: 0, Rooms: 0,
      Family: 0, School: 0, 'Bank & Money': 0, Food: 0, Other: 0
    })
  })
}))

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/quiz', name: 'nouns-quiz-run', component: { template: '<div />' } }
    ]
  })
}

async function mountSetup() {
  const router = makeRouter()
  const wrapper = mount(
    {
      components: { NMessageProvider, QuizSetup },
      render: () => h(NMessageProvider, null, { default: () => h(QuizSetup) })
    },
    { global: { plugins: [router] } }
  )
  await flushPromises()
  return { wrapper, router }
}

describe('QuizSetup — All preset', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear()
  })

  it('renders an "All" radio in the question-count group', async () => {
    const { wrapper } = await mountSetup()
    const labels = wrapper.findAll('label').map(l => l.text())
    expect(labels).toContain('All')
  })

  it('routes with count equal to total available nouns when All is selected', async () => {
    const { wrapper, router } = await mountSetup()
    const push = vi.spyOn(router, 'push')

    const allRadio = wrapper.findAll('label').find(l => l.text() === 'All')
    expect(allRadio).toBeTruthy()
    await allRadio!.find('input[type="radio"]').setValue()

    const startBtn = wrapper.findAll('button').find(b => b.text() === 'Start quiz')!
    await startBtn.trigger('click')

    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'nouns-quiz-run',
        query: expect.objectContaining({ count: '7' })
      })
    )
  })
})

describe('QuizSetup — Gender tips panel', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear()
  })

  it('renders the gender tips collapse header', async () => {
    const { wrapper } = await mountSetup()
    expect(wrapper.text()).toContain('Gender tips')
  })

  it('includes sub-sections for endings, semantic categories, compound rule, traps, plural', async () => {
    const { wrapper } = await mountSetup()
    // Expand the outer "Gender tips" panel so inner headers are mounted
    const tipsHeader = wrapper.find('.n-collapse-item__header-main')
    await tipsHeader.trigger('click')
    await flushPromises()
    const html = wrapper.html()
    expect(html).toContain('Endings')
    expect(html).toContain('Semantic categories')
    expect(html).toContain('Compound noun')
    expect(html).toContain('Traps')
    expect(html).toContain('Plural')
  })
})
