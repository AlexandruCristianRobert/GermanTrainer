import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChapterNav from '../../../../src/modules/verbs/cheatsheet/ChapterNav.vue'

const chapters = [
  { id: 'ch-1', numeral: 'I',  titleDe: 'Schwache Verben', titleEn: 'Weak verbs' },
  { id: 'ch-2', numeral: 'II', titleDe: 'Starke Verben',   titleEn: 'Strong verbs' }
]

describe('ChapterNav', () => {
  it('renders one nav item per chapter with numeral and German title', () => {
    const wrapper = mount(ChapterNav, { props: { chapters, searchQuery: '' } })
    const items = wrapper.findAll('.chapter-nav-item')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('I')
    expect(items[0].text()).toContain('Schwache Verben')
  })

  it('emits select with chapter id when an item is clicked', async () => {
    const wrapper = mount(ChapterNav, { props: { chapters, searchQuery: '' } })
    await wrapper.findAll('.chapter-nav-item')[1].trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['ch-2'])
  })

  it('emits update:searchQuery when search input changes', async () => {
    const wrapper = mount(ChapterNav, { props: { chapters, searchQuery: '' } })
    const input = wrapper.find('input.chapter-nav-search')
    await input.setValue('stark')
    expect(wrapper.emitted('update:searchQuery')?.[0]).toEqual(['stark'])
  })

  it('dims non-matching chapters when searchQuery is set', () => {
    const wrapper = mount(ChapterNav, { props: { chapters, searchQuery: 'stark' } })
    const items = wrapper.findAll('.chapter-nav-item')
    expect(items[0].classes()).toContain('dim')
    expect(items[1].classes()).not.toContain('dim')
  })

  it('also matches the English title in search', () => {
    const wrapper = mount(ChapterNav, { props: { chapters, searchQuery: 'weak' } })
    const items = wrapper.findAll('.chapter-nav-item')
    expect(items[0].classes()).not.toContain('dim')
    expect(items[1].classes()).toContain('dim')
  })

  it('emits select when an item is activated via keyboard (Enter)', async () => {
    const wrapper = mount(ChapterNav, { props: { chapters, searchQuery: '' } })
    await wrapper.findAll('.chapter-nav-item')[0].trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select')?.[0]).toEqual(['ch-1'])
  })

  it('emits select when an item is activated via keyboard (Space)', async () => {
    const wrapper = mount(ChapterNav, { props: { chapters, searchQuery: '' } })
    await wrapper.findAll('.chapter-nav-item')[1].trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('select')?.[0]).toEqual(['ch-2'])
  })
})
