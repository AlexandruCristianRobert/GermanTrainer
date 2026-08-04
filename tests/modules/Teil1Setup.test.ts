import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { Vortragsthema } from '../../src/data/sprechenVortragsthemen'
import type { SprechenVortrag } from '../../src/data/sprechen'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const THEME_A: Vortragsthema = {
  id: 'vt-a', titleDe: 'Thema A Titel',
  taskDe: 'Halten Sie einen kurzen Vortrag darüber, wie sich Thema A entwickelt.',
  tags: ['Gesellschaft'], level: 'B2', source: 'seed'
}
const THEME_B: Vortragsthema = {
  id: 'vt-b', titleDe: 'Thema B Titel',
  taskDe: 'Halten Sie einen kurzen Vortrag darüber, warum Thema B wichtig ist.',
  tags: ['Arbeit'], level: 'B2', source: 'seed'
}
const THEME_DONE: Vortragsthema = {
  id: 'vt-done', titleDe: 'Erledigtes Thema',
  taskDe: 'Halten Sie einen kurzen Vortrag darüber, was schon erledigt ist.',
  tags: ['Bildung'], level: 'B2', source: 'seed'
}
const THEME_CUSTOM: Vortragsthema = {
  id: 'vt-custom-1', titleDe: 'Generiertes Thema',
  taskDe: 'Halten Sie einen kurzen Vortrag darüber, was neu generiert wurde.',
  tags: ['Medien'], level: 'B2', source: 'custom'
}

vi.mock('../../src/composables/useVortragsthemen', () => ({
  drawThemaPair: vi.fn(() => [THEME_A, THEME_B]),
  allThemen: vi.fn(() => [THEME_A, THEME_B, THEME_DONE]),
  doneThemaTitles: vi.fn(() => new Set([THEME_DONE.titleDe])),
  loadCustomThemen: vi.fn(() => []),
  addCustomThemen: vi.fn(),
  deleteCustomThema: vi.fn(),
  generateThemen: vi.fn(async () => [THEME_CUSTOM])
}))

vi.mock('../../src/composables/useVortrag', () => ({
  findActiveVortrag: vi.fn(async () => null),
  abandonVortrag: vi.fn(async () => undefined)
}))

vi.mock('../../src/composables/useSprechenArguments', () => ({
  cachedBankIds: vi.fn(async () => new Set<string>())
}))

// jsdom has no SpeechRecognition — fake it supported by default so the
// spoken Modality is selectable; individual tests override with
// mockReturnValueOnce(false) to exercise the unsupported path.
vi.mock('../../src/composables/useSpeechRecognizer', () => ({
  isSpeechRecognitionSupported: vi.fn(() => true)
}))

vi.mock('../../src/composables/useSettings', async () => {
  const vue = await import('vue')
  return {
    useSettings: vi.fn(() => ({
      settings: vue.ref({
        id: 'singleton', geminiApiKey: 'AIzaTest', model: 'gemini-test',
        aiProvider: 'gemini', localClaudeModel: 'sonnet', localClaudeEffort: 'low'
      }),
      hasApiKey: vue.computed(() => true),
      canUseAi: vue.computed(() => true),
      load: async () => {},
      save: async () => {}
    }))
  }
})

import Teil1Setup from '../../src/modules/sprechen/Teil1Setup.vue'
import { findActiveVortrag, abandonVortrag } from '../../src/composables/useVortrag'
import { isSpeechRecognitionSupported } from '../../src/composables/useSpeechRecognizer'
import { useSettings } from '../../src/composables/useSettings'
import { drawThemaPair } from '../../src/composables/useVortragsthemen'
import { TEIL1_STASH_KEY, type Teil1RunStash } from '../../src/data/sprechen'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  push.mockClear()
  vi.mocked(drawThemaPair).mockClear()
  vi.mocked(drawThemaPair).mockReturnValue([THEME_A, THEME_B])
})

