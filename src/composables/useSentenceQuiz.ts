// AI-generated preposition sentence-translation quiz.
//
// Flow: the learner picks one or more preposition cases, a count, a noun
// "theme" (the same groups the noun quizzes use) and how many nouns per
// sentence. We sample that many prepositions at random (the same `shuffle`
// randomizer used everywhere else), assign 1–2 random nouns from the chosen
// groups to each, then ask Gemini to write an English+German sentence pair per
// preposition. The learner is shown the English and types the German; the
// answer is checked locally against the German reference generated up front
// (exact, but ignoring case, punctuation and extra whitespace).

import { shuffle } from '../data/pool'
import type { AiClient } from './useClaude'
import type { Preposition, PrepCase } from '../data/prepositions'
import type { Gender, Noun } from '../db/types'
import type { PrepErrorTag, PrepDrillItem } from './useQuizHistory'

// ─────────────────────────────── Types ────────────────────────────────

/** A noun handed to the AI to build a sentence around. */
export interface NounRef {
  german: string
  article: Gender
  english: string
}

export type NounsPerSentence = 1 | 2 | 'mix'

/**
 * Which way the learner translates:
 *  - 'en-de': shown the English, types the German.
 *  - 'de-en': shown the German, types the English.
 */
export type Direction = 'en-de' | 'de-en'

/**
 * How a typed answer is judged:
 *  - 'ai':    sent to the model for a lenient, meaning-aware grade (+ a coaching tip).
 *  - 'exact': checked locally against the reference (case/punctuation/whitespace forgiving).
 */
export type GradingMode = 'ai' | 'exact'

/** A preposition + its assigned noun(s), before the AI writes the sentence. */
export interface SentenceSpec {
  index: number
  prepId: string
  prepGerman: string
  prepEnglish: string
  case: PrepCase
  nouns: NounRef[]
}

/** A spec once the AI has produced the English prompt + German reference. */
export interface GeneratedSentence extends SentenceSpec {
  english: string
  german: string
  /** Exact English word(s) the AI used to express the preposition (verbatim, for highlighting). */
  prepSpanEn?: string
  /** Exact English word(s) used for each assigned noun, in the same order as `nouns`. */
  nounSpansEn?: string[]
}

export interface SentenceVerdict {
  index: number
  correct: boolean
  /** The reference German translation — shown when the answer is wrong. */
  correction: string
  /** A short coaching note from the AI grader pinpointing the mistake (when wrong). */
  tip?: string
  /** Error categories from the AI grader (en→de only); used for weak-point tracking. */
  tags?: PrepErrorTag[]
}

// ───────────────────────────── Pure helpers ───────────────────────────

