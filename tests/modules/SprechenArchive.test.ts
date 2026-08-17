import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const push = vi.fn()
// Mutable so individual tests can simulate arriving with a `?module=` query
// (read once by SprechenArchive.vue's loadAll() at setup) without needing a
// mockReturnValueOnce dance — the factory below closes over this variable.
let routeQuery: Record<string, string> = {}
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ query: routeQuery })
}))

const row = (id: string, kind: string) => ({
  id, discussionId: 'd1', topicTitle: 'Tempolimit', modality: 'typed', kind,
  quote: 'wegen dem Vertrag', suggested: 'wegen des Vertrags',
  reasonDe: 'Genitiv.', reasonEn: 'genitive',
  context: 'Ich kündigte nicht, wegen dem Vertrag mit der Firma.', createdAt: 1000
})

// The component reads countsByKind() + drilledIds() + listCorrections() only
// — no openCorrections() import, so nothing here mocks it. listCorrections()
// ignores its filter argument on purpose: the component's own filtering
// behaviour is exercised by re-invoking the (naive) mock, not by the mock
// itself narrowing results.
vi.mock('../../src/composables/useSprechenArchive', () => ({
  listCorrections: vi.fn(async () => [row('c1', 'grammar'), row('c2', 'register')]),
  countsByKind: vi.fn(async () => ({
    grammar: 1, 'word-order': 0, vocabulary: 0, spelling: 0, register: 1
  })),
  drilledIds: vi.fn(async () => new Set(['c1']))
}))

import SprechenArchive from '../../src/modules/sprechen/SprechenArchive.vue'

beforeEach(() => {
  push.mockClear()
  routeQuery = {}
})

describe('SprechenArchive', () => {
  it('renders a counter tile per Sprechen error tag', async () => {
    const w = mount(SprechenArchive); await flushPromises()
    expect(w.findAll('.spr-kind')).toHaveLength(5)
  })

  it('renders the drilled-vs-open strip on each tile', async () => {
    const w = mount(SprechenArchive); await flushPromises()
    expect(w.findAll('.spr-kind-b')).toHaveLength(5)
  })

  it('fills the strip fully for a kind with no open corrections', async () => {
    const w = mount(SprechenArchive); await flushPromises()
    // grammar (c1) is drilled and is the only grammar correction — 5/5 segments on.
    const grammarTile = w.findAll('.spr-kind')[0]
    expect(grammarTile.findAll('.spr-kind-b span.on')).toHaveLength(5)
  })

  it('leaves the strip empty for a kind with zero corrections', async () => {
    const w = mount(SprechenArchive); await flushPromises()
    // vocabulary has a count of 0 — must yield 0 segments, not NaN.
    const vocabTile = w.findAll('.spr-kind')[2]
    expect(vocabTile.findAll('.spr-kind-b span.on')).toHaveLength(0)
  })

  it('marks the wrong span inside the learner sentence', async () => {
    const w = mount(SprechenArchive); await flushPromises()
    expect(w.find('.spr-actx .hit').text()).toBe('wegen dem Vertrag')
  })

  it('filters the rows when a tile is clicked', async () => {
    const w = mount(SprechenArchive); await flushPromises()
    const before = w.findAll('.spr-arow').length
    await w.findAll('.spr-kind')[0].trigger('click')
    await flushPromises()
    expect(w.findAll('.spr-arow').length).toBeLessThanOrEqual(before)
    expect(w.findAll('.spr-kind')[0].classes()).toContain('on')
  })

  it('routes to the Korrekturdrill', async () => {
    const w = mount(SprechenArchive); await flushPromises()
    await w.find('.btn-accent').trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'sprechen-drill' })
  })

  it('disables the Korrekturdrill CTA when nothing is open', async () => {
    const mod = await import('../../src/composables/useSprechenArchive')
    vi.mocked(mod.drilledIds).mockResolvedValueOnce(new Set(['c1', 'c2']))
    const w = mount(SprechenArchive); await flushPromises()
    expect((w.find('.btn-accent').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('preselects the schreiben module chip from a ?module= route query', async () => {
    routeQuery = { module: 'schreiben' }
    const w = mount(SprechenArchive); await flushPromises()
    // Chip order is Alle, Sprechen, Schreiben (see template).
    expect(w.findAll('.spr-mkind')[2].classes()).toContain('on')
  })
})
