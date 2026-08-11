// Shared deterministic sampling + grading for the Dativ module's offline
// drills (ADR-0007 family). No Vue/DOM — runners own their own ref state,
// this module owns the pure layer: filter → sample → build → grade.

import { shuffle } from '../data/pool'
import { checkText } from './drillGrading'
import { DATIVE_VERBS, type DativeVerbEntry } from '../data/dativeVerbs'
import {
  T1_CASE_ITEMS, T2_FORM_ITEMS, T3_TRAP_ITEMS,
  type CaseChoiceItem, type FormItem, type TrapItem, type DativeItemLevel,
} from '../data/dativeItems'

export interface DativeCard {
  id: string
  prompt: string
  answers: readonly string[]
  verb?: string
  explanation?: string
}

export function sampleDativeCards<T extends { id: string }>(pool: readonly T[], count: number): T[] {
  return shuffle(pool, Math.min(count, pool.length))
}

export function gradeDativeAnswer(given: string, answers: readonly string[]): boolean {
  if (answers.length === 0) return false
  return checkText(given, answers[0], [...answers.slice(1)])
}

export type DativeFamily = DativeVerbEntry['family']
export const DATIVE_FAMILIES: readonly DativeFamily[] = ['recipient', 'experiencer', 'co-agent']
export const FAMILY_LABELS: Record<DativeFamily, string> = {
  'recipient': 'Empfänger',
  'experiencer': 'Erlebender',
  'co-agent': 'Mit-Handelnder',
}

export interface DativeFilter {
  levels: DativeItemLevel[]
  families: DativeFamily[]
}

/** T1: the family filter narrows the DATIVE side only — accusative
 *  distractors always stay in, so a round is never one-button-winnable. */
export function filterCaseItems(f: DativeFilter): CaseChoiceItem[] {
  return T1_CASE_ITEMS.filter(i => f.levels.includes(i.level)
    && (i.answer === 'accusative' || f.families.includes(DATIVE_VERBS[i.verb].family)))
}

export function filterFormItems(f: DativeFilter): FormItem[] {
  return T2_FORM_ITEMS.filter(i => f.levels.includes(i.level)
    && f.families.includes(DATIVE_VERBS[i.verb].family))
}

export function filterTrapItems(f: DativeFilter): TrapItem[] {
  return T3_TRAP_ITEMS.filter(i => f.levels.includes(i.level)
    && f.families.includes(DATIVE_VERBS[i.verb].family))
}

export function buildCaseCards(items: readonly CaseChoiceItem[]): DativeCard[] {
  return items.map(i => ({
    id: i.id,
    prompt: i.verb,
    answers: [i.answer],
    verb: i.verb,
    explanation: i.answer === 'dative'
      ? DATIVE_VERBS[i.verb].coreIdeaExplanation
      : `${i.verb} ist kein Dativverb — es nimmt ein Akkusativobjekt.`,
  }))
}

export function buildFormCards(items: readonly FormItem[]): DativeCard[] {
  return items.map(i => ({
    id: i.id,
    prompt: i.sentence,
    answers: i.answers,
    verb: i.verb,
    explanation: DATIVE_VERBS[i.verb].coreIdeaExplanation,
  }))
}

export function buildTrapCards(items: readonly TrapItem[]): DativeCard[] {
  return items.map(i => ({
    id: i.id,
    prompt: i.sentence,
    answers: i.answers,
    verb: i.verb,
    explanation: DATIVE_VERBS[i.verb].coreIdeaExplanation,
  }))
}
