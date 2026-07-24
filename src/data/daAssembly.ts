// src/data/daAssembly.ts
//
// Authored dataset for the sentence-ASSEMBLY drill of the Da-compound module
// (task T16). Each item is a short, natural German sentence broken into
// pre-inflected TILES in canonical order; the learner reassembles them.
//
//   • tiles       — 4–7 chunks in CANONICAL sentence order, lowercase-initial
//                   (nouns/proper names are capitalised INSIDE a tile, e.g.
//                   'mein Vater', 'für Briefmarken'). The prepositional object
//                   or the da-compound is always its OWN tile; a Korrelat keeps
//                   its comma glued to the da-compound tile ('darauf,').
//   • variants    — additional accepted index orders, present ONLY where the
//                   reordering is genuinely idiomatic V2 German (a fronted
//                   object/adverbial with the finite verb still second). Merely
//                   grammatical-but-odd orders are omitted on purpose.
//   • punctuation — the final mark; assemblySentence() appends it.
//
// Every collocationId joins src/data/collocations.ts (verified by the level
// check in tests/data/daAssembly.test.ts). Wrong word order taught as correct
// is a shipping-gate failure, so every accepted order of every item was read
// aloud as a sentence during authoring. Structure mirrors src/data/daDialogue.ts.

import type { CollocationLevel } from './collocations'

export interface AssemblyItem {
  /** Unique id, `as-<collocationId>`. */
  id: string
  /** Joins COLLOCATIONS by id; supplies the level. */
  collocationId: string
  /**
   * 4–7 pre-inflected chunks in CANONICAL sentence order, lowercase-initial
   * (nouns capitalised internally). The prepositional object or da-compound is
   * its own tile. No two identical tile strings within an item.
   */
  tiles: string[]
  /**
   * Additional accepted index orders (fronting etc.), each a true permutation
   * of 0..n-1 that differs from the canonical order. Only idiomatic V2 orders.
   */
  variants?: number[][]
  /** The sentence's final mark. */
  punctuation: '.' | '!' | '?'
  /** Copied from the joined collocation. */
  level: CollocationLevel
}

/**
 * Render the sentence: join tiles in the given order (default canonical),
 * uppercase the first letter, append the punctuation.
 */
export function assemblySentence(item: AssemblyItem, order?: number[]): string {
  const indices = order ?? item.tiles.map((_, i) => i)
  const joined = indices.map(i => item.tiles[i]).join(' ')
  return joined.charAt(0).toUpperCase() + joined.slice(1) + item.punctuation
}

/** All accepted tile orders: the canonical 0..n-1 first, then each variant. */
export function acceptedOrders(item: AssemblyItem): number[][] {
  const canonical = item.tiles.map((_, i) => i)
  return [canonical, ...(item.variants ?? [])]
}

