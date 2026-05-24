export type DeclCase = 'nominative' | 'accusative' | 'dative' | 'genitive'
export type DeclGender = 'masculine' | 'feminine' | 'neuter' | 'plural'
export type Determiner = 'definite' | 'indefinite' | 'possessive'
export type Inflection = 'weak' | 'strong' | 'mixed'
export type DeclLevel = 'A1' | 'A2' | 'B1' | 'B2'

export interface DeclensionEntry {
  id: string
  level: DeclLevel
  determiner: Determiner
  gender: DeclGender
  adjective?: string
  noun: string
  possessiveLemma?: string
  forms: Record<DeclCase, string>
  hint?: string
}

export interface ArticleFillEntry {
  id: string
  level: DeclLevel
  case: DeclCase
  gender: DeclGender
  determiner: Determiner
  sentence: string
  blanked: string
  expectedAnswer: string
  alternatives?: string[]
  gloss: string
  caseRationale: string
}

export interface AdjectiveEndingEntry {
  id: string
  level: DeclLevel
  inflection: Inflection
  case: DeclCase
  gender: DeclGender
  preceding: Determiner | 'none'
  sentence: string
  blanked: string
  baseAdjective: string
  expectedAnswer: string
  alternatives?: string[]
  gloss: string
}

export const DECL_CASES = ['nominative', 'accusative', 'dative', 'genitive'] as const
export const DECL_GENDERS = ['masculine', 'feminine', 'neuter', 'plural'] as const
export const DECL_DETERMINERS = ['definite', 'indefinite', 'possessive'] as const
export const DECL_INFLECTIONS = ['weak', 'strong', 'mixed'] as const
export const DECL_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const

export const CASE_LABEL_DE: Record<DeclCase, string> = {
  nominative: 'Nominativ',
  accusative: 'Akkusativ',
  dative: 'Dativ',
  genitive: 'Genitiv'
}

export const GENDER_LABEL: Record<DeclGender, string> = {
  masculine: 'masculine',
  feminine: 'feminine',
  neuter: 'neuter',
  plural: 'plural'
}

// ===========================================================================
// DECLENSION_TABLES: ~30 full case tables across determiner x gender buckets
// ===========================================================================

export const DECLENSION_TABLES: DeclensionEntry[] = [
  // ---- Definite article (4 buckets) ----
  {
    id: 'def-m-tisch',
    level: 'A1',
    determiner: 'definite',
    gender: 'masculine',
    noun: 'Tisch',
    forms: {
      nominative: 'der Tisch',
      accusative: 'den Tisch',
      dative: 'dem Tisch',
      genitive: 'des Tisches'
    },
    hint: 'Masculine nouns add -s or -es in the genitive singular.'
  },
  {
    id: 'def-m-mann',
    level: 'A1',
    determiner: 'definite',
    gender: 'masculine',
    noun: 'Mann',
    forms: {
      nominative: 'der Mann',
      accusative: 'den Mann',
      dative: 'dem Mann',
      genitive: 'des Mannes'
    }
  },
  {
    id: 'def-m-student',
    level: 'A2',
    determiner: 'definite',
    gender: 'masculine',
    noun: 'Student',
    forms: {
      nominative: 'der Student',
      accusative: 'den Studenten',
      dative: 'dem Studenten',
      genitive: 'des Studenten'
    },
    hint: 'Weak masculine noun: takes -en in all cases except the nominative singular.'
  },
  {
    id: 'def-f-frau',
    level: 'A1',
    determiner: 'definite',
    gender: 'feminine',
    noun: 'Frau',
    forms: {
      nominative: 'die Frau',
      accusative: 'die Frau',
      dative: 'der Frau',
      genitive: 'der Frau'
    },
    hint: 'Feminine nouns are unchanged in the singular — only the article shifts.'
  },
  {
    id: 'def-f-schule',
    level: 'A1',
    determiner: 'definite',
    gender: 'feminine',
    noun: 'Schule',
    forms: {
      nominative: 'die Schule',
      accusative: 'die Schule',
      dative: 'der Schule',
      genitive: 'der Schule'
    }
  },
  {
    id: 'def-n-buch',
    level: 'A1',
    determiner: 'definite',
    gender: 'neuter',
    noun: 'Buch',
    forms: {
      nominative: 'das Buch',
      accusative: 'das Buch',
      dative: 'dem Buch',
      genitive: 'des Buches'
    }
  },
  {
    id: 'def-n-haus',
    level: 'A1',
    determiner: 'definite',
    gender: 'neuter',
    noun: 'Haus',
    forms: {
      nominative: 'das Haus',
      accusative: 'das Haus',
      dative: 'dem Haus',
      genitive: 'des Hauses'
    }
  },
  {
    id: 'def-n-kind',
    level: 'A1',
    determiner: 'definite',
    gender: 'neuter',
    noun: 'Kind',
    forms: {
      nominative: 'das Kind',
      accusative: 'das Kind',
      dative: 'dem Kind',
      genitive: 'des Kindes'
    }
  },
  {
    id: 'def-pl-kinder',
    level: 'A1',
    determiner: 'definite',
    gender: 'plural',
    noun: 'Kinder',
    forms: {
      nominative: 'die Kinder',
      accusative: 'die Kinder',
      dative: 'den Kindern',
      genitive: 'der Kinder'
    },
    hint: 'Plural dative takes -n on the noun (unless it already ends in -n or -s).'
  },
  {
    id: 'def-pl-bücher',
    level: 'A2',
    determiner: 'definite',
    gender: 'plural',
    noun: 'Bücher',
    forms: {
      nominative: 'die Bücher',
      accusative: 'die Bücher',
      dative: 'den Büchern',
      genitive: 'der Bücher'
    }
  },
  {
    id: 'def-pl-autos',
    level: 'A2',
    determiner: 'definite',
    gender: 'plural',
    noun: 'Autos',
    forms: {
      nominative: 'die Autos',
      accusative: 'die Autos',
      dative: 'den Autos',
      genitive: 'der Autos'
    },
    hint: 'Plurals already ending in -s do not add the dative -n.'
  },

  // ---- Indefinite article (3 buckets — no plural) ----
  {
    id: 'indef-m-mann',
    level: 'A1',
    determiner: 'indefinite',
    gender: 'masculine',
    noun: 'Mann',
    forms: {
      nominative: 'ein Mann',
      accusative: 'einen Mann',
      dative: 'einem Mann',
      genitive: 'eines Mannes'
    }
  },
  {
    id: 'indef-m-hund',
    level: 'A1',
    determiner: 'indefinite',
    gender: 'masculine',
    noun: 'Hund',
    forms: {
      nominative: 'ein Hund',
      accusative: 'einen Hund',
      dative: 'einem Hund',
      genitive: 'eines Hundes'
    }
  },
  {
    id: 'indef-m-junge',
    level: 'A2',
    determiner: 'indefinite',
    gender: 'masculine',
    noun: 'Junge',
    forms: {
      nominative: 'ein Junge',
      accusative: 'einen Jungen',
      dative: 'einem Jungen',
      genitive: 'eines Jungen'
    },
    hint: 'Weak masculine noun: takes -n in all cases except the nominative singular.'
  },
  {
    id: 'indef-f-frau',
    level: 'A1',
    determiner: 'indefinite',
    gender: 'feminine',
    noun: 'Frau',
    forms: {
      nominative: 'eine Frau',
      accusative: 'eine Frau',
      dative: 'einer Frau',
      genitive: 'einer Frau'
    }
  },
  {
    id: 'indef-f-lampe',
    level: 'A1',
    determiner: 'indefinite',
    gender: 'feminine',
    noun: 'Lampe',
    forms: {
      nominative: 'eine Lampe',
      accusative: 'eine Lampe',
      dative: 'einer Lampe',
      genitive: 'einer Lampe'
    }
  },
  {
    id: 'indef-f-blume',
    level: 'A1',
    determiner: 'indefinite',
    gender: 'feminine',
    noun: 'Blume',
    forms: {
      nominative: 'eine Blume',
      accusative: 'eine Blume',
      dative: 'einer Blume',
      genitive: 'einer Blume'
    }
  },
  {
    id: 'indef-n-haus',
    level: 'A1',
    determiner: 'indefinite',
    gender: 'neuter',
    noun: 'Haus',
    forms: {
      nominative: 'ein Haus',
      accusative: 'ein Haus',
      dative: 'einem Haus',
      genitive: 'eines Hauses'
    }
  },
  {
    id: 'indef-n-auto',
    level: 'A1',
    determiner: 'indefinite',
    gender: 'neuter',
    noun: 'Auto',
    forms: {
      nominative: 'ein Auto',
      accusative: 'ein Auto',
      dative: 'einem Auto',
      genitive: 'eines Autos'
    }
  },

  // ---- Possessive determiners (4 buckets, varied lemmas) ----
  {
    id: 'poss-m-bruder-mein',
    level: 'A1',
    determiner: 'possessive',
    gender: 'masculine',
    possessiveLemma: 'mein',
    noun: 'Bruder',
    forms: {
      nominative: 'mein Bruder',
      accusative: 'meinen Bruder',
      dative: 'meinem Bruder',
      genitive: 'meines Bruders'
    },
    hint: 'Possessives take the same endings as the indefinite article.'
  },
  {
    id: 'poss-m-vater-dein',
    level: 'A1',
    determiner: 'possessive',
    gender: 'masculine',
    possessiveLemma: 'dein',
    noun: 'Vater',
    forms: {
      nominative: 'dein Vater',
      accusative: 'deinen Vater',
      dative: 'deinem Vater',
      genitive: 'deines Vaters'
    }
  },
  {
    id: 'poss-m-sohn-ihr',
    level: 'A2',
    determiner: 'possessive',
    gender: 'masculine',
    possessiveLemma: 'ihr',
    noun: 'Sohn',
    forms: {
      nominative: 'ihr Sohn',
      accusative: 'ihren Sohn',
      dative: 'ihrem Sohn',
      genitive: 'ihres Sohnes'
    }
  },
  {
    id: 'poss-f-schwester-mein',
    level: 'A1',
    determiner: 'possessive',
    gender: 'feminine',
    possessiveLemma: 'mein',
    noun: 'Schwester',
    forms: {
      nominative: 'meine Schwester',
      accusative: 'meine Schwester',
      dative: 'meiner Schwester',
      genitive: 'meiner Schwester'
    }
  },
  {
    id: 'poss-f-mutter-sein',
    level: 'A1',
    determiner: 'possessive',
    gender: 'feminine',
    possessiveLemma: 'sein',
    noun: 'Mutter',
    forms: {
      nominative: 'seine Mutter',
      accusative: 'seine Mutter',
      dative: 'seiner Mutter',
      genitive: 'seiner Mutter'
    }
  },
  {
    id: 'poss-f-tasche-unser',
    level: 'A2',
    determiner: 'possessive',
    gender: 'feminine',
    possessiveLemma: 'unser',
    noun: 'Tasche',
    forms: {
      nominative: 'unsere Tasche',
      accusative: 'unsere Tasche',
      dative: 'unserer Tasche',
      genitive: 'unserer Tasche'
    }
  },
  {
    id: 'poss-n-haus-mein',
    level: 'A1',
    determiner: 'possessive',
    gender: 'neuter',
    possessiveLemma: 'mein',
    noun: 'Haus',
    forms: {
      nominative: 'mein Haus',
      accusative: 'mein Haus',
      dative: 'meinem Haus',
      genitive: 'meines Hauses'
    }
  },
  {
    id: 'poss-n-auto-euer',
    level: 'A2',
    determiner: 'possessive',
    gender: 'neuter',
    possessiveLemma: 'euer',
    noun: 'Auto',
    forms: {
      nominative: 'euer Auto',
      accusative: 'euer Auto',
      dative: 'eurem Auto',
      genitive: 'eures Autos'
    },
    hint: '"euer" drops the second "e" when an ending is added: eure, eurem, eures.'
  },
  {
    id: 'poss-pl-eltern-mein',
    level: 'A1',
    determiner: 'possessive',
    gender: 'plural',
    possessiveLemma: 'mein',
    noun: 'Eltern',
    forms: {
      nominative: 'meine Eltern',
      accusative: 'meine Eltern',
      dative: 'meinen Eltern',
      genitive: 'meiner Eltern'
    },
    hint: 'In the plural, possessives take the same endings as the definite article: meine / meine / meinen / meiner.'
  },
  {
    id: 'poss-pl-freunde-dein',
    level: 'A2',
    determiner: 'possessive',
    gender: 'plural',
    possessiveLemma: 'dein',
    noun: 'Freunde',
    forms: {
      nominative: 'deine Freunde',
      accusative: 'deine Freunde',
      dative: 'deinen Freunden',
      genitive: 'deiner Freunde'
    }
  },
  {
    id: 'poss-pl-bücher-ihr',
    level: 'B1',
    determiner: 'possessive',
    gender: 'plural',
    possessiveLemma: 'ihr',
    noun: 'Bücher',
    forms: {
      nominative: 'ihre Bücher',
      accusative: 'ihre Bücher',
      dative: 'ihren Büchern',
      genitive: 'ihrer Bücher'
    }
  }
]

