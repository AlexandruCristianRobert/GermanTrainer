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
  'Body & Health',
  'Clothing',
  'Nature & Weather',
  'Animals',
  'Transport & Travel',
  'Technology',
  'Sports & Hobbies',
  'Culture & Arts',
  'Time & Numbers',
  'City & Shopping',
  'Fantasy',
  'Switzerland',
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

export type AiProvider = 'gemini' | 'local-claude'

export interface Settings {
  id: 'singleton'
  geminiApiKey: string
  model: string
  aiProvider: AiProvider
}

export const DEFAULT_MODEL = 'gemini-2.5-flash'
