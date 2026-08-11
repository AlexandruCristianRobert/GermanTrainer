// src/composables/usePackedSentenceQuiz.ts
//
// Packed-sentence quiz core (CONTEXT.md → "Sentence module", ADR-0015):
// per-card category counts, fresh sampling per card (ADR-0004), all
// randomness up front.

import { shuffle } from '../data/pool'
import type { Verb, VerbLevel, VerbCase } from '../data/verbs'
import type { PrepCase } from '../data/prepositions'
import { prepUsed, normalizeGerman, type NounRef } from './useSentenceQuiz'
import {
  CONN_PLACEMENT, CONN_PLACEMENT_EN, isPair,
  type Connector, type ConnectorPart
} from '../data/connectors'
import type { AiClient } from './useClaude'
import type {
  VerbErrorTag, PrepErrorTag, DacErrorTag, ConnErrorTag,
  VerbDrillItem, PrepDrillItem, DacDrillItem, ConnectorDrillItem
} from './useQuizHistory'

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

/** The [Domain] (de "Fachgebiet") one card is written in, resolved at
 *  spec-build time — all randomness up front, as the rest of this file does.
 *  `scene` is the single scene line drawn for this card. */
export interface PackedDomainRef { id: string; label: string; scene: string }

/** One Domain's runtime pools, resolved by the setup screen from
 *  data/domains.ts plus the noun store. This file never imports the bank
 *  itself — it only consumes what it is handed. */
export interface PackedDomainPool {
  id: string
  label: string
  scenes: readonly string[]
  nouns: readonly NounRef[]
  /** German infinitives; matched against `PackedPools.verbs` by `german`. */
  verbs: readonly string[]
}

