export const VERB_LEVELS = ['A1', 'A2'] as const
export type VerbLevel = (typeof VERB_LEVELS)[number]

export const VERB_TYPES = ['regular', 'irregular', 'mixed', 'separable', 'modal'] as const
export type VerbType = (typeof VERB_TYPES)[number]

export const VERB_CASES = [
  'none',
  'accusative',
  'dative',
  'dative+accusative',
  'genitive',
  'reflexive',
  'varies'
] as const
export type VerbCase = (typeof VERB_CASES)[number]

export type Auxiliary = 'haben' | 'sein'

export const VERB_PERSONS = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'] as const
export type VerbPerson = (typeof VERB_PERSONS)[number]

export const IMPERATIV_PERSONS = ['du', 'ihr', 'Sie'] as const
export type ImperativPerson = (typeof IMPERATIV_PERSONS)[number]

export type SixForms = readonly [string, string, string, string, string, string]

export const ACTIVE_TENSES = [
  'praesens',
  'imperativ',
  'perfekt',
  'praeteritum',
  'plusquamperfekt',
  'futur1',
  'konjunktiv2',
  'konjunktiv1',
  'futur2'
] as const

export const PASSIVE_TENSES = [
  'passivPraesens',
  'passivPraeteritum',
  'passivPerfekt',
  'passivPlusquamperfekt',
  'passivFutur1',
  'passivKonjunktiv2'
] as const

export const VERB_TENSES = [...ACTIVE_TENSES, ...PASSIVE_TENSES] as const
export type VerbTense = (typeof VERB_TENSES)[number]

export const TENSE_LABELS: Record<VerbTense, string> = {
  praesens: 'Präsens',
  imperativ: 'Imperativ',
  perfekt: 'Perfekt',
  praeteritum: 'Präteritum',
  plusquamperfekt: 'Plusquamperfekt',
  futur1: 'Futur I',
  konjunktiv2: 'Konjunktiv II',
  konjunktiv1: 'Konjunktiv I',
  futur2: 'Futur II',
  passivPraesens: 'Passiv Präsens',
  passivPraeteritum: 'Passiv Präteritum',
  passivPerfekt: 'Passiv Perfekt',
  passivPlusquamperfekt: 'Passiv Plusquamperfekt',
  passivFutur1: 'Passiv Futur I',
  passivKonjunktiv2: 'Passiv Konjunktiv II'
}

export type TenseCEFR = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'

export const TENSE_LEVEL: Record<VerbTense, TenseCEFR> = {
  praesens: 'A1',
  imperativ: 'A1',
  perfekt: 'A1',
  praeteritum: 'A2',
  plusquamperfekt: 'A2',
  futur1: 'A2',
  konjunktiv2: 'B1',
  passivPraesens: 'B1',
  passivPraeteritum: 'B1',
  konjunktiv1: 'B2',
  futur2: 'B2',
  passivPerfekt: 'B2',
  passivPlusquamperfekt: 'B2',
  passivFutur1: 'C1',
  passivKonjunktiv2: 'C1'
}

export const PASSIVE_TENSE_SET: ReadonlySet<VerbTense> = new Set(PASSIVE_TENSES)

export interface Verb {
  german: string
  english: string
  level: VerbLevel
  type: VerbType
  case: VerbCase
  auxiliary: Auxiliary
  separablePrefix?: string
  praesens: SixForms
  praeteritumStem: string
  praeteritum?: SixForms
  partizip2: string
  konjunktiv2?: SixForms
  konjunktiv1?: SixForms
  imperativDu?: string
  notes?: string
}

