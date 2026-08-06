import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TranslationQuizSetup from '../../../src/modules/verbs/TranslationQuizSetup.vue'

const push = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push })
}))

beforeEach(() => {
  push.mockClear()
  localStorage.clear()
})

function findByText(wrapper: ReturnType<typeof mount>, selector: string, text: string) {
  return wrapper.findAll(selector).find(b => b.text().includes(text))!
}

describe('TranslationQuizSetup Variante', () => {
  test('Variante control shows for EN→DE and is hidden for DE→EN', async () => {
    const wrapper = mount(TranslationQuizSetup)
    await flushPromises()
    expect(wrapper.text()).toContain('Variante')   // en-de is the stored default
    await findByText(wrapper, '.segmented button', 'DE → EN').trigger('click')
    expect(wrapper.text()).not.toContain('Variante')
  })

  test('starting with Präzise selected pushes variant=praezise', async () => {
    const wrapper = mount(TranslationQuizSetup)
    await flushPromises()
    await findByText(wrapper, '.segmented button', 'Präzise').trigger('click')
    await findByText(wrapper, 'button', 'Start quiz').trigger('click')
    expect(push).toHaveBeenCalledTimes(1)
    expect(push.mock.calls[0][0].query.variant).toBe('praezise')
  })

  test('variant choice persists via localStorage', async () => {
    const first = mount(TranslationQuizSetup)
    await flushPromises()
    await findByText(first, '.segmented button', 'Präzise').trigger('click')
    first.unmount()
    const second = mount(TranslationQuizSetup)
    await flushPromises()
    expect(findByText(second, '.segmented button', 'Präzise').classes()).toContain('active')
  })
})
