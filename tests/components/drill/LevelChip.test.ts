import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LevelChip from '../../../src/components/drill/LevelChip.vue'

describe('LevelChip', () => {
  test('renders the bare level label by default', () => {
    const wrapper = mount(LevelChip, { props: { level: 'B1' } })
    expect(wrapper.text()).toBe('B1')
    expect(wrapper.classes()).not.toContain('is-ai')
  })

  test('gains is-ai and the "KI ·" prefix when ai is true', () => {
    const wrapper = mount(LevelChip, { props: { level: 'B2', ai: true } })
    expect(wrapper.text()).toBe('KI · B2')
    expect(wrapper.classes()).toContain('is-ai')
  })

  test('does not gain is-ai when ai is explicitly false', () => {
    const wrapper = mount(LevelChip, { props: { level: 'A2', ai: false } })
    expect(wrapper.text()).toBe('A2')
    expect(wrapper.classes()).not.toContain('is-ai')
  })
})
