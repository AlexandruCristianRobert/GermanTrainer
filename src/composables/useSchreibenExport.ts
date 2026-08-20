//
// Export of a just-graded Schreiben text as a plain .txt download: the full
// Aufgabenblatt (Thema/Auftrag, Situation, Aufgabe, Inhaltspunkte) plus the
// learner's own text, exactly as graded. The file lands on the LEARNER's
// filesystem — no app store is involved, so ADR-0019's retention model is
// untouched. The result pages offer the button only while the ADR-0024
// volatile handoff (useNachbessern.ts) still holds the text: one sitting, a
// reload loses the offer and with it the button — the boundary working, not
// a bug.

import type { SchreibThemaRef } from '../data/schreiben'
import type { SchreibauftragRef } from '../data/schreibenNachricht'
import { ANLASS_LABEL } from '../data/schreibenAuftraege'

function inhaltspunkteBlock(punkte: string[]): string {
  return punkte.map((p, i) => `${i + 1}. ${p}`).join('\n')
}

/** Aufgabenblatt + text for a graded Forumsbeitrag (Teil 1). */
export function beitragExportText(thema: SchreibThemaRef, text: string, wordCount: number): string {
  return [
    'Schreiben Teil 1 · Forumsbeitrag',
    `Thema: ${thema.titleDe}`,
    '',
    'SITUATION',
    thema.forumContextDe,
    '',
    'AUFGABE',
    thema.taskDe,
    '',
    'INHALTSPUNKTE',
    inhaltspunkteBlock(thema.inhaltspunkte),
    '',
    `DEIN TEXT (${wordCount} Wörter)`,
    text
  ].join('\n')
}

/** Aufgabenblatt + text for a graded Nachricht (Teil 2). */
export function nachrichtExportText(auftrag: SchreibauftragRef, text: string, wordCount: number): string {
  return [
    'Schreiben Teil 2 · Nachricht',
    `Auftrag: ${auftrag.titleDe}`,
    `Anlass: ${ANLASS_LABEL[auftrag.anlass].de}`,
    `Empfänger: ${auftrag.empfaengerName} (${auftrag.empfaengerRolleDe})`,
    '',
    'SITUATION',
    auftrag.situationDe,
    '',
    'AUFGABE',
    auftrag.taskDe,
    '',
    'INHALTSPUNKTE',
    inhaltspunkteBlock(auftrag.inhaltspunkte),
    '',
    `DEIN TEXT (${wordCount} Wörter)`,
    text
  ].join('\n')
}

/** `<prefix>-<title-slug>.txt`, safe on every filesystem: umlauts
 *  transliterated, remaining diacritics stripped, everything else
 *  non-alphanumeric collapsed to `-`. */
export function exportFilename(prefix: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug.length > 0 ? `${prefix}-${slug}.txt` : `${prefix}.txt`
}

/** Hands the content to the browser as a .txt download. */
export function downloadTxt(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
