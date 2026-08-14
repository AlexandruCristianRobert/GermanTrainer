import { describe, test, expect } from 'vitest'
import { geruestSignals, radarWarnungen } from '../../src/composables/useNachrichtChecks'

const GOOD =
  'Betreff: Absage der Besprechung am Freitag\n\n' +
  'Sehr geehrter Herr Semder,\n' +
  'leider kann ich an der Besprechung am Freitag nicht teilnehmen, da ich einen Arzttermin habe.\n\n' +
  'Ich würde die Inhalte gern selbstständig nacharbeiten. Könnten Sie mir das Protokoll schicken?\n\n' +
  'Mit freundlichen Grüßen\n' +
  'Anna Petrescu'

function byKey(text: string, name = 'Herr Semder') {
  return Object.fromEntries(geruestSignals(text, name).map(s => [s.key, s.ok]))
}

describe('geruestSignals', () => {
  test('the good frame passes all six', () => {
    expect(byKey(GOOD)).toEqual({
      betreff: true, anrede: true, kleinschreibung: true, absaetze: true, gruss: true, name: true
    })
  })
  test('missing Betreff fails betreff only', () => {
    const t = GOOD.replace('Betreff: Absage der Besprechung am Freitag\n\n', '')
    expect(byKey(t).betreff).toBe(false)
    expect(byKey(t).anrede).toBe(true)
  })
  test('Anrede must name the Empfänger and end with a comma', () => {
    expect(byKey(GOOD.replace('Herr Semder,', 'Herr Semder')).anrede).toBe(false)
    expect(byKey(GOOD.replace('Sehr geehrter Herr Semder,', 'Sehr geehrter Herr Vogel,')).anrede).toBe(false)
    expect(byKey(GOOD, 'Frau Kling').anrede).toBe(false)
  })
  test('capital letter after the Anrede comma fails kleinschreibung', () => {
    expect(byKey(GOOD.replace('leider kann ich', 'Leider kann ich')).kleinschreibung).toBe(false)
  })
  test('Grußformel with trailing comma fails gruss; missing name line fails name', () => {
    expect(byKey(GOOD.replace('Mit freundlichen Grüßen', 'Mit freundlichen Grüßen,')).gruss).toBe(false)
    expect(byKey(GOOD.replace('\nAnna Petrescu', '')).name).toBe(false)
  })
})

describe('radarWarnungen', () => {
  test('clean formal text yields no warnings', () => {
    expect(radarWarnungen(GOOD, 'entschuldigung')).toEqual([])
  })
  test('du-forms are flagged with the matched words', () => {
    const w = radarWarnungen(GOOD.replace('Könnten Sie mir', 'Kannst du mir'), 'entschuldigung')
    const duW = w.find(x => x.key === 'du-form')!
    expect(duW.matches).toContain('du')
  })
  test('informal markers are flagged', () => {
    const w = radarWarnungen(GOOD.replace('Mit freundlichen Grüßen', 'LG'), 'entschuldigung')
    expect(w.some(x => x.key === 'informell')).toBe(true)
  })
  test('a Bitte without Konjunktiv II fires hoeflichkeit; with KII it does not', () => {
    const noKii = 'Betreff: Bitte\n\nSehr geehrte Frau Kling,\nich will zwei Tage Homeoffice. Schicken Sie mir die Formulare.\n\nMit freundlichen Grüßen\nAnna'
    expect(radarWarnungen(noKii, 'bitte').some(x => x.key === 'hoeflichkeit')).toBe(true)
    expect(radarWarnungen(GOOD, 'bitte').some(x => x.key === 'hoeflichkeit')).toBe(false)
    expect(radarWarnungen(noKii, 'dank').some(x => x.key === 'hoeflichkeit')).toBe(false)
  })
})
