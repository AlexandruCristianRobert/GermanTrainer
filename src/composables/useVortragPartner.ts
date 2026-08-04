//
// Sprechen Teil 1 (Vortrag) — the Nachfrage generator and the Teil-1 KI-Tipp.
// Two single-shot generateContent calls, never a chat-role API (see
// useSprechenPartner.ts's architecture note — same reasoning applies here).
//
// The Nachfrage is generated from what the learner actually SAID (the whole
// Rede), never a canned per-topic question — a stock question would test
// nothing. The KI-Tipp names the Gliederungspunkte not yet covered (via
// planSignals, ADR-0014) and points toward the next one; it never hands back
// a sentence to speak, only a direction.

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

export function buildNachfragePrompt(v: SprechenVortrag): string {
  return (
    'Du bist die prüfende Partnerin/der prüfende Partner in einer B2-Übungsprüfung ' +
    '(Goethe-Zertifikat B2, Sprechen Teil 1 — Vortrag). Der Lernende hat gerade ' +
    `folgenden Vortrag zur Aufgabe „${v.thema.taskDe}" gehalten:\n\n` +
    `VORTRAG:\n${v.rede.textDe}\n\n` +
    'Stelle GENAU EINE Nachfrage dazu. Wähle dafür die Aussage im Vortrag, die am ' +
    'schwächsten begründet oder am vagsten geblieben ist, und frage konkret danach. ' +
    'Die Frage muss sich in zwei bis drei Sätzen beantworten lassen und darf ' +
    'nicht mit ja oder nein beantwortbar sein. Sieze den Lernenden. Korrigiere ' +
    'NIEMALS die Sprache des Lernenden — weder direkt noch indirekt; sprachliche ' +
    'Rückmeldung gibt es erst in der Auswertung.\n' +
    'Antworte ausschließlich als JSON-Objekt mit genau einem Feld "questionDe", ' +
    'z. B. {"questionDe": "Was meinen Sie damit genau …?"} — kein Prosa-Vorspann, ' +
    'keine Markdown-Fences.'
  )
}

export function validateNachfrage(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.questionDe !== 'string') return null
  const q = r.questionDe.trim()
  if (q.length < 12 || q.length > 300) return null
  if (!q.endsWith('?')) return null
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

export function buildVortragKiTippPrompt(v: SprechenVortrag): string {
  const signals = planSignals(v.plan, v.rede.textDe)
  const missing = signals.filter(s => !s.said)
  const redeSoFar = v.rede.textDe.slice(-1200)

  const missingListDe = missing.length > 0
    ? missing.map(s => s.labelDe).join(', ')
    : 'keiner mehr — alle fünf Gliederungspunkte wurden bereits angesprochen'

  const next = missing[0] ?? null
  const headingIntoDe = next
    ? `Der Lernende steuert als Nächstes am besten auf den Gliederungspunkt „${next.labelDe}" zu.`
    : `Alle Gliederungspunkte wurden schon angesprochen — der Lernende sollte jetzt zum ` +
      `Abschluss („${GLIEDERUNGSPUNKTE[GLIEDERUNGSPUNKTE.length - 1].labelDe}") kommen.`
  const stichwortHintDe = next && next.keyword.trim().length > 0
    ? ` Dafür hat er/sie sich selbst das Stichwort „${next.keyword}" geplant — greife dieses ` +
      'eigene, geplante Stichwort auf, ohne den Satz vorzuformulieren.'
    : ' Nutze, falls vorhanden, das eigene geplante Stichwort des Lernenden für diesen Punkt als Ansatzpunkt.'

  return (
    `Aufgabe des Vortrags: ${v.thema.taskDe}\n` +
    `Noch nicht angesprochene Gliederungspunkte: ${missingListDe}.\n` +
    `${headingIntoDe}${stichwortHintDe}\n\n` +
    `VORTRAG BISHER (letzte 1200 Zeichen):\n${redeSoFar}\n\n` +
    'Gib in 1–2 Sätzen (Deutsch, du-Form) einen strategischen Tipp, WELCHEN ' +
    'inhaltlichen Schritt der Lernende als Nächstes machen könnte, um diesen ' +
    'Gliederungspunkt zu erreichen — z. B. welchen Aspekt er/sie einführen, ' +
    'gegenüberstellen oder mit einem Beispiel belegen könnte. Formuliere KEINEN ' +
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
