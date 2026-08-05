//
// Sprechen Teil 1 (Vortrag) — the Nachfrage generator and the Teil-1 KI-Tipp.
// Two single-shot generateContent calls, never a chat-role API (see
// useSprechenPartner.ts's architecture note — same reasoning applies here).
//
// The Nachfrage is generated from what the learner actually SAID (the whole
// Rede), never a canned per-topic question — a stock question would test
// nothing. Its question TYPE rotates deterministically per Vortrag (F18) so
// repeated practice does not always probe the same weakness.
//
// The KI-Tipp never hands back a sentence to speak, only a direction. F7 /
// ADR-0014: keyword-said is not point-covered, so the model JUDGES coverage
// itself from the Rede text; `planSignals` only rides along as an explicitly
// labelled, unreliable hint — the prompt must never assert an unsaid keyword
// as a missing Gliederungspunkt the way an earlier version did.

import { planSignals } from './useVortragCoverage'
import { GLIEDERUNGSPUNKTE } from '../data/sprechenVortragsmittel'
import type { SprechenVortrag } from '../data/sprechen'

// ── Gemini client shape (matches useSprechenPartner.GeminiClient) ──

export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

// ── Nachfrage ─────────────────────────────────────────────────────

export class NachfrageError extends Error {
  constructor(message: string, public readonly attempts: number) {
    super(message)
    this.name = 'NachfrageError'
  }
}

export const NACHFRAGE_SCHEMA = {
  type: 'object',
  properties: { questionDe: { type: 'string' } },
  required: ['questionDe']
}

// F18 — the Nachfrage's job rotates across runs so repeated practice does not
// always probe the same weakness. Picked deterministically off `startedAt`
// (`NACHFRAGE_TYPES[v.startedAt % 4]`) so the same Vortrag always gets the
// same strategy line, but different Vortragen (different startedAt) vary.
const NACHFRAGE_TYPES = [
  'Vertiefung: Wähle die Aussage im Vortrag, die am schwächsten begründet oder ' +
    'am vagsten geblieben ist, und frage gezielt nach dem Grund dahinter.',
  'Konkretes Beispiel: Wähle eine Aussage im Vortrag, die allgemein geblieben ' +
    'ist, und bitte höflich um ein konkretes Beispiel dazu.',
  'Gegenposition: Greife die zentrale Position des Vortrags auf und ' +
    'konfrontiere sie höflich, aber direkt mit einem plausiblen Gegenargument.',
  'Transfer: Frage, wie sich die im Vortrag beschriebene Situation in einem ' +
    'anderen Land oder Lebensbereich darstellen würde.'
] as const

export function buildNachfragePrompt(v: SprechenVortrag): string {
  const strategieDe = NACHFRAGE_TYPES[v.startedAt % 4]
  return (
    'Du bist die prüfende Partnerin/der prüfende Partner in einer B2-Übungsprüfung ' +
    '(Goethe-Zertifikat B2, Sprechen Teil 1 — Vortrag). Der Lernende hat gerade ' +
    `folgenden Vortrag zur Aufgabe „${v.thema.taskDe}" gehalten:\n\n` +
    `VORTRAG:\n${v.rede.textDe}\n\n` +
    `Stelle GENAU EINE Nachfrage dazu. ${strategieDe} ` +
    'Die Frage muss sich in zwei bis drei Sätzen beantworten lassen und darf ' +
    'nicht mit ja oder nein beantwortbar sein. Sieze den Lernenden. Korrigiere ' +
    'NIEMALS die Sprache des Lernenden — weder direkt noch indirekt; sprachliche ' +
    'Rückmeldung gibt es erst in der Auswertung.\n' +
    'Antworte ausschließlich als JSON-Objekt mit genau einem Feld "questionDe", ' +
    'z. B. {"questionDe": "Was meinen Sie damit genau …?"} — kein Prosa-Vorspann, ' +
    'keine Markdown-Fences.'
  )
}

// F18 — a cheap shape check on the FIRST WORD, not NLU: a Nachfrage opening on
// a finite verb (sein/haben/modal/etc.) reads as yes/no-answerable in German
// word order ("Sind Sie …?", "Gibt es …?"). W-questions ("Wer", "Wie", "Was",
// "Warum", …) never match this list, so they sail through untouched.
const YES_NO_OPENERS = new Set([
  'sind', 'ist', 'war', 'waren', 'haben', 'hat', 'hatten', 'können', 'kann',
  'könnten', 'würden', 'wären', 'sollte', 'sollten', 'müssen', 'muss', 'darf',
  'dürfen', 'gibt', 'gab', 'finden', 'glauben', 'meinen', 'halten', 'stimmt',
  'trifft', 'denken', 'sehen'
])

export function validateNachfrage(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.questionDe !== 'string') return null
  const q = r.questionDe.trim()
  if (q.length < 12 || q.length > 300) return null
  if (!q.endsWith('?')) return null
  const firstWord = (q.split(/\s+/)[0] ?? '').replace(/[^\p{L}]/gu, '').toLowerCase()
  if (YES_NO_OPENERS.has(firstWord)) return null
  return q
}

