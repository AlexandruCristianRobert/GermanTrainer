// src/composables/useDaSubstitutionQuiz.ts
//
// Shared engine for the two Da-compound "fill the gap" drills:
//   T3 substitution gap-fill  — pick (4 options) or type the da-compound
//   T4 near-neighbor discrimination — pick among the governing preposition's
//     near-neighbor compounds (a fixed, harder confusion set)
// They differ only in `distractors` strategy and whether the caller offers a
// mode toggle (T4 always drives with `mode: 'pick'`); everything else — pool
// join/filter/sample, grading, wrongItems — is identical, so it lives here once.

import { computed, ref } from 'vue'
import {
  DA_SUBSTITUTION, NEIGHBOR_PREPS, substitutionAnswer, type SubstitutionItem,
} from '../data/daSubstitution'
import {
  COLLOCATIONS, type Collocation, type CollocationLevel, type CollocationRole,
} from '../data/collocations'
import { DA_COMPOUND_PREPOSITIONS, daCompound } from '../data/daCompounds'
import { createPool, shuffle, type FieldMatchers } from '../data/pool'
import { checkText } from './drillGrading'

/** A substitution item joined to the collocation it references (by `collocationId`). */
export interface JoinedItem {
  item: SubstitutionItem
  colloc: Collocation
}

/** Every preposition governed by a collocation — the universe for the prep chip row. */
export const SUBSTITUTION_PREPS: string[] =
  Array.from(new Set(COLLOCATIONS.map(c => c.preposition))).sort()

const collocationsById = new Map(COLLOCATIONS.map(c => [c.id, c]))

function joinItem(item: SubstitutionItem): JoinedItem {
  const colloc = collocationsById.get(item.collocationId)
  if (!colloc) throw new Error(`Unknown collocationId: ${item.collocationId}`)
  return { item, colloc }
}

/** All 96+ substitution items, joined to their collocations. */
export function joinSubstitutionItems(): JoinedItem[] {
  return DA_SUBSTITUTION.map(joinItem)
}

export type SubstitutionFilter = {
  levels?: CollocationLevel[]
  roles?: CollocationRole[]
  preps?: string[]
}

const substitutionPool = createPool<JoinedItem, SubstitutionFilter>(
  joinSubstitutionItems(),
  {
    levels: ji => ji.colloc.level,
    roles: ji => ji.colloc.role,
    preps: ji => ji.colloc.preposition,
  } satisfies FieldMatchers<JoinedItem, SubstitutionFilter>
)

/** Joined items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterSubstitutionItems(f: SubstitutionFilter = {}): JoinedItem[] {
  return substitutionPool.filter(f)
}

/** A fresh random sample of up to `count` joined items matching the filter. */
export function sampleSubstitutionItems(count: number, f: SubstitutionFilter = {}): JoinedItem[] {
  return substitutionPool.sample(count, f)
}

export type SubstitutionMode = 'pick' | 'type'
export type DistractorStrategy = 'random' | 'neighbors'

export interface SubstitutionQuizOpts {
  mode: SubstitutionMode
  distractors: DistractorStrategy
}

/**
 * The candidates a `random`-strategy question draws distractors from: the OTHER
 * distinct da-compounds already present in the run's item pool, so distractors stay
 * plausible near-answers rather than wildly unrelated ones. Falls back to every
 * compoundable preposition's compound when the pool is too thin (<4 distinct
 * compounds total) to supply 3 distinct distractors on its own.
 */
/**
 * Every compound the collocation dataset itself grades as correct: the primary
 * preposition's plus any `alsoAccept` alternative's (das Interesse an ≈ für →
 * daran AND dafür are right). None of these may ever appear as a "distractor",
 * and type mode must accept them all — same semantics as the Fixed-preps drill.
 */
function acceptedCompounds(colloc: Collocation): string[] {
  return [daCompound(colloc.preposition), ...(colloc.alsoAccept ?? []).map(a => daCompound(a.preposition))]
}

