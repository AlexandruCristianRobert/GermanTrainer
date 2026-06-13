// AI-generated verb sentence-translation quiz (EN→DE, AI-graded).
//
// The learner picks a verb pool (level/type/case) and a noun theme. We sample
// per-sentence "specs" (1–2 drilled verbs + 1–2 theme nouns) up front — so all
// randomization is decided before any AI call (ADR-0004) — then generate the
// English+German sentence pairs progressively. The AI also returns the German
// dictionary form for every highlighted word so incidental nouns can be hinted
// (ADR-0003). The learner reads the English and types the German.

import { shuffle } from '../data/pool'
import type { Verb, VerbLevel } from '../data/verbs'
import type { NounRef, HintInput } from './useSentenceQuiz'
import type { AiClient } from './useClaude'
import type { VerbErrorTag, VerbDrillItem } from './useQuizHistory'

// ─────────────────────────────── Types ────────────────────────────────

/** A drilled verb handed to the AI to build a sentence around. */
export interface VerbRef {
  german: string   // infinitive / dictionary form
  english: string  // gloss, e.g. "go" or "make / do"
  level: VerbLevel
}

export type WordsPer = 1 | 2 | 'mix'

/** A verb error category the AI grader may assign (re-exported from history). */
export type { VerbErrorTag } from './useQuizHistory'

/** Drilled verbs + theme nouns for one sentence, before the AI writes it. */
export interface VerbSentenceSpec {
  index: number
  verbs: VerbRef[]
  nouns: NounRef[]
}

/** A noun/verb the AI introduced for naturalness, with its German to reveal. */
export interface ExtraWord {
  en: string   // exact English surface in the sentence
  de: string   // German dictionary form (infinitive / article + noun)
  kind: 'verb' | 'noun'
}

/** A spec once the AI has produced the sentence pair + highlight surfaces. */
export interface GeneratedVerbSentence extends VerbSentenceSpec {
  english: string
  german: string
  /** Exact English surface for each drilled verb, in order. */
  verbSpansEn?: string[]
  /** Exact English surface for each theme noun, in order. */
  nounSpansEn?: string[]
  /** Other highlighted nouns/verbs with AI-supplied German. */
  extraWords?: ExtraWord[]
}

export interface VerbSentenceVerdict {
  index: number
  correct: boolean
  correction: string   // the reference German, shown when wrong
  tip?: string
  tags?: import('./useQuizHistory').VerbErrorTag[]
}

// ───────────────────────────── Pure helpers ───────────────────────────

/** Project a stored Verb to the lean ref the prompt needs. */
export function verbToRef(v: Verb): VerbRef {
  return { german: v.german, english: v.english, level: v.level }
}

/** A refilling shuffled bag: draws spread the pool before any repeat. */
function makeBag<T>(pool: readonly T[], rng: () => number) {
  let bag: T[] = []
  let i = 0
  return function next(): T | null {
    if (pool.length === 0) return null
    if (i >= bag.length) { bag = shuffle(pool, pool.length, rng); i = 0 }
    return bag[i++] ?? null
  }
}

/** Draw up to `k` distinct items (by `key`) from a bag. */
function drawUnique<T>(next: () => T | null, k: number, key: (t: T) => string): T[] {
  const out: T[] = []
  let guard = 0
  while (out.length < k && guard < k * 4) {
    guard++
    const t = next()
    if (t === null) break
    if (!out.some(x => key(x) === key(t))) out.push(t)
  }
  return out
}

/**
 * Build `count` specs, each with `verbsPer` distinct drilled verbs and
 * `nounsPer` distinct theme nouns drawn from refilling bags (good spread).
 */
export function buildVerbSpecs(
  verbPool: readonly VerbRef[],
  nounPool: readonly NounRef[],
  count: number,
  verbsPer: WordsPer,
  nounsPer: WordsPer,
  rng: () => number = Math.random
): VerbSentenceSpec[] {
  const nextVerb = makeBag(verbPool, rng)
  const nextNoun = makeBag(nounPool, rng)
  const specs: VerbSentenceSpec[] = []
  for (let index = 0; index < count; index++) {
    const kv = verbsPer === 'mix' ? (rng() < 0.5 ? 1 : 2) : verbsPer
    const kn = nounsPer === 'mix' ? (rng() < 0.5 ? 1 : 2) : nounsPer
    specs.push({
      index,
      verbs: drawUnique(nextVerb, kv, v => v.german),
      nouns: drawUnique(nextNoun, kn, n => n.german)
    })
  }
  return specs
}

// ──────────────────────────── AI generation ───────────────────────────

