// AI-generated da-compound sentence-translation quiz (EN→DE and DE→EN, AI-graded).
//
// The learner picks a collocation pool (level/role/preposition) and a noun theme.
// We sample per-sentence "specs" (1 drilled collocation + 1–2 theme nouns) up
// front — all randomization is decided before any AI call (ADR-0004) — then
// generate the English+German sentence pairs progressively. Across the batch the
// AI alternates the construction: roughly half plain prepositional objects
// (Ich freue mich auf das Konzert) and half da-compound / Pronominaladverb
// constructions pointing at a clause or context (Ich freue mich darauf, dass …),
// so the learner meets both surfaces. The AI also returns the German dictionary
// form for every highlighted word so incidental nouns can be hinted (ADR-0003).
//
// Direction mirrors the preposition sentence quiz (useSentenceQuiz):
//  - 'en-de': the learner reads English, types German — graded WITH error tags.
//  - 'de-en': the learner reads German, types English — meaning-only, NO tags.

import { shuffle } from '../data/pool'
import { COLLOCATION_LEVELS } from '../data/collocations'
import type { Collocation, CollocationCase, CollocationLevel } from '../data/collocations'
import type { NounRef, HintInput, Direction } from './useSentenceQuiz'
import type { ExtraWord, PromptVariation } from './useVerbSentenceQuiz'
import type { AiClient } from './useClaude'
import type { DacErrorTag, DacDrillItem } from './useQuizHistory'

// ─────────────────────────────── Types ────────────────────────────────

/** A drilled collocation handed to the AI to build a sentence around. */
export interface CollocRef {
  id: string
  word: string          // German headword as displayed (may include "sich" / an article)
  english: string       // gloss, e.g. "to wait for", "to look forward to"
  preposition: string   // the governed preposition, lowercase, e.g. "auf"
  case: CollocationCase // 'accusative' | 'dative'
  level: CollocationLevel
}

/** A da-compound error category the AI grader may assign (re-exported from history). */
export type { DacErrorTag } from './useQuizHistory'
/** Extra highlighted word with AI-supplied German (shared shape with the verb quiz). */
export type { ExtraWord } from './useVerbSentenceQuiz'

/** One drilled collocation + theme nouns for one sentence, before the AI writes it. */
export interface DacSentenceSpec {
  index: number
  colloc: CollocRef
  nouns: NounRef[]
}

/** A spec once the AI has produced the sentence pair + highlight surfaces. */
export interface GeneratedDacSentence extends DacSentenceSpec {
  english: string
  german: string
  /** Exact English surface expressing the collocation (verbatim substring). */
  collocSpanEn?: string
  /** Exact English surface for each theme noun, in order. */
  nounSpansEn?: string[]
  /** Other highlighted nouns/verbs with AI-supplied German. */
  extraWords?: ExtraWord[]
}

// ───────────────────────────── Pure helpers ───────────────────────────

/** Project a stored Collocation to the lean ref the prompt needs. */
export function collocToRef(c: Collocation): CollocRef {
  return {
    id: c.id,
    word: c.word,
    english: c.english,
    preposition: c.preposition,
    case: c.case,
    level: c.level
  }
}

