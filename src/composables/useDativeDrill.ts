// Shared deterministic sampling + grading for the Dativ module's offline
// drills (ADR-0007 family). No Vue/DOM — runners own their own ref state,
// this module owns the pure layer: filter → sample → build → grade.

import { computed, ref } from 'vue'
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

// ─── Phase 3+: shared question engine for the deterministic Dativ drills ───
// Mirrors useDirectionDrill's state machine. `ledgerKey` names the gt:dativeLedger
// item this card is an encounter of (a dative verb or adjective lemma) — or null
// for the rule-driven drills (T7/T8/T10/T12/T13), which are band-tracked only.

export interface DativeQuizCard {
  key: string
  prompt: string
  answers: string[]        // [0] canonical; the rest accepted alternatives (type mode)
  options: string[]        // pick-mode buttons; [] in type-only drills
  translation: string
  note: string | null      // teaching line revealed after grading
  ledgerKey: string | null
  sourceIndex: number      // index into the sampled source array (retry rebuild)
  picked: string | null
  typed: string | null
  isCorrect: boolean | null
}

export function useDativeQuiz(cards: DativeQuizCard[]) {
  const questions = ref<DativeQuizCard[]>(cards)
  const currentIndex = ref(0)
  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  const wrongIndexes = computed(() =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.sourceIndex))

  function pickOption(option: string) {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.picked = option
    q.isCorrect = q.answers.includes(option)
  }

  function submitText(input: string) {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    const cleaned = input.replace(/[.!?]+\s*$/, '')
    q.typed = input
    q.isCorrect = gradeDativeAnswer(cleaned, q.answers)
  }

  function advance() {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }

  return { questions, currentIndex, current, finished, pickOption, submitText, advance, score, total, wrongIndexes }
}
