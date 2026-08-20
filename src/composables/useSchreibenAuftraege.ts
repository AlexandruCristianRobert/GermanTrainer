//
// Schreiben Teil 2 — the Schreibauftrag pool (see CONTEXT.md → "Schreibauftrag").
// Structural twin of useSchreibenThemen.ts (Teil 1's Schreibthema pool), but
// for Teil 2's situational message task rather than Teil 1's forum-post task:
//   - 40 seeded Aufträge from src/data/schreibenAuftraege.ts
//   - AI-generated Aufträge persisted in
//     localStorage['gt:schreibenCustomAuftraege']
//   - done-auftrag memory derived from Run meta via loadHistory() — Schreiben
//     Teil 2 Runs only ('schreiben-teil2'), never any Sprechen run.
//
// Unlike a Schreibthema (which pairs a forum context with topic-flavored
// Inhaltspunkte), a Schreibauftrag additionally carries an Empfänger (name +
// role — what the Anrede must fit) and exactly one Schreibanlass, the
// communicative occasion the Setup screen can filter by (ADR-0023).

import {
  SCHREIBEN_AUFTRAEGE, SCHREIB_ANLAESSE, ANLASS_LABEL, NACHRICHT_TASK_PREFIX,
  SCHREIBAUFTRAG_GENERATOR_SCHEMA, type Schreibauftrag, type SchreibAnlass
} from '../data/schreibenAuftraege'
import { loadHistory } from './useQuizHistory'
import type { GeminiClient } from './useSprechenGrader'

export const CUSTOM_AUFTRAEGE_KEY = 'gt:schreibenCustomAuftraege'

/** Fixed generation batch size — one per Schreibanlass (mirrors THEMEN_PER_GENERATION in useSchreibenThemen.ts). */
export const AUFTRAEGE_PER_GENERATION = 5

// ── Custom pool (localStorage) ──────────────────────────────────

function isValidStoredAuftrag(raw: unknown): raw is Schreibauftrag {
  if (!raw || typeof raw !== 'object') return false
  const a = raw as Record<string, unknown>
  return typeof a.id === 'string' && typeof a.titleDe === 'string' &&
    typeof a.situationDe === 'string' && typeof a.empfaengerName === 'string' &&
    typeof a.empfaengerRolleDe === 'string' && typeof a.taskDe === 'string' &&
    Array.isArray(a.inhaltspunkte) && typeof a.anlass === 'string'
}

export function loadCustomAuftraege(): Schreibauftrag[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(CUSTOM_AUFTRAEGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(isValidStoredAuftrag)
      .filter(a => (SCHREIB_ANLAESSE as readonly string[]).includes(a.anlass))
      .map(a => ({
        id: a.id,
        titleDe: a.titleDe,
        situationDe: a.situationDe,
        empfaengerName: a.empfaengerName,
        empfaengerRolleDe: a.empfaengerRolleDe,
        taskDe: a.taskDe,
        inhaltspunkte: a.inhaltspunkte.filter((x): x is string => typeof x === 'string'),
        anlass: a.anlass as SchreibAnlass,
        level: 'B2' as const,
        source: 'custom' as const
      }))
  } catch {
    return []
  }
}

function saveCustomAuftraege(auftraege: Schreibauftrag[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(CUSTOM_AUFTRAEGE_KEY, JSON.stringify(auftraege))
  } catch { /* ignore quota */ }
}

export function addCustomAuftraege(auftraege: Schreibauftrag[]): void {
  saveCustomAuftraege([...loadCustomAuftraege(), ...auftraege])
}

export function deleteCustomAuftrag(id: string): void {
  saveCustomAuftraege(loadCustomAuftraege().filter(a => a.id !== id))
}

export function allAuftraege(): Schreibauftrag[] {
  return [...SCHREIBEN_AUFTRAEGE, ...loadCustomAuftraege()]
}

// ── Done-auftrag memory + draw ───────────────────────────────────

/**
 * Titles of Schreibaufträge already graded in a Teil 2 Run. Filters on
 * `e.type === 'schreiben-teil2'` — NOT `-teil1` — reading `e.meta.topicTitle`
 * (deliberately reused, not forked to `auftragTitle`; see useQuizHistory.ts).
 */
export function doneAuftragTitles(): Set<string> {
  const titles = new Set<string>()
  for (const e of loadHistory()) {
    if (e.type === 'schreiben-teil2' && typeof e.meta.topicTitle === 'string') {
      titles.add(e.meta.topicTitle)
    }
  }
  return titles
}

