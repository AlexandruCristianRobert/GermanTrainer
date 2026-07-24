import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SentenceSetup from '../../../src/modules/da-compounds/SentenceSetup.vue'

const { canUseAiRef } = vi.hoisted(() => ({ canUseAiRef: { value: true } }))

vi.mock('../../../src/composables/useNouns', () => ({
  useNouns: () => ({
    countsByGroup: async () => ({
      Office: 4, Work: 0, Furniture: 3, House: 5, Rooms: 0,
      Family: 0, School: 0, 'Bank & Money': 0, Food: 0, Other: 0
    }),
    sampleByGroups: async () => [
      { id: 1, german: 'Küche', gender: 'die', english: 'kitchen', group: 'House', createdAt: 0 },
      { id: 2, german: 'Konzert', gender: 'das', english: 'concert', group: 'Office', createdAt: 0 }
    ]
  })
}))

vi.mock('../../../src/composables/useSettings', async () => {
  // Wrap the plain hoisted flag in a real Vue computed() so <script setup>
  // templates auto-unwrap it (a plain { value } object doesn't pass isRef()).
  const vue = await import('vue')
  return {
    useSettings: () => ({
      settings: vue.ref({ id: 'singleton', geminiApiKey: 'AIzaTest', model: 'gemini-test', aiProvider: 'gemini', localClaudeModel: 'sonnet', localClaudeEffort: 'low' }),
      canUseAi: vue.computed(() => canUseAiRef.value),
      load: async () => {}
    })
  }
})

function makeRouter(initialQuery?: Record<string, string>) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
      { path: '/da-compounds/sentence', name: 'dacompounds-sentence', component: { template: '<div />' } },
      { path: '/da-compounds/sentence/run', name: 'dacompounds-sentence-run', component: { template: '<div />' } }
    ]
  })
  return { router, initialQuery }
}

async function mountSetup(initialQuery?: Record<string, string>) {
  const { router } = makeRouter()
  await router.push({ name: 'dacompounds-sentence', query: initialQuery })
  const wrapper = mount(SentenceSetup, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('SentenceSetup', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear()
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear()
    canUseAiRef.value = true
  })

  it('renders collocation level, role, and preposition chips', async () => {
    const { wrapper } = await mountSetup()
    const chipTexts = wrapper.findAll('.chip').map(c => c.text())
    expect(chipTexts).toEqual(expect.arrayContaining(['B1', 'B2', 'C1']))
    expect(chipTexts).toEqual(expect.arrayContaining(['verb', 'adjective', 'noun']))
    expect(chipTexts.some(t => t.startsWith('auf'))).toBe(true)
  })

  it('renders noun theme chips with live counts', async () => {
    const { wrapper } = await mountSetup()
    const chipTexts = wrapper.findAll('.chip').map(c => c.text())
    expect(chipTexts.some(t => t.includes('House') && t.includes('5'))).toBe(true)
    expect(chipTexts.some(t => t.includes('Office') && t.includes('4'))).toBe(true)
  })

  it('defaults the direction control to EN→DE when no query is given', async () => {
    const { wrapper } = await mountSetup()
    const buttons = wrapper.findAll('.segmented button')
    const enDe = buttons.find(b => b.text() === 'English → German')!
    expect(enDe.classes()).toContain('active')
  })

  it('initializes the direction control from route.query.direction=de-en', async () => {
    const { wrapper } = await mountSetup({ direction: 'de-en' })
    const buttons = wrapper.findAll('.segmented button')
    const deEn = buttons.find(b => b.text() === 'German → English')!
    expect(deEn.classes()).toContain('active')
  })

  it('disables the word-hints toggle for DE→EN', async () => {
    const { wrapper } = await mountSetup({ direction: 'de-en' })
    const hintButtons = wrapper.findAll('.field').find(f => f.text().includes('Word hints'))!.findAll('button')
    for (const b of hintButtons) expect(b.attributes('disabled')).not.toBeUndefined()
  })

  it('shows the AI-access alert and disables Start when canUseAi is false', async () => {
    canUseAiRef.value = false
    const { wrapper } = await mountSetup()
    expect(wrapper.find('.alert-warning').text()).toContain('AI access needed')
    const startBtn = wrapper.findAll('button').find(b => b.text().startsWith('Start'))!
    expect(startBtn.attributes('disabled')).not.toBeUndefined()
  })

  it('enables Start once levels/roles/preps/groups all have a non-empty pool', async () => {
    const { wrapper } = await mountSetup()
    const startBtn = wrapper.findAll('button').find(b => b.text().startsWith('Start'))!
    expect(startBtn.attributes('disabled')).toBeUndefined()
  })

  it('disables Start when a filter chip-row is cleared to None', async () => {
    const { wrapper } = await mountSetup()
    const roleField = wrapper.findAll('.field').find(f => f.text().includes('Word type'))!
    const noneBtn = roleField.findAll('button').find(b => b.text() === 'None')!
    await noneBtn.trigger('click')
    const startBtn = wrapper.findAll('button').find(b => b.text().startsWith('Start'))!
    expect(startBtn.attributes('disabled')).not.toBeUndefined()
  })

  it('stashes specs + direction + meta and routes to the runner on Start', async () => {
    const { wrapper, router } = await mountSetup({ direction: 'de-en' })
    const push = vi.spyOn(router, 'push')
    const startBtn = wrapper.findAll('button').find(b => b.text().startsWith('Start'))!
    await startBtn.trigger('click')
    await flushPromises()

    expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'dacompounds-sentence-run' }))
    const raw = sessionStorage.getItem('gt:lastDacSentenceQuiz')
    expect(raw).toBeTruthy()
    const stash = JSON.parse(raw as string)
    expect(stash.direction).toBe('de-en')
    expect(Array.isArray(stash.specs)).toBe(true)
    expect(stash.specs.length).toBeGreaterThan(0)
    expect(stash.meta).toEqual(expect.objectContaining({
      levels: expect.any(Array),
      roles: expect.any(Array),
      preps: expect.any(Array),
      groups: expect.any(Array),
      nounsPer: expect.anything()
    }))
  })
})