export async function generateNachfrage(
  client: GeminiClient,
  model: string,
  v: SprechenVortrag,
  maxRetries = 2
): Promise<string> {
  let attempts = 0
  let lastError = 'no attempts'
  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model,
        contents: buildNachfragePrompt(v),
        config: {
          responseMimeType: 'application/json',
          responseSchema: NACHFRAGE_SCHEMA as unknown as Record<string, unknown>,
          temperature: 0.8,
          topP: 0.95
        }
      })
      const text = (response.text ?? '').trim()
      let question: string | null = null
      try {
        question = validateNachfrage(JSON.parse(text))
      } catch { /* not JSON — try the bare-text fallback below */ }
      // Local-claude fallback: the dev CLI bridge forwards no responseSchema,
      // so the question may arrive as bare prose instead of {"questionDe": …}.
      if (question === null && text.length > 0 && !text.startsWith('{') && !text.startsWith('[')) {
        question = validateNachfrage({ questionDe: text })
      }
      if (question === null) {
        lastError = 'no usable question in response'
        continue
      }
      return question
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new NachfrageError(`Nachfrage generation failed after ${attempts} attempts: ${lastError}`, attempts)
}

// ── Teil-1 KI-Tipp ──────────────────────────────────────────────────

export const VORTRAG_KITIPP_SCHEMA = {
  type: 'object',
  properties: { tippDe: { type: 'string' } },
  required: ['tippDe']
}

/** m:ss, floor-seconds — a small local formatter, no import worth pulling in for one line. */
function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function buildVortragKiTippPrompt(v: SprechenVortrag): string {
  // F7 / ADR-0014: planSignals is the learner's OWN keyword-said signal — real,
  // but not proof of coverage (a point can be covered without the planned word,
  // or the word said without the point being developed). It rides along ONLY
  // as an explicitly unreliable hint; the model judges coverage itself from
  // the actual Rede text below.
  const signals = planSignals(v.plan, v.rede.textDe)
  const notYetSaid = signals.filter(s => !s.said && s.keyword.trim().length > 0)
  const stichwortHinweisDe = notYetSaid.length > 0
    ? 'Hinweis, unzuverlässig: folgende geplante Stichwörter sind noch nicht gefallen: ' +
      `${notYetSaid.map(s => s.keyword).join(', ')} — das beweist NICHT, dass der ` +
      'zugehörige Punkt fehlt, nur dass dieses eine Wort noch nicht gesagt wurde.'
    : 'Hinweis, unzuverlässig: alle geplanten Stichwörter sind gefallen.'

  const punkteListeDe = GLIEDERUNGSPUNKTE.map(p => p.labelDe).join(', ')
  const redeSoFar = v.rede.textDe.slice(-1200)

  // F2 — Redezeit state, so the tip can be pacing advice, not only content
  // advice ("3:10 gesprochen, zwei Punkte offen — kürze die Situation ab").
  const { seconds, wallSeconds } = v.rede
  const redezeitDe = seconds === undefined && wallSeconds === undefined
    ? ''
    : '\n' + [
        seconds !== undefined ? `Redezeit gesprochen ${clock(seconds)}` : null,
        wallSeconds !== undefined ? `Gesamt seit Beginn ${clock(wallSeconds)}` : null
      ].filter((x): x is string => x !== null).join(', ') + '.'

  return (
    `Aufgabe des Vortrags: ${v.thema.taskDe}\n` +
    `Die fünf Gliederungspunkte des Vortrags: ${punkteListeDe}.\n` +
    'Beurteile selbst anhand des VORTRAG-BISHER-Texts unten, welche dieser ' +
    `Gliederungspunkte inhaltlich schon abgedeckt sind und welche noch offen sind. ${stichwortHinweisDe}` +
    `${redezeitDe}\n\n` +
    `VORTRAG BISHER (letzte 1200 Zeichen):\n${redeSoFar}\n\n` +
    'Gib in 1–2 Sätzen (Deutsch, du-Form) einen strategischen Tipp, WELCHEN ' +
    'inhaltlichen Schritt der Lernende als Nächstes machen könnte, um einen noch ' +
    'offenen Gliederungspunkt zu erreichen — z. B. welchen Aspekt er/sie einführen, ' +
    'gegenüberstellen oder mit einem Beispiel belegen könnte. Ist die Redezeit ' +
    'schon weit fortgeschritten, kann der Tipp stattdessen ein Tempo-Hinweis sein ' +
    '(kürzer fassen, zum Schluss kommen). Formuliere KEINEN ' +
    'fertigen Satz zum Abschreiben, nur die Richtung. ' +
    'Antworte ausschließlich als JSON-Objekt mit genau einem Feld "tippDe", ' +
    'z. B. {"tippDe": "Geh jetzt auf …"} — keine Markdown-Fences.'
  )
}

export async function generateVortragKiTipp(
  client: GeminiClient,
  model: string,
  v: SprechenVortrag
): Promise<string> {
  const response = await client.models.generateContent({
    model,
    contents: buildVortragKiTippPrompt(v),
    config: {
      responseMimeType: 'application/json',
      responseSchema: VORTRAG_KITIPP_SCHEMA as unknown as Record<string, unknown>,
      temperature: 0.7,
      topP: 0.95
    }
  })
  const text = (response.text ?? '').trim()
  let tipp: string | null = null
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    if (parsed && typeof parsed.tippDe === 'string' && parsed.tippDe.trim().length > 0) {
      tipp = parsed.tippDe.trim()
    }
  } catch { /* not JSON — try the bare-text fallback below */ }
  // Local-claude fallback: no responseSchema reaches the CLI bridge, so the
  // tip may arrive as bare prose. Accept it unless it's broken JSON.
  if (tipp === null && text.length > 0 && !text.startsWith('{') && !text.startsWith('[')) {
    tipp = text
  }
  if (tipp === null) throw new Error('KI-Tipp returned no usable text')
  return tipp
}