export interface PackedItemSpec {
  key: string
  cat: PackedCategory
  verb?: PackedVerbRef
  noun?: NounRef
  prep?: PackedPrepRef
  colloc?: PackedCollocRef
  conn?: Connector
}
export interface PackedCardSpec { index: number; items: PackedItemSpec[]; domain?: PackedDomainRef }
export interface PackedPools {
  verbs: readonly PackedVerbRef[]
  nouns: readonly NounRef[]
  preps: readonly PackedPrepRef[]
  collocs: readonly PackedCollocRef[]
  conns: readonly Connector[]
  /** When non-empty every card is written in exactly one of these, and its
   *  nouns replace `nouns` for that card (ADR-0018). */
  domains?: readonly PackedDomainPool[]
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

/** Fill `out` up to `k` distinct items (by `key`) from a bag, keeping whatever
 *  is already in it — how a card takes its first verb from its Domain and the
 *  rest from the full pool. */
function drawUniqueInto<T>(out: T[], next: () => T | null, k: number, key: (t: T) => string): void {
  let guard = 0
  while (out.length < k && guard < k * 4) {
    guard++
    const t = next()
    if (t === null) break
    if (!out.some(x => key(x) === key(t))) out.push(t)
  }
}

/** Draw up to `k` distinct items (by `key`) from a bag. */
function drawUnique<T>(next: () => T | null, k: number, key: (t: T) => string): T[] {
  const out: T[] = []
  drawUniqueInto(out, next, k, key)
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

  // Fachgebiete (ADR-0018): one Domain per card from a rotating bag, and one
  // bag per Domain for its scenes, its nouns, and the verbs it prefers — so a
  // run spreads each Domain's vocabulary before repeating any of it.
  const domainPools = pools.domains ?? []
  const nextDomain = makeBag(domainPools, rng)
  const sceneBags = new Map(domainPools.map(d => [d.id, makeBag(d.scenes, rng)]))
  const nounBags = new Map(domainPools.map(d => [d.id, makeBag(d.nouns, rng)]))
  // A Domain's verbs are only PREFERRED: matched against the real verb pool so
  // level/Typ/Rektion are never invented here, and empty is fine — the card
  // then simply draws every verb from the full pool.
  const preferredBags = new Map(domainPools.map(d => {
    const wanted = new Set(d.verbs)
    return [d.id, makeBag(pools.verbs.filter(v => wanted.has(v.german)), rng)]
  }))

  const specs: PackedCardSpec[] = []
  for (let index = 0; index < cards; index++) {
    const items: PackedItemSpec[] = []
    const dom = nextDomain()

    const verbs: PackedVerbRef[] = []
    if (dom && counts.verb > 0) {
      // The first verb slot is on-theme; the rest are free (ADR-0018).
      drawUniqueInto(verbs, preferredBags.get(dom.id) ?? (() => null), 1, v => v.german)
    }
    drawUniqueInto(verbs, nextVerb, counts.verb, v => v.german)
    verbs.forEach((verb, i) => items.push({ key: `v${i + 1}`, cat: 'verb', verb }))

    const nounSource = dom ? (nounBags.get(dom.id) ?? (() => null)) : nextNoun
    drawUnique(nounSource, counts.noun, n => n.german)
      .forEach((noun, i) => items.push({ key: `n${i + 1}`, cat: 'noun', noun }))

    drawUnique(nextPrep, counts.prep, p => p.id)
      .forEach((prep, i) => items.push({ key: `p${i + 1}`, cat: 'prep', prep }))
    drawUnique(nextColloc, counts.dac, c => c.id)
      .forEach((colloc, i) => items.push({ key: `d${i + 1}`, cat: 'dac', colloc }))
    drawUnique(nextConn, counts.conn, c => c.id)
      .forEach((conn, i) => items.push({ key: `k${i + 1}`, cat: 'conn', conn }))

    const spec: PackedCardSpec = { index, items }
    if (dom) {
      const scene = (sceneBags.get(dom.id) ?? (() => null))() ?? dom.scenes[0] ?? ''
      spec.domain = { id: dom.id, label: dom.label, scene }
    }
    specs.push(spec)
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

/** Short governed-case label for a preposition ('seit + Dat'). */
export function prepCaseShort(c: PrepCase): string {
  switch (c) {
    case 'accusative': return 'Akk'
    case 'dative': return 'Dat'
    case 'genitive': return 'Gen'
    case 'two-way': return 'Wechsel'
    default: return c
  }
}

// ─────────────────────── Generation (prompt + validation) ───────────────────────

export interface PackedSpan { key: string; en: string; pl?: string }
/** An [Incidental noun] or verb the AI introduced, with its German dictionary
 *  form so it can be hinted — mirrors the verb quiz's extraWords. `kind:'verb'`
 *  → `de` is the infinitive; `kind:'noun'` → `de` is article + nominative
 *  singular and `pl` its bare nominative plural ('' = no plural). */
export interface PackedExtraWord { en: string; de: string; kind: 'verb' | 'noun'; pl?: string }
export interface GeneratedPackedCard extends PackedCardSpec {
  english: string
  german: string
  /** 1–4 sentences; ≥3 renders the "Kurztext" note and the smaller type size. */
  sents: number
  /** One span per item; a two-part connector carries TWO spans with one key.
   *  A NOUN key's span also carries the AI's guess at its bare plural — used
   *  only until the store learns the real one (see pendingPluralWrites). */
  spans: PackedSpan[]
  /** Every non-drilled noun or finite verb in the passage, hintable with its
   *  German dictionary form. */
  extras?: PackedExtraWord[]
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
  '"spans":[{"key":"v1","en":"...","pl":"..."}],' +
  '"extras":[{"en":"...","de":"...","kind":"verb|noun","pl":"..."}]}]} — exactly one entry per ' +
  'requested index. ' +
  '"spans" = one entry per ingredient key, where "en" is the exact English word(s) expressing ' +
  'that ingredient, copied verbatim from YOUR English translation (an exact substring of it); ' +
  'a TWO-PART connector gets TWO span entries with the same key, one per part. For a NOUN key ' +
  'ONLY, also add "pl" = its bare nominative plural WITHOUT an article (e.g. "Tische"), or "" ' +
  'when that noun has no plural; omit "pl" for verb/preposition/da-compound/connector keys. ' +
  '"extras" = EVERY OTHER noun and finite verb in your English translation that is NOT already ' +
  'covered by a span entry — subjects, objects, auxiliaries, modals, incidental nouns — each ' +
  'with "en" = its exact English surface (an exact substring of your English translation), ' +
  '"de" = its German dictionary form (the INFINITIVE for a verb; article + nominative singular ' +
  'for a noun, e.g. "die Katze"), "kind" ("verb" or "noun"), and for nouns "pl" = its bare ' +
  'nominative plural ("" when it has none); use [] when there are none.'

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
              properties: { key: { type: 'string' }, en: { type: 'string' }, pl: { type: 'string' } },
              required: ['key', 'en']
            }
          },
          extras: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                en: { type: 'string' },
                de: { type: 'string' },
                kind: { type: 'string', enum: ['verb', 'noun'] },
                pl: { type: 'string' }
              },
              required: ['en', 'de', 'kind']
            }
          }
        },
        required: ['index', 'english', 'german', 'sentenceCount', 'spans', 'extras']
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
      return `  [${it.key}] two-part connector "${it.conn.display}" (${it.conn.english}) — "${a.text}": ${CONN_PLACEMENT_EN[a.behavior]}; "${b.text}": ${CONN_PLACEMENT_EN[b.behavior]}. BOTH parts must appear (two span entries, same key).`
    }
    const p = it.conn.parts[0]
    return `  [${it.key}] connector "${p.text}" (${it.conn.english}) — ${CONN_PLACEMENT_EN[p.behavior]}`
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
    `\nAlso return sentenceCount, spans (one per ingredient key, plus "pl" — bare plural, "" if none — for noun keys; two-part connectors get two entries with the same key) and extras (every other noun and finite verb in the English, with "en"/"de"/"kind", nouns also carrying "pl"), each "en" an exact substring of your English translation.`
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
        .map(s => {
          const span: PackedSpan = { key: typeof s.key === 'string' ? s.key : '', en: typeof s.en === 'string' ? s.en.trim() : '' }
          // '' is the meaningful "this noun has no plural" signal, so it must
          // survive the pass-through — only a genuinely absent field leaves
          // `pl` unset.
          if (typeof s.pl === 'string') span.pl = s.pl.trim()
          return span
        })
        .filter(s => s.en.length > 0 && validKeys.has(s.key))
    : []

  // Extras are hint data, a bonus, never a rejection reason — a rejected card
  // costs the learner a real card. Drop malformed entries and any noun/verb
  // that repeats a drilled item; the drilled span already reveals it.
  const drilledNouns = new Set(
    spec.items.filter(i => i.cat === 'noun' && i.noun).map(i => normalizeGerman(i.noun!.german))
  )
  const drilledVerbs = new Set(
    spec.items.filter(i => i.cat === 'verb' && i.verb).map(i => normalizeGerman(i.verb!.german))
  )
  const extras: PackedExtraWord[] = Array.isArray(e.extras)
    ? e.extras
        .filter((n): n is Record<string, unknown> => !!n && typeof n === 'object')
        .map((n): PackedExtraWord | null => {
          const kind = n.kind === 'verb' ? 'verb' as const : n.kind === 'noun' ? 'noun' as const : null
          if (!kind) return null
          const en = typeof n.en === 'string' ? n.en.trim() : ''
          const de = typeof n.de === 'string' ? n.de.trim() : ''
          if (en.length === 0 || de.length === 0) return null
          const w: PackedExtraWord = { en, de, kind }
          if (kind === 'noun' && typeof n.pl === 'string') w.pl = n.pl.trim()
          return w
        })
        .filter((w): w is PackedExtraWord => w !== null)
        .filter(w => w.kind === 'noun'
          ? !drilledNouns.has(normalizeGerman(w.de.replace(/^(der|die|das)\s+/i, '')))
          : !drilledVerbs.has(normalizeGerman(w.de)))
    : []

  return { ...spec, english, german, sents, spans, extras }
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
// Full reveal (CONTEXT.md → "Word hint"): every drilled item is highlighted
// in its category color and carries a German reveal — verbs with their
// governed case, nouns with their article and (once known) plural,
// prepositions with their case, the da-compound plus the collocation it
// stands for, connectors with the clause they build and the position they
// take. Every AI-supplied incidental noun or verb gets a subtler span
// revealing its German dictionary form.