/** Lower-case, turn punctuation into spaces, collapse whitespace, trim. */
export function normalizeGerman(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?;:„“"»«()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Check a typed answer against the reference German generated up front.
 * The match is exact apart from forgiving formatting: extra whitespace is
 * collapsed, punctuation (.,!?;: and quotes) is ignored, and case is ignored.
 * A blank answer is never correct.
 */
export function checkSentence(input: string, reference: string): boolean {
  const a = normalizeGerman(input)
  return a.length > 0 && a === normalizeGerman(reference)
}

// Common preposition contractions (prep + article). Used to recognise that a
// sentence really uses the target preposition even when contracted.
const CONTRACTIONS: Record<string, string[]> = {
  an: ['am', 'ans'],
  in: ['im', 'ins'],
  bei: ['beim'],
  von: ['vom'],
  zu: ['zum', 'zur'],
  auf: ['aufs'],
  um: ['ums'],
  durch: ['durchs'],
  für: ['fürs'],
  über: ['übers', 'überm'],
  unter: ['unters', 'unterm'],
  vor: ['vors', 'vorm'],
  hinter: ['hinters', 'hinterm']
}

/** True if `german` uses the preposition as a whole word or known contraction. */
export function prepUsed(german: string, prepGerman: string): boolean {
  const hay = ' ' + normalizeGerman(german) + ' '
  const base = prepGerman.toLowerCase()
  const candidates = [base, ...(CONTRACTIONS[base] ?? [])]
  return candidates.some(c => hay.includes(' ' + c + ' '))
}

/** Turn a stored Noun into the lean shape the AI prompt needs. */
export function nounToRef(n: Noun): NounRef {
  return { german: n.german, article: n.gender, english: n.english }
}

/**
 * Pick `count` prepositions at random using the shared `shuffle`. If `count`
 * exceeds the pool size, prepositions repeat (re-shuffled each pass) so the
 * learner always gets exactly the number of sentences they asked for.
 */
export function pickPrepositions(
  pool: readonly Preposition[],
  count: number,
  rng: () => number = Math.random
): Preposition[] {
  if (pool.length === 0 || count <= 0) return []
  const out: Preposition[] = []
  while (out.length < count) {
    const batch = shuffle(pool, Math.min(pool.length, count - out.length), rng)
    out.push(...batch)
  }
  return out.slice(0, count)
}

/**
 * Assign 1–2 nouns to each chosen preposition. Nouns are drawn from a shuffled
 * bag that refills (re-shuffles) when exhausted, spreading the group's nouns
 * across the run before any repeats.
 */
export function buildSpecs(
  preps: readonly Preposition[],
  nounPool: readonly NounRef[],
  nounsPerSentence: NounsPerSentence,
  rng: () => number = Math.random
): SentenceSpec[] {
  let bag: NounRef[] = []
  let bagIdx = 0
  function nextNoun(): NounRef | null {
    if (nounPool.length === 0) return null
    if (bagIdx >= bag.length) {
      bag = shuffle(nounPool, nounPool.length, rng)
      bagIdx = 0
    }
    return bag[bagIdx++] ?? null
  }

  return preps.map((p, index) => {
    const k = nounsPerSentence === 'mix' ? (rng() < 0.5 ? 1 : 2) : nounsPerSentence
    const nouns: NounRef[] = []
    for (let i = 0; i < k; i++) {
      const n = nextNoun()
      if (n && !nouns.some(x => x.german === n.german)) nouns.push(n)
    }
    return {
      index,
      prepId: p.id,
      prepGerman: p.german,
      prepEnglish: p.english,
      case: p.case,
      nouns
    }
  })
}

/** Validate one AI sentence pair against the spec it was generated for. */
export function validateSentencePair(
  raw: unknown,
  spec: SentenceSpec
): GeneratedSentence | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const english = typeof e.english === 'string' ? e.english.trim() : ''
  const german = typeof e.german === 'string' ? e.german.trim() : ''
  if (english.length < 3 || german.length < 3) return null
  if (!prepUsed(german, spec.prepGerman)) return null

  const out: GeneratedSentence = { ...spec, english, german }

  // Optional highlight surfaces — tolerated, never a reason to reject. A
  // missing/malformed field is simply omitted (left undefined); the runner
  // copes with absent spans.
  if (typeof e.prepSpanEn === 'string') {
    const trimmed = e.prepSpanEn.trim()
    if (trimmed.length > 0) out.prepSpanEn = trimmed
  }
  if (Array.isArray(e.nounSpansEn)) {
    out.nounSpansEn = e.nounSpansEn
      .filter((x): x is string => typeof x === 'string')
      .map(x => x.trim())
  }

  return out
}

// ─────────────────────────── Hint rendering ───────────────────────────
//
// To highlight the preposition and assigned nouns inside the English prompt
// (hover/tap reveals the German), we split the sentence into ordered segments:
// plain text and "hint" spans. Each hint carries the German to reveal. We locate
// each surface by the FIRST case-insensitive, word-bounded match (so "on" never
// fires inside "onto"), keep only non-overlapping ranges, and preserve the
// sentence's original casing in every segment. Surfaces that are empty or not
// found are dropped — a hint we cannot anchor simply doesn't render, so the quiz
// stays usable. The concatenation of all segment texts equals the input exactly.

export type HintKind = 'prep' | 'noun'

/** One slice of the prompt sentence: plain text, or a highlighted hint span. */
export interface HintSegment {
  text: string
  hint?: { kind: HintKind; reveal: string }
}

/** A surface to find in the sentence and the German to reveal for it. */
export interface HintInput {
  surface: string
  kind: HintKind
  reveal: string
}

/** Escape a string for safe use as a literal inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Split `english` into ordered plain/highlighted segments by locating each
 * hint's `surface` (first case-insensitive, word-bounded match). Overlapping
 * matches are resolved greedily by start position; un-anchorable hints are
 * skipped. The joined `.text` of the result always equals `english`.
 */
