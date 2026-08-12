//
// Schreiben Teil 1 — the Schreibthema pool (see CONTEXT.md → "Schreibthema").
// Structural twin of useVortragsthemen.ts, but for Teil 1's forum-post task
// sheets rather than Teil 1 (Sprechen)'s Vortrag task sheets:
//   - 24 seeded Schreibthemen from src/data/schreibenThemen.ts
//   - AI-generated Schreibthemen persisted in
//     localStorage['gt:schreibenCustomThemen']
//   - done-theme memory derived from Run meta via loadHistory() — Schreiben
//     Teil 1 Runs only ('schreiben-teil1'), never any Sprechen run.
//
// Unlike a Vortragsthema (a bare monologue instruction), a Schreibthema is a
// full task sheet: a forum context sentence plus four topic-flavored
// Inhaltspunkte, so `validateGeneratedThema` checks all four fields, not
// just the task instruction.

import {
  SCHREIBEN_THEMEN, SCHREIBEN_TASK_PREFIX, SCHREIBTHEMA_GENERATOR_SCHEMA,
  type Schreibthema
} from '../data/schreibenThemen'
import { TOPIC_TAGS, type TopicTag } from '../data/sprechenTopics'
import { loadHistory } from './useQuizHistory'
import type { GeminiClient } from './useSprechenGrader'

export const CUSTOM_SCHREIBTHEMEN_KEY = 'gt:schreibenCustomThemen'

/** Fixed generation batch size (mirrors THEMEN_PER_GENERATION in useVortragsthemen.ts). */
export const THEMEN_PER_GENERATION = 4

// ── Custom pool (localStorage) ──────────────────────────────────

function isValidStoredThema(raw: unknown): raw is Schreibthema {
  if (!raw || typeof raw !== 'object') return false
  const t = raw as Record<string, unknown>
  return typeof t.id === 'string' && typeof t.titleDe === 'string' &&
    typeof t.forumContextDe === 'string' && typeof t.taskDe === 'string' &&
    Array.isArray(t.inhaltspunkte) && Array.isArray(t.tags)
}

export function loadCustomThemen(): Schreibthema[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(CUSTOM_SCHREIBTHEMEN_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(isValidStoredThema).map(t => ({
      id: t.id,
      titleDe: t.titleDe,
      forumContextDe: t.forumContextDe,
      taskDe: t.taskDe,
      inhaltspunkte: t.inhaltspunkte.filter((x): x is string => typeof x === 'string'),
      tags: t.tags.filter((x): x is TopicTag => (TOPIC_TAGS as readonly string[]).includes(x as string)),
      level: 'B2' as const,
      source: 'custom' as const
    }))
  } catch {
    return []
  }
}

function saveCustomThemen(themen: Schreibthema[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(CUSTOM_SCHREIBTHEMEN_KEY, JSON.stringify(themen))
  } catch { /* ignore quota */ }
}

export function addCustomThemen(themen: Schreibthema[]): void {
  saveCustomThemen([...loadCustomThemen(), ...themen])
}

export function deleteCustomThema(id: string): void {
  saveCustomThemen(loadCustomThemen().filter(t => t.id !== id))
}

export function allThemen(): Schreibthema[] {
  return [...SCHREIBEN_THEMEN, ...loadCustomThemen()]
}

// ── Done-theme memory + draw ────────────────────────────────────

/**
 * Titles of Schreibthemen already graded in a Teil 1 Run. Filters on
 * `e.type === 'schreiben-teil1'` — NOT `-teil2` — reading `e.meta.topicTitle`
 * (deliberately reused, not forked to `themaTitle`; see useQuizHistory.ts).
 */
export function doneThemaTitles(): Set<string> {
  const titles = new Set<string>()
  for (const e of loadHistory()) {
    if (e.type === 'schreiben-teil1' && typeof e.meta.topicTitle === 'string') {
      titles.add(e.meta.topicTitle)
    }
  }
  return titles
}

/**
 * Draw the single Schreibthema the setup screen puts on its task sheet —
 * unlike Sprechen Teil 1's A/B pair, the exam offers no choice here. Prefers
 * a theme with no graded Run yet, falling back to the whole pool once
 * everything has been done. A pool with zero entries is a configuration
 * bug, so it throws rather than silently returning undefined.
 */
export function drawThema(rng: () => number = Math.random): Schreibthema {
  const pool = allThemen()
  const done = doneThemaTitles()
  const undone = pool.filter(t => !done.has(t.titleDe))
  const candidates = undone.length > 0 ? undone : pool
  if (candidates.length === 0) {
    throw new Error('drawThema: no Schreibthemen available')
  }
  return candidates[Math.floor(rng() * candidates.length)]
}

// ── Generator ───────────────────────────────────────────────────

