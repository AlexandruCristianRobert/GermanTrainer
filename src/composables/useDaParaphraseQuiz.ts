// src/composables/useDaParaphraseQuiz.ts
//
// Engine for the T12 "paraphrase" drill: closes the Korrelat & meaning family by
// showing the SAME idea two ways — a noun-phrase sentence (bare governed
// preposition gap) and its clause paraphrase (Korrelat da-compound gap), both
// keyed to the SAME collocation (see src/data/daParaphrase.ts). Two independent
// gaps per card — the noun sentence's bare preposition and the clause
// sentence's da-compound Korrelat — graded together via checkText; the card
// only counts as correct when BOTH slots do (all-or-nothing, same precedent as
// useDaDialogueQuiz).
//
// Objects here are always things/abstracts paraphrased by a clause (DA_PARAPHRASE
// is thing-only), so unlike T9 there is no objectKind branch — alternatives for
// both slots come from the joined collocation's alsoAccept preps, used bare for
// the noun-sentence slot and translated through daCompound for the clause slot.

import { computed, ref } from 'vue'
import { DA_PARAPHRASE, paraphraseAnswers, type ParaphraseItem } from '../data/daParaphrase'
import { daCompound } from '../data/daCompounds'
import { COLLOCATIONS, type Collocation, type CollocationLevel } from '../data/collocations'
import { createPool, type FieldMatchers } from '../data/pool'
import { checkText } from './drillGrading'

/** A paraphrase item joined to the collocation it references (by `collocationId`). */
export interface ParaphraseJoinedItem {
  item: ParaphraseItem
  colloc: Collocation
}

const collocationsById = new Map(COLLOCATIONS.map(c => [c.id, c]))

function joinItem(item: ParaphraseItem): ParaphraseJoinedItem {
  const colloc = collocationsById.get(item.collocationId)
  if (!colloc) throw new Error(`Unknown collocationId: ${item.collocationId}`)
  return { item, colloc }
}

/** All DA_PARAPHRASE items, joined to their collocations. */
export function joinParaphraseItems(): ParaphraseJoinedItem[] {
  return DA_PARAPHRASE.map(joinItem)
}

/**
 * Every preposition this drill's dataset actually governs — the universe for
 * the prep chip row. Derived from the dataset, not COLLOCATIONS, since not
 * every collocation has a paraphrase item.
 */
export const PARAPHRASE_PREPS: string[] =
  Array.from(new Set(joinParaphraseItems().map(ji => ji.colloc.preposition))).sort()

export type ParaphraseFilter = {
  levels?: CollocationLevel[]
  preps?: string[]
}

const paraphrasePool = createPool<ParaphraseJoinedItem, ParaphraseFilter>(
  joinParaphraseItems(),
  {
    levels: ji => ji.colloc.level,
    preps: ji => ji.colloc.preposition,
  } satisfies FieldMatchers<ParaphraseJoinedItem, ParaphraseFilter>
)

/** Joined items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterParaphraseItems(f: ParaphraseFilter = {}): ParaphraseJoinedItem[] {
  return paraphrasePool.filter(f)
}

/** A fresh random sample of up to `count` joined items matching the filter. */
export function sampleParaphraseItems(count: number, f: ParaphraseFilter = {}): ParaphraseJoinedItem[] {
  return paraphrasePool.sample(count, f)
}

export interface ParaphraseQuestion extends ParaphraseJoinedItem {
  /** The two correct fills, derived from the joined item via paraphraseAnswers. */
  answer: { prep: string; korrelat: string }
  /** The learner's typed text for each slot, once answered. */
  prepTyped: string
  korrelatTyped: string
  /** Per-slot verdicts, for the reveal. */
  prepOk: boolean | null
  korrelatOk: boolean | null
  /** All-or-nothing: true only when both slots are correct. */
  isCorrect: boolean | null
}

/** Type-mode alternatives for each slot, derived from the collocation's alsoAccept. */
function buildAlternatives(colloc: Collocation): { prepAlts: string[]; korrelatAlts: string[] } {
  const alsoAccept = colloc.alsoAccept ?? []
  return {
    prepAlts: alsoAccept.map(a => a.preposition),
    korrelatAlts: alsoAccept.map(a => daCompound(a.preposition)),
  }
}

export function useDaParaphraseQuiz(items: ParaphraseJoinedItem[]) {
  const questions = ref<ParaphraseQuestion[]>(items.map(ji => ({
    ...ji,
    answer: paraphraseAnswers(ji.item),
    prepTyped: '',
    korrelatTyped: '',
    prepOk: null,
    korrelatOk: null,
    isCorrect: null,
  })))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): ParaphraseJoinedItem[] =>
    questions.value
      .filter(q => q.isCorrect === false)
      .map(q => ({ item: q.item, colloc: q.colloc }))
  )

  /**
   * Grades both gaps against paraphraseAnswers(item) via checkText (umlaut-folding,
   * case-insensitive; alsoAccept alternatives count per-slot). The card is only
   * correct when BOTH slots are (all-or-nothing, Dialogue precedent).
   */
  function submitBoth(prepInput: string, korrelatInput: string): void {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.prepTyped = prepInput
    q.korrelatTyped = korrelatInput
    const { prepAlts, korrelatAlts } = buildAlternatives(q.colloc)
    const prepOk = checkText(prepInput, q.answer.prep, prepAlts)
    const korrelatOk = checkText(korrelatInput, q.answer.korrelat, korrelatAlts)
    q.prepOk = prepOk
    q.korrelatOk = korrelatOk
    q.isCorrect = prepOk && korrelatOk
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
 * Splits a sentence around its single gap (`___`), returning what precedes and
 * follows it. Both nounSentence and clauseSentence carry exactly one gap
 * (dataset invariant in tests/data/daParaphrase.test.ts), always mid-sentence.
 */
export function splitParaphraseSentence(sentence: string): { pre: string; post: string } {
  const idx = sentence.indexOf('___')
  if (idx < 0) return { pre: sentence, post: '' }
  return { pre: sentence.slice(0, idx), post: sentence.slice(idx + 3) }
}