describe('Teil1Setup — the two task sheets', () => {
  it('renders exactly two .spr-sheet panels', async () => {
    const w = mount(Teil1Setup)
    await flushPromises()
    expect(w.findAll('.spr-sheet')).toHaveLength(2)
  })

  it('prints all five Gliederungspunkte with their hints on each sheet', async () => {
    const w = mount(Teil1Setup)
    await flushPromises()
    const sheets = w.findAll('.spr-sheet')
    for (const sheet of sheets) {
      const items = sheet.findAll('.spr-sheet-glied li')
      expect(items).toHaveLength(5)
      expect(items[0].text()).toContain('Einstieg')
      expect(items[0].text()).toContain('Thema nennen')
    }
  })

  it('disables the CTA until a sheet is picked, then enables it', async () => {
    const w = mount(Teil1Setup)
    await flushPromises()
    expect(w.find('.spr-card-go .btn').attributes('disabled')).toBeDefined()
    await w.findAll('.spr-sheet')[0].trigger('click')
    expect(w.find('.spr-card-go .btn').attributes('disabled')).toBeUndefined()
  })
})

describe('Teil1Setup — Füllbarkeits-Check', () => {
  it('is component-local: the counter goes 0/3 → 1/3 and writes nothing to localStorage', async () => {
    const w = mount(Teil1Setup)
    await flushPromises()
    const fill = w.findAll('.spr-sheet-fill')[0]
    expect(fill.find('.spr-fill-n').text()).toContain('0/3')
    await fill.findAll('.spr-tag')[0].trigger('click')
    expect(fill.find('.spr-fill-n').text()).toContain('1/3')
    expect(fill.text()).toContain('Nur für dich')

    const raw = localStorage.getItem('sprechenTeil1Setup')
    const stored = raw ? JSON.parse(raw) : {}
    expect(stored.fillChecks).toBeUndefined()
    expect(JSON.stringify(stored)).not.toContain('eigenes Beispiel')
  })
})

describe('Teil1Setup — Prüfungskarte', () => {
  it('hides the Zeitlimit field for the typed Modality and shows it for spoken', async () => {
    const w = mount(Teil1Setup)
    await flushPromises()
    const labels = () => w.findAll('.spr-fld-l').map(n => n.text())
    expect(labels().some(l => l.includes('Zeitlimit'))).toBe(false)

    const spoken = w.findAll('.spr-fld')[0].findAll('button')[1]
    await spoken.trigger('click')
    expect(labels().some(l => l.includes('Zeitlimit'))).toBe(true)
  })

  it('disables the gesprochen option when speech recognition is unsupported', async () => {
    vi.mocked(isSpeechRecognitionSupported).mockReturnValueOnce(false)
    const w = mount(Teil1Setup)
    await flushPromises()
    const spoken = w.findAll('.spr-fld')[0].findAll('button')[1]
    expect(spoken.attributes('disabled')).toBeDefined()
  })

  it('disables the KI-Tipp field when canUseAi is false', async () => {
    const vue = await import('vue')
    vi.mocked(useSettings).mockReturnValueOnce({
      settings: vue.ref({
        id: 'singleton', geminiApiKey: '', model: 'gemini-test',
        aiProvider: 'gemini', localClaudeModel: 'sonnet', localClaudeEffort: 'low'
      }),
      hasApiKey: vue.computed(() => false),
      canUseAi: vue.computed(() => false),
      load: async () => {},
      save: async () => {}
    } as ReturnType<typeof useSettings>)
    const w = mount(Teil1Setup)
    await flushPromises()
    const fields = w.findAll('.spr-fld')
    const kiTippField = fields.find(f => f.find('.spr-fld-l').text().includes('KI-Tipp'))
    expect(kiTippField).toBeTruthy()
    for (const b of kiTippField!.findAll('button')) {
      expect(b.attributes('disabled')).toBeDefined()
    }
  })
})

