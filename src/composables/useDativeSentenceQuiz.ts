// AI-generated Dativ sentence-translation quiz (T11 Satzübersetzung, EN→DE,
// AI-graded) — the Dativ module's ONLY AI drill; everything else is offline
// per ADR-0007.
//
// The learner picks semantic families (or the weak-verb focus); one drilled
// dative verb per sentence is sampled up front from a refilling bag, so all
// randomization is decided before any AI call (ADR-0004). The English/German
// pairs then generate progressively (ADR-0008) and the AI grades each answer,
// assigning [Dative error tag]s (CONTEXT.md): the accusative-under-English-
// pull slip is 'case', the inverted-experiencer slips are 'subject', a
// swapped accusative near-synonym is 'twin'.
//
// The prompts spell out the full JSON envelope in prose because the
// local-claude dev bridge drops responseSchema.

import { shuffle } from '../data/pool'
import type { Rng } from '../data/pool'
import { DATIVE_VERBS } from '../data/dativeVerbs'
import type { DativeFamily } from './useDativeDrill'
import type { AiClient } from './useClaude'
import type { DatErrorTag, DatDrillItem } from './useQuizHistory'
import type { PromptVariation } from './useVerbSentenceQuiz'
import { validateIdiom, type IdiomInfo } from './useIdiomHighlight'

/** A Dativ error category the AI grader may assign (re-exported from history). */
export type { DatErrorTag } from './useQuizHistory'

// ─────────────────────────────── Types ────────────────────────────────

/** One drilled dative verb, decided before the AI writes anything. */
export interface DativeSentenceSpec {
  index: number
  verb: string            // DATIVE_VERBS key
  family: DativeFamily
}

/** A spec once the AI has produced the sentence pair. */
export interface GeneratedDatSentence extends DativeSentenceSpec {
  english: string
  german: string          // reference translation containing the target verb
  usedForm: string        // the target verb's form exactly as in `german` (one token)
  dativeObject: string    // the dative NP/pronoun exactly as in `german`
  /** Set only when `german` uses an idiom or fixed expression whose literal
   *  wording doesn't correspond to the English — validated (Task 1: idiom
   *  highlighting) against `german` before being stored. */
  idiom?: IdiomInfo
}

// ───────────────────────────── Pure helpers ───────────────────────────

/** A refilling shuffled bag: draws spread the pool before any repeat. */
function makeBag<T>(pool: readonly T[], rng: Rng) {
  let bag: T[] = []
  let i = 0
  return function next(): T | null {
    if (pool.length === 0) return null
    if (i >= bag.length) { bag = shuffle(pool, pool.length, rng); i = 0 }
    return bag[i++] ?? null
  }
}

/** Build `count` specs, one dative verb each, spread via a refilling bag. */
export function buildDativeSentenceSpecs(
  verbPool: readonly string[],
  count: number,
  rng: Rng = Math.random
): DativeSentenceSpec[] {
  if (verbPool.length === 0) return []
  const next = makeBag(verbPool, rng)
  const specs: DativeSentenceSpec[] = []
  for (let index = 0; index < count; index++) {
    const verb = next()
    if (!verb) break
    specs.push({ index, verb, family: DATIVE_VERBS[verb]?.family ?? 'recipient' })
  }
  return specs
}

// ──────────────────────────── AI generation ───────────────────────────

/** Rotating one-line angles injected per batch so sentences don't converge. */
export const DAT_ANGLE_POOL = [
  'set it in a family kitchen',
  'set it at work between colleagues',
  'set it at a birthday party',
  'set it in a shop or at a market',
  'set it at school or in a lecture',
  'set it on a phone call',
  'set it at the doctor\'s office',
  'frame it as a question',
  'frame it as advice or a warning',
  'use a 2nd-person informal subject (du)',
  'use a first-person plural subject (wir)',
  'use a polite request (Sie)',
  'put it in the Perfekt (past)',
  'open with an adverb of time',
  'contrast two people\'s opinions',
  'set it on a trip or at a station',
] as const

