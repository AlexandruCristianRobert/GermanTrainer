import type { Vokabel } from './wortschatz'

export const WORTSCHATZ_REISEN: Vokabel[] = [
  {
    id: 'vk-reisen-unterkunft', feld: 'Reisen', kind: 'einzelwort',
    de: 'die Unterkunft', en: 'accommodation (place to stay on a trip)',
    plural: 'Unterkünfte',
    variants: [],
    saetze: [
      { de: 'Die {{Unterkunft}} lag zwar zentral, war aber überraschend laut.',
        en: 'The accommodation was centrally located, but surprisingly noisy.' },
      { de: 'Im August sind einfache {{Unterkünfte}} dort kaum noch zu bekommen.',
        en: 'In August simple places to stay are hardly available there any more.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-sehenswuerdigkeit', feld: 'Reisen', kind: 'einzelwort',
    de: 'die Sehenswürdigkeit', en: 'tourist attraction (sight worth visiting)',
    plural: 'Sehenswürdigkeiten',
    variants: [],
    saetze: [
      { de: 'Vor der größten {{Sehenswürdigkeit}} der Stadt standen wir zwei Stunden an.',
        en: 'We queued for two hours in front of the city\'s biggest attraction.' },
      { de: 'Die bekannten {{Sehenswürdigkeiten}} haben wir bewusst am frühen Morgen besucht.',
        en: 'We deliberately visited the well-known sights early in the morning.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-aufenthalt', feld: 'Reisen', kind: 'einzelwort',
    de: 'der Aufenthalt', en: 'stay (period of time spent in a place)',
    plural: 'Aufenthalte',
    variants: [],
    saetze: [
      { de: 'Unser {{Aufenthalt}} in Lissabon war mit vier Tagen deutlich zu kurz.',
        en: 'At four days, our stay in Lisbon was far too short.' },
      { de: 'Kürzere {{Aufenthalte}} an mehreren Orten kosten am Ende mehr Nerven.',
        en: 'Shorter stays in several places end up being more stressful.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-reiseveranstalter', feld: 'Reisen', kind: 'einzelwort',
    de: 'der Reiseveranstalter', en: 'tour operator (company that puts trips together)',
    plural: 'Reiseveranstalter',
    variants: [],
    saetze: [
      { de: 'Der {{Reiseveranstalter}} hat den Flug ohne Vorwarnung auf den Abend verlegt.',
        en: 'The tour operator moved the flight to the evening without warning.' },
      { de: 'Bei vielen {{Reiseveranstaltern}} kann man die Anreise inzwischen per Bahn buchen.',
        en: 'With many tour operators you can now book the journey there by train.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-zwischenlandung', feld: 'Reisen', kind: 'einzelwort',
    de: 'die Zwischenlandung', en: 'stopover (intermediate landing on a flight)',
    plural: 'Zwischenlandungen',
    variants: [],
    saetze: [
      { de: 'Der Flug nach Bangkok hat eine {{Zwischenlandung}} in Dubai.',
        en: 'The flight to Bangkok has a stopover in Dubai.' },
      { de: 'Zwei {{Zwischenlandungen}} machen die Reise billiger, aber auch deutlich anstrengender.',
        en: 'Two stopovers make the trip cheaper, but also much more tiring.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-pauschalreise', feld: 'Reisen', kind: 'einzelwort',
    de: 'die Pauschalreise', en: 'package holiday (flight, hotel and meals in one booking)',
    plural: 'Pauschalreisen',
    variants: [],
    saetze: [
      { de: 'Meine Eltern buchen seit Jahren nur noch {{Pauschalreisen}} ans Mittelmeer.',
        en: 'For years my parents have only booked package holidays to the Mediterranean.' },
      { de: 'Bei einer {{Pauschalreise}} sind Flug, Hotel und Verpflegung im Preis enthalten.',
        en: 'With a package holiday, flight, hotel and meals are included in the price.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-reiseziel', feld: 'Reisen', kind: 'einzelwort',
    de: 'das Reiseziel', en: 'travel destination (the place one travels to)',
    plural: 'Reiseziele',
    variants: [],
    saetze: [
      { de: 'Als {{Reiseziel}} hatten wir ursprünglich eine kleine Insel im Norden vorgesehen.',
        en: 'Originally we had planned a small island in the north as our destination.' },
      { de: 'Beliebte {{Reiseziele}} in Südeuropa sind im Sommer regelmäßig überlaufen.',
        en: 'Popular destinations in southern Europe are regularly overrun in summer.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-besucherstrom', feld: 'Reisen', kind: 'einzelwort',
    de: 'der Besucherstrom', en: 'flow of visitors (crowds arriving at a place)',
    plural: 'Besucherströme',
    variants: [],
    saetze: [
      { de: 'Der {{Besucherstrom}} durch die Altstadt reißt von Mai bis Oktober nicht ab.',
        en: 'The flow of visitors through the old town does not let up from May to October.' },
      { de: 'Die Gemeinde will die {{Besucherströme}} künftig besser über das Jahr verteilen.',
        en: 'The municipality wants to spread the flows of visitors better across the year.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-verreisen', feld: 'Reisen', kind: 'einzelwort',
    de: 'verreisen', en: 'to go away on a trip (leave home for a while)',
    variants: [],
    saetze: [
      { de: 'In diesem Jahr {{verreisen}} wir nur innerhalb Europas.',
        en: 'This year we are only travelling within Europe.' },
      { de: 'Über die Feiertage ist die halbe Nachbarschaft {{verreist}}.',
        en: 'Over the holidays half the neighbourhood has gone away.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-besichtigen', feld: 'Reisen', kind: 'einzelwort',
    de: 'besichtigen', en: 'to go and look round (a sight, a building, a museum)',
    variants: [],
    saetze: [
      { de: 'Am Vormittag haben wir die Altstadt und den Dom {{besichtigt}}.',
        en: 'In the morning we looked round the old town and the cathedral.' },
      { de: 'Wer die Burg {{besichtigen}} möchte, muss vorher ein Zeitfenster buchen.',
        en: 'Anyone wanting to look round the castle has to book a time slot in advance.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-abgelegen', feld: 'Reisen', kind: 'einzelwort',
    de: 'abgelegen', en: 'remote (far from towns and transport links)',
    variants: [],
    saetze: [
      { de: 'Das Hotel liegt sehr {{abgelegen}} und ist nur mit dem Auto erreichbar.',
        en: 'The hotel is in a very remote spot and can only be reached by car.' },
      { de: 'In {{abgelegenen}} Dörfern fährt oft nur zweimal täglich ein Bus.',
        en: 'In remote villages there is often only a bus twice a day.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-sehenswert', feld: 'Reisen', kind: 'einzelwort',
    de: 'sehenswert', en: 'worth a visit (of a sight: repays going there)',
    variants: [],
    saetze: [
      { de: 'Das kleine Heimatmuseum ist überraschend {{sehenswert}} und kostet keinen Eintritt.',
        en: 'The small local museum is surprisingly worth seeing and charges no entrance fee.' },
      { de: 'Auf dem Weg liegen mehrere {{sehenswerte}} Klöster aus dem Mittelalter.',
        en: 'Along the way there are several monasteries from the Middle Ages worth seeing.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-reise-antreten', feld: 'Reisen', kind: 'wortverbindung',
    de: 'eine Reise antreten', en: 'to set out on a journey (begin a planned trip)',
    variants: [],
    saetze: [
      { de: 'Nur mit gültigem Pass darf man {{eine Reise antreten}}.',
        en: 'Only with a valid passport may one set out on a journey.' },
      { de: 'Trotz aller Warnungen hat sie {{die Reise angetreten}} und es nicht bereut.',
        en: 'Despite all the warnings she set out on the journey and did not regret it.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-auf-eigene-faust-reisen', feld: 'Reisen', kind: 'wortverbindung',
    de: 'auf eigene Faust reisen', en: 'to travel independently (without an organised tour)',
    variants: [],
    saetze: [
      { de: 'Viele junge Leute wollen lieber {{auf eigene Faust reisen}}.',
        en: 'Many young people would rather travel independently.' },
      { de: 'Als Studentin ist sie monatelang {{auf eigene Faust gereist}}.',
        en: 'As a student she travelled independently for months.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-an-die-landessitten-anpassen', feld: 'Reisen', kind: 'wortverbindung',
    de: 'sich an die Landessitten anpassen', en: 'to adapt to the customs of the host country',
    rektion: 'an + Akk',
    variants: [],
    saetze: [
      { de: 'Als Gast sollte man {{sich an die Landessitten anpassen}}.',
        en: 'As a guest one should adapt to the customs of the country.' },
      { de: 'Nach wenigen Tagen hatten wir {{uns an die Landessitten angepasst}}.',
        en: 'After a few days we had adapted to the local customs.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-nach-dem-weg-erkundigen', feld: 'Reisen', kind: 'wortverbindung',
    de: 'sich nach dem Weg erkundigen', en: 'to ask for directions (politely enquire about the route)',
    rektion: 'nach + Dat',
    variants: [],
    saetze: [
      { de: 'Ohne Handy muss man {{sich nach dem Weg erkundigen}}.',
        en: 'Without a mobile phone you have to ask for directions.' },
      { de: 'An der Kreuzung hat er {{sich nach dem Weg erkundigt}}.',
        en: 'At the crossroads he asked for directions.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-von-einem-ort-schwaermen', feld: 'Reisen', kind: 'wortverbindung',
    de: 'von einem Ort schwärmen', en: 'to rave about a place (talk about it enthusiastically)',
    rektion: 'von + Dat',
    variants: [],
    saetze: [
      { de: 'Meine Kollegen {{schwärmen von diesem Ort}}, seit sie dort waren.',
        en: 'My colleagues have been raving about this place ever since they were there.' },
      { de: 'Man sollte nicht {{von einem Ort schwärmen}}, den man kaum kennt.',
        en: 'You should not rave about a place you hardly know.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-ueber-einreisebestimmungen-informieren', feld: 'Reisen', kind: 'wortverbindung',
    de: 'sich über die Einreisebestimmungen informieren', en: 'to find out about the entry requirements',
    rektion: 'über + Akk',
    variants: [],
    saetze: [
      { de: 'Vor der Buchung sollte man {{sich über die Einreisebestimmungen informieren}}.',
        en: 'Before booking you should find out about the entry requirements.' },
      { de: 'Hätten wir {{uns über die Einreisebestimmungen informiert}}, wäre das nicht passiert.',
        en: 'If we had found out about the entry requirements, that would not have happened.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-im-voraus-buchen', feld: 'Reisen', kind: 'wortverbindung',
    de: 'im Voraus buchen', en: 'to book in advance',
    variants: [],
    saetze: [
      { de: 'Fähren muss man auf dieser Strecke unbedingt {{im Voraus buchen}}.',
        en: 'On this route you absolutely have to book ferries in advance.' },
      { de: 'Wer den Zug {{im Voraus gebucht}} hat, zahlt oft die Hälfte.',
        en: 'Anyone who has booked the train in advance often pays half the price.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-reisen-route-festlegen', feld: 'Reisen', kind: 'wortverbindung',
    de: 'eine Route festlegen', en: 'to fix a route (settle the itinerary)',
    variants: [],
    saetze: [
      { de: 'Vor dem Start sollten wir {{eine Route festlegen}}, die alle mittragen.',
        en: 'Before setting off we should fix a route that everyone supports.' },
      { de: 'Am Abend hatten wir {{die Route festgelegt}} und die Betten reserviert.',
        en: 'By the evening we had fixed the route and reserved the beds.' }
    ],
    source: 'seed'
  }
]
