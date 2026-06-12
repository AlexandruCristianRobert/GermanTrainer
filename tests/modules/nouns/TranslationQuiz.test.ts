import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TranslationQuiz from '../../../src/modules/nouns/TranslationQuiz.vue'
import type { Noun } from '../../../src/db/types'

const noun: Noun = {
  id: 1, german: 'Tisch', gender: 'der', english: 'table',
  group: 'Furniture', createdAt: 0
}

function mountQuiz() {
  return mount(TranslationQuiz, {
    attachTo: document.body,
    props: { noun, questionNumber: 1, totalQuestions: 5, history: [] }
  })
}

function nextButton(wrapper: ReturnType<typeof mountQuiz>) {
  return wrapper.find('.quiz-actions button')
}

// In the browser, Enter in the input fires the form's implicit submission on
// keydown; the keyup of that same physical press lands on whichever element
// holds focus by then. submit() moves focus to the Next button, so a trailing
// keyup there must not advance the quiz.
async function submitAnswer(wrapper: ReturnType<typeof mountQuiz>, answer: string) {
  await wrapper.find('input').setValue(answer)
  await wrapper.find('form').trigger('submit')
  await nextTick()
}

describe('TranslationQuiz — Enter submit/advance', () => {
  it('grades the answer and moves focus to the Next button on submit', async () => {
    const wrapper = mountQuiz()
    await submitAnswer(wrapper, 'table')
    expect(wrapper.emitted('answered')).toEqual([[true, 'table']])
    const btn = nextButton(wrapper)
    expect(btn.exists()).toBe(true)
    expect(document.activeElement).toBe(btn.element)
    wrapper.unmount()
  })

  it('does not advance on the keyup of the Enter press that submitted', async () => {
    const wrapper = mountQuiz()
    await submitAnswer(wrapper, 'table')
    expect(document.activeElement).toBe(nextButton(wrapper).element)
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Enter', bubbles: true })
    )
    await nextTick()
    expect(wrapper.emitted('next')).toBeUndefined()
    wrapper.unmount()
  })

  it('advances when the Next button is activated (click / fresh Enter press)', async () => {
    const wrapper = mountQuiz()
    await submitAnswer(wrapper, 'table')
    await nextButton(wrapper).trigger('click')
    expect(wrapper.emitted('next')).toHaveLength(1)
    wrapper.unmount()
  })

  it('accepts either side of slash-separated meanings, ignoring case', async () => {
    const wrapper = mount(TranslationQuiz, {
      attachTo: document.body,
      props: {
        noun: { ...noun, english: 'table / desk' },
        questionNumber: 1, totalQuestions: 5, history: []
      }
    })
    await submitAnswer(wrapper as ReturnType<typeof mountQuiz>, ' Desk ')
    expect(wrapper.emitted('answered')).toEqual([[true, ' Desk ']])
    wrapper.unmount()
  })

  it('does not submit a blank answer', async () => {
    const wrapper = mountQuiz()
    await wrapper.find('form').trigger('submit')
    await nextTick()
    expect(wrapper.emitted('answered')).toBeUndefined()
    wrapper.unmount()
  })
})