export function buildHintSegments(english: string, hints: readonly HintInput[]): HintSegment[] {
  interface Range { start: number; end: number; kind: HintKind; reveal: string }
  const found: Range[] = []

  for (const h of hints) {
    const surface = h.surface?.trim()
    if (!surface) continue
    let re: RegExp
    try {
      re = new RegExp(`\\b${escapeRegExp(surface)}\\b`, 'i')
    } catch {
      continue
    }
    const m = re.exec(english)
    if (!m) continue
    found.push({ start: m.index, end: m.index + m[0].length, kind: h.kind, reveal: h.reveal })
  }

  // Sort by start, then greedily keep non-overlapping ranges.
  found.sort((a, b) => a.start - b.start)
  const kept: Range[] = []
  let lastEnd = -1
  for (const r of found) {
    if (r.start < lastEnd) continue
    kept.push(r)
    lastEnd = r.end
  }

  if (kept.length === 0) return [{ text: english }]

  const segments: HintSegment[] = []
  let cursor = 0
  for (const r of kept) {
    if (r.start > cursor) segments.push({ text: english.slice(cursor, r.start) })
    segments.push({
      text: english.slice(r.start, r.end),
      hint: { kind: r.kind, reveal: r.reveal }
    })
    cursor = r.end
  }
  if (cursor < english.length) segments.push({ text: english.slice(cursor) })
  return segments
}

// ──────────────────────────── AI generation ───────────────────────────

function caseLabel(c: PrepCase): string {
  switch (c) {
    case 'accusative': return 'Akkusativ (accusative)'
    case 'dative': return 'Dativ (dative)'
    case 'genitive': return 'Genitiv (genitive)'
    case 'two-way': return 'Wechselpräposition (accusative for motion/direction, dative for location)'
  }
}

const GEN_SYSTEM =
  'You are a German teacher writing translation exercises. For each item you are ' +
  'given a German preposition (with the case it governs) and one or two nouns. ' +
  'Write ONE natural, everyday German sentence that uses that preposition correctly ' +
  'in the required case and naturally incorporates the given noun(s), then give a ' +
  'faithful, natural English translation of that sentence. The German sentence MUST ' +
  'contain the preposition (a contracted form such as "im" or "am" is fine). Keep ' +
  'sentences concise (6–14 words) and at the requested CEFR level. Return JSON of the ' +
  'form {"items":[{"index":<number>,"english":"...","german":"..."}]} with exactly one ' +
  'entry per requested index. ' +
  'Also return, per item, "prepSpanEn" = the exact word(s) in YOUR English sentence that ' +
  'express the given preposition, copied verbatim from the sentence (the preposition itself, ' +
  'WITHOUT a surrounding article), and "nounSpansEn" = an array with one entry per given noun ' +
  'in the SAME order, each the exact word(s) you used for that noun copied verbatim (the noun ' +
  'head, WITHOUT its article). These MUST be exact substrings of your English sentence so they ' +
  'can be located, and there must be exactly one "nounSpansEn" entry per given noun (use an ' +
  'empty array when no nouns were given).'

const GEN_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          english: { type: 'string' },
          german: { type: 'string' },
          prepSpanEn: { type: 'string' },
          nounSpansEn: { type: 'array', items: { type: 'string' } }
        },
        required: ['index', 'english', 'german', 'prepSpanEn', 'nounSpansEn']
      }
    }
  },
  required: ['items']
}

export function buildGeneratePrompt(specs: readonly SentenceSpec[], level: string): string {
  const lines = specs.map(s => {
    const nouns = s.nouns.length
      ? s.nouns.map(n => `${n.article} ${n.german} (${n.english})`).join(' + ')
      : '(any fitting noun)'
    return `#${s.index} — preposition "${s.prepGerman}" (${s.prepEnglish}), governs ${caseLabel(s.case)}; build around noun(s): ${nouns}`
  })
  return (
    `Target CEFR level: ${level}.\n` +
    `Write one German sentence and its English translation for each of the following ${specs.length} item(s):\n` +
    lines.join('\n') +
    `\nAlso return prepSpanEn and nounSpansEn (one per listed noun, in order), each an exact substring of your English sentence.`
  )
}

export interface GenerateSentencesOptions {
  model: string
  specs: SentenceSpec[]
  level?: string
  maxRetries?: number
}

export interface GenerateSentencesResult {
  sentences: GeneratedSentence[]
  rejected: number
  attempts: number
}

/**
 * Ask the AI for a sentence pair per spec, validating each and retrying only
 * the specs that failed/were missing, up to `maxRetries` extra rounds.
 */
