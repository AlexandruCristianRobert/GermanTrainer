import { describe, expect, it } from 'vitest'
import {
  korrekturStatus, normalizeKeepCase, setNachbessernText, takeNachbessernText
} from '../../src/composables/useNachbessern'

describe('handoff', () => {
  it('is read-then-clear: the second take returns null', () => {
    setNachbessernText('Sehr geehrte Frau Kling, …')
    expect(takeNachbessernText()).toBe('Sehr geehrte Frau Kling, …')
    expect(takeNachbessernText()).toBeNull()
  })
})

describe('normalizeKeepCase', () => {
  it('strips punctuation and collapses whitespace but preserves case', () => {
    expect(normalizeKeepCase(' danke  dir, im Voraus! ')).toBe('danke dir im Voraus')
  })
})

describe('korrekturStatus', () => {
  const quote = 'weil einige Stühle sind kaputt'
  const suggested = 'weil einige Stühle kaputt sind'
  it('offen while the quote is still present', () => {
    expect(korrekturStatus(`Ich schreibe, ${quote}, Ihnen.`, quote, suggested)).toBe('offen')
  })
  it('behoben when quote is gone and suggested is present', () => {
    expect(korrekturStatus(`Ich schreibe, ${suggested}, Ihnen.`, quote, suggested)).toBe('behoben')
  })
  it('geaendert when quote is gone but suggested is absent', () => {
    expect(korrekturStatus('Ich schreibe wegen der kaputten Stühle.', quote, suggested)).toBe('geaendert')
  })
  it('is case-sensitive — sie→Sie register fixes are visible', () => {
    expect(korrekturStatus('ich danke sie', 'sie', 'Sie')).toBe('offen')
    expect(korrekturStatus('ich danke Ihnen, Sie waren…', 'sie', 'Sie')).toBe('behoben')
  })
  it('deletion fix (empty suggested): behoben once the quote is gone', () => {
    expect(korrekturStatus('sauberer Satz', 'LG', '')).toBe('behoben')
  })
})
