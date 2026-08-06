import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import VerbSentenceSetup from '../../../src/modules/verbs/VerbSentenceSetup.vue'
import { NOUN_GROUPS } from '../../../src/db/types'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

vi.mock('../../../src/composables/useNouns', () => ({
  useNouns: () => ({
    sampleByGroups: async () => [{ german: 'Tisch', article: 'der', english: 'table', group: 'Alltag' }],
    countsByGroup: async () => Object.fromEntries(NOUN_GROUPS.map(g => [g, 5]))
  })
}))
vi.mock('../../../src/composables/useSettings', () => ({
  useSettings: () => ({
    settings: ref({ aiProvider: 'gemini', apiKey: 'k', model: 'm' }),
    canUseAi: computed(() => true),
    load: async () => {}
  })
}))

beforeEach(() => {
  push.mockClear()
  localStorage.clear()
  sessionStorage.clear()
})

function chip(wrapper: ReturnType<typeof mount>, label: string) {
  // Match the label span exactly — substring matching would let 'Präsens' hit
  // 'Passiv Präsens' too, passing only by DOM-order luck.
  return wrapper.findAll('button.tense-chip').find(b => b.find('span').text() === label)!
}

describe('VerbSentenceSetup Zeitformen', () => {
  test('default follows the level selection: A1-only levels → only A1 forms selected', async () => {
    const wrapper = mount(VerbSentenceSetup)
    await flushPromises()
    // Narrow levels to A1 (default is all levels): click every level chip except A1 off.
    for (const lvl of ['A2', 'B1', 'B2.1', 'B2.2']) {
      const b = wrapper.findAll('.chip').find(c => c.text() === lvl)!
      await b.trigger('click')
    }
    expect(chip(wrapper, 'Präsens').classes()).toContain('selected')
    expect(chip(wrapper, 'Perfekt').classes()).toContain('selected')
    expect(chip(wrapper, 'Präteritum').classes()).not.toContain('selected')  // A2 form
    expect(chip(wrapper, 'Konjunktiv II').classes()).not.toContain('selected')
  })

  test('manual toggle pins the selection: it persists and stops following the level', async () => {
    const first = mount(VerbSentenceSetup)
    await flushPromises()
    await chip(first, 'Konjunktiv II').trigger('click') // deselect one (default all-levels incl. B1)
    first.unmount()
    const second = mount(VerbSentenceSetup)
    await flushPromises()
    expect(chip(second, 'Konjunktiv II').classes()).not.toContain('selected')
    expect(chip(second, 'Perfekt').classes()).toContain('selected')
  })

  test('stored junk tenses are dropped on load', async () => {
    localStorage.setItem('verbSentenceSetup', JSON.stringify({ tenses: ['perfekt', 'banana'] }))
    const wrapper = mount(VerbSentenceSetup)
    await flushPromises()
    expect(chip(wrapper, 'Perfekt').classes()).toContain('selected')
    expect(chip(wrapper, 'Präsens').classes()).not.toContain('selected')
    expect(wrapper.text()).toContain('Zeitformen · 1 of 15')
  })

  test('passive chips disable when the case filter has no accusative verbs', async () => {
    const wrapper = mount(VerbSentenceSetup)
    await flushPromises()
    // Deselect every case except 'none' → no accusative-capable verbs remain.
    for (const c of ['accusative', 'dative', 'dative+accusative', 'genitive', 'reflexive', 'varies']) {
      const b = wrapper.findAll('.chip').find(x => x.text() === c)!
      await b.trigger('click')
    }
    expect(wrapper.text()).toContain('Passive tenses are disabled')
    expect(chip(wrapper, 'Passiv Präsens').attributes('disabled')).toBeDefined()
  })

  test('a pinned passive chip renders unselected while unsupported, and reselects once accusative returns', async () => {
    const wrapper = mount(VerbSentenceSetup)
    await flushPromises()
    // Deselect every case except 'none' → no accusative-capable verbs remain.
    for (const c of ['accusative', 'dative', 'dative+accusative', 'genitive', 'reflexive', 'varies']) {
      const b = wrapper.findAll('.chip').find(x => x.text() === c)!
      await b.trigger('click')
    }
    expect(chip(wrapper, 'Passiv Präsens').classes()).not.toContain('selected')
    // Pin the selection via a non-passive (enabled) chip — the level-derived
    // default still carries 'passivPraesens' into the pin even though it's
    // currently disabled and can't be clicked directly.
    await chip(wrapper, 'Präsens').trigger('click')
    await chip(wrapper, 'Präsens').trigger('click') // toggle back on: pin now equals the default set
    expect(chip(wrapper, 'Passiv Präsens').classes()).not.toContain('selected')
    // Re-enable accusative → passive support returns; the pinned selection
    // (never dropped) should render selected again.
    const accusative = wrapper.findAll('.chip').find(x => x.text() === 'accusative')!
    await accusative.trigger('click')
    expect(chip(wrapper, 'Passiv Präsens').classes()).toContain('selected')
  })

  test('None empties the selection and disables Start', async () => {
    const wrapper = mount(VerbSentenceSetup)
    await flushPromises()
    const zeitformenField = wrapper.findAll('.field').find(f => f.text().includes('Zeitformen'))!
    const none = zeitformenField.findAll('button').find(b => b.text() === 'None')!
    await none.trigger('click')
    expect(wrapper.text()).toContain('Pick at least one Zeitform')
    const start = wrapper.findAll('button').find(b => b.text().includes('Start'))!
    expect(start.attributes('disabled')).toBeDefined()
  })

  test('start stashes effective tenses in meta and tensed specs', async () => {
    const wrapper = mount(VerbSentenceSetup)
    await flushPromises()
    await wrapper.findAll('button').find(b => b.text().includes('Start'))!.trigger('click')
    await flushPromises()
    const stash = JSON.parse(sessionStorage.getItem('gt:lastVerbSentenceQuiz')!)
    expect(Array.isArray(stash.meta.tenses)).toBe(true)
    expect(stash.meta.tenses.length).toBeGreaterThan(0)
    expect(stash.specs.every((s: { tense?: string }) => typeof s.tense === 'string')).toBe(true)
  })
})