export async function generateSentences(
  client: AiClient,
  opts: GenerateSentencesOptions
): Promise<GenerateSentencesResult> {
  const level = opts.level ?? 'A2–B1'
  const maxRetries = opts.maxRetries ?? 2
  const bySpec = new Map(opts.specs.map(s => [s.index, s]))
  const accepted = new Map<number, GeneratedSentence>()
  let rejected = 0
  let attempts = 0

  while (accepted.size < opts.specs.length && attempts <= maxRetries) {
    attempts++
    const remaining = opts.specs.filter(s => !accepted.has(s.index))
    const prompt = buildGeneratePrompt(remaining, level)

    let text = ''
    try {
      const res = await client.models.generateContent({
        model: opts.model,
        contents: prompt,
        config: {
          systemInstruction: GEN_SYSTEM,
          responseMimeType: 'application/json',
          responseSchema: GEN_SCHEMA,
          temperature: 0.9,
          topP: 0.95
        }
      })
      text = res.text ?? ''
    } catch {
      continue
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      continue
    }
    const items = (parsed as { items?: unknown }).items
    if (!Array.isArray(items)) continue

    for (const raw of items) {
      const idx = typeof (raw as { index?: unknown }).index === 'number'
        ? (raw as { index: number }).index
        : NaN
      const spec = bySpec.get(idx)
      if (!spec || accepted.has(idx)) continue
      const v = validateSentencePair(raw, spec)
      if (v) accepted.set(idx, v)
      else rejected++
    }
  }

  const sentences = opts.specs
    .filter(s => accepted.has(s.index))
    .map(s => accepted.get(s.index) as GeneratedSentence)
  return { sentences, rejected, attempts }
}

// ──────────────────────────── AI grading ──────────────────────────────
//
// When the learner picks AI grading, the typed answer is judged for *meaning*
// rather than exact-matched against the reference. We send the source sentence,
// the reference translation, the target preposition + its case, and the
// learner's answer, and ask the model to return JSON {correct, tip}. On a wrong
// answer the model returns ONE short English coaching tip pinpointing the
// mistake (wrong case, wrong/missing preposition, wrong word, meaning drift).
// The call mirrors useWritingGrader's gradeDraft: temperature 0, JSON schema,
// JSON.parse + pure validation, with a single retry. If both attempts fail it
// THROWS so the Runner can fall back to a local exact check — we never invent a
// default grade.

export interface GradeAnswerOptions {
  model: string
  direction: Direction
  english: string      // reference English sentence (generated up front)
  german: string       // reference German sentence (generated up front)
  prepGerman: string   // target preposition, e.g. "mit"
  prepEnglish: string  // its English gloss, e.g. "with"
  case: PrepCase       // 'accusative' | 'dative' | 'genitive' | 'two-way'
  userAnswer: string   // what the learner typed
}

export interface AnswerGrade {
  correct: boolean
  tip?: string
  tags?: PrepErrorTag[]
}

const GRADE_SCHEMA = {
  type: 'object',
  properties: {
    correct: { type: 'boolean' },
    tip: { type: 'string' },
    errorTags: {
      type: 'array',
      items: { type: 'string', enum: ['preposition', 'case', 'noun', 'typo'] }
    }
  },
  required: ['correct']
}

const PREP_ERROR_TAGS: readonly PrepErrorTag[] = ['preposition', 'case', 'noun', 'typo']

/**
 * Build the (pure, testable) system + user prompt for grading one answer.
 * The instructions and labelling depend on the translation direction.
 */
