// Wortschatz module — data types + seed aggregation (see CONTEXT.md → "Vokabel").
// A Vokabel is one exam-register vocabulary item belonging to a Themenfeld,
// in one of two kinds — Einzelwort or Wortverbindung — with its English
// gloss, grammar, two authored context sentences (each with a {{…}} cloze
// blank), and accepted answer variants. Seeds live one file per Themenfeld
// (wortschatz<Feld>.ts); this file aggregates them and holds the shared
// types plus the Vokabelstufe ladder (STUFEN).

import { TOPIC_TAGS, type TopicTag } from './sprechenTopics'
import { WORTSCHATZ_UMWELT } from './wortschatzUmwelt'
import { WORTSCHATZ_ARBEIT } from './wortschatzArbeit'
import { WORTSCHATZ_TECHNOLOGIE } from './wortschatzTechnologie'
import { WORTSCHATZ_BILDUNG } from './wortschatzBildung'
import { WORTSCHATZ_GESUNDHEIT } from './wortschatzGesundheit'
import { WORTSCHATZ_MEDIEN } from './wortschatzMedien'
import { WORTSCHATZ_GESELLSCHAFT } from './wortschatzGesellschaft'
import { WORTSCHATZ_REISEN } from './wortschatzReisen'
import { WORTSCHATZ_KONSUM } from './wortschatzKonsum'
import { WORTSCHATZ_FAMILIE } from './wortschatzFamilie'

export type Themenfeld = TopicTag
export const THEMENFELDER: readonly Themenfeld[] = TOPIC_TAGS

export type VokabelKind = 'einzelwort' | 'wortverbindung'

export interface KontextSatz {
  de: string   // contains exactly one {{…}} blank
  en: string
  // Per-sentence alternative blank fillings. Each entry is a full replacement
  // for the {{…}} content that is grammatically correct IN THAT SENTENCE —
  // not a canonical variant of the Vokabel. (An infinitive would be a fine
  // v.variants entry but a wrong blankVariant in a sentence that needs the
  // participle, which is exactly why these live per Satz.)
  blankVariants?: string[]
}

export interface Vokabel {
  id: string                 // seed: 'vk-<feld lowercase>-<slug>' | custom: 'vk-custom-<epoch>-<i>'
  feld: Themenfeld
  kind: VokabelKind
  de: string                 // canonical form: 'die Maßnahme' | 'eine Maßnahme ergreifen'
  en: string                 // gloss, also the Abruf cue
  plural?: string            // nouns only; '' = no plural
  // Two authoring conventions are in use in this bank, both intentional:
  //  * external complement government — the case the item imposes on a
  //    complement outside the chunk: 'auf + Akk' for `Rücksicht nehmen auf`;
  //  * chunk-internal restatement — the preposition+case already inside the
  //    canonical form: 'unter + Dat' for `unter einem Dach leben`.
  // A bare case ('Dat') is permitted for prepositionless government, e.g.
  // `einer Krankheit vorbeugen`.
  rektion?: string
  variants: string[]         // additional accepted full answers
  saetze: KontextSatz[]      // exactly 2 for seeds
  source: 'seed' | 'custom'
}

export const STUFEN = ['erkennen', 'luecke', 'abruf', 'anwendung'] as const
export type Stufe = (typeof STUFEN)[number]

export const STUFE_LABEL: Record<Stufe, string> = {
  erkennen: 'Erkennen',
  luecke: 'Lücke',
  abruf: 'Abruf',
  anwendung: 'Anwendung'
}

export const WORTSCHATZ_VOKABELN: Vokabel[] = [
  ...WORTSCHATZ_UMWELT,
  ...WORTSCHATZ_ARBEIT,
  ...WORTSCHATZ_TECHNOLOGIE,
  ...WORTSCHATZ_BILDUNG,
  ...WORTSCHATZ_GESUNDHEIT,
  ...WORTSCHATZ_MEDIEN,
  ...WORTSCHATZ_GESELLSCHAFT,
  ...WORTSCHATZ_REISEN,
  ...WORTSCHATZ_KONSUM,
  ...WORTSCHATZ_FAMILIE
]

export function clozeParts(satzDe: string): { before: string; blank: string; after: string } | null {
  const m = /^([^{}]*)\{\{([^{}]+)\}\}([^{}]*)$/.exec(satzDe)
  if (!m) return null
  return { before: m[1], blank: m[2], after: m[3] }
}
