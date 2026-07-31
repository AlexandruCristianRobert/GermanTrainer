import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MasteryDots from '../../../src/components/drill/MasteryDots.vue'

describe('MasteryDots', () => {
  test('renders only "ref" when band is null', () => {
    const wrapper = mount(MasteryDots, { props: { band: null } })
    expect(wrapper.text()).toBe('ref')
    expect(wrapper.find('.mdot').exists()).toBe(false)
  })

  test('renders five dots with the right number lit for a mid-range band', () => {
    const wrapper = mount(MasteryDots, { props: { band: 3 } })
    const dots = wrapper.findAll('.mdot i')
    expect(dots.length).toBe(5)
    expect(wrapper.findAll('.mdot i.on').length).toBe(3)
  })

  test('band 0 lights no dots', () => {
    const wrapper = mount(MasteryDots, { props: { band: 0 } })
    expect(wrapper.findAll('.mdot i.on').length).toBe(0)
    expect(wrapper.findAll('.mdot i.half').length).toBe(0)
  })

  test('band 5 lights all five dots', () => {
    const wrapper = mount(MasteryDots, { props: { band: 5 } })
    expect(wrapper.findAll('.mdot i.on').length).toBe(5)
    expect(wrapper.findAll('.mdot i.half').length).toBe(0)
  })

  test('a fractional band gives the boundary dot the .half class', () => {
    const wrapper = mount(MasteryDots, { props: { band: 2.5 } })
    const dots = wrapper.findAll('.mdot i')
    expect(dots[0].classes()).toContain('on')
    expect(dots[1].classes()).toContain('on')
    expect(dots[2].classes()).toContain('half')
    expect(dots[3].classes()).not.toContain('on')
    expect(dots[3].classes()).not.toContain('half')
    expect(dots[4].classes()).not.toContain('on')
  })

  test('carries a title and aria-label stating the band', () => {
    const wrapper = mount(MasteryDots, { props: { band: 3 } })
    const mdot = wrapper.find('.mdot')
    expect(mdot.attributes('title')).toBe('3 / 5 mastery')
    expect(mdot.attributes('aria-label')).toBe('Mastery 3 of 5')
  })

  test('the decorative dots are hidden from screen readers', () => {
    const wrapper = mount(MasteryDots, { props: { band: 3 } })
    wrapper.findAll('.mdot i').forEach((i) => {
      expect(i.attributes('aria-hidden')).toBe('true')
    })
  })
})
