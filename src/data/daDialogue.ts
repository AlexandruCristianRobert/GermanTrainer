// src/data/daDialogue.ts
//
// Authored dataset for the Da-compound DIALOGUE drill (THINGS only). Each item is
// a tiny question/answer pair about a thing or abstract, driven by one
// prepositional collocation:
//   • questionScaffold — leading gap filled with the wo-compound (Worauf …?).
//   • answerScaffold   — inner gap filled with the da-compound acting as a
//     KORRELAT that points forward to a dass-/zu-clause or natural continuation
//     (… darauf, dass …). See CONTEXT.md → "Da-compound" / "Korrelat".
//
// Objects are never persons here (da-/wo-compounds stand in for things only), so
// wrong content teaches wrong German — accuracy is a shipping gate. Both answers
// are DERIVED (never stored) via dialogueAnswers() from the joined collocation's
// preposition. Invariants in tests/data/daDialogue.test.ts enforce the join, the
// level, one gap per scaffold with the question gap first, that neither scaffold
// leaks its own derived answer, and the count floor.

import { COLLOCATIONS, type CollocationLevel } from './collocations'
import { daCompound, woCompound } from './daCompounds'

export interface DialogueItem {
  /** Unique id, `dl-<collocationId>`. */
  id: string
  /** Joins COLLOCATIONS by id; supplies preposition and level. */
  collocationId: string
  /** The question with a single LEADING gap (wo-compound goes there). */
  questionScaffold: string
  /** The reply with a single gap (da-compound Korrelat) + a following clause. */
  answerScaffold: string
  /** Copied from the joined collocation. */
  level: CollocationLevel
}

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * The two derived answers of the pair:
 *   wo → the capitalised wo-compound that opens the question (Worauf, Worüber …).
 *   da → the da-compound Korrelat in the reply (darauf, darüber …).
 */
export function dialogueAnswers(item: DialogueItem): { wo: string; da: string } {
  const collocation = byId.get(item.collocationId)
  if (!collocation) throw new Error(`Unknown collocationId: ${item.collocationId}`)
  return { wo: cap(woCompound(collocation.preposition)), da: daCompound(collocation.preposition) }
}