// ===========================================================================
// ARTICLE_FILL_ENTRIES: ~80 sentences testing article forms
// Constraint: blanked has exactly one "___",
//   sentence === blanked.replace('___', expectedAnswer),
//   expectedAnswer appears exactly once in the sentence string.
// ===========================================================================

export const ARTICLE_FILL_ENTRIES: ArticleFillEntry[] = [
  // -------------------- NOMINATIVE (~20) --------------------
  {
    id: 'art-nom-m-001',
    level: 'A1',
    case: 'nominative',
    gender: 'masculine',
    determiner: 'definite',
    sentence: 'Der Hund schläft.',
    blanked: '___ Hund schläft.',
    expectedAnswer: 'Der',
    alternatives: ['der'],
    gloss: 'The dog is sleeping.',
    caseRationale: 'Nominativ: subject of schlafen.'
  },
  {
    id: 'art-nom-m-002',
    level: 'A1',
    case: 'nominative',
    gender: 'masculine',
    determiner: 'definite',
    sentence: 'Der Lehrer kommt heute.',
    blanked: '___ Lehrer kommt heute.',
    expectedAnswer: 'Der',
    alternatives: ['der'],
    gloss: 'The teacher is coming today.',
    caseRationale: 'Nominativ: subject of kommen.'
  },
  {
    id: 'art-nom-m-003',
    level: 'A1',
    case: 'nominative',
    gender: 'masculine',
    determiner: 'indefinite',
    sentence: 'Ein Junge spielt im Garten.',
    blanked: '___ Junge spielt im Garten.',
    expectedAnswer: 'Ein',
    alternatives: ['ein'],
    gloss: 'A boy is playing in the garden.',
    caseRationale: 'Nominativ: subject of spielen.'
  },
  {
    id: 'art-nom-m-004',
    level: 'A1',
    case: 'nominative',
    gender: 'masculine',
    determiner: 'possessive',
    sentence: 'Mein Vater arbeitet viel.',
    blanked: '___ Vater arbeitet viel.',
    expectedAnswer: 'Mein',
    alternatives: ['mein'],
    gloss: 'My father works a lot.',
    caseRationale: 'Nominativ: subject of arbeiten.'
  },
  {
    id: 'art-nom-f-001',
    level: 'A1',
    case: 'nominative',
    gender: 'feminine',
    determiner: 'definite',
    sentence: 'Die Frau liest ein Buch.',
    blanked: '___ Frau liest ein Buch.',
    expectedAnswer: 'Die',
    alternatives: ['die'],
    gloss: 'The woman is reading a book.',
    caseRationale: 'Nominativ: subject of lesen.'
  },
  {
    id: 'art-nom-f-002',
    level: 'A1',
    case: 'nominative',
    gender: 'feminine',
    determiner: 'definite',
    sentence: 'Die Schule beginnt um acht.',
    blanked: '___ Schule beginnt um acht.',
    expectedAnswer: 'Die',
    alternatives: ['die'],
    gloss: 'School begins at eight.',
    caseRationale: 'Nominativ: subject of beginnen.'
  },
  {
    id: 'art-nom-f-003',
    level: 'A1',
    case: 'nominative',
    gender: 'feminine',
    determiner: 'indefinite',
    sentence: 'Eine Katze sitzt auf dem Sofa.',
    blanked: '___ Katze sitzt auf dem Sofa.',
    expectedAnswer: 'Eine',
    alternatives: ['eine'],
    gloss: 'A cat sits on the sofa.',
    caseRationale: 'Nominativ: subject of sitzen.'
  },
  {
    id: 'art-nom-f-004',
    level: 'A1',
    case: 'nominative',
    gender: 'feminine',
    determiner: 'possessive',
    sentence: 'Meine Schwester wohnt in Berlin.',
    blanked: '___ Schwester wohnt in Berlin.',
    expectedAnswer: 'Meine',
    alternatives: ['meine'],
    gloss: 'My sister lives in Berlin.',
    caseRationale: 'Nominativ: subject of wohnen.'
  },
  {
    id: 'art-nom-f-005',
    level: 'A1',
    case: 'nominative',
    gender: 'feminine',
    determiner: 'possessive',
    sentence: 'Deine Tasche liegt dort.',
    blanked: '___ Tasche liegt dort.',
    expectedAnswer: 'Deine',
    alternatives: ['deine'],
    gloss: 'Your bag is lying there.',
    caseRationale: 'Nominativ: subject of liegen.'
  },
  {
    id: 'art-nom-n-001',
    level: 'A1',
    case: 'nominative',
    gender: 'neuter',
    determiner: 'definite',
    sentence: 'Das Kind lacht laut.',
    blanked: '___ Kind lacht laut.',
    expectedAnswer: 'Das',
    alternatives: ['das'],
    gloss: 'The child laughs loudly.',
    caseRationale: 'Nominativ: subject of lachen.'
  },
  {
    id: 'art-nom-n-002',
    level: 'A1',
    case: 'nominative',
    gender: 'neuter',
    determiner: 'definite',
    sentence: 'Das Auto steht vor der Tür.',
    blanked: '___ Auto steht vor der Tür.',
    expectedAnswer: 'Das',
    alternatives: ['das'],
    gloss: 'The car is in front of the door.',
    caseRationale: 'Nominativ: subject of stehen.'
  },
  {
    id: 'art-nom-n-003',
    level: 'A1',
    case: 'nominative',
    gender: 'neuter',
    determiner: 'indefinite',
    sentence: 'Ein Buch liegt auf dem Tisch.',
    blanked: '___ Buch liegt auf dem Tisch.',
    expectedAnswer: 'Ein',
    alternatives: ['ein'],
    gloss: 'A book is lying on the table.',
    caseRationale: 'Nominativ: subject of liegen.'
  },
  {
    id: 'art-nom-n-004',
    level: 'A1',
    case: 'nominative',
    gender: 'neuter',
    determiner: 'possessive',
    sentence: 'Sein Haus ist groß.',
    blanked: '___ Haus ist groß.',
    expectedAnswer: 'Sein',
    alternatives: ['sein'],
    gloss: 'His house is big.',
    caseRationale: 'Nominativ: subject of sein (linking verb).'
  },
  {
    id: 'art-nom-pl-001',
    level: 'A1',
    case: 'nominative',
    gender: 'plural',
    determiner: 'definite',
    sentence: 'Die Kinder spielen im Park.',
    blanked: '___ Kinder spielen im Park.',
    expectedAnswer: 'Die',
    alternatives: ['die'],
    gloss: 'The children are playing in the park.',
    caseRationale: 'Nominativ: subject of spielen.'
  },
  {
    id: 'art-nom-pl-002',
    level: 'A1',
    case: 'nominative',
    gender: 'plural',
    determiner: 'possessive',
    sentence: 'Meine Eltern wohnen in Hamburg.',
    blanked: '___ Eltern wohnen in Hamburg.',
    expectedAnswer: 'Meine',
    alternatives: ['meine'],
    gloss: 'My parents live in Hamburg.',
    caseRationale: 'Nominativ: subject of wohnen.'
  },
  {
    id: 'art-nom-m-005',
    level: 'A2',
    case: 'nominative',
    gender: 'masculine',
    determiner: 'definite',
    sentence: 'Der Zug fährt pünktlich ab.',
    blanked: '___ Zug fährt pünktlich ab.',
    expectedAnswer: 'Der',
    alternatives: ['der'],
    gloss: 'The train departs on time.',
    caseRationale: 'Nominativ: subject of abfahren.'
  },
  {
    id: 'art-nom-f-006',
    level: 'A2',
    case: 'nominative',
    gender: 'feminine',
    determiner: 'indefinite',
    sentence: 'Eine Blume blüht im Garten.',
    blanked: '___ Blume blüht im Garten.',
    expectedAnswer: 'Eine',
    alternatives: ['eine'],
    gloss: 'A flower is blooming in the garden.',
    caseRationale: 'Nominativ: subject of blühen.'
  },
  {
    id: 'art-nom-n-005',
    level: 'A2',
    case: 'nominative',
    gender: 'neuter',
    determiner: 'possessive',
    sentence: 'Unser Hotel liegt am Strand.',
    blanked: '___ Hotel liegt am Strand.',
    expectedAnswer: 'Unser',
    alternatives: ['unser'],
    gloss: 'Our hotel is at the beach.',
    caseRationale: 'Nominativ: subject of liegen.'
  },
  {
    id: 'art-nom-m-006',
    level: 'A2',
    case: 'nominative',
    gender: 'masculine',
    determiner: 'indefinite',
    sentence: 'Ein Schlüssel passt nicht.',
    blanked: '___ Schlüssel passt nicht.',
    expectedAnswer: 'Ein',
    alternatives: ['ein'],
    gloss: 'A key does not fit.',
    caseRationale: 'Nominativ: subject of passen.'
  },
  {
    id: 'art-nom-pl-003',
    level: 'A2',
    case: 'nominative',
    gender: 'plural',
    determiner: 'definite',
    sentence: 'Die Bücher gehören mir.',
    blanked: '___ Bücher gehören mir.',
    expectedAnswer: 'Die',
    alternatives: ['die'],
    gloss: 'The books belong to me.',
    caseRationale: 'Nominativ: subject of gehören.'
  },

  // -------------------- ACCUSATIVE (~20) --------------------
  {
    id: 'art-acc-m-001',
    level: 'A1',
    case: 'accusative',
    gender: 'masculine',
    determiner: 'definite',
    sentence: 'Ich sehe den Hund.',
    blanked: 'Ich sehe ___ Hund.',
    expectedAnswer: 'den',
    gloss: 'I see the dog.',
    caseRationale: 'Akkusativ: direct object of sehen.'
  },
  {
    id: 'art-acc-m-002',
    level: 'A1',
    case: 'accusative',
    gender: 'masculine',
    determiner: 'definite',
    sentence: 'Sie fragt den Lehrer.',
    blanked: 'Sie fragt ___ Lehrer.',
    expectedAnswer: 'den',
    gloss: 'She asks the teacher.',
    caseRationale: 'Akkusativ: direct object of fragen.'
  },
  {
    id: 'art-acc-m-003',
    level: 'A1',
    case: 'accusative',
    gender: 'masculine',
    determiner: 'indefinite',
    sentence: 'Wir kaufen einen Tisch.',
    blanked: 'Wir kaufen ___ Tisch.',
    expectedAnswer: 'einen',
    gloss: 'We are buying a table.',
    caseRationale: 'Akkusativ: direct object of kaufen.'
  },
  {
    id: 'art-acc-m-004',
    level: 'A1',
    case: 'accusative',
    gender: 'masculine',
    determiner: 'possessive',
    sentence: 'Ich besuche meinen Onkel.',
    blanked: 'Ich besuche ___ Onkel.',
    expectedAnswer: 'meinen',
    gloss: 'I visit my uncle.',
    caseRationale: 'Akkusativ: direct object of besuchen.'
  },
  {
    id: 'art-acc-f-001',
    level: 'A1',
    case: 'accusative',
    gender: 'feminine',
    determiner: 'definite',
    sentence: 'Er liest die Zeitung.',
    blanked: 'Er liest ___ Zeitung.',
    expectedAnswer: 'die',
    gloss: 'He reads the newspaper.',
    caseRationale: 'Akkusativ: direct object of lesen.'
  },
  {
    id: 'art-acc-f-002',
    level: 'A1',
    case: 'accusative',
    gender: 'feminine',
    determiner: 'indefinite',
    sentence: 'Ich brauche eine Pause.',
    blanked: 'Ich brauche ___ Pause.',
    expectedAnswer: 'eine',
    gloss: 'I need a break.',
    caseRationale: 'Akkusativ: direct object of brauchen.'
  },
  {
    id: 'art-acc-f-003',
    level: 'A1',
    case: 'accusative',
    gender: 'feminine',
    determiner: 'indefinite',
    sentence: 'Sie hat eine Frage.',
    blanked: 'Sie hat ___ Frage.',
    expectedAnswer: 'eine',
    gloss: 'She has a question.',
    caseRationale: 'Akkusativ: direct object of haben.'
  },
  {
    id: 'art-acc-f-004',
    level: 'A1',
    case: 'accusative',
    gender: 'feminine',
    determiner: 'possessive',
    sentence: 'Ich liebe meine Familie.',
    blanked: 'Ich liebe ___ Familie.',
    expectedAnswer: 'meine',
    gloss: 'I love my family.',
    caseRationale: 'Akkusativ: direct object of lieben.'
  },
  {
    id: 'art-acc-n-001',
    level: 'A1',
    case: 'accusative',
    gender: 'neuter',
    determiner: 'definite',
    sentence: 'Sie öffnet das Fenster.',
    blanked: 'Sie öffnet ___ Fenster.',
    expectedAnswer: 'das',
    gloss: 'She opens the window.',
    caseRationale: 'Akkusativ: direct object of öffnen.'
  },
  {
    id: 'art-acc-n-002',
    level: 'A1',
    case: 'accusative',
    gender: 'neuter',
    determiner: 'definite',
    sentence: 'Ich esse das Brot.',
    blanked: 'Ich esse ___ Brot.',
    expectedAnswer: 'das',
    gloss: 'I am eating the bread.',
    caseRationale: 'Akkusativ: direct object of essen.'
  },
  {
    id: 'art-acc-n-003',
    level: 'A1',
    case: 'accusative',
    gender: 'neuter',
    determiner: 'indefinite',
    sentence: 'Er kauft ein Auto.',
    blanked: 'Er kauft ___ Auto.',
    expectedAnswer: 'ein',
    gloss: 'He buys a car.',
    caseRationale: 'Akkusativ: direct object of kaufen.'
  },
  {
    id: 'art-acc-n-004',
    level: 'A1',
    case: 'accusative',
    gender: 'neuter',
    determiner: 'possessive',
    sentence: 'Sie sucht ihr Handy.',
    blanked: 'Sie sucht ___ Handy.',
    expectedAnswer: 'ihr',
    gloss: 'She is looking for her phone.',
    caseRationale: 'Akkusativ: direct object of suchen.'
  },
  {
    id: 'art-acc-pl-001',
    level: 'A1',
    case: 'accusative',
    gender: 'plural',
    determiner: 'definite',
    sentence: 'Ich rufe die Freunde an.',
    blanked: 'Ich rufe ___ Freunde an.',
    expectedAnswer: 'die',
    gloss: 'I am calling the friends.',
    caseRationale: 'Akkusativ: direct object of anrufen.'
  },
  {
    id: 'art-acc-pl-002',
    level: 'A1',
    case: 'accusative',
    gender: 'plural',
    determiner: 'possessive',
    sentence: 'Er besucht seine Großeltern.',
    blanked: 'Er besucht ___ Großeltern.',
    expectedAnswer: 'seine',
    gloss: 'He visits his grandparents.',
    caseRationale: 'Akkusativ: direct object of besuchen.'
  },
  {
    id: 'art-acc-m-005',
    level: 'A2',
    case: 'accusative',
    gender: 'masculine',
    determiner: 'definite',
    sentence: 'Wir treffen den Direktor.',
    blanked: 'Wir treffen ___ Direktor.',
    expectedAnswer: 'den',
    gloss: 'We are meeting the director.',
    caseRationale: 'Akkusativ: direct object of treffen.'
  },
  {
    id: 'art-acc-f-005',
    level: 'A2',
    case: 'accusative',
    gender: 'feminine',
    determiner: 'definite',
    sentence: 'Ich höre die Musik gern.',
    blanked: 'Ich höre ___ Musik gern.',
    expectedAnswer: 'die',
    gloss: 'I like to listen to the music.',
    caseRationale: 'Akkusativ: direct object of hören.'
  },
  {
    id: 'art-acc-n-005',
    level: 'A2',
    case: 'accusative',
    gender: 'neuter',
    determiner: 'indefinite',
    sentence: 'Sie schreibt ein Gedicht.',
    blanked: 'Sie schreibt ___ Gedicht.',
    expectedAnswer: 'ein',
    gloss: 'She is writing a poem.',
    caseRationale: 'Akkusativ: direct object of schreiben.'
  },
  {
    id: 'art-acc-m-006',
    level: 'A2',
    case: 'accusative',
    gender: 'masculine',
    determiner: 'possessive',
    sentence: 'Ich putze meinen Schreibtisch.',
    blanked: 'Ich putze ___ Schreibtisch.',
    expectedAnswer: 'meinen',
    gloss: 'I am cleaning my desk.',
    caseRationale: 'Akkusativ: direct object of putzen.'
  },
  {
    id: 'art-acc-f-006',
    level: 'A2',
    case: 'accusative',
    gender: 'feminine',
    determiner: 'possessive',
    sentence: 'Er vergisst seine Jacke.',
    blanked: 'Er vergisst ___ Jacke.',
    expectedAnswer: 'seine',
    gloss: 'He forgets his jacket.',
    caseRationale: 'Akkusativ: direct object of vergessen.'
  },
  {
    id: 'art-acc-pl-003',
    level: 'A2',
    case: 'accusative',
    gender: 'plural',
    determiner: 'definite',
    sentence: 'Ich kaufe die Blumen morgen.',
    blanked: 'Ich kaufe ___ Blumen morgen.',
    expectedAnswer: 'die',
    gloss: 'I will buy the flowers tomorrow.',
    caseRationale: 'Akkusativ: direct object of kaufen.'
  },

  // -------------------- DATIVE (~25) --------------------
  {
    id: 'art-dat-m-001',
    level: 'A1',
    case: 'dative',
    gender: 'masculine',
    determiner: 'definite',
    sentence: 'Ich gebe dem Mann das Buch.',
    blanked: 'Ich gebe ___ Mann das Buch.',
    expectedAnswer: 'dem',
    gloss: 'I give the book to the man.',
    caseRationale: 'Dativ: indirect object of geben (recipient).'
  },
  {
    id: 'art-dat-m-002',
    level: 'A1',
    case: 'dative',
    gender: 'masculine',
    determiner: 'definite',
    sentence: 'Sie hilft dem Bruder gern.',
    blanked: 'Sie hilft ___ Bruder gern.',
    expectedAnswer: 'dem',
    gloss: 'She gladly helps the brother.',
    caseRationale: 'Dativ: helfen always governs the dative.'
  },
  {
    id: 'art-dat-m-003',
    level: 'A1',
    case: 'dative',
    gender: 'masculine',
    determiner: 'definite',
    sentence: 'Wir danken dem Lehrer herzlich.',
    blanked: 'Wir danken ___ Lehrer herzlich.',
    expectedAnswer: 'dem',
    gloss: 'We thank the teacher warmly.',
    caseRationale: 'Dativ: danken governs the dative.'
  },
  {
    id: 'art-dat-m-004',
    level: 'A1',
    case: 'dative',
    gender: 'masculine',
    determiner: 'indefinite',
    sentence: 'Er hilft einem Freund beim Umzug.',
    blanked: 'Er hilft ___ Freund beim Umzug.',
    expectedAnswer: 'einem',
    gloss: 'He helps a friend with the move.',
    caseRationale: 'Dativ: helfen governs the dative.'
  },
  {
    id: 'art-dat-m-005',
    level: 'A1',
    case: 'dative',
    gender: 'masculine',
    determiner: 'possessive',
    sentence: 'Ich schreibe meinem Vater eine E-Mail.',
    blanked: 'Ich schreibe ___ Vater eine E-Mail.',
    expectedAnswer: 'meinem',
    gloss: 'I am writing my father an email.',
    caseRationale: 'Dativ: indirect object of schreiben (recipient).'
  },
  {
    id: 'art-dat-m-006',
    level: 'A2',
    case: 'dative',
    gender: 'masculine',
    determiner: 'possessive',
    sentence: 'Er antwortet seinem Chef sofort.',
    blanked: 'Er antwortet ___ Chef sofort.',
    expectedAnswer: 'seinem',
    gloss: 'He answers his boss immediately.',
    caseRationale: 'Dativ: antworten governs the dative.'
  },
  {
    id: 'art-dat-f-001',
    level: 'A1',
    case: 'dative',
    gender: 'feminine',
    determiner: 'definite',
    sentence: 'Ich gebe der Frau einen Apfel.',
    blanked: 'Ich gebe ___ Frau einen Apfel.',
    expectedAnswer: 'der',
    gloss: 'I give the woman an apple.',
    caseRationale: 'Dativ: indirect object of geben (recipient).'
  },
  {
    id: 'art-dat-f-002',
    level: 'A1',
    case: 'dative',
    gender: 'feminine',
    determiner: 'definite',
    sentence: 'Er hilft der Mutter beim Kochen.',
    blanked: 'Er hilft ___ Mutter beim Kochen.',
    expectedAnswer: 'der',
    gloss: 'He helps the mother with cooking.',
    caseRationale: 'Dativ: helfen governs the dative.'
  },
  {
    id: 'art-dat-f-003',
    level: 'A1',
    case: 'dative',
    gender: 'feminine',
    determiner: 'definite',
    sentence: 'Ich folge der Anleitung genau.',
    blanked: 'Ich folge ___ Anleitung genau.',
    expectedAnswer: 'der',
    gloss: 'I follow the instructions exactly.',
    caseRationale: 'Dativ: folgen governs the dative.'
  },
  {
    id: 'art-dat-f-004',
    level: 'A2',
    case: 'dative',
    gender: 'feminine',
    determiner: 'indefinite',
    sentence: 'Sie spricht mit einer Kollegin.',
    blanked: 'Sie spricht mit ___ Kollegin.',
    expectedAnswer: 'einer',
    gloss: 'She is talking with a colleague.',
    caseRationale: 'Dativ: mit always governs the dative.'
  },
  {
    id: 'art-dat-f-005',
    level: 'A1',
    case: 'dative',
    gender: 'feminine',
    determiner: 'possessive',
    sentence: 'Ich helfe meiner Schwester oft.',
    blanked: 'Ich helfe ___ Schwester oft.',
    expectedAnswer: 'meiner',
    gloss: 'I often help my sister.',
    caseRationale: 'Dativ: helfen governs the dative.'
  },
  {
    id: 'art-dat-f-006',
    level: 'A2',
    case: 'dative',
    gender: 'feminine',
    determiner: 'possessive',
    sentence: 'Er bringt seiner Freundin Blumen.',
    blanked: 'Er bringt ___ Freundin Blumen.',
    expectedAnswer: 'seiner',
    gloss: 'He brings his girlfriend flowers.',
    caseRationale: 'Dativ: indirect object of bringen (recipient).'
  },
  {
    id: 'art-dat-n-001',
    level: 'A1',
    case: 'dative',
    gender: 'neuter',
    determiner: 'definite',
    sentence: 'Wir spielen mit dem Kind im Park.',
    blanked: 'Wir spielen mit ___ Kind im Park.',
    expectedAnswer: 'dem',
    gloss: 'We are playing with the child in the park.',
    caseRationale: 'Dativ: mit always governs the dative.'
  },
  {
    id: 'art-dat-n-002',
    level: 'A1',
    case: 'dative',
    gender: 'neuter',
    determiner: 'definite',
    sentence: 'Sie liest aus dem Buch laut vor.',
    blanked: 'Sie liest aus ___ Buch laut vor.',
    expectedAnswer: 'dem',
    gloss: 'She reads aloud from the book.',
    caseRationale: 'Dativ: aus always governs the dative.'
  },
  {
    id: 'art-dat-n-003',
    level: 'A1',
    case: 'dative',
    gender: 'neuter',
    determiner: 'definite',
    sentence: 'Das Bild hängt an dem Fenster.',
    blanked: 'Das Bild hängt an ___ Fenster.',
    expectedAnswer: 'dem',
    gloss: 'The picture hangs on the window.',
    caseRationale: 'Dativ: an + location (no movement) takes the dative.'
  },
  {
    id: 'art-dat-n-004',
    level: 'A2',
    case: 'dative',
    gender: 'neuter',
    determiner: 'indefinite',
    sentence: 'Sie wohnt in einem Hotel.',
    blanked: 'Sie wohnt in ___ Hotel.',
    expectedAnswer: 'einem',
    gloss: 'She lives in a hotel.',
    caseRationale: 'Dativ: in + location takes the dative.'
  },
  {
    id: 'art-dat-n-005',
    level: 'A2',
    case: 'dative',
    gender: 'neuter',
    determiner: 'possessive',
    sentence: 'Wir essen in meinem Lieblingsrestaurant.',
    blanked: 'Wir essen in ___ Lieblingsrestaurant.',
    expectedAnswer: 'meinem',
    gloss: 'We eat at my favourite restaurant.',
    caseRationale: 'Dativ: in + location takes the dative.'
  },
  {
    id: 'art-dat-pl-001',
    level: 'A1',
    case: 'dative',
    gender: 'plural',
    determiner: 'definite',
    sentence: 'Ich helfe den Schülern gern.',
    blanked: 'Ich helfe ___ Schülern gern.',
    expectedAnswer: 'den',
    gloss: 'I gladly help the pupils.',
    caseRationale: 'Dativ: helfen governs the dative; plural noun adds -n.'
  },
  {
    id: 'art-dat-pl-002',
    level: 'A2',
    case: 'dative',
    gender: 'plural',
    determiner: 'possessive',
    sentence: 'Er schreibt seinen Großeltern oft.',
    blanked: 'Er schreibt ___ Großeltern oft.',
    expectedAnswer: 'seinen',
    gloss: 'He often writes to his grandparents.',
    caseRationale: 'Dativ: indirect object of schreiben (recipient).'
  },
  {
    id: 'art-dat-pl-003',
    level: 'B1',
    case: 'dative',
    gender: 'plural',
    determiner: 'definite',
    sentence: 'Sie spricht mit den Kollegen.',
    blanked: 'Sie spricht mit ___ Kollegen.',
    expectedAnswer: 'den',
    gloss: 'She is talking with the colleagues.',
    caseRationale: 'Dativ: mit always governs the dative.'
  },
  {
    id: 'art-dat-m-007',
    level: 'A2',
    case: 'dative',
    gender: 'masculine',
    determiner: 'definite',
    sentence: 'Wir fahren mit dem Bus zur Schule.',
    blanked: 'Wir fahren mit ___ Bus zur Schule.',
    expectedAnswer: 'dem',
    gloss: 'We go to school by bus.',
    caseRationale: 'Dativ: mit always governs the dative.'
  },
  {
    id: 'art-dat-f-007',
    level: 'A2',
    case: 'dative',
    gender: 'feminine',
    determiner: 'definite',
    sentence: 'Nach der Arbeit gehe ich nach Hause.',
    blanked: 'Nach ___ Arbeit gehe ich nach Hause.',
    expectedAnswer: 'der',
    gloss: 'After work I go home.',
    caseRationale: 'Dativ: nach always governs the dative.'
  },
  {
    id: 'art-dat-n-006',
    level: 'B1',
    case: 'dative',
    gender: 'neuter',
    determiner: 'possessive',
    sentence: 'Sie kommt aus ihrem Büro.',
    blanked: 'Sie kommt aus ___ Büro.',
    expectedAnswer: 'ihrem',
    gloss: 'She is coming out of her office.',
    caseRationale: 'Dativ: aus always governs the dative.'
  },
  {
    id: 'art-dat-m-008',
    level: 'B1',
    case: 'dative',
    gender: 'masculine',
    determiner: 'indefinite',
    sentence: 'Sie wohnt bei einem Onkel.',
    blanked: 'Sie wohnt bei ___ Onkel.',
    expectedAnswer: 'einem',
    gloss: 'She is staying at an uncle’s place.',
    caseRationale: 'Dativ: bei always governs the dative.'
  },
  {
    id: 'art-dat-f-008',
    level: 'B1',
    case: 'dative',
    gender: 'feminine',
    determiner: 'indefinite',
    sentence: 'Wir lernen seit einer Stunde Deutsch.',
    blanked: 'Wir lernen seit ___ Stunde Deutsch.',
    expectedAnswer: 'einer',
    gloss: 'We have been learning German for an hour.',
    caseRationale: 'Dativ: seit always governs the dative.'
  },

  // -------------------- GENITIVE (~15) --------------------
  {
    id: 'art-gen-m-001',
    level: 'B1',
    case: 'genitive',
    gender: 'masculine',
    determiner: 'definite',
    sentence: 'Das Auto des Vaters ist neu.',
    blanked: 'Das Auto ___ Vaters ist neu.',
    expectedAnswer: 'des',
    gloss: "The father's car is new.",
    caseRationale: 'Genitiv: possession (whose car?).'
  },
  {
    id: 'art-gen-m-002',
    level: 'B1',
    case: 'genitive',
    gender: 'masculine',
    determiner: 'definite',
    sentence: 'Der Hund des Nachbarn bellt laut.',
    blanked: 'Der Hund ___ Nachbarn bellt laut.',
    expectedAnswer: 'des',
    gloss: "The neighbour's dog barks loudly.",
    caseRationale: 'Genitiv: possession (whose dog?).'
  },
  {
    id: 'art-gen-m-003',
    level: 'B1',
    case: 'genitive',
    gender: 'masculine',
    determiner: 'definite',
    sentence: 'Die Mutter des Jungen wartet draußen.',
    blanked: 'Die Mutter ___ Jungen wartet draußen.',
    expectedAnswer: 'des',
    gloss: "The boy's mother is waiting outside.",
    caseRationale: 'Genitiv: possession; weak masculine noun adds -n.'
  },
  {
    id: 'art-gen-m-004',
    level: 'B1',
    case: 'genitive',
    gender: 'masculine',
    determiner: 'indefinite',
    sentence: 'Das ist das Fahrrad eines Kollegen.',
    blanked: 'Das ist das Fahrrad ___ Kollegen.',
    expectedAnswer: 'eines',
    gloss: "That is a colleague's bicycle.",
    caseRationale: 'Genitiv: possession (whose bicycle?).'
  },
  {
    id: 'art-gen-m-005',
    level: 'B1',
    case: 'genitive',
    gender: 'masculine',
    determiner: 'possessive',
    sentence: 'Das Büro meines Chefs ist groß.',
    blanked: 'Das Büro ___ Chefs ist groß.',
    expectedAnswer: 'meines',
    gloss: "My boss's office is big.",
    caseRationale: 'Genitiv: possession (whose office?).'
  },
  {
    id: 'art-gen-f-001',
    level: 'B1',
    case: 'genitive',
    gender: 'feminine',
    determiner: 'definite',
    sentence: 'Das Haus der Lehrerin ist klein.',
    blanked: 'Das Haus ___ Lehrerin ist klein.',
    expectedAnswer: 'der',
    gloss: "The teacher's house is small.",
    caseRationale: 'Genitiv: possession (whose house?).'
  },
  {
    id: 'art-gen-f-002',
    level: 'B1',
    case: 'genitive',
    gender: 'feminine',
    determiner: 'definite',
    sentence: 'Die Farbe der Wand gefällt mir.',
    blanked: 'Die Farbe ___ Wand gefällt mir.',
    expectedAnswer: 'der',
    gloss: 'I like the colour of the wall.',
    caseRationale: 'Genitiv: attribute (colour of what?).'
  },
  {
    id: 'art-gen-f-003',
    level: 'B1',
    case: 'genitive',
    gender: 'feminine',
    determiner: 'indefinite',
    sentence: 'Das ist der Anfang einer Geschichte.',
    blanked: 'Das ist der Anfang ___ Geschichte.',
    expectedAnswer: 'einer',
    gloss: 'That is the beginning of a story.',
    caseRationale: 'Genitiv: attribute (beginning of what?).'
  },
  {
    id: 'art-gen-f-004',
    level: 'B1',
    case: 'genitive',
    gender: 'feminine',
    determiner: 'possessive',
    sentence: 'Das Lieblingsbuch meiner Tochter liegt hier.',
    blanked: 'Das Lieblingsbuch ___ Tochter liegt hier.',
    expectedAnswer: 'meiner',
    gloss: "My daughter's favourite book is here.",
    caseRationale: 'Genitiv: possession (whose book?).'
  },
  {
    id: 'art-gen-n-001',
    level: 'B1',
    case: 'genitive',
    gender: 'neuter',
    determiner: 'definite',
    sentence: 'Das Dach des Hauses ist rot.',
    blanked: 'Das Dach ___ Hauses ist rot.',
    expectedAnswer: 'des',
    gloss: "The house's roof is red.",
    caseRationale: 'Genitiv: attribute (roof of what?).'
  },
  {
    id: 'art-gen-n-002',
    level: 'B1',
    case: 'genitive',
    gender: 'neuter',
    determiner: 'definite',
    sentence: 'Der Titel des Buches ist lustig.',
    blanked: 'Der Titel ___ Buches ist lustig.',
    expectedAnswer: 'des',
    gloss: "The book's title is funny.",
    caseRationale: 'Genitiv: attribute (title of what?).'
  },
  {
    id: 'art-gen-n-003',
    level: 'B1',
    case: 'genitive',
    gender: 'neuter',
    determiner: 'indefinite',
    sentence: 'Das ist die Aufgabe eines Schülers.',
    blanked: 'Das ist die Aufgabe ___ Schülers.',
    expectedAnswer: 'eines',
    gloss: "That is a pupil's task.",
    caseRationale: 'Genitiv: attribute (task of what?).'
  },
  {
    id: 'art-gen-n-004',
    level: 'B2',
    case: 'genitive',
    gender: 'neuter',
    determiner: 'possessive',
    sentence: 'Die Fenster unseres Hauses sind neu.',
    blanked: 'Die Fenster ___ Hauses sind neu.',
    expectedAnswer: 'unseres',
    gloss: 'The windows of our house are new.',
    caseRationale: 'Genitiv: attribute (windows of what?).'
  },
  {
    id: 'art-gen-pl-001',
    level: 'B1',
    case: 'genitive',
    gender: 'plural',
    determiner: 'definite',
    sentence: 'Die Spielsachen der Jungen liegen überall.',
    blanked: 'Die Spielsachen ___ Jungen liegen überall.',
    expectedAnswer: 'der',
    gloss: "The boys' toys are lying everywhere.",
    caseRationale: 'Genitiv: possession (whose toys?).'
  },
  {
    id: 'art-gen-pl-002',
    level: 'B2',
    case: 'genitive',
    gender: 'plural',
    determiner: 'possessive',
    sentence: 'Die Stimmen meiner Nachbarn sind laut.',
    blanked: 'Die Stimmen ___ Nachbarn sind laut.',
    expectedAnswer: 'meiner',
    gloss: "My neighbours' voices are loud.",
    caseRationale: 'Genitiv: possession (whose voices?).'
  }
]

