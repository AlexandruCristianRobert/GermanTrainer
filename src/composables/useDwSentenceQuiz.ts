// AI-generated direction-word (hin-/her-) sentence-translation quiz (EN→DE, AI-graded).
//
// The learner picks a pool of adverb-pair elements (auf, ein, aus, unter, über,
// ab, …) and a noun theme. We sample per-sentence "specs" up front — one drilled
// pair-element + a random hin/her side (deciding the TARGET compound) + 1–2
// theme nouns — all randomization is decided before any AI call (ADR-0004) —
// then generate the English+German sentence pairs progressively. The AI is
// told the TARGET compound and must write an English sentence whose German
// translation uses it, with the speaker's position spelled out unambiguously
// (a scene, not a coin flip) so hin vs. her is actually determined by the text.
//
// hin = motion AWAY from the speaker, her = motion TOWARD the speaker — this
// rule holds everywhere in this module. Two pairs (unter/ab) share the same
// "downward" sense in different registers, so their hin-/her- forms are
// mutually acceptable "vertical synonyms" (hinab≈hinunter, herab≈herunter);
// VERTICAL_TWIN + twinCompound model that equivalence for validation/grading.
//
// Per design decision 1: hints NEVER reveal the direction word — the whole
// drill is choosing/producing hin vs. her, so revealing the compound (or its
// vertical twin) as a hint would hand the learner the answer. Only theme nouns
// and AI-supplied extra words are hinted (mirrors ADR-0003 for those parts).

import { shuffle } from '../data/pool'
import type { Rng } from '../data/pool'
import { ADVERB_PAIRS, hinForm, herForm, DIRECTION_LEVELS } from '../data/directionWords'
import type { DirectionLevel } from '../data/directionWords'
import type { NounRef, HintInput } from './useSentenceQuiz'
import type { ExtraWord, PromptVariation } from './useVerbSentenceQuiz'
import type { AiClient } from './useClaude'
import type { DwErrorTag, DwDrillItem } from './useQuizHistory'

/** A direction-word error category the AI grader may assign (re-exported from history). */
export type { DwErrorTag } from './useQuizHistory'
/** Extra highlighted word with AI-supplied German (shared shape with the verb quiz). */
export type { ExtraWord } from './useVerbSentenceQuiz'

// ─────────────────────────────── Types ────────────────────────────────

/** Which twin of a pair is drilled: hin = away from the speaker, her = toward. */
export type DwSide = 'hin' | 'her'

/** One drilled pair-element + side (⇒ TARGET compound) + theme nouns, before the AI writes it. */
export interface DwSentenceSpec {
  index: number
  pair: string          // adverb-pair element, e.g. 'auf'
  side: DwSide
  target: string        // side === 'hin' ? hinForm(pair) : herForm(pair)
  nouns: NounRef[]
}

/**
 * unter and ab both express "downward" motion, in different registers — their
 * hin-/her- forms are mutually acceptable "vertical synonyms" per the drill's
 * grading rubric (hinab≈hinunter, herab≈herunter). Every other pair has no twin.
 */
export const VERTICAL_TWIN: Record<string, string> = { unter: 'ab', ab: 'unter' }

/** The vertical-synonym compound for this spec's side, or null when the pair has no twin. */
export function twinCompound(spec: DwSentenceSpec): string | null {
  const twinPair = VERTICAL_TWIN[spec.pair]
  if (!twinPair) return null
  return spec.side === 'hin' ? hinForm(twinPair) : herForm(twinPair)
}

/**
 * Every direction-word surface form that must never leak into a hint or a
 * generated question for this pair's drill: both sides of the pair itself
 * (hinX/herX — not just the drilled side, since the sibling side would still
 * hand the learner the answer to a hin-vs-her choice), the pair's colloquial
 * r-form (rX, when one exists — not every pair has one, e.g. ab has no
 * *rab), and the same forms for the pair's vertical twin (e.g. pair 'unter'
 * also forbids ab's hinab/herab, since those are accepted "vertical synonym"
 * answers for unter — see VERTICAL_TWIN). Shared by buildDwHintInputs (T6
 * hints) and validateDwQuestion (T7 question-leak screen) so both drills
 * screen against the same forbidden set.
 */