/**
 * Draw the single Schreibauftrag the setup screen puts on its task sheet.
 * When an Anlass is given, filter the pool to it first — falling back to the
 * whole pool if that filter empties it, since a custom-only pool may lack an
 * Anlass entirely. Prefers an Auftrag with no graded Run yet, falling back to
 * the (possibly Anlass-filtered) pool once everything has been done.
 */
export function drawAuftrag(
  anlass: SchreibAnlass | null = null,
  rng: () => number = Math.random
): Schreibauftrag {
  const all = allAuftraege()
  const filtered = anlass ? all.filter(a => a.anlass === anlass) : all
  const pool = filtered.length > 0 ? filtered : all
  if (pool.length === 0) {
    throw new Error('drawAuftrag: no Schreibaufträge available')
  }
  const done = doneAuftragTitles()
  const undone = pool.filter(a => !done.has(a.titleDe))
  const candidates = undone.length > 0 ? undone : pool
  return candidates[Math.floor(rng() * candidates.length)]
}

// ── Generator ───────────────────────────────────────────────────

export function validateGeneratedAuftrag(
  raw: unknown
): Omit<Schreibauftrag, 'id' | 'level' | 'source'> | null {
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  if (typeof a.titleDe !== 'string' || typeof a.situationDe !== 'string' ||
    typeof a.empfaengerName !== 'string' || typeof a.empfaengerRolleDe !== 'string' ||
    typeof a.taskDe !== 'string') {
    return null
  }
  const titleDe = a.titleDe.trim()
  const situationDe = a.situationDe.trim()
  const empfaengerName = a.empfaengerName.trim()
  const empfaengerRolleDe = a.empfaengerRolleDe.trim()
  const taskDe = a.taskDe.trim()
  if (titleDe.length < 3 || titleDe.length > 45) return null
  if (situationDe.length < 40 || situationDe.length > 300) return null
  if (!/^(Frau|Herr) [A-ZÄÖÜ]/.test(empfaengerName)) return null
  if (empfaengerRolleDe.length < 4 || empfaengerRolleDe.length > 60) return null
  // A Schreibauftrag's taskDe is the exam's own instruction: it must start
  // with the fixed prefix, name the 100-word floor, and mention the
  // Empfänger's surname — German inflects the full name in context (e.g.
  // "an Herrn Semder"), so only the last whitespace token is checked.
  if (!taskDe.startsWith(NACHRICHT_TASK_PREFIX)) return null
  if (!taskDe.includes('mindestens 100 Wörter')) return null
  const surname = empfaengerName.split(/\s+/).pop() ?? ''
  if (!surname || !taskDe.includes(surname)) return null
  if (taskDe.includes('?')) return null
  if (taskDe.length < 60 || taskDe.length > 280) return null
  if (!Array.isArray(a.inhaltspunkte) || a.inhaltspunkte.length !== 4) return null
  const inhaltspunkte: string[] = []
  for (const item of a.inhaltspunkte) {
    if (typeof item !== 'string') return null
    const p = item.trim()
    if (p.length < 15 || p.length > 140) return null
    if (p.includes('?')) return null
    if (!p.endsWith('.')) return null
    inhaltspunkte.push(p)
  }
  if (new Set(inhaltspunkte).size !== inhaltspunkte.length) return null
  if (typeof a.anlass !== 'string' || !(SCHREIB_ANLAESSE as readonly string[]).includes(a.anlass)) return null
  const anlass = a.anlass as SchreibAnlass
  return { titleDe, situationDe, empfaengerName, empfaengerRolleDe, taskDe, inhaltspunkte, anlass }
}

