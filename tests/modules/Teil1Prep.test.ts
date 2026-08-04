import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

// The prep screen resolves its bank through loadCachedBank first — force the
// "no cached bank yet" path so resolution is deterministic (topic-specific or
// tag fallback, never 'cached') unless a test overrides it with
// mockResolvedValueOnce. generateArgumentBank/saveCachedBank are only reached
// by the regenerate button, which none of these tests click.
vi.mock('../../src/composables/useSprechenArguments', () => ({
  loadCachedBank: vi.fn(async () => undefined),
  generateArgumentBank: vi.fn(async () => { throw new Error('not exercised by this suite') }),
  saveCachedBank: vi.fn(async () => undefined)
}))

let canUseAiValue = true

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
      canUseAi: vue.computed(() => canUseAiValue),
      load: async () => {},
      save: async () => {}
    })
  }
})

import Teil1Prep from '../../src/modules/sprechen/Teil1Prep.vue'
import { TEIL1_STASH_KEY, type Teil1RunStash, type VortragHelps } from '../../src/data/sprechen'
import { GLIEDERUNGSPUNKTE, vortragClock } from '../../src/data/sprechenVortragsmittel'
import { emptyPlan } from '../../src/composables/useVortragCoverage'
import { loadCachedBank } from '../../src/composables/useSprechenArguments'
import type { ArgumentBank } from '../../src/data/sprechenArguments'

const HELPS: VortragHelps = { hints: true, checklist: true, kiTipp: true, hardLimit: false }

function stashFor(prepSeconds = 5): Teil1RunStash {
  return {
    thema: {
      id: 'vt-ehrenamt',
      titleDe: 'Ehrenamtliches Engagement',
      taskDe: 'Halten Sie einen kurzen Vortrag darüber, welche Rolle freiwillige Arbeit in einer Gesellschaft spielt.',
      source: 'seed'
    },
    modality: 'typed',
    helps: HELPS,
    prepSeconds,
    plan: emptyPlan(),
    notes: '',
    model: 'gemini-test'
  }
}

function putStash(stash: Teil1RunStash) {
  sessionStorage.setItem(TEIL1_STASH_KEY, JSON.stringify(stash))
}

const fixtureBank = (extra: Partial<ArgumentBank> = {}): ArgumentBank => ({
  pro: [{ claim: 'Pro A', why: 'weil A' }, { claim: 'Pro B', why: 'weil B' }, { claim: 'Pro C', why: 'weil C' }],
  contra: [{ claim: 'Contra A', why: 'weil D' }, { claim: 'Contra B', why: 'weil E' }, { claim: 'Contra C', why: 'weil F' }],
  words: [{ de: 'w1', en: 'e1' }, { de: 'w2', en: 'e2' }, { de: 'w3', en: 'e3' }, { de: 'w4', en: 'e4' }],
  ...extra
})

beforeEach(() => {
  sessionStorage.clear()
  push.mockClear()
  canUseAiValue = true
  vi.mocked(loadCachedBank).mockReset()
  vi.mocked(loadCachedBank).mockResolvedValue(undefined)
})

describe('Teil1Prep — guard', () => {
  it('renders the guard alert and no planner when there is no stash', () => {
    const w = mount(Teil1Prep)
    expect(w.find('.alert-info').exists()).toBe(true)
    expect(w.text()).toContain('Kein Thema gewählt')
    expect(w.findAll('.spr-plan-row')).toHaveLength(0)
  })
})

