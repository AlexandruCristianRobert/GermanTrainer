import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PraeziseRunner from '../../../src/modules/verbs/PraeziseRunner.vue'

const push = vi.fn()
let query: Record<string, string> = {}
vi.mock('vue-router', () => ({
  useRoute: () => ({ query }),
  useRouter: () => ({ push })
}))
vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn()
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

beforeEach(() => {
  query = { count: '5', levels: 'A1', types: '', cases: '' }
  push.mockClear()
  vi.mocked(saveQuizRun).mockClear()
})

describe('PraeziseRunner', () => {
  test('renders a card with a prompt and an input', async () => {
    const wrapper = mount(PraeziseRunner)
    await flushPromises()
    expect(wrapper.find('.vq-meaning').exists()).toBe(true)
    expect(wrapper.find('input').exists()).toBe(true)
  })

  test('grading a full run records variant praezise with card count', async () => {
    const wrapper = mount(PraeziseRunner)
    await flushPromises()
    // answer every card wrong via the reveal button to reach the finish deterministically
    while (wrapper.find('.vq-input-row').exists()) {
      await wrapper.find('button.btn-quiet:not(.end-quiz)').trigger('click')
      await flushPromises()
    }
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    const run = vi.mocked(saveQuizRun).mock.calls[0][0]
    expect(run.type).toBe('verb-translation')
    expect(run.meta).toMatchObject({ verbDirection: 'en-de', variant: 'praezise' })
    expect(run.count).toBeGreaterThanOrEqual(1) // sense dedup can legally shrink the deck below sampled count
    expect(run.correct).toBe(0)
  })
})
