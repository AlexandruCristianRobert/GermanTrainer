import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DaCompoundsHome from '../../../src/modules/da-compounds/DaCompoundsHome.vue'

async function mountHome() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
      { path: '/da-compounds/cheatsheet', name: 'dacompounds-cheatsheet', component: { template: '<div />' } },
      { path: '/da-compounds/formation', name: 'dacompounds-formation', component: { template: '<div />' } },
    ],
  })
  await router.push({ name: 'dacompounds' })
  const wrapper = mount(DaCompoundsHome, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('DaCompoundsHome', () => {
  it('renders the module header, the Formation basics group, and the Reference section', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.find('.section-title').text()).toContain('Da-Compounds')
    const headings = wrapper.findAll('.group-heading').map(h => h.text())
    expect(headings[0]).toContain('Formation basics')
    expect(headings[1]).toContain('Reference')
  })

  it('shows the T1 formation card first and navigates to it on click', async () => {
    const { wrapper, router } = await mountHome()
    const card = wrapper.find('.module-card')
    expect(card.text()).toContain('da- or dar-?')
    await card.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('dacompounds-formation')
  })

  it('still shows the cheatsheet card in the Reference group and navigates to it on click', async () => {
    const { wrapper, router } = await mountHome()
    const cards = wrapper.findAll('.module-card')
    const cheatsheetCard = cards.find(c => c.text().includes('Cheatsheet'))
    expect(cheatsheetCard).toBeTruthy()
    await cheatsheetCard!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('dacompounds-cheatsheet')
  })
})
