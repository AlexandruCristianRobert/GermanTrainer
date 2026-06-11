// AI-driven CEFR level assessment over the user's quiz history.
//
// Mirrors the prompt-builder + validator + retry-loop conventions of
// useDeclensionAI.ts / useKonjunktivQuiz.ts:
//   - local duck-typed GeminiClient (no SDK import)
//   - buildAssessmentPrompt()    → English prompt grounded in stats numbers
//   - validateAssessment()       → strict per-field validation
//   - assessLevel()              → temperature 0.4, topP 0.95, retry loop
// The result is cached in localStorage with a cheap history signature so
// the panel can show a "stale" hint when new runs land.

import type { QuizHistoryEntry, QuizHistoryType } from './useQuizHistory'
import type { BucketStat, StatsBundle } from './useQuizStats'

// ── Types ──────────────────────────────────────────────────────────────

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type AssessmentConfidence = 'low' | 'medium' | 'high'

export type AssessmentModule =
  | 'nouns'
  | 'adjectives'
  | 'verbs'
  | 'prepositions'
  | 'declension'
  | 'konjunktiv'
  | 'passiv'
  | 'writing'

export const ASSESSMENT_MODULES: readonly AssessmentModule[] = [
  'nouns',
  'adjectives',
  'verbs',
  'prepositions',
  'declension',
  'konjunktiv',
  'passiv',
  'writing'
] as const

export interface ModuleAssessment {
  score: number
  comment: string
}

export interface LevelAssessmentResult {
  cefrLevel: CefrLevel
  confidence: AssessmentConfidence
  overallSummaryDe: string
  strengths: string[]
  weaknesses: string[]
  nextSteps: string[]
  perModule: Record<string, ModuleAssessment>
  generatedAt: number
  modelUsed: string
  historySignature: string
}

// ── Gemini client (duck-typed — matches useDeclensionAI convention) ────

export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

// ── History signature ──────────────────────────────────────────────────

/**
 * Cheap, stable signature for a history slice. Combines total run count,
 * the newest entry id, and the total questions answered — enough to detect
 * "the history changed since the assessment was generated" without hashing.
 */
export function historySignature(entries: QuizHistoryEntry[]): string {
  const totalRuns = entries.length
  const newestId = entries[0]?.id ?? 0
  let totalQuestions = 0
  for (const e of entries) totalQuestions += e.count || 0
  return `${totalRuns}-${newestId}-${totalQuestions}`
}

// ── Prompt builder ────────────────────────────────────────────────────

const TYPE_LABEL: Record<QuizHistoryType, string> = {
  'noun-gender': 'noun gender (der/die/das)',
  'noun-translation': 'noun translation',
  adjective: 'adjective sentence fill',
  'verb-translation': 'verb translation',
  'verb-conjugation': 'verb conjugation',
  'prep-case': 'preposition · case',
  'prep-article': 'preposition · article',
  'prep-two-way': 'preposition · two-way',
  'prep-sentence': 'preposition · sentence translation (AI)',
  'prep-remedial': 'preposition · remedial weak-point drill',
  'decl-table': 'declension · table',
  'decl-article': 'declension · article',
  'decl-adjective': 'declension · adjective ending',
  'decl-pronoun': 'declension · pronouns',
  'decl-case-recognition': 'declension · case recognition',
  'decl-article-ai': 'declension · article (AI sentences)',
  'konjunktiv-rewrite': 'Konjunktiv I — indirect speech rewrite',
  'passiv-transform': 'Passiv transformation',
  'writing-grade': 'graded essay (writing tutor)',
  'simulator-c1': 'Goethe C1 simulator (mock exam)'
}

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function renderTypeLines(stats: StatsBundle): string {
  const lines: string[] = []
  const types = Object.keys(stats.runsByType) as QuizHistoryType[]
  for (const t of types) {
    const runs = stats.runsByType[t] ?? 0
    const bucket = stats.accuracyByType[t]
    if (runs === 0 && (!bucket || bucket.total === 0)) continue
    const label = TYPE_LABEL[t] ?? t
    if (bucket && bucket.total > 0) {
      lines.push(
        `- ${label}: ${runs} run${runs === 1 ? '' : 's'}, ${bucket.correct}/${bucket.total} correct (${fmtPct(bucket.accuracy)})`
      )
    } else {
      lines.push(`- ${label}: ${runs} run${runs === 1 ? '' : 's'}, no scored questions`)
    }
  }
  return lines.length > 0 ? lines.join('\n') : '- (none yet)'
}

