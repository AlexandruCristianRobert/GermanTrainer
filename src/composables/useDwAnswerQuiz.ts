// AI-generated direction-word (hin-/her-) "answer the question" quiz (single
// direction, AI-graded).
//
// A companion to the direction-word sentence-translation quiz (useDwSentenceQuiz):
// instead of translating an English sentence, the learner READS a natural
// German scenario + question and TYPES a German answer. The AI generates, per
// drilled pair-element + side (⇒ TARGET compound), ONE question that spells
// out the learner's position explicitly (so hin vs. her is determined by the
// scene, not a coin flip) WITHOUT ever using the target compound or its
// hin-/her- sibling in the question text — that would hand the learner the
// answer — plus one example answer that models the TARGET compound (or its
// vertical twin where one exists, e.g. hinab≈hinunter).
//
// Spec building, level labels, and the vertical-twin helper are shared
// verbatim with the sentence quiz — imported, not duplicated (ADR-0004: all
// randomization is decided up front, before any AI call).

import { shuffle } from '../data/pool'
import type { Rng } from '../data/pool'
import { ADVERB_PAIRS, hinForm, herForm } from '../data/directionWords'
import type { PromptVariation } from './useVerbSentenceQuiz'
import type { AiClient } from './useClaude'
import type { DwErrorTag, DwDrillItem } from './useQuizHistory'
import { twinCompound, DW_GRADE_RULES } from './useDwSentenceQuiz'
import type { DwSentenceSpec, DwAnswerGrade } from './useDwSentenceQuiz'

// Re-export the shared building blocks so a view can pull everything for the
// answer quiz from one module (specs are identical to the sentence quiz).
// DW_GRADE_RULES in particular is the single source of truth for the drill
// rubric bullets — T6 (useDwSentenceQuiz) owns the text, T7 imports it
// verbatim below rather than keeping a second hand-copied paraphrase that
// could drift out of sync.
export { buildDwSpecs, dwLevelLabel, twinCompound, DW_GRADE_RULES } from './useDwSentenceQuiz'
export type { DwSentenceSpec, DwSide, DwAnswerGrade } from './useDwSentenceQuiz'
export type { DwErrorTag } from './useQuizHistory'

// ─────────────────────────────── Types ────────────────────────────────

/** A spec once the AI has produced the question + one example answer. */
export interface GeneratedDwQuestion extends DwSentenceSpec {
  /** Natural German scenario + question addressed to the learner (du-form). */
  question: string
  /** One acceptable model answer using the TARGET compound (or its twin). */
  exampleAnswer: string
}

// ───────────────────────────── Pure helpers ───────────────────────────

function trimStr(x: unknown): string {
  return typeof x === 'string' ? x.trim() : ''
}

function pairGloss(pair: string): string {
  return ADVERB_PAIRS.find(p => p.element === pair)?.gloss ?? pair
}

/** A short random-ish token for the batch seed (no Date/crypto dependency). */
function makeSeed(rng: Rng): string {
  return Math.floor(rng() * 1_000_000_000).toString(36)
}

// ──────────────────────────── AI generation ───────────────────────────

/** Rotating one-line angles injected per batch so scenarios don't converge. */
export const DW_ANSWER_ANGLE_POOL = [
  'set it on a staircase, someone below calling up to someone above',
  'set it on a staircase, someone above calling down to someone below',
  'set it on a hillside path',
  'set it at a doorway between inside and outside',
  'set it at an open window',
  'address the learner informally as du',
  'frame it as a shouted invitation',
  'set it on a weekend hike',
  'set it in a stairwell of an apartment building',
  'use a future intention (morgen / nächste Woche)',
  'frame it as advice or a suggestion',
  'set it at a train platform, someone boarding or leaving',
  'contrast two people at opposite ends of the scene',
  'set it at a garden gate',
  'set it in a multi-storey car park',
  'frame it as someone knocking on a door'
] as const