/** A colour-coded chip inside a hint: a connector part's clause (HZ green,
 *  NZ blue) or the position it occupies. */
export interface PackedHintBadge { text: string; tone: 'hz' | 'nz' | 'pos' }

/** One line of a hint: the German word, optional badges, and an optional
 *  muted note — the collocation behind a da-compound, the word order a
 *  connector forces. A two-part connector reveals one line per part. */
export interface PackedHintLine { text: string; badges?: PackedHintBadge[]; note?: string }

export interface PackedSegment {
  text: string
  item?: { key: string; cat: PackedCategory; hint?: PackedHintLine[]; extra?: boolean }
}

/** The collocation a da-compound stands for — 'warten auf + Akk'. The compound
 *  alone never says which verb, noun or adjective governs it. */
export function dacSource(c: PackedCollocRef): string {
  return `${c.word} ${c.preposition} + ${prepCaseShort(c.case)}`
}

/** Da-compound with its collocation, for the graded item list — 'darauf · warten auf + Akk'. */
export function dacSolution(c: PackedCollocRef): string {
  return `${daCompoundFor(c.preposition)} · ${dacSource(c)}`
}

/** One connector part as a hint line: the word, an HZ/NZ badge, a position
 *  badge, and what it does to the word order. */
export function connHintLine(p: ConnectorPart): PackedHintLine {
  const pl = CONN_PLACEMENT[p.behavior]
  return {
    text: p.text,
    badges: [
      { text: pl.clause, tone: pl.clause === 'NZ' ? 'nz' : 'hz' },
      { text: `Pos. ${pl.position}`, tone: 'pos' }
    ],
    note: pl.note
  }
}

