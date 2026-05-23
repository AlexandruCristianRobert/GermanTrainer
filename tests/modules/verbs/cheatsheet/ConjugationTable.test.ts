import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConjugationTable from '../../../../src/modules/verbs/cheatsheet/ConjugationTable.vue'

describe('ConjugationTable', () => {
  const rows = [
    { person: 'ich', form: 'spiele' },
    { person: 'du', form: 'spielst' },
    { person: 'er', form: 'spielt' }
  ]

  it('renders the verb in the caption', () => {
    const wrapper = mount(ConjugationTable, { props: { verb: 'spielen', rows } })
    expect(wrapper.find('.conj-caption').text()).toContain('spielen')
  })

  it('renders default caption label KONJUGATION', () => {
    const wrapper = mount(ConjugationTable, { props: { verb: 'spielen', rows } })
    expect(wrapper.find('.conj-caption').text()).toContain('KONJUGATION')
  })

  it('respects custom caption', () => {
    const wrapper = mount(ConjugationTable, {
      props: { verb: 'spielen', rows, caption: 'PRÄSENS' }
    })
    expect(wrapper.find('.conj-caption').text()).toContain('PRÄSENS')
  })

  it('renders one row per data entry with person + form', () => {
    const wrapper = mount(ConjugationTable, { props: { verb: 'spielen', rows } })
    const rowEls = wrapper.findAll('.conj-row')
    expect(rowEls).toHaveLength(3)
    expect(rowEls[0].text()).toContain('ich')
    expect(rowEls[0].text()).toContain('spiele')
    expect(rowEls[2].text()).toContain('er')
    expect(rowEls[2].text()).toContain('spielt')
  })

  it('emits HTML through the form field so VowelShift markup is preserved', () => {
    const wrapper = mount(ConjugationTable, {
      props: {
        verb: 'fahren',
        rows: [{ person: 'du', form: 'f<span class="vh">ä</span>hrst' }]
      }
    })
    expect(wrapper.find('.conj-form').html()).toContain('class="vh"')
  })
})