export function buildGradePrompt(opts: GradeAnswerOptions): { system: string; user: string } {
  const caseName = caseLabel(opts.case)
  const common =
    'You are a German teacher grading one translation exercise. Respond ONLY as ' +
    'JSON matching the schema {"correct": boolean, "tip": string} — no prose, no ' +
    'markdown fences. Set "correct" to true when the learner\'s answer is an ' +
    'acceptable translation, false otherwise. If "correct" is false, set "tip" to ' +
    'ONE short English sentence pinpointing the specific mistake (wrong case, ' +
    'wrong or missing preposition, wrong word, or a drift in meaning). When ' +
    '"correct" is true, "tip" may be an empty string.'

  if (opts.direction === 'en-de') {
    const system =
      common +
      ' The learner was shown the ENGLISH sentence and typed a GERMAN translation. ' +
      'Judge whether the German is a correct, grammatical translation of the English ' +
      `that uses the target preposition "${opts.prepGerman}" in the ${caseName}. ` +
      'Accept natural alternative phrasings and word order — do not require an exact ' +
      'match to the reference. ' +
      'When "correct" is false, ALSO return "errorTags": an array naming every way the ' +
      'answer is wrong, drawn from exactly these values: "preposition" (a wrong or missing ' +
      'preposition word), "case" (the correct preposition but the WRONG governed case — ' +
      'e.g. "mit den Bus" instead of "mit dem Bus", a mis-inflected article or ending), ' +
      '"noun" (a wrong assigned theme noun — wrong word, gender, or form), "typo" (a slip ' +
      'elsewhere in the sentence, not on the preposition, its case, or an assigned noun). ' +
      'You may include several tags when several things are wrong. When "correct" is true, ' +
      '"errorTags" may be omitted or left empty.'
    const user =
      `ENGLISH (source shown to the learner): ${opts.english}\n` +
      `GERMAN (reference translation): ${opts.german}\n` +
      `TARGET PREPOSITION: "${opts.prepGerman}" (${opts.prepEnglish}), governs ${caseName}.\n` +
      `LEARNER'S GERMAN ANSWER: ${opts.userAnswer}`
    return { system, user }
  }

  // direction === 'de-en'
  const system =
    common +
    ' The learner was shown the GERMAN sentence and typed an ENGLISH translation. ' +
    'Judge whether the learner\'s English correctly conveys the meaning of the ' +
    'German sentence. Accept paraphrases and synonyms — meaning matters, not an ' +
    'exact match to the reference.'
  const user =
    `GERMAN (source shown to the learner): ${opts.german}\n` +
    `ENGLISH (reference translation): ${opts.english}\n` +
    `TARGET PREPOSITION: "${opts.prepGerman}" (${opts.prepEnglish}), governs ${caseName}.\n` +
    `LEARNER'S ENGLISH ANSWER: ${opts.userAnswer}`
  return { system, user }
}

/**
 * Pure validator for the grader's JSON. Returns null for non-objects or when
 * `correct` is not a boolean. On success returns `{ correct, tip }`, with `tip`
 * included only when it is a non-empty string after trimming.
 */
export function parseGrade(raw: unknown): AnswerGrade | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.correct !== 'boolean') return null
  const grade: AnswerGrade = { correct: r.correct }
  if (typeof r.tip === 'string') {
    const tip = r.tip.trim()
    if (tip.length > 0) grade.tip = tip
  }
  if (Array.isArray(r.errorTags)) {
    const tags = r.errorTags.filter(
      (t): t is PrepErrorTag => typeof t === 'string' && (PREP_ERROR_TAGS as readonly string[]).includes(t)
    )
    if (tags.length > 0) grade.tags = tags
  }
  return grade
}

/**
 * Grade one typed answer with the AI. Mirrors gradeDraft's retry loop (one
 * retry). Throws if both attempts fail to produce valid JSON — the caller is
 * expected to fall back to a local check rather than trust a default grade.
 */
export async function gradeAnswer(
  client: AiClient,
  opts: GradeAnswerOptions
): Promise<AnswerGrade> {
  const { system, user } = buildGradePrompt(opts)
  const maxRetries = 1
  let attempts = 0
  let lastError = 'no attempts'

  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model: opts.model,
        contents: user,
        config: {
          systemInstruction: system,
          responseMimeType: 'application/json',
          responseSchema: GRADE_SCHEMA,
          temperature: 0
        }
      })
      let parsed: unknown
      try {
        parsed = JSON.parse(response.text ?? '')
      } catch {
        lastError = 'malformed JSON'
        continue
      }
      const grade = parseGrade(parsed)
      if (grade === null) {
        lastError = 'validation failed'
        continue
      }
      return grade
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }

  throw new Error(`gradeAnswer exhausted ${attempts} attempts. Last error: ${lastError}`)
}

/** Build the per-item record stored in run meta for one graded sentence. */
export function buildDrillItem(
  s: GeneratedSentence,
  correct: boolean,
  tags?: PrepErrorTag[]
): PrepDrillItem {
  const item: PrepDrillItem = {
    prepId: s.prepId,
    prepGerman: s.prepGerman,
    nounKeys: s.nouns.map(n => n.german),
    correct
  }
  if (tags && tags.length > 0) item.tags = tags
  return item
}