/** Rotating one-line angles injected per batch so sentences don't converge. */
export const VERB_ANGLE_POOL = [
  'set the scene at breakfast',
  'place the action at the office',
  'use a first-person plural subject (wir)',
  'use a child as the subject',
  'set it on a weekend trip',
  'frame it as a question',
  'put it in the Perfekt (past)',
  'use a 2nd-person informal subject (du)',
  'set it in a kitchen',
  'use a future intention (morgen / nächste Woche)',
  'frame it as advice or a suggestion',
  'set it during bad weather',
  'use a polite request (Sie)',
  'open with an adverb of time',
  'set it at a train station',
  'frame it as something overheard'
] as const

/** Compact label for the chosen CEFR levels. */
export function levelLabel(levels: readonly VerbLevel[]): string {
  if (levels.length === 0) return 'A2–B1'
  const order: VerbLevel[] = ['A1', 'A2', 'B1', 'B2']
  const present = order.filter(l => levels.includes(l))
  if (present.length >= 4) return 'A1–B2'
  return present.join('/')
}

export const VERB_GEN_SYSTEM =
  'You are a German teacher writing translation exercises. For each item you are given ' +
  'one or two German verbs (dictionary form, with an English gloss) and zero or more nouns. ' +
  'Write ONE natural, everyday German sentence that uses the given verb(s) correctly ' +
  'conjugated and naturally incorporates the given noun(s), then give a faithful, natural ' +
  'English translation. Vary the tense naturally for the requested CEFR level (present-heavy ' +
  'for A1, mixing in Perfekt/Präteritum for A2+). Keep sentences concise (6–14 words). ' +
  'Return JSON {"items":[{"index":<number>,"english":"...","german":"...","verbSpansEn":[...],' +
  '"nounSpansEn":[...],"extraWords":[{"en":"...","de":"...","kind":"verb|noun"}]}]} with exactly ' +
  'one entry per requested index. ' +
  '"verbSpansEn" = the exact English word(s) expressing each given verb, in the SAME order, ' +
  'copied verbatim from YOUR English sentence (one entry per given verb). ' +
  '"nounSpansEn" = the exact English word(s) for each given noun, in the SAME order (the noun ' +
  'head, WITHOUT its article; one entry per given noun; use [] when none were given). ' +
  '"extraWords" = EVERY OTHER noun and finite verb in your English sentence that is NOT already ' +
  'listed above (subjects, objects, auxiliaries, modals, incidental nouns), each with "en" = its ' +
  'exact English surface, "de" = its German dictionary form (the infinitive for a verb; the ' +
  'article + nominative singular for a noun, e.g. "die Katze"), and "kind". ' +
  'All "en" surfaces MUST be exact substrings of your English sentence so they can be located.'

export const VERB_GEN_SCHEMA = {
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
          verbSpansEn: { type: 'array', items: { type: 'string' } },
          nounSpansEn: { type: 'array', items: { type: 'string' } },
          extraWords: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                en: { type: 'string' },
                de: { type: 'string' },
                kind: { type: 'string', enum: ['verb', 'noun'] }
              },
              required: ['en', 'de', 'kind']
            }
          }
        },
        required: ['index', 'english', 'german', 'verbSpansEn', 'nounSpansEn', 'extraWords']
      }
    }
  },
  required: ['items']
}

export interface PromptVariation { angles: string[]; seed: string }

export function buildVerbGeneratePrompt(
  specs: readonly VerbSentenceSpec[],
  level: string,
  variation: PromptVariation
): string {
  const lines = specs.map(s => {
    const verbs = s.verbs.length
      ? s.verbs.map(v => `"${v.german}" (${v.english}) [${v.level}]`).join(' + ')
      : '(any fitting verb)'
    const nouns = s.nouns.length
      ? s.nouns.map(n => `${n.article} ${n.german} (${n.english})`).join(' + ')
      : '(any fitting noun)'
    return `#${s.index} — verb(s): ${verbs}; build around noun(s): ${nouns}`
  })
  return (
    `Target CEFR level: ${level}.\n` +
    `Write one German sentence and its English translation for each of the following ${specs.length} item(s):\n` +
    lines.join('\n') +
    `\nVary the framing across the batch — draw inspiration from these angles (do not echo them as text): ${variation.angles.join(' · ')}.` +
    `\nBatch variation seed: ${variation.seed}.` +
    `\nAlso return verbSpansEn, nounSpansEn (one per listed noun, in order), and extraWords (every other noun/verb), each surface an exact substring of your English sentence.`
  )
}

function trimStr(x: unknown): string {
  return typeof x === 'string' ? x.trim() : ''
}

