import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

// The prep screen resolves its bank through loadCachedBank first — force the
// "no cached bank yet" path so resolution is deterministic (topic-specific or
// tag fallback, never 'cached'). generateArgumentBank/saveCachedBank are only
// reached by the regenerate button, which none of these tests click.
vi.mock('../../src/composables/useSprechenArguments', () => ({
  loadCachedBank: vi.fn(async () => undefined),
  generateArgumentBank: vi.fn(async () => { throw new Error('not exercised by this suite') }),
  saveCachedBank: vi.fn(async () => undefined)
}))

// The real useSettings() reads Dexie and probes a dev-only local endpoint —
// neither resolves under jsdom. Stub it so onMounted's `await loadSettings()`
// settles immediately without touching either.
vi.mock('../../src/composables/useSettings', async () => {
  const vue = await import('vue')
  return {
    useSettings: () => ({
      settings: vue.ref({
        id: 'singleton', geminiApiKey: 'AIzaTest', model: 'gemini-test',
        aiProvider: 'gemini', localClaudeModel: 'sonnet', localClaudeEffort: 'low'
      }),
      hasApiKey: vue.computed(() => true),
      canUseAi: vue.computed(() => true),
      load: async () => {},
      save: async () => {}
    })
  }
})

import Teil2Prep from '../../src/modules/sprechen/Teil2Prep.vue'
import { TEIL2_STASH_KEY, type Teil2RunStash } from '../../src/data/sprechen'
import { TOPIC_ARGUMENT_BANKS } from '../../src/data/sprechenArguments'

// 'st-arbeit-vier-tage-woche' is one of the four flagship Topics with a
// bespoke bank in TOPIC_ARGUMENT_BANKS (4 pro / 4 contra / 6 words) — using
// the real bank (rather than a hand-rolled fixture) means the assertions
// below can never drift from what resolveArgumentBank actually returns.
const FLAGSHIP_ID = 'st-arbeit-vier-tage-woche'
const flagshipBank = TOPIC_ARGUMENT_BANKS[FLAGSHIP_ID]

function stashFor(topicId: string, titleDe: string, statementDe: string, prepSeconds = 5): Teil2RunStash {
  return {
    topic: { id: topicId, titleDe, statementDe, source: 'seed' },
    modality: 'typed',
    turnTarget: 6,
    stance: 'pro',      // partner argues pro -> the learner (mySide) argues contra
    prepSeconds,
    hintsOn: true,
    notes: '',
    model: 'gemini-test'
  }
}

function putStash(stash: Teil2RunStash) {
  sessionStorage.setItem(TEIL2_STASH_KEY, JSON.stringify(stash))
}

beforeEach(() => { sessionStorage.clear(); push.mockClear() })

