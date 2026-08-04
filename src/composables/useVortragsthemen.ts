//
// Sprechen Teil 1 — the Vortragsthema pool (see CONTEXT.md → "Vortragsthema").
// Structural twin of useSprechenTopics.ts, but for the monologue's task
// sheets rather than the Discussion's controversial statements:
//   - 60 seeded Vortragsthemen from src/data/sprechenVortragsthemen.ts
//   - AI-generated Vortragsthemen persisted in
//     localStorage['gt:sprechenCustomVortragsthemen']
//   - done-theme memory derived from Run meta via loadHistory() — Teil 1
//     Runs only (`sprechen-teil1`), never Teil 2's (ADR-independent, but
//     getting this filter wrong would silently make Teil 1 avoid the wrong
//     subjects).
//
// A Vortragsthema takes no sides — it is the exam's own instruction, not a
// thesis — so `validateGeneratedThema` enforces the `taskDe` shape as
// strictly as the seed pool's own test does.

import {
  SPRECHEN_VORTRAGSTHEMEN, VORTRAGSTHEMA_GENERATOR_SCHEMA,
  type Vortragsthema
} from '../data/sprechenVortragsthemen'
import { TOPIC_TAGS, type TopicTag } from '../data/sprechenTopics'
import { loadHistory } from './useQuizHistory'

export const CUSTOM_VORTRAGSTHEMEN_KEY = 'gt:sprechenCustomVortragsthemen'

/** Fixed generation batch size (mirrors TOPICS_PER_GENERATION — keeps the call cheap). */
export const THEMEN_PER_GENERATION = 5

/** The exam's own opening words. A Vortragsthema is always phrased as this instruction. */
const TASK_PREFIX = 'Halten Sie einen kurzen Vortrag darüber'

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

// ── Custom pool (localStorage) ──────────────────────────────────

function isValidStoredThema(raw: unknown): raw is Vortragsthema {
  if (!raw || typeof raw !== 'object') return false
  const t = raw as Record<string, unknown>
  return typeof t.id === 'string' && typeof t.titleDe === 'string' &&
    typeof t.taskDe === 'string' && Array.isArray(t.tags)
}

export function loadCustomThemen(): Vortragsthema[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(CUSTOM_VORTRAGSTHEMEN_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(isValidStoredThema).map(t => ({
      id: t.id,
      titleDe: t.titleDe,
      taskDe: t.taskDe,
      tags: t.tags.filter((x): x is TopicTag => (TOPIC_TAGS as readonly string[]).includes(x as string)),
      level: 'B2' as const,
      source: 'custom' as const
    }))
  } catch {
    return []
  }
}

function saveCustomThemen(themen: Vortragsthema[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(CUSTOM_VORTRAGSTHEMEN_KEY, JSON.stringify(themen))
  } catch { /* ignore quota */ }
}

export function addCustomThemen(themen: Vortragsthema[]): void {
  saveCustomThemen([...loadCustomThemen(), ...themen])
}

export function deleteCustomThema(id: string): void {
  saveCustomThemen(loadCustomThemen().filter(t => t.id !== id))
}

export function allThemen(): Vortragsthema[] {
  return [...SPRECHEN_VORTRAGSTHEMEN, ...loadCustomThemen()]
}

// ── Done-theme memory + A/B draw ────────────────────────────────

/**
 * Titles of Vortragsthemen already graded in a Teil 1 Run. Filters on
 * `e.type === 'sprechen-teil1'` — NOT `-teil2` — reading `e.meta.topicTitle`
 * (deliberately reused, not forked to `themaTitle`; see useQuizHistory.ts).
 */
export function doneThemaTitles(): Set<string> {
  const titles = new Set<string>()
  for (const e of loadHistory()) {
    if (e.type === 'sprechen-teil1' && typeof e.meta.topicTitle === 'string') {
      titles.add(e.meta.topicTitle)
    }
  }
  return titles
}

/**
 * Draw the two Vortragsthemen the setup screen puts on its A/B task sheets.
 * Prefers themes with no graded Vortrag yet, falling back to the whole pool
 * once everything has been done. Never returns the same theme twice — a
 * pool with fewer than two entries is a configuration bug, so it throws
 * rather than silently duplicating.
 */
export function drawThemaPair(rng: () => number = Math.random): [Vortragsthema, Vortragsthema] {
  const pool = allThemen()
  const done = doneThemaTitles()
  const undone = pool.filter(t => !done.has(t.titleDe))
  const candidates = undone.length >= 2 ? undone : pool
  if (candidates.length < 2) {
    throw new Error('drawThemaPair: fewer than two Vortragsthemen available')
  }
  const i = Math.floor(rng() * candidates.length)
  let j = (i + 1 + Math.floor(rng() * (candidates.length - 1))) % candidates.length
  if (j === i) j = (j + 1) % candidates.length
  return [candidates[i], candidates[j]]
}

// ── Generator ───────────────────────────────────────────────────

