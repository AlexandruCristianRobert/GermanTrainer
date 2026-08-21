import type { Vokabel } from './wortschatz'

export const WORTSCHATZ_UMWELT: Vokabel[] = [
  {
    id: 'vk-umwelt-massnahme-ergreifen', feld: 'Umwelt', kind: 'wortverbindung',
    de: 'eine Maßnahme ergreifen', en: 'to take a measure',
    variants: ['Maßnahmen ergreifen'],
    saetze: [
      { de: 'Die Stadt hat endlich {{eine Maßnahme ergriffen}}, um den Lärm zu senken.',
        en: 'The city finally took a measure to reduce the noise.',
        blankVariants: ['Maßnahmen ergriffen'] },
      { de: 'Gegen die steigenden Emissionen müssen wir {{Maßnahmen ergreifen}}.',
        en: 'We must take measures against rising emissions.',
        blankVariants: ['eine Maßnahme ergreifen'] }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-verpackung', feld: 'Umwelt', kind: 'einzelwort',
    de: 'die Verpackung', en: 'packaging', plural: 'Verpackungen',
    variants: [],
    saetze: [
      { de: 'Viele Produkte stecken heutzutage in unnötig großer und aufwendiger {{Verpackung}}.',
        en: 'Many products nowadays come in needlessly large and elaborate packaging.' },
      { de: 'Der Laden verzichtet vollständig auf {{Verpackungen}} aus Plastik.',
        en: 'The shop completely does without plastic packaging.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-schadstoff', feld: 'Umwelt', kind: 'einzelwort',
    de: 'der Schadstoff', en: 'pollutant (harmful substance in air, water or soil)', plural: 'Schadstoffe',
    variants: [],
    saetze: [
      { de: 'Der Verkehr in der Innenstadt setzt täglich große Mengen an {{Schadstoffen}} frei.',
        en: 'Traffic in the city centre releases large quantities of pollutants every day.' },
      { de: 'Dieser {{Schadstoff}} gelangt über das Abwasser in Flüsse und Seen.',
        en: 'This pollutant reaches rivers and lakes via the waste water.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-oekosystem', feld: 'Umwelt', kind: 'einzelwort',
    de: 'das Ökosystem', en: 'ecosystem', plural: 'Ökosysteme',
    variants: [],
    saetze: [
      { de: 'Der Bau der Straße greift massiv in das {{Ökosystem}} des Waldes ein.',
        en: 'Building the road interferes massively with the forest ecosystem.' },
      { de: 'Empfindliche {{Ökosysteme}} erholen sich von solchen Eingriffen erst nach Jahrzehnten.',
        en: 'Sensitive ecosystems only recover from such interventions after decades.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-waermepumpe', feld: 'Umwelt', kind: 'einzelwort',
    de: 'die Wärmepumpe', en: 'heat pump', plural: 'Wärmepumpen',
    variants: [],
    saetze: [
      { de: 'Wir haben im vergangenen Winter die alte Ölheizung durch eine {{Wärmepumpe}} ersetzt.',
        en: 'Last winter we replaced the old oil heating with a heat pump.' },
      { de: 'In Neubauten sind {{Wärmepumpen}} inzwischen deutlich häufiger als klassische Gasheizungen.',
        en: 'In new buildings, heat pumps are now much more common than conventional gas heating.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-abfallmenge', feld: 'Umwelt', kind: 'einzelwort',
    de: 'die Abfallmenge', en: 'amount of waste', plural: 'Abfallmengen',
    variants: [],
    saetze: [
      { de: 'Die {{Abfallmenge}} pro Haushalt ist in den letzten Jahren kaum gesunken.',
        en: 'The amount of waste per household has hardly fallen in recent years.' },
      { de: 'Durch Mehrwegbehälter lassen sich erhebliche {{Abfallmengen}} im Alltag vermeiden.',
        en: 'Reusable containers make it possible to avoid considerable amounts of waste in daily life.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-pfandsystem', feld: 'Umwelt', kind: 'einzelwort',
    de: 'das Pfandsystem', en: 'deposit-return scheme (for bottles and cans)', plural: 'Pfandsysteme',
    variants: [],
    saetze: [
      { de: 'Das deutsche {{Pfandsystem}} sorgt dafür, dass fast jede Flasche zurückkommt.',
        en: 'The German deposit-return scheme ensures that almost every bottle comes back.' },
      { de: 'In vielen Ländern fehlen {{Pfandsysteme}} für Getränkedosen bis heute völlig.',
        en: 'In many countries, deposit-return schemes for drinks cans are still completely lacking.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-windpark', feld: 'Umwelt', kind: 'einzelwort',
    de: 'der Windpark', en: 'wind farm', plural: 'Windparks',
    variants: [],
    saetze: [
      { de: 'Vor der Küste entsteht bis 2030 ein weiterer großer {{Windpark}}.',
        en: 'Another large wind farm is being built off the coast by 2030.' },
      { de: 'Gegen neue {{Windparks}} in Waldgebieten protestieren regelmäßig Anwohner und Naturschützer.',
        en: 'Local residents and conservationists regularly protest against new wind farms in forest areas.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-oekobilanz', feld: 'Umwelt', kind: 'einzelwort',
    de: 'die Ökobilanz', en: 'life-cycle assessment (a product\'s overall environmental balance sheet)', plural: 'Ökobilanzen',
    variants: [],
    saetze: [
      { de: 'Ein Elektroauto hat über den gesamten Lebenszyklus die bessere {{Ökobilanz}}.',
        en: 'Over its entire life cycle, an electric car has the better environmental balance sheet.' },
      { de: 'Hersteller veröffentlichen die {{Ökobilanzen}} ihrer Produkte bislang nur selten freiwillig.',
        en: 'So far, manufacturers rarely publish the life-cycle assessments of their products voluntarily.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-entsorgen', feld: 'Umwelt', kind: 'einzelwort',
    de: 'entsorgen', en: 'to dispose of (get rid of waste properly)',
    variants: [],
    saetze: [
      { de: 'Alte Batterien darf man keinesfalls über den Hausmüll {{entsorgen}}.',
        en: 'Old batteries must under no circumstances be disposed of with household waste.' },
      { de: 'Der Betrieb hat den Bauschutt ordnungsgemäß {{entsorgt}} und die Belege aufbewahrt.',
        en: 'The company disposed of the rubble properly and kept the receipts.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-verschmutzen', feld: 'Umwelt', kind: 'einzelwort',
    de: 'verschmutzen', en: 'to pollute (contaminate air, water or soil)',
    variants: [],
    saetze: [
      { de: 'Mikroplastik {{verschmutzt}} inzwischen selbst entlegene Gewässer im Norden Europas.',
        en: 'Microplastics now pollute even remote waters in the north of Europe.' },
      { de: 'Ungefilterte Abwässer {{verschmutzen}} die Flüsse in vielen Regionen noch heute.',
        en: 'Unfiltered waste water still pollutes the rivers in many regions today.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-klimaneutral', feld: 'Umwelt', kind: 'einzelwort',
    de: 'klimaneutral', en: 'climate-neutral (causing no net greenhouse gas emissions)',
    variants: [],
    saetze: [
      { de: 'Die Hochschule will bis 2035 vollständig {{klimaneutral}} wirtschaften.',
        en: 'The university wants to operate in a fully climate-neutral way by 2035.' },
      { de: 'Ein wirklich {{klimaneutraler}} Versand ist bei Auslandsbestellungen kaum zu erreichen.',
        en: 'Genuinely climate-neutral shipping is hard to achieve for orders from abroad.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-erneuerbar', feld: 'Umwelt', kind: 'einzelwort',
    de: 'erneuerbar', en: 'renewable (of energy sources that do not run out)',
    variants: [],
    saetze: [
      { de: 'Der Anteil {{erneuerbarer}} Energien am Strommix wächst seit Jahren stetig.',
        en: 'The share of renewable energy in the electricity mix has been growing steadily for years.' },
      { de: 'Diese Anlage nutzt ausschließlich {{erneuerbare}} Energie aus Sonne und Wind.',
        en: 'This plant uses exclusively renewable energy from sun and wind.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-beitrag-klimaschutz', feld: 'Umwelt', kind: 'wortverbindung',
    de: 'einen Beitrag zum Klimaschutz leisten', en: 'to make a contribution to climate protection',
    rektion: 'zu + Dat',
    variants: ['Beiträge zum Klimaschutz leisten'],
    saetze: [
      { de: 'Auch kleine Betriebe können {{einen Beitrag zum Klimaschutz leisten}}.',
        en: 'Small businesses can also make a contribution to climate protection.' },
      { de: 'Mit der neuen Dämmung hat die Gemeinde {{einen Beitrag zum Klimaschutz geleistet}}.',
        en: 'With the new insulation, the municipality has made a contribution to climate protection.',
        blankVariants: ['Beiträge zum Klimaschutz geleistet'] }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-oekologischer-fussabdruck', feld: 'Umwelt', kind: 'wortverbindung',
    de: 'den ökologischen Fußabdruck verringern', en: 'to reduce one\'s ecological footprint',
    variants: ['seinen ökologischen Fußabdruck verringern'],
    saetze: [
      { de: 'Wer bewusst einkauft, kann im Alltag {{den ökologischen Fußabdruck verringern}} und Geld sparen.',
        en: 'Anyone who shops consciously can reduce their ecological footprint in everyday life and save money.' },
      { de: 'Durch kürzere Transportwege hat der Konzern {{den ökologischen Fußabdruck verringert}}.',
        en: 'Through shorter transport routes, the group has reduced its ecological footprint.',
        blankVariants: ['seinen ökologischen Fußabdruck verringert'] }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-muell-trennen', feld: 'Umwelt', kind: 'wortverbindung',
    de: 'Müll trennen', en: 'to separate waste (sort it for recycling)',
    variants: ['den Müll trennen'],
    saetze: [
      { de: 'Viele Haushalte wissen nicht genau, wie sie {{Müll trennen}} sollen.',
        en: 'Many households do not know exactly how they are supposed to separate their waste.' },
      { de: 'Wer konsequent {{Müll trennt}}, erleichtert den Betrieben die Wiederverwertung erheblich.',
        en: 'Anyone who separates waste consistently makes recycling considerably easier for the plants.',
        blankVariants: ['den Müll trennt'] }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-umweltschutz-einsetzen', feld: 'Umwelt', kind: 'wortverbindung',
    de: 'sich für den Umweltschutz einsetzen', en: 'to campaign for environmental protection',
    rektion: 'für + Akk',
    variants: [],
    saetze: [
      { de: 'Immer mehr Jugendliche wollen {{sich für den Umweltschutz einsetzen}}.',
        en: 'More and more young people want to campaign for environmental protection.' },
      { de: 'Der Verein hat {{sich für den Umweltschutz eingesetzt}}, bevor es Mode wurde.',
        en: 'The association campaigned for environmental protection before it became fashionable.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-klimawandel-leiden', feld: 'Umwelt', kind: 'wortverbindung',
    de: 'unter dem Klimawandel leiden', en: 'to suffer from climate change',
    rektion: 'unter + Dat',
    variants: [],
    saetze: [
      { de: 'Besonders die Landwirtschaft wird künftig {{unter dem Klimawandel leiden}}.',
        en: 'Agriculture in particular will suffer from climate change in future.' },
      { de: 'Viele Küstenregionen haben bereits merklich {{unter dem Klimawandel gelitten}}.',
        en: 'Many coastal regions have already suffered noticeably from climate change.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-ressourcen-schonen', feld: 'Umwelt', kind: 'wortverbindung',
    de: 'Ressourcen schonen', en: 'to conserve resources (use them sparingly)',
    variants: [],
    saetze: [
      { de: 'Reparaturen sind sinnvoll, weil sie {{Ressourcen schonen}} und Müll vermeiden.',
        en: 'Repairs make sense because they conserve resources and avoid waste.' },
      { de: 'Die Umstellung auf Recyclingpapier hat im Büro spürbar {{Ressourcen geschont}}.',
        en: 'Switching to recycled paper has noticeably conserved resources in the office.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-umwelt-belasten', feld: 'Umwelt', kind: 'wortverbindung',
    de: 'die Umwelt belasten', en: 'to put a strain on the environment',
    variants: [],
    saetze: [
      { de: 'Viele Verbraucher wissen nicht, wie stark Fertiggerichte {{die Umwelt belasten}}.',
        en: 'Many consumers do not know how heavily ready meals strain the environment.' },
      { de: 'Die jahrzehntelange Braunkohleförderung hat {{die Umwelt belastet}} und ganze Dörfer zerstört.',
        en: 'Decades of lignite mining have strained the environment and destroyed whole villages.' }
    ],
    source: 'seed'
  }
]
