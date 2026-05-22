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
  {
    german: 'spielen',
    english: 'play',
    level: 'A1',
    type: 'regular',
    case: 'accusative',
    auxiliary: 'haben',
    praesens: ['spiele', 'spielst', 'spielt', 'spielen', 'spielt', 'spielen'],
    praeteritumStem: 'spielte',
    partizip2: 'gespielt'
  },
  {
    german: 'gehen',
    english: 'go / walk',
    level: 'A1',
    type: 'irregular',
    case: 'none',
    auxiliary: 'sein',
    praesens: ['gehe', 'gehst', 'geht', 'gehen', 'geht', 'gehen'],
    praeteritumStem: 'ging',
    partizip2: 'gegangen',
    konjunktiv2: ['ginge', 'gingest', 'ginge', 'gingen', 'ginget', 'gingen']
  },
  {
    german: 'bringen',
    english: 'bring',
    level: 'A1',
    type: 'mixed',
    case: 'dative+accusative',
    auxiliary: 'haben',
    praesens: ['bringe', 'bringst', 'bringt', 'bringen', 'bringt', 'bringen'],
    praeteritumStem: 'brachte',
    partizip2: 'gebracht'
  },
  {
    german: 'aufstehen',
    english: 'get up / stand up',
    level: 'A1',
    type: 'separable',
    case: 'none',
    auxiliary: 'sein',
    separablePrefix: 'auf',
    praesens: ['stehe auf', 'stehst auf', 'steht auf', 'stehen auf', 'steht auf', 'stehen auf'],
    praeteritumStem: 'stand',
    partizip2: 'aufgestanden'
  },
  {
    german: 'können',
    english: 'can / be able to',
    level: 'A1',
    type: 'modal',
    case: 'none',
    auxiliary: 'haben',
    praesens: ['kann', 'kannst', 'kann', 'können', 'könnt', 'können'],
    praeteritumStem: 'konnte',
    partizip2: 'gekonnt',
    konjunktiv2: ['könnte', 'könntest', 'könnte', 'könnten', 'könntet', 'könnten']
  }
]
