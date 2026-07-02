// src/data/prepCheatsheet.ts
//
// Curated "core idea" cheatsheet for the fixed prepositions (feste Präpositionen).
// This is the mnemonic counterpart to the verb Cheatsheet's grammar rules: it does
// NOT enumerate the ~500 collocations, but groups them by preposition and states the
// dominant SENSE that preposition carries when it is the governed one, with a few
// representative examples per group (see CONTEXT.md → "Fixed-preposition core idea").
//
// Examples are referenced by Collocation id and resolved against collocations.ts, so
// the phrases, glosses and example sentences never drift from the Fixed prepositions
// drill. A test asserts every id listed here exists in COLLOCATIONS.

import { COLLOCATIONS, type Collocation, type CollocationCase } from './collocations'

export interface CheatGroup {
  case: CollocationCase
  /** Sub-idea, shown only when a preposition splits across cases by meaning. */
  idea?: string
  /** Collocation ids to feature, in display order. */
  ids: string[]
}

export interface CheatChapter {
  /** DOM id + ChapterNav target, e.g. "prep-an". */
  id: string
  numeral: string
  /** The preposition itself, e.g. "an". */
  prep: string
  /** One-line headline sense, shown under the chapter title. */
  coreIdea: string
  groups: CheatGroup[]
  /** Optional memory hook, rendered as a callout (author-controlled HTML). */
  hook?: { kind: 'note' | 'exception'; html: string }
}

