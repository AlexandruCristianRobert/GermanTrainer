//
// Schreiben — the Strategie pages' static content, one exported section list
// per exam part: Teil 1 (Forumsbeitrag) and Teil 2 (halbformelle Nachricht).
// See CONTEXT.md → "Forumsbeitrag", "Nachricht", "Schreibplan", "Inhaltspunkt",
// "Schreibmittel", "Nachrichtenmittel". Offline, hand-authored, never fetched
// from the network — concrete exam coaching, not generic writing advice.
//
// Each list's `bewertung` section names the actual criteria of its own rubric in
// src/data/rubrics.ts — SCHREIBEN_B2_TEIL1 (Erfüllung/Inhalt, Kohärenz &
// Textaufbau, Wortschatz, Strukturen) and SCHREIBEN_B2_TEIL2 (same four, but
// Wortschatz & Register), 25 points each, pass at 60 — so neither page drifts
// out of sync with what the grader actually rewards.

export interface TippSection {
  id: string
  titleDe: string
  items: { de: string; en?: string }[]
}

export const SCHREIBEN_TEIL1_TIPPS: TippSection[] = [
  {
    id: 'aufbau',
    titleDe: 'Aufbau des Forumsbeitrags',
    items: [
      { de: 'Fünf Bausteine in fester Reihenfolge: Thema aufgreifen → Meinung → Argumente mit Beispiel → Gegenmeinung einräumen → Fazit.', en: 'Five building blocks, fixed order.' },
      { de: 'Ein Absatz pro Inhaltspunkt — der Prüfer hakt die vier Punkte einzeln ab, mach sie ihm sichtbar.' },
      { de: 'Die Einleitung nennt das Thema, nie schon alle Argumente. Zwei Sätze reichen.' },
      { de: 'Das Fazit wiederholt die Meinung mit anderen Worten — kein neues Argument im letzten Satz.' },
      { de: 'Ein neuer Gedanke beginnt einen neuen Absatz — durchgehender Fließtext wirkt unstrukturiert, selbst wenn der Inhalt stimmt.' }
    ]
  },
  {
    id: 'zeit',
    titleDe: '50-Minuten-Budget',
    items: [
      { de: 'Grobe Aufteilung: 10 Minuten planen, 30 Minuten schreiben, 10 Minuten Korrektur lesen.', en: '10 to plan, 30 to write, 10 to check.' },
      { de: 'Plane, bevor du den ersten Satz schreibst — wer sofort loslegt, verzettelt sich meist beim dritten Inhaltspunkt.' },
      { de: 'Die Uhr läuft weiter, auch über 50 Minuten hinaus — das App-Limit ist weich, aber in der echten Prüfung fehlt dieser Puffer.' },
      { de: 'Reserviere die letzten Minuten gezielt für Verbstellung nach weil/deshalb, Artikel-Endungen und Kommas vor dass/weil.' },
      { de: 'Wird die Zeit knapp, kürze lieber das Fazit als einen ganzen Inhaltspunkt auszulassen — ein fehlender Punkt kostet mehr als ein knapper Schluss.' }
    ]
  },
  {
    id: 'wortzahl',
    titleDe: 'Wortzahl: Mindestlänge und Zielwert',
    items: [
      { de: 'Die Prüfung verlangt mindestens 150 Wörter — deutlich weniger senkt automatisch die Erfüllung, unabhängig vom Inhalt.', en: 'A hard 150-word floor.' },
      { de: 'Ziel sind etwa 180 Wörter: genug, um alle vier Inhaltspunkte mit je einem eigenen Gedanken auszuführen, ohne dass ein Absatz zu dünn bleibt.' },
      { de: 'Über 240 Wörter bringt keine Zusatzpunkte, kostet aber Zeit, die dann beim Korrekturlesen fehlt.' },
      { de: 'Der Zähler ist ein Warnsignal, kein Ziel für sich — behalte ihn im Blick, aber schreibe nicht auf eine Zahl hin.' }
    ]
  },
  {
    id: 'redemittel',
    titleDe: 'Schreibmittel gezielt einsetzen',
    items: [
      { de: 'Nutze zu jeder der sieben Beitragsfunktionen mindestens ein Schreibmittel — das ist der schnellste Weg zu variantenreichem Wortschatz.' },
      { de: 'Ein Schreibmittel pro Satzanfang reicht; dieselbe Formulierung im selben Beitrag zu wiederholen, wirkt eintönig.' },
      { de: 'Ein Schreibmittel ist ein Satzanfang, keine fertige Antwort — den eigentlichen Gedanken danach musst du selbst liefern.' },
      { de: 'Die Gegenmeinung braucht ihr eigenes Schreibmittel: ohne sie fehlt oft genau der Absatz, den die Erfüllung verlangt.' },
      { de: 'Die App zählt live, welche Beitragsfunktion du schon bedient hast — nutze das, um am Ende gezielt die fehlende nachzuholen.' }
    ]
  },
  {
    id: 'fehler',
    titleDe: 'Typische Fehlerquellen',
    items: [
      { de: 'Verbstellung nach weil/deshalb: Nach weil steht das Verb am Ende, nach deshalb direkt hinter dem Konnektor — ein häufiger, aber vermeidbarer Fehler.', en: 'Verb position after weil vs. deshalb.' },
      { de: 'Kommas vor dass, weil, obwohl sind im Deutschen zwingend — anders als im Englischen. Ohne Komma wirkt der Satz ungegliedert.' },
      { de: 'du/Sie-Mischung: Ein Forumsbeitrag ist meist neutral bis leicht formell — einmal festgelegt, das Register nicht mehr wechseln.' },
      { de: 'Zu mündlicher Ton: Wörter wie halt, irgendwie oder krass gehören nicht in einen Forumsbeitrag — dafür gibt es die Schreibmittel.' },
      { de: 'Direkte Übersetzungen aus dem Englischen wie „Ich denke, dass" statt „Meiner Meinung nach" wirken holprig, auch wenn sie grammatisch stimmen.' }
    ]
  },
  {
    id: 'bewertung',
    titleDe: 'Die vier Bewertungskriterien',
    items: [
      { de: 'Vier Kriterien zu je 25 Punkten — Erfüllung/Inhalt, Kohärenz & Textaufbau, Wortschatz, Strukturen — macht 100 Punkte, bestanden ab 60.', en: 'Four criteria, 25 points each, pass at 60.' },
      { de: 'Erfüllung/Inhalt belohnt, dass alle vier Inhaltspunkte mit einem eigenen Gedanken behandelt werden, nicht nur gestreift.' },
      { de: 'Kohärenz & Textaufbau belohnt einen roten Faden und passende Konnektoren wie deshalb, trotzdem oder einerseits/andererseits statt aneinandergereihter Sätze.' },
      { de: 'Wortschatz belohnt B2-typische, themenspezifische Wörter und die Schreibmittel des Argumentierens — Lücken zeigen sich in Wiederholungen oder zu mündlichem Ton.' },
      { de: 'Strukturen belohnt korrekte und variantenreiche Grammatik wie Nebensätze, Konjunktiv II für Vorschläge oder Passiv — Fehler wiegen schwerer, wenn sie das Verständnis stören.' }
    ]
  }
]

