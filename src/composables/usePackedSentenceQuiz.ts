// src/composables/usePackedSentenceQuiz.ts
//
// Packed-sentence quiz core (CONTEXT.md → "Sentence module", ADR-0015):
// per-card category counts, fresh sampling per card (ADR-0004), all
// randomness up front.

import { shuffle } from '../data/pool'
import type { Verb, VerbLevel, VerbCase } from '../data/verbs'
import type { PrepCase } from '../data/prepositions'
import { prepUsed, normalizeGerman, type NounRef } from './useSentenceQuiz'
import { CONN_BEHAVIOR_LABEL, isPair, type Connector } from '../data/connectors'
import type { AiClient } from './useClaude'

export type PackedCategory = 'verb' | 'noun' | 'prep' | 'dac' | 'conn'
export const PACKED_CATS: readonly PackedCategory[] = ['verb', 'noun', 'prep', 'dac', 'conn']
export interface PackedCounts { verb: number; noun: number; prep: number; dac: number; conn: number }
export const PACKED_MAX: PackedCounts = { verb: 3, noun: 3, prep: 3, dac: 3, conn: 2 }
export const PACKED_BUDGET = 8
export const PACKED_WARN_AT = 7

export function packedTotal(c: PackedCounts): number {
  return PACKED_CATS.reduce((s, cat) => s + c[cat], 0)
}

export interface PackedVerbRef { german: string; english: string; level: VerbLevel; case: VerbCase }
export function packedVerbToRef(v: Verb): PackedVerbRef {
  return { german: v.german, english: v.english, level: v.level, case: v.case }
}
export interface PackedPrepRef { id: string; german: string; english: string; case: PrepCase }
export interface PackedCollocRef { id: string; word: string; english: string; preposition: string; case: 'accusative' | 'dative' }

