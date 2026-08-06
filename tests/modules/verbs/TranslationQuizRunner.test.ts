import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TranslationQuizRunner from '../../../src/modules/verbs/TranslationQuizRunner.vue'

const push = vi.fn()
let query: Record<string, string> = {}
vi.mock('vue-router', () => ({
  useRoute: () => ({ query }),
  useRouter: () => ({ push })
}))
vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn()
}))

beforeEach(() => {
  push.mockClear()
})

describe('TranslationQuizRunner dispatch', () => {
  test('direction=en-de + variant=praezise renders the Präzise runner', async () => {
    query = { direction: 'en-de', variant: 'praezise', count: '3', levels: 'A1' }
    const wrapper = mount(TranslationQuizRunner)
    await flushPromises()
    expect(wrapper.find('.breadcrumb').text()).toContain('Präzise')
  })

  test('retry=1 never renders the Präzise runner even with variant=praezise', async () => {
    query = { direction: 'en-de', variant: 'praezise', count: '3', levels: 'A1', retry: '1' }
    const wrapper = mount(TranslationQuizRunner)
    await flushPromises()
    expect(wrapper.text()).not.toContain('Präzise')
  })
})
