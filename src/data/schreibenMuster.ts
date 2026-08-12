//
// Schreiben Teil 1 — the Aufgabenmuster taxonomy and its five annotated
// Mustertexte. See CONTEXT.md → "Aufgabenmuster", "Mustertext" and
// docs/superpowers/specs/2026-08-12-schreiben-mustertexte-design.md (Part 2).
//
// Each of the 24 seeded Schreibthemen (schreibenThemen.ts) maps to its
// dominant Aufgabenmuster in SCHREIBTHEMA_MUSTER, keyed by thema id — the
// Schreibthema interface itself is NOT extended, so custom/AI themes are
// unaffected and simply link to the library generically. A Mustertext is a
// full, genuine ~160-word Forumsbeitrag for one seeded thema, annotated on
// three layers (konnektor / mittel / struktur): every annotated span
// explains WHY the device works at that exact spot, never a bare
// definition. Never graded, never counted against a learner's own text.

export type MusterId = 'abwaegen' | 'alternative' | 'erfahrung' | 'gegenmeinung' | 'vorschlag'
export type MusterLayer = 'konnektor' | 'mittel' | 'struktur'

export interface MusterSegment { t: string; layer?: MusterLayer; noteDe?: string }

export interface Mustertext {
  id: MusterId; titleDe: string; signalDe: string
  themaId: string; skeleton: string[]; segments: MusterSegment[]
}

export const MUSTER_LAYER_LABEL: Record<MusterLayer, { de: string; en: string }> = {
  konnektor: { de: 'Konnektoren', en: 'connectors' },
  mittel:    { de: 'Schreibmittel & Züge', en: 'moves & phrases' },
  struktur:  { de: 'Grammatische Strukturen', en: 'grammar structures' }
}

// The dominant Aufgabenmuster per seeded Schreibthema, read off each theme's
// actual four Inhaltspunkte (schreibenThemen.ts) against the signalDe rules
// in the design spec's taxonomy table. See task-2-report.md for the sizeable
// set of corrections against the plan's starting guess — most of it comes
// down to one rule: points 1–3 (Meinung, Vor-/Nachteile, Erfahrung) are
// boilerplate present in nearly every theme, so the *fourth* Inhaltspunkt's
// literal wording ("Alternative", "Gegenmeinung", "Vorschlag") is almost
// always the real signal; "abwaegen" and "erfahrung" are the two patterns
// without a keyword of their own and are assigned by structural/topical
// judgement instead.
export const SCHREIBTHEMA_MUSTER: Record<string, MusterId> = {
  // abwaegen — Vor-/Nachteile framing that closes on a generic, systemic
  // Gegenmeinung/Fazit point rather than a specific claim worth a dedicated
  // rebuttal.
  'wt-vier-tage-woche': 'abwaegen',
  'wt-teilzeit-fuer-alle': 'abwaegen',
  'wt-haustiere-stadt': 'abwaegen',

  // alternative — point 4 literally asks to name an alternative.
  'wt-homeoffice': 'alternative',
  'wt-fast-fashion': 'alternative',
  'wt-bargeld': 'alternative',
  'wt-streaming-kino': 'alternative',

  // erfahrung — topics where personal experience is the natural backbone
  // of the argument, regardless of what point 4 literally asks for.
  'wt-online-studium': 'erfahrung',
  'wt-fitness-tracker': 'erfahrung',
  'wt-mehrgenerationenhaus': 'erfahrung',
  'wt-regionale-produkte': 'erfahrung',
  'wt-auswandern': 'erfahrung',

  // gegenmeinung — point 4 (or 3) names a specific, nameable counter-claim
  // substantial enough to carry a dedicated concede-and-rebut paragraph.
  'wt-fleischkonsum': 'gegenmeinung',
  'wt-ehrenamt-pflicht': 'gegenmeinung',
  'wt-smartphone-schule': 'gegenmeinung',

  // vorschlag — point 4 literally asks for a Vorschlag/Regel/Maßnahme.
  'wt-ki-im-alltag': 'vorschlag',
  'wt-autofreie-innenstadt': 'vorschlag',
  'wt-social-media-jugend': 'vorschlag',
  'wt-noten-schule': 'vorschlag',
  'wt-tourismus-grenzen': 'vorschlag',
  'wt-werbung-kinder': 'vorschlag',
  'wt-billigfluege': 'vorschlag',
  'wt-selbstoptimierung': 'vorschlag',
  'wt-lebenslanges-lernen': 'vorschlag'
}