function renderBucketDict(dict: Record<string, BucketStat>): string {
  const entries = Object.entries(dict).filter(([, b]) => b.total > 0)
  if (entries.length === 0) return '- (none)'
  return entries
    .sort((a, b) => b[1].total - a[1].total)
    .map(([k, b]) => `- ${k}: ${b.correct}/${b.total} (${fmtPct(b.accuracy)})`)
    .join('\n')
}

function renderWritingScores(stats: StatsBundle): string {
  const writing = stats.accuracyByType['writing-grade']
  const sim = stats.accuracyByType['simulator-c1']
  const lines: string[] = []
  if (writing && writing.total > 0) {
    lines.push(
      `- Writing tutor essays: aggregate ${writing.correct}/${writing.total} points (${fmtPct(writing.accuracy)})`
    )
  }
  if (sim && sim.total > 0) {
    lines.push(
      `- Goethe C1 simulator: aggregate ${sim.correct}/${sim.total} points (${fmtPct(sim.accuracy)})`
    )
  }
  return lines.length > 0 ? lines.join('\n') : '- (no graded writing sessions yet)'
}

export function buildAssessmentPrompt(stats: StatsBundle): string {
  const seed = Math.floor(Math.random() * 1_000_000).toString(36)
  const overall = stats.totalQuestions > 0
    ? `${stats.totalCorrect}/${stats.totalQuestions} correct (${fmtPct(stats.overallAccuracy)})`
    : 'no scored questions yet'

  return `You are a CEFR-certified examiner reviewing a German learner's self-study
quiz history. Estimate their current CEFR level (A1, A2, B1, B2, C1, or C2)
based on the actual accuracy numbers below. Do NOT default to a generic
"B1" without evidence — ground every judgment in the data.

OVERALL
- Total runs: ${stats.totalRuns}
- Total questions answered: ${stats.totalQuestions}
- Aggregate score: ${overall}
- Active days: ${stats.daysActive} (current streak: ${stats.currentStreakDays}d, longest: ${stats.longestStreakDays}d)

PER-QUIZ-TYPE BREAKDOWN (runs · score · accuracy)
${renderTypeLines(stats)}

ACCURACY BY CEFR LEVEL (from quiz filters the learner has chosen)
${renderBucketDict(stats.accuracyByLevel)}

ACCURACY BY GRAMMAR CASE
${renderBucketDict(stats.accuracyByCase)}

ACCURACY BY TENSE
${renderBucketDict(stats.accuracyByTense)}

ACCURACY BY VERB TYPE
${renderBucketDict(stats.accuracyByVerbType)}

GRADED WRITING / EXAM SIMULATION
${renderWritingScores(stats)}

INSTRUCTIONS
1. Estimate a CEFR level (A1–C2) and a confidence ("low", "medium", "high").
   Lower confidence when the learner has fewer than ~10 scored runs, or when
   the data is concentrated in a single module.
2. Write a 1-2 sentence summary in GERMAN ("overallSummaryDe") that names
   the level and briefly explains what the data suggests. Use natural,
   teacher-style German (B1-B2 register is fine).
3. Provide 3-5 short STRENGTHS in English — name the module or skill, cite
   the accuracy when helpful (e.g. "Solid on dative case (84%)").
4. Provide 3-5 short WEAKNESSES in English, same style — tie each to the
   numbers, not to generic advice.
5. Provide 3-5 actionable NEXT STEPS in English — concrete drills or topics
   the learner should prioritise, ordered by impact.
6. For EACH of these modules, return a 0-100 score and ONE English sentence:
   nouns, adjectives, verbs, prepositions, declension, konjunktiv, passiv,
   writing. If the learner has no data for a module, score 0 and say so.
   Map quiz types to modules as: noun-gender / noun-translation → nouns;
   adjective → adjectives; verb-* → verbs; prep-* → prepositions;
   decl-* → declension; konjunktiv-rewrite → konjunktiv;
   passiv-transform → passiv; writing-grade / simulator-c1 → writing.

OUTPUT
Return ONLY valid JSON matching the schema. No prose. No markdown fences.
Variation seed (do not echo): ${seed}.`
}