describe('Teil1Setup — control bar', () => {
  it('"Andere zwei Themen ziehen" redraws and clears the selection', async () => {
    const w = mount(Teil1Setup)
    await flushPromises()
    await w.findAll('.spr-sheet')[0].trigger('click')
    expect(w.find('.spr-card-go .btn').attributes('disabled')).toBeUndefined()

    const callsBefore = vi.mocked(drawThemaPair).mock.calls.length
    const redrawBtn = w.findAll('.spr-ab-ctl button').find(b => b.text().includes('Andere zwei Themen ziehen'))!
    await redrawBtn.trigger('click')

    expect(vi.mocked(drawThemaPair).mock.calls.length).toBeGreaterThan(callsBefore)
    expect(w.find('.spr-card-go .btn').attributes('disabled')).toBeDefined()
  })

  it('"Alle N Themen" toggles the ledger list', async () => {
    const w = mount(Teil1Setup)
    await flushPromises()
    expect(w.find('.spr-tlist').exists()).toBe(false)
    const listBtn = w.findAll('.spr-ab-ctl button').find(b => b.text().includes('Alle') && b.text().includes('Themen'))!
    await listBtn.trigger('click')
    expect(w.find('.spr-tlist').exists()).toBe(true)
    expect(w.findAll('.spr-tlist .spr-titem')).toHaveLength(3)
  })

  it('renders a done Vortragsthema with the ✓ gehalten flag', async () => {
    const w = mount(Teil1Setup)
    await flushPromises()
    const listBtn = w.findAll('.spr-ab-ctl button').find(b => b.text().includes('Alle') && b.text().includes('Themen'))!
    await listBtn.trigger('click')
    const doneRow = w.findAll('.spr-tlist .spr-titem').find(r => r.text().includes('Erledigtes Thema'))!
    expect(doneRow.find('.spr-flag.done').text()).toContain('gehalten')
  })
})

describe('Teil1Setup — start()', () => {
  it('writes a Teil1RunStash with five empty-keyword plan entries and hardLimit false when typed', async () => {
    const w = mount(Teil1Setup)
    await flushPromises()
    await w.findAll('.spr-sheet')[0].trigger('click')
    await w.find('.spr-card-go .btn').trigger('click')

    const raw = sessionStorage.getItem(TEIL1_STASH_KEY)
    expect(raw).toBeTruthy()
    const stash = JSON.parse(raw!) as Teil1RunStash
    expect(stash.plan).toHaveLength(5)
    expect(stash.plan.every(p => p.keyword === '')).toBe(true)
    expect(stash.helps.hardLimit).toBe(false)
    expect(stash.modality).toBe('typed')
    expect(stash.thema.id).toBe('vt-a')
  })

  it('navigates to sprechen-teil1-prep when prep > 0 and to sprechen-teil1-run when prep is 0', async () => {
    const w = mount(Teil1Setup)
    await flushPromises()
    await w.findAll('.spr-sheet')[0].trigger('click')
    await w.find('.spr-card-go .btn').trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'sprechen-teil1-prep' })

    push.mockClear()
    const w2 = mount(Teil1Setup)
    await flushPromises()
    await w2.findAll('.spr-sheet')[0].trigger('click')
    const prepField = w2.findAll('.spr-fld').find(f => f.find('.spr-fld-l').text().includes('Vorbereitungszeit'))!
    const ausBtn = prepField.findAll('button').find(b => b.text() === 'Aus')!
    await ausBtn.trigger('click')
    await w2.find('.spr-card-go .btn').trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'sprechen-teil1-run' })
  })
})

describe('Teil1Setup — resume banner', () => {
  it('renders the resume banner for an active Vortrag, and Verwerfen calls abandonVortrag', async () => {
    const active: SprechenVortrag = {
      id: 'v1',
      thema: { id: 'vt-a', titleDe: 'Thema A Titel', taskDe: THEME_A.taskDe, source: 'seed' },
      modality: 'typed',
      helps: { hints: true, checklist: true, kiTipp: false, hardLimit: false },
      plan: [],
      notes: '',
      rede: { textDe: '' },
      kiTippCount: 0,
      helpLog: [],
      status: 'in_progress',
      startedAt: Date.now()
    }
    vi.mocked(findActiveVortrag).mockResolvedValueOnce(active)
    const w = mount(Teil1Setup)
    await flushPromises()

    expect(w.find('.alert-info').exists()).toBe(true)
    expect(w.text()).toContain('Thema A Titel')
    expect(w.find('.spr-sheet').exists()).toBe(false)

    const verwerfen = w.findAll('button').find(b => b.text().includes('Verwerfen'))!
    await verwerfen.trigger('click')
    await flushPromises()
    expect(abandonVortrag).toHaveBeenCalledWith('v1')
  })
})
