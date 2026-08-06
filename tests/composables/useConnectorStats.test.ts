import { describe, test, expect } from 'vitest'
import { computeConnectorWeakPoints } from '../../src/composables/useConnectorStats'
import { computeVerbWeakPoints } from '../../src/composables/useVerbSentenceStats'
import { computeWeakPoints } from '../../src/composables/usePrepRemedial'
import { computeDacWeakPoints } from '../../src/composables/useDacSentenceStats'
import type { QuizHistoryEntry } from '../../src/composables/useQuizHistory'

function packedEntry(): QuizHistoryEntry {
  return {
    id: 1, type: 'sentence-packed',
    startedAt: '2026-08-06T10:00:00Z', finishedAt: '2026-08-06T10:05:00Z',
    durationMs: 300000, count: 2, correct: 1,
    meta: {
      packedConnItems: [
        { connId: 'jedoch', connWord: 'jedoch', correct: false, tags: ['connector', 'word-order'] },
        { connId: 'jedoch', connWord: 'jedoch', correct: false, tags: ['word-order'] },
        { connId: 'aber', connWord: 'aber', correct: true }
      ],
      verbSentenceItems: [
        { verbKeys: ['warten'], nounKeys: [], correct: false, tags: ['conjugation'] },
        { verbKeys: [], nounKeys: ['Bericht'], correct: false, tags: ['noun'] }
      ],
      sentenceItems: [{ prepId: 'seit', prepGerman: 'seit', nounKeys: [], correct: false, tags: ['case'] }],
      dacSentenceItems: [{ collocId: 'warten-auf', collocWord: 'warten', prepGerman: 'auf', nounKeys: [], correct: false, tags: ['compound'] }]
    }
  }
}

describe('computeConnectorWeakPoints', () => {
  test('aggregates seen/wrong/score and tag counts from sentence-packed runs', () => {
    const wp = computeConnectorWeakPoints([packedEntry()])
    expect(wp.weakConnectors[0]).toMatchObject({ connId: 'jedoch', seen: 2, wrong: 2 })
    expect(wp.weakConnectors[0].score).toBeGreaterThan(0)
    expect(wp.weakConnectors.find(w => w.connId === 'aber')).toMatchObject({ seen: 1, wrong: 0 })
    expect(wp.tagCounts.connector).toBe(1)
    expect(wp.tagCounts['word-order']).toBe(2)
  })
  test('ignores non-packed runs', () => {
    const e = packedEntry()
    e.type = 'verb-sentence'
    expect(computeConnectorWeakPoints([e]).weakConnectors).toHaveLength(0)
  })
})

describe('packed runs pool into the existing scorers (ADR-0015)', () => {
  test('verb scorer counts packed verbs and nouns', () => {
    const wp = computeVerbWeakPoints([packedEntry()])
    expect(wp.weakVerbs.find(v => v.verbKey === 'warten')).toMatchObject({ seen: 1, wrong: 1 })
    expect(wp.weakNouns.find(n => n.nounKey === 'Bericht')).toMatchObject({ seen: 1, wrong: 1 })
  })
  test('prep scorer counts packed prepositions', () => {
    const wp = computeWeakPoints([packedEntry()])
    expect(wp.weakPreps.find(p => p.prepId === 'seit')).toBeTruthy()
  })
  test('dac scorer counts packed collocations', () => {
    const wp = computeDacWeakPoints([packedEntry()])
    expect(wp.weakCollocs.find(c => c.collocId === 'warten-auf')).toBeTruthy()
  })
})
