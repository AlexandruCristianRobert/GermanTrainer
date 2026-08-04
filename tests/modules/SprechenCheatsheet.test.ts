import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { REDEMITTEL_YIELD_KEY } from '../../src/composables/useRedemittelYield'
import { SPRECHEN_REDEMITTEL } from '../../src/data/sprechenRedemittel'
import { SPRECHEN_VORTRAGSMITTEL, VORTRAG_MOVES, VORTRAG_MOVE_LABEL, GLIEDERUNGSPUNKTE } from '../../src/data/sprechenVortragsmittel'
import { SPRECHEN_B2_TEIL1 } from '../../src/data/rubrics'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
import SprechenCheatsheet from '../../src/modules/sprechen/SprechenCheatsheet.vue'

beforeEach(() => localStorage.clear())

describe('SprechenCheatsheet', () => {
  it('renders every Redemittel across all seven Moves', () => {
    const w = mount(SprechenCheatsheet)
    expect(w.findAll('.spr-usedot')).toHaveLength(SPRECHEN_REDEMITTEL.length)
  })

  it('fills the usage dot only for phrases in the lifetime rollup', () => {
    localStorage.setItem(REDEMITTEL_YIELD_KEY, JSON.stringify({
      'rm-agree-1': { count: 2, lastAt: 1 }
    }))
    const w = mount(SprechenCheatsheet)
    expect(w.findAll('.spr-usedot.on')).toHaveLength(1)
  })

  it('renders the four Bauplan step names', () => {
    const w = mount(SprechenCheatsheet)
    for (const step of ['These', 'Begründung', 'Beispiel', 'Rückfrage']) {
      expect(w.text()).toContain(step)
    }
  })

  it('connects the Bauplan\'s Rückfrage to the Auswertung\'s Reaktion', () => {
    const w = mount(SprechenCheatsheet)
    expect(w.text()).toContain('Reaktion')
    expect(w.text()).toContain('Rückfrage')
  })

  it('shows a Teil 1 / Teil 2 part control, defaulting to Teil 2', () => {
    const w = mount(SprechenCheatsheet)
    expect(w.find('[data-part="teil1"]').exists()).toBe(true)
    expect(w.find('[data-part="teil2"]').exists()).toBe(true)
    expect(w.find('[data-part="teil2"]').classes()).toContain('active')
    expect(w.find('[data-part="teil1"]').classes()).not.toContain('active')
  })

  it('shows only the Teil 2 bank until Teil 1 is chosen', () => {
    const w = mount(SprechenCheatsheet)
    expect(w.findAll('.spr-usedot')).toHaveLength(SPRECHEN_REDEMITTEL.length)
    expect(w.text()).not.toContain('Vortragsmittel')
    for (const p of GLIEDERUNGSPUNKTE) expect(w.text()).not.toContain(p.hintDe)
  })

  describe('the Teil 1 tab', () => {
    async function mountOnTeil1() {
      const w = mount(SprechenCheatsheet)
      await w.find('[data-part="teil1"]').trigger('click')
      return w
    }

    it('renders all 35 Vortragsmittel phrases with usage dots, and none of Teil 2\'s', async () => {
      const w = await mountOnTeil1()
      expect(w.findAll('.spr-usedot')).toHaveLength(SPRECHEN_VORTRAGSMITTEL.length)
      for (const r of SPRECHEN_REDEMITTEL) expect(w.text()).not.toContain(r.phraseDe)
    })

    it('fills the usage dot only for Vortragsmittel in the bank-filtered lifetime rollup', async () => {
      localStorage.setItem(REDEMITTEL_YIELD_KEY, JSON.stringify({
        'rm-agree-1': { count: 3, lastAt: 1 },
        'vm-einstieg-1': { count: 2, lastAt: 2 }
      }))
      const w = await mountOnTeil1()
      expect(w.findAll('.spr-usedot.on')).toHaveLength(1)
    })

    it('shows seven Vortrag Move group headings', async () => {
      const w = await mountOnTeil1()
      for (const m of VORTRAG_MOVES) {
        expect(w.text()).toContain(VORTRAG_MOVE_LABEL[m].de)
        expect(w.text()).toContain(VORTRAG_MOVE_LABEL[m].en)
      }
    })

    it('walks the five Gliederungspunkte with their hint, words and clock', async () => {
      const w = await mountOnTeil1()
      for (const p of GLIEDERUNGSPUNKTE) {
        expect(w.text()).toContain(p.labelDe)
        expect(w.text()).toContain(p.hintDe)
        expect(w.text()).toContain(String(p.words))
      }
    })

    it('reads the rubric summary from SPRECHEN_B2_TEIL1, never as re-typed literals', async () => {
      const w = await mountOnTeil1()
      for (const c of SPRECHEN_B2_TEIL1.criteria) {
        expect(w.text()).toContain(c.labelDe)
        expect(w.text()).toContain(String(c.maxPoints))
      }
      expect(w.text()).toContain(String(SPRECHEN_B2_TEIL1.passingScore))
    })

    it('marks the Teil 1 button active and the Teil 2 button inactive', async () => {
      const w = await mountOnTeil1()
      expect(w.find('[data-part="teil1"]').classes()).toContain('active')
      expect(w.find('[data-part="teil2"]').classes()).not.toContain('active')
    })
  })
})
