//
// Schreiben Teil 2 — the five annotated Musternachrichten. See CONTEXT.md →
// "Musternachricht", "Schreibanlass", "Nachrichtenmittel".
//
// A Musternachricht is deliberately its own concept beside Teil 1's Mustertext
// (schreibenMuster.ts): the same teaching mechanism — a hand-authored answer of
// exam length whose marked spans explain WHY a device works at that exact spot,
// never a bare definition — but its own layer set and its own library surface,
// because the two genres teach different skills. Teil 1 argues; Teil 2
// interacts, and interaction is carried by a fourth layer that the Forumsbeitrag
// does not need: `hoeflichkeit` — Konjunktiv-II request frames, softeners
// (leider, gern, durchaus), and the Anrede/Gruß conventions. That layer is the
// genre's core skill, so every text marks at least two of its spans.
//
// One Musternachricht per Schreibanlass — the Anlass IS the key (ADR-0023), the
// same key that picks the Inhalts-Baukasten fallback. Each text answers one
// flagship Schreibauftrag from schreibenAuftraege.ts in earnest: its Empfänger
// is addressed by name, its situation is the one on the task sheet, and all
// four Inhaltspunkte are actually covered — a learner can hold the model beside
// the Auftrag and see the checklist tick off line by line.
//
// The frame is part of the text, not chrome around it: the first segment is the
// Betreff line, the Anrede ends in a comma and the next line continues
// lowercase, and the Grußformel plus name close it. The line breaks live in
// their own `\n` / `\n\n` segments so the annotated spans stay clean.
//
// A span carries exactly ONE layer — the teaching-dominant one. Where a phrase
// from the Nachrichtenmittel bank (schreibenNachrichtenMittel.ts) appears
// naturally, the mittel note says so, so the learner recognizes the bank in the
// wild. Read-only teaching material: never graded, never counted in Redemittel
// yield, never a Run.

import type { SchreibAnlass } from './schreibenAuftraege'

export type NachrichtMusterLayer = 'konnektor' | 'mittel' | 'struktur' | 'hoeflichkeit'

export interface NachrichtMusterSegment { t: string; layer?: NachrichtMusterLayer; noteDe?: string }

export interface Musternachricht {
  id: SchreibAnlass            // the Anlass IS the key (ADR-0023)
  titleDe: string              // the skill the text teaches, not the occasion's label
  signalDe: string             // how to recognize the Anlass on a task sheet
  auftragId: string            // the flagship Auftrag this text answers
  skeleton: string[]           // the paragraph plan, Betreff → Gruß
  segments: NachrichtMusterSegment[]
}

export const NACHRICHT_MUSTER_LAYER_LABEL: Record<NachrichtMusterLayer, { de: string; en: string }> = {
  konnektor:    { de: 'Konnektoren', en: 'connectors' },
  mittel:       { de: 'Nachrichtenmittel & Züge', en: 'moves & phrases' },
  struktur:     { de: 'Grammatische Strukturen', en: 'grammar structures' },
  hoeflichkeit: { de: 'Höflichkeit', en: 'politeness devices' }
}

