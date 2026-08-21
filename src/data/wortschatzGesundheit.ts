import type { Vokabel } from './wortschatz'

export const WORTSCHATZ_GESUNDHEIT: Vokabel[] = [
  // ── Einzelwörter: Nomen ─────────────────────────────────────────
  {
    id: 'vk-gesundheit-vorsorgeuntersuchung', feld: 'Gesundheit', kind: 'einzelwort',
    de: 'die Vorsorgeuntersuchung', en: 'preventive medical check-up', plural: 'Vorsorgeuntersuchungen',
    variants: [],
    saetze: [
      { de: 'Der Hausarzt erinnert seine Patienten regelmäßig an {{Vorsorgeuntersuchungen}}.',
        en: 'The family doctor regularly reminds his patients about preventive check-ups.' },
      { de: 'Zu einer {{Vorsorgeuntersuchung}} geht mein Vater leider nur sehr selten.',
        en: 'Unfortunately my father goes for a preventive check-up only very rarely.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-gesundheit-nebenwirkung', feld: 'Gesundheit', kind: 'einzelwort',
    de: 'die Nebenwirkung', en: 'side effect (of a medication)', plural: 'Nebenwirkungen',
    variants: [],
    saetze: [
      { de: 'Das Mittel wirkt schnell, hat aber unangenehme {{Nebenwirkungen}}.',
        en: 'The drug works quickly but has unpleasant side effects.' },
      { de: 'Über jede mögliche {{Nebenwirkung}} muss der Arzt vorher aufklären.',
        en: 'The doctor has to explain every possible side effect beforehand.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-gesundheit-krankenkasse', feld: 'Gesundheit', kind: 'einzelwort',
    de: 'die Krankenkasse', en: 'health insurance fund (statutory insurer)', plural: 'Krankenkassen',
    variants: [],
    saetze: [
      { de: 'Meine {{Krankenkasse}} übernimmt die Kosten für den Kurs vollständig.',
        en: 'My health insurance fund covers the cost of the course in full.' },
      { de: 'Die gesetzlichen {{Krankenkassen}} zahlen für Zahnersatz nur einen Festbetrag.',
        en: 'The statutory health insurance funds pay only a fixed amount for dentures.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-gesundheit-facharzt', feld: 'Gesundheit', kind: 'einzelwort',
    de: 'der Facharzt', en: 'medical specialist (consultant, e.g. a dermatologist)', plural: 'Fachärzte',
    variants: [],
    saetze: [
      { de: 'Auf einen Termin beim {{Facharzt}} wartet man hier oft Monate.',
        en: 'Here people often wait months for an appointment with a specialist.' },
      { de: 'In ländlichen Regionen fehlen inzwischen {{Fachärzte}} für Kinderheilkunde.',
        en: 'In rural regions there is now a lack of paediatric specialists.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-gesundheit-ernaehrungsgewohnheit', feld: 'Gesundheit', kind: 'einzelwort',
    de: 'die Ernährungsgewohnheit', en: 'eating habit', plural: 'Ernährungsgewohnheiten',
    variants: [],
    saetze: [
      { de: 'Ungesunde {{Ernährungsgewohnheiten}} entstehen häufig schon in der Kindheit.',
        en: 'Unhealthy eating habits often develop as early as childhood.' },
      { de: 'Eine einzige {{Ernährungsgewohnheit}} zu ändern, ist leichter als eine strenge Diät.',
        en: 'Changing a single eating habit is easier than a strict diet.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-gesundheit-impfung', feld: 'Gesundheit', kind: 'einzelwort',
    de: 'die Impfung', en: 'vaccination (a shot against a disease)', plural: 'Impfungen',
    variants: [],
    saetze: [
      { de: 'Vor der Reise empfiehlt der Arzt mehrere {{Impfungen}}.',
        en: 'Before the trip the doctor recommends several vaccinations.' },
      { de: 'Eine jährliche {{Impfung}} schützt vor allem ältere Menschen vor schweren Verläufen.',
        en: 'An annual vaccination protects older people in particular from severe cases.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-gesundheit-volkskrankheit', feld: 'Gesundheit', kind: 'einzelwort',
    de: 'die Volkskrankheit', en: 'widespread disease (illness affecting large parts of the population)', plural: 'Volkskrankheiten',
    variants: [],
    saetze: [
      { de: 'Rückenschmerzen gelten in den Industrieländern inzwischen als {{Volkskrankheit}} Nummer eins.',
        en: 'Back pain is now considered the number one widespread disease in industrialised countries.' },
      { de: 'Diabetes und Bluthochdruck zählen zu den häufigsten {{Volkskrankheiten}}.',
        en: 'Diabetes and high blood pressure are among the most common widespread diseases.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-gesundheit-gesundheitssystem', feld: 'Gesundheit', kind: 'einzelwort',
    de: 'das Gesundheitssystem', en: 'health-care system', plural: 'Gesundheitssysteme',
    variants: [],
    saetze: [
      { de: 'Unser {{Gesundheitssystem}} gerät durch die alternde Bevölkerung zunehmend unter Druck.',
        en: 'Our health-care system is coming under increasing pressure from the ageing population.' },
      { de: 'Andere {{Gesundheitssysteme}} setzen viel stärker auf die häusliche Pflege.',
        en: 'Other health-care systems rely much more heavily on care at home.' }
    ],
    source: 'seed'
  },

  // ── Einzelwörter: Verben ────────────────────────────────────────
  {
    id: 'vk-gesundheit-sich-schonen', feld: 'Gesundheit', kind: 'einzelwort',
    de: 'sich schonen', en: 'to take it easy (avoid strain while recovering)',
    variants: [],
    saetze: [
      { de: 'Nach der Operation sollte er {{sich schonen}} und viel schlafen.',
        en: 'After the operation he should take it easy and sleep a lot.' },
      { de: 'Sie {{schonte sich}} nach der Grippe leider nur wenige Tage.',
        en: 'Unfortunately she took it easy for only a few days after the flu.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-gesundheit-verschreiben', feld: 'Gesundheit', kind: 'einzelwort',
    de: 'verschreiben', en: 'to prescribe (medication, as a doctor does)',
    variants: [],
    saetze: [
      { de: 'Der Arzt {{verschreibt}} bei starken Schmerzen ein stärkeres Medikament.',
        en: 'For severe pain the doctor prescribes a stronger medication.' },
      { de: 'Antibiotika werden in Deutschland immer noch zu häufig {{verschrieben}}.',
        en: 'Antibiotics are still prescribed too often in Germany.' }
    ],
    source: 'seed'
  },

  // ── Einzelwörter: Adjektive ─────────────────────────────────────
  {
    id: 'vk-gesundheit-chronisch', feld: 'Gesundheit', kind: 'einzelwort',
    de: 'chronisch', en: 'chronic (long-lasting, of an illness)',
    variants: [],
    saetze: [
      { de: '{{Chronische}} Erkrankungen verursachen den größten Teil der Ausgaben im Gesundheitswesen.',
        en: 'Chronic illnesses account for the largest share of health-care spending.' },
      { de: 'Ihre Beschwerden sind inzwischen {{chronisch}} geworden und begleiten sie täglich.',
        en: 'Her symptoms have become chronic by now and accompany her daily.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-gesundheit-ansteckend', feld: 'Gesundheit', kind: 'einzelwort',
    de: 'ansteckend', en: 'contagious (passed from person to person)',
    variants: [],
    saetze: [
      { de: 'Masern sind deutlich {{ansteckender}} als eine gewöhnliche Erkältung.',
        en: 'Measles are considerably more contagious than an ordinary cold.' },
      { de: 'Bei {{ansteckenden}} Krankheiten sollten Beschäftigte unbedingt zu Hause bleiben.',
        en: 'With contagious illnesses, employees should definitely stay at home.' }
    ],
    source: 'seed'
  },

  // ── Wortverbindungen ────────────────────────────────────────────
  {
    id: 'vk-gesundheit-unter-schlafstoerungen-leiden', feld: 'Gesundheit', kind: 'wortverbindung',
    de: 'unter Schlafstörungen leiden', en: 'to suffer from sleep problems', rektion: 'unter + Dat',
    variants: [],
    saetze: [
      { de: 'Wer dauerhaft {{unter Schlafstörungen leidet}}, sollte den Hausarzt aufsuchen.',
        en: 'Anyone who suffers from sleep problems permanently should see their family doctor.' },
      { de: 'Immer mehr Jugendliche scheinen {{unter Schlafstörungen zu leiden}}.',
        en: 'More and more young people seem to suffer from sleep problems.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-gesundheit-auf-ernaehrung-achten', feld: 'Gesundheit', kind: 'wortverbindung',
    de: 'auf die Ernährung achten', en: 'to watch what one eats', rektion: 'auf + Akk',
    variants: [],
    saetze: [
      { de: 'Wer abnehmen will, muss vor allem {{auf die Ernährung achten}}.',
        en: 'Anyone wanting to lose weight has above all to watch what they eat.' },
      { de: 'Sie erzählt, dass sie seit Jahren streng {{auf die Ernährung achtet}}.',
        en: 'She says that she has been watching her diet strictly for years.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-gesundheit-um-gesundheit-kuemmern', feld: 'Gesundheit', kind: 'wortverbindung',
    de: 'sich um die eigene Gesundheit kümmern', en: 'to look after one\'s own health', rektion: 'um + Akk',
    variants: [],
    saetze: [
      { de: 'Im Beruf vergessen viele, {{sich um die eigene Gesundheit zu kümmern}}.',
        en: 'At work many people forget to look after their own health.' },
      { de: 'Jeder sollte {{sich um die eigene Gesundheit kümmern}}, nicht nur im Krankheitsfall.',
        en: 'Everyone should look after their own health, not just when they fall ill.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-gesundheit-immunsystem-staerken', feld: 'Gesundheit', kind: 'wortverbindung',
    de: 'das Immunsystem stärken', en: 'to strengthen the immune system',
    variants: [],
    saetze: [
      { de: 'Ausreichend Schlaf und frische Luft können {{das Immunsystem stärken}}.',
        en: 'Enough sleep and fresh air can strengthen the immune system.' },
      { de: 'Regelmäßige Bewegung hat bei ihm {{das Immunsystem gestärkt}}.',
        en: 'Regular exercise has strengthened his immune system.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-gesundheit-diagnose-stellen', feld: 'Gesundheit', kind: 'wortverbindung',
    de: 'eine Diagnose stellen', en: 'to make a diagnosis',
    variants: ['Diagnosen stellen'],
    saetze: [
      { de: 'Ohne Bluttest lässt sich hier kaum {{eine Diagnose stellen}}.',
        en: 'Without a blood test it is hardly possible to make a diagnosis here.' },
      { de: 'Die Klinik hat erst nach mehreren Wochen {{eine Diagnose gestellt}}.',
        en: 'The clinic made a diagnosis only after several weeks.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-gesundheit-behandlungskosten-uebernehmen', feld: 'Gesundheit', kind: 'wortverbindung',
    de: 'die Behandlungskosten übernehmen', en: 'to cover the cost of treatment (of an insurer)',
    variants: ['Behandlungskosten übernehmen'],
    saetze: [
      { de: 'Die Kasse weigert sich, {{die Behandlungskosten zu übernehmen}}.',
        en: 'The insurer refuses to cover the cost of treatment.' },
      { de: 'Die private Versicherung hat am Ende doch {{die Behandlungskosten übernommen}}.',
        en: 'In the end the private insurer did cover the cost of treatment after all.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-gesundheit-sich-impfen-lassen', feld: 'Gesundheit', kind: 'wortverbindung',
    de: 'sich impfen lassen', en: 'to get vaccinated',
    variants: [],
    saetze: [
      { de: 'Pflegekräfte sollten {{sich impfen lassen}}, um ihre Patienten zu schützen.',
        en: 'Nursing staff should get vaccinated in order to protect their patients.' },
      { de: 'Er sagt, dass er {{sich impfen lässt}}, sobald der Impfstoff da ist.',
        en: 'He says that he will get vaccinated as soon as the vaccine is available.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-gesundheit-krankheit-vorbeugen', feld: 'Gesundheit', kind: 'wortverbindung',
    de: 'einer Krankheit vorbeugen', en: 'to prevent an illness (act before it develops)', rektion: 'Dat',
    variants: [],
    saetze: [
      { de: 'Mit Bewegung und guter Ernährung kann man {{einer Krankheit vorbeugen}}.',
        en: 'With exercise and a good diet one can prevent an illness.' },
      { de: 'Impfungen sind der wirksamste Weg, {{einer Krankheit vorzubeugen}}.',
        en: 'Vaccinations are the most effective way of preventing an illness.' }
    ],
    source: 'seed'
  }
]
