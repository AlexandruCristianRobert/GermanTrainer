import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { findActiveDiscussion } from '../../src/composables/useSprechenDiscussion'
import type { SprechenDiscussion } from '../../src/data/sprechen'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const discussion: SprechenDiscussion = {
  id: 'd1',
  topic: { id: 't1', titleDe: 'Tempolimit', statementDe: 'Brauchen wir ein Tempolimit?', source: 'seed' },
  turnTarget: 6, stance: 'pro', modality: 'typed', status: 'in_progress',
  kiTippCount: 0, notes: 'meine Notizen', startedAt: 1,
  // Turn order matters: the LAST turn must be the partner's, so it is the
  // learner's turn and the composer is live. With the learner's turn last,
  // `myTurn` is false, the textarea is legitimately disabled, `setValue()`
  // cannot write to it, and `ensurePartnerTurn()` fires a partner call on
  // mount. Do not "fix" that by removing the component's disabled binding.
  turns: [
    { role: 'learner', textDe: 'Das sehe ich genauso, aber es reicht nicht.', at: 1 },
    { role: 'partner', textDe: 'Ich halte das für falsch.', at: 2 }
  ]
}

vi.mock('../../src/composables/useSprechenDiscussion', () => ({
  findActiveDiscussion: vi.fn(async () => discussion),
  loadDiscussion: vi.fn(async () => discussion),
  appendTurn: vi.fn(async () => discussion),
  saveDiscussion: vi.fn(async () => undefined),
  deleteDiscussion: vi.fn(async () => undefined)
}))

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

// `findActiveDiscussion` is a single shared vi.fn() across every test in this
// file (vitest does not auto-reset mocks — see vite.config.ts). The composer
// regression test below overrides its resolved value to a not-my-turn
// fixture; without restoring it here, that override would leak into every
// test that runs after it in file order.
afterEach(() => {
  vi.mocked(findActiveDiscussion).mockResolvedValue(discussion)
})

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
  it('disables the composer when it is not the learner turn', async () => {
    // Regression guard. The disabled binding does more than the send() guard:
    // send() blocks SUBMISSION, this blocks TYPING. Without it, text entered
    // during an in-flight send is silently wiped by `input.value = ''` when the
    // call resolves. Do not remove it to make another test easier to write.
    const notMyTurn = { ...discussion, turns: [
      { role: 'partner' as const, textDe: 'Ich halte das für falsch.', at: 1 },
      { role: 'learner' as const, textDe: 'Das sehe ich genauso.', at: 2 }
    ] }
    const mod = await import('../../src/composables/useSprechenDiscussion')
    vi.mocked(mod.findActiveDiscussion).mockResolvedValue(notMyTurn)
    const w = await mountReady()
    expect(w.find('.spr-composer textarea').attributes('disabled')).toBeDefined()
  })

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
