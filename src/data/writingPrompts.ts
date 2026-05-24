// Writing tutor — types and seed catalogue.
//
// The catalogue is loaded into memory once on first use. There is no Dexie
// table for prompts (matches the noun/adjective seed-JSON pattern). Adding
// prompts is a code change; the `source: 'custom'` slot is reserved for a
// future Manage UI.

import type { WritingGradeResult } from './rubrics'

export type WritingTaskType =
  | 'forumsbeitrag'              // Goethe C1, ~230 words
  | 'formelle-email'             // Goethe C1, ~120 words
  | 'argumentativer-aufsatz'     // telc C1 + general C1 prep
  | 'grafik-beschreibung'        // telc C1 — chart/data description
  | 'zusammenfassung'            // summary, general C1 prep
  | 'stellungnahme'              // opinion piece, general C1 prep

export const WRITING_TASK_TYPES: WritingTaskType[] = [
  'forumsbeitrag',
  'formelle-email',
  'argumentativer-aufsatz',
  'grafik-beschreibung',
  'zusammenfassung',
  'stellungnahme'
]

export const WRITING_TASK_LABEL: Record<WritingTaskType, string> = {
  'forumsbeitrag':           'Forumsbeitrag',
  'formelle-email':          'Formelle E-Mail',
  'argumentativer-aufsatz':  'Argumentativer Aufsatz',
  'grafik-beschreibung':     'Grafik-Beschreibung',
  'zusammenfassung':         'Zusammenfassung',
  'stellungnahme':           'Stellungnahme'
}

export const WRITING_TASK_BLURB: Record<WritingTaskType, string> = {
  'forumsbeitrag':           'Goethe C1 · diskursiver Online-Beitrag · ~230 Wörter',
  'formelle-email':          'Goethe C1 · (halb-)formelle Mitteilung · ~120 Wörter',
  'argumentativer-aufsatz':  'C1 · argumentativer Text mit These, Pro/Contra, Schlussfolgerung',
  'grafik-beschreibung':     'telc C1 · Beschreibung und Interpretation einer Statistik',
  'zusammenfassung':         'C1 · sachliche Zusammenfassung eines Quelltextes',
  'stellungnahme':           'C1 · persönliche Positionierung zu einem Sachverhalt'
}

export type RubricSystem = 'goethe-c1' | 'telc-c1'

export interface WritingPrompt {
  id: string                         // 'wp-forum-wohnen-stadt-land'
  type: WritingTaskType
  defaultRubric: RubricSystem
  level: 'B2' | 'C1'
  titleDe: string                    // 'Wohnen: Stadt oder Land?'
  promptText: string                 // full task body (German); may contain newlines
  promptContext?: string             // forum thread excerpt / email situation / chart caption
  targetWords: { min: number; target: number; max: number }
  suggestedMinutes: number
  tags?: string[]
  source: 'seed' | 'custom'
}

export interface WritingDraft {
  id: string                         // crypto.randomUUID()
  promptId: string
  rubric: RubricSystem               // chosen at grade time
  text: string                       // full draft, plain text
  wordCount: number
  createdAt: number                  // ms epoch
  updatedAt: number
  gradedAt?: number
  graderModel?: string               // e.g. 'gemini-2.5-flash'
  result?: WritingGradeResult        // present once graded
}

