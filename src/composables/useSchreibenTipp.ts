//
// Schreiben Teil 1 — the Teil-1 KI-Tipp. One single-shot generateContent call,
// never a chat-role API (see useSprechenPartner.ts's architecture note — same
// reasoning applies here). Mirrors useVortragPartner.ts:162-238's KiTipp pair.
//
// The tip never hands back a sentence to write, only a direction. Same
// reasoning as F7 / ADR-0014 for the Vortrag KI-Tipp: keyword-written is not
// point-covered, so the model JUDGES coverage itself from the Beitrag text;
// the Schreibplan's keywords ride along ONLY as an explicitly labelled,
// unreliable hint — never asserted as proof that an unwritten keyword means a
// missing Inhaltspunkt.
//
// `SchreibPlanEntry` is indexed by number (↔ `inhaltspunkte[index]`), unlike
// the Vortragsplan's fixed `GliederungKey` enum, so `planSignals` from
// useVortragCoverage.ts does not fit — the same normalized-substring rule is
// inlined here instead of imported.

import type { SchreibenBeitrag } from '../data/schreiben'
import type { GeminiClient } from './useSprechenGrader'

// ── Unwritten-keyword signal (inlined planSignals-style matching) ─
//
// Same normalisation as useVortragCoverage.ts's matcher, so both agree on
// what "written" means: punctuation stripped, whitespace collapsed, matched
// as a normalized substring.
function normalize(s: string): string {
  return s.replace(/[.,;:!?…]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Plan keywords not yet found (normalized substring) in the Beitrag text. */
function notYetWrittenKeywords(b: SchreibenBeitrag): string[] {
  const hay = normalize(b.textDe)
  return b.plan
    .map(p => p.keyword.trim())
    .filter(keyword => keyword.length > 0)
    .filter(keyword => {
      const needle = normalize(keyword)
      return !(hay.length > 0 && needle.length > 0 && hay.includes(needle))
    })
}

// ── Teil-1 KI-Tipp ──────────────────────────────────────────────────

export const SCHREIBEN_KITIPP_SCHEMA = {
  type: 'object',
  properties: { tippDe: { type: 'string' } },
  required: ['tippDe']
}

export function buildSchreibenKiTippPrompt(b: SchreibenBeitrag): string {
  const notYetSaid = notYetWrittenKeywords(b)
  const stichwortHinweisDe = notYetSaid.length > 0
    ? 'Hinweis, unzuverlässig: folgende geplante Stichwörter sind noch nicht ' +
      `geschrieben: ${notYetSaid.join(', ')} — das beweist NICHT, dass der ` +
      'zugehörige Punkt fehlt, nur dass dieses eine Wort noch nicht geschrieben wurde.'
    : 'Hinweis, unzuverlässig: alle geplanten Stichwörter sind schon geschrieben.'

  const inhaltspunkteListe = b.thema.inhaltspunkte
    .map((p, i) => `${i}. ${p}`)
    .join('\n')
  const textSoFar = b.textDe.slice(-1200)

  return (
    `Aufgabe des Forumsbeitrags: ${b.thema.taskDe}\n` +
    `Die vier Inhaltspunkte des Aufgabenblatts:\n${inhaltspunkteListe}\n` +
    'Beurteile selbst anhand des BEITRAG-BISHER-Texts unten, welche dieser ' +
    `Inhaltspunkte inhaltlich schon abgedeckt sind und welche noch offen sind. ${stichwortHinweisDe}\n\n` +
    `BEITRAG BISHER (letzte 1200 Zeichen):\n${textSoFar}\n\n` +
    'Gib in 1–2 Sätzen (Deutsch, du-Form) einen strategischen Tipp, WELCHEN ' +
    'inhaltlichen Schritt der Lernende als Nächstes machen könnte, um einen noch ' +
    'offenen Inhaltspunkt zu erreichen — z. B. welches Argument er/sie einführen, ' +
    'welchen Gegeneinwand er/sie einräumen oder mit welchem Beispiel er/sie ' +
    'belegen könnte. Formuliere KEINEN fertigen Satz zum Abschreiben, nur die ' +
    'Richtung. Antworte ausschließlich als JSON-Objekt mit genau einem Feld ' +
    '"tippDe", z. B. {"tippDe": "Geh jetzt auf …"} — keine Markdown-Fences.'
  )
}

export async function generateSchreibenKiTipp(
  client: GeminiClient,
  model: string,
  b: SchreibenBeitrag
): Promise<string> {
  const response = await client.models.generateContent({
    model,
    contents: buildSchreibenKiTippPrompt(b),
    config: {
      responseMimeType: 'application/json',
      responseSchema: SCHREIBEN_KITIPP_SCHEMA as unknown as Record<string, unknown>,
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
  // Local-claude fallback: the dev CLI bridge forwards no responseSchema, so
  // the tip may arrive as bare prose instead of {"tippDe": …}.
  if (tipp === null && text.length > 0 && !text.startsWith('{') && !text.startsWith('[')) {
    tipp = text
  }
  if (tipp === null) throw new Error('KI-Tipp returned no usable text')
  return tipp
}