export const SCHREIBEN_MUSTER: Mustertext[] = [
  {
    id: 'abwaegen',
    titleDe: 'Pro & Contra abwägen',
    signalDe: '„Nennen Sie Vor- und Nachteile …" + Gegenmeinung/Fazit-Punkte',
    themaId: 'wt-vier-tage-woche',
    skeleton: [
      'Einstieg: Thema nennen, vorsichtige Meinung andeuten',
      'Vorteil: mehr Erholung, konzentrierteres Arbeiten',
      'Nachteil: in manchen Berufen bleibt die Arbeit gleich viel',
      'eigene Erfahrung + Gegenmeinung („schadet der Wirtschaft") einräumen und entkräften',
      'Fazit: Position bekräftigen'
    ],
    segments: [
      { t: 'In letzter Zeit wird viel darüber diskutiert, ob ', layer: 'mittel',
        noteDe: 'Neutraler Einstieg: nennt die Debatte, ohne schon Position zu beziehen — der Leser weiß sofort, worum es geht.' },
      { t: 'die Vier-Tage-Woche für alle Branchen taugt. ' },
      { t: 'Meiner Meinung nach spricht vieles dafür, dass ', layer: 'mittel',
        noteDe: '„Vieles dafür" statt „alles dafür" hält die Position selbstbewusst, aber nicht kompromisslos — passend vor der Abwägung.' },
      { t: 'kürzere Arbeitszeiten sinnvoll sind, ' },
      { t: 'wenn die Leistung stimmt', layer: 'struktur',
        noteDe: 'Wenn-Nebensatz macht die Zustimmung an eine Bedingung geknüpft, statt die Vier-Tage-Woche pauschal gutzuheißen.' },
      { t: '. ' },
      { t: 'Einerseits ', layer: 'konnektor',
        noteDe: 'Kündigt den ersten Teil der Abwägung an — der Leser erkennt sofort, dass gleich eine Gegenseite folgen wird.' },
      { t: 'sorgt ein zusätzlicher freier Tag für mehr Erholung, ' },
      { t: 'sodass Beschäftigte konzentrierter arbeiten, wenn sie im Büro sind', layer: 'struktur',
        noteDe: 'Sodass-Satz verknüpft Erholung und Leistung als Ursache und Wirkung, statt sie nur nebeneinanderzustellen.' },
      { t: '. ' },
      { t: 'Andererseits ', layer: 'konnektor',
        noteDe: 'Löst das von „Einerseits" angekündigte Gegengewicht ein — die Pro-Contra-Struktur bleibt sofort erkennbar.' },
      { t: 'lässt sich nicht leugnen, dass in manchen Berufen, etwa im Handwerk oder in der Pflege, die Arbeit einfach bleibt, egal wie viele Tage zur Verfügung stehen. ' },
      { t: 'Aus eigener Erfahrung ', layer: 'mittel',
        noteDe: 'Markiert den Wechsel von allgemeinen Behauptungen zur eigenen Erfahrung — genau das, was Inhaltspunkt 3 verlangt.' },
      { t: 'weiß ich, dass ich nach einem langen Wochenende motivierter bin, ' },
      { t: 'weshalb ', layer: 'konnektor',
        noteDe: 'Verbindet die private Anekdote direkt mit der Haltung, sodass die Erfahrung zum Argument statt zur Illustration wird.' },
      { t: 'ich das Modell grundsätzlich unterstütze. ' },
      { t: 'Natürlich lässt sich einwenden, dass ', layer: 'mittel',
        noteDe: 'Räumt die Gegenmeinung fair ein, bevor die Widerlegung kommt — überzeugender als ein übergangener Einwand.' },
      { t: 'weniger Arbeitstage der ' },
      { t: 'Wirtschaft schaden würden', layer: 'struktur',
        noteDe: 'Konjunktiv II rückt den Einwand ins Hypothetische, statt ihn als feststehende Tatsache stehen zu lassen.' },
      { t: ', weil Aufträge liegen blieben. ' },
      { t: 'Dieses Risiko besteht ' },
      { t: 'zwar, ', layer: 'konnektor',
        noteDe: 'Erste Hälfte des zwar-doch-Paars — signalisiert, dass der Einwand gleich wieder relativiert wird.' },
      { t: 'doch ', layer: 'konnektor',
        noteDe: 'Löst das „zwar" ein: genau hier beginnt die Widerlegung, für den Leser klar markiert.' },
      { t: 'würde es durch eine kluge Schichtplanung deutlich abgemildert', layer: 'struktur',
        noteDe: 'Konjunktiv-II-Passiv nimmt die handelnde Person zurück und stellt die Maßnahme selbst hypothetisch, aber konkret dar.' },
      { t: ', sodass die Produktivität kaum sinkt. ' },
      { t: 'Außerdem ', layer: 'konnektor',
        noteDe: 'Reiht ein weiteres, unabhängiges Argument an, statt es an die vorherige Widerlegung anzuhängen.' },
      { t: 'wird in Studien, die zu diesem Thema durchgeführt wurden, oft belegt, dass zufriedene Mitarbeiter seltener krank sind. ' },
      { t: 'Zusammenfassend lässt sich sagen, dass ', layer: 'mittel',
        noteDe: 'Signalisiert unmissverständlich den Übergang zum Fazit, nachdem beide Seiten ausgebreitet wurden.' },
      { t: 'die Vier-Tage-Woche vielen Branchen nutzen würde, sofern man sie flexibel gestaltet.' }
    ]
  },
  {
    id: 'alternative',
    titleDe: 'Meinung + Alternative vorschlagen',
    signalDe: '„Nennen Sie eine Alternative zu …"',
    themaId: 'wt-homeoffice',
    skeleton: [
      'Einstieg: Thema nennen, klare Meinung setzen',
      'Vorteil: gesparte Pendelzeit',
      'Nachteil + eigene Beobachtung: fehlender Austausch, Isolation',
      'Gegenmeinung (Videokonferenzen reichen) kurz einräumen',
      'Alternative: hybrides Modell + Fazit'
    ],
    segments: [
      { t: 'Immer wieder liest man in den Nachrichten, dass ', layer: 'mittel',
        noteDe: 'Verweist auf die mediale Dauerpräsenz des Themas, bevor die eigene Meinung beginnt — ein glaubwürdiger Einstieg.' },
      { t: 'immer mehr Unternehmen ihren Beschäftigten das Homeoffice dauerhaft anbieten. ' },
      { t: 'Ich bin der festen Überzeugung, dass ', layer: 'mittel',
        noteDe: 'Klare, feste Positionierung direkt nach dem Einstieg — der Leser weiß ab Satz zwei, wo der Schreiber steht.' },
      { t: 'reines Homeoffice für die meisten Berufe keine gute Lösung ist, ' },
      { t: 'auch wenn es durchaus Vorteile bietet', layer: 'struktur',
        noteDe: 'Konzessiv-Nebensatz räumt sofort ein, dass die Gegenseite nicht falsch ist — macht die harte Meinung davor fairer.' },
      { t: '. ' },
      { t: 'Ein wichtiges Argument dafür ist, dass ', layer: 'mittel',
        noteDe: 'Leitet die Begründung mit einem klar benannten Hauptargument ein, statt vage zu bleiben.' },
      { t: 'der Wegfall des Pendelns täglich wertvolle Zeit spart, die Beschäftigte für Familie oder Erholung nutzen können. ' },
      { t: 'Gleichzeitig ', layer: 'konnektor',
        noteDe: 'Kündigt an, dass dem eben genannten Vorteil sofort ein Nachteil gegenübergestellt wird.' },
      { t: 'fehlt ' },
      { t: 'jedoch ', layer: 'konnektor',
        noteDe: 'Verstärkt den Kontrast im selben Satz — zwei Konnektoren markieren die Wende doppelt deutlich.' },
      { t: 'der spontane Austausch mit Kolleginnen und Kollegen, ' },
      { t: 'ohne den viele Ideen gar nicht erst entstehen würden', layer: 'struktur',
        noteDe: 'Ohne-den-Relativsatz mit Konjunktiv II macht den fehlenden Austausch zur konkreten, hypothetischen Folge statt zur Behauptung.' },
      { t: '. ' },
      { t: 'So hat zum Beispiel eine frühere Kollegin von mir erlebt, dass ', layer: 'mittel',
        noteDe: 'Personalisiert den abstrakten Nachteil mit einem konkreten Fall — genau das, was Inhaltspunkt 3 verlangt.' },
      { t: 'sie sich nach Monaten im Homeoffice zunehmend isoliert fühlte, ' },
      { t: 'obwohl ihre Arbeit objektiv nicht schlechter wurde', layer: 'struktur',
        noteDe: 'Echter Konzessivsatz im Indikativ: Die Isolation war real, obwohl die Leistung stimmte — verstärkt statt entkräftet den Punkt.' },
      { t: '. ' },
      { t: 'Man könnte an dieser Stelle einwenden, dass ', layer: 'mittel',
        noteDe: 'Nennt den Einwand als fremde, distanzierte Stimme, nicht als eigene Meinung — hält die Position sauber getrennt.' },
      { t: 'Videokonferenzen diesen Austausch längst ersetzen könnten, ' },
      { t: 'doch ', layer: 'konnektor',
        noteDe: 'Kurzer, harter Konnektor kippt den Satz sofort von der Videokonferenz-Idee zur eigenen Gegenposition.' },
      { t: 'echte Kreativität entsteht selten am Bildschirm. ' },
      { t: 'Eine sinnvolle Alternative dazu wäre ', layer: 'mittel',
        noteDe: 'Exakt hier, nach Vor- und Nachteilen, verlangt Inhaltspunkt 4 die Alternative — der Übergang ist unübersehbar markiert.' },
      { t: 'ein hybrides Modell, ' },
      { t: 'bei dem feste Bürotage für Teamarbeit reserviert würden', layer: 'struktur',
        noteDe: 'Passiv im Konjunktiv II lässt offen, wer reserviert, und hält den Vorschlag hypothetisch-höflich statt anweisend.' },
      { t: ', ' },
      { t: 'während ', layer: 'konnektor',
        noteDe: 'Stellt die zwei Zeitanteile des Modells direkt gegenüber, ohne dafür einen eigenen Satz zu brauchen.' },
      { t: 'der Rest der Woche flexibel von zu Hause erledigt werden könnte. ' },
      { t: 'So ', layer: 'konnektor',
        noteDe: 'Resultativer Konnektor zieht die Konsequenz aus dem Modell, statt nur eine weitere Behauptung anzuhängen.' },
      { t: 'blieben die Vorteile beider Welten erhalten, ' },
      { t: 'ohne dass die Nachteile überwögen', layer: 'struktur',
        noteDe: 'Konjunktiv II (überwögen) hält das Ergebnis als Erwartung fest, nicht als garantierte Tatsache.' },
      { t: '. ' },
      { t: 'Alles in allem überwiegen für mich die Argumente, dass ', layer: 'mittel',
        noteDe: 'Fazit-Formel wiegt beide Seiten noch einmal gegeneinander ab, bevor der Schlusssatz die Alternative bekräftigt.' },
      { t: 'ein solcher Mittelweg langfristig zufriedenere und produktivere Teams schafft.' }
    ]
  },
  {
    id: 'erfahrung',
    titleDe: 'Eigene Erfahrung als Beleg',
    signalDe: '„Berichten Sie von eigenen Erfahrungen …" trägt die Argumentation',
    themaId: 'wt-online-studium',
    skeleton: [
      'Einstieg: Frage nennen, vorsichtige Meinung',
      'eigene Erfahrung: Konzentrationsproblem im Online-Seminar',
      'Vor-/Nachteil: Flexibilität vs. fehlender Blickkontakt',
      'zweite Erfahrung (Kommilitonin) verstärkt den Punkt',
      'Alternative: Mischmodell + Fazit'
    ],
    segments: [
      { t: 'Kaum ein Thema beschäftigt die Öffentlichkeit so sehr wie ', layer: 'mittel',
        noteDe: 'Übertreibt den Einstieg bewusst leicht — weckt Interesse, ohne dass schon eine Meinung sichtbar wird.' },
      { t: 'die Frage, ob ein Studium komplett online stattfinden kann. ' },
      { t: 'Nach meinem Empfinden ist es sinnvoller, ', layer: 'mittel',
        noteDe: 'Weiche, persönliche Formulierung passt zu einem Text, der gleich mit eigener Erfahrung begründet wird, nicht mit Fakten.' },
      { t: 'Online-Elemente nur ergänzend zu nutzen, ' },
      { t: 'denn ', layer: 'konnektor',
        noteDe: 'Kausaler Konnektor kündigt an: Die folgende Erfahrung ist der Beleg für die eben genannte Meinung.' },
      { t: 'meine eigene Erfahrung spricht eine deutliche Sprache. ' },
      { t: 'Erst letzte Woche habe ich selbst erfahren, dass ', layer: 'mittel',
        noteDe: 'Die zeitlich sehr nahe Erfahrung macht den Beleg frisch und glaubwürdig, statt vage in der Vergangenheit zu bleiben.' },
      { t: 'ich mich in einem reinen Online-Seminar kaum konzentrieren konnte, ' },
      { t: 'obwohl der Inhalt eigentlich interessant war', layer: 'struktur',
        noteDe: 'Konzessivsatz schließt aus, dass mangelndes Interesse die Ursache war — die Schwäche liegt am Format, nicht am Thema.' },
      { t: '. ' },
      { t: 'Zwar ', layer: 'konnektor',
        noteDe: 'Erste Hälfte eines zwar-doch-Paars — räumt den Vorteil der Flexibilität ein, bevor die eigene Erfahrung ihn relativiert.' },
      { t: 'mag es stimmen, dass Online-Kurse zeitlich enorm flexibel sind, ' },
      { t: 'sodass auch Berufstätige oder Eltern nebenbei studieren können', layer: 'struktur',
        noteDe: 'Sodass-Satz zieht die konkrete Konsequenz aus der Flexibilität, statt sie nur zu behaupten.' },
      { t: ', ' },
      { t: 'doch ', layer: 'konnektor',
        noteDe: 'Löst das „Zwar" ein: Der zugestandene Vorteil wird jetzt gegen die eigene Erfahrung abgewogen.' },
      { t: 'mir persönlich fehlte der direkte Blickkontakt, ' },
      { t: 'der Verständnisfragen sofort löst', layer: 'struktur',
        noteDe: 'Relativsatz erklärt im Nebensatz, wofür der Blickkontakt konkret gefehlt hat, statt es unausgesprochen zu lassen.' },
      { t: '. ' },
      { t: 'Ein Beispiel aus meinem Umfeld zeigt, dass ', layer: 'mittel',
        noteDe: 'Erweitert die eigene Erfahrung um einen zweiten Fall — die Erfahrung trägt hier nicht einen, sondern zwei Belege.' },
      { t: 'es nicht nur mir so geht: Eine Kommilitonin brach ihr Online-Studium sogar ab, weil ihr die Motivation ohne echten Campus fehlte, ' },
      { t: 'während ', layer: 'konnektor',
        noteDe: 'Stellt Kommilitonin und eigene Person direkt gegenüber, ohne einen eigenen Vergleichssatz zu formulieren.' },
      { t: 'sie im ersten Präsenzsemester deutlich bessere Noten schrieb. ' },
      { t: 'Denkbar wäre auch eine Lösung, bei der ', layer: 'mittel',
        noteDe: 'Erst nach zwei ausgebreiteten Erfahrungen kommt die geforderte Alternative — als Folgerung, nicht als bloßer Einfall.' },
      { t: 'Vorlesungen online angeboten würden', layer: 'struktur',
        noteDe: 'Passiv im Konjunktiv II lässt offen, wer anbietet, und hält den Vorschlag hypothetisch statt wie eine fertige Vorgabe.' },
      { t: ', ' },
      { t: 'während Seminare und Prüfungen weiterhin vor Ort stattfänden', layer: 'struktur',
        noteDe: 'Konjunktiv II (stattfänden) hält beide Hälften des Mittelwegs im selben hypothetischen Register wie den Vorschlag davor.' },
      { t: '. ' },
      { t: 'So ', layer: 'konnektor',
        noteDe: 'Resultativer Konnektor zieht das Ergebnis aus dem Modell, bevor das Fazit es endgültig bewertet.' },
      { t: 'entstünde ein Mittelweg, der die Freiheit des Online-Formats mit dem Austausch des Präsenzstudiums verbindet. ' },
      { t: 'Insgesamt bin ich der Ansicht, dass ', layer: 'mittel',
        noteDe: 'Schließt den Bogen zur Anfangsfrage und bindet die persönliche Erfahrung noch einmal ins Fazit ein.' },
      { t: 'genau diese Mischung für die meisten Studierenden die bessere Lösung ist.' }
    ]
  },
  {
    id: 'gegenmeinung',
    titleDe: 'Gegenmeinung entkräften',
    signalDe: '„Gehen Sie auf Gegenargumente/eine Gegenmeinung ein"',
    themaId: 'wt-fleischkonsum',
    skeleton: [
      'Einstieg: Frage nennen, klare Meinung',
      'Vorteil: Ressourcenschonung durch weniger Tierhaltung',
      'Nachteil + eigene Erfahrung: Umstellung auf vegane Gerichte',
      'Gegenmeinung („jeder entscheidet selbst") benennen und ausführlich entkräften',
      'Fazit: Freiheit und Verantwortung vereinbar'
    ],
    segments: [
      { t: 'Viele Menschen stellen sich heute die Frage, ob ', layer: 'mittel',
        noteDe: 'Attribuiert die Frage der Öffentlichkeit, nicht sich selbst — ein neutraler Einstieg vor der klaren eigenen Position.' },
      { t: 'wir alle deutlich weniger Fleisch essen sollten. ' },
      { t: 'Ich bin der festen Überzeugung, dass ', layer: 'mittel',
        noteDe: 'Feste Formulierung setzt die Position hart, bevor die ausführliche Gegenmeinung später eine ebenso feste Antwort braucht.' },
      { t: 'ein bewusst geringerer Fleischkonsum sinnvoll wäre, ' },
      { t: 'weil sowohl das Klima als auch die eigene Gesundheit davon profitieren würden', layer: 'struktur',
        noteDe: 'Kausalsatz mit Konjunktiv II hält den erwarteten Nutzen als Prognose fest, nicht als bereits bewiesene Tatsache.' },
      { t: '. ' },
      { t: 'Ein wichtiges Argument dafür ist, dass ', layer: 'mittel',
        noteDe: 'Benennt das Hauptargument explizit als Argument, statt es beiläufig einzustreuen.' },
      { t: 'die Tierhaltung enorme Mengen an Wasser und Fläche verbraucht, ' },
      { t: 'die anderweitig genutzt werden könnten', layer: 'struktur',
        noteDe: 'Passiv im Konjunktiv II verschiebt den Fokus auf die Ressourcen selbst und lässt offen, wer sie stattdessen nutzen würde.' },
      { t: '. ' },
      { t: 'Allerdings ', layer: 'konnektor',
        noteDe: 'Kippt vom Argument sofort zum Gegengewicht — die Vor-/Nachteil-Abwägung bleibt klar erkennbar.' },
      { t: 'verlangt eine solche Umstellung auch Zeit und Übung, ' },
      { t: 'denn ', layer: 'konnektor',
        noteDe: 'Begründet direkt, warum die Umstellung schwerfällt, statt die Behauptung unbegründet stehen zu lassen.' },
      { t: 'viele altbekannte Rezepte lassen sich nicht einfach ersetzen. ' },
      { t: 'Ein konkreter Fall aus meinem Alltag verdeutlicht das: ', layer: 'mittel',
        noteDe: 'Der Doppelpunkt kündigt eine konkrete Szene an, statt die Erfahrung nur zusammenzufassen.' },
      { t: 'Als ich vor einem Jahr erstmals eine Woche lang vegan kochte, schmeckte längst nicht jedes Gericht auf Anhieb, ' },
      { t: 'doch ', layer: 'konnektor',
        noteDe: 'Dreht den Satz von der anfänglichen Schwierigkeit zur inzwischen erreichten Gewohnheit — die Erfahrung endet positiv.' },
      { t: 'inzwischen gehören mehrere pflanzliche Rezepte fest zu meinem Speiseplan. ' },
      { t: 'Manche Kritiker führen dagegen an, dass ', layer: 'mittel',
        noteDe: 'Die Bezeichnung „Kritiker" macht den Einwand zu einer benannten Gegenposition, die die folgende Widerlegung erst verdient.' },
      { t: 'jeder selbst entscheiden sollte, was er isst, ' },
      { t: 'und ', layer: 'konnektor',
        noteDe: 'Koordiniert zwei Teile des einen Einwands, statt ihn in zwei separate Sätze zu zerlegen.' },
      { t: 'dass Verzicht von außen niemandem ' },
      { t: 'vorgeschrieben werden dürfe', layer: 'struktur',
        noteDe: 'Passiv mit Konjunktiv I referiert den Anspruch der Kritiker in indirekter Rede — die Distanzierung bleibt grammatisch sichtbar.' },
      { t: '. ' },
      { t: 'Dieser Einwand ist nachvollziehbar, ' },
      { t: 'doch ', layer: 'konnektor',
        noteDe: 'Zweite, entscheidende Wende: Nach dem Verständnis für den Einwand beginnt hier die eigentliche Widerlegung.' },
      { t: 'persönliche Freiheit endet dort, ' },
      { t: 'wo der eigene Konsum kollektive Folgen wie den Klimawandel verstärkt, die alle betreffen', layer: 'struktur',
        noteDe: 'Wo-Nebensatz mit eingebettetem Relativsatz zieht die Grenze der Freiheit konkret, statt sie nur zu behaupten.' },
      { t: '. ' },
      { t: 'Es wäre allerdings falsch zu behaupten, dass ', layer: 'mittel',
        noteDe: 'Präzisiert die eigene Forderung, bevor sie missverstanden werden kann — eine zweite, feinere Gegenmeinung-Bewegung.' },
      { t: 'völliger Fleischverzicht von jedem ' },
      { t: 'verlangt werden müsste', layer: 'struktur',
        noteDe: 'Passiv im Konjunktiv II macht die überzogene Forderung ausdrücklich hypothetisch, um sie sauber zurückzuweisen.' },
      { t: '; ein bewusst reduzierter Konsum wäre bereits ein wirksamer Schritt. ' },
      { t: 'Abschließend möchte ich betonen, dass ', layer: 'mittel',
        noteDe: 'Markiert den letzten Gedanken als besonders wichtig, statt das Fazit nur beiläufig anzuhängen.' },
      { t: 'Freiheit und Verantwortung sich hier keineswegs ausschließen.' }
    ]
  },
  {
    id: 'vorschlag',
    titleDe: 'Maßnahme bewerten & empfehlen',
    signalDe: '„Machen Sie einen Vorschlag / Was sollte geschehen …"',
    themaId: 'wt-autofreie-innenstadt',
    skeleton: [
      'Einstieg: Frage nennen, klare Meinung',
      'Vorteile: weniger Abgase, mehr Aufenthaltsqualität',
      'Gegenmeinung (Ältere, Lieferverkehr) + eigene Erfahrung mit dem Nahverkehr',
      'Vorschlag: ausgebauter Nahverkehr, Shuttle, Ausnahmefenster',
      'Fazit: mehr Nutzen als Ausschluss'
    ],
    segments: [
      { t: 'Seit einiger Zeit sorgt die Frage für Diskussionen, ob ', layer: 'mittel',
        noteDe: 'Markiert die Frage als andauernde öffentliche Debatte, bevor die eigene, klare Meinung im nächsten Satz folgt.' },
      { t: 'Innenstädte komplett autofrei werden sollten. ' },
      { t: 'Aus meiner Sicht überwiegen ganz klar die Vorteile, wenn ', layer: 'mittel',
        noteDe: '„Ganz klar" setzt die Position schon vor der Abwägung fest — passend zu einem Text, der auf eine konkrete Maßnahme zusteuert.' },
      { t: 'der motorisierte Verkehr aus den Zentren verschwindet. ' },
      { t: 'Hinzu kommt, dass ', layer: 'mittel',
        noteDe: 'Reiht ein zweites Argument an, statt das erste allein tragen zu lassen — verstärkt die Vorteilsseite vor der Gegenmeinung.' },
      { t: 'weniger Abgase und weniger Lärm die Aufenthaltsqualität für Fußgänger und Radfahrende spürbar ' },
      { t: 'verbessern würden', layer: 'struktur',
        noteDe: 'Konjunktiv II hält den erwarteten Effekt als plausible Erwartung fest, nicht als schon bewiesene Tatsache.' },
      { t: '. ' },
      { t: 'Natürlich lässt sich einwenden, dass ', layer: 'mittel',
        noteDe: 'Nimmt den stärksten Einwand vorweg, bevor der eigentliche Vorschlag ihn später konkret entkräftet.' },
      { t: 'ältere oder eingeschränkte Menschen sowie der Lieferverkehr auf Autos angewiesen bleiben, und dieser Einwand darf nicht einfach ' },
      { t: 'übergangen werden', layer: 'struktur',
        noteDe: 'Passiv betont, dass der Einwand nicht ignoriert werden darf — die handelnde Person tritt hinter die Forderung zurück.' },
      { t: '. ' },
      { t: 'Erst letzte Woche musste ich selbst erleben, dass ', layer: 'mittel',
        noteDe: 'Bindet Inhaltspunkt 3 an einen einzigen, datierten Moment aus der eigenen Stadt, statt eine allgemeine Beobachtung zu bleiben.' },
      { t: 'ich an der Haltestelle in der Königstraße fast eine halbe Stunde auf den Bus wartete, ' },
      { t: 'weil er dort nur alle zwanzig Minuten fährt', layer: 'struktur',
        noteDe: 'Kausalsatz liefert den konkreten Grund fürs Warten (die Taktzeit), statt die Erfahrung nur zu behaupten.' },
      { t: '. ' },
      { t: 'Genau deshalb ', layer: 'konnektor',
        noteDe: 'Zieht aus dem eben beobachteten Problem die Brücke zum kommenden Vorschlag — der Leser erwartet jetzt eine Lösung.' },
      { t: 'wäre es wichtig, dass die Verkehrswende nicht nur aus einem Verbot besteht. ' },
      { t: 'Als Alternative böte sich an, ', layer: 'mittel',
        noteDe: 'Führt hier den zentralen Vorschlag ein — den Kern dieses Beitragstyps, nicht nur eine beiläufige Idee.' },
      { t: 'den öffentlichen Nahverkehr deutlich auszubauen und kostenlose Shuttle-Busse einzuführen, ' },
      { t: 'die im Zehn-Minuten-Takt zwischen Stadtrand und Zentrum verkehren würden', layer: 'struktur',
        noteDe: 'Relativsatz mit Konjunktiv II macht den Vorschlag messbar (Takt), bleibt als Vorschlag aber erkennbar hypothetisch.' },
      { t: '. ' },
      { t: 'Für Handwerksbetriebe und Lieferdienste könnten ' },
      { t: 'zudem ', layer: 'konnektor',
        noteDe: 'Hängt eine zweite, eigenständige Maßnahme an die erste an, statt sie darin zu verstecken.' },
      { t: 'feste Zeitfenster eingerichtet werden, ' },
      { t: 'in denen die Innenstadt trotzdem befahren werden dürfte', layer: 'struktur',
        noteDe: 'Passiv im Konjunktiv II entkräftet direkt den Lieferverkehr-Einwand von oben, mit einer konkreten Ausnahmeregelung.' },
      { t: '. ' },
      { t: 'Auf diese Weise ', layer: 'konnektor',
        noteDe: 'Zieht das Fazit des Vorschlags, bevor der Satz explizit auf Inklusion und Lebensqualität zusteuert.' },
      { t: 'würde niemand ausgeschlossen', layer: 'struktur',
        noteDe: 'Passiv im Konjunktiv II rückt die Betroffenen statt der Maßnahme in den Fokus — niemand wird von der Regelung übersehen.' },
      { t: ', ' },
      { t: 'während ', layer: 'konnektor',
        noteDe: 'Stellt zwei positive Folgen des Vorschlags nebeneinander, ohne einen eigenen Satz für jede zu brauchen.' },
      { t: 'die Innenstadt insgesamt lebenswerter würde. ' },
      { t: 'Unter dem Strich spricht mehr dafür, dass ', layer: 'mittel',
        noteDe: 'Bilanz-Formel wiegt am Ende noch einmal ab, wie viele profitieren gegenüber wie wenigen ausgeschlossen bleiben.' },
      { t: 'eine gut geplante autofreie Zone mehr Menschen zugutekommt, ' },
      { t: 'als ', layer: 'konnektor',
        noteDe: 'Vergleichskonnektor macht die Kernaussage messbar: mehr Nutzen als Ausschluss, nicht nur „es ist gut".' },
      { t: 'sie ausschließt.' }
    ]
  }
]
