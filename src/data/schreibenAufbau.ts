//
// Schreiben Teil 2 — the generalized per-Anlass Bauplan for the runner's
// "Aufbau" drawer tab. The Muster library's per-Muster skeletons narrate
// THAT model's choices ("Grund nennen: Arzttermin …"); these lines are the
// same paragraph plans with the scenario nouns stripped, so they hold for
// every Auftrag of their Anlass. Static reference material: never matched,
// never ticked, never logged beyond the drawer's own tab-switch entry.
//
import type { SchreibAnlass } from './schreibenAuftraege'

export const NACHRICHT_AUFBAU: Record<SchreibAnlass, readonly string[]> = {
  entschuldigung: [
    'Betreff: Anliegen und Termin in einer Zeile',
    'Anrede mit Namen — danach klein weiterschreiben',
    'Absage oder Entschuldigung sofort aussprechen, mit „leider" abgefedert',
    'Grund nennen — am besten im weil-Nebensatz',
    'Vorschlagen, wie das Versäumte nachgeholt wird',
    'Eine Bitte im Konjunktiv II anschließen',
    'Verbindlich abschließen + Grußformel und Name'
  ],
  bitte: [
    'Betreff: das Anliegen in einer Zeile benennen',
    'Anrede mit Namen — danach klein weiterschreiben',
    'Bezug: warum Sie schreiben, in einem Satz',
    'Situation kurz erklären — der Hintergrund der Bitte',
    'Die Bitte selbst im Konjunktiv II formulieren',
    'Anbieten, was Sie selbst dazu beitragen können',
    'Um Rückmeldung bitten + Grußformel und Name'
  ],
  beschwerde: [
    'Betreff: das Problem sachlich in einer Zeile',
    'Anrede mit Namen — danach klein weiterschreiben',
    'Sachlich einsteigen: „Leider muss ich Ihnen mitteilen, dass …"',
    'Das Problem konkret beschreiben — seit wann, wie oft, wen es betrifft',
    'Die Folgen benennen: was das Problem kostet',
    'Eine Lösung mit Frist erbitten — im Konjunktiv II',
    'Verbindlich abschließen + Grußformel und Name'
  ],
  vorschlag: [
    'Betreff: den Vorschlag in einer Zeile ankündigen',
    'Anrede mit Namen — danach klein weiterschreiben',
    'Bezug: den Anlass oder das Thema aufgreifen',
    'Ausgangslage kurz beschreiben — was verbessert werden kann',
    'Den Vorschlag konkret machen: was, wie, wann',
    'Vorteile nennen — für das Team, den Kurs, die Firma',
    'Um Meinung oder Zustimmung bitten + Grußformel und Name'
  ],
  dank: [
    'Betreff: wofür Sie danken, in einer Zeile',
    'Anrede mit Namen — danach klein weiterschreiben',
    'Den Dank sofort aussprechen — konkret, nicht allgemein',
    'Sagen, was die Hilfe möglich gemacht hat',
    'Ein Beispiel oder ein Ergebnis nennen',
    'Ein Angebot anschließen — sich revanchieren, weiterempfehlen',
    'Verbindlich abschließen + Grußformel und Name'
  ]
}
