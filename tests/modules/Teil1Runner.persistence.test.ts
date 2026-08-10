// Sprechen Teil 1 — the runner over the REAL persistence layer.
//
// tests/modules/Teil1Runner.test.ts mocks `useVortrag` wholesale, which is
// right for its subject (help surfaces, timers, the grade pipeline) but blind
// to anything that only breaks once a write actually reaches IndexedDB. This
// file mocks nothing below the AI boundary: the real useVortrag runs against
// fake-indexeddb, so the structured clone step is genuinely exercised.
//
// The bug it exists for: the runner holds the Vortrag in a `ref`, so
// `v.value.rede` reads back as a reactive Proxy, and the structured clone
// algorithm refuses to clone Proxies (they carry internal slots). `saveRede`
// therefore rejected, `commitRede` awaits it inside `finishRede`, and the
// whole "Vortrag beenden" click died before `phase` ever changed — the button
// silently did nothing and a typed Vortrag could never be submitted.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { TEIL1_STASH_KEY, type Teil1RunStash } from '../../src/data/sprechen'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

// jsdom implements no speechSynthesis, and the real composable caches it at
// module load — the same reason Teil1Runner.test.ts mocks it outright.
vi.mock('../../src/composables/useSpeechVoice', async () => {
  const vue = await import('vue')
  return {
    useSpeechVoice: () => ({
      supported: false, voices: vue.ref([]), speak: async () => {}, cancel: () => {}
    })
  }
})

// The real useSettings reads Dexie and probes a dev-only endpoint; neither
// resolves under jsdom.
vi.mock('../../src/composables/useSettings', async () => {
  const vue = await import('vue')
  return {
    useSettings: () => ({
      settings: vue.ref({
        id: 'singleton', geminiApiKey: '', model: 'sonnet',
        aiProvider: 'local-claude', localClaudeModel: 'sonnet', localClaudeEffort: 'low'
      }),
      hasApiKey: vue.computed(() => true),
      canUseAi: vue.computed(() => true),
      load: async () => {},
      save: async () => {}
    })
  }
})

// The ONLY boundary stubbed: the AI client itself. Everything between the
// component and IndexedDB is the real code.
const NACHFRAGE = 'Woran messen Sie diesen Erfolg genau?'
const generateContent = vi.fn(async () => ({ text: JSON.stringify({ questionDe: NACHFRAGE }) }))
vi.mock('../../src/composables/localClaude', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/composables/localClaude')>()
  return { ...actual, resolveAiClient: vi.fn(() => ({ models: { generateContent } })) }
})

import Teil1Runner from '../../src/modules/sprechen/Teil1Runner.vue'

// 211 words — deliberately OVER finishRede's VORTRAG_MIN_WORDS (200) confirmation
// threshold, so this exercises the persistence path and not the window.confirm
// branch (jsdom does not implement confirm, so hitting it would be its own failure).
const LONG_REDE = (
  'Sehr geehrte Damen und Herren, ich freue mich, heute zu Ihnen sprechen zu ' +
  'dürfen, und ich habe mir für meinen Vortrag ein Thema ausgesucht, das mich ' +
  'persönlich seit vielen Jahren beschäftigt und das meiner Meinung nach viel ' +
  'zu selten ernsthaft diskutiert wird, obwohl es uns alle betrifft. ' +
  'Erlauben Sie mir deshalb, zunächst kurz zu umreißen, worum es mir geht, ' +
  'bevor ich auf die einzelnen Punkte im Detail eingehe. ' +
  'Ich möchte heute über das Ehrenamt in unserer Gesellschaft sprechen und ' +
  'dabei zeigen, warum freiwillige Arbeit weit mehr ist als ein netter ' +
  'Zeitvertreib. In Deutschland engagiert sich etwa ein Drittel der ' +
  'Bevölkerung freiwillig, besonders in Sportvereinen, in der Feuerwehr und ' +
  'in sozialen Einrichtungen. Zunächst zur Situation: ohne dieses Engagement ' +
  'müssten viele Angebote schlicht geschlossen werden, weil weder die ' +
  'Kommunen noch die Vereine sie bezahlen könnten. Einerseits entlastet das ' +
  'den Staat erheblich und schafft Zusammenhalt zwischen Menschen, die sich ' +
  'sonst nie begegnen würden. Andererseits besteht die Gefahr, dass ' +
  'ehrenamtliche Arbeit bezahlte Stellen ersetzt und damit Löhne drückt. ' +
  'Aus eigener Erfahrung kann ich sagen, dass ich zwei Jahre bei der ' +
  'freiwilligen Feuerwehr war und dort gelernt habe, Verantwortung zu ' +
  'übernehmen und im Team zu arbeiten. Zusammenfassend bin ich der Meinung, ' +
  'dass Ehrenamtliche deutlich mehr Unterstützung und Anerkennung verdienen, ' +
  'zum Beispiel durch bezahlte Freistellung vom Arbeitsplatz.'
)