/** Nominative singular + plural + genitive plural: 'der Tisch – die Tische
 *  (der Tische)'. `plural` undefined (not yet known) or '' (no plural) →
 *  the singular alone. The plural article is always nominative 'die' /
 *  genitive 'der' — derived here, never asked of the AI, so it can't be
 *  hallucinated. */
export function nounHintText(singularWithArticle: string, plural?: string): string {
  if (!plural) return singularWithArticle
  return `${singularWithArticle} – die ${plural} (der ${plural})`
}

/** The German reveal for one drilled item's hint span. `plural` is the
 *  resolved plural for a noun item (stored plural wins over this card's AI
 *  guess — see buildPackedSegments); ignored for every other category. */
export function packedHint(it: PackedItemSpec, plural?: string): PackedHintLine[] | undefined {
  if (it.cat === 'verb' && it.verb) {
    const rekt = rektShort(it.verb.case)
    return [{ text: rekt ? `${it.verb.german} + ${rekt}` : it.verb.german }]
  }
  if (it.cat === 'noun' && it.noun) return [{ text: nounHintText(`${it.noun.article} ${it.noun.german}`, plural) }]
  if (it.cat === 'prep' && it.prep) return [{ text: `${it.prep.german} + ${prepCaseShort(it.prep.case)}` }]
  if (it.cat === 'dac' && it.colloc) {
    return [{ text: daCompoundFor(it.colloc.preposition), note: dacSource(it.colloc) }]
  }
  if (it.cat === 'conn' && it.conn) return it.conn.parts.map(connHintLine)
  return undefined
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildPackedSegments(english: string, card: GeneratedPackedCard): PackedSegment[] {
  const byKey = new Map(card.items.map(i => [i.key, i]))
  interface Range { start: number; end: number; key: string; cat: PackedCategory; hint?: PackedHintLine[]; extra?: boolean }
  const found: Range[] = []
  const used: Array<[number, number]> = []

  /** First match of `surface` that does not overlap an already-claimed range —
   *  a pair's second part with an identical surface must land on a fresh
   *  occurrence, and an extra noun never steals a drilled span's range. */
  function claim(surface: string): [number, number] | null {
    let re: RegExp
    try { re = new RegExp(`\\b${escapeRegExp(surface)}\\b`, 'gi') } catch { return null }
    let m: RegExpExecArray | null
    while ((m = re.exec(english)) !== null) {
      const start = m.index, end = m.index + m[0].length
      if (used.some(([s2, e2]) => start < e2 && end > s2)) continue
      used.push([start, end])
      return [start, end]
    }
    return null
  }

  for (const span of card.spans) {
    const it = byKey.get(span.key)
    if (!it) continue
    const surface = span.en.trim()
    if (!surface) continue
    const range = claim(surface)
    if (!range) continue
    // Resolution order: stored plural → this card's AI guess → none (ADR-0003
    // — once the store learns a noun's plural, the AI's answer is ignored).
    const plural = it.cat === 'noun' && it.noun ? (it.noun.plural ?? span.pl) : undefined
    found.push({ start: range[0], end: range[1], key: it.key, cat: it.cat, hint: packedHint(it, plural) })
  }

  // Extras claim only what the drilled spans left free.
  let xi = 0
  for (const n of card.extras ?? []) {
    const surface = n.en.trim()
    if (!surface) continue
    const range = claim(surface)
    if (!range) continue
    const hint: PackedHintLine[] = n.kind === 'verb' ? [{ text: n.de }] : [{ text: nounHintText(n.de, n.pl) }]
    found.push({ start: range[0], end: range[1], key: `x${++xi}`, cat: n.kind, hint, extra: true })
  }

  found.sort((a, b) => a.start - b.start)
  if (found.length === 0) return [{ text: english }]

  const segments: PackedSegment[] = []
  let cursor = 0
  for (const r of found) {
    if (r.start > cursor) segments.push({ text: english.slice(cursor, r.start) })
    const item: PackedSegment['item'] = { key: r.key, cat: r.cat, hint: r.hint }
    if (r.extra) item.extra = true
    segments.push({ text: english.slice(r.start, r.end), item })
    cursor = r.end
  }
  if (cursor < english.length) segments.push({ text: english.slice(cursor) })
  return segments
}

// ───────────────────── Plural cache write-back ─────────────────────
//
// The AI's plural is trustworthy but disposable: it rides on the card's spans
// (never stored on the card itself) and is only ever used until the store
// learns the real one (ADR-0003). The runner calls this after generation and
// writes each entry back fire-and-forget, errors swallowed — a failed cache
// write must never break a card.

/** Drilled noun plurals the store doesn't have yet, read off this card's AI
 *  spans. Deduplicated by German; plain strings only (safe to hand to Dexie
 *  without unwrapping a reactive object first). */
export function pendingPluralWrites(card: GeneratedPackedCard): Array<{ german: string; plural: string }> {
  const spanPl = new Map(card.spans.map(s => [s.key, s.pl]))
  const out: Array<{ german: string; plural: string }> = []
  const seen = new Set<string>()
  for (const it of card.items) {
    if (it.cat !== 'noun' || !it.noun) continue
    if (it.noun.plural !== undefined) continue
    const pl = spanPl.get(it.key)
    if (typeof pl !== 'string') continue
    if (seen.has(it.noun.german)) continue
    seen.add(it.noun.german)
    out.push({ german: it.noun.german, plural: pl })
  }
  return out
}

// ─────────────────────────── Grading ────────────────────────────

export type PackedTag = 'conjugation' | 'case' | 'word-order' | 'noun' | 'preposition' | 'compound' | 'connector' | 'typo'
const PACKED_TAGS: readonly PackedTag[] = ['conjugation', 'case', 'word-order', 'noun', 'preposition', 'compound', 'connector', 'typo']

export interface PackedItemResult { key: string; correct: boolean; tags?: PackedTag[] }
export interface PackedGrade { items: PackedItemResult[]; tip?: string }
export type PackedVerdict = 'ok' | 'part' | 'no'

/** ok = every item right · part = at least half · no = below half. */
export function verdictOf(items: readonly PackedItemResult[]): PackedVerdict {
  if (items.length === 0) return 'no'
  const ok = items.filter(i => i.correct).length
  if (ok === items.length) return 'ok'
  return ok >= Math.ceil(items.length / 2) ? 'part' : 'no'
}

const PACKED_GRADE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          correct: { type: 'boolean' },
          tags: { type: 'array', items: { type: 'string', enum: [...PACKED_TAGS] } }
        },
        required: ['key', 'correct']
      }
    },
    tip: { type: 'string' }
  },
  required: ['items']
}

