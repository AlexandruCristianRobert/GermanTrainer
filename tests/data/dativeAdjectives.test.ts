import { describe, test, expect } from 'vitest'
import { DATIVE_ADJECTIVES, DATIVE_ADJECTIVE_KEYS } from '../../src/data/dativeAdjectives'

const entries = Object.entries(DATIVE_ADJECTIVES)
// Case-insensitive: the impersonal body-state examples are subjectless, so the
// dative pronoun opens the sentence and is capitalized ("Mir ist kalt.").
const DATIVE_MARKER = /\b(mir|dir|ihm|ihr|ihnen|uns|euch|dem|einem|einer|seinem|seiner|ihrem|ihrer|meinem|meiner|deinem|deiner|unserem|eurem)\b/i

describe('DATIVE_ADJECTIVES invariants', () => {
  test('floors: ≥12 plain adjectives plus exactly the four impersonal body states', () => {
    const impersonal = entries.filter(([, e]) => e.impersonal).map(([k]) => k).sort()
    expect(impersonal).toEqual(['kalt', 'schlecht', 'warm', 'übel'])
    expect(entries.length - impersonal.length).toBeGreaterThanOrEqual(12)
  })

  test('every example contains its adjective and a dative form', () => {
    const bad = entries.filter(([k, e]) =>
      !new RegExp(`(^|[^a-zäöüß])${k}($|[^a-zäöüß])`, 'i').test(e.example)
      || !DATIVE_MARKER.test(e.example)
    ).map(([k]) => k)
    expect(bad).toEqual([])
  })

  test('HINT CONTRACT: ≤90 chars, ≤14 words, unique, never "Dativ" or a dative form', () => {
    const seen = new Set<string>()
    const forbidden = /\b(dativ|dative|dem|den|ihm|ihnen|mir|dir|euch|uns)\b/i
    const bad = entries.filter(([, e]) => {
      const h = e.coreIdeaHint
      const dupe = seen.has(h)
      seen.add(h)
      return dupe || h.length > 90 || h.trim().split(/\s+/).length > 14 || forbidden.test(h)
    }).map(([k]) => k)
    expect(bad).toEqual([])
  })

  test('explanations name the adjective and the case; english is non-empty', () => {
    const bad = entries.filter(([k, e]) =>
      !e.coreIdeaExplanation.includes('Dativ')
      || !e.coreIdeaExplanation.toLowerCase().includes(k.toLowerCase())
      || e.english.trim().length === 0
    ).map(([k]) => k)
    expect(bad).toEqual([])
  })

  test('keys are frozen and derived', () => {
    expect(Object.isFrozen(DATIVE_ADJECTIVE_KEYS)).toBe(true)
    expect([...DATIVE_ADJECTIVE_KEYS]).toEqual(Object.keys(DATIVE_ADJECTIVES))
  })
})
