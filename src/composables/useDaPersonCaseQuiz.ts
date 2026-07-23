// src/composables/useDaPersonCaseQuiz.ts
//
// Engine for the T6 "person-pronoun case" drill: da-compounds stand in for
// THINGS, but when the object of a fixed-preposition collocation is a PERSON,
// German uses Präposition + Personalpronomen instead (auf ihn, mit ihr, zu
// uns) — never a da-compound (see CONTEXT.md → "Da-compound"). This drill
// joins the authored DA_PERSON_CASE dataset to COLLOCATIONS (for the
// preposition, case, level, and reveal copy) and grades the learner's answer
// against personCaseAnswer(item) — derived, never stored.
//
// Unlike T3/T4/T5 (which all join the substitution pool), this pool is its
// own smaller dataset: person-case items don't exist for every collocation
// (a THING-only collocation like "warten auf den Bus" has no natural
// person-case counterpart), so filtering and the preposition universe are
// scoped to THIS dataset, not every collocation preposition.

import { computed, ref } from 'vue'
import {
  DA_PERSON_CASE, PRONOUN_FORMS, personCaseAnswer, type PersonCaseItem, type PronounCue,
} from '../data/daPersonCase'
import {
  COLLOCATIONS, type Collocation, type CollocationLevel, type CollocationRole,
} from '../data/collocations'
import { createPool, shuffle, type FieldMatchers } from '../data/pool'
import { checkText } from './drillGrading'

/** A person-case item joined to the collocation it references (by `collocationId`). */
export interface PersonCaseJoinedItem {
  item: PersonCaseItem
  colloc: Collocation
}

const collocationsById = new Map(COLLOCATIONS.map(c => [c.id, c]))

function joinItem(item: PersonCaseItem): PersonCaseJoinedItem {
  const colloc = collocationsById.get(item.collocationId)
  if (!colloc) throw new Error(`Unknown collocationId: ${item.collocationId}`)
  return { item, colloc }
}

/** All DA_PERSON_CASE items, joined to their collocations. */
export function joinPersonCaseItems(): PersonCaseJoinedItem[] {
  return DA_PERSON_CASE.map(joinItem)
}

/**
 * Every preposition this drill's dataset actually governs — the universe for the
 * prep chip row. A strict subset of every collocation preposition: not every
 * collocation has a person-case item (e.g. "für", "gegen" don't appear here).
 */
export const PERSON_CASE_PREPS: string[] =
  Array.from(new Set(joinPersonCaseItems().map(ji => ji.colloc.preposition))).sort()

export type PersonCaseFilter = {
  levels?: CollocationLevel[]
  roles?: CollocationRole[]
  preps?: string[]
}

const personCasePool = createPool<PersonCaseJoinedItem, PersonCaseFilter>(
  joinPersonCaseItems(),
  {
    levels: ji => ji.colloc.level,
    roles: ji => ji.colloc.role,
    preps: ji => ji.colloc.preposition,
  } satisfies FieldMatchers<PersonCaseJoinedItem, PersonCaseFilter>
)

/** Joined items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterPersonCaseItems(f: PersonCaseFilter = {}): PersonCaseJoinedItem[] {
  return personCasePool.filter(f)
}

/** A fresh random sample of up to `count` joined items matching the filter. */
export function samplePersonCaseItems(count: number, f: PersonCaseFilter = {}): PersonCaseJoinedItem[] {
  return personCasePool.sample(count, f)
}

export type PersonCaseMode = 'pick' | 'type'

export interface PersonCaseQuizOpts {
  mode: PersonCaseMode
}

export interface PersonCaseQuestion extends PersonCaseJoinedItem {
  /** The correct "preposition + declined pronoun", derived from the joined collocation. */
  answer: string
  /** 2 or 3 shuffled, deduplicated choices in `pick` mode; `null` in `type` mode. */
  options: string[] | null
  /** The learner's picked option / typed text, once answered. */
  typed: string
  isCorrect: boolean | null
}

/** The cue's nominative rendering — the plural "sie (Plural)" cue displays as bare "sie". */
function nominativeForm(cue: PronounCue): string {
  return cue === 'sie (Plural)' ? 'sie' : cue
}

/**
 * Pick-mode options: the SAME preposition + pronoun in three cases — accusative,
 * dative, nominative — shuffled and deduplicated. Several cues collapse two (or
 * even all three) of these forms (wir/ihr: accusative=dative; es/Sie/sie: their
 * nominative form coincides with their accusative form), so the option count is
 * NOT always 3 — it is always >= 2 and always contains the answer exactly once.
 */
function buildOptions(item: PersonCaseItem, colloc: Collocation): string[] {
  const prep = colloc.preposition
  const forms = PRONOUN_FORMS[item.cue]
  const candidates = [
    `${prep} ${forms.accusative}`,
    `${prep} ${forms.dative}`,
    `${prep} ${nominativeForm(item.cue)}`,
  ]
  return shuffle(Array.from(new Set(candidates)))
}

export function useDaPersonCaseQuiz(items: PersonCaseJoinedItem[], opts: PersonCaseQuizOpts) {
  const questions = ref<PersonCaseQuestion[]>(items.map(ji => {
    const answer = personCaseAnswer(ji.item)
    const options = opts.mode === 'pick' ? buildOptions(ji.item, ji.colloc) : null
    return { ...ji, answer, options, typed: '', isCorrect: null }
  }))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): PersonCaseJoinedItem[] =>
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

  /** Type mode: umlaut-folding grader. */
  function submitText(input: string): void {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.typed = input
    q.isCorrect = checkText(input, q.answer)
  }

  function advance(): void {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }

  return {
    questions, currentIndex, current, finished, total, score, wrongItems,
    pickOption, submitText, advance,
  }
}

/** Splits a frame on its single `___` gap into the text before/after it. */
export function splitFrame(frame: string): { pre: string; post: string } {
  const [pre, post] = frame.split('___')
  return { pre: pre ?? frame, post: post ?? '' }
}
