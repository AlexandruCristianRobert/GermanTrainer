// src/data/directionVerbs.ts
//
// Authored dataset for the LEXICALIZED-VERB reading drill (T8). Each item is one
// sentence that uses a hin-/her- prefix verb in EXACTLY ONE of its two readings:
//
//   • 'directional'  — the prefix still means direction, deictically anchored:
//                      hin = away from the speaker, her = toward the speaker
//                      (herunterkommen = come down to me, hinausgehen = go out).
//   • 'lexicalized'  — the prefix has fused into a fixed meaning that no longer
//                      points anywhere: herstellen = produzieren, hinrichten =
//                      die Todesstrafe vollstrecken, herausfinden = ermitteln,
//                      über etwas hinausgehen = übersteigen, auf etwas
//                      hereinfallen = getäuscht werden.
//
// Accuracy is a shipping gate: read every sentence aloud in BOTH readings; one
// reading must be impossible or absurd. The directional reading is blocked when
// no place can be entered or left — an abstract object (einen Zusammenhang
// herstellen, eine Forderung geht darüber hinaus), a dass-/wie-/warum-clause
// (herausfinden, hinzufügen, hervorheben), or a subject that cannot move at all
// (eine Studie weist hin, ein Viertel kommt herunter). The lexicalized reading is
// blocked when the sentence supplies a physical source or goal and withholds the
// collocation the fixed sense needs (aus dem Haus, den Hang, in den Hof; no
// über-/auf-phrase for hinausgehen/hinauslaufen, no auf-object for hereinfallen).
//
// DW_VERB_ENTRIES.bothReadings is an attestation claim, not a convenience flag:
// it is true only for verbs whose BOTH readings are real, current German. The
// eight flagged verbs, with one attested usage per reading:
//
//   herausfinden    ermitteln: "Wir haben herausgefunden, warum …"
//                   wörtlich:  "Ich finde aus diesem Wald nicht mehr heraus."
//   herauskommen    erscheinen: "Der Roman kommt im Herbst heraus."
//                   wörtlich:   "Sie kam aus dem Haus heraus."
//   herunterkommen  verfallen:  "Das Viertel ist heruntergekommen."
//                   wörtlich:   "Komm bitte herunter, das Essen ist fertig!"
//   herunterfahren  abschalten: "Fahren Sie den Rechner herunter."
//                   wörtlich:   "Wir fuhren den Pass herunter."
//   hinausgehen     übersteigen: "Das geht über meine Befugnisse hinaus."
//                   wörtlich:    "Sie ging in den Garten hinaus."
//   hinauslaufen    bedeuten: "Das läuft auf dasselbe hinaus."
//                   wörtlich: "Die Kinder liefen in den Hof hinaus."
//   hereinfallen    getäuscht werden: "Er ist auf den Trick hereingefallen."
//                   wörtlich:         "Durch das Fenster fiel Licht herein."
//   herausbringen   veröffentlichen: "Der Verlag bringt eine Reihe heraus."
//                   wörtlich:        "Sie brachten ihn aus dem Haus heraus."
//
// Verbs flagged false contribute items in ONE reading only; their opposite label
// is the drill's distractor. hereinbrechen was evaluated and rejected: its
// physical inrush ("die Wassermassen brachen herein") and its "descend upon"
// use ("die Nacht bricht herein") are the same sense read literally vs.
// figuratively, so a two-button pick over it would be arbitrary.
// Invariants live in tests/data/directionVerbs.test.ts.

import type { DirectionLevel } from './directionWords'

/** The two readings a prefix verb can carry in this drill. */
export type DwVerbReading = 'directional' | 'lexicalized'

export interface DwVerbEntry {
  /** Infinitive as the drill labels it, e.g. 'herstellen'. */
  verb: string
  /** German+EN label for the literal prefix reading (the two-button left choice). */
  directionalLabel: string
  /** German+EN label for the fused, non-directional meaning. */
  lexicalizedLabel: string
  /** True only when real German attests BOTH readings for this verb. */
  bothReadings: boolean
}

