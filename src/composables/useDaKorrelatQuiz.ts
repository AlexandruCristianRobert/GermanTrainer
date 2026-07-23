// src/composables/useDaKorrelatQuiz.ts
//
// Engine for the T11 "Korrelat" drill: pick-only completion of the gap before a
// dass-/ob-/w-/zu-clause. Every DA_KORRELAT item carries a korrelat STATUS
// (obligatory/optional/excluded); the correct compound (or null) is derived via
// korrelatAnswer(). Unlike the other da-compound drills, this engine does NOT
// join a pool of collocations and filter through it — it filters DA_KORRELAT
// directly by level + status, since excluded items carry no collocationId at all
// (see src/data/daKorrelat.ts).
//
// Options are always 4, built once per item (never re-rolled):
//   • obligatory/optional → shuffle([answer, distractor1, distractor2, KEIN_KORRELAT])
//   • excluded            → shuffle([KEIN_KORRELAT, c1, c2, c3])  (3 plausible compounds)
// Distractors are drawn from a small FIXED preposition pool (never randomly
// selected — only their on-screen ORDER is shuffled), excluding the item's own
// preposition where one exists, so a distractor never collides with the answer.
//
// Grading (korrelatAccepts) is the one place the "status" rule lives:
//   • obligatory → only the compound is correct
//   • excluded   → only KEIN_KORRELAT is correct
//   • optional   → BOTH the compound AND KEIN_KORRELAT are correct (dual-accept —
//                  the whole point of "optional": either reading is good German).

import { computed, ref } from 'vue'
import {
  DA_KORRELAT, korrelatAnswer, type KorrelatItem, type KorrelatStatus,
} from '../data/daKorrelat'
import { daCompound } from '../data/daCompounds'
import { COLLOCATIONS, type CollocationLevel } from '../data/collocations'
import { createPool, shuffle, type FieldMatchers } from '../data/pool'

/** The pick-mode "nothing belongs here" option — always present, on every item. */
export const KEIN_KORRELAT = '— kein Korrelat'

/** Every Korrelat status, in authoring order — the universe for the kind chips. */
export const KORRELAT_KINDS: readonly KorrelatStatus[] = ['obligatory', 'optional', 'excluded']

export type KorrelatFilter = {
  levels?: CollocationLevel[]
  kinds?: KorrelatStatus[]
}

const korrelatPool = createPool<KorrelatItem, KorrelatFilter>(
  DA_KORRELAT,
  {
    levels: i => i.level,
    kinds: i => i.korrelat,
  } satisfies FieldMatchers<KorrelatItem, KorrelatFilter>
)

/** Items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterKorrelatItems(f: KorrelatFilter = {}): KorrelatItem[] {
  return korrelatPool.filter(f)
}

/** A fresh random sample of up to `count` items matching the filter. */
export function sampleKorrelatItems(count: number, f: KorrelatFilter = {}): KorrelatItem[] {
  return korrelatPool.sample(count, f)
}

const collocationsById = new Map(COLLOCATIONS.map(c => [c.id, c]))

/** The preposition an obligatory/optional item's Korrelat is built from; null for excluded. */
function itemPreposition(item: KorrelatItem): string | null {
  if (item.korrelat === 'excluded') return null
  if (item.preposition != null) return item.preposition
  return collocationsById.get(item.collocationId!)?.preposition ?? null
}

/** Fixed distractor-preposition pool — never randomly CHOSEN, only shuffled in order. */
const DISTRACTOR_PREPS = ['auf', 'an', 'über', 'von', 'um', 'mit', 'für'] as const

/** `n` distinct da-compounds from DISTRACTOR_PREPS, excluding `ownPrep` (if given). */
function distractorCompounds(ownPrep: string | null, n: number): string[] {
  return DISTRACTOR_PREPS.filter(p => p !== ownPrep).slice(0, n).map(daCompound)
}

/** Builds the 4-option set + derived answer for one item (final order shuffled). */
function buildOptions(item: KorrelatItem): { answer: string | null; options: string[] } {
  if (item.korrelat === 'excluded') {
    const compounds = distractorCompounds(null, 3)
    return { answer: null, options: shuffle([KEIN_KORRELAT, ...compounds]) }
  }
  const answer = korrelatAnswer(item)!
  const distractors = distractorCompounds(itemPreposition(item), 2)
  return { answer, options: shuffle([answer, ...distractors, KEIN_KORRELAT]) }
}

/**
 * Per-status grading rule: obligatory accepts only the compound; excluded accepts
 * only KEIN_KORRELAT; optional accepts EITHER (both readings are correct German).
 */
export function korrelatAccepts(status: KorrelatStatus, answer: string | null, picked: string): boolean {
  if (status === 'obligatory') return picked === answer
  if (status === 'excluded') return picked === KEIN_KORRELAT
  return picked === answer || picked === KEIN_KORRELAT
}

/** The label for "what was actually correct" — shown on a wrong pick in the reveal. */
export function korrelatCorrectLabel(status: KorrelatStatus, answer: string | null): string {
  if (status === 'excluded') return KEIN_KORRELAT
  if (status === 'obligatory') return answer!
  return `${answer} oder ${KEIN_KORRELAT}`
}

export interface KorrelatQuestion {
  item: KorrelatItem
  /** The derived compound, or null for excluded items (korrelatAnswer, re-exposed). */
  answer: string | null
  /** Always 4 shuffled, distinct choices — includes KEIN_KORRELAT on every item. */
  options: string[]
  /** The learner's picked option, once answered. */
  picked: string
  isCorrect: boolean | null
}

export function useDaKorrelatQuiz(items: KorrelatItem[]) {
  const questions = ref<KorrelatQuestion[]>(items.map(item => {
    const { answer, options } = buildOptions(item)
    return { item, answer, options, picked: '', isCorrect: null }
  }))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): KorrelatItem[] =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.item)
  )

  /** Grades the tapped option against the current question's status rule (korrelatAccepts). */
  function pickOption(option: string): void {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.picked = option
    q.isCorrect = korrelatAccepts(q.item.korrelat, q.answer, option)
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
export function splitKorrelatSentence(sentence: string): { pre: string; post: string } {
  const idx = sentence.indexOf('___')
  if (idx < 0) return { pre: sentence, post: '' }
  return { pre: sentence.slice(0, idx), post: sentence.slice(idx + 3) }
}
