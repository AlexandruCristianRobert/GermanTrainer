//
// Schreiben Teil 1 — the Schreibthema pool. See CONTEXT.md → "Schreibthema".
//
// A Schreibthema is a full task sheet, not a bare statement: like a [Topic]
// (Sprechen Teil 2) it invites taking a side, but it frames the subject as an
// online-forum discussion thread, prints the exam's own instruction, and adds
// its own four Inhaltspunkte with topic-flavored wording — unlike a
// Vortragsthema's fixed five Gliederungspunkte, these vary theme by theme
// (CONTEXT.md → "Inhaltspunkt"). Tags reuse the shared ten TopicTag fields
// so these themes resolve the module's own writing argument bank —
// resolveSchreibArgumentBank, authored separately in schreibenArguments.ts.
//
// This file holds the 44 seeded themes only: adding a seed is a code change.
// AI-generated themes are a separate, learner-owned pool that persists in
// localStorage rather than Dexie — mirroring useVortragsthemen.ts's
// 'gt:sprechenCustomVortragsthemen' convention — so `source: 'custom'` marks
// themes that never live in this array.

import type { TopicTag } from './sprechenTopics'

export interface Schreibthema {
  id: string                  // 'wt-<slug>' | custom: 'wt-custom-<epoch>-<i>'
  titleDe: string              // short unique label — the done-thema memory key
  forumContextDe: string       // one sentence: the forum thread the post answers
  taskDe: string                // exam instruction, starts with SCHREIBEN_TASK_PREFIX, names the 150-word floor
  inhaltspunkte: string[]      // exactly four, topic-flavored (CONTEXT.md → "Inhaltspunkt")
  tags: TopicTag[]              // 1-2 of the shared ten fields
  level: 'B2'
  source: 'seed' | 'custom'
}

/** The exam's own opening words. A Schreibthema's taskDe always starts here. */
export const SCHREIBEN_TASK_PREFIX = 'Schreiben Sie einen Forumsbeitrag'

const W = (
  id: string, titleDe: string, forumContextDe: string, taskDe: string,
  inhaltspunkte: string[], tags: TopicTag[]
): Schreibthema => ({ id, titleDe, forumContextDe, taskDe, inhaltspunkte, tags, level: 'B2', source: 'seed' })

