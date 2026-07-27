import { beforeEach, describe, expect, it } from 'vitest'
import { SPRECHEN_TOPICS } from '../../src/data/sprechenTopics'
import { saveQuizRun } from '../../src/composables/useQuizHistory'
import {
  CUSTOM_TOPICS_KEY, addCustomTopics, allTopics, buildTopicGeneratorPrompt,
  deleteCustomTopic, doneTopicTitles, generateTopics, loadCustomTopics, pickRandomTopic
} from '../../src/composables/useSprechenTopics'

beforeEach(() => {
  localStorage.removeItem(CUSTOM_TOPICS_KEY)
  localStorage.removeItem('gt:quizHistory')
})

function fakeClient(responses: string[]) {
  let i = 0
  return {
    models: {
      generateContent: async (_params: Record<string, unknown>) =>
        ({ text: responses[Math.min(i++, responses.length - 1)] })
    }
  }
}

describe('custom topic pool', () => {
  it('starts empty; add + delete round-trip', () => {
    expect(loadCustomTopics()).toEqual([])
    addCustomTopics([{ id: 'st-custom-1-0', titleDe: 'Testthema', statementDe: 'Sollte man testen?', tags: ['Bildung'], level: 'B2', source: 'custom' }])
    expect(loadCustomTopics().length).toBe(1)
    expect(allTopics().length).toBe(SPRECHEN_TOPICS.length + 1)
    deleteCustomTopic('st-custom-1-0')
    expect(loadCustomTopics()).toEqual([])
  })

  it('ignores corrupt localStorage content', () => {
    localStorage.setItem(CUSTOM_TOPICS_KEY, '{not json')
    expect(loadCustomTopics()).toEqual([])
  })
})

describe('done-topic memory', () => {
  it('reads titles from sprechen-teil2 Run meta', () => {
    saveQuizRun({
      type: 'sprechen-teil2',
      startedAt: new Date(1700000000000).toISOString(),
      finishedAt: new Date(1700000600000).toISOString(),
      durationMs: 600000, count: 100, correct: 70,
      meta: { topicTitle: 'Tempolimit' }
    })
    expect(doneTopicTitles().has('Tempolimit')).toBe(true)
  })

  it('pickRandomTopic prefers a not-yet-done Topic', () => {
    // Mark every seed Topic done except one.
    const undone = SPRECHEN_TOPICS[0]
    for (const t of SPRECHEN_TOPICS.slice(1)) {
      saveQuizRun({
        type: 'sprechen-teil2',
        startedAt: new Date(1700000000000).toISOString(),
        finishedAt: new Date(1700000600000).toISOString(),
        durationMs: 1, count: 100, correct: 60,
        meta: { topicTitle: t.titleDe }
      })
    }
    // History caps at 100 entries, 99 saves fit. The one undone must be picked.
    expect(pickRandomTopic(() => 0.5).titleDe).toBe(undone.titleDe)
  })
})

describe('topic generator', () => {
  it('prompt embeds avoid-lists', () => {
    const p = buildTopicGeneratorPrompt(['Tempolimit'], ['Zuckersteuer'], () => 0.5)
    expect(p).toContain('Tempolimit')
    expect(p).toContain('Zuckersteuer')
  })

  it('validates, dedupes against existing titles, stamps custom ids', async () => {
    const client = fakeClient([JSON.stringify({ topics: [
      { titleDe: 'Tempolimit', statementDe: 'Doppeltes Thema, wird verworfen?', tags: ['Umwelt'] },
      { titleDe: 'Ein neues Thema', statementDe: 'Sollten wir dieses neue Thema diskutieren?', tags: ['Gesellschaft', 'Quatsch'] },
      { titleDe: '', statementDe: 'Ohne Titel', tags: ['Umwelt'] }
    ] })])
    const out = await generateTopics(client, 'test-model')
    expect(out.length).toBe(1)
    expect(out[0].titleDe).toBe('Ein neues Thema')
    expect(out[0].source).toBe('custom')
    expect(out[0].id).toMatch(/^st-custom-/)
    expect(out[0].tags).toEqual(['Gesellschaft'])   // unknown tags filtered
  })

  it('throws when no usable topics survive after retries', async () => {
    const client = fakeClient(['garbage'])
    await expect(generateTopics(client, 'test-model')).rejects.toThrow()
  })
})
