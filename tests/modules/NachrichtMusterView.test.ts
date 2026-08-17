import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import NachrichtMusterView from '../../src/modules/schreiben/NachrichtMusterView.vue'
import { SCHREIBEN_MUSTER_NACHRICHTEN, type NachrichtMusterLayer } from '../../src/data/schreibenMusterNachrichten'
import { SCHREIBEN_AUFTRAEGE } from '../../src/data/schreibenAuftraege'

const LAYERS: NachrichtMusterLayer[] = ['konnektor', 'mittel', 'struktur', 'hoeflichkeit']

function makeRouter() {
  const stub = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/schreiben/muster-teil2', name: 'schreiben-muster-teil2', component: NachrichtMusterView },
      { path: '/schreiben', name: 'schreiben', component: stub }
    ]
  })
}

async function mountView(query?: Record<string, string>) {
  const router = makeRouter()
  await router.push({ name: 'schreiben-muster-teil2', query })
  const wrapper = mount(NachrichtMusterView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

function nachrichtOf(id: string) {
  return SCHREIBEN_MUSTER_NACHRICHTEN.find(m => m.id === id)!
}

describe('NachrichtMusterView', () => {
  it('renders exactly five Musternachricht chips', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.findAll('.muster-chip')).toHaveLength(SCHREIBEN_MUSTER_NACHRICHTEN.length)
  })

  it('defaults to the first Musternachricht (entschuldigung) when no ?muster= query is given', async () => {
    const { wrapper } = await mountView()
    const entschuldigung = nachrichtOf('entschuldigung')
    const active = wrapper.find('.muster-chip.active')
    expect(active.exists()).toBe(true)
    expect(active.text()).toBe(entschuldigung.titleDe)
    expect(wrapper.text()).toContain(entschuldigung.titleDe)
  })

  it('preselects the pattern named by ?muster= and shows that model\'s title', async () => {
    const { wrapper } = await mountView({ muster: 'vorschlag' })
    const vorschlag = nachrichtOf('vorschlag')
    const active = wrapper.find('.muster-chip.active')
    expect(active.text()).toBe(vorschlag.titleDe)
    expect(wrapper.text()).toContain(vorschlag.titleDe)
  })

  it('ignores an invalid ?muster= value and falls back to entschuldigung', async () => {
    const { wrapper } = await mountView({ muster: 'not-a-real-anlass' })
    expect(wrapper.find('.muster-chip.active').text()).toBe(nachrichtOf('entschuldigung').titleDe)
  })

  it('shows FOUR layer toggles (including hoeflichkeit), all on by default, each with its segment count', async () => {
    const { wrapper } = await mountView()
    const buttons = wrapper.findAll('.muster-layer-btn')
    expect(buttons).toHaveLength(4)
    const entschuldigung = nachrichtOf('entschuldigung')
    for (const layer of LAYERS) {
      const btn = buttons.find(b => b.classes().includes(layer))
      expect(btn, `no layer toggle for ${layer}`).toBeTruthy()
      expect(btn!.attributes('aria-pressed')).toBe('true')
      const count = entschuldigung.segments.filter(s => s.layer === layer).length
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

  it('toggling hoeflichkeit off dims only the hoeflichkeit spans, leaving other layers highlighted', async () => {
    const { wrapper } = await mountView()
    const hoeflichkeitBtn = wrapper.findAll('.muster-layer-btn').find(b => b.classes().includes('hoeflichkeit'))!
    const hoeflichkeitSpansBefore = wrapper.findAll('.muster-span.hoeflichkeit')
    expect(hoeflichkeitSpansBefore.length).toBeGreaterThan(0)
    for (const span of hoeflichkeitSpansBefore) expect(span.classes()).not.toContain('dim')

    await hoeflichkeitBtn.trigger('click')

    expect(hoeflichkeitBtn.attributes('aria-pressed')).toBe('false')
    for (const span of wrapper.findAll('.muster-span.hoeflichkeit')) expect(span.classes()).toContain('dim')
    const mittelSpans = wrapper.findAll('.muster-span.mittel')
    expect(mittelSpans.length).toBeGreaterThan(0)
    for (const span of mittelSpans) expect(span.classes()).not.toContain('dim')
  })

  it('clicking an annotated span pins its noteDe into the note panel and marks the span pinned', async () => {
    const { wrapper } = await mountView()
    const entschuldigung = nachrichtOf('entschuldigung')
    const firstAnnotated = entschuldigung.segments.find(s => s.layer)!
    const span = wrapper.findAll('.muster-span')[0]

    expect(span.classes()).not.toContain('pinned')
    await span.trigger('click')

    expect(span.classes()).toContain('pinned')
    expect(wrapper.find('.muster-note').text()).toContain(firstAnnotated.noteDe)
    expect(wrapper.find('.muster-note-empty').exists()).toBe(false)
  })

  it('toggling a pinned span\'s own layer off dims it and drops the pinned highlight', async () => {
    const { wrapper } = await mountView()
    const entschuldigung = nachrichtOf('entschuldigung')
    const firstAnnotated = entschuldigung.segments.find(s => s.layer)!
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

  it('shows the Aufgabenblatt (Auftrag title, Empfänger, task text, four Inhaltspunkte) collapsibly, and the skeleton', async () => {
    const { wrapper } = await mountView()
    const entschuldigung = nachrichtOf('entschuldigung')
    const auftrag = SCHREIBEN_AUFTRAEGE.find(a => a.id === entschuldigung.auftragId)!
    const details = wrapper.find('details.muster-thema')
    expect(details.exists()).toBe(true)
    expect(details.text()).toContain(auftrag.titleDe)
    expect(details.text()).toContain(auftrag.situationDe)
    expect(details.text()).toContain(auftrag.empfaengerName)
    expect(details.text()).toContain(auftrag.empfaengerRolleDe)
    expect(details.text()).toContain(auftrag.taskDe)
    for (const p of auftrag.inhaltspunkte) expect(details.text()).toContain(p)
    for (const line of entschuldigung.skeleton) expect(wrapper.text()).toContain(line)
  })

  it('renders the Empfänger role standalone, never spliced into a prepositional phrase', async () => {
    const { wrapper } = await mountView()
    const entschuldigung = nachrichtOf('entschuldigung')
    const auftrag = SCHREIBEN_AUFTRAEGE.find(a => a.id === entschuldigung.auftragId)!
    const details = wrapper.find('details.muster-thema')
    // The role appears on its own (e.g. "Herr Semder · Ihr Abteilungsleiter"),
    // never rewritten into a dative/accusative phrase like "an Ihren Abteilungsleiter".
    expect(details.text()).toContain(auftrag.empfaengerRolleDe)
    expect(details.html()).not.toContain(`an ${auftrag.empfaengerRolleDe}`)
  })

  it('renders the Betreff, Anrede and Gruß on separate lines (literal newline segments preserved)', async () => {
    const { wrapper } = await mountView()
    const raw = wrapper.find('.muster-text').element.textContent ?? ''
    // Betreff is followed by a blank line, then the Anrede — the frame must
    // read as a message layout, not a run-on paragraph.
    expect(raw).toContain('Betreff: Absage der Besprechung am Freitag\n\nSehr geehrter Herr Semder,')
    // The Gruß and the signature name sit on their own line at the very end.
    expect(raw).toContain('Mit freundlichen Grüßen\nMarco Lehner')
  })

  it('back link points at the schreiben hub', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.find('.back-link').attributes('href')).toBe('/schreiben')
  })
})
