import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import PrepositionCheatsheet from '../../../src/modules/prepositions/PrepositionCheatsheet.vue'
import { PREP_CHEATSHEET, allCheatsheetIds, collocation } from '../../../src/data/prepCheatsheet'
import { COLLOCATIONS } from '../../../src/data/collocations'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/prepositions/cheatsheet', name: 'prepositions-cheatsheet', component: PrepositionCheatsheet },
      { path: '/prepositions', name: 'prepositions', component: { template: '<div />' } },
    ],
  })
}

async function mountSheet() {
  const router = makeRouter()
  await router.push({ name: 'prepositions-cheatsheet' })
  const wrapper = mount(PrepositionCheatsheet, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('prepCheatsheet data', () => {
  it('every featured collocation id exists in the drill data', () => {
    const missing = allCheatsheetIds().filter(id => !collocation(id))
    expect(missing).toEqual([])
  })

  it('a featured example resolves to its collocation, matching preposition + case', () => {
    for (const ch of PREP_CHEATSHEET) {
      for (const group of ch.groups) {
        for (const id of group.ids) {
          const c = collocation(id)!
          expect(c.preposition).toBe(ch.prep)
          expect(c.case).toBe(group.case)
        }
      }
    }
  })

  it('chapter ids and numerals are unique', () => {
    const ids = PREP_CHEATSHEET.map(c => c.id)
    const numerals = PREP_CHEATSHEET.map(c => c.numeral)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(numerals).size).toBe(numerals.length)
  })

  it('covers every preposition present in the collocation data', () => {
    const dataPreps = new Set(COLLOCATIONS.map(c => c.preposition))
    const sheetPreps = new Set(PREP_CHEATSHEET.map(c => c.prep))
    const uncovered = [...dataPreps].filter(p => !sheetPreps.has(p))
    expect(uncovered).toEqual([])
  })
})

describe('PrepositionCheatsheet — smoke', () => {
  it('renders a chapter per preposition with its title', async () => {
    const wrapper = await mountSheet()
    const titles = wrapper.findAll('.prep-title').map(n => n.text())
    expect(titles).toContain('über')
    expect(titles).toContain('nach')
    expect(titles.length).toBe(PREP_CHEATSHEET.length)
    wrapper.unmount()
  })

  it('shows a memory-hook callout where one is defined (e.g. the an split)', async () => {
    const wrapper = await mountSheet()
    const anSection = wrapper.find('#prep-an')
    expect(anSection.exists()).toBe(true)
    expect(anSection.find('.callout').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders featured collocations with their glosses', async () => {
    const wrapper = await mountSheet()
    const text = wrapper.find('#prep-nach').text()
    expect(text).toContain('suchen')
    expect(text).toContain('to search for')
    wrapper.unmount()
  })
})
