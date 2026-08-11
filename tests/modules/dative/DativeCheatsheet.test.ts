import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DativeCheatsheet from '../../../src/modules/dative/DativeCheatsheet.vue'
import { TWIN_PAIRS } from '../../../src/data/dativeTwins'
import { DATIVE_ADJECTIVE_KEYS } from '../../../src/data/dativeAdjectives'

function makeRouter() {
  const stub = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dative/cheatsheet', name: 'dative-cheatsheet', component: stub },
      { path: '/dative', name: 'dative', component: stub },
      { path: '/prepositions', name: 'prepositions', component: stub },
      { path: '/prepositions/cheatsheet', name: 'prepositions-cheatsheet', component: stub },
      { path: '/declension', name: 'declension', component: stub },
      { path: '/verbs', name: 'verbs', component: stub },
    ],
  })
}

describe('DativeCheatsheet (card A)', () => {
  it('renders the ten plates with the load-bearing rules, tables, and cross-links', async () => {
    const router = makeRouter()
    await router.push({ name: 'dative-cheatsheet' })
    const wrapper = mount(DativeCheatsheet, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.findAll('.plate').length).toBeGreaterThanOrEqual(10)
    const text = wrapper.text()
    // The passive rule, both sides of it.
    expect(text).toContain('Mir wird geholfen')
    expect(text).toContain('Ich werde geholfen')
    // Object order, derived through objectOrderAnswer.
    expect(text).toContain('Ich gebe dem Kind das Buch')
    expect(text).toContain('Ich gebe es ihm')
    // Swallowed-accusative table and the twin table (from the phase 1/3 banks).
    expect(text).toContain('danken')
    for (const p of TWIN_PAIRS) expect(text).toContain(p.dativeVerb)
    // Adjectives listed from the side-table.
    for (const k of DATIVE_ADJECTIVE_KEYS.slice(0, 3)) expect(text).toContain(k)
    // The free-dative readings.
    expect(text).toContain('commodi')
    expect(text).toContain('Sei mir bloß vorsichtig!')

    // Cross-links out (the spec's Scope table): Prepositions + Declension.
    const hrefs = wrapper.findAll('a').map(a => a.attributes('href'))
    expect(hrefs).toContain('/prepositions/cheatsheet')
    expect(hrefs).toContain('/declension')
  })
})
