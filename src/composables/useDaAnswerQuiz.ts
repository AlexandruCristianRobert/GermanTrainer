// AI-generated da-compound "answer the question" quiz (single direction, AI-graded).
//
// A companion to the da-compound sentence-translation quiz (useDaSentenceQuiz):
// instead of translating, the learner READS a natural German question and TYPES a
// German answer. The AI generates, per drilled collocation, ONE question addressed
// to the learner (du / ihr / Sie) that uses the collocation's fixed preposition +
// governed case correctly and works in the theme noun(s); plus one example answer
// that models the da-compound (Pronominaladverb) pointing back at the thing/clause
// asked about (Q: "Freust du dich auf das Wochenende?" → A: "Ja, ich freue mich
// sehr darauf."). Grading then judges the learner's typed answer for BOTH content
// (does it answer the question) and grammar (preposition, case, well-formed
// compound, German verb-second word order), accepting the several natural surfaces
// a real answer may take (Mittelfeld compound, fronted compound, full noun phrase).
//
// Spec building, level labels, and the CollocRef projection are shared verbatim
// with the sentence quiz — imported, not duplicated (ADR-0004: all randomization
// is decided up front, before any AI call).

import { shuffle } from '../data/pool'
import type { CollocationCase } from '../data/collocations'
import type { PromptVariation } from './useVerbSentenceQuiz'
import type { AiClient } from './useClaude'
import type { DacErrorTag, DacDrillItem } from './useQuizHistory'
import type { DacSentenceSpec, DacAnswerGrade } from './useDaSentenceQuiz'

// Re-export the shared building blocks so a view can pull everything for the
// answer quiz from one module (specs are identical to the sentence quiz).
export { collocToRef, buildDacSpecs, dacLevelLabel } from './useDaSentenceQuiz'
export type { CollocRef, DacSentenceSpec, DacAnswerGrade } from './useDaSentenceQuiz'
export type { DacErrorTag } from './useQuizHistory'

// ─────────────────────────────── Types ────────────────────────────────

/** A spec once the AI has produced the question + one example answer. */
export interface GeneratedDacQuestion extends DacSentenceSpec {
  /** Natural German question addressed to the learner (du / ihr / Sie). */
  question: string
  /** One acceptable model answer using the da-compound where a thing is meant. */
  exampleAnswer: string
}

// ───────────────────────────── Pure helpers ───────────────────────────

/** English + German name for a governed case, e.g. "accusative (Akkusativ)". */
function caseName(c: CollocationCase): string {
  return c === 'accusative' ? 'accusative (Akkusativ)' : 'dative (Dativ)'
}

function trimStr(x: unknown): string {
  return typeof x === 'string' ? x.trim() : ''
}

/** A short random-ish token for the batch seed (no Date/crypto dependency). */
function makeSeed(rng: () => number): string {
  return Math.floor(rng() * 1_000_000_000).toString(36)
}

// ──────────────────────────── AI generation ───────────────────────────

/** Rotating one-line angles injected per batch so questions don't converge.
 *  These are question-flavoured (yes/no vs wh-, who is addressed, the topic)
 *  rather than the sentence quiz's scene-setting angles. */
export const DAC_ANSWER_ANGLE_POOL = [
  'ask a yes/no question (Freust du dich auf …?)',
  'ask a wh-question with a Frageadverb (Worauf …? Woran …? Womit …?)',
  'address the learner informally as du',
  'address a small group as ihr',
  'address the learner politely as Sie',
  'ask about plans for the weekend',
  'ask about work or study',
  'ask about a recent experience',
  'ask about a future intention (morgen / nächste Woche)',
  'ask about a hobby or free time',
  'ask about an upcoming trip or holiday',
  'ask about a decision or a choice',
  'ask about feelings or an opinion',
  'ask about a book, a film, or a show',
  'set the question at a meal or a café',
  'ask about learning German'
] as const