const PACKED_GRADE_COMMON =
  'You are a German teacher grading one packed translation exercise. The learner was shown the ' +
  'ENGLISH passage and produced a GERMAN translation that must contain several required ' +
  'ingredients, each identified by a key. Judge EVERY ingredient separately. Respond ONLY as ' +
  'JSON {"items":[{"key":"<key>","correct":<boolean>,"tags":["<tag>"]}],"tip":"<string>"} — no ' +
  'prose, no markdown fences, exactly one entry per listed key. An ingredient is correct when ' +
  'it appears, correctly formed and correctly placed, in an overall grammatical rendering — ' +
  'accept natural alternative phrasings; do not require an exact match to the reference. ' +
  'When an ingredient is wrong, set "tags" to every applicable value from exactly: ' +
  '"conjugation" (right verb, wrong form), "case" (wrong governed case — article or ending), ' +
  '"word-order" (verb-second/verb-final/inversion or separable-prefix placement wrong, incl. ' +
  'the word order a connector forces), "noun" (wrong noun — word, gender, or form), ' +
  '"preposition" (wrong or missing preposition word), "compound" (malformed or missing ' +
  'da-compound, or preposition+pronoun used for a thing), "connector" (wrong or missing ' +
  'connector word or part)'

const PACKED_GRADE_SYSTEM_TYPED =
  PACKED_GRADE_COMMON +
  ', "typo" (a spelling slip elsewhere). Set "tip" to ONE short English sentence pinpointing ' +
  'the most important mistake when anything is wrong; when everything is correct it may be empty.'

