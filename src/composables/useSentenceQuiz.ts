// AI-generated preposition sentence-translation quiz.
//
// Flow: the learner picks one or more preposition cases, a count, a noun
// "theme" (the same groups the noun quizzes use) and how many nouns per
// sentence. We sample that many prepositions at random (the same `shuffle`
// randomizer used everywhere else), assign 1–2 random nouns from the chosen
// groups to each, then ask Gemini to write an English+German sentence pair per
// preposition. The learner is shown the English and types the German; an AI
// pass grades each answer (with an exact-match fallback if the AI is down).

import { shuffle } from '../data/pool'
import type { AiClient } from './useClaude'
import type { Preposition, PrepCase } from '../data/prepositions'
import type { Gender, Noun } from '../db/types'

// ─────────────────────────────── Types ────────────────────────────────

/** A noun handed to the AI to build a sentence around. */
export interface NounRef {
  german: string
  article: Gender
  english: string
}

export type NounsPerSentence = 1 | 2 | 'mix'

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
}

export interface SentenceVerdict {
  index: number
  correct: boolean
  feedback: string
  correction: string
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
  return { ...spec, english, german }
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
  'entry per requested index.'

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
          german: { type: 'string' }
        },
        required: ['index', 'english', 'german']
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
    lines.join('\n')
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

// ────────────────────────────── AI grading ────────────────────────────

const GRADE_SYSTEM =
  'Du bist ein fairer, aber genauer Deutschlehrer. Für jede Aufgabe bekommst du den ' +
  'englischen Satz, eine deutsche Referenzübersetzung, die Zielpräposition mit ihrem ' +
  'Kasus und die Antwort des Lernenden. Beurteile, ob die Antwort die englische ' +
  'Bedeutung korrekt wiedergibt UND die Zielpräposition im richtigen Kasus verwendet. ' +
  'Abweichungen in Wortstellung, Synonymen oder Artikeln, die trotzdem korrektes Deutsch ' +
  'ergeben, sind erlaubt — werte sie als korrekt. Tippfehler und falscher Kasus sind ' +
  'nicht korrekt. Gib eine sehr kurze Rückmeldung auf Deutsch (eine Zeile) und die beste ' +
  'korrekte Fassung. Antworte als JSON: {"items":[{"index":<number>,"correct":<bool>,' +
  '"feedback":"...","correction":"..."}]}.'

const GRADE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          correct: { type: 'boolean' },
          feedback: { type: 'string' },
          correction: { type: 'string' }
        },
        required: ['index', 'correct', 'feedback', 'correction']
      }
    }
  },
  required: ['items']
}

export interface GradeInput {
  index: number
  english: string
  german: string   // reference
  prepGerman: string
  case: PrepCase
  answer: string
}

export function buildGradePrompt(inputs: readonly GradeInput[]): string {
  const blocks = inputs.map(i =>
    `#${i.index}\n` +
    `English: ${i.english}\n` +
    `Reference German: ${i.german}\n` +
    `Target preposition: "${i.prepGerman}" — ${caseLabel(i.case)}\n` +
    `Learner answer: ${i.answer || '(blank)'}`
  )
  return `Grade these ${inputs.length} answer(s):\n\n` + blocks.join('\n\n')
}

function fallbackVerdict(i: GradeInput): SentenceVerdict {
  return {
    index: i.index,
    correct: i.answer.trim().length > 0 && normalizeGerman(i.answer) === normalizeGerman(i.german),
    feedback: '',
    correction: i.german
  }
}

/**
 * Grade all answers in a single AI call. Falls back to exact (normalized)
 * matching against the reference for any item the AI fails to return — and for
 * the whole batch if the AI errors or returns malformed JSON, so a quiz can
 * always be completed even offline.
 */
export async function gradeSentences(
  client: AiClient,
  model: string,
  inputs: GradeInput[]
): Promise<Map<number, SentenceVerdict>> {
  const out = new Map<number, SentenceVerdict>()
  if (inputs.length === 0) return out

  let text = ''
  try {
    const res = await client.models.generateContent({
      model,
      contents: buildGradePrompt(inputs),
      config: {
        systemInstruction: GRADE_SYSTEM,
        responseMimeType: 'application/json',
        responseSchema: GRADE_SCHEMA,
        temperature: 0
      }
    })
    text = res.text ?? ''
  } catch {
    for (const i of inputs) out.set(i.index, fallbackVerdict(i))
    return out
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    for (const i of inputs) out.set(i.index, fallbackVerdict(i))
    return out
  }

  const items = (parsed as { items?: unknown }).items
  if (Array.isArray(items)) {
    for (const raw of items) {
      const r = raw as Record<string, unknown>
      const idx = typeof r.index === 'number' ? r.index : NaN
      const input = inputs.find(i => i.index === idx)
      if (!input) continue
      out.set(idx, {
        index: idx,
        correct: r.correct === true,
        feedback: typeof r.feedback === 'string' ? r.feedback : '',
        correction: typeof r.correction === 'string' && r.correction.trim().length > 0
          ? r.correction.trim()
          : input.german
      })
    }
  }

  // Backfill anything the AI skipped.
  for (const i of inputs) if (!out.has(i.index)) out.set(i.index, fallbackVerdict(i))
  return out
}
