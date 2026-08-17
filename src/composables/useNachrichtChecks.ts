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

// absaetze: the body between Anrede and Gruß must itself break into
// paragraphs — the assembled scaffold frame alone earns nothing (the old
// whole-text rule was trivially satisfied there; see the grilled review).
// While either anchor is missing, fall back to the whole-text rule so a
// half-written draft is not scolded for a frame it does not have yet.
function bodyHasParagraphBreak(raw: string, anredeLine: string, grussLine: string): boolean {
  const phys = raw.split('\n')
  const aIdx = phys.findIndex(l => l.trim() === anredeLine)
  const gIdx = phys.findIndex((l, i) => i > aIdx && l.trim() === grussLine)
  if (aIdx === -1 || gIdx === -1) return false
  const body = phys.slice(aIdx + 1, gIdx).join('\n')
  return /\S[^]*?\n[ \t]*\n[^]*?\S/.test(body)
}

/** Six frame checks against the raw text (works identically on assembled scaffold output). */
export function geruestSignals(text: string, empfaengerName: string): GeruestSignal[] {
  const lines = nonEmptyLines(text)

  // betreff: among the first two non-empty lines
  const betreffOk = lines.slice(0, 2).some(l => /^betreff\s*:\s*\S{3,}/i.test(l))

  // anrede: among the first five non-empty lines, resolved against the
  // Empfänger's own title — the six-stem whitelist catches both the wrong
  // Herr/Frau and the wrong adjective ending (Sehr geehrte Herr …). Not
  // grammar analysis: a closed class of two formulas × two titles, plus
  // Guten Tag, which takes no ending.
  const title = empfaengerName.trim().toLowerCase().startsWith('frau') ? 'Frau' : 'Herr'
  const stems = title === 'Frau'
    ? ['sehr geehrte frau', 'liebe frau', 'guten tag frau']
    : ['sehr geehrter herr', 'lieber herr', 'guten tag herr']
  const surname = lastToken(empfaengerName).toLowerCase()
  let anredeIdx = -1
  const first5 = lines.slice(0, 5)
  for (let i = 0; i < first5.length; i++) {
    const lower = first5[i].toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ')
    const startsOk = stems.some(s => lower.startsWith(s))
    const containsSurname = surname.length > 0 && lower.includes(surname)
    const endsWithComma = first5[i].endsWith(',')
    if (startsOk && containsSurname && endsWithComma) {
      anredeIdx = i
      break
    }
  }
  const anredeOk = anredeIdx !== -1
  const resolvedAnrede = title === 'Frau'
    ? `Sehr geehrte ${empfaengerName.trim()},`
    : `Sehr geehrter ${empfaengerName.trim()},`

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

  // gruss: among the last five non-empty lines, equals a Grußformel exactly (no trailing punctuation)
  // (computed before absaetze — absaetze needs grussIdx to scope the body)
  const last5 = lines.slice(-5)
  let grussIdx = -1
  for (let i = 0; i < last5.length; i++) {
    if (GRUSS_FORMELN.includes(last5[i].toLowerCase())) {
      grussIdx = lines.length - last5.length + i
      break
    }
  }
  const grussOk = grussIdx !== -1

  // absaetze: body-scoped when both anchors are found, else the whole-text fallback
  const absaetzeOk = anredeOk && grussOk
    ? bodyHasParagraphBreak(text, lines[anredeIdx], lines[grussIdx])
    : (text.match(/\n[ \t]*\n/g) ?? []).length >= 2

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
      hintDe: `Die Anrede nennt den Empfänger mit passender Endung — „${resolvedAnrede}" — und endet mit einem Komma.`
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
      hintDe: 'Gliedere den Haupttext in mindestens zwei Absätze — eine Leerzeile trennt sie.'
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

// The absence-based check waits for 40 words (the codebase's nudge-band rhythm): an empty draft has no Bitte to scold, and at the 120-word target the Bitte empirically lives in the final third — 40 leaves ~80 words of runway. Presence-based checks (du-form, informell) stay instant.
/** Empty array = nothing to warn about. `hoeflichkeit` fires only for bitte/beschwerde. */
export function radarWarnungen(text: string, anlass: SchreibAnlass, words: number): RadarWarnung[] {
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

  if ((anlass === 'bitte' || anlass === 'beschwerde') && words >= 40) {
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