export const DAT_GEN_SYSTEM = `You are a German-language exercise writer for an app drilling DATIVE VERBS — verbs whose only object is dative (helfen, danken, gefallen, folgen, fehlen, …).
For each requested item you are given a TARGET verb with teaching notes. Write:
- "english": one natural English sentence (level-appropriate, 6–14 words, no German words anywhere) whose German translation must use the TARGET verb with a dative object. Use the natural ENGLISH construction: for experiencer verbs that is the English mirror ("Anna likes the shoes" for gefallen, "I miss my brother" for fehlen) so the learner must invert the sentence themselves; for verbs whose English equivalent is plain transitive ("help", "thank", "follow") write it that way — the accusative pull IS the drill.
- "german": the reference translation, natural German, using the TARGET verb and its dative object. Mostly Präsens, occasionally Perfekt.
- "usedForm": the finite form or participle of the TARGET verb exactly as it appears in your German sentence, a single word (e.g. "hilft", "geholfen", "fällt").
- "dativeObject": the dative noun phrase or pronoun in your German sentence, exactly as written (e.g. "meiner Mutter", "ihm").
- "idiom": OPTIONAL — include it ONLY when your German sentence uses an idiom or fixed expression whose literal wording does NOT correspond to the English source (omit the field entirely for an ordinary sentence with no such idiom); "spans" = the exact words of the idiom as they appear, inflected, in your German sentence, split into 1–3 separate entries when other words interrupt the idiom (e.g. ["wechselte", "den Besitzer"]); "form" = its dictionary form (e.g. "den Besitzer wechseln"); "gloss" = its English equivalent (e.g. "to change hands").
Return ONLY JSON in exactly this shape: {"items":[{"index":<number>,"english":"...","german":"...","usedForm":"...","dativeObject":"...","idiom":{"spans":["..."],"form":"...","gloss":"..."}}]}
No markdown fences, no commentary.`

export const DAT_GEN_SCHEMA = {
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
          usedForm: { type: 'string' },
          dativeObject: { type: 'string' },
          idiom: {
            type: 'object',
            properties: {
              spans: { type: 'array', items: { type: 'string' } },
              form: { type: 'string' },
              gloss: { type: 'string' }
            },
            required: ['spans', 'form', 'gloss']
          }
        },
        required: ['index', 'english', 'german', 'usedForm', 'dativeObject']
      }
    }
  },
  required: ['items']
}

function specLine(s: DativeSentenceSpec): string {
  const e = DATIVE_VERBS[s.verb]
  const notes: string[] = [`family: ${s.family}`]
  if (e?.experiencer) notes.push('experiencer verb — in the GERMAN the thing is the nominative subject controlling agreement, the person is dative; the ENGLISH uses its natural mirror construction')
  if (e?.englishPull) notes.push('the English equivalent takes a plain direct object — write it that way')
  if (e?.twin && e.twin !== s.verb) notes.push(`do NOT use the accusative near-synonym "${e.twin}" in the German`)
  return `#${s.index} — TARGET verb: "${s.verb}" (${notes.join('; ')})`
}

export function buildDatGeneratePrompt(
  specs: readonly DativeSentenceSpec[],
  variation: PromptVariation
): string {
  return (
    `Target CEFR level: B1–B2.\n` +
    `Write one English sentence and its German reference translation for each of the following ${specs.length} item(s), each built around its TARGET dative verb:\n` +
    specs.map(specLine).join('\n') +
    `\nVary the framing across the batch — draw inspiration from these angles (do not echo them as text): ${variation.angles.join(' · ')}.` +
    `\nBatch variation seed: ${variation.seed}.` +
    `\nInclude "idiom" ONLY when your German sentence uses a genuine idiom or fixed expression whose literal wording doesn't correspond to the English — omit it entirely otherwise.`
  )
}

function trimStr(x: unknown): string {
  return typeof x === 'string' ? x.trim() : ''
}

/**
 * Validate one AI sentence pair against its spec. The German MUST contain the
 * reported usedForm and dativeObject (the verb IS the drill), and the English
 * must not leak the German infinitive. Anything malformed rejects the pair.
 */
