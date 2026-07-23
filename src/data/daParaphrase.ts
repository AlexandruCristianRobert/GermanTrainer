// src/data/daParaphrase.ts
//
// Authored dataset for the Da-compound PARAPHRASE drill. Each item is a matched
// pair that says the SAME thing two ways, driven by one prepositional collocation:
//   • nounSentence  — the object is a NOUN PHRASE; the gap is the bare governed
//     preposition ("Ich kümmere mich ___ die Einhaltung des Termins.").
//   • clauseSentence — the object is a dass-/w-/zu-CLAUSE that restates that noun
//     phrase; the gap is the Korrelat da-compound ("Ich kümmere mich ___, dass der
//     Termin eingehalten wird.").
// The clause is a true paraphrase of the noun phrase, so the learner sees that the
// da-compound is just the preposition pointing forward to a clause.
//
// Accuracy is a shipping gate. Both answers are DERIVED (never stored) by
// paraphraseAnswers() from the joined collocation's preposition: the bare prep for
// the noun sentence, its da-compound for the clause sentence. Invariants (join,
// one gap per sentence, clause marker, no leak, count floor) live in
// tests/data/daParaphrase.test.ts.

import { COLLOCATIONS, type CollocationLevel } from './collocations'
import { daCompound } from './daCompounds'

export interface ParaphraseItem {
  /** Unique id, `pp-<collocationId>`. */
  id: string
  /** Joins COLLOCATIONS by id; supplies preposition and level. */
  collocationId: string
  /** Noun-phrase version; the single gap is the bare governed preposition. */
  nounSentence: string
  /** Clause version restating the noun phrase; the single gap is the Korrelat. */
  clauseSentence: string
  level: CollocationLevel
}

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

/**
 * The two derived answers of the pair: the bare preposition that fills the noun
 * sentence, and its da-compound Korrelat that fills the clause sentence.
 */
export function paraphraseAnswers(item: ParaphraseItem): { prep: string; korrelat: string } {
  const collocation = byId.get(item.collocationId)
  if (!collocation) throw new Error(`Unknown collocationId: ${item.collocationId}`)
  return { prep: collocation.preposition, korrelat: daCompound(collocation.preposition) }
}

