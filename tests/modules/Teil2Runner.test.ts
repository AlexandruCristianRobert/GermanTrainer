import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const discussion = {
  id: 'd1',
  topic: { id: 't1', titleDe: 'Tempolimit', statementDe: 'Brauchen wir ein Tempolimit?', source: 'seed' },
  turnTarget: 6, stance: 'pro', modality: 'typed', status: 'in_progress',
  kiTippCount: 0, notes: 'meine Notizen', startedAt: 1,
  turns: [
    { role: 'partner', textDe: 'Ich halte das für falsch.', at: 1 },
    { role: 'learner', textDe: 'Das sehe ich genauso, aber es reicht nicht.', at: 2 }
  ]
}

vi.mock('../../src/composables/useSprechenDiscussion', () => ({
  findActiveDiscussion: vi.fn(async () => discussion),
  loadDiscussion: vi.fn(async () => discussion),
  appendTurn: vi.fn(async () => discussion),
  saveDiscussion: vi.fn(async () => undefined),
  deleteDiscussion: vi.fn(async () => undefined)
}))

// onMounted also reaches for the partner AI call (ensurePartnerTurn — the
// mock's last turn is the learner's, so it's the partner's turn to reply).
// resolveAiClient is stubbed and generatePartnerTurn rejects immediately, so
// no real network call is attempted; ensurePartnerTurn's own catch settles
// partnerBusy deterministically instead of depending on fetch/DNS timing.
vi.mock('../../src/composables/localClaude', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/composables/localClaude')>()
  return { ...actual, resolveAiClient: () => ({}) }
})
vi.mock('../../src/composables/useSprechenPartner', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/composables/useSprechenPartner')>()
  return {
    ...actual,
    generatePartnerTurn: vi.fn(async () => { throw new Error('no partner in tests') })
  }
})

import Teil2Runner from '../../src/modules/sprechen/Teil2Runner.vue'

/**
 * onMounted chains several real Dexie/fake-indexeddb round trips (settings,
 * the cached-argument-bank lookup, ...) before `discussion` is set, each of
 * which needs its own event-loop tick — one or two flushPromises() calls
 * reliably under-shoot it. Poll instead of guessing a fixed count.
 */
async function mountReady(): Promise<VueWrapper> {
  const w = mount(Teil2Runner)
  for (let i = 0; i < 40; i++) {
    await flushPromises()
    if (!w.find('.loading-state').exists()) return w
  }
  return w
}

describe('Teil2Runner rail', () => {
  it('renders one stepper row per planned turn', async () => {
    const w = await mountReady()
    expect(w.findAll('.spr-step')).toHaveLength(6)
  })

  it('labels a completed turn with the Move it actually used', async () => {
    const w = await mountReady()
    expect(w.findAll('.spr-step')[0].text()).toContain('Zustimmen')
  })

  it('renders a 42-dot Redemittel grid with the used ones on', async () => {
    const w = await mountReady()
    expect(w.findAll('.spr-used-dot')).toHaveLength(42)
    expect(w.findAll('.spr-used-dot.on')).toHaveLength(1)
  })

  it('pins the prep notes into the rail', async () => {
    const w = await mountReady()
    expect(w.find('.spr-railnotes').text()).toContain('meine Notizen')
  })

  it('renders ruled protocol turns, not chat bubbles', async () => {
    const w = await mountReady()
    expect(w.findAll('.spr-turn')).toHaveLength(2)
    expect(w.findAll('.spr-turn.learner')).toHaveLength(1)
    expect(w.find('.chat-input-row').exists()).toBe(false)
  })

  it('omits live tempo for a typed Discussion', async () => {
    const w = await mountReady()
    expect(w.text()).not.toContain('WpM')
  })
})

describe('Teil2Runner composer', () => {
  it('warns under 25 words', async () => {
    const w = await mountReady()
    await w.find('.spr-composer textarea').setValue('kurz')
    expect(w.find('.spr-count').classes()).toContain('short')
    expect(w.text()).toContain('noch knapp')
  })

  it('drops the warning at 25 words or more', async () => {
    const w = await mountReady()
    await w.find('.spr-composer textarea').setValue(Array(25).fill('Wort').join(' '))
    expect(w.find('.spr-count').classes()).not.toContain('short')
  })
})
