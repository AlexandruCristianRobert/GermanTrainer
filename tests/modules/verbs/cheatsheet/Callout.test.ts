import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Callout from '../../../../src/modules/verbs/cheatsheet/Callout.vue'

describe('Callout', () => {
  it('renders kind=note with BEACHTE label and note class', () => {
    const wrapper = mount(Callout, {
      props: { kind: 'note' },
      slots: { default: 'Inhalt' }
    })
    expect(wrapper.find('.callout-label').text()).toBe('BEACHTE')
    expect(wrapper.find('.callout').classes()).toContain('callout--note')
  })

  it('renders kind=exception with AUSNAHME label and exception class', () => {
    const wrapper = mount(Callout, {
      props: { kind: 'exception' },
      slots: { default: 'Inhalt' }
    })
    expect(wrapper.find('.callout-label').text()).toBe('AUSNAHME')
    expect(wrapper.find('.callout').classes()).toContain('callout--exception')
  })

  it('renders kind=example with BEISPIELE label and example class', () => {
    const wrapper = mount(Callout, {
      props: { kind: 'example' },
      slots: { default: 'Inhalt' }
    })
    expect(wrapper.find('.callout-label').text()).toBe('BEISPIELE')
    expect(wrapper.find('.callout').classes()).toContain('callout--example')
  })

  it('respects label prop override', () => {
    const wrapper = mount(Callout, {
      props: { kind: 'note', label: 'CUSTOM' },
      slots: { default: 'x' }
    })
    expect(wrapper.find('.callout-label').text()).toBe('CUSTOM')
  })

  it('renders the slot content in .callout-body', () => {
    const wrapper = mount(Callout, {
      props: { kind: 'note' },
      slots: { default: '<p>Mein Text</p>' }
    })
    expect(wrapper.find('.callout-body').html()).toContain('<p>Mein Text</p>')
  })
})
