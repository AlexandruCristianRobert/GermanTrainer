import { describe, test, it, expect } from 'vitest'
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
    expect(radarWarnungen(GOOD, 'entschuldigung', 40)).toEqual([])
  })
  test('du-forms are flagged with the matched words', () => {
    const w = radarWarnungen(GOOD.replace('Könnten Sie mir', 'Kannst du mir'), 'entschuldigung', 40)
    const duW = w.find(x => x.key === 'du-form')!
    expect(duW.matches).toContain('du')
  })
  test('informal markers are flagged', () => {
    const w = radarWarnungen(GOOD.replace('Mit freundlichen Grüßen', 'LG'), 'entschuldigung', 40)
    expect(w.some(x => x.key === 'informell')).toBe(true)
  })
  test('a Bitte without Konjunktiv II fires hoeflichkeit at 40+ words; with KII it does not', () => {
    const noKii = 'Betreff: Bitte\n\nSehr geehrte Frau Kling,\nich will zwei Tage Homeoffice. Schicken Sie mir die Formulare.\n\nMit freundlichen Grüßen\nAnna'
    expect(radarWarnungen(noKii, 'bitte', 45).some(x => x.key === 'hoeflichkeit')).toBe(true)
    expect(radarWarnungen(GOOD, 'bitte', 45).some(x => x.key === 'hoeflichkeit')).toBe(false)
    expect(radarWarnungen(noKii, 'dank', 45).some(x => x.key === 'hoeflichkeit')).toBe(false)
  })
})

const get = (text: string, name: string, key: string) =>
  geruestSignals(text, name).find(g => g.key === key)!

describe('anrede title + ending agreement', () => {
  it('rejects the wrong title for the Empfängerin', () => {
    const t = 'Betreff: Test\n\nSehr geehrter Herr Hoffmann,\n\nich schreibe…'
    expect(get(t, 'Frau Hoffmann', 'anrede').ok).toBe(false)
  })
  it('rejects the wrong adjective ending', () => {
    const t = 'Betreff: Test\n\nSehr geehrte Herr Semder,\n\nich schreibe…'
    expect(get(t, 'Herr Semder', 'anrede').ok).toBe(false)
  })
  it('accepts each resolved stem for the right title', () => {
    for (const anrede of ['Sehr geehrte Frau Hoffmann,', 'Liebe Frau Hoffmann,', 'Guten Tag, Frau Hoffmann,']) {
      const t = `Betreff: Test\n\n${anrede}\n\nich schreibe…`
      expect(get(t, 'Frau Hoffmann', 'anrede').ok).toBe(true)
    }
  })
  it('renders the resolved target form in the hint', () => {
    const hint = get('x', 'Frau Hoffmann', 'anrede').hintDe
    expect(hint).toContain('Sehr geehrte Frau Hoffmann,')
    expect(get('x', 'Herr Semder', 'anrede').hintDe).toContain('Sehr geehrter Herr Semder,')
  })
})

describe('absaetze body-scoped', () => {
  const frame = (body: string) =>
    `Betreff: Test\n\nSehr geehrte Frau Hoffmann,\n${body}\n\nMit freundlichen Grüßen\nAnna`
  it('fails when the body between Anrede and Gruß is one block', () => {
    expect(get(frame('ein einziger langer Block ohne Absätze und so weiter'), 'Frau Hoffmann', 'absaetze').ok).toBe(false)
  })
  it('passes when the body itself has a blank-line paragraph break', () => {
    expect(get(frame('erster Absatz hier.\n\nzweiter Absatz dort.'), 'Frau Hoffmann', 'absaetze').ok).toBe(true)
  })
  it('falls back to the whole-text rule while an anchor is missing', () => {
    const noGruss = 'Betreff: Test\n\nSehr geehrte Frau Hoffmann,\n\nabsatz eins\n\nabsatz zwei'
    expect(get(noGruss, 'Frau Hoffmann', 'absaetze').ok).toBe(true)
  })
})

describe('hoeflichkeit floor', () => {
  it('stays silent below 40 words', () => {
    expect(radarWarnungen('Sehr geehrte Frau Kling,', 'bitte', 4).some(w => w.key === 'hoeflichkeit')).toBe(false)
  })
  it('fires at 40+ words without Konjunktiv II', () => {
    expect(radarWarnungen('Geben Sie mir bitte die Unterlagen.', 'bitte', 45).some(w => w.key === 'hoeflichkeit')).toBe(true)
  })
  it('du-form warning stays instant', () => {
    expect(radarWarnungen('danke dir', 'dank', 2).some(w => w.key === 'du-form')).toBe(true)
  })
})
