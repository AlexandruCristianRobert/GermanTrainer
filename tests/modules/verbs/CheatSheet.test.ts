import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CheatSheet from '../../../src/modules/verbs/CheatSheet.vue'

describe('CheatSheet page', () => {
  it('mounts and renders the grammatik root', () => {
    const wrapper = mount(CheatSheet)
    expect(wrapper.find('.grammatik').exists()).toBe(true)
  })

  it('passes 12 chapters to ChapterNav', () => {
    const wrapper = mount(CheatSheet)
    // ChapterNav lists 12 items
    expect(wrapper.findAll('.chapter-nav-item')).toHaveLength(12)
  })

  it('renders 12 chapter sections with sequential ids', () => {
    const wrapper = mount(CheatSheet)
    const sections = wrapper.findAll('section.chapter')
    expect(sections).toHaveLength(12)
    sections.forEach((s, i) => {
      expect(s.attributes('id')).toBe(`ch-${i + 1}`)
    })
  })
})