export interface PackedItemSpec {
  key: string
  cat: PackedCategory
  verb?: PackedVerbRef
  noun?: NounRef
  prep?: PackedPrepRef
  colloc?: PackedCollocRef
  conn?: Connector
}
export interface PackedCardSpec { index: number; items: PackedItemSpec[] }
export interface PackedPools {
  verbs: readonly PackedVerbRef[]
  nouns: readonly NounRef[]
  preps: readonly PackedPrepRef[]
  collocs: readonly PackedCollocRef[]
  conns: readonly Connector[]
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
 * Build `cards` packed specs. Counts are PER CARD; every card samples fresh
 * words from refilling bags, so a run spreads each pool before repeating.
 */
export function buildPackedSpecs(
  pools: PackedPools, counts: PackedCounts, cards: number, rng: () => number = Math.random
): PackedCardSpec[] {
  const nextVerb = makeBag(pools.verbs, rng)
  const nextNoun = makeBag(pools.nouns, rng)
  const nextPrep = makeBag(pools.preps, rng)
  const nextColloc = makeBag(pools.collocs, rng)
  const nextConn = makeBag(pools.conns, rng)
  const specs: PackedCardSpec[] = []
  for (let index = 0; index < cards; index++) {
    const items: PackedItemSpec[] = []
    drawUnique(nextVerb, counts.verb, v => v.german)
      .forEach((verb, i) => items.push({ key: `v${i + 1}`, cat: 'verb', verb }))
    drawUnique(nextNoun, counts.noun, n => n.german)
      .forEach((noun, i) => items.push({ key: `n${i + 1}`, cat: 'noun', noun }))
    drawUnique(nextPrep, counts.prep, p => p.id)
      .forEach((prep, i) => items.push({ key: `p${i + 1}`, cat: 'prep', prep }))
    drawUnique(nextColloc, counts.dac, c => c.id)
      .forEach((colloc, i) => items.push({ key: `d${i + 1}`, cat: 'dac', colloc }))
    drawUnique(nextConn, counts.conn, c => c.id)
      .forEach((conn, i) => items.push({ key: `k${i + 1}`, cat: 'conn', conn }))
    specs.push({ index, items })
  }
  return specs
}

/** da(r) + preposition — 'dar-' before a vowel-initial preposition. */
export function daCompoundFor(preposition: string): string {
  const p = preposition.toLowerCase()
  return /^[aeiouäöü]/.test(p) ? `dar${p}` : `da${p}`
}

/** Short Rektion badge label for a verb ('warten + Akk'); null when there is
 *  no meaningful governed case to show. */
export function rektShort(c: VerbCase): string | null {
  switch (c) {
    case 'accusative': return 'Akk'
    case 'dative': return 'Dat'
    case 'dative+accusative': return 'Dat + Akk'
    case 'genitive': return 'Gen'
    case 'reflexive': return 'refl'
    default: return null
  }
}

// ─────────────────────── Generation (prompt + validation) ───────────────────────

export interface PackedSpan { key: string; en: string }
export interface GeneratedPackedCard extends PackedCardSpec {
  english: string
  german: string
  /** 1–4 sentences; ≥3 renders the "Kurztext" note and the smaller type size. */
  sents: number
  /** One span per item; a two-part connector carries TWO spans with one key. */
  spans: PackedSpan[]
}

export const PACKED_ANGLE_POOL = [
  'set the scene at the office', 'set it during a move to a new apartment',
  'use a first-person plural subject (wir)', 'frame part of it as a question',
  'set it on a weekend trip', 'put one clause in the Perfekt (past)',
  'set it in a kitchen', 'use a polite request (Sie)', 'open with an adverb of time',
  'set it at a train station', 'frame it as something overheard', 'set it during bad weather'
] as const

export const PACKED_GEN_SYSTEM =
  'You are a German teacher writing packed translation exercises. For each item you are given ' +
  'a list of REQUIRED ingredients, each with a key: German verbs (conjugate them), nouns, ' +
  'prepositions (with their governed case), da-compounds (the exact compound word is given), ' +
  'and connectors (with the word order each part forces). Write ONE natural German passage of ' +
  '1–2 sentences that contains EVERY ingredient used correctly — stretch to 3 or at most 4 ' +
  'sentences ONLY when no natural 1–2 sentence packing exists — then give a faithful, natural ' +
  'English translation. The German MUST contain each given preposition (contractions like "im" ' +
  'are fine), each given da-compound word exactly, and every part of each given connector with ' +
  'the word order that part forces. ' +
  'Return ONLY one JSON object of exactly this shape (no prose, no markdown fences): ' +
  '{"items":[{"index":<number>,"english":"...","german":"...","sentenceCount":<1-4>,' +
  '"spans":[{"key":"v1","en":"..."}]}]} — exactly one entry per requested index. ' +
  '"spans" = one entry per ingredient key, where "en" is the exact English word(s) expressing ' +
  'that ingredient, copied verbatim from YOUR English translation (an exact substring of it); ' +
  'a TWO-PART connector gets TWO span entries with the same key, one per part.'

export const PACKED_GEN_SCHEMA = {
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
          sentenceCount: { type: 'integer' },
          spans: {
            type: 'array',
            items: {
              type: 'object',
              properties: { key: { type: 'string' }, en: { type: 'string' } },
              required: ['key', 'en']
            }
          }
        },
        required: ['index', 'english', 'german', 'sentenceCount', 'spans']
      }
    }
  },
  required: ['items']
}

function caseWord(c: string): string {
  switch (c) {
    case 'accusative': return 'Akkusativ'
    case 'dative': return 'Dativ'
    case 'dative+accusative': return 'Dativ + Akkusativ'
    case 'genitive': return 'Genitiv'
    case 'reflexive': return 'reflexiv'
    case 'two-way': return 'Wechselpräposition (Akkusativ for direction, Dativ for location)'
    default: return c
  }
}