/** English + German name for a governed case, e.g. "accusative (Akkusativ)". */
function caseName(c: CollocationCase): string {
  return c === 'accusative' ? 'accusative (Akkusativ)' : 'dative (Dativ)'
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
 * Build `count` specs, each with exactly ONE drilled collocation (drawn from a
 * refilling bag for good spread) and `nounsPer` distinct theme nouns. Returns []
 * for an empty collocation pool — the collocation IS the drill, so a sentence
 * without one is meaningless (unlike the verb quiz, where verbs may be absent).
 */
export function buildDacSpecs(
  collocPool: readonly CollocRef[],
  nounPool: readonly NounRef[],
  count: number,
  nounsPer: 1 | 2 | 'mix',
  rng: () => number = Math.random
): DacSentenceSpec[] {
  if (collocPool.length === 0) return []
  const nextColloc = makeBag(collocPool, rng)
  const nextNoun = makeBag(nounPool, rng)
  const specs: DacSentenceSpec[] = []
  for (let index = 0; index < count; index++) {
    const kn = nounsPer === 'mix' ? (rng() < 0.5 ? 1 : 2) : nounsPer
    const colloc = drawUnique(nextColloc, 1, c => c.id)[0]
    if (!colloc) break
    specs.push({
      index,
      colloc,
      nouns: drawUnique(nextNoun, kn, n => n.german)
    })
  }
  return specs
}

/** Compact CEFR label for the chosen collocation levels — B1/B2/C1 are real CEFR
 *  bands here, so we simply slash-join the distinct present levels in canonical
 *  order (no batch-band normalization is needed, unlike the verb levels). */
export function dacLevelLabel(levels: readonly CollocationLevel[]): string {
  if (levels.length === 0) return 'B1–C1'
  return COLLOCATION_LEVELS.filter(l => levels.includes(l)).join('/')
}

// ──────────────────────────── AI generation ───────────────────────────

/** Rotating one-line angles injected per batch so sentences don't converge.
 *  Some deliberately nudge toward the da-compound construction (pointing at a
 *  clause or at prior context), so both surfaces get exercised across a run. */
export const DAC_ANGLE_POOL = [
  'set the scene at breakfast',
  'place the action at the office',
  'use a first-person plural subject (wir)',
  'point the compound at a following dass-clause',
  'point the compound at a following zu-infinitive (darauf, … zu …)',
  'reference something already mentioned (Ich freue mich schon darauf)',
  'set it on a weekend trip',
  'frame it as a question',
  'put it in the Perfekt (past)',
  'use a 2nd-person informal subject (du)',
  'set it in a kitchen',
  'use a future intention (morgen / nächste Woche)',
  'frame it as advice or a suggestion',
  'use a polite request (Sie)',
  'open with an adverb of time',
  'set it at a train station',
  'contrast two people in the sentence'
] as const

export const DAC_GEN_SYSTEM =
  'You are a German teacher writing translation exercises on the topic ' +
  '"Verben/Adjektive/Nomen mit festen Präpositionen und Pronominaladverbien (da-compounds)". ' +
  'For each item you are given ONE German collocation — a verb, adjective, or noun that governs a ' +
  'FIXED preposition + case (shown as headword, preposition, and governed case, with an English gloss) — ' +
  'and zero or more theme nouns. Write ONE natural German sentence at the target CEFR level that uses the ' +
  'collocation CORRECTLY: the exact headword, its exact preposition, and the governed case, and that ' +
  'naturally incorporates the given theme noun(s); then give a faithful, natural English translation. ' +
  'ALTERNATE THE CONSTRUCTION across the batch: for roughly HALF of the items use the plain prepositional ' +
  'object with a noun phrase (e.g. "Ich freue mich auf das Konzert"), and for roughly the OTHER HALF use ' +
  'the da-compound / Pronominaladverb pointing at a clause or at the surrounding context (e.g. ' +
  '"Ich freue mich darauf, dass das Konzert bald beginnt" or "Ich freue mich schon darauf"). ' +
  'A da-compound (darauf, damit, daran, darüber …) may ONLY stand for a THING, a fact, or a clause — ' +
  'NEVER for a person. So only build the da-compound construction when the prepositional object is a ' +
  'thing, a fact, or a clause; if the natural object is a PERSON, keep the plain preposition + noun/pronoun ' +
  '(e.g. "Ich warte auf meinen Bruder") and do NOT force a da-compound. Keep sentences concise (6–16 words). ' +
  'Return JSON {"items":[{"index":<number>,"english":"...","german":"...","collocSpanEn":"...",' +
  '"nounSpansEn":[...],"extraWords":[{"en":"...","de":"...","kind":"verb|noun"}]}]} with exactly one entry ' +
  'per requested index. ' +
  '"collocSpanEn" = the exact English word(s) expressing the collocation (its headword together with the ' +
  'English preposition, e.g. "wait for", "look forward to"), copied verbatim from YOUR English sentence. ' +
  '"nounSpansEn" = the exact English word(s) for each given theme noun, in the SAME order (the noun head, ' +
  'WITHOUT its article; one entry per given noun; use [] when none were given). ' +
  '"extraWords" = EVERY OTHER noun and finite verb in your English sentence NOT already listed above ' +
  '(subjects, objects, auxiliaries, modals, incidental nouns), each with "en" = its exact English surface, ' +
  '"de" = its German dictionary form (the infinitive for a verb; the article + nominative singular for a ' +
  'noun, e.g. "die Katze"), and "kind". ' +
  'All "en" surfaces MUST be exact substrings of your English sentence so they can be located.'

export const DAC_GEN_SCHEMA = {
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
          collocSpanEn: { type: 'string' },
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
        required: ['index', 'english', 'german', 'collocSpanEn', 'nounSpansEn', 'extraWords']
      }
    }
  },
  required: ['items']
}

