// src/data/daKorrelat.ts
//
// Authored dataset for the Da-compound KORRELAT drill. Each item is one sentence
// whose main clause is followed by a dass-/ob-/w-/zu-clause. The gap sits where a
// Korrelat (da-compound: darauf, davon, darum …) would announce that clause. Per
// verb the Korrelat is:
//   • obligatory — natural ONLY WITH the compound (bestehen darauf, dass …);
//   • optional   — natural BOTH with and without it (sich (darüber) freuen, dass …);
//   • excluded   — natural ONLY WITHOUT it; the verb takes a plain dass-clause and
//                  governs NO fixed preposition (wissen, glauben=meinen, sagen …).
//
// Accuracy is a shipping gate: read every sentence aloud WITH the compound in the
// gap and WITHOUT anything, and the status label must be true. Obligatory/optional
// items carry EITHER a collocationId (joined against COLLOCATIONS for the governed
// preposition) OR an explicit preposition (for verbs not in that dataset); excluded
// items carry neither. The answer is DERIVED (never stored) by korrelatAnswer():
// the da-compound for obligatory/optional, null for excluded. Invariants live in
// tests/data/daKorrelat.test.ts.

import { COLLOCATIONS, type CollocationLevel } from './collocations'
import { daCompound } from './daCompounds'

export type KorrelatStatus = 'obligatory' | 'optional' | 'excluded'

export interface KorrelatItem {
  /** Unique id, `ko-<slug>`. */
  id: string
  /** Whether the Korrelat is obligatory, optional, or wrong for this verb. */
  korrelat: KorrelatStatus
  /** obligatory/optional only: joins COLLOCATIONS for the governed preposition. */
  collocationId?: string
  /** obligatory/optional only: explicit prep for a verb not in COLLOCATIONS. */
  preposition?: string
  /** One `___` gap; the main clause is followed by a dass-/ob-/w-/zu-clause. */
  sentence: string
  /** One German+English teaching line the reveal shows: names the verb + status. */
  explanation: string
  level: CollocationLevel
}

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

/**
 * The Korrelat the gap wants: the da-compound of the governed preposition for
 * obligatory/optional items, or null for excluded items (no compound belongs).
 */
export function korrelatAnswer(item: KorrelatItem): string | null {
  if (item.korrelat === 'excluded') return null
  let prep = item.preposition
  if (prep == null) {
    const collocation = byId.get(item.collocationId!)
    if (!collocation) throw new Error(`Unknown collocationId: ${item.collocationId}`)
    prep = collocation.preposition
  }
  return daCompound(prep)
}

