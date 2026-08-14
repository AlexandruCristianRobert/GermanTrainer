import { describe, test, expect } from 'vitest'
import { buildBaukastenPrompt, validateBaukasten } from '../../src/composables/useSchreibenBaukasten'

describe('buildBaukastenPrompt', () => {
  test('asks for situation-specific Gründe/Lösungen and spells out the envelope', () => {
    const p = buildBaukastenPrompt({
      titleDe: 'Bitte um Homeoffice',
      situationDe: 'Sie möchten zwei Tage pro Woche von zu Hause arbeiten.',
      taskDe: 'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Frau Kling.',
      anlass: 'bitte'
    })
    expect(p).toContain('Bitte um Homeoffice')
    expect(p).toContain('"gruende"')
    expect(p).toContain('"loesungen"')
    expect(p).toContain('"words"')
    expect(p).not.toMatch(/```/)
  })
})

describe('validateBaukasten', () => {
  const good = {
    gruende: [{ ideaDe: 'lange Pendelzeit', noteEn: 'commute' }, { ideaDe: 'Betreuung der Kinder am Nachmittag', noteEn: 'childcare' }, { ideaDe: 'konzentriertes Arbeiten', noteEn: 'focus' }],
    loesungen: [{ ideaDe: 'feste Erreichbarkeit vereinbaren', noteEn: 'availability' }, { ideaDe: 'eine Probephase vorschlagen', noteEn: 'trial period' }, { ideaDe: 'Bürotage für Meetings reservieren', noteEn: 'office days' }],
    words: [
      { de: 'die Erreichbarkeit', en: 'availability' }, { de: 'die Probephase', en: 'trial period' },
      { de: 'der Dienstplan', en: 'duty roster' }, { de: 'das Vertrauen', en: 'trust' },
      { de: 'die Vereinbarung', en: 'agreement' }, { de: 'der Arbeitsweg', en: 'commute' }
    ]
  }
  test('accepts a well-formed bank', () => {
    expect(validateBaukasten(good)).not.toBeNull()
  })
  test('rejects short lists, over-long ideas, article-less words', () => {
    expect(validateBaukasten({ ...good, gruende: good.gruende.slice(0, 1) })).toBeNull()
    expect(validateBaukasten({ ...good, loesungen: [{ ...good.loesungen[0], ideaDe: 'x'.repeat(140) }, ...good.loesungen.slice(1)] })).toBeNull()
    expect(validateBaukasten({ ...good, words: [{ de: 'Erreichbarkeit', en: 'availability' }, ...good.words.slice(1)] })).toBeNull()
  })
})
