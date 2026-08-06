import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SentenceSetup from '../../../src/modules/sentence/SentenceSetup.vue'

const { canUseAiRef } = vi.hoisted(() => ({ canUseAiRef: { value: true } }))

vi.mock('../../../src/composables/useNouns', () => ({
  useNouns: () => ({
    countsByGroup: async () => ({
      Office: 4, Work: 0, Furniture: 3, House: 5, Rooms: 0,
      Family: 0, School: 0, 'Bank & Money': 0, Food: 0, Other: 0
    }),
    sampleByGroups: async () => [
      { id: 1, german: 'Küche', gender: 'die', english: 'kitchen', group: 'House', createdAt: 0 },
      { id: 2, german: 'Bericht', gender: 'der', english: 'report', group: 'Office', createdAt: 0 }
    ]
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
