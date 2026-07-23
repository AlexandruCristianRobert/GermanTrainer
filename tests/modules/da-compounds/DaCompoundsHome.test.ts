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
    ],
  })
  await router.push({ name: 'dacompounds' })
  const wrapper = mount(DaCompoundsHome, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('DaCompoundsHome', () => {
  it('renders the module header and the Reference section', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.find('.section-title').text()).toContain('Da-Compounds')
    expect(wrapper.find('.group-heading').text()).toContain('Reference')
  })

  it('shows the cheatsheet card and navigates to it on click', async () => {
    const { wrapper, router } = await mountHome()
    const card = wrapper.find('.module-card')
    expect(card.text()).toContain('Cheatsheet')
    await card.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('dacompounds-cheatsheet')
  })
})
