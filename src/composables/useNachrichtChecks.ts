//
// Schreiben Teil 2 — the Gerüst-Check and the Radar (Du/Sie-Radar,
// Höflichkeits-Check). See CONTEXT.md → "Gerüst-Check", "Radar".
//
// Pure string/regex checks over the Nachricht text — no Dexie, no AI, no Vue.
// Local, free, advisory: they never feed the grader and their warnings are
// never written to the Hilfe-Protokoll. Cheap enough to re-run on every
// debounce tick over the whole text.
//

import type { SchreibAnlass } from '../data/schreibenAuftraege'

export type GeruestKey = 'betreff' | 'anrede' | 'kleinschreibung' | 'absaetze' | 'gruss' | 'name'

export interface GeruestSignal {
  key: GeruestKey
  ok: boolean
  labelDe: string
  hintDe: string
}

export type RadarKey = 'du-form' | 'informell' | 'hoeflichkeit'

export interface RadarWarnung {
  key: RadarKey
  labelDe: string
  detailDe: string
  matches: string[]
}

/** Exported for the Gerüst hint copy — the accepted Grußformeln, lowercase, no trailing punctuation. */
export const GRUSS_FORMELN: string[] = [
  'mit freundlichen grüßen',
  'freundliche grüße',
  'viele grüße',
  'herzliche grüße',
  'beste grüße'
]

// \b is ASCII word-boundary; it doesn't special-case umlauts. Per spec this is
// accepted as-is ("simple \b(du|dich|…)\b/gi is fine") — not a bug to "fix" later.
const DU_FORM_RE = /\b(du|dich|dir|dein|deine|deinen|deinem|deiner|deins|euch|euer|eure)\b/gi
const INFORMELL_RE = /\b(na ja|halt|echt|krass|mega|voll cool|super|okay|lg|mfg|hey|hi)\b/gi
const KONJUNKTIV_II_RE = /\b(würde|würden|könnte|könnten|wäre|wären|hätte|hätten|dürfte|dürften)\b/i

function nonEmptyLines(text: string): string[] {
  return text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
}

function lastToken(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1] ?? ''
}

/** Six frame checks against the raw text (works identically on assembled scaffold output). */
export function geruestSignals(text: string, empfaengerName: string): GeruestSignal[] {
  const lines = nonEmptyLines(text)

  // betreff: among the first two non-empty lines
  const betreffOk = lines.slice(0, 2).some(l => /^betreff\s*:\s*\S{3,}/i.test(l))

  // anrede: among the first five non-empty lines
  const surname = lastToken(empfaengerName).toLowerCase()
  const anredeStarts = ['sehr geehrte', 'liebe', 'guten tag']
  let anredeIdx = -1
  const first5 = lines.slice(0, 5)
  for (let i = 0; i < first5.length; i++) {
    const lower = first5[i].toLowerCase()
    const startsOk = anredeStarts.some(s => lower.startsWith(s))
    const containsSurname = surname.length > 0 && lower.includes(surname)
    const endsWithComma = first5[i].endsWith(',')
    if (startsOk && containsSurname && endsWithComma) {
      anredeIdx = i
      break
    }
  }
  const anredeOk = anredeIdx !== -1

  // kleinschreibung: only evaluated when anrede is ok; otherwise neutral (ok: true)
  let kleinschreibungOk = true
  if (anredeOk) {
    const nextLine = lines[anredeIdx + 1]
    if (nextLine) {
      const firstLetterMatch = nextLine.match(/[A-Za-zÄÖÜäöüß]/)
      if (firstLetterMatch) {
        const firstLetter = firstLetterMatch[0]
        kleinschreibungOk = firstLetter === firstLetter.toLowerCase() && firstLetter !== firstLetter.toUpperCase()
      }
    } else {
      kleinschreibungOk = true
    }
  }

  // absaetze: at least two blank-line separations
  const blankLineSeps = text.match(/\n[ \t]*\n/g) ?? []
  const absaetzeOk = blankLineSeps.length >= 2

  // gruss: among the last five non-empty lines, equals a Grußformel exactly (no trailing punctuation)
  const last5 = lines.slice(-5)
  let grussIdx = -1
  for (let i = 0; i < last5.length; i++) {
    if (GRUSS_FORMELN.includes(last5[i].toLowerCase())) {
      grussIdx = lines.length - last5.length + i
      break
    }
  }
  const grussOk = grussIdx !== -1

  // name: at least one non-empty line after the Gruß line (only evaluated when gruss ok)
  const nameOk = grussOk ? grussIdx < lines.length - 1 : false

  return [
    {
      key: 'betreff',
      ok: betreffOk,
      labelDe: 'Betreff',
      hintDe: 'Die erste oder zweite Zeile beginnt mit „Betreff:" und nennt kurz das Thema der Nachricht.'
    },
    {
      key: 'anrede',
      ok: anredeOk,
      labelDe: 'Anrede',
      hintDe: 'Die Anrede nennt den Nachnamen des Empfängers (z. B. „Sehr geehrter Herr Semder,") und endet mit einem Komma.'
    },
    {
      key: 'kleinschreibung',
      ok: kleinschreibungOk,
      labelDe: 'Kleinschreibung nach der Anrede',
      hintDe: 'Nach dem Komma der Anrede geht der Satz klein weiter — kein neuer Großbuchstabe direkt danach.'
    },
    {
      key: 'absaetze',
      ok: absaetzeOk,
      labelDe: 'Absätze',
      hintDe: 'Mindestens zwei Leerzeilen trennen Anrede, Haupttext und Gruß in eigene Absätze.'
    },
    {
      key: 'gruss',
      ok: grussOk,
      labelDe: 'Grußformel',
      hintDe: 'Eine feste Grußformel ohne Komma oder Punkt danach, z. B. „Mit freundlichen Grüßen".'
    },
    {
      key: 'name',
      ok: nameOk,
      labelDe: 'Name',
      hintDe: 'Nach der Grußformel steht in einer eigenen Zeile dein Name.'
    }
  ]
}

/** Empty array = nothing to warn about. `hoeflichkeit` fires only for bitte/beschwerde. */
export function radarWarnungen(text: string, anlass: SchreibAnlass): RadarWarnung[] {
  const warnungen: RadarWarnung[] = []

  const duMatches = text.match(DU_FORM_RE) ?? []
  if (duMatches.length > 0) {
    warnungen.push({
      key: 'du-form',
      labelDe: 'Du-Form',
      detailDe: 'Diese Nachricht braucht das Sie-Register — du/dich/dein/euch-Formen passen nicht zu einer halbformellen Nachricht.',
      matches: duMatches
    })
  }

  const informellMatches = text.match(INFORMELL_RE) ?? []
  if (informellMatches.length > 0) {
    warnungen.push({
      key: 'informell',
      labelDe: 'Umgangssprache',
      detailDe: 'Umgangssprachliche Wörter wie „halt" oder „lg" wirken in einer halbformellen Nachricht zu locker.',
      matches: informellMatches
    })
  }

  if (anlass === 'bitte' || anlass === 'beschwerde') {
    if (!KONJUNKTIV_II_RE.test(text)) {
      warnungen.push({
        key: 'hoeflichkeit',
        labelDe: 'Höflichkeit',
        detailDe: 'Ihre Bitte klingt wie eine Anweisung — Konjunktiv II macht sie höflich (könnten Sie …, wäre es möglich …).',
        matches: []
      })
    }
  }

  return warnungen
}
