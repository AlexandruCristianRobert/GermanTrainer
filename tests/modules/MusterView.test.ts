import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import MusterView from '../../src/modules/schreiben/MusterView.vue'
import { SCHREIBEN_MUSTER, type MusterLayer } from '../../src/data/schreibenMuster'
import { SCHREIBEN_THEMEN } from '../../src/data/schreibenThemen'

const LAYERS: MusterLayer[] = ['konnektor', 'mittel', 'struktur']

function makeRouter() {
  const stub = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/schreiben/muster', name: 'schreiben-muster', component: MusterView },
      { path: '/schreiben', name: 'schreiben', component: stub }
    ]
  })
}

async function mountView(query?: Record<string, string>) {
  const router = makeRouter()
  await router.push({ name: 'schreiben-muster', query })
  const wrapper = mount(MusterView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

function musterOf(id: string) {
  return SCHREIBEN_MUSTER.find(m => m.id === id)!
}

describe('MusterView', () => {
  it('renders exactly five pattern chips', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.findAll('.muster-chip')).toHaveLength(SCHREIBEN_MUSTER.length)
  })

  it('defaults to the abwaegen pattern when no ?muster= query is given', async () => {
    const { wrapper } = await mountView()
    const abwaegen = musterOf('abwaegen')
    const active = wrapper.find('.muster-chip.active')
    expect(active.exists()).toBe(true)
    expect(active.text()).toBe(abwaegen.titleDe)
    expect(wrapper.text()).toContain(abwaegen.titleDe)
  })

  it('preselects the pattern named by ?muster= and shows that model\'s title', async () => {
    const { wrapper } = await mountView({ muster: 'erfahrung' })
    const erfahrung = musterOf('erfahrung')
    const active = wrapper.find('.muster-chip.active')
    expect(active.text()).toBe(erfahrung.titleDe)
    expect(wrapper.text()).toContain(erfahrung.titleDe)
  })

  it('ignores an invalid ?muster= value and falls back to abwaegen', async () => {
    const { wrapper } = await mountView({ muster: 'not-a-real-pattern' })
    expect(wrapper.find('.muster-chip.active').text()).toBe(musterOf('abwaegen').titleDe)
  })

  it('shows three layer toggles, all on by default, each with its segment count', async () => {
    const { wrapper } = await mountView()
    const buttons = wrapper.findAll('.muster-layer-btn')
    expect(buttons).toHaveLength(3)
    const abwaegen = musterOf('abwaegen')
    for (const layer of LAYERS) {
      const btn = buttons.find(b => b.classes().includes(layer))
      expect(btn, `no layer toggle for ${layer}`).toBeTruthy()
      expect(btn!.attributes('aria-pressed')).toBe('true')
      const count = abwaegen.segments.filter(s => s.layer === layer).length
      expect(btn!.text()).toContain(String(count))
    }
  })

  it('toggling konnektor off dims only the konnektor spans, leaving other layers highlighted', async () => {
    const { wrapper } = await mountView()
    const konnektorBtn = wrapper.findAll('.muster-layer-btn').find(b => b.classes().includes('konnektor'))!
    const konnektorSpansBefore = wrapper.findAll('.muster-span.konnektor')
    expect(konnektorSpansBefore.length).toBeGreaterThan(0)
    for (const span of konnektorSpansBefore) expect(span.classes()).not.toContain('dim')

    await konnektorBtn.trigger('click')

    expect(konnektorBtn.attributes('aria-pressed')).toBe('false')
    for (const span of wrapper.findAll('.muster-span.konnektor')) expect(span.classes()).toContain('dim')
    const mittelSpans = wrapper.findAll('.muster-span.mittel')
    expect(mittelSpans.length).toBeGreaterThan(0)
    for (const span of mittelSpans) expect(span.classes()).not.toContain('dim')
  })

  it('clicking an annotated span pins its noteDe into the note panel and marks the span pinned', async () => {
    const { wrapper } = await mountView()
    const abwaegen = musterOf('abwaegen')
    const firstAnnotated = abwaegen.segments.find(s => s.layer)!
    const span = wrapper.findAll('.muster-span')[0]

    expect(span.classes()).not.toContain('pinned')
    await span.trigger('click')

    expect(span.classes()).toContain('pinned')
    expect(wrapper.find('.muster-note').text()).toContain(firstAnnotated.noteDe)
    expect(wrapper.find('.muster-note-empty').exists()).toBe(false)
  })

  it('toggling a pinned span\'s own layer off dims it and drops the pinned highlight', async () => {
    const { wrapper } = await mountView()
    const abwaegen = musterOf('abwaegen')
    const firstAnnotated = abwaegen.segments.find(s => s.layer)!
    const span = wrapper.findAll('.muster-span')[0]

    await span.trigger('click')
    expect(span.classes()).toContain('pinned')
    expect(span.classes()).toContain(firstAnnotated.layer!)
    expect(span.classes()).not.toContain('dim')

    const layerBtn = wrapper.findAll('.muster-layer-btn').find(b => b.classes().includes(firstAnnotated.layer!))!
    await layerBtn.trigger('click')

    expect(span.classes()).toContain('pinned')
    expect(span.classes()).toContain('dim')
  })

  it('shows an empty-state hint in the note panel until something is pinned', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.find('.muster-note-empty').exists()).toBe(true)
  })

  it('switching patterns clears the pinned note', async () => {
    const { wrapper } = await mountView()
    await wrapper.findAll('.muster-span')[0].trigger('click')
    expect(wrapper.find('.muster-note-empty').exists()).toBe(false)

    const otherChip = wrapper.findAll('.muster-chip').find(c => !c.classes().includes('active'))!
    await otherChip.trigger('click')

    expect(wrapper.find('.muster-note-empty').exists()).toBe(true)
  })

  it('clears the pinned note on Escape', async () => {
    const { wrapper } = await mountView()
    const span = wrapper.findAll('.muster-span')[0]
    await span.trigger('click')
    expect(wrapper.find('.muster-note-empty').exists()).toBe(false)

    await span.trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('.muster-note-empty').exists()).toBe(true)
  })

  it('shows the task-sheet context (thema title + four Inhaltspunkte) collapsibly, and the skeleton', async () => {
    const { wrapper } = await mountView()
    const abwaegen = musterOf('abwaegen')
    const thema = SCHREIBEN_THEMEN.find(t => t.id === abwaegen.themaId)!
    const details = wrapper.find('details.muster-thema')
    expect(details.exists()).toBe(true)
    expect(details.text()).toContain(thema.titleDe)
    for (const p of thema.inhaltspunkte) expect(details.text()).toContain(p)
    for (const line of abwaegen.skeleton) expect(wrapper.text()).toContain(line)
  })

  it('back link points at the schreiben hub', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.find('.back-link').attributes('href')).toBe('/schreiben')
  })
})
