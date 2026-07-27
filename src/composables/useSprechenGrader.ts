//
// Post-Discussion analysis (writing-grader pattern): one temperature-0 call,
// strict validator, per-turn quote re-anchoring. The result is NEVER persisted
// to Dexie — it flows to sessionStorage['gt:lastSprechenResult'] for the
// one-time result page, and only summary fields reach Run meta.

import { SPRECHEN_B2_TEIL2, praedikat, type Praedikat } from '../data/rubrics'
import type { DiscussionTurn, SprechenDiscussion } from '../data/sprechen'
import { learnerTurnCount } from '../data/sprechen'
import type { SprechenErrorTag } from './useQuizHistory'

// ── Result types ─────────────────────────────────────────────────

export interface SprechenMistake {
  turnIndex: number          // index into the LEARNER-turn list (0-based)
  quote: string              // verbatim from that learner turn
  suggested: string
  kind: SprechenErrorTag     // exactly one per mistake (see CONTEXT.md)
  reasonDe: string
  reasonEn: string
  spanStart: number          // char offsets within that learner turn's textDe
  spanEnd: number
}

export interface SprechenCriterionScore {
  key: string
  labelDe: string
  maxPoints: number
  score: number
  justificationDe: string
  justificationEn: string
}

export interface BilingualNote { de: string; en: string }

export interface SprechenGradeResult {
  totalScore: number
  passes: boolean
  praedikat: Praedikat       // computed locally from totalScore, never trusted from the model
  criteria: SprechenCriterionScore[]
  mistakes: SprechenMistake[]
  strengths: BilingualNote[]
  weaknesses: BilingualNote[]
  overallDe: string
  overallEn: string
  generatedAt: number
  modelUsed: string
}

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

export class SprechenGraderError extends Error {
  constructor(message: string, public readonly attempts: number) {
    super(message)
    this.name = 'SprechenGraderError'
  }
}

// ── Schema ───────────────────────────────────────────────────────

export const SPRECHEN_GRADE_SCHEMA = {
  type: 'object',
  properties: {
    totalScore: { type: 'number' },
    passes: { type: 'boolean' },
    criteria: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          score: { type: 'number' },
          justificationDe: { type: 'string' },
          justificationEn: { type: 'string' }
        },
        required: ['key', 'score', 'justificationDe', 'justificationEn']
      }
    },
    mistakes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          turnIndex: { type: 'number' },
          quote: { type: 'string' },
          suggested: { type: 'string' },
          kind: { type: 'string' },
          reasonDe: { type: 'string' },
          reasonEn: { type: 'string' }
        },
        required: ['turnIndex', 'quote', 'suggested', 'kind', 'reasonDe', 'reasonEn']
      }
    },
    strengths: {
      type: 'array',
      items: {
        type: 'object',
        properties: { de: { type: 'string' }, en: { type: 'string' } },
        required: ['de', 'en']
      }
    },
    weaknesses: {
      type: 'array',
      items: {
        type: 'object',
        properties: { de: { type: 'string' }, en: { type: 'string' } },
        required: ['de', 'en']
      }
    },
    overallDe: { type: 'string' },
    overallEn: { type: 'string' }
  },
  required: ['totalScore', 'passes', 'criteria', 'mistakes', 'strengths', 'weaknesses', 'overallDe', 'overallEn']
}

// ── Validator ────────────────────────────────────────────────────

const ERROR_TAGS: readonly string[] = ['grammar', 'word-order', 'vocabulary', 'spelling', 'register']

export function learnerTurns(d: Pick<SprechenDiscussion, 'turns'>): DiscussionTurn[] {
  return d.turns.filter(t => t.role === 'learner')
}

function reAnchor(quote: string, text: string): { spanStart: number; spanEnd: number } {
  if (quote.length === 0) return { spanStart: -1, spanEnd: -1 }
  const exact = text.indexOf(quote)
  if (exact >= 0) return { spanStart: exact, spanEnd: exact + quote.length }
  const lower = text.toLowerCase().indexOf(quote.toLowerCase())
  if (lower >= 0) return { spanStart: lower, spanEnd: lower + quote.length }
  return { spanStart: -1, spanEnd: -1 }
}