/**
 * Validate one AI sentence pair against its spec. We do NOT require the verb
 * surface to appear (conjugated forms diverge from the infinitive — over-strict
 * checks force slow retries). Span/extra fields are best-effort: malformed or
 * missing values are dropped, never a reason to reject the pair.
 */
export function validateVerbSentencePair(
  raw: unknown,
  spec: VerbSentenceSpec
): GeneratedVerbSentence | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const english = trimStr(e.english)
  const german = trimStr(e.german)
  if (english.length < 3 || german.length < 3) return null

  const out: GeneratedVerbSentence = { ...spec, english, german }

  if (Array.isArray(e.verbSpansEn)) {
    out.verbSpansEn = e.verbSpansEn.filter((x): x is string => typeof x === 'string').map(s => s.trim())
  }
  if (Array.isArray(e.nounSpansEn)) {
    out.nounSpansEn = e.nounSpansEn.filter((x): x is string => typeof x === 'string').map(s => s.trim())
  }
  if (Array.isArray(e.extraWords)) {
    const extras = e.extraWords
      .filter((w): w is Record<string, unknown> => !!w && typeof w === 'object')
      .map(w => ({
        en: trimStr(w.en),
        de: trimStr(w.de),
        kind: w.kind === 'verb' ? ('verb' as const) : ('noun' as const)
      }))
      .filter(w => w.en.length > 0 && w.de.length > 0)
    if (extras.length > 0) out.extraWords = extras
  }
  return out
}

export interface GenerateVerbBatchOptions {
  model: string
  specs: VerbSentenceSpec[]
  level?: string
  maxRetries?: number
  rng?: () => number
}

export interface GenerateVerbBatchResult {
  sentences: GeneratedVerbSentence[]
  rejected: number
  attempts: number
}

/** A short random-ish token for the batch seed (no Date/crypto dependency). */
function makeSeed(rng: () => number): string {
  return Math.floor(rng() * 1_000_000_000).toString(36)
}

/**
 * Ask the AI for a sentence pair per spec in this batch, validating each and
 * retrying only the missing/failed specs up to `maxRetries` extra rounds. Fresh
 * variety angles + seed each attempt so retries don't reproduce failures.
 */
