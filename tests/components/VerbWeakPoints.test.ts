import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VerbWeakPoints from '../../src/components/charts/VerbWeakPoints.vue'
import type { QuizHistoryEntry } from '../../src/composables/useQuizHistory'

function entry(items: any[]): QuizHistoryEntry {
  return { id: 1, type: 'verb-sentence', startedAt: '', finishedAt: '', durationMs: 0, count: items.length, correct: 0, meta: { verbSentenceItems: items } }
}

describe('VerbWeakPoints', () => {
  test('renders the weakest verb when there is data', () => {
    const wrapper = mount(VerbWeakPoints, { props: { entries: [entry([
      { verbKeys: ['gehen'], correct: false, tags: ['conjugation'] },
      { verbKeys: ['gehen'], correct: false, tags: ['conjugation'] }
    ])] } })
    expect(wrapper.text()).toContain('gehen')
  })
  test('renders nothing useful when there is no verb-sentence data', () => {
    const wrapper = mount(VerbWeakPoints, { props: { entries: [] } })
    expect(wrapper.text()).not.toContain('gehen')
  })
})