export function validateDatSentencePair(
  raw: unknown,
  spec: DativeSentenceSpec
): GeneratedDatSentence | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  if (typeof e.index === 'number' && e.index !== spec.index) return null

  const english = trimStr(e.english)
  const german = trimStr(e.german)
  const usedForm = (trimStr(e.usedForm).split(/\s+/)[0] ?? '')
  const dativeObject = trimStr(e.dativeObject)
  if (english.length < 3 || german.length < 3 || usedForm.length < 2 || dativeObject.length < 2) return null

  const lowGerman = german.toLowerCase()
  if (!lowGerman.includes(usedForm.toLowerCase())) return null
  if (!lowGerman.includes(dativeObject.toLowerCase())) return null

  // Leak gate: the English may never contain the target infinitive
  // ('sich nähern' → check 'nähern').
  const head = spec.verb.split(' ').pop()!
  const esc = head.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (new RegExp(`(^|[^a-zäöüß])${esc}($|[^a-zäöüß])`, 'i').test(english)) return null

  const out: GeneratedDatSentence = { ...spec, english, german, usedForm, dativeObject }

  // Idiom hint data, same fail-safe posture as the rest of this validator's
  // best-effort fields: validated against the German that was just accepted,
  // never a reason to reject the pair itself (Task 1: idiom highlighting).
  const idiom = validateIdiom(german, e.idiom)
  if (idiom) out.idiom = idiom

  return out
}

export interface GenerateDatBatchOptions {
  model: string
  specs: DativeSentenceSpec[]
  maxRetries?: number
  rng?: Rng
}

export interface GenerateDatBatchResult {
  sentences: GeneratedDatSentence[]
  failedIndices: number[]
}

/** A short random-ish token for the batch seed (no Date/crypto dependency). */
function makeSeed(rng: Rng): string {
  return Math.floor(rng() * 1_000_000_000).toString(36)
}

/**
 * Ask the AI for a sentence pair per spec, validating each and retrying only
 * the missing/failed specs. Never throws — a spec that never validates is
 * simply listed in failedIndices. Mirrors generateDwSentenceBatch.
 */
