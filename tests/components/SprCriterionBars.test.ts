import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SprCriterionBars from '../../src/components/sprechen/SprCriterionBars.vue'
import { SPRECHEN_B2_TEIL2 } from '../../src/data/rubrics'

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

  it('renders one bar per criterion when only typed has runs', () => {
    const w = mount(SprCriterionBars, { props: { typed: four(20), spoken: null } })
    expect(w.findAll('.spr-crit-fill')).toHaveLength(4)
    expect(w.text()).toContain('20/25')
  })

  it('renders one FILLED bar per criterion when only spoken has runs', () => {
    // Regression: gating the first bar's fill on `typed` alone showed a
    // spoken-only learner correct numbers over a completely blank track.
    const w = mount(SprCriterionBars, { props: { typed: null, spoken: four(14) } })
    expect(w.findAll('.spr-crit-fill')).toHaveLength(4)
    expect(w.text()).toContain('14/25')
  })

  it('renders paired bars when both Modalities have runs', () => {
    const w = mount(SprCriterionBars, { props: { typed: four(20), spoken: four(14) } })
    expect(w.findAll('.spr-crit-fill')).toHaveLength(8)
  })

  it('prints BOTH scores in the paired case, not just the typed one', () => {
    const w = mount(SprCriterionBars, { props: { typed: four(20), spoken: four(14) } })
    expect(w.find('.spr-crit-max').text()).toBe('20·14')
    expect(w.find('.spr-crit-max').attributes('title')).toBe('getippt · gesprochen')
  })

  it('shows the spoken delta only when both Modalities have runs', () => {
    const both = mount(SprCriterionBars, { props: { typed: four(20), spoken: four(14) } })
    expect(both.text()).toContain('−24')   // 56 spoken − 80 typed
    const one = mount(SprCriterionBars, { props: { typed: four(20), spoken: null } })
    expect(one.text()).not.toContain('Δ')
  })

  it('reads the pass mark and total from the rubric rather than hardcoding them', () => {
    const w = mount(SprCriterionBars, { props: { typed: null, spoken: null } })
    // Assert against the rubric's OWN values, so changing rubrics.ts without
    // changing the component breaks this test instead of going stale silently.
    expect(w.find('.spr-pass').text()).toContain(String(SPRECHEN_B2_TEIL2.passingScore))
    expect(w.find('.spr-pass').text()).toContain(String(SPRECHEN_B2_TEIL2.totalMax))
    expect(w.find('.spr-pass').text()).toContain(`${SPRECHEN_B2_TEIL2.criteria.length} Kriterien`)
  })

  it('reads +/-0 as ±0 on an exact tie rather than as a negative', () => {
    const w = mount(SprCriterionBars, { props: { typed: four(20), spoken: four(20) } })
    expect(w.text()).toContain('±0')
    expect(w.text()).not.toContain('−0')
  })

  it('signs a positive delta when spoken beats typed', () => {
    const w = mount(SprCriterionBars, { props: { typed: four(14), spoken: four(20) } })
    expect(w.text()).toContain('+24')
  })

  it('tolerates a criterion the rubric does not know', () => {
    const w = mount(SprCriterionBars, {
      props: { typed: [...four(20), { key: 'ghost', score: 9, maxPoints: 9 }], spoken: null }
    })
    expect(w.findAll('.spr-crit-row')).toHaveLength(4)
  })
})
