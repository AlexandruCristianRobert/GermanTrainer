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
import type { NounRef } from './useSentenceQuiz'

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
