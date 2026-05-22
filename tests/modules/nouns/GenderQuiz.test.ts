import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GenderQuiz from '../../../src/modules/nouns/GenderQuiz.vue'
import type { Noun } from '../../../src/db/types'

const noun: Noun = {
  id: 1, german: 'Tisch', gender: 'der', english: 'table',
  group: 'Furniture', createdAt: 0
}

function mountQuiz() {
  return mount(GenderQuiz, {
    attachTo: document.body,
    props: { noun, questionNumber: 1, totalQuestions: 5 }
  })
}

function press(key: string, init: KeyboardEventInit = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, ...init }))
}

describe('GenderQuiz — keyboard shortcuts', () => {
  it('emits answered(true, "der") when 1 is pressed', async () => {
    const wrapper = mountQuiz()
    press('1')
    await wrapper.vm.$nextTick()
    const events = wrapper.emitted('answered')
    expect(events).toBeTruthy()
    expect(events![0]).toEqual([true, 'der'])
    wrapper.unmount()
  })

  it('emits answered(false, "die") when 2 is pressed for a der noun', async () => {
    const wrapper = mountQuiz()
    press('2')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('answered')![0]).toEqual([false, 'die'])
    wrapper.unmount()
  })

  it('emits answered(_, "das") when 3 is pressed', async () => {
    const wrapper = mountQuiz()
    press('3')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('answered')![0][1]).toBe('das')
    wrapper.unmount()
  })

  it('ignores 1/2/3 once already submitted', async () => {
    const wrapper = mountQuiz()
    press('1')
    await wrapper.vm.$nextTick()
    press('2')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('answered')!.length).toBe(1)
    wrapper.unmount()
  })

  it('ignores 1/2/3 when a modifier key is held', async () => {
    const wrapper = mountQuiz()
    press('1', { ctrlKey: true })
    press('2', { metaKey: true })
    press('3', { altKey: true })
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('answered')).toBeUndefined()
    wrapper.unmount()
  })

  it('ignores auto-repeat events', async () => {
    const wrapper = mountQuiz()
    press('1', { repeat: true })
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('answered')).toBeUndefined()
    wrapper.unmount()
  })

  it('removes the listener on unmount', async () => {
    const wrapper = mountQuiz()
    wrapper.unmount()
    press('1')
  })
})