export const PREP_CHEATSHEET: CheatChapter[] = [
  {
    id: 'prep-an', numeral: 'I', prep: 'an',
    coreIdea: 'Contact and mental fixation — and the case tells you which',
    groups: [
      {
        case: 'accusative', idea: 'reaching toward: thought, belief, memory',
        ids: ['denken-an', 'sich-erinnern-an', 'glauben-an', 'sich-gewoehnen-an', 'sich-wenden-an', 'der-glaube-an'],
      },
      {
        case: 'dative', idea: 'involvement, lack and affliction',
        ids: ['teilnehmen-an', 'arbeiten-an', 'leiden-an', 'sterben-an', 'der-mangel-an', 'interessiert-an'],
      },
    ],
    hook: {
      kind: 'exception',
      html: '<strong>The case is the meaning.</strong> <em>an</em> + Akkusativ points the mind <em>at</em> something — <em>denken an</em>, <em>glauben an</em>, <em>sich erinnern an</em>. <em>an</em> + Dativ marks being <em>involved in</em> or <em>short of</em> something — <em>teilnehmen an</em>, <em>arbeiten an</em>, <em>Mangel an</em>, <em>leiden an</em>.',
    },
  },
  {
    id: 'prep-auf', numeral: 'II', prep: 'auf',
    coreIdea: 'Anticipation and orientation toward a goal',
    groups: [
      {
        case: 'accusative',
        ids: ['warten-auf', 'sich-freuen-auf', 'hoffen-auf', 'achten-auf', 'sich-verlassen-auf', 'stolz-auf', 'die-hoffnung-auf'],
      },
      {
        case: 'dative', idea: 'the static "rest upon / be grounded in" sense',
        ids: ['bestehen-auf', 'beruhen-auf', 'basieren-auf'],
      },
    ],
    hook: {
      kind: 'note',
      html: '<strong>Almost always Akkusativ</strong> — you\'re oriented toward something ahead. Only a handful take Dativ, for the static <em>rest upon / be based on</em> sense: <em>bestehen auf</em>, <em>beruhen auf</em>, <em>basieren auf</em>.',
    },
  },
  {
    id: 'prep-ueber', numeral: 'III', prep: 'über',
    coreIdea: 'The topic you talk, think, or feel about',
    groups: [
      {
        case: 'accusative',
        ids: ['sprechen-ueber', 'diskutieren-ueber', 'sich-freuen-ueber', 'sich-aergern-ueber', 'nachdenken-ueber', 'sich-beschweren-ueber', 'die-diskussion-ueber'],
      },
    ],
    hook: {
      kind: 'note',
      html: 'As a fixed preposition <em>über</em> is <strong>always Akkusativ</strong> — forget the two-way location/motion rule here; the topic never sits still.',
    },
  },
  {
    id: 'prep-fuer', numeral: 'IV', prep: 'für',
    coreIdea: 'Benefit, purpose and taking a stance — always Akkusativ',
    groups: [
      {
        case: 'accusative',
        ids: ['sich-interessieren-fuer', 'sich-entscheiden-fuer', 'danken-fuer', 'sorgen-fuer', 'verantwortlich-fuer', 'dankbar-fuer', 'der-grund-fuer'],
      },
    ],
  },
  {
    id: 'prep-um', numeral: 'V', prep: 'um',
    coreIdea: 'Circling something you want, worry about, or fight for — Akkusativ',
    groups: [
      {
        case: 'accusative',
        ids: ['sich-kuemmern-um', 'bitten-um', 'sich-bewerben-um', 'sich-sorgen-um', 'kaempfen-um', 'die-bitte-um'],
      },
    ],
    hook: {
      kind: 'note',
      html: '<em>sich bewerben</em> is fussy: <em>um</em> a job or position, <em>auf</em> a specific advertised post, <em>bei</em> a company.',
    },
  },
  {
    id: 'prep-nach', numeral: 'VI', prep: 'nach',
    coreIdea: 'Reaching toward and seeking — Dativ',
    groups: [
      {
        case: 'dative',
        ids: ['fragen-nach', 'suchen-nach', 'sich-sehnen-nach', 'riechen-nach', 'schmecken-nach', 'die-suche-nach', 'die-sehnsucht-nach'],
      },
    ],
    hook: {
      kind: 'note',
      html: 'It also covers the senses — what something <em>smells or tastes of</em>: <em>riechen nach</em>, <em>schmecken nach</em>, <em>klingen nach</em>.',
    },
  },
  {
    id: 'prep-von', numeral: 'VII', prep: 'von',
    coreIdea: 'Source, origin and separation — Dativ',
    groups: [
      {
        case: 'dative',
        ids: ['traeumen-von', 'erzaehlen-von', 'abhaengen-von', 'sich-erholen-von', 'sich-verabschieden-von', 'abhaengig-von', 'der-traum-von'],
      },
    ],
  },
  {
    id: 'prep-mit', numeral: 'VIII', prep: 'mit',
    coreIdea: 'Accompaniment and dealing with — Dativ',
    groups: [
      {
        case: 'dative',
        ids: ['sich-beschaeftigen-mit', 'anfangen-mit', 'aufhoeren-mit', 'rechnen-mit', 'sich-treffen-mit', 'zufrieden-mit', 'das-problem-mit'],
      },
    ],
  },
  {
    id: 'prep-vor', numeral: 'IX', prep: 'vor',
    coreIdea: 'What you back away from — fear, threat, and shelter from it. Dativ',
    groups: [
      {
        case: 'dative',
        ids: ['sich-fuerchten-vor', 'warnen-vor', 'schuetzen-vor', 'fliehen-vor', 'die-angst-vor', 'der-respekt-vor', 'sicher-vor'],
      },
    ],
  },
  {
    id: 'prep-zu', numeral: 'X', prep: 'zu',
    coreIdea: 'Relation, purpose and becoming — Dativ',
    groups: [
      {
        case: 'dative',
        ids: ['gehoeren-zu', 'passen-zu', 'fuehren-zu', 'gratulieren-zu', 'einladen-zu', 'bereit-zu', 'die-beziehung-zu'],
      },
    ],
  },
  {
    id: 'prep-gegen', numeral: 'XI', prep: 'gegen',
    coreIdea: 'Pushing against — opposition and resistance. Akkusativ',
    groups: [
      {
        case: 'accusative',
        ids: ['protestieren-gegen', 'kaempfen-gegen', 'sich-wehren-gegen', 'allergisch-gegen', 'immun-gegen', 'der-protest-gegen', 'das-mittel-gegen'],
      },
    ],
    hook: {
      kind: 'note',
      html: 'The body pushes back too: <em>allergisch gegen</em>, <em>immun gegen</em>, <em>ein Mittel gegen</em>.',
    },
  },
  {
    id: 'prep-in', numeral: 'XII', prep: 'in',
    coreIdea: 'Into a new state, or already within one — and the case tells you which',
    groups: [
      {
        case: 'accusative', idea: 'movement into something new',
        ids: ['sich-verlieben-in', 'sich-verwandeln-in', 'geraten-in', 'investieren-in', 'das-vertrauen-in'],
      },
      {
        case: 'dative', idea: 'located within — a skill or a fact',
        ids: ['gut-in', 'geuebt-in', 'bestehen-in', 'sich-irren-in'],
      },
    ],
    hook: {
      kind: 'exception',
      html: '<strong>Two-way logic survives.</strong> <em>in</em> + Akkusativ = moving <em>into</em> a new state — <em>sich verlieben</em>, <em>sich verwandeln</em>, <em>geraten</em>. <em>in</em> + Dativ = already <em>inside</em> one — <em>gut in</em>, <em>bestehen in</em>.',
    },
  },
  {
    id: 'prep-bei', numeral: 'XIII', prep: 'bei',
    coreIdea: 'Help with a task, or the person an action lands on — Dativ',
    groups: [
      {
        case: 'dative',
        ids: ['helfen-bei', 'sich-bedanken-bei', 'sich-entschuldigen-bei', 'sich-beschweren-bei', 'bleiben-bei'],
      },
    ],
  },
  {
    id: 'prep-aus', numeral: 'XIV', prep: 'aus',
    coreIdea: 'What something is made of, or follows from — Dativ',
    groups: [
      {
        case: 'dative',
        ids: ['bestehen-aus', 'entstehen-aus', 'folgen-aus', 'lernen-aus', 'schliessen-aus'],
      },
    ],
  },
  {
    id: 'prep-unter', numeral: 'XV', prep: 'unter',
    coreIdea: 'Under a condition, or under a heading — Dativ',
    groups: [
      {
        case: 'dative',
        ids: ['leiden-unter', 'stehen-unter-druck', 'verstehen-unter', 'sich-vorstellen-unter'],
      },
    ],
    hook: {
      kind: 'exception',
      html: '<strong>leiden an vs leiden unter.</strong> <em>leiden an</em> + Dativ = a disease (<em>an einer Krankheit</em>); <em>leiden unter</em> + Dativ = circumstances — stress, heat, noise.',
    },
  },
]

// id → Collocation lookup, built once. Featured examples resolve through this so the
// cheatsheet always shows exactly the phrasing the drill teaches.
const BY_ID = new Map<string, Collocation>(COLLOCATIONS.map(c => [c.id, c]))

export function collocation(id: string): Collocation | undefined {
  return BY_ID.get(id)
}

/** Every collocation id referenced across the cheatsheet, flattened (for tests). */
export function allCheatsheetIds(): string[] {
  return PREP_CHEATSHEET.flatMap(ch => ch.groups.flatMap(g => g.ids))
}
