// src/data/daWoQuestion.ts
//
// Authored dataset for the Da-compound WO-QUESTION drill ("people vs things").
// Each item pairs a natural `statement` (which USES a prepositional collocation
// with an object) with a `scaffold` — the matching question whose leading gap the
// learner fills with the interrogative:
//   • THING object  → a wo-compound (Wovor, Worauf, Worüber, …).
//   • PERSON object → preposition + wen/wem (Vor wem, Auf wen, …), NEVER a
//     wo-compound (see CONTEXT.md → "Da-compound"). A person asked about with a
//     wo-compound is wrong German, so accuracy here is a shipping gate.
//
// The preposition belongs to the ANSWER, so the scaffold NEVER contains it; the
// gap is always first. The answer is DERIVED (never stored) via woQuestionAnswer()
// from the joined collocation's preposition and case. Invariants in
// tests/data/daWoQuestion.test.ts enforce the join, level, leading single gap,
// preposition-not-in-scaffold, kind floors and the derivation.

import { COLLOCATIONS, type CollocationLevel } from './collocations'
import { woCompound } from './daCompounds'

/** The person interrogative for each governed case (accusative → wen, dative → wem). */
export const PERSON_QUESTION = { accusative: 'wen', dative: 'wem' } as const

export interface WoQuestionItem {
  /** Unique id, `wq-<collocationId>`. */
  id: string
  /** Joins COLLOCATIONS by id; supplies preposition, case and level. */
  collocationId: string
  /** Natural statement USING the collocation with a thing or person object. */
  statement: string
  /** THING → wo-compound answer; PERSON → prep + wen/wem answer. */
  objectKind: 'thing' | 'person'
  /** The matching question with a single LEADING gap and NO preposition. */
  scaffold: string
  /** Copied from the joined collocation. */
  level: CollocationLevel
}

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * The interrogative that fills the leading gap:
 *   thing  → the capitalised wo-compound of the preposition (Worauf, Wovor …).
 *   person → the capitalised preposition + wen/wem for the governed case (Auf wen, Mit wem …).
 */
export function woQuestionAnswer(item: WoQuestionItem): string {
  const collocation = byId.get(item.collocationId)
  if (!collocation) throw new Error(`Unknown collocationId: ${item.collocationId}`)
  if (item.objectKind === 'thing') return cap(woCompound(collocation.preposition))
  return `${cap(collocation.preposition)} ${PERSON_QUESTION[collocation.case]}`
}

