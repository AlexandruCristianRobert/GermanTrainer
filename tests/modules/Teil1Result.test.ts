import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
import Teil1Result from '../../src/modules/sprechen/Teil1Result.vue'
import { VORTRAG_RESULT_KEY } from '../../src/composables/useVortragGrader'
import { SPRECHEN_B2_TEIL1 } from '../../src/data/rubrics'
import { GLIEDERUNGSPUNKTE, KONNEKTOREN, VORTRAG_WPM } from '../../src/data/sprechenVortragsmittel'

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

  describe('SPRECHDATEN (F19)', () => {
    // 45 words, spaced so countWords() sees exactly 45 — chosen so the
    // computed wpm (45) is distinct from both VORTRAG_WPM (90) and the
    // Redezeit/Gesamtdauer/Pausenzeit clocks below, so each assertion
    // pins down a different piece of arithmetic.
    const REDE_45 = Array.from({ length: 45 }, () => 'Wort').join(' ')

    it('renders Redezeit, Gesamtdauer, Pausenzeit, Wörter/Min and lange Pausen for a spoken stash', async () => {
      stash({}, {
        modality: 'spoken',
        rede: { textDe: REDE_45, seconds: 60, wallSeconds: 90, restarts: 2 }
      })
      const w = await mountLoaded()
      expect(w.text()).toContain('SPRECHDATEN')
      expect(w.text()).toContain('Redezeit (gesprochen) · 1:00')
      expect(w.text()).toContain('Gesamtdauer · 1:30')
      expect(w.text()).toContain('Pausenzeit · 0:30')
      expect(w.text()).toContain('45 Wörter/Min')
      expect(w.text()).toContain(`Ziel ${VORTRAG_WPM}`)
      expect(w.text()).toContain('2 lange Pausen')
    })

    it('renders none of it for a typed stash', async () => {
      stash()
      const w = await mountLoaded()
      expect(w.text()).not.toContain('SPRECHDATEN')
      expect(w.text()).not.toContain('Redezeit (gesprochen)')
    })

    it('guards the wpm division when spoken seconds is zero', async () => {
      stash({}, { modality: 'spoken', rede: { textDe: REDE_45, seconds: 0 } })
      const w = await mountLoaded()
      expect(w.text()).toContain('0 Wörter/Min')
    })
  })

  describe('kiTippCount and the four help switches (F19)', () => {
    it('renders the KI-Tipp count and every switch as set', async () => {
      stash({}, { kiTippCount: 1, helps: { hints: true, checklist: false, kiTipp: true, hardLimit: false } })
      const w = await mountLoaded()
      expect(w.text()).toContain('1 KI-Tipp')
      expect(w.text()).toContain('Hilfen an')
      expect(w.text()).toContain('Checkliste aus')
      expect(w.text()).toContain('KI-Tipp an')
      expect(w.text()).toContain('Zeitlimit weich')
    })

    it('renders the hard-limit switch as hart when set', async () => {
      stash({}, { helps: { hints: false, checklist: true, kiTipp: false, hardLimit: true } })
      const w = await mountLoaded()
      expect(w.text()).toContain('Hilfen aus')
      expect(w.text()).toContain('Zeitlimit hart')
    })
  })

  describe('downgrade note (F13 display)', () => {
    it('renders the one-sentence downgrade note for a downgraded stash, mic-continued-typed, seconds real', async () => {
      stash({}, { modality: 'spoken', rede: { textDe: REDE, seconds: 120 }, downgradedAt: 5000 })
      const w = await mountLoaded()
      expect(w.text()).toContain('Mikrofon')
      expect(w.text()).not.toContain('aus der Wortzahl geschätzt')
    })

    it('omits the downgrade note when the stash carries no downgradedAt', async () => {
      stash({}, { modality: 'spoken', rede: { textDe: REDE, seconds: 120 } })
      const w = await mountLoaded()
      expect(w.text()).not.toContain('Mikrofon')
    })
  })

  describe('Konnektoren-Ausbeute (F16)', () => {
    it('lists each Stellung group with its distinct hit/total and names a cold group', async () => {
      // 'Zunächst' and 'Trotzdem' hit the Satzanfang group, 'Erstens' hits
      // Aufzählen; Gegenüberstellen and the mid-clause group stay untouched.
      stash({}, {
        rede: {
          textDe: 'Zunächst spreche ich über das Ehrenamt. Trotzdem bleibt die ' +
            'Freistellung schwierig. Erstens ist die Zeit knapp.'
        }
      })
      const w = await mountLoaded()
      const satzanfang = KONNEKTOREN.find(g => g.labelDe === 'Satzanfang — Verb an Position 2')!
      const aufzaehlen = KONNEKTOREN.find(g => g.labelDe === 'Aufzählen')!
      const gegenueber = KONNEKTOREN.find(g => g.labelDe === 'Gegenüberstellen')!
      expect(w.text()).toContain('Konnektoren-Ausbeute')
      expect(w.text()).toContain(`2/${satzanfang.konnektoren.length}`)
      expect(w.text()).toContain(`1/${aufzaehlen.konnektoren.length}`)
      expect(w.text()).toContain(`„‚${gegenueber.labelDe}' — nie benutzt.`)
    })

    it('names every group cold when the Rede uses no Konnektoren at all', async () => {
      stash()
      const w = await mountLoaded()
      for (const g of KONNEKTOREN) {
        expect(w.text(), g.labelDe).toContain(`„‚${g.labelDe}' — nie benutzt.`)
      }
    })
  })

  describe("Hilfe-Protokoll — 'stuck' kind and bounded timeline (F6)", () => {
    it("labels a 'stuck' entry Stockung erkannt, distinct from Rettungsleine", async () => {
      stash({}, {
        helpLog: [
          { at: 500, kind: 'stuck' },
          { at: 1500, kind: 'stuck' },
          { at: 2000, kind: 'rettungsleine' }
        ]
      })
      const w = await mountLoaded()
      expect(w.text()).toContain('Stockung erkannt · 2×')
      expect(w.text()).toContain('Rettungsleine · 1×')
    })

    it("bounds the minute timeline to the Rede's own span, dropping a stray entry hours later", async () => {
      stash({}, {
        startedAt: 0,
        finishedAt: 180000, // 3 minutes
        helpLog: [
          { at: 1000, kind: 'drawer' },
          { at: 20000, kind: 'drawer' },
          { at: 36000000, kind: 'drawer' } // hours later — outside the Rede's own span
        ]
      })
      const w = await mountLoaded()
      const buckets = w.findAll('.spr-helpmin-b')
      expect(buckets.length).toBeLessThanOrEqual(4)
      expect(buckets).toHaveLength(3)
    })
  })
})