export function forbiddenDirectionWords(pair: string): string[] {
  const words = [hinForm(pair), herForm(pair)]
  const rForm = ADVERB_PAIRS.find(p => p.element === pair)?.rForm
  if (rForm) words.push(rForm)
  const twinPair = VERTICAL_TWIN[pair]
  if (twinPair) {
    words.push(hinForm(twinPair), herForm(twinPair))
    const twinRForm = ADVERB_PAIRS.find(p => p.element === twinPair)?.rForm
    if (twinRForm) words.push(twinRForm)
  }
  return words
}

/**
 * Whole-word, case-insensitive check for whether `text` contains any of
 * `words` — word-boundary-aware so a short r-form like "rein" does not
 * false-positive inside an unrelated word that merely contains it as a
 * substring (e.g. "Verein", "Bereich"). Mirrors the \b-bounded regex
 * convention already used for surface/leak matching elsewhere in the sentence
 * quizzes (see escapeRegExp + buildHintSegments in useSentenceQuiz.ts).
 */
export function containsDirectionWord(text: string, words: readonly string[]): boolean {
  return words.some(w => new RegExp(`\\b${w}\\b`, 'i').test(text))
}

/** A spec once the AI has produced the sentence pair + highlight surfaces. */
export interface GeneratedDwSentence extends DwSentenceSpec {
  english: string
  german: string          // reference translation containing target (or its twin)
  /** Exact English surface for each theme noun, in order. */
  nounSpansEn?: string[]
  /** Other highlighted nouns/verbs with AI-supplied German. */
  extraWords?: ExtraWord[]
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
 * Build `count` specs, each with exactly ONE drilled pair-element (from a
 * refilling bag for good spread), a random hin/her side, and `nounsPer`
 * distinct theme nouns. Returns [] for an empty pair pool — the compound IS
 * the drill, so a sentence without one is meaningless.
 */
export function buildDwSpecs(
  pairPool: readonly string[],
  nounPool: readonly NounRef[],
  count: number,
  nounsPer: 1 | 2 | 'mix',
  rng: Rng = Math.random
): DwSentenceSpec[] {
  if (pairPool.length === 0) return []
  const nextPair = makeBag(pairPool, rng)
  const nextNoun = makeBag(nounPool, rng)
  const specs: DwSentenceSpec[] = []
  for (let index = 0; index < count; index++) {
    const kn = nounsPer === 'mix' ? (rng() < 0.5 ? 1 : 2) : nounsPer
    const pair = drawUnique(nextPair, 1, p => p)[0]
    if (!pair) break
    const side: DwSide = rng() < 0.5 ? 'hin' : 'her'
    const target = side === 'hin' ? hinForm(pair) : herForm(pair)
    specs.push({
      index,
      pair,
      side,
      target,
      nouns: drawUnique(nextNoun, kn, n => n.german)
    })
  }
  return specs
}

/** Compact CEFR label for the chosen direction levels — slash-joins the
 *  distinct present levels in canonical order (same convention as dacLevelLabel). */
export function dwLevelLabel(levels: readonly DirectionLevel[]): string {
  if (levels.length === 0) return 'A2–C1'
  return DIRECTION_LEVELS.filter(l => levels.includes(l)).join('/')
}

function pairGloss(pair: string): string {
  return ADVERB_PAIRS.find(p => p.element === pair)?.gloss ?? pair
}

// ──────────────────────────── AI generation ───────────────────────────

/** Rotating one-line angles injected per batch so sentences don't converge.
 *  Several lean on the module's scene archetypes (stairs, hill, doorway,
 *  window, room, street) since a concrete scene is what pins the perspective. */
export const DW_ANGLE_POOL = [
  'set it on a staircase, one person calling to another',
  'set it on a hillside path',
  'set it at a doorway between inside and outside',
  'set it at an open window',
  'use a first-person plural subject (wir)',
  'frame it as a shouted invitation',
  'set it on a weekend hike',
  'frame it as a question',
  'put it in the Perfekt (past)',
  'use a 2nd-person informal subject (du)',
  'set it in a stairwell of an apartment building',
  'use a future intention (morgen / nächste Woche)',
  'frame it as advice or a suggestion',
  'use a polite request (Sie)',
  'open with an adverb of time',
  'set it at a train platform, someone boarding or leaving',
  'contrast two people at opposite ends of the scene'
] as const

export const DW_GEN_SYSTEM = `You are a German-language exercise writer for an app drilling DIRECTIONAL ADVERBS (hin-/her- compounds: hinauf/herauf, hinein/herein, hinaus/heraus, hinunter/herunter, hinüber/herüber, hinab/herab).
Rule being drilled: hin = motion away from the speaker, her = motion toward the speaker.
For each requested item you are given a TARGET compound and theme nouns. Write:
- "english": a natural English sentence (level-appropriate) whose German translation must use the TARGET compound. The sentence MUST make the speaker's position unambiguous in words (e.g. "Grandma calls from the top of the stairs: 'Come up to me!'" — the caller is above, so the German is herauf). Never leave the perspective guessable.
- "german": the reference translation, natural German, containing the TARGET compound (its synonym hinab/hinunter or herab/herunter is also acceptable where the target is one of those).
- Use each given theme noun naturally in the sentence.
- "nounSpansEn": the exact English word(s) you used for each theme noun, in order.
- "extraWords": up to 3 other content words (verbs/nouns) a learner might not know, each with its German.
Return ONLY JSON in exactly this shape: {"items":[{"index":<number>,"english":"...","german":"...","nounSpansEn":["..."],"extraWords":[{"en":"...","de":"...","kind":"verb|noun"}]}]}
No markdown fences, no commentary.`

export const DW_GEN_SCHEMA = {
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
        required: ['index', 'english', 'german', 'nounSpansEn', 'extraWords']
      }
    }
  },
  required: ['items']
}

