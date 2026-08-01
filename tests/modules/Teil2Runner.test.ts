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
  // Only exercised by the sessionStorage-stash path (see the "hints off" test
  // below) — the runner's real createDiscussion ignores nothing, but every
  // other test here resumes via findActiveDiscussion instead.
  createDiscussion: vi.fn(async () => discussion),
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

/**
 * The runner never imports `loadDiscussion` (that name is not exported by
 * useSprechenDiscussion.ts at all — only findActiveDiscussion matters for
 * resuming). Polls like mountReady() rather than a single flushPromises():
 * onMounted chains several real Dexie round trips before `discussion` settles.
 */
async function mountSpoken(): Promise<VueWrapper> {
  const spoken = { ...discussion, modality: 'spoken' as const }
  const mod = await import('../../src/composables/useSprechenDiscussion')
  vi.mocked(mod.findActiveDiscussion).mockResolvedValue(spoken)
  const w = mount(Teil2Runner)
  for (let i = 0; i < 40; i++) {
    await flushPromises()
    if (!w.find('.loading-state').exists()) return w
  }
  return w
}

describe('Teil2Runner Move nudge', () => {
  it('names a Move the learner has not used this run', async () => {
    const w = await mountReady()
    // The seeded turn used an 'agree' phrase, so the nudge must not say Zustimmen.
    const nudge = w.find('.spr-nudge')
    expect(nudge.exists()).toBe(true)
    expect(nudge.text().toLowerCase()).not.toContain('zustimmen')
  })

  it('is dismissible for the run', async () => {
    const w = await mountReady()
    await w.find('.spr-nudge-x').trigger('click')
    expect(w.find('.spr-nudge').exists()).toBe(false)
  })
})

describe('Teil2Runner drawer', () => {
  it('marks unused Moves ·neu', async () => {
    const w = await mountReady()
    await w.find('.spr-dtab:nth-child(2)').trigger('click')
    expect(w.findAll('.spr-move.fresh').length).toBeGreaterThan(0)
  })

  it('reads schon benutzt instead of the gloss for a used phrase', async () => {
    const w = await mountReady()
    await w.find('.spr-dtab:nth-child(2)').trigger('click')
    // The fixture's one matched phrase is an `agree` one, and the drawer opens
    // on 'partial' — a deliberate default, since conceding-then-countering is
    // the move the cheatsheet teaches. Select the chip rather than changing the
    // component's default to suit this test.
    const chips = w.findAll('.spr-move')
    const agree = chips.find(c => c.text().includes('Zustimmen'))!
    await agree.trigger('click')
    expect(w.text()).toContain('schon benutzt')
  })

  it('inserts a phrase stub with the ellipsis stripped', async () => {
    const w = await mountReady()
    await w.find('.spr-dtab:nth-child(2)').trigger('click')
    await w.findAll('.spr-phrase-t')[0].trigger('click')
    const val = (w.find('.spr-composer textarea').element as HTMLTextAreaElement).value
    expect(val).not.toContain('…')
    expect(val.length).toBeGreaterThan(0)
  })

  it('strips an ellipsis that sits mid-phrase, not just at the end', async () => {
    const w = await mountReady()
    await w.find('.spr-dtab:nth-child(2)').trigger('click')
    // Nachfragen (rm-ask-3, rm-ask-5) carries the … mid-sentence — "Sind Sie
    // nicht auch der Meinung, dass …?" — unlike the trailing-ellipsis phrases
    // elsewhere. The end-anchored strip used to miss these.
    const chips = w.findAll('.spr-move')
    const ask = chips.find(c => c.text().includes('Nachfragen'))!
    await ask.trigger('click')
    const target = w.findAll('.spr-phrase-t').find(p => p.text().includes('…'))!
    await target.trigger('click')
    const val = (w.find('.spr-composer textarea').element as HTMLTextAreaElement).value
    expect(val).not.toContain('…')
    expect(val.length).toBeGreaterThan(0)
  })

  it('renders phrases as plain text in a spoken Discussion', async () => {
    // No composer, no caret — a tappable phrase would do nothing.
    const w = await mountSpoken()
    await w.find('.spr-dtab:nth-child(2)').trigger('click')
    expect(w.findAll('.spr-phrase-t').length).toBeGreaterThan(0)
    expect(w.findAll('button.spr-phrase-t')).toHaveLength(0)
  })

  it('hides the drawer and the nudge when hints are off', async () => {
    // hintsOn comes off the stash — this exercises the sessionStorage-stash
    // creation path (not findActiveDiscussion), which is why createDiscussion
    // must be mocked above.
    sessionStorage.setItem('gt:lastSprechenTeil2', JSON.stringify({ hintsOn: false }))
    const w = await mountReady()
    expect(w.find('.spr-drawer').exists()).toBe(false)
    expect(w.find('.spr-nudge').exists()).toBe(false)
  })
})
