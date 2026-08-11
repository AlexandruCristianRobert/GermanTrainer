import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SentenceSetup from '../../../src/modules/sentence/SentenceSetup.vue'

const { canUseAiRef, byGermanListGate } = vi.hoisted(() => ({
  canUseAiRef: { value: true },
  // Off by default: byGermanList resolves immediately, as every test but the
  // out-of-order-completion one needs. A test flips `active` on to get a
  // controllable, manually-resolved promise per call instead, queued here in
  // call order so it can resolve them in whatever order it likes.
  byGermanListGate: { active: false, queue: [] as Array<{ words: readonly string[]; resolve: () => void }> }
}))

vi.mock('../../../src/composables/useNouns', () => ({
  useNouns: () => ({
    countsByGroup: async () => ({
      Office: 4, Work: 0, Furniture: 3, House: 5, Rooms: 0,
      Family: 0, School: 0, 'Bank & Money': 0, Food: 0, Other: 0
    }),
    sampleByGroups: async () => [
      { id: 1, german: 'Küche', gender: 'die', english: 'kitchen', group: 'House', createdAt: 0 },
      { id: 2, german: 'Bericht', gender: 'der', english: 'report', group: 'Office', createdAt: 0 }
    ],
    // Resolves every requested word, so a Domain always has enough nouns to
    // clear the per-card empty-pool guard.
    byGermanList: (words: readonly string[]) => {
      const rows = words.map((german, i) => ({
        id: 100 + i, german, gender: 'der', english: german.toLowerCase(),
        group: 'Programming', createdAt: 0
      }))
      if (!byGermanListGate.active) return Promise.resolve(rows)
      return new Promise(resolve => { byGermanListGate.queue.push({ words, resolve: () => resolve(rows) }) })
    }
  })
}))
vi.mock('../../../src/composables/useSettings', async () => {
  const vue = await import('vue')
  return {
    useSettings: () => ({
      settings: vue.ref({ id: 'singleton', geminiApiKey: 'AIzaTest', model: 'gemini-test', aiProvider: 'gemini', localClaudeModel: 'sonnet', localClaudeEffort: 'low' }),
      canUseAi: vue.computed(() => canUseAiRef.value),
      load: async () => {}
    })
  }
})

async function mountSetup() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/sentence', name: 'sentence', component: { template: '<div />' } },
      { path: '/sentence/run', name: 'sentence-run', component: { template: '<div />' } }
    ]
  })
  await router.push({ name: 'sentence' })
  const wrapper = mount(SentenceSetup, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('SentenceSetup', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    canUseAiRef.value = true
  })

  it('renders five category blocks with the default counts 2/2/1/1/1', async () => {
    const { wrapper } = await mountSetup()
    const names = wrapper.findAll('.sna-name').map(n => n.text())
    expect(names.join(' ')).toContain('Verben')
    expect(names.join(' ')).toContain('Nomen')
    expect(names.join(' ')).toContain('Präpositionen')
    expect(names.join(' ')).toContain('Da-Komposita')
    expect(names.join(' ')).toContain('Konnektoren')
    expect(wrapper.find('.sna-meter-t').text()).toContain('7 / 8')
  })

  it('budget meter warns at >= 7 items and blocks past 8', async () => {
    const { wrapper } = await mountSetup()
    expect(wrapper.find('.sna-meter').classes()).toContain('warn')  // default total is 7
    // every enabled "+"-side count option that would push past 8 must be disabled
    const segs = wrapper.findAll('.sna-count-seg button')
    const three = segs.filter(b => b.text() === '3')
    expect(three.some(b => (b.attributes('disabled') !== undefined))).toBe(true)
  })

  it('DE→EN hides Modalität and Wort-Hinweise', async () => {
    const { wrapper } = await mountSetup()
    const dirBtns = wrapper.findAll('.segmented button').filter(b => b.text() === 'DE → EN')
    await dirBtns[0].trigger('click')
    expect(wrapper.text()).not.toContain('Modalität')
    expect(wrapper.text()).not.toContain('Wort-Hinweise')
  })

  it('start stashes specs and navigates to sentence-run', async () => {
    const { wrapper, router } = await mountSetup()
    const push = vi.spyOn(router, 'push')
    const start = wrapper.findAll('button').find(b => b.text().startsWith('Start ·'))!
    await start.trigger('click')
    await flushPromises()
    const raw = sessionStorage.getItem('gt:lastPackedSentenceQuiz')
    expect(raw).toBeTruthy()
    const stash = JSON.parse(raw!)
    expect(stash.specs).toHaveLength(5)                 // default preset 5 cards
    expect(stash.specs[0].items.length).toBe(7)         // default counts 2+2+1+1+1
    expect(push).toHaveBeenCalledWith({ name: 'sentence-run' })
  })

  it('zero total disables Start', async () => {
    const { wrapper } = await mountSetup()
    // click the 0 option in each of the five count segments
    for (const seg of wrapper.findAll('.sna-count-seg')) {
      await seg.findAll('button').find(b => b.text() === '0')!.trigger('click')
    }
    const start = wrapper.findAll('button').find(b => b.text().startsWith('Start ·'))!
    expect(start.attributes('disabled')).toBeDefined()
  })
})

