//
// The AI Gesprächspartner for Sprechen Teil 2. One single-shot generateContent
// call per turn: persona system prompt + the serialized transcript (there is
// no chat-role API anywhere in this codebase — deliberate, see the spec's
// architecture decision). Also home of the on-demand KI-Tipp call.

import { learnerTurnCount, type SprechenDiscussion } from '../data/sprechen'

// ── Gemini client shape (matches useKonjunktivQuiz.GeminiClient) ──

export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

export class PartnerError extends Error {
  constructor(message: string, public readonly attempts: number) {
    super(message)
    this.name = 'PartnerError'
  }
}

export type PartnerPhase = 'opening' | 'reply' | 'closing'

/** opening: no turns yet · closing: learner reached the target · reply: otherwise. */
export function computePhase(d: SprechenDiscussion): PartnerPhase {
  if (d.turns.length === 0) return 'opening'
  if (learnerTurnCount(d) >= d.turnTarget) return 'closing'
  return 'reply'
}

export function serializeTranscript(turns: SprechenDiscussion['turns']): string {
  return turns
    .map(t => `${t.role === 'partner' ? 'PARTNER' : 'LERNER'}: ${t.textDe}`)
    .join('\n')
}

export function buildPartnerSystem(d: SprechenDiscussion): string {
  const stance = d.stance === 'pro' ? 'DAFÜR' : 'DAGEGEN'
  return (
    'Du bist Gesprächspartnerin/Gesprächspartner in einer Übung zum ' +
    'Goethe-Zertifikat B2, Sprechen Teil 2 (Diskussion). Ihr diskutiert ' +
    `über das Thema „${d.topic.titleDe}": ${d.topic.statementDe}\n` +
    `Deine Position: ${stance}.\n\n` +
    'Regeln für JEDEN Beitrag:\n' +
    '- Sauberes, natürliches B2-Deutsch. 2–4 Sätze — der Lernende soll den ' +
    'Großteil des Gesprächs bestreiten.\n' +
    '- Verteidige deine Position, aber gib gute Argumente zu ' +
    '(„Da haben Sie recht, aber …").\n' +
    '- Übernimmt der Lernende deine Position, gib den Punkt zu und eröffne ' +
    'sofort einen neuen strittigen Teilaspekt des Themas ' +
    '(„Aber wie sieht es mit … aus?").\n' +
    '- Auf einen sehr kurzen Lernerbeitrag reagierst du mit einer direkten, ' +
    'konkreten Nachfrage statt mit einem Monolog.\n' +
    '- Stelle ungefähr in jedem zweiten Beitrag eine Frage an den Lernenden.\n' +
    '- Korrigiere NIEMALS die Sprache des Lernenden — weder direkt noch ' +
    'indirekt. Sprachliche Rückmeldung gibt es erst in der Auswertung.\n' +
    '- Sieze den Lernenden.\n\n' +
    'Antworte ausschließlich als JSON-Objekt mit genau einem Feld "replyDe", ' +
    'z. B. {"replyDe": "Da bin ich anderer Meinung, weil …"} — kein Prosa-' +
    'Vorspann, keine Markdown-Fences.'
  )
}

export const PARTNER_TURN_SCHEMA = {
  type: 'object',
  properties: { replyDe: { type: 'string' } },
  required: ['replyDe']
}

const PHASE_INSTRUCTION: Record<PartnerPhase, string> = {
  opening:
    'Eröffne die Diskussion: Begrüße kurz, nimm in 2–3 Sätzen Stellung zum ' +
    'Thema und lade den Lernenden ein, seine Meinung zu sagen.',
  reply:
    'Schreibe den nächsten Partnerbeitrag (2–4 Sätze), der direkt an den ' +
    'letzten Lernerbeitrag anschließt.',
  closing:
    'Schreibe einen kurzen abschließenden Beitrag (2–3 Sätze): fasse den Kern ' +
    'der Diskussion in einem Satz zusammen und bedanke dich für das Gespräch. ' +
    'Stelle KEINE neue Frage.'
}

export function buildPartnerTurnPrompt(d: SprechenDiscussion, phase: PartnerPhase): string {
  const transcript = d.turns.length > 0
    ? `BISHERIGES GESPRÄCH:\n${serializeTranscript(d.turns)}\n\n`
    : ''
  return `${transcript}${PHASE_INSTRUCTION[phase]}`
}

export function validatePartnerReply(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.replyDe !== 'string') return null
  const reply = r.replyDe.trim()
  if (reply.length < 10 || reply.length > 900) return null
  return reply
}

export async function generatePartnerTurn(
  client: GeminiClient,
  model: string,
  d: SprechenDiscussion,
  phase: PartnerPhase,
  maxRetries = 2
): Promise<string> {
  let attempts = 0
  let lastError = 'no attempts'
  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model,
        contents: buildPartnerTurnPrompt(d, phase),
        config: {
          systemInstruction: buildPartnerSystem(d),
          responseMimeType: 'application/json',
          responseSchema: PARTNER_TURN_SCHEMA as unknown as Record<string, unknown>,
          temperature: 0.8,
          topP: 0.95
        }
      })
      const text = (response.text ?? '').trim()
      let reply: string | null = null
      try {
        reply = validatePartnerReply(JSON.parse(text))
      } catch { /* not JSON — try the bare-text fallback below */ }
      // Local-claude fallback: the dev CLI bridge forwards no responseSchema,
      // so the model may answer with the bare German reply instead of
      // {"replyDe": …}. Accept prose that isn't attempted-but-broken JSON.
      if (reply === null && text.length > 0 && !text.startsWith('{') && !text.startsWith('[')) {
        reply = validatePartnerReply({ replyDe: text })
      }
      if (reply === null) {
        lastError = 'no usable reply in response'
        continue
      }
      return reply
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new PartnerError(`Partner turn failed after ${attempts} attempts: ${lastError}`, attempts)
}

// ── KI-Tipp ─────────────────────────────────────────────────────

export const KI_TIPP_SCHEMA = {
  type: 'object',
  properties: { tippDe: { type: 'string' } },
  required: ['tippDe']
}

export function buildKiTippPrompt(d: SprechenDiscussion): string {
  const transcript = d.turns.length > 0
    ? `BISHERIGES GESPRÄCH:\n${serializeTranscript(d.turns)}\n\n`
    : ''
  return (
    `${transcript}Der Lernende ist am Zug und diskutiert über: ${d.topic.statementDe}\n` +
    'Gib in 1–2 Sätzen (Deutsch, du-Form) einen strategischen Tipp, WAS der ' +
    'Lernende als Nächstes argumentativ tun könnte — z. B. widersprechen, ' +
    'abwägen, ein konkretes Beispiel bringen, nachfragen. Formuliere KEINEN ' +
    'fertigen Satz zum Abschreiben, nur die Richtung. ' +
    'Antworte ausschließlich als JSON-Objekt mit genau einem Feld "tippDe", ' +
    'z. B. {"tippDe": "Du könntest …"} — keine Markdown-Fences.'
  )
}

export async function generateKiTipp(
  client: GeminiClient,
  model: string,
  d: SprechenDiscussion
): Promise<string> {
  const response = await client.models.generateContent({
    model,
    contents: buildKiTippPrompt(d),
    config: {
      responseMimeType: 'application/json',
      responseSchema: KI_TIPP_SCHEMA as unknown as Record<string, unknown>,
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