describe('Teil1Prep — Gliederung planner', () => {
  it('renders five rows in Gliederungspunkt order with their hints and word targets', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const rows = w.findAll('.spr-plan-row')
    expect(rows).toHaveLength(5)
    rows.forEach((row, i) => {
      const point = GLIEDERUNGSPUNKTE[i]
      expect(row.find('.spr-plan-t').text()).toBe(point.labelDe)
      expect(row.find('.spr-plan-h').text()).toBe(point.hintDe)
      expect(row.find('.spr-plan-w').text()).toBe(`~${point.words} Wörter · ${vortragClock(point.words)}`)
    })
  })

  it('marks a row .on and bumps the "geplant" counter when its keyword is typed', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const firstRow = w.findAll('.spr-plan-row')[0]
    expect(firstRow.classes()).not.toContain('on')
    expect(w.find('.spr-sides').text()).toContain('0 geplant')

    await firstRow.find('.spr-plan-in').setValue('Sportvereine')
    expect(firstRow.classes()).toContain('on')
    expect(w.find('.spr-sides').text()).toContain('1 geplant')
  })

  it('presents the three Erfahrungs-Ausgrabung questions verbatim, pinned to the erfahrung row', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const box = w.find('.spr-ausgrabung')
    expect(box.exists()).toBe(true)
    const text = box.text()
    expect(text).toContain('Wann hattest du damit zu tun?')
    expect(text).toContain('Was hast du gemacht?')
    expect(text).toContain('Was kam dabei heraus?')
  })
})

describe('Teil1Prep — Konnektoren-Palette', () => {
  it('appends a clicked Konnektor to the notes textarea', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const btn = w.findAll('.spr-tag').find(b => b.text() === 'zunächst')
    expect(btn).toBeTruthy()
    await btn!.trigger('click')
    expect((w.find('.spr-notes').element as HTMLTextAreaElement).value).toContain('zunächst')
  })
})

describe('Teil1Prep — Wortverbindungen', () => {
  it('renders the Wortverbindungen row when bank.phrases is present', async () => {
    vi.mocked(loadCachedBank).mockResolvedValueOnce(
      fixtureBank({ phrases: [{ de: 'eine Rolle spielen', en: 'to play a role' }] })
    )
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    expect(w.text()).toContain('Wortverbindungen')
    expect(w.text()).toContain('eine Rolle spielen')
  })

  it('does not render the Wortverbindungen row when bank.phrases is absent (a cached bank predating the field)', async () => {
    vi.mocked(loadCachedBank).mockResolvedValueOnce(fixtureBank())
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    expect(w.text()).not.toContain('Wortverbindungen')
  })
})

describe('Teil1Prep — Denkzeit countdown', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }) })
  afterEach(() => { vi.useRealTimers() })

  it('ticks down and shows the expiry note at 0:00 without forcing navigation', async () => {
    putStash(stashFor(5))
    const w = mount(Teil1Prep)
    await flushPromises()

    expect(w.find('.spr-timer-num').text()).toBe('0:05')
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(w.find('.spr-timer-num').text()).toBe('0:04')

    vi.advanceTimersByTime(4000)
    await nextTick()
    expect(w.find('.spr-timer-num').text()).toBe('0:00')
    expect(w.text()).toContain('Zeit vorbei — starten geht weiter')

    // Expiry must not force the start: the CTA stays enabled and unclicked so far.
    const cta = w.find('.btn.btn-accent.btn-meta')
    expect(cta.attributes('disabled')).toBeUndefined()
    expect(push).not.toHaveBeenCalled()

    await cta.trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'sprechen-teil1-run' })
  })
})

describe('Teil1Prep — CTA', () => {
  it('writes plan and notes into the stash and navigates to sprechen-teil1-run', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    await w.findAll('.spr-plan-in')[0].setValue('Sportvereine')
    await w.find('.spr-notes').setValue('ein Beispiel: Verein XY')

    await w.find('.btn.btn-accent.btn-meta').trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'sprechen-teil1-run' })
    const saved = JSON.parse(sessionStorage.getItem(TEIL1_STASH_KEY)!) as Teil1RunStash
    expect(saved.plan.find(p => p.key === 'einstieg')!.keyword).toBe('Sportvereine')
    expect(saved.notes).toBe('ein Beispiel: Verein XY')
  })

  it('is never blocked by an unfinished plan (no keyword typed at all)', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const cta = w.find('.btn.btn-accent.btn-meta')
    expect(cta.attributes('disabled')).toBeUndefined()
    await cta.trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'sprechen-teil1-run' })
  })
})

describe('Teil1Prep — Argumentenspeicher regenerate gating', () => {
  it('disables the regenerate button when canUseAi is false', async () => {
    canUseAiValue = false
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const btn = w.find('.regen-btn')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('enables the regenerate button when canUseAi is true', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const btn = w.find('.regen-btn')
    expect(btn.attributes('disabled')).toBeUndefined()
  })
})
