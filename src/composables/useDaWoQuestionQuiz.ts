// src/composables/useDaWoQuestionQuiz.ts
//
// Engine for the T9 "wo-question" drill: a natural statement uses a fixed-preposition
// collocation with an object whose kind (thing/person) is NOT flagged in the UI — the
// learner must judge it themselves (see WoQuestionRunner.vue). They then type the
// interrogative that fills the scaffold's leading gap:
//   • THING object  → a wo-compound (Worauf, Woran, …).
//   • PERSON object → preposition + wen/wem (Auf wen, Mit wem, …), NEVER a
//     wo-compound (see CONTEXT.md → "Da-compound").
// Joins the authored DA_WO_QUESTION dataset to COLLOCATIONS (for the preposition, case,
// role, level, and reveal copy) and grades the learner's answer against
// woQuestionAnswer(item) — derived, never stored.
//
// Like T6–T8, this joins its OWN authored dataset rather than the substitution pool —
// not every collocation has a natural wo-question item — so filtering/prep universe
// are scoped to THIS dataset.

import { computed, ref } from 'vue'
import { DA_WO_QUESTION, PERSON_QUESTION, woQuestionAnswer, type WoQuestionItem } from '../data/daWoQuestion'
import { woCompound } from '../data/daCompounds'
import {
  COLLOCATIONS, type Collocation, type CollocationLevel, type CollocationRole,
} from '../data/collocations'
import { createPool, type FieldMatchers } from '../data/pool'
import { checkText } from './drillGrading'

/** A wo-question item joined to the collocation it references (by `collocationId`). */
export interface WoJoinedItem {
  item: WoQuestionItem
  colloc: Collocation
}

const collocationsById = new Map(COLLOCATIONS.map(c => [c.id, c]))

function joinItem(item: WoQuestionItem): WoJoinedItem {
  const colloc = collocationsById.get(item.collocationId)
  if (!colloc) throw new Error(`Unknown collocationId: ${item.collocationId}`)
  return { item, colloc }
}

/** All DA_WO_QUESTION items, joined to their collocations. */
export function joinWoQuestionItems(): WoJoinedItem[] {
  return DA_WO_QUESTION.map(joinItem)
}

/**
 * Every preposition this drill's dataset actually governs — the universe for the
 * prep chip row. Derived from the dataset, not COLLOCATIONS, since not every
 * collocation has a wo-question item.
 */
export const WO_QUESTION_PREPS: string[] =
  Array.from(new Set(joinWoQuestionItems().map(ji => ji.colloc.preposition))).sort()

export type WoQuestionFilter = {
  levels?: CollocationLevel[]
  roles?: CollocationRole[]
  preps?: string[]
}

const woQuestionPool = createPool<WoJoinedItem, WoQuestionFilter>(
  joinWoQuestionItems(),
  {
    levels: ji => ji.colloc.level,
    roles: ji => ji.colloc.role,
    preps: ji => ji.colloc.preposition,
  } satisfies FieldMatchers<WoJoinedItem, WoQuestionFilter>
)

/** Joined items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterWoQuestionItems(f: WoQuestionFilter = {}): WoJoinedItem[] {
  return woQuestionPool.filter(f)
}

/** A fresh random sample of up to `count` joined items matching the filter. */
export function sampleWoQuestionItems(count: number, f: WoQuestionFilter = {}): WoJoinedItem[] {
  return woQuestionPool.sample(count, f)
}

export interface WoQuestionQuestion extends WoJoinedItem {
  /** The correct interrogative, derived from the joined item via woQuestionAnswer. */
  answer: string
  /** The learner's typed text, once answered. */
  typed: string
  isCorrect: boolean | null
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Type-mode alternatives derived from the collocation's alsoAccept, split by kind. */
function buildAlternatives(item: WoQuestionItem, colloc: Collocation): string[] {
  const alsoAccept = colloc.alsoAccept ?? []
  if (item.objectKind === 'thing') return alsoAccept.map(a => cap(woCompound(a.preposition)))
  return alsoAccept.map(a => `${cap(a.preposition)} ${PERSON_QUESTION[a.case]}`)
}

export function useDaWoQuestionQuiz(items: WoJoinedItem[]) {
  const questions = ref<WoQuestionQuestion[]>(items.map(ji => ({
    ...ji,
    answer: woQuestionAnswer(ji.item),
    typed: '',
    isCorrect: null,
  })))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): WoJoinedItem[] =>
    questions.value
      .filter(q => q.isCorrect === false)
      .map(q => ({ item: q.item, colloc: q.colloc }))
  )

  /** Type-only grading: umlaut-folding, case-insensitive; alsoAccept alternatives count as correct. */
  function submitText(input: string): void {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.typed = input
    q.isCorrect = checkText(input, q.answer, buildAlternatives(q.item, q.colloc))
  }

  function advance(): void {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }

  return {
    questions, currentIndex, current, finished, total, score, wrongItems,
    submitText, advance,
  }
}

/**
 * Splits the item's scaffold around its leading gap (always `___ `, per the dataset
 * invariant in tests/data/daWoQuestion.test.ts), returning what remains after it.
 */
export function splitWoScaffold(item: WoQuestionItem): { post: string } {
  const GAP = '___ '
  return { post: item.scaffold.startsWith(GAP) ? item.scaffold.slice(GAP.length) : item.scaffold }
}
