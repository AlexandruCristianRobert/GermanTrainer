import { describe, test, expect } from 'vitest'
import { validateIdiom } from '../../src/composables/useIdiomHighlight'

describe('validateIdiom', () => {
  const GERMAN = 'Die Macht wechselte damals den Besitzer, ganz plötzlich.'

  test('accepts a discontinuous two-span idiom when both spans match', () => {
    const idiom = validateIdiom(GERMAN, { spans: ['wechselte', 'den Besitzer'], form: 'den Besitzer wechseln', gloss: 'to change hands' })
    expect(idiom).toEqual({ spans: ['wechselte', 'den Besitzer'], form: 'den Besitzer wechseln', gloss: 'to change hands' })
  })

  test('drops an unmatched span while keeping the ones that survive', () => {
    const idiom = validateIdiom(GERMAN, { spans: ['wechselte', 'nicht im deutschen Satz'], form: 'den Besitzer wechseln', gloss: 'to change hands' })
    expect(idiom).toEqual({ spans: ['wechselte'], form: 'den Besitzer wechseln', gloss: 'to change hands' })
  })

  test('returns undefined when every span is unmatchable', () => {
    const idiom = validateIdiom(GERMAN, { spans: ['völlig unpassend', 'auch nicht da'], form: 'x', gloss: 'y' })
    expect(idiom).toBeUndefined()
  })

  test('matches case-insensitively', () => {
    const idiom = validateIdiom(GERMAN, { spans: ['WECHSELTE'], form: 'den Besitzer wechseln', gloss: 'to change hands' })
    expect(idiom?.spans).toEqual(['WECHSELTE'])
  })

  test('rejects a missing or empty form', () => {
    expect(validateIdiom(GERMAN, { spans: ['wechselte'], form: '', gloss: 'to change hands' })).toBeUndefined()
    expect(validateIdiom(GERMAN, { spans: ['wechselte'], gloss: 'to change hands' })).toBeUndefined()
    expect(validateIdiom(GERMAN, { spans: ['wechselte'], form: '   ', gloss: 'to change hands' })).toBeUndefined()
  })

  test('rejects a missing or empty gloss', () => {
    expect(validateIdiom(GERMAN, { spans: ['wechselte'], form: 'den Besitzer wechseln', gloss: '' })).toBeUndefined()
    expect(validateIdiom(GERMAN, { spans: ['wechselte'], form: 'den Besitzer wechseln' })).toBeUndefined()
  })

  test('rejects non-object / non-array garbage input', () => {
    expect(validateIdiom(GERMAN, null)).toBeUndefined()
    expect(validateIdiom(GERMAN, undefined)).toBeUndefined()
    expect(validateIdiom(GERMAN, 'idiom')).toBeUndefined()
    expect(validateIdiom(GERMAN, 42)).toBeUndefined()
    expect(validateIdiom(GERMAN, { spans: 'wechselte', form: 'x', gloss: 'y' })).toBeUndefined()
    expect(validateIdiom(GERMAN, { spans: [], form: 'x', gloss: 'y' })).toBeUndefined()
  })

  test('drops non-string / empty entries from spans before matching', () => {
    const idiom = validateIdiom(GERMAN, { spans: ['wechselte', 5, '   ', null, 'den Besitzer'], form: 'den Besitzer wechseln', gloss: 'to change hands' })
    expect(idiom?.spans).toEqual(['wechselte', 'den Besitzer'])
  })

  test('caps spans at 3, ignoring any beyond the third', () => {
    // 5 candidate spans, all of which anchor in the sentence — only the first
    // 3 are ever considered, so a match sitting in position 4/5 is dropped
    // even though the text contains it.
    const idiom = validateIdiom(GERMAN, {
      spans: ['die', 'macht', 'wechselte', 'damals', 'den besitzer'],
      form: 'den Besitzer wechseln', gloss: 'to change hands'
    })
    expect(idiom?.spans).toEqual(['die', 'macht', 'wechselte'])
  })

  test('a span that matches but the sentence provided is different from the caller — no match, undefined', () => {
    const idiom = validateIdiom('Ein völlig anderer Satz ohne die Redewendung.', {
      spans: ['wechselte', 'den Besitzer'], form: 'den Besitzer wechseln', gloss: 'to change hands'
    })
    expect(idiom).toBeUndefined()
  })
})