export const DA_DIALOGUE: DialogueItem[] = [
  // Q opens with the wo-compound; the reply's da-compound is a Korrelat pointing
  // forward to a dass-/ob-/w-/zu-clause. Objects are things/abstracts only.
  // ─── B1 ───
  { id: 'dl-warten-auf', collocationId: 'warten-auf', level: 'B1',
    questionScaffold: '___ wartest du denn schon so lange?',
    answerScaffold: 'Ich warte ___, dass endlich die Ferien beginnen.' },
  { id: 'dl-sich-freuen-auf', collocationId: 'sich-freuen-auf', level: 'B1',
    questionScaffold: '___ freust du dich am meisten?',
    answerScaffold: 'Ich freue mich ___, bald in den Urlaub zu fahren.' },
  { id: 'dl-hoffen-auf', collocationId: 'hoffen-auf', level: 'B1',
    questionScaffold: '___ hoffst du eigentlich?',
    answerScaffold: 'Ich hoffe ___, dass am Ende alles gut wird.' },
  { id: 'dl-achten-auf', collocationId: 'achten-auf', level: 'B1',
    questionScaffold: '___ sollen wir besonders achten?',
    answerScaffold: 'Wir achten ___, dass niemand zu kurz kommt.' },
  { id: 'dl-sich-konzentrieren-auf', collocationId: 'sich-konzentrieren-auf', level: 'B1',
    questionScaffold: '___ konzentrierst du dich gerade?',
    answerScaffold: 'Ich konzentriere mich ___, pünktlich fertig zu werden.' },
  { id: 'dl-sich-vorbereiten-auf', collocationId: 'sich-vorbereiten-auf', level: 'B1',
    questionScaffold: '___ bereitest du dich vor?',
    answerScaffold: 'Ich bereite mich ___ vor, die Prüfung zu bestehen.' },
  { id: 'dl-sich-verlassen-auf', collocationId: 'sich-verlassen-auf', level: 'B1',
    questionScaffold: '___ verlässt du dich?',
    answerScaffold: 'Ich verlasse mich ___, dass du mir hilfst.' },
  { id: 'dl-denken-an', collocationId: 'denken-an', level: 'B1',
    questionScaffold: '___ denkst du gerade?',
    answerScaffold: 'Ich denke ___, dass wir noch einkaufen müssen.' },
  { id: 'dl-sich-erinnern-an', collocationId: 'sich-erinnern-an', level: 'B1',
    questionScaffold: '___ erinnerst du dich noch?',
    answerScaffold: 'Ich erinnere mich ___, dass wir uns schon einmal getroffen haben.' },
  { id: 'dl-sich-gewoehnen-an', collocationId: 'sich-gewoehnen-an', level: 'B1',
    questionScaffold: '___ musst du dich erst gewöhnen?',
    answerScaffold: 'Ich gewöhne mich ___, jeden Tag früh aufzustehen.' },
  { id: 'dl-glauben-an', collocationId: 'glauben-an', level: 'B1',
    questionScaffold: '___ glaubst du fest?',
    answerScaffold: 'Ich glaube ___, dass sich alles zum Guten wendet.' },
  { id: 'dl-sich-aergern-ueber', collocationId: 'sich-aergern-ueber', level: 'B1',
    questionScaffold: '___ ärgerst du dich?',
    answerScaffold: 'Ich ärgere mich ___, dass ich zu spät gekommen bin.' },
  { id: 'dl-sich-freuen-ueber', collocationId: 'sich-freuen-ueber', level: 'B1',
    questionScaffold: '___ freust du dich so sehr?',
    answerScaffold: 'Ich freue mich ___, dass du gekommen bist.' },
  { id: 'dl-sprechen-ueber', collocationId: 'sprechen-ueber', level: 'B1',
    questionScaffold: '___ sprecht ihr gerade?',
    answerScaffold: 'Wir sprechen ___, wie es weitergehen soll.' },
  { id: 'dl-nachdenken-ueber', collocationId: 'nachdenken-ueber', level: 'B1',
    questionScaffold: '___ denkst du nach?',
    answerScaffold: 'Ich denke ___ nach, ob ich umziehen soll.' },
  { id: 'dl-sich-informieren-ueber', collocationId: 'sich-informieren-ueber', level: 'B1',
    questionScaffold: '___ informierst du dich?',
    answerScaffold: 'Ich informiere mich ___, wann der Kurs beginnt.' },
  { id: 'dl-sich-beschweren-ueber', collocationId: 'sich-beschweren-ueber', level: 'B1',
    questionScaffold: '___ beschwerst du dich?',
    answerScaffold: 'Ich beschwere mich ___, dass es viel zu laut ist.' },
  { id: 'dl-traeumen-von', collocationId: 'traeumen-von', level: 'B1',
    questionScaffold: '___ träumst du?',
    answerScaffold: 'Ich träume ___, einmal um die Welt zu reisen.' },
  { id: 'dl-erzaehlen-von', collocationId: 'erzaehlen-von', level: 'B1',
    questionScaffold: '___ erzählst du?',
    answerScaffold: 'Ich erzähle ___, wie schön der Urlaub war.' },
  { id: 'dl-sich-beschaeftigen-mit', collocationId: 'sich-beschaeftigen-mit', level: 'B1',
    questionScaffold: '___ beschäftigst du dich?',
    answerScaffold: 'Ich beschäftige mich ___, wie man das Problem löst.' },
  { id: 'dl-anfangen-mit', collocationId: 'anfangen-mit', level: 'B1',
    questionScaffold: '___ fängst du an?',
    answerScaffold: 'Ich fange ___ an, das Zimmer aufzuräumen.' },
  { id: 'dl-aufhoeren-mit', collocationId: 'aufhoeren-mit', level: 'B1',
    questionScaffold: '___ hörst du endlich auf?',
    answerScaffold: 'Ich höre ___ auf, ständig zu klagen.' },
  { id: 'dl-sich-interessieren-fuer', collocationId: 'sich-interessieren-fuer', level: 'B1',
    questionScaffold: '___ interessierst du dich?',
    answerScaffold: 'Ich interessiere mich ___, wie das genau funktioniert.' },
  { id: 'dl-sich-entscheiden-fuer', collocationId: 'sich-entscheiden-fuer', level: 'B1',
    questionScaffold: '___ hast du dich entschieden?',
    answerScaffold: 'Ich habe mich ___ entschieden, zu Hause zu bleiben.' },
  { id: 'dl-sorgen-fuer', collocationId: 'sorgen-fuer', level: 'B1',
    questionScaffold: '___ sorgst du?',
    answerScaffold: 'Ich sorge ___, dass alle genug zu essen haben.' },
  { id: 'dl-kaempfen-fuer', collocationId: 'kaempfen-fuer', level: 'B1',
    questionScaffold: '___ kämpft ihr?',
    answerScaffold: 'Wir kämpfen ___, dass sich endlich etwas ändert.' },
  { id: 'dl-sich-kuemmern-um', collocationId: 'sich-kuemmern-um', level: 'B1',
    questionScaffold: '___ kümmerst du dich?',
    answerScaffold: 'Ich kümmere mich ___, dass alles rechtzeitig fertig wird.' },
  { id: 'dl-bitten-um', collocationId: 'bitten-um', level: 'B1',
    questionScaffold: '___ bittest du?',
    answerScaffold: 'Ich bitte ___, dass ihr etwas leiser seid.' },
  { id: 'dl-fragen-nach', collocationId: 'fragen-nach', level: 'B1',
    questionScaffold: '___ fragst du?',
    answerScaffold: 'Ich frage ___, wann der nächste Zug kommt.' },
  { id: 'dl-sich-fuerchten-vor', collocationId: 'sich-fuerchten-vor', level: 'B1',
    questionScaffold: '___ fürchtest du dich?',
    answerScaffold: 'Ich fürchte mich ___, allein im Dunkeln zu sein.' },
  // ─── B2 ───
  { id: 'dl-verzichten-auf', collocationId: 'verzichten-auf', level: 'B2',
    questionScaffold: '___ verzichtest du freiwillig?',
    answerScaffold: 'Ich verzichte ___, im Urlaub ständig zu arbeiten.' },
  { id: 'dl-bestehen-auf', collocationId: 'bestehen-auf', level: 'B2',
    questionScaffold: '___ besteht der Chef?',
    answerScaffold: 'Er besteht ___, dass wir immer pünktlich sind.' },
  { id: 'dl-zweifeln-an', collocationId: 'zweifeln-an', level: 'B2',
    questionScaffold: '___ zweifelst du?',
    answerScaffold: 'Ich zweifle ___, dass der Plan wirklich funktioniert.' },
  { id: 'dl-sich-wundern-ueber', collocationId: 'sich-wundern-ueber', level: 'B2',
    questionScaffold: '___ wunderst du dich?',
    answerScaffold: 'Ich wundere mich ___, dass niemand Bescheid wusste.' },
  { id: 'dl-abhaengen-von', collocationId: 'abhaengen-von', level: 'B2',
    questionScaffold: '___ hängt das alles ab?',
    answerScaffold: 'Es hängt ___ ab, ob es morgen regnet.' },
  { id: 'dl-ueberzeugen-von', collocationId: 'ueberzeugen-von', level: 'B2',
    questionScaffold: '___ hat er dich überzeugt?',
    answerScaffold: 'Er hat mich ___ überzeugt, dass es die richtige Wahl ist.' },
  { id: 'dl-rechnen-mit', collocationId: 'rechnen-mit', level: 'B2',
    questionScaffold: '___ rechnest du?',
    answerScaffold: 'Ich rechne ___, dass alles teurer wird.' },
  { id: 'dl-sich-einsetzen-fuer', collocationId: 'sich-einsetzen-fuer', level: 'B2',
    questionScaffold: '___ setzt du dich ein?',
    answerScaffold: 'Ich setze mich ___ ein, dass alle fair behandelt werden.' },
  { id: 'dl-kaempfen-um', collocationId: 'kaempfen-um', level: 'B2',
    questionScaffold: '___ kämpft das Team?',
    answerScaffold: 'Das Team kämpft ___, endlich den Titel zu gewinnen.' },
  { id: 'dl-sich-sehnen-nach', collocationId: 'sich-sehnen-nach', level: 'B2',
    questionScaffold: '___ sehnst du dich?',
    answerScaffold: 'Ich sehne mich ___, endlich einmal auszuschlafen.' },
  { id: 'dl-warnen-vor', collocationId: 'warnen-vor', level: 'B2',
    questionScaffold: '___ warnt die Polizei?',
    answerScaffold: 'Die Polizei warnt ___, bei Glatteis zu schnell zu fahren.' },
  { id: 'dl-fuehren-zu', collocationId: 'fuehren-zu', level: 'B2',
    questionScaffold: '___ führt das am Ende?',
    answerScaffold: 'Das führt ___, dass am Ende alle unzufrieden sind.' },
  { id: 'dl-beitragen-zu', collocationId: 'beitragen-zu', level: 'B2',
    questionScaffold: '___ trägt das bei?',
    answerScaffold: 'Es trägt ___ bei, dass sich das Klima verbessert.' },
  { id: 'dl-sich-entschliessen-zu', collocationId: 'sich-entschliessen-zu', level: 'B2',
    questionScaffold: '___ hast du dich entschlossen?',
    answerScaffold: 'Ich habe mich ___ entschlossen, das Studium zu wechseln.' },
  { id: 'dl-auffordern-zu', collocationId: 'auffordern-zu', level: 'B2',
    questionScaffold: '___ fordert der Chef auf?',
    answerScaffold: 'Er fordert uns ___ auf, deutlich pünktlicher zu sein.' },
  { id: 'dl-protestieren-gegen', collocationId: 'protestieren-gegen', level: 'B2',
    questionScaffold: '___ protestieren die Leute?',
    answerScaffold: 'Sie protestieren ___, dass die Mieten immer weiter steigen.' },
  { id: 'dl-sich-wehren-gegen', collocationId: 'sich-wehren-gegen', level: 'B2',
    questionScaffold: '___ wehrt er sich?',
    answerScaffold: 'Er wehrt sich ___, dass man ihm die Schuld gibt.' },
  // ─── C1 ───
  { id: 'dl-streben-nach', collocationId: 'streben-nach', level: 'C1',
    questionScaffold: '___ strebt er im Leben?',
    answerScaffold: 'Er strebt ___, immer der Beste zu sein.' },
]