export function buildDwGeneratePrompt(
  specs: readonly DwSentenceSpec[],
  level: string,
  variation: PromptVariation
): string {
  const lines = specs.map(s => {
    const perspective = s.side === 'hin' ? 'away from the speaker' : 'toward the speaker'
    const nouns = s.nouns.length
      ? s.nouns.map(n => `${n.article} ${n.german} (${n.english})`).join(' + ')
      : '(any fitting noun)'
    return `#${s.index} — TARGET compound: "${s.target}" (${s.side}- ${perspective}; element "${s.pair}" — ${pairGloss(s.pair)}); build around noun(s): ${nouns}`
  })
  return (
    `Target CEFR level: ${level}.\n` +
    `Write one German sentence and its English translation for each of the following ${specs.length} item(s), each using its TARGET compound with the speaker's position stated unambiguously in words:\n` +
    lines.join('\n') +
    `\nVary the framing across the batch — draw inspiration from these angles (do not echo them as text): ${variation.angles.join(' · ')}.` +
    `\nBatch variation seed: ${variation.seed}.` +
    `\nAlso return nounSpansEn (one per listed noun, in order) and extraWords (every other noun/verb), each surface an exact substring of your English sentence.`
  )
}

function trimStr(x: unknown): string {
  return typeof x === 'string' ? x.trim() : ''
}

/**
 * Validate one AI sentence pair against its spec. The German MUST contain the
 * TARGET compound or its vertical twin (case-insensitive) — that compound IS
 * the drill, unlike the da-compound quiz where the construction may diverge.
 * Span/extra fields are best-effort: malformed or missing values are dropped,
 * never a reason to reject the pair.
 */
export function validateDwSentencePair(
  raw: unknown,
  spec: DwSentenceSpec
): GeneratedDwSentence | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  if (typeof e.index === 'number' && e.index !== spec.index) return null

  const english = trimStr(e.english)
  const german = trimStr(e.german)
  if (english.length < 3 || german.length < 3) return null

  const lowGerman = german.toLowerCase()
  const twin = twinCompound(spec)
  const hasTarget = lowGerman.includes(spec.target.toLowerCase())
  const hasTwin = twin !== null && lowGerman.includes(twin.toLowerCase())
  if (!hasTarget && !hasTwin) return null

  const out: GeneratedDwSentence = { ...spec, english, german }

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

export interface GenerateDwBatchOptions {
  model: string
  specs: DwSentenceSpec[]
  level?: string
  maxRetries?: number
  rng?: Rng
}

export interface GenerateDwBatchResult {
  sentences: GeneratedDwSentence[]
  failedIndices: number[]
}

/** A short random-ish token for the batch seed (no Date/crypto dependency). */
function makeSeed(rng: Rng): string {
  return Math.floor(rng() * 1_000_000_000).toString(36)
}

/**
 * Ask the AI for a sentence pair per spec in this batch, validating each and
 * retrying only the missing/failed specs up to `maxRetries` extra rounds. Fresh
 * variety angles + seed each attempt so retries don't reproduce failures. Never
 * throws — a spec that never validates is simply listed in `failedIndices`.
 */
