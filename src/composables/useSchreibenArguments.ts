//
// AI-generated, Dexie-cached argument bank for a single Schreiben Teil 1
// Schreibthema. Structure mirrors useSprechenArguments.ts exactly: a
// GeminiClient interface, a prompt builder that spells out the exact JSON
// envelope (local-claude drops Gemini's responseSchema silently), the same
// strict validator (reused, not forked — see validateArgumentBank in
// useSprechenArguments.ts), and the same retry loop. Cache sits on
// db.schreibenArgumentBanks, primary key themaId (see
// src/data/schreiben.ts → CachedSchreibArgumentBank, src/db/index.ts).
//
// Unlike the Sprechen bank, this one asks for angles already formulated as
// written argument a Forumsbeitrag could adapt — schriftsprachlich, no
// spoken filler words — since a Schreibthema is a written-register task,
// not a spoken discussion statement.

import { db } from '../db'
import type { ArgumentBank } from '../data/sprechenArguments'
import { validateArgumentBank } from './useSprechenArguments'
import type { CachedSchreibArgumentBank } from '../data/schreiben'
import type { Schreibthema } from '../data/schreibenThemen'

// ── Gemini client shape (matches useSprechenTopics.GeminiClient) ──

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

export function buildSchreibArgumentBankPrompt(thema: Pick<Schreibthema, 'titleDe' | 'taskDe'>): string {
  return (
    'Erstelle Vorbereitungsmaterial für die schriftliche Goethe-B2-Prüfung, ' +
    'Schreiben Teil 1 (Forumsbeitrag), zu genau einem Thema.\n\n' +
    `THEMA: „${thema.titleDe}" — ${thema.taskDe}\n\n` +
    'ANFORDERUNGEN:\n' +
    '- "pro": genau 4 Argumente FÜR die These, jedes mit "claim" ' +
    '(ein kurzer, klarer Aussagesatz, max. ca. 60 Zeichen) und "why" ' +
    '(ein Satz mit Begründung oder konkretem Beispiel, ca. 80-110 Zeichen). ' +
    'Formuliere beide schriftsprachlich, so wie ein Argument in einem ' +
    'Forumsbeitrag stehen könnte — keine mündlichen Füllwörter, keine ' +
    'Umgangssprache.\n' +
    '- "contra": genau 4 Argumente GEGEN die These, im gleichen Format und ' +
    'ebenfalls schriftsprachlich formuliert.\n' +
    '- "words": genau 6 nützliche B2-Vokabeln zum Thema, jede als Objekt ' +
    '{"de": "…", "en": "…"} — "de" IMMER mit Artikel bei Nomen (z. B. ' +
    '"der Fachkräftemangel"), "en" eine natürliche englische Übersetzung.\n' +
    '- "phrases": genau 5 feste Wortverbindungen (Kollokationen) zum Thema, ' +
    'jede als Objekt {"de": "…", "en": "…"} — "de" die feste Wortverbindung ' +
    'inklusive der von ihr geforderten Präposition oder des Kasus, falls ' +
    'relevant (z. B. "auf … angewiesen sein", "in Kauf nehmen"), "en" eine ' +
    'natürliche englische Übersetzung. Keine bloßen Einzelnomen — der Sinn ' +
    'sind Verbindungen aus mehreren Wörtern.\n' +
    '- Alltagsnah, meinungsfähig, B2-Niveau — keine Fachdebatte, nichts Verletzendes.\n' +
    '- Kein Satz darf länger als 120 Zeichen sein.\n\n' +
    'Antworte ausschließlich als JSON-Objekt exakt dieser Form — keine ' +
    'Markdown-Fences: {"pro": [{"claim": "…", "why": "…"}], ' +
    '"contra": [{"claim": "…", "why": "…"}], ' +
    '"words": [{"de": "…", "en": "…"}], ' +
    '"phrases": [{"de": "…", "en": "…"}]}'
  )
}

// ── Generator call with retries ─────────────────────────────────
// Validation is delegated entirely to validateArgumentBank (reused from
// useSprechenArguments.ts, not forked) — the envelope shape is identical.

export async function generateSchreibArgumentBank(
  client: GeminiClient,
  model: string,
  thema: Pick<Schreibthema, 'titleDe' | 'taskDe'>,
  maxRetries = 2
): Promise<ArgumentBank> {
  const prompt = buildSchreibArgumentBankPrompt(thema)
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
    const validated = validateArgumentBank(parsed)
    if (validated === null) continue
    return validated
  }

  throw new Error(`Argument bank generation for "${thema.titleDe}" produced nothing usable after ${attempts} attempts`)
}

// ── Dexie cache (db.schreibenArgumentBanks, primary key themaId) ──

export async function loadCachedSchreibBank(themaId: string): Promise<ArgumentBank | undefined> {
  const row = await db.schreibenArgumentBanks.get(themaId)
  return row?.bank
}

/**
 * Which Schreibthemen already have a cached bank. One primary-key scan
 * rather than a `get()` per Thema — the setup screen asks this for the whole
 * pool on mount (mirrors cachedBankIds in useSprechenArguments.ts).
 */
export async function cachedSchreibBankIds(): Promise<Set<string>> {
  return new Set(await db.schreibenArgumentBanks.toCollection().primaryKeys())
}

export async function saveCachedSchreibBank(themaId: string, bank: ArgumentBank): Promise<void> {
  const row: CachedSchreibArgumentBank = { themaId, bank, generatedAt: Date.now() }
  await db.schreibenArgumentBanks.put(row)
}