function itemLine(it: PackedItemSpec): string {
  if (it.cat === 'verb' && it.verb) {
    const rekt = rektShort(it.verb.case)
    return `  [${it.key}] verb "${it.verb.german}" (${it.verb.english})${rekt ? ` — its object takes ${caseWord(it.verb.case)}` : ''}`
  }
  if (it.cat === 'noun' && it.noun) {
    return `  [${it.key}] noun "${it.noun.article} ${it.noun.german}" (${it.noun.english})`
  }
  if (it.cat === 'prep' && it.prep) {
    return `  [${it.key}] preposition "${it.prep.german}" (${it.prep.english}) — governs ${caseWord(it.prep.case)}`
  }
  if (it.cat === 'dac' && it.colloc) {
    const compound = daCompoundFor(it.colloc.preposition)
    return `  [${it.key}] da-compound "${compound}" — from "${it.colloc.word} ${it.colloc.preposition}" (${it.colloc.english}); the referent is a THING, so use the compound, never "${it.colloc.preposition} + pronoun"`
  }
  if (it.cat === 'conn' && it.conn) {
    if (isPair(it.conn)) {
      const [a, b] = it.conn.parts
      return `  [${it.key}] two-part connector "${it.conn.display}" (${it.conn.english}) — "${a.text}": ${CONN_BEHAVIOR_LABEL[a.behavior]}; "${b.text}": ${CONN_BEHAVIOR_LABEL[b.behavior]}. BOTH parts must appear (two span entries, same key).`
    }
    const p = it.conn.parts[0]
    return `  [${it.key}] connector "${p.text}" (${it.conn.english}) — ${CONN_BEHAVIOR_LABEL[p.behavior]}`
  }
  return `  [${it.key}] (unknown)`
}

export function buildPackedGeneratePrompt(
  specs: readonly PackedCardSpec[], level: string, variation: { angles: string[]; seed: string }
): string {
  const blocks = specs.map(s => `#${s.index} — required ingredients:\n${s.items.map(itemLine).join('\n')}`)
  return (
    `Target CEFR level: ${level}.\n` +
    `Write one packed German passage (1–2 sentences, 3–4 only if unavoidable) and its English translation for each of the following ${specs.length} item(s):\n` +
    blocks.join('\n') +
    `\nVary the framing across the batch — draw inspiration from these angles (do not echo them as text): ${variation.angles.join(' · ')}.` +
    `\nBatch variation seed: ${variation.seed}.` +
    `\nAlso return sentenceCount and spans (one per ingredient key; two-part connectors get two entries with the same key), each "en" an exact substring of your English translation.`
  )
}

/** True if `german` contains every part of the connector as whole words. */
export function connUsed(german: string, conn: Connector): boolean {
  const hay = ' ' + normalizeGerman(german) + ' '
  return conn.parts.every(p => hay.includes(' ' + normalizeGerman(p.text) + ' '))
}

function countSentences(german: string): number {
  return german.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0).length
}

export function validatePackedCard(raw: unknown, spec: PackedCardSpec): GeneratedPackedCard | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const english = typeof e.english === 'string' ? e.english.trim() : ''
  const german = typeof e.german === 'string' ? e.german.trim() : ''
  if (english.length < 3 || german.length < 3) return null

  // Hard containment checks — a packed card that silently dropped a drilled
  // item would grade the learner on an ingredient that is not there.
  const hay = ' ' + normalizeGerman(german) + ' '
  for (const it of spec.items) {
    if (it.cat === 'prep' && it.prep && !prepUsed(german, it.prep.german)) return null
    if (it.cat === 'dac' && it.colloc && !hay.includes(' ' + daCompoundFor(it.colloc.preposition) + ' ')) return null
    if (it.cat === 'conn' && it.conn && !connUsed(german, it.conn)) return null
  }

  const rawSents = typeof e.sentenceCount === 'number' && Number.isFinite(e.sentenceCount)
    ? Math.round(e.sentenceCount) : countSentences(german)
  const sents = Math.min(4, Math.max(1, rawSents))

  const validKeys = new Set(spec.items.map(i => i.key))
  const spans: PackedSpan[] = Array.isArray(e.spans)
    ? e.spans
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
        .map(s => ({ key: typeof s.key === 'string' ? s.key : '', en: typeof s.en === 'string' ? s.en.trim() : '' }))
        .filter(s => s.en.length > 0 && validKeys.has(s.key))
    : []

  return { ...spec, english, german, sents, spans }
}

function makeSeed(rng: () => number): string {
  return Math.floor(rng() * 1_000_000_000).toString(36)
}

