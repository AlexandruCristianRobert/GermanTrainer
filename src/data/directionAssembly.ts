// src/data/directionAssembly.ts
//
// Authored dataset for the sentence-ASSEMBLY drill of the Direction Words
// module (Phase 3, task T5). Each item is a short, natural German sentence
// broken into pre-inflected TILES in canonical order; the learner reassembles
// them.
//
//   • tiles       — 4–7 chunks in CANONICAL sentence order, lowercase-initial
//                   (nouns/proper names are capitalised INSIDE a tile, e.g.
//                   'die Treppe', 'zu seiner Schwester').
//   • variants    — additional accepted index orders, present ONLY where the
//                   reordering is genuinely idiomatic V2 German (a fronted
//                   adverbial/object with the finite verb still second).
//                   Merely grammatical-but-odd orders are omitted on purpose.
//   • punctuation — the final mark; dwAssemblySentence() appends it.
//
// FUSION GATE (the trap that bit Phase 2 twice): a bare hin-/her- adverb tile
// ('hin', 'her', 'hinein', 'hinaus', 'hinauf', 'hinunter', 'hinüber', 'hinab'
// and their her- twins) is its OWN tile ONLY when the FINITE verb carries the
// sentence and the adverb sits separated at the true clause end ("Er geht die
// Treppe hinunter."). The moment an infinitive or participle is in play (modal
// + infinitive, or a Perfekt participle), the direction element FUSES onto
// that verb form as ONE tile ('hinübergehen', 'hineingelaufen',
// 'hinaufgeklettert') — never split into an adverb tile plus a bare verb
// tile. Every accepted order of every item below was read aloud as a sentence
// during authoring to confirm both fusion and natural word order.
//
// Structure mirrors src/data/daAssembly.ts; ids `dwa-<slug>`.

import type { DirectionLevel } from './directionWords'

export interface DwAssemblyItem {
  /** Unique id, `dwa-<slug>`. */
  id: string
  level: DirectionLevel
  /**
   * 4–7 pre-inflected chunks in CANONICAL sentence order, lowercase-initial
   * (nouns capitalised internally). No two identical tile strings within an
   * item. A fused infinitive/participle ('hinübergehen', 'hineingelaufen') is
   * always a single tile — see the FUSION GATE note above.
   */
  tiles: string[]
  /**
   * Additional accepted index orders (fronting etc.), each a true permutation
   * of 0..n-1 that differs from the canonical order. Only idiomatic V2 orders.
   */
  variants?: number[][]
  /** The sentence's final mark. */
  punctuation: '.' | '!' | '?'
  /** English rendering. */
  translation: string
}

/**
 * Render the sentence: join tiles in the given order (default canonical),
 * uppercase the first letter, append the punctuation.
 */
export function dwAssemblySentence(item: DwAssemblyItem, order?: number[]): string {
  const indices = order ?? item.tiles.map((_, i) => i)
  const joined = indices.map(i => item.tiles[i]).join(' ')
  return joined.charAt(0).toUpperCase() + joined.slice(1) + item.punctuation
}

/** All accepted tile orders: the canonical 0..n-1 first, then each variant. */
export function dwAcceptedOrders(item: DwAssemblyItem): number[][] {
  const canonical = item.tiles.map((_, i) => i)
  return [canonical, ...(item.variants ?? [])]
}