export function buildDacGeneratePrompt(
  specs: readonly DacSentenceSpec[],
  level: string,
  variation: PromptVariation
): string {
  const lines = specs.map(s => {
    const c = s.colloc
    const colloc = `"${c.word} ${c.preposition}" (${c.english}) — preposition "${c.preposition}" + ${caseName(c.case)} [${c.level}]`
    const nouns = s.nouns.length
      ? s.nouns.map(n => `${n.article} ${n.german} (${n.english})`).join(' + ')
      : '(any fitting noun)'
    return `#${s.index} — collocation: ${colloc}; build around noun(s): ${nouns}`
  })
  return (
    `Target CEFR level: ${level}.\n` +
    `Write one German sentence and its English translation for each of the following ${specs.length} item(s). ` +
    `Each sentence MUST use its collocation's exact preposition and governed case:\n` +
    lines.join('\n') +
    `\nAlternate the construction across the batch: for roughly HALF the items express the object as a plain ` +
    `prepositional noun phrase (e.g. "auf das Konzert"), and for roughly the other HALF use the da-compound ` +
    `pointing at a clause or context (e.g. "darauf, dass …" / "schon darauf"). Use a da-compound ONLY for a ` +
    `thing, a fact, or a clause — never for a person.` +
    `\nVary the framing across the batch — draw inspiration from these angles (do not echo them as text): ${variation.angles.join(' · ')}.` +
    `\nBatch variation seed: ${variation.seed}.` +
    `\nAlso return collocSpanEn (the English words expressing the collocation), nounSpansEn (one per listed noun, in order), and extraWords (every other noun/verb) — each surface an exact substring of your English sentence.`
  )
}

function trimStr(x: unknown): string {
  return typeof x === 'string' ? x.trim() : ''
}

/**
 * Validate one AI sentence pair against its spec. We do NOT require the
 * collocation surface to appear (constructions diverge — a da-compound has no
 * separate object surface). Span/extra fields are best-effort: malformed or
 * missing values are dropped, never a reason to reject the pair.
 */
export function validateDacSentencePair(
  raw: unknown,
  spec: DacSentenceSpec
): GeneratedDacSentence | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const english = trimStr(e.english)
  const german = trimStr(e.german)
  if (english.length < 3 || german.length < 3) return null

  const out: GeneratedDacSentence = { ...spec, english, german }

  const span = trimStr(e.collocSpanEn)
  if (span.length > 0) out.collocSpanEn = span
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

export interface GenerateDacBatchOptions {
  model: string
  specs: DacSentenceSpec[]
  level?: string
  maxRetries?: number
  rng?: () => number
}