// Schreiben Teil 2 (halbformelle Nachricht). Same TippSection shape, its own
// six sections: what Teil 2 grades differently is the communicative frame, the
// Sie-register and the politeness grammar of requests — so `rahmen` and
// `hoeflichkeit` take the place of Teil 1's `aufbau` and `redemittel`, and the
// numbers (25 minutes, 100 words) are Teil 2's own.
export const SCHREIBEN_TEIL2_TIPPS: TippSection[] = [
  {
    id: 'rahmen',
    titleDe: 'Der Rahmen der Nachricht',
    items: [
      { de: 'Feste Reihenfolge: Betreff → Anrede → Bezug auf den Anlass → Anliegen → verbindlicher Abschluss → Grußformel → Name.', en: 'Fixed frame, top to bottom.' },
      { de: 'Nach der Anrede steht ein Komma — und die nächste Zeile beginnt klein: „Sehr geehrte Frau Kling, / vielen Dank für …".' },
      { de: 'Die Grußformel steht allein auf ihrer Zeile und bekommt kein Komma und keinen Punkt.' },
      { de: 'Der Betreff ist kein Satz: drei bis sechs Wörter, die das Anliegen nennen („Absage der Besprechung am Freitag").' },
      { de: 'Anrede und Grußformel gehören zusammen: „Sehr geehrte Frau …" verlangt „Mit freundlichen Grüßen", „Liebe Frau …" passt zu „Herzliche Grüße"; „Mit freundlichen Grüßen" passt ebenfalls.' }
    ]
  },
  {
    id: 'zeit',
    titleDe: '25-Minuten-Budget',
    items: [
      { de: 'Grobe Aufteilung: 5 Minuten planen, 15 Minuten schreiben, 5 Minuten Korrektur lesen.', en: '5 to plan, 15 to write, 5 to check.' },
      { de: 'Notiere vor dem ersten Satz zu jedem der vier Inhaltspunkte drei Stichwörter — zwei Minuten, die verhindern, dass ein Punkt hinten wegfällt.' },
      { de: 'Teil 2 ist die kürzere, nicht die leichtere Aufgabe: Betreff, Anrede und Grußformel kosten Zeilen, bevor der erste Inhaltspunkt überhaupt beginnt.' },
      { de: 'Die letzten Minuten gehören der Höflichkeit: Steht in jeder Bitte ein Konjunktiv II? Sind Sie, Ihnen und Ihr überall großgeschrieben?' },
      { de: 'Wird die Zeit knapp, kürze die Erklärung der Situation — Anrede, die vier Inhaltspunkte und die Grußformel dürfen nie fehlen.' }
    ]
  },
  {
    id: 'wortzahl',
    titleDe: 'Wortzahl: Mindestlänge und Zielwert',
    items: [
      { de: 'Die Aufgabe verlangt mindestens 100 Wörter — ein deutlich kürzerer Text senkt die Erfüllung, selbst wenn alle vier Inhaltspunkte vorkommen.', en: 'A hard 100-word floor.' },
      { de: 'Ziel sind etwa 120 Wörter: Anrede und Grußformel zählen mit, tragen aber inhaltlich nichts — für jeden Inhaltspunkt bleiben so zwei bis drei Sätze.' },
      { de: 'Über 160 Wörter bringt keine Zusatzpunkte, kostet aber die Zeit, die dann beim Korrekturlesen fehlt.' },
      { de: 'Eine Nachricht darf knapp sein: ein klar formulierter Gedanke pro Inhaltspunkt wirkt besser als aneinandergereihte Höflichkeitsfloskeln.' }
    ]
  },
  {
    id: 'hoeflichkeit',
    titleDe: 'Höflichkeit und Register',
    items: [
      { de: 'Jede Bitte im Konjunktiv II: „Könnten Sie …", „Wäre es möglich, dass …", „Ich wäre Ihnen sehr dankbar, wenn …" — der Indikativ klingt fordernd.', en: 'Konjunktiv II is the politeness engine.' },
      { de: 'Weichmacher einbauen: leider, gern, eventuell, vielleicht — sie nehmen einer Absage oder Beschwerde die Schärfe, ohne die Aussage zu verwässern.' },
      { de: 'Kein Imperativ an Vorgesetzte: aus „Schicken Sie mir die Unterlagen" wird „Könnten Sie mir die Unterlagen bitte schicken?"' },
      { de: 'Auch eine Beschwerde bleibt sachlich: beschreibe die Folgen („dadurch entstehen längere Wartezeiten") statt Vorwürfe zu erheben („Sie haben das vergessen").' },
      { de: 'Der Abschluss ist verbindlich, nicht unterwürfig: um eine Rückmeldung bitten oder den nächsten Schritt zusagen — und sich nicht ein zweites Mal entschuldigen.' }
    ]
  },
  {
    id: 'fehler',
    titleDe: 'Typische Fehlerquellen',
    items: [
      { de: 'du/Sie-Mischung: Eine halbformelle Nachricht ist durchgehend Sie — ein einziges „dein" bricht das Register des ganzen Textes.', en: 'One du-form breaks the whole register.' },
      { de: 'Die Höflichkeitsform Sie, Ihnen, Ihr und Ihre schreibt man im ganzen Text groß; das „ich" nach dem Komma der Anrede dagegen klein.' },
      { de: 'Das Komma nach der Anrede ist Pflicht — ein Ausrufezeichen dort ist veraltet, und ein Doppelpunkt ist Englisch.' },
      { de: 'Abkürzungen wie LG, MfG oder VG und Smileys gehören nicht in eine Prüfungsnachricht: die Grußformel wird immer ausgeschrieben.' },
      { de: 'Der Betreff fehlt häufiger als jeder andere Baustein — und er ist das Erste, was der Prüfer sucht.' }
    ]
  },
  {
    id: 'bewertung',
    titleDe: 'Die vier Bewertungskriterien',
    items: [
      { de: 'Vier Kriterien zu je 25 Punkten — Erfüllung/Inhalt, Kohärenz & Textaufbau, Wortschatz & Register, Strukturen — macht 100 Punkte, bestanden ab 60.', en: 'Four criteria, 25 points each, pass at 60.' },
      { de: 'Erfüllung/Inhalt belohnt, dass alle vier Inhaltspunkte mit je einem eigenen Gedanken behandelt werden — und dass der Nachrichtenrahmen erkennbar ist: Betreff, Anrede, Grußformel mit Namen.' },
      { de: 'Kohärenz & Textaufbau belohnt den Bogen von Bezug über Situation und Anliegen bis zum verbindlichen Abschluss, verbunden mit deshalb, daher, dennoch, außerdem.' },
      { de: 'Wortschatz & Register belohnt durchgehendes Sie und die Wendungen des Bittens, Entschuldigens und Vorschlagens — Registerbrüche kosten hier am meisten.' },
      { de: 'Strukturen belohnt Konjunktiv II für höfliche Bitten, Nebensätze, indirekte Fragen, das Komma nach der Anrede und die Kommas um Einschübe.' }
    ]
  }
]