export const DA_PARAPHRASE: ParaphraseItem[] = [
  // ─────────────────────────────── auf ───────────────────────────────
  { id: 'pp-sich-kuemmern-um', collocationId: 'sich-kuemmern-um', level: 'B1',
    nounSentence: 'Ich kümmere mich ___ die pünktliche Lieferung der Ware.',
    clauseSentence: 'Ich kümmere mich ___, dass die Ware pünktlich geliefert wird.' },
  { id: 'pp-warten-auf', collocationId: 'warten-auf', level: 'B1',
    nounSentence: 'Wir warten ___ den Beginn der Sommerferien.',
    clauseSentence: 'Wir warten ___, dass die Sommerferien endlich beginnen.' },
  { id: 'pp-sich-freuen-auf', collocationId: 'sich-freuen-auf', level: 'B1',
    nounSentence: 'Ich freue mich ___ das Wiedersehen mit meiner Familie.',
    clauseSentence: 'Ich freue mich ___, meine Familie bald wieder zu sehen.' },
  { id: 'pp-hoffen-auf', collocationId: 'hoffen-auf', level: 'B1',
    nounSentence: 'Alle hoffen ___ eine baldige Besserung des Wetters.',
    clauseSentence: 'Alle hoffen ___, dass das Wetter bald besser wird.' },
  { id: 'pp-achten-auf', collocationId: 'achten-auf', level: 'B1',
    nounSentence: 'Bitte achte ___ die Einhaltung der Regeln.',
    clauseSentence: 'Bitte achte ___, dass die Regeln eingehalten werden.' },
  { id: 'pp-sich-verlassen-auf', collocationId: 'sich-verlassen-auf', level: 'B1',
    nounSentence: 'Ich verlasse mich ___ deine tatkräftige Hilfe.',
    clauseSentence: 'Ich verlasse mich ___, dass du mir tatkräftig hilfst.' },
  { id: 'pp-sich-vorbereiten-auf', collocationId: 'sich-vorbereiten-auf', level: 'B1',
    nounSentence: 'Sie bereitet sich ___ den bevorstehenden Umzug vor.',
    clauseSentence: 'Sie bereitet sich ___ vor, dass sie bald umzieht.' },
  // ─────────────────────────────── an ───────────────────────────────
  { id: 'pp-denken-an', collocationId: 'denken-an', level: 'B1',
    nounSentence: 'Denk bitte ___ das Abschließen der Haustür.',
    clauseSentence: 'Denk bitte ___, dass du die Haustür abschließt.' },
  { id: 'pp-sich-erinnern-an', collocationId: 'sich-erinnern-an', level: 'B1',
    nounSentence: 'Ich erinnere mich noch gut ___ unser erstes Treffen.',
    clauseSentence: 'Ich erinnere mich noch gut ___, dass wir uns damals zum ersten Mal trafen.' },
  { id: 'pp-sich-gewoehnen-an', collocationId: 'sich-gewoehnen-an', level: 'B1',
    nounSentence: 'Er gewöhnt sich langsam ___ das frühe Aufstehen.',
    clauseSentence: 'Er gewöhnt sich langsam ___, dass er jeden Morgen früh aufstehen muss.' },
  { id: 'pp-glauben-an', collocationId: 'glauben-an', level: 'B1',
    nounSentence: 'Sie glaubt fest ___ den Erfolg des Projekts.',
    clauseSentence: 'Sie glaubt fest ___, dass das Projekt ein Erfolg wird.' },
  { id: 'pp-zweifeln-an', collocationId: 'zweifeln-an', level: 'B2',
    nounSentence: 'Ich zweifle ___ der Richtigkeit der Zahlen.',
    clauseSentence: 'Ich zweifle ___, dass die Zahlen wirklich richtig sind.' },
  // ─────────────────────────────── über ───────────────────────────────
  { id: 'pp-sich-freuen-ueber', collocationId: 'sich-freuen-ueber', level: 'B1',
    nounSentence: 'Wir freuen uns sehr ___ deinen unerwarteten Besuch.',
    clauseSentence: 'Wir freuen uns sehr ___, dass du uns unerwartet besuchst.' },
  { id: 'pp-sich-aergern-ueber', collocationId: 'sich-aergern-ueber', level: 'B1',
    nounSentence: 'Er ärgert sich ___ die ständige Verspätung des Busses.',
    clauseSentence: 'Er ärgert sich ___, dass der Bus ständig zu spät kommt.' },
  { id: 'pp-sprechen-ueber', collocationId: 'sprechen-ueber', level: 'B1',
    nounSentence: 'Wir sprechen ___ die Zukunft unseres Vereins.',
    clauseSentence: 'Wir sprechen ___, wie es mit unserem Verein weitergeht.' },
  { id: 'pp-sich-beschweren-ueber', collocationId: 'sich-beschweren-ueber', level: 'B1',
    nounSentence: 'Die Mieter beschweren sich ___ den nächtlichen Lärm.',
    clauseSentence: 'Die Mieter beschweren sich ___, dass es nachts zu laut ist.' },
  { id: 'pp-sich-informieren-ueber', collocationId: 'sich-informieren-ueber', level: 'B1',
    nounSentence: 'Ich informiere mich ___ die genauen Kurszeiten.',
    clauseSentence: 'Ich informiere mich ___, wann die Kurse genau stattfinden.' },
  { id: 'pp-sich-wundern-ueber', collocationId: 'sich-wundern-ueber', level: 'B2',
    nounSentence: 'Sie wundert sich ___ das plötzliche Schweigen aller.',
    clauseSentence: 'Sie wundert sich ___, dass plötzlich alle schweigen.' },
  { id: 'pp-diskutieren-ueber', collocationId: 'diskutieren-ueber', level: 'B1',
    nounSentence: 'Wir diskutieren ___ die Sinnhaftigkeit des Plans.',
    clauseSentence: 'Wir diskutieren ___, ob der Plan wirklich sinnvoll ist.' },
  { id: 'pp-nachdenken-ueber', collocationId: 'nachdenken-ueber', level: 'B1',
    nounSentence: 'Ich denke ___ einen möglichen Umzug nach.',
    clauseSentence: 'Ich denke ___ nach, ob ich vielleicht umziehen soll.' },
  // ─────────────────────────────── von ───────────────────────────────
  { id: 'pp-traeumen-von', collocationId: 'traeumen-von', level: 'B1',
    nounSentence: 'Sie träumt ___ einer großen Weltreise.',
    clauseSentence: 'Sie träumt ___, einmal um die ganze Welt zu reisen.' },
  { id: 'pp-erzaehlen-von', collocationId: 'erzaehlen-von', level: 'B1',
    nounSentence: 'Er erzählt begeistert ___ seiner Reise nach Japan.',
    clauseSentence: 'Er erzählt begeistert ___, wie schön seine Reise nach Japan war.' },
  { id: 'pp-abhaengen-von', collocationId: 'abhaengen-von', level: 'B2',
    nounSentence: 'Der Ausflug hängt ganz ___ gutem Wetter ab.',
    clauseSentence: 'Der Ausflug hängt ganz ___ ab, ob das Wetter gut wird.' },
  { id: 'pp-ueberzeugen-von', collocationId: 'ueberzeugen-von', level: 'B2',
    nounSentence: 'Er überzeugt mich ___ der Qualität des Produkts.',
    clauseSentence: 'Er überzeugt mich ___, dass das Produkt wirklich gut ist.' },
  { id: 'pp-ausgehen-von', collocationId: 'ausgehen-von', level: 'B2',
    nounSentence: 'Wir gehen ___ einer baldigen Einigung aus.',
    clauseSentence: 'Wir gehen ___ aus, dass wir uns bald einigen.' },
  // ─────────────────────────────── mit ───────────────────────────────
  { id: 'pp-rechnen-mit', collocationId: 'rechnen-mit', level: 'B2',
    nounSentence: 'Wir rechnen fest ___ einem Anstieg der Preise.',
    clauseSentence: 'Wir rechnen fest ___, dass die Preise bald steigen.' },
  { id: 'pp-sich-beschaeftigen-mit', collocationId: 'sich-beschaeftigen-mit', level: 'B1',
    nounSentence: 'Ich beschäftige mich ___ der Lösung des Problems.',
    clauseSentence: 'Ich beschäftige mich ___, wie man das Problem lösen kann.' },
  { id: 'pp-anfangen-mit', collocationId: 'anfangen-mit', level: 'B1',
    nounSentence: 'Wir fangen ___ dem Putzen des Zimmers an.',
    clauseSentence: 'Wir fangen ___ an, das ganze Zimmer zu putzen.' },
  // ─────────────────────────────── für ───────────────────────────────
  { id: 'pp-sich-interessieren-fuer', collocationId: 'sich-interessieren-fuer', level: 'B1',
    nounSentence: 'Sie interessiert sich ___ die Geschichte der Stadt.',
    clauseSentence: 'Sie interessiert sich ___, wie die Stadt einst entstanden ist.' },
  { id: 'pp-sorgen-fuer', collocationId: 'sorgen-fuer', level: 'B1',
    nounSentence: 'Ich sorge ___ die Sicherheit aller Gäste.',
    clauseSentence: 'Ich sorge ___, dass alle Gäste sicher sind.' },
  { id: 'pp-kaempfen-fuer', collocationId: 'kaempfen-fuer', level: 'B1',
    nounSentence: 'Sie kämpfen ___ die Gleichbehandlung aller Mitarbeiter.',
    clauseSentence: 'Sie kämpfen ___, dass alle Mitarbeiter gleich behandelt werden.' },
  { id: 'pp-sich-einsetzen-fuer', collocationId: 'sich-einsetzen-fuer', level: 'B2',
    nounSentence: 'Er setzt sich ___ den Erhalt des alten Parks ein.',
    clauseSentence: 'Er setzt sich ___ ein, dass der alte Park erhalten bleibt.' },
  { id: 'pp-sich-entscheiden-fuer', collocationId: 'sich-entscheiden-fuer', level: 'B1',
    nounSentence: 'Sie entscheidet sich ___ die Annahme des Angebots.',
    clauseSentence: 'Sie entscheidet sich ___, das Angebot doch noch zu akzeptieren.' },
  // ─────────────────────────────── vor ───────────────────────────────
  { id: 'pp-sich-fuerchten-vor', collocationId: 'sich-fuerchten-vor', level: 'B1',
    nounSentence: 'Er fürchtet sich ___ dem Besuch beim Zahnarzt.',
    clauseSentence: 'Er fürchtet sich ___, zum Zahnarzt gehen zu müssen.' },
  { id: 'pp-warnen-vor', collocationId: 'warnen-vor', level: 'B2',
    nounSentence: 'Der Wetterdienst warnt ___ dem aufziehenden Sturm.',
    clauseSentence: 'Der Wetterdienst warnt ___, dass ein Sturm aufzieht.' },
  // ─────────────────────────────── nach ───────────────────────────────
  { id: 'pp-sich-sehnen-nach', collocationId: 'sich-sehnen-nach', level: 'B2',
    nounSentence: 'Sie sehnt sich ___ etwas mehr Ruhe.',
    clauseSentence: 'Sie sehnt sich ___, endlich einmal zur Ruhe zu kommen.' },
  { id: 'pp-fragen-nach', collocationId: 'fragen-nach', level: 'B1',
    nounSentence: 'Er fragt einen Passanten ___ dem Weg zum Bahnhof.',
    clauseSentence: 'Er fragt einen Passanten ___, wie er zum Bahnhof kommt.' },
  // ─────────────────────────────── um ───────────────────────────────
  { id: 'pp-bitten-um', collocationId: 'bitten-um', level: 'B1',
    nounSentence: 'Ich bitte euch ___ etwas mehr Geduld.',
    clauseSentence: 'Ich bitte euch ___, dass ihr etwas geduldiger seid.' },
  { id: 'pp-sich-bemuehen-um', collocationId: 'sich-bemuehen-um', level: 'B2',
    nounSentence: 'Sie bemüht sich ___ eine faire Lösung.',
    clauseSentence: 'Sie bemüht sich ___, eine faire Lösung zu finden.' },
  // ─────────────────────────────── gegen ───────────────────────────────
  { id: 'pp-protestieren-gegen', collocationId: 'protestieren-gegen', level: 'B2',
    nounSentence: 'Die Bürger protestieren ___ den Bau der neuen Straße.',
    clauseSentence: 'Die Bürger protestieren ___, dass die neue Straße gebaut wird.' },
  { id: 'pp-sich-wehren-gegen', collocationId: 'sich-wehren-gegen', level: 'B2',
    nounSentence: 'Er wehrt sich ___ die ungerechte Behandlung.',
    clauseSentence: 'Er wehrt sich ___, dass man ihn ungerecht behandelt.' },
  // ─────────────────────────────── zu ───────────────────────────────
  { id: 'pp-sich-entschliessen-zu', collocationId: 'sich-entschliessen-zu', level: 'B2',
    nounSentence: 'Sie entschließt sich ___ einem völligen Neuanfang.',
    clauseSentence: 'Sie entschließt sich ___, noch einmal ganz neu zu beginnen.' },
  { id: 'pp-beitragen-zu', collocationId: 'beitragen-zu', level: 'B2',
    nounSentence: 'Alle tragen ___ einem schönen Fest bei.',
    clauseSentence: 'Alle tragen ___ bei, dass das Fest wirklich schön wird.' },
  { id: 'pp-fuehren-zu', collocationId: 'fuehren-zu', level: 'B2',
    nounSentence: 'Die vielen Fehler führen ___ einem großen Vertrauensverlust.',
    clauseSentence: 'Die vielen Fehler führen ___, dass viele das Vertrauen verlieren.' },
]
