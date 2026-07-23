import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DaCompoundsCheatsheet from '../../../src/modules/da-compounds/DaCompoundsCheatsheet.vue'
import {
  DA_COMPOUND_PREPOSITIONS, NO_COMPOUND_PREPOSITIONS, THING_VS_PERSON, KORRELAT,
} from '../../../src/data/daCompounds'

async function mountSheet() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
      { path: '/da-compounds/cheatsheet', name: 'dacompounds-cheatsheet', component: { template: '<div />' } },
    ],
  })
  await router.push({ name: 'dacompounds-cheatsheet' })
  const wrapper = mount(DaCompoundsCheatsheet, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('DaCompoundsCheatsheet', () => {
  it('renders all four chapters', async () => {
    const wrapper = await mountSheet()
    for (const id of ['dac-formation', 'dac-none', 'dac-person', 'dac-korrelat'])
      expect(wrapper.find(`#${id}`).exists()).toBe(true)
  })

  it('formation table has one row per compoundable preposition, with derived forms', async () => {
    const wrapper = await mountSheet()
    const rows = wrapper.findAll('.dac-table tbody tr')
    expect(rows.length).toBe(DA_COMPOUND_PREPOSITIONS.length)
    expect(wrapper.find('.dac-table').text()).toContain('darüber')
    expect(wrapper.find('.dac-table').text()).toContain('worüber')
    expect(wrapper.find('.dac-table').text()).toContain('dafür')
  })

  it('lists every no-compound trap preposition', async () => {
    const wrapper = await mountSheet()
    const text = wrapper.find('#dac-none').text()
    for (const p of NO_COMPOUND_PREPOSITIONS) expect(text).toContain(p)
  })

  it('renders the things-vs-people pairs and the Korrelat lists', async () => {
    const wrapper = await mountSheet()
    expect(wrapper.findAll('#dac-person .dac-pair').length).toBe(THING_VS_PERSON.length)
    const korrelat = wrapper.find('#dac-korrelat').text()
    expect(korrelat).toContain(KORRELAT.obligatory[0].example)
    expect(korrelat).toContain(KORRELAT.excluded[0].expression)
  })

  it('has a back link to the module home', async () => {
    const wrapper = await mountSheet()
    expect(wrapper.find('.back-link').exists()).toBe(true)
  })
})
