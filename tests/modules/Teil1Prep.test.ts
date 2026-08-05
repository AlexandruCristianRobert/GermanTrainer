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
import { GLIEDERUNGSPUNKTE, vortragClock, KONNEKTOREN } from '../../src/data/sprechenVortragsmittel'
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

  it('presents the four Erfahrungs-Ausgrabung questions verbatim, pinned to the erfahrung row, ending with the connective question (F22)', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const box = w.find('.spr-ausgrabung')
    expect(box.exists()).toBe(true)
    const items = box.findAll('li')
    expect(items).toHaveLength(4)
    expect(items[0].text()).toBe('Wann hattest du damit zu tun?')
    expect(items[1].text()).toBe('Was hast du gemacht?')
    expect(items[2].text()).toBe('Was kam dabei heraus?')
    expect(items[3].text()).toBe('Und was zeigt das Beispiel?')
  })
})

describe('Teil1Prep — Konnektoren-Palette (F10)', () => {
  it('renders every group with its label, Stellung rule and konnektoren', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const groups = w.findAll('.spr-konnekt-group')
    expect(groups).toHaveLength(KONNEKTOREN.length)
    groups.forEach((g, i) => {
      expect(g.find('.spr-lbl').text()).toBe(KONNEKTOREN[i].labelDe)
      expect(g.find('.spr-konnekt-stellung').text()).toBe(KONNEKTOREN[i].stellungDe)
      const tags = g.findAll('.spr-tag')
      expect(tags).toHaveLength(KONNEKTOREN[i].konnektoren.length)
      tags.forEach((tag, k) => expect(tag.text()).toBe(KONNEKTOREN[i].konnektoren[k].wort))
    })
  })

  it('inserts the full frame — not the bare word — when a Konnektor is tapped', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const btn = w.findAll('.spr-tag').find(b => b.text() === 'Trotzdem')
    expect(btn).toBeTruthy()
    await btn!.trigger('click')
    const notes = (w.find('.spr-notes').element as HTMLTextAreaElement).value
    expect(notes).toContain('Trotzdem bleibt …')
  })

  it('appends successive frames space-separated', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    await w.findAll('.spr-tag').find(b => b.text() === 'Zunächst')!.trigger('click')
    await w.findAll('.spr-tag').find(b => b.text() === 'Außerdem')!.trigger('click')
    const notes = (w.find('.spr-notes').element as HTMLTextAreaElement).value
    expect(notes).toBe('Zunächst möchte ich … Außerdem ist …')
  })
})

describe('Teil1Prep — keyword hygiene (F11)', () => {
  it('warns on both rows when two keywords are identical after normalisation', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const inputs = w.findAll('.spr-plan-in')
    await inputs[0].setValue('Vereine')
    await inputs[1].setValue('Vereine.')  // normalises to the same string
    await nextTick()

    const warnings = w.findAll('.spr-plan-warn')
    expect(warnings.length).toBeGreaterThanOrEqual(2)
    expect(w.text()).toContain('beide Häkchen leuchten zusammen')
  })

  it('warns when a keyword is a substring of another, either direction, in the spec\'s style', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const inputs = w.findAll('.spr-plan-in')
    await inputs[0].setValue('Sport')
    await inputs[1].setValue('Sportverein')
    await nextTick()

    expect(w.text()).toContain('steckt in')

    // The reverse order (longer keyword typed first) must warn identically.
    await inputs[0].setValue('Sportverein')
    await inputs[1].setValue('Sport')
    await nextTick()
    expect(w.text()).toContain('steckt in')
  })

  it('warns when a normalised keyword is shorter than 4 characters', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    await w.findAll('.spr-plan-in')[0].setValue('Job')
    await nextTick()

    expect(w.find('.spr-plan-warn').exists()).toBe(true)
    expect(w.text()).toContain('kürzer als vier Zeichen')
  })

  it('never disables the CTA, however many warnings are showing', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const inputs = w.findAll('.spr-plan-in')
    await inputs[0].setValue('Job')
    await inputs[1].setValue('Job')
    await inputs[2].setValue('Sport')
    await inputs[3].setValue('Sportverein')
    await nextTick()

    expect(w.findAll('.spr-plan-warn').length).toBeGreaterThan(0)
    const cta = w.find('.btn.btn-accent.btn-meta')
    expect(cta.attributes('disabled')).toBeUndefined()
    await cta.trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'sprechen-teil1-run' })
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

describe('Teil1Prep — reload-proofing (F4-prep)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
  })
  afterEach(() => { vi.useRealTimers() })

  it('debounces plan and notes into the sessionStorage stash (~500ms) so a fresh mount restores them', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    await w.findAll('.spr-plan-in')[0].setValue('Sportvereine')
    await w.find('.spr-notes').setValue('ein Beispiel: Verein XY')

    // Not written synchronously — that is the whole point of debouncing.
    const mid = JSON.parse(sessionStorage.getItem(TEIL1_STASH_KEY)!) as Teil1RunStash
    expect(mid.notes).toBe('')

    vi.advanceTimersByTime(500)
    await nextTick()

    const saved = JSON.parse(sessionStorage.getItem(TEIL1_STASH_KEY)!) as Teil1RunStash
    expect(saved.plan.find(p => p.key === 'einstieg')!.keyword).toBe('Sportvereine')
    expect(saved.notes).toBe('ein Beispiel: Verein XY')

    w.unmount()
    const w2 = mount(Teil1Prep)
    await flushPromises()
    expect((w2.findAll('.spr-plan-in')[0].element as HTMLInputElement).value).toBe('Sportvereine')
    expect((w2.find('.spr-notes').element as HTMLTextAreaElement).value).toBe('ein Beispiel: Verein XY')
    w2.unmount()
  })

  it('resets the debounce timer on rapid edits so only the latest value is ever written', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    await w.find('.spr-notes').setValue('erste Fassung')
    vi.advanceTimersByTime(300)
    await w.find('.spr-notes').setValue('zweite Fassung')
    vi.advanceTimersByTime(300)

    // 600ms since the FIRST edit, but only 300ms since the second — if the
    // timer were not reset, the first edit's write would have already landed.
    let saved = JSON.parse(sessionStorage.getItem(TEIL1_STASH_KEY)!) as Teil1RunStash
    expect(saved.notes).toBe('')

    vi.advanceTimersByTime(300)
    await nextTick()
    saved = JSON.parse(sessionStorage.getItem(TEIL1_STASH_KEY)!) as Teil1RunStash
    expect(saved.notes).toBe('zweite Fassung')
    w.unmount()
  })

  it('go() still writes synchronously before navigating, debounce or not', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    await w.find('.spr-notes').setValue('sofort gespeichert')
    await w.find('.btn.btn-accent.btn-meta').trigger('click')

    const saved = JSON.parse(sessionStorage.getItem(TEIL1_STASH_KEY)!) as Teil1RunStash
    expect(saved.notes).toBe('sofort gespeichert')
    expect(push).toHaveBeenCalledWith({ name: 'sprechen-teil1-run' })
    w.unmount()
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