export async function generateDwSentenceBatch(
  client: AiClient,
  opts: GenerateDwBatchOptions
): Promise<GenerateDwBatchResult> {
  const rng = opts.rng ?? Math.random
  const level = opts.level ?? 'A2–C1'
  const maxRetries = opts.maxRetries ?? 2
  const bySpec = new Map(opts.specs.map(s => [s.index, s]))
  const accepted = new Map<number, GeneratedDwSentence>()
  let attempts = 0

  while (accepted.size < opts.specs.length && attempts <= maxRetries) {
    attempts++
    const remaining = opts.specs.filter(s => !accepted.has(s.index))
    const angles = shuffle([...DW_ANGLE_POOL], Math.max(3, Math.min(6, remaining.length)), rng)
    const prompt = buildDwGeneratePrompt(remaining, level, { angles, seed: makeSeed(rng) })

    let text = ''
    try {
      const res = await client.models.generateContent({
        model: opts.model,
        contents: prompt,
        config: {
          systemInstruction: DW_GEN_SYSTEM,
          responseMimeType: 'application/json',
          responseSchema: DW_GEN_SCHEMA,
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
      const v = validateDwSentencePair(raw, spec)
      if (v) accepted.set(idx, v)
    }
  }

  const sentences = opts.specs.filter(s => accepted.has(s.index)).map(s => accepted.get(s.index)!)
  const failedIndices = opts.specs.filter(s => !accepted.has(s.index)).map(s => s.index)
  return { sentences, failedIndices }
}

// ─────────────────────────── Hint inputs ──────────────────────────────
//
// Per design decision 1: the direction word is NEVER hinted — it's the whole
// drill. Only theme nouns (OUR stored German) and incidental extra words (the
// AI's German, per ADR-0003) are hinted, and each candidate is defensively
// filtered against forbiddenDirectionWords so neither its surface nor its
// reveal can leak the pair's compounds (either side), r-form, or the vertical
// twin's compounds/r-form, even if the model echoes one into an extra word.

/** Build the (surface, kind, reveal) inputs for buildHintSegments. */
export function buildDwHintInputs(s: GeneratedDwSentence): HintInput[] {
  const forbidden = forbiddenDirectionWords(s.pair)
  const leaksTarget = (text: string): boolean => containsDirectionWord(text, forbidden)

  const hints: HintInput[] = []
  ;(s.nounSpansEn ?? []).forEach((surf, i) => {
    const n = s.nouns[i]
    if (!surf || !n) return
    const reveal = `${n.article} ${n.german}`
    if (leaksTarget(surf) || leaksTarget(reveal)) return
    hints.push({ surface: surf, kind: 'noun', reveal })
  })
  ;(s.extraWords ?? []).forEach(w => {
    if (!w.en || !w.de) return
    if (leaksTarget(w.en) || leaksTarget(w.de)) return
    hints.push({ surface: w.en, kind: w.kind, reveal: w.de })
  })
  return hints
}

// ──────────────────────────── AI grading ──────────────────────────────
//
// EN→DE only, always WITH error tags (the module has no meaning-only DE→EN
// leg here). Temperature 0, JSON schema, one retry; THROWS if both attempts
// fail (caller falls back to a local check), mirroring gradeDacAnswer /
// gradeVerbAnswer / gradeAnswer.

export interface DwGradePromptInput {
  spec: GeneratedDwSentence
  answer: string        // what the learner typed
}

export interface GradeDwOptions extends DwGradePromptInput {
  model: string
}

/** DwAnswerGrade fields are always present (never optional) — the caller
 *  always gets a tip string and a tags array, empty when the answer is right. */
export interface DwAnswerGrade {
  correct: boolean
  tip: string
  tags: DwErrorTag[]
}

const DW_ERROR_TAGS: readonly DwErrorTag[] = ['direction', 'conjugation', 'case', 'word-order', 'noun', 'typo']

const DW_GRADE_SCHEMA = {
  type: 'object',
  properties: {
    correct: { type: 'boolean' },
    tip: { type: 'string' },
    errorTags: { type: 'array', items: { type: 'string', enum: ['direction', 'conjugation', 'case', 'word-order', 'noun', 'typo'] } }
  },
  required: ['correct']
}

/**
 * The drill-specific rule bullets shared by both direction-word grading
 * prompts (T6 sentence-translation and T7 answer-the-question) — exported so
 * T7's module imports these verbatim instead of hand-copying a paraphrase
 * that could drift out of sync. Kept byte-for-byte identical to the text
 * that shipped in `DW_GRADE_SYSTEM` before this extraction (see the
 * regression test asserting `DW_GRADE_SYSTEM.includes(DW_GRADE_RULES)`).
 */
export const DW_GRADE_RULES = `- The directional adverb must express the right perspective for the scenario. The exact reference compound is not required: its vertical synonym (hinab=hinunter, herab=herunter) is fully correct; colloquial short forms (rauf, runter, rein, raus, rüber) are CORRECT — mention the written full form in the tip, but do not mark the answer wrong or tag it.
- With "kommen" toward the addressee, both herauf and hinauf (etc.) are acceptable; prefer her- in the tip.
- The WRONG side (herauf where the speaker is below, hinein where the speaker is inside) is incorrect (except in the kommen case above): tag "direction".
- Misformed words (hinrein, rab) are incorrect: tag "direction".`

const DW_GRADE_SYSTEM = `You grade a learner's German translation in a directional-adverb drill (hin = away from the speaker, her = toward the speaker).
Judge the answer against the English sentence and the reference German. The answer is CORRECT when it preserves the meaning and is acceptable German. Apply these drill-specific rules:
${DW_GRADE_RULES}
errorTags values: "direction" (wrong side, wrong compound, misformed), "conjugation" (verb form), "case" (wrong case ending), "word-order" (verb-second or adverb placement), "noun" (wrong theme noun), "typo" (small slip elsewhere). Multiple tags allowed; empty when correct.
"tip": ONE short sentence, English, naming what to fix (or reinforcing why the answer is right). Never reveal an unrelated better translation.
Return ONLY JSON in exactly this shape: {"correct": true|false, "tip": "...", "errorTags": ["..."]}
No markdown fences, no commentary.`

export function buildDwGradePrompt(opts: DwGradePromptInput): { system: string; user: string } {
  const s = opts.spec
  const twin = twinCompound(s)
  const perspective = s.side === 'hin' ? 'away from the speaker' : 'toward the speaker'
  const user =
    `ENGLISH (source shown to the learner): ${s.english}\n` +
    `GERMAN (reference translation): ${s.german}\n` +
    `TARGET COMPOUND: "${s.target}" (${s.side}- — ${perspective})` +
    (twin ? `; vertical synonym also acceptable: "${twin}"` : '') + `\n` +
    `LEARNER'S GERMAN ANSWER: ${opts.answer}`
  return { system: DW_GRADE_SYSTEM, user }
}

export function parseDwGrade(raw: unknown): DwAnswerGrade | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.correct !== 'boolean') return null
  const tip = typeof r.tip === 'string' ? r.tip.trim() : ''
  const tags = Array.isArray(r.errorTags)
    ? r.errorTags.filter((t): t is DwErrorTag => typeof t === 'string' && (DW_ERROR_TAGS as readonly string[]).includes(t))
    : []
  return { correct: r.correct, tip, tags }
}

export async function gradeDwAnswer(client: AiClient, opts: GradeDwOptions): Promise<DwAnswerGrade> {
  const { system, user } = buildDwGradePrompt(opts)
  const maxRetries = 1
  let attempts = 0
  let lastError = 'no attempts'
  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model: opts.model,
        contents: user,
        config: { systemInstruction: system, responseMimeType: 'application/json', responseSchema: DW_GRADE_SCHEMA, temperature: 0 }
      })
      let parsed: unknown
      try { parsed = JSON.parse(response.text ?? '') } catch { lastError = 'malformed JSON'; continue }
      const grade = parseDwGrade(parsed)
      if (grade === null) { lastError = 'validation failed'; continue }
      return grade
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new Error(`gradeDwAnswer exhausted ${attempts} attempts. Last error: ${lastError}`)
}

/** The per-item record stored in run meta for one graded direction-word sentence. */
export function buildDwDrillItem(
  s: GeneratedDwSentence,
  correct: boolean,
  tags?: DwErrorTag[]
): DwDrillItem {
  const item: DwDrillItem = {
    pair: s.pair,
    compound: s.target,
    nounKeys: s.nouns.map(n => n.german),
    correct
  }
  if (tags && tags.length > 0) item.tags = tags
  return item
}
