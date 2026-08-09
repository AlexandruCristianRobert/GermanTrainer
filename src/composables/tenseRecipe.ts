//
// How a German form is built, for the tense badge above a sentence prompt.
//
// Two halves, deliberately separate: TENSE_RECIPE is the generic formula
// ("wird + Partizip II") and never changes; the example is that formula applied
// to the verb this very sentence drills ("wird gekauft"), so an irregular
// Partizip II or a separable prefix shows up where the learner needs it.
//
// The example comes from conjugate() rather than string surgery — the auxiliary
// choice (haben/sein), the "worden" tail and the prefix rules already live
// there and must not be re-derived.
//
// Distinct from TENSE_PROMPT_HINTS in useVerbSentenceQuiz: that one is prose
// written for the generator model, this one is a formula written for a learner.
//
import { VERBS, type Verb, type VerbTense } from '../data/verbs'
import { conjugate } from './conjugate'

/** The construction formula shown when the tense badge is flipped. */
export const TENSE_RECIPE: Record<VerbTense, string> = {
  praesens: 'Stamm + -e/-st/-t',
  imperativ: 'Stamm ohne Endung',
  perfekt: 'haben/sein + Partizip II',
  praeteritum: 'Präteritumstamm + Endung',
  plusquamperfekt: 'hatte/war + Partizip II',
  futur1: 'wird + Infinitiv',
  futur2: 'wird + Partizip II + haben/sein',
  konjunktiv1: 'Stamm + -e/-est/-e',
  konjunktiv2: 'würde + Infinitiv / Präteritum mit Umlaut',
  passivPraesens: 'wird + Partizip II',
  passivPraeteritum: 'wurde + Partizip II',
  passivPerfekt: 'ist + Partizip II + worden',
  passivPlusquamperfekt: 'war + Partizip II + worden',
  passivFutur1: 'wird + Partizip II + werden',
  passivKonjunktiv2: 'würde + Partizip II + werden'
}

export interface TenseRecipe {
  /** Generic formula for the tense. */
  formula: string
  /** The formula applied to this sentence's verb(s), or null when none of the
   *  infinitives is in the verb pool. */
  example: string | null
}

const BY_INFINITIVE: ReadonlyMap<string, Verb> = new Map(VERBS.map(v => [v.german, v]))

/** The Imperativ has no er/sie/es row — its rows are du/ihr/Sie, so the
 *  canonical example is the du form at index 0. Every other tense uses the
 *  third-person singular, the form a sentence prompt most often needs. */
function exampleRowIndex(tense: VerbTense): number {
  return tense === 'imperativ' ? 0 : 2
}

export function buildTenseRecipe(tense: VerbTense, infinitives: readonly string[]): TenseRecipe {
  const seen = new Set<string>()
  for (const infinitive of infinitives) {
    const verb = BY_INFINITIVE.get(infinitive)
    if (!verb) continue
    const form = conjugate(verb, tense)[exampleRowIndex(tense)]?.expected
    if (form) seen.add(form)
  }
  return {
    formula: TENSE_RECIPE[tense],
    example: seen.size > 0 ? [...seen].join(' · ') : null
  }
}
