import type { Vokabel } from './wortschatz'

export const WORTSCHATZ_FAMILIE: Vokabel[] = [
  {
    id: 'vk-familie-erziehungsstil', feld: 'Familie', kind: 'einzelwort',
    de: 'der Erziehungsstil', en: 'parenting style (the way somebody brings up children)',
    plural: 'Erziehungsstile',
    variants: [],
    saetze: [
      { de: 'Mein {{Erziehungsstil}} unterscheidet sich deutlich von dem meiner Eltern.',
        en: 'My parenting style differs clearly from that of my parents.' },
      { de: 'Über verschiedene {{Erziehungsstile}} wird in Elternforen erbittert gestritten.',
        en: 'Different parenting styles are fiercely argued about in parent forums.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-elternteil', feld: 'Familie', kind: 'einzelwort',
    de: 'der Elternteil', en: 'parent (one of the two, as opposed to both)',
    plural: 'Elternteile',
    variants: [],
    saetze: [
      { de: 'Nach der Trennung lebt das Kind bei einem {{Elternteil}}.',
        en: 'After the separation the child lives with one parent.' },
      { de: 'Beide {{Elternteile}} arbeiten inzwischen in Teilzeit, um mehr Zeit für die Kinder zu haben.',
        en: 'Both parents now work part-time in order to have more time for the children.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-rollenverteilung', feld: 'Familie', kind: 'einzelwort',
    de: 'die Rollenverteilung', en: 'division of roles (who does what in a couple)',
    plural: 'Rollenverteilungen',
    variants: [],
    saetze: [
      { de: 'Bei uns hat sich {{die Rollenverteilung}} nach der Geburt völlig verschoben.',
        en: 'In our household the division of roles shifted completely after the birth.' },
      { de: 'Traditionelle {{Rollenverteilungen}} halten sich in vielen Familien überraschend lange.',
        en: 'Traditional divisions of roles persist surprisingly long in many families.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-verwandtschaft', feld: 'Familie', kind: 'einzelwort',
    de: 'die Verwandtschaft', en: 'relatives (the extended family taken together)',
    plural: 'Verwandtschaften',
    variants: [],
    saetze: [
      { de: 'Zur Hochzeit war fast die gesamte {{Verwandtschaft}} angereist.',
        en: 'Almost the entire extended family had travelled to the wedding.' },
      { de: 'Mit der {{Verwandtschaft}} meines Mannes habe ich kaum Kontakt.',
        en: 'I have hardly any contact with my husband\'s relatives.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-familienmitglied', feld: 'Familie', kind: 'einzelwort',
    de: 'das Familienmitglied', en: 'family member',
    plural: 'Familienmitglieder',
    variants: [],
    saetze: [
      { de: 'Ein {{Familienmitglied}} muss die Pflege übernehmen, sonst wird es teuer.',
        en: 'One family member has to take on the care, otherwise it gets expensive.' },
      { de: 'Alle {{Familienmitglieder}} sollten bei solchen Entscheidungen gehört werden.',
        en: 'All family members should be heard in decisions like these.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-vertrauensverhaeltnis', feld: 'Familie', kind: 'einzelwort',
    de: 'das Vertrauensverhältnis', en: 'relationship of trust (between two people)',
    plural: 'Vertrauensverhältnisse',
    variants: [],
    saetze: [
      { de: 'Zwischen Vater und Tochter besteht ein enges {{Vertrauensverhältnis}}.',
        en: 'There is a close relationship of trust between father and daughter.' },
      { de: 'Solche {{Vertrauensverhältnisse}} entstehen nicht über Nacht, sondern über Jahre.',
        en: 'Such relationships of trust do not arise overnight but over years.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-pflegefall', feld: 'Familie', kind: 'einzelwort',
    de: 'der Pflegefall', en: 'person needing long-term nursing care',
    plural: 'Pflegefälle',
    variants: [],
    saetze: [
      { de: 'Wird ein Angehöriger zum {{Pflegefall}}, ändert sich der Alltag grundlegend.',
        en: 'If a relative comes to need nursing care, daily life changes fundamentally.' },
      { de: 'Auf plötzliche {{Pflegefälle}} sind die meisten Familien schlecht vorbereitet.',
        en: 'Most families are badly prepared for a sudden need for nursing care.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-erbschaft', feld: 'Familie', kind: 'einzelwort',
    de: 'die Erbschaft', en: 'inheritance (property left by someone who has died)',
    plural: 'Erbschaften',
    variants: [],
    saetze: [
      { de: 'Um {{die Erbschaft}} streiten die Geschwister nun schon im dritten Jahr.',
        en: 'The siblings have been arguing over the inheritance for three years now.' },
      { de: 'Größere {{Erbschaften}} müssen dem Finanzamt binnen drei Monaten gemeldet werden.',
        en: 'Larger inheritances must be reported to the tax office within three months.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-aufwachsen', feld: 'Familie', kind: 'einzelwort',
    de: 'aufwachsen', en: 'to grow up (spend one\'s childhood somewhere)',
    variants: [],
    saetze: [
      { de: 'Sie ist bei ihren Großeltern auf dem Land {{aufgewachsen}}.',
        en: 'She grew up with her grandparents in the countryside.' },
      { de: 'Kinder, die mit zwei Sprachen {{aufwachsen}}, profitieren später deutlich davon.',
        en: 'Children who grow up with two languages benefit from it noticeably later.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-verwoehnen', feld: 'Familie', kind: 'einzelwort',
    de: 'verwöhnen', en: 'to spoil (indulge a child far too much)',
    variants: [],
    saetze: [
      { de: 'Großeltern {{verwöhnen}} ihre Enkel oft mehr als die eigenen Kinder.',
        en: 'Grandparents often spoil their grandchildren more than their own children.' },
      { de: 'Wer sein Kind ständig {{verwöhnt}}, erschwert ihm später den Alltag.',
        en: 'Anyone constantly spoiling their child makes daily life harder for it later.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-alleinerziehend', feld: 'Familie', kind: 'einzelwort',
    de: 'alleinerziehend', en: 'bringing up a child on one\'s own (single-parent)',
    variants: [],
    saetze: [
      { de: 'Sie ist seit drei Jahren {{alleinerziehend}} und arbeitet nur in Teilzeit.',
        en: 'She has been a single parent for three years and only works part-time.' },
      { de: '{{Alleinerziehende}} Mütter und Väter sind besonders auf verlässliche Betreuung angewiesen.',
        en: 'Single mothers and fathers depend particularly on reliable childcare.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-nachsichtig', feld: 'Familie', kind: 'einzelwort',
    de: 'nachsichtig', en: 'lenient (willing to overlook mistakes, not strict)',
    variants: [],
    saetze: [
      { de: 'Bei den Hausaufgaben ist mein Vater deutlich {{nachsichtiger}} als meine Mutter.',
        en: 'When it comes to homework my father is far more lenient than my mother.' },
      { de: 'Zu {{nachsichtige}} Eltern nehmen ihren Kindern die Chance, Grenzen kennenzulernen.',
        en: 'Overly lenient parents deprive their children of the chance to learn where limits are.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-beruf-und-familie-vereinbaren', feld: 'Familie', kind: 'wortverbindung',
    de: 'Beruf und Familie vereinbaren', en: 'to combine work and family life',
    variants: ['Familie und Beruf vereinbaren'],
    saetze: [
      { de: 'Ohne Betreuungsplatz kann kaum jemand {{Beruf und Familie vereinbaren}}.',
        en: 'Without a childcare place hardly anyone can combine work and family.' },
      { de: 'Sie hat jahrelang {{Beruf und Familie vereinbart}}, allerdings nur mit Hilfe der Großeltern.',
        en: 'For years she combined work and family, though only with the grandparents\' help.',
        blankVariants: ['Familie und Beruf vereinbart'] }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-um-die-kinder-kuemmern', feld: 'Familie', kind: 'wortverbindung',
    de: 'sich um die Kinder kümmern', en: 'to look after the children',
    rektion: 'um + Akk',
    variants: [],
    saetze: [
      { de: 'Beide Eltern wollen {{sich um die Kinder kümmern}}, nicht nur einer.',
        en: 'Both parents want to look after the children, not just one of them.' },
      { de: 'Damals hat er {{sich um die Kinder gekümmert}}, während sie studierte.',
        en: 'Back then he looked after the children while she was studying.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-grenzen-setzen', feld: 'Familie', kind: 'wortverbindung',
    de: 'Grenzen setzen', en: 'to set limits (make clear what a child may not do)',
    variants: [],
    saetze: [
      { de: 'Kinder brauchen Zuwendung, aber man muss ihnen auch {{Grenzen setzen}}.',
        en: 'Children need affection, but you also have to set them limits.' },
      { de: 'Seinen Kindern hat er nie klare {{Grenzen gesetzt}} und bereut es heute.',
        en: 'He never set his children clear limits and regrets it today.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-von-zu-hause-ausziehen', feld: 'Familie', kind: 'wortverbindung',
    de: 'von zu Hause ausziehen', en: 'to move out of the parental home',
    variants: ['von zuhause ausziehen'],
    saetze: [
      { de: 'Mit zwanzig wollte ich unbedingt {{von zu Hause ausziehen}}.',
        en: 'At twenty I desperately wanted to move out of my parents\' home.' },
      { de: 'Ihr Bruder ist erst mit dreißig {{von zu Hause ausgezogen}}.',
        en: 'Her brother only moved out of the parental home at thirty.',
        blankVariants: ['von zuhause ausgezogen'] }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-unter-einem-dach-leben', feld: 'Familie', kind: 'wortverbindung',
    de: 'unter einem Dach leben', en: 'to live under one roof (share the same home)',
    rektion: 'unter + Dat',
    variants: [],
    saetze: [
      { de: 'Drei Generationen wollen dort dauerhaft {{unter einem Dach leben}}.',
        en: 'Three generations want to live under one roof there permanently.' },
      { de: 'Sie haben zwanzig Jahre lang {{unter einem Dach gelebt}}.',
        en: 'They lived under one roof for twenty years.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-auf-familiaere-unterstuetzung-angewiesen-sein', feld: 'Familie', kind: 'wortverbindung',
    de: 'auf familiäre Unterstützung angewiesen sein', en: 'to be dependent on help from the family',
    rektion: 'auf + Akk',
    variants: [],
    saetze: [
      { de: 'Berufstätige Eltern sind oft {{auf familiäre Unterstützung angewiesen}}.',
        en: 'Working parents are often dependent on help from the family.' },
      { de: 'Wer {{auf familiäre Unterstützung angewiesen ist}}, zieht selten weit weg.',
        en: 'Anyone dependent on help from the family rarely moves far away.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-den-haushalt-fuehren', feld: 'Familie', kind: 'wortverbindung',
    de: 'den Haushalt führen', en: 'to run the household (do the domestic work)',
    variants: [],
    saetze: [
      { de: 'Ihre Mutter hat vierzig Jahre lang {{den Haushalt geführt}}.',
        en: 'Her mother ran the household for forty years.' },
      { de: 'Wer neben dem Job {{den Haushalt führt}}, hat kaum freie Abende.',
        en: 'Anyone running the household alongside a job has hardly any free evenings.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-familie-ein-offenes-ohr-haben', feld: 'Familie', kind: 'wortverbindung',
    de: 'ein offenes Ohr haben', en: 'to be ready to listen (willing to hear somebody out)',
    rektion: 'für + Akk',
    variants: [],
    saetze: [
      { de: 'In der Pubertät sollte wenigstens ein Erwachsener {{ein offenes Ohr haben}}.',
        en: 'During puberty at least one adult should be ready to listen.' },
      { de: 'Ich mochte meine Tante, weil sie stets {{ein offenes Ohr hatte}}.',
        en: 'I liked my aunt because she was always ready to listen.' }
    ],
    source: 'seed'
  }
]
