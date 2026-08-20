//
// Schreiben Teil 2 — the Schreibauftrag pool. See CONTEXT.md → "Schreibauftrag".
//
// A Schreibauftrag is the task sheet a Nachricht answers: a workplace or
// education situation, the Empfänger the message goes to (name and role — what
// the Anrede must fit), the exam's own instruction, and its own four
// Inhaltspunkte with situation-flavored wording (CONTEXT.md → "Inhaltspunkt").
// Unlike a Schreibthema it is not controversial and takes no sides — it is a
// situational assignment, which is what makes Teil 2 interaction rather than
// argument.
//
// Every Auftrag carries exactly one Schreibanlass — the communicative occasion
// it is written for. The Anlass is structural here, not a study lens like Teil
// 1's Aufgabenmuster: it is stored on seeded and AI-generated Aufträge alike,
// required in the generator contract, a Setup filter, and the key that picks
// the Musternachricht and the Inhalts-Baukasten fallback (ADR-0023). It is
// never a grading input.
//
// This file holds the 40 seeded Aufträge only — eight per Anlass, so the pool
// stays balanced across the five occasions; adding a seed is a code change.
// AI-generated Aufträge are a separate, learner-owned pool that persists in
// localStorage rather than Dexie — mirroring schreibenThemen.ts's convention —
// so `source: 'custom'` marks Aufträge that never live in this array.

/** The five communicative occasions. Shared slugs — renaming one is a data migration (ADR-0023). */
export const SCHREIB_ANLAESSE = ['entschuldigung', 'bitte', 'beschwerde', 'vorschlag', 'dank'] as const
export type SchreibAnlass = (typeof SCHREIB_ANLAESSE)[number]

export const ANLASS_LABEL: Record<SchreibAnlass, { de: string; en: string }> = {
  entschuldigung: { de: 'Entschuldigung & Absage', en: 'Apology & cancellation' },
  bitte: { de: 'Bitte & Anfrage', en: 'Request & enquiry' },
  beschwerde: { de: 'Beschwerde & Problem melden', en: 'Complaint & reporting a problem' },
  vorschlag: { de: 'Vorschlag & Anregung', en: 'Suggestion & initiative' },
  dank: { de: 'Dank & Rückmeldung', en: 'Thanks & feedback' }
}

export interface Schreibauftrag {
  id: string                   // 'wa-<slug>' | custom: 'wa-custom-<epoch>-<i>'
  titleDe: string              // short unique label — the done-auftrag memory key
  situationDe: string          // 1-2 sentences: the workplace/course situation
  empfaengerName: string       // 'Frau Kling' / 'Herr Semder' — what the Anrede must contain
  empfaengerRolleDe: string    // 'Ihre Vorgesetzte', 'Ihr Kursleiter', …
  taskDe: string               // exam instruction, starts with NACHRICHT_TASK_PREFIX, names the 100-word floor
  inhaltspunkte: string[]      // exactly four, situation-flavored (CONTEXT.md → "Inhaltspunkt")
  anlass: SchreibAnlass        // exactly one — structural (ADR-0023)
  level: 'B2'
  source: 'seed' | 'custom'
}

/** The exam's own opening words. A Schreibauftrag's taskDe always starts here. */
export const NACHRICHT_TASK_PREFIX = 'Schreiben Sie eine Nachricht'

export const A = (
  id: string, titleDe: string, anlass: SchreibAnlass, empfaengerName: string,
  empfaengerRolleDe: string, situationDe: string, taskDe: string, inhaltspunkte: string[]
): Schreibauftrag => ({
  id, titleDe, situationDe, empfaengerName, empfaengerRolleDe, taskDe, inhaltspunkte,
  anlass, level: 'B2', source: 'seed'
})

