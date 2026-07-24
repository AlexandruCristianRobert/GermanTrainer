import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DacWeakPoints from '../../src/components/charts/DacWeakPoints.vue'
import type { QuizHistoryEntry } from '../../src/composables/useQuizHistory'

function entry(items: any[]): QuizHistoryEntry {
  return { id: 1, type: 'dac-sentence', startedAt: '', finishedAt: '', durationMs: 0, count: items.length, correct: 0, meta: { dacSentenceItems: items } }
}

describe('DacWeakPoints', () => {
  test('renders the weakest collocation and its preposition when there is data', () => {
    const wrapper = mount(DacWeakPoints, { props: { entries: [entry([
      { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', correct: false, tags: ['preposition'] },
      { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', correct: false, tags: ['preposition'] }
    ])] } })
    expect(wrapper.text()).toContain('warten')
    expect(wrapper.text()).toContain('auf')
  })

  test('renders nothing when there is no dac-sentence data', () => {
    const wrapper = mount(DacWeakPoints, { props: { entries: [] } })
    expect(wrapper.find('.weak-card').exists()).toBe(false)
  })

  test('renders nothing useful when the only misses are noun-tagged', () => {
    const wrapper = mount(DacWeakPoints, { props: { entries: [entry([
      { collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', correct: false, tags: ['noun'] }
    ])] } })
    expect(wrapper.find('.weak-card').exists()).toBe(false)
  })

  test('caps collocations shown at 8', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      collocId: `c${i}`, collocWord: `w${i}`, prepGerman: 'auf', correct: false, tags: ['preposition']
    }))
    const wrapper = mount(DacWeakPoints, { props: { entries: [entry(items)] } })
    expect(wrapper.findAll('.weak-list li').length).toBeLessThanOrEqual(8)
  })
})
