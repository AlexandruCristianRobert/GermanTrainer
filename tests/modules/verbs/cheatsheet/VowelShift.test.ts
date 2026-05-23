import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VowelShift from '../../../../src/modules/verbs/cheatsheet/VowelShift.vue'

describe('VowelShift', () => {
  it('renders the slot content inside a span with class vowel-shift', () => {
    const wrapper = mount(VowelShift, { slots: { default: 'ä' } })
    const span = wrapper.find('span.vowel-shift')
    expect(span.exists()).toBe(true)
    expect(span.text()).toBe('ä')
  })

  it('puts the from prop on the title attribute for tooltip', () => {
    const wrapper = mount(VowelShift, {
      props: { from: 'fahren' },
      slots: { default: 'ä' }
    })
    expect(wrapper.find('span.vowel-shift').attributes('title')).toBe('fahren')
  })

  it('renders without title when from is not provided', () => {
    const wrapper = mount(VowelShift, { slots: { default: 'ä' } })
    expect(wrapper.find('span.vowel-shift').attributes('title')).toBeUndefined()
  })
})