export const DAC_ANSWER_GEN_SYSTEM =
  'You are a German teacher creating CONVERSATION PRACTICE on the topic ' +
  '"Verben/Adjektive/Nomen mit festen Präpositionen und Pronominaladverbien (da-compounds)". ' +
  'For each item you are given ONE German collocation — a verb, adjective, or noun that governs a ' +
  'FIXED preposition + case (shown as headword, preposition, and governed case, with an English gloss) — ' +
  'and zero or more theme nouns. For each item produce two things:\n' +
  '1) "question": ONE natural German QUESTION, addressed to the learner as "du" (use "ihr" or "Sie" only ' +
  'when clearly more natural), that USES the collocation correctly — the exact headword, its exact ' +
  'preposition, and the governed case — and naturally works in the given theme noun(s). The question MUST be ' +
  'answerable using that collocation: a yes/no question ("Freust du dich auf das Wochenende?") OR a ' +
  'wh-question with a Frageadverb ("Worauf freust du dich?", "Woran denkst du oft?") are both fine. Keep the ' +
  'vocabulary at the target CEFR level and the question concise (5–14 words).\n' +
  '2) "exampleAnswer": ONE natural, complete German sentence answering YOUR question, which models the ' +
  'DA-COMPOUND (Pronominaladverb) referring back to the thing / fact / clause asked about (this is correct ' +
  'precisely BECAUSE the question is about a THING — never a person; see the CRITICAL rule below) — e.g. ' +
  'Q: "Freust du dich auf das Wochenende?" → A: "Ja, ich freue mich sehr darauf."; ' +
  'Q: "Worauf wartest du?" → A: "Ich warte darauf, dass der Bus kommt." ' +
  'The answer must keep German verb-second word order: even with a fronted compound the finite verb stays ' +
  'in second position ("Darauf freue ich mich schon.").\n' +
  'CRITICAL da-compound rule: a da-compound (darauf, damit, daran, darüber, dafür …) may ONLY stand for a ' +
  'THING, a fact, or a clause — NEVER for a PERSON. Prefer building the question around a thing / fact / ' +
  'clause object so the answer can naturally take a da-compound. If a given theme noun (or the ' +
  'collocation\'s natural object) is a PERSON — der Bruder, das Baby, die Kollegin … — you may still build ' +
  'the question around it, but the exampleAnswer must then use preposition + personal pronoun ' +
  '("auf ihn", "an sie") — do NOT force a da-compound onto a person, and never write ' +
  '"darauf"/"daran" to mean a person. ' +
  'Return JSON {"items":[{"index":<number>,"question":"...","exampleAnswer":"..."}]} with exactly one entry ' +
  'per requested index.'

export const DAC_ANSWER_GEN_SCHEMA = {
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

export function buildAnswerGeneratePrompt(
  specs: readonly DacSentenceSpec[],
  level: string,
  variation: PromptVariation
): string {
  const lines = specs.map(s => {
    const c = s.colloc
    const colloc = `"${c.word} ${c.preposition}" (${c.english}) — preposition "${c.preposition}" + ${caseName(c.case)} [${c.level}]`
    const nouns = s.nouns.length
      ? s.nouns.map(n => `${n.article} ${n.german} (${n.english})`).join(' + ')
      : '(any fitting thing)'
    return `#${s.index} — collocation: ${colloc}; build the question around thing(s): ${nouns}`
  })
  return (
    `Target CEFR level: ${level}.\n` +
    `Write one German question and one example German answer for each of the following ${specs.length} item(s). ` +
    `Each question MUST address the learner (du / ihr / Sie), use its collocation's exact preposition and ` +
    `governed case, and be answerable with that collocation (yes/no OR wh-question):\n` +
    lines.join('\n') +
    `\nEvery exampleAnswer MUST be a full German sentence that uses the da-compound (darauf, damit, daran …) ` +
    `to refer back to the thing / fact / clause asked about — NEVER a da-compound for a person; if the given ` +
    `theme noun or the asked-about object is a person, use preposition + pronoun ("auf ihn", "an sie") ` +
    `instead. Keep verb-second word order even when the ` +
    `compound is fronted ("Darauf freue ich mich schon.").` +
    `\nVary the framing across the batch — draw inspiration from these angles (do not echo them as text): ${variation.angles.join(' · ')}.` +
    `\nBatch variation seed: ${variation.seed}.`
  )
}

/**
 * Validate one AI question + example answer against its spec. Lenient: we only
 * require both strings to be non-trivial; the spec (collocation + nouns) is
 * carried through verbatim. A malformed item is dropped (returns null) so the
 * batch loop can retry just that index.
 */
export function validateDacQuestion(
  raw: unknown,
  spec: DacSentenceSpec
): GeneratedDacQuestion | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const question = trimStr(e.question)
  const exampleAnswer = trimStr(e.exampleAnswer)
  if (question.length < 3 || exampleAnswer.length < 3) return null
  return { ...spec, question, exampleAnswer }
}

export interface GenerateDacQuestionBatchOptions {
  model: string
  specs: DacSentenceSpec[]
  level?: string
  maxRetries?: number
  rng?: () => number
}

export interface GenerateDacQuestionBatchResult {
  questions: GeneratedDacQuestion[]
  rejected: number
  attempts: number
}