export function validateSprechenGrade(
  raw: unknown,
  d: SprechenDiscussion
): SprechenGradeResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  if (typeof r.totalScore !== 'number') return null
  if (typeof r.passes !== 'boolean') return null
  if (typeof r.overallDe !== 'string' || typeof r.overallEn !== 'string') return null
  if (!Array.isArray(r.criteria) || !Array.isArray(r.mistakes)) return null
  if (!Array.isArray(r.strengths) || !Array.isArray(r.weaknesses)) return null

  // Criteria — must match the rubric in order, integer score in range.
  if (r.criteria.length !== SPRECHEN_B2_TEIL2.criteria.length) return null
  const criteria: SprechenCriterionScore[] = []
  let sum = 0
  for (let i = 0; i < r.criteria.length; i++) {
    const expected = SPRECHEN_B2_TEIL2.criteria[i]
    const c = r.criteria[i] as Record<string, unknown>
    if (c.key !== expected.key) return null
    if (typeof c.score !== 'number' || !Number.isInteger(c.score)) return null
    if (c.score < 0 || c.score > expected.maxPoints) return null
    if (typeof c.justificationDe !== 'string' || typeof c.justificationEn !== 'string') return null
    sum += c.score
    criteria.push({
      key: expected.key,
      labelDe: expected.labelDe,
      maxPoints: expected.maxPoints,
      score: c.score,
      justificationDe: c.justificationDe,
      justificationEn: c.justificationEn
    })
  }

  // Strict consistency: sum and pass flag (writing-grader convention).
  if (sum !== r.totalScore) return null
  if ((r.totalScore >= SPRECHEN_B2_TEIL2.passingScore) !== r.passes) return null

  // Mistakes — silently drop what cannot be verified against the transcript.
  const lTurns = learnerTurns(d)
  const mistakes: SprechenMistake[] = (r.mistakes as Array<Record<string, unknown>>).flatMap(m => {
    if (typeof m.turnIndex !== 'number' || !Number.isInteger(m.turnIndex)) return []
    if (m.turnIndex < 0 || m.turnIndex >= lTurns.length) return []
    if (typeof m.quote !== 'string' || m.quote.trim().length === 0) return []
    if (typeof m.suggested !== 'string') return []
    if (typeof m.kind !== 'string' || !ERROR_TAGS.includes(m.kind)) return []
    if (typeof m.reasonDe !== 'string' || typeof m.reasonEn !== 'string') return []
    const anchored = reAnchor(m.quote, lTurns[m.turnIndex].textDe)
    if (anchored.spanStart < 0) return []
    return [{
      turnIndex: m.turnIndex,
      quote: m.quote,
      suggested: m.suggested,
      kind: m.kind as SprechenErrorTag,
      reasonDe: m.reasonDe,
      reasonEn: m.reasonEn,
      spanStart: anchored.spanStart,
      spanEnd: anchored.spanEnd
    }]
  })

  const notes = (arr: unknown[]): BilingualNote[] =>
    (arr as Array<Record<string, unknown>>).flatMap(n =>
      typeof n?.de === 'string' && typeof n?.en === 'string' ? [{ de: n.de, en: n.en }] : []
    )

  return {
    totalScore: r.totalScore,
    passes: r.passes,
    praedikat: praedikat(r.totalScore),
    criteria,
    mistakes,
    strengths: notes(r.strengths),
    weaknesses: notes(r.weaknesses),
    overallDe: r.overallDe,
    overallEn: r.overallEn,
    generatedAt: Date.now(),
    modelUsed: 'unknown'
  }
}

// ── Prompt builder ───────────────────────────────────────────────

