// src/composables/useDaCaseQuiz.ts
//
// Engine for the T5 "compound → case" drill: the learner sees a natural
// sentence USING a da-compound (the substitution pool's stem, gap filled)
// and must pick the case the underlying collocation governs — Akkusativ or
// Dativ. No new dataset: this joins the same substitution pool as T3/T4
// (useDaSubstitutionQuiz) and re-derives the filled sentence + the correct
// case(s) from the joined collocation.

import { computed, ref } from 'vue'
import type { JoinedItem } from './useDaSubstitutionQuiz'
import { splitGap, substitutionAnswer } from './useDaSubstitutionQuiz'
import type { CollocationCase } from '../data/collocations'

export interface CaseQuestion extends JoinedItem {
  /** The stem with its gap filled — a natural sentence containing the da-compound. */
  sentence: { pre: string; compound: string; post: string }
  /** Every case the dataset grades correct for THIS preposition (primary + same-prep alsoAccept). */
  acceptedCases: CollocationCase[]
  picked: CollocationCase | null
  isCorrect: boolean | null
}

export function buildCaseQuestion(ji: JoinedItem): Omit<CaseQuestion, 'picked' | 'isCorrect'> {
  const { pre, post } = splitGap(ji.item.stem)
  const compound = substitutionAnswer(ji.item)
  const acceptedCases = Array.from(new Set([
    ji.colloc.case,
    ...(ji.colloc.alsoAccept ?? [])
      .filter(a => a.preposition === ji.colloc.preposition)
      .map(a => a.case),
  ]))
  return { ...ji, sentence: { pre, compound, post }, acceptedCases }
}

export function useDaCaseQuiz(items: JoinedItem[]) {
  const questions = ref<CaseQuestion[]>(items.map(ji => ({
    ...buildCaseQuestion(ji), picked: null, isCorrect: null,
  })))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): JoinedItem[] =>
    questions.value
      .filter(q => q.isCorrect === false)
      .map(q => ({ item: q.item, colloc: q.colloc }))
  )

  /** Grade the current question: correct iff the picked case is one of `acceptedCases`. */
  function pick(c: CollocationCase): void {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.picked = c
    q.isCorrect = q.acceptedCases.includes(c)
  }

  function advance(): void {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }

  return {
    questions, currentIndex, current, finished, total, score, wrongItems,
    pick, advance,
  }
}
