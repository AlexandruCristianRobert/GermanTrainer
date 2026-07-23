// src/data/daTransform.ts
//
// Authored dataset for the Da-compound TRANSFORM drill ("people vs things").
// Each item is a natural sentence that USES a prepositional collocation with an
// explicit object phrase (`object`, which INCLUDES the governed preposition,
// e.g. 'auf den Bus', 'an Karl'). The learner rewrites the object as a pronoun:
//   • THING object  → a da-compound (darauf, daran, …).
//   • PERSON object → preposition + declined personal pronoun (auf ihn, an ihn …),
//     NEVER a da-compound (see CONTEXT.md → "Da-compound"). Teaching a person as
//     a da-compound is wrong German, so accuracy here is a shipping gate.
//
// The answer is DERIVED (never stored) via transformAnswer(). Items JOIN the
// curated collocation seed by `collocationId`; the preposition and case come from
// that join. Invariants in tests/data/daTransform.test.ts enforce the join, the
// level, that `object` appears verbatim exactly once, the kind floors, and — the
// SHIPPING-GATE rule — that the cue 'es' NEVER pairs with an accusative
// collocation (*auf es is not German; a neuter person → es only on datives).

import { COLLOCATIONS, type CollocationLevel } from './collocations'
import { daCompound } from './daCompounds'
import { PRONOUN_FORMS, type PronounCue } from './daPersonCase'

export interface TransformItem {
  /** Unique id, `tr-<collocationId>`. */
  id: string
  /** Joins COLLOCATIONS by id; supplies preposition, case and level. */
  collocationId: string
  /** Natural sentence that contains `object` verbatim exactly once. */
  sentence: string
  /** The replaceable prepositional phrase, INCLUDING the preposition (e.g. 'an Karl'). */
  object: string
  /** THING → da-compound answer; PERSON → prep + pronoun answer. */
  objectKind: 'thing' | 'person'
  /** Person items only: the person in the object, selecting the pronoun form. */
  personCue?: PronounCue
  /** Copied from the joined collocation. */
  level: CollocationLevel
}

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

/**
 * The correct rewrite of the object:
 *   thing  → the da-compound of the collocation's preposition (darauf, daran …).
 *   person → the collocation's preposition + the cue pronoun in the governed case.
 */
export function transformAnswer(item: TransformItem): string {
  const collocation = byId.get(item.collocationId)
  if (!collocation) throw new Error(`Unknown collocationId: ${item.collocationId}`)
  if (item.objectKind === 'thing') return daCompound(collocation.preposition)
  return `${collocation.preposition} ${PRONOUN_FORMS[item.personCue!][collocation.case]}`
}

