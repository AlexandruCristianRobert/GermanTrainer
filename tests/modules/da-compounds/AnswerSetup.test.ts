import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AnswerSetup from '../../../src/modules/da-compounds/AnswerSetup.vue'

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

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
      { path: '/da-compounds/answer', name: 'dacompounds-answer', component: { template: '<div />' } },
      { path: '/da-compounds/answer/run', name: 'dacompounds-answer-run', component: { template: '<div />' } }
    ]
  })
}

async function mountSetup() {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-answer' })
  const wrapper = mount(AnswerSetup, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('AnswerSetup', () => {
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

  it('stashes specs + level + meta and routes to the runner on Start', async () => {
    const { wrapper, router } = await mountSetup()
    const push = vi.spyOn(router, 'push')
    const startBtn = wrapper.findAll('button').find(b => b.text().startsWith('Start'))!
    await startBtn.trigger('click')
    await flushPromises()

    expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'dacompounds-answer-run' }))
    const raw = sessionStorage.getItem('gt:lastDacAnswerQuiz')
    expect(raw).toBeTruthy()
    const stash = JSON.parse(raw as string)
    expect(typeof stash.level).toBe('string')
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