export async function generateDatSentenceBatch(
  client: AiClient,
  opts: GenerateDatBatchOptions
): Promise<GenerateDatBatchResult> {
  const rng = opts.rng ?? Math.random
  const maxRetries = opts.maxRetries ?? 2
  const bySpec = new Map(opts.specs.map(s => [s.index, s]))
  const accepted = new Map<number, GeneratedDatSentence>()
  let attempts = 0

  while (accepted.size < opts.specs.length && attempts <= maxRetries) {
    attempts++
    const remaining = opts.specs.filter(s => !accepted.has(s.index))
    const angles = shuffle([...DAT_ANGLE_POOL], Math.max(3, Math.min(6, remaining.length)), rng)
    const prompt = buildDatGeneratePrompt(remaining, { angles, seed: makeSeed(rng) })

    let text = ''
    try {
      const res = await client.models.generateContent({
        model: opts.model,
        contents: prompt,
        config: {
          systemInstruction: DAT_GEN_SYSTEM,
          responseMimeType: 'application/json',
          responseSchema: DAT_GEN_SCHEMA,
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
      const v = validateDatSentencePair(raw, spec)
      if (v) accepted.set(idx, v)
    }
  }

  const sentences = opts.specs.filter(s => accepted.has(s.index)).map(s => accepted.get(s.index)!)
  const failedIndices = opts.specs.filter(s => !accepted.has(s.index)).map(s => s.index)
  return { sentences, failedIndices }
}

// ──────────────────────────── AI grading ──────────────────────────────
//
// EN→DE only, always WITH error tags. Temperature 0, JSON schema, one retry;
// THROWS if both attempts fail (caller falls back to a local check),
// mirroring gradeDwAnswer / gradeDacAnswer / gradeVerbAnswer.

export interface DatAnswerGrade {
  correct: boolean
  tip: string
  tags: DatErrorTag[]
}

const DAT_ERROR_TAGS: readonly DatErrorTag[] =
  ['case', 'subject', 'twin', 'object-order', 'conjugation', 'word-order', 'noun', 'typo']

const DAT_GRADE_SCHEMA = {
  type: 'object',
  properties: {
    correct: { type: 'boolean' },
    tip: { type: 'string' },
    errorTags: { type: 'array', items: { type: 'string', enum: ['case', 'subject', 'twin', 'object-order', 'conjugation', 'word-order', 'noun', 'typo'] } }
  },
  required: ['correct']
}

const DAT_GRADE_SYSTEM = `You grade a learner's German translation in a DATIVE-VERB drill. Judge the answer against the English sentence and the reference German. The answer is CORRECT when it preserves the meaning, uses the TARGET verb, and is acceptable German — a different word order or a different but correctly dative object phrase is fine. Apply these drill-specific rules:
- The TARGET verb's object must be DATIVE. Accusative (or any other case) where the dative belongs: tag "case". This is the drill's core error — English pulls toward "mich" / "den Mann".
- For experiencer verbs (gefallen, schmecken, fehlen, gelingen, …) the THING must be the nominative subject controlling verb agreement, the person dative. Person-as-subject (*Ich gefalle das Buch) or agreement with the dative (*Die Schuhe gefällt mir): tag "subject".
- If the learner replaced the TARGET verb with an accusative near-synonym (named below when one exists), or bent the sentence around such a twin: incorrect, tag "twin".
- Dative/accusative objects in the wrong sequence: tag "object-order". Verb placement gone wrong (verb-second, verb-final, separable prefix): tag "word-order".
- "conjugation": right verb, wrong form. "noun": a wrong noun. "typo": a small slip elsewhere.
errorTags: multiple allowed; empty when correct. "tip": ONE short English sentence naming what to fix (or reinforcing why the answer is right). Never reveal an unrelated better translation.
Return ONLY JSON in exactly this shape: {"correct": true|false, "tip": "...", "errorTags": ["..."]}
No markdown fences, no commentary.`

export interface DatGradePromptInput {
  spec: GeneratedDatSentence
  answer: string
}

export interface GradeDatOptions extends DatGradePromptInput {
  model: string
}

export function buildDatGradePrompt(opts: DatGradePromptInput): { system: string; user: string } {
  const s = opts.spec
  const entry = DATIVE_VERBS[s.verb]
  const user =
    `ENGLISH (source shown to the learner): ${s.english}\n` +
    `GERMAN (reference translation): ${s.german}\n` +
    `TARGET VERB: "${s.verb}" (dative verb, family ${s.family})\n` +
    (entry?.twin && entry.twin !== s.verb ? `ACCUSATIVE TWIN to reject: "${entry.twin}"\n` : '') +
    `LEARNER'S GERMAN ANSWER: ${opts.answer}`
  return { system: DAT_GRADE_SYSTEM, user }
}

export function parseDatGrade(raw: unknown): DatAnswerGrade | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.correct !== 'boolean') return null
  const tip = typeof r.tip === 'string' ? r.tip.trim() : ''
  const tags = Array.isArray(r.errorTags)
    ? r.errorTags.filter((t): t is DatErrorTag => typeof t === 'string' && (DAT_ERROR_TAGS as readonly string[]).includes(t))
    : []
  return { correct: r.correct, tip, tags }
}

export async function gradeDativeSentence(client: AiClient, opts: GradeDatOptions): Promise<DatAnswerGrade> {
  const { system, user } = buildDatGradePrompt(opts)
  const maxRetries = 1
  let attempts = 0
  let lastError = 'no attempts'
  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model: opts.model,
        contents: user,
        config: { systemInstruction: system, responseMimeType: 'application/json', responseSchema: DAT_GRADE_SCHEMA, temperature: 0 }
      })
      let parsed: unknown
      try { parsed = JSON.parse(response.text ?? '') } catch { lastError = 'malformed JSON'; continue }
      const grade = parseDatGrade(parsed)
      if (grade === null) { lastError = 'validation failed'; continue }
      return grade
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new Error(`gradeDativeSentence exhausted ${attempts} attempts. Last error: ${lastError}`)
}

/** The per-item record stored in run meta for one graded dative sentence. */
export function buildDatDrillItem(
  s: GeneratedDatSentence,
  correct: boolean,
  tags?: DatErrorTag[]
): DatDrillItem {
  const item: DatDrillItem = { verb: s.verb, family: s.family, correct }
  if (tags && tags.length > 0) item.tags = tags
  return item
}
