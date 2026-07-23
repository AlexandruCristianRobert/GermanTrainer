// src/composables/useDaContrastQuiz.ts
//
// Engine for the T13 "meaning contrast" drill: one verb, competing prepositions,
// different meanings (sich freuen auf vs. über, leiden an vs. unter, bestehen auf
// vs. aus …). Unlike the other da-compound drills, this engine does NOT join a
// pool of collocations — DA_CONTRAST is authored standalone and filters directly
// by level (see src/data/daContrast.ts).
//
// Options are always the item's CONTRAST_SETS entry's full option list (2-3
// entries, each carrying a preposition + a sense hook), in authored set order —
// never re-rolled, never re-ordered. The teaching moment lives in the reveal:
// EVERY option's sense line is shown, with the correct one highlighted, so a
// learner sees both (or all three) readings side by side regardless of which
// they picked.

import { computed, ref } from 'vue'
import { CONTRAST_SETS, DA_CONTRAST, type ContrastItem, type ContrastOption } from '../data/daContrast'
import { type CollocationLevel } from '../data/collocations'
import { createPool, type FieldMatchers } from '../data/pool'

const setByKey = new Map(CONTRAST_SETS.map(s => [s.key, s]))

function setFor(item: ContrastItem) {
  const set = setByKey.get(item.contrastKey)
  if (!set) throw new Error(`Unknown contrastKey: ${item.contrastKey}`)
  return set
}

export type ContrastFilter = {
  levels?: CollocationLevel[]
}

const contrastPool = createPool<ContrastItem, ContrastFilter>(
  DA_CONTRAST,
  {
    levels: i => i.level,
  } satisfies FieldMatchers<ContrastItem, ContrastFilter>
)

/** Items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterContrastItems(f: ContrastFilter = {}): ContrastItem[] {
  return contrastPool.filter(f)
}

/** A fresh random sample of up to `count` items matching the filter. */
export function sampleContrastItems(count: number, f: ContrastFilter = {}): ContrastItem[] {
  return contrastPool.sample(count, f)
}

export interface ContrastQuestion {
  item: ContrastItem
  /** The verb headword its set is keyed on ('sich freuen', 'leiden' …), for display. */
  word: string
  /** The item's set's full option list (2-3), authored order — every one shown on reveal. */
  options: ContrastOption[]
  /** The learner's picked preposition, once answered. */
  picked: string
  isCorrect: boolean | null
}

export function useDaContrastQuiz(items: ContrastItem[]) {
  const questions = ref<ContrastQuestion[]>(items.map(item => {
    const set = setFor(item)
    return { item, word: set.word, options: set.options, picked: '', isCorrect: null }
  }))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): ContrastItem[] =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.item)
  )

  /** Grades the tapped preposition against the current item's correct answer. */
  function pickOption(preposition: string): void {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.picked = preposition
    q.isCorrect = preposition === q.item.correct
  }

  function advance(): void {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }

  return {
    questions, currentIndex, current, finished, total, score, wrongItems,
    pickOption, advance,
  }
}

/** Splits a sentence around its single `___` gap into the text before/after it. */
export function splitContrastSentence(sentence: string): { pre: string; post: string } {
  const idx = sentence.indexOf('___')
  if (idx < 0) return { pre: sentence, post: '' }
  return { pre: sentence.slice(0, idx), post: sentence.slice(idx + 3) }
}
