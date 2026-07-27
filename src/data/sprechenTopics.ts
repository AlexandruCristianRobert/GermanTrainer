// Sprechen Teil 2 — seeded Topics (see CONTEXT.md → "Topic").
// 100 hand-authored controversial statements in the exam's format. There is
// no Dexie table for Topics (writingPrompts.ts convention): adding seeds is
// a code change; `source: 'custom'` marks AI-generated Topics living in
// localStorage['gt:sprechenCustomTopics'] (see useSprechenTopics.ts).

export const TOPIC_TAGS = [
  'Umwelt', 'Arbeit', 'Technologie', 'Bildung', 'Gesundheit',
  'Medien', 'Gesellschaft', 'Reisen', 'Konsum', 'Familie'
] as const

export type TopicTag = (typeof TOPIC_TAGS)[number]

export interface SprechenTopic {
  id: string                 // 'st-umwelt-autofreie-innenstadt' / custom: 'st-custom-<epoch>-<i>'
  titleDe: string            // short label, unique — the done-topic memory key
  statementDe: string        // the controversial statement/question the Discussion argues
  tags: TopicTag[]
  level: 'B2'
  source: 'seed' | 'custom'
}

const T = (id: string, titleDe: string, statementDe: string, tags: TopicTag[]): SprechenTopic =>
  ({ id, titleDe, statementDe, tags, level: 'B2', source: 'seed' })