export async function generateVerbSentenceBatch(
  client: AiClient,
  opts: GenerateVerbBatchOptions
): Promise<GenerateVerbBatchResult> {
  const rng = opts.rng ?? Math.random
  const level = opts.level ?? 'A2–B1'
  const maxRetries = opts.maxRetries ?? 2
  const bySpec = new Map(opts.specs.map(s => [s.index, s]))
  const accepted = new Map<number, GeneratedVerbSentence>()
  let rejected = 0
  let attempts = 0

  while (accepted.size < opts.specs.length && attempts <= maxRetries) {
    attempts++
    const remaining = opts.specs.filter(s => !accepted.has(s.index))
    const angles = shuffle([...VERB_ANGLE_POOL], Math.max(3, Math.min(6, remaining.length)), rng)
    const prompt = buildVerbGeneratePrompt(remaining, level, { angles, seed: makeSeed(rng) })

    let text = ''
    try {
      const res = await client.models.generateContent({
        model: opts.model,
        contents: prompt,
        config: {
          systemInstruction: VERB_GEN_SYSTEM,
          responseMimeType: 'application/json',
          responseSchema: VERB_GEN_SCHEMA,
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
      const v = validateVerbSentencePair(raw, spec)
      if (v) accepted.set(idx, v); else rejected++
    }
  }

  const sentences = opts.specs.filter(s => accepted.has(s.index)).map(s => accepted.get(s.index)!)
  return { sentences, rejected, attempts }
}

// ─────────────────────────── Hint inputs ──────────────────────────────
//
// Per ADR-0003: the German for drilled verbs and theme nouns comes from OUR
// stored data (the spec); only incidental/extra words use the AI's German.

/** Build the (surface, kind, reveal) inputs for buildHintSegments. */
export function buildVerbHintInputs(s: GeneratedVerbSentence): HintInput[] {
  const hints: HintInput[] = []
  ;(s.verbSpansEn ?? []).forEach((surf, i) => {
    const v = s.verbs[i]
    if (surf && v) hints.push({ surface: surf, kind: 'verb', reveal: v.german })
  })
  ;(s.nounSpansEn ?? []).forEach((surf, i) => {
    const n = s.nouns[i]
    if (surf && n) hints.push({ surface: surf, kind: 'noun', reveal: `${n.article} ${n.german}` })
  })
  ;(s.extraWords ?? []).forEach(w => {
    if (w.en && w.de) hints.push({ surface: w.en, kind: w.kind, reveal: w.de })
  })
  return hints
}

// ──────────────────────────── AI grading ──────────────────────────────
//
// EN→DE only. Mirrors useSentenceQuiz.gradeAnswer: temperature 0, JSON schema,
// one retry, THROWS if both attempts fail (caller falls back to exact check).

export interface GradeVerbOptions {
  model: string
  english: string        // reference English (shown to the learner)
  german: string         // reference German (generated up front)
  verbsGerman: string[]  // drilled verb infinitives
  nounsGerman: string[]  // theme noun heads
  userAnswer: string
}

export interface VerbAnswerGrade {
  correct: boolean
  tip?: string
  tags?: VerbErrorTag[]
}

const VERB_ERROR_TAGS: readonly VerbErrorTag[] = ['conjugation', 'case', 'word-order', 'noun', 'typo']

const VERB_GRADE_SCHEMA = {
  type: 'object',
  properties: {
    correct: { type: 'boolean' },
    tip: { type: 'string' },
    errorTags: { type: 'array', items: { type: 'string', enum: ['conjugation', 'case', 'word-order', 'noun', 'typo'] } }
  },
  required: ['correct']
}

export function buildVerbGradePrompt(opts: GradeVerbOptions): { system: string; user: string } {
  const system =
    'You are a German teacher grading one translation exercise. The learner was shown the ENGLISH ' +
    'sentence and typed a GERMAN translation. Respond ONLY as JSON {"correct": boolean, "tip": string, ' +
    '"errorTags": string[]} — no prose, no markdown fences. Set "correct" true when the German is a ' +
    'correct, grammatical translation that uses the target verb(s) appropriately; accept natural ' +
    'alternative phrasings, synonyms, and word order — do not require an exact match to the reference. ' +
    'When "correct" is false, set "tip" to ONE short English sentence pinpointing the mistake, and set ' +
    '"errorTags" to every applicable value from exactly: "conjugation" (right verb, wrong form — tense, ' +
    'person, auxiliary, or Partizip), "case" (wrong case for an object the verb governs), "word-order" ' +
    '(verb-second, verb-final, or split separable-prefix placement wrong), "noun" (a wrong theme noun — ' +
    'word, gender, or form), "typo" (a slip elsewhere). When "correct" is true, "tip" may be empty and ' +
    '"errorTags" omitted.'
  const verbs = opts.verbsGerman.length ? opts.verbsGerman.join(', ') : '(any fitting verb)'
  const nouns = opts.nounsGerman.length ? opts.nounsGerman.join(', ') : '(none)'
  const user =
    `ENGLISH (source shown to the learner): ${opts.english}\n` +
    `GERMAN (reference translation): ${opts.german}\n` +
    `TARGET VERB(S): ${verbs}\n` +
    `THEME NOUN(S): ${nouns}\n` +
    `LEARNER'S GERMAN ANSWER: ${opts.userAnswer}`
  return { system, user }
}

export function parseVerbGrade(raw: unknown): VerbAnswerGrade | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.correct !== 'boolean') return null
  const grade: VerbAnswerGrade = { correct: r.correct }
  if (typeof r.tip === 'string') {
    const tip = r.tip.trim()
    if (tip.length > 0) grade.tip = tip
  }
  if (Array.isArray(r.errorTags)) {
    const tags = r.errorTags.filter(
      (t): t is VerbErrorTag => typeof t === 'string' && (VERB_ERROR_TAGS as readonly string[]).includes(t)
    )
    if (tags.length > 0) grade.tags = tags
  }
  return grade
}

export async function gradeVerbAnswer(client: AiClient, opts: GradeVerbOptions): Promise<VerbAnswerGrade> {
  const { system, user } = buildVerbGradePrompt(opts)
  const maxRetries = 1
  let attempts = 0
  let lastError = 'no attempts'
  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model: opts.model,
        contents: user,
        config: { systemInstruction: system, responseMimeType: 'application/json', responseSchema: VERB_GRADE_SCHEMA, temperature: 0 }
      })
      let parsed: unknown
      try { parsed = JSON.parse(response.text ?? '') } catch { lastError = 'malformed JSON'; continue }
      const grade = parseVerbGrade(parsed)
      if (grade === null) { lastError = 'validation failed'; continue }
      return grade
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new Error(`gradeVerbAnswer exhausted ${attempts} attempts. Last error: ${lastError}`)
}

/** The per-item record stored in run meta for one graded verb sentence. */
export function buildVerbDrillItem(
  s: GeneratedVerbSentence,
  correct: boolean,
  tags?: VerbErrorTag[]
): VerbDrillItem {
  const item: VerbDrillItem = {
    verbKeys: s.verbs.map(v => v.german),
    nounKeys: s.nouns.map(n => n.german),
    correct
  }
  if (tags && tags.length > 0) item.tags = tags
  return item
}