export const DW_ANSWER_GEN_SYSTEM = `You write German prompts for a speaking-style drill on directional adverbs (hin = away from the speaker, her = toward the speaker).
For each item you are given a TARGET compound and theme nouns. Write:
- "question": a short German scenario + question addressed to the learner (du-form) that sets a scene where the natural answer uses the TARGET compound. State the learner's position explicitly in the scenario (e.g. "Du stehst unten an der Treppe, deine Oma ist oben. Was rufst du ihr zu?"). The question itself must NOT contain the target compound or any hin-/her- compound of the same pair.
- "exampleAnswer": one natural German answer containing the TARGET compound (or its hinab/hinunter-type synonym).
- Weave the given theme nouns into the scenario naturally. Level-appropriate German.
Return ONLY JSON in exactly this shape: {"items":[{"index":<number>,"question":"...","exampleAnswer":"..."}]}
No markdown fences, no commentary.`

export const DW_ANSWER_GEN_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          question: { type: 'string' },
          exampleAnswer: { type: 'string' }
        },
        required: ['index', 'question', 'exampleAnswer']
      }
    }
  },
  required: ['items']
}

export function buildDwAnswerGeneratePrompt(
  specs: readonly DwSentenceSpec[],
  level: string,
  variation: PromptVariation
): string {
  const lines = specs.map(s => {
    const perspective = s.side === 'hin' ? 'away from the speaker' : 'toward the speaker'
    const nouns = s.nouns.length
      ? s.nouns.map(n => `${n.article} ${n.german} (${n.english})`).join(' + ')
      : '(any fitting noun)'
    return `#${s.index} — TARGET compound: "${s.target}" (${s.side}- ${perspective}; element "${s.pair}" — ${pairGloss(s.pair)}); weave in noun(s): ${nouns}`
  })
  return (
    `Target CEFR level: ${level}.\n` +
    `Write one German scenario question and one example German answer for each of the following ${specs.length} item(s). ` +
    `Each question must state the learner's position explicitly and must NOT contain its TARGET compound or the pair's other side:\n` +
    lines.join('\n') +
    `\nEvery exampleAnswer MUST contain the TARGET compound (or its vertical synonym where one exists, e.g. hinab/hinunter).` +
    `\nVary the framing across the batch — draw inspiration from these angles (do not echo them as text): ${variation.angles.join(' · ')}.` +
    `\nBatch variation seed: ${variation.seed}.`
  )
}

/**
 * Validate one AI question + example answer against its spec.
 * - The question must NOT leak the answer: neither side of the drilled pair
 *   (the target itself, or its hin-/her- sibling) may appear in it.
 * - The exampleAnswer MUST demonstrate the target compound (or its vertical
 *   twin, e.g. hinab≈hinunter) — otherwise the "model answer" wouldn't model
 *   anything.
 * A malformed or leaking item is dropped (returns null) so the batch loop can
 * retry just that index.
 */
export function validateDwQuestion(
  raw: unknown,
  spec: DwSentenceSpec
): GeneratedDwQuestion | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  if (typeof e.index === 'number' && e.index !== spec.index) return null

  const question = trimStr(e.question)
  const exampleAnswer = trimStr(e.exampleAnswer)
  if (question.length < 3 || exampleAnswer.length < 3) return null

  const lowQuestion = question.toLowerCase()
  const hin = hinForm(spec.pair).toLowerCase()
  const her = herForm(spec.pair).toLowerCase()
  if (lowQuestion.includes(hin) || lowQuestion.includes(her)) return null

  const lowAnswer = exampleAnswer.toLowerCase()
  const twin = twinCompound(spec)
  const hasTarget = lowAnswer.includes(spec.target.toLowerCase())
  const hasTwin = twin !== null && lowAnswer.includes(twin.toLowerCase())
  if (!hasTarget && !hasTwin) return null

  return { ...spec, question, exampleAnswer }
}