export const WRITING_PROMPTS: WritingPrompt[] = [
  // ── Forumsbeitrag (Goethe C1) ────────────────────────────────────
  {
    id: 'wp-forum-wohnen-stadt-land',
    type: 'forumsbeitrag',
    defaultRubric: 'goethe-c1',
    level: 'C1',
    titleDe: 'Wohnen: Stadt oder Land?',
    promptText:
      'Schreiben Sie einen Beitrag zur Diskussion im Online-Forum. Erläutern Sie, ' +
      'welche Vor- und Nachteile das Leben in der Stadt bzw. auf dem Land Ihrer Meinung ' +
      'nach hat. Nennen Sie konkrete Beispiele aus Ihrem Umfeld, vergleichen Sie zwei ' +
      'Lebensphasen (z. B. Studium und Familie) und ziehen Sie ein begründetes Fazit. ' +
      'Schreiben Sie circa 230 Wörter.',
    promptContext:
      'Forumsthread "Wohin nach dem Studium?": Mehrere Nutzer:innen diskutieren, ob ' +
      'eine Großstadt oder eine ländliche Kleinstadt der bessere Ort zum Leben ist.',
    targetWords: { min: 195, target: 230, max: 265 },
    suggestedMinutes: 30,
    tags: ['Wohnen', 'Stadt', 'Land'],
    source: 'seed'
  },
  {
    id: 'wp-forum-homeoffice',
    type: 'forumsbeitrag',
    defaultRubric: 'goethe-c1',
    level: 'C1',
    titleDe: 'Homeoffice — Segen oder Belastung?',
    promptText:
      'Verfassen Sie einen Forumsbeitrag, in dem Sie sich zu der Frage äußern, ob die ' +
      'dauerhafte Arbeit im Homeoffice Berufstätige eher entlastet oder belastet. ' +
      'Beschreiben Sie zwei konkrete Vor- und zwei konkrete Nachteile, beziehen Sie ' +
      'sich auf eigene Erfahrungen oder Beobachtungen und schließen Sie mit einer ' +
      'Empfehlung. Circa 230 Wörter.',
    promptContext:
      'Forumsthread "Arbeit der Zukunft": Diskussion über die Auswirkungen ' +
      'dauerhafter Homeoffice-Regelungen auf Produktivität und Wohlbefinden.',
    targetWords: { min: 195, target: 230, max: 265 },
    suggestedMinutes: 30,
    tags: ['Arbeit', 'Homeoffice'],
    source: 'seed'
  },

  // ── Formelle E-Mail (Goethe C1) ───────────────────────────────────
  {
    id: 'wp-email-beschwerde-kurs',
    type: 'formelle-email',
    defaultRubric: 'goethe-c1',
    level: 'C1',
    titleDe: 'Beschwerde an die Sprachschule',
    promptText:
      'Sie haben an einem dreiwöchigen Intensivkurs an der Sprachschule Lingua Berlin ' +
      'teilgenommen. Der Unterricht wurde mehrmals kurzfristig verlegt, die ' +
      'angekündigten Materialien wurden nicht ausgegeben, und der versprochene ' +
      'Online-Zugang zu Übungen war nie aktiv. Schreiben Sie eine halbformelle E-Mail ' +
      'an die Schulleitung, in der Sie die Probleme klar darlegen, eine ' +
      'Teilrückerstattung verlangen und um schnelle Antwort bitten. Circa 120 Wörter.',
    promptContext:
      'Adressatin: Frau Dr. Renate Engels, Schulleitung Lingua Berlin. ' +
      'Sie selbst: Pia/Paul Falk, Kursteilnehmer:in des Kurses C1-Intensiv März.',
    targetWords: { min: 100, target: 120, max: 140 },
    suggestedMinutes: 20,
    tags: ['Beschwerde', 'Sprachschule', 'formell'],
    source: 'seed'
  },
  {
    id: 'wp-email-praktikumsanfrage',
    type: 'formelle-email',
    defaultRubric: 'goethe-c1',
    level: 'C1',
    titleDe: 'Anfrage Praktikumsplatz',
    promptText:
      'Sie haben in einer Stellenausschreibung des Goethe-Instituts München von einem ' +
      'sechsmonatigen Praktikum in der Abteilung Bildungskooperationen gelesen. ' +
      'Schreiben Sie eine halbformelle E-Mail an Herrn Marc Wieland (Personalreferat), ' +
      'in der Sie sich kurz vorstellen, Ihre Motivation und Eignung darlegen und um ' +
      'Auskunft zum Bewerbungsverfahren bitten. Circa 120 Wörter.',
    promptContext:
      'Adressat: Herr Marc Wieland, Personalreferat Goethe-Institut München. ' +
      'Sie selbst: Sam Vogel, M.A.-Studentin/Student Germanistik im 3. Semester.',
    targetWords: { min: 100, target: 120, max: 140 },
    suggestedMinutes: 20,
    tags: ['Praktikum', 'Bewerbung', 'formell'],
    source: 'seed'
  },

  // ── Argumentativer Aufsatz ────────────────────────────────────────
  {
    id: 'wp-arg-handy-schule',
    type: 'argumentativer-aufsatz',
    defaultRubric: 'telc-c1',
    level: 'C1',
    titleDe: 'Handyverbot an Schulen?',
    promptText:
      'In mehreren Bundesländern wird ein striktes Handyverbot an Schulen diskutiert. ' +
      'Verfassen Sie einen argumentativen Aufsatz von circa 250 Wörtern. Formulieren ' +
      'Sie eine klare These, führen Sie mindestens zwei Argumente dafür und zwei ' +
      'dagegen aus, gewichten Sie die Argumente begründet und schließen Sie mit einer ' +
      'eigenen Position. Achten Sie auf eine deutliche Gliederung in Einleitung, ' +
      'Hauptteil und Schluss.',
    targetWords: { min: 210, target: 250, max: 285 },
    suggestedMinutes: 40,
    tags: ['Bildung', 'Digitalisierung'],
    source: 'seed'
  },
  {
    id: 'wp-arg-mindestlohn-jugend',
    type: 'argumentativer-aufsatz',
    defaultRubric: 'telc-c1',
    level: 'C1',
    titleDe: 'Mindestlohn auch für unter 18-Jährige?',
    promptText:
      'In Deutschland gilt der gesetzliche Mindestlohn nicht für Beschäftigte unter ' +
      '18 Jahren ohne abgeschlossene Berufsausbildung. Schreiben Sie einen ' +
      'argumentativen Aufsatz von circa 250 Wörtern: Stellen Sie das Problem dar, ' +
      'argumentieren Sie für und gegen eine Ausweitung des Mindestlohns auf ' +
      'Jugendliche, gewichten Sie die Argumente und kommen Sie zu einer begründeten ' +
      'Empfehlung.',
    targetWords: { min: 210, target: 250, max: 285 },
    suggestedMinutes: 40,
    tags: ['Arbeit', 'Politik', 'Jugend'],
    source: 'seed'
  },

  // ── Grafik-Beschreibung (telc C1) ────────────────────────────────
  {
    id: 'wp-grafik-online-shopping',
    type: 'grafik-beschreibung',
    defaultRubric: 'telc-c1',
    level: 'C1',
    titleDe: 'Online-Einkäufe nach Altersgruppen',
    promptText:
      'Beschreiben und interpretieren Sie die unten skizzierte Statistik. Nennen Sie ' +
      'die wichtigsten Datenpunkte, vergleichen Sie die Altersgruppen, identifizieren ' +
      'Sie Auffälligkeiten und stellen Sie zwei plausible Erklärungen vor. Circa 200 ' +
      'Wörter.',
    promptContext:
      'Statistik (Statistisches Bundesamt 2025): "Anteil der Personen, die mindestens ' +
      'einmal pro Woche online einkaufen, in Prozent." 16–24 Jahre: 68 %, 25–44 ' +
      'Jahre: 71 %, 45–64 Jahre: 49 %, 65+ Jahre: 22 %.',
    targetWords: { min: 170, target: 200, max: 230 },
    suggestedMinutes: 30,
    tags: ['Statistik', 'Konsum', 'Digitalisierung'],
    source: 'seed'
  },
  {
    id: 'wp-grafik-energieverbrauch',
    type: 'grafik-beschreibung',
    defaultRubric: 'telc-c1',
    level: 'C1',
    titleDe: 'Stromverbrauch privater Haushalte',
    promptText:
      'Beschreiben und interpretieren Sie die unten skizzierte Statistik zum ' +
      'Stromverbrauch privater Haushalte. Vergleichen Sie die Anteile, gehen Sie auf ' +
      'die zwei größten Posten ein und nennen Sie zwei Maßnahmen, mit denen Haushalte ' +
      'ihren Verbrauch senken könnten. Circa 200 Wörter.',
    promptContext:
      'Statistik (Umweltbundesamt 2024): "Stromverbrauch nach Anwendungsbereich, ' +
      'Anteile in Prozent." Heizen/Warmwasser: 33 %, Kühlen/Gefrieren: 17 %, ' +
      'Beleuchtung: 9 %, Kochen: 11 %, Waschen/Trocknen: 13 %, Sonstiges (IT, TV, ' +
      'Kleingeräte): 17 %.',
    targetWords: { min: 170, target: 200, max: 230 },
    suggestedMinutes: 30,
    tags: ['Statistik', 'Energie', 'Umwelt'],
    source: 'seed'
  },

  // ── Zusammenfassung ────────────────────────────────────────────────
  {
    id: 'wp-zus-stadtbegruenung',
    type: 'zusammenfassung',
    defaultRubric: 'telc-c1',
    level: 'C1',
    titleDe: 'Stadtbegrünung als Klimaanpassung',
    promptText:
      'Fassen Sie den unten stehenden Artikel sachlich und in eigenen Worten ' +
      'zusammen. Geben Sie die Hauptaussagen und mindestens zwei genannte Beispiele ' +
      'wieder. Verzichten Sie auf eigene Meinung. Circa 180 Wörter.',
    promptContext:
      'Quelltext (gekürzt, Sueddeutsche Zeitung 2025):\n\n' +
      '"Klimaanpassung in urbanen Räumen rückt zunehmend in den Fokus kommunaler ' +
      'Politik. Begrünte Fassaden, entsiegelte Innenhöfe und kleinflächige Parks ' +
      'können laut Studien des Umweltbundesamtes die gefühlte Temperatur an ' +
      'Hitzetagen um bis zu 4 °C senken. In München wurden 2024 dreißig öffentliche ' +
      'Plätze entsiegelt und mit klimaresistenten Baumarten bepflanzt; Hamburg ' +
      'subventioniert seit 2023 Dachbegrünungen für Mietshäuser mit bis zu 50 ' +
      'Prozent der Kosten. Kritiker bemängeln, dass solche Maßnahmen meist nur ' +
      'einkommensstarke Stadtteile erreichen und damit bestehende Ungleichheiten ' +
      'verschärfen. Stadtplaner:innen fordern daher verbindliche Quoten für ' +
      'Begrünung in sozial schwächeren Vierteln und eine Kopplung von ' +
      'Bauprojekten an Versickerungsflächen-Auflagen."',
    targetWords: { min: 150, target: 180, max: 210 },
    suggestedMinutes: 25,
    tags: ['Umwelt', 'Stadt', 'Klima'],
    source: 'seed'
  },
  {
    id: 'wp-zus-digitale-medizin',
    type: 'zusammenfassung',
    defaultRubric: 'telc-c1',
    level: 'C1',
    titleDe: 'Digitale Sprechstunden in Hausarztpraxen',
    promptText:
      'Fassen Sie den unten stehenden Artikel sachlich und in eigenen Worten ' +
      'zusammen. Geben Sie die Hauptaussagen und mindestens zwei genannte Beispiele ' +
      'wieder. Verzichten Sie auf eigene Meinung. Circa 180 Wörter.',
    promptContext:
      'Quelltext (gekürzt, Die Zeit 2025):\n\n' +
      '"Seit der Pandemie sind Videosprechstunden ein fester Bestandteil vieler ' +
      'Hausarztpraxen. Eine aktuelle Auswertung der Kassenärztlichen ' +
      'Bundesvereinigung zeigt, dass 2024 rund 18 Prozent aller hausärztlichen ' +
      'Konsultationen digital stattfanden — ein Anstieg von zwölf Prozentpunkten ' +
      'gegenüber 2019. Patient:innen schätzen den Wegfall langer Wartezeiten, ' +
      'insbesondere in ländlichen Regionen. Eine Hausärztin aus dem Allgäu berichtet, ' +
      'dass sie pro Tag bis zu zwanzig digitale Konsultationen abhalte und so ' +
      'dreifach mehr Patient:innen versorgen könne als zuvor. Allerdings warnen ' +
      'Ärztekammern vor Qualitätsverlust bei reiner Bildübertragung: Diagnosen ohne ' +
      'körperliche Untersuchung blieben unsicher. Datenschutzbedenken bezüglich der ' +
      'eingesetzten Plattformen sind ein weiteres Hindernis für die flächendeckende ' +
      'Einführung."',
    targetWords: { min: 150, target: 180, max: 210 },
    suggestedMinutes: 25,
    tags: ['Medizin', 'Digitalisierung'],
    source: 'seed'
  },

  // ── Stellungnahme ─────────────────────────────────────────────────
  {
    id: 'wp-stell-vier-tage-woche',
    type: 'stellungnahme',
    defaultRubric: 'telc-c1',
    level: 'C1',
    titleDe: 'Vier-Tage-Woche bei gleichem Lohn',
    promptText:
      'In mehreren europäischen Ländern wird die Einführung einer Vier-Tage-Woche ' +
      'bei vollem Lohnausgleich diskutiert. Nehmen Sie persönlich Stellung: Ist eine ' +
      'solche Regelung für die deutsche Wirtschaft realistisch und wünschenswert? ' +
      'Stützen Sie Ihre Position auf mindestens zwei begründete Argumente und gehen ' +
      'Sie auf einen Gegeneinwand ein. Circa 200 Wörter.',
    targetWords: { min: 170, target: 200, max: 230 },
    suggestedMinutes: 30,
    tags: ['Arbeit', 'Gesellschaft'],
    source: 'seed'
  },
  {
    id: 'wp-stell-tempolimit',
    type: 'stellungnahme',
    defaultRubric: 'telc-c1',
    level: 'C1',
    titleDe: 'Tempolimit auf Autobahnen',
    promptText:
      'Deutschland ist eines der wenigen Länder ohne generelles Tempolimit auf ' +
      'Autobahnen. Nehmen Sie persönlich Stellung zu der Frage, ob ein Tempolimit von ' +
      '130 km/h eingeführt werden sollte. Stützen Sie Ihre Position auf mindestens ' +
      'zwei begründete Argumente, gehen Sie auf einen häufig genannten Gegeneinwand ' +
      'ein und schließen Sie mit einer klaren Empfehlung. Circa 200 Wörter.',
    targetWords: { min: 170, target: 200, max: 230 },
    suggestedMinutes: 30,
    tags: ['Verkehr', 'Politik', 'Umwelt'],
    source: 'seed'
  }
]
