import { describe, test, expect } from 'vitest'
import {
  NACHRICHT_MIN_WORDS, NACHRICHT_TARGET_WORDS, NACHRICHT_COMFORT_MAX_WORDS,
  NACHRICHT_TIME_BUDGET_SECONDS, nachrichtWordBand, nachrichtPhase, assembleNachricht
} from '../../src/data/schreibenNachricht'

describe('nachricht core constants', () => {
  test('exam constants', () => {
    expect(NACHRICHT_MIN_WORDS).toBe(100)
    expect(NACHRICHT_TARGET_WORDS).toBe(120)
    expect(NACHRICHT_COMFORT_MAX_WORDS).toBe(160)
    expect(NACHRICHT_TIME_BUDGET_SECONDS).toBe(1500)
  })
  test('word band: floor at 100, comfort ceiling at 160', () => {
    expect(nachrichtWordBand(99)).toBe('under')
    expect(nachrichtWordBand(100)).toBe('ok')
    expect(nachrichtWordBand(160)).toBe('ok')
    expect(nachrichtWordBand(161)).toBe('over')
  })
  test('phases: 5 planen / 15 schreiben / 5 prüfen, then Überzeit', () => {
    expect(nachrichtPhase(0)).toBe('planen')
    expect(nachrichtPhase(299)).toBe('planen')
    expect(nachrichtPhase(300)).toBe('schreiben')
    expect(nachrichtPhase(1199)).toBe('schreiben')
    expect(nachrichtPhase(1200)).toBe('pruefen')
    expect(nachrichtPhase(1500)).toBe('pruefen')
    expect(nachrichtPhase(1501)).toBe('ueberzeit')
  })
  test('assembleNachricht: full frame, and empty slots collapse cleanly', () => {
    expect(assembleNachricht({
      betreff: 'Absage der Besprechung', anrede: 'Sehr geehrter Herr Semder,',
      text: 'leider kann ich nicht teilnehmen.', gruss: 'Mit freundlichen Grüßen\nAnna'
    })).toBe(
      'Betreff: Absage der Besprechung\n\nSehr geehrter Herr Semder,\nleider kann ich nicht teilnehmen.\n\nMit freundlichen Grüßen\nAnna'
    )
    expect(assembleNachricht({ betreff: '', anrede: '', text: 'nur Text.', gruss: '' })).toBe('nur Text.')
  })
})
