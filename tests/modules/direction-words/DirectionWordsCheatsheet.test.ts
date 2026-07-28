import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DirectionWordsCheatsheet from '../../../src/modules/direction-words/DirectionWordsCheatsheet.vue'
import {
  ADVERB_PAIRS, UNPAIRED_ADVERBS, QUESTION_WORDS, POINTER_WORDS,
  LEXICALIZED_VERBS, IDIOMS, hinForm, herForm,
} from '../../../src/data/directionWords'

async function mountSheet() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/direction-words', name: 'directionwords', component: { template: '<div />' } },
      { path: '/direction-words/cheatsheet', name: 'directionwords-cheatsheet', component: { template: '<div />' } },
    ],
  })
  await router.push({ name: 'directionwords-cheatsheet' })
  const wrapper = mount(DirectionWordsCheatsheet, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('DirectionWordsCheatsheet', () => {
  it('renders all six chapters', async () => {
    const wrapper = await mountSheet()
    for (const id of ['dw-rule', 'dw-pairs', 'dw-register', 'dw-questions', 'dw-lexical', 'dw-idioms'])
      expect(wrapper.find(`#${id}`).exists()).toBe(true)
  })

  it('shows two scene diagrams in the rule chapter — one per perspective', async () => {
    const wrapper = await mountSheet()
    const diagrams = wrapper.findAll('#dw-rule .scene-diagram')
    expect(diagrams.length).toBe(2)
    expect(diagrams[0].attributes('data-motion')).toBe('toward-speaker')
    expect(diagrams[1].attributes('data-motion')).toBe('away-from-speaker')
  })

  it('pair table has one row per adverb pair with derived twin forms', async () => {
    const wrapper = await mountSheet()
    const rows = wrapper.findAll('.dw-table tbody tr')
    expect(rows.length).toBe(ADVERB_PAIRS.length)
    const text = wrapper.find('.dw-table').text()
    for (const p of ADVERB_PAIRS) {
      expect(text).toContain(hinForm(p.element))
      expect(text).toContain(herForm(p.element))
    }
    expect(wrapper.find('#dw-pairs').text()).toContain(UNPAIRED_ADVERBS[0].form)
  })

  it('register chapter lists every r-form and marks *hinrein as wrong', async () => {
    const wrapper = await mountSheet()
    const text = wrapper.find('#dw-register').text()
    for (const p of ADVERB_PAIRS.filter(p => p.rForm !== null)) expect(text).toContain(p.rForm!)
    expect(text).toContain('hinrein')
  })

  it('questions chapter covers wo/wohin/woher and the pointer words', async () => {
    const wrapper = await mountSheet()
    const text = wrapper.find('#dw-questions').text()
    for (const q of QUESTION_WORDS) expect(text).toContain(q.example)
    for (const p of POINTER_WORDS) expect(text).toContain(p.word)
  })

  it('renders the lexicalized verbs and the idioms', async () => {
    const wrapper = await mountSheet()
    expect(wrapper.findAll('#dw-lexical .dw-lex-row').length).toBe(LEXICALIZED_VERBS.length)
    expect(wrapper.find('#dw-lexical').text()).toContain('herstellen')
    const idiomText = wrapper.find('#dw-idioms').text()
    for (const i of IDIOMS) expect(idiomText).toContain(i.example)
  })

  it('has a back link to the module home', async () => {
    const wrapper = await mountSheet()
    expect(wrapper.find('.back-link').exists()).toBe(true)
  })
})
