// src/composables/useDirectionRegisterQuiz.ts
//
// Engine for the Direction Words "register" drill (Phase 3 T4): judge one
// authored phrase — is it Standard German (fine in speech AND writing),
// colloquial/spoken-only, or ungrammatical in every register? Mirrors
// useDaRegisterQuiz.ts one-for-one, with one structural delta: the filter is
// a custom function, not bare createPool — an item matches when its level
// passes AND (pair === null OR pair is in the selected pairs), so
// pair-independent items (bare hin/her, wo-splits, "Komm hier") always show
// up regardless of which [Adverb pair] chips are selected (see
// src/data/directionRegister.ts).
//
// Every question's THREE options are FIXED and in a stable authoring order —
// never shuffled, never re-rolled, always the same three verdicts/labels
// (DW_REGISTER_OPTIONS). Grading compares the picked verdict against
// item.verdict. The reveal always shows the explanation; for 'wrong' items
// the runner additionally strikes through the authored phrase and shows the
// corrected form named in the explanation (see dwCorrectedForm below).

import { computed, ref } from 'vue'
import {
  DIRECTION_REGISTER, type DwRegisterItem, type DwRegisterVerdict,
} from '../data/directionRegister'
import { type DirectionLevel } from '../data/directionWords'
import { shuffle } from '../data/pool'

export type { DwRegisterVerdict }

export type DwRegisterFilter = {
  levels?: DirectionLevel[]
  pairs?: string[]
}

function matchesLevel(item: DwRegisterItem, levels?: DirectionLevel[]): boolean {
  return !levels || levels.length === 0 || levels.includes(item.level)
}

/**
 * pairs omitted → no pair filtering at all (matches every item, tagged or
 * not). pairs given (even []) → an item matches when it's pair-independent
 * (pair === null) OR its pair is one of the selected pairs. So an empty
 * array excludes every pair-tagged item but still keeps every null-pair one.
 */
function matchesPair(item: DwRegisterItem, pairs?: string[]): boolean {
  if (pairs === undefined) return true
  return item.pair === null || pairs.includes(item.pair)
}

/** Items matching the filter (an empty/omitted `levels` matches every level; see matchesPair for `pairs`). */
export function filterDwRegisterItems(f: DwRegisterFilter = {}): DwRegisterItem[] {
  return DIRECTION_REGISTER.filter(item => matchesLevel(item, f.levels) && matchesPair(item, f.pairs))
}

/** A fresh random sample of up to `count` items matching the filter. */
export function sampleDwRegisterItems(count: number, f: DwRegisterFilter = {}): DwRegisterItem[] {
  const pool = filterDwRegisterItems(f)
  return shuffle(pool, Math.min(count, pool.length))
}

export interface DwRegisterOption {
  verdict: DwRegisterVerdict
  label: string
}

/** The three fixed judgment options, in stable order — identical on every question. */
export const DW_REGISTER_OPTIONS: DwRegisterOption[] = [
  { verdict: 'standard', label: 'Standard – auch geschrieben' },
  { verdict: 'spoken', label: 'Nur gesprochen' },
  { verdict: 'wrong', label: 'Immer falsch' },
]

export interface DwRegisterQuestion {
  item: DwRegisterItem
  /** Always DW_REGISTER_OPTIONS, in that fixed order — never shuffled, never re-rolled. */
  options: DwRegisterOption[]
  /** The learner's picked verdict, once answered. */
  picked: DwRegisterVerdict | null
  isCorrect: boolean | null
}

export function useDwRegisterQuiz(items: DwRegisterItem[]) {
  const questions = ref<DwRegisterQuestion[]>(items.map(item => ({
    item, options: DW_REGISTER_OPTIONS, picked: null, isCorrect: null,
  })))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): DwRegisterItem[] =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.item)
  )

  /** Grades the tapped verdict against the current item's correct verdict. */
  function pick(verdict: DwRegisterVerdict): void {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.picked = verdict
    q.isCorrect = verdict === q.item.verdict
  }

  function advance(): void {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }

  return {
    questions, currentIndex, current, finished, total, score, wrongItems,
    pick, advance,
  }
}

/**
 * For a 'wrong' item, extracts the corrected form named in its explanation —
 * the LAST quoted string in the English half (after " / "), which every
 * DIRECTION_REGISTER 'wrong' item's explanation names as the one correct
 * form (see src/data/directionRegister.ts authoring convention). Returns
 * null for standard/spoken items, or if the explanation carries no quoted
 * form.
 */
export function dwCorrectedForm(item: DwRegisterItem): string | null {
  if (item.verdict !== 'wrong') return null
  const englishHalf = item.explanation.split(' / ')[1] ?? item.explanation
  const matches = [...englishHalf.matchAll(/"([^"]+)"/g)]
  if (matches.length === 0) return null
  return matches[matches.length - 1][1]
}