export const SCHREIBEN_MUSTER_NACHRICHTEN: Musternachricht[] = [
  {
    id: 'entschuldigung',
    titleDe: 'Höflich absagen & Ersatz anbieten',
    signalDe: '„Entschuldigen Sie sich …" / „Sagen Sie ab …" + Grund- und Nachhol-Punkte',
    auftragId: 'wa-besprechung-absagen',
    skeleton: [
      'Betreff: Absage und Termin in einer Zeile',
      'Anrede + Absage sofort aussprechen, mit „leider" abgefedert',
      'Entschuldigung für die Kurzfristigkeit',
      'Grund nennen: Arzttermin, im weil-Nebensatz begründet',
      'Vorschlag, wie die Inhalte nachgeholt werden',
      'Bitte um Protokoll und Unterlagen im Konjunktiv II',
      'Verbindlicher Abschluss + Grußformel und Name'
    ],
    segments: [
      { t: 'Betreff: Absage der Besprechung am Freitag', layer: 'mittel',
        noteDe: 'Der Betreff nennt Anliegen und Termin in einer Zeile — der Empfänger weiß vor dem Öffnen, worum es geht.' },
      { t: '\n\n' },
      { t: 'Sehr geehrter Herr Semder,', layer: 'hoeflichkeit',
        noteDe: 'Die neutrale Standard-Anrede mit Namen — immer sicher gegenüber Vorgesetzten. Nach dem Komma geht es klein weiter.' },
      { t: '\n' },
      { t: 'leider ', layer: 'hoeflichkeit',
        noteDe: '„Leider" als Weichmacher direkt am Satzanfang: kündigt die schlechte Nachricht an, ohne sie hart zu machen.' },
      { t: 'muss ich Ihnen mitteilen, dass ich an der Besprechung am Freitag nicht teilnehmen kann. ' },
      { t: 'Bitte entschuldigen Sie, dass ', layer: 'mittel',
        noteDe: 'Das Nachrichtenmittel für die direkte Entschuldigung — hier gleich nach der Absage, damit die Entschuldigung nicht ans Ende rutscht.' },
      { t: 'ich Ihnen erst heute Bescheid gebe.' },
      { t: '\n\n' },
      { t: 'Ich habe an diesem Vormittag einen Facharzttermin, ' },
      { t: 'weil eine Untersuchung dringend nachgeholt werden muss', layer: 'struktur',
        noteDe: 'Der weil-Nebensatz liefert den Grund im selben Satz wie die Absage — mit Passiv wirkt er sachlich statt nach einer Ausrede.' },
      { t: '. ' },
      { t: 'Da ', layer: 'konnektor',
        noteDe: 'Stellt den entscheidenden Grund voran, bevor die Folge kommt — der Leser versteht die Unverschiebbarkeit, bevor sie behauptet wird.' },
      { t: 'ich auf diesen Termin monatelang gewartet habe, lässt er sich nicht mehr verschieben.' },
      { t: '\n\n' },
      { t: 'Damit mir nichts Wichtiges entgeht, ', layer: 'struktur',
        noteDe: 'Der damit-Finalsatz nennt zuerst den Zweck und macht den folgenden Vorschlag dadurch zur Lösung statt zu einer Bitte um Extrazeit.' },
      { t: 'würde ich die Ergebnisse gern am Montag kurz mit Ihnen durchsprechen', layer: 'hoeflichkeit',
        noteDe: 'Konjunktiv II plus „gern": der Vorschlag klingt als Angebot, nicht als Terminansage an den Vorgesetzten.' },
      { t: '. ' },
      { t: 'Außerdem ', layer: 'konnektor',
        noteDe: 'Hängt die zweite Bitte als eigenständigen Punkt an, statt sie in den Vorschlag hineinzupacken — beide bleiben einzeln erkennbar.' },
      { t: 'wäre ich Ihnen sehr dankbar, wenn Sie mir das Protokoll und die Unterlagen zusenden könnten', layer: 'hoeflichkeit',
        noteDe: 'Doppelter Konjunktiv II („wäre", „könnten") im wenn-Satz: die Bitte lässt dem Empfänger sichtbar die Wahl.' },
      { t: '. ' },
      { t: 'Selbstverständlich richte ich mich nach Ihrem Terminvorschlag.', layer: 'mittel',
        noteDe: 'Ein Nachrichtenmittel für den verbindlichen Abschluss: signalisiert Flexibilität, direkt bevor die Grußformel den Text schließt.' },
      { t: '\n\n' },
      { t: 'Mit freundlichen Grüßen', layer: 'hoeflichkeit',
        noteDe: 'Der zur Anrede „Sehr geehrter …" passende Gruß — ohne Komma und ohne Punkt, der Name steht in der nächsten Zeile.' },
      { t: '\nMarco Lehner' }
    ]
  },
  {
    id: 'bitte',
    titleDe: 'Ein Anliegen begründet vorbringen',
    signalDe: '„Nennen Sie Ihr Anliegen …" + Begründungs- und Rückmeldungs-Punkte',
    auftragId: 'wa-homeoffice-antrag',
    skeleton: [
      'Betreff: das Anliegen in einer Zeile benennen',
      'Anrede + Anliegen im ersten Satz, Bezug auf die eigene Lage',
      'Begründung: familiärer Hintergrund',
      'Zuverlässigkeit zeigen: Erreichbarkeit, Fristen, Kundentermine',
      'Bitte um ein Gespräch im Konjunktiv II',
      'Dank im Voraus + Grußformel und Name'
    ],
    segments: [
      { t: 'Betreff: Antrag auf zwei Homeoffice-Tage pro Woche', layer: 'mittel',
        noteDe: 'Der Betreff sagt, was erbeten wird, und in welchem Umfang — die Vorgesetzte kann die Bitte einordnen, bevor sie liest.' },
      { t: '\n\n' },
      { t: 'Sehr geehrte Frau Kling,', layer: 'hoeflichkeit',
        noteDe: 'Formelle Anrede mit Namen, weil die Bitte an die Vorgesetzte geht. Das Komma verlangt Kleinschreibung in der nächsten Zeile.' },
      { t: '\n' },
      { t: 'ich wende mich an Sie, weil ', layer: 'mittel',
        noteDe: 'Das Bezug-Nachrichtenmittel schlechthin: nennt den Anlass im allerersten Satz, statt ihn erst nach Vorreden zu liefern.' },
      { t: 'ich künftig gern zwei Tage pro Woche von zu Hause arbeiten würde. Bisher bin ich in Vollzeit im Büro tätig.' },
      { t: '\n\n' },
      { t: 'Der Grund dafür ist, dass ', layer: 'mittel',
        noteDe: 'Setzt die Begründung als eigenen Absatz-Auftakt ab — Anliegen und Begründung bleiben getrennt und damit beide gut lesbar.' },
      { t: 'ich seit Kurzem die Betreuung meines Vaters übernommen habe, ' },
      { t: 'der zweimal wöchentlich zur Therapie gebracht werden muss', layer: 'struktur',
        noteDe: 'Relativsatz mit Passiv und Modalverb: schiebt die Notwendigkeit in den Nebensatz, sodass der Hauptsatz beim eigenen Anliegen bleibt.' },
      { t: '. ' },
      { t: 'Deshalb ', layer: 'konnektor',
        noteDe: 'Zieht die Folge ausdrücklich aus dem Grund — ohne diesen Konnektor stünden Familiensituation und Bitte nur nebeneinander.' },
      { t: 'wären feste Heimarbeitstage für mich eine große Entlastung.' },
      { t: '\n\n' },
      { t: 'An meiner Arbeitsweise ändert sich dadurch nichts: ' },
      { t: 'Sobald ', layer: 'konnektor',
        noteDe: 'Temporaler Konnektor knüpft die Zusage direkt an die Homeoffice-Tage — sie gilt genau dann, wenn der Einwand entstehen könnte.' },
      { t: 'ich zu Hause arbeite, bin ich telefonisch wie im Büro erreichbar, und meine Berichte reiche ich weiterhin fristgerecht ein. ' },
      { t: 'Termine mit Kunden würde ich ausschließlich auf die Bürotage legen', layer: 'struktur',
        noteDe: 'Konjunktiv II als Selbstverpflichtung: sagt zu, was gelten würde, ohne die noch nicht erteilte Genehmigung vorwegzunehmen.' },
      { t: '.' },
      { t: '\n\n' },
      { t: 'Wäre es möglich, dass ', layer: 'hoeflichkeit',
        noteDe: 'Unpersönlicher Konjunktiv II aus der Mittel-Sammlung: fragt nach der Möglichkeit, nicht nach der Person — leicht zu bejahen, leicht abzulehnen.' },
      { t: 'wir mein Anliegen in einem kurzen Gespräch besprechen? ' },
      { t: 'Vielen Dank im Voraus für Ihre Mühe.', layer: 'mittel',
        noteDe: 'Das Abschluss-Nachrichtenmittel für Bitten: dankt für den Aufwand, bevor er entstanden ist, und schließt die Anfrage verbindlich.' },
      { t: '\n\n' },
      { t: 'Mit freundlichen Grüßen', layer: 'hoeflichkeit',
        noteDe: 'Das Gegenstück zu „Sehr geehrte Frau …" — Anrede und Gruß gehören zum selben Register-Paar und werden nie gemischt.' },
      { t: '\nMarco Lehner' }
    ]
  },
  {
    id: 'beschwerde',
    titleDe: 'Sachlich beschweren & Abhilfe erbitten',
    signalDe: '„Schildern Sie sachlich …" + Folgen- und Verbesserungs-Punkte',
    auftragId: 'wa-kantine-qualitaet',
    skeleton: [
      'Betreff: das Problem sachlich benennen, ohne Vorwurf',
      'Anrede + Anlass der Beschwerde, Bezug auf den Anbieterwechsel',
      'Beobachtungen ordnen: Essen, Auswahl, Wartezeiten',
      'Folgen für die Mittagspause zeigen',
      'Höflich um Abhilfe bitten',
      'Um Antwort bitten + Grußformel und Name'
    ],
    segments: [
      { t: 'Betreff: Qualität des Essens in der Betriebskantine', layer: 'mittel',
        noteDe: 'Der Betreff benennt die Sache, nicht den Ärger — eine Beschwerde wird ernster genommen, wenn schon die Betreffzeile sachlich bleibt.' },
      { t: '\n\n' },
      { t: 'Sehr geehrter Herr Vogel,', layer: 'hoeflichkeit',
        noteDe: 'Gerade bei einer Beschwerde die förmliche Anrede: sie hält die Distanz, in der Kritik nicht persönlich wirkt.' },
      { t: '\n' },
      { t: 'auf folgendes Problem möchte ich Sie hinweisen: ', layer: 'mittel',
        noteDe: 'Ein Nachrichtenmittel der Beschwerde: kündigt das Problem an, bevor es beschrieben wird, und bleibt dabei völlig vorwurfsfrei.' },
      { t: 'Seit dem Wechsel des Anbieters hat die Betriebskantine deutlich nachgelassen.' },
      { t: '\n\n' },
      { t: 'Zum einen ', layer: 'konnektor',
        noteDe: 'Öffnet eine Aufzählung und verspricht dem Leser, dass die Kritik geordnet und begrenzt ist, statt sich zu einer Klageliste auszuwachsen.' },
      { t: 'wird das Essen häufig nur lauwarm ausgegeben, ' },
      { t: 'zum anderen ', layer: 'konnektor',
        noteDe: 'Löst das „zum einen" ein — die Beschwerde bleibt an zwei klar zählbaren Punkten festgemacht.' },
      { t: 'stehen an manchen Tagen überhaupt keine vegetarischen Gerichte zur Auswahl. ' },
      { t: 'Hinzu kommt, dass ', layer: 'mittel',
        noteDe: 'Reiht den dritten Punkt nach, ohne die Zweierstruktur zu sprengen — Wartezeiten sind ein anderes Thema als das Essen selbst.' },
      { t: 'sich die Wartezeiten an der Ausgabe auf etwa zwanzig Minuten verlängert haben.' },
      { t: '\n\n' },
      { t: 'Für unsere Mittagspause hat das spürbare Folgen. ' },
      { t: 'Weil die Pause nur dreißig Minuten dauert, bleibt nach dem Anstehen kaum Zeit zum Essen', layer: 'struktur',
        noteDe: 'Vorangestellter weil-Satz mit Inversion im Hauptsatz: die Rechnung Pause minus Wartezeit steht in einem Satz und wirkt dadurch zwingend.' },
      { t: '. ' },
      { t: 'Mehrere Kolleginnen und Kollegen kaufen ihr Mittagessen inzwischen außerhalb, ' },
      { t: 'was das Angebot mittelfristig noch unattraktiver macht', layer: 'struktur',
        noteDe: 'Weiterführender was-Relativsatz: bezieht sich auf den ganzen Satz davor und macht die Beschwerde zum Problem des Betriebs, nicht nur zum eigenen.' },
      { t: '.' },
      { t: '\n\n' },
      { t: 'Ich möchte Sie daher höflich bitten, ', layer: 'hoeflichkeit',
        noteDe: '„Höflich bitten" statt „fordern": nach einer deutlichen Schilderung hält dieser Rahmen die Forderung im halbformellen Ton.' },
      { t: 'die Vereinbarung mit dem Anbieter zu überprüfen und wieder täglich ein vegetarisches Gericht anzubieten. ' },
      { t: 'Für eine kurze Antwort wäre ich Ihnen dankbar.', layer: 'hoeflichkeit',
        noteDe: 'Konjunktiv II bittet um die Antwort, statt sie zu verlangen — genau der Inhaltspunkt, den Beschwerden oft vergessen.' },
      { t: '\n\n' },
      { t: 'Mit freundlichen Grüßen', layer: 'hoeflichkeit',
        noteDe: 'Der neutrale Gruß beendet auch eine Beschwerde freundlich — der Ton am Schluss entscheidet mit, ob geantwortet wird.' },
      { t: '\nMarco Lehner' }
    ]
  },
  {
    id: 'vorschlag',
    titleDe: 'Einen Vorschlag machen & Mithilfe anbieten',
    signalDe: '„Stellen Sie Ihren Vorschlag vor …" + Begründungs- und Mithilfe-Punkte',
    auftragId: 'wa-teamausflug',
    skeleton: [
      'Betreff: den Vorschlag als Vorschlag ankündigen',
      'Anrede + Bezug auf den Aufruf, Ideen einzureichen',
      'Vorschlag: Ziel und Ablauf des Tages',
      'Begründung: warum er zum Team passt',
      'Mithilfe bei der Organisation anbieten',
      'Um Rückmeldung bitten + Grußformel und Name'
    ],
    segments: [
      { t: 'Betreff: Vorschlag für den diesjährigen Teamausflug', layer: 'mittel',
        noteDe: 'Das Wort „Vorschlag" im Betreff ordnet die Nachricht sofort dem Aufruf zu, auf den sie antwortet — sie landet im richtigen Stapel.' },
      { t: '\n\n' },
      { t: 'Guten Tag, Frau Neumann,', layer: 'hoeflichkeit',
        noteDe: 'Die moderne neutrale Anrede passt zu einer erbetenen Idee im eigenen Haus — sie verlangt aber den Gruß „Freundliche Grüße", nicht „Mit freundlichen Grüßen".' },
      { t: '\n' },
      { t: 'ich beziehe mich auf Ihren Aufruf, ', layer: 'mittel',
        noteDe: 'Das Bezug-Nachrichtenmittel knüpft an die vorausgegangene Nachricht an — der Vorschlag kommt dadurch nicht unaufgefordert daher.' },
      { t: 'Ideen für den jährlichen Teamausflug einzureichen, und möchte Ihnen gern einen Vorschlag machen.' },
      { t: '\n\n' },
      { t: 'Ich schlage vor, dass wir ', layer: 'mittel',
        noteDe: 'Der schlichteste Vorschlagsrahmen aus der Mittel-Sammlung — klar und trotzdem höflich, weil das „wir" das Team einschließt.' },
      { t: 'in diesem Jahr in den Naturpark am Stadtrand fahren. ' },
      { t: 'Vormittags stünde eine leichte Wanderung von etwa zwei Stunden an', layer: 'struktur',
        noteDe: 'Konjunktiv II („stünde") hält den Ablauf ausdrücklich im Entwurf — der Tag ist vorgeschlagen, nicht schon geplant.' },
      { t: ', ' },
      { t: 'anschließend ', layer: 'konnektor',
        noteDe: 'Ordnet den zweiten Programmpunkt zeitlich ein, sodass aus zwei Ideen ein nachvollziehbarer Tagesablauf wird.' },
      { t: 'könnten wir am Grillplatz zusammen essen und den Nachmittag frei gestalten.' },
      { t: '\n\n' },
      { t: 'Dieser Vorschlag passt gut zu unserem Team, ' },
      { t: 'weil die Strecke auch mit kleinen Kindern zu schaffen ist', layer: 'struktur',
        noteDe: 'Der weil-Satz liefert genau das Argument, das die Aufgabe verlangt: die Begründung steht direkt hinter der Behauptung, nicht in einem eigenen Absatz.' },
      { t: '. ' },
      { t: 'So ', layer: 'konnektor',
        noteDe: 'Zieht die Folge aus der Begründung: aus „die Strecke ist machbar" wird der konkrete Nutzen für die Kolleginnen und Kollegen mit Familie.' },
      { t: 'könnten die Kolleginnen und Kollegen mit Familie ihre Kinder mitbringen, statt sich zwischen Ausflug und Betreuung entscheiden zu müssen.' },
      { t: '\n\n' },
      { t: 'Gern ', layer: 'hoeflichkeit',
        noteDe: '„Gern" vor dem Angebot macht aus der Mithilfe eine Bereitschaft statt einer Bedingung — der Vorschlag wirkt dadurch uneigennützig.' },
      { t: 'würde ich bei der Organisation mithelfen und die Reservierung des Grillplatzes übernehmen. ' },
      { t: 'Würden Sie mir kurz Bescheid geben, ob die Idee in Frage kommt?', layer: 'hoeflichkeit',
        noteDe: 'Konjunktiv II mit indirekter Frage: bittet um eine Rückmeldung, ohne der Abteilungsleiterin eine Entscheidung abzuverlangen.' },
      { t: '\n\n' },
      { t: 'Freundliche Grüße', layer: 'hoeflichkeit',
        noteDe: 'Der Gruß, der zu „Guten Tag, Frau …" gehört — ein förmliches „Mit freundlichen Grüßen" wäre hier der klassische Registerbruch.' },
      { t: '\nMarco Lehner' }
    ]
  },
  {
    id: 'dank',
    titleDe: 'Danken & offen Rückmeldung geben',
    signalDe: '„Bedanken Sie sich …" + Rückmeldung/Bericht-Punkte',
    auftragId: 'wa-dank-fortbildung',
    skeleton: [
      'Betreff: die Fortbildung als Rückmeldung ankündigen',
      'Anrede + Dank im ersten Satz, konkret benannt',
      'Nutzen: welcher Teil im Arbeitsalltag hilft',
      'Kritik: was weniger überzeugt hat, sachlich abgefedert',
      'Vorschlag, die Erfahrungen im Team weiterzugeben',
      'Offener Abschluss + Grußformel und Name'
    ],
    segments: [
      { t: 'Betreff: Rückmeldung zur Fortbildung „Gesprächsführung"', layer: 'mittel',
        noteDe: 'Der Betreff nennt „Rückmeldung", nicht „Danke" — er kündigt an, dass hier auch berichtet und bewertet wird.' },
      { t: '\n\n' },
      { t: 'Sehr geehrter Herr Winter,', layer: 'hoeflichkeit',
        noteDe: 'Auch beim Dank bleibt die Anrede förmlich, weil die Nachricht an den Vorgesetzten geht — Wärme entsteht im Text, nicht in der Anrede.' },
      { t: '\n' },
      { t: 'ich möchte mich herzlich bei Ihnen dafür bedanken, dass ', layer: 'mittel',
        noteDe: 'Das Dank-Nachrichtenmittel steht im ersten Satz: Wer den Dank erst am Ende nachschiebt, verfehlt den Anlass der Nachricht.' },
      { t: 'Sie mir die dreitägige Fortbildung zur Gesprächsführung ermöglicht und die Kosten übernommen haben.' },
      { t: '\n\n' },
      { t: 'Am nützlichsten war für mich der zweite Tag, ' },
      { t: 'an dem wir schwierige Gespräche in Rollenspielen geübt haben', layer: 'struktur',
        noteDe: 'Relativsatz mit Präposition („an dem") hängt den Inhalt direkt an den Tag — kompakter als ein zweiter Hauptsatz mit „dort".' },
      { t: '. ' },
      { t: 'Seither ', layer: 'konnektor',
        noteDe: 'Verbindet die Fortbildung mit dem Arbeitsalltag: erst dadurch wird aus dem Bericht ein Beleg, dass sich die Kosten gelohnt haben.' },
      { t: 'gehe ich Kritikgespräche deutlich ruhiger an, ' },
      { t: 'weil ich die Gesprächsphasen jetzt bewusst trenne', layer: 'struktur',
        noteDe: 'Der weil-Satz sagt, woran die Verbesserung liegt — ohne ihn bliebe „ruhiger" eine Behauptung ohne Inhalt.' },
      { t: '.' },
      { t: '\n\n' },
      { t: 'Weniger überzeugt hat mich ' },
      { t: 'allerdings ', layer: 'konnektor',
        noteDe: 'Markiert die Wende vom Lob zur Kritik. In einer Rückmeldung ist dieser eine Konnektor der Unterschied zwischen offen und undankbar.' },
      { t: 'der theoretische Teil am dritten Tag: Die Präsentation dauerte sehr lang, ' },
      { t: 'sodass für Fragen kaum Zeit blieb', layer: 'struktur',
        noteDe: 'Der sodass-Satz nennt die Folge statt eines Urteils — die Kritik bleibt an einer beobachtbaren Tatsache festgemacht.' },
      { t: '.' },
      { t: '\n\n' },
      { t: 'Gern würde ich das Gelernte an das Team weitergeben', layer: 'hoeflichkeit',
        noteDe: '„Gern" plus Konjunktiv II bietet den nächsten Schritt an, statt ihn anzukündigen — die Entscheidung bleibt beim Vorgesetzten.' },
      { t: ' und in der nächsten Teamsitzung eine kurze Zusammenfassung vorstellen. ' },
      { t: 'Für Rückfragen stehe ich Ihnen jederzeit gern zur Verfügung.', layer: 'mittel',
        noteDe: 'Das Standard-Nachrichtenmittel für den Abschluss: hält das Gespräch offen, ohne eine weitere Bitte anzuhängen.' },
      { t: '\n\n' },
      { t: 'Mit freundlichen Grüßen', layer: 'hoeflichkeit',
        noteDe: 'Der zur förmlichen Anrede passende Gruß — trotz des herzlichen Dankes bleibt der Rahmen im halbformellen Register.' },
      { t: '\nMarco Lehner' }
    ]
  }
]

/** The library's short label per Anlass — derived, so it can never drift from the text itself. */
export const NACHRICHT_MUSTER_TITLE = SCHREIBEN_MUSTER_NACHRICHTEN.reduce((acc, m) => {
  acc[m.id] = m.titleDe
  return acc
}, {} as Record<SchreibAnlass, string>)
