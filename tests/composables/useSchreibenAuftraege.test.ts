import { describe, test, expect } from 'vitest'
import { validateGeneratedAuftrag, buildAuftragGeneratorPrompt, drawAuftrag } from '../../src/composables/useSchreibenAuftraege'

const good = {
  titleDe: 'Bitte um Schichttausch',
  situationDe: 'Sie arbeiten im Schichtdienst. Nächste Woche haben Sie einen wichtigen privaten Termin, der mit Ihrer Schicht kollidiert.',
  empfaengerName: 'Frau Sturm',
  empfaengerRolleDe: 'Ihre Schichtleiterin',
  taskDe: 'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihre Schichtleiterin, Frau Sturm.',
  inhaltspunkte: [
    'Nennen Sie Ihr Anliegen und beziehen Sie sich auf Ihren Dienstplan.',
    'Erklären Sie den Grund für den gewünschten Tausch.',
    'Schlagen Sie eine konkrete Lösung vor.',
    'Bitten Sie um eine kurze Rückmeldung.'
  ],
  anlass: 'bitte'
}

describe('validateGeneratedAuftrag', () => {
  test('accepts a well-formed Auftrag', () => {
    expect(validateGeneratedAuftrag(good)).not.toBeNull()
  })
  test('rejects wrong prefix, missing floor, bad anlass, wrong point count, nameless Empfänger', () => {
    expect(validateGeneratedAuftrag({ ...good, taskDe: 'Verfassen Sie eine E-Mail an Frau Sturm (mindestens 100 Wörter).' })).toBeNull()
    expect(validateGeneratedAuftrag({ ...good, taskDe: 'Schreiben Sie eine Nachricht an Frau Sturm.' })).toBeNull()
    expect(validateGeneratedAuftrag({ ...good, anlass: 'reklamation' })).toBeNull()
    expect(validateGeneratedAuftrag({ ...good, inhaltspunkte: good.inhaltspunkte.slice(0, 3) })).toBeNull()
    expect(validateGeneratedAuftrag({ ...good, empfaengerName: 'Kling' })).toBeNull()
  })
  test('rejects an Inhaltspunkt without a trailing period', () => {
    const raw = { ...good, inhaltspunkte: [...good.inhaltspunkte.slice(0, 3), 'Bitten Sie um eine Antwort'] }
    expect(validateGeneratedAuftrag(raw)).toBeNull()
  })
})

describe('buildAuftragGeneratorPrompt', () => {
  test('demands one Auftrag per Anlass, the envelope, and the exam constraints', () => {
    const p = buildAuftragGeneratorPrompt(['Bitte um Homeoffice'], new Set(['Absage einer Besprechung']))
    expect(p).toContain('Bitte um Homeoffice')
    expect(p).toContain('Absage einer Besprechung')
    expect(p).toContain('"auftraege"')
    expect(p).toContain('mindestens 100 Wörter')
    expect(p).toContain('genau vier')
    for (const a of ['entschuldigung', 'bitte', 'beschwerde', 'vorschlag', 'dank']) expect(p).toContain(a)
  })
  test('prompt names the trailing-period and Rolle-then-Name rules', () => {
    const prompt = buildAuftragGeneratorPrompt([], new Set())
    expect(prompt).toContain('endet mit einem Punkt')
    expect(prompt).toContain('zuerst die Rolle')
  })
})

describe('drawAuftrag', () => {
  test('deterministic under fixed rng; respects the Anlass filter', () => {
    expect(drawAuftrag(null, () => 0).id).toMatch(/^wa-/)
    for (let i = 0; i < 5; i++) {
      expect(drawAuftrag('beschwerde', () => i / 5).anlass).toBe('beschwerde')
    }
  })
})
