// src/data/connectors.ts
//
// Curated connector (Konnektor) bank for the Sentence quiz (CONTEXT.md →
// "Connector", ADR-0015). Grouped by MEANING FAMILY (how the learner filters)
// with word-order BEHAVIOR stored PER PART, because two-part correlatives can
// force a different word order at each position (je … desto = end + inv).
//
// Deliberately excluded:
//  - da-compound homographs (darum, dagegen, danach, dabei, davor, damit) — a
//    packed card can drill a da-compound and a connector at once, and these
//    words would make per-item grading attribution ambiguous.
//  - und (trivial), nämlich (position quirks), als/wenn (conditional ambiguity).

export type ConnFamilyId = 'adversativ' | 'kausal' | 'konzessiv' | 'temporal' | 'alternativ' | 'additiv'

/** '0' = position zero, word order unchanged · 'inv' = inversion (verb right
 *  after the connector) · 'end' = subjunctor, verb to the clause end. */
export type ConnBehavior = '0' | 'inv' | 'end'

export interface ConnectorPart { text: string; behavior: ConnBehavior }

export interface Connector {
  /** kebab id; pairs join parts with '-': 'zwar-aber' */
  id: string
  /** display form; pairs use ' … ': 'zwar … aber' */
  display: string
  english: string
  family: ConnFamilyId
  /** 1 entry for a single word, 2 for a correlative pair — behavior per part */
  parts: ConnectorPart[]
}

export interface ConnFamily { id: ConnFamilyId; label: string; de: string }

export const CONN_FAMILIES: ConnFamily[] = [
  { id: 'adversativ', label: 'Adversative', de: 'Gegensatz' },
  { id: 'kausal', label: 'Causal', de: 'Grund & Folge' },
  { id: 'konzessiv', label: 'Concessive', de: 'Einräumung' },
  { id: 'temporal', label: 'Temporal', de: 'Zeit' },
  { id: 'alternativ', label: 'Alternative', de: 'Wahl' },
  { id: 'additiv', label: 'Additive', de: 'Hinzufügung' }
]

export const CONN_BEHAVIOR_LABEL: Record<ConnBehavior, string> = {
  '0': 'Wortstellung bleibt',
  inv: 'Inversion',
  end: 'Verb ans Ende'
}

const w = (id: string, english: string, family: ConnFamilyId, behavior: ConnBehavior): Connector =>
  ({ id, display: id, english, family, parts: [{ text: id, behavior }] })
const pair = (
  id: string, a: ConnectorPart, b: ConnectorPart, english: string, family: ConnFamilyId
): Connector => ({ id, display: `${a.text} … ${b.text}`, english, family, parts: [a, b] })

export const CONNECTORS: Connector[] = [
  // ── adversativ (Gegensatz) ──
  w('aber', 'but', 'adversativ', '0'),
  w('sondern', 'but rather', 'adversativ', '0'),
  w('doch', 'yet / but', 'adversativ', '0'),
  w('jedoch', 'however', 'adversativ', 'inv'),
  w('allerdings', 'though / admittedly', 'adversativ', 'inv'),
  w('hingegen', 'by contrast', 'adversativ', 'inv'),
  pair('zwar-aber', { text: 'zwar', behavior: 'inv' }, { text: 'aber', behavior: '0' },
    'admittedly … but', 'adversativ'),
  pair('einerseits-andererseits', { text: 'einerseits', behavior: 'inv' }, { text: 'andererseits', behavior: 'inv' },
    'on the one hand … on the other', 'adversativ'),
  // ── kausal (Grund & Folge) ──
  w('denn', 'because / for', 'kausal', '0'),
  w('weil', 'because', 'kausal', 'end'),
  w('da', 'since / as', 'kausal', 'end'),
  w('deshalb', 'therefore', 'kausal', 'inv'),
  w('deswegen', 'that is why', 'kausal', 'inv'),
  w('daher', 'hence', 'kausal', 'inv'),
  w('folglich', 'consequently', 'kausal', 'inv'),
  w('sodass', 'so that', 'kausal', 'end'),
  pair('je-desto', { text: 'je', behavior: 'end' }, { text: 'desto', behavior: 'inv' },
    'the … the', 'kausal'),
  // ── konzessiv (Einräumung) ──
  w('obwohl', 'although', 'konzessiv', 'end'),
  w('obgleich', 'even though', 'konzessiv', 'end'),
  w('trotzdem', 'nevertheless', 'konzessiv', 'inv'),
  w('dennoch', 'nonetheless', 'konzessiv', 'inv'),
  // ── temporal (Zeit) ──
  w('während', 'while', 'temporal', 'end'),
  w('bevor', 'before', 'temporal', 'end'),
  w('nachdem', 'after', 'temporal', 'end'),
  w('seitdem', 'since (time)', 'temporal', 'end'),
  w('sobald', 'as soon as', 'temporal', 'end'),
  w('solange', 'as long as', 'temporal', 'end'),
  w('bis', 'until', 'temporal', 'end'),
  w('dann', 'then', 'temporal', 'inv'),
  w('anschließend', 'afterwards', 'temporal', 'inv'),
  // ── alternativ (Wahl) ──
  w('oder', 'or', 'alternativ', '0'),
  pair('entweder-oder', { text: 'entweder', behavior: 'inv' }, { text: 'oder', behavior: '0' },
    'either … or', 'alternativ'),
  pair('weder-noch', { text: 'weder', behavior: 'inv' }, { text: 'noch', behavior: 'inv' },
    'neither … nor', 'alternativ'),
  w('sonst', 'otherwise', 'alternativ', 'inv'),
  w('stattdessen', 'instead', 'alternativ', 'inv'),
  // ── additiv (Hinzufügung) ──
  w('außerdem', 'besides / moreover', 'additiv', 'inv'),
  w('zudem', 'in addition', 'additiv', 'inv'),
  pair('sowohl-als-auch', { text: 'sowohl', behavior: '0' }, { text: 'als auch', behavior: '0' },
    'both … and', 'additiv'),
  pair('nicht-nur-sondern-auch', { text: 'nicht nur', behavior: 'inv' }, { text: 'sondern auch', behavior: '0' },
    'not only … but also', 'additiv')
]

export function connectorsForFamilies(fams: readonly ConnFamilyId[]): Connector[] {
  const set = new Set(fams)
  return CONNECTORS.filter(c => set.has(c.family))
}

export function isPair(c: Connector): boolean {
  return c.parts.length === 2
}
