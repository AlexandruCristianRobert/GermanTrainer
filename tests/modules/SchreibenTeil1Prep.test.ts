import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

// The prep screen resolves its bank through loadCachedSchreibBank first —
// force the "no cached bank yet" path so resolution is deterministic (topic
// or tag fallback, never 'cached') unless a test overrides it.
// generateSchreibArgumentBank/saveCachedSchreibBank are only reached by the
// regenerate button, which none of these tests click.
vi.mock('../../src/composables/useSchreibenArguments', () => ({
  loadCachedSchreibBank: vi.fn(async () => undefined),
  generateSchreibArgumentBank: vi.fn(async () => { throw new Error('not exercised by this suite') }),
  saveCachedSchreibBank: vi.fn(async () => undefined)
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

import Teil1Prep from '../../src/modules/schreiben/Teil1Prep.vue'
import { SCHREIBEN_STASH_KEY, emptySchreibPlan, type SchreibenRunStash } from '../../src/data/schreiben'
import { loadCachedSchreibBank } from '../../src/composables/useSchreibenArguments'

function stashFor(): SchreibenRunStash {
  return {
    thema: {
      id: 'wt-test-thema',
      titleDe: 'Testthema',
      forumContextDe: 'Ein Forumsthread zum Testen.',
      taskDe: 'Schreiben Sie einen Forumsbeitrag zum Testthema.',
      inhaltspunkte: ['Punkt eins', 'Punkt zwei', 'Punkt drei', 'Punkt vier'],
      tags: ['Gesellschaft']
    },
    helps: { hints: true, checklist: true, kiTipp: true, timer: true },
    plan: emptySchreibPlan(),
    model: 'x'
  }
}

function putStash(stash: SchreibenRunStash) {
  sessionStorage.setItem(SCHREIBEN_STASH_KEY, JSON.stringify(stash))
}

beforeEach(() => {
  sessionStorage.clear()
  push.mockClear()
  canUseAiValue = true
  vi.mocked(loadCachedSchreibBank).mockReset()
  vi.mocked(loadCachedSchreibBank).mockResolvedValue(undefined)
})

describe('Teil1Prep (Schreiben) — blur-gated in-row keyword warning', () => {
  it('shows no .sch-plan-warn anywhere while the field is focused, even 2 chars in', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const input = w.findAll('.spr-plan-in')[0]
    await input.trigger('focus')
    await input.setValue('Jo')
    await nextTick()

    expect(w.find('.sch-plan-warn').exists()).toBe(false)
  })

  it('shows the too-short warning inside the same .spr-plan-row after blur', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const input = w.findAll('.spr-plan-in')[0]
    await input.trigger('focus')
    await input.setValue('Jo')
    await input.trigger('blur')
    await nextTick()

    const row = w.findAll('.spr-plan-row')[0]
    expect(row.find('.sch-plan-warn').exists()).toBe(true)
    expect(row.find('.sch-plan-warn').text()).toContain('kürzer als vier Zeichen')
  })

  it('hides the warning again on refocus, and re-shows it on the next blur', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const input = w.findAll('.spr-plan-in')[0]
    const row = w.findAll('.spr-plan-row')[0]

    await input.trigger('focus')
    await input.setValue('Jo')
    await input.trigger('blur')
    expect(row.find('.sch-plan-warn').exists()).toBe(true)

    await input.trigger('focus')
    await nextTick()
    expect(row.find('.sch-plan-warn').exists()).toBe(false)

    await input.trigger('blur')
    await nextTick()
    expect(row.find('.sch-plan-warn').exists()).toBe(true)
  })

  it('shows a pair (duplicate) warning only once BOTH keywords have been blurred', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const inputs = w.findAll('.spr-plan-in')

    await inputs[0].trigger('focus')
    await inputs[0].setValue('Kosten')
    await inputs[0].trigger('blur')
    await nextTick()
    // Only one of the two duplicate keywords is touched so far — pair rule
    // must not fire on a single touched side.
    expect(w.text()).not.toContain('beide Häkchen leuchten zusammen')
    expect(w.findAll('.sch-plan-warn')).toHaveLength(0)

    await inputs[1].trigger('focus')
    await inputs[1].setValue('Kosten')
    await inputs[1].trigger('blur')
    await nextTick()

    expect(w.text()).toContain('beide Häkchen leuchten zusammen')
    expect(w.findAll('.sch-plan-warn').length).toBeGreaterThanOrEqual(1)
  })

  it('shows no warning after blur for a valid, unique keyword (>=4 normalised chars)', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const input = w.findAll('.spr-plan-in')[0]
    await input.trigger('focus')
    await input.setValue('Sportverein')
    await input.trigger('blur')
    await nextTick()

    expect(w.find('.sch-plan-warn').exists()).toBe(false)
  })

  it('never disables the CTAs, however many warnings are showing', async () => {
    putStash(stashFor())
    const w = mount(Teil1Prep)
    await flushPromises()

    const inputs = w.findAll('.spr-plan-in')
    for (const input of inputs) {
      await input.trigger('focus')
      await input.setValue('Jo')
      await input.trigger('blur')
    }
    await nextTick()

    expect(w.findAll('.sch-plan-warn').length).toBeGreaterThan(0)

    const withoutPlanBtn = w.findAll('button').find(b => b.text().includes('Ohne Plan starten'))
    expect(withoutPlanBtn).toBeTruthy()
    expect(withoutPlanBtn!.attributes('disabled')).toBeUndefined()

    const cta = w.find('.btn.btn-accent.btn-meta')
    expect(cta.attributes('disabled')).toBeUndefined()
    await cta.trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'schreiben-teil1-run' })
  })
})
