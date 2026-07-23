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
      { path: '/da-compounds/match', name: 'dacompounds-match', component: { template: '<div />' } },
      { path: '/da-compounds/substitution', name: 'dacompounds-substitution', component: { template: '<div />' } },
      { path: '/da-compounds/neighbors', name: 'dacompounds-neighbors', component: { template: '<div />' } },
      { path: '/da-compounds/case', name: 'dacompounds-case', component: { template: '<div />' } },
      { path: '/da-compounds/pronoun-case', name: 'dacompounds-pronoun-case', component: { template: '<div />' } },
      { path: '/da-compounds/article', name: 'dacompounds-article', component: { template: '<div />' } },
      { path: '/da-compounds/transform', name: 'dacompounds-transform', component: { template: '<div />' } },
    ],
  })
  await router.push({ name: 'dacompounds' })
  const wrapper = mount(DaCompoundsHome, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('DaCompoundsHome', () => {
  it('renders the module header, the Formation basics, Compound recall, Case tests, People vs things, and Reference groups', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.find('.section-title').text()).toContain('Da-Compounds')
    const headings = wrapper.findAll('.group-heading').map(h => h.text())
    expect(headings[0]).toContain('Formation basics')
    expect(headings[1]).toContain('Compound recall')
    expect(headings[2]).toContain('Case tests')
    expect(headings[3]).toContain('People vs things')
    expect(headings[4]).toContain('Reference')
  })

  it('shows the T8 transform card in the People vs things group and navigates on click', async () => {
    const { wrapper, router } = await mountHome()
    const group = wrapper.findAll('.module-grid')[3]
    const groupCards = group.findAll('.module-card')
    expect(groupCards).toHaveLength(1)
    expect(groupCards[0].text()).toContain('Thing or person?')
    await groupCards[0].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('dacompounds-transform')
  })

  it('shows the T5 case-pick card in the Case tests group and navigates on click', async () => {
    const { wrapper, router } = await mountHome()
    const cards = wrapper.findAll('.module-card')
    const caseCard = cards.find(c => c.text().includes('Case pick'))
    expect(caseCard).toBeTruthy()
    await caseCard!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('dacompounds-case')
  })

  it('shows the T6 pronoun-case card in the Case tests group right after T5 and navigates on click', async () => {
    const { wrapper, router } = await mountHome()
    const caseGroup = wrapper.findAll('.module-grid')[2]
    const groupCards = caseGroup.findAll('.module-card')
    expect(groupCards).toHaveLength(3)
    expect(groupCards[0].text()).toContain('Case pick')
    expect(groupCards[1].text()).toContain('Pronoun case')
    await groupCards[1].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('dacompounds-pronoun-case')
  })

  it('shows the T7 article-fill card in the Case tests group right after T6 and navigates on click', async () => {
    const { wrapper, router } = await mountHome()
    const caseGroup = wrapper.findAll('.module-grid')[2]
    const groupCards = caseGroup.findAll('.module-card')
    expect(groupCards).toHaveLength(3)
    expect(groupCards[2].text()).toContain('Article fill')
    await groupCards[2].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('dacompounds-article')
  })

  it('shows the T3 and T4 cards in the Compound recall group and navigates on click', async () => {
    const { wrapper, router } = await mountHome()
    const cards = wrapper.findAll('.module-card')
    const gapFillCard = cards.find(c => c.text().includes('Gap-fill'))
    const neighborsCard = cards.find(c => c.text().includes('Near neighbors'))
    expect(gapFillCard).toBeTruthy()
    expect(neighborsCard).toBeTruthy()
    await gapFillCard!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('dacompounds-substitution')
  })

  it('shows the T1 formation card first and navigates to it on click', async () => {
    const { wrapper, router } = await mountHome()
    const card = wrapper.find('.module-card')
    expect(card.text()).toContain('da- or dar-?')
    await card.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('dacompounds-formation')
  })

  it('shows the T2 matching card right after T1 in Formation basics and navigates to it on click', async () => {
    const { wrapper, router } = await mountHome()
    const groupCards = wrapper.findAll('.module-grid')[0].findAll('.module-card')
    expect(groupCards).toHaveLength(2)
    expect(groupCards[0].text()).toContain('da- or dar-?')
    expect(groupCards[1].text()).toContain('Matching')
    await groupCards[1].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('dacompounds-match')
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
