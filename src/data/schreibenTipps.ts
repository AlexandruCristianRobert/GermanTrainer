//
// Schreiben Teil 1 (Forumsbeitrag) — the Strategie page's static content.
// See CONTEXT.md → "Forumsbeitrag", "Schreibplan", "Inhaltspunkt",
// "Schreibmittel". Offline, hand-authored, never fetched from the network —
// concrete exam coaching, not generic writing advice.
//
// The `bewertung` section names the actual criteria from
// SCHREIBEN_B2_TEIL1 (src/data/rubrics.ts): Erfüllung/Inhalt, Kohärenz &
// Textaufbau, Wortschatz, Strukturen, 25 points each, pass at 60 — so this
// page never drifts out of sync with what the grader actually rewards.

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
