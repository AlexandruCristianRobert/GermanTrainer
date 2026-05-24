// German pronouns — personal, possessive (standalone), reflexive.
// Used by the declension v2 pronoun-forms quiz.
//
// Note on reflexives: they have no nominative or genitive form. The dash '—'
// is stored explicitly so the quiz runner can skip those rows visibly.

import type { DeclCase } from './declension'

export type PronounCategory = 'personal' | 'possessive' | 'reflexive'

export interface PronounEntry {
  id: string
  category: PronounCategory
  /** Nominative dictionary form, also the prompt headline. */
  nominative: string
  /** English gloss shown on the result page. */
  english?: string
  /** German person/number label, e.g. "1st person singular". */
  meta?: string
  /** Reflexive nom/gen are stored as '—' (em dash) — runner treats them as skipped. */
  forms: Record<DeclCase, string>
}

export const PRONOUN_CATEGORIES = ['personal', 'possessive', 'reflexive'] as const

export const PRONOUNS: PronounEntry[] = [
  // ── Personal pronouns ─────────────────────────────────────
  { id: 'pers-ich', category: 'personal', nominative: 'ich', english: 'I',
    meta: '1st person singular',
    forms: { nominative: 'ich', accusative: 'mich', dative: 'mir', genitive: 'meiner' } },
  { id: 'pers-du', category: 'personal', nominative: 'du', english: 'you (sg, informal)',
    meta: '2nd person singular',
    forms: { nominative: 'du', accusative: 'dich', dative: 'dir', genitive: 'deiner' } },
  { id: 'pers-er', category: 'personal', nominative: 'er', english: 'he',
    meta: '3rd person singular masculine',
    forms: { nominative: 'er', accusative: 'ihn', dative: 'ihm', genitive: 'seiner' } },
  { id: 'pers-sie-s', category: 'personal', nominative: 'sie', english: 'she',
    meta: '3rd person singular feminine',
    forms: { nominative: 'sie', accusative: 'sie', dative: 'ihr', genitive: 'ihrer' } },
  { id: 'pers-es', category: 'personal', nominative: 'es', english: 'it',
    meta: '3rd person singular neuter',
    forms: { nominative: 'es', accusative: 'es', dative: 'ihm', genitive: 'seiner' } },
  { id: 'pers-wir', category: 'personal', nominative: 'wir', english: 'we',
    meta: '1st person plural',
    forms: { nominative: 'wir', accusative: 'uns', dative: 'uns', genitive: 'unser' } },
  { id: 'pers-ihr', category: 'personal', nominative: 'ihr', english: 'you (pl, informal)',
    meta: '2nd person plural',
    forms: { nominative: 'ihr', accusative: 'euch', dative: 'euch', genitive: 'euer' } },
  { id: 'pers-sie-pl', category: 'personal', nominative: 'sie', english: 'they',
    meta: '3rd person plural',
    forms: { nominative: 'sie', accusative: 'sie', dative: 'ihnen', genitive: 'ihrer' } },
  { id: 'pers-Sie', category: 'personal', nominative: 'Sie', english: 'you (formal)',
    meta: 'formal address',
    forms: { nominative: 'Sie', accusative: 'Sie', dative: 'Ihnen', genitive: 'Ihrer' } },

  // ── Reflexive pronouns ────────────────────────────────────
  // Reflexives have no nominative or genitive form — dashes are stored
  // explicitly so the quiz runner can render them as skipped rows.
  { id: 'refl-sich', category: 'reflexive', nominative: 'sich',
    english: 'himself / herself / itself / themselves',
    meta: '3rd person reflexive (sg + pl)',
    forms: { nominative: '—', accusative: 'sich', dative: 'sich', genitive: '—' } },
  { id: 'refl-uns', category: 'reflexive', nominative: 'uns',
    english: 'ourselves',
    meta: '1st person plural reflexive',
    forms: { nominative: '—', accusative: 'uns', dative: 'uns', genitive: '—' } },

  // ── Possessive pronouns (standalone) ──────────────────────
  // The "lemma" is the masculine nominative — drilled in all four cases.
  // Different from the determiner-style possessives in the decline-the-phrase
  // quiz, which precede a noun.
  { id: 'poss-meiner', category: 'possessive', nominative: 'meiner',
    english: 'mine (m. nom.)', meta: 'standalone possessive · masculine',
    forms: { nominative: 'meiner', accusative: 'meinen', dative: 'meinem', genitive: 'meines' } },
  { id: 'poss-deiner', category: 'possessive', nominative: 'deiner',
    english: 'yours (m. nom.)', meta: 'standalone possessive · masculine',
    forms: { nominative: 'deiner', accusative: 'deinen', dative: 'deinem', genitive: 'deines' } },
  { id: 'poss-seiner', category: 'possessive', nominative: 'seiner',
    english: 'his / its (m. nom.)', meta: 'standalone possessive · masculine',
    forms: { nominative: 'seiner', accusative: 'seinen', dative: 'seinem', genitive: 'seines' } },
  { id: 'poss-ihrer', category: 'possessive', nominative: 'ihrer',
    english: 'hers / theirs (m. nom.)', meta: 'standalone possessive · masculine',
    forms: { nominative: 'ihrer', accusative: 'ihren', dative: 'ihrem', genitive: 'ihres' } },
  { id: 'poss-unserer', category: 'possessive', nominative: 'unserer',
    english: 'ours (m. nom.)', meta: 'standalone possessive · masculine',
    forms: { nominative: 'unserer', accusative: 'unseren', dative: 'unserem', genitive: 'unseres' } },
  { id: 'poss-eurer', category: 'possessive', nominative: 'eurer',
    english: 'yours (pl, m. nom.)', meta: 'standalone possessive · masculine',
    forms: { nominative: 'eurer', accusative: 'euren', dative: 'eurem', genitive: 'eures' } }
]