export function validateGeneratedThema(
  raw: unknown
): Pick<Schreibthema, 'titleDe' | 'forumContextDe' | 'taskDe' | 'inhaltspunkte' | 'tags'> | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Record<string, unknown>
  if (typeof t.titleDe !== 'string' || typeof t.forumContextDe !== 'string' || typeof t.taskDe !== 'string') {
    return null
  }
  const titleDe = t.titleDe.trim()
  const forumContextDe = t.forumContextDe.trim()
  const taskDe = t.taskDe.trim()
  if (titleDe.length < 3 || titleDe.length > 45) return null
  if (forumContextDe.length < 30 || forumContextDe.length > 220) return null
  // A Schreibthema's taskDe is the exam's own instruction: it must start
  // with the fixed prefix, name the 150-word floor, and never be phrased as
  // a question — the same shape the seed pool's own test enforces.
  if (!taskDe.startsWith(SCHREIBEN_TASK_PREFIX)) return null
  if (!taskDe.includes('mindestens 150 Wörter')) return null
  if (taskDe.includes('?')) return null
  if (taskDe.length < 60 || taskDe.length > 260) return null
  if (!Array.isArray(t.inhaltspunkte) || t.inhaltspunkte.length !== 4) return null
  const inhaltspunkte: string[] = []
  for (const item of t.inhaltspunkte) {
    if (typeof item !== 'string') return null
    const p = item.trim()
    if (p.length < 15 || p.length > 140) return null
    if (p.includes('?')) return null
    inhaltspunkte.push(p)
  }
  if (new Set(inhaltspunkte).size !== inhaltspunkte.length) return null
  if (!Array.isArray(t.tags)) return null
  const tags = t.tags.filter((x): x is TopicTag => (TOPIC_TAGS as readonly string[]).includes(x as string))
  if (tags.length === 0) return null
  return { titleDe, forumContextDe, taskDe, inhaltspunkte, tags }
}

export function buildThemaGeneratorPrompt(
  existingTitles: string[],
  doneTitles: Set<string>,
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
    `Generiere ${THEMEN_PER_GENERATION} neue Schreibthemen für eine Übung zum ` +
    'Goethe-Zertifikat B2, Schreiben Teil 1 (Forumsbeitrag).\n\n' +
    'ANFORDERUNGEN pro Thema:\n' +
    '- "titleDe": kurzes, eindeutiges Etikett (2–5 Wörter).\n' +
    '- "forumContextDe": genau ein Satz, der das Online-Forum und die ' +
    'Diskussion beschreibt, in der der Beitrag erscheint.\n' +
    `- "taskDe": beginnt IMMER exakt mit "${SCHREIBEN_TASK_PREFIX}" und nennt ` +
    'ausdrücklich "mindestens 150 Wörter" — niemals als Frage formuliert, ' +
    'niemals mit einem Fragezeichen.\n' +
    '- "inhaltspunkte": genau vier themenbezogene Punkte nach diesem Muster ' +
    '(in dieser oder ähnlicher Reihenfolge): (1) eigene Meinung äußern und ' +
    'begründen, (2) Vor- oder Nachteile nennen, (3) von eigenen Erfahrungen ' +
    'berichten, (4) eine Alternative oder eine Gegenmeinung nennen.\n' +
    `- "tags": 1–2 Kategorien, NUR aus dieser Liste: ${TOPIC_TAGS.join(', ')}.\n` +
    `- Bevorzuge in dieser Runde die Kategorien: ${focus.join(', ')}.\n` +
    '- Alltagsnah, meinungsfähig und kontrovers genug für einen ' +
    'Forumsbeitrag — keine Fachdebatten, nichts Verletzendes.\n\n' +
    'VERMEIDE thematische Überschneidung mit diesen bereits vorhandenen oder ' +
    `bereits bearbeiteten Themen:\n${avoid.map(t => `- ${t}`).join('\n')}\n\n` +
    `(Variations-Seed, nicht ausgeben: ${seed}.)\n\n` +
    'Antworte AUSSCHLIESSLICH als JSON-Objekt exakt dieser Form — keine ' +
    'Markdown-Fences, kein zusätzlicher Text: ' +
    '{"themen": [{"titleDe": "…", "forumContextDe": "…", "taskDe": "…", ' +
    '"inhaltspunkte": ["…", "…", "…", "…"], "tags": ["…"]}]}'
  )
}

export async function generateThemen(
  client: GeminiClient,
  model: string,
  maxRetries = 2
): Promise<Schreibthema[]> {
  const existing = allThemen().map(t => t.titleDe)
  const done = doneThemaTitles()
  const seenTitles = new Set(existing.map(t => t.toLowerCase()))
  const accepted: Schreibthema[] = []
  let attempts = 0

  while (accepted.length === 0 && attempts <= maxRetries) {
    attempts++
    const response = await client.models.generateContent({
      model,
      contents: buildThemaGeneratorPrompt(existing, done),
      config: {
        responseMimeType: 'application/json',
        responseSchema: SCHREIBTHEMA_GENERATOR_SCHEMA as unknown as Record<string, unknown>,
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
        id: `wt-custom-${stamp}-${accepted.length}`,
        ...v,
        level: 'B2',
        source: 'custom'
      })
      if (accepted.length >= THEMEN_PER_GENERATION) break
    }
  }

  if (accepted.length === 0) {
    throw new Error(`Schreibthema generation produced no usable themes after ${attempts} attempts`)
  }
  return accepted
}