describe('Fachgebiet', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    canUseAiRef.value = true
    byGermanListGate.active = false
    byGermanListGate.queue = []
  })

  // Category blocks are identified by their .sna-name text ('Verben',
  // 'Nomen', ...); their Niveau/Typ/Rektion/Themen chips live inside a
  // collapsible "Filter" panel (closed by default) that must be opened
  // before those chips are in the DOM.
  function findBlock(wrapper: ReturnType<typeof mount>, name: string) {
    return wrapper.findAll('.sna-block').find(b => b.find('.sna-name').text().includes(name))!
  }
  async function openFilter(wrapper: ReturnType<typeof mount>, blockName: string) {
    await findBlock(wrapper, blockName).find('.sna-flt').trigger('click')
  }
  function findField(wrapper: ReturnType<typeof mount>, label: string) {
    return wrapper.findAll('.field').find(f => f.find('.field-label').text() === label)!
  }

  it('shows the block, and with no Domain the Themen chips stay live', async () => {
    const { wrapper } = await mountSetup()
    expect(wrapper.text()).toContain('Fachgebiet')
    await openFilter(wrapper, 'Nomen')
    const office = wrapper.findAll('button.chip').find(b => b.text().startsWith('Office'))!
    expect(office.attributes('disabled')).toBeUndefined()
  })

  it('selecting a Domain disables the Themen chips and explains the verb pool', async () => {
    const { wrapper } = await mountSetup()
    await wrapper.findAll('button.chip').find(b => b.text() === 'Docker')!.trigger('click')
    await flushPromises()
    await openFilter(wrapper, 'Nomen')
    expect(wrapper.text()).toContain('Fachgebiet aktiv')
    const office = wrapper.findAll('button.chip').find(b => b.text().startsWith('Office'))!
    expect(office.attributes('disabled')).toBeDefined()
  })

  it('stashes the selected Domains and stamps every card with one', async () => {
    const { wrapper } = await mountSetup()
    await wrapper.findAll('button.chip').find(b => b.text() === 'Docker')!.trigger('click')
    await flushPromises()
    await wrapper.find('button.btn-accent').trigger('click')
    await flushPromises()
    const stash = JSON.parse(sessionStorage.getItem('gt:lastPackedSentenceQuiz')!)
    expect(stash.meta.domains).toEqual(['docker'])
    for (const spec of stash.specs) expect(spec.domain.id).toBe('docker')
  })

  it('an emptied Niveau cannot block Start while a Fachgebiet is active — but does without one', async () => {
    // Baseline (no Fachgebiet): emptying Niveau leaves the filtered verb pool
    // genuinely empty, so Start must stay disabled and the alert must explain
    // why. Without this half, the fix below could be a blanket removal of
    // the guard instead of a Fachgebiet-scoped one.
    const { wrapper: plain } = await mountSetup()
    await openFilter(plain, 'Verben')
    await findField(plain, 'Niveau').findAll('button').find(b => b.text() === 'None')!.trigger('click')
    const plainStart = plain.findAll('button').find(b => b.text().startsWith('Start ·'))!
    expect(plainStart.attributes('disabled')).toBeDefined()
    expect(plain.text()).toContain('kein Verb passt zu den Filtern')

    // With a Fachgebiet active, the verb pool is the whole (non-empty) list
    // regardless of Niveau/Typ/Rektion, so Start must stay enabled and the
    // empty-pool alert must be absent.
    const { wrapper } = await mountSetup()
    await wrapper.findAll('button.chip').find(b => b.text() === 'Docker')!.trigger('click')
    await flushPromises()
    await openFilter(wrapper, 'Verben')
    await findField(wrapper, 'Niveau').findAll('button').find(b => b.text() === 'None')!.trigger('click')
    const start = wrapper.findAll('button').find(b => b.text().startsWith('Start ·'))!
    expect(start.attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).not.toContain('kein Verb passt zu den Filtern')
  })

  it('verbSummary explains the unrestricted pool while a Fachgebiet is active, and is unchanged otherwise', async () => {
    const { wrapper: plain } = await mountSetup()
    const plainSummary = findBlock(plain, 'Verben').find('.sna-sum-t').text()
    expect(plainSummary).toContain('Typen')
    expect(plainSummary).toContain('Rektion')
    expect(plainSummary).not.toContain('Fachgebiet aktiv')

    const { wrapper } = await mountSetup()
    await wrapper.findAll('button.chip').find(b => b.text() === 'Docker')!.trigger('click')
    await flushPromises()
    const summary = findBlock(wrapper, 'Verben').find('.sna-sum-t').text()
    expect(summary).not.toContain('Typen')
    expect(summary).not.toContain('Rektion')
    expect(summary).toContain('Fachgebiet aktiv')
    expect(summary).toMatch(/\d+ Verben im Pool/)
  })

  it('a slower, earlier Domain query cannot overwrite a faster, later one — but a normal, non-racing change still resolves', async () => {
    byGermanListGate.active = true
    const { wrapper } = await mountSetup()

    // Baseline (untargeted case): a single Domain selection with nothing
    // racing it still resolves and updates the pool normally. Without this
    // half, a guard that just drops every result (instead of only stale
    // ones) would also make this test pass.
    await wrapper.findAll('button.chip').find(b => b.text() === '.NET')!.trigger('click')
    await flushPromises()
    expect(byGermanListGate.queue).toHaveLength(1)
    byGermanListGate.queue[0].resolve()
    await flushPromises()
    const startBaseline = wrapper.findAll('button').find(b => b.text().startsWith('Start ·'))!
    expect(startBaseline.attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Leerer Pool')
    await wrapper.findAll('button.chip').find(b => b.text() === '.NET')!.trigger('click') // deselect
    await flushPromises()

    // Race: select Docker (its query held open), then swap to SQL Server
    // before Docker's query resolves — a later resolveDomainNouns() run
    // starts, and its own query is held open too.
    await wrapper.findAll('button.chip').find(b => b.text() === 'Docker')!.trigger('click')
    await flushPromises()
    const dockerCall = byGermanListGate.queue.at(-1)!
    await wrapper.findAll('button.chip').find(b => b.text() === 'Docker')!.trigger('click') // toggle off
    await flushPromises()
    await wrapper.findAll('button.chip').find(b => b.text() === 'SQL Server')!.trigger('click')
    await flushPromises()
    const sqlServerCall = byGermanListGate.queue.at(-1)!

    // The later (SQL Server) query resolves first, then the earlier
    // (Docker) query finally resolves too, out of order. Docker's now-stale
    // result must be dropped, not overwrite SQL Server's — the domain that
    // is actually still selected.
    sqlServerCall.resolve()
    await flushPromises()
    dockerCall.resolve()
    await flushPromises()

    const start = wrapper.findAll('button').find(b => b.text().startsWith('Start ·'))!
    expect(start.attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Leerer Pool')
    expect(wrapper.text()).not.toContain('0 Nomen im Pool')
  })

  it('does not show a false "Leerer Pool" alert or disable Start while a newly-active Domain\'s nouns are still resolving', async () => {
    byGermanListGate.active = true
    const { wrapper } = await mountSetup()

    await wrapper.findAll('button.chip').find(b => b.text() === 'Docker')!.trigger('click')
    await flushPromises()
    expect(byGermanListGate.queue).toHaveLength(1) // the resolution is outstanding, not yet resolved

    expect(wrapper.text()).not.toContain('Leerer Pool')
    const start = wrapper.findAll('button').find(b => b.text().startsWith('Start ·'))!
    expect(start.attributes('disabled')).toBeUndefined()

    // Once the query lands, behaviour is unchanged — still no false alert.
    byGermanListGate.queue[0].resolve()
    await flushPromises()
    expect(wrapper.text()).not.toContain('Leerer Pool')
    expect(start.attributes('disabled')).toBeUndefined()
  })
})
