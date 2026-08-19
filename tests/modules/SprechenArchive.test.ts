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

// Minimal CorrectionSchedule fixture (ADR-0025 / Task 1 shape). streak and
// lastCorrectAt don't matter to this component — it only ever reads .status.
const schedule = (status: 'offen' | 'faellig' | 'nachgeuebt') => ({
  status, streak: status === 'offen' ? 0 : 1, lastCorrectAt: status === 'offen' ? null : 900, dueAt: null
})

// The component reads countsByKind() + scheduleByCorrection() + listCorrections()
// only — no openCorrections() import, so nothing here mocks it. listCorrections()
// ignores its filter argument on purpose: the component's own filtering
// behaviour is exercised by re-invoking the (naive) mock, not by the mock
// itself narrowing results.
//
// c2 is deliberately absent from the default schedule map — per Task 1's
// review caveat, a correction missing from the map is offen, not an error
// case, so the fixture leans on that instead of spelling out status: 'offen'.
vi.mock('../../src/composables/useSprechenArchive', () => ({
  listCorrections: vi.fn(async () => [row('c1', 'grammar'), row('c2', 'register')]),
  countsByKind: vi.fn(async () => ({
    grammar: 1, 'word-order': 0, vocabulary: 0, spelling: 0, register: 1
  })),
  scheduleByCorrection: vi.fn(async () => new Map([['c1', schedule('nachgeuebt')]]))
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
    // grammar (c1) is nachgeuebt and is the only grammar correction — 5/5 segments on.
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

  it('disables the Korrekturdrill CTA when nothing is offen or fällig', async () => {
    const mod = await import('../../src/composables/useSprechenArchive')
    vi.mocked(mod.scheduleByCorrection).mockResolvedValueOnce(new Map([
      ['c1', schedule('nachgeuebt')], ['c2', schedule('nachgeuebt')]
    ]))
    const w = mount(SprechenArchive); await flushPromises()
    expect((w.find('.btn-accent').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('enables the Korrekturdrill CTA when offen is 0 but fällig is > 0', async () => {
    const mod = await import('../../src/composables/useSprechenArchive')
    vi.mocked(mod.scheduleByCorrection).mockResolvedValueOnce(new Map([
      ['c1', schedule('faellig')], ['c2', schedule('nachgeuebt')]
    ]))
    const w = mount(SprechenArchive); await flushPromises()
    expect((w.find('.btn-accent').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('preselects the schreiben module chip from a ?module= route query', async () => {
    routeQuery = { module: 'schreiben' }
    const w = mount(SprechenArchive); await flushPromises()
    // Chip order is Alle, Sprechen, Schreiben (see template).
    expect(w.findAll('.spr-mkind')[2].classes()).toContain('on')
  })

  it('shows fällig on a row whose schedule is due', async () => {
    const mod = await import('../../src/composables/useSprechenArchive')
    vi.mocked(mod.scheduleByCorrection).mockResolvedValueOnce(new Map([
      ['c1', schedule('faellig')]
    ]))
    const w = mount(SprechenArchive); await flushPromises()
    // c1 is the first row (see the listCorrections mock order); its status
    // tag is the last .tag in .ar-tags — the kind label comes first, and
    // this fixture's modality/module don't add any tags in between.
    const statusTag = w.findAll('.spr-arow')[0].findAll('.tag').at(-1)
    expect(statusTag?.text()).toBe('fällig')
    expect(statusTag?.classes()).toContain('tag-accent')
  })

  it('shows offen on a row absent from the schedule map', async () => {
    const w = mount(SprechenArchive); await flushPromises()
    // c2 (second row) is absent from the default schedule mock.
    const statusTag = w.findAll('.spr-arow')[1].findAll('.tag').at(-1)
    expect(statusTag?.text()).toBe('offen')
    expect(statusTag?.classes()).toContain('tag-ochre')
  })

  it('shows nachgeübt on a row with a retired streak', async () => {
    const w = mount(SprechenArchive); await flushPromises()
    // c1 (first row) is nachgeuebt in the default schedule mock.
    const statusTag = w.findAll('.spr-arow')[0].findAll('.tag').at(-1)
    expect(statusTag?.text()).toBe('nachgeübt')
    expect(statusTag?.classes()).toContain('tag-success')
  })

  it('shows the Offen/Fällig counts above the drill button', async () => {
    const mod = await import('../../src/composables/useSprechenArchive')
    // One offen (c2, absent from the map) + one fällig (c1) fixture.
    vi.mocked(mod.scheduleByCorrection).mockResolvedValueOnce(new Map([
      ['c1', schedule('faellig')]
    ]))
    const w = mount(SprechenArchive); await flushPromises()
    expect(w.find('.micro-mark').text()).toBe('Offen 1 · Fällig 1')
  })
})
