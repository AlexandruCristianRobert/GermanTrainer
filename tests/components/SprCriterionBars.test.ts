import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SprCriterionBars from '../../src/components/sprechen/SprCriterionBars.vue'

const four = (n: number) => [
  { key: 'erfuellung', score: n, maxPoints: 25 },
  { key: 'kohaerenz', score: n, maxPoints: 25 },
  { key: 'wortschatz', score: n, maxPoints: 25 },
  { key: 'strukturen', score: n, maxPoints: 25 }
]

describe('SprCriterionBars', () => {
  it('renders empty bars against the rubric maxima when there are no runs', () => {
    const w = mount(SprCriterionBars, { props: { typed: null, spoken: null } })
    expect(w.findAll('.spr-crit-row')).toHaveLength(4)
    expect(w.text()).toContain('Erfüllung / Interaktion')
    expect(w.text()).toContain('—/25')
    expect(w.findAll('.spr-crit-fill')).toHaveLength(0)
  })

  it('renders one bar per criterion when only one Modality has runs', () => {
    const w = mount(SprCriterionBars, { props: { typed: four(20), spoken: null } })
    expect(w.findAll('.spr-crit-fill')).toHaveLength(4)
    expect(w.text()).toContain('20/25')
  })

  it('renders paired bars when both Modalities have runs', () => {
    const w = mount(SprCriterionBars, { props: { typed: four(20), spoken: four(14) } })
    expect(w.findAll('.spr-crit-fill')).toHaveLength(8)
  })

  it('shows the spoken delta only when both Modalities have runs', () => {
    const both = mount(SprCriterionBars, { props: { typed: four(20), spoken: four(14) } })
    expect(both.text()).toContain('−24')   // 56 spoken − 80 typed
    const one = mount(SprCriterionBars, { props: { typed: four(20), spoken: null } })
    expect(one.text()).not.toContain('Δ')
  })

  it('always states the pass rule', () => {
    const w = mount(SprCriterionBars, { props: { typed: null, spoken: null } })
    expect(w.text()).toContain('60')
  })

  it('tolerates a criterion the rubric does not know', () => {
    const w = mount(SprCriterionBars, {
      props: { typed: [...four(20), { key: 'ghost', score: 9, maxPoints: 9 }], spoken: null }
    })
    expect(w.findAll('.spr-crit-row')).toHaveLength(4)
  })
})
