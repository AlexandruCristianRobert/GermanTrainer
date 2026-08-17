// Version format: X.YY.ZZ
//   X  — major redesign (rarely changes)
//   YY — a new module added
//   ZZ — regular improvements / fixes
//
// Bump rule: prepend the new entry to CHANGELOG, set APP_VERSION to its version.

export const APP_VERSION = '1.21.00'

export type ChangelogKind = 'major' | 'module' | 'polish' | 'fix'

export interface ChangelogEntry {
  version: string
  date: string         // YYYY-MM-DD
  kind: ChangelogKind
  title: string
  notes: string[]      // supports inline HTML like <code> + <em>
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.21.00', date: '2026-08-17', kind: 'module',
    title: 'Schreiben · Teil 2 Nachricht',
    notes: [
      '<strong>Die schriftliche Prüfung ist komplett: Teil 2, die halbformelle Nachricht.</strong> Ein <em>Schreibauftrag</em> wie im Prüfungsheft: eine Situation aus Arbeit oder Kurs, ein Empfänger mit Name und Rolle, vier <em>Inhaltspunkte</em> — und mindestens 100 Wörter. 20 Aufträge sind eingebaut, in fünf Anlass-Gruppen von <em>Entschuldigung & Absage</em> bis <em>Dank & Rückmeldung</em>; die KI erzeugt auf Wunsch weitere. Eine weiche 25-Minuten-Uhr zeigt die drei Phasen <em>planen · schreiben · prüfen</em> an, bricht aber nie ab — und die Nachricht lässt sich jederzeit unterbrechen und fortsetzen.',
      '<strong>Der feste Rahmen wird trainiert, nicht vorgeschrieben.</strong> Das <em>Rahmen-Gerüst</em> gliedert die Sitzung in vier Felder — Betreff, Anrede, Text, Gruß & Name — oder man schreibt frei in ein Feld, wie in der Prüfung; vorgeschrieben ist nichts, jede Anrede samt Komma sind die eigenen Worte. Der <em>Gerüst-Check</em> hakt sechs Punkte live ab (Betreff da? Anrede an die richtige Person? Grußformel ohne Punkt?), und der <em>Radar</em> warnt beim Tippen vor du-Formen, Umgangssprache und Bitten ohne Konjunktiv II.',
      '<strong>Die Hilfen kennen den Anlass.</strong> 40 <em>Nachrichtenmittel</em> unter acht Funktionen — der Drawer zeigt zuerst die zum Anlass passenden, und der <em>„Diesmal: …"</em>-Stups schlägt nie eine Funktion vor, die zum Auftrag nicht passt (keine Entschuldigung in einer Danknachricht). Anrede und Grußformel kommen als zusammengehörige Paare per Klick. Der <em>Inhalts-Baukasten</em> liefert je Auftrag Gründe, Lösungen und Textwortschatz — offline für jeden Anlass, auf Wunsch von der KI für den konkreten Auftrag verfeinert. Der Spickzettel hat jetzt einen Teil-1/2-Umschalter.',
      '<strong>Fünf Musternachrichten zum Sezieren.</strong> Eine pro Anlass, jede mit vier einblendbaren Schichten: <em>Konnektoren</em>, <em>Nachrichtenmittel & Züge</em>, <em>grammatische Strukturen</em>, <em>Höflichkeit</em>. Aus der Planung und dem Ergebnis führt je ein Link zur Musternachricht des eigenen Anlasses — erst schreiben, dann am Modell nachlesen.',
      '<strong>Bewertet wie im Zeugnis, archiviert wie gewohnt.</strong> Dieselben vier offiziellen Kriterien zu je 25 Punkten, jeder Inhaltspunkt mit eigenem Urteil, Aufwertungen für das, was <em>nicht falsch</em> war. Die Fehler wandern ins gemeinsame Fehlerarchiv — Vortrag, Diskussion, Forumsbeitrag und Nachricht schreiben jetzt zu viert hinein, der Korrekturdrill mischt alle. Der Text selbst wird nach der Bewertung verworfen.'
    ]
  },
  {
    version: '1.20.08', date: '2026-08-14', kind: 'polish',
    title: 'Sätze · Tagesziel 100 & echte Verben im Hover',
    notes: [
      '<strong>Tagesziel: 100 Fachgebiet-Sätze pro Tag.</strong> Unten rechts sitzt jetzt eine kleine Plakette — <em>Fachgebiete · heute · 57 / 100</em> — auf jeder Seite sichtbar, aber dezent. Jede bewertete Karte mit Fachgebiet zählt, in beiden Richtungen und auch in Übungsrunden. Um Mitternacht (Ortszeit) beginnt der Zähler neu; bei 100 wird er grün mit Haken, und ein Klick führt direkt zur Satz-Einrichtung.',
      '<strong>Der Wort-Hover zeigt jetzt das Verb, das wirklich im Satz steht.</strong> Die Kartenprüfung kontrollierte Präpositionen, da-Komposita und Konnektoren — aber nie die Verben: schrieb die KI ein Synonym, zeigte der Hover trotzdem das bestellte Verb. Jetzt wird jede Karte verworfen, deren Deutsch das geforderte Verb in keiner Form enthält (konjugiert, Partizip, getrennte Vorsilbe wie <em>hört … zu</em>), und der Hover nennt zusätzlich die tatsächliche Form im Satz: <em>im Text: hat geholfen</em>.'
    ]
  },
  {
    version: '1.20.07', date: '2026-08-14', kind: 'polish',
    title: 'Dativ · Zwillingspaare 500 & Freier Dativ erklärt',
    notes: [
      '<strong>Der Zwillings-Drill hat jetzt 500 Karten.</strong> Aus 24 Übungssätzen wurden 500, verteilt über alle Niveaus von A2 bis C1 — Fragen, Perfekt, Präteritum, Modalverben und Nebensätze, damit dieselbe Kasusgrenze in immer neuen Kleidern erscheint.',
      '<strong>Sechs neue Zwillingspaare.</strong> <em>ausweichen | vermeiden</em>, <em>dienen | bedienen</em>, <em>gefallen | mögen</em>, <em>zuschauen | beobachten</em>, <em>schaden | verletzen</em> und <em>zustimmen | akzeptieren</em> — vierzehn Paare insgesamt, alle auch in der Zwillingstabelle des Spickzettels.',
      '<strong>Der Freie Dativ erklärt sich jetzt selbst.</strong> Die Einstellungsseite sagt vor dem Start, was zu tun ist: die Weglass-Probe für <em>Weglassbar?</em> und die drei Lesarten — <em>Vorteil (commodi)</em>, <em>Besitz (possessivus)</em>, <em>Anteilnahme (ethicus)</em> — für <em>Welche Lesart?</em>, jede mit Beispielsatz.'
    ]
  },
  {
    version: '1.20.06', date: '2026-08-13', kind: 'fix',
    title: 'Dativ · Antwortreihenfolge gemischt',
    notes: [
      '<strong>Die richtige Antwort stand fast immer auf Knopf 1.</strong> In sieben Dativ-Drills — <em>Wer ist Subjekt?</em>, <em>Zwillingspaare</em>, <em>Welches Objekt?</em>, <em>Dativ-Adjektive</em>, <em>Freier Dativ</em>, <em>Kein persönliches Passiv</em> und <em>Reflexiver Dativ</em> — kamen die Antwort-Buttons in der Reihenfolge der Datenbank, und dort steht die richtige Antwort zuerst. Die Optionen werden jetzt beim Kartenbau gemischt, wie es die <em>Objektfolge</em> von Anfang an tat.'
    ]
  },
  {
    version: '1.20.05', date: '2026-08-13', kind: 'polish',
    title: 'Sätze · Fachgebiete: Tier 1 komplett',
    notes: [
      '<strong>Der Big-Pharma-Katalog ist vollständig.</strong> Elf neue Fachgebiete: <em>Async & Nebenläufigkeit</em>, <em>Web-APIs & Integration</em>, <em>Testing & Codequalität</em>, <em>Architektur & Design</em> und <em>Legacy & Modernisierung</em> vervollständigen die Technik-Rubrik; dazu <em>Agile & ITIL</em> und <em>Motivation & Firmenwahl</em>.',
      '<strong>Verhaltensfragen erzählen jetzt.</strong> Vier Fachgebiete — <em>Stakeholder & Kommunikation</em>, <em>Globale Teamarbeit</em>, <em>Konflikt & Druck</em>, <em>Ownership & Problemlösung</em> — nutzen die erzählende Darstellungsform: kurze STAR-Episoden in der ersten Person, Perfekt und Präteritum inklusive. So übt man die Sätze, aus denen Interview-Geschichten bestehen.',
      '<strong>Neues Vokabular für Beruf und Bewerbung.</strong> Wörter wie <em>die Meinungsverschiedenheit</em>, <em>der Termindruck</em>, <em>der Wissenstransfer</em> und <em>die Aufwandsschätzung</em> stehen jetzt in den Themengruppen Work und Programming — auch für alle Nomen-Drills.'
    ]
  },
  {
    version: '1.20.04', date: '2026-08-13', kind: 'polish',
    title: 'Sätze · Fachgebiete: Big Pharma IT (Tier 1)',
    notes: [
      '<strong>Ein Katalog fürs Pharma-Interview.</strong> Das Fachgebiet im Satz-Quiz ist jetzt ein Katalog mit Rubriken — <em>Technik & .NET</em>, <em>Regulierte Industrie</em>, <em>HR-Gespräch</em>. Acht neue Pharma-Fachgebiete von GxP über Computersystemvalidierung, Audit-Trail und Datenintegrität bis zur Wertschöpfungskette, dazu die HR-Runde mit Gehaltsvorstellung, Kündigungsfrist und Aufenthaltsbewilligung.',
      '<strong>Nicht alles ist eine Definition.</strong> Jedes Fachgebiet hat eine Darstellungsform: <em>erklärend</em> wie im Fachgespräch, <em>erzählend</em> als kurze STAR-Episode, <em>persönlich</em> wie in der HR-Runde — die Karten sprechen so, wie das Interview es verlangt.',
      '<strong>Neue Themengruppe Pharma.</strong> Über 80 neue Nomen — <em>die Charge</em>, <em>der Prüfpfad</em>, <em>die Standardarbeitsanweisung</em> — stehen auch allen Nomen-Drills zur Verfügung; dazu Schweiz-Vokabular wie <em>das Arbeitspensum</em> und <em>die Pensionskasse</em>.',
      '<strong>Die drei bestehenden Fachgebiete sind gewachsen.</strong> <em>C# & .NET</em>, <em>Datenzugriff & SQL</em> und <em>DevOps & Betrieb</em> decken jetzt auch LINQ, Migrationen, CI/CD-Pipelines und Ursachenanalysen ab.'
    ]
  },
  {
    version: '1.20.03', date: '2026-08-12', kind: 'polish',
    title: 'Schreiben · Aufgabenmuster am Thema',
    notes: [
      '<strong>Jedes eingebaute Schreibthema zeigt jetzt sein Aufgabenmuster.</strong> Ob <em>Pro & Contra abwägen</em>, <em>Meinung + Alternative vorschlagen</em> oder <em>Gegenmeinung entkräften</em> — die Kategorie steht direkt am Aufgabenblatt, in der Themenliste und über dem Schreibplan. So ist vor dem ersten Wort klar, welche Textform die Aufgabe verlangt — und welcher Mustertext dazu passt.'
    ]
  },
  {
    version: '1.20.02', date: '2026-08-12', kind: 'polish',
    title: 'Schreiben · Mustertexte',
    notes: [
      '<strong>Fünf Aufgabenmuster, fünf kommentierte Mustertexte.</strong> Die 24 Schreibthemen folgen wiederkehrenden Mustern — <em>Pro & Contra abwägen</em>, <em>Meinung + Alternative</em>, <em>eigene Erfahrung als Beleg</em>, <em>Gegenmeinung entkräften</em>, <em>Maßnahme bewerten & empfehlen</em>. Für jedes Muster gibt es jetzt einen prüfungsreifen Beispiel-Forumsbeitrag unter <em>Mustertexte</em>.',
      '<strong>Sichtbar, was den Text gut macht.</strong> Drei einblendbare Ebenen markieren Konnektoren, Schreibmittel und grammatische Strukturen direkt im Text — und jede Markierung erklärt beim Antippen, <em>warum</em> das Mittel genau an dieser Stelle wirkt: der zweiteilige Konnektor, der die Abwägung ankündigt, der Konjunktiv II, der den Vorschlag höflich hält, der Nebensatz, der die Begründung trägt.',
      '<strong>Vom Aufgabenblatt direkt zum Muster.</strong> Jedes eingebaute Schreibthema kennt sein Aufgabenmuster: Themenwahl und Schreibplan verlinken den passenden Mustertext, dazu Kacheln auf der Schreiben-Übersicht und im Spickzettel.',
      '<strong>Der Schreibplan meckert nicht mehr beim Tippen.</strong> Die Stichwort-Warnung erscheint erst, wenn man das Feld verlässt — und sitzt jetzt direkt unter dem Eingabefeld statt verloren zwischen den Zeilen.'
    ]
  },
  {
    version: '1.20.01', date: '2026-08-12', kind: 'polish',
    title: 'Navigation · Gruppierte Leiste',
    notes: [
      '<strong>Die obere Leiste ist aufgeräumt.</strong> Statt dreizehn nebeneinandergedrängter Links gibt es vier Gruppen mit Aufklappmenü — <em>Wörter</em> (Nouns, Adjectives, Declension), <em>Verben</em> (Verbs, Dativ, Konjunktiv I, Passiv), <em>Kleine Wörter</em> (Prepositions, Da-Compounds, Direction Words) und <em>Prüfung</em> (Sprechen, Schreiben, Writing tutor, Mock C1) — daneben <em>Sätze</em> und <em>History</em> als direkte Links und ein Zahnrad für die Einstellungen.',
      '<strong>Endlich sind alle Module erreichbar.</strong> Konjunktiv I, Passiv, der Writing tutor, die C1-Simulation und das neue Schreiben-Kapitel fehlten in der Leiste komplett — sie hatten nur eine Kachel auf der Startseite. Ein neuer Test wacht darüber: jede Route der App muss von der Navigation aus erreichbar sein, sonst schlägt der Build fehl.',
      '<strong>Auch das Handy-Menü ist gruppiert.</strong> Die Schublade zeigt dieselben vier Gruppen mit Überschriften und den deutschen Untertiteln — nichts muss mehr gesucht werden.'
    ]
  },
  {
    version: '1.20.00', date: '2026-08-12', kind: 'module',
    title: 'Schreiben · Kapitel XIV',
    notes: [
      '<strong>Ein neues Kapitel für Schreiben Teil 1 der B2-Prüfung.</strong> Ein <em>Schreibthema</em> wie im Prüfungsheft: ein Forumsthread, die Aufgabe, vier <em>Inhaltspunkte</em> — und mindestens 150 Wörter. 24 Themen sind eingebaut, von <em>Homeoffice</em> bis <em>Fast Fashion</em>; die KI erzeugt auf Wunsch weitere. Geschrieben wird in einer Sitzung: Wortzähler gegen die 150er-Grenze, eine weiche 50-Minuten-Uhr, die anzeigt, aber nie abbricht — und der Text lässt sich jederzeit unterbrechen und fortsetzen.',
      '<strong>Erst planen, dann schreiben.</strong> Vor der Sitzung ein <em>Schreibplan</em>: ein Stichwort je Inhaltspunkt, das die Sitzung live abhakt, sobald es im Text auftaucht. Dazu eine Argumentbank in Schriftsprache — Pro, Contra, Themenwortschatz — für jedes Thema, offline aus zehn Fachfeldern, auf Wunsch von der KI fürs konkrete Thema verfeinert.',
      '<strong>35 Schreibmittel unter sieben Beitragsfunktionen.</strong> Thema aufgreifen, Meinung äußern, begründen, Beispiel geben, Gegenmeinung einräumen, Alternative vorschlagen, Fazit ziehen — als Drawer in der Sitzung (ein Klick fügt die Wendung ein) und als eigener Spickzettel-Tab. Die App zählt mit, welche Wendungen wirklich im Text landen, und stupst mit <em>„Diesmal: …"</em> die Funktion an, die noch fehlt. Ein Strategie-Tab bündelt die Prüfungstipps: Aufbau, Zeiteinteilung, Wortzahl, typische Fehler, Bewertungskriterien.',
      '<strong>Bewertet wie im Zeugnis.</strong> Die vier offiziellen Kriterien — Erfüllung, Kohärenz, Wortschatz, Strukturen — zu je 25 Punkten, mit Prädikat von <em>sehr gut</em> bis <em>nicht bestanden</em>. Jeder Inhaltspunkt bekommt sein eigenes Urteil, jeder Fehler eine Erklärung, und was <em>nicht falsch</em> war, aber besser ginge, erscheint als Aufwertung daneben.',
      '<strong>Fehler wandern ins gemeinsame Archiv.</strong> Vortrag, Diskussion und jetzt Forumsbeitrag schreiben ins selbe Fehlerarchiv — der Korrekturdrill mischt alle drei, und das Archiv lässt sich nach Modul filtern. Der Aufsatz selbst wird nach der Bewertung verworfen: was bleibt, sind Ergebnis, Korrekturen und Aufwertungen.'
    ]
  },
  {
    version: '1.19.02', date: '2026-08-12', kind: 'polish',
    title: 'Satz · Fachgebiete',
    notes: [
      '<strong>Sätze über die eigene Arbeit.</strong> Kapitel XII lässt sich jetzt auf ein <em>Fachgebiet</em> richten — <em>.NET</em>, <em>SQL Server</em> oder <em>Docker</em>. Die KI schreibt die Karte dann in dieser Welt: eine Bereitstellung, die nachts um drei schiefgeht, eine Abfrage, die plötzlich langsam ist, ein Container, der immer wieder neu startet. Mehrere Fachgebiete gleichzeitig sind erlaubt — jede Karte spielt aber in <em>genau einem</em>, damit sie in sich stimmig bleibt.',
      '<strong>Die Nomen kommen aus dem Fachgebiet.</strong> Solange eines gewählt ist, ersetzt seine Wortliste die Themengruppen: <em>der Container</em>, <em>das Abbild</em>, <em>die Bereitstellung</em>, <em>die Abfrage</em>, <em>der Primärschlüssel</em>, <em>die Vererbung</em>. 29 neue Wörter sind dafür in den Nomen-Speicher gewandert — <em>die Orchestrierung</em>, <em>der Mikrodienst</em>, <em>der Ausführungsplan</em>, <em>die Sicht</em> und weitere. Sie stehen auch allen anderen Übungen zur Verfügung, nicht nur dieser.',
      '<strong>Die Verben werden bevorzugt, nicht beschränkt.</strong> Ein Fachgebiet zieht seine Verben zuerst (<em>bereitstellen, ausführen, speichern, überwachen</em>), aber der Verbpool bleibt vollständig offen — keine Karte scheitert daran, dass ein passendes Verb fehlt. Typ und Rektion filtern dann nicht mehr; das Niveau bleibt und bestimmt nur noch, wie schwer der Text selbst sein soll.',
      '<strong>Die Sprache ist die, die man im Job hört.</strong> Anglizismen, wo sie das normale Wort sind (<em>der Container</em>, <em>das Repository</em>, <em>der Commit</em>), Deutsch, wo Deutsch das normale Wort ist (<em>die Bereitstellung</em>, <em>die Abfrage</em>, <em>der Fremdschlüssel</em>). Ohne Fachgebiet bleibt alles, wie es war.'
    ]
  },
  {
    version: '1.19.01', date: '2026-08-11', kind: 'fix',
    title: 'Dativ · Enter-Taste und mehr Sätze',
    notes: [
      '<strong>Die Enter-Taste verschluckt keine Karte mehr.</strong> In <em>IV · Produktion</em> sprang ein Enter zur nächsten Karte — und beim <em>Loslassen</em> derselben Taste wurde die frische Karte sofort leer abgeschickt. Ursache: das Weiterblättern hängt am Tastendruck, das Abschicken hing am Loslassen, und dazwischen wechselt der Fokus vom Knopf zurück ins Eingabefeld. Beide Hälften eines Tastendrucks gehören jetzt zum selben Element.',
      '<strong>Enter auf einem leeren Feld tut gar nichts mehr.</strong> Wer nichts eingetippt hat, verliert die Karte nicht durch einen versehentlichen Tastendruck. Wer die Lösung sehen will, klickt bewusst auf <em>Submit</em> — dieser Weg bleibt unverändert.',
      '<strong>Deutlich mehr Sätze in den Kapiteln I bis IV.</strong> <em>Verb → Dativobjekt</em> 34 → 60 Sätze und deckt jetzt <em>alle</em> 44 Dativverben ab (zehn hatten vorher keinen einzigen Satz: <em>misslingen, auffallen, passieren, leidtun, guttun, entgehen, zusehen, zuschauen, beistehen, unterliegen</em>). <em>Fallen-Karten</em> 22 → 45 und deckt alle 23 Verben mit englischem Sog ab. <em>Wer ist Subjekt?</em> 25 → 52, <em>Produktion</em> 22 → 45 mit fünf Sätzen pro Verb. Bei <em>Dativ oder Akkusativ?</em> gibt es 16 neue Akkusativ-Verben zum Gegenhalten (20 → 36).'
    ]
  },
  {
    version: '1.19.00', date: '2026-08-11', kind: 'module',
    title: 'Dativ · Kapitel XIII',
    notes: [
      '<strong>Ein neues Kapitel für den ganzen Dativ — dreizehn Übungen in zehn Familien, dazu ein Spickzettel.</strong> Die Leitidee: der Dativ markiert einen <em>betroffenen Menschen</em>. Viele Dativverben haben dabei ein verschlucktes Akkusativobjekt — <em>antworten</em> = [eine Antwort] geben, <em>danken</em> = [einen Dank] geben. Deshalb bleibt der Mensch im Dativ übrig. Jede verfehlte Karte erklärt genau diesen Zusammenhang, statt nur <em>falsch</em> zu sagen.',
      '<strong>Ein Verzeichnis statt einer Prozentzahl.</strong> Anders als bei Präpositionen ist der Dativ eine <em>geschlossene</em> Liste: 44 Verben und 16 Adjektive, die man wirklich auswendig können muss. Das Kapitel führt Buch über jeden einzelnen Eintrag — <em>gesichert</em> heißt: die letzten drei Begegnungen alle richtig. Ein Fehler stuft zurück auf <em>wackelig</em>. Der Zähler vergisst nichts, auch wenn wochenlang etwas anderes geübt wird.',
      '<strong>Der englische Sog.</strong> <em>help, thank, follow, answer, trust, congratulate</em> — im Englischen ein schlichtes Objekt, im Deutschen Dativ. Eine eigene Übung nur für diese Fallen, weil sie den größten Ertrag bringen.',
      '<strong>Umgekehrte Verben.</strong> Bei <em>gefallen, schmecken, fehlen, gehören, passen, wehtun, einfallen, gelingen</em> ist die <em>Sache</em> das Subjekt und bestimmt die Verbform: <em>Die Schuhe gefallen mir</em> — nicht <em>gefällt</em>, und niemals <em>*Ich gefalle das Buch</em>. Zwei Übungen dafür: eine fürs Subjekt, eine fürs Selberbauen.',
      '<strong>Zwillinge und zwei Objekte.</strong> <em>antworten</em> oder <em>beantworten</em>? <em>folgen</em> oder <em>verfolgen</em>? <em>zuhören</em> oder <em>hören</em>? Acht Paare, bei denen die Vorsilbe den Kasus umlegt. Dazu die Objektfolge: <em>Ich gebe dem Kind das Buch</em>, aber <em>Ich gebe es ihm</em> — bei zwei Pronomen kommt der Akkusativ zuerst.',
      '<strong>Und was daraus folgt.</strong> Dativverben haben kein persönliches Passiv: <em>Mir wird geholfen</em>, nie <em>*Ich werde geholfen</em>. Der freie Dativ (<em>Wasch dir die Hände</em>) lässt sich weglassen, das Objekt eines Dativverbs nicht — daran erkennt man den Unterschied. Der reflexive Dativ kippt, sobald ein Akkusativobjekt dasteht: <em>ich wasche mich</em>, aber <em>ich wasche mir die Hände</em>. Eine KI-Übung übersetzt ganze Sätze und benennt Kasusfehler einzeln.',
      '<strong>Der Verbpool ist um 29 Verben gewachsen</strong> — <em>danken, zuhören, gratulieren, begegnen, passieren, wehtun, raten, verzeihen, widersprechen, ähneln</em> und weitere, alle mit vollen Stammformen. Davon profitieren auch Übersetzung, Konjugation und Rektion, nicht nur das neue Kapitel. Dativ-Präpositionen und die Dativ-Endungen bleiben, wo sie hingehören: bei Präpositionen und Deklination — der Spickzettel verlinkt dorthin, statt sie zu wiederholen.'
    ]
  },
  {
    version: '1.18.09', date: '2026-08-10', kind: 'fix',
    title: 'Sprechen · Bewertung neu kalibriert',
    notes: [
      '<strong>Die Wortzahl zählt nicht mehr mit.</strong> Getippte Vorträge wurden bisher am Umfang gemessen (360 Wörter ≈ 4 Minuten) — ein vollständiger, kompakter Vortrag verlor Punkte fürs Kürzersein. Jetzt ist der Umfang für die Note egal, solange mindestens 200 Wörter dastehen; erst darunter kostet es Punkte, und nur bei <em>Erfüllung</em>. Die Warnung beim Beenden erscheint entsprechend erst unter 200 Wörtern.',
      '<strong>Tippfehler kosten keine Punkte mehr.</strong> Die echte Prüfung ist mündlich — Rechtschreibung wird dort nicht bewertet. Tippfehler werden weiterhin angestrichen und erklärt, senken aber keine Kriteriumsnote. Gilt in Teil 1 und Teil 2.',
      '<strong>Die Notenbänder haben keine Lücke mehr.</strong> Die Anker sprangen bisher von 24–25 direkt auf 18–19 — ein sehr guter Vortrag mit zwei kleinen Schnitzern landete rechnerisch bei ~76. Jetzt sind die Bänder lückenlos (23–25 / 18–22 / 12–17 / 5–11), und die Prüferin ist ausdrücklich kalibriert: alle fünf Punkte behandelt, klar gegliedert, nur vereinzelte kleine Fehler → 90+. Im Zweifel gibt es die höhere Note, in Teil 1 wie in Teil 2.'
    ]
  },
  {
    version: '1.18.08', date: '2026-08-09', kind: 'fix',
    title: 'Satz (KI) · Strg+R statt Alt+R',
    notes: [
      '<strong>Das Zeitform-Schild klappt jetzt mit <em>Strg+R</em> um.</strong> <em>Alt+R</em> war auf manchen Tastaturen umständlich zu treffen. Maus und Klick funktionieren unverändert.',
      '<strong>Solange eine Karte mit Zeitform offen ist, lädt <em>Strg+R</em> die Seite nicht neu</strong> — die Tastenkombination gehört jetzt dem Schild. Auf dem Mac bleibt <em>Cmd+R</em> das Neuladen.'
    ]
  },
  {
    version: '1.18.07', date: '2026-08-09', kind: 'polish',
    title: 'Satz · jedes Verb, jeder Plural',
    notes: [
      '<strong>Jetzt ist jedes Verb markiert.</strong> Unterstrichen waren bisher nur die Verben, die die Karte abfragt — <em>müssen</em>, <em>sein</em>, <em>regnen</em> standen daneben blank da, obwohl du sie genauso mitschreiben musst. Jetzt trägt jedes Verb im englischen Satz seinen Strich und nennt den deutschen Infinitiv, Hilfs- und Modalverben eingeschlossen. Die abgefragten bleiben kräftiger unterstrichen als die beiläufigen: gewertet wird weiterhin nur, was die Karte verlangt.',
      '<strong>Nomen nennen ihren Plural.</strong> Der Hinweis zeigte bisher <em>der Tisch</em> und ließ dich beim Plural raten. Jetzt steht die ganze Zeile da — <em>der Tisch – die Tische (der Tische)</em>: Singular, Plural, Genitiv Plural. Nomen ohne Plural (<em>die Milch</em>) bleiben wie sie waren. Gilt für abgefragte wie beiläufige Nomen.',
      '<strong>Ein Plural wird nur einmal gefragt.</strong> Beim ersten Auftauchen liefert ihn die KI, danach steht er bei dem Nomen in deiner Wortliste und wird von dort gelesen. Was einmal gespeichert ist, gilt — deine Liste wird mit jeder Runde ein Stück vollständiger.',
      '<strong>Enter reicht ein.</strong> Enter machte hier eine neue Zeile, und nur <em>Strg+Enter</em> gab ab — auf einer Karte mit einem einzigen Satz eine Handbewegung zu viel. Jetzt reicht Enter ein und blättert nach der Bewertung weiter; für eine neue Zeile ist <em>Umschalt+Enter</em> da. <em>Strg+Enter</em> funktioniert wie gehabt.'
    ]
  },
  {
    version: '1.18.06', date: '2026-08-09', kind: 'polish',
    title: 'Satz (KI) · die Zeitform zeigt ihre Bildung',
    notes: [
      '<strong>Das grüne Zeitform-Schild klappt um.</strong> Über dem englischen Satz stand bisher nur der Name der geforderten Form — <em>Passiv Präsens</em>, mehr nicht. Wer im Moment nicht mehr wusste, wie diese Form gebaut wird, kam ohne Umweg über das Cheatsheet nicht weiter. Mit der Maus darüber, ein Klick oder <em>Alt+R</em> dreht das Schild um: <em>wird + Partizip II</em>. Nochmal, und der Name steht wieder da.',
      '<strong>Mit dem Verb deines Satzes, nicht mit irgendeinem.</strong> Neben der Formel steht die Form, die genau dieser Satz braucht — <em>wird gesucht</em>, <em>ist gekauft worden</em>, <em>steht auf</em>. Unregelmäßige Partizipien und trennbare Vorsilben stehen damit fertig da, statt selbst zusammengesucht zu werden. Stecken zwei Verben im Satz, zeigt das Schild beide.',
      '<strong>Alle fünfzehn Zeitformen, nicht nur das Passiv.</strong> Perfekt zeigt <em>haben/sein + Partizip II</em>, Futur I <em>wird + Infinitiv</em>, Plusquamperfekt <em>hatte/war + Partizip II</em> — auch Präsens und Präteritum nennen ihre Regel.',
      '<strong>Alt+R, nicht Umschalt+R.</strong> Hier tippst du Deutsch, und eine Umschalt-Kombination hätte dir das große R in <em>Regen</em> weggeschluckt. Alt+R greift auch mitten im Tippen, ohne dem Satz ein Zeichen zu nehmen. Wie die Wort-Hinweise klappt das Schild bei jedem neuen Satz wieder zu.'
    ]
  },
  {
    version: '1.18.05', date: '2026-08-07', kind: 'polish',
    title: 'Satz · Hinweise sagen mehr',
    notes: [
      '<strong>Da-Komposita nennen ihr Wort.</strong> Der Hinweis über einem da-Kompositum zeigte bisher nur <em>darauf</em> — und verschwieg, welches Verb, Nomen oder Adjektiv die Präposition überhaupt verlangt. Jetzt steht die Kollokation darunter: <em>darauf</em> · <em>warten auf + Akk</em>. Auch in der Auswertung.',
      '<strong>Konnektoren zeigen Satzart und Position.</strong> Zwei Schilder am Hinweis: <em>HZ</em> in Grün für den Hauptsatz, <em>NZ</em> in Blau für den Nebensatz — dazu die Position im Satz. <em>aber</em> steht auf Pos. 0, <em>obwohl</em> baut einen NZ, <em>zwar</em> und <em>deshalb</em> stehen auf Pos. I oder III. Zweiteilige Konnektoren zeigen beide Hälften einzeln, denn <em>zwar … aber</em> stellt jede anders.',
      '<strong>Die Bewertung akzeptiert jetzt beides.</strong> Wer <em>deshalb</em> ins Mittelfeld setzt („Er ist deshalb müde"), schreibt korrektes Deutsch — die KI-Bewertung weiß das nun und zählt es nicht mehr als Wortstellungsfehler.'
    ]
  },
  {
    version: '1.18.04', date: '2026-08-07', kind: 'fix',
    title: 'Sprechen Teil 1 · der getippte Vortrag lässt sich abgeben',
    notes: [
      '<strong>„Vortrag beenden" tat getippt gar nichts.</strong> Wer Teil 1 getippt geübt hat, kam nie über die Rede hinaus: der Knopf reagierte nicht, ohne Hinweis, ohne Fehlermeldung, ohne Weg nach vorn — der getippte Vortrag war damit von Anfang an nicht abgebbar. Der Fehler saß tief in der Speicherung und ist behoben. Falls dort je wieder etwas schiefgeht, sagt der Knopf es jetzt, statt stumm zu bleiben. Angefangene Vorträge von vorher sind leider leer geblieben — fang für diese Themen neu an.',
      '<strong>Die getippte Redezeit heißt jetzt „geschätzt".</strong> Getippt gibt es keine Uhr: die angezeigte Zeit wird aus deiner Wortzahl gerechnet, mit 90 Wörtern pro Minute. Bisher stand sie da wie eine echte Messung. Jetzt steht ein <em>≈</em> davor und „geschätzt" daneben — gesprochen bleibt es die gemessene Zeit, wie gehabt.',
      '<strong>Prüfungsmodus verspricht keine vier Minuten mehr, wo es keine gibt.</strong> Das Zeitlimit ist eine Sache des gesprochenen Vortrags; getippt zählt der Umfang — 360 Wörter. Der Hinweis unter dem Knopf sagt jetzt, was für deine Modalität wirklich gilt, statt in beiden Fällen „vier Minuten" zu behaupten.',
      '<strong>Nach einem Mikrofon-Ausfall hilft der Trainer weiter mit.</strong> Verweigert der Browser das Mikrofon, tippst du den Vortrag zu Ende — nur meldete sich die Stuck-Erkennung dann nie wieder, gerade wenn du ratlos vor dem leeren Feld saßt. Jetzt schon.'
    ]
  },
  {
    version: '1.18.03', date: '2026-08-06', kind: 'polish',
    title: 'Satzübersetzung · Zeitformen nach Wahl',
    notes: [
      '<strong>Du bestimmst die Zeitformen.</strong> Die KI-Satzübersetzung kennt jetzt ein Zeitformen-Feld — alle fünfzehn Formen von Präsens bis Passiv Konjunktiv II, nach Niveau gruppiert. Jeder Satz bekommt eine deiner Formen fest zugeteilt, gleichmäßig durchgemischt statt dem Zufall der KI überlassen. Voreingestellt sind die Formen deines Levels; sobald du selbst wählst, bleibt deine Auswahl gespeichert.',
      '<strong>Die Karte sagt, was verlangt ist.</strong> Ein kleines Schild über dem englischen Satz nennt die geforderte Form — wichtig, wo das Englische sie nicht verrät: war das Perfekt oder Präteritum? Und die Bewertung kennt sie auch — ein richtiger Satz in der falschen Form zählt nicht.',
      '<strong>Passiv nur, wo es geht.</strong> Passiv-Formen landen nur auf Sätzen mit einem transitiven Verb; hat dein Filter keins, sind sie sauber abgeschaltet. Die Schwachstellen-Runde bleibt, wie sie war — dort variiert die KI die Zeit weiterhin natürlich.'
    ]
  },
  {
    version: '1.18.02', date: '2026-08-06', kind: 'polish',
    title: 'Übersetzen · die Präzise-Variante',
    notes: [
      '<strong>EN → DE kennt jetzt zwei Varianten.</strong> Das <em>Bedeutungsfeld</em> bleibt großzügig: eine Bedeutung, jedes ihrer Verben zählt. Neu ist <em>Präzise</em>: die Bedeutung kommt mit ihrer Situation — <em>accept (an offer, an invitation)</em> verlangt <em>annehmen</em>, und <em>akzeptieren</em> wäre falsch. Umschaltbar in der Einrichtung unter „Variante".',
      '<strong>Falsche Geschwister werden erklärt.</strong> Wer bei <em>accept (a fact …)</em> „annehmen" tippt, erfährt sofort, zu welcher Situation das getippte Verb wirklich gehört — genau der Moment, in dem der Unterschied hängen bleibt.',
      '<strong>Echte Zwillinge bleiben zusammen.</strong> Wo keine Situation zwei Verben trennt (<em>anfangen/beginnen</em>), zählt jedes von beiden — niemand wird für ein richtiges Verb bestraft. Ein Verb mit mehreren Lesarten bringt jede als eigene Karte mit — das Deck kann also etwas größer sein als die gewählte Verbenzahl.'
    ]
  },
  {
    version: '1.18.01', date: '2026-08-06', kind: 'polish',
    title: 'Der Satz · jeder Hinweis verrät etwas',
    notes: [
      '<strong>Alle Hinweise zeigen jetzt ihr Deutsch.</strong> Im gepackten Satz verrät jede markierte Zutat auf Antippen, was gefragt ist: das Verb mit seiner Rektion (<em>warten + Akk</em>), die Präposition mit ihrem Kasus (<em>seit + Dat</em>), das da-Kompositum als fertiges Wort (<em>darauf</em>), der Konnektor mit seiner Wortstellungsregel (<em>aber — Wortstellung bleibt</em>; Paare zeigen die volle Form <em>sowohl … als auch</em>). Wer bei Präposition, da-Kompositum oder Konnektor nachschaut, schaut bewusst in die Antwort — der Hinweis-Schalter in der Einrichtung schaltet weiterhin alles zusammen ab.',
      '<strong>Jedes Nomen trägt sein Genus.</strong> Auch die Nomen, die die KI nur für den natürlichen Satz dazuerfindet, sind jetzt markiert — dezenter unterstrichen als die bestellten — und verraten Artikel + Nomen (<em>der Bahnhof</em>), damit das Genus nebenbei hängen bleibt.',
      '<strong>Hinweis-Fenster bleiben im Bild.</strong> Am Bildschirmrand konnte das kleine Fenster bisher aus dem sichtbaren Bereich ragen; jetzt schiebt es sich selbst zurück — gerade auf dem Handy wichtig.'
    ]
  },
  {
    version: '1.18.00', date: '2026-08-06', kind: 'module',
    title: 'Der Satz · fünf Kategorien, eine Karte',
    notes: [
      '<strong>Kapitel XII: der gepackte Satz.</strong> Du bestellst pro Karte, was drin sein muss — bis zu drei Verben, drei Nomen, drei Präpositionen, drei da-Komposita und zwei Konnektoren, höchstens acht Zutaten insgesamt — und die KI schreibt <em>einen</em> Satz, der alles enthält. Normalerweise ein bis zwei Sätze; wer die Karte vollpackt, bekommt einen Kurztext von drei bis vier. Jede Karte zieht frische Wörter.',
      '<strong>Konnektoren sind ab jetzt Prüfungsstoff.</strong> Eine neue Sammlung von fast vierzig Wörtern in sechs Bedeutungsfamilien — Gegensatz, Grund &amp; Folge, Einräumung, Zeit, Wahl, Hinzufügung — jedes mit seiner Wortstellungsregel: <em>aber</em> lässt alles stehen, <em>jedoch</em> erzwingt Inversion, <em>obwohl</em> schickt das Verb ans Ende. Zweiteilige Paare wie <em>sowohl … als auch</em> und <em>je … desto</em> zählen als ein Item mit zwei Fundstellen — und <em>je … desto</em> verlangt an jeder Stelle eine andere Wortstellung.',
      '<strong>„Verb + Dativ" gezielt üben.</strong> Der Verb-Filter kennt die Rektion: nur Dativ-Verben anwählen, und jede Karte fragt genau das ab. Nach der Bewertung trägt jedes Verb sein Kasus-Schild — <em>warten + Akk</em> — damit hängen bleibt, was das Verb von seinem Objekt will.',
      '<strong>Bewertet wird jede Zutat einzeln.</strong> Die KI prüft Item für Item und vergibt Fehler-Tags von <code>conjugation</code> bis <code>connector</code>; die Karte gilt nur dann als richtig, wenn <em>alles</em> saß — „Teils richtig" wandert mit in die Übungsrunde, die wie überall nichts in den Verlauf schreibt. Wort-Hinweise markieren jede bestellte Zutat, verraten aber nur bei Verben und Nomen das Deutsche: bei Präposition, da-Kompositum und Konnektor <em>wäre</em> die Antwort der Hinweis.',
      '<strong>Die Schwachstellen fließen zusammen.</strong> Ein Verb, das im gepackten Satz danebengeht, zählt zu denselben Verb-Schwachstellen wie im Satz-Drill des Verb-Moduls — Präpositionen und Kollokationen genauso. Konnektoren bekommen ihre eigene Liste im Verlauf. DE → EN gibt es auch, bewusst leichter: nur Bedeutungs-Bewertung, ohne Tags und ohne Hinweise. Gesprochen statt getippt geht wie beim Verb-Satz — Leertaste nimmt auf, die ganze Übersetzung am Stück.'
    ]
  },
  {
    version: '1.17.03', date: '2026-08-05', kind: 'module',
    title: 'Übersetzung · EN→DE wird zum Bedeutungsfeld',
    notes: [
      '<strong>One meaning at a time, not a sheet of blanks.</strong> The reverse direction now deals a single English meaning per screen and asks for <em>any</em> German verb that carries it — dashed slots show how many the collection holds. Enter grades on the spot and draws the next field; no more filling ten rows before you learn anything.',
      '<strong>The last field reports back in the corner.</strong> A small card shows what just happened: green or red, every verb that would have counted, the one you named highlighted. Name a real verb that belongs to a different meaning and the card tells you what it actually means — „aufstehen" heißt <em>get up</em>, not what was asked.',
      '<strong>The field is the unit, in play and in the score.</strong> A Serie counter tracks your run, „Aufdecken &amp; weiter" reveals a field you don\'t know and moves on. The Auswertung counts fields hit, and every missed meaning is listed with all of its verbs — the ones worth collecting now.',
      '<strong>The classic sheet is still there.</strong> DE→EN keeps its Übungsblatt, unchanged. At setup the Richtung now leads the page: <em>EN → DE · Bedeutungsfeld</em> or <em>DE → EN · Blatt</em>.'
    ]
  },
  {
    version: '1.17.02', date: '2026-08-05', kind: 'fix',
    title: 'Übersetzung · a shared meaning accepts every verb that carries it',
    notes: [
      '<strong>EN→DE no longer insists on the one verb it happened to draw.</strong> The sheet shows only the English, and „achieve / attain" gives no way of knowing whether it came from <code>erzielen</code> or <code>leisten</code> — yet only the drawn verb counted. Grading now accepts any verb in the collection that shares a meaning with the prompted one, so when the same English appears twice in a round, the same answer is right both times.',
      '<strong>The whole collection vouches, not just today\'s deck.</strong> The synonym doesn\'t have to be sampled in the current round to count — a correct translation is correct regardless of what else was drawn. This brings the reverse direction level with DE→EN, which has always taken any one of a verb\'s listed meanings.'
    ]
  },
  {
    version: '1.17.01', date: '2026-08-05', kind: 'fix',
    title: 'Sprechen Teil 1 · die Messungen sagen jetzt die Wahrheit',
    notes: [
      '<strong>Die Prüfungsuhr läuft weiter, auch wenn du das Mikrofon anhältst.</strong> Bisher zählte die 4:00-Grenze nur die reine Sprechzeit — wer pausierte, um nachzudenken, bekam eine makellose Flüssigkeitsbilanz für einen Vortrag, der in Wirklichkeit zwölf Minuten brauchte. Jetzt gibt es beide Zahlen, Redezeit <em>und</em> Gesamtdauer, das harte Zeitlimit greift auf die echte Uhr, und die Auswertung sieht deine Pausenzeit — als Information, nicht als Vorwurf.',
      '<strong>Ein gesprochener Vortrag übersteht jetzt einen toten Tab.</strong> Der Text wird bei jedem erkannten Satzstück gesichert statt erst beim Schließen des Mikrofons; auch die Nachfrage samt deiner angefangenen Antwort und die fünf Stichwörter der Vorbereitung überleben ein Neuladen. Und wer keinen KI-Zugang eingerichtet hat, erfährt das jetzt vor dem Vortrag, nicht nach vier Minuten Reden.',
      '<strong>„Einerseits …, andererseits …" zählt endlich.</strong> Vier Vortragsmittel waren durch ihre Platzhalter technisch unauffindbar — ausgerechnet das Kontrastpaar, das die Bewertung namentlich sehen will, konnte nie aufleuchten. Und das Antippen einer Wendung fügt jetzt die ganze Wendung ein, nicht mehr ein einzelnes abgeschnittenes „Für".',
      '<strong>Der KI-Tipp behauptet nichts mehr, was er nicht wissen kann.</strong> Ob ein Gliederungspunkt behandelt ist, beurteilt er jetzt am Vortragstext selbst; deine geplanten Stichwörter reicht er nur noch als ausdrücklich unzuverlässigen Hinweis weiter. Vorher schickte er dich zurück zu Punkten, die du längst behandelt hattest — für einen bezahlten Tipp zu wenig. Er kennt jetzt auch deine Redezeit und kann raten, wo du kürzen solltest.',
      '<strong>Die Bewertung ist geeicht.</strong> Jedes Kriterium trägt jetzt vier ausgeschriebene Punktbänder statt einer freien Zahl, ein ausgelassener Gliederungspunkt kostet benannt mindestens vier Punkte, und ein Ergebnis, dessen Erfüllungsnote der eigenen Abdeckungstabelle widerspricht, wird verworfen statt angezeigt. Der Vorbereitungstipp, der zum Weglassen eines Punktes riet — das Gegenteil dessen, was die Rubrik bestraft — ist ersetzt.',
      '<strong>Hilfen, die ehrlicher helfen.</strong> Konnektoren kommen als Satzrahmen mit ihrer Wortstellung („Trotzdem ist …") statt als lose Wörter, die Wortstellungsfehler produzieren. Die Rettungsleine steht jetzt über der Schublade, spricht auf Wunsch, und meldet sich, wenn du stockst — als eigener Eintrag im Hilfe-Protokoll, das keine Hilfen mehr zählt, die du nie benutzt hast. Ein Prüfungsmodus-Knopf stellt mit einem Griff Prüfungsbedingungen her, und „Live-Checkliste: Aus" versteckt jetzt wirklich jede Uhr.',
      '<strong>Kleinigkeiten mit Wirkung.</strong> Doppelte oder ineinander steckende Stichwörter warnen schon in der Vorbereitung. Zehn Vortragsthemen, die ihre eigene Schlussfolgerung schon behaupteten, sind offen umformuliert. Die Nachfrage variiert ihren Typ — Vertiefung, Beispiel, Gegenposition, Transfer — und ein Mikrofonausfall mitten im Vortrag wird als das protokolliert, was er ist, statt die Bewertung stillschweigend umzuetikettieren.'
    ]
  },
  {
    version: '1.17.00', date: '2026-08-05', kind: 'module',
    title: 'Sprechen Teil 1 · der Vortrag — vier Minuten am Stück',
    notes: [
      '<strong>Die andere Hälfte der mündlichen Prüfung ist da.</strong> Zwei Aufgabenblätter liegen vor dir, du nimmst eines, planst die Gliederung und hältst den Vortrag — <em>am Stück</em>, nicht Abschnitt für Abschnitt. Danach stellt der Partner genau eine Nachfrage, und zwar zu dem, was du wirklich gesagt hast. Bewertet wird auf derselben Skala wie Teil 2, damit die beiden Werte vergleichbar bleiben.',
      '<strong>Die Themenwahl ist eine echte Entscheidung.</strong> Beide Blätter drucken alle fünf Gliederungspunkte aus, du wählst also nach Inhalt und nicht nach Titel. Darunter fragen drei Häkchen, ob du das Thema füllen kannst: eigenes Beispiel, drei Wörter, eine Meinung. Nur für dich, wird nicht gespeichert — genau die halbe Minute, an der diese Prüfungsaufgabe sonst verloren geht.',
      '<strong>Aus der Vorbereitung wird eine Live-Checkliste.</strong> Du schreibst ein Stichwort pro Gliederungspunkt, und dieselben fünf Stichwörter stehen im Vortrag neben dir und haken sich selbst ab, sobald du sie sagst. Lokal gezählt, ohne KI, aus <em>deinem</em> Plan — kein Schema. Die Liste sagt darum <em>gesagt</em> und nie <em>abgedeckt</em>: ob ein Punkt wirklich getragen hat, sagt erst die Auswertung.',
      '<strong>Hilfen, die im Ernstfall etwas taugen.</strong> 35 Vortragsmittel in sieben Gruppen, jede zum Anhören, bevor du sie sagst. Eine Konnektoren-Palette für genau die Übergänge, an denen ein Vortrag sonst abreißt. Drei feste Fragen, die dir dein eigenes Beispiel ausgraben. Und eine Rettungsleine: vier Minuten ohne Totenstille zu füllen ist Prüfungsstoff, keine Ausrede. Bleibst du hängen, meldet sich die Hilfe von selbst — bezahlt wird aber nie ohne dich.',
      '<strong>Aufwertungen, getrennt von Fehlern.</strong> Die Auswertung markiert wie gewohnt jede falsche Stelle und legt sie ins gemeinsame Fehlerarchiv — Vortrag und Diskussion schreiben ins selbe. Daneben steht jetzt ein eigener Block: Stellen, die <em>nicht</em> falsch waren und auf B2 trotzdem besser klingen. Die wandern absichtlich nicht ins Archiv, denn das Archiv bedeutet „das hatte ich falsch". Sie bleiben aber in der Bilanz lesbar, auch wenn der Vortrag selbst längst verworfen ist.',
      '<strong>Vier Regeln, an die sich alle Hilfen halten.</strong> Keine wird gegen dich geprüft, keine kostet Punkte, keine außer dem KI-Tipp kostet einen Call — und was du benutzt hast, steht hinterher offen im Hilfe-Protokoll. Das harte Zeitlimit gibt es nur beim Sprechen: ein Wortdeckel auf einen getippten Vortrag hätte in der Prüfung kein Gegenstück und würde nur Ausführlichkeit bestrafen.'
    ]
  },
  {
    version: '1.16.03', date: '2026-08-02', kind: 'polish',
    title: 'Satzübersetzung · hear the sentence you were aiming for',
    notes: [
      '<strong>A graded card can say its sentence out loud.</strong> Leertaste plays the model German, Enter moves on. On demand only — nothing speaks by itself — and always the reference, never your own answer back at you, so what you hear is the sentence worth imitating whether you got it right or not.',
      '<strong>Typed runs get this too.</strong> Hearing the sentence is output, not input, so it has nothing to do with whether you typed or spoke your answer. It uses the German voice and tempo you chose for the Diskussion; change it there and this follows.',
      '<strong>One consequence.</strong> In a spoken run Leertaste no longer jumps to the next sentence — it still records and submits your answer, then reads the reference once the card is graded. Enter is what moves you on now, in both modes. Where a browser has no German voice the button is simply absent and Leertaste still advances.'
    ]
  },
  {
    version: '1.16.02', date: '2026-08-02', kind: 'fix',
    title: 'Themenwahl · the Prüfungskarte stays where you can reach it',
    notes: [
      '<strong>Start is on screen now.</strong> The exam card is pinned, but a card taller than the window left its Start button below the fold — and with a hundred topics above it, the only way to reach the button was to scroll to the very bottom of the page. The card is now bounded by the window and scrolls its own fields, so its heading and its Start button are both always in view.',
      '<strong>The voice picker fits.</strong> A dropdown sizes itself to its longest entry, and Windows voice names run to <em>Microsoft Katja Online (Natural) - German (Germany)</em> — nearly twice the width of the card, so it hung out over the topic list. It now takes a line of its own and shortens the name instead of the card, with Tempo and <em>Probe hören</em> on the line beneath.'
    ]
  },
  {
    version: '1.16.01', date: '2026-08-02', kind: 'polish',
    title: 'Satzübersetzung · say it instead of typing it',
    notes: [
      '<strong>The verb sentence quiz can now be spoken.</strong> Pick <em>Gesprochen</em> at setup and the text field is replaced by a microphone: Leertaste starts the recording, you say the German, Leertaste again ends it <em>and</em> submits. There is no edit step — what the recogniser heard is what you answered — so the whole run goes by keyboard-free: speak, submit, advance, speak. The remedial drill offers the same choice.',
      '<strong>The grader knows it is reading a transcript.</strong> Speech recognition produces no punctuation and no reliable capitalisation, so a spoken answer is judged on the words alone and can never be marked down for a <code>typo</code> — that spelling is the recogniser\'s, not yours. The same rule the Diskussion already applies to its own spoken mistakes.',
      '<strong>Your runs remember which way you answered.</strong> Same sentences, same grader, same kind of run either way — so a typed and a spoken score are directly comparable. If the browser has no speech recognition the option is greyed out, and if you refuse the microphone mid-quiz it simply carries on typed with nothing lost.'
    ]
  },
  {
    version: '1.16.00', date: '2026-08-01', kind: 'major',
    title: 'Sprechen · the editorial revamp, plus the Korrekturdrill',
    notes: [
      '<strong>The module home is now an index, not a card grid.</strong> A masthead lays out the four stages every exam part shares, and beside it your last two results — getippt and gesprochen — stand side by side on the same four criteria, with the gap between them named outright. That comparison is the point: the two modes share one rubric precisely so <em>how much worse am I when I have to speak?</em> is a question with an answer. Teil 1 · Vortrag has its panel in place but is not built yet, and says so rather than pretending.',
      '<strong>Themenwahl is a browser now.</strong> Search across titles and theses, filter by field, see at a glance which of the hundred topics you have already argued and which already have their arguments cached. The exam card on the right holds the whole configuration — modality first, because that is the choice that decides what can be measured.',
      '<strong>The discussion runner keeps a protocol, not a chat.</strong> Ruled turns instead of bubbles, and a rail that tracks what you are actually doing: each contribution labelled with the move it used, all forty-two Redemittel as a grid that fills as you reach for them, and — when you are speaking — your live tempo. The hint drawer now answers <em>what</em> to argue as well as <em>how</em> to say it, and marks which phrases you have already spent.',
      '<strong>A nudge, not an instruction.</strong> From your second contribution the runner names one move you have not used — preferring the one you reach for least across every discussion you have ever had. It is a suggestion and nothing more: nothing checks whether you took it, and it never touches your score.',
      '<strong>The Auswertung shows its reasoning.</strong> Beneath the verdict, a row per contribution: did it state a position, give a reason, give an example, engage what the partner just said. Argumentation and interaction both live inside one official criterion, so this explains where that criterion landed rather than inventing a new one — it moves no points. Below it, which Redemittel you actually used, then every mistake marked in your own sentences.',
      '<strong>Fehlerarchiv gains a Korrekturdrill.</strong> Your own marked wordings, replayed one at a time: you retype just the wrong span, and a miss is not punished — it stays open and comes back. Graded locally, so it works with no connection at all.',
      '<strong>Under the hood.</strong> Which phrases you have ever used is now banked as each discussion is graded, because the conversation itself is discarded moments later and could never be counted again. A speaking-mode fix worth naming: a quarter of the stock phrases could not be detected at all when spoken, because the matcher expected commas the speech recogniser never produces.'
    ]
  },
  {
    version: '1.15.00', date: '2026-07-31', kind: 'major',
    title: 'Direction Words & Da-Compounds · the editorial revamp',
    notes: [
      '<strong>Both module homes are rebuilt as proper indexes.</strong> Direction Words gets a sticky rail with a live perspective study: pick one of the six elements, flip where you are standing, and watch the compound and its meaning recompute. The rule the whole module rests on — <em>her</em> toward the speaker, <em>hin</em> away from it — is now something you turn over in your hands rather than something you read. Beside it, the six pairs on one axis: her-form, element, hin-form, and the spoken short form.',
      '<strong>Da-Compounds gets a masthead and a ledger.</strong> The formation rule plays out as a formula — <em>da</em> + <em>r</em> + preposition — across every preposition that forms a compound and the eight that never do, so the linking <em>r</em> is the thing your eye lands on. All twenty drills sit in a searchable, sortable index; ask it for your weakest and it reorders.',
      '<strong>Mastery meters, from your own history.</strong> Every drill now shows how far along it you are and how many questions you have answered, accumulated for good rather than read from a rolling window — so practising one module no longer makes another look untouched. Weak points stay right beside it: one tells you how far you have got, the other what to fix next.',
      '<strong>Both cheatsheets are re-set as reference plates.</strong> Numbered plates, tabular type, and three additions: the her/hin key side by side, the Korrelat verbs split into obligatorisch, fakultativ and ausgeschlossen, and the no-compound prepositions as a single glance.',
      '<strong>Under the hood.</strong> All twenty-eight drills across both modules now share one visual vocabulary instead of ten near-identical copies of it — about 4,000 lines of duplicated styling gone. Along the way: the answer field in the AI-graded drills respects your palette again, the preposition colours are wired to survive it, and the drill catalogue lives in one place instead of being spelled out twice.'
    ]
  },
  {
    version: '1.14.04', date: '2026-07-29', kind: 'polish',
    title: 'Direction Words · the traps — module complete',
    notes: [
      '<strong>T8 Directional or lexicalized?</strong> <em>Die Firma stellt Möbel her</em> — nobody is fetching anything. Some verbs kept the direction (<em>Findest du allein wieder heraus?</em>), others turned into plain vocabulary (<em>herausfinden</em> = ermitteln), and a handful do both depending on the sentence. Decide which reading each sentence admits; the reveal shows both and explains what blocks the other.',
      '<strong>T9 Idiom gap-fill.</strong> <em>hin und her</em> or <em>hin und wieder</em>? Back-and-forth versus now-and-then, <em>lange her</em> (looking back) against <em>noch lange hin</em> (still ahead) — every distractor is a real idiom in the wrong slot.',
      '<strong>The Direction Words module is complete:</strong> nine drills — the perspective rule with scene diagrams, compound pairs, question words, r-form register, sentence assembly, two AI production drills with perspective-aware grading and weak points, and now the traps — plus the six-chapter cheatsheet. Every item hand-written, every scene-anchored answer machine-checked against its own diagram.'
    ]
  },
  {
    version: '1.14.03', date: '2026-07-28', kind: 'polish',
    title: 'Direction Words · AI sentence production',
    notes: [
      '<strong>T6 Sentence translation (KI).</strong> The AI writes the scene in English — where the speaker stands is in the words — and you write the German. Grading is perspective-aware: <em>herauf</em> where the speaker is below gets a <em>direction</em> tag, <em>hinab</em> counts for <em>hinunter</em>, and spoken short forms (<em>rauf</em>) pass with a written-form tip. Word hints reveal nouns and unknown words — never the direction word.',
      '<strong>T7 Answer the question (KI).</strong> A German scenario asks; you answer freely with the right direction word — Mittelfeld or fronted, both count. <strong>Weak points</strong> from both AI drills now sit on the module home: your shakiest pairs, by the numbers.'
    ]
  },
  {
    version: '1.14.02', date: '2026-07-28', kind: 'polish',
    title: 'Direction Words · register & sentence assembly',
    notes: [
      '<strong>T4 R-forms &amp; register.</strong> <em>Komm rüber!</em> — fine, say it all day. Write it in an essay? Keep <em>herüber</em>. And <em>*hinrein</em> was never a word: judge every phrase as standard, spoken-only, or plain wrong, with the correction on every miss.',
      '<strong>T5 Sentence assembly.</strong> Tap pre-inflected tiles into order and put the direction word where German wants it — clause-final after the finite verb (<em>Wo gehst du denn hin?</em>), fused when it must be (<em>hineingelaufen</em> is one tile, one word). Curated fronting variants count as correct. Both drills record to History and filter by level.'
    ]
  },
  {
    version: '1.14.01', date: '2026-07-28', kind: 'polish',
    title: 'Direction Words · the first three drills',
    notes: [
      '<strong>The perspective rule, drilled.</strong> <em>T1 Hin or her?</em> — a scene diagram pins where you stand, you pick the direction; the <em>hier</em> button lies in wait for the English reflex (<em>*Komm hier!</em>). <em>T2 Compound gap-fill</em> — <em>hinauf</em> or <em>herauf</em>? The scene decides; four options crossing both axes, or type it yourself at B2. <em>T3 Wo, wohin or woher?</em> — three ways to ask "where", plus the pointers (<em>dahin, dorthin</em>) and the spoken splits (<em>Wo gehst du hin?</em>).',
      '<strong>110+ hand-written items</strong>, each anchored to a scene diagram wherever perspective matters, guarded by automated invariants — an item whose answer contradicts its own scene cannot ship. Every drill filters by level (T2 also by pair), records to History, and offers the usual retry round.'
    ]
  },
  {
    version: '1.14.00', date: '2026-07-28', kind: 'module',
    title: 'Direction Words · a new module opens',
    notes: [
      '<strong>Module X: Direction Words (hin &amp; her).</strong> <em>hinein</em> oder <em>herein</em>? It depends on where you stand. The perspective adverbs get their own home — reachable from the top nav and the front page. The drills arrive family by family over the coming releases; this one lays the foundation.',
      '<strong>The cheatsheet is live — with pictures.</strong> The perspective rule shown as two scene diagrams (same staircase, flipped speaker), the six hin/her pairs with their <em>rein/raus</em> shortcuts and register rules, <em>wo/wohin/woher</em> with the spoken splits (<em>Wo gehst du hin?</em>), the verbs where the direction has faded (<em>herstellen</em> means manufacturing, not fetching), and the idioms from <em>hin und her</em> to <em>lange her</em>.'
    ]
  },
  {
    version: '1.13.01', date: '2026-07-27', kind: 'fix',
    title: 'Local Claude · reliable generation everywhere',
    notes: [
      '<strong>Every AI prompt now spells out its JSON shape.</strong> The local-Claude dev bridge never forwards Gemini\'s response schema, so prompts that said <em>"answer per the schema"</em> pointed at nothing — the model replied in prose and burned every retry. All thirteen call sites, from the adjective sentences to the Sprechen grader, now describe their exact envelope in the prompt text itself; the discussion partner and the KI-Tipp additionally accept a bare-text reply when no JSON arrives.',
      '<strong>Graders judge your German, not the model\'s arithmetic.</strong> The Sprechen and Schreiben validators used to reject a whole analysis when the echoed total didn\'t exactly match the criterion sum — routine for a model without schema enforcement. <code>totalScore</code> and the pass flag are now derived locally from the per-criterion scores, criteria match by key in any order, and fractional points are rounded. Local-Claude analyses land on the first attempt, and the preposition color set got a small polish (<em>auf · an · von</em>).'
    ]
  },
  {
    version: '1.13.00', date: '2026-07-27', kind: 'module',
    title: 'Sprechen · Teil 2 Diskussion',
    notes: [
      '<strong>Module X: argue with the machine.</strong> Goethe B2 Sprechen Teil 2 as a typed discussion — pick one of <em>100 seeded Topics</em> (or let the AI generate fresh ones that remember what you\'ve already discussed), choose 6, 8, or 10 turns, and defend your position against an AI partner that concedes good points, plays devil\'s advocate, and never corrects you mid-conversation.',
      '<strong>Hints, layered.</strong> Six Move chips (<em>Zustimmen · Widersprechen · Teilweise zustimmen · Nachfragen · Beispiel geben · Zusammenfassen</em>) reveal Redemittel from the new tabbed Spickzettel instantly; an optional <em>KI-Tipp</em> suggests a direction without writing your sentence. Neither affects the score.',
      '<strong>The reckoning.</strong> Afterwards, every mistake in your turns is marked in place, corrected, and explained — German or English, one toggle. Four criteria à 25 points (Aussprache excluded, stated openly), Prädikat like the real Zeugnis. The verdict is a one-time view: history keeps the summary, never the conversation.'
    ]
  },
  {
    version: '1.12.10', date: '2026-07-24', kind: 'polish',
    title: 'Übersetzung · hint shortcut',
    notes: [
      '<strong>Shift+R toggles the hint without leaving the keyboard.</strong> While typing an answer in the verb translation quiz, press <code>Shift+R</code> to swap the German verb for its English hint and back. Double-click still works — the shortcut just keeps your hands on the keys. Plain <code>r</code> types normally; answers are lowercase, so the capital letter is free.'
    ]
  },
  {
    version: '1.12.9', date: '2026-07-24', kind: 'polish',
    title: 'Da-Compounds · the traps — module complete',
    notes: [
      '<strong>The last family: three C1 trap drills.</strong> <em>T18 Homographs</em> — the same word, two readings: <em>damit</em> the conjunction vs. <em>damit</em> = mit + it. <em>T19 Register</em> — judge <em>"Da weiß ich nichts von"</em> (spoken, fine) against <em>*darmit</em> (always wrong). <em>T20 Relative clauses</em> — <em>alles, worüber …</em> (wo-form required), <em>das Buch, über das …</em> (preferred), <em>die Frau, von der …</em> (wo-form forbidden).',
      '<strong>The Da-Compounds module is complete:</strong> twenty drills across seven families — formation, matching, gap-fill, case, people-vs-things, Korrelat, meaning contrast, AI translation and answering, sentence assembly, and the traps — plus the cheatsheet and weak-point tracking. Every dataset hand-written, every answer derived from stored grammar, every release audited.'
    ]
  },
  {
    version: '1.12.8', date: '2026-07-24', kind: 'polish',
    title: 'Da-Compounds · production drills',
    notes: [
      '<strong>Build it, don\'t just pick it.</strong> <em>T16 Sentence assembly</em> — tap pre-inflected tiles into order; curated fronting variants count too (<em>Für Briefmarken interessiert sich mein Vater</em> is as right as the plain order). <em>T17 Answer the question</em> — the AI asks (<em>Freust du dich auf das Wochenende?</em>), you answer freely; Mittelfeld and fronted compounds both accepted, and a new <em>word-order</em> tag joins the weak-point tracking.',
      '<strong>Weak points now learn from both AI drills</strong> — translation and answering feed the same collocation/preposition panel on the module home.'
    ]
  },
  {
    version: '1.12.7', date: '2026-07-24', kind: 'polish',
    title: 'Da-Compounds · AI sentence translation',
    notes: [
      '<strong>The module goes generative.</strong> <em>T14 EN→DE</em> — the AI writes an English sentence around a collocation from your selection plus nouns from your themes; you translate it, and the grader accepts both constructions (<em>auf das Konzert</em> or <em>darauf, dass …</em>) while tagging what went wrong: preposition, compound form, case, noun, or typo. <em>T15 DE→EN</em> — decode the compound in context (<em>darauf</em> is rarely "on it").',
      '<strong>Weak points, da-compound edition.</strong> Wrong answers feed a new panel on the module home showing the collocations and prepositions you miss most — the groundwork for a remedial drill in a later phase.'
    ]
  },
  {
    version: '1.12.6', date: '2026-07-23', kind: 'polish',
    title: 'Da-Compounds · Korrelat, the B2 flagship',
    notes: [
      '<strong>Three drills on the pointing compound.</strong> <em>T11 Korrelat</em> — darauf, dass …: obligatory for some verbs (<em>Er besteht darauf, dass …</em>), optional for others, and plain wrong for <em>wissen/glauben/sagen</em> — the "— kein Korrelat" option keeps you honest, and optional verbs accept both readings. <em>T12 Paraphrase</em> — the same thought twice: <em>um die Einhaltung des Termins</em> ↔ <em>darum, dass der Termin eingehalten wird</em>. <em>T13 Meaning contrast</em> — one verb, two prepositions, different meanings: <em>freuen auf</em> (ahead) vs. <em>über</em> (at hand), <em>leiden an</em> vs. <em>unter</em>, <em>bestehen auf</em> vs. <em>aus</em>.',
      '<strong>120+ new hand-written items</strong> with derived answers and a reveal that always explains the rule — every T11 sentence was checked to read naturally exactly as its status claims (with, with-or-without, or only without the compound).'
    ]
  },
  {
    version: '1.12.5', date: '2026-07-23', kind: 'polish',
    title: 'Da-Compounds · people vs. things',
    notes: [
      '<strong>The signature rule gets its own family.</strong> <em>T8 Thing or person?</em> — replace the object: <em>an Karl</em> → <em>an ihn</em>, but <em>nach dem Preis</em> → <em>danach</em>; the options test the rule and the pronoun case at once. <em>T9 Wo-questions</em> — ask after it: <em>Wovor hast du Angst?</em> for things, <em>Auf wen wartest du?</em> for people. <em>T10 Dialogue</em> — the full pairing: <em>Worauf wartest du? — Ich warte darauf, dass …</em>',
      '<strong>150+ new hand-written sentences</strong>, every answer derived from the collocation\'s stored preposition and case — with the Phase-3 lesson baked in as a permanent invariant: no card can ever pair <em>es</em> with an accusative preposition (<em>*auf es</em> is not German).'
    ]
  },
  {
    version: '1.12.4', date: '2026-07-23', kind: 'polish',
    title: 'Da-Compounds · the case family',
    notes: [
      '<strong>Three case drills join the module.</strong> <em>T5 Case pick</em> — a sentence carries the compound (<em>Ich warte darauf</em>); you name the hidden preposition\'s case. <em>T6 Pronoun case</em> — people don\'t take da-compounds: type or choose <em>auf ihn</em>, not <em>*auf ihm</em>. <em>T7 Article fill</em> — two-way prepositions in verb objects: <em>an ein___ Projekt</em> → <em>einem</em>, because <em>arbeiten an</em> is one of the dative exceptions.',
      '<strong>Answers are derived, never hand-typed:</strong> 100+ new authored sentences carry only the situation; pronoun and article forms come from declension tables joined to the collocation\'s stored case — so a grading disagreement is impossible by construction.'
    ]
  },
  {
    version: '1.12.3', date: '2026-07-23', kind: 'polish',
    title: 'Da-Compounds · the first four drills',
    notes: [
      '<strong>Four drills open the module.</strong> <em>T1 da- or dar-?</em> — a speed round on formation, traps included (<em>*darohne</em> doesn\'t exist). <em>T2 Matching</em> — pair verbs with their compound. <em>T3 Gap-fill</em> — replace the prepositional phrase anaphorically (<em>Sie freut sich ___</em> → <em>darüber</em>), choose-from-four or type-it modes. <em>T4 Near neighbors</em> — distractors picked to be confusable (<em>denken an / warten auf / sprechen über</em>).',
      '<strong>90+ hand-written sentence pairs</strong> drive the gap-fill drills, each tied to a collocation from the Fixed prepositions dataset and guarded by automated invariants. Every drill records to History and filters by level, word type, and preposition.'
    ]
  },
  {
    version: '1.12.2', date: '2026-07-23', kind: 'module',
    title: 'Da-Compounds · a new module opens',
    notes: [
      '<strong>Module VIII: Da-Compounds (Pronominaladverbien).</strong> dafür, darauf, davon &amp; friends get their own home — reachable from the top nav and the front page. The drills arrive family by family over the coming releases; this one lays the foundation.',
      '<strong>The cheatsheet is live.</strong> The full formation table (<em>da/dar</em> and <em>wo/wor</em> — the linking <em>-r-</em> only before a vowel), the prepositions that refuse to form compounds (<em>*darohne</em>), the things-vs-people rule (<em>darauf</em> vs. <em>auf ihn</em>), and which verbs demand, allow, or forbid a Korrelat (<em>Ich freue mich darauf, dass …</em>).'
    ]
  },
  {
    version: '1.12.1', date: '2026-07-23', kind: 'polish',
    title: 'History · the three practice drills now count',
    notes: [
      '<strong>Fixed prepositions, Principal parts, and Case government now record to History.</strong> Every finished round lands in your quiz history with its score and filters — so the practice family finally shows up in your stats, charts, and streaks alongside every other drill.',
      '<strong>Retry rounds stay practice.</strong> Only the main round records; the focused retry-the-missed rounds remain unscored, as before.'
    ]
  },
  {
    version: '1.11.34', date: '2026-07-23', kind: 'polish',
    title: 'Verbs · new level B2.2 — 200 more verbs',
    notes: [
      '<strong>The verb pool grows by more than half: 378 → 578.</strong> The old <em>B2</em> level is now called <em>B2.1</em> (same 169 verbs, untouched), and a new <em>B2.2</em> level adds the 200 most frequent German verbs that weren\'t in the pool yet — including surprisingly common ones the hand-picked levels had skipped (<em>lassen, zeigen, halten, bekommen, tun…</em>). The order comes from a published corpus ranking (UD German-HDT), not gut feeling, and the ranking ships in the repo so future batches continue where this one stopped.',
      '<strong>Everywhere verbs are filtered by level</strong> — translation, conjugation, sentence quiz, principal parts, case government, the verb list — you\'ll find the two new chips. A saved <em>B2</em> selection automatically becomes <em>B2.1</em>, so your drills keep the exact pool you chose; the AI quizzes keep speaking plain CEFR (<em>B2</em>) behind the scenes.',
      '<strong>Every new entry is full-fat and hand-checked:</strong> six Präsens forms, Präteritum, Partizip II, auxiliary, governed case, crossword-style hint — irregular forms verified against Wiktionary, and a new automated invariant suite now guards the whole 578-verb dataset (it already caught real slips while the batch was being written).'
    ]
  },
  {
    version: '1.11.33', date: '2026-07-19', kind: 'polish',
    title: 'Fixed prepositions · color hint before you answer',
    notes: [
      '<strong>Guess the preposition from its color.</strong> A new setup toggle — <em>Color hint</em>, off by default and remembered — tints each card with the preposition\'s color <em>before</em> you answer, instead of only revealing it once you submit. If you\'ve learned the scheme (<em>gegen</em> = red, <em>über</em> = blue, …), the hue is enough to guess the preposition — so the case is still yours to get right. It\'s as much a way to drill the colour↔preposition map itself as a leg-up on the answer.',
      '<strong>Kept legible.</strong> The colour washes only the <em>question</em> — a soft tint behind the word plus its full hue on the card\'s top edge — while the answer area and the reveal panel stay neutral. Leave it off for the stricter no-colour-until-you-submit drill.'
    ]
  },
  {
    version: '1.11.32', date: '2026-07-17', kind: 'polish',
    title: 'AI quizzes · every generator now streams',
    notes: [
      '<strong>All the AI quizzes start almost instantly now.</strong> Prep sentence, prep remedial, adjective, Konjunktiv, Passiv and the declension article-AI drills no longer make you wait behind a loading screen for the whole set — they generate the first few in a small batch, open right away, and stream the rest in behind you (batches of about ten). A big custom run is usable in seconds instead of a minute.',
      '<strong>Steadier, cheaper generation.</strong> Instead of one enormous request, each drill now asks the AI in bite-sized batches, so a hiccup costs one batch (surfaced as “Generated X of N”) rather than the whole run. Completes the streaming rollout begun with the verb quizzes (ADR-0008).'
    ]
  },
  {
    version: '1.11.31', date: '2026-07-17', kind: 'polish',
    title: 'AI generation · ramped batches (verb quizzes)',
    notes: [
      '<strong>Faster first sentence, efficient tail.</strong> The AI verb sentence quiz (and verb remedial) now generate in a ramp — <em>1, then 2, then 5, then batches of 10</em> — so the first card appears almost immediately while the rest stream in behind you, and large custom runs make far fewer, steadier AI calls. Groundwork (a shared batch planner + ADR-0008) is in place to bring the same streaming to the other AI quizzes next.'
    ]
  },
  {
    version: '1.11.30', date: '2026-07-17', kind: 'polish',
    title: 'Fixed prepositions · type-it-out on a miss + retry from the summary',
    notes: [
      '<strong>Burn in the ones you miss.</strong> A new setup toggle — <em>Type it out on a miss</em>, on by default and remembered — makes you retype the full answer (e.g. <em>glauben an</em>) after a wrong card before you can move on. Miss a card, press Enter, and the cursor jumps straight into the retype box so you can start typing; get it right and Next unlocks. Turn it off to just reveal-and-continue.',
      '<strong>Retry the wrong ones after reviewing.</strong> If you choose “Review instead” at the end, the results screen now has a <em>Retry the N wrong</em> button, so you can run a focused round on your misses without restarting the whole drill.'
    ]
  },
  {
    version: '1.11.29', date: '2026-07-17', kind: 'polish',
    title: 'Fixed prepositions · both answers accepted + deeper explanations',
    notes: [
      '<strong>Words that take two prepositions now accept either.</strong> Where a single meaning is genuinely satisfied by more than one preposition — <em>das Interesse an</em> ≈ <em>für</em>, <em>die Frage an/nach</em>, <em>berichten über/von</em>, <em>schimpfen über/auf</em>, <em>enttäuscht über/von</em> — the drill merges them into one card and marks <em>either</em> preposition (with its own case) correct. Meaning-splitting pairs like <em>sich freuen auf</em> vs <em>über</em> stay separate, since the gloss is the answer.',
      '<strong>The why-you-missed note now explains the link.</strong> Instead of just stating the core idea and the hint, each explanation now spells out <em>how</em> the hint\'s image embodies the preposition\'s idea — <em>zweifeln</em>: "a doubt \'snags at one spot and refuses to hold\'; it stays fastened and won\'t move past the one thing you\'re unsure of — that stuck grip is <em>an</em>\'s fixation." All ~500 rewritten, and interchangeable cards explain both answers.'
    ]
  },
  {
    version: '1.11.28', date: '2026-07-17', kind: 'polish',
    title: 'Fixed prepositions · why-you-missed explanations',
    notes: [
      '<strong>Miss a card, learn why.</strong> When you get a fixed-preposition wrong, the drill now shows a one-line explanation that connects the hint you just read to the preposition\'s core idea — e.g. <em>glauben</em>: "<em>an</em> carries contact and mental fixation; \'reaches out and fastens\' is that grip — so <em>glauben</em> takes <em>an</em> (Akkusativ)." The same note appears beneath each missed word on the results screen.',
      '<strong>Written and checked for all collocations.</strong> Every verb, adjective and noun has its own seeded explanation, matched to its preposition and case. One data fix rode along: a bogus <em>danken + bei</em> entry (wrong German — <em>danken</em> takes a bare dative) was removed.'
    ]
  },
  {
    version: '1.11.27', date: '2026-07-17', kind: 'fix',
    title: 'Fixed prepositions · clearer hint text',
    notes: [
      '<strong>The core-idea hint is now easy to read.</strong> The one-line hint shown under each word was set in a muted grey that faded out in some lighting; it now uses the same full-strength text colour as the word itself, so it stays legible in any light and theme.'
    ]
  },
  {
    version: '1.11.26', date: '2026-07-17', kind: 'fix',
    title: 'Fixed prepositions · tidier layout on phones',
    notes: [
      '<strong>The drill reads better on a phone.</strong> After you answer, the correct preposition and its ✓/✗ now sit on the same line as the label, pinned to the right, with the input and case buttons using the full width beneath — no more cramped, left-hugging feedback.',
      '<strong>The results screen uses the whole row.</strong> Each word now spans the strip — word on the left, ✓/✗ on the right, and its preposition and case laid out beneath — instead of collapsing into one narrow left-aligned column.'
    ]
  },
  {
    version: '1.11.25', date: '2026-07-17', kind: 'polish',
    title: 'Fixed prepositions · a clearer test card',
    notes: [
      '<strong>The drill now sits in one high-contrast card.</strong> The <em>Feste Präpositionen</em> test is framed in a single card with a solid surface and full-strength text, so it stays easy to read in either theme and whatever palette you\'ve set — the preposition colour no longer washes across the whole card when you answer.',
      '<strong>The colour moved to the frame.</strong> A slim spine along the top of the card turns the preposition\'s hue the moment you submit, and the revealed example keeps its accent — the memory-anchor colour is still there, just contained to the edges instead of tinting everything you\'re reading.'
    ]
  },
  {
    version: '1.11.24', date: '2026-07-17', kind: 'polish',
    title: 'Fixed prepositions · hints now point at the core idea',
    notes: [
      '<strong>The pre-answer hint now evokes the preposition\'s core idea.</strong> On every <em>Feste Präpositionen</em> card, the one-line hint before you answer no longer retells the example as a little scene — it points at the governed preposition\'s <em>core idea</em> from the Spickzettel instead (<em>warten auf</em> → “your attention is oriented toward something still ahead”). It still never names the preposition or the case: a memory scaffold aimed at the answer rather than a description of the situation.',
      '<strong>Rewritten for all 505 collocations.</strong> Every verb, adjective and noun in the drill gets a fresh core-idea hint matched to its preposition — and, for two-way prepositions, to its case (<em>denken an</em> “the mind reaches out and fastens on a target” vs <em>teilnehmen an</em> “you stand inside it, taking your part”). The on/off toggle and preposition colours are unchanged.'
    ]
  },
  {
    version: '1.11.23', date: '2026-07-16', kind: 'polish',
    title: 'Fixed prepositions · scene hints & preposition colours',
    notes: [
      '<strong>A scene hint on every card.</strong> Each of the 505 collocations in the <em>Feste Präpositionen</em> drill now carries a one-line English micro-scene, shown under the word before you answer — <em>warten</em>: “you\'ve been standing there a while; the bus still hasn\'t come”. It retells the card\'s own example sentence, angled toward the preposition\'s core idea from the Spickzettel, so the situation nudges you toward the preposition without ever naming it. Turn hints on or off on the setup screen (on by default).',
      '<strong>Every preposition has a colour now.</strong> Fifteen fixed prepositions, fifteen fixed hues — <em>gegen</em> red, <em>auf</em> amber, <em>vor</em> violet, <em>zu</em> cyan… Once you\'ve answered, the card washes in the preposition\'s colour, the revealed example takes its accent, and the end-of-drill summary tints each row the same way — one more hook binding word to preposition. Before you answer the card stays neutral, so the colour never gives the answer away.'
    ]
  },
  {
    version: '1.11.22', date: '2026-07-01', kind: 'polish',
    title: 'Prepositions · fixed-preposition Cheatsheet (Spickzettel)',
    notes: [
      '<strong>A memory-aid cheatsheet for the fixed prepositions.</strong> A new <em>Spickzettel</em> on the Prepositions page, organised the way you actually remember them — by preposition, each with the <em>core idea</em> it carries: <em>über</em> for talking and thinking about, <em>nach</em> for seeking, <em>vor</em> for fear and avoidance, <em>auf</em> for anticipation. Fifteen prepositions, each with a handful of representative examples and an example sentence.',
      '<strong>The case becomes a memory hook, not a rule.</strong> Where a preposition splits by meaning, a note makes it stick — <em>an</em> + Akkusativ points the mind at something (<em>denken an</em>) while <em>an</em> + Dativ marks involvement or lack (<em>teilnehmen an</em>, <em>Mangel an</em>); <em>in</em> + Akkusativ moves into a state, <em>in</em> + Dativ is already inside one; <em>leiden an</em> (a disease) vs <em>leiden unter</em> (circumstances).',
      '<strong>Always in step with the drill.</strong> Every example is drawn from the same curated data as the <em>Feste Präpositionen</em> drill, so the phrasing you memorise is exactly what you\'re tested on.'
    ]
  },
  {
    version: '1.11.21', date: '2026-07-01', kind: 'polish',
    title: 'Fixed prepositions · fully keyboard-driven',
    notes: [
      '<strong>Answer without reaching for the mouse.</strong> The <em>Feste Präpositionen</em> drill now drops the cursor straight into the preposition box on every card. Type the preposition, press <code>1</code> for <em>Akkusativ</em> or <code>2</code> for <em>Dativ</em>, then <code>Enter</code> to check and <code>Enter</code> again for the next card — your hands never leave the keyboard.'
    ]
  },
  {
    version: '1.11.20', date: '2026-06-21', kind: 'polish',
    title: 'Nouns · new Programming vocabulary group',
    notes: [
      '<strong>A new <em>Programming</em> noun group.</strong> The noun deck gains 163 curated software-development nouns — language constructs (<em>die Variable</em>, <em>die Schleife</em>, <em>die Funktion</em>), data structures (<em>der Stapel</em>, <em>die Warteschlange</em>, <em>das Array</em>) and tooling (<em>der Quellcode</em>, <em>das Repository</em>, <em>der Commit</em>) — each with its correct gender. Choose <em>Programming</em> in the noun gender or translation quizzes, or as a noun theme in the sentence drills.',
      '<strong>It reaches your existing deck automatically.</strong> A schema migration tops up the new words on the next load — any nouns you added yourself are left untouched.'
    ]
  },
  {
    version: '1.11.19', date: '2026-06-21', kind: 'polish',
    title: 'Three offline drills · Stammformen, verb case government & fixed prepositions',
    notes: [
      '<strong>Principal parts (Stammformen).</strong> A new drill on the Verbs page: shown a verb\'s infinitive, recall its <em>Präteritum</em>, <em>Partizip II</em> and auxiliary (<code>haben</code>/<code>sein</code>) as one linked set — scored all-or-nothing. Filter by level and type; it defaults to the irregular, mixed and modal verbs actually worth memorising.',
      '<strong>Verb case government (Rektion).</strong> A new Verbs drill: for each verb, tap the case it governs — <em>Akkusativ</em>, <em>Dativ</em>, both, <em>Genitiv</em>, a reflexive pronoun, or no object.',
      '<strong>Fixed prepositions (Feste Präpositionen).</strong> A new drill on the Prepositions page, built on ~500 curated verb / adjective / noun + preposition collocations (<em>warten auf</em> + Akk., <em>Angst vor</em> + Dat.): type the governed preposition and pick its case.',
      '<strong>Fully offline, phone-first.</strong> All three run entirely on the device — no AI, no network, no API key — so you can load the app once and practise anywhere. They\'re built for the phone and are practice-only (they aren\'t recorded to your history or stats).'
    ]
  },
  {
    version: '1.11.18', date: '2026-06-14', kind: 'fix',
    title: 'Verbs · mobile fixes for the sentence & conjugation quizzes',
    notes: [
      '<strong>Hint reveals no longer get cut off on phones.</strong> In the verb <em>Satz</em> quiz, tapping a highlighted word to reveal its German could overflow the screen edge on a narrow display and get clipped. The reveal now wraps and stays within the viewport.',
      '<strong>The conjugation quiz fits a phone screen.</strong> The six-form input grid collapses to a single column on small screens, and the <em>→ expected answer</em> feedback drops onto its own full-width line, so long compound tenses (Plusquamperfekt, Passiv) are no longer cramped.',
      '<strong>Right-sized prompts.</strong> The English sentence in the verb <em>Satz</em> quiz now scales down on small screens instead of sitting at a fixed large size.'
    ]
  },
  {
    version: '1.11.17', date: '2026-06-13', kind: 'polish',
    title: 'Polish · page-load progress bar + a chime when AI quizzes are ready',
    notes: [
      '<strong>A progress bar while pages load.</strong> Moving between sections now shows a slim bar across the top of the app while the next page\'s code loads, so a slow or first-time navigation no longer looks frozen. It only appears if the load takes more than a moment (quick, cached navigations stay clean), and it respects <em>reduced motion</em>.',
      '<strong>A chime when a quiz is ready.</strong> When an AI-generated quiz finishes loading — the verb and preposition <em>Satz</em> drills, the declension article (KI) drill, adjectives, Konjunktiv and Passiv — a soft two-note chime signals it\'s ready to start. Handy when generation takes a while and you\'ve glanced away.',
      '<strong>Mute it any time.</strong> A new <em>Quiz-ready sound</em> switch in <em>Settings → Display</em> (on by default) turns the chime off, and your choice is remembered.'
    ]
  },
  {
    version: '1.11.16', date: '2026-06-13', kind: 'module',
    title: 'Verbs · sentence quiz: translate AI sentences, highlight every word, drill your weak verbs',
    notes: [
      '<strong>Translate AI-written sentences.</strong> A new <em>Satz (KI)</em> drill on the Verbs page: pick a verb pool (<em>level</em>, <em>type</em>, governed <em>case</em>) and a noun theme, choose how many verbs and nouns per sentence (1, 2, or mixed), and the AI writes everyday German sentences built around them. You\'re shown the English and type the German; the AI grades each answer and adds a short <em>tip</em> when you miss. (English → German; needs AI access.)',
      '<strong>See — and peek at — every word.</strong> With <em>Word hints</em> on, the English prompt highlights <em>every</em> verb and noun. Hover (or tap, or focus with the keyboard) to reveal the German: verb infinitives and <code>der/die/das</code> + noun for your theme words from the app\'s own data, and AI-supplied dictionary forms for the incidental words the sentence adds. Toggle hints off to translate unaided.',
      '<strong>Starts in seconds, not a minute.</strong> Sentences now <em>stream in</em> — the first appears almost immediately and the rest generate in the background while you answer (a brief <em>Preparing next…</em> only if you race ahead). Generation also rotates fresh framing per batch with a random seed, so repeated runs stop producing near-identical sentences.',
      '<strong>Drill what you get wrong.</strong> Each run records which verbs and nouns it tested and <em>why</em> an answer was wrong — <em>conjugation</em>, <em>case</em>, <em>word-order</em>, <em>noun</em> or <em>typo</em> — feeding a <em>Verb weak points</em> panel on your History page and a new <em>Practise weak verbs</em> drill that weights sentences toward the verbs and nouns you miss most.',
      '<strong>Lists remember your page size.</strong> Set a list to show 100 per page and it stays 100 the next time you open it — your <em>History</em>, <em>Manage nouns</em>, the version log and every quiz-result list each remember their own choice.'
    ]
  },
  {
    version: '1.11.15', date: '2026-06-13', kind: 'polish',
    title: 'Verbs · translation quiz: pick a direction, retry your misses, fairer grading',
    notes: [
      '<strong>Drill either direction.</strong> The verb <em>Übersetzung</em> quiz now has a <em>Direction</em> switch on Setup: <em>German → English</em> (type the meaning, as before) or <em>English → German</em> (you\'re shown the meaning and type the German infinitive). EN→DE grading is umlaut-strict — <code>hören</code>, not <code>horen</code> — and the <code>sich</code> on reflexive verbs is optional. Your choice is remembered and recorded with each run in your history.',
      '<strong>Retry the ones you missed.</strong> Finishing a verb translation quiz with mistakes now offers a focused <em>Retry N wrong</em> round — same prompt as the noun and preposition quizzes (press <em>Enter</em> to retry, <em>Esc</em> to review). It replays just the missed verbs in the same direction, and re-offers after each round until you\'ve nailed them all.',
      '<strong>Any one meaning counts.</strong> For verbs with several English meanings — <em>sich wenden</em> = <em>turn to / contact</em> — typing any single one is now accepted, and stray punctuation (a trailing period, surrounding quotes) no longer rejects an otherwise-correct answer.'
    ]
  },
  {
    version: '1.11.14', date: '2026-06-12', kind: 'fix',
    title: 'Quizzes · one Enter press no longer submits and advances at once',
    notes: [
      '<strong>Enter behaves again in typed quizzes.</strong> In the noun <em>Translation</em> quiz (and the adjective <em>Sentence</em> quiz), pressing <em>Enter</em> to submit also skipped straight to the next question — the graded answer flashed by before you could read it. Submitting now stays on the feedback; press <em>Enter</em> again (or click <em>Next</em>) when you\'re ready to move on.',
      '<strong>The cause:</strong> submitting moved focus to the <em>Next</em> button while the key was still held down, and the button reacted to the <em>release</em> of that same keystroke. The same trap existed for keyboard users in the gender picker and the remedial drill — removed there too.'
    ]
  },
  {
    version: '1.11.13', date: '2026-06-11', kind: 'module',
    title: 'Prepositions · weak-point tracking + remedial drill',
    notes: [
      '<strong>See which prepositions and nouns trip you up.</strong> The AI sentence-translation drill (English → German) now records, per sentence, the <em>preposition</em> and the <em>theme nouns</em> it tested and whether you got them right. Your <em>History</em> page gains a <em>Weakest prepositions / Weakest nouns</em> chart, and the Prepositions home shows a <em>Your weak points</em> card — both ranked by a score that weights your miss-rate by how often you’ve seen each word, so a single slip doesn’t dominate.',
      '<strong>Know <em>why</em> an answer was wrong.</strong> With <em>AI</em> grading, each missed sentence is tagged with what actually went wrong — <em>preposition</em> (wrong or missing word), <em>case</em> (the right preposition but the wrong governed case), <em>noun</em> (wrong word, gender or form), or <em>typo</em> (a slip elsewhere) — shown as chips and rolled up across your history. (Exact-match grading still records what you missed, just without the breakdown.)',
      '<strong>New drill — Schwachstellen (remedial).</strong> A generated mixed-format practice session aimed squarely at your weak points: case fill-ins, der/die/das + translation noun cards, and AI sentence translations, blended in proportion to your recent mistakes and seeded from the prepositions and nouns you miss most. Its own answers feed back into your weak-point tracking, so the list shrinks as you improve. (English → German; needs AI access.)'
    ]
  },
  {
    version: '1.11.12', date: '2026-06-06', kind: 'polish',
    title: 'Prepositions · sentence quiz: word hints with hover-to-reveal',
    notes: [
      '<strong>See what to translate.</strong> In the <em>Satzübersetzung</em> drill (English → German), the English prompt now highlights the <em>preposition</em> and your <em>theme nouns</em> in two distinct colours — so you can see at a glance which words the sentence is testing.',
      '<strong>Reveal the German on demand.</strong> Hover a highlight (or tap it on touch, or focus it with the keyboard) to reveal its German: the bare preposition (<code>auf</code>) or the noun’s dictionary form with its article (<code>der Tisch</code>). It’s a scaffold, not the answer — you still apply the case yourself (<em>auf den Tisch</em>).',
      '<strong>On by default, switch it off for a challenge.</strong> A new <em>Word hints</em> toggle on Setup (English → German only) is on by default; turn it off to translate unaided. Whether hints were on is recorded with each run in your history.'
    ]
  },
  {
    version: '1.11.11', date: '2026-06-05', kind: 'polish',
    title: 'Prepositions · sentence quiz: both directions + AI grading with tips',
    notes: [
      '<strong>Translate either way.</strong> The AI sentence-translation drill (<em>Satzübersetzung</em>) now lets you pick the direction in Setup: <em>English → German</em> (read the English, type the German — as before) or the new <em>German → English</em> (read the German, type the English). One direction per quiz.',
      '<strong>Choose how answers are graded.</strong> A new <em>Grading</em> switch offers <em>Exact match</em> — the instant local check that forgives only case, punctuation and spacing — or <em>AI</em>, where the model judges each answer, accepts valid alternative phrasings, and adds a short <em>tip</em> pinpointing what went wrong when you miss. The two switches are independent, so all four combinations work.',
      '<strong>Graceful under failure.</strong> AI grading runs one quick check per answer (with a brief <em>Checking…</em> state); if the grader is ever unreachable it silently falls back to the exact-match check so the quiz never stalls. Your chosen direction and grading mode are recorded in quiz history.'
    ]
  },
  {
    version: '1.11.10', date: '2026-06-02', kind: 'fix',
    title: 'Local Claude: faster, reliable generation + model & effort controls',
    notes: [
      '<strong>Fixed the timeouts and malformed responses.</strong> The local endpoint had been running the full Claude Code agent on every call (default system prompt, CLAUDE.md discovery, MCP servers, hooks, auto-memory) — slow enough to time out and variable enough to sometimes return the wrong JSON shape. It now runs <code>claude</code> lean: a minimal system prompt replacing the agentic one, MCP servers skipped (<code>--strict-mcp-config</code>), no session persistence, and a request timeout that returns a clear error instead of hanging. Typical generations dropped from ~12–14s to ~4–6s.',
      '<strong>Pick the model and effort.</strong> Settings → API → Local Claude now lets you choose the Claude model (<em>haiku</em> fastest · <em>sonnet</em> balanced · <em>opus</em> most capable) and an effort level (<em>low</em> … <em>max</em>) to trade speed for thoroughness. Both are validated against an allow-list before reaching the CLI, so nothing untrusted hits the command line.'
    ]
  },
  {
    version: '1.11.09', date: '2026-06-02', kind: 'module',
    title: 'Local Claude AI provider (dev only)',
    notes: [
      '<strong>Run the AI features through your Claude Code login — no API key.</strong> Settings → API now has an <em>AI provider</em> choice: <em>Gemini (API key)</em> or <em>Local Claude (dev)</em>. Pick Local Claude and every AI feature (sentence quiz, adjective sentences, declension-AI, Konjunktiv, Passiv, writing grader, level assessment, simulator) routes through a small local endpoint that runs the <code>claude</code> CLI on your machine — no key pasted anywhere.',
      '<strong>Dev-only by nature.</strong> The local endpoint only exists while you run the app with <code>npm run dev</code> (it’s a Vite dev-server middleware). The deployed site is a static bundle with no server, so it stays on Gemini — there the Local Claude option simply shows as <em>not reachable</em>. Selection is manual; nothing auto-switches.',
      '<strong>Under the hood.</strong> The browser talks only to <code>localhost</code>; the dev middleware runs <code>claude -p --output-format json</code> with your existing subscription (the API key is stripped from its environment to force subscription auth), and the prompt is piped via stdin so nothing untrusted reaches the command line.'
    ]
  },
  {
    version: '1.11.08', date: '2026-06-01', kind: 'module',
    title: 'Prepositions: AI sentence-translation quiz',
    notes: [
      '<strong>New drill — Satzübersetzung (AI).</strong> A fifth preposition exercise: pick the case(s) to drill and a <em>noun theme</em> (the same groups the noun quizzes use), choose how many sentences (<strong>10 / 15 / 20 / 25 / custom</strong>) and whether each sentence is built from <strong>1, 2, or a mix</strong> of nouns. The app picks that many prepositions at random (the same shuffler as everywhere else, repeating when you ask for more than exist), hands each one or two nouns from your theme, and Gemini writes an English + German sentence pair for it.',
      '<strong>You translate, it checks instantly.</strong> You work through the sentences one at a time: read the English, type the German, submit. Your answer is checked on the spot against the German reference generated up front — an exact match that forgives capitalization, punctuation and extra spaces — with instant ✓/✗ and the reference shown before you advance. No second AI round-trip at grading time.',
      '<strong>Retry-wrong loop + history.</strong> Finishing with misses pops the same focused retry modal as the other quizzes (<em>Enter</em> re-runs just the wrong ones, <em>Esc</em> reviews); retry rounds are practice only and are not written to history. Completed runs are logged under <em>Präposition · Satz (KI)</em>. Requires a Gemini API key in Settings.'
    ]
  },
  {
    version: '1.11.07', date: '2026-06-01', kind: 'polish',
    title: 'Verb translation hints are now in English',
    notes: [
      '<strong>Double-click hints, now in English.</strong> In the verb <em>Übersetzung</em> test, double-clicking a verb still swaps it for a hint — but the hint now reads in English instead of German. Double-click again to flip back to the verb. All <strong>378</strong> verbs have one.',
      '<strong>A clue, not the answer.</strong> Each hint reads like a crossword clue: it evokes the meaning through synonyms and context but never contains the verb’s own English translation, so it nudges your memory without handing you the word.'
    ]
  },
  {
    version: '1.11.06', date: '2026-05-29', kind: 'polish',
    title: 'Prepositions: full standard set · 400 two-way drills · retry modal everywhere · one-per-view case quiz',
    notes: [
      '<strong>Complete preposition set.</strong> Grew the list from 37 to <strong>69</strong> — added the full standard German dative tail (<em>entgegen, gemäß, samt, nebst, zuwider</em>) and the long genitive tail (<em>oberhalb, unterhalb, diesseits, jenseits, anlässlich, anstelle, zugunsten, anhand, angesichts, bezüglich, hinsichtlich, infolge, mittels, kraft, zwecks, ungeachtet, abseits, längs, unweit, seitens, mangels, einschließlich, inmitten, zeit…</em>), each with example sentences. (The 9 two-way <em>Wechselpräpositionen</em> were already the complete set.)',
      '<strong>Two-way decision drill: 108 → 400 examples.</strong> One exercise for every Switzerland noun (Matterhorn, Fondue, Alphorn, the cantons…) plus a balanced spread of everyday motion-vs-location sentences across all nine two-way prepositions. Globally de-duplicated and gender-checked.',
      '<strong>Retry your wrong answers — now in prepositions too.</strong> Finishing any preposition quiz (case, article-fill, or two-way) with misses pops a focused modal: <em>Enter</em> re-runs a round of just the ones you got wrong, <em>Esc</em> dismisses to review — repeating until none are left. Retry rounds are practice only and are not written to history. Same modal as the noun quizzes (now shared).',
      '<strong>"Which case?" quiz is one preposition per view.</strong> Instead of a long sheet of every preposition at once, you now get one card at a time with <code>1</code>–<code>4</code> keys and instant ✓/✗ feedback — matching the noun-quiz rhythm.'
    ]
  },
  {
    version: '1.11.05', date: '2026-05-29', kind: 'polish',
    title: 'Noun result: instant, keyboard-driven retry modal',
    notes: [
      'When a noun quiz finishes <em>with</em> wrong answers, a focused modal now pops up the moment the result page loads. Press <strong>Enter</strong> to launch a fresh round on just the missed nouns, or <strong>Esc</strong> to dismiss it and review the full list. The modal grabs keyboard focus on open, so the whole retry loop is playable without touching the mouse.',
      'An all-correct round never triggers the modal (you still get the <em>Alles richtig! 🎉</em> banner), and the inline <em>Retry N wrong</em> button stays available after you dismiss it.'
    ]
  },
  {
    version: '1.11.04', date: '2026-05-29', kind: 'polish',
    title: 'Noun retry-wrong loop · Fantasy & Switzerland categories · bigger, cleaner seed',
    notes: [
      '<strong>Retry your wrong answers.</strong> After finishing a noun quiz (gender <em>or</em> translation), the result page now offers <em>Retry N wrong</em> — it re-runs only the nouns you missed, reshuffled, and keeps re-offering after each round until none are left, then shows <em>Alles richtig! 🎉</em>. Retry rounds are practice only and are <strong>not</strong> written to your history, so they never skew your stats.',
      '<strong>Two new categories.</strong> <em>Fantasy</em> (178 nouns — <em>der Drache, die Hexe, der Zauberer, das Schwert, der Ritter, die Burg, das Einhorn</em>…) and <em>Switzerland</em> (159 nouns — cantons, peaks &amp; lakes, <em>das Fondue, die Rösti, das Alphorn, der Nationalrat</em>…). Both appear in the noun-quiz setup automatically.',
      '<strong>Bigger, cleaner seed.</strong> Added ~18 new nouns to every existing category (≈360 total) so even the thinnest groups are well-stocked, and stripped <strong>263 duplicate</strong> entries that had crept into the seed. The noun set is now <strong>2,104</strong> unique words, each with a verified <code>der/die/das</code> gender.',
      '<strong>Under the hood.</strong> New nouns reach existing installs via a schema <code>version(7)</code> top-up migration (any nouns you added yourself are left untouched), guarded by a test that fails on any duplicate or mis-categorised entry.'
    ]
  },
  {
    version: '1.11.03', date: '2026-05-25', kind: 'polish',
    title: 'History overhaul · AI level assessment · per-module stats',
    notes: [
      '<strong>Layout.</strong> The <em>Fortschritt</em> score-over-time line was cramped in a 3-column row — it now gets its own full-width hero panel above the editorial chart grid. Same for the <em>Verteilung</em> by-quiz-type panel. The redundant <em>"Aktivität · Last 30 days"</em> heatmap was removed (the full <em>Aktivität</em> calendar below covers the same ground), and the <em>"Rhythmus"</em> day-of-week × hour heatmap was removed entirely.',
      '<strong>AI Level Assessment.</strong> New panel between the top charts and the editorial grid. Click <em>Assess my level</em> and Gemini reviews your full history — runs per type, accuracy per CEFR level, per-module performance — and returns a CEFR estimate (A1–C2) with confidence, a German one-line summary, 3–5 strengths, 3–5 weaknesses, 3–5 next steps, and a per-module score breakdown. Cached in <code>localStorage</code> with a history signature so re-opening the page doesn\'t re-spend the API call; <em>Refresh</em> button when the cache is stale. Requires ≥3 finished quizzes.',
      '<strong>Per-module stats.</strong> Four new panels below the editorial grid surface metrics that were hidden in raw <code>meta</code> fields: <em>Konjunktiv I</em> (accuracy by difficulty + per-topic bars), <em>Passiv</em> (per-transformation-type bars built from <code>passivPerTypeCorrect</code> — finally shows which of the six transformations is your weak spot), <em>Writing</em> (drafts graded, avg/best score, band distribution chips, per-task-type avg score, score-over-time when ≥2 graded drafts), <em>Simulator C1</em> (attempts, pass rate, avg combined, T1-vs-T2 comparison, last-5-attempts table).',
      '<strong>Score thresholds.</strong> Accuracy charts colour at sage ≥80% · ochre 50–79% · clay below. Writing / simulator score charts use the passing-mark thresholds instead: sage ≥60 · ochre 40–59 · clay below.'
    ]
  },
  {
    version: '1.11.02', date: '2026-05-25', kind: 'polish',
    title: 'AI randomizer extended to the last missed generator',
    notes: [
      'Audited every Gemini call in the codebase. Four sentence generators were already randomized in <code>1.11.01</code>; one was missed: the <em>"Upgrade paragraph"</em> action in the Writing editor / Simulator C1 review.',
      'That call now picks 3 random rhetorical strategies per click from a pool of twelve (Nominalisierung · Hypotaxe · Funktionsverbgefüge · Passiv · Partizipialphrasen · gehobene Synonyme · fachregisterspezifische Lexik · Genitivattribute · …) plus a unique variation seed, and runs at <code>temperature: 0.75</code> / <code>topP: 0.95</code> (was <code>0.2</code> / no seed).',
      'Effect: clicking <em>Upgrade</em> twice on the same paragraph now produces two genuinely different C1 rewrites instead of nearly identical ones — useful when the first variant feels stylistically off.'
    ]
  },
  {
    version: '1.11.01', date: '2026-05-25', kind: 'polish',
    title: 'AI randomizer · sticky header · smaller noun min · seed-data growth',
    notes: [
      'AI sentence generators (declension article-fill, Konjunktiv I, Passiv, adjective sentences) now seed every batch with a random scenario / subject / domain pool and a unique variation token. Temperature bumped to <code>0.85–0.9</code> with <code>topP=0.95</code>, so two consecutive runs at the same difficulty produce visibly different sentences instead of the same templated set.',
      'Sticky header now actually sticks on mobile: <code>html, body { overflow-x: hidden }</code> was creating a scroll containing block that trapped <code>position: sticky</code>. Switched to <code>overflow-x: clip</code>, which keeps overflowing children clipped without breaking the sticky nav.',
      'Noun runner minimum prompt size dropped from <code>48</code>px to <code>24</code>px (default also moved to 24, Compact preset retuned). Long compound nouns like <em>Sehenswürdigkeiten</em> now fit on a single line on a 360 px phone instead of breaking onto two.',
      'Seed-data expansion: prepositions <strong>96 → 400</strong> themed example sentences across office / sport / eating / dieting / vacations / work / corporate. Declension article-fill <strong>80 → 500</strong> across vacation / work / food / sport / eating / fantasy / office / climbing / Switzerland themes.'
    ]
  },
  {
    version: '1.11.00', date: '2026-05-25', kind: 'module',
    title: 'Simulator C1 · Goethe Schreiben mock exam',
    notes: [
      'Full 75-minute timed simulator wrapping two writing tasks (<em>Forumsbeitrag</em> + <em>formelle E-Mail</em>) under one countdown — the Goethe-Zertifikat C1 Schreiben module on paper.',
      'Run page: side-by-side tabs, per-task autosave, single Submit button that grades both drafts at once (or auto-submits the moment the timer expires).',
      'Result page: per-task score + band, combined score weighted <code>0.6 / 0.4</code>, pass mark <code>60 / 100</code>, durable history-saved flag so re-opening the result page doesn\'t double-log to history.',
      'Home tile shows in-progress / submitted / graded / abandoned sessions and lets you resume, abandon, or start a fresh exam.'
    ]
  },
  {
    version: '1.10.00', date: '2026-05-25', kind: 'module',
    title: 'Writing module · LLM-graded drafts',
    notes: [
      '<strong>Six task types</strong>: Forumsbeitrag (Goethe C1, ~230 W) · formelle E-Mail (Goethe C1, ~120 W) · argumentativer Aufsatz · Grafik-Beschreibung (telc C1) · Zusammenfassung · Stellungnahme.',
      '12 seeded prompts (2 per task type) with full task context, target word counts, and suggested minutes.',
      'Editor surface with draft autosave + grade trigger; review mode shows the rubric panel, inline criterion notes, and per-paragraph upgrade suggestions.',
      'Goethe C1 + telc C1 rubrics built in. Draft comparison page diffs two drafts side-by-side so you can see exactly what changed between revisions.'
    ]
  },
  {
    version: '1.09.00', date: '2026-05-25', kind: 'module',
    title: 'Passiv module · six transformation types',
    notes: [
      'Active → passive (and passive-alternative) drill. Six target types: <em>Vorgangspassiv</em> (werden + Part. II) · <em>Zustandspassiv</em> (sein + Part. II) · <em>sich-lassen</em> + Inf. · <em>sein + zu</em> + Inf. · <em>-bar/-lich</em> Adjektiv · <em>man-Konstruktion</em>.',
      'Difficulty: <em>Easy · B1</em> (simple transitive present) · <em>Medium · B2</em> (past tenses, dative, separables) · <em>Hard · C1</em> (subordinate clauses, modals, sich-lassen/man focus).',
      'Generator declares which transformations are <code>legalTypes</code> for each source verb; the target the learner must produce is chosen from that legal set. LLM judge identifies which type the learner actually produced and flags type mismatches as <em>partially correct</em>.',
      'Per-type breakdown on the result page so you can see where you confused Vorgangspassiv with Zustandspassiv.'
    ]
  },
  {
    version: '1.08.00', date: '2026-05-25', kind: 'module',
    title: 'Konjunktiv I module · Indirekte Rede',
    notes: [
      'Quote-rewrite drill: read a direct quotation (<code>Der Minister sagte: „…"</code>), produce the indirect-speech form with Konjunktiv I (or the Konjunktiv II fallback when K-I collides with the indicative — typical for plurals and 1st-person).',
      'Difficulty: <em>Easy · B1</em> (simple SVO, er/sie/es) · <em>Medium · B2</em> (mixed subjects forcing K-II fallback) · <em>Hard · C1</em> (news register, subordinate clauses, modals, time shifts).',
      'Topics: Politik · Wirtschaft · Wissenschaft · Sport · Kultur — pick a subset or take a mix.',
      'LLM judge reports the mood the learner actually used (<code>K1 / K2 / indicative / other</code>) plus whether that choice was appropriate, so wrong-mood answers get explained, not just marked wrong.'
    ]
  },
  {
    version: '1.07.03', date: '2026-05-24', kind: 'polish',
    title: 'Default prompt sizes lowered to the minimum',
    notes: [
      'Out-of-the-box prompt sizes now default to the lowest available value for each quiz, so more content fits on screen without scrolling.',
      'New defaults: verb worksheet <code>18</code>px (was 26) · noun runner <code>48</code>px (was 92) · adjective runner <code>22</code>px (was 36) · declension runner <code>32</code>px (was 56).',
      'Existing users keep their saved size — only first-time installs and explicit resets see the new defaults.',
      'Preset chips renamed: Compact / Medium / Large (the previous "Default" preset now sits in the middle as "Medium").'
    ]
  },
  {
    version: '1.07.02', date: '2026-05-24', kind: 'polish',
    title: 'Loading mask + toast notifications',
    notes: [
      'Global full-page loading mask with pulsing accent dots shown during slow operations (Gemini calls for both the declension AI mode and the adjective sentence quiz). Title + subtitle explain what is happening.',
      'Toast notification stack in the top-right (bottom on phones) for success/info/error messages. Errors get 6s dwell, others 4s; manual dismiss via × always available.',
      'AI generation errors now surface as toasts in addition to the inline danger alert, so they are visible even if you have scrolled down.',
      'New "Heads up" warning alert on the article-fill AI setup and the adjective setup: <strong>Gemini takes 1–3 minutes</strong> to return a batch — don\'t close the tab while the loader is up.'
    ]
  },
  {
    version: '1.07.01', date: '2026-05-24', kind: 'polish',
    title: 'Declension · article-fill AI mode',
    notes: [
      'New <strong>Source · AI · Live</strong> toggle on the article-fill setup page calls Gemini to generate fresh sentences.',
      'Difficulty levels: <em>Easy</em> (A1–A2, 1–2 blanks, def/indef only) · <em>Medium</em> (B1, 2–3 blanks, +possessive) · <em>Hard</em> (B2–C1, 3–4 blanks, +genitive constructions).',
      'Each sentence supports multiple blanks; the runner interleaves inputs at every <code>___</code> in the template and grades them all at once.',
      'Anti-fabrication: 5-stage validation per entry (structural sanity · blanks-count match · sentence reconstruction · enum validity · strict definite/indefinite article-form lookup). Failing entries are dropped and the model is asked again, up to 2 retries.',
      'Per-blank rationale shown after submit so the learner sees <em>why</em> each case applies.',
      'AI runs land in history as <code>decl-article-ai</code> with the difficulty and average blank-count recorded.'
    ]
  },
  {
    version: '1.07.00', date: '2026-05-24', kind: 'module',
    title: 'Declension v2 · Pronouns & Case recognition',
    notes: [
      'New pronoun-forms drill — produce all four case forms for personal, possessive, and reflexive pronouns (4-row table layout, parallel to the decline-the-phrase quiz).',
      'New case-recognition drill — read a sentence with a highlighted noun phrase, pick the case it is in (single-card multiple choice with <code>1</code>–<code>4</code> hotkeys).',
      'Declension landing grows from 4 cards to 6.'
    ]
  },
  {
    version: '1.06.04', date: '2026-05-24', kind: 'polish',
    title: 'Pagination across long lists',
    notes: [
      'Reusable <code>Pagination</code> component with page-size selector (10 / 25 / 50 / 100).',
      'Applied to: version changelog, Manage Nouns, History table, all result lists.',
      'The verb translation worksheet keeps the single-view layout — by design.'
    ]
  },
  {
    version: '1.06.03', date: '2026-05-24', kind: 'polish',
    title: 'Version page · changelog',
    notes: [
      'New About · Version page accessible from the nav header (badge) and the mobile drawer.',
      'Changelog seeded with the full design history.',
      'Each commit going forward bumps the patch (or higher) and lands here.'
    ]
  },
  {
    version: '1.06.02', date: '2026-05-24', kind: 'polish',
    title: 'Declension prompt-size slider',
    notes: [
      'Fourth slider in Settings · Display · Sizes for the declension drills.',
      'New <code>--decl-prompt-size</code> CSS variable wired into all three declension runners.'
    ]
  },
  {
    version: '1.06.01', date: '2026-05-24', kind: 'fix',
    title: 'Mobile UI overhaul',
    notes: [
      'No more horizontal scroll on any route — page max-width 100% with min-width: 0 cascade.',
      'Settings rail is a 2×2 card grid on mobile (was a horizontal-scrolling pill strip).',
      'Two-line CTA buttons on long action labels.',
      'Continuous quiz-meter for runs with more than 25 questions.',
      'Noun + verb result pages redesigned with red/green row stamps.'
    ]
  },
  {
    version: '1.06.00', date: '2026-05-24', kind: 'module',
    title: 'Declension module',
    notes: [
      'Three drills: decline-the-phrase (4-row case table), article-in-context, adjective endings.',
      '190 curated examples across A1–B2 (30 tables + 80 article-fill + 80 adjective endings).',
      'Tables-reference page with the six canonical declension tables.'
    ]
  },
  {
    version: '1.05.01', date: '2026-05-24', kind: 'polish',
    title: 'Keyboard shortcuts in Prepositions · which-case',
    notes: [
      'Press <code>1</code>–<code>4</code> to pick the case for the focused row.',
      'Tab / Shift-Tab navigate between rows; case buttons are no longer in the tab order.'
    ]
  },
  {
    version: '1.05.00', date: '2026-05-24', kind: 'module',
    title: 'Prepositions module',
    notes: [
      '37 curated prepositions across A1–B2 with ~90 example sentences.',
      'Three drills: which-case (test-sheet), article-fill, two-way decision (acc vs dat).',
      'Browse table with case-colored tags.'
    ]
  },
  {
    version: '1.04.03', date: '2026-05-23', kind: 'polish',
    title: 'Quiz history · stats dashboard',
    notes: [
      '14 charts powered by ECharts: activity calendar, accuracy trend, cumulative progress, type distribution radar, etc.',
      'Editorial 3-panel summary row at the top of <code>/history</code>.',
      'Secondary stat strip with streak, best run, days active, avg duration, most-practiced type.'
    ]
  },
  {
    version: '1.04.02', date: '2026-05-23', kind: 'polish',
    title: 'Settings · Daten tab + tabbed layout',
    notes: [
      'Settings becomes a four-tab layout — API · Display · Palette · Data.',
      'JSON export/import for every preference, palette, and the full quiz history.'
    ]
  },
  {
    version: '1.04.01', date: '2026-05-22', kind: 'polish',
    title: 'Palette overrides per theme',
    notes: [
      'Settings · Farben lets you override each of the 12 design tokens, per-theme.',
      'JSON import &amp; export.'
    ]
  },
  {
    version: '1.04.00', date: '2026-05-22', kind: 'module',
    title: 'History module',
    notes: [
      'Quiz history records every completed run with score, duration, and per-question breakdown.',
      'Per-quiz-type filter; live-saved to localStorage capped at 100 entries.'
    ]
  },
  {
    version: '1.03.01', date: '2026-05-22', kind: 'polish',
    title: 'Verb-tip double-click + parenthetical acceptance',
    notes: [
      'Double-click any verb in the translation worksheet to swap it with a German tip.',
      'Acceptance strips <code>(…)</code> parentheticals so typing one word matches multi-meaning verbs.'
    ]
  },
  {
    version: '1.03.00', date: '2026-05-22', kind: 'module',
    title: 'Adjectives module',
    notes: [
      'Third vocabulary module — Gemini-generated sentence fill with the inflected adjective blanked.',
      'Group filters + case-aware acceptance.'
    ]
  },
  {
    version: '1.02.01', date: '2026-05-21', kind: 'polish',
    title: 'Conjugation cheatsheet + verb runner test-sheet',
    notes: [
      'Long-form verb cheatsheet — twelve chapters of conjugation tables, drop-caps, exception callouts.',
      'Verb translation moved to a worksheet layout (all-at-once submit).'
    ]
  },
  {
    version: '1.02.00', date: '2026-05-21', kind: 'module',
    title: 'Verbs module',
    notes: [
      '378 verbs across A1–B2 with full conjugations in 15 tenses.',
      'Translation drill + conjugation drill + browse table + cheatsheet.'
    ]
  },
  {
    version: '1.01.00', date: '2026-05-18', kind: 'module',
    title: 'Nouns module',
    notes: [
      'First vocabulary module — der/die/das gender drill + English translation drill.',
      '1407 curated nouns across 20 groups.'
    ]
  },
  {
    version: '1.00.00', date: '2026-05-17', kind: 'major',
    title: 'Grammatik-Atelier · initial release',
    notes: [
      'Editorial design system — Fraunces display, Source Serif 4 body, JetBrains Mono accents.',
      'Light + dark themes; sage/clay/ochre/cobalt accent palette.',
      'Vue 3 + TS + Vite scaffolding with IndexedDB-backed nouns/adjectives.'
    ]
  }
]
