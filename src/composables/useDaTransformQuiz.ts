// src/composables/useDaTransformQuiz.ts
//
// Engine for the T8 "thing or person?" transform drill: a natural sentence uses a
// fixed-preposition collocation with an explicit object phrase (`object`, INCLUDING
// its preposition). The learner rewrites that object as a pronoun:
//   • THING object  → a da-compound (darauf, daran, …).
//   • PERSON object → preposition + declined personal pronoun (auf ihn, mit ihr, …),
//     NEVER a da-compound (see CONTEXT.md → "Da-compound").
// Joins the authored DA_TRANSFORM dataset to COLLOCATIONS (for the preposition, case,
// role, level, and reveal copy) and grades the learner's answer against
// transformAnswer(item) — derived, never stored.
//
// Like T6 (useDaPersonCaseQuiz) and T7 (useDaArticleQuiz), this joins its OWN
// authored dataset rather than the substitution pool — not every collocation has a
// natural transform sentence — so filtering/prep universe are scoped to THIS dataset.
//
// Pick-mode options are ALWAYS the "animacy+case triple": the da-compound of the
// collocation's preposition, plus that SAME preposition's accusative and dative
// pronoun — one option set tests the rule (compound vs. pronoun) AND the case at
// once (a deliberate refinement of the spec's darüber/über ihn/über sie example).
// THING items carry no personCue, so the pronoun distractors fall back to a default
// cue ('er') purely to populate the triple — the learner never needs its case for a
// thing item, since the compound is always the correct answer there.

import { computed, ref } from 'vue'
import { DA_TRANSFORM, transformAnswer, type TransformItem } from '../data/daTransform'
import { daCompound } from '../data/daCompounds'
import { PRONOUN_FORMS, type PronounCue } from '../data/daPersonCase'
import {
  COLLOCATIONS, type Collocation, type CollocationLevel, type CollocationRole,
} from '../data/collocations'
import { createPool, shuffle, type FieldMatchers } from '../data/pool'
import { checkText } from './drillGrading'

/** A transform item joined to the collocation it references (by `collocationId`). */
export interface TransformJoinedItem {
  item: TransformItem
  colloc: Collocation
}

const collocationsById = new Map(COLLOCATIONS.map(c => [c.id, c]))

function joinItem(item: TransformItem): TransformJoinedItem {
  const colloc = collocationsById.get(item.collocationId)
  if (!colloc) throw new Error(`Unknown collocationId: ${item.collocationId}`)
  return { item, colloc }
}

/** All DA_TRANSFORM items, joined to their collocations. */
export function joinTransformItems(): TransformJoinedItem[] {
  return DA_TRANSFORM.map(joinItem)
}

/**
 * Every preposition this drill's dataset actually governs — the universe for the
 * prep chip row. Derived from the dataset, not COLLOCATIONS, since not every
 * collocation has a transform item.
 */
export const TRANSFORM_PREPS: string[] =
  Array.from(new Set(joinTransformItems().map(ji => ji.colloc.preposition))).sort()

export type TransformFilter = {
  levels?: CollocationLevel[]
  roles?: CollocationRole[]
  preps?: string[]
}

const transformPool = createPool<TransformJoinedItem, TransformFilter>(
  joinTransformItems(),
  {
    levels: ji => ji.colloc.level,
    roles: ji => ji.colloc.role,
    preps: ji => ji.colloc.preposition,
  } satisfies FieldMatchers<TransformJoinedItem, TransformFilter>
)

/** Joined items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterTransformItems(f: TransformFilter = {}): TransformJoinedItem[] {
  return transformPool.filter(f)
}

/** A fresh random sample of up to `count` joined items matching the filter. */
export function sampleTransformItems(count: number, f: TransformFilter = {}): TransformJoinedItem[] {
  return transformPool.sample(count, f)
}

export type TransformMode = 'pick' | 'type'

export interface TransformQuizOpts {
  mode: TransformMode
}

export interface TransformQuestion extends TransformJoinedItem {
  /** The correct rewrite, derived from the joined collocation via transformAnswer. */
  answer: string
  /** 2 or 3 shuffled, deduplicated choices in `pick` mode; `null` in `type` mode. */
  options: string[] | null
  /** The learner's picked option / typed text, once answered. */
  typed: string
  isCorrect: boolean | null
}

/** THING items carry no personCue; the pronoun distractors default to this cue. */
const DEFAULT_THING_CUE: PronounCue = 'er'

function optionCue(item: TransformItem): PronounCue {
  return item.personCue ?? DEFAULT_THING_CUE
}

/**
 * Pick-mode options: the animacy+case triple — the da-compound of the collocation's
 * preposition, plus that SAME preposition's accusative and dative pronoun (using the
 * item's person cue, or the default 'er' for THING items) — deduplicated and
 * shuffled. Always contains the answer exactly once; collapses to 2 options when the
 * cue's accusative and dative forms coincide (wir, ihr).
 */
function buildOptions(item: TransformItem, colloc: Collocation): string[] {
  const prep = colloc.preposition
  const forms = PRONOUN_FORMS[optionCue(item)]
  const candidates = [
    daCompound(prep),
    `${prep} ${forms.accusative}`,
    `${prep} ${forms.dative}`,
  ]
  return shuffle(Array.from(new Set(candidates)))
}

/** Type-mode alternatives derived from the collocation's alsoAccept, split by kind. */
function buildAlternatives(item: TransformItem, colloc: Collocation): string[] {
  const alsoAccept = colloc.alsoAccept ?? []
  if (item.objectKind === 'thing') return alsoAccept.map(a => daCompound(a.preposition))
  return alsoAccept.map(a => `${a.preposition} ${PRONOUN_FORMS[item.personCue!][a.case]}`)
}

export function useDaTransformQuiz(items: TransformJoinedItem[], opts: TransformQuizOpts) {
  const questions = ref<TransformQuestion[]>(items.map(ji => {
    const answer = transformAnswer(ji.item)
    const options = opts.mode === 'pick' ? buildOptions(ji.item, ji.colloc) : null
    return { ...ji, answer, options, typed: '', isCorrect: null }
  }))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): TransformJoinedItem[] =>
    questions.value
      .filter(q => q.isCorrect === false)
      .map(q => ({ item: q.item, colloc: q.colloc }))
  )

  /** Pick mode: grade the tapped option against the current question's answer. */
  function pickOption(option: string): void {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.typed = option
    q.isCorrect = option === q.answer
  }

  /** Type mode: umlaut-folding grader; alsoAccept alternatives count as correct. */
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
    pickOption, submitText, advance,
  }
}

/**
 * Splits the item's sentence around its `object` (exact `indexOf` — no heuristics),
 * for bolding the replaceable phrase in the runner. Falls back to the whole sentence
 * (empty object) if the substring is somehow missing — never throws.
 */
export function splitTransformSentence(item: TransformItem): { pre: string; object: string; post: string } {
  const idx = item.sentence.indexOf(item.object)
  if (idx === -1) return { pre: item.sentence, object: '', post: '' }
  return {
    pre: item.sentence.slice(0, idx),
    object: item.object,
    post: item.sentence.slice(idx + item.object.length),
  }
}