export interface GenerateDwQuestionBatchOptions {
  model: string
  specs: DwSentenceSpec[]
  level?: string
  maxRetries?: number
  rng?: Rng
}

export interface GenerateDwQuestionBatchResult {
  questions: GeneratedDwQuestion[]
  failedIndices: number[]
}

/**
 * Ask the AI for a question + example answer per spec in this batch, validating
 * each and retrying only the missing/failed specs up to `maxRetries` extra
 * rounds. Fresh variety angles + seed each attempt so retries don't reproduce
 * failures. Never throws — a spec that never validates is simply listed in
 * `failedIndices`.
 */
export async function generateDwQuestionBatch(
  client: AiClient,
  opts: GenerateDwQuestionBatchOptions
): Promise<GenerateDwQuestionBatchResult> {
  const rng = opts.rng ?? Math.random
  const level = opts.level ?? 'A2–C1'
  const maxRetries = opts.maxRetries ?? 2
  const bySpec = new Map(opts.specs.map(s => [s.index, s]))
  const accepted = new Map<number, GeneratedDwQuestion>()
  let attempts = 0

  while (accepted.size < opts.specs.length && attempts <= maxRetries) {
    attempts++
    const remaining = opts.specs.filter(s => !accepted.has(s.index))
    const angles = shuffle([...DW_ANSWER_ANGLE_POOL], Math.max(3, Math.min(6, remaining.length)), rng)
    const prompt = buildDwAnswerGeneratePrompt(remaining, level, { angles, seed: makeSeed(rng) })

    let text = ''
    try {
      const res = await client.models.generateContent({
        model: opts.model,
        contents: prompt,
        config: {
          systemInstruction: DW_ANSWER_GEN_SYSTEM,
          responseMimeType: 'application/json',
          responseSchema: DW_ANSWER_GEN_SCHEMA,
          temperature: 0.95,
          topP: 0.95
        }
      })
      text = res.text ?? ''
    } catch {
      continue
    }

    let parsed: unknown
    try { parsed = JSON.parse(text) } catch { continue }
    const items = (parsed as { items?: unknown }).items
    if (!Array.isArray(items)) continue

    for (const raw of items) {
      const idx = typeof (raw as { index?: unknown }).index === 'number'
        ? (raw as { index: number }).index : NaN
      const spec = bySpec.get(idx)
      if (!spec || accepted.has(idx)) continue
      const v = validateDwQuestion(raw, spec)
      if (v) accepted.set(idx, v)
    }
  }

  const questions = opts.specs.filter(s => accepted.has(s.index)).map(s => accepted.get(s.index)!)
  const failedIndices = opts.specs.filter(s => !accepted.has(s.index)).map(s => s.index)
  return { questions, failedIndices }
}

// ──────────────────────────── AI grading ──────────────────────────────
//
// Single direction: the learner read a German scenario question and typed a
// German answer, graded WITH error tags. Temperature 0, JSON schema, one
// retry; THROWS if both attempts fail (caller falls back to a local check) —
// same template semantics as gradeDwAnswer / gradeDacAnswerReply.

export interface DwAnswerGradePromptInput {
  q: GeneratedDwQuestion
  answer: string  // what the learner typed
}

export interface GradeDwReplyOptions extends DwAnswerGradePromptInput {
  model: string
}

const DW_ANSWER_ERROR_TAGS: readonly DwErrorTag[] =
  ['direction', 'conjugation', 'case', 'word-order', 'noun', 'typo']

const DW_ANSWER_GRADE_SCHEMA = {
  type: 'object',
  properties: {
    correct: { type: 'boolean' },
    tip: { type: 'string' },
    errorTags: { type: 'array', items: { type: 'string', enum: ['direction', 'conjugation', 'case', 'word-order', 'noun', 'typo'] } }
  },
  required: ['correct']
}

