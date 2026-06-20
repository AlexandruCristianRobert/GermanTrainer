import { describe, test, expect } from 'vitest'
import { foldGerman, checkText } from '../../src/composables/drillGrading'

describe('foldGerman', () => {
  test('lowercases input', () => {
    expect(foldGerman('HALLO')).toBe('hallo')
  })

  test('trims leading and trailing whitespace', () => {
    expect(foldGerman('  hallo  ')).toBe('hallo')
  })

  test('collapses internal whitespace runs to single space', () => {
    expect(foldGerman('ein  schönes   Haus')).toBe('ein schoenes haus')
  })

  test('folds ä to ae', () => {
    expect(foldGerman('ä')).toBe('ae')
  })

  test('folds ö to oe', () => {
    expect(foldGerman('ö')).toBe('oe')
  })

  test('folds ü to ue', () => {
    expect(foldGerman('ü')).toBe('ue')
  })

  test('folds ß to ss', () => {
    expect(foldGerman('straße')).toBe('strasse')
  })

  test('folds uppercase umlauts after lowercasing', () => {
    expect(foldGerman('Hören')).toBe('hoeren')
    expect(foldGerman('Über')).toBe('ueber')
  })

  test('hoeren folds the same as hören', () => {
    expect(foldGerman('hoeren')).toBe(foldGerman('hören'))
  })

  test('handles mixed umlauts and ß', () => {
    expect(foldGerman('Straße')).toBe('strasse')
    expect(foldGerman('Füße')).toBe('fuesse')
  })
})

describe('checkText', () => {
  test('returns true for exact match after folding', () => {
    expect(checkText('hallo', 'hallo')).toBe(true)
  })

  test('returns false for empty input', () => {
    expect(checkText('', 'hallo')).toBe(false)
  })

  test('returns false for whitespace-only input', () => {
    expect(checkText('   ', 'hallo')).toBe(false)
  })

  test('returns false for wrong answer', () => {
    expect(checkText('tschüss', 'hallo')).toBe(false)
  })

  test('umlaut-tolerant: typed ae matches ä in expected', () => {
    expect(checkText('hoeren', 'hören')).toBe(true)
  })

  test('umlaut-tolerant: typed umlaut matches ae-form in expected', () => {
    expect(checkText('hören', 'hoeren')).toBe(true)
  })

  test('handles ß vs ss in expected', () => {
    expect(checkText('strasse', 'Straße')).toBe(true)
    expect(checkText('straße', 'strasse')).toBe(true)
  })

  test('case insensitive match', () => {
    expect(checkText('HALLO', 'hallo')).toBe(true)
  })

  test('slash-separated expected: accepts first segment', () => {
    expect(checkText('get up', 'get up / stand up')).toBe(true)
  })

  test('slash-separated expected: accepts second segment', () => {
    expect(checkText('stand up', 'get up / stand up')).toBe(true)
  })

  test('slash-separated expected: rejects wrong answer', () => {
    expect(checkText('sit down', 'get up / stand up')).toBe(false)
  })

  test('alternatives array: accepts matching alternative', () => {
    expect(checkText('tschüss', 'auf wiedersehen', ['tschüss', 'ciao'])).toBe(true)
  })

  test('alternatives array: accepts folded alternative match', () => {
    expect(checkText('tschuess', 'auf wiedersehen', ['tschüss'])).toBe(true)
  })

  test('alternatives array: still accepts the expected value', () => {
    expect(checkText('auf wiedersehen', 'auf wiedersehen', ['tschüss'])).toBe(true)
  })

  test('alternatives array: rejects when not in expected or alternatives', () => {
    expect(checkText('hallo', 'auf wiedersehen', ['tschüss'])).toBe(false)
  })
})
