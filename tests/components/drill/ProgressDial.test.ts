import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProgressDial from '../../../src/components/drill/ProgressDial.vue'

const R = 25
const C = 2 * Math.PI * R

describe('ProgressDial', () => {
  test('renders a 56x56 svg with role=img and a percentage aria-label', () => {
    const wrapper = mount(ProgressDial, { props: { pct: 50 } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('width')).toBe('56')
    expect(svg.attributes('height')).toBe('56')
    expect(svg.attributes('role')).toBe('img')
    expect(svg.attributes('aria-label')).toBe('50% mastered')
  })

  test('shows the rounded percent number', () => {
    const wrapper = mount(ProgressDial, { props: { pct: 33.6 } })
    expect(wrapper.find('.dw-dial-num').text()).toBe('34%')
  })

  test('dash-offset maths at 0%: full offset, nothing filled', () => {
    const wrapper = mount(ProgressDial, { props: { pct: 0 } })
    const fill = wrapper.find('.dw-dial-fill')
    expect(fill.attributes('stroke-dasharray')).toBe(String(C))
    expect(Number(fill.attributes('stroke-dashoffset'))).toBeCloseTo(C, 5)
  })

  test('dash-offset maths at 50%: half the circumference offset', () => {
    const wrapper = mount(ProgressDial, { props: { pct: 50 } })
    const fill = wrapper.find('.dw-dial-fill')
    expect(Number(fill.attributes('stroke-dashoffset'))).toBeCloseTo(C * 0.5, 5)
  })

  test('dash-offset maths at 100%: zero offset, fully filled', () => {
    const wrapper = mount(ProgressDial, { props: { pct: 100 } })
    const fill = wrapper.find('.dw-dial-fill')
    expect(Number(fill.attributes('stroke-dashoffset'))).toBeCloseTo(0, 5)
  })

  test('both circles share r=25 and the track carries its own class', () => {
    const wrapper = mount(ProgressDial, { props: { pct: 20 } })
    expect(wrapper.find('.dw-dial-track').attributes('r')).toBe('25')
    expect(wrapper.find('.dw-dial-fill').attributes('r')).toBe('25')
  })
})
