//
// Topic pool for Sprechen Teil 2 (see CONTEXT.md → "Topic"):
//   - 100 seeded Topics from src/data/sprechenTopics.ts
//   - AI-generated Topics persisted in localStorage['gt:sprechenCustomTopics']
//   - done-Topic memory derived from Run meta via loadHistory() — this keeps
//     working unchanged when history moves to Supabase (ADR-0005/0006).

import {
  SPRECHEN_TOPICS, TOPIC_GENERATOR_SCHEMA, TOPIC_TAGS,
  type SprechenTopic, type TopicTag
} from '../data/sprechenTopics'
import { loadHistory } from './useQuizHistory'

export const CUSTOM_TOPICS_KEY = 'gt:sprechenCustomTopics'

/** Fixed generation batch size (spec decision — keeps the call cheap). */
export const TOPICS_PER_GENERATION = 5

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

function isValidStoredTopic(raw: unknown): raw is SprechenTopic {
  if (!raw || typeof raw !== 'object') return false
  const t = raw as Record<string, unknown>
  return typeof t.id === 'string' && typeof t.titleDe === 'string' &&
    typeof t.statementDe === 'string' && Array.isArray(t.tags)
}

export function loadCustomTopics(): SprechenTopic[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(CUSTOM_TOPICS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(isValidStoredTopic).map(t => ({
      id: t.id,
      titleDe: t.titleDe,
      statementDe: t.statementDe,
      tags: t.tags.filter((x): x is TopicTag => (TOPIC_TAGS as readonly string[]).includes(x as string)),
      level: 'B2' as const,
      source: 'custom' as const
    }))
  } catch {
    return []
  }
}

function saveCustomTopics(topics: SprechenTopic[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(CUSTOM_TOPICS_KEY, JSON.stringify(topics))
  } catch { /* ignore quota */ }
}

export function addCustomTopics(topics: SprechenTopic[]): void {
  saveCustomTopics([...loadCustomTopics(), ...topics])
}

export function deleteCustomTopic(id: string): void {
  saveCustomTopics(loadCustomTopics().filter(t => t.id !== id))
}

export function allTopics(): SprechenTopic[] {
  return [...SPRECHEN_TOPICS, ...loadCustomTopics()]
}

// ── Done-topic memory + random picker ───────────────────────────

export function doneTopicTitles(): Set<string> {
  const titles = new Set<string>()
  for (const e of loadHistory()) {
    if (e.type === 'sprechen-teil2' && typeof e.meta.topicTitle === 'string') {
      titles.add(e.meta.topicTitle)
    }
  }
  return titles
}

/** Random Topic, preferring ones not yet discussed; falls back to the full pool. */
export function pickRandomTopic(rng: () => number = Math.random): SprechenTopic {
  const pool = allTopics()
  const done = doneTopicTitles()
  const undone = pool.filter(t => !done.has(t.titleDe))
  const candidates = undone.length > 0 ? undone : pool
  return candidates[Math.floor(rng() * candidates.length)]
}

// ── Generator ───────────────────────────────────────────────────

export function validateGeneratedTopic(
  raw: unknown
): Pick<SprechenTopic, 'titleDe' | 'statementDe' | 'tags'> | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Record<string, unknown>
  if (typeof t.titleDe !== 'string' || typeof t.statementDe !== 'string') return null
  const titleDe = t.titleDe.trim()
  const statementDe = t.statementDe.trim()
  if (titleDe.length < 3 || titleDe.length > 60) return null
  if (statementDe.length < 15 || statementDe.length > 200) return null
  if (!Array.isArray(t.tags)) return null
  const tags = t.tags.filter((x): x is TopicTag => (TOPIC_TAGS as readonly string[]).includes(x as string))
  if (tags.length === 0) return null
  return { titleDe, statementDe, tags }
}

export function buildTopicGeneratorPrompt(
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
    `Generiere ${TOPICS_PER_GENERATION} neue Diskussionsthemen für eine Übung zum ` +
    'Goethe-Zertifikat B2, Sprechen Teil 2 (Diskussion).\n\n' +
    'ANFORDERUNGEN pro Thema:\n' +
    '- "titleDe": kurzes, eindeutiges Etikett (2–5 Wörter).\n' +
    '- "statementDe": EINE kontroverse Frage oder These auf B2-Niveau, über die ' +
    'zwei Personen ~5 Minuten pro und contra diskutieren können.\n' +
    `- "tags": 1–2 Kategorien, NUR aus dieser Liste: ${TOPIC_TAGS.join(', ')}.\n` +
    `- Bevorzuge in dieser Runde die Kategorien: ${focus.join(', ')}.\n` +
    '- Alltagsnah und meinungsfähig — keine Fachdebatten, nichts Verletzendes.\n\n' +
    'VERMEIDE thematische Überschneidung mit diesen bereits vorhandenen oder ' +
    `bereits diskutierten Themen:\n${avoid.map(t => `- ${t}`).join('\n')}\n\n` +
    `(Variations-Seed, nicht ausgeben: ${seed}.)\n` +
    'Antworte ausschließlich als JSON-Objekt exakt dieser Form — keine ' +
    'Markdown-Fences: {"topics": [{"titleDe": "…", "statementDe": "…", ' +
    '"tags": ["…"]}]}'
  )
}

export async function generateTopics(
  client: GeminiClient,
  model: string,
  maxRetries = 2
): Promise<SprechenTopic[]> {
  const existing = allTopics().map(t => t.titleDe)
  const done = [...doneTopicTitles()]
  const seenTitles = new Set(existing.map(t => t.toLowerCase()))
  const accepted: SprechenTopic[] = []
  let attempts = 0

  while (accepted.length === 0 && attempts <= maxRetries) {
    attempts++
    const response = await client.models.generateContent({
      model,
      contents: buildTopicGeneratorPrompt(existing, done),
      config: {
        responseMimeType: 'application/json',
        responseSchema: TOPIC_GENERATOR_SCHEMA as unknown as Record<string, unknown>,
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
    const topics = (parsed as { topics?: unknown[] }).topics
    if (!Array.isArray(topics)) continue
    const stamp = Date.now()
    for (const raw of topics) {
      const v = validateGeneratedTopic(raw)
      if (v === null) continue
      if (seenTitles.has(v.titleDe.toLowerCase())) continue
      seenTitles.add(v.titleDe.toLowerCase())
      accepted.push({
        id: `st-custom-${stamp}-${accepted.length}`,
        ...v,
        level: 'B2',
        source: 'custom'
      })
      if (accepted.length >= TOPICS_PER_GENERATION) break
    }
  }

  if (accepted.length === 0) {
    throw new Error(`Topic generation produced no usable topics after ${attempts} attempts`)
  }
  return accepted
}
