import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MasteryBars from '../../../src/components/drill/MasteryBars.vue'

describe('MasteryBars', () => {
  test('renders only the reference caption when band is null', () => {
    const wrapper = mount(MasteryBars, { props: { band: null } })
    expect(wrapper.text()).toBe('reference')
    expect(wrapper.find('.mast').exists()).toBe(false)
  })

  test('renders five strokes with the right number lit for a mid-range band', () => {
    const wrapper = mount(MasteryBars, { props: { band: 3, attempts: 38 } })
    const strokes = wrapper.findAll('.mast i')
    expect(strokes.length).toBe(5)
    expect(wrapper.findAll('.mast i.on').length).toBe(3)
  })

  test('band 0 lights no strokes', () => {
    const wrapper = mount(MasteryBars, { props: { band: 0 } })
    expect(wrapper.findAll('.mast i.on').length).toBe(0)
  })

  test('band 5 lights all five strokes', () => {
    const wrapper = mount(MasteryBars, { props: { band: 5 } })
    expect(wrapper.findAll('.mast i.on').length).toBe(5)
  })

  test('shows "neu" when there are no attempts', () => {
    const wrapper = mount(MasteryBars, { props: { band: 1, attempts: null } })
    expect(wrapper.find('.mast-num').text()).toBe('neu')
  })

  test('shows "N versucht" when there are attempts', () => {
    const wrapper = mount(MasteryBars, { props: { band: 1, attempts: 12 } })
    expect(wrapper.find('.mast-num').text()).toBe('12 versucht')
  })

  test('suppresses the caption entirely when showNum is false', () => {
    const wrapper = mount(MasteryBars, { props: { band: 2, attempts: 5, showNum: false } })
    expect(wrapper.find('.mast-num').exists()).toBe(false)
  })

  test('carries a title and aria-label stating the band in words', () => {
    const wrapper = mount(MasteryBars, { props: { band: 3, attempts: 38 } })
    const mast = wrapper.find('.mast')
    expect(mast.attributes('title')).toBe('3 / 5 mastery')
    expect(mast.attributes('aria-label')).toBe('Mastery 3 of 5, 38 attempts')
  })

  test('the decorative strokes are hidden from screen readers', () => {
    const wrapper = mount(MasteryBars, { props: { band: 3 } })
    wrapper.findAll('.mast i').forEach((i) => {
      expect(i.attributes('aria-hidden')).toBe('true')
    })
  })
})
