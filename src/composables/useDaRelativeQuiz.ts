// src/composables/useDaRelativeQuiz.ts
//
// Engine for the T20 "relative clause" drill: one authored sentence with a
// single '___' gap right after the comma, in the relative-clause slot. The
// antecedent's kind decides which link is grammatical — the Duden three-way
// rule already encoded in relativeAccepted() (see src/data/daRelative.ts):
//
//   • 'indefinite' — only the wo-form is accepted (prep + pronoun is wrong).
//   • 'person'     — only prep + pronoun is accepted (the wo-form is wrong).
//   • 'thing'      — BOTH are accepted; prep + pronoun is the preferred,
//                    more careful variant (relativeAccepted lists it first).
//
// Like Homograph/Korrelat, this engine does NOT join a pool of collocations —
// DA_RELATIVE is authored standalone and filters directly by level.
//
// Every question's two options are [prepForm, woForm], shuffled once per
// question (never re-rolled). Grading checks the picked string against
// item's accepted set (relativeAccepted(item)) — for 'thing' items EITHER
// option is correct, so a 'thing' question can never be graded wrong.

import { computed, ref } from 'vue'
import { DA_RELATIVE, relativeAccepted, type RelativeItem } from '../data/daRelative'
import { type CollocationLevel } from '../data/collocations'
import { createPool, shuffle, type FieldMatchers } from '../data/pool'

export type RelativeFilter = {
  levels?: CollocationLevel[]
}

const relativePool = createPool<RelativeItem, RelativeFilter>(
  DA_RELATIVE,
  {
    levels: i => i.level,
  } satisfies FieldMatchers<RelativeItem, RelativeFilter>
)

/** Items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterRelativeItems(f: RelativeFilter = {}): RelativeItem[] {
  return relativePool.filter(f)
}

/** A fresh random sample of up to `count` items matching the filter. */
export function sampleRelativeItems(count: number, f: RelativeFilter = {}): RelativeItem[] {
  return relativePool.sample(count, f)
}

export interface RelativeQuestion {
  item: RelativeItem
  /** [prepForm, woForm], shuffled order — built once per item, never re-rolled. */
  options: string[]
  /** relativeAccepted(item), re-exposed (preferred form first for 'thing' items). */
  accepted: string[]
  /** The learner's picked option, once answered. */
  picked: string
  isCorrect: boolean | null
}

/** Builds the two-option set for one item (order shuffled, never re-rolled). */
function buildOptions(item: RelativeItem): string[] {
  return shuffle([item.prepForm, item.woForm])
}

export function useDaRelativeQuiz(items: RelativeItem[]) {
  const questions = ref<RelativeQuestion[]>(items.map(item => ({
    item, options: buildOptions(item), accepted: relativeAccepted(item), picked: '', isCorrect: null,
  })))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): RelativeItem[] =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.item)
  )

  /** Grades the tapped option against the current item's accepted set. */
  function pick(option: string): void {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.picked = option
    q.isCorrect = q.accepted.includes(option)
  }

  function advance(): void {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }

  return {
    questions, currentIndex, current, finished, total, score, wrongItems,
    pick, advance,
  }
}

/** Splits a sentence around its single `___` gap into the text before/after it. */
export function splitRelativeSentence(sentence: string): { pre: string; post: string } {
  const idx = sentence.indexOf('___')
  if (idx < 0) return { pre: sentence, post: '' }
  return { pre: sentence.slice(0, idx), post: sentence.slice(idx + 3) }
}