const PACKED_GRADE_SYSTEM_SPOKEN =
  PACKED_GRADE_COMMON +
  '. The learner SPOKE the German and a browser speech recognizer transcribed it — judge only ' +
  'the words as transcribed and ignore capitalisation and punctuation entirely; the transcript ' +
  'has neither reliably. NEVER return "typo" — the spelling in the transcript is the speech ' +
  "recognizer's, not the learner's. Set \"tip\" to ONE short English sentence pinpointing the " +
  'most important mistake when anything is wrong; when everything is correct it may be empty.'

export function buildPackedGradePrompt(
  card: GeneratedPackedCard, userAnswer: string, spoken: boolean
): { system: string; user: string } {
  const system = spoken ? PACKED_GRADE_SYSTEM_SPOKEN : PACKED_GRADE_SYSTEM_TYPED
  const answerLabel = spoken ? "LEARNER'S SPOKEN GERMAN ANSWER (transcript):" : "LEARNER'S GERMAN ANSWER:"
  const user =
    `ENGLISH (source shown to the learner): ${card.english}\n` +
    `GERMAN (reference translation): ${card.german}\n` +
    `INGREDIENTS TO VERIFY (one JSON entry per key):\n${card.items.map(itemLine).join('\n')}\n` +
    `${answerLabel} ${userAnswer}`
  return { system, user }
}

export function parsePackedGrade(raw: unknown, spec: PackedCardSpec): PackedGrade | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.items)) return null
  const validKeys = new Set(spec.items.map(i => i.key))
  const byKey = new Map<string, PackedItemResult>()
  for (const it of r.items) {
    if (!it || typeof it !== 'object') continue
    const e = it as Record<string, unknown>
    if (typeof e.key !== 'string' || !validKeys.has(e.key) || typeof e.correct !== 'boolean') continue
    const result: PackedItemResult = { key: e.key, correct: e.correct }
    if (Array.isArray(e.tags)) {
      const tags = e.tags.filter((t): t is PackedTag => typeof t === 'string' && (PACKED_TAGS as readonly string[]).includes(t))
      if (tags.length > 0) result.tags = tags
    }
    if (!byKey.has(e.key)) byKey.set(e.key, result)
  }
  // Every spec key must be graded — a silent gap would mis-score the card.
  if (byKey.size !== validKeys.size) return null
  const items = spec.items.map(i => byKey.get(i.key)!)
  const grade: PackedGrade = { items }
  if (typeof r.tip === 'string') {
    const tip = r.tip.trim()
    if (tip.length > 0) grade.tip = tip
  }
  return grade
}

export async function gradePackedAnswer(
  client: AiClient,
  opts: { model: string; card: GeneratedPackedCard; userAnswer: string; spoken?: boolean }
): Promise<PackedGrade> {
  const { system, user } = buildPackedGradePrompt(opts.card, opts.userAnswer, !!opts.spoken)
  const maxRetries = 1
  let attempts = 0
  let lastError = 'no attempts'
  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model: opts.model,
        contents: user,
        config: { systemInstruction: system, responseMimeType: 'application/json', responseSchema: PACKED_GRADE_SCHEMA, temperature: 0 }
      })
      let parsed: unknown
      try { parsed = JSON.parse(response.text ?? '') } catch { lastError = 'malformed JSON'; continue }
      const grade = parsePackedGrade(parsed, opts.card)
      if (grade === null) { lastError = 'validation failed'; continue }
      if (opts.spoken) {
        // Deterministic guarantee (mirrors gradeVerbAnswer): 'typo' never
        // reaches history from a spoken run, even if the model ignores the prompt.
        for (const item of grade.items) {
          if (!item.tags) continue
          const tags = item.tags.filter(t => t !== 'typo')
          if (tags.length > 0) item.tags = tags; else delete item.tags
        }
      }
      return grade
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new Error(`gradePackedAnswer exhausted ${attempts} attempts. Last error: ${lastError}`)
}