export interface DwVerbItem {
  /** Unique id, `lx-<n>`. */
  id: string
  /** Joins DW_VERB_ENTRIES.verb. */
  verb: string
  /** One sentence using the verb in exactly ONE reading. */
  sentence: string
  /**
   * 1–2 substrings appearing VERBATIM in `sentence`, spanning the verb: split
   * forms give two (['stellt', 'her']), fused forms one (['herausgefunden']).
   * German separable prefixes move and inflect, so no regex over the infinitive
   * can find them — the bolding needs the surfaces spelled out.
   */
  surfaces: string[]
  /** Which reading the sentence admits. */
  reading: DwVerbReading
  /** German+English teaching line: names the reading AND why the other is blocked. */
  explanation: string
  level: DirectionLevel
}

/** The verbs with the labels the two-button pick shows. */
export const DW_VERB_ENTRIES: DwVerbEntry[] = [
  // ─── lexicalized only: the Phase-1 cheatsheet verbs (+ two extras) ───
  { verb: 'herstellen', bothReadings: false,
    directionalLabel: 'her = zum Sprecher — "put it over here"',
    lexicalizedLabel: 'herstellen = produzieren — "to manufacture"' },
  { verb: 'hinrichten', bothReadings: false,
    directionalLabel: 'hin = dorthin richten — "aim it that way"',
    lexicalizedLabel: 'hinrichten = die Todesstrafe vollstrecken — "to execute"' },
  { verb: 'hinweisen', bothReadings: false,
    directionalLabel: 'hin = mit der Hand dorthin zeigen — "point over there"',
    lexicalizedLabel: 'hinweisen auf = aufmerksam machen — "to point out"' },
  { verb: 'hinzufügen', bothReadings: false,
    directionalLabel: 'hinzu = dorthin dazufügen — "join it on over there"',
    lexicalizedLabel: 'hinzufügen = ergänzen — "to add"' },
  { verb: 'herausfordern', bothReadings: false,
    directionalLabel: 'heraus = nach draußen rufen — "demand that he come out"',
    lexicalizedLabel: 'herausfordern = zum Kampf oder Widerspruch reizen — "to challenge, provoke"' },
  { verb: 'herausstellen', bothReadings: false,
    directionalLabel: 'heraus = nach draußen stellen — "put it outside"',
    lexicalizedLabel: 'sich herausstellen = sich erweisen — "to turn out"' },
  { verb: 'hervorheben', bothReadings: false,
    directionalLabel: 'hervor = nach vorn heben — "lift it out from behind"',
    lexicalizedLabel: 'hervorheben = betonen — "to emphasize"' },
  { verb: 'hinnehmen', bothReadings: false,
    directionalLabel: 'hin = dorthin mitnehmen — "take it over there"',
    lexicalizedLabel: 'hinnehmen = dulden, akzeptieren — "to put up with"' },
  { verb: 'hinauszögern', bothReadings: false,
    directionalLabel: 'hinaus = zögernd nach draußen — "edge outside hesitantly"',
    lexicalizedLabel: 'hinauszögern = aufschieben — "to delay, drag out"' },

  // ─── both readings attested (evidence pairs in the file header) ───
  { verb: 'herausfinden', bothReadings: true,
    directionalLabel: 'heraus = nach draußen — "find your way out"',
    lexicalizedLabel: 'herausfinden = ermitteln — "to find out"' },
  { verb: 'herauskommen', bothReadings: true,
    directionalLabel: 'heraus = nach draußen kommen — "come out of a place"',
    lexicalizedLabel: 'herauskommen = erscheinen, veröffentlicht werden — "to come out, be released"' },
  { verb: 'herunterkommen', bothReadings: true,
    directionalLabel: 'herunter = nach unten zum Sprecher — "come down here"',
    lexicalizedLabel: 'herunterkommen = verfallen, verwahrlosen — "to go to seed, become run-down"' },
  { verb: 'herunterfahren', bothReadings: true,
    directionalLabel: 'herunter = nach unten fahren — "drive or ride down"',
    lexicalizedLabel: 'herunterfahren = abschalten, zurückfahren — "to shut down, scale back"' },
  { verb: 'hinausgehen', bothReadings: true,
    directionalLabel: 'hinaus = nach draußen gehen — "go outside"',
    lexicalizedLabel: 'über etwas hinausgehen = übersteigen — "to exceed, go beyond"' },
  { verb: 'hinauslaufen', bothReadings: true,
    directionalLabel: 'hinaus = nach draußen laufen — "run outside"',
    lexicalizedLabel: 'auf etwas hinauslaufen = im Ergebnis bedeuten — "to amount to"' },
  { verb: 'hereinfallen', bothReadings: true,
    directionalLabel: 'herein = nach innen fallen — "fall or shine in"',
    lexicalizedLabel: 'auf etwas hereinfallen = getäuscht werden — "to be taken in, be duped"' },
  { verb: 'herausbringen', bothReadings: true,
    directionalLabel: 'heraus = nach draußen bringen — "carry it out"',
    lexicalizedLabel: 'herausbringen = veröffentlichen, auf den Markt bringen — "to publish, release"' },
]

