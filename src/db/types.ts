export type Gender = 'der' | 'die' | 'das'

export const NOUN_GROUPS = [
  'Office',
  'Work',
  'Furniture',
  'House',
  'Rooms',
  'Family',
  'School',
  'Bank & Money',
  'Food',
  'Other'
] as const

export type NounGroup = (typeof NOUN_GROUPS)[number]

export interface Noun {
  id?: number
  german: string
  gender: Gender
  english: string
  group: NounGroup
  createdAt: number
}

export const ADJECTIVE_GROUPS = [
  'People & Character',
  'Feelings & Emotions',
  'Size & Quantity',
  'Quality & Condition',
  'Time & Sequence',
  'Position & Direction',
  'Health & Body',
  'Food & Taste',
  'Social & Abstract',
  'Actions & Verbs',
  'Other'
] as const

export type AdjectiveGroup = (typeof ADJECTIVE_GROUPS)[number]

export interface Adjective {
  id?: number
  german: string
  english: string
  group: AdjectiveGroup
  createdAt: number
}

export const VERB_LEVELS = ['A1', 'A2'] as const
export type VerbLevel = (typeof VERB_LEVELS)[number]

export const VERB_TYPES = ['regular', 'irregular', 'mixed', 'separable', 'modal'] as const
export type VerbType = (typeof VERB_TYPES)[number]

export type Auxiliary = 'haben' | 'sein'

export const VERB_PERSONS = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'] as const
export type VerbPerson = (typeof VERB_PERSONS)[number]

export const IMPERATIV_PERSONS = ['du', 'ihr', 'Sie'] as const
export type ImperativPerson = (typeof IMPERATIV_PERSONS)[number]

export const VERB_TENSES = [
  'praesens',
  'praeteritum',
  'perfekt',
  'plusquamperfekt',
  'futur1',
  'konjunktiv2',
  'imperativ'
] as const
export type VerbTense = (typeof VERB_TENSES)[number]

export const VERB_TENSE_LABELS: Record<VerbTense, string> = {
  praesens: 'Präsens',
  praeteritum: 'Präteritum',
  perfekt: 'Perfekt',
  plusquamperfekt: 'Plusquamperfekt',
  futur1: 'Futur I',
  konjunktiv2: 'Konjunktiv II',
  imperativ: 'Imperativ'
}

export interface PresentOverride {
  ich: string
  du: string
  er: string
  wir: string
  ihr: string
  sie: string
}

export interface Verb {
  id?: number
  german: string
  english: string
  level: VerbLevel
  type: VerbType
  auxiliary: Auxiliary
  partizip2: string
  separablePrefix?: string
  praesensDuErStem?: string
  praeteritumStem?: string
  konjunktiv2Stem?: string
  imperativDu?: string
  presentOverride?: PresentOverride
  preteritOverride?: PresentOverride
  createdAt: number
}

export interface Settings {
  id: 'singleton'
  geminiApiKey: string
  model: string
}

export const DEFAULT_MODEL = 'gemini-2.5-flash'