// ── Response schema ────────────────────────────────────────────────────

const CEFR_VALUES: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
const CONFIDENCE_VALUES: readonly AssessmentConfidence[] = ['low', 'medium', 'high'] as const

export const ASSESSMENT_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    cefrLevel: { type: 'string', enum: [...CEFR_VALUES] },
    confidence: { type: 'string', enum: [...CONFIDENCE_VALUES] },
    overallSummaryDe: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    nextSteps: { type: 'array', items: { type: 'string' } },
    perModule: {
      type: 'object',
      properties: {
        nouns: {
          type: 'object',
          properties: { score: { type: 'number' }, comment: { type: 'string' } },
          required: ['score', 'comment']
        },
        adjectives: {
          type: 'object',
          properties: { score: { type: 'number' }, comment: { type: 'string' } },
          required: ['score', 'comment']
        },
        verbs: {
          type: 'object',
          properties: { score: { type: 'number' }, comment: { type: 'string' } },
          required: ['score', 'comment']
        },
        prepositions: {
          type: 'object',
          properties: { score: { type: 'number' }, comment: { type: 'string' } },
          required: ['score', 'comment']
        },
        declension: {
          type: 'object',
          properties: { score: { type: 'number' }, comment: { type: 'string' } },
          required: ['score', 'comment']
        },
        konjunktiv: {
          type: 'object',
          properties: { score: { type: 'number' }, comment: { type: 'string' } },
          required: ['score', 'comment']
        },
        passiv: {
          type: 'object',
          properties: { score: { type: 'number' }, comment: { type: 'string' } },
          required: ['score', 'comment']
        },
        writing: {
          type: 'object',
          properties: { score: { type: 'number' }, comment: { type: 'string' } },
          required: ['score', 'comment']
        }
      },
      required: [
        'nouns', 'adjectives', 'verbs', 'prepositions',
        'declension', 'konjunktiv', 'passiv', 'writing'
      ]
    }
  },
  required: [
    'cefrLevel', 'confidence', 'overallSummaryDe',
    'strengths', 'weaknesses', 'nextSteps', 'perModule'
  ]
} as const

// ── Validator ──────────────────────────────────────────────────────────

function isStringArray(value: unknown, min: number, max: number): value is string[] {
  if (!Array.isArray(value)) return false
  if (value.length < min || value.length > max) return false
  for (const v of value) {
    if (typeof v !== 'string' || v.trim().length === 0) return false
  }
  return true
}

function validateModule(raw: unknown): ModuleAssessment | null {
  if (!raw || typeof raw !== 'object') return null
  const m = raw as Record<string, unknown>
  if (typeof m.score !== 'number' || !Number.isFinite(m.score)) return null
  if (typeof m.comment !== 'string' || m.comment.trim().length === 0) return null
  // Clamp score into 0-100 instead of rejecting — keeps the LLM's intent
  // when it slips slightly over the bounds.
  const score = Math.max(0, Math.min(100, Math.round(m.score)))
  return { score, comment: m.comment.trim() }
}