// DW_GRADE_RULES (the T6 drill rubric — twins, r-forms, kommen-toward-
// addressee, wrong side) is imported above from useDwSentenceQuiz, the single
// source of truth, and spliced in verbatim below. Only the surrounding Q&A
// framing differs from the translation quiz's grading prompt.

const DW_ANSWER_GRADE_SYSTEM =
  "You grade a learner's German answer in a directional-adverb speaking drill (hin = away from the speaker, " +
  'her = toward the speaker). The learner READ a German scenario + question and TYPED a free German answer. ' +
  'Judge TWO things together: (a) does the answer actually answer the question naturally, and (b) does it use ' +
  'the directional adverb correctly. Apply these drill-specific rules:\n' +
  `${DW_GRADE_RULES}\n` +
  'errorTags values: "direction" (wrong side, wrong compound, misformed), "conjugation" (verb form), "case" ' +
  '(wrong case ending), "word-order" (verb-second or adverb placement), "noun" (wrong theme noun), "typo" ' +
  '(small slip elsewhere). Multiple tags allowed; empty when correct.\n' +
  '"tip": ONE short sentence, English, naming what to fix (or reinforcing why the answer is right). Never ' +
  'reveal an unrelated better translation.\n' +
  'Return ONLY JSON in exactly this shape: {"correct": true|false, "tip": "...", "errorTags": ["..."]}\n' +
  'No markdown fences, no commentary.'

export function buildDwAnswerGradePrompt(opts: DwAnswerGradePromptInput): { system: string; user: string } {
  const { q } = opts
  const twin = twinCompound(q)
  const perspective = q.side === 'hin' ? 'away from the speaker' : 'toward the speaker'
  const user =
    `GERMAN QUESTION (shown to the learner): ${q.question}\n` +
    `EXAMPLE ANSWER (one acceptable reference answer): ${q.exampleAnswer}\n` +
    `TARGET COMPOUND: "${q.target}" (${q.side}- — ${perspective})` +
    (twin ? `; vertical synonym also acceptable: "${twin}"` : '') + `\n` +
    `LEARNER'S GERMAN ANSWER: ${opts.answer}`
  return { system: DW_ANSWER_GRADE_SYSTEM, user }
}

export function parseDwAnswerGrade(raw: unknown): DwAnswerGrade | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.correct !== 'boolean') return null
  const tip = typeof r.tip === 'string' ? r.tip.trim() : ''
  const tags = Array.isArray(r.errorTags)
    ? r.errorTags.filter((t): t is DwErrorTag => typeof t === 'string' && (DW_ANSWER_ERROR_TAGS as readonly string[]).includes(t))
    : []
  return { correct: r.correct, tip, tags }
}

export async function gradeDwReply(client: AiClient, opts: GradeDwReplyOptions): Promise<DwAnswerGrade> {
  const { system, user } = buildDwAnswerGradePrompt(opts)
  const maxRetries = 1
  let attempts = 0
  let lastError = 'no attempts'
  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model: opts.model,
        contents: user,
        config: { systemInstruction: system, responseMimeType: 'application/json', responseSchema: DW_ANSWER_GRADE_SCHEMA, temperature: 0 }
      })
      let parsed: unknown
      try { parsed = JSON.parse(response.text ?? '') } catch { lastError = 'malformed JSON'; continue }
      const grade = parseDwAnswerGrade(parsed)
      if (grade === null) { lastError = 'validation failed'; continue }
      return grade
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new Error(`gradeDwReply exhausted ${attempts} attempts. Last error: ${lastError}`)
}

/** The per-item record stored in run meta for one graded direction-word answer. */
export function buildDwAnswerItem(
  q: GeneratedDwQuestion,
  correct: boolean,
  tags?: DwErrorTag[]
): DwDrillItem {
  const item: DwDrillItem = {
    pair: q.pair,
    compound: q.target,
    nounKeys: q.nouns.map(n => n.german),
    correct
  }
  if (tags && tags.length > 0) item.tags = tags
  return item
}
