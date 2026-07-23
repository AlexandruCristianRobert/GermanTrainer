// src/composables/useDaDialogueQuiz.ts
//
// Engine for the T10 "dialogue" drill: closes the People-vs-things family by
// pairing a wo-question with its natural reply, both scaffolds keyed to the
// SAME collocation (see src/data/daDialogue.ts). Two independent gaps per
// card — the question's leading wo-compound and the reply's da-compound
// Korrelat — graded together via checkText; the card only counts as correct
// when BOTH slots do (all-or-nothing, same precedent as useStammformenQuiz).
//
// Objects here are always things/abstracts (DA_DIALOGUE is thing-only), so
// unlike T9 there is no objectKind branch — alternatives for both slots come
// from the joined collocation's alsoAccept preps, translated through
// woCompound/daCompound respectively.

import { computed, ref } from 'vue'
import { DA_DIALOGUE, dialogueAnswers, type DialogueItem } from '../data/daDialogue'
import { daCompound, woCompound } from '../data/daCompounds'
import {
  COLLOCATIONS, type Collocation, type CollocationLevel, type CollocationRole,
} from '../data/collocations'
import { createPool, type FieldMatchers } from '../data/pool'
import { checkText } from './drillGrading'

/** A dialogue item joined to the collocation it references (by `collocationId`). */
export interface DialogueJoinedItem {
  item: DialogueItem
  colloc: Collocation
}

const collocationsById = new Map(COLLOCATIONS.map(c => [c.id, c]))

function joinItem(item: DialogueItem): DialogueJoinedItem {
  const colloc = collocationsById.get(item.collocationId)
  if (!colloc) throw new Error(`Unknown collocationId: ${item.collocationId}`)
  return { item, colloc }
}

/** All DA_DIALOGUE items, joined to their collocations. */
export function joinDialogueItems(): DialogueJoinedItem[] {
  return DA_DIALOGUE.map(joinItem)
}

/**
 * Every preposition this drill's dataset actually governs — the universe for
 * the prep chip row. Derived from the dataset, not COLLOCATIONS, since not
 * every collocation has a dialogue item.
 */
export const DIALOGUE_PREPS: string[] =
  Array.from(new Set(joinDialogueItems().map(ji => ji.colloc.preposition))).sort()

export type DialogueFilter = {
  levels?: CollocationLevel[]
  roles?: CollocationRole[]
  preps?: string[]
}

const dialoguePool = createPool<DialogueJoinedItem, DialogueFilter>(
  joinDialogueItems(),
  {
    levels: ji => ji.colloc.level,
    roles: ji => ji.colloc.role,
    preps: ji => ji.colloc.preposition,
  } satisfies FieldMatchers<DialogueJoinedItem, DialogueFilter>
)

/** Joined items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterDialogueItems(f: DialogueFilter = {}): DialogueJoinedItem[] {
  return dialoguePool.filter(f)
}

/** A fresh random sample of up to `count` joined items matching the filter. */
export function sampleDialogueItems(count: number, f: DialogueFilter = {}): DialogueJoinedItem[] {
  return dialoguePool.sample(count, f)
}

export interface DialogueQuestion extends DialogueJoinedItem {
  /** The two correct fills, derived from the joined item via dialogueAnswers. */
  answer: { wo: string; da: string }
  /** The learner's typed text for each slot, once answered. */
  woTyped: string
  daTyped: string
  /** Per-slot verdicts, for the reveal. */
  woOk: boolean | null
  daOk: boolean | null
  /** All-or-nothing: true only when both slots are correct. */
  isCorrect: boolean | null
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Type-mode alternatives for each slot, derived from the collocation's alsoAccept. */
function buildAlternatives(colloc: Collocation): { woAlts: string[]; daAlts: string[] } {
  const alsoAccept = colloc.alsoAccept ?? []
  return {
    woAlts: alsoAccept.map(a => cap(woCompound(a.preposition))),
    daAlts: alsoAccept.map(a => daCompound(a.preposition)),
  }
}

export function useDaDialogueQuiz(items: DialogueJoinedItem[]) {
  const questions = ref<DialogueQuestion[]>(items.map(ji => ({
    ...ji,
    answer: dialogueAnswers(ji.item),
    woTyped: '',
    daTyped: '',
    woOk: null,
    daOk: null,
    isCorrect: null,
  })))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): DialogueJoinedItem[] =>
    questions.value
      .filter(q => q.isCorrect === false)
      .map(q => ({ item: q.item, colloc: q.colloc }))
  )

  /**
   * Grades both gaps against dialogueAnswers(item) via checkText (umlaut-folding,
   * case-insensitive; alsoAccept alternatives count per-slot). The card is only
   * correct when BOTH slots are (all-or-nothing, Stammformen precedent).
   */
  function submitBoth(woInput: string, daInput: string): void {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.woTyped = woInput
    q.daTyped = daInput
    const { woAlts, daAlts } = buildAlternatives(q.colloc)
    const woOk = checkText(woInput, q.answer.wo, woAlts)
    const daOk = checkText(daInput, q.answer.da, daAlts)
    q.woOk = woOk
    q.daOk = daOk
    q.isCorrect = woOk && daOk
  }

  function advance(): void {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }

  return {
    questions, currentIndex, current, finished, total, score, wrongItems,
    submitBoth, advance,
  }
}

/**
 * Splits a scaffold around its single gap (`___`), returning what precedes and
 * follows it. Both DA_DIALOGUE scaffolds carry exactly one gap (dataset
 * invariant in tests/data/daDialogue.test.ts) but at different positions —
 * questionScaffold's gap always leads; answerScaffold's sits mid-sentence.
 */
export function splitScaffold(scaffold: string): { pre: string; post: string } {
  const idx = scaffold.indexOf('___')
  if (idx < 0) return { pre: scaffold, post: '' }
  return { pre: scaffold.slice(0, idx), post: scaffold.slice(idx + 3) }
}