export const SCHREIBEN_THEMEN: Schreibthema[] = [
  W('wt-homeoffice', 'Homeoffice als Normalfall',
    'Im Online-Forum „Arbeitswelt heute" diskutieren Nutzerinnen und Nutzer, ob Arbeiten von zu Hause der Normalfall werden sollte.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob das Homeoffice der Normalfall für Büroberufe werden sollte.',
    [
      'Äußern Sie Ihre Meinung zum Arbeiten im Homeoffice und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile des Homeoffice für Berufstätige.',
      'Berichten Sie von eigenen Erfahrungen oder Beobachtungen.',
      'Nennen Sie eine Alternative zum reinen Homeoffice.'
    ],
    ['Arbeit', 'Technologie']),
  W('wt-ki-im-alltag', 'KI im Alltag',
    'Im Forum „Digital leben" wird darüber diskutiert, wie stark künstliche Intelligenz den Alltag bestimmen darf.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, wie stark künstliche Intelligenz unseren Alltag bestimmen sollte.',
    [
      'Äußern Sie Ihre Meinung zum Einsatz von KI im Alltag und begründen Sie sie.',
      'Nennen Sie Bereiche, in denen KI besonders nützlich oder besonders riskant ist.',
      'Gehen Sie auf eine mögliche Gegenmeinung ein.',
      'Machen Sie einen Vorschlag, wie ein verantwortungsvoller Umgang mit KI aussehen könnte.'
    ],
    ['Technologie', 'Gesellschaft']),
  W('wt-fast-fashion', 'Fast Fashion',
    'Im Forum „Nachhaltig leben" diskutieren die Mitglieder, ob billige Wegwerfmode noch zeitgemäß ist.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob Fast Fashion stärker eingeschränkt werden sollte.',
    [
      'Äußern Sie Ihre Meinung zu Fast Fashion und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile von billiger, schnell wechselnder Mode.',
      'Berichten Sie von eigenen Erfahrungen beim Kleiderkauf.',
      'Schlagen Sie eine Alternative zum ständigen Neukauf von Kleidung vor.'
    ],
    ['Konsum', 'Umwelt']),
  W('wt-vier-tage-woche', 'Vier-Tage-Woche',
    'Im Forum „Arbeitswelt heute" wird diskutiert, ob die Vier-Tage-Woche zum Standard für alle Branchen werden sollte.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob die Vier-Tage-Woche der neue Standard werden sollte.',
    [
      'Äußern Sie Ihre Meinung zur Vier-Tage-Woche und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile einer kürzeren Arbeitswoche.',
      'Berichten Sie von eigenen Erfahrungen mit Arbeitszeit und Freizeit.',
      'Gehen Sie auf die Gegenmeinung ein, dass weniger Arbeitstage der Wirtschaft schaden.'
    ],
    ['Arbeit']),
  W('wt-autofreie-innenstadt', 'Autofreie Innenstädte',
    'Im Forum „Stadt der Zukunft" diskutieren Nutzerinnen und Nutzer, ob Innenstädte komplett autofrei werden sollten.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob Innenstädte für Autos gesperrt werden sollten.',
    [
      'Äußern Sie Ihre Meinung zu autofreien Innenstädten und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile eines Autoverbots in der Innenstadt.',
      'Berichten Sie von eigenen Erfahrungen mit dem Verkehr in Ihrer Stadt.',
      'Machen Sie einen Vorschlag, wie Menschen ohne Auto in die Innenstadt kommen können.'
    ],
    ['Umwelt', 'Gesellschaft']),
  W('wt-social-media-jugend', 'Soziale Medien und Jugendliche',
    'Im Forum „Familie und Medien" diskutieren Eltern, ab welchem Alter Jugendliche soziale Medien nutzen dürfen sollten.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, wie Jugendliche mit sozialen Medien umgehen sollten.',
    [
      'Äußern Sie Ihre Meinung zur Nutzung sozialer Medien durch Jugendliche und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile sozialer Medien für junge Menschen.',
      'Berichten Sie von eigenen Beobachtungen aus Familie oder Bekanntenkreis.',
      'Schlagen Sie eine Regel für einen verantwortungsvollen Umgang vor.'
    ],
    ['Medien', 'Familie']),
  W('wt-fleischkonsum', 'Weniger Fleisch essen',
    'Im Forum „Bewusst essen" wird diskutiert, ob wir alle deutlich weniger Fleisch essen sollten.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob der Fleischkonsum stark reduziert werden sollte.',
    [
      'Äußern Sie Ihre Meinung zum eigenen Fleischkonsum und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile einer fleischärmeren Ernährung.',
      'Berichten Sie von eigenen Erfahrungen mit vegetarischen oder veganen Gerichten.',
      'Gehen Sie auf die Gegenmeinung ein, dass jeder selbst entscheiden sollte, was er isst.'
    ],
    ['Gesundheit', 'Umwelt']),
  W('wt-bargeld', 'Bargeld abschaffen',
    'Im Forum „Digital bezahlen" diskutieren die Mitglieder, ob Bargeld in Zukunft komplett abgeschafft werden sollte.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob Bargeld abgeschafft werden sollte.',
    [
      'Äußern Sie Ihre Meinung zur Abschaffung von Bargeld und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile des bargeldlosen Bezahlens.',
      'Berichten Sie von eigenen Erfahrungen beim Bezahlen im Alltag.',
      'Nennen Sie eine Alternative, wie Bargeld und digitales Bezahlen nebeneinander bestehen könnten.'
    ],
    ['Konsum', 'Technologie']),
  W('wt-noten-schule', 'Noten in der Schule',
    'Im Forum „Schule heute" wird diskutiert, ob Schulnoten durch andere Formen der Bewertung ersetzt werden sollten.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob Noten in der Schule abgeschafft werden sollten.',
    [
      'Äußern Sie Ihre Meinung zu Schulnoten und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile der Bewertung mit Noten.',
      'Berichten Sie von eigenen Erfahrungen aus Ihrer eigenen Schulzeit.',
      'Machen Sie einen Vorschlag für eine andere Form der Leistungsbewertung.'
    ],
    ['Bildung']),
  W('wt-ehrenamt-pflicht', 'Pflichtjahr für alle',
    'Im Forum „Gesellschaft mitgestalten" diskutieren Nutzerinnen und Nutzer, ob ein soziales Pflichtjahr für alle jungen Menschen eingeführt werden sollte.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob ein verpflichtendes soziales Jahr eingeführt werden sollte.',
    [
      'Äußern Sie Ihre Meinung zu einem verpflichtenden sozialen Jahr und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile eines Pflichtjahrs für junge Menschen.',
      'Berichten Sie von eigenen Erfahrungen mit freiwilligem oder ehrenamtlichem Engagement.',
      'Gehen Sie auf die Gegenmeinung ein, dass Freiwilligkeit wichtiger ist als eine Pflicht.'
    ],
    ['Gesellschaft']),
  W('wt-tourismus-grenzen', 'Grenzen des Tourismus',
    'Im Forum „Reisen mit Verantwortung" wird diskutiert, ob beliebte Reiseziele die Zahl der Touristinnen und Touristen begrenzen sollten.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob es Grenzen für den Massentourismus geben sollte.',
    [
      'Äußern Sie Ihre Meinung zu Grenzen für den Tourismus und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile einer Begrenzung der Besucherzahlen.',
      'Berichten Sie von eigenen Erfahrungen mit stark überfüllten Reisezielen.',
      'Machen Sie einen Vorschlag, wie Tourismus verträglicher gestaltet werden könnte.'
    ],
    ['Reisen', 'Umwelt']),
  W('wt-online-studium', 'Online studieren',
    'Im Forum „Studieren heute" diskutieren Studierende, ob Online-Studiengänge ein vollwertiger Ersatz für das Präsenzstudium sind.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob ein Studium komplett online stattfinden sollte.',
    [
      'Äußern Sie Ihre Meinung zum Online-Studium und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile eines Studiums ohne Präsenzveranstaltungen.',
      'Berichten Sie von eigenen Erfahrungen mit Online-Kursen oder digitalem Lernen.',
      'Nennen Sie eine Alternative zwischen reinem Online-Studium und klassischem Präsenzstudium.'
    ],
    ['Bildung', 'Technologie']),
  W('wt-teilzeit-fuer-alle', 'Teilzeit für alle',
    'Im Forum „Beruf und Familie" wird diskutiert, ob alle Berufstätigen ein Recht auf Teilzeitarbeit haben sollten.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob Teilzeitarbeit für alle Berufstätigen möglich sein sollte.',
    [
      'Äußern Sie Ihre Meinung zu einem Recht auf Teilzeitarbeit und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile der Teilzeitarbeit für Berufstätige und Familien.',
      'Berichten Sie von eigenen Erfahrungen mit der Vereinbarkeit von Beruf und Familie.',
      'Gehen Sie auf die Gegenmeinung ein, dass Teilzeit für manche Berufe nicht praktikabel ist.'
    ],
    ['Arbeit', 'Familie']),
  W('wt-werbung-kinder', 'Werbung für Kinder verbieten',
    'Im Forum „Kinder und Konsum" diskutieren Eltern, ob Werbung, die sich gezielt an Kinder richtet, verboten werden sollte.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob Werbung für Kinder verboten werden sollte.',
    [
      'Äußern Sie Ihre Meinung zu Werbung, die sich an Kinder richtet, und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile eines Werbeverbots für Kinderprodukte.',
      'Berichten Sie von eigenen Beobachtungen zu Werbung im Alltag von Kindern.',
      'Machen Sie einen Vorschlag, wie Kinder besser vor Werbung geschützt werden könnten.'
    ],
    ['Medien', 'Konsum']),
  W('wt-fitness-tracker', 'Gesundheits-Apps und Tracker',
    'Im Forum „Fit mit Technik" wird diskutiert, wie sinnvoll Gesundheits-Apps und Fitness-Tracker im Alltag wirklich sind.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, wie nützlich Gesundheits-Apps und Tracker im Alltag sind.',
    [
      'Äußern Sie Ihre Meinung zu Gesundheits-Apps und Trackern und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile der ständigen Selbstvermessung durch Apps.',
      'Berichten Sie von eigenen Erfahrungen mit einer Gesundheits-App oder einem Tracker.',
      'Gehen Sie auf die Gegenmeinung ein, dass solche Apps eher unnötigen Druck erzeugen.'
    ],
    ['Gesundheit', 'Technologie']),
  W('wt-mehrgenerationenhaus', 'Wohnen mit mehreren Generationen',
    'Im Forum „Zusammen wohnen" diskutieren Nutzerinnen und Nutzer, ob mehrere Generationen wieder öfter unter einem Dach leben sollten.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob mehrere Generationen häufiger zusammenwohnen sollten.',
    [
      'Äußern Sie Ihre Meinung zum Zusammenwohnen mehrerer Generationen und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile eines Mehrgenerationenhaushalts.',
      'Berichten Sie von eigenen Erfahrungen mit dem Zusammenleben verschiedener Generationen.',
      'Nennen Sie eine Alternative zum klassischen Mehrgenerationenhaus.'
    ],
    ['Familie', 'Gesellschaft']),
  W('wt-billigfluege', 'Billigflüge',
    'Im Forum „Reisen mit Verantwortung" wird diskutiert, ob Billigflüge wegen ihrer Umweltbelastung stärker besteuert werden sollten.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob Billigflüge stärker eingeschränkt werden sollten.',
    [
      'Äußern Sie Ihre Meinung zu Billigflügen und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile besonders günstiger Flugangebote.',
      'Berichten Sie von eigenen Erfahrungen mit Billigfluglinien.',
      'Machen Sie einen Vorschlag für eine umweltfreundlichere Art des Reisens.'
    ],
    ['Reisen', 'Umwelt']),
  W('wt-smartphone-schule', 'Smartphones an Schulen',
    'Im Forum „Schule heute" diskutieren Eltern und Lehrkräfte, ob Smartphones an Schulen komplett verboten werden sollten.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob Smartphones an Schulen verboten werden sollten.',
    [
      'Äußern Sie Ihre Meinung zu einem Smartphone-Verbot an Schulen und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile von Smartphones im Schulalltag.',
      'Berichten Sie von eigenen Erfahrungen mit Handynutzung während der Schulzeit.',
      'Gehen Sie auf die Gegenmeinung ein, dass Smartphones auch sinnvoll im Unterricht eingesetzt werden können.'
    ],
    ['Bildung', 'Medien']),
  W('wt-selbstoptimierung', 'Ständige Selbstoptimierung',
    'Im Forum „Besser leben" wird diskutiert, ob der Trend zur ständigen Selbstoptimierung mehr schadet als nützt.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob ständige Selbstoptimierung sinnvoll oder schädlich ist.',
    [
      'Äußern Sie Ihre Meinung zum Trend der Selbstoptimierung und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile eines Lebens mit ständiger Selbstverbesserung.',
      'Berichten Sie von eigenen Erfahrungen mit Zielen für die eigene Leistung oder Gesundheit.',
      'Machen Sie einen Vorschlag, wie ein gesünderer Umgang mit dem eigenen Anspruch aussehen könnte.'
    ],
    ['Gesundheit', 'Gesellschaft']),
  W('wt-regionale-produkte', 'Regional einkaufen',
    'Im Forum „Bewusst einkaufen" diskutieren Nutzerinnen und Nutzer, ob wir grundsätzlich mehr regionale Produkte kaufen sollten.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob regionales Einkaufen zur Regel werden sollte.',
    [
      'Äußern Sie Ihre Meinung zum regionalen Einkaufen und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile regionaler Produkte gegenüber importierter Ware.',
      'Berichten Sie von eigenen Erfahrungen beim Einkauf auf Wochenmärkten oder in Hofläden.',
      'Gehen Sie auf die Gegenmeinung ein, dass regionale Produkte oft zu teuer sind.'
    ],
    ['Konsum', 'Umwelt']),
  W('wt-streaming-kino', 'Streaming statt Kino',
    'Im Forum „Filme und Serien" wird diskutiert, ob Streaming-Dienste das klassische Kino auf Dauer überflüssig machen.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob Streaming das Kino ersetzen sollte.',
    [
      'Äußern Sie Ihre Meinung zum Streaming als Ersatz für das Kino und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile des Streamings gegenüber einem Kinobesuch.',
      'Berichten Sie von eigenen Erfahrungen beim Filmeschauen zu Hause oder im Kino.',
      'Nennen Sie eine Alternative, wie Kinos gegenüber dem Streaming attraktiv bleiben könnten.'
    ],
    ['Medien']),
  W('wt-auswandern', 'Zum Arbeiten ins Ausland',
    'Im Forum „Arbeiten weltweit" diskutieren Nutzerinnen und Nutzer, ob man für den Beruf für längere Zeit ins Ausland gehen sollte.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob man zum Arbeiten ins Ausland gehen sollte.',
    [
      'Äußern Sie Ihre Meinung zum Arbeiten im Ausland und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile eines längeren Auslandsaufenthalts für den Beruf.',
      'Berichten Sie von eigenen Erfahrungen oder Beobachtungen zum Leben im Ausland.',
      'Machen Sie einen Vorschlag, wie sich Karriere im Ausland und ein Leben in der Heimat verbinden lassen.'
    ],
    ['Reisen', 'Arbeit']),
  W('wt-haustiere-stadt', 'Haustiere in der Stadtwohnung',
    'Im Forum „Tiere im Alltag" wird diskutiert, ob Haustierhaltung in kleinen Stadtwohnungen den Tieren gegenüber fair ist.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob Haustiere in kleine Stadtwohnungen passen.',
    [
      'Äußern Sie Ihre Meinung zur Haustierhaltung in der Stadtwohnung und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile eines Haustiers auf wenig Wohnraum.',
      'Berichten Sie von eigenen Erfahrungen mit Haustieren in Ihrem Umfeld.',
      'Gehen Sie auf die Gegenmeinung ein, dass Liebe und Zeit wichtiger sind als die Wohnungsgröße.'
    ],
    ['Familie', 'Gesellschaft']),
  W('wt-lebenslanges-lernen', 'Lebenslanges Lernen',
    'Im Forum „Weiterbildung heute" diskutieren Berufstätige, wie wichtig lebenslanges Lernen für den beruflichen Erfolg ist.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, wie wichtig lebenslanges Lernen im Berufsleben ist.',
    [
      'Äußern Sie Ihre Meinung zum lebenslangen Lernen und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile ständiger Weiterbildung neben dem Beruf.',
      'Berichten Sie von eigenen Erfahrungen mit Fortbildungen oder neu erlernten Fähigkeiten.',
      'Machen Sie einen Vorschlag, wie Arbeitgeber lebenslanges Lernen besser unterstützen könnten.'
    ],
    ['Bildung', 'Arbeit']),
  W('wt-tempolimit', 'Tempolimit auf Autobahnen',
    'Im Forum „Mobilität von morgen" diskutieren Nutzerinnen und Nutzer, ob auf Autobahnen ein generelles Tempolimit eingeführt werden sollte.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob auf Autobahnen ein generelles Tempolimit gelten sollte.',
    [
      'Äußern Sie Ihre Meinung zu einem generellen Tempolimit und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile eines Tempolimits auf Autobahnen.',
      'Berichten Sie von eigenen Erfahrungen als Autofahrerin, Autofahrer oder Mitfahrer.',
      'Gehen Sie auf die Gegenmeinung ein, dass ein Tempolimit die persönliche Freiheit einschränkt.'
    ],
    ['Umwelt', 'Gesellschaft']),
  W('wt-kostenloser-nahverkehr', 'Kostenloser Nahverkehr',
    'Im Forum „Stadt der Zukunft" wird diskutiert, ob Busse und Bahnen für alle kostenlos sein sollten.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob der öffentliche Nahverkehr kostenlos werden sollte.',
    [
      'Äußern Sie Ihre Meinung zum kostenlosen Nahverkehr und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile kostenloser Busse und Bahnen.',
      'Berichten Sie von eigenen Erfahrungen mit dem öffentlichen Nahverkehr im Alltag.',
      'Machen Sie einen Vorschlag, wie ein kostenloser Nahverkehr finanziert werden könnte.'
    ],
    ['Umwelt', 'Gesellschaft']),
  W('wt-einwegplastik', 'Einwegplastik verbieten',
    'Im Forum „Nachhaltig leben" diskutieren die Mitglieder, ob Einwegplastik vollständig verboten werden sollte.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob Einwegplastik komplett verboten werden sollte.',
    [
      'Äußern Sie Ihre Meinung zu einem Verbot von Einwegplastik und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile eines vollständigen Plastikverbots.',
      'Berichten Sie von eigenen Erfahrungen beim Einkaufen ohne Verpackungsmüll.',
      'Nennen Sie eine Alternative zu Verpackungen aus Einwegplastik.'
    ],
    ['Umwelt', 'Konsum']),
  W('wt-elektroautos', 'Elektroautos für alle',
    'Im Forum „Mobilität von morgen" wird diskutiert, ob das Elektroauto den Verbrennungsmotor möglichst schnell ersetzen sollte.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob alle möglichst bald auf Elektroautos umsteigen sollten.',
    [
      'Äußern Sie Ihre Meinung zum Umstieg auf Elektroautos und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile von Elektroautos im Alltag.',
      'Berichten Sie von eigenen Erfahrungen oder Beobachtungen zur Elektromobilität.',
      'Gehen Sie darauf ein, für wen sich ein Elektroauto heute schon lohnt und für wen noch nicht.'
    ],
    ['Umwelt', 'Technologie']),
  W('wt-erreichbarkeit-feierabend', 'Erreichbarkeit nach Feierabend',
    'Im Forum „Arbeitswelt heute" wird diskutiert, ob Beschäftigte nach Feierabend für den Arbeitgeber erreichbar sein müssen.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob Beschäftigte nach Feierabend erreichbar sein sollten.',
    [
      'Äußern Sie Ihre Meinung zur ständigen Erreichbarkeit und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile der Erreichbarkeit außerhalb der Arbeitszeit.',
      'Berichten Sie von eigenen Erfahrungen mit dienstlichen Nachrichten in der Freizeit.',
      'Machen Sie einen Vorschlag, wie klare Regeln für die Erreichbarkeit aussehen könnten.'
    ],
    ['Arbeit', 'Technologie']),
  W('wt-anonyme-bewerbung', 'Anonyme Bewerbungen',
    'Im Forum „Arbeitswelt heute" diskutieren Nutzerinnen und Nutzer, ob Bewerbungen ohne Foto, Name und Alter fairer sind.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob Bewerbungen anonym ablaufen sollten.',
    [
      'Äußern Sie Ihre Meinung zu anonymen Bewerbungen und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile von Bewerbungen ohne Foto und Namen.',
      'Berichten Sie von eigenen Erfahrungen oder Beobachtungen aus Bewerbungsverfahren.',
      'Gehen Sie darauf ein, ob anonyme Verfahren für alle Branchen geeignet sind.'
    ],
    ['Arbeit', 'Gesellschaft']),
  W('wt-laenger-arbeiten', 'Länger arbeiten im Alter',
    'Im Forum „Generationen im Gespräch" wird diskutiert, ob Menschen in Zukunft bis 70 arbeiten sollten.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob das Arbeitsleben bis 70 verlängert werden sollte.',
    [
      'Äußern Sie Ihre Meinung zu einem späteren Renteneintritt und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile eines längeren Arbeitslebens.',
      'Berichten Sie von Beobachtungen zu älteren Kolleginnen und Kollegen im Beruf.',
      'Gehen Sie auf die Gegenmeinung ein, dass viele Berufe im Alter körperlich nicht mehr zu schaffen sind.'
    ],
    ['Arbeit', 'Gesellschaft']),
  W('wt-handwerk-statt-studium', 'Handwerk statt Studium',
    'Im Forum „Berufswahl heute" diskutieren die Mitglieder, ob eine Ausbildung im Handwerk oft die bessere Wahl als ein Studium ist.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob eine Ausbildung im Handwerk die bessere Wahl als ein Studium sein kann.',
    [
      'Äußern Sie Ihre Meinung zur Wahl zwischen Ausbildung und Studium und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile einer Ausbildung gegenüber einem Studium.',
      'Berichten Sie von eigenen Erfahrungen aus Ihrem Berufsweg.',
      'Machen Sie einen Vorschlag, wie Schulen besser über Ausbildungsberufe informieren könnten.'
    ],
    ['Bildung', 'Arbeit']),
  W('wt-hausaufgaben', 'Hausaufgaben abschaffen',
    'Im Forum „Schule heute" wird diskutiert, ob Hausaufgaben abgeschafft werden sollten.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob Hausaufgaben abgeschafft werden sollten.',
    [
      'Äußern Sie Ihre Meinung zu Hausaufgaben und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile von Hausaufgaben für Schülerinnen und Schüler.',
      'Berichten Sie von eigenen Erinnerungen an Hausaufgaben aus Ihrer Schulzeit.',
      'Nennen Sie eine Alternative zu klassischen Hausaufgaben.'
    ],
    ['Bildung']),
  W('wt-schulkleidung', 'Einheitliche Schulkleidung',
    'Im Forum „Schule heute" diskutieren Eltern und Lehrkräfte, ob an Schulen eine einheitliche Schulkleidung eingeführt werden sollte.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob eine einheitliche Schulkleidung eingeführt werden sollte.',
    [
      'Äußern Sie Ihre Meinung zu einheitlicher Schulkleidung und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile einer einheitlichen Kleidung an Schulen.',
      'Berichten Sie von Beobachtungen zu Markenkleidung und Gruppendruck unter Schülern.',
      'Gehen Sie auf die Gegenmeinung ein, dass Kleidung ein wichtiges Mittel ist, die eigene Persönlichkeit auszudrücken.'
    ],
    ['Bildung', 'Gesellschaft']),
  W('wt-uebersetzungs-apps', 'Fremdsprachen trotz Übersetzungs-Apps',
    'Im Forum „Sprachen lernen" wird diskutiert, ob sich das Lernen von Fremdsprachen noch lohnt, wenn Apps in Sekunden übersetzen.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob sich Fremdsprachenlernen im Zeitalter der Übersetzungs-Apps noch lohnt.',
    [
      'Äußern Sie Ihre Meinung zum Fremdsprachenlernen trotz Übersetzungs-Apps und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile automatischer Übersetzungen.',
      'Berichten Sie von eigenen Erfahrungen beim Sprachenlernen.',
      'Gehen Sie darauf ein, was eine App beim Sprachenlernen nicht ersetzen kann.'
    ],
    ['Bildung', 'Technologie']),
  W('wt-influencer-beruf', 'Influencer als Beruf',
    'Im Forum „Digital leben" diskutieren Nutzerinnen und Nutzer, ob Influencer ein richtiger Beruf ist.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob Influencer ein Beruf wie jeder andere ist.',
    [
      'Äußern Sie Ihre Meinung zum Berufsbild Influencer und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile des Geldverdienens in sozialen Medien.',
      'Berichten Sie von Beobachtungen zu Influencern in Ihrem Alltag.',
      'Gehen Sie darauf ein, welche Fähigkeiten dieser Beruf tatsächlich verlangt.'
    ],
    ['Medien', 'Arbeit']),
  W('wt-videospiele', 'Videospiele als Hobby',
    'Im Forum „Freizeit und Medien" wird diskutiert, ob Videospiele ein wertvolles Hobby sind.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob Videospiele ein wertvolles Hobby sind.',
    [
      'Äußern Sie Ihre Meinung zu Videospielen als Freizeitbeschäftigung und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile des Spielens für Körper und Kopf.',
      'Berichten Sie von eigenen Erfahrungen mit Computerspielen oder von Beobachtungen im Freundeskreis.',
      'Gehen Sie auf die Gegenmeinung ein, dass Videospiele süchtig machen und einsam werden lassen.'
    ],
    ['Medien', 'Gesundheit']),
  W('wt-urlaub-ohne-smartphone', 'Urlaub ohne Smartphone',
    'Im Forum „Endlich Urlaub" wird diskutiert, ob man im Urlaub bewusst auf das Smartphone verzichten sollte.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob man im Urlaub auf das Smartphone verzichten sollte.',
    [
      'Äußern Sie Ihre Meinung zum digitalen Abschalten im Urlaub und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile eines Urlaubs ohne Smartphone.',
      'Berichten Sie von eigenen Erfahrungen mit ständiger Erreichbarkeit auf Reisen.',
      'Machen Sie einen Vorschlag, wie ein bewussterer Umgang mit dem Handy im Urlaub gelingen kann.'
    ],
    ['Reisen', 'Medien']),
  W('wt-allein-reisen', 'Allein reisen',
    'Im Forum „Endlich Urlaub" diskutieren die Mitglieder, ob Reisen allein oder in Begleitung schöner ist.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob man besser allein oder in Begleitung reist.',
    [
      'Äußern Sie Ihre Meinung zum Alleinreisen und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile des Reisens ohne Begleitung.',
      'Berichten Sie von eigenen Reiseerfahrungen allein oder in der Gruppe.',
      'Geben Sie einen Tipp, wie der erste Urlaub allein gelingen kann.'
    ],
    ['Reisen']),
  W('wt-ferienwohnungen', 'Private Ferienwohnungen',
    'Im Forum „Reisen mit Verantwortung" wird diskutiert, ob die Vermietung privater Ferienwohnungen in Großstädten eingeschränkt werden sollte.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob private Ferienwohnungen in Großstädten eingeschränkt werden sollten.',
    [
      'Äußern Sie Ihre Meinung zur Vermietung privater Ferienwohnungen und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile für Reisende und für die Bewohner der Städte.',
      'Berichten Sie von eigenen Erfahrungen mit Ferienwohnungen oder Hotels.',
      'Machen Sie einen Vorschlag, wie sich Tourismus und bezahlbarer Wohnraum vereinbaren lassen.'
    ],
    ['Reisen', 'Gesellschaft']),
  W('wt-schoenheitsoperationen', 'Schönheitsoperationen',
    'Im Forum „Besser leben" wird diskutiert, ob Schönheitsoperationen ein normaler Weg zu mehr Selbstbewusstsein sind.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob Schönheitsoperationen etwas ganz Normales geworden sind.',
    [
      'Äußern Sie Ihre Meinung zu Schönheitsoperationen und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile solcher Eingriffe.',
      'Berichten Sie von Beobachtungen zu Schönheitsidealen in Medien und Alltag.',
      'Gehen Sie darauf ein, wo für Sie die Grenze zwischen Selbstbestimmung und gefährlichem Trend liegt.'
    ],
    ['Gesundheit', 'Gesellschaft']),
  W('wt-mehr-sport-schule', 'Mehr Sport in der Schule',
    'Im Forum „Gesund aufwachsen" diskutieren Eltern und Lehrkräfte, ob Schulen täglich Sport anbieten sollten.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob es an Schulen täglich Sportunterricht geben sollte.',
    [
      'Äußern Sie Ihre Meinung zu täglichem Schulsport und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile von mehr Bewegung im Stundenplan.',
      'Berichten Sie von eigenen Erinnerungen an den Sportunterricht.',
      'Machen Sie einen Vorschlag, wie Bewegung ohne zusätzliche Sportstunden in den Schultag passen könnte.'
    ],
    ['Gesundheit', 'Bildung']),
  W('wt-taschengeld', 'Taschengeld für Kinder',
    'Im Forum „Kinder und Konsum" wird diskutiert, ob Kinder ein festes Taschengeld bekommen sollten.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Diskussion, ob Kinder ein festes Taschengeld bekommen sollten.',
    [
      'Äußern Sie Ihre Meinung zu festem Taschengeld für Kinder und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile eines regelmäßigen Taschengelds.',
      'Berichten Sie von eigenen Erfahrungen mit Taschengeld aus Ihrer Kindheit.',
      'Nennen Sie eine Alternative zum klassischen festen Taschengeld.'
    ],
    ['Familie', 'Konsum']),
  W('wt-grosseltern-betreuung', 'Großeltern als Betreuung',
    'Im Forum „Beruf und Familie" diskutieren Eltern, ob Großeltern regelmäßig die Kinderbetreuung übernehmen sollten.',
    'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob Großeltern regelmäßig die Kinder betreuen sollten.',
    [
      'Äußern Sie Ihre Meinung zur regelmäßigen Betreuung durch Großeltern und begründen Sie sie.',
      'Nennen Sie Vor- oder Nachteile für Kinder, Eltern und Großeltern.',
      'Berichten Sie von eigenen Erfahrungen aus Ihrer Familie oder Ihrem Umfeld.',
      'Nennen Sie eine Alternative für Familien, deren Großeltern nicht einspringen können.'
    ],
    ['Familie'])
]

// Gemini responseSchema for the Schreibthema generator (used by a future
// useSchreibenThemen.ts, mirrors VORTRAGSTHEMA_GENERATOR_SCHEMA's structure
// in sprechenVortragsthemen.ts).
export const SCHREIBTHEMA_GENERATOR_SCHEMA = {
  type: 'object',
  properties: {
    themen: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titleDe: { type: 'string' },
          forumContextDe: { type: 'string' },
          taskDe: { type: 'string' },
          inhaltspunkte: { type: 'array', items: { type: 'string' } },
          tags: { type: 'array', items: { type: 'string' } }
        },
        required: ['titleDe', 'forumContextDe', 'taskDe', 'inhaltspunkte', 'tags']
      }
    }
  },
  required: ['themen']
} as const
