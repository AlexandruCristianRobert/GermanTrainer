import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import DirectionWordsCheatsheet from '../../../src/modules/direction-words/DirectionWordsCheatsheet.vue'
import {
  ADVERB_PAIRS, UNPAIRED_ADVERBS, PERSPECTIVE_PAIRS, QUESTION_WORDS, POINTER_WORDS,
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
  it('renders all six chapters as plates', async () => {
    const wrapper = await mountSheet()
    for (const id of ['dw-rule', 'dw-pairs', 'dw-register', 'dw-questions', 'dw-lexical', 'dw-idioms']) {
      const section = wrapper.find(`#${id}`)
      expect(section.exists()).toBe(true)
      expect(section.classes()).toContain('plate')
    }
  })

  it('shows two scene diagrams in the rule chapter — one per perspective', async () => {
    const wrapper = await mountSheet()
    const diagrams = wrapper.findAll('#dw-rule .scene-diagram')
    expect(diagrams.length).toBe(2)
    expect(diagrams[0].attributes('data-motion')).toBe('toward-speaker')
    expect(diagrams[1].attributes('data-motion')).toBe('away-from-speaker')
  })

  it('renders the her/hin perspective key with one entry per pair, per column', async () => {
    const wrapper = await mountSheet()
    const cols = wrapper.findAll('#dw-rule .persp-pairs .pp-col')
    expect(cols.length).toBe(2)
    expect(cols[0].find('.pp-h').text()).toBe('her')
    expect(cols[1].find('.pp-h').text()).toBe('hin')
    expect(cols[0].findAll('.pp-item').length).toBe(PERSPECTIVE_PAIRS.length)
    expect(cols[1].findAll('.pp-item').length).toBe(PERSPECTIVE_PAIRS.length)
    for (const p of PERSPECTIVE_PAIRS) {
      expect(cols[0].text()).toContain(p.her)
      expect(cols[0].text()).toContain(p.herNote)
      expect(cols[1].text()).toContain(p.hin)
      expect(cols[1].text()).toContain(p.hinNote)
    }
  })

  it('pair table has one row per adverb pair with derived twin forms', async () => {
    const wrapper = await mountSheet()
    const pairsTable = wrapper.findAll('#dw-pairs .mini-table')[0]
    const rows = pairsTable.findAll('tbody tr')
    expect(rows.length).toBe(ADVERB_PAIRS.length)
    const text = pairsTable.text()
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
    expect(wrapper.findAll('#dw-lexical .mini-table tbody tr').length).toBe(LEXICALIZED_VERBS.length)
    expect(wrapper.find('#dw-lexical').text()).toContain('herstellen')
    const idiomRows = wrapper.findAll('#dw-idioms .mini-table tbody tr')
    expect(idiomRows.length).toBe(IDIOMS.length)
    const idiomText = wrapper.find('#dw-idioms').text()
    for (const i of IDIOMS) expect(idiomText).toContain(i.example)
  })

  it('has a back link to the module home', async () => {
    const wrapper = await mountSheet()
    expect(wrapper.find('.back-link').exists()).toBe(true)
  })
})
