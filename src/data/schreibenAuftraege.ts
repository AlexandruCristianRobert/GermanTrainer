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
// This file holds the 20 seeded Aufträge only — four per Anlass, so the pool
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
    'Sie besuchen einen Abendkurs Deutsch B2. In der kommenden Woche müssen Sie beruflich verreisen und können an drei Kursabenden nicht teilnehmen.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihren Kursleiter, Herrn Roth, und melden Sie sich für die kommende Woche ab.',
    [
      'Teilen Sie mit, an welchen Abenden Sie fehlen werden, und entschuldigen Sie sich dafür.',
      'Begründen Sie Ihre Abwesenheit mit Ihrer beruflichen Reise.',
      'Bitten Sie um die Arbeitsblätter und die Hausaufgaben der versäumten Stunden.',
      'Versichern Sie, den verpassten Stoff selbstständig nachzuarbeiten.'
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
    'Ihr Urlaub ist für Juli bereits genehmigt. Weil die Hochzeit Ihrer Schwester nun auf den September fällt, möchten Sie zwei Urlaubswochen verschieben.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihre Teamleiterin, Frau Steiner, und bitten Sie um eine Änderung Ihrer genehmigten Urlaubszeit.',
    [
      'Beziehen Sie sich auf Ihren bereits genehmigten Urlaub im Juli.',
      'Legen Sie dar, warum Sie die Termine gern tauschen möchten.',
      'Bitten Sie darum, zwei Wochen in den September zu verlegen.',
      'Zeigen Sie auf, wie Ihre Arbeit während der Abwesenheit verteilt werden kann.'
    ]),
  A('wa-empfehlung-praktikum', 'Bitte um ein Empfehlungsschreiben', 'bitte',
    'Frau Lang', 'Ihre Dozentin',
    'Sie bewerben sich um ein Praktikum in einem Verlag. Die Bewerbung verlangt eine Empfehlung, und Ihre Dozentin kennt Ihre Arbeiten aus zwei Seminaren.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihre Dozentin, Frau Lang, und bitten Sie um ein Empfehlungsschreiben für Ihre Bewerbung.',
    [
      'Erinnern Sie daran, in welchen Seminaren Sie bei Ihrer Dozentin studiert haben.',
      'Beschreiben Sie das Praktikum, für das Sie sich bewerben.',
      'Bitten Sie höflich um das Empfehlungsschreiben und nennen Sie die Bewerbungsfrist.',
      'Bieten Sie an, Ihre Unterlagen und eine Übersicht Ihrer Seminararbeiten zu schicken.'
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
      'Sprechen Sie die zunehmende Lärmbelastung in Ihrem Stockwerk an.',
      'Beschreiben Sie, wie der Lärm Ihre Arbeit und die Ihrer Kolleginnen und Kollegen stört.',
      'Schlagen Sie Trennwände oder feste Zonen für Telefonate vor.',
      'Bitten Sie um ein kurzes Gespräch vor Ort und um eine Rückmeldung.'
    ]),
  A('wa-kurs-ausstattung', 'Mängel im Kursraum', 'beschwerde',
    'Frau Hoffmann', 'die Leiterin der Sprachschule',
    'Ihr Kursraum in der Sprachschule ist im Winter schlecht geheizt, der Beamer fällt regelmäßig aus, und für zwanzig Teilnehmende stehen nur fünfzehn Stühle bereit.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an die Leiterin Ihrer Sprachschule, Frau Hoffmann, und weisen Sie auf die Mängel im Kursraum hin.',
    [
      'Stellen Sie sich als Teilnehmer des Abendkurses vor und nennen Sie Ihr Anliegen.',
      'Führen Sie die Mängel im Kursraum einzeln auf.',
      'Erklären Sie, warum der Unterricht darunter leidet.',
      'Bitten Sie darum, die Ausstattung bis zum Kursbeginn im Januar zu verbessern.'
    ]),

  // — Vorschlag & Anregung —
  A('wa-teamausflug', 'Vorschlag für den Teamausflug', 'vorschlag',
    'Frau Neumann', 'Ihre Abteilungsleiterin',
    'Ihre Abteilungsleiterin hat das Team gebeten, Ideen für den jährlichen Betriebsausflug einzureichen. Sie haben einen Vorschlag, der auch für Kolleginnen und Kollegen mit Kindern passt.',
    'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihre Abteilungsleiterin, Frau Neumann, und stellen Sie Ihren Vorschlag für den Teamausflug vor.',
    [
      'Beziehen Sie sich auf den Aufruf, Ideen für den Betriebsausflug einzureichen.',
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
    'Während Ihrer dreiwöchigen Krankheit hat eine Kollegin Ihre Aufgaben zusätzlich zu ihren eigenen übernommen und dabei auch zwei schwierige Kundentermine für Sie geführt.',
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
      'Sprechen Sie Ihr Interesse an einer weiteren Zusammenarbeit aus.'
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