export function buildSprechenGraderPrompt(
  d: SprechenDiscussion
): { system: string; user: string } {
  const rubricLines: string[] = []
  rubricLines.push(`RUBRIK: ${SPRECHEN_B2_TEIL2.labelDe}`)
  rubricLines.push(`Maximalpunktzahl: ${SPRECHEN_B2_TEIL2.totalMax} · Bestehensgrenze: ${SPRECHEN_B2_TEIL2.passingScore}`)
  rubricLines.push('')
  rubricLines.push('Kriterien (in dieser Reihenfolge, jedes mit max. Punktzahl):')
  for (const c of SPRECHEN_B2_TEIL2.criteria) {
    rubricLines.push(`- key="${c.key}" — ${c.labelDe} (max ${c.maxPoints} Punkte):`)
    rubricLines.push(`    ${c.descriptorDe}`)
  }
  rubricLines.push('')
  rubricLines.push(`Hinweis: ${SPRECHEN_B2_TEIL2.notes}`)

  const system =
    'Du bist eine strenge, kalibrierte Prüferin für die mündliche Goethe-B2-' +
    'Prüfung, die hier in getippter Form geübt wird. Du bewertest AUSSCHLIESSLICH ' +
    'die Beiträge des Lernenden (mit L0, L1, … markiert) nach der Rubrik unten — ' +
    'die PARTNER-Beiträge stammen von einer KI und werden nicht bewertet.\n\n' +
    'Zusätzlich markierst du JEDEN sprachlichen Fehler in den Lernerbeiträgen:\n' +
    '- "turnIndex": die Zahl hinter dem L des betroffenen Beitrags.\n' +
    '- "quote": die fehlerhafte Stelle WÖRTLICH aus dem Beitrag zitiert ' +
    '(exakte Zeichenfolge, keine Umformulierung).\n' +
    '- "suggested": die korrigierte Fassung der Stelle.\n' +
    '- "kind": GENAU EINE Kategorie aus: grammar (Kasus, Konjugation, Endungen), ' +
    'word-order (Verbstellung, Satzklammer), vocabulary (falsches Wort, ' +
    'Kollokation), spelling (Rechtschreibung), register (Du/Sie, Stilebene).\n' +
    '- "reasonDe" UND "reasonEn": kurze Erklärung, WARUM es falsch ist ' +
    '(Deutsch einfach halten — B2-Lernende lesen sie).\n\n' +
    'Für jedes Kriterium: ganzzahlige Punktzahl im erlaubten Bereich plus kurze ' +
    'Begründung auf Deutsch UND Englisch. totalScore ist die exakte Summe der ' +
    'vier Kriterien; passes ist totalScore >= 60. Danach Stärken, Schwächen und ' +
    'ein Gesamturteil, jeweils Deutsch und Englisch.\n' +
    'Antworte ausschließlich als JSON gemäß responseSchema — kein Prosa-Vorspann.\n\n' +
    rubricLines.join('\n')

  let li = 0
  const transcript = d.turns
    .map(t => t.role === 'learner' ? `L${li++}: ${t.textDe}` : `PARTNER: ${t.textDe}`)
    .join('\n')

  const fewTurns = learnerTurnCount(d) < 3
    ? '\n\nACHTUNG: Die Diskussion wurde früh beendet — es gibt wenig Material. ' +
      'Bewerte trotzdem nach der Rubrik, aber sei bei "erfuellung" entsprechend streng.'
    : ''

  const user =
    `THEMA: „${d.topic.titleDe}" — ${d.topic.statementDe}\n` +
    `Position des PARTNERS: ${d.stance === 'pro' ? 'dafür' : 'dagegen'}.\n\n` +
    `GESPRÄCH:\n${transcript}${fewTurns}`

  return { system, user }
}

// ── Grader call with retries ─────────────────────────────────────

export async function gradeDiscussion(
  client: GeminiClient,
  model: string,
  d: SprechenDiscussion,
  maxRetries = 2
): Promise<SprechenGradeResult> {
  const { system, user } = buildSprechenGraderPrompt(d)
  let attempts = 0
  let lastError = 'no attempts'

  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model,
        contents: user,
        config: {
          systemInstruction: system,
          responseMimeType: 'application/json',
          responseSchema: SPRECHEN_GRADE_SCHEMA as unknown as Record<string, unknown>,
          temperature: 0
        }
      })
      const text = response.text ?? ''
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        lastError = 'malformed JSON'
        continue
      }
      const validated = validateSprechenGrade(parsed, d)
      if (validated === null) {
        lastError = 'validation failed'
        continue
      }
      validated.modelUsed = model
      return validated
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new SprechenGraderError(`Grader exhausted ${attempts} attempts. Last error: ${lastError}`, attempts)
}

// ── Result stash (runner → result page, sessionStorage) ─────────

export const SPRECHEN_RESULT_KEY = 'gt:lastSprechenResult'

/** One-time payload for the result page. Dies with the tab — by design. */
export interface SprechenResultStash {
  topic: { id: string; titleDe: string; statementDe: string; source: 'seed' | 'custom' }
  stance: 'pro' | 'contra'
  turnTarget: number
  turns: DiscussionTurn[]
  kiTippCount: number
  startedAt: number
  finishedAt: number
  result: SprechenGradeResult
}
