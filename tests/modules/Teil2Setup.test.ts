import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../src/composables/useSprechenDiscussion', () => ({
  findActiveDiscussion: vi.fn(async () => undefined),
  createDiscussion: vi.fn(async () => ({ id: 'd1' })),
  deleteDiscussion: vi.fn(async () => undefined)
}))
vi.mock('../../src/composables/useSprechenArguments', () => ({
  cachedBankIds: vi.fn(async () => new Set<string>())
}))
// jsdom has no SpeechRecognition and no speechSynthesis voices; both must be
// faked or the spoken Modality is permanently unselectable in tests.
vi.mock('../../src/composables/useSpeechRecognizer', () => ({
  isSpeechRecognitionSupported: () => true
}))
vi.mock('../../src/composables/useSpeechVoice', () => ({
  useSpeechVoice: () => ({
    voices: { value: [{ name: 'Katja' }] },
    voiceName: { value: 'Katja' },
    rate: { value: 1 },
    speak: vi.fn(async () => undefined)
  })
}))
// The real useSettings() probes a dev-only local endpoint and reads Dexie —
// neither resolves truthy under jsdom, which would leave canUseAi false and
// the CTA permanently disabled regardless of Topic selection. Stub it so the
// CTA tests below isolate the Topic gate (canUseAi's own gating is a
// preserved behaviour of Teil2Setup.vue, exercised separately via the
// `alert-warning` banner, not by these tests).
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

import Teil2Setup from '../../src/modules/sprechen/Teil2Setup.vue'

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); push.mockClear() })

describe('Teil2Setup — Prüfungskarte', () => {
  it('renders five fields with Modalität first', async () => {
    const w = mount(Teil2Setup)
    await flushPromises()
    const labels = w.findAll('.spr-fld-l').map(n => n.text())
    expect(labels).toHaveLength(5)
    expect(labels[0]).toContain('Modalität')
    expect(labels[1]).toContain('Beiträge')
    expect(labels[2]).toContain('Position')
    expect(labels[3]).toContain('Vorbereitung')
    expect(labels[4]).toContain('Hilfen')
  })

  it('disables the CTA until a Topic is chosen', async () => {
    const w = mount(Teil2Setup)
    await flushPromises()
    expect(w.find('.spr-card-go .btn').attributes('disabled')).toBeDefined()
    await w.findAll('.spr-titem')[0].trigger('click')
    expect(w.find('.spr-card-go .btn').attributes('disabled')).toBeUndefined()
  })

  it('hides the voice picker for the typed Modality', async () => {
    const w = mount(Teil2Setup)
    await flushPromises()
    expect(w.find('.spr-voice').exists()).toBe(false)
  })

  it('shows the voice picker once the spoken Modality is selected', async () => {
    // Needs BOTH mic support and a non-empty voice list, neither of which jsdom
    // provides — without the mocks this test would pass even if the picker
    // markup were deleted outright.
    const w = mount(Teil2Setup)
    await flushPromises()
    const spoken = w.findAll('.spr-fld')[0].findAll('button')[1]
    expect(spoken.attributes('disabled')).toBeUndefined()
    await spoken.trigger('click')
    expect(w.find('.spr-voice').exists()).toBe(true)
  })
})

describe('Teil2Setup — topic browser', () => {
  it('renders a tag chip per TOPIC_TAG with a count', async () => {
    const w = mount(Teil2Setup)
    await flushPromises()
    expect(w.findAll('.spr-tag').length).toBeGreaterThanOrEqual(10)
    expect(w.findAll('.spr-tag')[0].text()).toMatch(/\d/)
  })

  it('filters the list by search text over title and statement', async () => {
    const w = mount(Teil2Setup)
    await flushPromises()
    const before = w.findAll('.spr-titem').length
    await w.find('.spr-search-row input').setValue('Tempolimit')
    expect(w.findAll('.spr-titem').length).toBeLessThan(before)
    expect(w.find('.spr-titem').text()).toContain('Tempolimit')
  })

  it('shows the counter line above the list', async () => {
    const w = mount(Teil2Setup)
    await flushPromises()
    expect(w.text()).toMatch(/von \d+ Themen/)
  })

  it('renders the empty note when no Topic matches', async () => {
    const w = mount(Teil2Setup)
    await flushPromises()
    await w.find('.spr-search-row input').setValue('zzzzzzz')
    expect(w.find('.spr-empty').exists()).toBe(true)
  })
})