export async function generatePackedBatch(
  client: AiClient,
  opts: { model: string; specs: PackedCardSpec[]; level?: string; maxRetries?: number; rng?: () => number }
): Promise<{ cards: GeneratedPackedCard[]; rejected: number; attempts: number }> {
  const rng = opts.rng ?? Math.random
  const level = opts.level ?? 'B1/B2'
  const maxRetries = opts.maxRetries ?? 2
  const bySpec = new Map(opts.specs.map(s => [s.index, s]))
  const accepted = new Map<number, GeneratedPackedCard>()
  let rejected = 0
  let attempts = 0

  while (accepted.size < opts.specs.length && attempts <= maxRetries) {
    attempts++
    const remaining = opts.specs.filter(s => !accepted.has(s.index))
    const angles = shuffle([...PACKED_ANGLE_POOL], Math.max(3, Math.min(6, remaining.length)), rng)
    const prompt = buildPackedGeneratePrompt(remaining, level, { angles, seed: makeSeed(rng) })

    let text = ''
    try {
      const res = await client.models.generateContent({
        model: opts.model,
        contents: prompt,
        config: {
          systemInstruction: PACKED_GEN_SYSTEM,
          responseMimeType: 'application/json',
          responseSchema: PACKED_GEN_SCHEMA,
          temperature: 0.95,
          topP: 0.95
        }
      })
      text = res.text ?? ''
    } catch { continue }

    let parsed: unknown
    try { parsed = JSON.parse(text) } catch { continue }
    const items = (parsed as { items?: unknown }).items
    if (!Array.isArray(items)) continue

    for (const raw of items) {
      const idx = typeof (raw as { index?: unknown }).index === 'number' ? (raw as { index: number }).index : NaN
      const spec = bySpec.get(idx)
      if (!spec || accepted.has(idx)) continue
      const v = validatePackedCard(raw, spec)
      if (v) accepted.set(idx, v); else rejected++
    }
  }

  const cards = opts.specs.filter(s => accepted.has(s.index)).map(s => accepted.get(s.index)!)
  return { cards, rejected, attempts }
}

// ─────────────────────────── Hint segments ────────────────────────────
//
// Hybrid reveal (CONTEXT.md → "Word hint"): every drilled item is highlighted
// in its category color, but only verbs and nouns carry a German reveal — for
// a preposition, da-compound, or connector the dictionary form would BE the
// graded answer.

export interface PackedSegment {
  text: string
  item?: { key: string; cat: PackedCategory; reveal?: string }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildPackedSegments(english: string, card: GeneratedPackedCard): PackedSegment[] {
  const byKey = new Map(card.items.map(i => [i.key, i]))
  interface Range { start: number; end: number; key: string; cat: PackedCategory; reveal?: string }
  const found: Range[] = []
  const used: Array<[number, number]> = []

  for (const span of card.spans) {
    const it = byKey.get(span.key)
    if (!it) continue
    const surface = span.en.trim()
    if (!surface) continue
    let re: RegExp
    try { re = new RegExp(`\\b${escapeRegExp(surface)}\\b`, 'gi') } catch { continue }
    // First match that does not overlap an already-claimed range — a pair's
    // second part with an identical surface must land on a fresh occurrence.
    let m: RegExpExecArray | null
    let placed = false
    while (!placed && (m = re.exec(english)) !== null) {
      const start = m.index, end = m.index + m[0].length
      if (used.some(([s2, e2]) => start < e2 && end > s2)) continue
      used.push([start, end])
      const reveal = it.cat === 'verb' && it.verb ? it.verb.german
        : it.cat === 'noun' && it.noun ? `${it.noun.article} ${it.noun.german}`
        : undefined
      found.push({ start, end, key: it.key, cat: it.cat, reveal })
      placed = true
    }
  }

  found.sort((a, b) => a.start - b.start)
  if (found.length === 0) return [{ text: english }]

  const segments: PackedSegment[] = []
  let cursor = 0
  for (const r of found) {
    if (r.start > cursor) segments.push({ text: english.slice(cursor, r.start) })
    segments.push({ text: english.slice(r.start, r.end), item: { key: r.key, cat: r.cat, reveal: r.reveal } })
    cursor = r.end
  }
  if (cursor < english.length) segments.push({ text: english.slice(cursor) })
  return segments
}
