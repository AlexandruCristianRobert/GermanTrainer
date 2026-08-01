import { describe, expect, it } from 'vitest'
import {
  sentenceAround, summarizeFluency,
  type DiscussionTurn, type TurnSpeech
} from '../../src/data/sprechen'

function learner(textDe: string, speech?: Partial<TurnSpeech>): DiscussionTurn {
  return {
    role: 'learner',
    textDe,
    at: 0,
    speech: speech
      ? { spokenMs: 0, reactionMs: 0, restarts: 0, words: 0, ...speech }
      : undefined
  }
}

const partner = (textDe: string): DiscussionTurn => ({ role: 'partner', textDe, at: 0 })

describe('summarizeFluency', () => {
  it('returns null when no learner turn carries speech data (a typed Discussion)', () => {
    expect(summarizeFluency([partner('Ich bin dagegen.'), learner('Ich auch nicht.')])).toBeNull()
  })

  it('ignores partner turns and turns without speech data', () => {
    const s = summarizeFluency([
      partner('Und Sie?'),
      learner('Sechzig Wörter in einer Minute.', { spokenMs: 60_000, words: 60, reactionMs: 2_000 }),
      learner('Getippt, kein Mikro.')
    ])
    expect(s).not.toBeNull()
    expect(s!.turns).toBe(1)
    expect(s!.wordsPerMinute).toBe(60)
  })

  it('computes words-per-minute across the whole discussion, not per turn', () => {
    // 30 words in 30s + 30 words in 90s => 60 words over 2 minutes => 30 wpm.
    // Averaging the per-turn rates would wrongly give (60 + 20) / 2 = 40.
    const s = summarizeFluency([
      learner('a', { spokenMs: 30_000, words: 30 }),
      learner('b', { spokenMs: 90_000, words: 30 })
    ])
    expect(s!.wordsPerMinute).toBe(30)
  })

  it('averages reaction time and sums pauses and speaking time', () => {
    const s = summarizeFluency([
      learner('a', { spokenMs: 10_000, words: 10, reactionMs: 2_000, restarts: 1 }),
      learner('b', { spokenMs: 20_000, words: 20, reactionMs: 6_000, restarts: 3 })
    ])
    expect(s!.avgReactionMs).toBe(4_000)
    expect(s!.pauses).toBe(4)
    expect(s!.totalSpokenMs).toBe(30_000)
  })

  it('yields 0 wpm rather than Infinity when a turn is recorded with no duration', () => {
    // Reachable by double-tapping Space: mic opens and closes in the same tick.
    const s = summarizeFluency([learner('hm', { spokenMs: 0, words: 1 })])
    expect(s!.wordsPerMinute).toBe(0)
    expect(Number.isFinite(s!.wordsPerMinute)).toBe(true)
  })
})

describe('sentenceAround', () => {
  const turn = 'Ich bin dagegen. Wegen dem Vertrag geht das nicht. Was meinen Sie?'

  it('extracts just the sentence containing the offset', () => {
    expect(sentenceAround(turn, turn.indexOf('Wegen dem')))
      .toBe('Wegen dem Vertrag geht das nicht.')
  })

  it('handles the first sentence, with no preceding terminator', () => {
    expect(sentenceAround(turn, 4)).toBe('Ich bin dagegen.')
  })

  it('cuts on question and exclamation marks, not only full stops', () => {
    expect(sentenceAround(turn, turn.indexOf('Was meinen')))
      .toBe('Was meinen Sie?')
  })

  it('returns the whole text when there is no sentence boundary at all', () => {
    expect(sentenceAround('wegen dem Vertrag', 6)).toBe('wegen dem Vertrag')
  })

  it('clamps an out-of-range offset instead of throwing', () => {
    expect(sentenceAround(turn, 9_999)).toBe('Was meinen Sie?')
    expect(sentenceAround(turn, -5)).toBe('Ich bin dagegen.')
  })

  it('returns empty string for empty input', () => {
    expect(sentenceAround('', 0)).toBe('')
  })
})