describe('Teil2Prep — Argumentenspeicher', () => {
  it('renders the two argument columns, the learner arguing the side the partner did not take', async () => {
    putStash(stashFor(FLAGSHIP_ID, 'Vier-Tage-Woche', 'Sollte die Vier-Tage-Woche zum Standard werden?'))
    const w = mount(Teil2Prep)
    await flushPromises()

    expect(w.findAll('.spr-acol')).toHaveLength(2)
    const mineCol = w.find('.spr-acol.mine')
    const theirsCol = w.find('.spr-acol.theirs')
    expect(mineCol.exists()).toBe(true)
    expect(theirsCol.exists()).toBe(true)

    // stance is 'pro' -> mySide is 'contra' -> the mine column is the contra bank
    const mineAngles = mineCol.findAll('.spr-angle')
    const theirsAngles = theirsCol.findAll('.spr-angle')
    expect(mineAngles).toHaveLength(flagshipBank.contra.length)
    expect(theirsAngles).toHaveLength(flagshipBank.pro.length)

    const firstClaim = mineAngles[0].find('.spr-angle-c')
    expect(firstClaim.find('b').text()).toBe('01')
    expect(firstClaim.find('span').text()).toBe(flagshipBank.contra[0].claim)
    expect(mineAngles[0].find('.spr-angle-w').text()).toBe(flagshipBank.contra[0].why)

    const secondClaim = theirsAngles[1].find('.spr-angle-c')
    expect(secondClaim.find('b').text()).toBe('02')
    expect(secondClaim.find('span').text()).toBe(flagshipBank.pro[1].claim)
  })

  it('renders one Wortschatz word per bank word', async () => {
    putStash(stashFor(FLAGSHIP_ID, 'Vier-Tage-Woche', 'Sollte die Vier-Tage-Woche zum Standard werden?'))
    const w = mount(Teil2Prep)
    await flushPromises()

    const words = w.findAll('.spr-word')
    expect(words).toHaveLength(flagshipBank.words.length)
    expect(words[0].find('.spr-word-de').text()).toBe(flagshipBank.words[0].de)
    expect(words[0].find('.spr-word-en').text()).toBe(flagshipBank.words[0].en)
  })

  it('generates the notes placeholder from the resolved bank', async () => {
    putStash(stashFor(FLAGSHIP_ID, 'Vier-Tage-Woche', 'Sollte die Vier-Tage-Woche zum Standard werden?'))
    const w = mount(Teil2Prep)
    await flushPromises()

    const placeholder = w.find('.spr-notes').attributes('placeholder') ?? ''
    // mine = contra (the learner's own first angle), theirs = pro (the first counter-angle)
    expect(placeholder).toContain(flagshipBank.contra[0].claim)
    expect(placeholder).toContain(flagshipBank.pro[0].claim)
  })

  it('distinguishes a topic-specific bank from a tag-level fallback in the scope label', async () => {
    putStash(stashFor(FLAGSHIP_ID, 'Vier-Tage-Woche', 'Sollte die Vier-Tage-Woche zum Standard werden?'))
    const topicSpecific = mount(Teil2Prep)
    await flushPromises()
    expect(topicSpecific.find('.spr-block-n').text()).toContain('themenspezifisch')

    // Not one of the four flagship ids in TOPIC_ARGUMENT_BANKS -> falls back
    // to its tag's bank (tags: ['Umwelt'], per sprechenTopics.ts).
    putStash(stashFor('st-umwelt-schottergaerten', 'Schottergärten', 'Sollten pflegeleichte Schottergärten verboten werden?'))
    const tagFallback = mount(Teil2Prep)
    await flushPromises()
    expect(tagFallback.find('.spr-block-n').text()).toContain('Feld Umwelt')
  })
})

describe('Teil2Prep — Denkzeit countdown', () => {
  // Fake ONLY setInterval/clearInterval: the component's own tick uses
  // window.setInterval, but flushPromises() (used to drain onMounted's
  // async bank resolution) relies on the real setImmediate/setTimeout —
  // faking those too would deadlock the very awaits this suite needs.
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }) })
  afterEach(() => { vi.useRealTimers() })

  it('counts down, pauses, and stops — but expiry never forces the start', async () => {
    putStash(stashFor(FLAGSHIP_ID, 'Vier-Tage-Woche', 'Sollte die Vier-Tage-Woche zum Standard werden?', 5))
    const w = mount(Teil2Prep)
    await flushPromises()

    expect(w.find('.spr-timer-num').text()).toBe('0:05')

    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(w.find('.spr-timer-num').text()).toBe('0:04')

    // Pause halts the decrement
    const ctlButtons = () => w.find('.spr-timer-ctl').findAll('button')
    await ctlButtons()[0].trigger('click')   // Pause
    vi.advanceTimersByTime(2000)
    await nextTick()
    expect(w.find('.spr-timer-num').text()).toBe('0:04')

    // Resume, then Stopp drives the clock straight to 0:00 regardless of time left
    await ctlButtons()[0].trigger('click')   // Weiter
    await ctlButtons()[1].trigger('click')   // Stopp
    await nextTick()
    expect(w.find('.spr-timer-num').text()).toBe('0:00')
    expect(w.find('.spr-timer-num').classes()).toContain('low')

    // Expiry must not force the start: the CTA stays enabled and no navigation happens
    const startBtn = w.find('.btn.btn-accent.btn-meta')
    expect(startBtn.exists()).toBe(true)
    expect(startBtn.attributes('disabled')).toBeUndefined()

    vi.advanceTimersByTime(3000)
    await nextTick()
    expect(w.find('.spr-timer-num').text()).toBe('0:00')
    expect(push).not.toHaveBeenCalled()
  })
})
