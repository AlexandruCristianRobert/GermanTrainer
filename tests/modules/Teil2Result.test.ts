import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
import Teil2Result from '../../src/modules/sprechen/Teil2Result.vue'
import { SPRECHEN_RESULT_KEY } from '../../src/composables/useSprechenGrader'
import { SPRECHEN_B2_TEIL2 } from '../../src/data/rubrics'

// The brief's placeholder stash (topicTitle/modality/learnerTurns flat on the
// object, result nested) does not match the real SprechenResultStash in
// useSprechenGrader.ts: `topic` is a DiscussionTopicRef, turns are full
// DiscussionTurn[] (role/textDe/at), and `modality` sits alongside `topic` —
// added in this task, since the Auswertung genuinely needs it to pick the
// kohaerenz descriptor and nothing else in the stash carried it before.
function stash(over: Record<string, unknown> = {}) {
  sessionStorage.setItem(SPRECHEN_RESULT_KEY, JSON.stringify({
    topic: { id: 't1', titleDe: 'Tempolimit', statementDe: 'Brauchen wir ein Tempolimit?', source: 'seed' },
    stance: 'pro',
    modality: 'typed',
    turnTarget: 6,
    turns: [
      { role: 'learner', textDe: 'Aus meiner Sicht brauchen wir das.', at: 1000 },
      { role: 'partner', textDe: 'Wirklich? Warum denn?', at: 2000 },
      { role: 'learner', textDe: 'Wie sehen Sie das?', at: 3000 }
    ],
    kiTippCount: 0,
    startedAt: 0,
    finishedAt: 4000,
    result: {
      totalScore: 72, passes: true, praedikat: 'befriedigend',
      criteria: SPRECHEN_B2_TEIL2.criteria.map(c => ({
        key: c.key, labelDe: c.labelDe, maxPoints: c.maxPoints, score: 18,
        justificationDe: 'ok', justificationEn: 'ok'
      })),
      mistakes: [], strengths: [], weaknesses: [],
      overallDe: 'Gut gemacht.', overallEn: 'Well done.',
      generatedAt: 0, modelUsed: 'test',
      ...over
    }
  }))
}

beforeEach(() => sessionStorage.clear())

// mount() returns before onMounted's sessionStorage-driven `data.value =`
// assignment has propagated through Vue's scheduler into the DOM (the
// initial render happens with `data` still null, showing the loading
// state) — every test needs one flushPromises() before it can see the
// loaded page, matching the existing pattern in
// tests/modules/verbs/TranslationQuizResult.test.ts.
async function mountLoaded() {
  const w = mount(Teil2Result)
  await flushPromises()
  return w
}

describe('Teil2Result', () => {
  it('renders the score, stamp and four criterion bars', async () => {
    stash(); const w = await mountLoaded()
    expect(w.find('.spr-vscore').text()).toContain('72')
    expect(w.find('.spr-stamp').text()).toContain('befriedigend')
    expect(w.findAll('.spr-vcrit')).toHaveLength(4)
  })

  it('prints each criterion descriptor verbatim from the rubric', async () => {
    stash(); const w = await mountLoaded()
    expect(w.text()).toContain(SPRECHEN_B2_TEIL2.criteria[0].descriptorDe.slice(0, 40))
  })

  it('uses the spoken descriptor for a spoken Discussion', async () => {
    stash()
    const s = JSON.parse(sessionStorage.getItem(SPRECHEN_RESULT_KEY)!)
    s.modality = 'spoken'
    sessionStorage.setItem(SPRECHEN_RESULT_KEY, JSON.stringify(s))
    const w = await mountLoaded()
    expect(w.text()).toContain('SPRECHDATEN')
  })

  it('omits the matrix entirely when structure is absent', async () => {
    stash(); const w = await mountLoaded()
    expect(w.find('.spr-matrix').exists()).toBe(false)
    expect(w.text()).not.toContain('Argumentation & Interaktion')
  })

  it('renders one matrix row per learner turn when structure is present', async () => {
    stash({
      structure: [
        { these: true, begruendung: true, beispiel: false, reacts: false },
        { these: true, begruendung: true, beispiel: true, reacts: true }
      ],
      interaction: { askedBack: 1, rate: 0.5 }
    })
    const w = await mountLoaded()
    expect(w.findAll('.spr-mx-c.turn')).toHaveLength(2)
    expect(w.findAll('.spr-mx-mark.yes')).toHaveLength(6)
    expect(w.text()).toContain('50')
  })

  it('renders the per-Discussion Redemittel yield', async () => {
    stash(); const w = await mountLoaded()
    // 'Aus meiner Sicht' and 'Wie sehen Sie das' are both real Redemittel.
    expect(w.find('.spr-yield').exists()).toBe(true)
    expect(w.findAll('.spr-tick.on')).toHaveLength(2)
  })

  it('re-anchors a mistake span by searching the turn text', async () => {
    stash({ mistakes: [{
      turnIndex: 0, quote: 'brauchen wir das', suggested: 'brauchen wir es',
      kind: 'vocabulary', reasonDe: 'weil', reasonEn: 'because',
      spanStart: 9999, spanEnd: 9999   // stored offsets must be ignored
    }] })
    const w = await mountLoaded()
    expect(w.find('.spr-mistake').exists()).toBe(true)
    expect(w.find('.spr-mistake').text()).toBe('brauchen wir das')
  })

  it('opens one detail block when a mistake span is tapped', async () => {
    stash({ mistakes: [{
      turnIndex: 0, quote: 'brauchen wir das', suggested: 'brauchen wir es',
      kind: 'vocabulary', reasonDe: 'weil', reasonEn: 'because'
    }] })
    const w = await mountLoaded()
    expect(w.find('.spr-mkcard').exists()).toBe(false)
    await w.find('.spr-mistake').trigger('click')
    expect(w.findAll('.spr-mkcard')).toHaveLength(1)
    expect(w.find('.spr-mk-right').text()).toContain('brauchen wir es')
  })
})
