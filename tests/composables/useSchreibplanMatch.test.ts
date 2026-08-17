import { describe, expect, it } from 'vitest'
import { keywordWritten, normalizeForMatch } from '../../src/composables/useSchreibplanMatch'

describe('normalizeForMatch', () => {
  it('strips punctuation, collapses whitespace, lowercases', () => {
    expect(normalizeForMatch('  Heizung,  Beamer! ')).toBe('heizung beamer')
  })
})

describe('keywordWritten', () => {
  const hay = normalizeForMatch(
    'Betreff: Mängel im Kursraum\nSehr geehrte Frau Hoffmann,\nseit Wochen sind die Heizung und der Beamer kaputt, außerdem fehlen Stühle. Bitte antworten Sie bis Januar — die Frist drängt.'
  )
  it('matches a single-word keyword exactly as before', () => {
    expect(keywordWritten('Heizung', hay)).toBe(true)
    expect(keywordWritten('Whiteboard', hay)).toBe(false)
  })
  it('matches a multi-word keyword when every token appears anywhere', () => {
    expect(keywordWritten('Heizung Beamer Stühle', hay)).toBe(true)
    expect(keywordWritten('Januar Frist', hay)).toBe(true)
  })
  it('fails when any token is missing', () => {
    expect(keywordWritten('Heizung Whiteboard', hay)).toBe(false)
  })
  it('is falsy for empty keyword or empty hay', () => {
    expect(keywordWritten('', hay)).toBe(false)
    expect(keywordWritten('Heizung', '')).toBe(false)
  })
})