// ===========================================================================
// ADJECTIVE_ENDING_ENTRIES: ~80 sentences testing adjective endings
// Inflection ↔ preceding consistency enforced:
//   definite -> weak; indefinite/possessive -> mixed (or strong for plurals);
//   none -> strong.
// ===========================================================================

export const ADJECTIVE_ENDING_ENTRIES: AdjectiveEndingEntry[] = [
  // ---------------- WEAK (after definite) ~30 ----------------
  // Nominative (-e for nom all-genders + acc-fem/neut/pl)
  {
    id: 'adj-weak-nom-m-001',
    level: 'A2',
    inflection: 'weak',
    case: 'nominative',
    gender: 'masculine',
    preceding: 'definite',
    sentence: 'Der schöne Park ist groß.',
    blanked: 'Der ___ Park ist groß.',
    baseAdjective: 'schön',
    expectedAnswer: 'schöne',
    gloss: 'The beautiful park is big.'
  },
  {
    id: 'adj-weak-nom-m-002',
    level: 'A2',
    inflection: 'weak',
    case: 'nominative',
    gender: 'masculine',
    preceding: 'definite',
    sentence: 'Der alte Mann sitzt dort.',
    blanked: 'Der ___ Mann sitzt dort.',
    baseAdjective: 'alt',
    expectedAnswer: 'alte',
    gloss: 'The old man is sitting there.'
  },
  {
    id: 'adj-weak-nom-f-001',
    level: 'A2',
    inflection: 'weak',
    case: 'nominative',
    gender: 'feminine',
    preceding: 'definite',
    sentence: 'Die junge Frau lacht.',
    blanked: 'Die ___ Frau lacht.',
    baseAdjective: 'jung',
    expectedAnswer: 'junge',
    gloss: 'The young woman is laughing.'
  },
  {
    id: 'adj-weak-nom-f-002',
    level: 'A2',
    inflection: 'weak',
    case: 'nominative',
    gender: 'feminine',
    preceding: 'definite',
    sentence: 'Die rote Lampe leuchtet.',
    blanked: 'Die ___ Lampe leuchtet.',
    baseAdjective: 'rot',
    expectedAnswer: 'rote',
    gloss: 'The red lamp is shining.'
  },
  {
    id: 'adj-weak-nom-n-001',
    level: 'A2',
    inflection: 'weak',
    case: 'nominative',
    gender: 'neuter',
    preceding: 'definite',
    sentence: 'Das kleine Kind weint.',
    blanked: 'Das ___ Kind weint.',
    baseAdjective: 'klein',
    expectedAnswer: 'kleine',
    gloss: 'The little child is crying.'
  },
  {
    id: 'adj-weak-nom-n-002',
    level: 'A2',
    inflection: 'weak',
    case: 'nominative',
    gender: 'neuter',
    preceding: 'definite',
    sentence: 'Das neue Auto fährt schnell.',
    blanked: 'Das ___ Auto fährt schnell.',
    baseAdjective: 'neu',
    expectedAnswer: 'neue',
    gloss: 'The new car drives fast.'
  },
  {
    id: 'adj-weak-nom-pl-001',
    level: 'A2',
    inflection: 'weak',
    case: 'nominative',
    gender: 'plural',
    preceding: 'definite',
    sentence: 'Die müden Kinder schlafen schon.',
    blanked: 'Die ___ Kinder schlafen schon.',
    baseAdjective: 'müde',
    expectedAnswer: 'müden',
    gloss: 'The tired children are already sleeping.'
  },
  // Accusative weak (-e for fem/neut/pl, -en for masc)
  {
    id: 'adj-weak-acc-m-001',
    level: 'A2',
    inflection: 'weak',
    case: 'accusative',
    gender: 'masculine',
    preceding: 'definite',
    sentence: 'Ich sehe den großen Hund.',
    blanked: 'Ich sehe den ___ Hund.',
    baseAdjective: 'groß',
    expectedAnswer: 'großen',
    gloss: 'I see the big dog.'
  },
  {
    id: 'adj-weak-acc-m-002',
    level: 'A2',
    inflection: 'weak',
    case: 'accusative',
    gender: 'masculine',
    preceding: 'definite',
    sentence: 'Wir kaufen den runden Tisch.',
    blanked: 'Wir kaufen den ___ Tisch.',
    baseAdjective: 'rund',
    expectedAnswer: 'runden',
    gloss: 'We are buying the round table.'
  },
  {
    id: 'adj-weak-acc-f-001',
    level: 'A2',
    inflection: 'weak',
    case: 'accusative',
    gender: 'feminine',
    preceding: 'definite',
    sentence: 'Sie liest die spannende Geschichte.',
    blanked: 'Sie liest die ___ Geschichte.',
    baseAdjective: 'spannend',
    expectedAnswer: 'spannende',
    gloss: 'She reads the exciting story.'
  },
  {
    id: 'adj-weak-acc-n-001',
    level: 'A2',
    inflection: 'weak',
    case: 'accusative',
    gender: 'neuter',
    preceding: 'definite',
    sentence: 'Ich esse das frische Brot.',
    blanked: 'Ich esse das ___ Brot.',
    baseAdjective: 'frisch',
    expectedAnswer: 'frische',
    gloss: 'I am eating the fresh bread.'
  },
  {
    id: 'adj-weak-acc-pl-001',
    level: 'B1',
    inflection: 'weak',
    case: 'accusative',
    gender: 'plural',
    preceding: 'definite',
    sentence: 'Er besucht die alten Freunde.',
    blanked: 'Er besucht die ___ Freunde.',
    baseAdjective: 'alt',
    expectedAnswer: 'alten',
    gloss: 'He visits the old friends.'
  },
  // Dative weak (-en everywhere)
  {
    id: 'adj-weak-dat-m-001',
    level: 'B1',
    inflection: 'weak',
    case: 'dative',
    gender: 'masculine',
    preceding: 'definite',
    sentence: 'Ich helfe dem netten Nachbarn.',
    blanked: 'Ich helfe dem ___ Nachbarn.',
    baseAdjective: 'nett',
    expectedAnswer: 'netten',
    gloss: 'I help the nice neighbour.'
  },
  {
    id: 'adj-weak-dat-m-002',
    level: 'B1',
    inflection: 'weak',
    case: 'dative',
    gender: 'masculine',
    preceding: 'definite',
    sentence: 'Wir sprechen mit dem klugen Lehrer.',
    blanked: 'Wir sprechen mit dem ___ Lehrer.',
    baseAdjective: 'klug',
    expectedAnswer: 'klugen',
    gloss: 'We are speaking with the clever teacher.'
  },
  {
    id: 'adj-weak-dat-f-001',
    level: 'B1',
    inflection: 'weak',
    case: 'dative',
    gender: 'feminine',
    preceding: 'definite',
    sentence: 'Er hilft der jungen Frau.',
    blanked: 'Er hilft der ___ Frau.',
    baseAdjective: 'jung',
    expectedAnswer: 'jungen',
    gloss: 'He helps the young woman.'
  },
  {
    id: 'adj-weak-dat-f-002',
    level: 'B1',
    inflection: 'weak',
    case: 'dative',
    gender: 'feminine',
    preceding: 'definite',
    sentence: 'Ich gebe der kleinen Schwester ein Geschenk.',
    blanked: 'Ich gebe der ___ Schwester ein Geschenk.',
    baseAdjective: 'klein',
    expectedAnswer: 'kleinen',
    gloss: 'I give the little sister a gift.'
  },
  {
    id: 'adj-weak-dat-n-001',
    level: 'B1',
    inflection: 'weak',
    case: 'dative',
    gender: 'neuter',
    preceding: 'definite',
    sentence: 'Sie spielt mit dem süßen Baby.',
    blanked: 'Sie spielt mit dem ___ Baby.',
    baseAdjective: 'süß',
    expectedAnswer: 'süßen',
    gloss: 'She plays with the sweet baby.'
  },
  {
    id: 'adj-weak-dat-n-002',
    level: 'B1',
    inflection: 'weak',
    case: 'dative',
    gender: 'neuter',
    preceding: 'definite',
    sentence: 'Wir wohnen in dem alten Haus.',
    blanked: 'Wir wohnen in dem ___ Haus.',
    baseAdjective: 'alt',
    expectedAnswer: 'alten',
    gloss: 'We live in the old house.'
  },
  {
    id: 'adj-weak-dat-pl-001',
    level: 'B1',
    inflection: 'weak',
    case: 'dative',
    gender: 'plural',
    preceding: 'definite',
    sentence: 'Er spielt mit den kleinen Kindern.',
    blanked: 'Er spielt mit den ___ Kindern.',
    baseAdjective: 'klein',
    expectedAnswer: 'kleinen',
    gloss: 'He plays with the small children.'
  },
  {
    id: 'adj-weak-dat-pl-002',
    level: 'B1',
    inflection: 'weak',
    case: 'dative',
    gender: 'plural',
    preceding: 'definite',
    sentence: 'Sie hilft den alten Leuten.',
    blanked: 'Sie hilft den ___ Leuten.',
    baseAdjective: 'alt',
    expectedAnswer: 'alten',
    gloss: 'She helps the old people.'
  },
  // Genitive weak (-en everywhere)
  {
    id: 'adj-weak-gen-m-001',
    level: 'B2',
    inflection: 'weak',
    case: 'genitive',
    gender: 'masculine',
    preceding: 'definite',
    sentence: 'Das Auto des reichen Mannes glänzt.',
    blanked: 'Das Auto des ___ Mannes glänzt.',
    baseAdjective: 'reich',
    expectedAnswer: 'reichen',
    gloss: "The rich man's car shines."
  },
  {
    id: 'adj-weak-gen-f-001',
    level: 'B2',
    inflection: 'weak',
    case: 'genitive',
    gender: 'feminine',
    preceding: 'definite',
    sentence: 'Die Stimme der berühmten Sängerin ist toll.',
    blanked: 'Die Stimme der ___ Sängerin ist toll.',
    baseAdjective: 'berühmt',
    expectedAnswer: 'berühmten',
    gloss: "The famous singer's voice is great."
  },
  {
    id: 'adj-weak-gen-n-001',
    level: 'B2',
    inflection: 'weak',
    case: 'genitive',
    gender: 'neuter',
    preceding: 'definite',
    sentence: 'Der Titel des neuen Films klingt interessant.',
    blanked: 'Der Titel des ___ Films klingt interessant.',
    baseAdjective: 'neu',
    expectedAnswer: 'neuen',
    gloss: "The new film's title sounds interesting."
  },
  {
    id: 'adj-weak-gen-pl-001',
    level: 'B2',
    inflection: 'weak',
    case: 'genitive',
    gender: 'plural',
    preceding: 'definite',
    sentence: 'Die Lieder der jungen Musiker sind beliebt.',
    blanked: 'Die Lieder der ___ Musiker sind beliebt.',
    baseAdjective: 'jung',
    expectedAnswer: 'jungen',
    gloss: "The young musicians' songs are popular."
  },
  // A few more weak fillers
  {
    id: 'adj-weak-nom-m-003',
    level: 'A2',
    inflection: 'weak',
    case: 'nominative',
    gender: 'masculine',
    preceding: 'definite',
    sentence: 'Der nette Kellner bringt das Essen.',
    blanked: 'Der ___ Kellner bringt das Essen.',
    baseAdjective: 'nett',
    expectedAnswer: 'nette',
    gloss: 'The nice waiter brings the food.'
  },
  {
    id: 'adj-weak-acc-m-003',
    level: 'A2',
    inflection: 'weak',
    case: 'accusative',
    gender: 'masculine',
    preceding: 'definite',
    sentence: 'Sie liest den langen Brief gern.',
    blanked: 'Sie liest den ___ Brief gern.',
    baseAdjective: 'lang',
    expectedAnswer: 'langen',
    gloss: 'She gladly reads the long letter.'
  },
  {
    id: 'adj-weak-nom-f-003',
    level: 'A2',
    inflection: 'weak',
    case: 'nominative',
    gender: 'feminine',
    preceding: 'definite',
    sentence: 'Die kalte Milch steht im Glas.',
    blanked: 'Die ___ Milch steht im Glas.',
    baseAdjective: 'kalt',
    expectedAnswer: 'kalte',
    gloss: 'The cold milk is in the glass.'
  },
  {
    id: 'adj-weak-dat-m-003',
    level: 'B1',
    inflection: 'weak',
    case: 'dative',
    gender: 'masculine',
    preceding: 'definite',
    sentence: 'Er spricht mit dem freundlichen Verkäufer.',
    blanked: 'Er spricht mit dem ___ Verkäufer.',
    baseAdjective: 'freundlich',
    expectedAnswer: 'freundlichen',
    gloss: 'He speaks with the friendly salesman.'
  },
  {
    id: 'adj-weak-acc-n-002',
    level: 'A2',
    inflection: 'weak',
    case: 'accusative',
    gender: 'neuter',
    preceding: 'definite',
    sentence: 'Sie trinkt das kalte Wasser schnell.',
    blanked: 'Sie trinkt das ___ Wasser schnell.',
    baseAdjective: 'kalt',
    expectedAnswer: 'kalte',
    gloss: 'She quickly drinks the cold water.'
  },
  {
    id: 'adj-weak-acc-pl-002',
    level: 'B1',
    inflection: 'weak',
    case: 'accusative',
    gender: 'plural',
    preceding: 'definite',
    sentence: 'Wir lesen die spannenden Bücher gern.',
    blanked: 'Wir lesen die ___ Bücher gern.',
    baseAdjective: 'spannend',
    expectedAnswer: 'spannenden',
    gloss: 'We gladly read the exciting books.'
  },

  // ---------------- MIXED (after indefinite/possessive) ~30 ----------------
  // Nominative mixed: m=-er, f=-e, n=-es
  {
    id: 'adj-mixed-nom-m-001',
    level: 'A2',
    inflection: 'mixed',
    case: 'nominative',
    gender: 'masculine',
    preceding: 'indefinite',
    sentence: 'Ein netter Mann hilft uns.',
    blanked: 'Ein ___ Mann hilft uns.',
    baseAdjective: 'nett',
    expectedAnswer: 'netter',
    gloss: 'A nice man is helping us.'
  },
  {
    id: 'adj-mixed-nom-m-002',
    level: 'A2',
    inflection: 'mixed',
    case: 'nominative',
    gender: 'masculine',
    preceding: 'possessive',
    sentence: 'Mein guter Freund kommt heute.',
    blanked: 'Mein ___ Freund kommt heute.',
    baseAdjective: 'gut',
    expectedAnswer: 'guter',
    gloss: 'My good friend is coming today.'
  },
  {
    id: 'adj-mixed-nom-f-001',
    level: 'A2',
    inflection: 'mixed',
    case: 'nominative',
    gender: 'feminine',
    preceding: 'indefinite',
    sentence: 'Eine schöne Blume steht hier.',
    blanked: 'Eine ___ Blume steht hier.',
    baseAdjective: 'schön',
    expectedAnswer: 'schöne',
    gloss: 'A beautiful flower is standing here.'
  },
  {
    id: 'adj-mixed-nom-f-002',
    level: 'A2',
    inflection: 'mixed',
    case: 'nominative',
    gender: 'feminine',
    preceding: 'possessive',
    sentence: 'Meine neue Lehrerin ist sehr nett.',
    blanked: 'Meine ___ Lehrerin ist sehr nett.',
    baseAdjective: 'neu',
    expectedAnswer: 'neue',
    gloss: 'My new teacher is very nice.'
  },
  {
    id: 'adj-mixed-nom-n-001',
    level: 'A2',
    inflection: 'mixed',
    case: 'nominative',
    gender: 'neuter',
    preceding: 'indefinite',
    sentence: 'Ein kleines Kind spielt im Garten.',
    blanked: 'Ein ___ Kind spielt im Garten.',
    baseAdjective: 'klein',
    expectedAnswer: 'kleines',
    gloss: 'A small child is playing in the garden.'
  },
  {
    id: 'adj-mixed-nom-n-002',
    level: 'A2',
    inflection: 'mixed',
    case: 'nominative',
    gender: 'neuter',
    preceding: 'possessive',
    sentence: 'Mein altes Auto fährt noch gut.',
    blanked: 'Mein ___ Auto fährt noch gut.',
    baseAdjective: 'alt',
    expectedAnswer: 'altes',
    gloss: 'My old car still runs well.'
  },
  // Accusative mixed: m=-en, f=-e, n=-es
  {
    id: 'adj-mixed-acc-m-001',
    level: 'A2',
    inflection: 'mixed',
    case: 'accusative',
    gender: 'masculine',
    preceding: 'indefinite',
    sentence: 'Ich sehe einen schönen Park.',
    blanked: 'Ich sehe einen ___ Park.',
    baseAdjective: 'schön',
    expectedAnswer: 'schönen',
    gloss: 'I see a beautiful park.'
  },
  {
    id: 'adj-mixed-acc-m-002',
    level: 'A2',
    inflection: 'mixed',
    case: 'accusative',
    gender: 'masculine',
    preceding: 'indefinite',
    sentence: 'Wir kaufen einen großen Tisch.',
    blanked: 'Wir kaufen einen ___ Tisch.',
    baseAdjective: 'groß',
    expectedAnswer: 'großen',
    gloss: 'We are buying a big table.'
  },
  {
    id: 'adj-mixed-acc-m-003',
    level: 'A2',
    inflection: 'mixed',
    case: 'accusative',
    gender: 'masculine',
    preceding: 'possessive',
    sentence: 'Sie besucht ihren kranken Onkel.',
    blanked: 'Sie besucht ihren ___ Onkel.',
    baseAdjective: 'krank',
    expectedAnswer: 'kranken',
    gloss: 'She visits her sick uncle.'
  },
  {
    id: 'adj-mixed-acc-f-001',
    level: 'A2',
    inflection: 'mixed',
    case: 'accusative',
    gender: 'feminine',
    preceding: 'indefinite',
    sentence: 'Er trinkt eine kalte Limo.',
    blanked: 'Er trinkt eine ___ Limo.',
    baseAdjective: 'kalt',
    expectedAnswer: 'kalte',
    gloss: 'He is drinking a cold soda.'
  },
  {
    id: 'adj-mixed-acc-f-002',
    level: 'A2',
    inflection: 'mixed',
    case: 'accusative',
    gender: 'feminine',
    preceding: 'possessive',
    sentence: 'Ich liebe meine neue Wohnung.',
    blanked: 'Ich liebe meine ___ Wohnung.',
    baseAdjective: 'neu',
    expectedAnswer: 'neue',
    gloss: 'I love my new apartment.'
  },
  {
    id: 'adj-mixed-acc-n-001',
    level: 'A2',
    inflection: 'mixed',
    case: 'accusative',
    gender: 'neuter',
    preceding: 'indefinite',
    sentence: 'Sie schreibt ein langes Buch.',
    blanked: 'Sie schreibt ein ___ Buch.',
    baseAdjective: 'lang',
    expectedAnswer: 'langes',
    gloss: 'She is writing a long book.'
  },
  {
    id: 'adj-mixed-acc-n-002',
    level: 'A2',
    inflection: 'mixed',
    case: 'accusative',
    gender: 'neuter',
    preceding: 'possessive',
    sentence: 'Er sucht sein verlorenes Handy.',
    blanked: 'Er sucht sein ___ Handy.',
    baseAdjective: 'verloren',
    expectedAnswer: 'verlorenes',
    gloss: 'He is looking for his lost phone.'
  },
  // Dative mixed: -en everywhere
  {
    id: 'adj-mixed-dat-m-001',
    level: 'B1',
    inflection: 'mixed',
    case: 'dative',
    gender: 'masculine',
    preceding: 'indefinite',
    sentence: 'Ich helfe einem alten Mann.',
    blanked: 'Ich helfe einem ___ Mann.',
    baseAdjective: 'alt',
    expectedAnswer: 'alten',
    gloss: 'I help an old man.'
  },
  {
    id: 'adj-mixed-dat-m-002',
    level: 'B1',
    inflection: 'mixed',
    case: 'dative',
    gender: 'masculine',
    preceding: 'possessive',
    sentence: 'Sie schreibt ihrem besten Freund.',
    blanked: 'Sie schreibt ihrem ___ Freund.',
    baseAdjective: 'best',
    expectedAnswer: 'besten',
    gloss: 'She is writing to her best friend.'
  },
  {
    id: 'adj-mixed-dat-f-001',
    level: 'B1',
    inflection: 'mixed',
    case: 'dative',
    gender: 'feminine',
    preceding: 'indefinite',
    sentence: 'Er spricht mit einer freundlichen Kollegin.',
    blanked: 'Er spricht mit einer ___ Kollegin.',
    baseAdjective: 'freundlich',
    expectedAnswer: 'freundlichen',
    gloss: 'He is talking with a friendly colleague.'
  },
  {
    id: 'adj-mixed-dat-f-002',
    level: 'B1',
    inflection: 'mixed',
    case: 'dative',
    gender: 'feminine',
    preceding: 'possessive',
    sentence: 'Ich helfe meiner kleinen Tochter.',
    blanked: 'Ich helfe meiner ___ Tochter.',
    baseAdjective: 'klein',
    expectedAnswer: 'kleinen',
    gloss: 'I help my little daughter.'
  },
  {
    id: 'adj-mixed-dat-n-001',
    level: 'B1',
    inflection: 'mixed',
    case: 'dative',
    gender: 'neuter',
    preceding: 'indefinite',
    sentence: 'Wir wohnen in einem schönen Haus.',
    blanked: 'Wir wohnen in einem ___ Haus.',
    baseAdjective: 'schön',
    expectedAnswer: 'schönen',
    gloss: 'We live in a beautiful house.'
  },
  {
    id: 'adj-mixed-dat-n-002',
    level: 'B1',
    inflection: 'mixed',
    case: 'dative',
    gender: 'neuter',
    preceding: 'possessive',
    sentence: 'Er sitzt in seinem bequemen Sessel.',
    blanked: 'Er sitzt in seinem ___ Sessel.',
    baseAdjective: 'bequem',
    expectedAnswer: 'bequemen',
    gloss: 'He is sitting in his comfortable armchair.'
  },
  // Genitive mixed: -en everywhere
  {
    id: 'adj-mixed-gen-m-001',
    level: 'B2',
    inflection: 'mixed',
    case: 'genitive',
    gender: 'masculine',
    preceding: 'possessive',
    sentence: 'Das Auto meines besten Freundes ist neu.',
    blanked: 'Das Auto meines ___ Freundes ist neu.',
    baseAdjective: 'best',
    expectedAnswer: 'besten',
    gloss: "My best friend's car is new."
  },
  {
    id: 'adj-mixed-gen-f-001',
    level: 'B2',
    inflection: 'mixed',
    case: 'genitive',
    gender: 'feminine',
    preceding: 'possessive',
    sentence: 'Die Stimme meiner jungen Schwester ist hoch.',
    blanked: 'Die Stimme meiner ___ Schwester ist hoch.',
    baseAdjective: 'jung',
    expectedAnswer: 'jungen',
    gloss: "My young sister's voice is high."
  },
  {
    id: 'adj-mixed-gen-n-001',
    level: 'B2',
    inflection: 'mixed',
    case: 'genitive',
    gender: 'neuter',
    preceding: 'possessive',
    sentence: 'Die Fenster meines neuen Hauses sind groß.',
    blanked: 'Die Fenster meines ___ Hauses sind groß.',
    baseAdjective: 'neu',
    expectedAnswer: 'neuen',
    gloss: 'The windows of my new house are big.'
  },
  // More mixed fillers
  {
    id: 'adj-mixed-nom-m-003',
    level: 'A2',
    inflection: 'mixed',
    case: 'nominative',
    gender: 'masculine',
    preceding: 'indefinite',
    sentence: 'Ein junger Mann steht dort.',
    blanked: 'Ein ___ Mann steht dort.',
    baseAdjective: 'jung',
    expectedAnswer: 'junger',
    gloss: 'A young man is standing there.'
  },
  {
    id: 'adj-mixed-nom-n-003',
    level: 'A2',
    inflection: 'mixed',
    case: 'nominative',
    gender: 'neuter',
    preceding: 'possessive',
    sentence: 'Dein gutes Herz freut mich.',
    blanked: 'Dein ___ Herz freut mich.',
    baseAdjective: 'gut',
    expectedAnswer: 'gutes',
    gloss: 'Your good heart makes me happy.'
  },
  {
    id: 'adj-mixed-acc-m-004',
    level: 'A2',
    inflection: 'mixed',
    case: 'accusative',
    gender: 'masculine',
    preceding: 'possessive',
    sentence: 'Ich treffe meinen alten Lehrer.',
    blanked: 'Ich treffe meinen ___ Lehrer.',
    baseAdjective: 'alt',
    expectedAnswer: 'alten',
    gloss: 'I am meeting my old teacher.'
  },
  {
    id: 'adj-mixed-acc-n-003',
    level: 'A2',
    inflection: 'mixed',
    case: 'accusative',
    gender: 'neuter',
    preceding: 'indefinite',
    sentence: 'Er kauft ein buntes Geschenk.',
    blanked: 'Er kauft ein ___ Geschenk.',
    baseAdjective: 'bunt',
    expectedAnswer: 'buntes',
    gloss: 'He is buying a colourful gift.'
  },
  {
    id: 'adj-mixed-dat-m-003',
    level: 'B1',
    inflection: 'mixed',
    case: 'dative',
    gender: 'masculine',
    preceding: 'indefinite',
    sentence: 'Sie hilft einem netten Kollegen.',
    blanked: 'Sie hilft einem ___ Kollegen.',
    baseAdjective: 'nett',
    expectedAnswer: 'netten',
    gloss: 'She helps a nice colleague.'
  },
  {
    id: 'adj-mixed-dat-f-003',
    level: 'B1',
    inflection: 'mixed',
    case: 'dative',
    gender: 'feminine',
    preceding: 'indefinite',
    sentence: 'Er spricht mit einer alten Dame.',
    blanked: 'Er spricht mit einer ___ Dame.',
    baseAdjective: 'alt',
    expectedAnswer: 'alten',
    gloss: 'He is talking with an old lady.'
  },
  {
    id: 'adj-mixed-dat-n-003',
    level: 'B1',
    inflection: 'mixed',
    case: 'dative',
    gender: 'neuter',
    preceding: 'indefinite',
    sentence: 'Sie kommt aus einem fernen Land.',
    blanked: 'Sie kommt aus einem ___ Land.',
    baseAdjective: 'fern',
    expectedAnswer: 'fernen',
    gloss: 'She comes from a faraway country.'
  },
  {
    id: 'adj-mixed-acc-f-003',
    level: 'A2',
    inflection: 'mixed',
    case: 'accusative',
    gender: 'feminine',
    preceding: 'indefinite',
    sentence: 'Wir essen eine warme Suppe.',
    blanked: 'Wir essen eine ___ Suppe.',
    baseAdjective: 'warm',
    expectedAnswer: 'warme',
    gloss: 'We are eating a warm soup.'
  },

  // ---------------- STRONG (no determiner OR plural after ein-words) ~20 ----------------
  // Nominative strong
  {
    id: 'adj-strong-nom-pl-001',
    level: 'B1',
    inflection: 'strong',
    case: 'nominative',
    gender: 'plural',
    preceding: 'none',
    sentence: 'Frische Brötchen schmecken gut.',
    blanked: '___ Brötchen schmecken gut.',
    baseAdjective: 'frisch',
    expectedAnswer: 'Frische',
    alternatives: ['frische'],
    gloss: 'Fresh rolls taste good.'
  },
  {
    id: 'adj-strong-nom-pl-002',
    level: 'B1',
    inflection: 'strong',
    case: 'nominative',
    gender: 'plural',
    preceding: 'none',
    sentence: 'Kleine Kinder spielen draußen.',
    blanked: '___ Kinder spielen draußen.',
    baseAdjective: 'klein',
    expectedAnswer: 'Kleine',
    alternatives: ['kleine'],
    gloss: 'Small children are playing outside.'
  },
  {
    id: 'adj-strong-nom-m-001',
    level: 'B1',
    inflection: 'strong',
    case: 'nominative',
    gender: 'masculine',
    preceding: 'none',
    sentence: 'Heißer Kaffee schmeckt mir.',
    blanked: '___ Kaffee schmeckt mir.',
    baseAdjective: 'heiß',
    expectedAnswer: 'Heißer',
    alternatives: ['heißer'],
    gloss: 'Hot coffee tastes good to me.'
  },
  {
    id: 'adj-strong-nom-f-001',
    level: 'B1',
    inflection: 'strong',
    case: 'nominative',
    gender: 'feminine',
    preceding: 'none',
    sentence: 'Kalte Milch steht im Kühlschrank.',
    blanked: '___ Milch steht im Kühlschrank.',
    baseAdjective: 'kalt',
    expectedAnswer: 'Kalte',
    alternatives: ['kalte'],
    gloss: 'Cold milk is in the fridge.'
  },
  {
    id: 'adj-strong-nom-n-001',
    level: 'B1',
    inflection: 'strong',
    case: 'nominative',
    gender: 'neuter',
    preceding: 'none',
    sentence: 'Frisches Brot riecht wunderbar.',
    blanked: '___ Brot riecht wunderbar.',
    baseAdjective: 'frisch',
    expectedAnswer: 'Frisches',
    alternatives: ['frisches'],
    gloss: 'Fresh bread smells wonderful.'
  },
  // Accusative strong
  {
    id: 'adj-strong-acc-m-001',
    level: 'B1',
    inflection: 'strong',
    case: 'accusative',
    gender: 'masculine',
    preceding: 'none',
    sentence: 'Ich trinke schwarzen Tee gern.',
    blanked: 'Ich trinke ___ Tee gern.',
    baseAdjective: 'schwarz',
    expectedAnswer: 'schwarzen',
    gloss: 'I like to drink black tea.'
  },
  {
    id: 'adj-strong-acc-f-001',
    level: 'B1',
    inflection: 'strong',
    case: 'accusative',
    gender: 'feminine',
    preceding: 'none',
    sentence: 'Ich brauche frische Luft.',
    blanked: 'Ich brauche ___ Luft.',
    baseAdjective: 'frisch',
    expectedAnswer: 'frische',
    gloss: 'I need fresh air.'
  },
  {
    id: 'adj-strong-acc-n-001',
    level: 'B1',
    inflection: 'strong',
    case: 'accusative',
    gender: 'neuter',
    preceding: 'none',
    sentence: 'Wir essen warmes Essen.',
    blanked: 'Wir essen ___ Essen.',
    baseAdjective: 'warm',
    expectedAnswer: 'warmes',
    gloss: 'We are eating warm food.'
  },
  {
    id: 'adj-strong-acc-pl-001',
    level: 'B1',
    inflection: 'strong',
    case: 'accusative',
    gender: 'plural',
    preceding: 'none',
    sentence: 'Sie kauft rote Äpfel auf dem Markt.',
    blanked: 'Sie kauft ___ Äpfel auf dem Markt.',
    baseAdjective: 'rot',
    expectedAnswer: 'rote',
    gloss: 'She is buying red apples at the market.'
  },
  // Dative strong
  {
    id: 'adj-strong-dat-m-001',
    level: 'B2',
    inflection: 'strong',
    case: 'dative',
    gender: 'masculine',
    preceding: 'none',
    sentence: 'Bei starkem Regen bleibe ich zu Hause.',
    blanked: 'Bei ___ Regen bleibe ich zu Hause.',
    baseAdjective: 'stark',
    expectedAnswer: 'starkem',
    gloss: 'During heavy rain I stay home.'
  },
  {
    id: 'adj-strong-dat-f-001',
    level: 'B2',
    inflection: 'strong',
    case: 'dative',
    gender: 'feminine',
    preceding: 'none',
    sentence: 'Mit guter Laune fängt der Tag an.',
    blanked: 'Mit ___ Laune fängt der Tag an.',
    baseAdjective: 'gut',
    expectedAnswer: 'guter',
    gloss: 'The day starts with a good mood.'
  },
  {
    id: 'adj-strong-dat-n-001',
    level: 'B2',
    inflection: 'strong',
    case: 'dative',
    gender: 'neuter',
    preceding: 'none',
    sentence: 'Bei schönem Wetter gehen wir spazieren.',
    blanked: 'Bei ___ Wetter gehen wir spazieren.',
    baseAdjective: 'schön',
    expectedAnswer: 'schönem',
    gloss: 'In nice weather we go for a walk.'
  },
  {
    id: 'adj-strong-dat-pl-001',
    level: 'B1',
    inflection: 'strong',
    case: 'dative',
    gender: 'plural',
    preceding: 'none',
    sentence: 'Sie spielt mit kleinen Hunden gern.',
    blanked: 'Sie spielt mit ___ Hunden gern.',
    baseAdjective: 'klein',
    expectedAnswer: 'kleinen',
    gloss: 'She likes playing with small dogs.'
  },
  {
    id: 'adj-strong-dat-pl-002',
    level: 'B1',
    inflection: 'strong',
    case: 'dative',
    gender: 'plural',
    preceding: 'none',
    sentence: 'Wir helfen alten Leuten gern.',
    blanked: 'Wir helfen ___ Leuten gern.',
    baseAdjective: 'alt',
    expectedAnswer: 'alten',
    gloss: 'We gladly help old people.'
  },
  // Genitive strong
  {
    id: 'adj-strong-gen-m-001',
    level: 'B2',
    inflection: 'strong',
    case: 'genitive',
    gender: 'masculine',
    preceding: 'none',
    sentence: 'Der Geschmack guten Weines ist besonders.',
    blanked: 'Der Geschmack ___ Weines ist besonders.',
    baseAdjective: 'gut',
    expectedAnswer: 'guten',
    gloss: 'The taste of good wine is special.'
  },
  {
    id: 'adj-strong-gen-f-001',
    level: 'B2',
    inflection: 'strong',
    case: 'genitive',
    gender: 'feminine',
    preceding: 'none',
    sentence: 'Trotz schlechter Laune lächelt sie.',
    blanked: 'Trotz ___ Laune lächelt sie.',
    baseAdjective: 'schlecht',
    expectedAnswer: 'schlechter',
    gloss: 'Despite a bad mood she is smiling.'
  },
  {
    id: 'adj-strong-gen-pl-001',
    level: 'B2',
    inflection: 'strong',
    case: 'genitive',
    gender: 'plural',
    preceding: 'none',
    sentence: 'Die Meinung junger Leute ändert sich oft.',
    blanked: 'Die Meinung ___ Leute ändert sich oft.',
    baseAdjective: 'jung',
    expectedAnswer: 'junger',
    gloss: 'The opinion of young people often changes.'
  },
  // Strong plurals after ein-words (mixed → strong fallback)
  {
    id: 'adj-strong-nom-pl-003',
    level: 'B1',
    inflection: 'strong',
    case: 'nominative',
    gender: 'plural',
    preceding: 'possessive',
    sentence: 'Meine guten Freunde besuchen mich.',
    blanked: 'Meine ___ Freunde besuchen mich.',
    baseAdjective: 'gut',
    expectedAnswer: 'guten',
    gloss: 'My good friends are visiting me.'
  },
  {
    id: 'adj-strong-acc-pl-002',
    level: 'B1',
    inflection: 'strong',
    case: 'accusative',
    gender: 'plural',
    preceding: 'possessive',
    sentence: 'Ich treffe meine alten Schulkameraden.',
    blanked: 'Ich treffe meine ___ Schulkameraden.',
    baseAdjective: 'alt',
    expectedAnswer: 'alten',
    gloss: 'I am meeting my old schoolmates.'
  },
  {
    id: 'adj-strong-dat-pl-003',
    level: 'B1',
    inflection: 'strong',
    case: 'dative',
    gender: 'plural',
    preceding: 'possessive',
    sentence: 'Er hilft seinen jüngeren Geschwistern.',
    blanked: 'Er hilft seinen ___ Geschwistern.',
    baseAdjective: 'jünger',
    expectedAnswer: 'jüngeren',
    gloss: 'He helps his younger siblings.'
  }
]