export const SCHREIBEN_AUFTRAEGE: Schreibauftrag[] = [
  // — Entschuldigung & Absage —
  A('wa-besprechung-absagen', 'Absage einer Besprechung', 'entschuldigung',
    'Herr Semder', 'Ihr Abteilungsleiter',
    'Ihr Abteilungsleiter, Herr Semder, hat Sie zu einer wichtigen Team-Besprechung am Freitag eingeladen. Am selben Tag haben Sie einen unaufschiebbaren Arzttermin.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihren Abteilungsleiter, Herrn Semder.',
    [
      'Entschuldigen Sie sich höflich, dass Sie nicht an der Besprechung teilnehmen können.',
      'Erklären Sie den Grund für Ihre Absage.',
      'Schlagen Sie vor, wie Sie die Inhalte der Besprechung nachholen können.',
      'Bitten Sie um die Unterlagen oder das Protokoll.'
    ]),
  A('wa-fortbildung-krank', 'Krankmeldung zur Fortbildung', 'entschuldigung',
    'Frau Berger', 'Ihre Ansprechpartnerin in der Personalabteilung',
    'Sie sind für eine zweitägige Fortbildung zum Projektmanagement angemeldet, die morgen beginnt. Seit gestern liegen Sie mit hohem Fieber im Bett und sind krankgeschrieben.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihre Ansprechpartnerin in der Personalabteilung, Frau Berger.',
    [
      'Melden Sie sich von der Fortbildung ab und entschuldigen Sie sich für die kurzfristige Absage.',
      'Schildern Sie, warum Ihnen eine Teilnahme gesundheitlich nicht möglich ist.',
      'Fragen Sie nach einem Ersatztermin im nächsten Halbjahr.',
      'Sichern Sie zu, das ärztliche Attest bis Ende der Woche nachzureichen.'
    ]),
  A('wa-projekt-verspaetung', 'Verspätete Abgabe', 'entschuldigung',
    'Frau Weber', 'Ihre Projektleiterin',
    'Sie sollen Ihrer Projektleiterin den Zwischenbericht bis Montag vorlegen. Wichtige Zahlen aus einer anderen Abteilung fehlen Ihnen noch, deshalb schaffen Sie den Termin nicht.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihre Projektleiterin, Frau Weber, und gehen Sie auf die verspätete Abgabe des Zwischenberichts ein.',
    [
      'Kündigen Sie an, dass sich die Abgabe des Zwischenberichts verzögert, und entschuldigen Sie sich dafür.',
      'Erläutern Sie, welche Zuarbeit Ihnen bisher fehlt.',
      'Nennen Sie einen realistischen neuen Abgabetermin.',
      'Bieten Sie an, die fertigen Kapitel schon vorab zu schicken.'
    ]),
  A('wa-kurs-fehlen', 'Fehlen im Deutschkurs', 'entschuldigung',
    'Herr Roth', 'Ihr Kursleiter',
    'Sie besuchen einen Abendkurs Deutsch auf dem Niveau B2. In der kommenden Woche müssen Sie beruflich verreisen und können an drei Kursabenden nicht teilnehmen.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihren Kursleiter, Herrn Roth, und melden Sie sich für die kommende Woche ab.',
    [
      'Teilen Sie mit, an welchen Abenden Sie fehlen werden, und entschuldigen Sie sich dafür.',
      'Begründen Sie Ihre Abwesenheit mit Ihrer beruflichen Reise.',
      'Bitten Sie um die Arbeitsblätter und die Hausaufgaben der versäumten Stunden.',
      'Versichern Sie, den verpassten Stoff selbstständig nachzuarbeiten.'
    ]),
  A('wa-vorstellungsgespraech-verschieben', 'Vorstellungsgespräch verschieben', 'entschuldigung',
    'Frau Ritter', 'die Personalreferentin des Unternehmens',
    'Sie sind für Donnerstag zu einem Vorstellungsgespräch eingeladen, über das Sie sich sehr gefreut haben. Nun ist Ihr Kind erkrankt, und die Betreuung lässt sich an diesem Tag nicht anders organisieren.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an die Personalreferentin des Unternehmens, Frau Ritter, und bitten Sie um einen neuen Termin für das Vorstellungsgespräch.',
    [
      'Sagen Sie den vereinbarten Termin ab und entschuldigen Sie sich für die kurzfristige Nachricht.',
      'Erklären Sie, warum Sie am Donnerstag verhindert sind.',
      'Betonen Sie Ihr weiterhin großes Interesse an der Stelle.',
      'Bitten Sie um einen Ersatztermin und nennen Sie Tage, an denen Sie verfügbar sind.'
    ]),
  A('wa-praesentation-absagen', 'Absage der Seminarpräsentation', 'entschuldigung',
    'Herr Baumann', 'Ihr Dozent',
    'In Ihrem Fachseminar sollen Sie am Dienstag Ihre Präsentation über Ihr Projekt halten. Wegen einer starken Erkältung haben Sie Ihre Stimme fast vollständig verloren und sind krankgeschrieben.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihren Dozenten, Herrn Baumann, und sagen Sie Ihre Präsentation am Dienstag ab.',
    [
      'Sagen Sie Ihre Präsentation ab und entschuldigen Sie sich für die kurzfristige Absage.',
      'Schildern Sie, warum Sie am Dienstag nicht vortragen können.',
      'Schlagen Sie einen neuen Termin oder eine Ersatzleistung vor.',
      'Bieten Sie an, Ihre Folien vorab an die Seminargruppe zu schicken.'
    ]),
  A('wa-verspaetung-inventur', 'Verspätung wegen Zugausfall', 'entschuldigung',
    'Herr Hartmann', 'Ihr Teamleiter',
    'Morgen beginnt in Ihrer Filiale um sieben Uhr die Jahresinventur, bei der jede Hilfe gebraucht wird. Wegen eines angekündigten Bahnstreiks fährt Ihr Zug nicht, und Sie kommen frühestens gegen zehn Uhr an.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihren Teamleiter, Herrn Hartmann, und kündigen Sie Ihre Verspätung zur Inventur an.',
    [
      'Kündigen Sie Ihre Verspätung an und entschuldigen Sie sich dafür.',
      'Erklären Sie, warum Sie morgen nicht pünktlich sein können.',
      'Beschreiben Sie, wie Sie versuchen, trotzdem so früh wie möglich zu kommen.',
      'Bieten Sie an, am Abend länger zu bleiben und die fehlende Zeit nachzuholen.'
    ]),
  A('wa-festkomitee-ruecktritt', 'Rückzug aus dem Festkomitee', 'entschuldigung',
    'Frau Kaiser', 'die Organisatorin des Sommerfests',
    'Sie haben sich freiwillig gemeldet, das Sommerfest Ihrer Firma mitzuorganisieren. Nun wurde Ihnen kurzfristig ein zeitintensives Projekt übertragen, sodass Sie die Aufgabe im Festkomitee nicht mehr zuverlässig erfüllen können.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an die Organisatorin des Sommerfests, Frau Kaiser, und ziehen Sie sich aus dem Festkomitee zurück.',
    [
      'Sagen Sie Ihre Mitarbeit im Festkomitee ab und entschuldigen Sie sich dafür.',
      'Begründen Sie Ihren Rückzug mit Ihrer neuen Aufgabe.',
      'Schlagen Sie eine Kollegin oder einen Kollegen als Ersatz vor.',
      'Bieten Sie an, eine kleine Aufgabe am Festtag selbst zu übernehmen.'
    ]),

  // — Bitte & Anfrage —
  A('wa-homeoffice-antrag', 'Bitte um Homeoffice', 'bitte',
    'Frau Kling', 'Ihre Vorgesetzte',
    'Sie arbeiten in Vollzeit im Büro. Aus familiären Gründen möchten Sie künftig zwei Tage pro Woche von zu Hause arbeiten.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihre Vorgesetzte, Frau Kling.',
    [
      'Nennen Sie Ihr Anliegen und beziehen Sie sich auf Ihre Situation.',
      'Begründen Sie, warum das Homeoffice für Sie wichtig ist.',
      'Erklären Sie, wie Sie Ihre Aufgaben von zu Hause zuverlässig erledigen.',
      'Bitten Sie um ein Gespräch oder eine Rückmeldung.'
    ]),
  A('wa-infos-konferenz', 'Bitte um Informationen zur Konferenz', 'bitte',
    'Herr Maurer', 'der Organisator der Konferenz',
    'Ihr Betrieb schickt Sie zu einer Fachkonferenz nach Leipzig. Auf der Internetseite fehlen Angaben zum Programm, zur Anmeldung und zu den Übernachtungsmöglichkeiten.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an den Organisator der Konferenz, Herrn Maurer.',
    [
      'Stellen Sie sich kurz vor und nennen Sie den Grund Ihrer Anfrage.',
      'Erklären Sie, welche Angaben Sie für die Anmeldung Ihres Betriebs benötigen.',
      'Bitten Sie um das ausführliche Programm und um eine Liste der Hotels in der Nähe.',
      'Nennen Sie den Termin, bis zu dem Sie die Auskunft brauchen.'
    ]),
  A('wa-urlaub-verschieben', 'Bitte um Urlaubsverschiebung', 'bitte',
    'Frau Steiner', 'Ihre Teamleiterin',
    'Ihr Urlaub ist für Juli bereits genehmigt. Weil die Hochzeit Ihrer Schwester nun in den September fällt, möchten Sie zwei Urlaubswochen verschieben.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihre Teamleiterin, Frau Steiner, und bitten Sie um eine Änderung Ihrer genehmigten Urlaubszeit.',
    [
      'Beziehen Sie sich auf Ihren bereits genehmigten Urlaub im Juli.',
      'Legen Sie dar, warum Sie die Termine gern tauschen möchten.',
      'Bitten Sie darum, zwei Wochen in den September zu verlegen.',
      'Zeigen Sie auf, wie Ihre Arbeit während Ihrer Abwesenheit verteilt werden kann.'
    ]),
  A('wa-empfehlung-praktikum', 'Bitte um ein Empfehlungsschreiben', 'bitte',
    'Frau Lang', 'Ihre Dozentin',
    'Sie bewerben sich um ein Praktikum in einem Verlag. Die Bewerbung verlangt eine Empfehlung, und Ihre Dozentin kennt Ihre Arbeiten aus zwei Seminaren.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihre Dozentin, Frau Lang, und bitten Sie um ein Empfehlungsschreiben für Ihre Bewerbung.',
    [
      'Erinnern Sie daran, welche Seminare Sie bei ihr besucht haben.',
      'Beschreiben Sie das Praktikum, für das Sie sich bewerben.',
      'Bitten Sie höflich um das Empfehlungsschreiben und nennen Sie die Bewerbungsfrist.',
      'Bieten Sie an, Ihre Unterlagen und eine Übersicht Ihrer Seminararbeiten zu schicken.'
    ]),
  A('wa-arbeitszeugnis', 'Bitte um ein Arbeitszeugnis', 'bitte',
    'Frau Ebert', 'die Leiterin der Personalabteilung',
    'Sie verlassen Ihr Unternehmen zum Ende des Monats, weil Sie in eine andere Stadt ziehen. Für Ihre Bewerbungen dort benötigen Sie ein qualifiziertes Arbeitszeugnis.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an die Leiterin der Personalabteilung, Frau Ebert, und bitten Sie um ein qualifiziertes Arbeitszeugnis.',
    [
      'Nennen Sie Ihr Anliegen und beziehen Sie sich auf Ihren Austritt zum Monatsende.',
      'Erinnern Sie an Ihre wichtigsten Aufgaben und Projekte im Unternehmen.',
      'Nennen Sie den Termin, bis zu dem Sie das Zeugnis benötigen.',
      'Bieten Sie an, eine Übersicht Ihrer Tätigkeiten zuzusenden.'
    ]),
  A('wa-frist-hausarbeit', 'Bitte um Fristverlängerung', 'bitte',
    'Frau Krüger', 'Ihre Dozentin',
    'Ihre Hausarbeit im Seminar ist bis zum 15. des Monats fällig. Sie waren zwei Wochen krank und konnten in dieser Zeit weder recherchieren noch schreiben.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihre Dozentin, Frau Krüger, und bitten Sie um eine Verlängerung der Abgabefrist für Ihre Hausarbeit.',
    [
      'Beziehen Sie sich auf die Abgabefrist und nennen Sie Ihr Anliegen.',
      'Begründen Sie Ihre Bitte mit Ihrer Erkrankung.',
      'Beschreiben Sie den aktuellen Stand Ihrer Arbeit.',
      'Schlagen Sie einen neuen Abgabetermin vor und bieten Sie ein ärztliches Attest an.'
    ]),
  A('wa-ratenzahlung', 'Bitte um Ratenzahlung', 'bitte',
    'Herr Peters', 'der Verwaltungsleiter der Sprachschule',
    'Sie möchten nach Ihrer B2-Prüfung den C1-Kurs an Ihrer Sprachschule besuchen. Wegen einer unerwarteten Autoreparatur können Sie die Kursgebühr in diesem Monat nicht auf einmal bezahlen.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an den Verwaltungsleiter der Sprachschule, Herrn Peters, und bitten Sie um eine Ratenzahlung der Kursgebühr.',
    [
      'Nennen Sie Ihr Anliegen und den Kurs, für den Sie sich anmelden möchten.',
      'Erklären Sie, warum Sie die Gebühr zurzeit nicht auf einmal zahlen können.',
      'Schlagen Sie einen konkreten Ratenplan vor.',
      'Bitten Sie um eine kurze schriftliche Bestätigung der Vereinbarung.'
    ]),
  A('wa-schichttausch', 'Bitte um einen Schichttausch', 'bitte',
    'Herr Nowak', 'Ihr Schichtleiter',
    'Laut Dienstplan arbeiten Sie am kommenden Samstag in der Frühschicht. An diesem Vormittag legen Sie jedoch Ihre B2-Prüfung ab, deren Termin Sie nicht beeinflussen können.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihren Schichtleiter, Herrn Nowak, und bitten Sie um einen Tausch Ihrer Samstagsschicht.',
    [
      'Nennen Sie Ihr Anliegen und beziehen Sie sich auf den aktuellen Dienstplan.',
      'Begründen Sie Ihre Bitte mit Ihrem Prüfungstermin.',
      'Teilen Sie mit, dass eine Kollegin bereit ist, die Schicht zu übernehmen.',
      'Bitten Sie um die Genehmigung des Tauschs und um eine kurze Rückmeldung.'
    ]),

  // — Beschwerde & Problem melden —
  A('wa-kantine-qualitaet', 'Beschwerde über die Kantine', 'beschwerde',
    'Herr Vogel', 'der Verwaltungsleiter',
    'Seit dem Wechsel des Anbieters ist das Essen in der Betriebskantine oft kalt, und vegetarische Gerichte gibt es kaum noch. Auch die Wartezeiten sind deutlich länger geworden.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an den Verwaltungsleiter Ihres Unternehmens, Herrn Vogel.',
    [
      'Nennen Sie den Anlass Ihrer Beschwerde und beziehen Sie sich auf den Wechsel des Anbieters.',
      'Schildern Sie sachlich, was Ihnen beim Essen und bei den Wartezeiten auffällt.',
      'Machen Sie deutlich, welche Folgen das für Ihre Mittagspause hat.',
      'Fordern Sie höflich eine Verbesserung des Angebots und bitten Sie um eine Antwort.'
    ]),
  A('wa-it-probleme', 'Störungen im IT-System', 'beschwerde',
    'Frau Brandt', 'die IT-Leiterin',
    'Seit dem letzten Update stürzt das Kundenprogramm mehrmals täglich ab. Ihre Abteilung verliert dadurch Arbeitszeit, und Kundendaten müssen doppelt eingegeben werden.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an die IT-Leiterin, Frau Brandt, und melden Sie die wiederkehrenden Störungen im Kundenprogramm.',
    [
      'Melden Sie die Störung und geben Sie an, seit wann sie auftritt.',
      'Beschreiben Sie genau, in welchen Situationen das Programm abstürzt.',
      'Erklären Sie, welchen Mehraufwand die Ausfälle in Ihrer Abteilung verursachen.',
      'Bitten Sie um eine rasche Lösung und um eine Zwischeninformation.'
    ]),
  A('wa-laerm-buero', 'Lärm im Großraumbüro', 'beschwerde',
    'Herr Fischer', 'der Office-Manager',
    'In Ihrem Großraumbüro wird immer häufiger laut telefoniert, und die neuen Besprechungsinseln haben keine Trennwände. Konzentriertes Arbeiten ist kaum noch möglich.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an den Office-Manager Ihres Hauses, Herrn Fischer.',
    [
      'Sprechen Sie die zunehmende Lärmbelastung im Großraumbüro an.',
      'Beschreiben Sie, wie der Lärm Ihre Arbeit und die Ihrer Kolleginnen und Kollegen stört.',
      'Schlagen Sie Trennwände oder feste Zonen für Telefonate vor.',
      'Bitten Sie um ein kurzes Gespräch vor Ort und um eine Rückmeldung.'
    ]),
  A('wa-kurs-ausstattung', 'Mängel im Kursraum', 'beschwerde',
    'Frau Hoffmann', 'die Leiterin der Sprachschule',
    'Ihr Kursraum in der Sprachschule ist im Winter schlecht geheizt, der Beamer fällt regelmäßig aus, und für zwanzig Teilnehmende stehen nur fünfzehn Stühle bereit.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an die Leiterin Ihrer Sprachschule, Frau Hoffmann, und weisen Sie auf die Mängel im Kursraum hin.',
    [
      'Stellen Sie sich als Teilnehmerin oder Teilnehmer des Abendkurses vor und nennen Sie Ihr Anliegen.',
      'Führen Sie die Mängel im Kursraum einzeln auf.',
      'Erklären Sie, warum der Unterricht darunter leidet.',
      'Bitten Sie darum, die Ausstattung bis zum Kursbeginn im Januar zu verbessern.'
    ]),
  A('wa-gehaltsabrechnung', 'Fehler in der Gehaltsabrechnung', 'beschwerde',
    'Frau Schulz', 'die Leiterin der Lohnbuchhaltung',
    'Auf Ihrer aktuellen Gehaltsabrechnung fehlen die Überstunden, die Sie im vergangenen Monat geleistet haben. Bereits im Vormonat war die Abrechnung fehlerhaft, damals wurde eine Zulage vergessen.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an die Leiterin der Lohnbuchhaltung, Frau Schulz, und melden Sie die Fehler in Ihrer Gehaltsabrechnung.',
    [
      'Nennen Sie den Anlass Ihrer Nachricht und beziehen Sie sich auf die aktuelle Abrechnung.',
      'Beschreiben Sie die Fehler der letzten beiden Monate genau.',
      'Erklären Sie, warum eine zuverlässige Abrechnung für Sie wichtig ist.',
      'Bitten Sie um eine Korrektur bis zur nächsten Gehaltszahlung und um eine Bestätigung.'
    ]),
  A('wa-reisekosten', 'Verspätete Reisekostenerstattung', 'beschwerde',
    'Frau Adler', 'die Leiterin der Buchhaltung',
    'Vor acht Wochen haben Sie die Abrechnung Ihrer Dienstreise mit allen Belegen eingereicht. Trotz zweier freundlicher Nachfragen wurde der Betrag von mehreren Hundert Euro bis heute nicht erstattet.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an die Leiterin der Buchhaltung, Frau Adler, und beschweren Sie sich über die ausstehende Erstattung Ihrer Reisekosten.',
    [
      'Nennen Sie den Anlass Ihrer Beschwerde und geben Sie an, seit wann Sie auf die Erstattung warten.',
      'Schildern Sie, was Sie bisher unternommen haben.',
      'Machen Sie deutlich, welche finanzielle Belastung die Verzögerung für Sie bedeutet.',
      'Bitten Sie um die Erstattung bis zum Monatsende und um eine kurze Rückmeldung.'
    ]),
  A('wa-lernplattform', 'Störungen der Lernplattform', 'beschwerde',
    'Herr Stein', 'der technische Ansprechpartner der Sprachschule',
    'Seit zwei Wochen funktioniert die Online-Lernplattform Ihrer Sprachschule nur unzuverlässig: Videos laden nicht, und hochgeladene Hausaufgaben gehen verloren. In sechs Wochen legen Sie die B2-Prüfung ab.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an den technischen Ansprechpartner Ihrer Sprachschule, Herrn Stein, und melden Sie die Störungen der Lernplattform.',
    [
      'Melden Sie die Störungen und geben Sie an, seit wann sie auftreten.',
      'Beschreiben Sie genau, welche Funktionen nicht zuverlässig arbeiten.',
      'Erklären Sie, warum die Ausfälle Ihre Prüfungsvorbereitung behindern.',
      'Bitten Sie um eine schnelle Lösung und um eine Verlängerung der Abgabefristen.'
    ]),
  A('wa-parkplatz', 'Parkplatznot am Firmenstandort', 'beschwerde',
    'Herr Wolf', 'der Facility-Manager',
    'Wegen einer Baustelle ist die Hälfte des Mitarbeiterparkplatzes gesperrt, und eine Regelung für die verbleibenden Plätze gibt es nicht. Obwohl Sie früher losfahren, finden Sie oft keinen Platz und kommen zu spät zu Terminen.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an den Facility-Manager, Herrn Wolf, und beschweren Sie sich über die Parkplatzsituation am Standort.',
    [
      'Sprechen Sie die Parkplatzsituation an und nennen Sie den Auslöser.',
      'Beschreiben Sie, wie sich die Lage auf Ihren Arbeitsbeginn auswirkt.',
      'Bitten Sie um eine klare Regelung für die verbleibenden Plätze.',
      'Schlagen Sie eine Übergangslösung für die Zeit der Bauarbeiten vor.'
    ]),

  // — Vorschlag & Anregung —
  A('wa-teamausflug', 'Vorschlag für den Teamausflug', 'vorschlag',
    'Frau Neumann', 'Ihre Abteilungsleiterin',
    'Ihre Abteilungsleiterin hat das Team gebeten, Ideen für den jährlichen Teamausflug einzureichen. Sie haben einen Vorschlag, der auch für Kolleginnen und Kollegen mit Kindern geeignet ist.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihre Abteilungsleiterin, Frau Neumann, und stellen Sie Ihren Vorschlag für den Teamausflug vor.',
    [
      'Beziehen Sie sich auf den Aufruf, Ideen für den Teamausflug einzureichen.',
      'Stellen Sie Ihren Vorschlag für das Ziel und den Ablauf des Tages vor.',
      'Begründen Sie, warum Ihr Vorschlag zum Team passt.',
      'Bieten Sie an, bei der Organisation mitzuhelfen.'
    ]),
  A('wa-gruenes-buero', 'Nachhaltigkeit im Büro', 'vorschlag',
    'Herr Krause', 'der Geschäftsführer',
    'In Ihrem Betrieb wird sehr viel gedruckt, und für die Mittagspause werden täglich Einwegverpackungen gekauft. Die Geschäftsführung hat die Belegschaft um Ideen zum Umweltschutz gebeten.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an den Geschäftsführer, Herrn Krause, und stellen Sie Ihre Ideen für ein umweltfreundlicheres Büro vor.',
    [
      'Nehmen Sie Bezug auf den Aufruf der Geschäftsführung.',
      'Beschreiben Sie, wo in Ihrem Arbeitsalltag unnötig Papier und Verpackung verbraucht werden.',
      'Unterbreiten Sie zwei konkrete Vorschläge und nennen Sie ihren Nutzen für den Betrieb.',
      'Erklären Sie sich bereit, die Umsetzung in Ihrer Abteilung zu begleiten.'
    ]),
  A('wa-einarbeitung', 'Bessere Einarbeitung neuer Kollegen', 'vorschlag',
    'Frau Sommer', 'die Personalleiterin',
    'In den letzten Monaten sind mehrere neue Kolleginnen und Kollegen in Ihr Team gekommen. Sie haben bemerkt, dass die Einarbeitung ohne festen Plan abläuft und viele Fragen offenbleiben.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an die Personalleiterin, Frau Sommer, und schlagen Sie eine bessere Einarbeitung neuer Kolleginnen und Kollegen vor.',
    [
      'Schildern Sie, wie die Einarbeitung in Ihrem Team bisher abläuft.',
      'Zeigen Sie auf, welche Schwierigkeiten dabei für neue Kolleginnen und Kollegen entstehen.',
      'Schlagen Sie einen Einarbeitungsplan mit festen Ansprechpartnern vor.',
      'Bieten Sie an, den Plan gemeinsam mit der Personalabteilung zu erarbeiten.'
    ]),
  A('wa-lerngruppe', 'Vorschlag einer Lerngruppe', 'vorschlag',
    'Herr Yilmaz', 'Ihr Kursleiter',
    'Ihr B2-Kurs endet in zwei Monaten mit der Prüfung. Mehrere Teilnehmende möchten sich zusätzlich treffen, um das Sprechen und das Schreiben gemeinsam zu üben.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihren Kursleiter, Herrn Yilmaz, und stellen Sie Ihre Idee einer Lerngruppe vor.',
    [
      'Erklären Sie, warum sich einige Teilnehmende zusätzlich treffen möchten.',
      'Stellen Sie Ihre Idee einer wöchentlichen Lerngruppe vor.',
      'Bitten Sie um einen freien Raum und um Übungsmaterial für die Prüfungsteile.',
      'Sagen Sie zu, die Termine zu organisieren und die Gruppe zu betreuen.'
    ]),
  A('wa-betriebssport', 'Sportangebot für Mitarbeitende', 'vorschlag',
    'Frau Engel', 'die Personalreferentin',
    'Viele Ihrer Kolleginnen und Kollegen klagen über Rückenschmerzen durch die Bildschirmarbeit. Die Personalabteilung hat um Ideen zur Gesundheitsförderung im Betrieb gebeten.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an die Personalreferentin, Frau Engel, und stellen Sie Ihren Vorschlag für ein Sportangebot im Betrieb vor.',
    [
      'Nehmen Sie Bezug auf den Aufruf der Personalabteilung.',
      'Stellen Sie Ihren Vorschlag für ein regelmäßiges Sportangebot vor.',
      'Begründen Sie den Nutzen für die Beschäftigten und den Betrieb.',
      'Bieten Sie an, die Organisation der ersten Kurse zu übernehmen.'
    ]),
  A('wa-jobticket', 'Jobticket für die Belegschaft', 'vorschlag',
    'Herr Franke', 'der kaufmännische Leiter',
    'Die Parkplätze an Ihrem Standort sind knapp, und viele Beschäftigte fahren täglich allein mit dem Auto zur Arbeit. Ein vergünstigtes Jobticket für Bus und Bahn gibt es in Ihrer Firma bisher nicht.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an den kaufmännischen Leiter, Herrn Franke, und schlagen Sie die Einführung eines Jobtickets vor.',
    [
      'Beschreiben Sie die aktuelle Situation bei Parkplätzen und Arbeitswegen.',
      'Stellen Sie Ihren Vorschlag eines vergünstigten Jobtickets vor.',
      'Erläutern Sie den Nutzen für den Betrieb und für die Beschäftigten.',
      'Bieten Sie an, das Interesse im Kollegium mit einer kurzen Umfrage zu ermitteln.'
    ]),
  A('wa-konversationsabend', 'Konversationsabend für Lernende', 'vorschlag',
    'Frau Arnold', 'die Leiterin Ihrer Sprachschule',
    'In Ihrem B2-Kurs wünschen sich viele Teilnehmende mehr Gelegenheiten, frei Deutsch zu sprechen. Außerhalb des Unterrichts gibt es an Ihrer Sprachschule bisher kein solches Angebot.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an die Leiterin Ihrer Sprachschule, Frau Arnold, und schlagen Sie einen regelmäßigen Konversationsabend vor.',
    [
      'Beschreiben Sie, was den Teilnehmenden Ihres Kurses bisher fehlt.',
      'Stellen Sie Ihre Idee eines monatlichen Konversationsabends vor.',
      'Begründen Sie, warum das Angebot auch für die Sprachschule attraktiv ist.',
      'Bieten Sie an, den ersten Abend selbst zu organisieren.'
    ]),
  A('wa-ruheraum', 'Ein Ruheraum für die Pausen', 'vorschlag',
    'Herr Lorenz', 'der Office-Manager',
    'In Ihrem Bürogebäude gibt es keinen Ort für eine ungestörte Pause: Der Aufenthaltsraum wird ständig für spontane Besprechungen genutzt. Ein kleines Besprechungszimmer im dritten Stock steht seit Monaten leer.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an den Office-Manager, Herrn Lorenz, und schlagen Sie die Einrichtung eines Ruheraums vor.',
    [
      'Schildern Sie, warum eine ungestörte Pause im Gebäude derzeit kaum möglich ist.',
      'Stellen Sie Ihren Vorschlag vor, das leere Zimmer als Ruheraum einzurichten.',
      'Erklären Sie den Nutzen für Konzentration und Gesundheit der Beschäftigten.',
      'Bitten Sie um eine Prüfung des Vorschlags und um eine Rückmeldung.'
    ]),

  // — Dank & Rückmeldung —
  A('wa-dank-einarbeitung', 'Dank für die Einarbeitung', 'dank',
    'Frau Albrecht', 'Ihre Mentorin',
    'Sie haben Ihre ersten drei Monate im neuen Betrieb hinter sich. Ihre Mentorin hat Sie dabei begleitet, Ihnen die Abläufe erklärt und Sie den Fachabteilungen vorgestellt.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihre Mentorin, Frau Albrecht, zum Abschluss Ihrer Einarbeitungszeit.',
    [
      'Bedanken Sie sich für die Begleitung während Ihrer ersten Monate.',
      'Nennen Sie, was Ihnen dabei besonders geholfen hat.',
      'Berichten Sie, wie Sie sich inzwischen im Team zurechtfinden.',
      'Bieten Sie an, künftig selbst neue Kolleginnen und Kollegen zu begleiten.'
    ]),
  A('wa-dank-fortbildung', 'Rückmeldung zur Fortbildung', 'dank',
    'Herr Winter', 'Ihr Vorgesetzter',
    'Ihr Vorgesetzter hat Ihnen eine dreitägige Fortbildung zur Gesprächsführung ermöglicht und die Kosten übernommen. Nach Ihrer Rückkehr erwartet er eine kurze Rückmeldung.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihren Vorgesetzten, Herrn Winter, und geben Sie ihm eine Rückmeldung zur Fortbildung.',
    [
      'Bedanken Sie sich dafür, dass Sie an der Fortbildung teilnehmen konnten.',
      'Berichten Sie, welche Inhalte für Ihre tägliche Arbeit am nützlichsten waren.',
      'Beurteilen Sie offen, was an der Veranstaltung weniger überzeugt hat.',
      'Schlagen Sie vor, Ihre Erfahrungen im Team weiterzugeben.'
    ]),
  A('wa-dank-vertretung', 'Dank für die Vertretung', 'dank',
    'Frau Otto', 'Ihre Kollegin',
    'Während Ihrer dreiwöchigen Krankheit hat eine Kollegin Ihre Aufgaben zusätzlich zu ihren eigenen übernommen und dabei auch zwei schwierige Kundentermine für Sie wahrgenommen.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihre Kollegin, Frau Otto, die Sie während Ihrer Krankheit vertreten hat.',
    [
      'Bedanken Sie sich für die Vertretung während Ihrer Abwesenheit.',
      'Gehen Sie darauf ein, was Ihre Kollegin in dieser Zeit zusätzlich geleistet hat.',
      'Erklären Sie, wie es Ihnen inzwischen geht und wann Sie zurückkommen.',
      'Bieten Sie an, sich bei nächster Gelegenheit zu revanchieren.'
    ]),
  A('wa-dank-projekt', 'Dank nach dem Projektabschluss', 'dank',
    'Herr Schmid', 'Ihr Projektleiter',
    'Ihr Team hat ein halbjähriges Projekt erfolgreich abgeschlossen. Der Projektleiter hat die Arbeit gut organisiert und Ihnen eine eigene Teilaufgabe anvertraut.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihren Projektleiter, Herrn Schmid, zum Abschluss des gemeinsamen Projekts.',
    [
      'Bedanken Sie sich für die Zusammenarbeit im abgeschlossenen Projekt.',
      'Heben Sie hervor, was Ihnen an der Organisation der Arbeit gefallen hat.',
      'Nennen Sie, was Sie bei Ihrer eigenen Teilaufgabe gelernt haben.',
      'Bekunden Sie Ihr Interesse an einer weiteren Zusammenarbeit.'
    ]),
  A('wa-dank-kursleiterin', 'Dank nach der bestandenen Prüfung', 'dank',
    'Frau Seidel', 'Ihre Kursleiterin',
    'Sie haben Ihre B2-Prüfung mit einem sehr guten Ergebnis bestanden. Ihre Kursleiterin hat Sie ein Jahr lang unterrichtet und vor der Prüfung zusätzliche Übungsstunden angeboten.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihre Kursleiterin, Frau Seidel, und bedanken Sie sich nach Ihrer bestandenen Prüfung.',
    [
      'Berichten Sie von Ihrem Prüfungsergebnis und bedanken Sie sich für den Unterricht.',
      'Nennen Sie, was Ihnen in der Vorbereitung besonders geholfen hat.',
      'Erklären Sie, was Ihnen die bestandene Prüfung nun ermöglicht.',
      'Erkundigen Sie sich nach einem passenden C1-Kurs.'
    ]),
  A('wa-dank-it-hilfe', 'Dank für die schnelle IT-Hilfe', 'dank',
    'Herr Anders', 'Ihr Kollege aus der IT-Abteilung',
    'Kurz vor einer wichtigen Kundenpräsentation fiel Ihr Laptop aus. Ihr Kollege aus der IT-Abteilung hat alles stehen und liegen lassen, ein Ersatzgerät eingerichtet und Ihre Dateien rechtzeitig wiederhergestellt.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihren Kollegen aus der IT-Abteilung, Herrn Anders, und bedanken Sie sich für seine Hilfe.',
    [
      'Bedanken Sie sich für die schnelle und unkomplizierte Hilfe.',
      'Beschreiben Sie, in welcher Lage Sie ohne seine Unterstützung gewesen wären.',
      'Berichten Sie, wie die Präsentation gelaufen ist.',
      'Kündigen Sie an, seine Hilfe auch gegenüber seiner Vorgesetzten zu erwähnen.'
    ]),
  A('wa-rueckmeldung-mentoring', 'Rückmeldung zum Mentoring-Programm', 'dank',
    'Herr Kolb', 'der Personalreferent',
    'Sie haben sechs Monate am neuen Mentoring-Programm Ihres Unternehmens teilgenommen. Die Personalabteilung bittet alle Teilnehmenden nach dem Probelauf um eine ehrliche Rückmeldung.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an den Personalreferenten, Herrn Kolb, und geben Sie ihm Ihre Rückmeldung zum Mentoring-Programm.',
    [
      'Bedanken Sie sich für die Möglichkeit, am Programm teilzunehmen.',
      'Berichten Sie, was Ihnen das Mentoring konkret gebracht hat.',
      'Nennen Sie einen Punkt, der sich noch verbessern ließe.',
      'Empfehlen Sie, das Programm auch künftig anzubieten.'
    ]),
  A('wa-rueckmeldung-betriebsausflug', 'Rückmeldung zum Betriebsausflug', 'dank',
    'Frau Herzog', 'die Organisatorin des Betriebsausflugs',
    'Ihre Kollegin hat den diesjährigen Betriebsausflug in den Naturpark allein organisiert und dafür viel Freizeit geopfert. Nach der Veranstaltung bittet sie alle um eine kurze Rückmeldung.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an die Organisatorin des Betriebsausflugs, Frau Herzog, und geben Sie ihr eine Rückmeldung.',
    [
      'Bedanken Sie sich für die Organisation des Ausflugs.',
      'Heben Sie hervor, was Ihnen besonders gut gefallen hat.',
      'Machen Sie eine Anregung für den nächsten Ausflug.',
      'Bieten Sie an, bei der Organisation im kommenden Jahr mitzuhelfen.'
    ])
]

// Gemini responseSchema for the Schreibauftrag generator (mirrors
// SCHREIBTHEMA_GENERATOR_SCHEMA in schreibenThemen.ts). `anlass` is required
// because a generated Auftrag without a valid Schreibanlass is rejected by the
// validator — the field is structural, not decorative (ADR-0023).
export const SCHREIBAUFTRAG_GENERATOR_SCHEMA = {
  type: 'object',
  properties: {
    auftraege: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titleDe: { type: 'string' },
          situationDe: { type: 'string' },
          empfaengerName: { type: 'string' },
          empfaengerRolleDe: { type: 'string' },
          taskDe: { type: 'string' },
          inhaltspunkte: { type: 'array', items: { type: 'string' } },
          anlass: { type: 'string' }
        },
        required: ['titleDe', 'situationDe', 'empfaengerName', 'empfaengerRolleDe', 'taskDe', 'inhaltspunkte', 'anlass']
      }
    }
  },
  required: ['auftraege']
} as const
