import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DirectionWordsHome from '../../../src/modules/direction-words/DirectionWordsHome.vue'

async function mountHome() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/direction-words', name: 'directionwords', component: { template: '<div />' } },
      { path: '/direction-words/cheatsheet', name: 'directionwords-cheatsheet', component: { template: '<div />' } },
      { path: '/direction-words/hin-her', name: 'directionwords-hinher', component: { template: '<div />' } },
    ],
  })
  await router.push({ name: 'directionwords' })
  const wrapper = mount(DirectionWordsHome, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('DirectionWordsHome', () => {
  it('renders the module header and the Reference section', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.find('.section-title').text()).toContain('Direction Words')
    const headings = wrapper.findAll('.group-heading').map(h => h.text())
    expect(headings.some(h => h.includes('Reference'))).toBe(true)
  })

  it('shows the T1 hin/her card and navigates to it on click', async () => {
    const { wrapper, router } = await mountHome()
    const cards = wrapper.findAll('.module-card')
    const card = cards.find(c => c.text().includes('Hin or her?'))
    expect(card).toBeTruthy()
    await card!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('directionwords-hinher')
  })

  it('shows the cheatsheet card and navigates to it on click', async () => {
    const { wrapper, router } = await mountHome()
    const cards = wrapper.findAll('.module-card')
    const card = cards.find(c => c.text().includes('Cheatsheet'))
    expect(card).toBeTruthy()
    await card!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('directionwords-cheatsheet')
  })
})