export const DIRECTION_ASSEMBLY: DwAssemblyItem[] = [
  // ─────────────────────────────── A2 (8) ───────────────────────────────
  // Simple present-tense main clauses: finite verb second, bare direction
  // adverb separated to the true clause end. No fusion risk at this level.
  { id: 'dwa-treppe-hinunter', level: 'A2',
    tiles: ['er', 'geht', 'die Treppe', 'hinunter'],
    punctuation: '.', translation: 'He goes down the stairs.' },
  // Fronting variant: "Bitte komm sofort her!"
  { id: 'dwa-komm-her', level: 'A2',
    tiles: ['komm', 'bitte', 'sofort', 'her'],
    variants: [[1, 0, 2, 3]], punctuation: '!',
    translation: 'Please come here at once!' },
  { id: 'dwa-geh-hinein', level: 'A2',
    tiles: ['geh', 'doch', 'einfach', 'hinein'],
    punctuation: '!', translation: 'Just go on in already!' },
  { id: 'dwa-wohin-gehst-du-jetzt', level: 'A2',
    tiles: ['wohin', 'gehst', 'du', 'jetzt'],
    punctuation: '?', translation: 'Where are you going now?' },
  { id: 'dwa-kommst-du-her', level: 'A2',
    tiles: ['kommst', 'du', 'denn', 'her'],
    punctuation: '?', translation: 'Are you coming over here, then?' },
  // Fronting variant: "Jetzt gehen wir hinaus."
  { id: 'dwa-wir-gehen-hinaus', level: 'A2',
    tiles: ['wir', 'gehen', 'jetzt', 'hinaus'],
    variants: [[2, 1, 0, 3]], punctuation: '.',
    translation: 'We are going outside now.' },
  { id: 'dwa-woher-kommst-du', level: 'A2',
    tiles: ['woher', 'kommst', 'du', 'denn'],
    punctuation: '?', translation: 'Where are you from, then?' },
  { id: 'dwa-sie-geht-hinauf', level: 'A2',
    tiles: ['sie', 'geht', 'die Treppe', 'hinauf'],
    punctuation: '.', translation: 'She goes up the stairs.' },

  // ─────────────────────────────── B1 (9) ───────────────────────────────
  { id: 'dwa-wo-hin', level: 'B1',
    tiles: ['wo', 'gehst', 'du', 'denn', 'hin'],
    punctuation: '?', translation: 'Where are you off to, then?' },
  // Fronting variant: "Morgen fahren wir zu Oma hinüber."
  { id: 'dwa-oma-hinueber', level: 'B1',
    tiles: ['wir', 'fahren', 'morgen', 'zu Oma', 'hinüber'],
    variants: [[2, 1, 0, 3, 4]], punctuation: '.',
    translation: 'Tomorrow we are going over to Grandma\'s.' },
  // 'hin und her' is a fixed idiom — one tile, not split.
  // Fronting variant: "Den ganzen Tag laufe ich hin und her."
  { id: 'dwa-hin-und-her', level: 'B1',
    tiles: ['ich', 'laufe', 'den ganzen Tag', 'hin und her'],
    variants: [[2, 1, 0, 3]], punctuation: '.',
    translation: 'I pace back and forth all day long.' },
  // Modal + fused infinitive (fusion gate): the direction element attaches to
  // the infinitive, never sits as a bare tile before it.
  // Fronting variant: "Jetzt müssen wir hinübergehen."
  { id: 'dwa-wir-muessen-hinuebergehen', level: 'B1',
    tiles: ['wir', 'müssen', 'jetzt', 'hinübergehen'],
    variants: [[2, 1, 0, 3]], punctuation: '.',
    translation: 'We have to go over there now.' },
  // Placement variant: 'eigentlich' can sit right after the finite verb.
  // "Woher kommt eigentlich das Wasser?"
  { id: 'dwa-woher-kommt-das-wasser', level: 'B1',
    tiles: ['woher', 'kommt', 'das Wasser', 'eigentlich'],
    variants: [[0, 1, 3, 2]], punctuation: '?',
    translation: 'Where does the water actually come from?' },
  // Fronting variant: "Bitte lauf ihm doch nicht immer hinterher!"
  { id: 'dwa-lauf-nicht-immer-hinterher', level: 'B1',
    tiles: ['lauf', 'ihm', 'doch', 'bitte', 'nicht', 'immer', 'hinterher'],
    variants: [[3, 0, 1, 2, 4, 5, 6]], punctuation: '!',
    translation: 'Please do not always run after him!' },
  // Fronting variant: "Im Garten laufen die Kinder herum."
  { id: 'dwa-kinder-laufen-herum', level: 'B1',
    tiles: ['die Kinder', 'laufen', 'im Garten', 'herum'],
    variants: [[2, 1, 0, 3]], punctuation: '.',
    translation: 'The children are running around in the garden.' },
  { id: 'dwa-wohin-fahrt-ihr-morgen', level: 'B1',
    tiles: ['wohin', 'fahrt', 'ihr', 'morgen'],
    punctuation: '?', translation: 'Where are you all driving to tomorrow?' },
  // Fronting variant: "Endlich kommt er heraus."
  { id: 'dwa-er-kommt-endlich-heraus', level: 'B1',
    tiles: ['er', 'kommt', 'endlich', 'heraus'],
    variants: [[2, 1, 0, 3]], punctuation: '.',
    translation: 'He finally comes out.' },

  // ─────────────────────────────── B2 (8) ───────────────────────────────
  // Perfect tense — participle FUSED into one tile (fusion gate).
  // Fronting variant: "Schnell sind die Kinder ins Haus hineingelaufen."
  { id: 'dwa-kinder-hineingelaufen', level: 'B2',
    tiles: ['die Kinder', 'sind', 'schnell', 'ins Haus', 'hineingelaufen'],
    variants: [[2, 1, 0, 3, 4]], punctuation: '.',
    translation: 'The children ran quickly into the house.' },
  // Perfect tense, fused participle.
  // Fronting variant: "Letztes Jahr ist er ganz allein zu seiner Schwester hinübergefahren."
  { id: 'dwa-schwester-hinuebergefahren', level: 'B2',
    tiles: ['er', 'ist', 'letztes Jahr', 'ganz allein', 'zu seiner Schwester', 'hinübergefahren'],
    variants: [[2, 1, 0, 3, 4, 5]], punctuation: '.',
    translation: 'Last year he traveled over to his sister, all alone.' },
  // Perfect tense, fused participle.
  { id: 'dwa-berg-hinaufgeklettert', level: 'B2',
    tiles: ['sie', 'ist', 'mutig', 'auf den Berg', 'hinaufgeklettert'],
    punctuation: '.', translation: 'She bravely climbed up the mountain.' },
  // Perfect tense, fused participle.
  // Fronting variant: "Letzte Woche sind wir ins Tal hinuntergefahren."
  { id: 'dwa-tal-hinuntergefahren', level: 'B2',
    tiles: ['wir', 'sind', 'letzte Woche', 'ins Tal', 'hinuntergefahren'],
    variants: [[2, 1, 0, 3, 4]], punctuation: '.',
    translation: 'We drove down into the valley last week.' },
  // Unpaired adverb 'hervor' (out from behind/under something).
  // Fronting variant: "Plötzlich kam der Rauch hervor."
  { id: 'dwa-rauch-hervor', level: 'B2',
    tiles: ['der Rauch', 'kam', 'plötzlich', 'hervor'],
    variants: [[2, 1, 0, 3]], punctuation: '.',
    translation: 'The smoke suddenly came out.' },
  // Unpaired adverb 'hindurch' (through — all the way through); the
  // "durch ... hindurch" doubling is standard emphatic German, not an error.
  { id: 'dwa-sonne-hindurch', level: 'B2',
    tiles: ['endlich', 'kommt', 'die warme Sonne', 'nach dem Regen', 'durch die Wolken', 'hindurch'],
    punctuation: '.', translation: 'Finally, after the rain, the warm sun breaks through the clouds.' },
  // Perfect tense, fused participle.
  { id: 'dwa-schrank-hinaufgesprungen', level: 'B2',
    tiles: ['die Katze', 'ist', 'elegant', 'auf den Schrank', 'hinaufgesprungen'],
    punctuation: '.', translation: 'The cat jumped elegantly onto the cupboard.' },
  // 'wohin' is an independent interrogative here, not a separable prefix —
  // 'gefahren' stays bare; no fusion applies.
  { id: 'dwa-wohin-gefahren', level: 'B2',
    tiles: ['wohin', 'ist', 'er', 'eigentlich', 'gefahren'],
    punctuation: '?', translation: 'Where did he actually go, then?' },
]