const entryByVerb = new Map(DW_VERB_ENTRIES.map(e => [e.verb, e]))

/** The entry an item belongs to; throws when an item names an unknown verb. */
export function verbEntryFor(item: DwVerbItem): DwVerbEntry {
  const entry = entryByVerb.get(item.verb)
  if (!entry) throw new Error(`Unknown direction verb: ${item.verb}`)
  return entry
}

export const DIRECTION_VERBS: DwVerbItem[] = [
  // ═══════════════════════════ herstellen ═══════════════════════════
  // Lexicalized only: produzieren / zustande bringen. The directional distractor
  // would need a goal ("hierher stellen"), which no item supplies.
  { id: 'lx-1', verb: 'herstellen', reading: 'lexicalized', level: 'B1',
    sentence: 'Die Firma stellt seit über hundert Jahren Möbel her.',
    surfaces: ['stellt', 'her'],
    explanation: 'herstellen = produzieren; niemand "stellt Möbel hierher" — die Firma fertigt sie. / Lexicalized: manufacture. The directional reading (placing furniture here) is blocked by "seit hundert Jahren" and the company subject.' },
  { id: 'lx-2', verb: 'herstellen', reading: 'lexicalized', level: 'B2',
    sentence: 'Diese Geigen werden noch heute von Hand in Mittenwald hergestellt.',
    surfaces: ['hergestellt'],
    explanation: 'herstellen = anfertigen; "von Hand" beschreibt die Fertigung, kein Ziel, an das etwas gestellt wird. / Lexicalized: manufacture — "von Hand" names how they are made, so nothing is being placed anywhere.' },
  { id: 'lx-3', verb: 'herstellen', reading: 'lexicalized', level: 'C1',
    sentence: 'Zwischen den beiden Aussagen konnte die Polizei keinen Zusammenhang herstellen.',
    surfaces: ['herstellen'],
    explanation: 'herstellen = zustande bringen; einen Zusammenhang kann man nirgendwohin stellen. / Lexicalized: establish. The object is abstract, so the physical "put it here" reading is impossible.' },

  // ═══════════════════════════ hinrichten ═══════════════════════════
  // Lexicalized only: eine Todesstrafe vollstrecken.
  { id: 'lx-4', verb: 'hinrichten', reading: 'lexicalized', level: 'B2',
    sentence: 'Der Verräter wurde 1601 im Hof der Festung hingerichtet.',
    surfaces: ['hingerichtet'],
    explanation: 'hinrichten = die Todesstrafe vollstrecken; "dorthin richten" ergibt bei einer Person keinen Sinn. / Lexicalized: execute. Nobody "aimed" the traitor anywhere — the passive plus the date fixes the fused sense.' },
  { id: 'lx-5', verb: 'hinrichten', reading: 'lexicalized', level: 'C1',
    sentence: 'Das Gericht verhängte die Todesstrafe, und drei Wochen später richtete man ihn hin.',
    surfaces: ['richtete', 'hin'],
    explanation: 'Nach einem Todesurteil kann "jemanden hinrichten" nur die Vollstreckung meinen. / Lexicalized: execute — after a death sentence the literal "direct him that way" reading is absurd. Note the split prefix.' },

  // ═══════════════════════════ hinweisen ═══════════════════════════
  // Lexicalized only: aufmerksam machen auf.
  { id: 'lx-6', verb: 'hinweisen', reading: 'lexicalized', level: 'B2',
    sentence: 'Die Studie weist auf ein grundlegendes Problem in der Verwaltung hin.',
    surfaces: ['weist', 'hin'],
    explanation: 'hinweisen auf = aufmerksam machen; eine Studie hat keine Hand, die irgendwohin zeigt. / Lexicalized: point out. The subject cannot gesture and the object is abstract, so no literal pointing.' },
  { id: 'lx-7', verb: 'hinweisen', reading: 'lexicalized', level: 'B2',
    sentence: 'Ich möchte darauf hinweisen, dass die Anmeldefrist morgen abläuft.',
    surfaces: ['hinweisen'],
    explanation: 'hinweisen auf = sagen, worauf man achten soll; "darauf … dass" kündigt einen Satz an, keinen Ort. / Lexicalized: point out. The "darauf … dass" frame announces a clause, so nothing is pointed at physically.' },

  // ═══════════════════════════ hinzufügen ═══════════════════════════
  // Lexicalized only: ergänzen (Zutat oder Bemerkung).
  { id: 'lx-8', verb: 'hinzufügen', reading: 'lexicalized', level: 'B1',
    sentence: 'Zum Schluss fügt man einen Teelöffel Zimt hinzu.',
    surfaces: ['fügt', 'hinzu'],
    explanation: 'hinzufügen = ergänzen; Zimt wird nicht "dorthin gefügt", sondern dazugegeben. / Lexicalized: add. "fügen" in its literal joining sense cannot take cinnamon, and no goal is named.' },
  { id: 'lx-9', verb: 'hinzufügen', reading: 'lexicalized', level: 'B2',
    sentence: 'Er fügte noch hinzu, dass er mit dieser Entscheidung nicht einverstanden sei.',
    surfaces: ['fügte', 'hinzu'],
    explanation: 'hinzufügen = ergänzend sagen; der dass-Satz ist das Ergänzte. / Lexicalized: add (a remark). A dass-clause cannot be joined onto a place, so the literal reading is blocked.' },

  // ═══════════════════════════ herausfordern ═══════════════════════════
  // Lexicalized only: zum Kampf oder Widerspruch reizen.
  { id: 'lx-10', verb: 'herausfordern', reading: 'lexicalized', level: 'B2',
    sentence: 'Der junge Boxer fordert den Titelverteidiger zu einem Rückkampf heraus.',
    surfaces: ['fordert', 'heraus'],
    explanation: 'herausfordern = zum Kampf auffordern; "zu einem Rückkampf" nennt den Wettkampf, nicht die Tür. / Lexicalized: challenge. The "zu + contest" phrase blocks any "demand he step outside" reading.' },
  { id: 'lx-11', verb: 'herausfordern', reading: 'lexicalized', level: 'C1',
    sentence: 'Mit dieser Bemerkung hat sie die Kritiker bewusst herausgefordert.',
    surfaces: ['herausgefordert'],
    explanation: 'herausfordern = provozieren; eine Bemerkung ruft niemanden nach draußen. / Lexicalized: provoke. A remark cannot summon anyone outdoors, so the directional reading fails.' },

  // ═══════════════════════════ herausstellen ═══════════════════════════
  // Lexicalized only: sich erweisen (reflexiv).
  { id: 'lx-12', verb: 'herausstellen', reading: 'lexicalized', level: 'B2',
    sentence: 'Später stellte sich heraus, dass die Zahlen manipuliert worden waren.',
    surfaces: ['stellte', 'heraus'],
    explanation: 'sich herausstellen = sich erweisen; das Reflexivpronomen plus dass-Satz lässt kein Hinausstellen zu. / Lexicalized: turn out. Reflexive plus dass-clause — nothing is being put outside.' },
  { id: 'lx-13', verb: 'herausstellen', reading: 'lexicalized', level: 'C1',
    sentence: 'Der angebliche Rembrandt hat sich schnell als Fälschung herausgestellt.',
    surfaces: ['herausgestellt'],
    explanation: '"sich als etwas herausstellen" = sich erweisen; das Bild wurde nicht nach draußen gestellt. / Lexicalized: turn out to be. The "als + predicate" frame is only available to the fused sense.' },

  // ═══════════════════════════ hervorheben ═══════════════════════════
  // Lexicalized only: betonen.
  { id: 'lx-14', verb: 'hervorheben', reading: 'lexicalized', level: 'B2',
    sentence: 'Die Lehrerin hob besonders hervor, wie sorgfältig er gearbeitet hatte.',
    surfaces: ['hob', 'hervor'],
    explanation: 'hervorheben = betonen; gehoben wird kein Gegenstand, sondern ein wie-Satz folgt. / Lexicalized: emphasize. A wie-clause cannot be lifted out from behind anything.' },
  { id: 'lx-15', verb: 'hervorheben', reading: 'lexicalized', level: 'C1',
    sentence: 'In seiner Rede hat der Minister die Rolle der Ehrenamtlichen hervorgehoben.',
    surfaces: ['hervorgehoben'],
    explanation: 'hervorheben = betonen; eine "Rolle" ist nichts, was man nach vorn heben kann. / Lexicalized: highlight. The abstract object blocks the literal lifting-forward reading.' },

  // ═══════════════════════════ hinnehmen ═══════════════════════════
  // Lexicalized only: dulden, akzeptieren.
  { id: 'lx-16', verb: 'hinnehmen', reading: 'lexicalized', level: 'B2',
    sentence: 'Diese ständigen Verspätungen müssen wir nicht länger hinnehmen.',
    surfaces: ['hinnehmen'],
    explanation: 'hinnehmen = dulden; Verspätungen kann man nicht "dorthin nehmen". / Lexicalized: put up with. The abstract object rules out carrying anything anywhere.' },

  // ═══════════════════════════ hinauszögern ═══════════════════════════
  // Lexicalized only: aufschieben.
  { id: 'lx-17', verb: 'hinauszögern', reading: 'lexicalized', level: 'C1',
    sentence: 'Die Behörde zögerte die Entscheidung um weitere Monate hinaus.',
    surfaces: ['zögerte', 'hinaus'],
    explanation: 'hinauszögern = aufschieben; "zögern" enthält keine Bewegung, und eine Entscheidung geht nicht nach draußen. / Lexicalized: drag out, delay. "zögern" denotes no motion, so "hinaus" can only be temporal here.' },

  // ═══════════════════════════ herausfinden (both) ═══════════════════════════
  // lexicalized: ermitteln (mit Objekt oder w-Satz). directional: den Weg ins
  // Freie finden (kein Objekt, dafür ein Ort, aus dem man herausmuss).
  { id: 'lx-18', verb: 'herausfinden', reading: 'lexicalized', level: 'B1',
    sentence: 'Wir haben inzwischen herausgefunden, warum der Zug ausgefallen ist.',
    surfaces: ['herausgefunden'],
    explanation: 'herausfinden = ermitteln — der dass-/warum-Satz zeigt es an. / Lexicalized: find out; the warum-clause blocks any "find the way out" reading.' },
  { id: 'lx-19', verb: 'herausfinden', reading: 'lexicalized', level: 'B1',
    sentence: 'Die Polizei will herausfinden, wer den Brand gelegt hat.',
    surfaces: ['herausfinden'],
    explanation: 'herausfinden = ermitteln; der wer-Satz ist das Ermittelte, kein Ort. / Lexicalized: find out. The wer-clause is the thing discovered, so there is no place to exit.' },
  { id: 'lx-20', verb: 'herausfinden', reading: 'directional', level: 'B2',
    sentence: 'Der Wald ist groß — findest du allein wieder heraus?',
    surfaces: ['findest', 'heraus'],
    explanation: 'Hier wörtlich: den Weg nach draußen finden. / Directional: find your way out of the forest — a physical exit, not a fact.' },
  { id: 'lx-21', verb: 'herausfinden', reading: 'directional', level: 'B2',
    sentence: 'Das Kellergewölbe ist ein Labyrinth — ohne Führer findet man kaum wieder heraus.',
    surfaces: ['findet', 'heraus'],
    explanation: 'Wörtlich: aus dem Gewölbe herausfinden; es fehlt jedes Objekt und jeder w-Satz. / Directional: find your way out of the vault. With no object and no clause, "ermitteln" has nothing to discover.' },

  // ═══════════════════════════ herauskommen (both) ═══════════════════════════
  // lexicalized: erscheinen / veröffentlicht werden. directional: aus einem Ort
  // nach draußen kommen (belebtes Subjekt plus Quelle).
  { id: 'lx-22', verb: 'herauskommen', reading: 'lexicalized', level: 'B2',
    sentence: 'Der neue Roman des Autors kommt erst im Herbst heraus.',
    surfaces: ['kommt', 'heraus'],
    explanation: 'herauskommen = erscheinen; ein Roman verlässt keinen Raum, "im Herbst" nennt den Erscheinungstermin. / Lexicalized: be released. A novel cannot walk out of anywhere; the time phrase names a publication date.' },
  { id: 'lx-23', verb: 'herauskommen', reading: 'directional', level: 'B1',
    sentence: 'Er klopfte lange, aber niemand kam aus dem Haus heraus.',
    surfaces: ['kam', 'heraus'],
    explanation: 'Wörtlich: aus dem Haus nach draußen — der Sprecher steht davor. / Directional: come out of the house. "aus dem Haus" supplies the source, so the "be published" reading is impossible.' },
  { id: 'lx-24', verb: 'herauskommen', reading: 'directional', level: 'B1',
    sentence: 'Die Katze hat sich unter das Bett verkrochen und kommt nicht mehr heraus.',
    surfaces: ['kommt', 'heraus'],
    explanation: 'Wörtlich: unter dem Bett hervor, zum Sprecher hin. / Directional: come out from under the bed. A cat is not published, and the hiding place is stated.' },

  // ═══════════════════════════ herunterkommen (both) ═══════════════════════════
  // lexicalized: verfallen, verwahrlosen (Perfekt/Partizip, unbewegliches
  // Subjekt). directional: von oben nach unten zum Sprecher.
  { id: 'lx-25', verb: 'herunterkommen', reading: 'lexicalized', level: 'C1',
    sentence: 'Das Viertel am Hafen ist in den letzten Jahren sichtlich heruntergekommen.',
    surfaces: ['heruntergekommen'],
    explanation: 'herunterkommen = verfallen; ein Stadtviertel kann nicht die Treppe herunterkommen. / Lexicalized: become run-down. The subject cannot move, so no descent is available.' },
  { id: 'lx-26', verb: 'herunterkommen', reading: 'directional', level: 'B1',
    sentence: 'Das Essen ist fertig — kommt bitte alle herunter!',
    surfaces: ['kommt', 'herunter'],
    explanation: 'Wörtlich: von oben nach unten, wo der Sprecher steht (her = zu mir). / Directional: come downstairs. An imperative to people at dinner time cannot mean "go to seed".' },
  { id: 'lx-27', verb: 'herunterkommen', reading: 'directional', level: 'B1',
    sentence: 'Sie stand oben auf der Leiter und kam nur sehr langsam herunter.',
    surfaces: ['kam', 'herunter'],
    explanation: 'Wörtlich: von der Leiter nach unten; "oben" nennt den Ausgangspunkt. / Directional: climb down the ladder. "oben auf der Leiter" fixes a physical descent.' },

  // ═══════════════════════════ herunterfahren (both) ═══════════════════════════
  // lexicalized: abschalten / zurückfahren (Rechner, Produktion, Reaktor).
  // directional: einen Hang oder Pass hinunterfahren.
  { id: 'lx-28', verb: 'herunterfahren', reading: 'lexicalized', level: 'B2',
    sentence: 'Fahren Sie den Rechner vor dem Update bitte ordentlich herunter.',
    surfaces: ['Fahren', 'herunter'],
    explanation: 'herunterfahren = abschalten; ein Rechner wird keinen Berg hinuntergefahren. / Lexicalized: shut down. The object is a computer and the context is an update, so no slope is involved.' },
  { id: 'lx-29', verb: 'herunterfahren', reading: 'directional', level: 'B1',
    sentence: 'Wir sind mit den Rädern den ganzen Pass heruntergefahren.',
    surfaces: ['heruntergefahren'],
    explanation: 'Wörtlich: den Pass hinab, zum Sprecher hin gedacht. / Directional: ride down the pass. Bicycles and a mountain pass leave no room for "shut down".' },
  { id: 'lx-30', verb: 'herunterfahren', reading: 'directional', level: 'B1',
    sentence: 'Die Kinder fuhren mit dem Schlitten den Hang herunter.',
    surfaces: ['fuhren', 'herunter'],
    explanation: 'Wörtlich: den Hang hinab. / Directional: sledge down the slope — a stated slope blocks the "shut down / scale back" sense.' },

  // ═══════════════════════════ hinausgehen (both) ═══════════════════════════
  // lexicalized: über etwas hinausgehen = übersteigen (immer mit über-Phrase,
  // abstraktes Subjekt). directional: nach draußen gehen (Ziel im Raum).
  { id: 'lx-31', verb: 'hinausgehen', reading: 'lexicalized', level: 'C1',
    sentence: 'Diese Forderung geht weit über das hinaus, was im Vertrag steht.',
    surfaces: ['geht', 'hinaus'],
    explanation: 'über etwas hinausgehen = übersteigen; eine Forderung geht nirgendwohin, die über-Phrase erzwingt die feste Lesart. / Lexicalized: exceed. An abstract subject plus "über … hinaus" cannot describe walking outdoors.' },
  { id: 'lx-32', verb: 'hinausgehen', reading: 'directional', level: 'B1',
    sentence: 'Es hat aufgehört zu regnen — wollen wir kurz in den Garten hinausgehen?',
    surfaces: ['hinausgehen'],
    explanation: 'Wörtlich: nach draußen, weg vom Sprecherort (hin = von mir weg). / Directional: go out into the garden. A physical goal and no über-phrase, so nothing is being exceeded.' },
  { id: 'lx-33', verb: 'hinausgehen', reading: 'directional', level: 'B1',
    sentence: 'Als es an der Tür klingelte, ging sie hinaus und schaute nach.',
    surfaces: ['ging', 'hinaus'],
    explanation: 'Wörtlich: aus dem Zimmer nach draußen zur Tür. / Directional: go out to the door. Without an "über …" phrase the exceed reading has no object.' },

  // ═══════════════════════════ hinauslaufen (both) ═══════════════════════════
  // lexicalized: auf etwas hinauslaufen = im Ergebnis bedeuten (abstraktes
  // Subjekt, auf-Phrase mit Resultat). directional: nach draußen laufen.
  { id: 'lx-34', verb: 'hinauslaufen', reading: 'lexicalized', level: 'B2',
    sentence: 'Beide Vorschläge laufen am Ende auf dasselbe hinaus.',
    surfaces: ['laufen', 'hinaus'],
    explanation: 'auf etwas hinauslaufen = im Ergebnis bedeuten; Vorschläge können nicht laufen. / Lexicalized: amount to the same thing. Proposals cannot run, and "auf dasselbe" names a result, not a place.' },
  { id: 'lx-35', verb: 'hinauslaufen', reading: 'directional', level: 'B1',
    sentence: 'Als es klingelte, liefen die Kinder in den Hof hinaus.',
    surfaces: ['liefen', 'hinaus'],
    explanation: 'Wörtlich: nach draußen in den Hof, weg vom Sprecher. / Directional: run out into the yard. The goal is a place, not an outcome, so "amount to" is blocked.' },
  { id: 'lx-36', verb: 'hinauslaufen', reading: 'directional', level: 'B2',
    sentence: 'Er lief barfuß in den Schnee hinaus, um das Feuerwerk zu sehen.',
    surfaces: ['lief', 'hinaus'],
    explanation: 'Wörtlich: nach draußen in den Schnee. / Directional: run out into the snow — "barfuß" and the purpose clause make it bodily motion, not a result.' },

  // ═══════════════════════════ hereinfallen (both) ═══════════════════════════
  // lexicalized: auf jemanden/etwas hereinfallen = getäuscht werden (auf-Objekt).
  // directional: Licht fällt durch eine Öffnung nach innen (kein auf-Objekt).
  { id: 'lx-37', verb: 'hereinfallen', reading: 'lexicalized', level: 'B2',
    sentence: 'Auf diesen billigen Trick ist sogar der Anwalt hereingefallen.',
    surfaces: ['hereingefallen'],
    explanation: 'auf etwas hereinfallen = sich täuschen lassen; in einen Trick fällt man nicht körperlich. / Lexicalized: be taken in. Physically falling into a trick is absurd; the auf-object marks the fixed sense.' },
  { id: 'lx-38', verb: 'hereinfallen', reading: 'directional', level: 'B2',
    sentence: 'Durch das offene Dachfenster fiel morgens helles Sonnenlicht herein.',
    surfaces: ['fiel', 'herein'],
    explanation: 'Wörtlich: durch das Fenster nach innen, wo der Sprecher ist. / Directional: light falls in through the skylight. Sunlight cannot be duped, and there is no auf-object.' },

  // ═══════════════════════════ herausbringen (both) ═══════════════════════════
  // lexicalized: veröffentlichen / auf den Markt bringen. directional: jemanden
  // oder etwas aus einem Raum nach draußen bringen.
  { id: 'lx-39', verb: 'herausbringen', reading: 'lexicalized', level: 'B2',
    sentence: 'Der Verlag bringt im Frühjahr eine neue Krimireihe heraus.',
    surfaces: ['bringt', 'heraus'],
    explanation: 'herausbringen = veröffentlichen; eine Reihe wird nicht aus einem Zimmer getragen. / Lexicalized: publish. A book series is not carried out of a room; the season names a release date.' },
  { id: 'lx-40', verb: 'herausbringen', reading: 'directional', level: 'B2',
    sentence: 'Die Feuerwehr brachte alle Bewohner unverletzt aus dem Haus heraus.',
    surfaces: ['brachte', 'heraus'],
    explanation: 'Wörtlich: aus dem Haus nach draußen, zum Sprecher hin. / Directional: bring the residents out of the house — people and "aus dem Haus" block the publishing sense.' },
]
