// src/composables/useDaArticleQuiz.ts
//
// Engine for the T7 "article fill" drill: a natural sentence uses a two-way-
// preposition collocation with a THING noun phrase whose article is gapped
// (`d___`/`ein___`). The learner types the FULL article word — its case comes
// from the joined collocation, not from the preposition's usual spatial rule,
// so the exam-critical contrast (mostly Akkusativ, except the an+Dativ verbs
// like arbeiten an / teilnehmen an) is drilled directly. No pick mode: the
// answer space (14 article forms) is too large for a fair multiple-choice.
//
// Like T6 (useDaPersonCaseQuiz), this joins its OWN authored dataset
// (DA_ARTICLE_FILL) rather than the substitution pool — not every collocation
// has a natural article-fill sentence — so filtering/prep universe are scoped
// to this dataset. Per the brief, the filter is levels+preps only (no roles
// chip: article items are noun-phrase-object sentences across word types).

import { computed, ref } from 'vue'
import {
  DA_ARTICLE_FILL, articleFillAnswer, type ArticleFillItem,
} from '../data/daArticleFill'
import {
  COLLOCATIONS, type Collocation, type CollocationCase, type CollocationLevel,
} from '../data/collocations'
import { createPool, type FieldMatchers } from '../data/pool'
import { checkText } from './drillGrading'

/** An article-fill item joined to the collocation it references (by `collocationId`). */
export interface ArticleJoinedItem {
  item: ArticleFillItem
  colloc: Collocation
}

const collocationsById = new Map(COLLOCATIONS.map(c => [c.id, c]))

function joinItem(item: ArticleFillItem): ArticleJoinedItem {
  const colloc = collocationsById.get(item.collocationId)
  if (!colloc) throw new Error(`Unknown collocationId: ${item.collocationId}`)
  return { item, colloc }
}

/** All DA_ARTICLE_FILL items, joined to their collocations. */
export function joinArticleItems(): ArticleJoinedItem[] {
  return DA_ARTICLE_FILL.map(joinItem)
}

/**
 * Every preposition this drill's dataset actually governs — the universe for the
 * prep chip row. All six are two-way prepositions (see TWO_WAY_PREPS); this is
 * still derived from the dataset, not the constant, in case a preposition ever
 * ends up with zero authored items.
 */
export const ARTICLE_PREPS: string[] =
  Array.from(new Set(joinArticleItems().map(ji => ji.colloc.preposition))).sort()

export type ArticleFilter = {
  levels?: CollocationLevel[]
  preps?: string[]
}

const articlePool = createPool<ArticleJoinedItem, ArticleFilter>(
  joinArticleItems(),
  {
    levels: ji => ji.colloc.level,
    preps: ji => ji.colloc.preposition,
  } satisfies FieldMatchers<ArticleJoinedItem, ArticleFilter>
)

/** Joined items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterArticleItems(f: ArticleFilter = {}): ArticleJoinedItem[] {
  return articlePool.filter(f)
}

/** A fresh random sample of up to `count` joined items matching the filter. */
export function sampleArticleItems(count: number, f: ArticleFilter = {}): ArticleJoinedItem[] {
  return articlePool.sample(count, f)
}

/**
 * True iff this is the drilled an+Dativ exception (arbeiten an, teilnehmen an,
 * leiden an, zweifeln an, ...) — the case the reveal specifically calls out
 * against the "meistens Akkusativ" default. Deliberately scoped to "an": the
 * OTHER dative exceptions (bestehen auf, leiden unter, sich fürchten vor, ...)
 * are real but not what this flag teaches.
 */
export function isAnDativeException(colloc: Collocation): boolean {
  return colloc.preposition === 'an' && colloc.case === 'dative'
}

export interface ArticleQuestion extends ArticleJoinedItem {
  /** The correct article word, derived from the joined collocation's case + item's gender. */
  answer: string
  /** The case the reveal names — a direct alias of `colloc.case`. */
  hintCase: CollocationCase
  /** Whether this item is the an+Dativ exception (see isAnDativeException). */
  isAnDativeException: boolean
  /** The learner's typed text, once answered. */
  typed: string
  isCorrect: boolean | null
}

export function useDaArticleQuiz(items: ArticleJoinedItem[]) {
  const questions = ref<ArticleQuestion[]>(items.map(ji => ({
    ...ji,
    answer: articleFillAnswer(ji.item),
    hintCase: ji.colloc.case,
    isAnDativeException: isAnDativeException(ji.colloc),
    typed: '',
    isCorrect: null,
  })))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): ArticleJoinedItem[] =>
    questions.value
      .filter(q => q.isCorrect === false)
      .map(q => ({ item: q.item, colloc: q.colloc }))
  )

  /** Type-only grading: umlaut-folding, case-insensitive; empty input never grades correct. */
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
    submitText, advance,
  }
}

/** The item's gap stub: `d___` for a definite gap, `ein___` for an indefinite one. */
export function articleStub(item: ArticleFillItem): string {
  return item.article === 'definite' ? 'd___' : 'ein___'
}

/**
 * Splits the item's sentence around its WHOLE article gap, removing the stub
 * entirely — unlike splitGap/splitFrame elsewhere (which split around a bare
 * `___`), the runner replaces the full `d___`/`ein___` token with a single gap,
 * not the token's stem plus a blank.
 */
export function splitArticleGap(item: ArticleFillItem): { pre: string; post: string } {
  const stub = articleStub(item)
  const idx = item.sentence.indexOf(stub)
  if (idx === -1) return { pre: item.sentence, post: '' }
  return { pre: item.sentence.slice(0, idx), post: item.sentence.slice(idx + stub.length) }
}
