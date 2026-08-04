import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../../src/composables/useSprechenArchive', () => ({
  countsByKind: vi.fn(async () => ({
    grammar: 2, 'word-order': 1, vocabulary: 0, spelling: 0, register: 0
  })),
  openCorrections: vi.fn(async () => [{ id: 'a' }, { id: 'b' }])
}))

import SprechenHome from '../../src/modules/sprechen/SprechenHome.vue'
import { saveQuizRun } from '../../src/composables/useQuizHistory'

const push = vi.fn()
const stubs = { RouterLink: true }
const global = { stubs, mocks: { $router: { push } } }

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

beforeEach(() => { localStorage.clear(); push.mockClear() })

describe('SprechenHome', () => {
  it('renders exactly two part panels', () => {
    const w = mount(SprechenHome, { global })
    expect(w.findAll('.spr-part')).toHaveLength(2)
  })

  it('renders the Teil 1 panel as live, with its own stats', () => {
    const w = mount(SprechenHome, { global })
    const teil1 = w.findAll('.spr-part')[0]
    expect(teil1.classes()).not.toContain('dead')
    expect(teil1.attributes('disabled')).toBeUndefined()
    expect(teil1.text()).not.toContain('In Vorbereitung')
    expect(teil1.find('.spr-part-go').exists()).toBe(true)
    expect(teil1.text()).toContain('Themen offen')
    expect(teil1.text()).toContain('noch keine')
  })

  it('navigates to Teil 1 setup from the Teil 1 panel', async () => {
    const w = mount(SprechenHome, { global })
    await w.findAll('.spr-part')[0].trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'sprechen-teil1' })
  })

  it('navigates to Teil 2 setup from the Teil 2 panel', async () => {
    const w = mount(SprechenHome, { global })
    await w.findAll('.spr-part')[1].trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'sprechen-teil2' })
  })

  it('renders the four shared stages', () => {
    const w = mount(SprechenHome, { global })
    expect(w.findAll('.spr-stage')).toHaveLength(4)
  })

  it('renders three shared ledger rows — Redemittel, Fehlerarchiv, Korrekturdrill', () => {
    const w = mount(SprechenHome, { global })
    const rows = w.findAll('.spr-rows')[0].findAll('.spr-row')
    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain('Redemittel')
    expect(rows[1].text()).toContain('Fehlerarchiv')
    expect(rows[2].text()).toContain('Korrekturdrill')
  })

  it('renders the rubric maxima with no runs rather than an empty state', () => {
    const w = mount(SprechenHome, { global })
    expect(w.find('.spr-mast-side').text()).toContain('Erfüllung / Interaktion')
    expect(w.find('.spr-mast-side').text()).not.toContain('Noch keine')
  })

  it('renders the lifetime yield block', () => {
    const w = mount(SprechenHome, { global })
    expect(w.find('.spr-yield').exists()).toBe(true)
  })

  it('distinguishes a failed archive read from a still-loading one', async () => {
    // Regression: `archive === null` was both states, so a failed read told the
    // learner "wird geladen" forever.
    const mod = await import('../../src/composables/useSprechenArchive')
    vi.mocked(mod.countsByKind).mockRejectedValueOnce(new Error('dexie down'))
    const w = mount(SprechenHome, { global })
    expect(w.text()).toContain('Archiv wird geladen')
    await flushPromises()
    expect(w.text()).toContain('Archiv nicht lesbar')
    expect(w.text()).not.toContain('Archiv wird geladen')
  })

  it('shows the archive counts once the read resolves', async () => {
    const w = mount(SprechenHome, { global })
    await flushPromises()
    expect(w.text()).toContain('3 Korrekturen')
    expect(w.text()).toContain('2 offen')
  })

  it('the part toggle switches the Ausbeute between Redemittel and Vortragsmittel', async () => {
    const w = mount(SprechenHome, { global })
    expect(w.text()).not.toContain('Vortragsmittel')

    const toggle = w.findAll('.spr-part-toggle button')
    expect(toggle).toHaveLength(2)
    await toggle[0].trigger('click') // Teil 1
    expect(w.text()).toContain('Vortragsmittel')

    await toggle[1].trigger('click') // back to Teil 2
    expect(w.text()).not.toContain('Vortragsmittel')
  })

  it('toggling to Teil 1 shows that Run\'s criterion scores instead of Teil 2\'s', async () => {
    saveQuizRun({
      type: 'sprechen-teil1',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1000,
      count: 100,
      correct: 44,
      meta: {
        sprechenModality: 'typed',
        sprechenCriteria: [
          { key: 'erfuellung', score: 11, maxPoints: 25 },
          { key: 'kohaerenz', score: 11, maxPoints: 25 },
          { key: 'wortschatz', score: 11, maxPoints: 25 },
          { key: 'strukturen', score: 11, maxPoints: 25 }
        ]
      }
    })
    const w = mount(SprechenHome, { global })
    expect(w.find('.spr-mast-side').text()).not.toContain('11/25')

    const toggle = w.findAll('.spr-part-toggle button')
    await toggle[0].trigger('click') // Teil 1
    expect(w.find('.spr-mast-side').text()).toContain('11/25')
  })

  it('names the criterion rows from the toggled part\'s own rubric', async () => {
    // Regression: the bars read their labels from SPRECHEN_B2_TEIL2 only, so a
    // Teil 1 score appeared under "Erfüllung / Interaktion" — the right number
    // under the wrong name. The weights match between the parts; the first
    // criterion's name does not.
    const w = mount(SprechenHome, { global })
    expect(w.find('.spr-mast-side').text()).toContain('Erfüllung / Interaktion')

    const toggle = w.findAll('.spr-part-toggle button')
    await toggle[0].trigger('click') // Teil 1
    expect(w.find('.spr-mast-side').text()).toContain('Erfüllung / Gliederung')
    expect(w.find('.spr-mast-side').text()).not.toContain('Erfüllung / Interaktion')

    await toggle[1].trigger('click') // back to Teil 2
    expect(w.find('.spr-mast-side').text()).toContain('Erfüllung / Interaktion')
  })

  it('shows a Teil 1 Run in the merged recents list, labelled with its part', () => {
    saveQuizRun({
      type: 'sprechen-teil1',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1000,
      count: 100,
      correct: 78,
      meta: {
        topicTitle: 'Ehrenamtliches Engagement',
        sprechenScore: 78,
        sprechenPraedikat: 'befriedigend',
        sprechenModality: 'typed',
        sectionsCovered: 4,
        wordCount: 360
      }
    })
    const w = mount(SprechenHome, { global })
    const recentRows = w.findAll('.spr-rows')[1].findAll('.spr-row')
    expect(recentRows.length).toBeGreaterThan(0)
    expect(recentRows[0].text()).toContain('Teil 1')
    expect(recentRows[0].text()).toContain('4/5 Punkte')
    expect(recentRows[0].text()).toContain('Ehrenamtliches Engagement')
  })
})