const ALL_COMPOUNDS = Array.from(new Set(DA_COMPOUND_PREPOSITIONS.map(e => daCompound(e.preposition))))

function randomDistractorCandidates(pool: JoinedItem[], accepted: string[]): string[] {
  const poolCompounds = Array.from(new Set(pool.map(ji => substitutionAnswer(ji.item))))
    .filter(c => !accepted.includes(c))
  if (poolCompounds.length >= 3) return poolCompounds
  return ALL_COMPOUNDS.filter(c => !accepted.includes(c))
}

/** Always 4 options, shuffled, the answer included exactly once, no accepted alternative among them. */
function buildOptions(target: JoinedItem, pool: JoinedItem[], strategy: DistractorStrategy): string[] {
  const answer = substitutionAnswer(target.item)
  const accepted = acceptedCompounds(target.colloc)
  let distractors = strategy === 'neighbors'
    ? (NEIGHBOR_PREPS[target.colloc.preposition] ?? []).map(daCompound).filter(c => !accepted.includes(c))
    : shuffle(randomDistractorCandidates(pool, accepted), 3)
  if (distractors.length < 3) {
    const topUp = shuffle(ALL_COMPOUNDS.filter(c => !accepted.includes(c) && !distractors.includes(c)))
    distractors = [...distractors, ...topUp].slice(0, 3)
  }
  return shuffle([answer, ...distractors.slice(0, 3)])
}

export interface SubstitutionQuestion extends JoinedItem {
  /** The correct da-compound, derived from the joined collocation's preposition. */
  answer: string
  /** 4 shuffled choices in `pick` mode; `null` in `type` mode (there is nothing to pick). */
  options: string[] | null
  /** The learner's picked option / typed text, once answered. */
  typed: string
  isCorrect: boolean | null
}

export function useDaSubstitutionQuiz(items: JoinedItem[], opts: SubstitutionQuizOpts) {
  const questions = ref<SubstitutionQuestion[]>(items.map(ji => {
    const answer = substitutionAnswer(ji.item)
    const options = opts.mode === 'pick' ? buildOptions(ji, items, opts.distractors) : null
    return { ...ji, answer, options, typed: '', isCorrect: null }
  }))
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
    q.isCorrect = checkText(input, q.answer, acceptedCompounds(q.colloc).slice(1))
  }

  function advance(): void {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }

  return {
    questions, currentIndex, current, finished, total, score, wrongItems,
    pickOption, submitText, advance,
  }
}

/** A context/stem sentence split around the matched word / the `___` gap, for bolding in the template. */
export interface TextHighlight {
  pre: string
  match: string
  post: string
}

/**
 * Locates the collocation's headword inside the natural `context` sentence, so the
 * runner can bold it — the context necessarily uses a conjugated/declined surface
 * form (e.g. "warte" for "warten"), so this matches on the word's stem rather than
 * requiring an exact substring. Falls back to an unhighlighted `pre` (the whole
 * sentence) when no confident match is found — never throws, never mismatches.
 */
export function highlightContext(context: string, word: string): TextHighlight {
  const bare = word.replace(/^(sich|der|die|das)\s+/i, '').trim()
  const core = bare.split(/\s+/).pop() ?? bare
  const stem = core.length > 4 && /en$/i.test(core) ? core.slice(0, -2) : core
  if (stem.length < 3) return { pre: context, match: '', post: '' }

  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`\\b${escaped}[a-zäöüß]*`, 'i').exec(context)
  if (!match) return { pre: context, match: '', post: '' }

  return {
    pre: context.slice(0, match.index),
    match: match[0],
    post: context.slice(match.index + match[0].length),
  }
}

/** Splits a stem on its single `___` gap into the text before/after it. */
export function splitGap(stem: string): { pre: string; post: string } {
  const [pre, post] = stem.split('___')
  return { pre: pre ?? stem, post: post ?? '' }
}
