import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../../src/composables/useSprechenArchive', () => ({
  countsByKind: vi.fn(async () => ({
    grammar: 2, 'word-order': 1, vocabulary: 0, spelling: 0, register: 0
  })),
  openCorrections: vi.fn(async () => [{ id: 'a' }, { id: 'b' }])
}))

import SprechenHome from '../../src/modules/sprechen/SprechenHome.vue'

const push = vi.fn()
const stubs = { RouterLink: true }
const global = { stubs, mocks: { $router: { push } } }

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

beforeEach(() => { localStorage.clear(); push.mockClear() })

describe('SprechenHome', () => {
  it('renders exactly two part panels', () => {
    const w = mount(SprechenHome, { global })
    expect(w.findAll('.spr-part')).toHaveLength(2)
  })

  it('marks the Teil 1 panel dead and non-interactive', () => {
    const w = mount(SprechenHome, { global })
    const teil1 = w.findAll('.spr-part')[0]
    expect(teil1.classes()).toContain('dead')
    expect(teil1.attributes('disabled')).toBeDefined()
    expect(teil1.text()).toContain('In Vorbereitung')
    expect(teil1.find('.spr-part-go').exists()).toBe(false)
  })

  it('does not navigate when the Teil 1 panel is clicked', async () => {
    const w = mount(SprechenHome, { global })
    await w.findAll('.spr-part')[0].trigger('click')
    expect(push).not.toHaveBeenCalled()
  })

  it('navigates to Teil 2 setup from the Teil 2 panel', async () => {
    const w = mount(SprechenHome, { global })
    await w.findAll('.spr-part')[1].trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'sprechen-teil2' })
  })

  it('renders the four shared stages', () => {
    const w = mount(SprechenHome, { global })
    expect(w.findAll('.spr-stage')).toHaveLength(4)
  })

  it('renders three shared ledger rows — Redemittel, Fehlerarchiv, Korrekturdrill', () => {
    const w = mount(SprechenHome, { global })
    const rows = w.findAll('.spr-rows')[0].findAll('.spr-row')
    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain('Redemittel')
    expect(rows[1].text()).toContain('Fehlerarchiv')
    expect(rows[2].text()).toContain('Korrekturdrill')
  })

  it('renders the rubric maxima with no runs rather than an empty state', () => {
    const w = mount(SprechenHome, { global })
    expect(w.find('.spr-mast-side').text()).toContain('Erfüllung / Interaktion')
    expect(w.find('.spr-mast-side').text()).not.toContain('Noch keine')
  })

  it('renders the lifetime yield block', () => {
    const w = mount(SprechenHome, { global })
    expect(w.find('.spr-yield').exists()).toBe(true)
  })

  it('distinguishes a failed archive read from a still-loading one', async () => {
    // Regression: `archive === null` was both states, so a failed read told the
    // learner "wird geladen" forever.
    const mod = await import('../../src/composables/useSprechenArchive')
    vi.mocked(mod.countsByKind).mockRejectedValueOnce(new Error('dexie down'))
    const w = mount(SprechenHome, { global })
    expect(w.text()).toContain('Archiv wird geladen')
    await flushPromises()
    expect(w.text()).toContain('Archiv nicht lesbar')
    expect(w.text()).not.toContain('Archiv wird geladen')
  })

  it('shows the archive counts once the read resolves', async () => {
    const w = mount(SprechenHome, { global })
    await flushPromises()
    expect(w.text()).toContain('3 Korrekturen')
    expect(w.text()).toContain('2 offen')
  })

  it('does not render a Teil 1 / Teil 2 yield toggle', () => {
    const w = mount(SprechenHome, { global })
    expect(w.text()).not.toContain('Vortragsmittel')
  })
})
