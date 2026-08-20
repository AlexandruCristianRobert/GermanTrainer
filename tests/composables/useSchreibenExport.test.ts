import { describe, expect, it } from 'vitest'
import {
  beitragExportText, exportFilename, nachrichtExportText
} from '../../src/composables/useSchreibenExport'
import type { SchreibThemaRef } from '../../src/data/schreiben'
import type { SchreibauftragRef } from '../../src/data/schreibenNachricht'

const THEMA: SchreibThemaRef = {
  id: 'wt-test',
  titleDe: 'Homeoffice für alle?',
  forumContextDe: 'In einem Karriereforum wird diskutiert, ob Homeoffice zur Regel werden soll.',
  taskDe: 'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter).',
  inhaltspunkte: ['Ihre Erfahrung', 'Vorteile', 'Nachteile', 'Ihre Empfehlung'],
  tags: []
}

const AUFTRAG: SchreibauftragRef = {
  id: 'wa-test',
  titleDe: 'Absage einer Besprechung',
  situationDe: 'Ihr Abteilungsleiter hat Sie zu einer Besprechung eingeladen.',
  empfaengerName: 'Herr Semder',
  empfaengerRolleDe: 'Ihr Abteilungsleiter',
  taskDe: 'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Herrn Semder.',
  inhaltspunkte: ['Entschuldigen Sie sich.', 'Erklären Sie den Grund.', 'Schlagen Sie etwas vor.', 'Bitten Sie um das Protokoll.'],
  anlass: 'entschuldigung'
}

describe('beitragExportText', () => {
  const txt = beitragExportText(THEMA, 'Meiner Meinung nach…', 152)
  it('carries Thema, Situation, Aufgabe, numbered Inhaltspunkte and the text', () => {
    expect(txt).toContain('Schreiben Teil 1 · Forumsbeitrag')
    expect(txt).toContain('Thema: Homeoffice für alle?')
    expect(txt).toContain(THEMA.forumContextDe)
    expect(txt).toContain(THEMA.taskDe)
    expect(txt).toContain('1. Ihre Erfahrung')
    expect(txt).toContain('4. Ihre Empfehlung')
    expect(txt).toContain('DEIN TEXT (152 Wörter)')
    expect(txt.endsWith('Meiner Meinung nach…')).toBe(true)
  })
})

describe('nachrichtExportText', () => {
  const txt = nachrichtExportText(AUFTRAG, 'Sehr geehrter Herr Semder, …', 104)
  it('carries Auftrag, Anlass, Empfänger, Situation, Aufgabe, Inhaltspunkte and the text', () => {
    expect(txt).toContain('Schreiben Teil 2 · Nachricht')
    expect(txt).toContain('Auftrag: Absage einer Besprechung')
    expect(txt).toContain('Anlass: ')
    expect(txt).toContain('Empfänger: Herr Semder (Ihr Abteilungsleiter)')
    expect(txt).toContain(AUFTRAG.situationDe)
    expect(txt).toContain(AUFTRAG.taskDe)
    expect(txt).toContain('1. Entschuldigen Sie sich.')
    expect(txt).toContain('DEIN TEXT (104 Wörter)')
    expect(txt.endsWith('Sehr geehrter Herr Semder, …')).toBe(true)
  })
})

describe('exportFilename', () => {
  it('transliterates umlauts and collapses everything else to dashes', () => {
    expect(exportFilename('forumsbeitrag', 'Homeoffice für alle?')).toBe('forumsbeitrag-homeoffice-fuer-alle.txt')
    expect(exportFilename('nachricht', 'Straßenlärm & Müll — Beschwerde!')).toBe('nachricht-strassenlaerm-muell-beschwerde.txt')
  })
  it('falls back to the bare prefix when the title yields no slug', () => {
    expect(exportFilename('nachricht', '???')).toBe('nachricht.txt')
  })
})