export const SPRECHEN_TOPICS: SprechenTopic[] = [
  // ── Umwelt ──────────────────────────────────────────────────────
  T('st-umwelt-autofreie-innenstadt', 'Autofreie Innenstädte', 'Sollten Autos aus den Innenstädten verbannt werden?', ['Umwelt']),
  T('st-umwelt-kurzstreckenfluege', 'Kurzstreckenflüge', 'Sollten Kurzstreckenflüge stark besteuert oder ganz verboten werden?', ['Umwelt', 'Reisen']),
  T('st-umwelt-einwegplastik', 'Einwegplastik', 'Sollte Einwegplastik komplett verboten werden?', ['Umwelt', 'Konsum']),
  T('st-umwelt-fleischpreis', 'Teureres Fleisch', 'Sollte Fleisch teurer werden, um das Klima zu schützen?', ['Umwelt', 'Gesundheit']),
  T('st-umwelt-atomkraft', 'Atomkraft', 'Ist Atomkraft eine gute Lösung gegen den Klimawandel?', ['Umwelt', 'Technologie']),
  T('st-umwelt-tempolimit', 'Tempolimit', 'Brauchen wir ein generelles Tempolimit auf Autobahnen?', ['Umwelt', 'Gesellschaft']),
  T('st-umwelt-muelltrennung', 'Mülltrennung', 'Sollte Mülltrennung gesetzlich vorgeschrieben und kontrolliert werden?', ['Umwelt']),
  T('st-umwelt-klimaproteste', 'Klimaproteste', 'Sind radikale Klimaproteste gerechtfertigt?', ['Umwelt', 'Gesellschaft']),
  T('st-umwelt-nahverkehr-kostenlos', 'Kostenloser Nahverkehr', 'Sollten Busse und Bahnen für alle kostenlos sein?', ['Umwelt', 'Gesellschaft']),
  T('st-umwelt-schottergaerten', 'Schottergärten', 'Sollten pflegeleichte Schottergärten verboten werden?', ['Umwelt']),
  // ── Arbeit ──────────────────────────────────────────────────────
  T('st-arbeit-recht-auf-homeoffice', 'Recht auf Homeoffice', 'Sollten Arbeitnehmer ein gesetzliches Recht auf Homeoffice haben?', ['Arbeit']),
  T('st-arbeit-vier-tage-woche', 'Vier-Tage-Woche', 'Sollte die Vier-Tage-Woche zum Standard werden?', ['Arbeit']),
  T('st-arbeit-mindestlohn', 'Höherer Mindestlohn', 'Sollte der Mindestlohn deutlich erhöht werden?', ['Arbeit', 'Gesellschaft']),
  T('st-arbeit-dresscode', 'Dresscode im Büro', 'Sind Kleidervorschriften am Arbeitsplatz noch zeitgemäß?', ['Arbeit']),
  T('st-arbeit-jobwechsel', 'Häufige Jobwechsel', 'Ist es besser, oft den Arbeitgeber zu wechseln, als lange in einer Firma zu bleiben?', ['Arbeit']),
  T('st-arbeit-ueberstunden', 'Überstunden', 'Sollten Überstunden immer bezahlt werden müssen?', ['Arbeit']),
  T('st-arbeit-rente-mit-70', 'Rente mit 70', 'Müssen wir in Zukunft bis 70 arbeiten?', ['Arbeit', 'Gesellschaft']),
  T('st-arbeit-anonyme-bewerbung', 'Anonyme Bewerbungen', 'Sollten Bewerbungen ohne Foto und Namen erfolgen?', ['Arbeit', 'Gesellschaft']),
  T('st-arbeit-unbezahlte-praktika', 'Unbezahlte Praktika', 'Sollten unbezahlte Praktika verboten werden?', ['Arbeit', 'Bildung']),
  T('st-arbeit-sinn-oder-gehalt', 'Sinn oder Gehalt', 'Ist ein sinnvoller Job wichtiger als ein hohes Gehalt?', ['Arbeit']),
  // ── Technologie ─────────────────────────────────────────────────
  T('st-tech-ki-im-alltag', 'KI im Alltag', 'Macht künstliche Intelligenz unser Leben besser?', ['Technologie']),
  T('st-tech-smartphone-kinder', 'Smartphones für Kinder', 'Sollten Kinder unter zwölf Jahren ein eigenes Smartphone haben?', ['Technologie', 'Familie']),
  T('st-tech-klarnamenpflicht', 'Klarnamenpflicht', 'Sollte man sich im Internet nur mit echtem Namen äußern dürfen?', ['Technologie', 'Medien']),
  T('st-tech-bargeld', 'Bargeldloses Bezahlen', 'Sollte Bargeld abgeschafft werden?', ['Technologie', 'Konsum']),
  T('st-tech-elektroautos', 'Elektroautos', 'Sind Elektroautos wirklich die Zukunft?', ['Technologie', 'Umwelt']),
  T('st-tech-videoueberwachung', 'Videoüberwachung', 'Brauchen wir mehr Videoüberwachung an öffentlichen Plätzen?', ['Technologie', 'Gesellschaft']),
  T('st-tech-online-shopping', 'Online-Shopping', 'Zerstört Online-Shopping die Innenstädte?', ['Technologie', 'Konsum']),
  T('st-tech-digital-detox', 'Digital Detox', 'Brauchen wir regelmäßige Pausen vom Internet?', ['Technologie', 'Gesundheit']),
  T('st-tech-pflegeroboter', 'Roboter in der Pflege', 'Sollten Roboter alte Menschen pflegen?', ['Technologie', 'Gesundheit']),
  T('st-tech-computerspiele', 'Computerspiele', 'Sind Computerspiele ein wertvolles Hobby oder Zeitverschwendung?', ['Technologie', 'Medien']),
  // ── Bildung ─────────────────────────────────────────────────────
  T('st-bildung-schulnoten', 'Schulnoten', 'Sollten Schulnoten abgeschafft werden?', ['Bildung']),
  T('st-bildung-hausaufgaben', 'Hausaufgaben', 'Sind Hausaufgaben sinnvoll?', ['Bildung']),
  T('st-bildung-handyverbot', 'Handyverbot an Schulen', 'Sollten Handys an Schulen verboten werden?', ['Bildung', 'Technologie']),
  T('st-bildung-kostenloses-studium', 'Kostenloses Studium', 'Sollte das Studium für alle kostenlos sein?', ['Bildung', 'Gesellschaft']),
  T('st-bildung-schuluniform', 'Schuluniform', 'Sollten Schülerinnen und Schüler eine Schuluniform tragen?', ['Bildung']),
  T('st-bildung-zwei-fremdsprachen', 'Fremdsprachenpflicht', 'Sollte jeder mindestens zwei Fremdsprachen lernen müssen?', ['Bildung']),
  T('st-bildung-ki-hausarbeiten', 'KI in der Schule', 'Sollten Schüler künstliche Intelligenz für Hausarbeiten benutzen dürfen?', ['Bildung', 'Technologie']),
  T('st-bildung-weiterbildung', 'Lebenslanges Lernen', 'Ist berufliche Weiterbildung Pflicht des Arbeitgebers oder Privatsache?', ['Bildung', 'Arbeit']),
  T('st-bildung-alltagswissen', 'Alltagswissen', 'Sollte die Schule mehr praktisches Alltagswissen wie Steuern und Verträge vermitteln?', ['Bildung']),
  T('st-bildung-auslandsjahr', 'Auslandsjahr', 'Sollte jeder junge Mensch eine Zeit im Ausland verbringen?', ['Bildung', 'Reisen']),
  // ── Gesundheit ──────────────────────────────────────────────────
  T('st-gesundheit-zuckersteuer', 'Zuckersteuer', 'Sollten zuckerhaltige Getränke höher besteuert werden?', ['Gesundheit', 'Konsum']),
  T('st-gesundheit-rauchverbot', 'Rauchverbot', 'Sollte Rauchen in der Öffentlichkeit komplett verboten werden?', ['Gesundheit', 'Gesellschaft']),
  T('st-gesundheit-krankenkassen-sport', 'Belohnung für Sport', 'Sollten Krankenkassen sportlich aktive Mitglieder finanziell belohnen?', ['Gesundheit']),
  T('st-gesundheit-fastfood-werbung', 'Fast-Food-Werbung', 'Sollte Werbung für ungesundes Essen verboten werden?', ['Gesundheit', 'Medien']),
  T('st-gesundheit-psychische-gesundheit', 'Psychische Gesundheit', 'Nehmen wir psychische Gesundheit ernst genug?', ['Gesundheit', 'Gesellschaft']),
  T('st-gesundheit-homoeopathie', 'Alternative Medizin', 'Sollten Krankenkassen Homöopathie bezahlen?', ['Gesundheit']),
  T('st-gesundheit-organspende', 'Organspende', 'Sollte jeder automatisch Organspender sein, solange er nicht widerspricht?', ['Gesundheit', 'Gesellschaft']),
  T('st-gesundheit-impfpflicht', 'Impfpflicht', 'Sollte es für bestimmte Krankheiten eine Impfpflicht geben?', ['Gesundheit']),
  T('st-gesundheit-spaeter-schulbeginn', 'Später Schulbeginn', 'Sollte die Schule später am Morgen beginnen?', ['Gesundheit', 'Bildung']),
  T('st-gesundheit-fitness-tracker', 'Fitness-Tracker', 'Machen Fitness-Tracker uns wirklich gesünder?', ['Gesundheit', 'Technologie']),
  // ── Medien ──────────────────────────────────────────────────────
  T('st-medien-bildschirmzeit', 'Bildschirmzeit für Kinder', 'Sollten Eltern die Bildschirmzeit ihrer Kinder streng begrenzen?', ['Medien', 'Familie']),
  T('st-medien-influencer', 'Influencer', 'Sind Influencer gute Vorbilder für Jugendliche?', ['Medien']),
  T('st-medien-taegliche-nachrichten', 'Tägliche Nachrichten', 'Muss man täglich Nachrichten verfolgen, um informiert zu sein?', ['Medien']),
  T('st-medien-fake-news-haftung', 'Haftung für Fake News', 'Sollten soziale Netzwerke für Falschnachrichten haften?', ['Medien', 'Technologie']),
  T('st-medien-rundfunkbeitrag', 'Rundfunkbeitrag', 'Ist der öffentlich-rechtliche Rundfunk sein Geld wert?', ['Medien', 'Gesellschaft']),
  T('st-medien-buecher-oder-serien', 'Bücher oder Serien', 'Sind Bücher die bessere Unterhaltung als Filme und Serien?', ['Medien']),
  T('st-medien-personalisierte-werbung', 'Personalisierte Werbung', 'Sollte personalisierte Werbung im Internet verboten werden?', ['Medien', 'Technologie']),
  T('st-medien-podcast-statt-zeitung', 'Podcast statt Zeitung', 'Können Podcasts und Videos die Zeitung ersetzen?', ['Medien']),
  T('st-medien-reality-tv', 'Reality-TV', 'Ist Reality-TV harmlose Unterhaltung oder schädlich?', ['Medien']),
  T('st-medien-streaming-kino', 'Streaming und Kino', 'Machen Streaming-Dienste das Kino überflüssig?', ['Medien', 'Technologie']),
  // ── Gesellschaft ────────────────────────────────────────────────
  T('st-gesellschaft-soziales-jahr', 'Soziales Jahr', 'Sollte jeder Bürger ein verpflichtendes soziales Jahr leisten?', ['Gesellschaft']),
  T('st-gesellschaft-wahlalter-16', 'Wählen mit 16', 'Sollte das Wahlalter auf 16 gesenkt werden?', ['Gesellschaft']),
  T('st-gesellschaft-grundeinkommen', 'Grundeinkommen', 'Sollte der Staat allen ein bedingungsloses Grundeinkommen zahlen?', ['Gesellschaft', 'Arbeit']),
  T('st-gesellschaft-nachbarschaft', 'Anonyme Nachbarschaft', 'Ist es ein Problem, dass viele Menschen ihre Nachbarn nicht mehr kennen?', ['Gesellschaft']),
  T('st-gesellschaft-hoeflichkeit', 'Höflichkeit', 'Wird Höflichkeit in unserer Gesellschaft unwichtiger?', ['Gesellschaft']),
  T('st-gesellschaft-tattoos-beruf', 'Tattoos im Beruf', 'Sollten sichtbare Tattoos in allen Berufen akzeptiert werden?', ['Gesellschaft', 'Arbeit']),
  T('st-gesellschaft-sonntagsoeffnung', 'Sonntagsöffnung', 'Sollten Geschäfte auch sonntags öffnen dürfen?', ['Gesellschaft', 'Konsum']),
  T('st-gesellschaft-haustiere-stadt', 'Haustiere in der Stadt', 'Ist Haustierhaltung in kleinen Stadtwohnungen fair gegenüber den Tieren?', ['Gesellschaft']),
  T('st-gesellschaft-mehr-feiertage', 'Mehr Feiertage', 'Braucht Deutschland mehr gesetzliche Feiertage?', ['Gesellschaft', 'Arbeit']),
  T('st-gesellschaft-siezen', 'Du oder Sie', 'Sollten wir das Siezen abschaffen?', ['Gesellschaft']),
  // ── Reisen ──────────────────────────────────────────────────────
  T('st-reisen-massentourismus', 'Massentourismus', 'Sollten beliebte Reiseziele die Zahl der Besucher begrenzen?', ['Reisen', 'Umwelt']),
  T('st-reisen-kreuzfahrten', 'Kreuzfahrten', 'Sollten Kreuzfahrten wegen der Umweltbelastung eingeschränkt werden?', ['Reisen', 'Umwelt']),
  T('st-reisen-urlaub-im-inland', 'Urlaub im Inland', 'Ist Urlaub im eigenen Land die bessere Wahl?', ['Reisen']),
  T('st-reisen-camping', 'Camping oder Hotel', 'Ist Camping die schönste Art zu reisen?', ['Reisen']),
  T('st-reisen-im-ausland-leben', 'Im Ausland leben', 'Sollte man für einige Jahre im Ausland leben?', ['Reisen', 'Arbeit']),
  T('st-reisen-all-inclusive', 'All-inclusive-Urlaub', 'Ist All-inclusive-Urlaub echter Urlaub oder nur Bequemlichkeit?', ['Reisen', 'Konsum']),
  T('st-reisen-bildung', 'Reisen bildet', 'Lernt man auf Reisen mehr als aus Büchern?', ['Reisen', 'Bildung']),
  T('st-reisen-stadt-oder-natur', 'Stadt oder Natur', 'Erholt man sich in der Natur besser als in der Stadt?', ['Reisen', 'Gesundheit']),
  T('st-reisen-planung', 'Spontan oder geplant', 'Sollte man Reisen bis ins Detail planen?', ['Reisen']),
  T('st-reisen-workation', 'Arbeiten vom Strand', 'Arbeiten von überall auf der Welt — funktioniert das wirklich?', ['Reisen', 'Arbeit']),
  // ── Konsum ──────────────────────────────────────────────────────
  T('st-konsum-secondhand', 'Secondhand kaufen', 'Sollten wir mehr gebrauchte Dinge kaufen statt neue?', ['Konsum', 'Umwelt']),
  T('st-konsum-fast-fashion', 'Fast Fashion', 'Sollte Billigmode höher besteuert werden?', ['Konsum', 'Umwelt']),
  T('st-konsum-regionale-produkte', 'Regional kaufen', 'Sind regionale Produkte ihren höheren Preis wert?', ['Konsum']),
  T('st-konsum-weniger-ist-mehr', 'Weniger ist mehr', 'Macht weniger Konsum glücklicher?', ['Konsum', 'Gesellschaft']),
  T('st-konsum-lieferdienste', 'Lieferdienste', 'Machen Lieferdienste unser Leben besser?', ['Konsum', 'Technologie']),
  T('st-konsum-reparierbarkeit', 'Wegwerfgesellschaft', 'Sollten Hersteller verpflichtet werden, reparierbare Geräte zu bauen?', ['Konsum', 'Umwelt']),
  T('st-konsum-markenkleidung', 'Markenkleidung', 'Lohnt es sich, für Marken mehr zu bezahlen?', ['Konsum']),
  T('st-konsum-lebensmittel-spenden', 'Lebensmittelverschwendung', 'Sollten Supermärkte unverkaufte Lebensmittel spenden müssen?', ['Konsum', 'Gesellschaft']),
  T('st-konsum-black-friday', 'Rabattaktionen', 'Verführen Aktionen wie der Black Friday zu unnötigen Käufen?', ['Konsum']),
  T('st-konsum-abo-modelle', 'Abo statt Besitz', 'Besitzen wir bald nichts mehr — und ist das schlimm?', ['Konsum', 'Technologie']),
  // ── Familie ─────────────────────────────────────────────────────
  T('st-familie-taschengeld', 'Taschengeld', 'Sollten Kinder ein festes Taschengeld bekommen?', ['Familie']),
  T('st-familie-grosseltern', 'Großeltern als Betreuer', 'Sollten Großeltern regelmäßig bei der Kinderbetreuung helfen?', ['Familie']),
  T('st-familie-hausarbeit', 'Hausarbeit teilen', 'Sollte Hausarbeit in der Familie streng zur Hälfte geteilt werden?', ['Familie', 'Gesellschaft']),
  T('st-familie-hotel-mama', 'Hotel Mama', 'Sollten junge Erwachsene früh von zu Hause ausziehen?', ['Familie']),
  T('st-familie-gemeinsames-essen', 'Gemeinsames Abendessen', 'Ist das gemeinsame Abendessen für Familien wichtig?', ['Familie']),
  T('st-familie-strenge-erziehung', 'Regeln oder Freiheit', 'Brauchen Kinder mehr Regeln oder mehr Freiheit?', ['Familie', 'Bildung']),
  T('st-familie-ganztagsbetreuung', 'Ganztagsbetreuung', 'Sollten Kitas und Schulen ganztags betreuen?', ['Familie', 'Bildung']),
  T('st-familie-karriere', 'Familie und Karriere', 'Kann man Familie und Karriere wirklich vereinbaren?', ['Familie', 'Arbeit']),
  T('st-familie-ehe', 'Heiraten', 'Ist die Ehe noch zeitgemäß?', ['Familie', 'Gesellschaft']),
  T('st-familie-mehrgenerationenhaus', 'Mehrgenerationenhaus', 'Sollten mehrere Generationen unter einem Dach leben?', ['Familie'])
]

// Gemini responseSchema for the Topic generator (used by useSprechenTopics.ts).
export const TOPIC_GENERATOR_SCHEMA = {
  type: 'object',
  properties: {
    topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titleDe: { type: 'string' },
          statementDe: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } }
        },
        required: ['titleDe', 'statementDe', 'tags']
      }
    }
  },
  required: ['topics']
}
