import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { REDEMITTEL_YIELD_KEY } from '../../src/composables/useRedemittelYield'
import { SPRECHEN_REDEMITTEL } from '../../src/data/sprechenRedemittel'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
import SprechenCheatsheet from '../../src/modules/sprechen/SprechenCheatsheet.vue'

beforeEach(() => localStorage.clear())

describe('SprechenCheatsheet', () => {
  it('renders every Redemittel across all seven Moves', () => {
    const w = mount(SprechenCheatsheet)
    expect(w.findAll('.spr-usedot')).toHaveLength(SPRECHEN_REDEMITTEL.length)
  })

  it('renders no part tab strip — Teil 1 does not exist', () => {
    const w = mount(SprechenCheatsheet)
    expect(w.text()).not.toContain('Vortrag')
    expect(w.text()).not.toContain('Vortragsmittel')
  })

  it('fills the usage dot only for phrases in the lifetime rollup', () => {
    localStorage.setItem(REDEMITTEL_YIELD_KEY, JSON.stringify({
      'rm-agree-1': { count: 2, lastAt: 1 }
    }))
    const w = mount(SprechenCheatsheet)
    expect(w.findAll('.spr-usedot.on')).toHaveLength(1)
  })

  it('renders the four Bauplan steps with the matrix column names', () => {
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
})