export const DA_KORRELAT: KorrelatItem[] = [
  // ─────────────────────────── obligatory (17) ───────────────────────────
  // The da-compound cannot be dropped: without it the sentence is ungrammatical.
  { id: 'ko-bestehen-auf', korrelat: 'obligatory', collocationId: 'bestehen-auf', level: 'B2',
    sentence: 'Der Chef besteht ___, dass wir pünktlich zur Sitzung erscheinen.',
    explanation: 'bestehen auf + Korrelat ist obligatorisch — man kann "darauf" nicht weglassen. / With "bestehen auf" the Korrelat is obligatory.' },
  { id: 'ko-ankommen-auf', korrelat: 'obligatory', collocationId: 'ankommen-auf', level: 'B2',
    sentence: 'Es kommt ganz ___ an, ob du dich wirklich anstrengst.',
    explanation: 'es kommt darauf an — das Korrelat ist hier obligatorisch. / "es kommt darauf an" needs the obligatory Korrelat.' },
  { id: 'ko-sich-verlassen-auf', korrelat: 'obligatory', collocationId: 'sich-verlassen-auf', level: 'B1',
    sentence: 'Ich verlasse mich fest ___, dass du dein Wort hältst.',
    explanation: 'sich verlassen auf braucht das Korrelat zwingend. / "sich verlassen auf" requires the obligatory Korrelat.' },
  { id: 'ko-abhaengen-von', korrelat: 'obligatory', collocationId: 'abhaengen-von', level: 'B2',
    sentence: 'Unser Ausflug hängt ___ ab, ob es morgen regnet.',
    explanation: 'abhängen von — das Korrelat "davon" ist obligatorisch. / "abhängen von" takes an obligatory Korrelat.' },
  { id: 'ko-sich-kuemmern-um', korrelat: 'obligatory', collocationId: 'sich-kuemmern-um', level: 'B1',
    sentence: 'Der Hausmeister kümmert sich ___, dass alle Türen abgeschlossen sind.',
    explanation: 'sich kümmern um verlangt das obligatorische Korrelat. / "sich kümmern um" needs the obligatory Korrelat.' },
  { id: 'ko-neigen-zu', korrelat: 'obligatory', collocationId: 'neigen-zu', level: 'C1',
    sentence: 'Mein Kollege neigt ___, jedes kleine Problem zu dramatisieren.',
    explanation: 'neigen zu + zu-Infinitiv — "dazu" ist obligatorisch. / "neigen zu" requires the obligatory Korrelat.' },
  { id: 'ko-ausgehen-von', korrelat: 'obligatory', collocationId: 'ausgehen-von', level: 'B2',
    sentence: 'Wir gehen fest ___ aus, dass die Lieferung morgen eintrifft.',
    explanation: 'ausgehen von — das Korrelat "davon" ist obligatorisch. / "ausgehen von" takes an obligatory Korrelat.' },
  { id: 'ko-sorgen-fuer', korrelat: 'obligatory', collocationId: 'sorgen-fuer', level: 'B1',
    sentence: 'Die Gastgeber sorgen ___, dass niemand hungrig nach Hause geht.',
    explanation: 'sorgen für verlangt das obligatorische Korrelat "dafür". / "sorgen für" needs the obligatory Korrelat.' },
  { id: 'ko-hinweisen-auf', korrelat: 'obligatory', collocationId: 'hinweisen-auf', level: 'B2',
    sentence: 'Ich weise ausdrücklich ___ hin, dass die Frist am Freitag endet.',
    explanation: 'hinweisen auf — das Korrelat "darauf" ist obligatorisch. / "hinweisen auf" takes an obligatory Korrelat.' },
  { id: 'ko-achten-auf', korrelat: 'obligatory', collocationId: 'achten-auf', level: 'B1',
    sentence: 'Bitte achte ___, dass die Kinder pünktlich ins Bett gehen.',
    explanation: 'achten auf verlangt das obligatorische Korrelat "darauf". / "achten auf" needs the obligatory Korrelat.' },
  { id: 'ko-sich-einsetzen-fuer', korrelat: 'obligatory', collocationId: 'sich-einsetzen-fuer', level: 'B2',
    sentence: 'Der Verein setzt sich ___ ein, dass der alte Park erhalten bleibt.',
    explanation: 'sich einsetzen für — das Korrelat "dafür" ist obligatorisch. / "sich einsetzen für" takes an obligatory Korrelat.' },
  { id: 'ko-beitragen-zu', korrelat: 'obligatory', collocationId: 'beitragen-zu', level: 'B2',
    sentence: 'Jeder Einzelne trägt ___ bei, dass sich das Klima verändert.',
    explanation: 'beitragen zu — das Korrelat "dazu" ist obligatorisch. / "beitragen zu" takes an obligatory Korrelat.' },
  { id: 'ko-fuehren-zu', korrelat: 'obligatory', collocationId: 'fuehren-zu', level: 'B2',
    sentence: 'Die vielen Fehler führen ___, dass niemand dem Bericht vertraut.',
    explanation: 'führen zu verlangt das obligatorische Korrelat "dazu". / "führen zu" needs the obligatory Korrelat.' },
  { id: 'ko-verzichten-auf', korrelat: 'obligatory', collocationId: 'verzichten-auf', level: 'B2',
    sentence: 'Sie verzichtet bewusst ___, sich über die Kollegen zu beschweren.',
    explanation: 'verzichten auf + zu-Infinitiv — "darauf" ist obligatorisch. / "verzichten auf" requires the obligatory Korrelat.' },
  { id: 'ko-sich-sehnen-nach', korrelat: 'obligatory', collocationId: 'sich-sehnen-nach', level: 'B2',
    sentence: 'Nach Monaten im Büro sehnt er sich ___, endlich wieder zu reisen.',
    explanation: 'sich sehnen nach + zu-Infinitiv — "danach" ist obligatorisch. / "sich sehnen nach" requires the obligatory Korrelat.' },
  { id: 'ko-liegen-an', korrelat: 'obligatory', preposition: 'an', level: 'B1',
    sentence: 'Es liegt nur ___, dass niemand rechtzeitig mitgeholfen hat.',
    explanation: 'liegen an (Ursache) — das Korrelat "daran" ist obligatorisch. / "liegen an" (cause) needs the obligatory Korrelat.' },
  { id: 'ko-es-geht-um', korrelat: 'obligatory', preposition: 'um', level: 'B1',
    sentence: 'Bei dieser Abstimmung geht es ___, ob das Projekt weiterläuft.',
    explanation: 'es geht um — das Korrelat "darum" ist obligatorisch. / "es geht um" needs the obligatory Korrelat.' },

  // ─────────────────────────── optional (16) ───────────────────────────
  // Both natural: the compound may be included for emphasis or dropped.
  { id: 'ko-sich-erinnern-an', korrelat: 'optional', collocationId: 'sich-erinnern-an', level: 'B1',
    sentence: 'Ich erinnere mich ___, dass wir uns schon einmal getroffen haben.',
    explanation: 'sich erinnern an — das Korrelat "daran" ist optional. / "sich erinnern an" takes an optional Korrelat.' },
  { id: 'ko-sich-freuen-ueber', korrelat: 'optional', collocationId: 'sich-freuen-ueber', level: 'B1',
    sentence: 'Wir freuen uns ___, dass du die Prüfung bestanden hast.',
    explanation: 'sich freuen über — das Korrelat "darüber" ist optional. / "sich freuen über" takes an optional Korrelat.' },
  { id: 'ko-sich-freuen-auf', korrelat: 'optional', collocationId: 'sich-freuen-auf', level: 'B1',
    sentence: 'Ich freue mich schon jetzt ___, dich bald wieder zu treffen.',
    explanation: 'sich freuen auf + zu-Infinitiv — "darauf" ist optional. / "sich freuen auf" takes an optional Korrelat.' },
  { id: 'ko-hoffen-auf', korrelat: 'optional', collocationId: 'hoffen-auf', level: 'B1',
    sentence: 'Wir hoffen ___, dass sich die Lage bald wieder bessert.',
    explanation: 'hoffen auf — das Korrelat "darauf" ist optional. / "hoffen auf" takes an optional Korrelat.' },
  { id: 'ko-traeumen-von', korrelat: 'optional', collocationId: 'traeumen-von', level: 'B1',
    sentence: 'Als Kind träumte sie ___, einmal Astronautin zu werden.',
    explanation: 'träumen von + zu-Infinitiv — "davon" ist optional. / "träumen von" takes an optional Korrelat.' },
  { id: 'ko-sich-aergern-ueber', korrelat: 'optional', collocationId: 'sich-aergern-ueber', level: 'B1',
    sentence: 'Er ärgert sich ___, dass er den letzten Zug verpasst hat.',
    explanation: 'sich ärgern über — das Korrelat "darüber" ist optional. / "sich ärgern über" takes an optional Korrelat.' },
  { id: 'ko-nachdenken-ueber', korrelat: 'optional', collocationId: 'nachdenken-ueber', level: 'B1',
    sentence: 'Ich denke ___ nach, ob ich den Job wirklich wechseln soll.',
    explanation: 'nachdenken über — das Korrelat "darüber" ist optional. / "nachdenken über" takes an optional Korrelat.' },
  { id: 'ko-sich-wundern-ueber', korrelat: 'optional', collocationId: 'sich-wundern-ueber', level: 'B2',
    sentence: 'Sie wundert sich ___, dass bis jetzt noch niemand angerufen hat.',
    explanation: 'sich wundern über — das Korrelat "darüber" ist optional. / "sich wundern über" takes an optional Korrelat.' },
  { id: 'ko-sich-beschweren-ueber', korrelat: 'optional', collocationId: 'sich-beschweren-ueber', level: 'B1',
    sentence: 'Die Gäste beschweren sich ___, dass das Zimmer nicht sauber war.',
    explanation: 'sich beschweren über — das Korrelat "darüber" ist optional. / "sich beschweren über" takes an optional Korrelat.' },
  { id: 'ko-sich-informieren-ueber', korrelat: 'optional', collocationId: 'sich-informieren-ueber', level: 'B1',
    sentence: 'Ich informiere mich noch genau ___, wie der Kurs eigentlich abläuft.',
    explanation: 'sich informieren über — das Korrelat "darüber" ist optional. / "sich informieren über" takes an optional Korrelat.' },
  { id: 'ko-berichten-ueber', korrelat: 'optional', collocationId: 'berichten-ueber', level: 'B2',
    sentence: 'Die Zeitung berichtet ausführlich ___, wie das Unglück geschehen ist.',
    explanation: 'berichten über — das Korrelat "darüber" ist optional. / "berichten über" takes an optional Korrelat.' },
  { id: 'ko-diskutieren-ueber', korrelat: 'optional', collocationId: 'diskutieren-ueber', level: 'B1',
    sentence: 'Wir diskutieren gerade ___, ob das ganze Projekt überhaupt sinnvoll ist.',
    explanation: 'diskutieren über — das Korrelat "darüber" ist optional. / "diskutieren über" takes an optional Korrelat.' },
  { id: 'ko-sich-einigen-auf', korrelat: 'optional', collocationId: 'sich-einigen-auf', level: 'B2',
    sentence: 'Die Parteien einigten sich schließlich ___, das Projekt gemeinsam zu finanzieren.',
    explanation: 'sich einigen auf + zu-Infinitiv — "darauf" ist optional. / "sich einigen auf" takes an optional Korrelat.' },
  { id: 'ko-sich-entscheiden-fuer', korrelat: 'optional', collocationId: 'sich-entscheiden-fuer', level: 'B1',
    sentence: 'Am Ende entscheidet sie sich ___, das neue Angebot doch zu akzeptieren.',
    explanation: 'sich entscheiden für + zu-Infinitiv — "dafür" ist optional. / "sich entscheiden für" takes an optional Korrelat.' },
  { id: 'ko-zweifeln-an', korrelat: 'optional', collocationId: 'zweifeln-an', level: 'B2',
    sentence: 'Niemand zweifelt ernsthaft ___, dass der Plan am Ende aufgeht.',
    explanation: 'zweifeln an — das Korrelat "daran" ist optional. / "zweifeln an" takes an optional Korrelat.' },
  { id: 'ko-sich-beklagen-ueber', korrelat: 'optional', collocationId: 'sich-beklagen-ueber', level: 'B2',
    sentence: 'Er beklagt sich ständig ___, dass er viel zu wenig Zeit habe.',
    explanation: 'sich beklagen über — das Korrelat "darüber" ist optional. / "sich beklagen über" takes an optional Korrelat.' },

  // ─────────────────────────── excluded (14) ───────────────────────────
  // Plain dass-verbs with NO governed preposition: any da-compound is wrong.
  { id: 'ko-wissen', korrelat: 'excluded', level: 'B1',
    sentence: 'Ich weiß ganz genau ___, dass du am Ende recht behalten wirst.',
    explanation: 'wissen nimmt einen reinen dass-Satz — kein Korrelat (nicht *darüber). / "wissen" takes a plain dass-clause; no Korrelat.' },
  { id: 'ko-glauben', korrelat: 'excluded', level: 'B1',
    sentence: 'Ich glaube ehrlich gesagt ___, dass er gestern einfach keine Zeit hatte.',
    explanation: 'glauben (= meinen) nimmt einen reinen dass-Satz — kein Korrelat (anders als "an etwas glauben"). / "glauben" (= to think) takes a plain dass-clause; no Korrelat.' },
  { id: 'ko-sagen', korrelat: 'excluded', level: 'B1',
    sentence: 'Er sagt immer wieder ___, dass er einfach zu müde sei.',
    explanation: 'sagen nimmt einen reinen dass-Satz — kein Korrelat. / "sagen" takes a plain dass-clause; no Korrelat.' },
  { id: 'ko-denken', korrelat: 'excluded', level: 'B1',
    sentence: 'Ich denke wirklich ___, dass das eine ausgezeichnete Idee ist.',
    explanation: 'denken (= meinen) nimmt einen reinen dass-Satz — kein Korrelat. / "denken" (= to think) takes a plain dass-clause; no Korrelat.' },
  { id: 'ko-meinen', korrelat: 'excluded', level: 'B1',
    sentence: 'Sie meint allen Ernstes ___, dass wir uns viel mehr beeilen sollten.',
    explanation: 'meinen nimmt einen reinen dass-Satz — kein Korrelat. / "meinen" takes a plain dass-clause; no Korrelat.' },
  { id: 'ko-finden', korrelat: 'excluded', level: 'B1',
    sentence: 'Ich finde ehrlich gesagt ___, dass der Film ziemlich langweilig war.',
    explanation: 'finden (= eine Meinung haben) nimmt einen reinen dass-Satz — kein Korrelat. / "finden" (opinion) takes a plain dass-clause; no Korrelat.' },
  { id: 'ko-behaupten', korrelat: 'excluded', level: 'B2',
    sentence: 'Er behauptet steif und fest ___, dass er von nichts gewusst habe.',
    explanation: 'behaupten nimmt einen reinen dass-Satz — kein Korrelat. / "behaupten" takes a plain dass-clause; no Korrelat.' },
  { id: 'ko-versprechen', korrelat: 'excluded', level: 'B1',
    sentence: 'Sie verspricht mir hoch und heilig ___, dass sie diesmal pünktlich kommt.',
    explanation: 'versprechen nimmt einen reinen dass-Satz — kein Korrelat. / "versprechen" takes a plain dass-clause; no Korrelat.' },
  { id: 'ko-bedauern', korrelat: 'excluded', level: 'B2',
    sentence: 'Wir bedauern außerordentlich ___, dass Sie unser Team verlassen.',
    explanation: 'bedauern nimmt einen reinen dass-Satz — kein Korrelat. / "bedauern" takes a plain dass-clause; no Korrelat.' },
  { id: 'ko-vergessen', korrelat: 'excluded', level: 'B1',
    sentence: 'Ich vergesse immer wieder ___, dass die Bank samstags geschlossen ist.',
    explanation: 'vergessen nimmt einen reinen dass-Satz — kein Korrelat. / "vergessen" takes a plain dass-clause; no Korrelat.' },
  { id: 'ko-leugnen', korrelat: 'excluded', level: 'B2',
    sentence: 'Er leugnet hartnäckig ___, dass er jemals am Tatort gewesen ist.',
    explanation: 'leugnen nimmt einen reinen dass-Satz — kein Korrelat. / "leugnen" takes a plain dass-clause; no Korrelat.' },
  { id: 'ko-bemerken', korrelat: 'excluded', level: 'B2',
    sentence: 'Sie bemerkt sofort ___, dass mit dem Vertrag etwas nicht stimmt.',
    explanation: 'bemerken nimmt einen reinen dass-Satz — kein Korrelat. / "bemerken" takes a plain dass-clause; no Korrelat.' },
  { id: 'ko-betonen', korrelat: 'excluded', level: 'B2',
    sentence: 'Der Minister betont nachdrücklich ___, dass die Steuern nicht steigen.',
    explanation: 'betonen nimmt einen reinen dass-Satz — kein Korrelat. / "betonen" takes a plain dass-clause; no Korrelat.' },
  { id: 'ko-bezweifeln', korrelat: 'excluded', level: 'B2',
    sentence: 'Ich bezweifle ernsthaft ___, dass diese Zahlen wirklich stimmen.',
    explanation: 'bezweifeln (transitiv!) nimmt einen reinen dass-Satz — kein Korrelat, anders als "zweifeln an". / "bezweifeln" takes a plain dass-clause; no Korrelat (unlike "zweifeln an").' },
]