function stash(): Teil1RunStash {
  return {
    thema: {
      id: 'vt-ehrenamt', titleDe: 'Ehrenamtliches Engagement',
      taskDe: 'Halten Sie einen kurzen Vortrag darüber, welche Rolle freiwillige Arbeit spielt.',
      source: 'seed'
    },
    modality: 'typed',
    helps: { hints: true, checklist: true, kiTipp: true, hardLimit: false },
    prepSeconds: 180,
    plan: [
      { key: 'einstieg', keyword: 'Sportvereine' },
      { key: 'situation', keyword: 'ein Drittel' },
      { key: 'aspekte', keyword: 'Freistellung' },
      { key: 'erfahrung', keyword: 'Feuerwehr' },
      { key: 'fazit', keyword: 'Unterstützung' }
    ],
    notes: '',
    model: 'sonnet'
  }
}

async function mountReady(): Promise<VueWrapper> {
  const w = mount(Teil1Runner)
  for (let i = 0; i < 60; i++) {
    await flushPromises()
    if (!w.find('.loading-state').exists()) return w
  }
  return w
}

/** Real IndexedDB writes settle over many microtask turns — poll, don't guess
 *  at a fixed number of flushes. */
async function until(done: () => boolean): Promise<void> {
  for (let i = 0; i < 80; i++) {
    await flushPromises()
    if (done()) return
  }
}

describe('Teil1Runner over the real Dexie layer', () => {
  beforeEach(() => {
    push.mockClear()
    generateContent.mockClear()
    sessionStorage.clear()
    sessionStorage.setItem(TEIL1_STASH_KEY, JSON.stringify(stash()))
    // F12's under-VORTRAG_MIN_WORDS-words confirmation defaults to accepted —
    // LONG_REDE below clears the floor by only 11 words, so a future trim of
    // that fixture must not silently start hitting an unstubbed
    // window.confirm (jsdom does not implement it, so that would hang/throw
    // rather than fail cleanly). Same stub as Teil1Runner.test.ts's beforeEach.
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it("leaves the Rede phase on 'Vortrag beenden' and reaches the Nachfrage", async () => {
    const rejections: unknown[] = []
    const onRejection = (e: PromiseRejectionEvent) => rejections.push(e.reason)
    window.addEventListener('unhandledrejection', onRejection)

    const w = await mountReady()
    await w.find('.rede-textarea').setValue(LONG_REDE)
    await flushPromises()

    const finishBtn = w.find('.run-meta .btn-quiet')
    expect(finishBtn.text()).toContain('Vortrag beenden')
    expect(finishBtn.attributes('disabled')).toBeUndefined()

    await finishBtn.trigger('click')
    await until(() => w.text().includes(NACHFRAGE))
    window.removeEventListener('unhandledrejection', onRejection)

    // The click must actually change the screen — the regression was that it
    // did not, because the awaited Rede write rejected first.
    expect(w.find('.rede-textarea').exists()).toBe(false)
    expect(w.text()).toContain(NACHFRAGE)
    expect(rejections).toEqual([])
  })

  it('persists the Rede so the submit button becomes reachable', async () => {
    const w = await mountReady()
    await w.find('.rede-textarea').setValue(LONG_REDE)
    await flushPromises()
    await w.find('.run-meta .btn-quiet').trigger('click')
    await until(() => w.text().includes(NACHFRAGE))

    await w.find('.spr-composer textarea').setValue('Ich messe das an der Zahl der Freiwilligen.')
    await flushPromises()

    const submit = w.findAll('.spr-composer button').find(b => b.text().includes('Abgeben'))
    expect(submit).toBeDefined()
    expect(submit!.attributes('disabled')).toBeUndefined()
  })
})
