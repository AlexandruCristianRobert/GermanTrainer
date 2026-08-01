import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SprYield from '../../src/components/sprechen/SprYield.vue'

describe('SprYield', () => {
  it('renders one column per Move and six ticks each', () => {
    const w = mount(SprYield, { props: { usedIds: [] } })
    expect(w.findAll('.spr-ymove')).toHaveLength(7)
    expect(w.findAll('.spr-tick')).toHaveLength(42)
  })

  it('fills only the ticks whose phrase was used', () => {
    const w = mount(SprYield, { props: { usedIds: ['rm-agree-1', 'rm-agree-2'] } })
    expect(w.findAll('.spr-tick.on')).toHaveLength(2)
  })

  it('shows hit/total per Move', () => {
    const w = mount(SprYield, { props: { usedIds: ['rm-agree-1'] } })
    expect(w.text()).toContain('1/6')
  })

  it('shows the cold note under a Move with zero hits', () => {
    const w = mount(SprYield, { props: { usedIds: [], note: 'Noch nie benutzt.' } })
    expect(w.findAll('.spr-ymove-cold')).toHaveLength(7)
    expect(w.text()).toContain('Noch nie benutzt.')
  })

  it('omits the cold note for a Move that has hits', () => {
    const w = mount(SprYield, { props: { usedIds: ['rm-agree-1'] } })
    expect(w.findAll('.spr-ymove-cold')).toHaveLength(6)
  })
})