/**
 * Offline fallback ("lokale Prüfung per Wortabgleich"): per-item word-presence
 * checks against the learner's answer. Degraded by design — no tags, verbs
 * check by stem, umlaut plurals may miss.
 */
export function localCheckPackedCard(userAnswer: string, card: GeneratedPackedCard): PackedItemResult[] {
  const norm = normalizeGerman(userAnswer)
  const hay = ' ' + norm + ' '
  return card.items.map(it => {
    let correct = false
    if (it.cat === 'prep' && it.prep) correct = prepUsed(userAnswer, it.prep.german)
    else if (it.cat === 'dac' && it.colloc) correct = hay.includes(' ' + daCompoundFor(it.colloc.preposition) + ' ')
    else if (it.cat === 'conn' && it.conn) correct = connUsed(userAnswer, it.conn)
    else if (it.cat === 'noun' && it.noun) correct = norm.includes(normalizeGerman(it.noun.german))
    else if (it.cat === 'verb' && it.verb) {
      const inf = normalizeGerman(it.verb.german)
      const stem = inf.replace(/e?n$/, '')
      correct = stem.length >= 3 ? norm.includes(stem) : norm.includes(inf)
    }
    return { key: it.key, correct }
  })
}

const PACKED_MEANING_SCHEMA = {
  type: 'object',
  properties: { correct: { type: 'boolean' }, tip: { type: 'string' } },
  required: ['correct']
}

const PACKED_MEANING_SYSTEM =
  'You are a German teacher grading one translation exercise. The learner was shown the GERMAN ' +
  'passage and typed an ENGLISH translation. Judge whether the English correctly conveys the ' +
  'meaning of the German — accept paraphrases and synonyms; meaning matters, not an exact match ' +
  'to the reference. Respond ONLY as JSON {"correct": <boolean>, "tip": "<string>"} — no prose, ' +
  'no markdown fences. When "correct" is false, set "tip" to ONE short English sentence ' +
  'pinpointing the drift; otherwise it may be empty.'

export async function gradePackedMeaning(
  client: AiClient,
  opts: { model: string; card: GeneratedPackedCard; userAnswer: string }
): Promise<{ correct: boolean; tip?: string }> {
  const user =
    `GERMAN (source shown to the learner): ${opts.card.german}\n` +
    `ENGLISH (reference translation): ${opts.card.english}\n` +
    `LEARNER'S ENGLISH ANSWER: ${opts.userAnswer}`
  const maxRetries = 1
  let attempts = 0
  let lastError = 'no attempts'
  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model: opts.model,
        contents: user,
        config: { systemInstruction: PACKED_MEANING_SYSTEM, responseMimeType: 'application/json', responseSchema: PACKED_MEANING_SCHEMA, temperature: 0 }
      })
      let parsed: unknown
      try { parsed = JSON.parse(response.text ?? '') } catch { lastError = 'malformed JSON'; continue }
      if (!parsed || typeof parsed !== 'object' || typeof (parsed as { correct?: unknown }).correct !== 'boolean') {
        lastError = 'validation failed'; continue
      }
      const r = parsed as { correct: boolean; tip?: unknown }
      const out: { correct: boolean; tip?: string } = { correct: r.correct }
      if (typeof r.tip === 'string' && r.tip.trim().length > 0) out.tip = r.tip.trim()
      return out
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new Error(`gradePackedMeaning exhausted ${attempts} attempts. Last error: ${lastError}`)
}

// ───────────────────────── History meta builders ──────────────────────

const VERB_TAGS: readonly VerbErrorTag[] = ['conjugation', 'case', 'word-order', 'noun', 'typo']
const PREP_TAGS: readonly PrepErrorTag[] = ['preposition', 'case', 'noun', 'typo']
const DAC_TAGS: readonly DacErrorTag[] = ['preposition', 'compound', 'case', 'noun', 'typo', 'word-order']
const CONN_TAGS: readonly ConnErrorTag[] = ['connector', 'word-order', 'typo']

