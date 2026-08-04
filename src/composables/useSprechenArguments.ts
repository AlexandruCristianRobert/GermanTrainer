//
// AI-generated, Dexie-cached argument bank for a single Sprechen Teil 2
// Topic (see src/data/sprechenArguments.ts for the offline fallback layers
// this composable sits ABOVE: cached > topic-specific > per-tag > Gesellschaft).
// Structure mirrors useSprechenTopics.ts: GeminiClient interface, a prompt
// builder that spells out the exact JSON envelope (local-claude drops
// Gemini's responseSchema silently), a strict validator, and a retry loop.

import { db } from '../db'
import type { ArgumentBank, CachedArgumentBank } from '../data/sprechenArguments'
import type { SprechenTopic } from '../data/sprechenTopics'

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

export function buildArgumentBankPrompt(topic: Pick<SprechenTopic, 'titleDe' | 'statementDe'>): string {
  return (
    'Erstelle Vorbereitungsmaterial für die mündliche Goethe-B2-Prüfung, ' +
    'Sprechen Teil 2 (Diskussion), zu genau einem Thema.\n\n' +
    `THEMA: „${topic.titleDe}" — ${topic.statementDe}\n\n` +
    'ANFORDERUNGEN:\n' +
    '- "pro": genau 4 Argumente FÜR die These, jedes mit "claim" ' +
    '(ein kurzer, klarer Aussagesatz, max. ca. 60 Zeichen) und "why" ' +
    '(ein Satz mit Begründung oder konkretem Beispiel, ca. 80-110 Zeichen).\n' +
    '- "contra": genau 4 Argumente GEGEN die These, im gleichen Format.\n' +
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

// ── Validator ────────────────────────────────────────────────────
// Rejects: missing arrays, fewer than 3 pro/contra, fewer than 4 words,
// any empty string, any claim longer than 120 chars.

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function validateAngles(raw: unknown): ArgumentBank['pro'] | null {
  if (!Array.isArray(raw)) return null
  const out: ArgumentBank['pro'] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const a = item as Record<string, unknown>
    if (!isNonEmptyString(a.claim) || !isNonEmptyString(a.why)) return null
    if (a.claim.trim().length > 120) return null
    out.push({ claim: a.claim.trim(), why: a.why.trim() })
  }
  return out
}

function validateWords(raw: unknown): ArgumentBank['words'] | null {
  if (!Array.isArray(raw)) return null
  const out: ArgumentBank['words'] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const w = item as Record<string, unknown>
    if (!isNonEmptyString(w.de) || !isNonEmptyString(w.en)) return null
    out.push({ de: w.de.trim(), en: w.en.trim() })
  }
  return out
}

export function validateArgumentBank(raw: unknown): ArgumentBank | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const pro = validateAngles(r.pro)
  const contra = validateAngles(r.contra)
  const words = validateWords(r.words)
  if (pro === null || contra === null || words === null) return null

  if (pro.length < 3 || contra.length < 3) return null
  if (words.length < 4) return null

  // `phrases` is optional and never fails the bank: a malformed or absent
  // value just means one Wortschatz row instead of two (see ArgumentBank).
  const phrases = validateWords(r.phrases)
  return { pro, contra, words, ...(phrases && phrases.length > 0 ? { phrases } : {}) }
}

// ── Generator call with retries ─────────────────────────────────

export async function generateArgumentBank(
  client: GeminiClient,
  model: string,
  topic: Pick<SprechenTopic, 'titleDe' | 'statementDe'>,
  maxRetries = 2
): Promise<ArgumentBank> {
  const prompt = buildArgumentBankPrompt(topic)
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

  throw new Error(`Argument bank generation for "${topic.titleDe}" produced nothing usable after ${attempts} attempts`)
}

// ── Dexie cache (db.sprechenArgumentBanks, primary key topicId) ──

export async function loadCachedBank(topicId: string): Promise<ArgumentBank | undefined> {
  const row = await db.sprechenArgumentBanks.get(topicId)
  return row?.bank
}

/**
 * Which Topics already have a cached bank. One primary-key scan rather than a
 * `get()` per Topic — the setup screen asks this for the whole pool on mount.
 */
export async function cachedBankIds(): Promise<Set<string>> {
  return new Set(await db.sprechenArgumentBanks.toCollection().primaryKeys())
}

export async function saveCachedBank(topicId: string, bank: ArgumentBank): Promise<void> {
  const row: CachedArgumentBank = { topicId, bank, generatedAt: Date.now() }
  await db.sprechenArgumentBanks.put(row)
}
