import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DaCompoundsHome from '../../../src/modules/da-compounds/DaCompoundsHome.vue'
import { DAC_PHASES } from '../../../src/data/drillCatalogue'
import { NO_COMPOUND_PREPOSITIONS } from '../../../src/data/daCompounds'

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
      { path: '/da-compounds/wo-question', name: 'dacompounds-wo-question', component: { template: '<div />' } },
      { path: '/da-compounds/dialogue', name: 'dacompounds-dialogue', component: { template: '<div />' } },
      { path: '/da-compounds/korrelat', name: 'dacompounds-korrelat', component: { template: '<div />' } },
      { path: '/da-compounds/paraphrase', name: 'dacompounds-paraphrase', component: { template: '<div />' } },
      { path: '/da-compounds/contrast', name: 'dacompounds-contrast', component: { template: '<div />' } },
      { path: '/da-compounds/sentence', name: 'dacompounds-sentence', component: { template: '<div />' } },
      { path: '/da-compounds/assembly', name: 'dacompounds-assembly', component: { template: '<div />' } },
      { path: '/da-compounds/answer', name: 'dacompounds-answer', component: { template: '<div />' } },
      { path: '/da-compounds/homograph', name: 'dacompounds-homograph', component: { template: '<div />' } },
      { path: '/da-compounds/register', name: 'dacompounds-register', component: { template: '<div />' } },
      { path: '/da-compounds/relative', name: 'dacompounds-relative', component: { template: '<div />' } },
    ],
  })
  await router.push({ name: 'dacompounds' })
  const wrapper = mount(DaCompoundsHome, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

// Every card in the catalogue, flattened with its expected route — the
// authoritative facts this suite pins instead of positional group/card counts.
const ALL_CARDS = DAC_PHASES.flatMap(p => p.cards.map(c => ({ ...c, phaseId: p.id })))

describe('DaCompoundsHome', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('hides the weak-points panel when there is no dac-sentence history', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.find('.weak-card').exists()).toBe(false)
  })

  it('shows the weak-points panel in the marginalia when dac-sentence runs have misses', async () => {
    localStorage.setItem('gt:quizHistory', JSON.stringify([{
      id: 1, type: 'dac-sentence', startedAt: '', finishedAt: '', durationMs: 0, count: 2, correct: 0,
      meta: {
        dacSentenceItems: [
          { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', correct: false, tags: ['preposition'] },
          { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', correct: false, tags: ['preposition'] }
        ]
      }
    }]))
    const { wrapper } = await mountHome()
    const panel = wrapper.find('.dac-marg .weak-card')
    expect(panel.exists()).toBe(true)
    expect(panel.text()).toContain('warten')
    expect(panel.text()).toContain('auf')
  })

  it('renders the module header', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.find('.section-title').text()).toContain('Da-Compounds')
  })

  it('renders one phase group per DAC_PHASES entry, in order, when sorted Lehrgang', async () => {
    const { wrapper } = await mountHome()
    const phaseHeadings = wrapper.findAll('.dac-phase-t').map(h => h.text())
    expect(phaseHeadings).toEqual(DAC_PHASES.map(p => p.heading))
  })

  it('renders exactly 21 drill rows across the 9 phases', async () => {
    const { wrapper } = await mountHome()
    const rows = wrapper.findAll('.dac-lrow')
    expect(rows).toHaveLength(21)
    expect(ALL_CARDS).toHaveLength(21)
  })

  it('every row is a real <button> element', async () => {
    const { wrapper } = await mountHome()
    const rows = wrapper.findAll('.dac-lrow')
    for (const row of rows) {
      expect(row.element.tagName).toBe('BUTTON')
    }
  })

  it.each(ALL_CARDS.filter(c => !c.query).map(c => [c.code, c.title, c.route] as const))(
    'card %s (%s) pushes route %s on click',
    async (code, _title, route) => {
      const { wrapper, router } = await mountHome()
      const row = wrapper.findAll('.dac-lrow').find(r => r.find('.dac-num').text() === code)
      expect(row, `row for ${code} not found`).toBeTruthy()
      await row!.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.name).toBe(route)
    },
  )

  it('T14 and T15 push the same route with different ?direction= queries', async () => {
    const { wrapper, router } = await mountHome()
    const rows = wrapper.findAll('.dac-lrow')
    const t14 = rows.find(r => r.find('.dac-num').text() === 'T14')
    const t15 = rows.find(r => r.find('.dac-num').text() === 'T15')
    expect(t14).toBeTruthy()
    expect(t15).toBeTruthy()

    await t14!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('dacompounds-sentence')
    expect(router.currentRoute.value.query.direction).toBe('en-de')

    await t15!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('dacompounds-sentence')
    expect(router.currentRoute.value.query.direction).toBe('de-en')
  })

  it('the search box filters rows by title/German/description/code and updates the count', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.find('.dac-count').text()).toContain('21 von 21')

    const input = wrapper.find('.dac-search input')
    await input.setValue('Homograph')
    await flushPromises()

    expect(wrapper.find('.dac-count').text()).toContain('1 von 21')
    expect(wrapper.findAll('.dac-lrow')).toHaveLength(1)
    expect(wrapper.find('.dac-lrow').text()).toContain('Homographs')
  })

  it('matches on drill code too, and clearing the search restores all 21 rows', async () => {
    const { wrapper } = await mountHome()
    const input = wrapper.find('.dac-search input')

    await input.setValue('T14')
    await flushPromises()
    expect(wrapper.findAll('.dac-lrow')).toHaveLength(1)

    await input.setValue('')
    await flushPromises()
    expect(wrapper.findAll('.dac-lrow')).toHaveLength(21)
    expect(wrapper.find('.dac-count').text()).toContain('21 von 21')
  })

  it('shows the empty state with a working clear-search action when nothing matches', async () => {
    const { wrapper } = await mountHome()
    const input = wrapper.find('.dac-search input')
    await input.setValue('nonexistent-drill-xyz')
    await flushPromises()

    expect(wrapper.find('.dac-empty').exists()).toBe(true)
    expect(wrapper.findAll('.dac-lrow')).toHaveLength(0)

    await wrapper.find('.dac-empty button').trigger('click')
    await flushPromises()

    expect(wrapper.find('.dac-empty').exists()).toBe(false)
    expect(wrapper.findAll('.dac-lrow')).toHaveLength(21)
  })

  it('the sort toggle groups all rows under one synthetic "weakest first" phase', async () => {
    const { wrapper } = await mountHome()
    const weakButton = wrapper.findAll('.dac-sort button').find(b => b.text() === 'Schwächste')
    expect(weakButton).toBeTruthy()

    await weakButton!.trigger('click')
    await flushPromises()

    const phases = wrapper.findAll('.dac-phase')
    expect(phases).toHaveLength(1)
    expect(wrapper.find('.dac-phase-t').text()).toBe('Weakest first')
    expect(wrapper.findAll('.dac-lrow')).toHaveLength(21)
    expect(weakButton!.classes()).toContain('active')
  })

  it('the masthead "sort weakest first" button also switches the sort mode', async () => {
    const { wrapper } = await mountHome()
    const bars = wrapper.findAll('.dac-bars .dac-bar')
    expect(bars.length).toBeGreaterThan(0)
    expect(bars.length).toBeLessThanOrEqual(3)

    const sortButton = wrapper.findAll('.dac-mh-side button').find(b => b.text().includes('Sort weakest first'))
    expect(sortButton).toBeTruthy()
    await sortButton!.trigger('click')
    await flushPromises()

    expect(wrapper.find('.dac-phase-t').text()).toBe('Weakest first')
  })

  it('mounts the live formation formula widget in the masthead', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.find('.dac-formula').exists()).toBe(true)
    expect(wrapper.find('.dac-sum-num').exists()).toBe(true)
  })

  it('renders the untouched mastery state when history is empty: dots for drills, ref for the cheatsheet', async () => {
    const { wrapper } = await mountHome()
    const t1Row = wrapper.findAll('.dac-lrow').find(r => r.find('.dac-num').text() === 'T1')
    expect(t1Row!.find('.mdot').exists()).toBe(true)
    expect(t1Row!.find('.mdot i.on').exists()).toBe(false)

    const cheatsheetRow = wrapper.findAll('.dac-lrow').find(r => r.find('.dac-num').text() === 'A')
    expect(cheatsheetRow!.text()).toContain('ref')
  })

  it('renders the marginalia keys from the real daCompounds.ts data', async () => {
    const { wrapper } = await mountHome()
    const nolistChips = wrapper.findAll('.dac-nolist span')
    expect(nolistChips).toHaveLength(NO_COMPOUND_PREPOSITIONS.length)
    expect(nolistChips.map(c => c.text())).toEqual([...NO_COMPOUND_PREPOSITIONS])

    expect(wrapper.findAll('.dac-krow')).toHaveLength(3)
    expect(wrapper.find('.dac-vs').text()).toContain('Sache')
    expect(wrapper.find('.dac-vs').text()).toContain('Person')
  })

  it('still shows the cheatsheet row in the Reference phase and navigates to it on click', async () => {
    const { wrapper, router } = await mountHome()
    const cheatsheetRow = wrapper.findAll('.dac-lrow').find(r => r.text().includes('Cheatsheet'))
    expect(cheatsheetRow).toBeTruthy()
    await cheatsheetRow!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('dacompounds-cheatsheet')
  })
})