export const VERBS: readonly Verb[] = [
  // ─── A1 high-frequency verbs ─────────────────────────────────────────
  {
    german: 'sein', english: 'be',
    level: 'A1', type: 'irregular', case: 'none', auxiliary: 'sein',
    praesens: ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'],
    praeteritumStem: 'war',
    partizip2: 'gewesen',
    konjunktiv2: ['wäre', 'wärst', 'wäre', 'wären', 'wärt', 'wären'],
    konjunktiv1: ['sei', 'seist', 'sei', 'seien', 'seiet', 'seien'],
    imperativDu: 'sei'
  },
  {
    german: 'haben', english: 'have',
    level: 'A1', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'],
    praeteritumStem: 'hatte',
    partizip2: 'gehabt',
    konjunktiv2: ['hätte', 'hättest', 'hätte', 'hätten', 'hättet', 'hätten'],
    imperativDu: 'hab'
  },
  {
    german: 'werden', english: 'become',
    level: 'A1', type: 'irregular', case: 'none', auxiliary: 'sein',
    praesens: ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden'],
    praeteritumStem: 'wurde',
    praeteritum: ['wurde', 'wurdest', 'wurde', 'wurden', 'wurdet', 'wurden'],
    partizip2: 'geworden',
    konjunktiv2: ['würde', 'würdest', 'würde', 'würden', 'würdet', 'würden'],
    imperativDu: 'werde'
  },
  {
    german: 'fragen', english: 'ask',
    level: 'A1', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['frage', 'fragst', 'fragt', 'fragen', 'fragt', 'fragen'],
    praeteritumStem: 'fragte', partizip2: 'gefragt'
  },
  {
    german: 'spielen', english: 'play',
    level: 'A1', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['spiele', 'spielst', 'spielt', 'spielen', 'spielt', 'spielen'],
    praeteritumStem: 'spielte', partizip2: 'gespielt'
  },
  {
    german: 'machen', english: 'make / do',
    level: 'A1', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['mache', 'machst', 'macht', 'machen', 'macht', 'machen'],
    praeteritumStem: 'machte', partizip2: 'gemacht'
  },
  {
    german: 'sagen', english: 'say',
    level: 'A1', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['sage', 'sagst', 'sagt', 'sagen', 'sagt', 'sagen'],
    praeteritumStem: 'sagte', partizip2: 'gesagt'
  },
  {
    german: 'sehen', english: 'see',
    level: 'A1', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['sehe', 'siehst', 'sieht', 'sehen', 'seht', 'sehen'],
    praeteritumStem: 'sah', partizip2: 'gesehen',
    konjunktiv2: ['sähe', 'sähest', 'sähe', 'sähen', 'sähet', 'sähen'],
    imperativDu: 'sieh'
  },
  {
    german: 'geben', english: 'give',
    level: 'A1', type: 'irregular', case: 'dative+accusative', auxiliary: 'haben',
    praesens: ['gebe', 'gibst', 'gibt', 'geben', 'gebt', 'geben'],
    praeteritumStem: 'gab', partizip2: 'gegeben',
    konjunktiv2: ['gäbe', 'gäbest', 'gäbe', 'gäben', 'gäbet', 'gäben'],
    imperativDu: 'gib'
  },
  {
    german: 'nehmen', english: 'take',
    level: 'A1', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['nehme', 'nimmst', 'nimmt', 'nehmen', 'nehmt', 'nehmen'],
    praeteritumStem: 'nahm', partizip2: 'genommen',
    konjunktiv2: ['nähme', 'nähmest', 'nähme', 'nähmen', 'nähmet', 'nähmen'],
    imperativDu: 'nimm'
  },
  {
    german: 'finden', english: 'find',
    level: 'A1', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['finde', 'findest', 'findet', 'finden', 'findet', 'finden'],
    praeteritumStem: 'fand', partizip2: 'gefunden',
    konjunktiv2: ['fände', 'fändest', 'fände', 'fänden', 'fändet', 'fänden']
  },
  {
    german: 'müssen', english: 'must / have to',
    level: 'A1', type: 'modal', case: 'none', auxiliary: 'haben',
    praesens: ['muss', 'musst', 'muss', 'müssen', 'müsst', 'müssen'],
    praeteritumStem: 'musste', partizip2: 'gemusst',
    konjunktiv2: ['müsste', 'müsstest', 'müsste', 'müssten', 'müsstet', 'müssten']
  },
  {
    german: 'wollen', english: 'want',
    level: 'A1', type: 'modal', case: 'accusative', auxiliary: 'haben',
    praesens: ['will', 'willst', 'will', 'wollen', 'wollt', 'wollen'],
    praeteritumStem: 'wollte', partizip2: 'gewollt',
    konjunktiv2: ['wollte', 'wolltest', 'wollte', 'wollten', 'wolltet', 'wollten']
  },
  {
    german: 'sollen', english: 'should / be supposed to',
    level: 'A1', type: 'modal', case: 'none', auxiliary: 'haben',
    praesens: ['soll', 'sollst', 'soll', 'sollen', 'sollt', 'sollen'],
    praeteritumStem: 'sollte', partizip2: 'gesollt',
    konjunktiv2: ['sollte', 'solltest', 'sollte', 'sollten', 'solltet', 'sollten']
  },
  {
    german: 'dürfen', english: 'may / be allowed to',
    level: 'A1', type: 'modal', case: 'none', auxiliary: 'haben',
    praesens: ['darf', 'darfst', 'darf', 'dürfen', 'dürft', 'dürfen'],
    praeteritumStem: 'durfte', partizip2: 'gedurft',
    konjunktiv2: ['dürfte', 'dürftest', 'dürfte', 'dürften', 'dürftet', 'dürften']
  },
  {
    german: 'mögen', english: 'like',
    level: 'A1', type: 'modal', case: 'accusative', auxiliary: 'haben',
    praesens: ['mag', 'magst', 'mag', 'mögen', 'mögt', 'mögen'],
    praeteritumStem: 'mochte', partizip2: 'gemocht',
    konjunktiv2: ['möchte', 'möchtest', 'möchte', 'möchten', 'möchtet', 'möchten']
  },
  {
    german: 'können', english: 'can / be able to',
    level: 'A1', type: 'modal', case: 'none', auxiliary: 'haben',
    praesens: ['kann', 'kannst', 'kann', 'können', 'könnt', 'können'],
    praeteritumStem: 'konnte', partizip2: 'gekonnt',
    konjunktiv2: ['könnte', 'könntest', 'könnte', 'könnten', 'könntet', 'könnten']
  },
  {
    german: 'wissen', english: 'know (a fact)',
    level: 'A1', type: 'mixed', case: 'accusative', auxiliary: 'haben',
    praesens: ['weiß', 'weißt', 'weiß', 'wissen', 'wisst', 'wissen'],
    praeteritumStem: 'wusste', partizip2: 'gewusst',
    konjunktiv2: ['wüsste', 'wüsstest', 'wüsste', 'wüssten', 'wüsstet', 'wüssten']
  },
  {
    german: 'stehen', english: 'stand',
    level: 'A1', type: 'irregular', case: 'none', auxiliary: 'haben',
    praesens: ['stehe', 'stehst', 'steht', 'stehen', 'steht', 'stehen'],
    praeteritumStem: 'stand', partizip2: 'gestanden',
    konjunktiv2: ['stünde', 'stündest', 'stünde', 'stünden', 'stündet', 'stünden']
  },
  {
    german: 'liegen', english: 'lie / be lying',
    level: 'A1', type: 'irregular', case: 'none', auxiliary: 'haben',
    praesens: ['liege', 'liegst', 'liegt', 'liegen', 'liegt', 'liegen'],
    praeteritumStem: 'lag', partizip2: 'gelegen',
    konjunktiv2: ['läge', 'lägest', 'läge', 'lägen', 'läget', 'lägen']
  },
  {
    german: 'leben', english: 'live',
    level: 'A1', type: 'regular', case: 'none', auxiliary: 'haben',
    praesens: ['lebe', 'lebst', 'lebt', 'leben', 'lebt', 'leben'],
    praeteritumStem: 'lebte', partizip2: 'gelebt'
  },
  {
    german: 'lernen', english: 'learn',
    level: 'A1', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['lerne', 'lernst', 'lernt', 'lernen', 'lernt', 'lernen'],
    praeteritumStem: 'lernte', partizip2: 'gelernt'
  },
  {
    german: 'arbeiten', english: 'work',
    level: 'A1', type: 'regular', case: 'none', auxiliary: 'haben',
    praesens: ['arbeite', 'arbeitest', 'arbeitet', 'arbeiten', 'arbeitet', 'arbeiten'],
    praeteritumStem: 'arbeitete', partizip2: 'gearbeitet'
  },
  {
    german: 'kaufen', english: 'buy',
    level: 'A1', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['kaufe', 'kaufst', 'kauft', 'kaufen', 'kauft', 'kaufen'],
    praeteritumStem: 'kaufte', partizip2: 'gekauft'
  },
  {
    german: 'brauchen', english: 'need',
    level: 'A1', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['brauche', 'brauchst', 'braucht', 'brauchen', 'braucht', 'brauchen'],
    praeteritumStem: 'brauchte', partizip2: 'gebraucht'
  },
  {
    german: 'suchen', english: 'search / look for',
    level: 'A1', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['suche', 'suchst', 'sucht', 'suchen', 'sucht', 'suchen'],
    praeteritumStem: 'suchte', partizip2: 'gesucht'
  },
  {
    german: 'antworten', english: 'answer',
    level: 'A1', type: 'regular', case: 'dative', auxiliary: 'haben',
    praesens: ['antworte', 'antwortest', 'antwortet', 'antworten', 'antwortet', 'antworten'],
    praeteritumStem: 'antwortete', partizip2: 'geantwortet',
    notes: '+ dative person'
  },
  {
    german: 'hören', english: 'hear / listen',
    level: 'A1', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['höre', 'hörst', 'hört', 'hören', 'hört', 'hören'],
    praeteritumStem: 'hörte', partizip2: 'gehört'
  },
  {
    german: 'lesen', english: 'read',
    level: 'A1', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['lese', 'liest', 'liest', 'lesen', 'lest', 'lesen'],
    praeteritumStem: 'las', partizip2: 'gelesen',
    konjunktiv2: ['läse', 'läsest', 'läse', 'läsen', 'läset', 'läsen'],
    imperativDu: 'lies'
  },
  {
    german: 'schreiben', english: 'write',
    level: 'A1', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['schreibe', 'schreibst', 'schreibt', 'schreiben', 'schreibt', 'schreiben'],
    praeteritumStem: 'schrieb', partizip2: 'geschrieben'
  },
  {
    german: 'sprechen', english: 'speak',
    level: 'A1', type: 'irregular', case: 'none', auxiliary: 'haben',
    praesens: ['spreche', 'sprichst', 'spricht', 'sprechen', 'sprecht', 'sprechen'],
    praeteritumStem: 'sprach', partizip2: 'gesprochen',
    konjunktiv2: ['spräche', 'sprächest', 'spräche', 'sprächen', 'sprächet', 'sprächen'],
    imperativDu: 'sprich'
  },
  {
    german: 'verstehen', english: 'understand',
    level: 'A1', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['verstehe', 'verstehst', 'versteht', 'verstehen', 'versteht', 'verstehen'],
    praeteritumStem: 'verstand', partizip2: 'verstanden'
  },
  {
    german: 'lieben', english: 'love',
    level: 'A1', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['liebe', 'liebst', 'liebt', 'lieben', 'liebt', 'lieben'],
    praeteritumStem: 'liebte', partizip2: 'geliebt'
  },
  {
    german: 'essen', english: 'eat',
    level: 'A1', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['esse', 'isst', 'isst', 'essen', 'esst', 'essen'],
    praeteritumStem: 'aß', partizip2: 'gegessen',
    konjunktiv2: ['äße', 'äßest', 'äße', 'äßen', 'äßet', 'äßen'],
    imperativDu: 'iss'
  },
  {
    german: 'trinken', english: 'drink',
    level: 'A1', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['trinke', 'trinkst', 'trinkt', 'trinken', 'trinkt', 'trinken'],
    praeteritumStem: 'trank', partizip2: 'getrunken'
  },
  {
    german: 'schlafen', english: 'sleep',
    level: 'A1', type: 'irregular', case: 'none', auxiliary: 'haben',
    praesens: ['schlafe', 'schläfst', 'schläft', 'schlafen', 'schlaft', 'schlafen'],
    praeteritumStem: 'schlief', partizip2: 'geschlafen',
    imperativDu: 'schlaf'
  },
  {
    german: 'kochen', english: 'cook',
    level: 'A1', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['koche', 'kochst', 'kocht', 'kochen', 'kocht', 'kochen'],
    praeteritumStem: 'kochte', partizip2: 'gekocht'
  },
  {
    german: 'kennen', english: 'know (a person/thing)',
    level: 'A1', type: 'mixed', case: 'accusative', auxiliary: 'haben',
    praesens: ['kenne', 'kennst', 'kennt', 'kennen', 'kennt', 'kennen'],
    praeteritumStem: 'kannte', partizip2: 'gekannt',
    konjunktiv2: ['kennte', 'kenntest', 'kennte', 'kennten', 'kenntet', 'kennten']
  },
  {
    german: 'denken', english: 'think',
    level: 'A1', type: 'mixed', case: 'none', auxiliary: 'haben',
    praesens: ['denke', 'denkst', 'denkt', 'denken', 'denkt', 'denken'],
    praeteritumStem: 'dachte', partizip2: 'gedacht',
    konjunktiv2: ['dächte', 'dächtest', 'dächte', 'dächten', 'dächtet', 'dächten']
  },
  {
    german: 'glauben', english: 'believe',
    level: 'A1', type: 'regular', case: 'varies', auxiliary: 'haben',
    praesens: ['glaube', 'glaubst', 'glaubt', 'glauben', 'glaubt', 'glauben'],
    praeteritumStem: 'glaubte', partizip2: 'geglaubt',
    notes: 'dative for persons, accusative for things'
  },
  {
    german: 'heißen', english: 'be called',
    level: 'A1', type: 'irregular', case: 'none', auxiliary: 'haben',
    praesens: ['heiße', 'heißt', 'heißt', 'heißen', 'heißt', 'heißen'],
    praeteritumStem: 'hieß', partizip2: 'geheißen'
  },
  {
    german: 'wohnen', english: 'live / reside',
    level: 'A1', type: 'regular', case: 'none', auxiliary: 'haben',
    praesens: ['wohne', 'wohnst', 'wohnt', 'wohnen', 'wohnt', 'wohnen'],
    praeteritumStem: 'wohnte', partizip2: 'gewohnt'
  },
  {
    german: 'fahren', english: 'drive / go (by vehicle)',
    level: 'A1', type: 'irregular', case: 'varies', auxiliary: 'sein',
    praesens: ['fahre', 'fährst', 'fährt', 'fahren', 'fahrt', 'fahren'],
    praeteritumStem: 'fuhr', partizip2: 'gefahren',
    konjunktiv2: ['führe', 'führest', 'führe', 'führen', 'führet', 'führen'],
    imperativDu: 'fahr'
  },
  {
    german: 'fliegen', english: 'fly',
    level: 'A1', type: 'irregular', case: 'none', auxiliary: 'sein',
    praesens: ['fliege', 'fliegst', 'fliegt', 'fliegen', 'fliegt', 'fliegen'],
    praeteritumStem: 'flog', partizip2: 'geflogen'
  },
  {
    german: 'laufen', english: 'run / walk',
    level: 'A1', type: 'irregular', case: 'none', auxiliary: 'sein',
    praesens: ['laufe', 'läufst', 'läuft', 'laufen', 'lauft', 'laufen'],
    praeteritumStem: 'lief', partizip2: 'gelaufen',
    imperativDu: 'lauf'
  },
  {
    german: 'helfen', english: 'help',
    level: 'A1', type: 'irregular', case: 'dative', auxiliary: 'haben',
    praesens: ['helfe', 'hilfst', 'hilft', 'helfen', 'helft', 'helfen'],
    praeteritumStem: 'half', partizip2: 'geholfen',
    konjunktiv2: ['hülfe', 'hülfest', 'hülfe', 'hülfen', 'hülfet', 'hülfen'],
    imperativDu: 'hilf'
  },
  {
    german: 'treffen', english: 'meet / hit',
    level: 'A1', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['treffe', 'triffst', 'trifft', 'treffen', 'trefft', 'treffen'],
    praeteritumStem: 'traf', partizip2: 'getroffen',
    imperativDu: 'triff'
  },
  {
    german: 'lachen', english: 'laugh',
    level: 'A1', type: 'regular', case: 'none', auxiliary: 'haben',
    praesens: ['lache', 'lachst', 'lacht', 'lachen', 'lacht', 'lachen'],
    praeteritumStem: 'lachte', partizip2: 'gelacht'
  },
  {
    german: 'weinen', english: 'cry',
    level: 'A1', type: 'regular', case: 'none', auxiliary: 'haben',
    praesens: ['weine', 'weinst', 'weint', 'weinen', 'weint', 'weinen'],
    praeteritumStem: 'weinte', partizip2: 'geweint'
  },
  {
    german: 'warten', english: 'wait',
    level: 'A1', type: 'regular', case: 'none', auxiliary: 'haben',
    praesens: ['warte', 'wartest', 'wartet', 'warten', 'wartet', 'warten'],
    praeteritumStem: 'wartete', partizip2: 'gewartet'
  },
  {
    german: 'bleiben', english: 'stay / remain',
    level: 'A1', type: 'irregular', case: 'none', auxiliary: 'sein',
    praesens: ['bleibe', 'bleibst', 'bleibt', 'bleiben', 'bleibt', 'bleiben'],
    praeteritumStem: 'blieb', partizip2: 'geblieben'
  },
  {
    german: 'gefallen', english: 'please / be pleasing',
    level: 'A1', type: 'irregular', case: 'dative', auxiliary: 'haben',
    praesens: ['gefalle', 'gefällst', 'gefällt', 'gefallen', 'gefallt', 'gefallen'],
    praeteritumStem: 'gefiel', partizip2: 'gefallen',
    imperativDu: 'gefall'
  },
  {
    german: 'schmecken', english: 'taste',
    level: 'A1', type: 'regular', case: 'dative', auxiliary: 'haben',
    praesens: ['schmecke', 'schmeckst', 'schmeckt', 'schmecken', 'schmeckt', 'schmecken'],
    praeteritumStem: 'schmeckte', partizip2: 'geschmeckt',
    notes: '+ dative person'
  },
  {
    german: 'wünschen', english: 'wish',
    level: 'A1', type: 'regular', case: 'dative+accusative', auxiliary: 'haben',
    praesens: ['wünsche', 'wünschst', 'wünscht', 'wünschen', 'wünscht', 'wünschen'],
    praeteritumStem: 'wünschte', partizip2: 'gewünscht'
  },
  {
    german: 'gehen', english: 'go / walk',
    level: 'A1', type: 'irregular', case: 'none', auxiliary: 'sein',
    praesens: ['gehe', 'gehst', 'geht', 'gehen', 'geht', 'gehen'],
    praeteritumStem: 'ging', partizip2: 'gegangen',
    konjunktiv2: ['ginge', 'gingest', 'ginge', 'gingen', 'ginget', 'gingen']
  },
  {
    german: 'kommen', english: 'come',
    level: 'A1', type: 'irregular', case: 'none', auxiliary: 'sein',
    praesens: ['komme', 'kommst', 'kommt', 'kommen', 'kommt', 'kommen'],
    praeteritumStem: 'kam', partizip2: 'gekommen',
    konjunktiv2: ['käme', 'kämest', 'käme', 'kämen', 'kämet', 'kämen']
  },
  {
    german: 'bringen', english: 'bring',
    level: 'A1', type: 'mixed', case: 'dative+accusative', auxiliary: 'haben',
    praesens: ['bringe', 'bringst', 'bringt', 'bringen', 'bringt', 'bringen'],
    praeteritumStem: 'brachte', partizip2: 'gebracht'
  },
  {
    german: 'sitzen', english: 'sit / be sitting',
    level: 'A1', type: 'irregular', case: 'none', auxiliary: 'haben',
    praesens: ['sitze', 'sitzt', 'sitzt', 'sitzen', 'sitzt', 'sitzen'],
    praeteritumStem: 'saß', partizip2: 'gesessen'
  },
  {
    german: 'tanzen', english: 'dance',
    level: 'A1', type: 'regular', case: 'none', auxiliary: 'haben',
    praesens: ['tanze', 'tanzt', 'tanzt', 'tanzen', 'tanzt', 'tanzen'],
    praeteritumStem: 'tanzte', partizip2: 'getanzt'
  },
  {
    german: 'schwimmen', english: 'swim',
    level: 'A1', type: 'irregular', case: 'none', auxiliary: 'sein',
    praesens: ['schwimme', 'schwimmst', 'schwimmt', 'schwimmen', 'schwimmt', 'schwimmen'],
    praeteritumStem: 'schwamm', partizip2: 'geschwommen'
  },
  {
    german: 'regnen', english: 'rain',
    level: 'A1', type: 'regular', case: 'none', auxiliary: 'haben',
    praesens: ['regne', 'regnest', 'regnet', 'regnen', 'regnet', 'regnen'],
    praeteritumStem: 'regnete', partizip2: 'geregnet',
    notes: 'impersonal: es regnet'
  },
  {
    german: 'schneien', english: 'snow',
    level: 'A1', type: 'regular', case: 'none', auxiliary: 'haben',
    praesens: ['schneie', 'schneist', 'schneit', 'schneien', 'schneit', 'schneien'],
    praeteritumStem: 'schneite', partizip2: 'geschneit',
    notes: 'impersonal: es schneit'
  },
  {
    german: 'putzen', english: 'clean',
    level: 'A1', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['putze', 'putzt', 'putzt', 'putzen', 'putzt', 'putzen'],
    praeteritumStem: 'putzte', partizip2: 'geputzt'
  },
  {
    german: 'duschen', english: 'shower',
    level: 'A1', type: 'regular', case: 'none', auxiliary: 'haben',
    praesens: ['dusche', 'duschst', 'duscht', 'duschen', 'duscht', 'duschen'],
    praeteritumStem: 'duschte', partizip2: 'geduscht'
  },
  {
    german: 'frühstücken', english: 'have breakfast',
    level: 'A1', type: 'regular', case: 'none', auxiliary: 'haben',
    praesens: ['frühstücke', 'frühstückst', 'frühstückt', 'frühstücken', 'frühstückt', 'frühstücken'],
    praeteritumStem: 'frühstückte', partizip2: 'gefrühstückt'
  },
  {
    german: 'studieren', english: 'study (at university)',
    level: 'A1', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['studiere', 'studierst', 'studiert', 'studieren', 'studiert', 'studieren'],
    praeteritumStem: 'studierte', partizip2: 'studiert',
    notes: '-ieren: no ge- in Partizip II'
  },

  // ─── A1 separable verbs ──────────────────────────────────────────────
  {
    german: 'aufstehen', english: 'get up / stand up',
    level: 'A1', type: 'separable', case: 'none', auxiliary: 'sein',
    separablePrefix: 'auf',
    praesens: ['stehe auf', 'stehst auf', 'steht auf', 'stehen auf', 'steht auf', 'stehen auf'],
    praeteritumStem: 'stand', partizip2: 'aufgestanden'
  },
  {
    german: 'anfangen', english: 'begin / start',
    level: 'A1', type: 'separable', case: 'accusative', auxiliary: 'haben',
    separablePrefix: 'an',
    praesens: ['fange an', 'fängst an', 'fängt an', 'fangen an', 'fangt an', 'fangen an'],
    praeteritumStem: 'fing', partizip2: 'angefangen',
    imperativDu: 'fang'
  },
  {
    german: 'aufhören', english: 'stop / quit',
    level: 'A1', type: 'separable', case: 'none', auxiliary: 'haben',
    separablePrefix: 'auf',
    praesens: ['höre auf', 'hörst auf', 'hört auf', 'hören auf', 'hört auf', 'hören auf'],
    praeteritumStem: 'hörte', partizip2: 'aufgehört'
  },
  {
    german: 'aufmachen', english: 'open',
    level: 'A1', type: 'separable', case: 'accusative', auxiliary: 'haben',
    separablePrefix: 'auf',
    praesens: ['mache auf', 'machst auf', 'macht auf', 'machen auf', 'macht auf', 'machen auf'],
    praeteritumStem: 'machte', partizip2: 'aufgemacht'
  },
  {
    german: 'zumachen', english: 'close',
    level: 'A1', type: 'separable', case: 'accusative', auxiliary: 'haben',
    separablePrefix: 'zu',
    praesens: ['mache zu', 'machst zu', 'macht zu', 'machen zu', 'macht zu', 'machen zu'],
    praeteritumStem: 'machte', partizip2: 'zugemacht'
  },
  {
    german: 'einkaufen', english: 'shop / buy groceries',
    level: 'A1', type: 'separable', case: 'accusative', auxiliary: 'haben',
    separablePrefix: 'ein',
    praesens: ['kaufe ein', 'kaufst ein', 'kauft ein', 'kaufen ein', 'kauft ein', 'kaufen ein'],
    praeteritumStem: 'kaufte', partizip2: 'eingekauft'
  },
  {
    german: 'einladen', english: 'invite',
    level: 'A1', type: 'separable', case: 'accusative', auxiliary: 'haben',
    separablePrefix: 'ein',
    praesens: ['lade ein', 'lädst ein', 'lädt ein', 'laden ein', 'ladet ein', 'laden ein'],
    praeteritumStem: 'lud', partizip2: 'eingeladen',
    imperativDu: 'lade'
  },
  {
    german: 'mitkommen', english: 'come along',
    level: 'A1', type: 'separable', case: 'none', auxiliary: 'sein',
    separablePrefix: 'mit',
    praesens: ['komme mit', 'kommst mit', 'kommt mit', 'kommen mit', 'kommt mit', 'kommen mit'],
    praeteritumStem: 'kam', partizip2: 'mitgekommen'
  },
  {
    german: 'mitnehmen', english: 'take along',
    level: 'A1', type: 'separable', case: 'accusative', auxiliary: 'haben',
    separablePrefix: 'mit',
    praesens: ['nehme mit', 'nimmst mit', 'nimmt mit', 'nehmen mit', 'nehmt mit', 'nehmen mit'],
    praeteritumStem: 'nahm', partizip2: 'mitgenommen',
    imperativDu: 'nimm'
  },
  {
    german: 'fernsehen', english: 'watch TV',
    level: 'A1', type: 'separable', case: 'none', auxiliary: 'haben',
    separablePrefix: 'fern',
    praesens: ['sehe fern', 'siehst fern', 'sieht fern', 'sehen fern', 'seht fern', 'sehen fern'],
    praeteritumStem: 'sah', partizip2: 'ferngesehen',
    imperativDu: 'sieh'
  },
  {
    german: 'vorstellen', english: 'introduce / present',
    level: 'A1', type: 'separable', case: 'dative+accusative', auxiliary: 'haben',
    separablePrefix: 'vor',
    praesens: ['stelle vor', 'stellst vor', 'stellt vor', 'stellen vor', 'stellt vor', 'stellen vor'],
    praeteritumStem: 'stellte', partizip2: 'vorgestellt'
  },
  {
    german: 'anrufen', english: 'call (on the phone)',
    level: 'A1', type: 'separable', case: 'accusative', auxiliary: 'haben',
    separablePrefix: 'an',
    praesens: ['rufe an', 'rufst an', 'ruft an', 'rufen an', 'ruft an', 'rufen an'],
    praeteritumStem: 'rief', partizip2: 'angerufen'
  },
  {
    german: 'ankommen', english: 'arrive',
    level: 'A1', type: 'separable', case: 'none', auxiliary: 'sein',
    separablePrefix: 'an',
    praesens: ['komme an', 'kommst an', 'kommt an', 'kommen an', 'kommt an', 'kommen an'],
    praeteritumStem: 'kam', partizip2: 'angekommen'
  },
  {
    german: 'abfahren', english: 'depart / leave',
    level: 'A1', type: 'separable', case: 'none', auxiliary: 'sein',
    separablePrefix: 'ab',
    praesens: ['fahre ab', 'fährst ab', 'fährt ab', 'fahren ab', 'fahrt ab', 'fahren ab'],
    praeteritumStem: 'fuhr', partizip2: 'abgefahren',
    imperativDu: 'fahr'
  },
  {
    german: 'abholen', english: 'pick up',
    level: 'A1', type: 'separable', case: 'accusative', auxiliary: 'haben',
    separablePrefix: 'ab',
    praesens: ['hole ab', 'holst ab', 'holt ab', 'holen ab', 'holt ab', 'holen ab'],
    praeteritumStem: 'holte', partizip2: 'abgeholt'
  },
  {
    german: 'ausgehen', english: 'go out',
    level: 'A1', type: 'separable', case: 'none', auxiliary: 'sein',
    separablePrefix: 'aus',
    praesens: ['gehe aus', 'gehst aus', 'geht aus', 'gehen aus', 'geht aus', 'gehen aus'],
    praeteritumStem: 'ging', partizip2: 'ausgegangen'
  },
  {
    german: 'weggehen', english: 'go away / leave',
    level: 'A1', type: 'separable', case: 'none', auxiliary: 'sein',
    separablePrefix: 'weg',
    praesens: ['gehe weg', 'gehst weg', 'geht weg', 'gehen weg', 'geht weg', 'gehen weg'],
    praeteritumStem: 'ging', partizip2: 'weggegangen'
  },
  {
    german: 'zurückkommen', english: 'come back / return',
    level: 'A1', type: 'separable', case: 'none', auxiliary: 'sein',
    separablePrefix: 'zurück',
    praesens: ['komme zurück', 'kommst zurück', 'kommt zurück', 'kommen zurück', 'kommt zurück', 'kommen zurück'],
    praeteritumStem: 'kam', partizip2: 'zurückgekommen'
  },
  {
    german: 'anziehen', english: 'put on (clothes)',
    level: 'A1', type: 'separable', case: 'accusative', auxiliary: 'haben',
    separablePrefix: 'an',
    praesens: ['ziehe an', 'ziehst an', 'zieht an', 'ziehen an', 'zieht an', 'ziehen an'],
    praeteritumStem: 'zog', partizip2: 'angezogen'
  },
  {
    german: 'ausziehen', english: 'take off (clothes)',
    level: 'A1', type: 'separable', case: 'accusative', auxiliary: 'haben',
    separablePrefix: 'aus',
    praesens: ['ziehe aus', 'ziehst aus', 'zieht aus', 'ziehen aus', 'zieht aus', 'ziehen aus'],
    praeteritumStem: 'zog', partizip2: 'ausgezogen'
  },

  // ─── A2 verbs ────────────────────────────────────────────────────────
  {
    german: 'erklären', english: 'explain',
    level: 'A2', type: 'regular', case: 'dative+accusative', auxiliary: 'haben',
    praesens: ['erkläre', 'erklärst', 'erklärt', 'erklären', 'erklärt', 'erklären'],
    praeteritumStem: 'erklärte', partizip2: 'erklärt'
  },
  {
    german: 'beantworten', english: 'answer / reply to',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['beantworte', 'beantwortest', 'beantwortet', 'beantworten', 'beantwortet', 'beantworten'],
    praeteritumStem: 'beantwortete', partizip2: 'beantwortet'
  },
  {
    german: 'beginnen', english: 'begin',
    level: 'A2', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['beginne', 'beginnst', 'beginnt', 'beginnen', 'beginnt', 'beginnen'],
    praeteritumStem: 'begann', partizip2: 'begonnen'
  },
  {
    german: 'empfehlen', english: 'recommend',
    level: 'A2', type: 'irregular', case: 'dative+accusative', auxiliary: 'haben',
    praesens: ['empfehle', 'empfiehlst', 'empfiehlt', 'empfehlen', 'empfehlt', 'empfehlen'],
    praeteritumStem: 'empfahl', partizip2: 'empfohlen',
    imperativDu: 'empfiehl'
  },
  {
    german: 'mieten', english: 'rent',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['miete', 'mietest', 'mietet', 'mieten', 'mietet', 'mieten'],
    praeteritumStem: 'mietete', partizip2: 'gemietet'
  },
  {
    german: 'verkaufen', english: 'sell',
    level: 'A2', type: 'regular', case: 'dative+accusative', auxiliary: 'haben',
    praesens: ['verkaufe', 'verkaufst', 'verkauft', 'verkaufen', 'verkauft', 'verkaufen'],
    praeteritumStem: 'verkaufte', partizip2: 'verkauft'
  },
  {
    german: 'vergessen', english: 'forget',
    level: 'A2', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['vergesse', 'vergisst', 'vergisst', 'vergessen', 'vergesst', 'vergessen'],
    praeteritumStem: 'vergaß', partizip2: 'vergessen',
    imperativDu: 'vergiss'
  },
  {
    german: 'verlieren', english: 'lose',
    level: 'A2', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['verliere', 'verlierst', 'verliert', 'verlieren', 'verliert', 'verlieren'],
    praeteritumStem: 'verlor', partizip2: 'verloren'
  },
  {
    german: 'gewinnen', english: 'win',
    level: 'A2', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['gewinne', 'gewinnst', 'gewinnt', 'gewinnen', 'gewinnt', 'gewinnen'],
    praeteritumStem: 'gewann', partizip2: 'gewonnen'
  },
  {
    german: 'sterben', english: 'die',
    level: 'A2', type: 'irregular', case: 'none', auxiliary: 'sein',
    praesens: ['sterbe', 'stirbst', 'stirbt', 'sterben', 'sterbt', 'sterben'],
    praeteritumStem: 'starb', partizip2: 'gestorben',
    imperativDu: 'stirb'
  },
  {
    german: 'entscheiden', english: 'decide',
    level: 'A2', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['entscheide', 'entscheidest', 'entscheidet', 'entscheiden', 'entscheidet', 'entscheiden'],
    praeteritumStem: 'entschied', partizip2: 'entschieden'
  },
  {
    german: 'versprechen', english: 'promise',
    level: 'A2', type: 'irregular', case: 'dative+accusative', auxiliary: 'haben',
    praesens: ['verspreche', 'versprichst', 'verspricht', 'versprechen', 'versprecht', 'versprechen'],
    praeteritumStem: 'versprach', partizip2: 'versprochen',
    imperativDu: 'versprich'
  },
  {
    german: 'erlauben', english: 'allow / permit',
    level: 'A2', type: 'regular', case: 'dative+accusative', auxiliary: 'haben',
    praesens: ['erlaube', 'erlaubst', 'erlaubt', 'erlauben', 'erlaubt', 'erlauben'],
    praeteritumStem: 'erlaubte', partizip2: 'erlaubt'
  },
  {
    german: 'erzählen', english: 'tell / narrate',
    level: 'A2', type: 'regular', case: 'dative+accusative', auxiliary: 'haben',
    praesens: ['erzähle', 'erzählst', 'erzählt', 'erzählen', 'erzählt', 'erzählen'],
    praeteritumStem: 'erzählte', partizip2: 'erzählt'
  },
  {
    german: 'schenken', english: 'give (as a gift)',
    level: 'A2', type: 'regular', case: 'dative+accusative', auxiliary: 'haben',
    praesens: ['schenke', 'schenkst', 'schenkt', 'schenken', 'schenkt', 'schenken'],
    praeteritumStem: 'schenkte', partizip2: 'geschenkt'
  },
  {
    german: 'beschreiben', english: 'describe',
    level: 'A2', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['beschreibe', 'beschreibst', 'beschreibt', 'beschreiben', 'beschreibt', 'beschreiben'],
    praeteritumStem: 'beschrieb', partizip2: 'beschrieben'
  },
  {
    german: 'besuchen', english: 'visit',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['besuche', 'besuchst', 'besucht', 'besuchen', 'besucht', 'besuchen'],
    praeteritumStem: 'besuchte', partizip2: 'besucht'
  },
  {
    german: 'üben', english: 'practice',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['übe', 'übst', 'übt', 'üben', 'übt', 'üben'],
    praeteritumStem: 'übte', partizip2: 'geübt'
  },
  {
    german: 'beobachten', english: 'observe',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['beobachte', 'beobachtest', 'beobachtet', 'beobachten', 'beobachtet', 'beobachten'],
    praeteritumStem: 'beobachtete', partizip2: 'beobachtet'
  },
  {
    german: 'bedeuten', english: 'mean',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['bedeute', 'bedeutest', 'bedeutet', 'bedeuten', 'bedeutet', 'bedeuten'],
    praeteritumStem: 'bedeutete', partizip2: 'bedeutet'
  },
  {
    german: 'vermissen', english: 'miss',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['vermisse', 'vermisst', 'vermisst', 'vermissen', 'vermisst', 'vermissen'],
    praeteritumStem: 'vermisste', partizip2: 'vermisst'
  },
  {
    german: 'hassen', english: 'hate',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['hasse', 'hasst', 'hasst', 'hassen', 'hasst', 'hassen'],
    praeteritumStem: 'hasste', partizip2: 'gehasst'
  },
  {
    german: 'klingeln', english: 'ring (a bell)',
    level: 'A2', type: 'regular', case: 'none', auxiliary: 'haben',
    praesens: ['klingle', 'klingelst', 'klingelt', 'klingeln', 'klingelt', 'klingeln'],
    praeteritumStem: 'klingelte', partizip2: 'geklingelt'
  },
  {
    german: 'korrigieren', english: 'correct',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['korrigiere', 'korrigierst', 'korrigiert', 'korrigieren', 'korrigiert', 'korrigieren'],
    praeteritumStem: 'korrigierte', partizip2: 'korrigiert'
  },
  {
    german: 'übersetzen', english: 'translate',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['übersetze', 'übersetzt', 'übersetzt', 'übersetzen', 'übersetzt', 'übersetzen'],
    praeteritumStem: 'übersetzte', partizip2: 'übersetzt'
  },
  {
    german: 'wiederholen', english: 'repeat',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['wiederhole', 'wiederholst', 'wiederholt', 'wiederholen', 'wiederholt', 'wiederholen'],
    praeteritumStem: 'wiederholte', partizip2: 'wiederholt'
  },
  {
    german: 'gehören', english: 'belong to',
    level: 'A2', type: 'regular', case: 'dative', auxiliary: 'haben',
    praesens: ['gehöre', 'gehörst', 'gehört', 'gehören', 'gehört', 'gehören'],
    praeteritumStem: 'gehörte', partizip2: 'gehört',
    notes: '+ dative person'
  },
  {
    german: 'leihen', english: 'lend / borrow',
    level: 'A2', type: 'irregular', case: 'dative+accusative', auxiliary: 'haben',
    praesens: ['leihe', 'leihst', 'leiht', 'leihen', 'leiht', 'leihen'],
    praeteritumStem: 'lieh', partizip2: 'geliehen'
  },
  {
    german: 'malen', english: 'paint',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['male', 'malst', 'malt', 'malen', 'malt', 'malen'],
    praeteritumStem: 'malte', partizip2: 'gemalt'
  },
  {
    german: 'meinen', english: 'think / mean',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['meine', 'meinst', 'meint', 'meinen', 'meint', 'meinen'],
    praeteritumStem: 'meinte', partizip2: 'gemeint'
  },
  {
    german: 'merken', english: 'notice',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['merke', 'merkst', 'merkt', 'merken', 'merkt', 'merken'],
    praeteritumStem: 'merkte', partizip2: 'gemerkt'
  },
  {
    german: 'organisieren', english: 'organize',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['organisiere', 'organisierst', 'organisiert', 'organisieren', 'organisiert', 'organisieren'],
    praeteritumStem: 'organisierte', partizip2: 'organisiert'
  },
  {
    german: 'packen', english: 'pack',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['packe', 'packst', 'packt', 'packen', 'packt', 'packen'],
    praeteritumStem: 'packte', partizip2: 'gepackt'
  },
  {
    german: 'parken', english: 'park',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['parke', 'parkst', 'parkt', 'parken', 'parkt', 'parken'],
    praeteritumStem: 'parkte', partizip2: 'geparkt'
  },
  {
    german: 'planen', english: 'plan',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['plane', 'planst', 'plant', 'planen', 'plant', 'planen'],
    praeteritumStem: 'plante', partizip2: 'geplant'
  },
  {
    german: 'rauchen', english: 'smoke',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['rauche', 'rauchst', 'raucht', 'rauchen', 'raucht', 'rauchen'],
    praeteritumStem: 'rauchte', partizip2: 'geraucht'
  },
  {
    german: 'reisen', english: 'travel',
    level: 'A2', type: 'regular', case: 'none', auxiliary: 'sein',
    praesens: ['reise', 'reist', 'reist', 'reisen', 'reist', 'reisen'],
    praeteritumStem: 'reiste', partizip2: 'gereist'
  },
  {
    german: 'reparieren', english: 'repair',
    level: 'A2', type: 'regular', case: 'accusative', auxiliary: 'haben',
    praesens: ['repariere', 'reparierst', 'repariert', 'reparieren', 'repariert', 'reparieren'],
    praeteritumStem: 'reparierte', partizip2: 'repariert'
  },
  {
    german: 'schicken', english: 'send',
    level: 'A2', type: 'regular', case: 'dative+accusative', auxiliary: 'haben',
    praesens: ['schicke', 'schickst', 'schickt', 'schicken', 'schickt', 'schicken'],
    praeteritumStem: 'schickte', partizip2: 'geschickt'
  },
  {
    german: 'schließen', english: 'close / shut',
    level: 'A2', type: 'irregular', case: 'accusative', auxiliary: 'haben',
    praesens: ['schließe', 'schließt', 'schließt', 'schließen', 'schließt', 'schließen'],
    praeteritumStem: 'schloss', partizip2: 'geschlossen'
  },
  {
    german: 'schneiden', english: 'cut',
    level: 'A2', type: 'mixed', case: 'accusative', auxiliary: 'haben',
    praesens: ['schneide', 'schneidest', 'schneidet', 'schneiden', 'schneidet', 'schneiden'],
    praeteritumStem: 'schnitt', partizip2: 'geschnitten'
  },
  {
    german: 'schreien', english: 'scream / shout',
    level: 'A2', type: 'irregular', case: 'none', auxiliary: 'haben',
    praesens: ['schreie', 'schreist', 'schreit', 'schreien', 'schreit', 'schreien'],
    praeteritumStem: 'schrie', partizip2: 'geschrien'
  },
  {
    german: 'springen', english: 'jump',
    level: 'A2', type: 'irregular', case: 'none', auxiliary: 'sein',
    praesens: ['springe', 'springst', 'springt', 'springen', 'springt', 'springen'],
    praeteritumStem: 'sprang', partizip2: 'gesprungen'
  },

  // ─── A2 separable verbs ──────────────────────────────────────────────
  {
    german: 'vorbereiten', english: 'prepare',
    level: 'A2', type: 'separable', case: 'accusative', auxiliary: 'haben',
    separablePrefix: 'vor',
    praesens: ['bereite vor', 'bereitest vor', 'bereitet vor', 'bereiten vor', 'bereitet vor', 'bereiten vor'],
    praeteritumStem: 'bereitete', partizip2: 'vorbereitet'
  },
  {
    german: 'abnehmen', english: 'lose weight / take off',
    level: 'A2', type: 'separable', case: 'accusative', auxiliary: 'haben',
    separablePrefix: 'ab',
    praesens: ['nehme ab', 'nimmst ab', 'nimmt ab', 'nehmen ab', 'nehmt ab', 'nehmen ab'],
    praeteritumStem: 'nahm', partizip2: 'abgenommen',
    imperativDu: 'nimm'
  },
  {
    german: 'zunehmen', english: 'gain weight / increase',
    level: 'A2', type: 'separable', case: 'none', auxiliary: 'haben',
    separablePrefix: 'zu',
    praesens: ['nehme zu', 'nimmst zu', 'nimmt zu', 'nehmen zu', 'nehmt zu', 'nehmen zu'],
    praeteritumStem: 'nahm', partizip2: 'zugenommen',
    imperativDu: 'nimm'
  },
  {
    german: 'anbieten', english: 'offer',
    level: 'A2', type: 'separable', case: 'dative+accusative', auxiliary: 'haben',
    separablePrefix: 'an',
    praesens: ['biete an', 'bietest an', 'bietet an', 'bieten an', 'bietet an', 'bieten an'],
    praeteritumStem: 'bot', partizip2: 'angeboten'
  },
  {
    german: 'mitbringen', english: 'bring along',
    level: 'A2', type: 'separable', case: 'dative+accusative', auxiliary: 'haben',
    separablePrefix: 'mit',
    praesens: ['bringe mit', 'bringst mit', 'bringt mit', 'bringen mit', 'bringt mit', 'bringen mit'],
    praeteritumStem: 'brachte', partizip2: 'mitgebracht'
  },
  {
    german: 'herstellen', english: 'produce / manufacture',
    level: 'A2', type: 'separable', case: 'accusative', auxiliary: 'haben',
    separablePrefix: 'her',
    praesens: ['stelle her', 'stellst her', 'stellt her', 'stellen her', 'stellt her', 'stellen her'],
    praeteritumStem: 'stellte', partizip2: 'hergestellt'
  },
  {
    german: 'vorschlagen', english: 'suggest / propose',
    level: 'A2', type: 'separable', case: 'dative+accusative', auxiliary: 'haben',
    separablePrefix: 'vor',
    praesens: ['schlage vor', 'schlägst vor', 'schlägt vor', 'schlagen vor', 'schlagt vor', 'schlagen vor'],
    praeteritumStem: 'schlug', partizip2: 'vorgeschlagen',
    imperativDu: 'schlag'
  },
  {
    german: 'einsteigen', english: 'get in / board',
    level: 'A2', type: 'separable', case: 'none', auxiliary: 'sein',
    separablePrefix: 'ein',
    praesens: ['steige ein', 'steigst ein', 'steigt ein', 'steigen ein', 'steigt ein', 'steigen ein'],
    praeteritumStem: 'stieg', partizip2: 'eingestiegen'
  },
  {
    german: 'aussteigen', english: 'get out / disembark',
    level: 'A2', type: 'separable', case: 'none', auxiliary: 'sein',
    separablePrefix: 'aus',
    praesens: ['steige aus', 'steigst aus', 'steigt aus', 'steigen aus', 'steigt aus', 'steigen aus'],
    praeteritumStem: 'stieg', partizip2: 'ausgestiegen'
  },
  {
    german: 'umsteigen', english: 'change (transport)',
    level: 'A2', type: 'separable', case: 'none', auxiliary: 'sein',
    separablePrefix: 'um',
    praesens: ['steige um', 'steigst um', 'steigt um', 'steigen um', 'steigt um', 'steigen um'],
    praeteritumStem: 'stieg', partizip2: 'umgestiegen'
  },

  // ─── A2 reflexive verbs ──────────────────────────────────────────────
  {
    german: 'sich freuen', english: 'be happy / look forward',
    level: 'A2', type: 'regular', case: 'reflexive', auxiliary: 'haben',
    praesens: ['freue', 'freust', 'freut', 'freuen', 'freut', 'freuen'],
    praeteritumStem: 'freute', partizip2: 'gefreut',
    notes: 'reflexive (acc): mich, dich, sich, uns, euch, sich'
  },
  {
    german: 'sich erinnern', english: 'remember',
    level: 'A2', type: 'regular', case: 'reflexive', auxiliary: 'haben',
    praesens: ['erinnere', 'erinnerst', 'erinnert', 'erinnern', 'erinnert', 'erinnern'],
    praeteritumStem: 'erinnerte', partizip2: 'erinnert',
    notes: 'reflexive (acc) + an + accusative'
  },
  {
    german: 'sich entspannen', english: 'relax',
    level: 'A2', type: 'regular', case: 'reflexive', auxiliary: 'haben',
    praesens: ['entspanne', 'entspannst', 'entspannt', 'entspannen', 'entspannt', 'entspannen'],
    praeteritumStem: 'entspannte', partizip2: 'entspannt'
  },
  {
    german: 'sich beschweren', english: 'complain',
    level: 'A2', type: 'regular', case: 'reflexive', auxiliary: 'haben',
    praesens: ['beschwere', 'beschwerst', 'beschwert', 'beschweren', 'beschwert', 'beschweren'],
    praeteritumStem: 'beschwerte', partizip2: 'beschwert',
    notes: 'reflexive (acc) + über + accusative'
  },
  {
    german: 'sich kümmern', english: 'take care of',
    level: 'A2', type: 'regular', case: 'reflexive', auxiliary: 'haben',
    praesens: ['kümmere', 'kümmerst', 'kümmert', 'kümmern', 'kümmert', 'kümmern'],
    praeteritumStem: 'kümmerte', partizip2: 'gekümmert',
    notes: 'reflexive (acc) + um + accusative'
  },
  {
    german: 'sich treffen', english: 'meet (each other)',
    level: 'A2', type: 'irregular', case: 'reflexive', auxiliary: 'haben',
    praesens: ['treffe', 'triffst', 'trifft', 'treffen', 'trefft', 'treffen'],
    praeteritumStem: 'traf', partizip2: 'getroffen',
    imperativDu: 'triff',
    notes: 'reciprocal: wir treffen uns'
  }
]
