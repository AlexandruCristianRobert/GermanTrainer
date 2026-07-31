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
  it('renders all four chapters as plates', async () => {
    const wrapper = await mountSheet()
    for (const id of ['dac-formation', 'dac-none', 'dac-person', 'dac-korrelat']) {
      const section = wrapper.find(`#${id}`)
      expect(section.exists()).toBe(true)
      expect(section.classes()).toContain('plate')
    }
  })

  it('formation table has one row per compoundable preposition, with derived forms', async () => {
    const wrapper = await mountSheet()
    const table = wrapper.find('#dac-formation .mini-table')
    const rows = table.findAll('tbody tr')
    expect(rows.length).toBe(DA_COMPOUND_PREPOSITIONS.length)
    expect(table.text()).toContain('darüber')
    expect(table.text()).toContain('worüber')
    expect(table.text()).toContain('dafür')
  })

  it('lists every no-compound trap preposition, both as chips and in the detail table', async () => {
    const wrapper = await mountSheet()
    const chips = wrapper.findAll('#dac-none .dac-nolist span')
    expect(chips.length).toBe(NO_COMPOUND_PREPOSITIONS.length)
    const text = wrapper.find('#dac-none').text()
    for (const p of NO_COMPOUND_PREPOSITIONS) expect(text).toContain(p)
  })

  it('renders the things-vs-people pairs and the Korrelat columns', async () => {
    const wrapper = await mountSheet()
    expect(wrapper.findAll('#dac-person .mini-table tbody tr').length).toBe(THING_VS_PERSON.length)

    const cols = wrapper.findAll('#dac-korrelat .k-cols .k-col')
    expect(cols.length).toBe(3)
    expect(cols[0].find('.k-h').text()).toContain('obligatorisch')
    expect(cols[1].find('.k-h').text()).toContain('fakultativ')
    expect(cols[2].find('.k-h').text()).toContain('ausgeschlossen')
    expect(cols[0].findAll('.k-e').length).toBe(KORRELAT.obligatory.length)
    expect(cols[1].findAll('.k-e').length).toBe(KORRELAT.optional.length)
    expect(cols[2].findAll('.k-e').length).toBe(KORRELAT.excluded.length)

    const korrelat = wrapper.find('#dac-korrelat').text()
    expect(korrelat).toContain(KORRELAT.obligatory[0].example)
    expect(korrelat).toContain(KORRELAT.excluded[0].expression)
  })

  it('has a back link to the module home', async () => {
    const wrapper = await mountSheet()
    expect(wrapper.find('.back-link').exists()).toBe(true)
  })
})
