//
// Sprechen Teil 1 — the Vortragsthema pool. See CONTEXT.md → "Vortragsthema".
//
// A Vortragsthema is deliberately NOT a [Topic]: it takes no sides and is
// phrased as the exam's own instruction, because Teil 1 is a monologue and
// there is nobody to argue against. Separate pool, separate generator.
// Tags reuse Teil 2's ten fields unchanged so resolveArgumentBank's tag-level
// fallback serves these themes with no new authoring.

import { TOPIC_TAGS, type TopicTag } from './sprechenTopics'

export interface Vortragsthema {
  id: string          // 'vt-ehrenamt' / custom: 'vt-custom-<epoch>-<i>'
  titleDe: string     // short label, unique — the done-theme memory key
  taskDe: string      // the exam's instruction: „Halten Sie einen kurzen Vortrag darüber, …"
  tags: TopicTag[]
  level: 'B2'
  source: 'seed' | 'custom'
}

const V = (id: string, titleDe: string, taskDe: string, tags: TopicTag[]): Vortragsthema =>
  ({ id, titleDe, taskDe, tags, level: 'B2', source: 'seed' })

export const SPRECHEN_VORTRAGSTHEMEN: Vortragsthema[] = [
  // ── Umwelt ──────────────────────────────────────────────────────
  V('vt-nachhaltig-leben', 'Nachhaltig leben', 'Halten Sie einen kurzen Vortrag darüber, was der Einzelne für die Umwelt tun kann — und wo seine Grenzen liegen.', ['Umwelt', 'Konsum']),
  V('vt-oeffentlicher-verkehr', 'Öffentlicher Nahverkehr', 'Halten Sie einen kurzen Vortrag darüber, wie Menschen sich in Ihrer Region fortbewegen.', ['Umwelt', 'Gesellschaft']),
  V('vt-plastikmuell-im-alltag-vermeiden', 'Plastikmüll im Alltag vermeiden', 'Halten Sie einen kurzen Vortrag darüber, wie sich Plastikmüll im eigenen Alltag vermeiden lässt.', ['Umwelt', 'Konsum']),
  V('vt-erneuerbare-energien', 'Erneuerbare Energien', 'Halten Sie einen kurzen Vortrag darüber, welche Rolle erneuerbare Energien für die Zukunft spielen.', ['Umwelt', 'Technologie']),
  V('vt-klimawandel-und-junge-generation', 'Klimawandel und junge Generation', 'Halten Sie einen kurzen Vortrag darüber, wie stark der Klimawandel das Leben junger Menschen schon heute beeinflusst.', ['Umwelt', 'Gesellschaft']),
  V('vt-gruenflaechen-in-der-stadt', 'Grünflächen in der Stadt', 'Halten Sie einen kurzen Vortrag darüber, wie viel Platz Grünflächen und Parks in einer wachsenden Stadt noch haben sollten.', ['Umwelt', 'Gesundheit']),

  // ── Arbeit ──────────────────────────────────────────────────────
  V('vt-homeoffice', 'Arbeiten von zu Hause', 'Halten Sie einen kurzen Vortrag darüber, was das Homeoffice mit der Arbeitswelt gemacht hat.', ['Arbeit', 'Technologie']),
  V('vt-work-life-balance', 'Work-Life-Balance', 'Halten Sie einen kurzen Vortrag darüber, wie wichtig eine gute Work-Life-Balance im Berufsleben ist.', ['Arbeit', 'Gesundheit']),
  V('vt-selbststaendig-oder-festangestellt', 'Selbstständig oder festangestellt', 'Halten Sie einen kurzen Vortrag darüber, wie sich das Berufsleben in der Selbstständigkeit von dem in einer Festanstellung unterscheidet.', ['Arbeit', 'Gesellschaft']),
  V('vt-berufswahl-junger-menschen', 'Berufswahl junger Menschen', 'Halten Sie einen kurzen Vortrag darüber, wovon die Berufswahl junger Menschen heute hauptsächlich abhängt.', ['Arbeit', 'Bildung']),
  V('vt-teamarbeit-im-beruf', 'Teamarbeit im Beruf', 'Halten Sie einen kurzen Vortrag darüber, welche Rolle Teamarbeit für den beruflichen Erfolg spielt.', ['Arbeit', 'Gesellschaft']),
  V('vt-gute-fuehrung-im-beruf', 'Gute Führung im Beruf', 'Halten Sie einen kurzen Vortrag darüber, was eine gute Führungskraft im Berufsalltag ausmacht.', ['Arbeit', 'Gesellschaft']),

  // ── Technologie ─────────────────────────────────────────────────
  V('vt-sprachassistenten-im-alltag', 'Sprachassistenten im Alltag', 'Halten Sie einen kurzen Vortrag darüber, wie stark digitale Sprachassistenten unseren Alltag inzwischen bestimmen.', ['Technologie', 'Gesellschaft']),
  V('vt-smarte-haushaltsgeraete', 'Smarte Haushaltsgeräte', 'Halten Sie einen kurzen Vortrag darüber, welchen Nutzen vernetzte Haushaltsgeräte im Alltag wirklich bringen.', ['Technologie', 'Konsum']),
  V('vt-datenschutz-im-internet', 'Datenschutz im Internet', 'Halten Sie einen kurzen Vortrag darüber, wie viel Privatsphäre im Internet heute noch möglich ist.', ['Technologie', 'Gesellschaft']),
  V('vt-fitness-wearables', 'Fitness-Wearables', 'Halten Sie einen kurzen Vortrag darüber, welche Rolle Fitness-Wearables für die eigene Gesundheit spielen können.', ['Technologie', 'Gesundheit']),
  V('vt-autonomes-fahren', 'Autonomes Fahren', 'Halten Sie einen kurzen Vortrag darüber, wie realistisch selbstfahrende Autos im Alltag schon sind.', ['Technologie', 'Umwelt']),
  V('vt-automatisierung-am-arbeitsplatz', 'Automatisierung am Arbeitsplatz', 'Halten Sie einen kurzen Vortrag darüber, wie die Automatisierung die Arbeitswelt bereits verändert hat.', ['Technologie', 'Arbeit']),

  // ── Bildung ─────────────────────────────────────────────────────
  V('vt-lebenslanges-lernen', 'Lebenslanges Lernen', 'Halten Sie einen kurzen Vortrag darüber, warum Erwachsene weiterlernen — und was sie daran hindert.', ['Bildung', 'Arbeit']),
  V('vt-fremdsprachen', 'Fremdsprachen lernen', 'Halten Sie einen kurzen Vortrag darüber, welchen Wert Fremdsprachen heute noch haben.', ['Bildung', 'Reisen']),
  V('vt-digitales-lernen', 'Digitales Lernen', 'Halten Sie einen kurzen Vortrag darüber, wie digitale Medien das Lernen an Schulen und Universitäten verändert haben.', ['Bildung', 'Technologie']),
  V('vt-praktische-faehigkeiten-neben-der-theorie', 'Praktische Fähigkeiten neben der Theorie', 'Halten Sie einen kurzen Vortrag darüber, welchen Stellenwert praktische Fähigkeiten neben theoretischem Wissen haben sollten.', ['Bildung', 'Arbeit']),
  V('vt-lesen-in-der-freizeit', 'Lesen in der Freizeit', 'Halten Sie einen kurzen Vortrag darüber, wie sich die Lesegewohnheiten der Menschen in den letzten Jahren verändert haben.', ['Bildung', 'Medien']),
  V('vt-bildungschancen-von-kindern', 'Bildungschancen von Kindern', 'Halten Sie einen kurzen Vortrag darüber, wovon der Bildungserfolg von Kindern und Jugendlichen stark abhängt.', ['Bildung', 'Familie']),

  // ── Gesundheit ──────────────────────────────────────────────────
  V('vt-gesunde-ernaehrung', 'Gesunde Ernährung', 'Halten Sie einen kurzen Vortrag darüber, wie sich Essgewohnheiten in den letzten Jahrzehnten verändert haben.', ['Gesundheit', 'Konsum']),
  V('vt-freizeit-sport', 'Sport in der Freizeit', 'Halten Sie einen kurzen Vortrag darüber, welchen Stellenwert Sport im Alltag der Menschen hat.', ['Gesundheit', 'Gesellschaft']),
  V('vt-psychische-gesundheit-ernst-nehmen', 'Psychische Gesundheit ernst nehmen', 'Halten Sie einen kurzen Vortrag darüber, wie ernst psychische Erkrankungen im Vergleich zu körperlichen genommen werden.', ['Gesundheit', 'Gesellschaft']),
  V('vt-schlafmangel-im-alltag', 'Schlafmangel im Alltag', 'Halten Sie einen kurzen Vortrag darüber, wie sich Schlafmangel auf das tägliche Leben auswirkt.', ['Gesundheit', 'Arbeit']),
  V('vt-stress-im-modernen-alltag', 'Stress im modernen Alltag', 'Halten Sie einen kurzen Vortrag darüber, was Stress im modernen Alltag hauptsächlich verursacht.', ['Gesundheit', 'Arbeit']),
  V('vt-vorsorge-statt-nachsorge', 'Vorsorge statt Nachsorge', 'Halten Sie einen kurzen Vortrag darüber, welchen Nutzen regelmäßige Vorsorgeuntersuchungen im Vergleich zum Aufwand haben.', ['Gesundheit', 'Gesellschaft']),

  // ── Medien ──────────────────────────────────────────────────────
  V('vt-social-media', 'Soziale Netzwerke im Alltag', 'Halten Sie einen kurzen Vortrag darüber, wie soziale Netzwerke unseren Alltag verändert haben.', ['Medien', 'Technologie']),
  V('vt-streamingdienste-im-alltag', 'Streamingdienste im Alltag', 'Halten Sie einen kurzen Vortrag darüber, wie Streamingdienste unser Fernsehverhalten verändert haben.', ['Medien', 'Technologie']),
  V('vt-influencer-als-vorbilder', 'Influencer als Vorbilder', 'Halten Sie einen kurzen Vortrag darüber, welchen Einfluss Influencer auf junge Menschen haben.', ['Medien', 'Gesellschaft']),
  V('vt-nachrichtenkonsum-heute', 'Nachrichtenkonsum heute', 'Halten Sie einen kurzen Vortrag darüber, wie sich der tägliche Nachrichtenkonsum in den letzten Jahren verändert hat.', ['Medien', 'Gesellschaft']),
  V('vt-podcasts-als-alltagsbegleiter', 'Podcasts als Alltagsbegleiter', 'Halten Sie einen kurzen Vortrag darüber, warum Podcasts für viele Menschen zu einem festen Bestandteil des Alltags geworden sind.', ['Medien', 'Bildung']),
  V('vt-falschmeldungen-erkennen', 'Falschmeldungen erkennen', 'Halten Sie einen kurzen Vortrag darüber, wie man Falschmeldungen im Internet erkennen kann.', ['Medien', 'Technologie']),

  // ── Gesellschaft ────────────────────────────────────────────────
  V('vt-ehrenamt', 'Ehrenamtliches Engagement', 'Halten Sie einen kurzen Vortrag darüber, welche Rolle freiwillige Arbeit in einer Gesellschaft spielt.', ['Gesellschaft', 'Arbeit']),
  V('vt-stadt-land', 'Stadt oder Land', 'Halten Sie einen kurzen Vortrag darüber, wie sich das Leben in der Stadt vom Leben auf dem Land unterscheidet.', ['Gesellschaft', 'Umwelt']),
  V('vt-anonymitaet-in-der-grossstadt', 'Anonymität in der Großstadt', 'Halten Sie einen kurzen Vortrag darüber, wie anonym das Leben in einer Großstadt heute wirklich ist.', ['Gesellschaft', 'Umwelt']),
  V('vt-gleichberechtigung-im-alltag', 'Gleichberechtigung im Alltag', 'Halten Sie einen kurzen Vortrag darüber, wie weit die Gleichberechtigung der Geschlechter im Alltag schon fortgeschritten ist.', ['Gesellschaft', 'Arbeit']),
  V('vt-hoeflichkeit-im-alltag', 'Höflichkeit im Alltag', 'Halten Sie einen kurzen Vortrag darüber, wie sich Höflichkeit und Umgangsformen im Alltag gewandelt haben.', ['Gesellschaft', 'Familie']),
  V('vt-zusammenhalt-in-schwierigen-zeiten', 'Zusammenhalt in schwierigen Zeiten', 'Halten Sie einen kurzen Vortrag darüber, wie Gesellschaften in schwierigen Zeiten zusammenhalten können.', ['Gesellschaft', 'Gesundheit']),

  // ── Reisen ──────────────────────────────────────────────────────
  V('vt-reiseziele-im-wandel', 'Reiseziele im Wandel', 'Halten Sie einen kurzen Vortrag darüber, wie sich beliebte Reiseziele in den letzten Jahren verändert haben.', ['Reisen', 'Gesellschaft']),
  V('vt-reisen-mit-kleinem-budget', 'Reisen mit kleinem Budget', 'Halten Sie einen kurzen Vortrag darüber, welchen Reiz das Reisen mit kleinem Budget für viele Menschen hat.', ['Reisen', 'Konsum']),
  V('vt-urlaub-mit-der-familie', 'Urlaub mit der Familie', 'Halten Sie einen kurzen Vortrag darüber, wie sich Urlaub mit Kindern von Urlaub ohne Kinder unterscheidet.', ['Reisen', 'Familie']),
  V('vt-sprachreisen-ins-ausland', 'Sprachreisen ins Ausland', 'Halten Sie einen kurzen Vortrag darüber, wie sinnvoll ein Auslandsaufenthalt zum Erlernen einer Fremdsprache ist.', ['Reisen', 'Bildung']),
  V('vt-arbeiten-und-reisen-verbinden', 'Arbeiten und Reisen verbinden', 'Halten Sie einen kurzen Vortrag darüber, wie sich Arbeiten und Reisen heute miteinander verbinden lassen.', ['Reisen', 'Arbeit']),
  V('vt-nachhaltiger-tourismus', 'Nachhaltiger Tourismus', 'Halten Sie einen kurzen Vortrag darüber, wie nachhaltig der eigene Urlaub gestaltet werden kann.', ['Reisen', 'Umwelt']),

  // ── Konsum ──────────────────────────────────────────────────────
  V('vt-onlineshopping-und-einzelhandel', 'Onlineshopping und Einzelhandel', 'Halten Sie einen kurzen Vortrag darüber, wie Onlineshopping das Einkaufsverhalten der Menschen verändert hat.', ['Konsum', 'Technologie']),
  V('vt-bewusster-verzicht-auf-konsum', 'Bewusster Verzicht auf Konsum', 'Halten Sie einen kurzen Vortrag darüber, was Menschen dazu bewegt, bewusst auf Konsum zu verzichten.', ['Konsum', 'Gesellschaft']),
  V('vt-secondhand-und-kleidertausch', 'Secondhand und Kleidertausch', 'Halten Sie einen kurzen Vortrag darüber, welchen Stellenwert gebrauchte Kleidung im eigenen Konsum hat.', ['Konsum', 'Umwelt']),
  V('vt-werbung-und-kaufentscheidungen', 'Werbung und Kaufentscheidungen', 'Halten Sie einen kurzen Vortrag darüber, wie stark Werbung unsere Kaufentscheidungen beeinflusst.', ['Konsum', 'Medien']),
  V('vt-regional-und-saisonal-einkaufen', 'Regional und saisonal einkaufen', 'Halten Sie einen kurzen Vortrag darüber, warum viele Menschen wieder regional und saisonal einkaufen.', ['Konsum', 'Umwelt']),
  V('vt-konsumverhalten-der-jungen-generation', 'Konsumverhalten der jungen Generation', 'Halten Sie einen kurzen Vortrag darüber, wie sich das Konsumverhalten junger Menschen von dem ihrer Eltern unterscheidet.', ['Konsum', 'Familie']),

  // ── Familie ─────────────────────────────────────────────────────
  V('vt-familie-heute', 'Familie heute', 'Halten Sie einen kurzen Vortrag darüber, wie sich das Zusammenleben in Familien gewandelt hat.', ['Familie', 'Gesellschaft']),
  V('vt-medienkonsum-kinder', 'Kinder und Bildschirme', 'Halten Sie einen kurzen Vortrag darüber, wie viel Bildschirmzeit für Kinder angemessen ist.', ['Familie', 'Medien']),
  V('vt-erziehungsstile-im-wandel', 'Erziehungsstile im Wandel', 'Halten Sie einen kurzen Vortrag darüber, wie sich Erziehungsstile von einer Generation zur nächsten verändert haben.', ['Familie', 'Gesellschaft']),
  V('vt-berufstaetige-eltern', 'Berufstätige Eltern', 'Halten Sie einen kurzen Vortrag darüber, wie berufstätige Eltern Familie und Job miteinander vereinbaren.', ['Familie', 'Arbeit']),
  V('vt-grosseltern-im-leben-der-enkel', 'Großeltern im Leben der Enkel', 'Halten Sie einen kurzen Vortrag darüber, welche Rolle Großeltern im Leben ihrer Enkelkinder spielen.', ['Familie', 'Gesellschaft']),
  V('vt-gemeinsame-freizeit-in-der-familie', 'Gemeinsame Freizeit in der Familie', 'Halten Sie einen kurzen Vortrag darüber, wie Familien heute ihre gemeinsame Freizeit verbringen.', ['Familie', 'Reisen'])
]

export const VORTRAGSTHEMA_GENERATOR_SCHEMA = {
  type: 'object',
  properties: {
    themen: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titleDe: { type: 'string' },
          taskDe: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } }
        },
        required: ['titleDe', 'taskDe', 'tags']
      }
    }
  },
  required: ['themen']
}

export { TOPIC_TAGS }
