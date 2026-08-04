import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
import Teil1Result from '../../src/modules/sprechen/Teil1Result.vue'
import { VORTRAG_RESULT_KEY } from '../../src/composables/useVortragGrader'
import { SPRECHEN_B2_TEIL1 } from '../../src/data/rubrics'
import { GLIEDERUNGSPUNKTE } from '../../src/data/sprechenVortragsmittel'

// A Rede whose vocabulary deliberately touches some of the fixture's plan
// keywords ('Ehrenamt', 'Freistellung') and not others ('Verein', 'Wichtig'),
// so the coverage rail's keyword signal has both a `gesagt` and a `nicht
// gesagt` row to assert on (ADR-0014).
const REDE =
  'Ich möchte heute über das Thema Ehrenamt sprechen. Freiwillige brauchen oft ' +
  'eine Freistellung von der Arbeit, das ist manchmal schwierig zu organisieren.'

function stash(resultOver: Record<string, unknown> = {}, topOver: Record<string, unknown> = {}) {
  sessionStorage.setItem(VORTRAG_RESULT_KEY, JSON.stringify({
    thema: {
      id: 'vt-ehrenamt', titleDe: 'Ehrenamtliches Engagement',
      taskDe: 'Halten Sie einen kurzen Vortrag darüber, welche Rolle freiwillige Arbeit spielt.',
      source: 'seed'
    },
    modality: 'typed',
    helps: { hints: true, checklist: true, kiTipp: false, hardLimit: false },
    plan: [
      { key: 'einstieg', keyword: 'Ehrenamt' },
      { key: 'situation', keyword: '' },
      { key: 'aspekte', keyword: 'Freistellung' },
      { key: 'erfahrung', keyword: 'Verein' },
      { key: 'fazit', keyword: 'Wichtig' }
    ],
    rede: { textDe: REDE },
    kiTippCount: 0,
    helpLog: [
      { at: 1000, kind: 'drawer' },
      { at: 2000, kind: 'drawer' },
      { at: 65000, kind: 'rettungsleine' }
    ],
    vortragsmittel: ['vm-einstieg-1', 'vm-abschluss-5'],
    startedAt: 0,
    finishedAt: 240000,
    result: {
      totalScore: 72, passes: true, praedikat: 'befriedigend',
      criteria: SPRECHEN_B2_TEIL1.criteria.map(c => ({
        key: c.key, labelDe: c.labelDe, maxPoints: c.maxPoints, score: 18,
        justificationDe: 'Begründung DE', justificationEn: 'Justification EN'
      })),
      coverage: GLIEDERUNGSPUNKTE.map(p => ({
        key: p.key, covered: p.key !== 'situation', note: `Notiz zu ${p.key}`
      })),
      mistakes: [],
      aufwertungen: [],
      strengths: [{ de: 'Starke Gliederung', en: 'Strong structure' }],
      weaknesses: [{ de: 'Wenig Beispiele', en: 'Few examples' }],
      overallDe: 'Gut gemacht.', overallEn: 'Well done.',
      generatedAt: 0, modelUsed: 'test',
      ...resultOver
    },
    ...topOver
  }))
}

beforeEach(() => { sessionStorage.clear(); localStorage.clear() })

async function mountLoaded() {
  const w = mount(Teil1Result)
  await flushPromises()
  return w
}

