//
// AI-generated, Dexie-cached Inhalts-Baukasten for a single Schreiben Teil 2
// Schreibauftrag. Structure mirrors useSchreibenArguments.ts exactly: a
// GeminiClient interface, a prompt builder that spells out the exact JSON
// envelope (local-claude drops Gemini's responseSchema silently), the same
// client settings and retry loop shape. Cache sits on db.schreibenBaukaesten,
// primary key auftragId (see src/data/schreibenNachricht.ts →
// CachedNachrichtBaukasten, src/db/index.ts).
//
// Unlike the argument banks (pro/contra angles for a controversial Thema),
// the Baukasten offers Gründe (why the writer is in this situation) and
// Lösungen (what the Nachricht could propose) — an Auftrag is situational,
// not argumentative (see schreibenAuftraege.ts header).

import { db } from '../db'
import type { NachrichtBaukasten, CachedNachrichtBaukasten, BaukastenIdee } from '../data/schreibenNachricht'
import type { Schreibauftrag } from '../data/schreibenAuftraege'

// ── Gemini client shape (matches useSchreibenArguments.GeminiClient) ──

export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

// ── Prompt builder ───────────────────────────────────────────────

export function buildBaukastenPrompt(
  auftrag: Pick<Schreibauftrag, 'titleDe' | 'situationDe' | 'taskDe' | 'anlass'>
): string {
  return (
    'Erstelle Vorbereitungsmaterial für die schriftliche Goethe-B2-Prüfung, ' +
    'Schreiben Teil 2 (Nachricht), zu genau einem Schreibauftrag.\n\n' +
    `AUFTRAG: „${auftrag.titleDe}"\n` +
    `SITUATION: ${auftrag.situationDe}\n` +
    `AUFGABE: ${auftrag.taskDe}\n` +
    `ANLASS: ${auftrag.anlass}\n\n` +
    'ANFORDERUNGEN:\n' +
    '- "gruende": 3-4 plausible Gründe, warum der Schreiber/die Schreiberin ' +
    'genau in dieser Situation ist bzw. warum er/sie nicht teilnehmen kann ' +
    'oder diese Bitte/Beschwerde/diesen Vorschlag hat — jeder als Objekt ' +
    '{"ideaDe": "…", "noteEn": "…"}, "ideaDe" ein kurzer deutscher Stichpunkt ' +
    '(max. ca. 120 Zeichen), "noteEn" eine kurze englische Erklärung.\n' +
    '- "loesungen": 3-4 konkrete Lösungs- oder Vorschlagideen, die die ' +
    'Nachricht anbieten könnte, im gleichen Format {"ideaDe": "…", "noteEn": "…"}.\n' +
    '- "words": genau 6 nützliche B2-Vokabeln zum Thema der Situation, jede ' +
    'als Objekt {"de": "…", "en": "…"} — "de" IMMER mit Artikel bei Nomen ' +
    '(z. B. "die Erreichbarkeit"), "en" eine natürliche englische Übersetzung.\n' +
    '- Alltagsnah, B2-Niveau, passend zur Situation des Auftrags.\n\n' +
    'Antworte ausschließlich als JSON-Objekt exakt dieser Form — keine ' +
    'Markdown-Fences: {"gruende": [{"ideaDe": "…", "noteEn": "…"}], ' +
    '"loesungen": [{"ideaDe": "…", "noteEn": "…"}], ' +
    '"words": [{"de": "…", "en": "…"}]}'
  )
}

// ── Validator ────────────────────────────────────────────────────
// Rejects: missing arrays, fewer than 3 or more than 4 gruende/loesungen,
// any empty ideaDe/noteEn, ideaDe over 120 chars, words count != 6, any
// word missing a der/die/das article.

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function validateIdeen(raw: unknown): BaukastenIdee[] | null {
  if (!Array.isArray(raw)) return null
  const out: BaukastenIdee[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const i = item as Record<string, unknown>
    if (!isNonEmptyString(i.ideaDe) || !isNonEmptyString(i.noteEn)) return null
    const ideaDe = i.ideaDe.trim()
    if (ideaDe.length > 120) return null
    out.push({ ideaDe, noteEn: i.noteEn.trim() })
  }
  return out
}

function validateWords(raw: unknown): NachrichtBaukasten['words'] | null {
  if (!Array.isArray(raw)) return null
  const out: NachrichtBaukasten['words'] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const w = item as Record<string, unknown>
    if (!isNonEmptyString(w.de) || !isNonEmptyString(w.en)) return null
    const de = w.de.trim()
    if (!/^(der|die|das)\s/.test(de)) return null
    out.push({ de, en: w.en.trim() })
  }
  return out
}

export function validateBaukasten(raw: unknown): NachrichtBaukasten | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const gruende = validateIdeen(r.gruende)
  const loesungen = validateIdeen(r.loesungen)
  const words = validateWords(r.words)
  if (gruende === null || loesungen === null || words === null) return null

  if (gruende.length < 3 || gruende.length > 4) return null
  if (loesungen.length < 3 || loesungen.length > 4) return null
  if (words.length !== 6) return null

  return { gruende, loesungen, words }
}

// ── Generator call with retries ─────────────────────────────────

export async function generateBaukasten(
  client: GeminiClient,
  model: string,
  auftrag: Pick<Schreibauftrag, 'titleDe' | 'situationDe' | 'taskDe' | 'anlass'>,
  maxRetries = 2
): Promise<NachrichtBaukasten> {
  const prompt = buildBaukastenPrompt(auftrag)
  let attempts = 0

  while (attempts <= maxRetries) {
    attempts++
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        topP: 0.95
      }
    })
    const text = response.text ?? ''
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      continue
    }
    const validated = validateBaukasten(parsed)
    if (validated === null) continue
    return validated
  }

  throw new Error(`Baukasten generation for "${auftrag.titleDe}" produced nothing usable after ${attempts} attempts`)
}

// ── Dexie cache (db.schreibenBaukaesten, primary key auftragId) ──

export async function loadCachedBaukasten(auftragId: string): Promise<NachrichtBaukasten | undefined> {
  const row = await db.schreibenBaukaesten.get(auftragId)
  return row?.bank
}

export async function saveCachedBaukasten(auftragId: string, bank: NachrichtBaukasten): Promise<void> {
  const row: CachedNachrichtBaukasten = { auftragId, bank, generatedAt: Date.now() }
  await db.schreibenBaukaesten.put(row)
}