export const DA_TRANSFORM: TransformItem[] = [
  // ═══════════════════════════ THINGS → da-compound ═══════════════════════════
  // ─── B1 ───
  { id: 'tr-denken-an', collocationId: 'denken-an', level: 'B1', objectKind: 'thing',
    sentence: 'Ich denke oft an meine Kindheit.', object: 'an meine Kindheit' },
  { id: 'tr-sich-erinnern-an', collocationId: 'sich-erinnern-an', level: 'B1', objectKind: 'thing',
    sentence: 'Erinnerst du dich noch an den letzten Sommer?', object: 'an den letzten Sommer' },
  { id: 'tr-sich-gewoehnen-an', collocationId: 'sich-gewoehnen-an', level: 'B1', objectKind: 'thing',
    sentence: 'Man gewöhnt sich nur langsam an das kalte Klima.', object: 'an das kalte Klima' },
  { id: 'tr-warten-auf', collocationId: 'warten-auf', level: 'B1', objectKind: 'thing',
    sentence: 'Wir warten schon eine Stunde auf den Bus.', object: 'auf den Bus' },
  { id: 'tr-sich-freuen-auf', collocationId: 'sich-freuen-auf', level: 'B1', objectKind: 'thing',
    sentence: 'Die Kinder freuen sich sehr auf die Sommerferien.', object: 'auf die Sommerferien' },
  { id: 'tr-hoffen-auf', collocationId: 'hoffen-auf', level: 'B1', objectKind: 'thing',
    sentence: 'Die Bauern hoffen dringend auf besseres Wetter.', object: 'auf besseres Wetter' },
  { id: 'tr-sich-aergern-ueber', collocationId: 'sich-aergern-ueber', level: 'B1', objectKind: 'thing',
    sentence: 'Sie ärgert sich jeden Morgen über den Stau.', object: 'über den Stau' },
  { id: 'tr-sprechen-ueber', collocationId: 'sprechen-ueber', level: 'B1', objectKind: 'thing',
    sentence: 'Wir sprechen heute über die Politik.', object: 'über die Politik' },
  { id: 'tr-lachen-ueber', collocationId: 'lachen-ueber', level: 'B1', objectKind: 'thing',
    sentence: 'Alle lachen herzlich über den Witz.', object: 'über den Witz' },
  { id: 'tr-nachdenken-ueber', collocationId: 'nachdenken-ueber', level: 'B1', objectKind: 'thing',
    sentence: 'Ich denke schon lange über einen Umzug nach.', object: 'über einen Umzug' },
  { id: 'tr-traeumen-von', collocationId: 'traeumen-von', level: 'B1', objectKind: 'thing',
    sentence: 'Er träumt seit Jahren von einer Weltreise.', object: 'von einer Weltreise' },
  { id: 'tr-sich-interessieren-fuer', collocationId: 'sich-interessieren-fuer', level: 'B1', objectKind: 'thing',
    sentence: 'Meine Schwester interessiert sich sehr für Kunst.', object: 'für Kunst' },
  { id: 'tr-sich-entscheiden-fuer', collocationId: 'sich-entscheiden-fuer', level: 'B1', objectKind: 'thing',
    sentence: 'Am Ende entscheidet sie sich für das blaue Kleid.', object: 'für das blaue Kleid' },
  { id: 'tr-sorgen-fuer', collocationId: 'sorgen-fuer', level: 'B1', objectKind: 'thing',
    sentence: 'Die leise Musik sorgt für eine schöne Stimmung.', object: 'für eine schöne Stimmung' },
  { id: 'tr-sich-kuemmern-um', collocationId: 'sich-kuemmern-um', level: 'B1', objectKind: 'thing',
    sentence: 'Am Wochenende kümmert er sich um den Garten.', object: 'um den Garten' },
  { id: 'tr-bitten-um', collocationId: 'bitten-um', level: 'B1', objectKind: 'thing',
    sentence: 'Der Gast bittet höflich um ein Glas Wasser.', object: 'um ein Glas Wasser' },
  { id: 'tr-fragen-nach', collocationId: 'fragen-nach', level: 'B1', objectKind: 'thing',
    sentence: 'Der Tourist fragt einen Passanten nach dem Weg.', object: 'nach dem Weg' },
  { id: 'tr-suchen-nach', collocationId: 'suchen-nach', level: 'B1', objectKind: 'thing',
    sentence: 'Sie sucht schon den ganzen Morgen nach dem Schlüssel.', object: 'nach dem Schlüssel' },
  { id: 'tr-sich-fuerchten-vor', collocationId: 'sich-fuerchten-vor', level: 'B1', objectKind: 'thing',
    sentence: 'Viele Kinder fürchten sich vor der Dunkelheit.', object: 'vor der Dunkelheit' },
  { id: 'tr-anfangen-mit', collocationId: 'anfangen-mit', level: 'B1', objectKind: 'thing',
    sentence: 'Nach der Pause fangen wir mit der Übung an.', object: 'mit der Übung' },
  { id: 'tr-sich-beschaeftigen-mit', collocationId: 'sich-beschaeftigen-mit', level: 'B1', objectKind: 'thing',
    sentence: 'In seiner Freizeit beschäftigt er sich mit alter Musik.', object: 'mit alter Musik' },
  { id: 'tr-gehoeren-zu', collocationId: 'gehoeren-zu', level: 'B1', objectKind: 'thing',
    sentence: 'Der große Balkon gehört auch zur Wohnung.', object: 'zur Wohnung' },
  { id: 'tr-helfen-bei', collocationId: 'helfen-bei', level: 'B1', objectKind: 'thing',
    sentence: 'Kannst du mir bei der Reparatur helfen?', object: 'bei der Reparatur' },
  // ─── B2 ───
  { id: 'tr-protestieren-gegen', collocationId: 'protestieren-gegen', level: 'B2', objectKind: 'thing',
    sentence: 'Tausende protestieren gegen das neue Gesetz.', object: 'gegen das neue Gesetz' },
  { id: 'tr-bestehen-aus', collocationId: 'bestehen-aus', level: 'B2', objectKind: 'thing',
    sentence: 'Unser Team besteht aus fünf Personen.', object: 'aus fünf Personen' },
  { id: 'tr-abhaengen-von', collocationId: 'abhaengen-von', level: 'B2', objectKind: 'thing',
    sentence: 'Der Ausflug hängt ganz vom Wetter ab.', object: 'vom Wetter' },
  { id: 'tr-rechnen-mit', collocationId: 'rechnen-mit', level: 'B2', objectKind: 'thing',
    sentence: 'Wir rechnen fest mit einem guten Ergebnis.', object: 'mit einem guten Ergebnis' },
  { id: 'tr-warnen-vor', collocationId: 'warnen-vor', level: 'B2', objectKind: 'thing',
    sentence: 'Der Wetterdienst warnt vor dem Sturm.', object: 'vor dem Sturm' },
  { id: 'tr-investieren-in', collocationId: 'investieren-in', level: 'B2', objectKind: 'thing',
    sentence: 'Die Firma investiert viel Geld in moderne Technik.', object: 'in moderne Technik' },
  { id: 'tr-fuehren-zu', collocationId: 'fuehren-zu', level: 'B2', objectKind: 'thing',
    sentence: 'Ein kleiner Fehler führt manchmal zu großen Problemen.', object: 'zu großen Problemen' },
  // ─── C1 ───
  { id: 'tr-sich-beschraenken-auf', collocationId: 'sich-beschraenken-auf', level: 'C1', objectKind: 'thing',
    sentence: 'In der Prüfung beschränken wir uns auf das Wesentliche.', object: 'auf das Wesentliche' },
  { id: 'tr-streben-nach', collocationId: 'streben-nach', level: 'C1', objectKind: 'thing',
    sentence: 'Der junge Politiker strebt offen nach Macht.', object: 'nach Macht' },
  { id: 'tr-verfuegen-ueber', collocationId: 'verfuegen-ueber', level: 'C1', objectKind: 'thing',
    sentence: 'Das Unternehmen verfügt über viel Kapital.', object: 'über viel Kapital' },

  // ═══════════════════════ PERSONS → preposition + pronoun ═══════════════════════
  // Objects are lexical person phrases, so the cue is always 3rd person (er/sie/es/
  // sie (Plural)); 'es' (neuter person: das Baby/das Kind) only on DATIVE collocations.
  // ─── B1 ───
  { id: 'tr-glauben-an', collocationId: 'glauben-an', level: 'B1', objectKind: 'person', personCue: 'er',
    sentence: 'Sie glaubt fest an ihren kleinen Sohn.', object: 'an ihren kleinen Sohn' },
  { id: 'tr-schreiben-an', collocationId: 'schreiben-an', level: 'B1', objectKind: 'person', personCue: 'sie',
    sentence: 'Meine Oma schreibt einen langen Brief an ihre Freundin.', object: 'an ihre Freundin' },
  { id: 'tr-stolz-auf', collocationId: 'stolz-auf', level: 'B1', objectKind: 'person', personCue: 'sie',
    sentence: 'Die Eltern sind unglaublich stolz auf ihre Tochter.', object: 'auf ihre Tochter' },
  { id: 'tr-boese-auf', collocationId: 'boese-auf', level: 'B1', objectKind: 'person', personCue: 'er',
    sentence: 'Bist du immer noch böse auf deinen Bruder?', object: 'auf deinen Bruder' },
  { id: 'tr-aufpassen-auf', collocationId: 'aufpassen-auf', level: 'B1', objectKind: 'person', personCue: 'sie (Plural)',
    sentence: 'Kannst du heute Abend auf die Kinder aufpassen?', object: 'auf die Kinder' },
  { id: 'tr-sich-beschweren-ueber', collocationId: 'sich-beschweren-ueber', level: 'B1', objectKind: 'person', personCue: 'er',
    sentence: 'Sie beschwert sich ständig über ihren Nachbarn.', object: 'über ihren Nachbarn' },
  { id: 'tr-sich-verlieben-in', collocationId: 'sich-verlieben-in', level: 'B1', objectKind: 'person', personCue: 'sie',
    sentence: 'Er hat sich sofort in die neue Kollegin verliebt.', object: 'in die neue Kollegin' },
  { id: 'tr-sich-treffen-mit', collocationId: 'sich-treffen-mit', level: 'B1', objectKind: 'person', personCue: 'sie',
    sentence: 'Morgen treffe ich mich mit meiner besten Freundin.', object: 'mit meiner besten Freundin' },
  { id: 'tr-telefonieren-mit', collocationId: 'telefonieren-mit', level: 'B1', objectKind: 'person', personCue: 'sie',
    sentence: 'Jeden Abend telefoniert er lange mit seiner Mutter.', object: 'mit seiner Mutter' },
  { id: 'tr-sich-streiten-mit', collocationId: 'sich-streiten-mit', level: 'B1', objectKind: 'person', personCue: 'er',
    sentence: 'Ständig streitet sie sich mit ihrem großen Bruder.', object: 'mit ihrem großen Bruder' },
  { id: 'tr-spielen-mit', collocationId: 'spielen-mit', level: 'B1', objectKind: 'person', personCue: 'es',
    sentence: 'Unsere Tochter spielt am liebsten mit dem Nachbarskind.', object: 'mit dem Nachbarskind' },
  { id: 'tr-sich-verstehen-mit', collocationId: 'sich-verstehen-mit', level: 'B1', objectKind: 'person', personCue: 'sie (Plural)',
    sentence: 'Ich verstehe mich sehr gut mit meinen neuen Kollegen.', object: 'mit meinen neuen Kollegen' },
  { id: 'tr-verheiratet-mit', collocationId: 'verheiratet-mit', level: 'B1', objectKind: 'person', personCue: 'er',
    sentence: 'Sie ist seit zwanzig Jahren mit einem Arzt verheiratet.', object: 'mit einem Arzt' },
  { id: 'tr-sich-verabschieden-von', collocationId: 'sich-verabschieden-von', level: 'B1', objectKind: 'person', personCue: 'sie (Plural)',
    sentence: 'Am Bahnhof verabschieden wir uns von den Gästen.', object: 'von den Gästen' },
  { id: 'tr-halten-von', collocationId: 'halten-von', level: 'B1', objectKind: 'person', personCue: 'er',
    sentence: 'Was hältst du eigentlich von dem neuen Trainer?', object: 'von dem neuen Trainer' },
  { id: 'tr-sich-verstecken-vor', collocationId: 'sich-verstecken-vor', level: 'B1', objectKind: 'person', personCue: 'er',
    sentence: 'Das Kind versteckt sich vor seinem großen Bruder.', object: 'vor seinem großen Bruder' },
  { id: 'tr-passen-zu', collocationId: 'passen-zu', level: 'B1', objectKind: 'person', personCue: 'er',
    sentence: 'Du passt wirklich gut zu deinem Freund.', object: 'zu deinem Freund' },
  { id: 'tr-nett-zu', collocationId: 'nett-zu', level: 'B1', objectKind: 'person', personCue: 'sie',
    sentence: 'Sei bitte nett zu deiner kleinen Schwester.', object: 'zu deiner kleinen Schwester' },
  { id: 'tr-freundlich-zu', collocationId: 'freundlich-zu', level: 'B1', objectKind: 'person', personCue: 'es',
    sentence: 'Alle waren sofort freundlich zu dem neuen Baby.', object: 'zu dem neuen Baby' },
  { id: 'tr-sich-bedanken-bei', collocationId: 'sich-bedanken-bei', level: 'B1', objectKind: 'person', personCue: 'sie',
    sentence: 'Ich möchte mich herzlich bei meiner Lehrerin bedanken.', object: 'bei meiner Lehrerin' },
  { id: 'tr-sich-entschuldigen-bei', collocationId: 'sich-entschuldigen-bei', level: 'B1', objectKind: 'person', personCue: 'er',
    sentence: 'Du solltest dich bei deinem Freund entschuldigen.', object: 'bei deinem Freund' },
  // ─── B2 ───
  { id: 'tr-sich-wenden-an', collocationId: 'sich-wenden-an', level: 'B2', objectKind: 'person', personCue: 'er',
    sentence: 'Bei Problemen wenden Sie sich bitte an den Kundenberater.', object: 'an den Kundenberater' },
  { id: 'tr-zaehlen-auf', collocationId: 'zaehlen-auf', level: 'B2', objectKind: 'person', personCue: 'er',
    sentence: 'Im Notfall zähle ich fest auf meinen besten Freund.', object: 'auf meinen besten Freund' },
  { id: 'tr-wuetend-auf', collocationId: 'wuetend-auf', level: 'B2', objectKind: 'person', personCue: 'er',
    sentence: 'Der Chef war sehr wütend auf den Praktikanten.', object: 'auf den Praktikanten' },
  { id: 'tr-sich-wundern-ueber', collocationId: 'sich-wundern-ueber', level: 'B2', objectKind: 'person', personCue: 'er',
    sentence: 'Alle wunderten sich über den neuen Kollegen.', object: 'über den neuen Kollegen' },
  { id: 'tr-sich-lustig-machen-ueber', collocationId: 'sich-lustig-machen-ueber', level: 'B2', objectKind: 'person', personCue: 'er',
    sentence: 'Macht euch nicht über euren Lehrer lustig!', object: 'über euren Lehrer' },
  { id: 'tr-sich-schaemen-fuer', collocationId: 'sich-schaemen-fuer', level: 'B2', objectKind: 'person', personCue: 'er',
    sentence: 'Manchmal schämt er sich für seinen kleinen Bruder.', object: 'für seinen kleinen Bruder' },
  { id: 'tr-sich-einsetzen-fuer', collocationId: 'sich-einsetzen-fuer', level: 'B2', objectKind: 'person', personCue: 'sie (Plural)',
    sentence: 'Die Anwältin setzt sich für ihre Mandanten ein.', object: 'für ihre Mandanten' },
  { id: 'tr-schwaermen-fuer', collocationId: 'schwaermen-fuer', level: 'B2', objectKind: 'person', personCue: 'er',
    sentence: 'Das ganze Team schwärmt für den neuen Trainer.', object: 'für den neuen Trainer' },
  { id: 'tr-sich-sorgen-um', collocationId: 'sich-sorgen-um', level: 'B2', objectKind: 'person', personCue: 'er',
    sentence: 'Die Mutter sorgt sich ständig um ihren Sohn.', object: 'um ihren Sohn' },
  { id: 'tr-trauern-um', collocationId: 'trauern-um', level: 'B2', objectKind: 'person', personCue: 'er',
    sentence: 'Das ganze Dorf trauert um den alten Bürgermeister.', object: 'um den alten Bürgermeister' },
  { id: 'tr-sich-wehren-gegen', collocationId: 'sich-wehren-gegen', level: 'B2', objectKind: 'person', personCue: 'er',
    sentence: 'Tapfer wehrt sie sich gegen den Angreifer.', object: 'gegen den Angreifer' },
  { id: 'tr-rufen-nach', collocationId: 'rufen-nach', level: 'B2', objectKind: 'person', personCue: 'sie',
    sentence: 'Mitten in der Nacht rief das Baby nach seiner Mutter.', object: 'nach seiner Mutter' },
  // ─── C1 ───
  { id: 'tr-bangen-um', collocationId: 'bangen-um', level: 'C1', objectKind: 'person', personCue: 'er',
    sentence: 'Die ganze Familie bangt um den vermissten Vater.', object: 'um den vermissten Vater' },
]