export const DA_WO_QUESTION: WoQuestionItem[] = [
  // ═══════════════════════════ THINGS → wo-compound ═══════════════════════════
  // ─── B1 ───
  { id: 'wq-warten-auf', collocationId: 'warten-auf', level: 'B1', objectKind: 'thing',
    statement: 'Ich warte auf den Bus.', scaffold: '___ wartest du?' },
  { id: 'wq-sich-freuen-auf', collocationId: 'sich-freuen-auf', level: 'B1', objectKind: 'thing',
    statement: 'Wir freuen uns auf das Wochenende.', scaffold: '___ freust du dich?' },
  { id: 'wq-hoffen-auf', collocationId: 'hoffen-auf', level: 'B1', objectKind: 'thing',
    statement: 'Alle hoffen auf besseres Wetter.', scaffold: '___ hoffst du?' },
  { id: 'wq-achten-auf', collocationId: 'achten-auf', level: 'B1', objectKind: 'thing',
    statement: 'Man muss auf die Verkehrsschilder achten.', scaffold: '___ musst du achten?' },
  { id: 'wq-sich-konzentrieren-auf', collocationId: 'sich-konzentrieren-auf', level: 'B1', objectKind: 'thing',
    statement: 'Sie konzentriert sich auf die Prüfung.', scaffold: '___ konzentrierst du dich?' },
  { id: 'wq-denken-an', collocationId: 'denken-an', level: 'B1', objectKind: 'thing',
    statement: 'Ich denke an die Prüfung.', scaffold: '___ denkst du?' },
  { id: 'wq-sich-erinnern-an', collocationId: 'sich-erinnern-an', level: 'B1', objectKind: 'thing',
    statement: 'Sie erinnert sich an den Urlaub.', scaffold: '___ erinnerst du dich?' },
  { id: 'wq-glauben-an', collocationId: 'glauben-an', level: 'B1', objectKind: 'thing',
    statement: 'Er glaubt an das Schicksal.', scaffold: '___ glaubst du?' },
  { id: 'wq-sich-aergern-ueber', collocationId: 'sich-aergern-ueber', level: 'B1', objectKind: 'thing',
    statement: 'Sie ärgert sich über den Stau.', scaffold: '___ ärgerst du dich?' },
  { id: 'wq-sprechen-ueber', collocationId: 'sprechen-ueber', level: 'B1', objectKind: 'thing',
    statement: 'Wir sprechen über die Zukunft.', scaffold: '___ sprecht ihr?' },
  { id: 'wq-nachdenken-ueber', collocationId: 'nachdenken-ueber', level: 'B1', objectKind: 'thing',
    statement: 'Ich denke über einen Umzug nach.', scaffold: '___ denkst du nach?' },
  { id: 'wq-sich-informieren-ueber', collocationId: 'sich-informieren-ueber', level: 'B1', objectKind: 'thing',
    statement: 'Ich informiere mich über die Reise.', scaffold: '___ informierst du dich?' },
  { id: 'wq-sich-beschweren-ueber', collocationId: 'sich-beschweren-ueber', level: 'B1', objectKind: 'thing',
    statement: 'Er beschwert sich über den Lärm.', scaffold: '___ beschwerst du dich?' },
  { id: 'wq-traeumen-von', collocationId: 'traeumen-von', level: 'B1', objectKind: 'thing',
    statement: 'Er träumt von einer Reise.', scaffold: '___ träumst du?' },
  { id: 'wq-erzaehlen-von', collocationId: 'erzaehlen-von', level: 'B1', objectKind: 'thing',
    statement: 'Sie erzählt von ihrem Urlaub.', scaffold: '___ erzählst du?' },
  { id: 'wq-sich-interessieren-fuer', collocationId: 'sich-interessieren-fuer', level: 'B1', objectKind: 'thing',
    statement: 'Sie interessiert sich für Kunst.', scaffold: '___ interessierst du dich?' },
  { id: 'wq-sich-entscheiden-fuer', collocationId: 'sich-entscheiden-fuer', level: 'B1', objectKind: 'thing',
    statement: 'Ich entscheide mich für das blaue Kleid.', scaffold: '___ entscheidest du dich?' },
  { id: 'wq-sich-kuemmern-um', collocationId: 'sich-kuemmern-um', level: 'B1', objectKind: 'thing',
    statement: 'Sie kümmert sich um den Garten.', scaffold: '___ kümmerst du dich?' },
  { id: 'wq-bitten-um', collocationId: 'bitten-um', level: 'B1', objectKind: 'thing',
    statement: 'Er bittet um eine kurze Pause.', scaffold: '___ bittest du?' },
  { id: 'wq-fragen-nach', collocationId: 'fragen-nach', level: 'B1', objectKind: 'thing',
    statement: 'Der Tourist fragt nach dem Weg.', scaffold: '___ fragst du?' },
  { id: 'wq-suchen-nach', collocationId: 'suchen-nach', level: 'B1', objectKind: 'thing',
    statement: 'Sie sucht nach dem Schlüssel.', scaffold: '___ suchst du?' },
  { id: 'wq-sich-fuerchten-vor', collocationId: 'sich-fuerchten-vor', level: 'B1', objectKind: 'thing',
    statement: 'Das Kind fürchtet sich vor dem Gewitter.', scaffold: '___ fürchtest du dich?' },
  { id: 'wq-sich-beschaeftigen-mit', collocationId: 'sich-beschaeftigen-mit', level: 'B1', objectKind: 'thing',
    statement: 'Er beschäftigt sich mit alter Musik.', scaffold: '___ beschäftigst du dich?' },
  { id: 'wq-anfangen-mit', collocationId: 'anfangen-mit', level: 'B1', objectKind: 'thing',
    statement: 'Wir fangen mit der Übung an.', scaffold: '___ fängst du an?' },
  // ─── B2 ───
  { id: 'wq-fuehren-zu', collocationId: 'fuehren-zu', level: 'B2', objectKind: 'thing',
    statement: 'Der Fehler führt zu großen Problemen.', scaffold: '___ führt der Fehler?' },
  { id: 'wq-beitragen-zu', collocationId: 'beitragen-zu', level: 'B2', objectKind: 'thing',
    statement: 'Jeder trägt zum Erfolg bei.', scaffold: '___ trägt jeder bei?' },
  { id: 'wq-abhaengen-von', collocationId: 'abhaengen-von', level: 'B2', objectKind: 'thing',
    statement: 'Alles hängt von deiner Entscheidung ab.', scaffold: '___ hängt alles ab?' },
  { id: 'wq-rechnen-mit', collocationId: 'rechnen-mit', level: 'B2', objectKind: 'thing',
    statement: 'Wir rechnen mit Regen.', scaffold: '___ rechnest du?' },
  { id: 'wq-warnen-vor', collocationId: 'warnen-vor', level: 'B2', objectKind: 'thing',
    statement: 'Die Polizei warnt vor dem Glatteis.', scaffold: '___ warnt die Polizei?' },
  { id: 'wq-protestieren-gegen', collocationId: 'protestieren-gegen', level: 'B2', objectKind: 'thing',
    statement: 'Die Bürger protestieren gegen das Gesetz.', scaffold: '___ protestieren die Bürger?' },
  { id: 'wq-sich-wehren-gegen', collocationId: 'sich-wehren-gegen', level: 'B2', objectKind: 'thing',
    statement: 'Sie wehrt sich gegen die Vorwürfe.', scaffold: '___ wehrt sie sich?' },
  { id: 'wq-bestehen-aus', collocationId: 'bestehen-aus', level: 'B2', objectKind: 'thing',
    statement: 'Die Prüfung besteht aus drei Teilen.', scaffold: '___ besteht die Prüfung?' },
  { id: 'wq-verzichten-auf', collocationId: 'verzichten-auf', level: 'B2', objectKind: 'thing',
    statement: 'Ich verzichte auf den Nachtisch.', scaffold: '___ verzichtest du?' },
  // ─── C1 ───
  { id: 'wq-sich-beschraenken-auf', collocationId: 'sich-beschraenken-auf', level: 'C1', objectKind: 'thing',
    statement: 'Wir beschränken uns auf das Wesentliche.', scaffold: '___ beschränkt ihr euch?' },

  // ═══════════════════════ PERSONS → preposition + wen/wem ═══════════════════════
  // ─── B1 ───
  { id: 'wq-sich-verlassen-auf', collocationId: 'sich-verlassen-auf', level: 'B1', objectKind: 'person',
    statement: 'Ich verlasse mich auf meinen Bruder.', scaffold: '___ verlässt du dich?' },
  { id: 'wq-stolz-auf', collocationId: 'stolz-auf', level: 'B1', objectKind: 'person',
    statement: 'Die Eltern sind stolz auf ihre Tochter.', scaffold: '___ sind die Eltern stolz?' },
  { id: 'wq-boese-auf', collocationId: 'boese-auf', level: 'B1', objectKind: 'person',
    statement: 'Sie ist böse auf ihren Bruder.', scaffold: '___ bist du böse?' },
  { id: 'wq-schreiben-an', collocationId: 'schreiben-an', level: 'B1', objectKind: 'person',
    statement: 'Sie schreibt einen Brief an ihre Oma.', scaffold: '___ schreibst du?' },
  { id: 'wq-lachen-ueber', collocationId: 'lachen-ueber', level: 'B1', objectKind: 'person',
    statement: 'Alle lachen über den Clown.', scaffold: '___ lacht ihr?' },
  { id: 'wq-sich-verlieben-in', collocationId: 'sich-verlieben-in', level: 'B1', objectKind: 'person',
    statement: 'Er hat sich in die neue Kollegin verliebt.', scaffold: '___ hat er sich verliebt?' },
  { id: 'wq-sich-treffen-mit', collocationId: 'sich-treffen-mit', level: 'B1', objectKind: 'person',
    statement: 'Ich treffe mich mit meiner Freundin.', scaffold: '___ triffst du dich?' },
  { id: 'wq-telefonieren-mit', collocationId: 'telefonieren-mit', level: 'B1', objectKind: 'person',
    statement: 'Er telefoniert mit seiner Mutter.', scaffold: '___ telefonierst du?' },
  { id: 'wq-sich-verstehen-mit', collocationId: 'sich-verstehen-mit', level: 'B1', objectKind: 'person',
    statement: 'Ich verstehe mich gut mit meinen Kollegen.', scaffold: '___ verstehst du dich gut?' },
  { id: 'wq-sich-verabschieden-von', collocationId: 'sich-verabschieden-von', level: 'B1', objectKind: 'person',
    statement: 'Wir verabschieden uns von den Gästen.', scaffold: '___ verabschiedest du dich?' },
  { id: 'wq-halten-von', collocationId: 'halten-von', level: 'B1', objectKind: 'person',
    statement: 'Ich halte viel von dem neuen Trainer.', scaffold: '___ hältst du viel?' },
  { id: 'wq-sich-bedanken-bei', collocationId: 'sich-bedanken-bei', level: 'B1', objectKind: 'person',
    statement: 'Ich bedanke mich bei meiner Lehrerin.', scaffold: '___ bedankst du dich?' },
  { id: 'wq-sich-entschuldigen-bei', collocationId: 'sich-entschuldigen-bei', level: 'B1', objectKind: 'person',
    statement: 'Du entschuldigst dich bei deinem Freund.', scaffold: '___ entschuldigst du dich?' },
  { id: 'wq-passen-zu', collocationId: 'passen-zu', level: 'B1', objectKind: 'person',
    statement: 'Du passt gut zu deinem Freund.', scaffold: '___ passt du gut?' },
  { id: 'wq-nett-zu', collocationId: 'nett-zu', level: 'B1', objectKind: 'person',
    statement: 'Sei nett zu deiner Schwester.', scaffold: '___ sollst du nett sein?' },
  { id: 'wq-sich-verstecken-vor', collocationId: 'sich-verstecken-vor', level: 'B1', objectKind: 'person',
    statement: 'Das Kind versteckt sich vor seinem Bruder.', scaffold: '___ versteckt sich das Kind?' },
  // ─── B2 ───
  { id: 'wq-zaehlen-auf', collocationId: 'zaehlen-auf', level: 'B2', objectKind: 'person',
    statement: 'Ich zähle auf meinen besten Freund.', scaffold: '___ zählst du?' },
  { id: 'wq-sich-wenden-an', collocationId: 'sich-wenden-an', level: 'B2', objectKind: 'person',
    statement: 'Bitte wenden Sie sich an den Berater.', scaffold: '___ wendest du dich?' },
  { id: 'wq-sich-wundern-ueber', collocationId: 'sich-wundern-ueber', level: 'B2', objectKind: 'person',
    statement: 'Alle wundern sich über den neuen Kollegen.', scaffold: '___ wunderst du dich?' },
  { id: 'wq-sich-lustig-machen-ueber', collocationId: 'sich-lustig-machen-ueber', level: 'B2', objectKind: 'person',
    statement: 'Sie machen sich über den Lehrer lustig.', scaffold: '___ macht ihr euch lustig?' },
  { id: 'wq-schwaermen-fuer', collocationId: 'schwaermen-fuer', level: 'B2', objectKind: 'person',
    statement: 'Das Mädchen schwärmt für den Sänger.', scaffold: '___ schwärmst du?' },
  { id: 'wq-sich-einsetzen-fuer', collocationId: 'sich-einsetzen-fuer', level: 'B2', objectKind: 'person',
    statement: 'Die Anwältin setzt sich für ihre Mandanten ein.', scaffold: '___ setzt du dich ein?' },
  { id: 'wq-sich-sorgen-um', collocationId: 'sich-sorgen-um', level: 'B2', objectKind: 'person',
    statement: 'Die Mutter sorgt sich um ihren Sohn.', scaffold: '___ sorgst du dich?' },
  { id: 'wq-trauern-um', collocationId: 'trauern-um', level: 'B2', objectKind: 'person',
    statement: 'Das Dorf trauert um den Bürgermeister.', scaffold: '___ trauert das Dorf?' },
]