export const DA_ASSEMBLY: AssemblyItem[] = [
  // ─────────────────────────────── B1 ───────────────────────────────
  // Fronting variant: "Schon lange warte ich auf den Bus."
  { id: 'as-warten-auf', collocationId: 'warten-auf', level: 'B1',
    tiles: ['ich', 'warte', 'schon lange', 'auf den Bus'],
    variants: [[2, 1, 0, 3], [3, 1, 0, 2]], punctuation: '.' },
  // Korrelat (darauf, dass …) — enthusiastic.
  { id: 'as-sich-freuen-auf', collocationId: 'sich-freuen-auf', level: 'B1',
    tiles: ['ich', 'freue mich', 'darauf,', 'dass du kommst'],
    punctuation: '!' },
  // Reflexive + full-noun subject → fronting keeps 'sich' glued to the verb:
  // "Auf mich verlässt sich meine Freundin immer."
  { id: 'as-sich-verlassen-auf', collocationId: 'sich-verlassen-auf', level: 'B1',
    tiles: ['meine Freundin', 'verlässt sich', 'immer', 'auf mich'],
    variants: [[3, 1, 0, 2]], punctuation: '.' },
  // Korrelat (darauf, dass …).
  { id: 'as-hoffen-auf', collocationId: 'hoffen-auf', level: 'B1',
    tiles: ['wir', 'hoffen', 'darauf,', 'dass es klappt'],
    punctuation: '.' },
  // Korrelat (davon, zu …).
  { id: 'as-traeumen-von', collocationId: 'traeumen-von', level: 'B1',
    tiles: ['sie', 'träumt', 'davon,', 'die Welt zu sehen'],
    punctuation: '.' },
  // Fronting variant: "Oft erzählen die Kinder von der Schule."
  { id: 'as-erzaehlen-von', collocationId: 'erzaehlen-von', level: 'B1',
    tiles: ['die Kinder', 'erzählen', 'oft', 'von der Schule'],
    variants: [[2, 1, 0, 3], [3, 1, 0, 2]], punctuation: '.' },
  // Brief's model item. Fronting: "Für Briefmarken interessiert sich mein Vater sehr."
  { id: 'as-sich-interessieren-fuer', collocationId: 'sich-interessieren-fuer', level: 'B1',
    tiles: ['mein Vater', 'interessiert sich', 'sehr', 'für Briefmarken'],
    variants: [[3, 1, 0, 2]], punctuation: '.' },
  // Fronting variant: "Jeden Tag sorgen die Eltern für ihre Kinder."
  { id: 'as-sorgen-fuer', collocationId: 'sorgen-fuer', level: 'B1',
    tiles: ['die Eltern', 'sorgen', 'jeden Tag', 'für ihre Kinder'],
    variants: [[2, 1, 0, 3], [3, 1, 0, 2]], punctuation: '.' },
  // Fronting variant: "Oft denke ich an meine Kindheit."
  { id: 'as-denken-an', collocationId: 'denken-an', level: 'B1',
    tiles: ['ich', 'denke', 'oft', 'an meine Kindheit'],
    variants: [[2, 1, 0, 3], [3, 1, 0, 2]], punctuation: '.' },
  // Korrelat (daran, dass …).
  { id: 'as-sich-erinnern-an', collocationId: 'sich-erinnern-an', level: 'B1',
    tiles: ['ich', 'erinnere mich', 'daran,', 'dass wir uns schon mal getroffen haben'],
    punctuation: '.' },
  // Fronting variant: "Heute sprechen wir über die Zukunft."
  { id: 'as-sprechen-ueber', collocationId: 'sprechen-ueber', level: 'B1',
    tiles: ['wir', 'sprechen', 'heute', 'über die Zukunft'],
    variants: [[2, 1, 0, 3], [3, 1, 0, 2]], punctuation: '.' },
  // Reflexive + full-noun subject. Fronting: "Um den Hund kümmert sich meine Schwester liebevoll."
  { id: 'as-sich-kuemmern-um', collocationId: 'sich-kuemmern-um', level: 'B1',
    tiles: ['meine Schwester', 'kümmert sich', 'liebevoll', 'um den Hund'],
    variants: [[3, 1, 0, 2]], punctuation: '.' },
  // Fronting variant: "Nach dem Weg fragt der Tourist höflich."
  { id: 'as-fragen-nach', collocationId: 'fragen-nach', level: 'B1',
    tiles: ['der Tourist', 'fragt', 'höflich', 'nach dem Weg'],
    variants: [[3, 1, 0, 2]], punctuation: '.' },
  // Yes/no question — verb-first order is fixed, so no variant.
  { id: 'as-suchen-nach', collocationId: 'suchen-nach', level: 'B1',
    tiles: ['suchst', 'du', 'überall', 'nach deinem Schlüssel'],
    punctuation: '?' },
  // Korrelat (davor, zu …).
  { id: 'as-sich-fuerchten-vor', collocationId: 'sich-fuerchten-vor', level: 'B1',
    tiles: ['ich', 'fürchte mich', 'davor,', 'allein zu sein'],
    punctuation: '.' },
  // Dative pronoun 'mir' glued to the verb; noun subject follows it after fronting:
  // "Oft hilft mir meine Mutter bei den Hausaufgaben."
  { id: 'as-helfen-bei', collocationId: 'helfen-bei', level: 'B1',
    tiles: ['meine Mutter', 'hilft mir', 'oft', 'bei den Hausaufgaben'],
    variants: [[2, 1, 0, 3], [3, 1, 0, 2]], punctuation: '.' },

  // ─────────────────────────────── B2 ───────────────────────────────
  // Fronting variant: "Auf den Nachtisch verzichte ich gern."
  { id: 'as-verzichten-auf', collocationId: 'verzichten-auf', level: 'B2',
    tiles: ['ich', 'verzichte', 'gern', 'auf den Nachtisch'],
    variants: [[3, 1, 0, 2]], punctuation: '.' },
  // Korrelat (darüber, dass …).
  { id: 'as-sich-wundern-ueber', collocationId: 'sich-wundern-ueber', level: 'B2',
    tiles: ['ich', 'wundere mich', 'darüber,', 'dass niemand kam'],
    punctuation: '.' },
  // Fronting variant: "Über den Unfall berichtet die Zeitung ausführlich."
  { id: 'as-berichten-ueber', collocationId: 'berichten-ueber', level: 'B2',
    tiles: ['die Zeitung', 'berichtet', 'ausführlich', 'über den Unfall'],
    variants: [[3, 1, 0, 2]], punctuation: '.' },
  // Korrelat (davon ab, ob …) — separable ab-.
  { id: 'as-abhaengen-von', collocationId: 'abhaengen-von', level: 'B2',
    tiles: ['es', 'hängt', 'davon ab,', 'ob es morgen regnet'],
    punctuation: '.' },
  // Accusative pronoun is its own tile; fronting: "Von seinem Plan überzeugt er mich."
  { id: 'as-ueberzeugen-von', collocationId: 'ueberzeugen-von', level: 'B2',
    tiles: ['er', 'überzeugt', 'mich', 'von seinem Plan'],
    variants: [[3, 1, 0, 2]], punctuation: '.' },
  // Fronting variant: "Von der neuen Regel profitieren alle sehr."
  { id: 'as-profitieren-von', collocationId: 'profitieren-von', level: 'B2',
    tiles: ['alle', 'profitieren', 'sehr', 'von der neuen Regel'],
    variants: [[3, 1, 0, 2]], punctuation: '.' },
  // Korrelat (damit, dass …).
  { id: 'as-rechnen-mit', collocationId: 'rechnen-mit', level: 'B2',
    tiles: ['wir', 'rechnen', 'damit,', 'dass es teurer wird'],
    punctuation: '.' },
  // Korrelat (dafür ein, dass …) — reflexive + separable ein-.
  { id: 'as-sich-einsetzen-fuer', collocationId: 'sich-einsetzen-fuer', level: 'B2',
    tiles: ['sie', 'setzt sich', 'dafür ein,', 'dass alle mitmachen'],
    punctuation: '.' },
  // Exclamation. Fronting: "Um den Titel kämpfen die Teams hart!"
  { id: 'as-kaempfen-um', collocationId: 'kaempfen-um', level: 'B2',
    tiles: ['die Teams', 'kämpfen', 'hart', 'um den Titel'],
    variants: [[3, 1, 0, 2]], punctuation: '!' },
  // Korrelat (danach, zu …).
  { id: 'as-sich-sehnen-nach', collocationId: 'sich-sehnen-nach', level: 'B2',
    tiles: ['ich', 'sehne mich', 'danach,', 'endlich auszuschlafen'],
    punctuation: '.' },
  // Fronting variant: "Vor dem Glatteis warnt die Polizei eindringlich."
  { id: 'as-warnen-vor', collocationId: 'warnen-vor', level: 'B2',
    tiles: ['die Polizei', 'warnt', 'eindringlich', 'vor dem Glatteis'],
    variants: [[3, 1, 0, 2]], punctuation: '.' },
  // Korrelat (dazu, dass …).
  { id: 'as-fuehren-zu', collocationId: 'fuehren-zu', level: 'B2',
    tiles: ['der Fehler', 'führt', 'dazu,', 'dass alles teurer wird'],
    punctuation: '.' },
  // Korrelat (dazu bei, dass …) — separable bei-.
  { id: 'as-beitragen-zu', collocationId: 'beitragen-zu', level: 'B2',
    tiles: ['jeder', 'trägt', 'dazu bei,', 'dass es klappt'],
    punctuation: '.' },
  // Korrelat (dagegen, dass …) — reflexive.
  { id: 'as-sich-wehren-gegen', collocationId: 'sich-wehren-gegen', level: 'B2',
    tiles: ['er', 'wehrt sich', 'dagegen,', 'dass man ihm die Schuld gibt'],
    punctuation: '.' },
  // Fronting variant: "Gegen das Gesetz protestieren die Bürger lautstark."
  { id: 'as-protestieren-gegen', collocationId: 'protestieren-gegen', level: 'B2',
    tiles: ['die Bürger', 'protestieren', 'lautstark', 'gegen das Gesetz'],
    variants: [[3, 1, 0, 2]], punctuation: '.' },
  // Fronting variant: "Aus unseren Fehlern lernen wir viel."
  { id: 'as-lernen-aus', collocationId: 'lernen-aus', level: 'B2',
    tiles: ['wir', 'lernen', 'viel', 'aus unseren Fehlern'],
    variants: [[3, 1, 0, 2]], punctuation: '.' },

  // ─────────────────────────────── C1 ───────────────────────────────
  // Korrelat (darauf ein, zu …) — reflexive + separable ein-.
  { id: 'as-sich-einlassen-auf', collocationId: 'sich-einlassen-auf', level: 'C1',
    tiles: ['ich', 'lasse mich', 'darauf ein,', 'ein Risiko einzugehen'],
    punctuation: '.' },
  // Fronting variant: "Auf frühere Studien verweist der Autor mehrfach."
  { id: 'as-verweisen-auf', collocationId: 'verweisen-auf', level: 'C1',
    tiles: ['der Autor', 'verweist', 'mehrfach', 'auf frühere Studien'],
    variants: [[3, 1, 0, 2]], punctuation: '.' },
  // Fronting variant: "An unsere Vernunft appelliert der Redner eindringlich."
  { id: 'as-appellieren-an', collocationId: 'appellieren-an', level: 'C1',
    tiles: ['der Redner', 'appelliert', 'eindringlich', 'an unsere Vernunft'],
    variants: [[3, 1, 0, 2]], punctuation: '.' },
  // Fronting variant: "Nach Anerkennung strebt er sein Leben lang."
  { id: 'as-streben-nach', collocationId: 'streben-nach', level: 'C1',
    tiles: ['er', 'strebt', 'sein Leben lang', 'nach Anerkennung'],
    variants: [[3, 1, 0, 2], [2, 1, 0, 3]], punctuation: '.' },
  // Reflexive + full-noun subject. Fronting: "Von der Aussage distanziert sich die Partei klar."
  { id: 'as-sich-distanzieren-von', collocationId: 'sich-distanzieren-von', level: 'C1',
    tiles: ['die Partei', 'distanziert sich', 'klar', 'von der Aussage'],
    variants: [[3, 1, 0, 2]], punctuation: '.' },
  // Reflexive + separable auseinander-; pronoun subject → no clean fronting.
  { id: 'as-sich-auseinandersetzen-mit', collocationId: 'sich-auseinandersetzen-mit', level: 'C1',
    tiles: ['er', 'setzt sich', 'intensiv', 'mit dem Thema', 'auseinander'],
    punctuation: '.' },
  // Fronting variant: "Über viel Kapital verfügt die Firma inzwischen."
  { id: 'as-verfuegen-ueber', collocationId: 'verfuegen-ueber', level: 'C1',
    tiles: ['die Firma', 'verfügt', 'inzwischen', 'über viel Kapital'],
    variants: [[3, 1, 0, 2], [2, 1, 0, 3]], punctuation: '.' },
  // Korrelat (dazu, zu … Perfekt) — reflexive.
  { id: 'as-sich-bekennen-zu', collocationId: 'sich-bekennen-zu', level: 'C1',
    tiles: ['sie', 'bekennt sich', 'dazu,', 'einen Fehler gemacht zu haben'],
    punctuation: '.' },
  // Separable vor-; 5 tiles. Fronting: "Gegen die Banden geht die Polizei entschlossen vor."
  { id: 'as-vorgehen-gegen', collocationId: 'vorgehen-gegen', level: 'C1',
    tiles: ['die Polizei', 'geht', 'entschlossen', 'gegen die Banden', 'vor'],
    variants: [[3, 1, 0, 2, 4]], punctuation: '.' },
  // Fronting variant: "Aus den Daten folgt eindeutig eine klare Tendenz."
  { id: 'as-folgen-aus', collocationId: 'folgen-aus', level: 'C1',
    tiles: ['eine klare Tendenz', 'folgt', 'eindeutig', 'aus den Daten'],
    variants: [[3, 1, 2, 0]], punctuation: '.' },
]
