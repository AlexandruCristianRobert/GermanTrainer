import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import LexicalSetup from '../../../src/modules/direction-words/LexicalSetup.vue'
import { filterLexicalItems } from '../../../src/composables/useDwLexicalQuiz'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/direction-words', name: 'directionwords', component: { template: '<div />' } },
      { path: '/direction-words/lexical', name: 'directionwords-lexical', component: { template: '<div />' } },
      { path: '/direction-words/lexical/run', name: 'directionwords-lexical-run', component: { template: '<div />' } },
    ],
  })
}

async function mountSetup() {
  const router = makeRouter()
  await router.push({ name: 'directionwords-lexical' })
  const wrapper = mount(LexicalSetup, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

const DEFAULT_AVAILABLE = filterLexicalItems({ levels: ['B1', 'B2'] }).length

describe('LexicalSetup', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to the B1 + B2 level chips', async () => {
    const { wrapper } = await mountSetup()
    const selected = wrapper.findAll('.chip').filter(c => c.classes().includes('selected'))
    expect(selected.map(c => c.text())).toEqual(['B1', 'B2'])
    expect(wrapper.find('.count-avail').text()).toContain(String(DEFAULT_AVAILABLE))
    wrapper.unmount()
  })

  it('starts the run with the selected levels and the capped count', async () => {
    const { wrapper, router } = await mountSetup()
    await wrapper.find('.btn-accent').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('directionwords-lexical-run')
    expect(router.currentRoute.value.query).toEqual({
      count: String(Math.min(10, DEFAULT_AVAILABLE)),
      levels: 'B1,B2',
    })
    wrapper.unmount()
  })

  // The bank carries no A2 content, so A2-only is a reachable zero-item state:
  // it must warn and refuse to start, never launch an empty round.
  it('warns and disables Start when only A2 is selected (the bank has no A2 items)', async () => {
    const { wrapper } = await mountSetup()
    const none = wrapper.findAll('.field-actions .btn').find(b => b.text() === 'None')!
    await none.trigger('click')
    const a2 = wrapper.findAll('.chip').find(c => c.text() === 'A2')!
    await a2.trigger('click')
    await flushPromises()

    expect(filterLexicalItems({ levels: ['A2'] })).toEqual([])
    expect(wrapper.find('.count-avail').text()).toContain('0')
    expect(wrapper.find('.alert-warning').exists()).toBe(true)
    expect(wrapper.find('.btn-accent').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})