function pick<T extends PackedTag>(tags: readonly PackedTag[] | undefined, allowed: readonly T[]): T[] | undefined {
  if (!tags) return undefined
  const out = tags.filter((t): t is T => (allowed as readonly string[]).includes(t))
  return out.length > 0 ? out : undefined
}

export interface PackedMetaItems {
  verbSentenceItems: VerbDrillItem[]
  sentenceItems: PrepDrillItem[]
  dacSentenceItems: DacDrillItem[]
  packedConnItems: ConnectorDrillItem[]
}

/**
 * Split per-item results into the per-category shapes the existing weak-point
 * scorers read (ADR-0015 pooling). Nouns ride as noun-only VerbDrillItems
 * (verbKeys: []) so computeVerbWeakPoints counts them without inventing a
 * verb; every nounKeys elsewhere stays [] to avoid double counting.
 */
export function buildPackedMetaItems(
  cards: readonly GeneratedPackedCard[],
  results: ReadonlyMap<number, readonly PackedItemResult[]>
): PackedMetaItems {
  const meta: PackedMetaItems = { verbSentenceItems: [], sentenceItems: [], dacSentenceItems: [], packedConnItems: [] }
  for (const card of cards) {
    const rs = results.get(card.index)
    if (!rs) continue
    const byKey = new Map(rs.map(r => [r.key, r]))
    for (const it of card.items) {
      const r = byKey.get(it.key)
      if (!r) continue
      if (it.cat === 'verb' && it.verb) {
        const item: VerbDrillItem = { verbKeys: [it.verb.german], nounKeys: [], correct: r.correct }
        const tags = pick(r.tags, VERB_TAGS)
        if (tags) item.tags = tags
        meta.verbSentenceItems.push(item)
      } else if (it.cat === 'noun' && it.noun) {
        const item: VerbDrillItem = { verbKeys: [], nounKeys: [it.noun.german], correct: r.correct }
        const tags = pick(r.tags, VERB_TAGS)
        if (tags) item.tags = tags
        meta.verbSentenceItems.push(item)
      } else if (it.cat === 'prep' && it.prep) {
        const item: PrepDrillItem = { prepId: it.prep.id, prepGerman: it.prep.german, nounKeys: [], correct: r.correct }
        const tags = pick(r.tags, PREP_TAGS)
        if (tags) item.tags = tags
        meta.sentenceItems.push(item)
      } else if (it.cat === 'dac' && it.colloc) {
        const item: DacDrillItem = { collocId: it.colloc.id, collocWord: it.colloc.word, prepGerman: it.colloc.preposition, nounKeys: [], correct: r.correct }
        const tags = pick(r.tags, DAC_TAGS)
        if (tags) item.tags = tags
        meta.dacSentenceItems.push(item)
      } else if (it.cat === 'conn' && it.conn) {
        const item: ConnectorDrillItem = { connId: it.conn.id, connWord: it.conn.display, correct: r.correct }
        const tags = pick(r.tags, CONN_TAGS)
        if (tags) item.tags = tags
        meta.packedConnItems.push(item)
      }
    }
  }
  return meta
}

// ───────────────────────── Result surface (Task 9) ─────────────────────

export interface CardOutcome {
  card: GeneratedPackedCard
  answer: string
  verdict: PackedVerdict
  items: PackedItemResult[] | null   // null on DE→EN (meaning-only)
  tip?: string
  offline: boolean
}

export interface PackedAggregate {
  cat: Record<PackedCategory, { ok: number; n: number }>
  tags: Partial<Record<PackedTag, number>>
}

export function aggregateOutcomes(history: readonly CardOutcome[]): PackedAggregate {
  const cat = Object.fromEntries(PACKED_CATS.map(c => [c, { ok: 0, n: 0 }])) as PackedAggregate['cat']
  const tags: PackedAggregate['tags'] = {}
  for (const h of history) {
    if (!h.items) continue
    const byKey = new Map(h.card.items.map(i => [i.key, i]))
    for (const r of h.items) {
      const it = byKey.get(r.key)
      if (!it) continue
      cat[it.cat].n++
      if (r.correct) cat[it.cat].ok++
      else if (r.tags) for (const t of r.tags) tags[t] = (tags[t] ?? 0) + 1
    }
  }
  return { cat, tags }
}
