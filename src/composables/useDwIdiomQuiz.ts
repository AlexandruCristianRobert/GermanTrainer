// src/composables/useDwIdiomQuiz.ts
//
// Engine for the Direction Words T9 "idiom gap-fill" drill: one sentence with a
// single ___ gap standing for a WHOLE idiom surface ('hin und her', 'noch lange
// hin', 'hinter ihr her'), and 3–4 tappable options drawn from the closed
// DW_IDIOM_SURFACES inventory. Like useDwLexicalQuiz, this engine does NOT join a
// pool of collocations — DIRECTION_IDIOMS is authored standalone and filters
// directly by level (see src/data/directionIdioms.ts).
//
// DIRECTION_IDIOMS authors the answer FIRST in every option list, so shuffling is
// not cosmetic here: without it, index 0 would be correct on all 28 items and the
// drill would be winnable without reading any German. Each question's options are
// therefore a SHUFFLED COPY of item.options, built ONCE at construction and never
// re-rolled on re-render (a re-rolling computed would move the buttons under the
// learner's finger). `shuffle` copies its source, so the module-level bank is
// never sorted or reversed in place — nothing here may change that.
//
// Grading compares the picked surface against item.answer; a second pick on an
// answered question is a no-op. The reveal (built in the runner from
// `item.explanation`) names the meaning AND why the tempting near-miss fails.

import { computed, ref } from 'vue'
import { DIRECTION_IDIOMS, type DwIdiomItem } from '../data/directionIdioms'
import { type DirectionLevel } from '../data/directionWords'
import { createPool, shuffle, type FieldMatchers } from '../data/pool'

export type DwIdiomFilter = {
  levels?: DirectionLevel[]
}

const idiomPool = createPool<DwIdiomItem, DwIdiomFilter>(
  DIRECTION_IDIOMS,
  {
    levels: i => i.level,
  } satisfies FieldMatchers<DwIdiomItem, DwIdiomFilter>
)

/** Items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterIdiomItems(f: DwIdiomFilter = {}): DwIdiomItem[] {
  return idiomPool.filter(f)
}

/** A fresh random sample of up to `count` items matching the filter. */
export function sampleIdiomItems(count: number, f: DwIdiomFilter = {}): DwIdiomItem[] {
  return idiomPool.sample(count, f)
}

export interface DwIdiomQuestion {
  item: DwIdiomItem
  /** The item's own options in shuffled order — a COPY, built once, never re-rolled. */
  options: string[]
  /** The learner's picked surface, once answered. */
  picked: string | null
  isCorrect: boolean | null
}

/**
 * Builds the option row for one item: a shuffled COPY of item.options (shuffle
 * never mutates its source, so DIRECTION_IDIOMS stays as authored). The shuffle
 * is what stops the authored answer-first order from leaking into the UI.
 */
function buildOptions(item: DwIdiomItem): string[] {
  return shuffle(item.options)
}

export function useDwIdiomQuiz(items: DwIdiomItem[]) {
  const questions = ref<DwIdiomQuestion[]>(items.map(item => ({
    item, options: buildOptions(item), picked: null, isCorrect: null,
  })))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): DwIdiomItem[] =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.item)
  )

  /** Grades the tapped surface against the current item's authored answer. */
  function pick(surface: string): void {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.picked = surface
    q.isCorrect = surface === q.item.answer
  }

  function advance(): void {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }

  return {
    questions, currentIndex, current, finished, total, score, wrongItems,
    pick, advance,
  }
}