export function validateGeneratedThema(
  raw: unknown
): Pick<Vortragsthema, 'titleDe' | 'taskDe' | 'tags'> | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Record<string, unknown>
  if (typeof t.titleDe !== 'string' || typeof t.taskDe !== 'string') return null
  const titleDe = t.titleDe.trim()
  const taskDe = t.taskDe.trim()
  if (titleDe.length < 3 || titleDe.length > 45) return null
  if (taskDe.length < 60 || taskDe.length > 220) return null
  // A Vortragsthema takes no sides: it is the exam's task-sheet instruction,
  // never a thesis or a direct question. This is the single easiest thing
  // to get wrong when porting Teil 2's shape, so it is enforced strictly.
  if (!taskDe.startsWith(TASK_PREFIX)) return null
  if (taskDe.includes('?')) return null
  if (!Array.isArray(t.tags)) return null
  const tags = t.tags.filter((x): x is TopicTag => (TOPIC_TAGS as readonly string[]).includes(x as string))
  if (tags.length === 0) return null
  return { titleDe, taskDe, tags }
}

export function buildThemaGeneratorPrompt(
  existingTitles: string[],
  doneTitles: string[],
  rng: () => number = Math.random
): string {
  const tagPool = [...TOPIC_TAGS]
  const focus: string[] = []
  for (let i = 0; i < 4; i++) {
    focus.push(tagPool.splice(Math.floor(rng() * tagPool.length), 1)[0])
  }
  const seed = Math.floor(rng() * 1_000_000).toString(36)
  const avoid = [...new Set([...existingTitles, ...doneTitles])]
  return (
    `Generiere ${THEMEN_PER_GENERATION} neue Vortragsthemen für eine Übung zum ` +
    'Goethe-Zertifikat B2, Sprechen Teil 1 (Vortrag).\n\n' +
    'WICHTIG: Ein Vortragsthema ist KEIN Diskussionsthema. Teil 1 ist ein ' +
    'Monolog — es gibt niemanden, der widerspricht. Die Aufgabe darf daher ' +
    'NIEMALS als Frage oder als steile These formuliert sein (kein "Sollte …?", ' +
    'kein "Ist … richtig?"). Sie muss stattdessen eine ANWEISUNG des ' +
    'Aufgabenblatts sein.\n\n' +
    'ANFORDERUNGEN pro Thema:\n' +
    '- "titleDe": kurzes, eindeutiges Etikett (2–5 Wörter).\n' +
    `- "taskDe": beginnt IMMER exakt mit "${TASK_PREFIX}" und endet mit einem ` +
    'indirekten Fragewort oder einer Nominalphrase (wie …, warum …, welche ' +
    'Rolle …, was … bedeutet, wovon … abhängt) — niemals mit einem ' +
    'Fragezeichen, niemals als direkte Ja/Nein-Frage.\n' +
    `- "tags": 1–2 Kategorien, NUR aus dieser Liste: ${TOPIC_TAGS.join(', ')}.\n` +
    `- Bevorzuge in dieser Runde die Kategorien: ${focus.join(', ')}.\n` +
    '- Alltagsnah, meinungsfähig und für alle fünf Gliederungspunkte ' +
    '(Einstieg, Situation, Vor- und Nachteile, eigene Erfahrung, Meinung) ' +
    'füllbar — keine Fachdebatten, nichts Verletzendes.\n\n' +
    'VERMEIDE thematische Überschneidung mit diesen bereits vorhandenen oder ' +
    `bereits gehaltenen Themen:\n${avoid.map(t => `- ${t}`).join('\n')}\n\n` +
    `(Variations-Seed, nicht ausgeben: ${seed}.)\n\n` +
    'Antworte AUSSCHLIESSLICH als JSON-Objekt exakt dieser Form — keine ' +
    'Markdown-Fences, kein zusätzlicher Text: ' +
    '{"themen": [{"titleDe": "…", "taskDe": "…", "tags": ["…"]}]}'
  )
}

export async function generateThemen(
  client: GeminiClient,
  model: string,
  maxRetries = 2
): Promise<Vortragsthema[]> {
  const existing = allThemen().map(t => t.titleDe)
  const done = [...doneThemaTitles()]
  const seenTitles = new Set(existing.map(t => t.toLowerCase()))
  const accepted: Vortragsthema[] = []
  let attempts = 0

  while (accepted.length === 0 && attempts <= maxRetries) {
    attempts++
    const response = await client.models.generateContent({
      model,
      contents: buildThemaGeneratorPrompt(existing, done),
      config: {
        responseMimeType: 'application/json',
        responseSchema: VORTRAGSTHEMA_GENERATOR_SCHEMA as unknown as Record<string, unknown>,
        temperature: 0.85,
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
    const themen = (parsed as { themen?: unknown[] }).themen
    if (!Array.isArray(themen)) continue
    const stamp = Date.now()
    for (const raw of themen) {
      const v = validateGeneratedThema(raw)
      if (v === null) continue
      if (seenTitles.has(v.titleDe.toLowerCase())) continue
      seenTitles.add(v.titleDe.toLowerCase())
      accepted.push({
        id: `vt-custom-${stamp}-${accepted.length}`,
        ...v,
        level: 'B2',
        source: 'custom'
      })
      if (accepted.length >= THEMEN_PER_GENERATION) break
    }
  }

  if (accepted.length === 0) {
    throw new Error(`Vortragsthema generation produced no usable themes after ${attempts} attempts`)
  }
  return accepted
}