describe('Teil1Result', () => {
  it('shows a guard alert and no verdict when there is no stash', async () => {
    const w = await mountLoaded()
    expect(w.find('.alert').exists()).toBe(true)
    expect(w.find('.spr-verdict').exists()).toBe(false)
  })

  it('renders the score, the Prädikat stamp and four criterion bars', async () => {
    stash()
    const w = await mountLoaded()
    expect(w.find('.spr-vscore').text()).toContain('72')
    expect(w.find('.spr-stamp').text()).toContain('befriedigend')
    expect(w.findAll('.spr-vcrit')).toHaveLength(4)
  })

  it('prints each criterion descriptor verbatim from the Teil-1 rubric', async () => {
    stash()
    const w = await mountLoaded()
    expect(w.text()).toContain(SPRECHEN_B2_TEIL1.criteria[0].descriptorDe.slice(0, 40))
  })

  it('adds the word-proxy note for a typed run and omits it for a spoken run', async () => {
    stash()
    const typed = await mountLoaded()
    expect(typed.text()).toContain('aus der Wortzahl geschätzt')

    stash({}, { modality: 'spoken' })
    const spoken = await mountLoaded()
    expect(spoken.text()).not.toContain('aus der Wortzahl geschätzt')
  })

  it('renders five coverage rows with the keyword signal beside the dot, no word bar', async () => {
    stash()
    const w = await mountLoaded()
    expect(w.findAll('.spr-cov-row')).toHaveLength(5)
    expect(w.find('.spr-cov-bar').exists()).toBe(false)
    expect(w.find('.spr-cov-w').exists()).toBe(false)
    expect(w.text()).toContain('gesagt: „Ehrenamt"')
    expect(w.text()).toContain('gesagt: „Freistellung"')
    expect(w.text()).toContain('nicht gesagt: „Verein"')
    expect(w.text()).toContain('kein Stichwort geplant')
  })

  it('flips justifications, mistake reasons and Aufwertung whys with the DE/EN toggle', async () => {
    stash({
      mistakes: [{
        phase: 'rede', quote: 'Freiwillige brauchen', suggested: 'Freiwillige benötigen',
        kind: 'vocabulary', reasonDe: 'Grund DE', reasonEn: 'Reason EN', spanStart: 9999, spanEnd: 9999
      }],
      aufwertungen: [{
        quote: 'oft eine Freistellung', better: 'häufig eine Freistellung',
        whyDe: 'Warum DE', whyEn: 'Why EN', spanStart: 9999, spanEnd: 9999
      }]
    })
    const w = await mountLoaded()
    expect(w.text()).toContain('Begründung DE')
    expect(w.text()).toContain('Warum DE')
    expect(w.text()).not.toContain('Why EN')
    await w.find('.spr-mistake').trigger('click')
    expect(w.text()).toContain('Grund DE')

    const enBtn = w.findAll('button').find(b => b.text() === 'EN')!
    await enBtn.trigger('click')
    expect(w.text()).toContain('Justification EN')
    expect(w.text()).toContain('Reason EN')
    expect(w.text()).toContain('Why EN')
  })

  it('opens a detail card with Art, Du, Besser and Warum when a mistake span is tapped', async () => {
    stash({
      mistakes: [{
        phase: 'rede', quote: 'Freiwillige brauchen', suggested: 'Freiwillige benötigen',
        kind: 'vocabulary', reasonDe: 'weil unpräzise', reasonEn: 'because imprecise',
        spanStart: 9999, spanEnd: 9999
      }]
    })
    const w = await mountLoaded()
    expect(w.find('.spr-mkcard').exists()).toBe(false)
    await w.find('.spr-mistake').trigger('click')
    const card = w.find('.spr-mkcard')
    expect(card.exists()).toBe(true)
    expect(card.text()).toContain('Art')
    expect(card.text()).toContain('Du')
    expect(card.text()).toContain('Besser')
    expect(card.text()).toContain('Warum')
    expect(card.text()).toContain('Freiwillige benötigen')
  })

  it('re-anchors mistake spans at render time and drops one whose quote cannot be found', async () => {
    stash({
      mistakes: [
        {
          phase: 'rede', quote: 'Freiwillige brauchen', suggested: 'Freiwillige benötigen',
          kind: 'vocabulary', reasonDe: 'a', reasonEn: 'b', spanStart: 9999, spanEnd: 9999
        },
        {
          phase: 'rede', quote: 'dieser Text kommt nirgends vor', suggested: 'x',
          kind: 'grammar', reasonDe: 'y', reasonEn: 'z', spanStart: 0, spanEnd: 5
        }
      ]
    })
    const w = await mountLoaded()
    const buttons = w.findAll('.spr-mistake')
    expect(buttons).toHaveLength(1)
    expect(buttons[0].text()).toBe('Freiwillige brauchen')
  })

  it('renders Aufwertungen in their own section, never inside the mistake counts', async () => {
    stash({
      mistakes: [{
        phase: 'rede', quote: 'Freiwillige brauchen', suggested: 'x',
        kind: 'vocabulary', reasonDe: 'a', reasonEn: 'b', spanStart: 9999, spanEnd: 9999
      }],
      aufwertungen: [{
        quote: 'oft eine Freistellung', better: 'häufig eine Freistellung',
        whyDe: 'stilistisch runder', whyEn: 'more idiomatic', spanStart: 9999, spanEnd: 9999
      }]
    })
    const w = await mountLoaded()
    expect(w.find('.spr-auf').exists()).toBe(true)
    expect(w.text()).toContain('Aufwertungen')
    expect(w.text()).toContain('Keine Fehler')
    expect(w.text()).toContain('stilistisch runder')
    expect(w.find('.spr-counts').text()).toContain('Wortschatz · 1')
    expect(w.find('.spr-counts').text()).not.toContain('Aufwertung')
  })

  it('omits the Aufwertungen block entirely when there are none', async () => {
    stash()
    const w = await mountLoaded()
    expect(w.find('.spr-auf').exists()).toBe(false)
    expect(w.text()).not.toContain('Aufwertungen')
  })

  it('states plainly that no Nachfrage was asked and that Erfüllung was not docked for it', async () => {
    stash()
    const w = await mountLoaded()
    expect(w.text()).toContain('keine Nachfrage gestellt')
    expect(w.text()).toContain('nicht negativ')
  })

  it('reports Hilfe-Protokoll counts per kind and states it is purely descriptive', async () => {
    stash()
    const w = await mountLoaded()
    expect(w.text()).toContain('Hilfe-Protokoll')
    expect(w.text()).toContain('Hinweis-Schublade · 2×')
    expect(w.text()).toContain('Rettungsleine · 1×')
    expect(w.text()).toContain('beschreibend')
  })

  it('renders the Vortragsmittel yield with seven Move columns', async () => {
    stash()
    const w = await mountLoaded()
    expect(w.findAll('.spr-yield .spr-ymove')).toHaveLength(7)
    expect(w.findAll('.spr-yield .spr-tick.on')).toHaveLength(2)
  })
})
