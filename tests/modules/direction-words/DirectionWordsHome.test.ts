import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DirectionWordsHome from '../../../src/modules/direction-words/DirectionWordsHome.vue'
import { DW_FAMILIES } from '../../../src/data/drillCatalogue'
import { ADVERB_PAIRS } from '../../../src/data/directionWords'

async function mountHome() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/direction-words', name: 'directionwords', component: { template: '<div />' } },
      { path: '/direction-words/cheatsheet', name: 'directionwords-cheatsheet', component: { template: '<div />' } },
      { path: '/direction-words/hin-her', name: 'directionwords-hinher', component: { template: '<div />' } },
      { path: '/direction-words/compounds', name: 'directionwords-compounds', component: { template: '<div />' } },
      { path: '/direction-words/questions', name: 'directionwords-questions', component: { template: '<div />' } },
      { path: '/direction-words/register', name: 'directionwords-register', component: { template: '<div />' } },
      { path: '/direction-words/assembly', name: 'directionwords-assembly', component: { template: '<div />' } },
      { path: '/direction-words/sentence', name: 'directionwords-sentence', component: { template: '<div />' } },
      { path: '/direction-words/answer', name: 'directionwords-answer', component: { template: '<div />' } },
      { path: '/direction-words/lexical', name: 'directionwords-lexical', component: { template: '<div />' } },
      { path: '/direction-words/idioms', name: 'directionwords-idioms', component: { template: '<div />' } },
    ],
  })
  await router.push({ name: 'directionwords' })
  const wrapper = mount(DirectionWordsHome, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

// Every card in the catalogue, flattened with its expected route — the
// authoritative fact this suite pins instead of positional group/card counts.
const ALL_CARDS = DW_FAMILIES.flatMap(f => f.cards.map(c => ({ ...c, familyId: f.id })))

describe('DirectionWordsHome', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('renders the module header', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.find('.section-title').text()).toContain('Direction Words')
  })

  it('renders one panel per family, headed by its numeral/title/German name', async () => {
    const { wrapper } = await mountHome()
    const panels = wrapper.findAll('.dw-panel')
    expect(panels).toHaveLength(7)
    const headings = wrapper.findAll('.dw-panel-t').map(h => h.text())
    expect(headings).toEqual(DW_FAMILIES.map(f => f.heading))
  })

  it('renders exactly 10 drill rows across the 7 panels', async () => {
    const { wrapper } = await mountHome()
    const rows = wrapper.findAll('.dw-row')
    expect(rows).toHaveLength(10)
    expect(ALL_CARDS).toHaveLength(10)
  })

  it('every row is a real <button> element', async () => {
    const { wrapper } = await mountHome()
    const rows = wrapper.findAll('.dw-row')
    for (const row of rows) {
      expect(row.element.tagName).toBe('BUTTON')
    }
  })

  it.each(ALL_CARDS.map(c => [c.code, c.title, c.route] as const))(
    'card %s (%s) pushes route %s on click',
    async (code, _title, route) => {
      const { wrapper, router } = await mountHome()
      const row = wrapper.findAll('.dw-row').find(r => r.find('.dw-code').text() === code)
      expect(row, `row for ${code} not found`).toBeTruthy()
      await row!.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.name).toBe(route)
    },
  )

  it('renders the pairs axis table with all six her/hin twins from ADVERB_PAIRS', async () => {
    const { wrapper } = await mountHome()
    const pairsPanel = wrapper.find('#dwfam-pairs')
    expect(pairsPanel.exists()).toBe(true)
    const axisRows = pairsPanel.findAll('.dw-axis-row')
    expect(axisRows).toHaveLength(ADVERB_PAIRS.length)

    const first = ADVERB_PAIRS[0]
    expect(axisRows[0].find('.dw-af.her').text()).toBe('her' + first.element)
    expect(axisRows[0].find('.dw-af.hin').text()).toBe('hin' + first.element)
    expect(axisRows[0].find('.dw-ae').text()).toBe(`-${first.element}`)

    const noRFormIndex = ADVERB_PAIRS.findIndex(p => p.rForm === null)
    expect(axisRows[noRFormIndex].find('.dw-ar').classes()).toContain('none')
  })

  it('shows each family blurb, verbatim from the catalogue, in its panel', async () => {
    const { wrapper } = await mountHome()
    const withBlurb = DW_FAMILIES.filter(f => f.blurb)
    expect(withBlurb.length).toBeGreaterThan(0)
    for (const f of withBlurb) {
      expect(wrapper.find(`#dwfam-${f.id}`).text()).toContain(f.blurb)
    }
  })

  it('mounts the live perspective study widget in the rail', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.find('.dw-study').exists()).toBe(true)
    expect(wrapper.find('.dw-word').exists()).toBe(true)
  })

  it('renders the untouched mastery state when history is empty: bars for drills, reference for the cheatsheet', async () => {
    const { wrapper } = await mountHome()
    const t1Row = wrapper.findAll('.dw-row').find(r => r.find('.dw-code').text() === 'T1')
    expect(t1Row!.find('.mast').exists()).toBe(true)
    expect(t1Row!.text()).toContain('neu')

    const cheatsheetRow = wrapper.findAll('.dw-row').find(r => r.find('.dw-code').text() === 'A')
    expect(cheatsheetRow!.text()).toContain('reference')
  })

  it('removes the scroll listener on unmount', async () => {
    const { wrapper } = await mountHome()
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    wrapper.unmount()
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    removeSpy.mockRestore()
  })
})