export interface GenerateDacBatchResult {
  sentences: GeneratedDacSentence[]
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
 * variety angles + seed each attempt so retries don't reproduce failures. Never
 * throws — a spec that never validates is simply absent from `sentences`.
 */
export async function generateDacSentenceBatch(
  client: AiClient,
  opts: GenerateDacBatchOptions
): Promise<GenerateDacBatchResult> {
  const rng = opts.rng ?? Math.random
  const level = opts.level ?? 'B1–C1'
  const maxRetries = opts.maxRetries ?? 2
  const bySpec = new Map(opts.specs.map(s => [s.index, s]))
  const accepted = new Map<number, GeneratedDacSentence>()
  let rejected = 0
  let attempts = 0

  while (accepted.size < opts.specs.length && attempts <= maxRetries) {
    attempts++
    const remaining = opts.specs.filter(s => !accepted.has(s.index))
    const angles = shuffle([...DAC_ANGLE_POOL], Math.max(3, Math.min(6, remaining.length)), rng)
    const prompt = buildDacGeneratePrompt(remaining, level, { angles, seed: makeSeed(rng) })

    let text = ''
    try {
      const res = await client.models.generateContent({
        model: opts.model,
        contents: prompt,
        config: {
          systemInstruction: DAC_GEN_SYSTEM,
          responseMimeType: 'application/json',
          responseSchema: DAC_GEN_SCHEMA,
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
      const v = validateDacSentencePair(raw, spec)
      if (v) accepted.set(idx, v); else rejected++
    }
  }

  const sentences = opts.specs.filter(s => accepted.has(s.index)).map(s => accepted.get(s.index)!)
  return { sentences, rejected, attempts }
}

// ─────────────────────────── Hint inputs ──────────────────────────────
//
// Per ADR-0003: the German for the drilled collocation and theme nouns comes
// from OUR stored data (the spec); only incidental/extra words use the AI's
// German. The collocation reveal is "headword + preposition" (e.g. "warten auf",
// "sich freuen auf") so the learner sees the governance they must reproduce.

/** Build the (surface, kind, reveal) inputs for buildHintSegments. */
export function buildDacHintInputs(s: GeneratedDacSentence): HintInput[] {
  const hints: HintInput[] = []
  if (s.collocSpanEn && s.colloc) {
    hints.push({ surface: s.collocSpanEn, kind: 'verb', reveal: `${s.colloc.word} ${s.colloc.preposition}` })
  }
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
// EN→DE grades WITH error tags (preposition / compound / case / noun / typo);
// DE→EN grades meaning ONLY and returns no tags (prep-quiz precedent,
// useSentenceQuiz.ts L524-536). Temperature 0, JSON schema, one retry; THROWS
// if both attempts fail (caller falls back to a local check).

export interface DacGradePromptInput {
  direction: Direction
  english: string       // reference English (generated up front)
  german: string        // reference German (generated up front)
  collocWord: string    // collocation headword, e.g. "sich freuen"
  preposition: string   // governed preposition, e.g. "auf"
  case: CollocationCase // 'accusative' | 'dative'
  userAnswer: string    // what the learner typed
}

export interface GradeDacOptions extends DacGradePromptInput {
  model: string
}

export interface DacAnswerGrade {
  correct: boolean
  tip?: string
  tags?: DacErrorTag[]
}

const DAC_ERROR_TAGS: readonly DacErrorTag[] = ['preposition', 'compound', 'case', 'noun', 'typo']

const DAC_GRADE_SCHEMA = {
  type: 'object',
  properties: {
    correct: { type: 'boolean' },
    tip: { type: 'string' },
    errorTags: { type: 'array', items: { type: 'string', enum: ['preposition', 'compound', 'case', 'noun', 'typo'] } }
  },
  required: ['correct']
}

export function buildDacGradePrompt(opts: DacGradePromptInput): { system: string; user: string } {
  const cName = caseName(opts.case)
  const common =
    'You are a German teacher grading one translation exercise on collocations with fixed prepositions ' +
    'and their da-compounds (Pronominaladverbien). Respond ONLY as JSON — no prose, no markdown fences. '

  if (opts.direction === 'en-de') {
    const system =
      common +
      'Match the schema {"correct": boolean, "tip": string, "errorTags": string[]}. ' +
      'The learner was shown the ENGLISH sentence and typed a GERMAN translation. Set "correct" true when the ' +
      'German is a correct, grammatical translation that expresses the target collocation with its correct ' +
      'preposition and governed case. ACCEPT natural alternatives — in particular BOTH constructions are ' +
      'correct when they convey the meaning: the plain prepositional object with a noun phrase (e.g. ' +
      '"auf das Konzert") AND the da-compound pointing at a clause or context (e.g. "darauf, dass …"). ' +
      'Do not require an exact match to the reference. ' +
      'When "correct" is false, set "tip" to ONE short English sentence pinpointing the mistake, and set ' +
      '"errorTags" to every applicable value from EXACTLY these five: ' +
      '"preposition" (the governed preposition is wrong or missing — e.g. "warten für" instead of "warten auf"); ' +
      '"compound" (the preposition is RIGHT but the da-compound is malformed — *daauf / *darmit instead of ' +
      'darauf / damit — OR a da-compound is used to refer to a PERSON, where German requires preposition + ' +
      'pronoun such as "auf ihn", OR a preposition + pronoun is used for a THING or idea, where German requires ' +
      'the da-compound such as "darauf"); ' +
      '"case" (the preposition is correct but the governed case is wrong — e.g. "auf dem Bus" for an accusative ' +
      'object, a mis-inflected article or ending); ' +
      '"noun" (a wrong theme noun — wrong word, gender, or form); ' +
      '"typo" (a small slip elsewhere, not on the preposition, the compound, the case, or a theme noun). ' +
      'Use several tags when several things are wrong. When "correct" is true, "tip" may be empty and ' +
      '"errorTags" omitted.'
    const user =
      `ENGLISH (source shown to the learner): ${opts.english}\n` +
      `GERMAN (reference translation): ${opts.german}\n` +
      `TARGET COLLOCATION: "${opts.collocWord} ${opts.preposition}" — governs ${cName}.\n` +
      `LEARNER'S GERMAN ANSWER: ${opts.userAnswer}`
    return { system, user }
  }

  // direction === 'de-en' — meaning only, NO error tags.
  const system =
    common +
    'Match the schema {"correct": boolean, "tip": string}. ' +
    'The learner was shown the GERMAN sentence and typed an ENGLISH translation. Judge ONLY whether the ' +
    'learner\'s English correctly conveys the MEANING of the German sentence — in particular whether they ' +
    'decoded the collocation and any da-compound correctly (a da-compound like "darauf" rarely means "on it"). ' +
    'Accept paraphrases and synonyms; meaning matters, not an exact match, and the English grammar/spelling is ' +
    'not graded. Do NOT return errorTags. Set "correct" true when the meaning is conveyed; when false, set "tip" ' +
    'to ONE short English sentence naming what the meaning got wrong.'
  const user =
    `GERMAN (source shown to the learner): ${opts.german}\n` +
    `ENGLISH (reference translation): ${opts.english}\n` +
    `TARGET COLLOCATION: "${opts.collocWord} ${opts.preposition}" — governs ${cName}.\n` +
    `LEARNER'S ENGLISH ANSWER: ${opts.userAnswer}`
  return { system, user }
}

export function parseDacGrade(raw: unknown): DacAnswerGrade | null {
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
      (t): t is DacErrorTag => typeof t === 'string' && (DAC_ERROR_TAGS as readonly string[]).includes(t)
    )
    if (tags.length > 0) grade.tags = tags
  }
  return grade
}

export async function gradeDacAnswer(client: AiClient, opts: GradeDacOptions): Promise<DacAnswerGrade> {
  const { system, user } = buildDacGradePrompt(opts)
  const maxRetries = 1
  let attempts = 0
  let lastError = 'no attempts'
  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model: opts.model,
        contents: user,
        config: { systemInstruction: system, responseMimeType: 'application/json', responseSchema: DAC_GRADE_SCHEMA, temperature: 0 }
      })
      let parsed: unknown
      try { parsed = JSON.parse(response.text ?? '') } catch { lastError = 'malformed JSON'; continue }
      const grade = parseDacGrade(parsed)
      if (grade === null) { lastError = 'validation failed'; continue }
      // DE→EN is meaning-only: never carry tags even if the model returned some.
      if (opts.direction === 'de-en') delete grade.tags
      return grade
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new Error(`gradeDacAnswer exhausted ${attempts} attempts. Last error: ${lastError}`)
}

/** The per-item record stored in run meta for one graded da-compound sentence. */
export function buildDacDrillItem(
  s: GeneratedDacSentence,
  correct: boolean,
  tags?: DacErrorTag[]
): DacDrillItem {
  const item: DacDrillItem = {
    collocId: s.colloc.id,
    collocWord: s.colloc.word,
    prepGerman: s.colloc.preposition,
    nounKeys: s.nouns.map(n => n.german),
    correct
  }
  if (tags && tags.length > 0) item.tags = tags
  return item
}
