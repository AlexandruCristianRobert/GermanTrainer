// Da-compounds (Pronominaladverbien) — formation rules + cheatsheet content.
// A Da-compound stands in for preposition + pronoun when the referent is a thing,
// an abstract, or a whole clause — never a person (see CONTEXT.md: Da-compound).
// Drill data for later phases derives da/wo forms from collocations.ts via these
// transforms; nothing here duplicates the collocation dataset.

export interface DaCompoundEntry {
  preposition: string // the governed preposition, e.g. 'auf'
  gloss: string       // short English sense of the da-form
}

export interface ReferencePair {
  base: string    // the governing expression, e.g. 'warten auf'
  thingQ: string  // sentence with a thing object
  thingA: string  // its da-compound replacement
  personQ: string // sentence with a person object
  personA: string // its preposition + pronoun replacement
}

export interface KorrelatEntry {
  expression: string // pattern, e.g. 'bestehen darauf, dass'
  example: string    // one German example sentence
}

const VOWEL_INITIAL = /^[aeiouäöü]/i

export function isVowelInitial(preposition: string): boolean {
  return VOWEL_INITIAL.test(preposition)
}

/** darauf / dafür — the linking -r- appears before a vowel. */
export function daCompound(preposition: string): string {
  return (isVowelInitial(preposition) ? 'dar' : 'da') + preposition
}

/** worauf / wofür — the interrogative counterpart, same rule. */
export function woCompound(preposition: string): string {
  return (isVowelInitial(preposition) ? 'wor' : 'wo') + preposition
}

/** Prepositions that form NO da-/wo-compound — trap material for drills. */
export const NO_COMPOUND_PREPOSITIONS = [
  'ohne', 'seit', 'außer', 'gegenüber', 'während', 'wegen', 'trotz', 'statt',
] as const

export function canFormCompound(preposition: string): boolean {
  return !(NO_COMPOUND_PREPOSITIONS as readonly string[]).includes(preposition)
}

/** The standard compoundable prepositions, with a short sense for the table. */
export const DA_COMPOUND_PREPOSITIONS: DaCompoundEntry[] = [
  { preposition: 'an',       gloss: 'at / on it — thinking of it' },
  { preposition: 'auf',      gloss: 'on it — awaiting or counting on it' },
  { preposition: 'aus',      gloss: 'out of it — made from it' },
  { preposition: 'bei',      gloss: 'with it — in the process of it' },
  { preposition: 'durch',    gloss: 'through it — thereby' },
  { preposition: 'für',      gloss: 'for it — in favour of it' },
  { preposition: 'gegen',    gloss: 'against it' },
  { preposition: 'hinter',   gloss: 'behind it' },
  { preposition: 'in',       gloss: 'in it — inside it' },
  { preposition: 'mit',      gloss: 'with it' },
  { preposition: 'nach',     gloss: 'after it — seeking it' },
  { preposition: 'neben',    gloss: 'next to it' },
  { preposition: 'über',     gloss: 'about it — above it' },
  { preposition: 'um',       gloss: 'around it — asking for it' },
  { preposition: 'unter',    gloss: 'under it — among them' },
  { preposition: 'von',      gloss: 'of / from it' },
  { preposition: 'vor',      gloss: 'before it — afraid of it' },
  { preposition: 'zu',       gloss: 'to it — in addition to it' },
  { preposition: 'zwischen', gloss: 'between them' },
]

/** Same object, thing vs person — the signature rule of the topic. */
export const THING_VS_PERSON: ReferencePair[] = [
  {
    base: 'warten auf',
    thingQ: 'Ich warte auf den Bus.',
    thingA: 'Ich warte darauf.',
    personQ: 'Ich warte auf meinen Bruder.',
    personA: 'Ich warte auf ihn.',
  },
  {
    base: 'denken an',
    thingQ: 'Sie denkt an die Prüfung.',
    thingA: 'Sie denkt daran.',
    personQ: 'Sie denkt an ihren Freund.',
    personA: 'Sie denkt an ihn.',
  },
  {
    base: 'sprechen über',
    thingQ: 'Wir sprechen über das Wetter.',
    thingA: 'Wir sprechen darüber.',
    personQ: 'Wir sprechen über die Nachbarin.',
    personA: 'Wir sprechen über sie.',
  },
  {
    base: 'träumen von',
    thingQ: 'Er träumt von einem eigenen Haus.',
    thingA: 'Er träumt davon.',
    personQ: 'Er träumt von seiner Großmutter.',
    personA: 'Er träumt von ihr.',
  },
]

/**
 * Korrelat: the da-compound that announces a following dass-/ob-clause or
 * zu-infinitive. Per verb it is obligatory, optional, or wrong (see spec §1.4).
 */
export const KORRELAT: {
  obligatory: KorrelatEntry[]
  optional: KorrelatEntry[]
  excluded: KorrelatEntry[]
} = {
  obligatory: [
    { expression: 'bestehen darauf, dass',        example: 'Er besteht darauf, dass wir pünktlich sind.' },
    { expression: 'es kommt darauf an, ob',       example: 'Es kommt darauf an, ob du Zeit hast.' },
    { expression: 'sich darauf verlassen, dass',  example: 'Ich verlasse mich darauf, dass du kommst.' },
    { expression: 'davon abhängen, ob',           example: 'Es hängt davon ab, ob es regnet.' },
    { expression: 'sich darum kümmern, dass',     example: 'Sie kümmert sich darum, dass alles klappt.' },
  ],
  optional: [
    { expression: 'sich (daran) erinnern, dass',  example: 'Ich erinnere mich (daran), dass wir dort waren.' },
    { expression: 'sich (darüber) freuen, dass',  example: 'Ich freue mich (darüber), dass du da bist.' },
    { expression: 'sich (darauf) freuen, zu …',   example: 'Ich freue mich (darauf), dich zu sehen.' },
    { expression: '(darauf) hoffen, dass',        example: 'Wir hoffen (darauf), dass es klappt.' },
    { expression: '(davon) träumen, zu …',        example: 'Sie träumt (davon), am Meer zu leben.' },
  ],
  excluded: [
    { expression: 'wissen, dass — nie *darüber',      example: 'Ich weiß, dass du recht hast. (nicht: *Ich weiß darüber, dass …)' },
    { expression: 'glauben (= meinen), dass — kein Korrelat', example: 'Ich glaube, dass es morgen regnet. (aber: fest an etwas glauben → Ich glaube daran, dass …)' },
    { expression: 'sagen, dass — nie *darüber',       example: 'Er sagt, dass er müde ist.' },
    { expression: 'denken (= meinen), dass — nie *daran', example: 'Ich denke, dass das eine gute Idee ist.' },
  ],
}