/**
 * Strict per-field validation of the raw assessment JSON. Returns a
 * fully-populated result (minus generatedAt / modelUsed / historySignature
 * — those are set by assessLevel after a successful call).
 */
export function validateAssessment(raw: unknown): LevelAssessmentResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  if (typeof r.cefrLevel !== 'string' || !(CEFR_VALUES as readonly string[]).includes(r.cefrLevel)) {
    return null
  }
  if (
    typeof r.confidence !== 'string' ||
    !(CONFIDENCE_VALUES as readonly string[]).includes(r.confidence)
  ) {
    return null
  }
  if (typeof r.overallSummaryDe !== 'string' || r.overallSummaryDe.trim().length === 0) {
    return null
  }
  if (!isStringArray(r.strengths, 3, 5)) return null
  if (!isStringArray(r.weaknesses, 3, 5)) return null
  if (!isStringArray(r.nextSteps, 3, 5)) return null

  if (!r.perModule || typeof r.perModule !== 'object') return null
  const perModuleRaw = r.perModule as Record<string, unknown>
  const perModule: Record<string, ModuleAssessment> = {}
  for (const key of ASSESSMENT_MODULES) {
    const v = validateModule(perModuleRaw[key])
    if (v === null) return null
    perModule[key] = v
  }

  return {
    cefrLevel: r.cefrLevel as CefrLevel,
    confidence: r.confidence as AssessmentConfidence,
    overallSummaryDe: r.overallSummaryDe.trim(),
    strengths: r.strengths.map(s => s.trim()),
    weaknesses: r.weaknesses.map(s => s.trim()),
    nextSteps: r.nextSteps.map(s => s.trim()),
    perModule,
    generatedAt: 0,
    modelUsed: '',
    historySignature: ''
  }
}

// ── Gemini call with retry ─────────────────────────────────────────────

export interface AssessLevelOptions {
  maxRetries?: number
}

export async function assessLevel(
  client: GeminiClient,
  model: string,
  stats: StatsBundle,
  opts: AssessLevelOptions = {}
): Promise<LevelAssessmentResult> {
  const maxRetries = opts.maxRetries ?? 2
  let lastError: unknown = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const prompt = buildAssessmentPrompt(stats)
    let response: { text?: string }
    try {
      response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: ASSESSMENT_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
          temperature: 0.4,
          topP: 0.95
        }
      })
    } catch (err) {
      lastError = err
      continue
    }

    const text = response.text ?? ''
    if (!text) {
      lastError = new Error('Empty response from Gemini')
      continue
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (err) {
      lastError = err
      continue
    }

    const validated = validateAssessment(parsed)
    if (validated === null) {
      lastError = new Error('Gemini response failed validation')
      continue
    }

    return {
      ...validated,
      generatedAt: Date.now(),
      modelUsed: model,
      historySignature: ''
    }
  }

  if (lastError instanceof Error) {
    throw new Error(`Level assessment failed after ${maxRetries + 1} attempt(s): ${lastError.message}`)
  }
  throw new Error(`Level assessment failed after ${maxRetries + 1} attempt(s).`)
}

// ── localStorage cache ────────────────────────────────────────────────

export const STORAGE_KEY = 'gt:lastLevelAssessment'

export function loadCachedAssessment(): LevelAssessmentResult | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const obj = parsed as Record<string, unknown>
    const validated = validateAssessment(obj)
    if (validated === null) return null
    const generatedAt = typeof obj.generatedAt === 'number' ? obj.generatedAt : 0
    const modelUsed = typeof obj.modelUsed === 'string' ? obj.modelUsed : ''
    const historySignature = typeof obj.historySignature === 'string' ? obj.historySignature : ''
    return { ...validated, generatedAt, modelUsed, historySignature }
  } catch {
    return null
  }
}

export function persistAssessment(r: LevelAssessmentResult): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r))
  } catch {
    /* ignore quota / disabled */
  }
}

export function clearCachedAssessment(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