export function buildAuftragGeneratorPrompt(
  existingTitles: string[],
  doneTitles: Set<string>,
  rng: () => number = Math.random
): string {
  const anlassList = SCHREIB_ANLAESSE
    .map(a => `${a} (${ANLASS_LABEL[a].de})`)
    .join(', ')
  const seed = Math.floor(rng() * 1_000_000).toString(36)
  const avoid = [...new Set([...existingTitles, ...doneTitles])]
  return (
    `Generiere genau ${AUFTRAEGE_PER_GENERATION} neue Schreibaufträge für eine ` +
    'Übung zum Goethe-Zertifikat B2, Schreiben Teil 2 (Nachricht) — einen pro ' +
    `Schreibanlass, in genau dieser Reihenfolge: ${anlassList}.\n\n` +
    'ANFORDERUNGEN pro Auftrag:\n' +
    '- "titleDe": kurzes, eindeutiges Etikett (2–5 Wörter).\n' +
    '- "situationDe": ein bis zwei Sätze, die eine berufliche oder ' +
    'kursbezogene Situation aus dem Alltag beschreiben, die den Anlass ' +
    'auslöst.\n' +
    '- "empfaengerName": "Frau …" oder "Herr …" mit einem deutschen ' +
    'Nachnamen.\n' +
    '- "empfaengerRolleDe": die Rolle des Empfängers, z. B. "Ihre ' +
    'Vorgesetzte" oder "Ihr Kursleiter".\n' +
    `- "taskDe": beginnt IMMER exakt mit "${NACHRICHT_TASK_PREFIX}" und nennt ` +
    'ausdrücklich "mindestens 100 Wörter" sowie den Nachnamen des ' +
    'Empfängers — niemals als Frage formuliert, niemals mit einem ' +
    'Fragezeichen — nennt dabei zuerst die Rolle und dann den Namen, nach ' +
    'dem Muster "… an Ihre Teamleiterin, Frau Steiner."\n' +
    '- "inhaltspunkte": genau vier situationsbezogene Punkte nach diesem ' +
    'Muster: (1) Bezug auf die Situation nehmen und das Anliegen nennen, ' +
    '(2) den Grund erklären, (3) eine Bitte, einen Vorschlag oder eine ' +
    'Forderung äußern, (4) einen Ausblick geben oder um Rückmeldung bitten. ' +
    'Jeder Punkt ist ein vollständiger Imperativsatz mit "Sie" und endet ' +
    'mit einem Punkt.\n' +
    '- "anlass": exakt einer der Werte ' +
    `${SCHREIB_ANLAESSE.map(a => `"${a}"`).join(', ')} — pro Auftrag ein ` +
    'anderer, sodass alle fünf Anlässe genau einmal vorkommen.\n' +
    '- Alltagsnah und realistisch für einen Beruf oder einen Deutschkurs — ' +
    'keine Fachdebatten, nichts Verletzendes.\n\n' +
    'VERMEIDE thematische Überschneidung mit diesen bereits vorhandenen oder ' +
    `bereits bearbeiteten Aufträgen:\n${avoid.map(t => `- ${t}`).join('\n')}\n\n` +
    `(Variations-Seed, nicht ausgeben: ${seed}.)\n\n` +
    'Antworte AUSSCHLIESSLICH als JSON-Objekt exakt dieser Form — keine ' +
    'Markdown-Fences, kein zusätzlicher Text: ' +
    '{"auftraege": [{"titleDe": "…", "situationDe": "…", "empfaengerName": ' +
    '"Frau …", "empfaengerRolleDe": "…", "taskDe": "…", "inhaltspunkte": ' +
    '["…", "…", "…", "…"], "anlass": "…"}]}'
  )
}

export async function generateAuftraege(
  client: GeminiClient,
  model: string,
  maxRetries = 2
): Promise<Schreibauftrag[]> {
  const existing = allAuftraege().map(a => a.titleDe)
  const done = doneAuftragTitles()
  const seenTitles = new Set(existing.map(t => t.toLowerCase()))
  const accepted: Schreibauftrag[] = []
  let attempts = 0

  while (accepted.length === 0 && attempts <= maxRetries) {
    attempts++
    const response = await client.models.generateContent({
      model,
      contents: buildAuftragGeneratorPrompt(existing, done),
      config: {
        responseMimeType: 'application/json',
        responseSchema: SCHREIBAUFTRAG_GENERATOR_SCHEMA as unknown as Record<string, unknown>,
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
    const auftraege = (parsed as { auftraege?: unknown[] }).auftraege
    if (!Array.isArray(auftraege)) continue
    const stamp = Date.now()
    for (const raw of auftraege) {
      const v = validateGeneratedAuftrag(raw)
      if (v === null) continue
      if (seenTitles.has(v.titleDe.toLowerCase())) continue
      seenTitles.add(v.titleDe.toLowerCase())
      accepted.push({
        id: `wa-custom-${stamp}-${accepted.length}`,
        ...v,
        level: 'B2',
        source: 'custom'
      })
      if (accepted.length >= AUFTRAEGE_PER_GENERATION) break
    }
  }

  if (accepted.length === 0) {
    throw new Error(`Schreibauftrag generation produced no usable Aufträge after ${attempts} attempts`)
  }
  return accepted
}