/**
 * Ask the AI for a question + example answer per spec in this batch, validating
 * each and retrying only the missing/failed specs up to `maxRetries` extra
 * rounds. Fresh variety angles + seed each attempt so retries don't reproduce
 * failures. Never throws — a spec that never validates is simply absent from
 * `questions`.
 */
export async function generateDacQuestionBatch(
  client: AiClient,
  opts: GenerateDacQuestionBatchOptions
): Promise<GenerateDacQuestionBatchResult> {
  const rng = opts.rng ?? Math.random
  const level = opts.level ?? 'B1–C1'
  const maxRetries = opts.maxRetries ?? 2
  const bySpec = new Map(opts.specs.map(s => [s.index, s]))
  const accepted = new Map<number, GeneratedDacQuestion>()
  let rejected = 0
  let attempts = 0

  while (accepted.size < opts.specs.length && attempts <= maxRetries) {
    attempts++
    const remaining = opts.specs.filter(s => !accepted.has(s.index))
    const angles = shuffle([...DAC_ANSWER_ANGLE_POOL], Math.max(3, Math.min(6, remaining.length)), rng)
    const prompt = buildAnswerGeneratePrompt(remaining, level, { angles, seed: makeSeed(rng) })

    let text = ''
    try {
      const res = await client.models.generateContent({
        model: opts.model,
        contents: prompt,
        config: {
          systemInstruction: DAC_ANSWER_GEN_SYSTEM,
          responseMimeType: 'application/json',
          responseSchema: DAC_ANSWER_GEN_SCHEMA,
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
      const v = validateDacQuestion(raw, spec)
      if (v) accepted.set(idx, v); else rejected++
    }
  }

  const questions = opts.specs.filter(s => accepted.has(s.index)).map(s => accepted.get(s.index)!)
  return { questions, rejected, attempts }
}

// ──────────────────────────── AI grading ──────────────────────────────
//
// Single direction: the learner read a German question and typed a German
// answer, graded WITH error tags. Temperature 0, JSON schema, one retry; THROWS
// if both attempts fail (caller falls back to a local check).

export interface DacAnswerGradeInput {
  question: string       // the German question shown to the learner
  exampleAnswer: string  // one acceptable reference answer (generated up front)
  collocWord: string     // collocation headword, e.g. "sich freuen"
  preposition: string    // governed preposition, e.g. "auf"
  case: CollocationCase  // 'accusative' | 'dative'
  userAnswer: string     // what the learner typed
}

export interface GradeDacAnswerReplyOptions extends DacAnswerGradeInput {
  model: string
}

// The full 6-tag set this quiz accepts (parse filters to exactly these).
const DAC_ANSWER_ERROR_TAGS: readonly DacErrorTag[] =
  ['preposition', 'compound', 'case', 'noun', 'word-order', 'typo']

const DAC_ANSWER_GRADE_SCHEMA = {
  type: 'object',
  properties: {
    correct: { type: 'boolean' },
    tip: { type: 'string' },
    errorTags: {
      type: 'array',
      items: { type: 'string', enum: ['preposition', 'compound', 'case', 'noun', 'word-order', 'typo'] }
    }
  },
  required: ['correct']
}

export function buildAnswerGradePrompt(opts: DacAnswerGradeInput): { system: string; user: string } {
  const cName = caseName(opts.case)
  const system =
    'You are a German teacher grading ONE conversation-practice answer on collocations with fixed ' +
    'prepositions and their da-compounds (Pronominaladverbien). Respond ONLY as JSON — no prose, no ' +
    'markdown fences. Match the schema {"correct": boolean, "tip": string, "errorTags": string[]}. ' +
    'The learner READ a German QUESTION and TYPED a German ANSWER. Judge TWO things together: (a) does the ' +
    'answer actually ANSWER the question naturally, and (b) does it use the collocation and its da-compound ' +
    'GRAMMATICALLY — correct preposition, correct governed case, a well-formed compound, and German ' +
    'verb-second word order. ' +
    'Set "correct" true for ANY natural, grammatical answer — do NOT require a match to the example answer. ' +
    'ACCEPT all of these equally: ' +
    'the da-compound in the Mittelfeld ("Ich freue mich sehr darauf."); ' +
    'a FRONTED da-compound with verb-second order ("Darauf freue ich mich schon lange."); ' +
    'a full noun phrase that repeats the object ("Ich freue mich auf das Wochenende."); ' +
    'and a short but complete answer that still shows the collocation/compound structure. ' +
    'An answer may open with ja / nein / doch — that is always fine and never an error by itself. ' +
    'A prepositional-phrase fragment answering a wh-question ("Worauf freust du dich?" — "Auf das ' +
    'Wochenende!") ALSO counts as correct: it demonstrates the target preposition and case. ' +
    'Among short answers, reject only a bare one with no structure (a lone "Ja." showing neither the ' +
    'collocation nor a compound is NOT enough); grammatical errors elsewhere are judged normally. ' +
    'When "correct" is false, set "tip" to ONE short English sentence pinpointing the single most important ' +
    'mistake, and set "errorTags" to every applicable value from EXACTLY these six: ' +
    '"preposition" (the governed preposition is wrong or missing — e.g. "warten für" instead of "warten auf"); ' +
    '"compound" (the preposition is RIGHT but the da-compound is wrong in FORM or CHOICE — a malformed ' +
    'compound like *daauf / *darmit instead of darauf / damit, OR a da-compound used to refer to a PERSON ' +
    'where German needs preposition + pronoun such as "auf ihn", OR a preposition + pronoun used for a ' +
    'THING/idea where German needs the da-compound such as "darauf"; this tag is about the compound\'s ' +
    'shape or choice, NOT its position); ' +
    '"case" (the preposition is correct but the governed case is wrong — e.g. "auf dem Wochenende" for an ' +
    'accusative object, a mis-inflected article or ending); ' +
    '"noun" (a wrong content noun — wrong word, gender, or form — when the answer names one); ' +
    '"word-order" (German verb-second (V2) is violated — e.g. "Darauf ich freue mich" — OR the ' +
    'compound / reflexive / object is misplaced in the clause — e.g. "Ich freue darauf mich"; this tag is ' +
    'about POSITION, not the compound\'s form — use "compound" for a malformed or wrongly-chosen compound ' +
    'and "word-order" only for placement); ' +
    '"typo" (a small slip elsewhere, not on the preposition, the compound, the case, a noun, or word order). ' +
    'Use several tags when several things are wrong. When "correct" is true, "tip" may be empty and ' +
    '"errorTags" omitted.'
  const user =
    `GERMAN QUESTION (shown to the learner): ${opts.question}\n` +
    `EXAMPLE ANSWER (one acceptable reference answer): ${opts.exampleAnswer}\n` +
    `TARGET COLLOCATION: "${opts.collocWord} ${opts.preposition}" — governs ${cName}.\n` +
    `LEARNER'S GERMAN ANSWER: ${opts.userAnswer}`
  return { system, user }
}

export function parseAnswerGrade(raw: unknown): DacAnswerGrade | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.correct !== 'boolean') return null
  const grade: DacAnswerGrade = { correct: r.correct }
  if (typeof r.tip === 'string') {
    const tip = r.tip.trim()
    if (tip.length > 0) grade.tip = tip
  }
  if (Array.isArray(r.errorTags)) {
    const tags = r.errorTags.filter(
      (t): t is DacErrorTag => typeof t === 'string' && (DAC_ANSWER_ERROR_TAGS as readonly string[]).includes(t)
    )
    if (tags.length > 0) grade.tags = tags
  }
  return grade
}

export async function gradeDacAnswerReply(
  client: AiClient,
  opts: GradeDacAnswerReplyOptions
): Promise<DacAnswerGrade> {
  const { system, user } = buildAnswerGradePrompt(opts)
  const maxRetries = 1
  let attempts = 0
  let lastError = 'no attempts'
  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model: opts.model,
        contents: user,
        config: { systemInstruction: system, responseMimeType: 'application/json', responseSchema: DAC_ANSWER_GRADE_SCHEMA, temperature: 0 }
      })
      let parsed: unknown
      try { parsed = JSON.parse(response.text ?? '') } catch { lastError = 'malformed JSON'; continue }
      const grade = parseAnswerGrade(parsed)
      if (grade === null) { lastError = 'validation failed'; continue }
      return grade
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new Error(`gradeDacAnswerReply exhausted ${attempts} attempts. Last error: ${lastError}`)
}

/** The per-item record stored in run meta for one graded da-compound answer. */
export function buildDacAnswerItem(
  q: GeneratedDacQuestion,
  correct: boolean,
  tags?: DacErrorTag[]
): DacDrillItem {
  const item: DacDrillItem = {
    collocId: q.colloc.id,
    collocWord: q.colloc.word,
    prepGerman: q.colloc.preposition,
    nounKeys: q.nouns.map(n => n.german),
    correct
  }
  if (tags && tags.length > 0) item.tags = tags
  return item
}
